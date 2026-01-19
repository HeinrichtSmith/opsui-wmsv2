/**
 * Cycle Counting Page
 *
 * Interface for scheduling and performing cycle counts
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCycleCountPlans,
  useCycleCountTolerances,
  useCreateCycleCountPlan,
  useStartCycleCount,
  useCompleteCycleCount,
  useReconcileCycleCount,
  useCreateCycleCountEntry,
  useUpdateVarianceStatus,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import { CycleCountStatus, CycleCountType, VarianceStatus, UserRole } from '@opsui/shared';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  PlayIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared';

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: CycleCountStatus }) {
  const styles = {
    [CycleCountStatus.SCHEDULED]: 'bg-gray-100 text-gray-800',
    [CycleCountStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [CycleCountStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [CycleCountStatus.RECONCILED]: 'bg-purple-100 text-purple-800',
    [CycleCountStatus.CANCELLED]: 'bg-red-100 text-red-800',
  };

  const labels = {
    [CycleCountStatus.SCHEDULED]: 'Scheduled',
    [CycleCountStatus.IN_PROGRESS]: 'In Progress',
    [CycleCountStatus.COMPLETED]: 'Completed',
    [CycleCountStatus.RECONCILED]: 'Reconciled',
    [CycleCountStatus.CANCELLED]: 'Cancelled',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function VarianceStatusBadge({ status }: { status: VarianceStatus }) {
  const styles = {
    [VarianceStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [VarianceStatus.APPROVED]: 'bg-green-100 text-green-800',
    [VarianceStatus.REJECTED]: 'bg-red-100 text-red-800',
    [VarianceStatus.AUTO_ADJUSTED]: 'bg-blue-100 text-blue-800',
  };

  const labels = {
    [VarianceStatus.PENDING]: 'Pending Review',
    [VarianceStatus.APPROVED]: 'Approved',
    [VarianceStatus.REJECTED]: 'Rejected',
    [VarianceStatus.AUTO_ADJUSTED]: 'Auto-Adjusted',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function CreateCycleCountModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const createMutation = useCreateCycleCountPlan();
  const [formData, setFormData] = useState({
    planName: '',
    countType: CycleCountType.AD_HOC,
    scheduledDate: new Date().toISOString().split('T')[0],
    location: '',
    sku: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        ...formData,
        countBy: user!.userId,
        createdBy: user!.userId,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create cycle count plan:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Create Cycle Count Plan</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plan Name *</label>
            <input
              type="text"
              required
              value={formData.planName}
              onChange={e => setFormData({ ...formData, planName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              placeholder="e.g., Zone A Weekly Count"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Count Type *</label>
            <select
              required
              value={formData.countType}
              onChange={e =>
                setFormData({ ...formData, countType: e.target.value as CycleCountType })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value={CycleCountType.AD_HOC}>Ad-Hoc Count</option>
              <option value={CycleCountType.ABC}>ABC Analysis Count</option>
              <option value={CycleCountType.BLANKET}>Blanket Count</option>
              <option value={CycleCountType.SPOT_CHECK}>Spot Check</option>
              <option value={CycleCountType.RECEIVING}>Receiving Count</option>
              <option value={CycleCountType.SHIPPING}>Shipping Count</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled Date *</label>
            <input
              type="date"
              required
              value={formData.scheduledDate}
              onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Location (Optional - leave blank for all locations)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              placeholder="e.g., Zone-A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              SKU (Optional - leave blank for all SKUs)
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              placeholder="e.g., SKU-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              placeholder="Additional instructions or notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CountEntryModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const createEntryMutation = useCreateCycleCountEntry();
  const [formData, setFormData] = useState({
    sku: '',
    binLocation: '',
    countedQuantity: 0,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEntryMutation.mutateAsync({
        planId: plan.planId,
        ...formData,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create count entry:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Record Count Entry</h2>
          <p className="text-sm text-gray-500 mt-1">Plan: {plan.planName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="SKU-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location *</label>
            <input
              type="text"
              required
              value={formData.binLocation}
              onChange={e => setFormData({ ...formData, binLocation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Zone-A-01-01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Counted Quantity *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.countedQuantity}
              onChange={e =>
                setFormData({ ...formData, countedQuantity: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any observations or issues..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEntryMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanDetailModal({ plan, onClose }: { plan: any; onClose: () => void }) {
  const startMutation = useStartCycleCount();
  const completeMutation = useCompleteCycleCount();
  const reconcileMutation = useReconcileCycleCount();
  const [showEntryModal, setShowEntryModal] = useState(false);

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(plan.planId);
      onClose();
    } catch (error) {
      console.error('Failed to start cycle count:', error);
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync(plan.planId);
      onClose();
    } catch (error) {
      console.error('Failed to complete cycle count:', error);
    }
  };

  const handleReconcile = async () => {
    try {
      await reconcileMutation.mutateAsync({ planId: plan.planId });
      onClose();
    } catch (error) {
      console.error('Failed to reconcile cycle count:', error);
    }
  };

  const pendingVarianceCount =
    plan.countEntries?.filter(
      (e: any) => e.varianceStatus === VarianceStatus.PENDING && e.variance !== 0
    ).length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8">
        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{plan.planName}</h2>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={plan.status} />
              <span className="text-sm text-gray-500">
                Scheduled: {new Date(plan.scheduledDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium">{plan.countType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Assigned To</p>
              <p className="font-medium">{plan.countBy}</p>
            </div>
            {plan.location && (
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{plan.location}</p>
              </div>
            )}
            {plan.sku && (
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-medium">{plan.sku}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {plan.status === CycleCountStatus.SCHEDULED && (
              <button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4" />
                {startMutation.isPending ? 'Starting...' : 'Start Count'}
              </button>
            )}
            {plan.status === CycleCountStatus.IN_PROGRESS && (
              <>
                <button
                  onClick={() => setShowEntryModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Entry
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  {completeMutation.isPending ? 'Completing...' : 'Complete Count'}
                </button>
              </>
            )}
            {plan.status === CycleCountStatus.COMPLETED && pendingVarianceCount === 0 && (
              <button
                onClick={handleReconcile}
                disabled={reconcileMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <ChartBarIcon className="h-4 w-4" />
                {reconcileMutation.isPending ? 'Reconciling...' : 'Reconcile'}
              </button>
            )}
            {pendingVarianceCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {pendingVarianceCount} variance(s) pending review
              </div>
            )}
          </div>

          {/* Count Entries */}
          {plan.countEntries && plan.countEntries.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Count Entries</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Location
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        System Qty
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Counted Qty
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Variance
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {plan.countEntries.map((entry: any) => (
                      <tr key={entry.entryId}>
                        <td className="px-4 py-2 text-sm font-medium">{entry.sku}</td>
                        <td className="px-4 py-2 text-sm">{entry.binLocation}</td>
                        <td className="px-4 py-2 text-sm text-right">{entry.systemQuantity}</td>
                        <td className="px-4 py-2 text-sm text-right">{entry.countedQuantity}</td>
                        <td
                          className={`px-4 py-2 text-sm text-right font-medium ${entry.variance !== 0 ? (entry.variance > 0 ? 'text-green-600' : 'text-red-600') : ''}`}
                        >
                          {entry.variance > 0 ? '+' : ''}
                          {entry.variance}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <VarianceStatusBadge status={entry.varianceStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {plan.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{plan.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showEntryModal && (
        <CountEntryModal plan={plan} onClose={() => setShowEntryModal(false)} onSuccess={onClose} />
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function CycleCountingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const {
    data: plansData,
    isLoading,
    refetch,
  } = useCycleCountPlans({
    status: filterStatus || undefined,
  });

  const plans = plansData?.plans || [];

  const canCreatePlan =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Cycle Counting</h1>
              <p className="text-gray-400 mt-1">
                Manage scheduled and ad-hoc inventory cycle counts
              </p>
            </div>
            {canCreatePlan && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
                New Cycle Count
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="glass-card rounded-lg p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="">All Statuses</option>
                  <option value={CycleCountStatus.SCHEDULED}>Scheduled</option>
                  <option value={CycleCountStatus.IN_PROGRESS}>In Progress</option>
                  <option value={CycleCountStatus.COMPLETED}>Completed</option>
                  <option value={CycleCountStatus.RECONCILED}>Reconciled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Plans List */}
          <div className="glass-card rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading cycle count plans...</div>
            ) : plans.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No cycle count plans found</p>
                {canCreatePlan && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-blue-400 hover:text-blue-300"
                  >
                    Create your first cycle count plan
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Plan Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Scheduled Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Location/SKU
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                        Entries
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                    {plans.map((plan: any) => {
                      const pendingVariances =
                        plan.countEntries?.filter(
                          (e: any) =>
                            e.varianceStatus === VarianceStatus.PENDING && e.variance !== 0
                        ).length || 0;

                      return (
                        <tr key={plan.planId} className="hover:bg-gray-800/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{plan.planName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">{plan.countType}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {new Date(plan.scheduledDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {plan.location || plan.sku || 'All Locations/SKUs'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <StatusBadge status={plan.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-white">
                              {plan.countEntries?.length || 0}
                              {pendingVariances > 0 && (
                                <span className="ml-2 text-yellow-400">
                                  ({pendingVariances} pending)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">{plan.countBy}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedPlan(plan)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showCreateModal && (
            <CreateCycleCountModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                refetch();
              }}
            />
          )}

          {selectedPlan && (
            <PlanDetailModal
              plan={selectedPlan}
              onClose={() => {
                setSelectedPlan(null);
                refetch();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
