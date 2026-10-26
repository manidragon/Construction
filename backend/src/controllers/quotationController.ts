import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { moveToRecycleBin } from './recycleBinController';

/**
 * Sequential Quotation Numbering: QUOT-YYYY-NNN
 */
export const getNextQuotationNumber = async (req?: Request, res?: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `QUOT-${currentYear}-`;

    const latest = await prisma.quotation.findFirst({
      where: { quotationNumber: { startsWith: prefix } },
      orderBy: { quotationNumber: 'desc' },
      select: { quotationNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.quotationNumber) {
      const parts = latest.quotationNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        nextSeq = num + 1;
      }
    }

    const nextQuotationNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    if (res) {
      return res.json({ success: true, nextQuotationNumber, nextSeq });
    }
    return { nextQuotationNumber, nextSeq };
  } catch (error: any) {
    if (res) {
      return res.status(500).json({ success: false, message: error.message });
    }
    throw error;
  }
};

/**
 * Standard interior and construction room templates
 */
export const getStandardBOQTemplates = (req: Request, res: Response) => {
  const templates = [
    {
      areaRoom: 'Living Room',
      workDescription: 'TV Unit in 19mm Greenply BWR Plywood with Century Laminate & Charcoal louvers',
      unit: 'SQFT',
      quantity: 80,
      rate: 1850,
      totalAmount: 148000,
    },
    {
      areaRoom: 'Living Room',
      workDescription: 'Gyproc False Ceiling with perimeter cove lighting trough & Philips LED strips',
      unit: 'SQFT',
      quantity: 220,
      rate: 145,
      totalAmount: 31900,
    },
    {
      areaRoom: 'Kitchen Modular Units',
      workDescription: 'Base and overhead modular cabinets with Hettich soft-close tandem drawers & acrylic shutters',
      unit: 'RFT',
      quantity: 24,
      rate: 3400,
      totalAmount: 81600,
    },
    {
      areaRoom: 'Kitchen Modular Units',
      workDescription: 'Quartz kitchen countertop (20mm Kalinga Stone) with bevel edge profiling and sink cutout',
      unit: 'SQFT',
      quantity: 45,
      rate: 950,
      totalAmount: 42750,
    },
    {
      areaRoom: 'Master Bedroom',
      workDescription: 'Floor-to-ceiling sliding wardrobe in 18mm MR Plywood with PU paint finish and lacquered glass inserts',
      unit: 'SQFT',
      quantity: 72,
      rate: 2200,
      totalAmount: 158400,
    },
    {
      areaRoom: 'Master Bedroom',
      workDescription: 'Bed back wall panelling with fluted WPC louvers and backlit brass profile accents',
      unit: 'SQFT',
      quantity: 65,
      rate: 650,
      totalAmount: 42250,
    },
    {
      areaRoom: 'Civil Work',
      workDescription: 'Vitrified tile flooring (1200x600mm Kajaria/Somany) with epoxy grouting & levelling',
      unit: 'SQFT',
      quantity: 650,
      rate: 110,
      totalAmount: 71500,
    },
    {
      areaRoom: 'Electrical',
      workDescription: 'Point wiring with Polycab FRLS copper wires, Legrand Arteor modular switches and DB dressing',
      unit: 'NOS',
      quantity: 65,
      rate: 850,
      totalAmount: 55250,
    },
    {
      areaRoom: 'Plumbing',
      workDescription: 'Concealed CPVC/UPVC pipe installation (Astral) with Jaquar concealed diverters & sanitary fittings',
      unit: 'LS',
      quantity: 1,
      rate: 45000,
      totalAmount: 45000,
    },
  ];

  return res.json({ success: true, templates });
};

/**
 * GET /api/quotations
 */
export const getQuotations = async (req: Request, res: Response) => {
  try {
    const { leadId, projectId, status } = req.query;

    const where: any = {};
    if (leadId && typeof leadId === 'string') where.leadId = leadId;
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (status && typeof status === 'string') where.status = status;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            clientName: true,
            contactNumber: true,
            stage: true,
            assignedTeam: true,
          },
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            advancePaymentConfirmed: true,
          },
        },
        items: {
          orderBy: { orderIndex: 'asc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            milestoneName: true,
            netInvoiceAmount: true,
            paidAmount: true,
            balanceDue: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, quotations });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/quotations/:id
 */
