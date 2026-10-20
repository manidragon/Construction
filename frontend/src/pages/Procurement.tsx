import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Supplier, PurchaseOrder, GoodsReceiptNote, SupplierInvoice, Material } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  ShoppingBag,
  Plus,
  Truck,
  FileCheck,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';

export const Procurement: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects } = useProject();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pos' | 'grns' | 'invoices' | 'suppliers'>('pos');

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Forms
  const [poForm, setPoForm] = useState({
    projectId: '',
    supplierId: '',
    deliveryDueDate: '',
    termsConditions: 'Delivery at Site Store A. Test certificate required. Payment 30 days.',
    freightCharges: '0',
    items: [{ materialId: '', orderQty: '', unitPrice: '', taxPercent: '18' }],
  });

  const [grnForm, setGrnForm] = useState({
    purchaseOrderId: '',
    warehouseId: '',
    deliveryNoteNo: '',
    vehicleNo: '',
    remarks: '',
    items: [{ materialId: '', receivedQty: '', acceptedQty: '', rejectedQty: '0' }],
  });

  const [invForm, setInvForm] = useState({
    invoiceNumber: '',
    supplierId: '',
    purchaseOrderId: '',
    invoiceDate: '',
    dueDate: '',
    subtotal: '',
    taxAmount: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    supplierId: '',
    invoiceId: '',
    paymentDate: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNo: '',
    notes: '',
  });

  const [suppForm, setSuppForm] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    paymentTerms: 'Net 30 Days',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    openingBalance: '0',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, poRes, grnRes, invRes, matRes, whRes] = await Promise.all([
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getGRNs(),
        api.getSupplierInvoices(),
        api.getMaterials(),
        api.getWarehouses(),
      ]);

      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (poRes.success) setPurchaseOrders(poRes.purchaseOrders || []);
      if (grnRes.success) setGrns(grnRes.grns || []);
      if (invRes.success) setInvoices(invRes.invoices || []);
      if (matRes.success) setMaterials(matRes.materials || []);
      if (whRes.success) setWarehouses(whRes.warehouses || []);
    } catch (err) {
      console.error('Failed to load procurement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPurchaseOrder(poForm);
      if (res.success) {
        setShowPOModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create PO');
    }
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createGRN(grnForm);
      if (res.success) {
        setShowGRNModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record GRN');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSupplierInvoice(invForm);
      if (res.success) {
        setShowInvoiceModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to book supplier invoice');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.recordSupplierPayment(paymentForm);
      if (res.success) {
        setShowPaymentModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSupplier(suppForm);
      if (res.success) {
        setShowSupplierModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Procurement & Vendor Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Requisition to PO, Goods Receipt Notes (GRN), 3-way invoice matching, and supplier liabilities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasRole('OWNER', 'PURCHASE_MANAGER') && (
            <button
              onClick={() => setShowPOModal(true)}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Generate PO</span>
            </button>
          )}

          {hasRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER') && (
            <button
              onClick={() => setShowGRNModal(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2 rounded-xl text-xs border border-slate-200 transition"
            >
              <Truck className="w-4 h-4" />
              <span>Record GRN</span>
            </button>
          )}

          {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
            <>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Book Vendor Invoice
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Pay Vendor
              </button>
            </>
          )}

          {hasRole('OWNER', 'PURCHASE_MANAGER') && (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition"
              title="Add New Supplier"
            >
              <Building className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'pos', label: `Purchase Orders (${purchaseOrders.length})`, icon: ShoppingBag },
          { id: 'grns', label: `Goods Receipts / GRN (${grns.length})`, icon: Truck },
          { id: 'invoices', label: `Vendor Invoices (${invoices.length})`, icon: FileCheck },
          { id: 'suppliers', label: `Suppliers & Balances (${suppliers.length})`, icon: Building },
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

      {/* Tab 1: Purchase Orders */}
      {activeTab === 'pos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3">PO Number</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">PO Date</th>
                  <th className="py-3 px-3">Delivery Due</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Tax (GST)</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{po.poNumber}</td>
                    <td className="py-3 px-3 text-slate-700">[{po.project?.code}] {po.project?.name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{po.supplier?.name}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(po.poDate)}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(po.deliveryDueDate)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(po.subtotal)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(po.taxAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(po.totalAmount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Goods Receipts (GRN) */}
      {activeTab === 'grns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Goods Receipt Notes (Physical Inward)</h3>
            <span className="text-xs text-slate-500">Only verified GRN updates physical stock</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-3">GRN #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Linked PO</th>
                  <th className="py-3 px-3">Warehouse / Store</th>
                  <th className="py-3 px-3">Delivery Challan</th>
                  <th className="py-3 px-3">Vehicle #</th>
                  <th className="py-3 px-3">Received By</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {grns.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{g.grnNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(g.grnDate)}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{g.purchaseOrder?.poNumber}</td>
                    <td className="py-3 px-3 text-slate-700">{g.warehouse?.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{g.deliveryNoteNo || '—'}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{g.vehicleNo || '—'}</td>
                    <td className="py-3 px-3 text-slate-700">{g.receivedBy?.name}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Supplier Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Invoice Date</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 text-right">Taxable Subtotal</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-3 text-right">Total Payable</th>
                  <th className="py-3 px-3 text-right">Paid Amount</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{inv.supplier?.name}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(inv.subtotal)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(inv.taxAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">{formatCurrency(inv.paidAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">{formatCurrency(inv.balanceDue)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Suppliers Master */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {s.code}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{s.gstin}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{s.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{s.address}, {s.city}</p>
                <div className="mt-3 text-xs space-y-1">
                  <p className="text-slate-600">Contact: <strong className="text-slate-800">{s.contactPerson}</strong></p>
                  <p className="text-slate-600">Phone: {s.phone}</p>
                  <p className="text-slate-600">Terms: {s.paymentTerms}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Current Payable:</span>
                <strong className="text-sm font-extrabold text-rose-600 font-mono">
                  {formatCurrency(s.currentBalance)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Generate Purchase Order (PO)</h3>
              <button onClick={() => setShowPOModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePO} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                  <select
                    required
                    value={poForm.projectId}
                    onChange={(e) => setPoForm({ ...poForm, projectId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Due Date *</label>
                  <input
                    type="date"
                    required
                    value={poForm.deliveryDueDate}
                    onChange={(e) => setPoForm({ ...poForm, deliveryDueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Freight / Delivery Charges (₹)</label>
                  <input
                    type="number"
                    value={poForm.freightCharges}
                    onChange={(e) => setPoForm({ ...poForm, freightCharges: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Line item */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Order Line Item</span>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Material *</label>
                  <select
                    required
                    value={poForm.items[0].materialId}
                    onChange={(e) => {
                      const sel = materials.find((m) => m.id === e.target.value);
                      const updated = [...poForm.items];
                      updated[0].materialId = e.target.value;
                      if (sel) {
                        updated[0].unitPrice = String(sel.standardPrice);
                        updated[0].taxPercent = String(sel.taxPercent);
                      }
                      setPoForm({ ...poForm, items: updated });
                    }}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Material</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>[{m.code}] {m.name} ({m.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Order Quantity</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 100"
                      value={poForm.items[0].orderQty}
                      onChange={(e) => {
                        const updated = [...poForm.items];
                        updated[0].orderQty = e.target.value;
                        setPoForm({ ...poForm, items: updated });
                      }}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Unit Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={poForm.items[0].unitPrice}
                      onChange={(e) => {
                        const updated = [...poForm.items];
                        updated[0].unitPrice = e.target.value;
                        setPoForm({ ...poForm, items: updated });
                      }}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">GST %</label>
                    <input
                      type="number"
                      value={poForm.items[0].taxPercent}
                      onChange={(e) => {
                        const updated = [...poForm.items];
                        updated[0].taxPercent = e.target.value;
                        setPoForm({ ...poForm, items: updated });
                      }}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Terms & Conditions</label>
                <input
                  type="text"
                  value={poForm.termsConditions}
                  onChange={(e) => setPoForm({ ...poForm, termsConditions: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Create & Approve PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record GRN Modal */}
      {showGRNModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Goods Receipt Note (GRN)</h3>
              <button onClick={() => setShowGRNModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGRN} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Purchase Order *</label>
                <select
                  required
                  value={grnForm.purchaseOrderId}
                  onChange={(e) => {
                    const selPO = purchaseOrders.find((p) => p.id === e.target.value);
                    setGrnForm({
                      ...grnForm,
                      purchaseOrderId: e.target.value,
                      items: selPO?.items?.length ? [{
                        materialId: selPO.items[0].materialId,
                        receivedQty: String(selPO.items[0].orderQty),
                        acceptedQty: String(selPO.items[0].orderQty),
                        rejectedQty: '0',
                      }] : grnForm.items,
                    });
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select PO</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      [{po.poNumber}] {po.supplier?.name} (₹{po.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Receiving Warehouse / Site Store *</label>
                <select
                  required
                  value={grnForm.warehouseId}
                  onChange={(e) => setGrnForm({ ...grnForm, warehouseId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Warehouse Store</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Challan #</label>
                  <input
                    type="text"
                    placeholder="DC-9921"
                    value={grnForm.deliveryNoteNo}
                    onChange={(e) => setGrnForm({ ...grnForm, deliveryNoteNo: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle No</label>
                  <input
                    type="text"
                    placeholder="KA-01-EA-4412"
                    value={grnForm.vehicleNo}
                    onChange={(e) => setGrnForm({ ...grnForm, vehicleNo: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Received Quantity *</label>
                  <input
                    type="number"
                    required
                    value={grnForm.items[0]?.receivedQty}
                    onChange={(e) => {
                      const updated = [...grnForm.items];
                      updated[0].receivedQty = e.target.value;
                      updated[0].acceptedQty = e.target.value;
                      setGrnForm({ ...grnForm, items: updated });
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accepted Quantity *</label>
                  <input
                    type="number"
                    required
                    value={grnForm.items[0]?.acceptedQty}
                    onChange={(e) => {
                      const updated = [...grnForm.items];
                      updated[0].acceptedQty = e.target.value;
                      setGrnForm({ ...grnForm, items: updated });
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Remarks</label>
                <input
                  type="text"
                  placeholder="Material quality verified, intact packaging"
                  value={grnForm.remarks}
                  onChange={(e) => setGrnForm({ ...grnForm, remarks: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGRNModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Verify & Inward Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Vendor Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Book Supplier Bill / Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Invoice # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-BLJ-5510"
                  value={invForm.invoiceNumber}
                  onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={invForm.supplierId}
                    onChange={(e) => setInvForm({ ...invForm, supplierId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Linked PO</label>
                  <select
                    value={invForm.purchaseOrderId}
                    onChange={(e) => {
                      const selPO = purchaseOrders.find((p) => p.id === e.target.value);
                      setInvForm({
                        ...invForm,
                        purchaseOrderId: e.target.value,
                        supplierId: selPO?.supplierId || invForm.supplierId,
                        subtotal: selPO ? String(selPO.subtotal) : invForm.subtotal,
                        taxAmount: selPO ? String(selPO.taxAmount) : invForm.taxAmount,
                      });
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">None / Direct</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>{po.poNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invForm.invoiceDate}
                    onChange={(e) => setInvForm({ ...invForm, invoiceDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invForm.dueDate}
                    onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subtotal (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="150000"
                    value={invForm.subtotal}
                    onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="27000"
                    value={invForm.taxAmount}
                    onChange={(e) => setInvForm({ ...invForm, taxAmount: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
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
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
                >
                  Book Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Vendor Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Vendor Payment Voucher</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                <select
                  required
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Payable: {formatCurrency(s.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link to Unpaid Invoice</label>
                <select
                  value={paymentForm.invoiceId}
                  onChange={(e) => {
                    const selInv = invoices.find((inv) => inv.id === e.target.value);
                    setPaymentForm({
                      ...paymentForm,
                      invoiceId: e.target.value,
                      supplierId: selInv?.supplierId || paymentForm.supplierId,
                      amount: selInv ? String(selInv.balanceDue) : paymentForm.amount,
                    });
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">None / On Account Payment</option>
                  {invoices.filter((inv) => inv.balanceDue > 0).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.invoiceNumber}] {inv.supplier?.name} (Bal: {formatCurrency(inv.balanceDue)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Method *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Reference / UTR #</label>
                <input
                  type="text"
                  placeholder="e.g. HDFCR52024101900124"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Disburse & Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New Material Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="SUP-STEEL-01"
                    value={suppForm.code}
                    onChange={(e) => setSuppForm({ ...suppForm, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Shree Balaji Cements"
                    value={suppForm.name}
                    onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
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
                    placeholder="+91 98450 11223"
                    value={suppForm.phone}
                    onChange={(e) => setSuppForm({ ...suppForm, phone: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="29AAGCB1234F1Z8"
                    value={suppForm.gstin}
                    onChange={(e) => setSuppForm({ ...suppForm, gstin: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 22, Industrial Suburb"
                  value={suppForm.address}
                  onChange={(e) => setSuppForm({ ...suppForm, address: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
