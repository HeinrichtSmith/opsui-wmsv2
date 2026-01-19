/**
 * Order queue page - Premium dark theme
 *
 * Lists available orders for pickers to claim
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { orderApi, useOrderQueue, useClaimOrder } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Header } from '@/components/shared';
import { OrderPriorityBadge, OrderStatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { showSuccess, showError } from '@/stores/uiStore';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import { ShoppingBagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { OrderPriority, OrderStatus } from '@opsui/shared';

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canPick = useAuthStore((state) => state.canPick);
  const userId = useAuthStore((state) => state.user?.userId);

  // Track current page for admin dashboard
  usePageTracking({ view: PageViews.ORDER_QUEUE });

  const [statusFilter, setStatusFilter] = useState<OrderStatus>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | undefined>();
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const getEffectiveRole = useAuthStore((state) => state.getEffectiveRole);
  const [initialTabSet, setInitialTabSet] = useState(false);

  const { data: queueData, isLoading } = useOrderQueue({
    status: statusFilter,
    priority: priorityFilter,
    // For PICKING (Tote) tab, only show orders claimed by current picker (unless admin with no active role)
    pickerId: statusFilter === 'PICKING' && !(isAdmin && !getEffectiveRole()) ? userId : undefined,
  });

  // Debug: Log orders to see if items are included (must be before any conditional returns)
  const orders = queueData?.orders || [];

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }

    const query = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      // Search in order ID
      if (order.orderId.toLowerCase().includes(query)) {
        return true;
      }

      // Search in customer name
      if (order.customerName?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in items (SKU and name)
      if (order.items && order.items.length > 0) {
        return order.items.some((item) => {
          // Search in SKU
          if (item.sku?.toLowerCase().includes(query)) {
            return true;
          }
          // Search in item name
          if (item.name?.toLowerCase().includes(query)) {
            return true;
          }
          return false;
        });
      }

      return false;
    });
  }, [orders, searchQuery]);
  useEffect(() => {
    if (orders.length > 0) {
      console.log('[OrderQueue] Orders loaded:', orders);
      console.log('[OrderQueue] First order:', orders[0]);
      console.log('[OrderQueue] First order items:', orders[0].items);
      console.log('[OrderQueue] First order items length:', orders[0].items?.length);
      // Log all orders with their item counts
      orders.forEach((order, idx) => {
        console.log(`[OrderQueue] Order ${idx + 1}: ${order.orderId}, Status: ${order.status}, Items: ${order.items?.length || 0}`);
      });
    }
  }, [orders]);

  // Auto-detect which tab to show based on whether picker has items in tote
  useEffect(() => {
    const setInitialTab = async () => {
      if (!userId || initialTabSet) return; // Skip if not logged in or already set

      try {
        // Query for PICKING orders to check if picker has items in tote
        const result = await orderApi.getOrderQueue({
          status: 'PICKING',
          pickerId: userId,
        });

        // If picker has items in tote, switch to TOTE tab
        // Otherwise stay on PENDING tab (default)
        if (result.orders.length > 0) {
          console.log('[OrderQueue] Picker has items in tote, switching to TOTE tab');
          setStatusFilter('PICKING');
        } else {
          console.log('[OrderQueue] Picker has no items in tote, staying on PENDING tab');
          setStatusFilter('PENDING');
        }
      } catch (error) {
        console.error('[OrderQueue] Error checking for PICKING orders:', error);
        // Default to PENDING on error
        setStatusFilter('PENDING');
      } finally {
        setInitialTabSet(true);
      }
    };

    setInitialTab();
  }, [userId, initialTabSet]);

  // Refetch orders when component mounts or filter changes to get fresh progress data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, statusFilter, priorityFilter]);

  const claimMutation = useClaimOrder();

  const handleClaimOrder = async (orderId: string, orderStatus: OrderStatus) => {
    if (!userId) {
      showError('You must be logged in to claim orders');
      return;
    }

    // For PICKING orders, just navigate without claiming
    if (orderStatus === 'PICKING') {
      // Invalidate picker activity cache so admin dashboard shows this as current order
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      navigate(`/orders/${orderId}/pick`);
      return;
    }

    // For PENDING orders, claim the order
    // Prevent multiple claims on the same order
    if (claimingOrderId === orderId) {
      return;
    }

    setClaimingOrderId(orderId);

    try {
      await claimMutation.mutateAsync({
        orderId,
        dto: { pickerId: userId },
      });
      showSuccess('Order claimed successfully');

      // Navigate to picking page for the claimed order
      navigate(`/orders/${orderId}/pick`);
    } catch (error: any) {
      // Handle specific error messages based on response
      if (error?.response?.data?.error) {
        const backendError = error.response.data.error;

        if (backendError.includes('already claimed')) {
          showError('Order is already claimed by another picker');
        } else if (backendError.includes('status')) {
          showError(`Order cannot be claimed: ${backendError}`);
        } else if (backendError.includes('too many active orders')) {
          showError('You have reached the maximum of 5 active orders. Please complete some orders before claiming more.');
        } else {
          showError(backendError);
        }
      } else {
        showError(error instanceof Error ? error.message : 'Failed to claim order');
      }
    } finally {
      setClaimingOrderId(null);
    }
  };

  if (!canPick) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card variant="glass" className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">
              You need picker privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading order queue...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Order Queue</h1>
          <p className="mt-2 text-gray-400 text-responsive-sm">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-none">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search order"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-input pl-10 pr-4 py-2.5 w-full sm:w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
            className="mobile-input px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300 [&_option]:bg-gray-900 [&_option]:text-gray-100 [&_option]:cursor-pointer"
          >
            <option value="PENDING">Pending</option>
            <option value="PICKING">Tote</option>
          </select>

          <select
            value={priorityFilter || 'all'}
            onChange={(e) =>
              setPriorityFilter(e.target.value === 'all' ? undefined : (e.target.value as OrderPriority))
            }
            className="mobile-input px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300 [&_option]:bg-gray-900 [&_option]:text-gray-100 [&_option]:cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <Card variant="glass" className="card-hover">
          <CardContent className="p-8 sm:p-16 text-center">
            <ShoppingBagIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-responsive-sm">
              {searchQuery ? 'No orders match your search' : 'No orders available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredOrders.map((order) => (
            <Card key={order.orderId} variant="glass" className="card-hover group">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-base sm:text-lg tracking-tight truncate">{order.orderId}</h3>
                    <p className="text-sm text-gray-400 mt-1 truncate">{order.customerName}</p>
                  </div>
                  <div className="flex flex-col gap-2 ml-2">
                    <OrderPriorityBadge priority={order.priority} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-400 mb-5">
                  <div className="flex items-center justify-between">
                    <span>Items:</span>
                    <span className="text-white font-medium">{order.items?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Progress:</span>
                    <span className="text-white font-medium">{order.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span className="text-white font-medium text-xs sm:text-sm">{formatDate(order.createdAt)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>

                  {/* Show items with details - collapsible on mobile */}
                  {order.items && order.items.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-white/[0.08]">
                      <p className="font-medium text-gray-300 mb-3 text-xs uppercase tracking-wider">Items to Pick:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {order.items.map((item, itemIdx) => {
                          // Check if item is completed (COMPLETED for pick_tasks, FULLY_PICKED for order_items)
                          const isCompleted = item.status === 'COMPLETED' || item.status === 'FULLY_PICKED' || (item.pickedQuantity >= item.quantity);
                          const isSkipped = item.status === 'SKIPPED';
                          const isPartial = !isCompleted && !isSkipped && item.pickedQuantity > 0 && item.pickedQuantity < item.quantity;
                          const itemStatusColor = isCompleted
                            ? 'text-success-400 bg-success-500/10 border-success-500/20'
                            : isSkipped
                            ? 'text-warning-400 bg-warning-500/10 border-warning-500/20'
                            : isPartial
                            ? 'text-primary-400 bg-primary-500/10 border-primary-500/20'
                            : 'text-gray-400 bg-white/[0.02] border-white/[0.05]';

                          return (
                            <div
                              key={`${order.orderId}-item-${itemIdx}`}
                              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs p-2 rounded-lg border ${itemStatusColor} gap-1`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{item.sku}</span>
                                <span className="text-gray-500 hidden sm:inline">"</span>
                                <span className="truncate hidden sm:inline">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-3 sm:gap-3 justify-between sm:justify-end">
                                <span className="text-xs">Loc: {item.binLocation}</span>
                                <span className="font-medium">
                                  {isSkipped ? 'Skipped' : `${item.pickedQuantity || 0}/${item.quantity}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-white/[0.08] text-xs text-gray-500">
                      No items available
                    </div>
                  )}
                </div>

                <Button
                  fullWidth
                  size="md"
                  variant="primary"
                  onClick={() => handleClaimOrder(order.orderId, order.status)}
                  disabled={
                    claimMutation.isPending ||
                    (order.status !== 'PENDING' && order.status !== 'PICKING') ||
                    (order.status === 'PENDING' && claimingOrderId === order.orderId)
                  }
                  isLoading={order.status === 'PENDING' && claimingOrderId === order.orderId}
                  className="group-hover:shadow-glow transition-all duration-300 touch-target"
                >
                  {order.status === 'PICKING' ? 'Continue Picking' : 'Claim Order'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </main>
    </div>
  );
}