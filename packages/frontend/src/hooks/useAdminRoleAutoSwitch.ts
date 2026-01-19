/**
 * useAdminRoleAutoSwitch hook
 *
 * Automatically switches admin users back to ADMIN role when visiting admin-only pages
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { useSetActiveRole } from '@/services/api';
import { UserRole } from '@opsui/shared';

// Paths that require ADMIN role (admin-only pages)
const ADMIN_PATHS = [
  '/dashboard',
  '/exceptions',
  '/business-rules',
  '/integrations',
  '/reports',
  '/cycle-counting',
  '/location-capacity',
  '/quality-control',
  '/users',
] as const;

/**
 * Hook that automatically switches admin users to ADMIN role
 * when they navigate to admin-only pages
 */
export function useAdminRoleAutoSwitch() {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const setActiveRoleMutation = useSetActiveRole();

  useEffect(() => {
    // Only apply to admin users
    if (!user || user.role !== UserRole.ADMIN) {
      return;
    }

    const currentPath = location.pathname;
    const effectiveRole = getEffectiveRole();

    // Check if current path is an admin path
    const isAdminPath = ADMIN_PATHS.some(path => currentPath.startsWith(path));

    // If on admin path and not already in admin role, switch to admin
    if (isAdminPath && effectiveRole !== UserRole.ADMIN) {
      console.log('[useAdminRoleAutoSwitch] Admin path detected, switching to ADMIN role');
      setActiveRoleMutation.mutate(UserRole.ADMIN);
    }
  }, [location.pathname, user, getEffectiveRole, setActiveRoleMutation]);
}
