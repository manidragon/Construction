import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  FileCheck,
  Shield,
  Image,
  FolderOpen,
  Calendar,
  Layers,
  ExternalLink,
  CheckCircle2,
  Folder,
  Sparkles,
  FileCode,
  HardHat,
  ArrowUpRight,
  Plus,
  Grid,
  List,
  Check,
  Clock,
  Building2,
  X,
  Receipt,
  Trash2,
  Paperclip,
} from 'lucide-react';
import api from '../services/api';
import SearchableSelect from '../components/common/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { formatDate } from '../utils/formatters';

interface DocumentItem {
  id: string;
  title: string;
  description?: string;
  category: 'DRAWING' | 'CONTRACT' | 'PERMIT' | 'INVOICE' | 'PHOTO' | 'SAFETY' | 'RECEIPT' | 'OTHER';
  fileUrl: string;
  fileSize: number;
  fileType: string;
  referenceEntity?: string;
  referenceId?: string;
  projectId?: string;
  createdAt: string;
  project?: { id?: string; code: string; name: string; clientName?: string };
}

const VAULT_FOLDERS = [
  {
    category: 'RECEIPT',
    title: 'Expense & Vendor Receipts',
    description: 'Archived site expenses, transport bills, petty cash vouchers & supplier payment receipts',
    icon: Receipt,
    color: 'from-emerald-500 to-green-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    category: 'INVOICE',
    title: 'Vendor Bills & Material Test Reports',
    description: 'Supplier tax invoices, purchase order copies, concrete test reports & mill certificates',
    icon: FileText,
    color: 'from-sky-500 to-cyan-600',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    category: 'DRAWING',
    title: 'Architectural & Structural Drawings',
    description: 'GFC Blueprints, CAD DWG, Revit 3D BIM models & elevation sections',
    icon: Layers,
    color: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    category: 'CONTRACT',
    title: 'Client & Subcontract Agreements',
    description: 'Work orders, client MOUs, subcontractor packages & rate contracts',
    icon: FileCheck,
    color: 'from-teal-500 to-teal-700',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    category: 'PERMIT',
    title: 'Statutory Permits & RERA Approvals',
    description: 'Municipal building sanctions, Fire NOC, environmental clearances',
    icon: Shield,
    color: 'from-amber-500 to-amber-600',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    category: 'PHOTO',
    title: 'Site Evidence & Drone Photos',
    description: 'Daily DPR progress drone captures, mobile site photos & inspections',
    icon: Image,
    color: 'from-purple-500 to-pink-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    category: 'SAFETY',
    title: 'HSE Safety & Labor Compliance',
    description: 'Site safety audits, PPE compliance checklists, labor welfare records',
    icon: HardHat,
    color: 'from-rose-500 to-orange-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

export const Documents: React.FC = () => {
  const { hasRole } = useAuth();
  const { selectedProjectId, projects } = useProject();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Project & Date Filter States
  const [selectedProjectIdLocal, setSelectedProjectIdLocal] = useState<string>(selectedProjectId || '');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('RECEIPT');
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync global project filter with local filter state
  useEffect(() => {
    if (selectedProjectId) {
      setSelectedProjectIdLocal(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchDocuments();
  }, [selectedProjectIdLocal, selectedCategory, startDate, endDate, selectedYear, selectedMonth]);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
    } else if (preset === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${lastDay}`);
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
    } else if (preset === 'LAST_MONTH') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prev.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${lastDay}`);
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
    } else if (preset === 'THIS_YEAR') {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const effProjectId = selectedProjectIdLocal || selectedProjectId;
      if (effProjectId && effProjectId !== 'ALL') params.append('projectId', effProjectId);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedYear !== 'ALL') params.append('year', selectedYear);
      if (selectedMonth !== 'ALL') params.append('month', selectedMonth);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.getDocuments(params.toString());
      if (res.success && res.documents) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) {
        formData.append('description', uploadDescription.trim());
      }
      formData.append('category', uploadCategory);
      const targetProj = uploadProjectId || selectedProjectIdLocal || selectedProjectId || '';
      if (targetProj) {
        formData.append('projectId', targetProj);
      }
      if (uploadDate) {
        formData.append('customDate', uploadDate);
      }

      if (uploadFile) {
        formData.append('file', uploadFile);
      } else {
        // Fallback placeholder file
        formData.append('fileUrl', '/uploads/spec-drawing-rev2.pdf');
        formData.append('fileSize', '1048576');
        formData.append('fileType', 'application/pdf');
      }

      await api.uploadDocument(formData);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this document from the vault?')) return;
    try {
      setDeletingDocId(id);
      const res = await api.deleteDocument(id);
      if (res.success) {
        if (previewDoc?.id === id) setPreviewDoc(null);
        fetchDocuments();
      } else {
        alert(res.message || 'Failed to delete document');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        (doc.project?.name && doc.project.name.toLowerCase().includes(q)) ||
        (doc.project?.code && doc.project.code.toLowerCase().includes(q)) ||
        doc.category.toLowerCase().includes(q) ||
        (doc.referenceEntity && doc.referenceEntity.toLowerCase().includes(q));
      const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Counts
  const receiptCount = documents.filter((d) => d.category === 'RECEIPT').length;
  const drawingCount = documents.filter((d) => d.category === 'DRAWING').length;
  const permitCount = documents.filter((d) => d.category === 'PERMIT').length;
  const invoiceCount = documents.filter((d) => d.category === 'INVOICE').length;
  const contractCount = documents.filter((d) => d.category === 'CONTRACT').length;
  const photoCount = documents.filter((d) => d.category === 'PHOTO').length;
  const totalFileSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'RECEIPT':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'INVOICE':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'DRAWING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PERMIT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CONTRACT':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'PHOTO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SAFETY':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-1 sm:px-2 md:px-0 pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black shadow-sm shrink-0">
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate">
                  Enterprise Document Vault & Receipt Archive
                </h1>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 tracking-wide shrink-0">
                  Automated Archiving Active
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono shrink-0">
                  {formatFileSize(totalFileSize)} Encrypted
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 sm:line-clamp-none">
                Centralized vault for engineering blueprints, municipal sanctions, subcontract agreements, and automated project expense & vendor receipt archives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setUploadCategory('RECEIPT');
                setShowUploadModal(true);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
              title="Upload project expense or vendor payment receipt"
            >
              <Receipt className="w-4 h-4 stroke-[2.5]" />
              <span>Upload Receipt</span>
            </button>
            <button
              onClick={() => {
                setUploadCategory(selectedCategory !== 'ALL' ? selectedCategory : 'DRAWING');
                setShowUploadModal(true);
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Vault Files */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Total Vault Files</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{documents.length} Files</div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 sm:mt-2 flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
            <span className="truncate">Across all sites & projects</span>
          </div>
        </div>

        {/* Card 2: Expense & Vendor Receipts */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Expense & Vendor Receipts</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">{receiptCount} Receipts</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-800/80 mt-1.5 sm:mt-2 font-medium truncate">
            Site expenses & vendor bills
          </div>
        </div>

        {/* Card 3: Vendor Bills & PO Documents */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Bills & Test Certs</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-700">{invoiceCount} Invoices/POs</div>
          <div className="text-[10px] sm:text-[11px] text-sky-800/80 mt-1.5 sm:mt-2 font-medium truncate">
            PO copies & mill test reports
          </div>
        </div>

        {/* Card 4: Architectural Drawings */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Drawings & Sanctions</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-700">{drawingCount + permitCount} Files</div>
          <div className="text-[10px] sm:text-[11px] text-blue-800/80 mt-1.5 sm:mt-2 font-medium truncate">
            GFC blueprints & RERA NOCs
          </div>
        </div>
      </div>

      {/* Date & Project Filter Control Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Filter Project:</span>
            <div className="flex-1">
              <SearchableSelect
                value={selectedProjectIdLocal}
                onChange={(val) => {
                  setSelectedProjectIdLocal(val);
                }}
                options={[
                  { value: '', label: '🌐 All Projects (Enterprise Wide)' },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                    code: p.code,
                    sublabel: p.clientName ? `Client: ${p.clientName}` : undefined,
                  })),
                ]}
                placeholder="🌐 All Projects"
                searchPlaceholder="Search projects..."
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'ALL', label: 'All Dates' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'THIS_YEAR', label: 'This Year' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyDatePreset(preset.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  datePreset === preset.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filters: Year, Month, and Custom Date Range */}
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setStartDate('');
                setEndDate('');
                setDatePreset('CUSTOM');
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setStartDate('');
                setEndDate('');
                setDatePreset('CUSTOM');
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
            >
              <option value="ALL">All Months</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                <option key={m} value={String(idx + 1)}>
                  {m} ({idx + 1})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Custom Range Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedYear('ALL');
                setSelectedMonth('ALL');
                setDatePreset('CUSTOM');
              }}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Custom Range End
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                  setDatePreset('CUSTOM');
                }}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
              />
              {(startDate || endDate || selectedYear !== 'ALL' || selectedMonth !== 'ALL') && (
                <button
                  onClick={() => applyDatePreset('ALL')}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  title="Clear Date Filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Folder Structure Hub (7 Standard Construction Folders) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Project Document & Receipt Directory</h2>
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              &bull; Click any category folder to filter files
            </span>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition self-start sm:self-auto"
            >
              &larr; Reset to All Folders
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {VAULT_FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const count = documents.filter((d) => d.category === folder.category).length;
            const isSelected = selectedCategory === folder.category;

            return (
              <div
                key={folder.category}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : folder.category)}
                className={`p-3.5 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group min-w-0 ${
                  isSelected
                    ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                    <div className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr ${folder.color} text-white shadow-sm`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${folder.badge}`}>
                      {count} {count === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition">
                    {folder.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {folder.description}
                  </p>
                </div>

                <div className="mt-3.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono text-[10px]">
                    Folder: /{folder.category.toLowerCase()}
                  </span>
                  <span
                    className={`font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition ${
                      isSelected ? 'text-amber-700' : 'text-blue-600'
                    }`}
                  >
                    {isSelected ? 'Viewing' : 'Open Vault'} &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3.5 rounded-2xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt description, vendor name, project code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium transition"
          />
        </div>

        {/* Category Strip & View Toggle */}
        <div className="flex items-center justify-between lg:justify-end gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 w-full lg:w-auto">
          {/* Categories */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar text-xs font-bold shrink-0">
            {['ALL', 'RECEIPT', 'INVOICE', 'DRAWING', 'CONTRACT', 'PERMIT', 'PHOTO', 'SAFETY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition whitespace-nowrap text-xs shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-semibold'
                }`}
              >
                {cat === 'ALL' ? 'All Files' : cat === 'RECEIPT' ? 'Receipts' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <span>Filtering and loading project repository files...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 sm:p-12 md:p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200 mb-3 shadow-sm">
            <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">No documents found matching this filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            No files found for the selected project and date range. Record an expense receipt, upload a vendor bill, or upload engineering blueprints.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                setUploadCategory('RECEIPT');
                setShowUploadModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Upload Expense / Vendor Receipt</span>
            </button>
            {(selectedCategory !== 'ALL' || startDate || endDate || selectedYear !== 'ALL' || selectedMonth !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  applyDatePreset('ALL');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md min-w-0"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-3">
                  <span
                    className={`text-[9.5px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadge(
                      doc.category
                    )}`}
                  >
                    {doc.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    {formatFileSize(doc.fileSize)}
                  </span>
                </div>

                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 shrink-0 mt-0.5 shadow-sm">
                    {doc.category === 'RECEIPT' ? (
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    ) : doc.category === 'PHOTO' ? (
                      <Image className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    ) : doc.category === 'PERMIT' ? (
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    ) : doc.category === 'CONTRACT' ? (
                      <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                    ) : (
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition break-words">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic">
                        {doc.description}
                      </p>
                    )}
                    <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.project?.name ? `[${doc.project.code}] ${doc.project.name}` : 'Enterprise Master Vault'}</span>
                    </div>
                    {doc.referenceEntity && (
                      <span className="inline-block text-[9.5px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1">
                        Ref: {doc.referenceEntity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[10px] sm:text-[11px] font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
                    {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition"
                    title="Quick Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg transition"
                    title="Download / View in New Tab"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document / Receipt Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Project Association</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Transaction Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">{doc.title}</div>
                      {doc.description && (
                        <div className="text-[11px] text-slate-500 italic truncate max-w-xs">{doc.description}</div>
                      )}
                      {doc.referenceEntity && (
                        <div className="text-[10px] font-mono text-slate-400">Ref: {doc.referenceEntity}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {doc.project?.name ? (
                        <span className="font-semibold text-slate-800">
                          <span className="font-mono text-blue-600">[{doc.project.code}]</span> {doc.project.name}
                        </span>
                      ) : (
                        'Enterprise Master'
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-lg transition border border-blue-200"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocId === doc.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: Upload Document / Receipt */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col my-auto shadow-2xl text-slate-900 overflow-hidden">
            {/* Fixed Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                {uploadCategory === 'RECEIPT' ? (
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                ) : (
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                )}
                <span>{uploadCategory === 'RECEIPT' ? 'Upload Expense / Vendor Receipt' : 'Upload to Digital Vault'}</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="vault-upload-form" onSubmit={handleUpload} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Receipt / Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transport charges for steel delivery or Site office electricity bill"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid to Apex Transporters for 12mm rebar dispatch from warehouse to site"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Category *</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="RECEIPT">🧾 Expense / Vendor Receipt</option>
                    <option value="INVOICE">📄 Vendor Bill / Tax Invoice</option>
                    <option value="DRAWING">📐 Architectural / Structural Drawing</option>
                    <option value="CONTRACT">📜 Contract / Agreement</option>
                    <option value="PERMIT">🏛 Statutory Permit / RERA</option>
                    <option value="PHOTO">📷 Site Inspection Photo</option>
                    <option value="SAFETY">🛡️ HSE Safety Audit</option>
                    <option value="OTHER">📁 Other Project Document</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Project Assignment *</label>
                <SearchableSelect
                  value={uploadProjectId || selectedProjectIdLocal || selectedProjectId || ''}
                  onChange={(val) => setUploadProjectId(val)}
                  options={[
                    { value: '', label: 'Enterprise Master (All Projects)' },
                    ...projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                      code: p.code,
                      sublabel: p.clientName ? `Client: ${p.clientName}` : undefined,
                    })),
                  ]}
                  placeholder="Select Project"
                  searchPlaceholder="Search project by name or code..."
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Select File (PNG, JPG, PDF, DWG)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 sm:p-4 text-center cursor-pointer bg-slate-50 transition">
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        if (!uploadTitle) {
                          setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    className="hidden"
                    id="doc-file-input"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer block">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {uploadFile ? uploadFile.name : 'Click to browse receipt, bill, or drawing'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Max file size: 15 MB
                    </span>
                  </label>
                </div>
              </div>
            </form>

            {/* Fixed/Sticky Footer */}
            <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="vault-upload-form"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 text-center"
              >
                {isSubmitting ? 'Uploading...' : 'Save & Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Preview Document & Receipt */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto shadow-2xl text-slate-900">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                {previewDoc.category === 'RECEIPT' ? (
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                )}
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{previewDoc.title}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              {/* Image Preview if image */}
              {previewDoc.fileUrl && previewDoc.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 flex items-center justify-center p-2 max-h-72">
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.title}
                    className="max-h-64 object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getCategoryBadge(previewDoc.category)}`}>
                    {previewDoc.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Project</span>
                  <span className="text-slate-900 font-semibold break-words">
                    {previewDoc.project?.name ? `[${previewDoc.project.code}] ${previewDoc.project.name}` : 'Enterprise Master'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">File Size</span>
                  <span className="text-slate-600 font-mono font-medium">{formatFileSize(previewDoc.fileSize)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Transaction / Archive Date</span>
                  <span className="text-slate-600 font-mono font-medium">
                    {new Date(previewDoc.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {previewDoc.description && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Description / Notes</span>
                    <p className="text-slate-700 italic mt-0.5">{previewDoc.description}</p>
                  </div>
                )}
                {previewDoc.referenceEntity && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">System Linkage</span>
                    <span className="text-slate-700 font-mono font-semibold">
                      Linked to {previewDoc.referenceEntity} Record
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteDocument(previewDoc.id)}
                  disabled={deletingDocId === previewDoc.id}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Document</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition text-center"
                  >
                    Close
                  </button>
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download / Open Full File</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;

