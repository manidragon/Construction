import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Client, ClientInvoice, ClientReceipt } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  FileText,
  Plus,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Printer,
  X,
} from 'lucide-react';

export const Billing: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || (projects[0]?.id || ''));
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'clients'>('invoices');
  const [printInvoice, setPrintInvoice] = useState<ClientInvoice | null>(null);

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  // Forms
  const [invForm, setInvForm] = useState({
    invoiceNumber: '',
    clientId: '',
    projectId: '',
    invoiceType: 'RUNNING_ACCOUNT_RA',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    workPeriodStart: '',
    workPeriodEnd: '',
    subtotal: '',
    retentionPercent: '5.0',
    tdsPercent: '2.0',
    gstPercent: '18.0',
    certificationNotes: 'Joint measurement certified by Client Chief Project Manager and Consulting Architect.',
  });

  const [receiptForm, setReceiptForm] = useState({
    clientId: '',
    projectId: '',
    invoiceId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'NEFT_RTGS',
    referenceNo: '',
    notes: '',
  });

  const [clientForm, setClientForm] = useState({
    code: '',
    name: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    billingAddress: '',
    gstin: '',
    pan: '',
  });

  useEffect(() => {
    if (selectedProjectId) setProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cliRes, invRes, rcpRes] = await Promise.all([
        api.getClients(),
        api.getClientInvoices(projectId ? `projectId=${projectId}` : ''),
        api.getClientReceipts(projectId ? `projectId=${projectId}` : ''),
      ]);

      if (cliRes.success) setClients(cliRes.clients || []);
      if (invRes.success) {
        setInvoices(invRes.invoices || []);
        setSummary(invRes.summary || {});
      }
      if (rcpRes.success) setReceipts(rcpRes.receipts || []);
    } catch (err) {
      console.error('Failed to load billing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createClientInvoice({ ...invForm, projectId });
      if (res.success) {
        setShowInvoiceModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    }
  };

  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.recordClientReceipt({ ...receiptForm, projectId });
      if (res.success) {
        setShowReceiptModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record receipt');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createClient(clientForm);
      if (res.success) {
        setShowClientModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create client');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Client Billing, RA Bills & Collections
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified Running Account (RA) bill generation, statutory 5% retention, 2% TDS, and RTGS collections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
            <>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Generate RA Bill</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Record Client Payment
              </button>
              <button
                onClick={() => setShowClientModal(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition"
                title="Add Client"
              >
                <Building className="w-4 h-4" />
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Invoiced (Net Billing)</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(summary?.totalBilled || 0)}</p>
          <span className="text-[10px] text-slate-400">Total certified RA bills generated</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Cash Collected</span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(summary?.totalCollected || 0)}</p>
          <span className="text-[10px] text-slate-400">Net RTGS/NEFT payments deposited</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Outstanding Client Receivables</span>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{formatCurrency(summary?.totalOutstanding || 0)}</p>
          <span className="text-[10px] text-slate-400">Due against approved invoices</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'invoices' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Running Account (RA) Bills ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'receipts' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Client Receipts ({receipts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'clients' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Client Directory ({clients.length})</span>
        </button>
      </div>

      {/* Tab 1: RA Bills */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3">Bill #</th>
                  <th className="py-3 px-3">Project & Client</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 text-right">Certified Subtotal</th>
                  <th className="py-3 px-3 text-right">Retention (5%)</th>
                  <th className="py-3 px-3 text-right">TDS (2%)</th>
                  <th className="py-3 px-3 text-right">GST (18%)</th>
                  <th className="py-3 px-3 text-right">Net Bill Amount</th>
                  <th className="py-3 px-3 text-right">Collected</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">{inv.project?.name}</strong>
                      <span className="text-[10px] text-slate-500">{inv.client?.name || 'Prestige Urban'}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{formatCurrency(inv.subtotal)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">-{formatCurrency(inv.retentionAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">-{formatCurrency(inv.tdsAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">+{formatCurrency(inv.gstAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">{formatCurrency(inv.netInvoiceAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">{formatCurrency(inv.paidAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">{formatCurrency(inv.balanceDue)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                        title="Print RA Bill Voucher"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Client Receipts */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Client Payments Received (RTGS/NEFT/Cheques)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-3">Receipt #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Project & Client</th>
                  <th className="py-3 px-3">Linked Bill</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Bank UTR / Ref</th>
                  <th className="py-3 px-3 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {receipts.map((rcp) => (
                  <tr key={rcp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{rcp.receiptNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(rcp.receiptDate)}</td>
                    <td className="py-3 px-3 text-slate-800">
                      <strong>{rcp.project?.name}</strong>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">{rcp.invoice?.invoiceNumber || '—'}</td>
                    <td className="py-3 px-3 font-semibold text-slate-600">{rcp.paymentMethod}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rcp.referenceNo || '—'}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 text-sm">
                      {formatCurrency(rcp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Clients */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {clients.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {c.code}
                </span>
                <span className="text-xs font-mono text-slate-400">{c.gstin || 'No GST'}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">{c.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{c.billingAddress}</p>
              <div className="mt-3 text-xs space-y-1 text-slate-600">
                <p>Contact: <strong>{c.contactPerson}</strong></p>
                <p>Phone: {c.phone}</p>
                <p>Email: {c.email || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate RA Bill Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full my-8 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Generate Running Account (RA) Bill</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RA Bill # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RA-04-SKYLINE"
                    value={invForm.invoiceNumber}
                    onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client *</label>
                  <select
                    required
                    value={invForm.clientId}
                    onChange={(e) => setInvForm({ ...invForm, clientId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Certified Work Done Subtotal (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000000"
                  value={invForm.subtotal}
                  onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">Retention %</label>
                  <input
                    type="number"
                    value={invForm.retentionPercent}
                    onChange={(e) => setInvForm({ ...invForm, retentionPercent: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">TDS (194C) %</label>
                  <input
                    type="number"
                    value={invForm.tdsPercent}
                    onChange={(e) => setInvForm({ ...invForm, tdsPercent: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">GST (18%)</label>
                  <input
                    type="number"
                    value={invForm.gstPercent}
                    onChange={(e) => setInvForm({ ...invForm, gstPercent: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={invForm.invoiceDate}
                    onChange={(e) => setInvForm({ ...invForm, invoiceDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invForm.dueDate}
                    onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Architect / PMC Joint Certification Notes</label>
                <input
                  type="text"
                  value={invForm.certificationNotes}
                  onChange={(e) => setInvForm({ ...invForm, certificationNotes: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Generate RA Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Client Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Client Payment Received</h3>
              <button onClick={() => setShowReceiptModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordReceipt} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select RA Bill to Settle</label>
                <select
                  value={receiptForm.invoiceId}
                  onChange={(e) => {
                    const selInv = invoices.find((inv) => inv.id === e.target.value);
                    setReceiptForm({
                      ...receiptForm,
                      invoiceId: e.target.value,
                      clientId: selInv?.clientId || receiptForm.clientId,
                      amount: selInv ? String(selInv.balanceDue) : receiptForm.amount,
                    });
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Invoice</option>
                  {invoices.filter((i) => i.balanceDue > 0).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.invoiceNumber}] {inv.project?.name} (Bal: {formatCurrency(inv.balanceDue)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount Received (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10000000"
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Method *</label>
                  <select
                    value={receiptForm.paymentMethod}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="NEFT_RTGS">RTGS / NEFT</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank UTR / Transaction Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. RTGS/HDFCN24289004512"
                  value={receiptForm.referenceNo}
                  onChange={(e) => setReceiptForm({ ...receiptForm, referenceNo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Post Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New Client Master</h3>
              <button onClick={() => setShowClientModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="CLI-PRESTIGE"
                    value={clientForm.code}
                    onChange={(e) => setClientForm({ ...clientForm, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prestige Urban Developers"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 80 2559 1080"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="29AABCP1122K1Z9"
                    value={clientForm.gstin}
                    onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address *</label>
                <input
                  type="text"
                  required
                  placeholder="The Falcon Tower, Brunton Road, Bengaluru"
                  value={clientForm.billingAddress}
                  onChange={(e) => setClientForm({ ...clientForm, billingAddress: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Dialog */}
      {printInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">APEX BUILDTECH & INFRASTRUCTURE PVT. LTD.</h2>
                <p className="text-xs text-slate-500">GSTIN: 29AABCU9603R1ZM • Bangalore, Karnataka</p>
              </div>
              <button onClick={() => setPrintInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start justify-between text-xs">
              <div>
                <p className="text-slate-400">Billed To:</p>
                <h4 className="font-bold text-sm text-slate-900">{printInvoice.client?.name || 'Prestige Urban Developers Ltd'}</h4>
                <p className="text-slate-600 mt-0.5">{printInvoice.client?.billingAddress}</p>
                <p className="font-mono text-slate-500 mt-1">GSTIN: {printInvoice.client?.gstin || '29AABCP1122K1Z9'}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-extrabold text-slate-900 block">{printInvoice.invoiceNumber}</span>
                <span className="text-slate-500 block">Date: {formatDate(printInvoice.invoiceDate)}</span>
                <span className="text-slate-500 block">Due Date: {formatDate(printInvoice.dueDate)}</span>
                <span className="font-semibold text-amber-600 block mt-1">Project: {printInvoice.project?.name}</span>
              </div>
            </div>

            {/* Calculations Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Calculation</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Gross Certified Work Done (Subtotal)</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">Progress certified</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(printInvoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">Less: Contract Retention Money (Withheld)</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{printInvoice.retentionPercent}% on work done</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-700">-{formatCurrency(printInvoice.retentionAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">Less: TDS under Section 194C (Withheld)</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{printInvoice.tdsPercent}% TDS</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">-{formatCurrency(printInvoice.tdsAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">Add: Goods & Service Tax (CGST 9% + SGST 9%)</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{printInvoice.gstPercent}% GST</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">+{formatCurrency(printInvoice.gstAmount)}</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-900 font-bold text-sm">
                    <td className="py-3 px-3">NET AMOUNT PAYABLE BY CLIENT</td>
                    <td className="py-3 px-3 text-right text-slate-500 text-xs">Total payable</td>
                    <td className="py-3 px-3 text-right font-mono text-base font-extrabold text-slate-900">
                      {formatCurrency(printInvoice.netInvoiceAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Certification Statement */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <strong className="block text-slate-900 mb-0.5">Certification & Compliance:</strong>
              <p>{printInvoice.certificationNotes}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setPrintInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Formal RA Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
