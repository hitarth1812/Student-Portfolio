const mongoose = require('mongoose');

/**
 * MongoDB ObjectId Validation Middleware
 * Ensures req.params.id is a syntactically valid Mongo ObjectId before hitting the database.
 */
const validateObjectId = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid task id'
    });
  }

  next();
};

module.exports = validateObjectId;
