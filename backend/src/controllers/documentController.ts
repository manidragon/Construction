import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { getTenantFilter } from '../utils/tenant';

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { projectId, category, referenceEntity, referenceId, startDate, endDate, year, month, search } = req.query;

    const where: any = { ...getTenantFilter(req) };
    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      where.projectId = projectId;
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }
    if (referenceEntity && typeof referenceEntity === 'string') {
      where.referenceEntity = referenceEntity;
    }
    if (referenceId && typeof referenceId === 'string') {
      where.referenceId = referenceId;
    }

    // Date filtering (by custom date range, or by year/month)
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate && typeof startDate === 'string') {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.createdAt = dateFilter;
    } else if (year && typeof year === 'string' && year !== 'ALL') {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        if (month && typeof month === 'string' && month !== 'ALL') {
          const m = parseInt(month, 10) - 1; // 0-indexed month
          const start = new Date(y, m, 1, 0, 0, 0);
          const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
          where.createdAt = { gte: start, lte: end };
        } else {
          const start = new Date(y, 0, 1, 0, 0, 0);
          const end = new Date(y, 11, 31, 23, 59, 59, 999);
          where.createdAt = { gte: start, lte: end };
        }
      }
    }

    // Text search filter
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { category: { contains: q } },
        { referenceEntity: { contains: q } },
        { referenceId: { contains: q } },
        { project: { name: { contains: q } } },
        { project: { code: { contains: q } } },
      ];
    }

    const documents = await prisma.documentAttachment.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true, clientName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, documents });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const { title, category, fileUrl, fileSize, fileType, projectId, siteId, referenceEntity, referenceId, customDate } = req.body;

    const docUrl = req.file ? `/uploads/${req.file.filename}` : fileUrl;

    if (!title || !docUrl) {
      return res.status(400).json({ success: false, message: 'Title and file or document URL are required.' });
    }

    const tenantId = req.user?.companyId || null;

    const doc = await prisma.documentAttachment.create({
      data: {
        tenantId,
        title,
        category: category || 'DRAWING',
        fileUrl: docUrl,
        fileSize: req.file ? req.file.size : Number(fileSize) || 1024,
        fileType: req.file ? req.file.mimetype : fileType || 'application/pdf',
        projectId: projectId || null,
        siteId: siteId || null,
        referenceEntity: referenceEntity || null,
        referenceId: referenceId || null,
        uploadedById: req.user?.id,
        createdAt: customDate ? new Date(customDate) : new Date(),
      },
      include: {
        project: { select: { id: true, code: true, name: true, clientName: true } },
      },
    });

    await logAudit(req.user?.id, 'UPLOAD_DOCUMENT', 'DOCUMENT', doc.id, { title, category }, req.ip);

    return res.status(201).json({ success: true, document: doc });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenantFilter = getTenantFilter(req);

    const doc = await prisma.documentAttachment.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    await prisma.documentAttachment.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_DOCUMENT', 'DOCUMENT', id, { title: doc.title }, req.ip);

    return res.json({ success: true, message: 'Document removed from vault.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
