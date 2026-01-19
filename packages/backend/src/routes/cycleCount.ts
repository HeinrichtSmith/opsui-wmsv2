/**
 * Cycle Count routes
 *
 * Endpoints for managing cycle counts and inventory adjustments
 */

import { Router } from 'express';
import { cycleCountService } from '../services/CycleCountService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, CycleCountStatus, CycleCountType, VarianceStatus } from '@opsui/shared';

const router = Router();

// All cycle count routes require authentication
router.use(authenticate);

// ============================================================================
// CYCLE COUNT PLAN ROUTES
// ============================================================================

/**
 * POST /api/cycle-count/plans
 * Create a new cycle count plan
 */
router.post(
  '/plans',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      planName,
      countType,
      scheduledDate,
      location,
      sku,
      countBy,
      notes,
    } = req.body;

    // Validate required fields
    if (!planName || !countType || !scheduledDate || !countBy) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    }

    const plan = await cycleCountService.createCycleCountPlan({
      planName,
      countType,
      scheduledDate: new Date(scheduledDate),
      location,
      sku,
      countBy,
      createdBy: req.user!.userId,
      notes,
    });

    res.status(201).json(plan);
  })
);

/**
 * GET /api/cycle-count/plans
 * Get all cycle count plans with optional filters
 */
router.get(
  '/plans',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as CycleCountStatus | undefined,
      countType: req.query.countType as CycleCountType | undefined,
      location: req.query.location as string | undefined,
      countBy: req.query.countBy as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await cycleCountService.getAllCycleCountPlans(filters);
    res.json(result);
  })
);

/**
 * GET /api/cycle-count/plans/:planId
 * Get a specific cycle count plan by ID
 */
router.get(
  '/plans/:planId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const plan = await cycleCountService.getCycleCountPlan(planId);
    res.json(plan);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/start
 * Start a cycle count plan
 */
router.post(
  '/plans/:planId/start',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const plan = await cycleCountService.startCycleCountPlan(planId);
    res.json(plan);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/complete
 * Complete a cycle count plan
 */
router.post(
  '/plans/:planId/complete',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const plan = await cycleCountService.completeCycleCountPlan(planId);
    res.json(plan);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/reconcile
 * Reconcile a cycle count plan (approve all variances)
 */
router.post(
  '/plans/:planId/reconcile',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const { notes } = req.body;

    const plan = await cycleCountService.reconcileCycleCountPlan({
      planId,
      reconciledBy: req.user!.userId,
      notes,
    });

    res.json(plan);
  })
);

// ============================================================================
// CYCLE COUNT ENTRY ROUTES
// ============================================================================

/**
 * POST /api/cycle-count/entries
 * Create a cycle count entry (record counted quantity)
 */
router.post(
  '/entries',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      planId,
      sku,
      binLocation,
      countedQuantity,
      notes,
    } = req.body;

    // Validate required fields
    if (!planId || !sku || !binLocation || countedQuantity === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    }

    const entry = await cycleCountService.createCycleCountEntry({
      planId,
      sku,
      binLocation,
      countedQuantity: parseFloat(countedQuantity),
      countedBy: req.user!.userId,
      notes,
    });

    res.status(201).json(entry);
  })
);

/**
 * PATCH /api/cycle-count/entries/:entryId/variance
 * Update variance status (approve/reject)
 */
router.patch(
  '/entries/:entryId/variance',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
    }

    const entry = await cycleCountService.updateVarianceStatus({
      entryId,
      status,
      reviewedBy: req.user!.userId,
      notes,
    });

    res.json(entry);
  })
);

// ============================================================================
// TOLERANCE ROUTES
// ============================================================================

/**
 * GET /api/cycle-count/tolerances
 * Get all tolerance rules
 */
router.get(
  '/tolerances',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tolerances = await cycleCountService.getAllTolerances();
    res.json(tolerances);
  })
);

export default router;
