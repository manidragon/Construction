import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Lock,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Trash2,
  Edit,
  RefreshCw,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AssignedProject {
  id: string;
  roleTitle: string;
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  designation?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
    code: string;
  };
  assignedProjects: AssignedProject[];
  _count?: {
    dprPrepared: number;
    purchaseOrdersMade: number;
    expensesEntered: number;
    taskAssignments: number;
  };
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  OWNER: {
    label: 'Business Owner / Admin',
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    desc: 'Full administrative control, commercials & staff management',
  },
  TENANT_ADMIN: {
    label: 'Company Admin',
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    desc: 'Primary business administrator',
  },
  PROJECT_MANAGER: {
    label: 'Project Manager (PM)',
    color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
    desc: 'Full site execution, client tracking, DPRs & project schedules',
  },
  SITE_ENGINEER: {
    label: 'Site Engineer',
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    desc: 'Daily progress reports (DPR), site attendance & task logs',
  },
  ACCOUNTS_MANAGER: {
    label: 'Accounts / Finance Manager',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    desc: 'Client billing, double-entry accounting, petty cash & vendor bills',
  },
  PURCHASE_MANAGER: {
    label: 'Purchase & Procurement Manager',
    color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
    desc: 'Supplier purchase orders, material requisitions & quotations',
  },
  STOREKEEPER: {
    label: 'Storekeeper / Inventory Mgr',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
    desc: 'Warehouse stock balances, goods receipts (GRN) & site issues',
  },
  HR_MANAGER: {
    label: 'HR & Workforce Manager',
    color: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700',
    desc: 'Labour muster roll, office staff payroll & shift attendance',
  },
  AUDITOR: {
    label: 'Auditor (Read-Only)',
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    desc: 'Read-only access for compliance, audit logs & financial inspection',
  },
  STAFF: {
    label: 'General Staff',
    color: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    desc: 'Basic office operational support',
  },
};

