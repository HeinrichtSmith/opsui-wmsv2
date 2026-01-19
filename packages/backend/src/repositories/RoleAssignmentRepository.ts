/**
 * Role Assignment Repository
 *
 * Manages additional role assignments for users
 */

import { Pool } from 'pg';
import { RoleAssignment, GrantRoleDTO, RevokeRoleDTO, UserRole } from '@opsui/shared';

export class RoleAssignmentRepository {
  constructor(private pool: Pool) {}

  /**
   * Get all active role assignments for a user
   */
  async getUserRoleAssignments(userId: string): Promise<UserRole[]> {
    const query = `
      SELECT role
      FROM user_role_assignments
      WHERE user_id = $1 AND active = true
      ORDER BY granted_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => row.role as UserRole);
  }

  /**
   * Get all role assignments with details
   */
  async getAllRoleAssignments(): Promise<RoleAssignment[]> {
    const query = `
      SELECT
        assignment_id as "assignmentId",
        user_id as "userId",
        role,
        granted_by as "grantedBy",
        granted_at as "grantedAt",
        active
      FROM user_role_assignments
      WHERE active = true
      ORDER BY granted_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get role assignments for a specific user
   */
  async getRoleAssignmentsForUser(userId: string): Promise<RoleAssignment[]> {
    const query = `
      SELECT
        assignment_id as "assignmentId",
        user_id as "userId",
        role,
        granted_by as "grantedBy",
        granted_at as "grantedAt",
        active
      FROM user_role_assignments
      WHERE user_id = $1 AND active = true
      ORDER BY granted_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Grant a role to a user
   */
  async grantRole(dto: GrantRoleDTO, grantedBy: string): Promise<RoleAssignment> {
    // Check if role already exists
    const existingQuery = `
      SELECT assignment_id
      FROM user_role_assignments
      WHERE user_id = $1 AND role = $2
    `;
    const existing = await this.pool.query(existingQuery, [dto.userId, dto.role]);

    if (existing.rows.length > 0) {
      // Reactivate if exists but is inactive
      const reactivateQuery = `
        UPDATE user_role_assignments
        SET active = true, granted_by = $3, granted_at = NOW()
        WHERE user_id = $1 AND role = $2
        RETURNING
          assignment_id as "assignmentId",
          user_id as "userId",
          role,
          granted_by as "grantedBy",
          granted_at as "grantedAt",
          active
      `;
      const result = await this.pool.query(reactivateQuery, [dto.userId, dto.role, grantedBy]);
      return result.rows[0];
    }

    // Create new role assignment
    const query = `
      INSERT INTO user_role_assignments (user_id, role, granted_by)
      VALUES ($1, $2, $3)
      RETURNING
        assignment_id as "assignmentId",
        user_id as "userId",
        role,
        granted_by as "grantedBy",
        granted_at as "grantedAt",
        active
    `;
    const result = await this.pool.query(query, [dto.userId, dto.role, grantedBy]);
    return result.rows[0];
  }

  /**
   * Revoke a role from a user (soft delete)
   */
  async revokeRole(dto: RevokeRoleDTO): Promise<void> {
    const query = `
      UPDATE user_role_assignments
      SET active = false
      WHERE user_id = $1 AND role = $2
    `;
    await this.pool.query(query, [dto.userId, dto.role]);
  }

  /**
   * Check if a user has a specific role (including base role)
   */
  async userHasRole(userId: string, role: UserRole): Promise<boolean> {
    const query = `
      SELECT
        EXISTS(
          SELECT 1 FROM users WHERE user_id = $1 AND role = $2
        ) OR EXISTS(
          SELECT 1 FROM user_role_assignments WHERE user_id = $1 AND role = $2 AND active = true
        ) as has_role
    `;
    const result = await this.pool.query(query, [userId, role]);
    return result.rows[0].has_role;
  }
}
