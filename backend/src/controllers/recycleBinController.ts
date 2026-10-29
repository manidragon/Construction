import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';

/**
 * Universal Recycle Bin Archival Helper
 * Serializes the deleted entity with all its child relations before removing from the active table.
 */
export const moveToRecycleBin = async (params: {
  tenantId?: string | null;
  entityType: string;
  entityId: string;
  itemNumber?: string | null;
  title: string;
  description?: string | null;
  data: any;
  user?: any;
}) => {
  try {
    const tenantId = params.tenantId || params.user?.companyId || null;
    const item = await prisma.recycleBinItem.create({
      data: {
        tenantId,
        entityType: params.entityType,
        entityId: params.entityId,
        itemNumber: params.itemNumber || null,
        title: params.title || `${params.entityType} ${params.itemNumber || params.entityId}`,
        description: params.description || null,
        data: typeof params.data === 'string' ? params.data : JSON.stringify(params.data),
        deletedById: params.user?.id || null,
        deletedByName: params.user?.name || 'Administrator',
        deletedAt: new Date(),
      },
    });

    await logAudit(
      params.user?.id,
      'MOVE_TO_RECYCLE_BIN',
      params.entityType,
      params.entityId,
      { itemNumber: params.itemNumber, title: params.title },
      undefined
    );

    return item;
  } catch (err: any) {
    console.error('Error archiving to recycle bin:', err);
    return null;
  }
};

/**
 * GET /api/recycle-bin
 * Fetch all items stored in the recycle bin with filtering & search
 */