export const TeamManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [resetPasswordMember, setResetPasswordMember] = useState<TeamMember | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<TeamMember | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('PROJECT_MANAGER');
  const [formDesignation, setFormDesignation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAssignedProjects, setFormAssignedProjects] = useState<string[]>([]);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [showNewPasswordText, setShowNewPasswordText] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Feedback alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await api.getTeamMembers();
      if (res.success) {
        setTeam(res.team || []);
      }
    } catch (err: any) {
      console.error('Failed to load team members:', err);
      showAlert('error', err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.getProjects();
      if (res.success) {
        setProjects(
          (res.projects || []).map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.name,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load project options:', err);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchProjects();
  }, []);

  const openCreateModal = () => {
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('PROJECT_MANAGER');
    setFormDesignation('Senior Project Manager');
    setFormPhone('');
    setFormAssignedProjects([]);
    setShowAddModal(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPassword('');
    setFormRole(member.role);
    setFormDesignation(member.designation || '');
    setFormPhone(member.phone || '');
    setFormAssignedProjects(member.assignedProjects.map((p) => p.project.id));
    setShowAddModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      showAlert('error', 'Staff name and work email are required.');
      return;
    }

    if (!editingMember && (!formPassword || formPassword.length < 6)) {
      showAlert('error', 'Initial password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingMember) {
        // Update existing member
        const payload: any = {
          name: formName,
          role: formRole,
          designation: formDesignation,
          phone: formPhone,
          assignedProjectIds: formAssignedProjects,
        };
        const res = await api.updateTeamMember(editingMember.id, payload);
        if (res.success) {
          showAlert('success', res.message || 'Staff profile updated successfully.');
          setShowAddModal(false);
          fetchTeam();
        }
      } else {
        // Create new member
        const payload: any = {
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          designation: formDesignation,
          phone: formPhone,
          assignedProjectIds: formAssignedProjects,
        };
        const res = await api.createTeamMember(payload);
        if (res.success) {
          showAlert('success', res.message || 'Staff login created successfully.');
          setShowAddModal(false);
          fetchTeam();
        }
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    try {
      const res = await api.toggleTeamMemberStatus(member.id);
      if (res.success) {
        showAlert('success', res.message);
        fetchTeam();
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to toggle status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordMember || !newPassword || newPassword.length < 6) {
      showAlert('error', 'New password must be at least 6 characters long.');
      return;
    }

    try {
      setResettingPassword(true);
      const res = await api.resetTeamMemberPassword(resetPasswordMember.id, { newPassword });
      if (res.success) {
        showAlert('success', res.message);
        setResetPasswordMember(null);
        setNewPassword('');
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteConfirmMember) return;
    try {
      const res = await api.deleteTeamMember(deleteConfirmMember.id);
      if (res.success) {
        showAlert('success', res.message);
        setDeleteConfirmMember(null);
        fetchTeam();
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to delete staff member.');
    }
  };

  const filteredTeam = team.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.designation && m.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.phone && m.phone.includes(searchTerm));

    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && m.isActive) ||
      (statusFilter === 'SUSPENDED' && !m.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalMembers = team.length;
  const activeMembers = team.filter((m) => m.isActive).length;
  const pmAndEngineers = team.filter(
    (m) => m.role === 'PROJECT_MANAGER' || m.role === 'SITE_ENGINEER'
  ).length;
  const accountsAndFinance = team.filter(
    (m) => m.role === 'ACCOUNTS_MANAGER' || m.role === 'PURCHASE_MANAGER'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Staff & Team Credentials
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, monitor, and assign secure login credentials for your Project Managers, Site
            Engineers, HR, and Accounts Managers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTeam}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Login
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {alert && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between border ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Team Staff
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalMembers}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Logins
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {activeMembers}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                PM & Site Engineers
              </p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {pmAndEngineers}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Accounts & Purchase
              </p>
              <h3 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                {accountsAndFinance}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, designation, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="SITE_ENGINEER">Site Engineer</option>
            <option value="ACCOUNTS_MANAGER">Accounts Manager</option>
            <option value="PURCHASE_MANAGER">Purchase Manager</option>
            <option value="STOREKEEPER">Storekeeper</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="AUDITOR">Auditor</option>
            <option value="OWNER">Owner / Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p>Loading company staff credentials...</p>
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-medium text-slate-700 dark:text-slate-300">No staff members found.</p>
            <p className="text-sm mt-1">Add your team members to grant them project login access.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Assigned Projects</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeam.map((member) => {
                  const roleMeta = ROLE_CONFIG[member.role] || ROLE_CONFIG.STAFF;
                  const isCurrent = currentUser?.id === member.id;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {member.name}
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </span>
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {member.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${roleMeta.color}`}
                        >
                          {roleMeta.label}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {member.designation || '—'}
                      </td>

                      {/* Assigned Projects */}
                      <td className="py-3.5 px-4">
                        {member.assignedProjects.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">All / Unrestricted</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {member.assignedProjects.slice(0, 2).map((p) => (
                              <span
                                key={p.id}
                                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                              >
                                {p.project.code}
                              </span>
                            ))}
                            {member.assignedProjects.length > 2 && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                +{member.assignedProjects.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => !isCurrent && handleToggleStatus(member)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            member.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          } ${isCurrent ? 'cursor-default' : 'hover:opacity-80 cursor-pointer'}`}
                          title={isCurrent ? 'Cannot deactivate self' : 'Click to toggle status'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {member.isActive ? 'Active' : 'Suspended'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Edit Details & Role"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordMember(member);
                              setNewPassword('');
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Reset Staff Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => setDeleteConfirmMember(member)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              title="Delete / Revoke Access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {editingMember ? 'Edit Staff Credentials' : 'Create Staff Login'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingMember)}
                  placeholder="e.g. ramesh.pm@myconstruction.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    editingMember ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
                {editingMember && (
                  <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed after creation.</p>
                )}
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role & Permissions *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PROJECT_MANAGER">Project Manager (PM)</option>
                    <option value="SITE_ENGINEER">Site Engineer</option>
                    <option value="ACCOUNTS_MANAGER">Accounts / Finance Manager</option>
                    <option value="PURCHASE_MANAGER">Purchase Manager</option>
                    <option value="STOREKEEPER">Storekeeper</option>
                    <option value="HR_MANAGER">HR & Labour Manager</option>
                    <option value="AUDITOR">Auditor (Read-Only)</option>
                    <option value="STAFF">General Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title / Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Civil Engineer"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98450 12345"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Project Assignments */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Project Access
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Select which projects this staff member is assigned to. Leave empty to allow general company access.
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  {projects.map((p) => {
                    const isChecked = formAssignedProjects.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAssignedProjects([...formAssignedProjects, p.id]);
                            } else {
                              setFormAssignedProjects(
                                formAssignedProjects.filter((id) => id !== p.id)
                              );
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {p.code}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                  {projects.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No projects found to assign.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingMember ? 'Update Staff Member' : 'Create Staff Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Reset Password
              </h3>
              <button
                onClick={() => setResetPasswordMember(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set a new password for{' '}
                <strong className="text-slate-900 dark:text-white">
                  {resetPasswordMember.name}
                </strong>{' '}
                ({resetPasswordMember.email}). They can use this password to log in immediately.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPasswordText ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordText(!showNewPasswordText)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordMember(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {resettingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Revoke Confirmation Modal */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Revoke Staff Access?
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to remove login access for{' '}
              <strong>{deleteConfirmMember.name}</strong> ({deleteConfirmMember.email})?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              ℹ️ If this staff member has logged daily reports (DPRs), purchase orders, or expenses,
              their account will be safely deactivated to preserve your project audit history.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmMember(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

