/**
 * Task ID Validation Middleware
 * Ensures req.params.id is a valid positive integer.
 */
const validateTaskId = (req, res, next) => {
  const { id } = req.params;
  const parsedId = Number(id);

  // Validate that id consists strictly of digits and is a positive integer (> 0)
  const isPositiveInteger = /^\d+$/.test(id) && Number.isInteger(parsedId) && parsedId > 0;

  if (!isPositiveInteger) {
    return res.status(400).json({
      error: "Invalid task id"
    });
  }

  // Attach parsed numeric ID to request for downstream handlers
  req.taskId = parsedId;
  next();
};

module.exports = validateTaskId;
