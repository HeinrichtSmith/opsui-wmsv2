/**
 * API service functions
 *
 * Functions for making API calls to backend
 */

import { apiClient, handleAPIError } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import type {
  Order,
  OrderStatus,
  OrderPriority,
  CreateOrderDTO,
  ClaimOrderDTO,
  PickItemDTO,
  CompleteOrderDTO,
  CancelOrderDTO,
  PickActionResponse,
  DashboardMetricsResponse,
  User,
  LoginCredentials,
  AuthTokens,
  ExceptionType,
  ExceptionStatus,
  ExceptionResolution,
  LogExceptionDTO,
  ResolveExceptionDTO,
  CycleCountStatus,
  CycleCountType,
  CycleCountPlan,
  CycleCountEntry,
  CycleCountTolerance,
  LocationCapacity,
  CapacityRule,
  CapacityAlert,
  QualityInspection,
  InspectionChecklist,
  ReturnAuthorization,
  UserRole,
  ASNStatus,
  ReceiptStatus,
  PutawayStatus,
  AdvanceShippingNotice,
  Receipt,
  PutawayTask,
} from '@opsui/shared';

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * Get current user info
   */
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Set user to idle status
   */
  setIdle: async (): Promise<void> => {
    await apiClient.post('/auth/set-idle');
  },

  /**
   * Set active role (for multi-role users)
   */
  setActiveRole: async (activeRole: UserRole): Promise<{ user: User; activeRole: UserRole }> => {
    const response = await apiClient.post<{ user: User; activeRole: UserRole }>(
      '/auth/active-role',
      { activeRole }
    );
    return response.data;
  },

  /**
   * Get current user's additional roles
   */
  getMyRoles: async (): Promise<UserRole[]> => {
    const response = await apiClient.get<UserRole[]>('/role-assignments/my-roles');
    return response.data;
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },
};

// ============================================================================
// ROLE ASSIGNMENTS API
// ============================================================================

