import { Link } from "react-router-dom";

// NotFound component serves as the custom 404 fallback page
function NotFound() {
  return (
    <div className="not-found-container" id="not-found-page">
      <div className="not-found-card">
        <h1 className="not-found-title" id="not-found-status">404</h1>
        <h2 className="not-found-subtitle" id="not-found-message">Page Not Found</h2>
        <p className="not-found-text">The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="home-btn" id="go-home-btn">
          Go Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
