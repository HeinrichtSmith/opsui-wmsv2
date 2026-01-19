/**
 * Add barcode field to SKUs
 */

import { query } from './client';
import { logger } from '../config/logger';

async function addBarcodes(): Promise<void> {
  try {
    logger.info('Adding barcode column to SKUs...');

    // Add barcode column
    await query(`
      ALTER TABLE skus 
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(20) UNIQUE
    `);
    logger.info('Barcode column added');

    // Add index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_skus_barcode ON skus(barcode)
    `);
    logger.info('Barcode index added');

    logger.info('Updating barcodes for existing SKUs...');

    // Update barcodes
    const updates = [
      ['WIDGET-A', '0796548106754'],
      ['WIDGET-B', '0796548106761'],
      ['GADGET-X', '0796548106778'],
      ['GADGET-Y', '0796548106785'],
      ['TOOL-001', '0796548106792'],
      ['TOOL-002', '0796548106808'],
      ['PART-123', '0796548106815'],
      ['PART-456', '0796548106822'],
    ];

    for (const [sku, barcode] of updates) {
      await query(
        `
        UPDATE skus SET barcode = $1 WHERE sku = $2
      `,
        [barcode, sku]
      );
      logger.info(`Updated ${sku} with barcode ${barcode}`);
    }

    logger.info('Migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addBarcodes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addBarcodes };
