import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { AIChatResponse } from '../types';
import {
  Send,
  X,
  Sparkles,
  Share2,
  CheckCircle2,
  Copy,
  Download,
  Minimize2,
  Maximize2,
  Zap,
  Plus,
  History,
  Trash2,
  Clock,
  UserCheck,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string; // ISO string for safe serialization
  actionTaken?: string;
  data?: any;
  shareableUrls?: {
    whatsapp?: string;
    email?: string;
  };
  googleSheetsCsv?: string;
  suggestedPrompts?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SESSIONS_STORAGE_KEY = 'apexbuild_ai_chat_sessions_v2';
const ACTIVE_SESSION_KEY = 'apexbuild_ai_active_session_id_v2';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-init',
  sender: 'bot',
  text: `👋 **Welcome to ApexBuild AI Construction & Interior ERP Copilot!**\n\nI am your professional operational assistant connected directly to your live company database. You can ask me any industry, conceptual, or data questions, or execute natural language workflow actions:\n\n• 📄 **Client Quotations & Commercials:** Selling rates, GST exclusive/inclusive, payment terms, WhatsApp dispatch\n• 📈 **Leads & Sales Pipeline:** Stage tracking, inquiries, site visits, lead conversion to projects\n• 📐 **Site Engineering & BOQ:** Difference between BOQ & Quotations, Task linkage, Daily Progress Reports (DPR)\n• 👷 **Workforce & Labour Muster:** Worker attendance, overtime, mason/carpenter wages, registration forms\n• 👥 **Office HR & Payroll:** Salary structures, Basic 50%, HRA 20%, PF 12%, ESI 0.75%, LOP deductions (26 days)\n• 💰 **Billing & Treasury:** RA bills, 5% retention money, TDS 194C, bank balance, today's receipts and payments\n• 💬 **WhatsApp Cloud API & Multi-Tenancy:** Automated dispatches, 14-day trials, Super Admin controls`,
  timestamp: new Date().toISOString(),
  suggestedPrompts: [
    'What is the difference between BOQ and quotation?',
    'How to create a Client Quotation?',
    'Show all recent client quotations',
    'Show all active leads in sales pipeline',
    'How many projects are active today?',
    'What is the balance due amount of clients?',
    'Show all office staff salary structure and PF',
    'Who is absent today in greenfield?',
    'How many days left in my trial?',
  ],
};

