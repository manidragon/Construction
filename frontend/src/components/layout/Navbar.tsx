import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  Building2,
  HardHat,
  LogOut,
  Menu,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenAI?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenAI }) => {
  const { user, logout } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'OWNER':
      case 'TENANT_ADMIN':
        return {
          title: 'Managing Director & Owner',
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        };
      case 'PROJECT_MANAGER':
        return {
          title: 'Project Manager (GM/PM)',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        };
      case 'SITE_ENGINEER':
        return {
          title: 'Site Engineer / Supervisor',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'ACCOUNTS_MANAGER':
        return {
          title: 'Accounts Manager / CA',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'PURCHASE_MANAGER':
        return {
          title: 'Purchase Lead / Procurement',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
      case 'STOREKEEPER':
        return {
          title: 'Storekeeper / Inventory Mgr',
          color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        };
      case 'HR_MANAGER':
        return {
          title: 'HR / Workforce Manager',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
      case 'AUDITOR':
        return {
          title: 'Internal Auditor (Read-Only)',
          color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        };
      case 'SUPER_ADMIN':
        return {
          title: 'Super Admin (Platform)',
          color: 'bg-red-500/20 text-red-300 border-red-500/30',
        };
      default:
        return {
          title: 'Staff Member',
          color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const companyName = user?.company?.companyName || user?.company?.name || 'ApexBuild Construction';
  const companyCode = user?.company?.code || '';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 px-3 sm:px-4 py-2 flex items-center justify-between shadow-md">
      {/* Left: Brand & Mobile Toggle */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-sm shadow-amber-500/20 shrink-0">
            <HardHat className="w-5 h-5" />
          </div>
          <div className="hidden xs:block">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wide text-white">APEX<span className="text-amber-400">BUILD</span></span>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                ERP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider hidden md:block">Construction Site Operations & Accounts</p>
          </div>
        </div>
      </div>

      {/* Center: Global Project Switcher */}
      <div className="hidden md:flex items-center space-x-2.5 bg-slate-800/90 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-700/80 hover:border-slate-600 shadow-sm flex-1 max-w-md lg:max-w-xl mx-2 lg:mx-4 transition-colors">
        <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Filter Project:</span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          aria-label="Filter active project"
          className="bg-transparent text-xs text-white font-semibold focus:outline-none w-full cursor-pointer truncate py-0.5"
        >
          <option value="" className="bg-slate-900 text-white font-medium">🌐 All Projects (Enterprise Overview)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-white font-medium">
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Authenticated User Credentials, Role Badge & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* In-App AI Support Assistant Button */}
        {onOpenAI && (
          <button
            onClick={onOpenAI}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition cursor-pointer"
            title="Open AI Support & Guided Workflow Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
            <span className="font-extrabold hidden sm:inline">AI Support Bot</span>
          </button>
        )}

        {/* Tenant Company Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs" title={`Tenant Workspace: ${companyName}`}>
          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate max-w-[130px]">{companyName}</span>
          {companyCode && (
            <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-700 text-amber-300 rounded font-bold">
              {companyCode}
            </span>
          )}
        </div>

        {/* User Credentials & Verified Role Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400 shrink-0 shadow-sm">
            {user?.name?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold leading-tight text-slate-100 max-w-[120px] truncate">{user?.name || 'Authorized User'}</span>
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border tracking-wide ${roleInfo.color}`}>
                <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                {roleInfo.title.split(' ')[0]} {roleInfo.title.split(' ')[1] || ''}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Logout Button */}
        <button
          onClick={logout}
          title="Sign Out from Enterprise ERP"
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700/80 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-semibold transition"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
