/**
 * Database Indexes for Performance
 *
 * Run this script to create optimized indexes for the WMS database
 */

import { query } from './client';
import { logger } from '../config/logger';

export async function createIndexes(): Promise<void> {
  logger.info('Creating database indexes...');

  const indexes = [
    // Orders table - critical for filtering and sorting
    {
      name: 'idx_orders_status_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC)`,
    },
    {
      name: 'idx_orders_priority_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_orders_priority_created ON orders(priority, created_at DESC)`,
    },
    {
      name: 'idx_orders_picker_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_orders_picker_status ON orders(assigned_picker_id, status) WHERE assigned_picker_id IS NOT NULL`,
    },

    // Pick tasks table - critical for picker workflow
    {
      name: 'idx_pick_tasks_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_pick_tasks_status ON pick_tasks(status)`,
    },
    {
      name: 'idx_pick_tasks_order_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_pick_tasks_order_status ON pick_tasks(order_id, status)`,
    },
    {
      name: 'idx_pick_tasks_picker_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_pick_tasks_picker_status ON pick_tasks(picker_id, status) WHERE picker_id IS NOT NULL`,
    },
    {
      name: 'idx_pick_tasks_status_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_pick_tasks_status_created ON pick_tasks(status, created_at DESC)`,
    },

    // Order items table - for order details
    {
      name: 'idx_order_items_order_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
    },
    {
      name: 'idx_order_items_sku',
      sql: `CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku)`,
    },

    // Inventory units table - for inventory queries
    {
      name: 'idx_inventory_sku',
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_units(sku)`,
    },
    {
      name: 'idx_inventory_bin',
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_bin ON inventory_units(bin_location)`,
    },
    {
      name: 'idx_inventory_available',
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory_units(sku) WHERE available > 0`,
    },

    // Inventory transactions table - for audit trail
    {
      name: 'idx_inventory_transactions_sku',
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sku ON inventory_transactions(sku, timestamp DESC)`,
    },
    {
      name: 'idx_inventory_transactions_order',
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order ON inventory_transactions(order_id, timestamp DESC)`,
    },
    {
      name: 'idx_inventory_transactions_type',
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type, timestamp DESC)`,
    },

    // Users table - for authentication and authorization
    {
      name: 'idx_users_email',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    },
    {
      name: 'idx_users_role',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
    },
    {
      name: 'idx_users_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true`,
    },

    // Order state changes table - for order history
    {
      name: 'idx_order_state_changes_order',
      sql: `CREATE INDEX IF NOT EXISTS idx_order_state_changes_order ON order_state_changes(order_id, timestamp DESC)`,
    },
    {
      name: 'idx_order_state_changes_from_to',
      sql: `CREATE INDEX IF NOT EXISTS idx_order_state_changes_from_to ON order_state_changes(from_status, to_status, timestamp DESC)`,
    },
  ];

  for (const index of indexes) {
    try {
      await query(index.sql);
      logger.info(`Created index: ${index.name}`);
    } catch (error: any) {
      logger.error(`Failed to create index ${index.name}:`, error.message);
    }
  }

  logger.info('Database indexes creation completed');
}

// Allow running directly
if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log('✅ Indexes created successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to create indexes:', error);
      process.exit(1);
    });
}