export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        lead: true,
        project: true,
        items: {
          orderBy: { orderIndex: 'asc' },
        },
        invoices: {
          orderBy: { invoiceDate: 'asc' },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    return res.json({ success: true, quotation });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper to calculate BOQ Totals & GST Modes
 * - Additional (Exclusive) GST (+18%): Subtotal is sum of items, tax is +18% on top, Grand Total = Subtotal + GST
 * - Inclusive GST (18%): Grand Total is sum of items (agreed flat value), Subtotal = Grand Total / 1.18, Tax Liability = Grand Total - Subtotal
 */
export const calculateQuotationFinancials = (items: any[], gstMode: string, customGrandTotal?: number) => {
  const rawSum = items.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.rate || 0)), 0);
  const gstPercent = 18.0;

  let subtotal = 0;
  let gstAmount = 0;
  let totalAmount = 0;

  if (gstMode === 'INCLUSIVE') {
    // Contract value is flat agreed amount
    totalAmount = customGrandTotal !== undefined && customGrandTotal > 0 ? customGrandTotal : rawSum;
    subtotal = Math.round((totalAmount / (1 + gstPercent / 100)) * 100) / 100;
    gstAmount = Math.round((totalAmount - subtotal) * 100) / 100; // Internal Tax Liability
  } else {
    // Additional (Exclusive) GST +18%
    subtotal = rawSum;
    gstAmount = Math.round((subtotal * (gstPercent / 100)) * 100) / 100;
    totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
  }

  return { subtotal, gstPercent, gstAmount, totalAmount };
};

/**
 * POST /api/quotations
 * Create BOQ Quotation
 */
