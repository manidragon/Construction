import { Request } from 'express';

/**
 * Enforce database-level data isolation for queries based on logged-in user's tenantId.
 * - SuperAdmin can view all or filter by requested ?tenantId=...
 * - Regular users are strictly scoped to their req.user.companyId
 */
export const getTenantFilter = (req: Request) => {
  if (!req.user) return {};
  if (req.user.role === 'SUPER_ADMIN') {
    const requestedTenant = req.query.tenantId as string;
    return requestedTenant ? { tenantId: requestedTenant } : {};
  }
  return { tenantId: req.user.companyId };
};
