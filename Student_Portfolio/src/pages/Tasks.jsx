import { useState, useEffect, useCallback, useMemo } from "react";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/auth-context";
import ErrorMessage from "../components/ErrorMessage";
import TaskSection from "../components/TaskSection";
import EventPanel from "../components/EventPanel";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../api";

function Tasks() {
  const { user } = useAuth();
  const isElevated = user?.role === "admin" || user?.role === "manager";

  const [tasks, setTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Filter state: 'all' | 'pending' | 'incomplete' | 'completed'
  const [statusFilter, setStatusFilter] = useState("all");

  // Manager / Admin scope toggle: 'mine' | 'team'
  const [scope, setScope] = useState("mine");

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [initialStatus, setInitialStatus] = useState("pending");
  const [creating, setCreating] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  // Practical 10: event-driven drawer (SSE stream, async jobs, telemetry)
  const [edaOpen, setEdaOpen] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchTasks() {
      try {
        const fetchAll = isElevated && scope === "team";
        const data = await getTasks({ all: fetchAll });

        if (!isMounted) return;

        const normalized = (Array.isArray(data) ? data : []).map((t) => ({
          ...t,
          status: t.status || (t.completed ? "completed" : "pending"),
        }));

        setTasks(normalized);
        setTaskError(null);
      } catch (err) {
        if (!isMounted) return;
        if (err.status !== 401) {
          setTaskError(err.message || "Failed to load tasks.");
        }
      } finally {
        if (isMounted) {
          setTaskLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [isElevated, scope, reloadKey]);

  const loadTasks = useCallback(() => {
    setTaskLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  // A task:* event pushed over SSE (e.g. from another tab) triggers a silent
  // refetch, so the list stays in sync without a spinner or manual reload.
  const handleTaskEvent = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Derived filtered & segregated task groups
  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === "pending"),
    [tasks]
  );

  const incompleteTasks = useMemo(
    () => tasks.filter((t) => t.status === "incomplete"),
    [tasks]
  );

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks]
  );

  // Status change handler: calls API, then transitions task into new section
  const handleStatusChange = async (task, newStatus) => {
    try {
      setUpdatingTaskId(task._id);
      setTaskError(null);

      const updated = await updateTask(task._id, { status: newStatus });

      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? { ...t, ...updated, status: updated.status || newStatus }
            : t
        )
      );
    } catch (err) {
      if (err.status !== 401) {
        setTaskError(err.message || "Failed to update task status.");
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Update task details (title, description, priority)
  const handleUpdateTask = async (task, changes) => {
    try {
      setUpdatingTaskId(task._id);
      setTaskError(null);

      const updated = await updateTask(task._id, changes);

      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, ...updated } : t))
      );
    } catch (err) {
      if (err.status !== 401) {
        setTaskError(err.message || "Failed to update task.");
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Create new task
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setTaskError(null);

      const newTask = await createTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        status: initialStatus,
      });

      const normalizedNewTask = {
        ...newTask,
        status: newTask.status || initialStatus,
      };

      setTasks((prev) => [normalizedNewTask, ...prev]);

      setTitle("");
      setDescription("");
      setPriority("medium");
      setInitialStatus("pending");
    } catch (err) {
      if (err.status !== 401) {
        setTaskError(err.message || "Failed to create task.");
      }
    } finally {
      setCreating(false);
    }
  };

  // Delete task
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    try {
      setUpdatingTaskId(id);
      setTaskError(null);

      await deleteTask(id);

      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      if (err.status !== 401) {
        setTaskError(err.message || "Failed to delete task.");
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="page-container tasks-page" id="tasks-page">
      <div className="tasks-header-area">
        <h1 className="page-title" id="tasks-title">
          Task Manager
        </h1>

        <p className="page-subtitle" id="tasks-subtitle">
          Signed in as <strong>{user?.name || user?.email}</strong> (
          <span className={`role-badge role-badge-${user?.role || "user"}`}>
            {(user?.role || "user").toUpperCase()}
          </span>
          ).
        </p>

        {/* Manager/Admin Scope Switcher */}
        {isElevated && (
          <div className="tasks-scope-toggle" id="tasks-scope-toggle">
            <button
              type="button"
              className={`scope-toggle-btn ${scope === "mine" ? "active" : ""}`}
              onClick={() => setScope("mine")}
            >
              My Tasks
            </button>
            <button
              type="button"
              className={`scope-toggle-btn ${scope === "team" ? "active" : ""}`}
              onClick={() => setScope("team")}
            >
              All Team Tasks
            </button>
          </div>
        )}

        <button
          type="button"
          className="eda-trigger"
          id="eda-trigger"
          onClick={() => setEdaOpen(true)}
        >
          <span className="eda-pulse" />
          Event Stream &amp; Async Jobs
          <span className="eda-trigger-count">{eventCount}</span>
        </button>
      </div>

      <EventPanel
        open={edaOpen}
        onClose={() => setEdaOpen(false)}
        onTaskEvent={handleTaskEvent}
        onCountChange={setEventCount}
      />

      {/* Task Counters Summary Bar */}
      <div className="task-counters-bar" id="task-counters">
        <div
          className={`counter-card ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setStatusFilter("all")}
        >
          <span className="counter-label">Total Tasks</span>
          <span className="counter-value">{tasks.length}</span>
        </div>

        <div
          className={`counter-card counter-pending ${
            statusFilter === "pending" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("pending")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setStatusFilter("pending")}
        >
          <span className="counter-label">Pending</span>
          <span className="counter-value">{pendingTasks.length}</span>
        </div>

        <div
          className={`counter-card counter-incomplete ${
            statusFilter === "incomplete" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("incomplete")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setStatusFilter("incomplete")}
        >
          <span className="counter-label">Incomplete</span>
          <span className="counter-value">{incompleteTasks.length}</span>
        </div>

        <div
          className={`counter-card counter-completed ${
            statusFilter === "completed" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("completed")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setStatusFilter("completed")}
        >
          <span className="counter-label">Completed</span>
          <span className="counter-value">{completedTasks.length}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="task-filter-tabs" id="task-filters">
        <button
          type="button"
          className={`filter-tab ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All Sections
        </button>
        <button
          type="button"
          className={`filter-tab ${statusFilter === "pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("pending")}
        >
          Pending ({pendingTasks.length})
        </button>
        <button
          type="button"
          className={`filter-tab ${
            statusFilter === "incomplete" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("incomplete")}
        >
          Incomplete ({incompleteTasks.length})
        </button>
        <button
          type="button"
          className={`filter-tab ${
            statusFilter === "completed" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("completed")}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      {/* Task Creation Form */}
      <section className="task-form-wrapper">
        <form onSubmit={handleCreate} className="task-form" id="create-task-form">
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            id="task-title-input"
          />

          <input
            type="text"
            placeholder="Task description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            id="task-desc-input"
          />

          <div className="task-form-selects">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="task-form-select"
              aria-label="Priority"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>

            <select
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value)}
              className="task-form-select"
              aria-label="Initial Status"
            >
              <option value="pending">Status: Pending</option>
              <option value="incomplete">Status: Incomplete</option>
              <option value="completed">Status: Completed</option>
            </select>
          </div>

          <button type="submit" disabled={creating} id="add-task-btn">
            {creating ? "Adding..." : "+ Add Task"}
          </button>
        </form>
      </section>

      {taskError && (
        <ErrorMessage
          title="Operation Issue"
          message={taskError}
          onRetry={loadTasks}
        />
      )}

      {taskLoading ? (
        <Spinner text="Loading tasks..." />
      ) : (
        /* Status Segregation: Three Distinct Sections */
        <div className="task-status-grid" id="task-status-grid">
          {(statusFilter === "all" || statusFilter === "pending") && (
            <TaskSection
              statusKey="pending"
              title="Pending"
              icon="⏳"
              tasks={pendingTasks}
              onStatusChange={handleStatusChange}
              onUpdate={handleUpdateTask}
              onDelete={handleDelete}
              updatingTaskId={updatingTaskId}
              canManage={true}
            />
          )}

          {(statusFilter === "all" || statusFilter === "incomplete") && (
            <TaskSection
              statusKey="incomplete"
              title="Incomplete"
              icon="🚧"
              tasks={incompleteTasks}
              onStatusChange={handleStatusChange}
              onUpdate={handleUpdateTask}
              onDelete={handleDelete}
              updatingTaskId={updatingTaskId}
              canManage={true}
            />
          )}

          {(statusFilter === "all" || statusFilter === "completed") && (
            <TaskSection
              statusKey="completed"
              title="Completed"
              icon="✅"
              tasks={completedTasks}
              onStatusChange={handleStatusChange}
              onUpdate={handleUpdateTask}
              onDelete={handleDelete}
              updatingTaskId={updatingTaskId}
              canManage={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default Tasks;
