import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getBOQByProject = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);

    const items = await prisma.bOQItem.findMany({
      where: { projectId },
      orderBy: { itemCode: 'asc' },
    });

    const revisions = await prisma.budgetRevision.findMany({
      where: { projectId },
      orderBy: { revisionNumber: 'desc' },
    });

    // Compute category-wise breakdown
    const categoryBreakdown: Record<string, { estimated: number; actual: number }> = {};
    let totalEstimated = 0;
    let totalActual = 0;

    for (const item of items) {
      if (!categoryBreakdown[item.category]) {
        categoryBreakdown[item.category] = { estimated: 0, actual: 0 };
      }
      categoryBreakdown[item.category].estimated += item.estimatedTotal;
      categoryBreakdown[item.category].actual += item.actualExpenditure;
      totalEstimated += item.estimatedTotal;
      totalActual += item.actualExpenditure;
    }

    return res.json({
      success: true,
      items,
      revisions,
      summary: {
        totalItems: items.length,
        totalEstimated,
        totalActual,
        variance: totalEstimated - totalActual,
        categoryBreakdown,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createBOQItem = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const {
      itemCode,
      description,
      category,
      unit,
      estimatedQty,
      materialUnitCost,
      labourUnitCost,
      equipmentUnitCost,
      subcontractUnitCost,
      otherUnitCost,
    } = req.body;

    const mat = Number(materialUnitCost) || 0;
    const lab = Number(labourUnitCost) || 0;
    const eqp = Number(equipmentUnitCost) || 0;
    const sub = Number(subcontractUnitCost) || 0;
    const oth = Number(otherUnitCost) || 0;
    const qty = Number(estimatedQty) || 0;

    const unitRate = mat + lab + eqp + sub + oth;
    const estimatedTotal = unitRate * qty;

    const item = await prisma.bOQItem.create({
      data: {
        projectId,
        itemCode,
        description,
        category: category || 'CIVIL_WORK',
        unit: unit || 'NOS',
        estimatedQty: qty,
        materialUnitCost: mat,
        labourUnitCost: lab,
        equipmentUnitCost: eqp,
        subcontractUnitCost: sub,
        otherUnitCost: oth,
        unitRate,
        estimatedTotal,
      },
    });

    // Update project approved budget
    await prisma.project.update({
      where: { id: projectId },
      data: {
        approvedBudget: { increment: estimatedTotal },
      },
    });

    await logAudit(req.user?.id, 'CREATE_BOQ_ITEM', 'BOQ', item.id, { itemCode, estimatedTotal }, req.ip);

    return res.status(201).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBOQProgress = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { actualQtyCompleted, actualExpenditure } = req.body;

    const existing = await prisma.bOQItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'BOQ item not found' });
    }

    const updated = await prisma.bOQItem.update({
      where: { id },
      data: {
        actualQtyCompleted: Number(actualQtyCompleted),
        actualExpenditure: Number(actualExpenditure),
      },
    });

    return res.json({ success: true, item: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createBudgetRevision = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const { revisedBudget, reason } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const revisionCount = await prisma.budgetRevision.count({ where: { projectId } });

    const revision = await prisma.budgetRevision.create({
      data: {
        projectId,
        revisionNumber: revisionCount + 1,
        previousBudget: project.approvedBudget,
        revisedBudget: Number(revisedBudget),
        reason,
        approvedBy: req.user?.name || 'Owner',
        status: 'APPROVED',
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { approvedBudget: Number(revisedBudget) },
    });

    await logAudit(
      req.user?.id,
      'BUDGET_REVISION',
      'PROJECT',
      projectId,
      { previous: project.approvedBudget, revised: revisedBudget, reason },
      req.ip
    );

    return res.status(201).json({ success: true, revision });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
