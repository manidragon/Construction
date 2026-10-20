import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
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
  const { selectedProjectId } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  }, [selectedProjectId]);

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