export const roleAssignmentApi = {
  /**
   * Get all role assignments (admin only)
   */
  getAllAssignments: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/role-assignments');
    return response.data;
  },

  /**
   * Get role assignments for a specific user
   */
  getUserAssignments: async (userId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/role-assignments/user/${userId}`);
    return response.data;
  },

  /**
   * Grant a role to a user (admin only)
   */
  grantRole: async (userId: string, role: UserRole): Promise<any> => {
    const response = await apiClient.post<any>('/role-assignments/grant', { userId, role });
    return response.data;
  },

  /**
   * Revoke a role from a user (admin only)
   */
  revokeRole: async (userId: string, role: UserRole): Promise<void> => {
    await apiClient.delete('/role-assignments/revoke', { data: { userId, role } });
  },
};

// ============================================================================
// ORDER API
// ============================================================================

export const orderApi = {
  /**
   * Create a new order
   */
  createOrder: async (dto: CreateOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', dto);
    return response.data;
  },

  /**
   * Get order queue
   */
  getOrderQueue: async (params?: {
    status?: OrderStatus;
    priority?: OrderPriority;
    pickerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number }> => {
    const response = await apiClient.get<{ orders: Order[]; total: number }>('/orders', { params });
    return response.data;
  },

  /**
   * Get my active orders
   */
  getMyOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/my-orders');
    return response.data;
  },

  /**
   * Get order details
   */
  getOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Claim an order
   */
  claimOrder: async (orderId: string, dto: ClaimOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/claim`, dto);
    return response.data;
  },

  /**
   * Get next pick task
   */
  getNextTask: async (
    orderId: string
  ): Promise<{
    pickTaskId: string;
    sku: string;
    name: string;
    targetBin: string;
    quantity: number;
    pickedQuantity: number;
  } | null> => {
    const response = await apiClient.get(`/orders/${orderId}/next-task`);
    return response.data;
  },

  /**
   * Pick an item
   */
  pickItem: async (orderId: string, dto: PickItemDTO): Promise<PickActionResponse> => {
    const response = await apiClient.post<PickActionResponse>(`/orders/${orderId}/pick`, dto);
    return response.data;
  },

  /**
   * Complete order
   */
  completeOrder: async (orderId: string, dto: CompleteOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/complete`, dto);
    return response.data;
  },

  /**
   * Cancel order
   */
  cancelOrder: async (orderId: string, dto: CancelOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/cancel`, dto);
    return response.data;
  },

  /**
   * Skip pick task
   */
  skipTask: async (orderId: string, pickTaskId: string, reason: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/skip-task`, {
      pickTaskId,
      reason,
    });
    return response.data;
  },

  /**
   * Get order progress
   */
  getProgress: async (
    orderId: string
  ): Promise<{
    total: number;
    completed: number;
    skipped: number;
    inProgress: number;
    pending: number;
    percentage: number;
  }> => {
    const response = await apiClient.get(`/orders/${orderId}/progress`);
    return response.data;
  },
};

// ============================================================================
// INVENTORY API
// ============================================================================

export const inventoryApi = {
  /**
   * Get inventory by SKU
   */
  getBySKU: async (sku: string) => {
    const response = await apiClient.get(`/inventory/sku/${sku}`);
    return response.data;
  },

  /**
   * Get inventory by bin location
   */
  getByBin: async (binLocation: string) => {
    const response = await apiClient.get(`/inventory/bin/${binLocation}`);
    return response.data;
  },

  /**
   * Get available inventory for SKU
   */
  getAvailable: async (sku: string) => {
    const response = await apiClient.get(`/inventory/sku/${sku}/available`);
    return response.data;
  },

  /**
   * Get transaction history
   */
  getTransactions: async (params?: {
    sku?: string;
    orderId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inventory/transactions', { params });
    return response.data;
  },

  /**
   * Get low stock alerts
   */
  getLowStock: async (threshold?: number) => {
    const response = await apiClient.get('/inventory/alerts/low-stock', {
      params: threshold ? { threshold } : undefined,
    });
    return response.data;
  },

  /**
   * Reconcile inventory
   */
  reconcile: async (sku: string) => {
    const response = await apiClient.get(`/inventory/reconcile/${sku}`);
    return response.data;
  },

  /**
   * Adjust inventory
   */
  adjust: async (sku: string, binLocation: string, quantity: number, reason: string) => {
    const response = await apiClient.post('/inventory/adjust', {
      sku,
      binLocation,
      quantity,
      reason,
    });
    return response.data;
  },
};

// ============================================================================
// METRICS API
// ============================================================================

export const metricsApi = {
  /**
   * Get dashboard metrics
   */
  getDashboard: async (): Promise<DashboardMetricsResponse> => {
    const response = await apiClient.get<DashboardMetricsResponse>('/metrics/dashboard');
    return response.data;
  },

  /**
   * Get picker performance
   */
  getPickerPerformance: async (pickerId: string, startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get(`/metrics/picker/${pickerId}`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get all pickers performance
   */
  getAllPickersPerformance: async (startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get('/metrics/pickers', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get order status breakdown
   */
  getOrderStatusBreakdown: async () => {
    const response = await apiClient.get('/metrics/orders/status-breakdown');
    return response.data;
  },

  /**
   * Get hourly throughput
   */
  getHourlyThroughput: async () => {
    const response = await apiClient.get('/metrics/orders/hourly-throughput');
    return response.data;
  },

  /**
   * Get picker activity
   */
  getPickerActivity: async () => {
    const response = await apiClient.get('/metrics/picker-activity');
    return response.data;
  },

  /**
   * Get picker orders
   */
  getPickerOrders: async (pickerId: string) => {
    const response = await apiClient.get(`/metrics/picker/${pickerId}/orders`);
    return response.data;
  },

  /**
   * Get packer activity
   */
  getPackerActivity: async () => {
    const response = await apiClient.get('/metrics/packer-activity');
    return response.data;
  },

  /**
   * Get packer orders
   */
  getPackerOrders: async (packerId: string) => {
    const response = await apiClient.get(`/metrics/packer/${packerId}/orders`);
    return response.data;
  },

  /**
   * Get stock controller activity
   */
  getStockControllerActivity: async () => {
    const response = await apiClient.get('/metrics/stock-controller-activity');
    return response.data;
  },

  /**
   * Get my performance
   */
  getMyPerformance: async (startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get('/metrics/my-performance', {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// ============================================================================
// SKU API
// ============================================================================

export const skuApi = {
  /**
   * Search SKUs
   */
  search: async (query: string) => {
    const response = await apiClient.get('/skus', { params: { q: query } });
    return response.data;
  },

  /**
   * Get categories
   */
  getCategories: async () => {
    const response = await apiClient.get<string[]>('/skus/categories');
    return response.data;
  },

  /**
   * Get SKU details with inventory
   */
  getWithInventory: async (sku: string) => {
    const response = await apiClient.get(`/skus/${sku}`);
    return response.data;
  },
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: authApi.login,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useUpdateCurrentView = () => {
  return useMutation({
    mutationFn: async (view: string) => {
      console.log('[useUpdateCurrentView] Calling API with view:', view);
      const response = await apiClient.post('/auth/current-view', { view });
      console.log('[useUpdateCurrentView] Success:', response.data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log('[useUpdateCurrentView] onSuccess - View updated:', variables);
    },
    onError: error => {
      console.error('[useUpdateCurrentView] onError - Failed to update view:', error);
    },
  });
};

export const useSetIdle = () => {
  return useMutation({
    mutationFn: async () => {
      console.log('[useSetIdle] Setting user to idle');
      const response = await apiClient.post('/auth/set-idle');
      console.log('[useSetIdle] Success:', response.data);
      return response.data;
    },
    onError: error => {
      console.error('[useSetIdle] onError - Failed to set idle:', error);
    },
  });
};

export const useSetActiveRole = () => {
  const setActiveRole = useAuthStore(state => state.setActiveRole);
  const updateTokens = useAuthStore(state => state.updateTokens);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activeRole: UserRole) => {
      console.log('[useSetActiveRole] Setting active role:', activeRole);
      const response = await apiClient.post('/auth/active-role', { activeRole });
      console.log('[useSetActiveRole] API response:', response.data);
      return response.data;
    },
    onSuccess: data => {
      console.log('[useSetActiveRole] Success - Updating auth store:', data);
      // Update auth store with new activeRole AND new access token
      if (data.accessToken) {
        // The backend returns a new token with the updated activeRole claim
        updateTokens(data.accessToken, useAuthStore.getState().refreshToken || '', data.user);
      } else {
        // Fallback: just update activeRole if no token returned
        setActiveRole(data.activeRole);
      }
      // Invalidate and refetch current user query to get updated user data
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'], refetchType: 'all' });
    },
    onError: error => {
      console.error('[useSetActiveRole] Failed to set active role:', error);
      handleAPIError(error);
    },
  });
};

// ============================================================================
// ROLE ASSIGNMENTS HOOKS
// ============================================================================

export const useMyRoles = (options?: Omit<UseQueryOptions<UserRole[]>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['role-assignments', 'my-roles'],
    queryFn: authApi.getMyRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useUsers = (options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: authApi.getAllUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useAllRoleAssignments = () => {
  return useQuery({
    queryKey: ['role-assignments', 'all'],
    queryFn: roleAssignmentApi.getAllAssignments,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGrantRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      roleAssignmentApi.grantRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useRevokeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      roleAssignmentApi.revokeRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useCurrentUser = (options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    ...options,
  });
};

// Order hooks
export const useOrderQueue = (params?: {
  status?: OrderStatus;
  priority?: OrderPriority;
  pickerId?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['orders', 'queue', params],
    queryFn: () => orderApi.getOrderQueue(params),
  });
};

export const useMyOrders = () => {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: orderApi.getMyOrders,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderApi.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const useNextTask = (orderId: string) => {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['orders', orderId, 'next-task'],
    queryFn: () => {
      console.log(`[useNextTask] Fetching next task for order: ${orderId}`);
      return orderApi.getNextTask(orderId);
    },
    enabled: !!orderId,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: 'always', // Always refetch on component mount
  });

  // Invalidate picker activity cache when next task successfully fetches
  // This ensures admin dashboard updates when picker navigates to picking page
  const { data, error, isError } = result;

  if (data !== undefined) {
    console.log(`[useNextTask] Success for order ${orderId}:`, data);
    queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
  }

  if (isError) {
    console.error(`[useNextTask] Error for order ${orderId}:`, error);
  }

  return result;
};

export const useClaimOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: ClaimOrderDTO }) =>
      orderApi.claimOrder(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
};

export const usePickItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: PickItemDTO }) =>
      orderApi.pickItem(orderId, dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
};

export const useCompleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: CompleteOrderDTO }) =>
      orderApi.completeOrder(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
};

// Metrics hooks
export const useDashboardMetrics = (
  options?: Omit<UseQueryOptions<DashboardMetricsResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['metrics', 'dashboard'],
    queryFn: metricsApi.getDashboard,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    ...options,
  });
};

export const usePickerActivity = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  const result = useQuery({
    queryKey: ['metrics', 'picker-activity'],
    queryFn: async () => {
      const data = await metricsApi.getPickerActivity();
      console.log('[API] Raw picker activity data:', JSON.stringify(data, null, 2));
      return data;
    },
    refetchInterval: 1000, // Poll every 1 second for real-time updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (gcTime replaced cacheTime in v5)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    retry: 1, // Only retry once
    ...options,
  });

  return result;
};

export const usePickerOrders = (pickerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['metrics', 'picker-orders', pickerId],
    queryFn: () => metricsApi.getPickerOrders(pickerId),
    enabled: enabled && !!pickerId,
    staleTime: 5000, // Cache for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

export const usePackerActivity = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  const result = useQuery({
    queryKey: ['metrics', 'packer-activity'],
    queryFn: async () => {
      const data = await metricsApi.getPackerActivity();
      console.log('[API] Raw packer activity data:', JSON.stringify(data, null, 2));
      return data;
    },
    refetchInterval: 1000, // Poll every 1 second for real-time updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (gcTime replaced cacheTime in v5)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    retry: 1, // Only retry once
    ...options,
  });

  return result;
};

export const usePackerOrders = (packerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['metrics', 'packer-orders', packerId],
    queryFn: () => metricsApi.getPackerOrders(packerId),
    enabled: enabled && !!packerId,
    staleTime: 5000, // Cache for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

export const useStockControllerActivity = (
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  const result = useQuery({
    queryKey: ['metrics', 'stock-controller-activity'],
    queryFn: async () => {
      const data = await metricsApi.getStockControllerActivity();
      console.log('[API] Raw stock controller activity data:', JSON.stringify(data, null, 2));
      return data;
    },
    refetchInterval: 1000, // Poll every 1 second for real-time updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (gcTime replaced cacheTime in v5)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    retry: 1, // Only retry once
    ...options,
  });

  return result;
};

/**
 * Get stock controller transactions
 */
export const getStockControllerTransactions = async (controllerId: string) => {
  const response = await apiClient.get(`/metrics/stock-controller/${controllerId}/transactions`);
  return response.data;
};

export const useStockControllerTransactions = (controllerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['metrics', 'stock-controller-transactions', controllerId],
    queryFn: () => getStockControllerTransactions(controllerId),
    enabled: enabled && !!controllerId,
    staleTime: 5000, // Cache for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

// ============================================================================
// PACKING API
// ============================================================================

export const packingApi = {
  /**
   * Claim an order for packing
   */
  claimForPacking: async (orderId: string, packerId: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/claim-for-packing`, {
      packerId,
    });
    return response.data;
  },

  /**
   * Complete packing
   */
  completePacking: async (
    orderId: string,
    dto: { orderId: string; packerId: string }
  ): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/complete-packing`, dto);
    return response.data;
  },

  /**
   * Get packing queue (orders ready for packing)
   */
  getPackingQueue: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/packing-queue');
    return response.data;
  },
};

// Packer hooks
export const useClaimOrderForPacking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, packerId }: { orderId: string; packerId: string }) =>
      packingApi.claimForPacking(orderId, packerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
    },
  });
};

export const useCompletePacking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      dto,
    }: {
      orderId: string;
      dto: { orderId: string; packerId: string };
    }) => packingApi.completePacking(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
    },
  });
};

export const usePackingQueue = () => {
  return useQuery({
    queryKey: ['orders', 'packing-queue'],
    queryFn: packingApi.getPackingQueue,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useUnclaimOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const response = await apiClient.post(`/orders/${orderId}/unclaim`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
    },
  });
};

// ============================================================================
// STOCK CONTROL API
// ============================================================================

export const stockControlApi = {
  /**
   * Get stock control dashboard
   */
  getDashboard: async () => {
    const response = await apiClient.get('/stock-control/dashboard');
    return response.data;
  },

  /**
   * Get inventory list with filters
   */
  getInventoryList: async (params: {
    name?: string;
    sku?: string;
    category?: string;
    binLocation?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/stock-control/inventory', { params });
    return response.data;
  },

  /**
   * Get SKU inventory detail
   */
  getSKUInventoryDetail: async (sku: string) => {
    const response = await apiClient.get(`/stock-control/inventory/${sku}`);
    return response.data;
  },

  /**
   * Create stock count
   */
  createStockCount: async (binLocation: string, type: 'FULL' | 'CYCLE' | 'SPOT') => {
    const response = await apiClient.post('/stock-control/stock-count', { binLocation, type });
    return response.data;
  },

  /**
   * Submit stock count
   */
  submitStockCount: async (
    countId: string,
    items: Array<{ sku: string; countedQuantity: number; notes?: string }>
  ) => {
    const response = await apiClient.post(`/stock-control/stock-count/${countId}/submit`, {
      items,
    });
    return response.data;
  },

  /**
   * Get stock counts
   */
  getStockCounts: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/stock-control/stock-counts', { params });
    return response.data;
  },

  /**
   * Transfer stock
   */
  transferStock: async (
    sku: string,
    fromBin: string,
    toBin: string,
    quantity: number,
    reason: string
  ) => {
    const response = await apiClient.post('/stock-control/transfer', {
      sku,
      fromBin,
      toBin,
      quantity,
      reason,
    });
    return response.data;
  },

  /**
   * Adjust inventory
   */
  adjustInventory: async (sku: string, binLocation: string, quantity: number, reason: string) => {
    const response = await apiClient.post('/stock-control/adjust', {
      sku,
      binLocation,
      quantity,
      reason,
    });
    return response.data;
  },

  /**
   * Get transaction history
   */
  getTransactionHistory: async (params?: {
    sku?: string;
    binLocation?: string;
    type?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/stock-control/transactions', { params });
    return response.data;
  },

  /**
   * Get low stock report
   */
  getLowStockReport: async (threshold?: number) => {
    const response = await apiClient.get('/stock-control/reports/low-stock', {
      params: threshold ? { threshold } : undefined,
    });
    return response.data;
  },

  /**
   * Get movement report
   */
  getMovementReport: async (params?: { startDate?: string; endDate?: string; sku?: string }) => {
    const response = await apiClient.get('/stock-control/reports/movements', { params });
    return response.data;
  },

  /**
   * Reconcile discrepancies
   */
  reconcileDiscrepancies: async (
    discrepancies: Array<{
      sku: string;
      binLocation: string;
      systemQuantity: number;
      actualQuantity: number;
      variance: number;
      reason: string;
    }>
  ) => {
    const response = await apiClient.post('/stock-control/reconcile', { discrepancies });
    return response.data;
  },

  /**
   * Get bin locations
   */
  getBinLocations: async (params?: { zone?: string; active?: boolean }) => {
    const response = await apiClient.get('/stock-control/bins', { params });
    return response.data;
  },
};

// Stock control hooks
export const useStockControlDashboard = () => {
  return useQuery({
    queryKey: ['stock-control', 'dashboard'],
    queryFn: stockControlApi.getDashboard,
    refetchInterval: 5000,
  });
};

export const useStockControlInventory = (params: {
  name?: string;
  sku?: string;
  category?: string;
  binLocation?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['stock-control', 'inventory', params],
    queryFn: () => stockControlApi.getInventoryList(params),
  });
};

export const useSKUInventoryDetail = (sku: string) => {
  return useQuery({
    queryKey: ['stock-control', 'inventory', sku],
    queryFn: () => stockControlApi.getSKUInventoryDetail(sku),
    enabled: !!sku,
  });
};

export const useCreateStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ binLocation, type }: { binLocation: string; type: 'FULL' | 'CYCLE' | 'SPOT' }) =>
      stockControlApi.createStockCount(binLocation, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
    },
  });
};

export const useSubmitStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      countId,
      items,
    }: {
      countId: string;
      items: Array<{ sku: string; countedQuantity: number; notes?: string }>;
    }) => stockControlApi.submitStockCount(countId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
    },
  });
};

export const useStockCounts = (params?: { status?: string; limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: ['stock-control', 'stock-counts', params],
    queryFn: () => stockControlApi.getStockCounts(params),
  });
};

export const useTransferStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sku,
      fromBin,
      toBin,
      quantity,
      reason,
    }: {
      sku: string;
      fromBin: string;
      toBin: string;
      quantity: number;
      reason: string;
    }) => stockControlApi.transferStock(sku, fromBin, toBin, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useAdjustInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sku,
      binLocation,
      quantity,
      reason,
    }: {
      sku: string;
      binLocation: string;
      quantity: number;
      reason: string;
    }) => stockControlApi.adjustInventory(sku, binLocation, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useStockControlTransactions = (params?: {
  sku?: string;
  binLocation?: string;
  type?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['stock-control', 'transactions', params],
    queryFn: () => stockControlApi.getTransactionHistory(params),
  });
};

export const useLowStockReport = (threshold?: number) => {
  return useQuery({
    queryKey: ['stock-control', 'reports', 'low-stock', threshold],
    queryFn: () => stockControlApi.getLowStockReport(threshold),
  });
};

export const useMovementReport = (params?: {
  startDate?: string;
  endDate?: string;
  sku?: string;
}) => {
  return useQuery({
    queryKey: ['stock-control', 'reports', 'movements', params],
    queryFn: () => stockControlApi.getMovementReport(params),
  });
};

export const useReconcileDiscrepancies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      discrepancies: Array<{
        sku: string;
        binLocation: string;
        systemQuantity: number;
        actualQuantity: number;
        variance: number;
        reason: string;
      }>
    ) => stockControlApi.reconcileDiscrepancies(discrepancies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useBinLocations = (params?: { zone?: string; active?: boolean }) => {
  return useQuery({
    queryKey: ['stock-control', 'bins', params],
    queryFn: () => stockControlApi.getBinLocations(params),
  });
};

// ============================================================================
// ORDER EXCEPTIONS API
// ============================================================================

export const exceptionApi = {
  /**
   * Log a new exception
   */
  logException: async (dto: LogExceptionDTO) => {
    const response = await apiClient.post('/exceptions/log', dto);
    return response.data;
  },

  /**
   * Get all exceptions
   */
  getExceptions: async (params?: {
    status?: ExceptionStatus;
    orderId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/exceptions', { params });
    return response.data;
  },

  /**
   * Get open exceptions
   */
  getOpenExceptions: async (params?: {
    orderId?: string;
    sku?: string;
    type?: ExceptionType;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/exceptions/open', { params });
    return response.data;
  },

  /**
   * Get exception summary
   */
  getExceptionSummary: async () => {
    const response = await apiClient.get('/exceptions/summary');
    return response.data;
  },

  /**
   * Get exception by ID
   */
  getException: async (exceptionId: string) => {
    const response = await apiClient.get(`/exceptions/${exceptionId}`);
    return response.data;
  },

  /**
   * Resolve an exception
   */
  resolveException: async (exceptionId: string, dto: ResolveExceptionDTO) => {
    const response = await apiClient.post(`/exceptions/${exceptionId}/resolve`, dto);
    return response.data;
  },
};

// Exception hooks
export const useLogException = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: LogExceptionDTO) => exceptionApi.logException(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useExceptions = (params?: {
  status?: ExceptionStatus;
  orderId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['exceptions', params],
    queryFn: () => exceptionApi.getExceptions(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000, // Poll every 10 seconds
  });
};

export const useOpenExceptions = (params?: {
  orderId?: string;
  sku?: string;
  type?: ExceptionType;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['exceptions', 'open', params],
    queryFn: () => exceptionApi.getOpenExceptions(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 5000, // Poll every 5 seconds for open exceptions
  });
};

export const useExceptionSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['exceptions', 'summary'],
    queryFn: exceptionApi.getExceptionSummary,
    enabled,
    refetchInterval: 15000, // Poll every 15 seconds
  });
};

export const useResolveException = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, dto }: { exceptionId: string; dto: ResolveExceptionDTO }) =>
      exceptionApi.resolveException(exceptionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// ============================================================================
// CYCLE COUNTING API
// ============================================================================

export const cycleCountApi = {
  /**
   * Get all cycle count plans
   */
  getPlans: async (params?: {
    status?: CycleCountStatus;
    countType?: CycleCountType;
    location?: string;
    countBy?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/cycle-count/plans', { params });
    return response.data;
  },

  /**
   * Get cycle count plan by ID
   */
  getPlan: async (planId: string) => {
    const response = await apiClient.get(`/cycle-count/plans/${planId}`);
    return response.data;
  },

  /**
   * Create cycle count plan
   */
  createPlan: async (dto: {
    planName: string;
    countType: string;
    scheduledDate: string;
    location?: string;
    sku?: string;
    countBy: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/cycle-count/plans', dto);
    return response.data;
  },

  /**
   * Start cycle count plan
   */
  startPlan: async (planId: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/start`);
    return response.data;
  },

  /**
   * Complete cycle count plan
   */
  completePlan: async (planId: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/complete`);
    return response.data;
  },

  /**
   * Reconcile cycle count plan
   */
  reconcilePlan: async (planId: string, notes?: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/reconcile`, { notes });
    return response.data;
  },

  /**
   * Create cycle count entry
   */
  createEntry: async (dto: {
    planId: string;
    sku: string;
    binLocation: string;
    countedQuantity: number;
    notes?: string;
  }) => {
    const response = await apiClient.post('/cycle-count/entries', dto);
    return response.data;
  },

  /**
   * Update variance status
   */
  updateVarianceStatus: async (entryId: string, status: string, notes?: string) => {
    const response = await apiClient.patch(`/cycle-count/entries/${entryId}/variance`, {
      status,
      notes,
    });
    return response.data;
  },

  /**
   * Get tolerance rules
   */
  getTolerances: async () => {
    const response = await apiClient.get('/cycle-count/tolerances');
    return response.data;
  },
};

