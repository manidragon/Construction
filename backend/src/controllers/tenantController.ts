import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { provisionTenantDatabase, getTenantDbSize, getTenantPrisma } from '../utils/tenantDb';
import { clearOperationalDataKeepTenants } from '../utils/databaseCleanup';

async function ensureDemoTenantsExist() {
  try {
    const nonHqCount = await prisma.company.count({
      where: { code: { not: 'NEARLOOK-HQ' } }
    }).catch(() => 0);

    if (nonHqCount > 0) return;

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // 1. Apex Buildtech
    const apexCompany = await prisma.company.upsert({
      where: { code: 'APEX-INFRA' },
      update: { status: 'ACTIVE' },
      create: {
        name: 'Apex Buildtech & Infrastructure Pvt. Ltd.',
        companyName: 'Apex Buildtech & Infrastructure Pvt. Ltd.',
        code: 'APEX-INFRA',
        ownerEmail: 'owner@apexbuild.com',
        adminPassword: 'Password@123',
        status: 'ACTIVE',
        planType: 'ENTERPRISE',
        subscriptionModel: 'LIFETIME',
        trialStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        trialEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        address: 'Prestige Trade Tower, 14th Floor, High Grounds',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        phone: '+91 80 4123 4567',
        email: 'info@apexbuildtech.com',
        currencySymbol: '₹',
        logoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=160&auto=format&fit=crop&q=80',
        businessAddress: 'Prestige Trade Tower, 14th Floor, High Grounds, Bengaluru - 560001',
        invoiceFooterNotes: 'Bank Details: Apex Buildtech Pvt. Ltd. | HDFC Current A/c 50200012345678 | IFSC: HDFC0001234',
        onboardingCompleted: true,
      }
    });

    await prisma.user.upsert({
      where: { email: 'owner@apexbuild.com' },
      update: { role: 'TENANT_ADMIN', isActive: true },
      create: {
        companyId: apexCompany.id,
        name: 'Rajesh Sharma',
        email: 'owner@apexbuild.com',
        passwordHash,
        role: 'TENANT_ADMIN',
        designation: 'Managing Director & Owner',
        phone: '+91 98450 11001',
        isActive: true,
      }
    });

    // 2. Skyline Urban Developers
    const skylineStart = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const skylineEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const skylineCompany = await prisma.company.upsert({
      where: { code: 'SKYLINE-DEV' },
      update: { status: 'TRIAL' },
      create: {
        name: 'Skyline Urban Developers',
        companyName: 'Skyline Urban Developers',
        code: 'SKYLINE-DEV',
        ownerEmail: 'admin@skyline.com',
        adminPassword: 'Password@123',
        status: 'TRIAL',
        planType: 'PRO',
        subscriptionModel: 'TRIAL',
        trialStartDate: skylineStart,
        trialEndDate: skylineEnd,
        address: 'Skyline Hub, 3rd Floor, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        phone: '+91 98450 33445',
        email: 'admin@skyline.com',
        currencySymbol: '₹',
        logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=160&auto=format&fit=crop&q=80',
        businessAddress: 'Skyline Hub, 100ft Road, Indiranagar, Bengaluru - 560038',
        onboardingCompleted: true,
      }
    });

    await prisma.user.upsert({
      where: { email: 'admin@skyline.com' },
      update: { role: 'TENANT_ADMIN', isActive: true },
      create: {
        companyId: skylineCompany.id,
        name: 'Kabir Singhania',
        email: 'admin@skyline.com',
        passwordHash,
        role: 'TENANT_ADMIN',
        designation: 'Trial Owner',
        phone: '+91 98450 33445',
        isActive: true,
      }
    });

    // 3. Starlight Interiors
    const starlightStart = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const starlightEnd = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const starlightCompany = await prisma.company.upsert({
      where: { code: 'STARLIGHT-INT' },
      update: { status: 'EXPIRED' },
      create: {
        name: 'Starlight Interiors & Design',
        companyName: 'Starlight Interiors & Design',
        code: 'STARLIGHT-INT',
        ownerEmail: 'owner@starlight.com',
        adminPassword: 'Password@123',
        status: 'EXPIRED',
        planType: 'FREE_TRIAL',
        subscriptionModel: 'TRIAL',
        trialStartDate: starlightStart,
        trialEndDate: starlightEnd,
        address: 'Starlight Design Studio, Koramangala 4th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        phone: '+91 98450 55667',
        email: 'owner@starlight.com',
        currencySymbol: '₹',
        logoUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=160&auto=format&fit=crop&q=80',
        businessAddress: 'Starlight Design Studio, Koramangala 4th Block, Bengaluru - 560034',
        onboardingCompleted: true,
      }
    });

    await prisma.user.upsert({
      where: { email: 'owner@starlight.com' },
      update: { role: 'TENANT_ADMIN', isActive: true },
      create: {
        companyId: starlightCompany.id,
        name: 'Ananya Roy',
        email: 'owner@starlight.com',
        passwordHash,
        role: 'TENANT_ADMIN',
        designation: 'Expired Trial Owner',
        phone: '+91 98450 55667',
        isActive: true,
      }
    });
  } catch (err) {
    console.warn('ensureDemoTenantsExist non-fatal warning:', err);
  }
}

