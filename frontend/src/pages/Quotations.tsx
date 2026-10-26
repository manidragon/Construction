import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Quotation,
  QuotationItem,
  MilestoneTerm,
  Lead,
  LeadProjectType,
} from '../types';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building,
  Layers,
  Sparkles,
  Calculator,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  ShieldAlert,
  Percent,
  Receipt,
  FileCheck,
  Search,
  Filter,
  ChevronDown,
  X,
  Check,
  PlusCircle,
  Eye,
  Edit,
  Printer,
} from 'lucide-react';

const COMMON_AREAS = [
  'Living Room',
  'Master Bedroom',
  'Guest Bedroom',
  'Kids Bedroom',
  'Kitchen Modular Units',
  'Dining & Crockery Unit',
  'Foyer / Entryway',
  'Civil Work',
  'Electrical & Automation',
  'Plumbing & Sanitaryware',
  'False Ceiling & Lighting',
  'Painting & Wall Treatment',
  'Flooring & Tiling',
  'Balcony / Deck',
  'Home Automation & Security',
  'HVAC & Air Conditioning',
  'Structural Steel & Fabrication',
  'Roofing & Waterproofing',
  'Landscaping & Exterior',
  'Pooja Room & Sacred Space',
];

const UNIT_OPTIONS = ['SQFT', 'RFT', 'NOS', 'LS', 'CUMT', 'SET', 'BAG'];

const PROJECT_TYPE_OPTIONS: { key: LeadProjectType; label: string }[] = [
  { key: 'RESIDENTIAL_INTERIOR', label: 'Residential Interior' },
  { key: 'COMMERCIAL_FITOUT', label: 'Commercial Fit-out' },
  { key: 'FULL_VILLA_CONSTRUCTION', label: 'Full Villa Construction' },
  { key: 'RENOVATION', label: 'Renovation & Remodel' },
];

