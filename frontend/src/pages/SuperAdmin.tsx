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
  Laptop,
  Smartphone,
  Monitor,
  PauseCircle,
  PlayCircle,
  HelpCircle,
  ArrowUpRight,
  Send,
  Filter,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import { Tenant, SuperAdminStats, SaaSTransaction, SupportTicket } from '../types';

export const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<'tenants' | 'ledger' | 'support' | 'metrics'>('tenants');

  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [saasTransactions, setSaaSTransactions] = useState<SaaSTransaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Tenant Filters & Search
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
    subscriptionModel: 'FREE_TRIAL',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Prestige Trade Tower, High Grounds',
    gstin: '',
  });
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [registerSuccessData, setRegisterSuccessData] = useState<any | null>(null);

  // Extend Trial Modal state
  const [extendModalTenant, setExtendModalTenant] = useState<Tenant | null>(null);
  const [extendDays, setExtendDays] = useState(14);
  const [submittingExtend, setSubmittingExtend] = useState(false);

  // Change Status Modal state
  const [statusModalTenant, setStatusModalTenant] = useState<Tenant | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED'>('ACTIVE');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Instant Pause / Suspend Modal state
  const [suspendModalTenant, setSuspendModalTenant] = useState<Tenant | null>(null);
  const [suspendReason, setSuspendReason] = useState('Payment renewal overdue / Contract expired');
  const [submittingSuspend, setSubmittingSuspend] = useState(false);

  // Reset Demo Modal state
  const [resetDemoModalTenant, setResetDemoModalTenant] = useState<Tenant | null>(null);
  const [submittingResetDemo, setSubmittingResetDemo] = useState(false);

  // SaaS Inflow / Transaction Record Modal state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    companyId: '',
    invoiceNumber: `SAAS-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    transactionDate: new Date().toISOString().split('T')[0],
    planType: 'LIFETIME_PAID',
    billingCycle: 'ONE_TIME',
    amount: 99999,
    currency: 'INR',
    paymentMode: 'NEFT_RTGS',
    paymentRef: '',
    status: 'PAID',
    notes: 'Full Lifetime Commercial License & Cloud Provisioning',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Support Ticket Inbox Drawer & Reply state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        api.getSuperAdminStats(),
        api.getAllTenants(),
        api.getSaaSTransactions(),
        api.getSupportTickets(),
      ]);

      const [statsResult, tenantsResult, txResult, ticketsResult] = results;

      if (statsResult.status === 'fulfilled' && statsResult.value?.success) {
        setStats(statsResult.value.stats);
      }
      if (tenantsResult.status === 'fulfilled' && tenantsResult.value?.success) {
        setTenants(tenantsResult.value.tenants || []);
      }
      if (txResult.status === 'fulfilled' && txResult.value?.success) {
        setSaaSTransactions(txResult.value.transactions || []);
      }
      if (ticketsResult.status === 'fulfilled' && ticketsResult.value?.success) {
        setSupportTickets(ticketsResult.value.tickets || []);
      }
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

  // Instant Suspend / Reactivate Actions
  const handleToggleSuspendSubmit = async () => {
    if (!suspendModalTenant) return;
    try {
      setSubmittingSuspend(true);
      const res = await api.updateTenantStatus(suspendModalTenant.id, {
        status: 'SUSPENDED',
        suspendedReason: suspendReason,
      });
      if (res.success) {
        setSuspendModalTenant(null);
        fetchData();
      } else {
        alert(res.message || 'Failed to suspend tenant.');
      }
    } catch (err: any) {
      alert(err.message || 'Error suspending tenant.');
    } finally {
      setSubmittingSuspend(false);
    }
  };

  const handleInstantReactivate = async (tenant: Tenant) => {
    if (!window.confirm(`Reactivate workspace access for ${tenant.companyName}?`)) return;
    try {
      const res = await api.updateTenantStatus(tenant.id, {
        status: 'ACTIVE',
        suspendedReason: '',
      });
      if (res.success) {
        fetchData();
      } else {
        alert(res.message || 'Failed to reactivate tenant.');
      }
    } catch (err: any) {
      alert(err.message || 'Error reactivating tenant.');
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

  // Record SaaS Inflow / Renewal
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.companyId) {
      alert('Please select a client company.');
      return;
    }
    try {
      setSubmittingPayment(true);
      const res = await api.recordSaaSTransaction(paymentForm);
      if (res.success) {
        setIsRecordPaymentOpen(false);
        setPaymentForm({
          companyId: '',
          invoiceNumber: `SAAS-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          transactionDate: new Date().toISOString().split('T')[0],
          planType: 'LIFETIME_PAID',
          billingCycle: 'ONE_TIME',
          amount: 99999,
          currency: 'INR',
          paymentMode: 'NEFT_RTGS',
          paymentRef: '',
          status: 'PAID',
          notes: '',
        });
        fetchData();
      } else {
        alert(res.message || 'Failed to record transaction.');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording transaction.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Support Reply Submit
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      setSubmittingReply(true);
      const res = await api.replySupportTicket(selectedTicket.id, {
        message: replyMessage.trim(),
        senderName: user?.name || 'Super Admin Platform Support',
      });
      if (res.success) {
        setReplyMessage('');
        // Refresh ticket details
        const updated = await api.getSupportTickets();
        if (updated.success) {
          setSupportTickets(updated.tickets);
          const found = updated.tickets.find((t: any) => t.id === selectedTicket.id);
          if (found) setSelectedTicket(found);
        }
      } else {
        alert(res.message || 'Failed to send reply.');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    try {
      const res = await api.updateSupportTicketStatus(ticketId, { status });
      if (res.success) {
        const updated = await api.getSupportTickets();
        if (updated.success) {
          setSupportTickets(updated.tickets);
          if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
          }
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status.');
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    const isSusp = t.status === 'SUSPENDED' || (t as any).isSuspended;
    const isLifetime = t.subscriptionModel === 'LIFETIME_PAID';
    const isSubscription =
      t.subscriptionModel === 'MONTHLY_SUBSCRIPTION' || t.subscriptionModel === 'YEARLY_SUBSCRIPTION';

    let matchesFilter = true;
    if (filterStatus === 'TRIAL') {
      matchesFilter = t.status === 'TRIAL' && !t.isTrialExpired && !isSusp;
    } else if (filterStatus === 'LIFETIME') {
      matchesFilter = isLifetime && !isSusp;
    } else if (filterStatus === 'SUBSCRIPTION') {
      matchesFilter = isSubscription && !isSusp;
    } else if (filterStatus === 'PAID') {
      matchesFilter = (t.status === 'ACTIVE' || isLifetime || isSubscription) && !isSusp;
    } else if (filterStatus === 'EXPIRED') {
      matchesFilter = (t.status === 'EXPIRED' || (t.status === 'TRIAL' && t.isTrialExpired)) && !isSusp;
    } else if (filterStatus === 'SUSPENDED') {
      matchesFilter = isSusp;
    }

    const matchesSearch =
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Filter support tickets
  const filteredTickets = supportTickets.filter((t) => {
    const matchesStatus = ticketFilterStatus === 'ALL' || t.status === ticketFilterStatus;
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
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
              <span className="font-extrabold text-sm tracking-wide text-white">
                APEXBUILD <span className="text-indigo-400">SAAS CONTROL CENTER</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                Platform Super Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live multi-tenant monitoring, SaaS revenue ledger, support archives, and tenant account controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <a
            href="/login"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 transition"
          >
            <span>Open Client Workspace ↗</span>
          </a>
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800 text-slate-400">
            <span>
              Operator: <strong className="text-white">{user?.name || 'Platform Administrator'}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              logout();
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
              <span>Multi-Tenant Production SaaS</span>
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Live Engine Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Super Admin Control Center & Master Ledger
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Live tenant status tracking, SaaS financial transactions, client support chatbot escalation inbox, and device usage telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition"
            title="Refresh All SaaS Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsRecordPaymentOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition flex items-center space-x-2 text-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Record SaaS Inflow</span>
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
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Tenants</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats ? stats.totalTenants : '...'}</div>
          <div className="text-[11px] text-slate-400 mt-1">All client workspaces</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Active Trials</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats ? stats.trialTenants : '...'}</div>
          <div className="text-[11px] text-slate-400 mt-1">Countdown in progress</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Paid Clients</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats ? stats.activeTenants : '...'}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats?.lifetimeCount || 0} Lifetime · {stats?.monthlyCount || 0} Sub
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Staff</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">
            {stats ? stats.totalStaffAccounts || stats.totalUsers : '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Assigned staff accounts</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Active Devices</span>
            <Monitor className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {stats ? stats.totalActiveDevices || 0 : '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Live active sessions</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">SaaS Inflows</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white truncate">
            ₹{stats?.totalSaaSInflows ? stats.totalSaaSInflows.toLocaleString('en-IN') : stats ? stats.totalSaaSBilling.toLocaleString('en-IN') : '...'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Lifetime & subscriptions</div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'tenants'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tenant Lifecycle & Control</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-[10px] text-indigo-200">
            {tenants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>SaaS Master Ledger & Inflows</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300">
            {saasTransactions.length} Records
          </span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'support'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Support Inbox & Chat Archive</span>
          {stats?.openTicketsCount ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] text-amber-300 font-extrabold animate-pulse">
              {stats.openTicketsCount} Open
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {supportTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'metrics'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Usage & Active Devices</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TENANTS & TRIAL LIFECYCLE */}
      {/* ========================================================================= */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { label: 'ALL', value: 'ALL' },
                { label: 'ACTIVE TRIALS', value: 'TRIAL' },
                { label: 'LIFETIME PAID', value: 'LIFETIME' },
                { label: 'SUBSCRIPTIONS', value: 'SUBSCRIPTION' },
                { label: 'EXPIRED', value: 'EXPIRED' },
                { label: 'SUSPENDED', value: 'SUSPENDED' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterStatus === f.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company, code, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Company & Workspace</th>
                    <th className="py-3 px-4">Owner Credentials</th>
                    <th className="py-3 px-4">Subscription Model</th>
                    <th className="py-3 px-4">Status & Countdown</th>
                    <th className="py-3 px-4 text-center">Staff & Devices</th>
                    <th className="py-3 px-4 text-center">Total Paid</th>
                    <th className="py-3 px-4 text-right">Account Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        No client companies match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const isSusp = t.status === 'SUSPENDED' || (t as any).isSuspended;
                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-800/50 transition ${
                            isSusp ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm">{t.companyName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-indigo-400 font-semibold">{t.code}</span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-400">{t.phone}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                              {t.address || 'Bengaluru, India'}
                            </div>
                          </td>

                          {/* Credentials */}
                          <td className="py-3 px-4">
                            <div className="space-y-1.5 min-w-[200px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400">User ID:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-slate-200 font-semibold truncate max-w-[120px]">
                                    {t.ownerEmail}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(t.ownerEmail, `email-${t.id}`)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                    title="Copy User ID"
                                  >
                                    {copiedId === `email-${t.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1 border-t border-slate-800/80 pt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Password:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-amber-400 font-bold">
                                    {revealedPasswords[t.id] ? t.adminPassword || 'Password@123' : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordReveal(t.id)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                  >
                                    {revealedPasswords[t.id] ? (
                                      <EyeOff className="w-3 h-3 text-indigo-400" />
                                    ) : (
                                      <Eye className="w-3 h-3" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(t.adminPassword || 'Password@123', `pass-${t.id}`)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                    title="Copy Password"
                                  >
                                    {copiedId === `pass-${t.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Subscription Model */}
                          <td className="py-3 px-4">
                            <div>
                              {t.subscriptionModel === 'LIFETIME_PAID' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  LIFETIME LICENSE
                                </span>
                              ) : t.subscriptionModel === 'YEARLY_SUBSCRIPTION' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  YEARLY PLAN
                                </span>
                              ) : t.subscriptionModel === 'MONTHLY_SUBSCRIPTION' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  MONTHLY PLAN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  FREE TRIAL
                                </span>
                              )}
                              <div className="text-[10px] text-slate-400 mt-1">
                                Onboarding:{' '}
                                {t.onboardingCompleted ? (
                                  <span className="text-emerald-400 font-semibold">Done ✓</span>
                                ) : (
                                  <span className="text-amber-400 font-semibold">Pending</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status & Countdown */}
                          <td className="py-3 px-4">
                            {isSusp ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <PauseCircle className="w-3 h-3" /> SUSPENDED
                                </span>
                                <div className="text-[10px] text-rose-400 font-semibold mt-1 max-w-[140px] truncate" title={t.suspendedReason}>
                                  {t.suspendedReason || 'Billing lock'}
                                </div>
                              </div>
                            ) : t.status === 'ACTIVE' || t.subscriptionModel === 'LIFETIME_PAID' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Active & Paid</span>
                                </span>
                                <div className="text-[10px] text-slate-400">Unlimited Access</div>
                              </div>
                            ) : t.isTrialExpired ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-red-400 font-bold text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Trial Expired</span>
                                </span>
                                <div className="text-[10px] text-red-400">Locked screen active</div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-extrabold text-amber-400 text-xs">
                                  {t.daysRemaining} days left
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Until {t.trialEndDate ? new Date(t.trialEndDate).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Staff & Devices */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                              <span title="Staff Accounts" className="text-slate-300 flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-400" />
                                {(t as any).staffAccountsCount ?? t.userCount}
                              </span>
                              <span className="text-slate-700">|</span>
                              <span title="Active Devices" className="text-slate-300 flex items-center gap-1">
                                <Monitor className="w-3 h-3 text-purple-400" />
                                {(t as any).activeDevicesCount ?? 1}
                              </span>
                            </div>
                          </td>

                          {/* Total Paid */}
                          <td className="py-3 px-4 text-center font-bold text-emerald-400">
                            ₹{((t as any).totalPaidToDate || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Instant Pause/Suspend or Reactivate Toggle */}
                              {isSusp ? (
                                <button
                                  onClick={() => handleInstantReactivate(t)}
                                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                  title="Instant Reactivate Tenant"
                                >
                                  <PlayCircle className="w-3 h-3 text-emerald-400" />
                                  <span>Reactivate</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSuspendModalTenant(t);
                                    setSuspendReason('Payment renewal overdue / Contract expired');
                                  }}
                                  className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                  title="Instant Pause / Suspend Tenant"
                                >
                                  <PauseCircle className="w-3 h-3 text-rose-400" />
                                  <span>Suspend</span>
                                </button>
                              )}

                              <button
                                onClick={() => setExtendModalTenant(t)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg font-semibold text-[11px] transition"
                              >
                                + Extend
                              </button>

                              <button
                                onClick={() => {
                                  setStatusModalTenant(t);
                                  setNewStatus(t.status as any);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] transition"
                              >
                                Edit Plan
                              </button>

                              <button
                                onClick={() => setResetDemoModalTenant(t)}
                                className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg font-semibold text-[11px] transition"
                                title="Reset Demo Data"
                              >
                                Reset Demo
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SAAS MASTER FINANCIAL LEDGER & INFLOWS */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>SaaS Financial Ledger & Revenue Inflows</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Every client software inflow (lifetime one-time license fees, recurring subscriptions, and custom plan upgrades).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right pr-4 border-r border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Inflows</span>
                <div className="text-xl font-black text-emerald-400">
                  ₹{stats?.totalSaaSInflows ? stats.totalSaaSInflows.toLocaleString('en-IN') : '0'}
                </div>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Record Inflow</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Client Company</th>
                    <th className="py-3 px-4">Invoice Number</th>
                    <th className="py-3 px-4">Plan & Cycle</th>
                    <th className="py-3 px-4">Payment Mode & Ref</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {saasTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        No financial inflows recorded yet. Click <strong>"Record Inflow"</strong> to log lifetime fee or renewal payment.
                      </td>
                    </tr>
                  ) : (
                    saasTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {tx.company?.name || tx.company?.companyName || 'Client Company'}
                          </div>
                          <div className="text-[10px] font-mono text-indigo-400">
                            {tx.company?.code || 'TENANT'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">{tx.invoiceNumber}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-200 border border-slate-700">
                            {tx.planType}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5">{tx.billingCycle}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-semibold">{tx.paymentMode}</div>
                          {tx.paymentRef && (
                            <div className="text-[10px] font-mono text-slate-400">{tx.paymentRef}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sm text-emerald-400">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUPPORT INBOX & CHAT ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTicketFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                      ticketFilterStatus === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {filteredTickets.length} tickets
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredTickets.length === 0 ? (
                <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
                  No support tickets or escalated conversations found.
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      selectedTicket?.id === t.id
                        ? 'bg-indigo-950/40 border-indigo-600 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-amber-400">
                            {t.ticketNumber}
                          </span>
                          {t.escalatedFromChat && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                              AI Copilot Escalation
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-white text-xs mt-1 line-clamp-1">{t.subject}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800">
                      <span>{t.company?.name || t.company?.companyName || 'Client Workspace'}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Conversation Detail Drawer */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col h-[650px] overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs font-bold text-white">
                        {selectedTicket.company?.name || 'Client Company'}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-sm mt-0.5">{selectedTicket.subject}</h3>
                    <p className="text-[10px] text-slate-400">
                      Raised by: <strong className="text-slate-200">{selectedTicket.userName}</strong> (
                      {selectedTicket.userEmail || 'Client Staff'})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== 'RESOLVED' ? (
                      <button
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                      >
                        Mark Resolved ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'OPEN')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition"
                      >
                        Re-open Ticket
                      </button>
                    )}
                  </div>
                </div>

                {/* Conversation Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {/* Escalated Transcript Preview (if any) */}
                  {selectedTicket.chatTranscript && (
                    <div className="bg-purple-950/30 border border-purple-800/50 p-3 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between text-purple-300 font-bold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> AI Chatbot Session Transcript Escalated
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-3 rounded-lg text-slate-300 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {selectedTicket.chatTranscript}
                      </div>
                    </div>
                  )}

                  {/* Root Description */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Initial Issue Description:</span>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">{selectedTicket.description}</p>
                  </div>

                  {/* Messages Thread */}
                  {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Support Thread History:</span>
                      {selectedTicket.messages.map((m) => {
                        const isSuperAdmin = m.senderType === 'SUPER_ADMIN';
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${
                              isSuperAdmin ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                                isSuperAdmin
                                  ? 'bg-indigo-600 text-white rounded-br-xs'
                                  : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1 font-semibold">
                                <span>{m.senderName}</span>
                                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reply Form Footer */}
                <form
                  onSubmit={handleSendTicketReply}
                  className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type official support reply to client..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingReply || !replyMessage.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 h-[650px] flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
                <h3 className="font-bold text-white text-sm">Select a Support Ticket</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Click any ticket from the left panel to review client questions, AI chatbot transcripts, and send direct human responses.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: USAGE & ACTIVE DEVICES */}
      {/* ========================================================================= */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-400" />
              <span>Platform Device Telemetry & Staff Usage</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Active concurrent computer/mobile devices and total staff account quotas across all client companies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{t.companyName}</h3>
                    <span className="font-mono text-xs text-indigo-400">{t.code}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : t.status === 'SUSPENDED'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-400" /> Staff Logins
                    </span>
                    <div className="text-lg font-black text-white mt-1">
                      {(t as any).staffAccountsCount ?? t.userCount} Accounts
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Laptop className="w-3 h-3 text-purple-400" /> Active Devices
                    </span>
                    <div className="text-lg font-black text-purple-300 mt-1">
                      {(t as any).activeDevicesCount ?? 1} Online
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Database Footprint:</span>
                  <span className="font-mono text-slate-300 font-bold">{t.databaseSize || '1.8 MB'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD SAAS FINANCIAL INFLOW */}
      {/* ========================================================================= */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Record SaaS Revenue Inflow</h3>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Client Company *</label>
                <select
                  value={paymentForm.companyId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, companyId: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Client Workspace --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.companyName} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan Type *</label>
                  <select
                    value={paymentForm.planType}
                    onChange={(e) => setPaymentForm({ ...paymentForm, planType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="LIFETIME_PAID">Lifetime One-Time Fee</option>
                    <option value="YEARLY_SUBSCRIPTION">Yearly Subscription</option>
                    <option value="MONTHLY_SUBSCRIPTION">Monthly Subscription</option>
                    <option value="CUSTOM_UPGRADE">Plan Upgrade / Add-on</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Billing Cycle</label>
                  <select
                    value={paymentForm.billingCycle}
                    onChange={(e) => setPaymentForm({ ...paymentForm, billingCycle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="ONE_TIME">One-Time Perpetual</option>
                    <option value="YEARLY">Yearly Renewal</option>
                    <option value="MONTHLY">Monthly Renewal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount Inflow (₹) *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Mode *</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                    <option value="UPI">UPI Direct</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Invoice / Receipt #</label>
                  <input
                    type="text"
                    value={paymentForm.invoiceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Reference / UTR #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR12345678"
                    value={paymentForm.paymentRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / Ledger Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Received via HDFC corporate current account"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition"
                >
                  {submittingPayment ? 'Recording...' : 'Save Inflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PAUSE / SUSPEND TENANT */}
      {/* ========================================================================= */}
      {suspendModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-900/40 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-400 mb-3">
              <PauseCircle className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">Instant Suspend Client Workspace</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to pause and suspend workspace access for{' '}
              <strong className="text-rose-400">{suspendModalTenant.companyName}</strong> ({suspendModalTenant.code}).
            </p>

            <div className="mt-3 p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> What happens immediately:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-200">
                <li>All staff logins are locked behind a professional Billing & Account Suspension screen.</li>
                <li>Tenant database data remains 100% safe, untouched, and isolated.</li>
                <li>Access can be instantly restored at any time with one click on "Reactivate".</li>
              </ul>
            </div>

            <div className="mt-4">
              <label className="block text-slate-300 text-xs font-semibold mb-1">Reason for Suspension *</label>
              <input
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Pending renewal payment or license expiration"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setSuspendModalTenant(null)}
                className="px-3.5 py-1.5 border border-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspendSubmit}
                disabled={submittingSuspend}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                {submittingSuspend ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXTEND TRIAL */}
      {/* ========================================================================= */}
      {extendModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <h3 className="font-bold text-white text-base">Extend Trial Period</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add days to <strong className="text-white">{extendModalTenant.companyName}</strong>.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Days to add:</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      extendDays === d
                        ? 'border-indigo-500 bg-indigo-600/30 text-indigo-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    +{d} days
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setExtendModalTenant(null)}
                className="px-3 py-1.5 border border-slate-700 rounded-xl text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrialSubmit}
                disabled={submittingExtend}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                {submittingExtend ? 'Saving...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT STATUS & PLAN */}
      {/* ========================================================================= */}
      {statusModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <h3 className="font-bold text-white text-base">Change Workspace Status</h3>
            <p className="text-xs text-slate-400 mt-1">
              Update <strong className="text-white">{statusModalTenant.companyName}</strong> status.
            </p>

            <div className="mt-4 space-y-2">
              {(['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'] as const).map((st) => (
                <label
                  key={st}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition ${
                    newStatus === st
                      ? 'border-indigo-600 bg-indigo-950/40 text-indigo-400'
                      : 'border-slate-700 text-slate-300'
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
                className="px-3 py-1.5 border border-slate-700 rounded-xl text-xs text-slate-300"
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

      {/* ========================================================================= */}
      {/* MODAL 5: RESET DEMO DATA */}
      {/* ========================================================================= */}
      {resetDemoModalTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-indigo-400 mb-3">
              <RefreshCw className="w-6 h-6 animate-spin-reverse" />
              <h3 className="font-bold text-white text-base">Reset Demo Environment</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Reset demo environment for{' '}
              <strong className="text-indigo-400">{resetDemoModalTenant.companyName}</strong> ({resetDemoModalTenant.code})?
            </p>

            <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> What this action does:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Clears temporary test records created during contractor demonstrations</li>
                <li>Restores pristine demo villa construction project, BOQ, client & staff</li>
                <li>Resets trial lifecycle clock with 14 fresh days of active testing</li>
              </ul>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setResetDemoModalTenant(null)}
                className="px-3 py-1.5 border border-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemoSubmit}
                disabled={submittingResetDemo}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                {submittingResetDemo ? 'Resetting...' : 'Confirm Reset Demo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: REGISTER NEW TENANT COMPANY */}
      {/* ========================================================================= */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white text-base">Register New Construction Company</h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Contractor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Builders & Interiors Pvt Ltd"
                  value={registerForm.companyName}
                  onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Managing Director / Owner *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajeshwar Sharma"
                    value={registerForm.ownerName}
                    onChange={(e) => setRegisterForm({ ...registerForm, ownerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Owner Contact Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Owner Login Email (User ID) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. owner@apexbuild.com"
                  value={registerForm.ownerEmail}
                  onChange={(e) => setRegisterForm({ ...registerForm, ownerEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Initial Password *</label>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePassword}
                    className="text-[10px] text-indigo-400 font-bold hover:underline"
                  >
                    Generate Strong Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subscription Model</label>
                  <select
                    value={registerForm.subscriptionModel}
                    onChange={(e) => setRegisterForm({ ...registerForm, subscriptionModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="FREE_TRIAL">14-Day Free Trial</option>
                    <option value="LIFETIME_PAID">Lifetime Perpetual License</option>
                    <option value="YEARLY_SUBSCRIPTION">Yearly Subscription</option>
                    <option value="MONTHLY_SUBSCRIPTION">Monthly Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Trial Days</label>
                  <input
                    type="number"
                    value={registerForm.trialDays}
                    onChange={(e) => setRegisterForm({ ...registerForm, trialDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRegister}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition"
                >
                  {submittingRegister ? 'Creating Tenant...' : 'Create Tenant Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER SUCCESS DIALOG */}
      {registerSuccessData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/50 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <CheckCircle className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">Client Workspace Created Successfully!</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Share the following credentials with the client company's Managing Director:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Workspace Code:</span>
                <span className="text-indigo-400 font-bold">{registerSuccessData.companyCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Login URL:</span>
                <span className="text-white">http://localhost:3000/login</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="text-amber-400 font-bold">{registerSuccessData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Password:</span>
                <span className="text-emerald-400 font-bold">{registerSuccessData.password}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setRegisterSuccessData(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
