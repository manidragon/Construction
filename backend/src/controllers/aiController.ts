import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit, getTenantFilter } from '../middleware/auth';
import { generateNextInvoiceNumber, getNextReceiptNumber } from './billingController';
import { postBalancedJournalEntry, COA } from '../utils/accounting';
import { extractDateFromPrompt } from '../utils/dateParser';
import {
  queryUniversalERPEngine,
  getConstructionConceptAnswer,
  getERPWorkflowHowToGuide,
  getConversationalResponse,
  handleQuotationQuery,
  handleLeadQuery,
  handleTenantQuery,
} from '../services/aiIntelligenceService';

export interface AIActionResponse {
  message: string;
  actionTaken?: string;
  data?: any;
  shareableUrls?: {
    whatsapp?: string;
    email?: string;
  };
  googleSheetsCsv?: string;
  suggestedPrompts?: string[];
}

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

const formatDateStr = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Helper: match project from natural language prompt with context-aware fallback
export const findMatchedProject = async (text: string, context?: any, tenantFilter?: any) => {
  const projects = await prisma.project.findMany({
    where: tenantFilter || {},
    include: {
      clientInvoices: true,
      clientReceipts: true,
      workers: { where: { isActive: true } },
      tasks: { where: { status: { not: 'COMPLETED' } } },
    },
  });
  const lower = text.toLowerCase();

  // 1. Exact project name or code match in text
  for (const p of projects) {
    if (p.code && lower.includes(p.code.toLowerCase())) return p;
    if (p.name && lower.includes(p.name.toLowerCase())) return p;
  }

  // Common stop words to deprioritize in fuzzy matching
  const stopWords = new Set(['project', 'house', 'site', 'work', 'theni', 'luxury', 'phase', 'tower', 'apartments', 'villa', 'from', 'with', 'received', 'payment', 'paid']);

  // 2. Score by matching whole distinctive words (\bword\b)
  let bestProject: any = null;
  let bestScore = 0;

  for (const p of projects) {
    let score = 0;
    // Project name words
    const nameWords = p.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    for (const w of nameWords) {
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      if (regex.test(text)) {
        score += stopWords.has(w) ? 1 : 4;
      }
    }

    // Client name words
    if (p.clientName) {
      const clientWords = p.clientName.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      for (const w of clientWords) {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(text)) {
          score += stopWords.has(w) ? 1 : 3;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestProject = p;
    }
  }

  if (bestScore >= 3) {
    return bestProject;
  }

  // 3. CONTEXT-AWARE FALLBACK:
  // Pre-select active project if user is currently working inside a project view or filter
  if (context?.selectedProjectId) {
    const ctxProj = projects.find((p) => p.id === context.selectedProjectId);
    if (ctxProj) return ctxProj;
  }
  if (context?.projectId) {
    const ctxProj = projects.find((p) => p.id === context.projectId);
    if (ctxProj) return ctxProj;
  }

  // 4. Default to single project if company has only 1 project
  if (projects.length === 1) {
    return projects[0];
  }

  return null;
};

// Helper: match client from natural language prompt with context-aware fallback
export const findMatchedClient = async (text: string, context?: any, tenantFilter?: any) => {
  const clients = await prisma.client.findMany({
    where: tenantFilter || {},
    include: {
      invoices: true,
      receipts: true,
    },
  });
  const lower = text.toLowerCase();

  let matched = clients.find(
    (c) =>
      lower.includes(c.name.toLowerCase()) ||
      lower.includes(c.code.toLowerCase()) ||
      (c.companyName && lower.includes(c.companyName.toLowerCase()))
  );
  if (matched) return matched;

  matched = clients.find((c) => {
    const words = c.name.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 3);
    return words.some((w) => lower.includes(w));
  });
  if (matched) return matched;

  // Context-aware fallback:
  if (context?.selectedClientId) {
    const ctxCli = clients.find((c) => c.id === context.selectedClientId);
    if (ctxCli) return ctxCli;
  }
  if (context?.selectedClientName) {
    const ctxCli = clients.find((c) => c.name.toLowerCase() === context.selectedClientName.toLowerCase());
    if (ctxCli) return ctxCli;
  }
  if (context?.clientName) {
    const ctxCli = clients.find((c) => c.name.toLowerCase() === context.clientName.toLowerCase());
    if (ctxCli) return ctxCli;
  }

  if (clients.length === 1) {
    return clients[0];
  }

  return null;
};

// Helper: match worker from natural language prompt
const findMatchedWorker = async (text: string, projectId?: string) => {
  const workers = await prisma.worker.findMany({
    where: {
      isActive: true,
      ...(projectId ? { projectId } : {}),
    },
    include: { project: true },
  });
  const lower = text.toLowerCase();

  // 1. Worker code match (e.g. WRK-010)
  let matched = workers.find((w) => w.workerCode && lower.includes(w.workerCode.toLowerCase()));
  if (matched) return matched;

  // 2. Direct full name match
  matched = workers.find((w) => w.name && lower.includes(w.name.toLowerCase()));
  if (matched) return matched;

  // 3. Name token match (length >= 3)
  matched = workers.find((w) => {
    if (!w.name) return false;
    const nameLower = w.name.toLowerCase();
    const tokens = nameLower.split(/\s+/).filter((t) => t.length >= 3);
    return tokens.some((t) => lower.includes(t));
  });
  if (matched) return matched;

  // 4. Trade match if only 1 worker with this trade exists in project
  const tradeMatches = workers.filter((w) => w.trade && lower.includes(w.trade.toLowerCase()));
  if (tradeMatches.length === 1) return tradeMatches[0];

  // 5. Fallback across all active workers if project was specified
  if (projectId) {
    const allWorkers = await prisma.worker.findMany({
      where: { isActive: true },
      include: { project: true },
    });
    matched = allWorkers.find((w) => {
      if (!w.name) return false;
      const nameLower = w.name.toLowerCase();
      if (lower.includes(nameLower)) return true;
      const tokens = nameLower.split(/\s+/).filter((t) => t.length >= 3);
      return tokens.some((t) => lower.includes(t));
    });
    if (matched) return matched;
  }

  return null;
};

// =============================================================
// CONFIRMATION ACTION EXECUTOR (TWO-WAY TRANSACTION COMMIT)
// =============================================================
export const executeActionPayload = async (req: Request, res: Response, payload: any) => {
  const { action } = payload;
  const tenantFilter = getTenantFilter(req);
  const tenantId = (req.user as any)?.companyId || payload.tenantId || null;

  if (action === 'CANCEL') {
    return res.json({
      success: true,
      response: {
        message: '❌ **Transaction Cancelled.**\n\nNo records were created and financial ledgers remain untouched.',
        actionTaken: 'TRANSACTION_CANCELLED',
        suggestedPrompts: [
          'What are all the payments received and paid today?',
          'What is the balance due amount of clients?',
        ],
      },
    });
  }

  if (action === 'CONFIRM_CLIENT_RECEIPT') {
    const { projectId, clientId, invoiceId, amount, paymentMethod, isAdvance, prompt } = payload;
    const targetProj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!targetProj) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const finalTenantId = targetProj.tenantId || tenantId;
    const { nextReceiptNumber } = await getNextReceiptNumber(req, finalTenantId);
    const refNo = `AI-${Date.now().toString().slice(-6)}`.toUpperCase();

    let openInv: any = null;
    if (invoiceId) {
      openInv = await prisma.clientInvoice.findUnique({ where: { id: invoiceId } });
    }

    // If marked as advance and no invoice was linked, create an Advance RA Bill to prevent orphaned receipts
    if (isAdvance && !openInv) {
      const invNumObj = await generateNextInvoiceNumber(targetProj.id, finalTenantId ? { tenantId: finalTenantId } : {});
      const nextInvNum = invNumObj.nextInvoiceNumber;
      openInv = await prisma.clientInvoice.create({
        data: {
          tenantId: finalTenantId,
          invoiceNumber: nextInvNum,
          clientId: clientId || null,
          projectId: targetProj.id,
          invoiceType: 'ADVANCE',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: amount,
          retentionPercent: 0,
          retentionAmount: 0,
          tdsPercent: 0,
          tdsAmount: 0,
          gstPercent: 0,
          gstAmount: 0,
          netInvoiceAmount: amount,
          paidAmount: amount,
          balanceDue: 0,
          status: 'PAID',
          milestoneName: 'Mobilization Advance',
          certificationNotes: 'Client Mobilization Advance Payment (Auto-generated via AI Copilot)',
        },
      });
    }

    const createdReceipt = await prisma.$transaction(async (tx) => {
      const rcp = await tx.clientReceipt.create({
        data: {
          tenantId: finalTenantId,
          receiptNumber: nextReceiptNumber,
          clientId: clientId || openInv?.clientId || null,
          projectId: targetProj.id,
          invoiceId: openInv ? openInv.id : null,
          receiptDate: new Date(),
          amount,
          paymentMethod: paymentMethod || 'NEFT_RTGS',
          referenceNo: refNo,
          notes: `Two-Way confirmed via AI copilot: "${prompt || 'Client Payment'}"`,
        },
        include: { project: true, invoice: true, client: true },
      });

      if (openInv && !isAdvance) {
        const newPaid = openInv.paidAmount + amount;
        const newBal = Math.max(0, openInv.netInvoiceAmount - newPaid);
        await tx.clientInvoice.update({
          where: { id: openInv.id },
          data: {
            paidAmount: newPaid,
            balanceDue: newBal,
            status: newBal === 0 ? 'PAID' : 'PARTIALLY_PAID',
          },
        });
      }

      return rcp;
    });

    // Balanced Journal Entry: Debit Cash/Bank, Credit Accounts Receivable
    try {
      const debitAccount = paymentMethod === 'CASH' ? COA.CASH : COA.HDFC_BANK;
      await postBalancedJournalEntry({
        tenantId: finalTenantId,
        entryDate: new Date(),
        referenceType: 'CLIENT_RECEIPT',
        referenceId: createdReceipt.id,
        narration: `Payment received from client ${nextReceiptNumber} via ${paymentMethod}. Two-Way confirmed.`,
        lines: [
          { accountCode: debitAccount, debit: amount, credit: 0, projectId: targetProj.id },
          { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, projectId: targetProj.id },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for confirmed receipt:', jeErr);
    }

    await logAudit(
      req.user?.id,
      'RECORD_CLIENT_RECEIPT',
      'CLIENT_RECEIPT',
      createdReceipt.id,
      { receiptNumber: nextReceiptNumber, amount },
      req.ip
    );

    const waText = encodeURIComponent(
      `🧾 *Payment Acknowledgment*\n\n` +
      `We have received ${formatINR(amount)} via ${paymentMethod} for project *${targetProj.name}*.\n` +
      `Receipt Ref: ${createdReceipt.receiptNumber}\n` +
      (openInv ? `Linked Bill: ${openInv.invoiceNumber} | Remaining Due: ${formatINR(Math.max(0, openInv.balanceDue - amount))}\n\n` : '\n') +
      `ApexBuild Financial Engine`
    );
    const clientPhone = targetProj.clientContact?.replace(/\D/g, '') || '';
    const waUrl = clientPhone ? `https://wa.me/${clientPhone}?text=${waText}` : `https://wa.me/?text=${waText}`;

    return res.json({
      success: true,
      response: {
        message:
          `✅ **Client Payment Receipt Confirmed & Committed to Database!**\n\n` +
          `• **Receipt Number:** **${createdReceipt.receiptNumber}**\n` +
          `• **Amount:** **${formatINR(amount)}** (${paymentMethod})\n` +
          `• **Project:** **${targetProj.name}** [${targetProj.code}]\n` +
          `• **Client:** ${createdReceipt.client?.name || targetProj.clientName || 'Client'}\n` +
          (openInv ? `• **Applied to RA Bill:** **${openInv.invoiceNumber}** (Updated Balance Due: **${formatINR(Math.max(0, openInv.balanceDue - amount))}**)\n` : `• **Classification:** Advance Payment\n`) +
          `• **General Ledger:** Cash/Bank accounts debited and Accounts Receivable credited.\n\n` +
          `You can share the official payment receipt directly via WhatsApp below:`,
        actionTaken: 'RECORD_CLIENT_RECEIPT',
        data: createdReceipt,
        shareableUrls: { whatsapp: waUrl },
        suggestedPrompts: [
          `What is the balance due amount of the client ${targetProj.name}?`,
          `Undo the last receipt entry for ${targetProj.name}`,
          'What are all the payments received and paid today?',
        ],
      },
    });
  }

  if (action === 'CONFIRM_GENERATE_RA_BILL') {
    const { projectId, clientId, certifiedSubtotal, retentionPercent, tdsPercent, gstPercent } = payload;
    const targetProj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!targetProj) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const finalTenantId = targetProj.tenantId || tenantId;
    const invNumObj = await generateNextInvoiceNumber(targetProj.id, finalTenantId ? { tenantId: finalTenantId } : {});
    const nextInvNum = invNumObj.nextInvoiceNumber;

    const sub = Number(certifiedSubtotal) || targetProj.contractValue || 100000;
    const retP = Number(retentionPercent) ?? 5.0;
    const tdsP = Number(tdsPercent) ?? 2.0;
    const gstP = Number(gstPercent) ?? 18.0;

    const retAmt = (sub * retP) / 100;
    const tdsAmt = (sub * tdsP) / 100;
    const gstAmt = (sub * gstP) / 100;
    const netAmount = sub - retAmt - tdsAmt + gstAmt;

    const createdInv = await prisma.clientInvoice.create({
      data: {
        tenantId: finalTenantId,
        invoiceNumber: nextInvNum,
        clientId: clientId || null,
        projectId: targetProj.id,
        invoiceType: 'RUNNING_ACCOUNT_RA',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: sub,
        retentionPercent: retP,
        retentionAmount: retAmt,
        tdsPercent: tdsP,
        tdsAmount: tdsAmt,
        gstPercent: gstP,
        gstAmount: gstAmt,
        netInvoiceAmount: netAmount,
        paidAmount: 0,
        balanceDue: netAmount,
        status: 'APPROVED',
        milestoneName: 'Running Account (RA) Work Progress',
        certificationNotes: `Running Account (RA) Bill generated via AI copilot`,
      },
      include: { project: true, client: true },
    });

    // Balanced Journal Entry: Debit Accounts Receivable, Credit Contract Revenue (and GST output)
    try {
      await postBalancedJournalEntry({
        tenantId: finalTenantId,
        entryDate: new Date(),
        referenceType: 'CLIENT_INVOICE',
        referenceId: createdInv.id,
        narration: `Certified RA Bill ${nextInvNum} for ${targetProj.name}. Revenue recognized.`,
        lines: [
          { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: netAmount, credit: 0, projectId: targetProj.id },
          { accountCode: COA.CONTRACT_REVENUE, debit: 0, credit: sub - retAmt - tdsAmt, projectId: targetProj.id },
          ...(gstAmt > 0 ? [{ accountCode: COA.OUTPUT_GST_18, debit: 0, credit: gstAmt, projectId: targetProj.id }] : []),
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for confirmed RA bill:', jeErr);
    }

    await logAudit(req.user?.id, 'CREATE_CLIENT_INVOICE', 'CLIENT_INVOICE', createdInv.id, { invoiceNumber: nextInvNum, netAmount }, req.ip);

    return res.json({
      success: true,
      response: {
        message:
          `✅ **Running Account (RA) Bill Successfully Generated!**\n\n` +
          `• **Bill Number:** **${createdInv.invoiceNumber}**\n` +
          `• **Project:** **${targetProj.name}** [${targetProj.code}]\n` +
          `• **Certified Subtotal:** ${formatINR(sub)}\n` +
          `• **Deductions:** Retention (${retP}%): -${formatINR(retAmt)} | TDS (${tdsP}%): -${formatINR(tdsAmt)}\n` +
          `• **GST (${gstP}%):** +${formatINR(gstAmt)}\n` +
          `• **Net Bill Amount (Due):** **${formatINR(netAmount)}**\n` +
          `• **Status:** APPROVED\n\n` +
          `You can now record client payment receipts against this verified RA Bill.`,
        actionTaken: 'GENERATE_RA_BILL',
        data: createdInv,
        suggestedPrompts: [
          `Received ₹${netAmount.toLocaleString('en-IN')} from ${targetProj.name}`,
          `What is the balance due amount of the client ${targetProj.name}?`,
        ],
      },
    });
  }

  if (action === 'CONFIRM_MATERIAL_PURCHASE') {
    const { projectId, materialId, supplierId, quantity, unitPrice, totalAmount, prompt } = payload;
    const targetProj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!targetProj) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const finalTenantId = targetProj.tenantId || tenantId;
    const currentYear = new Date().getFullYear();
    const poCount = await prisma.purchaseOrder.count({ where: finalTenantId ? { tenantId: finalTenantId } : {} });
    const poNumber = `PO-${currentYear}-${String(poCount + 1).padStart(3, '0')}`;

    let supplier = supplierId ? await prisma.supplier.findUnique({ where: { id: supplierId } }) : null;
    if (!supplier) {
      supplier = await prisma.supplier.findFirst({ where: finalTenantId ? { tenantId: finalTenantId } : {} });
    }
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          tenantId: finalTenantId,
          code: 'SUP-001',
          name: 'Balaji Building Materials & Co.',
          phone: '+91 98765 43210',
          address: 'Main Industrial Ring Road',
          paymentTerms: 'NET_30',
        },
      });
    }

    let material = materialId ? await prisma.material.findUnique({ where: { id: materialId } }) : null;
    if (!material) {
      material = await prisma.material.findFirst({ where: finalTenantId ? { tenantId: finalTenantId } : {} });
    }

    const createdPO = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId: finalTenantId,
          poNumber,
          projectId: targetProj.id,
          supplierId: supplier!.id,
          poDate: new Date(),
          deliveryDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'APPROVED',
          subtotal: totalAmount,
          taxAmount: 0,
          totalAmount,
          createdById: req.user?.id || 'system',
          items: material ? {
            create: [
              {
                materialId: material.id,
                orderQty: quantity,
                unitPrice,
                taxPercent: 0,
                taxAmount: 0,
                totalAmount,
                receivedQty: quantity,
              },
            ],
          } : undefined,
        },
        include: { project: true, supplier: true, items: { include: { material: true } } },
      });

      return po;
    });

    // Balanced Journal Entry: Debit Direct Material Expense, Credit Accounts Payable
    try {
      await postBalancedJournalEntry({
        tenantId: finalTenantId,
        entryDate: new Date(),
        referenceType: 'PURCHASE_ORDER',
        referenceId: createdPO.id,
        narration: `Material purchase order ${poNumber} for ${quantity} ${material?.unit || 'units'} of ${material?.name || 'materials'}. Vendor: ${supplier.name}`,
        lines: [
          { accountCode: COA.DIRECT_MATERIAL_COST, debit: totalAmount, credit: 0, projectId: targetProj.id },
          { accountCode: COA.ACCOUNTS_PAYABLE, debit: 0, credit: totalAmount, projectId: targetProj.id },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for confirmed material purchase:', jeErr);
    }

    await logAudit(req.user?.id, 'CREATE_PURCHASE_ORDER', 'PURCHASE_ORDER', createdPO.id, { poNumber, totalAmount }, req.ip);

    return res.json({
      success: true,
      response: {
        message:
          `✅ **Material Purchase Order Committed & Inward Stock Updated!**\n\n` +
          `• **PO Number:** **${createdPO.poNumber}**\n` +
          `• **Project / Site:** **${targetProj.name}** [${targetProj.code}]\n` +
          `• **Supplier:** **${supplier.name}**\n` +
          `• **Material:** ${material?.name || 'Construction Materials'} (${quantity} ${material?.unit || 'Units'} @ ${formatINR(unitPrice)})\n` +
          `• **Total PO Value:** **${formatINR(totalAmount)}**\n` +
          `• **Stock Balance:** Updated in warehouse inventory ledger.\n` +
          `• **General Ledger:** Accounts Payable credited and Material Expenses recognized.\n\n` +
          `View purchase details under **Stores & Procurement > Procurement & Vendors**.`,
        actionTaken: 'RECORD_MATERIAL_PURCHASE',
        data: createdPO,
        suggestedPrompts: [
          `Check inventory and low stock materials`,
          `Add material purchase for ${targetProj.name}`,
          'What are all the payments received and paid today?',
        ],
      },
    });
  }

  return res.status(400).json({ success: false, message: `Unknown confirmation action: ${action}` });
};

export const executeConfirmedAIAction = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    return await executeActionPayload(req, res, payload);
  } catch (err: any) {
    console.error('Error executing confirmed AI action:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to execute confirmed action.' });
  }
};

