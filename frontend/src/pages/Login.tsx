import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HardHat,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Briefcase,
  Layers,
  FileSpreadsheet,
  Package,
  Users,
  Eye,
  CheckCircle2,
  Sparkles,
  Building2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DemoRole {
  role: string;
  name: string;
  email: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  badge: string;
  password?: string;
  targetRoute?: string;
}

const DEMO_ROLES: DemoRole[] = [
  {
    role: 'SUPER_ADMIN',
    name: 'Nearlook Super Admin',
    email: 'superadmin@nearlook.com',
    password: 'SuperAdmin@123',
    targetRoute: '/superadmin',
    title: 'SaaS Platform Super Administrator',
    description: 'System-wide command: create tenants, extend trials, status freeze & global analytics',
    icon: Sparkles,
    color: 'from-purple-500 to-indigo-600',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    role: 'OWNER',
    name: 'Rajesh Sharma',
    email: 'owner@apexbuild.com',
    targetRoute: '/dashboard',
    title: 'Managing Director / Owner (Apex Buildtech)',
    description: 'Active Enterprise Tenant: financials, P&L, approval overrides, executive KPIs',
    icon: ShieldCheck,
    color: 'from-amber-500 to-amber-600',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    role: 'TENANT_ADMIN',
    name: 'Kabir Singhania',
    email: 'admin@skyline.com',
    targetRoute: '/dashboard',
    title: 'Trial Owner (Skyline Urban - 10 Days Left)',
    description: 'Active 14-day trial: shows trial countdown banner, live trial status, full operations',
    icon: Clock,
    color: 'from-sky-500 to-blue-600',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  {
    role: 'PROJECT_MANAGER',
    name: 'Naveen Kumar',
    email: 'pm@skyline.com',
    targetRoute: '/projects',
    title: 'Constructor B Staff (Project Manager - Skyline)',
    description: 'Constructor B staff login: manages only Skyline Palm Meadows project & muster',
    icon: Briefcase,
    color: 'from-teal-500 to-teal-600',
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  },
  {
    role: 'EXPIRED_TRIAL',
    name: 'Ananya Roy',
    email: 'owner@starlight.com',
    targetRoute: '/dashboard',
    title: 'Expired Trial Owner (Starlight Interiors)',
    description: 'Expired trial testing: demonstrates middleware lockout, upgrade banner & modal',
    icon: ShieldAlert,
    color: 'from-rose-500 to-slate-700',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  {
    role: 'PROJECT_MANAGER',
    name: 'Vikram Malhotra',
    email: 'pm@apexbuild.com',
    title: 'Senior Project Manager',
    description: 'Multi-site scheduling, BOQ budget management, tasks, variation change orders',
    icon: Briefcase,
    color: 'from-blue-500 to-blue-600',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    role: 'SITE_ENGINEER',
    name: 'Amit Patel',
    email: 'siteeng@apexbuild.com',
    title: 'Site In-Charge Engineer',
    description: 'Daily Site Reports (DPR), site attendance muster, machinery hours logbook',
    icon: HardHat,
    color: 'from-orange-500 to-orange-600',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  {
    role: 'ACCOUNTS_MANAGER',
    name: 'Priya Iyer',
    email: 'accounts@apexbuild.com',
    title: 'Chief Financial Controller',
    description: 'Double-entry journals, RA bills (TDS/Retention/GST), petty cash, balance sheet',
    icon: FileSpreadsheet,
    color: 'from-emerald-500 to-emerald-600',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    role: 'PURCHASE_MANAGER',
    name: 'Deepak Verma',
    email: 'purchase@apexbuild.com',
    title: 'Procurement Specialist',
    description: 'Vendor masters, item rate quotations, RFQs, purchase orders with GST calculations',
    icon: Layers,
    color: 'from-indigo-500 to-indigo-600',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  {
    role: 'STOREKEEPER',
    name: 'Sunil Jadhav',
    email: 'store@apexbuild.com',
    title: 'Site Materials & Storekeeper',
    description: 'Goods Receipt Notes (GRN), warehouse stock bin cards, weighted average ledger',
    icon: Package,
    color: 'from-cyan-500 to-cyan-600',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  {
    role: 'HR_MANAGER',
    name: 'Kavita Sundaram',
    email: 'hr@apexbuild.com',
    title: 'Workforce & HR Officer',
    description: 'Daily labour muster roll, overtime, subcontractor gang advances, pay sheets',
    icon: Users,
    color: 'from-pink-500 to-pink-600',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  {
    role: 'AUDITOR',
    name: 'Suresh Menon',
    email: 'auditor@apexbuild.com',
    title: 'Statutory Financial Auditor',
    description: 'Strict read-only forensics: general ledger verification, debit=credit balance audit',
    icon: Eye,
    color: 'from-purple-500 to-purple-600',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
];

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('owner@apexbuild.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      if (email === 'superadmin@nearlook.com') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoRole: DemoRole) => {
    setError(null);
    setLoading(true);
    const pass = demoRole.password || 'Password@123';
    setEmail(demoRole.email);
    setPassword(pass);

    try {
      await login(demoRole.email, pass);
      navigate(demoRole.targetRoute || '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 overflow-y-auto">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
            <HardHat className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              APEX<span className="text-amber-500">BUILD</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest hidden sm:inline-block">
                ERP Enterprise
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Civil & Infrastructure Engineering Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/signup"
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start 14-Day Free Trial</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>GST / RERA Compliant</span>
          </div>
        </div>
      </header>

      {/* Main Content: Split Hero & Login */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-10">
        {/* Left: Traditional Login & Enterprise Value */}
        <div className="w-full lg:w-5/12 space-y-4 sm:space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-amber-400 mb-2">
              <Sparkles className="w-3 h-3" />
              <span>Full-Spectrum Multi-Tenant Construction Cloud</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Site Operations, BOQ Costing & Balanced Accounts.
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
              From heavy machinery telemetry to running account (RA) client billing with retention and strict balanced general ledgers.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-base sm:text-lg font-bold text-white mb-0.5">Sign in to Console</h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-4">
              Enter your corporate credentials or click any demo role on the right.
            </p>

            {error && (
              <div className="p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition text-xs"
                    placeholder="user@apexbuild.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-300 font-semibold">Password</label>
                  <span className="text-[10px] text-slate-500">Default: Password@123</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-1"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">
                  New Construction or Interior Firm?
                </p>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Start 14-Day Free Trial</span>
                  <span className="group-hover:translate-x-1 transition">&rarr;</span>
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Right: 1-Click Interactive Demo Role Switcher Panel */}
        <div className="w-full lg:w-7/12">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-2.5 border-b border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Instant 1-Click Persona Login
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click any persona below to quickly test Super Admin, Active Trials, or Site Roles.
                </p>
              </div>
              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                11 Roles Available
              </span>
            </div>

            {/* Grid of Enterprise Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {DEMO_ROLES.map((r) => {
                const IconComponent = r.icon;
                return (
                  <div
                    key={r.role + r.email}
                    onClick={() => handleQuickDemoLogin(r)}
                    className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${r.color} text-slate-950 shrink-0`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs group-hover:text-amber-400 transition truncate">
                              {r.name}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">{r.title}</div>
                          </div>
                        </div>
                        <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${r.badge}`}>
                          {r.role.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9.5px]">
                      <span className="font-mono text-slate-500 truncate">{r.email}</span>
                      <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5 shrink-0">
                        Login &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 text-center text-[11px] text-slate-500 border-t border-slate-900 flex flex-wrap items-center justify-center gap-2 mb-2">
        <span>ApexBuild Infra ERP Platform • Double-Entry Accounting Engine • Construction & Interior Operations</span>
        <span className="hidden sm:inline text-slate-700">|</span>
        <Link to="/platform-admin/login" className="text-slate-400 hover:text-indigo-400 font-semibold transition">
          SaaS Platform Operator Portal ↗
        </Link>
      </footer>
    </div>
  );
};

export default Login;