export const useCycleCountPlans = (params?: {
  status?: string;
  countType?: CycleCountType;
  location?: string;
  countBy?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['cycle-count', 'plans', params],
    queryFn: () => cycleCountApi.getPlans(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useCycleCountPlan = (planId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['cycle-count', 'plans', planId],
    queryFn: () => cycleCountApi.getPlan(planId),
    enabled,
    refetchInterval: 5000,
  });
};

export const useCycleCountTolerances = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['cycle-count', 'tolerances'],
    queryFn: cycleCountApi.getTolerances,
    enabled,
  });
};

export const useCreateCycleCountPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useStartCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.startPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useCompleteCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.completePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useReconcileCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, notes }: { planId: string; notes?: string }) =>
      cycleCountApi.reconcilePlan(planId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useCreateCycleCountEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useUpdateVarianceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, status, notes }: { entryId: string; status: string; notes?: string }) =>
      cycleCountApi.updateVarianceStatus(entryId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

// ============================================================================
// LOCATION CAPACITY API
// ============================================================================

export const locationCapacityApi = {
  /**
   * Get all capacity rules
   */
  getRules: async () => {
    const response = await apiClient.get('/location-capacity/rules');
    return response.data;
  },

  /**
   * Create capacity rule
   */
  createRule: async (dto: {
    ruleName: string;
    description?: string;
    capacityType: string;
    capacityUnit: string;
    appliesTo: string;
    zone?: string;
    locationType?: string;
    specificLocation?: string;
    maximumCapacity: number;
    warningThreshold: number;
    allowOverfill: boolean;
    overfillThreshold?: number;
    priority: number;
  }) => {
    const response = await apiClient.post('/location-capacity/rules', dto);
    return response.data;
  },

  /**
   * Update capacity rule
   */
  updateRule: async (ruleId: string, updates: any) => {
    const response = await apiClient.patch(`/location-capacity/rules/${ruleId}`, updates);
    return response.data;
  },

  /**
   * Delete capacity rule
   */
  deleteRule: async (ruleId: string) => {
    const response = await apiClient.delete(`/location-capacity/rules/${ruleId}`);
    return response.data;
  },

  /**
   * Get all location capacities
   */
  getCapacities: async (params?: {
    capacityType?: string;
    status?: string;
    showAlertsOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/location-capacity/locations', { params });
    return response.data;
  },

  /**
   * Get location capacity
   */
  getLocationCapacity: async (binLocation: string) => {
    const response = await apiClient.get(`/location-capacity/locations/${binLocation}`);
    return response.data;
  },

  /**
   * Recalculate location capacity
   */
  recalculateCapacity: async (binLocation: string) => {
    const response = await apiClient.post(
      `/location-capacity/locations/${binLocation}/recalculate`
    );
    return response.data;
  },

  /**
   * Get capacity alerts
   */
  getAlerts: async (params?: {
    acknowledged?: boolean;
    alertType?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/location-capacity/alerts', { params });
    return response.data;
  },

  /**
   * Acknowledge capacity alert
   */
  acknowledgeAlert: async (alertId: string) => {
    const response = await apiClient.post(`/location-capacity/alerts/${alertId}/acknowledge`);
    return response.data;
  },
};

export const useCapacityRules = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['location-capacity', 'rules'],
    queryFn: locationCapacityApi.getRules,
    enabled,
    refetchInterval: 30000,
  });
};

