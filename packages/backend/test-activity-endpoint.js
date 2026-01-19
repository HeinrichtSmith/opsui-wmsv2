/**
 * Test script for the current-view activity endpoint
 * 
 * This tests the existing POST /api/auth/current-view endpoint
 * to verify it properly updates current_view and current_view_updated_at
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testActivityEndpoint() {
  console.log('='.repeat(60));
  console.log('Testing Activity Endpoint');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as admin user
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@wms.com',
      password: 'admin123',
    }, {
      headers: {
        'Origin': 'http://localhost:5173',
      }
    });

    const { accessToken, user } = loginResponse.data;
    console.log('✓ Login successful');
    console.log(`  User: ${user.name} (${user.email})`);
    console.log(`  Role: ${user.role}`);

    // Step 2: Check initial state
    console.log('\n2. Checking initial user state...');
    const initialUserResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Origin': 'http://localhost:5173',
      },
    });

    const initialUser = initialUserResponse.data;
    console.log('✓ Current state:');
    console.log(`  current_view: ${initialUser.current_view || 'NULL'}`);
    console.log(`  current_view_updated_at: ${initialUser.current_view_updated_at || 'NULL'}`);

    // Step 3: Update current view (simulate button press)
    console.log('\n3. Updating current view (simulating button press)...');
    const viewName = 'Order Queue';
    
    const updateResponse = await axios.post(
      `${BASE_URL}/api/auth/current-view`,
      { view: viewName },
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Origin': 'http://localhost:5173',
        },
      }
    );

    console.log('✓ Update successful');
    console.log(`  Response: ${updateResponse.data.message}`);

    // Step 4: Verify the update
    console.log('\n4. Verifying update...');
    const updatedUserResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Origin': 'http://localhost:5173',
      },
    });

    const updatedUser = updatedUserResponse.data;
    console.log('✓ Updated state:');
    console.log(`  current_view: ${updatedUser.current_view}`);
    console.log(`  current_view_updated_at: ${updatedUser.current_view_updated_at}`);

    if (updatedUser.current_view !== viewName) {
      throw new Error(`Failed: current_view should be "${viewName}" but is "${updatedUser.current_view}"`);
    }

    if (!updatedUser.current_view_updated_at) {
      throw new Error('Failed: current_view_updated_at should be set but is NULL');
    }

    console.log('\n5. Testing picker status check...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/metrics/picker-activity`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Origin': 'http://localhost:5173',
      },
    });

    const pickers = metricsResponse.data;
    console.log(`✓ Found ${pickers.length} pickers`);
    
    const adminPicker = pickers.find(p => p.pickerId === user.userId);
    if (adminPicker) {
      console.log(`✓ Admin picker status: ${adminPicker.status}`);
      console.log(`  Current view: ${adminPicker.currentView}`);
      console.log(`  Last viewed at: ${adminPicker.lastViewedAt}`);
      console.log(`  Status should be ACTIVE: ${adminPicker.status === 'ACTIVE' ? '✓ YES' : '✗ NO'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Frontend should call POST /api/auth/current-view with:');
    console.log('   Body: { "view": "Page Name" }');
    console.log('2. Call this on every button press (Claim, Continue, Pending, etc.)');
    console.log('3. Use descriptive view names like:');
    console.log('   - "Order Queue"');
    console.log('   - "Picking Screen"');
    console.log('   - "Order Details: ORD-20250115-0001"');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));
    
    if (error.response) {
      console.error(`\nStatus: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`\nError: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Run the test
testActivityEndpoint();