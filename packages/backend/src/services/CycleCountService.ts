/**
 * Cycle Count Service
 *
 * Handles scheduled and ad-hoc cycle counting for inventory accuracy
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  CycleCountPlan,
  CycleCountEntry,
  CycleCountTolerance,
  CreateCycleCountPlanDTO,
  CreateCycleCountEntryDTO,
  UpdateVarianceStatusDTO,
  ReconcileCycleCountDTO,
  CycleCountStatus,
  CycleCountType,
  VarianceStatus,
  InventoryTransaction,
  TransactionType,
} from '@opsui/shared';

// ============================================================================
// CYCLE COUNT SERVICE
// ============================================================================

export class CycleCountService {
  // ==========================================================================
  // CYCLE COUNT PLAN METHODS
  // ==========================================================================

  /**
   * Create a new cycle count plan
   */
  async createCycleCountPlan(dto: CreateCycleCountPlanDTO): Promise<CycleCountPlan> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const planId = `CCP-${nanoid(10)}`.toUpperCase();

      const result = await client.query(
        `INSERT INTO cycle_count_plans
          (plan_id, plan_name, count_type, scheduled_date, location, sku, count_by, created_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          planId,
          dto.planName,
          dto.countType,
          dto.scheduledDate,
          dto.location || null,
          dto.sku || null,
          dto.countBy,
          dto.createdBy,
          dto.notes || null,
        ]
      );

      await client.query('COMMIT');

      logger.info('Cycle count plan created', { planId, planName: dto.planName });
      return await this.getCycleCountPlan(planId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating cycle count plan', error);
      throw error;
    }
  }

  /**
   * Get cycle count plan by ID
   */
  async getCycleCountPlan(planId: string): Promise<CycleCountPlan> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM cycle_count_plans WHERE plan_id = $1`, [
      planId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    const plan = this.mapRowToCycleCountPlan(result.rows[0]);

    // Get count entries
    const entriesResult = await client.query(
      `SELECT * FROM cycle_count_entries WHERE plan_id = $1 ORDER BY counted_at ASC`,
      [planId]
    );

    plan.countEntries = entriesResult.rows.map(row => this.mapRowToCycleCountEntry(row));

    return plan;
  }

  /**
   * Get all cycle count plans with optional filters
   */
  async getAllCycleCountPlans(filters?: {
    status?: CycleCountStatus;
    countType?: CycleCountType;
    location?: string;
    countBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ plans: CycleCountPlan[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.countType) {
      conditions.push(`count_type = $${paramCount}`);
      params.push(filters.countType);
      paramCount++;
    }

    if (filters?.location) {
      conditions.push(`location = $${paramCount}`);
      params.push(filters.location);
      paramCount++;
    }

    if (filters?.countBy) {
      conditions.push(`count_by = $${paramCount}`);
      params.push(filters.countBy);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM cycle_count_plans WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM cycle_count_plans
       WHERE ${whereClause}
       ORDER BY scheduled_date DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const plans = await Promise.all(
      result.rows.map(async row => {
        const plan = this.mapRowToCycleCountPlan(row);
        // Get entries for each plan
        const entriesResult = await client.query(
          `SELECT * FROM cycle_count_entries WHERE plan_id = $1 ORDER BY counted_at ASC`,
          [plan.planId]
        );
        plan.countEntries = entriesResult.rows.map(r => this.mapRowToCycleCountEntry(r));
        return plan;
      })
    );

    return { plans, total };
  }

  /**
   * Start a cycle count plan
   */
  async startCycleCountPlan(planId: string): Promise<CycleCountPlan> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE cycle_count_plans
       SET status = $1, started_at = NOW(), updated_at = NOW()
       WHERE plan_id = $2
       RETURNING *`,
      [CycleCountStatus.IN_PROGRESS, planId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    logger.info('Cycle count plan started', { planId });
    return await this.getCycleCountPlan(planId);
  }

  /**
   * Complete a cycle count plan
   */
  async completeCycleCountPlan(planId: string): Promise<CycleCountPlan> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE cycle_count_plans
       SET status = $1, completed_at = NOW(), updated_at = NOW()
       WHERE plan_id = $2
       RETURNING *`,
      [CycleCountStatus.COMPLETED, planId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    logger.info('Cycle count plan completed', { planId });
    return await this.getCycleCountPlan(planId);
  }

  /**
   * Reconcile a cycle count plan (approve all variances)
   */
  async reconcileCycleCountPlan(dto: ReconcileCycleCountDTO): Promise<CycleCountPlan> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Update plan status
      await client.query(
        `UPDATE cycle_count_plans
         SET status = $1, reconciled_at = NOW(), updated_at = NOW()
         WHERE plan_id = $2`,
        [CycleCountStatus.RECONCILED, dto.planId]
      );

      // Get all pending variances for this plan
      const entriesResult = await client.query(
        `SELECT * FROM cycle_count_entries
         WHERE plan_id = $1 AND variance_status = $2`,
        [dto.planId, VarianceStatus.PENDING]
      );

      // Process each pending variance
      for (const entry of entriesResult.rows) {
        if (entry.variance !== 0) {
          await this.processVarianceAdjustment(
            entry.entry_id,
            VarianceStatus.APPROVED,
            dto.reconciledBy,
            dto.notes
          );
        }
      }

      await client.query('COMMIT');

      logger.info('Cycle count plan reconciled', { planId: dto.planId });
      return await this.getCycleCountPlan(dto.planId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error reconciling cycle count plan', error);
      throw error;
    }
  }

  // ==========================================================================
  // CYCLE COUNT ENTRY METHODS
  // ==========================================================================

  /**
   * Create a cycle count entry (record counted quantity)
   */
  async createCycleCountEntry(dto: CreateCycleCountEntryDTO): Promise<CycleCountEntry> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const entryId = `CCE-${nanoid(10)}`.toUpperCase();

      // Get current system quantity
      const inventoryResult = await client.query(
        `SELECT quantity FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
        [dto.sku, dto.binLocation]
      );

      const systemQuantity =
        inventoryResult.rows.length > 0 ? parseFloat(inventoryResult.rows[0].quantity) : 0;

      const countedQuantity = dto.countedQuantity;
      const variance = countedQuantity - systemQuantity;
      const variancePercent = systemQuantity > 0 ? (Math.abs(variance) / systemQuantity) * 100 : 0;

      // Check tolerance rules
      const tolerance = await this.getApplicableTolerance(dto.sku, dto.binLocation);
      let varianceStatus = VarianceStatus.PENDING;

      if (Math.abs(variancePercent) <= tolerance.autoAdjustThreshold) {
        // Auto-adjust within tolerance
        varianceStatus = VarianceStatus.AUTO_ADJUSTED;

        // Create inventory transaction
        const transactionId = await this.createAdjustmentTransaction(
          dto.sku,
          dto.binLocation,
          variance,
          `Cycle count auto-adjustment - Entry ${entryId}`,
          dto.countedBy
        );

        // Update inventory
        if (variance > 0) {
          await this.adjustInventoryUp(dto.sku, dto.binLocation, variance);
        } else if (variance < 0) {
          await this.adjustInventoryDown(dto.sku, dto.binLocation, Math.abs(variance));
        }

        const result = await client.query(
          `INSERT INTO cycle_count_entries
            (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
             variance, variance_percent, variance_status, counted_at, counted_by,
             adjustment_transaction_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12)
           RETURNING *`,
          [
            entryId,
            dto.planId,
            dto.sku,
            dto.binLocation,
            systemQuantity,
            countedQuantity,
            variance,
            variancePercent,
            varianceStatus,
            dto.countedBy,
            transactionId,
            dto.notes || null,
          ]
        );

        await client.query('COMMIT');

        logger.info('Cycle count entry created (auto-adjusted)', {
          entryId,
          variance,
          variancePercent,
        });

        return this.mapRowToCycleCountEntry(result.rows[0]);
      } else {
        // Pending approval
        const result = await client.query(
          `INSERT INTO cycle_count_entries
            (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
             variance, variance_percent, variance_status, counted_at, counted_by, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
           RETURNING *`,
          [
            entryId,
            dto.planId,
            dto.sku,
            dto.binLocation,
            systemQuantity,
            countedQuantity,
            variance,
            variancePercent,
            varianceStatus,
            dto.countedBy,
            dto.notes || null,
          ]
        );

        await client.query('COMMIT');

        logger.info('Cycle count entry created (pending review)', {
          entryId,
          variance,
          variancePercent,
        });

        return this.mapRowToCycleCountEntry(result.rows[0]);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating cycle count entry', error);
      throw error;
    }
  }

  /**
   * Update variance status (approve/reject)
   */
  async updateVarianceStatus(dto: UpdateVarianceStatusDTO): Promise<CycleCountEntry> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get entry
      const entryResult = await client.query(
        `SELECT * FROM cycle_count_entries WHERE entry_id = $1`,
        [dto.entryId]
      );

      if (entryResult.rows.length === 0) {
        throw new Error(`Cycle count entry ${dto.entryId} not found`);
      }

      const entry = entryResult.rows[0];
      let adjustmentTransactionId = entry.adjustment_transaction_id;

      // Process variance if approved
      if (
        dto.status === VarianceStatus.APPROVED &&
        entry.variance !== 0 &&
        !entry.adjustment_transaction_id
      ) {
        adjustmentTransactionId = await this.processVarianceAdjustment(
          dto.entryId,
          dto.status,
          dto.reviewedBy,
          dto.notes
        );
      }

      // Update entry
      const result = await client.query(
        `UPDATE cycle_count_entries
         SET variance_status = $1,
             reviewed_by = $2,
             reviewed_at = NOW(),
             adjustment_transaction_id = $3
         WHERE entry_id = $4
         RETURNING *`,
        [dto.status, dto.reviewedBy, adjustmentTransactionId || null, dto.entryId]
      );

      await client.query('COMMIT');

      logger.info('Variance status updated', {
        entryId: dto.entryId,
        status: dto.status,
      });

      return this.mapRowToCycleCountEntry(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating variance status', error);
      throw error;
    }
  }

  /**
   * Process variance adjustment (create transaction and update inventory)
   */
  private async processVarianceAdjustment(
    entryId: string,
    status: VarianceStatus,
    reviewedBy: string,
    notes?: string
  ): Promise<string> {
    const client = await getPool();

    // Get entry details
    const entryResult = await client.query(
      `SELECT * FROM cycle_count_entries WHERE entry_id = $1`,
      [entryId]
    );

    if (entryResult.rows.length === 0) {
      throw new Error(`Cycle count entry ${entryId} not found`);
    }

    const entry = entryResult.rows[0];
    const { sku, bin_location, variance } = entry;

    if (variance === 0) {
      return null;
    }

    // Create inventory transaction
    const transactionId = await this.createAdjustmentTransaction(
      sku,
      bin_location,
      variance,
      `Cycle count adjustment reviewed by ${reviewedBy}${notes ? ': ' + notes : ''}`,
      reviewedBy
    );

    // Update inventory
    if (variance > 0) {
      await this.adjustInventoryUp(sku, bin_location, variance);
    } else {
      await this.adjustInventoryDown(sku, bin_location, Math.abs(variance));
    }

    return transactionId;
  }

  // ==========================================================================
  // TOLERANCE METHODS
  // ==========================================================================

  /**
   * Get all tolerance rules
   */
  async getAllTolerances(): Promise<CycleCountTolerance[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM cycle_count_tolerances WHERE is_active = true ORDER BY abc_category, sku`
    );

    return result.rows.map(row => this.mapRowToTolerance(row));
  }

  /**
   * Get applicable tolerance for an SKU/location
   */
  private async getApplicableTolerance(
    sku: string,
    binLocation: string
  ): Promise<CycleCountTolerance> {
    const client = await getPool();

    // Try SKU-specific tolerance first
    let result = await client.query(
      `SELECT * FROM cycle_count_tolerances
       WHERE sku = $1 AND is_active = true
       LIMIT 1`,
      [sku]
    );

    // If no SKU-specific, try zone-specific
    if (result.rows.length === 0) {
      const zone = binLocation.split('-')[0];
      result = await client.query(
        `SELECT * FROM cycle_count_tolerances
         WHERE location_zone = $1 AND is_active = true
         LIMIT 1`,
        [zone]
      );
    }

    // If no zone-specific, use default
    if (result.rows.length === 0) {
      result = await client.query(
        `SELECT * FROM cycle_count_tolerances
         WHERE tolerance_name = 'Default Tolerance' AND is_active = true
         LIMIT 1`
      );
    }

    return this.mapRowToTolerance(result.rows[0]);
  }

  // ==========================================================================
  // INVENTORY ADJUSTMENT METHODS
  // ==========================================================================

  /**
   * Create inventory transaction for adjustment
   */
  private async createAdjustmentTransaction(
    sku: string,
    binLocation: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<string> {
    const client = await getPool();

    const transactionId = `TXN-${nanoid(10)}`.toUpperCase();

    await client.query(
      `INSERT INTO inventory_transactions
        (transaction_id, type, sku, quantity, bin_location, user_id, timestamp, reason)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [transactionId, TransactionType.ADJUSTMENT, sku, quantity, binLocation, userId, reason]
    );

    return transactionId;
  }

  /**
   * Adjust inventory up (increase quantity)
   */
  private async adjustInventoryUp(
    sku: string,
    binLocation: string,
    quantity: number
  ): Promise<void> {
    const client = await getPool();

    // Check if inventory unit exists
    const existingResult = await client.query(
      `SELECT * FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
      [sku, binLocation]
    );

    if (existingResult.rows.length > 0) {
      // Update existing
      await client.query(
        `UPDATE inventory_units
         SET quantity = quantity + $1,
             available = available + $1,
             last_updated = NOW()
         WHERE sku = $2 AND bin_location = $3`,
        [quantity, sku, binLocation]
      );
    } else {
      // Insert new
      const unitId = `INV-${nanoid(10)}`.toUpperCase();
      await client.query(
        `INSERT INTO inventory_units
          (unit_id, sku, bin_location, quantity, reserved, available, last_updated)
         VALUES ($1, $2, $3, $4, 0, $4, NOW())`,
        [unitId, sku, binLocation, quantity]
      );
    }
  }

  /**
   * Adjust inventory down (decrease quantity)
   */
  private async adjustInventoryDown(
    sku: string,
    binLocation: string,
    quantity: number
  ): Promise<void> {
    const client = await getPool();

    await client.query(
      `UPDATE inventory_units
       SET quantity = GREATEST(0, quantity - $1),
           available = GREATEST(0, available - $1),
           last_updated = NOW()
       WHERE sku = $2 AND bin_location = $3`,
      [quantity, sku, binLocation]
    );
  }

  // ==========================================================================
  // MAPPING METHODS
  // ==========================================================================

  private mapRowToCycleCountPlan(row: any): CycleCountPlan {
    return {
      planId: row.plan_id,
      planName: row.plan_name,
      countType: row.count_type,
      status: row.status,
      scheduledDate: new Date(row.scheduled_date),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      reconciledAt: row.reconciled_at ? new Date(row.reconciled_at) : undefined,
      location: row.location,
      sku: row.sku,
      countBy: row.count_by,
      createdBy: row.created_by,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToCycleCountEntry(row: any): CycleCountEntry {
    return {
      entryId: row.entry_id,
      planId: row.plan_id,
      sku: row.sku,
      binLocation: row.bin_location,
      systemQuantity: parseFloat(row.system_quantity),
      countedQuantity: parseFloat(row.counted_quantity),
      variance: parseFloat(row.variance),
      variancePercent: row.variance_percent ? parseFloat(row.variance_percent) : undefined,
      varianceStatus: row.variance_status,
      countedAt: new Date(row.counted_at),
      countedBy: row.counted_by,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      adjustmentTransactionId: row.adjustment_transaction_id,
      notes: row.notes,
    };
  }

  private mapRowToTolerance(row: any): CycleCountTolerance {
    return {
      toleranceId: row.tolerance_id,
      toleranceName: row.tolerance_name,
      sku: row.sku,
      abcCategory: row.abc_category,
      locationZone: row.location_zone,
      allowableVariancePercent: parseFloat(row.allowable_variance_percent),
      allowableVarianceAmount: parseFloat(row.allowable_variance_amount),
      autoAdjustThreshold: parseFloat(row.auto_adjust_threshold),
      requiresApprovalThreshold: parseFloat(row.requires_approval_threshold),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Singleton instance
export const cycleCountService = new CycleCountService();
