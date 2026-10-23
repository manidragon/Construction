import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { projectId, status, priority, siteId } = req.query;

    const where: any = {};
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
      title,
      description,
      assignedToId,
      startDate,
      dueDate,
      priority,
      plannedQty,
      unit,
      estimatedCost,
    } = req.body;

    if (!projectId || !title || !startDate || !dueDate) {
      return res.status(400).json({ success: false, message: 'Project, title, start date, and due date are required.' });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        siteId: siteId || null,
        phaseId: phaseId || null,
        title,
        description,
        assignedToId: assignedToId || null,
        startDate: new Date(startDate),
        dueDate: new Date(dueDate),
        priority: priority || 'MEDIUM',
        plannedQty: Number(plannedQty) || 0,
        unit: unit || 'NOS',
        estimatedCost: Number(estimatedCost) || 0,
        status: 'NOT_STARTED',
      },
    });

    await logAudit(req.user?.id, 'CREATE_TASK', 'TASK', task.id, { title, priority }, req.ip);

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
    const {
      title,
      description,
      assignedToId,
      siteId,
      startDate,
      dueDate,
      priority,
      plannedQty,
      completedQty,
      unit,
      estimatedCost,
      actualCost,
      status,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    if (siteId !== undefined) data.siteId = siteId || null;
    if (startDate) data.startDate = new Date(startDate);
    if (dueDate) data.dueDate = new Date(dueDate);
    if (priority !== undefined) data.priority = priority;
    if (plannedQty !== undefined) data.plannedQty = Number(plannedQty);
    if (completedQty !== undefined) data.completedQty = Number(completedQty);
    if (unit !== undefined) data.unit = unit;
    if (estimatedCost !== undefined) data.estimatedCost = Number(estimatedCost);
    if (actualCost !== undefined) data.actualCost = Number(actualCost);
    if (status !== undefined) data.status = status;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, code: true, name: true } },
        site: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, role: true } },
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
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    await prisma.task.delete({ where: { id } });

    await syncProjectProgress(task.projectId);
    await logAudit(req.user?.id, 'DELETE_TASK', 'TASK', id, { title: task.title }, req.ip);

    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
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
