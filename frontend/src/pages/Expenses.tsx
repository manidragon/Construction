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
  Layers,
  Link2,
  TrendingUp,
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

  // BOQ & Task Selection Data
  const [projectBOQItems, setProjectBOQItems] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [loadingProjectLinks, setLoadingProjectLinks] = useState(false);

  // View / Edit / Delete States
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [editExpForm, setEditExpForm] = useState<any>({
    projectId: '',
    taskId: '',
    boqItemId: '',
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
    taskId: '',
    boqItemId: '',
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

  const fetchProjectLinks = async (pId: string) => {
    if (!pId) {
      setProjectBOQItems([]);
      setProjectTasks([]);
      return;
    }
    setLoadingProjectLinks(true);
    try {
      const [boqRes, tasksRes] = await Promise.all([
        api.getBOQ(pId).catch(() => ({ items: [] })),
        api.getTasks(`projectId=${pId}`).catch(() => ({ tasks: [] })),
      ]);
      setProjectBOQItems(boqRes.items || []);
      setProjectTasks(tasksRes.tasks || []);
    } catch (err) {
      console.error('Failed to load project BOQ/Tasks for expense:', err);
    } finally {
      setLoadingProjectLinks(false);
    }
  };

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

  const openCreateExpenseModal = () => {
    const targetProjId = expForm.projectId || projectId || selectedProjectId || (projects[0]?.id || '');
    setExpForm({
      projectId: targetProjId,
      taskId: '',
      boqItemId: '',
      category: 'INTERIOR_FITOUT',
      description: '',
      amountBeforeTax: '',
      taxAmount: '0',
      paymentMethod: 'BANK_TRANSFER',
      paidTo: '',
      invoiceReceiptNo: '',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    if (targetProjId) {
      fetchProjectLinks(targetProjId);
    }
    setShowExpenseModal(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetProjId = expForm.projectId || projectId || selectedProjectId || (projects[0]?.id || '');
      const res = await api.createExpense({
        ...expForm,
        projectId: targetProjId,
        taskId: expForm.taskId || undefined,
        boqItemId: expForm.boqItemId || undefined,
      });
      if (res.success) {
        setShowExpenseModal(false);
        fetchData();
        setExpForm({
          projectId: '',
          taskId: '',
          boqItemId: '',
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
      taskId: e.taskId || '',
      boqItemId: e.boqItemId || '',
      category: e.category,
      description: e.description,
      amountBeforeTax: String(e.amountBeforeTax),
      taxAmount: String(e.taxAmount),
      paymentMethod: e.paymentMethod,
      paidTo: e.paidTo,
      invoiceReceiptNo: e.invoiceReceiptNo || '',
      expenseDate: e.expenseDate ? new Date(e.expenseDate).toISOString().split('T')[0] : '',
    });
    if (e.projectId) {
      fetchProjectLinks(e.projectId);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const res = await api.updateExpense(editingExpense.id, {
        ...editExpForm,
        taskId: editExpForm.taskId || null,
        boqItemId: editExpForm.boqItemId || null,
      });
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
                onClick={openCreateExpenseModal}
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
                  <th className="py-3 px-3">Linked BOQ / Task</th>
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
                      {e.boqItem || e.task ? (
                        <div className="space-y-1">
                          {e.boqItem && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Layers className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              <span className="font-mono">[{e.boqItem.itemCode}]</span>
                              <span className="max-w-[110px] truncate" title={e.boqItem.description}>
                                {e.boqItem.description}
                              </span>
                            </div>
                          )}
                          {e.task && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Link2 className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span className="max-w-[110px] truncate" title={e.task.title}>
                                {e.task.title}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
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
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Direct Site & Fit-Out Expense</h3>
                <p className="text-xs text-slate-500 mt-0.5">Link direct expenditure to Project, Task, and BOQ Line Item with live variance mapping.</p>
              </div>
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
                  onChange={(e) => {
                    const pId = e.target.value;
                    setExpForm({ ...expForm, projectId: pId, taskId: '', boqItemId: '' });
                    fetchProjectLinks(pId);
                  }}
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

              {/* Task & BOQ Linkage Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-amber-600" />
                    <span>Link to Task (Optional)</span>
                  </label>
                  <select
                    value={expForm.taskId}
                    onChange={(e) => setExpForm({ ...expForm, taskId: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">-- No Task Assigned --</option>
                    {projectTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-600" />
                    <span>Link to BOQ Line Item (Optional)</span>
                  </label>
                  <select
                    value={expForm.boqItemId}
                    onChange={(e) => setExpForm({ ...expForm, boqItemId: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">-- No BOQ Item Linked --</option>
                    {projectBOQItems.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.itemCode}] {b.description.substring(0, 32)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time BOQ Variance Calculation Card */}
              {(() => {
                const selectedBOQ = projectBOQItems.find((b) => b.id === expForm.boqItemId);
                if (!selectedBOQ) return null;
                const est = selectedBOQ.estimatedTotal || 0;
                const currSpent = selectedBOQ.actualExpenditure || 0;
                const thisExp = Number(expForm.amountBeforeTax || 0) + Number(expForm.taxAmount || 0);
                const projectedSpent = currSpent + thisExp;
                const projectedVariance = est - projectedSpent;
                const isOverrun = projectedVariance < 0;

                return (
                  <div className={`p-3 rounded-xl border text-xs transition space-y-2 ${isOverrun ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <TrendingUp className={`w-3.5 h-3.5 ${isOverrun ? 'text-rose-600' : 'text-emerald-600'}`} />
                        <span className={isOverrun ? 'text-rose-900' : 'text-emerald-900'}>
                          Real-Time BOQ Line Variance: [{selectedBOQ.itemCode}]
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isOverrun ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'}`}>
                        {isOverrun ? 'Budget Overrun Alert' : 'Within Budget'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{selectedBOQ.description}</p>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Est Budget</span>
                        <strong className="font-mono text-slate-800">{formatCurrency(est)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Current Spend</span>
                        <strong className="font-mono text-slate-700">{formatCurrency(currSpent)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">+ This Expense</span>
                        <strong className="font-mono text-amber-700">{formatCurrency(thisExp)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Variance Left</span>
                        <strong className={`font-mono font-bold ${isOverrun ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(projectedVariance)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="INTERIOR_FITOUT">Interior Fit-Out & Finishes</option>
                    <option value="CARPENTRY_JOINERY">Carpentry & Joinery</option>
                    <option value="FALSE_CEILING">False Ceiling & Drywall</option>
                    <option value="MODULAR_KITCHENS">Modular Kitchens & Cabinets</option>
                    <option value="ELECTRICAL_LIGHTING">Electrical & Lighting</option>
                    <option value="PLUMBING_SANITARYWARE">Plumbing & Sanitaryware</option>
                    <option value="FLOORING_TILING">Flooring & Tiling</option>
                    <option value="PAINTING_WALLPAPERS">Painting & Wallpapers</option>
                    <option value="SOFT_FURNISHINGS">Soft Furnishings</option>
                    <option value="GLASS_ALUMINUM">Glass & Aluminum Work</option>
                    <option value="HVAC_AC">HVAC & Air Conditioning</option>
                    <option value="DIRECT_MATERIAL">Direct Material Purchase</option>
                    <option value="SUBCONTRACTOR">Subcontractor Payment</option>
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
                  placeholder="e.g. Italian marble adhesive & epoxy grout for master bedroom"
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
                  placeholder="e.g. Asian Paints Depot / Tile Vendor"
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

            {/* BOQ & Task Mapping Card */}
            {(viewingExpense.boqItem || viewingExpense.task) && (
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Linked BOQ Item & Task Allocation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewingExpense.boqItem && (
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Layers className="w-3 h-3 text-indigo-600" />
                        <span className="font-mono">[{viewingExpense.boqItem.itemCode}]</span>
                      </div>
                      <p className="text-slate-600 text-[11px] line-clamp-2">{viewingExpense.boqItem.description}</p>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">BOQ Budget: <strong className="font-mono text-slate-800">{formatCurrency(viewingExpense.boqItem.estimatedTotal || 0)}</strong></span>
                        <span className="text-slate-500">Actual Spend: <strong className="font-mono text-indigo-700">{formatCurrency(viewingExpense.boqItem.actualExpenditure || 0)}</strong></span>
                      </div>
                    </div>
                  )}
                  {viewingExpense.task && (
                    <div className="bg-white p-2.5 rounded-lg border border-amber-100 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Link2 className="w-3 h-3 text-amber-600" />
                        <span>{viewingExpense.task.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Assigned execution task under project work schedule</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {editingExpense.expenseNumber}
                </span>
                <h3 className="text-sm font-bold text-slate-900">Edit Direct Expense & Allocation</h3>
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
                  onChange={(e) => {
                    const pId = e.target.value;
                    setEditExpForm({ ...editExpForm, projectId: pId, taskId: '', boqItemId: '' });
                    fetchProjectLinks(pId);
                  }}
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

              {/* Task & BOQ Linkage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-amber-600" />
                    <span>Link to Task (Optional)</span>
                  </label>
                  <select
                    value={editExpForm.taskId}
                    onChange={(e) => setEditExpForm({ ...editExpForm, taskId: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">-- No Task Assigned --</option>
                    {projectTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-600" />
                    <span>Link to BOQ Line Item (Optional)</span>
                  </label>
                  <select
                    value={editExpForm.boqItemId}
                    onChange={(e) => setEditExpForm({ ...editExpForm, boqItemId: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">-- No BOQ Item Linked --</option>
                    {projectBOQItems.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.itemCode}] {b.description.substring(0, 32)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time BOQ Variance Calculation Card for Edit */}
              {(() => {
                const selectedBOQ = projectBOQItems.find((b) => b.id === editExpForm.boqItemId);
                if (!selectedBOQ) return null;
                const est = selectedBOQ.estimatedTotal || 0;
                // Subtract old expense if it was linked to the same BOQ item to calculate projected delta
                const oldExpenseOnThisBOQ = editingExpense.boqItemId === selectedBOQ.id ? editingExpense.totalAmount : 0;
                const baseSpent = (selectedBOQ.actualExpenditure || 0) - oldExpenseOnThisBOQ;
                const newExpTotal = Number(editExpForm.amountBeforeTax || 0) + Number(editExpForm.taxAmount || 0);
                const projectedSpent = baseSpent + newExpTotal;
                const projectedVariance = est - projectedSpent;
                const isOverrun = projectedVariance < 0;

                return (
                  <div className={`p-3 rounded-xl border text-xs transition space-y-2 ${isOverrun ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <TrendingUp className={`w-3.5 h-3.5 ${isOverrun ? 'text-rose-600' : 'text-emerald-600'}`} />
                        <span className={isOverrun ? 'text-rose-900' : 'text-emerald-900'}>
                          Reconciled BOQ Variance: [{selectedBOQ.itemCode}]
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isOverrun ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'}`}>
                        {isOverrun ? 'Budget Overrun Alert' : 'Within Budget'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{selectedBOQ.description}</p>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Est Budget</span>
                        <strong className="font-mono text-slate-800">{formatCurrency(est)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Net Other Spend</span>
                        <strong className="font-mono text-slate-700">{formatCurrency(baseSpent)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Updated Expense</span>
                        <strong className="font-mono text-amber-700">{formatCurrency(newExpTotal)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Variance Left</span>
                        <strong className={`font-mono font-bold ${isOverrun ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(projectedVariance)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category</label>
                  <select
                    value={editExpForm.category}
                    onChange={(e) => setEditExpForm({ ...editExpForm, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="INTERIOR_FITOUT">Interior Fit-Out & Finishes</option>
                    <option value="CARPENTRY_JOINERY">Carpentry & Joinery</option>
                    <option value="FALSE_CEILING">False Ceiling & Drywall</option>
                    <option value="MODULAR_KITCHENS">Modular Kitchens & Cabinets</option>
                    <option value="ELECTRICAL_LIGHTING">Electrical & Lighting</option>
                    <option value="PLUMBING_SANITARYWARE">Plumbing & Sanitaryware</option>
                    <option value="FLOORING_TILING">Flooring & Tiling</option>
                    <option value="PAINTING_WALLPAPERS">Painting & Wallpapers</option>
                    <option value="SOFT_FURNISHINGS">Soft Furnishings</option>
                    <option value="GLASS_ALUMINUM">Glass & Aluminum Work</option>
                    <option value="HVAC_AC">HVAC & Air Conditioning</option>
                    <option value="DIRECT_MATERIAL">Direct Material Purchase</option>
                    <option value="SUBCONTRACTOR">Subcontractor Payment</option>
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
