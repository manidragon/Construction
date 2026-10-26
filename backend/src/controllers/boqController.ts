import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { moveToRecycleBin } from './recycleBinController';

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
      materialSwatchUrl,
      designRenderUrl,
      clientApprovalStatus,
      clientSignOffDoc,
      clientSignOffDate,
      scopeVariationNotes,
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
        category: category || 'FALSE_CEILING',
        unit: unit || 'SQFT',
        estimatedQty: qty,
        materialUnitCost: mat,
        labourUnitCost: lab,
        equipmentUnitCost: eqp,
        subcontractUnitCost: sub,
        otherUnitCost: oth,
        unitRate,
        estimatedTotal,
        materialSwatchUrl: materialSwatchUrl || null,
        designRenderUrl: designRenderUrl || null,
        clientApprovalStatus: clientApprovalStatus || 'APPROVED',
        clientSignOffDoc: clientSignOffDoc || null,
        clientSignOffDate: clientSignOffDate ? new Date(clientSignOffDate) : null,
        scopeVariationNotes: scopeVariationNotes || null,
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

export const updateBOQItem = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
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
      actualQtyCompleted,
      actualExpenditure,
      materialSwatchUrl,
      designRenderUrl,
      clientApprovalStatus,
      clientSignOffDoc,
      clientSignOffDate,
      scopeVariationNotes,
    } = req.body;

    const existing = await prisma.bOQItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'BOQ item not found' });
    }

    const mat = materialUnitCost !== undefined ? Number(materialUnitCost) : existing.materialUnitCost;
    const lab = labourUnitCost !== undefined ? Number(labourUnitCost) : existing.labourUnitCost;
    const eqp = equipmentUnitCost !== undefined ? Number(equipmentUnitCost) : existing.equipmentUnitCost;
    const sub = subcontractUnitCost !== undefined ? Number(subcontractUnitCost) : existing.subcontractUnitCost;
    const oth = otherUnitCost !== undefined ? Number(otherUnitCost) : existing.otherUnitCost;
    const qty = estimatedQty !== undefined ? Number(estimatedQty) : existing.estimatedQty;

    const unitRate = mat + lab + eqp + sub + oth;
    const estimatedTotal = unitRate * qty;
    const budgetDelta = estimatedTotal - existing.estimatedTotal;

    const updated = await prisma.bOQItem.update({
      where: { id },
      data: {
        itemCode: itemCode !== undefined ? itemCode : existing.itemCode,
        description: description !== undefined ? description : existing.description,
        category: category !== undefined ? category : existing.category,
        unit: unit !== undefined ? unit : existing.unit,
        estimatedQty: qty,
        materialUnitCost: mat,
        labourUnitCost: lab,
        equipmentUnitCost: eqp,
        subcontractUnitCost: sub,
        otherUnitCost: oth,
        unitRate,
        estimatedTotal,
        actualQtyCompleted: actualQtyCompleted !== undefined ? Number(actualQtyCompleted) : existing.actualQtyCompleted,
        actualExpenditure: actualExpenditure !== undefined ? Number(actualExpenditure) : existing.actualExpenditure,
        materialSwatchUrl: materialSwatchUrl !== undefined ? materialSwatchUrl : existing.materialSwatchUrl,
        designRenderUrl: designRenderUrl !== undefined ? designRenderUrl : existing.designRenderUrl,
        clientApprovalStatus: clientApprovalStatus !== undefined ? clientApprovalStatus : existing.clientApprovalStatus,
        clientSignOffDoc: clientSignOffDoc !== undefined ? clientSignOffDoc : existing.clientSignOffDoc,
        clientSignOffDate: clientSignOffDate !== undefined ? (clientSignOffDate ? new Date(clientSignOffDate) : null) : existing.clientSignOffDate,
        scopeVariationNotes: scopeVariationNotes !== undefined ? scopeVariationNotes : existing.scopeVariationNotes,
      },
    });

    if (budgetDelta !== 0) {
      await prisma.project.update({
        where: { id: existing.projectId },
        data: {
          approvedBudget: { increment: budgetDelta },
        },
      });
    }

    await logAudit(req.user?.id, 'UPDATE_BOQ_ITEM', 'BOQ', id, { itemCode: updated.itemCode, budgetDelta }, req.ip);

    return res.json({ success: true, item: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBOQItem = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.bOQItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'BOQ item not found' });
    }

    // Archive to Recycle Bin before deleting
    await moveToRecycleBin({
      entityType: 'BOQItem',
      entityId: existing.id,
      itemNumber: existing.itemCode,
      title: `${existing.itemCode} - ${existing.description.substring(0, 40)}`,
      description: existing.description,
      data: existing,
      user: req.user,
    });

    await prisma.bOQItem.delete({ where: { id } });

    // Decrement project approved budget
    await prisma.project.update({
      where: { id: existing.projectId },
      data: {
        approvedBudget: { decrement: existing.estimatedTotal },
      },
    });

    await logAudit(req.user?.id, 'DELETE_BOQ_ITEM', 'BOQ', id, { itemCode: existing.itemCode }, req.ip);

    return res.json({ success: true, message: 'BOQ item deleted successfully' });
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
