import React, { useState, useRef } from 'react';
import {
  Building2,
  Image as ImageIcon,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Upload,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CompanyOnboardingWizardProps {
  initialCompany?: any;
  onCompleted: (updatedCompany: any) => void;
}

export const CompanyOnboardingWizard: React.FC<CompanyOnboardingWizardProps> = ({
  initialCompany,
  onCompleted,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    companyName: initialCompany?.companyName || initialCompany?.name || user?.company?.name || '',
    phone: initialCompany?.phone || user?.company?.phone || '+91 98000 00000',
    email: initialCompany?.email || initialCompany?.ownerEmail || user?.company?.email || user?.email || '',
    logoUrl: initialCompany?.logoUrl || user?.company?.logoUrl || '',
    address: initialCompany?.address || initialCompany?.businessAddress || user?.company?.address || '',
    city: initialCompany?.city || user?.company?.city || 'Bengaluru',
    state: initialCompany?.state || user?.company?.state || 'Karnataka',
    pincode: initialCompany?.pincode || user?.company?.pincode || '560001',
    gstin: initialCompany?.gstin || user?.company?.gstin || '',
    invoiceFooterNotes: initialCompany?.invoiceFooterNotes || 'Subject to local jurisdiction. Payment terms 15 days.',
  });

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPEG, WebP, or SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setError(null);

    // 1. Instant Data URL for zero-delay preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);

    // 2. Upload file to server assets storage
    try {
      setLogoUploading(true);
      const res = await api.uploadCompanyLogo(file);
      if (res.success && res.logoUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: res.logoUrl }));
      }
    } catch (err: any) {
      console.warn('Backend file upload fallback to Data URL:', err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNext = () => {
    if (step === 1 && !formData.companyName.trim()) {
      setError('Official Company Name is required.');
      return;
    }
    setError(null);
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setError('Company Name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.completeCompanyOnboarding({
        ...formData,
        businessAddress: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
      });

      if (res.success && res.company) {
        // Update local session
        const currentSaved = localStorage.getItem('erp_user');
        if (currentSaved) {
          const parsed = JSON.parse(currentSaved);
          parsed.company = { ...parsed.company, ...res.company, onboardingCompleted: true };
          localStorage.setItem('erp_user', JSON.stringify(parsed));
        }
        onCompleted(res.company);
      } else {
        setError(res.message || 'Failed to complete company setup');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 px-6 py-5 shrink-0 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/80 bg-amber-400 px-2 py-0.5 rounded-full inline-block">
                Mandatory Initial Setup
              </span>
              <h2 className="text-lg font-black text-slate-950 leading-tight">Company Profile & Document Branding</h2>
            </div>
          </div>
          <span className="text-xs font-black bg-slate-950/10 px-2.5 py-1 rounded-xl">
            Step {step} of 4
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold">
          <div className={`py-2 border-r border-slate-200 dark:border-slate-700 ${step === 1 ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300' : step > 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
            1. Identity
          </div>
          <div className={`py-2 border-r border-slate-200 dark:border-slate-700 ${step === 2 ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300' : step > 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
            2. Brand Logo
          </div>
          <div className={`py-2 border-r border-slate-200 dark:border-slate-700 ${step === 3 ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300' : step > 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
            3. Address
          </div>
          <div className={`py-2 ${step === 4 ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300' : 'text-slate-400'}`}>
            4. Tax & Notes
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleFinish} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            {/* STEP 1: Company Legal Identity */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                  Enter your official registered contracting or interior business name. This will appear as the legal entity on all Client Quotations, Invoices, and Payment Receipts.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Nearlook Builders & Infrastructure Pvt. Ltd."
                    className="w-full text-sm font-semibold p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Contact Phone *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98450 12345"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Support / Billing Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="accounts@nearlook.com"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Company Logo File Upload */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                  Upload your official company logo directly from your computer. This will be automatically embedded onto headers of all Client Quotation PDFs, Tax Invoices, Money Receipts, and Site Reports.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>Company Brand Logo</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Supports PNG, JPEG, WebP (Max 5MB)</span>
                  </label>

                  {formData.logoUrl ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center space-y-3">
                      <img
                        src={formData.logoUrl}
                        alt="Company Logo Preview"
                        className="max-h-24 object-contain mx-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white shadow-sm"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Logo Uploaded</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading}
                          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{logoUploading ? 'Uploading...' : 'Change Logo'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 rounded-2xl p-6 text-center cursor-pointer transition group"
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to browse or drag and drop your company logo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PNG, JPG, JPEG, or WebP up to 5MB (Transparent PNG recommended)
                      </p>
                      <button
                        type="button"
                        className="mt-3 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-sm"
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
              </div>
            )}

            {/* STEP 3: Registered Office Address */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                  Enter your physical office address to show on official quotations, client communication letters, and vendor purchase orders.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Street Address / Office Premises *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Plot 45, Nearlook Tech Park, Whitefield Main Road"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Bengaluru"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Karnataka"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="560066"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Tax & Legal Credentials */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                  Optional GSTIN details. If entered, it will be automatically printed on Tax Invoices and Quotations with standard 18% GST / TDS 194C compliance breakdowns.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Quotation & Invoice Footer Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.invoiceFooterNotes}
                    onChange={(e) => setFormData({ ...formData, invoiceFooterNotes: e.target.value })}
                    placeholder="e.g. Subject to Bengaluru jurisdiction. Payment due within 15 days of RA certification."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 px-6 py-4 shrink-0 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Activating Profile...' : 'Complete Setup & Enter Workspace'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};