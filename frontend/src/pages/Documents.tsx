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
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { formatDate } from '../utils/formatters';

interface DocumentItem {
  id: string;
  title: string;
  category: 'DRAWING' | 'CONTRACT' | 'PERMIT' | 'INVOICE' | 'PHOTO' | 'SAFETY' | 'OTHER';
  fileUrl: string;
  fileSize: number;
  fileType: string;
  referenceEntity?: string;
  referenceId?: string;
  createdAt: string;
  project?: { code: string; name: string };
}

const VAULT_FOLDERS = [
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
    color: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
    category: 'INVOICE',
    title: 'Material Quality & Test Certificates',
    description: 'Concrete cube test results, steel tensile mill test reports, supplier bills',
    icon: FileText,
    color: 'from-sky-500 to-cyan-600',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
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

  // Form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('DRAWING');
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [selectedProjectId, selectedCategory]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('projectId', selectedProjectId);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);

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
    if (!uploadTitle) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('category', uploadCategory);
      if (uploadProjectId || selectedProjectId) {
        formData.append('projectId', uploadProjectId || selectedProjectId || '');
      }

      if (uploadFile) {
        formData.append('file', uploadFile);
      } else {
        // Fallback placeholder URL
        formData.append('fileUrl', '/uploads/spec-drawing-rev2.pdf');
        formData.append('fileSize', '1048576');
        formData.append('fileType', 'application/pdf');
      }

      await api.uploadDocument(formData);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadFile(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
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
        (doc.project?.name && doc.project.name.toLowerCase().includes(q)) ||
        (doc.project?.code && doc.project.code.toLowerCase().includes(q)) ||
        doc.category.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Category counts
  const drawingCount = documents.filter((d) => d.category === 'DRAWING').length;
  const permitCount = documents.filter((d) => d.category === 'PERMIT').length;
  const contractCount = documents.filter((d) => d.category === 'CONTRACT').length;
  const photoCount = documents.filter((d) => d.category === 'PHOTO').length;
  const totalFileSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'DRAWING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PERMIT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CONTRACT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PHOTO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INVOICE':
        return 'bg-sky-50 text-sky-700 border-sky-200';
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
                  Enterprise Document Vault
                </h1>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tracking-wide shrink-0">
                  Secure GFC Storage
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono shrink-0">
                  {formatFileSize(totalFileSize)} Encrypted
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 sm:line-clamp-none">
                Centralized vault for engineering blueprints, municipal sanctions, subcontract agreements, and inspection evidence.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setUploadCategory(selectedCategory !== 'ALL' ? selectedCategory : 'DRAWING');
              setShowUploadModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Document</span>
          </button>
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

        {/* Card 2: Architectural & Structural */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Architectural & Structural</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-700">{drawingCount} Drawings</div>
          <div className="text-[10px] sm:text-[11px] text-blue-700/80 mt-1.5 sm:mt-2 font-medium truncate">
            GFC CAD, BIM & Floor plans
          </div>
        </div>

        {/* Card 3: Statutory Permits */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Statutory Permits</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{permitCount} Approved</div>
          <div className="text-[10px] sm:text-[11px] text-amber-800/80 mt-1.5 sm:mt-2 font-medium truncate">
            RERA, Fire NOC & Clearances
          </div>
        </div>

        {/* Card 4: Site Evidence & Photos */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-300 transition group min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            <span className="truncate">Site Evidence & Photos</span>
            <div className="p-1 sm:p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform shrink-0 ml-1">
              <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-700">{photoCount} Captures</div>
          <div className="text-[10px] sm:text-[11px] text-purple-800/80 mt-1.5 sm:mt-2 font-medium truncate">
            Daily progress & inspections
          </div>
        </div>
      </div>

      {/* Interactive Folder Structure Hub (6 Standard Construction Folders) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Project Document Directory Structure</h2>
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              &bull; Click any folder to instantly inspect or filter
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
            placeholder="Search blueprints, contract title, project code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium transition"
          />
        </div>

        {/* Category Strip & View Toggle */}
        <div className="flex items-center justify-between lg:justify-end gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 w-full lg:w-auto">
          {/* Categories */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar text-xs font-bold shrink-0">
            {['ALL', 'DRAWING', 'CONTRACT', 'PERMIT', 'INVOICE', 'PHOTO', 'SAFETY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition whitespace-nowrap text-xs shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-semibold'
                }`}
              >
                {cat === 'ALL' ? 'All Files' : cat.charAt(0) + cat.slice(1).toLowerCase()}
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
          <span>Decrypting and loading digital vault files...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 sm:p-12 md:p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200 mb-3 shadow-sm">
            <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">No documents found matching this filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Upload GFC blueprints, structural CAD drawings, subcontract agreements, or site inspection photos to populate the repository.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                setUploadCategory(selectedCategory !== 'ALL' ? selectedCategory : 'DRAWING');
                setShowUploadModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document Now</span>
            </button>
            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Clear Category Filter
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
                    {doc.category === 'PHOTO' ? (
                      <Image className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    ) : doc.category === 'PERMIT' ? (
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    ) : doc.category === 'CONTRACT' ? (
                      <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    ) : (
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition break-words">
                      {doc.title}
                    </h3>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.project?.name || 'Enterprise Master Vault'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[10px] sm:text-[11px] font-mono">
                  {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Project Association</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">{doc.title}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {doc.project?.name || 'Enterprise Master'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('en-IN')}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto shadow-2xl text-slate-900">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span>Upload to Digital Vault</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower B - Floor 12 Structural Reinforcement GFC"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Category *</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="DRAWING">📐 Architectural / Structural Drawing</option>
                    <option value="CONTRACT">📜 Contract / Agreement</option>
                    <option value="PERMIT">🏛 Statutory Permit / RERA</option>
                    <option value="PHOTO">📷 Site Inspection Photo</option>
                    <option value="INVOICE">🧾 Material Quality / Test Cert</option>
                    <option value="SAFETY">🛡️ HSE Safety Audit</option>
                    <option value="OTHER">📁 Other Project Document</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Project Assignment</label>
                  <select
                    value={uploadProjectId || selectedProjectId || ''}
                    onChange={(e) => setUploadProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Enterprise Master (All Projects)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Select File (PDF, DWG, JPG, PNG)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 sm:p-4 text-center cursor-pointer bg-slate-50 transition">
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="doc-file-input"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer block">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {uploadFile ? uploadFile.name : 'Click to browse CAD, PDF, or Photo'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Max file size: 50 MB
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 text-center"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Preview Document */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto shadow-2xl text-slate-900">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
                  <span className="text-slate-900 font-bold">{previewDoc.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Project</span>
                  <span className="text-slate-900 font-semibold break-words">{previewDoc.project?.name || 'Enterprise Master'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">File Size</span>
                  <span className="text-slate-600 font-mono font-medium">{formatFileSize(previewDoc.fileSize)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Upload Date</span>
                  <span className="text-slate-600 font-mono font-medium">{new Date(previewDoc.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
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
      )}
    </div>
  );
};

export default Documents;
