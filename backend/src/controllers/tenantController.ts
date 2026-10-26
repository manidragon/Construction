import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { provisionTenantDatabase, getTenantDbSize } from '../utils/tenantDb';

/**
 * GET /api/superadmin/stats
 * System-wide SaaS statistics across all company tenants
 */
export const getSuperAdminStats = async (req: Request, res: Response) => {
  try {
    const totalTenants = await prisma.company.count();
    const activeTenants = await prisma.company.count({ where: { status: 'ACTIVE' } });
    const trialTenants = await prisma.company.count({ where: { status: 'TRIAL' } });
    const expiredTenants = await prisma.company.count({ where: { status: 'EXPIRED' } });
    const suspendedTenants = await prisma.company.count({ where: { status: 'SUSPENDED' } });

    const totalUsers = await prisma.user.count();
    const totalProjects = await prisma.project.count();
    const totalLeads = await prisma.lead.count();
    const totalInvoices = await prisma.clientInvoice.count();

    const invoiceSums = await prisma.clientInvoice.aggregate({
      _sum: {
        netInvoiceAmount: true,
        paidAmount: true,
      },
    });

    const totalSaaSBilling = invoiceSums._sum.netInvoiceAmount || 0;
    const totalSaaSCollections = invoiceSums._sum.paidAmount || 0;

    return res.json({
      success: true,
      stats: {
        totalTenants,
        activeTenants,
        trialTenants,
        expiredTenants,
        suspendedTenants,
        totalUsers,
        totalProjects,
        totalLeads,
        totalInvoices,
        totalSaaSBilling,
        totalSaaSCollections,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Super Admin stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/tenants
 * List all tenants with full metadata, trial dates, user & project counts
 */
export const getAllTenants = async (req: Request, res: Response) => {
  try {
    const { status, planType, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (planType && typeof planType === 'string') {
      where.planType = planType;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { code: { contains: search } },
        { ownerEmail: { contains: search } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            leads: true,
            quotations: true,
            invoices: true,
            whatsappLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const tenants = companies.map((c) => {
      let daysRemaining = 0;
      if (c.trialEndDate) {
        const diffMs = new Date(c.trialEndDate).getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        id: c.id,
        name: c.companyName || c.name,
        companyName: c.companyName || c.name,
        code: c.code,
        ownerEmail: c.ownerEmail || c.email,
        adminPassword: c.adminPassword,
        databasePath: c.databasePath,
        databaseSize: getTenantDbSize(c.id),
        phone: c.phone,
        status: c.status,
        planType: c.planType,
        trialStartDate: c.trialStartDate,
        trialEndDate: c.trialEndDate,
        daysRemaining,
        isTrialExpired: c.status === 'EXPIRED' || (c.status === 'TRIAL' && daysRemaining === 0),
        whatsappConfigured: !!(c.whatsappApiKey || c.whatsappPhoneNumberId),
        useSharedGateway: c.useSharedGateway,
        logoUrl: c.logoUrl,
        businessAddress: c.businessAddress || c.address,
        userCount: c._count.users,
        projectCount: c._count.projects,
        leadCount: c._count.leads,
        quotationCount: c._count.quotations,
        invoiceCount: c._count.invoices,
        whatsappLogCount: c._count.whatsappLogs,
        createdAt: c.createdAt,
      };
    });

    return res.json({ success: true, tenants, total: tenants.length });
  } catch (error: any) {
    console.error('Error fetching all tenants:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/superadmin/tenants
 * Register a new company/tenant manually with custom trial duration & auto-generated credentials
 */
export const createTenant = async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      ownerEmail,
      ownerName,
      phone,
      password,
      trialDays = 14,
      planType = 'FREE_TRIAL',
      address = 'Bangalore, India',
      city = 'Bengaluru',
      state = 'Karnataka',
      pincode = '560001',
      gstin,
    } = req.body;

    if (!companyName || !ownerEmail) {
      return res.status(400).json({ success: false, message: 'Company Name and Owner Email are required.' });
    }

    // Check if owner email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: String(ownerEmail).trim().toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `A user with email "${ownerEmail}" already exists.` });
    }

    // Generate unique company code
    const count = await prisma.company.count();
    const cleanSlug = companyName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    const code = `${cleanSlug || 'TENANT'}-${String(count + 1).padStart(3, '0')}`;

    // Compute trial dates
    const days = parseInt(String(trialDays), 10) || 14;
    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Auto-generate password if not provided
    const rawPassword = password && String(password).trim().length >= 6
      ? String(password).trim()
      : `Nearlook@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        companyName: companyName.trim(),
        code,
        ownerEmail: String(ownerEmail).trim().toLowerCase(),
        adminPassword: rawPassword,
        databasePath: `./tenants/tenant_${code}.db`,
        status: 'TRIAL',
        trialStartDate,
        trialEndDate,
        planType: planType || 'FREE_TRIAL',
        address,
        city,
        state,
        pincode,
        phone: phone || '+91 98000 00000',
        email: String(ownerEmail).trim().toLowerCase(),
        gstin: gstin || null,
        useSharedGateway: true,
      },
    });

    // Provision dedicated isolated database file for this client
    await provisionTenantDatabase({
      tenantId: company.id,
      code: company.code,
      name: company.name,
      ownerEmail: company.ownerEmail || '',
      adminPassword: rawPassword,
      phone: company.phone,
      city,
      state,
      trialDays: days,
    });

    const finalOwnerName = ownerName ? String(ownerName).trim() : `${companyName.trim()} Admin`;

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: finalOwnerName,
        email: String(ownerEmail).trim().toLowerCase(),
        passwordHash,
        phone: phone || null,
        role: 'TENANT_ADMIN',
        designation: 'Managing Director / Business Owner',
        isActive: true,
      },
    });

    // Automatically record onboarding welcome WhatsApp Log entry
    const logDelegate = (prisma as any).whatsAppLog || (prisma as any).whatsappLog;
    if (logDelegate) {
      await logDelegate.create({
        data: {
          tenantId: company.id,
          recipientPhone: phone || '+91 98000 00000',
          recipientName: finalOwnerName,
          messageType: 'TRIAL_WELCOME',
          messageBody: `Welcome to Construction ERP & CRM! Your ${days}-day trial for ${company.name} is now active until ${trialEndDate.toLocaleDateString()}. Login: ${user.email}`,
          status: 'SENT',
          gatewayUsed: 'SHARED_GATEWAY',
          sentById: req.user?.id || user.id,
        },
      });
    }

    await logAudit(req.user?.id, 'CREATE_TENANT', 'COMPANY', company.id, {
      companyName: company.name,
      code: company.code,
      ownerEmail: user.email,
      trialDays: days,
    }, req.ip);

    return res.status(201).json({
      success: true,
      message: `Company Tenant "${company.name}" registered successfully with a ${days}-day trial!`,
      tenant: company,
      credentials: {
        companyCode: company.code,
        adminName: user.name,
        adminEmail: user.email,
        temporaryPassword: rawPassword,
        trialDurationDays: days,
        trialEndDate,
      },
    });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/superadmin/tenants/:id/extend-trial
 * Extend a company's trial by N days and set status back to TRIAL
 */
export const extendTrial = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { planType } = req.body;
    const days = parseInt(String(req.body.daysToAdd ?? req.body.additionalDays ?? 14), 10) || 14;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    // If current trialEndDate is in the future, add to it; otherwise add to now
    const baseDate = company.trialEndDate && new Date(company.trialEndDate) > new Date()
      ? new Date(company.trialEndDate)
      : new Date();

    const newTrialEndDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await prisma.company.update({
      where: { id },
      data: {
        trialEndDate: newTrialEndDate,
        status: 'TRIAL',
        ...(planType && { planType }),
      },
    });

    await logAudit(req.user?.id, 'EXTEND_TRIAL', 'COMPANY', company.id, {
      extendedByDays: days,
      newTrialEndDate,
    }, req.ip);

    return res.json({
      success: true,
      message: `Trial for "${company.name}" extended by ${days} days until ${newTrialEndDate.toLocaleDateString()}.`,
      tenant: updated,
    });
  } catch (error: any) {
    console.error('Error extending trial:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/superadmin/tenants/:id/status
 * Update tenant status: ACTIVE, TRIAL, EXPIRED, SUSPENDED
 */
export const updateTenantStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, planType } = req.body;

    const validStatuses = ['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: [${validStatuses.join(', ')}]`,
      });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        status,
        ...(planType && { planType }),
      },
    });

    await logAudit(req.user?.id, 'UPDATE_TENANT_STATUS', 'COMPANY', company.id, {
      oldStatus: company.status,
      newStatus: status,
    }, req.ip);

    return res.json({
      success: true,
      message: `Tenant status updated to "${status}".`,
      tenant: updated,
    });
  } catch (error: any) {
    console.error('Error updating tenant status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/company/current-status
 * Check trial status, days remaining, and plan info for the logged-in user's tenant
 */
export const getTenantCurrentStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: {
        id: true,
        name: true,
        companyName: true,
        code: true,
        status: true,
        planType: true,
        trialStartDate: true,
        trialEndDate: true,
        ownerEmail: true,
        logoUrl: true,
        businessAddress: true,
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const now = new Date();
    let daysRemaining = 0;
    if (company.trialEndDate) {
      const diffMs = new Date(company.trialEndDate).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const isTrialExpired = company.status === 'EXPIRED' ||
      (company.status === 'TRIAL' && company.trialEndDate && new Date(company.trialEndDate) < now);

    return res.json({
      success: true,
      company: {
        ...company,
        daysRemaining,
        isTrialExpired,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current tenant status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
