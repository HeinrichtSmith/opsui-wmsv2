/**
 * Header component - Theme-aware (light/dark mode)
 *
 * Application header with user info, navigation links, and logout button
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { useLogout, useSetActiveRole, useMyRoles } from '@/services/api';
import { Button } from './Button';
import {
  ArrowRightOnRectangleIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  ShieldCheckIcon,
  CogIcon,
  ServerIcon,
  ChevronDownIcon,
  InboxIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { UserRole } from '@opsui/shared';
import { useState, useRef, useEffect } from 'react';

// ============================================================================
// MOBILE MENU COMPONENT
// ============================================================================

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navGroups: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    items: Array<{
      key: string;
      label: string;
      path: string;
      icon: React.ComponentType<{ className?: string }>;
    }>;
  }>;
  userName: string;
  userEmail: string;
  userRole: string;
  getEffectiveRole: () => string | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  isAdmin: boolean;
  hasRoleSwitcher: boolean;
  allRoleViews: Array<{
    key: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    role: any;
  }>;
  onRoleSwitch: (role: any, path: string) => void;
}

function MobileMenu({
  isOpen,
  onClose,
  navGroups,
  userName,
  userEmail,
  userRole,
  getEffectiveRole,
  onLogout,
  onNavigate,
  isAdmin,
  hasRoleSwitcher,
  allRoleViews,
  onRoleSwitch,
}: MobileMenuProps) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    // Prevent body scroll when menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleRoleClick = async (role: any, path: string) => {
    onRoleSwitch(role, path);
    setShowRoleSwitcher(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] md:hidden animate-slide-in-from-right">
        <div className="dark:glass-card bg-white h-full flex flex-col shadow-2xl">
          {/* Header */}
          <div className="dark:border-b dark:border-white/[0.08] border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900 truncate">
                {userName}
              </h2>
              <p className="text-sm dark:text-gray-400 text-gray-600 truncate">{userEmail}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 touch-target"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {/* Role Switcher Section for users with multiple roles */}
            {hasRoleSwitcher && (
              <div>
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="w-full flex items-center justify-between px-4 py-3 mb-4 rounded-lg dark:bg-primary-500/10 dark:border-primary-500/20 border border-primary-500/30 touch-target"
                >
                  <div className="flex items-center gap-3">
                    <CogIcon className="h-5 w-5 dark:text-primary-400 text-primary-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold dark:text-white text-gray-900">
                        Switch Role
                      </p>
                      <p className="text-xs dark:text-primary-300 text-primary-700">
                        {getEffectiveRole() || userRole}
                      </p>
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 dark:text-primary-400 text-primary-600 transition-transform duration-300 ${showRoleSwitcher ? 'rotate-180' : ''}`}
                  />
                </button>

                {showRoleSwitcher && (
                  <div className="ml-4 space-y-2 mb-4">
                    {allRoleViews.map(view => {
                      const ViewIcon = view.icon;
                      const isActive = view.role === getEffectiveRole();
                      return (
                        <button
                          key={view.key}
                          onClick={() => handleRoleClick(view.role, view.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all duration-200 touch-target ${
                            isActive
                              ? 'dark:bg-primary-600 bg-primary-600 text-white'
                              : 'dark:bg-white/[0.05] dark:hover:bg-white/[0.08] bg-gray-100 dark:text-gray-700 text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          <ViewIcon className="h-5 w-5 flex-shrink-0" />
                          <span className="font-medium text-sm">{view.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {navGroups.map(group => {
              const GroupIcon = group.icon;
              return (
                <div key={group.key}>
                  <h3 className="flex items-center gap-2 text-xs font-semibold dark:text-gray-500 text-gray-700 uppercase tracking-wider mb-3 px-2">
                    <GroupIcon className="h-4 w-4" />
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleNavigate(item.path)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg dark:text-gray-300 text-gray-800 dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:hover:text-white hover:text-gray-900 transition-all duration-200 touch-target"
                        >
                          <ItemIcon className="h-5 w-5 flex-shrink-0 dark:text-gray-500 text-gray-600" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer - Settings and Logout */}
          <div className="dark:border-t dark:border-white/[0.08] border-t border-gray-200 px-4 py-4 space-y-2">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-sm dark:text-gray-400 text-gray-600">Current Role</span>
              <span className="badge badge-primary text-sm">{getEffectiveRole() || userRole}</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setShowRoleSwitcher(false);
                  handleNavigate('/role-settings?section=role-switcher');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg dark:text-gray-400 text-gray-700 dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:hover:text-white hover:text-gray-900 transition-all duration-200 touch-target"
              >
                <CogIcon className="h-5 w-5" />
                <span className="font-medium text-sm">Role Settings</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg dark:text-error-400 text-error-600 dark:hover:bg-error-500/10 hover:bg-error-50 dark:hover:text-error-300 hover:text-error-700 transition-all duration-200 touch-target"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// DROPDOWN COMPONENT
// ============================================================================

interface NavDropdownProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    key: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  currentPath: string;
}

function NavDropdown({ label, icon: Icon, items, currentPath }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigate = useNavigate();

  const hasActiveItem = items.some(item => item.path === currentPath);

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
          hasActiveItem
            ? 'dark:text-white text-black dark:bg-white/[0.08] bg-gray-100 dark:border-white/[0.12] border-gray-300 shadow-lg dark:shadow-blue-500/10 shadow-gray-200'
            : 'dark:text-gray-300 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:border-transparent border-transparent dark:hover:border-white/[0.08] hover:border-gray-300'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-60 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {items.map(item => {
              const ItemIcon = item.icon;
              const isActive = item.path === currentPath;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'dark:text-white text-black dark:bg-blue-600 bg-blue-50'
                      : 'dark:text-gray-200 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <ItemIcon
                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? 'dark:text-white text-black'
                        : 'dark:text-gray-400 text-gray-600 dark:group-hover:text-gray-300 group-hover:text-gray-700'
                    }`}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full dark:bg-white bg-gray-900 dark:shadow-[0_0_8px_rgba(255,255,255,0.6)] shadow-[0_0_8px_rgba(0,0,0,0.3)] animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ROLE VIEW DROPDOWN COMPONENT (for Admin)
// ============================================================================

interface RoleViewDropdownProps {
  userName: string;
  userEmail: string;
  availableViews?: Array<{
    key: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    role: UserRole;
  }>;
}

const STORAGE_KEY = 'admin-role-visibility';

function loadRoleVisibility(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load role visibility settings:', error);
  }
  // Default: all roles visible
  return {
    picking: true,
    packing: true,
    'stock-control': true,
    inwards: true,
    sales: true,
    production: true,
    maintenance: true,
    rma: true,
    admin: true,
  };
}

