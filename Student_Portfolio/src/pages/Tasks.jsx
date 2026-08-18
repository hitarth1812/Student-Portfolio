import { useState, useEffect } from "react";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Inline edit state for whichever task is currently being edited
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadTasks = async () => {
    try {
      setTaskLoading(true);
      setTaskError(null);

      const data = await getTasks();

      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setTaskError(err.message || "Failed to load tasks.");
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const persistTask = async (task, changes) => {
    try {
      setTaskLoading(true);
      setTaskError(null);

      const updatedTask = await updateTask(task._id, {
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority,
        ...changes,
      });

      setTasks((prev) =>
        prev.map((item) => (item._id === updatedTask._id ? updatedTask : item))
      );
    } catch (err) {
      setTaskError(err.message || "Failed to update task.");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      setTaskLoading(true);
      setTaskError(null);

      const newTask = await createTask({ title, description });

      setTasks((prev) => [...prev, newTask]);

      setTitle("");
      setDescription("");
    } catch (err) {
      setTaskError(err.message || "Failed to create task.");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleToggleComplete = (task) => {
    persistTask(task, { completed: !task.completed });
  };

  const startEditing = (task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleSaveEdit = async (task) => {
    await persistTask(task, {
      title: editTitle,
      description: editDescription,
    });
    cancelEditing();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    try {
      setTaskLoading(true);
      setTaskError(null);

      await deleteTask(id);

      setTasks((prev) => prev.filter((task) => task._id !== id));
    } catch (err) {
      setTaskError(err.message || "Failed to delete task.");
    } finally {
      setTaskLoading(false);
    }
  };

  return (
    <div className="page-container tasks-page" id="tasks-page">
      <h1 className="page-title" id="tasks-title">
        Task Manager
      </h1>

      <p className="page-subtitle" id="tasks-subtitle">
        Full-stack task management powered by React, Express, and MongoDB.
      </p>

      <section className="task-section">
        <form onSubmit={handleCreate} className="task-form">
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Task description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <button type="submit">Add Task</button>
        </form>

        {taskLoading && <Spinner text="Processing Tasks..." />}

        {!taskLoading && taskError && (
          <ErrorMessage message={taskError} onRetry={loadTasks} />
        )}

        {!taskLoading && !taskError && (
          <div className="task-list">
            {tasks.length === 0 ? (
              <p>No tasks found.</p>
            ) : (
              tasks.map((task) => {
                const isEditing = editingId === task._id;

                return (
                  <div
                    className={`task-card${task.completed ? " task-completed" : ""}`}
                    key={task._id}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          className="task-edit-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          required
                        />

                        <input
                          type="text"
                          className="task-edit-input"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />

                        <div className="task-card-actions">
                          <button type="button" onClick={() => handleSaveEdit(task)}>
                            Save
                          </button>

                          <button type="button" onClick={cancelEditing}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="task-checkbox-row">
                          <input
                            type="checkbox"
                            checked={!!task.completed}
                            onChange={() => handleToggleComplete(task)}
                          />
                          <h3>{task.title}</h3>
                        </label>

                        <p>{task.description}</p>

                        <div className="task-card-actions">
                          <button type="button" onClick={() => startEditing(task)}>
                            Update
                          </button>

                          <button type="button" onClick={() => handleDelete(task._id)}>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Tasks;
