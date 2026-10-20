import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { BOQItem } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
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
} from 'lucide-react';

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

  // Form states
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    description: '',
    category: 'CONCRETE',
    unit: 'CUMT',
    estimatedQty: '',
    materialUnitCost: '',
    labourUnitCost: '',
    equipmentUnitCost: '',
    subcontractUnitCost: '0',
    otherUnitCost: '0',
  });

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
          category: 'CONCRETE',
          unit: 'CUMT',
          estimatedQty: '',
          materialUnitCost: '',
          labourUnitCost: '',
          equipmentUnitCost: '',
          subcontractUnitCost: '0',
          otherUnitCost: '0',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create BOQ item');
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">BOQ, Estimation & Budgets</h1>
          <p className="text-xs text-slate-500 mt-1">
            Bill of Quantities itemization, rate breakdown analysis, and live budget vs actual variance tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasRole('OWNER') && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              Budget Revision
            </button>
          )}

          {hasRole('OWNER', 'PROJECT_MANAGER') && (
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
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Project:</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setSelectedProjectId(e.target.value);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
          >
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
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="">All Cost Categories</option>
            <option value="EARTHWORK">Earthwork & Excavation</option>
            <option value="CONCRETE">Concrete Works (RMC/Mix)</option>
            <option value="STEEL">Steel Reinforcement Fe500D</option>
            <option value="MASONRY">AAC / Brick Masonry</option>
            <option value="PLASTERING">Plastering Works</option>
            <option value="FLOORING">Tile & Marble Flooring</option>
            <option value="PAINTING">Painting & Finishing</option>
            <option value="PLUMBING">Plumbing & Sanitary</option>
            <option value="ELECTRICAL">Electrical & Conduits</option>
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
          <span className="text-[10px] text-slate-400">Material + Labour + Machine costs</span>
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

      {/* BOQ Items Table with Rate Breakdown */}
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
                <th className="py-3 px-3 text-right">Material</th>
                <th className="py-3 px-3 text-right">Labour</th>
                <th className="py-3 px-3 text-right">Equipment</th>
                <th className="py-3 px-3 text-right">Unit Rate</th>
                <th className="py-3 px-3 text-right">Total Est. Cost</th>
                <th className="py-3 px-3 text-right">Actual Qty</th>
                <th className="py-3 px-3 text-right">Actual Cost</th>
                <th className="py-3 px-3 text-center">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">Loading BOQ itemization...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">No BOQ items found for this project.</td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOverBudget = item.actualExpenditure > item.estimatedTotal;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{item.itemCode}</td>
                      <td className="py-3 px-3 max-w-xs text-slate-900 font-semibold" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{item.unit}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">{item.estimatedQty}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{item.materialUnitCost}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{item.labourUnitCost}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">₹{item.equipmentUnitCost}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{item.unitRate}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(item.estimatedTotal)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">{item.actualQtyCompleted}</td>
                      <td className="py-3 px-3 text-right font-bold font-mono text-amber-700">
                        {formatCurrency(item.actualExpenditure)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isOverBudget ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span>Overrun</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Normal</span>
                          </span>
                        )}
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add BOQ Item & Rate Breakdown</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BOQ-07"
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CONCRETE">Concrete</option>
                    <option value="STEEL">Steel Reinforcement</option>
                    <option value="EARTHWORK">Earthwork & Excavation</option>
                    <option value="MASONRY">Masonry</option>
                    <option value="PLASTERING">Plastering</option>
                    <option value="FLOORING">Flooring</option>
                    <option value="PAINTING">Painting</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detailed work specification and grade..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Qty *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={itemForm.estimatedQty}
                    onChange={(e) => setItemForm({ ...itemForm, estimatedQty: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measurement (UOM) *</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CUMT">Cubic Metre (CUMT)</option>
                    <option value="TONNE">Metric Tonne (TONNE)</option>
                    <option value="SQMT">Square Metre (SQMT)</option>
                    <option value="SQFT">Square Feet (SQFT)</option>
                    <option value="BAG">Bags</option>
                    <option value="CFT">Cubic Feet (CFT)</option>
                    <option value="NOS">Numbers (NOS)</option>
                    <option value="RFT">Running Feet (RFT)</option>
                  </select>
                </div>
              </div>

              {/* Unit Rate Cost Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Unit Rate Cost Breakdown (₹ per unit)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Material Cost</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={itemForm.materialUnitCost}
                      onChange={(e) => setItemForm({ ...itemForm, materialUnitCost: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Labour Cost</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={itemForm.labourUnitCost}
                      onChange={(e) => setItemForm({ ...itemForm, labourUnitCost: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Equipment Cost</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={itemForm.equipmentUnitCost}
                      onChange={(e) => setItemForm({ ...itemForm, equipmentUnitCost: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Add to BOQ
                </button>
              </div>
            </form>
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
                  placeholder="e.g. Steel market price hike and additional client basement floor scope."
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
