import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/responseHelper';
import whatsappService from '../services/whatsappService';
import { moveToRecycleBin } from './recycleBinController';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { projectId, status, priority, siteId } = req.query;
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      project: { ...tenantFilter },
    };
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (siteId && typeof siteId === 'string') where.siteId = siteId;
    if (status && typeof status === 'string') where.status = status;
    if (priority && typeof priority === 'string') where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        site: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, role: true } },
        boqItem: {
          select: {
            id: true,
            itemCode: true,
            description: true,
            category: true,
            unit: true,
            estimatedQty: true,
            estimatedTotal: true,
            actualExpenditure: true,
          },
        },
        comments: {
          include: { user: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return res.json({ success: true, tasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      siteId,
      phaseId,
      boqItemId,
      title,
      description,
      assignedToId,
      startDate,
      dueDate,
      priority,
      plannedQty,
      unit,
      estimatedCost,
      materialSwatchUrl,
      designRenderUrl,
      clientSignOffDoc,
      clientApprovalStatus,
      isScopeVariation,
    } = req.body;

    if (!projectId || !title || !startDate || !dueDate) {
      return res.status(400).json({ success: false, message: 'Project, title, start date, and due date are required.' });
    }

    // MODULE 3: Lead Conversion & Project Kickoff Gate
    // Block creation of execution schedules or site task assignments until finance confirms advance payment
    const tenantFilter = getTenantFilter(req);
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...tenantFilter },
      select: { id: true, name: true, advancePaymentConfirmed: true, advancePaymentRequired: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or not accessible.' });
    }

    if (project.advancePaymentConfirmed === false) {
      return res.status(400).json({
        success: false,
        kickoffBlocked: true,
        message: `Execution kickoff blocked: Initial advance payment of ₹${project.advancePaymentRequired.toLocaleString('en-IN')} must be verified and confirmed by the Finance Department (Accounts / Owner) before scheduling tasks or site assignments for project "${project.name}".`,
      });
    }

    // If boqItemId is passed, verify and default plannedQty/cost if not explicitly provided
    let finalPlannedQty = Number(plannedQty) || 0;
    let finalEstimatedCost = Number(estimatedCost) || 0;
    let finalUnit = unit || 'NOS';

    if (boqItemId) {
      const boq = await prisma.bOQItem.findUnique({ where: { id: boqItemId } });
      if (boq) {
        if (!plannedQty) finalPlannedQty = boq.estimatedQty;
        if (!estimatedCost) finalEstimatedCost = boq.estimatedTotal;
        if (!unit) finalUnit = boq.unit;
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        siteId: siteId || null,
        phaseId: phaseId || null,
        boqItemId: boqItemId || null,
        title,
        description,
        assignedToId: assignedToId || null,
        startDate: new Date(startDate),
        dueDate: new Date(dueDate),
        priority: priority || 'MEDIUM',
        plannedQty: finalPlannedQty,
        unit: finalUnit,
        estimatedCost: finalEstimatedCost,
        status: 'NOT_STARTED',
        materialSwatchUrl: materialSwatchUrl || null,
        designRenderUrl: designRenderUrl || null,
        clientSignOffDoc: clientSignOffDoc || null,
        clientApprovalStatus: clientApprovalStatus || 'PENDING',
        isScopeVariation: Boolean(isScopeVariation),
      },
      include: {
        boqItem: true,
        assignedUser: { select: { id: true, name: true, role: true } },
      },
    });

    await logAudit(req.user?.id, 'CREATE_TASK', 'TASK', task.id, { title, priority, boqItemId }, req.ip);

    await syncProjectProgress(task.projectId);

    return res.status(201).json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const syncProjectProgress = async (projectId: string) => {
  try {
    const projectTasks = await prisma.task.findMany({
      where: { projectId },
    });
    if (projectTasks.length > 0) {
      const completedCount = projectTasks.filter((t) => t.status === 'COMPLETED').length;
      const inProgressCount = projectTasks.filter((t) => t.status === 'IN_PROGRESS').length;
      const calculatedPercent = Math.round(
        ((completedCount * 100) + (inProgressCount * 50)) / projectTasks.length
      );

      await prisma.project.update({
        where: { id: projectId },
        data: {
          completionPercent: calculatedPercent,
          status: calculatedPercent === 100 ? 'COMPLETED' : 'ACTIVE',
        },
      });
    }
  } catch (err) {
    console.error('Failed to sync project progress:', err);
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const existing = await prisma.task.findFirst({
      where: { id, project: { ...tenantFilter } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found or not accessible.' });
    }

    const {
      title,
      description,
      assignedToId,
      siteId,
      phaseId,
      boqItemId,
      startDate,
      dueDate,
      priority,
      plannedQty,
      completedQty,
      unit,
      estimatedCost,
      actualCost,
      status,
      materialSwatchUrl,
      designRenderUrl,
      clientSignOffDoc,
      clientApprovalStatus,
      isScopeVariation,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    if (siteId !== undefined) data.siteId = siteId || null;
    if (phaseId !== undefined) data.phaseId = phaseId || null;
    if (boqItemId !== undefined) data.boqItemId = boqItemId || null;
    if (startDate) data.startDate = new Date(startDate);
    if (dueDate) data.dueDate = new Date(dueDate);
    if (priority !== undefined) data.priority = priority;
    if (plannedQty !== undefined) data.plannedQty = Number(plannedQty);
    if (completedQty !== undefined) data.completedQty = Number(completedQty);
    if (unit !== undefined) data.unit = unit;
    if (estimatedCost !== undefined) data.estimatedCost = Number(estimatedCost);
    if (actualCost !== undefined) data.actualCost = Number(actualCost);
    if (status !== undefined) data.status = status;
    if (materialSwatchUrl !== undefined) data.materialSwatchUrl = materialSwatchUrl;
    if (designRenderUrl !== undefined) data.designRenderUrl = designRenderUrl;
    if (clientSignOffDoc !== undefined) data.clientSignOffDoc = clientSignOffDoc;
    if (clientApprovalStatus !== undefined) data.clientApprovalStatus = clientApprovalStatus;
    if (isScopeVariation !== undefined) data.isScopeVariation = Boolean(isScopeVariation);

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, code: true, name: true } },
        site: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, role: true } },
        boqItem: true,
      },
    });

    await syncProjectProgress(task.projectId);
    await logAudit(req.user?.id, 'UPDATE_TASK', 'TASK', id, { title: task.title, status: task.status }, req.ip);

    return res.json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenantFilter = getTenantFilter(req);
    const task = await prisma.task.findFirst({
      where: { id, project: { ...tenantFilter } },
      include: { project: true, boqItem: true },
    });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or not accessible.' });
    }

    // Archive to Recycle Bin before deleting
    await moveToRecycleBin({
      tenantId: (task as any).tenantId || (task.project as any)?.tenantId || null,
      entityType: 'Task',
      entityId: task.id,
      itemNumber: `TSK-${task.id.slice(0, 8).toUpperCase()}`,
      title: task.title,
      description: `Project: ${task.project?.name || 'General'} • Status: ${task.status} • Priority: ${task.priority}`,
      data: task,
      user: req.user,
    });

    await prisma.task.delete({ where: { id } });

    await syncProjectProgress(task.projectId);
    await logAudit(req.user?.id, 'DELETE_TASK', 'TASK', id, { title: task.title }, req.ip);

    return res.json({ success: true, message: `Task "${task.title}" moved to Recycle Bin. You can restore it anytime.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const task = await prisma.task.findFirst({
      where: { id, project: { ...tenantFilter } },
    });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or not accessible.' });
    }

    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    }

    const newComment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: req.user!.id,
        comment,
      },
      include: {
        user: { select: { name: true, role: true } },
      },
    });

    return res.status(201).json({ success: true, comment: newComment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Quick-Add Task Creation Engine
 * POST /api/tasks/quick-add
 * Title, Assigned Staff, Priority, Due Date, Status
 */
export const quickAddTask = async (req: Request, res: Response) => {
  try {
    const { title, projectId, assignedToId, priority, dueDate, startDate, status, description } = req.body;
    const tenantFilter = getTenantFilter(req);

    if (!title || !title.trim()) {
      return sendError(res, {
        message: 'Task title is required.',
        entity: 'Task',
        errors: ['Missing required field: title'],
        statusCode: 400,
      });
    }

    // Resolve target project
    let targetProjectId = projectId;
    if (targetProjectId) {
      const proj = await prisma.project.findFirst({
        where: { id: targetProjectId, ...tenantFilter },
      });
      if (!proj) {
        return sendError(res, {
          message: 'Project not found or not accessible.',
          entity: 'Task',
          errors: ['Project not found'],
          statusCode: 404,
        });
      }
    } else {
      const defaultProj = await prisma.project.findFirst({
        where: { status: 'ACTIVE', ...tenantFilter },
        orderBy: { updatedAt: 'desc' },
      });
      targetProjectId = defaultProj?.id;
    }

    if (!targetProjectId) {
      const anyProj = await prisma.project.findFirst({
        where: tenantFilter,
      });
      targetProjectId = anyProj?.id;
    }

    if (!targetProjectId) {
      return sendError(res, {
        message: 'No project found to associate task with. Please create a project first.',
        entity: 'Task',
        errors: ['No projects exist in tenant database'],
        statusCode: 400,
      });
    }

    const taskStatus = status ? String(status).toUpperCase() : 'NOT_STARTED';
    const taskPriority = priority ? String(priority).toUpperCase() : 'MEDIUM';
    const start = startDate ? new Date(startDate) : new Date();
    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

    const task = await prisma.task.create({
      data: {
        projectId: targetProjectId,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        assignedToId: assignedToId || null,
        priority: taskPriority,
        status: taskStatus,
        startDate: start,
        dueDate: due,
        plannedQty: 1,
        unit: 'TASK',
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        assignedUser: { select: { id: true, name: true, role: true, phone: true } },
      },
    });

    await syncProjectProgress(targetProjectId);
    await logAudit(req.user?.id, 'QUICK_ADD_TASK', 'TASK', task.id, { title: task.title, priority: task.priority }, req.ip);

    // Trigger WhatsApp notification if assigned user has phone
    const whatsappResult = await whatsappService.triggerLifecycleNotification({
      tenantId: req.user?.companyId || null,
      userId: req.user?.id || null,
      entityType: 'Task',
      entityId: task.id,
      entityTitle: task.title,
      fromStatus: null,
      toStatus: taskStatus,
      entityData: task,
    });

    // Record ActivityLog
    try {
      await prisma.activityLog.create({
        data: {
          tenantId: req.user?.companyId || null,
          userId: req.user?.id || null,
          userName: req.user?.name || 'Staff',
          entityType: 'Task',
          entityId: task.id,
          entityTitle: task.title,
          action: 'CREATE',
          fromStatus: null,
          toStatus: taskStatus,
          message: `Quick task "${task.title}" created with priority ${taskPriority} in project ${task.project?.name || ''}.`,
          metadata: JSON.stringify({
            projectId: targetProjectId,
            priority: taskPriority,
            assignedTo: task.assignedUser?.name || null,
          }),
        },
      });
    } catch (e) {}

    return sendSuccess(res, {
      message: `Task "${task.title}" created successfully.`,
      entity: 'Task',
      whatsappStatus: whatsappResult.whatsappStatus,
      data: task,
      statusCode: 201,
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to quick-add task',
      entity: 'Task',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

