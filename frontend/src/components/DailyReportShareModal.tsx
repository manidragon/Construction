import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  FileText,
  Calendar,
  Truck,
  Phone,
  Briefcase,
  ChevronDown,
  ChevronUp,
  HardHat,
  BadgeAlert,
  Printer,
} from 'lucide-react';

interface DailyReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  defaultTab?: 'owner' | 'client';
}

export const DailyReportShareModal: React.FC<DailyReportShareModalProps> = ({
  isOpen,
  onClose,
  projectId,
  defaultTab = 'owner',
}) => {
  const [activeTab, setActiveTab] = useState<'owner' | 'client'>(defaultTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [customPhone, setCustomPhone] = useState<string>('');
  const [showVendorDetails, setShowVendorDetails] = useState<boolean>(false);
  const [showTasksDetails, setShowTasksDetails] = useState<boolean>(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await api.getProjectDailyShareReport(projectId);
        if (res.success && res.report) {
          setReportData(res.report);
          if (activeTab === 'client' && res.report.clientReport?.clientContact) {
            setCustomPhone(res.report.clientReport.clientContact);
          } else {
            setCustomPhone('');
          }
        }
      } catch (err) {
        console.error('Failed to load project daily share report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, projectId]);

  useEffect(() => {
    if (reportData) {
      if (activeTab === 'client' && reportData.clientReport?.clientContact) {
        setCustomPhone(reportData.clientReport.clientContact);
      } else {
        setCustomPhone('');
      }
    }
  }, [activeTab, reportData]);

  if (!isOpen) return null;

  const project = reportData?.project;
  const owner = reportData?.ownerReport;
  const client = reportData?.clientReport;

  // Clean phone string
  const cleanPhone = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  // Generate WhatsApp Message for Owner
  const generateOwnerWhatsAppMessage = () => {
    if (!project || !owner) return '';
    const todayStr = formatDate(new Date());
    const overrunText =
      owner.additionalSpent > 0
        ? `⚠️ *Additional Spent (Budget Overrun):* ${formatCurrency(owner.additionalSpent)}`
        : `✅ *Budget Overrun:* ₹0 (Within Budget)`;

    const capitalText =
      owner.companyCapitalInvested > 0
        ? `💼 *Company Capital Funded:* ${formatCurrency(owner.companyCapitalInvested)}`
        : `💼 *Company Capital Funded:* ₹0 (Client Payments Sufficient)`;

    const pendingTasksList = (owner.tasks?.pendingList || [])
      .slice(0, 4)
      .map((t: any) => `  • ${t.title} (${t.status}, Due: ${formatDate(t.dueDate)})`)
      .join('\n');

    const topVendorsList = (owner.vendorPayables || [])
      .filter((v: any) => v.balanceDue > 0)
      .slice(0, 3)
      .map((v: any) => `  • ${v.supplierName}: ${formatCurrency(v.balanceDue)}`)
      .join('\n');

    return (
      `🏗️ *DAILY PROJECT STATUS REPORT (FOR OWNER)*\n` +
      `-------------------------------------------\n` +
      `*Project:* ${project.name} [${project.code}]\n` +
      `*Client:* ${project.clientName}\n` +
      `*Date:* ${todayStr}\n` +
      `*Status / Progress:* ${project.status} (${project.completionPercent}% Completed)\n\n` +
      `📊 *FINANCIAL OVERVIEW*\n` +
      `• *Contract Value:* ${formatCurrency(owner.contractValue)}\n` +
      `• *Approved Budget:* ${formatCurrency(owner.approvedBudget)}\n` +
      `• *Spent So Far:* ${formatCurrency(owner.spentSoFar)}\n` +
      `${overrunText}\n` +
      `${capitalText}\n` +
      `• *Client Outstanding Receivable:* ${formatCurrency(owner.outstandingReceivable)}\n` +
      `• *Outstanding to Vendors:* ${formatCurrency(owner.vendorOutstanding)}\n\n` +
      `📋 *EXECUTION & TASKS (${owner.tasks?.completedCount || 0} Done / ${owner.tasks?.pendingCount || 0} Pending)*\n` +
      (pendingTasksList ? `*Key In-Progress Tasks:*\n${pendingTasksList}\n\n` : `All tasks completed!\n\n`) +
      (topVendorsList ? `🚚 *PENDING VENDOR PAYMENTS:*\n${topVendorsList}\n\n` : '') +
      `_Generated via ApexBuild Construction ERP System_`
    );
  };

  // Generate WhatsApp Message for Client
  const generateClientWhatsAppMessage = () => {
    if (!project || !client) return '';
    const todayStr = formatDate(new Date());
    const clientGreeting = client.clientName ? `Dear ${client.clientName},` : 'Dear Valued Client,';
    const dueDateStr = formatDate(client.dueDate);

    const completedMilestones = (client.completedMilestones || [])
      .slice(0, 3)
      .map((m: string) => `  ✓ ${m}`)
      .join('\n');

    const inProgressTasks = (client.inProgressTasks || [])
      .slice(0, 3)
      .map((t: any) => `  • ${t.title || t}`)
      .join('\n');

    return (
      `${clientGreeting}\n\n` +
      `Greetings from *ApexBuild Construction*! Here is the latest progress and billing update for your project:\n\n` +
      `🏗️ *Project:* ${project.name}\n` +
      `📅 *Date:* ${todayStr}\n\n` +
      `📈 *WORKING PROGRESS: ${client.workingProgress}% COMPLETED*\n` +
      (completedMilestones ? `*Recent Milestones Accomplished:*\n${completedMilestones}\n\n` : '') +
      (inProgressTasks ? `*Current Site Activities In-Progress:*\n${inProgressTasks}\n\n` : '') +
      `💳 *PAYMENT & BILLING SUMMARY*\n` +
      `• *Total Contract Amount:* ${formatCurrency(client.totalPayment)}\n` +
      `• *Total Payment Collected:* ${formatCurrency(client.collectedPayment)}\n` +
      `• *Current Balance Due:* ${formatCurrency(client.balanceDue)}\n` +
      `• *Payment Due Date:* ${dueDateStr}\n\n` +
      `Please let us know if you need any additional reports or photographs from the site.\n\n` +
      `Warm regards,\n` +
      `*Project Management Team*\n` +
      `ApexBuild Construction Ltd.`
    );
  };

  const handleShareWhatsApp = () => {
    const message = activeTab === 'owner' ? generateOwnerWhatsAppMessage() : generateClientWhatsAppMessage();
    const phone = cleanPhone(customPhone);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyMessage = () => {
    const message = activeTab === 'owner' ? generateOwnerWhatsAppMessage() : generateClientWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Printable PDF Generator
  const handleDownloadPDF = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to download the PDF report.');
      return;
    }

    const todayStr = formatDate(new Date());
    const isOwnerTab = activeTab === 'owner';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${isOwnerTab ? 'Executive Daily Report' : 'Client Progress Report'} - ${project.name}</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .logo-area h1 { font-size: 22px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .logo-area p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
          .report-tag { text-align: right; }
          .report-tag .badge { background: #0f172a; color: #fff; padding: 4px 10px; font-size: 10px; font-weight: bold; border-radius: 4px; display: inline-block; }
          .report-tag p { margin: 4px 0 0; font-size: 11px; color: #64748b; }
          
          .project-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; font-size: 12px; }
          .project-box strong { color: #0f172a; display: block; font-size: 13px; }
          
          .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 20px 0 10px; }
          
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
          .kpi-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
          .kpi-card .val { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 2px; }
          .kpi-card .sub { font-size: 10px; color: #475569; margin-top: 2px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th { background: #0f172a; color: #fff; text-align: left; padding: 7px 10px; font-weight: 600; }
          td { border-bottom: 1px solid #e2e8f0; padding: 7px 10px; color: #334155; }
          tr:nth-child(even) td { background: #f8fafc; }
          
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 40px; }
          .sig-line { border-top: 1px dashed #94a3b8; padding-top: 5px; text-align: center; font-size: 11px; color: #475569; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <h1>ApexBuild ERP</h1>
            <p>CONSTRUCTION MANAGEMENT & FINANCIAL CONTROLS</p>
          </div>
          <div class="report-tag">
            <span class="badge">${isOwnerTab ? 'EXECUTIVE DAILY REPORT' : 'CLIENT PROGRESS STATEMENT'}</span>
            <p>Generated on: <strong>${todayStr}</strong></p>
          </div>
        </div>

        <div class="project-box">
          <div>
            <span style="font-size:10px; color:#64748b;">PROJECT</span>
            <strong>${project.name} (${project.code})</strong>
            <span style="color:#64748b; font-size:11px;">Site: ${project.siteAddress || 'Main Site'}</span>
          </div>
          <div>
            <span style="font-size:10px; color:#64748b;">CLIENT</span>
            <strong>${project.clientName}</strong>
            <span style="color:#64748b; font-size:11px;">${project.clientContact || 'N/A'}</span>
          </div>
          <div>
            <span style="font-size:10px; color:#64748b;">PROGRESS & STATUS</span>
            <strong style="color:#0284c7;">${project.completionPercent}% Completed</strong>
            <span style="color:#64748b; font-size:11px;">Status: ${project.status}</span>
          </div>
        </div>

        ${
          isOwnerTab
            ? `
          <div class="section-title">1. Financial Performance & Capital Metrics</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="label">Contract Value</div>
              <div class="val">${formatCurrency(owner.contractValue)}</div>
              <div class="sub">Budget: ${formatCurrency(owner.approvedBudget)}</div>
            </div>
            <div class="kpi-card">
              <div class="label">Spent So Far (Actual Cost)</div>
              <div class="val" style="color:#b45309;">${formatCurrency(owner.spentSoFar)}</div>
              <div class="sub">Materials, Labour, Plant & Expenses</div>
            </div>
            <div class="kpi-card">
              <div class="label">Additional Spent (Overrun)</div>
              <div class="val" style="color:${owner.additionalSpent > 0 ? '#b91c1c' : '#15803d'};">
                ${owner.additionalSpent > 0 ? formatCurrency(owner.additionalSpent) : '₹0 (Within Budget)'}
              </div>
              <div class="sub">Company Capital: ${formatCurrency(owner.companyCapitalInvested)}</div>
            </div>
            <div class="kpi-card">
              <div class="label">Client Outstanding (Receivables)</div>
              <div class="val" style="color:#0369a1;">${formatCurrency(owner.outstandingReceivable)}</div>
              <div class="sub">Collected: ${formatCurrency(owner.totalReceived)}</div>
            </div>
            <div class="kpi-card">
              <div class="label">Vendor Outstanding (Payables)</div>
              <div class="val" style="color:#dc2626;">${formatCurrency(owner.vendorOutstanding)}</div>
              <div class="sub">Across all project suppliers</div>
            </div>
            <div class="kpi-card">
              <div class="label">Task Completion Rate</div>
              <div class="val">${owner.tasks?.completedCount || 0} / ${owner.tasks?.total || 0}</div>
              <div class="sub">${owner.tasks?.pendingCount || 0} tasks currently pending</div>
            </div>
          </div>

          <div class="section-title">2. Outstanding Vendor Payables Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Vendor / Supplier</th>
                <th>Contact Phone</th>
                <th style="text-align:right;">Order Total</th>
                <th style="text-align:right;">Paid So Far</th>
                <th style="text-align:right;">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              ${
                (owner.vendorPayables || []).length === 0
                  ? '<tr><td colspan="5" style="text-align:center;">No pending vendor accounts for this project.</td></tr>'
                  : (owner.vendorPayables || [])
                      .map(
                        (v: any) => `
                    <tr>
                      <td><strong>${v.supplierName}</strong></td>
                      <td>${v.phone || '—'}</td>
                      <td style="text-align:right;">${formatCurrency(v.totalOrdersAmount)}</td>
                      <td style="text-align:right;">${formatCurrency(v.paidAmount)}</td>
                      <td style="text-align:right; font-weight:bold; color:#dc2626;">${formatCurrency(v.balanceDue)}</td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>

          <div class="section-title">3. Pending Execution Tasks</div>
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Assigned Supervisor</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                (owner.tasks?.pendingList || []).length === 0
                  ? '<tr><td colspan="5" style="text-align:center;">All scheduled tasks are completed.</td></tr>'
                  : (owner.tasks?.pendingList || [])
                      .slice(0, 10)
                      .map(
                        (t: any) => `
                    <tr>
                      <td><strong>${t.title}</strong></td>
                      <td>${t.assignedUser || 'Unassigned'}</td>
                      <td>${t.priority}</td>
                      <td>${formatDate(t.dueDate)}</td>
                      <td><span style="font-weight:600;">${t.status}</span></td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        `
            : `
          <div class="section-title">1. Project Completion & Working Progress</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="label">Overall Completion</div>
              <div class="val" style="color:#0284c7;">${client.workingProgress}%</div>
              <div class="sub">Status: ${project.status}</div>
            </div>
            <div class="kpi-card">
              <div class="label">Total Contract Value</div>
              <div class="val">${formatCurrency(client.totalPayment)}</div>
              <div class="sub">Total Invoiced: ${formatCurrency(client.totalBilled)}</div>
            </div>
            <div class="kpi-card">
              <div class="label">Collected Payment</div>
              <div class="val" style="color:#15803d;">${formatCurrency(client.collectedPayment)}</div>
              <div class="sub">Receipts verified</div>
            </div>
            <div class="kpi-card">
              <div class="label">Current Balance Due</div>
              <div class="val" style="color:#ea580c;">${formatCurrency(client.balanceDue)}</div>
              <div class="sub">Due Date: ${formatDate(client.dueDate)}</div>
            </div>
            <div class="kpi-card">
              <div class="label">Next Milestone Date</div>
              <div class="val">${formatDate(project.plannedEndDate)}</div>
              <div class="sub">Project Target End</div>
            </div>
          </div>

          <div class="section-title">2. In-Progress & Recent Milestones</div>
          <table>
            <thead>
              <tr>
                <th>Scope of Work / Task</th>
                <th>Target Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                (client.inProgressTasks || []).length === 0
                  ? '<tr><td colspan="3" style="text-align:center;">No pending milestones at this stage.</td></tr>'
                  : (client.inProgressTasks || [])
                      .map(
                        (t: any) => `
                    <tr>
                      <td><strong>${t.title}</strong></td>
                      <td>${formatDate(t.dueDate)}</td>
                      <td><span style="color:#0284c7; font-weight:600;">${t.status || 'IN_PROGRESS'}</span></td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        `
        }

        <div class="signatures">
          <div class="sig-line">Prepared By (Site Engineer)</div>
          <div class="sig-line">Reviewed By (Project Manager)</div>
          <div class="sig-line">Authorized Signatory</div>
        </div>

        <div class="footer">
          <span>ApexBuild ERP Daily Report Engine • Document Reference: ${project.code}-${Date.now().toString().slice(-6)}</span>
          <span>Confidential • For intended recipient only</span>
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Share Project Daily Report</span>
                <span className="text-xs bg-slate-800 text-amber-400 border border-slate-700 font-mono px-2 py-0.5 rounded">
                  {project?.code || 'PRJ'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{project?.name || 'Loading project details...'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('owner')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'owner'
                ? 'border-amber-500 text-amber-600 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-500" />
            <span>1. Report to Owner (Executive & Financials)</span>
          </button>

          <button
            onClick={() => setActiveTab('client')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'client'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>2. Report to Client (Progress & Billing)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-slate-600">Compiling financial metrics and task updates...</p>
            </div>
          ) : !reportData ? (
            <div className="p-8 text-center text-slate-500 text-xs">Failed to load report data. Please try again.</div>
          ) : activeTab === 'owner' ? (
            /* ============================================================== */
            /* TAB 1: OWNER DAILY REPORT CONTENT                              */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Top Banner Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3">
                <Briefcase className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="block font-bold">Owner Executive Briefing</strong>
                  This comprehensive daily digest includes Contract Value, Approved Budget, Spent So Far, Overrun / Additional Company Capital, Client Receivables, and Vendor Dues.
                </div>
              </div>

              {/* 6 Key Financial Indicator Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. Contract Value */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Contract Value</span>
                  <div className="text-base font-extrabold text-slate-900 mt-1 font-mono">
                    {formatCurrency(owner?.contractValue)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Client contract commitment</span>
                </div>

                {/* 2. Budget */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approved Budget</span>
                  <div className="text-base font-extrabold text-slate-800 mt-1 font-mono">
                    {formatCurrency(owner?.approvedBudget)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Baseline project budget</span>
                </div>

                {/* 3. Spent So Far */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Spent So Far</span>
                  <div className="text-base font-extrabold text-amber-900 mt-1 font-mono">
                    {formatCurrency(owner?.spentSoFar)}
                  </div>
                  <span className="text-[10px] text-amber-700 mt-0.5 block">Total site costs incurred</span>
                </div>

                {/* 4. Additional Spent by Company */}
                <div className={`rounded-xl p-3.5 border ${owner?.additionalSpent > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${owner?.additionalSpent > 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                    Additional Spent (Company)
                  </span>
                  <div className={`text-base font-extrabold mt-1 font-mono ${owner?.additionalSpent > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                    {owner?.additionalSpent > 0 ? formatCurrency(owner.additionalSpent) : '₹0 (In Budget)'}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {owner?.companyCapitalInvested > 0
                      ? `Funded: ${formatCurrency(owner.companyCapitalInvested)}`
                      : 'Covered by client cash flow'}
                  </span>
                </div>

                {/* 5. Client Outstanding */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider block">Client Outstanding</span>
                  <div className="text-base font-extrabold text-blue-900 mt-1 font-mono">
                    {formatCurrency(owner?.outstandingReceivable)}
                  </div>
                  <span className="text-[10px] text-blue-700 mt-0.5 block">
                    Collected: {formatCurrency(owner?.totalReceived)}
                  </span>
                </div>

                {/* 6. Vendor Outstanding */}
                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-purple-800 font-bold uppercase tracking-wider block">Vendor Outstanding</span>
                  <div className="text-base font-extrabold text-purple-900 mt-1 font-mono">
                    {formatCurrency(owner?.vendorOutstanding)}
                  </div>
                  <span className="text-[10px] text-purple-700 mt-0.5 block">Pending vendor bills & POs</span>
                </div>
              </div>

              {/* Tasks Progress Bar & Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Task Execution ({owner?.tasks?.completedCount || 0} Completed / {owner?.tasks?.pendingCount || 0} Pending)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTasksDetails(!showTasksDetails)}
                    className="text-xs text-amber-600 hover:text-amber-800 font-semibold flex items-center space-x-1"
                  >
                    <span>{showTasksDetails ? 'Hide Tasks' : 'View Task List'}</span>
                    {showTasksDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${project?.completionPercent || 0}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Overall Project Progress: <strong className="text-slate-800">{project?.completionPercent}%</strong></span>
                  <span>Total Scheduled Tasks: {owner?.tasks?.total || 0}</span>
                </div>

                {/* Expandable Task Breakdown */}
                {showTasksDetails && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <strong className="text-slate-700 block mb-1.5 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed Tasks ({owner?.tasks?.completedCount || 0})</span>
                        </strong>
                        <ul className="space-y-1 text-slate-600">
                          {(owner?.tasks?.completedList || []).slice(0, 5).map((t: any) => (
                            <li key={t.id} className="flex items-center justify-between text-[11px]">
                              <span className="truncate pr-2">✓ {t.title}</span>
                              <span className="text-emerald-700 font-bold shrink-0">Done</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <strong className="text-slate-700 block mb-1.5 font-bold flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Tasks ({owner?.tasks?.pendingCount || 0})</span>
                        </strong>
                        <ul className="space-y-1 text-slate-600">
                          {(owner?.tasks?.pendingList || []).slice(0, 5).map((t: any) => (
                            <li key={t.id} className="flex items-center justify-between text-[11px]">
                              <span className="truncate pr-2">• {t.title}</span>
                              <span className="text-amber-700 font-semibold shrink-0">{formatDate(t.dueDate)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vendor Payables Accordion */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Vendor Payables Breakdown (Total Due: {formatCurrency(owner?.vendorOutstanding)})
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {owner?.vendorPayables?.length || 0} active suppliers on this project
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowVendorDetails(!showVendorDetails)}
                    className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center space-x-1"
                  >
                    <span>{showVendorDetails ? 'Collapse' : 'Show Vendors'}</span>
                    {showVendorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showVendorDetails && (
                  <div className="mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
                          <th className="pb-1.5">Supplier Name</th>
                          <th className="pb-1.5">Phone</th>
                          <th className="pb-1.5 text-right">Orders Total</th>
                          <th className="pb-1.5 text-right">Paid</th>
                          <th className="pb-1.5 text-right">Outstanding Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {(owner?.vendorPayables || []).map((v: any) => (
                          <tr key={v.supplierId} className="hover:bg-slate-50">
                            <td className="py-2 font-semibold text-slate-800">{v.supplierName}</td>
                            <td className="py-2 text-slate-500">{v.phone || '—'}</td>
                            <td className="py-2 text-right text-slate-600">{formatCurrency(v.totalOrdersAmount)}</td>
                            <td className="py-2 text-right text-emerald-700">{formatCurrency(v.paidAmount)}</td>
                            <td className="py-2 text-right font-bold text-red-600">{formatCurrency(v.balanceDue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* TAB 2: CLIENT DAILY PROGRESS & BILLING REPORT CONTENT          */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Top Banner Notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3">
                <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <strong className="block font-bold">Client Progress & Billing Update</strong>
                  Keep your client confident and informed with this progress breakdown, total contract value, payments collected, outstanding balance, and next invoice due date.
                </div>
              </div>

              {/* Client Info Strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Client Name</span>
                  <strong className="text-slate-900 text-sm">{client?.clientName}</strong>
                  {project?.siteAddress && <p className="text-slate-500 text-[11px] mt-0.5">{project.siteAddress}</p>}
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Client WhatsApp / Phone</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4 Client KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Working Progress */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider block">Work Progress</span>
                  <div className="text-lg font-extrabold text-blue-900 mt-1 font-mono">
                    {client?.workingProgress}%
                  </div>
                  <span className="text-[10px] text-blue-700 mt-0.5 block">Status: {project?.status}</span>
                </div>

                {/* 2. Total Payment */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">Total Payment</span>
                  <div className="text-base font-extrabold text-slate-900 mt-1 font-mono">
                    {formatCurrency(client?.totalPayment)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Contract value</span>
                </div>

                {/* 3. Collected Payment */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Collected Payment</span>
                  <div className="text-base font-extrabold text-emerald-900 mt-1 font-mono">
                    {formatCurrency(client?.collectedPayment)}
                  </div>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">Received to date</span>
                </div>

                {/* 4. Balance with Due Date */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5">
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Balance Due</span>
                  <div className="text-base font-extrabold text-amber-900 mt-1 font-mono">
                    {formatCurrency(client?.balanceDue)}
                  </div>
                  <span className="text-[10px] text-amber-700 mt-0.5 block font-semibold">
                    Due: {formatDate(client?.dueDate)}
                  </span>
                </div>
              </div>

              {/* Progress Summary Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed Milestones</span>
                  </h4>
                  {(client?.completedMilestones || []).length === 0 ? (
                    <p className="text-[11px] text-slate-400">Foundation and initial preparatory works underway.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {(client?.completedMilestones || []).map((m: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Current Work in Progress</span>
                  </h4>
                  {(client?.inProgressTasks || []).length === 0 ? (
                    <p className="text-[11px] text-slate-400">Next milestone schedule being finalized.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {(client?.inProgressTasks || []).map((t: any, idx: number) => (
                        <li key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="truncate pr-2">• {t.title}</span>
                          <span className="text-slate-400 shrink-0">{formatDate(t.dueDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMessage}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1.5 bg-white shadow-sm"
              title="Copy formatted message text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1.5 bg-white shadow-sm"
              title="Download print-ready executive PDF report"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>Download PDF</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
            >
              Close
            </button>

            <button
              onClick={handleShareWhatsApp}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center space-x-2 shadow-md hover:shadow-lg ${
                activeTab === 'owner'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
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
