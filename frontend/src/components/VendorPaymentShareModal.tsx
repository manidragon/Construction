import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
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
  ExternalLink,
  CheckCircle2,
  TrendingDown,
  Layers,
  ShoppingBag,
} from 'lucide-react';

interface VendorPaymentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any | null;
  supplier?: any | null;
  invoice?: any | null;
  allPayments?: any[];
}

export const VendorPaymentShareModal: React.FC<VendorPaymentShareModalProps> = ({
  isOpen,
  onClose,
  payment,
  supplier,
  invoice,
  allPayments = [],
}) => {
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Resolved entities
  const resolvedSupplier = supplier || payment?.supplier || invoice?.supplier;
  const resolvedInvoice = invoice || payment?.invoice;

  useEffect(() => {
    if (resolvedSupplier?.phone) {
      setCustomPhone(String(resolvedSupplier.phone).replace(/\s+/g, ''));
    } else {
      setCustomPhone('');
    }
  }, [resolvedSupplier]);

  if (!isOpen || !payment) return null;

  // Clean phone string for WhatsApp (no spaces, standardizes 10 digits with country code 91)
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

  const supplierName = resolvedSupplier?.name || 'Valued Vendor / Supplier';
  const supplierCode = resolvedSupplier?.code || '';
  const invoiceNumber = resolvedInvoice?.invoiceNumber || payment.invoiceNumber || 'Direct Account Payment';
  const projectName =
    resolvedInvoice?.project?.name ||
    resolvedInvoice?.purchaseOrder?.project?.name ||
    'Material Procurement & Site Works';
  const projectCode =
    resolvedInvoice?.project?.code ||
    resolvedInvoice?.purchaseOrder?.project?.code ||
    '';

  // Target Invoice / Bill Total
  const totalBillValue =
    Number(resolvedInvoice?.totalAmount) ||
    Number(resolvedInvoice?.subtotal) ||
    Number(payment.totalAmount) ||
    Number(payment.amount) ||
    0;

  // Collect and sort all payments for this invoice or supplier
  const paymentMap = new Map<string, any>();

  // Filter related payments
  const relatedPayments = allPayments.filter((p) => {
    if (resolvedInvoice?.id && p.invoiceId === resolvedInvoice.id) return true;
    if (resolvedSupplier?.id && p.supplierId === resolvedSupplier.id) return true;
    return false;
  });

  for (const p of relatedPayments) {
    paymentMap.set(p.id || p.paymentNumber, p);
  }
  // Ensure the current payment is present
  paymentMap.set(payment.id || payment.paymentNumber, payment);

  const chronologicalPayments = Array.from(paymentMap.values()).sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

  const totalPaidToDate = chronologicalPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const remainingBalance =
    totalBillValue > 0
      ? Math.max(0, totalBillValue - totalPaidToDate)
      : resolvedInvoice?.balanceDue !== undefined
      ? Number(resolvedInvoice.balanceDue)
      : 0;

  // Generate WhatsApp Message with full chronological transaction breakdown
  const generateWhatsAppMessage = () => {
    const formattedDate = formatDate(payment.paymentDate);
    const amountStr = formatCurrency(payment.amount);
    const methodStr = String(payment.paymentMethod || 'BANK_TRANSFER').replace(/_/g, ' ');

    let invoiceSection = '';
    if (resolvedInvoice?.invoiceNumber) {
      const invTotal = formatCurrency(totalBillValue);
      invoiceSection = `📄 *AGAINST BILL/INVOICE:* ${resolvedInvoice.invoiceNumber} (Total Amount: ${invTotal})\n`;
    }

    let poSection = '';
    const poNum = resolvedInvoice?.purchaseOrder?.poNumber || resolvedInvoice?.poNumber;
    if (poNum) {
      poSection = `📦 *PURCHASE ORDER:* ${poNum}\n`;
    }

    // Build the chronological transaction history list
    let transactionHistory = '';
    chronologicalPayments.forEach((pmt, idx) => {
      const isCurrent = pmt.id === payment.id || pmt.paymentNumber === payment.paymentNumber;
      const num = idx + 1;
      const numIcon =
        num === 1 ? '1️⃣' : num === 2 ? '2️⃣' : num === 3 ? '3️⃣' : num === 4 ? '4️⃣' : num === 5 ? '5️⃣' : `[${num}]`;
      const dateFormatted = formatDate(pmt.paymentDate);
      const amtFormatted = formatCurrency(pmt.amount);
      const refText = pmt.referenceNo ? ` [Ref: ${pmt.referenceNo}]` : '';
      const noteText = pmt.notes
        ? ` (${pmt.notes})`
        : num === 1
        ? ' (Advance Payment)'
        : '';
      const currentTag = isCurrent ? ' ⭐ *[Current Disbursement]*' : '';

      transactionHistory += `${numIcon} *Payment ${num} (${dateFormatted}):* ${amtFormatted}${refText}${noteText}${currentTag}\n`;
    });

    const totalBillFormatted = formatCurrency(totalBillValue);
    const totalPaidFormatted = formatCurrency(totalPaidToDate);
    const balanceFormatted = formatCurrency(remainingBalance);

    return (
      `🏢 *VENDOR PAYMENT ADVICE & REMITTANCE UPDATE*\n` +
      `-------------------------------------------\n` +
      `*Voucher Number:* ${payment.paymentNumber}\n` +
      `*Payment Date:* ${formattedDate}\n\n` +
      `*Supplier / Vendor:* ${supplierName} ${supplierCode ? `(${supplierCode})` : ''}\n` +
      `*Project:* ${projectName} ${projectCode ? `[${projectCode}]` : ''}\n` +
      invoiceSection +
      poSection +
      `\n` +
      `💰 *LATEST PAYMENT DISBURSED:* ${amountStr}\n` +
      `• *Payment Mode:* ${methodStr}\n` +
      (payment.referenceNo ? `• *Bank Ref / UTR / Cheque #:* ${payment.referenceNo}\n` : '') +
      (payment.notes ? `• *Notes / Description:* ${payment.notes}\n` : '') +
      `\n` +
      `📊 *OVERALL BILL & ACCOUNT SUMMARY:*\n` +
      `-------------------------------------------\n` +
      `• *Total Bill / PO Amount:* ${totalBillFormatted}\n\n` +
      `*Payment Installments Disbursed (${chronologicalPayments.length}):*\n` +
      transactionHistory +
      `-------------------------------------------\n` +
      `✅ *Total Amount Disbursed to Date:* ${totalPaidFormatted}\n` +
      `⏳ *Remaining Balance Payable:* ${balanceFormatted}\n` +
      `-------------------------------------------\n\n` +
      `This is an electronically generated payment advice from ApexBuild ERP. Please verify credit in your bank account.`
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
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {payment.paymentNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  Vendor Remittance
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900 mt-0.5">
                Share Vendor Payment & Statement
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
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Vendor / Supplier
                </span>
                <h4 className="font-bold text-base text-slate-900">{supplierName}</h4>
                <p className="text-xs text-slate-500">
                  Bill / Invoice: <strong className="text-slate-800">{invoiceNumber}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Current Payment Disbursed
                </span>
                <div className="text-2xl font-black text-emerald-700">
                  {formatCurrency(payment.amount)}
                </div>
                <span className="text-[11px] font-medium text-slate-600 block">
                  {formatDate(payment.paymentDate)} • {payment.paymentMethod?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Bill Amount</span>
                <strong className="text-slate-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(totalBillValue)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block uppercase font-medium">Disbursed to Date</span>
                <strong className="text-emerald-800 text-xs sm:text-sm font-bold">
                  {formatCurrency(totalPaidToDate)}
                </strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-amber-700 block uppercase font-medium">Remaining Balance</span>
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
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Payment Installments Timeline ({chronologicalPayments.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Cumulative Payment Tracking
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
                        ? 'bg-emerald-50/90 border-emerald-300 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-800">
                            Payment {idx + 1} ({formatDate(pmt.paymentDate)})
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {pmt.paymentMethod?.replace(/_/g, ' ')} {pmt.referenceNo ? `• Ref: ${pmt.referenceNo}` : ''} {pmt.notes ? `• ${pmt.notes}` : idx === 0 ? '• (Advance Payment)' : ''}
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
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vendor WhatsApp / Mobile Number</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="tel"
                placeholder="e.g. 9845011223 or +91 98450 11223"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              Numbers are automatically formatted for WhatsApp. You can customize the destination mobile number above.
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

          {/* Hidden Printable / PDF Payment Voucher (Rendered during Print) */}
          <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[9999]">
            <div className="border-2 border-slate-800 p-8 rounded-xl space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">APEXBUILD INFRASTRUCTURE</h1>
                  <p className="text-xs text-slate-600">Site Operations, Civil & Interior Procurement</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-emerald-700 uppercase">OFFICIAL PAYMENT VOUCHER</h2>
                  <p className="font-mono text-xs font-bold text-slate-700">Voucher #: {payment.paymentNumber}</p>
                  <p className="text-xs text-slate-500">Date: {formatDate(payment.paymentDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Paid To (Supplier):</span>
                  <strong className="text-sm text-slate-900 block">{supplierName}</strong>
                  {supplierCode && <p className="text-slate-600">Code: {supplierCode}</p>}
                  {resolvedSupplier?.gstin && <p className="text-slate-600">GSTIN: {resolvedSupplier.gstin}</p>}
                  {resolvedSupplier?.phone && <p className="text-slate-600">Contact: {resolvedSupplier.phone}</p>}
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Payment Details:</span>
                  <p className="text-slate-700">Mode: <strong>{payment.paymentMethod?.replace(/_/g, ' ')}</strong></p>
                  <p className="text-slate-700 font-mono">Reference/UTR: <strong>{payment.referenceNo || 'Direct'}</strong></p>
                  <p className="text-slate-700">Bill/Invoice: <strong>{invoiceNumber}</strong></p>
                  <p className="text-slate-700">Project: <strong>{projectName}</strong></p>
                </div>
              </div>

              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-left">
                    <th className="p-2 border-r">#</th>
                    <th className="p-2 border-r">Disbursement Date</th>
                    <th className="p-2 border-r">Payment Ref / Description</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {chronologicalPayments.map((p, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="p-2 border-r font-mono">{i + 1}</td>
                      <td className="p-2 border-r">{formatDate(p.paymentDate)}</td>
                      <td className="p-2 border-r">{p.notes || `Installment ${i + 1}`} {p.referenceNo ? `(${p.referenceNo})` : ''}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-800">
                    <td colSpan={3} className="p-2 border-r text-right uppercase">Total Amount Paid to Date:</td>
                    <td className="p-2 text-right text-emerald-800">{formatCurrency(totalPaidToDate)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-t border-slate-300">
                    <td colSpan={3} className="p-2 border-r text-right uppercase">Remaining Balance Due:</td>
                    <td className="p-2 text-right text-amber-800">{formatCurrency(remainingBalance)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-medium">Prepared By (Accounts)</div>
                <div className="border-t border-slate-400 pt-2 font-medium">Authorised Signatory</div>
                <div className="border-t border-slate-400 pt-2 font-medium">Supplier / Receiver Acknowledgment</div>
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
export default VendorPaymentShareModal;