export const useLocationCapacities = (params?: {
  capacityType?: string;
  status?: string;
  showAlertsOnly?: boolean;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['location-capacity', 'locations', params],
    queryFn: () => locationCapacityApi.getCapacities(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 15000,
  });
};

export const useCapacityAlerts = (params?: {
  acknowledged?: boolean;
  alertType?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['location-capacity', 'alerts', params],
    queryFn: () => locationCapacityApi.getAlerts(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useCreateCapacityRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

export const useUpdateCapacityRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: any }) =>
      locationCapacityApi.updateRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

export const useDeleteCapacityRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.acknowledgeAlert,
    onSuccess: () => {
      queryClientQueries({ queryKey: ['location-capacity', 'alerts'] });
    },
  });
};

export const useRecalculateCapacity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.recalculateCapacity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

// ============================================================================
// QUALITY CONTROL API
// ============================================================================

export const qualityControlApi = {
  /**
   * Get all inspection checklists
   */
  getChecklists: async (params?: {
    inspectionType?: string;
    sku?: string;
    category?: string;
    activeOnly?: boolean;
  }) => {
    const response = await apiClient.get('/quality-control/checklists', { params });
    return response.data;
  },

  /**
   * Get inspection checklist by ID
   */
  getChecklist: async (checklistId: string) => {
    const response = await apiClient.get(`/quality-control/checklists/${checklistId}`);
    return response.data;
  },

  /**
   * Create inspection checklist
   */
  createChecklist: async (dto: {
    checklistName: string;
    description?: string;
    inspectionType: string;
    sku?: string;
    category?: string;
    items: Array<{
      itemDescription: string;
      itemType: string;
      isRequired: boolean;
      displayOrder: number;
      options?: string[];
    }>;
  }) => {
    const response = await apiClient.post('/quality-control/checklists', dto);
    return response.data;
  },

  /**
   * Get all quality inspections
   */
  getInspections: async (params?: {
    status?: string;
    inspectionType?: string;
    referenceType?: string;
    referenceId?: string;
    sku?: string;
    inspectorId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/quality-control/inspections', { params });
    return response.data;
  },

  /**
   * Get quality inspection by ID
   */
  getInspection: async (inspectionId: string) => {
    const response = await apiClient.get(`/quality-control/inspections/${inspectionId}`);
    return response.data;
  },

  /**
   * Create quality inspection
   */
  createInspection: async (dto: {
    inspectionType: string;
    referenceType: string;
    referenceId: string;
    sku: string;
    quantityInspected: number;
    location?: string;
    lotNumber?: string;
    expirationDate?: string;
    checklistId?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/quality-control/inspections', dto);
    return response.data;
  },

  /**
   * Start inspection
   */
  startInspection: async (inspectionId: string) => {
    const response = await apiClient.post(`/quality-control/inspections/${inspectionId}/start`);
    return response.data;
  },

  /**
   * Update inspection status
   */
  updateInspectionStatus: async (
    inspectionId: string,
    dto: {
      status: string;
      quantityPassed?: number;
      quantityFailed?: number;
      defectType?: string;
      defectDescription?: string;
      dispositionAction?: string;
      dispositionNotes?: string;
      notes?: string;
    }
  ) => {
    const response = await apiClient.patch(
      `/quality-control/inspections/${inspectionId}/status`,
      dto
    );
    return response.data;
  },

  /**
   * Get inspection results
   */
  getInspectionResults: async (inspectionId: string) => {
    const response = await apiClient.get(`/quality-control/inspections/${inspectionId}/results`);
    return response.data;
  },

  /**
   * Save inspection result
   */
  saveInspectionResult: async (dto: {
    inspectionId: string;
    checklistItemId: string;
    result: string;
    passed: boolean;
    notes?: string;
    imageUrl?: string;
  }) => {
    const response = await apiClient.post('/quality-control/inspections/results', dto);
    return response.data;
  },

  /**
   * Get all return authorizations
   */
  getReturns: async (params?: {
    status?: string;
    orderId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/quality-control/returns', { params });
    return response.data;
  },

  /**
   * Get return authorization by ID
   */
  getReturn: async (returnId: string) => {
    const response = await apiClient.get(`/quality-control/returns/${returnId}`);
    return response.data;
  },

  /**
   * Create return authorization
   */
  createReturn: async (dto: {
    orderId: string;
    customerId: string;
    customerName: string;
    returnReason: string;
    items: Array<{
      orderItemId: string;
      sku: string;
      name: string;
      quantity: number;
      returnReason: string;
      condition: string;
      refundAmount: number;
    }>;
    totalRefundAmount: number;
    restockingFee?: number;
    notes?: string;
  }) => {
    const response = await apiClient.post('/quality-control/returns', dto);
    return response.data;
  },

  /**
   * Update return status
   */
  updateReturnStatus: async (returnId: string, status: string) => {
    const response = await apiClient.patch(`/quality-control/returns/${returnId}/status`, {
      status,
    });
    return response.data;
  },
};

export const useInspectionChecklists = (params?: {
  inspectionType?: string;
  sku?: string;
  category?: string;
  activeOnly?: boolean;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['quality-control', 'checklists', params],
    queryFn: () => qualityControlApi.getChecklists(params),
    enabled: params?.enabled ?? true,
  });
};

export const useQualityInspections = (params?: {
  status?: string;
  inspectionType?: string;
  referenceId?: string;
  sku?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['quality-control', 'inspections', params],
    queryFn: () => qualityControlApi.getInspections(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useQualityInspection = (inspectionId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['quality-control', 'inspections', inspectionId],
    queryFn: () => qualityControlApi.getInspection(inspectionId),
    enabled,
    refetchInterval: 5000,
  });
};

export const useInspectionResults = (inspectionId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['quality-control', 'inspections', inspectionId, 'results'],
    queryFn: () => qualityControlApi.getInspectionResults(inspectionId),
    enabled,
  });
};

export const useReturnAuthorizations = (params?: {
  status?: string;
  orderId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['quality-control', 'returns', params],
    queryFn: () => qualityControlApi.getReturns(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 15000,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
    },
  });
};

