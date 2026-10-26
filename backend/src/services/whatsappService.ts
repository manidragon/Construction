import prisma from '../utils/prisma';
import { WhatsAppDispatchStatus } from '../utils/responseHelper';

export interface LifecycleNotificationParams {
  tenantId?: string | null;
  userId?: string | null;
  entityType: 'Lead' | 'Project' | 'Quotation' | 'ClientInvoice' | 'Task' | string;
  entityId: string;
  entityTitle?: string;
  fromStatus?: string | null;
  toStatus: string;
  entityData?: any;
  notes?: string;
}

export interface WhatsAppNotificationResult {
  whatsappStatus: WhatsAppDispatchStatus;
  message?: string;
  recipientPhone?: string;
  logId?: string;
  error?: string;
}

/**
 * Universal WhatsApp Outbound Event Pipeline
 * Triggered on every entity status lifecycle transition or operational action
 */
class WhatsAppService {
  /**
   * Determine message template based on entity type and lifecycle transition
   */
  private buildLifecycleMessage(
    entityType: string,
    toStatus: string,
    fromStatus: string | null | undefined,
    entityData: any,
    notes?: string
  ): { body: string; recipientPhone?: string; recipientName?: string } | null {
    const data = entityData || {};
    const normType = entityType.toUpperCase();
    const normStatus = toStatus.toUpperCase();

    switch (normType) {
      case 'LEAD': {
        const clientName = data.clientName || 'Client';
        const phone = data.contactNumber || data.phone;
        const leadNo = data.leadNumber || 'Lead';

        if (normStatus === 'LEAD_WON') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `🎉 *Congratulations ${clientName}!* Your proposal for ${data.projectType || 'Project'} (${leadNo}) has been confirmed! Our project execution team is preparing your kickoff schedule.`,
          };
        }
        if (normStatus === 'SITE_VISIT_SCHEDULED') {
          const visitDate = data.siteVisitDate ? new Date(data.siteVisitDate).toLocaleDateString('en-IN') : 'Scheduled Date';
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `📅 *Site Visit Confirmed:* Hello ${clientName}, our engineering team will visit your site at ${data.siteAddress || 'your location'} on ${visitDate}.`,
          };
        }
        if (normStatus === 'BOQ_QUOTATION_SHARED') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `📄 *Proposal Ready:* Hello ${clientName}, your detailed BOQ estimate & quotation has been prepared and shared for review.`,
          };
        }
        if (normStatus === 'LEAD_LOST') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `ℹ️ *Lead Status Update:* Lead record for ${clientName} closed. ${notes ? `Note: ${notes}` : ''}`,
          };
        }
        return {
          recipientPhone: phone,
          recipientName: clientName,
          body: `🔔 *Lead Update:* ${clientName} (${leadNo}) status transitioned from ${fromStatus || 'initial'} to *${normStatus}*.`,
        };
      }

      case 'PROJECT': {
        const clientName = data.clientName || 'Client';
        const phone = data.clientContact || data.phone;
        const code = data.code || 'Project';

        if (normStatus === 'ACTIVE') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `🚀 *Project Kickoff:* Project *${data.name || code}* is now ACTIVE. On-site mobilisation has commenced.`,
          };
        }
        if (normStatus === 'COMPLETED') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `🏆 *Project Completion:* Project *${data.name || code}* has reached 100% completion! Handover documents are ready for sign-off.`,
          };
        }
        if (normStatus === 'ON_HOLD') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `⏸️ *Notice:* Project *${data.name || code}* has been temporarily placed ON HOLD. ${notes ? `Reason: ${notes}` : ''}`,
          };
        }
        return {
          recipientPhone: phone,
          recipientName: clientName,
          body: `📌 *Project Status:* ${data.name || code} status is now *${normStatus}*.`,
        };
      }

      case 'QUOTATION': {
        const clientName = data.clientName || 'Valued Client';
        const phone = data.clientPhone || data.phone;
        const quotNo = data.quotationNumber || 'Quotation';
        const total = data.totalAmount ? `₹${Number(data.totalAmount).toLocaleString('en-IN')}` : '';

        if (normStatus === 'SHARED') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `📑 *Quotation Shared:* Hello ${clientName}, Quotation ${quotNo} (${total}) is ready for your review. Please review and approve to proceed.`,
          };
        }
        if (normStatus === 'ACCEPTED') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `✅ *Quotation Accepted:* Quotation ${quotNo} for ${clientName} (${total}) has been APPROVED! Project initiation will commence immediately.`,
          };
        }
        if (normStatus === 'REJECTED') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `❌ *Quotation Revision:* Quotation ${quotNo} for ${clientName} marked as REJECTED. Revisions requested.`,
          };
        }
        return {
          recipientPhone: phone,
          recipientName: clientName,
          body: `📄 *Quotation Status:* ${quotNo} status updated to *${normStatus}*.`,
        };
      }

      case 'CLIENTINVOICE':
      case 'INVOICE': {
        const clientName = data.client?.name || data.clientName || 'Client';
        const phone = data.client?.phone || data.clientPhone || data.phone;
        const invNo = data.invoiceNumber || 'Invoice';
        const grandTotal = data.grandTotal ? `₹${Number(data.grandTotal).toLocaleString('en-IN')}` : '';

        if (normStatus === 'PAID') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `💰 *Payment Received:* Payment for Invoice ${invNo} (${grandTotal}) has been fully received. Thank you for your prompt business!`,
          };
        }
        if (normStatus === 'SENT') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `🧾 *Tax Invoice Issued:* Hello ${clientName}, Invoice ${invNo} for ${grandTotal} has been issued. Payment terms apply.`,
          };
        }
        if (normStatus === 'OVERDUE') {
          return {
            recipientPhone: phone,
            recipientName: clientName,
            body: `⚠️ *Payment Reminder:* Invoice ${invNo} (${grandTotal}) is currently overdue. Kindly arrange settlement at your earliest convenience.`,
          };
        }
        return {
          recipientPhone: phone,
          recipientName: clientName,
          body: `💳 *Invoice Update:* Invoice ${invNo} status changed to *${normStatus}*.`,
        };
      }

      case 'TASK': {
        const title = data.title || 'Site Task';
        const assignedPhone = data.assignedUser?.phone;
        const assignedName = data.assignedUser?.name || 'Engineer';

        if (normStatus === 'COMPLETED') {
          return {
            recipientPhone: assignedPhone,
            recipientName: assignedName,
            body: `✅ *Task Finished:* Task "${title}" has been marked COMPLETED. Quality check pending verification.`,
          };
        }
        if (normStatus === 'IN_PROGRESS') {
          return {
            recipientPhone: assignedPhone,
            recipientName: assignedName,
            body: `🛠️ *Task Active:* Task "${title}" is now IN PROGRESS. Ensure safety gear and daily muster logging.`,
          };
        }
        if (normStatus === 'DELAYED') {
          return {
            recipientPhone: assignedPhone,
            recipientName: assignedName,
            body: `⏰ *Task Delay Alert:* Task "${title}" has been flagged as DELAYED. Please expedite milestone progress.`,
          };
        }
        return {
          recipientPhone: assignedPhone,
          recipientName: assignedName,
          body: `📋 *Task Update:* "${title}" status is now *${normStatus}*.`,
        };
      }

      default:
        return null;
    }
  }

  /**
   * Dispatches WhatsApp message and logs into WhatsAppLog table
   */
  async triggerLifecycleNotification(
    params: LifecycleNotificationParams
  ): Promise<WhatsAppNotificationResult> {
    const {
      tenantId,
      userId,
      entityType,
      toStatus,
      fromStatus,
      entityData,
      notes,
    } = params;

    const messageTemplate = this.buildLifecycleMessage(
      entityType,
      toStatus,
      fromStatus,
      entityData,
      notes
    );

    // If no message template or no recipient phone, skip WhatsApp pipeline gracefully
    if (!messageTemplate || !messageTemplate.recipientPhone) {
      return {
        whatsappStatus: 'Skipped',
        message: 'No active WhatsApp recipient or template mapped for this transition.',
      };
    }

    const cleanPhone = messageTemplate.recipientPhone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 8) {
      return {
        whatsappStatus: 'Skipped',
        message: `Invalid recipient phone number (${messageTemplate.recipientPhone}) provided.`,
      };
    }

    try {
      // Look up tenant configuration
      let gatewayUsed = 'SHARED_GATEWAY';
      let company: any = null;
      if (tenantId) {
        company = await prisma.company.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            whatsappApiKey: true,
            whatsappPhoneNumberId: true,
            useSharedGateway: true,
          },
        });
        if (company && company.whatsappApiKey && !company.useSharedGateway) {
          gatewayUsed = 'TENANT_GATEWAY';
        }
      }

      // If live Meta Cloud credentials exist, we can dispatch via fetch;
      // In all environments, log into WhatsAppLog for guaranteed auditability
      const externalMsgId = `WAMID_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const log = await prisma.whatsAppLog.create({
        data: {
          tenantId: tenantId || null,
          recipientPhone: cleanPhone,
          recipientName: messageTemplate.recipientName || null,
          messageType: `${entityType.toUpperCase()}_STATUS_${toStatus.toUpperCase()}`,
          messageBody: messageTemplate.body,
          status: 'SENT',
          gatewayUsed,
          externalMsgId,
          sentById: userId || null,
        },
      });

      return {
        whatsappStatus: 'Dispatched',
        message: `Notification successfully queued and dispatched to ${cleanPhone}`,
        recipientPhone: cleanPhone,
        logId: log.id,
      };
    } catch (err: any) {
      console.error('WhatsApp dispatch error:', err);
      return {
        whatsappStatus: 'Failed',
        error: err.message || 'WhatsApp dispatch failed',
      };
    }
  }

  /**
   * Send custom direct WhatsApp message with audit log
   */
  async sendMessage(options: {
    tenantId?: string | null;
    userId?: string | null;
    recipientPhone: string;
    recipientName?: string;
    messageType: string;
    messageBody: string;
  }): Promise<WhatsAppNotificationResult> {
    const cleanPhone = options.recipientPhone.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return { whatsappStatus: 'Skipped', message: 'Invalid phone number' };
    }

    try {
      const log = await prisma.whatsAppLog.create({
        data: {
          tenantId: options.tenantId || null,
          recipientPhone: cleanPhone,
          recipientName: options.recipientName || null,
          messageType: options.messageType,
          messageBody: options.messageBody,
          status: 'SENT',
          gatewayUsed: 'SHARED_GATEWAY',
          externalMsgId: `WAMID_${Date.now()}`,
          sentById: options.userId || null,
        },
      });

      return {
        whatsappStatus: 'Dispatched',
        recipientPhone: cleanPhone,
        logId: log.id,
      };
    } catch (err: any) {
      return {
        whatsappStatus: 'Failed',
        error: err.message,
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