/**
 * GET /api/superadmin/stats
 * System-wide SaaS statistics across all company tenants
 */
export const getSuperAdminStats = async (req: Request, res: Response) => {
  try {
    await ensureDemoTenantsExist();

    const totalTenants = await prisma.company.count().catch(() => 0);
    const activeTenants = await prisma.company.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
    const trialTenants = await prisma.company.count({ where: { status: 'TRIAL' } }).catch(() => 0);
    const expiredTenants = await prisma.company.count({ where: { status: 'EXPIRED' } }).catch(() => 0);
    const suspendedTenants = await prisma.company.count({ where: { status: 'SUSPENDED' } }).catch(() => 0);

    // Paid active breakdown: Lifetime vs Monthly vs Yearly
    let lifetimeCount = 0;
    try {
      lifetimeCount = await prisma.company.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { subscriptionModel: 'LIFETIME' },
            { planType: { contains: 'LIFETIME' } },
          ],
        },
      });
    } catch {
      lifetimeCount = await prisma.company.count({
        where: {
          status: 'ACTIVE',
          planType: { contains: 'LIFETIME' },
        },
      }).catch(() => 0);
    }

    let monthlyCount = 0;
    try {
      monthlyCount = await prisma.company.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { subscriptionModel: 'MONTHLY' },
            { planType: { contains: 'MONTHLY' } },
          ],
        },
      });
    } catch {
      monthlyCount = await prisma.company.count({
        where: {
          status: 'ACTIVE',
          planType: { contains: 'MONTHLY' },
        },
      }).catch(() => 0);
    }

    let yearlyCount = 0;
    try {
      yearlyCount = await prisma.company.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { subscriptionModel: 'YEARLY' },
            { planType: { contains: 'YEARLY' } },
            { planType: 'ENTERPRISE' },
            { planType: 'PRO' },
          ],
        },
      });
    } catch {
      yearlyCount = await prisma.company.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { planType: 'ENTERPRISE' },
            { planType: 'PRO' },
          ],
        },
      }).catch(() => 0);
    }

    // Usage metrics: staff accounts & active device sessions
    const totalStaffAccounts = await prisma.user.count({
      where: { role: { not: 'SUPER_ADMIN' } },
    }).catch(() => 0);

    const totalActiveDevices = await (prisma as any).activeDeviceSession?.count({
      where: { isActive: true },
    }).catch(() => 0) || Math.max(totalStaffAccounts, 1);

    const totalProjects = await prisma.project.count().catch(() => 0);
    const totalLeads = await prisma.lead.count().catch(() => 0);
    const totalInvoices = await prisma.clientInvoice.count().catch(() => 0);

    const invoiceSums = await prisma.clientInvoice.aggregate({
      _sum: {
        netInvoiceAmount: true,
        paidAmount: true,
      },
    }).catch(() => ({ _sum: { netInvoiceAmount: 0, paidAmount: 0 } }));

    // SaaS Financial Ledger Inflows
    const saasSums = await (prisma as any).saasTransaction?.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }).catch(() => null);

    const totalSaaSInflows = saasSums?._sum?.amount || 0;
    const totalSaaSBilling = invoiceSums._sum?.netInvoiceAmount || 0;
    const totalSaaSCollections = invoiceSums._sum?.paidAmount || 0;

    // Support tickets
    const openTicketsCount = await (prisma as any).supportTicket?.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }).catch(() => 0) || 0;
    const totalTicketsCount = await (prisma as any).supportTicket?.count().catch(() => 0) || 0;

    return res.json({
      success: true,
      stats: {
        totalTenants,
        activeTenants,
        trialTenants,
        expiredTenants,
        suspendedTenants,
        lifetimeCount,
        monthlyCount,
        yearlyCount,
        totalStaffAccounts,
        totalActiveDevices,
        totalUsers: totalStaffAccounts,
        totalProjects,
        totalLeads,
        totalInvoices,
        totalSaaSBilling,
        totalSaaSCollections,
        totalSaaSInflows,
        openTicketsCount,
        totalTicketsCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Super Admin stats:', error);
    return res.json({
      success: true,
      stats: {
        totalTenants: 0,
        activeTenants: 0,
        trialTenants: 0,
        expiredTenants: 0,
        suspendedTenants: 0,
        lifetimeCount: 0,
        monthlyCount: 0,
        yearlyCount: 0,
        totalStaffAccounts: 0,
        totalActiveDevices: 1,
        totalUsers: 0,
        totalProjects: 0,
        totalLeads: 0,
        totalInvoices: 0,
        totalSaaSBilling: 0,
        totalSaaSCollections: 0,
        totalSaaSInflows: 0,
        openTicketsCount: 0,
        totalTicketsCount: 0,
      },
    });
  }
};

/**
 * GET /api/superadmin/tenants
 * List all tenants with full metadata, trial dates, user & project counts
 */
export const getAllTenants = async (req: Request, res: Response) => {
  try {
    await ensureDemoTenantsExist();

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
        { users: { some: { name: { contains: search } } } },
      ];
    }

    let companies: any[] = [];
    try {
      companies = await prisma.company.findMany({
        where,
        include: {
          users: {
            where: { role: { in: ['TENANT_ADMIN', 'OWNER', 'SUPER_ADMIN'] } },
            select: { name: true, email: true, role: true },
            take: 3,
          },
          _count: {
            select: {
              users: true,
              projects: true,
              leads: true,
              quotations: true,
              invoices: true,
              whatsappLogs: true,
              supportTickets: true,
              saasTransactions: true,
              deviceSessions: true,
            },
          },
          saasTransactions: {
            where: { status: 'PAID' },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (fullIncludeErr) {
      console.warn('getAllTenants full include failed, falling back to core query:', fullIncludeErr);
      try {
        companies = await prisma.company.findMany({
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
      } catch (basicIncludeErr) {
        console.warn('getAllTenants basic include failed, falling back to simple findMany:', basicIncludeErr);
        companies = await prisma.company.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    const now = new Date();

    const tenants = companies.map((c) => {
      let daysRemaining = 0;
      if (c.trialEndDate) {
        const diffMs = new Date(c.trialEndDate).getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      const totalPaidToDate = Array.isArray(c.saasTransactions)
        ? c.saasTransactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
        : 0;

      const ownerUser =
        (Array.isArray(c.users) &&
          (c.users.find((u: any) => u.email?.toLowerCase() === (c.ownerEmail || c.email || '').toLowerCase()) ||
            c.users.find((u: any) => u.role === 'TENANT_ADMIN' || u.role === 'OWNER') ||
            c.users[0])) ||
        null;

      return {
        id: c.id,
        name: c.companyName || c.name,
        companyName: c.companyName || c.name,
        code: c.code,
        ownerName: ownerUser?.name || '',
        ownerEmail: c.ownerEmail || c.email,
        adminPassword: c.adminPassword,
        databasePath: c.databasePath,
        databaseSize: getTenantDbSize(c.id),
        phone: c.phone,
        status: c.status,
        planType: c.planType,
        subscriptionModel: c.subscriptionModel || (c.status === 'ACTIVE' ? 'LIFETIME' : 'TRIAL'),
        onboardingCompleted: Boolean(c.onboardingCompleted),
        realEstateEnabled: Boolean(c.realEstateEnabled),
        suspendedReason: c.suspendedReason,
        activeDevicesCount: c._count?.deviceSessions > 0 ? c._count.deviceSessions : (c.activeDevicesCount || 1),
        staffAccountsCount: c._count?.users || 0,
        supportTicketsCount: c._count?.supportTickets || 0,
        saasTransactionsCount: c._count?.saasTransactions || 0,
        totalPaidToDate,
        trialStartDate: c.trialStartDate,
        trialEndDate: c.trialEndDate,
        daysRemaining,
        isTrialExpired: c.status === 'EXPIRED' || (c.status === 'TRIAL' && daysRemaining === 0),
        isSuspended: c.status === 'SUSPENDED',
        whatsappConfigured: !!(c.whatsappApiKey || c.whatsappPhoneNumberId),
        useSharedGateway: c.useSharedGateway,
        logoUrl: c.logoUrl,
        businessAddress: c.businessAddress || c.address,
        userCount: c._count?.users || 0,
        projectCount: c._count?.projects || 0,
        leadCount: c._count?.leads || 0,
        quotationCount: c._count?.quotations || 0,
        invoiceCount: c._count?.invoices || 0,
        whatsappLogCount: c._count?.whatsappLogs || 0,
        createdAt: c.createdAt,
      };
    });

    return res.json({ success: true, tenants, total: tenants.length });
  } catch (error: any) {
    console.error('Error fetching all tenants:', error);
    return res.json({ success: true, tenants: [], total: 0 });
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
      realEstateEnabled = false,
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
        realEstateEnabled: Boolean(realEstateEnabled),
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

    // Also sync the newly created user into the tenant dedicated database
    try {
      const tenantPrisma = getTenantPrisma(company.id);
      await tenantPrisma.user.upsert({
        where: { email: user.email },
        update: {
          companyId: company.id,
          name: user.name,
          passwordHash,
          phone: user.phone,
          role: 'TENANT_ADMIN',
          designation: 'Managing Director / Business Owner',
          isActive: true,
        },
        create: {
          id: user.id,
          companyId: company.id,
          name: user.name,
          email: user.email,
          passwordHash,
          phone: user.phone,
          role: 'TENANT_ADMIN',
          designation: 'Managing Director / Business Owner',
          isActive: true,
        },
      });
    } catch (e) {
      console.warn('[Multi-DB] Notice: Could not sync user to tenant DB during manual creation:', e);
    }

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
    const { status, planType, suspendedReason, subscriptionModel } = req.body;

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
        ...(subscriptionModel && { subscriptionModel }),
        suspendedReason: status === 'SUSPENDED'
          ? (suspendedReason || 'Account paused/suspended by Platform Administrator.')
          : null,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_TENANT_STATUS', 'COMPANY', company.id, {
      oldStatus: company.status,
      newStatus: status,
      suspendedReason: updated.suspendedReason,
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
 * PATCH /api/superadmin/tenants/:id/features
 * Enable or disable add-on feature modules (e.g. Real Estate CRM) for a specific tenant
 */
export const updateTenantFeatures = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { realEstateEnabled } = req.body;

    if (typeof realEstateEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'realEstateEnabled boolean flag is required.',
      });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        realEstateEnabled,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_TENANT_FEATURES', 'COMPANY', company.id, {
      companyName: company.name,
      realEstateEnabled,
    }, req.ip);

    return res.json({
      success: true,
      message: `Real Estate CRM ${realEstateEnabled ? 'enabled' : 'disabled'} for "${company.companyName || company.name}".`,
      tenant: updated,
    });
  } catch (error: any) {
    console.error('Error updating tenant features:', error);
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
        subscriptionModel: true,
        onboardingCompleted: true,
        realEstateEnabled: true,
        suspendedReason: true,
        trialStartDate: true,
        trialEndDate: true,
        ownerEmail: true,
        logoUrl: true,
        businessAddress: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
        gstin: true,
        pan: true,
        currencySymbol: true,
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

    const isSuspended = company.status === 'SUSPENDED';
    const isTrialExpired = company.status === 'EXPIRED' ||
      (company.status === 'TRIAL' && company.trialEndDate && new Date(company.trialEndDate) < now);

    return res.json({
      success: true,
      company: {
        ...company,
        daysRemaining,
        isTrialExpired,
        isSuspended,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current tenant status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/superadmin/tenants/:id/reset-demo
 * OR POST /api/company/reset-demo
 * Reset and re-seed clean isolated sample data for prospective constructors / demo accounts
 */
export const resetDemoTenantData = async (req: Request, res: Response) => {
  try {
    const targetId = String(req.params.id || req.user?.companyId || '');
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Target tenant ID is required.' });
    }

    // Role check: Only SUPER_ADMIN or TENANT_ADMIN / OWNER of that company can trigger reset
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== targetId) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot reset other tenants.' });
    }

    const company = await prisma.company.findUnique({ where: { id: targetId } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    // Find all projects belonging to this tenant to delete project children
    const projects = await prisma.project.findMany({
      where: { tenantId: targetId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    // Clean up all transactional data safely for this tenant
    if (projectIds.length > 0) {
      await prisma.dailySiteReport.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.bOQItem.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.phase.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.site.deleteMany({ where: { projectId: { in: projectIds } } });
    }

    await prisma.task.deleteMany({ where: { tenantId: targetId } });
    await prisma.clientInvoice.deleteMany({ where: { tenantId: targetId } });
    await prisma.clientReceipt.deleteMany({ where: { tenantId: targetId } });
    await prisma.quotation.deleteMany({ where: { tenantId: targetId } });
    await prisma.lead.deleteMany({ where: { tenantId: targetId } });
    await prisma.expense.deleteMany({ where: { tenantId: targetId } });
    await prisma.materialRequisition.deleteMany({ where: { tenantId: targetId } });
    await prisma.goodsReceiptNote.deleteMany({ where: { tenantId: targetId } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: targetId } });
    await prisma.supplierPayment.deleteMany({ where: { tenantId: targetId } });
    await prisma.supplierInvoice.deleteMany({ where: { tenantId: targetId } });
    await prisma.supplier.deleteMany({ where: { tenantId: targetId } });
    await prisma.stockLedger.deleteMany({ where: { tenantId: targetId } });
    await prisma.material.deleteMany({ where: { tenantId: targetId } });
    await prisma.warehouse.deleteMany({ where: { tenantId: targetId } });
    await prisma.equipmentAsset.deleteMany({ where: { tenantId: targetId } });
    await prisma.documentAttachment.deleteMany({ where: { tenantId: targetId } });
    await prisma.officeExpense.deleteMany({ where: { tenantId: targetId } });
    await prisma.officeStaff.deleteMany({ where: { tenantId: targetId } });
    await prisma.subcontractor.deleteMany({ where: { tenantId: targetId } });
    await prisma.pettyCashTransaction.deleteMany({
      where: { pettyCashAccount: { tenantId: targetId } },
    });
    await prisma.pettyCashAccount.deleteMany({ where: { tenantId: targetId } });
    await prisma.journalLine.deleteMany({
      where: { journalEntry: { tenantId: targetId } },
    });
    await prisma.journalEntry.deleteMany({ where: { tenantId: targetId } });
    await prisma.project.deleteMany({ where: { tenantId: targetId } });
    await prisma.client.deleteMany({ where: { tenantId: targetId } });

    // Refresh Trial status with 14 fresh days
    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.company.update({
      where: { id: targetId },
      data: {
        status: 'TRIAL',
        trialStartDate,
        trialEndDate,
      },
    });

    // Re-seed clean isolated demo records
    const demoClient = await prisma.client.create({
      data: {
        tenant: { connect: { id: targetId } },
        code: `CLI-${company.code.slice(0, 4)}-01`,
        name: 'Dr. Ramesh & Sunita Nair',
        phone: '+91 98451 99887',
        email: 'ramesh.nair@example.com',
        billingAddress: 'Villa 42, Palm Meadows, Whitefield, Bengaluru - 560066',
      },
    });

    const demoProject = await prisma.project.create({
      data: {
        tenant: { connect: { id: targetId } },
        code: `PRJ-${company.code.slice(0, 4)}-01`,
        name: `${company.name} Showcase Villa 42`,
        description: 'Exclusive 4BHK Turnkey Villa Construction & Interior Finishing Demo Project',
        clientName: demoClient.name,
        clientContact: demoClient.phone,
        clientEmail: demoClient.email,
        siteAddress: demoClient.billingAddress,
        city: company.city || 'Bengaluru',
        state: company.state || 'Karnataka',
        projectType: 'RESIDENTIAL',
        contractType: 'ITEM_RATE',
        contractValue: 8500000,
        approvedBudget: 6500000,
        plannedStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        plannedEndDate: new Date(Date.now() + 105 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        completionPercent: 28.5,
        advancePaymentRequired: 2000000,
        advancePaymentReceived: 2000000,
        advancePaymentConfirmed: true,
      },
    });

    await prisma.bOQItem.create({
      data: {
        projectId: demoProject.id,
        itemCode: 'BOQ-001',
        description: 'Substructure RCC Footings, Plinth Beam & Ground Slab with M25 RMC',
        category: 'CIVIL_CONCRETE',
        unit: 'CUM',
        estimatedQty: 120,
        unitRate: 6800,
        estimatedTotal: 816000,
        actualQtyCompleted: 120,
        materialUnitCost: 4500,
        labourUnitCost: 2300,
        clientApprovalStatus: 'APPROVED',
      },
    });

    await prisma.lead.create({
      data: {
        tenant: { connect: { id: targetId } },
        leadNumber: `LEAD-${company.code.slice(0, 4)}-01`,
        clientName: 'Vikramaditya Rao',
        contactNumber: '+91 98452 77889',
        email: 'vikram.rao@example.com',
        siteAddress: 'Plot 88, Prestige Golfshire, Nandi Hills Road',
        city: company.city || 'Bengaluru',
        state: company.state || 'Karnataka',
        projectType: 'VILLA_CONSTRUCTION',
        budgetRange: '1CR_2CR',
        source: 'DIRECT_REFERRAL',
        stage: 'SITE_MEASUREMENT_COMPLETED',
        assignedTeam: 'ARCHITECTURE_TEAM',
      },
    });

    await prisma.officeStaff.create({
      data: {
        tenant: { connect: { id: targetId } },
        staffCode: `STF-${company.code.slice(0, 4)}-01`,
        name: 'Aarti Deshmukh',
        roleCategory: 'HR_OPERATIONS',
        designation: 'Operations & HR Lead',
        phone: '+91 98450 66778',
        email: `aarti@${company.ownerEmail?.split('@')[1] || 'demo.com'}`,
        address: 'Indiranagar 12th Main, Bengaluru',
        fixedSalary: 55000,
        basicSalary: 27500,
        hra: 11000,
        allowances: 16500,
        isActive: true,
      },
    });

    await logAudit(req.user?.id, 'RESET_DEMO_DATA', 'COMPANY', targetId, {
      companyName: company.name,
      code: company.code,
    }, req.ip);

    return res.json({
      success: true,
      message: `Demo environment for "${company.name}" has been successfully reset to fresh sample data with 14 trial days!`,
    });
  } catch (error: any) {
    console.error('Error resetting demo tenant data:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// SaaS Financial Ledger & Inflows
// -------------------------------------------------------------

/**
 * GET /api/superadmin/saas-transactions
 * List all financial inflows, one-time lifetime purchases & subscription renewals
 */
export const getSaaSTransactions = async (req: Request, res: Response) => {
  try {
    const { companyId, planType, status } = req.query;
    const where: any = {};
    if (companyId && typeof companyId === 'string') where.companyId = companyId;
    if (planType && typeof planType === 'string') where.planType = planType;
    if (status && typeof status === 'string') where.status = status;

    const transactions = await (prisma as any).saasTransaction.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyName: true,
            code: true,
            status: true,
            ownerEmail: true,
            phone: true,
            subscriptionModel: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    return res.json({ success: true, transactions, total: transactions.length });
  } catch (error: any) {
    console.error('Error fetching SaaS transactions:', error);
    return res.json({ success: true, transactions: [], total: 0 });
  }
};

/**
 * POST /api/superadmin/saas-transactions
 * Record new financial inflow, lifetime fee, subscription renewal, or plan upgrade
 */
export const recordSaaSTransaction = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      planType = 'MONTHLY_SUBSCRIPTION',
      billingCycle = 'MONTHLY',
      amount,
      paymentMode = 'BANK_RTGS_NEFT',
      paymentRef,
      invoiceNumber,
      notes,
      periodStartDate,
      periodEndDate,
    } = req.body;

    if (!companyId || !amount) {
      return res.status(400).json({ success: false, message: 'Company and transaction amount are required.' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const invNo = invoiceNumber || `INV-SAAS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const transaction = await (prisma as any).saasTransaction.create({
      data: {
        companyId,
        invoiceNumber: invNo,
        transactionDate: new Date(),
        planType,
        billingCycle,
        amount: Number(amount),
        currency: 'INR',
        paymentMode,
        paymentRef: paymentRef || null,
        status: 'PAID',
        periodStartDate: periodStartDate ? new Date(periodStartDate) : new Date(),
        periodEndDate: periodEndDate ? new Date(periodEndDate) : (
          billingCycle === 'ONE_TIME' || planType.includes('LIFETIME')
            ? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000)
            : billingCycle === 'YEARLY'
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ),
        notes: notes || `SaaS subscription inflow for ${company.name}`,
      },
    });

    let subModel = 'MONTHLY';
    if (billingCycle === 'ONE_TIME' || planType.includes('LIFETIME')) subModel = 'LIFETIME';
    else if (billingCycle === 'YEARLY' || planType.includes('YEARLY')) subModel = 'YEARLY';

    await prisma.company.update({
      where: { id: companyId },
      data: {
        status: 'ACTIVE',
        subscriptionModel: subModel,
        planType,
        suspendedReason: null,
      },
    });

    await logAudit(req.user?.id, 'RECORD_SAAS_TRANSACTION', 'COMPANY', companyId, {
      amount,
      planType,
      invoiceNumber: invNo,
      paymentMode,
    }, req.ip);

    return res.status(201).json({
      success: true,
      message: `SaaS payment of ₹${Number(amount).toLocaleString('en-IN')} successfully recorded for "${company.name}". Account is ACTIVE!`,
      transaction,
    });
  } catch (error: any) {
    console.error('Error recording SaaS transaction:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// Support & Chat Archive Inbox
// -------------------------------------------------------------

/**
 * GET /api/support/tickets
 * Retrieve support tickets & chat archives (Super Admin gets all, tenant gets own)
 */
export const getSupportTickets = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const where: any = {};

    if (!isSuperAdmin) {
      where.companyId = req.user?.companyId;
    } else {
      if (req.query.companyId) where.companyId = req.query.companyId as string;
    }

    if (req.query.status && req.query.status !== 'ALL') where.status = req.query.status as string;

    const tickets = await (prisma as any).supportTicket.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, companyName: true, code: true, phone: true, ownerEmail: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true, phone: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, tickets, total: tickets.length });
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    return res.json({ success: true, tickets: [], total: 0 });
  }
};

/**
 * POST /api/support/tickets
 * Create a new support ticket or escalate an in-app AI chat conversation to human support
 */
export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const callerCompanyId = req.user?.companyId || req.body.companyId;
    const userId = req.user?.id;
    const {
      subject,
      category = 'FEATURE_GUIDANCE',
      priority = 'MEDIUM',
      message,
      escalatedFromChat = false,
      chatTranscript,
      userEmail,
      userPhone,
      userName,
    } = req.body;

    if (!callerCompanyId) {
      return res.status(400).json({ success: false, message: 'Company tenant identifier is required.' });
    }

    const company = await prisma.company.findUnique({ where: { id: callerCompanyId } });
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

    const ticketCount = await (prisma as any).supportTicket.count();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

    const finalSubject = subject || (escalatedFromChat ? 'AI Copilot Escalation: User Requested Human Support' : 'Support Request');

    const ticket = await (prisma as any).supportTicket.create({
      data: {
        ticketNumber,
        companyId: callerCompanyId,
        userId: userId || null,
        userName: userName || user?.name || company?.name || 'Client User',
        userEmail: userEmail || user?.email || company?.ownerEmail || 'support@client.com',
        userPhone: userPhone || user?.phone || company?.phone,
        subject: finalSubject,
        category,
        priority,
        status: 'OPEN',
        escalatedFromChat: Boolean(escalatedFromChat),
        chatTranscript: typeof chatTranscript === 'string' ? chatTranscript : (chatTranscript ? JSON.stringify(chatTranscript) : null),
        messages: {
          create: {
            senderType: escalatedFromChat ? 'AI_BOT' : 'USER',
            senderName: userName || user?.name || 'Client User',
            message: message || (escalatedFromChat ? `In-app chat conversation escalated to Human Support. Question/Issue: ${finalSubject}` : finalSubject),
          },
        },
      },
      include: {
        company: true,
        messages: true,
      },
    });

    await logAudit(userId, 'CREATE_SUPPORT_TICKET', 'SUPPORT_TICKET', ticket.id, {
      ticketNumber,
      subject: finalSubject,
      escalatedFromChat,
    }, req.ip);

    return res.status(201).json({
      success: true,
      message: `Support ticket ${ticketNumber} raised successfully! Transferred to Super Admin Support Inbox.`,
      ticket,
    });
  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/support/tickets/:id/messages
 * Reply to a support ticket
 */
export const replySupportTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = String(req.params.id);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const ticket = await (prisma as any).supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const senderName = isSuperAdmin ? 'Platform Support Team' : (req.user?.name || 'Client User');

    const createdMsg = await (prisma as any).supportTicketMessage.create({
      data: {
        ticketId,
        senderType: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        senderName,
        message,
      },
    });

    if (isSuperAdmin && ticket.status === 'OPEN') {
      await (prisma as any).supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return res.json({ success: true, message: 'Reply sent successfully.', ticketMessage: createdMsg });
  } catch (error: any) {
    console.error('Error replying to support ticket:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/support/tickets/:id/status
 * Resolve, close, or re-open a support ticket
 */
export const updateSupportTicketStatus = async (req: Request, res: Response) => {
  try {
    const ticketId = String(req.params.id);
    const { status, resolutionNotes } = req.body;

    const ticket = await (prisma as any).supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const updated = await (prisma as any).supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(resolutionNotes && { resolutionNotes }),
        ...(status === 'RESOLVED' || status === 'CLOSED' ? { resolvedAt: new Date() } : {}),
      },
    });

    return res.json({ success: true, message: `Ticket status updated to ${status}.`, ticket: updated });
  } catch (error: any) {
    console.error('Error updating ticket status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// Client Onboarding & Dynamic Company Branding
// -------------------------------------------------------------

/**
 * POST /api/company/onboarding
 * Mandatory Initial Company Profile Setup Wizard completion
 */
export const completeCompanyOnboarding = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const {
      companyName,
      name,
      logoUrl,
      address,
      businessAddress,
      city,
      state,
      pincode,
      phone,
      email,
      gstin,
      invoiceFooterNotes,
    } = req.body;

    const finalName = companyName || name;
    if (!finalName) {
      return res.status(400).json({ success: false, message: 'Company Name is required.' });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: finalName.trim(),
        companyName: finalName.trim(),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(address && { address }),
        ...(businessAddress && { businessAddress }),
        ...(city && { city }),
        ...(state && { state }),
        ...(pincode && { pincode }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(gstin !== undefined && { gstin }),
        ...(invoiceFooterNotes !== undefined && { invoiceFooterNotes }),
        onboardingCompleted: true,
      },
    });

    await logAudit(req.user?.id, 'COMPLETE_ONBOARDING', 'COMPANY', companyId, {
      companyName: updated.name,
      gstin: updated.gstin,
    }, req.ip);

    return res.json({
      success: true,
      message: `Company profile for "${updated.name}" successfully configured and branding activated across all tenant documents!`,
      company: updated,
    });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/superadmin/clean-database
 * Wipe all operational/project/CRM/financial data across the database while preserving all Tenants & Users
 */
export const cleanLiveDatabase = async (req: Request, res: Response) => {
  try {
    const confirmText = String(req.body?.confirmText || '').trim();
    if (confirmText !== 'CLEAR ALL DATA') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation failed. You must enter "CLEAR ALL DATA" to wipe operational data.',
      });
    }

    const summary = await clearOperationalDataKeepTenants();

    await logAudit(
      req.user?.id,
      'CLEAN_LIVE_DATABASE',
      'SYSTEM',
      'ALL_OPERATIONAL_DATA',
      summary,
      req.ip
    );

    return res.json({
      success: true,
      message: `Live database cleaned! Removed ${summary.totalDeletedRows} operational records while preserving ${summary.preserved.companies} tenants and ${summary.preserved.users} user logins.`,
      summary,
    });
  } catch (error: any) {
    console.error('Error cleaning live database:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
