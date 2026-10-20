import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Worker, LabourAttendance } from '../types';
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
} from 'lucide-react';

export const Labour: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || (projects[0]?.id || ''));
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendances, setAttendances] = useState<LabourAttendance[]>([]);
  const [musterRoll, setMusterRoll] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'musterRoll' | 'workers' | 'subcontractors'>('attendance');

  // Attendance grid local state (workerId -> status, otHours, workActivity)
  const [gridState, setGridState] = useState<Record<string, { status: string; otHours: number; activity: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals
  const [showWorkerModal, setShowWorkerModal] = useState(false);
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

  useEffect(() => {
    if (selectedProjectId) setProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [wrkRes, attRes, musRes, subRes] = await Promise.all([
        api.getWorkers(`projectId=${projectId}`),
        api.getDailyAttendance(date, projectId),
        api.getMusterRoll(`projectId=${projectId}`),
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
      if (musRes.success) setMusterRoll(musRes.records || []);
      if (subRes.success) setSubcontractors(subRes.subcontractors || []);
    } catch (err) {
      console.error('Failed to load labour records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, date]);

  const handleSaveBulkAttendance = async () => {
    try {
      const records = workers.map((w) => {
        const state = gridState[w.id] || { status: 'PRESENT', otHours: 0, activity: '' };
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

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createWorker({ ...workerForm, projectId });
      if (res.success) {
        setShowWorkerModal(false);
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
      alert(err.message || 'Failed to create worker');
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
          {hasRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER') && (
            <button
              onClick={() => setShowWorkerModal(true)}
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
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Project:</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
            >
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
            onClick={handleSaveBulkAttendance}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Save Today's Attendance</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Attendance registered and wages computed successfully for {workers.length} workers!</span>
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
            onClick={() => setActiveTab(t.id as any)}
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Muster Attendance Entry for {formatDate(date)}</h3>
              <p className="text-xs text-slate-500">Record Present / Half-Day / Absent, overtime hours, and site activity</p>
            </div>
          </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {workers.map((w) => {
                  const state = gridState[w.id] || { status: 'PRESENT', otHours: 0, activity: '' };
                  let regWage = state.status === 'PRESENT' ? w.dailyWageRate : state.status === 'HALF_DAY' ? w.dailyWageRate / 2 : 0;
                  let otWage = state.otHours * w.overtimeHourlyRate;
                  let total = regWage + otWage;

                  return (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{w.workerCode}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{w.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {w.trade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">₹{w.dailyWageRate}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 space-x-1">
                          {['PRESENT', 'HALF_DAY', 'ABSENT'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                setGridState({
                                  ...gridState,
                                  [w.id]: { ...state, status: st },
                                });
                              }}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                                state.status === st
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
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="8"
                          value={state.otHours}
                          onChange={(e) => {
                            setGridState({
                              ...gridState,
                              [w.id]: { ...state, otHours: Number(e.target.value) },
                            });
                          }}
                          className="w-14 text-center text-xs p-1 bg-white border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="e.g. 8th slab rebar tying"
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Muster Roll & Wage Sheet */}
      {activeTab === 'musterRoll' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Muster Roll & Cumulative Wage Statement</h3>
              <p className="text-xs text-slate-500">Days present, overtime hours, gross wages earned</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print Register</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3">Worker Code</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Trade</th>
                  <th className="py-3 px-3 text-right">Daily Rate</th>
                  <th className="py-3 px-3 text-center">Present Days</th>
                  <th className="py-3 px-3 text-center">Half Days</th>
                  <th className="py-3 px-3 text-center">OT Hours</th>
                  <th className="py-3 px-3 text-right">Regular Wage</th>
                  <th className="py-3 px-3 text-right">OT Wage</th>
                  <th className="py-3 px-3 text-right">Gross Wages Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {musterRoll.map((m: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{m.worker?.workerCode}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{m.worker?.name}</td>
                    <td className="py-3 px-3">{m.worker?.trade}</td>
                    <td className="py-3 px-3 text-right font-mono">₹{m.worker?.dailyWageRate}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{m.presentDays}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-700">{m.halfDays}</td>
                    <td className="py-3 px-3 text-center font-mono">{m.totalOtHours} hrs</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(m.totalRegularWage)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(m.totalOtWage)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(m.grossWageEarned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Workers Master */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workers.map((w) => (
            <div key={w.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {w.workerCode}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {w.skillLevel}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{w.name}</h3>
                <p className="text-xs text-amber-700 font-semibold mt-0.5">Trade: {w.trade}</p>
                <div className="mt-3 text-xs space-y-1 text-slate-600">
                  <p>Phone: {w.phone || '—'}</p>
                  <p>Payment: {w.paymentMethod}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Wage Rates:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{w.dailyWageRate}/day • OT ₹{w.overtimeHourlyRate}/hr
                </span>
              </div>
            </div>
          ))}
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
      {showWorkerModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Construction Worker</h3>
              <button onClick={() => setShowWorkerModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorker} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Worker Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="WRK-009"
                    value={workerForm.workerCode}
                    onChange={(e) => setWorkerForm({ ...workerForm, workerCode: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mohan Lal"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trade *</label>
                  <select
                    value={workerForm.trade}
                    onChange={(e) => setWorkerForm({ ...workerForm, trade: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
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
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
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
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Overtime Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={workerForm.overtimeHourlyRate}
                    onChange={(e) => setWorkerForm({ ...workerForm, overtimeHourlyRate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

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

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWorkerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
