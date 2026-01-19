/**
 * Role Settings page
 *
 * Admin settings for configuring the role switcher dropdown
 * - Show/hide specific roles in the role view list
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Header, Button } from '@/components/shared';
import {
  CogIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ScaleIcon,
  InboxIcon,
  CurrencyDollarIcon,
  CogIcon as WrenchIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { UserRole } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface RoleConfig {
  key: string;
  label: string;
  role: UserRole;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
}

const STORAGE_KEY = 'admin-role-visibility';

// ============================================================================
// DEFAULT ROLE CONFIGURATIONS
// ============================================================================

const DEFAULT_ROLES: RoleConfig[] = [
  {
    key: 'picking',
    label: 'Picking View',
    role: UserRole.PICKER,
    icon: ClipboardDocumentListIcon,
    visible: true,
  },
  { key: 'packing', label: 'Packing View', role: UserRole.PACKER, icon: CubeIcon, visible: true },
  {
    key: 'stock-control',
    label: 'Stock Control View',
    role: UserRole.STOCK_CONTROLLER,
    icon: ScaleIcon,
    visible: true,
  },
  {
    key: 'inwards',
    label: 'Inwards View',
    role: 'INWARDS' as UserRole,
    icon: InboxIcon,
    visible: true,
  },
  {
    key: 'sales',
    label: 'Sales View',
    role: 'SALES' as UserRole,
    icon: CurrencyDollarIcon,
    visible: true,
  },
  {
    key: 'production',
    label: 'Production View',
    role: 'PRODUCTION' as UserRole,
    icon: CogIcon,
    visible: true,
  },
  {
    key: 'maintenance',
    label: 'Maintenance View',
    role: 'MAINTENANCE' as UserRole,
    icon: WrenchScrewdriverIcon,
    visible: true,
  },
  { key: 'rma', label: 'RMA View', role: 'RMA' as UserRole, icon: ArrowPathIcon, visible: true },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function loadRoleVisibility(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load role visibility settings:', error);
  }
  // Return default: all roles visible
  return DEFAULT_ROLES.reduce(
    (acc, role) => ({ ...acc, [role.key]: true }),
    {} as Record<string, boolean>
  );
}

function saveRoleVisibility(settings: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save role visibility settings:', error);
  }
}

function getInitialRoles(): RoleConfig[] {
  const visibility = loadRoleVisibility();
  return DEFAULT_ROLES.map(role => ({
    ...role,
    visible: visibility[role.key] !== false, // Default to true if not set
  }));
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface RoleSettingCardProps {
  config: RoleConfig;
  onToggleVisibility: (key: string) => void;
}

function RoleSettingCard({ config, onToggleVisibility }: RoleSettingCardProps) {
  const Icon = config.icon;

  return (
    <Card
      variant="glass"
      className={`transition-all duration-300 ${
        config.visible ? 'border-primary-500/30' : 'border-gray-700/50 opacity-60'
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Role Icon */}
            <div
              className={`p-3 rounded-xl transition-all duration-300 ${
                config.visible
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>

            {/* Role Info */}
            <div>
              <h3
                className={`text-lg font-semibold transition-colors ${
                  config.visible ? 'text-white' : 'text-gray-400'
                }`}
              >
                {config.label}
              </h3>
              <p
                className={`text-sm transition-colors ${
                  config.visible ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Role: {config.role}
              </p>
            </div>
          </div>

          {/* Visibility Toggle */}
          <button
            onClick={() => onToggleVisibility(config.key)}
            className={`p-3 rounded-xl transition-all duration-300 ${
              config.visible
                ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                : 'bg-gray-700/50 text-gray-500 hover:bg-gray-700'
            }`}
            title={config.visible ? 'Hide from role switcher' : 'Show in role switcher'}
          >
            {config.visible ? (
              <EyeIcon className="h-5 w-5" />
            ) : (
              <EyeSlashIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Status Indicator */}
        <div
          className={`mt-4 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
            config.visible ? 'bg-success-500/20 text-success-300' : 'bg-gray-700/50 text-gray-500'
          }`}
        >
          {config.visible ? (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
              Visible in role switcher
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Hidden from role switcher
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function RoleSettingsPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleConfig[]>(() => getInitialRoles());
  const [hasChanges, setHasChanges] = useState(false);

  const visibleCount = roles.filter(r => r.visible).length;

  const handleToggleVisibility = (key: string) => {
    setRoles(prev =>
      prev.map(role => (role.key === key ? { ...role, visible: !role.visible } : role))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    const visibilitySettings = roles.reduce(
      (acc, role) => ({
        ...acc,
        [role.key]: role.visible,
      }),
      {} as Record<string, boolean>
    );

    saveRoleVisibility(visibilitySettings);
    setHasChanges(false);

    // Dispatch custom event to notify other components (like Header) of the change
    window.dispatchEvent(
      new CustomEvent('role-visibility-changed', { detail: visibilitySettings })
    );

    // Navigate back to dashboard
    navigate('/dashboard');
  };

  const handleReset = () => {
    // Reset to all visible
    const defaultVisibility = DEFAULT_ROLES.reduce(
      (acc, role) => ({
        ...acc,
        [role.key]: true,
      }),
      {} as Record<string, boolean>
    );

    saveRoleVisibility(defaultVisibility);
    setRoles(getInitialRoles());
    setHasChanges(false);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <CogIcon className="h-8 w-8 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Role Switcher Settings
              </h1>
              <p className="mt-2 text-gray-400">
                Customize which roles appear in your role view dropdown
              </p>
            </div>
          </div>
        </div>

        {/* Overview Card */}
        <Card variant="glass" className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Showing {visibleCount} of {roles.length} roles in switcher
                </p>
                <p className="text-xs text-gray-500">
                  Hidden roles can still be accessed but won't appear in the dropdown menu
                </p>
              </div>
              {hasChanges && (
                <div className="flex items-center gap-2 px-4 py-2 bg-warning-500/20 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
                  <span className="text-sm text-warning-300 font-medium">Unsaved changes</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Role Settings Grid */}
        <div className="space-y-4 mb-8">
          {roles.map(role => (
            <RoleSettingCard
              key={role.key}
              config={role}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-6 bg-gray-900/50 rounded-xl border border-white/5">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            Reset to Defaults
          </Button>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/dashboard')}
              disabled={hasChanges}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <CogIcon className="h-5 w-5" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <Card variant="glass" className="mt-8 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <WrenchIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">How it works</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>
                    • <strong className="text-gray-300">Visible roles</strong> appear in the role
                    switcher dropdown in the header
                  </li>
                  <li>
                    • <strong className="text-gray-300">Hidden roles</strong> won't clutter your
                    dropdown but remain accessible via direct URL
                  </li>
                  <li>• Settings are saved locally in your browser and persist across sessions</li>
                  <li>• Changes only affect your view - other admins have their own settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default RoleSettingsPage;
