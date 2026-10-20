import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Account, JournalEntry } from '../types';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import api from '../services/api';
import {
  Landmark,
  Plus,
  BookOpen,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

export const Accounts: React.FC = () => {
  const { hasRole } = useAuth();
  const [coa, setCOA] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'coa' | 'journal' | 'trialBalance' | 'pnl' | 'balanceSheet' | 'aging'>('coa');

  // Manual Journal Modal
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    narration: '',
    lines: [
      { accountCode: '1030', debit: 0, credit: 0 },
      { accountCode: '4010', debit: 0, credit: 0 },
    ],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coaRes, jnlRes, tbRes, pnlRes, bsRes, agRes] = await Promise.all([
        api.getCOA(),
        api.getJournalEntries(),
        api.getTrialBalance(),
        api.getProfitAndLoss(),
        api.getBalanceSheet(),
        api.getAgingReports(),
      ]);

      if (coaRes.success) setCOA(coaRes.accounts || []);
      if (jnlRes.success) setJournals(jnlRes.entries || []);
      if (tbRes.success) setTrialBalance(tbRes);
      if (pnlRes.success) setPnl(pnlRes.pnl);
      if (bsRes.success) setBalanceSheet(bsRes.balanceSheet);
      if (agRes.success) setAging(agRes);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalDeb = journalForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCred = journalForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

      if (Math.abs(totalDeb - totalCred) > 0.01) {
        alert(`Journal Unbalanced! Total Debit (₹${totalDeb}) must equal Total Credit (₹${totalCred})`);
        return;
      }

      const res = await api.createManualJournal(journalForm);
      if (res.success) {
        setShowJournalModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to post journal entry');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Ledger & Double-Entry ERP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Strict double-entry general ledger, Chart of Accounts, P&L, Balance Sheet, Trial Balance, and AP/AR aging.
          </p>
        </div>

        {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
          <button
            onClick={() => setShowJournalModal(true)}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Post Manual Journal</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
          { id: 'journal', label: `General Ledger (${journals.length})`, icon: Landmark },
          { id: 'trialBalance', label: 'Trial Balance', icon: Scale },
          { id: 'pnl', label: 'Profit & Loss (P&L)', icon: TrendingUp },
          { id: 'balanceSheet', label: 'Balance Sheet', icon: FileSpreadsheet },
          { id: 'aging', label: 'AP / AR Aging', icon: Clock },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
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

      {/* Tab 1: Chart of Accounts */}
      {activeTab === 'coa' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3">Account Code</th>
                  <th className="py-3 px-3">Account Name</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Sub Type</th>
                  <th className="py-3 px-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {coa.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{a.code}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{a.name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.type === 'ASSET' ? 'bg-blue-100 text-blue-800' :
                        a.type === 'LIABILITY' ? 'bg-amber-100 text-amber-800' :
                        a.type === 'EQUITY' ? 'bg-purple-100 text-purple-800' :
                        a.type === 'REVENUE' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-500">{a.subType}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(a.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: General Ledger Journal Entries */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">General Ledger Journal Entries Audit Trail</h3>
            <span className="text-xs text-slate-500">Every operational transaction auto-creates balanced entries</span>
          </div>

          <div className="space-y-4">
            {journals.map((j) => {
              const totalDeb = j.lines.reduce((s, l) => s + l.debit, 0);
              const totalCred = j.lines.reduce((s, l) => s + l.credit, 0);

              return (
                <div key={j.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">{j.entryNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{formatDate(j.entryDate)}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        {j.referenceType}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">
                      Total: {formatCurrency(totalDeb)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 italic">{j.narration}</p>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs mt-2">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-1.5 px-3">Account Code & Title</th>
                          <th className="py-1.5 px-3">Project</th>
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
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Trial Balance */}
      {activeTab === 'trialBalance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trial Balance Verification</h3>
              <p className="text-xs text-slate-500">Checking that all debits equal credits across accounts</p>
            </div>
            {trialBalance?.totals?.isBalanced && (
              <span className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Strictly Balanced (Diff: ₹0)</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Account Name</th>
                  <th className="py-3 px-3">Type</th>
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
                <tr className="bg-slate-900 text-amber-400 font-extrabold text-sm">
                  <td colSpan={3} className="py-3 px-3 uppercase">Total Trial Balance</td>
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

      {/* Tab 4: Profit & Loss Statement */}
      {activeTab === 'pnl' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900">Statement of Profit & Loss</h3>
            <p className="text-xs text-slate-500">Separating construction recognized revenues from direct works and overheads</p>
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
                    <span className="text-slate-700 font-medium">[{it.code}] {it.name}</span>
                    <strong className="font-mono text-slate-900">{formatCurrency(it.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Revenue (A)</span>
                  <span className="font-mono text-emerald-600 text-sm">{formatCurrency(pnl?.revenue?.total || 0)}</span>
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
                    <span className="text-slate-700 font-medium">[{it.code}] {it.name}</span>
                    <strong className="font-mono text-slate-900">{formatCurrency(it.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Direct Costs (B)</span>
                  <span className="font-mono text-rose-600 text-sm">{formatCurrency(pnl?.directCosts?.total || 0)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-extrabold text-sm text-slate-900">
              <span>Gross Construction Margin (A - B)</span>
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
                    <span className="text-slate-700 font-medium">[{it.code}] {it.name}</span>
                    <strong className="font-mono text-slate-900">{formatCurrency(it.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Overheads (C)</span>
                  <span className="font-mono text-rose-600">{formatCurrency(pnl?.overheads?.total || 0)}</span>
                </div>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="p-4 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-between font-extrabold text-base">
              <span>Net Operating Profit</span>
              <div className="text-right">
                <span className="font-mono block">{formatCurrency(pnl?.netProfit || 0)}</span>
                <span className="text-xs text-slate-400 font-normal">{pnl?.netMarginPercent}% Net Margin</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Balance Sheet */}
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
                    <span className="text-slate-700">[{a.code}] {a.name}</span>
                    <strong className="font-mono text-slate-900">{formatCurrency(a.amount)}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900 font-extrabold text-sm text-slate-900">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(balanceSheet?.assets?.total || 0)}</span>
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
                      <span className="text-slate-700">[{l.code}] {l.name}</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(l.amount)}</strong>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Liabilities</span>
                    <span className="font-mono text-rose-600">{formatCurrency(balanceSheet?.liabilities?.total || 0)}</span>
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
                      <span className="text-slate-700">[{eq.code}] {eq.name}</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(eq.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900 font-extrabold text-sm text-slate-900">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-slate-900">{formatCurrency(balanceSheet?.totalLiabilitiesAndEquity || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: AP / AR Aging */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          {/* Receivables Aging */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Accounts Receivable (AR) Aging Summary</h3>
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

          {/* Payables Aging */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Accounts Payable (AP) Aging Summary</h3>
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

      {/* Post Manual Journal Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Post Manual Adjusting Journal Entry</h3>
              <button onClick={() => setShowJournalModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePostJournal} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Narration / Explanation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Month-end depreciation adjustment on equipment"
                  value={journalForm.narration}
                  onChange={(e) => setJournalForm({ ...journalForm, narration: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Line 1: Debit */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Debit Leg</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={journalForm.lines[0].accountCode}
                    onChange={(e) => {
                      const updated = [...journalForm.lines];
                      updated[0].accountCode = e.target.value;
                      setJournalForm({ ...journalForm, lines: updated });
                    }}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                  >
                    {coa.map((a) => (
                      <option key={a.code} value={a.code}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Debit Amount (₹)"
                    value={journalForm.lines[0].debit || ''}
                    onChange={(e) => {
                      const updated = [...journalForm.lines];
                      updated[0].debit = Number(e.target.value);
                      updated[1].credit = Number(e.target.value); // Auto balance credit for convenience
                      setJournalForm({ ...journalForm, lines: updated });
                    }}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
              </div>

              {/* Line 2: Credit */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Credit Leg</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={journalForm.lines[1].accountCode}
                    onChange={(e) => {
                      const updated = [...journalForm.lines];
                      updated[1].accountCode = e.target.value;
                      setJournalForm({ ...journalForm, lines: updated });
                    }}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                  >
                    {coa.map((a) => (
                      <option key={a.code} value={a.code}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Credit Amount (₹)"
                    value={journalForm.lines[1].credit || ''}
                    onChange={(e) => {
                      const updated = [...journalForm.lines];
                      updated[1].credit = Number(e.target.value);
                      setJournalForm({ ...journalForm, lines: updated });
                    }}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Post Balanced Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
