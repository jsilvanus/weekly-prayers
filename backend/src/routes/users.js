import { Router } from 'express';
import { getAllUsers, updateUserRole, findUserById } from '../services/userService.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// GET /api/users - List all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await getAllUsers();

    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }))
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/role - Update user role (admin only)
router.put('/:id/role', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        error: { message: 'Role is required' }
      });
    }

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      return res.status(400).json({
        error: { message: 'Cannot change your own role' }
      });
    }

    const updatedUser = await updateUserRole(id, role);

    if (!updatedUser) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        createdAt: updatedUser.created_at,
        lastLogin: updatedUser.last_login
      }
    });
  } catch (error) {
    if (error.message.includes('Invalid role')) {
      return res.status(400).json({
        error: { message: error.message }
      });
    }
    next(error);
  }
});

// GET /api/users/:id - Get single user (admin only)
router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
