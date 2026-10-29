import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  Building2,
  Calculator,
  CheckSquare,
  ClipboardList,
  Boxes,
  ShoppingBag,
  Users,
  Receipt,
  FileText,
  Landmark,
  Building,
  Truck,
  FolderArchive,
  Settings,
  ShieldCheck,
  Crown,
  Trash2,
  X,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const getDashboardLabel = (role?: string) => {
  switch (role) {
    case 'PROJECT_MANAGER':
      return 'PM Execution Dashboard';
    case 'SITE_ENGINEER':
      return 'Site Ops Dashboard';
    case 'ACCOUNTS_MANAGER':
      return 'Finance & Accounts Dashboard';
    case 'PURCHASE_MANAGER':
      return 'Procurement Dashboard';
    case 'STOREKEEPER':
      return 'Stores & Inventory Dashboard';
    case 'HR_MANAGER':
      return 'Workforce & Labour Dashboard';
    case 'AUDITOR':
      return 'Audit & Compliance Dashboard';
    case 'OWNER':
    case 'TENANT_ADMIN':
    default:
      return 'Executive Owner Dashboard';
  }
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole, user } = useAuth();

  const navigation: NavGroup[] = [
    {
      group: 'Core Enterprise',
      items: [
        {
          name: getDashboardLabel(user?.role),
          path: '/',
          icon: LayoutDashboard,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'HR_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Staff & Team Logins',
          path: '/team',
          icon: UserCheck,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'],
          badge: 'ACCESS',
        },
        {
          name: 'Company Settings',
          path: '/company-settings',
          icon: Settings,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'],
          badge: 'BRANDING',
        },
        {
          name: 'Projects & Sites',
          path: '/projects',
          icon: Building2,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'AUDITOR'],
        },
      ],
    },
    {
      group: 'Sales & Client Commercials',
      items: [
        {
          name: 'Leads & Pipeline',
          path: '/leads',
          icon: Users,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'],
          badge: 'PIPELINE',
        },
        {
          name: 'Client Quotations',
          path: '/quotations',
          icon: FileText,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'],
          badge: 'CLIENT',
        },
      ],
    },
    {
      group: 'Site Engineering & Ops',
      items: [
        {
          name: 'Internal BOQ (Company)',
          path: '/boq',
          icon: Calculator,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
          badge: 'INTERNAL',
        },
        {
          name: 'Tasks & Milestones',
          path: '/tasks',
          icon: CheckSquare,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Daily Site Reports (DPR)',
          path: '/dpr',
          icon: ClipboardList,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'AUDITOR'],
        },
      ],
    },
    {
      group: 'Stores & Procurement',
      items: [
        {
          name: 'Materials & Inventory',
          path: '/inventory',
          icon: Boxes,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'STOREKEEPER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'AUDITOR'],
        },
        {
          name: 'Procurement & Vendors',
          path: '/procurement',
          icon: ShoppingBag,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PURCHASE_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER', 'STOREKEEPER', 'AUDITOR'],
        },
      ],
    },
    {
      group: 'Labour & Workforce',
      items: [
        {
          name: 'Labour Muster Roll',
          path: '/labour',
          icon: Users,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Daily Shift Logger',
          path: '/attendance',
          icon: Users,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'],
          badge: 'LIVE',
        },
      ],
    },
    {
      group: 'Finance & Billing',
      items: [
        {
          name: 'Expenses & Petty Cash',
          path: '/expenses',
          icon: Receipt,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Clients & Billing (RA Bills)',
          path: '/billing',
          icon: FileText,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Double-Entry Accounting',
          path: '/accounts',
          icon: Landmark,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Office Expenses & Staff',
          path: '/office',
          icon: Building,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER', 'HR_MANAGER', 'AUDITOR'],
        },
      ],
    },
    {
      group: 'Assets & Records',
      items: [
        {
          name: 'Plant & Equipment',
          path: '/equipment',
          icon: Truck,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'STOREKEEPER', 'SITE_ENGINEER', 'AUDITOR'],
        },
        {
          name: 'Document Repository',
          path: '/documents',
          icon: FolderArchive,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'HR_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Recycle Bin',
          path: '/recycle-bin',
          icon: Trash2,
          roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'HR_MANAGER', 'AUDITOR'],
          badge: 'VAULT',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar container - must be z-50 to sit above the mobile backdrop (z-40) */}
      <aside
        id="sidebar-navigation-menu"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-10 w-64 h-full shrink-0 min-h-0 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out shadow-2xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden shrink-0 flex items-center justify-between p-4 border-b border-slate-800 text-white">
          <span className="font-extrabold text-base tracking-wide text-white">APEX<span className="text-amber-400">BUILD</span></span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list - Independent Scroll Container */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar min-h-0">
          {navigation.map((group, idx) => {
            // Filter items user has permission to see
            const visibleItems = group.items.filter((item) => hasRole(...item.roles));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.group}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center space-x-2.5">
                            <item.icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                              }`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-400/20 text-amber-300">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info - Fixed at bottom */}
        <div className="shrink-0 p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-900/95">
          <div className="flex items-center justify-between">
            <div className="truncate font-medium text-slate-200" title={user?.company?.name || 'Workspace'}>
              {user?.company?.name || 'Nearlook ERP'}
            </div>
            {user?.company?.status === 'TRIAL' ? (
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                TRIAL
              </span>
            ) : user?.company?.status === 'EXPIRED' ? (
              <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                EXPIRED
              </span>
            ) : (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{user?.email || 'Logged in'}</p>
        </div>
      </aside>
    </>
  );
};
