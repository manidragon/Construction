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
    let { code, name, companyName, contactPerson, phone, email, billingAddress, gstin, pan } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Client name is required.' });
    }

    // Automatically remove spaces from contact number
    const cleanedPhone = phone ? String(phone).replace(/\s+/g, '').trim() : '-';

    let finalCode = code ? String(code).trim() : '';
    if (!finalCode) {
      const allClients = await prisma.client.findMany({ select: { code: true } });
      let maxNum = 0;
      for (const c of allClients) {
        if (c.code && c.code.startsWith('CLI-')) {
          const num = parseInt(c.code.replace('CLI-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      finalCode = `CLI-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const client = await prisma.client.create({
      data: {
        code: finalCode,
        name: String(name).trim(),
        companyName: companyName ? String(companyName).trim() : null,
        contactPerson: contactPerson ? String(contactPerson).trim() : null,
        phone: cleanedPhone,
        email: email ? String(email).trim() : null,
        billingAddress: billingAddress ? String(billingAddress).trim() : 'Registered Office Address',
        gstin: gstin ? String(gstin).trim() : null,
        pan: pan ? String(pan).trim() : null,
      },
    });

    await logAudit(req.user?.id, 'CREATE_CLIENT', 'CLIENT', client.id, { code: finalCode, name }, req.ip);

    return res.status(201).json({ success: true, client });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'A client with this code already exists.' });
    }
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

/**
 * Automatically calculate the next sequential RA Bill number with project tag.
 * e.g. RA-01-SKYLINE, RA-02-Greenfield, RA-03-SKYLINE, etc.
 */
export const generateNextInvoiceNumber = async (projectId?: string) => {
  const allInvoices = await prisma.clientInvoice.findMany({
    select: { invoiceNumber: true, projectId: true },
  });

  let maxNum = 0;
  for (const inv of allInvoices) {
    if (!inv.invoiceNumber) continue;
    // Extract integer sequence e.g. from RA-01-..., RA-06-..., or any sequential digits
    const match = inv.invoiceNumber.match(/^RA-(\d+)/i) || inv.invoiceNumber.match(/RA[^\d]*(\d+)/i) || inv.invoiceNumber.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextSeq = maxNum + 1;
  const paddedSeq = String(nextSeq).padStart(2, '0');

  let projectTag = '';
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true },
    });

    if (project) {
      // Derive project tag directly from the selected project's name
      if (project.name) {
        const words = project.name.trim().split(/\s+/);
        let candidate = words[0];
        if (['THE', 'A', 'AN'].includes(candidate.toUpperCase()) && words.length > 1) {
          candidate = words[1];
        }
        const clean = candidate.replace(/[^a-zA-Z0-9]/g, '');
        if (clean.toUpperCase() === 'SKYLINE') {
          projectTag = 'SKYLINE';
        } else {
          projectTag = clean;
        }
      }

      // Fallback to project code if name is empty
      if (!projectTag && project.code) {
        projectTag = project.code.replace(/[^a-zA-Z0-9]/g, '');
      }
    }
  }

  const nextInvoiceNumber = projectTag ? `RA-${paddedSeq}-${projectTag}` : `RA-${paddedSeq}`;
  return { nextInvoiceNumber, nextSeq, projectTag };
};

