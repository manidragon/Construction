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
  Truck,
  FolderArchive,
  X,
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

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole } = useAuth();

  const navigation: NavGroup[] = [
    {
      group: 'Core Enterprise',
      items: [
        {
          name: 'Owner Dashboard',
          path: '/',
          icon: LayoutDashboard,
          roles: ['OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Projects & Sites',
          path: '/projects',
          icon: Building2,
          roles: ['OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'HR_MANAGER', 'AUDITOR'],
        },
      ],
    },
    {
      group: 'Site Engineering & Ops',
      items: [
        {
          name: 'BOQ & Estimation',
          path: '/boq',
          icon: Calculator,
          roles: ['OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Tasks & Milestones',
          path: '/tasks',
          icon: CheckSquare,
          roles: ['OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Daily Site Reports (DPR)',
          path: '/dpr',
          icon: ClipboardList,
          roles: ['OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
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
          roles: ['OWNER', 'STOREKEEPER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'AUDITOR'],
        },
        {
          name: 'Procurement & Vendors',
          path: '/procurement',
          icon: ShoppingBag,
          roles: ['OWNER', 'PURCHASE_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER', 'STOREKEEPER', 'AUDITOR'],
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
          roles: ['OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
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
          roles: ['OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Clients & Billing (RA Bills)',
          path: '/billing',
          icon: FileText,
          roles: ['OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER', 'AUDITOR'],
        },
        {
          name: 'Double-Entry Accounting',
          path: '/accounts',
          icon: Landmark,
          roles: ['OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'],
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
          roles: ['OWNER', 'PROJECT_MANAGER', 'STOREKEEPER', 'SITE_ENGINEER', 'AUDITOR'],
        },
        {
          name: 'Document Repository',
          path: '/documents',
          icon: FolderArchive,
          roles: ['OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTS_MANAGER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'HR_MANAGER', 'AUDITOR'],
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

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 text-white">
          <span className="font-extrabold text-base tracking-wide text-white">APEX<span className="text-amber-400">BUILD</span></span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
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

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          <p className="font-medium text-slate-300">Apex Buildtech ERP</p>
          <p className="text-[10px] text-slate-400">Asia/Kolkata (IST) • ₹ INR</p>
        </div>
      </aside>
    </>
  );
};
