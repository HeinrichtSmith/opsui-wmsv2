/**
 * Maintenance page
 *
 * Equipment maintenance and service request management
 * - Unique design: Equipment grid layout with status indicators
 */

import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Header, Button } from '@/components/shared';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserIcon,
  ArrowPathIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'requests' | 'schedule' | 'equipment';

interface MaintenanceRequest {
  requestId: string;
  title: string;
  description: string;
  equipment: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  assignedTo?: string;
  completedAt?: string;
}

interface Equipment {
  id: string;
  name: string;
  location: string;
  status: 'OPERATIONAL' | 'NEEDS_MAINTENANCE' | 'DOWN' | 'IN_SERVICE';
  lastService: string;
  nextService: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Equipment Status Card - distinctive grid layout
function EquipmentStatusCard({
  equipment,
  onClick,
}: {
  equipment: Equipment;
  onClick: () => void;
}) {
  const statusConfig = {
    OPERATIONAL: { color: 'success', icon: CheckCircleIcon, label: 'Operational' },
    NEEDS_MAINTENANCE: { color: 'warning', icon: WrenchScrewdriverIcon, label: 'Needs Service' },
    DOWN: { color: 'error', icon: ExclamationTriangleIcon, label: 'Down' },
    IN_SERVICE: { color: 'primary', icon: ArrowPathIcon, label: 'In Service' },
  };

  const config = statusConfig[equipment.status];
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className="relative p-5 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-300 text-left group"
    >
      {/* Status indicator strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-${config.color}-500`} />

      <div className="flex items-start justify-between mb-3 pl-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">{equipment.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{equipment.location}</p>
        </div>
        <div className={`p-2 rounded-lg bg-${config.color}-500/10`}>
          <StatusIcon className={`h-5 w-5 text-${config.color}-400`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pl-3">
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-xs text-gray-400">Last Service</p>
          <p className="text-sm text-white">{new Date(equipment.lastService).toLocaleDateString()}</p>
        </div>
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-xs text-gray-400">Next Service</p>
          <p className="text-sm text-white">{new Date(equipment.nextService).toLocaleDateString()}</p>
        </div>
      </div>

      <div className={`mt-3 pl-3 text-xs font-medium text-${config.color}-400`}>
        {config.label}
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    IN_PROGRESS: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    COMPLETED: 'bg-success-500/20 text-success-300 border border-success-500/30',
    CANCELLED: 'bg-error-500/20 text-error-300 border border-error-500/30',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    LOW: 'bg-gray-500/10 text-gray-400',
    NORMAL: 'bg-blue-500/10 text-blue-400',
    HIGH: 'bg-orange-500/10 text-orange-400',
    URGENT: 'bg-red-500/10 text-red-400 animate-pulse',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority] || styles.NORMAL}`}>
      {priority}
    </span>
  );
}

function MaintenanceRequestCard({ request }: { request: MaintenanceRequest }) {
  return (
    <Card variant="glass" className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{request.title}</h3>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="text-gray-300">{request.description}</p>
            <p className="text-sm text-gray-400 mt-2">Equipment: {request.equipment}</p>
          </div>
          <WrenchScrewdriverIcon className="h-6 w-6 text-gray-500 flex-shrink-0 ml-4" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Request ID</p>
            <p className="text-white font-medium">{request.requestId}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Created</p>
            <p className="text-white">{new Date(request.createdAt).toLocaleDateString()}</p>
          </div>
          {request.assignedTo && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs">Assigned To</p>
              <p className="text-white flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                {request.assignedTo}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          {request.status === 'PENDING' && (
            <Button variant="primary" size="sm" className="flex-1">
              Start Work
            </Button>
          )}
          {request.status === 'IN_PROGRESS' && (
            <Button variant="success" size="sm" className="flex-1">
              Update Progress
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

function MaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';

  // Mock data for demonstration
  const dashboard = {
    openRequests: 3,
    inProgress: 2,
    completedToday: 5,
    urgent: 1,
    equipmentDown: 1,
    equipmentNeedsService: 3,
  };

  const requests: MaintenanceRequest[] = [
    {
      requestId: 'MAINT-001',
      title: 'Conveyor Belt Repair',
      description: 'Belt 3A showing signs of wear and needs replacement',
      equipment: 'Conveyor System - Belt 3A',
      status: 'PENDING',
      priority: 'HIGH',
      createdAt: '2026-01-19',
    },
    {
      requestId: 'MAINT-002',
      title: 'Forklift Maintenance',
      description: 'Scheduled maintenance for forklift #4',
      equipment: 'Forklift #4',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      createdAt: '2026-01-18',
      assignedTo: 'Maintenance Team A',
    },
    {
      requestId: 'MAINT-003',
      title: 'HVAC System Check',
      description: 'Routine quarterly maintenance for warehouse HVAC',
      equipment: 'HVAC System',
      status: 'COMPLETED',
      priority: 'LOW',
      createdAt: '2026-01-17',
      completedAt: '2026-01-19',
    },
  ];

  const equipment: Equipment[] = [
    {
      id: 'EQ-001',
      name: 'Conveyor Belt 3A',
      location: 'Zone A - Row 3',
      status: 'DOWN',
      lastService: '2025-12-15',
      nextService: '2026-01-20',
    },
    {
      id: 'EQ-002',
      name: 'Forklift #4',
      location: 'Dock Area',
      status: 'IN_SERVICE',
      lastService: '2026-01-15',
      nextService: '2026-02-15',
    },
    {
      id: 'EQ-003',
      name: 'Pallet Wrapper',
      location: 'Shipping Area',
      status: 'OPERATIONAL',
      lastService: '2026-01-10',
      nextService: '2026-04-10',
    },
    {
      id: 'EQ-004',
      name: 'HVAC System',
      location: 'Building Central',
      status: 'OPERATIONAL',
      lastService: '2026-01-17',
      nextService: '2026-04-17',
    },
    {
      id: 'EQ-005',
      name: 'Dock Door 1',
      location: 'Loading Dock',
      status: 'NEEDS_MAINTENANCE',
      lastService: '2025-11-20',
      nextService: '2026-01-25',
    },
    {
      id: 'EQ-006',
      name: 'Compactor',
      location: 'Waste Area',
      status: 'NEEDS_MAINTENANCE',
      lastService: '2025-12-01',
      nextService: '2026-01-22',
    },
  ];

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Equipment Maintenance</h1>
            <p className="mt-2 text-gray-400">Manage service requests and equipment status</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            New Request
          </Button>
        </div>

        {/* Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6 border-l-4 border-l-warning-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Open Requests</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.openRequests}</p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-warning-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">In Progress</p>
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
              <Card variant="glass" className="p-6 border-l-4 border-l-error-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Urgent</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.urgent}</p>
                  </div>
                  <BellIcon className="h-8 w-8 text-error-400 animate-pulse" />
                </div>
              </Card>
            </div>

            {/* Equipment Overview Grid */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Equipment Overview</CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-success-500"></span>
                      Operational ({equipment.filter(e => e.status === 'OPERATIONAL').length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-warning-500"></span>
                      Needs Service ({equipment.filter(e => e.status === 'NEEDS_MAINTENANCE').length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-error-500"></span>
                      Down ({equipment.filter(e => e.status === 'DOWN').length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                      In Service ({equipment.filter(e => e.status === 'IN_SERVICE').length})
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((eq) => (
                    <EquipmentStatusCard
                      key={eq.id}
                      equipment={eq}
                      onClick={() => {/* Navigate to equipment details */}}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Requests</CardTitle>
                  <Button variant="secondary" size="sm" onClick={() => setTab('requests')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {requests.slice(0, 2).map((request) => (
                    <MaintenanceRequestCard key={request.requestId} request={request} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests Tab */}
        {currentTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Maintenance Requests</h2>
                <p className="text-gray-400 text-sm mt-1">All service requests and work orders</p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Request
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {requests.map((request) => (
                <MaintenanceRequestCard key={request.requestId} request={request} />
              ))}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {currentTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Maintenance Schedule</h2>
              <p className="text-gray-400 text-sm mt-1">Calendar view of scheduled maintenance</p>
            </div>
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <ClockIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Schedule View</h3>
                <p className="text-gray-400">Calendar view of maintenance schedules coming soon</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Equipment Tab */}
        {currentTab === 'equipment' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Equipment Registry</h2>
              <p className="text-gray-400 text-sm mt-1">All warehouse equipment and status</p>
            </div>
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((eq) => (
                    <EquipmentStatusCard
                      key={eq.id}
                      equipment={eq}
                      onClick={() => {/* Navigate to equipment details */}}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default MaintenancePage;
