import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  UserCheck,
  Building2,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  HardHat,
  Briefcase,
  PhoneCall,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AttendanceRow {
  staffId: string;
  staffCode: string;
  name: string;
  roleCategory: string;
  designation: string;
  phone: string;
  status: string; // PRESENT, ABSENT, HALF_DAY, ON_SITE, LEAVE
  hasLogged: boolean;
  checkInTime: string;
  regularHours: number;
  overtimeHours: number;
  notes: string;
}

export const ShiftLogger: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{
    success: boolean;
    message: string;
    entity: string;
    whatsappStatus?: string;
    errors?: string[];
  } | null>(null);

  // Fetch daily roster
  const fetchRoster = async (dateStr: string) => {
    try {
      setLoading(true);
      const res = await api.getDailyAttendanceRoster(dateStr);
      if (res.success && res.data?.roster) {
        setRows(
          res.data.roster.map((r: any) => ({
            ...r,
            checkInTime: r.checkInTime || '09:00 AM',
            notes: r.notes || '',
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(selectedDate);
  }, [selectedDate]);

  // Adjust date by offset
  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  // Update specific row cell
  const handleUpdateRow = (staffId: string, field: keyof AttendanceRow, val: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.staffId !== staffId) return row;
        const updated = { ...row, [field]: val };
        if (field === 'status') {
          if (val === 'PRESENT' || val === 'ON_SITE') {
            updated.regularHours = 8;
          } else if (val === 'HALF_DAY') {
            updated.regularHours = 4;
          } else {
            updated.regularHours = 0;
          }
        }
        return updated;
      })
    );
  };

  // 1-Click "Mark All Present"
  const handleMarkAllPresent = async () => {
    try {
      setSaving(true);
      const res = await api.markAllStaffPresent({
        date: selectedDate,
        checkInTime: '09:00 AM',
        notes: 'Marked present via Quick Bulk Shift Action',
      });

      setToast({
        success: res.success,
        message: res.message,
        entity: res.entity || 'Attendance',
        whatsappStatus: res.whatsappStatus,
        errors: res.errors,
      });

      await fetchRoster(selectedDate);
    } catch (err: any) {
      setToast({
        success: false,
        message: err.message || 'Failed to mark all staff present',
        entity: 'Attendance',
        errors: [err.message],
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Bulk Changes
  const handleSaveBulk = async () => {
    try {
      setSaving(true);
      const records = rows.map((r) => ({
        staffId: r.staffId,
        status: r.status,
        checkInTime: r.checkInTime,
        notes: r.notes,
        regularHours: r.regularHours,
        overtimeHours: r.overtimeHours,
      }));

      const res = await api.saveBulkShiftAttendance({
        date: selectedDate,
        records,
      });

      setToast({
        success: res.success,
        message: res.message,
        entity: res.entity || 'Attendance',
        whatsappStatus: res.whatsappStatus,
        errors: res.errors,
      });

      await fetchRoster(selectedDate);
    } catch (err: any) {
      setToast({
        success: false,
        message: err.message || 'Failed to save attendance roster',
        entity: 'Attendance',
        errors: [err.message],
      });
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalCount = rows.length;
  const presentCount = rows.filter((r) => r.status === 'PRESENT').length;
  const onSiteCount = rows.filter((r) => r.status === 'ON_SITE').length;
  const halfDayCount = rows.filter((r) => r.status === 'HALF_DAY').length;
  const absentCount = rows.filter((r) => r.status === 'ABSENT' || r.status === 'LEAVE').length;
  const attendancePercentage = totalCount > 0 ? Math.round(((presentCount + onSiteCount + halfDayCount * 0.5) / totalCount) * 100) : 0;

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesCode = row.staffCode.toLowerCase().includes(q);
        const matchesDesig = row.designation.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesig) return false;
      }
      if (departmentFilter !== 'ALL') {
        if (row.roleCategory !== departmentFilter) return false;
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ABSENT') {
          if (row.status !== 'ABSENT' && row.status !== 'LEAVE') return false;
        } else if (row.status !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [rows, searchQuery, departmentFilter, statusFilter]);

  // Unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.roleCategory) set.add(r.roleCategory);
    });
    return Array.from(set);
  }, [rows]);

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25 shrink-0">
              <UserCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Daily Attendance & Shift Logger
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-wider">
                  Live Shift Audit
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {attendancePercentage}% Roster Turnout
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Corporate muster records, check-in timestamps, site visits, and instant staff shift auditing.
              </p>
            </div>
          </div>

          {/* Date Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-950/90 border border-slate-700/80 rounded-xl px-2 py-1 shadow-inner">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-slate-100 px-2 py-1 focus:outline-none font-medium cursor-pointer"
              />
              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Today
            </button>

            <button
              onClick={handleMarkAllPresent}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mark All Present</span>
            </button>

            <button
              onClick={handleSaveBulk}
              disabled={saving}
              className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 transition shadow-xl shadow-amber-500/20 disabled:opacity-50 active:scale-95"
            >
              <Save className="w-4 h-4 stroke-[2.4]" />
              <span>{saving ? 'Saving...' : 'Save Shift Log'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback Banner */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-lg ${
            toast.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm">{toast.message}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {toast.entity}
                </span>
                {toast.whatsappStatus && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      toast.whatsappStatus === 'Dispatched'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    WhatsApp: {toast.whatsappStatus}
                  </span>
                )}
              </div>
              {toast.errors && toast.errors.length > 0 && (
                <p className="text-xs text-rose-300 mt-1">{toast.errors.join(', ')}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Active Enterprise Roster</span>
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 shadow-sm hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Present (Full Day)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">{presentCount}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-medium">
            8h standard shift logged
          </div>
        </div>

        <div className="bg-sky-950/30 border border-sky-500/30 rounded-2xl p-4 shadow-sm hover:border-sky-500/50 transition">
          <div className="flex items-center justify-between text-sky-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>On-Site / Field</span>
            <Building2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-300">{onSiteCount}</div>
          <div className="text-[11px] text-sky-400/80 mt-1 font-medium">
            Site inspections & supervision
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 shadow-sm hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Half-Day</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{halfDayCount}</div>
          <div className="text-[11px] text-amber-400/80 mt-1 font-medium">
            4h half-shift recorded
          </div>
        </div>

        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 shadow-sm hover:border-rose-500/50 transition col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Absent / Leave</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300">{absentCount}</div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-medium">
            Uninformed / sanctioned leaves
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff name, code, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 text-white pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDepartmentFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                departmentFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Departments
            </button>
            {departments.map((dep) => (
              <button
                key={dep}
                onClick={() => setDepartmentFilter(dep)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                  departmentFilter === dep
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dep.replace(/_/g, ' ').toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'PRESENT', label: 'Present' },
            { id: 'ON_SITE', label: 'On-Site' },
            { id: 'HALF_DAY', label: 'Half-Day' },
            { id: 'ABSENT', label: 'Absent/Leave' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                statusFilter === s.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Daily Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">
              Staff & Site Engineer Shift Roster
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              ({filteredRows.length} members matching)
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Shift Date: {selectedDate}</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Loading shift roster records...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
            <UserCheck className="w-10 h-10 text-slate-600 mb-3" />
            <div className="font-bold text-slate-300">No matching staff shift records</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Try adjusting your search query or department filter, or add new staff from Office Management.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-[11px] uppercase text-slate-400 font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Designation & Role</th>
                  <th className="py-3.5 px-4">Shift Status</th>
                  <th className="py-3.5 px-4">Check-In Time</th>
                  <th className="py-3.5 px-4">Work Hours & OT</th>
                  <th className="py-3.5 px-4">Notes / Site Activity</th>
                  <th className="py-3.5 px-4 text-right">Quick Set</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRows.map((row) => (
                  <tr
                    key={row.staffId}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Staff Name, Initials Avatar & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-600/30 text-amber-300 font-black flex items-center justify-center border border-amber-500/30 shrink-0 text-xs">
                          {getInitials(row.name)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-400 transition">
                            {row.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                              {row.staffCode}
                            </span>
                            {row.phone && (
                              <span className="text-slate-500 flex items-center gap-0.5">
                                • {row.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Designation & Category */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold text-xs">
                        {row.designation}
                      </div>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                        {row.roleCategory.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          handleUpdateRow(row.staffId, 'status', e.target.value)
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition cursor-pointer shadow-sm ${
                          row.status === 'PRESENT'
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                            : row.status === 'ON_SITE'
                            ? 'bg-sky-950/80 border-sky-500/50 text-sky-300'
                            : row.status === 'HALF_DAY'
                            ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                            : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        <option value="PRESENT">✓ Present (Full Day)</option>
                        <option value="ON_SITE">🏛 On-Site / Field Visit</option>
                        <option value="HALF_DAY">⏱ Half-Day Shift</option>
                        <option value="LEAVE">📋 Approved Leave</option>
                        <option value="ABSENT">✕ Absent (Uninformed)</option>
                      </select>
                    </td>

                    {/* Check-In Time */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <input
                          type="text"
                          value={row.checkInTime}
                          onChange={(e) =>
                            handleUpdateRow(row.staffId, 'checkInTime', e.target.value)
                          }
                          placeholder="09:00 AM"
                          className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </td>

                    {/* Work Hours & Overtime */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md">
                          {row.regularHours}h reg
                        </span>
                        {(row.status === 'PRESENT' || row.status === 'ON_SITE') && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="font-semibold text-amber-400">+OT:</span>
                            <input
                              type="number"
                              min="0"
                              max="8"
                              value={row.overtimeHours}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.staffId,
                                  'overtimeHours',
                                  Number(e.target.value)
                                )
                              }
                              className="w-12 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-0.5 text-xs text-slate-200 text-center font-mono focus:border-amber-500"
                            />
                            <span>hrs</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) =>
                          handleUpdateRow(row.staffId, 'notes', e.target.value)
                        }
                        placeholder="e.g. Project site visit, delayed..."
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </td>

                    {/* Quick Set Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'PRESENT')}
                          title="Set Present (Full Day)"
                          className={`w-7 h-7 text-xs font-black rounded-lg transition flex items-center justify-center ${
                            row.status === 'PRESENT'
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-700'
                          }`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'ON_SITE')}
                          title="Set On-Site / Field Visit"
                          className={`w-7 h-7 text-xs font-black rounded-lg transition flex items-center justify-center ${
                            row.status === 'ON_SITE'
                              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                              : 'bg-slate-800 text-slate-400 hover:text-sky-300 hover:bg-slate-700'
                          }`}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'HALF_DAY')}
                          title="Set Half-Day"
                          className={`w-7 h-7 text-xs font-black rounded-lg transition flex items-center justify-center ${
                            row.status === 'HALF_DAY'
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                              : 'bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700'
                          }`}
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'ABSENT')}
                          title="Set Absent / Leave"
                          className={`w-7 h-7 text-xs font-black rounded-lg transition flex items-center justify-center ${
                            row.status === 'ABSENT' || row.status === 'LEAVE'
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                          }`}
                        >
                          A
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftLogger;