function RoleViewDropdown({ userName, userEmail, availableViews }: RoleViewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const setActiveRoleMutation = useSetActiveRole();
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const [roleVisibility, setRoleVisibility] = useState<Record<string, boolean>>(() =>
    loadRoleVisibility()
  );

  // Use provided availableViews or default to all views (for backwards compatibility)
  const dropdownRoleViews = availableViews || [
    { key: 'admin', label: 'Admin View', path: '/dashboard', icon: CogIcon, role: UserRole.ADMIN },
    {
      key: 'picking',
      label: 'Picking View',
      path: '/orders',
      icon: ClipboardDocumentListIcon,
      role: UserRole.PICKER,
    },
    {
      key: 'packing',
      label: 'Packing View',
      path: '/packing',
      icon: CubeIcon,
      role: UserRole.PACKER,
    },
    {
      key: 'stock-control',
      label: 'Stock Control View',
      path: '/stock-control',
      icon: ScaleIcon,
      role: UserRole.STOCK_CONTROLLER,
    },
    {
      key: 'inwards',
      label: 'Inwards View',
      path: '/inwards',
      icon: InboxIcon,
      role: 'INWARDS' as UserRole,
    },
    {
      key: 'sales',
      label: 'Sales View',
      path: '/sales',
      icon: CurrencyDollarIcon,
      role: 'SALES' as UserRole,
    },
    {
      key: 'production',
      label: 'Production View',
      path: '/production',
      icon: CogIcon,
      role: 'PRODUCTION' as UserRole,
    },
    {
      key: 'maintenance',
      label: 'Maintenance View',
      path: '/maintenance',
      icon: WrenchScrewdriverIcon,
      role: 'MAINTENANCE' as UserRole,
    },
    { key: 'rma', label: 'RMA View', path: '/rma', icon: ArrowPathIcon, role: 'RMA' as UserRole },
  ];

  // Reload visibility settings when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setRoleVisibility(loadRoleVisibility());
    }
  }, [isOpen]);

  // Listen for storage changes (other tabs) and window focus (same tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || !e.key) {
        setRoleVisibility(loadRoleVisibility());
      }
    };

    const handleFocus = () => {
      setRoleVisibility(loadRoleVisibility());
    };

    const handleRoleVisibilityChanged = () => {
      setRoleVisibility(loadRoleVisibility());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('role-visibility-changed', handleRoleVisibilityChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('role-visibility-changed', handleRoleVisibilityChanged);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter role views based on visibility settings
  const roleViews = dropdownRoleViews.filter(view => roleVisibility[view.key] !== false);

  const handleRoleClick = async (role: UserRole, path: string) => {
    console.log('[RoleViewDropdown] Switching to role:', role);
    try {
      // Call API to set active role
      // When switching to ADMIN view, we still set activeRole to ADMIN
      // This makes getEffectiveRole() return ADMIN (since activeRole === user.role)
      await setActiveRoleMutation.mutateAsync(role);

      // Navigate to the role's page
      navigate(path);
      setIsOpen(false);
    } catch (error) {
      console.error('[RoleViewDropdown] Failed to switch role:', error);
    }
  };

  const handleSettingsClick = () => {
    navigate('/role-settings?section=role-switcher');
    setIsOpen(false);
  };

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 dark:hover:bg-white/[0.05] hover:bg-gray-100 rounded-xl px-4 py-2.5 transition-all duration-300 group dark:border border border-transparent dark:border-transparent dark:hover:border-white/[0.08] hover:border-gray-300"
      >
        <div className="text-left">
          <h2 className="text-sm font-semibold dark:text-white text-black tracking-tight dark:group-hover:text-white group-hover:text-black transition-colors">
            {userName}
          </h2>
          <p className="text-xs dark:text-gray-400 text-gray-600 dark:group-hover:text-gray-300 group-hover:text-gray-700 transition-colors">
            {userEmail}
          </p>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 dark:text-gray-400 text-gray-600 dark:group-hover:text-white group-hover:text-gray-800 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="px-5 py-3.5 dark:border-b border-b dark:border-gray-700 border-gray-200">
            <p className="text-xs font-semibold dark:text-blue-400 text-blue-600 uppercase tracking-wider">
              Role Views
            </p>
          </div>
          <div className="py-2">
            {roleViews.map(view => {
              const ViewIcon = view.icon;
              const isActive = view.role === getEffectiveRole();
              return (
                <button
                  key={view.key}
                  onClick={() => handleRoleClick(view.role, view.path)}
                  disabled={setActiveRoleMutation.isPending}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'dark:text-white text-black dark:bg-blue-600 bg-blue-50'
                      : 'dark:text-gray-200 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <ViewIcon
                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? 'dark:text-white text-black'
                        : 'dark:text-gray-400 text-gray-600 dark:group-hover:text-gray-300 group-hover:text-gray-700'
                    }`}
                  />
                  <div className="text-left flex-1">
                    <div className={isActive ? 'font-semibold' : 'font-normal'}>{view.label}</div>
                    {isActive && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs dark:text-blue-200 text-blue-700">
                          Current View
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full dark:bg-white bg-gray-900 dark:shadow-[0_0_8px_rgba(255,255,255,0.6)] shadow-[0_0_8px_rgba(0,0,0,0.3)] animate-pulse"></span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Settings Button */}
          <div className="dark:border-t border-t dark:border-gray-700 border-gray-200">
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium dark:text-gray-400 text-gray-700 dark:hover:text-white hover:text-black dark:hover:bg-gray-800 hover:bg-gray-100 transition-all duration-200 group"
            >
              <CogIcon className="h-4 w-4 flex-shrink-0 transition-colors duration-200 dark:text-gray-500 text-gray-600 dark:group-hover:text-gray-300 group-hover:text-gray-800" />
              <span className="flex-1 text-left">Role Settings</span>
              <span className="text-xs dark:text-gray-500 text-gray-600 dark:group-hover:text-gray-400 group-hover:text-gray-700">
                {roleViews.length} / {dropdownRoleViews.length} visible
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const logoutMutation = useLogout();
  const setActiveRoleMutation = useSetActiveRole();
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch user's additional granted roles
  const { data: additionalRoles = [] } = useMyRoles();

  // Determine if user should see role switcher (admin OR has additional granted roles)
  const hasRoleSwitcher = user?.role === UserRole.ADMIN || additionalRoles.length > 0;

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to clear current_view and active orders
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Continue with logout even if backend call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local auth state
      logout();
      // Navigate to login page
      navigate('/login');
    }
  };

  if (!user) {
    return null;
  }

  // Group navigation items into dropdowns
  const getNavGroups = () => {
    const groups: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
      }>;
    }> = [];

    // Operations Group - for supervisors and admins (oversight/monitoring)
    if (user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) {
      const items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
      }> = [
        { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: ChartBarIcon },
        {
          key: 'exceptions',
          label: 'Exceptions',
          path: '/exceptions',
          icon: ExclamationTriangleIcon,
        },
      ];
      groups.push({
        key: 'operations',
        label: 'Operations',
        icon: ChartBarIcon,
        items,
      });
    }

    // Inventory Management Group - for supervisors and admins (Phase 2 features)
    if (user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) {
      const items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
      }> = [
        {
          key: 'cycle-counting',
          label: 'Cycle Counting',
          path: '/cycle-counting',
          icon: ClipboardDocumentListIcon,
        },
        {
          key: 'location-capacity',
          label: 'Location Capacity',
          path: '/location-capacity',
          icon: ScaleIcon,
        },
        {
          key: 'quality-control',
          label: 'Quality Control',
          path: '/quality-control',
          icon: ShieldCheckIcon,
        },
      ];

      groups.push({
        key: 'inventory',
        label: 'Inventory',
        icon: CubeIcon,
        items,
      });
    }

    // Admin Tools Group - for admins only
    if (user.role === UserRole.ADMIN) {
      groups.push({
        key: 'admin',
        label: 'Admin',
        icon: CogIcon,
        items: [
          { key: 'user-roles', label: 'User Roles', path: '/user-roles', icon: UserGroupIcon },
          {
            key: 'admin-settings',
            label: 'Admin Settings',
            path: '/admin-settings',
            icon: CogIcon,
          },
          {
            key: 'business-rules',
            label: 'Business Rules',
            path: '/business-rules',
            icon: CogIcon,
          },
          { key: 'integrations', label: 'Integrations', path: '/integrations', icon: ServerIcon },
        ],
      });
    }

    // Reports Group - for supervisors and admins
    if (user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) {
      groups.push({
        key: 'reports',
        label: 'Reports',
        icon: DocumentChartBarIcon,
        items: [{ key: 'reports', label: 'Reports', path: '/reports', icon: DocumentChartBarIcon }],
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  // Define all available role views with their paths and icons
  const allAvailableRoleViews = [
    { key: 'admin', label: 'Admin View', path: '/dashboard', icon: CogIcon, role: UserRole.ADMIN },
    {
      key: 'picking',
      label: 'Picking View',
      path: '/orders',
      icon: ClipboardDocumentListIcon,
      role: UserRole.PICKER,
    },
    {
      key: 'packing',
      label: 'Packing View',
      path: '/packing',
      icon: CubeIcon,
      role: UserRole.PACKER,
    },
    {
      key: 'stock-control',
      label: 'Stock Control View',
      path: '/stock-control',
      icon: ScaleIcon,
      role: UserRole.STOCK_CONTROLLER,
    },
    {
      key: 'inwards',
      label: 'Inwards View',
      path: '/inwards',
      icon: InboxIcon,
      role: 'INWARDS' as UserRole,
    },
    {
      key: 'sales',
      label: 'Sales View',
      path: '/sales',
      icon: CurrencyDollarIcon,
      role: 'SALES' as UserRole,
    },
    {
      key: 'production',
      label: 'Production View',
      path: '/production',
      icon: CogIcon,
      role: 'PRODUCTION' as UserRole,
    },
    {
      key: 'maintenance',
      label: 'Maintenance View',
      path: '/maintenance',
      icon: WrenchScrewdriverIcon,
      role: 'MAINTENANCE' as UserRole,
    },
    { key: 'rma', label: 'RMA View', path: '/rma', icon: ArrowPathIcon, role: 'RMA' as UserRole },
  ];

  // Filter role views to only include user's base role + granted additional roles
  // Admin users can see all role views
  const availableRoles =
    user?.role === UserRole.ADMIN
      ? Object.values(UserRole) // Admins see all roles
      : ([user?.role, ...(additionalRoles || [])].filter(Boolean) as UserRole[]);

  const allRoleViews = allAvailableRoleViews.filter(view => availableRoles.includes(view.role));

  const handleRoleSwitch = async (role: UserRole, path: string) => {
    console.log('[Header] Switching to role:', role, 'path:', path);
    try {
      await setActiveRoleMutation.mutateAsync(role);
      console.log('[Header] Role set successfully, navigating to:', path);
      navigate(path);
      console.log('[Header] Navigation called');
    } catch (error) {
      console.error('[Header] Failed to switch role:', error);
    }
  };

  return (
    <>
      <header className="dark:glass-card backdrop-blur-xl dark:bg-white/[0.02] bg-white/90 dark:border-b border-b dark:border-white/[0.08] border-gray-200 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 dark:text-gray-300 text-gray-700 dark:hover:text-white hover:text-gray-900 touch-target rounded-lg dark:hover:bg-white/[0.05] hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* User info and navigation - Desktop */}
            <div className="hidden md:flex items-center space-x-4 flex-1">
              {/* Navigation dropdowns */}
              {navGroups.length > 0 && (
                <nav className="flex items-center space-x-1">
                  {navGroups.map(group => (
                    <NavDropdown
                      key={group.key}
                      label={group.label}
                      icon={group.icon}
                      items={group.items}
                      currentPath={location.pathname}
                    />
                  ))}
                </nav>
              )}

              {/* User info - with Role View Dropdown for users with multiple roles */}
              {hasRoleSwitcher ? (
                <div className="flex items-center space-x-3 pl-6 dark:border-l border-l dark:border-white/[0.1] border-gray-300">
                  <RoleViewDropdown
                    userName={user.name}
                    userEmail={user.email}
                    availableViews={allRoleViews}
                  />
                  <span className="badge badge-primary">{getEffectiveRole() || user.role}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3 pl-6 dark:border-l border-l dark:border-white/[0.1] border-gray-300">
                  <div>
                    <h2 className="text-sm font-semibold dark:text-white text-black tracking-tight">
                      {user.name}
                    </h2>
                    <p className="text-xs dark:text-gray-400 text-gray-600">{user.email}</p>
                  </div>
                  <span className="badge badge-primary">{user.role}</span>
                </div>
              )}
            </div>

            {/* Mobile user info */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="text-right">
                <h2 className="text-sm font-semibold dark:text-white text-black tracking-tight">
                  {user.name}
                </h2>
                <p className="text-xs dark:text-gray-400 text-gray-600">{user.role}</p>
              </div>
            </div>

            {/* Right side actions - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {/* Settings button for admin */}
              {user.role === UserRole.ADMIN && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/role-settings?section=role-switcher')}
                  className="flex items-center gap-2"
                  title="Admin Settings"
                >
                  <CogIcon className="h-4 w-4" />
                  Settings
                </Button>
              )}

              {/* Logout button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navGroups={navGroups}
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
        getEffectiveRole={getEffectiveRole}
        onLogout={handleLogout}
        onNavigate={navigate}
        isAdmin={user.role === UserRole.ADMIN}
        hasRoleSwitcher={hasRoleSwitcher}
        allRoleViews={allRoleViews}
        onRoleSwitch={handleRoleSwitch}
      />
    </>
  );
}
