import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { provisionTenantDatabase } from '../utils/tenantDb';

const JWT_SECRET = process.env.JWT_SECRET || 'construction_erp_super_secret_jwt_key_2026_secured';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { company: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or user account is inactive.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password does not match.' });
    }

    const cleanRole = (user.role === 'TENANT_ADMIN' || user.role === 'OWNER') ? 'OWNER' : user.role;

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: cleanRole,
      companyId: user.companyId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    await logAudit(user.id, 'LOGIN', 'USER', user.id, { email: user.email, role: cleanRole }, req.ip);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: cleanRole,
        designation: user.designation,
        phone: user.phone,
        company: user.company,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

/**
 * Dedicated Platform Super Admin / Vendor Login
 * Strictly authorizes SaaS platform operators to manage tenants & trial lifecycles
 */
export const superAdminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Super admin email and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: String(email).trim().toLowerCase(),
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid platform credentials or user is not authorized as a SaaS Platform Administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'SUPER_ADMIN',
      companyId: user.companyId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    await logAudit(user.id, 'SUPER_ADMIN_LOGIN', 'USER', user.id, { email: user.email }, req.ip);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'SUPER_ADMIN',
        designation: user.designation,
        isPlatformAdmin: true,
      },
    });
  } catch (error: any) {
    console.error('Super Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during super admin login.' });
  }
};

/**
 * Demo Quick Switcher: Allows evaluators to switch roles with a single click
 */
export const switchRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    let roleFilter: any = role;
    if (role === 'OWNER' || role === 'TENANT_ADMIN') {
      roleFilter = { in: ['OWNER', 'TENANT_ADMIN'] };
    }

    const user = await prisma.user.findFirst({
      where: { role: roleFilter, isActive: true },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: `No active user found for role ${role}` });
    }

    const cleanRole = (user.role === 'TENANT_ADMIN' || user.role === 'OWNER') ? 'OWNER' : user.role;

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: cleanRole,
      companyId: user.companyId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: cleanRole,
        designation: user.designation,
        phone: user.phone,
        company: user.company,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        company: true,
        assignedProjects: {
          include: { project: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const cleanRole = (user.role === 'TENANT_ADMIN' || user.role === 'OWNER') ? 'OWNER' : user.role;

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: cleanRole,
        designation: user.designation,
        phone: user.phone,
        company: user.company,
        assignedProjects: user.assignedProjects,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public Self-Serve Signup: Register a new company for a 14-day free trial directly
 */
export const signupTrial = async (req: Request, res: Response) => {
  try {
    const ownerName = req.body.ownerName || req.body.fullName;
    const { companyName, email, password, phone, city = 'Bengaluru', state = 'Karnataka' } = req.body;

    if (!companyName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Company name, owner name, work email, and password are required.',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with email "${normalizedEmail}" already exists. Please log in instead.`,
      });
    }

    // Auto-generate company code
    const count = await prisma.company.count();
    const cleanSlug = companyName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    const code = `${cleanSlug || 'ORG'}-${String(count + 1).padStart(3, '0')}`;

    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days free trial

    const passwordHash = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        companyName: companyName.trim(),
        code,
        ownerEmail: normalizedEmail,
        adminPassword: password,
        databasePath: `./tenants/tenant_${code}.db`,
        status: 'TRIAL',
        trialStartDate,
        trialEndDate,
        planType: 'FREE_TRIAL',
        address: `${city}, ${state}`,
        city,
        state,
        pincode: '560001',
        phone: phone || '+91 90000 00000',
        email: normalizedEmail,
        useSharedGateway: true,
      },
    });

    // Provision dedicated isolated database file for this trial company
    await provisionTenantDatabase({
      tenantId: company.id,
      code: company.code,
      name: company.name,
      ownerEmail: company.ownerEmail || '',
      adminPassword: password,
      phone: company.phone,
      city,
      state,
      trialDays: 14,
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: ownerName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
        role: 'TENANT_ADMIN',
        designation: 'Managing Director / Business Owner',
        isActive: true,
      },
    });

    // Record welcome WhatsApp log
    await prisma.whatsAppLog.create({
      data: {
        tenantId: company.id,
        recipientPhone: phone || '+91 90000 00000',
        recipientName: user.name,
        messageType: 'TRIAL_WELCOME',
        messageBody: `Welcome to Construction & Interior ERP! Your 14-day free trial for ${company.name} is now active until ${trialEndDate.toLocaleDateString()}. Experience effortless lead tracking, BOQ quotations, and project invoicing.`,
        status: 'SENT',
        gatewayUsed: 'SHARED_GATEWAY',
        sentById: user.id,
      },
    });

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    await logAudit(user.id, 'SIGNUP_TRIAL', 'USER', user.id, {
      companyName: company.name,
      companyCode: company.code,
      trialDays: 14,
    }, req.ip);

    return res.status(201).json({
      success: true,
      message: `Welcome to your 14-day free trial, ${user.name}! Your workspace is ready.`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        phone: user.phone,
        company,
      },
    });
  } catch (error: any) {
    console.error('Error during trial signup:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    // Enforce data isolation: scope users by logged-in user's company unless SUPER_ADMIN
    const where: any = {};
    if (req.user?.role !== 'SUPER_ADMIN') {
      where.companyId = req.user?.companyId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        phone: true,
        isActive: true,
        companyId: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
