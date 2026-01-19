/**
 * Production page
 *
 * Production management for manufacturing and assembly operations
 * - Unique design: Manufacturing line layout with production stages
 */

import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Header, Button } from '@/components/shared';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  CogIcon,
  UserIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'orders' | 'schedule' | 'maintenance';

interface ProductionOrder {
  orderId: string;
  productSku: string;
  productName: string;
  quantity: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  startDate: string;
  endDate?: string;
  assignedTo?: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Production Line Stage - horizontal progress indicator
function ProductionLineStage({
  label,
  count,
  isActive,
  isCompleted,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 relative p-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20'
          : isCompleted
            ? 'bg-success-500/10 border border-success-500/30 cursor-pointer hover:border-success-500/50'
            : 'bg-gray-800/50 border border-gray-700 cursor-pointer hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-sm font-semibold ${
            isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-gray-400'
          }`}
        >
          {label}
        </span>
        <span
          className={`text-2xl font-bold ${
            isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-gray-500'
          }`}
        >
          {count}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            isActive ? 'bg-primary-500' : isCompleted ? 'bg-success-500' : 'bg-gray-600'
          }`}
          style={{ width: isActive ? '75%' : isCompleted ? '100%' : '0%' }}
        />
      </div>

      {/* Arrow connector on the right */}
      <div
        className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${
          isCompleted ? 'text-success-500' : 'text-gray-700'
        }`}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    IN_PROGRESS: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    COMPLETED: 'bg-success-500/20 text-success-300 border border-success-500/30',
    ON_HOLD: 'bg-warning-500/20 text-warning-300 border border-warning-500/30',
  };

  const labels: Record<string, string> = {
    PENDING: 'Queued',
    IN_PROGRESS: 'In Production',
    COMPLETED: 'Finished',
    ON_HOLD: 'On Hold',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}
    >
      {labels[status] || status}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-500',
    NORMAL: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500 animate-pulse',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[priority] || colors.NORMAL}`} />
      <span className="text-xs text-gray-400">{priority}</span>
    </div>
  );
}

