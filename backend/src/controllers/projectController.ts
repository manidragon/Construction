import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;

    const where: any = {};
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

    return res.json({ success: true, projects });
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

    const materialsCost = (project.purchaseOrders as any[]).reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const labourCost = (project.labourAttendances as any[]).reduce((sum, att) => sum + (att.totalWageEarned || 0), 0);
    const expensesCost = (project.expenses as any[]).reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const boqActualCost = (project.boqItems as any[]).reduce((sum, b) => sum + (b.actualExpenditure || 0), 0);

    const actualCost = materialsCost + labourCost + expensesCost + boqActualCost;
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
    } = req.body;

    if (!code || !name || !clientName || !siteAddress || !plannedStartDate || !plannedEndDate) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const existing = await prisma.project.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Project code '${code}' already exists.` });
    }

    const project = await prisma.project.create({
      data: {
        code,
        name,
        description,
        clientName,
        clientContact,
        clientEmail,
        clientBillingAddr,
        clientGstin,
        siteAddress,
        city: city || 'Bengaluru',
        state: state || 'Karnataka',
        projectType: projectType || 'RESIDENTIAL',
        contractType: contractType || 'ITEM_RATE',
        contractValue: Number(contractValue) || 0,
        approvedBudget: Number(approvedBudget) || 0,
        plannedStartDate: new Date(plannedStartDate),
        plannedEndDate: new Date(plannedEndDate),
        status: 'ACTIVE',
        paymentTerms,
        taxRatePercent: Number(taxRatePercent) || 18.0,
      },
    });

    // Auto-create primary site
    await prisma.site.create({
      data: {
        projectId: project.id,
        name: 'Main Site Yard',
        code: `${code}-S01`,
        location: siteAddress,
      },
    });

    await logAudit(req.user?.id, 'CREATE', 'PROJECT', project.id, { code: project.code, name: project.name }, req.ip);

    return res.status(201).json({ success: true, project });
  } catch (error: any) {
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
    } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (status) data.status = status;
    if (completionPercent !== undefined) data.completionPercent = Number(completionPercent);
    if (contractValue !== undefined) data.contractValue = Number(contractValue);
    if (approvedBudget !== undefined) data.approvedBudget = Number(approvedBudget);
    if (actualStartDate) data.actualStartDate = new Date(actualStartDate);
    if (actualEndDate) data.actualEndDate = new Date(actualEndDate);
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;

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
    const { orderNumber, description, amountDelta, timeDeltaDays } = req.body;

    const changeOrder = await prisma.contractChangeOrder.create({
      data: {
        projectId,
        orderNumber,
        description,
        amountDelta: Number(amountDelta) || 0,
        timeDeltaDays: Number(timeDeltaDays) || 0,
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

    await logAudit(req.user?.id, 'CREATE_CHANGE_ORDER', 'PROJECT', projectId, { orderNumber, amountDelta }, req.ip);

    return res.status(201).json({ success: true, changeOrder });
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

    return res.json({
      success: true,
      report: {
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          siteAddress: project.siteAddress,
          clientName: project.clientName,
          clientContact: project.clientContact || '',
          clientEmail: project.clientEmail || '',
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
          clientName: project.clientName,
          clientContact: project.clientContact || '',
          clientEmail: project.clientEmail || '',
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

