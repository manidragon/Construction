import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { DailySiteReport } from '../types';
import { formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  ClipboardList,
  Plus,
  CloudSun,
  ShieldCheck,
  Truck,
  Users,
  Boxes,
  Camera,
  CheckCircle2,
  X,
  FileCheck,
  Share2,
} from 'lucide-react';
import { DailyReportShareModal } from '../components/DailyReportShareModal';

export const DailyReports: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || '');
  const [reports, setReports] = useState<DailySiteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DailySiteReport | null>(null);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProjectId, setShareProjectId] = useState('');
  const [shareTab, setShareTab] = useState<'owner' | 'client'>('owner');
  const [dprForm, setDprForm] = useState({
    projectId: '',
    siteId: '',
    reportDate: new Date().toISOString().split('T')[0],
    weather: 'Sunny / Clear sky 28°C',
    temperature: '28°C',
    workSummary: '',
    delaysReason: '',
    safetyIncidents: 'No safety incidents reported. Daily morning toolbox talk conducted.',
    issuesNoted: '',
    labourEntries: [
      { trade: 'Masons', headcount: 8, regularHours: 8, overtimeHours: 2, notes: 'Blockwork on 4th floor' },
      { trade: 'Bar Benders', headcount: 12, regularHours: 8, overtimeHours: 3, notes: '8th slab reinforcement' },
      { trade: 'Helpers', headcount: 18, regularHours: 8, overtimeHours: 1, notes: 'Material shifting' },
    ],
    materialEntries: [
      { materialName: 'UltraTech Cement 53 Grade', unit: 'BAG', qtyReceived: 0, qtyConsumed: 60, notes: 'Mortar batching' },
      { materialName: 'TMT 16mm Rebars', unit: 'TONNE', qtyReceived: 0, qtyConsumed: 3.5, notes: 'Slab reinforcement' },
    ],
    equipmentEntries: [
      { equipmentName: 'Tower Crane 5T', hoursOperated: 7, fuelConsumed: 0, workDone: 'Lifting rebar and blocks' },
      { equipmentName: 'Diesel Generator 125 kVA', hoursOperated: 4, fuelConsumed: 32, workDone: 'Site backup power' },
    ],
    photos: [
      { photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=800', caption: '8th floor slab rebar layout and beam shuttering check' },
    ],
  });

  useEffect(() => {
    setProjectId(selectedProjectId || '');
  }, [selectedProjectId]);

  const fetchDPRs = async () => {
    setLoading(true);
    try {
      const res = await api.getDailyReports(projectId ? `projectId=${projectId}` : '');
      if (res.success) {
        setReports(res.reports || []);
        if (selectedReport) {
          const updated = (res.reports || []).find((r: any) => r.id === selectedReport.id);
          if (updated) setSelectedReport(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load DPRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDPRs();
  }, [projectId]);

  const handleApprove = async (id: string) => {
    try {
      const res = await api.approveDailyReport(id);
      if (res.success) {
        fetchDPRs();
      }
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleCreateDPR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentPrj = projects.find((p) => p.id === projectId);
      const siteId = currentPrj?.sites?.[0]?.id || dprForm.siteId;

      const res = await api.createDailyReport({
        ...dprForm,
        projectId,
        siteId,
      });

      if (res.success) {
        setShowCreateModal(false);
        fetchDPRs();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit DPR');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Daily Site Progress Reports (DPR)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Site supervisor daily logs: trade headcount, weather, materials consumed, equipment hours, and site photos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Share Daily Report Trigger */}
          <button
            onClick={() => {
              const targetPrj = projectId || selectedProjectId || (projects[0]?.id || '');
              if (!targetPrj) {
                alert('Please select a project first to share its daily report.');
                return;
              }
              setShareProjectId(targetPrj);
              setShareTab('owner');
              setShowShareModal(true);
            }}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition border border-slate-800"
            title="Share aggregated project daily report with Owner or Client"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Share Daily Report (Owner / Client)</span>
          </button>

          {hasRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Daily Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Selector Bar */}
      <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
        <label className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">Filter Project:</label>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setSelectedProjectId(e.target.value);
          }}
          className="text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm min-w-[280px] sm:min-w-[340px] md:min-w-[400px] cursor-pointer transition"
        >
          <option value="">🌐 All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((dpr) => (
          <div
            key={dpr.id}
            onClick={() => setSelectedReport(dpr)}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <div>
              {/* Header: Date & Status */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{formatDate(dpr.reportDate)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  dpr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {dpr.status}
                </span>
              </div>

              <div className="flex items-center text-xs text-slate-500 mt-2 space-x-2">
                <CloudSun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{dpr.weather || 'Sunny 28°C'}</span>
              </div>

              {/* Work Summary */}
              <p className="text-xs text-slate-700 font-medium mt-3 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {dpr.workSummary || 'Daily concrete batching, block masonry, and rebar fabrication completed.'}
              </p>

              {/* Trade Headcount & Machinery Counters */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-1.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Workers</span>
                  <strong className="text-xs text-slate-800 font-mono">
                    {dpr.labourEntries.reduce((sum, l) => sum + l.headcount, 0)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Materials</span>
                  <strong className="text-xs text-slate-800 font-mono">{dpr.materialEntries.length} Items</strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Equipment</span>
                  <strong className="text-xs text-slate-800 font-mono">{dpr.equipmentEntries.length} Units</strong>
                </div>
              </div>

              {/* Photos Thumbnail Preview */}
              {dpr.photos && dpr.photos.length > 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-semibold">{dpr.photos.length} Site Photos Attached</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>By: {dpr.preparedBy?.name}</span>
              <span className="text-amber-600 font-bold group-hover:underline">Open DPR →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed DPR Viewer Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Daily Progress Report
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatDate(selectedReport.reportDate)} • [{selectedReport.project?.code}] {selectedReport.site?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Prepared by: {selectedReport.preparedBy?.name} • Status: <strong className="text-slate-800">{selectedReport.status}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Work Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800">
              <strong className="block text-slate-900 mb-1">Work Completed Summary:</strong>
              <p>{selectedReport.workSummary}</p>
            </div>

            {/* Labour Deployment */}
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Workforce & Labour Deployment</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-slate-50 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Trade</th>
                      <th className="py-2 px-3 text-center">Headcount</th>
                      <th className="py-2 px-3 text-center">Regular Hours</th>
                      <th className="py-2 px-3 text-center">OT Hours</th>
                      <th className="py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedReport.labourEntries.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 px-3 font-bold text-slate-800">{l.trade}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{l.headcount}</td>
                        <td className="py-2 px-3 text-center font-mono">{l.regularHours}h</td>
                        <td className="py-2 px-3 text-center font-mono text-amber-700">{l.overtimeHours}h</td>
                        <td className="py-2 px-3 text-slate-500">{l.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Materials Log */}
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 mb-2">
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>Materials Inward & Consumed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-slate-50 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Material</th>
                      <th className="py-2 px-3 text-right">Received</th>
                      <th className="py-2 px-3 text-right">Consumed</th>
                      <th className="py-2 px-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedReport.materialEntries.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.materialName}</td>
                        <td className="py-2 px-3 text-right font-mono">{m.qtyReceived} {m.unit}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">{m.qtyConsumed} {m.unit}</td>
                        <td className="py-2 px-3 text-slate-500">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Safety & Delays */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center space-x-1 font-bold text-emerald-900 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Safety Record:</span>
                </div>
                <p className="text-emerald-800 text-[11px]">{selectedReport.safetyIncidents || 'No incidents.'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="block text-slate-900 mb-1">Issues & Delays:</strong>
                <p className="text-slate-600 text-[11px]">{selectedReport.delaysReason || 'Nil work stoppages.'}</p>
              </div>
            </div>

            {/* Photos */}
            {selectedReport.photos && selectedReport.photos.length > 0 && (
              <div>
                <strong className="block text-xs text-slate-900 mb-2">Site Photographs:</strong>
                <div className="grid grid-cols-2 gap-3">
                  {selectedReport.photos.map((ph) => (
                    <div key={ph.id} className="rounded-xl overflow-hidden border border-slate-200">
                      <img src={ph.photoUrl} alt="Site" className="w-full h-36 object-cover" />
                      {ph.caption && <p className="text-[10px] text-slate-500 p-2 bg-slate-50">{ph.caption}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>

              {selectedReport.status === 'SUBMITTED' && hasRole('OWNER', 'PROJECT_MANAGER') && (
                <button
                  onClick={() => handleApprove(selectedReport.id)}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Approve DPR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create DPR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 p-5 space-y-3 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Submit Daily Site Report (DPR)</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDPR} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Report Date *</label>
                  <input
                    type="date"
                    required
                    value={dprForm.reportDate}
                    onChange={(e) => setDprForm({ ...dprForm, reportDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weather & Site Conditions</label>
                  <input
                    type="text"
                    value={dprForm.weather}
                    onChange={(e) => setDprForm({ ...dprForm, weather: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Summary & Progress *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe works executed across zones, levels, and structural components..."
                  value={dprForm.workSummary}
                  onChange={(e) => setDprForm({ ...dprForm, workSummary: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Safety Measures & Toolbox Talk</label>
                <input
                  type="text"
                  value={dprForm.safetyIncidents}
                  onChange={(e) => setDprForm({ ...dprForm, safetyIncidents: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Submit Report for Approval
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