// -------------------------------------------------------------
// Interactive In-Chat Worker Registration Card
// -------------------------------------------------------------
const WorkerRegistrationFormCard: React.FC<{
  data: any;
  onRegistered: (worker: any) => void;
}> = ({ data, onRegistered }) => {
  const [workerName, setWorkerName] = useState(data?.presetName || '');
  const [workerCode, setWorkerCode] = useState(data?.suggestedCode || 'WRK-017');
  const [trade, setTrade] = useState(data?.trade || 'MASON');
  const [skillLevel, setSkillLevel] = useState(data?.skillLevel || 'SKILLED');
  const [dailyRate, setDailyRate] = useState(String(data?.dailyWageRate || '800'));
  const [otRate, setOtRate] = useState(String(data?.overtimeHourlyRate || '140'));
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(data?.paymentMethod || 'CASH');
  const [projectId, setProjectId] = useState(data?.projectId || '');
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(data?._registered || false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getProjects().then((res) => {
      if (mounted && res.success && res.projects) {
        setProjectsList(res.projects);
        if (!projectId && res.projects.length > 0) {
          setProjectId(res.projects[0].id);
        }
      }
    }).catch((e) => console.warn('Could not load projects for worker card:', e));
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      setErrorMsg('Please enter the worker name.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await api.createWorker({
        workerCode,
        name: workerName.trim(),
        trade,
        skillLevel,
        dailyWageRate: Number(dailyRate) || 800,
        overtimeHourlyRate: Number(otRate) || 140,
        phone: phone.trim() || undefined,
        paymentMethod,
        projectId: projectId || undefined,
      });

      if (res.success && res.worker) {
        setIsDone(true);
        onRegistered(res.worker);
      } else {
        setErrorMsg(res.message || 'Failed to register worker');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Worker registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="mt-2.5 p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs space-y-1">
        <div className="flex items-center space-x-2 font-bold text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Worker Added to Project Track!</span>
        </div>
        <p className="text-[11px] text-emerald-200/90">
          <strong>{workerName}</strong> ({workerCode}) is now assigned to{' '}
          <strong>{data?.projectName || 'Project'}</strong> at ₹{dailyRate}/day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3.5 bg-slate-900/95 border border-amber-500/40 rounded-xl space-y-2.5 text-xs text-slate-200 shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
        <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
          <UserCheck className="w-4 h-4" />
          <span>Enter Worker Details to Save</span>
        </div>
        <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
          {data?.projectName || 'Project Site'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Worker Code</label>
          <input
            type="text"
            required
            value={workerCode}
            onChange={(e) => setWorkerCode(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Worker Full Name *</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Ramesh Kumar"
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Trade / Skill</label>
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            {['MASON', 'CARPENTER', 'BARBENDER', 'ELECTRICIAN', 'PLUMBER', 'PAINTER', 'WELDER', 'HELPER', 'OPERATOR', 'SUPERVISOR'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Skill Level</label>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            {['SKILLED', 'SEMI_SKILLED', 'UNSKILLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Daily Wage (₹/day)</label>
          <input
            type="number"
            required
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">OT Rate (₹/hr)</label>
          <input
            type="number"
            required
            value={otRate}
            onChange={(e) => setOtRate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Phone Number</label>
          <input
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            {['CASH', 'BANK_TRANSFER', 'UPI'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Assigned Project</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-400"
        >
          {projectsList.map((p) => (
            <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
          ))}
        </select>
      </div>

      <div className="pt-1 flex items-center justify-end space-x-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-md shadow-amber-500/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving to Database...' : 'Save & Register Worker'}
        </button>
      </div>
    </form>
  );
};

// -------------------------------------------------------------
// Interactive In-Chat Lead Registration Card
// -------------------------------------------------------------
const LeadRegistrationFormCard: React.FC<{
  data: any;
  onRegistered: (lead: any) => void;
}> = ({ data, onRegistered }) => {
  const [clientName, setClientName] = useState(data?.presetName || '');
  const [contactNumber, setContactNumber] = useState(data?.presetPhone || '');
  const [email, setEmail] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [city, setCity] = useState('');
  const [projectType, setProjectType] = useState('RESIDENTIAL_INTERIOR');
  const [budgetRange, setBudgetRange] = useState('25L_50L');
  const [source, setSource] = useState('REFERRAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [createdLead, setCreatedLead] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !contactNumber.trim() || !siteAddress.trim()) {
      setErrorMsg('Client Name, Contact Number, and Site Address are required.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await api.createLead({
        clientName: clientName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim() || undefined,
        siteAddress: siteAddress.trim(),
        city: city.trim() || undefined,
        projectType,
        budgetRange,
        source,
        stage: 'NEW_LEAD',
      });

      if (res.success && res.lead) {
        setIsDone(true);
        setCreatedLead(res.lead);
        onRegistered(res.lead);
      } else {
        setErrorMsg(res.message || 'Failed to register lead.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone && createdLead) {
    return (
      <div className="mt-2.5 p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs space-y-2 animate-in fade-in duration-200 shadow-md">
        <div className="flex items-center space-x-2 font-bold text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>New Lead Registered in Sales Pipeline!</span>
        </div>
        <p className="text-[11px] text-emerald-100/90 leading-relaxed">
          <strong>{createdLead.clientName}</strong> [<span className="font-mono text-emerald-300 font-bold">{createdLead.leadNumber}</span>] has been recorded under <strong>NEW LEAD</strong> stage.
        </p>
        <div className="pt-2 border-t border-emerald-800/60 flex flex-wrap gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 font-semibold">
            {createdLead.projectType?.replace(/_/g, ' ')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 font-semibold">
            Budget: {createdLead.budgetRange?.replace(/_/g, ' ')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700/60 text-emerald-300">
            📞 {createdLead.contactNumber}
          </span>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3.5 bg-slate-900/95 border border-amber-500/50 rounded-xl space-y-2.5 text-xs text-slate-200 shadow-xl animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
        <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>New Client Lead Registration Form</span>
        </div>
        <span className="font-mono text-[10px] bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-amber-300 font-bold">
          {data?.suggestedLeadNumber || 'LEAD-2026-NEW'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Client Full Name *</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Rohit Verma"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Phone Number *</label>
          <input
            type="text"
            required
            placeholder="+91 98765 43210"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Site Address *</label>
          <input
            type="text"
            required
            placeholder="e.g. Villa 402, Palm Meadows"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">City / Region</label>
          <input
            type="text"
            placeholder="e.g. Bengaluru"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Project Scope</label>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
            <option value="COMMERCIAL_FITOUT">Commercial Fit-Out</option>
            <option value="FULL_VILLA_CONSTRUCTION">Full Villa Construction</option>
            <option value="RENOVATION">Renovation & Remodel</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Budget Bracket</label>
          <select
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="10L_25L">₹10 Lakh - ₹25 Lakh</option>
            <option value="25L_50L">₹25 Lakh - ₹50 Lakh</option>
            <option value="50L_1CR">₹50 Lakh - ₹1 Crore</option>
            <option value="1CR_2.5CR">₹1 Crore - ₹2.5 Crore</option>
            <option value="2.5CR_PLUS">₹2.5 Crore +</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Lead Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="REFERRAL">Client Referral</option>
            <option value="ARCHITECT_REFERRAL">Architect / Designer</option>
            <option value="WEBSITE">Website Form</option>
            <option value="INSTAGRAM">Instagram / Social</option>
            <option value="WALKIN">Site / Office Walk-in</option>
            <option value="GOOGLE_ADS">Google Ads</option>
            <option value="OTHER">Other Channel</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Email (Optional)</label>
          <input
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center space-x-1.5"
        >
          {isSubmitting ? (
            <span>Saving Lead to Database...</span>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save & Register Lead</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// -------------------------------------------------------------
// Rich Markdown & Card Formatter Component
// -------------------------------------------------------------
const renderInlineFormatting = (text: string): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-amber-300">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-300">
          {inner}
        </code>
      );
    }
    return part;
  });
};

const RichMessageContent: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  const flushTable = (keyPrefix: number) => {
    if (tableLines.length === 0) return;
    const headerLine = tableLines[0];
    const dataLines = tableLines.slice(2);
    const headers = headerLine.split('|').map((c) => c.trim()).filter(Boolean);

    elements.push(
      <div key={`table-${keyPrefix}`} className="overflow-x-auto my-2 rounded-xl border border-slate-700/80 shadow-md">
        <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-slate-900 text-amber-300 font-bold border-b border-slate-700/80">
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="px-3 py-2 border-r border-slate-800 last:border-r-0">
                  {renderInlineFormatting(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataLines.map((rowStr, rIdx) => {
              const cells = rowStr.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
              return (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/80'}>
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 border-t border-slate-700/40 border-r border-slate-800/60 last:border-r-0 text-slate-200">
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableLines.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    if (line.trim().startsWith('### ')) {
      elements.push(
        <div key={i} className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mt-3 mb-1.5 pb-1 border-b border-slate-700/60 flex items-center space-x-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{line.replace(/^###\s+/, '')}</span>
        </div>
      );
    } else if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
      elements.push(
        <div key={i} className="flex items-start space-x-2 my-1 text-slate-200 text-[12px] leading-relaxed">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
          <div className="flex-1 min-w-0">{renderInlineFormatting(line.replace(/^[•\-]\s+/, ''))}</div>
        </div>
      );
    } else if (line.trim().startsWith('─') || line.trim().startsWith('---')) {
      elements.push(<hr key={i} className="border-slate-700/60 my-2" />);
    } else if (line.trim()) {
      elements.push(
        <div key={i} className="my-1 text-[12px] text-slate-200 leading-relaxed">
          {renderInlineFormatting(line)}
        </div>
      );
    } else {
      elements.push(<div key={i} className="h-1" />);
    }
  }

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-0.5">{elements}</div>;
};

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      const storedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setSessions(parsed);
          const active = parsed.find((s) => s.id === storedActiveId) || parsed[0];
          setActiveSessionId(active.id);
          setMessages(active.messages);
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading chat sessions from localStorage:', e);
    }

    // Default first session if none exists
    const initialSessionId = `session_${Date.now()}`;
    const initialSession: ChatSession = {
      id: initialSessionId,
      title: 'Welcome & System Overview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [DEFAULT_WELCOME_MESSAGE],
    };

    setSessions([initialSession]);
    setActiveSessionId(initialSessionId);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([initialSession]));
    localStorage.setItem(ACTIVE_SESSION_KEY, initialSessionId);
  }, []);

  // 2. Persist messages whenever they change
  const saveCurrentSessionMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          // If title was default or new chat, update title with first prompt
          let newTitle = s.title;
          if (s.title === 'New Chat' || s.title === 'Welcome & System Overview') {
            const firstUserMsg = newMessages.find((m) => m.sender === 'user');
            if (firstUserMsg) {
              newTitle = firstUserMsg.text.slice(0, 32);
              if (firstUserMsg.text.length > 32) newTitle += '...';
            }
          }
          return {
            ...s,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: newMessages,
          };
        }
        return s;
      });
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized && !showHistory) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, showHistory]);

  // Create a new chat session
  const handleCreateNewChat = () => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'bot',
          text: `✨ **New Chat Session Started**\n\nHow can I help you across your projects, finances, or site operations today?`,
          timestamp: new Date().toISOString(),
          suggestedPrompts: [
            'How many projects are in work today?',
            'What is the balance due amount of the client greenfield',
            'What are all the payments received and paid today',
            'Need to add a worker to the greenfield project',
          ],
        },
      ],
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newId);
    setMessages(newSession.messages);
    setShowHistory(false);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
  };

  // Switch to an existing session
  const handleSelectSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setActiveSessionId(sessionId);
      setMessages(target.messages);
      setShowHistory(false);
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    if (updated.length === 0) {
      handleCreateNewChat();
      return;
    }
    setSessions(updated);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated[0].id);
      setMessages(updated[0].messages);
      localStorage.setItem(ACTIVE_SESSION_KEY, updated[0].id);
    }
  };

  // Send prompt
  const handleSend = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMsg];
    saveCurrentSessionMessages(updatedWithUser);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await api.sendAIPrompt(text);
      if (res.success && res.response) {
        const r: AIChatResponse = res.response;
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: r.message,
          timestamp: new Date().toISOString(),
          actionTaken: r.actionTaken,
          data: r.data,
          shareableUrls: r.shareableUrls,
          googleSheetsCsv: r.googleSheetsCsv,
          suggestedPrompts: r.suggestedPrompts,
        };
        if (r.actionTaken === 'UPDATE_ATTENDANCE' && r.data) {
          window.dispatchEvent(new CustomEvent('muster-attendance-updated', { detail: r.data }));
        }
        saveCurrentSessionMessages([...updatedWithUser, botMsg]);
      } else {
        saveCurrentSessionMessages([
          ...updatedWithUser,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: res.message || '⚠️ Sorry, I could not complete that request. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      saveCurrentSessionMessages([
        ...updatedWithUser,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ An error occurred: ${err.message || 'Server connection failed.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerRegistered = (worker: any) => {
    const botConfirmMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text:
        `👷 **Worker Registered & Added to Muster Roll Successfully!**\n\n` +
        `• **Worker Code:** **${worker.workerCode}**\n` +
        `• **Name:** **${worker.name}**\n` +
        `• **Trade:** **${worker.trade}** (${worker.skillLevel})\n` +
        `• **Daily Wage Rate:** ₹${worker.dailyWageRate}/day (Overtime: ₹${worker.overtimeHourlyRate}/hr)\n` +
        `• **Status:** Active on-site muster roll. You can now view, edit, or track attendance in the Labour page!`,
      timestamp: new Date().toISOString(),
      actionTaken: 'WORKER_REGISTERED',
      suggestedPrompts: [
        'How many projects are in work today?',
        'What are all the payments received and paid today',
      ],
    };
    saveCurrentSessionMessages([...messages, botConfirmMsg]);
  };

  const handleLeadRegistered = (lead: any) => {
    const botConfirmMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text:
        `🎉 **Client Lead Successfully Registered in Sales Pipeline!**\n\n` +
        `• **Lead ID:** [\`${lead.leadNumber}\`]\n` +
        `• **Client Name:** **${lead.clientName}** (📞 ${lead.contactNumber})\n` +
        `• **Site Location:** ${lead.siteAddress} (${lead.city || 'HQ'})\n` +
        `• **Project Scope:** ${lead.projectType?.replace(/_/g, ' ')}\n` +
        `• **Estimated Budget:** ${lead.budgetRange?.replace(/_/g, ' ')}\n` +
        `• **Current Stage:** **NEW LEAD (Inquiry)**\n\n` +
        `💡 *What would you like to do next for this prospect?*`,
      timestamp: new Date().toISOString(),
      actionTaken: 'LEAD_REGISTERED',
      suggestedPrompts: [
        `Draft Client Quotation for ${lead.clientName}`,
        'Show all active leads in sales pipeline',
        'How to create a Client Quotation?',
      ],
    };
    saveCurrentSessionMessages([...messages, botConfirmMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const downloadCsv = (csvData: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ApexBuild_GoogleSheets_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCsv = (csvData: string, id: string) => {
    navigator.clipboard.writeText(csvData);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 border border-slate-700/80 bg-slate-900 text-white shadow-2xl rounded-2xl overflow-hidden ${
        isMinimized
          ? 'bottom-5 right-5 w-[94vw] sm:w-[480px] max-w-full ring-1 ring-amber-500/20'
          : 'bottom-5 right-5 sm:right-6 w-[95vw] sm:w-[580px] max-w-full h-[88vh] sm:h-[700px] flex flex-col'
      }`}
    >
      {/* Header Bar */}
      <div
        onClick={isMinimized ? () => setIsMinimized(false) : undefined}
        className={`bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 shadow-md ${
          isMinimized ? 'cursor-pointer hover:bg-slate-850/60 transition' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-nowrap">
              <h3 className="text-sm font-bold text-white tracking-wide whitespace-nowrap truncate">
                ApexBuild AI Engine
              </h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate whitespace-nowrap">
              Natural language workflow automation
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 text-slate-400 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* New Chat Button */}
          <button
            onClick={handleCreateNewChat}
            title="Start New Chat"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {/* History Drawer Toggle Button */}
          <button
            onClick={() => {
              if (isMinimized) setIsMinimized(false);
              setShowHistory(!showHistory);
            }}
            title="Chat History"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition shrink-0 ${
              showHistory ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold font-mono">({sessions.length})</span>
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            title="Close Chatbot"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* History Drawer Overlay Panel */}
          {showHistory && (
            <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col animate-in fade-in slide-in-from-left-4 duration-150">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Past Chat History</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCreateNewChat}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  const dateStr = new Date(s.updatedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`group p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/50 text-white'
                          : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          {isActive && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                          <h4 className="text-xs font-bold truncate text-white">{s.title}</h4>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span>{s.messages.length} messages</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          title="Delete Chat"
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Chat View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar bg-slate-950/80">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 shadow-md leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-tl-none'
                    }`}
                  >
                    {/* Action Executed Badge */}
                    {m.actionTaken && (
                      <div className="flex items-center space-x-1 mb-2 pb-1.5 border-b border-slate-700/80 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Action: {m.actionTaken.replace(/_/g, ' ')}</span>
                      </div>
                    )}

                    {/* Message Body */}
                    {m.sender === 'user' ? (
                      <div className="text-[12px] font-medium leading-relaxed">{m.text}</div>
                    ) : (
                      <RichMessageContent text={m.text} />
                    )}

                    {/* Interactive Decision Action Prompt: Yes, Later, No */}
                    {m.actionTaken === 'LEAD_ACTION_PROMPT' && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSend('Yes, fill the new lead form')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>Yes, Fill New Lead Form</span>
                        </button>
                        <button
                          onClick={() => handleSend('Later')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs transition"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Later</span>
                        </button>
                        <button
                          onClick={() => handleSend('No')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 font-semibold rounded-xl text-xs transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>No</span>
                        </button>
                      </div>
                    )}

                    {/* Interactive Lead Registration Form Card */}
                    {m.actionTaken === 'ADD_LEAD_FORM' && m.data?.formType === 'ADD_LEAD' && (
                      <LeadRegistrationFormCard
                        data={m.data}
                        onRegistered={handleLeadRegistered}
                      />
                    )}

                    {/* Interactive Worker Registration Form Card */}
                    {m.actionTaken === 'ADD_WORKER_FORM' && m.data?.formType === 'ADD_WORKER' && (
                      <WorkerRegistrationFormCard
                        data={m.data}
                        onRegistered={handleWorkerRegistered}
                      />
                    )}

                    {/* WhatsApp Share Link Button */}
                    {m.shareableUrls?.whatsapp && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex items-center space-x-2">
                        <a
                          href={m.shareableUrls.whatsapp}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share on WhatsApp</span>
                        </a>
                      </div>
                    )}

                    {/* Google Sheets CSV Actions */}
                    {m.googleSheetsCsv && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => downloadCsv(m.googleSheetsCsv!)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download CSV</span>
                          </button>
                          <button
                            onClick={() => copyCsv(m.googleSheetsCsv!, m.id)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isCopied === m.id ? 'Copied!' : 'Copy to Clipboard'}</span>
                          </button>
                        </div>

                        <div className="p-2 bg-black/40 rounded-lg text-[10px] font-mono text-slate-400 max-h-24 overflow-y-auto">
                          <pre className="whitespace-pre">{m.googleSheetsCsv.slice(0, 300)}...</pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggested Follow-up Prompts */}
                  {m.suggestedPrompts && m.suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%]">
                      {m.suggestedPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(p)}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-amber-300/90 hover:text-amber-200 border border-slate-700 transition"
                        >
                          ⚡ {p}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-500 mt-1 px-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center space-x-2 text-slate-400 bg-slate-850/80 p-3 rounded-2xl border border-slate-800 w-fit">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-medium">Querying live project track & database...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Category Bar */}
            <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">Quick Actions:</span>
              {[
                { label: '📐 BOQ Variance', text: 'Show BOQ budget and variance for Bakery' },
                { label: '🔄 Change Orders', text: 'Show scope variations and change orders for Bakery' },
                { label: '📦 Low Stock Alert', text: 'Check inventory and low stock materials' },
                { label: '👥 Staff Attendance', text: 'Show office staff attendance today' },
                { label: '💼 Staff Payroll', text: 'Show staff payroll summary this month' },
                { label: '📋 Site DPR', text: 'Show DPR report for Bakery' },
                { label: '👷 Worker Attendance', text: 'worker present and absent data today for greenfield' },
                { label: '🏗️ Active Projects', text: 'How many projects are in work today?' },
                { label: '🏢 Client Due', text: 'What is the balance due amount of the client greenfield' },
                { label: '📅 Today Paid/Received', text: 'What are all the payments received and paid today' },
                { label: '🏢 Monthly Overheads', text: 'What is the overall office expense this month?' },
                { label: '📊 Sheets Export', text: 'Export ledger to Google Sheet' },
              ].map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.text)}
                  className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-end space-x-2">
              <textarea
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your action prompt (e.g. 'What is the balance due for greenfield', 'Need to add a worker to greenfield', 'Export ledger')..."
                className="flex-1 bg-slate-800/90 text-xs text-slate-100 placeholder-slate-400 rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none custom-scrollbar"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || loading}
                className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition disabled:opacity-40 disabled:hover:bg-amber-500 shadow-md shadow-amber-500/20"
                title="Send Prompt (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbotModal;
