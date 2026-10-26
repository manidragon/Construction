import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Worker, LabourAttendance, OfficeStaff, StaffAttendance } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Users,
  Plus,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Download,
  X,
  UserCheck,
  AlertTriangle,
  CreditCard,
  Landmark,
  Sparkles,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye,
  Edit,
  Trash2,
  Phone,
  Shield,
  Briefcase,
  Filter,
  ExternalLink,
} from 'lucide-react';

export const Labour: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const queryTab = searchParams.get('tab');

  const [projectId, setProjectId] = useState<string>(
    queryProjectId || selectedProjectId || (projects[0]?.id || '')
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Future-date validation flag
  const todayStr = new Date().toISOString().split('T')[0];
  const isFutureDate = date > todayStr;

  // Category switch: On-Site Daily Workers vs Office Staff
  const [attendanceCategory, setAttendanceCategory] = useState<'WORKERS' | 'OFFICE_STAFF'>('WORKERS');
  const [staffList, setStaffList] = useState<OfficeStaff[]>([]);
  const [staffAttendances, setStaffAttendances] = useState<StaffAttendance[]>([]);
  const [staffGridState, setStaffGridState] = useState<Record<string, { status: string; otHours: number; notes: string }>>({});
  const [staffSaveSuccess, setStaffSaveSuccess] = useState(false);

  // Date Range filter for Muster Roll & Wage Sheet
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [workerFilterSearch, setWorkerFilterSearch] = useState<string>('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [detailsWorker, setDetailsWorker] = useState<any | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendances, setAttendances] = useState<LabourAttendance[]>([]);
  const [musterRoll, setMusterRoll] = useState<any[]>([]);
  const [wagePayments, setWagePayments] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'musterRoll' | 'workers' | 'subcontractors'>(
    queryTab === 'musterRoll' || queryTab === 'muster-roll' || queryTab === 'wages'
      ? 'musterRoll'
      : queryTab === 'workers'
      ? 'workers'
      : queryTab === 'subcontractors'
      ? 'subcontractors'
      : 'attendance'
  );

  // Attendance grid local state (workerId -> status, otHours, workActivity)
  const [gridState, setGridState] = useState<Record<string, { status: string; otHours: number; activity: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Worker Modal state (Photo and Document upload)
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('Aadhaar Card');

  // Worker View / Edit / Delete state
  const [viewWorker, setViewWorker] = useState<Worker | null>(null);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [editForm, setEditForm] = useState({
    workerCode: '',
    name: '',
    phone: '',
    trade: 'MASON',
    skillLevel: 'SKILLED',
    dailyWageRate: '800',
    overtimeHourlyRate: '130',
    paymentMethod: 'CASH',
    bankAccountNo: '',
    bankIfsc: '',
    projectId: '',
  });
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editDocFile, setEditDocFile] = useState<File | null>(null);
  const [editDocType, setEditDocType] = useState<string>('Aadhaar Card');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteConfirmWorker, setDeleteConfirmWorker] = useState<Worker | null>(null);
  const [isDeletingWorker, setIsDeletingWorker] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Wage Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutModalError, setPayoutModalError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    payoutType: 'BULK', // 'BULK' | 'INDIVIDUAL'
    workerId: '',
    amount: '',
    paymentMethod: 'CASH',
    paymentAccountCode: '1010',
    paymentDate: new Date().toISOString().split('T')[0],
    wagePeriod: 'Muster Roll Wages',
    narration: '',
  });

  const openPayoutModal = (presetWorkerId?: string) => {
    let initialAmount = '';
    let initialWorkerId = presetWorkerId || '';
    let pType = presetWorkerId ? 'INDIVIDUAL' : 'BULK';

    if (presetWorkerId) {
      const rec = musterRoll.find((m) => m.worker?.id === presetWorkerId);
      if (rec) {
        // Default to balance due or gross earned
        const bal = rec.balanceDue !== undefined ? rec.balanceDue : rec.grossWageEarned;
        initialAmount = bal > 0 ? bal.toString() : rec.grossWageEarned?.toString() || '';
      }
    } else {
      const totalDue = musterRoll.reduce(
        (sum, m) => sum + (m.balanceDue !== undefined ? m.balanceDue : (m.grossWageEarned || 0) - (m.wagesGiven || 0)),
        0
      );
      initialAmount = totalDue > 0 ? totalDue.toString() : '';
    }

    setPayoutForm({
      payoutType: pType,
      workerId: initialWorkerId,
      amount: initialAmount,
      paymentMethod: 'CASH',
      paymentAccountCode: '1010',
      paymentDate: new Date().toISOString().split('T')[0],
      wagePeriod: `Muster Roll Wages (${formatDate(startDate)} to ${formatDate(endDate)})`,
      narration: '',
    });
    setPayoutModalError(null);
    setShowPayoutModal(true);
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutModalError(null);
    setIsSubmittingPayout(true);
    try {
      const res = await api.recordWagePayment({
        projectId,
        workerId: payoutForm.payoutType === 'INDIVIDUAL' ? payoutForm.workerId : undefined,
        amount: Number(payoutForm.amount),
        paymentMethod: payoutForm.paymentMethod,
        paymentAccountCode: payoutForm.paymentAccountCode,
        paymentDate: payoutForm.paymentDate,
        wagePeriod: payoutForm.wagePeriod,
        narration: payoutForm.narration,
      });

      if (res.success) {
        setShowPayoutModal(false);
        setPayoutSuccess(res.message || 'Wage disbursement successfully posted to General Ledger!');
        setTimeout(() => setPayoutSuccess(null), 6000);
        fetchData();
      }
    } catch (err: any) {
      setPayoutModalError(err.message || 'Failed to record wage disbursement');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const [workerForm, setWorkerForm] = useState({
    workerCode: '',
    name: '',
    phone: '',
    trade: 'MASON',
    skillLevel: 'SKILLED',
    dailyWageRate: '800',
    overtimeHourlyRate: '130',
    paymentMethod: 'CASH',
    projectId: '',
  });

  const openAddWorkerModal = async () => {
    setModalError(null);
    let nextCode = '';
    try {
      const res = await api.getNextWorkerCode();
      if (res.success && res.nextWorkerCode) {
        nextCode = res.nextWorkerCode;
      }
    } catch (e) {
      console.warn('Could not fetch next worker code:', e);
    }

    setWorkerForm({
      workerCode: nextCode,
      name: '',
      phone: '',
      trade: 'MASON',
      skillLevel: 'SKILLED',
      dailyWageRate: '800',
      overtimeHourlyRate: '130',
      paymentMethod: 'CASH',
      projectId: projectId || '',
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setDocumentFile(null);
    setDocumentType('Aadhaar Card');
    setShowWorkerModal(true);
  };

  const handleAutoFillCode = async () => {
    try {
      const res = await api.getNextWorkerCode();
      if (res.success && res.nextWorkerCode) {
        setWorkerForm((prev) => ({ ...prev, workerCode: res.nextWorkerCode }));
        setModalError(null);
      }
    } catch (e) {
      console.warn('Failed to fetch next worker code:', e);
    }
  };

  useEffect(() => {
    const pId = searchParams.get('projectId');
    const tab = searchParams.get('tab');
    if (pId) {
      setProjectId(pId);
      setSelectedProjectId(pId);
    } else if (selectedProjectId) {
      setProjectId(selectedProjectId);
    } else if (projects.length > 0 && (!projectId || !projects.some((p) => p.id === projectId))) {
      setProjectId(projects[0].id);
    }

    if (tab) {
      if (tab === 'musterRoll' || tab === 'muster-roll' || tab === 'wages') {
        setActiveTab('musterRoll');
      } else if (tab === 'attendance') {
        setActiveTab('attendance');
      } else if (tab === 'workers') {
        setActiveTab('workers');
      } else if (tab === 'subcontractors') {
        setActiveTab('subcontractors');
      }
    }
  }, [searchParams, selectedProjectId, projects]);

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const musterParams = new URLSearchParams({
        projectId,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(selectedWorkerId ? { workerId: selectedWorkerId } : {}),
      });

      const [wrkRes, attRes, musRes, subRes] = await Promise.all([
        api.getWorkers(`projectId=${projectId}`),
        api.getDailyAttendance(date, projectId),
        api.getMusterRoll(musterParams.toString()),
        api.getSubcontractors(),
      ]);

      if (wrkRes.success) setWorkers(wrkRes.workers || []);
      if (attRes.success) {
        setAttendances(attRes.attendances || []);
        // Map to gridState
        const gState: Record<string, any> = {};
        (attRes.attendances || []).forEach((a: any) => {
          gState[a.workerId] = {
            status: a.attendanceStatus,
            otHours: a.overtimeHours,
            activity: a.workActivity || '',
          };
        });
        setGridState(gState);
      }
      if (musRes.success) {
        setMusterRoll(musRes.records || []);
        setWagePayments(musRes.wagePayments || []);
      }
      if (subRes.success) setSubcontractors(subRes.subcontractors || []);
    } catch (err) {
      console.error('Failed to load labour records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, date, startDate, endDate, selectedWorkerId]);

  useEffect(() => {
    const handleMusterEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (detail.projectId && detail.projectId !== projectId) {
        setProjectId(detail.projectId);
      }
      if (detail.dateIso) {
        setDate(detail.dateIso);
      } else {
        fetchData();
      }
    };
    window.addEventListener('muster-attendance-updated', handleMusterEvent);
    return () => window.removeEventListener('muster-attendance-updated', handleMusterEvent);
  }, [projectId]);

  const handleSaveBulkAttendance = async () => {
    try {
      const records = workers.map((w) => {
        const state = gridState[w.id] || { status: isFutureDate ? 'ABSENT' : 'PRESENT', otHours: 0, activity: '' };
        return {
          workerId: w.id,
          attendanceStatus: state.status,
          overtimeHours: state.otHours,
          workActivity: state.activity,
        };
      });

      const res = await api.saveBulkAttendance({
        date,
        projectId,
        records,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance');
    }
  };

  const fetchStaffAttendance = async () => {
    try {
      const res = await api.getDailyStaffAttendance(date);
      if (res.success) {
        setStaffList(res.staff || []);
        setStaffAttendances(res.attendances || []);
        const sState: Record<string, any> = {};
        (res.staff || []).forEach((s: any) => {
          const existing = (res.attendances || []).find((a: any) => a.staffId === s.id);
          sState[s.id] = {
            status: existing ? existing.attendanceStatus : (isFutureDate ? 'LEAVE' : 'PRESENT'),
            otHours: existing ? existing.overtimeHours : 0,
            notes: existing ? existing.notes || '' : '',
          };
        });
        setStaffGridState(sState);
      }
    } catch (e) {
      console.error('Failed to load staff attendance:', e);
    }
  };

  useEffect(() => {
    fetchStaffAttendance();
  }, [date, isFutureDate]);

  const handleSaveBulkStaffAttendance = async () => {
    try {
      const records = staffList.map((s) => {
        const state = staffGridState[s.id] || {
          status: isFutureDate ? 'LEAVE' : 'PRESENT',
          otHours: 0,
          notes: '',
        };
        return {
          staffId: s.id,
          attendanceStatus: state.status,
          overtimeHours: state.otHours,
          notes: state.notes,
        };
      });

      const res = await api.saveBulkStaffAttendance({
        date,
        records,
      });

      if (res.success) {
        setStaffSaveSuccess(true);
        setTimeout(() => setStaffSaveSuccess(false), 3000);
        fetchStaffAttendance();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save office staff attendance');
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmittingWorker(true);
    try {
      const formData = new FormData();
      formData.append('workerCode', workerForm.workerCode);
      formData.append('name', workerForm.name);
      formData.append('phone', workerForm.phone || '');
      formData.append('trade', workerForm.trade);
      formData.append('skillLevel', workerForm.skillLevel);
      formData.append('dailyWageRate', workerForm.dailyWageRate);
      formData.append('overtimeHourlyRate', workerForm.overtimeHourlyRate);
      formData.append('paymentMethod', workerForm.paymentMethod);
      formData.append('projectId', projectId);
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      if (documentFile) {
        formData.append('document', documentFile);
        formData.append('documentName', `${documentType} - ${documentFile.name}`);
      }

      const res = await api.createWorker(formData);
      if (res.success) {
        setShowWorkerModal(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setDocumentFile(null);
        fetchData();
        setWorkerForm({
          workerCode: '',
          name: '',
          phone: '',
          trade: 'MASON',
          skillLevel: 'SKILLED',
          dailyWageRate: '800',
          overtimeHourlyRate: '130',
          paymentMethod: 'CASH',
          projectId: '',
        });
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to create worker');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  const handleOpenViewWorker = (w: Worker) => {
    setViewWorker(w);
  };

  const handleOpenEditWorker = (w: Worker) => {
    setEditWorker(w);
    setEditForm({
      workerCode: w.workerCode || '',
      name: w.name || '',
      phone: w.phone || '',
      trade: w.trade || 'MASON',
      skillLevel: w.skillLevel || 'SKILLED',
      dailyWageRate: String(w.dailyWageRate || '800'),
      overtimeHourlyRate: String(w.overtimeHourlyRate || '130'),
      paymentMethod: w.paymentMethod || 'CASH',
      bankAccountNo: (w as any).bankAccountNo || '',
      bankIfsc: (w as any).bankIfsc || '',
      projectId: w.projectId || projectId || '',
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(w.photoUrl || null);
    setEditDocFile(null);
    setEditDocType((w as any).documentName?.split(' - ')[0] || 'Aadhaar Card');
    setEditError(null);
  };

  const handleSaveEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorker) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      const formData = new FormData();
      formData.append('workerCode', editForm.workerCode);
      formData.append('name', editForm.name);
      formData.append('phone', editForm.phone || '');
      formData.append('trade', editForm.trade);
      formData.append('skillLevel', editForm.skillLevel);
      formData.append('dailyWageRate', editForm.dailyWageRate);
      formData.append('overtimeHourlyRate', editForm.overtimeHourlyRate);
      formData.append('paymentMethod', editForm.paymentMethod);
      formData.append('bankAccountNo', editForm.bankAccountNo || '');
      formData.append('bankIfsc', editForm.bankIfsc || '');
      formData.append('projectId', editForm.projectId || projectId);
      if (editPhotoFile) {
        formData.append('photo', editPhotoFile);
      }
      if (editDocFile) {
        formData.append('document', editDocFile);
        formData.append('documentName', `${editDocType} - ${editDocFile.name}`);
      }

      const res = await api.updateWorker(editWorker.id, formData);
      if (res.success) {
        setEditWorker(null);
        setActionSuccessMsg(`Worker ${editForm.name} updated successfully!`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        fetchData();
      } else {
        setEditError(res.message || 'Failed to update worker.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error updating worker.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDeleteWorker = async () => {
    if (!deleteConfirmWorker) return;
    setIsDeletingWorker(true);
    try {
      const res = await api.deleteWorker(deleteConfirmWorker.id);
      if (res.success) {
        setActionSuccessMsg(res.message || `Worker ${deleteConfirmWorker.name} removed successfully.`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        setDeleteConfirmWorker(null);
        fetchData();
      } else {
        alert(res.message || 'Failed to delete worker.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete worker.');
    } finally {
      setIsDeletingWorker(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Labour, Workforce & Muster Roll
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daily site muster roll attendance, overtime tracking, automated wage calculations, and subcontractor ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER') && (
            <button
              onClick={() => openPayoutModal()}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <CreditCard className="w-4 h-4 text-emerald-200" />
              <span>Record Wage Payout</span>
            </button>
          )}

          {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER') && (
            <button
              onClick={openAddWorkerModal}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Project & Date Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <label className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">Project:</label>
            <select
              value={projectId}
              onChange={(e) => {
                const newId = e.target.value;
                setProjectId(newId);
                setSelectedProjectId(newId);
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set('projectId', newId);
                  return p;
                });
              }}
              className="text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm min-w-[280px] sm:min-w-[340px] md:min-w-[400px] cursor-pointer transition"
            >
              {projects.length === 0 && <option value="">Loading projects...</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {activeTab === 'attendance' && hasRole('OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER') && (
          <button
            onClick={attendanceCategory === 'WORKERS' ? handleSaveBulkAttendance : handleSaveBulkStaffAttendance}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>
              {attendanceCategory === 'WORKERS'
                ? `Save Worker Attendance for ${formatDate(date)}`
                : `Save Staff Attendance for ${formatDate(date)}`}
            </span>
          </button>
        )}
      </div>

      {isFutureDate && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 font-semibold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Future Date Selected ({formatDate(date)}):</strong> Marking "Present" or "Half-Day" in advance is blocked by compliance policy. You may pre-approve planned leaves, paid leaves, or official holidays only.
          </span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Daily site attendance registered and wages computed successfully for {workers.length} workers!</span>
        </div>
      )}

      {staffSaveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Office staff attendance successfully recorded and synchronized with monthly payroll ledger!</span>
        </div>
      )}

      {payoutSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{payoutSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'attendance', label: `Daily Attendance Register`, icon: UserCheck },
          { id: 'musterRoll', label: `Muster Roll & Wage Sheet (${musterRoll.length})`, icon: Clock },
          { id: 'workers', label: `Worker Master Directory (${workers.length})`, icon: Users },
          { id: 'subcontractors', label: `Subcontractors (${subcontractors.length})`, icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.set('tab', t.id);
                return p;
              });
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === t.id
                ? 'bg-slate-900 text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Daily Bulk Attendance */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          {/* Category Switcher: Site Workers vs Office Staff */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setAttendanceCategory('WORKERS')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
                  attendanceCategory === 'WORKERS'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👷 Site Daily Workers ({workers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceCategory('OFFICE_STAFF')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
                  attendanceCategory === 'OFFICE_STAFF'
                    ? 'bg-slate-900 text-amber-400 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>🏢 Office Staff / Salaried ({staffList.length})</span>
              </button>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500">
                Attendance Date: <strong className="text-slate-800 font-bold">{formatDate(date)}</strong>
              </span>
              {isFutureDate && (
                <span className="block text-[11px] text-amber-700 font-bold">Planned Absence Approval Mode</span>
              )}
            </div>
          </div>

          {attendanceCategory === 'WORKERS' ? (
            /* Workers Attendance Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Worker Name</th>
                    <th className="py-3 px-3">Trade</th>
                    <th className="py-3 px-3 text-right">Daily Rate</th>
                    <th className="py-3 px-3 text-center">Attendance Status</th>
                    <th className="py-3 px-3 text-center">OT Hours</th>
                    <th className="py-3 px-3">Work Activity</th>
                    <th className="py-3 px-3 text-right">Computed Wage (₹)</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No active site workers found for this project.
                      </td>
                    </tr>
                  ) : (
                    workers.map((w) => {
                      const state = gridState[w.id] || {
                        status: isFutureDate ? 'ABSENT' : 'PRESENT',
                        otHours: 0,
                        activity: '',
                      };
                      let regWage = state.status === 'PRESENT' ? w.dailyWageRate : state.status === 'HALF_DAY' ? w.dailyWageRate / 2 : 0;
                      let otWage = (state.otHours || 0) * w.overtimeHourlyRate;
                      let total = regWage + otWage;

                      return (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">{w.workerCode}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2.5">
                              {w.photoUrl ? (
                                <img
                                  src={w.photoUrl}
                                  alt={w.name}
                                  className="w-7 h-7 rounded-full object-cover border border-amber-400 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {w.name?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="font-bold text-slate-900">{w.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {w.trade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold">₹{w.dailyWageRate}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 space-x-1">
                              {['PRESENT', 'HALF_DAY', 'ABSENT'].map((st) => {
                                const isBlockedFuture = isFutureDate && (st === 'PRESENT' || st === 'HALF_DAY');
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    disabled={isBlockedFuture}
                                    onClick={() => {
                                      if (isBlockedFuture) return;
                                      setGridState({
                                        ...gridState,
                                        [w.id]: { ...state, status: st },
                                      });
                                    }}
                                    title={isBlockedFuture ? 'Cannot mark Present/Half-day in advance' : st}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                                      isBlockedFuture
                                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                                        : state.status === st
                                        ? st === 'PRESENT'
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : st === 'HALF_DAY'
                                          ? 'bg-amber-500 text-white shadow-sm'
                                          : 'bg-red-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {st === 'PRESENT' ? 'P' : st === 'HALF_DAY' ? 'HD' : 'A'}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="8"
                              disabled={isFutureDate}
                              value={state.otHours}
                              onChange={(e) => {
                                setGridState({
                                  ...gridState,
                                  [w.id]: { ...state, otHours: Number(e.target.value) },
                                });
                              }}
                              className="w-14 text-center text-xs p-1 bg-white border border-slate-200 rounded font-mono font-bold disabled:bg-slate-100 disabled:opacity-50"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              placeholder={isFutureDate ? 'Planned leave approval reason' : 'e.g. 8th slab rebar tying'}
                              value={state.activity}
                              onChange={(e) => {
                                setGridState({
                                  ...gridState,
                                  [w.id]: { ...state, activity: e.target.value },
                                });
                              }}
                              className="w-full text-xs p-1 bg-white border border-slate-200 rounded"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(total)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenViewWorker(w)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                                title="View Worker Dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditWorker(w)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition"
                                  title="Edit Worker Details"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER') && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmWorker(w)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                                  title="Delete Worker"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Office Staff Attendance Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Staff Name & Category</th>
                    <th className="py-3 px-3">Designation</th>
                    <th className="py-3 px-3 text-right">Fixed Monthly (₹)</th>
                    <th className="py-3 px-3 text-center">Attendance Status</th>
                    <th className="py-3 px-3 text-center">OT Hours</th>
                    <th className="py-3 px-3">Assignment / Reason</th>
                    <th className="py-3 px-3 text-right">Day Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No office staff members registered yet.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((stf) => {
                      const state = staffGridState[stf.id] || {
                        status: isFutureDate ? 'LEAVE' : 'PRESENT',
                        otHours: 0,
                        notes: '',
                      };
                      const perDayRate = (stf.fixedSalary || 0) / 30;
                      let dayEarned = 0;
                      if (state.status === 'PRESENT' || state.status === 'PAID_LEAVE' || state.status === 'HOLIDAY') {
                        dayEarned = perDayRate;
                      } else if (state.status === 'HALF_DAY') {
                        dayEarned = perDayRate / 2;
                      }
                      const hourlyRate = (stf.fixedSalary || 0) / (26 * 8);
                      const otEarned = (state.otHours || 0) * hourlyRate * 1.5;
                      const dayTotal = Math.round(dayEarned + otEarned);

                      return (
                        <tr key={stf.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">{stf.staffCode}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{stf.name}</span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              {stf.roleCategory.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">{stf.designation}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(stf.fixedSalary || 0)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 space-x-1">
                              {[
                                { key: 'PRESENT', label: 'P', title: 'Present' },
                                { key: 'HALF_DAY', label: 'HD', title: 'Half Day' },
                                { key: 'PAID_LEAVE', label: 'PL', title: 'Paid Leave' },
                                { key: 'LEAVE', label: 'L', title: 'Leave (Unpaid)' },
                                { key: 'HOLIDAY', label: 'H', title: 'Holiday' },
                                { key: 'ABSENT', label: 'A', title: 'Absent' },
                              ].map((option) => {
                                const isBlockedFuture = isFutureDate && (option.key === 'PRESENT' || option.key === 'HALF_DAY');
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    disabled={isBlockedFuture}
                                    onClick={() => {
                                      if (isBlockedFuture) return;
                                      setStaffGridState({
                                        ...staffGridState,
                                        [stf.id]: { ...state, status: option.key },
                                      });
                                    }}
                                    title={isBlockedFuture ? 'Cannot mark Present/Half-day in advance' : option.title}
                                    className={`px-1.5 py-1 text-[10px] font-bold rounded-md transition ${
                                      isBlockedFuture
                                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                                        : state.status === option.key
                                        ? option.key === 'PRESENT'
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : option.key === 'HALF_DAY'
                                          ? 'bg-amber-500 text-white shadow-sm'
                                          : option.key === 'PAID_LEAVE'
                                          ? 'bg-blue-600 text-white shadow-sm'
                                          : option.key === 'HOLIDAY'
                                          ? 'bg-purple-600 text-white shadow-sm'
                                          : option.key === 'LEAVE'
                                          ? 'bg-orange-500 text-white shadow-sm'
                                          : 'bg-red-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="8"
                              disabled={isFutureDate}
                              value={state.otHours}
                              onChange={(e) => {
                                setStaffGridState({
                                  ...staffGridState,
                                  [stf.id]: { ...state, otHours: Number(e.target.value) },
                                });
                              }}
                              className="w-14 text-center text-xs p-1 bg-white border border-slate-200 rounded font-mono font-bold disabled:bg-slate-100 disabled:opacity-50"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              placeholder={isFutureDate ? 'Planned leave reason / approval' : 'e.g. Design reviews & BOQ audit'}
                              value={state.notes}
                              onChange={(e) => {
                                setStaffGridState({
                                  ...staffGridState,
                                  [stf.id]: { ...state, notes: e.target.value },
                                });
                              }}
                              className="w-full text-xs p-1 bg-white border border-slate-200 rounded"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(dayTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Muster Roll & Wage Sheet */}
      {activeTab === 'musterRoll' && (() => {
        const filteredMusterRoll = musterRoll.filter((m) => {
          if (!workerFilterSearch) return true;
          const q = workerFilterSearch.toLowerCase();
          return (
            m.worker?.name?.toLowerCase().includes(q) ||
            m.worker?.workerCode?.toLowerCase().includes(q) ||
            m.worker?.trade?.toLowerCase().includes(q)
          );
        });

        const totalGross = filteredMusterRoll.reduce((sum, m) => sum + (m.grossWageEarned || 0), 0);
        const totalWagesGiven = filteredMusterRoll.reduce((sum, m) => sum + (m.wagesGiven || 0), 0);
        const totalReg = filteredMusterRoll.reduce((sum, m) => sum + (m.totalRegularWage || 0), 0);
        const totalOt = filteredMusterRoll.reduce((sum, m) => sum + (m.totalOtWage || 0), 0);
        const totalOtHours = filteredMusterRoll.reduce((sum, m) => sum + (m.totalOtHours || 0), 0);
        const totalDaysWorked = filteredMusterRoll.reduce(
          (sum, m) => sum + (m.daysWorked !== undefined ? m.daysWorked : (m.presentDays || 0) + (m.halfDays || 0) * 0.5),
          0
        );
        const totalAbsentDays = filteredMusterRoll.reduce((sum, m) => sum + (m.absentDays || 0), 0);
        const totalBalanceDue = filteredMusterRoll.reduce(
          (sum, m) => sum + (m.balanceDue !== undefined ? m.balanceDue : (m.grossWageEarned || 0) - (m.wagesGiven || 0)),
          0
        );

        return (
          <div className="space-y-4">
            {/* Filter Bar: From Date, To Date & Quick Presets */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-bold">
                    <Filter className="w-4 h-4 text-amber-600" />
                    <span>Wage Filter Period:</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <label className="text-[11px] font-bold text-slate-500">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs bg-transparent font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <label className="text-[11px] font-bold text-slate-500">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs bg-transparent font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                      const today = now.toISOString().split('T')[0];
                      setStartDate(first);
                      setEndDate(today);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                      const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                      setStartDate(first);
                      setEndDate(last);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      const today = now.toISOString().split('T')[0];
                      setStartDate(past);
                      setEndDate(today);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('2024-01-01');
                      setEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Worker Search Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Filter workers in muster roll by name, code, or trade..."
                  value={workerFilterSearch}
                  onChange={(e) => setWorkerFilterSearch(e.target.value)}
                  className="w-full sm:w-96 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Showing {filteredMusterRoll.length} of {musterRoll.length} Workers • {formatDate(startDate)} to {formatDate(endDate)}
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Gross Wages Earned</span>
                <h4 className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{formatCurrency(totalGross)}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Regular + Overtime for period</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Wages Given / Paid</span>
                <h4 className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">{formatCurrency(totalWagesGiven)}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Disbursed wage payments in period</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Days Worked</span>
                <h4 className="text-xl font-extrabold text-blue-600 mt-1 font-mono">{totalDaysWorked} Days</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Across registered project workers</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Absent Days</span>
                <h4 className="text-xl font-extrabold text-rose-600 mt-1 font-mono">{totalAbsentDays} Days</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Recorded absences in period</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Worker Attendance, Days Worked, Absent Days & Wages Given
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive ledger per worker from {formatDate(startDate)} to {formatDate(endDate)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {hasRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER') && (
                    <button
                      onClick={() => openPayoutModal()}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Disburse Wages</span>
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Worker Code & Name</th>
                      <th className="py-3 px-3">Trade & Rate</th>
                      <th className="py-3 px-3 text-center">Days Worked</th>
                      <th className="py-3 px-3 text-center">Absent Days</th>
                      <th className="py-3 px-3 text-center">OT Hours</th>
                      <th className="py-3 px-3 text-right">Wages Earned</th>
                      <th className="py-3 px-3 text-right">Wages Given (Paid)</th>
                      <th className="py-3 px-3 text-right">Balance Due</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMusterRoll.map((m: any, idx) => {
                      const daysWorked = m.daysWorked !== undefined ? m.daysWorked : (m.presentDays || 0) + (m.halfDays || 0) * 0.5;
                      const absentDays = m.absentDays || 0;
                      const wagesGiven = m.wagesGiven || 0;
                      const balanceDue = m.balanceDue !== undefined ? m.balanceDue : (m.grossWageEarned || 0) - wagesGiven;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          {/* Worker Code & Name */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2.5">
                              {m.worker?.photoUrl ? (
                                <img
                                  src={m.worker.photoUrl}
                                  alt={m.worker.name}
                                  className="w-8 h-8 rounded-full object-cover border border-amber-400 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {m.worker?.name?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 block">{m.worker?.name}</span>
                                <span className="font-mono text-[11px] text-slate-500">{m.worker?.workerCode}</span>
                              </div>
                            </div>
                          </td>

                          {/* Trade & Rate */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {m.worker?.trade}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                              ₹{m.worker?.dailyWageRate}/day
                            </span>
                          </td>

                          {/* Days Worked */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs inline-block font-mono">
                              {daysWorked} Days
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                              {m.presentDays || 0} Full + {m.halfDays || 0} Half
                            </span>
                          </td>

                          {/* Absent Days */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-extrabold px-2.5 py-1 rounded-lg border text-xs inline-block font-mono ${
                                absentDays > 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              {absentDays} Days
                            </span>
                          </td>

                          {/* OT Hours */}
                          <td className="py-3 px-3 text-center font-mono text-slate-700 font-semibold">
                            {m.totalOtHours || 0} hrs
                          </td>

                          {/* Wages Earned */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(m.grossWageEarned || 0)}
                          </td>

                          {/* Wages Given (Paid) */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(wagesGiven)}
                          </td>

                          {/* Balance Due */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            <span className={balanceDue > 0 ? 'text-amber-700' : 'text-slate-500'}>
                              {formatCurrency(balanceDue)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailsWorker(m)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 flex items-center space-x-1 transition"
                                title="View detailed date-by-date attendance and list of wages given"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                                <span>Wage History</span>
                              </button>

                              {hasRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER') && (
                                <button
                                  type="button"
                                  onClick={() => openPayoutModal(m.worker?.id)}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 transition"
                                  title="Disburse wages for this worker"
                                >
                                  Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-900">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-left uppercase text-[11px] tracking-wider text-slate-600">
                        Total Period Summary
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-800">{totalDaysWorked} Days</td>
                      <td className="py-3 px-3 text-center font-mono text-rose-800">{totalAbsentDays} Days</td>
                      <td className="py-3 px-3 text-center font-mono">{totalOtHours} hrs</td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(totalGross)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700">
                        {formatCurrency(totalWagesGiven)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-700">
                        {formatCurrency(totalBalanceDue)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 3: Workers Master */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workers.map((w) => {
            const mRecord = musterRoll.find((m) => m.worker?.id === w.id) || {
              worker: w,
              daysWorked: 0,
              presentDays: 0,
              halfDays: 0,
              absentDays: 0,
              totalRegularWage: 0,
              totalOtWage: 0,
              grossWageEarned: 0,
              wagesGiven: 0,
              balanceDue: 0,
              paymentsList: [],
              attendancesList: [],
            };

            return (
              <div key={w.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {w.photoUrl ? (
                        <img
                          src={w.photoUrl}
                          alt={w.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {w.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">{w.name}</h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {w.workerCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {w.skillLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Trade:</span>
                      <span className="font-bold text-amber-700">{w.trade}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Phone:</span>
                      <span className="font-semibold text-slate-800">{w.phone || '—'}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Payment Method:</span>
                      <span className="font-semibold text-slate-800">{w.paymentMethod}</span>
                    </p>
                  </div>

                  {/* Uploaded Document / ID Proof */}
                  {w.documentUrl && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <a
                        href={w.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition w-full justify-between"
                        title="Click to view/download worker document"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{w.documentName || 'Worker ID Proof'}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Wage Rates:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{w.dailyWageRate}/day • OT ₹{w.overtimeHourlyRate}/hr
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenViewWorker(w)}
                      className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-center space-x-1 transition"
                      title="View Worker Profile"
                    >
                      <Eye className="w-3 h-3 text-blue-600" />
                      <span>View</span>
                    </button>
                    {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditWorker(w)}
                        className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 flex items-center justify-center space-x-1 transition"
                        title="Edit Worker"
                      >
                        <Edit className="w-3 h-3 text-amber-600" />
                        <span>Edit</span>
                      </button>
                    )}
                    {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER') && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmWorker(w)}
                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg border border-rose-200 flex items-center justify-center space-x-1 transition"
                        title="Delete Worker"
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailsWorker(mRecord)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 flex items-center justify-center space-x-1 transition"
                    >
                      <span>Ledger</span>
                    </button>
                    {hasRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER') && (
                      <button
                        type="button"
                        onClick={() => openPayoutModal(w.id)}
                        className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Subcontractors */}
      {activeTab === 'subcontractors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subcontractors.map((sub) => (
            <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{sub.name}</span>
                  <span className="font-mono text-xs text-slate-400">{sub.gstin || 'No GST'}</span>
                </div>
                <p className="text-xs text-amber-600 font-semibold mt-1">Specialization: {sub.trade}</p>
                <p className="text-xs text-slate-500 mt-2">Contact: {sub.contactPerson} ({sub.phone})</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Outstanding Payable:</span>
                <strong className="text-sm font-extrabold text-rose-600 font-mono">
                  {formatCurrency(sub.currentBalance)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Worker Modal */}
      {showWorkerModal && (() => {
        const duplicateWorker = workers.find(
          (w) => w.workerCode.trim().toLowerCase() === workerForm.workerCode.trim().toLowerCase()
        );

        return (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add Construction Worker</h3>
                    <p className="text-[11px] text-slate-500">Register new labourer with optional photo & ID proof</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWorkerModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p className="font-semibold">{modalError}</p>
                    {modalError.toLowerCase().includes('already in use') && (
                      <button
                        type="button"
                        onClick={handleAutoFillCode}
                        className="mt-1 text-xs text-rose-800 underline font-bold"
                      >
                        Click to fetch next available code
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateWorker} className="mt-4 space-y-4">
                {/* Photo & ID Proof Row (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Worker Photo</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </label>

                    {photoPreview ? (
                      <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200">
                        <img
                          src={photoPreview}
                          alt="Worker Preview"
                          className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{photoFile?.name}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">Photo Attached</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white rounded-lg p-3 cursor-pointer transition text-center group">
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-500 mb-1" />
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-700">Upload Photo</span>
                        <span className="text-[9px] text-slate-400">JPG, PNG (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPhotoFile(file);
                              setPhotoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Document / ID Proof Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Worker Document / ID Proof</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </label>

                    {documentFile ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-200">
                          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-amber-700 block">{documentType}</span>
                            <p className="text-xs font-semibold text-slate-800 truncate">{documentFile.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocumentFile(null)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Remove document"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <select
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                          className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700"
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="Labour License / Gate Pass">Labour License / Gate Pass</option>
                          <option value="Bank Passbook">Bank Passbook</option>
                          <option value="Driver's License">Driver's License</option>
                          <option value="Worker ID / Bio">Worker ID / Bio</option>
                        </select>
                        <label className="flex items-center justify-center space-x-1.5 border border-dashed border-slate-200 hover:border-amber-400 bg-white rounded-lg p-2 cursor-pointer transition text-center group">
                          <Upload className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                          <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-700">Attach Document</span>
                          <span className="text-[9px] text-slate-400">(PDF, Images)</span>
                          <input
                            type="file"
                            accept=".pdf,image/*,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setDocumentFile(file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Worker Code *</label>
                      <button
                        type="button"
                        onClick={handleAutoFillCode}
                        className="text-[10px] text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1"
                        title="Generate next sequential worker code"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-fill next</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="WRK-009"
                      value={workerForm.workerCode}
                      onChange={(e) => {
                        setWorkerForm({ ...workerForm, workerCode: e.target.value });
                        if (modalError) setModalError(null);
                      }}
                      className={`w-full text-xs p-2 bg-slate-50 border rounded-lg font-mono font-bold ${
                        duplicateWorker ? 'border-amber-500 bg-amber-50/40 text-amber-900' : 'border-slate-200'
                      }`}
                    />
                    {duplicateWorker && (
                      <p className="text-[10px] text-amber-700 font-semibold mt-1">
                        ⚠️ Already used by {duplicateWorker.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Mohan Lal"
                      value={workerForm.name}
                      onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Trade *</label>
                    <select
                      value={workerForm.trade}
                      onChange={(e) => setWorkerForm({ ...workerForm, trade: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="MASON">Mason</option>
                      <option value="BARBENDER">Bar Bender</option>
                      <option value="CARPENTER">Carpenter / Shuttering</option>
                      <option value="HELPER">Helper (Unskilled)</option>
                      <option value="OPERATOR">Plant / Crane Operator</option>
                      <option value="ELECTRICIAN">Electrician</option>
                      <option value="PLUMBER">Plumber</option>
                      <option value="PAINTER">Painter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Skill Category</label>
                    <select
                      value={workerForm.skillLevel}
                      onChange={(e) => setWorkerForm({ ...workerForm, skillLevel: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="SKILLED">Skilled</option>
                      <option value="SEMI_SKILLED">Semi-Skilled</option>
                      <option value="UNSKILLED">Unskilled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Daily Wage Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      value={workerForm.dailyWageRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, dailyWageRate: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Overtime Hourly Rate (₹)</label>
                    <input
                      type="number"
                      value={workerForm.overtimeHourlyRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, overtimeHourlyRate: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98450 11223"
                      value={workerForm.phone}
                      onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={workerForm.paymentMethod}
                      onChange={(e) => setWorkerForm({ ...workerForm, paymentMethod: e.target.value })}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="CASH">Cash in Hand</option>
                      <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowWorkerModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWorker || !!duplicateWorker}
                    className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    {isSubmittingWorker ? 'Saving Worker...' : 'Save Worker'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
      {/* Record Wage Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Labour Wage Payout</h3>
                  <p className="text-[11px] text-slate-500">Disburse daily or bulk wages & auto-post to Accounts</p>
                </div>
              </div>
              <button onClick={() => setShowPayoutModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {payoutModalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <p className="font-semibold">{payoutModalError}</p>
              </div>
            )}

            <form onSubmit={handleRecordPayout} className="mt-4 space-y-4">
              {/* Payout Type */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    const totalDue = musterRoll.reduce(
                      (sum, m) => sum + (m.balanceDue !== undefined ? m.balanceDue : (m.grossWageEarned || 0) - (m.wagesGiven || 0)),
                      0
                    );
                    setPayoutForm({
                      ...payoutForm,
                      payoutType: 'BULK',
                      workerId: '',
                      amount: totalDue > 0 ? totalDue.toString() : payoutForm.amount,
                    });
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    payoutForm.payoutType === 'BULK'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bulk Payout (All Workers)
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutForm({ ...payoutForm, payoutType: 'INDIVIDUAL' })}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    payoutForm.payoutType === 'INDIVIDUAL'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Individual Worker Payout
                </button>
              </div>

              {/* Individual Worker Selector */}
              {payoutForm.payoutType === 'INDIVIDUAL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Worker *</label>
                  <select
                    value={payoutForm.workerId}
                    onChange={(e) => {
                      const wId = e.target.value;
                      const rec = musterRoll.find((m) => m.worker?.id === wId);
                      setPayoutForm({
                        ...payoutForm,
                        workerId: wId,
                        amount: rec ? rec.grossWageEarned.toString() : payoutForm.amount,
                      });
                    }}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">-- Choose Worker --</option>
                    {workers.map((w) => {
                      const rec = musterRoll.find((m) => m.worker?.id === w.id);
                      return (
                        <option key={w.id} value={w.id}>
                          [{w.workerCode}] {w.name} ({w.trade}) — ₹{rec ? rec.grossWageEarned : 0} earned
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount to Pay (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 6800"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payoutForm.paymentDate}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentDate: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  />
                </div>
              </div>

              {/* Payment Account / Source */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paid From (Credit Account) *</label>
                <select
                  value={payoutForm.paymentAccountCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    let method = 'CASH';
                    if (code === '1030' || code === '1040') method = 'BANK_TRANSFER';
                    else if (code === '1020') method = 'PETTY_CASH';
                    setPayoutForm({
                      ...payoutForm,
                      paymentAccountCode: code,
                      paymentMethod: method,
                    });
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="1010">[1010] Cash in Hand (Main Cash / Daily Wages)</option>
                  <option value="1020">[1020] Site Petty Cash Float (Site Imprest Cash)</option>
                  <option value="1030">[1030] HDFC Current Account (Operating Bank Transfer / UPI)</option>
                  <option value="1040">[1040] SBI Project Escrow Account</option>
                </select>
              </div>

              {/* Memo / Narration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Narration / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly muster roll wage payout for 8 masons & helpers"
                  value={payoutForm.narration}
                  onChange={(e) => setPayoutForm({ ...payoutForm, narration: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Accounting Explanatory Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                  <Landmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>Automatic Double-Entry Journal</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Debit: <strong>[5020] Direct Labour Wages</strong> (₹{payoutForm.amount || '0'})<br />
                  Credit: <strong>[{payoutForm.paymentAccountCode}] Paid From Account</strong> (₹{payoutForm.amount || '0'})
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout || !payoutForm.amount || Number(payoutForm.amount) <= 0}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  {isSubmittingPayout ? 'Posting to Accounts...' : 'Confirm & Post to Accounts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Worker Wage History, Days Worked, Absent Days & List of Wages Given */}
      {detailsWorker && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-3.5">
                {detailsWorker.worker?.photoUrl ? (
                  <img
                    src={detailsWorker.worker.photoUrl}
                    alt={detailsWorker.worker.name}
                    className="w-13 h-13 rounded-full object-cover border-2 border-amber-500 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center justify-center text-sm shrink-0">
                    {detailsWorker.worker?.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">{detailsWorker.worker?.name}</h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                      {detailsWorker.worker?.workerCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {detailsWorker.worker?.trade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Wage & Attendance Period: <strong className="text-slate-700">{formatDate(startDate)}</strong> to{' '}
                    <strong className="text-slate-700">{formatDate(endDate)}</strong> • Daily Rate: ₹{detailsWorker.worker?.dailyWageRate} • Phone: {detailsWorker.worker?.phone || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {detailsWorker.worker?.documentUrl && (
                  <a
                    href={detailsWorker.worker.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                    title="Click to view worker identity document"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span className="truncate max-w-[140px]">{detailsWorker.worker.documentName || 'ID Document'}</span>
                    <ExternalLink className="w-3 h-3 text-amber-500" />
                  </a>
                )}
                <button
                  onClick={() => setDetailsWorker(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white">
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Days Worked</span>
                <span className="text-lg font-extrabold text-emerald-800 font-mono">
                  {detailsWorker.daysWorked !== undefined ? detailsWorker.daysWorked : (detailsWorker.presentDays || 0) + (detailsWorker.halfDays || 0) * 0.5} Days
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                  {detailsWorker.presentDays || 0} Full + {detailsWorker.halfDays || 0} Half
                </span>
              </div>

              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Absent Days</span>
                <span className="text-lg font-extrabold text-rose-700 font-mono">
                  {detailsWorker.absentDays || 0} Days
                </span>
                <span className="text-[10px] text-rose-500 block mt-0.5 font-medium">
                  {detailsWorker.leaveDays || 0} Leave Day(s)
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Wages Earned</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono">
                  {formatCurrency(detailsWorker.grossWageEarned || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                  Reg ₹{detailsWorker.totalRegularWage || 0} + OT ₹{detailsWorker.totalOtWage || 0}
                </span>
              </div>

              <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Wages Given (Paid)</span>
                <span className="text-lg font-extrabold text-emerald-600 font-mono">
                  {formatCurrency(detailsWorker.wagesGiven || 0)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                  {detailsWorker.paymentsList?.length || 0} payment voucher(s)
                </span>
              </div>

              <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Balance Due</span>
                <span
                  className={`text-lg font-extrabold font-mono ${
                    (detailsWorker.balanceDue || 0) > 0 ? 'text-amber-800' : 'text-slate-600'
                  }`}
                >
                  {formatCurrency(detailsWorker.balanceDue !== undefined ? detailsWorker.balanceDue : (detailsWorker.grossWageEarned || 0) - (detailsWorker.wagesGiven || 0))}
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                  {(detailsWorker.balanceDue || 0) > 0 ? 'Pending payout' : 'Fully settled'}
                </span>
              </div>
            </div>

            {/* Scrollable Body: List of Wages Given & Daily Attendance */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-white">
              {/* Section 1: List of Wages Given / Paid */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>List of Wages Given (Paid) to {detailsWorker.worker?.name}</span>
                  </h4>
                  <span className="text-xs font-bold font-mono text-emerald-700">
                    Total Wages Given: {formatCurrency(detailsWorker.wagesGiven || 0)}
                  </span>
                </div>

                {detailsWorker.paymentsList && detailsWorker.paymentsList.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Voucher / Ref No.</th>
                          <th className="py-2.5 px-3">Payment Method</th>
                          <th className="py-2.5 px-3">Period / Narration</th>
                          <th className="py-2.5 px-3 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {detailsWorker.paymentsList.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{formatDate(p.paymentDate)}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{p.referenceNo || '—'}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {p.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {p.wagePeriod || p.narration || 'Wage disbursement'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    No wage disbursements recorded for this worker between {formatDate(startDate)} and {formatDate(endDate)}.
                  </div>
                )}
              </div>

              {/* Section 2: Daily Attendance & Wage Records */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Daily Attendance Log & Wage Computation</span>
                  </h4>
                  <span className="text-xs font-bold font-mono text-slate-700">
                    {detailsWorker.attendancesList?.length || 0} log entries
                  </span>
                </div>

                {detailsWorker.attendancesList && detailsWorker.attendancesList.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Regular Hrs</th>
                          <th className="py-2.5 px-3 text-center">OT Hrs</th>
                          <th className="py-2.5 px-3 text-right">Daily Wage</th>
                          <th className="py-2.5 px-3 text-right">OT Wage</th>
                          <th className="py-2.5 px-3 text-right">Total Wage Earned</th>
                          <th className="py-2.5 px-3">Work Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {detailsWorker.attendancesList.map((a: any, idx: number) => {
                          const statusColor =
                            a.attendanceStatus === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : a.attendanceStatus === 'HALF_DAY'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : a.attendanceStatus === 'ABSENT'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200';

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{formatDate(a.date)}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                                  {a.attendanceStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">{a.regularHours || 0}h</td>
                              <td className="py-2.5 px-3 text-center font-mono">{a.overtimeHours || 0}h</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {formatCurrency(a.wageCalculated || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {formatCurrency(a.overtimeWage || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(a.totalWageEarned || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 italic">{a.workActivity || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    No daily attendance logged in this period.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200 bg-white rounded-lg font-bold border border-slate-200 flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Worker Ledger</span>
              </button>

              <div className="flex items-center space-x-2">
                {hasRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER') &&
                  (detailsWorker.balanceDue || (detailsWorker.grossWageEarned || 0) - (detailsWorker.wagesGiven || 0)) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const wId = detailsWorker.worker?.id;
                        setDetailsWorker(null);
                        openPayoutModal(wId);
                      }}
                      className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center space-x-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Disburse Pending Wages</span>
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setDetailsWorker(null)}
                  className="px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-200 bg-white rounded-lg font-bold border border-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. VIEW WORKER PROFILE / DOSSIER MODAL                    */}
      {/* ========================================================= */}
      {viewWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{viewWorker.name}</h3>
                  <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-300">
                    <span className="font-mono font-bold text-amber-400">{viewWorker.workerCode}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{viewWorker.skillLevel}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewWorker(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Photo & Core badges */}
              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                {viewWorker.photoUrl ? (
                  <img
                    src={viewWorker.photoUrl}
                    alt={viewWorker.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 font-black text-xl flex items-center justify-center shrink-0">
                    {viewWorker.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {viewWorker.trade}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Assigned Project: <strong className="text-slate-800">{projects.find((p) => p.id === viewWorker.projectId)?.name || 'Central Site Pool'}</strong>
                  </p>
                </div>
              </div>

              {/* Wage & Payment Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Daily Wage Rate</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    ₹{viewWorker.dailyWageRate}<span className="text-xs text-slate-500 font-normal"> / day</span>
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Overtime Rate</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    ₹{viewWorker.overtimeHourlyRate}<span className="text-xs text-slate-500 font-normal"> / hr</span>
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Contact Phone</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {viewWorker.phone || 'No phone recorded'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Payment Method</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {viewWorker.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <Landmark className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bank & Settlement Account</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account No:</span>
                  <span className="font-mono font-bold text-slate-800">{(viewWorker as any).bankAccountNo || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-mono font-bold text-slate-800">{(viewWorker as any).bankIfsc || '—'}</span>
                </div>
              </div>

              {/* ID Proof / Document */}
              {viewWorker.documentUrl && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                  <span className="text-amber-800 font-bold block mb-1.5">Uploaded ID Proof / Document</span>
                  <a
                    href={viewWorker.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-amber-900 font-bold hover:underline"
                  >
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>{(viewWorker as any).documentName || 'View Document'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
                <button
                  type="button"
                  onClick={() => {
                    const w = viewWorker;
                    setViewWorker(null);
                    handleOpenEditWorker(w);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewWorker(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EDIT WORKER MODAL                                      */}
      {/* ========================================================= */}
      {editWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-5 text-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-md">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-950">Edit Worker: {editWorker.name}</h3>
                  <p className="text-xs text-slate-800 font-medium">Update workforce profile, trade rates, and documents</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditWorker(null)}
                className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWorker} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Worker Code</label>
                  <input
                    type="text"
                    required
                    value={editForm.workerCode}
                    onChange={(e) => setEditForm({ ...editForm, workerCode: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Trade / Specialization</label>
                  <select
                    value={editForm.trade}
                    onChange={(e) => setEditForm({ ...editForm, trade: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-800"
                  >
                    {['MASON', 'CARPENTER', 'BARBENDER', 'ELECTRICIAN', 'PLUMBER', 'PAINTER', 'WELDER', 'HELPER', 'OPERATOR', 'SUPERVISOR'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Skill Level</label>
                  <select
                    value={editForm.skillLevel}
                    onChange={(e) => setEditForm({ ...editForm, skillLevel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-800"
                  >
                    {['SKILLED', 'SEMI_SKILLED', 'UNSKILLED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Daily Wage Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editForm.dailyWageRate}
                    onChange={(e) => setEditForm({ ...editForm, dailyWageRate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">OT Hourly Rate (₹/hr) *</label>
                  <input
                    type="number"
                    required
                    value={editForm.overtimeHourlyRate}
                    onChange={(e) => setEditForm({ ...editForm, overtimeHourlyRate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Payment Method</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-800"
                  >
                    {['CASH', 'BANK_TRANSFER', 'UPI'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-600 font-bold mb-1">Assigned Project</label>
                <select
                  value={editForm.projectId}
                  onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value="">-- Central Pool (No Project) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Bank Account No.</label>
                  <input
                    type="text"
                    value={editForm.bankAccountNo}
                    onChange={(e) => setEditForm({ ...editForm, bankAccountNo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800"
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    value={editForm.bankIfsc}
                    onChange={(e) => setEditForm({ ...editForm, bankIfsc: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 uppercase"
                    placeholder="IFSC code"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="text-xs">
                <label className="block text-slate-600 font-bold mb-1">Update Worker Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditPhotoFile(e.target.files[0]);
                      setEditPhotoPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                />
              </div>

              {/* Document Upload */}
              <div className="text-xs">
                <label className="block text-slate-600 font-bold mb-1">Update ID Document Proof</label>
                <div className="flex space-x-2">
                  <select
                    value={editDocType}
                    onChange={(e) => setEditDocType(e.target.value)}
                    className="w-1/3 bg-white border border-slate-300 rounded-xl p-2 text-xs font-semibold"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Work Agreement">Work Agreement</option>
                  </select>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditDocFile(e.target.files[0]);
                      }
                    }}
                    className="w-2/3 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditWorker(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Worker Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DELETE WORKER CONFIRMATION MODAL                       */}
      {/* ========================================================= */}
      {deleteConfirmWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Delete Worker?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete worker <strong className="text-slate-900">{deleteConfirmWorker.name}</strong> (<span className="font-mono font-bold text-amber-700">{deleteConfirmWorker.workerCode}</span>)?
              </p>
              <p className="text-[11px] text-slate-400">
                This will remove the worker from on-site muster rolls and active project workforce records.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmWorker(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingWorker}
                onClick={handleConfirmDeleteWorker}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isDeletingWorker ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
