/**
 * Order routes
 */

import { Router } from 'express';
import { orderService } from '../services';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { validate } from '../middleware/validation';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';

const router = Router();

// All order routes require authentication
router.use(authenticate);

/**
 * POST /api/orders
 * Create a new order
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.createOrder,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  })
);

/**
 * GET /api/orders
 * Get order queue with optional filters
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as any,
      priority: req.query.priority as any,
      pickerId: req.query.pickerId as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await orderService.getOrderQueue(filters);

    // Add pagination metadata to response headers
    if (typeof result.total !== 'undefined') {
      res.setHeader('X-Total-Count', result.total.toString());
    }
    if (filters.page) {
      res.setHeader('X-Page', filters.page.toString());
    }
    if (filters.limit) {
      res.setHeader('X-Page-Size', filters.limit.toString());
    }

    res.json(result);
  })
);

/**
 * GET /api/orders/my-orders
 * Get current picker's active orders
 */
router.get(
  '/my-orders',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const orders = await orderService.getPickerActiveOrders(req.user.userId);
    res.json(orders);
  })
);

/**
 * GET /api/orders/full
 * Get orders with full item details by status
 */
router.get(
  '/full',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as any,
      packerId: req.query.packerId as string | undefined,
    };

    const result = await orderService.getOrdersWithItemsByStatus(filters);
    res.json(result);
  })
);

/**
 * GET /api/orders/:orderId
 * Get order details
 */
router.get(
  '/:orderId',
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const order = await orderService.getOrder(req.params.orderId);
    res.json(order);
  })
);

/**
 * POST /api/orders/:orderId/claim
 * Claim an order for picking
 */
router.post(
  '/:orderId/claim',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const order = await orderService.claimOrder(req.params.orderId, {
        pickerId: req.user.userId,
      });
      res.json(order);
    } catch (error: any) {
      // Ensure proper error propagation to frontend
      if (error?.message?.includes('cannot be claimed')) {
        return res.status(409).json({ 
          error: error.message,
          code: 'ORDER_NOT_CLAIMABLE'
        });
      }
      if (error?.message?.includes('already claimed')) {
        return res.status(409).json({ 
          error: error.message,
          code: 'ORDER_ALREADY_CLAIMED'
        });
      }
      if (error?.message?.includes('maximum limit')) {
        return res.status(409).json({ 
          error: error.message,
          code: 'MAX_ACTIVE_ORDERS'
        });
      }
      // Generic conflict error
      if (error?.status === 409 || error?.code === 'CONFLICT') {
        return res.status(409).json({ 
          error: error.message || 'Order cannot be claimed',
          code: 'CONFLICT'
        });
      }
      // Re-throw other errors
      throw error;
    }
  })
);

/**
 * GET /api/orders/:orderId/next-task
 * Get next pick task for an order
 */
router.get(
  '/:orderId/next-task',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const task = await orderService.getNextPickTask(req.params.orderId);
    res.json(task);
  })
);

/**
 * PUT /api/orders/:orderId/picker-status
 * Update picker status (ACTIVE/IDLE) based on window visibility
 */
router.put(
  '/:orderId/picker-status',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { query } = await import('../db/client');
    const { status } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!status || !['ACTIVE', 'IDLE'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be ACTIVE or IDLE',
        code: 'INVALID_STATUS',
      });
    }

    // Update BOTH the order's timestamp AND the user's current_view_updated_at
    // This is critical for picker activity tracking to work correctly
    await query(
      `UPDATE orders 
       SET updated_at = NOW() 
       WHERE order_id = $1`,
      [req.params.orderId]
    );

    // Also update user's current_view_updated_at timestamp
    // This tells the system when picker was last actively working
    await query(
      `UPDATE users 
       SET current_view_updated_at = NOW() 
       WHERE user_id = $1`,
      [req.user.userId]
    );

    res.json({ success: true, status });
  })
);

/**
 * POST /api/orders/:orderId/pick
 * Process a pick action
 */
