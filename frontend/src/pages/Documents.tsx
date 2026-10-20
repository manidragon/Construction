import React, { useState, useEffect } from 'react';
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
  CheckCircle2
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

export const Documents: React.FC = () => {
  const { hasRole } = useAuth();
  const { selectedProjectId, projects } = useProject();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
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

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.project?.name && doc.project.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Category counts
  const drawingCount = documents.filter((d) => d.category === 'DRAWING').length;
  const permitCount = documents.filter((d) => d.category === 'PERMIT').length;
  const contractCount = documents.filter((d) => d.category === 'CONTRACT').length;
  const photoCount = documents.filter((d) => d.category === 'PHOTO').length;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'DRAWING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PERMIT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CONTRACT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PHOTO':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'SAFETY':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <FolderOpen className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Document Management</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Centralized digital vault for engineering blueprints, municipal permits, subcontract agreements, and inspection evidence.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition"
        >
          <Upload className="w-4 h-4 stroke-[2.5]" />
          Upload Document
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Total Vault Files</span>
            <FileText className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-2xl font-bold text-white">{documents.length} Files</div>
          <div className="text-xs text-slate-400 mt-1">Across all sites & headquarters</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Architectural & Structural</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{drawingCount} CAD / PDF</div>
          <div className="text-xs text-slate-400 mt-1">GFC Drawings with version tags</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Statutory Permits</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{permitCount} Approved</div>
          <div className="text-xs text-slate-400 mt-1">RERA, Fire NOC & Environmental</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Site Evidence & Photos</span>
            <Image className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{photoCount} Uploads</div>
          <div className="text-xs text-slate-400 mt-1">Daily progress drone & mobile captures</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search blueprints, agreements, license IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Categories Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'DRAWING', 'CONTRACT', 'PERMIT', 'INVOICE', 'PHOTO', 'SAFETY'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? 'All Files' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading document repository...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-700/40">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
          <p className="text-sm font-medium text-slate-400">No documents found matching your filter</p>
          <p className="text-xs text-slate-500 mt-1">Upload drawings, contracts, or site inspection photos to populate the repository.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl p-4.5 transition flex flex-col justify-between group shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(
                      doc.category
                    )}`}
                  >
                    {doc.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatFileSize(doc.fileSize)}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-slate-900 rounded-lg text-blue-400 border border-slate-700/80 shrink-0 mt-0.5">
                    {doc.category === 'PHOTO' ? (
                      <Image className="w-5 h-5 text-purple-400" />
                    ) : doc.category === 'PERMIT' ? (
                      <Shield className="w-5 h-5 text-amber-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-blue-400 transition">
                      {doc.title}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="truncate">{doc.project?.name || 'Enterprise Master'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] font-mono">
                  {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition"
                    title="Quick Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-700/60 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition"
                    title="Download / View in New Tab"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-850">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Upload to Digital Vault
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower B - Floor 12 Structural Reinforcement GFC"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Category *</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="DRAWING">Blueprint / GFC Drawing</option>
                    <option value="CONTRACT">Contract / Agreement</option>
                    <option value="PERMIT">Permit / RERA / NOC</option>
                    <option value="INVOICE">Tax Invoice / Receipt</option>
                    <option value="PHOTO">Site Inspection Photo</option>
                    <option value="SAFETY">Safety Audit Report</option>
                    <option value="OTHER">Other Record</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Project Site</label>
                  <select
                    value={uploadProjectId}
                    onChange={(e) => setUploadProjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Enterprise Wide</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Attach File (PDF, DWG, PNG, JPEG, XLSX)</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-xl p-5 text-center cursor-pointer bg-slate-900/40 transition">
                  <input
                    type="file"
                    id="docFileInput"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="docFileInput" className="cursor-pointer block">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    {uploadFile ? (
                      <div className="text-white font-medium text-xs">
                        Selected: <span className="text-blue-400">{uploadFile.name}</span> ({formatFileSize(uploadFile.size)})
                      </div>
                    ) : (
                      <>
                        <span className="text-blue-400 font-medium">Click to browse file</span> or drag & drop here
                        <p className="text-[10px] text-slate-500 mt-1">Maximum upload size 25MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Save & Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-md">{previewDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 text-center bg-slate-950 flex flex-col items-center justify-center min-h-[260px]">
              {previewDoc.category === 'PHOTO' ? (
                <div className="space-y-3">
                  <div className="w-20 h-20 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                    <Image className="w-10 h-10" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Digital Progress Capture</p>
                  <p className="text-[11px] text-slate-500 font-mono">{previewDoc.fileUrl}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-20 h-20 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
                    <FileText className="w-10 h-10" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Official Certified Document</p>
                  <p className="text-[11px] text-slate-500 font-mono">{previewDoc.fileUrl}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-between items-center text-xs">
              <div className="text-slate-400">
                Uploaded {new Date(previewDoc.createdAt).toLocaleDateString('en-IN')} • Size: {formatFileSize(previewDoc.fileSize)}
              </div>
              <a
                href={previewDoc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
