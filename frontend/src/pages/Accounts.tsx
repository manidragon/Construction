import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Account, JournalEntry, Project } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Landmark,
  Plus,
  BookOpen,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  X,
  Search,
  Download,
  RefreshCw,
  Table,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Building,
  FileCode,
  Trash2,
} from 'lucide-react';

export const Accounts: React.FC = () => {
  const { hasRole } = useAuth();
  const [coa, setCOA] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [indianStatutory, setIndianStatutory] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'coa' | 'journal' | 'trialBalance' | 'pnl' | 'balanceSheet' | 'aging'>('journal');

  // Filters
  const [journalFilter, setJournalFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [journalSearch, setJournalSearch] = useState<string>('');
  const [journalViewMode, setJournalViewMode] = useState<'daybook' | 'cards'>('daybook');
  const [coaSearch, setCOASearch] = useState<string>('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Manual Journal Modal
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    narration: '',
    lines: [
      { accountCode: '1030', debit: 0, credit: 0, projectId: '' },
      { accountCode: '4010', debit: 0, credit: 0, projectId: '' },
    ],
  });

  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [coaRes, jnlRes, tbRes, pnlRes, bsRes, agRes, projRes] = await Promise.all([
        api.getCOA(),
        api.getJournalEntries('limit=2000'),
        api.getTrialBalance(),
        api.getProfitAndLoss(),
        api.getBalanceSheet(),
        api.getAgingReports(),
        api.getProjects().catch(() => ({ success: false, projects: [] })),
      ]);

      if (coaRes.success) {
        setCOA(coaRes.accounts || []);
        if (coaRes.indianStatutory) setIndianStatutory(coaRes.indianStatutory);
      }
      if (jnlRes.success) setJournals(jnlRes.entries || []);
      if (tbRes.success) setTrialBalance(tbRes);
      if (pnlRes.success) setPnl(pnlRes.pnl);
      if (bsRes.success) setBalanceSheet(bsRes.balanceSheet);
      if (agRes.success) setAging(agRes);
      if (projRes.success) setProjects(projRes.projects || []);

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportTallyXML = async () => {
    try {
      setIsExporting(true);
      await api.downloadTallyXML(projectFilter !== 'ALL' ? `projectId=${projectFilter}` : '');
    } catch (err: any) {
      alert(err.message || 'Failed to export Tally XML');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDaybookCSV = async () => {
    try {
      setIsExporting(true);
      await api.downloadDaybookCSV();
    } catch (err: any) {
      alert(err.message || 'Failed to export Daybook CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddJournalLine = () => {
    setJournalForm({
      ...journalForm,
      lines: [
        ...journalForm.lines,
        { accountCode: coa[0]?.code || '1010', debit: 0, credit: 0, projectId: '' },
      ],
    });
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalForm.lines.length <= 2) {
      alert('A double-entry journal voucher requires at least 2 legs.');
      return;
    }
    const updated = [...journalForm.lines];
    updated.splice(index, 1);
    setJournalForm({ ...journalForm, lines: updated });
  };

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalDeb = journalForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCred = journalForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

      if (Math.abs(totalDeb - totalCred) > 0.01) {
        alert(`Journal Unbalanced! Total Debit (₹${totalDeb.toLocaleString('en-IN')}) must equal Total Credit (₹${totalCred.toLocaleString('en-IN')}). Difference: ₹${Math.abs(totalDeb - totalCred).toLocaleString('en-IN')}`);
        return;
      }

      const res = await api.createManualJournal(journalForm);
      if (res.success) {
        setShowJournalModal(false);
        setJournalForm({
          entryDate: new Date().toISOString().split('T')[0],
          narration: '',
          lines: [
            { accountCode: '1030', debit: 0, credit: 0, projectId: '' },
            { accountCode: '4010', debit: 0, credit: 0, projectId: '' },
          ],
        });
        fetchData(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to post journal entry');
    }
  };

  // Helper for Tally Voucher filtering
  const filteredJournals = journals.filter((j) => {
    // Voucher Type Filter
    if (journalFilter !== 'ALL') {
      if (journalFilter === 'PAYMENT' && j.tallyVoucherType !== 'Payment') return false;
      if (journalFilter === 'RECEIPT' && j.tallyVoucherType !== 'Receipt') return false;
      if (journalFilter === 'SALES' && j.tallyVoucherType !== 'Sales') return false;
      if (journalFilter === 'PURCHASE' && j.tallyVoucherType !== 'Purchase') return false;
      if (journalFilter === 'CONTRA' && j.tallyVoucherType !== 'Contra') return false;
      if (journalFilter === 'JOURNAL' && j.tallyVoucherType !== 'Journal') return false;
      if (['WAGE_PAYMENT', 'CLIENT_INVOICE', 'CLIENT_RECEIPT', 'SUPPLIER_INVOICE', 'SUPPLIER_PAYMENT', 'EXPENSE', 'MANUAL'].includes(journalFilter)) {
        if (j.referenceType !== journalFilter) return false;
      }
    }

    // Project Filter
    if (projectFilter !== 'ALL') {
      const hasProject = j.lines.some((l) => l.project?.code === projectFilter || (l as any).projectId === projectFilter);
      if (!hasProject) return false;
    }

    // Search query
    if (journalSearch.trim()) {
      const q = journalSearch.toLowerCase();
      const matchNumber = j.entryNumber.toLowerCase().includes(q);
      const matchNarration = j.narration?.toLowerCase().includes(q);
      const matchType = (j.tallyVoucherType || j.referenceType).toLowerCase().includes(q);
      const matchLines = j.lines.some(
        (l) => l.account?.name.toLowerCase().includes(q) || l.account?.code.includes(q)
      );
      const matchProject = j.lines.some((l) => l.project?.name.toLowerCase().includes(q));
      return matchNumber || matchNarration || matchType || matchLines || matchProject;
    }

    return true;
  });

  // Voucher counts for filter badges
  const paymentCount = journals.filter((j) => j.tallyVoucherType === 'Payment').length;
  const receiptCount = journals.filter((j) => j.tallyVoucherType === 'Receipt').length;
  const salesCount = journals.filter((j) => j.tallyVoucherType === 'Sales').length;
  const purchaseCount = journals.filter((j) => j.tallyVoucherType === 'Purchase').length;
  const contraCount = journals.filter((j) => j.tallyVoucherType === 'Contra').length;
  const journalVoucherCount = journals.filter((j) => j.tallyVoucherType === 'Journal').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl shadow-lg border border-slate-700 text-white">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full shadow-sm">
              Indian Financial ERP
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Tally Prime & ERP 9 Adaptable
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Double-Entry Accounting & Tally Interoperability
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Compliant with Indian Companies Act 2013 (Schedule III), GST & TDS provisions. Full audit trail of every operational transaction with direct 1-click XML/Day Book export into Tally software.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            title={`Last refreshed at ${lastRefreshedAt.toLocaleTimeString()}`}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold px-3 py-2 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Financials'}</span>
          </button>

          {/* Export Tally XML */}
          <button
            onClick={handleExportTallyXML}
            disabled={isExporting}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export to Tally XML</span>
          </button>

          {/* Export Day Book CSV */}
          <button
            onClick={handleExportDaybookCSV}
            disabled={isExporting}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold px-3 py-2 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Day Book</span>
          </button>

          {/* Post Manual Journal */}
          {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
            <button
              onClick={() => setShowJournalModal(true)}
              className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow-md transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Journal Voucher</span>
            </button>
          )}
        </div>
      </div>

      {/* Indian Financial & Statutory Quick KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: GST Status (ITC vs Output) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold flex items-center gap-1 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              GST Tax Ledger
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
              CGST/SGST/IGST
            </span>
          </div>
          <div className="pt-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Input ITC Credit:</span>
              <span className="font-mono font-bold text-xs text-emerald-600">
                {formatCurrency(indianStatutory?.gst?.inputGstCredit || 0)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Output Tax Due:</span>
              <span className="font-mono font-bold text-xs text-rose-600">
                {formatCurrency(indianStatutory?.gst?.outputGstLiability || 0)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Net GST Status:</span>
              <span
                className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                  (indianStatutory?.gst?.netGstPayable || 0) > 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {(indianStatutory?.gst?.netGstPayable || 0) > 0
                  ? `Payable: ${formatCurrency(indianStatutory?.gst?.netGstPayable || 0)}`
                  : `Credit: ${formatCurrency(indianStatutory?.gst?.netGstRefundable || 0)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: TDS Withheld & Dues */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold flex items-center gap-1 text-slate-700">
              <Building className="w-3.5 h-3.5 text-purple-600" />
              TDS Dues (Sec 194C/194J)
            </span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">
              Account 2250
            </span>
          </div>
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block">Total TDS Withheld Payable</span>
            <span className="text-lg font-black font-mono text-purple-700 block">
              {formatCurrency(indianStatutory?.tds?.tdsPayable || 0)}
            </span>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Deposit Due Date:</span>
              <span className="font-semibold text-slate-700">7th of Next Month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Liquid Funds (Cash & Bank Accounts) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold flex items-center gap-1 text-slate-700">
              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
              Cash & Bank Liquidity
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">
              Accounts 1010-1040
            </span>
          </div>
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block">Operating Current & Site Cash</span>
            <span className="text-lg font-black font-mono text-emerald-600 block">
              {formatCurrency(indianStatutory?.workingCapital?.totalLiquidFunds || 0)}
            </span>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Operating Bank:</span>
              <span className="font-semibold text-slate-700">HDFC & SBI Escrow</span>
            </div>
          </div>
        </div>

        {/* Card 4: Sundry Debtors & Creditors (Working Capital) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold flex items-center gap-1 text-slate-700">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              Working Capital (Tally Groups)
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
              Debtors / Creditors
            </span>
          </div>
          <div className="pt-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Sundry Debtors (Clients):</span>
              <span className="font-mono font-bold text-xs text-blue-700">
                {formatCurrency(indianStatutory?.workingCapital?.sundryDebtors || 0)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Sundry Creditors (Vendors):</span>
              <span className="font-mono font-bold text-xs text-amber-700">
                {formatCurrency(indianStatutory?.workingCapital?.sundryCreditors || 0)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Client Retention:</span>
              <span className="font-mono font-semibold text-slate-700">
                {formatCurrency(indianStatutory?.retention?.clientRetentionReceivable || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'journal', label: `General Ledger & Day Book (${journals.length})`, icon: Landmark },
          { id: 'coa', label: `Chart of Accounts & Tally Groups (${coa.length})`, icon: BookOpen },
          { id: 'trialBalance', label: 'Trial Balance Verification', icon: Scale },
          { id: 'pnl', label: 'Profit & Loss (Schedule III)', icon: TrendingUp },
          { id: 'balanceSheet', label: 'Balance Sheet', icon: FileSpreadsheet },
          { id: 'aging', label: 'Sundry Debtors / Creditors Aging', icon: Clock },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-slate-900 text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERAL LEDGER & TALLY DAY BOOK                                   */}
      {/* ========================================================================= */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          {/* Subheader & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  General Ledger Day Book & Tally Voucher Audit Trail
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  All Updated Data Live ({journals.length} Vouchers)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every procurement, client bill, wage payout, office expense, and direct payment auto-posts balanced double-entries according to Tally voucher types.
              </p>
            </div>

            {/* View Mode Toggle: Day Book (Dense Table) vs Cards */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                onClick={() => setJournalViewMode('daybook')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  journalViewMode === 'daybook'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tally Day Book View</span>
              </button>
              <button
                onClick={() => setJournalViewMode('cards')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  journalViewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Audit Cards View</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Tally Voucher Function Keys & Operational Sources */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {/* Tally Voucher Type Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Tally Voucher:
              </span>
              {[
                { id: 'ALL', label: `All (${journals.length})`, badgeClass: 'bg-slate-900 text-amber-400' },
                { id: 'PAYMENT', label: `Payment [F5] (${paymentCount})`, badgeClass: 'bg-emerald-600 text-white' },
                { id: 'RECEIPT', label: `Receipt [F6] (${receiptCount})`, badgeClass: 'bg-blue-600 text-white' },
                { id: 'SALES', label: `Sales [F8] (${salesCount})`, badgeClass: 'bg-purple-600 text-white' },
                { id: 'PURCHASE', label: `Purchase [F9] (${purchaseCount})`, badgeClass: 'bg-amber-600 text-white' },
                { id: 'JOURNAL', label: `Journal [F7] (${journalVoucherCount})`, badgeClass: 'bg-slate-700 text-white' },
                { id: 'CONTRA', label: `Contra [F4] (${contraCount})`, badgeClass: 'bg-cyan-700 text-white' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setJournalFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    journalFilter === f.id
                      ? `${f.badgeClass} shadow-sm`
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Operational Reference Filters & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Operation:
                </span>
                {[
                  { id: 'WAGE_PAYMENT', label: '💵 Wage Payouts' },
                  { id: 'EXPENSE', label: '🏢 Office & Site Expenses' },
                  { id: 'CLIENT_INVOICE', label: '📄 Client RA Bills' },
                  { id: 'CLIENT_RECEIPT', label: '📥 Client Collections' },
                  { id: 'SUPPLIER_INVOICE', label: '📦 Vendor Bills' },
                  { id: 'SUPPLIER_PAYMENT', label: '💳 Supplier Payments' },
                  { id: 'MANUAL', label: '✏️ Manual Adjustments' },
                ].map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setJournalFilter(journalFilter === op.id ? 'ALL' : op.id)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition ${
                      journalFilter === op.id
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {/* Project Filter & Search Bar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Project Filter */}
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700"
                >
                  <option value="ALL">All Cost Centres / Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.code}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search voucher, ledger..."
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                  {journalSearch && (
                    <button
                      onClick={() => setJournalSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Showing Count */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-900">{filteredJournals.length}</strong> of{' '}
              <strong className="text-slate-900">{journals.length}</strong> total vouchers in database
            </span>
            {filteredJournals.length > 0 && (
              <span className="text-[11px] text-slate-400">
                Sorted by latest entry date (descending)
              </span>
            )}
          </div>

          {/* VIEW MODE 1: TALLY DAY BOOK (DENSE TABULAR VIEW) */}
          {journalViewMode === 'daybook' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Voucher Type & Key</th>
                      <th className="py-2.5 px-3">Voucher No.</th>
                      <th className="py-2.5 px-3">Particulars (Tally Ledger & Group)</th>
                      <th className="py-2.5 px-3">Project / Cost Centre</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredJournals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No voucher entries match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredJournals.map((j) => {
                        const vType = j.tallyVoucherType || 'Journal';
                        const vKey = j.tallyShortcut || 'F7';

                        const badgeColor =
                          vType === 'Payment'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : vType === 'Receipt'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : vType === 'Sales'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : vType === 'Purchase'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : vType === 'Contra'
                            ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300';

                        return (
                          <React.Fragment key={j.id}>
                            {/* Main Voucher Header Row */}
                            <tr className="bg-slate-50/70 border-t border-slate-200">
                              <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                {formatDate(j.entryDate)}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide border ${badgeColor}`}
                                >
                                  {vType} [{vKey}]
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                {j.entryNumber}
                              </td>
                              <td colSpan={2} className="py-2 px-3 text-slate-600 text-[11px] italic truncate max-w-md">
                                {j.narration}
                              </td>
                              <td
                                colSpan={2}
                                className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 text-xs"
                              >
                                {formatCurrency(j.lines.reduce((s, l) => s + l.debit, 0))}
                              </td>
                            </tr>

                            {/* Ledger Lines */}
                            {j.lines.map((line, lIdx) => (
                              <tr key={line.id || lIdx} className="hover:bg-slate-50/50">
                                <td></td>
                                <td></td>
                                <td></td>
                                <td className="py-1.5 px-3">
                                  <div className="flex items-center gap-1.5 pl-3">
                                    <span
                                      className={`text-[10px] font-mono font-bold px-1 rounded ${
                                        line.debit > 0 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                      }`}
                                    >
                                      {line.debit > 0 ? 'Dr.' : 'Cr.'}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      [{line.account?.code}] {line.account?.name}
                                    </span>
                                    {line.account?.tallyGroup && (
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        ({line.account.tallyGroup})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                                  {line.project?.name ? (
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                      {line.project.name}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono text-slate-900 font-semibold">
                                  {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono text-slate-900 font-semibold">
                                  {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: AUDIT CARDS */}
          {journalViewMode === 'cards' && (
            <div className="space-y-3">
              {filteredJournals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No journal entries found matching the filter or search query.
                </div>
              ) : (
                filteredJournals.map((j) => {
                  const totalDeb = j.lines.reduce((s, l) => s + l.debit, 0);
                  const vType = j.tallyVoucherType || 'Journal';
                  const vKey = j.tallyShortcut || 'F7';

                  const badgeColor =
                    vType === 'Payment'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : vType === 'Receipt'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : vType === 'Sales'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : vType === 'Purchase'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : vType === 'Contra'
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300';

                  return (
                    <div
                      key={j.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{j.entryNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{formatDate(j.entryDate)}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${badgeColor}`}>
                            {vType} [{vKey}]
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-200/70 px-1.5 py-0.5 rounded">
                            {j.referenceType}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 font-mono text-sm">
                          Total: {formatCurrency(totalDeb)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">{j.narration}</p>

                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs mt-2">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="py-1.5 px-3">Account Code & Title</th>
                              <th className="py-1.5 px-3">Tally Group</th>
                              <th className="py-1.5 px-3">Cost Centre / Project</th>
                              <th className="py-1.5 px-3 text-right">Debit (₹)</th>
                              <th className="py-1.5 px-3 text-right">Credit (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {j.lines.map((l) => (
                              <tr key={l.id}>
                                <td className="py-1.5 px-3 font-semibold text-slate-800">
                                  [{l.account.code}] {l.account.name}
                                </td>
                                <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                                  {l.account.tallyGroup || '—'}
                                </td>
                                <td className="py-1.5 px-3 text-slate-500">{l.project?.name || '—'}</td>
                                <td className="py-1.5 px-3 text-right font-mono text-slate-900">
                                  {l.debit > 0 ? formatCurrency(l.debit) : '—'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono text-slate-900">
                                  {l.credit > 0 ? formatCurrency(l.credit) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHART OF ACCOUNTS & TALLY GROUPS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'coa' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Indian Chart of Accounts & Tally Primary Ledgers
              </h3>
              <p className="text-xs text-slate-500">
                Grouped strictly according to Tally ERP 9 / Tally Prime 28 predefined primary groups and Schedule III
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search code, name, group..."
                value={coaSearch}
                onChange={(e) => setCOASearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-amber-400 uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Account Code</th>
                  <th className="py-3 px-3">Account Name</th>
                  <th className="py-3 px-3">Tally Primary Group</th>
                  <th className="py-3 px-3">Schedule III Category</th>
                  <th className="py-3 px-3">Normal Balance</th>
                  <th className="py-3 px-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {coa
                  .filter((a) => {
                    if (!coaSearch.trim()) return true;
                    const q = coaSearch.toLowerCase();
                    return (
                      a.code.toLowerCase().includes(q) ||
                      a.name.toLowerCase().includes(q) ||
                      (a.tallyGroup || '').toLowerCase().includes(q) ||
                      (a.schedule3Category || '').toLowerCase().includes(q)
                    );
                  })
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{a.code}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{a.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {a.tallyGroup || a.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {a.schedule3Category || a.subType}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            a.normalBalance === 'DEBIT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {a.normalBalance || (a.type === 'ASSET' || a.type === 'EXPENSE' ? 'DEBIT' : 'CREDIT')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(a.currentBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRIAL BALANCE VERIFICATION                                        */}
      {/* ========================================================================= */}
      {activeTab === 'trialBalance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Trial Balance (Dual Verification: Dr ≡ Cr)
              </h3>
              <p className="text-xs text-slate-500">
                Mathematical proof that every debit voucher has an equal corresponding credit voucher
              </p>
            </div>
            {trialBalance?.totals?.isBalanced && (
              <span className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Strictly Balanced (Diff: ₹0)</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Account Name</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3 text-right">Debit Balance (₹)</th>
                  <th className="py-3 px-3 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(trialBalance?.trialBalance || []).map((row: any) => (
                  <tr key={row.code} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{row.code}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{row.type}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-900 text-amber-400 font-black text-sm">
                  <td colSpan={3} className="py-3 px-3 uppercase tracking-wider">
                    Total Trial Balance
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatCurrency(trialBalance?.totals?.debit || 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatCurrency(trialBalance?.totals?.credit || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROFIT & LOSS (SCHEDULE III FORMAT)                               */}
      {/* ========================================================================= */}
      {activeTab === 'pnl' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900">Statement of Profit & Loss</h3>
            <p className="text-xs text-slate-500">
              Indian Companies Act 2013 Schedule III format separating contract operational revenues from direct costs and administrative overheads
            </p>
          </div>

          <div className="space-y-6 text-xs max-w-3xl">
            {/* Revenue */}
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                I. Revenue from Operations
              </h4>
              <div className="space-y-1.5">
                {(pnl?.revenue?.items || []).map((it: any) => (
                  <div key={it.code} className="flex items-center justify-between py-1">
                    <span className="text-slate-700 font-medium">
                      [{it.code}] {it.name}
                    </span>
                    <strong className="font-mono text-slate-900">{formatCurrency(it.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Revenue from Operations (A)</span>
                  <span className="font-mono text-emerald-600 text-sm">
                    {formatCurrency(pnl?.revenue?.total || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Costs */}
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                II. Direct Project Construction Costs
              </h4>
              <div className="space-y-1.5">
                {(pnl?.directCosts?.items || []).map((it: any) => (
                  <div key={it.code} className="flex items-center justify-between py-1">
                    <span className="text-slate-700 font-medium">
                      [{it.code}] {it.name}
                    </span>
                    <strong className="font-mono text-slate-900">{formatCurrency(it.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Direct Construction Costs (B)</span>
                  <span className="font-mono text-rose-600 text-sm">
                    {formatCurrency(pnl?.directCosts?.total || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gross Margin */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-extrabold text-sm text-slate-900">
              <span>Gross Project Margin (A - B)</span>
              <div className="text-right">
                <span className="font-mono text-emerald-600 block">{formatCurrency(pnl?.grossProfit || 0)}</span>
                <span className="text-[10px] text-slate-500 font-normal">{pnl?.grossMarginPercent}% of Revenue</span>
              </div>
            </div>

            {/* Overheads */}
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                III. Overhead & Administrative Expenses
              </h4>
              <div className="space-y-1.5">
                {(pnl?.overheads?.items || []).map((it: any) => (
                  <div key={it.code} className="flex items-center justify-between py-1">
                    <span className="text-slate-700 font-medium">
                      [{it.code}] {it.name}
                    </span>
                    <strong className="font-mono text-slate-900">{formatCurrency(it.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Administrative Overheads (C)</span>
                  <span className="font-mono text-rose-600">{formatCurrency(pnl?.overheads?.total || 0)}</span>
                </div>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="p-4 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-between font-extrabold text-base">
              <span>Net Profit Before Tax (A - B - C)</span>
              <div className="text-right">
                <span className="font-mono block">{formatCurrency(pnl?.netProfit || 0)}</span>
                <span className="text-xs text-slate-400 font-normal">{pnl?.netMarginPercent}% Net Margin</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BALANCE SHEET                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'balanceSheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900">Statement of Financial Position (Balance Sheet)</h3>
            <p className="text-xs text-slate-500">Assets = Liabilities + Owner Equity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                ASSETS
              </h4>
              <div className="space-y-1.5">
                {(balanceSheet?.assets?.items || []).map((a: any) => (
                  <div key={a.code} className="flex items-center justify-between py-1">
                    <span className="text-slate-700">
                      [{a.code}] {a.name}
                    </span>
                    <strong className="font-mono text-slate-900">{formatCurrency(a.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900 font-extrabold text-sm text-slate-900">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono text-emerald-600">
                    {formatCurrency(balanceSheet?.assets?.total || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                  LIABILITIES
                </h4>
                <div className="space-y-1.5">
                  {(balanceSheet?.liabilities?.items || []).map((l: any) => (
                    <div key={l.code} className="flex items-center justify-between py-1">
                      <span className="text-slate-700">
                        [{l.code}] {l.name}
                      </span>
                      <strong className="font-mono text-slate-900">{formatCurrency(l.amount)}</strong>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Liabilities</span>
                    <span className="font-mono text-rose-600">
                      {formatCurrency(balanceSheet?.liabilities?.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                  EQUITY
                </h4>
                <div className="space-y-1.5">
                  {(balanceSheet?.equity?.items || []).map((eq: any) => (
                    <div key={eq.code} className="flex items-center justify-between py-1">
                      <span className="text-slate-700">
                        [{eq.code}] {eq.name}
                      </span>
                      <strong className="font-mono text-slate-900">{formatCurrency(eq.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900 font-extrabold text-sm text-slate-900">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(balanceSheet?.totalLiabilitiesAndEquity || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AP / AR AGING (SUNDRY DEBTORS & CREDITORS)                        */}
      {/* ========================================================================= */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          {/* Receivables Aging (Sundry Debtors) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Accounts Receivable Aging (Sundry Debtors - Clients)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Current / Not Due</span>
                <strong className="text-xs sm:text-sm font-bold text-emerald-600">
                  {formatCurrency(aging?.receivables?.agingSummary?.current || 0)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">1 - 30 Days</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-800">
                  {formatCurrency(aging?.receivables?.agingSummary?.days30 || 0)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">31 - 60 Days</span>
                <strong className="text-xs sm:text-sm font-bold text-amber-600">
                  {formatCurrency(aging?.receivables?.agingSummary?.days60 || 0)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">60+ Days Overdue</span>
                <strong className="text-xs sm:text-sm font-bold text-red-600">
                  {formatCurrency(aging?.receivables?.agingSummary?.days90Plus || 0)}
                </strong>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl text-amber-400">
                <span className="text-[10px] text-slate-400 block font-medium">Total Receivables</span>
                <strong className="text-xs sm:text-sm font-extrabold">
                  {formatCurrency(aging?.receivables?.agingSummary?.total || 0)}
                </strong>
              </div>
            </div>
          </div>

          {/* Payables Aging (Sundry Creditors) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Accounts Payable Aging (Sundry Creditors - Vendors & Subcontractors)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Current</span>
                <strong className="text-xs sm:text-sm font-bold text-emerald-600">
                  {formatCurrency(aging?.payables?.agingSummary?.current || 0)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">1 - 30 Days</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-800">
                  {formatCurrency(aging?.payables?.agingSummary?.days30 || 0)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">31 - 60 Days</span>
                <strong className="text-xs sm:text-sm font-bold text-amber-600">
                  {formatCurrency(aging?.payables?.agingSummary?.days60 || 0)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">60+ Days</span>
                <strong className="text-xs sm:text-sm font-bold text-red-600">
                  {formatCurrency(aging?.payables?.agingSummary?.days90Plus || 0)}
                </strong>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl text-amber-400">
                <span className="text-[10px] text-slate-400 block font-medium">Total Payables</span>
                <strong className="text-xs sm:text-sm font-extrabold">
                  {formatCurrency(aging?.payables?.agingSummary?.total || 0)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST MULTI-LEG MANUAL JOURNAL VOUCHER MODAL                               */}
      {/* ========================================================================= */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Post Manual Journal Voucher [Tally F7 / F4]
                </h3>
                <p className="text-[11px] text-slate-500">
                  Must be strictly balanced: Total Debits must equal Total Credits
                </p>
              </div>
              <button
                onClick={() => setShowJournalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJournal} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Voucher Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={journalForm.entryDate}
                    onChange={(e) => setJournalForm({ ...journalForm, entryDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Narration / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accrued site electricity bill for October"
                    value={journalForm.narration}
                    onChange={(e) => setJournalForm({ ...journalForm, narration: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Journal Voucher Legs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Voucher Legs (Dr / Cr)</span>
                  <button
                    type="button"
                    onClick={handleAddJournalLine}
                    className="flex items-center space-x-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Leg</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {journalForm.lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 flex flex-col sm:flex-row gap-2 items-center">
                      <div className="w-full sm:w-1/2">
                        <select
                          value={line.accountCode}
                          onChange={(e) => {
                            const updated = [...journalForm.lines];
                            updated[idx].accountCode = e.target.value;
                            setJournalForm({ ...journalForm, lines: updated });
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                        >
                          {coa.map((a) => (
                            <option key={a.code} value={a.code}>
                              [{a.code}] {a.name} ({a.tallyGroup || a.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-1/4">
                        <input
                          type="number"
                          placeholder="Debit (₹)"
                          value={line.debit || ''}
                          onChange={(e) => {
                            const updated = [...journalForm.lines];
                            updated[idx].debit = Number(e.target.value);
                            if (Number(e.target.value) > 0) updated[idx].credit = 0;
                            setJournalForm({ ...journalForm, lines: updated });
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-blue-700"
                        />
                      </div>

                      <div className="w-full sm:w-1/4">
                        <input
                          type="number"
                          placeholder="Credit (₹)"
                          value={line.credit || ''}
                          onChange={(e) => {
                            const updated = [...journalForm.lines];
                            updated[idx].credit = Number(e.target.value);
                            if (Number(e.target.value) > 0) updated[idx].debit = 0;
                            setJournalForm({ ...journalForm, lines: updated });
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-amber-700"
                        />
                      </div>

                      {journalForm.lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveJournalLine(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Running Balance Comparison */}
                {(() => {
                  const debTotal = journalForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
                  const credTotal = journalForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
                  const diff = Math.abs(debTotal - credTotal);
                  const isBalanced = diff < 0.01 && debTotal > 0;

                  return (
                    <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-4">
                        <span>
                          Total Debit: <strong className="text-blue-400">₹{debTotal.toLocaleString('en-IN')}</strong>
                        </span>
                        <span>
                          Total Credit: <strong className="text-amber-400">₹{credTotal.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                      <div>
                        {isBalanced ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Balanced (Diff: ₹0)
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold">
                            Unbalanced (Diff: ₹{diff.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-md transition"
                >
                  Post Balanced Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
