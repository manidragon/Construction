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
  Eye,
  Edit2,
  Trash2,
  Printer,
  AlertTriangle,
  Package,
  Sparkles,
  Filter,
  Search,
} from 'lucide-react';

export const Procurement: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
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

  // View, Edit, Delete PO state
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editPoForm, setEditPoForm] = useState({
    supplierId: '',
    deliveryDueDate: '',
    freightCharges: '0',
    termsConditions: '',
    items: [{ materialId: '', orderQty: '', unitPrice: '', taxPercent: '0' }],
  });
  const [isUpdatingPO, setIsUpdatingPO] = useState(false);
  const [deletingPO, setDeletingPO] = useState<PurchaseOrder | null>(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick Material Creation state (for PO line items & upcoming selection)
  const [showQuickMaterialModal, setShowQuickMaterialModal] = useState(false);
  const [quickMaterialTarget, setQuickMaterialTarget] = useState<'PO' | 'EDIT_PO'>('PO');
  const [quickMaterialItemIndex, setQuickMaterialItemIndex] = useState<number>(0);
  const [quickMaterialForm, setQuickMaterialForm] = useState({
    code: '',
    name: '',
    category: 'GENERAL',
    brand: '',
    unit: 'NOS',
    standardPrice: '',
    taxPercent: '18',
    minStockLevel: '10',
    reorderQty: '50',
  });
  const [isSubmittingQuickMaterial, setIsSubmittingQuickMaterial] = useState(false);
  const [quickMaterialError, setQuickMaterialError] = useState<string | null>(null);

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

  // Viewing & Filtering Vendor Invoices state
  const [viewingInvoice, setViewingInvoice] = useState<SupplierInvoice | null>(null);
  const [invoiceProjectFilter, setInvoiceProjectFilter] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');

  const [invForm, setInvForm] = useState({
    invoiceNumber: '',
    supplierId: '',
    purchaseOrderId: '',
    projectId: '',
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
        api.getPurchaseOrders(selectedProjectId ? `projectId=${selectedProjectId}` : ''),
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
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      setInvoiceProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId]);

  const getInvoiceProject = (inv: SupplierInvoice) => {
    if (inv.project) return inv.project;
    if (inv.purchaseOrder?.project) return inv.purchaseOrder.project;
    if (inv.projectId) {
      const p = projects.find((proj) => proj.id === inv.projectId);
      if (p) return p;
    }
    return null;
  };

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

  const openEditPOModal = (po: PurchaseOrder) => {
    setEditingPO(po);
    setEditPoForm({
      supplierId: po.supplierId || '',
      deliveryDueDate: po.deliveryDueDate ? po.deliveryDueDate.split('T')[0] : '',
      freightCharges: String(po.freightCharges || 0),
      termsConditions: po.termsConditions || '',
      items: po.items && po.items.length > 0
        ? po.items.map((it) => ({
            materialId: it.materialId,
            orderQty: String(it.orderQty),
            unitPrice: String(it.unitPrice),
            taxPercent: String(it.taxPercent !== undefined ? it.taxPercent : 0),
          }))
        : [{ materialId: '', orderQty: '1', unitPrice: '0', taxPercent: '0' }],
    });
  };

  const handleUpdatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    setIsUpdatingPO(true);
    try {
      const res = await api.updatePurchaseOrder(editingPO.id, editPoForm);
      if (res.success) {
        setEditingPO(null);
        fetchData();
      } else {
        alert(res.message || 'Failed to update Purchase Order');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update Purchase Order');
    } finally {
      setIsUpdatingPO(false);
    }
  };

  const handleDeletePO = async () => {
    if (!deletingPO) return;
    setIsDeletingPO(true);
    setDeleteError(null);
    try {
      const res = await api.deletePurchaseOrder(deletingPO.id);
      if (res.success) {
        setDeletingPO(null);
        fetchData();
      } else {
        setDeleteError(res.message || 'Failed to delete Purchase Order');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete Purchase Order');
    } finally {
      setIsDeletingPO(false);
    }
  };

  const openQuickMaterialModal = async (target: 'PO' | 'EDIT_PO', itemIndex: number = 0) => {
    setQuickMaterialTarget(target);
    setQuickMaterialItemIndex(itemIndex);
    setQuickMaterialError(null);
    let nextCode = '';
    try {
      const res = await api.getNextMaterialCode();
      if (res && res.success && res.nextCode) {
        nextCode = res.nextCode;
      }
    } catch {
      // ignore, code can be auto-generated by backend
    }
    setQuickMaterialForm({
      code: nextCode,
      name: '',
      category: 'GENERAL',
      brand: '',
      unit: 'NOS',
      standardPrice: '',
      taxPercent: '18',
      minStockLevel: '10',
      reorderQty: '50',
    });
    setShowQuickMaterialModal(true);
  };

  const handleQuickCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMaterialForm.name.trim()) {
      setQuickMaterialError('Material name is required.');
      return;
    }
    setIsSubmittingQuickMaterial(true);
    setQuickMaterialError(null);
    try {
      const res = await api.createMaterial(quickMaterialForm);
      if (res.success && res.material) {
        const newMat = res.material;
        // 1. Immediately update materials in memory so all upcoming selections have it
        setMaterials((prev) => {
          if (prev.some((m) => m.id === newMat.id)) return prev;
          return [...prev, newMat];
        });

        // 2. Automatically select this material in the active PO line item
        if (quickMaterialTarget === 'PO') {
          const updated = [...poForm.items];
          if (updated[quickMaterialItemIndex]) {
            updated[quickMaterialItemIndex].materialId = newMat.id;
            updated[quickMaterialItemIndex].unitPrice = String(newMat.standardPrice || '');
            updated[quickMaterialItemIndex].taxPercent = String(newMat.taxPercent !== undefined ? newMat.taxPercent : '18');
          }
          setPoForm((prev) => ({ ...prev, items: updated }));
        } else if (quickMaterialTarget === 'EDIT_PO') {
          const updated = [...editPoForm.items];
          if (updated[quickMaterialItemIndex]) {
            updated[quickMaterialItemIndex].materialId = newMat.id;
            updated[quickMaterialItemIndex].unitPrice = String(newMat.standardPrice || '');
            updated[quickMaterialItemIndex].taxPercent = String(newMat.taxPercent !== undefined ? newMat.taxPercent : '18');
          }
          setEditPoForm((prev) => ({ ...prev, items: updated }));
        }

        setShowQuickMaterialModal(false);
      } else {
        setQuickMaterialError(res.message || 'Failed to create material.');
      }
    } catch (err: any) {
      setQuickMaterialError(err.message || 'Failed to create material.');
    } finally {
      setIsSubmittingQuickMaterial(false);
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
              onClick={() => {
                setPoForm((prev) => ({ ...prev, projectId: selectedProjectId || prev.projectId || (projects[0]?.id || '') }));
                setShowPOModal(true);
              }}
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
                onClick={() => {
                  setInvForm({
                    invoiceNumber: '',
                    supplierId: '',
                    purchaseOrderId: '',
                    projectId: invoiceProjectFilter || selectedProjectId || (projects[0]?.id || ''),
                    invoiceDate: new Date().toISOString().split('T')[0],
                    dueDate: '',
                    subtotal: '',
                    taxAmount: '',
                  });
                  setShowInvoiceModal(true);
                }}
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

      {/* Active Filter Indicator */}
      {selectedProjectId && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs text-amber-900 font-semibold mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-amber-800">Filtered by active project:</span>
            <span className="font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-950">
              {projects.find((p) => p.id === selectedProjectId)?.name || selectedProjectId}
            </span>
          </div>
          <button
            onClick={() => setSelectedProjectId('')}
            className="text-amber-900 hover:text-amber-950 font-bold underline text-xs cursor-pointer"
          >
            Show All Projects (Clear Filter)
          </button>
        </div>
      )}

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
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition">
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
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setViewingPO(po)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View PO Details & Print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditPOModal(po)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Purchase Order"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingPO(po);
                          }}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Purchase Order"
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
      {activeTab === 'invoices' && (() => {
        const activeProjFilter = invoiceProjectFilter || selectedProjectId || '';
        const filteredInvoices = invoices.filter((inv) => {
          if (activeProjFilter) {
            const p = getInvoiceProject(inv);
            const pid = p?.id || inv.projectId || inv.purchaseOrder?.projectId;
            if (pid !== activeProjFilter) return false;
          }
          if (invoiceStatusFilter !== 'ALL') {
            if (invoiceStatusFilter === 'UNPAID' && inv.status !== 'UNPAID') return false;
            if (invoiceStatusFilter === 'PAID' && inv.status !== 'PAID') return false;
            if (invoiceStatusFilter === 'PARTIALLY_PAID' && inv.status !== 'PARTIALLY_PAID') return false;
          }
          if (invoiceSearchQuery.trim()) {
            const q = invoiceSearchQuery.toLowerCase();
            const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
            const suppMatch = inv.supplier?.name?.toLowerCase().includes(q);
            const p = getInvoiceProject(inv);
            const projMatch = p?.name?.toLowerCase().includes(q) || p?.code?.toLowerCase().includes(q);
            const poMatch = inv.purchaseOrder?.poNumber?.toLowerCase().includes(q);
            if (!numMatch && !suppMatch && !projMatch && !poMatch) return false;
          }
          return true;
        });

        const totalInvoicedSum = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
        const totalPaidSum = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
        const totalBalanceSum = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

        return (
          <div className="space-y-4">
            {/* Project Filter & Search Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Project Selector Dropdown */}
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-xs">
                    <Building className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Project:</span>
                    <select
                      value={invoiceProjectFilter}
                      onChange={(e) => setInvoiceProjectFilter(e.target.value)}
                      className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-2 max-w-[220px] truncate"
                    >
                      <option value="">All Projects (Enterprise Overview)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search bill #, supplier, project..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                    />
                    {invoiceSearchQuery && (
                      <button
                        onClick={() => setInvoiceSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    {(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setInvoiceStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                          invoiceStatusFilter === st
                            ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {st === 'ALL' ? 'All' : st === 'UNPAID' ? 'Unpaid' : st === 'PARTIALLY_PAID' ? 'Partial' : 'Paid'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side: Clear filter + Quick Book */}
                <div className="flex items-center space-x-2 self-end lg:self-auto">
                  {(invoiceProjectFilter || invoiceSearchQuery || invoiceStatusFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setInvoiceProjectFilter('');
                        setInvoiceSearchQuery('');
                        setInvoiceStatusFilter('ALL');
                      }}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 underline px-2 py-1"
                    >
                      Reset Filters
                    </button>
                  )}
                  {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
                    <button
                      onClick={() => {
                        setInvForm({
                          invoiceNumber: '',
                          supplierId: '',
                          purchaseOrderId: '',
                          projectId: invoiceProjectFilter || selectedProjectId || (projects[0]?.id || ''),
                          invoiceDate: new Date().toISOString().split('T')[0],
                          dueDate: '',
                          subtotal: '',
                          taxAmount: '',
                        });
                        setShowInvoiceModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-xs inline-flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Book Bill</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {invoiceProjectFilter ? 'Project Invoices' : 'Total Invoices'}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                    {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Bill' : 'Bills'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Invoiced
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                    {formatCurrency(totalInvoicedSum)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Total Paid
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5 block">
                    {formatCurrency(totalPaidSum)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                    Balance Outstanding
                  </span>
                  <span
                    className={`text-sm font-extrabold font-mono mt-0.5 block ${
                      totalBalanceSum > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(totalBalanceSum)}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoices Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">Invoice Date</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3 text-right">Taxable Subtotal</th>
                      <th className="py-3 px-3 text-right">GST</th>
                      <th className="py-3 px-3 text-right">Total Payable</th>
                      <th className="py-3 px-3 text-right">Paid Amount</th>
                      <th className="py-3 px-3 text-right">Balance Due</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((inv) => {
                        const invProj = getInvoiceProject(inv);
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-3">
                              {invProj ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                                    <Building className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="truncate max-w-[190px]" title={invProj.name}>
                                      [{invProj.code}] {invProj.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono block pl-5">
                                    {inv.purchaseOrder ? `PO: ${inv.purchaseOrder.poNumber}` : 'Direct Bill'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">— No Project —</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {inv.supplier?.name}
                            </td>
                            <td className="py-3 px-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                            <td className="py-3 px-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                            <td className="py-3 px-3 text-right font-mono">{formatCurrency(inv.subtotal)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(inv.taxAmount)}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">{formatCurrency(inv.paidAmount)}</td>
                            <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">{formatCurrency(inv.balanceDue)}</td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setViewingInvoice(inv)}
                                  className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition inline-flex items-center space-x-1 shadow-xs"
                                  title="View Full Bill Details & Project Information"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>View</span>
                                </button>
                                {inv.balanceDue > 0 ? (
                                  <button
                                    onClick={() => {
                                      setPaymentForm({
                                        supplierId: inv.supplierId,
                                        invoiceId: inv.id,
                                        paymentDate: new Date().toISOString().split('T')[0],
                                        amount: String(inv.balanceDue),
                                        paymentMethod: 'BANK_TRANSFER',
                                        referenceNo: '',
                                        notes: `Payment for invoice ${inv.invoiceNumber}`,
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition inline-flex items-center space-x-1"
                                    title="Record payment for this invoice"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay Bill</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Paid</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-500">
                          <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700">No vendor invoices found matching your criteria</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Try selecting another project or resetting the filters.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 4: Suppliers Master */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {suppliers.map((s: any) => (
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
                <div>
                  <span className="text-[11px] text-slate-500 block">
                    {s.currentBalance < 0 ? 'Advance with Vendor:' : 'Current Payable:'}
                  </span>
                  {s.unpaidInvoicesCount > 0 && (
                    <span className="text-[10px] text-amber-600 font-semibold block">
                      {s.unpaidInvoicesCount} Unpaid {s.unpaidInvoicesCount === 1 ? 'Bill' : 'Bills'} ({formatCurrency(s.unpaidInvoicesSum)})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <strong className={`text-sm font-extrabold font-mono block ${
                    s.currentBalance > 0 ? 'text-rose-600' : s.currentBalance < 0 ? 'text-blue-600' : 'text-emerald-600'
                  }`}>
                    {s.currentBalance < 0 ? `+${formatCurrency(Math.abs(s.currentBalance))}` : formatCurrency(s.currentBalance)}
                  </strong>
                  {s.currentBalance > 0 ? (
                    <button
                      onClick={() => {
                        const firstUnpaid = invoices.find((inv) => inv.supplierId === s.id && inv.balanceDue > 0);
                        setPaymentForm({
                          supplierId: s.id,
                          invoiceId: firstUnpaid ? firstUnpaid.id : '',
                          paymentDate: new Date().toISOString().split('T')[0],
                          amount: firstUnpaid ? String(firstUnpaid.balanceDue) : String(s.currentBalance),
                          paymentMethod: 'BANK_TRANSFER',
                          referenceNo: '',
                          notes: `Payment to ${s.name}`,
                        });
                        setShowPaymentModal(true);
                      }}
                      className="mt-1 px-2.5 py-0.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md shadow-xs transition"
                    >
                      Pay Vendor
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">✓ All Settled</span>
                  )}
                </div>
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
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generate Purchase Order (PO)</h3>
                <span className="text-[11px] text-amber-700 font-mono font-bold block mt-0.5">
                  Sequential PO Ref: PO-{new Date().getFullYear()}-{String(purchaseOrders.length + 1).padStart(4, '0')}
                </span>
              </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-700">Material *</label>
                    <button
                      type="button"
                      onClick={() => openQuickMaterialModal('PO', 0)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add New Material
                    </button>
                  </div>
                  <select
                    required
                    value={poForm.items[0].materialId}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        openQuickMaterialModal('PO', 0);
                        return;
                      }
                      const sel = materials.find((m) => m.id === e.target.value);
                      const updated = [...poForm.items];
                      updated[0].materialId = e.target.value;
                      if (sel) {
                        updated[0].unitPrice = String(sel.standardPrice);
                        updated[0].taxPercent = String(sel.taxPercent);
                      }
                      setPoForm({ ...poForm, items: updated });
                    }}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Select Material</option>
                    <option value="__ADD_NEW__" className="font-bold text-amber-700 bg-amber-50">
                      ➕ Add New Material (Saves for upcoming selection)...
                    </option>
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

              {/* Live PO Calculation Summary */}
              {(() => {
                const poQty = Number(poForm.items[0]?.orderQty) || 0;
                const poPrice = Number(poForm.items[0]?.unitPrice) || 0;
                const poTaxPct = poForm.items[0]?.taxPercent !== '' && poForm.items[0]?.taxPercent !== undefined ? Number(poForm.items[0]?.taxPercent) : 0;
                const poFreight = Number(poForm.freightCharges) || 0;
                const poSubtotal = poQty * poPrice;
                const poTaxAmount = (poSubtotal * poTaxPct) / 100;
                const poTotal = poSubtotal + poTaxAmount + poFreight;

                return (
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Subtotal ({poQty} × {formatCurrency(poPrice)}):</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(poSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>GST Tax ({poTaxPct}%):</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(poTaxAmount)}</span>
                    </div>
                    {poFreight > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Freight / Delivery:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatCurrency(poFreight)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-bold text-slate-900">
                      <span className="text-amber-950 font-extrabold text-xs sm:text-sm">Total PO Amount (Payable):</span>
                      <span className="text-base font-black font-mono text-amber-950">{formatCurrency(poTotal)}</span>
                    </div>
                  </div>
                );
              })()}

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

      {/* View PO Modal */}
      {viewingPO && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 p-6 print:p-0 print:border-none print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-base font-extrabold text-slate-900 bg-amber-500/10 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {viewingPO.poNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {viewingPO.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                  title="Print Purchase Order Slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO</span>
                </button>
                <button
                  onClick={() => setViewingPO(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Sheet */}
            <div className="mt-5 space-y-5">
              {/* Parties Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Vendor / Supplier
                  </span>
                  <p className="text-sm font-bold text-slate-900">{viewingPO.supplier?.name}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Phone: {viewingPO.supplier?.phone || '—'}</p>
                  <p className="text-xs font-mono text-slate-600">GSTIN: {viewingPO.supplier?.gstin || 'Unregistered'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Destination Project & Timelines
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    [{viewingPO.project?.code}] {viewingPO.project?.name}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">PO Date: <strong>{formatDate(viewingPO.poDate)}</strong></p>
                  <p className="text-xs text-slate-600">Delivery Due: <strong>{formatDate(viewingPO.deliveryDueDate)}</strong></p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="text-xs font-bold text-slate-800 mb-2 block">Ordered Materials & Scope</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Material Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                        <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {viewingPO.items && viewingPO.items.length > 0 ? (
                        viewingPO.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{it.material?.name || 'Material Item'}</span>
                              <span className="text-[10px] font-mono text-slate-400">Code: {it.material?.code || '—'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {it.orderQty} {it.material?.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(it.unitPrice)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{it.taxPercent || 0}%</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatCurrency(it.taxAmount)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(it.totalAmount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400">No items in this purchase order.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terms and Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Terms & Conditions
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {viewingPO.termsConditions || 'Standard payment and delivery terms apply.'}
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(viewingPO.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>GST Tax:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(viewingPO.taxAmount)}</span>
                  </div>
                  {(viewingPO.freightCharges || 0) > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Freight Charges:</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(viewingPO.freightCharges)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="text-amber-950 font-bold">Total PO Value:</span>
                    <span className="text-base font-black font-mono text-amber-950">{formatCurrency(viewingPO.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const po = viewingPO;
                    setViewingPO(null);
                    openEditPOModal(po);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit PO</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const po = viewingPO;
                    setViewingPO(null);
                    setDeleteError(null);
                    setDeletingPO(po);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete PO</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewingPO(null)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {editingPO && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Purchase Order: <span className="font-mono text-amber-600">{editingPO.poNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update vendor, delivery schedule, ordered items, or pricing.
                </p>
              </div>
              <button onClick={() => setEditingPO(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePO} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                    [{editingPO.project?.code}] {editingPO.project?.name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={editPoForm.supplierId}
                    onChange={(e) => setEditPoForm({ ...editPoForm, supplierId: e.target.value })}
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
                    value={editPoForm.deliveryDueDate}
                    onChange={(e) => setEditPoForm({ ...editPoForm, deliveryDueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Freight / Delivery Charges (₹)</label>
                  <input
                    type="number"
                    value={editPoForm.freightCharges}
                    onChange={(e) => setEditPoForm({ ...editPoForm, freightCharges: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Order Line Items</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditPoForm({
                        ...editPoForm,
                        items: [...editPoForm.items, { materialId: '', orderQty: '1', unitPrice: '0', taxPercent: '0' }],
                      });
                    }}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {editPoForm.items.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Item #{index + 1}</label>
                      {editPoForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditPoForm({
                              ...editPoForm,
                              items: editPoForm.items.filter((_, i) => i !== index),
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center space-x-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-700">Material *</label>
                        <button
                          type="button"
                          onClick={() => openQuickMaterialModal('EDIT_PO', index)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Add New Material
                        </button>
                      </div>
                      <select
                        required
                        value={item.materialId}
                        onChange={(e) => {
                          if (e.target.value === '__ADD_NEW__') {
                            openQuickMaterialModal('EDIT_PO', index);
                            return;
                          }
                          const sel = materials.find((m) => m.id === e.target.value);
                          const updated = [...editPoForm.items];
                          updated[index].materialId = e.target.value;
                          if (sel) {
                            updated[index].unitPrice = String(sel.standardPrice);
                            updated[index].taxPercent = String(sel.taxPercent);
                          }
                          setEditPoForm({ ...editPoForm, items: updated });
                        }}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">Select Material</option>
                        <option value="__ADD_NEW__" className="font-bold text-amber-700 bg-amber-50">
                          ➕ Add New Material (Saves for upcoming selection)...
                        </option>
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
                          value={item.orderQty}
                          onChange={(e) => {
                            const updated = [...editPoForm.items];
                            updated[index].orderQty = e.target.value;
                            setEditPoForm({ ...editPoForm, items: updated });
                          }}
                          className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Unit Price (₹)</label>
                        <input
                          type="number"
                          required
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...editPoForm.items];
                            updated[index].unitPrice = e.target.value;
                            setEditPoForm({ ...editPoForm, items: updated });
                          }}
                          className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">GST %</label>
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(e) => {
                            const updated = [...editPoForm.items];
                            updated[index].taxPercent = e.target.value;
                            setEditPoForm({ ...editPoForm, items: updated });
                          }}
                          className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Terms & Conditions</label>
                <input
                  type="text"
                  value={editPoForm.termsConditions}
                  onChange={(e) => setEditPoForm({ ...editPoForm, termsConditions: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Live Edit PO Calculation Summary */}
              {(() => {
                let subtotal = 0;
                let taxAmount = 0;
                editPoForm.items.forEach((it) => {
                  const qty = Number(it.orderQty) || 0;
                  const price = Number(it.unitPrice) || 0;
                  const taxPct = it.taxPercent !== '' && it.taxPercent !== undefined ? Number(it.taxPercent) : 0;
                  const lineSubtotal = qty * price;
                  subtotal += lineSubtotal;
                  taxAmount += (lineSubtotal * taxPct) / 100;
                });
                const freight = Number(editPoForm.freightCharges) || 0;
                const total = subtotal + taxAmount + freight;

                return (
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>GST Tax Total:</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
                    </div>
                    {freight > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Freight / Delivery:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatCurrency(freight)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-bold text-slate-900">
                      <span className="text-amber-950 font-bold">Updated PO Total:</span>
                      <span className="text-base font-black font-mono text-amber-950">{formatCurrency(total)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingPO(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPO}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isUpdatingPO ? 'Saving Changes...' : 'Save & Update PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete PO Confirmation Modal */}
      {deletingPO && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Purchase Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will delete the purchase order record.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PO Number:</span>
                <span className="font-mono font-bold text-slate-900">{deletingPO.poNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold text-slate-800">{deletingPO.supplier?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Project:</span>
                <span className="text-slate-700">[{deletingPO.project?.code}] {deletingPO.project?.name}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Total Amount:</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {formatCurrency(deletingPO.totalAmount)}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{deleteError}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Note: Purchase orders can only be deleted if no Goods Receipt Notes (GRN) or Supplier Invoices have been recorded against them.
            </p>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingPO(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPO}
                onClick={handleDeletePO}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isDeletingPO ? 'Deleting PO...' : 'Confirm Delete'}
              </button>
            </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Vendor Invoice / Bill # *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const selSupp = suppliers.find((s) => s.id === invForm.supplierId);
                      const selPO = purchaseOrders.find((p) => p.id === invForm.purchaseOrderId);
                      let autoNum = '';
                      if (selPO) {
                        autoNum = `BILL-${selPO.poNumber}`;
                      } else {
                        const suppTag = selSupp ? selSupp.name.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '') : 'SUP';
                        autoNum = `BILL-${String(invoices.length + 1).padStart(2, '0')}-${suppTag}`;
                      }
                      setInvForm({ ...invForm, invoiceNumber: autoNum });
                    }}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold"
                    title="Auto-fill sequential purchase bill number"
                  >
                    ⚡ Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-BLJ-5510 or BILL-01-BALAJI"
                  value={invForm.invoiceNumber}
                  onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Project & Linked PO Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                  {invForm.purchaseOrderId ? (
                    <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                      <span className="truncate">
                        [{projects.find((p) => p.id === invForm.projectId)?.code || 'PO-PROJ'}] {projects.find((p) => p.id === invForm.projectId)?.name || 'Linked from PO'}
                      </span>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">From PO</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={invForm.projectId}
                      onChange={(e) => setInvForm({ ...invForm, projectId: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Linked PO (Optional)</label>
                  <select
                    value={invForm.purchaseOrderId}
                    onChange={(e) => {
                      const poId = e.target.value;
                      const selPO = purchaseOrders.find((p) => p.id === poId);
                      const selSupp = suppliers.find((s) => s.id === (selPO?.supplierId || invForm.supplierId));
                      const suppTag = selSupp ? selSupp.name.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '') : 'SUP';
                      const defaultBillNum = selPO ? `BILL-${selPO.poNumber}` : `BILL-${String(invoices.length + 1).padStart(2, '0')}-${suppTag}`;
                      setInvForm({
                        ...invForm,
                        purchaseOrderId: poId,
                        projectId: selPO?.projectId || invForm.projectId || (invoiceProjectFilter || selectedProjectId || (projects[0]?.id || '')),
                        supplierId: selPO?.supplierId || invForm.supplierId,
                        invoiceNumber: invForm.invoiceNumber ? invForm.invoiceNumber : defaultBillNum,
                        subtotal: selPO ? String(selPO.subtotal) : invForm.subtotal,
                        taxAmount: selPO ? String(selPO.taxAmount) : invForm.taxAmount,
                      });
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">None / Direct Bill</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>{po.poNumber} — [{po.project?.code}] {po.supplier?.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                <select
                  required
                  value={invForm.supplierId}
                  onChange={(e) => setInvForm({ ...invForm, supplierId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
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

      {/* View Supplier Invoice Modal */}
      {viewingInvoice && (() => {
        const invProj = getInvoiceProject(viewingInvoice);
        return (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 p-6 print:p-0 print:border-none print:shadow-none">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-base font-extrabold text-slate-900 bg-slate-100 text-slate-900 px-3 py-1 rounded-lg border border-slate-200">
                    {viewingInvoice.invoiceNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      viewingInvoice.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingInvoice.status === 'PARTIALLY_PAID'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {viewingInvoice.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                    title="Print Invoice Summary"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="mt-5 space-y-5">
                {/* HERO PROJECT BANNER */}
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs mt-0.5">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-extrabold tracking-wider text-amber-800 uppercase bg-amber-500/20 px-2 py-0.5 rounded-md">
                            Associated Project Costing Center
                          </span>
                          {viewingInvoice.purchaseOrder && (
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              PO: {viewingInvoice.purchaseOrder.poNumber}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">
                          {invProj ? `[${invProj.code}] ${invProj.name}` : 'Enterprise General Procurement'}
                        </h4>
                        {invProj && (
                          <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                            {invProj.clientName && (
                              <p><span className="text-slate-400">Client / Customer:</span> <strong>{invProj.clientName}</strong></p>
                            )}
                            {(invProj.siteAddress || invProj.city) && (
                              <p><span className="text-slate-400">Site Location:</span> {[invProj.siteAddress, invProj.city].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parties & Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                      Supplier / Vendor
                    </span>
                    <p className="text-sm font-bold text-slate-900">{viewingInvoice.supplier?.name || '—'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Phone: {viewingInvoice.supplier?.phone || '—'}</p>
                    <p className="text-xs font-mono text-slate-600">GSTIN: {viewingInvoice.supplier?.gstin || 'Unregistered'}</p>
                    {viewingInvoice.supplier?.paymentTerms && (
                      <p className="text-[11px] text-slate-500 mt-1">Terms: {viewingInvoice.supplier.paymentTerms}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                      Invoice Timelines
                    </span>
                    <p className="text-xs text-slate-700">Invoice Date: <strong>{formatDate(viewingInvoice.invoiceDate)}</strong></p>
                    <p className="text-xs text-slate-700 mt-1">Payment Due Date: <strong>{formatDate(viewingInvoice.dueDate)}</strong></p>
                    {viewingInvoice.purchaseOrder?.poDate && (
                      <p className="text-xs text-slate-500 mt-1">PO Issue Date: {formatDate(viewingInvoice.purchaseOrder.poDate)}</p>
                    )}
                  </div>
                </div>

                {/* Financial Summary Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subtotal</span>
                    <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block">{formatCurrency(viewingInvoice.subtotal)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GST Tax</span>
                    <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block">{formatCurrency(viewingInvoice.taxAmount)}</span>
                  </div>
                  <div className="p-3 bg-slate-900 text-white rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Total Payable</span>
                    <span className="text-sm font-extrabold font-mono text-white mt-0.5 block">{formatCurrency(viewingInvoice.totalAmount)}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Paid Amount</span>
                    <span className="text-sm font-bold font-mono text-emerald-800 mt-0.5 block">{formatCurrency(viewingInvoice.paidAmount)}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 col-span-2 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Balance Outstanding</span>
                    <span className="text-base font-extrabold font-mono text-rose-800 mt-0.5 block">{formatCurrency(viewingInvoice.balanceDue)}</span>
                  </div>
                </div>

                {/* PO Scope & Materials (if linked PO has items) */}
                {viewingInvoice.purchaseOrder?.items && viewingInvoice.purchaseOrder.items.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Materials Inwarded / Ordered Scope</span>
                      <span className="text-[10px] font-mono text-slate-500">PO #{viewingInvoice.purchaseOrder.poNumber}</span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px]">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Material Description</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Rate</th>
                            <th className="py-2 px-3 text-right">Tax (₹)</th>
                            <th className="py-2 px-3 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {viewingInvoice.purchaseOrder.items.map((it: any, idx: number) => (
                            <tr key={it.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900 block">{it.material?.name || 'Material Item'}</span>
                                <span className="text-[10px] font-mono text-slate-400">Code: {it.material?.code || '—'}</span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {it.orderQty} {it.material?.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCurrency(it.unitPrice)}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">{formatCurrency(it.taxAmount)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(it.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payments History (if payments exist) */}
                {viewingInvoice.payments && viewingInvoice.payments.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-800 mb-2 block">Payment Disbursements & Receipts</span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px]">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">Reference / UTR</th>
                            <th className="py-2 px-3 text-right">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {viewingInvoice.payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{p.paymentMethod?.replace('_', ' ')}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{p.referenceNo || '—'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {viewingInvoice.balanceDue > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const inv = viewingInvoice;
                        setViewingInvoice(null);
                        setPaymentForm({
                          supplierId: inv.supplierId,
                          invoiceId: inv.id,
                          paymentDate: new Date().toISOString().split('T')[0],
                          amount: String(inv.balanceDue),
                          paymentMethod: 'BANK_TRANSFER',
                          referenceNo: '',
                          notes: `Payment for invoice ${inv.invoiceNumber}`,
                        });
                        setShowPaymentModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center space-x-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Bill ({formatCurrency(viewingInvoice.balanceDue)})</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 inline-flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Invoice Fully Settled (Paid)</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  onChange={(e) => {
                    const newSupplierId = e.target.value;
                    const suppUnpaidInvoices = invoices.filter(
                      (inv) => inv.supplierId === newSupplierId && inv.balanceDue > 0
                    );
                    const defaultInv = suppUnpaidInvoices[0];
                    setPaymentForm({
                      ...paymentForm,
                      supplierId: newSupplierId,
                      invoiceId: defaultInv ? defaultInv.id : '',
                      amount: defaultInv ? String(defaultInv.balanceDue) : '',
                    });
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Link to Unpaid Invoice</label>
                  {paymentForm.supplierId && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      {invoices.filter((inv) => inv.supplierId === paymentForm.supplierId && inv.balanceDue > 0).length} Unpaid Bill(s) Available
                    </span>
                  )}
                </div>
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
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Auto-Allocate (FIFO across open bills) or On Account</option>
                  {invoices
                    .filter(
                      (inv) => (!paymentForm.supplierId || inv.supplierId === paymentForm.supplierId) && inv.balanceDue > 0
                    )
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        [{inv.invoiceNumber}] (Bal: {formatCurrency(inv.balanceDue)}) • Due {formatDate(inv.dueDate)}
                      </option>
                    ))}
                </select>
                {paymentForm.invoiceId && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ Invoice selected. Paying this will settle the bill and update its status to PAID.
                  </p>
                )}
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
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-5">
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
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
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
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={suppForm.contactPerson}
                    onChange={(e) => setSuppForm({ ...suppForm, contactPerson: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="accounts@supplier.com"
                    value={suppForm.email}
                    onChange={(e) => setSuppForm({ ...suppForm, email: e.target.value })}
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
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Net 30 Days"
                    value={suppForm.paymentTerms}
                    onChange={(e) => setSuppForm({ ...suppForm, paymentTerms: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
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
              </div>

              {/* Bank Account Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Bank Account Details (For Direct Payouts)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={suppForm.bankName}
                      onChange={(e) => setSuppForm({ ...suppForm, bankName: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Account #</label>
                    <input
                      type="text"
                      placeholder="50200012345678"
                      value={suppForm.bankAccountNo}
                      onChange={(e) => setSuppForm({ ...suppForm, bankAccountNo: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="HDFC0000123"
                      value={suppForm.bankIfsc}
                      onChange={(e) => setSuppForm({ ...suppForm, bankIfsc: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded font-mono uppercase"
                    />
                  </div>
                </div>
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
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm transition"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Material Modal (Saves automatically for upcoming selections) */}
      {showQuickMaterialModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Material</h3>
                  <p className="text-[11px] text-slate-500">
                    Saves to catalog automatically for this and all upcoming selections
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickMaterialModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickMaterialError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{quickMaterialError}</span>
              </div>
            )}

            <form onSubmit={handleQuickCreateMaterial} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Tata Tiscon 12mm TMT Steel Rebar"
                  value={quickMaterialForm.name}
                  onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, name: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Material Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={quickMaterialForm.code}
                    onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Sequential code auto-assigned</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit of Measurement (UoM) *
                  </label>
                  <select
                    value={quickMaterialForm.unit}
                    onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, unit: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="NOS">NOS (Numbers / Pieces)</option>
                    <option value="BAG">BAG (Bags - Cement/Putty)</option>
                    <option value="MT">MT (Metric Ton - Steel)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="SQFT">SQFT (Square Feet - Tiles/Glass)</option>
                    <option value="SQM">SQM (Square Meters)</option>
                    <option value="CUM">CUM (Cubic Meters - Concrete)</option>
                    <option value="CFT">CFT (Cubic Feet - Sand/Agg)</option>
                    <option value="RMT">RMT (Running Meter - Pipes/Cables)</option>
                    <option value="LTR">LTR (Liters - Paints/Chemicals)</option>
                    <option value="BOX">BOX (Boxes - Fixtures/Hardware)</option>
                    <option value="BUNDLE">BUNDLE (Bundles)</option>
                    <option value="BRASS">BRASS (Brass)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={quickMaterialForm.category}
                    onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="GENERAL">General Material</option>
                    <option value="CEMENT">Cement</option>
                    <option value="STEEL">Steel & TMT</option>
                    <option value="AGGREGATE">Aggregates & Jelly</option>
                    <option value="SAND">Sand & M-Sand</option>
                    <option value="BRICK">Bricks & Solid Blocks</option>
                    <option value="PLUMBING">Plumbing & Sanitary</option>
                    <option value="ELECTRICAL">Electrical & Wiring</option>
                    <option value="PAINT">Paint & Finishes</option>
                    <option value="TILES">Tiles & Flooring</option>
                    <option value="HARDWARE">Hardware & Fasteners</option>
                    <option value="WOOD">Wood & Carpentry</option>
                    <option value="READYMIX">ReadyMix Concrete (RMC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech, Tata, Havells"
                    value={quickMaterialForm.brand}
                    onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, brand: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 78.00"
                    value={quickMaterialForm.standardPrice}
                    onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, standardPrice: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pre-fills PO unit price</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Tax Rate (%)
                  </label>
                  <select
                    value={quickMaterialForm.taxPercent}
                    onChange={(e) => setQuickMaterialForm({ ...quickMaterialForm, taxPercent: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="0">0% (Nil / Exempted)</option>
                    <option value="5">5% (Aggregates, Sand, Bricks)</option>
                    <option value="12">12% (Pipes, Tiles, Glass)</option>
                    <option value="18">18% (Steel, Cement, Paint, Electrical)</option>
                    <option value="28">28% (Luxury / Specific Fittings)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pre-fills PO tax percentage</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start space-x-2 text-[11px] text-amber-800">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Immediate Catalog Integration:</strong> Once saved, this material is instantly stored in your master inventory database, auto-selected in this PO line item, and permanently available for upcoming POs, GRNs, and Requisitions.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickMaterialModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickMaterial}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  {isSubmittingQuickMaterial ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save & Select Material</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
