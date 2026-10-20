import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sparkles
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
}

const DEMO_ROLES: DemoRole[] = [
  {
    role: 'OWNER',
    name: 'Rajesh Sharma',
    email: 'owner@apexbuild.com',
    title: 'Managing Director / Owner',
    description: 'Complete ERP command: financials, P&L, approval overrides, executive KPIs',
    icon: ShieldCheck,
    color: 'from-amber-500 to-amber-600',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword('Password@123');

    try {
      await login(demoEmail, 'Password@123');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
            <HardHat className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              APEX<span className="text-amber-500">BUILD</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                ERP Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Civil & Infrastructure Engineering Operations</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>GST / RERA / Schedule-III Compliant</span>
        </div>
      </header>

      {/* Main Content: Split Hero & Login */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col lg:flex-row items-center gap-12">
        {/* Left: Traditional Login & Enterprise Value */}
        <div className="w-full lg:w-5/12 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-amber-400 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Spectrum Construction Cloud</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Site Operations, BOQ Costing & Real Double-Entry Accounts.
            </h1>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              From heavy machinery telemetry to running account (RA) client billing with retention and strict balanced general ledgers.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-1">Sign in to Console</h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter your corporate email address or select a 1-click persona on the right.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Corporate Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    placeholder="user@apexbuild.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-300 font-semibold">Password</label>
                  <span className="text-[11px] text-slate-500">Default: Password@123</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: 1-Click Interactive Demo Role Switcher Panel */}
        <div className="w-full lg:w-7/12">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Instant 1-Click Persona Login
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any role card below to login instantly with preloaded company data.
                </p>
              </div>
              <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                8 RBAC Roles
              </span>
            </div>

            {/* Grid of 8 Enterprise Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {DEMO_ROLES.map((r) => {
                const IconComponent = r.icon;
                return (
                  <div
                    key={r.role}
                    onClick={() => handleQuickDemoLogin(r.email)}
                    className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${r.color} text-slate-950`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs group-hover:text-amber-400 transition">
                              {r.name}
                            </div>
                            <div className="text-[10px] text-slate-400">{r.title}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${r.badge}`}>
                          {r.role.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-500 truncate">{r.email}</span>
                      <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
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
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        ApexBuild Infra ERP Platform • Double-Entry Accounting Engine • ISO 9001:2015 Civil Engineering Standard
      </footer>
    </div>
  );
};

export default Login;
