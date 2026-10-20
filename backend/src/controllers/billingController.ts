import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';

export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: { select: { invoices: true, receipts: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, clients });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const { code, name, companyName, contactPerson, phone, email, billingAddress, gstin, pan } = req.body;

    if (!code || !name || !phone || !billingAddress) {
      return res.status(400).json({ success: false, message: 'Code, name, phone, and billing address are required.' });
    }

    const client = await prisma.client.create({
      data: {
        code,
        name,
        companyName,
        contactPerson,
        phone,
        email,
        billingAddress,
        gstin,
        pan,
      },
    });

    await logAudit(req.user?.id, 'CREATE_CLIENT', 'CLIENT', client.id, { code, name }, req.ip);

    return res.status(201).json({ success: true, client });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientInvoices = async (req: Request, res: Response) => {
  try {
    const { projectId, clientId, status } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (clientId && typeof clientId === 'string') where.clientId = clientId;
    if (status && typeof status === 'string') where.status = status;

    const invoices = await prisma.clientInvoice.findMany({
      where,
      include: {
        client: true,
        project: { select: { id: true, code: true, name: true } },
        items: true,
        receipts: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    return res.json({
      success: true,
      invoices,
      summary: { totalBilled, totalCollected, totalOutstanding },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createClientInvoice = async (req: Request, res: Response) => {
  try {
    const {
      invoiceNumber,
      clientId,
      projectId,
      invoiceType,
      invoiceDate,
      dueDate,
      workPeriodStart,
      workPeriodEnd,
      subtotal,
      retentionPercent,
      tdsPercent,
      gstPercent,
      certificationNotes,
      items,
    } = req.body;

    if (!invoiceNumber || !projectId || !invoiceDate || !dueDate || subtotal === undefined) {
      return res.status(400).json({ success: false, message: 'Invoice number, project, dates, and subtotal are required.' });
    }

    const sub = Number(subtotal);
    const retPct = Number(retentionPercent) || 5.0;
    const tdsPct = Number(tdsPercent) || 2.0;
    const gstPct = Number(gstPercent) || 18.0;

    const retentionAmount = (sub * retPct) / 100;
    const tdsAmount = (sub * tdsPct) / 100;
    const gstAmount = (sub * gstPct) / 100;

    // Net payable by client = Subtotal + GST - Retention - TDS
    const netInvoiceAmount = sub + gstAmount - retentionAmount - tdsAmount;

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.clientInvoice.create({
        data: {
          invoiceNumber,
          clientId: clientId || null,
          projectId,
          invoiceType: invoiceType || 'RUNNING_ACCOUNT_RA',
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          workPeriodStart: workPeriodStart ? new Date(workPeriodStart) : null,
          workPeriodEnd: workPeriodEnd ? new Date(workPeriodEnd) : null,
          subtotal: sub,
          retentionPercent: retPct,
          retentionAmount,
          tdsPercent: tdsPct,
          tdsAmount,
          gstPercent: gstPct,
          gstAmount,
          netInvoiceAmount,
          paidAmount: 0,
          balanceDue: netInvoiceAmount,
          status: 'APPROVED',
          certificationNotes,
          items: {
            create: (items || []).map((it: any) => ({
              boqItemId: it.boqItemId || null,
              description: it.description,
              previousQty: Number(it.previousQty) || 0,
              currentQty: Number(it.currentQty) || 0,
              cumulativeQty: Number(it.cumulativeQty) || 0,
              unit: it.unit,
              rate: Number(it.rate) || 0,
              amount: Number(it.amount) || 0,
            })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    // Auto post balanced double entry:
    // Dr. Accounts Receivable: netInvoiceAmount
    // Dr. Retention Receivable: retentionAmount
    // Dr. TDS Receivable: tdsAmount
    // Cr. Construction Contract Revenue: sub
    // Cr. Output GST: gstAmount
    try {
      await postBalancedJournalEntry({
        entryDate: new Date(invoiceDate),
        referenceType: 'CLIENT_INVOICE',
        referenceId: invoice.id,
        narration: `Client RA Bill ${invoiceNumber} booked for works certified`,
        lines: [
          { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: netInvoiceAmount, credit: 0, projectId },
          { accountCode: COA.RETENTION_RECEIVABLE, debit: retentionAmount, credit: 0, projectId },
          { accountCode: COA.TDS_PAYABLE, debit: tdsAmount, credit: 0, projectId }, // TDS asset/receivable
          { accountCode: COA.CONTRACT_REVENUE, debit: 0, credit: sub, projectId },
          { accountCode: COA.OUTPUT_GST_18, debit: 0, credit: gstAmount, projectId },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for client invoice:', jeErr);
    }

    await logAudit(req.user?.id, 'CREATE_CLIENT_INVOICE', 'CLIENT_INVOICE', invoice.id, { invoiceNumber, netInvoiceAmount }, req.ip);

    return res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientReceipts = async (req: Request, res: Response) => {
  try {
    const { projectId, clientId } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (clientId && typeof clientId === 'string') where.clientId = clientId;

    const receipts = await prisma.clientReceipt.findMany({
      where,
      include: {
        client: true,
        project: { select: { code: true, name: true } },
        invoice: { select: { invoiceNumber: true, netInvoiceAmount: true } },
      },
      orderBy: { receiptDate: 'desc' },
    });

    return res.json({ success: true, receipts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordClientReceipt = async (req: Request, res: Response) => {
  try {
    const { clientId, projectId, invoiceId, receiptDate, amount, paymentMethod, referenceNo, notes } = req.body;

    const rcpAmount = Number(amount);
    if (!projectId || rcpAmount <= 0 || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Project, positive amount, and payment method are required.' });
    }

    const count = await prisma.clientReceipt.count();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const receipt = await prisma.$transaction(async (tx) => {
      const rcp = await tx.clientReceipt.create({
        data: {
          receiptNumber,
          clientId: clientId || null,
          projectId,
          invoiceId: invoiceId || null,
          receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
          amount: rcpAmount,
          paymentMethod,
          referenceNo,
          notes,
        },
      });

      // Update invoice if linked
      if (invoiceId) {
        const inv = await tx.clientInvoice.findUnique({ where: { id: invoiceId } });
        if (inv) {
          const newPaid = inv.paidAmount + rcpAmount;
          const newBal = Math.max(0, inv.netInvoiceAmount - newPaid);
          const newStatus = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

          await tx.clientInvoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newBal,
              status: newStatus,
            },
          });
        }
      }

      return rcp;
    });

    // Auto post balanced double entry:
    // Dr. HDFC Bank: rcpAmount
    // Cr. Accounts Receivable: rcpAmount
    try {
      await postBalancedJournalEntry({
        entryDate: receiptDate ? new Date(receiptDate) : new Date(),
        referenceType: 'CLIENT_RECEIPT',
        referenceId: receipt.id,
        narration: `Payment received from client ${receiptNumber}. Ref: ${referenceNo || 'Direct'}`,
        lines: [
          { accountCode: COA.HDFC_BANK, debit: rcpAmount, credit: 0, projectId },
          { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: 0, credit: rcpAmount, projectId },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for client receipt:', jeErr);
    }

    await logAudit(req.user?.id, 'CLIENT_RECEIPT', 'CLIENT_RECEIPT', receipt.id, { receiptNumber, amount: rcpAmount }, req.ip);

    return res.status(201).json({ success: true, receipt });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
