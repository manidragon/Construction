import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Expense, PettyCashAccount } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Receipt,
  Plus,
  Wallet,
  Building,
  CheckCircle2,
  X,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || (projects[0]?.id || ''));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyCashAccounts, setPettyCashAccounts] = useState<PettyCashAccount[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'pettyCash'>('expenses');

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Forms
  const [expForm, setExpForm] = useState({
    projectId: '',
    category: 'FUEL',
    description: '',
    amountBeforeTax: '',
    taxAmount: '0',
    paymentMethod: 'BANK_TRANSFER',
    paidTo: '',
    invoiceReceiptNo: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const [voucherForm, setVoucherForm] = useState({
    pettyCashAccountId: '',
    txnType: 'EXPENSE',
    amount: '',
    recipient: '',
    voucherNo: '',
    description: '',
  });

  useEffect(() => {
    if (selectedProjectId) setProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, pcRes] = await Promise.all([
        api.getExpenses(projectId ? `projectId=${projectId}` : ''),
        api.getPettyCashAccounts(projectId),
      ]);

      if (expRes.success) {
        setExpenses(expRes.expenses || []);
        setTotalExpenses(expRes.totalAmount || 0);
      }
      if (pcRes.success) {
        setPettyCashAccounts(pcRes.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createExpense({ ...expForm, projectId });
      if (res.success) {
        setShowExpenseModal(false);
        fetchData();
        setExpForm({
          projectId: '',
          category: 'FUEL',
          description: '',
          amountBeforeTax: '',
          taxAmount: '0',
          paymentMethod: 'BANK_TRANSFER',
          paidTo: '',
          invoiceReceiptNo: '',
          expenseDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const handleRecordVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.recordPettyCashTxn(voucherForm);
      if (res.success) {
        setShowVoucherModal(false);
        fetchData();
        setVoucherForm({
          pettyCashAccountId: '',
          txnType: 'EXPENSE',
          amount: '',
          recipient: '',
          voucherNo: '',
          description: '',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record petty cash voucher');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Site Expenses & Petty Cash Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Site overheads, fuel, equipment rental, petty cash imprest floats, and automated balanced journal postings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER') && (
            <>
              <button
                onClick={() => setShowVoucherModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition border border-slate-200"
              >
                Petty Cash Voucher
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Record Direct Expense</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Selector Bar */}
      <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
        <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Project:</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'expenses'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Direct Expense Register ({expenses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('pettyCash')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'pettyCash'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Site Petty Cash Floats ({pettyCashAccounts.length})</span>
        </button>
      </div>

      {/* Tab 1: Direct Expenses */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Direct Site & Office Expenses</h3>
            <span className="text-xs font-bold text-slate-900 font-mono">
              Total Incurred: {formatCurrency(totalExpenses)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3">Expense #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Paid To</th>
                  <th className="py-3 px-3 text-right">Taxable</th>
                  <th className="py-3 px-3 text-right">Tax</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{e.expenseNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(e.expenseDate)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{e.project?.name || 'General Office'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-900 max-w-xs truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{e.paidTo}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(e.amountBeforeTax)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(e.taxAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(e.totalAmount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Petty Cash */}
      {activeTab === 'pettyCash' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pettyCashAccounts.map((pc) => {
            const isLowFloat = pc.currentBalance <= pc.minFloatThreshold;
            return (
              <div key={pc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{pc.name}</h3>
                    <p className="text-xs text-slate-500">{pc.project?.name} • Custodian: {pc.custodian?.name}</p>
                  </div>
                  {isLowFloat && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span>Low Float</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Opening Float</span>
                    <strong className="text-sm font-bold text-slate-800">{formatCurrency(pc.openingBalance)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Current Balance in Hand</span>
                    <strong className={`text-base font-extrabold ${isLowFloat ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(pc.currentBalance)}
                    </strong>
                  </div>
                </div>

                {/* Vouchers list */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Recent Site Vouchers</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {(pc.transactions || []).map((t: any) => (
                      <div key={t.id} className="p-2 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{t.description}</span>
                          <span className="text-[10px] text-slate-400 block">{formatDate(t.txnDate)} • {t.recipient || 'Voucher'}</span>
                        </div>
                        <span className={`font-mono font-bold ${t.txnType === 'TOP_UP' ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {t.txnType === 'TOP_UP' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Direct Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Direct Site Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="FUEL">Fuel & Dewatering Diesel</option>
                    <option value="TRANSPORT">Transport & Vehicle Hire</option>
                    <option value="SAFETY_EQUIPMENT">Safety PPE & Gear</option>
                    <option value="EQUIPMENT_RENTAL">Equipment Rental</option>
                    <option value="REPAIRS">Site Machinery Repairs</option>
                    <option value="ELECTRICITY_WATER">Electricity & Water</option>
                    <option value="FOOD_ACCOMMODATION">Worker Food & Staging</option>
                    <option value="ADMIN_PERMITS">Site Permits & Licenses</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={expForm.paymentMethod}
                    onChange={(e) => setExpForm({ ...expForm, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (HDFC)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="PETTY_CASH">Site Petty Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 Litres Diesel for dewatering pump"
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paid To (Vendor/Person) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IOCL Petrol Outlet"
                  value={expForm.paidTo}
                  onChange={(e) => setExpForm({ ...expForm, paidTo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount Before Tax (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500"
                    value={expForm.amountBeforeTax}
                    onChange={(e) => setExpForm({ ...expForm, amountBeforeTax: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tax Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={expForm.taxAmount}
                    onChange={(e) => setExpForm({ ...expForm, taxAmount: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill / Cash Memo #</label>
                <input
                  type="text"
                  placeholder="e.g. CM-8812"
                  value={expForm.invoiceReceiptNo}
                  onChange={(e) => setExpForm({ ...expForm, invoiceReceiptNo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Petty Cash Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Petty Cash Voucher</h3>
              <button onClick={() => setShowVoucherModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordVoucher} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Petty Cash Float *</label>
                <select
                  required
                  value={voucherForm.pettyCashAccountId}
                  onChange={(e) => setVoucherForm({ ...voucherForm, pettyCashAccountId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Account</option>
                  {pettyCashAccounts.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.name} (Available: {formatCurrency(pc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type *</label>
                  <select
                    value={voucherForm.txnType}
                    onChange={(e) => setVoucherForm({ ...voucherForm, txnType: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="EXPENSE">Site Expense Voucher</option>
                    <option value="TOP_UP">Float Top-Up / Replenishment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient / Paid To</label>
                <input
                  type="text"
                  placeholder="e.g. Local Hardware Shop"
                  value={voucherForm.recipient}
                  onChange={(e) => setVoucherForm({ ...voucherForm, recipient: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nails, binding wire, emergency safety tape"
                  value={voucherForm.description}
                  onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
