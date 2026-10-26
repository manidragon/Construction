import React, { useState, useEffect } from 'react';
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
  const presentCount = rows.filter((r) => r.status === 'PRESENT').length;
  const onSiteCount = rows.filter((r) => r.status === 'ON_SITE').length;
  const halfDayCount = rows.filter((r) => r.status === 'HALF_DAY').length;
  const absentCount = rows.filter((r) => r.status === 'ABSENT' || r.status === 'LEAVE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Daily Attendance & Shift Logger
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Universal Architecture
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Log muster records, check-in times & status transitions with instant audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-slate-100 px-2 py-1 focus:outline-none"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Today
          </button>

          <button
            onClick={handleMarkAllPresent}
            disabled={saving}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Present
          </button>

          <button
            onClick={handleSaveBulk}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 font-bold"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Shift Log'}
          </button>
        </div>
      </div>

      {/* Standardized Toast / Execution Feedback Banner */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
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
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{toast.message}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {toast.entity}
                </span>
                {toast.whatsappStatus && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
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
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Staff</span>
          <p className="text-2xl font-bold text-white mt-1">{rows.length}</p>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Present (Full Day)</span>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{presentCount}</p>
        </div>
        <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
          <span className="text-xs text-blue-400 font-medium">On-Site / Field</span>
          <p className="text-2xl font-bold text-blue-300 mt-1">{onSiteCount}</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
          <span className="text-xs text-amber-400 font-medium">Half-Day</span>
          <p className="text-2xl font-bold text-amber-300 mt-1">{halfDayCount}</p>
        </div>
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4">
          <span className="text-xs text-rose-400 font-medium">Absent / Leave</span>
          <p className="text-2xl font-bold text-rose-300 mt-1">{absentCount}</p>
        </div>
      </div>

      {/* Attendance Daily Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Staff & Site Engineer Shift Roster
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Date: {selectedDate}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading attendance records...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No staff records found in tenant directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Shift Status</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">Work Hours</th>
                  <th className="py-3 px-4">Notes / Activity</th>
                  <th className="py-3 px-4 text-right">Quick Set</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {rows.map((row) => (
                  <tr
                    key={row.staffId}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Staff Name & Code */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{row.name}</div>
                      <div className="text-xs font-mono text-slate-400">{row.staffCode}</div>
                    </td>

                    {/* Designation */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300 text-xs font-medium">
                        {row.designation}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.roleCategory.replace(/_/g, ' ')}
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          handleUpdateRow(row.staffId, 'status', e.target.value)
                        }
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none transition ${
                          row.status === 'PRESENT'
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            : row.status === 'ON_SITE'
                            ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                            : row.status === 'HALF_DAY'
                            ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                            : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        <option value="PRESENT">Present (Full Day)</option>
                        <option value="ON_SITE">On-Site / Field Visit</option>
                        <option value="HALF_DAY">Half-Day Shift</option>
                        <option value="LEAVE">Approved Leave</option>
                        <option value="ABSENT">Absent (Uninformed)</option>
                      </select>
                    </td>

                    {/* Check-In Time */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={row.checkInTime}
                          onChange={(e) =>
                            handleUpdateRow(row.staffId, 'checkInTime', e.target.value)
                          }
                          placeholder="09:00 AM"
                          className="w-24 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </td>

                    {/* Work Hours & Overtime */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-300">
                          {row.regularHours}h reg
                        </span>
                        {row.status === 'PRESENT' && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>+OT:</span>
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
                              className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 text-center"
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) =>
                          handleUpdateRow(row.staffId, 'notes', e.target.value)
                        }
                        placeholder="e.g. Project site visit, delayed..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </td>

                    {/* Quick Set Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'PRESENT')}
                          title="Set Present"
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            row.status === 'PRESENT'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'ON_SITE')}
                          title="Set On-Site"
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            row.status === 'ON_SITE'
                              ? 'bg-blue-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'HALF_DAY')}
                          title="Set Half-Day"
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            row.status === 'HALF_DAY'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(row.staffId, 'status', 'ABSENT')}
                          title="Set Absent"
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            row.status === 'ABSENT'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
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
