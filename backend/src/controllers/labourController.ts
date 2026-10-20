import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';

export const getWorkers = async (req: Request, res: Response) => {
  try {
    const { projectId, trade, search } = req.query;

    const where: any = { isActive: true };
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (trade && typeof trade === 'string') where.trade = trade;
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { workerCode: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const workers = await prisma.worker.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { workerCode: 'asc' },
    });

    return res.json({ success: true, workers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createWorker = async (req: Request, res: Response) => {
  try {
    const { workerCode, name, phone, trade, skillLevel, dailyWageRate, overtimeHourlyRate, paymentMethod, bankAccountNo, bankIfsc, emergencyPhone, projectId } = req.body;

    if (!workerCode || !name || !trade) {
      return res.status(400).json({ success: false, message: 'Worker code, name, and trade are required.' });
    }

    const worker = await prisma.worker.create({
      data: {
        workerCode,
        name,
        phone,
        trade,
        skillLevel: skillLevel || 'SKILLED',
        dailyWageRate: Number(dailyWageRate) || 600,
        overtimeHourlyRate: Number(overtimeHourlyRate) || 100,
        paymentMethod: paymentMethod || 'CASH',
        bankAccountNo,
        bankIfsc,
        emergencyPhone,
        projectId: projectId || null,
      },
    });

    await logAudit(req.user?.id, 'CREATE_WORKER', 'WORKER', worker.id, { workerCode, name }, req.ip);

    return res.status(201).json({ success: true, worker });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailyAttendance = async (req: Request, res: Response) => {
  try {
    const { date, projectId, siteId } = req.query;

    if (!date || !projectId) {
      return res.status(400).json({ success: false, message: 'Date and project ID are required.' });
    }

    const queryDate = new Date(date as string);
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate() + 1);

    const attendances = await prisma.labourAttendance.findMany({
      where: {
        projectId: projectId as string,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        ...(siteId ? { siteId: siteId as string } : {}),
      },
      include: {
        worker: true,
      },
      orderBy: { worker: { workerCode: 'asc' } },
    });

    return res.json({ success: true, attendances });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk save daily attendance register for a project/site on a specific date.
 * Computes regular and overtime wages accurately.
 */
export const saveBulkAttendance = async (req: Request, res: Response) => {
  try {
    const { date, projectId, siteId, records } = req.body;

    if (!date || !projectId || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Date, project, and attendance records array are required.' });
    }

    const attendanceDate = new Date(date);

    const results = await prisma.$transaction(async (tx) => {
      const saved: any[] = [];

      for (const rec of records) {
        const worker = await tx.worker.findUnique({ where: { id: rec.workerId } });
        if (!worker) continue;

        let regularWage = 0;
        let otWage = 0;
        const otHours = Number(rec.overtimeHours) || 0;

        if (rec.attendanceStatus === 'PRESENT') {
          regularWage = worker.dailyWageRate;
          otWage = otHours * worker.overtimeHourlyRate;
        } else if (rec.attendanceStatus === 'HALF_DAY') {
          regularWage = worker.dailyWageRate / 2;
          otWage = otHours * worker.overtimeHourlyRate;
        }

        const totalEarned = regularWage + otWage;

        const att = await tx.labourAttendance.upsert({
          where: {
            date_workerId_projectId: {
              date: attendanceDate,
              workerId: rec.workerId,
              projectId,
            },
          },
          update: {
            siteId: siteId || null,
            attendanceStatus: rec.attendanceStatus,
            regularHours: rec.attendanceStatus === 'PRESENT' ? 8 : rec.attendanceStatus === 'HALF_DAY' ? 4 : 0,
            overtimeHours: otHours,
            workActivity: rec.workActivity || null,
            wageCalculated: regularWage,
            overtimeWage: otWage,
            totalWageEarned: totalEarned,
            isVerified: true,
            supervisorName: req.user?.name || 'Supervisor',
          },
          create: {
            date: attendanceDate,
            projectId,
            siteId: siteId || null,
            workerId: rec.workerId,
            attendanceStatus: rec.attendanceStatus,
            regularHours: rec.attendanceStatus === 'PRESENT' ? 8 : rec.attendanceStatus === 'HALF_DAY' ? 4 : 0,
            overtimeHours: otHours,
            workActivity: rec.workActivity || null,
            wageCalculated: regularWage,
            overtimeWage: otWage,
            totalWageEarned: totalEarned,
            isVerified: true,
            supervisorName: req.user?.name || 'Supervisor',
          },
        });

        saved.push(att);
      }

      return saved;
    });

    await logAudit(
      req.user?.id,
      'SAVE_BULK_ATTENDANCE',
      'LABOUR_ATTENDANCE',
      projectId,
      { date, count: results.length },
      req.ip
    );

    return res.json({ success: true, count: results.length, attendances: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Muster Roll & Wage Sheet Summary for a project/date range
 */
export const getMusterRoll = async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const attendances = await prisma.labourAttendance.findMany({
      where,
      include: {
        worker: true,
        project: { select: { code: true, name: true } },
      },
    });

    // Group by worker
    const workerSummary: Record<string, any> = {};

    for (const a of attendances) {
      const wId = a.workerId;
      if (!workerSummary[wId]) {
        workerSummary[wId] = {
          worker: a.worker,
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          totalOtHours: 0,
          totalRegularWage: 0,
          totalOtWage: 0,
          grossWageEarned: 0,
        };
      }

      if (a.attendanceStatus === 'PRESENT') workerSummary[wId].presentDays += 1;
      else if (a.attendanceStatus === 'HALF_DAY') workerSummary[wId].halfDays += 1;
      else if (a.attendanceStatus === 'ABSENT') workerSummary[wId].absentDays += 1;

      workerSummary[wId].totalOtHours += a.overtimeHours;
      workerSummary[wId].totalRegularWage += a.wageCalculated;
      workerSummary[wId].totalOtWage += a.overtimeWage;
      workerSummary[wId].grossWageEarned += a.totalWageEarned;
    }

    return res.json({
      success: true,
      records: Object.values(workerSummary),
      totalLabourCost: Object.values(workerSummary).reduce((sum, w: any) => sum + w.grossWageEarned, 0),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubcontractors = async (req: Request, res: Response) => {
  try {
    const subcontractors = await prisma.subcontractor.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, subcontractors });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
