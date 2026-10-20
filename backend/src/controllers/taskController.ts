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

    return res.status(201).json({ success: true, task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, completedQty, actualCost, priority, dueDate } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (completedQty !== undefined) data.completedQty = Number(completedQty);
    if (actualCost !== undefined) data.actualCost = Number(actualCost);
    if (priority) data.priority = priority;
    if (dueDate) data.dueDate = new Date(dueDate);

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return res.json({ success: true, task });
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
