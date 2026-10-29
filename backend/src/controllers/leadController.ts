import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';
import { moveToRecycleBin } from './recycleBinController';

/**
 * Generate sequential lead number: LEAD-YYYY-NNN
 */
export const getNextLeadNumber = async (req?: Request, res?: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `LEAD-${currentYear}-`;

    const latestLead = await prisma.lead.findFirst({
      where: { leadNumber: { startsWith: prefix } },
      orderBy: { leadNumber: 'desc' },
      select: { leadNumber: true },
    });

    let nextSeq = 1;
    if (latestLead && latestLead.leadNumber) {
      const parts = latestLead.leadNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        nextSeq = num + 1;
      }
    }

    const nextLeadNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    if (res) {
      return res.json({ success: true, nextLeadNumber, nextSeq });
    }
    return { nextLeadNumber, nextSeq };
  } catch (error: any) {
    if (res) {
      return res.status(500).json({ success: false, message: error.message });
    }
    throw error;
  }
};

/**
 * Check whether the user has permission to view confidential notes & budget discussions
 * Rule: Only Admin / Owner and the assigned Project Manager can view or edit site visit notes and client budget discussions.
 */
export const canAccessConfidentialNotes = (user: any, lead: any): boolean => {
  if (!user) return false;
  const role = user.role?.toUpperCase();
  if (role === 'OWNER' || role === 'ADMIN') return true;
  if (role === 'PROJECT_MANAGER' && lead.assignedProjectManagerId === user.id) return true;
  return false;
};

/**
 * GET /api/leads
 * List leads with stage filtering, team filtering, and confidential notes masking
 */
