import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Worker } from '../types';
import {
  X,
  Share2,
  Copy,
  Check,
  Printer,
  Phone,
  Building2,
  CreditCard,
  FileText,
  HardHat,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface LabourWageShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any | null;
  worker?: Worker | any | null;
  project?: any | null;
  allPayments?: any[];
  totalWagesEarned?: number;
}

export const LabourWageShareModal: React.FC<LabourWageShareModalProps> = ({
  isOpen,
  onClose,
  payment,
  worker,
  project,
  allPayments = [],
  totalWagesEarned,
}) => {
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const resolvedWorker = worker || payment?.worker;
  const resolvedProject = project || payment?.project;

  useEffect(() => {
    if (resolvedWorker?.phone) {
      setCustomPhone(String(resolvedWorker.phone).replace(/\s+/g, ''));
    } else {
      setCustomPhone('');
    }
  }, [resolvedWorker]);

  if (!isOpen || !payment) return null;

  const cleanPhone = (phoneStr: string) => {
    if (!phoneStr) return '';
    let digits = phoneStr.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      return `91${digits}`;
    }
    return digits;
  };

  const workerName = resolvedWorker?.name || 'Site Worker';
  const workerCode = resolvedWorker?.workerCode || '';
  const trade = resolvedWorker?.trade || 'General Civil';
  const projectName = resolvedProject?.name || 'Construction Site Project';
  const projectCode = resolvedProject?.code || '';
  const wagePeriod = payment.wagePeriod || 'Current Week / Shift';

  // Total wages earned in this period (or fallback to sum of payments)
  const targetWorkerId = payment.workerId || resolvedWorker?.id;

  // Filter related wage payments for this worker
  const paymentsMap = new Map<string, any>();
  const relatedPayments = allPayments.filter((p) => {
    const pWorkerId = p.workerId || p.worker?.id;
    if (pWorkerId && targetWorkerId && pWorkerId === targetWorkerId) {
      return true;
    }
    return false;
  });

  for (const p of relatedPayments) {
    paymentsMap.set(p.id || p.referenceNo || Math.random().toString(), p);
  }
  paymentsMap.set(payment.id || payment.referenceNo || 'current', payment);

  const chronologicalPayments = Array.from(paymentsMap.values()).sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

  const totalDisbursedToDate = chronologicalPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const calculatedTotalEarned =
    totalWagesEarned !== undefined && totalWagesEarned > 0
      ? totalWagesEarned
      : Math.max(totalDisbursedToDate, Number(payment.amount));

  const remainingBalance = Math.max(0, calculatedTotalEarned - totalDisbursedToDate);

  // Generate WhatsApp Message
  const generateWhatsAppMessage = () => {
    const formattedDate = formatDate(payment.paymentDate);
    const amountStr = formatCurrency(payment.amount);
    const methodStr = String(payment.paymentMethod || 'CASH').replace(/_/g, ' ');

    let transactionHistory = '';
    chronologicalPayments.forEach((pmt, idx) => {
      const isCurrent = pmt.id === payment.id || pmt.referenceNo === payment.referenceNo;
      const num = idx + 1;
      const numIcon =
        num === 1 ? '1️⃣' : num === 2 ? '2️⃣' : num === 3 ? '3️⃣' : num === 4 ? '4️⃣' : `[${num}]`;
      const dateFormatted = formatDate(pmt.paymentDate);
      const amtFormatted = formatCurrency(pmt.amount);
      const refText = pmt.referenceNo ? ` [Ref: ${pmt.referenceNo}]` : '';
      const noteText = pmt.narration || pmt.notes
        ? ` (${pmt.narration || pmt.notes})`
        : num === 1
        ? ' (Advance Wage Payout)'
        : '';
      const currentTag = isCurrent ? ' ⭐ *[Current Payout]*' : '';

      transactionHistory += `${numIcon} *Payout ${num} (${dateFormatted}):* ${amtFormatted}${refText}${noteText}${currentTag}\n`;
    });

    return (
      `👷 *LABOUR WAGE PAYOUT & VOUCHER UPDATE*\n` +
      `-------------------------------------------\n` +
      `*Voucher / Ref:* ${payment.referenceNo || 'WAGE-VOUCHER'}\n` +
      `*Payment Date:* ${formattedDate}\n` +
      `*Wage Period:* ${wagePeriod}\n\n` +
      `*Worker Name:* ${workerName} ${workerCode ? `[${workerCode}]` : ''}\n` +
      `*Trade / Role:* ${trade}\n` +
      `*Site Project:* ${projectName} ${projectCode ? `[${projectCode}]` : ''}\n\n` +
      `💰 *LATEST WAGE AMOUNT PAID:* ${amountStr}\n` +
      `• *Payment Method:* ${methodStr}\n` +
      (payment.referenceNo ? `• *Reference / Voucher #:* ${payment.referenceNo}\n` : '') +
      (payment.narration ? `• *Notes / Description:* ${payment.narration}\n` : '') +
      `\n` +
      `📊 *PERIOD WAGE STATEMENT:*\n` +
      `-------------------------------------------\n` +
      `• *Total Earned Wages in Period:* ${formatCurrency(calculatedTotalEarned)}\n\n` +
      `*Wage Payout Installments (${chronologicalPayments.length}):*\n` +
      transactionHistory +
      `-------------------------------------------\n` +
      `✅ *Total Wages Paid to Date:* ${formatCurrency(totalDisbursedToDate)}\n` +
      `⏳ *Remaining Wage Balance Due:* ${formatCurrency(remainingBalance)}\n` +
      `-------------------------------------------\n\n` +
      `Official wage disbursement recorded on ApexBuild ERP Site System.`
    );
  };

  const handleShareWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const targetPhone = cleanPhone(customPhone);
    const url = targetPhone
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Fixed Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {payment.referenceNo || 'WAGE-VOUCHER'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                  Labour Wage Voucher
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900 mt-0.5">
                Share Worker Wage Payout & Statement
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
          {/* Summary Banner */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Site Worker / Tradesman
                </span>
                <h4 className="font-bold text-base text-slate-900">{workerName}</h4>
                <p className="text-xs text-slate-500">
                  {trade} {workerCode ? `• [${workerCode}]` : ''} • Period: <strong>{wagePeriod}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Site: <strong className="text-slate-700">{projectName}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Current Wage Disbursed
                </span>
                <div className="text-2xl font-black text-amber-600">
                  {formatCurrency(payment.amount)}
                </div>
                <span className="text-[11px] font-medium text-slate-600 block">
                  {formatDate(payment.paymentDate)} • {payment.paymentMethod?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Wages Earned</span>
                <strong className="text-slate-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(calculatedTotalEarned)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 block uppercase font-medium">Total Wages Paid</span>
                <strong className="text-amber-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(totalDisbursedToDate)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Wage Balance</span>
                <strong className="text-slate-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(remainingBalance)}
                </strong>
              </div>
            </div>
          </div>

          {/* Chronological Transaction Breakdown Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Wage Installments Timeline ({chronologicalPayments.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Cumulative Payout History
              </span>
            </div>

            <div className="space-y-1.5">
              {chronologicalPayments.map((pmt, idx) => {
                const isCurrent = pmt.id === payment.id || pmt.referenceNo === payment.referenceNo;
                return (
                  <div
                    key={pmt.id || idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-amber-50/90 border-amber-300 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-800">
                            Wage Payout {idx + 1} ({formatDate(pmt.paymentDate)})
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {pmt.paymentMethod?.replace(/_/g, ' ')} {pmt.referenceNo ? `• Ref: ${pmt.referenceNo}` : ''} {pmt.narration || pmt.notes ? `• ${pmt.narration || pmt.notes}` : idx === 0 ? '• (Advance / Token Payout)' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      {formatCurrency(pmt.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Destination Phone Input */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-bold flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>Worker / Contractor WhatsApp Number</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="tel"
                placeholder="e.g. 9845011223 or +91 98450 11223"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Numbers are automatically prefixed with standard WhatsApp codes. You can customize the recipient phone above.
            </p>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center space-x-1">
                <span>💬 WhatsApp Message Preview</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center space-x-1 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-slate-800">
              {generateWhatsAppMessage()}
            </pre>
          </div>

          {/* Hidden Printable / PDF Labour Wage Receipt (Rendered during Print) */}
          <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[9999]">
            <div className="border-2 border-slate-800 p-8 rounded-xl space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">APEXBUILD INFRASTRUCTURE</h1>
                  <p className="text-xs text-slate-600">Site Workforce & Subcontractor Wage Settlement</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-amber-700 uppercase">LABOUR WAGE PAYMENT VOUCHER</h2>
                  <p className="font-mono text-xs font-bold text-slate-700">Ref #: {payment.referenceNo || 'WAGE-VOUCHER'}</p>
                  <p className="text-xs text-slate-500">Date: {formatDate(payment.paymentDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Worker Details:</span>
                  <strong className="text-sm text-slate-900 block">{workerName}</strong>
                  <p className="text-slate-600">Trade: {trade}</p>
                  {workerCode && <p className="text-slate-600">Worker Code: {workerCode}</p>}
                  {resolvedWorker?.phone && <p className="text-slate-600">Contact: {resolvedWorker.phone}</p>}
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Project & Wage Period:</span>
                  <p className="text-slate-700">Project: <strong>{projectName} {projectCode ? `[${projectCode}]` : ''}</strong></p>
                  <p className="text-slate-700">Wage Period: <strong>{wagePeriod}</strong></p>
                  <p className="text-slate-700">Payment Mode: <strong>{payment.paymentMethod?.replace(/_/g, ' ')}</strong></p>
                  <p className="text-slate-700">Current Payout: <strong>{formatCurrency(payment.amount)}</strong></p>
                </div>
              </div>

              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-left">
                    <th className="p-2 border-r">#</th>
                    <th className="p-2 border-r">Payout Date</th>
                    <th className="p-2 border-r">Disbursement Notes / Ref</th>
                    <th className="p-2 text-right">Amount Disbursed (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {chronologicalPayments.map((p, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="p-2 border-r font-mono">{i + 1}</td>
                      <td className="p-2 border-r">{formatDate(p.paymentDate)}</td>
                      <td className="p-2 border-r">{p.narration || p.notes || `Payout ${i + 1}`}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-800">
                    <td colSpan={3} className="p-2 border-r text-right uppercase">Total Wages Paid in Period:</td>
                    <td className="p-2 text-right text-amber-800">{formatCurrency(totalDisbursedToDate)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-t border-slate-300">
                    <td colSpan={3} className="p-2 border-r text-right uppercase">Remaining Wage Balance:</td>
                    <td className="p-2 text-right text-slate-800">{formatCurrency(remainingBalance)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-medium">Timekeeper / Supervisor</div>
                <div className="border-t border-slate-400 pt-2 font-medium">Site Engineer / PM</div>
                <div className="border-t border-slate-400 pt-2 font-medium">Worker Signature / LTI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-white transition"
          >
            Close
          </button>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LabourWageShareModal;
