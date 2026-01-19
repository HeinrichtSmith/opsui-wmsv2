/**
 * Seed 30 random orders for the pending section
 */

const { Client } = require('pg');

// Sample data
const CUSTOMER_NAMES = [
  'Acme Corporation',
  'Tech Solutions Inc',
  'Global Retail Ltd',
  'Smart Electronics',
  'Modern Warehousing',
  'Pacific Distributors',
  'Metro Supplies Co',
  'Prime Logistics',
  'Future Systems',
  'Atlantic Trade Co',
  'Central Parts Inc',
  'Direct Wholesale',
  'Express Delivery LLC',
  'FastTrack Systems',
  'Premium Products Co',
  'Quick Ship Logistics',
  'Reliable Parts Ltd',
  'Speedy Distribution',
  'Top Quality Inc',
  'Value Wholesale Co',
  'Elite Supplies',
  'Metro Distribution',
  'Prime Electronics',
  'Global Parts Co',
  'Smart Logistics Ltd',
  'Tech Wholesale Inc',
  'Express Parts Co',
  'Modern Distribution',
  'Pacific Supplies',
  'Atlantic Electronics',
  'Central Wholesale Ltd',
  'Direct Products Co'
];

const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW', 'LOW', 'NORMAL', 'NORMAL']; // Weighted for more NORMAL orders

const SKUS = [
  'WMS-001', 'WMS-002', 'WMS-003'
];

const SKU_NAMES = {
  'WMS-001': 'Widget A',
  'WMS-002': 'Widget B',
  'WMS-003': 'Widget C'
};

function generateOrderId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD (8 digits)
  const timeStr = now.getTime().toString().slice(-4); // Last 4 digits
  return 'ORD-' + dateStr + '-' + timeStr; // Format: ORD-YYYYMMDD-XXXX
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedOrders() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    let createdCount = 0;
    const TARGET_ORDERS = 30;

    for (let i = 0; i < TARGET_ORDERS; i++) {
      // Generate order
      const orderId = generateOrderId();
      const customerId = `CUST-${getRandomInt(1000, 9999)}`;
      const customerName = getRandomElement(CUSTOMER_NAMES);
      const priority = getRandomElement(PRIORITIES);

      // Generate random number of items (1-5)
      const numItems = getRandomInt(1, 5);
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const sku = getRandomElement(SKUS);
        const quantity = getRandomInt(1, 5);
        items.push({ sku, quantity });
      }

      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (order_id, customer_id, customer_name, priority, status, progress, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, 'PENDING', 0, NOW(), NOW()) 
         RETURNING order_id`,
        [orderId, customerId, customerName, priority]
      );

      if (orderResult.rows.length > 0) {
        // Insert order items
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const orderItemId = `${orderId}-${j}`;
          const skuName = SKU_NAMES[item.sku] || item.sku;

          // Get bin location for SKU from inventory_units
          const invResult = await client.query(
            `SELECT bin_location FROM inventory_units WHERE sku = $1 LIMIT 1`,
            [item.sku]
          );

          const binLocation = invResult.rows[0]?.bin_location || 'A-01-01';

          await client.query(
            `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
            [orderItemId, orderId, item.sku, skuName, item.quantity, binLocation]
          );
        }

        createdCount++;
        console.log(`✓ Created order ${orderId}: ${customerName} (${numItems} items, ${priority} priority)`);
      }
    }

    console.log(`\n✓ Successfully seeded ${createdCount} random orders`);

    // Verify count
    const countResult = await client.query(
      `SELECT COUNT(*) as count, status FROM orders WHERE status = 'PENDING' GROUP BY status`
    );
    console.log(`\nTotal PENDING orders: ${countResult.rows[0]?.count || 0}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

seedOrders();