/**
 * Business Rules Page
 *
 * Manages business rules for the warehouse management system.
 * Provides interface for creating, editing, testing, and activating rules.
 */

import React, { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  BusinessRule,
  RuleType,
  RuleStatus,
  ConditionOperator,
  ActionType,
  RuleEventType
} from '@opsui/shared';
import { Header } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

interface RuleConditionFormData {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
  value2?: string | number;
  logicalOperator: 'AND' | 'OR';
}

interface RuleActionFormData {
  actionType: ActionType;
  parameters: Record<string, any>;
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function BusinessRulesPage() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<BusinessRule | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | RuleStatus>('ALL');

  // Mock data - replace with actual API calls
  const mockRules: BusinessRule[] = [
    {
      ruleId: 'RULE-001',
      name: 'High Priority Order Allocation',
      description: 'Automatically allocate high-priority orders to experienced pickers',
      ruleType: RuleType.ALLOCATION,
      status: RuleStatus.ACTIVE,
      priority: 100,
      triggerEvents: [RuleEventType.ORDER_CREATED],
      conditions: [
        {
          conditionId: 'COND-001',
          ruleId: 'RULE-001',
          field: 'priority',
          operator: ConditionOperator.EQUALS,
          value: 'URGENT',
          order: 0
        }
      ],
      actions: [
        {
          actionId: 'ACT-001',
          ruleId: 'RULE-001',
          actionType: ActionType.ASSIGN_USER,
          parameters: { role: 'PICKER', experienceLevel: 'SENIOR' },
          order: 0
        }
      ],
      createdBy: 'admin',
      createdAt: new Date('2024-01-15'),
      version: 1,
      executionCount: 245
    }
  ];

  React.useEffect(() => {
    setRules(mockRules);
  }, []);

  const filteredRules = rules.filter(rule =>
    filter === 'ALL' || rule.status === filter
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Business Rules</h1>
          <p className="mt-2 text-gray-400">
            Configure automated decision logic for order allocation, picking, and shipping
          </p>
        </div>

      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === 'ALL'
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            All Rules
          </button>
          <button
            onClick={() => setFilter(RuleStatus.ACTIVE)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === RuleStatus.ACTIVE
                ? 'bg-green-900/50 text-green-300 border border-green-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter(RuleStatus.DRAFT)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === RuleStatus.DRAFT
                ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Draft
          </button>
        </div>

        <button
          onClick={() => {
            setSelectedRule(undefined);
            setModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Rule Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Executions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900/30 divide-y divide-gray-800">
            {filteredRules.map((rule) => (
              <tr key={rule.ruleId} className="hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white">{rule.name}</div>
                    <div className="text-sm text-gray-400">{rule.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-900/50 text-blue-300 border border-blue-700">
                    {rule.ruleType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={rule.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {rule.priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {rule.executionCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedRule(rule);
                      setTestModalOpen(true);
                    }}
                    className="text-green-400 hover:text-green-300 mr-3"
                    title="Test Rule"
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRule(rule);
                      setModalOpen(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 mr-3"
                    title="Edit Rule"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.ruleId)}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Rule"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No business rules found</p>
            <button
              onClick={() => {
                setSelectedRule(undefined);
                setModalOpen(true);
              }}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Create your first rule
            </button>
          </div>
        )}
      </div>

      {/* Rule Modal */}
      {modalOpen && (
        <RuleModal
          rule={selectedRule}
          onClose={() => setModalOpen(false)}
          onSave={(rule) => handleSaveRule(rule)}
        />
      )}

      {/* Test Modal */}
        {testModalOpen && selectedRule && (
          <TestRuleModal
            rule={selectedRule}
            onClose={() => setTestModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: RuleStatus }) {
  const styles: Record<RuleStatus, string> = {
    [RuleStatus.DRAFT]: 'bg-yellow-100 text-yellow-800',
    [RuleStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [RuleStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
    [RuleStatus.ARCHIVED]: 'bg-red-100 text-red-800'
  };

  const icons: Record<RuleStatus, React.ReactNode> = {
    [RuleStatus.DRAFT]: <ClockIcon className="h-4 w-4 inline mr-1" />,
    [RuleStatus.ACTIVE]: <CheckCircleIcon className="h-4 w-4 inline mr-1" />,
    [RuleStatus.INACTIVE]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
    [RuleStatus.ARCHIVED]: <XCircleIcon className="h-4 w-4 inline mr-1" />
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ============================================================================
// RULE MODAL
// ============================================================================

interface RuleModalProps {
  rule?: BusinessRule;
  onClose: () => void;
  onSave: (rule: Omit<BusinessRule, 'ruleId' | 'createdAt' | 'executionCount' | 'version'>) => void;
}

function RuleModal({ rule, onClose, onSave }: RuleModalProps) {
  const isEdit = !!rule;
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    ruleType: rule?.ruleType || RuleType.ALLOCATION,
    status: rule?.status || RuleStatus.DRAFT,
    priority: rule?.priority || 50,
    triggerEvents: rule?.triggerEvents || [RuleEventType.ORDER_CREATED]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      conditions: rule?.conditions || [],
      actions: rule?.actions || [],
      createdBy: 'admin'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {isEdit ? 'Edit Rule' : 'Create New Rule'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Type *
                  </label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) => setFormData({ ...formData, ruleType: e.target.value as RuleType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={RuleType.ALLOCATION}>Allocation</option>
                    <option value={RuleType.PICKING}>Picking</option>
                    <option value={RuleType.SHIPPING}>Shipping</option>
                    <option value={RuleType.INVENTORY}>Inventory</option>
                    <option value={RuleType.VALIDATION}>Validation</option>
                    <option value={RuleType.NOTIFICATION}>Notification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as RuleStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RuleStatus.DRAFT}>Draft</option>
                  <option value={RuleStatus.ACTIVE}>Active</option>
                  <option value={RuleStatus.INACTIVE}>Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isEdit ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEST RULE MODAL
// ============================================================================

interface TestRuleModalProps {
  rule: BusinessRule;
  onClose: () => void;
}

function TestRuleModal({ rule, onClose }: TestRuleModalProps) {
  const [testEntity, setTestEntity] = useState('{ "priority": "URGENT", "total": 100 }');
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const entity = JSON.parse(testEntity);
      // Mock evaluation - replace with actual API call
      setResult({
        shouldExecute: true,
        conditionsMet: true,
        conditionResults: rule.conditions.map(cond => ({
          condition: cond,
          result: true
        }))
      });
    } catch (error: any) {
      alert('Invalid JSON: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Test Rule: {rule.name}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Entity (JSON)
              </label>
              <textarea
                rows={6}
                value={testEntity}
                onChange={(e) => setTestEntity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {result && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Test Result</h3>
                <div className={`text-sm ${result.shouldExecute ? 'text-green-600' : 'text-red-600'}`}>
                  {result.shouldExecute ? '✓ Rule would execute' : '✗ Rule would NOT execute'}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Conditions met: {result.conditionsMet ? 'Yes' : 'No'}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {testing ? 'Testing...' : 'Run Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HANDLERS
// ============================================================================

function handleSaveRule(rule: any) {
  // TODO: Implement actual API call
  console.log('Saving rule:', rule);
}

function handleDeleteRule(ruleId: string) {
  // TODO: Implement actual API call
  if (confirm('Are you sure you want to delete this rule?')) {
    console.log('Deleting rule:', ruleId);
  }
}
