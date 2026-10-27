import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Lead,
  LeadStage,
  LeadProjectType,
  LeadBudgetRange,
  LeadSource,
  AssignedTeam,
  User,
} from '../types';
import {
  Users,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  DollarSign,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Send,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import DynamicSelect from '../components/common/DynamicSelect';

const STAGES: { key: LeadStage; label: string; color: string; border: string; bg: string }[] = [
  { key: 'NEW_LEAD', label: 'New Lead', color: 'text-blue-700', border: 'border-blue-300', bg: 'bg-blue-50' },
  { key: 'SITE_VISIT_SCHEDULED', label: 'Site Visit Scheduled', color: 'text-purple-700', border: 'border-purple-300', bg: 'bg-purple-50' },
  { key: 'SITE_MEASUREMENT_COMPLETED', label: 'Site Measurement Done', color: 'text-indigo-700', border: 'border-indigo-300', bg: 'bg-indigo-50' },
  { key: 'DESIGN_CONCEPT_DISCUSSION', label: 'Design / Concept Discussion', color: 'text-amber-700', border: 'border-amber-300', bg: 'bg-amber-50' },
  { key: 'BOQ_QUOTATION_SHARED', label: 'BOQ / Quotation Shared', color: 'text-cyan-700', border: 'border-cyan-300', bg: 'bg-cyan-50' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'text-orange-700', border: 'border-orange-300', bg: 'bg-orange-50' },
  { key: 'LEAD_WON', label: 'Lead Won', color: 'text-emerald-700', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  { key: 'LEAD_LOST', label: 'Lead Lost', color: 'text-rose-700', border: 'border-rose-300', bg: 'bg-rose-50' },
];

const PROJECT_TYPE_LABELS: Record<LeadProjectType, string> = {
  RESIDENTIAL_INTERIOR: 'Residential Interior',
  COMMERCIAL_FITOUT: 'Commercial Fit-out',
  FULL_VILLA_CONSTRUCTION: 'Full Villa Construction',
  RENOVATION: 'Renovation & Remodel',
};

const BUDGET_RANGE_LABELS: Record<LeadBudgetRange, string> = {
  '10L_25L': '₹10L - ₹25L',
  '25L_50L': '₹25L - ₹50L',
  '50L_1CR': '₹50L - ₹1 Crore',
  '1CR_2.5CR': '₹1 Crore - ₹2.5 Crores',
  '2.5CR_PLUS': '₹2.5 Crores+',
};

const SOURCE_LABELS: Record<string, string> = {
  ARCHITECT_REFERRAL: 'Architect & Interior Designer Referral',
  REFERRAL: 'Client / Word-of-Mouth Referral',
  SITE_BRANDING: 'Site Signboard & On-Site Branding',
  WALKIN: 'Walk-in / Studio & Office Visit',
  REAL_ESTATE_BROKER: 'Real Estate Consultant / Broker Referral',
  VENDOR_REFERRAL: 'Subcontractor / Material Supplier Referral',
  ENGINEER_REFERRAL: 'Civil Engineer / Structural Consultant',
  INSTAGRAM: 'Instagram / Meta Social Media',
  WEBSITE: 'Website & Google Local Search',
  GOOGLE_ADS: 'Google Search Ads',
  DIRECT_ENQUIRY: 'Direct Enquiry / Personal Network',
  REPEAT_CLIENT: 'Repeat Client / Phase-2 Job Works',
  OTHER: 'Other Channel',
};

const formatSource = (source?: string) => {
  if (!source) return 'Not Specified';
  return SOURCE_LABELS[source] || source.replace(/_/g, ' ');
};

const LEAD_SOURCE_FALLBACK_OPTIONS = [
  { label: 'Architect & Interior Designer Referral', value: 'ARCHITECT_REFERRAL' },
  { label: 'Client / Word-of-Mouth Referral', value: 'REFERRAL' },
  { label: 'Site Signboard & On-Site Branding', value: 'SITE_BRANDING' },
  { label: 'Walk-in / Studio & Office Visit', value: 'WALKIN' },
  { label: 'Real Estate Consultant / Broker Referral', value: 'REAL_ESTATE_BROKER' },
  { label: 'Subcontractor / Material Supplier Referral', value: 'VENDOR_REFERRAL' },
  { label: 'Civil Engineer / Structural Consultant', value: 'ENGINEER_REFERRAL' },
  { label: 'Instagram / Meta Social Media', value: 'INSTAGRAM' },
  { label: 'Website & Google Local Search', value: 'WEBSITE' },
  { label: 'Google Search Ads', value: 'GOOGLE_ADS' },
  { label: 'Direct Enquiry / Personal Network', value: 'DIRECT_ENQUIRY' },
  { label: 'Repeat Client / Phase-2 Job Works', value: 'REPEAT_CLIENT' },
  { label: 'Other Channel', value: 'OTHER' },
];

const formatBudget = (budget?: string) => {
  if (!budget) return 'Budget: Flexible';
  return BUDGET_RANGE_LABELS[budget as LeadBudgetRange] || budget.replace(/_/g, ' ');
};

const formatProjectType = (type?: string) => {
  if (!type) return 'General Project';
  return PROJECT_TYPE_LABELS[type as LeadProjectType] || type.replace(/_/g, ' ');
};

export const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Available Project Managers for assignment
  const [pmUsers, setPmUsers] = useState<User[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);

  // New Lead Form State
  const [nextNumber, setNextNumber] = useState('');
  const [formData, setFormData] = useState({
    clientName: '',
    contactNumber: '',
    email: '',
    siteAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    projectType: 'RESIDENTIAL_INTERIOR' as LeadProjectType,
    budgetRange: '25L_50L' as LeadBudgetRange,
    source: 'ARCHITECT_REFERRAL' as LeadSource,
    stage: 'NEW_LEAD' as LeadStage,
    assignedTeam: 'DESIGN_TEAM' as AssignedTeam,
    assignedProjectManagerId: '',
    siteVisitDate: '',
    siteVisitNotes: '',
    clientBudgetDiscussion: '',
  });

  // Convert Modal State (Module 3 Kickoff Gate)
  const [convertForm, setConvertForm] = useState({
    advanceAmount: 250000,
    paymentMethod: 'NEFT_RTGS',
    referenceNo: '',
    advanceNotes: 'Advance payment for design kickoff & booking token',
    projectName: '',
  });
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  // Status transition loader
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [standardToast, setStandardToast] = useState<{
    message: string;
    whatsappStatus?: string;
    entity: string;
    success: boolean;
  } | null>(null);

  // Edit & Delete Lead State
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    contactNumber: '',
    email: '',
    siteAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    projectType: 'RESIDENTIAL_INTERIOR' as LeadProjectType,
    budgetRange: '25L_50L' as LeadBudgetRange,
    source: 'ARCHITECT_REFERRAL' as LeadSource,
    stage: 'NEW_LEAD' as LeadStage,
    assignedTeam: 'DESIGN_TEAM' as AssignedTeam,
    assignedProjectManagerId: '',
    siteVisitDate: '',
    siteVisitNotes: '',
    clientBudgetDiscussion: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.getLeads();
      if (res.success) {
        setLeads(res.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers();
      if (res.success && Array.isArray(res.users)) {
        const pms = res.users.filter(
          (u: User) => u.role === 'PROJECT_MANAGER' || u.role === 'OWNER' || u.role === 'SITE_ENGINEER'
        );
        setPmUsers(pms);
      }
    } catch (err) {
      console.error('Failed to load PM users:', err);
    }
  };

  const loadNextNumber = async () => {
    try {
      const res = await api.getNextLeadNumber();
      if (res.success) {
        setNextNumber(res.nextLeadNumber);
      }
    } catch (err) {
      console.error('Failed to fetch next lead number:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchUsers();
    loadNextNumber();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createLead({
        ...formData,
        leadNumber: nextNumber,
      });
      if (res.success) {
        setShowCreateModal(false);
        setFormData({
          clientName: '',
          contactNumber: '',
          email: '',
          siteAddress: '',
          city: 'Bengaluru',
          state: 'Karnataka',
          projectType: 'RESIDENTIAL_INTERIOR',
          budgetRange: '25L_50L',
          source: 'WEBSITE',
          stage: 'NEW_LEAD',
          assignedTeam: 'DESIGN_TEAM',
          assignedProjectManagerId: '',
          siteVisitDate: '',
          siteVisitNotes: '',
          clientBudgetDiscussion: '',
        });
        await fetchLeads();
        await loadNextNumber();
      }
    } catch (err: any) {
      alert(`Error creating lead: ${err.message}`);
    }
  };

  const handleStartEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditFormData({
      clientName: lead.clientName || '',
      contactNumber: lead.contactNumber || '',
      email: lead.email || '',
      siteAddress: lead.siteAddress || '',
      city: lead.city || 'Bengaluru',
      state: lead.state || 'Karnataka',
      projectType: lead.projectType || 'RESIDENTIAL_INTERIOR',
      budgetRange: lead.budgetRange || '25L_50L',
      source: lead.source || 'WEBSITE',
      stage: lead.stage || 'NEW_LEAD',
      assignedTeam: lead.assignedTeam || 'DESIGN_TEAM',
      assignedProjectManagerId: lead.assignedProjectManagerId || '',
      siteVisitDate: lead.siteVisitDate ? new Date(lead.siteVisitDate).toISOString().split('T')[0] : '',
      siteVisitNotes: lead.siteVisitNotes || '',
      clientBudgetDiscussion: lead.clientBudgetDiscussion || '',
    });
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setSavingEdit(true);
    try {
      const res = await api.updateLead(editingLead.id, editFormData);
      if (res.success) {
        if (selectedLeadForDetail?.id === editingLead.id) {
          setSelectedLeadForDetail({
            ...selectedLeadForDetail,
            ...editFormData,
            assignedProjectManager: pmUsers.find((u) => u.id === editFormData.assignedProjectManagerId) || selectedLeadForDetail.assignedProjectManager,
          });
        }
        setEditingLead(null);
        await fetchLeads();
        alert(`Lead ${editingLead.leadNumber} updated successfully!`);
      } else {
        alert(res.message || 'Failed to update lead');
      }
    } catch (err: any) {
      alert(`Error updating lead: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete lead ${lead.leadNumber} for "${lead.clientName}"?\n\nThis will remove this lead entry and uncouple any linked quotations.`
    );
    if (!confirmed) return;

    try {
      setDeletingLeadId(lead.id);
      const res = await api.deleteLead(lead.id);
      if (res.success) {
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        if (selectedLeadForDetail?.id === lead.id) {
          setSelectedLeadForDetail(null);
        }
        alert(`Lead ${lead.leadNumber} deleted successfully.`);
      } else {
        alert(res.message || 'Failed to delete lead');
      }
    } catch (err: any) {
      alert(`Error deleting lead: ${err.message}`);
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleStageChange = async (lead: Lead, newStage: LeadStage) => {
    if (newStage === 'LEAD_WON') {
      // Trigger Module 3 Conversion Gate Prompt
      setLeadToConvert(lead);
      const estimatedAmt =
        lead.budgetRange === '10L_25L' ? 100000 :
        lead.budgetRange === '25L_50L' ? 250000 :
        lead.budgetRange === '50L_1CR' ? 500000 : 1000000;
      setConvertForm({
        advanceAmount: estimatedAmt,
        paymentMethod: 'NEFT_RTGS',
        referenceNo: `UTR-${Math.floor(100000 + Math.random() * 900000)}`,
        advanceNotes: `Booking advance token for ${lead.clientName}`,
        projectName: `${lead.clientName} - ${PROJECT_TYPE_LABELS[lead.projectType]}`,
      });
      setConvertError('');
      setShowConvertModal(true);
      return;
    }

    setTransitioningId(lead.id);
    try {
      const res = await api.updateLifecycleStatus({
        entityType: 'Lead',
        entityId: lead.id,
        toStatus: newStage,
      });
      if (res.success) {
        setStandardToast({
          message: res.message,
          whatsappStatus: res.whatsappStatus,
          entity: res.entity || 'Lead',
          success: true,
        });
        setTimeout(() => setStandardToast(null), 5000);
      }
      await fetchLeads();
    } catch (err: any) {
      setStandardToast({
        message: err.message || `Failed to update stage`,
        entity: 'Lead',
        success: false,
      });
    } finally {
      setTransitioningId(null);
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadToConvert) return;
    setConverting(true);
    setConvertError('');
    try {
      const res = await api.convertLeadToProject(leadToConvert.id, {
        advanceAmount: Number(convertForm.advanceAmount),
        paymentMethod: convertForm.paymentMethod,
        referenceNo: convertForm.referenceNo,
        advanceNotes: convertForm.advanceNotes,
        projectName: convertForm.projectName,
      });

      if (res.success) {
        setShowConvertModal(false);
        setLeadToConvert(null);
        await fetchLeads();
        alert(
          res.kickoffLocked
            ? `Lead Won! Project ${res.project.code} created.\n⚠️ Execution Kickoff Gate Active: The Finance Department must confirm the advance payment before site tasks or schedules can be created.`
            : `Lead Won! Project ${res.project.code} created and Advance Payment verified by Finance.\n✓ Execution Kickoff is fully unlocked!`
        );
      }
    } catch (err: any) {
      setConvertError(err.message || 'Failed to convert lead to project.');
    } finally {
      setConverting(false);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactNumber.includes(searchQuery) ||
      lead.leadNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.siteAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTeam = selectedTeam === 'ALL' || lead.assignedTeam === selectedTeam;
    const matchesType = selectedType === 'ALL' || lead.projectType === selectedType;

    return matchesSearch && matchesTeam && matchesType;
  });

  // Calculate high-level pipeline stats
  const totalLeadsCount = leads.length;
  const activeLeadsCount = leads.filter((l) => l.stage !== 'LEAD_WON' && l.stage !== 'LEAD_LOST').length;
  const wonLeadsCount = leads.filter((l) => l.stage === 'LEAD_WON').length;
  const boqSharedCount = leads.filter((l) => l.stage === 'BOQ_QUOTATION_SHARED').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Construction & Interior Lead Tracking Pipeline
            </h1>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
              Module 1 & 3
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end sales lifecycle: lead capture, site measurement, concept discussion, quotation dispatch, and won conversion gates.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* New Lead Button */}
          <button
            onClick={() => {
              loadNextNumber();
              setShowCreateModal(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Capture New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Pipeline</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{activeLeadsCount} Leads</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Across 6 design stages</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">BOQ Proposals Shared</p>
            <p className="text-xl font-extrabold text-cyan-700 mt-0.5">{boqSharedCount} Clients</p>
            <p className="text-[10px] text-cyan-600 mt-0.5">Quotations awaiting sign-off</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Leads Won & Converted</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{wonLeadsCount} Won</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Contract advances locked</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Tracked Inquiries</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalLeadsCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Residential & Commercial</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Standardized Toast Banner */}
      {standardToast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-sm animate-in fade-in ${
            standardToast.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{standardToast.success ? '✅' : '⚠️'}</span>
            <span>{standardToast.message}</span>
            {standardToast.whatsappStatus && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                  standardToast.whatsappStatus === 'Dispatched'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                WhatsApp: {standardToast.whatsappStatus}
              </span>
            )}
          </div>
          <button
            onClick={() => setStandardToast(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex-1 w-full sm:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search leads by client name, mobile, lead #, site address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Teams</option>
            <option value="DESIGN_TEAM">Design Team</option>
            <option value="EXECUTION_TEAM">Execution Team</option>
            <option value="SALES_TEAM">Sales Team</option>
          </select>

          {/* Project Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Project Types</option>
            <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
            <option value="COMMERCIAL_FITOUT">Commercial Fit-out</option>
            <option value="FULL_VILLA_CONSTRUCTION">Full Villa Construction</option>
            <option value="RENOVATION">Renovation</option>
          </select>
        </div>
      </div>

      {/* Main Content: Kanban or List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading Construction & Interior Pipeline...</p>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start space-x-4 min-w-[2600px]">
            {STAGES.map((col) => {
              const colLeads = filteredLeads.filter((l) => l.stage === col.key);
              return (
                <div key={col.key} className="w-[320px] shrink-0 bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex flex-col max-h-[780px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.bg} border ${col.border}`}></span>
                      <h3 className="font-bold text-xs text-slate-800">{col.label}</h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar flex-1">
                    {colLeads.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs italic bg-white/60 rounded-xl border border-dashed border-slate-200">
                        No leads in {col.label}
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5 group relative"
                        >
                          {/* Card Top: Lead Number & Project Type */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                              {lead.leadNumber}
                            </span>
                            <span
                              className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[170px]"
                              title={formatProjectType(lead.projectType)}
                            >
                              {formatProjectType(lead.projectType)}
                            </span>
                          </div>

                          {/* Client Name & Contact */}
                          <div className="space-y-1">
                            <h4
                              onClick={() => setSelectedLeadForDetail(lead)}
                              className="font-bold text-slate-900 text-xs hover:text-amber-600 cursor-pointer flex items-center justify-between gap-1"
                            >
                              <span className="truncate">{lead.clientName}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
                            </h4>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                              <span className="flex items-center font-medium">
                                <Phone className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                {lead.contactNumber}
                              </span>
                            </div>
                            <p
                              className="text-[11px] text-slate-500 flex items-center truncate"
                              title={lead.siteAddress}
                            >
                              <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                              <span className="truncate">{lead.siteAddress}</span>
                            </p>
                          </div>

                          {/* Budget & Team Assignment */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 whitespace-nowrap">
                              {formatBudget(lead.budgetRange)}
                            </span>
                            <span
                              className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[140px]"
                              title={lead.assignedTeam ? lead.assignedTeam.replace(/_/g, ' ') : 'Unassigned'}
                            >
                              👥 {lead.assignedTeam ? lead.assignedTeam.replace(/_/g, ' ') : 'Unassigned'}
                            </span>
                          </div>

                          {/* Assigned Project Manager badge (Uniform height line across all cards) */}
                          <div className="text-[10px] flex items-center space-x-1.5 min-h-[18px]">
                            <Briefcase className={`w-3 h-3 shrink-0 ${lead.assignedProjectManager ? 'text-indigo-500' : 'text-slate-300'}`} />
                            <span className={`truncate ${lead.assignedProjectManager ? 'font-semibold text-slate-700' : 'text-slate-400 italic'}`}>
                              {lead.assignedProjectManager ? `PM: ${lead.assignedProjectManager.name}` : 'PM: Not assigned'}
                            </span>
                          </div>

                          {/* Confidential Access Restriction Notice */}
                          <div className="flex items-center justify-between text-[10px] min-h-[16px]">
                            {lead.canViewConfidential ? (
                              <span className="text-emerald-700 flex items-center font-semibold">
                                <Unlock className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                                Notes Unlocked (Admin/PM)
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center italic">
                                <Lock className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                Notes Restricted (Admin/PM Only)
                              </span>
                            )}
                          </div>

                          {/* Quick Actions Footer - View, Edit, Quote, Delete & Stage */}
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            {/* Stage Transition Selector */}
                            <div>
                              <select
                                value={lead.stage}
                                onChange={(e) => handleStageChange(lead, e.target.value as LeadStage)}
                                disabled={transitioningId === lead.id}
                                className="w-full h-7 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2 border border-slate-200 focus:ring-1 focus:ring-amber-500 cursor-pointer truncate shadow-2xs"
                              >
                                {STAGES.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    ➔ {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* View, Edit, Quote, Delete Buttons */}
                            <div className="flex items-center justify-between gap-1 text-xs">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setSelectedLeadForDetail(lead)}
                                className="h-7 px-2 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center space-x-1"
                                title="View Lead Profile"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>View</span>
                              </button>

                              {/* Edit Lead */}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(lead)}
                                className="h-7 px-2 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center space-x-1"
                                title="Edit Lead Information"
                              >
                                <Edit className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>

                              {/* Client Quotation Action */}
                              <button
                                type="button"
                                onClick={() => navigate(`/quotations?leadId=${lead.id}&clientName=${encodeURIComponent(lead.clientName)}`)}
                                className="h-7 px-2 text-[11px] font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition flex items-center space-x-1"
                                title="Create or Edit Client Quotation"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Quote ({lead.quotations?.length || 0})</span>
                              </button>

                              {/* Delete Lead */}
                              <button
                                type="button"
                                onClick={() => handleDeleteLead(lead)}
                                disabled={deletingLeadId === lead.id}
                                className="h-7 p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition flex items-center justify-center shrink-0 disabled:opacity-50"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABULAR LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Lead #</th>
                  <th className="py-3 px-4">Client Name & Address</th>
                  <th className="py-3 px-4">Project Type</th>
                  <th className="py-3 px-4">Budget Range</th>
                  <th className="py-3 px-4">Assigned Team / PM</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Confidential Notes</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-700">
                      {lead.leadNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {SOURCE_LABELS[lead.source]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setSelectedLeadForDetail(lead)}
                        className="font-bold text-slate-900 hover:text-amber-600 cursor-pointer"
                      >
                        {lead.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span>{lead.contactNumber}</span>
                        <span>•</span>
                        <span className="truncate max-w-xs">{lead.siteAddress}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {PROJECT_TYPE_LABELS[lead.projectType]}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {BUDGET_RANGE_LABELS[lead.budgetRange]}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 text-[11px]">
                        {lead.assignedTeam ? lead.assignedTeam.replace('_', ' ') : 'Unassigned'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        PM: {lead.assignedProjectManager?.name || 'Not assigned'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={lead.stage}
                        onChange={(e) => handleStageChange(lead, e.target.value as LeadStage)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                          lead.stage === 'LEAD_WON' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          lead.stage === 'LEAD_LOST' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                          lead.stage === 'BOQ_QUOTATION_SHARED' ? 'bg-cyan-50 text-cyan-700 border-cyan-300' :
                          'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {lead.canViewConfidential ? (
                        <div className="max-w-xs">
                          <p className="text-[11px] text-slate-800 line-clamp-1 italic">
                            "{lead.siteVisitNotes || 'No site visit notes entered'}"
                          </p>
                          <span className="text-[9px] text-emerald-600 font-bold flex items-center">
                            <Unlock className="w-2.5 h-2.5 mr-0.5" /> Confidential Notes Unlocked
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic flex items-center">
                          <Lock className="w-3 h-3 mr-1 text-slate-400" />
                          Restricted to Admin & PM
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedLeadForDetail(lead)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(lead)}
                          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Lead"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/quotations?leadId=${lead.id}&clientName=${encodeURIComponent(lead.clientName)}`)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          title="Create / Edit Client Quotation"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead)}
                          disabled={deletingLeadId === lead.id}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL 1: Capture Lead Form */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Module 1: Capture New Construction / Interior Lead</h3>
                <p className="text-xs text-slate-500">Auto-numbering {nextNumber} • Team & Staff Assignment</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              {/* Row 1: Client Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Arvind Varma"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98451 23456"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Email & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Source *</label>
                  <DynamicSelect
                    category="LeadSource"
                    value={formData.source}
                    onChange={(val) => setFormData({ ...formData, source: val as any })}
                    fallbackOptions={LEAD_SOURCE_FALLBACK_OPTIONS}
                    className="!bg-white !border-slate-300 !text-slate-900 !py-2 !rounded-lg !text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Row 3: Site Address & City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Site Address / Property Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Villa 42, Palm Meadows, Whitefield"
                    value={formData.siteAddress}
                    onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Project Type & Budget Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Project Type *</label>
                  <DynamicSelect
                    category="ServiceType"
                    value={formData.projectType}
                    onChange={(val) => setFormData({ ...formData, projectType: val as any })}
                    className="!bg-white !border-slate-300 !text-slate-900 !py-2 !rounded-lg !text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client Budget Range *</label>
                  <select
                    value={formData.budgetRange}
                    onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value as LeadBudgetRange })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-emerald-700"
                  >
                    {Object.entries(BUDGET_RANGE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: Team & Staff Assignment (Requirement 3) */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Team & Project Manager Assignment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Assigned Team *</label>
                    <select
                      value={formData.assignedTeam}
                      onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value as AssignedTeam })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="DESIGN_TEAM">Design Team</option>
                      <option value="EXECUTION_TEAM">Execution Team</option>
                      <option value="SALES_TEAM">Sales Team</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Assigned Project Manager / Lead</label>
                    <select
                      value={formData.assignedProjectManagerId}
                      onChange={(e) => setFormData({ ...formData, assignedProjectManagerId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Select Project Manager --</option>
                      {pmUsers.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name} ({pm.designation || pm.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 6: Confidential Notes & Budget Discussion (Restricted Access) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Confidential Site Visit & Budget Notes</span>
                  </div>
                  <span className="text-[10px] text-slate-500 italic">
                    Restricted: Only Admin/Owner & Assigned PM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Site Visit Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.siteVisitDate}
                      onChange={(e) => setFormData({ ...formData, siteVisitDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Initial Pipeline Stage</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value as LeadStage })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Site Visit Notes & Measurements</label>
                  <textarea
                    rows={2}
                    placeholder="Enter confidential site notes, client design inclinations, ceiling heights, civil condition..."
                    value={formData.siteVisitNotes}
                    onChange={(e) => setFormData({ ...formData, siteVisitNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client Budget Discussion & Negotiation Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Agreed price ceilings, discount flexibility, material grade discussions..."
                    value={formData.clientBudgetDiscussion}
                    onChange={(e) => setFormData({ ...formData, clientBudgetDiscussion: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm transition"
                >
                  Save Lead & Open Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Lead Form */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {editingLead.leadNumber}
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full uppercase">
                    Edit Mode
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  Edit Lead: {editingLead.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="space-y-4 text-xs">
              {/* Row 1: Client Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.clientName}
                    onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Number (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.contactNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Email & Site Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City & State</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      placeholder="City"
                    />
                    <input
                      type="text"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      placeholder="State"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Site Address & Location *</label>
                <input
                  type="text"
                  required
                  value={editFormData.siteAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, siteAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Row 3: Project Type, Budget & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Project Type</label>
                  <select
                    value={editFormData.projectType}
                    onChange={(e) => setEditFormData({ ...editFormData, projectType: e.target.value as LeadProjectType })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
                    <option value="COMMERCIAL_FITOUT">Commercial Fit-out</option>
                    <option value="FULL_VILLA_CONSTRUCTION">Full Villa Construction</option>
                    <option value="RENOVATION">Renovation & Remodel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estimated Budget Range</label>
                  <select
                    value={editFormData.budgetRange}
                    onChange={(e) => setEditFormData({ ...editFormData, budgetRange: e.target.value as LeadBudgetRange })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="10L_25L">₹10L - ₹25L</option>
                    <option value="25L_50L">₹25L - ₹50L</option>
                    <option value="50L_1CR">₹50L - ₹1 Crore</option>
                    <option value="1CR_2.5CR">₹1 Crore - ₹2.5 Crores</option>
                    <option value="2.5CR_PLUS">₹2.5 Crores+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Source</label>
                  <DynamicSelect
                    category="LeadSource"
                    value={editFormData.source}
                    onChange={(val) => setEditFormData({ ...editFormData, source: val as LeadSource })}
                    fallbackOptions={LEAD_SOURCE_FALLBACK_OPTIONS}
                    className="!bg-white !border-slate-300 !text-slate-900 !py-2 !rounded-lg !text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Row 4: Stage & Team Assignment */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Stage, Team & Project Manager Assignment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Pipeline Stage</label>
                    <select
                      value={editFormData.stage}
                      onChange={(e) => setEditFormData({ ...editFormData, stage: e.target.value as LeadStage })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Assigned Team</label>
                    <select
                      value={editFormData.assignedTeam}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedTeam: e.target.value as AssignedTeam })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="DESIGN_TEAM">Design Team</option>
                      <option value="EXECUTION_TEAM">Execution Team</option>
                      <option value="SALES_TEAM">Sales Team</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Assigned PM</label>
                    <select
                      value={editFormData.assignedProjectManagerId}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedProjectManagerId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Select Project Manager --</option>
                      {pmUsers.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name} ({pm.designation || pm.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 5: Confidential Notes */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Confidential Site Visit & Budget Notes</span>
                  </div>
                  <span className="text-[10px] text-slate-500 italic">
                    Restricted: Only Admin/Owner & Assigned PM
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Site Visit Date</label>
                  <input
                    type="date"
                    value={editFormData.siteVisitDate}
                    onChange={(e) => setEditFormData({ ...editFormData, siteVisitDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Site Visit Notes & Measurements</label>
                  <textarea
                    rows={2}
                    value={editFormData.siteVisitNotes}
                    onChange={(e) => setEditFormData({ ...editFormData, siteVisitNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client Budget Discussion Notes</label>
                  <textarea
                    rows={2}
                    value={editFormData.clientBudgetDiscussion}
                    onChange={(e) => setEditFormData({ ...editFormData, clientBudgetDiscussion: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingEdit ? 'Updating Lead...' : `Update Lead (${editingLead.leadNumber})`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Lead Details & Confidential Notes View */}
      {selectedLeadForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {selectedLeadForDetail.leadNumber}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">{selectedLeadForDetail.clientName}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const l = selectedLeadForDetail;
                    setSelectedLeadForDetail(null);
                    handleStartEdit(l);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg flex items-center space-x-1 transition"
                  title="Edit Lead"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLead(selectedLeadForDetail)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-lg flex items-center space-x-1 transition"
                  title="Delete Lead"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedLeadForDetail(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Contact</span>
                  <span className="font-bold text-slate-800">{selectedLeadForDetail.contactNumber}</span>
                  {selectedLeadForDetail.email && <span className="block text-[11px] text-slate-500">{selectedLeadForDetail.email}</span>}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Project Type</span>
                  <span className="font-bold text-slate-800">{PROJECT_TYPE_LABELS[selectedLeadForDetail.projectType]}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Budget Range</span>
                  <span className="font-bold text-emerald-700">{BUDGET_RANGE_LABELS[selectedLeadForDetail.budgetRange]}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Lead Source</span>
                  <span className="font-medium text-slate-700">{formatSource(selectedLeadForDetail.source)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Assigned Team</span>
                  <span className="font-medium text-slate-700">{selectedLeadForDetail.assignedTeam?.replace('_', ' ') || 'None'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Project Manager</span>
                  <span className="font-medium text-indigo-700">{selectedLeadForDetail.assignedProjectManager?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase mb-0.5">Site Address</span>
                <p className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedLeadForDetail.siteAddress}, {selectedLeadForDetail.city}, {selectedLeadForDetail.state}
                </p>
              </div>

              {/* Confidential Access Restriction Section (Requirement 3) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {selectedLeadForDetail.canViewConfidential ? (
                      <Unlock className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-bold text-slate-900">
                      Confidential Notes & Client Budget Discussions
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedLeadForDetail.canViewConfidential
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedLeadForDetail.canViewConfidential ? 'Access Granted' : 'Restricted to Admin / Assigned PM'}
                  </span>
                </div>

                {selectedLeadForDetail.canViewConfidential ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">
                        Site Visit Notes & Measurements:
                      </span>
                      <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 leading-relaxed font-sans">
                        {selectedLeadForDetail.siteVisitNotes || 'No site visit notes entered.'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">
                        Client Budget & Negotiation Strategy:
                      </span>
                      <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 leading-relaxed font-sans">
                        {selectedLeadForDetail.clientBudgetDiscussion || 'No client budget discussions logged.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                    <p className="font-bold text-slate-700">🔒 Confidential Information Protected</p>
                    <p className="text-[11px] text-slate-500">
                      Access to site measurement notes and confidential budget discussions is strictly limited to Company Admins, Owners, and the assigned Lead Project Manager.
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Converted Project (If won) */}
              {selectedLeadForDetail.convertedProject && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Converted to Active Project</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                      {selectedLeadForDetail.convertedProject.code}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-semibold">
                    {selectedLeadForDetail.convertedProject.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60">
                    <span>
                      Advance Payment:{' '}
                      <strong>{formatCurrency(selectedLeadForDetail.convertedProject.advancePaymentReceived)}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      selectedLeadForDetail.convertedProject.advancePaymentConfirmed
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}>
                      {selectedLeadForDetail.convertedProject.advancePaymentConfirmed
                        ? '✓ Advance Confirmed (Kickoff Unlocked)'
                        : '⚠️ Pending Finance Confirmation'}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLeadForDetail(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLead(selectedLeadForDetail)}
                    className="px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center space-x-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Lead</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const l = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      handleStartEdit(l);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Lead</span>
                  </button>
                  <button
                    onClick={() => {
                      const l = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      navigate(`/quotations?leadId=${l.id}&clientName=${encodeURIComponent(l.clientName)}`);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Client Quotation</span>
                  </button>
                  {selectedLeadForDetail.stage !== 'LEAD_WON' && (
                    <button
                      onClick={() => {
                        const l = selectedLeadForDetail;
                        setSelectedLeadForDetail(null);
                        handleStageChange(l, 'LEAD_WON');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Convert to Won Project</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MODULE 3 - Lead Won & Project Kickoff Gate */}
      {showConvertModal && leadToConvert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 uppercase">
                  Module 3: Project Kickoff Gate
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  Log Initial Advance Payment & Convert Lead
                </h3>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {convertError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{convertError}</span>
              </div>
            )}

            {/* Kickoff Gate Explanation Banner */}
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Strict Construction Kickoff Gate:</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                When marked as Won, execution schedules and site task assignments will remain <strong>LOCKED</strong> until the Finance Department confirms receipt of this initial advance payment entry.
              </p>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={convertForm.projectName}
                  onChange={(e) => setConvertForm({ ...convertForm, projectName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Initial Advance Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={convertForm.advanceAmount}
                    onChange={(e) => setConvertForm({ ...convertForm, advanceAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-emerald-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Payment Method *</label>
                  <select
                    value={convertForm.paymentMethod}
                    onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="NEFT_RTGS">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="CHEQUE">Account Payee Cheque</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash Collection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Bank Reference Number / Cheque / UTR # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC-RTGS-9823412 or Cheque #004521"
                  value={convertForm.referenceNo}
                  onChange={(e) => setConvertForm({ ...convertForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Advance Payment Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={convertForm.advanceNotes}
                  onChange={(e) => setConvertForm({ ...convertForm, advanceNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Role Indicator Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                {user?.role === 'OWNER' || user?.role === 'ACCOUNTS_MANAGER' ? (
                  <p className="text-emerald-700 font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Logged as Finance Officer ({user?.name}): Advance will be confirmed immediately and site task scheduling will be unlocked.</span>
                  </p>
                ) : (
                  <p className="text-amber-700 font-semibold flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Logged as {user?.role || 'Sales'}: Will be routed to Accounts Department for verification before site tasks can be scheduled.</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                >
                  {converting ? (
                    <span>Processing Kickoff...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Won & Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
