const User = require('../models/User');
const Task = require('../models/Task');

const ALLOWED_ROLES = ['user', 'manager', 'admin'];

// GET /users - List all users (accessible by admin and manager)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      data: formattedUsers
    });
  } catch (err) {
    next(err);
  }
};

// PUT /users/:id/role - Update user's role (admin only)
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body || {};

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`
      });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Safety: prevent admin from demoting themselves if they are the last admin
    if (req.user.id === targetUser._id.toString() && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot demote yourself: you are the only administrator'
        });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        createdAt: targetUser.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /users/:id - Delete a user and associated tasks (admin only)
const deleteUser = async (req, res, next) => {
  try {
    // Safety check: prevent an admin from deleting their own account
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own administrator account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Clean up all tasks owned by this deleted user
    await Task.deleteMany({ user: req.params.id });

    res.status(200).json({
      success: true,
      message: 'User and their tasks deleted successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser
};
