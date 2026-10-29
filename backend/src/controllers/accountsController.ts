import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { postBalancedJournalEntry, JournalLineInput, ensureStandardCOA } from '../utils/accounting';
import { logAudit } from '../middleware/auth';
import { getTenantFilter } from '../utils/tenant';

/**
 * Standard Indian Chart of Accounts (COA) Groups aligned with Tally ERP 9 / Tally Prime & Schedule III
 */
export function getTallyAccountMetadata(code: string, type: string, subType: string) {
  switch (code) {
    case '1010':
    case '1020':
      return { tallyGroup: 'Cash-in-hand', schedule3Category: 'Current Assets > Cash & Cash Equivalents', normalBalance: 'DEBIT' };
    case '1030':
    case '1040':
      return { tallyGroup: 'Bank Accounts', schedule3Category: 'Current Assets > Bank Balances', normalBalance: 'DEBIT' };
    case '1100':
      return { tallyGroup: 'Sundry Debtors', schedule3Category: 'Current Assets > Trade Receivables', normalBalance: 'DEBIT' };
    case '1150':
      return { tallyGroup: 'Current Assets', schedule3Category: 'Current Assets > Other Financial Assets (Retention)', normalBalance: 'DEBIT' };
    case '1200':
      return { tallyGroup: 'Stock-in-hand', schedule3Category: 'Current Assets > Inventories', normalBalance: 'DEBIT' };
    case '1300':
    case '1310':
    case '1320':
    case '1330':
      return { tallyGroup: 'Duties & Taxes', schedule3Category: 'Current Assets > Input Tax Credit (GST ITC)', normalBalance: 'DEBIT' };
    case '1500':
      return { tallyGroup: 'Fixed Assets', schedule3Category: 'Non-Current Assets > Property, Plant & Equipment', normalBalance: 'DEBIT' };
    case '2010':
      return { tallyGroup: 'Sundry Creditors', schedule3Category: 'Current Liabilities > Trade Payables (Vendors)', normalBalance: 'CREDIT' };
    case '2020':
      return { tallyGroup: 'Provisions', schedule3Category: 'Current Liabilities > Short-Term Provisions (Labour Wages)', normalBalance: 'CREDIT' };
    case '2030':
      return { tallyGroup: 'Sundry Creditors', schedule3Category: 'Current Liabilities > Trade Payables (Subcontractors)', normalBalance: 'CREDIT' };
    case '2050':
      return { tallyGroup: 'Current Liabilities', schedule3Category: 'Current Liabilities > Other Liabilities (Retention Withheld)', normalBalance: 'CREDIT' };
    case '2200':
    case '2210':
    case '2220':
    case '2230':
      return { tallyGroup: 'Duties & Taxes', schedule3Category: 'Current Liabilities > Output GST Liability', normalBalance: 'CREDIT' };
    case '2250':
    case '2260':
    case '2270':
      return { tallyGroup: 'Duties & Taxes', schedule3Category: 'Current Liabilities > Statutory Dues (TDS / Labour Cess)', normalBalance: 'CREDIT' };
    case '3010':
      return { tallyGroup: 'Capital Account', schedule3Category: 'Shareholders Funds > Share Capital', normalBalance: 'CREDIT' };
    case '3020':
      return { tallyGroup: 'Reserves & Surplus', schedule3Category: 'Shareholders Funds > Reserves & Surplus', normalBalance: 'CREDIT' };
    case '4010':
      return { tallyGroup: 'Direct Incomes', schedule3Category: 'Income > Revenue from Operations (Certified RA Bills)', normalBalance: 'CREDIT' };
    case '5010':
      return { tallyGroup: 'Direct Expenses', schedule3Category: 'Expenses > Cost of Materials Consumed', normalBalance: 'DEBIT' };
    case '5020':
      return { tallyGroup: 'Direct Expenses', schedule3Category: 'Expenses > Employee Benefit Expenses (Direct Labour Wages)', normalBalance: 'DEBIT' };
    case '5030':
      return { tallyGroup: 'Direct Expenses', schedule3Category: 'Expenses > Operating Costs (Plant & Equipment Hire)', normalBalance: 'DEBIT' };
    case '5040':
      return { tallyGroup: 'Direct Expenses', schedule3Category: 'Expenses > Subcontracting & Civil Works', normalBalance: 'DEBIT' };
    case '5110':
    case '5120':
      return { tallyGroup: 'Direct Expenses', schedule3Category: 'Expenses > Site Overhead, Fuel & Safety Expenses', normalBalance: 'DEBIT' };
    case '5200':
      return { tallyGroup: 'Indirect Expenses', schedule3Category: 'Expenses > Administrative & Head Office Overheads', normalBalance: 'DEBIT' };
    default:
      if (type === 'ASSET') return { tallyGroup: 'Current Assets', schedule3Category: 'Current Assets > Other Assets', normalBalance: 'DEBIT' };
      if (type === 'LIABILITY') return { tallyGroup: 'Current Liabilities', schedule3Category: 'Current Liabilities > Other Liabilities', normalBalance: 'CREDIT' };
      if (type === 'EQUITY') return { tallyGroup: 'Capital Account', schedule3Category: 'Shareholders Funds', normalBalance: 'CREDIT' };
      if (type === 'REVENUE') return { tallyGroup: 'Direct Incomes', schedule3Category: 'Income > Other Operating Revenue', normalBalance: 'CREDIT' };
      return { tallyGroup: subType === 'DIRECT_COST' ? 'Direct Expenses' : 'Indirect Expenses', schedule3Category: 'Expenses > Other Expenses', normalBalance: 'DEBIT' };
  }
}

