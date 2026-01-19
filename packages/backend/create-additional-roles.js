/**
 * Script to create Production, Maintenance, and Inwards users
 * Run with: node create-additional-roles.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
};

const roles = [
  {
    name: 'Production Manager',
    email: 'production@wms.local',
    userId: 'USR-PROD001',
    role: 'PRODUCTION',
    password: 'Production123!',
  },
  {
    name: 'Maintenance Supervisor',
    email: 'maintenance@wms.local',
    userId: 'USR-MAINT001',
    role: 'MAINTENANCE',
    password: 'Maintain123!',
  },
  {
    name: 'Inwards Goods Receiver',
    email: 'inwards@wms.local',
    userId: 'USR-INWD001',
    role: 'INWARDS',
    password: 'Inwards123!',
  },
];

async function createUsers() {
  const pool = new Pool(poolConfig);

  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Check and add roles to enum if needed
    for (const roleData of roles) {
      const enumCheck = await pool.query(
        `
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = 'user_role'::regtype
        AND enumlabel = $1
      `,
        [roleData.role]
      );

      if (enumCheck.rows.length === 0) {
        console.log(`⚠️  ${roleData.role} role not found in enum. Adding it...`);
        await pool.query(`ALTER TYPE user_role ADD VALUE '${roleData.role}' BEFORE 'SUPERVISOR'`);
        console.log(`✅ Added ${roleData.role} to user_role enum\n`);
      } else {
        console.log(`✅ ${roleData.role} role already exists in enum`);
      }
    }

    console.log('');

    // Create each user
    for (const roleData of roles) {
      console.log(`Processing ${roleData.role} user...`);

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT user_id, email, role FROM users WHERE user_id = $1 OR email = $2',
        [roleData.userId, roleData.email]
      );

      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];
        console.log(`ℹ️  User already exists: ${user.email}`);

        if (user.role !== roleData.role) {
          await pool.query(`UPDATE users SET role = $1 WHERE user_id = $2`, [
            roleData.role,
            roleData.userId,
          ]);
          console.log(`✅ Updated user role to ${roleData.role}`);
        } else {
          console.log(`✅ User already has correct role`);
        }
      } else {
        // Create new user
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(roleData.password, saltRounds);

        await pool.query(
          `INSERT INTO users (user_id, name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [roleData.userId, roleData.name, roleData.email, passwordHash, roleData.role]
        );

        console.log(`✅ Created ${roleData.role} user`);
      }

      console.log('');
    }

    // Display all created users
    console.log('\n' + '='.repeat(70));
    console.log('NEW USER ACCOUNTS CREATED');
    console.log('='.repeat(70));

    for (const roleData of roles) {
      const verifyUser = await pool.query(
        'SELECT user_id, name, email, role, active FROM users WHERE email = $1',
        [roleData.email]
      );

      if (verifyUser.rows.length > 0) {
        const user = verifyUser.rows[0];
        console.log(`\n${user.role} ACCOUNT:`);
        console.log('  User ID:', user.user_id);
        console.log('  Name:', user.name);
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);
        console.log('  Active:', user.active);
        console.log('  Password:', roleData.password);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔐 LOGIN URL: http://localhost:5173/login');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.routine === 'enum_in' && error.message.includes('unsafe')) {
      console.error(
        '\n💡 Hint: When adding new enum values, you may need to restart the connection.'
      );
      console.error('   Try running the script again in a few seconds.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUsers();
