import React from "react";

// Component to render user-friendly error messages with optional retry functionality
function ErrorMessage({ message, onRetry, title = "Oops! Couldn't load projects" }) {
  return (
    <div className="error-container" id="projects-error-container">
      <div className="error-icon" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
        ⚠️
      </div>
      <h2 className="error-title" id="error-title">{title}</h2>
      <p className="error-message" id="error-message-text">
        {message || "An unexpected error occurred while fetching repositories."}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="retry-btn" 
          id="retry-fetch-btn"
          type="button"
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
