import { useState } from "react";

function TaskCard({
  task,
  onStatusChange,
  onUpdate,
  onDelete,
  isUpdating,
  canManage = true,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editPriority, setEditPriority] = useState(task.priority || "medium");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    await onUpdate(task, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "medium");
    setIsEditing(false);
  };

  const currentStatus = task.status || (task.completed ? "completed" : "pending");

  return (
    <div
      className={`task-card task-card-${currentStatus}${
        currentStatus === "completed" ? " task-completed" : ""
      }`}
      id={`task-card-${task._id}`}
    >
      {isEditing ? (
        <form onSubmit={handleSave} className="task-edit-form">
          <input
            type="text"
            className="task-edit-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Task title"
            required
          />

          <textarea
            className="task-edit-textarea"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Task description"
            rows={2}
          />

          <div className="task-edit-meta-row">
            <label className="task-edit-label">
              Priority:
              <select
                className="task-priority-select"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div className="task-card-actions">
            <button type="submit" disabled={isUpdating}>
              Save
            </button>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="task-card-header">
            <div className="task-badges-row">
              <span className={`priority-badge priority-${task.priority || "medium"}`}>
                {(task.priority || "medium").toUpperCase()}
              </span>

              {isUpdating && <span className="task-updating-spinner">Updating...</span>}
            </div>

            {canManage && (
              <div className="task-status-control">
                <label htmlFor={`status-select-${task._id}`} className="sr-only">
                  Status
                </label>
                <select
                  id={`status-select-${task._id}`}
                  className={`task-status-select status-select-${currentStatus}`}
                  value={currentStatus}
                  disabled={isUpdating}
                  onChange={(e) => onStatusChange(task, e.target.value)}
                  aria-label="Change task status"
                >
                  <option value="pending">Pending</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          <h3 className="task-title">{task.title}</h3>

          {task.description && (
            <p className="task-description">{task.description}</p>
          )}

          {task.user && typeof task.user === "object" && (
            <div className="task-owner-info">
              <span>Owner: {task.user.name || task.user.email}</span>
            </div>
          )}

          {canManage && (
            <div className="task-card-actions">
              <button
                type="button"
                className="task-btn-edit"
                onClick={() => setIsEditing(true)}
                disabled={isUpdating}
              >
                Edit
              </button>
              <button
                type="button"
                className="task-btn-delete"
                onClick={() => onDelete(task._id)}
                disabled={isUpdating}
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TaskCard;