export const getLeads = async (req: Request, res: Response) => {
  try {
    const { stage, assignedTeam, assignedProjectManagerId, projectType, search } = req.query;

    const tenantFilter = getTenantFilter(req);
    const where: any = { ...tenantFilter };
    if (stage && typeof stage === 'string') where.stage = stage;
    if (assignedTeam && typeof assignedTeam === 'string') where.assignedTeam = assignedTeam;
    if (assignedProjectManagerId && typeof assignedProjectManagerId === 'string') {
      where.assignedProjectManagerId = assignedProjectManagerId;
    }
    if (projectType && typeof projectType === 'string') where.projectType = projectType;

    if (search && typeof search === 'string') {
      where.OR = [
        { clientName: { contains: search } },
        { contactNumber: { contains: search } },
        { leadNumber: { contains: search } },
        { siteAddress: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedProjectManager: {
          select: { id: true, name: true, email: true, role: true, phone: true },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            totalAmount: true,
            gstMode: true,
            gstAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        convertedProject: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            advancePaymentConfirmed: true,
            advancePaymentReceived: true,
            advancePaymentRequired: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask confidential fields if user is not authorized
    const processedLeads = leads.map((lead) => {
      const isAllowed = canAccessConfidentialNotes(req.user, lead);
      return {
        ...lead,
        canViewConfidential: isAllowed,
        siteVisitNotes: isAllowed ? lead.siteVisitNotes : null,
        clientBudgetDiscussion: isAllowed ? lead.clientBudgetDiscussion : null,
        isConfidentialMasked: !isAllowed,
      };
    });

    // Summary statistics by pipeline stage
    const stageCounts: Record<string, number> = {
      NEW_LEAD: 0,
      SITE_VISIT_SCHEDULED: 0,
      SITE_MEASUREMENT_COMPLETED: 0,
      DESIGN_CONCEPT_DISCUSSION: 0,
      BOQ_QUOTATION_SHARED: 0,
      NEGOTIATION: 0,
      LEAD_WON: 0,
      LEAD_LOST: 0,
    };

    leads.forEach((l) => {
      if (stageCounts[l.stage] !== undefined) {
        stageCounts[l.stage]++;
      }
    });

    return res.json({
      success: true,
      leads: processedLeads,
      stageCounts,
      totalCount: leads.length,
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/leads/:id
 */
export const getLeadById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const lead: any = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedProjectManager: {
          select: { id: true, name: true, email: true, role: true, phone: true },
        },
        quotations: {
          include: {
            items: { orderBy: { orderIndex: 'asc' } },
            invoices: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        convertedProject: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            advancePaymentConfirmed: true,
            advancePaymentReceived: true,
            advancePaymentRequired: true,
            advancePaymentConfirmedBy: true,
            advancePaymentConfirmedAt: true,
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const isAllowed = canAccessConfidentialNotes(req.user, lead);

    return res.json({
      success: true,
      lead: {
        ...lead,
        canViewConfidential: isAllowed,
        siteVisitNotes: isAllowed ? lead.siteVisitNotes : null,
        clientBudgetDiscussion: isAllowed ? lead.clientBudgetDiscussion : null,
        isConfidentialMasked: !isAllowed,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/leads
 * Lead capture with all requirements
 */
export const createLead = async (req: Request, res: Response) => {
  try {
    const {
      leadNumber,
      clientName,
      contactNumber,
      email,
      siteAddress,
      city,
      state,
      projectType,
      budgetRange,
      source,
      stage,
      assignedTeam,
      assignedProjectManagerId,
      siteVisitDate,
      siteVisitNotes,
      clientBudgetDiscussion,
    } = req.body;

    if (!clientName || !contactNumber || !siteAddress || !projectType) {
      return res.status(400).json({
        success: false,
        message: 'Client name, contact number, site address, and project type are required.',
      });
    }

    const tenantId = (req as any).user?.companyId || null;

    // Check for existing active lead with the same contact phone & client name under this tenant
    const existingDuplicate = await prisma.lead.findFirst({
      where: {
        ...(tenantId ? { tenantId } : {}),
        contactNumber: String(contactNumber).trim(),
        clientName: String(clientName).trim(),
        stage: { notIn: ['LEAD_WON', 'LEAD_LOST'] },
      },
    });

    if (existingDuplicate) {
      return res.status(409).json({
        success: false,
        message: `An active lead inquiry already exists for "${clientName}" (${existingDuplicate.leadNumber} - Stage: ${existingDuplicate.stage.replace(/_/g, ' ')}). Please update or link to the existing lead instead of creating a duplicate.`,
        existingLead: existingDuplicate,
      });
    }

    // Auto-generate lead number if missing or ensure uniqueness
    let finalLeadNumber = leadNumber ? String(leadNumber).trim() : '';
    if (!finalLeadNumber) {
      const generated = await getNextLeadNumber();
      finalLeadNumber = (generated as any).nextLeadNumber;
    } else {
      const existing = await prisma.lead.findFirst({
        where: { leadNumber: finalLeadNumber, ...(tenantId ? { tenantId } : {}) },
      });
      if (existing) {
        const generated = await getNextLeadNumber();
        finalLeadNumber = (generated as any).nextLeadNumber;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        leadNumber: finalLeadNumber,
        clientName: String(clientName).trim(),
        contactNumber: String(contactNumber).trim(),
        email: email ? String(email).trim() : null,
        siteAddress: String(siteAddress).trim(),
        city: city ? String(city).trim() : 'Bengaluru',
        state: state ? String(state).trim() : 'Karnataka',
        projectType: projectType || 'RESIDENTIAL_INTERIOR',
        budgetRange: budgetRange || '25L_50L',
        source: source || 'WEBSITE',
        stage: stage || 'NEW_LEAD',
        assignedTeam: assignedTeam || 'DESIGN_TEAM',
        assignedProjectManagerId: assignedProjectManagerId || null,
        siteVisitDate: siteVisitDate ? new Date(siteVisitDate) : null,
        siteVisitNotes: siteVisitNotes || null,
        clientBudgetDiscussion: clientBudgetDiscussion || null,
      },
      include: {
        assignedProjectManager: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await logAudit(req.user?.id, 'CREATE_LEAD', 'LEAD', lead.id, {
      leadNumber: finalLeadNumber,
      clientName,
      stage: lead.stage,
    }, req.ip);

    return res.status(201).json({ success: true, lead });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/leads/:id
 * Update lead details, stage transitions, and access-restricted fields
 */
export const updateLead = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lead.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const isAllowedConfidential = canAccessConfidentialNotes(req.user, existing);

    const {
      clientName,
      contactNumber,
      email,
      siteAddress,
      city,
      state,
      projectType,
      budgetRange,
      source,
      stage,
      lostReason,
      assignedTeam,
      assignedProjectManagerId,
      siteVisitDate,
      siteVisitNotes,
      clientBudgetDiscussion,
    } = req.body;

    const dataToUpdate: any = {};
    if (clientName !== undefined) dataToUpdate.clientName = clientName;
    if (contactNumber !== undefined) dataToUpdate.contactNumber = contactNumber;
    if (email !== undefined) dataToUpdate.email = email;
    if (siteAddress !== undefined) dataToUpdate.siteAddress = siteAddress;
    if (city !== undefined) dataToUpdate.city = city;
    if (state !== undefined) dataToUpdate.state = state;
    if (projectType !== undefined) dataToUpdate.projectType = projectType;
    if (budgetRange !== undefined) dataToUpdate.budgetRange = budgetRange;
    if (source !== undefined) dataToUpdate.source = source;
    if (stage !== undefined) dataToUpdate.stage = stage;
    if (lostReason !== undefined) dataToUpdate.lostReason = lostReason;
    if (assignedTeam !== undefined) dataToUpdate.assignedTeam = assignedTeam;
    if (assignedProjectManagerId !== undefined) dataToUpdate.assignedProjectManagerId = assignedProjectManagerId || null;
    if (siteVisitDate !== undefined) dataToUpdate.siteVisitDate = siteVisitDate ? new Date(siteVisitDate) : null;

    // Only update confidential fields if authorized
    if (isAllowedConfidential) {
      if (siteVisitNotes !== undefined) dataToUpdate.siteVisitNotes = siteVisitNotes;
      if (clientBudgetDiscussion !== undefined) dataToUpdate.clientBudgetDiscussion = clientBudgetDiscussion;
    } else if (siteVisitNotes !== undefined || clientBudgetDiscussion !== undefined) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Admin, Owner, and assigned Project Manager can view or edit site visit notes and client budget discussions.',
      });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignedProjectManager: {
          select: { id: true, name: true, email: true, role: true },
        },
        quotations: true,
        convertedProject: true,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_LEAD', 'LEAD', updated.id, {
      leadNumber: updated.leadNumber,
      stage: updated.stage,
    }, req.ip);

    return res.json({
      success: true,
      lead: {
        ...updated,
        canViewConfidential: isAllowedConfidential,
        siteVisitNotes: isAllowedConfidential ? updated.siteVisitNotes : null,
        clientBudgetDiscussion: isAllowedConfidential ? updated.clientBudgetDiscussion : null,
      },
    });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/leads/:id
 */
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    // Archive to Recycle Bin before deleting
    await moveToRecycleBin({
      tenantId: existing.tenantId,
      entityType: 'Lead',
      entityId: existing.id,
      itemNumber: existing.leadNumber,
      title: `${existing.clientName} (${existing.leadNumber})`,
      description: `${existing.projectType.replace(/_/g, ' ')} • Budget: ${existing.budgetRange.replace(/_/g, ' ')} • ${existing.siteAddress}`,
      data: existing,
      user: req.user,
    });

    // Unlink any quotations referencing this lead
    await prisma.quotation.updateMany({
      where: { leadId: id },
      data: { leadId: null },
    });
    // If it was converted to a project, uncouple first
    if (existing.convertedProjectId) {
      await prisma.lead.update({
        where: { id },
        data: { convertedProjectId: null },
      });
    }
    await prisma.lead.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_LEAD', 'LEAD', id, {}, req.ip);
    return res.json({
      success: true,
      message: `Lead ${existing.leadNumber} moved to Recycle Bin. You can restore it anytime if needed.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/leads/:id/convert-to-project
 * MODULE 3: Lead Conversion & Project Kickoff Gate
 * Converts Lead to Project upon logging initial advance payment.
 * If user is Finance/Owner, advance payment can be immediately confirmed. Otherwise, marked pending finance confirmation.
 */
export const convertLeadToProject = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      advanceAmount,
      paymentMethod,
      referenceNo,
      advanceNotes,
      quotationId,
      projectName,
      plannedStartDate,
      plannedEndDate,
      contractValue,
      approvedBudget,
    } = req.body;

    const lead: any = await prisma.lead.findUnique({
      where: { id },
      include: {
        quotations: { include: { items: true } },
        convertedProject: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (lead.convertedProjectId || lead.convertedProject) {
      return res.status(400).json({
        success: false,
        message: 'This lead has already been converted to an active project.',
        projectId: lead.convertedProjectId || lead.convertedProject?.id,
      });
    }

    const advAmt = Number(advanceAmount) || 0;
    if (advAmt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Module 3 Conversion Gate: An initial advance payment amount must be logged to convert the lead to a project.',
      });
    }

    // Determine linked quotation
    let selectedQuotation: any = null;
    if (quotationId) {
      selectedQuotation = (lead.quotations || []).find((q: any) => q.id === quotationId);
    }
    if (!selectedQuotation && lead.quotations && lead.quotations.length > 0) {
      selectedQuotation = lead.quotations[0];
    }

    // Generate unique project code: PRJ-YEAR-XXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.project.count();
    const projectCode = `PRJ-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    const finalProjectName = projectName || `${lead.clientName} - ${lead.projectType.replace(/_/g, ' ')}`;
    const finalContractValue = Number(contractValue) || (selectedQuotation ? selectedQuotation.totalAmount : advAmt * 2);
    const finalBudget = Number(approvedBudget) || finalContractValue * 0.75;

    // Check if client exists or create client
    let client = await prisma.client.findFirst({
      where: { phone: lead.contactNumber },
    });

    if (!client) {
      const clientCount = await prisma.client.count();
      const clientCode = `CLI-${String(clientCount + 1).padStart(3, '0')}`;
      client = await prisma.client.create({
        data: {
          code: clientCode,
          name: lead.clientName,
          phone: lead.contactNumber,
          email: lead.email || null,
          billingAddress: lead.siteAddress,
        },
      });
    }

    // Role check for Finance confirmation: Owner and Accounts Manager can confirm directly
    const userRole = req.user?.role?.toUpperCase();
    const isFinanceAuthorized = userRole === 'OWNER' || userRole === 'ACCOUNTS_MANAGER';

    const advancePaymentConfirmed = isFinanceAuthorized;
    const advancePaymentConfirmedBy = isFinanceAuthorized ? (req.user?.name || 'Finance Dept') : null;
    const advancePaymentConfirmedAt = isFinanceAuthorized ? new Date() : null;

    const start = plannedStartDate ? new Date(plannedStartDate) : new Date();
    const end = plannedEndDate
      ? new Date(plannedEndDate)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default

    // Create the Project with Kickoff Gate status
    const project = await prisma.project.create({
      data: {
        code: projectCode,
        name: finalProjectName,
        description: `Project converted from Lead ${lead.leadNumber}. Client: ${lead.clientName}`,
        clientName: lead.clientName,
        clientContact: lead.contactNumber,
        clientEmail: lead.email,
        siteAddress: lead.siteAddress,
        city: lead.city || 'Bengaluru',
        state: lead.state || 'Karnataka',
        projectType: lead.projectType || 'RESIDENTIAL',
        contractType: 'ITEM_RATE',
        contractValue: finalContractValue,
        approvedBudget: finalBudget,
        plannedStartDate: start,
        plannedEndDate: end,
        status: 'ACTIVE',
        paymentTerms: selectedQuotation?.milestoneTerms || '50% Advance, 40% Mid-stage, 10% Handover',
        convertedFromLeadId: lead.id,
        advancePaymentRequired: advAmt,
        advancePaymentReceived: advAmt,
        advancePaymentConfirmed,
        advancePaymentConfirmedBy,
        advancePaymentConfirmedAt,
        advancePaymentReference: referenceNo || null,
      },
    });

    // Update Lead to LEAD_WON and link project
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stage: 'LEAD_WON',
        convertedProjectId: project.id,
      },
    });

    // If quotation was selected, link quotation to project and set to ACCEPTED
    if (selectedQuotation) {
      await prisma.quotation.update({
        where: { id: selectedQuotation.id },
        data: {
          projectId: project.id,
          status: 'ACCEPTED',
        },
      });

      // Also copy quotation items into project's BOQ items for seamless execution!
      if (selectedQuotation.items && selectedQuotation.items.length > 0) {
        for (let i = 0; i < selectedQuotation.items.length; i++) {
          const item = selectedQuotation.items[i];
          const itemCode = `BOQ-${String(i + 1).padStart(3, '0')}`;
          await prisma.bOQItem.create({
            data: {
              projectId: project.id,
              itemCode,
              description: `[${item.areaRoom}] ${item.workDescription}`,
              category: 'CARPENTRY_JOINERY',
              unit: item.unit,
              estimatedQty: item.quantity,
              unitRate: item.rate,
              estimatedTotal: item.totalAmount,
              materialUnitCost: item.rate * 0.6,
              labourUnitCost: item.rate * 0.4,
              clientApprovalStatus: 'APPROVED',
            },
          });
        }
      }
    }

    // Auto-create initial Advance Milestone Invoice & Receipt
    const invCount = await prisma.clientInvoice.count();
    const invoiceNumber = `INV-${currentYear}-${String(invCount + 1).padStart(3, '0')}`;
    const gstRate = 18.0;
    const baseSubtotal = advAmt / (1 + gstRate / 100);
    const gstAmount = advAmt - baseSubtotal;

    const invoice = await prisma.clientInvoice.create({
      data: {
        invoiceNumber,
        clientId: client.id,
        projectId: project.id,
        quotationId: selectedQuotation?.id || null,
        invoiceType: 'ADVANCE',
        milestoneName: 'Booking & Mobilization Advance Payment',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: Math.round(baseSubtotal),
        retentionPercent: 0,
        retentionAmount: 0,
        tdsPercent: 0,
        tdsAmount: 0,
        gstPercent: gstRate,
        gstAmount: Math.round(gstAmount),
        netInvoiceAmount: advAmt,
        paidAmount: advancePaymentConfirmed ? advAmt : 0,
        balanceDue: advancePaymentConfirmed ? 0 : advAmt,
        status: advancePaymentConfirmed ? 'PAID' : 'SUBMITTED',
        certificationNotes: `Advance logged upon Won Lead conversion. Ref: ${referenceNo || 'Direct'}. ${advanceNotes || ''}`,
      },
    });

    if (advancePaymentConfirmed) {
      // Create ClientReceipt
      const rcpCount = await prisma.clientReceipt.count();
      const receiptNumber = `RCP-${currentYear}-${String(rcpCount + 1).padStart(3, '0')}`;
      await prisma.clientReceipt.create({
        data: {
          receiptNumber,
          clientId: client.id,
          projectId: project.id,
          invoiceId: invoice.id,
          receiptDate: new Date(),
          amount: advAmt,
          paymentMethod: paymentMethod || 'NEFT_RTGS',
          referenceNo: referenceNo || `REF-${Date.now().toString().slice(-6)}`,
          notes: `Booking advance payment confirmed for ${lead.clientName}. ${advanceNotes || ''}`,
        },
      });
    }

    await logAudit(req.user?.id, 'CONVERT_LEAD_WON', 'LEAD', lead.id, {
      leadNumber: lead.leadNumber,
      projectId: project.id,
      projectCode: project.code,
      advanceAmount: advAmt,
      advancePaymentConfirmed,
    }, req.ip);

    return res.status(201).json({
      success: true,
      message: advancePaymentConfirmed
        ? 'Lead won! Project created and advance payment verified by Finance. Kickoff unlocked.'
        : 'Lead won! Project created with advance payment entry. Execution kickoff is LOCKED pending Finance Department confirmation.',
      project,
      invoice,
      advancePaymentConfirmed,
      kickoffLocked: !advancePaymentConfirmed,
    });
  } catch (error: any) {
    console.error('Error converting lead to project:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
