import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import AppError from '../utils/AppError';
import { verifyToken } from '../utils/token';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    countryCode?: string;
    role: string;
    emailVerified: boolean;
  };
}

const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Not authorized to access this route', 401);
    }

    const decoded = verifyToken(token) as jwt.JwtPayload;

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new AppError('User account no longer exists', 401);
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      countryCode: user.countryCode,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Not authorized to access this route', 401));
    }
  }
};

/** Allow the request through only for the given roles. Use after [protect]. */
export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action', 403));
      return;
    }
    next();
  };

/** Block unverified accounts from sensitive routes. Use after [protect]. */
export const requireVerified = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    next(new AppError('Not authorized to access this route', 401));
    return;
  }
  if (!req.user.emailVerified) {
    next(
      new AppError(
        'Please verify your email before continuing. A verification email was sent to your inbox.',
        403,
      ),
    );
    return;
  }
  next();
};

export default protect;