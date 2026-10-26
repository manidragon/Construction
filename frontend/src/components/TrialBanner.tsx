import React, { useState } from 'react';
import { AlertCircle, Clock, Sparkles, X, MessageSquare, ExternalLink } from 'lucide-react';
import { Company } from '../types';

interface TrialBannerProps {
  company?: Company;
  onUpgradeClick?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ company, onUpgradeClick }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!company || dismissed) return null;

  const isTrial = company.status === 'TRIAL';
  const isExpired = company.status === 'EXPIRED' || (isTrial && company.daysRemaining === 0);

  if (!isTrial && !isExpired) return null;

  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between z-40 text-sm">
        <div className="flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-200" />
          <span>
            <strong>Your 14-Day Free Trial Has Expired.</strong> Operational write access is restricted. Contact our team to activate your plan.
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onUpgradeClick}
            className="bg-white text-red-700 hover:bg-red-50 font-semibold px-3 py-1 rounded text-xs transition shadow-sm flex items-center space-x-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Now</span>
          </button>
          <a
            href="https://wa.me/918099998888?text=Hi%20Nearlook%20Team,%20my%20trial%20has%20expired%20and%20I%20would%20like%20to%20upgrade%20my%20Construction%20ERP%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 bg-red-700 hover:bg-red-800 text-white px-2.5 py-1 rounded text-xs transition"
          >
            <MessageSquare className="w-3 h-3 text-emerald-300" />
            <span>WhatsApp Us</span>
          </a>
        </div>
      </div>
    );
  }

  // Active Trial Banner
  return (
    <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 text-white px-4 py-2 shadow-sm flex items-center justify-between z-40 text-xs sm:text-sm">
      <div className="flex items-center space-x-2">
        <div className="bg-white/20 p-1 rounded-full">
          <Clock className="w-3.5 h-3.5 text-amber-300" />
        </div>
        <span>
          <strong className="text-amber-200">14-Day Free Trial Active:</strong>{' '}
          {company.daysRemaining !== undefined ? (
            <span className="font-semibold text-white underline decoration-amber-400">
              {company.daysRemaining} {company.daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
          ) : (
            '14 days remaining'
          )}
          .{' '}
          <span className="hidden md:inline text-indigo-100">
            Enjoy full access to lead tracking, BOQ quotation engine & automated invoicing.
          </span>
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onUpgradeClick}
          className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold px-3 py-1 rounded text-xs transition flex items-center space-x-1 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-900" />
          <span>Upgrade Account</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white p-1 rounded transition"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
