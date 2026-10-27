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
  Archive,
  RefreshCw,
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
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Quotation',
        };
      case 'Lead':
        return {
          icon: Users,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Lead',
        };
      case 'Project':
        return {
          icon: Building2,
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Project',
        };
      case 'Task':
        return {
          icon: CheckSquare,
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          label: 'Task',
        };
      case 'BOQItem':
        return {
          icon: Calculator,
          bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          dot: 'bg-cyan-500',
          label: 'BOQ Item',
        };
      case 'Expense':
        return {
          icon: Receipt,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Expense',
        };
      case 'Material':
        return {
          icon: Boxes,
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Material',
        };
      default:
        return {
          icon: Archive,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-1 sm:px-2 md:px-0 pb-12">
      {/* Page Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm shrink-0">
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate">
                  Enterprise Data Vault & Recycle Bin
                </h1>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 tracking-wider flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Zero Data Loss Active
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono shrink-0">
                  30-Day Safe Retention
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 sm:line-clamp-none">
                Every deleted quotation, lead, project, or task is safely retained in encrypted cold storage. Inspect or restore them anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button
              onClick={fetchBinItems}
              disabled={loading}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              title="Refresh Vault"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-900' : 'text-slate-600'}`} />
              <span>Refresh Vault</span>
            </button>

            {items.length > 0 && (
              <button
                onClick={() => setShowEmptyConfirm(true)}
                disabled={actionLoading}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Vault</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition-all shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium truncate">{statusMessage.text}</span>
            {statusMessage.link && (
              <button
                onClick={() => navigate(statusMessage.link!)}
                className="ml-2 underline font-bold flex items-center gap-1 text-emerald-700 hover:text-emerald-900 shrink-0"
              >
                Go to module <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Quarantined Items */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Quarantined</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{counts.ALL || 0}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 sm:mt-2 flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 inline-block" />
            <span className="truncate">Safety buffer active</span>
          </div>
        </div>

        {/* Card 2: Deleted Quotations */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Quotations</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{counts.Quotation || 0}</div>
          <div className="text-[10px] sm:text-[11px] text-amber-800/80 mt-1.5 sm:mt-2 truncate">
            Full items & rates
          </div>
        </div>

        {/* Card 3: Deleted Leads & Projects */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Leads & Projects</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-700">
            {(counts.Lead || 0) + (counts.Project || 0)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-blue-800/80 mt-1.5 sm:mt-2 truncate">
            Preserved history
          </div>
        </div>

        {/* Card 4: Restorability Rate */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Restorability</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">100%</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-800/80 mt-1.5 sm:mt-2 truncate">
            Zero data loss
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 sm:p-3 rounded-2xl shadow-sm">
        {/* Entity Tabs - scrollable horizontally without page stretch */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 text-xs font-bold w-full lg:w-auto">
          {[
            { id: 'ALL', label: 'All Items', count: counts.ALL || 0 },
            { id: 'Quotation', label: 'Quotations', count: counts.Quotation || 0 },
            { id: 'Lead', label: 'Leads', count: counts.Lead || 0 },
            { id: 'Project', label: 'Projects', count: counts.Project || 0 },
            { id: 'Task', label: 'Tasks', count: counts.Task || 0 },
            { id: 'Expense', label: 'Expenses', count: counts.Expense || 0 },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72 xl:w-80 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, title, client..."
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition font-medium"
          />
        </form>
      </div>

      {/* Main Items Listing */}
      {loading ? (
        <div className="py-20 sm:py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading Recycle Bin items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 md:p-12 shadow-sm space-y-6 sm:space-y-8">
          <div className="text-center max-w-md mx-auto space-y-2.5 sm:space-y-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {search ? 'No Matching Records in Vault' : 'Enterprise Safety Vault is Clean & Active'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {search
                ? `No quarantined items matched your query "${search}". Try clearing search or switching category filters.`
                : 'All your quotations, client leads, construction projects, and BOQs are actively operating without deletions. If anything is ever accidentally removed, it is instantly recoverable right here.'}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setActiveTab('ALL');
                }}
                className="mt-2 px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold border border-slate-200 transition"
              >
                Clear Search Filter
              </button>
            )}
          </div>

          {/* 3 Safety Vault Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900">Instant 1-Click Rollback</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Restores complete records including item rates, BOQ breakdown, specifications, and linked client relations.
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900">Foreign Key Protection</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Prevents orphaned data or database constraint errors by securely snapshotting relational integrity in cold storage.
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900">Forensic Audit Trail</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Every delete action is stamped with the user name, role, timestamp, and IP address for internal accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const badge = getEntityBadge(item.entityType);
            const Icon = badge.icon;
            const parsed = parseItemData(item.data);

            return (
              <div
                key={item.id}
                className="group bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 sm:p-4 transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
              >
                {/* Left: Entity & Title */}
                <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${badge.bg}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span
                        className={`text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} flex items-center gap-1`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>

                      {item.itemNumber && (
                        <span className="text-[11px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {item.itemNumber}
                        </span>
                      )}

                      <span className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDate(item.deletedAt)}
                      </span>

                      {item.deletedByName && (
                        <span className="text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-1 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded truncate max-w-[150px] sm:max-w-none">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.deletedByName}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.description}
                      </p>
                    )}

                    {/* Quick Entity Detail Snippet */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 pt-0.5">
                      {item.entityType === 'Quotation' && (
                        <>
                          {parsed.grandTotal !== undefined && (
                            <span className="text-emerald-700 font-bold font-mono">
                              Total: {formatCurrency(parsed.grandTotal)}
                            </span>
                          )}
                          {parsed.clientName && <span>Client: <strong>{parsed.clientName}</strong></span>}
                          {Array.isArray(parsed.items) && (
                            <span className="text-slate-400">
                              ({parsed.items.length} line items)
                            </span>
                          )}
                        </>
                      )}

                      {item.entityType === 'Lead' && (
                        <>
                          {parsed.name && <span>Contact: <strong>{parsed.name}</strong></span>}
                          {parsed.phone && <span>Phone: {parsed.phone}</span>}
                          {parsed.projectType && (
                            <span className="text-blue-700 font-medium">Type: {parsed.projectType}</span>
                          )}
                          {parsed.estimatedBudget && (
                            <span className="text-emerald-700 font-mono font-bold">
                              Est: {formatCurrency(parsed.estimatedBudget)}
                            </span>
                          )}
                        </>
                      )}

                      {item.entityType === 'Project' && (
                        <>
                          {parsed.clientName && <span>Client: <strong>{parsed.clientName}</strong></span>}
                          {parsed.contractValue && (
                            <span className="text-emerald-700 font-mono font-bold">
                              Contract: {formatCurrency(parsed.contractValue)}
                            </span>
                          )}
                        </>
                      )}

                      {item.entityType === 'Task' && (
                        <>
                          {parsed.priority && (
                            <span className="text-purple-700 font-medium">Priority: {parsed.priority}</span>
                          )}
                          {parsed.status && <span>Status: {parsed.status}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Inspect Details Button */}
                  <button
                    onClick={() => setInspectItem(item)}
                    className="flex-1 md:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                    title="Inspect archived JSON details"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Inspect</span>
                  </button>

                  {/* Restore Button */}
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={actionLoading}
                    className="flex-1 md:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  {/* Permanent Delete Button */}
                  <button
                    onClick={() => setDeleteConfirmItem(item)}
                    disabled={actionLoading}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs transition-all shrink-0"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto my-auto p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setInspectItem(null)}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4 pr-8">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                  getEntityBadge(inspectItem.entityType).bg
                }`}
              >
                {React.createElement(getEntityBadge(inspectItem.entityType).icon, {
                  className: 'w-5 h-5',
                })}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Archived {inspectItem.entityType} Snapshot</span>
                  {inspectItem.itemNumber && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {inspectItem.itemNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Preserved from {formatDate(inspectItem.deletedAt)} by {inspectItem.deletedByName || 'Admin'}
                </p>
              </div>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Title / Code</span>
                <span className="font-semibold text-slate-900 break-words">{inspectItem.title}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity Type</span>
                <span className="font-semibold text-amber-700">{inspectItem.entityType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Deleted Date</span>
                <span className="font-semibold text-slate-700">{formatDate(inspectItem.deletedAt)}</span>
              </div>
              {parsedCurrentInspect.clientName && (
                <div>
                  <span className="text-slate-500 block">Client / Customer</span>
                  <span className="font-semibold text-slate-900 break-words">{parsedCurrentInspect.clientName}</span>
                </div>
              )}
              {parsedCurrentInspect.grandTotal !== undefined && (
                <div>
                  <span className="text-slate-500 block">Grand Total</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {formatCurrency(parsedCurrentInspect.grandTotal)}
                  </span>
                </div>
              )}
              {parsedCurrentInspect.status && (
                <div>
                  <span className="text-slate-500 block">Status When Deleted</span>
                  <span className="font-semibold text-blue-700">{parsedCurrentInspect.status}</span>
                </div>
              )}
            </div>

            {/* If Quotation: Show Line Items Preview */}
            {inspectItem.entityType === 'Quotation' && Array.isArray(parsedCurrentInspect.items) && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  Preserved Line Items ({parsedCurrentInspect.items.length})
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white text-xs overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2">Area / Room</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedCurrentInspect.items.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 font-medium text-amber-900">{it.areaRoom || '-'}</td>
                          <td className="p-2">{it.workDescription || '-'}</td>
                          <td className="p-2 text-right font-mono">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="p-2 text-right font-mono">{formatCurrency(it.rate || 0)}</td>
                          <td className="p-2 text-right font-mono font-semibold text-emerald-700">
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
              <summary className="cursor-pointer font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 select-none">
                <FileJson className="w-3.5 h-3.5 text-blue-600" />
                View Complete Raw Backup Payload (JSON)
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-slate-200 font-mono max-h-48">
                {JSON.stringify(parsedCurrentInspect, null, 2)}
              </pre>
            </details>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 sm:pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setDeleteConfirmItem(inspectItem);
                  setInspectItem(null);
                }}
                className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Permanently</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectItem(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all text-center"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRestore(inspectItem)}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Single Item Permanent Delete */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 space-y-4 shadow-2xl text-center text-slate-900">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Permanently Delete Item?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to permanently erase{' '}
                <strong className="text-rose-600 break-words">
                  {deleteConfirmItem.entityType} "{deleteConfirmItem.itemNumber || deleteConfirmItem.title}"
                </strong>{' '}
                from the Recycle Bin. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(deleteConfirmItem)}
                disabled={actionLoading}
                className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty Entire Recycle Bin */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 space-y-4 shadow-2xl text-center text-slate-900">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Empty Entire Recycle Bin?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently erase all <strong className="text-slate-900 font-mono font-bold">{counts.ALL || items.length}</strong> archived items in the Recycle Bin. There is no way to recover them once emptied.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyBin}
                disabled={actionLoading}
                className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Empty All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
