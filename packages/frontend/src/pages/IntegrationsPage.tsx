/**
 * Integrations Page
 *
 * Manages external system integrations (ERP, e-commerce, carriers)
 * Provides interface for configuring, testing, and monitoring integrations
 */

import React, { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ServerIcon,
  ShoppingBagIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import {
  Integration,
  IntegrationType,
  IntegrationStatus,
  IntegrationProvider,
  SyncJob,
  SyncJobStatus,
  CarrierAccount,
} from '@opsui/shared';
import { Header } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

interface IntegrationFormData {
  name: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  configuration: Record<string, any>;
  syncSettings: {
    autoSync: boolean;
    syncInterval: number;
    syncOnEvent: boolean;
  };
  webhookSettings?: {
    url: string;
    secret: string;
    events: string[];
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'integrations' | 'sync-jobs' | 'webhooks'>(
    'integrations'
  );
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | IntegrationStatus>('ALL');

  // Mock data - replace with actual API calls
  const mockIntegrations: Integration[] = [
    {
      integrationId: 'INT-001',
      name: 'Shopify Store',
      type: IntegrationType.ECOMMERCE,
      provider: IntegrationProvider.SHOPIFY,
      status: IntegrationStatus.ACTIVE,
      configuration: {
        shopDomain: 'mystore.myshopify.com',
        accessToken: 'shpat_xxxxx',
      },
      syncSettings: {
        autoSync: true,
        syncInterval: 300,
        syncOnEvent: true,
      },
      webhookSettings: {
        url: 'https://api.wms.com/webhooks/shopify',
        secret: 'webhook_secret',
        events: ['orders/create', 'orders/updated', 'products/update'],
      },
      lastSyncAt: new Date(Date.now() - 1000 * 60 * 15),
      lastSyncStatus: 'SUCCESS',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      carrierAccounts: [],
    },
  ];

  React.useEffect(() => {
    setIntegrations(mockIntegrations);
  }, []);

  const filteredIntegrations = integrations.filter(
    integration => filter === 'ALL' || integration.status === filter
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="mt-2 text-gray-400">
            Connect and manage external systems (ERP, e-commerce, carriers)
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('sync-jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sync-jobs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Sync Jobs
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'webhooks'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Webhooks
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'integrations' && (
          <IntegrationsTab
            integrations={filteredIntegrations}
            filter={filter}
            setFilter={setFilter}
            onSelectIntegration={integration => {
              setSelectedIntegration(integration);
              setModalOpen(true);
            }}
            onCreateIntegration={() => {
              setSelectedIntegration(undefined);
              setModalOpen(true);
            }}
            onDeleteIntegration={integrationId => {
              setIntegrations(integrations.filter(i => i.integrationId !== integrationId));
            }}
          />
        )}

        {activeTab === 'sync-jobs' && <SyncJobsTab syncJobs={syncJobs} />}

        {activeTab === 'webhooks' && <WebhooksTab />}

        {/* Integration Modal */}
        {modalOpen && (
          <IntegrationModal
            integration={selectedIntegration}
            onClose={() => setModalOpen(false)}
            onSave={data => {
              if (selectedIntegration) {
                setIntegrations(
                  integrations.map(i =>
                    i.integrationId === selectedIntegration.integrationId ? { ...i, ...data } : i
                  )
                );
              } else {
                setIntegrations([
                  ...integrations,
                  {
                    ...data,
                    integrationId: `INT-${Date.now()}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    carrierAccounts: [],
                  },
                ]);
              }
              setModalOpen(false);
            }}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// INTEGRATIONS TAB
// ============================================================================

interface IntegrationsTabProps {
  integrations: Integration[];
  filter: 'ALL' | IntegrationStatus;
  setFilter: (filter: 'ALL' | IntegrationStatus) => void;
  onSelectIntegration: (integration: Integration) => void;
  onCreateIntegration: () => void;
  onDeleteIntegration: (integrationId: string) => void;
}

function IntegrationsTab({
  integrations,
  filter,
  setFilter,
  onSelectIntegration,
  onCreateIntegration,
  onDeleteIntegration,
}: IntegrationsTabProps) {
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  const handleTestConnection = async (integrationId: string) => {
    setTestingConnection(integrationId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setConnectionResults({
      ...connectionResults,
      [integrationId]: { success: true, message: 'Connection successful (234ms)' },
    });
    setTestingConnection(null);
  };

  const getProviderIcon = (type: IntegrationType) => {
    switch (type) {
      case IntegrationType.ERP:
        return ServerIcon;
      case IntegrationType.ECOMMERCE:
        return ShoppingBagIcon;
      case IntegrationType.CARRIER:
        return TruckIcon;
      default:
        return ServerIcon;
    }
  };

  return (
    <div>
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
            All
          </button>
          <button
            onClick={() => setFilter(IntegrationStatus.ACTIVE)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === IntegrationStatus.ACTIVE
                ? 'bg-green-900/50 text-green-300 border border-green-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter(IntegrationStatus.INACTIVE)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === IntegrationStatus.INACTIVE
                ? 'bg-gray-700 text-gray-300 border border-gray-600'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Inactive
          </button>
        </div>

        <button
          onClick={onCreateIntegration}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(integration => {
          const ProviderIcon = getProviderIcon(integration.type);
          const testResult = connectionResults[integration.integrationId];

          return (
            <div key={integration.integrationId} className="glass-card rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700">
                    <ProviderIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                    <p className="text-sm text-gray-400">{integration.provider}</p>
                  </div>
                </div>
                <StatusBadge status={integration.status} />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Type:</span>
                  <span className="font-medium text-white">{integration.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Sync:</span>
                  <span className="font-medium text-white">
                    {integration.lastSyncAt
                      ? new Date(integration.lastSyncAt).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                {integration.lastSyncStatus && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status:</span>
                    <span
                      className={`font-medium ${
                        integration.lastSyncStatus === 'SUCCESS'
                          ? 'text-green-400'
                          : integration.lastSyncStatus === 'FAILED'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                      }`}
                    >
                      {integration.lastSyncStatus}
                    </span>
                  </div>
                )}
              </div>

              {testResult && (
                <div
                  className={`mb-4 p-2 rounded text-sm ${
                    testResult.success
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTestConnection(integration.integrationId)}
                    disabled={testingConnection === integration.integrationId}
                    className="p-2 text-green-400 hover:text-green-300 rounded hover:bg-green-900/30"
                    title="Test Connection"
                  >
                    {testingConnection === integration.integrationId ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => onSelectIntegration(integration)}
                    className="p-2 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-900/30"
                    title="Edit Integration"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this integration?')) {
                        onDeleteIntegration(integration.integrationId);
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-300 rounded hover:bg-red-900/30"
                    title="Delete Integration"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12">
          <ServerIcon className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">No integrations configured</p>
          <button onClick={onCreateIntegration} className="mt-4 text-blue-400 hover:text-blue-300">
            Add your first integration
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SYNC JOBS TAB
// ============================================================================

interface SyncJobsTabProps {
  syncJobs: SyncJob[];
}

function SyncJobsTab({ syncJobs }: SyncJobsTabProps) {
  return (
    <div className="glass-card rounded-lg p-6">
      <div className="text-center py-12">
        <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-2 text-gray-400">No sync jobs found</p>
        <p className="text-sm text-gray-500">Sync jobs will appear here when integrations run</p>
      </div>
    </div>
  );
}

// ============================================================================
// WEBHOOKS TAB
// ============================================================================

function WebhooksTab() {
  return (
    <div className="glass-card rounded-lg p-6">
      <div className="text-center py-12">
        <ServerIcon className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-2 text-gray-400">No webhook events found</p>
        <p className="text-sm text-gray-500">Webhook events will appear here when received</p>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const styles: Record<IntegrationStatus, string> = {
    [IntegrationStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [IntegrationStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
    [IntegrationStatus.ERROR]: 'bg-red-100 text-red-800',
    [IntegrationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  };

  const icons: Record<IntegrationStatus, React.ReactNode> = {
    [IntegrationStatus.ACTIVE]: <CheckCircleIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.INACTIVE]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.ERROR]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.PENDING]: <ClockIcon className="h-4 w-4 inline mr-1" />,
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ============================================================================
// INTEGRATION MODAL
// ============================================================================

interface IntegrationModalProps {
  integration?: Integration;
  onClose: () => void;
  onSave: (
    data: Omit<Integration, 'integrationId' | 'createdAt' | 'updatedAt' | 'carrierAccounts'>
  ) => void;
}

function IntegrationModal({ integration, onClose, onSave }: IntegrationModalProps) {
  const isEdit = !!integration;
  const [formData, setFormData] = useState({
    name: integration?.name || '',
    type: integration?.type || IntegrationType.ERP,
    provider: integration?.provider || IntegrationProvider.SAP,
    status: integration?.status || IntegrationStatus.PENDING,
    configuration: integration?.configuration || {},
    syncSettings: integration?.syncSettings || {
      autoSync: true,
      syncInterval: 300,
      syncOnEvent: true,
    },
    webhookSettings: integration?.webhookSettings,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getProvidersForType = (type: IntegrationType): IntegrationProvider[] => {
    switch (type) {
      case IntegrationType.ERP:
        return [IntegrationProvider.SAP, IntegrationProvider.ORACLE];
      case IntegrationType.ECOMMERCE:
        return [
          IntegrationProvider.SHOPIFY,
          IntegrationProvider.WOOCOMMERCE,
          IntegrationProvider.MAGENTO,
        ];
      case IntegrationType.CARRIER:
        return [
          IntegrationProvider.FEDEX,
          IntegrationProvider.UPS,
          IntegrationProvider.DHL,
          IntegrationProvider.USPS,
        ];
      default:
        return [];
    }
  };

  const availableProviders = getProvidersForType(formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {isEdit ? 'Edit Integration' : 'Add Integration'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Integration Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        type: e.target.value as IntegrationType,
                        provider: getProvidersForType(e.target.value as IntegrationType)[0],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={IntegrationType.ERP}>ERP System</option>
                    <option value={IntegrationType.ECOMMERCE}>E-commerce Platform</option>
                    <option value={IntegrationType.CARRIER}>Shipping Carrier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={e =>
                      setFormData({ ...formData, provider: e.target.value as IntegrationProvider })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration (JSON)
                </label>
                <textarea
                  rows={6}
                  value={JSON.stringify(formData.configuration, null, 2)}
                  onChange={e => {
                    try {
                      setFormData({ ...formData, configuration: JSON.parse(e.target.value) });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formData.type === IntegrationType.ECOMMERCE && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook Settings (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={JSON.stringify(formData.webhookSettings || {}, null, 2)}
                    onChange={e => {
                      try {
                        setFormData({ ...formData, webhookSettings: JSON.parse(e.target.value) });
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
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
                {isEdit ? 'Update Integration' : 'Add Integration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