function ProductionOrderCard({ order }: { order: ProductionOrder }) {
  const progress =
    order.status === 'COMPLETED'
      ? 100
      : order.status === 'IN_PROGRESS'
        ? 60
        : order.status === 'ON_HOLD'
          ? 30
          : 0;

  return (
    <Card variant="glass" className="card-hover overflow-hidden">
      {/* Status bar */}
      <div
        className={`h-1 ${
          order.status === 'COMPLETED'
            ? 'bg-success-500'
            : order.status === 'IN_PROGRESS'
              ? 'bg-primary-500'
              : order.status === 'ON_HOLD'
                ? 'bg-warning-500'
                : 'bg-gray-500'
        }`}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{order.orderId}</h3>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-gray-300 font-medium">{order.productName}</p>
            <p className="text-sm text-gray-400 mt-1">SKU: {order.productSku}</p>
          </div>
          <PriorityIndicator priority={order.priority} />
        </div>

        {/* Production progress */}
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Production Progress</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                order.status === 'COMPLETED'
                  ? 'bg-success-500'
                  : order.status === 'IN_PROGRESS'
                    ? 'bg-primary-500'
                    : order.status === 'ON_HOLD'
                      ? 'bg-warning-500'
                      : 'bg-gray-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Quantity</p>
            <p className="text-lg font-bold text-white">{order.quantity}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Start Date</p>
            <p className="text-sm text-white">{new Date(order.startDate).toLocaleDateString()}</p>
          </div>
          {order.endDate && (
            <div className="bg-white/5 p-3 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">End Date</p>
              <p className="text-sm text-success-400">
                {new Date(order.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {order.assignedTo && (
          <div className="flex items-center gap-2 p-2 bg-primary-500/10 rounded-lg mb-4">
            <UserIcon className="h-4 w-4 text-primary-400" />
            <span className="text-sm text-gray-300">
              Assigned to: <span className="text-white font-medium">{order.assignedTo}</span>
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          {order.status === 'PENDING' && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <PlayIcon className="h-4 w-4" />
              Start
            </Button>
          )}
          {order.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="warning"
                size="sm"
                className="flex-1 flex items-center justify-center gap-1"
              >
                <PauseIcon className="h-4 w-4" />
                Pause
              </Button>
              <Button variant="success" size="sm" className="flex-1">
                Complete
              </Button>
            </>
          )}
          {order.status === 'ON_HOLD' && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <PlayIcon className="h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function ProductionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';

  // Mock data for demonstration
  const dashboard = {
    queued: 8,
    inProgress: 5,
    completedToday: 12,
    onHold: 2,
  };

  const orders: ProductionOrder[] = [
    {
      orderId: 'PROD-001',
      productSku: 'PROD-A-001',
      productName: 'Assembly Widget Type A',
      quantity: 500,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: '2026-01-19',
      assignedTo: 'Production Team A',
    },
    {
      orderId: 'PROD-002',
      productSku: 'PROD-B-002',
      productName: 'Assembly Component Type B',
      quantity: 250,
      status: 'PENDING',
      priority: 'NORMAL',
      startDate: '2026-01-20',
    },
    {
      orderId: 'PROD-003',
      productSku: 'PROD-C-003',
      productName: 'Custom Assembly Type C',
      quantity: 100,
      status: 'COMPLETED',
      priority: 'LOW',
      startDate: '2026-01-18',
      endDate: '2026-01-19',
    },
    {
      orderId: 'PROD-004',
      productSku: 'PROD-D-004',
      productName: 'Precision Component D',
      quantity: 75,
      status: 'ON_HOLD',
      priority: 'URGENT',
      startDate: '2026-01-17',
      assignedTo: 'Production Team B',
    },
  ];

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Production line stages
  const stages = [
    { id: 'queued' as const, label: 'Queued', count: dashboard.queued, tab: 'orders' as TabType },
    {
      id: 'in-progress' as const,
      label: 'In Production',
      count: dashboard.inProgress,
      tab: 'orders' as TabType,
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      count: dashboard.completedToday,
      tab: 'orders' as TabType,
    },
    { id: 'on-hold' as const, label: 'On Hold', count: dashboard.onHold, tab: 'orders' as TabType },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Production Line</h1>
          <p className="mt-2 text-gray-400">Manufacturing and assembly operations management</p>
        </div>

        {/* Production Line Stages */}
        <div className="flex items-stretch gap-2 mb-8">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex-1 relative">
              <ProductionLineStage
                label={stage.label}
                count={stage.count}
                isActive={false}
                isCompleted={index < 2}
                onClick={() => setTab(stage.tab)}
              />
              {index === stages.length - 1 && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                  <CheckCircleIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6 border-l-4 border-l-gray-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Queued Orders</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.queued}</p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">In Production</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.inProgress}</p>
                  </div>
                  <WrenchScrewdriverIcon className="h-8 w-8 text-primary-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-success-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed Today</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.completedToday}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-success-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-warning-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">On Hold</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.onHold}</p>
                  </div>
                  <PauseIcon className="h-8 w-8 text-warning-400" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Production Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Production Order</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('orders')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5" />
                    <span>View All Orders</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('schedule')}
                  >
                    <ClockIcon className="h-5 w-5" />
                    <span>Production Schedule</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {currentTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Production Orders</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Manage manufacturing orders and track progress
                </p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Order
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.map(order => (
                <ProductionOrderCard key={order.orderId} order={order} />
              ))}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {currentTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Production Schedule</h2>
              <p className="text-gray-400 text-sm mt-1">Calendar view of production schedules</p>
            </div>
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <ClockIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Schedule View</h3>
                <p className="text-gray-400">Calendar view of production schedules coming soon</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Maintenance Tab */}
        {currentTab === 'maintenance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Equipment Maintenance</h2>
              <p className="text-gray-400 text-sm mt-1">Manage production equipment maintenance</p>
            </div>
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <CogIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Equipment Management</h3>
                <p className="text-gray-400">
                  Equipment maintenance and service requests coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProductionPage;