export const Quotations: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialLeadId = searchParams.get('leadId') || '';
  const initialClientName = searchParams.get('clientName') || '';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: list or editor
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [searchFilter, setSearchFilter] = useState('');

  // Editor Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [leadId, setLeadId] = useState(initialLeadId);
  const [clientName, setClientName] = useState(initialClientName);
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [projectType, setProjectType] = useState<LeadProjectType>('RESIDENTIAL_INTERIOR');
  const [gstMode, setGstMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [penaltyTerms, setPenaltyTerms] = useState('Delayed milestone payments will attract a 2% weekly interest charge');
  const [notes, setNotes] = useState('Includes 10-year warranty on modular BWR plywood carpentry, Hettich hardware, and 2-year complimentary service.');
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Master list of Services / Areas (pop-down options)
  const [serviceAreas, setServiceAreas] = useState<string[]>(COMMON_AREAS);

  // View & Delete Quotation modal state
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [deletingQuotationId, setDeletingQuotationId] = useState<string | null>(null);

  // Add Service Modal state
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [addServiceError, setAddServiceError] = useState<string | null>(null);

  // Items table
  const [items, setItems] = useState<QuotationItem[]>([
    {
      areaRoom: 'Living Room',
      workDescription: 'TV Unit in 19mm Greenply BWR Plywood with Century Laminate & Charcoal Louvers',
      unit: 'SQFT',
      quantity: 85,
      rate: 1850,
      totalAmount: 157250,
    },
    {
      areaRoom: 'Kitchen Modular Units',
      workDescription: 'Base and overhead modular cabinets with Hettich soft-close tandem drawers & acrylic shutters',
      unit: 'RFT',
      quantity: 26,
      rate: 3400,
      totalAmount: 88400,
    },
    {
      areaRoom: 'Master Bedroom',
      workDescription: 'Floor-to-ceiling sliding wardrobe in 18mm MR Plywood with PU paint finish and fluted glass',
      unit: 'SQFT',
      quantity: 75,
      rate: 2200,
      totalAmount: 165000,
    },
  ]);

  // Milestone terms
  const [milestones, setMilestones] = useState<MilestoneTerm[]>([
    { name: '50% Advance on Booking & Mobilization', percentage: 50, amount: 0 },
    { name: '40% on Framework & Material Delivery at Site', percentage: 40, amount: 0 },
    { name: '10% on Final Handover & Snag Rectification', percentage: 10, amount: 0 },
  ]);

  // Dispatch modal
  const [dispatchQuotationData, setDispatchQuotationData] = useState<Quotation | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState<'WHATSAPP' | 'EMAIL' | 'BOTH'>('WHATSAPP');
  const [dispatchSuccess, setDispatchSuccess] = useState('');

  // Milestone Invoice modal (Module 4)
  const [invoiceModalQuotation, setInvoiceModalQuotation] = useState<Quotation | null>(null);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(0);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceSuccess, setInvoiceSuccess] = useState('');

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.getQuotations();
      if (res.success) {
        setQuotations(res.quotations || []);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await api.getLeads();
      if (res.success) {
        setLeads(res.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  };

  const loadNextNumber = async () => {
    try {
      const res = await api.getNextQuotationNumber();
      if (res.success) {
        setQuotationNumber(res.nextQuotationNumber);
      }
    } catch (err) {
      console.error('Failed to load next quotation number:', err);
    }
  };

  const loadServiceAreas = async () => {
    try {
      const res = await api.getDropdowns('AreaRoom');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const labels = res.data.map((d: any) => d.label || d.value);
        setServiceAreas((prev) => Array.from(new Set([...prev, ...labels])));
      }
    } catch (err) {
      console.warn('Using default service areas:', err);
    }
  };

  useEffect(() => {
    loadQuotations();
    loadLeads();
    loadNextNumber();
    loadServiceAreas();

    // If query parameter opened with leadId, check if quotation already exists to edit it
    if (initialLeadId) {
      api.getQuotations(`leadId=${initialLeadId}`).then((res) => {
        if (res.success && Array.isArray(res.quotations) && res.quotations.length > 0) {
          // Existing quotation found for this lead - load in edit mode directly!
          handleStartEdit(res.quotations[0]);
        } else {
          setEditingId(null);
          setLeadId(initialLeadId);
          if (initialClientName) setClientName(initialClientName);
          setView('editor');
        }
      }).catch(() => {
        setEditingId(null);
        setLeadId(initialLeadId);
        if (initialClientName) setClientName(initialClientName);
        setView('editor');
      });
    }
  }, [initialLeadId, initialClientName]);

  const handleStartEdit = (quot: Quotation) => {
    setEditingId(quot.id);
    setQuotationNumber(quot.quotationNumber);
    setLeadId(quot.leadId || '');
    setClientName(quot.clientName);
    setClientPhone(quot.clientPhone);
    setClientEmail(quot.clientEmail || '');
    setSiteAddress(quot.siteAddress);
    setProjectType(quot.projectType);
    setGstMode(quot.gstMode);
    setPenaltyTerms(quot.penaltyTerms || '');
    setNotes(quot.notes || '');
    setValidUntil(quot.validUntil ? new Date(quot.validUntil).toISOString().split('T')[0] : '');
    setItems(
      quot.items && quot.items.length > 0
        ? quot.items.map((it) => ({
            id: it.id,
            areaRoom: it.areaRoom,
            workDescription: it.workDescription,
            unit: it.unit,
            quantity: it.quantity,
            rate: it.rate,
            totalAmount: it.totalAmount,
          }))
        : []
    );
    try {
      setMilestones(JSON.parse(quot.milestoneTerms || '[]'));
    } catch (e) {}
    setView('editor');
  };

  const handleDeleteQuotation = async (quot: Quotation) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete quotation ${quot.quotationNumber} for "${quot.clientName}"?\n\nThis will remove this quotation and its itemized line items.`
    );
    if (!confirmed) return;

    try {
      setDeletingQuotationId(quot.id);
      const res = await api.deleteQuotation(quot.id);
      if (res.success) {
        setQuotations((prev) => prev.filter((q) => q.id !== quot.id));
        if (editingId === quot.id) {
          setEditingId(null);
          setView('list');
        }
        await loadNextNumber();
        alert(`Quotation ${quot.quotationNumber} deleted successfully.`);
      } else {
        alert(res.message || 'Failed to delete quotation');
      }
    } catch (err: any) {
      alert(`Error deleting quotation: ${err.message}`);
    } finally {
      setDeletingQuotationId(null);
    }
  };

  const handleCreateNewQuotation = async () => {
    setEditingId(null);
    setLeadId('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setSiteAddress('');
    setProjectType('RESIDENTIAL_INTERIOR');
    setGstMode('EXCLUSIVE');
    setPenaltyTerms('Delayed milestone payments will attract a 2% weekly interest charge');
    setNotes('Includes 10-year warranty on modular BWR plywood carpentry, Hettich hardware, and 2-year complimentary service.');
    setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setItems([
      {
        areaRoom: 'Living Room',
        workDescription: 'TV Unit in 19mm Greenply BWR Plywood with Century Laminate & Charcoal Louvers',
        unit: 'SQFT',
        quantity: 85,
        rate: 1850,
        totalAmount: 157250,
      },
      {
        areaRoom: 'Kitchen Modular Units',
        workDescription: 'Base and overhead modular cabinets with Hettich soft-close tandem drawers & acrylic shutters',
        unit: 'RFT',
        quantity: 26,
        rate: 3400,
        totalAmount: 88400,
      },
      {
        areaRoom: 'Master Bedroom',
        workDescription: 'Floor-to-ceiling sliding wardrobe in 18mm MR Plywood with PU paint finish and fluted glass',
        unit: 'SQFT',
        quantity: 75,
        rate: 2200,
        totalAmount: 165000,
      },
    ]);
    await loadNextNumber();
    setView('editor');
  };

  const openAddServiceModal = (itemIndex?: number) => {
    setTargetItemIndex(itemIndex !== undefined ? itemIndex : null);
    setNewServiceName('');
    setAddServiceError(null);
    setAddServiceModalOpen(true);
  };

  const handleSaveNewService = async (serviceNameToAdd?: string) => {
    const name = (serviceNameToAdd || newServiceName).trim();
    if (!name) {
      setAddServiceError('Please enter a service or area name');
      return;
    }

    setSavingService(true);
    setAddServiceError(null);

    try {
      // 1. Immediately update master list so it appears in all pop-downs
      setServiceAreas((prev) => (prev.includes(name) ? prev : [...prev, name]));

      // 2. If row index is set, update that row's areaRoom
      if (targetItemIndex !== null && targetItemIndex >= 0 && targetItemIndex < items.length) {
        handleItemChange(targetItemIndex, 'areaRoom', name);
      } else if (targetItemIndex === null) {
        // Triggered from quick bar or header, add as a new row
        handleAddItem(name);
      }

      // 3. Persist to backend database for the tenant
      try {
        await api.createDropdownOption({
          category: 'AreaRoom',
          label: name,
          value: name,
        });
      } catch (e) {
        console.warn('Failed to persist dropdown option to DB, keeping in memory:', e);
      }

      setAddServiceModalOpen(false);
      setNewServiceName('');
      setTargetItemIndex(null);
    } catch (err: any) {
      setAddServiceError(err.message || 'Failed to save service');
    } finally {
      setSavingService(false);
    }
  };

  // When a lead is selected in editor, auto-fill client contact and address
  const handleLeadSelect = (selectedId: string) => {
    setLeadId(selectedId);
    if (!selectedId) return;

    // If an existing quotation exists for this lead and we are not already editing it, switch to editing it
    const existingQuote = quotations.find((q) => q.leadId === selectedId);
    if (existingQuote && (!editingId || editingId !== existingQuote.id)) {
      handleStartEdit(existingQuote);
      return;
    }

    const matched = leads.find((l) => l.id === selectedId);
    if (matched) {
      setClientName(matched.clientName);
      setClientPhone(matched.contactNumber);
      setClientEmail(matched.email || '');
      setSiteAddress(matched.siteAddress);
      setProjectType(matched.projectType);
    }
  };

  // Real-time calculations
  const rawSum = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
  const gstPercent = 18.0;

  let subtotal = 0;
  let gstAmount = 0;
  let totalAmount = 0;

  if (gstMode === 'INCLUSIVE') {
    // Agreed contract value is flat sum of items
    totalAmount = rawSum;
    subtotal = Math.round((totalAmount / (1 + gstPercent / 100)) * 100) / 100;
    gstAmount = Math.round((totalAmount - subtotal) * 100) / 100; // Internal Tax Liability
  } else {
    // Additional (Exclusive) GST +18%
    subtotal = rawSum;
    gstAmount = Math.round((subtotal * (gstPercent / 100)) * 100) / 100;
    totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
  }

  // Auto-calculate milestone rupee amounts
  const updatedMilestones = milestones.map((m) => ({
    ...m,
    amount: Math.round(totalAmount * (m.percentage / 100)),
  }));

  // Items manipulation
  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'rate') {
      const q = Number(field === 'quantity' ? value : updated[index].quantity) || 0;
      const r = Number(field === 'rate' ? value : updated[index].rate) || 0;
      updated[index].totalAmount = q * r;
    }
    setItems(updated);
  };

  const handleAddItem = (area: string = 'Living Room') => {
    setItems([
      ...items,
      {
        areaRoom: area,
        workDescription: '',
        unit: 'SQFT',
        quantity: 1,
        rate: 1000,
        totalAmount: 1000,
      },
    ]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      alert('A quotation must contain at least one item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDuplicateItem = (index: number) => {
    const it = items[index];
    setItems([...items, { ...it, id: undefined }]);
  };

  const handleLoadTemplates = async () => {
    try {
      const res = await api.getBOQTemplates();
      if (res.success && res.templates) {
        setItems(res.templates);
      }
    } catch (err: any) {
      alert(`Failed to load templates: ${err.message}`);
    }
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !siteAddress) {
      alert('Client Name, Phone, and Site Address are required.');
      return;
    }

    try {
      const payload = {
        quotationNumber,
        leadId: leadId || null,
        clientName,
        clientPhone,
        clientEmail,
        siteAddress,
        projectType,
        gstMode,
        penaltyTerms,
        milestoneTerms: updatedMilestones,
        notes,
        validUntil,
        items,
      };

      if (editingId) {
        await api.updateQuotation(editingId, payload);
        alert(`Quotation ${quotationNumber} updated successfully!`);
      } else {
        await api.createQuotation(payload);
        alert(`Quotation ${quotationNumber} created successfully!`);
      }

      await loadQuotations();
      await loadNextNumber();
      setView('list');
      setEditingId(null);
      navigate('/quotations', { replace: true });
    } catch (err: any) {
      alert(`Error saving quotation: ${err.message}`);
    }
  };

  const handleOpenDispatch = (quot: Quotation) => {
    setDispatchQuotationData(quot);
    setDispatchSuccess('');
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchQuotationData) return;
    try {
      const res = await api.dispatchQuotation(dispatchQuotationData.id, {
        channel: dispatchChannel,
      });
      if (res.success) {
        setDispatchSuccess(`Quotation successfully dispatched via ${dispatchChannel}! Lead status shifted to "BOQ / Quotation Shared".`);
        await loadQuotations();
        await loadLeads();
      }
    } catch (err: any) {
      alert(`Dispatch error: ${err.message}`);
    }
  };

  const handleOpenInvoiceModal = (quot: Quotation) => {
    setInvoiceModalQuotation(quot);
    setSelectedMilestoneIndex(0);
    setInvoiceError('');
    setInvoiceSuccess('');
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceModalQuotation) return;
    setGeneratingInvoice(true);
    setInvoiceError('');
    setInvoiceSuccess('');

    try {
      let parsedMilestones: MilestoneTerm[] = [];
      try {
        parsedMilestones = JSON.parse(invoiceModalQuotation.milestoneTerms || '[]');
      } catch (e) {
        parsedMilestones = updatedMilestones;
      }

      const selectedMilestone = parsedMilestones[selectedMilestoneIndex] || {
        name: 'Advance Payment',
        percentage: 50,
      };

      const isFinal = selectedMilestoneIndex === parsedMilestones.length - 1;

      const res = await api.generateMilestoneInvoice(invoiceModalQuotation.id, {
        milestoneIndex: selectedMilestoneIndex,
        milestoneName: selectedMilestone.name,
        percentage: selectedMilestone.percentage,
        isFinalHandover: isFinal,
      });

      if (res.success) {
        setInvoiceSuccess(`Invoice ${res.invoice.invoiceNumber} generated successfully!`);
        await loadQuotations();
      }
    } catch (err: any) {
      setInvoiceError(err.message || 'Failed to generate invoice.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Group items by Area/Room for visual overview
  const itemsByArea = items.reduce((acc: Record<string, QuotationItem[]>, item) => {
    const area = item.areaRoom || 'General Works';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {});

  const filteredQuotations = quotations.filter((q) =>
    q.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    q.quotationNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
    q.siteAddress.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
              <FileText className="w-3 h-3 text-emerald-600" />
              <span>Client-Facing Proposal</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Client Quotations & Commercial Proposals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Formal client estimates with room-wise itemized scope of work, client selling rates, dual GST options (Exclusive/Inclusive), milestone payment schedules, penalty clauses, and direct WhatsApp client dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {view === 'editor' ? (
            <button
              onClick={() => {
                setView('list');
                setEditingId(null);
                navigate('/quotations', { replace: true });
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              ← Back to Quotation List
            </button>
          ) : (
            <button
              onClick={handleCreateNewQuotation}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Client Quotation</span>
            </button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        /* ==================== LIST VIEW ==================== */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search quotations by client, quotation #, site address..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredQuotations.length} Proposals
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">No Client Quotations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Draft formal commercial proposals for clients with room-by-room work scope, payment milestones, and direct WhatsApp dispatch.
              </p>
              <button
                onClick={handleCreateNewQuotation}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm hover:bg-amber-600 transition"
              >
                Create Client Quotation Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuotations.map((quot) => (
                <div
                  key={quot.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Quotation Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {quot.quotationNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        quot.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        quot.status === 'SHARED' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {quot.status}
                      </span>
                    </div>

                    {/* Client & Project Info */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{quot.clientName}</h3>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{quot.clientPhone}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{quot.siteAddress}</span>
                      </p>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Base Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(quot.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center space-x-1">
                          <span>GST Mode:</span>
                          <span className={`text-[9px] font-bold px-1.5 rounded ${
                            quot.gstMode === 'EXCLUSIVE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {quot.gstMode === 'EXCLUSIVE' ? '+18% Exclusive' : '18% Inclusive'}
                          </span>
                        </span>
                        <span className="font-semibold text-slate-700">{formatCurrency(quot.gstAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 font-extrabold text-slate-900">
                        <span>Agreed Grand Total:</span>
                        <span className="text-sm text-emerald-700">{formatCurrency(quot.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Item Count & Penalty Info */}
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>{quot.items?.length || 0} Room/Work Items</span>
                      <span className="text-amber-700 font-medium">2% weekly late fee clause</span>
                    </div>
                  </div>

                  {/* Actions Footer: View, Edit, Dispatch, Invoice, Delete */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => setViewingQuotation(quot)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center space-x-1 text-[11px]"
                      title="View Full Quotation & Print"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>View</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(quot)}
                      className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold rounded-lg transition flex items-center space-x-1 text-[11px]"
                      title="Edit Quotation"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-700" />
                      <span>Edit</span>
                    </button>

                    {/* WhatsApp / Email Dispatch */}
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(quot)}
                      className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center space-x-1 shadow-xs text-[11px]"
                      title="Send via WhatsApp or Email"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>

                    {/* Generate Milestone Invoice */}
                    <button
                      type="button"
                      onClick={() => handleOpenInvoiceModal(quot)}
                      className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center space-x-1 shadow-xs text-[11px]"
                      title="Generate Milestone Invoice"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuotation(quot)}
                      disabled={deletingQuotationId === quot.id}
                      className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition flex items-center justify-center shrink-0 disabled:opacity-50"
                      title="Delete Quotation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ==================== EDITOR VIEW ==================== */
        <form onSubmit={handleSaveQuotation} className="space-y-6 text-xs">
          {/* Active Editing Warning / In-Place Indicator Banner */}
          {editingId && (
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      Editing Quotation: <span className="font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">{quotationNumber}</span>
                    </span>
                    <span className="bg-amber-500/20 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                      In-Place Update Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Modifying this proposal will save changes directly to <strong>{quotationNumber}</strong> without creating duplicate quotations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  setEditingId(null);
                  navigate('/quotations', { replace: true });
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs transition shrink-0"
              >
                ✕ Cancel & Back to List
              </button>
            </div>
          )}

          {/* 1. Header Information Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h2 className="font-bold text-slate-900 text-sm">Quotation Header & Client Scope</h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Quotation #:</span>
                <input
                  type="text"
                  required
                  readOnly={!!editingId}
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  className={`font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs w-36 ${
                    editingId ? 'cursor-not-allowed opacity-85' : ''
                  }`}
                  title={editingId ? 'Quotation number locked during editing' : 'Quotation number'}
                />
              </div>
            </div>

            {/* Link to Lead Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Link to Lead Inquiry (Optional)</label>
                <select
                  value={leadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Standalone Quotation (No Lead Link) --</option>
                  {leads.map((l) => {
                    const stageLabel = l.stage === 'LEAD_WON' ? '✓ Won / Converted' : l.stage.replace(/_/g, ' ');
                    return (
                      <option key={l.id} value={l.id}>
                        {l.leadNumber} - {l.clientName} [{stageLabel}] ({l.siteAddress || l.city})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arvind Varma"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98451 23456"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Client Email</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Project Type</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as LeadProjectType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                >
                  {PROJECT_TYPE_OPTIONS.map((pt) => (
                    <option key={pt.key} value={pt.key}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Site Address & Location *</label>
              <input
                type="text"
                required
                placeholder="e.g. Villa 42, Palm Meadows, Whitefield, Bengaluru"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Client Scope & Selling Rates Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                  <h2 className="font-bold text-slate-900 text-sm">
                    Client Scope of Work & Selling Rates (Room-by-Room Breakdown)
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Itemize client specifications, materials (e.g. 19mm BWR Plywood, Laminate, Brand), units, quantities, and client selling rates.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadTemplates}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 border border-indigo-200 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Interior Specs Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>

            {/* BOQ Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-64">Area / Service</th>
                    <th className="py-2.5 px-3">Work Description / Material Specification</th>
                    <th className="py-2.5 px-3 w-28">Unit</th>
                    <th className="py-2.5 px-3 w-24 text-right">Qty</th>
                    <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                    <th className="py-2.5 px-2 w-16 text-center">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      {/* Area / Service with reliable pop-down + Add Service button */}
                      <td className="py-2 px-3 align-top">
                        <div className="flex items-center space-x-1.5 min-w-[210px]">
                          <div className="relative flex-1">
                            <select
                              value={item.areaRoom}
                              onChange={(e) => {
                                if (e.target.value === '__ADD_NEW__') {
                                  openAddServiceModal(idx);
                                } else {
                                  handleItemChange(idx, 'areaRoom', e.target.value);
                                }
                              }}
                              className="w-full appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-lg px-2.5 py-1.5 pr-7 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none shadow-xs cursor-pointer transition"
                            >
                              {/* If current value is custom, show it */}
                              {item.areaRoom && !serviceAreas.includes(item.areaRoom) && (
                                <option value={item.areaRoom}>{item.areaRoom} (Custom)</option>
                              )}

                              {serviceAreas.map((area) => (
                                <option key={area} value={area}>
                                  {area}
                                </option>
                              ))}

                              <option disabled value="">──────────────</option>
                              <option value="__ADD_NEW__" className="font-bold text-amber-700 bg-amber-50">
                                ➕ + Add New Service / Area...
                              </option>
                            </select>

                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openAddServiceModal(idx)}
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center"
                            title="Add New Service or Scope to Main List"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Work Description / Material Spec */}
                      <td className="py-2 px-3 align-top">
                        <textarea
                          rows={2}
                          value={item.workDescription}
                          onChange={(e) => handleItemChange(idx, 'workDescription', e.target.value)}
                          placeholder="e.g. 19mm BWR Plywood with 1mm Century Laminate, Hettich soft-close hinges, LED cove..."
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-slate-800 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-3 align-top">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-slate-700 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-right font-medium text-slate-800 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-right font-medium text-slate-800 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* Total Amount */}
                      <td className="py-2 px-3 align-top text-right font-bold text-slate-900 pt-3">
                        {formatCurrency(item.totalAmount)}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 align-top text-center pt-2.5">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(idx)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-rose-400 hover:text-rose-600"
                            title="Remove Row"
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

            {/* Quick Add Area & Service Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-500 mr-1">Quick Add Service / Room:</span>
              {serviceAreas.slice(0, 8).map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => handleAddItem(area)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 hover:border-amber-300 rounded border border-slate-200 text-slate-700 transition font-medium"
                >
                  + {area}
                </button>
              ))}
              <button
                type="button"
                onClick={() => openAddServiceModal()}
                className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded shadow-xs transition flex items-center space-x-1"
                title="Add custom service or room to main list"
              >
                <Plus className="w-3 h-3" />
                <span>Add New Service</span>
              </button>
            </div>
          </div>

          {/* 3. Flexible GST Selector Toggle & Financial Calculation (Requirement 3) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h2 className="font-bold text-slate-900 text-sm">Flexible GST Modes & Company Tax Liability</h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Standard CGST + SGST = 18%</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: GST Mode Selector Toggle */}
              <div className="space-y-3">
                <p className="font-semibold text-slate-700">Select Client Contract Tax Mode:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Exclusive GST Option */}
                  <div
                    onClick={() => setGstMode('EXCLUSIVE')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      gstMode === 'EXCLUSIVE'
                        ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-900">Additional (+18% GST)</span>
                        <input
                          type="radio"
                          name="gstMode"
                          checked={gstMode === 'EXCLUSIVE'}
                          onChange={() => setGstMode('EXCLUSIVE')}
                          className="text-blue-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Adds 18% GST on top of agreed subtotal. Tax is paid separately by client over agreed work sum.
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-bold text-blue-700 font-mono">
                      Grand Total = Subtotal + 18%
                    </span>
                  </div>

                  {/* Inclusive GST Option */}
                  <div
                    onClick={() => setGstMode('INCLUSIVE')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      gstMode === 'INCLUSIVE'
                        ? 'bg-purple-50 border-purple-500 shadow-sm ring-2 ring-purple-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-purple-900">Inclusive GST (18%)</span>
                        <input
                          type="radio"
                          name="gstMode"
                          checked={gstMode === 'INCLUSIVE'}
                          onChange={() => setGstMode('INCLUSIVE')}
                          className="text-purple-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Flat agreed package amount. Back-calculates 18% tax internally for statutory accounting.
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-bold text-purple-700 font-mono">
                      Tax = Total - (Total / 1.18)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                  <p className="font-bold">🏢 Internal Tax Liability Tracking:</p>
                  <p className="text-amber-800 mt-0.5">
                    Regardless of whether client sees Inclusive or Exclusive pricing, our company accounts will automatically book ₹<strong>{formatCurrency(gstAmount)}</strong> in GST Tax Liability Payable on the Executive Dashboard.
                  </p>
                </div>
              </div>

              {/* Right Column: Real-time Financial Breakdown Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-slate-600 text-xs">
                  <span>Net Scope Subtotal:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 text-xs">
                  <span>Output GST Tax (18%):</span>
                  <span className="font-bold text-amber-700">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
                  <span>Total Agreed Contract Value:</span>
                  <span className="text-emerald-700 text-base">{formatCurrency(totalAmount)}</span>
                </div>

                {/* Milestone preview badges */}
                <div className="pt-3 border-t border-slate-200 space-y-1.5 text-[11px]">
                  <p className="font-bold text-slate-700">Calculated Milestone Collections:</p>
                  {updatedMilestones.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-600">
                      <span>{m.name}:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(m.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Milestone Payment Terms & Penalty Clauses (Requirement 4) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <h2 className="font-bold text-slate-900 text-sm">
                Milestone Payment Terms & Delay Penalty Clauses
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {milestones.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Milestone {idx + 1}</span>
                    <span className="font-bold text-emerald-700">{m.percentage}%</span>
                  </div>
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[idx].name = e.target.value;
                      setMilestones(updated);
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Payable:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(updatedMilestones[idx].amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Late Payment Penalty Clause (Requirement 4) */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Construction Late Payment Penalty Clause (Default 2% Weekly)
              </label>
              <input
                type="text"
                value={penaltyTerms}
                onChange={(e) => setPenaltyTerms(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium text-slate-800"
              />
            </div>

            {/* Scope & Warranty Notes */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Scope, Warranty & Execution Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Form Submit Footer */}
          <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm mb-12">
            <button
              type="button"
              onClick={() => {
                setView('list');
                setEditingId(null);
                navigate('/quotations', { replace: true });
              }}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20 transition text-xs flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingId ? `Update Quotation (${quotationNumber})` : 'Save Client Quotation'}</span>
            </button>
          </div>
        </form>
      )}

      {/* DISPATCH MODAL (Requirement 5: Save & Send via WhatsApp/Email) */}
      {dispatchQuotationData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full border border-cyan-300 uppercase">
                  Commercial: Client Dispatch
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  Send Client Quotation ({dispatchQuotationData.quotationNumber})
                </h3>
              </div>
              <button
                onClick={() => setDispatchQuotationData(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {dispatchSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Proposal Dispatched Successfully!</span>
                </div>
                <p>{dispatchSuccess}</p>
                <div className="pt-2">
                  <button
                    onClick={() => setDispatchQuotationData(null)}
                    className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Client dispatch target info */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-800">
                    Recipient: {dispatchQuotationData.clientName}
                  </p>
                  <p className="text-slate-600">Mobile: {dispatchQuotationData.clientPhone}</p>
                  {dispatchQuotationData.clientEmail && (
                    <p className="text-slate-600">Email: {dispatchQuotationData.clientEmail}</p>
                  )}
                  <p className="text-slate-600 font-semibold pt-1">
                    Total Value: {formatCurrency(dispatchQuotationData.totalAmount)} (
                    {dispatchQuotationData.gstMode === 'EXCLUSIVE' ? '+18% GST Exclusive' : '18% GST Inclusive'})
                  </p>
                </div>

                {/* Dispatch Channel Selector */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dispatch Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDispatchChannel('WHATSAPP')}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        dispatchChannel === 'WHATSAPP'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchChannel('EMAIL')}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        dispatchChannel === 'EMAIL'
                          ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span>Email PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchChannel('BOTH')}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                        dispatchChannel === 'BOTH'
                          ? 'bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-500/20'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Send className="w-4 h-4 text-purple-600" />
                      <span>Both Channels</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Message Preview */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Client Message Preview</label>
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 font-sans text-slate-800 leading-relaxed text-[11px] whitespace-pre-line">
                    {`*Apex Buildtech Quotation: ${dispatchQuotationData.quotationNumber}*\n` +
                      `Dear ${dispatchQuotationData.clientName},\n` +
                      `Please find attached our itemized commercial proposal for your ${dispatchQuotationData.projectType.replace(/_/g, ' ')} project at ${dispatchQuotationData.siteAddress}.\n\n` +
                      `*Total Agreed Value:* ${formatCurrency(dispatchQuotationData.totalAmount)} (${dispatchQuotationData.gstMode === 'EXCLUSIVE' ? '+18% GST Exclusive' : '18% GST Inclusive'})\n` +
                      `*Payment Milestones:* 50% Advance, 40% Material Delivery, 10% Handover.\n` +
                      `*Late Payment Terms:* ${dispatchQuotationData.penaltyTerms || '2% weekly interest'}\n\n` +
                      `View detailed quotation here: https://apexbuildtech.com/q/${dispatchQuotationData.quotationNumber}`}
                  </div>
                </div>

                {/* Automated Pipeline Transition Notice */}
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-cyan-900 text-[11px]">
                  <strong>Pipeline Sync Notice:</strong> Sending will automatically advance the linked lead stage to <strong>"Quotation Shared"</strong> in the sales pipeline!
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDispatchQuotationData(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDispatch}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send & Advance Lead Stage</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVOICE GENERATION MODAL (Milestone Invoicing & Strict Handover Gate) */}
      {invoiceModalQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300 uppercase">
                  Milestone Invoicing
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  Generate Milestone Invoice from Quotation
                </h3>
              </div>
              <button
                onClick={() => setInvoiceModalQuotation(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {invoiceError && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm text-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Module 4 Strict Handover Gate Triggered!</span>
                </div>
                <p className="leading-relaxed">{invoiceError}</p>
              </div>
            )}

            {invoiceSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{invoiceSuccess}</span>
                </div>
                <p>The sequential invoice has been created and linked to the project and accounts ledger.</p>
                <div className="pt-2 flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setInvoiceModalQuotation(null);
                      navigate('/billing');
                    }}
                    className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs"
                  >
                    View in Client Billing & RA Bills
                  </button>
                  <button
                    onClick={() => setInvoiceModalQuotation(null)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                  <p>
                    <strong>Quotation #:</strong> {invoiceModalQuotation.quotationNumber}
                  </p>
                  <p>
                    <strong>Client:</strong> {invoiceModalQuotation.clientName}
                  </p>
                  <p>
                    <strong>Total Proposal Value:</strong> {formatCurrency(invoiceModalQuotation.totalAmount)}
                  </p>
                </div>

                {/* Milestone Selector */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Select Milestone Stage to Bill:
                  </label>
                  <div className="space-y-2">
                    {[
                      { name: '50% Advance on Booking & Mobilization', pct: 50, isFinal: false },
                      { name: '40% on Framework & Material Delivery at Site', pct: 40, isFinal: false },
                      { name: '10% on Final Handover & Snag Rectification', pct: 10, isFinal: true },
                    ].map((m, idx) => {
                      const amount = Math.round(invoiceModalQuotation.totalAmount * (m.pct / 100));
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedMilestoneIndex(idx)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            selectedMilestoneIndex === idx
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="radio"
                              name="milestoneSelect"
                              checked={selectedMilestoneIndex === idx}
                              onChange={() => setSelectedMilestoneIndex(idx)}
                              className="text-blue-600"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{m.name}</p>
                              {m.isFinal && (
                                <span className="text-[10px] text-amber-700 font-semibold block">
                                  ⚠️ Final Handover Gate: Blocked if previous dues remain
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>Compliance Validation:</span>
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Auto-generates matching sequential invoice numbering (<code>INV-2026-xxx</code>). If Final Handover is chosen, system strictly blocks creation if any unpaid dues exist on earlier stages.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInvoiceModalQuotation(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={generatingInvoice}
                    onClick={handleGenerateInvoice}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                  >
                    {generatingInvoice ? (
                      <span>Validating Compliance & Invoicing...</span>
                    ) : (
                      <>
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Generate Sequential Invoice</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quotation Detailed View / Preview Modal */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                      {viewingQuotation.quotationNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      viewingQuotation.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      viewingQuotation.status === 'SHARED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {viewingQuotation.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Commercial Proposal for {viewingQuotation.clientName}
                  </h3>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition border border-slate-700"
                  title="Print Quotation"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = viewingQuotation;
                    setViewingQuotation(null);
                    handleStartEdit(q);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
                  title="Edit this Quotation"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingQuotation(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 space-y-6 text-xs text-slate-700 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Document Banner */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    APEX<span className="text-amber-500">BUILD</span> INTERIORS & INFRA
                  </h1>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Civil Construction, Turnkey Interiors & Commercial Fitouts
                  </p>
                  <p className="text-slate-400 text-[11px]">GSTIN: 29AABCU9603R1ZM • Bangalore, India</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quotation No</span>
                  <p className="font-mono text-base font-extrabold text-amber-600">{viewingQuotation.quotationNumber}</p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Date: {formatDate(viewingQuotation.createdAt)}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Valid Until: {formatDate(viewingQuotation.validUntil || new Date(Date.now() + 30 * 86400000))}
                  </p>
                </div>
              </div>

              {/* Client & Property Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Client Details</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{viewingQuotation.clientName}</h4>
                  <p className="text-slate-600 mt-0.5 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{viewingQuotation.clientPhone}</span>
                  </p>
                  {viewingQuotation.clientEmail && (
                    <p className="text-slate-600 mt-0.5 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{viewingQuotation.clientEmail}</span>
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Site / Project Location</span>
                  <p className="text-slate-800 font-semibold mt-1 flex items-start space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{viewingQuotation.siteAddress}</span>
                  </p>
                  <p className="text-slate-500 mt-1">
                    Project Type: <span className="font-semibold text-slate-800">{viewingQuotation.projectType.replace(/_/g, ' ')}</span>
                  </p>
                </div>
              </div>

              {/* Scope of Work Table */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-2">Itemized Scope of Work & Specifications</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-44">Area / Service</th>
                        <th className="py-2.5 px-3">Work Description & Material Spec</th>
                        <th className="py-2.5 px-3 w-16 text-center">Unit</th>
                        <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                        <th className="py-2.5 px-3 w-24 text-right">Rate (₹)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewingQuotation.items || []).map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{it.areaRoom}</td>
                          <td className="py-2.5 px-3 text-slate-600 leading-relaxed">{it.workDescription || '—'}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{it.unit}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">{formatCurrency(it.rate)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(it.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Tax Calculation */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(viewingQuotation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      GST ({viewingQuotation.gstMode === 'EXCLUSIVE' ? '+18% Exclusive' : '18% Inclusive'}):
                    </span>
                    <span className="font-semibold text-slate-900">{formatCurrency(viewingQuotation.gstAmount)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-black text-slate-900 text-sm">
                    <span>Agreed Grand Total:</span>
                    <span className="text-base text-emerald-700 font-black">{formatCurrency(viewingQuotation.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Milestone Terms */}
              {viewingQuotation.milestoneTerms && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">Milestone Payment Schedule</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(() => {
                      try {
                        const parsed = JSON.parse(viewingQuotation.milestoneTerms);
                        return parsed.map((m: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700">Stage {idx + 1}</span>
                              <span className="font-bold text-amber-600">{m.percentage}%</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">{m.name}</p>
                            <p className="text-xs font-bold text-slate-900 mt-1">
                              Payable: {formatCurrency(Math.round(viewingQuotation.totalAmount * (m.percentage / 100)))}
                            </p>
                          </div>
                        ));
                      } catch (e) {
                        return <p className="text-slate-500 italic">No structured milestone terms</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Notes & Penalty Clauses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-slate-600">
                {viewingQuotation.penaltyTerms && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                    <span className="font-bold text-amber-900 block">Delay Penalty Clause:</span>
                    <p className="text-amber-800">{viewingQuotation.penaltyTerms}</p>
                  </div>
                )}
                {viewingQuotation.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">Execution & Warranty Notes:</span>
                    <p className="text-slate-600">{viewingQuotation.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => {
                  const q = viewingQuotation;
                  setViewingQuotation(null);
                  handleDeleteQuotation(q);
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Quotation</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const q = viewingQuotation;
                    setViewingQuotation(null);
                    handleOpenDispatch(q);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingQuotation(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {addServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Add New Service / Area</h3>
                  <p className="text-[11px] text-slate-400">Instantly saves to the master services list</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddServiceModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveNewService();
              }}
              className="p-5 space-y-4"
            >
              {addServiceError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addServiceError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Service / Area Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Home Theatre Acoustic Panelling, Pooja Room, Swimming Pool..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Quick suggestions pills */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  Popular Construction & Interior Services (Click to select):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
                  {[
                    'Pooja Room & Sacred Space',
                    'Home Theatre & Acoustics',
                    'Walk-in Wardrobe',
                    'Terrace & Pergola',
                    'Swimming Pool & Deck',
                    'Home Automation & Smart Lighting',
                    'HVAC & Ducted AC',
                    'Exterior Facade & Cladding',
                    'Solar Power Plant Installation',
                    'Landscaping & Vertical Garden',
                    'Balcony Garden & Decking',
                    'Waterproofing & Grouting',
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => {
                        setNewServiceName(sugg);
                      }}
                      className="px-2 py-1 bg-white hover:bg-amber-100 hover:text-amber-900 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition text-left"
                    >
                      + {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddServiceModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingService || !newServiceName.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition"
                >
                  {savingService ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Add to Main List</span>
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

export default Quotations;