export const getRecycleBinItems = async (req: Request, res: Response) => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSuperAdmin = (req as any).user?.role === 'SUPER_ADMIN';

    const { entityType, search } = req.query;

    const baseFilter: any = isSuperAdmin
      ? getTenantFilter(req)
      : userCompanyId
      ? {
          OR: [{ tenantId: userCompanyId }, { tenantId: null }],
        }
      : {};

    const where: any = { ...baseFilter };

    if (entityType && entityType !== 'ALL') {
      where.entityType = String(entityType);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { itemNumber: { contains: q } },
        { description: { contains: q } },
        { entityType: { contains: q } },
      ];
    }

    const items = await prisma.recycleBinItem.findMany({
      where,
      orderBy: { deletedAt: 'desc' },
      take: 200,
    });

    // Compute category counts for tab badges
    const allItems = await prisma.recycleBinItem.findMany({
      where: baseFilter,
      select: { entityType: true },
    });

    const counts: Record<string, number> = { ALL: allItems.length };
    for (const it of allItems) {
      counts[it.entityType] = (counts[it.entityType] || 0) + 1;
    }

    return res.json({
      success: true,
      items,
      counts,
      total: items.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/recycle-bin/:id/restore
 * Restore an archived entity back into its original database table
 */
export const restoreRecycleBinItem = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const binItem = await prisma.recycleBinItem.findUnique({ where: { id } });

    if (!binItem) {
      return res.status(404).json({ success: false, message: 'Recycle bin item not found or already purged.' });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(binItem.data);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Corrupted backup payload in recycle bin.' });
    }

    const entityType = binItem.entityType;

    // Entity restoration dispatcher
    if (entityType === 'Quotation') {
      // Re-create Quotation with items
      const itemsList = Array.isArray(parsedData.items) ? parsedData.items : [];
      
      // Clean up relations from root payload
      const { items, lead, project, invoices, ...quotationFields } = parsedData;

      // Check if quotation with this quotationNumber already exists
      const existing = await prisma.quotation.findFirst({
        where: { quotationNumber: quotationFields.quotationNumber, ...(binItem.tenantId ? { tenantId: binItem.tenantId } : {}) },
      });
      if (existing) {
        // Append restored suffix to avoid collision
        quotationFields.quotationNumber = `${quotationFields.quotationNumber}-REST`;
      }

      await prisma.quotation.create({
        data: {
          ...quotationFields,
          id: quotationFields.id || undefined,
          validUntil: quotationFields.validUntil ? new Date(quotationFields.validUntil) : null,
          createdAt: quotationFields.createdAt ? new Date(quotationFields.createdAt) : new Date(),
          updatedAt: new Date(),
          items: {
            create: itemsList.map((it: any, index: number) => ({
              areaRoom: it.areaRoom || 'General Scope',
              workDescription: it.workDescription || '',
              unit: it.unit || 'SQFT',
              quantity: Number(it.quantity) || 0,
              rate: Number(it.rate) || 0,
              totalAmount: Number(it.totalAmount) || (Number(it.quantity) || 0) * (Number(it.rate) || 0),
              orderIndex: it.orderIndex !== undefined ? it.orderIndex : index,
            })),
          },
        },
      });
    } else if (entityType === 'Lead') {
      const { quotations, convertedProject, assignedProjectManager, ...leadFields } = parsedData;
      
      const existing = await prisma.lead.findFirst({
        where: { leadNumber: leadFields.leadNumber, ...(binItem.tenantId ? { tenantId: binItem.tenantId } : {}) },
      });
      if (existing) {
        leadFields.leadNumber = `${leadFields.leadNumber}-REST`;
      }

      await prisma.lead.create({
        data: {
          ...leadFields,
          id: leadFields.id || undefined,
          siteVisitDate: leadFields.siteVisitDate ? new Date(leadFields.siteVisitDate) : null,
          createdAt: leadFields.createdAt ? new Date(leadFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (entityType === 'Project') {
      const { sites, phases, members, boqItems, tasks, dailyReports, requisitions, ...projectFields } = parsedData;

      const existing = await prisma.project.findFirst({
        where: { code: projectFields.code, ...(binItem.tenantId ? { tenantId: binItem.tenantId } : {}) },
      });
      if (existing) {
        projectFields.code = `${projectFields.code}-REST`;
      }

      await prisma.project.create({
        data: {
          ...projectFields,
          id: projectFields.id || undefined,
          plannedStartDate: projectFields.plannedStartDate ? new Date(projectFields.plannedStartDate) : new Date(),
          plannedEndDate: projectFields.plannedEndDate ? new Date(projectFields.plannedEndDate) : new Date(),
          actualStartDate: projectFields.actualStartDate ? new Date(projectFields.actualStartDate) : null,
          actualEndDate: projectFields.actualEndDate ? new Date(projectFields.actualEndDate) : null,
          createdAt: projectFields.createdAt ? new Date(projectFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (entityType === 'Task') {
      const { project, boqItem, assignedTo, comments, ...taskFields } = parsedData;

      await prisma.task.create({
        data: {
          ...taskFields,
          id: taskFields.id || undefined,
          startDate: taskFields.startDate ? new Date(taskFields.startDate) : null,
          dueDate: taskFields.dueDate ? new Date(taskFields.dueDate) : null,
          createdAt: taskFields.createdAt ? new Date(taskFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (entityType === 'BOQItem') {
      const { project, tasks, ...boqFields } = parsedData;

      await prisma.bOQItem.create({
        data: {
          ...boqFields,
          id: boqFields.id || undefined,
          clientSignOffDate: boqFields.clientSignOffDate ? new Date(boqFields.clientSignOffDate) : null,
          createdAt: boqFields.createdAt ? new Date(boqFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (entityType === 'Expense') {
      const { project, task, boqItem, approvedBy, ...expFields } = parsedData;

      await prisma.expense.create({
        data: {
          ...expFields,
          id: expFields.id || undefined,
          expenseDate: expFields.expenseDate ? new Date(expFields.expenseDate) : new Date(),
          createdAt: expFields.createdAt ? new Date(expFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (entityType === 'Material') {
      const { stocks, requisitionItems, poItems, ...matFields } = parsedData;

      const existing = await prisma.material.findFirst({
        where: { code: matFields.code, ...(binItem.tenantId ? { tenantId: binItem.tenantId } : {}) },
      });
      if (existing) {
        matFields.code = `${matFields.code}-REST`;
      }

      await prisma.material.create({
        data: {
          ...matFields,
          id: matFields.id || undefined,
          createdAt: matFields.createdAt ? new Date(matFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (entityType === 'DailyReport' || entityType === 'DailySiteReport') {
      const { project, site, labour, materials, equipment, photos, ...dprFields } = parsedData;

      await prisma.dailySiteReport.create({
        data: {
          ...dprFields,
          id: dprFields.id || undefined,
          reportDate: dprFields.reportDate ? new Date(dprFields.reportDate) : new Date(),
          createdAt: dprFields.createdAt ? new Date(dprFields.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Restore logic for entity type '${entityType}' is not currently configured.`,
      });
    }

    // Remove from Recycle Bin once restored
    await prisma.recycleBinItem.delete({ where: { id } });

    await logAudit(
      req.user?.id,
      'RESTORE_FROM_RECYCLE_BIN',
      binItem.entityType,
      binItem.entityId,
      { itemNumber: binItem.itemNumber, title: binItem.title },
      req.ip
    );

    return res.json({
      success: true,
      message: `Successfully restored ${binItem.entityType} "${binItem.itemNumber || binItem.title}" back to active records!`,
      restoredEntity: {
        id: binItem.entityId,
        entityType: binItem.entityType,
        itemNumber: binItem.itemNumber,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: `Restore failed: ${error.message}` });
  }
};

/**
 * DELETE /api/recycle-bin/:id
 * Permanently purge a single item from the recycle bin
 */
export const permanentDeleteRecycleBinItem = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.recycleBinItem.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Item not found in recycle bin.' });
    }

    await prisma.recycleBinItem.delete({ where: { id } });

    await logAudit(
      req.user?.id,
      'PERMANENT_DELETE_RECYCLE_BIN',
      existing.entityType,
      existing.entityId,
      { itemNumber: existing.itemNumber, title: existing.title },
      req.ip
    );

    return res.json({
      success: true,
      message: `Permanently removed ${existing.entityType} "${existing.itemNumber || existing.title}" from the Recycle Bin.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/recycle-bin/empty
 * Permanently empty all items in the recycle bin for the tenant
 */
export const emptyRecycleBin = async (req: Request, res: Response) => {
  try {
    const userCompanyId = (req as any).user?.companyId;
    const isSuperAdmin = (req as any).user?.role === 'SUPER_ADMIN';
    const baseFilter: any = isSuperAdmin
      ? getTenantFilter(req)
      : userCompanyId
      ? {
          OR: [{ tenantId: userCompanyId }, { tenantId: null }],
        }
      : {};

    const deletedResult = await prisma.recycleBinItem.deleteMany({
      where: baseFilter,
    });

    await logAudit(
      req.user?.id,
      'EMPTY_RECYCLE_BIN',
      'RECYCLE_BIN',
      'ALL',
      { count: deletedResult.count },
      req.ip
    );

    return res.json({
      success: true,
      message: `Recycle Bin emptied successfully. ${deletedResult.count} item(s) permanently removed.`,
      purgedCount: deletedResult.count,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
