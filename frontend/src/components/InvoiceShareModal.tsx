import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClientInvoice } from '../types';
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
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface InvoiceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
}

export const InvoiceShareModal: React.FC<InvoiceShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const { user } = useAuth();
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (invoice) {
      const rawPhone =
        invoice.client?.phone || invoice.project?.clientContact || '';
      setCustomPhone(rawPhone.replace(/\s+/g, ''));
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

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

  const clientName =
    invoice.client?.companyName ||
    invoice.client?.name ||
    invoice.project?.clientName ||
    'Valued Client';

  const projectName = invoice.project?.name || 'Project';
  const projectCode = invoice.project?.code || '';
  const paymentPurpose =
    invoice.milestoneName ||
    invoice.description ||
    invoice.certificationNotes ||
    'Running Account Bill - Certified Work Progress';

  const isAdvance =
    invoice.invoiceType === 'ADVANCE' ||
    paymentPurpose.toLowerCase().includes('advance');

  // Generate WhatsApp Message
  const generateWhatsAppMessage = () => {
    const formattedDate = formatDate(invoice.invoiceDate);
    const formattedDueDate = formatDate(invoice.dueDate);
    const netAmountStr = formatCurrency(invoice.netInvoiceAmount);
    const subtotalStr = formatCurrency(invoice.subtotal);
    const retStr = formatCurrency(invoice.retentionAmount);
    const tdsStr = formatCurrency(invoice.tdsAmount);
    const gstStr = formatCurrency(invoice.gstAmount);

    const companyName = user?.company?.name || user?.company?.companyName || 'ApexBuild Construction Pvt. Ltd.';

    return (
      `📄 *${isAdvance ? 'MOBILIZATION ADVANCE INVOICE' : 'RUNNING ACCOUNT (RA) BILL'}*\n` +
      `-------------------------------------------\n` +
      `*${companyName}*\n` +
      `*Bill Number:* ${invoice.invoiceNumber}\n` +
      `*Date:* ${formattedDate}\n` +
      `*Payment Due Date:* ${formattedDueDate}\n\n` +
      `*Client:* ${clientName}\n` +
      `*Project:* ${projectName} ${projectCode ? `[${projectCode}]` : ''}\n\n` +
      `📌 *PAYMENT PURPOSE / DESCRIPTION:*\n` +
      `👉 ${paymentPurpose}\n\n` +
      `💼 *FINANCIAL BREAKDOWN:*\n` +
      `• Certified Subtotal: ${subtotalStr}\n` +
      (invoice.retentionAmount > 0 ? `• Retention (${invoice.retentionPercent}%): -${retStr}\n` : '') +
      (invoice.tdsAmount > 0 ? `• TDS 194C (${invoice.tdsPercent}%): -${tdsStr}\n` : '') +
      (invoice.gstAmount > 0 ? `• GST (${invoice.gstPercent}%): +${gstStr}\n` : '') +
      `-------------------------------------------\n` +
      `💰 *NET PAYABLE AMOUNT: ${netAmountStr}*\n` +
      `-------------------------------------------\n\n` +
      `🏦 *BANK TRANSFER / NEFT DETAILS:*\n` +
      `• Account Name: ${companyName}\n` +
      `• Bank: HDFC Bank\n` +
      `• Account No: 50200084729103\n` +
      `• IFSC Code: HDFC0001234\n` +
      `• Branch: Indiranagar, Bangalore\n\n` +
      `Kindly process the remittance on or before *${formattedDueDate}*. Kindly share the payment UTR / reference receipt once remitted for instant reconciliation.\n\n` +
      `Thank you for your valued partnership.\n\n` +
      `Warm regards,\n` +
      `*Accounts & Billing Department*\n` +
      `${companyName}`
    );
  };

  const handleShareWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const phone = cleanPhone(customPhone);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyMessage = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Formal Printable PDF RA Bill Voucher
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print.');
      return;
    }

    const billDateStr = formatDate(invoice.invoiceDate);
    const dueDateStr = formatDate(invoice.dueDate);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>RA Bill - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 15mm 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 24px; }
          .company-title { font-size: 20px; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; }
          .company-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge-box { text-align: right; }
          .badge { background: #d97706; color: #fff; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
          .bill-num { font-size: 16px; font-weight: 800; font-family: monospace; margin-top: 6px; color: #0f172a; }
          .bill-date { font-size: 11px; color: #64748b; }

          .grid-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 12px; }
          .box-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          .box-value { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }

          .purpose-banner { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
          .purpose-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px; }
          .purpose-text { font-size: 14px; font-weight: 800; color: #78350f; margin-top: 4px; }

          .amount-banner { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .amount-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; }
          .amount-val { font-size: 24px; font-weight: 900; color: #15803d; font-family: monospace; }

          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
          .details-table th { background: #f1f5f9; color: #334155; text-align: left; padding: 10px 14px; font-weight: 700; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #cbd5e1; }
          .details-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
          .details-table tr:nth-child(even) td { background: #f8fafc; }

          .bank-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 30px; font-size: 11px; }
          .bank-title { font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; }

          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px; }
          .sig-box { border-top: 1px dashed #94a3b8; padding-top: 8px; text-align: center; font-size: 11px; color: #475569; }

          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${user?.company?.logo ? `<img src="${user.company.logo}" style="max-height: 52px; max-width: 130px; object-fit: contain; border-radius: 6px;" />` : ''}
            <div>
              <h1 class="company-title">${user?.company?.name || user?.company?.companyName || 'ApexBuild Construction Pvt. Ltd.'}</h1>
              <p class="company-sub">${user?.company?.gstin ? `GSTIN: ${user.company.gstin} • ` : ''}${user?.company?.address || 'Bangalore, Karnataka, India'}</p>
              <p class="company-sub">Phone: ${user?.company?.phone || '+91 80 2841 2345'} • Email: ${user?.company?.email || user?.email || 'billing@apexbuild.in'}</p>
            </div>
          </div>
          <div class="badge-box">
            <span class="badge">${isAdvance ? 'Advance Invoice' : 'Running Account Bill'}</span>
            <div class="bill-num">${invoice.invoiceNumber}</div>
            <div class="bill-date">Date: ${billDateStr} | Due: ${dueDateStr}</div>
          </div>
        </div>

        <div class="grid-box">
          <div>
            <div class="box-label">Billed To (Client / Employer)</div>
            <div class="box-value">${clientName}</div>
            ${invoice.client?.billingAddress ? `<p style="margin:4px 0 0; color:#64748b; font-size:11px;">${invoice.client.billingAddress}</p>` : ''}
            ${invoice.client?.gstin ? `<p style="margin:2px 0 0; color:#64748b; font-size:11px;">GSTIN: ${invoice.client.gstin}</p>` : ''}
          </div>
          <div>
            <div class="box-label">Project / Contract</div>
            <div class="box-value">${projectName}</div>
            <p style="margin:4px 0 0; color:#64748b; font-size:11px;">Project Code: ${projectCode || '—'}</p>
            ${invoice.project?.clientContact ? `<p style="margin:2px 0 0; color:#64748b; font-size:11px;">Client Contact: ${invoice.project.clientContact}</p>` : ''}
          </div>
        </div>

        <div class="purpose-banner">
          <div class="purpose-title">Payment Purpose / Description</div>
          <div class="purpose-text">${paymentPurpose}</div>
        </div>

        <div class="amount-banner">
          <div>
            <span class="amount-label">Net Payable Amount</span>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Payment Due Date: ${dueDateStr}</div>
          </div>
          <div class="amount-val">${formatCurrency(invoice.netInvoiceAmount)}</div>
        </div>

        <table class="details-table">
          <thead>
            <tr>
              <th>Component</th>
              <th style="text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Certified Work Done Subtotal</strong></td>
              <td style="text-align:right; font-family:monospace; font-weight:bold;">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            ${
              invoice.retentionAmount > 0
                ? `
            <tr>
              <td>(-) Retention Deduction (${invoice.retentionPercent}%)</td>
              <td style="text-align:right; font-family:monospace; color:#b45309;">-${formatCurrency(invoice.retentionAmount)}</td>
            </tr>
            `
                : ''
            }
            ${
              invoice.tdsAmount > 0
                ? `
            <tr>
              <td>(-) TDS 194C Deduction (${invoice.tdsPercent}%)</td>
              <td style="text-align:right; font-family:monospace; color:#64748b;">-${formatCurrency(invoice.tdsAmount)}</td>
            </tr>
            `
                : ''
            }
            ${
              invoice.gstAmount > 0
                ? `
            <tr>
              <td>(+) Goods & Services Tax (GST ${invoice.gstPercent}%)</td>
              <td style="text-align:right; font-family:monospace; color:#15803d;">+${formatCurrency(invoice.gstAmount)}</td>
            </tr>
            `
                : ''
            }
            <tr style="background:#f1f5f9; font-weight:bold;">
              <td><strong>NET PAYABLE BILL AMOUNT</strong></td>
              <td style="text-align:right; font-family:monospace; font-size:14px; color:#0f172a;">${formatCurrency(invoice.netInvoiceAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="bank-box">
          <div class="bank-title">Bank Remittance Instructions</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div>Bank: <strong>HDFC Bank Ltd.</strong></div>
            <div>Account No: <strong style="font-family:monospace;">50200084729103</strong></div>
            <div>Account Name: <strong>ApexBuild Construction Pvt. Ltd.</strong></div>
            <div>IFSC Code: <strong style="font-family:monospace;">HDFC0001234</strong></div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">Prepared & Certified By (Project Billing)</div>
          <div class="sig-box">Authorized Signatory (ApexBuild Construction)</div>
        </div>

        <div class="footer">
          <span>ApexBuild ERP Financial Engine • Bill Ref: ${invoice.invoiceNumber}</span>
          <span>System Generated Electronic Running Account Bill</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Share RA Bill with Client</h3>
                <span className="text-[11px] bg-slate-800 text-amber-400 border border-slate-700 font-mono px-2 py-0.5 rounded font-bold">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Share professional bill statement with purpose & bank details via WhatsApp or PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Success Notification Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong className="block font-bold">RA Bill Generated & Saved Successfully</strong>
              Share this bill notification with the client so they are aware of the payment purpose and due date.
            </div>
          </div>

          {/* Payment Purpose Highlight Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Payment Purpose / Description
            </span>
            <div className="text-sm font-extrabold text-amber-950 flex items-center space-x-2">
              <span>{isAdvance ? '💰' : '🏗️'}</span>
              <span>{paymentPurpose}</span>
            </div>
            {isAdvance && (
              <span className="inline-block mt-1 text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                Advance Payment Request
              </span>
            )}
          </div>

          {/* Amount Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Net Bill Amount (Payable)
              </span>
              <div className="text-2xl font-black font-mono tracking-tight mt-0.5 text-white">
                {formatCurrency(invoice.netInvoiceAmount)}
              </div>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                Certified Subtotal: {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[10px]">Payment Due Date</span>
              <strong className="text-amber-400 block font-bold">{formatDate(invoice.dueDate)}</strong>
            </div>
          </div>

          {/* Client & Project Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Client Name</span>
                <strong className="text-slate-900 block truncate">{clientName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Project</span>
                <strong className="text-slate-800 block truncate">{projectName}</strong>
              </div>
            </div>
          </div>

          {/* Client WhatsApp Phone Number Input */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Client WhatsApp / Mobile Number</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Editable</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. 9876543210 or +919876543210"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Numbers are automatically prefixed with standard WhatsApp format.
            </p>
          </div>

          {/* WhatsApp Message Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              WhatsApp Message Preview
            </span>
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {generateWhatsAppMessage()}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMessage}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1.5 bg-white shadow-sm"
              title="Copy formatted message"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1.5 bg-white shadow-sm"
              title="Print formal RA bill voucher"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Print / PDF Bill</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
            >
              Close
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center space-x-1.5 shadow-md hover:shadow-lg"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
