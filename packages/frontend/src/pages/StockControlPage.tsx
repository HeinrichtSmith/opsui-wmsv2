/**
 * Stock Control page
 *
 * Comprehensive stock management interface for stock controllers
 * Features: inventory overview, stock counts, transfers, adjustments, reports
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useStockControlDashboard,
  useStockControlInventory,
  useStockControlTransactions,
  useLowStockReport,
  useTransferStock,
  useAdjustInventory,
  useCreateStockCount,
} from '@/services/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  SearchInput,
} from '@/components/shared';
import { useAuthStore } from '@/stores';
import {
  CubeIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PageLoading } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'inventory' | 'transactions' | 'quick-actions';

interface InventoryTabProps {
  initialSku?: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
  trend?: { value: number; isPositive: boolean };
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
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="mt-3 text-4xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform duration-300">
              {value}
            </p>
            {trend && (
              <p
                className={`mt-2 text-sm ${trend.isPositive ? 'text-success-400' : 'text-error-400'}`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}% from last week
              </p>
            )}
          </div>
          <div className={`p-4 rounded-2xl ${colorStyles[color]} transition-all duration-300`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferModal({ onClose }: { onClose: () => void }) {
  const transferStock = useTransferStock();
  const [sku, setSku] = useState('');
  const [fromBin, setFromBin] = useState('');
  const [toBin, setToBin] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transferStock.mutateAsync({
        sku,
        fromBin,
        toBin,
        quantity: parseInt(quantity),
        reason,
      });
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transfer Stock</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SKU</label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter SKU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">From Bin</label>
              <input
                type="text"
                required
                value={fromBin}
                onChange={e => setFromBin(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., A-01-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">To Bin</label>
              <input
                type="text"
                required
                value={toBin}
                onChange={e => setToBin(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., B-02-03"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
              <textarea
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter reason for transfer"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={transferStock.isPending}
                className="flex-1"
              >
                {transferStock.isPending ? 'Processing...' : 'Transfer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdjustmentModal({ onClose }: { onClose: () => void }) {
  const adjustInventory = useAdjustInventory();
  const [sku, setSku] = useState('');
  const [binLocation, setBinLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adjustInventory.mutateAsync({
        sku,
        binLocation,
        quantity: parseInt(quantity),
        reason,
      });
      onClose();
    } catch (error) {
      console.error('Adjustment failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Adjust Inventory</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SKU</label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter SKU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bin Location</label>
              <input
                type="text"
                required
                value={binLocation}
                onChange={e => setBinLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., A-01-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Quantity (+ to add, - to remove)
              </label>
              <input
                type="number"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 5 or -5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
              <textarea
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter reason for adjustment"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={adjustInventory.isPending}
                className="flex-1"
              >
                {adjustInventory.isPending ? 'Processing...' : 'Adjust'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StockCountModal({ onClose }: { onClose: () => void }) {
  const createStockCount = useCreateStockCount();
  const [binLocation, setBinLocation] = useState('');
  const [type, setType] = useState<'FULL' | 'CYCLIC' | 'SPOT'>('SPOT');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStockCount.mutateAsync({ binLocation, type });
      onClose();
    } catch (error) {
      console.error('Stock count creation failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Stock Count</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bin Location</label>
              <input
                type="text"
                required
                value={binLocation}
                onChange={e => setBinLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., A-01-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Count Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'FULL' | 'CYCLIC' | 'SPOT')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="SPOT">Spot Count</option>
                <option value="CYCLIC">Cyclic Count</option>
                <option value="FULL">Full Count</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createStockCount.isPending}
                className="flex-1"
              >
                {createStockCount.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB CONTENT
// ============================================================================

function DashboardTab() {
  const { data: dashboard, isLoading, error, isError } = useStockControlDashboard();
  const { data: lowStock } = useLowStockReport(10);

  if (isLoading) {
    return <PageLoading message="Loading dashboard..." />;
  }

  if (isError || error || !dashboard) {
    return (
      <Card variant="glass">
        <CardContent className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-warning-400 mx-auto mb-4" />
          <p className="text-gray-300">
            {isError || error
              ? 'Failed to load dashboard data. Please try again.'
              : 'No dashboard data available.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total SKUs"
          value={dashboard.totalSKUs}
          icon={CubeIcon}
          color="primary"
        />
        <MetricCard
          title="Total Bins"
          value={dashboard.totalBins}
          icon={ClipboardDocumentListIcon}
          color="success"
        />
        <MetricCard
          title="Low Stock Items"
          value={dashboard.lowStockItems}
          icon={ExclamationTriangleIcon}
          color={dashboard.lowStockItems > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Out of Stock"
          value={dashboard.outOfStockItems}
          icon={XMarkIcon}
          color={dashboard.outOfStockItems > 0 ? 'error' : 'success'}
        />
      </div>

      {/* Recent Transactions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Quantity</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Location</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentTransactions?.map(
                  (txn: {
                    transactionId: string;
                    timestamp: string;
                    type: string;
                    sku: string;
                    quantity: number;
                    binLocation?: string;
                    reason: string;
                  }) => (
                    <tr
                      key={txn.transactionId}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(txn.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            txn.type === 'RECEIPT'
                              ? 'bg-success-500/20 text-success-400'
                              : txn.type === 'DEDUCTION'
                                ? 'bg-error-500/20 text-error-400'
                                : txn.type === 'ADJUSTMENT'
                                  ? 'bg-warning-500/20 text-warning-400'
                                  : 'bg-primary-500/20 text-primary-400'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{txn.sku}</td>
                      <td
                        className={`py-3 px-4 font-medium ${
                          txn.quantity > 0 ? 'text-success-400' : 'text-error-400'
                        }`}
                      >
                        {txn.quantity > 0 ? '+' : ''}
                        {txn.quantity}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{txn.binLocation || '-'}</td>
                      <td className="py-3 px-4 text-gray-400 text-sm">{txn.reason}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStock && lowStock.items.length > 0 && (
        <Card variant="glass" className="border border-warning-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning-400" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Location</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.items
                    .slice(0, 10)
                    .map(
                      (
                        item: { sku: string; name: string; binLocation: string; available: number },
                        index: number
                      ) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-white font-medium">{item.sku}</td>
                          <td className="py-3 px-4 text-gray-300">{item.name}</td>
                          <td className="py-3 px-4 text-gray-300">{item.binLocation}</td>
                          <td className="py-3 px-4 text-warning-400 font-medium">
                            {item.available}
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InventoryTab({ initialSku }: InventoryTabProps) {
  const [searchSku, setSearchSku] = useState(initialSku || '');
  const [searchName, setSearchName] = useState('');
  const [searchBin, setSearchBin] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useStockControlInventory({
    name: searchName || undefined,
    sku: searchSku || undefined,
    binLocation: searchBin || undefined,
    lowStock: filterLowStock || undefined,
    page,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={searchName}
                  onChange={e => {
                    setSearchName(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Search by name..."
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={searchSku}
                  onChange={e => {
                    setSearchSku(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter SKU..."
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bin Location</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={searchBin}
                  onChange={e => {
                    setSearchBin(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., A-01"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lowStock"
                checked={filterLowStock}
                onChange={e => {
                  setFilterLowStock(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="lowStock" className="text-sm text-gray-300">
                Low Stock Only
              </label>
            </div>
            {(searchName || searchSku || searchBin || filterLowStock) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchName('');
                  setSearchSku('');
                  setSearchBin('');
                  setFilterLowStock(false);
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading inventory...</div>
          ) : data?.items && data.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Bin Location
                      </th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Quantity</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Reserved</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Available</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map(
                      (
                        item: {
                          sku: string;
                          name: string;
                          category: string;
                          binLocation: string;
                          quantity: number;
                          reserved: number;
                          available: number;
                        },
                        index: number
                      ) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-white font-medium">{item.sku}</td>
                          <td className="py-3 px-4 text-gray-300">{item.name}</td>
                          <td className="py-3 px-4 text-gray-400">{item.category}</td>
                          <td className="py-3 px-4 text-gray-300">{item.binLocation}</td>
                          <td className="py-3 px-4 text-right text-white">{item.quantity}</td>
                          <td className="py-3 px-4 text-right text-warning-400">{item.reserved}</td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              item.available === 0
                                ? 'text-error-400'
                                : item.available <= 10
                                  ? 'text-warning-400'
                                  : 'text-success-400'
                            }`}
                          >
                            {item.available}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.available === 0 ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-error-500/20 text-error-400">
                                Out of Stock
                              </span>
                            ) : item.available <= 10 ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning-500/20 text-warning-400">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-500/20 text-success-400">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total > 50 && (
                <div className="flex items-center justify-between p-4 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of{' '}
                    {data.total} items
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 50 >= data.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-400">No inventory items found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsTab() {
  const [filters, setFilters] = useState({
    sku: '',
    binLocation: '',
    type: '',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useStockControlTransactions({
    sku: filters.sku || undefined,
    binLocation: filters.binLocation || undefined,
    type: filters.type || undefined,
    limit: 50,
    offset: (page - 1) * 50,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
              <input
                type="text"
                value={filters.sku}
                onChange={e => {
                  setFilters({ ...filters, sku: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter SKU..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bin Location</label>
              <input
                type="text"
                value={filters.binLocation}
                onChange={e => {
                  setFilters({ ...filters, binLocation: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., A-01"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={e => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="RECEIPT">Receipt</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="RESERVATION">Reservation</option>
                <option value="CANCELLATION">Cancellation</option>
              </select>
            </div>
            {(filters.sku || filters.binLocation || filters.type) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilters({ sku: '', binLocation: '', type: '' });
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading transactions...</div>
          ) : data?.transactions && data.transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Quantity</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Location</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">User ID</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map(
                      (txn: {
                        transactionId: string;
                        timestamp: string;
                        type: string;
                        sku: string;
                        quantity: number;
                        binLocation?: string;
                        userId: string;
                        reason: string;
                      }) => (
                        <tr
                          key={txn.transactionId}
                          className="border-b border-white/5 hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                txn.type === 'RECEIPT'
                                  ? 'bg-success-500/20 text-success-400'
                                  : txn.type === 'DEDUCTION'
                                    ? 'bg-error-500/20 text-error-400'
                                    : txn.type === 'ADJUSTMENT'
                                      ? 'bg-warning-500/20 text-warning-400'
                                      : txn.type === 'RESERVATION'
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {txn.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{txn.sku}</td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              txn.quantity > 0 ? 'text-success-400' : 'text-error-400'
                            }`}
                          >
                            {txn.quantity > 0 ? '+' : ''}
                            {txn.quantity}
                          </td>
                          <td className="py-3 px-4 text-gray-300">{txn.binLocation || '-'}</td>
                          <td className="py-3 px-4 text-gray-400">{txn.userId}</td>
                          <td className="py-3 px-4 text-gray-400 text-sm max-w-xs truncate">
                            {txn.reason}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total > 50 && (
                <div className="flex items-center justify-between p-4 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of{' '}
                    {data.total} transactions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 50 >= data.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-400">No transactions found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionsTab() {
  const [activeModal, setActiveModal] = useState<'transfer' | 'adjust' | 'count' | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          variant="glass"
          className="card-hover cursor-pointer"
          onClick={() => setActiveModal('transfer')}
        >
          <CardContent className="p-6 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-primary-500/10 text-primary-400 mb-4">
              <ArrowPathIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Transfer Stock</h3>
            <p className="text-sm text-gray-400">Move inventory between bin locations</p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          className="card-hover cursor-pointer"
          onClick={() => setActiveModal('adjust')}
        >
          <CardContent className="p-6 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-warning-500/10 text-warning-400 mb-4">
              <PlusIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Adjust Inventory</h3>
            <p className="text-sm text-gray-400">Add or remove stock with reason</p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          className="card-hover cursor-pointer"
          onClick={() => setActiveModal('count')}
        >
          <CardContent className="p-6 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-success-500/10 text-success-400 mb-4">
              <ClipboardDocumentListIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Stock Count</h3>
            <p className="text-sm text-gray-400">Create a new stock count session</p>
          </CardContent>
        </Card>
      </div>

      {activeModal === 'transfer' && <TransferModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'adjust' && <AdjustmentModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'count' && <StockCountModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function StockControlPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quickSearchSku, setQuickSearchSku] = useState<string>('');

  // Read active tab from URL query param, default to 'dashboard'
  const activeTab = (searchParams.get('tab') as TabType) || 'dashboard';

  // Update tab in URL when changed
  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Show loading while user is being fetched
  if (!user) {
    return <PageLoading message="Loading..." />;
  }

  // Check if user has access (stock controller, supervisor, or admin)
  const hasAccess =
    user.role === 'STOCK_CONTROLLER' || user.role === 'SUPERVISOR' || user.role === 'ADMIN';

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="max-w-md bg-gray-800 border border-gray-700">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-warning-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">You need stock controller privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { key: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
      { key: 'inventory', label: 'Inventory', icon: CubeIcon },
      { key: 'transactions', label: 'Transactions', icon: DocumentTextIcon },
      { key: 'quick-actions', label: 'Quick Actions', icon: ArrowPathIcon },
    ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="animate-in">
          <h1 className="text-3xl font-bold text-white tracking-tight">Stock Control</h1>
          <p className="mt-2 text-gray-400">
            Manage inventory, stock counts, transfers, and adjustments
          </p>
        </div>

        {/* Quick Search */}
        <Card variant="glass">
          <CardContent className="p-4">
            <SearchInput
              onSelect={sku => {
                setQuickSearchSku(sku);
                setActiveTab('inventory');
              }}
              placeholder="Quick product search (SKU or name)..."
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card variant="glass">
          <CardContent className="p-2">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="animate-in">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'inventory' && <InventoryTab initialSku={quickSearchSku} />}
          {activeTab === 'transactions' && <TransactionsTab />}
          {activeTab === 'quick-actions' && <QuickActionsTab />}
        </div>
      </main>
    </div>
  );
}
