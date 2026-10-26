import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { normalizeAttendanceDate, isFutureDate } from './labourController';

/**
 * Normalizes date to Midnight UTC
 */
const parseDateOnly = (dateStr?: string): Date => {
  if (!dateStr) {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  }
  return normalizeAttendanceDate(dateStr);
};

/**
 * Format today's time e.g. "09:30 AM"
 */
const getDefaultCheckInTime = (): string => {
  const d = new Date();
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * GET /api/attendance/daily
 * Simple daily attendance table listing all staff/workers with attendance status, check-in time, and notes
 */
export const getDailyAttendanceRoster = async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string | undefined;
    const targetDate = parseDateOnly(dateParam);
    const windowStart = targetDate;
    const windowEnd = new Date(targetDate.getTime() + 24 * 3600 * 1000);

    const [staffList, staffAtts] = await Promise.all([
      prisma.officeStaff.findMany({
        where: { isActive: true },
        orderBy: [{ roleCategory: 'asc' }, { name: 'asc' }],
      }),
      prisma.staffAttendance.findMany({
        where: {
          date: { gte: windowStart, lt: windowEnd },
        },
      }),
    ]);

    const attMap = new Map<string, any>();
    for (const att of staffAtts) {
      attMap.set(att.staffId, att);
    }

    const roster = staffList.map((stf) => {
      const att = attMap.get(stf.id);
      return {
        staffId: stf.id,
        staffCode: stf.staffCode,
        name: stf.name,
        roleCategory: stf.roleCategory,
        designation: stf.designation,
        phone: stf.phone,
        status: att?.attendanceStatus || 'PRESENT', // default to PRESENT for fast verification
        hasLogged: !!att,
        checkInTime: att?.checkInTime || (att ? null : '09:00 AM'),
        notes: att?.notes || '',
        regularHours: att?.regularHours ?? 8,
        overtimeHours: att?.overtimeHours ?? 0,
        attendanceId: att?.id || null,
      };
    });

    const loggedCount = roster.filter((r) => r.hasLogged).length;
    const dateFormatted = targetDate.toISOString().split('T')[0];

    return sendSuccess(res, {
      message: `Daily attendance roster for ${dateFormatted} retrieved (${roster.length} staff, ${loggedCount} logged).`,
      entity: 'Attendance',
      whatsappStatus: 'Skipped',
      data: {
        date: dateFormatted,
        totalStaff: roster.length,
        loggedCount,
        roster,
      },
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to retrieve daily attendance roster',
      entity: 'Attendance',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

/**
 * POST /api/attendance/bulk
 * Quick-bulk action capability for saving attendance table (Present/Absent/Half-Day/On-Site, Check-In Time, Notes)
 */
export const saveBulkAttendance = async (req: Request, res: Response) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records) || records.length === 0) {
      return sendError(res, {
        message: 'A valid date and array of staff attendance records are required.',
        entity: 'Attendance',
        errors: ['Missing required fields: date, records array'],
        statusCode: 400,
      });
    }

    if (isFutureDate(date)) {
      const invalidFuture = records.some(
        (r) => r.status === 'PRESENT' || r.status === 'HALF_DAY' || r.status === 'ON_SITE'
      );
      if (invalidFuture) {
        return sendError(res, {
          message: 'Future-date attendance cannot be marked as Present, Half-Day, or On-Site.',
          entity: 'Attendance',
          errors: ['Cannot log Present/On-Site for future calendar dates.'],
          statusCode: 400,
        });
      }
    }

    const attendanceDate = parseDateOnly(date);
    const windowStart = attendanceDate;
    const windowEnd = new Date(attendanceDate.getTime() + 24 * 3600 * 1000);

    const savedRecords: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
        if (!rec.staffId) continue;

        const status = (rec.status || 'PRESENT').toUpperCase();
        const checkIn = rec.checkInTime ? String(rec.checkInTime).trim() : null;
        const notes = rec.notes ? String(rec.notes).trim() : null;
        const regHours = status === 'PRESENT' || status === 'ON_SITE' ? 8 : status === 'HALF_DAY' ? 4 : 0;
        const otHours = Number(rec.overtimeHours) || 0;

        const existing = await tx.staffAttendance.findFirst({
          where: {
            staffId: rec.staffId,
            date: { gte: windowStart, lt: windowEnd },
          },
        });

        if (existing) {
          const updated = await tx.staffAttendance.update({
            where: { id: existing.id },
            data: {
              attendanceStatus: status,
              checkInTime: checkIn,
              notes,
              regularHours: regHours,
              overtimeHours: otHours,
              updatedAt: new Date(),
            },
          });
          savedRecords.push(updated);
        } else {
          const created = await tx.staffAttendance.create({
            data: {
              staffId: rec.staffId,
              date: attendanceDate,
              attendanceStatus: status,
              checkInTime: checkIn,
              notes,
              regularHours: regHours,
              overtimeHours: otHours,
            },
          });
          savedRecords.push(created);
        }
      }
    });

    // Record central ActivityLog
    const dateFormatted = attendanceDate.toISOString().split('T')[0];
    const logMessage = `Daily shift attendance logged for ${savedRecords.length} staff members on ${dateFormatted}.`;

    try {
      await prisma.activityLog.create({
        data: {
          tenantId: req.user?.companyId || null,
          userId: req.user?.id || null,
          userName: req.user?.name || 'Staff Supervisor',
          entityType: 'Attendance',
          entityId: `ATT-${dateFormatted}`,
          entityTitle: `Muster Roll - ${dateFormatted}`,
          action: 'BULK_ATTENDANCE',
          fromStatus: null,
          toStatus: 'LOGGED',
          message: logMessage,
          metadata: JSON.stringify({
            count: savedRecords.length,
            date: dateFormatted,
          }),
        },
      });
    } catch (e) {}

    return sendSuccess(res, {
      message: `Daily attendance saved successfully for ${savedRecords.length} staff on ${dateFormatted}.`,
      entity: 'Attendance',
      whatsappStatus: 'Skipped',
      data: {
        count: savedRecords.length,
        date: dateFormatted,
        records: savedRecords,
      },
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to save bulk attendance',
      entity: 'Attendance',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

/**
 * POST /api/attendance/mark-all-present
 * Quick 1-click bulk action to mark all active staff members as Present on a given date
 */
export const markAllPresent = async (req: Request, res: Response) => {
  try {
    const { date, checkInTime, notes } = req.body;
    const targetDate = parseDateOnly(date);

    if (isFutureDate(date)) {
      return sendError(res, {
        message: 'Cannot mark all staff as Present for a future date.',
        entity: 'Attendance',
        errors: ['Future date attendance forbidden for Present status'],
        statusCode: 400,
      });
    }

    const defaultCheckIn = checkInTime || '09:00 AM';
    const allStaff = await prisma.officeStaff.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const windowStart = targetDate;
    const windowEnd = new Date(targetDate.getTime() + 24 * 3600 * 1000);

    const saved = await prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const s of allStaff) {
        const existing = await tx.staffAttendance.findFirst({
          where: {
            staffId: s.id,
            date: { gte: windowStart, lt: windowEnd },
          },
        });

        if (existing) {
          const up = await tx.staffAttendance.update({
            where: { id: existing.id },
            data: {
              attendanceStatus: 'PRESENT',
              checkInTime: defaultCheckIn,
              notes: notes || existing.notes || 'Bulk verified present',
              regularHours: 8,
              updatedAt: new Date(),
            },
          });
          results.push(up);
        } else {
          const cr = await tx.staffAttendance.create({
            data: {
              staffId: s.id,
              date: targetDate,
              attendanceStatus: 'PRESENT',
              checkInTime: defaultCheckIn,
              notes: notes || 'Bulk verified present',
              regularHours: 8,
            },
          });
          results.push(cr);
        }
      }
      return results;
    });

    const dateFormatted = targetDate.toISOString().split('T')[0];

    // Record ActivityLog
    try {
      await prisma.activityLog.create({
        data: {
          tenantId: req.user?.companyId || null,
          userId: req.user?.id || null,
          userName: req.user?.name || 'Staff Supervisor',
          entityType: 'Attendance',
          entityId: `ATT-${dateFormatted}`,
          entityTitle: `Muster Roll - ${dateFormatted}`,
          action: 'BULK_ATTENDANCE',
          toStatus: 'PRESENT',
          message: `All ${saved.length} active staff members marked as Present on ${dateFormatted}.`,
        },
      });
    } catch (e) {}

    return sendSuccess(res, {
      message: `All ${saved.length} staff members marked as Present for ${dateFormatted} successfully.`,
      entity: 'Attendance',
      whatsappStatus: 'Skipped',
      data: {
        date: dateFormatted,
        count: saved.length,
      },
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to mark all staff as present',
      entity: 'Attendance',
      errors: [error.message],
      statusCode: 500,
    });
  }
};
