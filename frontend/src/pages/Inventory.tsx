import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Material, MaterialRequisition, StockLedger, Warehouse } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  FileCheck,
  History,
  X,
  Warehouse as WarehouseIcon,
  Edit2,
  Trash2,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'materials' | 'stores' | 'requisitions' | 'ledger'>('materials');

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);

  // Forms
  const [issueForm, setIssueForm] = useState({
    txnType: 'ISSUE_TO_SITE',
    materialId: '',
    qty: '',
    sourceWarehouseId: '',
    destWarehouseId: '',
    projectId: '',
    referenceNo: '',
    remarks: '',
  });

  const [reqForm, setReqForm] = useState({
    projectId: '',
    requiredDate: '',
    priority: 'MEDIUM',
    remarks: '',
    items: [{ materialId: '', requestedQty: '', unit: 'BAG', purpose: '' }],
  });

  const [matForm, setMatForm] = useState({
    code: '',
    name: '',
    category: 'CEMENT',
    brand: '',
    unit: 'BAG',
    standardPrice: '',
    minStockLevel: '10',
    reorderQty: '50',
    taxPercent: '18',
  });

  // Material Edit / Delete State
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editMaterialForm, setEditMaterialForm] = useState({
    name: '',
    category: '',
    brand: '',
    unit: '',
    standardPrice: '',
    minStockLevel: '',
    reorderQty: '',
  });
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // Warehouse CRUD State
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    location: '',
    isSiteStore: false,
    contactPerson: '',
    projectId: '',
  });
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editWarehouseForm, setEditWarehouseForm] = useState({
    name: '',
    location: '',
    isSiteStore: false,
    contactPerson: '',
    projectId: '',
  });
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [isDeletingWarehouse, setIsDeletingWarehouse] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, whRes, reqRes, ledRes] = await Promise.all([
        api.getMaterials(search ? `search=${search}` : ''),
        api.getWarehouses(),
        api.getRequisitions(),
        api.getStockLedger(),
      ]);

      if (matRes.success) setMaterials(matRes.materials || []);
      if (whRes.success) setWarehouses(whRes.warehouses || []);
      if (reqRes.success) setRequisitions(reqRes.requisitions || []);
      if (ledRes.success) setLedger(ledRes.ledger || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.recordStockMovement(issueForm);
      if (res.success) {
        setShowIssueModal(false);
        fetchData();
        setIssueForm({
          txnType: 'ISSUE_TO_SITE',
          materialId: '',
          qty: '',
          sourceWarehouseId: '',
          destWarehouseId: '',
          projectId: '',
          referenceNo: '',
          remarks: '',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Stock transaction failed');
    }
  };

  const handleApproveReq = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await api.approveRequisition(id, { status });
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update requisition');
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createRequisition(reqForm);
      if (res.success) {
        setShowRequisitionModal(false);
        fetchData();
        setReqForm({
          projectId: '',
          requiredDate: '',
          priority: 'MEDIUM',
          remarks: '',
          items: [{ materialId: '', requestedQty: '', unit: 'BAG', purpose: '' }],
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create requisition');
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createMaterial(matForm);
      if (res.success) {
        setShowAddMaterialModal(false);
        fetchData();
        setMatForm({
          code: '',
          name: '',
          category: 'CEMENT',
          brand: '',
          unit: 'BAG',
          standardPrice: '',
          minStockLevel: '10',
          reorderQty: '50',
          taxPercent: '18',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create material');
    }
  };

  const openEditMaterial = (m: Material) => {
    setEditingMaterial(m);
    setEditMaterialForm({
      name: m.name,
      category: m.category,
      brand: m.brand || '',
      unit: m.unit,
      standardPrice: String(m.standardPrice || ''),
      minStockLevel: String(m.minStockLevel || '10'),
      reorderQty: String(m.reorderQty || '50'),
    });
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    try {
      const res = await api.updateMaterial(editingMaterial.id, {
        ...editMaterialForm,
        standardPrice: Number(editMaterialForm.standardPrice) || 0,
        minStockLevel: Number(editMaterialForm.minStockLevel) || 0,
        reorderQty: Number(editMaterialForm.reorderQty) || 0,
      });
      if (res.success) {
        setEditingMaterial(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update material');
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial) return;
    setIsDeletingMaterial(true);
    try {
      const res = await api.deleteMaterial(deletingMaterial.id);
      if (res.success) {
        setDeletingMaterial(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete material');
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createWarehouse(warehouseForm);
      if (res.success) {
        setShowAddWarehouseModal(false);
        setWarehouseForm({ code: '', name: '', location: '', isSiteStore: false, contactPerson: '', projectId: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create warehouse');
    }
  };

  const openEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setEditWarehouseForm({
      name: wh.name,
      location: wh.location,
      isSiteStore: wh.isSiteStore,
      contactPerson: wh.contactPerson || '',
      projectId: wh.projectId || '',
    });
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    try {
      const res = await api.updateWarehouse(editingWarehouse.id, editWarehouseForm);
      if (res.success) {
        setEditingWarehouse(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update warehouse');
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deletingWarehouse) return;
    setIsDeletingWarehouse(true);
    try {
      const res = await api.deleteWarehouse(deletingWarehouse.id);
      if (res.success) {
        setDeletingWarehouse(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete warehouse');
    } finally {
      setIsDeletingWarehouse(false);
    }
  };

  const handleDeleteRequisition = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this material requisition?')) return;
    try {
      const res = await api.deleteRequisition(id);
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete requisition');
    }
  };

  const lowStockCount = materials.filter((m) => m.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Materials & Store Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central material master, multi-warehouse stock balances, weighted average costing, and stock ledger.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
            <button
              onClick={() => setShowRequisitionModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              Raise Requisition
            </button>
          )}

          {hasRole('OWNER', 'STOREKEEPER') && (
            <button
              onClick={() => {
                setIssueForm((prev) => ({ ...prev, projectId: selectedProjectId || prev.projectId || (projects[0]?.id || '') }));
                setShowIssueModal(true);
              }}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Issue / Transfer Stock</span>
            </button>
          )}

          {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
            <button
              onClick={() => setShowAddMaterialModal(true)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              title="Add New Material Master"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-900">
                Low Stock Reorder Alert: {lowStockCount} materials have fallen below safety reorder thresholds!
              </p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Review available inventory below and generate purchase requisitions to prevent site work stoppages.
              </p>
            </div>
          </div>
        </div>
      )}

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
          { id: 'materials', label: `Material Master (${materials.length})`, icon: Boxes },
          { id: 'stores', label: `Stores & Warehouses (${warehouses.length})`, icon: WarehouseIcon },
          { id: 'requisitions', label: `Requisitions (${requisitions.length})`, icon: FileCheck },
          { id: 'ledger', label: `Stock Ledger Log (${ledger.length})`, icon: History },
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

      {/* Tab 1: Materials Master */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search materials by code, name, or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Material Code</th>
                    <th className="py-3 px-3">Name & Brand</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">UOM</th>
                    <th className="py-3 px-3 text-right">Standard Price</th>
                    <th className="py-3 px-3 text-right">Total Available Stock</th>
                    <th className="py-3 px-3 text-right">Min Stock / Reorder</th>
                    <th className="py-3 px-3 text-right">Stock Valuation</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{m.code}</td>
                      <td className="py-3 px-3">
                        <strong className="text-slate-900 block">{m.name}</strong>
                        {m.brand && <span className="text-[10px] text-slate-400">Brand: {m.brand}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{m.unit}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">{formatCurrency(m.standardPrice)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {m.totalQty} {m.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] text-slate-500">
                        {m.minStockLevel} / {m.reorderQty} {m.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-700 font-mono">
                        {formatCurrency(m.totalValuation || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {m.isLowStock ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Optimal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
                            <button
                              onClick={() => openEditMaterial(m)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                              title="Edit Material"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasRole('OWNER', 'PURCHASE_MANAGER') && (
                            <button
                              onClick={() => setDeletingMaterial(m)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                              title="Delete Material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stores & Warehouses */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Stores & Warehouse Locations</h3>
            {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
              <button
                onClick={() => setShowAddWarehouseModal(true)}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Warehouse / Store</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouses.map((wh) => (
              <div key={wh.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {wh.code}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        wh.isSiteStore ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {wh.isSiteStore ? 'Site Store' : 'Central Warehouse'}
                      </span>
                      {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
                        <button
                          onClick={() => openEditWarehouse(wh)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                          title="Edit Warehouse"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasRole('OWNER', 'PURCHASE_MANAGER') && (
                        <button
                          onClick={() => setDeletingWarehouse(wh)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Warehouse"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{wh.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{wh.location}</p>
                  {wh.contactPerson && (
                    <p className="text-[11px] text-slate-600 mt-2 font-medium">In-Charge: {wh.contactPerson}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Material Requisitions */}
      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Site Engineer Material Requisitions</h3>
            <span className="text-xs text-slate-500">Approval gated by Storekeeper / PM</span>
          </div>

          <div className="space-y-3">
            {requisitions.map((r) => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{r.requisitionNumber}</span>
                    <span className="text-xs font-semibold text-slate-700">[{r.project?.code}] {r.project?.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Requested by: {r.requestedBy?.name} • Required by: {formatDate(r.requiredDate)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.items.map((it) => (
                      <span key={it.id} className="text-[11px] bg-white px-2 py-1 rounded border border-slate-200 font-medium text-slate-800">
                        {it.material?.name}: <strong>{it.requestedQty} {it.unit}</strong> {it.purpose && `(${it.purpose})`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {r.status === 'PENDING' && hasRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER') && (
                    <>
                      <button
                        onClick={() => handleApproveReq(r.id, 'APPROVED')}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveReq(r.id, 'REJECTED')}
                        className="px-3 py-1.5 text-xs font-bold bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {hasRole('OWNER', 'PROJECT_MANAGER') && (
                    <button
                      onClick={() => handleDeleteRequisition(r.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Requisition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Stock Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stock Ledger & Movement History</h3>
              <p className="text-xs text-slate-500">Atomic inventory audit trail with weighted average pricing</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Txn #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Value</th>
                  <th className="py-2.5 px-3">Source / Dest</th>
                  <th className="py-2.5 px-3">Ref / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ledger.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{l.txnNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(l.txnDate)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        l.txnType === 'PURCHASE_RECEIPT' ? 'bg-emerald-100 text-emerald-800' :
                        l.txnType === 'ISSUE_TO_SITE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.txnType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 font-semibold">{l.material?.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {l.qty} {l.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(l.unitRate)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(l.totalValue)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {l.sourceWarehouse?.name || l.destWarehouse?.name || l.project?.name || 'Central Store'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={l.remarks || ''}>
                      {l.referenceNo} {l.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue / Movement Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Stock Movement / Issue</h3>
              <button onClick={() => setShowIssueModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleIssueSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type *</label>
                <select
                  value={issueForm.txnType}
                  onChange={(e) => setIssueForm({ ...issueForm, txnType: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="ISSUE_TO_SITE">Issue to Project Site</option>
                  <option value="SITE_TRANSFER">Warehouse to Site Store Transfer</option>
                  <option value="CONSUMED">Material Consumed on Work</option>
                  <option value="RETURN_FROM_SITE">Return from Site to Warehouse</option>
                  <option value="DAMAGE">Damaged Stock</option>
                  <option value="WASTAGE">Wastage / Scrap</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material *</label>
                <select
                  required
                  value={issueForm.materialId}
                  onChange={(e) => setIssueForm({ ...issueForm, materialId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} ({m.totalQty} {m.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={issueForm.qty}
                    onChange={(e) => setIssueForm({ ...issueForm, qty: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Store</label>
                  <select
                    value={issueForm.sourceWarehouseId}
                    onChange={(e) => setIssueForm({ ...issueForm, sourceWarehouseId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Source Store</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Allocated</label>
                  <select
                    value={issueForm.projectId}
                    onChange={(e) => setIssueForm({ ...issueForm, projectId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reference Slip #</label>
                  <input
                    type="text"
                    placeholder="e.g. SLIP-8821"
                    value={issueForm.referenceNo}
                    onChange={(e) => setIssueForm({ ...issueForm, referenceNo: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Location</label>
                <input
                  type="text"
                  placeholder="e.g. 8th floor column concrete batching"
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Post Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Requisition Modal */}
      {showRequisitionModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Raise Material Requisition</h3>
              <button onClick={() => setShowRequisitionModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRequisition} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                <select
                  required
                  value={reqForm.projectId}
                  onChange={(e) => setReqForm({ ...reqForm, projectId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Required Date *</label>
                  <input
                    type="date"
                    required
                    value={reqForm.requiredDate}
                    onChange={(e) => setReqForm({ ...reqForm, requiredDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={reqForm.priority}
                    onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Item selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Required *</label>
                <select
                  required
                  value={reqForm.items[0].materialId}
                  onChange={(e) => {
                    const sel = materials.find((m) => m.id === e.target.value);
                    const updated = [...reqForm.items];
                    updated[0].materialId = e.target.value;
                    if (sel) updated[0].unit = sel.unit;
                    setReqForm({ ...reqForm, items: updated });
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>[{m.code}] {m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Requested Qty *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100"
                    value={reqForm.items[0].requestedQty}
                    onChange={(e) => {
                      const updated = [...reqForm.items];
                      updated[0].requestedQty = e.target.value;
                      setReqForm({ ...reqForm, items: updated });
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Activity</label>
                  <input
                    type="text"
                    placeholder="e.g. Basement slab casting"
                    value={reqForm.items[0].purpose}
                    onChange={(e) => {
                      const updated = [...reqForm.items];
                      updated[0].purpose = e.target.value;
                      setReqForm({ ...reqForm, items: updated });
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequisitionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Master Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Central Material Master</h3>
              <button onClick={() => setShowAddMaterialModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Material Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAT-CEM-03"
                    value={matForm.code}
                    onChange={(e) => setMatForm({ ...matForm, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={matForm.category}
                    onChange={(e) => setMatForm({ ...matForm, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CEMENT">Cement</option>
                    <option value="STEEL">Steel Rebar</option>
                    <option value="AGGREGATE">Aggregates / Sand</option>
                    <option value="BRICK_BLOCK">Bricks & Blocks</option>
                    <option value="PAINT">Paint & Primers</option>
                    <option value="PLUMBING">Plumbing Pipes & Fittings</option>
                    <option value="ELECTRICAL">Electrical Cables</option>
                    <option value="FINISHING">Tiles & Stones</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC Suraksha Power Cement"
                  value={matForm.name}
                  onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. ACC"
                    value={matForm.brand}
                    onChange={(e) => setMatForm({ ...matForm, brand: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UOM *</label>
                  <select
                    value={matForm.unit}
                    onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="BAG">BAG</option>
                    <option value="TONNE">TONNE</option>
                    <option value="CFT">CFT</option>
                    <option value="CUMT">CUMT</option>
                    <option value="NOS">NOS</option>
                    <option value="SQFT">SQFT</option>
                    <option value="SQMT">SQMT</option>
                    <option value="LITRE">LITRE</option>
                    <option value="RFT">RFT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Purchase Price (₹)</label>
                  <input
                    type="number"
                    placeholder="380"
                    value={matForm.standardPrice}
                    onChange={(e) => setMatForm({ ...matForm, standardPrice: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    value={matForm.minStockLevel}
                    onChange={(e) => setMatForm({ ...matForm, minStockLevel: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Master Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Material Master</h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingMaterial.code}</p>
              </div>
              <button onClick={() => setEditingMaterial(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMaterial} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={editMaterialForm.name}
                  onChange={(e) => setEditMaterialForm({ ...editMaterialForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={editMaterialForm.category}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CEMENT">Cement</option>
                    <option value="STEEL">Steel Rebar</option>
                    <option value="AGGREGATE">Aggregates / Sand</option>
                    <option value="BRICK_BLOCK">Bricks & Blocks</option>
                    <option value="PAINT">Paint & Primers</option>
                    <option value="PLUMBING">Plumbing Pipes & Fittings</option>
                    <option value="ELECTRICAL">Electrical Cables</option>
                    <option value="FINISHING">Tiles & Stones</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editMaterialForm.brand}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, brand: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Price (₹)</label>
                  <input
                    type="number"
                    value={editMaterialForm.standardPrice}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, standardPrice: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={editMaterialForm.minStockLevel}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, minStockLevel: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Qty</label>
                  <input
                    type="number"
                    value={editMaterialForm.reorderQty}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, reorderQty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Update Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Material Confirmation Modal */}
      {deletingMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Delete Material</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{deletingMaterial.name} ({deletingMaterial.code})</strong>? If linked to historical purchase orders or requisitions, it will be safely archived.
            </p>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMaterial}
                disabled={isDeletingMaterial}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isDeletingMaterial ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Warehouse / Store</h3>
              <button onClick={() => setShowAddWarehouseModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Store Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-MAIN-01"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={warehouseForm.isSiteStore ? 'site' : 'central'}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, isSiteStore: e.target.value === 'site' })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="central">Central Warehouse</option>
                    <option value="site">Site Store</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store / Warehouse Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Yard Warehouse"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 18, Industrial Area"
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">In-Charge Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={warehouseForm.contactPerson}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, contactPerson: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Warehouse</h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingWarehouse.code}</p>
              </div>
              <button onClick={() => setEditingWarehouse(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store / Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={editWarehouseForm.name}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Address *</label>
                <input
                  type="text"
                  required
                  value={editWarehouseForm.location}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, location: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">In-Charge Contact Person</label>
                <input
                  type="text"
                  value={editWarehouseForm.contactPerson}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, contactPerson: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
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

      {/* Delete Warehouse Confirmation Modal */}
      {deletingWarehouse && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Delete Warehouse</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{deletingWarehouse.name} ({deletingWarehouse.code})</strong>? Deletion is blocked if any active stock balance exists in this store.
            </p>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingWarehouse(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWarehouse}
                disabled={isDeletingWarehouse}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isDeletingWarehouse ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
