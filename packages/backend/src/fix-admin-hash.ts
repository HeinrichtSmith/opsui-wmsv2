/**
 * Fix admin password hash
 *
 * Regenerates the bcrypt hash for the default admin user
 */

import bcrypt from 'bcrypt';
import { query } from './db/client';
import { logger } from './config/logger';

async function fixAdminPassword() {
  try {
    logger.info('Starting admin password fix...');

    // Generate correct bcrypt hash for 'admin123'
    const password = 'admin123';
    const rounds = 10;
    const passwordHash = await bcrypt.hash(password, rounds);

    logger.info('Generated new hash', {
      length: passwordHash.length,
      startsWith: passwordHash.substring(0, 7),
    });

    // Update admin user in database
    const result = await query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE email = 'admin@wms.local' 
       RETURNING user_id, email, name`,
      [passwordHash]
    );

    if (result.rows.length === 0) {
      logger.error('Admin user not found!');
      logger.info('Creating admin user...');

      // Create admin user if not exists
      await query(
        `INSERT INTO users (user_id, name, email, password_hash, role, active)
         VALUES ('USR-ADMIN01', 'System Administrator', 'admin@wms.local', $1, 'ADMIN', true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $1`,
        [passwordHash]
      );

      logger.info('Admin user created successfully');
    } else {
      logger.info('Admin user updated successfully', {
        userId: result.rows[0].user_id,
        email: result.rows[0].email,
      });
    }

    // Verify the hash works
    const isValid = await bcrypt.compare(password, passwordHash);
    logger.info('Hash verification', { isValid });

    if (!isValid) {
      throw new Error('Generated hash does not verify correctly!');
    }

    logger.info('✅ Admin password fix completed successfully!');
    logger.info('Login credentials:');
    logger.info('  Email: admin@wms.local');
    logger.info('  Password: admin123');
  } catch (error) {
    logger.error('Failed to fix admin password', { error });
    throw error;
  }
}

// Run the fix
fixAdminPassword()
  .then(() => {
    logger.info('Fix completed. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Fix failed. Exiting...', { error });
    process.exit(1);
  });
