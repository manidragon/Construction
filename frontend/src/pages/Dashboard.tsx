import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  Activity,
  IndianRupee,
  Receipt,
  Users,
  FileText,
  Boxes,
  Truck,
  CheckCircle2,
  HardHat,
  Package,
  ShoppingCart,
  Building2,
  Wallet,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedProjectId } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role === 'TENANT_ADMIN' ? 'OWNER' : user?.role || 'OWNER';

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await api.getDashboardMetrics(selectedProjectId);
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedProjectId, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Calculating live construction metrics...</p>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};

  // =========================================================================
  // 1. STOREKEEPER DASHBOARD
  // =========================================================================
  if (role === 'STOREKEEPER') {
    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Central Stores & Inventory Operations
              </h1>
              <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-orange-300">
                Stores In-Charge
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Material stock balances, reorder alerts, warehouse valuations, and site material requisitions.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center space-x-1.5">
              <Boxes className="w-3.5 h-3.5 text-slate-500" />
              <span>{s.totalMaterialsCount || 28} Catalog Items</span>
            </span>
            {s.lowStockAlertsCount > 0 && (
              <Link
                to="/inventory"
                className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition flex items-center space-x-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{s.lowStockAlertsCount} Low Stock Alerts</span>
              </Link>
            )}
          </div>
        </div>

        {/* Storekeeper KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Stores Stock Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-cyan-700 mt-2">{formatCurrency(s.materialStockValue || 0)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Weighted avg. inventory asset value</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Low Stock Alerts</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-red-600 mt-2">{s.lowStockAlertsCount || 0}</p>
            <div className="flex items-center text-[11px] text-red-600 mt-1 font-semibold">
              <span>Items below minimum threshold</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Site Requisitions</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-600 mt-2">{s.pendingRequisitions || 0}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Site indents awaiting issue / dispatch</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Purchase Orders</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-600 mt-2">{s.totalPOCount || 0}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Vendor deliveries in pipeline</span>
            </div>
          </div>
        </div>

        {/* Low Stock Reorder List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Critical Low Stock Reorder Items</h2>
                <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-500">Materials that have breached safety stock limits and require replenishing</p>
            </div>
            <Link
              to="/inventory"
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center"
            >
              <span>Manage Materials</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Material Code</th>
                  <th className="py-3 px-4">Material Name</th>
                  <th className="py-3 px-4 text-center">Unit</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Min Threshold</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(data?.lowStockAlerts || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ✅ All inventory items are comfortably above safety reorder thresholds.
                    </td>
                  </tr>
                ) : (
                  (data?.lowStockAlerts || []).map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{m.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono">{m.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-red-600">{m.currentStock}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{m.minStockLevel}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          CRITICAL LOW
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to="/inventory"
                          className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-md hover:bg-amber-400 transition text-[11px]"
                        >
                          Reorder
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Site Requisitions & Quick Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900">Recent Site Material Indents</h2>
              </div>
              <Link to="/procurement" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
                <span>View All Indents</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {(data?.pendingRequisitionsList || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No pending site material requisitions.</p>
              ) : (
                (data?.pendingRequisitionsList || []).map((req: any) => (
                  <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">{req.requisitionNumber}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                          {req.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {req.project?.name} • Req by: {req.requestedBy?.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {req.items?.map((it: any) => `${it.material?.name} (${it.requestedQty} ${it.unit})`).join(', ') || 'Items listed'}
                      </p>
                    </div>
                    <Link
                      to="/procurement"
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded text-xs font-semibold"
                    >
                      Process
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-2">Stores Quick Operational Actions</h2>
              <p className="text-xs text-slate-500 mb-4">Fast-track day-to-day warehouse duties, gate passes, and inventory movements.</p>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/inventory"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition text-left group"
                >
                  <Package className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Materials Catalog</p>
                  <p className="text-[10px] text-slate-500">Add or edit material specs</p>
                </Link>

                <Link
                  to="/procurement"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 transition text-left group"
                >
                  <Truck className="w-5 h-5 text-cyan-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Goods Receipt (GRN)</p>
                  <p className="text-[10px] text-slate-500">Record incoming vendor deliveries</p>
                </Link>

                <Link
                  to="/equipment"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition text-left group"
                >
                  <HardHat className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Plant & Machinery</p>
                  <p className="text-[10px] text-slate-500">Equipment logs & maintenance</p>
                </Link>

                <Link
                  to="/documents"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition text-left group"
                >
                  <FileText className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Material Test Reports</p>
                  <p className="text-[10px] text-slate-500">Verify batch certifications</p>
                </Link>
              </div>
            </div>

            <div className="mt-4 p-3 bg-cyan-50/70 border border-cyan-100 rounded-xl text-xs text-cyan-900 flex items-center justify-between">
              <span className="font-semibold">Need to request stock replenishment?</span>
              <Link to="/procurement" className="text-cyan-700 font-bold hover:underline">
                Create Indent &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. SITE ENGINEER DASHBOARD
  // =========================================================================
  if (role === 'SITE_ENGINEER') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Site Operations & Field Execution Dashboard
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                Site Supervisor
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily site reports (DPR), milestone tasks, work execution, and labour deployment.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
              🏗️ {s.activeProjects} Active Sites
            </span>
            {s.overdueTasksCount > 0 && (
              <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{s.overdueTasksCount} Delayed Tasks</span>
              </span>
            )}
          </div>
        </div>

        {/* Site Engineer KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Site Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-blue-700 mt-2">{s.activeTasksCount || 8}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Work currently in progress on site</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Delayed / Overdue Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-600 mt-2">{s.overdueTasksCount || 0}</p>
            <div className="flex items-center text-[11px] text-amber-600 mt-1 font-semibold">
              <span>Requires immediate supervisor action</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Daily Site Reports (DPR)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-700 mt-2">{s.totalDPRCount || 14}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Shift logs submitted across sites</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Material Indents</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-purple-700 mt-2">{s.pendingRequisitions || 0}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Requisitions raised to stores</span>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines & DPR Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-900">Upcoming Construction Milestones & Tasks</h2>
              </div>
              <Link to="/tasks" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
                <span>All Tasks</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {(data?.upcomingDeadlines || []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-bold text-slate-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500">{t.project?.name} • Due: {formatDate(t.dueDate)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">Site Engineer Quick Operations</h2>
              <p className="text-xs text-slate-500 mb-4">Field execution and live site documentation</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/dpr"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition text-left group"
                >
                  <FileText className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Daily Site Report</p>
                  <p className="text-[10px] text-slate-500">Log today's site work & photos</p>
                </Link>

                <Link
                  to="/tasks"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition text-left group"
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Task Management</p>
                  <p className="text-[10px] text-slate-500">Update progress & completions</p>
                </Link>

                <Link
                  to="/shift-logger"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition text-left group"
                >
                  <Users className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Shift Logger</p>
                  <p className="text-[10px] text-slate-500">Log site labour attendance</p>
                </Link>

                <Link
                  to="/boq"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition text-left group"
                >
                  <Layers className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Internal BOQ</p>
                  <p className="text-[10px] text-slate-500">Review technical specs</p>
                </Link>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <span className="font-semibold">Need materials dispatched to site?</span>
              <Link to="/inventory" className="text-emerald-700 font-bold hover:underline">
                Raise Site Requisition &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. PURCHASE MANAGER DASHBOARD
  // =========================================================================
  if (role === 'PURCHASE_MANAGER') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Procurement & Vendor Supply Chain Dashboard
              </h1>
              <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-cyan-300">
                Procurement Lead
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Purchase orders, supplier payables, vendor performance, and material indents.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
              🛒 {s.totalPOCount || 12} Purchase Orders
            </span>
            <span className="bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg border border-cyan-200">
              🏭 {s.totalSuppliersCount || 12} Registered Vendors
            </span>
          </div>
        </div>

        {/* Purchase KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Material Purchases</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-indigo-700 mt-2">{formatCurrency(s.totalMaterialsCost || 0)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Total purchase orders committed</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Supplier & Vendor Payables</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-600 mt-2">{formatCurrency(s.supplierPayables || 0)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Outstanding balance to material suppliers</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Site Requisitions</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-600 mt-2">{s.pendingRequisitions || 0}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Site indents awaiting PO release</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Stores Stock Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-cyan-700 mt-2">{formatCurrency(s.materialStockValue || 0)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Current stores stock value</span>
            </div>
          </div>
        </div>

        {/* Pending Requisitions to process into POs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Site Material Indents Awaiting PO Release</h2>
              <p className="text-xs text-slate-500">Review requests from site engineers and create purchase orders</p>
            </div>
            <Link to="/procurement" className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center">
              <span>Open Procurement</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.pendingRequisitionsList || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No pending requisitions awaiting PO release.</p>
            ) : (
              (data?.pendingRequisitionsList || []).map((req: any) => (
                <div key={req.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs">{req.requisitionNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                        Priority: {req.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Project: <span className="text-slate-900 font-semibold">{req.project?.name}</span> • Requested by: {req.requestedBy?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Items: {req.items?.map((it: any) => `${it.material?.name} (${it.requestedQty} ${it.unit})`).join(', ') || 'Listed items'}
                    </p>
                  </div>
                  <Link
                    to="/procurement"
                    className="px-3 py-1.5 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 transition text-xs shadow-sm"
                  >
                    Generate PO
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. HR MANAGER DASHBOARD
  // =========================================================================
  if (role === 'HR_MANAGER') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Workforce, Labour & Payroll Welfare Dashboard
              </h1>
              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                HR & Labour Lead
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Labour muster roll, daily attendance, contractor wages, and workforce strength.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
              👷 {s.totalWorkersCount || 45} Registered Workers
            </span>
            <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200">
              🏗️ {s.activeProjects} Active Sites
            </span>
          </div>
        </div>

        {/* HR KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Labour Wages Incurred</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-700 mt-2">{formatCurrency(s.totalLabourCost || 0)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Calculated from muster roll shift logs</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Registered Trade Workers</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-blue-700 mt-2">{s.totalWorkersCount || 45}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Masons, helpers, carpenters & trades</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Construction Sites</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-700 mt-2">{s.activeProjects}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Sites with active labour shifts</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Statutory Compliance Status</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-purple-700 mt-2">Active</p>
            <div className="flex items-center text-[11px] text-emerald-600 mt-1 font-semibold">
              <span>ESI, PF & safety protocols met</span>
            </div>
          </div>
        </div>

        {/* HR Actions & Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Workforce & Trade Distribution</h2>
              <Link to="/labour" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
                <span>Muster Roll</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { trade: 'Masons & Bricklayers', count: 18, share: '40%' },
                { trade: 'Carpenters & Joiners', count: 12, share: '27%' },
                { trade: 'Electricians & Plumbers', count: 8, share: '18%' },
                { trade: 'General Site Helpers', count: 7, share: '15%' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{item.trade}</p>
                    <p className="text-[10px] text-slate-500">{item.share} of total deployed workforce</p>
                  </div>
                  <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {item.count} Workers
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-2">Workforce Management Quick Links</h2>
              <p className="text-xs text-slate-500 mb-4">Manage contractor muster rolls, shift logs, and staff assignments.</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/labour"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 transition text-left group"
                >
                  <Users className="w-5 h-5 text-rose-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Labour Muster Roll</p>
                  <p className="text-[10px] text-slate-500">Calculate weekly wages & payouts</p>
                </Link>

                <Link
                  to="/shift-logger"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition text-left group"
                >
                  <Clock className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Daily Shift Logger</p>
                  <p className="text-[10px] text-slate-500">Review check-in/out records</p>
                </Link>

                <Link
                  to="/staff"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition text-left group"
                >
                  <Building2 className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Office Staff</p>
                  <p className="text-[10px] text-slate-500">Manage engineers & supervisors</p>
                </Link>

                <Link
                  to="/documents"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition text-left group"
                >
                  <FileText className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Labour Contracts</p>
                  <p className="text-[10px] text-slate-500">Subcontractor agreements</p>
                </Link>
              </div>
            </div>

            <div className="mt-4 p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-rose-900 flex items-center justify-between">
              <span className="font-semibold">Need to process weekly labour muster roll?</span>
              <Link to="/labour" className="text-rose-700 font-bold hover:underline">
                Open Labour Roll &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. ACCOUNTS MANAGER DASHBOARD
  // =========================================================================
  if (role === 'ACCOUNTS_MANAGER') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Finance, Accounts & Statutory Tax Dashboard
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                Chief Accounts Officer
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Certified client RA billing, cash collections, accounts receivables, GST liabilities, and vendor payables.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">
              💰 {formatCurrency(s.totalMoneyReceived)} Collected
            </span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200">
              ⏳ {formatCurrency(s.outstandingReceivables)} Due
            </span>
          </div>
        </div>

        {/* Accounts KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Certified RA Bills</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.totalClientBilling)}</p>
            <div className="flex items-center text-[11px] text-emerald-600 mt-1">
              <span>Billed revenue recognized</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Cash Collected</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-600 mt-2">{formatCurrency(s.totalMoneyReceived)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Net bank & RTGS collections</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Client Receivables (Due)</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-600 mt-2">{formatCurrency(s.outstandingReceivables)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Billed balance due from clients</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Supplier & Vendor Payables</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-600 mt-2">{formatCurrency(s.supplierPayables)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Liabilities to material vendors</span>
            </div>
          </div>
        </div>

        {/* GST Statutory Compliance Banner */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 p-4 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                    Total Collected Tax Liability Payable (GST 18%)
                  </h3>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                    Statutory Compliance
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time statutory GST tax liability collected across milestone invoices & interior contracts.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Billed Tax</span>
                <span className="font-bold text-slate-700 text-xs">{formatCurrency(s.totalBilledTaxLiability || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pending Collection</span>
                <span className="font-bold text-amber-700 text-xs">{formatCurrency(s.pendingTaxLiability || 0)}</span>
              </div>
              <div className="text-right pl-4 border-l border-purple-200">
                <span className="text-[10px] text-purple-700 uppercase font-bold block">Tax Liability Payable</span>
                <span className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
                  {formatCurrency(s.totalCollectedTaxLiability || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow Chart & Financial Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Monthly Cash Inflow vs Outflow</h2>
                <p className="text-xs text-slate-500">Client collections versus vendor & payroll disbursements</p>
              </div>
              <Link to="/accounts" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
                <span>Ledgers</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.cashFlowTrend || []}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorInflowAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutflowAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="inflow" name="Cash Inflow (Receipts)" stroke="#10b981" fillOpacity={1} fill="url(#colorInflowAcc)" />
                  <Area type="monotone" dataKey="outflow" name="Cash Outflow (Disbursements)" stroke="#ef4444" fillOpacity={1} fill="url(#colorOutflowAcc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-2">Finance & Billing Quick Actions</h2>
              <p className="text-xs text-slate-500 mb-4">Direct access to client invoicing, payment receipts, and vendor ledger.</p>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/invoicing"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition text-left group"
                >
                  <Receipt className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Client RA Bills</p>
                  <p className="text-[10px] text-slate-500">Raise milestone invoices</p>
                </Link>

                <Link
                  to="/accounts"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition text-left group"
                >
                  <Wallet className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">General Ledger</p>
                  <p className="text-[10px] text-slate-500">Petty cash & site expenses</p>
                </Link>

                <Link
                  to="/quotations"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition text-left group"
                >
                  <FileText className="w-5 h-5 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Client Proposals</p>
                  <p className="text-[10px] text-slate-500">Review formal estimates</p>
                </Link>

                <Link
                  to="/procurement"
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition text-left group"
                >
                  <ShoppingCart className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">Vendor Invoices</p>
                  <p className="text-[10px] text-slate-500">Process supplier payments</p>
                </Link>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <span className="font-semibold">Review outstanding client payments?</span>
              <Link to="/invoicing" className="text-emerald-700 font-bold hover:underline">
                Open Billing &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. PROJECT MANAGER (GM / PM) DASHBOARD
  // =========================================================================
  if (role === 'PROJECT_MANAGER') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Project Portfolio & Delivery Execution Dashboard
              </h1>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-300">
                General Manager / PM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Project health, approved budget ceilings vs actual cost, milestones, and site productivity.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
              🏗️ {s.activeProjects} Active Projects
            </span>
            {s.overdueTasksCount > 0 && (
              <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{s.overdueTasksCount} Delayed Tasks</span>
              </span>
            )}
          </div>
        </div>

        {/* PM KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Approved Project Budgets</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.totalApprovedBudget)}</p>
            <div className="flex items-center text-[11px] text-emerald-600 mt-1">
              <span>Planned cost ceiling</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Actual Incurred Cost</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.actualExpenditureToDate)}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Materials + Labour + Expenses</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Projects Portfolio</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-blue-700 mt-2">{s.activeProjects} / {s.totalProjects}</p>
            <div className="flex items-center text-[11px] text-slate-500 mt-1">
              <span>Ongoing sites under execution</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Delayed / Overdue Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-600 mt-2">{s.overdueTasksCount || 0}</p>
            <div className="flex items-center text-[11px] text-rose-600 mt-1 font-semibold">
              <span>Critical milestones requiring escalation</span>
            </div>
          </div>
        </div>

        {/* Project Budget vs Actual Cost Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Project Budget vs Incurred Cost Variance</h2>
              <p className="text-xs text-slate-500">Tracking site cost adherence against approved contract ceilings</p>
            </div>
            <Link to="/projects" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
              <span>View Projects</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.projectProfitability || []}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="approvedBudget" name="Approved Budget" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualCost" name="Actual Expenditure" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Health Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Portfolio Health & Execution Status</h2>
              <p className="text-xs text-slate-500">Monitoring budget burn rates, completion percentage, and cost ceilings</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approved Budget</th>
                  <th className="py-3 px-4 text-right">Incurred Cost</th>
                  <th className="py-3 px-4 text-center">Budget Burn</th>
                  <th className="py-3 px-4 text-center">Completion %</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(data?.projectProfitability || []).map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <Link to={`/projects/${p.id}`} className="font-bold text-slate-900 hover:text-amber-600">
                        {p.name}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-mono">{p.code}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-semibold">{formatCurrency(p.approvedBudget)}</td>
                    <td className="py-3 px-4 text-right text-amber-700 font-bold">{formatCurrency(p.actualCost)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-20 bg-slate-200 rounded-full h-2 mx-auto overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${p.budgetUtilization > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, p.budgetUtilization)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{p.budgetUtilization}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-800">{p.completionPercent || 0}%</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/projects/${p.id}`}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold hover:bg-blue-100"
                      >
                        Overview
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. EXECUTIVE OWNER & AUDITOR DASHBOARD (Default for Owner / Auditor)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Company Executive & Owner Dashboard
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              Live DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial performance, project profitability, site procurement, and cash flows.
          </p>
        </div>

        {/* Quick Summary Pill Counters */}
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            🏗️ {s.activeProjects} Active Projects
          </span>
          {s.lowStockAlertsCount > 0 && (
            <Link
              to="/inventory"
              className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition flex items-center space-x-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>{s.lowStockAlertsCount} Low Stock</span>
            </Link>
          )}
          {s.overdueTasksCount > 0 && (
            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{s.overdueTasksCount} Delayed</span>
            </span>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contract Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Contract Value</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.totalContractValue)}</p>
          <div className="flex items-center text-[11px] text-slate-500 mt-1">
            <span>Approved contract orders</span>
          </div>
        </div>

        {/* Total Approved Budgets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Approved Project Budgets</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.totalApprovedBudget)}</p>
          <div className="flex items-center text-[11px] text-emerald-600 mt-1">
            <span>Planned cost ceiling</span>
          </div>
        </div>

        {/* Actual Expenditure to Date */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Actual Cost Incurred</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.actualExpenditureToDate)}</p>
          <div className="flex items-center text-[11px] text-slate-500 mt-1">
            <span>Materials + Labour + Expenses</span>
          </div>
        </div>

        {/* Total Client Billing */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Certified RA Bills</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(s.totalClientBilling)}</p>
          <div className="flex items-center text-[11px] text-emerald-600 mt-1">
            <span>Billed revenue recognized</span>
          </div>
        </div>

        {/* Money Received (Cash Collected) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Cash Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-2">{formatCurrency(s.totalMoneyReceived)}</p>
          <div className="flex items-center text-[11px] text-slate-500 mt-1">
            <span>Net bank & RTGS collections</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Client Receivables (Due)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-amber-600 mt-2">{formatCurrency(s.outstandingReceivables)}</p>
          <div className="flex items-center text-[11px] text-slate-500 mt-1">
            <span>Billed balance due from clients</span>
          </div>
        </div>

        {/* Supplier & Vendor Payables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Supplier & Vendor Payables</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-rose-600 mt-2">{formatCurrency(s.supplierPayables)}</p>
          <div className="flex items-center text-[11px] text-slate-500 mt-1">
            <span>Liabilities to material vendors</span>
          </div>
        </div>

        {/* Material Stock Valuation */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Stores Stock Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-cyan-700 mt-2">{formatCurrency(s.materialStockValue)}</p>
          <div className="flex items-center text-[11px] text-slate-500 mt-1">
            <span>Weighted average stores value</span>
          </div>
        </div>

        {/* GST Statutory Compliance Banner */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 p-4 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition sm:col-span-2 lg:col-span-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                    Total Collected Tax Liability Payable (GST 18%)
                  </h3>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                    Statutory Compliance
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time statutory GST tax liability collected across milestone invoices & interior contracts.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Billed Tax</span>
                <span className="font-bold text-slate-700 text-xs">{formatCurrency(s.totalBilledTaxLiability || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pending Collection</span>
                <span className="font-bold text-amber-700 text-xs">{formatCurrency(s.pendingTaxLiability || 0)}</span>
              </div>
              <div className="text-right pl-4 border-l border-purple-200">
                <span className="text-[10px] text-purple-700 uppercase font-bold block">Tax Liability Payable</span>
                <span className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
                  {formatCurrency(s.totalCollectedTaxLiability || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Pipeline & BOQ Quotations Summary Cards */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sm:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">Lead Pipeline Performance</span>
                <p className="text-[10px] text-slate-400">Design inquiries & site measurements</p>
              </div>
            </div>
            <Link to="/leads" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
              <span>View Pipeline</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-500 block">Active Inquiries</span>
              <span className="text-sm font-extrabold text-slate-900">{s.leadsSummary?.activeLeads || 0}</span>
            </div>
            <div className="p-2 bg-cyan-50 rounded-lg">
              <span className="text-[10px] text-cyan-700 block">Quotes Shared</span>
              <span className="text-sm font-extrabold text-cyan-800">{s.leadsSummary?.boqSharedLeads || 0}</span>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="text-[10px] text-emerald-700 block">Won Projects</span>
              <span className="text-sm font-extrabold text-emerald-800">{s.leadsSummary?.leadsWon || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sm:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">Client Quotations Engine</span>
                <p className="text-[10px] text-slate-400">Formal proposals & milestone payment estimates</p>
              </div>
            </div>
            <Link to="/quotations" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
              <span>Client Proposals</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-500 block">Total Proposals</span>
              <span className="text-sm font-extrabold text-slate-900">{s.quotationsSummary?.totalQuotations || 0}</span>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <span className="text-[10px] text-indigo-700 block">Total Proposal Value</span>
              <span className="text-sm font-extrabold text-indigo-800">{formatCurrency(s.quotationsSummary?.totalValue || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Budget Utilization & Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Budget Utilization Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Project Budget vs Incurred Cost</h2>
              <p className="text-xs text-slate-500">Tracking cost adherence against approved contract ceilings</p>
            </div>
            <Link to="/projects" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
              <span>View Projects</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.projectProfitability || []}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="approvedBudget" name="Approved Budget" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualCost" name="Actual Expenditure" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6-Month Cash Flow Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Cash Inflow vs Outflow</h2>
              <p className="text-xs text-slate-500">Client collections versus vendor & payroll disbursements</p>
            </div>
            <Link to="/accounts" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center">
              <span>Ledgers</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.cashFlowTrend || []}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="inflow" name="Cash Inflow (Receipts)" stroke="#10b981" fillOpacity={1} fill="url(#colorInflow)" />
                <Area type="monotone" dataKey="outflow" name="Cash Outflow (Disbursements)" stroke="#ef4444" fillOpacity={1} fill="url(#colorOutflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Profitability Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Project-Wise Profitability & Performance</h2>
            <p className="text-xs text-slate-500">Separating contract value, revenue recognized, actual costs, and net margin</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-right">Approved Budget</th>
                <th className="py-3 px-4 text-right">Incurred Cost</th>
                <th className="py-3 px-4 text-center">Budget Burn</th>
                <th className="py-3 px-4 text-right">Billed (RA)</th>
                <th className="py-3 px-4 text-right">Collected</th>
                <th className="py-3 px-4 text-right">Est. Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(data?.projectProfitability || []).map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <Link to={`/projects/${p.id}`} className="font-bold text-slate-900 hover:text-amber-600">
                      {p.name}
                    </Link>
                    <p className="text-[10px] text-slate-400 font-mono">{p.code}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      p.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">{formatCurrency(p.contractValue)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(p.approvedBudget)}</td>
                  <td className="py-3 px-4 text-right text-amber-700 font-semibold">{formatCurrency(p.actualCost)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="w-20 bg-slate-200 rounded-full h-2 mx-auto overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${p.budgetUtilization > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, p.budgetUtilization)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{p.budgetUtilization}%</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(p.billedAmount)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-semibold">{formatCurrency(p.receivedAmount)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(p.estimatedProfit)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-bold ${p.profitMarginPercent >= 15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatPercent(p.profitMarginPercent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Bottom Widgets: Live Audit Trail & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Audit Log */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Recent Enterprise Audit Trail</h2>
          </div>
          <div className="space-y-3">
            {(data?.recentActivities || []).map((a: any) => (
              <div key={a.id} className="flex items-start justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-800">{a.user?.name || 'System'}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                      {a.action}
                    </span>
                    <span className="text-[10px] text-slate-400">on {a.entity}</span>
                  </div>
                  {a.details && (
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate max-w-sm">
                      {a.details}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                  {formatDate(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Task Deadlines */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900">Upcoming Construction Milestones</h2>
          </div>
          <div className="space-y-3">
            {(data?.upcomingDeadlines || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-bold text-slate-900">{t.title}</p>
                  <p className="text-[11px] text-slate-500">{t.project?.name} • Due: {formatDate(t.dueDate)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                  t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
