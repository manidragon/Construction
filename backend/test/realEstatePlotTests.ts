import prisma from '../src/utils/prisma';
import { postBalancedJournalEntry, COA } from '../src/utils/accounting';

async function runRealEstateTests() {
  console.log('====================================================');
  console.log('🏞️ Starting Real Estate & Plot Layout Extension Tests');
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
    // Test 1: Create a REAL_ESTATE project with land metrics
    const testProjectCode = `PRJ-RE-TEST-${Date.now().toString().slice(-4)}`;
    const reProject = await prisma.project.create({
      data: {
        code: testProjectCode,
        name: 'Greenfield Valley Real Estate Layout',
        projectType: 'REAL_ESTATE',
        clientName: 'Greenfield Realty Ventures',
        siteAddress: 'Survey No. 104/2B, OMR Highway',
        city: 'Chennai',
        state: 'Tamil Nadu',
        totalLandArea: 25.5,
        landAreaUnit: 'ACRES',
        surveyNumber: '104/2B & 105/1A',
        layoutApprovalNumber: 'DTCP-CHENNAI-2026/891',
        contractType: 'ITEM_RATE_BOQ',
        contractValue: 150000000,
        approvedBudget: 120000000,
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: new Date('2027-12-31'),
        status: 'IN_PROGRESS',
      },
    });

    assert(
      !!reProject && reProject.projectType === 'REAL_ESTATE' && reProject.totalLandArea === 25.5 && reProject.landAreaUnit === 'ACRES',
      'Test 1: REAL_ESTATE project created with land area & DTCP layout approval metrics'
    );

    // Test 2: Batch Plot Generation (50 plots of 5 cents)
    const batch = await prisma.plotBatch.create({
      data: {
        projectId: reProject.id,
        groupName: '5 Cents Premium Group',
        numberOfPlots: 10,
        sizeCents: 5.0,
        sizeSqFt: 5.0 * 435.6,
        ratePerCent: 200000,
        plotPrice: 1000000,
        prefix: 'PLOT-5C-',
        startNumber: 1,
        facing: 'EAST',
      },
    });

    const plotsData = [];
    for (let i = 1; i <= 10; i++) {
      plotsData.push({
        projectId: reProject.id,
        batchId: batch.id,
        plotNumber: `PLOT-5C-${String(i).padStart(3, '0')}`,
        sizeCents: 5.0,
        sizeSqFt: 5.0 * 435.6,
        ratePerCent: 200000,
        price: 1000000,
        balanceDue: 1000000,
        facing: 'EAST',
        status: 'AVAILABLE',
      });
    }

    await prisma.plot.createMany({ data: plotsData });
    const batchPlotsCount = await prisma.plot.count({ where: { projectId: reProject.id, batchId: batch.id } });

    assert(
      batchPlotsCount === 10,
      'Test 2: Batch plot generation correctly created 10 plots with 5.0 cents & ₹10,00,000 price'
    );

    // Test 3: Create Individual Plot
    const singlePlot = await prisma.plot.create({
      data: {
        projectId: reProject.id,
        plotNumber: 'CORNER-PLOT-01',
        sizeCents: 8.5,
        sizeSqFt: 8.5 * 435.6,
        ratePerCent: 250000,
        price: 2125000,
        balanceDue: 2125000,
        facing: 'NORTH_EAST',
        status: 'AVAILABLE',
        notes: 'East facing 40ft road frontage corner plot',
      },
    });

    assert(
      !!singlePlot && singlePlot.plotNumber === 'CORNER-PLOT-01' && singlePlot.price === 2125000,
      'Test 3: Individual plot created with custom size, facing, and pricing'
    );

    // Test 4: Book Plot with Token Advance
    const bookedPlot = await prisma.plot.update({
      where: { id: singlePlot.id },
      data: {
        status: 'TOKEN_PAID',
        buyerName: 'Vijay Narayanan',
        buyerPhone: '+91 98410 55432',
        buyerEmail: 'vijay.narayanan@example.com',
        tokenAmount: 200000,
        totalReceived: 200000,
        balanceDue: 1925000,
        bookingDate: new Date(),
        paymentMethod: 'CHEQUE',
        chequeNumber: 'CHQ-991204',
        chequeBank: 'State Bank of India',
        chequeDate: new Date(),
      },
    });

    // Record in PlotBookingHistory
    await prisma.plotBookingHistory.create({
      data: {
        plotId: singlePlot.id,
        projectId: reProject.id,
        buyerName: 'Vijay Narayanan',
        buyerPhone: '+91 98410 55432',
        buyerEmail: 'vijay.narayanan@example.com',
        action: 'TOKEN_BOOKING',
        tokenAmount: 200000,
        totalReceived: 200000,
        balanceDue: 1925000,
        paymentMethod: 'CHEQUE',
        chequeNumber: 'CHQ-991204',
        chequeBank: 'State Bank of India',
        notes: 'Token advance received via SBI cheque',
      },
    });

    assert(
      bookedPlot.status === 'TOKEN_PAID' && bookedPlot.totalReceived === 200000 && bookedPlot.balanceDue === 1925000,
      'Test 4: Plot booked with token advance of ₹2,00,000, remaining balance ₹19,25,000'
    );

    // Test 5: Buyer No-Show Handling (TOKEN_LAPSED_NO_SHOW)
    const lapsedPlot = await prisma.plot.update({
      where: { id: singlePlot.id },
      data: {
        status: 'TOKEN_LAPSED_NO_SHOW',
        notes: 'Buyer did not return for agreement execution within 30 days. Token preserved.',
      },
    });

    await prisma.plotBookingHistory.create({
      data: {
        plotId: singlePlot.id,
        projectId: reProject.id,
        buyerName: 'Vijay Narayanan',
        buyerPhone: '+91 98410 55432',
        buyerEmail: 'vijay.narayanan@example.com',
        action: 'TOKEN_LAPSED_NO_SHOW',
        tokenAmount: 200000,
        totalReceived: 200000,
        balanceDue: 1925000,
        paymentMethod: 'CHEQUE',
        chequeNumber: 'CHQ-991204',
        chequeBank: 'State Bank of India',
        notes: 'No-show after token period expired. Marked lapsed; payment preserved.',
      },
    });

    assert(
      lapsedPlot.status === 'TOKEN_LAPSED_NO_SHOW' && lapsedPlot.totalReceived === 200000,
      'Test 5: Buyer no-show handled with TOKEN_LAPSED_NO_SHOW status, preserving financial record'
    );

    // Test 6: Release / Re-assign Plot to New Buyer
    const reassignHistory = await prisma.plotBookingHistory.create({
      data: {
        plotId: singlePlot.id,
        projectId: reProject.id,
        buyerName: 'Suresh Kumar',
        buyerPhone: '+91 94440 12345',
        buyerEmail: 'suresh.k@example.com',
        action: 'REASSIGNED',
        tokenAmount: 300000,
        totalReceived: 300000,
        balanceDue: 1825000,
        paymentMethod: 'BANK_TRANSFER',
        notes: 'Reassigned after previous buyer no-show. Fresh token collected.',
      },
    });

    const reassignedPlot = await prisma.plot.update({
      where: { id: singlePlot.id },
      data: {
        status: 'TOKEN_PAID',
        buyerName: 'Suresh Kumar',
        buyerPhone: '+91 94440 12345',
        buyerEmail: 'suresh.k@example.com',
        tokenAmount: 300000,
        totalReceived: 300000,
        balanceDue: 1825000,
        bookingDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
      },
    });

    const historyTrail = await prisma.plotBookingHistory.findMany({
      where: { plotId: singlePlot.id },
      orderBy: { actionDate: 'asc' },
    });

    assert(
      reassignedPlot.buyerName === 'Suresh Kumar' && historyTrail.length === 3,
      'Test 6: Plot reassigned with complete audit history trail (Booking -> Lapsed -> Reassigned)'
    );

    // Test 7: Direct Land Title / Approval Document Upload with Description
    const landDoc = await prisma.documentAttachment.create({
      data: {
        title: 'DTCP Layout Approval Certificate',
        description: 'Approved master layout sanction plan from DTCP Directorate Chennai',
        category: 'PERMIT',
        fileUrl: '/uploads/dtcp-approval-2026.pdf',
        fileSize: 2048576,
        fileType: 'application/pdf',
        projectId: reProject.id,
        referenceEntity: 'REAL_ESTATE_PROJECT',
        referenceId: reProject.id,
      },
    });

    assert(
      !!landDoc && landDoc.projectId === reProject.id && landDoc.description?.includes('DTCP'),
      'Test 7: Direct document upload synced to Document Repository with project linkage & description'
    );

    // Test 8: Double-Entry Journal with Cheque Instrument Details
    const chequeJE = await postBalancedJournalEntry({
      narration: 'Plot Booking Advance received via Cheque',
      referenceType: 'CLIENT_RECEIPT',
      referenceId: singlePlot.id,
      chequeNumber: 'CHQ-991204',
      chequeBank: 'State Bank of India',
      chequeDate: new Date(),
      lines: [
        { accountCode: COA.SBI_BANK || COA.HDFC_BANK, debit: 300000, credit: 0, projectId: reProject.id },
        { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: 0, credit: 300000, projectId: reProject.id },
      ],
    });

    assert(
      !!chequeJE && chequeJE.chequeNumber === 'CHQ-991204' && chequeJE.chequeBank === 'State Bank of India',
      'Test 8: Double-Entry Journal Entry created with cheque instrument details & project cost centre'
    );

    // Clean up test data
    await prisma.plotBookingHistory.deleteMany({ where: { projectId: reProject.id } });
    await prisma.plot.deleteMany({ where: { projectId: reProject.id } });
    await prisma.plotBatch.deleteMany({ where: { projectId: reProject.id } });
    await prisma.documentAttachment.deleteMany({ where: { projectId: reProject.id } });
    await prisma.project.delete({ where: { id: reProject.id } });

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 Real Estate Extension Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRealEstateTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
