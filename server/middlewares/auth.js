import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/helpers.js';

/**
 * Protect routes - Require authentication
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies (optional)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new ApiError('Not authorized to access this route', 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError('User not found', 401);
    }

    if (!user.isActive) {
      throw new ApiError('Your account has been deactivated', 401);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Authorize by role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError('Not authorized to access this route', 403));
    }
    next();
  };
};

/**
 * Manager only middleware
 */
export const managerOnly = authorize('manager');

/**
 * Employee only middleware
 */
export const employeeOnly = authorize('employee');

export default { protect, authorize, managerOnly, employeeOnly };
