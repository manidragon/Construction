import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive ERP database seeding...');

  // 1. Company
  const company = await prisma.company.upsert({
    where: { code: 'APEX-INFRA' },
    update: {},
    create: {
      name: 'Apex Buildtech & Infrastructure Pvt. Ltd.',
      code: 'APEX-INFRA',
      gstin: '29AABCU9603R1ZM',
      pan: 'AABCU9603R',
      address: 'Prestige Trade Tower, 14th Floor, Palace Road, High Grounds',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+91 80 4123 4567',
      email: 'info@apexbuildtech.com',
      currencySymbol: '₹',
      fiscalYearStart: 4,
    },
  });

  console.log(`✓ Company created: ${company.name}`);

  // 2. Users for all 8 roles
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const usersData = [
    {
      name: 'Rajeshwar Sharma',
      email: 'owner@apexbuild.com',
      role: 'OWNER',
      designation: 'Managing Director & Owner',
      phone: '+91 98450 11001',
    },
    {
      name: 'Vikramaditya Rao',
      email: 'pm@apexbuild.com',
      role: 'PROJECT_MANAGER',
      designation: 'General Manager / Lead Project Manager',
      phone: '+91 98450 11002',
    },
    {
      name: 'Suresh Kumar',
      email: 'engineer@apexbuild.com',
      role: 'SITE_ENGINEER',
      designation: 'Senior Site Engineer',
      phone: '+91 98450 11003',
    },
    {
      name: 'Ananya Deshmukh',
      email: 'accounts@apexbuild.com',
      role: 'ACCOUNTS_MANAGER',
      designation: 'Chief Accounts Officer',
      phone: '+91 98450 11004',
    },
    {
      name: 'Rohan Mehra',
      email: 'purchase@apexbuild.com',
      role: 'PURCHASE_MANAGER',
      designation: 'Procurement & Purchase Lead',
      phone: '+91 98450 11005',
    },
    {
      name: 'Manoj Gowda',
      email: 'store@apexbuild.com',
      role: 'STOREKEEPER',
      designation: 'Central Stores & Materials In-charge',
      phone: '+91 98450 11006',
    },
    {
      name: 'Kavita Nair',
      email: 'hr@apexbuild.com',
      role: 'HR_MANAGER',
      designation: 'HR & Labour Welfare Manager',
      phone: '+91 98450 11007',
    },
    {
      name: 'Harish Varma',
      email: 'auditor@apexbuild.com',
      role: 'AUDITOR',
      designation: 'Senior Internal Auditor',
      phone: '+91 98450 11008',
    },
  ];

  const userMap: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, passwordHash },
      create: {
        companyId: company.id,
        name: u.name,
        email: u.email,
        passwordHash,
        phone: u.phone,
        role: u.role,
        designation: u.designation,
      },
    });
    userMap[u.role] = user;
  }
  console.log(`✓ 8 Users seeded with role-based access profiles`);

  // 3. Chart of Accounts
  const coaAccounts = [
    { code: '1010', name: 'Cash in Hand', type: 'ASSET', subType: 'CASH_BANK' },
    { code: '1020', name: 'Petty Cash - Sites', type: 'ASSET', subType: 'CASH_BANK' },
    { code: '1030', name: 'HDFC Current Account (Operating)', type: 'ASSET', subType: 'CASH_BANK' },
    { code: '1040', name: 'SBI Project Escrow Account', type: 'ASSET', subType: 'CASH_BANK' },
    { code: '1100', name: 'Accounts Receivable (Clients)', type: 'ASSET', subType: 'RECEIVABLE' },
    { code: '1150', name: 'Retention Money Receivable', type: 'ASSET', subType: 'RECEIVABLE' },
    { code: '1200', name: 'Construction Materials Inventory', type: 'ASSET', subType: 'INVENTORY' },
    { code: '1300', name: 'Input GST Credit (18%)', type: 'ASSET', subType: 'TAX' },
    { code: '1500', name: 'Plant, Machinery & Heavy Equipment', type: 'ASSET', subType: 'CAPITAL' },
    { code: '2010', name: 'Accounts Payable (Suppliers & Vendors)', type: 'LIABILITY', subType: 'PAYABLE' },
    { code: '2020', name: 'Labour Wages Payable', type: 'LIABILITY', subType: 'PAYABLE' },
    { code: '2030', name: 'Subcontractor Liabilities', type: 'LIABILITY', subType: 'PAYABLE' },
    { code: '2050', name: 'Client Retention Withheld Payable', type: 'LIABILITY', subType: 'PAYABLE' },
    { code: '2200', name: 'Output GST Payable (18%)', type: 'LIABILITY', subType: 'TAX' },
    { code: '2250', name: 'TDS Payable (Section 194C)', type: 'LIABILITY', subType: 'TAX' },
    { code: '3010', name: 'Share Capital / Partners Equity', type: 'EQUITY', subType: 'CAPITAL' },
    { code: '3020', name: 'Retained Earnings', type: 'EQUITY', subType: 'CAPITAL' },
    { code: '4010', name: 'Construction Contract Revenue (Certified)', type: 'REVENUE', subType: 'GENERAL' },
    { code: '5010', name: 'Direct Material Consumed', type: 'EXPENSE', subType: 'DIRECT_COST' },
    { code: '5020', name: 'Direct Labour Wages', type: 'EXPENSE', subType: 'DIRECT_COST' },
    { code: '5030', name: 'Equipment Hire & Machinery Operations', type: 'EXPENSE', subType: 'DIRECT_COST' },
    { code: '5040', name: 'Subcontracting Charges', type: 'EXPENSE', subType: 'DIRECT_COST' },
    { code: '5110', name: 'Site Transport & Fuel Costs', type: 'EXPENSE', subType: 'DIRECT_COST' },
    { code: '5120', name: 'Site Overhead & Safety Expenses', type: 'EXPENSE', subType: 'DIRECT_COST' },
    { code: '5200', name: 'Administrative & Head Office Overheads', type: 'EXPENSE', subType: 'OVERHEAD' },
  ];

  for (const acc of coaAccounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        currentBalance: 0,
      },
    });
  }
  console.log(`✓ 25 Chart of Accounts master records created`);

  // 4. Central Materials Master
  const materialsData = [
    { code: 'MAT-CEM-01', name: 'UltraTech OPC 53 Grade Cement', category: 'CEMENT', brand: 'UltraTech', unit: 'BAG', standardPrice: 380, minStockLevel: 200, reorderQty: 500, taxPercent: 28 },
    { code: 'MAT-STE-01', name: 'Tata Tiscon Fe500D TMT Rebar 16mm', category: 'STEEL', brand: 'Tata Tiscon', unit: 'TONNE', standardPrice: 62000, minStockLevel: 10, reorderQty: 25, taxPercent: 18 },
    { code: 'MAT-STE-02', name: 'Tata Tiscon Fe500D TMT Rebar 12mm', category: 'STEEL', brand: 'Tata Tiscon', unit: 'TONNE', standardPrice: 62500, minStockLevel: 8, reorderQty: 20, taxPercent: 18 },
    { code: 'MAT-SND-01', name: 'Washed Manufactured Sand (M-Sand)', category: 'AGGREGATE', brand: 'Kaveri', unit: 'CFT', standardPrice: 52, minStockLevel: 1000, reorderQty: 2500, taxPercent: 5 },
    { code: 'MAT-AGG-01', name: '20mm Crushed Blue Metal Aggregate', category: 'AGGREGATE', brand: 'Kaveri', unit: 'CFT', standardPrice: 44, minStockLevel: 1000, reorderQty: 2500, taxPercent: 5 },
    { code: 'MAT-BLK-01', name: 'Autoclaved Aerated Concrete (AAC) Blocks 600x200x150mm', category: 'BRICK_BLOCK', brand: 'Aerocon', unit: 'NOS', standardPrice: 78, minStockLevel: 1500, reorderQty: 4000, taxPercent: 12 },
    { code: 'MAT-PNT-01', name: 'Asian Paints Apex Ultima Exterior Emulsion', category: 'PAINT', brand: 'Asian Paints', unit: 'LITRE', standardPrice: 420, minStockLevel: 50, reorderQty: 150, taxPercent: 18 },
    { code: 'MAT-PLM-01', name: 'Astral CPVC Pro Pipes 1 Inch SDR 11', category: 'PLUMBING', brand: 'Astral', unit: 'RFT', standardPrice: 48, minStockLevel: 300, reorderQty: 800, taxPercent: 18 },
    { code: 'MAT-ELE-01', name: 'Havells 2.5 sq.mm FR PVC Insulated Copper Wire', category: 'ELECTRICAL', brand: 'Havells', unit: 'NOS', standardPrice: 2150, minStockLevel: 20, reorderQty: 50, taxPercent: 18 },
    { code: 'MAT-TIL-01', name: 'Kajaria Vitrified Polished Floor Tiles 600x600mm', category: 'FINISHING', brand: 'Kajaria', unit: 'SQFT', standardPrice: 65, minStockLevel: 800, reorderQty: 2000, taxPercent: 18 },
  ];

  const materialMap: Record<string, any> = {};
  for (const m of materialsData) {
    const mat = await prisma.material.upsert({
      where: { code: m.code },
      update: {},
      create: m,
    });
    materialMap[m.code] = mat;
  }
  console.log(`✓ 10 Standard construction materials seeded`);

  // 5. Warehouses / Site Stores
  const centralWh = await prisma.warehouse.upsert({
    where: { code: 'WH-CENTRAL' },
    update: {},
    create: {
      code: 'WH-CENTRAL',
      name: 'Central Yard & Logistics Hub',
      location: 'Plot 45, Peenya Industrial Area Phase 2, Bengaluru',
      isSiteStore: false,
      contactPerson: 'Manoj Gowda (+91 98450 11006)',
    },
  });

  const siteAWh = await prisma.warehouse.upsert({
    where: { code: 'WH-SKYLINE' },
    update: {},
    create: {
      code: 'WH-SKYLINE',
      name: 'Site Store - Skyline Heights',
      location: 'Site Yard A, Electronic City Phase 1, Bengaluru',
      isSiteStore: true,
      contactPerson: 'Suresh Kumar (+91 98450 11003)',
    },
  });

  const siteBWh = await prisma.warehouse.upsert({
    where: { code: 'WH-METRO' },
    update: {},
    create: {
      code: 'WH-METRO',
      name: 'Site Store - Metro Plaza',
      location: 'Station Plot 7, Whitefield Main Road, Bengaluru',
      isSiteStore: true,
      contactPerson: 'Manoj Gowda',
    },
  });

  // Initial stock balances in Central and Site A
  const stockSeed = [
    { warehouseId: centralWh.id, matCode: 'MAT-CEM-01', qty: 650, cost: 380 },
    { warehouseId: centralWh.id, matCode: 'MAT-STE-01', qty: 28, cost: 62000 },
    { warehouseId: centralWh.id, matCode: 'MAT-STE-02', qty: 18, cost: 62500 },
    { warehouseId: centralWh.id, matCode: 'MAT-SND-01', qty: 4500, cost: 52 },
    { warehouseId: centralWh.id, matCode: 'MAT-AGG-01', qty: 4000, cost: 44 },
    { warehouseId: siteAWh.id, matCode: 'MAT-CEM-01', qty: 420, cost: 380 },
    { warehouseId: siteAWh.id, matCode: 'MAT-STE-01', qty: 14, cost: 62000 },
    { warehouseId: siteAWh.id, matCode: 'MAT-BLK-01', qty: 2800, cost: 78 },
    { warehouseId: siteAWh.id, matCode: 'MAT-PNT-01', qty: 85, cost: 420 },
    { warehouseId: siteAWh.id, matCode: 'MAT-TIL-01', qty: 1200, cost: 65 },
  ];

  for (const s of stockSeed) {
    const mat = materialMap[s.matCode];
    await prisma.stockBalance.upsert({
      where: {
        warehouseId_materialId: {
          warehouseId: s.warehouseId,
          materialId: mat.id,
        },
      },
      update: { currentQty: s.qty, avgUnitCost: s.cost, totalValuation: s.qty * s.cost },
      create: {
        warehouseId: s.warehouseId,
        materialId: mat.id,
        currentQty: s.qty,
        avgUnitCost: s.cost,
        totalValuation: s.qty * s.cost,
      },
    });
  }
  console.log(`✓ Warehouses and stock balances initialized`);

  // 6. Suppliers Master
  const supplierBalaji = await prisma.supplier.upsert({
    where: { code: 'SUP-BALAJI' },
    update: {},
    create: {
      code: 'SUP-BALAJI',
      name: 'Shree Balaji Cements & Steel Corp',
      contactPerson: 'Mukesh Agrawal',
      phone: '+91 98450 33445',
      email: 'sales@balajicements.in',
      address: '22 Industrial Suburb, Yeshwantpur',
      city: 'Bengaluru',
      gstin: '29AAGCB1234F1Z8',
      pan: 'AAGCB1234F',
      paymentTerms: 'Net 30 Days',
      bankName: 'HDFC Bank',
      bankAccountNo: '50200012345678',
      bankIfsc: 'HDFC0000123',
      openingBalance: 0,
      currentBalance: 425000, // ₹4.25 Lakhs payable
    },
  });

  const supplierKaveri = await prisma.supplier.upsert({
    where: { code: 'SUP-KAVERI' },
    update: {},
    create: {
      code: 'SUP-KAVERI',
      name: 'Kaveri Aggregates & ReadyMix Concrete',
      contactPerson: 'C. Rangaswamy',
      phone: '+91 98860 77889',
      email: 'orders@kaveriaggregates.com',
      address: 'Survey 88, Nelamangala Quarry Road',
      city: 'Bengaluru',
      gstin: '29AAECF5678G1Z2',
      pan: 'AAECF5678G',
      paymentTerms: '15 Days from Invoice',
      bankName: 'State Bank of India',
      bankAccountNo: '30495811223',
      bankIfsc: 'SBIN0004123',
      openingBalance: 0,
      currentBalance: 185000,
    },
  });

  const supplierMahalaxmi = await prisma.supplier.upsert({
    where: { code: 'SUP-MAHA' },
    update: {},
    create: {
      code: 'SUP-MAHA',
      name: 'Mahalaxmi Electrical & Hardware Depot',
      contactPerson: 'Dilip Jain',
      phone: '+91 94480 66778',
      email: 'info@mahalaxmielectricals.in',
      address: '102 BVK Iyengar Road, Chickpet',
      city: 'Bengaluru',
      gstin: '29ABCPM9988H1Z4',
      pan: 'ABCPM9988H',
      paymentTerms: 'Immediate upon delivery',
      bankName: 'ICICI Bank',
      bankAccountNo: '000205012345',
      bankIfsc: 'ICIC0000002',
      openingBalance: 0,
      currentBalance: 95000,
    },
  });
  console.log(`✓ Suppliers seeded with balances and GSTINs`);

  // 7. Clients Master
  const clientPrestige = await prisma.client.upsert({
    where: { code: 'CLI-PRESTIGE' },
    update: {},
    create: {
      code: 'CLI-PRESTIGE',
      name: 'Prestige Urban Developers Ltd',
      companyName: 'Prestige Group Holdings',
      contactPerson: 'Ravi Narayanan (VP Projects)',
      phone: '+91 80 2559 1080',
      email: 'projects.billing@prestigeconstructions.com',
      billingAddress: 'The Falcon Tower, 19 Brunton Road, Bengaluru',
      gstin: '29AABCP1122K1Z9',
      pan: 'AABCP1122K',
    },
  });

  const clientRailCorp = await prisma.client.upsert({
    where: { code: 'CLI-KRIDE' },
    update: {},
    create: {
      code: 'CLI-KRIDE',
      name: 'Karnataka Rail Infrastructure Development (K-RIDE)',
      companyName: 'Govt of Karnataka & MoR JV',
      contactPerson: 'Er. S. N. Patil (Chief Project Mgr)',
      phone: '+91 80 2235 5678',
      email: 'works.billing@kride.in',
      billingAddress: 'MS Building, 5th Floor, Dr. Ambedkar Veedhi, Bengaluru',
      gstin: '29AAACK3344M1Z1',
      pan: 'AAACK3344M',
    },
  });

  // 8. Projects & Sites
  const prjSkyline = await prisma.project.upsert({
    where: { code: 'PRJ-BLR-001' },
    update: {},
    create: {
      code: 'PRJ-BLR-001',
      name: 'Skyline Heights Luxury Towers',
      description: 'Twin 24-Storey Residential Towers with 2-level basement parking and club amenities',
      clientName: clientPrestige.name,
      clientContact: clientPrestige.phone,
      clientEmail: clientPrestige.email,
      clientBillingAddr: clientPrestige.billingAddress,
      clientGstin: clientPrestige.gstin,
      siteAddress: 'Sy No 42/1, Electronic City Phase 1, Hosur Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'RESIDENTIAL',
      contractType: 'ITEM_RATE',
      contractValue: 350000000, // ₹35 Crores
      approvedBudget: 295000000, // ₹29.5 Crores
      plannedStartDate: new Date('2024-01-15'),
      plannedEndDate: new Date('2025-12-31'),
      actualStartDate: new Date('2024-01-20'),
      status: 'ACTIVE',
      paymentTerms: 'Monthly Running Account (RA) Bills. Retention 5%, TDS 2%, GST 18%. Payment within 21 days.',
      taxRatePercent: 18.0,
      completionPercent: 38.5,
    },
  });

  const prjMetro = await prisma.project.upsert({
    where: { code: 'PRJ-METRO-002' },
    update: {},
    create: {
      code: 'PRJ-METRO-002',
      name: 'Metro Station Plaza & Skywalk Complex',
      description: 'Multi-modal transit hub, elevated skywalk connecting metro to tech park, and commuter plaza',
      clientName: clientRailCorp.name,
      clientContact: clientRailCorp.phone,
      clientEmail: clientRailCorp.email,
      clientBillingAddr: clientRailCorp.billingAddress,
      clientGstin: clientRailCorp.gstin,
      siteAddress: 'Whitefield Main Road, Near ITPL',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'INFRASTRUCTURE',
      contractType: 'EPC',
      contractValue: 185000000, // ₹18.5 Crores
      approvedBudget: 158000000, // ₹15.8 Crores
      plannedStartDate: new Date('2024-04-01'),
      plannedEndDate: new Date('2025-08-31'),
      actualStartDate: new Date('2024-04-10'),
      status: 'ACTIVE',
      paymentTerms: 'Milestone linked payments with 10% mobilization advance recovery and 5% retention.',
      taxRatePercent: 18.0,
      completionPercent: 22.0,
    },
  });

  const prjTechPark = await prisma.project.upsert({
    where: { code: 'PRJ-COMM-003' },
    update: {},
    create: {
      code: 'PRJ-COMM-003',
      name: 'Greenfield IT Park Tower B',
      description: 'Commercial Grade-A Office Building 12 Floors with LEED Gold Certification specs',
      clientName: clientPrestige.name,
      clientContact: clientPrestige.phone,
      clientEmail: clientPrestige.email,
      siteAddress: 'Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      projectType: 'COMMERCIAL',
      contractType: 'ITEM_RATE',
      contractValue: 520000000, // ₹52 Crores
      approvedBudget: 440000000, // ₹44 Crores
      plannedStartDate: new Date('2024-09-01'),
      plannedEndDate: new Date('2026-06-30'),
      status: 'PLANNING',
      taxRatePercent: 18.0,
      completionPercent: 4.0,
    },
  });
  console.log(`✓ 3 High-value Projects created with contracts & budgets`);

  // Project Sites
  const siteTowerA = await prisma.site.create({
    data: {
      projectId: prjSkyline.id,
      name: 'Tower A & Podium Site',
      code: 'STE-SKY-01',
      location: 'North Wing, Electronic City',
      supervisorName: 'Suresh Kumar',
      contactPhone: '+91 98450 11003',
    },
  });

  const siteTowerB = await prisma.site.create({
    data: {
      projectId: prjSkyline.id,
      name: 'Tower B & Basement Site',
      code: 'STE-SKY-02',
      location: 'South Wing, Electronic City',
      supervisorName: 'Dinesh Gowda',
      contactPhone: '+91 98450 99881',
    },
  });

  const siteMetroPlaza = await prisma.site.create({
    data: {
      projectId: prjMetro.id,
      name: 'Plaza & Pier P1-P18 Construction Site',
      code: 'STE-MET-01',
      location: 'Whitefield Corridor',
      supervisorName: 'Ramesh Reddy',
      contactPhone: '+91 98450 77665',
    },
  });

  // Project Members
  await prisma.projectMember.createMany({
    data: [
      { projectId: prjSkyline.id, userId: userMap['PROJECT_MANAGER'].id, roleTitle: 'Project Manager' },
      { projectId: prjSkyline.id, userId: userMap['SITE_ENGINEER'].id, roleTitle: 'Site Engineer' },
      { projectId: prjMetro.id, userId: userMap['PROJECT_MANAGER'].id, roleTitle: 'Project Manager' },
      { projectId: prjMetro.id, userId: userMap['SITE_ENGINEER'].id, roleTitle: 'Site Engineer' },
    ],
  });

  // 9. BOQ Items for Project 1 (Skyline Towers)
  const boqItemsData = [
    {
      projectId: prjSkyline.id,
      itemCode: 'BOQ-01',
      description: 'Earthwork excavation in all kinds of soil including soft rock and disposal within 5km lead',
      category: 'EARTHWORK',
      unit: 'CUMT',
      estimatedQty: 24000,
      materialUnitCost: 0,
      labourUnitCost: 85,
      equipmentUnitCost: 140,
      subcontractUnitCost: 0,
      otherUnitCost: 15,
      unitRate: 240,
      estimatedTotal: 5760000,
      actualQtyCompleted: 24000,
      actualExpenditure: 5640000,
    },
    {
      projectId: prjSkyline.id,
      itemCode: 'BOQ-02',
      description: 'Design Mix Ready Mix Concrete M35 grade for basement raft and retaining walls',
      category: 'CONCRETE',
      unit: 'CUMT',
      estimatedQty: 8500,
      materialUnitCost: 4800,
      labourUnitCost: 450,
      equipmentUnitCost: 320,
      subcontractUnitCost: 0,
      otherUnitCost: 130,
      unitRate: 5700,
      estimatedTotal: 48450000,
      actualQtyCompleted: 5800,
      actualExpenditure: 32800000,
    },
    {
      projectId: prjSkyline.id,
      itemCode: 'BOQ-03',
      description: 'Thermo-Mechanically Treated (TMT) Fe500D steel reinforcement bars cut, bent, placed and tied',
      category: 'STEEL',
      unit: 'TONNE',
      estimatedQty: 950,
      materialUnitCost: 62000,
      labourUnitCost: 6500,
      equipmentUnitCost: 800,
      subcontractUnitCost: 0,
      otherUnitCost: 700,
      unitRate: 70000,
      estimatedTotal: 66500000,
      actualQtyCompleted: 420,
      actualExpenditure: 29400000,
    },
    {
      projectId: prjSkyline.id,
      itemCode: 'BOQ-04',
      description: 'Autoclaved Aerated Concrete (AAC) block masonry 200mm thick with polymer modified adhesive',
      category: 'MASONRY',
      unit: 'SQMT',
      estimatedQty: 18000,
      materialUnitCost: 620,
      labourUnitCost: 180,
      equipmentUnitCost: 20,
      subcontractUnitCost: 0,
      otherUnitCost: 30,
      unitRate: 850,
      estimatedTotal: 15300000,
      actualQtyCompleted: 4500,
      actualExpenditure: 3750000,
    },
    {
      projectId: prjSkyline.id,
      itemCode: 'BOQ-05',
      description: 'Internal wall plastering in cement mortar 1:4 with sponge finishing complete',
      category: 'PLASTERING',
      unit: 'SQMT',
      estimatedQty: 42000,
      materialUnitCost: 110,
      labourUnitCost: 140,
      equipmentUnitCost: 10,
      subcontractUnitCost: 0,
      otherUnitCost: 15,
      unitRate: 275,
      estimatedTotal: 11550000,
      actualQtyCompleted: 8000,
      actualExpenditure: 2160000,
    },
    {
      projectId: prjSkyline.id,
      itemCode: 'BOQ-06',
      description: 'Vitrified glazed tile flooring 600x600mm Kajaria make laid over cement mortar bed',
      category: 'FLOORING',
      unit: 'SQFT',
      estimatedQty: 85000,
      materialUnitCost: 75,
      labourUnitCost: 35,
      equipmentUnitCost: 5,
      subcontractUnitCost: 0,
      otherUnitCost: 10,
      unitRate: 125,
      estimatedTotal: 10625000,
      actualQtyCompleted: 12000,
      actualExpenditure: 1480000,
    },
  ];

  const boqItemMap: Record<string, any> = {};
  for (const b of boqItemsData) {
    const item = await prisma.bOQItem.create({ data: b });
    boqItemMap[b.itemCode] = item;
  }
  console.log(`✓ 6 BOQ line items created with material/labour/equipment breakdown`);

  // 10. Tasks & Milestones
  await prisma.task.createMany({
    data: [
      {
        projectId: prjSkyline.id,
        siteId: siteTowerA.id,
        title: 'Complete 8th Floor Slab Shuttering & Rebar Binding',
        description: 'Formwork inspection and steel reinforcement binding for Tower A 8th floor slab cast',
        startDate: new Date('2024-10-15'),
        dueDate: new Date('2024-10-25'),
        priority: 'HIGH',
        plannedQty: 450,
        completedQty: 380,
        unit: 'SQMT',
        estimatedCost: 350000,
        actualCost: 290000,
        status: 'IN_PROGRESS',
        assignedToId: userMap['SITE_ENGINEER'].id,
      },
      {
        projectId: prjSkyline.id,
        siteId: siteTowerA.id,
        title: '7th Floor Column Concreting M35',
        description: 'Pouring 45 cumt of M35 RMC with pump for 18 structural columns',
        startDate: new Date('2024-10-10'),
        dueDate: new Date('2024-10-14'),
        priority: 'URGENT',
        plannedQty: 45,
        completedQty: 45,
        unit: 'CUMT',
        estimatedCost: 260000,
        actualCost: 255000,
        status: 'COMPLETED',
        assignedToId: userMap['SITE_ENGINEER'].id,
      },
      {
        projectId: prjSkyline.id,
        siteId: siteTowerB.id,
        title: 'Basement Level 2 Waterproofing Membrane Application',
        description: 'Torch-on APP modified 4mm bitumen membrane on retaining wall exterior',
        startDate: new Date('2024-10-18'),
        dueDate: new Date('2024-10-28'),
        priority: 'MEDIUM',
        plannedQty: 1200,
        completedQty: 600,
        unit: 'SQMT',
        estimatedCost: 480000,
        actualCost: 240000,
        status: 'IN_PROGRESS',
        assignedToId: userMap['SITE_ENGINEER'].id,
      },
      {
        projectId: prjMetro.id,
        siteId: siteMetroPlaza.id,
        title: 'Pier P-12 Rebar Cage Erection & Shuttering',
        description: 'Heavy crane lifting of rebar cage and circular steel formwork alignment',
        startDate: new Date('2024-10-16'),
        dueDate: new Date('2024-10-24'),
        priority: 'HIGH',
        plannedQty: 1,
        completedQty: 0.6,
        unit: 'NOS',
        estimatedCost: 280000,
        actualCost: 170000,
        status: 'IN_PROGRESS',
        assignedToId: userMap['SITE_ENGINEER'].id,
      },
    ],
  });

  // 11. Daily Site Report (DPR)
  const dpr1 = await prisma.dailySiteReport.create({
    data: {
      projectId: prjSkyline.id,
      siteId: siteTowerA.id,
      reportDate: new Date('2024-10-19'),
      weather: 'Sunny / Clear sky 28°C',
      temperature: '28°C',
      preparedById: userMap['SITE_ENGINEER'].id,
      approvedById: userMap['PROJECT_MANAGER'].id,
      status: 'APPROVED',
      workSummary: 'Completed Tower A 8th floor beam bottom shuttering and 80% slab rebar layout. Inspected cover blocks.',
      safetyIncidents: 'Nil incidents. Safety toolbox talk conducted at 8:30 AM with 34 workers regarding fall arrest harness.',
      issuesNoted: 'Tower crane motor requires preventive lubrication service tomorrow morning.',
    },
  });

  await prisma.dPRLabourEntry.createMany({
    data: [
      { dprId: dpr1.id, trade: 'Masons', headcount: 8, regularHours: 8, overtimeHours: 2, notes: 'Blockwork on 4th floor' },
      { dprId: dpr1.id, trade: 'Bar Benders', headcount: 14, regularHours: 8, overtimeHours: 3, notes: 'Tower A 8th slab rebar tying' },
      { dprId: dpr1.id, trade: 'Carpenters (Shuttering)', headcount: 12, regularHours: 8, overtimeHours: 2, notes: 'Beam bottoms & staging' },
      { dprId: dpr1.id, trade: 'Helpers (Unskilled)', headcount: 22, regularHours: 8, overtimeHours: 1, notes: 'Material shifting & cleanup' },
      { dprId: dpr1.id, trade: 'Plant Operators', headcount: 3, regularHours: 8, overtimeHours: 0, notes: 'Tower crane & hoist ops' },
    ],
  });

  await prisma.dPRMaterialEntry.createMany({
    data: [
      { dprId: dpr1.id, materialName: 'UltraTech Cement 53 Grade', unit: 'BAG', qtyReceived: 0, qtyConsumed: 60, notes: 'Used for block mortar' },
      { dprId: dpr1.id, materialName: 'TMT 16mm & 12mm Rebars', unit: 'TONNE', qtyReceived: 0, qtyConsumed: 4.8, notes: '8th slab reinforcement' },
      { dprId: dpr1.id, materialName: 'AAC Blocks 600x200x150', unit: 'NOS', qtyReceived: 450, qtyConsumed: 320, notes: '4th floor external partition' },
    ],
  });

  await prisma.dPREquipmentEntry.createMany({
    data: [
      { dprId: dpr1.id, equipmentName: 'Potain 5 Ton Tower Crane', hoursOperated: 7.5, fuelConsumed: 0, workDone: 'Lifting rebar bundles to 8th floor' },
      { dprId: dpr1.id, equipmentName: 'Transit Mixer & Concrete Pump', hoursOperated: 4.0, fuelConsumed: 22, workDone: 'Column concreting batch' },
      { dprId: dpr1.id, equipmentName: 'Diesel Generator 125 kVA', hoursOperated: 5.5, fuelConsumed: 48, workDone: 'Backup power during BESCOM load cut' },
    ],
  });
  console.log(`✓ Daily Site Report (DPR) with muster, materials, and machinery saved`);

  // 12. Workers Master & Attendance
  const workersData = [
    { workerCode: 'WRK-001', name: 'Rameshwar Yadav', trade: 'MASON', skillLevel: 'SKILLED', dailyWageRate: 850, overtimeHourlyRate: 140, phone: '+91 97410 22331' },
    { workerCode: 'WRK-002', name: 'Munna Paswan', trade: 'BARBENDER', skillLevel: 'SKILLED', dailyWageRate: 800, overtimeHourlyRate: 130, phone: '+91 97410 22332' },
    { workerCode: 'WRK-003', name: 'Basavaraj Patil', trade: 'CARPENTER', skillLevel: 'SKILLED', dailyWageRate: 850, overtimeHourlyRate: 140, phone: '+91 97410 22333' },
    { workerCode: 'WRK-004', name: 'Chotu Lal', trade: 'HELPER', skillLevel: 'UNSKILLED', dailyWageRate: 550, overtimeHourlyRate: 90, phone: '+91 97410 22334' },
    { workerCode: 'WRK-005', name: 'Santosh Kumar', trade: 'HELPER', skillLevel: 'UNSKILLED', dailyWageRate: 550, overtimeHourlyRate: 90, phone: '+91 97410 22335' },
    { workerCode: 'WRK-006', name: 'Ganesh Shinde', trade: 'OPERATOR', skillLevel: 'SKILLED', dailyWageRate: 1100, overtimeHourlyRate: 180, phone: '+91 97410 22336' },
    { workerCode: 'WRK-007', name: 'Deepak Mondal', trade: 'PLUMBER', skillLevel: 'SKILLED', dailyWageRate: 800, overtimeHourlyRate: 130, phone: '+91 97410 22337' },
    { workerCode: 'WRK-008', name: 'Mohan Ram', trade: 'ELECTRICIAN', skillLevel: 'SKILLED', dailyWageRate: 850, overtimeHourlyRate: 140, phone: '+91 97410 22338' },
  ];

  const workerRecords: any[] = [];
  for (const w of workersData) {
    const wrk = await prisma.worker.upsert({
      where: { workerCode: w.workerCode },
      update: {},
      create: {
        ...w,
        projectId: prjSkyline.id,
      },
    });
    workerRecords.push(wrk);
  }

  // Attendance for today
  for (const wrk of workerRecords) {
    const isPresent = true;
    const ot = wrk.trade === 'BARBENDER' ? 3 : wrk.trade === 'CARPENTER' ? 2 : 0;
    const wage = wrk.dailyWageRate;
    const otWage = ot * wrk.overtimeHourlyRate;

    await prisma.labourAttendance.upsert({
      where: {
        date_workerId_projectId: {
          date: new Date('2024-10-19'),
          workerId: wrk.id,
          projectId: prjSkyline.id,
        },
      },
      update: {},
      create: {
        date: new Date('2024-10-19'),
        projectId: prjSkyline.id,
        siteId: siteTowerA.id,
        workerId: wrk.id,
        attendanceStatus: 'PRESENT',
        regularHours: 8,
        overtimeHours: ot,
        workActivity: wrk.trade === 'BARBENDER' ? '8th slab reinforcement tying' : 'General site activities',
        wageCalculated: wage,
        overtimeWage: otWage,
        totalWageEarned: wage + otWage,
        isVerified: true,
        supervisorName: 'Suresh Kumar',
      },
    });
  }
  console.log(`✓ 8 Workers master and daily muster roll attendance saved`);

  // 13. Procurement: Requisition, PO, GRN
  const mr1 = await prisma.materialRequisition.upsert({
    where: { requisitionNumber: 'MR-2024-001' },
    update: {},
    create: {
      requisitionNumber: 'MR-2024-001',
      projectId: prjSkyline.id,
      siteId: siteTowerA.id,
      requestedById: userMap['SITE_ENGINEER'].id,
      requiredDate: new Date('2024-10-25'),
      priority: 'HIGH',
      status: 'APPROVED',
      remarks: 'Urgent cement and aggregate requirement for upcoming 8th floor slab cast',
      approvedById: userMap['PROJECT_MANAGER'].id,
      approvedAt: new Date('2024-10-18'),
    },
  });

  await prisma.requisitionItem.createMany({
    data: [
      {
        requisitionId: mr1.id,
        materialId: materialMap['MAT-CEM-01'].id,
        requestedQty: 400,
        approvedQty: 400,
        unit: 'BAG',
        purpose: '8th Floor Concrete Batching',
      },
      {
        requisitionId: mr1.id,
        materialId: materialMap['MAT-AGG-01'].id,
        requestedQty: 1500,
        approvedQty: 1500,
        unit: 'CFT',
        purpose: 'Coarse aggregate for slab',
      },
    ],
  });

  const po1 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-2024-089' },
    update: {},
    create: {
      poNumber: 'PO-2024-089',
      projectId: prjSkyline.id,
      supplierId: supplierBalaji.id,
      deliveryDueDate: new Date('2024-10-24'),
      status: 'APPROVED',
      subtotal: 152000,
      taxAmount: 42560,
      freightCharges: 4500,
      totalAmount: 199060,
      termsConditions: 'Delivery at Site Store A. Test certificate required with delivery challan. Payment 30 days.',
      createdById: userMap['PURCHASE_MANAGER'].id,
      approvedById: userMap['OWNER'].id,
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po1.id,
      materialId: materialMap['MAT-CEM-01'].id,
      orderQty: 400,
      unitPrice: 380,
      taxPercent: 28,
      taxAmount: 42560,
      totalAmount: 194560,
      receivedQty: 400,
      invoicedQty: 400,
    },
  });

  const grn1 = await prisma.goodsReceiptNote.upsert({
    where: { grnNumber: 'GRN-2024-054' },
    update: {},
    create: {
      grnNumber: 'GRN-2024-054',
      purchaseOrderId: po1.id,
      projectId: prjSkyline.id,
      warehouseId: siteAWh.id,
      deliveryNoteNo: 'DC-BLJ-9821',
      vehicleNo: 'KA-01-EA-4412',
      receivedById: userMap['STOREKEEPER'].id,
      remarks: '400 Bags received in intact condition, fresh batch Mfg Date 12-10-2024. Quality verified.',
      status: 'VERIFIED',
    },
  });

  // Supplier Invoice & Match
  const suppInv1 = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: 'INV-BLJ-4421',
      supplierId: supplierBalaji.id,
      purchaseOrderId: po1.id,
      invoiceDate: new Date('2024-10-18'),
      dueDate: new Date('2024-11-17'),
      subtotal: 156500,
      taxAmount: 42560,
      totalAmount: 199060,
      paidAmount: 100000,
      balanceDue: 99060,
      status: 'PARTIALLY_PAID',
    },
  });

  await prisma.supplierPayment.create({
    data: {
      paymentNumber: 'PMT-SUP-012',
      supplierId: supplierBalaji.id,
      invoiceId: suppInv1.id,
      paymentDate: new Date('2024-10-19'),
      amount: 100000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNo: 'HDFCR52024101900124',
      notes: 'Part payment against INV-BLJ-4421 via HDFC Current A/c',
    },
  });
  console.log(`✓ Procurement lifecycle (MR -> PO -> GRN -> Invoice -> Payment) recorded`);

  // 14. Site Petty Cash Float & Expenses
  const pcSkyline = await prisma.pettyCashAccount.create({
    data: {
      name: 'Site A Petty Cash Float',
      projectId: prjSkyline.id,
      siteId: siteTowerA.id,
      custodianUserId: userMap['SITE_ENGINEER'].id,
      openingBalance: 25000,
      currentBalance: 16850,
      minFloatThreshold: 5000,
    },
  });

  await prisma.pettyCashTransaction.createMany({
    data: [
      {
        pettyCashAccountId: pcSkyline.id,
        txnDate: new Date('2024-10-15'),
        txnType: 'TOP_UP',
        amount: 25000,
        balanceAfter: 25000,
        recipient: 'Suresh Kumar',
        voucherNo: 'PC-TOP-01',
        description: 'Initial site imprest float issued via bank transfer',
      },
      {
        pettyCashAccountId: pcSkyline.id,
        txnDate: new Date('2024-10-17'),
        txnType: 'EXPENSE',
        amount: 3650,
        balanceAfter: 21350,
        recipient: 'Sri Manjunatha Welding Works',
        voucherNo: 'PC-EXP-01',
        description: 'Urgent welding repair on tower crane hoist clamp',
      },
      {
        pettyCashAccountId: pcSkyline.id,
        txnDate: new Date('2024-10-18'),
        txnType: 'EXPENSE',
        amount: 4500,
        balanceAfter: 16850,
        recipient: 'IOCL Fuel Outlet Electronic City',
        voucherNo: 'PC-EXP-02',
        description: 'Diesel purchase for site dewatering pumps (50 Litres)',
      },
    ],
  });

  // Direct Site Expenses
  await prisma.expense.createMany({
    data: [
      {
        expenseNumber: 'EXP-2024-031',
        projectId: prjSkyline.id,
        siteId: siteTowerA.id,
        category: 'SAFETY_EQUIPMENT',
        description: 'Karam Full Body Safety Harness (15 sets) and ISI Helmets for height workers',
        amountBeforeTax: 28000,
        taxAmount: 5040,
        totalAmount: 33040,
        paymentMethod: 'BANK_TRANSFER',
        paidTo: 'SafeTech Industrial Equipments',
        invoiceReceiptNo: 'ST-8821',
        isPaid: true,
        status: 'APPROVED',
        createdById: userMap['SITE_ENGINEER'].id,
        approvedById: userMap['PROJECT_MANAGER'].id,
        expenseDate: new Date('2024-10-14'),
      },
      {
        expenseNumber: 'EXP-2024-032',
        projectId: prjSkyline.id,
        siteId: siteTowerA.id,
        category: 'EQUIPMENT_RENTAL',
        description: 'Mobile telescopic boom lift rental for 3 days facade testing',
        amountBeforeTax: 45000,
        taxAmount: 8100,
        totalAmount: 53100,
        paymentMethod: 'BANK_TRANSFER',
        paidTo: 'Bangalore Crane & Equipment Services',
        invoiceReceiptNo: 'BCES-1044',
        isPaid: true,
        status: 'APPROVED',
        createdById: userMap['SITE_ENGINEER'].id,
        approvedById: userMap['PROJECT_MANAGER'].id,
        expenseDate: new Date('2024-10-16'),
      },
    ],
  });
  console.log(`✓ Site petty cash float and direct expense vouchers initialized`);

  // 15. Client Billing: Running Account (RA) Bill & Receipts
  const raBill1 = await prisma.clientInvoice.upsert({
    where: { invoiceNumber: 'RA-03-SKYLINE' },
    update: {},
    create: {
      invoiceNumber: 'RA-03-SKYLINE',
      clientId: clientPrestige.id,
      projectId: prjSkyline.id,
      invoiceType: 'RUNNING_ACCOUNT_RA',
      invoiceDate: new Date('2024-10-05'),
      dueDate: new Date('2024-10-26'),
      workPeriodStart: new Date('2024-09-01'),
      workPeriodEnd: new Date('2024-09-30'),
      subtotal: 38500000, // ₹3.85 Cr certified work done this month
      retentionPercent: 5.0,
      retentionAmount: 1925000, // ₹19.25 Lakhs withheld
      tdsPercent: 2.0,
      tdsAmount: 770000, // ₹7.7 Lakhs TDS Sec 194C
      gstPercent: 18.0,
      gstAmount: 6930000, // ₹69.3 Lakhs 18% GST
      netInvoiceAmount: 42735000, // Net payable: Subtotal + GST - Retention - TDS
      paidAmount: 30000000, // ₹3.00 Cr received
      balanceDue: 12735000, // ₹1.27 Cr outstanding
      status: 'PARTIALLY_PAID',
      certificationNotes: 'Joint measurement certified by Prestige Lead Architect & Consultant PM on 03-Oct-2024',
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: raBill1.id,
        boqItemId: boqItemMap['BOQ-02'].id,
        description: 'Design Mix Ready Mix Concrete M35 grade for basement raft and retaining walls',
        previousQty: 4200,
        currentQty: 1600,
        cumulativeQty: 5800,
        unit: 'CUMT',
        rate: 5700,
        amount: 9120000,
      },
      {
        invoiceId: raBill1.id,
        boqItemId: boqItemMap['BOQ-03'].id,
        description: 'Thermo-Mechanically Treated (TMT) Fe500D steel reinforcement bars',
        previousQty: 290,
        currentQty: 130,
        cumulativeQty: 420,
        unit: 'TONNE',
        rate: 70000,
        amount: 9100000,
      },
    ],
  });

  // Client Receipt
  await prisma.clientReceipt.create({
    data: {
      receiptNumber: 'RCP-2024-009',
      clientId: clientPrestige.id,
      projectId: prjSkyline.id,
      invoiceId: raBill1.id,
      receiptDate: new Date('2024-10-15'),
      amount: 30000000, // ₹3.00 Crores
      paymentMethod: 'NEFT_RTGS',
      referenceNo: 'RTGS/HDFCN24289004512',
      notes: 'Part receipt against RA Bill 03 certified works credited to HDFC Operating A/c',
    },
  });
  console.log(`✓ Client RA Bill 03 and ₹3.00 Cr RTGS Payment Receipt recorded`);

  // 16. Plant & Machinery (Equipment Assets)
  await prisma.equipmentAsset.createMany({
    data: [
      {
        code: 'EQP-CRN-01',
        name: 'Potain MCi 85 A 5-Ton Tower Crane',
        assetType: 'OWNED',
        category: 'CRANE',
        modelNo: 'MCi 85 A',
        serialNo: 'POT-2022-8812',
        purchaseDate: new Date('2022-03-15'),
        purchasePrice: 6500000,
        rentalRateType: 'MONTHLY',
        rentalRate: 180000,
        currentProjectId: prjSkyline.id,
        currentOperator: 'Ganesh Shinde',
        status: 'IN_USE',
        hoursRunTotal: 1420,
      },
      {
        code: 'EQP-JCB-01',
        name: 'JCB 3DX Super Backhoe Loader / Excavator',
        assetType: 'RENTED',
        category: 'EXCAVATOR',
        modelNo: '3DX EcoXcellence',
        serialNo: 'JCB-2023-4109',
        rentalRateType: 'HOURLY',
        rentalRate: 1150,
        currentProjectId: prjSkyline.id,
        currentOperator: 'Suraj Gowda',
        status: 'AVAILABLE',
        hoursRunTotal: 680,
      },
      {
        code: 'EQP-GEN-01',
        name: 'Cummins 125 kVA Silent Diesel Generator',
        assetType: 'OWNED',
        category: 'GENERATOR',
        modelNo: 'C125D5P',
        serialNo: 'CUM-2021-9011',
        purchaseDate: new Date('2021-08-20'),
        purchasePrice: 920000,
        currentProjectId: prjSkyline.id,
        status: 'IN_USE',
        hoursRunTotal: 890,
      },
    ],
  });

  // 17. Balanced General Ledger Journal Entries
  // Entry 1: Client RA Bill 03
  // Dr. Accounts Receivable ₹4,27,35,000
  // Dr. Retention Money Receivable ₹19,25,000
  // Dr. TDS Receivable (Sec 194C) ₹7,70,000
  // Cr. Contract Revenue ₹3,85,00,000
  // Cr. Output GST Payable ₹69,30,000
  const je1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-00101',
      entryDate: new Date('2024-10-05'),
      referenceType: 'CLIENT_INVOICE',
      referenceId: raBill1.id,
      narration: 'Being certified revenue and GST booked for RA Bill 03 - Skyline Heights Project',
      isPosted: true,
      createdById: userMap['ACCOUNTS_MANAGER'].id,
    },
  });

  const accAR = await prisma.account.findUnique({ where: { code: '1100' } });
  const accRetRec = await prisma.account.findUnique({ where: { code: '1150' } });
  const accTds = await prisma.account.findUnique({ where: { code: '2250' } });
  const accRev = await prisma.account.findUnique({ where: { code: '4010' } });
  const accOutGst = await prisma.account.findUnique({ where: { code: '2200' } });
  const accBank = await prisma.account.findUnique({ where: { code: '1030' } });
  const accAP = await prisma.account.findUnique({ where: { code: '2010' } });
  const accMatCost = await prisma.account.findUnique({ where: { code: '5010' } });
  const accInpGst = await prisma.account.findUnique({ where: { code: '1300' } });

  if (accAR && accRetRec && accTds && accRev && accOutGst) {
    await prisma.journalLine.createMany({
      data: [
        { journalEntryId: je1.id, accountId: accAR.id, debit: 42735000, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je1.id, accountId: accRetRec.id, debit: 1925000, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je1.id, accountId: accTds.id, debit: 770000, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je1.id, accountId: accRev.id, debit: 0, credit: 38500000, projectId: prjSkyline.id },
        { journalEntryId: je1.id, accountId: accOutGst.id, debit: 0, credit: 6930000, projectId: prjSkyline.id },
      ],
    });
  }

  // Entry 2: Client Payment Received ₹3.00 Cr
  // Dr. HDFC Bank ₹3,00,00,000
  // Cr. Accounts Receivable ₹3,00,00,000
  const je2 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-00102',
      entryDate: new Date('2024-10-15'),
      referenceType: 'CLIENT_RECEIPT',
      referenceId: raBill1.id,
      narration: 'Being RTGS part payment received from Prestige Urban Developers against RA Bill 03',
      isPosted: true,
      createdById: userMap['ACCOUNTS_MANAGER'].id,
    },
  });

  if (accBank && accAR) {
    await prisma.journalLine.createMany({
      data: [
        { journalEntryId: je2.id, accountId: accBank.id, debit: 30000000, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je2.id, accountId: accAR.id, debit: 0, credit: 30000000, projectId: prjSkyline.id },
      ],
    });
  }

  // Entry 3: Supplier PO Invoice Booking
  // Dr. Direct Material Cost ₹1,56,500
  // Dr. Input GST ₹42,560
  // Cr. Accounts Payable (Shree Balaji) ₹1,99,060
  const je3 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-00103',
      entryDate: new Date('2024-10-18'),
      referenceType: 'SUPPLIER_INVOICE',
      referenceId: suppInv1.id,
      narration: 'Being 400 Bags Cement purchased from Shree Balaji under PO-2024-089 for Skyline project',
      isPosted: true,
      createdById: userMap['ACCOUNTS_MANAGER'].id,
    },
  });

  if (accMatCost && accInpGst && accAP) {
    await prisma.journalLine.createMany({
      data: [
        { journalEntryId: je3.id, accountId: accMatCost.id, debit: 156500, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je3.id, accountId: accInpGst.id, debit: 42560, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je3.id, accountId: accAP.id, debit: 0, credit: 199060, projectId: prjSkyline.id },
      ],
    });
  }

  // Entry 4: Supplier Payment
  // Dr. Accounts Payable ₹1,00,000
  // Cr. HDFC Bank ₹1,00,000
  const je4 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-00104',
      entryDate: new Date('2024-10-19'),
      referenceType: 'SUPPLIER_PAYMENT',
      referenceId: suppInv1.id,
      narration: 'Being part payment made to Shree Balaji Cements via bank transfer',
      isPosted: true,
      createdById: userMap['ACCOUNTS_MANAGER'].id,
    },
  });

  if (accAP && accBank) {
    await prisma.journalLine.createMany({
      data: [
        { journalEntryId: je4.id, accountId: accAP.id, debit: 100000, credit: 0, projectId: prjSkyline.id },
        { journalEntryId: je4.id, accountId: accBank.id, debit: 0, credit: 100000, projectId: prjSkyline.id },
      ],
    });
  }
  console.log(`✓ Double-entry balanced journal entries posted and balanced`);

  // 18. Audit Logs & Notifications
  await prisma.auditLog.createMany({
    data: [
      {
        userId: userMap['OWNER'].id,
        action: 'APPROVE',
        entity: 'PURCHASE_ORDER',
        entityId: po1.id,
        details: JSON.stringify({ poNumber: po1.poNumber, amount: po1.totalAmount, supplier: supplierBalaji.name }),
      },
      {
        userId: userMap['ACCOUNTS_MANAGER'].id,
        action: 'POST_JOURNAL',
        entity: 'CLIENT_INVOICE',
        entityId: raBill1.id,
        details: JSON.stringify({ invoiceNumber: raBill1.invoiceNumber, netAmount: raBill1.netInvoiceAmount }),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: userMap['OWNER'].id,
        title: 'New RA Bill Submitted for ₹4.27 Cr',
        message: 'Prestige Urban Developers RA Bill 03 generated and verified. Part payment ₹3.00 Cr received.',
        type: 'APPROVAL',
        linkUrl: '/billing',
      },
      {
        userId: userMap['STOREKEEPER'].id,
        title: 'Low Stock Alert: TMT 12mm Rebars',
        message: 'Current stock in Central Store has fallen to 8 tonnes (Reorder level: 10 tonnes)',
        type: 'LOW_STOCK',
        linkUrl: '/inventory',
      },
      {
        userId: userMap['PROJECT_MANAGER'].id,
        title: 'Task Milestone Due Soon',
        message: 'Tower A 8th Floor Slab Shuttering & Rebar is due on 25-Oct-2024 (84% complete)',
        type: 'TASK_DUE',
        linkUrl: '/tasks',
      },
    ],
  });

  console.log('✅ ERP database seeded successfully with comprehensive operational data!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
