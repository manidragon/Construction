import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Building2,
  HardHat,
  Eye,
  EyeOff,
  AlertCircle,
  Key,
} from 'lucide-react';
import api from '../services/api';

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuthSession } = useAuth();

  const [email, setEmail] = useState('superadmin@nearlook.com');
  const [password, setPassword] = useState('SuperAdmin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.superAdminLogin({ email, password });
      if (res.success && res.token) {
        localStorage.setItem('erp_token', res.token);
        localStorage.setItem('erp_user', JSON.stringify(res.user));
        // Also update auth context
        if (setAuthSession) {
          try {
            await setAuthSession(email, password);
          } catch {
            // Context fallback
          }
        }
        navigate('/platform-admin');
      } else {
        setErrorMessage(res.message || 'Authentication failed. Please verify platform credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to platform authorization engine.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (adminEmail: string, adminPass: string) => {
    setEmail(adminEmail);
    setPassword(adminPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-indigo-950/50 border border-indigo-400/30">
            <ShieldCheck className="w-9 h-9" />
          </div>
        </div>

        <div className="text-center mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 tracking-wider uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Vendor SaaS Control Center
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            SaaS Platform Operator Login
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Restricted portal for Nearlook & ApexBuild platform team to track client trial lifecycles and retrieve onboarding credentials.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Platform Operator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@nearlook.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Master Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Access Platform Control Console</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Platform Operator Credentials:</span>
              <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">One-Click</span>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@nearlook.com', 'SuperAdmin@2026')}
                className="w-full text-left p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/50 text-xs transition flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-indigo-300 block">superadmin@nearlook.com</span>
                  <span className="text-[10px] text-slate-500">Master SaaS Administrator</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  SuperAdmin@2026
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('admin@apexbuild.com', 'SuperAdmin@2026')}
                className="w-full text-left p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/50 text-xs transition flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-indigo-300 block">admin@apexbuild.com</span>
                  <span className="text-[10px] text-slate-500">Secondary Platform Operator</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  SuperAdmin@2026
                </span>
              </button>
            </div>
          </div>

          {/* Separation Notice & Client Link */}
          <div className="border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[11px] text-slate-400 mb-2">
              Looking for the Construction & Interior Client ERP?
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Go to Client Construction ERP Portal ↗</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
