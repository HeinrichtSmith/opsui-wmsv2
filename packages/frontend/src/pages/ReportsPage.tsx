/**
 * Reports Page
 *
 * Advanced reporting interface for creating custom reports,
 * viewing dashboards, and exporting data.
 */

import React, { useState } from 'react';
import {
  DocumentTextIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PlayIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  Report,
  ReportType,
  ReportStatus,
  ReportFormat,
  Dashboard,
  AggregationType,
} from '@opsui/shared';
import { Header } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ReportField {
  fieldId: string;
  name: string;
  source: string;
  field: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  displayName: string;
}

interface ReportFilter {
  field: string;
  operator: string;
  value: any;
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'reports' | 'dashboards' | 'exports'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | undefined>();
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Mock data - replace with actual API calls
  const mockReports: Report[] = [
    {
      reportId: 'REPORT-001',
      name: 'Inventory Summary',
      description: 'Current inventory levels by location',
      reportType: ReportType.INVENTORY,
      status: ReportStatus.COMPLETED,
      createdBy: 'admin',
      createdAt: new Date('2024-01-15'),
      fields: [
        {
          fieldId: 'f1',
          name: 'sku',
          source: 'inventory',
          field: 'sku',
          dataType: 'string',
          displayName: 'SKU',
          aggregatable: true,
          filterable: true,
        },
        {
          fieldId: 'f2',
          name: 'quantity',
          source: 'inventory',
          field: 'quantity',
          dataType: 'number',
          displayName: 'Quantity',
          aggregatable: true,
          filterable: true,
        },
      ],
      filters: [],
      groups: [],
      chartConfig: { enabled: true, chartType: 'TABLE' },
      defaultFormat: ReportFormat.EXCEL,
      allowExport: true,
      allowSchedule: true,
      isPublic: true,
      tags: ['inventory', 'summary'],
      category: 'Operations',
    },
    {
      reportId: 'REPORT-002',
      name: 'Picking Performance',
      description: 'Daily picking metrics by user',
      reportType: ReportType.PICKING_PERFORMANCE,
      status: ReportStatus.COMPLETED,
      createdBy: 'admin',
      createdAt: new Date('2024-01-14'),
      fields: [],
      filters: [],
      groups: [],
      chartConfig: { enabled: false },
      defaultFormat: ReportFormat.PDF,
      allowExport: true,
      allowSchedule: true,
      isPublic: false,
      tags: ['performance', 'picking'],
      category: 'Analytics',
    },
  ];

  const mockDashboards: Dashboard[] = [
    {
      dashboardId: 'DASH-001',
      name: 'Operations Overview',
      description: 'Key operational metrics',
      layout: { columns: 3, rows: 3 },
      widgets: [
        {
          widgetId: 'W-001',
          reportId: 'REPORT-001',
          position: { x: 0, y: 0, width: 2, height: 2 },
          title: 'Inventory Levels',
        },
      ],
      owner: 'admin',
      isPublic: true,
      createdBy: 'admin',
      createdAt: new Date('2024-01-10'),
    },
  ];

