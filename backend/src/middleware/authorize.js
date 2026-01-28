// Role hierarchy: admin > worker > user
const roleHierarchy = {
  admin: 3,
  worker: 2,
  user: 1,
};

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: { message: 'Authentication required' }
      });
    }

    const userRole = req.user.role;

    // Check if user has one of the allowed roles
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: {
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      }
    });
  };
}

export function requireMinRole(minRole) {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: { message: 'Authentication required' }
      });
    }

    const userRole = req.user.role;
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[minRole] || 0;

    if (userLevel >= requiredLevel) {
      return next();
    }

    return res.status(403).json({
      error: {
        message: 'Insufficient permissions',
        required: minRole,
        current: userRole
      }
    });
  };
}

// Shorthand middlewares
export const requireAdmin = requireRole('admin');
export const requireWorker = requireMinRole('worker');
export const requireUser = requireMinRole('user');

// Check if user is at least worker level
export function isWorkerOrAbove(user) {
  if (!user) return false;
  return roleHierarchy[user.role] >= roleHierarchy.worker;
}

// Check if user is admin
export function isAdmin(user) {
  if (!user) return false;
  return user.role === 'admin';
}
