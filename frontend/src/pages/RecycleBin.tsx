import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Trash2,
  RotateCcw,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users,
  Building2,
  CheckSquare,
  Calculator,
  Receipt,
  Boxes,
  ClipboardList,
  RefreshCw,
  Archive,
  Layers,
  Sparkles,
  Info,
  Clock,
  User,
  ArrowRight,
  ShieldAlert,
  X,
  FileJson,
} from 'lucide-react';

interface RecycleBinItem {
  id: string;
  tenantId?: string | null;
  entityType: string;
  entityId: string;
  itemNumber?: string | null;
  title: string;
  description?: string | null;
  data: string;
  deletedById?: string | null;
  deletedByName?: string | null;
  deletedAt: string;
}

export const RecycleBin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Modals & feedback state
  const [inspectItem, setInspectItem] = useState<RecycleBinItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<RecycleBinItem | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);

  const fetchBinItems = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (activeTab !== 'ALL') {
        queryParams.append('entityType', activeTab);
      }
      if (search.trim()) {
        queryParams.append('search', search.trim());
      }

      const res = await api.getRecycleBinItems(queryParams.toString());
      if (res.success) {
        setItems(res.items || []);
        setCounts(res.counts || {});
      }
    } catch (err: any) {
      console.error('Failed to load recycle bin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBinItems();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBinItems();
  };

  const handleRestore = async (item: RecycleBinItem) => {
    try {
      setActionLoading(true);
      const res = await api.restoreRecycleBinItem(item.id);
      if (res.success) {
        let destinationLink = '';
        if (item.entityType === 'Quotation') destinationLink = '/quotations';
        else if (item.entityType === 'Lead') destinationLink = '/leads';
        else if (item.entityType === 'Project') destinationLink = '/projects';
        else if (item.entityType === 'Task') destinationLink = '/tasks';
        else if (item.entityType === 'Expense') destinationLink = '/expenses';

        setStatusMessage({
          type: 'success',
          text: `Restored ${item.entityType} "${item.itemNumber || item.title}" successfully!`,
          link: destinationLink,
        });

        // Close inspect modal if open
        if (inspectItem?.id === item.id) {
          setInspectItem(null);
        }

        // Refresh list
        fetchBinItems();
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to restore item.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error occurred while restoring.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (item: RecycleBinItem) => {
    try {
      setActionLoading(true);
      const res = await api.permanentDeleteRecycleBinItem(item.id);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Permanently purged ${item.entityType} "${item.itemNumber || item.title}".`,
        });
        setDeleteConfirmItem(null);
        fetchBinItems();
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to purge item.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error purging item.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmptyBin = async () => {
    try {
      setActionLoading(true);
      const res = await api.emptyRecycleBin();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Recycle Bin emptied successfully. ${res.purgedCount || 0} item(s) permanently erased.`,
        });
        setShowEmptyConfirm(false);
        fetchBinItems();
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to empty recycle bin.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error emptying recycle bin.' });
    } finally {
      setActionLoading(false);
    }
  };

  const getEntityBadge = (type: string) => {
    switch (type) {
      case 'Quotation':
        return {
          icon: FileText,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'Client Quotation',
        };
      case 'Lead':
        return {
          icon: Users,
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
          label: 'Sales Lead',
        };
      case 'Project':
        return {
          icon: Building2,
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          dot: 'bg-indigo-400',
          label: 'Project',
        };
      case 'Task':
        return {
          icon: CheckSquare,
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dot: 'bg-purple-400',
          label: 'Task',
        };
      case 'BOQItem':
        return {
          icon: Calculator,
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          dot: 'bg-cyan-400',
          label: 'BOQ Item',
        };
      case 'Expense':
        return {
          icon: Receipt,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: 'Expense',
        };
      case 'Material':
        return {
          icon: Boxes,
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          label: 'Material',
        };
      default:
        return {
          icon: Archive,
          bg: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400',
          label: type,
        };
    }
  };

  const parseItemData = (dataStr: string) => {
    try {
      return JSON.parse(dataStr);
    } catch {
      return {};
    }
  };

  const parsedCurrentInspect = useMemo(() => {
    if (!inspectItem) return null;
    return parseItemData(inspectItem.data);
  }, [inspectItem]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 via-amber-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/30">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Recycle Bin Vault
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 tracking-wider uppercase">
                  Computer Trash System
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Every deleted quotation, lead, project, or task is safely retained here. Inspect or restore them anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchBinItems}
            disabled={loading}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
            title="Refresh Bin"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>

          {items.length > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 border border-rose-500/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-sm shadow-rose-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Empty Recycle Bin
            </button>
          )}
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
            {statusMessage.link && (
              <button
                onClick={() => navigate(statusMessage.link!)}
                className="ml-2 underline font-semibold flex items-center gap-1 text-emerald-300 hover:text-emerald-100"
              >
                Go to module <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{counts.ALL || 0}</div>
            <div className="text-[11px] text-slate-400 font-medium">Items in Recycle Bin</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{counts.Quotation || 0}</div>
            <div className="text-[11px] text-slate-400 font-medium">Deleted Quotations</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{counts.Lead || 0}</div>
            <div className="text-[11px] text-slate-400 font-medium">Deleted Leads</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400">100%</div>
            <div className="text-[11px] text-slate-400 font-medium">Full Data Restorability</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
        {/* Entity Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'ALL', label: 'All Items', count: counts.ALL || 0 },
            { id: 'Quotation', label: 'Quotations', count: counts.Quotation || 0 },
            { id: 'Lead', label: 'Leads', count: counts.Lead || 0 },
            { id: 'Project', label: 'Projects', count: counts.Project || 0 },
            { id: 'Task', label: 'Tasks', count: counts.Task || 0 },
            { id: 'Expense', label: 'Expenses', count: counts.Expense || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id
                    ? 'bg-slate-950/30 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, title, client..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 transition-all"
          />
        </form>
      </div>

      {/* Main Items Listing */}
      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">Loading Recycle Bin items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Recycle Bin is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {search
              ? `No deleted records matched your search query "${search}". Try clearing search or changing the filter tab.`
              : 'Whenever any quotation, lead, project, or task is deleted, it will safely appear here. You can inspect its full line items and restore it anytime with one click.'}
          </p>
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setActiveTab('ALL');
              }}
              className="mt-4 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-all"
            >
              Clear Search Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const badge = getEntityBadge(item.entityType);
            const Icon = badge.icon;
            const parsed = parseItemData(item.data);

            return (
              <div
                key={item.id}
                className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Entity & Title */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${badge.bg}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} flex items-center gap-1`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>

                      {item.itemNumber && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                          {item.itemNumber}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        Deleted {formatDate(item.deletedAt)}
                      </span>

                      {item.deletedByName && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-800/40 px-2 py-0.5 rounded">
                          <User className="w-3 h-3 text-slate-500" />
                          {item.deletedByName}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {item.description}
                      </p>
                    )}

                    {/* Quick Entity Detail Snippet */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      {item.entityType === 'Quotation' && (
                        <>
                          {parsed.grandTotal !== undefined && (
                            <span className="text-emerald-400 font-semibold font-mono">
                              Total: {formatCurrency(parsed.grandTotal)}
                            </span>
                          )}
                          {parsed.clientName && <span>Client: {parsed.clientName}</span>}
                          {Array.isArray(parsed.items) && (
                            <span className="text-slate-500">
                              ({parsed.items.length} line items archived)
                            </span>
                          )}
                        </>
                      )}

                      {item.entityType === 'Lead' && (
                        <>
                          {parsed.name && <span>Contact: {parsed.name}</span>}
                          {parsed.phone && <span>Phone: {parsed.phone}</span>}
                          {parsed.projectType && (
                            <span className="text-blue-400">Type: {parsed.projectType}</span>
                          )}
                          {parsed.estimatedBudget && (
                            <span className="text-emerald-400 font-mono">
                              Est: {formatCurrency(parsed.estimatedBudget)}
                            </span>
                          )}
                        </>
                      )}

                      {item.entityType === 'Project' && (
                        <>
                          {parsed.clientName && <span>Client: {parsed.clientName}</span>}
                          {parsed.contractValue && (
                            <span className="text-emerald-400 font-mono">
                              Contract: {formatCurrency(parsed.contractValue)}
                            </span>
                          )}
                        </>
                      )}

                      {item.entityType === 'Task' && (
                        <>
                          {parsed.priority && (
                            <span className="text-purple-400">Priority: {parsed.priority}</span>
                          )}
                          {parsed.status && <span>Status: {parsed.status}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 w-full md:w-auto justify-end">
                  {/* Inspect Details Button */}
                  <button
                    onClick={() => setInspectItem(item)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
                    title="Inspect archived JSON details"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Inspect
                  </button>

                  {/* Restore Button */}
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/30 transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </button>

                  {/* Permanent Delete Button */}
                  <button
                    onClick={() => setDeleteConfirmItem(item)}
                    disabled={actionLoading}
                    className="p-1.5 bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 rounded-lg text-xs border border-slate-700/80 transition-all"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Item Modal */}
      {inspectItem && parsedCurrentInspect && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setInspectItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  getEntityBadge(inspectItem.entityType).bg
                }`}
              >
                {React.createElement(getEntityBadge(inspectItem.entityType).icon, {
                  className: 'w-5 h-5',
                })}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Archived {inspectItem.entityType} Snapshot
                  {inspectItem.itemNumber && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                      {inspectItem.itemNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Preserved from {formatDate(inspectItem.deletedAt)} by {inspectItem.deletedByName || 'Admin'}
                </p>
              </div>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block">Title / Code</span>
                <span className="font-semibold text-white">{inspectItem.title}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity Type</span>
                <span className="font-semibold text-amber-400">{inspectItem.entityType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Deleted Date</span>
                <span className="font-semibold text-slate-300">{formatDate(inspectItem.deletedAt)}</span>
              </div>
              {parsedCurrentInspect.clientName && (
                <div>
                  <span className="text-slate-500 block">Client / Customer</span>
                  <span className="font-semibold text-white">{parsedCurrentInspect.clientName}</span>
                </div>
              )}
              {parsedCurrentInspect.grandTotal !== undefined && (
                <div>
                  <span className="text-slate-500 block">Grand Total</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {formatCurrency(parsedCurrentInspect.grandTotal)}
                  </span>
                </div>
              )}
              {parsedCurrentInspect.status && (
                <div>
                  <span className="text-slate-500 block">Status When Deleted</span>
                  <span className="font-semibold text-blue-400">{parsedCurrentInspect.status}</span>
                </div>
              )}
            </div>

            {/* If Quotation: Show Line Items Preview */}
            {inspectItem.entityType === 'Quotation' && Array.isArray(parsedCurrentInspect.items) && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  Preserved Line Items ({parsedCurrentInspect.items.length})
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/40 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2">Area / Room</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {parsedCurrentInspect.items.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-2 font-medium text-amber-300/90">{it.areaRoom || '-'}</td>
                          <td className="p-2">{it.workDescription || '-'}</td>
                          <td className="p-2 text-right font-mono">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="p-2 text-right font-mono">{formatCurrency(it.rate || 0)}</td>
                          <td className="p-2 text-right font-mono font-semibold text-emerald-400">
                            {formatCurrency(it.totalAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preserved Full JSON View */}
            <details className="text-xs group">
              <summary className="cursor-pointer font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 select-none">
                <FileJson className="w-3.5 h-3.5 text-blue-400" />
                View Complete Raw Backup Payload (JSON)
              </summary>
              <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-slate-300 font-mono max-h-48">
                {JSON.stringify(parsedCurrentInspect, null, 2)}
              </pre>
            </details>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setDeleteConfirmItem(inspectItem);
                  setInspectItem(null);
                }}
                className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Permanently
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRestore(inspectItem)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-950/30 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore This Item Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Single Item Permanent Delete */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Permanently Delete Item?</h3>
              <p className="text-xs text-slate-400">
                You are about to permanently erase{' '}
                <strong className="text-rose-400">
                  {deleteConfirmItem.entityType} "{deleteConfirmItem.itemNumber || deleteConfirmItem.title}"
                </strong>{' '}
                from the Recycle Bin. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(deleteConfirmItem)}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-950/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Purge Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty Entire Recycle Bin */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto animate-bounce">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Empty Entire Recycle Bin?</h3>
              <p className="text-xs text-slate-400">
                This will permanently erase all <strong className="text-white font-mono">{counts.ALL || items.length}</strong> archived items in the Recycle Bin. There is no way to recover them once emptied.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyBin}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-950/40 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Empty Bin Completely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
