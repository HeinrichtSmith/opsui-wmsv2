/**
 * Check and activate picker accounts
 *
 * This script checks the status of picker accounts and activates them if needed.
 */

import { query, closePool } from './client';

async function checkAndActivatePickers(): Promise<void> {
  try {
    console.log('🔍 Checking picker account status...\n');

    // Check all picker accounts
    const result = await query(`
      SELECT
        user_id,
        email,
        name,
        role,
        is_active,
        created_at
      FROM users
      WHERE role = 'PICKER'
      ORDER BY user_id;
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No picker accounts found in database.');
      return;
    }

    console.log(`Found ${result.rows.length} picker account(s):\n`);
    console.table(result.rows);

    // Check if any pickers are inactive
    const inactivePickers = result.rows.filter((row: any) => !row.isActive);

    if (inactivePickers.length === 0) {
      console.log('\n✅ All picker accounts are already active.\n');
      return;
    }

    console.log(`\n⚠️  Found ${inactivePickers.length} inactive picker account(s). Activating...\n`);

    // Activate all inactive pickers
    for (const picker of inactivePickers) {
      await query(`
        UPDATE users
        SET is_active = true,
            updated_at = NOW()
        WHERE user_id = $1
      `, [picker.userId]);

      console.log(`✅ Activated: ${picker.name} (${picker.userId})`);
    }

    console.log('\n✅ All picker accounts are now active!\n');

    // Verify activation
    const verifyResult = await query(`
      SELECT user_id, name, is_active
      FROM users
      WHERE role = 'PICKER'
      ORDER BY user_id;
    `);

    console.log('📊 Current picker status:');
    console.table(verifyResult.rows);

  } catch (error) {
    console.error('\n❌ Failed to activate pickers:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  checkAndActivatePickers()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { checkAndActivatePickers };
