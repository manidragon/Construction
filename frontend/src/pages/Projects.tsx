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
  Landmark,
} from 'lucide-react';
import { DailyReportShareModal } from '../components/DailyReportShareModal';
import SearchableSelect from '../components/common/SearchableSelect';

export const Projects: React.FC = () => {
  const { hasRole, hasFeature } = useAuth();
  const realEstateAllowed = hasFeature('REAL_ESTATE');
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
  const selectedQuotation = quotations.find((q) => q.id === selectedQuotationId);

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

  // Real Estate Hub & Dedicated Land Project State
  const initialTypeFilter = searchParams.get('typeFilter');
  const [hubTab, setHubTab] = useState<'PROJECTS' | 'REAL_ESTATE_HUB'>(
    initialTypeFilter === 'REAL_ESTATE' && realEstateAllowed ? 'REAL_ESTATE_HUB' : 'PROJECTS'
  );
  const [showRealEstateCreateModal, setShowRealEstateCreateModal] = useState(false);
  const [allPlots, setAllPlots] = useState<any[]>([]);
  const [plotsSummary, setPlotsSummary] = useState<any>(null);
  const [landProjects, setLandProjects] = useState<any[]>([]);
  const [hubLoading, setHubLoading] = useState(false);
  const [hubFilterProject, setHubFilterProject] = useState<string>('ALL');
  const [hubFilterStatus, setHubFilterStatus] = useState<string>('ALL');
  const [hubFilterSize, setHubFilterSize] = useState<string>('ALL');
  const [hubSearch, setHubSearch] = useState<string>('');

  const [realEstateForm, setRealEstateForm] = useState({
    code: '',
    name: '',
    description: '',
    clientName: 'Direct Plot Buyers (Public Layout Sale)',
    siteAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    totalLandArea: '5',
    landAreaUnit: 'ACRES',
    surveyNumber: '',
    layoutApprovalNumber: '',
    contractValue: '75000000',
    approvedBudget: '60000000',
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRatePercent: '0',
    generateBatch: true,
    numberOfPlots: '50',
    sizeCents: '5',
    ratePerCent: '150000',
    plotPrice: '750000',
    facing: 'EAST',
    prefix: 'PLOT-',
  });

  const fetchRealEstatePlots = async () => {
    try {
      setHubLoading(true);
      const params = new URLSearchParams();
      if (hubFilterProject !== 'ALL') params.append('projectId', hubFilterProject);
      if (hubFilterStatus !== 'ALL') params.append('status', hubFilterStatus);
      if (hubFilterSize !== 'ALL') params.append('sizeCents', hubFilterSize);
      if (hubSearch.trim()) params.append('search', hubSearch.trim());

      const res = await api.getAllRealEstatePlots(params.toString());
      if (res.success) {
        setAllPlots(res.plots || []);
        setPlotsSummary(res.summary || null);
        setLandProjects(res.projects || []);
      }
    } catch (err) {
      console.error('Failed to load real estate plots:', err);
    } finally {
      setHubLoading(false);
    }
  };

  useEffect(() => {
    if (!realEstateAllowed && hubTab === 'REAL_ESTATE_HUB') {
      setHubTab('PROJECTS');
      return;
    }
    if (realEstateAllowed && hubTab === 'REAL_ESTATE_HUB') {
      fetchRealEstatePlots();
    }
  }, [realEstateAllowed, hubTab, hubFilterProject, hubFilterStatus, hubFilterSize, hubSearch]);

  const openCreateRealEstateModal = async () => {
    try {
      const res = await api.getNextProjectCode();
      const code = res.nextProjectCode
        ? res.nextProjectCode.replace('PRJ-', 'PRJ-RE-')
        : `PRJ-RE-${Date.now().toString().slice(-3)}`;
      setRealEstateForm((prev) => ({
        ...prev,
        code,
      }));
    } catch (err) {}
    setShowRealEstateCreateModal(true);
  };

  const handleCreateRealEstateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: realEstateForm.code,
        name: realEstateForm.name,
        description:
          realEstateForm.description ||
          `Real Estate Plotted Land Development - ${realEstateForm.totalLandArea} ${realEstateForm.landAreaUnit}`,
        clientName: realEstateForm.clientName || 'Direct Plot Buyers',
        siteAddress: realEstateForm.siteAddress,
        city: realEstateForm.city,
        state: realEstateForm.state,
        projectType: 'REAL_ESTATE',
        contractType: 'ITEM_RATE',
        contractValue: realEstateForm.contractValue,
        approvedBudget: realEstateForm.approvedBudget || realEstateForm.contractValue,
        plannedStartDate: realEstateForm.plannedStartDate,
        plannedEndDate: realEstateForm.plannedEndDate,
        paymentTerms: 'Token Advance, Agreement Advance, Full Payment & Sub-Registrar Legal Registration.',
        taxRatePercent: 0,
        gstMode: 'NO_GST',
        totalLandArea: realEstateForm.totalLandArea,
        landAreaUnit: realEstateForm.landAreaUnit,
        surveyNumber: realEstateForm.surveyNumber,
        layoutApprovalNumber: realEstateForm.layoutApprovalNumber,
      };

      const res = await api.createProject(payload);
      if (res.success && res.project) {
        if (realEstateForm.generateBatch && Number(realEstateForm.numberOfPlots) > 0) {
          try {
            await api.createPlotBatch(res.project.id, {
              groupName: `${realEstateForm.sizeCents} Cents Standard Plots`,
              numberOfPlots: realEstateForm.numberOfPlots,
              sizeCents: realEstateForm.sizeCents,
              ratePerCent: realEstateForm.ratePerCent,
              plotPrice: realEstateForm.plotPrice,
              prefix: realEstateForm.prefix || 'PLOT-',
              startNumber: '1',
              facing: realEstateForm.facing || 'EAST',
            });
          } catch (batchErr) {
            console.error('Batch generation error:', batchErr);
          }
        }

        setShowRealEstateCreateModal(false);
        fetchProjects();
        refreshProjects();
        if (hubTab === 'REAL_ESTATE_HUB') fetchRealEstatePlots();
        alert(`🎉 Real estate land layout "${res.project.name}" (${res.project.code}) created successfully!`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create real estate project');
    }
  };

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
      approvedBudget: String(quot.subtotal || quot.totalAmount || ''),
      plannedStartDate: prev.plannedStartDate || defaultStartDate,
      plannedEndDate: prev.plannedEndDate || defaultEndDate,
      paymentTerms: quot.penaltyTerms ? `${quot.penaltyTerms}. Milestone payment schedule per quotation.` : '50% Advance, 40% Material Delivery, 10% Handover',
      taxRatePercent: String(quot.gstPercent || 18),
    }));
  };

  const handleClearQuotationSelection = () => {
    setSelectedQuotationId('');
    setCustomerSource('DIRECT');
    resetProjectForm();
  };

  const resetProjectForm = () => {
    setFormData({
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
    setSelectedQuotationId('');
    setCustomerSource('DIRECT');
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
          code: res.nextProjectCode,
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

        <div className="flex flex-wrap items-center gap-2">
          {hasRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER') && (
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs border border-slate-200 shadow-sm transition"
              title="Add a new Client to the system"
            >
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>+ Add Client</span>
            </button>
          )}

          {hasRole('OWNER', 'PROJECT_MANAGER') && (
            <>
              <button
                onClick={() => openCreateProjectModal()}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Construction Project</span>
              </button>

              {realEstateAllowed && (
                <button
                  onClick={() => openCreateRealEstateModal()}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
                  title="Create a new plotted layout development (Product sale with plot inventory)"
                >
                  <Landmark className="w-4 h-4" />
                  <span>+ 🌾 New Land Project (Plots)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Switcher: Construction Projects vs Real Estate Availability Hub */}
      {realEstateAllowed && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setHubTab('PROJECTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              hubTab === 'PROJECTS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>All Construction & Turnkey Projects ({projects.length})</span>
          </button>

          <button
            onClick={() => {
              setHubTab('REAL_ESTATE_HUB');
              fetchRealEstatePlots();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              hubTab === 'REAL_ESTATE_HUB'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span>🌾 Real Estate & Plot Availability Hub ({projects.filter((p) => p.projectType === 'REAL_ESTATE').length})</span>
          </button>
        </div>
      )}

      {/* VIEW 1: CONSTRUCTION PROJECTS DIRECTORY */}
      {hubTab === 'PROJECTS' && (
        <>
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
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'ACTIVE'
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
        </>
      )}

      {/* VIEW 2: REAL ESTATE & PLOT AVAILABILITY HUB */}
      {realEstateAllowed && hubTab === 'REAL_ESTATE_HUB' && (
        <div className="space-y-4">
          {/* Real-Time Cross-Project Live Availability KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Layout Plots</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {plotsSummary?.totalPlots || allPlots.length}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Across All Land Layouts</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-600 block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready to Sell
              </span>
              <span className="text-xl font-black text-emerald-600 mt-1 block">
                {plotsSummary?.availableCount || allPlots.filter((p) => p.status === 'AVAILABLE').length}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Instant Booking Available</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-600 block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Booked / Token
              </span>
              <span className="text-xl font-black text-amber-600 mt-1 block">
                {(plotsSummary?.bookedCount || 0) + (plotsSummary?.tokenPaidCount || 0) ||
                  allPlots.filter((p) => p.status === 'BOOKED' || p.status === 'TOKEN_PAID').length}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Advance Collected</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[11px] font-semibold text-rose-600 block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                Lapsed (No-Show)
              </span>
              <span className="text-xl font-black text-rose-600 mt-1 block">
                {plotsSummary?.lapsedCount || allPlots.filter((p) => p.status === 'TOKEN_LAPSED_NO_SHOW').length}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Eligible to Re-assign</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Token Inflow</span>
              <span className="text-base font-black text-emerald-600 mt-1 block truncate">
                {formatCurrency(plotsSummary?.totalCollected || 0)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Posted to Ledger</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Balance Due</span>
              <span className="text-base font-black text-indigo-600 mt-1 block truncate">
                {formatCurrency(plotsSummary?.totalBalance || 0)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Due at SRO Registration</span>
            </div>
          </div>

          {/* Cross-Project Filters & Fast Search for Sales Team */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Land Project Selector */}
              <select
                value={hubFilterProject}
                onChange={(e) => setHubFilterProject(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">🌾 All Land Layout Projects ({landProjects.length})</option>
                {landProjects.map((lp) => (
                  <option key={lp.id} value={lp.id}>
                    {lp.name} ({lp._count?.plots || 0} plots)
                  </option>
                ))}
              </select>

              {/* Status Selector */}
              <select
                value={hubFilterStatus}
                onChange={(e) => setHubFilterStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="TOKEN_PAID">Token Paid</option>
                <option value="BOOKED">Booked</option>
                <option value="TOKEN_LAPSED_NO_SHOW">Token Lapsed (No-Show)</option>
                <option value="REGISTERED">Registered</option>
              </select>

              {/* Size Selector */}
              <select
                value={hubFilterSize}
                onChange={(e) => setHubFilterSize(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Plot Sizes</option>
                <option value="2.5">2.5 Cents (1,089 sqft)</option>
                <option value="3">3 Cents (1,307 sqft)</option>
                <option value="5">5 Cents (2,178 sqft)</option>
                <option value="10">10 Cents</option>
              </select>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Quick search plot #, buyer, phone..."
                value={hubSearch}
                onChange={(e) => setHubSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Plot Grid Display across all projects */}
          {hubLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading plot inventory across land layouts...</div>
          ) : allPlots.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No plots found matching current filter</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting "All Land Layout Projects" or clearing search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allPlots.map((p) => {
                const isAvail = p.status === 'AVAILABLE';
                const isLapsed = p.status === 'TOKEN_LAPSED_NO_SHOW';
                const isReg = p.status === 'REGISTERED';

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                      isAvail
                        ? 'border-emerald-200'
                        : isLapsed
                        ? 'border-rose-300 bg-rose-50/20'
                        : isReg
                        ? 'border-indigo-200'
                        : 'border-amber-200 bg-amber-50/10'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Plot # and Status */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: isAvail ? '#10b981' : isLapsed ? '#f43f5e' : isReg ? '#6366f1' : '#f59e0b',
                            }}
                          />
                          {p.plotNumber}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            isAvail
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLapsed
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : isReg
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isLapsed ? 'LAPSED' : p.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Land Project Name & Location */}
                      <div className="text-[11px] text-slate-500 mb-2 truncate">
                        <span className="font-semibold text-slate-800">{p.project?.name || 'Land Project'}</span>
                        {p.project?.siteAddress && (
                          <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                            📍 {p.project.siteAddress}
                          </span>
                        )}
                      </div>

                      {/* Size & Facing */}
                      <div className="flex items-center justify-between text-xs text-slate-700 border-b border-slate-100 pb-2 mb-2">
                        <span className="font-bold">
                          {p.sizeCents} Cents{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({p.sizeSqFt || Math.round(p.sizeCents * 435.6)} sqft)
                          </span>
                        </span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                          Facing: {p.facing || 'East'}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-400">Total Price:</span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(p.price)}</span>
                      </div>

                      {/* Buyer Details if Booked */}
                      {!isAvail && (
                        <div className="bg-slate-50 rounded-lg p-2 text-xs space-y-1 border border-slate-100 mb-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Buyer:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[120px]">
                              {p.buyerName || 'Client'}
                            </span>
                          </div>
                          {p.totalReceived > 0 && (
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-emerald-600 font-semibold">Received:</span>
                              <span className="font-mono font-bold text-emerald-600">
                                {formatCurrency(p.totalReceived)}
                              </span>
                            </div>
                          )}
                          {p.balanceDue > 0 && (
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-rose-600 font-semibold">Balance:</span>
                              <span className="font-mono font-bold text-rose-600">
                                {formatCurrency(p.balanceDue)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Direct Link to Project Plots Tab */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        to={`/projects/${p.projectId}?tab=plots`}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
                      >
                        <span>Open Layout Plots</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {isAvail ? (
                        <Link
                          to={`/projects/${p.projectId}?tab=plots`}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          Book Now
                        </Link>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {p.status === 'REGISTERED' ? '✓ Registered' : 'Under Booking'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Create New Construction Project</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetProjectForm();
                }}
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
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                          className={`px-3 py-1 rounded-md transition ${customerSource === 'DIRECT'
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
                          className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${customerSource === 'QUOTATION'
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
                        <SearchableSelect
                          options={unconvertedQuotations.map((q) => ({
                            value: q.id,
                            label: `${q.clientName} • ₹{formatCurrency(q.totalAmount)}`,
                            code: q.quotationNumber,
                            sublabel: `Status: ${q.status} | Items: ${q.items?.length || 0}`,
                          }))}
                          value={selectedQuotationId}
                          onChange={(val) => {
                            if (!val) {
                              handleClearQuotationSelection();
                              return;
                            }
                            const found = quotations.find((q) => q.id === val);
                            if (found) handleSelectQuotation(found);
                          }}
                          placeholder="-- Choose Quotation to Auto-Fill & Convert --"
                          searchPlaceholder="Search quotation number or client..."
                        />

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
                              <div className="bg-emerald-100/70 border border-emerald-300 rounded-lg p-2.5 my-1.5 grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                  <div className="text-[10px] text-emerald-700 font-medium">Net Scope Subtotal</div>
                                  <div className="font-bold text-emerald-950 font-mono">₹{(selectedQuotation.subtotal || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div className="border-x border-emerald-300 px-1">
                                  <div className="text-[10px] text-emerald-700 font-medium">
                                    GST Tax ({selectedQuotation.gstMode === 'NO_GST' ? '0% / No GST' : `${selectedQuotation.gstPercent || 18}% ${selectedQuotation.gstMode === 'INCLUSIVE' ? 'Incl' : 'Addl'}`})
                                  </div>
                                  <div className="font-bold text-amber-900 font-mono">+ ₹{(selectedQuotation.gstAmount || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-emerald-700 font-medium">Total Contract Value</div>
                                  <div className="font-bold text-emerald-900 font-mono">₹{selectedQuotation.totalAmount.toLocaleString('en-IN')}</div>
                                </div>
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
                        <SearchableSelect
                          options={clients.map((c) => ({
                            value: c.id,
                            label: c.companyName ? `${c.name} (${c.companyName})` : c.name,
                            code: c.code,
                            sublabel: c.phone ? `Ph: ${c.phone}` : undefined,
                          }))}
                          value={clients.find((c) => c.name === formData.clientName || c.companyName === formData.clientName)?.id || ''}
                          onChange={(cId) => {
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
                          placeholder="-- Direct Customer / Walk-in (Fill details below or select client) --"
                          searchPlaceholder="Search client name, company, or code..."
                          onAddNew={() => setShowClientModal(true)}
                          addNewLabel="+ Add New Client"
                        />
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
                  <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                    <label className="text-xs font-bold text-slate-700">Contract Value (₹) *</label>
                    {selectedQuotation ? (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                        Total ₹{(selectedQuotation.subtotal || 0).toLocaleString('en-IN')} + GST ₹{(selectedQuotation.gstAmount || 0).toLocaleString('en-IN')}
                      </span>
                    ) : (Number(formData.contractValue) > 0 && Number(formData.approvedBudget) > 0 && Number(formData.contractValue) !== Number(formData.approvedBudget)) ? (
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                        Base ₹{Number(formData.approvedBudget).toLocaleString('en-IN')} + GST ₹{Math.max(0, Number(formData.contractValue) - Number(formData.approvedBudget)).toLocaleString('en-IN')}
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350000000"
                    value={formData.contractValue}
                    onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {selectedQuotation && (
                    <p className="text-[10px] text-slate-600 mt-1 flex items-center justify-between px-0.5">
                      <span>Scope: <strong className="text-slate-800 font-mono">₹{(selectedQuotation.subtotal || 0).toLocaleString('en-IN')}</strong></span>
                      <span>+ Tax ({selectedQuotation.gstMode === 'NO_GST' ? '0%' : `${selectedQuotation.gstPercent || 18}%`}): <strong className="text-amber-700 font-mono">₹{(selectedQuotation.gstAmount || 0).toLocaleString('en-IN')}</strong></span>
                      <span>= <strong className="text-emerald-700 font-mono">₹{selectedQuotation.totalAmount.toLocaleString('en-IN')}</strong></span>
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                    <label className="text-xs font-bold text-slate-700">Approved Budget (₹) *</label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {selectedQuotation ? `(Net Scope excl. GST)` : `(Execution Budget)`}
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 295000000"
                    value={formData.approvedBudget}
                    onChange={(e) => setFormData({ ...formData, approvedBudget: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {selectedQuotation && (
                    <p className="text-[10px] text-emerald-700 mt-1 px-0.5 font-medium">
                      ✓ Profit is calculated strictly from this Net Budget (excluding GST).
                    </p>
                  )}
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
                  onClick={() => {
                    setShowCreateModal(false);
                    resetProjectForm();
                  }}
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
                    onChange={(e) => setClientForm({ ...clientForm, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
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

      {/* Dedicated Modal: Create Real Estate Land Project (Product) */}
      {realEstateAllowed && showRealEstateCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">New Real Estate Land Project (Plot Layout)</h2>
                  <p className="text-xs text-slate-500">
                    Product-based layout development with acreage, survey numbers, and plot batch inventory.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRealEstateCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRealEstateProject} className="flex flex-col max-h-[75vh] overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
                {/* Product vs Service Clarification Banner */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Real Estate Land Product Model</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Unlike service contracting, plotted layouts are enterprise products owned by your firm. Plots can be added in bulk or individually, and sold directly to buyers with token advance, full payment, and legal SRO registration tracking.
                  </p>
                </div>

                {/* Project Code & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Project Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PRJ-RE-002"
                      value={realEstateForm.code}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, code: e.target.value.toUpperCase() })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold uppercase focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Layout / Project Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prestige Green Valley Land & Plot Layout"
                      value={realEstateForm.name}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, name: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location & City */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Site Location & Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sy. No 88/1A, Kanakapura Main Road, Harohalli"
                      value={realEstateForm.siteAddress}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, siteAddress: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={realEstateForm.city}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, city: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {/* Land Area & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Land Area *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 5"
                      value={realEstateForm.totalLandArea}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, totalLandArea: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Land Area Unit</label>
                    <select
                      value={realEstateForm.landAreaUnit}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, landAreaUnit: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    >
                      <option value="ACRES">Acres (1 Acre = 100 Cents)</option>
                      <option value="CENTS">Cents (435.6 sq.ft)</option>
                      <option value="GUNTHA">Gunthas (1,089 sq.ft)</option>
                      <option value="SQFT">Square Feet (Sq.Ft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Survey / Khasra Numbers</label>
                    <input
                      type="text"
                      placeholder="e.g. Sy. No. 88/1A, 88/2B"
                      value={realEstateForm.surveyNumber}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, surveyNumber: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Approval & Estimated Valuation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">DTCP / BDA / RERA Approval #</label>
                    <input
                      type="text"
                      placeholder="e.g. DTCP/PL/2026/894"
                      value={realEstateForm.layoutApprovalNumber}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, layoutApprovalNumber: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Estimated Project Value (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 75000000"
                      value={realEstateForm.contractValue}
                      onChange={(e) => setRealEstateForm({ ...realEstateForm, contractValue: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                {/* GST Tax Configuration - Exempt by Law */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">GST Tax Configuration:</span>
                    <span className="font-bold font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      0% (No GST / Exempt)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Per Schedule III of the CGST Act (Item 5), sale of land or plotted layouts is neither a supply of goods nor services. Real estate land projects automatically default to 0% GST, meaning tax is not added to expenses.
                  </p>
                </div>

                {/* Checkbox: Upfront Plot Batch Generation */}
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-xs text-indigo-950">
                      <input
                        type="checkbox"
                        checked={realEstateForm.generateBatch}
                        onChange={(e) => setRealEstateForm({ ...realEstateForm, generateBatch: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Generate Initial Plot Inventory Now (Batch Generator)</span>
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold">Recommended</span>
                  </div>

                  {realEstateForm.generateBatch && (
                    <div className="space-y-3 pt-2 border-t border-indigo-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Number of Plots *</label>
                          <input
                            type="number"
                            value={realEstateForm.numberOfPlots}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, numberOfPlots: e.target.value })}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Size (Cents) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateForm.sizeCents}
                            onChange={(e) => {
                              const sz = parseFloat(e.target.value) || 0;
                              const rate = parseFloat(realEstateForm.ratePerCent) || 0;
                              setRealEstateForm({
                                ...realEstateForm,
                                sizeCents: e.target.value,
                                plotPrice: String(Math.round(sz * rate)),
                              });
                            }}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Rate / Cent (₹) *</label>
                          <input
                            type="number"
                            value={realEstateForm.ratePerCent}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              const sz = parseFloat(realEstateForm.sizeCents) || 0;
                              setRealEstateForm({
                                ...realEstateForm,
                                ratePerCent: e.target.value,
                                plotPrice: String(Math.round(sz * rate)),
                              });
                            }}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Total Plot Price (₹)</label>
                          <input
                            type="number"
                            value={realEstateForm.plotPrice}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, plotPrice: e.target.value })}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Plot Prefix</label>
                          <input
                            type="text"
                            value={realEstateForm.prefix}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, prefix: e.target.value.toUpperCase() })}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Default Facing</label>
                          <select
                            value={realEstateForm.facing}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, facing: e.target.value })}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-semibold"
                          >
                            <option value="EAST">East</option>
                            <option value="NORTH">North</option>
                            <option value="WEST">West</option>
                            <option value="SOUTH">South</option>
                            <option value="CORNER">Corner</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-[11px] text-indigo-900 font-medium">
                        Preview: <strong>{realEstateForm.numberOfPlots} plots</strong> of <strong>{realEstateForm.sizeCents} cents each</strong> ({realEstateForm.prefix}01 to {realEstateForm.prefix}{String(realEstateForm.numberOfPlots).padStart(2, '0')}) @ ₹{Number(realEstateForm.plotPrice || 0).toLocaleString('en-IN')} each.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Sticky Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-end space-x-2 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setShowRealEstateCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Landmark className="w-4 h-4" />
                  <span>Create Real Estate Project & Inventory</span>
                </button>
              </div>
            </form>
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
