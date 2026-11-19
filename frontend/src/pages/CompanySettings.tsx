import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Check,
  Upload,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { WhatsAppLog } from '../types';

export const CompanySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BRANDING' | 'WHATSAPP' | 'LOGS'>('BRANDING');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState({
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    currencySymbol: '₹',
    logoUrl: '',
    businessAddress: '',
    invoiceFooterNotes: '',
    whatsappApiKey: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    useSharedGateway: true,
  });

  // Test WhatsApp State
  const [testPhone, setTestPhone] = useState('+919845012345');
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Logs State
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanySettings();
      if (res.success && res.settings) {
        const s = res.settings;
        setForm({
          companyName: s.companyName || s.name || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          pincode: s.pincode || '',
          gstin: s.gstin || '',
          currencySymbol: s.currencySymbol || '₹',
          logoUrl: s.logoUrl || '',
          businessAddress: s.businessAddress || s.address || '',
          invoiceFooterNotes: s.invoiceFooterNotes || '',
          whatsappApiKey: s.whatsappApiKey || '',
          whatsappPhoneNumberId: s.whatsappPhoneNumberId || '',
          whatsappBusinessAccountId: s.whatsappBusinessAccountId || '',
          useSharedGateway: s.useSharedGateway !== false,
        });
      }
    } catch (err) {
      console.error('Failed to load company settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getWhatsAppLogs();
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'LOGS') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg(null);
      const res = await api.updateCompanySettings(form);
      if (res.success) {
        setSuccessMsg(res.message || 'Company configuration saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        alert(res.message || 'Failed to update settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format: PNG, JPEG/JPG, WebP, SVG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPEG, WebP, or SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please select a smaller logo.');
      return;
    }

    // 1. Instant Data URL preview so Client Invoice Live Preview updates immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);

    // 2. Upload file to server assets storage
    try {
      setLogoUploading(true);
      const res = await api.uploadCompanyLogo(file);
      if (res.success && res.logoUrl) {
        setForm((prev) => ({ ...prev, logoUrl: res.logoUrl }));
        const saved = localStorage.getItem('erp_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.company) {
            parsed.company.logoUrl = res.logoUrl;
            parsed.company.logo = res.logoUrl;
            localStorage.setItem('erp_user', JSON.stringify(parsed));
          }
        }
      }
    } catch (err: any) {
      console.warn('Backend file upload fallback to Data URL preview:', err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      alert('Please enter a recipient phone number for the test message.');
      return;
    }
    try {
      setTestingWhatsApp(true);
      setTestResult(null);
      const res = await api.testWhatsAppConnection({ testPhoneNumber: testPhone });
      setTestResult(res);
      fetchLogs();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Test message failed to send.' });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span>Loading company configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Tenant Configuration
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">Company Branding & Integrations</h1>
          <p className="text-slate-500 text-xs">
            Manage your corporate identity, PDF invoice branding header/footer, and WhatsApp Cloud API gateway credentials.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('BRANDING')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === 'BRANDING'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Invoice Branding</span>
          </button>
          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === 'WHATSAPP'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Gateway</span>
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>WhatsApp Logs</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3 rounded-xl text-xs font-medium flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: INVOICE BRANDING & COMPANY PROFILE */}
      {activeTab === 'BRANDING' && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Company Information & PDF Header</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Legal Name *
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Company Brand Logo</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Supports PNG, JPEG, WebP (Max 5MB)</span>
              </label>

              {form.logoUrl ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                    <img
                      src={form.logoUrl}
                      alt="Company Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Logo Active & Embedded</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Automatically synced across all Quotations, Tax Invoices, and Payment Receipts.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-xs transition flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoUploading ? 'Uploading...' : 'Replace Logo'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold rounded-lg text-xs transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 rounded-2xl p-6 text-center cursor-pointer transition group"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop your company logo
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PNG, JPG, JPEG, or WebP up to 5MB (Transparent background recommended)
                  </p>
                  <button
                    type="button"
                    className="mt-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse Logo File</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleLogoFileChange}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Business Address (Appears on Invoices)
              </label>
              <textarea
                rows={2}
                value={form.businessAddress}
                onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Prestige Trade Tower, 14th Floor, High Grounds, Bengaluru"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="29AABCU9603R1ZM"
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={form.currencySymbol}
                  onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PDF Invoice Custom Footer Notes & Bank Details
              </label>
              <textarea
                rows={3}
                value={form.invoiceFooterNotes}
                onChange={(e) => setForm({ ...form, invoiceFooterNotes: e.target.value })}
                placeholder="Bank: HDFC Current A/c 50200012345678 | IFSC: HDFC0001234 | All milestone delays attract 2% weekly interest charge."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Company Branding'}</span>
              </button>
            </div>
          </div>

          {/* Live Invoice Preview Box */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Client Invoice Live Preview</span>
              </h3>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-950 text-[11px] space-y-3 font-mono shadow-inner">
                {/* Header with Logo */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo"
                        className="h-9 w-auto max-w-[120px] object-contain rounded mb-1"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-8 w-20 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded flex items-center justify-center font-bold text-[10px] mb-1">
                        LOGO
                      </div>
                    )}
                    <div className="font-bold text-slate-900 dark:text-white text-xs">{form.companyName || 'Your Company'}</div>
                    <div className="text-[10px] text-slate-500">{form.businessAddress || 'Business Address'}</div>
                    <div className="text-[10px] text-slate-500">GSTIN: {form.gstin || '29AABCU9603R1ZM'}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">TAX INVOICE</div>
                    <div className="text-[10px] text-slate-500">INV-2026-001</div>
                    <div className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Sample Line items */}
                <div className="space-y-1 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>50% Advance Booking & Mobilization</span>
                    <span>{form.currencySymbol} 5,00,000</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>GST (18%)</span>
                    <span>{form.currencySymbol} 90,000</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1 text-xs">
                    <span>Grand Total</span>
                    <span className="text-indigo-600">{form.currencySymbol} 5,90,000</span>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 text-[10px] text-slate-500 leading-tight">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Terms & Payment:</span>{' '}
                  {form.invoiceFooterNotes || 'Payment due within 14 days. 2% weekly interest on overdue amounts.'}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: WHATSAPP CLOUD API CONFIGURATION */}
      {activeTab === 'WHATSAPP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp Cloud API Gateway Configuration</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch automated BOQ quotations, milestone invoices, DPRs, and client notifications directly via WhatsApp.
              </p>
            </div>

            {/* Gateway Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setForm({ ...form, useSharedGateway: true })}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  form.useSharedGateway
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Nearlook Shared Cloud Gateway</span>
                  </span>
                  {form.useSharedGateway && <Check className="w-4 h-4 text-indigo-600 font-bold" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Zero setup required. Outbound messages are delivered through our high-throughput WhatsApp Cloud API infrastructure with per-tenant tracking.
                </p>
              </label>

              <label
                onClick={() => setForm({ ...form, useSharedGateway: false })}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  !form.useSharedGateway
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Custom WhatsApp Cloud API</span>
                  </span>
                  {!form.useSharedGateway && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Use your own Meta for Developers WhatsApp Business Account (WABA) with verified custom brand name and phone number.
                </p>
              </label>
            </div>

            {/* Custom WhatsApp API Fields */}
            {!form.useSharedGateway && (
              <div className="space-y-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Meta WhatsApp Business API Credentials:
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Permanent System User Access Token *
                  </label>
                  <input
                    type="password"
                    placeholder="EAAGm0PX4ZCBO..."
                    value={form.whatsappApiKey}
                    onChange={(e) => setForm({ ...form, whatsappApiKey: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 104293847291823"
                      value={form.whatsappPhoneNumberId}
                      onChange={(e) => setForm({ ...form, whatsappPhoneNumberId: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 982348719283741"
                      value={form.whatsappBusinessAccountId}
                      onChange={(e) => setForm({ ...form, whatsappBusinessAccountId: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save WhatsApp Configuration'}</span>
            </button>
          </div>

          {/* Test WhatsApp Message Sender */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Send className="w-4 h-4 text-indigo-500" />
                <span>Test Outbound WhatsApp</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Send a live test message to verify outbound connectivity using the selected gateway.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient WhatsApp Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98450 12345"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleTestWhatsApp}
                disabled={testingWhatsApp}
                className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs shadow transition flex items-center justify-center space-x-2"
              >
                <Send className={`w-3.5 h-3.5 ${testingWhatsApp ? 'animate-bounce' : ''}`} />
                <span>{testingWhatsApp ? 'Sending Message...' : 'Send Test WhatsApp Ping'}</span>
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                      : 'bg-red-50 dark:bg-red-950/60 border-red-200 text-red-800 dark:text-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                    <span>{testResult.success ? 'Message Dispatched!' : 'Dispatch Failed'}</span>
                  </div>
                  <div className="text-[11px] leading-tight">{testResult.message}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OUTBOUND WHATSAPP LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tenant Outbound WhatsApp Logs</h3>
              <p className="text-xs text-slate-500">Live record of all quotation shares, invoice notifications, and test pings.</p>
            </div>
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Message Type</th>
                  <th className="py-2.5 px-3">Gateway</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Message Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No WhatsApp logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{log.recipientPhone}</div>
                        {log.recipientName && <div className="text-[10px] text-slate-400">{log.recipientName}</div>}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          {log.messageType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-300">
                        {log.gatewayUsed === 'TENANT_GATEWAY' ? 'Custom Cloud API' : 'Nearlook Shared'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate">
                        {log.messageBody}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default CompanySettings;
