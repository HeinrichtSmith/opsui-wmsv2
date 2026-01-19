/**
 * App component
 *
 * Main application with routing and authentication
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore, useUIStore } from '@/stores';
import { NotificationCenter } from '@/components/shared';
import { useAdminRoleAutoSwitch } from '@/hooks/useAdminRoleAutoSwitch';
import {
  LoginPage,
  DashboardPage,
  OrderQueuePage,
  PickingPage,
  PackingQueuePage,
  PackingPage,
  StockControlPage,
  InwardsGoodsPage,
  ProductionPage,
  MaintenancePage,
  RMAPage,
  SalesPage,
  AdminSettingsPage,
  UserRolesPage,
  ExceptionsPage,
  CycleCountingPage,
  LocationCapacityPage,
  QualityControlPage,
  BusinessRulesPage,
  ReportsPage,
  IntegrationsPage,
} from '@/pages';
import { UserRole } from '@opsui/shared';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Prevent uncaught errors from crashing the app
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

function ProtectedRoute({
  children,
  requiredRoles,
}: {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const userRole = useAuthStore(state => state.user?.role);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const location = useLocation();

  // Use effective role (active role if set, otherwise base role) for authorization
  const effectiveRole = getEffectiveRole();

  console.log(
    '[ProtectedRoute] Path:',
    location.pathname,
    'baseRole:',
    userRole,
    'effectiveRole:',
    effectiveRole,
    'requiredRoles:',
    requiredRoles
  );

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role requirements using effective role
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = effectiveRole ? requiredRoles.includes(effectiveRole) : false;
    if (!hasRole) {
      console.log('[ProtectedRoute] User does not have required role, redirecting');
      // Redirect to appropriate page based on effective role
      if (effectiveRole === 'PICKER') {
        console.log('[ProtectedRoute] Redirecting PICKER to /orders');
        return <Navigate to="/orders" replace />;
      }
      if (effectiveRole === 'PACKER') {
        console.log('[ProtectedRoute] Redirecting PACKER to /packing');
        return <Navigate to="/packing" replace />;
      }
      if (effectiveRole === 'STOCK_CONTROLLER') {
        console.log('[ProtectedRoute] Redirecting STOCK_CONTROLLER to /stock-control');
        return <Navigate to="/stock-control" replace />;
      }
      if (effectiveRole === ('INWARDS' as UserRole)) {
        console.log('[ProtectedRoute] Redirecting INWARDS to /inwards');
        return <Navigate to="/inwards" replace />;
      }
      if (effectiveRole === ('PRODUCTION' as UserRole)) {
        console.log('[ProtectedRoute] Redirecting PRODUCTION to /production');
        return <Navigate to="/production" replace />;
      }
      if (effectiveRole === ('MAINTENANCE' as UserRole)) {
        console.log('[ProtectedRoute] Redirecting MAINTENANCE to /maintenance');
        return <Navigate to="/maintenance" replace />;
      }
      if (effectiveRole === ('SALES' as UserRole)) {
        console.log('[ProtectedRoute] Redirecting SALES to /sales');
        return <Navigate to="/sales" replace />;
      }
      if (effectiveRole === ('RMA' as UserRole)) {
        console.log('[ProtectedRoute] Redirecting RMA to /rma');
        return <Navigate to="/rma" replace />;
      }
      console.log('[ProtectedRoute] Redirecting to /dashboard (default)');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('[ProtectedRoute] Access granted, rendering children');
  return <>{children}</>;
}

// ============================================================================
// PUBLIC ROUTE COMPONENT (for login page)
// ============================================================================

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userRole = useAuthStore(state => state.user?.role);

  // Already authenticated - redirect to appropriate page
  if (isAuthenticated) {
    if (userRole === 'PICKER') {
      return <Navigate to="/orders" replace />;
    }
    if (userRole === 'PACKER') {
      return <Navigate to="/packing" replace />;
    }
    if (userRole === 'STOCK_CONTROLLER') {
      return <Navigate to="/stock-control" replace />;
    }
    if (userRole === ('INWARDS' as UserRole)) {
      return <Navigate to="/inwards" replace />;
    }
    if (userRole === ('PRODUCTION' as UserRole)) {
      return <Navigate to="/production" replace />;
    }
    if (userRole === ('MAINTENANCE' as UserRole)) {
      return <Navigate to="/maintenance" replace />;
    }
    if (userRole === ('SALES' as UserRole)) {
      return <Navigate to="/sales" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ============================================================================
// NAVIGATION TRACKER COMPONENT
// ============================================================================

function NavigationTracker() {
  const location = useLocation();
  const userId = useAuthStore(state => state.user?.userId);
  const userRole = useAuthStore(state => state.user?.role);
  const accessToken = useAuthStore(state => state.accessToken);

  // Store the last known view for workers (persists across tab switches)
  const [lastKnownView, setLastKnownView] = useState<string>('');
  // Track if page is visible to know when to update view on return
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    // Handle visibility change for idle status
    const handleVisibilityChange = () => {
      const wasVisible = isPageVisible;
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);

      // Update idle status when visibility changes for workers (picker, packer, stock controller, inwards, production, maintenance, sales)
      if (
        userId &&
        (userRole === 'PICKER' ||
          userRole === 'PACKER' ||
          userRole === 'STOCK_CONTROLLER' ||
          userRole === ('INWARDS' as UserRole) ||
          userRole === ('PRODUCTION' as UserRole) ||
          userRole === ('MAINTENANCE' as UserRole) ||
          userRole === ('SALES' as UserRole))
      ) {
        const updateIdleStatus = async () => {
          try {
            await fetch('/api/auth/set-idle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            });
          } catch (error) {
            // Silent fail
          }
        };

        // Set to idle when page is hidden
        if (isVisible === false) {
          updateIdleStatus();
        }
        // When returning to tab, update current view to set user back to active
        else if (isVisible === true && wasVisible === false && lastKnownView) {
          // Update the view which will set the user back to active
          fetch('/api/auth/current-view', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ view: lastKnownView }),
          }).catch(() => {
            // Silent fail
          });
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, userRole, accessToken, lastKnownView, isPageVisible]);

  useEffect(() => {
    // Only track navigation for authenticated users
    if (!userId || !userRole) {
      return;
    }

    // Convert path to display text for backend
    let displayView: string = '';

    // Parse URL search params for stock control tab tracking
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');

    // Check if user is on their primary work page
    const isPickerOnPage =
      userRole === 'PICKER' &&
      (location.pathname === '/orders' || location.pathname === '/orders/');
    const isPackerOnPage =
      userRole === 'PACKER' &&
      (location.pathname === '/packing' || location.pathname === '/packing/');
    const isStockControllerOnPage =
      userRole === 'STOCK_CONTROLLER' &&
      (location.pathname === '/stock-control' || location.pathname === '/stock-control/');
    const isInwardsOnPage =
      userRole === ('INWARDS' as UserRole) &&
      (location.pathname === '/inwards' || location.pathname === '/inwards/');
    const isProductionOnPage =
      userRole === ('PRODUCTION' as UserRole) &&
      (location.pathname === '/production' || location.pathname === '/production/');
    const isMaintenanceOnPage =
      userRole === ('MAINTENANCE' as UserRole) &&
      (location.pathname === '/maintenance' || location.pathname === '/maintenance/');
    const isSalesOnPage =
      userRole === ('SALES' as UserRole) &&
      (location.pathname === '/sales' || location.pathname === '/sales/');

    if (location.pathname === '/orders' || location.pathname === '/orders/') {
      displayView = 'Order Queue';
    } else if (location.pathname.includes('/orders/') && location.pathname.includes('/pick')) {
      // Extract order ID from path like /orders/ORD-12345678-1234/pick
      const match = location.pathname.match(/ORD-\d{8}-\d{4}/);
      displayView = match ? `Picking Order ${match[0]}` : 'Picking Order';
    } else if (location.pathname === '/packing' || location.pathname === '/packing/') {
      displayView = 'Packing Queue';
    } else if (location.pathname.includes('/packing/') && location.pathname.includes('/pack')) {
      // Extract order ID from path like /packing/ORD-12345678-1234/pack
      const match = location.pathname.match(/ORD-\d{8}-\d{4}/);
      displayView = match ? `Packing Order ${match[0]}` : 'Packing Order';
    } else if (location.pathname === '/dashboard') {
      displayView = 'Dashboard';
    } else if (isStockControllerOnPage) {
      // Map tab parameter to view name
      const tabViewMap: Record<string, string> = {
        dashboard: 'Stock Control Dashboard',
        inventory: 'Stock Control - Inventory',
        transactions: 'Stock Control - Transactions',
        'quick-actions': 'Stock Control - Quick Actions',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Stock Control Dashboard';
    } else if (isInwardsOnPage) {
      // Map tab parameter to view name for inwards goods
      const tabViewMap: Record<string, string> = {
        dashboard: 'Inwards Goods Dashboard',
        asn: 'Inwards Goods - ASNs',
        receiving: 'Inwards Goods - Receiving',
        putaway: 'Inwards Goods - Putaway',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Inwards Goods Dashboard';
    } else if (isProductionOnPage) {
      // Map tab parameter to view name for production
      const tabViewMap: Record<string, string> = {
        dashboard: 'Production Dashboard',
        orders: 'Production - Orders',
        schedule: 'Production - Schedule',
        maintenance: 'Production - Maintenance',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Production Dashboard';
    } else if (isMaintenanceOnPage) {
      // Map tab parameter to view name for maintenance
      const tabViewMap: Record<string, string> = {
        dashboard: 'Maintenance Dashboard',
        requests: 'Maintenance - Requests',
        schedule: 'Maintenance - Schedule',
        equipment: 'Maintenance - Equipment',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Maintenance Dashboard';
    } else if (isSalesOnPage) {
      // Map tab parameter to view name for sales
      const tabViewMap: Record<string, string> = {
        dashboard: 'Sales Dashboard',
        customers: 'Sales - Customers',
        leads: 'Sales - Leads',
        opportunities: 'Sales - Opportunities',
        quotes: 'Sales - Quotes',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Sales Dashboard';
    } else if (location.pathname === '/login') {
      displayView = 'Login';
    } else if (
      userRole === 'PICKER' ||
      userRole === 'PACKER' ||
      userRole === 'STOCK_CONTROLLER' ||
      userRole === ('INWARDS' as UserRole) ||
      userRole === ('PRODUCTION' as UserRole) ||
      userRole === ('MAINTENANCE' as UserRole) ||
      userRole === ('SALES' as UserRole)
    ) {
      // Worker on any other page - use last known view if available
      displayView = lastKnownView || '';
    } else {
      // For other roles, show the path
      displayView = location.pathname;
    }

    // For workers, store the view when on their primary work page
    if (
      (isPickerOnPage ||
        isPackerOnPage ||
        isStockControllerOnPage ||
        isInwardsOnPage ||
        isProductionOnPage ||
        isMaintenanceOnPage ||
        isSalesOnPage) &&
      displayView
    ) {
      setLastKnownView(displayView);
    }

    // Update current view in backend on navigation (silent, no console spam)
    const updateCurrentView = async () => {
      try {
        await fetch('/api/auth/current-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ view: displayView }),
        });
      } catch (error) {
        // Silent fail
      }
    };

    updateCurrentView();
  }, [location.pathname, location.search, userId, userRole, accessToken, lastKnownView]);

  return null; // This component doesn't render anything
}

// ============================================================================
// APP INNER COMPONENT (inside Router)
// ============================================================================

function AppInner() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userRole = useAuthStore(state => state.user?.role);

  // Auto-switch admin users back to ADMIN role when visiting admin pages
  useAdminRoleAutoSwitch();

  // Debug: Log location changes
  const location = useLocation();
  useEffect(() => {
    console.log('[App] Location changed:', location.pathname, location.search);
  }, [location.pathname, location.search]);

  // Determine default route based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    if (userRole === 'PICKER') return '/orders';
    if (userRole === 'PACKER') return '/packing';
    if (userRole === 'STOCK_CONTROLLER') return '/stock-control';
    if (userRole === ('INWARDS' as UserRole)) return '/inwards';
    if (userRole === ('PRODUCTION' as UserRole)) return '/production';
    if (userRole === ('MAINTENANCE' as UserRole)) return '/maintenance';
    if (userRole === ('SALES' as UserRole)) return '/sales';
    return '/dashboard';
  };

  return (
    <>
      <NavigationTracker />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Picker routes */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PICKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <OrderQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/pick"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PICKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <PickingPage />
            </ProtectedRoute>
          }
        />

        {/* Packer routes */}
        <Route
          path="/packing"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <PackingQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/packing/:orderId/pack"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <PackingPage />
            </ProtectedRoute>
          }
        />

        {/* Admin/Supervisor routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ExceptionsPage />
            </ProtectedRoute>
          }
        />

        {/* Stock Controller routes */}
        <Route
          path="/stock-control"
          element={
            <ProtectedRoute
              requiredRoles={['STOCK_CONTROLLER' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <StockControlPage />
            </ProtectedRoute>
          }
        />

        {/* Inwards Goods routes */}
        <Route
          path="/inwards"
          element={
            <ProtectedRoute
              requiredRoles={['INWARDS' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <InwardsGoodsPage />
            </ProtectedRoute>
          }
        />

        {/* Production routes */}
        <Route
          path="/production"
          element={
            <ProtectedRoute
              requiredRoles={['PRODUCTION' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <ProductionPage />
            </ProtectedRoute>
          }
        />

        {/* Maintenance routes */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute
              requiredRoles={['MAINTENANCE' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <MaintenancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rma"
          element={
            <ProtectedRoute
              requiredRoles={['RMA' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <RMAPage />
            </ProtectedRoute>
          }
        />

        {/* Sales routes */}
        <Route
          path="/sales"
          element={
            <ProtectedRoute
              requiredRoles={['SALES' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <SalesPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2: Operational Excellence routes */}
        <Route
          path="/cycle-counting"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <CycleCountingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/location-capacity"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <LocationCapacityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality-control"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <QualityControlPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 3: Advanced Features routes */}
        <Route
          path="/business-rules"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <BusinessRulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />

        {/* User Roles route */}
        <Route
          path="/user-roles"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
              <UserRolesPage />
            </ProtectedRoute>
          }
        />

        {/* Role Settings route */}
        <Route
          path="/role-settings"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Default route */}
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

        {/* Catch all - redirect to default */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
      <NotificationCenter />
    </>
  );
}

// ============================================================================
// APP COMPONENT
// ============================================================================

function App() {
  // Initialize and sync theme
  useEffect(() => {
    // Apply theme function
    const applyTheme = () => {
      const theme = useUIStore.getState().theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      const shouldBeDark = theme === 'dark' || (theme === 'auto' && prefersDark);

      if (shouldBeDark) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    // Apply initial theme
    applyTheme();

    // Listen for system preference changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const theme = useUIStore.getState().theme;
      if (theme === 'auto') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Subscribe to theme changes in the store
    const unsubscribe = useUIStore.subscribe(() => {
      applyTheme();
    });

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
