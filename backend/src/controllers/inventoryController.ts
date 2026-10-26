import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const where: any = { isActive: true };
    if (category && typeof category === 'string') {
      where.category = category;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      include: {
        stockBalances: {
          include: {
            warehouse: { select: { id: true, name: true, code: true, isSiteStore: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const enriched = materials.map((m) => {
      const totalQty = m.stockBalances.reduce((sum, sb) => sum + sb.currentQty, 0);
      const totalValuation = m.stockBalances.reduce((sum, sb) => sum + sb.totalValuation, 0);
      const avgCost = totalQty > 0 ? totalValuation / totalQty : m.standardPrice;
      const isLowStock = totalQty <= m.minStockLevel;

      return {
        ...m,
        totalQty,
        totalValuation,
        avgCost,
        isLowStock,
      };
    });

    return res.json({ success: true, materials: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { code, name, category, brand, unit, standardPrice, minStockLevel, reorderQty, taxPercent } = req.body;

    if (!code || !name || !unit) {
      return res.status(400).json({ success: false, message: 'Code, name, and unit are required.' });
    }

    const existing = await prisma.material.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Material code '${code}' already exists.` });
    }

    const material = await prisma.material.create({
      data: {
        code,
        name,
        category: category || 'GENERAL',
        brand,
        unit,
        standardPrice: Number(standardPrice) || 0,
        minStockLevel: Number(minStockLevel) || 10,
        reorderQty: Number(reorderQty) || 50,
        taxPercent: Number(taxPercent) || 18.0,
      },
    });

    await logAudit(req.user?.id, 'CREATE', 'MATERIAL', material.id, { code, name }, req.ip);

    return res.status(201).json({ success: true, material });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, category, brand, unit, standardPrice, minStockLevel, reorderQty, taxPercent } = req.body;

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const updated = await prisma.material.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        category: category || existing.category,
        brand: brand !== undefined ? brand : existing.brand,
        unit: unit || existing.unit,
        standardPrice: standardPrice !== undefined ? Number(standardPrice) : existing.standardPrice,
        minStockLevel: minStockLevel !== undefined ? Number(minStockLevel) : existing.minStockLevel,
        reorderQty: reorderQty !== undefined ? Number(reorderQty) : existing.reorderQty,
        taxPercent: taxPercent !== undefined ? Number(taxPercent) : existing.taxPercent,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_MATERIAL', 'MATERIAL', id, { name: updated.name }, req.ip);

    return res.json({ success: true, material: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: { select: { stockBalances: true, poLineItems: true, requisitionItems: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    if (existing._count.poLineItems > 0 || existing._count.requisitionItems > 0) {
      // Soft-delete to preserve procurement audit history
      await prisma.material.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({ success: true, message: `Material '${existing.name}' archived successfully.` });
    }

    await prisma.stockBalance.deleteMany({ where: { materialId: id } });
    await prisma.material.delete({ where: { id } });

    await logAudit(req.user?.id, 'DELETE_MATERIAL', 'MATERIAL', id, { code: existing.code }, req.ip);

    return res.json({ success: true, message: `Material '${existing.name}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        balances: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, warehouses });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { code, name, location, isSiteStore, contactPerson, projectId } = req.body;

    if (!code || !name || !location) {
      return res.status(400).json({ success: false, message: 'Code, name, and location are required.' });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name,
        location,
        isSiteStore: Boolean(isSiteStore),
        contactPerson: contactPerson || null,
        projectId: projectId || null,
      },
    });

    await logAudit(req.user?.id, 'CREATE_WAREHOUSE', 'WAREHOUSE', warehouse.id, { code, name }, req.ip);

    return res.status(201).json({ success: true, warehouse });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, location, isSiteStore, contactPerson, projectId } = req.body;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        location: location !== undefined ? location : existing.location,
        isSiteStore: isSiteStore !== undefined ? Boolean(isSiteStore) : existing.isSiteStore,
        contactPerson: contactPerson !== undefined ? contactPerson : existing.contactPerson,
        projectId: projectId !== undefined ? projectId : existing.projectId,
      },
    });

    return res.json({ success: true, warehouse: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        balances: { where: { currentQty: { gt: 0 } } },
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    if (existing.balances.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete warehouse with positive stock in inventory (${existing.balances.length} items present).`,
      });
    }

    await prisma.stockBalance.deleteMany({ where: { warehouseId: id } });
    await prisma.warehouse.delete({ where: { id } });

    return res.json({ success: true, message: `Warehouse '${existing.name}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRequisitions = async (req: Request, res: Response) => {
  try {
    const { projectId, status } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') {
      where.projectId = projectId;
    }
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const requisitions = await prisma.materialRequisition.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        site: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            material: { select: { id: true, code: true, name: true, unit: true, standardPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, requisitions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createRequisition = async (req: Request, res: Response) => {
  try {
    const { projectId, siteId, requiredDate, priority, remarks, items } = req.body;

    if (!projectId || !requiredDate || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Project, required date, and at least one item are required.' });
    }

    const count = await prisma.materialRequisition.count();
    const requisitionNumber = `MR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const requisition = await prisma.materialRequisition.create({
      data: {
        requisitionNumber,
        projectId,
        siteId: siteId || null,
        requestedById: req.user!.id,
        requiredDate: new Date(requiredDate),
        priority: priority || 'MEDIUM',
        status: 'PENDING',
        remarks,
        items: {
          create: items.map((it: any) => ({
            materialId: it.materialId,
            requestedQty: Number(it.requestedQty),
            unit: it.unit,
            purpose: it.purpose,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await logAudit(req.user?.id, 'CREATE_REQUISITION', 'MATERIAL_REQUISITION', requisition.id, { requisitionNumber }, req.ip);

    return res.status(201).json({ success: true, requisition });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const approveRequisition = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, remarks } = req.body; // APPROVED or REJECTED

    const updated = await prisma.materialRequisition.update({
      where: { id },
      data: {
        status: status || 'APPROVED',
        approvedById: req.user?.id,
        approvedAt: new Date(),
        remarks: remarks || undefined,
      },
    });

    await logAudit(req.user?.id, `REQUISITION_${status}`, 'MATERIAL_REQUISITION', id, { status }, req.ip);

    return res.json({ success: true, requisition: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRequisition = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.materialRequisition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Requisition not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.requisitionItem.deleteMany({ where: { requisitionId: id } });
      await tx.materialRequisition.delete({ where: { id } });
    });

    return res.json({ success: true, message: 'Requisition deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Record stock transactions (Issue to Site, Site Consumption, Site Transfer, Wastage, Physical Adjustment)
 * Fully atomic with Weighted Average Costing and negative-stock prevention.
 */
export const recordStockMovement = async (req: Request, res: Response) => {
  try {
    const {
      txnType,
      materialId,
      qty,
      sourceWarehouseId,
      destWarehouseId,
      projectId,
      referenceNo,
      remarks,
    } = req.body;

    const quantity = Number(qty);
    if (!materialId || quantity <= 0 || !txnType) {
      return res.status(400).json({ success: false, message: 'Material, valid quantity (> 0), and transaction type are required.' });
    }

    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. If outward transaction (ISSUE_TO_SITE, CONSUMED, SITE_TRANSFER, DAMAGE, WASTAGE), check source warehouse
      let unitCost = material.standardPrice;

      if (sourceWarehouseId) {
        const sourceBalance = await tx.stockBalance.findUnique({
          where: {
            warehouseId_materialId: {
              warehouseId: sourceWarehouseId,
              materialId,
            },
          },
        });

        if (!sourceBalance || sourceBalance.currentQty < quantity) {
          const available = sourceBalance ? sourceBalance.currentQty : 0;
          throw new Error(
            `Insufficient Stock! Cannot issue ${quantity} ${material.unit}. Available in store: ${available} ${material.unit}`
          );
        }

        unitCost = sourceBalance.avgUnitCost || material.standardPrice;

        // Deduct from source warehouse
        const newSourceQty = sourceBalance.currentQty - quantity;
        const newSourceVal = newSourceQty * unitCost;

        await tx.stockBalance.update({
          where: { id: sourceBalance.id },
          data: {
            currentQty: newSourceQty,
            totalValuation: newSourceVal,
          },
        });
      }

      // 2. If inward destination warehouse (SITE_TRANSFER, RETURN_FROM_SITE)
      if (destWarehouseId) {
        let destBalance = await tx.stockBalance.findUnique({
          where: {
            warehouseId_materialId: {
              warehouseId: destWarehouseId,
              materialId,
            },
          },
        });

        if (!destBalance) {
          destBalance = await tx.stockBalance.create({
            data: {
              warehouseId: destWarehouseId,
              materialId,
              currentQty: 0,
              avgUnitCost: unitCost,
              totalValuation: 0,
            },
          });
        }

        const existingValuation = destBalance.currentQty * destBalance.avgUnitCost;
        const incomingValuation = quantity * unitCost;
        const newTotalQty = destBalance.currentQty + quantity;
        const newAvgCost = newTotalQty > 0 ? (existingValuation + incomingValuation) / newTotalQty : unitCost;

        await tx.stockBalance.update({
          where: { id: destBalance.id },
          data: {
            currentQty: newTotalQty,
            avgUnitCost: newAvgCost,
            totalValuation: newTotalQty * newAvgCost,
          },
        });
      }

      // 3. Create Stock Ledger entry
      const totalTxnCount = await tx.stockLedger.count();
      const txnNumber = `STK-${new Date().getFullYear()}-${String(totalTxnCount + 1).padStart(5, '0')}`;

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          txnNumber,
          txnType,
          materialId,
          qty: quantity,
          unit: material.unit,
          unitRate: unitCost,
          totalValue: quantity * unitCost,
          sourceWarehouseId: sourceWarehouseId || null,
          destWarehouseId: destWarehouseId || null,
          projectId: projectId || null,
          referenceNo: referenceNo || null,
          remarks,
          responsibleBy: req.user?.name || 'Storekeeper',
        },
      });

      return ledgerEntry;
    });

    await logAudit(req.user?.id, txnType, 'STOCK_LEDGER', result.id, { material: material.name, qty: quantity }, req.ip);

    return res.status(201).json({ success: true, transaction: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getStockLedger = async (req: Request, res: Response) => {
  try {
    const { materialId, warehouseId, projectId, txnType } = req.query;

    const where: any = {};
    if (materialId && typeof materialId === 'string') where.materialId = materialId;
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (txnType && typeof txnType === 'string') where.txnType = txnType;
    if (warehouseId && typeof warehouseId === 'string') {
      where.OR = [{ sourceWarehouseId: warehouseId }, { destWarehouseId: warehouseId }];
    }

    const ledger = await prisma.stockLedger.findMany({
      where,
      include: {
        material: { select: { code: true, name: true, unit: true } },
        sourceWarehouse: { select: { name: true, code: true } },
        destWarehouse: { select: { name: true, code: true } },
        project: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ success: true, ledger });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
