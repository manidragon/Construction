import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  Key,
  Copy,
  Check,
  Calendar,
  MessageSquare,
  TrendingUp,
  FolderKanban,
  FileSpreadsheet,
  Receipt,
  Eye,
  EyeOff,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Database,
  Lock,
  LogOut,
  ExternalLink,
  Mail,
} from 'lucide-react';
import api from '../services/api';
import { Tenant, SuperAdminStats } from '../types';

export const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Client Credential reveal & copy state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Register Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    companyName: '',
    ownerEmail: '',
    ownerName: '',
    phone: '',
    password: '',
    trialDays: 14,
    planType: 'FREE_TRIAL',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Prestige Trade Tower, High Grounds',
    gstin: '',
  });
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [registerSuccessData, setRegisterSuccessData] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Extend Trial Modal state
  const [extendModalTenant, setExtendModalTenant] = useState<Tenant | null>(null);
  const [extendDays, setExtendDays] = useState(14);
  const [submittingExtend, setSubmittingExtend] = useState(false);

  // Change Status Modal state
  const [statusModalTenant, setStatusModalTenant] = useState<Tenant | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED'>('ACTIVE');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Reset Demo Modal state
  const [resetDemoModalTenant, setResetDemoModalTenant] = useState<Tenant | null>(null);
  const [submittingResetDemo, setSubmittingResetDemo] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes] = await Promise.all([
        api.getSuperAdminStats(),
        api.getAllTenants(),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (tenantsRes.success) setTenants(tenantsRes.tenants);
    } catch (err) {
      console.error('Failed to load Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') {
      navigate('/platform-admin/login', { replace: true });
      return;
    }
    fetchData();
  }, [user, navigate]);

  const handleAutoGeneratePassword = () => {
    const randomPass = `Nearlook@${Math.floor(1000 + Math.random() * 9000)}`;
    setRegisterForm((prev) => ({ ...prev, password: randomPass }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingRegister(true);
      const res = await api.createTenant(registerForm);
      if (res.success) {
        setRegisterSuccessData(res.credentials);
        setIsRegisterOpen(false);
        fetchData();
      } else {
        alert(res.message || 'Failed to register tenant.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error creating tenant.');
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleExtendTrialSubmit = async () => {
    if (!extendModalTenant) return;
    try {
      setSubmittingExtend(true);
      const res = await api.extendTrial(extendModalTenant.id, { daysToAdd: extendDays });
      if (res.success) {
        setExtendModalTenant(null);
        fetchData();
      } else {
        alert(res.message || 'Failed to extend trial.');
      }
    } catch (err: any) {
      alert(err.message || 'Error extending trial.');
    } finally {
      setSubmittingExtend(false);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!statusModalTenant) return;
    try {
      setSubmittingStatus(true);
      const res = await api.updateTenantStatus(statusModalTenant.id, { status: newStatus });
      if (res.success) {
        setStatusModalTenant(null);
        fetchData();
      } else {
        alert(res.message || 'Failed to update tenant status.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleResetDemoSubmit = async () => {
    if (!resetDemoModalTenant) return;
    try {
      setSubmittingResetDemo(true);
      const res = await api.resetDemoTenant(resetDemoModalTenant.id);
      if (res.success) {
        setResetDemoModalTenant(null);
        alert(res.message || 'Demo data successfully reset!');
        fetchData();
      } else {
        alert(res.message || 'Failed to reset demo data.');
      }
    } catch (err: any) {
      alert(err.message || 'Error resetting demo data.');
    } finally {
      setSubmittingResetDemo(false);
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesFilter =
      filterStatus === 'ALL' ||
      (filterStatus === 'TRIAL' && t.status === 'TRIAL' && !t.isTrialExpired) ||
      (filterStatus === 'EXPIRED' && (t.status === 'EXPIRED' || (t.status === 'TRIAL' && t.isTrialExpired))) ||
      t.status === filterStatus;

    const matchesSearch =
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div
      id="superadmin-scroll-container"
      className="h-screen w-full overflow-y-auto overscroll-contain bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 pb-16 space-y-6"
    >
      {/* Standalone Vendor Operator Navigation Strip */}
      <div className="bg-slate-900/90 border border-indigo-900/40 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-white font-black shadow-md shadow-indigo-950/50">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">NEARLOOK <span className="text-indigo-400">SAAS PLATFORM</span></span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                Vendor Control Portal Only
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Seller Dashboard for tracking client trials, passwords, and database isolation.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <a
            href="/login"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 transition"
          >
            <span>Open Client Construction ERP ↗</span>
          </a>
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800 text-slate-400">
            <span>Operator: <strong className="text-white">{user?.name || 'Platform Administrator'}</strong></span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('erp_token');
              localStorage.removeItem('erp_user');
              navigate('/platform-admin/login');
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/40">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              <span>SaaS Platform Control Center</span>
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Live Production
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Super Admin: Multi-Tenancy & Trial Engine</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Register new construction & interior companies, manage 14/30-day trial lifecycles, extend trial dates, and monitor global usage.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition"
            title="Refresh tenants"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              handleAutoGeneratePassword();
              setIsRegisterOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Company</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Tenants</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats ? stats.totalTenants : '...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Registered businesses</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Active Trials</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats ? stats.trialTenants : '...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">In 14/30-day trial</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Paid Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats ? stats.activeTenants : '...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Paid subscriptions</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Expired Trials</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {stats ? stats.expiredTenants : '...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Locked (Action needed)</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Users</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats ? stats.totalUsers : '...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Staff across tenants</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">SaaS Invoicing</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white truncate">
            ₹{stats ? (stats.totalSaaSBilling / 100000).toFixed(1) + 'L' : '...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total client billings</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, code, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Company & Code</th>
                <th className="py-3 px-4">Client Login Credentials (User ID & Password)</th>
                <th className="py-3 px-4">Dedicated Database</th>
                <th className="py-3 px-4">Status & Plan</th>
                <th className="py-3 px-4">Trial Countdown</th>
                <th className="py-3 px-4 text-center">Data Usage</th>
                <th className="py-3 px-4 text-center">WhatsApp Gateway</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No tenants found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{t.companyName}</div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{t.code}</div>
                      <div className="text-[11px] text-slate-500">{t.phone}</div>
                    </td>

                    {/* Client Login Credentials (User ID & Password) */}
                    <td className="py-3 px-4">
                      <div className="space-y-1.5 min-w-[220px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60 text-[11px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            User ID:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-200 font-semibold truncate max-w-[130px]" title={t.ownerEmail}>
                              {t.ownerEmail}
                            </span>
                            <button
                              onClick={() => copyToClipboard(t.ownerEmail, `email-${t.id}`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                              title="Copy Client User ID"
                            >
                              {copiedId === `email-${t.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 border-t border-slate-800/80 pt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-400" />
                            Password:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-amber-400 font-bold">
                              {revealedPasswords[t.id] ? (t.adminPassword || 'Password@123') : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordReveal(t.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                              title={revealedPasswords[t.id] ? "Hide Password" : "Show Password to Client"}
                            >
                              {revealedPasswords[t.id] ? <EyeOff className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(t.adminPassword || 'Password@123', `pass-${t.id}`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                              title="Copy Client Password"
                            >
                              {copiedId === `pass-${t.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dedicated Database Isolation */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Database className="w-3 h-3" />
                          Dedicated DB
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={t.databasePath || `./tenants/tenant_${t.code}.db`}>
                          {t.databasePath || `./tenants/tenant_${t.code}.db`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Size: {t.databaseSize || '1.8 MB'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : t.status === 'TRIAL' && !t.isTrialExpired
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : t.status === 'EXPIRED' || t.isTrialExpired
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {t.isTrialExpired && t.status === 'TRIAL' ? 'EXPIRED' : t.status}
                        </span>
                        <span className="text-[10px] text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                          {t.planType}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {t.status === 'ACTIVE' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Unlimited / Paid</span>
                        </span>
                      ) : t.isTrialExpired ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Trial Ended</span>
                        </span>
                      ) : (
                        <div>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {t.daysRemaining} days left
                          </span>
                          <div className="text-[10px] text-slate-400">
                            Until {t.trialEndDate ? new Date(t.trialEndDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span title="Staff Users">👥 {t.userCount}</span>
                        <span>•</span>
                        <span title="Projects">🏗️ {t.projectCount}</span>
                        <span>•</span>
                        <span title="Leads">🎯 {t.leadCount}</span>
                        <span>•</span>
                        <span title="Invoices">🧾 {t.invoiceCount}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {t.whatsappConfigured ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Custom Cloud API
                        </span>
                      ) : (
                        <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                          Nearlook Gateway
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setExtendModalTenant(t)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded font-semibold text-[11px] transition"
                        >
                          + Extend Trial
                        </button>
                        <button
                          onClick={() => {
                            setStatusModalTenant(t);
                            setNewStatus(t.status as any);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-[11px] transition"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => setResetDemoModalTenant(t)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded font-semibold text-[11px] transition"
                          title="Reset and re-seed clean sample demo records for prospective constructors"
                        >
                          Reset Demo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER NEW TENANT MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 p-2 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Register Client Company</h3>
                  <p className="text-xs text-slate-500">Create tenant workspace and set free trial duration</p>
                </div>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Firm Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prestige Turnkey Interiors Pvt. Ltd."
                  value={registerForm.companyName}
                  onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner / MD Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajeshwar Sharma"
                    value={registerForm.ownerName}
                    onChange={(e) => setRegisterForm({ ...registerForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Work Email (Admin Username) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. owner@prestigeinteriors.com"
                    value={registerForm.ownerEmail}
                    onChange={(e) => setRegisterForm({ ...registerForm, ownerEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 12345"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGeneratePassword}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trial Duration (Days)
                  </label>
                  <select
                    value={registerForm.trialDays}
                    onChange={(e) => setRegisterForm({ ...registerForm, trialDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={7}>7 Days (Fast Evaluation)</option>
                    <option value={14}>14 Days (Standard Trial)</option>
                    <option value={30}>30 Days (Extended Pilot)</option>
                    <option value={60}>60 Days (Enterprise PoC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SaaS Plan
                  </label>
                  <select
                    value={registerForm.planType}
                    onChange={(e) => setRegisterForm({ ...registerForm, planType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FREE_TRIAL">Free Trial (14 Days)</option>
                    <option value="STARTER">Starter Tier</option>
                    <option value="PRO">Pro Enterprise Tier</option>
                    <option value="ENTERPRISE">Full Custom Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRegister}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5"
                >
                  {submittingRegister ? <span>Creating Workspace...</span> : <span>Register Tenant</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS SUCCESS MODAL */}
      {registerSuccessData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-emerald-600 mb-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Tenant Registered & Credentials Generated!
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide these login details to the client business owner. A welcome WhatsApp notice has also been logged.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-400">Company Code:</span>{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">{registerSuccessData.companyCode}</strong>
              </div>
              <div>
                <span className="text-slate-400">Admin Username:</span>{' '}
                <strong className="text-slate-900 dark:text-white">{registerSuccessData.adminEmail}</strong>
              </div>
              <div>
                <span className="text-slate-400">Password:</span>{' '}
                <strong className="text-amber-600 dark:text-amber-400 font-bold">
                  {registerSuccessData.temporaryPassword}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Trial Period:</span>{' '}
                <strong className="text-emerald-600">{registerSuccessData.trialDurationDays} Days</strong> (Until{' '}
                {new Date(registerSuccessData.trialEndDate).toLocaleDateString()})
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Company: ${registerSuccessData.companyCode}\nLogin: ${registerSuccessData.adminEmail}\nPassword: ${registerSuccessData.temporaryPassword}\nLogin Portal: http://localhost:3000/login`
                  );
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied Details!' : 'Copy Credentials'}</span>
              </button>

              <button
                onClick={() => setRegisterSuccessData(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND TRIAL MODAL */}
      {extendModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Extend Trial Period</h3>
            <p className="text-xs text-slate-500 mt-1">
              Extend access for <strong>{extendModalTenant.companyName}</strong>. If previously expired, their account
              will immediately reactivate.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Days to Add</label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      extendDays === d
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    +{d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setExtendModalTenant(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrialSubmit}
                disabled={submittingExtend}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold rounded-xl text-xs shadow-md transition"
              >
                {submittingExtend ? 'Updating...' : `Extend +${extendDays} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {statusModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Update Tenant Status</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select status for <strong>{statusModalTenant.companyName}</strong>.
            </p>

            <div className="mt-4 space-y-2">
              {(['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'] as const).map((st) => (
                <label
                  key={st}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition ${
                    newStatus === st
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{st}</span>
                  <input
                    type="radio"
                    name="status"
                    checked={newStatus === st}
                    onChange={() => setNewStatus(st)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setStatusModalTenant(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChangeSubmit}
                disabled={submittingStatus}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                {submittingStatus ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DEMO DATA MODAL */}
      {resetDemoModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400 mb-3">
              <RefreshCw className="w-6 h-6 animate-spin-reverse" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Reset Demo Environment</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to reset the demo environment for{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{resetDemoModalTenant.companyName}</strong> ({resetDemoModalTenant.code})?
            </p>

            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> What this action does:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Clears temporary test records created during contractor demonstrations</li>
                <li>Restores pristine demo villa construction project, BOQ, client & staff</li>
                <li>Resets trial lifecycle clock with 14 fresh days of active testing</li>
                <li>Guarantees 100% tenant data isolation from other constructors</li>
              </ul>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setResetDemoModalTenant(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemoSubmit}
                disabled={submittingResetDemo}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                {submittingResetDemo ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Confirm Reset Demo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdmin;
