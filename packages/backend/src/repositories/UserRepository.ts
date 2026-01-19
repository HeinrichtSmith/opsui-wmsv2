/**
 * User repository
 *
 * Handles all database operations for users
 */

import { BaseRepository } from './BaseRepository';
import { User, UserRole } from '@opsui/shared';
import { query } from '../db/client';
import { NotFoundError, ConflictError } from '@opsui/shared';
import bcrypt from 'bcrypt';

// ============================================================================
// USER REPOSITORY
// ============================================================================

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users', 'user_id');
  }

  // --------------------------------------------------------------------------
  // FIND BY EMAIL
  // --------------------------------------------------------------------------

  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(`SELECT * FROM users WHERE email = $1`, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return await this.attachAdditionalRoles(user);
  }

  // --------------------------------------------------------------------------
  // FIND BY EMAIL OR THROW
  // --------------------------------------------------------------------------

  async findByEmailOrThrow(email: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User', `email: ${email}`);
    }

    return user;
  }

  // --------------------------------------------------------------------------
  // FIND BY ROLE
  // --------------------------------------------------------------------------

  async findByRole(role: UserRole, activeOnly: boolean = true): Promise<User[]> {
    const result = await query<User>(
      `SELECT * FROM users
       WHERE role = $1 ${activeOnly ? 'AND active = true' : ''}
       ORDER BY name`,
      [role]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // FIND ACTIVE PICKERS
  // --------------------------------------------------------------------------

  async findActivePickers(): Promise<User[]> {
    const result = await query<User>(
      `SELECT DISTINCT u.*
       FROM users u
       INNER JOIN orders o ON u.user_id = o.picker_id
       WHERE u.role = 'PICKER' AND u.active = true AND o.status = 'PICKING'
       ORDER BY u.name`
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // VERIFY PASSWORD
  // --------------------------------------------------------------------------

  async verifyPassword(email: string, password: string): Promise<User | null> {
    // Get user with password hash
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const userWithHash = result.rows[0] as any;

    // Verify password (column name is already camelCased by query function)
    const isValid = await bcrypt.compare(password, userWithHash.passwordHash);

    if (!isValid) {
      return null;
    }

    // Return user without password hash - use already camelCased keys
    const { passwordHash: _, ...userWithoutPassword } = userWithHash;
    return userWithoutPassword as User;
  }

  // --------------------------------------------------------------------------
  // CREATE USER WITH HASHED PASSWORD
  // --------------------------------------------------------------------------

  async createUserWithPassword(data: {
    userId: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.insert({
      userId: data.userId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      active: true,
    } as any);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  // --------------------------------------------------------------------------
  // UPDATE PASSWORD
  // --------------------------------------------------------------------------

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [passwordHash, userId]);
  }

  // --------------------------------------------------------------------------
  // UPDATE USER ACTIVITY
  // --------------------------------------------------------------------------

  async updateLastLogin(userId: string): Promise<void> {
    await query(`UPDATE users SET last_login_at = NOW() WHERE user_id = $1`, [userId]);
  }

  // --------------------------------------------------------------------------
  // SET CURRENT TASK
  // --------------------------------------------------------------------------

  async setCurrentTask(userId: string, taskId: string | null): Promise<void> {
    await query(`UPDATE users SET current_task_id = $1 WHERE user_id = $2`, [taskId, userId]);
  }

  // --------------------------------------------------------------------------
  // GET USER WITHOUT SENSITIVE DATA
  // --------------------------------------------------------------------------

  async getUserSafe(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const result = await query(
      `SELECT user_id, name, email, role, active, active_role, current_task_id, created_at, last_login_at
       FROM users WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // SET ACTIVE ROLE
  // --------------------------------------------------------------------------

  async setActiveRole(userId: string, activeRole: UserRole | null): Promise<void> {
    await query(`UPDATE users SET active_role = $1 WHERE user_id = $2`, [activeRole, userId]);
  }

  // --------------------------------------------------------------------------
  // ATTACH ADDITIONAL ROLES
  // --------------------------------------------------------------------------

  /**
   * Attach additional roles to a user object
   * This fetches granted roles from user_role_assignments table
   */
  private async attachAdditionalRoles(user: User): Promise<User> {
    const result = await query<{ role: UserRole }>(
      `SELECT role
       FROM user_role_assignments
       WHERE user_id = $1 AND active = true
       ORDER BY granted_at DESC`,
      [user.userId]
    );

    return {
      ...user,
      additionalRoles: result.rows.map(row => row.role),
    };
  }

  // --------------------------------------------------------------------------
  // GET ALL USERS
  // --------------------------------------------------------------------------

  /**
   * Get all users with their additional roles attached
   */
  async getAllUsers(): Promise<User[]> {
    const result = await query<User>(`SELECT * FROM users ORDER BY created_at DESC`);

    // Attach additional roles to each user
    const usersWithRoles = await Promise.all(
      result.rows.map(user => this.attachAdditionalRoles(user))
    );

    return usersWithRoles;
  }

  // --------------------------------------------------------------------------
  // DEACTIVATE USER
  // --------------------------------------------------------------------------

  async deactivateUser(userId: string): Promise<User> {
    const result = await query(`UPDATE users SET active = false WHERE user_id = $1 RETURNING *`, [
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }

  // --------------------------------------------------------------------------
  // ACTIVATE USER
  // --------------------------------------------------------------------------

  async activateUser(userId: string): Promise<User> {
    const result = await query(`UPDATE users SET active = true WHERE user_id = $1 RETURNING *`, [
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }
}

// Singleton instance
export const userRepository = new UserRepository();
