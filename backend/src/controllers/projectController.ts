import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';
import { moveToRecycleBin } from './recycleBinController';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;

    const tenantFilter = getTenantFilter(req);
    const where: any = { ...tenantFilter };
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (type && typeof type === 'string') {
      where.projectType = type;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { clientName: { contains: search } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        sites: true,
        phases: true,
        clientReceipts: {
          select: {
            amount: true,
            paymentMethod: true,
          },
        },
        clientInvoices: {
          select: {
            netInvoiceAmount: true,
            paidAmount: true,
            balanceDue: true,
          },
        },
        expenses: {
          select: { totalAmount: true },
        },
        purchaseOrders: {
          where: { status: { not: 'CANCELLED' } },
          select: { totalAmount: true },
        },
        labourAttendances: {
          select: { totalWageEarned: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, role: true, email: true } },
          },
        },
        _count: {
          select: {
            tasks: true,
            boqItems: true,
            dailyReports: true,
            clientInvoices: true,
            expenses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedProjects = projects.map((p) => {
      const totalBilled = p.clientInvoices.reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);
      const totalReceived = p.clientReceipts.reduce((sum, rcp) => sum + rcp.amount, 0);
      const cashReceived = p.clientReceipts
        .filter((rcp) => rcp.paymentMethod === 'CASH')
        .reduce((sum, rcp) => sum + rcp.amount, 0);
      const bankReceived = p.clientReceipts
        .filter((rcp) => rcp.paymentMethod !== 'CASH')
        .reduce((sum, rcp) => sum + rcp.amount, 0);
      const outstandingReceivable = Math.max(0, totalBilled - totalReceived);

      const expensesCost = (p.expenses || []).reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
      const materialsCost = (p.purchaseOrders || []).reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0);
      const labourCost = (p.labourAttendances || []).reduce((sum: number, att: any) => sum + (att.totalWageEarned || 0), 0);
      const actualCost = expensesCost + materialsCost + labourCost;
      const balanceCash = totalReceived - actualCost;
      const remainingContract = Math.max(0, p.contractValue - actualCost);

      return {
        ...p,
        financials: {
          totalBilled,
          totalReceived,
          cashReceived,
          bankReceived,
          outstandingReceivable,
          expensesCost,
          materialsCost,
          labourCost,
          actualCost,
          balanceCash,
          remainingContract,
        },
      };
    });

    return res.json({ success: true, projects: enrichedProjects });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sites: true,
        phases: { orderBy: { sequence: 'asc' } },
        members: {
          include: {
            user: { select: { id: true, name: true, role: true, email: true, phone: true } },
          },
        },
        boqItems: true,
        tasks: {
          include: {
            assignedUser: { select: { id: true, name: true } },
            site: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
        clientInvoices: {
          orderBy: { invoiceDate: 'desc' },
        },
        clientReceipts: {
          orderBy: { receiptDate: 'desc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 20,
        },
        pettyCashAccounts: {
          include: {
            custodian: { select: { name: true } },
          },
        },
        purchaseOrders: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            supplier: { select: { id: true, name: true, phone: true, email: true } },
            items: { include: { material: { select: { name: true, unit: true } } } },
          },
        },
        labourAttendances: {
          include: {
            worker: { select: { id: true, workerCode: true, name: true, trade: true, phone: true, dailyWageRate: true } },
          },
        },
        changeOrders: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Compute comprehensive financial overview for this project
    const totalBilled = (project.clientInvoices as any[]).reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);
    const totalReceived = (project.clientReceipts as any[]).reduce((sum, rcp) => sum + rcp.amount, 0);
    const cashReceived = (project.clientReceipts as any[])
      .filter((rcp) => rcp.paymentMethod === 'CASH')
      .reduce((sum, rcp) => sum + rcp.amount, 0);
    const bankReceived = (project.clientReceipts as any[])
      .filter((rcp) => rcp.paymentMethod !== 'CASH')
      .reduce((sum, rcp) => sum + rcp.amount, 0);

    const materialsCost = (project.purchaseOrders as any[]).reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const labourCost = (project.labourAttendances as any[]).reduce((sum, att) => sum + (att.totalWageEarned || 0), 0);
    const expensesCost = (project.expenses as any[]).reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const boqActualCost = (project.boqItems as any[]).reduce((sum, b) => sum + (b.actualExpenditure || 0), 0);

    // Only real monetary outflows are added to Total Incurred Cost: Site Expenses + Labour Wages (+ Material POs).
    // BOQ is strictly for tracking / reference estimate and must NOT be added into incurred cost.
    const actualCost = materialsCost + labourCost + expensesCost;
    const remainingBudget = Math.max(0, project.approvedBudget - actualCost);
    const budgetBurnPercent = project.approvedBudget > 0 ? (actualCost / project.approvedBudget) * 100 : 0;
    
    // Profitability
    const netProfit = totalBilled - actualCost;
    const netProfitMargin = totalBilled > 0 ? (netProfit / totalBilled) * 100 : 0;

    // Site Workforce (Labours who worked on this project)
    const workerMap = new Map();
    for (const att of (project.labourAttendances as any[])) {
      if (!att.worker) continue;
      const wid = att.worker.id;
      if (!workerMap.has(wid)) {
        workerMap.set(wid, {
          id: att.worker.id,
          code: att.worker.workerCode,
          name: att.worker.name,
          trade: att.worker.trade,
          phone: att.worker.phone,
          dailyWageRate: att.worker.dailyWageRate,
          shiftsWorked: 0,
          totalEarned: 0,
        });
      }
      const w = workerMap.get(wid);
      w.shiftsWorked += 1;
      w.totalEarned += (att.totalWageEarned || 0);
    }
    const siteWorkforce = Array.from(workerMap.values());

    // Project Suppliers (Vendors materials were bought from)
    const supplierMap = new Map();
    for (const po of (project.purchaseOrders as any[])) {
      if (!po.supplier) continue;
      const sid = po.supplier.id;
      if (!supplierMap.has(sid)) {
        supplierMap.set(sid, {
          id: po.supplier.id,
          name: po.supplier.name,
          phone: po.supplier.phone,
          email: po.supplier.email,
          totalOrdersValue: 0,
          orderCount: 0,
          items: [] as string[],
        });
      }
      const s = supplierMap.get(sid);
      s.orderCount += 1;
      s.totalOrdersValue += (po.totalAmount || 0);
      for (const it of (po.items || [])) {
        if (it.material?.name && !s.items.includes(it.material.name)) {
          s.items.push(it.material.name);
        }
      }
    }
    const projectSuppliers = Array.from(supplierMap.values());

    return res.json({
      success: true,
      project: {
        ...project,
        siteWorkforce,
        projectSuppliers,
        financials: {
          totalBilled,
          totalReceived,
          cashReceived,
          bankReceived,
          outstandingReceivable: Math.max(0, totalBilled - totalReceived),
          materialsCost,
          labourCost,
          expensesCost,
          boqActualCost,
          actualCost,
          remainingBudget,
          budgetBurnPercent: Math.round(budgetBurnPercent * 10) / 10,
          netProfit,
          netProfitMargin: Math.round(netProfitMargin * 10) / 10,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Sequential Project Code Generator: PRJ-YYYY-NNN
 */
export const getNextProjectCode = async (req?: Request, res?: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `PRJ-${currentYear}-`;

    const latest = await prisma.project.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextSeq = 1;
    if (latest && latest.code) {
      const parts = latest.code.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        nextSeq = num + 1;
      }
    } else {
      const count = await prisma.project.count();
      nextSeq = count + 1;
    }

    const nextProjectCode = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    if (res) {
      return res.json({ success: true, nextProjectCode, nextSeq });
    }
    return { nextProjectCode, nextSeq };
  } catch (error: any) {
    if (res) {
      return res.status(500).json({ success: false, message: error.message });
    }
    throw error;
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      clientName,
      clientContact,
      clientEmail,
      clientBillingAddr,
      clientGstin,
      siteAddress,
      city,
      state,
      projectType,
      contractType,
      contractValue,
      approvedBudget,
      plannedStartDate,
      plannedEndDate,
      paymentTerms,
      taxRatePercent,
      quotationId, // Optional: if converted from a Client Quotation
    } = req.body;

    let finalCode = code ? String(code).trim() : '';
    if (!finalCode) {
      const generated = await getNextProjectCode();
      finalCode = (generated as any).nextProjectCode;
    }

    if (!finalCode || !name || !clientName || !siteAddress || !plannedStartDate || !plannedEndDate) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const existing = await prisma.project.findUnique({ where: { code: finalCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Project code '${finalCode}' already exists.` });
    }

    const tenantId = (req as any).user?.companyId || null;

    // Check if quotationId is provided
    let quotation: any = null;
    if (quotationId) {
      quotation = await prisma.quotation.findUnique({
        where: { id: String(quotationId) },
        include: { items: true, lead: true },
      });
    }

    const finalClientContact = clientContact ? String(clientContact).replace(/\s+/g, '').trim() : (quotation?.clientPhone || null);
    const finalClientEmail = clientEmail || quotation?.clientEmail || null;
    const finalBillingAddr = clientBillingAddr || quotation?.siteAddress || null;
    const finalPaymentTerms = paymentTerms || (quotation?.milestoneTerms ? 'Milestone terms per quotation' : null);
    const finalTaxRate = Number(taxRatePercent) || quotation?.gstPercent || 18.0;

    const project = await prisma.project.create({
      data: {
        tenantId,
        code: finalCode,
        name,
        description: description || (quotation ? `Project converted from Quotation ${quotation.quotationNumber}. Scope: ${quotation.projectType.replace(/_/g, ' ')}` : null),
        clientName,
        clientContact: finalClientContact,
        clientEmail: finalClientEmail,
        clientBillingAddr: finalBillingAddr,
        clientGstin,
        siteAddress,
        city: city || 'Bengaluru',
        state: state || 'Karnataka',
        projectType: projectType || 'RESIDENTIAL',
        contractType: contractType || 'ITEM_RATE',
        contractValue: Number(contractValue) || (quotation ? quotation.totalAmount : 0),
        approvedBudget: Number(approvedBudget) || (quotation ? quotation.subtotal : 0),
        plannedStartDate: new Date(plannedStartDate),
        plannedEndDate: new Date(plannedEndDate),
        status: 'ACTIVE',
        paymentTerms: finalPaymentTerms,
        taxRatePercent: finalTaxRate,
        convertedFromLeadId: quotation?.leadId || null,
      },
    });

    // Auto-create primary site
    await prisma.site.create({
      data: {
        projectId: project.id,
        name: 'Main Site Yard',
        code: `${finalCode}-S01`,
        location: siteAddress,
      },
    });

    // If converted from a Quotation:
    if (quotation) {
      // 1. Mark status of quotation as CONVERTED and link to project
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'CONVERTED',
          projectId: project.id,
        },
      });

      // 2. If quotation is linked to a Lead, update lead to LEAD_WON and link project
      if (quotation.leadId) {
        await prisma.lead.update({
          where: { id: quotation.leadId },
          data: {
            stage: 'LEAD_WON',
            convertedProjectId: project.id,
          },
        });
      }

      // 3. Seamlessly copy Quotation Line Items into Project's initial BOQItems!
      if (quotation.items && quotation.items.length > 0) {
        for (let i = 0; i < quotation.items.length; i++) {
          const it = quotation.items[i];
          const itemCode = `BOQ-${String(i + 1).padStart(3, '0')}`;
          await prisma.bOQItem.create({
            data: {
              projectId: project.id,
              itemCode,
              description: `[${it.areaRoom}] ${it.workDescription}`,
              category: 'CARPENTRY_JOINERY',
              unit: it.unit || 'SQFT',
              estimatedQty: it.quantity || 0,
              unitRate: it.rate || 0,
              estimatedTotal: it.totalAmount || 0,
              materialUnitCost: (it.rate || 0) * 0.6,
              labourUnitCost: (it.rate || 0) * 0.4,
              clientApprovalStatus: 'APPROVED',
            },
          });
        }
      }

      // 4. Record Activity Log for quotation status change
      try {
        await prisma.activityLog.create({
          data: {
            tenantId,
            userId: req.user?.id || null,
            userName: req.user?.name || 'User',
            entityType: 'Quotation',
            entityId: quotation.id,
            entityTitle: quotation.quotationNumber,
            action: 'STATUS_CHANGE',
            fromStatus: quotation.status,
            toStatus: 'CONVERTED',
            message: `Quotation ${quotation.quotationNumber} (${quotation.clientName}) converted into Project ${project.code} (${project.name}). Quotation status marked as CONVERTED.`,
          },
        });
      } catch (logErr) {
        console.error('Failed to write activityLog:', logErr);
      }
    }

    // 5. Ensure client record is saved or updated in directory
    try {
      const cPhone = finalClientContact || quotation?.clientPhone;
      if (cPhone) {
        const existingClient = await prisma.client.findFirst({
          where: { phone: cPhone },
        });
        if (!existingClient) {
          const clientCount = await prisma.client.count();
          await prisma.client.create({
            data: {
              code: `CLI-${String(clientCount + 1).padStart(3, '0')}`,
              name: clientName || quotation?.clientName || 'Client',
              phone: cPhone,
              email: finalClientEmail,
              billingAddress: finalBillingAddr || siteAddress || '',
              gstin: clientGstin || null,
              tenantId,
            },
          });
        }
      }
    } catch (cErr) {
      console.error('Failed to sync client record:', cErr);
    }

    await logAudit(
      req.user?.id,
      quotation ? 'CONVERT_QUOTATION_TO_PROJECT' : 'CREATE',
      'PROJECT',
      project.id,
      {
        code: project.code,
        name: project.name,
        quotationId: quotation?.id || null,
        quotationNumber: quotation?.quotationNumber || null,
      },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: quotation
        ? `Project ${project.code} created and Quotation ${quotation.quotationNumber} marked as CONVERTED!`
        : `Project ${project.code} created successfully!`,
      project,
      convertedQuotation: quotation ? { id: quotation.id, quotationNumber: quotation.quotationNumber, status: 'CONVERTED' } : null,
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      description,
      status,
      completionPercent,
      contractValue,
      approvedBudget,
      actualStartDate,
      actualEndDate,
      paymentTerms,
      clientName,
      clientContact,
      clientEmail,
      clientBillingAddr,
      clientGstin,
      siteAddress,
    } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;

    // MODULE 4: Block final project handover if any payment dues remain outstanding
    if (status === 'COMPLETED') {
      const invoices = await prisma.clientInvoice.findMany({
        where: { projectId: id, status: { not: 'CANCELLED' } },
      });
      const outstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
      if (outstanding > 0) {
        return res.status(400).json({
          success: false,
          handoverBlocked: true,
          message: `Cannot mark project as COMPLETED / Handed Over: Client has outstanding milestone invoice dues of ₹${outstanding.toLocaleString('en-IN')}. All milestone dues must be cleared in full prior to final handover.`,
        });
      }
    }

    if (status) data.status = status;
    if (completionPercent !== undefined) data.completionPercent = Number(completionPercent);
    if (contractValue !== undefined) data.contractValue = Number(contractValue);
    if (approvedBudget !== undefined) data.approvedBudget = Number(approvedBudget);
    if (actualStartDate) data.actualStartDate = new Date(actualStartDate);
    if (actualEndDate) data.actualEndDate = new Date(actualEndDate);
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;
    if (clientName !== undefined) data.clientName = clientName;
    if (clientContact !== undefined) data.clientContact = clientContact ? String(clientContact).replace(/\s+/g, '').trim() : null;
    if (clientEmail !== undefined) data.clientEmail = clientEmail;
    if (clientBillingAddr !== undefined) data.clientBillingAddr = clientBillingAddr;
    if (clientGstin !== undefined) data.clientGstin = clientGstin;
    if (siteAddress !== undefined) data.siteAddress = siteAddress;

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    await logAudit(req.user?.id, 'UPDATE', 'PROJECT', id, data, req.ip);

    return res.json({ success: true, project: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:id/confirm-advance
 * MODULE 3: Kickoff Gate - Finance confirms advance payment, unlocking execution schedules
 */
export const confirmProjectAdvancePayment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { referenceNo, notes } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        clientInvoices: { where: { invoiceType: 'ADVANCE' } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        advancePaymentConfirmed: true,
        advancePaymentConfirmedBy: req.user?.name || 'Finance Department',
        advancePaymentConfirmedAt: new Date(),
        ...(referenceNo && { advancePaymentReference: referenceNo }),
      },
    });

    // Settle advance invoice and record receipt if needed
    if (project.clientInvoices && project.clientInvoices.length > 0) {
      for (const inv of project.clientInvoices) {
        if (inv.balanceDue > 0) {
          await prisma.clientInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: inv.netInvoiceAmount,
              balanceDue: 0,
              status: 'PAID',
            },
          });

          const currentYear = new Date().getFullYear();
          const rcpCount = await prisma.clientReceipt.count();
          await prisma.clientReceipt.create({
            data: {
              receiptNumber: `RCP-${currentYear}-${String(rcpCount + 1).padStart(3, '0')}`,
              projectId: project.id,
              invoiceId: inv.id,
              amount: inv.netInvoiceAmount,
              paymentMethod: 'NEFT_RTGS',
              referenceNo: referenceNo || `UTR-${Date.now().toString().slice(-6)}`,
              notes: `Advance payment verified and confirmed by Finance (${req.user?.name || 'Admin'}). ${notes || ''}`,
            },
          });
        }
      }
    }

    await logAudit(req.user?.id, 'CONFIRM_ADVANCE_PAYMENT', 'PROJECT', project.id, {
      projectCode: project.code,
      confirmedBy: req.user?.name,
    }, req.ip);

    return res.json({
      success: true,
      message: 'Advance payment confirmed by Finance Department! Site schedules and task assignments are now unlocked.',
      project: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sites: true,
            tasks: true,
            boqItems: true,
            clientInvoices: true,
            clientReceipts: true,
            purchaseOrders: true,
            goodsReceiptNotes: true,
            requisitions: true,
            expenses: true,
            wagePayments: true,
            dailyReports: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const counts = existing._count;
    const hasDependencies =
      counts.tasks > 0 ||
      counts.boqItems > 0 ||
      counts.clientInvoices > 0 ||
      counts.clientReceipts > 0 ||
      counts.purchaseOrders > 0 ||
      counts.goodsReceiptNotes > 0 ||
      counts.requisitions > 0 ||
      counts.expenses > 0 ||
      counts.wagePayments > 0 ||
      counts.dailyReports > 0;

    if (hasDependencies) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete project with active operational and financial records (${counts.tasks} tasks, ${counts.boqItems} BOQ items, ${counts.clientInvoices} invoices, ${counts.expenses} expenses). Please remove dependent records or complete project archive first.`,
      });
    }

    // Archive project to recycle bin before deleting
    await moveToRecycleBin({
      tenantId: existing.tenantId,
      entityType: 'Project',
      entityId: existing.id,
      itemNumber: existing.code,
      title: existing.name,
      description: existing.description || `Project Code: ${existing.code}`,
      data: existing,
      user: req.user,
    });

    // Perform clean delete for clean/draft projects
    await prisma.$transaction(async (tx) => {
      await tx.phase.deleteMany({ where: { projectId: id } });
      await tx.site.deleteMany({ where: { projectId: id } });
      await tx.projectMember.deleteMany({ where: { projectId: id } });
      await tx.budgetRevision.deleteMany({ where: { projectId: id } });
      await tx.contractChangeOrder.deleteMany({ where: { projectId: id } });
      await tx.project.delete({ where: { id } });
    });

    await logAudit(req.user?.id, 'DELETE', 'PROJECT', id, { code: existing.code, name: existing.name }, req.ip);

    return res.json({ success: true, message: `Project '${existing.name}' (${existing.code}) deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSite = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const { name, code, location, supervisorName, contactPhone } = req.body;

    if (!name || !code || !location) {
      return res.status(400).json({ success: false, message: 'Name, code, and location are required.' });
    }

    const site = await prisma.site.create({
      data: {
        projectId,
        name,
        code,
        location,
        supervisorName,
        contactPhone,
      },
    });

    return res.status(201).json({ success: true, site });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSite = async (req: Request, res: Response) => {
  try {
    const siteId = String(req.params.siteId || req.params.id);
    const { name, code, location, supervisorName, contactPhone } = req.body;

    const existing = await prisma.site.findUnique({ where: { id: siteId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Site not found.' });
    }

    const updated = await prisma.site.update({
      where: { id: siteId },
      data: {
        name: name !== undefined ? name : existing.name,
        code: code !== undefined ? code : existing.code,
        location: location !== undefined ? location : existing.location,
        supervisorName: supervisorName !== undefined ? supervisorName : existing.supervisorName,
        contactPhone: contactPhone !== undefined ? contactPhone : existing.contactPhone,
      },
    });

    return res.json({ success: true, site: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSite = async (req: Request, res: Response) => {
  try {
    const siteId = String(req.params.siteId || req.params.id);

    const existing = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        _count: { select: { tasks: true, dailyReports: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Site not found.' });
    }

    if (existing._count.tasks > 0 || existing._count.dailyReports > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete site with active records (${existing._count.tasks} tasks, ${existing._count.dailyReports} DPRs).`,
      });
    }

    await prisma.site.delete({ where: { id: siteId } });

    return res.json({ success: true, message: `Site '${existing.name}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createPhase = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const { name, sequence, startDate, endDate } = req.body;

    const phase = await prisma.phase.create({
      data: {
        projectId,
        name,
        sequence: Number(sequence) || 1,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return res.status(201).json({ success: true, phase });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createChangeOrder = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const {
      orderNumber,
      title,
      description,
      scopeType,
      requestedBy,
      amountDelta,
      timeDeltaDays,
      swatchRenderUrl,
      clientSignOffUrl,
    } = req.body;

    const changeOrder = await prisma.contractChangeOrder.create({
      data: {
        projectId,
        orderNumber: orderNumber || `CO-${Date.now().toString().slice(-6)}`,
        title: title || 'Scope Variation',
        description,
        scopeType: scopeType || 'DESIGN_VARIATION',
        requestedBy: requestedBy || 'Client',
        amountDelta: Number(amountDelta) || 0,
        timeDeltaDays: Number(timeDeltaDays) || 0,
        swatchRenderUrl: swatchRenderUrl || null,
        clientSignOffUrl: clientSignOffUrl || null,
        status: 'APPROVED',
        approvedBy: req.user?.name || 'Owner',
        approvedAt: new Date(),
      },
    });

    // Update project contract value
    await prisma.project.update({
      where: { id: projectId },
      data: {
        contractValue: { increment: Number(amountDelta) || 0 },
      },
    });

    await logAudit(
      req.user?.id,
      'CREATE_CHANGE_ORDER',
      'PROJECT',
      projectId,
      { orderNumber: changeOrder.orderNumber, amountDelta, scopeType: changeOrder.scopeType },
      req.ip
    );

    return res.status(201).json({ success: true, changeOrder });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateChangeOrder = async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId || req.params.id);
    const { title, description, scopeType, requestedBy, amountDelta, timeDeltaDays, swatchRenderUrl, clientSignOffUrl, status } = req.body;

    const existing = await prisma.contractChangeOrder.findUnique({ where: { id: orderId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Change order not found.' });
    }

    const newAmount = amountDelta !== undefined ? Number(amountDelta) : existing.amountDelta;
    const diff = newAmount - existing.amountDelta;

    const updated = await prisma.$transaction(async (tx) => {
      const co = await tx.contractChangeOrder.update({
        where: { id: orderId },
        data: {
          title: title !== undefined ? title : existing.title,
          description: description !== undefined ? description : existing.description,
          scopeType: scopeType || existing.scopeType,
          requestedBy: requestedBy !== undefined ? requestedBy : existing.requestedBy,
          amountDelta: newAmount,
          timeDeltaDays: timeDeltaDays !== undefined ? Number(timeDeltaDays) : existing.timeDeltaDays,
          swatchRenderUrl: swatchRenderUrl !== undefined ? swatchRenderUrl : existing.swatchRenderUrl,
          clientSignOffUrl: clientSignOffUrl !== undefined ? clientSignOffUrl : existing.clientSignOffUrl,
          status: status || existing.status,
        },
      });

      if (diff !== 0) {
        await tx.project.update({
          where: { id: existing.projectId },
          data: { contractValue: { increment: diff } },
        });
      }

      return co;
    });

    return res.json({ success: true, changeOrder: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteChangeOrder = async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId || req.params.id);
    const existing = await prisma.contractChangeOrder.findUnique({ where: { id: orderId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Change order not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: existing.projectId },
        data: { contractValue: { decrement: existing.amountDelta } },
      });
      await tx.contractChangeOrder.delete({ where: { id: orderId } });
    });

    return res.json({ success: true, message: `Change order '${existing.orderNumber}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const seedInteriorLifecyclePhases = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const existing = await prisma.phase.findMany({ where: { projectId } });

    const interiorPhases = [
      { name: '1. Design & Concept Approval', sequence: 1 },
      { name: '2. Material Selection & Specs', sequence: 2 },
      { name: '3. BOQ Finalization', sequence: 3 },
      { name: '4. Procurement / Factory Fabrication', sequence: 4 },
      { name: '5. Site Execution / Installation', sequence: 5 },
      { name: '6. Handover & Snag List', sequence: 6 },
    ];

    const createdPhases = [];
    for (const p of interiorPhases) {
      const match = existing.find(
        (e) => e.name.toLowerCase() === p.name.toLowerCase() || e.sequence === p.sequence
      );
      if (!match) {
        const cp = await prisma.phase.create({
          data: {
            projectId,
            name: p.name,
            sequence: p.sequence,
            status: p.sequence === 1 ? 'IN_PROGRESS' : 'PENDING',
          },
        });
        createdPhases.push(cp);
      }
    }

    const allPhases = await prisma.phase.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
    });

    return res.json({
      success: true,
      message: `Interior lifecycle phases configured successfully (${createdPhases.length} added).`,
      phases: allPhases,
      createdCount: createdPhases.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectDailyShareReport = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sites: true,
        phases: { orderBy: { sequence: 'asc' } },
        tasks: {
          include: {
            assignedUser: { select: { id: true, name: true } },
            site: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
        clientInvoices: {
          include: { client: true },
          orderBy: { invoiceDate: 'desc' },
        },
        clientReceipts: {
          orderBy: { receiptDate: 'desc' },
        },
        expenses: {
          where: { status: 'APPROVED' },
          orderBy: { expenseDate: 'desc' },
        },
        purchaseOrders: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            supplier: true,
            invoices: true,
          },
        },
        labourAttendances: {
          include: {
            worker: { select: { id: true, name: true, trade: true } },
          },
        },
        boqItems: true,
        dailyReports: {
          orderBy: { reportDate: 'desc' },
          take: 1,
          include: {
            preparedBy: { select: { name: true } },
            labourEntries: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Contract & Budget values
    const contractValue = project.contractValue || 0;
    const approvedBudget = project.approvedBudget || 0;

    // Client Billings & Collections
    const totalBilled = (project.clientInvoices as any[]).reduce(
      (sum, inv) => sum + (inv.netInvoiceAmount || 0),
      0
    );
    const totalReceived = (project.clientReceipts as any[]).reduce(
      (sum, rcp) => sum + (rcp.amount || 0),
      0
    );

    // Client Outstanding:
    // 1. Total pending from overall contract
    const contractOutstanding = Math.max(0, contractValue - totalReceived);
    // 2. Total overdue/pending from raised invoices
    const billedOutstanding = Math.max(0, totalBilled - totalReceived);

    // Costs spent so far
    const materialsCost = (project.purchaseOrders as any[]).reduce(
      (sum, po) => sum + (po.totalAmount || 0),
      0
    );
    const labourCost = (project.labourAttendances as any[]).reduce(
      (sum, att) => sum + (att.totalWageEarned || 0),
      0
    );
    const expensesCost = (project.expenses as any[]).reduce(
      (sum, e) => sum + (e.totalAmount || 0),
      0
    );
    const boqActualCost = (project.boqItems as any[]).reduce(
      (sum, b) => sum + (b.actualExpenditure || 0),
      0
    );

    const actualCost = materialsCost + labourCost + expensesCost + boqActualCost;

    // Amount spent additionally by the company:
    // 1. Budget overrun (when actual site cost exceeds the approved budget)
    const budgetOverrun = Math.max(0, actualCost - approvedBudget);
    // 2. Net company capital funded (when cost exceeds client receipts collected)
    const companyCapitalInvested = Math.max(0, actualCost - totalReceived);

    // Vendor / Supplier Payables for this project
    const poIds = (project.purchaseOrders as any[]).map((po) => po.id);
    const supplierInvoices = poIds.length > 0
      ? await prisma.supplierInvoice.findMany({
          where: {
            purchaseOrderId: { in: poIds },
          },
          include: {
            supplier: true,
          },
        })
      : [];

    const vendorMap = new Map<string, any>();

    // Register all suppliers from POs
    for (const po of (project.purchaseOrders as any[])) {
      if (!po.supplier) continue;
      const sId = po.supplier.id;
      if (!vendorMap.has(sId)) {
        vendorMap.set(sId, {
          supplierId: sId,
          supplierName: po.supplier.name,
          phone: po.supplier.phone || '',
          email: po.supplier.email || '',
          totalOrdersAmount: 0,
          invoicedAmount: 0,
          paidAmount: 0,
          balanceDue: 0,
          poNumbers: [],
          invoices: [],
        });
      }
      const v = vendorMap.get(sId);
      v.totalOrdersAmount += po.totalAmount || 0;
      if (po.poNumber && !v.poNumbers.includes(po.poNumber)) {
        v.poNumbers.push(po.poNumber);
      }
    }

    // Process Supplier Invoices
    for (const inv of supplierInvoices) {
      const sId = inv.supplierId;
      if (!vendorMap.has(sId)) {
        vendorMap.set(sId, {
          supplierId: sId,
          supplierName: inv.supplier?.name || 'Vendor',
          phone: inv.supplier?.phone || '',
          email: inv.supplier?.email || '',
          totalOrdersAmount: 0,
          invoicedAmount: 0,
          paidAmount: 0,
          balanceDue: 0,
          poNumbers: [],
          invoices: [],
        });
      }
      const v = vendorMap.get(sId);
      v.invoicedAmount += inv.totalAmount || 0;
      v.paidAmount += inv.paidAmount || 0;
      v.balanceDue += inv.balanceDue || 0;
      v.invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balanceDue: inv.balanceDue,
        status: inv.status,
      });
    }

    const vendorPayables = Array.from(vendorMap.values()).map((v) => {
      // If invoices exist, balanceDue is the sum of invoice balance dues.
      // If no invoice yet, PO total minus any direct payment is the pending commitment.
      const effectiveDue = v.invoices.length > 0
        ? v.balanceDue
        : Math.max(0, v.totalOrdersAmount - v.paidAmount);
      return {
        ...v,
        balanceDue: effectiveDue,
      };
    });

    const totalVendorOutstanding = vendorPayables.reduce(
      (sum, v) => sum + (v.balanceDue || 0),
      0
    );

    // Tasks Status: Completed vs Pending
    const allTasks = (project.tasks as any[]) || [];
    const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED');
    const pendingTasks = allTasks.filter((t) => t.status !== 'COMPLETED');

    // Due date calculation for client report
    const unpaidInvoices = (project.clientInvoices as any[]).filter(
      (inv) => inv.balanceDue > 0
    );
    const nextInvoiceDue = unpaidInvoices.length > 0
      ? unpaidInvoices[0].dueDate
      : project.plannedEndDate;

    // Resolve matching Client record to guarantee latest phone and contact details without spaces
    let resolvedClient: any = null;
    const invWithClient = (project.clientInvoices as any[]).find((i) => i.client);
    if (invWithClient?.client) {
      resolvedClient = invWithClient.client;
    } else if (project.clientName) {
      resolvedClient = await prisma.client.findFirst({
        where: {
          OR: [
            { name: project.clientName },
            { companyName: project.clientName },
          ],
        },
      });
    }

    const effectiveClientPhone = (resolvedClient?.phone || project.clientContact || '').replace(/\s+/g, '');

    // Auto-sync project.clientContact if it was stale or had spaces
    if (effectiveClientPhone && project.clientContact !== effectiveClientPhone) {
      await prisma.project.update({
        where: { id: project.id },
        data: { clientContact: effectiveClientPhone },
      }).catch(() => {});
    }

    return res.json({
      success: true,
      report: {
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          siteAddress: project.siteAddress,
          clientName: resolvedClient?.name || project.clientName,
          clientContact: effectiveClientPhone,
          clientEmail: (resolvedClient?.email || project.clientEmail || '').trim(),
          projectType: project.projectType,
          status: project.status,
          completionPercent: project.completionPercent || 0,
          plannedStartDate: project.plannedStartDate,
          plannedEndDate: project.plannedEndDate,
        },
        ownerReport: {
          contractValue,
          approvedBudget,
          totalBilled,
          totalReceived,
          outstandingReceivable: contractOutstanding,
          billedOutstanding,
          spentSoFar: actualCost,
          costBreakdown: {
            materialsCost,
            labourCost,
            expensesCost,
            boqActualCost,
          },
          additionalSpent: budgetOverrun,
          companyCapitalInvested,
          vendorOutstanding: totalVendorOutstanding,
          vendorPayables,
          tasks: {
            total: allTasks.length,
            completedCount: completedTasks.length,
            pendingCount: pendingTasks.length,
            completedList: completedTasks.map((t) => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              completedQty: t.completedQty,
              unit: t.unit,
            })),
            pendingList: pendingTasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate,
              assignedUser: t.assignedUser?.name || 'Unassigned',
            })),
          },
          latestDPR: project.dailyReports?.[0] || null,
        },
        clientReport: {
          clientName: resolvedClient?.name || project.clientName,
          clientContact: effectiveClientPhone,
          clientEmail: (resolvedClient?.email || project.clientEmail || '').trim(),
          workingProgress: project.completionPercent || 0,
          totalPayment: contractValue,
          totalBilled,
          collectedPayment: totalReceived,
          balanceDue: contractOutstanding,
          billedBalanceDue: billedOutstanding,
          dueDate: nextInvoiceDue,
          unpaidInvoices: unpaidInvoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            netInvoiceAmount: inv.netInvoiceAmount,
            paidAmount: inv.paidAmount,
            balanceDue: inv.balanceDue,
          })),
          completedMilestones: completedTasks.slice(0, 5).map((t) => t.title),
          inProgressTasks: pendingTasks.slice(0, 6).map((t) => ({
            title: t.title,
            dueDate: t.dueDate,
            status: t.status,
          })),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