export const useUpdateInspectionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, dto }: { inspectionId: string; dto: any }) =>
      qualityControlApi.updateInspectionStatus(inspectionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
    },
  });
};

export const useSaveInspectionResult = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.saveInspectionResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'inspections'] });
    },
  });
};

export const useCreateReturnAuthorization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

export const useUpdateReturnStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, status }: { returnId: string; status: string }) =>
      qualityControlApi.updateReturnStatus(returnId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'checklists'] });
    },
  });
};

export const useUpdateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, updates }: { inspectionId: string; updates: any }) =>
      qualityControlApi.updateInspectionStatus(inspectionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'inspections'] });
    },
  });
};

export const useDeleteChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checklistId: string) =>
      apiClient.delete(`/quality-control/checklists/${checklistId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'checklists'] });
    },
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

export const useAcknowledgeReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, notes }: { returnId: string; notes?: string }) =>
      apiClient.post(`/quality-control/returns/${returnId}/acknowledge`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

// ============================================================================
// INWARDS GOODS API
// ============================================================================

export const inwardsGoodsApi = {
  /**
   * Get inwards goods dashboard
   */
  getDashboard: async () => {
    const response = await apiClient.get('/inbound/dashboard');
    return response.data;
  },

  /**
   * Get all ASNs with optional filters
   */
  getASNs: async (params?: {
    status?: string;
    supplierId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/asn', { params });
    return response.data;
  },

  /**
   * Get ASN by ID
   */
  getASN: async (asnId: string) => {
    const response = await apiClient.get(`/inbound/asn/${asnId}`);
    return response.data;
  },

  /**
   * Create new ASN
   */
  createASN: async (dto: {
    supplierId: string;
    purchaseOrderNumber: string;
    expectedArrivalDate: Date;
    carrier?: string;
    trackingNumber?: string;
    shipmentNotes?: string;
    lineItems: Array<{
      sku: string;
      expectedQuantity: number;
      unitCost: number;
      lotNumber?: string;
      expirationDate?: Date;
      lineNotes?: string;
    }>;
  }) => {
    const response = await apiClient.post('/inbound/asn', dto);
    return response.data;
  },

  /**
   * Update ASN status
   */
  updateASNStatus: async (asnId: string, status: string) => {
    const response = await apiClient.patch(`/inbound/asn/${asnId}/status`, { status });
    return response.data;
  },

  /**
   * Get all receipts with optional filters
   */
  getReceipts: async (params?: {
    status?: string;
    asnId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/receipts', { params });
    return response.data;
  },

  /**
   * Get receipt by ID
   */
  getReceipt: async (receiptId: string) => {
    const response = await apiClient.get(`/inbound/receipts/${receiptId}`);
    return response.data;
  },

  /**
   * Create new receipt
   */
  createReceipt: async (dto: {
    asnId?: string;
    receiptType: string;
    lineItems: Array<{
      asnLineItemId?: string;
      sku: string;
      quantityOrdered: number;
      quantityReceived: number;
      quantityDamaged: number;
      unitCost?: number;
      lotNumber?: string;
      expirationDate?: Date;
      notes?: string;
    }>;
  }) => {
    const response = await apiClient.post('/inbound/receipts', dto);
    return response.data;
  },

  /**
   * Get putaway tasks with optional filters
   */
  getPutawayTasks: async (params?: {
    status?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/putaway', { params });
    return response.data;
  },

  /**
   * Assign putaway task to user
   */
  assignPutawayTask: async (putawayTaskId: string) => {
    const response = await apiClient.post(`/inbound/putaway/${putawayTaskId}/assign`);
    return response.data;
  },

  /**
   * Update putaway task
   */
  updatePutawayTask: async (
    putawayTaskId: string,
    dto: {
      quantityPutaway: number;
      status?: string;
    }
  ) => {
    const response = await apiClient.patch(`/inbound/putaway/${putawayTaskId}`, dto);
    return response.data;
  },
};

// Inwards goods hooks
export const useInwardsDashboard = () => {
  return useQuery({
    queryKey: ['inwards', 'dashboard'],
    queryFn: inwardsGoodsApi.getDashboard,
    refetchInterval: 5000,
  });
};

export const useASNs = (params?: { status?: string; supplierId?: string; enabled?: boolean }) => {
  return useQuery({
    queryKey: ['inwards', 'asn', params],
    queryFn: () => inwardsGoodsApi.getASNs(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useASN = (asnId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'asn', asnId],
    queryFn: () => inwardsGoodsApi.getASN(asnId),
    enabled,
  });
};

export const useReceipts = (params?: { status?: string; asnId?: string; enabled?: boolean }) => {
  return useQuery({
    queryKey: ['inwards', 'receipts', params],
    queryFn: () => inwardsGoodsApi.getReceipts(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useReceipt = (receiptId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'receipts', receiptId],
    queryFn: () => inwardsGoodsApi.getReceipt(receiptId),
    enabled,
  });
};

export const usePutawayTasks = (params?: {
  status?: string;
  assignedTo?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['inwards', 'putaway', params],
    queryFn: () => inwardsGoodsApi.getPutawayTasks(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 5000,
  });
};

export const useCreateASN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inwardsGoodsApi.createASN,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards'] });
    },
  });
};

export const useUpdateASNStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ asnId, status }: { asnId: string; status: string }) =>
      inwardsGoodsApi.updateASNStatus(asnId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards'] });
    },
  });
};

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inwardsGoodsApi.createReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards'] });
    },
  });
};

export const useAssignPutawayTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inwardsGoodsApi.assignPutawayTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'putaway'] });
    },
  });
};

export const useUpdatePutawayTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      putawayTaskId,
      dto,
    }: {
      putawayTaskId: string;
      dto: { quantityPutaway: number; status?: string };
    }) => inwardsGoodsApi.updatePutawayTask(putawayTaskId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'putaway'] });
    },
  });
};
