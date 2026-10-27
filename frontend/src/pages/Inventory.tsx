import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Material, MaterialRequisition, ProjectMaterial, StockLedger, Warehouse } from '../types';
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
  Sliders,
  PackagePlus,
  Lock,
  Building2,
  Clock,
  Layers,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();

  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Primary navigation tabs
  const [activeTab, setActiveTab] = useState<'materials' | 'stores' | 'requisitions' | 'ledger'>('materials');
  // Sub-view in Materials tab: 'project_orders' (Default) vs 'catalog'
  const [materialView, setMaterialView] = useState<'project_orders' | 'catalog'>('project_orders');

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);

  // Locked context for Issue Modal
  const [issueTarget, setIssueTarget] = useState<{
    materialId: string;
    materialName: string;
    materialCode: string;
    unit: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    availableStock: number;
    preferredWarehouseId?: string;
  } | null>(null);

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

  const [addStockForm, setAddStockForm] = useState({
    materialId: '',
    projectId: '',
    warehouseId: '',
    qty: '',
    unitPrice: '',
    supplierName: '',
    referenceNo: '',
    remarks: '',
    txnType: 'PURCHASE_RECEIPT',
  });

  const [adjustStockTarget, setAdjustStockTarget] = useState<{
    materialId: string;
    materialName: string;
    materialCode: string;
    unit: string;
    currentQty: number;
    projectId?: string;
    projectName?: string;
    preferredWarehouseId?: string;
  } | null>(null);

  const [adjustStockForm, setAdjustStockForm] = useState({
    newQty: '',
    warehouseId: '',
    reason: 'Physical Count Audit',
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

  const [submittingAction, setSubmittingAction] = useState(false);

  // Load All Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const pmParams = new URLSearchParams();
      if (selectedProjectId) pmParams.append('projectId', selectedProjectId);
      if (search) pmParams.append('search', search);

      const matParams = search ? `search=${encodeURIComponent(search)}` : '';

      const [projMatRes, matRes, whRes, reqRes, ledRes] = await Promise.all([
        api.getProjectMaterials(pmParams.toString()),
        api.getMaterials(matParams),
        api.getWarehouses(),
        api.getRequisitions(selectedProjectId ? `projectId=${selectedProjectId}` : ''),
        api.getStockLedger(selectedProjectId ? `projectId=${selectedProjectId}` : ''),
      ]);

      if (projMatRes.success) setProjectMaterials(projMatRes.projectMaterials || []);
      if (matRes.success) setMaterials(matRes.materials || []);
      if (whRes.success) setWarehouses(whRes.warehouses || []);
      if (reqRes.success) setRequisitions(reqRes.requisitions || []);
      if (ledRes.success) setLedger(ledRes.ledger || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId, search]);

  // Open Issue Stock Modal locked to a specific project material
  const openIssueModalForProjectMaterial = (pm: ProjectMaterial) => {
    setIssueTarget({
      materialId: pm.materialId,
      materialName: pm.materialName,
      materialCode: pm.materialCode,
      unit: pm.unit,
      projectId: pm.projectId,
      projectName: pm.projectName,
      projectCode: pm.projectCode,
      availableStock: pm.availableStock,
      preferredWarehouseId: pm.preferredWarehouseId,
    });

    setIssueForm({
      txnType: 'ISSUE_TO_SITE',
      materialId: pm.materialId,
      qty: '',
      sourceWarehouseId: pm.preferredWarehouseId || warehouses[0]?.id || '',
      destWarehouseId: '',
      projectId: pm.projectId,
      referenceNo: '',
      remarks: `Issued for site works on ${pm.projectName}`,
    });

    setShowIssueModal(true);
  };

  // Open Issue Stock Modal from header (flexible)
  const openGenericIssueModal = () => {
    setIssueTarget(null);
    setIssueForm({
      txnType: 'ISSUE_TO_SITE',
      materialId: materials[0]?.id || '',
      qty: '',
      sourceWarehouseId: warehouses[0]?.id || '',
      destWarehouseId: '',
      projectId: selectedProjectId || projects[0]?.id || '',
      referenceNo: '',
      remarks: '',
    });
    setShowIssueModal(true);
  };

  // Handle Issue Stock Submission
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(issueForm.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please enter a valid positive quantity to issue.');
      return;
    }

    if (issueTarget && qtyNum > issueTarget.availableStock) {
      const confirmExceed = window.confirm(
        `Warning: Requested issue qty (${qtyNum} ${issueTarget.unit}) exceeds currently recorded site stock (${issueTarget.availableStock} ${issueTarget.unit}). Do you still want to proceed?`
      );
      if (!confirmExceed) return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.recordStockMovement({
        txnType: issueForm.txnType,
        materialId: issueForm.materialId,
        quantity: qtyNum,
        sourceWarehouseId: issueForm.sourceWarehouseId || undefined,
        destWarehouseId: issueForm.destWarehouseId || undefined,
        projectId: issueForm.projectId || undefined,
        referenceNo: issueForm.referenceNo || undefined,
        remarks: issueForm.remarks || undefined,
      });

      if (res.success) {
        setShowIssueModal(false);
        setIssueTarget(null);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to issue stock.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Add / Inward Stock Modal
  const openAddStockModal = (pm?: ProjectMaterial, mat?: Material) => {
    const matId = pm?.materialId || mat?.id || materials[0]?.id || '';
    const projId = pm?.projectId || selectedProjectId || (projects[0]?.id || '');
    const defPrice = pm?.avgUnitCost || mat?.standardPrice || '';
    const whId = pm?.preferredWarehouseId || warehouses[0]?.id || '';

    setAddStockForm({
      materialId: matId,
      projectId: projId,
      warehouseId: whId,
      qty: '',
      unitPrice: defPrice ? String(defPrice) : '',
      supplierName: pm?.purchaseOrders?.[0]?.supplierName || '',
      referenceNo: pm?.purchaseOrders?.[0]?.poNumber ? `DC-${pm.purchaseOrders[0].poNumber}` : '',
      remarks: pm ? `Direct inward for project [${pm.projectCode}] ${pm.projectName}` : '',
      txnType: 'PURCHASE_RECEIPT',
    });

    setShowAddStockModal(true);
  };

  // Handle Add / Inward Stock Submit
  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(addStockForm.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please enter a valid positive quantity to inward/add to stock.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.addStock({
        materialId: addStockForm.materialId,
        projectId: addStockForm.projectId || undefined,
        warehouseId: addStockForm.warehouseId || undefined,
        qty: qtyNum,
        unitPrice: addStockForm.unitPrice ? Number(addStockForm.unitPrice) : undefined,
        supplierName: addStockForm.supplierName || undefined,
        referenceNo: addStockForm.referenceNo || undefined,
        remarks: addStockForm.remarks || undefined,
        txnType: addStockForm.txnType,
      });

      if (res.success) {
        setShowAddStockModal(false);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add stock.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Adjust Stock Modal
  const openAdjustStockModal = (target: {
    materialId: string;
    materialName: string;
    materialCode: string;
    unit: string;
    currentQty: number;
    projectId?: string;
    projectName?: string;
    preferredWarehouseId?: string;
  }) => {
    setAdjustStockTarget(target);
    setAdjustStockForm({
      newQty: String(target.currentQty),
      warehouseId: target.preferredWarehouseId || warehouses[0]?.id || '',
      reason: 'Physical Count Audit',
      remarks: '',
    });
    setShowAdjustStockModal(true);
  };

  // Handle Adjust Stock Submit
  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStockTarget) return;

    const newQtyNum = Number(adjustStockForm.newQty);
    if (isNaN(newQtyNum) || newQtyNum < 0) {
      alert('Please enter a valid non-negative actual stock count.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.adjustStock({
        materialId: adjustStockTarget.materialId,
        projectId: adjustStockTarget.projectId || undefined,
        warehouseId: adjustStockForm.warehouseId || undefined,
        newQty: newQtyNum,
        reason: adjustStockForm.reason,
        remarks: adjustStockForm.remarks,
      });

      if (res.success) {
        setShowAdjustStockModal(false);
        setAdjustStockTarget(null);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock count.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Requisitions
  const handleApproveReq = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await api.approveRequisition(id, { status });
      if (res.success) fetchData();
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

  const handleDeleteRequisition = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this material requisition?')) return;
    try {
      const res = await api.deleteRequisition(id);
      if (res.success) fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete requisition');
    }
  };

  // Material Master CRUD
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

  // Warehouse CRUD
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createWarehouse(warehouseForm);
      if (res.success) {
        setShowAddWarehouseModal(false);
        fetchData();
        setWarehouseForm({
          code: '',
          name: '',
          location: '',
          isSiteStore: false,
          contactPerson: '',
          projectId: '',
        });
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

  // Computed KPIs
  const lowStockCount = materials.filter((m) => m.isLowStock).length;
  const totalValuation = materials.reduce((acc, m) => acc + (m.totalValuation || 0), 0);
  const totalProjectStockItems = projectMaterials.reduce((acc, pm) => acc + (pm.availableStock > 0 ? 1 : 0), 0);
  const activeSelectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Top Header & Project Selection Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Material & Store Stock Panel
              </h1>
              {selectedProjectId && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Project Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time project material orders, site inwards, physical adjustments, and project-locked stock issuance.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {hasRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
              <button
                onClick={() => setShowRequisitionModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200 flex items-center space-x-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Raise Requisition</span>
              </button>
            )}

            {hasRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER') && (
              <button
                onClick={() => openAddStockModal()}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
                title="Inward incoming material shipment or add stock directly"
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ Inward / Add Stock</span>
              </button>
            )}

            {hasRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER') && (
              <button
                onClick={openGenericIssueModal}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Issue Stock</span>
              </button>
            )}

            {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
              <button
                onClick={() => setShowAddMaterialModal(true)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                title="Add New Material Master Catalog Item"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Project Selector Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Project Order Filter:</span>
            <select
              value={selectedProjectId || 'ALL'}
              onChange={(e) => setSelectedProjectId(e.target.value === 'ALL' ? '' : e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 bg-amber-50/60 border border-amber-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">🌐 All Projects (Consolidated Site Orders)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500">
            {activeSelectedProject ? (
              <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Showing materials ordered for <strong>{activeSelectedProject.name}</strong></span>
                <button
                  onClick={() => setSelectedProjectId('')}
                  className="ml-1 text-slate-400 hover:text-slate-700 underline text-[10px]"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-slate-400 text-[11px]">Displaying materials across all active project orders</span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project Orders Tracked</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">{projectMaterials.length}</span>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">Ordered Materials</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available On-Site Stock</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-700">{totalProjectStockItems}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Ready to Issue</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Store Inventory Valuation</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{formatCurrency(totalValuation)}</span>
            <span className="text-xs text-slate-400">Weighted Avg</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock Alert Status</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {lowStockCount}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${lowStockCount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {lowStockCount > 0 ? 'Low Stock Warning' : 'Healthy Levels'}
            </span>
          </div>
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
                Low Stock Threshold Warning: {lowStockCount} materials have fallen below safety reorder levels!
              </p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Inward pending deliveries or raise purchase requisitions to keep site construction on schedule.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('requisitions')}
            className="text-xs font-bold text-red-800 underline hover:text-red-950 shrink-0"
          >
            View Requisitions →
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'materials', label: `Materials & Stock (${projectMaterials.length > 0 ? projectMaterials.length : materials.length})`, icon: Boxes },
          { id: 'stores', label: `Stores & Warehouses (${warehouses.length})`, icon: WarehouseIcon },
          { id: 'requisitions', label: `Site Requisitions (${requisitions.length})`, icon: FileCheck },
          { id: 'ledger', label: `Stock Ledger Log (${ledger.length})`, icon: History },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
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

      {/* TAB 1: Materials & Stock Panel */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Sub-view Switch & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            {/* View Toggle */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMaterialView('project_orders')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  materialView === 'project_orders'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Materials Ordered for Projects ({projectMaterials.length})</span>
              </button>
              <button
                onClick={() => setMaterialView('catalog')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  materialView === 'catalog'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-blue-600" />
                <span>Central Material Catalog ({materials.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search material, code, project or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* VIEW A: Materials Ordered for Projects */}
          {materialView === 'project_orders' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {selectedProjectId && activeSelectedProject
                      ? `Materials Ordered for: [${activeSelectedProject.code}] ${activeSelectedProject.name}`
                      : 'Consolidated Project Material Orders & Site Inventory'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click <strong>Issue Stock</strong> to issue directly to this project, <strong>+ Inward</strong> to receive incoming material, or <strong>Adjust</strong> to update physical count.
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Showing {projectMaterials.length} material order lines
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-slate-500 font-semibold">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent mb-2"></div>
                  <p>Loading project material orders & stock balances...</p>
                </div>
              ) : projectMaterials.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Material Orders Found for Selected Project</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No purchase orders have been created yet for this project. You can inward stock directly using the button below or create a Purchase Order in Procurement.
                  </p>
                  <div className="pt-2 flex justify-center space-x-2">
                    <button
                      onClick={() => openAddStockModal()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      + Inward Direct Stock
                    </button>
                    <button
                      onClick={() => setMaterialView('catalog')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                    >
                      Browse Material Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-3">Material Code & Name</th>
                        <th className="py-3 px-3">Project</th>
                        <th className="py-3 px-3">Purchase Order & Supplier</th>
                        <th className="py-3 px-3 text-right">Ordered Qty</th>
                        <th className="py-3 px-3 text-right">Inward / Received</th>
                        <th className="py-3 px-3 text-right">Issued to Site</th>
                        <th className="py-3 px-3 text-right">Available On-Site Stock</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Stock Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {projectMaterials.map((pm) => (
                        <tr key={pm.id} className="hover:bg-amber-50/30 transition">
                          {/* Material Name & Category */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-slate-700 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {pm.materialCode}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{pm.materialName}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                {pm.category}
                              </span>
                              {pm.brand && <span className="text-[10px] text-slate-400">Brand: {pm.brand}</span>}
                              <span className="text-[10px] text-slate-500 font-mono">UOM: {pm.unit}</span>
                            </div>
                          </td>

                          {/* Project Tag */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <strong className="text-slate-900 block truncate max-w-[160px]" title={pm.projectName}>
                                {pm.projectName}
                              </strong>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{pm.projectCode}</span>
                          </td>

                          {/* Purchase Orders */}
                          <td className="py-3 px-3">
                            {pm.purchaseOrders && pm.purchaseOrders.length > 0 ? (
                              <div className="space-y-1">
                                {pm.purchaseOrders.slice(0, 2).map((po, idx) => (
                                  <div key={idx} className="flex items-center space-x-1.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                      {po.poNumber}
                                    </span>
                                    <span className="text-[11px] text-slate-700 truncate max-w-[140px]" title={po.supplierName}>
                                      {po.supplierName}
                                    </span>
                                  </div>
                                ))}
                                {pm.purchaseOrders.length > 2 && (
                                  <span className="text-[10px] text-slate-400 italic">
                                    +{pm.purchaseOrders.length - 2} more orders
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Direct Site Stock</span>
                            )}
                          </td>

                          {/* Ordered Qty */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                            {pm.totalOrderedQty > 0 ? (
                              <span>
                                {pm.totalOrderedQty} <span className="text-[10px] text-slate-500">{pm.unit}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Received / Inward Qty */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">
                            {pm.totalReceivedQty} <span className="text-[10px] text-blue-600">{pm.unit}</span>
                            {pm.pendingDeliveryQty > 0 && (
                              <span className="block text-[10px] text-amber-600 font-sans font-normal">
                                {pm.pendingDeliveryQty} {pm.unit} pending
                              </span>
                            )}
                          </td>

                          {/* Issued Qty */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600">
                            {pm.totalIssuedQty} <span className="text-[10px] text-slate-400">{pm.unit}</span>
                          </td>

                          {/* Available On-Site Stock */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-sm text-emerald-700 block">
                              {pm.availableStock} {pm.unit}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {formatCurrency(pm.totalValuation || 0)}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {pm.availableStock > 0 ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>In Stock</span>
                              </span>
                            ) : pm.pendingDeliveryQty > 0 ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Inward</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                <span>Fully Issued</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* 1. ISSUE STOCK BUTTON (Locked to this project & material) */}
                              {hasRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER') && (
                                <button
                                  onClick={() => openIssueModalForProjectMaterial(pm)}
                                  className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-[11px] shadow-sm transition cursor-pointer"
                                  title={`Issue this material to project: ${pm.projectName}`}
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Issue Stock</span>
                                </button>
                              )}

                              {/* 2. INWARD / ADD STOCK BUTTON */}
                              {hasRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER') && (
                                <button
                                  onClick={() => openAddStockModal(pm)}
                                  className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer"
                                  title="Inward / Add incoming stock for this project"
                                >
                                  <PackagePlus className="w-3 h-3" />
                                  <span>+ Inward</span>
                                </button>
                              )}

                              {/* 3. ADJUST STOCK BUTTON */}
                              {hasRole('OWNER', 'STOREKEEPER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER') && (
                                <button
                                  onClick={() =>
                                    openAdjustStockModal({
                                      materialId: pm.materialId,
                                      materialName: pm.materialName,
                                      materialCode: pm.materialCode,
                                      unit: pm.unit,
                                      currentQty: pm.availableStock,
                                      projectId: pm.projectId,
                                      projectName: pm.projectName,
                                      preferredWarehouseId: pm.preferredWarehouseId,
                                    })
                                  }
                                  className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1.5 rounded-lg text-[11px] transition cursor-pointer"
                                  title="Adjust / Update physical stock count in store"
                                >
                                  <Sliders className="w-3 h-3 text-slate-500" />
                                  <span>Adjust</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW B: Central Material Master Catalog */}
          {materialView === 'catalog' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Central Company Material Catalog & Multi-Store Inventory
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Master items, standard purchase rates, reorder thresholds, and warehouse balances.
                  </p>
                </div>
                {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
                  <button
                    onClick={() => setShowAddMaterialModal(true)}
                    className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Material Master</span>
                  </button>
                )}
              </div>

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
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Inward / Add Stock */}
                            <button
                              onClick={() => openAddStockModal(undefined, m)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Add / Inward stock for this material"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                            </button>

                            {/* Adjust stock */}
                            <button
                              onClick={() =>
                                openAdjustStockModal({
                                  materialId: m.id,
                                  materialName: m.name,
                                  materialCode: m.code,
                                  unit: m.unit,
                                  currentQty: m.totalQty || 0,
                                })
                              }
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Update / Adjust physical stock count"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit master */}
                            {hasRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER') && (
                              <button
                                onClick={() => openEditMaterial(m)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                title="Edit Material Master"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete master */}
                            {hasRole('OWNER', 'PURCHASE_MANAGER') && (
                              <button
                                onClick={() => setDeletingMaterial(m)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
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
          )}
        </div>
      )}

      {/* TAB 2: Stores & Warehouses */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stores & Warehouse Locations</h3>
              <p className="text-xs text-slate-500">Central logistics yards and on-site project stores</p>
            </div>
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
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          wh.isSiteStore ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
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

      {/* TAB 3: Material Requisitions */}
      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Site Engineer Material Requisitions</h3>
              <p className="text-xs text-slate-500">Approval gated by Storekeeper / Project Manager</p>
            </div>
            {hasRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
              <button
                onClick={() => setShowRequisitionModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Raise Requisition</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {requisitions.map((r) => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{r.requisitionNumber}</span>
                    <span className="text-xs font-semibold text-slate-700">[{r.project?.code}] {r.project?.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
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

      {/* TAB 4: Stock Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stock Ledger & Movement Audit Trail</h3>
              <p className="text-xs text-slate-500">Atomic inventory transactions with weighted average valuation</p>
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
                  <th className="py-2.5 px-3">Project / Store</th>
                  <th className="py-2.5 px-3">Ref / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ledger.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{l.txnNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(l.txnDate)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          l.txnType === 'PURCHASE_RECEIPT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.txnType === 'ISSUE_TO_SITE'
                            ? 'bg-amber-100 text-amber-800'
                            : l.txnType === 'PHYSICAL_ADJUSTMENT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
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
                      {l.project?.name ? `[${l.project.name}] ` : ''}
                      {l.sourceWarehouse?.name || l.destWarehouse?.name || 'Central Store'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={l.remarks || ''}>
                      {l.referenceNo && <span className="font-mono font-bold text-slate-700 mr-1">[{l.referenceNo}]</span>}
                      {l.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ISSUE STOCK (Locked to Particular Project)        */}
      {/* ========================================================= */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Issue Stock to Project Site</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {issueTarget
                    ? 'Stock will be deducted and issued strictly to the purchased project.'
                    : 'Select material, quantity, and project allocation.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setIssueTarget(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="mt-4 space-y-3.5">
              {/* Project Destination (Locked if issued from a project material row) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Project {issueTarget && <span className="text-amber-600 font-semibold">(Locked)</span>}
                </label>
                {issueTarget ? (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-300 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <strong className="text-xs text-amber-950 block">[{issueTarget.projectCode}] {issueTarget.projectName}</strong>
                        <span className="text-[10px] text-amber-700">Stock purchased specifically for this project</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      Locked
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    value={issueForm.projectId}
                    onChange={(e) => setIssueForm({ ...issueForm, projectId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">Select Target Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Material Selection (Locked if from row) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Material {issueTarget && <span className="text-amber-600 font-semibold">(Locked)</span>}
                  </label>
                  {issueTarget && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Available Stock: {issueTarget.availableStock} {issueTarget.unit}
                    </span>
                  )}
                </div>
                {issueTarget ? (
                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                    <strong className="text-xs text-slate-900 block">{issueTarget.materialName}</strong>
                    <span className="text-[10px] font-mono text-slate-500">Code: {issueTarget.materialCode}</span>
                  </div>
                ) : (
                  <select
                    required
                    value={issueForm.materialId}
                    onChange={(e) => setIssueForm({ ...issueForm, materialId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">Select Material to Issue</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.code}] {m.name} ({m.totalQty || 0} {m.unit} in stock)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Issue Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Issue Qty *</label>
                    {issueTarget && issueTarget.availableStock > 0 && (
                      <button
                        type="button"
                        onClick={() => setIssueForm({ ...issueForm, qty: String(issueTarget.availableStock) })}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Max ({issueTarget.availableStock})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={issueForm.qty}
                    onChange={(e) => setIssueForm({ ...issueForm, qty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Store</label>
                  <select
                    value={issueForm.sourceWarehouseId}
                    onChange={(e) => setIssueForm({ ...issueForm, sourceWarehouseId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Auto-Detect Store with Stock</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} {wh.isSiteStore ? '(Site Store)' : '(Yard)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference Slip & Work Purpose */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Issue Slip / Indent #</label>
                  <input
                    type="text"
                    placeholder="e.g. SLIP-1042"
                    value={issueForm.referenceNo}
                    onChange={(e) => setIssueForm({ ...issueForm, referenceNo: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Movement Type</label>
                  <select
                    value={issueForm.txnType}
                    onChange={(e) => setIssueForm({ ...issueForm, txnType: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="ISSUE_TO_SITE">Issue to Site Work</option>
                    <option value="CONSUMED">Direct Consumption</option>
                    <option value="SITE_TRANSFER">Store Transfer</option>
                    <option value="WASTAGE">Wastage / Scrap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Location on Site</label>
                <input
                  type="text"
                  placeholder="e.g. 4th floor column casting, Block B brick masonry"
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowIssueModal(false);
                    setIssueTarget(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? 'Issuing...' : 'Confirm & Issue Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: INWARD / ADD STOCK DIRECTLY                      */}
      {/* ========================================================= */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inward / Add Stock to Store</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record received material shipments directly to update physical store balances.
                </p>
              </div>
              <button onClick={() => setShowAddStockModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="mt-4 space-y-3.5">
              {/* Material Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material *</label>
                <select
                  required
                  value={addStockForm.materialId}
                  onChange={(e) => setAddStockForm({ ...addStockForm, materialId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Select Material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Allocation (Optional)</label>
                <select
                  value={addStockForm.projectId}
                  onChange={(e) => setAddStockForm({ ...addStockForm, projectId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Company Central Stock (No Project Tag)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inward Quantity *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100"
                    value={addStockForm.qty}
                    onChange={(e) => setAddStockForm({ ...addStockForm, qty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 380"
                    value={addStockForm.unitPrice}
                    onChange={(e) => setAddStockForm({ ...addStockForm, unitPrice: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Destination Warehouse */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Store / Warehouse</label>
                <select
                  value={addStockForm.warehouseId}
                  onChange={(e) => setAddStockForm({ ...addStockForm, warehouseId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Auto-Assign to Project Site Store / Central Yard</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.isSiteStore ? '(Site Store)' : '(Yard)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier & Delivery Challan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech Cement Agency"
                    value={addStockForm.supplierName}
                    onChange={(e) => setAddStockForm({ ...addStockForm, supplierName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Challan / Slip #</label>
                  <input
                    type="text"
                    placeholder="e.g. DC-98412"
                    value={addStockForm.referenceNo}
                    onChange={(e) => setAddStockForm({ ...addStockForm, referenceNo: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Quality Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received 100 bags in sound dry condition"
                  value={addStockForm.remarks}
                  onChange={(e) => setAddStockForm({ ...addStockForm, remarks: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? 'Adding...' : 'Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADJUST / UPDATE PHYSICAL STOCK COUNT             */}
      {/* ========================================================= */}
      {showAdjustStockModal && adjustStockTarget && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Adjust / Update Physical Stock</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update the recorded stock quantity to match actual on-ground physical inventory.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAdjustStockModal(false);
                  setAdjustStockTarget(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="mt-4 space-y-3.5">
              {/* Material Info Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-slate-900">{adjustStockTarget.materialName}</strong>
                  <span className="font-mono text-[11px] font-bold text-slate-600">{adjustStockTarget.materialCode}</span>
                </div>
                {adjustStockTarget.projectName && (
                  <p className="text-[11px] text-amber-700 mt-0.5 font-semibold">
                    Project: {adjustStockTarget.projectName}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500 font-semibold">Currently Recorded Stock:</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {adjustStockTarget.currentQty} {adjustStockTarget.unit}
                  </span>
                </div>
              </div>

              {/* New Actual Physical Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Actual Physical Count *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Enter new actual quantity"
                    value={adjustStockForm.newQty}
                    onChange={(e) => setAdjustStockForm({ ...adjustStockForm, newQty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-sm"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-500 font-bold">
                    {adjustStockTarget.unit}
                  </span>
                </div>

                {/* Delta Display */}
                {adjustStockForm.newQty !== '' && !isNaN(Number(adjustStockForm.newQty)) && (
                  <div className="mt-1.5 flex items-center space-x-1.5 text-xs font-semibold">
                    <span className="text-slate-500">Adjustment Delta:</span>
                    {Number(adjustStockForm.newQty) - adjustStockTarget.currentQty >= 0 ? (
                      <span className="text-emerald-700 font-mono font-bold">
                        +{Number(adjustStockForm.newQty) - adjustStockTarget.currentQty} {adjustStockTarget.unit} (Increase)
                      </span>
                    ) : (
                      <span className="text-red-700 font-mono font-bold">
                        {Number(adjustStockForm.newQty) - adjustStockTarget.currentQty} {adjustStockTarget.unit} (Reduction)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Store to Adjust */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store / Warehouse Location</label>
                <select
                  value={adjustStockForm.warehouseId}
                  onChange={(e) => setAdjustStockForm({ ...adjustStockForm, warehouseId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.isSiteStore ? '(Site Store)' : '(Yard)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Adjustment *</label>
                <select
                  value={adjustStockForm.reason}
                  onChange={(e) => setAdjustStockForm({ ...adjustStockForm, reason: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Physical Count Audit">Physical Count Audit</option>
                  <option value="Found Excess Stock">Found Excess Stock</option>
                  <option value="Damaged / Spoiled on Site">Damaged / Spoiled on Site</option>
                  <option value="Data Entry Correction">Data Entry Correction</option>
                  <option value="Supplier Short Delivery">Supplier Short Delivery</option>
                  <option value="Site Wastage / Evaporation">Site Wastage / Evaporation</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Notes / Explanations</label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory verified by storekeeper and PM"
                  value={adjustStockForm.remarks}
                  onChange={(e) => setAdjustStockForm({ ...adjustStockForm, remarks: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustStockModal(false);
                    setAdjustStockTarget(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? 'Updating...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: RAISE REQUISITION                                */}
      {/* ========================================================= */}
      {showRequisitionModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Raise Material Requisition</h3>
              <button onClick={() => setShowRequisitionModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRequisition} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                <select
                  required
                  value={reqForm.projectId}
                  onChange={(e) => setReqForm({ ...reqForm, projectId: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Required Date *</label>
                  <input
                    type="date"
                    required
                    value={reqForm.requiredDate}
                    onChange={(e) => setReqForm({ ...reqForm, requiredDate: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={reqForm.priority}
                    onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

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
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Select Material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} ({m.unit})
                    </option>
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequisitionModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm cursor-pointer"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: ADD MATERIAL MASTER CATALOG ITEM                */}
      {/* ========================================================= */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Central Material Master</h3>
              <button onClick={() => setShowAddMaterialModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Material Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAT-CEM-03"
                    value={matForm.code}
                    onChange={(e) => setMatForm({ ...matForm, code: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={matForm.category}
                    onChange={(e) => setMatForm({ ...matForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UOM *</label>
                  <select
                    value={matForm.unit}
                    onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    value={matForm.minStockLevel}
                    onChange={(e) => setMatForm({ ...matForm, minStockLevel: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT MATERIAL MASTER */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Material Master</h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingMaterial.code}</p>
              </div>
              <button onClick={() => setEditingMaterial(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMaterial} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={editMaterialForm.name}
                  onChange={(e) => setEditMaterialForm({ ...editMaterialForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard (₹)</label>
                  <input
                    type="number"
                    value={editMaterialForm.standardPrice}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, standardPrice: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={editMaterialForm.minStockLevel}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, minStockLevel: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Qty</label>
                  <input
                    type="number"
                    value={editMaterialForm.reorderQty}
                    onChange={(e) => setEditMaterialForm({ ...editMaterialForm, reorderQty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm cursor-pointer"
                >
                  Update Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: DELETE MATERIAL CONFIRMATION */}
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
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMaterial}
                disabled={isDeletingMaterial}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isDeletingMaterial ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ADD WAREHOUSE */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Warehouse / Store</h3>
              <button onClick={() => setShowAddWarehouseModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Store Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-MAIN-01"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={warehouseForm.isSiteStore ? 'site' : 'central'}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, isSiteStore: e.target.value === 'site' })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: EDIT WAREHOUSE */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Warehouse</h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingWarehouse.code}</p>
              </div>
              <button onClick={() => setEditingWarehouse(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store / Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={editWarehouseForm.name}
                  onChange={(e) => setEditWarehouseForm({ ...editWarehouseForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: DELETE WAREHOUSE */}
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
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWarehouse}
                disabled={isDeletingWarehouse}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
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