/**
 * Maps system transaction reference types to standard Tally Voucher Types & shortcut keys
 */
export function getTallyVoucherDetails(referenceType: string, narration: string = '', lines: any[] = []) {
  switch (referenceType) {
    case 'WAGE_PAYMENT':
    case 'SUPPLIER_PAYMENT':
    case 'SALARY_PAYMENT':
      return { voucherType: 'Payment', shortcut: 'F5', category: 'BANK_CASH_OUTFLOW' };
    case 'CLIENT_RECEIPT':
      return { voucherType: 'Receipt', shortcut: 'F6', category: 'BANK_CASH_INFLOW' };
    case 'CLIENT_INVOICE':
      return { voucherType: 'Sales', shortcut: 'F8', category: 'TAX_INVOICE_BILLING' };
    case 'SUPPLIER_INVOICE':
      return { voucherType: 'Purchase', shortcut: 'F9', category: 'VENDOR_INVOICE_BILLING' };
    case 'EXPENSE':
    case 'OFFICE_EXPENSE': {
      const hasBankOrCash = lines.some((l) => ['1010', '1020', '1030', '1040'].includes(l.account?.code));
      return hasBankOrCash
        ? { voucherType: 'Payment', shortcut: 'F5', category: 'DIRECT_DISBURSEMENT' }
        : { voucherType: 'Journal', shortcut: 'F7', category: 'EXPENSE_ACCRUAL' };
    }
    case 'CONTRA':
      return { voucherType: 'Contra', shortcut: 'F4', category: 'INTERNAL_FUND_TRANSFER' };
    case 'MANUAL':
    case 'INVENTORY_ISSUE':
    default: {
      const allCashOrBank = lines.length >= 2 && lines.every((l) => ['1010', '1020', '1030', '1040'].includes(l.account?.code));
      if (allCashOrBank) {
        return { voucherType: 'Contra', shortcut: 'F4', category: 'INTERNAL_FUND_TRANSFER' };
      }
      return { voucherType: 'Journal', shortcut: 'F7', category: 'NON_CASH_ADJUSTMENT' };
    }
  }
}

