import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
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
  Headphones,
  FileText,
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
      className="mt-3 p-3 sm:p-3.5 bg-slate-900/95 border border-amber-500/40 rounded-xl space-y-2.5 text-xs text-slate-200 shadow-lg min-w-0"
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-2 gap-1">
        <div className="flex items-center space-x-1.5 text-amber-400 font-bold min-w-0">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">Enter Worker Details to Save</span>
        </div>
        <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 truncate shrink-0">
          {data?.projectName || 'Project Site'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
      className="mt-3 p-3 sm:p-3.5 bg-slate-900/95 border border-amber-500/50 rounded-xl space-y-2.5 text-xs text-slate-200 shadow-xl animate-in fade-in duration-150 min-w-0"
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-2 gap-1">
        <div className="flex items-center space-x-1.5 text-amber-400 font-bold min-w-0">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">New Client Lead Registration Form</span>
        </div>
        <span className="font-mono text-[10px] bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-amber-300 font-bold shrink-0 truncate">
          {data?.suggestedLeadNumber || 'LEAD-2026-NEW'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
// Interactive In-Chat Lead Status Update Card
// -------------------------------------------------------------
const LeadStatusUpdateCard: React.FC<{
  data: any;
  onStatusUpdated: (lead: any, newStage: string) => void;
}> = ({ data, onStatusUpdated }) => {
  const lead = data?.lead;
  const [selectedStage, setSelectedStage] = useState(lead?.stage || 'NEW_LEAD');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [updatedStage, setUpdatedStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const STAGE_OPTIONS = [
    { value: 'NEW_LEAD', label: '1. New Lead (Initial Inquiry)' },
    { value: 'SITE_VISIT_SCHEDULED', label: '2. Site Visit Scheduled' },
    { value: 'SITE_MEASUREMENT_COMPLETED', label: '3. Site Measurement Done' },
    { value: 'DESIGN_CONCEPT_DISCUSSION', label: '4. Design / Concept Discussion' },
    { value: 'BOQ_QUOTATION_SHARED', label: '5. BOQ / Quotation Shared' },
    { value: 'NEGOTIATION', label: '6. Client Negotiation' },
    { value: 'LEAD_WON', label: '7. Lead Won (Convert to Project)' },
    { value: 'LEAD_LOST', label: '8. Lead Lost (Closed/Dropped)' },
  ];

  const handleUpdate = async () => {
    if (!lead?.id || isUpdating) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await api.updateLead(lead.id, { stage: selectedStage });
      if (res.success && res.lead) {
        setIsUpdated(true);
        setUpdatedStage(selectedStage);
        onStatusUpdated(res.lead, selectedStage);
      } else {
        setErrorMsg(res.message || 'Failed to update lead status.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating status in background');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isUpdated) {
    const stageObj = STAGE_OPTIONS.find((s) => s.value === updatedStage) || { label: updatedStage };
    return (
      <div className="mt-3 p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs space-y-1.5 animate-in fade-in duration-200 shadow-md">
        <div className="flex items-center space-x-2 font-bold text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Status Changed Successfully!</span>
        </div>
        <p className="text-[11px] text-emerald-100/90 leading-relaxed">
          The lead status for <strong>{lead.clientName}</strong> has been updated to <strong>{stageObj.label}</strong> in the background database.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3.5 bg-slate-900/95 border border-amber-500/50 rounded-xl space-y-3 text-xs text-slate-200 shadow-xl animate-in fade-in duration-150">
      <div className="flex items-center space-x-2 text-amber-400 font-bold border-b border-slate-700/80 pb-2">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm">Do you want to update the status?</span>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <label className="text-[10px] text-slate-400 font-bold block mb-1">
          Select New Status / Stage:
        </label>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          disabled={isUpdating}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} {opt.value === lead?.stage ? '(Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800">
        <span className="text-[10px] text-slate-400 italic">
          Automatically updates in background
        </span>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating || selectedStage === lead?.stage}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition shadow-md shadow-amber-500/20 disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating in Background...' : 'Update Status'}</span>
        </button>
      </div>
    </div>
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

// -------------------------------------------------------------
// Interactive Two-Way Confirmation Preview Card
// -------------------------------------------------------------
const ConfirmationPreviewCard: React.FC<{
  data: any;
  onConfirmed?: (result: any) => void;
  onCancelled?: () => void;
}> = ({ data, onConfirmed, onCancelled }) => {
  const [status, setStatus] = useState<'IDLE' | 'CONFIRMING' | 'COMMITTED' | 'CANCELLED'>('IDLE');
  const [showJson, setShowJson] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (status === 'CONFIRMING' || status === 'COMMITTED' || status === 'CANCELLED') return;
    setStatus('CONFIRMING');
    setErrorMsg(null);
    try {
      const res = await api.confirmAIAction(data?.rawPayload || data);
      if (res.success) {
        setStatus('COMMITTED');
        const resData = res.response || res.data || res;
        setCommitResult(resData);
        // Trigger live UI sync events across active modules
        window.dispatchEvent(new CustomEvent('client-receipt-created', { detail: resData }));
        window.dispatchEvent(new CustomEvent('refresh-billing'));
        window.dispatchEvent(new CustomEvent('po-created', { detail: resData }));
        if (onConfirmed) onConfirmed(res);
      } else {
        setStatus('IDLE');
        setErrorMsg(res.message || 'Failed to post transaction to database.');
      }
    } catch (err: any) {
      setStatus('IDLE');
      setErrorMsg(err.message || 'Network error while confirming transaction.');
    }
  };

  const handleCancel = async () => {
    if (status === 'COMMITTED') return;
    setStatus('CANCELLED');
    try {
      await api.confirmAIAction({ action: 'CANCEL' });
    } catch (e) {
      // Ignored
    }
    if (onCancelled) onCancelled();
  };

  const amount = data?.amount || data?.totalAmount || data?.netInvoiceAmount || 0;
  const projectName = data?.projectName || data?.project?.name || 'Project';
  const projectCode = data?.projectCode || data?.project?.code || '';
  const partyName = data?.clientName || data?.supplierName || data?.partyName || 'Counterparty';

  return (
    <div
      className={`mt-3 p-4 rounded-2xl border shadow-xl transition-all duration-200 text-xs ${
        status === 'COMMITTED'
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
          : status === 'CANCELLED'
          ? 'bg-slate-900/80 border-slate-700/60 text-slate-400 opacity-75'
          : 'bg-slate-900/95 border-amber-500/40 text-slate-200 ring-1 ring-amber-500/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/60 mb-3">
        <div className="flex items-center space-x-2">
          {status === 'COMMITTED' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : status === 'CANCELLED' ? (
            <X className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-bold text-white text-sm">
            {data?.title || 'Two-Way Confirmation Preview'}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
            status === 'COMMITTED'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : status === 'CANCELLED'
              ? 'bg-slate-800 text-slate-400 border border-slate-700'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
          }`}
        >
          {status === 'COMMITTED' ? 'COMMITTED' : status === 'CANCELLED' ? 'CANCELLED' : 'ACTION REQUIRED'}
        </span>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2 bg-rose-950/70 border border-rose-500/40 text-rose-300 rounded-lg text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Transaction Details Grid */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px]">
        <div>
          <span className="text-slate-400 block text-[10px] font-semibold">Project / Site</span>
          <span className="font-bold text-white truncate block">
            {projectName} {projectCode ? `[${projectCode}]` : ''}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] font-semibold">Client / Supplier</span>
          <span className="font-bold text-white truncate block">{partyName}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] font-semibold">Transaction Amount</span>
          <span className="font-bold text-emerald-400 font-mono text-sm block">
            ₹{amount ? Number(amount).toLocaleString('en-IN') : '0'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] font-semibold">Payment Mode / Terms</span>
          <span className="font-bold text-amber-300 block">{data?.paymentMethod || 'BANK_TRANSFER'}</span>
        </div>
        {data?.invoiceNumber && (
          <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Linked RA Bill:</span>
            <span className="font-mono font-bold text-indigo-300">{data.invoiceNumber}</span>
          </div>
        )}
        {data?.materialName && (
          <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Material Item:</span>
            <span className="font-bold text-white">
              {data.quantity} {data.materialUnit} {data.materialName} @ ₹{data.unitPrice}
            </span>
          </div>
        )}
        {data?.currentInvoiceDue !== undefined && data?.currentInvoiceDue !== null && !data?.isAdvance && (
          <div className="col-span-2 flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded">
            <span>Bill Balance: ₹{Number(data.currentInvoiceDue).toLocaleString('en-IN')}</span>
            <span>➔</span>
            <span className="font-bold text-emerald-300">
              Remaining Due: ₹{Number(data.newBalanceDue || 0).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Double-Entry Ledger Impact Preview */}
      {data?.journalPreview && data.journalPreview.length > 0 && (
        <div className="mt-2.5 p-2.5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
            <span>⚖️ Double-Entry Journal Impact</span>
          </div>
          {data.journalPreview.map((jp: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  jp.type === 'DEBIT' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {jp.type}
              </span>
              <span className="text-slate-300 truncate mx-2 flex-1">{jp.account}</span>
              <span className="text-white font-bold">₹{Number(jp.amount).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible JSON Preview */}
      <div className="mt-2 pt-1">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-[10px] text-slate-400 hover:text-amber-300 font-mono transition flex items-center space-x-1"
        >
          <span>{showJson ? '▼ Hide' : '▶ View'} Raw JSON Payload</span>
        </button>
        {showJson && (
          <pre className="mt-1.5 p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-amber-200/90 overflow-x-auto max-h-36 custom-scrollbar">
            {JSON.stringify(data.rawPayload || data, null, 2)}
          </pre>
        )}
      </div>

      {/* Confirmation Actions or Committed Banner */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        {status === 'IDLE' || status === 'CONFIRMING' ? (
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              disabled={status === 'CONFIRMING'}
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={status === 'CONFIRMING'}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-extrabold transition shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {status === 'CONFIRMING' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Post to Database</span>
                </>
              )}
            </button>
          </div>
        ) : status === 'COMMITTED' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-emerald-300 font-bold text-xs bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/40">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Successfully Posted! Ref: {commitResult?.receiptNumber || commitResult?.poNumber || commitResult?.invoiceNumber || commitResult?.receipt?.receiptNumber || 'Committed'}
                </span>
              </div>
            </div>
            {commitResult?.shareableUrls?.whatsapp && (
              <a
                href={commitResult.shareableUrls.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Receipt on WhatsApp</span>
              </a>
            )}
          </div>
        ) : (
          <div className="text-slate-400 text-[11px] italic flex items-center space-x-1">
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Transaction cancelled. No changes were made to the database.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Interactive RA Bill Dependency Warning Card
// -------------------------------------------------------------
const RABillDependencyCard: React.FC<{
  data: any;
  onActionPrompt: (prompt: string) => void;
}> = ({ data, onActionPrompt }) => {
  const projectName = data?.projectName || 'Project';
  const clientName = data?.clientName || 'Client';
  const amount = data?.amount || 0;

  return (
    <div className="mt-3 p-4 rounded-2xl border border-amber-500/50 bg-amber-950/30 text-slate-200 shadow-xl space-y-3 animate-in fade-in duration-150">
      <div className="flex items-center space-x-2 text-amber-400 font-bold border-b border-amber-500/30 pb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm">RA Bill Validation Required</span>
      </div>

      <div className="text-xs text-amber-100/90 leading-relaxed space-y-1.5">
        <p>
          No approved or unpaid Running Account (RA) Bill was found for <strong>{clientName}</strong> on project <strong>{projectName}</strong>.
        </p>
        <p className="text-[11px] text-slate-300">
          Recording an unlinked receipt creates an orphaned payment record that skews billing balances. Please choose how to proceed:
        </p>
      </div>

      <div className="pt-2 flex flex-wrap gap-2 border-t border-amber-500/20">
        <button
          type="button"
          onClick={() => onActionPrompt(`Generate RA Bill for ${projectName}`)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-md shadow-amber-500/20"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>1. Generate RA Bill First</span>
        </button>
        <button
          type="button"
          onClick={() =>
            onActionPrompt(
              `Log ₹${amount ? Number(amount).toLocaleString('en-IN') : ''} as advance payment for ${projectName}`
            )
          }
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>2. Log as Advance Payment</span>
        </button>
      </div>
    </div>
  );
};

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { selectedProjectId, selectedProject } = useProject();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Human Support Escalation State
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalationSubject, setEscalationSubject] = useState('');
  const [escalationDesc, setEscalationDesc] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const handleEscalateToHuman = async (customSubject?: string, customDesc?: string) => {
    try {
      setIsEscalating(true);
      const transcriptText = messages
        .map((m) => `[${m.sender === 'user' ? 'Client' : 'AI Copilot'}]: ${m.text}`)
        .join('\n\n');
      const subject =
        customSubject ||
        escalationSubject.trim() ||
        `Support Request: ${messages.filter((m) => m.sender === 'user').pop()?.text?.slice(0, 40) || 'Feature Inquiry'}`;
      const desc =
        customDesc ||
        escalationDesc.trim() ||
        `Client requested human technical support assistance. Conversation history attached.`;

      const res = await api.createSupportTicket({
        subject,
        description: desc,
        priority: 'HIGH',
        category: 'TECHNICAL',
        escalatedFromChat: true,
        chatTranscript: transcriptText,
      });

      if (res.success && res.ticket) {
        setShowEscalationModal(false);
        setEscalationSubject('');
        setEscalationDesc('');
        const botConfirmMsg: ChatMessage = {
          id: `bot-escalated-${Date.now()}`,
          sender: 'bot',
          text: `🎫 **Ticket Escalated to Human Support Successfully!**\n\n• **Ticket Number:** \`#${res.ticket.ticketNumber}\`\n• **Status:** **OPEN** (Assigned to Platform Super Admin)\n• **Archive Sync:** Your conversation transcript has been synced directly to the Super Admin control center.\n\nOur human technical support team is reviewing your inquiry and will address it promptly.`,
          timestamp: new Date().toISOString(),
          actionTaken: 'TICKET_ESCALATED',
        };
        saveCurrentSessionMessages([...messages, botConfirmMsg]);
      } else {
        alert(res.message || 'Failed to create support ticket');
      }
    } catch (err: any) {
      alert(err.message || 'Error escalating to support ticket.');
    } finally {
      setIsEscalating(false);
    }
  };

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

    // Check if user is requesting human support / escalation
    const lower = text.toLowerCase();
    if (
      text === '__ESCALATE_TO_HUMAN__' ||
      lower.includes('talk to human') ||
      lower.includes('human support') ||
      lower.includes('escalate ticket') ||
      lower.includes('talk to an agent')
    ) {
      const lastMsg = messages.filter((m) => m.sender === 'user').pop();
      setEscalationSubject(`Assistance: ${lastMsg ? lastMsg.text.slice(0, 50) : 'ERP Workflow Guidance'}`);
      setShowEscalationModal(true);
      return;
    }

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
      const context = {
        pathname: location.pathname,
        selectedProjectId: selectedProjectId || selectedProject?.id,
        selectedProjectName: selectedProject?.name,
        selectedClientName: selectedProject?.clientName,
        projectId: selectedProjectId || selectedProject?.id,
        clientName: selectedProject?.clientName,
      };
      const res = await api.sendAIPrompt(text, context);
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
        if (r.actionTaken === 'REVERSAL_COMPLETED' || r.actionTaken === 'RECEIPT_RECORDED') {
          window.dispatchEvent(new CustomEvent('client-receipt-reversed', { detail: r.data }));
          window.dispatchEvent(new CustomEvent('refresh-billing'));
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

  const handleLeadStatusUpdated = (lead: any, newStage: string) => {
    const stageLabels: Record<string, string> = {
      NEW_LEAD: 'New Lead (Initial Inquiry)',
      SITE_VISIT_SCHEDULED: 'Site Visit Scheduled',
      SITE_MEASUREMENT_COMPLETED: 'Site Measurement Done',
      DESIGN_CONCEPT_DISCUSSION: 'Design / Concept Discussion',
      BOQ_QUOTATION_SHARED: 'BOQ / Quotation Shared',
      NEGOTIATION: 'Client Negotiation',
      LEAD_WON: 'Lead Won (Converted to Project)',
      LEAD_LOST: 'Lead Lost (Closed/Dropped)',
    };
    const stageTitle = stageLabels[newStage] || newStage.replace(/_/g, ' ');

    const botConfirmMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text:
        `✅ **Lead Status Changed Successfully!**\n\n` +
        `• **Lead ID:** [\`${lead.leadNumber}\`]\n` +
        `• **Client Name:** **${lead.clientName}**\n` +
        `• **Updated Status:** **${stageTitle}**\n` +
        `• **Database Sync:** The pipeline and live database have been automatically updated in the background.`,
      timestamp: new Date().toISOString(),
      actionTaken: 'LEAD_STATUS_CHANGED',
      suggestedPrompts: [
        'How many lead today',
        'How many lead converted',
        'Show all active leads in sales pipeline',
      ],
    };
    saveCurrentSessionMessages([...messages, botConfirmMsg]);
    window.dispatchEvent(new CustomEvent('lead-status-updated', { detail: { leadId: lead.id, stage: newStage } }));
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
      className={`fixed z-50 transition-all duration-300 border-slate-700/80 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col ${
        isMinimized
          ? 'bottom-3 inset-x-3 sm:inset-x-auto sm:bottom-5 sm:right-6 sm:w-[480px] max-w-full rounded-2xl border ring-1 ring-amber-500/20'
          : 'inset-0 sm:inset-auto sm:bottom-5 sm:right-6 w-full sm:w-[580px] sm:max-w-[calc(100vw-3rem)] h-[100dvh] sm:h-[700px] sm:max-h-[calc(100vh-3rem)] rounded-none sm:rounded-2xl border-0 sm:border'
      }`}
    >
      {/* Header Bar */}
      <div
        onClick={isMinimized ? () => setIsMinimized(false) : undefined}
        className={`bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-800 flex items-center justify-between gap-2 shadow-md shrink-0 ${
          isMinimized ? 'cursor-pointer hover:bg-slate-850/60 transition' : ''
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="sm:hidden absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                ApexBuild AI Engine
              </h3>
              <span className="hidden sm:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0 items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">
              Natural language workflow automation
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1 sm:gap-1.5 text-slate-400 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Talk to Human Support / Escalate Ticket */}
          <button
            onClick={() => {
              const lastUserMsg = messages.filter((m) => m.sender === 'user').pop();
              setEscalationSubject(
                lastUserMsg ? `Assistance Needed: ${lastUserMsg.text.slice(0, 50)}` : 'Guidance / Support Inquiry'
              );
              setShowEscalationModal(true);
            }}
            title="Talk to Human Support / Escalate into Ticket"
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition shrink-0"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Human Support</span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleCreateNewChat}
            title="Start New Chat"
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>

          {/* History Drawer Toggle Button */}
          <button
            onClick={() => {
              if (isMinimized) setIsMinimized(false);
              setShowHistory(!showHistory);
            }}
            title="Chat History"
            className={`flex items-center gap-1 p-1.5 sm:px-2 sm:py-1.5 rounded-lg transition shrink-0 ${
              showHistory ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold font-mono">({sessions.length})</span>
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
            className="hidden sm:flex p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0"
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
              <div className="p-3 sm:p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0 gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider truncate">Past Chat History</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={handleCreateNewChat}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Chat</span>
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

                    {/* Interactive Lead Status Update Card */}
                    {m.actionTaken === 'LEAD_STATUS_UPDATE_CARD' && m.data?.lead && (
                      <LeadStatusUpdateCard
                        data={m.data}
                        onStatusUpdated={handleLeadStatusUpdated}
                      />
                    )}

                    {/* Interactive Worker Registration Form Card */}
                    {m.actionTaken === 'ADD_WORKER_FORM' && m.data?.formType === 'ADD_WORKER' && (
                      <WorkerRegistrationFormCard
                        data={m.data}
                        onRegistered={handleWorkerRegistered}
                      />
                    )}

                    {/* Interactive Two-Way Confirmation Preview Card */}
                    {m.actionTaken === 'CONFIRMATION_PREVIEW' && m.data && (
                      <ConfirmationPreviewCard
                        data={m.data}
                        onConfirmed={() => {
                          window.dispatchEvent(new CustomEvent('refresh-billing'));
                        }}
                      />
                    )}

                    {/* Interactive RA Bill Dependency Validation Warning Card */}
                    {m.actionTaken === 'RA_BILL_DEPENDENCY_REQUIRED' && m.data && (
                      <RABillDependencyCard
                        data={m.data}
                        onActionPrompt={(prompt) => handleSend(prompt)}
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
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                      {m.suggestedPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(p)}
                          className="text-[10px] sm:text-xs font-medium px-2.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-amber-300/90 hover:text-amber-200 border border-slate-700 transition text-left break-words max-w-full"
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
                <div className="flex items-center space-x-2 text-slate-400 bg-slate-850/80 p-3 rounded-2xl border border-slate-800 w-fit max-w-[90%]">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="text-xs font-medium truncate">Querying live project track & database...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Category Bar */}
            <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar shrink-0">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">Quick Actions:</span>
              {[
                { label: '🎧 Talk to Human Support', text: '__ESCALATE_TO_HUMAN__' },
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
                  className={`text-[10px] whitespace-nowrap px-2.5 py-1 rounded-lg border transition shrink-0 ${
                    qp.text === '__ESCALATE_TO_HUMAN__'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-end gap-2 shrink-0">
              <textarea
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your action prompt (e.g. 'What is the balance due for greenfield', 'Need to add a worker', 'Export ledger')..."
                className="flex-1 min-w-0 bg-slate-800/90 text-xs text-slate-100 placeholder-slate-400 rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none custom-scrollbar"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || loading}
                className="p-2.5 sm:p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition disabled:opacity-40 disabled:hover:bg-amber-500 shadow-md shadow-amber-500/20 shrink-0"
                title="Send Prompt (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Human Support Escalation Modal Dialog */}
      {showEscalationModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Headphones className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Escalate to Platform Human Support</h3>
              </div>
              <button
                onClick={() => setShowEscalationModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If the AI copilot could not resolve your query or you need personalized help, submit this ticket.
              The Super Admin team will receive your inquiry along with the full chat transcript.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Issue Subject / Topic *</label>
                <input
                  type="text"
                  value={escalationSubject}
                  onChange={(e) => setEscalationSubject(e.target.value)}
                  placeholder="e.g. Quotation tax computation question"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Additional Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={escalationDesc}
                  onChange={(e) => setEscalationDesc(e.target.value)}
                  placeholder="Describe any specifics or requested steps..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Full chat history ({messages.length} messages) will be automatically attached.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEscalationModal(false)}
                className="px-3.5 py-1.5 border border-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleEscalateToHuman()}
                disabled={isEscalating}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                {isEscalating ? 'Submitting Ticket...' : 'Confirm Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbotModal;
