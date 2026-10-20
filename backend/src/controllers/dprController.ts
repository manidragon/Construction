import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getDailyReports = async (req: Request, res: Response) => {
  try {
    const { projectId, siteId, date, status } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (siteId && typeof siteId === 'string') where.siteId = siteId;
    if (status && typeof status === 'string') where.status = status;
    if (date && typeof date === 'string') {
      const qDate = new Date(date);
      const start = new Date(qDate.getFullYear(), qDate.getMonth(), qDate.getDate());
      const end = new Date(qDate.getFullYear(), qDate.getMonth(), qDate.getDate() + 1);
      where.reportDate = { gte: start, lt: end };
    }

    const reports = await prisma.dailySiteReport.findMany({
      where,
      include: {
        project: { select: { code: true, name: true } },
        site: { select: { code: true, name: true } },
        preparedBy: { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
        labourEntries: true,
        materialEntries: true,
        equipmentEntries: true,
        photos: true,
      },
      orderBy: { reportDate: 'desc' },
    });

    return res.json({ success: true, reports });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailyReportById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const report = await prisma.dailySiteReport.findUnique({
      where: { id },
      include: {
        project: true,
        site: true,
        preparedBy: { select: { id: true, name: true, role: true, email: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        labourEntries: true,
        materialEntries: true,
        equipmentEntries: true,
        photos: true,
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'DPR not found' });
    }

    return res.json({ success: true, report });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDailyReport = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      siteId,
      reportDate,
      weather,
      temperature,
      workSummary,
      delaysReason,
      safetyIncidents,
      issuesNoted,
      labourEntries,
      materialEntries,
      equipmentEntries,
      photos,
    } = req.body;

    if (!projectId || !siteId || !reportDate) {
      return res.status(400).json({ success: false, message: 'Project, site, and report date are required.' });
    }

    const dpr = await prisma.dailySiteReport.create({
      data: {
        projectId,
        siteId,
        reportDate: new Date(reportDate),
        weather: weather || 'Sunny',
        temperature: temperature || '28°C',
        preparedById: req.user!.id,
        status: 'SUBMITTED',
        workSummary,
        delaysReason,
        safetyIncidents: safetyIncidents || 'No incidents reported. Safety guidelines followed.',
        issuesNoted,
        labourEntries: {
          create: (labourEntries || []).map((l: any) => ({
            trade: l.trade,
            headcount: Number(l.headcount) || 0,
            regularHours: Number(l.regularHours) || 8,
            overtimeHours: Number(l.overtimeHours) || 0,
            notes: l.notes,
          })),
        },
        materialEntries: {
          create: (materialEntries || []).map((m: any) => ({
            materialName: m.materialName,
            unit: m.unit,
            qtyReceived: Number(m.qtyReceived) || 0,
            qtyConsumed: Number(m.qtyConsumed) || 0,
            location: m.location,
            notes: m.notes,
          })),
        },
        equipmentEntries: {
          create: (equipmentEntries || []).map((e: any) => ({
            equipmentName: e.equipmentName,
            hoursOperated: Number(e.hoursOperated) || 0,
            fuelConsumed: Number(e.fuelConsumed) || 0,
            workDone: e.workDone,
          })),
        },
        photos: {
          create: (photos || []).map((p: any) => ({
            photoUrl: p.photoUrl,
            caption: p.caption,
          })),
        },
      },
      include: {
        labourEntries: true,
        materialEntries: true,
        equipmentEntries: true,
        photos: true,
      },
    });

    await logAudit(req.user?.id, 'CREATE_DPR', 'DAILY_SITE_REPORT', dpr.id, { date: reportDate, project: projectId }, req.ip);

    return res.status(201).json({ success: true, report: dpr });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const approveDailyReport = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const report = await prisma.dailySiteReport.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user?.id,
      },
    });

    await logAudit(req.user?.id, 'APPROVE_DPR', 'DAILY_SITE_REPORT', id, {}, req.ip);

    return res.json({ success: true, report });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
