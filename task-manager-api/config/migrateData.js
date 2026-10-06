const Task = require('../models/Task');
const User = require('../models/User');

/**
 * Backward compatibility migration:
 * - Safely converts legacy tasks containing boolean `completed` to the 3-state `status` enum:
 *     completed === true  -> 'completed'
 *     completed === false -> 'pending'
 *   Preserves existing status if already set.
 * - Ensures any existing legacy users without a role receive default 'user' role.
 */
const migrateData = async () => {
  try {
    // 1. Migrate legacy tasks missing a valid status
    const tasksToMigrate = await Task.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: { $nin: ['pending', 'incomplete', 'completed'] } }
      ]
    });

    if (tasksToMigrate.length > 0) {
      console.log(`[Migration] Found ${tasksToMigrate.length} legacy tasks to migrate...`);
      for (const task of tasksToMigrate) {
        task.status = task.completed === true ? 'completed' : 'pending';
        task.completed = task.status === 'completed';
        await task.save();
      }
      console.log('[Migration] Task migration completed successfully.');
    }

    // 2. Ensure legacy users have a valid role
    const usersToMigrate = await User.find({
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: { $nin: ['user', 'manager', 'admin'] } }
      ]
    });

    if (usersToMigrate.length > 0) {
      console.log(`[Migration] Found ${usersToMigrate.length} legacy users without valid role...`);
      for (const user of usersToMigrate) {
        user.role = 'user';
        await user.save();
      }
      console.log('[Migration] User role migration completed successfully.');
    }
  } catch (err) {
    console.error('[Migration Error]', err.message);
  }
};

module.exports = migrateData;
