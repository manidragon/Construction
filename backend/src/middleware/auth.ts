import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'construction_erp_super_secret_jwt_key_2026_secured';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, companyId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is inactive or not found.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // SUPER_ADMIN, OWNER, and TENANT_ADMIN have administrative permissions across relevant modules
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'OWNER' || req.user.role === 'TENANT_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to perform this operation. Required: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

/**
 * Enforce database-level data isolation for queries based on logged-in user's tenantId
 */
export const getTenantFilter = (req: Request) => {
  if (!req.user) return {};
  if (req.user.role === 'SUPER_ADMIN') {
    const requestedTenant = req.query.tenantId as string;
    return requestedTenant ? { tenantId: requestedTenant } : {};
  }
  return { tenantId: req.user.companyId };
};

/**
 * MODULE 3: Trial Expiration Middleware
 * If a company's trial has expired (trialEndDate < currentDate or status === 'EXPIRED'),
 * restrict write/mutation access and return a friendly trial expired response.
 */
export const checkTrialStatus = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // SUPER_ADMIN bypasses trial expiration
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: {
        id: true,
        name: true,
        companyName: true,
        status: true,
        trialStartDate: true,
        trialEndDate: true,
        planType: true,
        ownerEmail: true,
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company tenant profile not found.' });
    }

    if (company.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        accountSuspended: true,
        message: 'Your company account has been suspended by the platform administrator. Please contact support.',
      });
    }

    // Check trial expiration
    const now = new Date();
    const isExpired = company.status === 'EXPIRED' ||
      (company.status === 'TRIAL' && company.trialEndDate && new Date(company.trialEndDate) < now);

    if (isExpired) {
      if (company.status !== 'EXPIRED') {
        await prisma.company.update({
          where: { id: company.id },
          data: { status: 'EXPIRED' },
        });
      }

      // Check if it's an exempt path like checking tenant status or profile
      const exemptPaths = ['/auth/me', '/company/status', '/company/upgrade'];
      const isExempt = exemptPaths.some((p) => req.path.endsWith(p));

      if (!isExempt) {
        return res.status(403).json({
          success: false,
          trialExpired: true,
          companyName: company.companyName || company.name,
          planType: company.planType,
          trialEndDate: company.trialEndDate,
          ownerEmail: company.ownerEmail,
          message: 'Your trial has expired. Contact us to upgrade your subscription and unlock full access.',
        });
      }
    }

    next();
  } catch (error: any) {
    console.error('Error in checkTrialStatus middleware:', error);
    next();
  }
};

export const logAudit = async (
  userId: string | undefined,
  action: string,
  entity: string,
  entityId: string,
  details?: Record<string, any>,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
};
