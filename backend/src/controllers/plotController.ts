import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';

// 1 Cent = 435.6 Square Feet
const SQFT_PER_CENT = 435.6;

const getParam = (val: any): string => {
  if (Array.isArray(val)) return String(val[0] || '');
  return val !== undefined && val !== null ? String(val) : '';
};

/**
 * GET /api/projects/:projectId/plots
 * Retrieve all plots, layout stats & batch groupings for a Real Estate project
 */
export const getProjectPlots = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const status = req.query.status ? String(req.query.status) : undefined;
    const sizeCents = req.query.sizeCents ? String(req.query.sizeCents) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const tenantFilter = getTenantFilter(req);

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...tenantFilter },
      select: {
        id: true,
        code: true,
        name: true,
        projectType: true,
        siteAddress: true,
        city: true,
        state: true,
        totalLandArea: true,
        landAreaUnit: true,
        surveyNumber: true,
        layoutApprovalNumber: true,
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized.' });
    }

    const where: any = { projectId };
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }
    if (sizeCents && typeof sizeCents === 'string' && sizeCents !== 'ALL') {
      const sizeNum = parseFloat(sizeCents);
      if (!isNaN(sizeNum)) {
        where.sizeCents = sizeNum;
      }
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { plotNumber: { contains: q } },
        { buyerName: { contains: q } },
        { buyerPhone: { contains: q } },
        { notes: { contains: q } },
      ];
    }

    const [plots, batches, allProjectPlots] = await Promise.all([
      prisma.plot.findMany({
        where,
        include: {
          batch: { select: { id: true, groupName: true, sizeCents: true } },
          client: { select: { id: true, code: true, name: true, phone: true, email: true, billingAddress: true } },
          documents: { select: { id: true, title: true, category: true, fileUrl: true, createdAt: true, description: true } },
          bookingHistory: { orderBy: { actionDate: 'desc' }, take: 10 },
        },
        orderBy: [{ plotNumber: 'asc' }],
      }),
      prisma.plotBatch.findMany({
        where: { projectId },
        include: {
          _count: { select: { plots: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.plot.findMany({
        where: { projectId },
        select: {
          id: true,
          sizeCents: true,
          price: true,
          status: true,
          tokenAmount: true,
          totalReceived: true,
          balanceDue: true,
        },
      }),
    ]);

    // Live Availability & Financial Aggregates
    const totalPlots = allProjectPlots.length;
    const availablePlots = allProjectPlots.filter((p) => p.status === 'AVAILABLE');
    const bookedPlots = allProjectPlots.filter((p) => p.status === 'BOOKED' || p.status === 'TOKEN_PAID');
    const tokenLapsedPlots = allProjectPlots.filter((p) => p.status === 'TOKEN_LAPSED_NO_SHOW');
    const registeredPlots = allProjectPlots.filter((p) => p.status === 'REGISTERED');

    const totalValuation = allProjectPlots.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalTokenReceived = allProjectPlots.reduce((sum, p) => sum + (p.totalReceived || p.tokenAmount || 0), 0);
    const totalBalanceDue = allProjectPlots.reduce((sum, p) => {
      if (p.status === 'AVAILABLE') return sum;
      return sum + (p.balanceDue || 0);
    }, 0);

    // Live Breakdown by Plot Size (e.g. 5 cents, 3 cents, 2.5 cents)
    const sizeMap = new Map<number, { sizeCents: number; total: number; available: number; booked: number; lapsed: number }>();
    for (const p of allProjectPlots) {
      const sz = Math.round(p.sizeCents * 100) / 100;
      if (!sizeMap.has(sz)) {
        sizeMap.set(sz, { sizeCents: sz, total: 0, available: 0, booked: 0, lapsed: 0 });
      }
      const entry = sizeMap.get(sz)!;
      entry.total += 1;
      if (p.status === 'AVAILABLE') entry.available += 1;
      else if (p.status === 'BOOKED' || p.status === 'TOKEN_PAID' || p.status === 'REGISTERED') entry.booked += 1;
      else if (p.status === 'TOKEN_LAPSED_NO_SHOW') entry.lapsed += 1;
    }
    const sizeBreakdown = Array.from(sizeMap.values()).sort((a, b) => b.sizeCents - a.sizeCents);

    return res.json({
      success: true,
      project,
      plots,
      batches,
      summary: {
        totalPlots,
        availableCount: availablePlots.length,
        bookedCount: bookedPlots.length,
        tokenLapsedCount: tokenLapsedPlots.length,
        registeredCount: registeredPlots.length,
        totalValuation,
        totalTokenReceived,
        totalBalanceDue,
        sizeBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Error in getProjectPlots:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/plots
 * Create an individual plot within a Real Estate project
 */
export const createPlot = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const project = await prisma.project.findFirst({
      where: { id: projectId, ...tenantFilter },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized.' });
    }

    const {
      plotNumber,
      sizeCents,
      sizeSqFt,
      ratePerCent,
      price,
      facing,
      dimensions,
      notes,
    } = req.body;

    if (!plotNumber || !sizeCents) {
      return res.status(400).json({ success: false, message: 'Plot number and size in cents are required.' });
    }

    const cleanPlotNumber = String(plotNumber).trim().toUpperCase();
    const cents = Number(sizeCents);
    const sqFt = Number(sizeSqFt) || Math.round(cents * SQFT_PER_CENT * 100) / 100;
    let computedPrice = Number(price) || 0;
    let computedRate = Number(ratePerCent) || 0;

    if (!computedPrice && computedRate > 0) {
      computedPrice = Math.round(cents * computedRate);
    } else if (computedPrice > 0 && !computedRate) {
      computedRate = Math.round(computedPrice / cents);
    }

    // Check duplicate plot number
    const existing = await prisma.plot.findFirst({
      where: { projectId, plotNumber: cleanPlotNumber },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Plot ${cleanPlotNumber} already exists in this project.` });
    }

    const plot = await prisma.plot.create({
      data: {
        tenantId,
        projectId,
        plotNumber: cleanPlotNumber,
        sizeCents: cents,
        sizeSqFt: sqFt,
        ratePerCent: computedRate,
        price: computedPrice,
        balanceDue: computedPrice,
        facing: facing || 'EAST',
        dimensions: dimensions || '',
        notes: notes || '',
        status: 'AVAILABLE',
      },
    });

    await logAudit(req.user?.id, 'CREATE_PLOT', 'PLOT', plot.id, { plotNumber: cleanPlotNumber, price: computedPrice }, req.ip);

    return res.status(201).json({ success: true, plot, message: `Plot ${cleanPlotNumber} added successfully.` });
  } catch (error: any) {
    console.error('Error in createPlot:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/plots/batch
 * Bulk add plot inventory by size groups/batches
 * (e.g. 50 plots of 5 cents, 30 plots of 3 cents, 20 plots of 2.5 cents with rate per cent or plot price)
 */
export const createPlotBatch = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const project = await prisma.project.findFirst({
      where: { id: projectId, ...tenantFilter },
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized.' });
    }

    const {
      groupName,
      numberOfPlots,
      sizeCents,
      sizeSqFt,
      ratePerCent,
      plotPrice,
      prefix,
      startNumber,
      facing,
      notes,
    } = req.body;

    const count = parseInt(numberOfPlots, 10);
    const cents = parseFloat(sizeCents);

    if (isNaN(count) || count <= 0) {
      return res.status(400).json({ success: false, message: 'Number of plots must be a positive integer.' });
    }
    if (isNaN(cents) || cents <= 0) {
      return res.status(400).json({ success: false, message: 'Size in cents must be greater than zero.' });
    }

    const sqFt = Number(sizeSqFt) || Math.round(cents * SQFT_PER_CENT * 100) / 100;
    let singlePrice = Number(plotPrice) || 0;
    let rate = Number(ratePerCent) || 0;

    if (!singlePrice && rate > 0) {
      singlePrice = Math.round(cents * rate);
    } else if (singlePrice > 0 && !rate) {
      rate = Math.round(singlePrice / cents);
    }

    const cleanPrefix = (prefix ? String(prefix).trim().toUpperCase() : 'PLOT-');
    const start = parseInt(startNumber, 10) || 1;

    // Create the Batch record
    const batch = await prisma.plotBatch.create({
      data: {
        tenantId,
        projectId,
        groupName: groupName || `${cents} Cents Group (${count} Plots)`,
        numberOfPlots: count,
        sizeCents: cents,
        sizeSqFt: sqFt,
        ratePerCent: rate,
        plotPrice: singlePrice,
        prefix: cleanPrefix,
        startNumber: start,
        facing: facing || 'EAST',
        notes: notes || '',
      },
    });

    // Existing plot numbers in this project to avoid collision
    const existingPlots = await prisma.plot.findMany({
      where: { projectId },
      select: { plotNumber: true },
    });
    const existingSet = new Set(existingPlots.map((p) => p.plotNumber.toUpperCase()));

    const plotsToCreate: any[] = [];
    let currentNum = start;

    for (let i = 0; i < count; i++) {
      let candidateNumber = `${cleanPrefix}${String(currentNum).padStart(2, '0')}`;
      while (existingSet.has(candidateNumber)) {
        currentNum++;
        candidateNumber = `${cleanPrefix}${String(currentNum).padStart(2, '0')}`;
      }
      existingSet.add(candidateNumber);

      plotsToCreate.push({
        tenantId,
        projectId,
        batchId: batch.id,
        plotNumber: candidateNumber,
        sizeCents: cents,
        sizeSqFt: sqFt,
        ratePerCent: rate,
        price: singlePrice,
        balanceDue: singlePrice,
        facing: facing || 'EAST',
        status: 'AVAILABLE',
      });

      currentNum++;
    }

    // Insert all plots in transaction
    await prisma.plot.createMany({
      data: plotsToCreate,
    });

    await logAudit(
      req.user?.id,
      'CREATE_PLOT_BATCH',
      'PLOT_BATCH',
      batch.id,
      { count, sizeCents: cents, singlePrice },
      req.ip
    );

    return res.status(201).json({
      success: true,
      batch,
      createdCount: plotsToCreate.length,
      message: `Successfully created batch: ${count} plots of ${cents} cents (${cleanPrefix}...)`,
    });
  } catch (error: any) {
    console.error('Error in createPlotBatch:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/projects/:projectId/plots/:id
 * Update individual plot details (price, rate, size, facing, notes)
 */
export const updatePlot = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const {
      plotNumber,
      sizeCents,
      sizeSqFt,
      ratePerCent,
      price,
      facing,
      dimensions,
      notes,
      status,
    } = req.body;

    const data: any = {};
    if (plotNumber) data.plotNumber = String(plotNumber).trim().toUpperCase();
    if (sizeCents !== undefined) {
      data.sizeCents = Number(sizeCents);
      data.sizeSqFt = Number(sizeSqFt) || Math.round(Number(sizeCents) * SQFT_PER_CENT * 100) / 100;
    }
    if (ratePerCent !== undefined) data.ratePerCent = Number(ratePerCent);
    if (price !== undefined) {
      data.price = Number(price);
      // If available, update balanceDue as well
      if (plot.status === 'AVAILABLE') {
        data.balanceDue = Number(price);
      } else {
        data.balanceDue = Math.max(0, Number(price) - (plot.totalReceived || plot.tokenAmount || 0));
      }
    }
    if (facing !== undefined) data.facing = facing;
    if (dimensions !== undefined) data.dimensions = dimensions;
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined) data.status = status;

    const updated = await prisma.plot.update({
      where: { id },
      data,
    });

    await logAudit(req.user?.id, 'UPDATE_PLOT', 'PLOT', id, { updatedFields: Object.keys(data) }, req.ip);

    return res.json({ success: true, plot: updated, message: 'Plot details updated.' });
  } catch (error: any) {
    console.error('Error in updatePlot:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/projects/:projectId/plots/:id
 * Remove plot (only if available)
 */
export const deletePlot = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    if (plot.status === 'BOOKED' || plot.status === 'TOKEN_PAID' || plot.totalReceived > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a booked plot with payments. Please release or cancel the booking first.',
      });
    }

    await prisma.plot.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_PLOT', 'PLOT', id, { plotNumber: plot.plotNumber }, req.ip);

    return res.json({ success: true, message: `Plot ${plot.plotNumber} deleted.` });
  } catch (error: any) {
    console.error('Error in deletePlot:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper to ensure a plot buyer is created as a Client in prisma.client
 * and a corresponding ClientInvoice (RA bill for Plot Sale) is issued and tracked.
 */
async function ensureBuyerClientAndInvoice({
  tenantId,
  projectId,
  plot,
  buyerName,
  buyerPhone,
  buyerEmail,
  buyerAadhaar,
  buyerAddress,
  paymentType,
  advance,
  newTotalReceived,
  userId,
}: {
  tenantId: string | null;
  projectId: string;
  plot: any;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerAadhaar?: string;
  buyerAddress?: string;
  paymentType: string;
  advance: number;
  newTotalReceived: number;
  userId?: string;
}) {
  const cleanedPhone = buyerPhone ? String(buyerPhone).replace(/\s+/g, '').trim() : '-';
  const nameTrimmed = String(buyerName).trim();

  // 1. Find or create Client
  let client = await prisma.client.findFirst({
    where: {
      ...(tenantId ? { tenantId } : {}),
      OR: [
        ...(cleanedPhone && cleanedPhone !== '-' ? [{ phone: cleanedPhone }] : []),
        { name: nameTrimmed },
      ],
    },
  });

  if (!client) {
    const allClients = await prisma.client.findMany({
      where: tenantId ? { tenantId } : {},
      select: { code: true },
    });
    let maxNum = 0;
    for (const c of allClients) {
      if (c.code && c.code.startsWith('CLI-')) {
        const num = parseInt(c.code.replace('CLI-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const newCode = `CLI-${String(maxNum + 1).padStart(3, '0')}`;
    client = await prisma.client.create({
      data: {
        tenantId,
        code: newCode,
        name: nameTrimmed,
        companyName: 'Plot Buyer (Individual)',
        contactPerson: nameTrimmed,
        phone: cleanedPhone,
        email: buyerEmail ? String(buyerEmail).trim() : null,
        billingAddress: buyerAddress ? String(buyerAddress).trim() : (plot.project?.siteAddress || 'Bengaluru, Karnataka'),
        pan: buyerAadhaar ? String(buyerAadhaar).trim() : null,
      },
    });
  }

  // 2. Find or create ClientInvoice for this plot sale
  let invoice = await prisma.clientInvoice.findFirst({
    where: {
      projectId,
      clientId: client.id,
      milestoneName: `Plot ${plot.plotNumber} Sale Consideration`,
      ...(tenantId ? { tenantId } : {}),
    },
  });

  const taxRate = plot.project?.taxRatePercent || 0;
  const gstAmount = taxRate > 0 ? Math.round((plot.price * taxRate) / 100) : 0;
  const netInvoiceAmount = plot.price + gstAmount;
  const balanceDue = Math.max(0, netInvoiceAmount - newTotalReceived);
  const invStatus = balanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

  if (!invoice) {
    const allInvoices = await prisma.clientInvoice.findMany({
      where: tenantId ? { tenantId } : {},
      select: { invoiceNumber: true },
    });
    let maxInvNum = 0;
    for (const inv of allInvoices) {
      const m = inv.invoiceNumber.match(/^RA-(\d+)/i) || inv.invoiceNumber.match(/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxInvNum) maxInvNum = n;
      }
    }
    const nextInvSeq = maxInvNum + 1;
    const nameTag = nameTrimmed.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const invoiceNumber = `RA-${String(nextInvSeq).padStart(2, '0')}-${nameTag || 'PLT'}`;

    invoice = await prisma.clientInvoice.create({
      data: {
        tenantId,
        invoiceNumber,
        clientId: client.id,
        projectId,
        invoiceType: 'RUNNING_ACCOUNT_RA',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: plot.price,
        retentionPercent: 0,
        retentionAmount: 0,
        tdsPercent: 0,
        tdsAmount: 0,
        gstPercent: taxRate,
        gstAmount,
        netInvoiceAmount,
        paidAmount: newTotalReceived,
        balanceDue,
        status: invStatus,
        milestoneName: `Plot ${plot.plotNumber} Sale Consideration`,
        certificationNotes: `Real estate sale consideration invoice for Plot #${plot.plotNumber} (${plot.sizeCents} Cents) at ${plot.project?.name || 'Layout'}`,
        items: {
          create: [
            {
              description: `Plot #${plot.plotNumber} (${plot.sizeCents} Cents / ${plot.sizeSqFt || Math.round(plot.sizeCents * 435.6)} sq.ft, Facing: ${plot.facing || 'EAST'}) at ${plot.project?.name || 'Layout'}`,
              currentQty: 1,
              cumulativeQty: 1,
              unit: 'PLOT',
              rate: plot.price,
              amount: plot.price,
            },
          ],
        },
      },
    });
  } else {
    invoice = await prisma.clientInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newTotalReceived,
        balanceDue,
        status: invStatus,
      },
    });
  }

  return { client, invoice };
}

/**
 * POST /api/projects/:projectId/plots/:id/book
 * Book / collect token advance / advance payment / full payment for a plot
 * Connects directly to Client directory, Invoices (RA Bills), Double-Entry Accounting & official receipts
 */
export const bookPlot = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
      include: { project: true },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const {
      buyerName,
      buyerPhone,
      buyerEmail,
      buyerAadhaar,
      buyerAddress,
      paymentType: rawPaymentType, // TOKEN_ADVANCE, ADVANCE_PAYMENT, FULL_PAYMENT
      tokenAmount,
      paymentMethod, // CASH, BANK_TRANSFER, UPI, CHEQUE
      chequeNumber,
      chequeBank,
      chequeDate,
      paymentReference,
      notes,
    } = req.body;

    if (!buyerName || !String(buyerName).trim()) {
      return res.status(400).json({ success: false, message: 'Buyer name is required.' });
    }

    const advance = Number(tokenAmount) || 0;
    const newTotalReceived = (plot.totalReceived || 0) + advance;
    const balanceDue = Math.max(0, plot.price - newTotalReceived);
    const method = paymentMethod || (chequeNumber ? 'CHEQUE' : 'BANK_TRANSFER');

    // Resolve payment type & status
    // 3 distinct payment types:
    // 1. TOKEN_ADVANCE -> status is TOKEN_PAID
    // 2. ADVANCE_PAYMENT -> status is BOOKED
    // 3. FULL_PAYMENT -> status is BOOKED (MUST REMAIN BOOKED, NEVER auto-registered!)
    let paymentType = rawPaymentType;
    if (!paymentType) {
      if (advance >= plot.price || newTotalReceived >= plot.price) paymentType = 'FULL_PAYMENT';
      else if (advance > (plot.tokenAmount || 0)) paymentType = 'ADVANCE_PAYMENT';
      else paymentType = 'TOKEN_ADVANCE';
    }

    let newStatus = 'TOKEN_PAID';
    if (paymentType === 'ADVANCE_PAYMENT' || paymentType === 'FULL_PAYMENT') {
      newStatus = 'BOOKED';
    } else if (paymentType === 'TOKEN_ADVANCE') {
      newStatus = 'TOKEN_PAID';
    }

    // 1. Ensure Buyer is in Client Directory & ClientInvoice (RA Bill) is created
    const { client, invoice } = await ensureBuyerClientAndInvoice({
      tenantId,
      projectId,
      plot,
      buyerName,
      buyerPhone,
      buyerEmail,
      buyerAadhaar,
      buyerAddress,
      paymentType,
      advance,
      newTotalReceived,
      userId: req.user?.id,
    });

    // 2. Update Plot Record
    const updatedPlot = await prisma.plot.update({
      where: { id },
      data: {
        status: newStatus,
        paymentType,
        clientId: client.id,
        buyerName: String(buyerName).trim(),
        buyerPhone: buyerPhone || plot.buyerPhone,
        buyerEmail: buyerEmail || plot.buyerEmail,
        buyerAadhaar: buyerAadhaar || plot.buyerAadhaar,
        buyerAddress: buyerAddress || plot.buyerAddress,
        tokenAmount: paymentType === 'TOKEN_ADVANCE' ? advance : (plot.tokenAmount || advance),
        totalReceived: newTotalReceived,
        balanceDue,
        bookingDate: plot.bookingDate || new Date(),
        tokenDate: new Date(),
        paymentMethod: method,
        paymentReference: paymentReference || null,
        chequeNumber: chequeNumber || null,
        chequeBank: chequeBank || null,
        chequeDate: chequeDate ? new Date(chequeDate) : null,
      },
      include: {
        client: true,
        project: true,
        documents: true,
      },
    });

    // 3. Record Plot Booking History (Preserves complete immutable audit trail)
    await prisma.plotBookingHistory.create({
      data: {
        tenantId,
        plotId: id,
        projectId,
        buyerName: String(buyerName).trim(),
        buyerPhone: buyerPhone || '',
        buyerEmail: buyerEmail || '',
        action: newStatus,
        tokenAmount: advance,
        totalReceived: newTotalReceived,
        balanceDue,
        paymentMethod: method,
        paymentReference: paymentReference || '',
        chequeNumber: chequeNumber || '',
        chequeBank: chequeBank || '',
        notes: notes || `${paymentType.replace(/_/g, ' ')} of ₹${advance.toLocaleString('en-IN')} received. Plot status: ${newStatus}.`,
        createdById: req.user?.id,
      },
    });

    // 4. Post to Double-Entry Accounting & Issue Client Receipt (if advance > 0)
    let receiptNumber = '';
    if (advance > 0) {
      try {
        const isCash = method === 'CASH';
        const debitAccount = isCash ? COA.CASH : COA.HDFC_BANK;
        const receiptCount = await prisma.clientReceipt.count({
          where: tenantId ? { tenantId } : {},
        });
        receiptNumber = `RCP-PLT-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(4, '0')}`;

        // Create official Client Receipt in billing module linked to client and invoice!
        await prisma.clientReceipt.create({
          data: {
            tenantId,
            receiptNumber,
            projectId,
            clientId: client.id,
            invoiceId: invoice?.id || null,
            receiptDate: new Date(),
            amount: advance,
            paymentMethod: method,
            referenceNo: paymentReference || chequeNumber || `PLOT-${plot.plotNumber}`,
            notes: `Real Estate Plot ${paymentType.replace(/_/g, ' ')} for ${plot.plotNumber} (${buyerName})`,
          },
        });

        // Double-entry journal voucher
        await postBalancedJournalEntry({
          tenantId,
          referenceType: 'CLIENT_RECEIPT',
          referenceId: id,
          narration: `${paymentType.replace(/_/g, ' ')} for Plot ${plot.plotNumber} from ${buyerName} via ${method}${chequeNumber ? ` (Chq #${chequeNumber})` : ''}`,
          lines: [
            { accountCode: debitAccount, debit: advance, credit: 0, projectId },
            { accountCode: COA.CONTRACT_REVENUE, debit: 0, credit: advance, projectId },
          ],
          createdById: req.user?.id,
        });
      } catch (accErr) {
        console.warn('Accounting entry for plot booking skipped/logged:', accErr);
      }
    }

    await logAudit(
      req.user?.id,
      'BOOK_PLOT',
      'PLOT',
      id,
      { plotNumber: plot.plotNumber, buyerName, paymentType, advance, balanceDue, status: newStatus },
      req.ip
    );

    return res.json({
      success: true,
      plot: updatedPlot,
      client,
      invoice,
      receiptNumber,
      message: `Plot ${plot.plotNumber} updated! ${paymentType.replace(/_/g, ' ')} of ₹${advance.toLocaleString('en-IN')} received. Status: ${newStatus}`,
    });
  } catch (error: any) {
    console.error('Error in bookPlot:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/plots/:id/payment
 * Record subsequent payments (Advance Payment, Full Payment) on a plot
 */
export const recordPlotPayment = async (req: Request, res: Response) => {
  return bookPlot(req, res);
};

/**
 * POST /api/projects/:projectId/plots/:id/register
 * Complete legal registration at the sub-registrar office
 * ONLY this action moves status from BOOKED to REGISTERED
 */
export const completePlotRegistration = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
      include: { project: true, client: true },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const {
      registrationDate,
      subRegistrarOffice,
      deedNumber,
      registrationDocUrl,
      registrationNotes,
    } = req.body;

    const regDate = registrationDate ? new Date(registrationDate) : new Date();

    const updatedPlot = await prisma.plot.update({
      where: { id },
      data: {
        status: 'REGISTERED',
        registrationDate: regDate,
        subRegistrarOffice: subRegistrarOffice || null,
        deedNumber: deedNumber || null,
        registrationDocUrl: registrationDocUrl || null,
        registrationNotes: registrationNotes || null,
      },
      include: {
        client: true,
        project: true,
        documents: true,
      },
    });

    // Record in PlotBookingHistory
    await prisma.plotBookingHistory.create({
      data: {
        tenantId,
        plotId: id,
        projectId,
        buyerName: plot.buyerName || 'Registered Buyer',
        buyerPhone: plot.buyerPhone || '',
        buyerEmail: plot.buyerEmail || '',
        action: 'REGISTERED',
        tokenAmount: plot.tokenAmount,
        totalReceived: plot.totalReceived,
        balanceDue: plot.balanceDue,
        paymentMethod: plot.paymentMethod,
        notes: `Legal Registration completed at Sub-Registrar Office (${subRegistrarOffice || 'SRO'}). Deed / Doc No: ${deedNumber || 'N/A'}. ${registrationNotes || ''}`,
        createdById: req.user?.id,
      },
    });

    // If a document was attached with registration, create DocumentAttachment
    if (registrationDocUrl) {
      await prisma.documentAttachment.create({
        data: {
          tenantId,
          title: `Registered Sale Deed - Plot ${plot.plotNumber} (${plot.buyerName || 'Buyer'})`,
          category: 'SALE_DEED',
          fileUrl: registrationDocUrl,
          projectId,
          plotId: id,
          referenceEntity: 'Plot',
          referenceId: id,
          description: `Registered Sale Deed Doc #${deedNumber || ''} registered at ${subRegistrarOffice || ''}`,
          uploadedById: req.user?.id,
        },
      });
    }

    await logAudit(
      req.user?.id,
      'COMPLETE_PLOT_REGISTRATION',
      'PLOT',
      id,
      { plotNumber: plot.plotNumber, deedNumber, subRegistrarOffice },
      req.ip
    );

    return res.json({
      success: true,
      plot: updatedPlot,
      message: `Plot ${plot.plotNumber} successfully registered! Status updated to REGISTERED.`,
    });
  } catch (error: any) {
    console.error('Error in completePlotRegistration:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/plots/:id/documents
 * Upload document for a plot/client (KYC, Sale Agreement, Registered Deed, EC, Patta, Receipts)
 */
export const uploadPlotDocument = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const { title, category, fileUrl, fileSize, fileType, description } = req.body;
    if (!title || !fileUrl) {
      return res.status(400).json({ success: false, message: 'Document title and file URL are required.' });
    }

    const doc = await prisma.documentAttachment.create({
      data: {
        tenantId,
        projectId,
        plotId: id,
        title: String(title).trim(),
        category: category || 'LAND_RECORD',
        fileUrl,
        fileSize: Number(fileSize) || null,
        fileType: fileType || null,
        referenceEntity: 'Plot',
        referenceId: id,
        description: description || `Document for Plot ${plot.plotNumber} (${category})`,
        uploadedById: req.user?.id,
      },
    });

    return res.status(201).json({ success: true, document: doc, message: 'Document uploaded successfully.' });
  } catch (error: any) {
    console.error('Error in uploadPlotDocument:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/projects/:projectId/plots/:id/documents
 * List all documents associated with a plot
 */
export const getPlotDocuments = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const documents = await prisma.documentAttachment.findMany({
      where: {
        OR: [
          { plotId: id },
          { referenceEntity: 'Plot', referenceId: id },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, documents });
  } catch (error: any) {
    console.error('Error in getPlotDocuments:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/plots/:id/mark-lapsed
 * Status handling for buyers who pay a token advance and do not return (TOKEN_LAPSED_NO_SHOW)
 * Preserves payment and status history before re-assignment or release
 */
export const markPlotLapsed = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const { reason } = req.body;
    const lapsedReason = reason || 'Buyer paid token advance but did not execute contract or attend registration within stipulated period (No-Show).';

    // 1. Record History Entry preserving old buyer details & token received
    await prisma.plotBookingHistory.create({
      data: {
        tenantId,
        plotId: id,
        projectId,
        buyerName: plot.buyerName || 'Unknown Buyer',
        buyerPhone: plot.buyerPhone || '',
        buyerEmail: plot.buyerEmail || '',
        action: 'TOKEN_LAPSED_NO_SHOW',
        tokenAmount: plot.tokenAmount,
        totalReceived: plot.totalReceived,
        balanceDue: plot.balanceDue,
        paymentMethod: plot.paymentMethod,
        paymentReference: plot.paymentReference,
        notes: lapsedReason,
        createdById: req.user?.id,
      },
    });

    // 2. Update Plot Status to TOKEN_LAPSED_NO_SHOW
    const updatedPlot = await prisma.plot.update({
      where: { id },
      data: {
        status: 'TOKEN_LAPSED_NO_SHOW',
        tokenLapsedDate: new Date(),
        lapsedReason,
      },
    });

    await logAudit(
      req.user?.id,
      'MARK_PLOT_LAPSED',
      'PLOT',
      id,
      { plotNumber: plot.plotNumber, previousBuyer: plot.buyerName, reason: lapsedReason },
      req.ip
    );

    return res.json({
      success: true,
      plot: updatedPlot,
      message: `Plot ${plot.plotNumber} marked as TOKEN_LAPSED_NO_SHOW. Payment history preserved. Plot is now eligible for release or re-assignment.`,
    });
  } catch (error: any) {
    console.error('Error in markPlotLapsed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:projectId/plots/:id/release
 * Release or re-assign a plot (e.g. from TOKEN_LAPSED_NO_SHOW or cancellation)
 * Preserves complete previous payment and status history in PlotBookingHistory
 */
export const releaseOrReassignPlot = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantId = req.user?.companyId || null;
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const {
      actionType, // 'RELEASE' (to Available) or 'REASSIGN' (to new buyer)
      newBuyerName,
      newBuyerPhone,
      newBuyerEmail,
      newTokenAmount,
      paymentMethod,
      chequeNumber,
      notes,
    } = req.body;

    if (actionType === 'REASSIGN') {
      if (!newBuyerName || !String(newBuyerName).trim()) {
        return res.status(400).json({ success: false, message: 'New buyer name is required for re-assignment.' });
      }

      const newAdvance = Number(newTokenAmount) || 0;
      const newBal = Math.max(0, plot.price - newAdvance);

      // Record Re-assignment in History
      await prisma.plotBookingHistory.create({
        data: {
          tenantId,
          plotId: id,
          projectId,
          buyerName: String(newBuyerName).trim(),
          buyerPhone: newBuyerPhone || '',
          buyerEmail: newBuyerEmail || '',
          action: 'REASSIGNED',
          tokenAmount: newAdvance,
          totalReceived: newAdvance,
          balanceDue: newBal,
          paymentMethod: paymentMethod || 'BANK_TRANSFER',
          chequeNumber: chequeNumber || '',
          notes: notes || `Re-assigned after previous buyer (${plot.buyerName}) lapsed/cancelled.`,
          createdById: req.user?.id,
        },
      });

      const updatedPlot = await prisma.plot.update({
        where: { id },
        data: {
          status: 'TOKEN_PAID',
          buyerName: String(newBuyerName).trim(),
          buyerPhone: newBuyerPhone || null,
          buyerEmail: newBuyerEmail || null,
          tokenAmount: newAdvance,
          totalReceived: newAdvance,
          balanceDue: newBal,
          bookingDate: new Date(),
          tokenDate: new Date(),
          tokenLapsedDate: null,
          lapsedReason: null,
          paymentMethod: paymentMethod || 'BANK_TRANSFER',
          chequeNumber: chequeNumber || null,
        },
      });

      return res.json({
        success: true,
        plot: updatedPlot,
        message: `Plot ${plot.plotNumber} successfully re-assigned to ${newBuyerName}.`,
      });
    }

    // Default: RELEASE plot back to inventory as AVAILABLE
    await prisma.plotBookingHistory.create({
      data: {
        tenantId,
        plotId: id,
        projectId,
        buyerName: plot.buyerName || 'Previous Buyer',
        buyerPhone: plot.buyerPhone || '',
        action: 'RELEASED',
        tokenAmount: 0,
        totalReceived: 0,
        balanceDue: plot.price,
        notes: notes || `Plot released back to inventory. Previous buyer: ${plot.buyerName || 'None'}.`,
        createdById: req.user?.id,
      },
    });

    const releasedPlot = await prisma.plot.update({
      where: { id },
      data: {
        status: 'AVAILABLE',
        buyerName: null,
        buyerPhone: null,
        buyerEmail: null,
        buyerAadhaar: null,
        buyerAddress: null,
        tokenAmount: 0,
        totalReceived: 0,
        balanceDue: plot.price,
        tokenLapsedDate: null,
        lapsedReason: null,
        paymentReference: null,
        chequeNumber: null,
        chequeBank: null,
        chequeDate: null,
      },
    });

    await logAudit(
      req.user?.id,
      'RELEASE_PLOT',
      'PLOT',
      id,
      { plotNumber: plot.plotNumber, previousBuyer: plot.buyerName },
      req.ip
    );

    return res.json({
      success: true,
      plot: releasedPlot,
      message: `Plot ${plot.plotNumber} released back to inventory as AVAILABLE. Historical bookings remain intact.`,
    });
  } catch (error: any) {
    console.error('Error in releaseOrReassignPlot:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/projects/:projectId/plots/:id/history
 * Fetch complete audit trail of bookings, tokens, lapses and re-assignments for a plot
 */
export const getPlotHistory = async (req: Request, res: Response) => {
  try {
    const projectId = getParam(req.params.projectId);
    const id = getParam(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const plot = await prisma.plot.findFirst({
      where: { id, projectId, ...tenantFilter },
      select: { id: true, plotNumber: true, sizeCents: true, price: true, status: true },
    });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found or unauthorized.' });
    }

    const history = await prisma.plotBookingHistory.findMany({
      where: { plotId: id },
      orderBy: { actionDate: 'desc' },
    });

    return res.json({ success: true, plot, history });
  } catch (error: any) {
    console.error('Error in getPlotHistory:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/plots/summary
 * Global Real Estate dashboard metrics across all land projects
 */
export const getAllPlotsSummary = async (req: Request, res: Response) => {
  try {
    const tenantFilter = getTenantFilter(req);

    const reProjects = await prisma.project.findMany({
      where: {
        ...tenantFilter,
        projectType: 'REAL_ESTATE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        siteAddress: true,
        city: true,
        totalLandArea: true,
        landAreaUnit: true,
        surveyNumber: true,
        layoutApprovalNumber: true,
        plots: {
          select: {
            id: true,
            plotNumber: true,
            sizeCents: true,
            price: true,
            status: true,
            tokenAmount: true,
            totalReceived: true,
            balanceDue: true,
          },
        },
      },
    });

    let totalPlots = 0;
    let availablePlots = 0;
    let bookedPlots = 0;
    let lapsedPlots = 0;
    let registeredPlots = 0;
    let totalValuation = 0;
    let totalReceived = 0;
    let totalBalanceDue = 0;

    for (const proj of reProjects) {
      for (const p of proj.plots) {
        totalPlots++;
        totalValuation += p.price || 0;
        totalReceived += p.totalReceived || p.tokenAmount || 0;
        if (p.status === 'AVAILABLE') availablePlots++;
        else if (p.status === 'BOOKED' || p.status === 'TOKEN_PAID') {
          bookedPlots++;
          totalBalanceDue += p.balanceDue || 0;
        } else if (p.status === 'TOKEN_LAPSED_NO_SHOW') lapsedPlots++;
        else if (p.status === 'REGISTERED') registeredPlots++;
      }
    }

    return res.json({
      success: true,
      projectsCount: reProjects.length,
      projects: reProjects,
      metrics: {
        totalProjects: reProjects.length,
        totalPlots,
        availablePlots,
        bookedPlots,
        lapsedPlots,
        registeredPlots,
        totalValuation,
        totalReceived,
        totalBalanceDue,
      },
    });
  } catch (error: any) {
    console.error('Error in getAllPlotsSummary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/plots/all
 * Retrieve all real estate plots across all land projects with live search & availability stats
 */
export const getAllRealEstatePlots = async (req: Request, res: Response) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { projectId, status, sizeCents, search } = req.query;

    const where: any = {
      project: {
        ...tenantFilter,
        projectType: 'REAL_ESTATE',
      },
    };

    if (projectId && String(projectId) !== 'ALL') {
      where.projectId = String(projectId);
    }
    if (status && String(status) !== 'ALL') {
      where.status = String(status);
    }
    if (sizeCents && String(sizeCents) !== 'ALL') {
      const sz = parseFloat(String(sizeCents));
      if (!isNaN(sz)) where.sizeCents = sz;
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { plotNumber: { contains: q } },
        { buyerName: { contains: q } },
        { buyerPhone: { contains: q } },
        { project: { name: { contains: q } } },
      ];
    }

    const [plots, projects] = await Promise.all([
      prisma.plot.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              siteAddress: true,
              city: true,
              surveyNumber: true,
              layoutApprovalNumber: true,
              taxRatePercent: true,
            },
          },
          batch: { select: { id: true, groupName: true, sizeCents: true } },
          client: { select: { id: true, code: true, name: true, phone: true } },
          documents: { select: { id: true, title: true, category: true, fileUrl: true, createdAt: true } },
        },
        orderBy: [{ projectId: 'asc' }, { plotNumber: 'asc' }],
      }),
      prisma.project.findMany({
        where: {
          ...tenantFilter,
          projectType: 'REAL_ESTATE',
        },
        select: {
          id: true,
          code: true,
          name: true,
          siteAddress: true,
          city: true,
          totalLandArea: true,
          landAreaUnit: true,
          surveyNumber: true,
          layoutApprovalNumber: true,
          _count: { select: { plots: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const totalPlots = plots.length;
    const availableCount = plots.filter((p) => p.status === 'AVAILABLE').length;
    const tokenPaidCount = plots.filter((p) => p.status === 'TOKEN_PAID').length;
    const bookedCount = plots.filter((p) => p.status === 'BOOKED').length;
    const lapsedCount = plots.filter((p) => p.status === 'TOKEN_LAPSED_NO_SHOW').length;
    const registeredCount = plots.filter((p) => p.status === 'REGISTERED').length;

    const totalValuation = plots.reduce((s, p) => s + (p.price || 0), 0);
    const totalCollected = plots.reduce((s, p) => s + (p.totalReceived || 0), 0);
    const totalBalance = plots.reduce((s, p) => s + (p.status !== 'AVAILABLE' ? (p.balanceDue || 0) : 0), 0);

    return res.json({
      success: true,
      plots,
      projects,
      summary: {
        totalPlots,
        availableCount,
        tokenPaidCount,
        bookedCount,
        lapsedCount,
        registeredCount,
        totalValuation,
        totalCollected,
        totalBalance,
      },
    });
  } catch (error: any) {
    console.error('Error in getAllRealEstatePlots:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
