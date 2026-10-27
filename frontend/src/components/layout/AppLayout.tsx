import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AIChatbotModal } from '../AIChatbotModal';
import { TrialBanner } from '../TrialBanner';
import { TrialExpiredModal } from '../TrialExpiredModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Sparkles } from 'lucide-react';
import { Company } from '../../types';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [companyStatus, setCompanyStatus] = useState<Company | undefined>(undefined);

  const { user, logout } = useAuth();
  const location = useLocation();

  // Reset scroll to top on every route change so the next page always starts from the top
  useEffect(() => {
    const reset = () => {
      const mainContainer = document.getElementById('main-scroll-container');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };
    reset();
    const t = setTimeout(reset, 50);
    return () => clearTimeout(t);
  }, [location.pathname, location.key, location.search]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getTenantCurrentStatus();
        if (res.success && res.company) {
          setCompanyStatus(res.company);
          if (res.company.isTrialExpired) {
            setTrialModalOpen(true);
          }
        }
      } catch (err) {
        // Ignored if network or not logged in
      }
    };

    if (user && user.role !== 'SUPER_ADMIN') {
      fetchStatus();
    }
  }, [user]);

  const activeCompany = companyStatus || user?.company;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-800 relative">
      {/* 14-Day Free Trial Alert Strip */}
      <div className="shrink-0 z-30">
        <TrialBanner
          company={activeCompany}
          onUpgradeClick={() => setTrialModalOpen(true)}
        />
      </div>

      {/* Top Navigation Bar */}
      <div className="shrink-0 z-20">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenAI={() => setAiModalOpen(true)}
        />
      </div>

      {/* Decoupled Independent Scroll Modules */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          id="main-scroll-container"
          className="flex-1 h-full overflow-y-auto min-h-0 min-w-0 p-4 sm:p-6 lg:p-8 pb-32 sm:pb-36 lg:pb-44 bg-slate-100/70"
          tabIndex={0}
        >
          <Outlet />
          {/* Bottom clearance spacer to ensure bottom action buttons scroll completely clear of the floating AI bot button */}
          <div className="h-16 w-full pointer-events-none shrink-0" aria-hidden="true" />
        </main>
      </div>

      {/* Trial Expired Upgrade Dialog */}
      <TrialExpiredModal
        isOpen={trialModalOpen}
        onClose={() => setTrialModalOpen(false)}
        company={activeCompany}
        onLogout={logout}
      />

      {/* Floating Global AI Assistant Trigger - hidden when sidebar is open on mobile */}
      {!aiModalOpen && !sidebarOpen && (
        <button
          onClick={() => setAiModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-slate-950 font-extrabold px-4 py-3 rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center space-x-2.5 transition-all transform hover:scale-105 active:scale-95 border border-amber-200 group cursor-pointer"
          title="Open ApexBuild AI Chatbot & Automation Assistant"
        >
          <div className="w-6 h-6 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black group-hover:rotate-12 transition-transform">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs tracking-wide">ApexBuild AI Bot</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-white" />
        </button>
      )}

      {/* AI Automation Engine Modal / Drawer */}
      <AIChatbotModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </div>
  );
};

