import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma, UserRole } from '../db';
import {
  Permission,
  getRolePermissions,
  hasAnyPermission,
  hasAnyPermissionFromGrants,
  sanitizePermissionGrants,
} from '../rbac';

const isSchemaDriftError = (error: any) => {
  const code = String(error?.code || '');
  return code === 'P2021' || code === 'P2022';
};

const authUserSelectWithAdminRbac = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  status: true,
  lastLogin: true,
  adminProfile: {
    select: {
      permissions: true,
      adminRoleId: true,
      adminRole: {
        select: {
          permissions: true,
        },
      },
    },
  },
};

const authUserSelectLegacy = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  status: true,
  lastLogin: true,
  adminProfile: {
    select: {
      permissions: true,
    },
  },
};

const loadAuthUserById = async (userId: string): Promise<any> => {
  try {
    return (await prisma.user.findUnique({
      where: { id: userId },
      select: authUserSelectWithAdminRbac as any,
    })) as any;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    return (await prisma.user.findUnique({
      where: { id: userId },
      select: authUserSelectLegacy as any,
    })) as any;
  }
};

// JWT Secret - must be set in production
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('WARNING: JWT_SECRET not set. Using ephemeral development secret.');
}

const SECRET = JWT_SECRET || randomBytes(32).toString('hex');

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
        permissions?: string[];
      };
    }
  }
}

// Generate JWT token
export function generateToken(user: { id: string; email: string; role: UserRole; sessionIssuedAt?: number }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      ...(typeof user.sessionIssuedAt === 'number' ? { sessionIssuedAt: user.sessionIssuedAt } : {}),
    },
    SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): {
  id: string;
  email: string;
  role: UserRole;
  sessionIssuedAt?: number;
} {
  return jwt.verify(token, SECRET) as {
    id: string;
    email: string;
    role: UserRole;
    sessionIssuedAt?: number;
  };
}

// Authentication middleware
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Fetch full user from database
    const user = await loadAuthUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    const isPendingVendor =
      user.status === 'PENDING' &&
      (user.role === 'FABRIC_SELLER' || user.role === 'FASHION_DESIGNER');
    if (user.status !== 'ACTIVE' && !isPendingVendor) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact support.',
      });
    }

    // Enforce one active device/session at a time for sellers and designers.
    // A newer login updates lastLogin and invalidates older JWT sessionIssuedAt values.
    if (user.role === 'FABRIC_SELLER' || user.role === 'FASHION_DESIGNER') {
      const tokenSessionIssuedAt = Number(decoded.sessionIssuedAt || 0);
      const currentSessionIssuedAt = Number(user.lastLogin?.getTime() || 0);

      // Backward compatibility: older vendor tokens may not include sessionIssuedAt.
      // Enforce strict single-device checks only for session-aware tokens.
      if (tokenSessionIssuedAt && currentSessionIssuedAt) {
        // Allow tiny timestamp drift from database precision truncation.
        const allowedDriftMs = 2000;
        if (Math.abs(currentSessionIssuedAt - tokenSessionIssuedAt) > allowedDriftMs) {
          return res.status(401).json({
            success: false,
            message: 'You have been signed out because your account was used on another device.',
          });
        }
      }
    }

    const rolePermissions = getRolePermissions(user.role) as string[];
    const adminRolePermissions =
      user.role === 'ADMINISTRATOR'
        ? sanitizePermissionGrants((user as any)?.adminProfile?.adminRole?.permissions)
        : [];
    const adminUserPermissions =
      user.role === 'ADMINISTRATOR'
        ? sanitizePermissionGrants((user as any)?.adminProfile?.permissions)
        : [];
    const effectivePermissions =
      adminUserPermissions.length > 0
        ? adminUserPermissions
        : adminRolePermissions.length > 0
          ? adminRolePermissions
          : rolePermissions;

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: effectivePermissions,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

// Role-based authorization middleware
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
}

// Permission-based authorization middleware (RBAC)
export function authorizePermissions(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const permissionGrants = Array.isArray(req.user.permissions) && req.user.permissions.length > 0
      ? req.user.permissions
      : null;
    const canAccess = permissionGrants
      ? hasAnyPermissionFromGrants(permissionGrants, requiredPermissions)
      : hasAnyPermission(req.user.role, requiredPermissions);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
}

// Optional authentication (for public routes that can be enhanced for logged-in users)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await loadAuthUserById(decoded.id);

    const isPendingVendor =
      user?.status === 'PENDING' &&
      (user?.role === 'FABRIC_SELLER' || user?.role === 'FASHION_DESIGNER');
    if (user && (user.status === 'ACTIVE' || isPendingVendor)) {
      if (user.role === 'FABRIC_SELLER' || user.role === 'FASHION_DESIGNER') {
        const tokenSessionIssuedAt = Number(decoded.sessionIssuedAt || 0);
        const currentSessionIssuedAt = Number(user.lastLogin?.getTime() || 0);
        const allowedDriftMs = 2000;
        if (tokenSessionIssuedAt && currentSessionIssuedAt && Math.abs(currentSessionIssuedAt - tokenSessionIssuedAt) > allowedDriftMs) {
          return next();
        }
      }
      const rolePermissions = getRolePermissions(user.role) as string[];
      const adminRolePermissions =
        user.role === 'ADMINISTRATOR'
          ? sanitizePermissionGrants((user as any)?.adminProfile?.adminRole?.permissions)
          : [];
      const adminUserPermissions =
        user.role === 'ADMINISTRATOR'
          ? sanitizePermissionGrants((user as any)?.adminProfile?.permissions)
          : [];
      const effectivePermissions =
        adminUserPermissions.length > 0
          ? adminUserPermissions
          : adminRolePermissions.length > 0
            ? adminRolePermissions
            : rolePermissions;

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        permissions: effectivePermissions,
      };
    }

    next();
  } catch (error) {
    // Continue without user
    next();
  }
}
