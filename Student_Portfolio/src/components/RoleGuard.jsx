import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import Spinner from "./Spinner";

/**
 * Route / Component guard for Role-Based Access Control (RBAC).
 * Ensures that the authenticated user possesses one of the allowed roles.
 */
function RoleGuard({ allowedRoles = [], children }) {
  const { user, role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Spinner text="Checking permissions..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container auth-restricted">
        <h1 className="page-title">Authentication Required</h1>
        <p className="page-subtitle">Please log in to access this page.</p>
        <Link to="/login" className="nav-auth-btn" style={{ display: "inline-block", marginTop: "1rem" }}>
          Log In
        </Link>
      </div>
    );
  }

  const currentRole = role || user?.role || "user";

  if (!allowedRoles.includes(currentRole)) {
    return (
      <div className="page-container access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-badge">403 Forbidden</div>
          <h1 className="page-title">Access Restricted</h1>
          <p className="page-subtitle">
            You do not have permission to perform this action or view this page.
          </p>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Current role: <strong style={{ textTransform: "uppercase" }}>{currentRole}</strong>
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <Link to="/tasks" className="nav-auth-btn" style={{ textDecoration: "none", display: "inline-block" }}>
              Back to Tasks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default RoleGuard;
