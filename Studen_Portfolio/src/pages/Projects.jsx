import { useState, useEffect } from "react";

// Projects page component showing dynamic cards fetched from GitHub API
function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    // Defer state updates to avoid synchronous setState inside useEffect
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("https://api.github.com/users/hitarth1812/repos");
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      // Filter out the profile readme and repos without description, sort by updated_at (most recent first)
      const filtered = data
        .filter((repo) => repo.name.toLowerCase() !== "hitarth1812" && repo.description)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
      setProjects(filtered);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.message || "Something went wrong while fetching projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, []);

  // Format repository names nicely (e.g. "Crack-Detection" -> "Crack Detection")
  const formatRepoName = (name) => {
    return name
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="page-container projects-page" id="projects-page">
      <h1 className="page-title" id="projects-title">My Projects</h1>
      <p className="page-subtitle">A collection of research projects and software applications fetched directly from my GitHub profile.</p>

      {loading && (
        <div className="projects-grid" id="projects-loading">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton-card" id={`skeleton-card-${n}`}>
              <div className="skeleton-pulse skeleton-title"></div>
              <div className="skeleton-pulse skeleton-tech"></div>
              <div className="skeleton-pulse skeleton-description"></div>
              <div className="skeleton-pulse skeleton-description-short"></div>
              <div className="skeleton-pulse skeleton-button"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="error-container" id="projects-error">
          <h2 className="error-title">Oops! Couldn't load projects</h2>
          <p className="error-message">{error}</p>
          <button 
            onClick={fetchProjects} 
            className="retry-btn" 
            id="retry-fetch-btn"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="error-container" id="projects-empty">
          <h2 className="error-title">No projects found</h2>
          <p className="error-message">Could not find any public repositories with descriptions.</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="projects-grid" id="projects-list">
          {projects.map((project) => (
            <div key={project.id} className="project-card" id={`project-card-${project.id}`}>
              <div>
                <div className="project-header-top">
                  <h2 className="project-name">{formatRepoName(project.name)}</h2>
                  {project.stargazers_count > 0 && (
                    <span className="project-stars" id={`project-stars-${project.id}`} title={`${project.stargazers_count} stars on GitHub`}>
                      ⭐ {project.stargazers_count}
                    </span>
                  )}
                </div>
                <div className="project-tech-container">
                  {project.language && (
                    <span className="project-tech" id={`project-lang-${project.id}`}>
                      {project.language}
                    </span>
                  )}
                  {project.topics && project.topics.map((topic, index) => (
                    <span key={topic} className="project-tech-secondary" id={`project-topic-${project.id}-${index}`}>
                      {topic}
                    </span>
                  ))}
                </div>
                <p className="project-desc">{project.description}</p>
              </div>

              <div className="project-card-footer">
                <a 
                  href={project.html_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="github-btn"
                  id={`github-btn-${project.id}`}
                >
                  View on GitHub
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
