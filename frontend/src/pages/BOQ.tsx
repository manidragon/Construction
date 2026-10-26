import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { BOQItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Calculator,
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  X,
  Eye,
  Edit2,
  Trash2,
  Image as ImageIcon,
  FileText,
  Palette,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const BOQ_CATEGORIES = [
  // Interior Design & Fit-Out Specific Categories
  { value: 'FALSE_CEILING', label: 'False Ceiling (Gypsum / POP / Grid)' },
  { value: 'CARPENTRY_JOINERY', label: 'Carpentry & Joinery' },
  { value: 'MODULAR_KITCHENS', label: 'Modular Kitchens & Wardrobes' },
  { value: 'ELECTRICAL_LIGHTING', label: 'Electrical & Lighting Fixtures' },
  { value: 'PLUMBING_SANITARYWARE', label: 'Plumbing & Sanitaryware' },
  { value: 'FLOORING_TILING', label: 'Flooring & Tiling' },
  { value: 'PAINTING_WALLPAPERS', label: 'Painting & Wallpapers' },
  { value: 'SOFT_FURNISHINGS', label: 'Soft Furnishings & Curtains' },
  { value: 'GLASS_ALUMINUM', label: 'Glass & Aluminum Work' },
  { value: 'HVAC_AC', label: 'HVAC / Air Conditioning' },
  { value: 'CUSTOM_MILLWORK', label: 'Custom Millwork & Paneling' },
  // General Construction Categories
  { value: 'CONCRETE', label: 'Concrete Works (RMC/Mix)' },
  { value: 'STEEL', label: 'Steel Reinforcement Fe500D' },
  { value: 'EARTHWORK', label: 'Earthwork & Excavation' },
  { value: 'MASONRY', label: 'AAC / Brick Masonry' },
  { value: 'PLASTERING', label: 'Plastering Works' },
  { value: 'CIVIL_WORK', label: 'General Civil Work' },
];

export const BOQ_UNITS = [
  // Interior Relevant Measurement Units
  { value: 'SQFT', label: 'Sq. Ft. (Square Feet)' },
  { value: 'RFT', label: 'Running Feet (RFT)' },
  { value: 'NOS', label: 'Numbers (Nos.)' },
  { value: 'LS', label: 'Lump Sum (LS)' },
  { value: 'SHEETS', label: 'Sheets' },
  { value: 'SETS', label: 'Sets' },
  // General Construction Units
  { value: 'SQMT', label: 'Square Metre (SQMT)' },
  { value: 'CUMT', label: 'Cubic Metre (CUMT)' },
  { value: 'CFT', label: 'Cubic Feet (CFT)' },
  { value: 'TONNE', label: 'Metric Tonne (TONNE)' },
  { value: 'BAG', label: 'Bags' },
  { value: 'KGS', label: 'Kilograms (Kgs)' },
];

export const BOQ: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || (projects[0]?.id || ''));
  const [items, setItems] = useState<BOQItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<BOQItem | null>(null);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<BOQItem | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    description: '',
    category: 'FALSE_CEILING',
    unit: 'SQFT',
    estimatedQty: '',
    materialUnitCost: '',
    labourUnitCost: '',
    equipmentUnitCost: '0',
    subcontractUnitCost: '0',
    otherUnitCost: '0',
    materialSwatchUrl: '',
    designRenderUrl: '',
    clientApprovalStatus: 'APPROVED',
    clientSignOffDoc: '',
    clientSignOffDate: '',
    scopeVariationNotes: '',
  });

  const [editForm, setEditForm] = useState<any>({});

  const [revisionForm, setRevisionForm] = useState({
    revisedBudget: '',
    reason: '',
  });

  // Keep synced with global selector if changed
  useEffect(() => {
    if (selectedProjectId) {
      setProjectId(selectedProjectId);
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [selectedProjectId, projects]);

  const fetchBOQ = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getBOQ(projectId);
      if (res.success) {
        setItems(res.items || []);
        setSummary(res.summary || {});
        setRevisions(res.revisions || []);
      }
    } catch (err) {
      console.error('Failed to load BOQ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBOQ();
  }, [projectId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      const res = await api.createBOQItem(projectId, itemForm);
      if (res.success) {
        setShowAddModal(false);
        fetchBOQ();
        setItemForm({
          itemCode: '',
          description: '',
          category: 'FALSE_CEILING',
          unit: 'SQFT',
          estimatedQty: '',
          materialUnitCost: '',
          labourUnitCost: '',
          equipmentUnitCost: '0',
          subcontractUnitCost: '0',
          otherUnitCost: '0',
          materialSwatchUrl: '',
          designRenderUrl: '',
          clientApprovalStatus: 'APPROVED',
          clientSignOffDoc: '',
          clientSignOffDate: '',
          scopeVariationNotes: '',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create BOQ item');
    }
  };

  const openEditModal = (item: BOQItem) => {
    setEditingItem(item);
    setEditForm({
      itemCode: item.itemCode,
      description: item.description,
      category: item.category,
      unit: item.unit,
      estimatedQty: String(item.estimatedQty),
      materialUnitCost: String(item.materialUnitCost),
      labourUnitCost: String(item.labourUnitCost),
      equipmentUnitCost: String(item.equipmentUnitCost || 0),
      subcontractUnitCost: String(item.subcontractUnitCost || 0),
      otherUnitCost: String(item.otherUnitCost || 0),
      actualQtyCompleted: String(item.actualQtyCompleted || 0),
      actualExpenditure: String(item.actualExpenditure || 0),
      materialSwatchUrl: item.materialSwatchUrl || '',
      designRenderUrl: item.designRenderUrl || '',
      clientApprovalStatus: item.clientApprovalStatus || 'APPROVED',
      clientSignOffDoc: item.clientSignOffDoc || '',
      clientSignOffDate: item.clientSignOffDate ? new Date(item.clientSignOffDate).toISOString().split('T')[0] : '',
      scopeVariationNotes: item.scopeVariationNotes || '',
    });
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await api.updateBOQItem(editingItem.id, editForm);
      if (res.success) {
        setEditingItem(null);
        fetchBOQ();
        if (viewingItem?.id === editingItem.id) {
          setViewingItem(res.item);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update BOQ item');
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      const res = await api.deleteBOQItem(deletingItem.id);
      if (res.success) {
        if (viewingItem?.id === deletingItem.id) {
          setViewingItem(null);
        }
        setDeletingItem(null);
        fetchBOQ();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete BOQ item');
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      const res = await api.createBudgetRevision(projectId, revisionForm);
      if (res.success) {
        setShowRevisionModal(false);
        fetchBOQ();
        setRevisionForm({ revisedBudget: '', reason: '' });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create revision');
    }
  };

  const filteredItems = items.filter((i) => !categoryFilter || i.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center space-x-1">
              <Calculator className="w-3 h-3 text-indigo-600" />
              <span>Company Purpose (Internal Costing & Tasks)</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">Internal BOQ & Cost Estimation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Company-internal engineering Bill of Quantities. Directly connected to Project Tasks for execution scheduling, contractor labour advances, material planning, and budget vs actual variance control.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER') && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              Budget Revision
            </button>
          )}

          {hasRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add BOQ Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Selector & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">Project:</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setSelectedProjectId(e.target.value);
            }}
            className="text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm min-w-[280px] sm:min-w-[340px] md:min-w-[400px] cursor-pointer transition"
          >
            {projects.length === 0 && <option value="">Loading projects...</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm min-w-[200px] sm:min-w-[260px] cursor-pointer transition"
          >
            <option value="">All Categories (Civil & Interior)</option>
            <optgroup label="✨ Interior Design & Fit-Out">
              {BOQ_CATEGORIES.slice(0, 11).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="🏗️ General Construction">
              {BOQ_CATEGORIES.slice(11).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Approved Estimated Budget</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(summary?.totalEstimated || 0)}</p>
          <span className="text-[10px] text-slate-400">{summary?.totalItems || 0} Line Items Itemized</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Actual Incurred Expenditure</span>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{formatCurrency(summary?.totalActual || 0)}</p>
          <span className="text-[10px] text-slate-400">Material + Labour + Fit-Out expenses</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Budget Remaining / Variance</span>
          <p className={`text-xl font-extrabold mt-1 ${(summary?.variance || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(summary?.variance || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            {(summary?.variance || 0) < 0 ? '⚠️ Budget Overrun!' : '✓ Within approved ceiling'}
          </span>
        </div>
      </div>

      {/* BOQ Items Table with Rate Breakdown & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-3">Item Code</th>
                <th className="py-3 px-3">Work Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">UOM</th>
                <th className="py-3 px-3 text-right">Est. Qty</th>
                <th className="py-3 px-3 text-right">Unit Rate</th>
                <th className="py-3 px-3 text-right">Total Est. Cost</th>
                <th className="py-3 px-3 text-right">Actual Cost</th>
                <th className="py-3 px-3 text-center">Swatch / Render</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">Loading BOQ itemization...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">No BOQ items found for this project.</td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOverBudget = item.actualExpenditure > item.estimatedTotal;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{item.itemCode}</td>
                      <td className="py-3 px-3 max-w-xs text-slate-900 font-semibold truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 font-semibold">{item.unit}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">{item.estimatedQty}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{item.unitRate}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(item.estimatedTotal)}</td>
                      <td className="py-3 px-3 text-right font-bold font-mono text-amber-700">
                        {formatCurrency(item.actualExpenditure)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {item.materialSwatchUrl ? (
                            <a
                              href={item.materialSwatchUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Material Swatch attached"
                              className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                          {item.designRenderUrl ? (
                            <a
                              href={item.designRenderUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="3D Design Render attached"
                              className="p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                          {!item.materialSwatchUrl && !item.designRenderUrl && (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.clientApprovalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.clientApprovalStatus === 'VARIATION_REQUESTED' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.clientApprovalStatus || 'APPROVED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setViewingItem(item)}
                            title="View Details"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasRole('OWNER', 'PROJECT_MANAGER') && (
                            <>
                              <button
                                onClick={() => openEditModal(item)}
                                title="Edit BOQ Item"
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingItem(item)}
                                title="Delete BOQ Item"
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add BOQ Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add BOQ Item (Civil & Interior Fit-Out)</h3>
                <p className="text-xs text-slate-500">Configure rate breakdown, measurement units, and client design attachments</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INT-FC-01 or BOQ-07"
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <optgroup label="✨ Interior Design & Fit-Out">
                      {BOQ_CATEGORIES.slice(0, 11).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🏗️ General Construction">
                      {BOQ_CATEGORIES.slice(11).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Description & Scope *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detailed specification, material grade, brand, and installation scope..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 500"
                    value={itemForm.estimatedQty}
                    onChange={(e) => setItemForm({ ...itemForm, estimatedQty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit (UOM) *</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <optgroup label="✨ Interior Units">
                      {BOQ_UNITS.slice(0, 6).map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🏗️ Construction Units">
                      {BOQ_UNITS.slice(6).map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Unit Rate Cost Breakdown */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Unit Rate Cost Breakdown (₹ per unit)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Material Unit Cost</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={itemForm.materialUnitCost}
                      onChange={(e) => setItemForm({ ...itemForm, materialUnitCost: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Labour Unit Cost</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={itemForm.labourUnitCost}
                      onChange={(e) => setItemForm({ ...itemForm, labourUnitCost: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Machine / Subcontract</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={itemForm.equipmentUnitCost}
                      onChange={(e) => setItemForm({ ...itemForm, equipmentUnitCost: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Interior Design Renders & Client Approval Records */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-3">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-700" />
                  <span>Interior Design Attachments & Client Sign-Off</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Material Swatch Image URL</label>
                    <input
                      type="url"
                      placeholder="https://... swatch photo link"
                      value={itemForm.materialSwatchUrl}
                      onChange={(e) => setItemForm({ ...itemForm, materialSwatchUrl: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">3D Design Render URL</label>
                    <input
                      type="url"
                      placeholder="https://... 3D render render link"
                      value={itemForm.designRenderUrl}
                      onChange={(e) => setItemForm({ ...itemForm, designRenderUrl: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Client Approval Status</label>
                    <select
                      value={itemForm.clientApprovalStatus}
                      onChange={(e) => setItemForm({ ...itemForm, clientApprovalStatus: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="APPROVED">APPROVED (Ready for Execution)</option>
                      <option value="PENDING">PENDING (Awaiting Client Review)</option>
                      <option value="VARIATION_REQUESTED">VARIATION REQUESTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Client Sign-Off Doc / Link</label>
                    <input
                      type="text"
                      placeholder="e.g. Doc Ref / Client approval email link"
                      value={itemForm.clientSignOffDoc}
                      onChange={(e) => setItemForm({ ...itemForm, clientSignOffDoc: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Scope Variation / Client Notes</label>
                  <input
                    type="text"
                    placeholder="Specific design remarks, edge finishes, client change requests..."
                    value={itemForm.scopeVariationNotes}
                    onChange={(e) => setItemForm({ ...itemForm, scopeVariationNotes: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-sm transition"
                >
                  Save to BOQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit BOQ Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit BOQ Item: {editingItem.itemCode}</h3>
                <p className="text-xs text-slate-500">Update rates, interior specifications, design renders, and approval records</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={editForm.itemCode}
                    onChange={(e) => setEditForm({ ...editForm, itemCode: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <optgroup label="✨ Interior Design & Fit-Out">
                      {BOQ_CATEGORIES.slice(0, 11).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🏗️ General Construction">
                      {BOQ_CATEGORIES.slice(11).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Description *</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editForm.estimatedQty}
                    onChange={(e) => setEditForm({ ...editForm, estimatedQty: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit (UOM) *</label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <optgroup label="✨ Interior Units">
                      {BOQ_UNITS.slice(0, 6).map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🏗️ Construction Units">
                      {BOQ_UNITS.slice(6).map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Unit Rate Cost Breakdown */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Unit Rate Cost Breakdown (₹ per unit)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Material Unit Cost</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.materialUnitCost}
                      onChange={(e) => setEditForm({ ...editForm, materialUnitCost: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Labour Unit Cost</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.labourUnitCost}
                      onChange={(e) => setEditForm({ ...editForm, labourUnitCost: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Machine / Subcontract</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.equipmentUnitCost}
                      onChange={(e) => setEditForm({ ...editForm, equipmentUnitCost: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Interior Design Renders & Client Approval Records */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-3">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-700" />
                  <span>Interior Design Attachments & Client Sign-Off</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Material Swatch Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editForm.materialSwatchUrl}
                      onChange={(e) => setEditForm({ ...editForm, materialSwatchUrl: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">3D Design Render URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editForm.designRenderUrl}
                      onChange={(e) => setEditForm({ ...editForm, designRenderUrl: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Client Approval Status</label>
                    <select
                      value={editForm.clientApprovalStatus}
                      onChange={(e) => setEditForm({ ...editForm, clientApprovalStatus: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="APPROVED">APPROVED (Ready for Execution)</option>
                      <option value="PENDING">PENDING (Awaiting Client Review)</option>
                      <option value="VARIATION_REQUESTED">VARIATION REQUESTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Client Sign-Off Doc / Link</label>
                    <input
                      type="text"
                      placeholder="e.g. Sign-off doc URL"
                      value={editForm.clientSignOffDoc}
                      onChange={(e) => setEditForm({ ...editForm, clientSignOffDoc: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Scope Variation / Client Notes</label>
                  <input
                    type="text"
                    value={editForm.scopeVariationNotes}
                    onChange={(e) => setEditForm({ ...editForm, scopeVariationNotes: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-sm transition"
                >
                  Update BOQ Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View BOQ Item Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {viewingItem.itemCode}
                </span>
                <span className="text-xs font-bold text-amber-700">{viewingItem.category.replace(/_/g, ' ')}</span>
              </div>
              <button onClick={() => setViewingItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{viewingItem.description}</h4>
                <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                  <span>Unit: <strong className="text-slate-800">{viewingItem.unit}</strong></span>
                  <span>Est Qty: <strong className="text-slate-800">{viewingItem.estimatedQty}</strong></span>
                  <span>Unit Rate: <strong className="text-slate-800">₹{viewingItem.unitRate}</strong></span>
                </div>
              </div>

              {/* Financial comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Estimated Cost</span>
                  <p className="text-base font-extrabold text-slate-900">{formatCurrency(viewingItem.estimatedTotal)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Actual Cost Incurred</span>
                  <p className="text-base font-extrabold text-amber-700">{formatCurrency(viewingItem.actualExpenditure)}</p>
                </div>
              </div>

              {/* Rate Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">Cost Rate Breakdown (₹/unit)</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Material</span>
                    <strong className="text-slate-800">₹{viewingItem.materialUnitCost}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Labour</span>
                    <strong className="text-slate-800">₹{viewingItem.labourUnitCost}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Equipment/Other</span>
                    <strong className="text-slate-800">₹{(viewingItem.equipmentUnitCost || 0) + (viewingItem.subcontractUnitCost || 0)}</strong>
                  </div>
                </div>
              </div>

              {/* Interior Attachments */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2">
                <span className="text-xs font-bold text-amber-900 block">Interior Attachments & Client Sign-Off</span>
                <div className="grid grid-cols-2 gap-3">
                  {viewingItem.materialSwatchUrl ? (
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Material Swatch</span>
                      <a
                        href={viewingItem.materialSwatchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-amber-700 font-bold hover:underline"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>View Swatch Sample</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">No swatch attached</span>
                  )}

                  {viewingItem.designRenderUrl ? (
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">3D Design Render</span>
                      <a
                        href={viewingItem.designRenderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-700 font-bold hover:underline"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View 3D Render</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">No render attached</span>
                  )}
                </div>

                <div className="pt-2 border-t border-amber-200/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client Approval Status:</span>
                    <strong className="text-emerald-700 font-bold">{viewingItem.clientApprovalStatus || 'APPROVED'}</strong>
                  </div>
                  {viewingItem.clientSignOffDoc && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-500">Sign-Off Record:</span>
                      <span className="font-mono text-slate-800">{viewingItem.clientSignOffDoc}</span>
                    </div>
                  )}
                  {viewingItem.scopeVariationNotes && (
                    <div className="mt-1.5 p-2 bg-white rounded border border-amber-200/60 text-slate-700">
                      <strong>Variation Notes:</strong> {viewingItem.scopeVariationNotes}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                {hasRole('OWNER', 'PROJECT_MANAGER') && (
                  <button
                    onClick={() => {
                      const item = viewingItem;
                      setViewingItem(null);
                      openEditModal(item);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl"
                  >
                    Edit This Item
                  </button>
                )}
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5">
            <h3 className="text-sm font-bold text-slate-900">Delete BOQ Line Item</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to delete <strong className="text-slate-800 font-mono">[{deletingItem.itemCode}]</strong>? This will remove the item and deduct <strong className="text-slate-800">{formatCurrency(deletingItem.estimatedTotal)}</strong> from the project approved budget.
            </p>
            <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Submit Approved Budget Revision</h3>
              <button onClick={() => setShowRevisionModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRevision} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Revised Budget Ceiling (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 310000000"
                  value={revisionForm.revisedBudget}
                  onChange={(e) => setRevisionForm({ ...revisionForm, revisedBudget: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Formal Justification / Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Fit-out design upgrade and additional false ceiling / modular kitchen scope."
                  value={revisionForm.reason}
                  onChange={(e) => setRevisionForm({ ...revisionForm, reason: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Approve Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
