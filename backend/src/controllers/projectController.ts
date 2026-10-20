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

    // Compute financial overview for this project
    const totalBilled = (project.clientInvoices as any[]).reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);
    const totalReceived = (project.clientReceipts as any[]).reduce((sum, rcp) => sum + rcp.amount, 0);
    const boqActualCost = (project.boqItems as any[]).reduce((sum, b) => sum + (b.actualExpenditure || 0), 0);
    const totalExpenses = (project.expenses as any[]).reduce((sum, e) => sum + e.totalAmount, 0);
    const actualCost = boqActualCost + totalExpenses;
    const remainingBudget = Math.max(0, project.approvedBudget - actualCost);
    const budgetBurnPercent = project.approvedBudget > 0 ? (actualCost / project.approvedBudget) * 100 : 0;

    return res.json({
      success: true,
      project: {
        ...project,
        financials: {
          totalBilled,
          totalReceived,
          outstandingReceivable: Math.max(0, totalBilled - totalReceived),
          actualCost,
          remainingBudget,
          budgetBurnPercent: Math.round(budgetBurnPercent * 10) / 10,
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
