/**
 * Test script to verify page tracking API is working
 */

import axios from 'axios';

async function testPageTracking() {
  console.log('=== Testing Page Tracking API ===\n');

  // Test 1: Check if /auth/current-view endpoint exists
  console.log('Test 1: Checking /auth/current-view endpoint...');
  try {
    const response = await axios.post('http://localhost:3001/api/auth/current-view', {
      view: 'Test View',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Result: ', response.status, response.data);
  } catch (error: any) {
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Data:', error.response.data);
    } else {
      console.log('Network Error:', error.message);
    }
  }

  // Test 2: Check database schema for current_view_updated_at column
  console.log('\nTest 2: Checking database schema...');
  try {
    const { query } = await import('./src/db/client');
    
    const schemaResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('current_view', 'current_view_updated_at')
    `);
    
    console.log('Columns found:');
    if (schemaResult.rows) {
      schemaResult.rows.forEach((row: any) => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  }

  // Test 3: Check current values in database
  console.log('\nTest 3: Checking current values...');
  try {
    const { query } = await import('./src/db/client');
    
    const valuesResult = await query(`
      SELECT user_id, email, current_view, current_view_updated_at,
             NOW() as server_time,
             EXTRACT(EPOCH FROM (NOW() - current_view_updated_at))/60 as minutes_ago
      FROM users
      WHERE role = 'PICKER'
      ORDER BY current_view_updated_at DESC NULLS LAST
    `);
    
    console.log('Current picker values:');
    if (valuesResult.rows) {
      valuesResult.rows.forEach((row: any) => {
        console.log(`\n  User: ${row.email}`);
        console.log(`    Current View: ${row.current_view || 'NULL'}`);
        console.log(`    Last Updated: ${row.current_view_updated_at || 'NEVER'}`);
        console.log(`    Minutes Ago: ${row.minutes_ago ? row.minutes_ago.toFixed(2) : 'NEVER'}`);
      });
    }
  } catch (error) {
    console.error('Error checking values:', error);
  }

  console.log('\n=== Test Complete ===');
}

// Run test
testPageTracking()
  .then(() => {
    console.log('\n✅ Tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });