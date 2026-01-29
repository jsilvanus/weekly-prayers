import { verifyToken } from '../services/jwtService.js';
import { findUserById } from '../services/userService.js';

export function authenticate(options = {}) {
  const { required = true } = options;

  return async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (required) {
          return res.status(401).json({
            error: { message: 'Authentication required' }
          });
        }
        // Optional auth - continue without user
        req.user = null;
        return next();
      }

      const token = authHeader.split(' ')[1];

      // Verify token
      const payload = verifyToken(token);

      // Get fresh user data from database
      const user = await findUserById(payload.sub);

      if (!user) {
        return res.status(401).json({
          error: { message: 'User not found' }
        });
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { message: 'Token expired', code: 'TOKEN_EXPIRED' }
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: { message: 'Invalid token', code: 'INVALID_TOKEN' }
        });
      }

      if (error.message === 'Token has been revoked') {
        return res.status(401).json({
          error: { message: 'Token has been revoked', code: 'TOKEN_REVOKED' }
        });
      }

      next(error);
    }
  };
}

// Shorthand for required authentication
export const requireAuth = authenticate({ required: true });

// Shorthand for optional authentication
export const optionalAuth = authenticate({ required: false });