export const getNextInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const result = await generateNextInvoiceNumber(projectId as string | undefined);
    return res.json({ success: true, ...result });
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
      quotationId,
      milestoneName,
      isFinalHandover,
    } = req.body;

    if (!projectId || !invoiceDate || !dueDate || subtotal === undefined) {
      return res.status(400).json({ success: false, message: 'Project, dates, and subtotal are required.' });
    }

    // MODULE 4: Block final invoice generation if any payment dues remain outstanding!
    const isFinal = invoiceType === 'FINAL' || Boolean(isFinalHandover);
    if (isFinal) {
      const priorInvoices = await prisma.clientInvoice.findMany({
        where: { projectId, status: { not: 'CANCELLED' } },
      });
      const outstandingPriorDues = priorInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
      if (outstandingPriorDues > 0) {
        return res.status(400).json({
          success: false,
          handoverBlocked: true,
          message: `Cannot generate Final Handover Invoice: Client has an outstanding balance of ₹${outstandingPriorDues.toLocaleString('en-IN')} across prior milestone bills. All previous dues must be cleared in full before generating the final invoice.`,
        });
      }
    }

    // Auto-generate invoice number if missing, or ensure uniqueness
    let finalInvoiceNumber = invoiceNumber ? String(invoiceNumber).trim() : '';
    if (!finalInvoiceNumber) {
      const generated = await generateNextInvoiceNumber(projectId);
      finalInvoiceNumber = generated.nextInvoiceNumber;
    } else {
      // Check for collision and auto-increment if duplicate
      const existing = await prisma.clientInvoice.findUnique({
        where: { invoiceNumber: finalInvoiceNumber },
      });
      if (existing) {
        const generated = await generateNextInvoiceNumber(projectId);
        finalInvoiceNumber = generated.nextInvoiceNumber;
      }
    }

    const sub = Number(subtotal);
    const retPct = retentionPercent !== undefined && retentionPercent !== null && retentionPercent !== '' ? Number(retentionPercent) : 0;
    const tdsPct = tdsPercent !== undefined && tdsPercent !== null && tdsPercent !== '' ? Number(tdsPercent) : 0;
    const gstPct = gstPercent !== undefined && gstPercent !== null && gstPercent !== '' ? Number(gstPercent) : 0;

    const retentionAmount = (sub * retPct) / 100;
    const tdsAmount = (sub * tdsPct) / 100;
    const gstAmount = (sub * gstPct) / 100;

    // Net payable by client = Subtotal + GST - Retention - TDS
    const netInvoiceAmount = sub + gstAmount - retentionAmount - tdsAmount;

    // Auto-resolve or create client record if needed
    let finalClientId = clientId && clientId !== '__PROJECT_CLIENT__' ? clientId : null;
    if (!finalClientId && projectId) {
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      if (proj && proj.clientName) {
        let matchedClient = await prisma.client.findFirst({
          where: {
            OR: [
              { name: proj.clientName },
              { companyName: proj.clientName },
            ],
          },
        });
        if (!matchedClient) {
          const allClients = await prisma.client.findMany({ select: { code: true } });
          let maxNum = 0;
          for (const c of allClients) {
            if (c.code && c.code.startsWith('CLI-')) {
              const num = parseInt(c.code.replace('CLI-', ''), 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          }
          const finalCode = `CLI-${String(maxNum + 1).padStart(3, '0')}`;
          matchedClient = await prisma.client.create({
            data: {
              code: finalCode,
              name: proj.clientName,
              companyName: proj.clientName,
              phone: proj.clientContact || '-',
              email: proj.clientEmail || null,
              billingAddress: proj.clientBillingAddr || 'Registered Office Address',
              gstin: proj.clientGstin || null,
            },
          });
        }
        finalClientId = matchedClient.id;
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.clientInvoice.create({
        data: {
          invoiceNumber: finalInvoiceNumber,
          clientId: finalClientId || null,
          projectId,
          quotationId: quotationId || null,
          milestoneName: milestoneName || null,
          isFinalHandover: Boolean(isFinalHandover),
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
        project: { select: { id: true, code: true, name: true, clientContact: true, clientName: true, clientEmail: true, clientBillingAddr: true } },
        invoice: { select: { id: true, invoiceNumber: true, netInvoiceAmount: true, paidAmount: true, balanceDue: true, subtotal: true } },
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

    // Auto-resolve projectId and clientId from invoiceId if not provided
    let finalProjectId = projectId ? String(projectId).trim() : '';
    let finalClientId = clientId ? String(clientId).trim() : '';

    if (invoiceId) {
      const inv = await prisma.clientInvoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, projectId: true, clientId: true },
      });
      if (inv) {
        if (!finalProjectId && inv.projectId) {
          finalProjectId = inv.projectId;
        }
        if (!finalClientId && inv.clientId) {
          finalClientId = inv.clientId;
        }
      }
    }

    // Fallback: If still no project, check if default project exists in DB
    if (!finalProjectId && !invoiceId) {
      const firstProj = await prisma.project.findFirst({ select: { id: true } });
      if (firstProj) finalProjectId = firstProj.id;
    }

    if (!finalProjectId || rcpAmount <= 0 || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Project, positive amount, and payment method are required.' });
    }

    // Auto-resolve client from project if still not set
    if (!finalClientId && finalProjectId) {
      const proj = await prisma.project.findUnique({ where: { id: finalProjectId } });
      if (proj?.clientName) {
        const matched = await prisma.client.findFirst({
          where: {
            OR: [{ name: proj.clientName }, { companyName: proj.clientName }],
          },
        });
        if (matched) finalClientId = matched.id;
      }
    }

    const count = await prisma.clientReceipt.count();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const receipt = await prisma.$transaction(async (tx) => {
      const rcp = await tx.clientReceipt.create({
        data: {
          receiptNumber,
          clientId: finalClientId || null,
          projectId: finalProjectId,
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
    // Dr. Cash or HDFC Bank: rcpAmount
    // Cr. Accounts Receivable: rcpAmount
    try {
      const debitAccount = paymentMethod === 'CASH' ? COA.CASH : COA.HDFC_BANK;
      await postBalancedJournalEntry({
        entryDate: receiptDate ? new Date(receiptDate) : new Date(),
        referenceType: 'CLIENT_RECEIPT',
        referenceId: receipt.id,
        narration: `Payment received from client ${receiptNumber} via ${paymentMethod}. Ref: ${referenceNo || 'Direct'}`,
        lines: [
          { accountCode: debitAccount, debit: rcpAmount, credit: 0, projectId },
          { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: 0, credit: rcpAmount, projectId },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for client receipt:', jeErr);
    }

    await logAudit(req.user?.id, 'CLIENT_RECEIPT', 'CLIENT_RECEIPT', receipt.id, { receiptNumber, amount: rcpAmount }, req.ip);

    // Fetch full receipt details with relations for instant client sharing
    const fullReceipt = await prisma.clientReceipt.findUnique({
      where: { id: receipt.id },
      include: {
        client: true,
        project: { select: { id: true, code: true, name: true, clientContact: true, clientName: true, clientEmail: true, clientBillingAddr: true } },
        invoice: { select: { id: true, invoiceNumber: true, netInvoiceAmount: true, paidAmount: true, balanceDue: true, subtotal: true } },
      },
    });

    return res.status(201).json({ success: true, receipt: fullReceipt || receipt });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { code, name, companyName, contactPerson, phone, email, billingAddress, gstin, pan } = req.body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Automatically remove spaces from contact number
    const cleanedPhone = phone !== undefined 
      ? String(phone).replace(/\s+/g, '').trim() 
      : existing.phone.replace(/\s+/g, '');

    const updated = await prisma.client.update({
      where: { id },
      data: {
        code: code !== undefined ? String(code).trim() : existing.code,
        name: name !== undefined ? String(name).trim() : existing.name,
        companyName: companyName !== undefined ? (companyName ? String(companyName).trim() : null) : existing.companyName,
        contactPerson: contactPerson !== undefined ? (contactPerson ? String(contactPerson).trim() : null) : existing.contactPerson,
        phone: cleanedPhone,
        email: email !== undefined ? (email ? String(email).trim() : null) : existing.email,
        billingAddress: billingAddress !== undefined ? String(billingAddress).trim() : existing.billingAddress,
        gstin: gstin !== undefined ? (gstin ? String(gstin).trim() : null) : existing.gstin,
        pan: pan !== undefined ? (pan ? String(pan).trim() : null) : existing.pan,
      },
    });

    // Synchronize client changes to all linked/matching projects so WhatsApp and reports use the updated number immediately!
    const namesToMatch = [existing.name, updated.name];
    if (existing.companyName) namesToMatch.push(existing.companyName);
    if (updated.companyName) namesToMatch.push(updated.companyName);

    // Also find any projects linked via client invoices
    const linkedInvoices = await prisma.clientInvoice.findMany({
      where: { clientId: id },
      select: { projectId: true },
      distinct: ['projectId'],
    });
    const linkedProjectIds = linkedInvoices.map((inv) => inv.projectId);

    await prisma.project.updateMany({
      where: {
        OR: [
          { clientName: { in: namesToMatch } },
          ...(linkedProjectIds.length > 0 ? [{ id: { in: linkedProjectIds } }] : []),
        ],
      },
      data: {
        clientName: updated.name,
        clientContact: cleanedPhone,
        ...(updated.email ? { clientEmail: updated.email } : {}),
        ...(updated.billingAddress ? { clientBillingAddr: updated.billingAddress } : {}),
        ...(updated.gstin ? { clientGstin: updated.gstin } : {}),
      },
    });

    await logAudit(req.user?.id, 'UPDATE_CLIENT', 'CLIENT', id, { name: updated.name, phone: cleanedPhone }, req.ip);

    return res.json({ success: true, client: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true, receipts: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    if (existing._count.invoices > 0 || existing._count.receipts > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete client with active records (${existing._count.invoices} invoices, ${existing._count.receipts} receipts).`,
      });
    }

    await prisma.client.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_CLIENT', 'CLIENT', id, { name: existing.name }, req.ip);

    return res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClientInvoice = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      invoiceNumber,
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
      status,
    } = req.body;

    const existing = await prisma.clientInvoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client invoice not found.' });
    }

    const sub = subtotal !== undefined ? Number(subtotal) : existing.subtotal;
    const retPct = retentionPercent !== undefined ? Number(retentionPercent) : existing.retentionPercent;
    const tdsPct = tdsPercent !== undefined ? Number(tdsPercent) : existing.tdsPercent;
    const gstPct = gstPercent !== undefined ? Number(gstPercent) : existing.gstPercent;

    const retentionAmount = (sub * retPct) / 100;
    const tdsAmount = (sub * tdsPct) / 100;
    const gstAmount = (sub * gstPct) / 100;
    const netInvoiceAmount = sub + gstAmount - retentionAmount - tdsAmount;
    const balanceDue = Math.max(0, netInvoiceAmount - existing.paidAmount);

    const updated = await prisma.clientInvoice.update({
      where: { id },
      data: {
        invoiceNumber: invoiceNumber || existing.invoiceNumber,
        invoiceType: invoiceType || existing.invoiceType,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : existing.invoiceDate,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        workPeriodStart: workPeriodStart ? new Date(workPeriodStart) : existing.workPeriodStart,
        workPeriodEnd: workPeriodEnd ? new Date(workPeriodEnd) : existing.workPeriodEnd,
        subtotal: sub,
        retentionPercent: retPct,
        retentionAmount,
        tdsPercent: tdsPct,
        tdsAmount,
        gstPercent: gstPct,
        gstAmount,
        netInvoiceAmount,
        balanceDue,
        certificationNotes: certificationNotes !== undefined ? certificationNotes : existing.certificationNotes,
        status: status || existing.status,
      },
      include: {
        client: true,
        project: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_CLIENT_INVOICE', 'CLIENT_INVOICE', id, { invoiceNumber: updated.invoiceNumber }, req.ip);

    return res.json({ success: true, invoice: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClientInvoice = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.clientInvoice.findUnique({
      where: { id },
      include: { receipts: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client invoice not found.' });
    }

    if (existing.receipts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete invoice that has ${existing.receipts.length} payment receipts linked. Delete receipts first.`,
      });
    }

    // Delete linked journal entries
    await prisma.journalEntry.deleteMany({
      where: { referenceType: 'CLIENT_INVOICE', referenceId: id },
    });

    // Invoice items cascade delete
    await prisma.clientInvoice.delete({ where: { id } });

    await logAudit(req.user?.id, 'DELETE_CLIENT_INVOICE', 'CLIENT_INVOICE', id, { invoiceNumber: existing.invoiceNumber }, req.ip);

    return res.json({ success: true, message: 'Client invoice deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClientReceipt = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { receiptDate, amount, paymentMethod, referenceNo, notes } = req.body;

    const existing = await prisma.clientReceipt.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client receipt not found.' });
    }

    const newAmount = amount !== undefined ? Number(amount) : existing.amount;
    const diff = newAmount - existing.amount;

    const updated = await prisma.$transaction(async (tx) => {
      const rcp = await tx.clientReceipt.update({
        where: { id },
        data: {
          receiptDate: receiptDate ? new Date(receiptDate) : existing.receiptDate,
          amount: newAmount,
          paymentMethod: paymentMethod || existing.paymentMethod,
          referenceNo: referenceNo !== undefined ? referenceNo : existing.referenceNo,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });

      // Update linked invoice if any
      if (existing.invoiceId && diff !== 0) {
        const inv = await tx.clientInvoice.findUnique({ where: { id: existing.invoiceId } });
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount + diff);
          const newBal = Math.max(0, inv.netInvoiceAmount - newPaid);
          const newStatus = newBal === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'APPROVED';

          await tx.clientInvoice.update({
            where: { id: existing.invoiceId },
            data: { paidAmount: newPaid, balanceDue: newBal, status: newStatus },
          });
        }
      }

      return rcp;
    });

    await logAudit(req.user?.id, 'UPDATE_CLIENT_RECEIPT', 'CLIENT_RECEIPT', id, { receiptNumber: updated.receiptNumber, amount: newAmount }, req.ip);

    return res.json({ success: true, receipt: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClientReceipt = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.clientReceipt.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client receipt not found.' });
    }

    await prisma.$transaction(async (tx) => {
      if (existing.invoiceId) {
        const inv = await tx.clientInvoice.findUnique({ where: { id: existing.invoiceId } });
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount - existing.amount);
          const newBal = Math.max(0, inv.netInvoiceAmount - newPaid);
          const newStatus = newPaid === 0 ? 'APPROVED' : 'PARTIALLY_PAID';

          await tx.clientInvoice.update({
            where: { id: existing.invoiceId },
            data: { paidAmount: newPaid, balanceDue: newBal, status: newStatus },
          });
        }
      }

      // Delete journal entries
      await tx.journalEntry.deleteMany({
        where: { referenceType: 'CLIENT_RECEIPT', referenceId: id },
      });

      await tx.clientReceipt.delete({ where: { id } });
    });

    await logAudit(req.user?.id, 'DELETE_CLIENT_RECEIPT', 'CLIENT_RECEIPT', id, { receiptNumber: existing.receiptNumber }, req.ip);

    return res.json({ success: true, message: 'Client receipt deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
