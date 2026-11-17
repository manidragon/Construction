import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  HardHat,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  PartyPopper,
  Rocket
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SelfServeSignup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    state: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creative Celebration Modal State
  const [trialSuccessData, setTrialSuccessData] = useState<{
    user: any;
    company: any;
    token: string;
    trialEndDate: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Password validation
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.signupTrial(form);
      if (res.success && res.token && res.user) {
        // Store auth tokens for seamless instant login
        localStorage.setItem('erp_token', res.token);
        localStorage.setItem('erp_user', JSON.stringify(res.user));

        const trialEndDate = res.user?.company?.trialEndDate
          ? new Date(res.user.company.trialEndDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

        // Trigger celebratory greeting popup
        setTrialSuccessData({
          user: res.user,
          company: res.user.company || { name: form.companyName, code: 'NEW-TRIAL' },
          token: res.token,
          trialEndDate,
        });
      } else {
        setError(res.message || 'Trial registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchWorkspace = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-amber-500 selection:text-slate-950">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>14-Day Free Trial • No Credit Card Required</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Start Your Free ERP Trial
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          Built specifically for residential interior fit-outs, turnkeys & civil construction firms.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Firm Name *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Luxury Interiors"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Rao"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email (Login ID) *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram@apexbuild.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone / WhatsApp Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="+91 98450 11223"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password & Confirm Password with Visibility Toggle Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-0.5"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'View password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      confirmPassword && form.password !== confirmPassword
                        ? 'border-rose-500/80 focus:ring-rose-500'
                        : confirmPassword && form.password === confirmPassword
                        ? 'border-emerald-500/80 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-0.5"
                    tabIndex={-1}
                    title={showConfirmPassword ? 'Hide password' : 'View password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="mt-1 flex items-center space-x-1 text-[11px]">
                    {form.password === confirmPassword ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* City and State: Clean & Empty without pre-selected suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter state"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Setting Up Your Workspace...</span>
                ) : (
                  <>
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Value Highlights */}
          <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Full BOQ & Quotations</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Flexible GST (Incl / Excl / No GST)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Real-time Project Net Profit</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>WhatsApp Dispatch Engine</span>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an active company account?{' '}
            <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300">
              Sign In here
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CREATIVE CELEBRATORY GREETING POPUP: "Digital Foundation Laid!"           */}
      {/* ========================================================================= */}
      {trialSuccessData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl shadow-amber-500/15 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Ambient Background Aura */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Emblem */}
            <div className="relative text-center mb-5">
              <div className="inline-flex relative mb-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30">
                  <HardHat className="w-9 h-9 stroke-[2.2]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-md">
                  <PartyPopper className="w-4 h-4" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>14-Day Full-Access Enterprise Pass Activated</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Digital Foundation Laid!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                Welcome aboard, <strong className="text-amber-400">{trialSuccessData.user.name}</strong>! Your 14-day free trial has started. Enjoy the experience of complete site, BOQ, and profit control.
              </p>
            </div>

            {/* Unique Concept: VIP Contractor Boarding Pass */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-3 mb-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Company Headquarters
                </span>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  Code: {trialSuccessData.company?.code || 'ASSIGNED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Company Firm</span>
                  <strong className="text-white truncate block mt-0.5">
                    {trialSuccessData.company?.name || form.companyName}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Login User Email</span>
                  <strong className="text-white font-mono truncate block mt-0.5">
                    {trialSuccessData.user.email}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Assigned Role</span>
                  <strong className="text-indigo-300 block mt-0.5">Managing Director (Owner)</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Trial Validity</span>
                  <strong className="text-emerald-400 block mt-0.5">
                    Until {trialSuccessData.trialEndDate}
                  </strong>
                </div>
              </div>
            </div>

            {/* Ready Capabilities Reel */}
            <div className="space-y-2 mb-6">
              <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                Ready For You In Your Command Center:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">BOQ Estimates (Flexible GST)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Net Profit Engine (Cost - Budget)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Site Telemetry & Labour Wages</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Instant WhatsApp Proposal Hub</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleLaunchWorkspace}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition flex items-center justify-center space-x-2 group"
              >
                <Rocket className="w-4 h-4 text-slate-950 group-hover:-translate-y-0.5 transition" />
                <span>Launch Your Workspace & Enjoy the Experience →</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = `Company: ${trialSuccessData.company?.name}\nCompany Code: ${trialSuccessData.company?.code}\nLogin Email: ${trialSuccessData.user.email}\nTrial Valid Until: ${trialSuccessData.trialEndDate}\nPortal: http://localhost:3000/login`;
                  navigator.clipboard.writeText(text);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 3000);
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center space-x-1.5"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Workspace details copied to clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Workspace Credentials to Clipboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfServeSignup;
