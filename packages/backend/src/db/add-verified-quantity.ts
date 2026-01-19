/**
 * Migration: Add verified_quantity column to order_items table
 *
 * This column tracks how many items have been verified during the packing stage
 */

import { query, closePool } from './client';

async function addVerifiedQuantityColumn() {
  console.log('Adding verified_quantity column to order_items table...');

  try {
    // Check if column already exists
    const checkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      AND column_name = 'verified_quantity';
    `);

    if (checkResult.rows.length > 0) {
      console.log('Column verified_quantity already exists, skipping migration');
      return;
    }

    // Add the column
    await query(`
      ALTER TABLE order_items
      ADD COLUMN verified_quantity INTEGER DEFAULT 0;
    `);

    console.log('Successfully added verified_quantity column to order_items table');

    // Verify the column was added
    const verifyResult = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      AND column_name = 'verified_quantity';
    `);

    console.log('Column details:', verifyResult.rows[0]);
  } catch (error) {
    console.error('Error adding verified_quantity column:', error);
    throw error;
  }
}

// Run the migration
addVerifiedQuantityColumn()
  .then(() => {
    console.log('Migration completed successfully');
    closePool();
  })
  .catch(error => {
    console.error('Migration failed:', error);
    closePool();
    process.exit(1);
  });
