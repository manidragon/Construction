import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  UserX,
  FileText,
  Upload,
  Layers,
  MapPin,
  Calendar,
  Grid,
  List,
  Eye,
  Trash2,
  Edit2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Check,
  CreditCard,
  DollarSign,
  Download,
} from 'lucide-react';
import { Plot, PlotBatch, PlotBookingHistory, Project } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProjectPlotsTabProps {
  project: Project;
  onRefreshProject?: () => void;
}

export const ProjectPlotsTab: React.FC<ProjectPlotsTabProps> = ({ project, onRefreshProject }) => {
  const { hasRole } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [batches, setBatches] = useState<PlotBatch[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sizeFilter, setSizeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showLapseModal, setShowLapseModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPlotDocsModal, setShowPlotDocsModal] = useState(false);

  // Active / Selected Plot for Actions
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [plotHistory, setPlotHistory] = useState<PlotBookingHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [plotDocuments, setPlotDocuments] = useState<any[]>([]);
  const [loadingPlotDocs, setLoadingPlotDocs] = useState(false);

  // Registration Form State
  const [registerForm, setRegisterForm] = useState({
    registrationDate: new Date().toISOString().split('T')[0],
    subRegistrarOffice: '',
    deedNumber: '',
    registrationDocUrl: '',
    registrationNotes: '',
  });

  // Plot Specific Document Upload Form State
  const [plotDocForm, setPlotDocForm] = useState({
    title: '',
    category: 'BUYER_KYC',
    fileUrl: '',
    description: '',
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    groupName: '',
    numberOfPlots: '50',
    sizeCents: '5',
    ratePerCent: '150000',
    plotPrice: '750000',
    prefix: 'PLOT-',
    startNumber: '1',
    facing: 'EAST',
    notes: '',
  });

  // Single Plot Form State
  const [plotForm, setPlotForm] = useState({
    id: '',
    plotNumber: '',
    sizeCents: '5',
    sizeSqFt: '2178',
    ratePerCent: '150000',
    price: '750000',
    facing: 'EAST',
    dimensions: '30 x 40',
    notes: '',
  });

  // Booking Form State (Supports 3 Payment Types: Token Advance, Advance Payment, Full Payment)
  const [bookingForm, setBookingForm] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    buyerAadhaar: '',
    buyerAddress: '',
    paymentType: 'TOKEN_ADVANCE' as 'TOKEN_ADVANCE' | 'ADVANCE_PAYMENT' | 'FULL_PAYMENT',
    tokenAmount: '50000',
    paymentMethod: 'BANK_TRANSFER',
    chequeNumber: '',
    chequeBank: '',
    chequeDate: new Date().toISOString().split('T')[0],
    paymentReference: '',
    notes: '',
  });

  // Lapse Reason State
  const [lapseReason, setLapseReason] = useState(
    'Buyer paid token advance but did not execute contract or show up within the stipulated 15-day period (No-Show). Token advance forfeited as per layout policy.'
  );

  // Release / Reassign State
  const [releaseAction, setReleaseAction] = useState<'RELEASE' | 'REASSIGN'>('RELEASE');
  const [reassignForm, setReassignForm] = useState({
    newBuyerName: '',
    newBuyerPhone: '',
    newBuyerEmail: '',
    newTokenAmount: '50000',
    paymentMethod: 'BANK_TRANSFER',
    chequeNumber: '',
    notes: '',
  });

  // Document Upload State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('DRAWING');
  const [docDescription, setDocDescription] = useState('');
  const [docCustomDate, setDocCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (sizeFilter !== 'ALL') params.append('sizeCents', sizeFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.getProjectPlots(project.id, params.toString());
      if (res.success) {
        setPlots(res.plots || []);
        setBatches(res.batches || []);
        setSummary(res.summary || null);
      }
    } catch (err) {
      console.error('Failed to load plots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
  }, [project.id, statusFilter, sizeFilter, searchTerm]);

  // Recalculate price in Batch Form when size or rate changes
  const handleBatchSizeOrRateChange = (field: 'sizeCents' | 'ratePerCent', value: string) => {
    const updated = { ...batchForm, [field]: value };
    const cents = parseFloat(field === 'sizeCents' ? value : batchForm.sizeCents) || 0;
    const rate = parseFloat(field === 'ratePerCent' ? value : batchForm.ratePerCent) || 0;
    if (cents > 0 && rate > 0) {
      updated.plotPrice = String(Math.round(cents * rate));
    }
    setBatchForm(updated);
  };

  // Recalculate price in Single Plot Form
  const handlePlotSizeOrRateChange = (field: 'sizeCents' | 'ratePerCent', value: string) => {
    const updated = { ...plotForm, [field]: value };
    const cents = parseFloat(field === 'sizeCents' ? value : plotForm.sizeCents) || 0;
    const rate = parseFloat(field === 'ratePerCent' ? value : plotForm.ratePerCent) || 0;
    if (field === 'sizeCents') {
      updated.sizeSqFt = String(Math.round(cents * 435.6 * 100) / 100);
    }
    if (cents > 0 && rate > 0) {
      updated.price = String(Math.round(cents * rate));
    }
    setPlotForm(updated);
  };

  // Open Edit Plot Modal
  const openEditPlot = (p: Plot) => {
    setSelectedPlot(p);
    setPlotForm({
      id: p.id,
      plotNumber: p.plotNumber,
      sizeCents: String(p.sizeCents),
      sizeSqFt: String(p.sizeSqFt || Math.round(p.sizeCents * 435.6)),
      ratePerCent: String(p.ratePerCent || (p.sizeCents > 0 ? Math.round(p.price / p.sizeCents) : '')),
      price: String(p.price),
      facing: p.facing || 'EAST',
      dimensions: p.dimensions || '',
      notes: p.notes || '',
    });
    setShowPlotModal(true);
  };

  // Open Book Modal with Payment Stage selection
  const openBookingModal = (p: Plot, preferredType?: 'TOKEN_ADVANCE' | 'ADVANCE_PAYMENT' | 'FULL_PAYMENT') => {
    setSelectedPlot(p);
    const bal = Math.max(0, p.price - (p.totalReceived || 0));
    let initialType: 'TOKEN_ADVANCE' | 'ADVANCE_PAYMENT' | 'FULL_PAYMENT' = preferredType || (p.status === 'AVAILABLE' ? 'TOKEN_ADVANCE' : 'ADVANCE_PAYMENT');
    let initialAmount = '50000';
    if (initialType === 'FULL_PAYMENT') {
      initialAmount = String(bal > 0 ? bal : p.price);
    } else if (initialType === 'ADVANCE_PAYMENT') {
      initialAmount = String(Math.min(bal, Math.max(100000, Math.round(p.price * 0.2))));
    } else {
      initialAmount = p.tokenAmount > 0 ? String(p.tokenAmount) : '50000';
    }

    setBookingForm({
      buyerName: p.buyerName || '',
      buyerPhone: p.buyerPhone || '',
      buyerEmail: p.buyerEmail || '',
      buyerAadhaar: p.buyerAadhaar || '',
      buyerAddress: p.buyerAddress || '',
      paymentType: initialType,
      tokenAmount: initialAmount,
      paymentMethod: p.paymentMethod || 'BANK_TRANSFER',
      chequeNumber: p.chequeNumber || '',
      chequeBank: p.chequeBank || '',
      chequeDate: new Date().toISOString().split('T')[0],
      paymentReference: p.paymentReference || '',
      notes: '',
    });
    setShowBookingModal(true);
  };

  // Open Legal Registration Modal
  const openRegisterModal = (p: Plot) => {
    setSelectedPlot(p);
    setRegisterForm({
      registrationDate: p.registrationDate ? new Date(p.registrationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      subRegistrarOffice: p.subRegistrarOffice || 'Sub-Registrar Office',
      deedNumber: p.deedNumber || '',
      registrationDocUrl: p.registrationDocUrl || '',
      registrationNotes: p.registrationNotes || '',
    });
    setShowRegisterModal(true);
  };

  // Open Plot & Client Documents Modal (KYC & Land files)
  const openPlotDocsModal = async (p: Plot) => {
    setSelectedPlot(p);
    setShowPlotDocsModal(true);
    setLoadingPlotDocs(true);
    try {
      const res = await api.getPlotDocuments(project.id, p.id);
      if (res.success) {
        setPlotDocuments(res.documents || []);
      }
    } catch (err) {
      console.error('Error fetching plot documents:', err);
    } finally {
      setLoadingPlotDocs(false);
    }
  };

  // Submit Legal Registration Action
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    try {
      setSubmitting(true);
      const res = await api.completePlotRegistration(project.id, selectedPlot.id, registerForm);
      if (res.success) {
        setShowRegisterModal(false);
        setActionSuccess(res.message || `Plot ${selectedPlot.plotNumber} successfully registered!`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchPlots();
        if (onRefreshProject) onRefreshProject();
      } else {
        alert(res.message || 'Failed to complete registration');
      }
    } catch (err: any) {
      alert(err.message || 'Error completing registration');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload Plot Document (KYC / Land title deed / EC / Patta)
  const handleUploadPlotDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    if (!plotDocForm.title.trim()) {
      alert('Please enter document title');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.uploadPlotDocument(project.id, selectedPlot.id, {
        title: plotDocForm.title.trim(),
        category: plotDocForm.category,
        fileUrl: plotDocForm.fileUrl.trim() || 'https://storage.googleapis.com/apexbuild-docs/real-estate-doc.pdf',
        description: plotDocForm.description.trim(),
      });
      if (res.success) {
        setPlotDocForm({ title: '', category: 'BUYER_KYC', fileUrl: '', description: '' });
        setActionSuccess('Document uploaded for plot & synchronized with Document Repository!');
        setTimeout(() => setActionSuccess(null), 4000);
        const docsRes = await api.getPlotDocuments(project.id, selectedPlot.id);
        if (docsRes.success) setPlotDocuments(docsRes.documents || []);
        fetchPlots();
      } else {
        alert(res.message || 'Failed to upload document');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading document');
    } finally {
      setSubmitting(false);
    }
  };

  // Open History Modal
  const openHistoryModal = async (p: Plot) => {
    setSelectedPlot(p);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.getPlotHistory(project.id, p.id);
      if (res.success) {
        setPlotHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to load plot history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.createPlotBatch(project.id, batchForm);
      if (res.success) {
        setShowBatchModal(false);
        setActionSuccess(res.message || 'Plot batch created successfully!');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchPlots();
        if (onRefreshProject) onRefreshProject();
      } else {
        alert(res.message || 'Failed to create batch');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  // Create / Update Single Plot
  const handleSavePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (plotForm.id) {
        const res = await api.updatePlot(project.id, plotForm.id, plotForm);
        if (res.success) {
          setShowPlotModal(false);
          setActionSuccess('Plot details updated successfully!');
          setTimeout(() => setActionSuccess(null), 3500);
          fetchPlots();
        } else {
          alert(res.message || 'Failed to update plot');
        }
      } else {
        const res = await api.createPlot(project.id, plotForm);
        if (res.success) {
          setShowPlotModal(false);
          setActionSuccess(res.message || 'Plot added successfully!');
          setTimeout(() => setActionSuccess(null), 3500);
          fetchPlots();
          if (onRefreshProject) onRefreshProject();
        } else {
          alert(res.message || 'Failed to add plot');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error saving plot');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Booking / Token Advance
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    try {
      setSubmitting(true);
      const res = await api.bookPlot(project.id, selectedPlot.id, bookingForm);
      if (res.success) {
        setShowBookingModal(false);
        setActionSuccess(res.message || 'Plot booked and advance receipt recorded in accounts!');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchPlots();
        if (onRefreshProject) onRefreshProject();
      } else {
        alert(res.message || 'Failed to book plot');
      }
    } catch (err: any) {
      alert(err.message || 'Error booking plot');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Mark Lapsed No-Show
  const handleMarkLapsed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    try {
      setSubmitting(true);
      const res = await api.markPlotLapsed(project.id, selectedPlot.id, { reason: lapseReason });
      if (res.success) {
        setShowLapseModal(false);
        setActionSuccess(res.message || 'Plot marked as TOKEN_LAPSED_NO_SHOW. History preserved.');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchPlots();
        if (onRefreshProject) onRefreshProject();
      } else {
        alert(res.message || 'Failed to update plot status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating plot status');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Release or Re-assign
  const handleReleaseOrReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    try {
      setSubmitting(true);
      const payload: any = { actionType: releaseAction };
      if (releaseAction === 'REASSIGN') {
        payload.newBuyerName = reassignForm.newBuyerName;
        payload.newBuyerPhone = reassignForm.newBuyerPhone;
        payload.newBuyerEmail = reassignForm.newBuyerEmail;
        payload.newTokenAmount = reassignForm.newTokenAmount;
        payload.paymentMethod = reassignForm.paymentMethod;
        payload.chequeNumber = reassignForm.chequeNumber;
        payload.notes = reassignForm.notes;
      }
      const res = await api.releaseOrReassignPlot(project.id, selectedPlot.id, payload);
      if (res.success) {
        setShowReleaseModal(false);
        setActionSuccess(res.message || 'Plot released/reassigned successfully!');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchPlots();
        if (onRefreshProject) onRefreshProject();
      } else {
        alert(res.message || 'Failed to process plot release/reassign');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Plot
  const handleDeletePlot = async (p: Plot) => {
    if (!window.confirm(`Are you sure you want to delete plot ${p.plotNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.deletePlot(project.id, p.id);
      if (res.success) {
        setActionSuccess(res.message || `Plot ${p.plotNumber} deleted.`);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchPlots();
        if (onRefreshProject) onRefreshProject();
      } else {
        alert(res.message || 'Failed to delete plot');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting plot');
    }
  };

  // Upload Plot & Land Document (synced with Document Repository)
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      alert('Please enter a document title.');
      return;
    }
    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('title', docTitle.trim());
      formData.append('category', docCategory);
      formData.append('projectId', project.id);
      formData.append('referenceEntity', 'Plot');
      if (selectedPlot) {
        formData.append('referenceId', selectedPlot.id);
      }
      if (docDescription.trim()) {
        formData.append('description', docDescription.trim());
      }
      if (docCustomDate) {
        formData.append('customDate', docCustomDate);
      }
      if (docFile) {
        formData.append('file', docFile);
      }

      const res = await api.uploadDocument(formData);
      if (res.success) {
        setShowUploadModal(false);
        setDocTitle('');
        setDocDescription('');
        setDocFile(null);
        setActionSuccess('Document uploaded and synchronized with Document Repository!');
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        alert(res.message || 'Failed to upload document');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading document');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Filtered plot list
  const filteredPlots = useMemo(() => {
    return plots.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (sizeFilter !== 'ALL' && Math.round(p.sizeCents * 100) / 100 !== parseFloat(sizeFilter)) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNum = p.plotNumber.toLowerCase().includes(q);
        const matchesBuyer = (p.buyerName || '').toLowerCase().includes(q);
        const matchesPhone = (p.buyerPhone || '').toLowerCase().includes(q);
        const matchesFacing = (p.facing || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesBuyer && !matchesPhone && !matchesFacing) return false;
      }
      return true;
    });
  }, [plots, statusFilter, sizeFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Land Project Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-center">
          <Landmark className="w-64 h-64 text-emerald-300" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                REAL ESTATE & PLOT LAYOUT
              </span>
              {project.surveyNumber && (
                <span className="px-2.5 py-1 bg-slate-800/60 border border-slate-700 text-slate-300 rounded-lg text-xs font-mono">
                  Sy. No: {project.surveyNumber}
                </span>
              )}
              {project.layoutApprovalNumber && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-lg text-xs font-bold">
                  Approval: {project.layoutApprovalNumber}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {project.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {project.siteAddress || `${project.city || ''}, ${project.state || ''}`}
              </span>
              {project.totalLandArea && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Total Land: <strong className="text-white">{project.totalLandArea} {project.landAreaUnit || 'Cents'}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Launch: {formatDate(project.plannedStartDate)}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Batch Inventory</span>
            </button>
            <button
              onClick={() => {
                setPlotForm({
                  id: '',
                  plotNumber: `PLOT-${String(plots.length + 1).padStart(2, '0')}`,
                  sizeCents: '5',
                  sizeSqFt: '2178',
                  ratePerCent: '150000',
                  price: '750000',
                  facing: 'EAST',
                  dimensions: '30 x 40',
                  notes: '',
                });
                setShowPlotModal(true);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Single Plot</span>
            </button>
            <button
              onClick={() => {
                setSelectedPlot(null);
                setDocTitle(`${project.name} - Approved Layout Map`);
                setDocCategory('DRAWING');
                setShowUploadModal(true);
              }}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
              title="Upload project area, layout, title deeds & receipts synced to Document Vault"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Upload Documents</span>
            </button>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Real-Time Live Availability & Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Plots */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Plots</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
            {summary?.totalPlots || plots.length}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Layout Inventory</span>
        </div>

        {/* Available Plots */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {summary?.availableCount || plots.filter((p) => p.status === 'AVAILABLE').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Ready for Token Booking</span>
        </div>

        {/* Booked / Token Paid */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Booked / Token
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {summary?.bookedCount || plots.filter((p) => p.status === 'BOOKED' || p.status === 'TOKEN_PAID').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Advance Collected</span>
        </div>

        {/* Token Lapsed (No Show) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Lapsed (No Show)
          </span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            {summary?.tokenLapsedCount || plots.filter((p) => p.status === 'TOKEN_LAPSED_NO_SHOW').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Eligible to Release/Reassign</span>
        </div>

        {/* Token Received */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Token / Advance Inflow</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
            {formatCurrency(summary?.totalTokenReceived || 0)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Posted to Accounts</span>
        </div>

        {/* Balance Due */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Balance Receivable</span>
          <span className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 block truncate">
            {formatCurrency(summary?.totalBalanceDue || 0)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Due at Registration</span>
        </div>
      </div>

      {/* Plot Size Group Breakdown Filter Pills (e.g. 50 plots of 5 cents, 30 plots of 3 cents, 20 plots of 2.5 cents) */}
      {summary?.sizeBreakdown && summary.sizeBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Plot Size Groups & Live Availability
            </span>
            <span className="text-[11px] text-slate-400">
              Click any size to filter inventory instantly
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSizeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                sizeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              <span>All Sizes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {summary.totalPlots}
              </span>
            </button>

            {summary.sizeBreakdown.map((grp: any) => (
              <button
                key={grp.sizeCents}
                onClick={() => setSizeFilter(sizeFilter === String(grp.sizeCents) ? 'ALL' : String(grp.sizeCents))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-2 ${
                  sizeFilter === String(grp.sizeCents)
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="font-bold">{grp.sizeCents} Cents</span>
                <span className="text-[10px] opacity-80">({Math.round(grp.sizeCents * 435.6)} sq.ft)</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="font-bold text-emerald-500">{grp.available} Avail</span>
                  <span>/</span>
                  <span className="font-medium">{grp.total} Total</span>
                </span>
                {grp.lapsed > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">
                    {grp.lapsed} Lapsed
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'AVAILABLE', label: 'Available', badge: 'bg-emerald-100 text-emerald-800' },
            { id: 'TOKEN_PAID', label: 'Token Paid', badge: 'bg-amber-100 text-amber-800' },
            { id: 'BOOKED', label: 'Booked', badge: 'bg-amber-100 text-amber-800' },
            { id: 'TOKEN_LAPSED_NO_SHOW', label: 'Token Lapsed (No-Show)', badge: 'bg-rose-100 text-rose-800' },
            { id: 'REGISTERED', label: 'Registered', badge: 'bg-indigo-100 text-indigo-800' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plot #, buyer name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-400'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-400'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Plot Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlots.map((p) => {
            const isAvailable = p.status === 'AVAILABLE';
            const isTokenPaid = p.status === 'TOKEN_PAID' || p.status === 'BOOKED';
            const isLapsed = p.status === 'TOKEN_LAPSED_NO_SHOW';
            const isRegistered = p.status === 'REGISTERED';

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  isAvailable
                    ? 'border-emerald-200 dark:border-emerald-900/60'
                    : isLapsed
                    ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/20'
                    : isRegistered
                    ? 'border-indigo-200 dark:border-indigo-900/60'
                    : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10'
                }`}
              >
                <div>
                  {/* Top: Plot Number & Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{
                        backgroundColor: isAvailable ? '#10b981' : isLapsed ? '#f43f5e' : isRegistered ? '#6366f1' : '#f59e0b'
                      }} />
                      {p.plotNumber}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : isLapsed
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 animate-pulse'
                          : isRegistered
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {isLapsed ? 'LAPSED (NO-SHOW)' : p.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Size & Facing */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-3">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {p.sizeCents} Cents <span className="text-[10px] text-slate-400 font-normal">({p.sizeSqFt || Math.round(p.sizeCents * 435.6)} sqft)</span>
                    </span>
                    <span className="text-[11px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-semibold">
                      Facing: {p.facing || 'East'}
                    </span>
                  </div>

                  {/* Financial Price */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Total Price:</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                    {p.ratePerCent ? (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Rate / Cent:</span>
                        <span>{formatCurrency(p.ratePerCent)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Buyer & Payment Info if Booked / Lapsed / Registered */}
                  {!isAvailable && (
                    <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100 dark:border-slate-700 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Buyer:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {p.buyerName || 'Client'}
                        </span>
                      </div>
                      {p.buyerPhone && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Phone:</span>
                          <span className="font-mono">{p.buyerPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[11px]">
                        <span className="text-emerald-600 font-medium">Payment Received:</span>
                        <span className="font-bold text-emerald-600 font-mono">
                          {formatCurrency(p.totalReceived || p.tokenAmount || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-rose-600 font-medium">Balance Due:</span>
                        <span className="font-bold text-rose-600 font-mono">
                          {formatCurrency(p.balanceDue || 0)}
                        </span>
                      </div>
                      {p.status === 'BOOKED' && (p.balanceDue || 0) === 0 && (
                        <div className="mt-2 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-between">
                          <span>✓ Full Payment Received</span>
                          <span className="text-amber-600 dark:text-amber-400 text-[9px] uppercase tracking-wider">Awaiting SRO Registration</span>
                        </div>
                      )}
                      {isRegistered && (
                        <div className="mt-2 p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[10px] text-indigo-700 dark:text-indigo-300 space-y-0.5">
                          <div className="font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            <span>Registered at {p.subRegistrarOffice || 'SRO'}</span>
                          </div>
                          {p.deedNumber && <div className="text-[9px] font-mono">Deed #: {p.deedNumber}</div>}
                          {p.registrationDate && <div className="text-[9px] text-slate-500">Date: {formatDate(p.registrationDate)}</div>}
                        </div>
                      )}
                      {isLapsed && p.lapsedReason && (
                        <div className="pt-1.5 border-t border-rose-200 dark:border-rose-900/60 text-[10px] text-rose-600 dark:text-rose-400 font-medium leading-tight">
                          ⚠️ {p.lapsedReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-1.5">
                  {isAvailable ? (
                    <>
                      <button
                        onClick={() => openBookingModal(p)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Book / Token</span>
                      </button>
                      <button
                        onClick={() => openPlotDocsModal(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition relative"
                        title="Plot Documents & Title Deeds"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {(p.documents?.length || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                            {p.documents?.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => openEditPlot(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition"
                        title="Edit Plot"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlot(p)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg text-xs transition"
                        title="Delete Plot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : isLapsed ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedPlot(p);
                          setReleaseAction('RELEASE');
                          setShowReleaseModal(true);
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Release Plot</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlot(p);
                          setReleaseAction('REASSIGN');
                          setReassignForm({
                            newBuyerName: '',
                            newBuyerPhone: '',
                            newBuyerEmail: '',
                            newTokenAmount: '50000',
                            paymentMethod: 'BANK_TRANSFER',
                            chequeNumber: '',
                            notes: '',
                          });
                          setShowReleaseModal(true);
                        }}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Re-assign</span>
                      </button>
                      <button
                        onClick={() => openPlotDocsModal(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition"
                        title="View Plot Documents"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openHistoryModal(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition"
                        title="View Audit Trail"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openBookingModal(p)}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        <span>Payment / Edit</span>
                      </button>
                      {!isRegistered && (
                        <button
                          onClick={() => openRegisterModal(p)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          title="Register Plot at Sub-Registrar Office (Status -> REGISTERED)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Register</span>
                        </button>
                      )}
                      <button
                        onClick={() => openPlotDocsModal(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition relative"
                        title="Plot KYC & Land Documents"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        {(p.documents?.length || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                            {p.documents?.length}
                          </span>
                        )}
                      </button>
                      {!isRegistered && (
                        <button
                          onClick={() => {
                            setSelectedPlot(p);
                            setShowLapseModal(true);
                          }}
                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                          title="Buyer paid token advance and did not return. Mark as Token Lapsed No-Show."
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>No-Show</span>
                        </button>
                      )}
                      <button
                        onClick={() => openHistoryModal(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition"
                        title="View Booking History"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Plot Table View */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Plot #</th>
                  <th className="py-3 px-4">Size (Cents / Sqft)</th>
                  <th className="py-3 px-4">Facing</th>
                  <th className="py-3 px-4">Total Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Buyer & Contact</th>
                  <th className="py-3 px-4">Token Received</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredPlots.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-mono">
                      {p.plotNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.sizeCents} Cents</span>
                      <span className="text-[10px] text-slate-400 block">{p.sizeSqFt || Math.round(p.sizeCents * 435.6)} sqft</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {p.facing || 'East'}
                    </td>
                    <td className="py-3 px-4 font-black font-mono text-slate-900 dark:text-white">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'TOKEN_LAPSED_NO_SHOW'
                            ? 'bg-rose-100 text-rose-800'
                            : p.status === 'REGISTERED'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'TOKEN_LAPSED_NO_SHOW' ? 'LAPSED (NO-SHOW)' : p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.buyerName ? (
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.buyerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.buyerPhone || ''}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                      {p.totalReceived > 0 ? formatCurrency(p.totalReceived) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {p.status !== 'AVAILABLE' ? formatCurrency(p.balanceDue) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      {p.status === 'AVAILABLE' ? (
                        <>
                          <button
                            onClick={() => openBookingModal(p)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition"
                          >
                            Book
                          </button>
                          <button
                            onClick={() => openPlotDocsModal(p)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 relative"
                            title="Documents"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {(p.documents?.length || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                                {p.documents?.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => openEditPlot(p)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : p.status === 'TOKEN_LAPSED_NO_SHOW' ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPlot(p);
                              setReleaseAction('RELEASE');
                              setShowReleaseModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition"
                          >
                            Release
                          </button>
                          <button
                            onClick={() => openPlotDocsModal(p)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                            title="Documents"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openHistoryModal(p)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                            title="History"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openBookingModal(p)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded text-xs font-semibold"
                          >
                            Payment
                          </button>
                          {p.status !== 'REGISTERED' && (
                            <button
                              onClick={() => openRegisterModal(p)}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition"
                              title="Complete Legal Registration at SRO"
                            >
                              Register
                            </button>
                          )}
                          <button
                            onClick={() => openPlotDocsModal(p)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 relative"
                            title="Plot KYC & Land Files"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            {(p.documents?.length || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                                {p.documents?.length}
                              </span>
                            )}
                          </button>
                          {p.status !== 'REGISTERED' && (
                            <button
                              onClick={() => {
                                setSelectedPlot(p);
                                setShowLapseModal(true);
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold"
                            >
                              No-Show
                            </button>
                          )}
                          <button
                            onClick={() => openHistoryModal(p)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                            title="History"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD PLOT INVENTORY BY BATCH / SIZE GROUPS       */}
      {/* Fixed Header & Sticky Save/Cancel with Scrollable Fields */}
      {/* ======================================================== */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add Plots by Size Group / Batch
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bulk generate sequential plots (e.g. 50 plots of 5 cents, 30 plots of 3 cents)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Fields */}
            <form onSubmit={handleCreateBatch} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Group / Phase Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 Cents - Phase 1 East Plots"
                    value={batchForm.groupName}
                    onChange={(e) => setBatchForm({ ...batchForm, groupName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Number of Plots in this Batch *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="500"
                      value={batchForm.numberOfPlots}
                      onChange={(e) => setBatchForm({ ...batchForm, numberOfPlots: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Size per Plot (in Cents) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.1"
                      value={batchForm.sizeCents}
                      onChange={(e) => handleBatchSizeOrRateChange('sizeCents', e.target.value)}
                      placeholder="e.g. 5 or 3 or 2.5"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      = {Math.round((parseFloat(batchForm.sizeCents) || 0) * 435.6)} sq.ft (approx)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rate per Cent (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={batchForm.ratePerCent}
                      onChange={(e) => handleBatchSizeOrRateChange('ratePerCent', e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Computed Price per Plot (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={batchForm.plotPrice}
                      onChange={(e) => setBatchForm({ ...batchForm, plotPrice: e.target.value })}
                      placeholder="e.g. 750000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Plot Prefix
                    </label>
                    <input
                      type="text"
                      value={batchForm.prefix}
                      onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value.toUpperCase() })}
                      placeholder="e.g. PLOT-"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Start Number
                    </label>
                    <input
                      type="number"
                      value={batchForm.startNumber}
                      onChange={(e) => setBatchForm({ ...batchForm, startNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Facing
                    </label>
                    <select
                      value={batchForm.facing}
                      onChange={(e) => setBatchForm({ ...batchForm, facing: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="EAST">East</option>
                      <option value="NORTH">North</option>
                      <option value="WEST">West</option>
                      <option value="SOUTH">South</option>
                      <option value="CORNER">Corner (Dual)</option>
                    </select>
                  </div>
                </div>

                {/* Batch Generator Summary Preview */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Batch Preview: {batchForm.numberOfPlots} plots of {batchForm.sizeCents} cents each
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Numbers: {batchForm.prefix}{String(batchForm.startNumber).padStart(2, '0')} to {batchForm.prefix}{String((parseInt(batchForm.startNumber) || 1) + (parseInt(batchForm.numberOfPlots) || 50) - 1).padStart(2, '0')} • Valuation: {formatCurrency((Number(batchForm.plotPrice) || 0) * (Number(batchForm.numberOfPlots) || 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fixed Sticky Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Generating Inventory...' : 'Generate Batch Inventory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT SINGLE INDIVIDUAL PLOT               */}
      {/* Fixed Header & Sticky Save/Cancel with Scrollable Fields */}
      {/* ======================================================== */}
      {showPlotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {plotForm.id ? `Edit Plot: ${plotForm.plotNumber}` : 'Add Individual Plot'}
              </h3>
              <button
                onClick={() => setShowPlotModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlot} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plot Number / Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PLOT-01, A-12, CORNER-05"
                    value={plotForm.plotNumber}
                    onChange={(e) => setPlotForm({ ...plotForm, plotNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Plot Size (in Cents) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={plotForm.sizeCents}
                      onChange={(e) => handlePlotSizeOrRateChange('sizeCents', e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Size (Sq.Ft)
                    </label>
                    <input
                      type="number"
                      value={plotForm.sizeSqFt}
                      onChange={(e) => setPlotForm({ ...plotForm, sizeSqFt: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rate per Cent (₹)
                    </label>
                    <input
                      type="number"
                      value={plotForm.ratePerCent}
                      onChange={(e) => handlePlotSizeOrRateChange('ratePerCent', e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Total Plot Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={plotForm.price}
                      onChange={(e) => setPlotForm({ ...plotForm, price: e.target.value })}
                      placeholder="e.g. 750000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Facing Direction
                    </label>
                    <select
                      value={plotForm.facing}
                      onChange={(e) => setPlotForm({ ...plotForm, facing: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="EAST">East Facing</option>
                      <option value="NORTH">North Facing</option>
                      <option value="WEST">West Facing</option>
                      <option value="SOUTH">South Facing</option>
                      <option value="NORTH_EAST">North-East Corner</option>
                      <option value="NORTH_WEST">North-West Corner</option>
                      <option value="SOUTH_EAST">South-East</option>
                      <option value="SOUTH_WEST">South-West</option>
                      <option value="CORNER">Corner (Dual Road)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dimensions (e.g. 30 x 40)
                    </label>
                    <input
                      type="text"
                      placeholder="30 x 40"
                      value={plotForm.dimensions}
                      onChange={(e) => setPlotForm({ ...plotForm, dimensions: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plot Boundary & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Adjacent to 40ft main road, park facing..."
                    value={plotForm.notes}
                    onChange={(e) => setPlotForm({ ...plotForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowPlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition"
                >
                  {submitting ? 'Saving...' : 'Save Plot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: BOOK PLOT / COLLECT TOKEN ADVANCE PAYMENT       */}
      {/* Links to Double-Entry Accounting & Issues Client Receipt */}
      {/* ======================================================== */}
      {showBookingModal && selectedPlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Book Plot {selectedPlot.plotNumber} • Collect Token Advance</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total Plot Price: <strong>{formatCurrency(selectedPlot.price)}</strong> ({selectedPlot.sizeCents} Cents)
                </p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Buyer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Buyer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={bookingForm.buyerName}
                      onChange={(e) => setBookingForm({ ...bookingForm, buyerName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Buyer Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98450 12345"
                      value={bookingForm.buyerPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, buyerPhone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Buyer Email
                    </label>
                    <input
                      type="email"
                      placeholder="buyer@gmail.com"
                      value={bookingForm.buyerEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, buyerEmail: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Aadhaar / PAN / National ID
                    </label>
                    <input
                      type="text"
                      placeholder="XXXX-XXXX-XXXX"
                      value={bookingForm.buyerAadhaar}
                      onChange={(e) => setBookingForm({ ...bookingForm, buyerAadhaar: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* 3 Payment Types: Token Advance, Advance Payment, Full Payment */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Payment Stage / Category *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingForm({
                          ...bookingForm,
                          paymentType: 'TOKEN_ADVANCE',
                          tokenAmount: bookingForm.tokenAmount || '50000',
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        bookingForm.paymentType === 'TOKEN_ADVANCE'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">1. Token Advance</span>
                        {bookingForm.paymentType === 'TOKEN_ADVANCE' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Status → TOKEN PAID</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bal = Math.max(0, selectedPlot.price - (selectedPlot.totalReceived || 0));
                        const defaultAdv = Math.min(bal, Math.max(100000, Math.round(selectedPlot.price * 0.2)));
                        setBookingForm({
                          ...bookingForm,
                          paymentType: 'ADVANCE_PAYMENT',
                          tokenAmount: String(defaultAdv),
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        bookingForm.paymentType === 'ADVANCE_PAYMENT'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">2. Advance Payment</span>
                        {bookingForm.paymentType === 'ADVANCE_PAYMENT' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Status → BOOKED</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bal = Math.max(0, selectedPlot.price - (selectedPlot.totalReceived || 0));
                        setBookingForm({
                          ...bookingForm,
                          paymentType: 'FULL_PAYMENT',
                          tokenAmount: String(bal > 0 ? bal : selectedPlot.price),
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        bookingForm.paymentType === 'FULL_PAYMENT'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">3. Full Payment</span>
                        {bookingForm.paymentType === 'FULL_PAYMENT' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Status → Remains BOOKED</span>
                    </button>
                  </div>
                  {bookingForm.paymentType === 'FULL_PAYMENT' && (
                    <div className="mt-2 p-2 bg-indigo-50/70 dark:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200">
                      ℹ️ <strong>Legal Rule:</strong> Even when Full Payment is received, the plot remains in <strong>BOOKED</strong> status until legal registration is completed at the Sub-Registrar Office (SRO).
                    </div>
                  )}
                </div>

                {/* Token Payment & Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {bookingForm.paymentType === 'FULL_PAYMENT' ? 'Full Settlement Amount (₹) *' : bookingForm.paymentType === 'ADVANCE_PAYMENT' ? 'Advance Payment Amount (₹) *' : 'Token Advance Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      required
                      value={bookingForm.tokenAmount}
                      onChange={(e) => setBookingForm({ ...bookingForm, tokenAmount: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-emerald-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Balance Due: {formatCurrency(Math.max(0, (selectedPlot.price - (selectedPlot.totalReceived || 0)) - (Number(bookingForm.tokenAmount) || 0)))}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={bookingForm.paymentMethod}
                      onChange={(e) => setBookingForm({ ...bookingForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="UPI">UPI / QR Payment</option>
                      <option value="CASH">Cash in Hand (COA 1010)</option>
                    </select>
                  </div>
                </div>

                {/* Cheque Specific Details */}
                {bookingForm.paymentMethod === 'CHEQUE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cheque Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="CHQ-654321"
                        value={bookingForm.chequeNumber}
                        onChange={(e) => setBookingForm({ ...bookingForm, chequeNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Drawee Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="HDFC / SBI / ICICI"
                        value={bookingForm.chequeBank}
                        onChange={(e) => setBookingForm({ ...bookingForm, chequeBank: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cheque Date
                      </label>
                      <input
                        type="date"
                        value={bookingForm.chequeDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, chequeDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Bank / UTR Reference */}
                {bookingForm.paymentMethod !== 'CHEQUE' && bookingForm.paymentMethod !== 'CASH' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bank Transaction / UTR / Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR2026112398412"
                      value={bookingForm.paymentReference}
                      onChange={(e) => setBookingForm({ ...bookingForm, paymentReference: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                )}

                {/* Accounting Integration Preview */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <ShieldCheck className="w-4 h-4" />
                    Double-Entry Accounting & Vault Sync
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                    • <strong>Debit:</strong> {bookingForm.paymentMethod === 'CASH' ? 'Cash in Hand (COA 1010)' : 'Operating Bank Account (COA 1030)'} +₹{Number(bookingForm.tokenAmount || 0).toLocaleString('en-IN')}<br />
                    • <strong>Credit:</strong> Contract Revenue / Plot Sales (COA 4010) +₹{Number(bookingForm.tokenAmount || 0).toLocaleString('en-IN')}<br />
                    • Issues formal Client Receipt into Clients & Billing (RA Bills) and Document Repository.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Recording Booking...' : 'Confirm Booking & Issue Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: STATUS HANDLING FOR TOKEN LAPSED / NO-SHOW      */}
      {/* Preserves Payment & Status History Before Re-assignment  */}
      {/* ======================================================== */}
      {showLapseModal && selectedPlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mark Plot as Token Lapsed (No-Show)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Status handling for buyer {selectedPlot.buyerName} ({selectedPlot.plotNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLapseModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkLapsed} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Historical Payment Summary Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Buyer Name:</span>
                    <strong className="text-slate-900 dark:text-white">{selectedPlot.buyerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Buyer Phone:</span>
                    <span className="font-mono">{selectedPlot.buyerPhone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Token Advance Paid:</span>
                    <strong className="text-emerald-600 font-mono">
                      {formatCurrency(selectedPlot.totalReceived || selectedPlot.tokenAmount || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Booking Date:</span>
                    <span>{formatDate(selectedPlot.bookingDate)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lapse Reason & Agreement Clause *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={lapseReason}
                    onChange={(e) => setLapseReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold">🛡️ Payment & Status History Intact:</p>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    Marking this plot as <strong>TOKEN_LAPSED_NO_SHOW</strong> preserves all payment receipts and journal vouchers in the books. Once marked lapsed, the plot can be cleanly released back to inventory or re-assigned to a new prospective buyer.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowLapseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition"
                >
                  {submitting ? 'Updating Status...' : 'Confirm Token Lapsed Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: RELEASE OR RE-ASSIGN PLOT                       */}
      {/* Clean Inventory Release with Preserved Historical Audit  */}
      {/* ======================================================== */}
      {showReleaseModal && selectedPlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Release or Re-assign Plot {selectedPlot.plotNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Previous Buyer: {selectedPlot.buyerName || 'None'} • Payment history will remain preserved
                </p>
              </div>
              <button
                onClick={() => setShowReleaseModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReleaseOrReassign} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Action Choice Switcher */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setReleaseAction('RELEASE')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      releaseAction === 'RELEASE'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs">Release to Available</span>
                    <span className="text-[10px] block opacity-70">Clear buyer, reset to Available</span>
                  </div>

                  <div
                    onClick={() => setReleaseAction('REASSIGN')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      releaseAction === 'REASSIGN'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                    <span className="text-xs">Re-assign Directly</span>
                    <span className="text-[10px] block opacity-70">Assign to new prospective buyer</span>
                  </div>
                </div>

                {releaseAction === 'RELEASE' ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      You are releasing Plot <strong>{selectedPlot.plotNumber}</strong> back to general inventory.
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      • The plot status will become <strong>AVAILABLE</strong>.<br />
                      • The previous buyer's details ({selectedPlot.buyerName}) and token advance of {formatCurrency(selectedPlot.totalReceived || selectedPlot.tokenAmount || 0)} are permanently archived in the booking history.<br />
                      • Price resets to {formatCurrency(selectedPlot.price)} with 100% balance available.
                    </p>
                  </div>
                ) : (
                  /* Re-assign form fields */
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        New Buyer Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Anand Mahindra"
                        value={reassignForm.newBuyerName}
                        onChange={(e) => setReassignForm({ ...reassignForm, newBuyerName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          New Buyer Phone
                        </label>
                        <input
                          type="text"
                          placeholder="+91 98450 99887"
                          value={reassignForm.newBuyerPhone}
                          onChange={(e) => setReassignForm({ ...reassignForm, newBuyerPhone: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          New Token Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={reassignForm.newTokenAmount}
                          onChange={(e) => setReassignForm({ ...reassignForm, newTokenAmount: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowReleaseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition"
                >
                  {submitting ? 'Processing...' : releaseAction === 'RELEASE' ? 'Release to Inventory' : 'Re-assign Plot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: IMMUTABLE BOOKING & STATUS AUDIT HISTORY        */}
      {/* ======================================================== */}
      {showHistoryModal && selectedPlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Plot {selectedPlot.plotNumber} • Complete Booking History
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Audit trail of all previous bookings, tokens, lapsed no-shows & releases
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
              ) : plotHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous booking or status transitions recorded for this plot yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6">
                  {plotHistory.map((h) => (
                    <div key={h.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-500 flex items-center justify-center" />
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {h.action.replace(/_/g, ' ')}
                        </span>
                        <span>{formatDate(h.actionDate)}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Buyer: {h.buyerName || 'General Release'} {h.buyerPhone ? `(${h.buyerPhone})` : ''}
                      </p>
                      {h.tokenAmount > 0 && (
                        <p className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                          Advance: {formatCurrency(h.tokenAmount)} {h.paymentMethod ? `via ${h.paymentMethod}` : ''} {h.chequeNumber ? `(Chq #${h.chequeNumber})` : ''}
                        </p>
                      )}
                      {h.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                          "{h.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end sticky bottom-0 bg-white dark:bg-slate-800 z-10">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: UPLOAD REAL ESTATE DOCUMENTS & RECEIPTS         */}
      {/* Synced with Document Repository with Date & Project Filter*/}
      {/* ======================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upload Real Estate Document or Receipt
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Synced automatically into the central Document Repository
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DTCP Layout Approval Letter, Title Deed, Buyer Token Receipt"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Category
                    </label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="DRAWING">Layout Map / Master Plan (DWG/PDF)</option>
                      <option value="PERMIT">DTCP / RERA / Statutory Approval</option>
                      <option value="CONTRACT">Title Deed / 7-12 / Khata / Patta</option>
                      <option value="RECEIPT">Buyer / Vendor Payment Receipt</option>
                      <option value="INVOICE">Tax Invoice</option>
                      <option value="OTHER">Other Land Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Date
                    </label>
                    <input
                      type="date"
                      value={docCustomDate}
                      onChange={(e) => setDocCustomDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Metadata (Searchable in Vault)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sanctioned master layout map with 100 plots, Sy No 142/2A..."
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    File Attachment (PDF, Image, DWG)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingDoc ? 'Uploading...' : 'Upload & Sync Vault'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL 8: COMPLETE LEGAL REGISTRATION AT SUB-REGISTRAR     */}
      {/* Moves status from BOOKED to REGISTERED with Deed details */}
      {/* ======================================================== */}
      {showRegisterModal && selectedPlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Complete Legal Registration at SRO
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Plot {selectedPlot.plotNumber} • Buyer: {selectedPlot.buyerName || 'Client'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteRegistration} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Financial Status Summary */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plot Price:</span>
                    <strong className="text-slate-900 dark:text-white">{formatCurrency(selectedPlot.price)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Payments Received:</span>
                    <strong className="text-emerald-600 font-mono">{formatCurrency(selectedPlot.totalReceived || selectedPlot.tokenAmount || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Balance Outstanding:</span>
                    <strong className={selectedPlot.balanceDue === 0 ? "text-emerald-600 font-mono" : "text-amber-600 font-mono"}>
                      {selectedPlot.balanceDue === 0 ? "₹0 (Fully Settled)" : formatCurrency(selectedPlot.balanceDue || 0)}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sub-Registrar Office (SRO) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SRO Kanakapura, Bangalore South"
                      value={registerForm.subRegistrarOffice}
                      onChange={(e) => setRegisterForm({ ...registerForm, subRegistrarOffice: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Registered Deed / Doc Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KNK-1-04521-2026-27"
                      value={registerForm.deedNumber}
                      onChange={(e) => setRegisterForm({ ...registerForm, deedNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={registerForm.registrationDate}
                    onChange={(e) => setRegisterForm({ ...registerForm, registrationDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Sale Deed Copy URL / Cloud Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://storage.googleapis.com/.../registered-sale-deed.pdf"
                    value={registerForm.registrationDocUrl}
                    onChange={(e) => setRegisterForm({ ...registerForm, registrationDocUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registration Remarks / EC Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Executed in Book-1, Volume 412, stamp duty paid in full..."
                    value={registerForm.registrationNotes}
                    onChange={(e) => setRegisterForm({ ...registerForm, registrationNotes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                  <p className="font-bold">📜 Final Legal Handover:</p>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    Submitting this form transitions Plot <strong>{selectedPlot.plotNumber}</strong> status to <strong>REGISTERED</strong>. The deed will be permanently archived in the project vault.
                  </p>
                </div>
              </div>

              {/* Fixed Sticky Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Registering...' : 'Complete Legal Registration'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 9: PLOT SPECIFIC & CLIENT KYC / LAND DOCUMENTS     */}
      {/* Stores buyer KYC, Aadhaar, PAN, Deeds, EC, Patta, etc.   */}
      {/* ======================================================== */}
      {showPlotDocsModal && selectedPlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Plot {selectedPlot.plotNumber} • Client KYC & Land Files
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Buyer: {selectedPlot.buyerName || 'Unassigned'} • Status: {selectedPlot.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlotDocsModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Existing Documents List */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Attached Documents & Files ({plotDocuments.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Synced with Document Vault</span>
                </h4>

                {loadingPlotDocs ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading documents...</div>
                ) : plotDocuments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    No documents attached to this plot yet. Upload buyer KYC or title deeds below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {plotDocuments.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-emerald-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{doc.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-750 font-semibold text-slate-700 dark:text-slate-300">
                                {doc.category || 'OTHER'}
                              </span>
                              <span>{formatDate(doc.createdAt)}</span>
                              {doc.fileSize && <span>({Math.round(doc.fileSize / 1024)} KB)</span>}
                            </div>
                            {doc.description && (
                              <p className="text-[11px] text-slate-500 mt-1 italic">{doc.description}</p>
                            )}
                          </div>
                        </div>

                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 rounded-lg transition"
                          >
                            View / Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Form for this Plot */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                  Upload Document for this Client / Plot
                </h4>

                <form onSubmit={handleUploadPlotDoc} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Buyer Aadhaar & PAN Card, Agreement of Sale Copy, Registered Deed, EC"
                      value={plotDocForm.title}
                      onChange={(e) => setPlotDocForm({ ...plotDocForm, title: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={plotDocForm.category}
                        onChange={(e) => setPlotDocForm({ ...plotDocForm, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="BUYER_KYC">Buyer KYC (Aadhaar / PAN / Photo)</option>
                        <option value="SALE_AGREEMENT">Sale Agreement / Booking Form</option>
                        <option value="REGISTERED_DEED">Registered Sale Deed (SRO Copy)</option>
                        <option value="EC_PATTA">Encumbrance Certificate (EC) / Patta / Khata</option>
                        <option value="PAYMENT_RECEIPT">Payment Receipt / Bank Counterfoil</option>
                        <option value="PLOT_DRAWING">Plot Sketch / Survey Dimension Map</option>
                        <option value="OTHER">Other Land Document</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Document URL / Cloud File Link
                      </label>
                      <input
                        type="text"
                        placeholder="https://.../document.pdf (or leave blank for demo)"
                        value={plotDocForm.fileUrl}
                        onChange={(e) => setPlotDocForm({ ...plotDocForm, fileUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Self-attested Aadhaar card and PAN card of buyer..."
                      value={plotDocForm.description}
                      onChange={(e) => setPlotDocForm({ ...plotDocForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Uploading...' : 'Save & Upload Document'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Fixed Sticky Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end sticky bottom-0 bg-white dark:bg-slate-800 z-10">
              <button
                type="button"
                onClick={() => setShowPlotDocsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectPlotsTab;