router.post(
  '/:orderId/pick',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { query } = await import('../db/client');

    // Normalize snake_case to camelCase
    const barcode = req.body.barcode;
    const quantity = req.body.quantity;
    const binLocation = req.body.binLocation || req.body.bin_location;
    const pickTaskId = req.body.pickTaskId || req.body.pick_task_id;

    // Manual validation
    if (!barcode) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'barcode', message: '"barcode" is required' }],
      });
    }
    if (!binLocation) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'binLocation', message: '"binLocation" is required' }],
      });
    }
    if (!pickTaskId) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'pickTaskId', message: '"pickTaskId" is required' }],
      });
    }

    // The 'barcode' field now contains either a barcode OR an SKU code
    // Check if it's a valid SKU first
    let sku: string;
    
    // Try to look up by SKU or barcode (frontend sends barcode which might be barcode number or SKU code)
    const skuResult = await query(
      `SELECT sku FROM skus WHERE (sku = $1 OR barcode = $1) AND active = true`,
      [barcode]
    );

    if (skuResult.rows.length > 0) {
      // It's a valid SKU code or barcode
      sku = skuResult.rows[0].sku;
    } else {
      // Not found by SKU or barcode
      return res.status(404).json({
        error: 'SKU or barcode not found',
        code: 'SKU_NOT_FOUND',
        value: barcode,
      });
    }

    const result = await orderService.pickItem(
      req.params.orderId,
      {
        sku,
        quantity,
        binLocation,
        pickTaskId,
      },
      req.user.userId
    );
    res.json(result);
  })
);

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order
 */
router.post(
  '/:orderId/cancel',
  validate.orderId,
  validate.cancelOrder,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const order = await orderService.cancelOrder(req.params.orderId, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      reason: req.body.reason,
    });
    res.json(order);
  })
);

/**
 * POST /api/orders/:orderId/unclaim
 * Abandon/unclaim an order (for stuck orders)
 */
router.post(
  '/:orderId/unclaim',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Accept reason from either query string or request body
    const reason = (req.query.reason as string) || (req.body.reason as string) || '';

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Reason is required to unclaim an order',
        code: 'MISSING_REASON',
      });
    }

    try {
      const order = await orderService.unclaimOrder(req.params.orderId, req.user.userId, reason.trim());
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not assigned')) {
        return res.status(409).json({ 
          error: error.message,
          code: 'NOT_ASSIGNED_TO_PICKER'
        });
      }
      if (error?.message?.includes('not in PICKING status')) {
        return res.status(409).json({ 
          error: error.message,
          code: 'NOT_PICKING'
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/skip-task
 * Skip a pick task
 */
router.post(
  '/:orderId/skip-task',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const pickTaskId = req.body.pickTaskId || req.body.pick_task_id;
    const reason = req.body.reason;

    // Validate pickTaskId
    if (!pickTaskId) {
      return res.status(400).json({
        error: 'pickTaskId is required',
        code: 'MISSING_PICK_TASK_ID',
      });
    }

    // Validate reason
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Reason is required',
        code: 'MISSING_REASON',
      });
    }

    const order = await orderService.skipPickTask(
      pickTaskId,
      reason.trim(),
      req.user.userId
    );
    res.json(order);
  })
);

/**
 * GET /api/orders/:orderId/progress
 * Get picking progress for an order
 */
router.get(
  '/:orderId/progress',
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const progress = await orderService.getOrderPickingProgress(req.params.orderId);
    res.json(progress);
  })
);

/**
 * POST /api/orders/:orderId/complete
 * Complete an order (move from PICKING to PICKED status)
 */
router.post(
  '/:orderId/complete',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const order = await orderService.completeOrder(req.params.orderId, {
      pickerId: req.user.userId,
    });
    res.json(order);
  })
);

/**
 * PUT /api/orders/:orderId/pick-task/:pickTaskId
 * Update pick task status (e.g., to revert skip)
 */
