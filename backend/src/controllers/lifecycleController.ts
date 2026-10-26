import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import whatsappService from '../services/whatsappService';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { logAudit } from '../middleware/auth';

/**
 * Valid Entity Status Schemas
 */
export const VALID_STATUS_MAP: Record<string, string[]> = {
  Lead: [
    'NEW_LEAD',
    'SITE_VISIT_SCHEDULED',
    'SITE_MEASUREMENT_COMPLETED',
    'DESIGN_CONCEPT_DISCUSSION',
    'BOQ_QUOTATION_SHARED',
    'NEGOTIATION',
    'LEAD_WON',
    'LEAD_LOST',
  ],
  Project: [
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED',
  ],
  Quotation: [
    'DRAFT',
    'SHARED',
    'ACCEPTED',
    'REJECTED',
    'CONVERTED',
  ],
  ClientInvoice: [
    'DRAFT',
    'SENT',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
  ],
  Invoice: [
    'DRAFT',
    'SENT',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
  ],
  Task: [
    'NOT_STARTED',
    'IN_PROGRESS',
    'PENDING_APPROVAL',
    'COMPLETED',
    'DELAYED',
    'ON_HOLD',
  ],
};

/**
 * Format status for human-friendly display
 */
const formatStatusLabel = (status: string): string => {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Reusable State-Machine Controller for Status Transitions across ALL Entities
 * POST /api/lifecycle/status or PATCH /api/lifecycle/status
 */
export const transitionStatus = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, toStatus, notes, metadata } = req.body;

    // 1. Validate required inputs
    if (!entityType || !entityId || !toStatus) {
      return sendError(res, {
        message: 'entityType, entityId, and toStatus are required for status transition.',
        entity: entityType || 'Unknown',
        errors: ['Missing required fields: entityType, entityId, toStatus'],
        statusCode: 400,
      });
    }

    const cleanEntityType = entityType.trim();
    const cleanToStatus = toStatus.trim().toUpperCase();
    const tenantId = req.user?.companyId || null;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Authorized Staff';

    // 2. Validate against schema state definitions
    const allowedStatuses = VALID_STATUS_MAP[cleanEntityType];
    if (!allowedStatuses) {
      return sendError(res, {
        message: `Entity type "${cleanEntityType}" is not supported for lifecycle transitions. Supported entities: ${Object.keys(VALID_STATUS_MAP).join(', ')}`,
        entity: cleanEntityType,
        errors: [`Unsupported entityType: ${cleanEntityType}`],
        statusCode: 400,
      });
    }

    if (!allowedStatuses.includes(cleanToStatus)) {
      return sendError(res, {
        message: `Invalid status "${cleanToStatus}" for ${cleanEntityType}. Allowed: ${allowedStatuses.join(', ')}`,
        entity: cleanEntityType,
        errors: [`Invalid status: ${cleanToStatus}`],
        statusCode: 400,
      });
    }

    let fromStatus: string | null = null;
    let entityTitle: string = cleanEntityType;
    let updatedEntity: any = null;
    let entityDataForNotification: any = null;

    // 3. Update database record according to entity schema
    switch (cleanEntityType) {
      case 'Lead': {
        const lead = await prisma.lead.findUnique({
          where: { id: entityId },
          include: { tenant: true },
        });
        if (!lead) {
          return sendError(res, {
            message: `Lead with ID "${entityId}" not found.`,
            entity: 'Lead',
            errors: ['Record not found'],
            statusCode: 404,
          });
        }
        fromStatus = lead.stage;
        entityTitle = `${lead.clientName} (${lead.leadNumber})`;

        const updatePayload: any = { stage: cleanToStatus, updatedAt: new Date() };
        if (cleanToStatus === 'LEAD_LOST' && notes) {
          updatePayload.lostReason = notes;
        }

        updatedEntity = await prisma.lead.update({
          where: { id: entityId },
          data: updatePayload,
          include: { assignedProjectManager: true },
        });
        entityDataForNotification = updatedEntity;
        break;
      }

      case 'Project': {
        const project = await prisma.project.findUnique({
          where: { id: entityId },
        });
        if (!project) {
          return sendError(res, {
            message: `Project with ID "${entityId}" not found.`,
            entity: 'Project',
            errors: ['Record not found'],
            statusCode: 404,
          });
        }
        fromStatus = project.status;
        entityTitle = `${project.name} (${project.code})`;

        const updatePayload: any = { status: cleanToStatus, updatedAt: new Date() };
        if (cleanToStatus === 'COMPLETED') {
          updatePayload.completionPercent = 100;
          updatePayload.actualEndDate = new Date();
        } else if (cleanToStatus === 'ACTIVE' && !project.actualStartDate) {
          updatePayload.actualStartDate = new Date();
        }

        updatedEntity = await prisma.project.update({
          where: { id: entityId },
          data: updatePayload,
        });
        entityDataForNotification = updatedEntity;
        break;
      }

      case 'Quotation': {
        const quot = await prisma.quotation.findUnique({
          where: { id: entityId },
        });
        if (!quot) {
          return sendError(res, {
            message: `Quotation with ID "${entityId}" not found.`,
            entity: 'Quotation',
            errors: ['Record not found'],
            statusCode: 404,
          });
        }
        fromStatus = quot.status;
        entityTitle = `${quot.quotationNumber} - ${quot.clientName}`;

        const updatePayload: any = { status: cleanToStatus, updatedAt: new Date() };
        if (cleanToStatus === 'SHARED' && !quot.sharedAt) {
          updatePayload.sharedAt = new Date();
          updatePayload.sharedVia = updatePayload.sharedVia || 'WHATSAPP';
        }

        updatedEntity = await prisma.quotation.update({
          where: { id: entityId },
          data: updatePayload,
        });
        entityDataForNotification = updatedEntity;
        break;
      }

      case 'ClientInvoice':
      case 'Invoice': {
        const invoice = await prisma.clientInvoice.findUnique({
          where: { id: entityId },
          include: { client: true, project: true },
        });
        if (!invoice) {
          return sendError(res, {
            message: `Invoice with ID "${entityId}" not found.`,
            entity: 'ClientInvoice',
            errors: ['Record not found'],
            statusCode: 404,
          });
        }
        fromStatus = invoice.status;
        entityTitle = `${invoice.invoiceNumber} - ${invoice.client?.name || 'Client'}`;

        updatedEntity = await prisma.clientInvoice.update({
          where: { id: entityId },
          data: { status: cleanToStatus, updatedAt: new Date() },
          include: { client: true, project: true },
        });
        entityDataForNotification = updatedEntity;
        break;
      }

      case 'Task': {
        const task = await prisma.task.findUnique({
          where: { id: entityId },
          include: { project: true, assignedUser: true },
        });
        if (!task) {
          return sendError(res, {
            message: `Task with ID "${entityId}" not found.`,
            entity: 'Task',
            errors: ['Record not found'],
            statusCode: 404,
          });
        }
        fromStatus = task.status;
        entityTitle = task.title;

        updatedEntity = await prisma.task.update({
          where: { id: entityId },
          data: { status: cleanToStatus, updatedAt: new Date() },
          include: { project: true, assignedUser: true },
        });

        // Recalculate project overall progress
        if (task.projectId) {
          const siblingTasks = await prisma.task.findMany({
            where: { projectId: task.projectId },
          });
          if (siblingTasks.length > 0) {
            const completedCount = siblingTasks.filter((t) => t.status === 'COMPLETED').length;
            const inProgressCount = siblingTasks.filter((t) => t.status === 'IN_PROGRESS').length;
            const percent = Math.min(
              100,
              Math.round(((completedCount * 100) + (inProgressCount * 50)) / siblingTasks.length)
            );
            await prisma.project.update({
              where: { id: task.projectId },
              data: {
                completionPercent: percent,
                status: percent === 100 ? 'COMPLETED' : undefined,
              },
            });
          }
        }
        entityDataForNotification = updatedEntity;
        break;
      }
    }

    // 4. Trigger the whatsappService event pipeline
    const whatsappResult = await whatsappService.triggerLifecycleNotification({
      tenantId,
      userId,
      entityType: cleanEntityType,
      entityId,
      entityTitle,
      fromStatus,
      toStatus: cleanToStatus,
      entityData: entityDataForNotification,
      notes,
    });

    // 5. Record an entry in the ActivityLog table
    const transitionMessage = `${entityTitle} status transitioned from ${fromStatus ? formatStatusLabel(fromStatus) : 'Initial'} to ${formatStatusLabel(cleanToStatus)}.`;
    const activity = await prisma.activityLog.create({
      data: {
        tenantId,
        userId,
        userName,
        entityType: cleanEntityType,
        entityId,
        entityTitle,
        action: 'STATUS_CHANGE',
        fromStatus,
        toStatus: cleanToStatus,
        message: transitionMessage,
        metadata: JSON.stringify({
          notes: notes || null,
          whatsappStatus: whatsappResult.whatsappStatus,
          customMetadata: metadata || null,
        }),
      },
    });

    // Also record general AuditLog
    await logAudit(
      userId,
      `STATUS_TRANSITION_${cleanToStatus}`,
      cleanEntityType.toUpperCase(),
      entityId,
      { fromStatus, toStatus: cleanToStatus, notes },
      req.ip
    );

    // 6. Return standardized UI toast response
    // "{Entity Name} status updated to {New Status} successfully."
    const standardToast = `${cleanEntityType} status updated to ${formatStatusLabel(cleanToStatus)} successfully.`;

    return sendSuccess(res, {
      message: standardToast,
      entity: cleanEntityType,
      whatsappStatus: whatsappResult.whatsappStatus,
      data: {
        entity: updatedEntity,
        activityLogId: activity.id,
        fromStatus,
        toStatus: cleanToStatus,
        toast: standardToast,
      },
    });
  } catch (error: any) {
    console.error('Lifecycle transition error:', error);
    return sendError(res, {
      message: 'Failed to complete status transition.',
      entity: req.body?.entityType || 'Lifecycle',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

/**
 * GET /api/lifecycle/activity-logs
 * Fetch activity logs for a specific entity or across the tenant
 */
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, limit } = req.query;
    const where: any = {};

    if (req.user?.companyId) {
      where.tenantId = req.user.companyId;
    }
    if (entityType && typeof entityType === 'string') {
      where.entityType = entityType;
    }
    if (entityId && typeof entityId === 'string') {
      where.entityId = entityId;
    }

    const take = limit ? Math.min(100, parseInt(String(limit), 10)) : 50;

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return sendSuccess(res, {
      message: `Retrieved ${logs.length} activity log entries`,
      entity: 'ActivityLog',
      whatsappStatus: 'Skipped',
      data: logs,
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to retrieve activity logs',
      entity: 'ActivityLog',
      errors: [error.message],
      statusCode: 500,
    });
  }
};
