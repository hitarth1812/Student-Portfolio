import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/auth-context";
import { getUsers, updateUserRole, deleteUser } from "../api";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";

function UsersManagement() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchUsers() {
      try {
        const data = await getUsers();
        if (!isMounted) return;
        setUsers(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load users");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId);
      setError(null);
      setActionMessage(null);

      const updated = await updateUserRole(userId, newRole);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
      setActionMessage(`Role updated to ${newRole.toUpperCase()} successfully.`);
    } catch (err) {
      setError(err.message || "Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete user ${userEmail}? This will also remove their tasks.`)) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      setError(null);
      setActionMessage(null);

      await deleteUser(userId);

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setActionMessage(`User ${userEmail} deleted successfully.`);
    } catch (err) {
      setError(err.message || "Failed to delete user");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="page-container users-page" id="users-page">
      <div className="users-header">
        <div>
          <h1 className="page-title" id="users-title">
            {isAdmin ? "User & Role Management" : "Team Directory"}
          </h1>
          <p className="page-subtitle" id="users-subtitle">
            {isAdmin
              ? "Manage system users, assign roles (User, Manager, Admin), and enforce security."
              : "Overview of registered team members and their assigned roles."}
          </p>
        </div>
        <div className="users-summary-badge">
          <span>Total Users: <strong>{users.length}</strong></span>
        </div>
      </div>

      {actionMessage && (
        <div className="auth-notice success-notice" style={{ marginBottom: "1rem", borderColor: "#10b981", color: "#065f46", backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
          {actionMessage}
        </div>
      )}

      {error && <ErrorMessage title="User Operation Error" message={error} onRetry={loadUsers} />}

      {loading ? (
        <Spinner text="Loading users..." />
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: "center", padding: "2rem" }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id || u.id === currentUser?._id;
                  const isBusy = updatingUserId === u.id;

                  return (
                    <tr key={u.id} className={isCurrent ? "user-row-current" : ""}>
                      <td>
                        <strong>{u.name || "—"}</strong>
                        {isCurrent && <span className="you-pill">You</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {isAdmin ? (
                          <select
                            className={`user-role-select role-badge-${u.role}`}
                            value={u.role}
                            disabled={isBusy}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            aria-label={`Change role for ${u.email}`}
                          >
                            <option value="user">USER</option>
                            <option value="manager">MANAGER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`role-badge role-badge-${u.role}`}>
                            {u.role.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      {isAdmin && (
                        <td>
                          {isCurrent ? (
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              Active Account
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="user-delete-btn"
                              disabled={isBusy}
                              onClick={() => handleDeleteUser(u.id, u.email)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;