export const createQuotation = async (req: Request, res: Response) => {
  try {
    const {
      quotationNumber,
      leadId,
      projectId,
      clientName,
      clientPhone,
      clientEmail,
      siteAddress,
      projectType,
      gstMode, // EXCLUSIVE or INCLUSIVE
      penaltyTerms,
      milestoneTerms,
      notes,
      validUntil,
      items, // array of { areaRoom, workDescription, unit, quantity, rate }
    } = req.body;

    if (!clientName || !clientPhone || !siteAddress) {
      return res.status(400).json({ success: false, message: 'Client name, phone, and site address are required.' });
    }

    let finalNumber = quotationNumber ? String(quotationNumber).trim() : '';
    if (finalNumber) {
      const existing = await prisma.quotation.findUnique({ where: { quotationNumber: finalNumber } });
      if (existing) {
        // Update in-place to prevent duplicate quotation records
        req.params.id = existing.id;
        return updateQuotation(req, res);
      }
    } else if (leadId) {
      const existingForLead = await prisma.quotation.findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      });
      if (existingForLead) {
        req.params.id = existingForLead.id;
        return updateQuotation(req, res);
      }
    }

    if (!finalNumber) {
      const generated = await getNextQuotationNumber();
      finalNumber = (generated as any).nextQuotationNumber;
    }

    const itemsList = Array.isArray(items) && items.length > 0 ? items : [];
    const mode = gstMode === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE';

    const { subtotal, gstPercent, gstAmount, totalAmount } = calculateQuotationFinancials(itemsList, mode);

    // Default milestone terms if not provided
    const defaultMilestones = [
      { name: '50% Advance on Booking & Mobilization', percentage: 50, amount: Math.round(totalAmount * 0.5) },
      { name: '40% on Framework & Material Delivery at Site', percentage: 40, amount: Math.round(totalAmount * 0.4) },
      { name: '10% on Final Handover & Snag Rectification', percentage: 10, amount: Math.round(totalAmount * 0.1) },
    ];

    const finalMilestoneTerms = milestoneTerms
      ? typeof milestoneTerms === 'string'
        ? milestoneTerms
        : JSON.stringify(milestoneTerms)
      : JSON.stringify(defaultMilestones);

    const defaultPenalty = 'Delayed milestone payments will attract a 2% weekly interest charge';

    const quotation = await prisma.quotation.create({
      data: {
        tenantId: (req as any).user?.companyId || null,
        quotationNumber: finalNumber,
        leadId: leadId || null,
        projectId: projectId || null,
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone).trim(),
        clientEmail: clientEmail ? String(clientEmail).trim() : null,
        siteAddress: String(siteAddress).trim(),
        projectType: projectType || 'RESIDENTIAL_INTERIOR',
        status: 'DRAFT',
        subtotal,
        gstMode: mode,
        gstPercent,
        gstAmount,
        totalAmount,
        penaltyTerms: penaltyTerms || defaultPenalty,
        milestoneTerms: finalMilestoneTerms,
        notes: notes || null,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdById: req.user?.id || null,
        items: {
          create: itemsList.map((it: any, index: number) => ({
            areaRoom: it.areaRoom || 'General Works',
            workDescription: it.workDescription || '',
            unit: it.unit || 'SQFT',
            quantity: Number(it.quantity) || 0,
            rate: Number(it.rate) || 0,
            totalAmount: (Number(it.quantity) || 0) * (Number(it.rate) || 0),
            orderIndex: index,
          })),
        },
      },
      include: {
        items: true,
        lead: true,
      },
    });

    await logAudit(req.user?.id, 'CREATE_QUOTATION', 'QUOTATION', quotation.id, {
      quotationNumber: finalNumber,
      clientName,
      totalAmount,
      gstMode: mode,
    }, req.ip);

    return res.status(201).json({ success: true, quotation });
  } catch (error: any) {
    console.error('Error creating quotation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/quotations/:id
 */
export const updateQuotation = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      clientName,
      clientPhone,
      clientEmail,
      siteAddress,
      projectType,
      gstMode,
      penaltyTerms,
      milestoneTerms,
      notes,
      validUntil,
      status,
      items,
    } = req.body;

    const existing: any = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const mode = gstMode ? (gstMode === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE') : existing.gstMode;
    const itemsList = Array.isArray(items) ? items : existing.items;

    const { subtotal, gstPercent, gstAmount, totalAmount } = calculateQuotationFinancials(itemsList, mode);

    // Delete old items and insert updated ones if provided
    if (Array.isArray(items)) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
      await prisma.quotationItem.createMany({
        data: items.map((it: any, index: number) => ({
          quotationId: id,
          areaRoom: it.areaRoom || 'General Works',
          workDescription: it.workDescription || '',
          unit: it.unit || 'SQFT',
          quantity: Number(it.quantity) || 0,
          rate: Number(it.rate) || 0,
          totalAmount: (Number(it.quantity) || 0) * (Number(it.rate) || 0),
          orderIndex: index,
        })),
      });
    }

    let formattedMilestones = existing.milestoneTerms;
    if (milestoneTerms) {
      formattedMilestones = typeof milestoneTerms === 'string' ? milestoneTerms : JSON.stringify(milestoneTerms);
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(clientName && { clientName }),
        ...(clientPhone && { clientPhone }),
        ...(clientEmail !== undefined && { clientEmail }),
        ...(siteAddress && { siteAddress }),
        ...(projectType && { projectType }),
        gstMode: mode,
        subtotal,
        gstPercent,
        gstAmount,
        totalAmount,
        ...(penaltyTerms !== undefined && { penaltyTerms }),
        milestoneTerms: formattedMilestones,
        ...(notes !== undefined && { notes }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(status && { status }),
      },
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
        lead: true,
        project: true,
        invoices: true,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_QUOTATION', 'QUOTATION', updated.id, {
      quotationNumber: updated.quotationNumber,
      totalAmount,
      gstMode: mode,
    }, req.ip);

    return res.json({ success: true, quotation: updated });
  } catch (error: any) {
    console.error('Error updating quotation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/quotations/:id/dispatch
 * Client Dispatch: Provide a `Save & Send via WhatsApp/Email` button that dispatches a summary
 * or PDF link and automatically shifts the lead status to `BOQ / Quotation Shared`.
 */
export const dispatchQuotation = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { channel } = req.body; // 'WHATSAPP', 'EMAIL', or 'BOTH'

    const quotation: any = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        lead: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const dispatchChannel = channel || 'WHATSAPP';
    const now = new Date();

    // Update Quotation status to SHARED
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'SHARED',
        sharedVia: dispatchChannel,
        sharedAt: now,
      },
      include: { items: true, lead: true },
    });

    // If quotation is linked to a Lead, automatically shift the lead status to "BOQ / Quotation Shared"
    if (quotation.leadId) {
      await prisma.lead.update({
        where: { id: quotation.leadId },
        data: {
          stage: 'BOQ_QUOTATION_SHARED',
        },
      });
    }

    // Build WhatsApp message format
    const formattedAmount = `₹${quotation.totalAmount.toLocaleString('en-IN')}`;
    const gstNotice = quotation.gstMode === 'EXCLUSIVE' ? '+18% GST Exclusive' : '18% GST Inclusive';
    const shareMessage = `*Apex Buildtech Quotation: ${quotation.quotationNumber}*\n` +
      `Dear ${quotation.clientName},\n` +
      `Please find attached our detailed BOQ & Quotation for your ${quotation.projectType.replace(/_/g, ' ')} project at ${quotation.siteAddress}.\n\n` +
      `*Total Agreed Value:* ${formattedAmount} (${gstNotice})\n` +
      `*Rooms / Scopes Itemized:* ${quotation.items.length} works\n` +
      `*Payment Milestones:* 50% Advance, 40% Material Delivery, 10% Handover.\n` +
      `*Late Payment Terms:* ${quotation.penaltyTerms || '2% weekly interest'}\n\n` +
      `You can view your official interactive quotation here: https://apexbuildtech.com/q/${quotation.quotationNumber}`;

    // Record outbound WhatsApp Log
    if (dispatchChannel === 'WHATSAPP' || dispatchChannel === 'BOTH') {
      try {
        await prisma.whatsAppLog.create({
          data: {
            tenantId: quotation.tenantId || req.user?.companyId,
            recipientPhone: quotation.clientPhone,
            recipientName: quotation.clientName,
            messageType: 'QUOTATION_SUMMARY',
            messageBody: shareMessage,
            status: 'SENT',
            gatewayUsed: 'SHARED_GATEWAY',
            sentById: req.user?.id || null,
          },
        });
      } catch (logErr) {
        console.error('Failed to write WhatsAppLog:', logErr);
      }
    }

    await logAudit(req.user?.id, 'DISPATCH_QUOTATION', 'QUOTATION', quotation.id, {
      quotationNumber: quotation.quotationNumber,
      channel: dispatchChannel,
      shiftedLeadStage: quotation.leadId ? 'BOQ_QUOTATION_SHARED' : null,
    }, req.ip);

    return res.json({
      success: true,
      message: `Quotation dispatched via ${dispatchChannel}! Lead status shifted to "BOQ / Quotation Shared".`,
      quotation: updatedQuotation,
      dispatchSummary: {
        clientName: quotation.clientName,
        clientPhone: quotation.clientPhone,
        clientEmail: quotation.clientEmail,
        dispatchChannel,
        dispatchedAt: now,
        whatsappText: shareMessage,
        pdfUrl: `/api/quotations/${quotation.id}/pdf`,
      },
    });
  } catch (error: any) {
    console.error('Error dispatching quotation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/quotations/:id/generate-milestone-invoice
 * MODULE 4: Auto-Generated Milestone Invoices from Quotations
 * Invoices link directly to approved BOQ and reflect milestone breakdowns (Advance, Mid-stage, Final Handover).
 * BLOCK final project handover and final invoice generation if any payment dues remain outstanding!
 */
export const generateMilestoneInvoiceFromQuotation = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      milestoneIndex, // 0 for Advance (50%), 1 for Mid-stage (40%), 2 for Handover (10%)
      milestoneName,
      percentage,
      isFinalHandover,
      dueDate,
    } = req.body;

    const quotation: any = await prisma.quotation.findUnique({
      where: { id },
      include: {
        lead: true,
        project: {
          include: {
            clientInvoices: true,
          },
        },
        items: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    if (!quotation.projectId) {
      return res.status(400).json({
        success: false,
        message: 'This quotation must be linked to an active project before generating client invoices. Convert the lead to a project first.',
      });
    }

    const project = quotation.project;
    if (!project) {
      return res.status(404).json({ success: false, message: 'Associated project not found.' });
    }

    // MODULE 4 STRICT COMPLIANCE GATE:
    // Block final project handover and final invoice generation if any payment dues remain outstanding!
    const isFinal = Boolean(isFinalHandover);
    if (isFinal) {
      const existingInvoices = (project.clientInvoices || []).filter((inv: any) => inv.status !== 'CANCELLED');
      const unpaidInvoices = existingInvoices.filter((inv: any) => inv.balanceDue > 0);
      const totalOutstanding = unpaidInvoices.reduce((sum: number, inv: any) => sum + inv.balanceDue, 0);

      if (totalOutstanding > 0) {
        return res.status(400).json({
          success: false,
          handoverBlocked: true,
          message: `Cannot generate Final Handover Invoice: Outstanding dues of ₹${totalOutstanding.toLocaleString('en-IN')} remain across ${unpaidInvoices.length} previous milestone invoice(s). All prior milestone bills must be cleared in full before generating the final invoice and executing project handover.`,
          unpaidInvoices: unpaidInvoices.map((inv: any) => ({
            invoiceNumber: inv.invoiceNumber,
            milestoneName: inv.milestoneName,
            balanceDue: inv.balanceDue,
            status: inv.status,
          })),
        });
      }
    }

    // Calculate milestone amount
    const pct = Number(percentage) || (isFinal ? 10 : 50);
    const milestoneTotal = Math.round((quotation.totalAmount * (pct / 100)) * 100) / 100;
    const gstRate = 18.0;
    const subtotal = Math.round((milestoneTotal / (1 + gstRate / 100)) * 100) / 100;
    const gstAmount = Math.round((milestoneTotal - subtotal) * 100) / 100;

    // Generate sequential invoice number: INV-YYYY-NNN
    const currentYear = new Date().getFullYear();
    const count = await prisma.clientInvoice.count();
    const invoiceNumber = `INV-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    // Find or create Client
    let client = await prisma.client.findFirst({
      where: { phone: quotation.clientPhone },
    });

    if (!client) {
      const clientCount = await prisma.client.count();
      client = await prisma.client.create({
        data: {
          code: `CLI-${String(clientCount + 1).padStart(3, '0')}`,
          name: quotation.clientName,
          phone: quotation.clientPhone,
          email: quotation.clientEmail,
          billingAddress: quotation.siteAddress,
        },
      });
    }

    const defaultDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const invoiceType = isFinal ? 'FINAL' : pct >= 40 ? 'MILESTONE' : 'ADVANCE';

    const invoice = await prisma.clientInvoice.create({
      data: {
        invoiceNumber,
        clientId: client.id,
        projectId: project.id,
        quotationId: quotation.id,
        invoiceType,
        milestoneName: milestoneName || `${pct}% Milestone Payment - ${quotation.quotationNumber}`,
        isFinalHandover: isFinal,
        invoiceDate: new Date(),
        dueDate: defaultDueDate,
        subtotal,
        retentionPercent: 0,
        retentionAmount: 0,
        tdsPercent: 0,
        tdsAmount: 0,
        gstPercent: gstRate,
        gstAmount,
        netInvoiceAmount: milestoneTotal,
        paidAmount: 0,
        balanceDue: milestoneTotal,
        status: 'SUBMITTED',
        certificationNotes: `Generated from Approved Quotation ${quotation.quotationNumber}. Scope: ${quotation.projectType}. Late payment penalty: ${quotation.penaltyTerms}`,
        items: {
          create: (quotation.items || []).map((item: any) => ({
            description: `[${item.areaRoom}] ${item.workDescription} (${pct}% Milestone)`,
            unit: item.unit,
            rate: item.rate,
            currentQty: (item.quantity * (pct / 100)),
            cumulativeQty: (item.quantity * (pct / 100)),
            amount: Math.round((item.totalAmount * (pct / 100)) * 100) / 100,
          })),
        },
      },
      include: {
        items: true,
        project: true,
      },
    });

    // If final handover invoice and approved, update project status to COMPLETED
    if (isFinal) {
      await prisma.project.update({
        where: { id: project.id },
        data: { completionPercent: 100 },
      });
    }

    await logAudit(req.user?.id, 'GENERATE_MILESTONE_INVOICE', 'INVOICE', invoice.id, {
      invoiceNumber,
      quotationNumber: quotation.quotationNumber,
      percentage: pct,
      isFinalHandover: isFinal,
      netInvoiceAmount: milestoneTotal,
    }, req.ip);

    return res.status(201).json({
      success: true,
      message: `Milestone invoice ${invoiceNumber} created successfully!`,
      invoice,
    });
  } catch (error: any) {
    console.error('Error generating milestone invoice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/quotations/:id
 */
export const deleteQuotation = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    // Archive to Recycle Bin before deleting so it can be restored
    await moveToRecycleBin({
      tenantId: existing.tenantId,
      entityType: 'Quotation',
      entityId: existing.id,
      itemNumber: existing.quotationNumber,
      title: `${existing.clientName} (${existing.quotationNumber})`,
      description: `${existing.projectType.replace(/_/g, ' ')} • Value: ₹${existing.totalAmount.toLocaleString('en-IN')} • ${existing.items?.length || 0} line items`,
      data: existing,
      user: req.user,
    });

    // Unlink any ClientInvoices generated from this quotation
    await prisma.clientInvoice.updateMany({
      where: { quotationId: id },
      data: { quotationId: null },
    });

    // Delete quotation items
    await prisma.quotationItem.deleteMany({
      where: { quotationId: id },
    });

    // Delete the quotation
    await prisma.quotation.delete({ where: { id } });

    await logAudit(req.user?.id, 'DELETE_QUOTATION', 'QUOTATION', id, {
      quotationNumber: existing.quotationNumber,
      clientName: existing.clientName,
    }, req.ip);

    return res.json({
      success: true,
      message: `Quotation ${existing.quotationNumber} moved to Recycle Bin. You can restore it anytime if needed.`,
    });
  } catch (error: any) {
    console.error('Error deleting quotation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
