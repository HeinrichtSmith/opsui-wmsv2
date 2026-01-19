/**
 * Dashboard page
 *
 * Supervisor dashboard showing real-time warehouse metrics
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDashboardMetrics,
  usePickerActivity,
  usePickerOrders,
  usePackerActivity,
  usePackerOrders,
  useStockControllerActivity,
  useStockControllerTransactions,
} from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent, Header, Button } from '@/components/shared';
import { useAuthStore } from '@/stores';
import {
  UsersIcon,
  ShoppingBagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  DocumentTextIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { PageLoading } from '@/components/shared';

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const colorStyles = {
    primary: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
    success: 'bg-success-500/10 text-success-400 border border-success-500/20',
    warning: 'bg-warning-500/10 text-warning-400 border border-warning-500/20',
    error: 'bg-error-500/10 text-error-400 border border-error-500/20',
  };

  return (
    <Card variant="glass" className="card-hover group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
              {title}
            </p>
            <p className="mt-3 text-4xl font-bold dark:text-white text-gray-900 tracking-tight group-hover:scale-105 transition-transform duration-300">
              {value}
            </p>
          </div>
          <div className={`p-4 rounded-2xl ${colorStyles[color]} transition-all duration-300`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DashboardPage() {
  const navigate = useNavigate();
  const canSupervise = useAuthStore(state => state.canSupervise);
  const [selectedPicker, setSelectedPicker] = useState<{ id: string; name: string } | null>(null);
  const [selectedPacker, setSelectedPacker] = useState<{ id: string; name: string } | null>(null);
  const [selectedController, setSelectedController] = useState<{ id: string; name: string } | null>(
    null
  );

  // Only fetch metrics if user has supervisor privileges
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics({
    enabled: canSupervise(),
  });
  const { data: pickerActivity, isLoading: activityLoading } = usePickerActivity({
    enabled: canSupervise(),
  });
  const { data: packerActivity, isLoading: packerActivityLoading } = usePackerActivity({
    enabled: canSupervise(),
  });

  // Fetch picker orders when a picker is selected
  const { data: pickerOrders, isLoading: ordersLoading } = usePickerOrders(
    selectedPicker?.id || '',
    !!selectedPicker
  );

  // Fetch packer orders when a packer is selected
  const { data: packerOrders, isLoading: packerOrdersLoading } = usePackerOrders(
    selectedPacker?.id || '',
    !!selectedPacker
  );

  // Fetch stock controller transactions when a controller is selected
  const { data: controllerTransactions, isLoading: controllerTransactionsLoading } =
    useStockControllerTransactions(selectedController?.id || '', !!selectedController);

  // Fetch stock controller activity
  const { data: stockControllerActivity, isLoading: stockControllerActivityLoading } =
    useStockControllerActivity({
      enabled: canSupervise(),
    });

  const handleViewOrder = (orderId: string) => {
    console.log('[Dashboard] handleViewOrder called with orderId:', orderId);

    // Determine if this is a picker or packer order based on which modal is open
    const isPackerOrder = !!selectedPacker;
    const isPickerOrder = !!selectedPicker;

    // Close the modals
    setSelectedPacker(null);
    setSelectedPicker(null);

    // Navigate to the appropriate page
    if (isPackerOrder) {
      console.log('[Dashboard] Navigating to packer order:', `/packing/${orderId}/pack`);
      navigate(`/packing/${orderId}/pack`);
    } else if (isPickerOrder) {
      console.log('[Dashboard] Navigating to picker order:', `/orders/${orderId}/pick`);
      navigate(`/orders/${orderId}/pick`);
    } else {
      // Fallback - if neither is set, try to determine from the route
      // Default to packing page as that's more commonly accessed from dashboard
      console.log(
        '[Dashboard] No context, defaulting to packing page:',
        `/packing/${orderId}/pack`
      );
      navigate(`/packing/${orderId}/pack`);
    }
  };

  if (!canSupervise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-warning-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You need supervisor or admin privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metricsLoading || activityLoading || packerActivityLoading) {
    return <PageLoading message="Loading dashboard..." />;
  }

  if (!metrics) {
    return <PageLoading message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="animate-in">
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 dark:text-gray-400 text-gray-600 text-responsive-sm">
            Real-time warehouse operations overview
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <MetricCard
            title="Active Staff"
            value={metrics.activePickers}
            icon={UsersIcon}
            color="primary"
          />
          <MetricCard
            title="Orders/Hour"
            value={metrics.ordersPickedPerHour}
            icon={ClockIcon}
            color="success"
          />
          <MetricCard
            title="Queue Depth"
            value={metrics.queueDepth}
            icon={ShoppingBagIcon}
            color="warning"
          />
          <MetricCard
            title="Exceptions"
            value={metrics.exceptions}
            icon={ExclamationTriangleIcon}
            color={metrics.exceptions > 0 ? 'error' : 'success'}
          />
        </div>

        {/* Throughput */}
        <Card variant="glass" className="card-hover">
          <CardHeader>
            <CardTitle>Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-3 sm:p-4 rounded-xl dark:bg-white/[0.02] bg-gray-50 dark:border-white/[0.05] border-gray-200">
                <p className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-900 tracking-tight">
                  {metrics.throughput.today}
                </p>
                <p className="text-xs sm:text-sm dark:text-gray-400 text-gray-600 mt-1">Today</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl dark:bg-white/[0.02] bg-gray-50 dark:border-white/[0.05] border-gray-200">
                <p className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-900 tracking-tight">
                  {metrics.throughput.week}
                </p>
                <p className="text-xs sm:text-sm dark:text-gray-400 text-gray-600 mt-1">
                  This Week
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl dark:bg-white/[0.02] bg-gray-50 dark:border-white/[0.05] border-gray-200">
                <p className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-900 tracking-tight">
                  {metrics.throughput.month}
                </p>
                <p className="text-xs sm:text-sm dark:text-gray-400 text-gray-600 mt-1">
                  This Month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Picker Activity */}
        <Card variant="glass" className="card-hover">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Picker Activity</CardTitle>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm dark:text-primary-400 text-primary-600 dark:hover:text-primary-300 hover:text-primary-700 dark:bg-primary-500/10 bg-primary-50 dark:hover:bg-primary-500/20 hover:bg-primary-100 dark:border-primary-500/20 border-primary-500/30 rounded-xl transition-all duration-300 touch-target"
                disabled={activityLoading}
              >
                <ClockIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="dark:text-gray-400 text-gray-500">Loading picker activity...</div>
              </div>
            ) : pickerActivity && Array.isArray(pickerActivity) && pickerActivity.length > 0 ? (
              <div className="mobile-table-container">
                <table className="min-w-full dark:divide-y dark:divide-white/[0.08] divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Picker
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      {pickerActivity &&
                        Array.isArray(pickerActivity) &&
                        pickerActivity.some((p: any) => p.currentOrderId) && (
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                            Progress
                          </th>
                        )}
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-y dark:divide-white/[0.05] divide-y divide-gray-200">
                    {pickerActivity?.map((picker, idx) => {
                      const lastViewedAt = picker.lastViewedAt;
                      const timeSinceLastPick = lastViewedAt
                        ? `${Math.floor((Date.now() - new Date(lastViewedAt).getTime()) / 1000)}s ago`
                        : 'Never';

                      // Use the status directly from the API response
                      // The backend correctly determines ACTIVE vs IDLE based on current view and timestamp
                      const status = picker.status || 'IDLE';
                      const pickerId = picker.pickerId || `idx-${idx}`;

                      // Format current view for better readability
                      let displayView = picker.currentView || 'None';
                      let viewLabel = 'badge-info';

                      console.log(
                        '[Dashboard] Processing picker:',
                        picker.pickerName,
                        'currentView:',
                        picker.currentView,
                        'status:',
                        status
                      );

                      if (picker.currentView) {
                        // Check for order queue - handle both "Order Queue" text and "/orders" path
                        if (
                          picker.currentView === 'Order Queue' ||
                          picker.currentView === '/orders' ||
                          picker.currentView === '/orders/' ||
                          picker.currentView === 'Orders Page'
                        ) {
                          displayView = 'Order Queue';
                          viewLabel = 'badge-primary';
                        }
                        // Check for picking page
                        else if (
                          picker.currentView.includes('Picking Order') ||
                          picker.currentView.includes('/pick/') ||
                          picker.currentView.includes('/orders/')
                        ) {
                          const orderMatch = picker.currentView.match(/ORD-\d{8}-\d{4}/);
                          if (orderMatch) {
                            displayView = `Picking ${orderMatch[0]}`;
                            viewLabel = 'badge-success';
                          } else {
                            displayView = 'Picking';
                            viewLabel = 'badge-success';
                          }
                        }
                        // Check for profile page
                        else if (
                          picker.currentView.includes('Profile') ||
                          picker.currentView.includes('/profile')
                        ) {
                          displayView = 'Profile';
                          viewLabel = 'badge-info';
                        }
                        // Default: use the view name as-is
                        else {
                          displayView = picker.currentView;
                          viewLabel = 'badge-info';
                        }
                      }

                      console.log(
                        '[Dashboard] Display view:',
                        displayView,
                        'Label:',
                        viewLabel,
                        'Status:',
                        status
                      );

                      // Determine status badge style and text
                      let statusBadge = '';
                      if (status === 'ACTIVE' || status === 'PICKING') {
                        statusBadge = 'badge-success';
                      } else {
                        statusBadge = 'badge-info';
                      }

                      return (
                        <tr
                          key={`picker-${pickerId}`}
                          className="dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-2 sm:px-4 py-3 text-sm dark:text-white text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-medium">{picker.pickerName}</span>
                              <span className="text-xs dark:text-gray-500 text-gray-500">
                                ({picker.pickerId})
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setSelectedPicker({ id: picker.pickerId, name: picker.pickerName })
                              }
                              className="text-xs touch-target"
                            >
                              <DocumentTextIcon className="h-3 w-3 mr-1" />
                              View Orders
                            </Button>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-sm dark:text-white text-gray-900 font-medium">
                            <span className={viewLabel}>{displayView}</span>
                          </td>
                          {pickerActivity &&
                            Array.isArray(pickerActivity) &&
                            pickerActivity.some((p: any) => p.currentOrderId) && (
                              <td className="px-2 sm:px-4 py-3 text-sm dark:text-white text-gray-900">
                                {picker.currentOrderId ? `${picker.orderProgress}%` : '-'}
                              </td>
                            )}
                          <td className="px-2 sm:px-4 py-3">
                            <span className={statusBadge}>{status}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-sm dark:text-gray-400 text-gray-600">
                            {timeSinceLastPick}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <UsersIcon className="h-12 w-12 sm:h-16 sm:w-16 dark:text-gray-600 text-gray-400 mb-4" />
                <p className="text-sm dark:text-gray-400 text-gray-600">No active pickers</p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                  Pickers will appear here when they claim orders
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Packer Activity */}
        <Card variant="glass" className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Packer Activity</CardTitle>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 text-sm dark:text-primary-400 text-primary-600 dark:hover:text-primary-300 hover:text-primary-700 dark:bg-primary-500/10 bg-primary-50 dark:hover:bg-primary-500/20 hover:bg-primary-100 dark:border-primary-500/20 border-primary-500/30 rounded-xl transition-all duration-300"
                disabled={packerActivityLoading}
              >
                <ClockIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {packerActivityLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="dark:text-gray-400 text-gray-500">Loading packer activity...</div>
              </div>
            ) : packerActivity && Array.isArray(packerActivity) && packerActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full dark:divide-y dark:divide-white/[0.08] divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Packer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      {packerActivity &&
                        Array.isArray(packerActivity) &&
                        packerActivity.some((p: any) => p.currentOrderId) && (
                          <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                            Progress
                          </th>
                        )}
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-y dark:divide-white/[0.05] divide-y divide-gray-200">
                    {packerActivity?.map((packer, idx) => {
                      const lastViewedAt = packer.lastViewedAt;
                      const timeSinceLastPack = lastViewedAt
                        ? `${Math.floor((Date.now() - new Date(lastViewedAt).getTime()) / 1000)}s ago`
                        : 'Never';

                      // Use the status directly from the API response
                      // The backend correctly determines ACTIVE vs IDLE based on current view and timestamp
                      const status = packer.status || 'IDLE';
                      const packerId = packer.packerId || `idx-${idx}`;

                      // Format current view for better readability
                      let displayView = packer.currentView || 'None';
                      let viewLabel = 'badge-info';

                      console.log(
                        '[Dashboard] Processing packer:',
                        packer.packerName,
                        'currentView:',
                        packer.currentView,
                        'status:',
                        status
                      );

                      if (packer.currentView) {
                        // Check for packing queue - handle both "Packing Queue" text and "/packing" path
                        if (
                          packer.currentView === 'Packing Queue' ||
                          packer.currentView === '/packing' ||
                          packer.currentView === '/packing/' ||
                          packer.currentView === 'Packing Page'
                        ) {
                          displayView = 'Packing Queue';
                          viewLabel = 'badge-primary';
                        }
                        // Check for packing page (including "Packing ORD-" pattern)
                        else if (
                          packer.currentView.includes('Packing Order') ||
                          packer.currentView.includes('/pack/') ||
                          packer.currentView.includes('/packing/') ||
                          packer.currentView.includes('Packing ORD-')
                        ) {
                          const orderMatch = packer.currentView.match(/ORD-\d{8}-\d{4}/);
                          if (orderMatch) {
                            displayView = `Packing ${orderMatch[0]}`;
                            viewLabel = 'badge-success';
                          } else {
                            displayView = 'Packing';
                            viewLabel = 'badge-success';
                          }
                        }
                        // Check for profile page
                        else if (
                          packer.currentView.includes('Profile') ||
                          packer.currentView.includes('/profile')
                        ) {
                          displayView = 'Profile';
                          viewLabel = 'badge-info';
                        }
                        // Default: use view name as-is
                        else {
                          displayView = packer.currentView;
                          viewLabel = 'badge-info';
                        }
                      }

                      console.log(
                        '[Dashboard] Display view:',
                        displayView,
                        'Label:',
                        viewLabel,
                        'Status:',
                        status
                      );

                      // Determine status badge style and text
                      let statusBadge = '';
                      if (status === 'ACTIVE' || status === 'PACKING') {
                        statusBadge = 'badge-success';
                      } else {
                        statusBadge = 'badge-info';
                      }

                      return (
                        <tr
                          key={`packer-${packerId}`}
                          className="dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm dark:text-white text-gray-900">
                            {packer.packerName}{' '}
                            <span className="text-xs dark:text-gray-500 text-gray-500">
                              ({packer.packerId})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setSelectedPacker({ id: packer.packerId, name: packer.packerName })
                              }
                              className="text-xs"
                            >
                              <DocumentTextIcon className="h-3 w-3 mr-1" />
                              View Orders
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-sm dark:text-white text-gray-900 font-medium">
                            <span className={viewLabel}>{displayView}</span>
                          </td>
                          {packerActivity &&
                            Array.isArray(packerActivity) &&
                            packerActivity.some((p: any) => p.currentOrderId) && (
                              <td className="px-4 py-3 text-sm dark:text-white text-gray-900">
                                {packer.currentOrderId ? `${packer.orderProgress}%` : '-'}
                              </td>
                            )}
                          <td className="px-4 py-3">
                            <span className={statusBadge}>{status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm dark:text-gray-400 text-gray-600">
                            {timeSinceLastPack}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <CubeIcon className="h-16 w-16 dark:text-gray-600 text-gray-400 mb-4" />
                <p className="text-sm dark:text-gray-400 text-gray-600">No active packers</p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                  Packers will appear here when they claim orders
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Controller Activity */}
        <Card variant="glass" className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stock Controller Activity</CardTitle>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 text-sm dark:text-primary-400 text-primary-600 dark:hover:text-primary-300 hover:text-primary-700 dark:bg-primary-500/10 bg-primary-50 dark:hover:bg-primary-500/20 hover:bg-primary-100 dark:border-primary-500/20 border-primary-500/30 rounded-xl transition-all duration-300"
                disabled={stockControllerActivityLoading}
              >
                <ClockIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {stockControllerActivityLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="dark:text-gray-400 text-gray-500">
                  Loading stock controller activity...
                </div>
              </div>
            ) : stockControllerActivity &&
              Array.isArray(stockControllerActivity) &&
              stockControllerActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full dark:divide-y dark:divide-white/[0.08] divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Stock Controller
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-y dark:divide-white/[0.05] divide-y divide-gray-200">
                    {stockControllerActivity?.map((controller: any, idx) => {
                      const lastViewedAt = controller.lastViewedAt;
                      const timeSinceLastActivity = lastViewedAt
                        ? `${Math.floor((Date.now() - new Date(lastViewedAt).getTime()) / 1000)}s ago`
                        : 'Never';

                      // Use the status directly from the API response
                      // The backend correctly determines ACTIVE vs IDLE based on current view and timestamp
                      const status = controller.status || 'IDLE';
                      const controllerId = controller.controllerId || `idx-${idx}`;

                      // Format current view for better readability
                      let displayView = controller.currentView || 'None';
                      let viewLabel = 'badge-info';

                      console.log(
                        '[Dashboard] Processing stock controller:',
                        controller.controllerName,
                        'currentView:',
                        controller.currentView,
                        'status:',
                        status
                      );

                      if (controller.currentView) {
                        // Check for stock control dashboard
                        if (
                          controller.currentView === 'Stock Control Dashboard' ||
                          controller.currentView === '/stock-control' ||
                          controller.currentView === '/stock-control/'
                        ) {
                          displayView = 'Stock Control';
                          viewLabel = 'badge-primary';
                        }
                        // Check for inventory page
                        else if (
                          controller.currentView === 'Stock Control - Inventory' ||
                          controller.currentView.includes('Inventory Management') ||
                          controller.currentView === '/inventory'
                        ) {
                          displayView = 'Inventory Management';
                          viewLabel = 'badge-success';
                        }
                        // Check for transactions page
                        else if (
                          controller.currentView === 'Stock Control - Transactions' ||
                          controller.currentView.includes('Transactions') ||
                          controller.currentView.includes('/transactions')
                        ) {
                          displayView = 'Transactions';
                          viewLabel = 'badge-info';
                        }
                        // Check for quick actions page
                        else if (
                          controller.currentView === 'Stock Control - Quick Actions' ||
                          controller.currentView.includes('Quick Actions')
                        ) {
                          displayView = 'Quick Actions';
                          viewLabel = 'badge-warning';
                        }
                        // Check for profile page
                        else if (
                          controller.currentView.includes('Profile') ||
                          controller.currentView.includes('/profile')
                        ) {
                          displayView = 'Profile';
                          viewLabel = 'badge-info';
                        }
                        // Default: use view name as-is
                        else {
                          displayView = controller.currentView;
                          viewLabel = 'badge-info';
                        }
                      }

                      console.log(
                        '[Dashboard] Display view:',
                        displayView,
                        'Label:',
                        viewLabel,
                        'Status:',
                        status
                      );

                      // Determine status badge style and text
                      let statusBadge = '';
                      if (status === 'ACTIVE') {
                        statusBadge = 'badge-success';
                      } else {
                        statusBadge = 'badge-info';
                      }

                      return (
                        <tr
                          key={`controller-${controllerId}`}
                          className="dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm dark:text-white text-gray-900">
                            {controller.controllerName}{' '}
                            <span className="text-xs dark:text-gray-500 text-gray-500">
                              ({controller.controllerId})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setSelectedController({
                                  id: controller.controllerId,
                                  name: controller.controllerName,
                                })
                              }
                              className="text-xs"
                            >
                              <ClipboardDocumentListIcon className="h-3 w-3 mr-1" />
                              View Activity
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-sm dark:text-white text-gray-900 font-medium">
                            <span className={viewLabel}>{displayView}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={statusBadge}>{status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm dark:text-gray-400 text-gray-600">
                            {timeSinceLastActivity}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <ClipboardDocumentListIcon className="h-16 w-16 dark:text-gray-600 text-gray-400 mb-4" />
                <p className="text-sm dark:text-gray-400 text-gray-600">
                  No active stock controllers
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                  Stock controllers will appear here when they log in
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Picker Orders Modal */}
        {selectedPicker && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setSelectedPicker(null)}
              ></div>

              {/* Modal panel */}
              <div className="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-premium-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-scale-in">
                {/* Modal header */}
                <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 flex items-center justify-between dark:border-b border-b dark:border-white/[0.08] border-gray-200">
                  <div>
                    <h3 className="text-lg leading-6 font-semibold dark:text-white text-gray-900">
                      {selectedPicker.name}'s Orders
                    </h3>
                    <p className="mt-1 text-sm dark:text-gray-400 text-gray-600">
                      {pickerOrders?.length || 0} order{pickerOrders?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPicker(null)}
                    className="dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 focus:outline-none transition-colors duration-200 hover:rotate-90 transform"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="px-6 py-5 sm:px-6 max-h-96 overflow-y-auto">
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="dark:text-gray-400 text-gray-500">Loading orders...</div>
                    </div>
                  ) : pickerOrders && pickerOrders.length > 0 ? (
                    <div className="space-y-3">
                      {pickerOrders
                        .sort((a: any, b: any) => {
                          // Find the selected picker's current order ID from picker activity
                          const selectedPickerActivity = Array.isArray(pickerActivity)
                            ? pickerActivity.find((p: any) => p.pickerId === selectedPicker?.id)
                            : undefined;

                          // Orders currently being picked should come first
                          const aIsPicking = selectedPickerActivity?.currentOrderId === a.orderId;
                          const bIsPicking = selectedPickerActivity?.currentOrderId === b.orderId;

                          if (aIsPicking && !bIsPicking) return -1;
                          if (!aIsPicking && bIsPicking) return 1;

                          // Then sort by status (TOTE/PENDING before PICKED)
                          if (a.status !== 'PICKED' && b.status === 'PICKED') return -1;
                          if (a.status === 'PICKED' && b.status !== 'PICKED') return 1;

                          return 0;
                        })
                        .map((order: any) => {
                          // Find selected picker's current order ID from picker activity
                          const selectedPickerActivity = Array.isArray(pickerActivity)
                            ? pickerActivity.find((p: any) => p.pickerId === selectedPicker?.id)
                            : undefined;
                          const isCurrentlyPicking =
                            selectedPickerActivity?.currentOrderId === order.orderId;

                          return (
                            <div
                              key={order.orderId}
                              onClick={() => {
                                console.log('[Dashboard] Order card clicked:', order.orderId);
                                handleViewOrder(order.orderId);
                              }}
                              className="dark:border dark:border-white/[0.08] border border-gray-200 rounded-xl p-4 dark:hover:bg-primary-500/10 hover:bg-primary-50 dark:hover:border-primary-500/30 hover:border-primary-500/30 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold dark:text-white text-gray-900">
                                      {order.orderId}
                                    </h4>
                                    {/* Picking tag - only shown if currently being picked */}
                                    {isCurrentlyPicking && (
                                      <span className="badge badge-success">PICKING</span>
                                    )}
                                    {/* Picked tag - shown if order is fully picked (100% progress or status is PICKED) */}
                                    {!isCurrentlyPicking &&
                                      (order.status === 'PICKED' || order.progress === 100) && (
                                        <span className="badge badge-primary">PICKED</span>
                                      )}
                                    {/* Tote tag - shown if in tote but not currently being picked and not fully picked */}
                                    {!isCurrentlyPicking &&
                                      order.status !== 'PICKED' &&
                                      order.progress < 100 && (
                                        <span className="badge badge-warning">TOTE</span>
                                      )}
                                    {/* Live View indicator - only shown if currently being picked */}
                                    {isCurrentlyPicking && (
                                      <span className="text-xs dark:text-primary-400 text-primary-600 font-medium">
                                        • Live View
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm dark:text-gray-300 text-gray-600 mt-1">
                                    {order.customerName}
                                  </p>
                                  <div className="mt-2 grid grid-cols-3 gap-4 text-xs dark:text-gray-400 text-gray-600">
                                    <div>
                                      <span className="font-medium dark:text-white text-gray-900">
                                        Progress:
                                      </span>{' '}
                                      {order.progress}%
                                    </div>
                                    <div>
                                      <span className="font-medium dark:text-white text-gray-900">
                                        Items:
                                      </span>{' '}
                                      {order.itemCount || 0}
                                    </div>
                                    <div>
                                      <span className="font-medium dark:text-white text-gray-900">
                                        Priority:
                                      </span>{' '}
                                      {order.priority}
                                    </div>
                                  </div>

                                  {/* Items to pick */}
                                  {order.items && order.items.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs font-medium dark:text-gray-300 text-gray-600">
                                        Items to Pick:
                                      </p>
                                      <div className="space-y-1">
                                        {order.items.map((item: any, itemIdx: number) => {
                                          const itemStatusColor =
                                            item.status === 'FULLY_PICKED'
                                              ? 'text-success-400 bg-success-500/10 border-success-500/20'
                                              : item.status === 'PARTIAL_PICKED'
                                                ? 'text-warning-400 bg-warning-500/10 border-warning-500/20'
                                                : 'dark:text-gray-400 text-gray-500 dark:bg-white/[0.02] bg-gray-50 dark:border-white/[0.05] border-gray-200';

                                          return (
                                            <div
                                              key={`${order.orderId}-item-${itemIdx}`}
                                              className={`flex items-center justify-between text-xs p-2 rounded-lg border ${itemStatusColor}`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">{item.sku}</span>
                                                <span className="dark:text-gray-500 text-gray-400">
                                                  •
                                                </span>
                                                <span>{item.name}</span>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <span>Loc: {item.binLocation}</span>
                                                <span>
                                                  {item.pickedQuantity}/{item.quantity}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingBagIcon className="h-14 w-14 dark:text-gray-600 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm dark:text-gray-400 text-gray-600">No orders found</p>
                      <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                        This picker hasn't claimed any orders yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse dark:border-t border-t dark:border-white/[0.08] border-gray-200">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedPicker(null)}
                    className="w-full sm:w-auto sm:text-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Packer Orders Modal */}
        {selectedPacker && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setSelectedPacker(null)}
              ></div>

              {/* Modal panel */}
              <div className="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-premium-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-scale-in">
                {/* Modal header */}
                <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 flex items-center justify-between dark:border-b border-b dark:border-white/[0.08] border-gray-200">
                  <div>
                    <h3 className="text-lg leading-6 font-semibold dark:text-white text-gray-900">
                      {selectedPacker.name}'s Orders
                    </h3>
                    <p className="mt-1 text-sm dark:text-gray-400 text-gray-600">
                      {packerOrders?.length || 0} order{packerOrders?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPacker(null)}
                    className="dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 focus:outline-none transition-colors duration-200 hover:rotate-90 transform"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="px-6 py-5 sm:px-6 max-h-96 overflow-y-auto">
                  {packerOrdersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="dark:text-gray-400 text-gray-500">Loading orders...</div>
                    </div>
                  ) : packerOrders && packerOrders.length > 0 ? (
                    <div className="space-y-3">
                      {packerOrders
                        .sort((a: any, b: any) => {
                          // Find the selected packer's current order ID from packer activity
                          const selectedPackerActivity = Array.isArray(packerActivity)
                            ? packerActivity.find((p: any) => p.packerId === selectedPacker?.id)
                            : undefined;

                          // Orders currently being packed should come first
                          const aIsPacking = selectedPackerActivity?.currentOrderId === a.orderId;
                          const bIsPacking = selectedPackerActivity?.currentOrderId === b.orderId;

                          if (aIsPacking && !bIsPacking) return -1;
                          if (!aIsPacking && bIsPacking) return 1;

                          // Then sort by status
                          if (a.status !== 'PACKED' && b.status === 'PACKED') return -1;
                          if (a.status === 'PACKED' && b.status !== 'PACKED') return 1;

                          return 0;
                        })
                        .map((order: any) => {
                          // Find the selected packer's current order ID from packer activity
                          const selectedPackerActivity = Array.isArray(packerActivity)
                            ? packerActivity.find((p: any) => p.packerId === selectedPacker?.id)
                            : undefined;
                          const isCurrentlyPacking =
                            selectedPackerActivity?.currentOrderId === order.orderId;

                          return (
                            <div
                              key={order.orderId}
                              onClick={() => {
                                console.log(
                                  '[Dashboard] Packer order card clicked:',
                                  order.orderId
                                );
                                handleViewOrder(order.orderId);
                              }}
                              className="dark:border dark:border-white/[0.08] border border-gray-200 rounded-xl p-4 dark:hover:bg-primary-500/10 hover:bg-primary-50 dark:hover:border-primary-500/30 hover:border-primary-500/30 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold dark:text-white text-gray-900">
                                      {order.orderId}
                                    </h4>
                                    {/* PACKING tag - packer is actively working on this order */}
                                    {isCurrentlyPacking && (
                                      <span className="badge badge-success">PACKING</span>
                                    )}
                                    {/* IN QUEUE tag - order is assigned to this packer but not actively being worked on */}
                                    {!isCurrentlyPacking && order.status !== 'PICKED' && (
                                      <span className="badge badge-primary">IN QUEUE</span>
                                    )}
                                    {/* WAITING tag - order is PICKED and NOT assigned to this packer (in general queue) */}
                                    {!isCurrentlyPacking && order.status === 'PICKED' && (
                                      <span className="badge badge-warning">WAITING</span>
                                    )}
                                    {/* Live View indicator - only shown if currently being packed */}
                                    {isCurrentlyPacking && (
                                      <span className="text-xs dark:text-primary-400 text-primary-600 font-medium">
                                        • Live View
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm dark:text-gray-300 text-gray-600 mt-1">
                                    {order.customerName}
                                  </p>
                                  <div className="mt-2 grid grid-cols-3 gap-4 text-xs dark:text-gray-400 text-gray-600">
                                    <div>
                                      <span className="font-medium dark:text-white text-gray-900">
                                        Progress:
                                      </span>{' '}
                                      {order.progress}%
                                    </div>
                                    <div>
                                      <span className="font-medium dark:text-white text-gray-900">
                                        Items:
                                      </span>{' '}
                                      {order.itemCount || 0}
                                    </div>
                                    <div>
                                      <span className="font-medium dark:text-white text-gray-900">
                                        Priority:
                                      </span>{' '}
                                      {order.priority}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CubeIcon className="h-14 w-14 dark:text-gray-600 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm dark:text-gray-400 text-gray-600">No orders found</p>
                      <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                        This packer hasn't claimed any orders yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse dark:border-t border-t dark:border-white/[0.08] border-gray-200">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedPacker(null)}
                    className="w-full sm:w-auto sm:text-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Controller Activity Modal */}
        {selectedController && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setSelectedController(null)}
              ></div>

              {/* Modal panel */}
              <div className="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-premium-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-scale-in">
                {/* Modal header */}
                <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 flex items-center justify-between dark:border-b border-b dark:border-white/[0.08] border-gray-200">
                  <div>
                    <h3 className="text-lg leading-6 font-semibold dark:text-white text-gray-900">
                      {selectedController.name}'s Activity
                    </h3>
                    <p className="mt-1 text-sm dark:text-gray-400 text-gray-600">
                      {controllerTransactions?.length || 0} transaction
                      {controllerTransactions?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedController(null)}
                    className="dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 focus:outline-none transition-colors duration-200 hover:rotate-90 transform"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="px-6 py-5 sm:px-6 max-h-96 overflow-y-auto">
                  {controllerTransactionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="dark:text-gray-400 text-gray-500">
                        Loading transactions...
                      </div>
                    </div>
                  ) : controllerTransactions && controllerTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {controllerTransactions.map((transaction: any) => {
                        // Format transaction type for display
                        let typeBadge = 'badge-info';
                        let displayType = transaction.type || 'UNKNOWN';

                        switch (transaction.type) {
                          case 'STOCK_IN':
                            typeBadge = 'badge-success';
                            displayType = 'Stock In';
                            break;
                          case 'STOCK_OUT':
                            typeBadge = 'badge-warning';
                            displayType = 'Stock Out';
                            break;
                          case 'TRANSFER':
                            typeBadge = 'badge-primary';
                            displayType = 'Transfer';
                            break;
                          case 'ADJUSTMENT':
                            typeBadge = 'badge-warning';
                            displayType = 'Adjustment';
                            break;
                          case 'STOCK_COUNT':
                            typeBadge = 'badge-info';
                            displayType = 'Stock Count';
                            break;
                          default:
                            typeBadge = 'badge-info';
                            displayType = transaction.type;
                        }

                        // Format timestamp
                        const timestamp = transaction.createdAt
                          ? new Date(transaction.createdAt).toLocaleString()
                          : 'Unknown';

                        return (
                          <div
                            key={transaction.transactionId}
                            className="dark:border dark:border-white/[0.08] border border-gray-200 rounded-xl p-4 dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={typeBadge}>{displayType}</span>
                                  <h4 className="text-sm font-semibold dark:text-white text-gray-900">
                                    {transaction.sku}
                                  </h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs dark:text-gray-400 text-gray-600">
                                  <div>
                                    <span className="font-medium dark:text-white text-gray-900">
                                      Bin:
                                    </span>{' '}
                                    {transaction.binLocation || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium dark:text-white text-gray-900">
                                      Quantity:
                                    </span>{' '}
                                    {transaction.quantityChange > 0
                                      ? `+${transaction.quantityChange}`
                                      : transaction.quantityChange}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium dark:text-white text-gray-900">
                                      Reason:
                                    </span>{' '}
                                    {transaction.reason || 'N/A'}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium dark:text-white text-gray-900">
                                      Time:
                                    </span>{' '}
                                    {timestamp}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardDocumentListIcon className="h-14 w-14 dark:text-gray-600 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm dark:text-gray-400 text-gray-600">
                        No transactions found
                      </p>
                      <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                        This stock controller hasn't performed any transactions yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse dark:border-t border-t dark:border-white/[0.08] border-gray-200">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedController(null)}
                    className="w-full sm:w-auto sm:text-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
