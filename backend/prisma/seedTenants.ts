import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Multi-Tenancy, Super Admin, Trial Accounts & Company Configurations...');

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const superAdminHash = await bcrypt.hash('SuperAdmin@123', 10);

  // 1. SaaS Platform Super Admin Company & User
  const saasCompany = await prisma.company.upsert({
    where: { code: 'NEARLOOK-HQ' },
    update: {
      status: 'ACTIVE',
      planType: 'ENTERPRISE',
      companyName: 'Nearlook SaaS Technologies',
      ownerEmail: 'superadmin@nearlook.com',
    },
    create: {
      name: 'Nearlook SaaS Technologies',
      companyName: 'Nearlook SaaS Technologies',
      code: 'NEARLOOK-HQ',
      ownerEmail: 'superadmin@nearlook.com',
      status: 'ACTIVE',
      planType: 'ENTERPRISE',
      address: 'Nearlook Tech Park, Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      phone: '+91 80 9999 8888',
      email: 'support@nearlook.com',
      currencySymbol: '₹',
      useSharedGateway: true,
      logoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=160&auto=format&fit=crop&q=80',
      businessAddress: 'Nearlook SaaS Tower, Embassy GolfLinks, Bengaluru, KA 560071',
    },
  });

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@nearlook.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      companyId: saasCompany.id,
      name: 'Nearlook Platform Admin',
      email: 'superadmin@nearlook.com',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      designation: 'Platform Super Administrator',
      phone: '+91 98450 00000',
    },
  });
  console.log(`✓ Super Admin created: ${superAdminUser.email} (Role: ${superAdminUser.role})`);

  // 2. Update Primary Tenant: Apex Buildtech & Infrastructure
  const apexCompany = await prisma.company.findFirst({ where: { code: 'APEX-INFRA' } });
  if (apexCompany) {
    const trialStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trialEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.company.update({
      where: { id: apexCompany.id },
      data: {
        status: 'ACTIVE',
        planType: 'ENTERPRISE',
        companyName: 'Apex Buildtech & Infrastructure Pvt. Ltd.',
        ownerEmail: 'owner@apexbuild.com',
        trialStartDate,
        trialEndDate,
        useSharedGateway: true,
        logoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=160&auto=format&fit=crop&q=80',
        businessAddress: 'Prestige Trade Tower, 14th Floor, High Grounds, Bengaluru - 560001',
        invoiceFooterNotes: 'Bank Details: Apex Buildtech Pvt. Ltd. | HDFC Current A/c 50200012345678 | IFSC: HDFC0001234 | Late payments subject to 2% weekly interest.',
      },
    });

    // Make sure owner has TENANT_ADMIN / OWNER permissions
    await prisma.user.updateMany({
      where: { email: 'owner@apexbuild.com' },
      data: { role: 'TENANT_ADMIN' },
    });

    // Backfill tenantId on all Apex child records
    await prisma.project.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.task.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.worker.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.expense.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.client.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.clientInvoice.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.lead.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.quotation.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.material.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.warehouse.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.stockLedger.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.supplier.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.materialRequisition.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.purchaseOrder.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.goodsReceiptNote.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.supplierInvoice.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.supplierPayment.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.clientReceipt.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.account.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.journalEntry.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.equipmentAsset.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.documentAttachment.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.officeStaff.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.officeExpense.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.subcontractor.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });
    await prisma.pettyCashAccount.updateMany({ where: { tenantId: null }, data: { tenantId: apexCompany.id } });

    console.log(`✓ Updated Apex Buildtech as ACTIVE Enterprise Tenant & backfilled tenantId.`);
  }

  // 3. Create Active Trial Tenant: Skyline Urban Developers
  const skylineStart = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const skylineEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days remaining

  const skylineCompany = await prisma.company.upsert({
    where: { code: 'SKYLINE-DEV' },
    update: {
      status: 'TRIAL',
      planType: 'PRO',
      trialStartDate: skylineStart,
      trialEndDate: skylineEnd,
      companyName: 'Skyline Urban Developers',
      ownerEmail: 'admin@skyline.com',
    },
    create: {
      name: 'Skyline Urban Developers',
      companyName: 'Skyline Urban Developers',
      code: 'SKYLINE-DEV',
      ownerEmail: 'admin@skyline.com',
      status: 'TRIAL',
      planType: 'PRO',
      trialStartDate: skylineStart,
      trialEndDate: skylineEnd,
      address: 'Skyline Hub, 3rd Floor, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      phone: '+91 98450 33445',
      email: 'admin@skyline.com',
      currencySymbol: '₹',
      useSharedGateway: true,
      logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=160&auto=format&fit=crop&q=80',
      businessAddress: 'Skyline Hub, 100ft Road, Indiranagar, Bengaluru - 560038',
      invoiceFooterNotes: 'Thank you for building with Skyline Urban Developers.',
    },
  });

  const skylineAdmin = await prisma.user.upsert({
    where: { email: 'admin@skyline.com' },
    update: { role: 'TENANT_ADMIN' },
    create: {
      companyId: skylineCompany.id,
      name: 'Karan Mehra',
      email: 'admin@skyline.com',
      passwordHash,
      role: 'TENANT_ADMIN',
      designation: 'Managing Partner',
      phone: '+91 98450 33445',
    },
  });
  console.log(`✓ Active Trial Tenant created: Skyline Urban Developers (${skylineAdmin.email}, 10 days remaining)`);

  // 4. Create Expired Trial Tenant: Starlight Interiors & Design
  const starlightStart = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const starlightEnd = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // Expired 6 days ago

  const starlightCompany = await prisma.company.upsert({
    where: { code: 'STARLIGHT-INT' },
    update: {
      status: 'EXPIRED',
      planType: 'FREE_TRIAL',
      trialStartDate: starlightStart,
      trialEndDate: starlightEnd,
      companyName: 'Starlight Interiors & Design',
      ownerEmail: 'owner@starlight.com',
    },
    create: {
      name: 'Starlight Interiors & Design',
      companyName: 'Starlight Interiors & Design',
      code: 'STARLIGHT-INT',
      ownerEmail: 'owner@starlight.com',
      status: 'EXPIRED',
      planType: 'FREE_TRIAL',
      trialStartDate: starlightStart,
      trialEndDate: starlightEnd,
      address: 'Design Boulevard, Lavelle Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+91 98450 55667',
      email: 'owner@starlight.com',
      currencySymbol: '₹',
      useSharedGateway: true,
      businessAddress: 'Design Boulevard, Lavelle Road, Bengaluru - 560001',
    },
  });

  const starlightAdmin = await prisma.user.upsert({
    where: { email: 'owner@starlight.com' },
    update: { role: 'TENANT_ADMIN' },
    create: {
      companyId: starlightCompany.id,
      name: 'Rohan Singhania',
      email: 'owner@starlight.com',
      passwordHash,
      role: 'TENANT_ADMIN',
      designation: 'Founder & Principal Designer',
      phone: '+91 98450 55667',
    },
  });
  console.log(`✓ Expired Trial Tenant created: Starlight Interiors & Design (${starlightAdmin.email}, EXPIRED)`);

  // 5. Seed some initial WhatsApp Logs for testing
  const logModel = (prisma as any).whatsAppLog || (prisma as any).whatsappLog;
  if (logModel) {
    await logModel.createMany({
    data: [
      {
        tenantId: apexCompany ? apexCompany.id : saasCompany.id,
        recipientPhone: '+919845123456',
        recipientName: 'Dr. Arvind & Malini Varma',
        messageType: 'QUOTATION_SUMMARY',
        messageBody: 'Apex Buildtech Quotation: QUOT-2026-001 shared via WhatsApp. Total: ₹10,03,944.',
        status: 'DELIVERED',
        gatewayUsed: 'SHARED_GATEWAY',
        externalMsgId: 'WAMID_APX_001',
      },
      {
        tenantId: skylineCompany.id,
        recipientPhone: '+919845033445',
        recipientName: 'Karan Mehra',
        messageType: 'TRIAL_WELCOME',
        messageBody: 'Welcome to your 14-day trial on Construction ERP & CRM! Skyline Urban Developers workspace is active.',
        status: 'DELIVERED',
        gatewayUsed: 'SHARED_GATEWAY',
        externalMsgId: 'WAMID_SKY_001',
      },
    ],
  });
    console.log('✓ Initial WhatsApp Logs seeded.');
  }

  console.log('✨ Multi-tenancy and Trial seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding tenants:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
