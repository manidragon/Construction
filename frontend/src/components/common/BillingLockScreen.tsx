import React, { useState } from 'react';
import {
  Lock,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';

interface BillingLockScreenProps {
  companyName: string;
  companyCode?: string;
  isSuspended: boolean;
  isTrialExpired: boolean;
  suspendedReason?: string;
  ownerEmail?: string;
  phone?: string;
  onRefresh?: () => void;
  onLogout: () => void;
}

export const BillingLockScreen: React.FC<BillingLockScreenProps> = ({
  companyName,
  companyCode,
  isSuspended,
  isTrialExpired,
  suspendedReason,
  ownerEmail,
  phone,
  onRefresh,
  onLogout,
}) => {
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.createSupportTicket({
        subject: isSuspended ? 'Account Reactivation & Billing Inquiry' : 'Trial Extension / Plan Upgrade Request',
        category: 'BILLING_SUBSCRIPTION',
        priority: 'HIGH',
        message: supportMessage.trim(),
        userEmail: ownerEmail,
        userPhone: phone,
      });

      if (res.success) {
        setTicketSubmitted(res.ticket?.ticketNumber || 'TKT-NEW');
        setSupportMessage('');
      } else {
        setSubmitError(res.message || 'Failed to submit ticket');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className={`p-6 text-white text-center relative ${isSuspended ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700' : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600'}`}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            {isSuspended ? <ShieldAlert className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
          </div>
          <span className="text-xs font-black tracking-widest uppercase px-3 py-1 bg-black/25 rounded-full inline-block mb-2">
            {isSuspended ? 'Account Suspended' : 'Trial Access Expired'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black">{companyName}</h2>
          {companyCode && (
            <p className="text-xs text-white/80 font-mono mt-0.5">Workspace Code: {companyCode}</p>
          )}
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mb-1">
              {isSuspended ? 'Administrative Pause in Effect' : '14-Day Free Evaluation Concluded'}
            </h4>
            <p>
              {isSuspended
                ? (suspendedReason || 'This company workspace has been paused by the platform administrator due to pending verification or billing settlement.')
                : 'Your evaluation period for the ApexBuild Construction & Interior ERP platform has concluded. All project data, BOQs, quotations, and accounting ledgers are securely preserved.'}
            </p>
          </div>

          {/* Quick Support Ticket Submission */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-xs">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span>Contact Platform Billing & Reactivation Desk</span>
            </div>

            {ticketSubmitted ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ticket #{ticketSubmitted} created! Our sales & support desk will contact you shortly.</span>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-2.5">
                <textarea
                  rows={3}
                  required
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder={isSuspended ? "Enter your inquiry or request for account reactivation..." : "I would like to activate a Lifetime or Subscription license for our team..."}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {submitError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{submitError}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !supportMessage.trim()}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending Request...' : 'Submit Reactivation / Upgrade Request'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Direct Contact info */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>billing@apexbuild.com</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>+91 98450 12345 (Sales Support)</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Status Again</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="ml-auto px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};