import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StaffSalaryPayment, OfficeStaff } from '../types';
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
  UserCheck,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface StaffSalaryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: StaffSalaryPayment | null;
  staff?: OfficeStaff | null;
  allPayments?: StaffSalaryPayment[];
}

export const StaffSalaryShareModal: React.FC<StaffSalaryShareModalProps> = ({
  isOpen,
  onClose,
  payment,
  staff,
  allPayments = [],
}) => {
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const resolvedStaff = staff || payment?.staff;

  useEffect(() => {
    if (resolvedStaff?.phone) {
      setCustomPhone(String(resolvedStaff.phone).replace(/\s+/g, ''));
    } else {
      setCustomPhone('');
    }
  }, [resolvedStaff]);

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

  const staffName = resolvedStaff?.name || 'Staff Member';
  const staffDesignation = resolvedStaff?.designation || 'Site / Office Staff';
  const employeeId = (resolvedStaff as any)?.staffCode || (resolvedStaff as any)?.employeeId || '';
  const monthPeriod = payment.monthYear || 'Current Month';

  // Fixed Monthly Salary / Gross Entitlement
  const totalAgreedSalary =
    Number(resolvedStaff?.fixedSalary) ||
    Number(payment.basicSalary) + Number(payment.bonus || 0) ||
    payment.netPaid;

  // Filter all salary payments for this staff member in this period/month
  const staffPaymentsMap = new Map<string, StaffSalaryPayment>();
  const staffTargetId = payment.staffId || resolvedStaff?.id;

  const relatedPayments = allPayments.filter((p) => {
    const pStaffId = p.staffId || p.staff?.id;
    if (pStaffId && staffTargetId && pStaffId === staffTargetId) {
      if (p.monthYear && payment.monthYear && p.monthYear === payment.monthYear) {
        return true;
      }
      return true;
    }
    return false;
  });

  for (const p of relatedPayments) {
    staffPaymentsMap.set(p.id || p.paymentNumber || '', p);
  }
  staffPaymentsMap.set(payment.id || payment.paymentNumber || '', payment);

  const chronologicalPayments = Array.from(staffPaymentsMap.values()).sort(
    (a, b) => new Date(a.disbursementDate).getTime() - new Date(b.disbursementDate).getTime()
  );

  const totalDisbursedToDate = chronologicalPayments.reduce(
    (sum, p) => sum + (Number(p.netPaid) || 0),
    0
  );

  const remainingBalance = Math.max(0, totalAgreedSalary - totalDisbursedToDate);

  // Generate WhatsApp Message
  const generateWhatsAppMessage = () => {
    const formattedDate = formatDate(payment.disbursementDate);
    const amountStr = formatCurrency(payment.netPaid);
    const methodStr = String(payment.paymentMethod || 'BANK_TRANSFER').replace(/_/g, ' ');

    let transactionHistory = '';
    chronologicalPayments.forEach((pmt, idx) => {
      const isCurrent = pmt.id === payment.id || pmt.paymentNumber === payment.paymentNumber;
      const num = idx + 1;
      const numIcon =
        num === 1 ? '1️⃣' : num === 2 ? '2️⃣' : num === 3 ? '3️⃣' : num === 4 ? '4️⃣' : `[${num}]`;
      const dateFormatted = formatDate(pmt.disbursementDate);
      const amtFormatted = formatCurrency(pmt.netPaid);
      const refText = pmt.referenceNo ? ` [Ref: ${pmt.referenceNo}]` : '';
      const noteText = pmt.notes
        ? ` (${pmt.notes})`
        : num === 1
        ? ' (Advance Salary / 1st Disbursement)'
        : '';
      const currentTag = isCurrent ? ' ⭐ *[Current Payout]*' : '';

      transactionHistory += `${numIcon} *Disbursement ${num} (${dateFormatted}):* ${amtFormatted}${refText}${noteText}${currentTag}\n`;
    });

    return (
      `💼 *OFFICIAL SALARY & REMITTANCE ADVICE*\n` +
      `-------------------------------------------\n` +
      `*Voucher Number:* ${payment.paymentNumber || 'SAL-VOUCHER'}\n` +
      `*Disbursement Date:* ${formattedDate}\n` +
      `*Salary Period:* ${monthPeriod}\n\n` +
      `*Staff Member:* ${staffName} ${employeeId ? `[ID: ${employeeId}]` : ''}\n` +
      `*Designation:* ${staffDesignation}\n\n` +
      `💰 *LATEST NET SALARY DISBURSED:* ${amountStr}\n` +
      `• *Payment Mode:* ${methodStr}\n` +
      (payment.referenceNo ? `• *Bank Ref / UTR / Cheque:* ${payment.referenceNo}\n` : '') +
      (payment.notes ? `• *Description / Notes:* ${payment.notes}\n` : '') +
      `\n` +
      `📊 *SALARY BREAKDOWN:*\n` +
      `• *Basic / Fixed Component:* ${formatCurrency(payment.basicSalary)}\n` +
      (Number(payment.bonus) > 0 ? `• *Performance Incentive / Bonus:* ${formatCurrency(payment.bonus)}\n` : '') +
      (Number(payment.deductions) > 0 ? `• *Deductions (LOP / PF / Advance):* -${formatCurrency(payment.deductions)}\n` : '') +
      `\n` +
      `📊 *OVERALL PERIOD PAYMENT SUMMARY:*\n` +
      `-------------------------------------------\n` +
      `• *Agreed Total Monthly Salary:* ${formatCurrency(totalAgreedSalary)}\n\n` +
      `*Salary Payout Installments (${chronologicalPayments.length}):*\n` +
      transactionHistory +
      `-------------------------------------------\n` +
      `✅ *Total Disbursed to Date:* ${formatCurrency(totalDisbursedToDate)}\n` +
      `⏳ *Balance Remaining for Month:* ${formatCurrency(remainingBalance)}\n` +
      `-------------------------------------------\n\n` +
      `This is an electronically generated salary voucher from ApexBuild ERP. Please verify credit in your registered bank account.`
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
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {payment.paymentNumber || 'SAL-VOUCHER'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 uppercase">
                  Staff Salary Advice
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900 mt-0.5">
                Staff Salary Voucher & Statement
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
          <div className="p-4 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                  Staff Member
                </span>
                <h4 className="font-bold text-base text-slate-900">{staffName}</h4>
                <p className="text-xs text-slate-500">
                  {staffDesignation} {employeeId ? `• Emp ID: ${employeeId}` : ''} • Period: <strong>{monthPeriod}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Net Disbursed
                </span>
                <div className="text-2xl font-black text-indigo-700">
                  {formatCurrency(payment.netPaid)}
                </div>
                <span className="text-[11px] font-medium text-slate-600 block">
                  {formatDate(payment.disbursementDate)} • {payment.paymentMethod?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-200/60 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Monthly Gross</span>
                <strong className="text-slate-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(totalAgreedSalary)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-indigo-200">
                <span className="text-[10px] text-indigo-700 block uppercase font-medium">Disbursed to Date</span>
                <strong className="text-indigo-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(totalDisbursedToDate)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-amber-700 block uppercase font-medium">Balance Due</span>
                <strong className="text-amber-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(remainingBalance)}
                </strong>
              </div>
            </div>
          </div>

          {/* Chronological Transaction Breakdown Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Salary Disbursed Timeline ({chronologicalPayments.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Period Payout Tracking
              </span>
            </div>

            <div className="space-y-1.5">
              {chronologicalPayments.map((pmt, idx) => {
                const isCurrent = pmt.id === payment.id || pmt.paymentNumber === payment.paymentNumber;
                return (
                  <div
                    key={pmt.id || idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-indigo-50/90 border-indigo-300 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-800">
                            Disbursement {idx + 1} ({formatDate(pmt.disbursementDate)})
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {pmt.paymentMethod?.replace(/_/g, ' ')} {pmt.referenceNo ? `• Ref: ${pmt.referenceNo}` : ''} {pmt.notes ? `• ${pmt.notes}` : idx === 0 ? '• (Advance Salary)' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      {formatCurrency(pmt.netPaid)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Destination Phone Input */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-bold flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Staff WhatsApp / Mobile Number</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="tel"
                placeholder="e.g. 9845011223 or +91 98450 11223"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              Numbers are automatically prefixed with international dialing codes. You can modify the recipient mobile number above.
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

          {/* Hidden Printable / PDF Staff Salary Voucher (Rendered during Print) */}
          <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[9999]">
            <div className="border-2 border-slate-800 p-8 rounded-xl space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">APEXBUILD INFRASTRUCTURE</h1>
                  <p className="text-xs text-slate-600">Corporate HR & Staff Payroll Operations</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-indigo-700 uppercase">OFFICIAL SALARY VOUCHER</h2>
                  <p className="font-mono text-xs font-bold text-slate-700">Voucher #: {payment.paymentNumber || 'SAL-VOUCHER'}</p>
                  <p className="text-xs text-slate-500">Date: {formatDate(payment.disbursementDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Employee Information:</span>
                  <strong className="text-sm text-slate-900 block">{staffName}</strong>
                  <p className="text-slate-600">Designation: {staffDesignation}</p>
                  {employeeId && <p className="text-slate-600">Employee ID: {employeeId}</p>}
                  {resolvedStaff?.phone && <p className="text-slate-600">Contact: {resolvedStaff.phone}</p>}
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Payment Details:</span>
                  <p className="text-slate-700">Salary Period: <strong>{monthPeriod}</strong></p>
                  <p className="text-slate-700">Payment Mode: <strong>{payment.paymentMethod?.replace(/_/g, ' ')}</strong></p>
                  <p className="text-slate-700 font-mono">Reference/UTR: <strong>{payment.referenceNo || 'Direct'}</strong></p>
                  <p className="text-slate-700">Basic Fixed: <strong>{formatCurrency(payment.basicSalary)}</strong></p>
                </div>
              </div>

              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-left">
                    <th className="p-2 border-r">#</th>
                    <th className="p-2 border-r">Disbursement Date</th>
                    <th className="p-2 border-r">Description / Ref #</th>
                    <th className="p-2 text-right">Net Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {chronologicalPayments.map((p, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="p-2 border-r font-mono">{i + 1}</td>
                      <td className="p-2 border-r">{formatDate(p.disbursementDate)}</td>
                      <td className="p-2 border-r">{p.notes || `Disbursement ${i + 1}`} {p.referenceNo ? `(${p.referenceNo})` : ''}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(p.netPaid)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-800">
                    <td colSpan={3} className="p-2 border-r text-right uppercase">Total Salary Disbursed to Date:</td>
                    <td className="p-2 text-right text-indigo-800">{formatCurrency(totalDisbursedToDate)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-t border-slate-300">
                    <td colSpan={3} className="p-2 border-r text-right uppercase">Balance Payable for Period:</td>
                    <td className="p-2 text-right text-amber-800">{formatCurrency(remainingBalance)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-medium">HR / Payroll Executive</div>
                <div className="border-t border-slate-400 pt-2 font-medium">Finance Officer</div>
                <div className="border-t border-slate-400 pt-2 font-medium">Employee Signature</div>
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
export default StaffSalaryShareModal;
