import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Project, Client } from '../types';
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
} from 'lucide-react';
import { DailyReportShareModal } from '../components/DailyReportShareModal';

export const Projects: React.FC = () => {
  const { hasRole } = useAuth();
  const { refreshProjects, selectedProjectId, setSelectedProjectId } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProjectId, setShareProjectId] = useState('');
  const [shareTab, setShareTab] = useState<'owner' | 'client'>('owner');
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
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
  });

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

      const [prjRes, cliRes] = await Promise.all([
        api.getProjects(params.toString()),
        api.getClients(),
      ]);

      if (prjRes.success && prjRes.projects) {
        setProjects(prjRes.projects);
      }
      if (cliRes.success && cliRes.clients) {
        setClients(cliRes.clients);
      }
    } catch (err) {
      console.error('Failed to load projects/clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, search]);

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
          clientContact: newClient.contactPerson || newClient.phone || '',
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
          paymentTerms: '',
          taxRatePercent: '18',
        });
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
              onClick={() => setShowCreateModal(true)}
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

                <Link
                  to={`/projects/${p.id}`}
                  className="font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
                >
                  <span>Open Project</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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

              {/* Client Auto-fill / Select box */}
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Select Client to Auto-fill Details</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowClientModal(true)}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
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
                        clientContact: c.contactPerson || c.phone || '',
                        clientEmail: c.email || '',
                        clientBillingAddr: c.billingAddress || '',
                        clientGstin: c.gstin || '',
                      });
                    }
                  }}
                  defaultValue=""
                  className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose from Registered Clients ({clients.length}) or enter below --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.phone}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Selecting a client automatically fills client name, GSTIN, contact person, email, and address.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client GSTIN</label>
                  <input
                    type="text"
                    placeholder="29AABCP1122K1Z9"
                    value={formData.clientGstin}
                    onChange={(e) => setFormData({ ...formData, clientGstin: e.target.value })}
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

              <div>
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
                    placeholder="+91 98450 11001"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
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
