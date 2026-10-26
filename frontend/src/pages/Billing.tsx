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
  Eye,
  Edit2,
  Trash2,
  Share2,
} from 'lucide-react';
import { ReceiptShareModal } from '../components/ReceiptShareModal';

export const Billing: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId, refreshProjects } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || '');
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'clients'>('invoices');
  const [printInvoice, setPrintInvoice] = useState<ClientInvoice | null>(null);
  const [sharingReceipt, setSharingReceipt] = useState<ClientReceipt | null>(null);

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  // View / Edit / Delete States
  const [viewingInvoice, setViewingInvoice] = useState<ClientInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<ClientInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<ClientInvoice | null>(null);
  const [editInvForm, setEditInvForm] = useState<any>({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    subtotal: '',
    retentionPercent: '5.0',
    tdsPercent: '2.0',
    gstPercent: '18.0',
    certificationNotes: '',
    status: 'APPROVED',
  });

  const [viewingReceipt, setViewingReceipt] = useState<ClientReceipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<ClientReceipt | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<ClientReceipt | null>(null);
  const [editReceiptForm, setEditReceiptForm] = useState<any>({
    receiptDate: '',
    amount: '',
    paymentMethod: 'NEFT_RTGS',
    referenceNo: '',
    notes: '',
  });

  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [editClientForm, setEditClientForm] = useState<any>({
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
    setProjectId(selectedProjectId || '');
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

  // Compute next sequential RA Bill number formatted with the project's identifier
  // e.g. RA-01-SKYLINE -> RA-02-Greenfield -> RA-03-SKYLINE
  const computeNextInvoiceNumber = (
    targetProjId: string,
    invoiceList: ClientInvoice[] = invoices,
    projectList: any[] = projects
  ) => {
    let maxNum = 0;
    for (const inv of invoiceList) {
      if (!inv.invoiceNumber) continue;
      const match =
        inv.invoiceNumber.match(/^RA-(\d+)/i) ||
        inv.invoiceNumber.match(/RA[^\d]*(\d+)/i) ||
        inv.invoiceNumber.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextSeq = maxNum + 1;
    const paddedSeq = String(nextSeq).padStart(2, '0');

    const selProj = projectList.find((p) => p.id === targetProjId);
    let projectTag = '';

    if (selProj) {
      // Derive project tag directly from the selected project's name
      if (selProj.name) {
        const words = selProj.name.trim().split(/\s+/);
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

      // Fallback to project code
      if (!projectTag && selProj.code) {
        projectTag = selProj.code.replace(/[^a-zA-Z0-9]/g, '');
      }
    }

    return projectTag ? `RA-${paddedSeq}-${projectTag}` : `RA-${paddedSeq}`;
  };

  const openGenerateInvoiceModal = async () => {
    const targetId = projectId || selectedProjectId || (projects[0]?.id || '');
    const selP = projects.find((p) => p.id === targetId);
    const matchedC = clients.find(
      (c) => c.name === selP?.clientName || c.companyName === selP?.clientName
    );
    const initialBillNumber = computeNextInvoiceNumber(targetId, invoices, projects);

    setInvForm({
      ...invForm,
      projectId: targetId,
      clientId: matchedC?.id || '',
      invoiceNumber: initialBillNumber,
      subtotal: selP ? String(selP.contractValue) : invForm.subtotal,
      retentionPercent: '5.0',
      tdsPercent: '2.0',
      gstPercent: '18.0',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setShowInvoiceModal(true);

    // Also fetch from backend in background to guarantee database sync
    try {
      const res = await api.getNextInvoiceNumber(targetId);
      if (res.success && res.nextInvoiceNumber) {
        setInvForm((prev) => ({
          ...prev,
          invoiceNumber: res.nextInvoiceNumber,
        }));
      }
    } catch (err) {
      // keep initialBillNumber
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetProjId = invForm.projectId || projectId || selectedProjectId || (projects[0]?.id || '');
      const res = await api.createClientInvoice({ ...invForm, projectId: targetProjId });
      if (res.success) {
        setShowInvoiceModal(false);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    }
  };

  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selInv = invoices.find((inv) => inv.id === receiptForm.invoiceId);
      const targetProjId =
        receiptForm.projectId ||
        selInv?.projectId ||
        projectId ||
        selectedProjectId ||
        (projects[0]?.id || '');

      const targetClientId =
        receiptForm.clientId ||
        selInv?.clientId ||
        '';

      const res = await api.recordClientReceipt({
        ...receiptForm,
        projectId: targetProjId,
        clientId: targetClientId,
      });
      if (res.success) {
        setShowReceiptModal(false);
        fetchData();
        refreshProjects();
        // Immediately open the Share Receipt modal so user can share with client after the transaction
        if (res.receipt) {
          setSharingReceipt(res.receipt);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record receipt');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanitized = {
        ...clientForm,
        phone: clientForm.phone ? clientForm.phone.replace(/\s+/g, '').trim() : '',
      };
      const res = await api.createClient(sanitized);
      if (res.success) {
        setShowClientModal(false);
        setClientForm({
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
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create client');
    }
  };

  const openEditInvoice = (inv: ClientInvoice) => {
    setEditingInvoice(inv);
    setEditInvForm({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      subtotal: String(inv.subtotal),
      retentionPercent: String(inv.retentionPercent),
      tdsPercent: String(inv.tdsPercent),
      gstPercent: String(inv.gstPercent),
      certificationNotes: inv.certificationNotes || '',
      status: inv.status,
    });
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      const res = await api.updateClientInvoice(editingInvoice.id, editInvForm);
      if (res.success) {
        setEditingInvoice(null);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update RA bill');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    try {
      const res = await api.deleteClientInvoice(deletingInvoice.id);
      if (res.success) {
        setDeletingInvoice(null);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete RA bill');
    }
  };

  const openEditReceipt = (rcp: ClientReceipt) => {
    setEditingReceipt(rcp);
    setEditReceiptForm({
      receiptDate: rcp.receiptDate ? new Date(rcp.receiptDate).toISOString().split('T')[0] : '',
      amount: String(rcp.amount),
      paymentMethod: rcp.paymentMethod,
      referenceNo: rcp.referenceNo || '',
      notes: rcp.notes || '',
    });
  };

  const handleUpdateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;
    try {
      const res = await api.updateClientReceipt(editingReceipt.id, editReceiptForm);
      if (res.success) {
        setEditingReceipt(null);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update receipt');
    }
  };

  const handleDeleteReceipt = async () => {
    if (!deletingReceipt) return;
    try {
      const res = await api.deleteClientReceipt(deletingReceipt.id);
      if (res.success) {
        setDeletingReceipt(null);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete receipt');
    }
  };

  const openEditClient = (c: Client) => {
    setEditingClient(c);
    setEditClientForm({
      code: c.code,
      name: c.name,
      companyName: c.companyName || '',
      contactPerson: c.contactPerson || '',
      phone: c.phone ? c.phone.replace(/\s+/g, '') : '',
      email: c.email || '',
      billingAddress: c.billingAddress || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
    });
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const sanitized = {
        ...editClientForm,
        phone: editClientForm.phone ? editClientForm.phone.replace(/\s+/g, '').trim() : '',
      };
      const res = await api.updateClient(editingClient.id, sanitized);
      if (res.success) {
        setEditingClient(null);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update client');
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      const res = await api.deleteClient(deletingClient.id);
      if (res.success) {
        setDeletingClient(null);
        fetchData();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
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
                onClick={openGenerateInvoiceModal}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Generate RA Bill</span>
              </button>
              <button
                onClick={() => {
                  const targetProjId = projectId || selectedProjectId || (projects[0]?.id || '');
                  const defaultInv = invoices.find(
                    (i) => i.balanceDue > 0 && (!targetProjId || i.projectId === targetProjId)
                  );
                  setReceiptForm({
                    clientId: defaultInv?.clientId || '',
                    projectId: defaultInv?.projectId || targetProjId,
                    invoiceId: defaultInv ? defaultInv.id : '',
                    receiptDate: new Date().toISOString().split('T')[0],
                    amount: defaultInv ? String(defaultInv.balanceDue) : '',
                    paymentMethod: 'NEFT_RTGS',
                    referenceNo: '',
                    notes: '',
                  });
                  setShowReceiptModal(true);
                }}
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
                  <th className="py-3 px-3 text-center">Actions</th>
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
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View RA Bill Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit RA Bill"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete RA Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Print RA Bill"
                        >
                          <Printer className="w-4 h-4" />
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
                  <th className="py-3 px-3 text-center">Actions</th>
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
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSharingReceipt(rcp)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Share Receipt with Client (WhatsApp / PDF)"
                        >
                          <Share2 className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => setViewingReceipt(rcp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Receipt Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditReceipt(rcp)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Receipt"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingReceipt(rcp)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Receipt"
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

      {/* Tab 3: Clients */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {clients.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {c.code}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{c.gstin || 'No GST'}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{c.name}</h3>
                {c.companyName && c.companyName !== c.name && (
                  <p className="text-xs font-medium text-slate-500">{c.companyName}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">{c.billingAddress}</p>
                <div className="mt-3 text-xs space-y-1 text-slate-600">
                  <p>Contact: <strong>{c.contactPerson || '—'}</strong></p>
                  <p>Phone: {c.phone}</p>
                  <p>Email: {c.email || '—'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-1.5">
                <button
                  onClick={() => setViewingClient(c)}
                  className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center space-x-1 text-xs font-medium border border-slate-200"
                  title="View Client Profile"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => openEditClient(c)}
                  className="px-2.5 py-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition flex items-center space-x-1 text-xs font-medium border border-slate-200"
                  title="Edit Client"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setDeletingClient(c)}
                  className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center space-x-1 text-xs font-medium border border-slate-200"
                  title="Delete Client"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                <select
                  required
                  value={invForm.projectId || projectId || selectedProjectId || ''}
                  onChange={async (e) => {
                    const newProjId = e.target.value;
                    const selProj = projects.find((p) => p.id === newProjId);
                    const matchingClient = clients.find(
                      (c) => c.name === selProj?.clientName || c.companyName === selProj?.clientName
                    );
                    const updatedBillNumber = computeNextInvoiceNumber(newProjId, invoices, projects);
                    setInvForm({
                      ...invForm,
                      projectId: newProjId,
                      clientId: matchingClient?.id || invForm.clientId,
                      invoiceNumber: updatedBillNumber,
                      subtotal: selProj ? String(selProj.contractValue) : invForm.subtotal,
                      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    });

                    // Background verify with backend
                    try {
                      const res = await api.getNextInvoiceNumber(newProjId);
                      if (res.success && res.nextInvoiceNumber) {
                        setInvForm((prev) => ({
                          ...prev,
                          invoiceNumber: res.nextInvoiceNumber,
                        }));
                      }
                    } catch (err) {}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">RA Bill # *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const targetProj = invForm.projectId || projectId || selectedProjectId || (projects[0]?.id || '');
                        const nextNum = computeNextInvoiceNumber(targetProj, invoices, projects);
                        setInvForm({ ...invForm, invoiceNumber: nextNum });
                      }}
                      className="text-[10px] text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1"
                      title="Reset to next sequential bill number"
                    >
                      <span>⚡ Auto-Number</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RA-01-SKYLINE"
                    value={invForm.invoiceNumber}
                    onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Auto-generated next sequential number with project name.
                  </p>
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
                      projectId: selInv?.projectId || receiptForm.projectId,
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

              {receiptForm.invoiceId && (() => {
                const selInv = invoices.find((inv) => inv.id === receiptForm.invoiceId);
                return selInv ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Project:</span>
                      <strong className="text-slate-900">{selInv.project?.name}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Client:</span>
                      <strong className="text-slate-800">{selInv.client?.name || 'Prestige Urban'}</strong>
                    </div>
                  </div>
                ) : null;
              })()}

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
                    <option value="CASH">Cash</option>
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
                    placeholder="+918056694739 or 9876543210"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value.replace(/\s+/g, '') })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">No spaces needed between numbers</span>
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

      {/* View RA Bill Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {viewingInvoice.invoiceNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900">Running Account (RA) Bill Details</h3>
              </div>
              <button onClick={() => setViewingInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Project</span>
                <strong className="text-slate-900">{viewingInvoice.project?.name}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Client / Employer</span>
                <strong className="text-slate-900">{viewingInvoice.client?.name || 'Prestige Urban'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Bill Date</span>
                <strong className="text-slate-800">{formatDate(viewingInvoice.invoiceDate)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Due Date</span>
                <strong className="text-slate-800">{formatDate(viewingInvoice.dueDate)}</strong>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Component</th>
                    <th className="py-2.5 px-3 text-right">Calculation</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2 px-3 text-slate-900">Gross Certified Work Done</td>
                    <td className="py-2 px-3 text-right text-slate-500">Certified Subtotal</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(viewingInvoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">Contract Retention Withheld</td>
                    <td className="py-2 px-3 text-right text-slate-500">{viewingInvoice.retentionPercent}%</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-700">-{formatCurrency(viewingInvoice.retentionAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">TDS Deduction (Sec 194C)</td>
                    <td className="py-2 px-3 text-right text-slate-500">{viewingInvoice.tdsPercent}%</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">-{formatCurrency(viewingInvoice.tdsAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">GST (CGST + SGST)</td>
                    <td className="py-2 px-3 text-right text-slate-500">{viewingInvoice.gstPercent}%</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700">+{formatCurrency(viewingInvoice.gstAmount)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-2 px-3 text-slate-900">Net Invoice Amount</td>
                    <td className="py-2 px-3 text-right text-slate-500 text-[10px]">Net Payable</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-900 text-sm font-extrabold">{formatCurrency(viewingInvoice.netInvoiceAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">Paid / Collected Amount</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">Collections received</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(viewingInvoice.paidAmount)}</td>
                  </tr>
                  <tr className="bg-rose-50/50">
                    <td className="py-2 px-3 text-rose-900 font-bold">Current Balance Due</td>
                    <td className="py-2 px-3 text-right text-rose-500 text-[10px]">Outstanding</td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-rose-700">{formatCurrency(viewingInvoice.balanceDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {viewingInvoice.certificationNotes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400 block font-medium mb-0.5">Certification Notes</span>
                <p className="text-slate-700">{viewingInvoice.certificationNotes}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const toPrint = viewingInvoice;
                  setViewingInvoice(null);
                  setPrintInvoice(toPrint);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <Printer className="w-4 h-4" />
                <span>Formal Voucher</span>
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const toEdit = viewingInvoice;
                    setViewingInvoice(null);
                    openEditInvoice(toEdit);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                >
                  Edit Bill
                </button>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit RA Bill Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full my-8 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {editingInvoice.invoiceNumber}
                </span>
                <h3 className="text-sm font-bold text-slate-900">Edit Running Account (RA) Bill</h3>
              </div>
              <button onClick={() => setEditingInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateInvoice} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RA Bill # *</label>
                  <input
                    type="text"
                    required
                    value={editInvForm.invoiceNumber}
                    onChange={(e) => setEditInvForm({ ...editInvForm, invoiceNumber: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editInvForm.status}
                    onChange={(e) => setEditInvForm({ ...editInvForm, status: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="APPROVED">Approved / Outstanding</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="PAID">Fully Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={editInvForm.invoiceDate}
                    onChange={(e) => setEditInvForm({ ...editInvForm, invoiceDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={editInvForm.dueDate}
                    onChange={(e) => setEditInvForm({ ...editInvForm, dueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Certified Work Subtotal (₹) *</label>
                <input
                  type="number"
                  required
                  value={editInvForm.subtotal}
                  onChange={(e) => setEditInvForm({ ...editInvForm, subtotal: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Retention %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editInvForm.retentionPercent}
                    onChange={(e) => setEditInvForm({ ...editInvForm, retentionPercent: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">TDS 194C %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editInvForm.tdsPercent}
                    onChange={(e) => setEditInvForm({ ...editInvForm, tdsPercent: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">GST %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editInvForm.gstPercent}
                    onChange={(e) => setEditInvForm({ ...editInvForm, gstPercent: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Certification & Joint Inspection Notes</label>
                <textarea
                  rows={2}
                  value={editInvForm.certificationNotes}
                  onChange={(e) => setEditInvForm({ ...editInvForm, certificationNotes: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save RA Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete RA Bill Modal */}
      {deletingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete RA Bill?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deletingInvoice.invoiceNumber}</strong>? Net Amount: {formatCurrency(deletingInvoice.netInvoiceAmount)}.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInvoice}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition"
              >
                Yes, Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {viewingReceipt.receiptNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900">Client Payment Receipt</h3>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Receipt Date</span>
                <strong className="text-slate-800">{formatDate(viewingReceipt.receiptDate)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Payment Mode</span>
                <strong className="text-slate-800">{viewingReceipt.paymentMethod}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Project</span>
                <strong className="text-slate-800">{viewingReceipt.project?.name}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Linked Bill #</span>
                <strong className="text-slate-800 font-mono">{viewingReceipt.invoice?.invoiceNumber || 'Direct Payment'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2">
                <span className="text-[10px] text-slate-400 block font-medium">UTR / Transaction Ref</span>
                <strong className="text-slate-800 font-mono">{viewingReceipt.referenceNo || '—'}</strong>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-bold">Amount Deposited</span>
              <span className="font-mono text-base font-extrabold text-emerald-700">{formatCurrency(viewingReceipt.amount)}</span>
            </div>

            {viewingReceipt.notes && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400 block font-medium">Remarks / Notes</span>
                <p className="text-slate-700">{viewingReceipt.notes}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => {
                  const toShare = viewingReceipt;
                  setViewingReceipt(null);
                  setSharingReceipt(toShare);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center space-x-1 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Receipt</span>
              </button>
              <button
                onClick={() => {
                  const toEdit = viewingReceipt;
                  setViewingReceipt(null);
                  openEditReceipt(toEdit);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Edit Receipt
              </button>
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Receipt Modal */}
      {editingReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {editingReceipt.receiptNumber}
                </span>
                <h3 className="text-sm font-bold text-slate-900">Edit Client Receipt</h3>
              </div>
              <button onClick={() => setEditingReceipt(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateReceipt} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={editReceiptForm.receiptDate}
                    onChange={(e) => setEditReceiptForm({ ...editReceiptForm, receiptDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={editReceiptForm.paymentMethod}
                    onChange={(e) => setEditReceiptForm({ ...editReceiptForm, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS (HDFC)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={editReceiptForm.amount}
                  onChange={(e) => setEditReceiptForm({ ...editReceiptForm, amount: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank UTR / Cheque Ref</label>
                <input
                  type="text"
                  value={editReceiptForm.referenceNo}
                  onChange={(e) => setEditReceiptForm({ ...editReceiptForm, referenceNo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={editReceiptForm.notes}
                  onChange={(e) => setEditReceiptForm({ ...editReceiptForm, notes: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Receipt Modal */}
      {deletingReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Receipt?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete receipt <strong className="text-slate-800">{deletingReceipt.receiptNumber}</strong> of {formatCurrency(deletingReceipt.amount)}? The linked invoice balance will be updated automatically.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingReceipt(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReceipt}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition"
              >
                Yes, Delete Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Client Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {viewingClient.code}
                </span>
                <h3 className="text-base font-bold text-slate-900">{viewingClient.name}</h3>
              </div>
              <button onClick={() => setViewingClient(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Company Name</span>
                <strong className="text-slate-800">{viewingClient.companyName || viewingClient.name}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Contact Person</span>
                  <strong className="text-slate-800">{viewingClient.contactPerson || '—'}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Phone</span>
                  <strong className="text-slate-800">{viewingClient.phone}</strong>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Email</span>
                <strong className="text-slate-800">{viewingClient.email || '—'}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">GSTIN</span>
                  <strong className="text-slate-800 font-mono">{viewingClient.gstin || 'Unregistered'}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">PAN</span>
                  <strong className="text-slate-800 font-mono">{viewingClient.pan || '—'}</strong>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Registered Billing Address</span>
                <p className="text-slate-700 font-medium">{viewingClient.billingAddress}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => {
                  const toEdit = viewingClient;
                  setViewingClient(null);
                  openEditClient(toEdit);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Edit Client
              </button>
              <button
                onClick={() => setViewingClient(null)}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Edit Client Details</h3>
              <button onClick={() => setEditingClient(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateClient} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Code *</label>
                  <input
                    type="text"
                    required
                    value={editClientForm.code}
                    onChange={(e) => setEditClientForm({ ...editClientForm, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Group</label>
                  <input
                    type="text"
                    value={editClientForm.companyName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, companyName: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={editClientForm.name}
                  onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editClientForm.contactPerson}
                    onChange={(e) => setEditClientForm({ ...editClientForm, contactPerson: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+918056694739 or 9876543210"
                    value={editClientForm.phone}
                    onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value.replace(/\s+/g, '') })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">No spaces needed between numbers</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editClientForm.email}
                  onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={editClientForm.gstin}
                    onChange={(e) => setEditClientForm({ ...editClientForm, gstin: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={editClientForm.pan}
                    onChange={(e) => setEditClientForm({ ...editClientForm, pan: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={editClientForm.billingAddress}
                  onChange={(e) => setEditClientForm({ ...editClientForm, billingAddress: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
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

      {/* Delete Client Modal */}
      {deletingClient && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Client?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deletingClient.name}</strong> ({deletingClient.code})?
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingClient(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition"
              >
                Yes, Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Client Receipt Modal */}
      <ReceiptShareModal
        isOpen={!!sharingReceipt}
        receipt={sharingReceipt}
        onClose={() => setSharingReceipt(null)}
      />
    </div>
  );
};
