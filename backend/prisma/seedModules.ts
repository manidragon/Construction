import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Construction & Interior Leads, BOQ Quotations & Milestone Invoices...');

  // Get project manager and owner users
  const pmUser = await prisma.user.findFirst({ where: { role: 'PROJECT_MANAGER' } });
  const ownerUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  const existingProject = await prisma.project.findFirst({ where: { status: 'ACTIVE' } });

  // 1. Leads across pipeline stages
  const sampleLeads = [
    {
      leadNumber: 'LEAD-2026-001',
      clientName: 'Dr. Arvind & Malini Varma',
      contactNumber: '+919845123456',
      email: 'arvind.varma@medico.org',
      siteAddress: 'Villa 42, Palm Meadows Luxury Enclave, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'RESIDENTIAL_INTERIOR',
      budgetRange: '50L_1CR',
      source: 'INSTAGRAM',
      stage: 'BOQ_QUOTATION_SHARED',
      assignedTeam: 'DESIGN_TEAM',
      assignedProjectManagerId: pmUser?.id || null,
      siteVisitDate: new Date('2026-03-10'),
      siteVisitNotes: 'Client prefers Italian marble flooring and minimalist Scandinavian woodwork. High priority on soundproofing study room.',
      clientBudgetDiscussion: 'Initial budget quoted at ₹65 Lakhs. Client is flexible up to ₹72 Lakhs if German hardware (Hafele/Blum) is included.',
    },
    {
      leadNumber: 'LEAD-2026-002',
      clientName: 'Nexus Techspaces LLP (Karthik S.)',
      contactNumber: '+919988776655',
      email: 'karthik@nexustech.io',
      siteAddress: '5th Floor, Tower B, Embassy TechVillage, Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'COMMERCIAL_FITOUT',
      budgetRange: '1CR_2.5CR',
      source: 'ARCHITECT_REFERRAL',
      stage: 'NEGOTIATION',
      assignedTeam: 'EXECUTION_TEAM',
      assignedProjectManagerId: pmUser?.id || null,
      siteVisitDate: new Date('2026-03-14'),
      siteVisitNotes: '10,000 sq.ft office fit-out. 120 workstations, 4 conference rooms, cafeteria, and acoustic baffle ceiling required.',
      clientBudgetDiscussion: 'Commercial contract value discussed around ₹1.85 Cr including 18% GST. Advance terms requested: 50% mobilization.',
    },
    {
      leadNumber: 'LEAD-2026-003',
      clientName: 'Sanjay & Sunita Singhania',
      contactNumber: '+919876543210',
      email: 'singhania.s@realtygroup.in',
      siteAddress: 'Plot 88, Brigade Orchards, Devanahalli',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'FULL_VILLA_CONSTRUCTION',
      budgetRange: '2.5CR_PLUS',
      source: 'REFERRAL',
      stage: 'SITE_MEASUREMENT_COMPLETED',
      assignedTeam: 'EXECUTION_TEAM',
      assignedProjectManagerId: pmUser?.id || null,
      siteVisitDate: new Date('2026-03-18'),
      siteVisitNotes: 'Total build area 5,400 sq.ft. G+2 structure with swimming pool deck and home theatre. Structural soil test report verified.',
      clientBudgetDiscussion: 'Estimated civil construction + MEP + interior finishing turnkey target at ₹3.2 Crores.',
    },
    {
      leadNumber: 'LEAD-2026-004',
      clientName: 'Priya Narayanan',
      contactNumber: '+919845012399',
      email: 'priya.n@designhaus.in',
      siteAddress: 'Apt 1204, Salarpuria Sattva Magnificence, Bannerghatta Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'RENOVATION',
      budgetRange: '25L_50L',
      source: 'WEBSITE',
      stage: 'SITE_VISIT_SCHEDULED',
      assignedTeam: 'DESIGN_TEAM',
      assignedProjectManagerId: pmUser?.id || null,
      siteVisitDate: new Date('2026-03-25'),
      siteVisitNotes: 'Full kitchen and bathroom remodelling. Needs replacement of old plumbing stacks and modular island counter.',
      clientBudgetDiscussion: 'Budget cap at ₹35 Lakhs inclusive of all materials and demolition.',
    },
    {
      leadNumber: 'LEAD-2026-005',
      clientName: 'Rajeev Malhotra',
      contactNumber: '+919811223344',
      email: 'rajeev.m@outlook.com',
      siteAddress: 'Penthouse 14A, Sobha HRC Pristine, Jakkur',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'RESIDENTIAL_INTERIOR',
      budgetRange: '50L_1CR',
      source: 'GOOGLE_ADS',
      stage: 'NEW_LEAD',
      assignedTeam: 'SALES_TEAM',
      assignedProjectManagerId: pmUser?.id || null,
      siteVisitDate: null,
      siteVisitNotes: 'Inquired online for 4BHK interior fit-out. Requested portfolio of completed luxury penthouses.',
      clientBudgetDiscussion: 'Expecting estimates between ₹55L - ₹65L.',
    },
    {
      leadNumber: 'LEAD-2026-006',
      clientName: 'Kaveri Coffee Roasters (Anand K.)',
      contactNumber: '+919740112233',
      email: 'anand@kavericoffee.com',
      siteAddress: '100ft Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'COMMERCIAL_FITOUT',
      budgetRange: '25L_50L',
      source: 'WALKIN',
      stage: 'LEAD_LOST',
      lostReason: 'Client chose local contractor due to lower pricing on basic ply specifications.',
      assignedTeam: 'SALES_TEAM',
      assignedProjectManagerId: pmUser?.id || null,
      siteVisitDate: new Date('2026-02-15'),
      siteVisitNotes: 'Cafe fit-out with exposed brick and rustic metal fabrication.',
      clientBudgetDiscussion: 'Client wanted commercial cafe fitout completed within ₹18 Lakhs.',
    },
  ];

  for (const l of sampleLeads) {
    await prisma.lead.upsert({
      where: { leadNumber: l.leadNumber },
      update: {},
      create: l,
    });
  }
  console.log(`✓ Seeded ${sampleLeads.length} leads across pipeline stages.`);

  // 2. BOQ Quotations
  const lead1 = await prisma.lead.findUnique({ where: { leadNumber: 'LEAD-2026-001' } });
  const lead2 = await prisma.lead.findUnique({ where: { leadNumber: 'LEAD-2026-002' } });

  // Quotation 1: Exclusive GST (+18%)
  const quot1Items = [
    {
      areaRoom: 'Living Room',
      workDescription: 'TV Unit in 19mm Greenply BWR Plywood with Century Laminate & Charcoal Louvers',
      unit: 'SQFT',
      quantity: 85,
      rate: 1850,
      totalAmount: 157250,
    },
    {
      areaRoom: 'Living Room',
      workDescription: 'Gyproc False Ceiling with perimeter cove lighting trough & Philips LED strips',
      unit: 'SQFT',
      quantity: 240,
      rate: 145,
      totalAmount: 34800,
    },
    {
      areaRoom: 'Kitchen Modular Units',
      workDescription: 'Base and overhead modular cabinets with Hettich soft-close tandem drawers & acrylic shutters',
      unit: 'RFT',
      quantity: 26,
      rate: 3400,
      totalAmount: 88400,
    },
    {
      areaRoom: 'Kitchen Modular Units',
      workDescription: 'Quartz kitchen countertop (20mm Kalinga Stone) with bevel edge profiling and undermount sink',
      unit: 'SQFT',
      quantity: 48,
      rate: 950,
      totalAmount: 45600,
    },
    {
      areaRoom: 'Master Bedroom',
      workDescription: 'Floor-to-ceiling sliding wardrobe in 18mm MR Plywood with PU paint finish and fluted glass',
      unit: 'SQFT',
      quantity: 75,
      rate: 2200,
      totalAmount: 165000,
    },
    {
      areaRoom: 'Master Bedroom',
      workDescription: 'Bed back wall panelling with fluted WPC louvers and backlit brass profile accents',
      unit: 'SQFT',
      quantity: 70,
      rate: 650,
      totalAmount: 45500,
    },
    {
      areaRoom: 'Civil Work',
      workDescription: 'Italian marble flooring (Statuario White) with diamond mirror polish and epoxy joints',
      unit: 'SQFT',
      quantity: 450,
      rate: 450,
      totalAmount: 202500,
    },
    {
      areaRoom: 'Electrical',
      workDescription: 'Point wiring with Polycab FRLS copper wires, Legrand Arteor modular switches and automation DB',
      unit: 'NOS',
      quantity: 75,
      rate: 850,
      totalAmount: 63750,
    },
    {
      areaRoom: 'Plumbing',
      workDescription: 'Concealed CPVC/UPVC pipe installation (Astral) with Jaquar concealed diverters & Kohler WC',
      unit: 'LS',
      quantity: 1,
      rate: 48000,
      totalAmount: 48000,
    },
  ];

  const subtotal1 = quot1Items.reduce((acc, it) => acc + it.totalAmount, 0); // 850,800
  const gstAmount1 = Math.round(subtotal1 * 0.18); // 153,144
  const totalAmount1 = subtotal1 + gstAmount1; // 1,003,944

  const milestones1 = [
    { name: '50% Advance on Booking & Mobilization', percentage: 50, amount: Math.round(totalAmount1 * 0.5) },
    { name: '40% on Framework & Material Delivery at Site', percentage: 40, amount: Math.round(totalAmount1 * 0.4) },
    { name: '10% on Final Handover & Snag Rectification', percentage: 10, amount: Math.round(totalAmount1 * 0.1) },
  ];

  const quotation1 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QUOT-2026-001' },
    update: {},
    create: {
      quotationNumber: 'QUOT-2026-001',
      leadId: lead1?.id || null,
      projectId: existingProject?.id || null,
      clientName: 'Dr. Arvind & Malini Varma',
      clientPhone: '+919845123456',
      clientEmail: 'arvind.varma@medico.org',
      siteAddress: 'Villa 42, Palm Meadows Luxury Enclave, Whitefield, Bengaluru',
      projectType: 'RESIDENTIAL_INTERIOR',
      status: 'SHARED',
      subtotal: subtotal1,
      gstMode: 'EXCLUSIVE',
      gstPercent: 18.0,
      gstAmount: gstAmount1,
      totalAmount: totalAmount1,
      penaltyTerms: 'Delayed milestone payments will attract a 2% weekly interest charge',
      milestoneTerms: JSON.stringify(milestones1),
      notes: 'Includes 10-year warranty on modular BWR plywood carpentry and 2-year free service visits.',
      sharedVia: 'WHATSAPP',
      sharedAt: new Date(),
      validUntil: new Date('2026-04-30'),
      createdById: pmUser?.id || null,
      items: {
        create: quot1Items.map((it, idx) => ({ ...it, orderIndex: idx })),
      },
    },
  });

  // Quotation 2: Inclusive GST (18%)
  const quot2Items = [
    {
      areaRoom: 'Civil Work',
      workDescription: '100mm solid block masonry with cement mortar 1:6 and curing',
      unit: 'SQFT',
      quantity: 1200,
      rate: 180,
      totalAmount: 216000,
    },
    {
      areaRoom: 'Electrical',
      workDescription: 'High-density cabling, server room UPS wiring, and floor pop-up boxes for 120 workstations',
      unit: 'LS',
      quantity: 1,
      rate: 450000,
      totalAmount: 450000,
    },
    {
      areaRoom: 'Living Room',
      workDescription: 'Reception lounge acoustic paneling, fluted timber baffles, and LED backlit 3D acrylic branding',
      unit: 'SQFT',
      quantity: 250,
      rate: 1400,
      totalAmount: 350000,
    },
    {
      areaRoom: 'Kitchen Modular Units',
      workDescription: 'Cafeteria pantry counter with stainless steel sink, Corian countertop, and overhead storage',
      unit: 'RFT',
      quantity: 35,
      rate: 2800,
      totalAmount: 98000,
    },
  ];

  const agreedTotal2 = 1200000; // Flat agreed ₹12,00,000 inclusive
  const subtotal2 = Math.round(agreedTotal2 / 1.18); // 1,016,949
  const gstAmount2 = agreedTotal2 - subtotal2; // 183,051 (Internal Tax Liability)

  const milestones2 = [
    { name: '50% Advance on Mobilization', percentage: 50, amount: 600000 },
    { name: '40% on Mechanical/Electrical Rough-in & Partitions', percentage: 40, amount: 480000 },
    { name: '10% on Testing, Commissioning & Handover', percentage: 10, amount: 120000 },
  ];

  await prisma.quotation.upsert({
    where: { quotationNumber: 'QUOT-2026-002' },
    update: {},
    create: {
      quotationNumber: 'QUOT-2026-002',
      leadId: lead2?.id || null,
      clientName: 'Nexus Techspaces LLP (Karthik S.)',
      clientPhone: '+919988776655',
      clientEmail: 'karthik@nexustech.io',
      siteAddress: '5th Floor, Tower B, Embassy TechVillage, Outer Ring Road, Bengaluru',
      projectType: 'COMMERCIAL_FITOUT',
      status: 'DRAFT',
      subtotal: subtotal2,
      gstMode: 'INCLUSIVE',
      gstPercent: 18.0,
      gstAmount: gstAmount2,
      totalAmount: agreedTotal2,
      penaltyTerms: 'Delayed milestone payments will attract a 2% weekly interest charge',
      milestoneTerms: JSON.stringify(milestones2),
      notes: 'Commercial fit-out terms: 18% GST back-calculated inclusive within fixed lump sum package.',
      createdById: pmUser?.id || null,
      items: {
        create: quot2Items.map((it, idx) => ({ ...it, orderIndex: idx })),
      },
    },
  });

  console.log('✓ Seeded BOQ Quotations QUOT-2026-001 (Exclusive GST) & QUOT-2026-002 (Inclusive GST).');

  // 3. Milestone Invoices and Receipts for Tax Liability demonstration
  if (existingProject) {
    const invCount = await prisma.clientInvoice.count({ where: { projectId: existingProject.id } });
    if (invCount < 2) {
      const advInvoice = await prisma.clientInvoice.create({
        data: {
          invoiceNumber: 'INV-2026-001',
          projectId: existingProject.id,
          quotationId: quotation1.id,
          invoiceType: 'ADVANCE',
          milestoneName: 'Booking & Mobilization Advance (50%)',
          isFinalHandover: false,
          invoiceDate: new Date('2026-03-01'),
          dueDate: new Date('2026-03-15'),
          subtotal: 425400,
          retentionPercent: 0,
          retentionAmount: 0,
          tdsPercent: 0,
          tdsAmount: 0,
          gstPercent: 18.0,
          gstAmount: 76572,
          netInvoiceAmount: 501972,
          paidAmount: 501972,
          balanceDue: 0,
          status: 'PAID',
          certificationNotes: 'Advance payment confirmed by Accounts. Receipt issued.',
        },
      });

      // Receipt for advance invoice (makes the collected tax liability real!)
      await prisma.clientReceipt.create({
        data: {
          receiptNumber: 'RCP-2026-001',
          projectId: existingProject.id,
          invoiceId: advInvoice.id,
          receiptDate: new Date('2026-03-05'),
          amount: 501972,
          paymentMethod: 'NEFT_RTGS',
          referenceNo: 'HDFC-RTGS-9823412',
          notes: 'Advance booking received via RTGS.',
        },
      });

      // Mid-stage milestone invoice (Partially paid)
      const midInvoice = await prisma.clientInvoice.create({
        data: {
          invoiceNumber: 'INV-2026-002',
          projectId: existingProject.id,
          quotationId: quotation1.id,
          invoiceType: 'MILESTONE',
          milestoneName: '40% Framework & Material Delivery at Site',
          isFinalHandover: false,
          invoiceDate: new Date('2026-03-20'),
          dueDate: new Date('2026-04-05'),
          subtotal: 340320,
          retentionPercent: 0,
          retentionAmount: 0,
          tdsPercent: 0,
          tdsAmount: 0,
          gstPercent: 18.0,
          gstAmount: 61258,
          netInvoiceAmount: 401578,
          paidAmount: 200000,
          balanceDue: 201578,
          status: 'PARTIALLY_PAID',
          certificationNotes: 'Material inspection verified at site. Partial payment received.',
        },
      });

      await prisma.clientReceipt.create({
        data: {
          receiptNumber: 'RCP-2026-002',
          projectId: existingProject.id,
          invoiceId: midInvoice.id,
          receiptDate: new Date('2026-03-22'),
          amount: 200000,
          paymentMethod: 'NEFT_RTGS',
          referenceNo: 'ICICI-NEFT-8839201',
          notes: 'Part-payment on framework delivery invoice.',
        },
      });

      console.log('✓ Seeded sequential milestone invoices INV-2026-001 & INV-2026-002 with collected tax liabilities.');
    }
  }

  console.log('🎉 Successfully completed seeding Modules 1 to 4!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
