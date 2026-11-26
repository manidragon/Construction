import prisma from '../src/utils/prisma';
import { postBalancedJournalEntry, COA } from '../src/utils/accounting';

const SQFT_PER_CENT = 435.6;

async function seedRealEstateData() {
  console.log('Seeding Real Estate Land & Plot Layout demo data...');

  const company = await prisma.company.findFirst({
    where: { code: 'APEX-INFRA' },
  });
  if (!company) {
    console.error('APEX-INFRA company not found.');
    return;
  }

  const tenantId = company.id;

  // 1. Create REAL_ESTATE Project
  const reProject = await prisma.project.upsert({
    where: {
      tenantId_code: {
        tenantId,
        code: 'PRJ-RE-001',
      },
    },
    update: {
      totalLandArea: 18.5,
      landAreaUnit: 'ACRES',
      surveyNumber: '88/1A, 88/2B & 89/3',
      layoutApprovalNumber: 'DTCP-BGLR-2026/0442',
      projectType: 'REAL_ESTATE',
      taxRatePercent: 0,
      gstAmount: 0,
      gstMode: 'NO_GST',
    },
    create: {
      tenantId,
      code: 'PRJ-RE-001',
      name: 'Prestige Green Valley Land & Plot Layout',
      description: 'Gated community DTCP approved plotted development across 18.5 acres with 40ft wide blacktop roads, underground cabling, avenue plantation, and clubhouse.',
      projectType: 'REAL_ESTATE',
      clientName: 'Prestige Urban Developers Ltd.',
      clientContact: '+91 80 2559 1080',
      clientEmail: 'projects.plots@prestigeconstructions.com',
      clientBillingAddr: 'The Falcon Tower, 19 Brunton Road, Bengaluru - 560025',
      clientGstin: '29AABCP1122K1Z9',
      siteAddress: 'Survey No. 88/1A, 88/2B & 89/3, Kanakapura Main Road, Harohalli',
      city: 'Bengaluru',
      state: 'Karnataka',
      totalLandArea: 18.5,
      landAreaUnit: 'ACRES',
      surveyNumber: '88/1A, 88/2B & 89/3',
      layoutApprovalNumber: 'DTCP-BGLR-2026/0442',
      contractType: 'ITEM_RATE_BOQ',
      contractValue: 95000000,
      approvedBudget: 75000000,
      plannedStartDate: new Date('2026-01-15'),
      plannedEndDate: new Date('2027-06-30'),
      paymentTerms: 'Token 10%, Agreement 20%, Registration Balance 70%',
      taxRatePercent: 0,
      gstAmount: 0,
      gstMode: 'NO_GST',
      status: 'IN_PROGRESS',
    },
  });

  console.log(`✓ Real Estate Project created: ${reProject.name}`);

  // 2. Batches
  // Batch A: 50 plots of 5 cents
  const batchA = await prisma.plotBatch.upsert({
    where: { id: 'batch-5c-apex' },
    update: {},
    create: {
      id: 'batch-5c-apex',
      tenantId,
      projectId: reProject.id,
      groupName: '5 Cents Premium Villa Plots (50 Plots)',
      numberOfPlots: 50,
      sizeCents: 5.0,
      sizeSqFt: 5.0 * SQFT_PER_CENT,
      ratePerCent: 180000,
      plotPrice: 900000,
      prefix: 'PLOT-5C-',
      startNumber: 1,
      facing: 'EAST',
      notes: 'East & North facing villa plots abutting 40ft central boulevard',
    },
  });

  // Batch B: 30 plots of 3 cents
  const batchB = await prisma.plotBatch.upsert({
    where: { id: 'batch-3c-apex' },
    update: {},
    create: {
      id: 'batch-3c-apex',
      tenantId,
      projectId: reProject.id,
      groupName: '3 Cents Compact Plots (30 Plots)',
      numberOfPlots: 30,
      sizeCents: 3.0,
      sizeSqFt: 3.0 * SQFT_PER_CENT,
      ratePerCent: 200000,
      plotPrice: 600000,
      prefix: 'PLOT-3C-',
      startNumber: 1,
      facing: 'NORTH',
      notes: 'North facing plots near proposed landscaped park & playground',
    },
  });

  // Batch C: 20 plots of 2.5 cents
  const batchC = await prisma.plotBatch.upsert({
    where: { id: 'batch-2.5c-apex' },
    update: {},
    create: {
      id: 'batch-2.5c-apex',
      tenantId,
      projectId: reProject.id,
      groupName: '2.5 Cents Budget Plots (20 Plots)',
      numberOfPlots: 20,
      sizeCents: 2.5,
      sizeSqFt: 2.5 * SQFT_PER_CENT,
      ratePerCent: 220000,
      plotPrice: 550000,
      prefix: 'PLOT-2.5C-',
      startNumber: 1,
      facing: 'WEST',
      notes: 'Compact investment plots facing 30ft avenue',
    },
  });

  console.log(`✓ 3 Plot Batches seeded (50 of 5 cents, 30 of 3 cents, 20 of 2.5 cents)`);

  // 3. Generate Plots
  const existingPlotCount = await prisma.plot.count({ where: { projectId: reProject.id } });
  if (existingPlotCount === 0) {
    const plotsToInsert = [];

    // 50 plots of 5 cents
    for (let i = 1; i <= 50; i++) {
      const num = `PLOT-5C-${String(i).padStart(3, '0')}`;
      plotsToInsert.push({
        tenantId,
        projectId: reProject.id,
        batchId: batchA.id,
        plotNumber: num,
        sizeCents: 5.0,
        sizeSqFt: 5.0 * SQFT_PER_CENT,
        ratePerCent: 180000,
        price: 900000,
        balanceDue: 900000,
        facing: i % 2 === 0 ? 'EAST' : 'NORTH',
        dimensions: '33 x 66',
        status: 'AVAILABLE',
      });
    }

    // 30 plots of 3 cents
    for (let i = 1; i <= 30; i++) {
      const num = `PLOT-3C-${String(i).padStart(3, '0')}`;
      plotsToInsert.push({
        tenantId,
        projectId: reProject.id,
        batchId: batchB.id,
        plotNumber: num,
        sizeCents: 3.0,
        sizeSqFt: 3.0 * SQFT_PER_CENT,
        ratePerCent: 200000,
        price: 600000,
        balanceDue: 600000,
        facing: i % 2 === 0 ? 'NORTH' : 'WEST',
        dimensions: '30 x 43.5',
        status: 'AVAILABLE',
      });
    }

    // 20 plots of 2.5 cents
    for (let i = 1; i <= 20; i++) {
      const num = `PLOT-2.5C-${String(i).padStart(3, '0')}`;
      plotsToInsert.push({
        tenantId,
        projectId: reProject.id,
        batchId: batchC.id,
        plotNumber: num,
        sizeCents: 2.5,
        sizeSqFt: 2.5 * SQFT_PER_CENT,
        ratePerCent: 220000,
        price: 550000,
        balanceDue: 550000,
        facing: 'WEST',
        dimensions: '25 x 43.5',
        status: 'AVAILABLE',
      });
    }

    await prisma.plot.createMany({ data: plotsToInsert });
    console.log(`✓ 100 plots created in database.`);
  }

  // 4. Set up sample bookings & token advances
  // Booking 1: PLOT-5C-001 - Booked with Token Advance
  const plot1 = await prisma.plot.findFirst({ where: { projectId: reProject.id, plotNumber: 'PLOT-5C-001' } });
  if (plot1) {
    // Upsert Client for Ramesh Sundaram
    const clientRamesh = await prisma.client.upsert({
      where: { tenantId_code: { tenantId, code: 'CLI-008' } },
      update: {
        name: 'Ramesh Sundaram',
        phone: '+919845044321',
        email: 'ramesh.sundaram@gmail.com',
        billingAddress: '#42, 4th Cross, Malleshwaram, Bengaluru - 560003',
        pan: '9876-5432-1098',
      },
      create: {
        tenantId,
        code: 'CLI-008',
        name: 'Ramesh Sundaram',
        companyName: 'Individual Plot Buyer',
        contactPerson: 'Ramesh Sundaram',
        phone: '+919845044321',
        email: 'ramesh.sundaram@gmail.com',
        billingAddress: '#42, 4th Cross, Malleshwaram, Bengaluru - 560003',
        pan: '9876-5432-1098',
      },
    });

    // Create / Update Client Invoice (RA Bill) for Plot Sale
    const invRamesh = await prisma.clientInvoice.upsert({
      where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: 'RA-06-RAMESH' } },
      update: {
        clientId: clientRamesh.id,
        projectId: reProject.id,
        subtotal: 900000,
        netInvoiceAmount: 900000,
        paidAmount: 100000,
        balanceDue: 800000,
        status: 'PARTIALLY_PAID',
      },
      create: {
        tenantId,
        invoiceNumber: 'RA-06-RAMESH',
        clientId: clientRamesh.id,
        projectId: reProject.id,
        invoiceType: 'RUNNING_ACCOUNT_RA',
        invoiceDate: new Date('2026-02-10'),
        dueDate: new Date('2026-03-12'),
        subtotal: 900000,
        retentionPercent: 0,
        retentionAmount: 0,
        tdsPercent: 0,
        tdsAmount: 0,
        gstPercent: 0,
        gstAmount: 0,
        netInvoiceAmount: 900000,
        paidAmount: 100000,
        balanceDue: 800000,
        status: 'PARTIALLY_PAID',
        milestoneName: 'Plot PLOT-5C-001 Sale Consideration',
        certificationNotes: 'Sale consideration for Plot #PLOT-5C-001 (5 Cents) at Prestige Green Valley',
      },
    });

    await prisma.plot.update({
      where: { id: plot1.id },
      data: {
        status: 'TOKEN_PAID',
        paymentType: 'TOKEN_ADVANCE',
        clientId: clientRamesh.id,
        buyerName: 'Ramesh Sundaram',
        buyerPhone: '+91 98450 44321',
        buyerEmail: 'ramesh.sundaram@gmail.com',
        buyerAadhaar: '9876-5432-1098',
        buyerAddress: '#42, 4th Cross, Malleshwaram, Bengaluru - 560003',
        tokenAmount: 100000,
        totalReceived: 100000,
        balanceDue: 800000,
        bookingDate: new Date('2026-02-10'),
        paymentMethod: 'CHEQUE',
        chequeNumber: 'CHQ-452109',
        chequeBank: 'HDFC Bank Ltd.',
        chequeDate: new Date('2026-02-10'),
        notes: 'Token advance received via HDFC Cheque #CHQ-452109.',
      },
    });

    // Create / link ClientReceipt
    await prisma.clientReceipt.upsert({
      where: { tenantId_receiptNumber: { tenantId, receiptNumber: 'RCP-PLT-2026-0005' } },
      update: {
        clientId: clientRamesh.id,
        invoiceId: invRamesh.id,
      },
      create: {
        tenantId,
        receiptNumber: 'RCP-PLT-2026-0005',
        projectId: reProject.id,
        clientId: clientRamesh.id,
        invoiceId: invRamesh.id,
        receiptDate: new Date('2026-02-10'),
        amount: 100000,
        paymentMethod: 'CHEQUE',
        referenceNo: 'CHQ-452109',
        notes: 'Token advance for Plot PLOT-5C-001 (Ramesh Sundaram)',
      },
    });
  }

  // Booking 2: PLOT-3C-001 - Booked with Bank Transfer
  const plot2 = await prisma.plot.findFirst({ where: { projectId: reProject.id, plotNumber: 'PLOT-3C-001' } });
  if (plot2) {
    const clientPriya = await prisma.client.upsert({
      where: { tenantId_code: { tenantId, code: 'CLI-009' } },
      update: {
        name: 'Priya Venkatesh',
        phone: '+919980123456',
        email: 'priya.venkatesh@outlook.com',
        billingAddress: '#128, 9th Main, Jayanagar 4th Block, Bengaluru',
      },
      create: {
        tenantId,
        code: 'CLI-009',
        name: 'Priya Venkatesh',
        companyName: 'Individual Plot Buyer',
        contactPerson: 'Priya Venkatesh',
        phone: '+919980123456',
        email: 'priya.venkatesh@outlook.com',
        billingAddress: '#128, 9th Main, Jayanagar 4th Block, Bengaluru',
      },
    });

    const invPriya = await prisma.clientInvoice.upsert({
      where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: 'RA-07-PRIYA' } },
      update: {
        clientId: clientPriya.id,
        projectId: reProject.id,
        subtotal: 600000,
        netInvoiceAmount: 600000,
        paidAmount: 60000,
        balanceDue: 540000,
        status: 'PARTIALLY_PAID',
      },
      create: {
        tenantId,
        invoiceNumber: 'RA-07-PRIYA',
        clientId: clientPriya.id,
        projectId: reProject.id,
        invoiceType: 'RUNNING_ACCOUNT_RA',
        invoiceDate: new Date('2026-02-14'),
        dueDate: new Date('2026-03-16'),
        subtotal: 600000,
        retentionPercent: 0,
        retentionAmount: 0,
        tdsPercent: 0,
        tdsAmount: 0,
        gstPercent: 0,
        gstAmount: 0,
        netInvoiceAmount: 600000,
        paidAmount: 60000,
        balanceDue: 540000,
        status: 'PARTIALLY_PAID',
        milestoneName: 'Plot PLOT-3C-001 Sale Consideration',
        certificationNotes: 'Sale consideration for Plot #PLOT-3C-001 (3 Cents) at Prestige Green Valley',
      },
    });

    await prisma.plot.update({
      where: { id: plot2.id },
      data: {
        status: 'TOKEN_PAID',
        paymentType: 'TOKEN_ADVANCE',
        clientId: clientPriya.id,
        buyerName: 'Priya Venkatesh',
        buyerPhone: '+91 99801 23456',
        buyerEmail: 'priya.venkatesh@outlook.com',
        buyerAddress: '#128, 9th Main, Jayanagar 4th Block, Bengaluru',
        tokenAmount: 60000,
        totalReceived: 60000,
        balanceDue: 540000,
        bookingDate: new Date('2026-02-14'),
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'UTR-SBIN2604509123',
        notes: 'Token paid via NEFT/RTGS UTR-SBIN2604509123.',
      },
    });

    await prisma.clientReceipt.upsert({
      where: { tenantId_receiptNumber: { tenantId, receiptNumber: 'RCP-PLT-2026-0006' } },
      update: {
        clientId: clientPriya.id,
        invoiceId: invPriya.id,
      },
      create: {
        tenantId,
        receiptNumber: 'RCP-PLT-2026-0006',
        projectId: reProject.id,
        clientId: clientPriya.id,
        invoiceId: invPriya.id,
        receiptDate: new Date('2026-02-14'),
        amount: 60000,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'UTR-SBIN2604509123',
        notes: 'Token advance for Plot PLOT-3C-001 (Priya Venkatesh)',
      },
    });
  }

  // Booking 3: PLOT-5C-005 - Handled as TOKEN_LAPSED_NO_SHOW
  const plotLapsed = await prisma.plot.findFirst({ where: { projectId: reProject.id, plotNumber: 'PLOT-5C-005' } });
  if (plotLapsed && plotLapsed.status === 'AVAILABLE') {
    await prisma.plot.update({
      where: { id: plotLapsed.id },
      data: {
        status: 'TOKEN_LAPSED_NO_SHOW',
        buyerName: 'Karthik Varma',
        buyerPhone: '+91 97400 98765',
        buyerEmail: 'karthik.varma@gmail.com',
        tokenAmount: 90000,
        totalReceived: 90000,
        balanceDue: 810000,
        bookingDate: new Date('2026-01-05'),
        paymentMethod: 'CASH',
        notes: 'Buyer paid token advance of ₹90,000 on 05-Jan-2026 but failed to execute sale agreement or respond to notices within 30 days (No-Show). Status marked TOKEN_LAPSED_NO_SHOW; plot ready for release or re-assignment.',
      },
    });

    await prisma.plotBookingHistory.create({
      data: {
        tenantId,
        plotId: plotLapsed.id,
        projectId: reProject.id,
        buyerName: 'Karthik Varma',
        buyerPhone: '+91 97400 98765',
        buyerEmail: 'karthik.varma@gmail.com',
        action: 'TOKEN_BOOKING',
        tokenAmount: 90000,
        totalReceived: 90000,
        balanceDue: 810000,
        paymentMethod: 'CASH',
        notes: 'Initial cash token advance paid.',
        actionDate: new Date('2026-01-05'),
      },
    });

    await prisma.plotBookingHistory.create({
      data: {
        tenantId,
        plotId: plotLapsed.id,
        projectId: reProject.id,
        buyerName: 'Karthik Varma',
        buyerPhone: '+91 97400 98765',
        buyerEmail: 'karthik.varma@gmail.com',
        action: 'TOKEN_LAPSED_NO_SHOW',
        tokenAmount: 90000,
        totalReceived: 90000,
        balanceDue: 810000,
        paymentMethod: 'CASH',
        notes: 'Buyer failed to respond to reminder notices after 30 days. Token advance preserved as per terms; plot marked TOKEN_LAPSED_NO_SHOW.',
        actionDate: new Date('2026-02-05'),
      },
    });

    await postBalancedJournalEntry({
      narration: `Cash token advance for Plot PLOT-5C-005 from Karthik Varma`,
      referenceType: 'CLIENT_RECEIPT',
      referenceId: plotLapsed.id,
      tenantId,
      lines: [
        { accountCode: COA.PETTY_CASH, debit: 90000, credit: 0, projectId: reProject.id },
        { accountCode: COA.CONTRACT_REVENUE, debit: 0, credit: 90000, projectId: reProject.id },
      ],
    });
  }

  // 5. Land Title & Layout Documents
  const existingDocs = await prisma.documentAttachment.count({ where: { projectId: reProject.id } });
  if (existingDocs === 0) {
    await prisma.documentAttachment.createMany({
      data: [
        {
          tenantId,
          projectId: reProject.id,
          title: 'DTCP Master Layout Approval Sanction Order',
          description: 'Official DTCP sanction order #DTCP-BGLR-2026/0442 with approved plotting blueprint & road dedication deed.',
          category: 'PERMIT',
          fileUrl: '/uploads/dtcp-approval-prestige-valley.pdf',
          fileSize: 3145728,
          fileType: 'application/pdf',
          referenceEntity: 'REAL_ESTATE_PROJECT',
          referenceId: reProject.id,
        },
        {
          tenantId,
          projectId: reProject.id,
          title: 'Land Title Legal Search Report (30 Years Clear Title)',
          description: 'Advocate title scrutiny report certifying clear marketable title for Survey Numbers 88/1A, 88/2B & 89/3 without encumbrance.',
          category: 'CONTRACT',
          fileUrl: '/uploads/legal-title-opinion-30yrs.pdf',
          fileSize: 2097152,
          fileType: 'application/pdf',
          referenceEntity: 'REAL_ESTATE_PROJECT',
          referenceId: reProject.id,
        },
        {
          tenantId,
          projectId: reProject.id,
          title: 'Total Station Topographic & Demarcation Survey Drawing',
          description: 'CAD DWG and high-res layout drawing demarcating all 100 plots, boundary stones, storm water drains & 40ft/30ft roads.',
          category: 'DRAWING',
          fileUrl: '/uploads/prestige-green-valley-demarcation-layout.pdf',
          fileSize: 5242880,
          fileType: 'application/pdf',
          referenceEntity: 'REAL_ESTATE_PROJECT',
          referenceId: reProject.id,
        },
      ],
    });
    console.log(`✓ Land layout approval & title documents synchronized to Document Repository.`);
  }

  console.log('✅ Real Estate Land & Plot Layout demo data seeded successfully!');
}

seedRealEstateData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
