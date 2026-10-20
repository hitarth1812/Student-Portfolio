import TaskCard from "./TaskCard";

function TaskSection({
  statusKey,
  title,
  tasks = [],
  onStatusChange,
  onUpdate,
  onDelete,
  updatingTaskId,
  canManage = true,
  icon,
}) {
  return (
    <div className={`task-status-column status-column-${statusKey}`} id={`section-${statusKey}`}>
      <div className="task-section-header">
        <div className="task-section-title-wrap">
          {icon && <span className="task-section-icon">{icon}</span>}
          <h2 className="task-section-title">{title}</h2>
        </div>
        <span className={`task-section-count count-badge-${statusKey}`}>
          {tasks.length}
        </span>
      </div>

      <div className="task-section-content">
        {tasks.length === 0 ? (
          <div className="task-section-empty">
            <p>No {title.toLowerCase()} tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onStatusChange={onStatusChange}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isUpdating={updatingTaskId === task._id}
              canManage={canManage}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default TaskSection;
