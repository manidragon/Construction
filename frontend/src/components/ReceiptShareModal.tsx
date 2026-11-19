import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClientReceipt, ClientInvoice } from '../types';
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
  History,
  TrendingDown,
  Layers,
} from 'lucide-react';

interface ReceiptShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ClientReceipt | null;
  allReceipts?: ClientReceipt[];
  projects?: any[];
  invoices?: ClientInvoice[];
}

export const ReceiptShareModal: React.FC<ReceiptShareModalProps> = ({
  isOpen,
  onClose,
  receipt,
  allReceipts = [],
  projects = [],
  invoices = [],
}) => {
  const { user } = useAuth();
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (receipt) {
      const rawPhone =
        receipt.client?.phone || receipt.project?.clientContact || '';
      setCustomPhone(rawPhone.replace(/\s+/g, ''));
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

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
    receipt.client?.companyName ||
    receipt.client?.name ||
    receipt.project?.clientName ||
    'Valued Client';

  const projectName = receipt.project?.name || 'Project';
  const projectCode = receipt.project?.code || '';
  const targetProjectId = receipt.projectId || receipt.project?.id || '';

  // Match project from projects list or receipt
  const matchedProject =
    projects.find((p) => p.id === targetProjectId) || receipt.project;

  // Project Total / Contract Value
  const totalProjectValue =
    matchedProject?.contractValue && Number(matchedProject.contractValue) > 0
      ? Number(matchedProject.contractValue)
      : matchedProject?.financials?.contractValue &&
        Number(matchedProject.financials.contractValue) > 0
        ? Number(matchedProject.financials.contractValue)
        : receipt.project?.contractValue && Number(receipt.project.contractValue) > 0
          ? Number(receipt.project.contractValue)
          : invoices
            .filter((inv) => inv.projectId === targetProjectId)
            .reduce(
              (sum, inv) =>
                sum + (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0),
              0
            );

  // Filter and deduplicate all receipts for this project
  const projectReceiptMap = new Map<string, ClientReceipt>();
  for (const r of allReceipts) {
    const rProjId = r.projectId || r.project?.id;
    if (rProjId && targetProjectId && rProjId === targetProjectId) {
      projectReceiptMap.set(r.id || r.receiptNumber, r);
    }
  }
  // Ensure the current receipt being shared is present
  if (receipt.id || receipt.receiptNumber) {
    projectReceiptMap.set(receipt.id || receipt.receiptNumber, receipt);
  }

  // Sort chronologically ascending (earliest to latest)
  const chronologicalReceipts = Array.from(projectReceiptMap.values()).sort(
    (a, b) =>
      new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
  );

  // Total received across all payments
  const totalReceivedAmount = chronologicalReceipts.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  // Remaining balance
  const remainingBalance =
    totalProjectValue > 0
      ? Math.max(0, totalProjectValue - totalReceivedAmount)
      : receipt.invoice?.balanceDue !== undefined
        ? receipt.invoice.balanceDue
        : 0;

  // Generate WhatsApp Message with full transaction breakdown
  const generateWhatsAppMessage = () => {
    const formattedDate = formatDate(receipt.receiptDate);
    const amountStr = formatCurrency(receipt.amount);
    const methodStr = receipt.paymentMethod.replace(/_/g, ' ');

    let invoiceSection = '';
    if (receipt.invoice) {
      const invNet = formatCurrency(receipt.invoice.netInvoiceAmount || 0);
      const invBal = formatCurrency(receipt.invoice.balanceDue || 0);
      invoiceSection =
        `📄 *LINKED BILL:* ${receipt.invoice.invoiceNumber} (Net: ${invNet} | Remaining Due: ${invBal})\n\n`;
    }

    // Build the chronological transaction history list
    let transactionHistory = '';
    chronologicalReceipts.forEach((rcp, idx) => {
      const isCurrent =
        rcp.id === receipt.id || rcp.receiptNumber === receipt.receiptNumber;
      const num = idx + 1;
      const numIcon =
        num === 1
          ? '1️⃣'
          : num === 2
            ? '2️⃣'
            : num === 3
              ? '3️⃣'
              : num === 4
                ? '4️⃣'
                : num === 5
                  ? '5️⃣'
                  : `[${num}]`;
      const dateFormatted = formatDate(rcp.receiptDate);
      const amtFormatted = formatCurrency(rcp.amount);
      const refText = rcp.referenceNo ? ` [Ref: ${rcp.referenceNo}]` : '';
      const noteText = rcp.notes
        ? ` (${rcp.notes})`
        : num === 1
          ? ' (Advance Payment)'
          : '';
      const currentTag = isCurrent ? ' ⭐ *[Current Payment]*' : '';

      transactionHistory += `${numIcon} *Payment ${num} (${dateFormatted}):* ${amtFormatted}${refText}${noteText}${currentTag}\n`;
    });

    const projectValFormatted =
      totalProjectValue > 0 ? formatCurrency(totalProjectValue) : 'As per Contract';
    const totalRecFormatted = formatCurrency(totalReceivedAmount);
    const balanceFormatted = formatCurrency(remainingBalance);

    return (
      `🧾 *PAYMENT RECEIPT & PROJECT ACCOUNT STATEMENT*\n` +
      `-------------------------------------------\n` +
      `*Receipt Number:* ${receipt.receiptNumber}\n` +
      `*Date:* ${formattedDate}\n\n` +
      `*Client:* ${clientName}\n` +
      `*Project:* ${projectName} ${projectCode ? `[${projectCode}]` : ''}\n\n` +
      `💰 *LATEST PAYMENT RECEIVED:* ${amountStr}\n` +
      `• *Payment Mode:* ${methodStr}\n` +
      (receipt.referenceNo ? `• *Bank Ref / UTR:* ${receipt.referenceNo}\n` : '') +
      (receipt.notes ? `• *Notes / Purpose:* ${receipt.notes}\n` : '') +
      `\n` +
      invoiceSection +
      `📊 *OVERALL PROJECT TRANSACTION SUMMARY:*\n` +
      `-------------------------------------------\n` +
      `• *Total Project / Contract Value:* ${projectValFormatted}\n\n` +
      `*Payment Installments Received (${chronologicalReceipts.length}):*\n` +
      transactionHistory +
      `-------------------------------------------\n` +
      `✅ *Total Amount Received to Date:* ${totalRecFormatted}\n` +
      `⏳ *Remaining Balance Payable:* ${balanceFormatted}\n` +
      `-------------------------------------------\n\n` +
      `We gratefully acknowledge the receipt of your payment. Thank you for your continued trust and partnership.\n\n` +
      `Warm regards,\n` +
      `*Accounts & Finance Department*\n` +
      `ApexBuild Construction Pvt. Ltd.`
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

  // Formal Printable PDF Receipt Voucher with Project Statement
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print the receipt.');
      return;
    }

    const receiptDateStr = formatDate(receipt.receiptDate);
    const methodStr = receipt.paymentMethod.replace(/_/g, ' ');

    // Rows for project payment ledger table
    const ledgerRows = chronologicalReceipts
      .map((rcp, idx) => {
        const isCurrent =
          rcp.id === receipt.id || rcp.receiptNumber === receipt.receiptNumber;
        return `
          <tr style="${isCurrent ? 'background: #ecfdf5; font-weight: bold;' : ''}">
            <td>#${idx + 1}</td>
            <td>${formatDate(rcp.receiptDate)}</td>
            <td style="font-family: monospace;">${rcp.receiptNumber}</td>
            <td>${rcp.paymentMethod.replace(/_/g, ' ')}</td>
            <td style="font-family: monospace;">${rcp.referenceNo || '—'}</td>
            <td>${rcp.notes || (idx === 0 ? 'Advance Payment' : 'Project Installment')}</td>
            <td style="text-align: right; font-family: monospace; ${isCurrent ? 'color: #047857;' : ''}">
              ${formatCurrency(rcp.amount)} ${isCurrent ? '⭐' : ''}
            </td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt - ${receipt.receiptNumber}</title>
        <style>
          @page { size: A4; margin: 15mm 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 24px; }
          .company-title { font-size: 20px; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; }
          .company-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
          .receipt-badge-box { text-align: right; }
          .receipt-badge { background: #047857; color: #fff; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
          .receipt-num { font-size: 15px; font-weight: 800; font-family: monospace; margin-top: 6px; color: #0f172a; }
          .receipt-date { font-size: 11px; color: #64748b; }

          .grid-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 12px; }
          .box-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          .box-value { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }

          .amount-banner { background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .amount-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; }
          .amount-val { font-size: 24px; font-weight: 900; color: #047857; font-family: monospace; }

          .summary-card { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .sum-col { }
          .sum-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .sum-val { font-size: 16px; font-weight: 900; font-family: monospace; margin-top: 2px; }

          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
          .details-table th { background: #f1f5f9; color: #334155; text-align: left; padding: 8px 10px; font-weight: 700; text-transform: uppercase; font-size: 9px; border-bottom: 1px solid #cbd5e1; }
          .details-table td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }

          .ack-text { font-size: 11px; color: #475569; font-style: italic; background: #f8fafc; border-left: 3px solid #047857; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 30px; }

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
              <p class="company-sub">Phone: ${user?.company?.phone || '+91 80 2841 2345'} • Email: ${user?.company?.email || user?.email || 'finance@apexbuild.in'}</p>
            </div>
          </div>
          <div class="receipt-badge-box">
            <span class="receipt-badge">Official Payment Receipt</span>
            <div class="receipt-num">${receipt.receiptNumber}</div>
            <div class="receipt-date">Date: ${receiptDateStr}</div>
          </div>
        </div>

        <div class="grid-box">
          <div>
            <div class="box-label">Received From (Client / Employer)</div>
            <div class="box-value">${clientName}</div>
            ${receipt.client?.billingAddress ? `<p style="margin:4px 0 0; color:#64748b; font-size:11px;">${receipt.client.billingAddress}</p>` : ''}
            ${receipt.client?.gstin ? `<p style="margin:2px 0 0; color:#64748b; font-size:11px;">GSTIN: ${receipt.client.gstin}</p>` : ''}
          </div>
          <div>
            <div class="box-label">Project / Contract</div>
            <div class="box-value">${projectName}</div>
            <p style="margin:4px 0 0; color:#64748b; font-size:11px;">Project Code: ${projectCode || '—'}</p>
            ${receipt.project?.clientContact ? `<p style="margin:2px 0 0; color:#64748b; font-size:11px;">Client Contact: ${receipt.project.clientContact}</p>` : ''}
          </div>
        </div>

        <div class="amount-banner">
          <div>
            <span class="amount-label">Current Payment Received</span>
            <div style="font-size:11px; color:#065f46; margin-top:2px;">
              Mode: ${methodStr} • Ref: ${receipt.referenceNo || 'Direct'}
            </div>
          </div>
          <div class="amount-val">${formatCurrency(receipt.amount)}</div>
        </div>

        <!-- Overall Project Financial Ledger Summary -->
        <div class="summary-card">
          <div class="sum-col">
            <div class="sum-label">Total Project Value</div>
            <div class="sum-val" style="color: #0f172a;">${totalProjectValue > 0 ? formatCurrency(totalProjectValue) : 'As per Contract'}</div>
          </div>
          <div class="sum-col">
            <div class="sum-label">Total Received to Date</div>
            <div class="sum-val" style="color: #047857;">${formatCurrency(totalReceivedAmount)}</div>
          </div>
          <div class="sum-col">
            <div class="sum-label">Remaining Balance</div>
            <div class="sum-val" style="color: #b45309;">${formatCurrency(remainingBalance)}</div>
          </div>
        </div>

        <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 8px; letter-spacing: 0.5px;">
          Overall Project Payment Transactions History (${chronologicalReceipts.length} Installments)
        </h3>

        <table class="details-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Receipt #</th>
              <th>Mode</th>
              <th>Ref / UTR</th>
              <th>Description / Purpose</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows}
            <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td colspan="6" style="text-align: right; text-transform: uppercase; font-size: 10px;">Total Received:</td>
              <td style="text-align: right; font-family: monospace; color: #047857; font-size: 12px;">${formatCurrency(totalReceivedAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="ack-text">
          Received with thanks from <strong>${clientName}</strong> the sum of <strong>${formatCurrency(receipt.amount)}</strong> against works for <strong>${projectName}</strong>. Total payments received across all installments to date amount to <strong>${formatCurrency(totalReceivedAmount)}</strong>, with an outstanding balance of <strong>${formatCurrency(remainingBalance)}</strong>.
        </div>

        <div class="signatures">
          <div class="sig-box">Accounts Officer / Cashier</div>
          <div class="sig-box">Authorized Signatory (ApexBuild Construction)</div>
        </div>

        <div class="footer">
          <span>ApexBuild ERP Financial Engine • Voucher Ref: ${receipt.receiptNumber}</span>
          <span>System Generated Electronic Receipt</span>
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Share Payment Receipt</h3>
                <span className="text-[11px] bg-slate-800 text-emerald-400 border border-slate-700 font-mono px-2 py-0.5 rounded font-bold">
                  {receipt.receiptNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Share payment acknowledgement with cumulative project ledger via WhatsApp
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
          {/* Success Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong className="block font-bold">Payment Recorded Successfully</strong>
              This WhatsApp statement breaks down the current payment and complete cumulative installment ledger for the project.
            </div>
          </div>

          {/* Amount Received Highlight Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">
                Latest Payment Received
              </span>
              <div className="text-2xl font-black font-mono tracking-tight mt-0.5">
                {formatCurrency(receipt.amount)}
              </div>
              <span className="text-[11px] text-emerald-100/90 block mt-0.5">
                Mode: {receipt.paymentMethod.replace(/_/g, ' ')} • Ref:{' '}
                {receipt.referenceNo || 'Direct'}
              </span>
            </div>
            <div className="text-right text-xs">
              <span className="text-emerald-200 block text-[10px]">Date</span>
              <strong className="text-white block font-medium">
                {formatDate(receipt.receiptDate)}
              </strong>
            </div>
          </div>

          {/* Overall Project Transaction Summary Card */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Overall Project Transaction Summary
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 text-amber-300 font-mono font-bold px-2 py-0.5 rounded">
                {chronologicalReceipts.length} Installment
                {chronologicalReceipts.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Project Value
                </span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                  {totalProjectValue > 0
                    ? formatCurrency(totalProjectValue)
                    : 'Contract Val.'}
                </span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-800/50 p-2 rounded-lg">
                <span className="text-[10px] text-emerald-300 font-bold block uppercase">
                  Total Received
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
                  {formatCurrency(totalReceivedAmount)}
                </span>
              </div>
              <div className="bg-amber-950/80 border border-amber-800/50 p-2 rounded-lg">
                <span className="text-[10px] text-amber-300 font-bold block uppercase">
                  Remaining Balance
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 mt-0.5 block">
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>

            {/* Installments Mini List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Payment History:
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {chronologicalReceipts.map((rcp, idx) => {
                  const isCurrent =
                    rcp.id === receipt.id ||
                    rcp.receiptNumber === receipt.receiptNumber;
                  return (
                    <div
                      key={rcp.id || idx}
                      className={`flex items-center justify-between text-[11px] p-1.5 rounded-lg ${isCurrent
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-slate-800/50 text-slate-300'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-200 text-[10px] flex items-center justify-center font-bold font-mono">
                          {idx + 1}
                        </span>
                        <span>
                          {formatDate(rcp.receiptDate)}
                          {rcp.notes ? ` (${rcp.notes})` : idx === 0 ? ' (Advance)' : ''}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-extrabold uppercase">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold">
                        {formatCurrency(rcp.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Client & Project Details Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Client Name
                </span>
                <strong className="text-slate-900 block truncate">
                  {clientName}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Project
                </span>
                <strong className="text-slate-800 block truncate">
                  {projectName}
                </strong>
              </div>
            </div>

            {receipt.invoice && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  Linked RA Bill:{' '}
                  <strong className="text-slate-800 font-mono">
                    {receipt.invoice.invoiceNumber}
                  </strong>
                </span>
                <span className="text-amber-700 font-bold">
                  Remaining Bill Due:{' '}
                  {formatCurrency(receipt.invoice.balanceDue || 0)}
                </span>
              </div>
            )}
          </div>

          {/* Client WhatsApp Phone Number Input */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Client WhatsApp / Phone Number</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                No spaces needed
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customPhone}
                onChange={(e) =>
                  setCustomPhone(e.target.value.replace(/\s+/g, ''))
                }
                placeholder="e.g. +918056694739 or 9876543210"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Numbers are automatically formatted for WhatsApp (e.g.{' '}
              <span className="font-mono font-bold">918056694739</span>).
            </p>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              WhatsApp Message Preview (With Multi-Payment Ledger)
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
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1.5 bg-white shadow-sm"
              title="Print formal payment receipt voucher"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Print / PDF Voucher</span>
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
