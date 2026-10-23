import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import api from '../services/api';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  Plus,
  PlusCircle,
  X,
  TrendingUp,
  HardHat,
  Truck,
  Users,
  ShieldCheck,
  Share2,
  FileText,
  Printer,
} from 'lucide-react';
import { DailyReportShareModal } from '../components/DailyReportShareModal';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'boq' | 'tasks' | 'dpr' | 'expenses' | 'billing' | 'changeOrders' | 'documents'
  >('overview');

  // Daily Report Sharing modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState<'owner' | 'client'>('owner');

  // Change Order modal state
  const [showCOModal, setShowCOModal] = useState(false);
  const [coForm, setCoForm] = useState({
    orderNumber: '',
    description: '',
    amountDelta: '',
    timeDeltaDays: '0',
  });

  const fetchProject = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getProjectById(id);
      if (res.success && res.project) {
        setProject(res.project);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleCreateCO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const res = await api.createChangeOrder(id, coForm);
      if (res.success) {
        setShowCOModal(false);
        setCoForm({ orderNumber: '', description: '', amountDelta: '', timeDeltaDays: '0' });
        fetchProject();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create change order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
        <p className="text-sm font-semibold text-slate-700">Project Not Found</p>
        <Link to="/projects" className="text-xs text-amber-600 hover:underline mt-2 inline-block">
          Return to Projects List
        </Link>
      </div>
    );
  }

  const f = project.financials || {};

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Return */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/projects" className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 transition font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Share Daily Report to Owner Button */}
          <button
            onClick={() => {
              setShareTab('owner');
              setShowShareModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition shadow-sm border border-slate-800"
            title="Share daily financial & task report with Owner via WhatsApp or PDF"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily Report to Owner (WhatsApp / PDF)</span>
          </button>

          {/* Share Client Progress & Billing Button */}
          <button
            onClick={() => {
              setShareTab('client');
              setShowShareModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
            title="Share work progress, payments, and balance with Client via WhatsApp"
          >
            <Users className="w-3.5 h-3.5 text-white" />
            <span>Share Client Update (WhatsApp)</span>
          </button>

          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
          }`}>
            Status: {project.status}
          </span>
        </div>
      </div>

      {/* Project Header Banner Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {project.code}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{project.projectType}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Client: <strong className="ml-1 text-slate-700">{project.clientName}</strong>
              </span>
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {project.siteAddress}
              </span>
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {formatDate(project.plannedStartDate)} to {formatDate(project.plannedEndDate)}
              </span>
            </div>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right">
              <span className="text-[10px] text-slate-400 block">Contract Value</span>
              <strong className="text-xs sm:text-sm text-slate-900">{formatCurrency(project.contractValue, true)}</strong>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right">
              <span className="text-[10px] text-slate-400 block">Approved Budget</span>
              <strong className="text-xs sm:text-sm text-slate-700">{formatCurrency(project.approvedBudget, true)}</strong>
            </div>
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-right">
              <span className="text-[10px] text-amber-700 block">Actual Cost</span>
              <strong className="text-xs sm:text-sm text-amber-900">{formatCurrency(f.actualCost || 0, true)}</strong>
            </div>
            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-right">
              <span className="text-[10px] text-emerald-700 block font-bold">Realized Net Profit</span>
              <strong className="text-xs sm:text-sm text-emerald-800">
                {formatCurrency(f.netProfit !== undefined ? f.netProfit : ((f.totalBilled || 0) - (f.actualCost || 0)), true)}
              </strong>
              <span className="text-[9px] text-emerald-600 block font-bold">({f.netProfitMargin || 0}%)</span>
            </div>
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-right">
              <span className="text-[10px] text-blue-700 block">Work Progress</span>
              <strong className="text-xs sm:text-sm text-blue-900">{project.completionPercent}%</strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 mt-6 pt-4 border-t border-slate-100 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', label: 'Project Overview' },
            { id: 'boq', label: `BOQ (${project.boqItems?.length || 0})` },
            { id: 'tasks', label: `Tasks (${project.tasks?.length || 0})` },
            { id: 'billing', label: `Client RA Bills (${project.clientInvoices?.length || 0})` },
            { id: 'expenses', label: `Expenses & Petty Cash (${project.expenses?.length || 0})` },
            { id: 'changeOrders', label: `Change Orders (${project.changeOrders?.length || 0})` },
            { id: 'documents', label: `Documents (${project.documents?.length || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Performance & Net Profit Overview */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Project Financial Health & Realized Profit</h3>
                    <p className="text-[11px] text-slate-400">Client billing vs. actual site costs incurred</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">Net Profit Margin</span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    +{f.netProfitMargin || 0}%
                  </span>
                </div>
              </div>

              {/* 3 Key Metrics KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Billed Revenue</span>
                  <strong className="text-sm font-mono text-white block mt-0.5">
                    {formatCurrency(f.totalBilled || 0)}
                  </strong>
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    {f.outstandingReceivable === 0 ? '✓ 100% Collected (₹0 Due)' : `₹${formatCurrency(f.outstandingReceivable)} Pending`}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Total Incurred Cost</span>
                  <strong className="text-sm font-mono text-amber-300 block mt-0.5">
                    {formatCurrency(f.actualCost || 0)}
                  </strong>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Budget: {formatCurrency(project.approvedBudget)} ({f.budgetBurnPercent || 0}% used)
                  </span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <span className="text-[11px] text-emerald-300 block font-medium">Realized Net Profit</span>
                  <strong className="text-base font-mono text-emerald-400 block mt-0.5">
                    {formatCurrency(f.netProfit !== undefined ? f.netProfit : ((f.totalBilled || 0) - (f.actualCost || 0)))}
                  </strong>
                  <span className="text-[10px] text-emerald-300/80 mt-1 block font-semibold">
                    Healthy Profit Realized
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Details */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Cost Breakdown Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-slate-400 flex items-center">
                      <Truck className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                      Materials (POs)
                    </span>
                    <strong className="font-mono text-slate-200">{formatCurrency(f.materialsCost || 0)}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-slate-400 flex items-center">
                      <HardHat className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Labour (Muster Roll)
                    </span>
                    <strong className="font-mono text-slate-200">{formatCurrency(f.labourCost || 0)}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <span className="text-slate-400 flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                      Site Expenses
                    </span>
                    <strong className="font-mono text-slate-200">{formatCurrency(f.expensesCost || 0)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Sites under this Project */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Construction Sites & Yards</h3>
                <span className="text-xs text-slate-500">{project.sites?.length || 0} Sites Active</span>
              </div>
              <div className="space-y-3">
                {(project.sites || []).map((s: any) => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{s.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.location}</p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 block">
                        {s.code}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{s.supervisorName || 'Supervisor'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Construction Phases */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Project Execution Phases</h3>
              <div className="space-y-2">
                {(project.phases || []).length === 0 ? (
                  <p className="text-xs text-slate-400">Phase 1: Excavation & Substructure, Phase 2: Superstructure RCC, Phase 3: Finishing</p>
                ) : (
                  (project.phases || []).map((ph: any) => (
                    <div key={ph.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {ph.sequence}
                        </span>
                        <span className="font-semibold text-slate-800">{ph.name}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                        {ph.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Assigned Team, Site Workforce, Suppliers & Billing Terms */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <Users className="w-4 h-4 mr-1.5 text-amber-600" />
                  Team & Contributors
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {((project.members || []).length) + ((project.siteWorkforce || []).length) + ((project.projectSuppliers || []).length)} active
                </span>
              </div>

              {/* 1. Internal App Users / Project Members */}
              {(project.members || []).length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Project Management</h4>
                  <div className="space-y-2">
                    {project.members.map((m: any) => (
                      <div key={m.id} className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl text-xs">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          {m.user?.name.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{m.user?.name}</p>
                          <p className="text-[10px] text-slate-500">{m.roleTitle} ({m.user?.role})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Site Labour Workforce */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                    <HardHat className="w-3 h-3 mr-1 text-amber-500" />
                    Site Labour Workforce
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">{(project.siteWorkforce || []).length} Workers</span>
                </div>
                {(project.siteWorkforce || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg">No worker attendance recorded for this project yet.</p>
                ) : (
                  <div className="space-y-2">
                    {project.siteWorkforce.map((w: any) => (
                      <div key={w.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <strong className="text-slate-900">{w.name}</strong>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              {w.trade}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Code: <span className="font-mono">{w.code}</span> • ₹{w.dailyWageRate}/day
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-800 block">{formatCurrency(w.totalEarned)}</span>
                          <span className="text-[9px] text-slate-400">{w.shiftsWorked} shift{w.shiftsWorked > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Procurement Suppliers / Vendors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                    <Truck className="w-3 h-3 mr-1 text-blue-500" />
                    Material Vendors & Suppliers
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">{(project.projectSuppliers || []).length} Vendors</span>
                </div>
                {(project.projectSuppliers || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg">No purchase orders linked to this project yet.</p>
                ) : (
                  <div className="space-y-2">
                    {project.projectSuppliers.map((s: any) => (
                      <div key={s.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 block truncate max-w-[150px]">{s.name}</strong>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                            {s.items?.length > 0 ? s.items.join(', ') : `${s.orderCount} PO(s)`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-800 block">{formatCurrency(s.totalOrdersValue)}</span>
                          <span className="text-[9px] text-slate-400">{s.orderCount} PO settled</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Contract & Billing Terms</h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {project.paymentTerms || 'Standard Running Account (RA) Billing with 5% Retention and 2% TDS.'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Applicable GST Rate:</span>
                <span className="font-bold text-slate-800">{project.taxRatePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: BOQ */}
      {activeTab === 'boq' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Bill of Quantities (BOQ)</h3>
              <p className="text-xs text-slate-500">Estimated unit rates, completed quantities, and cost variances</p>
            </div>
            <Link to="/boq" className="text-xs font-bold text-amber-600 hover:underline">
              Open Full BOQ Module →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Est. Qty</th>
                  <th className="py-2.5 px-3 text-right">Total Est. Cost</th>
                  <th className="py-2.5 px-3 text-right">Completed Qty</th>
                  <th className="py-2.5 px-3 text-right">Actual Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(project.boqItems || []).map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{b.itemCode}</td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-900" title={b.description}>{b.description}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-500">{b.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(b.unitRate)}/{b.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{b.estimatedQty} {b.unit}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(b.estimatedTotal)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{b.actualQtyCompleted} {b.unit}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">{formatCurrency(b.actualExpenditure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Site Execution Tasks</h3>
            <Link to="/tasks" className="text-xs font-bold text-amber-600 hover:underline">
              Open Kanban Board →
            </Link>
          </div>
          <div className="space-y-3">
            {(project.tasks || []).map((t: any) => (
              <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{t.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      t.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Assigned: {t.assignedUser?.name || 'Site Supervisor'} • Due: {formatDate(t.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    t.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">{t.completedQty} / {t.plannedQty} {t.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: Billing */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Client Running Account (RA) Bills & Collections</h3>
              <p className="text-xs text-slate-500">Certified billings with retention, TDS, and received payment allocations</p>
            </div>
            <Link to="/billing" className="text-xs font-bold text-amber-600 hover:underline">
              Open Client Billing →
            </Link>
          </div>

          <div className="space-y-3">
            {(project.clientInvoices || []).map((inv: any) => (
              <div key={inv.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{inv.invoiceNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                      {inv.invoiceType}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Certified: {formatCurrency(inv.subtotal)} | Retention (5%): {formatCurrency(inv.retentionAmount)} | TDS: {formatCurrency(inv.tdsAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Net Invoice Amount</span>
                  <strong className="text-sm font-extrabold text-slate-900">{formatCurrency(inv.netInvoiceAmount)}</strong>
                  <span className="text-[11px] text-emerald-600 block">Received: {formatCurrency(inv.paidAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 5: Expenses */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Direct Site Expenses</h3>
            <Link to="/expenses" className="text-xs font-bold text-amber-600 hover:underline">
              Open Expense Register →
            </Link>
          </div>
          <div className="space-y-2">
            {(project.expenses || []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="font-bold text-slate-800">{e.description}</span>
                  <p className="text-[11px] text-slate-500">{e.category} • Paid to: {e.paidTo} • {formatDate(e.expenseDate)}</p>
                </div>
                <span className="font-bold text-slate-900 font-mono">{formatCurrency(e.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 6: Change Orders */}
      {activeTab === 'changeOrders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Contract Variation & Change Orders</h3>
              <p className="text-xs text-slate-500">Approved modifications adjusting contract value and timelines</p>
            </div>
            <button
              onClick={() => setShowCOModal(true)}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Change Order</span>
            </button>
          </div>

          <div className="space-y-3">
            {(project.changeOrders || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No contract change orders recorded.</p>
            ) : (
              (project.changeOrders || []).map((co: any) => (
                <div key={co.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{co.orderNumber}</span>
                    <p className="text-slate-600 mt-0.5">{co.description}</p>
                    <span className="text-[10px] text-slate-400">Approved by {co.approvedBy || 'Owner'} on {formatDate(co.approvedAt)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 block text-sm">+{formatCurrency(co.amountDelta)}</span>
                    <span className="text-[10px] text-slate-500">Time extension: {co.timeDeltaDays} days</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content 7: Documents */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Project Documents & Drawings</h3>
            <Link to="/documents" className="text-xs font-bold text-amber-600 hover:underline">
              Open Document Repository →
            </Link>
          </div>
          <div className="space-y-2">
            {(project.documents || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No documents uploaded yet for this project.</p>
            ) : (
              (project.documents || []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{d.title}</span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{d.category}</p>
                  </div>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-600 hover:underline font-semibold"
                  >
                    Download / View
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Change Order Modal */}
      {showCOModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Approved Change Order</h3>
              <button onClick={() => setShowCOModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCO} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Ref No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CO-SKY-001"
                  value={coForm.orderNumber}
                  onChange={(e) => setCoForm({ ...coForm, orderNumber: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Additional basement sump tank and deep excavation"
                  value={coForm.description}
                  onChange={(e) => setCoForm({ ...coForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Value Delta (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500000"
                    value={coForm.amountDelta}
                    onChange={(e) => setCoForm({ ...coForm, amountDelta: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Delta (Days)</label>
                  <input
                    type="number"
                    value={coForm.timeDeltaDays}
                    onChange={(e) => setCoForm({ ...coForm, timeDeltaDays: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCOModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Approve & Post CO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Report Sharing Modal (Owner & Client) */}
      <DailyReportShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projectId={id || ''}
        defaultTab={shareTab}
      />
    </div>
  );
};
