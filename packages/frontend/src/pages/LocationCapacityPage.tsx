/**
 * Location Capacity Page
 *
 * Interface for managing location capacity rules and viewing alerts
 */

import { useState } from 'react';
import {
  useCapacityRules,
  useLocationCapacities,
  useCapacityAlerts,
  useCreateCapacityRule,
  useUpdateCapacityRule,
  useDeleteCapacityRule,
  useAcknowledgeAlert,
  useRecalculateCapacity,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import { CapacityType, CapacityRuleStatus, CapacityUnit, UserRole, BinType } from '@opsui/shared';
import {
  CubeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared';

// ============================================================================
// COMPONENTS
// ============================================================================

function CapacityBar({
  utilization,
  maximum,
  warningThreshold,
}: {
  utilization: number;
  maximum: number;
  warningThreshold: number;
}) {
  const percent = (utilization / maximum) * 100;
  const isWarning = percent >= warningThreshold;
  const isCritical = percent >= 100;

  return (
    <div className="relative">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>
          {utilization.toFixed(1)} / {maximum} {utilization > maximum ? '⚠' : ''}
        </span>
        <span>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function CapacityRuleModal({
  rule,
  onClose,
  onSuccess,
}: {
  rule?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createMutation = useCreateCapacityRule();
  const updateMutation = useUpdateCapacityRule();
  const isEdit = !!rule;

  const [formData, setFormData] = useState({
    ruleName: rule?.ruleName || '',
    description: rule?.description || '',
    capacityType: rule?.capacityType || CapacityType.QUANTITY,
    capacityUnit: rule?.capacityUnit || CapacityUnit.UNITS,
    appliesTo: rule?.appliesTo || 'ALL',
    zone: rule?.zone || '',
    locationType: rule?.locationType || '',
    specificLocation: rule?.specificLocation || '',
    maximumCapacity: rule?.maximumCapacity || 100,
    warningThreshold: rule?.warningThreshold || 80,
    allowOverfill: rule?.allowOverfill || false,
    overfillThreshold: rule?.overfillThreshold || 10,
    priority: rule?.priority || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          ruleId: rule.ruleId,
          updates: formData,
        });
      } else {
        await createMutation.mutateAsync({
          ...formData,
          createdBy: useAuthStore.getState().user!.userId,
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save capacity rule:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Capacity Rule' : 'Create Capacity Rule'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
              <input
                type="text"
                required
                value={formData.ruleName}
                onChange={e => setFormData({ ...formData, ruleName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Standard Shelf Capacity"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity Type *
              </label>
              <select
                required
                value={formData.capacityType}
                onChange={e =>
                  setFormData({ ...formData, capacityType: e.target.value as CapacityType })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={CapacityType.QUANTITY}>Quantity</option>
                <option value={CapacityType.WEIGHT}>Weight</option>
                <option value={CapacityType.VOLUME}>Volume</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity Unit *
              </label>
              <select
                required
                value={formData.capacityUnit}
                onChange={e =>
                  setFormData({ ...formData, capacityUnit: e.target.value as CapacityUnit })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={CapacityUnit.UNITS}>Units</option>
                <option value={CapacityUnit.LBS}>Pounds</option>
                <option value={CapacityUnit.KG}>Kilograms</option>
                <option value={CapacityUnit.CUBIC_FT}>Cubic Feet</option>
                <option value={CapacityUnit.CUBIC_M}>Cubic Meters</option>
                <option value={CapacityUnit.PALLET}>Pallets</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applies To *</label>
              <select
                required
                value={formData.appliesTo}
                onChange={e => setFormData({ ...formData, appliesTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Locations</option>
                <option value="ZONE">Specific Zone</option>
                <option value="LOCATION_TYPE">Location Type</option>
                <option value="SPECIFIC_LOCATION">Specific Location</option>
              </select>
            </div>

            {(formData.appliesTo === 'ZONE' ||
              formData.appliesTo === 'LOCATION_TYPE' ||
              formData.appliesTo === 'SPECIFIC_LOCATION') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.appliesTo === 'ZONE' && 'Zone'}
                  {formData.appliesTo === 'LOCATION_TYPE' && 'Location Type'}
                  {formData.appliesTo === 'SPECIFIC_LOCATION' && 'Location'}*
                </label>
                {formData.appliesTo === 'ZONE' ? (
                  <input
                    type="text"
                    required
                    value={formData.zone}
                    onChange={e => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Zone-A"
                  />
                ) : formData.appliesTo === 'LOCATION_TYPE' ? (
                  <select
                    required
                    value={formData.locationType}
                    onChange={e =>
                      setFormData({ ...formData, locationType: e.target.value as BinType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value={BinType.SHELF}>Shelf</option>
                    <option value={BinType.FLOOR}>Floor</option>
                    <option value={BinType.RACK}>Rack</option>
                    <option value={BinType.BIN}>Bin</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.specificLocation}
                    onChange={e => setFormData({ ...formData, specificLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Zone-A-01-01"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Capacity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.maximumCapacity}
                onChange={e =>
                  setFormData({ ...formData, maximumCapacity: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warning Threshold (%) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={formData.warningThreshold}
                onChange={e =>
                  setFormData({ ...formData, warningThreshold: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                min="0"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                title="Higher priority rules take precedence"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowOverfill"
                checked={formData.allowOverfill}
                onChange={e => setFormData({ ...formData, allowOverfill: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="allowOverfill" className="ml-2 text-sm text-gray-700">
                Allow Overfill
              </label>
            </div>

            {formData.allowOverfill && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overfill Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.overfillThreshold}
                  onChange={e =>
                    setFormData({ ...formData, overfillThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
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
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Update'
                  : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function LocationCapacityPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'alerts'>('overview');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  const { data: rulesData, refetch: refetchRules } = useCapacityRules();
  const { data: capacitiesData, refetch: refetchCapacities } = useLocationCapacities({
    capacityType: filterType || undefined,
    showAlertsOnly,
  });
  const { data: alertsData, refetch: refetchAlerts } = useCapacityAlerts({
    acknowledged: false,
  });

  const deleteMutation = useDeleteCapacityRule();
  const acknowledgeMutation = useAcknowledgeAlert();
  const recalculateMutation = useRecalculateCapacity();

  const rules = rulesData || [];
  const capacities = capacitiesData?.capacities || [];
  const alerts = alertsData?.alerts || [];

  const canManageRules =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this capacity rule?')) return;
    try {
      await deleteMutation.mutateAsync(ruleId);
      refetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeMutation.mutateAsync(alertId);
      refetchAlerts();
      refetchCapacities();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleRecalculate = async (binLocation: string) => {
    try {
      await recalculateMutation.mutateAsync(binLocation);
      refetchCapacities();
    } catch (error) {
      console.error('Failed to recalculate capacity:', error);
    }
  };

  const totalCapacity = capacities.reduce((sum, cap) => sum + cap.maximumCapacity, 0);
  const totalUtilization = capacities.reduce((sum, cap) => sum + cap.currentUtilization, 0);
  const overallUtilization = totalCapacity > 0 ? (totalUtilization / totalCapacity) * 100 : 0;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Location Capacity</h1>
              <p className="text-gray-400 mt-1">
                Monitor and manage bin location capacity constraints
              </p>
            </div>
            {canManageRules && (
              <button
                onClick={() => {
                  setSelectedRule(null);
                  setShowRuleModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
                New Rule
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="glass-card rounded-lg">
            <div className="border-b border-gray-800">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  <CubeIcon className="h-5 w-5 inline mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === 'rules'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  Rules
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === 'alerts'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  Alerts
                  {alerts.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
                    <div className="text-sm text-blue-300 font-medium">Total Locations</div>
                    <div className="text-2xl font-bold text-blue-100 mt-1">{capacities.length}</div>
                  </div>
                  <div className="bg-green-900/30 border border-green-800 rounded-lg p-4">
                    <div className="text-sm text-green-300 font-medium">Total Capacity</div>
                    <div className="text-2xl font-bold text-green-100 mt-1">
                      {totalCapacity.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4">
                    <div className="text-sm text-yellow-300 font-medium">Utilization</div>
                    <div className="text-2xl font-bold text-yellow-100 mt-1">
                      {overallUtilization.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
                    <div className="text-sm text-red-300 font-medium">Active Alerts</div>
                    <div className="text-2xl font-bold text-red-100 mt-1">{alerts.length}</div>
                  </div>
                </div>

                {/* Overall Utilization Bar */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Overall Capacity Utilization
                  </h3>
                  <CapacityBar
                    utilization={totalUtilization}
                    maximum={totalCapacity}
                    warningThreshold={80}
                  />
                </div>

                {/* Capacities by Location */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-white">Location Capacities</h3>
                    <div className="flex gap-2">
                      <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                      >
                        <option value="">All Types</option>
                        <option value={CapacityType.QUANTITY}>Quantity</option>
                        <option value={CapacityType.WEIGHT}>Weight</option>
                        <option value={CapacityType.VOLUME}>Volume</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={showAlertsOnly}
                          onChange={e => setShowAlertsOnly(e.target.checked)}
                          className="rounded bg-gray-800 border-gray-700"
                        />
                        Alerts Only
                      </label>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Utilization
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                        {capacities.map((capacity: any) => (
                          <tr key={capacity.capacityId} className="hover:bg-gray-800/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">
                                {capacity.binLocation}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">{capacity.capacityType}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-48">
                                <CapacityBar
                                  utilization={capacity.currentUtilization}
                                  maximum={capacity.maximumCapacity}
                                  warningThreshold={capacity.warningThreshold}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  capacity.status === CapacityRuleStatus.EXCEEDED
                                    ? 'bg-red-900/50 text-red-300'
                                    : capacity.status === CapacityRuleStatus.WARNING
                                      ? 'bg-yellow-900/50 text-yellow-300'
                                      : 'bg-green-900/50 text-green-300'
                                }`}
                              >
                                {capacity.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => handleRecalculate(capacity.binLocation)}
                                className="text-blue-400 hover:text-blue-300 mr-3"
                                title="Recalculate"
                              >
                                <ArrowPathIcon className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Rule Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Applies To
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Max Capacity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Warning %
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                      {rules.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                            No capacity rules configured. Create a rule to get started.
                          </td>
                        </tr>
                      ) : (
                        rules.map((rule: any) => (
                          <tr key={rule.ruleId} className="hover:bg-gray-800/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{rule.ruleName}</div>
                              {rule.description && (
                                <div className="text-xs text-gray-400">{rule.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">{rule.capacityType}</div>
                              <div className="text-xs text-gray-400">{rule.capacityUnit}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {rule.appliesTo === 'ALL' && 'All Locations'}
                                {rule.appliesTo === 'ZONE' && `Zone: ${rule.zone}`}
                                {rule.appliesTo === 'LOCATION_TYPE' && `Type: ${rule.locationType}`}
                                {rule.appliesTo === 'SPECIFIC_LOCATION' &&
                                  `Location: ${rule.specificLocation}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                              {rule.maximumCapacity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                              {rule.warningThreshold}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">
                              {rule.priority}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {canManageRules && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRule(rule);
                                      setShowRuleModal(true);
                                    }}
                                    className="text-blue-400 hover:text-blue-300 mr-3"
                                  >
                                    <PencilIcon className="h-4 w-4 inline" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRule(rule.ruleId)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <TrashIcon className="h-4 w-4 inline" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="p-6">
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckIcon className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p className="text-gray-400">No active capacity alerts</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert: any) => (
                      <div
                        key={alert.alertId}
                        className={`border rounded-lg p-4 ${
                          alert.alertType === 'EXCEEDED' || alert.alertType === 'CRITICAL'
                            ? 'border-red-900 bg-red-900/20'
                            : 'border-yellow-900 bg-yellow-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <ExclamationTriangleIcon
                              className={`h-6 w-6 mr-3 ${
                                alert.alertType === 'EXCEEDED' || alert.alertType === 'CRITICAL'
                                  ? 'text-red-400'
                                  : 'text-yellow-400'
                              }`}
                            />
                            <div>
                              <h4
                                className={`font-semibold ${
                                  alert.alertType === 'EXCEEDED' || alert.alertType === 'CRITICAL'
                                    ? 'text-red-200'
                                    : 'text-yellow-200'
                                }`}
                              >
                                {alert.binLocation} - {alert.capacityType} Capacity{' '}
                                {alert.alertType}
                              </h4>
                              <p className="text-sm mt-1 text-gray-300">{alert.alertMessage}</p>
                              <div className="text-sm mt-2 text-gray-300">
                                <span className="font-medium text-white">Current: </span>
                                {alert.currentUtilization.toFixed(1)} / {alert.maximumCapacity} (
                                {alert.utilizationPercent.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.alertId)}
                            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {showRuleModal && (
            <CapacityRuleModal
              rule={selectedRule}
              onClose={() => setShowRuleModal(false)}
              onSuccess={() => {
                setShowRuleModal(false);
                refetchRules();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
