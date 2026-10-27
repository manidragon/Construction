import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { category, search, projectId, onlyProject } = req.query;

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
            warehouse: { select: { id: true, name: true, code: true, isSiteStore: true, projectId: true } },
          },
        },
        poLineItems: projectId && typeof projectId === 'string' && projectId !== 'ALL' ? {
          where: { purchaseOrder: { projectId } },
          include: {
            purchaseOrder: { select: { id: true, poNumber: true, poDate: true, status: true, supplier: { select: { name: true } } } },
          },
        } : false,
      },
      orderBy: { code: 'asc' },
    });

    // If projectId is provided, compute project-level inventory metrics
    let projectLedgers: any[] = [];
    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      projectLedgers = await prisma.stockLedger.findMany({
        where: { projectId },
        select: { materialId: true, qty: true, txnType: true },
      });
    }

    let enriched = materials.map((m: any) => {
      const totalQty = m.stockBalances.reduce((sum: number, sb: any) => sum + sb.currentQty, 0);
      const totalValuation = m.stockBalances.reduce((sum: number, sb: any) => sum + sb.totalValuation, 0);
      const avgCost = totalQty > 0 ? totalValuation / totalQty : m.standardPrice;
      const isLowStock = totalQty <= m.minStockLevel;

      let projectOrderedQty = 0;
      let projectReceivedQty = 0;
      let projectIssuedQty = 0;
      let projectOrders: any[] = [];

      if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
        if (m.poLineItems && Array.isArray(m.poLineItems)) {
          for (const pli of m.poLineItems) {
            projectOrderedQty += pli.orderQty;
            projectReceivedQty += pli.receivedQty;
            projectOrders.push({
              poNumber: pli.purchaseOrder.poNumber,
              poDate: pli.purchaseOrder.poDate,
              supplierName: pli.purchaseOrder.supplier?.name || 'Vendor',
              orderQty: pli.orderQty,
              receivedQty: pli.receivedQty,
              unitPrice: pli.unitPrice,
              status: pli.purchaseOrder.status,
            });
          }
        }

        const matLedgers = projectLedgers.filter((l) => l.materialId === m.id);
        for (const l of matLedgers) {
          if (l.txnType === 'PURCHASE_RECEIPT' || l.txnType === 'DIRECT_INWARD' || l.txnType === 'OPENING') {
            if (projectOrderedQty === 0) {
              projectReceivedQty += l.qty;
            }
          } else if (['ISSUE_TO_SITE', 'CONSUMED', 'DAMAGE', 'WASTAGE'].includes(l.txnType)) {
            projectIssuedQty += l.qty;
          }
        }
      }

      const projectAvailableStock = Math.max(0, projectReceivedQty - projectIssuedQty);

      return {
        ...m,
        totalQty,
        totalValuation,
        avgCost,
        isLowStock,
        projectOrderedQty,
        projectReceivedQty,
        projectIssuedQty,
        projectAvailableStock,
        hasProjectOrders: projectOrderedQty > 0 || projectReceivedQty > 0 || projectIssuedQty > 0,
        projectOrders,
      };
    });

    if (projectId && typeof projectId === 'string' && projectId !== 'ALL' && onlyProject === 'true') {
      enriched = enriched.filter((m) => m.hasProjectOrders);
    }

    return res.json({ success: true, materials: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNextMaterialCode = async (req: Request, res: Response) => {
  try {
    const allMaterials = await prisma.material.findMany({ select: { code: true } });
    let maxNum = 0;
    for (const m of allMaterials) {
      if (m.code && m.code.startsWith('MAT-')) {
        const match = m.code.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
    const nextCode = `MAT-GEN-${String(maxNum + 1).padStart(3, '0')}`;
    return res.json({ success: true, nextCode });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    let { code, name, category, brand, unit, standardPrice, minStockLevel, reorderQty, taxPercent } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Material name is required.' });
    }

    name = String(name).trim();
    unit = unit && String(unit).trim() ? String(unit).trim().toUpperCase() : 'NOS';

    // Auto-generate code if not provided
    if (!code || !String(code).trim()) {
      const allMaterials = await prisma.material.findMany({ select: { code: true } });
      let maxNum = 0;
      for (const m of allMaterials) {
        if (m.code && m.code.startsWith('MAT-')) {
          const match = m.code.match(/(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }
      code = `MAT-GEN-${String(maxNum + 1).padStart(3, '0')}`;
    } else {
      code = String(code).trim().toUpperCase();
      const existing = await prisma.material.findUnique({ where: { code } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Material code '${code}' already exists.` });
      }
    }

    const material = await prisma.material.create({
      data: {
        code,
        name,
        category: category || 'GENERAL',
        brand: brand ? String(brand).trim() : null,
        unit,
        standardPrice: standardPrice !== undefined && standardPrice !== '' ? Number(standardPrice) || 0 : 0,
        minStockLevel: minStockLevel !== undefined && minStockLevel !== '' ? Number(minStockLevel) || 10 : 10,
        reorderQty: reorderQty !== undefined && reorderQty !== '' ? Number(reorderQty) || 50 : 50,
        taxPercent: taxPercent !== undefined && taxPercent !== '' ? Number(taxPercent) || 0 : 18.0,
      },
    });

    // Auto-initialize stock balance for all warehouses
    try {
      const warehouses = await prisma.warehouse.findMany({ select: { id: true } });
      for (const wh of warehouses) {
        await prisma.stockBalance.upsert({
          where: {
            warehouseId_materialId: {
              warehouseId: wh.id,
              materialId: material.id,
            },
          },
          create: {
            warehouseId: wh.id,
            materialId: material.id,
            currentQty: 0,
            avgUnitCost: material.standardPrice,
            totalValuation: 0,
          },
          update: {},
        });
      }
    } catch (e) {
      // non-blocking
    }

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
      let unitCost = material.standardPrice;
      let effectiveSourceWarehouseId = sourceWarehouseId;

      // 1. If outward transaction (ISSUE_TO_SITE, CONSUMED, SITE_TRANSFER, DAMAGE, WASTAGE), check and deduct from source warehouse
      if (['ISSUE_TO_SITE', 'CONSUMED', 'SITE_TRANSFER', 'DAMAGE', 'WASTAGE'].includes(txnType)) {
        if (!effectiveSourceWarehouseId) {
          // Priority 1: Site store of this project with sufficient stock
          if (projectId) {
            const siteBal = await tx.stockBalance.findFirst({
              where: {
                materialId,
                currentQty: { gte: quantity },
                warehouse: { projectId },
              },
            });
            if (siteBal) effectiveSourceWarehouseId = siteBal.warehouseId;
          }
          // Priority 2: Any warehouse with sufficient stock
          if (!effectiveSourceWarehouseId) {
            const anyBal = await tx.stockBalance.findFirst({
              where: {
                materialId,
                currentQty: { gte: quantity },
              },
              orderBy: { currentQty: 'desc' },
            });
            if (anyBal) effectiveSourceWarehouseId = anyBal.warehouseId;
          }
          // Priority 3: Fallback to any warehouse with positive stock
          if (!effectiveSourceWarehouseId) {
            const anyPos = await tx.stockBalance.findFirst({
              where: { materialId, currentQty: { gt: 0 } },
              orderBy: { currentQty: 'desc' },
            });
            if (anyPos) effectiveSourceWarehouseId = anyPos.warehouseId;
          }
        }

        if (effectiveSourceWarehouseId) {
          const sourceBalance = await tx.stockBalance.findUnique({
            where: {
              warehouseId_materialId: {
                warehouseId: effectiveSourceWarehouseId,
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
      }

      // 2. If inward destination warehouse (SITE_TRANSFER, RETURN_FROM_SITE, DIRECT_INWARD, PURCHASE_RECEIPT)
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
          sourceWarehouseId: effectiveSourceWarehouseId || null,
          destWarehouseId: destWarehouseId || null,
          projectId: projectId || null,
          referenceNo: referenceNo || null,
          remarks,
          responsibleBy: req.user?.name || 'Storekeeper',
        },
      });

      return ledgerEntry;
    });

    await logAudit(req.user?.id, txnType, 'STOCK_LEDGER', result.id, { material: material.name, qty: quantity, projectId }, req.ip);

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
      take: 200,
    });

    return res.json({ success: true, ledger });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get materials displayed as per orders placed for a particular project
 */
export const getProjectMaterials = async (req: Request, res: Response) => {
  try {
    const { projectId, search } = req.query;

    const projectWhere: any = {};
    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      projectWhere.id = projectId;
    }

    // 1. Fetch relevant projects
    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, code: true, name: true, city: true, siteAddress: true },
      orderBy: { name: 'asc' },
    });

    const projectIds = projects.map((p) => p.id);

    // 2. Fetch all Purchase Orders for these projects
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch all Stock Ledgers for these projects
    const stockLedgers = await prisma.stockLedger.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        material: true,
        sourceWarehouse: { select: { id: true, name: true, code: true, isSiteStore: true } },
        destWarehouse: { select: { id: true, name: true, code: true, isSiteStore: true } },
      },
      orderBy: { txnDate: 'desc' },
    });

    // 4. Fetch all warehouses
    const warehouses = await prisma.warehouse.findMany({
      include: {
        balances: {
          include: { material: true },
        },
      },
    });

    // 5. Aggregate by Project + Material
    const projectMaterialMap: Record<string, any> = {};

    // A. Populate from PO Line Items
    for (const po of purchaseOrders) {
      for (const item of po.items) {
        if (!item.material) continue;
        const key = `${po.projectId}_${item.materialId}`;
        if (!projectMaterialMap[key]) {
          projectMaterialMap[key] = {
            id: key,
            materialId: item.materialId,
            materialCode: item.material.code,
            materialName: item.material.name,
            category: item.material.category,
            brand: item.material.brand,
            unit: item.material.unit,
            standardPrice: item.material.standardPrice,
            projectId: po.projectId,
            projectCode: po.project.code,
            projectName: po.project.name,
            totalOrderedQty: 0,
            totalReceivedQty: 0,
            totalIssuedQty: 0,
            availableStock: 0,
            avgUnitCost: item.unitPrice || item.material.standardPrice,
            purchaseOrders: [],
            stockMovements: [],
            preferredWarehouseId: null,
            preferredWarehouseName: null,
          };
        }

        const entry = projectMaterialMap[key];
        entry.totalOrderedQty += item.orderQty;
        entry.totalReceivedQty += item.receivedQty;
        entry.purchaseOrders.push({
          id: po.id,
          poNumber: po.poNumber,
          poDate: po.poDate,
          supplierName: po.supplier?.name || 'Vendor',
          orderQty: item.orderQty,
          receivedQty: item.receivedQty,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent,
          totalAmount: item.totalAmount,
          status: po.status,
        });
      }
    }

    // B. Augment from Stock Ledgers for the project
    for (const sl of stockLedgers) {
      if (!sl.material) continue;
      const key = `${sl.projectId}_${sl.materialId}`;
      if (!projectMaterialMap[key]) {
        const proj = projects.find((p) => p.id === sl.projectId);
        projectMaterialMap[key] = {
          id: key,
          materialId: sl.materialId,
          materialCode: sl.material.code,
          materialName: sl.material.name,
          category: sl.material.category,
          brand: sl.material.brand,
          unit: sl.material.unit,
          standardPrice: sl.material.standardPrice,
          projectId: sl.projectId,
          projectCode: proj?.code || '',
          projectName: proj?.name || '',
          totalOrderedQty: 0,
          totalReceivedQty: 0,
          totalIssuedQty: 0,
          availableStock: 0,
          avgUnitCost: sl.unitRate || sl.material.standardPrice,
          purchaseOrders: [],
          stockMovements: [],
          preferredWarehouseId: sl.destWarehouseId || sl.sourceWarehouseId || null,
          preferredWarehouseName: sl.destWarehouse?.name || sl.sourceWarehouse?.name || null,
        };
      }

      const entry = projectMaterialMap[key];
      entry.stockMovements.push({
        id: sl.id,
        txnNumber: sl.txnNumber,
        txnDate: sl.txnDate,
        txnType: sl.txnType,
        qty: sl.qty,
        unitRate: sl.unitRate,
        totalValue: sl.totalValue,
        sourceStore: sl.sourceWarehouse?.name,
        destStore: sl.destWarehouse?.name,
        referenceNo: sl.referenceNo,
        remarks: sl.remarks,
        responsibleBy: sl.responsibleBy,
      });

      if (sl.txnType === 'PURCHASE_RECEIPT' || sl.txnType === 'DIRECT_INWARD' || sl.txnType === 'OPENING') {
        if (entry.totalOrderedQty === 0) {
          entry.totalReceivedQty += sl.qty;
        }
      } else if (['ISSUE_TO_SITE', 'CONSUMED', 'DAMAGE', 'WASTAGE'].includes(sl.txnType)) {
        entry.totalIssuedQty += sl.qty;
      }
    }

    // C. Check warehouses & site stores for stock balances
    for (const entry of Object.values(projectMaterialMap)) {
      const projStore =
        warehouses.find((w) => w.projectId === entry.projectId && w.isSiteStore) ||
        warehouses.find((w) => !w.isSiteStore) ||
        warehouses[0];

      if (projStore) {
        entry.preferredWarehouseId = projStore.id;
        entry.preferredWarehouseName = projStore.name;
      }

      // Check site store physical balance
      const siteStoreBal = warehouses
        .find((w) => w.projectId === entry.projectId)
        ?.balances.find((b) => b.materialId === entry.materialId);

      // Check central / main store physical balance
      const mainStoreBal = warehouses
        .find((w) => !w.isSiteStore)
        ?.balances.find((b) => b.materialId === entry.materialId);

      const projectLedgerStock = Math.max(0, entry.totalReceivedQty - entry.totalIssuedQty);

      if (siteStoreBal && siteStoreBal.currentQty > 0) {
        entry.availableStock = siteStoreBal.currentQty;
      } else if (projectLedgerStock > 0) {
        entry.availableStock = projectLedgerStock;
      } else if (mainStoreBal && mainStoreBal.currentQty > 0) {
        entry.availableStock = mainStoreBal.currentQty;
      } else {
        entry.availableStock = 0;
      }

      entry.totalValuation = entry.availableStock * (entry.avgUnitCost || entry.standardPrice);
      entry.pendingDeliveryQty = Math.max(0, entry.totalOrderedQty - entry.totalReceivedQty);
    }

    let result = Object.values(projectMaterialMap);

    // Apply search filter if present
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m: any) =>
          m.materialName.toLowerCase().includes(q) ||
          m.materialCode.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.brand || '').toLowerCase().includes(q) ||
          m.projectName.toLowerCase().includes(q) ||
          m.projectCode.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      count: result.length,
      projectMaterials: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Direct Inward / Add Stock to a Material and Project
 */
export const addStock = async (req: Request, res: Response) => {
  try {
    const { materialId, warehouseId, projectId, qty, unitPrice, supplierName, referenceNo, remarks, txnType } = req.body;

    const quantity = Number(qty);
    if (!materialId || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Valid material and quantity (> 0) are required.' });
    }

    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      if (projectId) {
        const siteStore = await prisma.warehouse.findFirst({
          where: { projectId, isSiteStore: true },
        });
        if (siteStore) targetWarehouseId = siteStore.id;
      }
      if (!targetWarehouseId) {
        const mainWh = await prisma.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
        if (mainWh) targetWarehouseId = mainWh.id;
        else {
          const newWh = await prisma.warehouse.create({
            data: {
              code: 'WH-MAIN',
              name: 'Central Yard & Logistics Hub',
              location: 'Main Yard',
              isSiteStore: false,
            },
          });
          targetWarehouseId = newWh.id;
        }
      }
    }

    const price =
      unitPrice !== undefined && unitPrice !== '' && Number(unitPrice) > 0
        ? Number(unitPrice)
        : material.standardPrice;

    const movementTxnType = txnType || 'PURCHASE_RECEIPT';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert stock balance in destination warehouse
      let balance = await tx.stockBalance.findUnique({
        where: {
          warehouseId_materialId: {
            warehouseId: targetWarehouseId,
            materialId,
          },
        },
      });

      if (!balance) {
        balance = await tx.stockBalance.create({
          data: {
            warehouseId: targetWarehouseId,
            materialId,
            currentQty: quantity,
            avgUnitCost: price,
            totalValuation: quantity * price,
          },
        });
      } else {
        const existingValuation = balance.currentQty * balance.avgUnitCost;
        const incomingValuation = quantity * price;
        const newQty = balance.currentQty + quantity;
        const newAvgCost = newQty > 0 ? (existingValuation + incomingValuation) / newQty : price;

        balance = await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            currentQty: newQty,
            avgUnitCost: newAvgCost,
            totalValuation: newQty * newAvgCost,
          },
        });
      }

      // 2. If this material was ordered for this project in an active PO, update PO line item receivedQty
      if (projectId) {
        const poLine = await tx.pOLineItem.findFirst({
          where: {
            materialId,
            purchaseOrder: { projectId, status: { in: ['APPROVED', 'PARTIAL_RECEIVED'] } },
          },
        });

        if (poLine) {
          await tx.pOLineItem.update({
            where: { id: poLine.id },
            data: { receivedQty: { increment: quantity } },
          });
        }
      }

      // 3. Create StockLedger entry
      const totalTxnCount = await tx.stockLedger.count();
      const txnNumber = `STK-${new Date().getFullYear()}-${String(totalTxnCount + 1).padStart(5, '0')}`;

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          txnNumber,
          txnType: movementTxnType,
          materialId,
          qty: quantity,
          unit: material.unit,
          unitRate: price,
          totalValue: quantity * price,
          destWarehouseId: targetWarehouseId,
          projectId: projectId || null,
          referenceNo: referenceNo || null,
          remarks: remarks || (supplierName ? `Direct inward from ${supplierName}` : 'Stock added to project store'),
          responsibleBy: req.user?.name || 'Storekeeper',
        },
      });

      return { balance, ledgerEntry };
    });

    await logAudit(req.user?.id, 'ADD_STOCK', 'STOCK_BALANCE', result.balance.id, { material: material.name, qty: quantity, projectId }, req.ip);

    return res.status(201).json({
      success: true,
      message: `Successfully added ${quantity} ${material.unit} of ${material.name} to stock.`,
      balance: result.balance,
      ledger: result.ledgerEntry,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Direct Update / Physical Count Adjustment of Stock
 */
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { materialId, warehouseId, projectId, newQty, reason, remarks } = req.body;

    const targetQty = Number(newQty);
    if (!materialId || isNaN(targetQty) || targetQty < 0) {
      return res.status(400).json({ success: false, message: 'Valid material and non-negative stock quantity are required.' });
    }

    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const existingBalance = await prisma.stockBalance.findFirst({
        where: { materialId, currentQty: { gt: 0 } },
      });
      if (existingBalance) targetWarehouseId = existingBalance.warehouseId;
      else {
        const wh = await prisma.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
        targetWarehouseId = wh?.id;
      }
    }

    if (!targetWarehouseId) {
      return res.status(400).json({ success: false, message: 'No warehouse available to adjust stock.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let balance = await tx.stockBalance.findUnique({
        where: {
          warehouseId_materialId: {
            warehouseId: targetWarehouseId,
            materialId,
          },
        },
      });

      const oldQty = balance ? balance.currentQty : 0;
      const unitCost = balance?.avgUnitCost || material.standardPrice;
      const delta = targetQty - oldQty;

      if (!balance) {
        balance = await tx.stockBalance.create({
          data: {
            warehouseId: targetWarehouseId,
            materialId,
            currentQty: targetQty,
            avgUnitCost: unitCost,
            totalValuation: targetQty * unitCost,
          },
        });
      } else {
        balance = await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            currentQty: targetQty,
            totalValuation: targetQty * unitCost,
          },
        });
      }

      // Record StockLedger entry
      const totalTxnCount = await tx.stockLedger.count();
      const txnNumber = `STK-${new Date().getFullYear()}-${String(totalTxnCount + 1).padStart(5, '0')}`;

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          txnNumber,
          txnType: 'PHYSICAL_ADJUSTMENT',
          materialId,
          qty: Math.abs(delta),
          unit: material.unit,
          unitRate: unitCost,
          totalValue: Math.abs(delta) * unitCost,
          sourceWarehouseId: delta < 0 ? targetWarehouseId : null,
          destWarehouseId: delta > 0 ? targetWarehouseId : null,
          projectId: projectId || null,
          referenceNo: `ADJ-${Date.now().toString().slice(-4)}`,
          remarks: `Stock adjusted from ${oldQty} to ${targetQty} ${material.unit} (${delta >= 0 ? '+' : ''}${delta}). Reason: ${reason || 'Physical Count Audit'}. ${remarks || ''}`.trim(),
          responsibleBy: req.user?.name || 'Storekeeper',
        },
      });

      return { balance, ledgerEntry, oldQty, newQty: targetQty, delta };
    });

    await logAudit(req.user?.id, 'ADJUST_STOCK', 'STOCK_BALANCE', result.balance.id, { material: material.name, oldQty: result.oldQty, newQty: result.newQty }, req.ip);

    return res.json({
      success: true,
      message: `Stock updated successfully from ${result.oldQty} to ${result.newQty} ${material.unit}.`,
      balance: result.balance,
      ledger: result.ledgerEntry,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
