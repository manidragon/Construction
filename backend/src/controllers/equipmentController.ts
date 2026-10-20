import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getEquipment = async (req: Request, res: Response) => {
  try {
    const { status, category, assetType } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') where.status = status;
    if (category && typeof category === 'string') where.category = category;
    if (assetType && typeof assetType === 'string') where.assetType = assetType;

    const equipment = await prisma.equipmentAsset.findMany({
      where,
      include: {
        logs: {
          include: { project: { select: { code: true, name: true } } },
          orderBy: { logDate: 'desc' },
          take: 5,
        },
        maintenances: {
          orderBy: { maintenanceDate: 'desc' },
          take: 3,
        },
      },
      orderBy: { code: 'asc' },
    });

    return res.json({ success: true, equipment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createEquipment = async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      assetType,
      category,
      modelNo,
      serialNo,
      purchaseDate,
      purchasePrice,
      rentalRateType,
      rentalRate,
      currentProjectId,
      currentOperator,
    } = req.body;

    if (!code || !name || !category) {
      return res.status(400).json({ success: false, message: 'Code, name, and category are required.' });
    }

    const eq = await prisma.equipmentAsset.create({
      data: {
        code,
        name,
        assetType: assetType || 'OWNED',
        category,
        modelNo,
        serialNo,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: Number(purchasePrice) || 0,
        rentalRateType: rentalRateType || 'DAILY',
        rentalRate: Number(rentalRate) || 0,
        currentProjectId: currentProjectId || null,
        currentOperator,
        status: 'AVAILABLE',
      },
    });

    await logAudit(req.user?.id, 'CREATE_EQUIPMENT', 'EQUIPMENT', eq.id, { code, name }, req.ip);

    return res.status(201).json({ success: true, equipment: eq });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logEquipmentUsage = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { projectId, siteId, logDate, startHours, endHours, fuelConsumedLitres, workDescription, operatorName } = req.body;

    const startH = Number(startHours);
    const endH = Number(endHours);
    const hoursWorked = Math.max(0, endH - startH);

    const log = await prisma.$transaction(async (tx) => {
      const createdLog = await tx.equipmentLog.create({
        data: {
          equipmentId: id,
          projectId,
          siteId: siteId || null,
          logDate: logDate ? new Date(logDate) : new Date(),
          startHours: startH,
          endHours: endH,
          hoursWorked,
          fuelConsumedLitres: Number(fuelConsumedLitres) || 0,
          workDescription,
          operatorName,
        },
      });

      await tx.equipmentAsset.update({
        where: { id },
        data: {
          hoursRunTotal: { increment: hoursWorked },
          status: 'IN_USE',
        },
      });

      return createdLog;
    });

    return res.status(201).json({ success: true, log });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordMaintenance = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { maintenanceType, description, cost, servicedBy, nextDueHours, nextDueDate } = req.body;

    const maintenance = await prisma.equipmentMaintenance.create({
      data: {
        equipmentId: id,
        maintenanceDate: new Date(),
        maintenanceType: maintenanceType || 'ROUTINE',
        description,
        cost: Number(cost) || 0,
        servicedBy,
        nextDueHours: nextDueHours ? Number(nextDueHours) : null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      },
    });

    return res.status(201).json({ success: true, maintenance });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
