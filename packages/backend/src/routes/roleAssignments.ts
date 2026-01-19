/**
 * Role Assignment routes
 *
 * Allows admins to grant and revoke additional roles for users
 */

import { Router, Response, NextFunction } from 'express';
import { RoleAssignmentRepository } from '../repositories/RoleAssignmentRepository';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { getPool } from '../db/client';
import { UserRole } from '@opsui/shared';

const router = Router();
const roleAssignmentRepo = new RoleAssignmentRepository(getPool());

// Helper middleware to check if user is admin
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }
  next();
};

/**
 * GET /api/role-assignments
 * Get all role assignments (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const assignments = await roleAssignmentRepo.getAllRoleAssignments();
    res.json(assignments);
  })
);

/**
 * GET /api/role-assignments/user/:userId
 * Get role assignments for a specific user
 */
router.get(
  '/user/:userId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;

    // Users can view their own role assignments, admins can view any
    if (req.user?.userId !== userId && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'You do not have permission to view role assignments for this user',
        code: 'FORBIDDEN',
      });
    }

    const assignments = await roleAssignmentRepo.getRoleAssignmentsForUser(userId);
    res.json(assignments);
  })
);

/**
 * GET /api/role-assignments/my-roles
 * Get current user's additional roles
 */
router.get(
  '/my-roles',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const roles = await roleAssignmentRepo.getUserRoleAssignments(req.user.userId);
    res.json(roles);
  })
);

/**
 * POST /api/role-assignments/grant
 * Grant a role to a user (admin only)
 */
router.post(
  '/grant',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Accept both camelCase and snake_case (frontend sends snake_case)
    const { userId, user_id, role } = req.body;
    const finalUserId = userId || user_id;

    if (!finalUserId || !role) {
      return res.status(400).json({
        error: 'userId and role are required',
        code: 'MISSING_FIELDS',
      });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
    }

    const assignment = await roleAssignmentRepo.grantRole(
      { userId: finalUserId, role },
      req.user.userId
    );

    res.status(201).json(assignment);
  })
);

/**
 * DELETE /api/role-assignments/revoke
 * Revoke a role from a user (admin only)
 */
router.delete(
  '/revoke',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Accept both camelCase and snake_case (frontend sends snake_case)
    const { userId, user_id, role } = req.body;
    const finalUserId = userId || user_id;

    if (!finalUserId || !role) {
      return res.status(400).json({
        error: 'userId and role are required',
        code: 'MISSING_FIELDS',
      });
    }

    await roleAssignmentRepo.revokeRole({ userId: finalUserId, role });
    res.json({ message: 'Role revoked successfully' });
  })
);

export default router;
