import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/auth-context";

// Navbar component provides client-side navigation links, auth controls and theme toggle
function Navbar({ theme, toggleTheme }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Logging out simply discards the JWT - the token itself stays valid until it
  // expires, which is why a short expiry matters.
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" id="nav-logo">
          Hitarth's Portfolio
        </Link>
        <div className="navbar-links" id="nav-links">
          <Link to="/" className="nav-link" id="nav-link-home">Home</Link>
          <Link to="/projects" className="nav-link" id="nav-link-projects">Projects</Link>
          <Link to="/tasks" className="nav-link" id="nav-link-tasks">Tasks</Link>
          <Link to="/contact" className="nav-link" id="nav-link-contact">Contact</Link>

          {isAuthenticated ? (
            <>
              <span className="nav-user" id="nav-user-email" title={user?.email}>
                {user?.name || user?.email}
              </span>
              <button
                type="button"
                className="nav-auth-btn"
                id="nav-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link" id="nav-link-login">Login</Link>
          )}

          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
