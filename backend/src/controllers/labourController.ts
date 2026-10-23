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

export const getNextWorkerCode = async (req: Request, res: Response) => {
  try {
    const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
    let maxNum = 0;
    for (const w of allWorkers) {
      if (w.workerCode && w.workerCode.startsWith('WRK-')) {
        const num = parseInt(w.workerCode.replace('WRK-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const nextWorkerCode = `WRK-${String(maxNum + 1).padStart(3, '0')}`;
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

    // Auto-generate worker code if not supplied or empty
    let finalCode = workerCode ? String(workerCode).trim() : '';
    if (!finalCode) {
      const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
      let maxNum = 0;
      for (const w of allWorkers) {
        if (w.workerCode && w.workerCode.startsWith('WRK-')) {
          const num = parseInt(w.workerCode.replace('WRK-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      finalCode = `WRK-${String(maxNum + 1).padStart(3, '0')}`;
    } else {
      // Check if code already exists
      const existing = await prisma.worker.findUnique({
        where: { workerCode: finalCode },
      });
      if (existing) {
        // Find next available code to suggest in the message
        const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
        let maxNum = 0;
        for (const w of allWorkers) {
          if (w.workerCode && w.workerCode.startsWith('WRK-')) {
            const num = parseInt(w.workerCode.replace('WRK-', ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
        const suggestedCode = `WRK-${String(maxNum + 1).padStart(3, '0')}`;
        return res.status(400).json({
          success: false,
          message: `Worker Code "${finalCode}" is already in use by "${existing.name}". Please enter a unique code (suggested: ${suggestedCode}).`,
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

    await logAudit(req.user?.id, 'CREATE_WORKER', 'WORKER', worker.id, { workerCode: finalCode, name }, req.ip);

    return res.status(201).json({ success: true, worker });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'A worker with this code already exists. Please choose a different worker code.',
      });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to create worker.' });
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
      if (workerId && typeof workerId === 'string') wpWhere.workerId = workerId;
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

    // Distribute wage payments
    for (const wp of wagePayments) {
      if (wp.workerId && workerSummary[wp.workerId]) {
        workerSummary[wp.workerId].wagesGiven += wp.amount;
        workerSummary[wp.workerId].paymentsList.push(wp);
      }
    }

    // Calculate balance due for each worker
    for (const wId of Object.keys(workerSummary)) {
      workerSummary[wId].balanceDue = workerSummary[wId].grossWageEarned - workerSummary[wId].wagesGiven;
    }

    const records = Object.values(workerSummary);
    const totalGross = records.reduce((sum, w: any) => sum + w.grossWageEarned, 0);
    const totalGiven = wagePayments.reduce((sum, wp: any) => sum + wp.amount, 0);
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

