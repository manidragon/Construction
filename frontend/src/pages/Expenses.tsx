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
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || '');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyCashAccounts, setPettyCashAccounts] = useState<PettyCashAccount[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'pettyCash'>('expenses');

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // View / Edit / Delete States
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [editExpForm, setEditExpForm] = useState<any>({
    projectId: '',
    category: 'FUEL',
    description: '',
    amountBeforeTax: '',
    taxAmount: '0',
    paymentMethod: 'BANK_TRANSFER',
    paidTo: '',
    invoiceReceiptNo: '',
    expenseDate: '',
  });

  const [viewingVoucher, setViewingVoucher] = useState<any | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<any | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState<any | null>(null);
  const [editVoucherForm, setEditVoucherForm] = useState<any>({
    description: '',
    recipient: '',
    voucherNo: '',
  });

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
    setProjectId(selectedProjectId || '');
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
      const targetProjId = expForm.projectId || projectId || selectedProjectId || (projects[0]?.id || '');
      const res = await api.createExpense({ ...expForm, projectId: targetProjId });
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

  const openEditExpense = (e: Expense) => {
    setEditingExpense(e);
    setEditExpForm({
      projectId: e.projectId || '',
      category: e.category,
      description: e.description,
      amountBeforeTax: String(e.amountBeforeTax),
      taxAmount: String(e.taxAmount),
      paymentMethod: e.paymentMethod,
      paidTo: e.paidTo,
      invoiceReceiptNo: e.invoiceReceiptNo || '',
      expenseDate: e.expenseDate ? new Date(e.expenseDate).toISOString().split('T')[0] : '',
    });
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const res = await api.updateExpense(editingExpense.id, editExpForm);
      if (res.success) {
        setEditingExpense(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update expense');
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      const res = await api.deleteExpense(deletingExpense.id);
      if (res.success) {
        setDeletingExpense(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const openEditVoucher = (v: any) => {
    setEditingVoucher(v);
    setEditVoucherForm({
      description: v.description,
      recipient: v.recipient || '',
      voucherNo: v.voucherNo || '',
    });
  };

  const handleUpdateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher) return;
    try {
      const res = await api.updatePettyCashTxn(editingVoucher.id, editVoucherForm);
      if (res.success) {
        setEditingVoucher(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update voucher');
    }
  };

  const handleDeleteVoucher = async () => {
    if (!deletingVoucher) return;
    try {
      const res = await api.deletePettyCashTxn(deletingVoucher.id);
      if (res.success) {
        setDeletingVoucher(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete voucher');
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
        <label className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">Filter Project:</label>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setSelectedProjectId(e.target.value);
          }}
          className="text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm min-w-[280px] sm:min-w-[340px] md:min-w-[400px] cursor-pointer transition"
        >
          <option value="">🌐 All Projects</option>
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
                  <th className="py-3 px-3 text-center">Actions</th>
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
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setViewingExpense(e)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Expense Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditExpense(e)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(e)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {(pc.transactions || []).map((t: any) => (
                      <div key={t.id} className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between border border-slate-100 hover:border-slate-200 transition">
                        <div className="pr-2">
                          <span className="font-semibold text-slate-900 block">{t.description}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {formatDate(t.txnDate)} • {t.recipient || 'Voucher'} {t.voucherNo ? `• #${t.voucherNo}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`font-mono font-bold ${t.txnType === 'TOP_UP' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {t.txnType === 'TOP_UP' ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                          <div className="flex items-center space-x-0.5 border-l border-slate-200 pl-1.5">
                            <button
                              onClick={() => setViewingVoucher(t)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="View Voucher"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditVoucher(t)}
                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Edit Voucher"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingVoucher(t)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(pc.transactions || []).length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-3">No vouchers recorded yet</p>
                    )}
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                <select
                  required
                  value={expForm.projectId || projectId || selectedProjectId || ''}
                  onChange={(e) => setExpForm({ ...expForm, projectId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

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

      {/* View Expense Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {viewingExpense.expenseNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900">Direct Expense Details</h3>
              </div>
              <button onClick={() => setViewingExpense(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Date</span>
                <strong className="text-slate-800">{formatDate(viewingExpense.expenseDate)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Category</span>
                <strong className="text-slate-800">{viewingExpense.category}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Project</span>
                <strong className="text-slate-800">{viewingExpense.project?.name || 'General Office'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Paid To / Vendor</span>
                <strong className="text-slate-800">{viewingExpense.paidTo}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Payment Mode</span>
                <strong className="text-slate-800">{viewingExpense.paymentMethod}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Bill / Memo #</span>
                <strong className="text-slate-800 font-mono">{viewingExpense.invoiceReceiptNo || '—'}</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] text-slate-400 block font-medium mb-1">Description</span>
              <p className="text-slate-800 font-medium">{viewingExpense.description}</p>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Taxable Subtotal</span>
                <strong className="font-mono text-slate-800">{formatCurrency(viewingExpense.amountBeforeTax)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Tax (GST)</span>
                <strong className="font-mono text-slate-600">{formatCurrency(viewingExpense.taxAmount)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-amber-700 block font-bold">Total Incurred</span>
                <strong className="font-mono text-slate-900 font-extrabold text-sm">{formatCurrency(viewingExpense.totalAmount)}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => {
                  const toEdit = viewingExpense;
                  setViewingExpense(null);
                  openEditExpense(toEdit);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Edit Expense
              </button>
              <button
                onClick={() => setViewingExpense(null)}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {editingExpense.expenseNumber}
                </span>
                <h3 className="text-sm font-bold text-slate-900">Edit Direct Expense</h3>
              </div>
              <button onClick={() => setEditingExpense(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
                <select
                  value={editExpForm.projectId}
                  onChange={(e) => setEditExpForm({ ...editExpForm, projectId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">General Office</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category</label>
                  <select
                    value={editExpForm.category}
                    onChange={(e) => setEditExpForm({ ...editExpForm, category: e.target.value })}
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
                    value={editExpForm.paymentMethod}
                    onChange={(e) => setEditExpForm({ ...editExpForm, paymentMethod: e.target.value })}
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
                  value={editExpForm.description}
                  onChange={(e) => setEditExpForm({ ...editExpForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paid To (Vendor/Person) *</label>
                <input
                  type="text"
                  required
                  value={editExpForm.paidTo}
                  onChange={(e) => setEditExpForm({ ...editExpForm, paidTo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Taxable Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editExpForm.amountBeforeTax}
                    onChange={(e) => setEditExpForm({ ...editExpForm, amountBeforeTax: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tax Amount (₹)</label>
                  <input
                    type="number"
                    value={editExpForm.taxAmount}
                    onChange={(e) => setEditExpForm({ ...editExpForm, taxAmount: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill / Cash Memo #</label>
                  <input
                    type="text"
                    value={editExpForm.invoiceReceiptNo}
                    onChange={(e) => setEditExpForm({ ...editExpForm, invoiceReceiptNo: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editExpForm.expenseDate}
                    onChange={(e) => setEditExpForm({ ...editExpForm, expenseDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Expense?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deletingExpense.expenseNumber}</strong> ({deletingExpense.description})? This will also remove any linked auto-journal entries.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExpense}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition"
              >
                Yes, Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Voucher Modal */}
      {viewingVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {viewingVoucher.voucherNo ? `VOUCHER #${viewingVoucher.voucherNo}` : 'PETTY CASH TXN'}
                </span>
                <h3 className="text-base font-bold text-slate-900">Voucher Details</h3>
              </div>
              <button onClick={() => setViewingVoucher(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Date</span>
                <strong className="text-slate-800">{formatDate(viewingVoucher.txnDate)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Transaction Type</span>
                <strong className={viewingVoucher.txnType === 'TOP_UP' ? 'text-emerald-600' : 'text-slate-800'}>
                  {viewingVoucher.txnType === 'TOP_UP' ? 'Float Top-Up' : 'Site Expense'}
                </strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Recipient / Paid To</span>
                <strong className="text-slate-800">{viewingVoucher.recipient || '—'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Voucher Amount</span>
                <strong className="text-slate-900 font-mono text-sm font-extrabold">{formatCurrency(viewingVoucher.amount)}</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] text-slate-400 block font-medium mb-1">Description</span>
              <p className="text-slate-800 font-medium">{viewingVoucher.description}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => {
                  const toEdit = viewingVoucher;
                  setViewingVoucher(null);
                  openEditVoucher(toEdit);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Edit Voucher
              </button>
              <button
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Voucher Modal */}
      {editingVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Edit Petty Cash Voucher</h3>
              <button onClick={() => setEditingVoucher(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateVoucher} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Voucher #</label>
                <input
                  type="text"
                  value={editVoucherForm.voucherNo}
                  onChange={(e) => setEditVoucherForm({ ...editVoucherForm, voucherNo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient / Paid To</label>
                <input
                  type="text"
                  value={editVoucherForm.recipient}
                  onChange={(e) => setEditVoucherForm({ ...editVoucherForm, recipient: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={editVoucherForm.description}
                  onChange={(e) => setEditVoucherForm({ ...editVoucherForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Voucher Modal */}
      {deletingVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Voucher?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this voucher of <strong className="text-slate-800">{formatCurrency(deletingVoucher.amount)}</strong>? The float balance will automatically be adjusted.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingVoucher(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVoucher}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