  React.useEffect(() => {
    setReports(mockReports);
    setDashboards(mockDashboards);
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="mt-2 text-gray-400">
            Create custom reports, view dashboards, and export data
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('dashboards')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboards'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <ChartBarIcon className="h-5 w-5 inline mr-2" />
              Dashboards
            </button>
            <button
              onClick={() => setActiveTab('exports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'exports'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <ArrowDownTrayIcon className="h-5 w-5 inline mr-2" />
              Exports
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'reports' && (
          <ReportsTab
            reports={reports}
            onSelectReport={report => {
              setSelectedReport(report);
              setReportModalOpen(true);
            }}
            onCreateReport={() => {
              setSelectedReport(undefined);
              setReportModalOpen(true);
            }}
          />
        )}

        {activeTab === 'dashboards' && <DashboardsTab dashboards={dashboards} />}

        {activeTab === 'exports' && <ExportsTab />}

        {/* Report Modal */}
        {reportModalOpen && (
          <ReportModal
            report={selectedReport}
            onClose={() => setReportModalOpen(false)}
            onSave={report => handleSaveReport(report)}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// REPORTS TAB
// ============================================================================

interface ReportsTabProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onCreateReport: () => void;
}

function ReportsTab({ reports, onSelectReport, onCreateReport }: ReportsTabProps) {
  const [filter, setFilter] = useState<ReportType | 'ALL'>('ALL');

  const filteredReports = filter === 'ALL' ? reports : reports.filter(r => r.reportType === filter);

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
            All Reports
          </button>
          <button
            onClick={() => setFilter(ReportType.INVENTORY)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === ReportType.INVENTORY
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setFilter(ReportType.ORDERS)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === ReportType.ORDERS
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setFilter(ReportType.PICKING_PERFORMANCE)}
            className={`px-4 py-2 rounded-md font-medium ${
              filter === ReportType.PICKING_PERFORMANCE
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Performance
          </button>
        </div>

        <button
          onClick={onCreateReport}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Report
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => (
          <div
            key={report.reportId}
            className="glass-card rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{report.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{report.description}</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-900/50 text-blue-300 border border-blue-700">
                {report.reportType}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-sm text-gray-400">
                <span>Created by {report.createdBy}</span>
                <span className="mx-2">•</span>
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExecuteReport(report.reportId)}
                  className="text-green-400 hover:text-green-300"
                  title="Run Report"
                >
                  <PlayIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onSelectReport(report)}
                  className="text-blue-400 hover:text-blue-300"
                  title="Edit Report"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportReport(report.reportId, ReportFormat.EXCEL)}
                  className="text-gray-400 hover:text-gray-200"
                  title="Export as Excel"
                >
                  Excel
                </button>
                <button
                  onClick={() => handleExportReport(report.reportId, ReportFormat.PDF)}
                  className="text-gray-400 hover:text-gray-200"
                  title="Export as PDF"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No reports found</p>
          <button onClick={onCreateReport} className="mt-4 text-blue-400 hover:text-blue-300">
            Create your first report
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DASHBOARDS TAB
// ============================================================================

interface DashboardsTabProps {
  dashboards: Dashboard[];
}

function DashboardsTab({ dashboards }: DashboardsTabProps) {
  return (
    <div>
      {/* Actions Bar */}
      <div className="mb-6 flex justify-end">
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Dashboard
        </button>
      </div>

      {/* Dashboards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboards.map(dashboard => (
          <div key={dashboard.dashboardId} className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">{dashboard.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{dashboard.description}</p>

            <div className="bg-gray-800 rounded-lg p-4 mb-4" style={{ minHeight: '200px' }}>
              <p className="text-center text-gray-500 text-sm">
                Dashboard preview with {dashboard.widgets.length} widgets
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Owner: {dashboard.owner}</span>
              {dashboard.isPublic && (
                <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded-full text-xs border border-green-700">
                  Public
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {dashboards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No dashboards found</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS TAB
// ============================================================================

function ExportsTab() {
  const [entityType, setEntityType] = useState('orders');
  const [format, setFormat] = useState(ReportFormat.CSV);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // TODO: Implement actual export API call
      console.log('Exporting', entityType, 'as', format);
      setTimeout(() => {
        alert('Export started! Check back soon for the file.');
        setExporting(false);
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Export Data</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="orders">Orders</option>
              <option value="inventory">Inventory</option>
              <option value="shipments">Shipments</option>
              <option value="pick_tasks">Pick Tasks</option>
              <option value="users">Users</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Export Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as ReportFormat)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value={ReportFormat.CSV}>CSV</option>
              <option value={ReportFormat.EXCEL}>Excel</option>
              <option value={ReportFormat.PDF}>PDF</option>
              <option value={ReportFormat.JSON}>JSON</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            {exporting ? 'Starting Export...' : 'Export Data'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Exports</h3>
          <p className="text-sm text-gray-400">No recent exports</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REPORT MODAL
// ============================================================================

interface ReportModalProps {
  report?: Report;
  onClose: () => void;
  onSave: (report: Omit<Report, 'reportId' | 'createdAt'>) => void;
}

function ReportModal({ report, onClose, onSave }: ReportModalProps) {
  const isEdit = !!report;
  const [formData, setFormData] = useState({
    name: report?.name || '',
    description: report?.description || '',
    reportType: report?.reportType || ReportType.CUSTOM,
    isPublic: report?.isPublic ?? false,
    category: report?.category || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      status: ReportStatus.DRAFT,
      createdBy: 'admin',
      fields: report?.fields || [],
      filters: report?.filters || [],
      groups: report?.groups || [],
      chartConfig: report?.chartConfig || { enabled: false },
      defaultFormat: report?.defaultFormat || ReportFormat.PDF,
      allowExport: true,
      allowSchedule: true,
      tags: report?.tags || [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{isEdit ? 'Edit Report' : 'Create New Report'}</h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Type *
                  </label>
                  <select
                    value={formData.reportType}
                    onChange={e =>
                      setFormData({ ...formData, reportType: e.target.value as ReportType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={ReportType.INVENTORY}>Inventory</option>
                    <option value={ReportType.ORDERS}>Orders</option>
                    <option value={ReportType.SHIPPING}>Shipping</option>
                    <option value={ReportType.RECEIVING}>Receiving</option>
                    <option value={ReportType.PICKING_PERFORMANCE}>Picking Performance</option>
                    <option value={ReportType.PACKING_PERFORMANCE}>Packing Performance</option>
                    <option value={ReportType.CYCLE_COUNTS}>Cycle Counts</option>
                    <option value={ReportType.LOCATION_UTILIZATION}>Location Utilization</option>
                    <option value={ReportType.USER_PERFORMANCE}>User Performance</option>
                    <option value={ReportType.CUSTOM}>Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Operations, Analytics"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  Make this report visible to all users
                </label>
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
                {isEdit ? 'Update Report' : 'Create Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HANDLERS
// ============================================================================

function handleSaveReport(report: any) {
  // TODO: Implement actual API call
  console.log('Saving report:', report);
}

function handleExecuteReport(reportId: string) {
  // TODO: Implement actual API call
  console.log('Executing report:', reportId);
  alert('Report execution started. Results will appear shortly.');
}

function handleExportReport(reportId: string, format: ReportFormat) {
  // TODO: Implement actual API call
  console.log('Exporting report:', reportId, 'as', format);
  alert(`Report will be exported as ${format}`);
}
