const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  // Owner of the task. Every query is scoped by this field so one logged-in
  // user can never read or modify another user's tasks.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Task must belong to a user"],
    index: true,
  },

  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },

  description: {
    type: String,
    trim: true,
  },

  status: {
    type: String,
    enum: {
      values: ["pending", "incomplete", "completed"],
      message: "Status must be one of: pending, incomplete, completed",
    },
    default: "pending",
    index: true,
  },

  completed: {
    type: Boolean,
    default: false,
  },

  priority: {
    type: String,
    enum: {
      values: ["low", "medium", "high"],
      message: "Priority must be one of: low, medium, high",
    },
    default: "medium",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for optimized querying by user and status
taskSchema.index({ user: 1, status: 1 });

// Ensure title/description are trimmed and status/completed remain synchronized
taskSchema.pre("save", function (next) {
  if (typeof this.title === "string") {
    this.title = this.title.trim();
  }

  if (typeof this.description === "string") {
    this.description = this.description.trim();
  }

  // Backward compatibility: maintain both status and completed in sync
  if (this.status) {
    this.completed = this.status === "completed";
  } else if (typeof this.completed === "boolean") {
    this.status = this.completed ? "completed" : "pending";
  }

  next();
});

module.exports = mongoose.model("Task", taskSchema);