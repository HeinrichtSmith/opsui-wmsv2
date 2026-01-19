/**
 * Test script to verify picker activity API returns proper lastViewedAt
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/metrics/picker-activity',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // You need to provide a valid JWT token here
    // Get one from logging in as admin
  },
};

const req = http.request(options, res => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('='.repeat(60));
      console.log('Picker Activity API Response');
      console.log('='.repeat(60));
      console.log();
      console.log(`Found ${response.length} pickers:`);
      console.log();

      response.forEach(picker => {
        console.log(`Picker: ${picker.pickerName} (${picker.pickerId})`);
        console.log(`  Status: ${picker.status}`);
        console.log(`  Current Order: ${picker.currentOrderId || 'None'}`);
        console.log(`  Order Progress: ${picker.orderProgress}%`);
        console.log(`  Last Viewed At: ${picker.lastViewedAt || 'NULL - THIS IS THE BUG'}`);
        console.log(`  Current Task: ${picker.currentTask || 'None'}`);
        console.log();
      });

      // Check for null lastViewedAt values
      const nullCount = response.filter(p => p.lastViewedAt === null).length;
      if (nullCount > 0) {
        console.log('⚠️  ISSUE: Found pickers with null lastViewedAt!');
        console.log(`   Count: ${nullCount} / ${response.length}`);
      } else {
        console.log('✓ All pickers have valid lastViewedAt timestamps');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', error => {
  console.error('Error making request:', error.message);
  console.log();
  console.log('Note: You need to:');
  console.log('  1. Start the backend server');
  console.log('  2. Login as admin to get a JWT token');
  console.log("  3. Add the token to this script's headers");
});

console.log('Testing picker activity API endpoint...');
console.log('Note: This requires authentication. Use browser or Postman instead.');
console.log();
console.log('To test manually:');
console.log('  1. Go to http://localhost:5173 (frontend)');
console.log('  2. Login as admin/supervisor');
console.log('  3. Go to Supervisor Dashboard');
console.log('  4. Check the "Pickers" table for last activity');
console.log();

req.end();
