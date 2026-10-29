import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';

export const getWorkers = async (req: Request, res: Response) => {
  try {
    const { projectId, trade, search } = req.query;

    const where: any = { isActive: true };
    if (trade && typeof trade === 'string') where.trade = trade;
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { workerCode: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (projectId && typeof projectId === 'string') {
      where.OR = [
        { projectId: projectId },
        { projectAssignments: { some: { projectId } } },
        { attendances: { some: { projectId } } },
      ];
    }

    const workers = await prisma.worker.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        projectAssignments: {
          include: {
            project: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { workerCode: 'asc' },
    });

    return res.json({ success: true, workers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export function computeGlobalNextWorkerCode(allWorkers: { workerCode: string | null }[]): string {
  let maxNum = 0;
  let useThreeDigits = false;

  for (const w of allWorkers) {
    if (!w.workerCode) continue;
    const trimmed = w.workerCode.trim();
    // Match WRK-01, WRK-001, WRK-1, etc.
    const match = trimmed.match(/^WRK[-_\s]?(\d+)$/i);
    if (match) {
      const numStr = match[1];
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        if (num > maxNum) maxNum = num;
        // If user already had 3-digit codes in system, preserve 3-digit format
        if (numStr.length >= 3) {
          useThreeDigits = true;
        }
      }
    } else {
      const digitsMatch = trimmed.match(/(\d+)$/);
      if (digitsMatch) {
        const num = parseInt(digitsMatch[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padLength = useThreeDigits ? Math.max(3, String(nextNum).length) : Math.max(2, String(nextNum).length);
  return `WRK-${String(nextNum).padStart(padLength, '0')}`;
}

export const getNextWorkerCode = async (req: Request, res: Response) => {
  try {
    // Global sequence across entire enterprise / all projects
    const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
    const nextWorkerCode = computeGlobalNextWorkerCode(allWorkers);
    return res.json({ success: true, nextWorkerCode });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createWorker = async (req: Request, res: Response) => {
  try {
    let {
      workerCode,
      name,
      phone,
      trade,
      skillLevel,
      dailyWageRate,
      overtimeHourlyRate,
      paymentMethod,
      bankAccountNo,
      bankIfsc,
      emergencyPhone,
      projectId,
      photoUrl,
      documentUrl,
      documentName,
    } = req.body;

    if (!name || !trade) {
      return res.status(400).json({ success: false, message: 'Worker name and trade are required.' });
    }

    // Process uploaded files if multipart
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files['photo'] && files['photo'][0]) {
        photoUrl = `/uploads/${files['photo'][0].filename}`;
      }
      if (files['document'] && files['document'][0]) {
        documentUrl = `/uploads/${files['document'][0].filename}`;
        if (!documentName) {
          documentName = files['document'][0].originalname;
        }
      }
    }

    // Auto-generate global worker code across all projects if not supplied or empty
    let finalCode = workerCode ? String(workerCode).trim() : '';
    if (!finalCode) {
      const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
      finalCode = computeGlobalNextWorkerCode(allWorkers);
    } else {
      // Check if code already exists for this tenant
      const tenantFilter = getTenantFilter(req);
      const existing = await prisma.worker.findFirst({
        where: { workerCode: finalCode, ...tenantFilter },
      });
      if (existing) {
        // Find next available global code to suggest
        const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
        const suggestedCode = computeGlobalNextWorkerCode(allWorkers);
        return res.status(400).json({
          success: false,
          message: `Worker code ${finalCode} is already assigned to ${existing.name}. Next sequential code is ${suggestedCode}.`,
          suggestedCode,
        });
      }
    }

    const worker = await prisma.worker.create({
      data: {
        workerCode: finalCode,
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        trade,
        skillLevel: skillLevel || 'SKILLED',
        dailyWageRate: Number(dailyWageRate) || 600,
        overtimeHourlyRate: Number(overtimeHourlyRate) || 100,
        paymentMethod: paymentMethod || 'CASH',
        bankAccountNo: bankAccountNo ? String(bankAccountNo).trim() : null,
        bankIfsc: bankIfsc ? String(bankIfsc).trim() : null,
        projectId: projectId || null,
        photoUrl: photoUrl || null,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
      },
    });

    // Also register initial project assignment if created within a project
    if (projectId) {
      try {
        await prisma.projectWorker.upsert({
          where: {
            projectId_workerId: {
              projectId,
              workerId: worker.id,
            },
          },
          create: {
            projectId,
            workerId: worker.id,
          },
          update: {},
        });
      } catch (err) {
        console.warn('Could not auto-create project worker relation:', err);
      }
    }

    await logAudit(req.user?.id, 'CREATE_WORKER', 'WORKER', worker.id, { workerCode: finalCode, name }, req.ip);

    return res.status(201).json({ success: true, worker });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Worker code or worker already exists.',
      });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to create worker.' });
  }
};

export const getWorkerById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        attendances: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        wagePayments: {
          take: 20,
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    return res.json({ success: true, worker });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWorker = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    let {
      workerCode,
      name,
      phone,
      trade,
      skillLevel,
      dailyWageRate,
      overtimeHourlyRate,
      paymentMethod,
      bankAccountNo,
      bankIfsc,
      projectId,
      photoUrl,
      documentUrl,
      documentName,
    } = req.body;

    const existing = await prisma.worker.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Process files if uploaded
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files['photo'] && files['photo'][0]) {
        photoUrl = `/uploads/${files['photo'][0].filename}`;
      }
      if (files['document'] && files['document'][0]) {
        documentUrl = `/uploads/${files['document'][0].filename}`;
        if (!documentName) {
          documentName = files['document'][0].originalname;
        }
      }
    }

    // Worker Code is immutable once assigned. Disallow changing worker code.
    if (workerCode && String(workerCode).trim() !== existing.workerCode) {
      return res.status(400).json({
        success: false,
        message: 'Worker Code cannot be changed once assigned.',
      });
    }

    const updated = await prisma.worker.update({
      where: { id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        ...(trade ? { trade } : {}),
        ...(skillLevel ? { skillLevel } : {}),
        ...(dailyWageRate !== undefined ? { dailyWageRate: Number(dailyWageRate) } : {}),
        ...(overtimeHourlyRate !== undefined ? { overtimeHourlyRate: Number(overtimeHourlyRate) } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(bankAccountNo !== undefined ? { bankAccountNo: bankAccountNo ? String(bankAccountNo).trim() : null } : {}),
        ...(bankIfsc !== undefined ? { bankIfsc: bankIfsc ? String(bankIfsc).trim() : null } : {}),
        ...(projectId !== undefined ? { projectId: projectId || null } : {}),
        ...(photoUrl ? { photoUrl } : {}),
        ...(documentUrl ? { documentUrl } : {}),
        ...(documentName ? { documentName } : {}),
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        projectAssignments: {
          include: {
            project: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    await logAudit(req.user?.id, 'UPDATE_WORKER', 'WORKER', id, { workerCode: updated.workerCode, name: updated.name }, req.ip);

    return res.json({ success: true, worker: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update worker.' });
  }
};

export const deleteWorker = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.worker.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    try {
      await prisma.worker.delete({ where: { id } });
    } catch (delErr) {
      // If foreign key constraint prevents physical delete, soft delete
      await prisma.worker.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await logAudit(req.user?.id, 'DELETE_WORKER', 'WORKER', id, { workerCode: existing.workerCode, name: existing.name }, req.ip);

    return res.json({ success: true, message: `Worker ${existing.name} (${existing.workerCode}) deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete worker.' });
  }
};

export const normalizeAttendanceDate = (inputDate: string | Date): Date => {
  const dateStr = typeof inputDate === 'string' ? inputDate.split('T')[0] : new Date(inputDate).toISOString().split('T')[0];
  const [yr, mo, da] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(yr, mo - 1, da, 0, 0, 0, 0));
};

export const isFutureDate = (inputDate: string | Date): boolean => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dateStr = typeof inputDate === 'string' ? inputDate.split('T')[0] : new Date(inputDate).toISOString().split('T')[0];
  return dateStr > todayStr;
};

export const getDailyAttendance = async (req: Request, res: Response) => {
  try {
    const { date, projectId, siteId } = req.query;

    if (!date || !projectId) {
      return res.status(400).json({ success: false, message: 'Date and project ID are required.' });
    }

    const startOfDay = normalizeAttendanceDate(date as string);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

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

    // Future-date validation: PRESENT or HALF_DAY cannot be marked in advance
    if (isFutureDate(date)) {
      const invalid = records.find(
        (r) => r.attendanceStatus === 'PRESENT' || r.attendanceStatus === 'HALF_DAY'
      );
      if (invalid) {
        return res.status(400).json({
          success: false,
          message: 'Future-date attendance cannot be marked as Present or Half-Day. Only planned Absence, Leave, or Holiday can be pre-recorded.',
        });
      }
    }

    const attendanceDate = normalizeAttendanceDate(date);
    const windowStart = attendanceDate;
    const windowEnd = new Date(attendanceDate.getTime() + 24 * 3600 * 1000);

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

        // Check for existing record within this day window
        const existingForDay = await tx.labourAttendance.findFirst({
          where: {
            workerId: rec.workerId,
            projectId,
            date: {
              gte: windowStart,
              lt: windowEnd,
            },
          },
        });

        let att;
        if (existingForDay) {
          att = await tx.labourAttendance.update({
            where: { id: existingForDay.id },
            data: {
              date: attendanceDate,
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
          });
        } else {
          att = await tx.labourAttendance.create({
            data: {
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
        }

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
    const { projectId, startDate, endDate, workerId } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (workerId && typeof workerId === 'string') where.workerId = workerId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        const eDate = new Date(endDate as string);
        eDate.setHours(23, 59, 59, 999);
        where.date.lte = eDate;
      }
    }

    // Fetch all active workers for project so workers with 0 attendance in this period also appear
    const workersWhere: any = { isActive: true };
    if (projectId && typeof projectId === 'string') workersWhere.projectId = projectId;
    if (workerId && typeof workerId === 'string') workersWhere.id = workerId;

    const allProjectWorkers = await prisma.worker.findMany({
      where: workersWhere,
      include: { project: { select: { code: true, name: true } } },
      orderBy: { workerCode: 'asc' },
    });

    const attendances = await prisma.labourAttendance.findMany({
      where,
      include: {
        worker: true,
        project: { select: { code: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Wage payments in this period
    let wagePayments: any[] = [];
    try {
      const wpWhere: any = {};
      if (projectId && typeof projectId === 'string') wpWhere.projectId = projectId;
      if (startDate || endDate) {
        wpWhere.paymentDate = {};
        if (startDate) wpWhere.paymentDate.gte = new Date(startDate as string);
        if (endDate) {
          const eDate = new Date(endDate as string);
          eDate.setHours(23, 59, 59, 999);
          wpWhere.paymentDate.lte = eDate;
        }
      }
      wagePayments = await (prisma as any).wagePayment.findMany({
        where: wpWhere,
        include: {
          worker: { select: { id: true, workerCode: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
      });
    } catch (e) {
      console.warn('Could not fetch wage payments:', e);
    }

    // Initialize map with all project workers
    const workerSummary: Record<string, any> = {};
    for (const w of allProjectWorkers) {
      workerSummary[w.id] = {
        worker: w,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        daysWorked: 0,
        totalRegularHours: 0,
        totalOtHours: 0,
        totalRegularWage: 0,
        totalOtWage: 0,
        grossWageEarned: 0,
        wagesGiven: 0,
        balanceDue: 0,
        paymentsList: [],
        attendancesList: [],
      };
    }

    for (const a of attendances) {
      const wId = a.workerId;
      if (!workerSummary[wId]) {
        workerSummary[wId] = {
          worker: a.worker,
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          leaveDays: 0,
          daysWorked: 0,
          totalRegularHours: 0,
          totalOtHours: 0,
          totalRegularWage: 0,
          totalOtWage: 0,
          grossWageEarned: 0,
          wagesGiven: 0,
          balanceDue: 0,
          paymentsList: [],
          attendancesList: [],
        };
      }

      if (a.attendanceStatus === 'PRESENT') {
        workerSummary[wId].presentDays += 1;
        workerSummary[wId].daysWorked += 1;
      } else if (a.attendanceStatus === 'HALF_DAY') {
        workerSummary[wId].halfDays += 1;
        workerSummary[wId].daysWorked += 0.5;
      } else if (a.attendanceStatus === 'ABSENT') {
        workerSummary[wId].absentDays += 1;
      } else if (a.attendanceStatus === 'LEAVE') {
        workerSummary[wId].leaveDays += 1;
      }

      workerSummary[wId].totalRegularHours += a.regularHours || 0;
      workerSummary[wId].totalOtHours += a.overtimeHours || 0;
      workerSummary[wId].totalRegularWage += a.wageCalculated || 0;
      workerSummary[wId].totalOtWage += a.overtimeWage || 0;
      workerSummary[wId].grossWageEarned += a.totalWageEarned || 0;
      workerSummary[wId].attendancesList.push({
        id: a.id,
        date: a.date,
        attendanceStatus: a.attendanceStatus,
        regularHours: a.regularHours,
        overtimeHours: a.overtimeHours,
        wageCalculated: a.wageCalculated,
        overtimeWage: a.overtimeWage,
        totalWageEarned: a.totalWageEarned,
        workActivity: a.workActivity,
        supervisorName: a.supervisorName,
      });
    }

    // Separate individual worker payments and bulk payments
    const individualPayments = wagePayments.filter((wp) => wp.workerId);
    const bulkPayments = wagePayments.filter((wp) => !wp.workerId);

    // 1. Distribute individual wage payments
    for (const wp of individualPayments) {
      if (workerSummary[wp.workerId]) {
        workerSummary[wp.workerId].wagesGiven += wp.amount;
        workerSummary[wp.workerId].paymentsList.push(wp);
      }
    }

    // 2. Distribute bulk wage payments across active project workers who earned wages
    for (const bp of bulkPayments) {
      let remainingToAllocate = bp.amount;

      // Identify workers who have earned wages and still have remaining unpaid balance
      const workersWithDue = Object.values(workerSummary).filter(
        (w: any) => w.grossWageEarned > w.wagesGiven
      );

      const totalRemainingDue = workersWithDue.reduce(
        (sum: number, w: any) => sum + (w.grossWageEarned - w.wagesGiven),
        0
      );

      if (totalRemainingDue > 0 && remainingToAllocate > 0) {
        for (const w of workersWithDue) {
          const currentDue = (w as any).grossWageEarned - (w as any).wagesGiven;
          let alloc = 0;
          if (remainingToAllocate >= totalRemainingDue) {
            alloc = currentDue;
          } else {
            alloc = Math.min(Math.round((currentDue / totalRemainingDue) * bp.amount), remainingToAllocate);
          }

          if (alloc > 0) {
            (w as any).wagesGiven += alloc;
            remainingToAllocate -= alloc;
            (w as any).paymentsList.push({
              ...bp,
              amount: alloc,
              isBulkAllocation: true,
              narration: `${bp.narration || 'Bulk Payout'} [Portion Allocated: ₹${alloc}]`,
            });
          }
        }
      }

      // If any bulk amount still remains, allocate across workers with positive attendance/earnings
      if (remainingToAllocate > 0) {
        const workers = Object.values(workerSummary);
        if (workers.length > 0) {
          const split = Math.round(remainingToAllocate / workers.length);
          for (const w of workers) {
            const alloc = Math.min(split, remainingToAllocate);
            (w as any).wagesGiven += alloc;
            remainingToAllocate -= alloc;
            (w as any).paymentsList.push({
              ...bp,
              amount: alloc,
              isBulkAllocation: true,
              narration: `${bp.narration || 'Bulk Payout'} [Excess/Advance: ₹${alloc}]`,
            });
            if (remainingToAllocate <= 0) break;
          }
        }
      }
    }

    // Calculate balance due for each worker
    for (const wId of Object.keys(workerSummary)) {
      workerSummary[wId].balanceDue = Math.max(0, workerSummary[wId].grossWageEarned - workerSummary[wId].wagesGiven);
    }

    let records = Object.values(workerSummary);
    if (workerId && typeof workerId === 'string') {
      records = records.filter((r: any) => r.worker?.id === workerId);
    }

    const totalGross = records.reduce((sum, w: any) => sum + w.grossWageEarned, 0);
    const totalGiven = records.reduce((sum, w: any) => sum + w.wagesGiven, 0);
    const totalDaysWorked = records.reduce((sum, w: any) => sum + w.daysWorked, 0);
    const totalAbsentDays = records.reduce((sum, w: any) => sum + w.absentDays, 0);

    return res.json({
      success: true,
      records,
      wagePayments,
      totalLabourCost: totalGross,
      totalWagesGiven: totalGiven,
      totalDaysWorked,
      totalAbsentDays,
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

/**
 * Record and post a labour wage disbursement (daily or bulk) directly into Accounts General Ledger.
 * Debits Direct Labour Wages (COA 5020) and credits Cash (1010), Petty Cash (1020), or Bank (1030).
 */
export const recordWagePayment = async (req: Request, res: Response) => {
  try {
    const { projectId, workerId, amount, paymentMethod, paymentAccountCode, paymentDate, narration, wagePeriod } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project is required.' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payout amount greater than 0.' });
    }

    const creditAccountCode = paymentAccountCode || (paymentMethod === 'BANK_TRANSFER' ? COA.HDFC_BANK : COA.CASH);
    const debitAccountCode = COA.DIRECT_LABOUR_COST; // 5020 Direct Labour Wages

    let workerName = 'All Project Workers (Bulk Payout)';
    if (workerId) {
      const w = await prisma.worker.findUnique({ where: { id: workerId } });
      if (w) workerName = `${w.name} (${w.workerCode})`;
    }

    const prj = await prisma.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
    const prjLabel = prj ? `[${prj.code}]` : '';

    const finalNarration =
      narration?.trim() ||
      `Labour wages payout for ${workerName} ${prjLabel} via ${paymentMethod || 'CASH'}${
        wagePeriod ? ` for ${wagePeriod}` : ''
      }`;

    const journal = await postBalancedJournalEntry({
      entryDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceType: 'WAGE_PAYMENT',
      referenceId: workerId || projectId,
      narration: finalNarration,
      lines: [
        { accountCode: debitAccountCode, debit: payAmount, credit: 0, projectId },
        { accountCode: creditAccountCode, debit: 0, credit: payAmount, projectId },
      ],
      createdById: req.user?.id,
    });

    // Also persist to WagePayment model
    try {
      await (prisma as any).wagePayment.create({
        data: {
          projectId,
          workerId: workerId || null,
          amount: payAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || 'CASH',
          referenceNo: journal.entryNumber,
          wagePeriod: wagePeriod || null,
          narration: finalNarration,
        },
      });
    } catch (wpErr) {
      console.warn('Could not save wagePayment row:', wpErr);
    }

    await logAudit(
      req.user?.id,
      'DISBURSE_WAGES',
      'WAGE_PAYMENT',
      journal.id,
      { amount: payAmount, workerName, projectId, entryNumber: journal.entryNumber },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: `₹${payAmount.toLocaleString('en-IN')} wage disbursement successfully posted to General Ledger (${journal.entryNumber}).`,
      journal,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { attendanceStatus, regularHours, overtimeHours, workActivity } = req.body;

    const existing = await prisma.labourAttendance.findUnique({
      where: { id },
      include: { worker: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const worker = existing.worker;
    const status = attendanceStatus || existing.attendanceStatus;

    if (isFutureDate(existing.date) && (status === 'PRESENT' || status === 'HALF_DAY')) {
      return res.status(400).json({
        success: false,
        message: 'Future-date attendance cannot be marked as Present or Half-Day. Only planned Leave or Holiday is permitted for future dates.',
      });
    }

    const otHours = overtimeHours !== undefined ? Number(overtimeHours) : existing.overtimeHours;

    let regularWage = 0;
    let otWage = otHours * (worker ? worker.overtimeHourlyRate : 100);

    if (status === 'PRESENT') {
      regularWage = worker ? worker.dailyWageRate : 600;
    } else if (status === 'HALF_DAY') {
      regularWage = worker ? worker.dailyWageRate / 2 : 300;
    } else {
      otWage = 0;
    }

    const totalWageEarned = regularWage + otWage;

    const updated = await prisma.labourAttendance.update({
      where: { id },
      data: {
        attendanceStatus: status,
        regularHours: regularHours !== undefined ? Number(regularHours) : (status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0),
        overtimeHours: otHours,
        workActivity: workActivity !== undefined ? workActivity : existing.workActivity,
        wageCalculated: regularWage,
        overtimeWage: otWage,
        totalWageEarned,
      },
      include: { worker: true },
    });

    await logAudit(req.user?.id, 'UPDATE_ATTENDANCE', 'LABOUR_ATTENDANCE', id, { status, totalWageEarned }, req.ip);

    return res.json({ success: true, attendance: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.labourAttendance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    await prisma.labourAttendance.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_ATTENDANCE', 'LABOUR_ATTENDANCE', id, {}, req.ip);

    return res.json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWagePayment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const wp = await (prisma as any).wagePayment.findUnique({ where: { id } });
    if (!wp) {
      return res.status(404).json({ success: false, message: 'Wage payment not found.' });
    }

    if (wp.referenceNo) {
      await prisma.journalEntry.deleteMany({
        where: { entryNumber: wp.referenceNo },
      });
    }

    await (prisma as any).wagePayment.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_WAGE_PAYMENT', 'WAGE_PAYMENT', id, { amount: wp.amount }, req.ip);

    return res.json({ success: true, message: 'Wage payout entry deleted and journal reversed.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignWorkerToProject = async (req: Request, res: Response) => {
  try {
    const { projectId, workerId, workerIds } = req.body;
    const targetProjectId = projectId || (req.params as any).projectId;

    if (!targetProjectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    const targetProject = await prisma.project.findUnique({ where: { id: targetProjectId } });
    if (!targetProject) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const idsToAssign: string[] = [];
    if (Array.isArray(workerIds)) {
      idsToAssign.push(...workerIds);
    } else if (workerId) {
      idsToAssign.push(workerId);
    }

    if (idsToAssign.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one worker to assign.' });
    }

    const assigned: any[] = [];
    for (const wId of idsToAssign) {
      const worker = await prisma.worker.findUnique({ where: { id: wId } });
      if (!worker) continue;

      await prisma.projectWorker.upsert({
        where: {
          projectId_workerId: {
            projectId: targetProjectId,
            workerId: wId,
          },
        },
        create: {
          projectId: targetProjectId,
          workerId: wId,
        },
        update: {},
      });

      // If worker doesn't have a primary project, set this as primary
      if (!worker.projectId) {
        await prisma.worker.update({
          where: { id: wId },
          data: { projectId: targetProjectId },
        });
      }

      assigned.push({ workerId: wId, name: worker.name, workerCode: worker.workerCode });
    }

    await logAudit(
      req.user?.id,
      'ASSIGN_WORKERS_TO_PROJECT',
      'PROJECT',
      targetProjectId,
      { project: targetProject.name, count: assigned.length, workers: assigned },
      req.ip
    );

    return res.json({
      success: true,
      message: `Successfully added ${assigned.length} worker(s) to "${targetProject.name}".`,
      assigned,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to assign worker(s).' });
  }
};

export const unassignWorkerFromProject = async (req: Request, res: Response) => {
  try {
    const { projectId, workerId } = req.body;
    const targetProjectId = projectId || (req.params as any).projectId;
    const targetWorkerId = workerId || (req.params as any).workerId;

    if (!targetProjectId || !targetWorkerId) {
      return res.status(400).json({ success: false, message: 'Project ID and Worker ID are required.' });
    }

    await prisma.projectWorker.deleteMany({
      where: {
        projectId: targetProjectId,
        workerId: targetWorkerId,
      },
    });

    return res.json({ success: true, message: 'Worker unassigned from project workforce.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to unassign worker.' });
  }
};



