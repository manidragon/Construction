import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';

export const getPettyCashAccounts = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;

    const accounts = await prisma.pettyCashAccount.findMany({
      where,
      include: {
        project: { select: { code: true, name: true } },
        site: { select: { code: true, name: true } },
        custodian: { select: { id: true, name: true, phone: true } },
        transactions: {
          orderBy: { txnDate: 'desc' },
          take: 15,
        },
      },
    });

    return res.json({ success: true, accounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createPettyCashAccount = async (req: Request, res: Response) => {
  try {
    const { name, projectId, siteId, custodianUserId, openingBalance, minFloatThreshold } = req.body;

    const bal = Number(openingBalance) || 0;
    const account = await prisma.pettyCashAccount.create({
      data: {
        name,
        projectId,
        siteId: siteId || null,
        custodianUserId,
        openingBalance: bal,
        currentBalance: bal,
        minFloatThreshold: Number(minFloatThreshold) || 5000,
      },
    });

    return res.status(201).json({ success: true, account });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordPettyCashTxn = async (req: Request, res: Response) => {
  try {
    const { pettyCashAccountId, txnType, amount, recipient, voucherNo, description, receiptUrl } = req.body;

    const txnAmount = Number(amount);
    if (!pettyCashAccountId || txnAmount <= 0 || !txnType || !description) {
      return res.status(400).json({ success: false, message: 'Account, positive amount, txnType, and description are required.' });
    }

    const account = await prisma.pettyCashAccount.findUnique({ where: { id: pettyCashAccountId } });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Petty cash account not found.' });
    }

    if (txnType === 'EXPENSE' && account.currentBalance < txnAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Petty Cash Float! Available: ₹${account.currentBalance}, Required: ₹${txnAmount}`,
      });
    }

    const balanceAfter = txnType === 'TOP_UP' ? account.currentBalance + txnAmount : account.currentBalance - txnAmount;

    const txn = await prisma.$transaction(async (tx) => {
      const createdTxn = await tx.pettyCashTransaction.create({
        data: {
          pettyCashAccountId,
          txnDate: new Date(),
          txnType,
          amount: txnAmount,
          balanceAfter,
          recipient,
          voucherNo,
          description,
          receiptUrl,
          approvedById: req.user?.id,
        },
      });

      await tx.pettyCashAccount.update({
        where: { id: pettyCashAccountId },
        data: { currentBalance: balanceAfter },
      });

      return createdTxn;
    });

    await logAudit(req.user?.id, `PETTY_CASH_${txnType}`, 'PETTY_CASH_TRANSACTION', txn.id, { amount: txnAmount, balanceAfter }, req.ip);

    return res.status(201).json({ success: true, transaction: txn });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { projectId, category, status } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (category && typeof category === 'string') where.category = category;
    if (status && typeof status === 'string') where.status = status;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        project: { select: { code: true, name: true } },
        site: { select: { code: true, name: true } },
        createdBy: { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    return res.json({ success: true, expenses, totalAmount });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      siteId,
      category,
      description,
      amountBeforeTax,
      taxAmount,
      paymentMethod,
      paidTo,
      invoiceReceiptNo,
      receiptUrl,
      expenseDate,
    } = req.body;

    const sub = Number(amountBeforeTax);
    const tax = Number(taxAmount) || 0;
    const total = sub + tax;

    if (!description || !paidTo || sub <= 0 || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Description, paidTo, valid amount, and payment method are required.' });
    }

    const count = await prisma.expense.count();
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        projectId: projectId || null,
        siteId: siteId || null,
        category: category || 'MISC',
        description,
        amountBeforeTax: sub,
        taxAmount: tax,
        totalAmount: total,
        paymentMethod,
        paidTo,
        invoiceReceiptNo,
        receiptUrl,
        isPaid: true,
        status: 'APPROVED',
        createdById: req.user!.id,
        approvedById: req.user?.id,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
    });

    // Auto post balanced journal entry:
    // Dr. Direct Project Expense / Overhead: sub
    // Dr. Input GST: tax
    // Cr. Bank / Cash / Petty Cash: total
    try {
      let costAccount = COA.SITE_OVERHEAD_EXPENSE;
      if (category === 'FUEL' || category === 'TRANSPORT') costAccount = COA.SITE_TRANSPORT_FUEL;
      if (category === 'EQUIPMENT_RENTAL') costAccount = COA.EQUIPMENT_HIRE_COST;

      let paymentAccount = COA.HDFC_BANK;
      if (paymentMethod === 'CASH') paymentAccount = COA.CASH;
      if (paymentMethod === 'PETTY_CASH') paymentAccount = COA.PETTY_CASH;

      const lines = [
        { accountCode: costAccount, debit: sub, credit: 0, projectId },
        { accountCode: paymentAccount, debit: 0, credit: total, projectId },
      ];
      if (tax > 0) {
        lines.splice(1, 0, { accountCode: COA.INPUT_GST_18, debit: tax, credit: 0, projectId });
      }

      await postBalancedJournalEntry({
        entryDate: expenseDate ? new Date(expenseDate) : new Date(),
        referenceType: 'EXPENSE',
        referenceId: expense.id,
        narration: `Direct expense ${expenseNumber}: ${description} paid to ${paidTo}`,
        lines,
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for direct expense:', jeErr);
    }

    await logAudit(req.user?.id, 'CREATE_EXPENSE', 'EXPENSE', expense.id, { expenseNumber, total }, req.ip);

    return res.status(201).json({ success: true, expense });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