export const getChartOfAccounts = async (req: Request, res: Response) => {
  try {
    if (req.user?.companyId) {
      await ensureStandardCOA(req.user.companyId);
    }

    const rawAccounts = await prisma.account.findMany({
      where: getTenantFilter(req),
      orderBy: { code: 'asc' },
    });

    const accounts = rawAccounts.map((acc) => {
      const meta = getTallyAccountMetadata(acc.code, acc.type, acc.subType);
      return {
        ...acc,
        ...meta,
      };
    });

    // Indian Statutory GST, TDS and Liquidity Summary
    const gstInputAcc = accounts.find((a) => a.code === '1300');
    const gstOutputAcc = accounts.find((a) => a.code === '2200');
    const tdsAcc = accounts.find((a) => a.code === '2250');
    const sundryDebtorsAcc = accounts.find((a) => a.code === '1100');
    const sundryCreditorsAcc = accounts.find((a) => a.code === '2010');
    const subconCreditorsAcc = accounts.find((a) => a.code === '2030');
    const clientRetentionAcc = accounts.find((a) => a.code === '1150');
    const withheldRetentionAcc = accounts.find((a) => a.code === '2050');

    const cashAndBankTotal = accounts
      .filter((a) => ['1010', '1020', '1030', '1040'].includes(a.code))
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const inputGst = gstInputAcc?.currentBalance || 0;
    const outputGst = gstOutputAcc?.currentBalance || 0;
    const netGstLiability = outputGst - inputGst;

    const indianStatutory = {
      gst: {
        inputGstCredit: inputGst,
        outputGstLiability: outputGst,
        netGstPayable: netGstLiability > 0 ? netGstLiability : 0,
        netGstRefundable: netGstLiability < 0 ? Math.abs(netGstLiability) : 0,
        itcEligible: true,
      },
      tds: {
        tdsPayable: tdsAcc?.currentBalance || 0,
        section: '194C / 194J',
      },
      retention: {
        clientRetentionReceivable: clientRetentionAcc?.currentBalance || 0,
        contractorRetentionPayable: withheldRetentionAcc?.currentBalance || 0,
      },
      workingCapital: {
        sundryDebtors: sundryDebtorsAcc?.currentBalance || 0,
        sundryCreditors: (sundryCreditorsAcc?.currentBalance || 0) + (subconCreditorsAcc?.currentBalance || 0),
        totalLiquidFunds: cashAndBankTotal,
      },
    };

    return res.json({ success: true, accounts, indianStatutory });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const { referenceType, voucherType, projectId, startDate, endDate, search, limit } = req.query;

    const where: any = { ...getTenantFilter(req) };

    // Filter by standard Tally Voucher Type (Payment, Receipt, Sales, Purchase, Contra, Journal)
    if (voucherType && typeof voucherType === 'string' && voucherType !== 'ALL') {
      const vUpper = voucherType.toUpperCase();
      if (vUpper === 'PAYMENT' || vUpper === 'F5') {
        where.referenceType = { in: ['WAGE_PAYMENT', 'SUPPLIER_PAYMENT', 'SALARY_PAYMENT', 'EXPENSE', 'OFFICE_EXPENSE'] };
      } else if (vUpper === 'RECEIPT' || vUpper === 'F6') {
        where.referenceType = 'CLIENT_RECEIPT';
      } else if (vUpper === 'SALES' || vUpper === 'F8') {
        where.referenceType = 'CLIENT_INVOICE';
      } else if (vUpper === 'PURCHASE' || vUpper === 'F9') {
        where.referenceType = 'SUPPLIER_INVOICE';
      } else if (vUpper === 'CONTRA' || vUpper === 'F4') {
        where.referenceType = 'CONTRA';
      } else if (vUpper === 'JOURNAL' || vUpper === 'F7') {
        where.referenceType = { in: ['MANUAL', 'INVENTORY_ISSUE'] };
      }
    } else if (referenceType && typeof referenceType === 'string' && referenceType !== 'ALL') {
      where.referenceType = referenceType;
    }

    // Filter by project cost centre
    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      where.lines = {
        some: { projectId },
      };
    }

    // Filter by date range
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.entryDate.lte = end;
      }
    }

    // Search query across entry number, narration, and account name
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { entryNumber: { contains: q } },
            { narration: { contains: q } },
            { referenceId: { contains: q } },
            { lines: { some: { account: { name: { contains: q } } } } },
            { lines: { some: { account: { code: { contains: q } } } } },
          ],
        },
      ];
    }

    const takeLimit = Math.min(parseInt(limit as string) || 1000, 5000);

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
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: takeLimit,
    });

    const enrichedEntries = entries.map((entry) => {
      const tallyDetails = getTallyVoucherDetails(entry.referenceType, entry.narration, entry.lines);
      const enrichedLines = entry.lines.map((l) => ({
        ...l,
        account: {
          ...l.account,
          ...getTallyAccountMetadata(l.account.code, l.account.type, l.account.subType),
        },
      }));

      return {
        ...entry,
        tallyVoucherType: tallyDetails.voucherType,
        tallyShortcut: tallyDetails.shortcut,
        tallyCategory: tallyDetails.category,
        lines: enrichedLines,
      };
    });

    return res.json({
      success: true,
      totalCount: enrichedEntries.length,
      entries: enrichedEntries,
    });
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

    const tenantId = req.user?.companyId || null;
    const journal = await postBalancedJournalEntry({
      tenantId,
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
    if (req.user?.companyId) {
      await ensureStandardCOA(req.user.companyId);
    }

    const accounts = await prisma.account.findMany({
      where: getTenantFilter(req),
      include: {
        journalLines: {
          where: { journalEntry: { ...getTenantFilter(req) } },
        },
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
      where: { type: { in: ['REVENUE', 'EXPENSE'] }, ...getTenantFilter(req) },
      include: {
        journalLines: {
          where: { journalEntry: { ...getTenantFilter(req) } },
        },
      },
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
      where: { type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }, ...getTenantFilter(req) },
      include: {
        journalLines: {
          where: { journalEntry: { ...getTenantFilter(req) } },
        },
      },
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
      where: { balanceDue: { gt: 0 }, ...getTenantFilter(req) },
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
      where: { balanceDue: { gt: 0 }, ...getTenantFilter(req) },
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

function escapeXml(unsafe: string = ''): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 1-Click Export to Tally ERP 9 / Tally Prime XML
 * Standard Tally Vouchers Import format accepted via Gateway of Tally -> Import Data -> Vouchers
 */
export const exportTallyXML = async (req: Request, res: Response) => {
  try {
    const { voucherType, startDate, endDate, projectId } = req.query;

    const where: any = { ...getTenantFilter(req) };
    if (voucherType && typeof voucherType === 'string' && voucherType !== 'ALL') {
      const vUpper = voucherType.toUpperCase();
      if (vUpper === 'PAYMENT' || vUpper === 'F5') {
        where.referenceType = { in: ['WAGE_PAYMENT', 'SUPPLIER_PAYMENT', 'SALARY_PAYMENT', 'EXPENSE', 'OFFICE_EXPENSE'] };
      } else if (vUpper === 'RECEIPT' || vUpper === 'F6') {
        where.referenceType = 'CLIENT_RECEIPT';
      } else if (vUpper === 'SALES' || vUpper === 'F8') {
        where.referenceType = 'CLIENT_INVOICE';
      } else if (vUpper === 'PURCHASE' || vUpper === 'F9') {
        where.referenceType = 'SUPPLIER_INVOICE';
      } else if (vUpper === 'CONTRA' || vUpper === 'F4') {
        where.referenceType = 'CONTRA';
      } else if (vUpper === 'JOURNAL' || vUpper === 'F7') {
        where.referenceType = { in: ['MANUAL', 'INVENTORY_ISSUE'] };
      }
    }

    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      where.lines = { some: { projectId } };
    }

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.entryDate.lte = end;
      }
    }

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
      orderBy: { entryDate: 'asc' },
    });

    const vouchersXml = entries
      .map((entry) => {
        const dateObj = new Date(entry.entryDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const tallyDate = `${yyyy}${mm}${dd}`;

        const tallyMeta = getTallyVoucherDetails(entry.referenceType, entry.narration, entry.lines);

        const linesXml = entry.lines
          .map((line) => {
            const isDebit = line.debit > 0;
            // Tally XML Standard: Debit amounts are represented as negative numbers (-ve), Credit amounts are positive (+ve)
            const tallyAmount = isDebit ? -(line.debit) : line.credit;

            let costCentreXml = '';
            if (line.project?.name) {
              costCentreXml = `
                <CATEGORY>Construction Projects</CATEGORY>
                <COSTCENTRENAME>${escapeXml(line.project.name)}</COSTCENTRENAME>`;
            }

            return `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(line.account.name)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${tallyAmount.toFixed(2)}</AMOUNT>${costCentreXml}
            </ALLLEDGERENTRIES.LIST>`;
          })
          .join('');

        return `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${tallyMeta.voucherType}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${tallyDate}</DATE>
            <VOUCHERTYPENAME>${tallyMeta.voucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(entry.entryNumber)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXml(entry.referenceId || entry.entryNumber)}</REFERENCE>
            <NARRATION>${escapeXml(entry.narration)}</NARRATION>
            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>
            ${linesXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
      })
      .join('\n');

    const fullXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>ApexBuild Construction ERP</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="ApexBuild_Tally_Import_${dateStr}.xml"`);
    return res.status(200).send(fullXml);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export Day Book as CSV for Indian Auditors / Accountants
 */
export const exportDaybookCSV = async (req: Request, res: Response) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: getTenantFilter(req),
      include: {
        lines: {
          include: {
            account: true,
            project: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { entryDate: 'asc' },
    });

    const headers = [
      'Date',
      'Voucher Type',
      'Tally Key',
      'Voucher No',
      'Account Code',
      'Account Name',
      'Tally Group',
      'Project / Cost Centre',
      'Debit (INR)',
      'Credit (INR)',
      'Narration',
    ];

    const rows: string[] = [headers.join(',')];

    for (const entry of entries) {
      const tallyMeta = getTallyVoucherDetails(entry.referenceType, entry.narration, entry.lines);
      const dateStr = new Date(entry.entryDate).toISOString().slice(0, 10);

      for (const line of entry.lines) {
        const meta = getTallyAccountMetadata(line.account.code, line.account.type, line.account.subType);
        const row = [
          `"${dateStr}"`,
          `"${tallyMeta.voucherType}"`,
          `"${tallyMeta.shortcut}"`,
          `"${entry.entryNumber}"`,
          `"${line.account.code}"`,
          `"${line.account.name.replace(/"/g, '""')}"`,
          `"${meta.tallyGroup}"`,
          `"${(line.project?.name || '').replace(/"/g, '""')}"`,
          line.debit > 0 ? line.debit.toFixed(2) : '0.00',
          line.credit > 0 ? line.credit.toFixed(2) : '0.00',
          `"${(entry.narration || '').replace(/"/g, '""')}"`,
        ];
        rows.push(row.join(','));
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ApexBuild_DayBook_${dateStr}.csv"`);
    return res.status(200).send(rows.join('\r\n'));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Detailed Indian Financial & Statutory Summary for GST, TDS, Retention and Tally Statistics
 */
export const getIndianStatutorySummary = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      where: getTenantFilter(req),
    });
    const journalCount = await prisma.journalEntry.count({
      where: getTenantFilter(req),
    });

    const voucherCounts = await prisma.journalEntry.groupBy({
      by: ['referenceType'],
      where: getTenantFilter(req),
      _count: { id: true },
    });

    const tallyBreakdown = {
      paymentVouchers: 0,
      receiptVouchers: 0,
      salesVouchers: 0,
      purchaseVouchers: 0,
      contraVouchers: 0,
      journalVouchers: 0,
    };

    for (const vc of voucherCounts) {
      const meta = getTallyVoucherDetails(vc.referenceType);
      if (meta.voucherType === 'Payment') tallyBreakdown.paymentVouchers += vc._count.id;
      else if (meta.voucherType === 'Receipt') tallyBreakdown.receiptVouchers += vc._count.id;
      else if (meta.voucherType === 'Sales') tallyBreakdown.salesVouchers += vc._count.id;
      else if (meta.voucherType === 'Purchase') tallyBreakdown.purchaseVouchers += vc._count.id;
      else if (meta.voucherType === 'Contra') tallyBreakdown.contraVouchers += vc._count.id;
      else tallyBreakdown.journalVouchers += vc._count.id;
    }

    const gstInput = accounts.find((a) => a.code === '1300')?.currentBalance || 0;
    const gstOutput = accounts.find((a) => a.code === '2200')?.currentBalance || 0;
    const netGst = gstOutput - gstInput;

    const tdsPayable = accounts.find((a) => a.code === '2250')?.currentBalance || 0;
    const clientRetention = accounts.find((a) => a.code === '1150')?.currentBalance || 0;
    const subconRetention = accounts.find((a) => a.code === '2050')?.currentBalance || 0;
    const cashBank = accounts
      .filter((a) => ['1010', '1020', '1030', '1040'].includes(a.code))
      .reduce((s, a) => s + a.currentBalance, 0);

    return res.json({
      success: true,
      statutory: {
        gst: {
          inputGstCredit: gstInput,
          outputGstLiability: gstOutput,
          netGstPayable: netGst > 0 ? netGst : 0,
          netGstRefundable: netGst < 0 ? Math.abs(netGst) : 0,
        },
        tds: {
          tdsPayable,
          complianceSection: 'Income Tax Act 1961 - Sections 194C & 194J',
        },
        retention: {
          clientRetentionReceivable: clientRetention,
          subcontractorRetentionPayable: subconRetention,
        },
        liquidity: {
          totalCashAndBank: cashBank,
        },
        tallyStats: {
          totalVouchers: journalCount,
          ...tallyBreakdown,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