router.put(
  '/:orderId/pick-task/:pickTaskId',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    console.log('=== PUT route handler ===');
    console.log('Full URL:', req.url);
    console.log('Original URL:', req.originalUrl);
    console.log('req.params:', JSON.stringify(req.params));
    console.log('req.body:', JSON.stringify(req.body));
    
    // Extract pickTaskId from URL manually since Express isn't parsing it
    const urlParts = req.url.split('/');
    const pickTaskId = urlParts[urlParts.length - 1];
    const { status } = req.body;

    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        code: 'INVALID_STATUS',
      });
    }

    try {
      // Update pick task status directly
      const result = await orderService.updatePickTaskStatus(pickTaskId, status);
      res.json(result);
    } catch (error: any) {
      if (error?.message?.includes('not found')) {
        return res.status(404).json({
          error: error.message,
          code: 'PICK_TASK_NOT_FOUND',
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/undo-pick
 * Undo a pick action (decrement picked quantity)
 */
router.post(
  '/:orderId/undo-pick',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const pickTaskId = req.body.pickTaskId || req.body.pick_task_id;
    const reason = req.body.reason;
    const quantity = req.body.quantity || 1;

    if (!pickTaskId) {
      return res.status(400).json({
        error: 'pickTaskId is required',
        code: 'MISSING_FIELDS',
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Reason is required for undoing a pick',
        code: 'MISSING_REASON',
      });
    }

    try {
      const order = await orderService.undoPick(
        pickTaskId,
        quantity,
        reason.trim()
      );
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not found')) {
        return res.status(404).json({
          error: error.message,
          code: 'PICK_TASK_NOT_FOUND',
        });
      }
      if (error?.message?.includes('cannot be decremented')) {
        return res.status(409).json({
          error: error.message,
          code: 'CANNOT_DECREMENT',
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/claim-for-packing
 * Claim an order for packing
 */
router.post(
  '/:orderId/claim-for-packing',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { packer_id } = req.body;

    if (!packer_id) {
      return res.status(400).json({
        error: 'packer_id is required',
        code: 'MISSING_PACKER_ID',
      });
    }

    try {
      const order = await orderService.claimOrderForPacking(req.params.orderId, packer_id);
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('cannot be claimed')) {
        return res.status(409).json({
          error: error.message,
          code: 'ORDER_NOT_CLAIMABLE',
        });
      }
      if (error?.message?.includes('already claimed')) {
        return res.status(409).json({
          error: error.message,
          code: 'ORDER_ALREADY_CLAIMED',
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/complete-packing
 * Complete packing for an order
 */
router.post(
  '/:orderId/complete-packing',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { packer_id } = req.body;

    if (!packer_id) {
      return res.status(400).json({
        error: 'packer_id is required',
        code: 'MISSING_PACKER_ID',
      });
    }

    try {
      const order = await orderService.completePacking(req.params.orderId, packer_id);
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not assigned')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_ASSIGNED_TO_PACKER',
        });
      }
      if (error?.message?.includes('not in PACKING status')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_PACKING',
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/unclaim-packing
 * Unclaim/abandon a packing order (returns order to PICKED status)
 */
router.post(
  '/:orderId/unclaim-packing',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { packer_id, reason } = req.body;

    if (!packer_id) {
      return res.status(400).json({
        error: 'packer_id is required',
        code: 'MISSING_PACKER_ID',
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Reason is required to unclaim an order',
        code: 'MISSING_REASON',
      });
    }

    try {
      const order = await orderService.unclaimPackingOrder(req.params.orderId, packer_id, reason.trim());
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not assigned')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_ASSIGNED_TO_PACKER',
        });
      }
      if (error?.message?.includes('not in PACKING status')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_PACKING',
        });
      }
      throw error;
    }
  })
);

/**
 * GET /api/orders/packing-queue
 * Get orders ready for packing
 */
router.get(
  '/packing-queue',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const orders = await orderService.getPackingQueue();
    res.json(orders);
  })
);

/**
 * POST /api/orders/:orderId/verify-packing
 * Verify a packing item by scanning barcode
 */
router.post(
  '/:orderId/verify-packing',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { order_item_id, quantity } = req.body;

    if (!order_item_id) {
      return res.status(400).json({
        error: 'order_item_id is required',
        code: 'MISSING_ORDER_ITEM_ID',
      });
    }

    try {
      const order = await orderService.verifyPackingItem(req.params.orderId, order_item_id, quantity || 1);
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not in PACKING status')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_PACKING',
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/skip-packing-item
 * Skip a packing item
 */
router.post(
  '/:orderId/skip-packing-item',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { order_item_id, reason } = req.body;

    if (!order_item_id) {
      return res.status(400).json({
        error: 'order_item_id is required',
        code: 'MISSING_ORDER_ITEM_ID',
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: 'reason is required',
        code: 'MISSING_REASON',
      });
    }

    try {
      const order = await orderService.skipPackingItem(req.params.orderId, order_item_id, reason);
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not in PACKING status')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_PACKING',
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/orders/:orderId/undo-packing-verification
 * Undo a packing verification
 */
router.post(
  '/:orderId/undo-packing-verification',
  authorize(UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR),
  validate.orderId,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { order_item_id, quantity, reason } = req.body;

    if (!order_item_id) {
      return res.status(400).json({
        error: 'order_item_id is required',
        code: 'MISSING_ORDER_ITEM_ID',
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: 'reason is required',
        code: 'MISSING_REASON',
      });
    }

    try {
      const order = await orderService.undoPackingVerification(req.params.orderId, order_item_id, quantity || 1, reason);
      res.json(order);
    } catch (error: any) {
      if (error?.message?.includes('not in PACKING status')) {
        return res.status(409).json({
          error: error.message,
          code: 'NOT_PACKING',
        });
      }
      throw error;
    }
  })
);

export default router;