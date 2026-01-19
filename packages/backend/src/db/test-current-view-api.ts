/**
 * Test current-view API endpoint
 *
 * This script tests the /api/auth/current-view endpoint to verify
 * that it correctly updates the database.
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

async function testCurrentViewAPI(): Promise<void> {
  try {
    console.log('🧪 Testing current-view API endpoint\n');

    // Step 1: Login as a picker
    console.log('📝 Step 1: Logging in as picker (USR-PICK01)...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john@example.com',
        password: 'password123',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = (await loginResponse.json()) as { token: string; user: { userId: string } };
    console.log('✅ Login successful');
    console.log(`   User ID: ${loginData.user.userId}`);
    console.log(`   Token: ${loginData.token.substring(0, 20)}...\n`);

    // Step 2: Call current-view endpoint
    console.log('📝 Step 2: Calling /api/auth/current-view with test view...');
    const updateResponse = await fetch(`${API_URL}/api/auth/current-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        view: 'TEST-ORDER-QUEUE',
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `Update failed: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`
      );
    }

    const updateData = (await updateResponse.json()) as { message: string };
    console.log('✅ Update successful');
    console.log(`   Response: ${updateData.message}\n`);

    // Step 3: Wait a moment and verify the database was updated
    console.log('📝 Step 3: Verifying database update...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for DB to commit

    const { query } = await import('./client');
    const verifyResult = await query(`
      SELECT
        user_id,
        name,
        current_view,
        current_view_updated_at,
        NOW() as server_time,
        EXTRACT(EPOCH FROM (NOW() - current_view_updated_at)) as seconds_ago
      FROM users
      WHERE user_id = 'USR-PICK01'
    `);

    if (verifyResult.rows.length === 0) {
      throw new Error('User not found in database');
    }

    const row = verifyResult.rows[0] as any;
    console.log('✅ Database verification:');
    console.log(`   User: ${row.name} (${row.userId})`);
    console.log(`   Current View: ${row.currentView}`);
    console.log(`   Updated At: ${row.currentViewUpdatedAt}`);
    console.log(`   Server Time: ${row.serverTime}`);
    console.log(`   Seconds Ago: ${Math.round(row.secondsAgo)}s\n`);

    // Verify the update was successful
    const secondsAgo = Math.round(row.secondsAgo);
    if (secondsAgo > 5) {
      throw new Error(
        `⚠️  Update was too old (${secondsAgo}s ago). The endpoint may not be working correctly.`
      );
    }

    if (row.currentView !== 'TEST-ORDER-QUEUE') {
      throw new Error(
        `⚠️  Current view is not correct. Expected 'TEST-ORDER-QUEUE', got '${row.currentView}'`
      );
    }

    console.log('✅ SUCCESS! The current-view endpoint is working correctly.');
    console.log('\n📝 This means:');
    console.log('   - API endpoint is functioning');
    console.log('   - Database is being updated');
    console.log('   - The issue is in the frontend not calling the endpoint');

    await (await import('./client')).closePool();
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testCurrentViewAPI()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testCurrentViewAPI };
