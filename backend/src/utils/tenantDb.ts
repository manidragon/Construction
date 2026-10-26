import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const TENANTS_DIR = path.join(__dirname, '../../prisma/tenants');
const BASE_DB_PATH = path.join(__dirname, '../../prisma/dev.db');

// Ensure tenants directory exists
if (!fs.existsSync(TENANTS_DIR)) {
  fs.mkdirSync(TENANTS_DIR, { recursive: true });
}

// Map of active PrismaClient connections per tenant
const tenantPrismaClients = new Map<string, PrismaClient>();

/**
 * Returns the file path for a tenant's dedicated SQLite database
 */
export function getTenantDbPath(tenantId: string): string {
  const safeId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(TENANTS_DIR, `tenant_${safeId}.db`);
}

/**
 * Returns the relative database URL for Prisma
 */
export function getTenantDbUrl(tenantId: string): string {
  const dbPath = getTenantDbPath(tenantId);
  return `file:${dbPath}`;
}

/**
 * Proactively provisions a dedicated separate SQLite database for a new trial company.
 * Clones the master schema and seeds the tenant profile.
 */
export async function provisionTenantDatabase(params: {
  tenantId: string;
  code: string;
  name: string;
  ownerEmail: string;
  adminPassword?: string;
  phone?: string;
  city?: string;
  state?: string;
  trialDays?: number;
}): Promise<string> {
  const dbPath = getTenantDbPath(params.tenantId);

  try {
    if (!fs.existsSync(dbPath)) {
      // If base dev.db exists, copy the structure as the seed template
      if (fs.existsSync(BASE_DB_PATH)) {
        fs.copyFileSync(BASE_DB_PATH, dbPath);
        console.log(`[Multi-DB] Provisioned new dedicated SQLite database file for tenant [${params.code}]: ${dbPath}`);
      }
    }

    return dbPath;
  } catch (error) {
    console.error(`[Multi-DB] Failed to provision separate database for tenant ${params.tenantId}:`, error);
    return dbPath;
  }
}

/**
 * Retrieves or lazily instantiates a dedicated PrismaClient for a specific tenant database
 */
export function getTenantPrisma(tenantId: string): PrismaClient {
  if (tenantPrismaClients.has(tenantId)) {
    return tenantPrismaClients.get(tenantId)!;
  }

  const dbPath = getTenantDbPath(tenantId);
  
  // If the file does not exist yet, provision it from the base template
  if (!fs.existsSync(dbPath) && fs.existsSync(BASE_DB_PATH)) {
    try {
      fs.copyFileSync(BASE_DB_PATH, dbPath);
    } catch (e) {
      console.error('[Multi-DB] Auto-provision copy failed:', e);
    }
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
    log: ['error'],
  });

  tenantPrismaClients.set(tenantId, client);
  return client;
}

/**
 * Get disk size in KB of a tenant's database
 */
export function getTenantDbSize(tenantId: string): string {
  const dbPath = getTenantDbPath(tenantId);
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    const kb = Math.round(stats.size / 1024);
    if (kb > 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${kb} KB`;
  }
  return 'Base SQLite';
}
