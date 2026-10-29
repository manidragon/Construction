import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { getTenantFilter } from '../utils/tenant';

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { projectId, category, referenceEntity, referenceId } = req.query;

    const where: any = { ...getTenantFilter(req) };
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (category && typeof category === 'string') where.category = category;
    if (referenceEntity && typeof referenceEntity === 'string') where.referenceEntity = referenceEntity;
    if (referenceId && typeof referenceId === 'string') where.referenceId = referenceId;

    const documents = await prisma.documentAttachment.findMany({
      where,
      include: {
        project: { select: { code: true, name: true } },
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
    const { title, category, fileUrl, fileSize, fileType, projectId, siteId, referenceEntity, referenceId } = req.body;

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
      },
    });

    await logAudit(req.user?.id, 'UPLOAD_DOCUMENT', 'DOCUMENT', doc.id, { title, category }, req.ip);

    return res.status(201).json({ success: true, document: doc });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
