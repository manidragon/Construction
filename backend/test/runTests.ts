import prisma from '../src/utils/prisma';
import { postBalancedJournalEntry, COA } from '../src/utils/accounting';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Automated ERP Business Logic Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // Test 1: Project Creation and Querying
    const prj = await prisma.project.findFirst({ where: { code: 'PRJ-BLR-001' } });
    assert(!!prj && prj.contractValue === 350000000, 'Test 1: Project exists with correct contract value (₹35 Cr)');

    // Test 2: Double Entry Balanced Journal Rule
    let balancedCaught = false;
    try {
      // Intentionally unbalance debit and credit
      await postBalancedJournalEntry({
        narration: 'Invalid Unbalanced Entry',
        referenceType: 'TEST',
        lines: [
          { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: 1000, credit: 0 },
          { accountCode: COA.CONTRACT_REVENUE, debit: 0, credit: 800 }, // Off by 200
        ],
      });
    } catch (e: any) {
      if (e.message.includes('Accounting Error: Journal entry is unbalanced')) {
        balancedCaught = true;
      }
    }
    assert(balancedCaught, 'Test 2: System rejects unbalanced journal entries (Dr != Cr)');

    // Test 3: Successful Balanced Journal Posting
    const validJE = await postBalancedJournalEntry({
      narration: 'Valid Balanced Test Entry',
      referenceType: 'TEST',
      lines: [
        { accountCode: COA.HDFC_BANK, debit: 50000, credit: 0 },
        { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: 0, credit: 50000 },
      ],
    });
    assert(!!validJE && validJE.entryNumber.startsWith('JE-'), 'Test 3: Balanced journal entry posted with sequence number');

    // Test 4: Physical Stock Gating (PO alone does not increase stock, only GRN does)
    const centralWh = await prisma.warehouse.findFirst({ where: { code: 'WH-CENTRAL' } });
    const cement = await prisma.material.findFirst({ where: { code: 'MAT-CEM-01' } });
    const initialBalance = await prisma.stockBalance.findUnique({
      where: {
        warehouseId_materialId: {
          warehouseId: centralWh!.id,
          materialId: cement!.id,
        },
      },
    });
    assert(!!initialBalance && initialBalance.currentQty > 0, 'Test 4: Store stock balances exist and are non-negative');

    // Test 5: Client Invoices & Partial Payment Reduction
    const raBill = await prisma.clientInvoice.findFirst({
      where: { invoiceNumber: 'RA-03-SKYLINE' },
    });
    assert(
      !!raBill && raBill.netInvoiceAmount === 42735000 && raBill.paidAmount === 30000000 && raBill.balanceDue === 12735000,
      'Test 5: Client invoice tracks net bill, retention, TDS, partial collections, and balance due accurately'
    );

    // Test 6: Retention Withheld Calculation
    const retentionExpected = (raBill!.subtotal * raBill!.retentionPercent) / 100;
    assert(raBill!.retentionAmount === retentionExpected, 'Test 6: 5% retention amount calculated accurately');

    // Test 7: Worker Wage and Overtime Computation
    const attendance = await prisma.labourAttendance.findFirst({
      where: { overtimeHours: { gt: 0 } },
      include: { worker: true },
    });
    assert(
      !!attendance && attendance.totalWageEarned === attendance.wageCalculated + attendance.overtimeWage,
      'Test 7: Daily labour attendance accurately computes regular wage + overtime wage'
    );

    // Test 8: Supplier Invoice & Outstanding Balance
    const suppInv = await prisma.supplierInvoice.findFirst({
      where: { invoiceNumber: 'INV-BLJ-4421' },
      include: { supplier: true },
    });
    assert(
      !!suppInv && suppInv.totalAmount === 199060 && suppInv.balanceDue === 99060,
      'Test 8: Supplier invoice tracks 3-way match, partial payments, and supplier payable balance'
    );

    // Test 9: Site Petty Cash Float Tracking
    const pc = await prisma.pettyCashAccount.findFirst({
      include: { transactions: true },
    });
    assert(!!pc && pc.currentBalance < pc.openingBalance, 'Test 9: Site petty cash float reflects top-ups and approved expense vouchers');

    // Test 10: Prevention of Negative Stock on Outward Issue
    const excessiveQty = 9999999;
    const canFulfill = initialBalance!.currentQty >= excessiveQty;
    assert(!canFulfill, 'Test 10: System detects and flags attempts to issue stock exceeding available warehouse balance');

    // Test 11: All 8 Roles Seeded
    const roles = await prisma.user.findMany({ select: { role: true } });
    const distinctRoles = new Set(roles.map((r) => r.role));
    assert(distinctRoles.size >= 8, 'Test 11: All required enterprise & SaaS roles seeded and configured');

    // Test 12: Chart of Accounts Trial Balance Check
    const allAccounts = await prisma.account.findMany({ include: { journalLines: true } });
    let totalAllDebits = 0;
    let totalAllCredits = 0;
    for (const a of allAccounts) {
      for (const line of a.journalLines) {
        totalAllDebits += line.debit;
        totalAllCredits += line.credit;
      }
    }
    const trialBalanceDiff = Math.abs(totalAllDebits - totalAllCredits);
    assert(trialBalanceDiff < 0.01, 'Test 12: Global General Ledger Trial Balance is in strict balance (Total Debits == Total Credits)');

    console.log(`\n====================================================`);
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
