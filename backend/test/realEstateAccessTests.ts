import prisma from '../src/utils/prisma';
import { requireRealEstateFeature, isRealEstateEnabledForUser } from '../src/middleware/auth';
import { updateTenantFeatures } from '../src/controllers/tenantController';
import { createProject } from '../src/controllers/projectController';
import { createLead } from '../src/controllers/leadController';
import { getExecutiveMetrics } from '../src/controllers/dashboardController';
import { getDropdownOptions } from '../src/controllers/dropdownController';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function runAccessTests() {
  console.log('====================================================');
  console.log('🔐 Starting Real Estate Tenant Access Control Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}${details ? ` (${details})` : ''}`);
      failed++;
    }
  }

  let testCompanyId: string | null = null;

  try {
    const code = `RE-GATE-${Date.now().toString().slice(-5)}`;
    const company = await prisma.company.create({
      data: {
        name: 'Real Estate Gate Test Co',
        companyName: 'Real Estate Gate Test Co',
        code,
        ownerEmail: `${code.toLowerCase()}@example.com`,
        status: 'ACTIVE',
        planType: 'PRO',
        address: 'Test Address',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        phone: '+91 90000 11111',
        email: `${code.toLowerCase()}@example.com`,
      },
    });
    testCompanyId = company.id;

    assert(company.realEstateEnabled === false, 'New tenant defaults to realEstateEnabled = false');

    // Test middleware when disabled
    const disabledReq: any = {
      user: {
        id: 'u-1',
        name: 'Tenant Owner',
        email: company.email,
        role: 'OWNER',
        companyId: company.id,
        realEstateEnabled: false,
      },
      query: {},
      ip: '127.0.0.1',
    };
    assert(!isRealEstateEnabledForUser(disabledReq), 'isRealEstateEnabledForUser returns false when disabled');

    let nextCalled = false;
    const mwResDisabled = createMockRes();
    requireRealEstateFeature(disabledReq, mwResDisabled, () => {
      nextCalled = true;
    });
    assert(
      !nextCalled && mwResDisabled.statusCode === 403 && mwResDisabled.body?.featureLocked === true,
      'requireRealEstateFeature blocks plot endpoints with 403 when disabled'
    );

    // Test createProject blocked for REAL_ESTATE when disabled
    const projRes = createMockRes();
    await createProject(
      {
        ...disabledReq,
        body: {
          code: `PRJ-${code}`,
          name: 'Blocked Land Layout',
          clientName: 'Direct Buyers',
          siteAddress: 'Test Road',
          projectType: 'REAL_ESTATE',
          plannedStartDate: '2026-01-01',
          plannedEndDate: '2026-12-31',
        },
      } as any,
      projRes
    );
    assert(
      projRes.statusCode === 403 && projRes.body?.featureLocked === true,
      'createProject rejects REAL_ESTATE project creation when disabled'
    );

    // Test createLead blocked for REAL_ESTATE_PLOT when disabled
    const leadRes = createMockRes();
    await createLead(
      {
        ...disabledReq,
        body: {
          clientName: 'Plot Buyer',
          contactNumber: '+91 9876543210',
          siteAddress: 'Kanakapura Road',
          projectType: 'REAL_ESTATE',
          interestCategory: 'REAL_ESTATE_PLOT',
        },
      } as any,
      leadRes
    );
    assert(
      leadRes.statusCode === 403 && leadRes.body?.featureLocked === true,
      'createLead rejects REAL_ESTATE_PLOT lead creation when disabled'
    );

    // Test dashboard returns realEstateSummary = null when disabled
    const dashRes = createMockRes();
    await getExecutiveMetrics(disabledReq, dashRes);
    assert(
      dashRes.statusCode === 200 && dashRes.body?.summary?.realEstateSummary === null,
      'getExecutiveMetrics omits realEstateSummary when disabled'
    );

    // Test dropdowns filter out REAL_ESTATE when disabled
    const ddRes = createMockRes();
    await getDropdownOptions({ ...disabledReq, query: { category: 'ServiceType' } } as any, ddRes);
    const hasRealEstateOptionDisabled = (ddRes.body?.data || []).some(
      (opt: any) => opt.value === 'REAL_ESTATE'
    );
    assert(!hasRealEstateOptionDisabled, 'getDropdownOptions hides REAL_ESTATE option when disabled');

    // Test Super Admin enabling realEstateEnabled via updateTenantFeatures
    const toggleRes = createMockRes();
    await updateTenantFeatures(
      {
        params: { id: company.id },
        body: { realEstateEnabled: true },
        user: { id: undefined, role: 'SUPER_ADMIN', companyId: company.id, name: 'SA', email: 'sa@test.com', realEstateEnabled: true },
        ip: '127.0.0.1',
      } as any,
      toggleRes
    );
    const updatedCompany = await prisma.company.findUnique({ where: { id: company.id } });
    assert(
      toggleRes.statusCode === 200 && updatedCompany?.realEstateEnabled === true,
      'updateTenantFeatures enables realEstateEnabled on tenant in DB'
    );

    // Test middleware & dropdowns when enabled
    const enabledReq: any = {
      ...disabledReq,
      user: { ...disabledReq.user, realEstateEnabled: true },
    };
    let enabledNextCalled = false;
    const mwResEnabled = createMockRes();
    requireRealEstateFeature(enabledReq, mwResEnabled, () => {
      enabledNextCalled = true;
    });
    assert(enabledNextCalled, 'requireRealEstateFeature allows access once enabled');

    const ddResEnabled = createMockRes();
    await getDropdownOptions({ ...enabledReq, query: { category: 'ServiceType' } } as any, ddResEnabled);
    const hasRealEstateOptionEnabled = (ddResEnabled.body?.data || []).some(
      (opt: any) => opt.value === 'REAL_ESTATE'
    );
    assert(hasRealEstateOptionEnabled, 'getDropdownOptions restores REAL_ESTATE option when enabled');
  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (testCompanyId) {
      await prisma.auditLog.deleteMany({ where: { tenantId: testCompanyId } }).catch(() => {});
      await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`📊 Access Control Tests: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runAccessTests();
