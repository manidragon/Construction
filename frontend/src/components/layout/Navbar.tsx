import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { UserRole } from '../../types';
import {
  Building2,
  HardHat,
  LogOut,
  ChevronDown,
  UserCheck,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, switchRole, logout } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const rolesList: { role: UserRole; title: string; color: string }[] = [
    { role: 'OWNER', title: '1. Company Owner / Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { role: 'PROJECT_MANAGER', title: '2. Project Manager (GM/PM)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { role: 'SITE_ENGINEER', title: '3. Site Engineer / Supervisor', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { role: 'ACCOUNTS_MANAGER', title: '4. Accounts Manager / CA', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { role: 'PURCHASE_MANAGER', title: '5. Purchase / Procurement Lead', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    { role: 'STOREKEEPER', title: '6. Storekeeper / Inventory Mgr', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { role: 'HR_MANAGER', title: '7. HR / Labour Welfare Mgr', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { role: 'AUDITOR', title: '8. Read-only Internal Auditor', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  ];

  const currentRoleInfo = rolesList.find((r) => r.role === user?.role) || rolesList[0];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between shadow-md">
      {/* Left: Brand & Mobile Toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md hover:bg-slate-800 text-slate-300 transition"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-sm shadow-amber-500/20">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wide text-white">APEX<span className="text-amber-400">BUILD</span></span>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                ERP v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider hidden sm:block">Construction Site Operations & Accounts</p>
          </div>
        </div>
      </div>

      {/* Center: Global Project Switcher */}
      <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 max-w-md w-full mx-4">
        <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Project:</span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          aria-label="Filter active project"
          className="bg-transparent text-xs text-white font-medium focus:outline-none w-full cursor-pointer truncate"
        >
          <option value="" className="bg-slate-800 text-white">🌐 All Projects (Enterprise Overview)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-800 text-white">
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Demo Role Switcher & User Profile */}
      <div className="flex items-center space-x-3">
        {/* One-Click Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium shadow-sm transition hover:opacity-95 ${currentRoleInfo.color}`}
            title="Click to switch between any of the 8 enterprise roles"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="font-semibold hidden sm:inline">{user?.role}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>Switch Role (Instant Preview)</span>
                <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded">Demo Tool</span>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {rolesList.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition ${
                      user?.role === r.role ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{r.title}</span>
                    {user?.role === r.role && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
            {user?.name.charAt(0) || 'U'}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight text-slate-200">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.designation || user?.role}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
