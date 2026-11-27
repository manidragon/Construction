import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HardHat,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div
      id="login-scroll-container"
      className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 overflow-y-auto overscroll-contain"
    >
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

      {/* Main Content: Centered Login */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        <div className="w-full space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-amber-400 mb-2">
              <Sparkles className="w-3 h-3" />
              <span>Full-Spectrum Multi-Tenant Construction Cloud</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Site Operations, BOQ Costing &amp; Balanced Accounts.
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
              From heavy machinery telemetry to running account (RA) client billing with retention and strict balanced general ledgers.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-base sm:text-lg font-bold text-white mb-0.5">Sign in to Console</h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-4">
              Enter your corporate email and password to access your workspace.
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
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-10 py-2 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono text-xs"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer focus:outline-none"
                    title={showPassword ? 'Hide password' : 'View password'}
                    aria-label={showPassword ? 'Hide password' : 'View password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                    )}
                  </button>
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
