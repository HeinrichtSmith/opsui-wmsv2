/**
 * Inwards Goods page
 *
 * Comprehensive inbound receiving interface for inwards goods personnel
 * Features: ASN management, receiving workflow, quality checks, putaway tasks
 * - Unique design: Workflow-focused with progress stages
 */

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useInwardsDashboard,
  useASNs,
  useReceipts,
  usePutawayTasks,
  useCreateASN,
  useCreateReceipt,
  useUpdateASNStatus,
} from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent, Header, Button } from '@/components/shared';
import {
  InboxIcon,
  TruckIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  CubeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { PageLoading } from '@/components/shared';
import {
  ASNStatus,
  ReceiptStatus,
  PutawayStatus,
  type AdvanceShippingNotice,
  type Receipt,
  type PutawayTask,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

type WorkflowStage = 'dashboard' | 'asn' | 'receiving' | 'putaway';

interface StageConfig {
  id: WorkflowStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function WorkflowStage({
  stage,
  isActive,
  isCompleted,
  onClick,
}: {
  stage: StageConfig;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const StageIcon = stage.icon;

  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center p-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-primary-500/20 border-2 border-primary-500'
          : isCompleted
          ? 'bg-success-500/10 border border-success-500/30 cursor-pointer hover:border-success-500/50'
          : 'bg-gray-800/50 border border-gray-700 cursor-pointer hover:border-gray-600'
      }`}
    >
      <div className={`p-3 rounded-full mb-2 ${
        isActive
          ? 'bg-primary-500 text-white'
          : isCompleted
          ? 'bg-success-500/20 text-success-400'
          : 'bg-gray-700 text-gray-400'
      }`}>
        <StageIcon className="h-6 w-6" />
      </div>
      <span className={`text-sm font-semibold ${
        isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-gray-400'
      }`}>
        {stage.label}
      </span>

      {/* Connection line */}
      <div className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${
        isCompleted ? 'text-success-500' : 'text-gray-700'
      }`}>
        <ArrowRightIcon className="h-6 w-6" />
      </div>
    </button>
  );
}

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
    primary: 'from-primary-500/20 to-primary-500/5 border-primary-500/30',
    success: 'from-success-500/20 to-success-500/5 border-success-500/30',
    warning: 'from-warning-500/20 to-warning-500/5 border-warning-500/30',
    error: 'from-error-500/20 to-error-500/5 border-error-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} border rounded-xl p-6 card-hover`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <Icon className={`h-8 w-8 text-${color === 'primary' ? 'primary' : color}-400`} />
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  type = 'asn',
}: {
  status: string;
  type?: 'asn' | 'receipt' | 'putaway';
}) {
  const getStatusStyles = () => {
    if (type === 'asn') {
      switch (status) {
        case ASNStatus.PENDING:
          return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
        case ASNStatus.IN_TRANSIT:
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case ASNStatus.RECEIVED:
          return 'bg-success-500/20 text-success-300 border border-success-500/30';
        case ASNStatus.PARTIALLY_RECEIVED:
          return 'bg-warning-500/20 text-warning-300 border border-warning-500/30';
        case ASNStatus.CANCELLED:
          return 'bg-error-500/20 text-error-300 border border-error-500/30';
        default:
          return 'bg-gray-500/20 text-gray-300';
      }
    } else if (type === 'receipt') {
      switch (status) {
        case ReceiptStatus.RECEIVING:
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case ReceiptStatus.COMPLETED:
          return 'bg-success-500/20 text-success-300 border border-success-500/30';
        case ReceiptStatus.CANCELLED:
          return 'bg-error-500/20 text-error-300 border border-error-500/30';
        default:
          return 'bg-gray-500/20 text-gray-300';
      }
    } else {
      switch (status) {
        case PutawayStatus.PENDING:
          return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
        case PutawayStatus.IN_PROGRESS:
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case PutawayStatus.COMPLETED:
          return 'bg-success-500/20 text-success-300 border border-success-500/30';
        case PutawayStatus.CANCELLED:
          return 'bg-error-500/20 text-error-300 border border-error-500/30';
        default:
          return 'bg-gray-500/20 text-gray-300';
      }
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ASNCard({ asn, onViewDetails, onStartReceiving }: {
  asn: AdvanceShippingNotice;
  onViewDetails: (asnId: string) => void;
  onStartReceiving: (asnId: string) => void;
}) {
  const itemCount = asn.lineItems?.length || 0;
  const totalExpected = asn.lineItems?.reduce((sum, item) => sum + item.expectedQuantity, 0) || 0;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-blue-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{asn.purchaseOrderNumber}</h3>
              <StatusBadge status={asn.status} type="asn" />
            </div>
            <p className="text-sm text-gray-400">Supplier: {asn.supplierId}</p>
          </div>
          <TruckIcon className="h-8 w-8 text-blue-400" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Expected</p>
            <p className="text-white font-medium">
              {new Date(asn.expectedArrivalDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Items</p>
            <p className="text-white font-medium">{itemCount} ({totalExpected} units)</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Carrier</p>
            <p className="text-white font-medium">{asn.carrier || 'TBD'}</p>
          </div>
        </div>

        {asn.status === ASNStatus.IN_TRANSIT && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(asn.asnId)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStartReceiving(asn.asnId)}
              className="flex-1"
            >
              <InboxIcon className="h-4 w-4 mr-1" />
              Start Receiving
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReceiptCard({ receipt, onViewDetails }: {
  receipt: Receipt;
  onViewDetails: (receiptId: string) => void;
}) {
  const itemCount = receipt.lineItems?.length || 0;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-orange-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{receipt.receiptId}</h3>
              <StatusBadge status={receipt.status} type="receipt" />
            </div>
            <p className="text-sm text-gray-400">
              {new Date(receipt.receiptDate).toLocaleString()}
            </p>
          </div>
          <InboxIcon className="h-8 w-8 text-orange-400" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Type</p>
            <p className="text-white font-medium">{receipt.receiptType}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Items</p>
            <p className="text-white font-medium">{itemCount}</p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewDetails(receipt.receiptId)}
          className="w-full"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

function PutawayTaskCard({ task, onAssign, onUpdate }: {
  task: PutawayTask;
  onAssign: (taskId: string) => void;
  onUpdate: (taskId: string) => void;
}) {
  const progress = task.quantityToPutaway > 0
    ? Math.round((task.quantityPutaway / task.quantityToPutaway) * 100)
    : 0;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-purple-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{task.sku}</h3>
              <StatusBadge status={task.status} type="putaway" />
            </div>
            <p className="text-sm text-gray-400">
              Target: <span className="text-white font-medium">{task.targetBinLocation}</span>
            </p>
          </div>
          <CubeIcon className="h-8 w-8 text-purple-400" />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">
              {task.quantityPutaway} / {task.quantityToPutaway}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {task.status === PutawayStatus.PENDING && !task.assignedTo && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAssign(task.putawayTaskId)}
              className="flex-1"
            >
              Assign Task
            </Button>
          )}
          {task.assignedTo && task.status === PutawayStatus.IN_PROGRESS && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdate(task.putawayTaskId)}
              className="flex-1"
            >
              Update Progress
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MODALS (simplified for brevity - same as before)
// ============================================================================

function CreateASNModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createASN = useCreateASN();
  const [supplierId, setSupplierId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createASN.mutateAsync({
        supplierId,
        purchaseOrderNumber: poNumber,
        expectedArrivalDate: new Date(expectedDate),
        carrier: '',
        trackingNumber: '',
        shipmentNotes: '',
        lineItems: [{ sku: 'SKU-001', expectedQuantity: 1, unitCost: 0 }],
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create ASN:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create ASN</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Supplier ID</label>
              <input
                type="text"
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="SUP-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">PO Number</label>
              <input
                type="text"
                required
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="PO-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Arrival</label>
              <input
                type="date"
                required
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" disabled={createASN.isPending} className="flex-1">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateReceiptModal({ asnId, onClose, onSuccess }: {
  asnId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createReceipt = useCreateReceipt();
  const [receiptType, setReceiptType] = useState<'PO' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT'>('PO');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReceipt.mutateAsync({
        asnId,
        receiptType,
        lineItems: [{ sku: 'SKU-001', quantityOrdered: 10, quantityReceived: 10, quantityDamaged: 0 }],
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create receipt:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Receipt</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Receipt Type</label>
              <select
                value={receiptType}
                onChange={(e) => setReceiptType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="PO">Purchase Order</option>
                <option value="RETURN">Customer Return</option>
                <option value="TRANSFER">Warehouse Transfer</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" disabled={createReceipt.isPending} className="flex-1">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function InwardsGoodsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStage = (searchParams.get('tab') as WorkflowStage) || 'dashboard';
  const navigate = useNavigate();

  const [asnModalOpen, setAsnModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const { data: dashboard, isLoading } = useInwardsDashboard();
  const { data: asns, refetch: refetchAsns } = useASNs({ enabled: currentStage === 'asn' });
  const { data: receipts, refetch: refetchReceipts } = useReceipts({ enabled: currentStage === 'receiving' });
  const { data: putawayTasks } = usePutawayTasks({ enabled: currentStage === 'putaway' });

  const updateASNStatus = useUpdateASNStatus();

  const stages: StageConfig[] = [
    { id: 'dashboard', label: 'Overview', icon: CubeIcon, description: 'Dashboard and metrics' },
    { id: 'asn', label: 'ASN', icon: TruckIcon, description: 'Advance Shipping Notices' },
    { id: 'receiving', label: 'Receiving', icon: InboxIcon, description: 'Receive incoming goods' },
    { id: 'putaway', label: 'Putaway', icon: CubeIcon, description: 'Store items in bins' },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === currentStage);

  const handleStartReceiving = async (asnId: string) => {
    try {
      await updateASNStatus.mutateAsync({ asnId, status: ASNStatus.RECEIVED });
      setReceiptModalOpen(true);
      refetchAsns();
    } catch (error) {
      console.error('Failed to update ASN status:', error);
    }
  };

  if (isLoading && currentStage === 'dashboard') {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workflow Stages */}
        <div className="flex items-stretch gap-2 mb-8">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex-1 relative">
              <WorkflowStage
                stage={stage}
                isActive={stage.id === currentStage}
                isCompleted={index < currentStageIndex}
                onClick={() => setSearchParams({ tab: stage.id })}
              />
              {index === stages.length - 1 && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                  <CheckCircleIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dashboard Stage */}
        {currentStage === 'dashboard' && dashboard && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Receiving Overview</h2>
              <div className="text-sm text-gray-400">
                Track your inbound shipments from ASN to putaway
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard title="Pending ASNs" value={dashboard.pendingASNs} icon={TruckIcon} color="primary" />
              <MetricCard title="Active Receipts" value={dashboard.activeReceipts} icon={InboxIcon} color="warning" />
              <MetricCard title="Pending Putaway" value={dashboard.pendingPutaway} icon={CubeIcon} color="error" />
              <MetricCard title="Received Today" value={dashboard.todayReceived} icon={CheckCircleIcon} color="success" />
            </div>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Button variant="primary" size="lg" onClick={() => setAsnModalOpen(true)} className="flex items-center justify-center gap-2">
                    <PlusIcon className="h-5 w-5" />
                    New ASN
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => setReceiptModalOpen(true)} className="flex items-center justify-center gap-2">
                    <InboxIcon className="h-5 w-5" />
                    New Receipt
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => setSearchParams({ tab: 'putaway' })} className="flex items-center justify-center gap-2">
                    <CubeIcon className="h-5 w-5" />
                    View Putaway
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ASN Stage */}
        {currentStage === 'asn' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Advance Shipping Notices</h2>
                <p className="text-gray-400 text-sm mt-1">Track incoming shipments before arrival</p>
              </div>
              <Button variant="primary" onClick={() => setAsnModalOpen(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                New ASN
              </Button>
            </div>

            {asns && asns.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {asns.map((asn: AdvanceShippingNotice) => (
                  <ASNCard
                    key={asn.asnId}
                    asn={asn}
                    onViewDetails={(id) => navigate(`/inwards/asn/${id}`)}
                    onStartReceiving={handleStartReceiving}
                  />
                ))}
              </div>
            ) : (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <TruckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No ASNs</h3>
                  <p className="text-gray-400">Create an ASN to track incoming shipments</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Receiving Stage */}
        {currentStage === 'receiving' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Receiving Dock</h2>
                <p className="text-gray-400 text-sm mt-1">Receive and verify incoming goods</p>
              </div>
              <Button variant="primary" onClick={() => setReceiptModalOpen(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                New Receipt
              </Button>
            </div>

            {receipts && receipts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {receipts.map((receipt: Receipt) => (
                  <ReceiptCard
                    key={receipt.receiptId}
                    receipt={receipt}
                    onViewDetails={(id) => navigate(`/inwards/receipt/${id}`)}
                  />
                ))}
              </div>
            ) : (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <InboxIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Receipts</h3>
                  <p className="text-gray-400">Create a receipt to record incoming goods</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Putaway Stage */}
        {currentStage === 'putaway' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Putaway Tasks</h2>
              <p className="text-gray-400 text-sm mt-1">Store received items in their bin locations</p>
            </div>

            {putawayTasks && putawayTasks.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {putawayTasks.map((task: PutawayTask) => (
                  <PutawayTaskCard
                    key={task.putawayTaskId}
                    task={task}
                    onAssign={(id) => navigate(`/inwards/putaway/${id}`)}
                    onUpdate={() => {/* TODO */}}
                  />
                ))}
              </div>
            ) : (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <CubeIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Putaway Tasks</h3>
                  <p className="text-gray-400">Putaway tasks appear after receiving goods</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {asnModalOpen && <CreateASNModal onClose={() => setAsnModalOpen(false)} onSuccess={() => refetchAsns()} />}
      {receiptModalOpen && <CreateReceiptModal onClose={() => setReceiptModalOpen(false)} onSuccess={() => refetchReceipts()} />}
    </div>
  );
}

export default InwardsGoodsPage;
