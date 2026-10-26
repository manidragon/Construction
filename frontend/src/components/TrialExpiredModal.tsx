import React from 'react';
import { AlertTriangle, CheckCircle, MessageSquare, PhoneCall, Sparkles, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { Company } from '../types';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: Company;
  onLogout?: () => void;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({
  isOpen,
  onClose,
  company,
  onLogout,
}) => {
  if (!isOpen) return null;

  const plans = [
    {
      name: 'Starter Plan',
      tagline: 'For boutique interior designers & renovation contractors',
      price: '₹2,499 / mo',
      features: ['Up to 10 Active Projects', 'Lead Pipeline & Kanban', 'BOQ Quotations Generator', 'Standard PDF Invoices', 'Nearlook Shared WhatsApp'],
      recommended: false,
    },
    {
      name: 'Pro Enterprise',
      tagline: 'For fast-growing construction & turnkey fit-out firms',
      price: '₹5,999 / mo',
      features: ['Unlimited Projects & Sites', 'Custom WhatsApp Cloud API', 'Milestone Invoicing & GST Gates', 'Daily Site Reports & Muster Roll', 'Advance Finance Kickoff Gate'],
      recommended: true,
    },
    {
      name: 'Turnkey SaaS Enterprise',
      tagline: 'For multi-branch contractors and large infrastructure developers',
      price: 'Custom Pricing',
      features: ['Dedicated Database & Cloud Server', 'Custom ERP Subdomain & Domain', 'ERP API Access & Webhooks', 'Priority 24/7 Phone & WhatsApp Support', 'On-site Staff Training'],
      recommended: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 px-6 py-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-7 h-7 text-amber-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Your 14-Day Free Trial Has Expired</h2>
                <p className="text-amber-100 text-sm mt-0.5">
                  {company?.name || 'Your Company Workspace'} • Trial ended on{' '}
                  {company?.trialEndDate ? new Date(company.trialEndDate).toLocaleDateString() : 'recently'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Your data is 100% safe & intact.</strong> All your
              recorded leads, BOQ specifications, project records, and milestone invoices are preserved in your secure
              database. Upgrade your account now to immediately restore full operational editing and team access.
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-4 border transition-all relative flex flex-col justify-between ${
                  plan.recommended
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850'
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{plan.tagline}</p>
                  <div className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">{plan.price}</div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center space-x-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
              <span>Need help? Call +91 80 9999 8888 or email billing@nearlook.com</span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition"
                >
                  Log Out
                </button>
              )}
              <a
                href={`https://wa.me/918099998888?text=Hello%20Nearlook%20Sales,%20my%20company%20"${encodeURIComponent(
                  company?.name || 'Our Company'
                )}"%20trial%20has%20expired.%20Please%20help%20me%20upgrade%20our%20account.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Upgrade via WhatsApp</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
