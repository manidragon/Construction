import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Project, Client, Quotation } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import api from '../services/api';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  CheckCircle2,
  Share2,
  Users,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  Sparkles,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { DailyReportShareModal } from '../components/DailyReportShareModal';

export const Projects: React.FC = () => {
  const { hasRole } = useAuth();
  const { refreshProjects, selectedProjectId, setSelectedProjectId } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const convertQuotationId = searchParams.get('convertQuotationId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProjectId, setShareProjectId] = useState('');
  const [shareTab, setShareTab] = useState<'owner' | 'client'>('owner');
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  // Customer acquisition source: DIRECT customer or CONVERT from Quotation
  const [customerSource, setCustomerSource] = useState<'DIRECT' | 'QUOTATION'>('DIRECT');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');

  const [clientForm, setClientForm] = useState({
    code: '',
    name: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    billingAddress: '',
    gstin: '',
    pan: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientBillingAddr: '',
    clientGstin: '',
    siteAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    projectType: 'RESIDENTIAL',
    contractType: 'ITEM_RATE',
    contractValue: '',
    approvedBudget: '',
    plannedStartDate: '',
    plannedEndDate: '',
    paymentTerms: 'Monthly Running Account (RA) Bills. Retention 5%, TDS 2%, GST 18%.',
    taxRatePercent: '18',
    quotationId: '',
  });

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    status: 'ACTIVE',
    description: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientBillingAddr: '',
    clientGstin: '',
    siteAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    projectType: 'RESIDENTIAL',
    contractType: 'ITEM_RATE',
    contractValue: '',
    approvedBudget: '',
    plannedStartDate: '',
    plannedEndDate: '',
    paymentTerms: '',
    taxRatePercent: '18',
  });
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openEditProjectModal = (p: Project) => {
    setEditingProject(p);
    setEditFormData({
      name: p.name,
      status: p.status,
      description: p.description || '',
      clientName: p.clientName || '',
      clientContact: p.clientContact || '',
      clientEmail: p.clientEmail || '',
      clientBillingAddr: p.clientBillingAddr || '',
      clientGstin: p.clientGstin || '',
      siteAddress: p.siteAddress || '',
      city: p.city || 'Bengaluru',
      state: p.state || 'Karnataka',
      projectType: p.projectType || 'RESIDENTIAL',
      contractType: p.contractType || 'ITEM_RATE',
      contractValue: String(p.contractValue || ''),
      approvedBudget: String(p.approvedBudget || ''),
      plannedStartDate: p.plannedStartDate ? new Date(p.plannedStartDate).toISOString().split('T')[0] : '',
      plannedEndDate: p.plannedEndDate ? new Date(p.plannedEndDate).toISOString().split('T')[0] : '',
      paymentTerms: p.paymentTerms || '',
      taxRatePercent: String(p.taxRatePercent || '18'),
    });
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      const res = await api.updateProject(editingProject.id, editFormData);
      if (res.success) {
        setEditingProject(null);
        fetchProjects();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.deleteProject(deletingProject.id);
      if (res.success) {
        setDeletingProject(null);
        fetchProjects();
        refreshProjects();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      const res = await api.getQuotations();
      if (res.success && res.quotations) {
        setQuotations(res.quotations);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.getClients();
      if (res.success && res.clients) {
        setClients(res.clients);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const [prjRes, cliRes, quotRes] = await Promise.all([
        api.getProjects(params.toString()),
        api.getClients(),
        api.getQuotations(),
      ]);

      if (prjRes.success && prjRes.projects) {
        setProjects(prjRes.projects);
      }
      if (cliRes.success && cliRes.clients) {
        setClients(cliRes.clients);
      }
      if (quotRes.success && quotRes.quotations) {
        setQuotations(quotRes.quotations);
      }
    } catch (err) {
      console.error('Failed to load projects/clients/quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, search]);

  const handleSelectQuotation = (quot: Quotation) => {
    setSelectedQuotationId(quot.id);
    setCustomerSource('QUOTATION');

    let mappedType = 'RESIDENTIAL';
    const pt = quot.projectType || '';
    if (pt.includes('COMMERCIAL')) mappedType = 'COMMERCIAL';
    else if (pt.includes('INFRASTRUCTURE')) mappedType = 'INFRASTRUCTURE';
    else if (pt.includes('INDUSTRIAL')) mappedType = 'INDUSTRIAL';
    else if (pt.includes('RENOVATION') || pt.includes('FITOUT')) mappedType = 'RENOVATION';

    const defaultStartDate = new Date().toISOString().split('T')[0];
    const defaultEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData((prev) => ({
      ...prev,
      quotationId: quot.id,
      name: `${quot.clientName} - ${quot.projectType.replace(/_/g, ' ')}`,
      description: `Project converted from Quotation ${quot.quotationNumber}. Scope: ${quot.projectType.replace(/_/g, ' ')} (${quot.items?.length || 0} line items).`,
      clientName: quot.clientName,
      clientContact: quot.clientPhone ? quot.clientPhone.replace(/\s+/g, '') : '',
      clientEmail: quot.clientEmail || '',
      clientBillingAddr: quot.siteAddress || '',
      clientGstin: (quot.lead as any)?.gstin || '',
      siteAddress: quot.siteAddress || '',
      projectType: mappedType,
      contractType: 'ITEM_RATE',
      contractValue: String(quot.totalAmount || ''),
      approvedBudget: String(quot.subtotal || Math.round((quot.totalAmount || 0) * 0.75)),
      plannedStartDate: prev.plannedStartDate || defaultStartDate,
      plannedEndDate: prev.plannedEndDate || defaultEndDate,
      paymentTerms: quot.penaltyTerms ? `${quot.penaltyTerms}. Milestone payment schedule per quotation.` : '50% Advance, 40% Material Delivery, 10% Handover',
      taxRatePercent: String(quot.gstPercent || 18),
    }));
  };

  const handleClearQuotationSelection = () => {
    setSelectedQuotationId('');
    setCustomerSource('DIRECT');
    setFormData((prev) => ({
      ...prev,
      quotationId: '',
      name: '',
      description: '',
      clientName: '',
      clientContact: '',
      clientEmail: '',
      clientBillingAddr: '',
      clientGstin: '',
      siteAddress: '',
      contractValue: '',
      approvedBudget: '',
      paymentTerms: 'Monthly Running Account (RA) Bills. Retention 5%, TDS 2%, GST 18%.',
      taxRatePercent: '18',
    }));
  };

  // If URL has convertQuotationId, trigger modal and quotation preselection
  useEffect(() => {
    if (convertQuotationId && quotations.length > 0) {
      const found = quotations.find((q) => q.id === convertQuotationId);
      if (found) {
        handleSelectQuotation(found);
        openCreateProjectModal();
      }
    }
  }, [convertQuotationId, quotations]);

  const openCreateProjectModal = async () => {
    try {
      const res = await api.getNextProjectCode();
      if (res.success && res.nextProjectCode) {
        setFormData((prev) => ({
          ...prev,
          code: prev.code || res.nextProjectCode,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch next project code:', err);
    }
    setShowCreateModal(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingClient(true);
    try {
      const res = await api.createClient(clientForm);
      if (res.success && res.client) {
        const newClient = res.client;
        setClients((prev) => [...prev, newClient]);
        // Auto-populate client fields in the project create form
        setFormData((prev) => ({
          ...prev,
          clientName: newClient.companyName || newClient.name,
          clientContact: (newClient.phone ? newClient.phone.replace(/\s+/g, '') : '') || newClient.contactPerson || '',
          clientEmail: newClient.email || '',
          clientBillingAddr: newClient.billingAddress || '',
          clientGstin: newClient.gstin || '',
        }));
        setShowClientModal(false);
        setClientForm({
          code: '',
          name: '',
          companyName: '',
          contactPerson: '',
          phone: '',
          email: '',
          billingAddress: '',
          gstin: '',
          pan: '',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create client');
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createProject(formData);
      if (res.success) {
        setShowCreateModal(false);
        fetchProjects();
        refreshProjects();
        fetchQuotations();

        const isConverted = Boolean(res.convertedQuotation || formData.quotationId);
        if (isConverted) {
          alert(`🎉 Project "${res.project.name}" (${res.project.code}) created successfully!\n\nQuotation ${res.convertedQuotation?.quotationNumber || ''} has been marked as CONVERTED 🏆 and its line items have been imported directly into the Project BOQ.`);
        }

        handleClearQuotationSelection();
        if (convertQuotationId) {
          setSearchParams({});
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Construction Projects</h1>
          <p className="text-xs text-slate-500 mt-1">
            Master directory of multi-site projects, contracts, client accounts, approved budgets, and execution milestones.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER') && (
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 shadow-sm transition"
              title="Add a new Client to the system"
            >
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>+ Add New Client</span>
            </button>
          )}

          {hasRole('OWNER', 'PROJECT_MANAGER') && (
            <button
              onClick={() => openCreateProjectModal()}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by code, title, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
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

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading projects directory...</div>
      ) : projects.filter((p) => !selectedProjectId || p.id === selectedProjectId).length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold">No construction projects found</p>
          <p className="text-xs text-slate-400 mt-1">Try modifying your filters or clear the active project filter above.</p>
          {selectedProjectId && (
            <button
              onClick={() => setSelectedProjectId('')}
              className="mt-3 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
            >
              Clear Project Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects
            .filter((p) => !selectedProjectId || p.id === selectedProjectId)
            .map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                {/* Header: Code & Status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {p.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : p.status === 'COMPLETED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Title & Client */}
                <h3 className="text-base font-bold text-slate-900 mt-3 group-hover:text-amber-600 transition">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Client: <span className="font-semibold text-slate-700">{p.clientName}</span></p>

                {/* Location */}
                <div className="flex items-center text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  <span className="truncate">{p.siteAddress}</span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Contract Value</span>
                    <p className="text-xs font-extrabold text-slate-900">{formatCurrency(p.contractValue)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Approved Budget</span>
                    <p className="text-xs font-extrabold text-slate-700">{formatCurrency(p.approvedBudget)}</p>
                  </div>
                </div>

                {/* Cash vs Bank Collections Breakdown */}
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <span>Collections</span>
                    <span className="text-slate-900 font-extrabold">Total: {formatCurrency(p.financials?.totalReceived || 0)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 border border-emerald-200/70 rounded-lg p-1.5 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span className="text-[10px] font-bold text-emerald-800">In Cash:</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-emerald-950 font-mono">
                        {formatCurrency(p.financials?.cashReceived || 0)}
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200/70 rounded-lg p-1.5 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        <span className="text-[10px] font-bold text-blue-800">In Bank:</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-blue-950 font-mono">
                        {formatCurrency(p.financials?.bankReceived || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Completion Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[11px] text-slate-500">Progress</span>
                    <span className="font-bold text-slate-900">{p.completionPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${p.completionPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3">
                  <div className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <span>{formatDate(p.plannedStartDate)}</span>
                  </div>
                  <span>to</span>
                  <span>{formatDate(p.plannedEndDate)}</span>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setShareProjectId(p.id);
                      setShareTab('owner');
                      setShowShareModal(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 font-bold text-[11px] transition flex items-center space-x-1 border border-amber-500/20"
                    title="Share Owner Daily Financial Report (WhatsApp / PDF)"
                  >
                    <Share2 className="w-3 h-3 text-amber-600" />
                    <span>Owner</span>
                  </button>

                  <button
                    onClick={() => {
                      setShareProjectId(p.id);
                      setShareTab('client');
                      setShowShareModal(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 font-bold text-[11px] transition flex items-center space-x-1 border border-emerald-500/20"
                    title="Share Client Progress & Billing Update (WhatsApp)"
                  >
                    <Users className="w-3 h-3 text-emerald-600" />
                    <span>Client</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  {hasRole('OWNER', 'PROJECT_MANAGER') && (
                    <button
                      onClick={() => openEditProjectModal(p)}
                      className="p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition"
                      title="Edit Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {hasRole('OWNER') && (
                    <button
                      onClick={() => {
                        setDeletingProject(p);
                        setDeleteError(null);
                      }}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 transition"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Link
                    to={`/projects/${p.id}`}
                    className="font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1 ml-1"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Create New Construction Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-2024-004"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greenfield Logistics Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope of work and structural details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Customer Acquisition Source: Direct Customer vs Suggested Quotation */}
              {(() => {
                const unconvertedQuotations = quotations.filter((q) => q.status !== 'CONVERTED');
                const convertedQuotations = quotations.filter((q) => q.status === 'CONVERTED');
                const selectedQuotation = quotations.find((q) => q.id === selectedQuotationId);

                return (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Client Project Source</span>
                      </label>
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={handleClearQuotationSelection}
                          className={`px-3 py-1 rounded-md transition ${
                            customerSource === 'DIRECT'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🚶 Direct Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSource('QUOTATION');
                            if (!selectedQuotationId && unconvertedQuotations.length > 0) {
                              handleSelectQuotation(unconvertedQuotations[0]);
                            }
                          }}
                          className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                            customerSource === 'QUOTATION'
                              ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>📋 Convert from Quotation</span>
                          {unconvertedQuotations.length > 0 && (
                            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                              {unconvertedQuotations.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* If Quotation Source: Suggest given quotations */}
                    {customerSource === 'QUOTATION' ? (
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Suggest Quotation Given to Client ({unconvertedQuotations.length} proposals pending conversion):
                        </label>
                        <select
                          value={selectedQuotationId}
                          onChange={(e) => {
                            const qId = e.target.value;
                            if (!qId) {
                              handleClearQuotationSelection();
                              return;
                            }
                            const found = quotations.find((q) => q.id === qId);
                            if (found) handleSelectQuotation(found);
                          }}
                          className="w-full text-xs p-2.5 bg-white border-2 border-amber-400 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                        >
                          <option value="">-- Choose Quotation to Auto-Fill & Convert --</option>
                          {unconvertedQuotations.length > 0 && (
                            <optgroup label="⚡ Available / Active Quotations (Pending Conversion)">
                              {unconvertedQuotations.map((q) => (
                                <option key={q.id} value={q.id}>
                                  [{q.quotationNumber}] {q.clientName} • ₹{formatCurrency(q.totalAmount)} • Status: {q.status}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {convertedQuotations.length > 0 && (
                            <optgroup label="✓ Previously Converted Quotations">
                              {convertedQuotations.map((q) => (
                                <option key={q.id} value={q.id} disabled>
                                  [{q.quotationNumber}] {q.clientName} (ALREADY CONVERTED TO PROJECT)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>

                        {/* Selected Quotation Highlight Card */}
                        {selectedQuotation && (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded text-[11px]">
                                  {selectedQuotation.quotationNumber}
                                </span>
                                <span className="font-bold text-emerald-950 text-xs">{selectedQuotation.clientName}</span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                  Current Status: {selectedQuotation.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-800 font-medium">
                                Agreed Total Value: <strong>₹{selectedQuotation.totalAmount.toLocaleString('en-IN')}</strong> • {selectedQuotation.items?.length || 0} work items itemized
                              </p>
                              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>
                                  <strong>Automatic Conversion</strong>: On saving this project, Quotation <strong>{selectedQuotation.quotationNumber}</strong> will automatically be marked as <strong>CONVERTED</strong> 🏆, and its line items will be populated in the Project BOQ.
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearQuotationSelection}
                              className="self-start sm:self-center px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shrink-0"
                            >
                              ✕ Reset
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Direct Customer registered clients dropdown */
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Select Existing Client (Optional)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowClientModal(true)}
                            className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Add New Client</span>
                          </button>
                        </div>
                        <select
                          onChange={(e) => {
                            const cId = e.target.value;
                            if (!cId) return;
                            const c = clients.find((item) => item.id === cId);
                            if (c) {
                              setFormData({
                                ...formData,
                                clientName: c.companyName || c.name,
                                clientContact: (c.phone ? c.phone.replace(/\s+/g, '') : '') || c.contactPerson || '',
                                clientEmail: c.email || '',
                                clientBillingAddr: c.billingAddress || '',
                                clientGstin: c.gstin || '',
                              });
                            }
                          }}
                          defaultValue=""
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">-- Direct Customer / Walk-in (Fill details below or select client) --</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.code}] {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.phone}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prestige Developers"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Phone (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="+918056694739 or 9876543210"
                    value={formData.clientContact}
                    onChange={(e) => setFormData({ ...formData, clientContact: e.target.value.replace(/\s+/g, '') })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">No spaces needed</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    placeholder="billing@client.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client GSTIN</label>
                  <input
                    type="text"
                    placeholder="29AABCP1122K1Z9"
                    value={formData.clientGstin}
                    onChange={(e) => setFormData({ ...formData, clientGstin: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Site Address & Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot No, Road, Locality, Coordinates"
                    value={formData.siteAddress}
                    onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Type</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="RESIDENTIAL">Residential Highrise</option>
                    <option value="COMMERCIAL">Commercial Office</option>
                    <option value="INFRASTRUCTURE">Infrastructure & Metro</option>
                    <option value="INDUSTRIAL">Industrial Warehousing</option>
                    <option value="RENOVATION">Renovation / Fitout</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contract Value (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350000000"
                    value={formData.contractValue}
                    onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approved Budget (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 295000000"
                    value={formData.approvedBudget}
                    onChange={(e) => setFormData({ ...formData, approvedBudget: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planned Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.plannedStartDate}
                    onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planned Completion Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.plannedEndDate}
                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing & Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Running Account (RA) Bills. Retention 5%, TDS 2%, GST 18%."
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm transition"
                >
                  Save & Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Client Account</h3>
                  <p className="text-[11px] text-slate-500">Register a client for project contracts and RA billing</p>
                </div>
              </div>
              <button
                onClick={() => setShowClientModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CLI-004 (Auto)"
                    value={clientForm.code}
                    onChange={(e) => setClientForm({ ...clientForm, code: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank to auto-generate</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client / Entity Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prestige Estates Projects"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Prestige Group"
                    value={clientForm.companyName}
                    onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Murthy"
                    value={clientForm.contactPerson}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+918056694739 or 9876543210"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value.replace(/\s+/g, '') })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">No spaces needed between numbers</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="billing@prestige.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Billing Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="The Falcon Tower, No. 1 Main Guard Cross Road, Bengaluru 560001"
                  value={clientForm.billingAddress}
                  onChange={(e) => setClientForm({ ...clientForm, billingAddress: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="29AABCP1122K1Z9"
                    value={clientForm.gstin}
                    onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    placeholder="AABCP1122K"
                    value={clientForm.pan}
                    onChange={(e) => setClientForm({ ...clientForm, pan: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClient}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-lg shadow-sm transition"
                >
                  {isSubmittingClient ? 'Saving...' : 'Save & Select Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                  {editingProject.code}
                </span>
                <h2 className="text-base font-bold text-slate-900">Edit Project Details</h2>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contract Value (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.contractValue}
                    onChange={(e) => setEditFormData({ ...editFormData, contractValue: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approved Budget (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.approvedBudget}
                    onChange={(e) => setEditFormData({ ...editFormData, approvedBudget: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planned Start Date</label>
                  <input
                    type="date"
                    value={editFormData.plannedStartDate}
                    onChange={(e) => setEditFormData({ ...editFormData, plannedStartDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planned End Date</label>
                  <input
                    type="date"
                    value={editFormData.plannedEndDate}
                    onChange={(e) => setEditFormData({ ...editFormData, plannedEndDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Site Address</label>
                <input
                  type="text"
                  value={editFormData.siteAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, siteAddress: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {deletingProject && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Project?</h3>
                <p className="text-xs text-slate-500 font-mono">[{deletingProject.code}] {deletingProject.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this project? This will permanently remove the project and its configurations.
              Projects with active financial transactions or invoices cannot be deleted.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingProject(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProject}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Sharing Modal */}
      <DailyReportShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projectId={shareProjectId}
        defaultTab={shareTab}
      />
    </div>
  );
};
