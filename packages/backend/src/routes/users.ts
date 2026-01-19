/**
 * User management routes
 *
 * Provides endpoints for listing users (admin only)
 */

import { Router, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { getPool } from '../db/client';
import { UserRole } from '@opsui/shared';

const router = Router();
const userRepo = new UserRepository(getPool());

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
 * GET /api/users
 * Get all users (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const users = await userRepo.getAllUsers();
    res.json(users);
  })
);

export default router;
