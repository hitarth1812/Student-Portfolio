import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import Spinner from "./Spinner";

/**
 * Route guard: renders its children only for a logged-in user.
 * While the stored token is still being validated it shows a spinner, so a
 * refresh on a protected page does not flash the login screen.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner text="Checking your session..." />;
  }

  if (!isAuthenticated) {
    // Remember where the user was headed so login can send them back
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default ProtectedRoute;
