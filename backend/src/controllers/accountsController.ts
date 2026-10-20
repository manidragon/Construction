import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { postBalancedJournalEntry, JournalLineInput } from '../utils/accounting';
import { logAudit } from '../middleware/auth';

export const getChartOfAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
    });

    return res.json({ success: true, accounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const { referenceType, projectId } = req.query;

    const where: any = {};
    if (referenceType && typeof referenceType === 'string') where.referenceType = referenceType;

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true,
            project: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { entryDate: 'desc' },
      take: 100,
    });

    return res.json({ success: true, entries });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createManualJournal = async (req: Request, res: Response) => {
  try {
    const { entryDate, narration, lines } = req.body;

    if (!narration || !lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ success: false, message: 'Narration and at least 2 balanced journal lines are required.' });
    }

    const journal = await postBalancedJournalEntry({
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      referenceType: 'MANUAL',
      narration,
      lines: lines as JournalLineInput[],
      createdById: req.user?.id,
    });

    await logAudit(req.user?.id, 'CREATE_MANUAL_JOURNAL', 'JOURNAL_ENTRY', journal.id, { narration }, req.ip);

    return res.status(201).json({ success: true, journal });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getTrialBalance = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: true,
      },
      orderBy: { code: 'asc' },
    });

    let grandDebit = 0;
    let grandCredit = 0;

    const rows = accounts.map((acc) => {
      const debitTotal = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
      const creditTotal = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);

      let debit = 0;
      let credit = 0;

      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        const net = debitTotal - creditTotal;
        if (net >= 0) debit = net;
        else credit = Math.abs(net);
      } else {
        const net = creditTotal - debitTotal;
        if (net >= 0) credit = net;
        else debit = Math.abs(net);
      }

      grandDebit += debit;
      grandCredit += credit;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        debit,
        credit,
      };
    });

    return res.json({
      success: true,
      trialBalance: rows,
      totals: {
        debit: grandDebit,
        credit: grandCredit,
        difference: Math.abs(grandDebit - grandCredit),
        isBalanced: Math.abs(grandDebit - grandCredit) < 1,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfitAndLoss = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { type: { in: ['REVENUE', 'EXPENSE'] } },
      include: { journalLines: true },
    });

    let totalRevenue = 0;
    let directCosts = 0;
    let overheadExpenses = 0;

    const revenueItems: any[] = [];
    const directCostItems: any[] = [];
    const overheadItems: any[] = [];

    for (const acc of accounts) {
      const debitTotal = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
      const creditTotal = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);

      if (acc.type === 'REVENUE') {
        const amount = creditTotal - debitTotal;
        totalRevenue += amount;
        revenueItems.push({ code: acc.code, name: acc.name, amount });
      } else if (acc.type === 'EXPENSE') {
        const amount = debitTotal - creditTotal;
        if (acc.subType === 'DIRECT_COST') {
          directCosts += amount;
          directCostItems.push({ code: acc.code, name: acc.name, amount });
        } else {
          overheadExpenses += amount;
          overheadItems.push({ code: acc.code, name: acc.name, amount });
        }
      }
    }

    const grossProfit = totalRevenue - directCosts;
    const netProfit = grossProfit - overheadExpenses;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return res.json({
      success: true,
      pnl: {
        revenue: { items: revenueItems, total: totalRevenue },
        directCosts: { items: directCostItems, total: directCosts },
        grossProfit,
        grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
        overheads: { items: overheadItems, total: overheadExpenses },
        netProfit,
        netMarginPercent: Math.round(netMarginPercent * 10) / 10,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBalanceSheet = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
      include: { journalLines: true },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    for (const acc of accounts) {
      const debitTotal = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
      const creditTotal = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);

      if (acc.type === 'ASSET') {
        const amount = debitTotal - creditTotal;
        totalAssets += amount;
        assets.push({ code: acc.code, name: acc.name, subType: acc.subType, amount });
      } else if (acc.type === 'LIABILITY') {
        const amount = creditTotal - debitTotal;
        totalLiabilities += amount;
        liabilities.push({ code: acc.code, name: acc.name, subType: acc.subType, amount });
      } else if (acc.type === 'EQUITY') {
        const amount = creditTotal - debitTotal;
        totalEquity += amount;
        equity.push({ code: acc.code, name: acc.name, subType: acc.subType, amount });
      }
    }

    return res.json({
      success: true,
      balanceSheet: {
        assets: { items: assets, total: totalAssets },
        liabilities: { items: liabilities, total: totalLiabilities },
        equity: { items: equity, total: totalEquity },
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAgingReports = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // Accounts Receivable (Client Invoices)
    const openInvoices = await prisma.clientInvoice.findMany({
      where: { balanceDue: { gt: 0 } },
      include: { client: true, project: { select: { code: true, name: true } } },
    });

    const arAging = { current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0 };
    const arItems = openInvoices.map((inv) => {
      const diffTime = Math.abs(now.getTime() - new Date(inv.dueDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const bal = inv.balanceDue;

      arAging.total += bal;
      if (new Date(inv.dueDate) > now) arAging.current += bal;
      else if (diffDays <= 30) arAging.days30 += bal;
      else if (diffDays <= 60) arAging.days60 += bal;
      else arAging.days90Plus += bal;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client?.name || 'Prestige Urban',
        projectName: inv.project.name,
        dueDate: inv.dueDate,
        daysOverdue: new Date(inv.dueDate) < now ? diffDays : 0,
        balanceDue: bal,
      };
    });

    // Accounts Payable (Supplier Invoices)
    const openSupplierInvoices = await prisma.supplierInvoice.findMany({
      where: { balanceDue: { gt: 0 } },
      include: { supplier: true },
    });

    const apAging = { current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0 };
    const apItems = openSupplierInvoices.map((inv) => {
      const diffTime = Math.abs(now.getTime() - new Date(inv.dueDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const bal = inv.balanceDue;

      apAging.total += bal;
      if (new Date(inv.dueDate) > now) apAging.current += bal;
      else if (diffDays <= 30) apAging.days30 += bal;
      else if (diffDays <= 60) apAging.days60 += bal;
      else apAging.days90Plus += bal;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplierName: inv.supplier.name,
        dueDate: inv.dueDate,
        daysOverdue: new Date(inv.dueDate) < now ? diffDays : 0,
        balanceDue: bal,
      };
    });

    return res.json({
      success: true,
      receivables: { agingSummary: arAging, items: arItems },
      payables: { agingSummary: apAging, items: apItems },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
