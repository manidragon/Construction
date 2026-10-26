import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

/**
 * GET /api/company/settings
 * Fetch current tenant's company branding, WhatsApp settings, and invoice preferences
 */
export const getCompanySettings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            leads: true,
            invoices: true,
            whatsappLogs: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company settings not found.' });
    }

    return res.json({
      success: true,
      settings: {
        id: company.id,
        name: company.name,
        companyName: company.companyName || company.name,
        code: company.code,
        ownerEmail: company.ownerEmail || company.email,
        phone: company.phone,
        email: company.email,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        gstin: company.gstin,
        pan: company.pan,
        currencySymbol: company.currencySymbol,
        status: company.status,
        planType: company.planType,
        trialStartDate: company.trialStartDate,
        trialEndDate: company.trialEndDate,
        // Branding & PDF Invoices
        logoUrl: company.logoUrl,
        businessAddress: company.businessAddress || company.address,
        invoiceFooterNotes: company.invoiceFooterNotes,
        // WhatsApp Configuration
        whatsappApiKey: company.whatsappApiKey ? '••••••••' + company.whatsappApiKey.slice(-4) : '',
        hasCustomWhatsappApiKey: !!company.whatsappApiKey,
        whatsappPhoneNumberId: company.whatsappPhoneNumberId || '',
        whatsappBusinessAccountId: company.whatsappBusinessAccountId || '',
        useSharedGateway: company.useSharedGateway,
        counts: company._count,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company settings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/company/settings
 * Update company logo, business address, invoice preferences, and WhatsApp API credentials
 */
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const {
      companyName,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      gstin,
      pan,
      currencySymbol,
      // Branding
      logoUrl,
      businessAddress,
      invoiceFooterNotes,
      // WhatsApp Gateway
      whatsappApiKey,
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      useSharedGateway,
    } = req.body;

    const current = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    if (!current) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const updateData: any = {};
    if (companyName) {
      updateData.name = companyName.trim();
      updateData.companyName = companyName.trim();
    }
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (gstin !== undefined) updateData.gstin = gstin;
    if (pan !== undefined) updateData.pan = pan;
    if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol;

    // PDF Invoice & Branding
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
    if (invoiceFooterNotes !== undefined) updateData.invoiceFooterNotes = invoiceFooterNotes;

    // WhatsApp Credentials
    if (whatsappApiKey !== undefined && whatsappApiKey !== '••••••••' + (current.whatsappApiKey?.slice(-4) || '')) {
      updateData.whatsappApiKey = whatsappApiKey;
    }
    if (whatsappPhoneNumberId !== undefined) updateData.whatsappPhoneNumberId = whatsappPhoneNumberId;
    if (whatsappBusinessAccountId !== undefined) updateData.whatsappBusinessAccountId = whatsappBusinessAccountId;
    if (useSharedGateway !== undefined) updateData.useSharedGateway = Boolean(useSharedGateway);

    const updated = await prisma.company.update({
      where: { id: req.user.companyId },
      data: updateData,
    });

    await logAudit(req.user.id, 'UPDATE_COMPANY_SETTINGS', 'COMPANY', updated.id, {
      updatedFields: Object.keys(updateData),
    }, req.ip);

    return res.json({
      success: true,
      message: 'Company settings, invoice branding & WhatsApp configuration updated successfully.',
      company: updated,
    });
  } catch (error: any) {
    console.error('Error updating company settings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/whatsapp/test-connection
 * Send a test WhatsApp message using tenant's custom credentials or shared gateway
 */
export const testWhatsAppConnection = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const testPhoneNumber = req.body.testPhoneNumber || req.body.recipientPhone;
    const customMessage = req.body.customMessage || req.body.testMessage;
    if (!testPhoneNumber) {
      return res.status(400).json({ success: false, message: 'Test phone number is required.' });
    }

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const gatewayUsed = !company.useSharedGateway && company.whatsappApiKey && company.whatsappPhoneNumberId
      ? 'TENANT_GATEWAY'
      : 'SHARED_GATEWAY';

    const messageBody = customMessage ||
      `Hello! This is a test message from ${company.name} on Construction ERP & CRM. Outbound WhatsApp integration is functioning correctly (${gatewayUsed}). Timestamp: ${new Date().toLocaleTimeString()}`;

    // Record in WhatsApp Log
    const logDelegate = (prisma as any).whatsAppLog || (prisma as any).whatsappLog;
    let log: any = null;
    if (logDelegate) {
      log = await logDelegate.create({
        data: {
          tenantId: company.id,
          recipientPhone: String(testPhoneNumber).trim(),
          recipientName: 'Test Recipient',
          messageType: 'TEST_PING',
          messageBody,
          status: 'SENT',
          gatewayUsed,
          externalMsgId: `WAMID_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          sentById: req.user.id,
        },
        include: {
          sentBy: { select: { name: true, role: true } },
        },
      });
    }

    return res.json({
      success: true,
      message: `Test WhatsApp message sent successfully via ${gatewayUsed === 'TENANT_GATEWAY' ? 'Tenant Custom Cloud API' : 'Nearlook Shared Gateway'}!`,
      gatewayUsed,
      log,
    });
  } catch (error: any) {
    console.error('Error testing WhatsApp connection:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/whatsapp/logs
 * List outbound WhatsApp logs for current tenant (or all for SUPER_ADMIN)
 */
export const getWhatsAppLogs = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const where: any = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      where.tenantId = req.user.companyId;
    } else if (req.query.tenantId) {
      where.tenantId = String(req.query.tenantId);
    }

    const logDelegate = (prisma as any).whatsAppLog || (prisma as any).whatsappLog;
    const logs = logDelegate
      ? await logDelegate.findMany({
          where,
          include: {
            tenant: { select: { id: true, name: true, code: true } },
            sentBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : [];

    return res.json({ success: true, logs, total: logs.length });
  } catch (error: any) {
    console.error('Error fetching WhatsApp logs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
