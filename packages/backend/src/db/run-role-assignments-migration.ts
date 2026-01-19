/**
 * Run the user_role_assignments table migration
 */

import { query, closePool } from './client';
import { logger } from '../config/logger';

async function runMigration(): Promise<void> {
  try {
    logger.info('Running user_role_assignments migration...');

    // Create the function to generate assignment IDs
    await query(`
      CREATE OR REPLACE FUNCTION generate_assignment_id()
      RETURNS VARCHAR(20) AS $$
        SELECT 'URA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      $$ LANGUAGE SQL;
    `);

    // Create the table
    await query(`
      CREATE TABLE IF NOT EXISTS user_role_assignments (
        assignment_id VARCHAR(20) PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        role user_role NOT NULL,
        granted_by VARCHAR(20) NOT NULL,
        granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        active BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT fk_user_role_assignments_user
          FOREIGN KEY (user_id)
          REFERENCES users(user_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_user_role_assignments_granted_by
          FOREIGN KEY (granted_by)
          REFERENCES users(user_id)
          ON DELETE SET NULL
      );
    `);

    // Create unique constraint
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_role_assignments_unique
        ON user_role_assignments (user_id, role)
        WHERE active = true;
    `);

    // Create index for user_id lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id
        ON user_role_assignments (user_id)
        WHERE active = true;
    `);

    // Create trigger function
    await query(`
      CREATE OR REPLACE FUNCTION set_assignment_id()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.assignment_id IS NULL OR NEW.assignment_id = '' THEN
          NEW.assignment_id := generate_assignment_id();
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await query(`
      DROP TRIGGER IF EXISTS trg_set_assignment_id ON user_role_assignments
    `);

    await query(`
      CREATE TRIGGER trg_set_assignment_id
        BEFORE INSERT ON user_role_assignments
        FOR EACH ROW
        EXECUTE FUNCTION set_assignment_id()
    `);

    logger.info('user_role_assignments migration completed successfully');
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await runMigration();
    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Migration script failed');
    await closePool();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runMigration };
