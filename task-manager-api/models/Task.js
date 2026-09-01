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

// Ensure title is trimmed before saving
taskSchema.pre("save", function (next) {
  if (typeof this.title === "string") {
    this.title = this.title.trim();
  }

  if (typeof this.description === "string") {
    this.description = this.description.trim();
  }

  next();
});

module.exports = mongoose.model("Task", taskSchema);