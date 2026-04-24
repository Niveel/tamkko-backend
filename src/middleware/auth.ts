import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@/utils/apiError';
import env from '@/config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'creator' | 'admin' | 'moderator';
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Provide a valid Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthRequest['user'];

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, 'Invalid or expired token.'));
    }
    next(error);
  }
};

type Role = 'user' | 'creator' | 'admin' | 'moderator';

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
};

export const auth = (roles?: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, (error?: unknown) => {
      if (error) return next(error);
      if (roles?.length) return authorize(...roles)(req, res, next);
      return next();
    });
  };
};

export const authMiddleware = authenticate;
export const rbac = (roles: Role[]) => authorize(...roles);
export const protect = authenticate;
export const restrictTo = (...roles: Role[]) => authorize(...roles);

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthRequest['user'];
      req.user = decoded;
    }
    next();
  } catch {
    // Token invalid or missing, but we allow the request to proceed
    next();
  }
};
