/**
 * Authentication and authorization middleware
 *
 * Handles JWT validation and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import config from '../config';
import { UserRole, UnauthorizedError, ForbiddenError } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  activeRole?: UserRole | null; // Active role for multi-role users
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify JWT token and attach user to request
 * Supports active role switching for multi-role users
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Use active role if set, otherwise use base role
    const effectiveRole = decoded.activeRole || decoded.role;

    // Attach user to request with effective role
    req.user = {
      ...decoded,
      role: effectiveRole as UserRole,
    };

    logger.debug('User authenticated', {
      userId: decoded.userId,
      email: decoded.email,
      baseRole: decoded.role,
      activeRole: decoded.activeRole,
      effectiveRole,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Check if user has required role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`User role '${req.user.role}' not authorized for this resource`)
      );
    }

    next();
  };
}

/**
 * Check if user is admin
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  if (req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}

/**
 * Check if user is supervisor or admin
 */
export function requireSupervisor(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  if (req.user.role !== UserRole.SUPERVISOR && req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('Supervisor or admin access required'));
  }

  next();
}

/**
 * Check if user is a picker
 */
export function requirePicker(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  if (req.user.role !== UserRole.PICKER && req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('Picker access required'));
  }

  next();
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate JWT token for user
 */
export function generateToken(user: { userId: string; email: string; role: UserRole; activeRole?: UserRole | null }): string {
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    activeRole: user.activeRole,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Generate refresh token (longer-lived)
 */
export function generateRefreshToken(user: { userId: string; email: string; role: UserRole; activeRole?: UserRole | null }): string {
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    activeRole: user.activeRole,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}