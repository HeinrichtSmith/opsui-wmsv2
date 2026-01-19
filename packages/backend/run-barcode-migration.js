/**
 * Run barcode migration
 */

const { query } = require('./src/db/client');

async function runMigration() {
  try {
    console.log('Adding barcode column to SKUs...');
    
    // Add barcode column
    await query(`
      ALTER TABLE skus 
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(20) UNIQUE
    `);
    
    // Add index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_skus_barcode ON skus(barcode)
    `);
    
    console.log('Column added, updating barcodes for existing SKUs...');
    
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
      await query(`
        UPDATE skus SET barcode = $1 WHERE sku = $2
      `, [barcode, sku]);
      console.log(`Updated ${sku} with barcode ${barcode}`);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();