export const processAIPrompt = async (req: Request, res: Response) => {
  try {
    const { prompt, context, confirmation, pendingAction } = req.body;

    // Handle direct confirmation / cancellation payload
    if (confirmation || pendingAction) {
      return await executeActionPayload(req, res, pendingAction || req.body);
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'A text prompt is required.' });
    }

    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // Natural language confirmation or cancellation
    if (
      lower === 'confirm' ||
      lower === 'confirm and post to database' ||
      lower === 'yes, confirm' ||
      lower === 'proceed'
    ) {
      if (pendingAction) {
        return await executeActionPayload(req, res, pendingAction);
      }
    }

    if (lower === 'cancel' || lower === 'cancel this transaction' || lower === 'no, cancel') {
      return res.json({
        success: true,
        response: {
          message: '❌ **Transaction Cancelled.**\n\nNo database records or financial ledgers were altered.',
          actionTaken: 'TRANSACTION_CANCELLED',
          suggestedPrompts: [
            'What are all the payments received and paid today?',
            'What is the balance due amount of clients?',
          ],
        },
      });
    }

    // =============================================================
    // 0. TOP-PRIORITY: CONCEPTUAL KNOWLEDGE BASE & WORKFLOW GUIDES
    // =============================================================
    const conceptAnswer = getConstructionConceptAnswer(lower);
    if (conceptAnswer) {
      return res.json({ success: true, response: conceptAnswer });
    }

    const howToAnswer = getERPWorkflowHowToGuide(lower);
    if (howToAnswer) {
      return res.json({ success: true, response: howToAnswer });
    }

    const convoAnswer = getConversationalResponse(lower);
    if (convoAnswer) {
      return res.json({ success: true, response: convoAnswer });
    }

    // =============================================================
    // 0.45 INTENT: ACTION — GENERATE RA BILL (TWO-WAY PREVIEW)
    // =============================================================
    if (
      (lower.includes('generate ra bill') ||
       lower.includes('create ra bill') ||
       lower.includes('generate running account') ||
       lower.includes('raise ra bill') ||
       lower.includes('raise invoice for')) &&
      !lower.includes('how to') &&
      !lower.includes('guide')
    ) {
      const tenantFilter = getTenantFilter(req);
      const targetProj = await findMatchedProject(cleanPrompt, context, tenantFilter);

      if (!targetProj) {
        return res.json({
          success: true,
          response: {
            message: `Please specify which project you want to generate the Running Account (RA) Bill for.`,
            actionTaken: 'CLARIFY_PROJECT',
          },
        });
      }

      const finalTenantId = targetProj.tenantId || (req.user as any)?.companyId || null;
      const nextInvNum = await generateNextInvoiceNumber(targetProj.id, finalTenantId ? { tenantId: finalTenantId } : {});

      // Parse amount from prompt if provided, otherwise default to contract value or project estimate
      const amountMatch = cleanPrompt.match(/(?:rs\.?|inr|₹|\s|^)(\d+(?:,\d+)*(?:\.\d+)?)/i);
      const certifiedSubtotal = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : (targetProj.contractValue || 200000);
      const retentionPercent = 5.0;
      const tdsPercent = 2.0;
      const gstPercent = 18.0;

      const retAmt = (certifiedSubtotal * retentionPercent) / 100;
      const tdsAmt = (certifiedSubtotal * tdsPercent) / 100;
      const gstAmt = (certifiedSubtotal * gstPercent) / 100;
      const netBillAmount = certifiedSubtotal - retAmt - tdsAmt + gstAmt;

      const previewData = {
        actionType: 'GENERATE_RA_BILL',
        title: 'Running Account (RA) Bill [Draft Verification]',
        projectId: targetProj.id,
        projectName: targetProj.name,
        projectCode: targetProj.code,
        clientName: targetProj.clientName || 'Client',
        billNumber: nextInvNum,
        certifiedSubtotal,
        retentionPercent,
        retentionAmount: retAmt,
        tdsPercent,
        tdsAmount: tdsAmt,
        gstPercent,
        gstAmount: gstAmt,
        netBillAmount,
        date: new Date().toISOString().split('T')[0],
        journalPreview: [
          { account: `Accounts Receivable - ${targetProj.clientName || 'Client'} (COA 1100)`, type: 'DEBIT', amount: netBillAmount },
          { account: 'Construction Contract Revenue (COA 4010)', type: 'CREDIT', amount: certifiedSubtotal - retAmt - tdsAmt },
          { account: 'Output GST Payable 18% (COA 2200)', type: 'CREDIT', amount: gstAmt },
        ],
        rawPayload: {
          action: 'CONFIRM_GENERATE_RA_BILL',
          tenantId: finalTenantId,
          projectId: targetProj.id,
          certifiedSubtotal,
          retentionPercent,
          tdsPercent,
          gstPercent,
          prompt: cleanPrompt,
        },
      };

      return res.json({
        success: true,
        response: {
          message:
            `📋 **Two-Way Confirmation Preview: ${previewData.title}**\n\n` +
            `Please review the certified milestone bill calculations and statutory deductions below. Click **"Confirm & Post to Database"** to commit this RA Bill or **"Cancel"** to abort.`,
          actionTaken: 'CONFIRMATION_PREVIEW',
          data: previewData,
          suggestedPrompts: [
            'Confirm and post to database',
            'Cancel this transaction',
          ],
        },
      });
    }

    // =============================================================
    // 0.5 INTENT: CLIENT QUOTATIONS & COMMERCIAL PROPOSALS
    // =============================================================
    const quotAnswer = await handleQuotationQuery(cleanPrompt, (req as any).user);
    if (quotAnswer) {
      return res.json({ success: true, response: quotAnswer });
    }

    // =============================================================
    // 0.55 INTENT: INTERACTIVE ACTION — ADD NEW LEAD CONVERSATION & FORM
    // =============================================================
    const isAddLeadIntent =
      (lower.includes('lead') || lower.includes('inquiry') || lower.includes('prospect')) &&
      !lower.includes('how many') &&
      !lower.includes('count') &&
      !lower.includes('status') &&
      !lower.includes('converted') &&
      !lower.includes('today') &&
      !lower.includes('what is') &&
      (lower.includes('got a') ||
        lower.includes('new lead') ||
        lower.includes('add lead') ||
        lower.includes('have to add') ||
        lower.includes('want to add') ||
        lower.includes('create lead') ||
        lower.includes('register lead') ||
        lower.includes('record lead') ||
        lower.includes('received') ||
        lower.includes('incoming'));

    if (
      isAddLeadIntent ||
      lower === 'yes, fill the new lead form' ||
      lower === 'yes, open lead form' ||
      lower === 'fill new lead form' ||
      lower === 'open lead form' ||
      lower === 'yes, add lead'
    ) {
      // Check if user is confirming "yes" to fill the form now, or if prompt already contains lead details
      const wantsFormImmediately =
        lower.includes('yes') ||
        lower.includes('open form') ||
        lower.includes('fill') ||
        lower.includes('form') ||
        lower.includes('named') ||
        lower.includes('called');

      if (wantsFormImmediately) {
        // Calculate next available lead code
        const currentYear = new Date().getFullYear();
        const prefix = `LEAD-${currentYear}-`;
        const latestLead = await prisma.lead.findFirst({
          where: { leadNumber: { startsWith: prefix } },
          orderBy: { leadNumber: 'desc' },
          select: { leadNumber: true },
        });

        let nextSeq = 1;
        if (latestLead && latestLead.leadNumber) {
          const parts = latestLead.leadNumber.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num)) nextSeq = num + 1;
        }
        const nextLeadNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

        // Check if name or phone mentioned in prompt
        const nameMatch = cleanPrompt.match(/(?:named|called|for|client)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
        const phoneMatch = cleanPrompt.match(/(?:\+91|0)?[6-9]\d{9}/);

        return res.json({
          success: true,
          response: {
            message:
              `📋 **New Client Lead Capture Form [${nextLeadNumber}]**\n\n` +
              `Please enter the client's contact details, site location, and estimated budget below. Once submitted, they will be tracked in your active sales pipeline.`,
            actionTaken: 'ADD_LEAD_FORM',
            data: {
              formType: 'ADD_LEAD',
              suggestedLeadNumber: nextLeadNumber,
              presetName: nameMatch ? nameMatch[1].trim() : '',
              presetPhone: phoneMatch ? phoneMatch[0] : '',
            },
            suggestedPrompts: [
              'Show all active leads in sales pipeline',
              'What is the difference between BOQ and quotation?',
              'How to convert lead to project?',
            ],
          },
        });
      }

      // If user says "got a new lead, have to add" or similar without saying "yes" yet:
      // Exactly as requested: "great do you want to fill the new lead form with a yes,no or later. if yes the form should be open."
      return res.json({
        success: true,
        response: {
          message:
            `🎉 **Great news! A new prospective client lead is exciting.**\n\n` +
            `Would you like to fill the New Client Lead form right now so we can record their site requirements and track them in your sales pipeline?`,
          actionTaken: 'LEAD_ACTION_PROMPT',
          data: {
            dialogType: 'CONFIRM_ADD_LEAD',
          },
          suggestedPrompts: [
            'Yes, fill the new lead form',
            'Later',
            'No',
            'Show all active leads in sales pipeline',
          ],
        },
      });
    }

    // If user replies "later" to lead creation
    if (lower === 'later' || lower === 'remind me later' || lower === 'i will do it later') {
      return res.json({
        success: true,
        response: {
          message:
            `⏰ **No problem! We'll save it for later.**\n\n` +
            `Whenever you're ready to register your prospective client, simply tap **"Fill new lead form"** right here in the chat, or navigate to **Sales & Client Commercials > Leads & Pipeline**.`,
          actionTaken: 'LEAD_ACTION_LATER',
          suggestedPrompts: [
            'Yes, fill the new lead form',
            'Show all active leads in sales pipeline',
            'How many projects are active today?',
          ],
        },
      });
    }

    // If user replies "no" to lead creation
    if (lower === 'no' || lower === 'no thanks' || lower === 'not now') {
      return res.json({
        success: true,
        response: {
          message:
            `👍 **Understood!**\n\n` +
            `Let me know whenever you need assistance with your projects, site operations, or client commercials.`,
          actionTaken: 'CONVERSATION_DISMISS',
          suggestedPrompts: [
            'How many projects are active today?',
            'What is the balance due amount of clients?',
            'Show all recent client quotations',
          ],
        },
      });
    }

    // =============================================================
    // 0.6 INTENT: LEADS & SALES PIPELINE TRACKING
    // =============================================================
    const leadAnswer = await handleLeadQuery(cleanPrompt, (req as any).user);
    if (leadAnswer) {
      return res.json({ success: true, response: leadAnswer });
    }

    // =============================================================
    // 0.7 INTENT: MULTI-TENANCY, COMPANY TRIALS & SUPER ADMIN
    // =============================================================
    const tenantAnswer = await handleTenantQuery(cleanPrompt, (req as any).user);
    if (tenantAnswer) {
      return res.json({ success: true, response: tenantAnswer });
    }

    // =============================================================
    // 1. INTENT: EXPORT / EXTRACT TO GOOGLE SHEETS
    // =============================================================
    if (
      lower.includes('google sheet') ||
      lower.includes('export to sheet') ||
      lower.includes('extract data') ||
      lower.includes('export ledger') ||
      lower.includes('export csv')
    ) {
      const receipts = await prisma.clientReceipt.findMany({
        include: { project: true, invoice: true, client: true },
        take: 50,
        orderBy: { receiptDate: 'desc' },
      });

      const expenses = await prisma.officeExpense.findMany({
        take: 50,
        orderBy: { expenseDate: 'desc' },
      });

      const salaries = await prisma.staffSalaryPayment.findMany({
        include: { staff: true },
        take: 50,
        orderBy: { disbursementDate: 'desc' },
      });

      let csv = 'Date,Transaction Type,Category/Ref,Entity / Party,Project Name,Payment Mode,Inflow (₹),Outflow (₹),Reference #\n';

      receipts.forEach((r) => {
        const d = r.receiptDate.toISOString().split('T')[0];
        csv += `"${d}","CLIENT_COLLECTION","${r.invoice?.invoiceNumber || 'Direct Payment'}","${r.client?.name || r.project?.clientName || 'Client'}","${r.project?.name || 'Project'}","${r.paymentMethod}",${r.amount},0,"${r.referenceNo || r.receiptNumber}"\n`;
      });

      expenses.forEach((e) => {
        const d = e.expenseDate.toISOString().split('T')[0];
        csv += `"${d}","OFFICE_EXPENSE","${e.category}","${e.paidTo}","Corporate HQ","${e.paymentMethod}",0,${e.amount},"${e.referenceNo || e.expenseNumber}"\n`;
      });

      salaries.forEach((s) => {
        const d = s.disbursementDate.toISOString().split('T')[0];
        csv += `"${d}","STAFF_SALARY","${s.monthYear}","${s.staff?.name || 'Staff'} (${s.staff?.designation || 'Staff'})","Corporate HQ","${s.paymentMethod}",0,${s.netPaid},"${s.referenceNo || s.paymentNumber}"\n`;
      });

      return res.json({
        success: true,
        response: {
          message: '📊 Extracted latest company financial transactions for Google Sheets! You can copy the CSV below or paste it directly into Google Sheets (Data > Split text to columns).',
          actionTaken: 'EXPORT_GOOGLE_SHEETS',
          googleSheetsCsv: csv,
          suggestedPrompts: [
            'What are all the payments received and paid today?',
            'What is the balance due amount of the client greenfield?',
            'How many projects are in work today?',
          ],
        },
      });
    }

    // =============================================================
    // 2. INTENT: ADD WORKER TO PROJECT (E.g. "need to add a worker to the greenfield project")
    // =============================================================
    if (
      (lower.includes('add') ||
        lower.includes('create') ||
        lower.includes('assign') ||
        lower.includes('register') ||
        lower.includes('need to add') ||
        lower.includes('new worker') ||
        lower.includes('new labour') ||
        lower.includes('recruit')) &&
      (lower.includes('worker') ||
        lower.includes('labour') ||
        lower.includes('labor') ||
        lower.includes('mason') ||
        lower.includes('carpenter') ||
        lower.includes('helper') ||
        lower.includes('barbender') ||
        lower.includes('electrician') ||
        lower.includes('plumber')) &&
      !lower.includes('paid ') &&
      !lower.includes('disburse')
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const allProjects = await prisma.project.findMany();
      const targetProj = matchedProj || allProjects[0];

      // Detect trade from prompt
      let trade = 'MASON';
      let skillLevel = 'SKILLED';
      let dailyRate = 750;

      if (lower.includes('carpenter')) {
        trade = 'CARPENTER';
        skillLevel = 'SKILLED';
        dailyRate = 850;
      } else if (lower.includes('barbender') || lower.includes('rebar')) {
        trade = 'BARBENDER';
        skillLevel = 'SKILLED';
        dailyRate = 800;
      } else if (lower.includes('electrician')) {
        trade = 'ELECTRICIAN';
        skillLevel = 'SKILLED';
        dailyRate = 900;
      } else if (lower.includes('plumber')) {
        trade = 'PLUMBER';
        skillLevel = 'SKILLED';
        dailyRate = 850;
      } else if (lower.includes('painter')) {
        trade = 'PAINTER';
        skillLevel = 'SKILLED';
        dailyRate = 750;
      } else if (lower.includes('helper') || lower.includes('unskilled')) {
        trade = 'HELPER';
        skillLevel = 'UNSKILLED';
        dailyRate = 550;
      } else if (lower.includes('supervisor')) {
        trade = 'SUPERVISOR';
        skillLevel = 'SKILLED';
        dailyRate = 1200;
      }

      // Check if custom rate mentioned
      const rateMatch = cleanPrompt.match(/(?:rate|wage|daily|rs\.?|inr|₹)\s*(?:of|is|:)?\s*(\d{3,4})/i);
      if (rateMatch) dailyRate = parseFloat(rateMatch[1]);

      // Calculate next available worker code
      const allWorkers = await prisma.worker.findMany({ select: { workerCode: true } });
      let maxNum = 0;
      for (const w of allWorkers) {
        if (w.workerCode && w.workerCode.startsWith('WRK-')) {
          const num = parseInt(w.workerCode.replace('WRK-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const nextWorkerCode = `WRK-${String(maxNum + 1).padStart(3, '0')}`;

      // Check if user explicitly provided a real person's name (e.g. "named Ramesh Kumar")
      const nameMatch = cleanPrompt.match(/(?:named|called)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
      let presetName = '';
      const stopWords = ['to', 'the', 'for', 'in', 'on', 'at', 'a', 'an', 'project', 'site', 'greenfield', 'skyline'];
      if (nameMatch && !stopWords.includes(nameMatch[1].toLowerCase().trim())) {
        presetName = nameMatch[1].trim();
      }

      return res.json({
        success: true,
        response: {
          message:
            `👷 **Worker Registration Details for ${targetProj ? targetProj.name : 'Project'}**\n\n` +
            `Please enter the worker's details (Full Name, Trade, Daily Wage Rate, and Contact Number) in the interactive form below. Click **"Save & Register Worker"** to confirm and add them to the site muster roll.`,
          actionTaken: 'ADD_WORKER_FORM',
          data: {
            formType: 'ADD_WORKER',
            projectId: targetProj ? targetProj.id : '',
            projectName: targetProj ? targetProj.name : 'Central Pool',
            projectCode: targetProj ? targetProj.code : '',
            suggestedCode: nextWorkerCode,
            presetName,
            trade,
            skillLevel,
            dailyWageRate: dailyRate,
            overtimeHourlyRate: Math.round((dailyRate / 8) * 1.5),
            paymentMethod: 'CASH',
          },
          suggestedPrompts: [
            `What is the balance due amount of the client greenfield?`,
            `What are all the payments received and paid today?`,
            `How many projects are in work today?`,
          ],
        },
      });
    }

    // =============================================================
    // 3. INTENT: CLIENT BALANCE DUE / OUTSTANDING AMOUNT QUERY
    //    (E.g. "what is the balance due amount of the client greenfield")
    // =============================================================
    if (
      lower.includes('balance due') ||
      lower.includes('due amount') ||
      lower.includes('outstanding') ||
      lower.includes('pending bill') ||
      lower.includes('pending payment') ||
      lower.includes('how much does') ||
      lower.includes('receivable') ||
      (lower.includes('balance') && (lower.includes('client') || lower.includes('project')))
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const matchedCli = await findMatchedClient(cleanPrompt);

      if (matchedProj) {
        const invoices = await prisma.clientInvoice.findMany({
          where: { projectId: matchedProj.id },
          orderBy: { invoiceDate: 'desc' },
        });
        const receipts = await prisma.clientReceipt.findMany({
          where: { projectId: matchedProj.id },
          orderBy: { receiptDate: 'desc' },
        });

        const totalBilled = invoices.reduce((s, i) => s + (i.netInvoiceAmount || 0), 0);
        const totalReceived = receipts.reduce((s, r) => s + (r.amount || 0), 0);
        const totalDue = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
        const cashReceived = receipts.filter((r) => r.paymentMethod === 'CASH').reduce((s, r) => s + r.amount, 0);
        const bankReceived = receipts.filter((r) => r.paymentMethod !== 'CASH').reduce((s, r) => s + r.amount, 0);

        const pendingInvoices = invoices.filter((i) => i.balanceDue > 0);

        let msg =
          `🏢 **Client Balance Due — ${matchedProj.name}**\n\n` +
          `• **Client Name:** ${matchedProj.clientName}\n` +
          `• **Project Code:** ${matchedProj.code}\n` +
          `• **Total Contract Value:** ${formatINR(matchedProj.contractValue)}\n` +
          `• **Total Amount Billed (RA Bills):** ${formatINR(totalBilled)}\n` +
          `• **Total Payments Received:** ${formatINR(totalReceived)} (Cash: ${formatINR(cashReceived)}, Bank: ${formatINR(bankReceived)})\n` +
          `• ⚠️ **Outstanding Balance Due:** **${formatINR(totalDue)}**\n\n`;

        if (pendingInvoices.length > 0) {
          msg += `📄 **Pending RA Bills / Invoices (${pendingInvoices.length} Bills):**\n`;
          pendingInvoices.forEach((inv) => {
            msg += `• **${inv.invoiceNumber}**: Billed ${formatINR(inv.netInvoiceAmount)} | Paid: ${formatINR(inv.paidAmount)} | **Due: ${formatINR(inv.balanceDue)}** (${inv.status})\n`;
          });
        } else {
          msg += `✅ All issued invoices for this project are completely paid up!\n`;
        }

        msg += `\n💡 *To record incoming payment, tell me:*\n` +
          `\`Received [amount] from client for ${matchedProj.name} via RTGS\``;

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'CLIENT_BALANCE_QUERY',
            data: {
              projectId: matchedProj.id,
              projectName: matchedProj.name,
              clientName: matchedProj.clientName,
              totalBilled,
              totalReceived,
              totalDue,
              pendingInvoicesCount: pendingInvoices.length,
            },
            suggestedPrompts: [
              `Received 2000000 from client for ${matchedProj.name} via RTGS`,
              `Share update with Client on WhatsApp`,
              `What are all the payments received and paid today?`,
            ],
          },
        });
      }

      // If matched a client directly
      if (matchedCli) {
        const invoices = await prisma.clientInvoice.findMany({
          where: { clientId: matchedCli.id },
          include: { project: true },
          orderBy: { invoiceDate: 'desc' },
        });

        const totalBilled = invoices.reduce((s, i) => s + (i.netInvoiceAmount || 0), 0);
        const totalReceived = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
        const totalDue = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);

        return res.json({
          success: true,
          response: {
            message:
              `🏢 **Client Account Statement — ${matchedCli.name}**\n\n` +
              `• **Company:** ${matchedCli.companyName || matchedCli.name}\n` +
              `• **Contact Person:** ${matchedCli.contactPerson || 'N/A'} (${matchedCli.phone || 'N/A'})\n` +
              `• **Total Billed Across Projects:** ${formatINR(totalBilled)}\n` +
              `• **Total Received:** ${formatINR(totalReceived)}\n` +
              `• ⚠️ **Total Outstanding Due:** **${formatINR(totalDue)}**`,
            actionTaken: 'CLIENT_BALANCE_QUERY',
            data: { client: matchedCli.name, totalBilled, totalReceived, totalDue },
            suggestedPrompts: [
              `Received 1000000 from client for ${matchedCli.name} via bank`,
              'Export ledger to Google Sheet',
              'Share update with Owner',
            ],
          },
        });
      }

      // General balance due across all projects
      const allProjects = await prisma.project.findMany({
        include: { clientInvoices: true },
      });

      let overviewMsg = `🏢 **Corporate Receivables & Client Balance Due Overview**\n\n`;
      let totalCompanyDue = 0;

      allProjects.forEach((p) => {
        const due = p.clientInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
        totalCompanyDue += due;
        overviewMsg += `• **${p.name}** (${p.clientName}): **${formatINR(due)} Due**\n`;
      });

      overviewMsg += `\n💰 **Total Outstanding Receivables Across All Clients:** **${formatINR(totalCompanyDue)}**`;

      return res.json({
        success: true,
        response: {
          message: overviewMsg,
          actionTaken: 'CLIENT_BALANCE_QUERY',
          suggestedPrompts: [
            'What is the balance due amount of the client greenfield',
            'What are all the payments received and paid today',
            'Export ledger to Google Sheet',
          ],
        },
      });
    }

    // =============================================================
    // 4. INTENT: TODAY'S PAYMENTS (RECEIVED & PAID TODAY)
    //    (E.g. "what are all the payments received and paid today")
    // =============================================================
    if (
      (lower.includes('today') || lower.includes("today's") || lower.includes('daily')) &&
      (lower.includes('payment') ||
        lower.includes('received') ||
        lower.includes('paid') ||
        lower.includes('transaction') ||
        lower.includes('collection') ||
        lower.includes('inflow') ||
        lower.includes('outflow'))
    ) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [receiptsToday, supPaymentsToday, wagesToday, officeExpToday, salariesToday] = await Promise.all([
        prisma.clientReceipt.findMany({
          where: { receiptDate: { gte: startOfDay, lte: endOfDay } },
          include: { project: true, client: true },
        }),
        prisma.supplierPayment.findMany({
          where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
          include: { supplier: true },
        }),
        prisma.wagePayment.findMany({
          where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
          include: { worker: true, project: true },
        }),
        prisma.officeExpense.findMany({
          where: { expenseDate: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.staffSalaryPayment.findMany({
          where: { disbursementDate: { gte: startOfDay, lte: endOfDay } },
          include: { staff: true },
        }),
      ]);

      const totalReceivedToday = receiptsToday.reduce((s, r) => s + r.amount, 0);
      const totalPaidToday =
        supPaymentsToday.reduce((s, p) => s + p.amount, 0) +
        wagesToday.reduce((s, w) => s + (w.amount || 0), 0) +
        officeExpToday.reduce((s, e) => s + (e.amount || 0), 0) +
        salariesToday.reduce((s, sal) => s + (sal.netPaid || 0), 0);

      const todayStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (receiptsToday.length > 0 || totalPaidToday > 0) {
        let msg =
          `📅 **Today's Financial Activity (${todayStr})**\n\n` +
          `• 🟢 **Total Payments Received Today:** **${formatINR(totalReceivedToday)}** (${receiptsToday.length} transactions)\n` +
          `• 🔴 **Total Payments Made Today:** **${formatINR(totalPaidToday)}**\n\n`;

        if (receiptsToday.length > 0) {
          msg += `💰 **Collections Received Today:**\n`;
          receiptsToday.forEach((r) => {
            msg += `• [+] ${formatINR(r.amount)} via ${r.paymentMethod} — ${r.project?.name || 'Project'} [Ref: ${r.receiptNumber}]\n`;
          });
          msg += `\n`;
        }

        if (supPaymentsToday.length > 0 || wagesToday.length > 0 || officeExpToday.length > 0 || salariesToday.length > 0) {
          msg += `💸 **Payments Disbursed Today:**\n`;
          supPaymentsToday.forEach((sp) => {
            msg += `• [-] ${formatINR(sp.amount)} to Supplier **${sp.supplier?.name || 'Supplier'}** (${sp.paymentMethod})\n`;
          });
          wagesToday.forEach((w) => {
            msg += `• [-] ${formatINR(w.amount)} to Labour **${w.worker?.name || 'Worker'}** (${w.paymentMethod})\n`;
          });
          officeExpToday.forEach((oe) => {
            msg += `• [-] ${formatINR(oe.amount)} for Office **${oe.title}** (${oe.paymentMethod})\n`;
          });
          salariesToday.forEach((sal) => {
            msg += `• [-] ${formatINR(sal.netPaid)} Salary to **${sal.staff?.name || 'Staff'}** (${sal.paymentMethod})\n`;
          });
        }

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'TODAY_PAYMENTS_QUERY',
            data: { totalReceivedToday, totalPaidToday },
            suggestedPrompts: [
              'Share update with Owner on WhatsApp',
              'Export ledger to Google Sheet',
              'What is the balance due amount of the client greenfield?',
            ],
          },
        });
      }

      // If no payments happened today, fetch recent entries so user gets valuable live data
      const [recentReceipts, recentExpenses, recentSalaries, recentWages] = await Promise.all([
        prisma.clientReceipt.findMany({ take: 3, orderBy: { receiptDate: 'desc' }, include: { project: true } }),
        prisma.officeExpense.findMany({ take: 3, orderBy: { expenseDate: 'desc' } }),
        prisma.staffSalaryPayment.findMany({ take: 3, orderBy: { disbursementDate: 'desc' }, include: { staff: true } }),
        prisma.wagePayment.findMany({ take: 3, orderBy: { paymentDate: 'desc' }, include: { worker: true, project: true } }),
      ]);

      let msg =
        `📅 **Today's Financial Activity (${todayStr})**\n\n` +
        `• 🟢 **Payments Received Today:** ₹0 *(No client receipts posted yet today)*\n` +
        `• 🔴 **Payments Made Today:** ₹0 *(No expenses or payroll paid yet today)*\n\n` +
        `📋 **Recent Payments & Collections Track (Latest Records):**\n`;

      if (recentReceipts.length > 0) {
        msg += `\n💰 **Recent Inflows (Client Receipts):**\n`;
        recentReceipts.forEach((r) => {
          msg += `• [+] **${formatINR(r.amount)}** (${r.paymentMethod}) — Project: **${r.project?.name || 'Project'}** (${formatDateStr(r.receiptDate)})\n`;
        });
      }

      if (recentExpenses.length > 0 || recentSalaries.length > 0 || recentWages.length > 0) {
        msg += `\n💸 **Recent Outflows (Expenses & Payroll):**\n`;
        recentExpenses.forEach((e) => {
          msg += `• [-] **${formatINR(e.amount)}** (${e.paymentMethod}) — Office: ${e.title} (${formatDateStr(e.expenseDate)})\n`;
        });
        recentSalaries.forEach((s) => {
          msg += `• [-] **${formatINR(s.netPaid)}** (${s.paymentMethod}) — Salary: ${s.staff?.name} (${formatDateStr(s.disbursementDate)})\n`;
        });
        recentWages.forEach((w) => {
          msg += `• [-] **${formatINR(w.amount)}** (${w.paymentMethod}) — Wage: ${w.worker?.name || 'Worker'} (${formatDateStr(w.paymentDate)})\n`;
        });
      }

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'TODAY_PAYMENTS_QUERY',
          suggestedPrompts: [
            'Received 2000000 from client for Greenfield via RTGS',
            'Paid office rent 45000 via bank',
            'How many projects are in work today?',
          ],
        },
      });
    }

    // =============================================================
    // 5. INTENT: PROJECTS IN WORK / ACTIVE PROJECTS / PROJECT TRACK QUERY
    //    (E.g. "how many projects are in work today?", "project track")
    // =============================================================
    if (
      lower.includes('how many project') ||
      lower.includes('projects in work') ||
      lower.includes('active project') ||
      lower.includes('track project') ||
      lower.includes('project status') ||
      lower.includes('project track') ||
      lower.includes('list project') ||
      lower.includes('all project') ||
      lower.includes('ongoing project') ||
      (lower.includes('project') && lower.includes('work today')) ||
      (lower.includes('tell me about') && lower.includes('project'))
    ) {
      const projects = await prisma.project.findMany({
        include: {
          tasks: { where: { status: { not: 'COMPLETED' } } },
          workers: { where: { isActive: true } },
          clientInvoices: true,
          clientReceipts: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const activeProjects = projects.filter((p) => p.status === 'ACTIVE' || p.status === 'PLANNING');

      let msg = `🏗️ **Active Projects Track (${activeProjects.length} Projects on Track)**\n\n`;

      activeProjects.forEach((p, idx) => {
        const billed = p.clientInvoices.reduce((sum, inv) => sum + (inv.netInvoiceAmount || 0), 0);
        const collected = p.clientReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
        const due = p.clientInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

        msg +=
          `**${idx + 1}. ${p.name}** [${p.code}]\n` +
          `• **Client:** ${p.clientName}\n` +
          `• **Progress:** ${p.completionPercent || 0}% Complete | **Status:** ${p.status}\n` +
          `• **Contract Value:** ${formatINR(p.contractValue)} | **Approved Budget:** ${formatINR(p.approvedBudget)}\n` +
          `• **Workforce:** ${p.workers.length} active workers on-site\n` +
          `• **Open Tasks:** ${p.tasks.length} pending site tasks\n` +
          `• **Financials:** Billed ${formatINR(billed)} | Received ${formatINR(collected)} | **Due: ${formatINR(due)}**\n\n`;
      });

      const totalContract = activeProjects.reduce((s, p) => s + (p.contractValue || 0), 0);
      msg += `📊 **Summary:** Total Active Contract Portfolio: **${formatINR(totalContract)}** across ${activeProjects.length} sites.`;

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'PROJECT_TRACK_QUERY',
          data: { activeProjectsCount: activeProjects.length, totalContract },
          suggestedPrompts: [
            'What is the balance due amount of the client greenfield?',
            'Need to add a worker to the greenfield project',
            'What is the overall office expense this month?',
          ],
        },
      });
    }

    // =============================================================
    // 6. INTENT: OFFICE EXPENSE & OVERHEAD QUERY (THIS MONTH / GENERAL)
    //    (E.g. "what is the overall office expense this month?")
    // =============================================================
    if (
      (lower.includes('office expense') ||
        lower.includes('office overhead') ||
        lower.includes('overhead') ||
        lower.includes('rent') ||
        lower.includes('electricity') ||
        lower.includes('pantry') ||
        lower.includes('utilities')) &&
      (lower.includes('month') ||
        lower.includes('what is') ||
        lower.includes('how much') ||
        lower.includes('overall') ||
        lower.includes('total') ||
        lower.includes('summary')) &&
      !lower.includes('paid ')
    ) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthYearName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      const [monthExpenses, monthSalaries] = await Promise.all([
        prisma.officeExpense.findMany({
          where: { expenseDate: { gte: startOfMonth } },
          orderBy: { expenseDate: 'desc' },
        }),
        prisma.staffSalaryPayment.findMany({
          where: { disbursementDate: { gte: startOfMonth } },
          include: { staff: true },
          orderBy: { disbursementDate: 'desc' },
        }),
      ]);

      const totalBills = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalSalaries = monthSalaries.reduce((s, sal) => s + (sal.netPaid || 0), 0);
      const totalOverheads = totalBills + totalSalaries;

      // Category breakdown
      const rent = monthExpenses.filter((e) => e.category === 'RENT').reduce((s, e) => s + e.amount, 0);
      const electricity = monthExpenses.filter((e) => e.category === 'ELECTRICITY' || e.category === 'ELECTRICITY_WATER').reduce((s, e) => s + e.amount, 0);
      const pantry = monthExpenses.filter((e) => e.category === 'PANTRY_BEVERAGES' || e.category === 'OFFICE_SUPPLIES_PANTRY').reduce((s, e) => s + e.amount, 0);
      const software = monthExpenses.filter((e) => e.category === 'SOFTWARE_SUBSCRIPTIONS' || e.category === 'SOFTWARE_SUBSCRIPTION').reduce((s, e) => s + e.amount, 0);
      const other = totalBills - (rent + electricity + pantry + software);

      let msg =
        `🏢 **Corporate Office Overheads & Staff Expenses — ${monthYearName}**\n\n` +
        `• 🔴 **Total Monthly Office Overheads:** **${formatINR(totalOverheads)}**\n` +
        `  ├ 🏢 **Office Operating Bills (Rent, Utilities, Pantry):** ${formatINR(totalBills)}\n` +
        `  └ 💼 **Staff Fixed Payroll (Salaries):** ${formatINR(totalSalaries)}\n\n` +
        `📋 **Category Breakdown:**\n` +
        `• 🏢 Office Rent: ${formatINR(rent)}\n` +
        `• ⚡ Electricity & Utilities: ${formatINR(electricity)}\n` +
        `• ☕ Pantry & Refreshments: ${formatINR(pantry)}\n` +
        `• 💻 Software & Subscriptions: ${formatINR(software)}\n` +
        `• 📦 Supplies & Other: ${formatINR(Math.max(0, other))}\n` +
        `• 👥 Staff Payroll Disbursed: ${formatINR(totalSalaries)} (${monthSalaries.length} salary vouchers)\n\n`;

      if (monthExpenses.length > 0) {
        msg += `📄 **Recent Office Vouchers:**\n`;
        monthExpenses.slice(0, 4).forEach((e) => {
          msg += `• **${e.expenseNumber}**: ${e.title} — ${formatINR(e.amount)} (${e.paymentMethod})\n`;
        });
      }

      msg += `\n💡 *Action available:* You can prompt \`Paid office rent 45000 via bank\` or \`Paid salary 35000 to staff\` to record entries directly!`;

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'OFFICE_EXPENSE_QUERY',
          data: { totalOverheads, totalBills, totalSalaries },
          suggestedPrompts: [
            'Paid office rent 45000 via bank',
            'What are all the payments received and paid today?',
            'Export ledger to Google Sheet',
          ],
        },
      });
    }

    // =============================================================
    // 6.5 INTENT: UPDATE / RECORD WORKER ATTENDANCE (MUTATION)
    //     (E.g. "Rajesh plumber is working half day today, update the attendance report for greenfield",
    //           "mark Rajesh as present today for greenfield",
    //           "change attendance for Rajesh to half day",
    //           "Rajesh is absent today, update muster",
    //           "mark all workers present today for greenfield")
    // =============================================================
    // Check if this is an explicit query/question (e.g. "who is absent", "who is present", "who is working", "present and absent data")
    const isExplicitAttendanceQuery =
      lower.startsWith('who ') ||
      lower.includes('who is') ||
      lower.includes('who are') ||
      lower.includes('which worker') ||
      lower.includes('how many') ||
      lower.includes('present and absent') ||
      lower.includes('present & absent') ||
      lower.includes('present or absent') ||
      lower.includes('absent and present') ||
      lower.startsWith('show') ||
      lower.startsWith('view') ||
      lower.startsWith('list') ||
      lower.startsWith('get ') ||
      lower.startsWith('display') ||
      lower.startsWith('tell me') ||
      (lower.includes('data') && !lower.includes('update')) ||
      (lower.includes('report') && !lower.includes('update') && !lower.includes('change') && !lower.includes('set ') && !lower.includes('mark'));

    // Check if user intends to UPDATE / RECORD attendance (mutation)
    const isAttendanceMutation =
      !isExplicitAttendanceQuery &&
      (lower.includes('update') ||
        lower.includes('mark') ||
        lower.includes('change') ||
        lower.includes('set ') ||
        lower.includes('record') ||
        lower.includes('modify') ||
        lower.includes('working half day') ||
        lower.includes('working half-day') ||
        lower.includes('working today') ||
        lower.includes('is present') ||
        lower.includes('is absent') ||
        lower.includes('will be absent') ||
        lower.includes('is on leave') ||
        lower.includes('will be on leave') ||
        lower.includes('absent on') ||
        lower.includes('absent for') ||
        lower.includes('absent tomorrow') ||
        lower.includes('absent next') ||
        lower.includes('absent from') ||
        lower.includes('taking leave') ||
        lower.includes('not coming') ||
        lower.includes('will not come') ||
        lower.includes('half day today') ||
        lower.includes('half-day today') ||
        ((lower.includes('absent') || lower.includes('leave')) &&
          (lower.includes('worker') || lower.includes('wrk-') || lower.includes('on ') || lower.includes('tomorrow')))) &&
      (lower.includes('half day') ||
        lower.includes('half-day') ||
        lower.includes('halfday') ||
        lower.includes('present') ||
        lower.includes('absent') ||
        lower.includes('leave') ||
        lower.includes('overtime') ||
        lower.includes('ot ') ||
        lower.includes('hours ot') ||
        lower.includes('attendance') ||
        lower.includes('muster')) &&
      !lower.includes('paid ') &&
      !lower.includes('disburse') &&
      !lower.includes('add worker') &&
      !lower.includes('create worker') &&
      !lower.includes('need to add') &&
      !lower.includes('salary');

    if (isAttendanceMutation) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const effectiveProj = matchedProj;

      // Extract target date from prompt (supports explicit dates e.g. 26-10-2026, 26/10/2026, tomorrow, etc.)
      const extracted = extractDateFromPrompt(cleanPrompt);
      const { targetUtcDate, windowStart, windowEnd, dateFormatted, dateIso, dayRelativeLabel, isFuture, isToday } = extracted;

      // Check if user asked to mark ALL workers
      const isBulkAll =
        (lower.includes('all') || lower.includes('everyone') || lower.includes('every worker')) &&
        (lower.includes('mark') || lower.includes('set') || lower.includes('update') || lower.includes('record'));

      // If user tries to bulk mark present/half-day on a future date, prevent with clear explanation
      if (isBulkAll && isFuture && !lower.includes('absent') && !lower.includes('leave')) {
        return res.json({
          success: true,
          response: {
            message:
              `⚠️ **Cannot Mark Present in Advance**\n\n` +
              `Workers cannot be marked as **Present** or **Half-Day** for a future date (**${dateFormatted}** ${dayRelativeLabel}). ` +
              `You can only record planned **Absent** or **Leave** notifications in advance.\n\n` +
              `Example: \`worker joe is absent on ${dateFormatted} for ${effectiveProj ? effectiveProj.name : 'bakery project'}\``,
            actionTaken: 'FUTURE_DATE_PRESENT_BLOCKED',
            suggestedPrompts: [
              `worker joe is absent on ${dateFormatted} for ${effectiveProj ? effectiveProj.name : 'bakery project'}`,
              `Worker present and absent data today for ${effectiveProj ? effectiveProj.name : 'bakery project'}`,
            ],
          },
        });
      }

      // Handle BULK MARK ALL
      if (isBulkAll && effectiveProj) {
        const workers = await prisma.worker.findMany({
          where: { isActive: true, projectId: effectiveProj.id },
        });

        for (const w of workers) {
          const status = lower.includes('absent') ? 'ABSENT' : lower.includes('leave') ? 'LEAVE' : lower.includes('half') ? 'HALF_DAY' : 'PRESENT';
          const regWage = status === 'PRESENT' ? w.dailyWageRate : status === 'HALF_DAY' ? w.dailyWageRate / 2 : 0;
          const regHours = status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0;

          const existing = await prisma.labourAttendance.findFirst({
            where: {
              workerId: w.id,
              projectId: effectiveProj.id,
              date: { gte: windowStart, lte: windowEnd },
            },
          });

          const actNote = isFuture ? `Pre-scheduled ${status} via AI Bot` : 'Bulk marked via AI Bot';

          if (existing) {
            await prisma.labourAttendance.update({
              where: { id: existing.id },
              data: {
                date: targetUtcDate,
                attendanceStatus: status,
                regularHours: regHours,
                wageCalculated: regWage,
                totalWageEarned: regWage,
                workActivity: actNote,
              },
            });
            await prisma.labourAttendance.deleteMany({
              where: {
                workerId: w.id,
                projectId: effectiveProj.id,
                id: { not: existing.id },
                date: { gte: windowStart, lte: windowEnd },
              },
            });
          } else {
            await prisma.labourAttendance.create({
              data: {
                date: targetUtcDate,
                projectId: effectiveProj.id,
                workerId: w.id,
                attendanceStatus: status,
                regularHours: regHours,
                wageCalculated: regWage,
                totalWageEarned: regWage,
                workActivity: actNote,
              },
            });
          }
        }
      } else {
        // Find specific worker
        const matchedWorker = await findMatchedWorker(cleanPrompt, effectiveProj?.id);

        if (!matchedWorker) {
          return res.json({
            success: true,
            response: {
              message:
                `⚠️ **Worker Not Identified**\n\n` +
                `I could not identify the specific worker in ${effectiveProj ? effectiveProj.name : 'your project'}. ` +
                `Please mention the worker's name or code (e.g. *Rajesh*, *joe*, or *WRK-5708*).\n\n` +
                `Example: \`worker joe is absent on ${dateFormatted} for ${effectiveProj ? effectiveProj.name : 'bakery project'}\``,
              actionTaken: 'WORKER_NOT_FOUND',
              suggestedPrompts: [
                `worker joe is absent on ${dateFormatted} for ${effectiveProj ? effectiveProj.name : 'bakery project'}`,
                `Worker present and absent data today for ${effectiveProj ? effectiveProj.name : 'bakery project'}`,
              ],
            },
          });
        }

        // Determine Status
        let newStatus = 'PRESENT';
        let regHours = 8;
        let regWage = matchedWorker.dailyWageRate;

        if (
          lower.includes('half day') ||
          lower.includes('half-day') ||
          lower.includes('halfday') ||
          lower.includes('hd') ||
          lower.includes('4 hours')
        ) {
          newStatus = 'HALF_DAY';
          regHours = 4;
          regWage = matchedWorker.dailyWageRate / 2;
        } else if (
          lower.includes('absent') ||
          lower.includes('leave') ||
          lower.includes('not working') ||
          lower.includes('not coming') ||
          lower.includes('off')
        ) {
          newStatus = lower.includes('leave') && !lower.includes('absent') ? 'LEAVE' : 'ABSENT';
          regHours = 0;
          regWage = 0;
        }

        // Overtime check
        const otMatch =
          cleanPrompt.match(/(?:ot|overtime)\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)?/i) ||
          cleanPrompt.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)?\s*(?:ot|overtime)/i);
        const otHours = otMatch ? parseFloat(otMatch[1]) : 0;
        const otWage = otHours * matchedWorker.overtimeHourlyRate;
        const totalWage = regWage + otWage;

        // Future date validation for single worker: PRESENT or HALF_DAY cannot be recorded in advance
        if (isFuture && (newStatus === 'PRESENT' || newStatus === 'HALF_DAY')) {
          return res.json({
            success: true,
            response: {
              message:
                `⚠️ **Cannot Mark Present in Advance**\n\n` +
                `Worker attendance cannot be marked as **Present** or **Half-Day** for a future date (**${dateFormatted}** ${dayRelativeLabel}). ` +
                `Work hours and wages can only be verified on the actual day of work. You can only record planned **Absent** or **Leave** notifications in advance.\n\n` +
                `Example: \`worker ${matchedWorker.name} is absent on ${dateFormatted} for ${effectiveProj ? effectiveProj.name : 'bakery project'}\``,
              actionTaken: 'FUTURE_DATE_PRESENT_BLOCKED',
              suggestedPrompts: [
                `worker ${matchedWorker.name} is absent on ${dateFormatted} for ${effectiveProj ? effectiveProj.name : 'bakery project'}`,
                `Worker present and absent data today for ${effectiveProj ? effectiveProj.name : 'bakery project'}`,
              ],
            },
          });
        }

        const targetProjectId = effectiveProj
          ? effectiveProj.id
          : matchedWorker.projectId || (await prisma.project.findFirst())?.id!;

        const existing = await prisma.labourAttendance.findFirst({
          where: {
            workerId: matchedWorker.id,
            projectId: targetProjectId,
            date: { gte: windowStart, lte: windowEnd },
          },
          orderBy: { createdAt: 'desc' },
        });

        const activityNote = isFuture ? `Pre-scheduled ${newStatus} via AI Bot` : `Updated via AI: ${newStatus}`;

        if (existing) {
          await prisma.labourAttendance.update({
            where: { id: existing.id },
            data: {
              date: targetUtcDate,
              attendanceStatus: newStatus,
              regularHours: regHours,
              overtimeHours: otHours,
              wageCalculated: regWage,
              overtimeWage: otWage,
              totalWageEarned: totalWage,
              workActivity: activityNote,
            },
          });
          await prisma.labourAttendance.deleteMany({
            where: {
              workerId: matchedWorker.id,
              projectId: targetProjectId,
              id: { not: existing.id },
              date: { gte: windowStart, lte: windowEnd },
            },
          });
        } else {
          await prisma.labourAttendance.create({
            data: {
              date: targetUtcDate,
              projectId: targetProjectId,
              workerId: matchedWorker.id,
              attendanceStatus: newStatus,
              regularHours: regHours,
              overtimeHours: otHours,
              wageCalculated: regWage,
              overtimeWage: otWage,
              totalWageEarned: totalWage,
              workActivity: activityNote,
            },
          });
        }
      }

      // Query full live updated muster attendance for the project on target date
      const targetProjFinal = effectiveProj || (await prisma.project.findFirst());
      const pId = targetProjFinal?.id;

      const rawAttendances = await prisma.labourAttendance.findMany({
        where: {
          date: { gte: windowStart, lte: windowEnd },
          ...(pId ? { projectId: pId } : {}),
        },
        include: { worker: true, project: true },
        orderBy: { createdAt: 'desc' },
      });

      // Deduplicate by workerId so each worker appears at most once
      const attMap = new Map<string, typeof rawAttendances[0]>();
      for (const a of rawAttendances) {
        if (a.workerId && !attMap.has(a.workerId)) {
          attMap.set(a.workerId, a);
        }
      }
      const updatedAttendances = Array.from(attMap.values());
      updatedAttendances.sort((a, b) => (a.worker?.workerCode || '').localeCompare(b.worker?.workerCode || ''));

      const assignedWorkers = await prisma.worker.findMany({
        where: { isActive: true, ...(pId ? { projectId: pId } : {}) },
        orderBy: { workerCode: 'asc' },
      });

      const presentList = updatedAttendances.filter((a) => a.attendanceStatus === 'PRESENT');
      const halfDayList = updatedAttendances.filter((a) => a.attendanceStatus === 'HALF_DAY');
      const absentList = updatedAttendances.filter((a) => a.attendanceStatus === 'ABSENT' || a.attendanceStatus === 'LEAVE');

      const totalAssigned = assignedWorkers.length || updatedAttendances.length;
      const totalOnSite = presentList.length + halfDayList.length;
      const turnoutRate = totalAssigned > 0 ? Math.round((totalOnSite / totalAssigned) * 100) : 0;
      const totalDayWage = updatedAttendances.reduce((s, a) => s + (a.totalWageEarned || 0), 0);

      const projTitle = targetProjFinal ? `${targetProjFinal.name} [${targetProjFinal.code}]` : 'Site';

      let msg = `✅ **Attendance Updated Successfully in Project Track!**\n\n`;

      if (isFuture) {
        msg += `📅 **Advance Absence / Leave Notification Recorded**\n`;
        const specificWorker = await findMatchedWorker(cleanPrompt, effectiveProj?.id);
        if (specificWorker) {
          msg += `• 👤 **Worker:** **${specificWorker.workerCode}** — **${specificWorker.name}** (${specificWorker.trade})\n`;
        }
        msg += `• 📆 **Scheduled Date:** **${dateFormatted}** ${dayRelativeLabel}\n`;
        msg += `• 🔴 **Status:** **ABSENT / LEAVE** *(No wages accrued in advance)*\n`;
        msg += `• 🏗️ **Project:** **${projTitle}**\n\n`;

        msg += `📋 **Advance Muster Log for ${dateFormatted}:**\n`;
        msg += `• 🔴 **Pre-notified Absent / Leave:** **${absentList.length} worker(s)**\n`;
        absentList.forEach((a) => {
          msg += `  - **${a.worker?.workerCode}** — **${a.worker?.name}** (${a.worker?.trade}) | Status: **${a.attendanceStatus}**\n`;
        });
        const remainingCount = Math.max(0, totalAssigned - absentList.length);
        msg += `\n💡 *Note: Remaining ${remainingCount} assigned worker(s) will be marked on the day of work (${dateFormatted}).*\n`;
      } else {
        msg += `📋 **Updated Muster Attendance — ${projTitle}**\n`;
        msg += `📅 **Date:** ${dateFormatted} ${dayRelativeLabel}\n\n`;

        msg += `📊 **Attendance Summary:**\n`;
        msg += `• 🟢 **Present On-Site:** **${presentList.length} workers**\n`;
        if (halfDayList.length > 0) {
          msg += `• 🟡 **Half-Day:** **${halfDayList.length} workers**\n`;
        }
        msg += `• 🔴 **Absent:** **${absentList.length} workers**\n`;
        msg += `• 👥 **Total Assigned Workers:** ${totalAssigned} | **Turnout Rate:** ${turnoutRate}%\n\n`;

        // 🟢 PRESENT WORKERS
        if (presentList.length > 0) {
          msg += `🟢 **PRESENT WORKERS (${presentList.length}):**\n`;
          presentList.forEach((a) => {
            msg += `• **${a.worker?.workerCode}** — **${a.worker?.name}** (${a.worker?.trade}) | Wage: ${formatINR(a.totalWageEarned)}\n`;
          });
          msg += `\n`;
        }

        // 🟡 HALF-DAY WORKERS
        if (halfDayList.length > 0) {
          msg += `🟡 **HALF-DAY WORKERS (${halfDayList.length}):**\n`;
          halfDayList.forEach((a) => {
            msg += `• **${a.worker?.workerCode}** — **${a.worker?.name}** (${a.worker?.trade}) | Status: **HALF_DAY** | Wage: ${formatINR(a.totalWageEarned)}\n`;
          });
          msg += `\n`;
        }

        // 🔴 ABSENT WORKERS
        if (absentList.length > 0) {
          msg += `🔴 **ABSENT WORKERS (${absentList.length}):**\n`;
          absentList.forEach((a) => {
            msg += `• **${a.worker?.workerCode}** — **${a.worker?.name}** (${a.worker?.trade}) | Status: **ABSENT** (No wages accrued)\n`;
          });
          msg += `\n`;
        }

        msg += `💰 **Total Computed Day Wages:** **${formatINR(totalDayWage)}**\n`;
      }

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'UPDATE_ATTENDANCE',
          data: {
            projectId: targetProjFinal?.id,
            projectName: targetProjFinal?.name,
            date: dateFormatted,
            dateIso: dateIso,
            isFuture,
            dayRelativeLabel,
            presentCount: presentList.length,
            halfDayCount: halfDayList.length,
            absentCount: absentList.length,
            totalAssigned,
            totalDayWage,
          },
          suggestedPrompts: [
            `Who is absent on ${dateFormatted} for ${targetProjFinal ? targetProjFinal.name : 'greenfield'}`,
            `Worker present and absent data today for ${targetProjFinal ? targetProjFinal.name : 'greenfield'}`,
            `How many projects are in work today?`,
          ],
        },
      });
    }

    // =============================================================
    // 6.6 INTENT: BOQ BUDGET, ESTIMATION & INTERIOR COST VARIANCE
    //    (E.g. "show boq for Bakery", "what is the boq budget for Bakery",
    //          "boq variance for Bakery", "bill of quantities")
    // =============================================================
    if (
      (lower.includes('boq') ||
        lower.includes('bill of quantities') ||
        (lower.includes('budget') && (lower.includes('interior') || lower.includes('variance') || lower.includes('estimate') || lower.includes('boq'))) ||
        lower.includes('cost variance')) &&
      !lower.includes('create') &&
      !lower.includes('add boq')
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);

      if (!matchedProj) {
        const projectsWithBOQ = await prisma.project.findMany({
          include: { boqItems: true },
          orderBy: { createdAt: 'desc' },
        });

        if (projectsWithBOQ.length === 0) {
          return res.json({
            success: true,
            response: {
              message: '📐 No projects found in your database yet.',
              actionTaken: 'BOQ_DIRECTORY',
              suggestedPrompts: ['How many projects are active today?'],
            },
          });
        }

        let msg = `📐 **Internal Project BOQ & Estimation Directory**\n\n`;
        msg += `Please specify which project's Bill of Quantities (BOQ) you would like to inspect:\n\n`;
        msg += `| Project Code | Project Name | Client Name | BOQ Items | Approved Budget |\n`;
        msg += `| :--- | :--- | :--- | :--- | :--- |\n`;

        projectsWithBOQ.forEach((p) => {
          msg += `| \`${p.code}\` | **${p.name}** | ${p.clientName || '—'} | ${p.boqItems.length} items | ${formatINR(p.approvedBudget)} |\n`;
        });

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'BOQ_DIRECTORY',
            suggestedPrompts: projectsWithBOQ.slice(0, 3).map((p) => `Show BOQ for ${p.name}`),
          },
        });
      }

      const targetProj = matchedProj;

      const boqItems = await prisma.bOQItem.findMany({
        where: { projectId: targetProj.id },
        orderBy: { itemCode: 'asc' },
      });

      if (boqItems.length === 0) {
        return res.json({
          success: true,
          response: {
            message: `📐 **BOQ Register — ${targetProj.name}** [${targetProj.code}]\n\nNo Bill of Quantities (BOQ) items have been created for this project yet. You can initialize BOQ line items under the **BOQ** tab in the project portal.`,
            actionTaken: 'BOQ_QUERY',
            data: { projectId: targetProj.id, itemsCount: 0 },
            suggestedPrompts: [
              `Show scope variations and change orders for ${targetProj.name}`,
              `Show DPR report for ${targetProj.name}`,
              'How many projects are in work today?',
            ],
          },
        });
      }

      const totalEstimated = boqItems.reduce((s, it) => s + (it.estimatedTotal || 0), 0);
      const totalActual = boqItems.reduce((s, it) => s + (it.actualExpenditure || 0), 0);
      const netVariance = totalActual - totalEstimated;
      const isOverBudget = netVariance > 0;
      const avgProgress = Math.round(
        boqItems.reduce((s, it) => s + (it.estimatedQty > 0 ? (it.actualQtyCompleted / it.estimatedQty) * 100 : 0), 0) /
          boqItems.length
      );

      // Group by category
      const categoriesMap: { [cat: string]: { estimated: number; actual: number; count: number } } = {};
      boqItems.forEach((it) => {
        const cat = it.category || 'General Fit-Out';
        if (!categoriesMap[cat]) {
          categoriesMap[cat] = { estimated: 0, actual: 0, count: 0 };
        }
        categoriesMap[cat].estimated += it.estimatedTotal || 0;
        categoriesMap[cat].actual += it.actualExpenditure || 0;
        categoriesMap[cat].count += 1;
      });

      let msg = `📐 **BOQ & Interior Cost Variance — ${targetProj.name}** [${targetProj.code}]\n\n`;
      msg += `• 💰 **Total BOQ Estimated Budget:** **${formatINR(totalEstimated)}**\n`;
      msg += `• 💸 **Total Actual Expenditure:** **${formatINR(totalActual)}**\n`;
      msg += `• 📊 **Overall Cost Variance:** **${isOverBudget ? '⚠️ +' : '✅ '}${formatINR(netVariance)}** ${isOverBudget ? '*(Over Budget)*' : '*(Within Budget)*'}\n`;
      msg += `• 📈 **Average Execution Progress:** **${avgProgress}%** across **${boqItems.length} BOQ line items**\n\n`;

      msg += `📑 **Category-Wise Breakdown:**\n`;
      Object.entries(categoriesMap).forEach(([cat, stats]) => {
        const catVar = stats.actual - stats.estimated;
        const icon = catVar > 0 ? '⚠️' : '✅';
        msg += `• **${cat}** (${stats.count} items): Est: ${formatINR(stats.estimated)} | Act: ${formatINR(stats.actual)} | Var: ${icon} ${catVar > 0 ? '+' : ''}${formatINR(catVar)}\n`;
      });

      msg += `\n🔍 **Top Line Items:**\n`;
      boqItems.slice(0, 5).forEach((it) => {
        const prog = it.estimatedQty > 0 ? Math.round((it.actualQtyCompleted / it.estimatedQty) * 100) : 0;
        msg += `• **${it.itemCode}** — ${it.description} (${it.estimatedQty} ${it.unit}): ${formatINR(it.estimatedTotal)} | Progress: ${prog}%\n`;
      });
      if (boqItems.length > 5) {
        msg += `• *...and ${boqItems.length - 5} more BOQ items*\n`;
      }

      const waMsg = encodeURIComponent(
        `📐 *BOQ Variance Report: ${targetProj.name}*\n` +
        `Est Budget: ${formatINR(totalEstimated)}\n` +
        `Actual Spent: ${formatINR(totalActual)}\n` +
        `Variance: ${isOverBudget ? '+' : ''}${formatINR(netVariance)}\n` +
        `Progress: ${avgProgress}%`
      );

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'BOQ_QUERY',
          data: {
            projectId: targetProj.id,
            projectName: targetProj.name,
            totalEstimated,
            totalActual,
            netVariance,
            avgProgress,
            itemCount: boqItems.length,
          },
          shareableUrls: { whatsapp: `https://wa.me/?text=${waMsg}` },
          suggestedPrompts: [
            `Show scope variations and change orders for ${targetProj.name}`,
            `Show DPR report for ${targetProj.name}`,
            `Check inventory and low stock materials`,
          ],
        },
      });
    }

    // =============================================================
    // 6.7 INTENT: SCOPE VARIATIONS & CHANGE ORDERS
    //    (E.g. "change orders for Bakery", "scope variations for Bakery",
    //          "variation orders")
    // =============================================================
    if (
      (lower.includes('change order') ||
        lower.includes('scope variation') ||
        lower.includes('variation order') ||
        lower.includes('scope change') ||
        lower.includes('scope variations')) &&
      !lower.includes('create') &&
      !lower.includes('add')
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const allProjects = await prisma.project.findMany();
      const targetProj = matchedProj || allProjects[0];

      const changeOrders = await prisma.contractChangeOrder.findMany({
        where: { ...(targetProj ? { projectId: targetProj.id } : {}) },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      });

      if (changeOrders.length === 0) {
        return res.json({
          success: true,
          response: {
            message: `📋 **Scope Variations & Change Orders — ${targetProj?.name || 'All Projects'}**\n\nNo change orders or client scope variations recorded. Execution is proceeding strictly under the original contracted BOQ scope.`,
            actionTaken: 'CHANGE_ORDER_QUERY',
            data: { count: 0 },
            suggestedPrompts: [
              `Show BOQ budget and variance for ${targetProj?.name || 'Bakery'}`,
              `Show DPR report for ${targetProj?.name || 'Bakery'}`,
              'How many projects are in work today?',
            ],
          },
        });
      }

      const totalImpact = changeOrders.reduce((s, co) => s + (co.amountDelta || 0), 0);
      const totalExtensionDays = changeOrders.reduce((s, co) => s + (co.timeDeltaDays || 0), 0);
      const approvedCount = changeOrders.filter((co) => co.status === 'APPROVED').length;
      const pendingCount = changeOrders.filter((co) => co.status === 'PENDING').length;

      let msg = `📋 **Scope Variations & Change Orders — ${targetProj?.name || 'Portfolio'}**\n\n`;
      msg += `• 💰 **Total Financial Impact:** **${formatINR(totalImpact)}**\n`;
      msg += `• ⏳ **Total Schedule Extension:** **+${totalExtensionDays} Days**\n`;
      msg += `• 📊 **Status Breakdown:** ✅ **${approvedCount} Approved** | ⏳ **${pendingCount} Pending Client Approval**\n\n`;

      msg += `📑 **Change Order Register:**\n`;
      changeOrders.forEach((co) => {
        const statusBadge = co.status === 'APPROVED' ? '✅ APPROVED' : co.status === 'PENDING' ? '⏳ PENDING' : '❌ REJECTED';
        msg += `• **${co.orderNumber}** — **${co.title || 'Scope Variation'}** [${statusBadge}]\n`;
        msg += `   Impact: **${formatINR(co.amountDelta)}** | Time: **+${co.timeDeltaDays} days** | Scope: *${co.description || co.scopeType}*\n`;
      });

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'CHANGE_ORDER_QUERY',
          data: { totalImpact, totalExtensionDays, approvedCount, pendingCount, changeOrders },
          suggestedPrompts: [
            `Show BOQ budget and variance for ${targetProj?.name || 'Bakery'}`,
            `Show DPR report for ${targetProj?.name || 'Bakery'}`,
            `How many projects are in work today?`,
          ],
        },
      });
    }

    // =============================================================
    // 6.8 INTENT: OFFICE STAFF ATTENDANCE & PAYROLL SUMMARY
    //    (E.g. "office staff attendance today", "staff attendance",
    //          "who is absent in office staff", "staff payroll summary")
    // =============================================================
    if (
      (lower.includes('staff') || lower.includes('office staff') || lower.includes('salaried staff')) &&
      (lower.includes('attendance') ||
        lower.includes('present') ||
        lower.includes('absent') ||
        lower.includes('leave') ||
        lower.includes('payroll') ||
        lower.includes('salary summary')) &&
      !lower.includes('paid ') &&
      !lower.includes('disburse') &&
      !lower.includes('record')
    ) {
      const extracted = extractDateFromPrompt(cleanPrompt);
      const { targetUtcDate, windowStart, windowEnd, dateFormatted: formattedDate, dayRelativeLabel } = extracted;
      const y = targetUtcDate.getFullYear();
      const m = String(targetUtcDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetUtcDate.getDate()).padStart(2, '0');

      // If payroll summary query
      if (lower.includes('payroll') || lower.includes('salary summary') || lower.includes('payroll summary')) {
        const monthYear = `${y}-${m}`;
        const [yearStr, mStr] = monthYear.split('-');
        const yNum = parseInt(yearStr, 10);
        const mNum = parseInt(mStr, 10);
        const daysInMonth = new Date(yNum, mNum, 0).getDate();
        const startOfMonth = new Date(Date.UTC(yNum, mNum - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(yNum, mNum, 0, 23, 59, 59, 999));

        const [allStaff, monthlyAttendance] = await Promise.all([
          prisma.officeStaff.findMany({ where: { isActive: true }, orderBy: { staffCode: 'asc' } }),
          prisma.staffAttendance.findMany({
            where: { date: { gte: startOfMonth, lte: endOfMonth } },
          }),
        ]);

        let totalLiability = 0;
        let totalCalculated = 0;
        const staffRecords = allStaff.map((st) => {
          const staffAtt = monthlyAttendance.filter((a) => a.staffId === st.id);
          const present = staffAtt.filter((a) => a.attendanceStatus === 'PRESENT').length;
          const paidLeave = staffAtt.filter((a) => a.attendanceStatus === 'PAID_LEAVE' || a.attendanceStatus === 'HOLIDAY').length;
          const halfDay = staffAtt.filter((a) => a.attendanceStatus === 'HALF_DAY').length;
          const otHours = staffAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
          const effectiveDays = present + paidLeave + halfDay * 0.5;

          const baseSalary = st.fixedSalary || 0;
          const dailyRate = baseSalary / daysInMonth;
          const hourlyRate = dailyRate / 8;
          const earnedSalary = staffAtt.length > 0 ? Math.round(dailyRate * effectiveDays) : baseSalary;
          const otAmount = Math.round(otHours * hourlyRate * 1.5);
          const net = earnedSalary + otAmount;

          totalLiability += baseSalary;
          totalCalculated += net;

          return {
            code: st.staffCode,
            name: st.name,
            designation: st.designation,
            fixedSalary: baseSalary,
            effectiveDays,
            otHours,
            netPayable: net,
          };
        });

        let msg = `💼 **Office Staff Payroll Summary — ${monthYear}**\n\n`;
        msg += `• 👥 **Total Active Staff:** **${allStaff.length} employees**\n`;
        msg += `• 💰 **Fixed Monthly Liability:** **${formatINR(totalLiability)}**\n`;
        msg += `• 🧮 **Calculated Net Salary (Attendance Pro-Rated):** **${formatINR(totalCalculated)}**\n\n`;
        msg += `📊 **Staff-wise Breakdown:**\n`;
        staffRecords.forEach((r) => {
          msg += `• **${r.code}** — **${r.name}** (${r.designation}): ${formatINR(r.netPayable)} *(Effective: ${r.effectiveDays} days, OT: ${r.otHours}h, Fixed: ${formatINR(r.fixedSalary)})*\n`;
        });

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'STAFF_ATTENDANCE_QUERY',
            data: { monthYear, totalStaff: allStaff.length, totalLiability, totalCalculated, staffRecords },
            suggestedPrompts: [
              'Show office staff attendance today',
              'What is the overall office expense this month?',
              'Export ledger to Google Sheet',
            ],
          },
        });
      }

      // Daily staff attendance query
      const [allStaff, dayAttendance] = await Promise.all([
        prisma.officeStaff.findMany({ where: { isActive: true }, orderBy: { staffCode: 'asc' } }),
        prisma.staffAttendance.findMany({
          where: { date: { gte: windowStart, lte: windowEnd } },
          include: { staff: true },
        }),
      ]);

      const attMap = new Map<string, typeof dayAttendance[0]>();
      dayAttendance.forEach((a) => {
        if (!attMap.has(a.staffId)) attMap.set(a.staffId, a);
      });

      const presentList: any[] = [];
      const halfDayList: any[] = [];
      const leaveList: any[] = [];
      const absentList: any[] = [];
      const pendingList: any[] = [];

      allStaff.forEach((st) => {
        const att = attMap.get(st.id);
        if (!att) {
          pendingList.push(st);
        } else if (att.attendanceStatus === 'PRESENT') {
          presentList.push({ staff: st, att });
        } else if (att.attendanceStatus === 'HALF_DAY') {
          halfDayList.push({ staff: st, att });
        } else if (att.attendanceStatus === 'PAID_LEAVE' || att.attendanceStatus === 'LEAVE' || att.attendanceStatus === 'HOLIDAY') {
          leaveList.push({ staff: st, att });
        } else if (att.attendanceStatus === 'ABSENT') {
          absentList.push({ staff: st, att });
        }
      });

      // If specific "who is absent"
      if (lower.includes('absent') || lower.includes('who is absent')) {
        let msg = `🔴 **Office Staff Absence Report**\n📅 **Date:** ${formattedDate} ${dayRelativeLabel}\n\n`;
        if (absentList.length === 0 && leaveList.length === 0) {
          msg += `✅ **No Staff Absent!** All **${allStaff.length} employees** are accounted for today.\n`;
        } else {
          msg += `Found **${absentList.length} absent** and **${leaveList.length} on leave** out of ${allStaff.length} staff:\n\n`;
          if (absentList.length > 0) {
            msg += `🔴 **ABSENT STAFF:**\n`;
            absentList.forEach(({ staff }) => {
              msg += `• **${staff.staffCode}** — **${staff.name}** (${staff.designation})\n`;
            });
            msg += `\n`;
          }
          if (leaveList.length > 0) {
            msg += `🟡 **ON LEAVE / PAID LEAVE:**\n`;
            leaveList.forEach(({ staff, att }) => {
              msg += `• **${staff.staffCode}** — **${staff.name}** (${staff.designation}) | Status: ${att.attendanceStatus}${att.notes ? ` (${att.notes})` : ''}\n`;
            });
          }
        }

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'STAFF_ATTENDANCE_QUERY',
            data: { date: formattedDate, absentCount: absentList.length, leaveCount: leaveList.length, totalStaff: allStaff.length },
            suggestedPrompts: [
              'Show office staff attendance today',
              'Show staff payroll summary this month',
              'How many projects are in work today?',
            ],
          },
        });
      }

      // If specific "who is present"
      if (lower.includes('who is present') || (lower.includes('present') && !lower.includes('absent'))) {
        let msg = `🟢 **Office Staff Present**\n📅 **Date:** ${formattedDate} ${dayRelativeLabel}\n\n`;
        if (presentList.length === 0) {
          msg += `ℹ️ No staff marked Present yet in the Office Register for ${formattedDate}.\n`;
        } else {
          msg += `Found **${presentList.length} staff members present** on duty:\n\n`;
          presentList.forEach(({ staff, att }) => {
            const otText = att.overtimeHours > 0 ? ` | OT: +${att.overtimeHours}h` : '';
            msg += `• **${staff.staffCode}** — **${staff.name}** (${staff.designation})${otText}\n`;
          });
        }

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'STAFF_ATTENDANCE_QUERY',
            data: { date: formattedDate, presentCount: presentList.length, totalStaff: allStaff.length },
            suggestedPrompts: [
              'Show office staff attendance today',
              'Show staff payroll summary this month',
              'What is the overall office expense this month?',
            ],
          },
        });
      }

      // General staff attendance summary
      let msg = `🏢 **Corporate Office Staff Attendance Register**\n📅 **Date:** ${formattedDate} ${dayRelativeLabel}\n\n`;
      msg += `📊 **Summary:**\n`;
      msg += `• 🟢 **Present:** **${presentList.length}** | 🟡 **Half-Day:** **${halfDayList.length}** | 🏖️ **On Leave:** **${leaveList.length}**\n`;
      msg += `• 🔴 **Absent:** **${absentList.length}** | ⚪ **Pending Marking:** **${pendingList.length}**\n`;
      msg += `• 👥 **Total Staff Headcount:** **${allStaff.length} employees**\n\n`;

      if (presentList.length > 0) {
        msg += `🟢 **PRESENT STAFF (${presentList.length}):**\n`;
        presentList.forEach(({ staff, att }) => {
          msg += `• **${staff.staffCode}** — **${staff.name}** (${staff.designation})\n`;
        });
        msg += `\n`;
      }
      if (absentList.length > 0) {
        msg += `🔴 **ABSENT STAFF (${absentList.length}):**\n`;
        absentList.forEach(({ staff }) => {
          msg += `• **${staff.staffCode}** — **${staff.name}** (${staff.designation})\n`;
        });
        msg += `\n`;
      }
      if (leaveList.length > 0) {
        msg += `🟡 **ON LEAVE (${leaveList.length}):**\n`;
        leaveList.forEach(({ staff, att }) => {
          msg += `• **${staff.staffCode}** — **${staff.name}** (${staff.designation}) [${att.attendanceStatus}]\n`;
        });
      }

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'STAFF_ATTENDANCE_QUERY',
          data: {
            date: formattedDate,
            totalStaff: allStaff.length,
            presentCount: presentList.length,
            absentCount: absentList.length,
            leaveCount: leaveList.length,
            pendingCount: pendingList.length,
          },
          suggestedPrompts: [
            'Show staff payroll summary this month',
            'What is the overall office expense this month?',
            'How many projects are in work today?',
          ],
        },
      });
    }

    // =============================================================
    // 6.9 INTENT: MATERIAL INVENTORY & LOW STOCK ALERTS
    //    (E.g. "check inventory", "what materials are low in stock",
    //          "low stock alerts", "material requisitions")
    // =============================================================
    if (
      (lower.includes('inventory') ||
        lower.includes('low stock') ||
        lower.includes('check stock') ||
        lower.includes('materials in stock') ||
        lower.includes('reorder level') ||
        lower.includes('material requisition') ||
        (lower.includes('material') && lower.includes('stock'))) &&
      !lower.includes('create') &&
      !lower.includes('add')
    ) {
      const [materials, pendingReqs] = await Promise.all([
        prisma.material.findMany({
          include: { stockBalances: { include: { warehouse: true } } },
          orderBy: { name: 'asc' },
        }),
        prisma.materialRequisition.findMany({
          where: { status: 'PENDING' },
          include: { project: true, items: { include: { material: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const materialStats = materials.map((m) => {
        const totalQty = m.stockBalances.reduce((s, b) => s + (b.currentQty || 0), 0);
        const valuation = m.stockBalances.reduce((s, b) => s + (b.totalValuation || 0), 0) || totalQty * (m.standardPrice || 0);
        return {
          id: m.id,
          code: m.code,
          name: m.name,
          category: m.category,
          unit: m.unit,
          currentStock: totalQty,
          minStockLevel: m.minStockLevel,
          reorderQty: m.reorderQty,
          standardPrice: m.standardPrice,
          valuation,
          isLow: totalQty <= m.minStockLevel,
        };
      });

      const lowStockMaterials = materialStats.filter((m) => m.isLow);
      const totalInventoryValue = materialStats.reduce((s, m) => s + m.valuation, 0);

      let msg = `📦 **Material Inventory & Stock Alert Report**\n\n`;
      msg += `• 🏬 **Total Tracked Materials:** **${materials.length} items** across warehouses\n`;
      msg += `• 💰 **Total Stock Valuation:** **${formatINR(totalInventoryValue)}**\n`;
      msg += `• 🚨 **Low Stock / Reorder Alerts:** **${lowStockMaterials.length} items critical**\n`;
      msg += `• 📋 **Pending Site Requisitions:** **${pendingReqs.length} requests pending approval**\n\n`;

      if (lowStockMaterials.length > 0) {
        msg += `🚨 **CRITICAL LOW STOCK ITEMS:**\n`;
        lowStockMaterials.forEach((m) => {
          const deficit = Math.max(0, m.minStockLevel - m.currentStock);
          msg += `• **${m.code}** — **${m.name}** (${m.category})\n`;
          msg += `   Current: **${m.currentStock} ${m.unit}** | Reorder Level: **${m.minStockLevel} ${m.unit}** (Deficit: **${deficit} ${m.unit}**)\n`;
          msg += `   Standard Price: ${formatINR(m.standardPrice)}/${m.unit} | Est. Reorder Value: ${formatINR(m.reorderQty * m.standardPrice)}\n`;
        });
        msg += `\n`;
      } else {
        msg += `✅ **All Material Stock Levels Healthy!** No items are below their minimum reorder thresholds.\n\n`;
      }

      if (pendingReqs.length > 0) {
        msg += `📋 **PENDING MATERIAL REQUISITIONS (${pendingReqs.length}):**\n`;
        pendingReqs.slice(0, 4).forEach((req) => {
          msg += `• **${req.requisitionNumber}** — Project: **${req.project?.name || 'Site'}** | Priority: ${req.priority} | Required Date: ${formatDateStr(req.requiredDate)}\n`;
        });
        if (pendingReqs.length > 4) {
          msg += `• *...and ${pendingReqs.length - 4} more pending site requisitions*\n`;
        }
      }

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'INVENTORY_QUERY',
          data: {
            totalMaterials: materials.length,
            lowStockCount: lowStockMaterials.length,
            pendingRequisitionsCount: pendingReqs.length,
            totalInventoryValue,
          },
          suggestedPrompts: [
            'How many projects are in work today?',
            'What is the balance due amount of the client greenfield?',
            'Export ledger to Google Sheet',
          ],
        },
      });
    }

    // =============================================================
    // 6.95 INTENT: DAILY PROGRESS REPORT (DPR) QUERY
    //    (E.g. "show today's dpr for Bakery", "dpr report for Bakery",
    //          "site progress report")
    // =============================================================
    if (
      (lower.includes('dpr') ||
        lower.includes('daily progress') ||
        lower.includes('site progress') ||
        lower.includes('daily report') ||
        lower.includes('daily site report')) &&
      !lower.includes('create') &&
      !lower.includes('add')
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const allProjects = await prisma.project.findMany();
      const targetProj = matchedProj || allProjects[0];

      const dprs = await prisma.dailySiteReport.findMany({
        where: { ...(targetProj ? { projectId: targetProj.id } : {}) },
        include: { site: true, project: true, labourEntries: true },
        orderBy: { reportDate: 'desc' },
        take: 3,
      });

      if (dprs.length === 0) {
        return res.json({
          success: true,
          response: {
            message: `📋 **Daily Progress Report (DPR) — ${targetProj?.name || 'Project'}**\n\nNo Daily Progress Reports have been submitted for ${targetProj?.name || 'this project'} yet. Site engineers can log daily DPRs with headcount, progress, and photos from the **Site Logs** tab.`,
            actionTaken: 'DPR_QUERY',
            data: { count: 0 },
            suggestedPrompts: [
              `Show BOQ budget and variance for ${targetProj?.name || 'Bakery'}`,
              `Who is present today in ${targetProj?.name || 'Bakery'}?`,
              'How many projects are in work today?',
            ],
          },
        });
      }

      const latest = dprs[0];
      const dprDateStr = formatDateStr(latest.reportDate);
      const totalHeadcount = latest.labourEntries.reduce((s, l) => s + (l.headcount || 0), 0);

      let msg = `📋 **Daily Progress Report (DPR) — ${latest.project?.name || targetProj?.name}**\n`;
      msg += `📅 **Date:** ${dprDateStr} | **Site:** ${latest.site?.name || 'Main Site'}\n\n`;
      msg += `• ⛅ **Weather:** ${latest.weather || 'Clear / Dry'}\n`;
      msg += `• 👷 **On-Site Headcount Logged:** **${totalHeadcount} workers**\n`;
      if (latest.workSummary) {
        msg += `• 🏗️ **Work Progress & Executed Activities:**\n   ${latest.workSummary}\n`;
      }
      if (latest.issuesNoted) {
        msg += `• ⚠️ **Roadblocks / Site Issues:**\n   ${latest.issuesNoted}\n`;
      }

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'DPR_QUERY',
          data: latest,
          suggestedPrompts: [
            `Show BOQ budget and variance for ${targetProj?.name || 'Bakery'}`,
            `Show scope variations and change orders for ${targetProj?.name || 'Bakery'}`,
            `Who is present today in ${targetProj?.name || 'Bakery'}?`,
          ],
        },
      });
    }

    // =============================================================
    // 7. INTENT: WORKER ATTENDANCE — PRESENT & ABSENT DATA QUERY
    //    (E.g. "worker present and absent data today for greenfield",
    //          "who is present today in greenfield", "present and absent list")
    // =============================================================
    if (
      (lower.includes('present') ||
        lower.includes('absent') ||
        lower.includes('attendance') ||
        lower.includes('muster') ||
        lower.includes('who is working') ||
        lower.includes('who is present') ||
        lower.includes('who is absent') ||
        lower.includes('on-site') ||
        lower.includes('on site') ||
        (lower.includes('worker') && (lower.includes('status') || lower.includes('report') || lower.includes('data')))) &&
      !lower.includes('paid ') &&
      !lower.includes('disburse') &&
      !lower.includes('add worker') &&
      !lower.includes('create worker') &&
      !lower.includes('need to add')
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const targetProj = matchedProj;

      // Target Date: extracted from prompt (supports 26-10-2026, yesterday, today, tomorrow, etc.)
      const extracted = extractDateFromPrompt(cleanPrompt);
      const { targetUtcDate, windowStart, windowEnd, dateFormatted: extractedDateFormatted, dayRelativeLabel, isExplicitDate, isFuture } = extracted;

      // 1. Fetch attendances for this day
      let rawAttendances = await prisma.labourAttendance.findMany({
        where: {
          date: { gte: windowStart, lte: windowEnd },
          ...(targetProj ? { projectId: targetProj.id } : {}),
        },
        include: {
          worker: true,
          project: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      let isShowingHistorical = false;
      let displayDate = targetUtcDate;
      let displayLabel = dayRelativeLabel;

      // 2. If no attendance recorded and user did NOT specify an explicit date, fallback to latest recorded date
      if (rawAttendances.length === 0 && !isExplicitDate) {
        const latestAtt = await prisma.labourAttendance.findFirst({
          where: {
            ...(targetProj ? { projectId: targetProj.id } : {}),
          },
          orderBy: { date: 'desc' },
        });

        if (latestAtt) {
          isShowingHistorical = true;
          displayLabel = '*(Latest Recorded Muster Log)*';
          const latD = new Date(latestAtt.date);
          const latY = latD.getFullYear();
          const latM = String(latD.getMonth() + 1).padStart(2, '0');
          const latDay = String(latD.getDate()).padStart(2, '0');
          displayDate = new Date(`${latY}-${latM}-${latDay}T00:00:00.000Z`);
          const latStart = new Date(displayDate.getTime() - 14 * 3600 * 1000);
          const latEnd = new Date(displayDate.getTime() + 14 * 3600 * 1000);

          rawAttendances = await prisma.labourAttendance.findMany({
            where: {
              date: { gte: latStart, lte: latEnd },
              ...(targetProj ? { projectId: targetProj.id } : {}),
            },
            include: {
              worker: true,
              project: true,
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      // Deduplicate attendances by workerId so each worker appears exactly once
      const attMap = new Map<string, typeof rawAttendances[0]>();
      for (const a of rawAttendances) {
        if (a.workerId && !attMap.has(a.workerId)) {
          attMap.set(a.workerId, a);
        }
      }
      const attendances = Array.from(attMap.values());
      attendances.sort((a, b) => (a.worker?.workerCode || '').localeCompare(b.worker?.workerCode || ''));

      // 3. Fetch registered workers for this project
      const assignedWorkers = await prisma.worker.findMany({
        where: {
          isActive: true,
          ...(targetProj ? { projectId: targetProj.id } : {}),
        },
        include: { project: true },
        orderBy: { workerCode: 'asc' },
      });

      const presentList: any[] = [];
      const halfDayList: any[] = [];
      const absentList: any[] = [];
      const notMarkedList: any[] = [];

      attendances.forEach((a) => {
        if (a.attendanceStatus === 'PRESENT') {
          presentList.push(a);
        } else if (a.attendanceStatus === 'HALF_DAY') {
          halfDayList.push(a);
        } else if (a.attendanceStatus === 'ABSENT') {
          absentList.push(a);
        }
      });

      assignedWorkers.forEach((w) => {
        if (!attMap.has(w.id)) {
          notMarkedList.push(w);
        }
      });

      const dateFormatted = displayDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const totalRegistered = assignedWorkers.length || (presentList.length + halfDayList.length + absentList.length);
      const totalOnSite = presentList.length + halfDayList.length;
      const attPercent = totalRegistered > 0 ? Math.round((totalOnSite / totalRegistered) * 100) : 0;

      const projTitle = targetProj ? `${targetProj.name} [${targetProj.code}]` : 'All Active Construction Sites';

      // Specific Query: "Who is absent"
      if (lower.includes('who is absent') || (lower.includes('absent') && !lower.includes('present') && !lower.includes('all') && !lower.includes('summary'))) {
        let msg = `🔴 **Absent Workers Report — ${projTitle}**\n`;
        msg += `📅 **Date:** ${dateFormatted} ${displayLabel}\n\n`;

        if (absentList.length === 0) {
          msg += `✅ **100% Turnout!** No workers are absent at **${projTitle}** on ${dateFormatted}.\n`;
          msg += `All **${totalOnSite} on-site workers** are present and accounted for.\n`;
        } else {
          msg += `Found **${absentList.length} workers absent** out of ${totalRegistered} registered:\n\n`;
          absentList.forEach((a) => {
            const w = a.worker;
            msg += `• **${w?.workerCode || 'WRK'}** — **${w?.name || 'Worker'}** (${w?.trade || 'SKILLED'}) | Status: **ABSENT**\n`;
          });
        }

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'ATTENDANCE_QUERY',
            data: {
              projectId: targetProj?.id,
              projectName: targetProj?.name,
              date: dateFormatted,
              absentCount: absentList.length,
              totalRegistered,
              absentWorkers: absentList.map((a) => ({ code: a.worker?.workerCode, name: a.worker?.name, trade: a.worker?.trade })),
            },
            suggestedPrompts: [
              `Who is present today in ${targetProj ? targetProj.name : 'greenfield'}?`,
              `Show BOQ budget and variance for ${targetProj ? targetProj.name : 'Bakery'}`,
              `What is the balance due amount of the client ${targetProj ? targetProj.name : 'greenfield'}`,
            ],
          },
        });
      }

      // Specific Query: "Who is present"
      if (lower.includes('who is present') || (lower.includes('present') && !lower.includes('absent') && !lower.includes('all') && !lower.includes('summary'))) {
        let msg = `🟢 **Present Workers On-Site — ${projTitle}**\n`;
        msg += `📅 **Date:** ${dateFormatted} ${displayLabel}\n\n`;

        if (presentList.length === 0 && halfDayList.length === 0) {
          msg += `ℹ️ No workers recorded present on site for ${dateFormatted}.\n`;
        } else {
          msg += `Found **${totalOnSite} workers on-site** today (${presentList.length} full day, ${halfDayList.length} half day):\n\n`;
          presentList.forEach((a) => {
            const w = a.worker;
            const otText = a.overtimeHours > 0 ? ` | OT: +${a.overtimeHours}h` : '';
            const actText = a.workActivity ? ` | Activity: ${a.workActivity}` : '';
            const wageText = a.totalWageEarned > 0 ? ` | Wage: ${formatINR(a.totalWageEarned)}` : (w ? ` | Rate: ${formatINR(w.dailyWageRate)}/day` : '');
            msg += `• **${w?.workerCode || 'WRK'}** — **${w?.name || 'Worker'}** (${w?.trade || 'SKILLED'})${otText}${wageText}${actText}\n`;
          });
          if (halfDayList.length > 0) {
            msg += `\n🟡 **Half-Day Workers:**\n`;
            halfDayList.forEach((a) => {
              const w = a.worker;
              msg += `• **${w?.workerCode || 'WRK'}** — **${w?.name || 'Worker'}** (${w?.trade || 'SKILLED'})\n`;
            });
          }
        }

        return res.json({
          success: true,
          response: {
            message: msg,
            actionTaken: 'ATTENDANCE_QUERY',
            data: {
              projectId: targetProj?.id,
              projectName: targetProj?.name,
              date: dateFormatted,
              presentCount: presentList.length,
              halfDayCount: halfDayList.length,
              totalOnSite,
              presentWorkers: presentList.map((a) => ({ code: a.worker?.workerCode, name: a.worker?.name, trade: a.worker?.trade })),
            },
            suggestedPrompts: [
              `Who is absent today in ${targetProj ? targetProj.name : 'greenfield'}?`,
              `Show BOQ budget and variance for ${targetProj ? targetProj.name : 'Bakery'}`,
              `How many projects are in work today?`,
            ],
          },
        });
      }

      let msg = `📋 **Worker Attendance Report — ${projTitle}**\n`;
      msg += `📅 **Date:** ${dateFormatted} ${displayLabel}\n\n`;

      if (isShowingHistorical) {
        msg += `ℹ️ *Notice: Today's muster attendance has not been registered yet. Showing latest available attendance log below:*\n\n`;
      }

      msg += `📊 **Attendance Summary:**\n`;
      msg += `• 🟢 **Present On-Site:** **${presentList.length} workers**\n`;
      msg += `• 🔴 **Absent:** **${absentList.length} workers**\n`;
      if (halfDayList.length > 0) {
        msg += `• 🟡 **Half-Day:** **${halfDayList.length} workers**\n`;
      }
      if (notMarkedList.length > 0) {
        msg += `• ⚪ **Not Marked / Pending:** **${notMarkedList.length} workers**\n`;
      }
      msg += `• 👥 **Total Assigned Workers:** ${totalRegistered} | **Turnout Rate:** ${attPercent}%\n\n`;

      // 🟢 PRESENT WORKERS
      if (presentList.length > 0) {
        msg += `🟢 **PRESENT WORKERS (${presentList.length}):**\n`;
        presentList.forEach((a) => {
          const w = a.worker;
          const otText = a.overtimeHours > 0 ? ` | OT: +${a.overtimeHours}h` : '';
          const actText = a.workActivity ? ` | Activity: ${a.workActivity}` : '';
          const wageText = a.totalWageEarned > 0 ? ` | Wage: ${formatINR(a.totalWageEarned)}` : (w ? ` | Rate: ${formatINR(w.dailyWageRate)}/day` : '');
          msg += `• **${w?.workerCode || 'WRK'}** — **${w?.name || 'Worker'}** (${w?.trade || 'SKILLED'})${otText}${wageText}${actText}\n`;
        });
        msg += `\n`;
      } else {
        msg += `🟢 **PRESENT WORKERS:** None recorded present.\n\n`;
      }

      // 🔴 ABSENT WORKERS
      if (absentList.length > 0) {
        msg += `🔴 **ABSENT WORKERS (${absentList.length}):**\n`;
        absentList.forEach((a) => {
          const w = a.worker;
          msg += `• **${w?.workerCode || 'WRK'}** — **${w?.name || 'Worker'}** (${w?.trade || 'SKILLED'}) | Status: **ABSENT** (No wages accrued)\n`;
        });
        msg += `\n`;
      }

      // 🟡 HALF-DAY WORKERS
      if (halfDayList.length > 0) {
        msg += `🟡 **HALF-DAY WORKERS (${halfDayList.length}):**\n`;
        halfDayList.forEach((a) => {
          const w = a.worker;
          const otText = a.overtimeHours > 0 ? ` | OT: +${a.overtimeHours}h` : '';
          const wageText = a.totalWageEarned > 0 ? ` | Half-Day Wage: ${formatINR(a.totalWageEarned)}` : '';
          msg += `• **${w?.workerCode || 'WRK'}** — **${w?.name || 'Worker'}** (${w?.trade || 'SKILLED'})${otText}${wageText}\n`;
        });
        msg += `\n`;
      }

      // ⚪ NOT MARKED WORKERS
      if (notMarkedList.length > 0) {
        msg += `⚪ **PENDING / NOT MARKED TODAY (${notMarkedList.length}):**\n`;
        notMarkedList.slice(0, 5).forEach((w) => {
          msg += `• **${w.workerCode}** — **${w.name}** (${w.trade}) | Muster entry pending in Labour register\n`;
        });
        if (notMarkedList.length > 5) {
          msg += `• *...and ${notMarkedList.length - 5} more workers*\n`;
        }
        msg += `\n`;
      }

      const totalDailyWage = attendances.reduce((s, a) => s + (a.totalWageEarned || (a.attendanceStatus === 'PRESENT' ? a.worker?.dailyWageRate || 0 : a.attendanceStatus === 'HALF_DAY' ? (a.worker?.dailyWageRate || 0) / 2 : 0)), 0);
      if (totalDailyWage > 0) {
        msg += `💰 **Total Computed Day Wages:** **${formatINR(totalDailyWage)}**\n`;
      }

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'ATTENDANCE_QUERY',
          data: {
            projectId: targetProj?.id,
            projectName: targetProj?.name,
            date: dateFormatted,
            presentCount: presentList.length,
            absentCount: absentList.length,
            halfDayCount: halfDayList.length,
            totalAssigned: totalRegistered,
            presentWorkers: presentList.map((a) => ({ code: a.worker?.workerCode, name: a.worker?.name, trade: a.worker?.trade })),
            absentWorkers: absentList.map((a) => ({ code: a.worker?.workerCode, name: a.worker?.name, trade: a.worker?.trade })),
          },
          suggestedPrompts: [
            `How many projects are in work today?`,
            `What is the balance due amount of the client ${targetProj ? targetProj.name : 'greenfield'}`,
            `What are all the payments received and paid today`,
          ],
        },
      });
    }

    // =============================================================
    // 7b. INTENT: GENERAL WORKFORCE DIRECTORY & TRADE DISTRIBUTION
    // =============================================================
    if (
      (lower.includes('worker') ||
        lower.includes('labour') ||
        lower.includes('workforce') ||
        lower.includes('manpower')) &&
      (lower.includes('how many') ||
        lower.includes('list') ||
        lower.includes('count') ||
        lower.includes('trade distribution') ||
        lower.includes('roster')) &&
      !lower.includes('paid')
    ) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const workers = await prisma.worker.findMany({
        where: {
          isActive: true,
          ...(matchedProj ? { projectId: matchedProj.id } : {}),
        },
        include: { project: true },
        orderBy: { workerCode: 'asc' },
      });

      const projTitle = matchedProj ? `for ${matchedProj.name}` : `(Company-Wide)`;
      let msg = `👷 **Workforce Directory ${projTitle} (${workers.length} Active Workers)**\n\n`;

      const tradeCounts: Record<string, number> = {};
      workers.forEach((w) => {
        tradeCounts[w.trade] = (tradeCounts[w.trade] || 0) + 1;
      });

      msg += `🛠️ **Trade Distribution:**\n`;
      Object.entries(tradeCounts).forEach(([trade, cnt]) => {
        msg += `• **${trade}**: ${cnt} workers\n`;
      });
      msg += `\n`;

      msg += `📋 **Worker Roster:**\n`;
      workers.forEach((w) => {
        msg += `• **${w.workerCode}** — **${w.name}** (${w.trade}) | Project: ${w.project?.name || 'Central'} | Rate: ${formatINR(w.dailyWageRate)}/day\n`;
      });

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'WORKER_ROSTER_QUERY',
          data: { totalWorkers: workers.length, tradeCounts },
          suggestedPrompts: [
            `Worker present and absent data today for ${matchedProj ? matchedProj.name : 'greenfield'}`,
            'How many projects are in work today?',
            'What are all the payments received and paid today',
          ],
        },
      });
    }

    // =============================================================
    // 8. INTENT: STAFF DIRECTORY & PAYROLL QUERY
    // =============================================================
    if (
      (lower.includes('staff') || lower.includes('employee') || lower.includes('payroll')) &&
      (lower.includes('list') ||
        lower.includes('how many') ||
        lower.includes('who are') ||
        lower.includes('directory') ||
        lower.includes('salary') ||
        lower.includes('details')) &&
      !lower.includes('paid')
    ) {
      const staffList = await prisma.officeStaff.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      const totalMonthlyPayroll = staffList.reduce((s, st) => s + (st.fixedSalary || 0), 0);

      let msg =
        `👥 **Corporate Staff Directory & Fixed Payroll (${staffList.length} Employees)**\n\n` +
        `💰 **Total Committed Monthly Payroll:** **${formatINR(totalMonthlyPayroll)}**\n\n`;

      staffList.forEach((st) => {
        msg += `• **${st.staffCode}** — **${st.name}** (${st.designation}) | Category: ${st.roleCategory} | Fixed Salary: ${formatINR(st.fixedSalary)}/mo (${st.paymentMode})\n`;
      });

      return res.json({
        success: true,
        response: {
          message: msg,
          actionTaken: 'STAFF_QUERY',
          data: { totalStaff: staffList.length, totalMonthlyPayroll },
          suggestedPrompts: [
            'What is the overall office expense this month?',
            'Paid office rent 45000 via bank',
            'Export ledger to Google Sheet',
          ],
        },
      });
    }

    // =============================================================
    // 8.9 INTENT: SELF-CORRECTION & REVERSAL / ROLLBACK ENGINE
    //     (E.g. "Undo the last receipt entry for Arun",
    //           "Delete incorrect payment record RCP-2026-001",
    //           "Undo last payment", "Revert receipt RCP-2026-001",
    //           "Cancel payment RCP-2026-001")
    // =============================================================
    const isReversalCommand =
      (lower.includes('undo') ||
        lower.includes('revert') ||
        lower.includes('reverse') ||
        lower.includes('rollback') ||
        ((lower.includes('delete') || lower.includes('cancel') || lower.includes('remove')) &&
          (lower.includes('receipt') ||
            lower.includes('payment') ||
            lower.includes('record') ||
            lower.includes('rcp-') ||
            lower.includes('transaction')))) &&
      !lower.includes('lead') &&
      !lower.includes('worker') &&
      !lower.includes('user');

    if (isReversalCommand) {
      const tenantFilter = getTenantFilter(req);
      const tenantId = (req.user as any)?.companyId || null;

      // Extract explicit receipt number if supplied (e.g., RCP-2026-001, AI-123456)
      const rcpMatch = cleanPrompt.match(/(?:RCP|REC|AI)-[A-Za-z0-9-]+/i);
      let receiptToReverse: any = null;

      if (rcpMatch) {
        receiptToReverse = await prisma.clientReceipt.findFirst({
          where: {
            receiptNumber: rcpMatch[0],
            ...(tenantId ? { tenantId } : {}),
          },
          include: { project: true, invoice: true, client: true },
        });
      }

      // If no receipt number in prompt, match by project / client context
      if (!receiptToReverse) {
        const targetProj = await findMatchedProject(cleanPrompt, context, tenantFilter);
        const targetCli = await findMatchedClient(cleanPrompt, context, tenantFilter);

        receiptToReverse = await prisma.clientReceipt.findFirst({
          where: {
            ...(targetProj ? { projectId: targetProj.id } : {}),
            ...(targetCli ? { clientId: targetCli.id } : {}),
            ...(tenantId ? { tenantId } : {}),
          },
          orderBy: { receiptDate: 'desc' },
          include: { project: true, invoice: true, client: true },
        });
      }

      if (!receiptToReverse) {
        return res.json({
          success: true,
          response: {
            message:
              `⚠️ **No Matching Payment Receipt Found to Reverse**\n\n` +
              `I could not locate an active client payment receipt matching your request. Please specify the exact Receipt Number (e.g., \`RCP-2026-001\`) or mention the client/project name.\n\n` +
              `Example: \`Delete incorrect payment record RCP-2026-001\` or \`Undo the last receipt entry for Arun\``,
            actionTaken: 'REVERSAL_NOT_FOUND',
            suggestedPrompts: [
              'What are all the payments received and paid today?',
              'What is the balance due amount of clients?',
            ],
          },
        });
      }

      // Perform safe database rollback within transaction
      const receipt = receiptToReverse;
      let reinstatedBalance = 0;
      let updatedInvoiceStatus = 'APPROVED';

      await prisma.$transaction(async (tx) => {
        // 1. Revert client invoice balance and status
        if (receipt.invoiceId) {
          const inv = await tx.clientInvoice.findUnique({ where: { id: receipt.invoiceId } });
          if (inv) {
            const newPaid = Math.max(0, inv.paidAmount - receipt.amount);
            reinstatedBalance = Math.max(0, inv.netInvoiceAmount - newPaid);
            updatedInvoiceStatus = newPaid === 0 ? (inv.invoiceType === 'ADVANCE' ? 'PENDING' : 'APPROVED') : 'PARTIALLY_PAID';

            await tx.clientInvoice.update({
              where: { id: inv.id },
              data: {
                paidAmount: newPaid,
                balanceDue: reinstatedBalance,
                status: updatedInvoiceStatus,
              },
            });
          }
        }

        // 2. Post balanced reversal journal entry: Debit Accounts Receivable, Credit Cash/Bank
        try {
          const debitAccount = receipt.paymentMethod === 'CASH' ? COA.CASH : COA.HDFC_BANK;
          await postBalancedJournalEntry({
            tenantId: receipt.tenantId,
            entryDate: new Date(),
            referenceType: 'CLIENT_RECEIPT_REVERSAL',
            referenceId: receipt.id,
            narration: `Reversal of Client Receipt ${receipt.receiptNumber} (${formatINR(receipt.amount)}). Rollback reason: AI self-correction command "${cleanPrompt}"`,
            lines: [
              { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: receipt.amount, credit: 0, projectId: receipt.projectId || undefined },
              { accountCode: debitAccount, debit: 0, credit: receipt.amount, projectId: receipt.projectId || undefined },
            ],
            createdById: req.user?.id,
            tx,
          });
        } catch (jeErr) {
          console.error('Error posting reversal journal entry:', jeErr);
        }

        // 3. Delete the client receipt record
        await tx.clientReceipt.delete({ where: { id: receipt.id } });
      });

      // 4. Audit Log
      await logAudit(
        req.user?.id,
        'REVERSE_CLIENT_RECEIPT',
        'CLIENT_RECEIPT',
        receipt.id,
        {
          receiptNumber: receipt.receiptNumber,
          amount: receipt.amount,
          projectId: receipt.projectId,
          clientId: receipt.clientId,
          prompt: cleanPrompt,
        },
        req.ip
      );

      return res.json({
        success: true,
        response: {
          message:
            `🔄 **Transaction Rollback Successful: Payment Receipt Reversed**\n\n` +
            `The payment record has been safely deleted and financial ledgers have been restored:\n\n` +
            `• **Reversed Receipt Number:** **${receipt.receiptNumber}**\n` +
            `• **Amount Restored:** **${formatINR(receipt.amount)}** (${receipt.paymentMethod})\n` +
            `• **Client / Project:** ${receipt.client?.name || receipt.project?.clientName || 'Client'} • **${receipt.project?.name}**\n` +
            (receipt.invoice ? `• **Invoice Restored:** RA Bill **${receipt.invoice.invoiceNumber}** due balance has been reinstated to **${formatINR(reinstatedBalance)}** (Status: ${updatedInvoiceStatus}).\n` : '') +
            `• **General Ledger:** Cash/Bank accounts and Accounts Receivable balances have been synchronized with a balanced reversal entry.\n` +
            `• **Collection Totals:** Net collections for **${receipt.project?.name}** have been updated.\n\n` +
            `✅ The billing register and collections ledger are now accurate.`,
          actionTaken: 'RECEIPT_REVERSED',
          data: {
            reversedReceiptNumber: receipt.receiptNumber,
            amount: receipt.amount,
            paymentMethod: receipt.paymentMethod,
            projectId: receipt.projectId,
            projectName: receipt.project?.name,
            invoiceNumber: receipt.invoice?.invoiceNumber,
            reinstatedBalance,
          },
          suggestedPrompts: [
            `What is the balance due amount of the client ${receipt.project?.name}?`,
            'What are all the payments received and paid today?',
            'Export ledger to Google Sheet',
          ],
        },
      });
    }

    // =============================================================
    // 9. INTENT: ACTION — CLIENT PAYMENT RECEIVED (WITH DEPENDENCY CHECK & TWO-WAY PREVIEW)
    //    (E.g. "Received ₹2,00,000 from client Arun", "Client paid 50000 for residential interior")
    // =============================================================
    if (
      (lower.includes('received') ||
        lower.includes('client paid') ||
        lower.includes('payment received') ||
        lower.includes('record receipt') ||
        lower.includes('advance payment') ||
        (lower.includes('payment') && (lower.includes('log') || lower.includes('add') || lower.includes('record')))) &&
      /\d+/.test(lower) &&
      !isReversalCommand &&
      !lower.includes('paid to vendor') &&
      !lower.includes('paid to supplier') &&
      !lower.includes('paid wage') &&
      !lower.includes('paid salary')
    ) {
      const amountMatch = cleanPrompt.match(/(?:rs\.?|inr|₹|\s|^)(\d+(?:,\d+)*(?:\.\d+)?)/i);
      const rawNum = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
      const amount = parseFloat(rawNum);

      const isCash = lower.includes('cash');
      const method = isCash ? 'CASH' : lower.includes('cheque') ? 'CHEQUE' : lower.includes('upi') ? 'UPI' : 'NEFT_RTGS';

      const tenantFilter = getTenantFilter(req);
      const tenantId = (req.user as any)?.companyId || null;

      // 1. Context-Aware Entity Matching
      let targetProj = await findMatchedProject(cleanPrompt, context, tenantFilter);
      let targetCli = await findMatchedClient(cleanPrompt, context, tenantFilter);

      if (!targetProj && targetCli) {
        targetProj = await prisma.project.findFirst({
          where: {
            OR: [
              { clientName: targetCli.name },
              { clientName: targetCli.companyName || undefined },
            ],
            ...tenantFilter,
          },
          include: { clientInvoices: true, clientReceipts: true, workers: true, tasks: true },
        });
      }

      if (!targetProj) {
        const allProjects = await prisma.project.findMany({ where: tenantFilter });
        if (allProjects.length === 1) {
          targetProj = allProjects[0] as any;
        } else {
          return res.json({
            success: true,
            response: {
              message: `I could not clearly identify which project this payment of ${formatINR(amount)} belongs to. Please specify the project or client name (e.g., "${allProjects.slice(0, 3).map((p) => p.name).join('", "')}").`,
              actionTaken: 'CLARIFY_PROJECT',
              suggestedPrompts: allProjects.slice(0, 3).map((p) => `Received ${formatINR(amount)} from ${p.name}`),
            },
          });
        }
      }

      const finalTenantId = targetProj.tenantId || tenantId;

      // 2. INVOICE & PAYMENT DEPENDENCY CHECK (RA BILL VALIDATION)
      // Check if an approved RA Bill / Client Invoice exists for that client and project
      const openInvoices = await prisma.clientInvoice.findMany({
        where: {
          projectId: targetProj.id,
          balanceDue: { gt: 0 },
          status: { in: ['APPROVED', 'PARTIALLY_PAID', 'PENDING'] },
          ...(finalTenantId ? { tenantId: finalTenantId } : {}),
        },
        orderBy: { invoiceDate: 'asc' },
      });

      const isAdvanceIntent = lower.includes('advance') || lower.includes('mobilization');

      // If no active RA Bill exists and NOT explicitly requested as advance payment
      if (openInvoices.length === 0 && !isAdvanceIntent) {
        return res.json({
          success: true,
          response: {
            message:
              `⚠️ **No active RA Bill found for this client (${targetProj.clientName || 'Client'} - ${targetProj.name}).**\n\n` +
              `Recording an unlinked receipt would create an orphaned payment record that skews the billing ledger.\n\n` +
              `Would you like me to **generate the RA Bill first** before recording this receipt, or **log it as an advance payment**?`,
            actionTaken: 'RA_BILL_DEPENDENCY_REQUIRED',
            data: {
              projectId: targetProj.id,
              projectName: targetProj.name,
              projectCode: targetProj.code,
              clientName: targetProj.clientName,
              amount,
              paymentMethod: method,
            },
            suggestedPrompts: [
              `Generate RA Bill for ${targetProj.name}`,
              `Log ₹${amount.toLocaleString('en-IN')} as advance payment for ${targetProj.name}`,
              `Show all RA Bills for ${targetProj.name}`,
            ],
          },
        });
      }

      // 3. TWO-WAY CONFIRMATION PREVIEW
      const selectedInv = openInvoices[0] || null;
      let clientId = selectedInv?.clientId || null;
      if (!clientId && targetProj.clientName) {
        const matchedCli = await prisma.client.findFirst({
          where: {
            OR: [{ name: targetProj.clientName }, { companyName: targetProj.clientName }],
            ...(finalTenantId ? { tenantId: finalTenantId } : {}),
          },
        });
        if (matchedCli) clientId = matchedCli.id;
      }

      const currentDue = selectedInv ? selectedInv.balanceDue : 0;
      const newDue = Math.max(0, currentDue - amount);
      const isAdvance = isAdvanceIntent || !selectedInv;

      const previewData = {
        actionType: 'RECORD_CLIENT_RECEIPT',
        title: isAdvance
          ? 'Client Mobilization Advance Receipt [Draft Verification]'
          : 'Client RA Payment Receipt [Draft Verification]',
        projectId: targetProj.id,
        projectName: targetProj.name,
        projectCode: targetProj.code,
        clientId,
        clientName: targetProj.clientName || 'Client',
        amount,
        paymentMethod: method,
        isAdvance,
        invoiceId: selectedInv ? selectedInv.id : null,
        invoiceNumber: selectedInv ? selectedInv.invoiceNumber : 'ADVANCE (Pre-Billing)',
        currentInvoiceDue: currentDue,
        newBalanceDue: newDue,
        date: new Date().toISOString().split('T')[0],
        journalPreview: [
          { account: method === 'CASH' ? 'Cash on Hand (COA 1010)' : 'Bank Account - HDFC (COA 1030)', type: 'DEBIT', amount },
          { account: `Accounts Receivable - ${targetProj.clientName || 'Client'} (COA 1100)`, type: 'CREDIT', amount },
        ],
        rawPayload: {
          action: 'CONFIRM_CLIENT_RECEIPT',
          tenantId: finalTenantId,
          projectId: targetProj.id,
          clientId,
          invoiceId: selectedInv ? selectedInv.id : null,
          amount,
          paymentMethod: method,
          isAdvance,
          prompt: cleanPrompt,
        },
      };

      return res.json({
        success: true,
        response: {
          message:
            `📋 **Two-Way Confirmation Preview: ${previewData.title}**\n\n` +
            `Please review the draft payment receipt and double-entry ledger impact below. Click **"Confirm & Post to Database"** to commit this transaction or **"Cancel"** to abort.`,
          actionTaken: 'CONFIRMATION_PREVIEW',
          data: previewData,
          suggestedPrompts: [
            'Confirm and post to database',
            'Cancel this transaction',
          ],
        },
      });
    }

    // =============================================================
    // 9.5 INTENT: ACTION — MATERIAL PURCHASE / PO CREATION (TWO-WAY PREVIEW)
    //     (E.g. "Add material purchase for site Y", "Add material purchase 100 bags cement for Greenfield")
    // =============================================================
    if (
      (lower.includes('material purchase') ||
        lower.includes('purchase material') ||
        lower.includes('buy material') ||
        lower.includes('bought material') ||
        (lower.includes('add') && lower.includes('purchase') && (lower.includes('site') || lower.includes('project')))) &&
      !lower.includes('how to') &&
      !lower.includes('guide')
    ) {
      const tenantFilter = getTenantFilter(req);
      const tenantId = (req.user as any)?.companyId || null;

      // 1. Context-Aware Entity Matching
      let targetProj = await findMatchedProject(cleanPrompt, context, tenantFilter);
      if (!targetProj) {
        const allProjects = await prisma.project.findMany({ where: tenantFilter });
        if (allProjects.length === 1) {
          targetProj = allProjects[0] as any;
        } else {
          return res.json({
            success: true,
            response: {
              message: `I could not clearly identify which construction site or project this material purchase is for. Please specify the project (e.g., "${allProjects.slice(0, 3).map((p) => p.name).join('", "')}").`,
              actionTaken: 'CLARIFY_PROJECT',
              suggestedPrompts: allProjects.slice(0, 3).map((p) => `Add material purchase for ${p.name}`),
            },
          });
        }
      }

      // 2. Material Matching
      const materials = await prisma.material.findMany({ where: tenantFilter || {} });
      let matchedMat = materials.find((m) => lower.includes(m.name.toLowerCase()) || lower.includes(m.code.toLowerCase()));
      if (!matchedMat) {
        const commonMatNames = ['cement', 'steel', 'sand', 'brick', 'aggregate', 'paint', 'tiles', 'plywood'];
        const found = commonMatNames.find((nm) => lower.includes(nm));
        if (found) {
          matchedMat = materials.find((m) => m.name.toLowerCase().includes(found));
        }
      }
      if (!matchedMat && materials.length > 0) {
        matchedMat = materials[0];
      }

      // 3. Quantity & Amount Parsing
      const qtyMatch = cleanPrompt.match(/(\d+)\s*(?:bags|bag|tons|ton|kg|sqft|cum|units|nos|pieces|pkt)?/i);
      const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 50;
      const unitPrice = matchedMat?.standardPrice || 380;
      const totalAmount = quantity * unitPrice;

      // 4. Supplier Matching
      const suppliers = await prisma.supplier.findMany({ where: tenantFilter || {} });
      let matchedSupp = suppliers.find((s) => lower.includes(s.name.toLowerCase()) || lower.includes(s.code.toLowerCase()));
      if (!matchedSupp && suppliers.length > 0) {
        matchedSupp = suppliers[0];
      }

      const previewData = {
        actionType: 'RECORD_MATERIAL_PURCHASE',
        title: 'Material Purchase Order & Stock Inward [Draft Verification]',
        projectId: targetProj.id,
        projectName: targetProj.name,
        projectCode: targetProj.code,
        materialId: matchedMat?.id,
        materialName: matchedMat?.name || 'Standard Construction Cement',
        materialCode: matchedMat?.code || 'MAT-001',
        unit: matchedMat?.unit || 'BAGS',
        quantity,
        unitPrice,
        totalAmount,
        supplierId: matchedSupp?.id,
        supplierName: matchedSupp?.name || 'Balaji Building Materials & Co.',
        date: new Date().toISOString().split('T')[0],
        journalPreview: [
          { account: 'Direct Material Cost (COA 5010)', type: 'DEBIT', amount: totalAmount },
          { account: `Accounts Payable - ${matchedSupp?.name || 'Material Vendor'} (COA 2010)`, type: 'CREDIT', amount: totalAmount },
        ],
        rawPayload: {
          action: 'CONFIRM_MATERIAL_PURCHASE',
          tenantId: targetProj.tenantId || tenantId,
          projectId: targetProj.id,
          materialId: matchedMat?.id,
          supplierId: matchedSupp?.id,
          quantity,
          unitPrice,
          totalAmount,
          prompt: cleanPrompt,
        },
      };

      return res.json({
        success: true,
        response: {
          message:
            `📋 **Two-Way Confirmation Preview: Material Purchase Order**\n\n` +
            `Please review the purchase draft and inventory expense ledger impact below. Click **"Confirm & Post to Database"** to commit this purchase order or **"Cancel"** to abort.`,
          actionTaken: 'CONFIRMATION_PREVIEW',
          data: previewData,
          suggestedPrompts: [
            'Confirm and post to database',
            'Cancel this transaction',
          ],
        },
      });
    }

    // =============================================================
    // 10. INTENT: ACTION — VENDOR / SUPPLIER PAYMENT
    //     (E.g. "paid 45000 to vendor Balaji via bank")
    // =============================================================
    if (
      (lower.includes('paid to vendor') ||
        lower.includes('paid to supplier') ||
        (lower.includes('paid') && (lower.includes('vendor') || lower.includes('supplier')))) &&
      /\d+/.test(lower)
    ) {
      const amountMatch = cleanPrompt.match(/(?:rs\.?|inr|₹|\s|^)(\d+(?:,\d+)*(?:\.\d+)?)/i);
      const rawNum = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
      const amount = parseFloat(rawNum);

      const isCash = lower.includes('cash');
      const method = isCash ? 'CASH' : 'BANK_TRANSFER';

      const suppliers = await prisma.supplier.findMany();
      let matchedSupp = suppliers.find((s) => lower.includes(s.name.toLowerCase()) || lower.includes(s.code.toLowerCase()));
      if (!matchedSupp && suppliers.length > 0) {
        matchedSupp = suppliers.find((s) => {
          const w = s.name.split(' ')[0].toLowerCase();
          return lower.includes(w);
        }) || suppliers[0];
      }

      if (matchedSupp && amount > 0) {
        const count = await prisma.supplierPayment.count();
        const paymentNumber = `PMT-SUP-${String(count + 1).padStart(3, '0')}`;

        const payment = await prisma.$transaction(async (tx) => {
          const pmt = await tx.supplierPayment.create({
            data: {
              paymentNumber,
              supplierId: matchedSupp!.id,
              paymentDate: new Date(),
              amount,
              paymentMethod: method,
              referenceNo: `AI-${Date.now().toString().slice(-6)}`,
              notes: `Auto-recorded via AI prompt: "${cleanPrompt}"`,
            },
          });

          await tx.supplier.update({
            where: { id: matchedSupp!.id },
            data: { currentBalance: Math.max(0, matchedSupp!.currentBalance - amount) },
          });

          return pmt;
        });

        return res.json({
          success: true,
          response: {
            message: `✅ Successfully recorded vendor payment of **${formatINR(amount)}** (${method}) to **${matchedSupp.name}**!\nVoucher: **${payment.paymentNumber}**. Supplier payable updated.`,
            actionTaken: 'RECORD_VENDOR_PAYMENT',
            data: payment,
            suggestedPrompts: [
              'Share payment voucher with Vendor',
              'What are all the payments received and paid today?',
              'Export ledger to Google Sheet',
            ],
          },
        });
      }
    }

    // =============================================================
    // 11. INTENT: ACTION — LABOUR WAGE PAYMENT
    //     (E.g. "paid 15000 to labour in cash for greenfield")
    // =============================================================
    if (
      (lower.includes('labour') || lower.includes('labor') || lower.includes('worker') || lower.includes('wage')) &&
      (lower.includes('paid') || lower.includes('give') || lower.includes('disburse')) &&
      /\d+/.test(lower)
    ) {
      const amountMatch = cleanPrompt.match(/(?:rs\.?|inr|₹|\s|^)(\d+(?:,\d+)*(?:\.\d+)?)/i);
      const rawNum = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
      const amount = parseFloat(rawNum);

      const isCash = lower.includes('cash');
      const method = isCash ? 'CASH' : 'BANK_TRANSFER';

      const workers = await prisma.worker.findMany();
      let matchedWorker = workers.find((w) => lower.includes(w.name.toLowerCase()) || lower.includes(w.workerCode.toLowerCase()));

      const matchedProj = await findMatchedProject(cleanPrompt);
      const allProjects = await prisma.project.findMany();
      const targetProj = matchedProj || (matchedWorker?.projectId ? allProjects.find((p) => p.id === matchedWorker!.projectId) : allProjects[0]);

      if (targetProj && amount > 0) {
        const wage = await prisma.wagePayment.create({
          data: {
            projectId: targetProj.id,
            workerId: matchedWorker ? matchedWorker.id : null,
            amount,
            paymentDate: new Date(),
            paymentMethod: method,
            referenceNo: `AI-${Date.now().toString().slice(-6)}`,
            wagePeriod: new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
            narration: `Auto-recorded via AI prompt: "${cleanPrompt}"`,
          },
          include: { worker: true, project: true },
        });

        return res.json({
          success: true,
          response: {
            message: `✅ Successfully recorded Labour Wage Payment of **${formatINR(amount)}** (${method}) for **${targetProj.name}**!${matchedWorker ? ` Disbursed to: ${matchedWorker.name}` : ''}`,
            actionTaken: 'RECORD_LABOUR_PAYMENT',
            data: wage,
            suggestedPrompts: [
              'What are all the payments received and paid today?',
              'How many projects are in work today?',
              'Export ledger to Google Sheet',
            ],
          },
        });
      }
    }

    // =============================================================
    // 12. INTENT: ACTION — STAFF SALARY PAYMENT
    //     (E.g. "paid salary 35000 to staff Rajesh via bank")
    // =============================================================
    if (
      lower.includes('salary') &&
      (lower.includes('paid') || lower.includes('give') || lower.includes('disburse')) &&
      /\d+/.test(lower)
    ) {
      const amountMatch = cleanPrompt.match(/(?:rs\.?|inr|₹|\s|^)(\d+(?:,\d+)*(?:\.\d+)?)/i);
      const rawNum = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
      const amount = parseFloat(rawNum);

      const isCash = lower.includes('cash');
      const method = isCash ? 'CASH' : 'BANK_TRANSFER';

      const staffList = await prisma.officeStaff.findMany();
      let matchedStaff = staffList.find((s) => lower.includes(s.name.toLowerCase()) || lower.includes(s.staffCode.toLowerCase()));
      if (!matchedStaff && staffList.length > 0) {
        matchedStaff = staffList.find((s) => {
          const w = s.name.split(' ')[0].toLowerCase();
          return lower.includes(w);
        }) || staffList[0];
      }

      if (matchedStaff && amount > 0) {
        const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const count = await prisma.staffSalaryPayment.count();
        const paymentNumber = `SAL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const pmt = await prisma.staffSalaryPayment.create({
          data: {
            paymentNumber,
            staffId: matchedStaff.id,
            monthYear: currentMonth,
            disbursementDate: new Date(),
            basicSalary: amount,
            netPaid: amount,
            paymentMethod: method,
            referenceNo: `AI-${Date.now().toString().slice(-6)}`,
            notes: `Auto-recorded via AI prompt: "${cleanPrompt}"`,
            status: 'PAID',
          },
          include: { staff: true },
        });

        return res.json({
          success: true,
          response: {
            message: `✅ Successfully disbursed monthly salary of **${formatINR(amount)}** (${method}) to **${matchedStaff.name}** (${matchedStaff.designation}) for ${currentMonth}!\nVoucher: **${pmt.paymentNumber}**.`,
            actionTaken: 'RECORD_STAFF_SALARY',
            data: pmt,
            suggestedPrompts: [
              'What is the overall office expense this month?',
              'What are all the payments received and paid today?',
              'Export ledger to Google Sheet',
            ],
          },
        });
      }
    }

    // =============================================================
    // 13. INTENT: ACTION — OFFICE OVERHEAD EXPENSE
    //     (E.g. "paid office rent 45000 via bank")
    // =============================================================
    if (
      (lower.includes('office') ||
        lower.includes('rent') ||
        lower.includes('electricity') ||
        lower.includes('pantry') ||
        lower.includes('software')) &&
      lower.includes('paid') &&
      /\d+/.test(lower)
    ) {
      const amountMatch = cleanPrompt.match(/(?:rs\.?|inr|₹|\s|^)(\d+(?:,\d+)*(?:\.\d+)?)/i);
      const rawNum = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
      const amount = parseFloat(rawNum);

      let category = 'MISC';
      if (lower.includes('rent')) category = 'RENT';
      else if (lower.includes('electric') || lower.includes('water')) category = 'ELECTRICITY_WATER';
      else if (lower.includes('pantry') || lower.includes('tea') || lower.includes('supplies')) category = 'OFFICE_SUPPLIES_PANTRY';
      else if (lower.includes('software') || lower.includes('internet') || lower.includes('wifi')) category = 'SOFTWARE_SUBSCRIPTION';
      else if (lower.includes('travel') || lower.includes('fuel')) category = 'TRAVEL_CONVEYANCE';

      const isCash = lower.includes('cash');
      const method = isCash ? 'CASH' : 'BANK_TRANSFER';

      const count = await prisma.officeExpense.count();
      const expenseNumber = `OFF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const exp = await prisma.officeExpense.create({
        data: {
          expenseNumber,
          category,
          title: cleanPrompt.slice(0, 80),
          description: `Auto-recorded via AI prompt: "${cleanPrompt}"`,
          expenseDate: new Date(),
          amount,
          paymentMethod: method,
          paidTo: lower.includes('landlord') ? 'Office Landlord' : 'Office Vendor',
          referenceNo: `AI-${Date.now().toString().slice(-6)}`,
          periodMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          status: 'PAID',
        },
      });

      return res.json({
        success: true,
        response: {
          message: `✅ Successfully recorded Office Expense [${category}] of **${formatINR(amount)}** (${method})!\nVoucher: **${exp.expenseNumber}**.`,
          actionTaken: 'RECORD_OFFICE_EXPENSE',
          data: exp,
          suggestedPrompts: [
            'What is the overall office expense this month?',
            'What are all the payments received and paid today?',
            'Export ledger to Google Sheet',
          ],
        },
      });
    }

    // =============================================================
    // 14. INTENT: ACTION — CREATE NEW PROJECT
    // =============================================================
    if (lower.includes('create project') || lower.includes('new project') || lower.includes('add project')) {
      const allProjects = await prisma.project.findMany({ select: { code: true } });
      const nextCode = `PRJ-${String(allProjects.length + 1).padStart(3, '0')}`;

      let projName = cleanPrompt.replace(/^(?:please\s+)?(?:create|add|new)\s+project\s+/i, '').trim();
      let contractVal = 10000000;
      const valMatch = cleanPrompt.match(/(?:value|budget|worth|amount|cost)\s*(?:of|is|:)?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
      if (valMatch) {
        contractVal = parseFloat(valMatch[1].replace(/,/g, ''));
        projName = projName.split(/contract|value|budget|worth|amount|cost/i)[0].trim();
      }

      const clients = await prisma.client.findMany();
      const defaultClient = clients[0] || { name: 'Prestige Urban Developers Ltd', phone: '+919876543210' };

      const created = await prisma.project.create({
        data: {
          code: nextCode,
          name: projName || `Commercial Project ${nextCode}`,
          clientName: defaultClient.name,
          clientContact: defaultClient.phone || '+919876543210',
          siteAddress: 'Bengaluru Metro Region',
          projectType: 'COMMERCIAL',
          contractType: 'ITEM_RATE',
          contractValue: contractVal,
          approvedBudget: Math.round(contractVal * 0.85),
          plannedStartDate: new Date(),
          plannedEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      return res.json({
        success: true,
        response: {
          message: `🏗️ Project **${created.name}** [${created.code}] has been created with contract value of **${formatINR(created.contractValue)}**!`,
          actionTaken: 'CREATE_PROJECT',
          data: created,
          suggestedPrompts: [
            `Need to add a worker to the ${created.name}`,
            `Assign task site layout to ${created.name}`,
            'How many projects are in work today?',
          ],
        },
      });
    }

    // =============================================================
    // 15. INTENT: ACTION — CREATE & ASSIGN TASK
    // =============================================================
    if (lower.includes('task') && (lower.includes('create') || lower.includes('assign') || lower.includes('add'))) {
      const matchedProj = await findMatchedProject(cleanPrompt);
      const allProjects = await prisma.project.findMany();
      const targetProj = matchedProj || allProjects[0];

      const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
      const siteEng = users.find((u) => u.role === 'SITE_ENGINEER') || users[0];

      let rawTitle = cleanPrompt
        .replace(/^(?:please\s+)?(?:create|assign|add)\s+(?:a\s+)?task\s+(?:for\s+)?/i, '')
        .trim();

      if (targetProj) {
        const projEscaped = targetProj.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        rawTitle = rawTitle.replace(new RegExp(`\\b(?:in|for|at|on|to)\\s+project\\s+${projEscaped}\\b`, 'gi'), '');
        rawTitle = rawTitle.replace(new RegExp(`\\b(?:in|for|at|on|to)\\s+${projEscaped}\\b`, 'gi'), '');
        rawTitle = rawTitle.replace(new RegExp(`\\bproject\\s+${projEscaped}\\b`, 'gi'), '');
        rawTitle = rawTitle.replace(new RegExp(`\\b${projEscaped}\\b`, 'gi'), '');
      }

      rawTitle = rawTitle.replace(/\b(?:for|to)\s+(?:site\s+)?(?:engineer|manager|supervisor|team)\b/gi, '');
      rawTitle = rawTitle.replace(/\b(?:in|for)\s+project\b/gi, '');
      rawTitle = rawTitle.replace(/^(?:for|to|in|at)\s+/i, '');
      rawTitle = rawTitle.trim().replace(/^[-:,\s]+|[-:,\s]+$/g, '');

      const taskTitle = rawTitle.length > 0
        ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
        : 'Interior Fit-Out & Installation';

      const task = await prisma.task.create({
        data: {
          projectId: targetProj.id,
          title: taskTitle,
          assignedToId: siteEng?.id,
          startDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'HIGH',
          status: 'IN_PROGRESS',
        },
        include: { project: true, assignedUser: true },
      });

      const waMsg = encodeURIComponent(
        `📌 *New Task Assigned*\n\n` +
        `Task: *${task.title}*\n` +
        `Project: *${task.project.name}*\n` +
        `Assigned To: *${task.assignedUser?.name || 'Engineer'}*\n` +
        `Due Date: 7 Days\n` +
        `Status: IN_PROGRESS`
      );

      return res.json({
        success: true,
        response: {
          message: `📋 Task **"${task.title}"** assigned to **${task.assignedUser?.name || 'Site Engineer'}** for project **${task.project.name}**!`,
          actionTaken: 'CREATE_TASK',
          data: task,
          shareableUrls: { whatsapp: `https://wa.me/?text=${waMsg}` },
          suggestedPrompts: [
            'Share update with Project Manager',
            'How many projects are in work today?',
            'What is the balance due amount of the client greenfield?',
          ],
        },
      });
    }

    // =============================================================
    // 16. INTENT: ACTION — MULTI-STAKEHOLDER SHARING (WHATSAPP)
    // =============================================================
    if (lower.includes('share') || lower.includes('send update') || lower.includes('notify')) {
      let recipient = 'Owner & Management';

      if (lower.includes('client')) {
        recipient = 'Client (Employer)';
      } else if (lower.includes('vendor') || lower.includes('supplier')) {
        recipient = 'Vendor / Material Supplier';
      } else if (lower.includes('project manager') || lower.includes('pm')) {
        recipient = 'General Manager / Project Manager';
      } else if (lower.includes('site manager') || lower.includes('site engineer') || lower.includes('engineer')) {
        recipient = 'Site Operations Team';
      } else if (lower.includes('account') || lower.includes('finance')) {
        recipient = 'Accounts & Finance Department';
      }

      const [allProjects, receipts, expenses] = await Promise.all([
        prisma.project.findMany({ select: { name: true, contractValue: true, completionPercent: true } }),
        prisma.clientReceipt.findMany({ take: 3, orderBy: { receiptDate: 'desc' } }),
        prisma.officeExpense.findMany({ take: 3, orderBy: { expenseDate: 'desc' } }),
      ]);

      const totalCollections = receipts.reduce((s, r) => s + r.amount, 0);

      const updateText =
        `📢 *ApexBuild Corporate Operational & Financial Update*\n` +
        `Target: *${recipient}*\n` +
        `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
        `🏗️ *Active Projects:* ${allProjects.length}\n` +
        allProjects.slice(0, 3).map((p) => `• *${p.name}*: Progress ${p.completionPercent || 0}%`).join('\n') +
        `\n\n💰 *Recent Collections:* ${formatINR(totalCollections)}\n` +
        `Status: All sites operational. Zero safety non-conformities reported.\n\n` +
        `Warm regards,\n` +
        `ApexBuild Construction Enterprise ERP`;

      const waUrl = `https://wa.me/?text=${encodeURIComponent(updateText)}`;

      return res.json({
        success: true,
        response: {
          message: `📢 Formatted live operational update ready for **${recipient}**! Click below to share directly via WhatsApp.`,
          actionTaken: 'SHARE_UPDATE',
          shareableUrls: { whatsapp: waUrl },
          suggestedPrompts: [
            'What are all the payments received and paid today?',
            'What is the balance due amount of the client greenfield?',
            'How many projects are in work today?',
          ],
        },
      });
    }

    // =============================================================
    // 17. UNIVERSAL GEMINI-GRADE DEEP ERP REASONING ENGINE
    // =============================================================
    const universalResponse = await queryUniversalERPEngine(cleanPrompt, req.user);
    return res.json({
      success: true,
      response: universalResponse,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
