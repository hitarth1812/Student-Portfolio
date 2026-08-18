import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

// Navbar component provides client-side navigation links and theme toggle integration
function Navbar({ theme, toggleTheme }) {
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
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
