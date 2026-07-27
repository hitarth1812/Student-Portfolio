import { useState } from "react";

// Format repository names nicely (e.g. "Crack-Detection" -> "Crack Detection")
const formatRepoName = (name) =>
  name.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

// Component to display search input and grid of repository cards
function RepoList({ data = [] }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Supplementary Feature: Filter repository list by name
  const filteredRepos = data.filter((repo) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase().trim()))
  );

  return (
    <div className="repo-list-container" id="repo-list-container">
      {/* Search Input Section */}
      <div className="search-container" style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          className="search-input"
          id="repo-search-input"
          placeholder="🔍 Search repositories by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.85rem 1.25rem",
            fontSize: "1rem",
            borderRadius: "10px",
            border: "1px solid var(--input-border)",
            backgroundColor: "var(--input-bg)",
            color: "var(--text-color)",
            outline: "none",
            boxShadow: "var(--card-shadow)"
          }}
        />
        {searchTerm && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Showing {filteredRepos.length} of {data.length} repositories
          </p>
        )}
      </div>

      {/* No results search fallback */}
      {filteredRepos.length === 0 ? (
        <div className="error-container" id="no-repos-found">
          <h3 className="error-title" style={{ color: "var(--text-color)" }}>No repositories found</h3>
          <p className="error-message">No repositories match "{searchTerm}". Try another search query.</p>
          <button
            className="retry-btn"
            onClick={() => setSearchTerm("")}
            type="button"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Repository Cards Grid */
        <div className="projects-grid" id="projects-list">
          {filteredRepos.map((repo) => (
            <div key={repo.id} className="project-card" id={`project-card-${repo.id}`}>
              <div>
                <div className="project-header-top">
                  <h2 className="project-name">{formatRepoName(repo.name)}</h2>
                  {/* Supplementary Feature: Display star count alongside repository name */}
                  <span
                    className="project-stars"
                    id={`project-stars-${repo.id}`}
                    title={`${repo.stargazers_count ?? 0} stars on GitHub`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      backgroundColor: "var(--badge-bg)",
                      color: "var(--badge-text)",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      fontWeight: "600"
                    }}
                  >
                    ⭐ {repo.stargazers_count ?? 0}
                  </span>
                </div>

                <div className="project-tech-container">
                  {repo.language && (
                    <span className="project-tech" id={`project-lang-${repo.id}`}>
                      {repo.language}
                    </span>
                  )}
                  {repo.topics?.map((topic, index) => (
                    <span key={topic} className="project-tech-secondary" id={`project-topic-${repo.id}-${index}`}>
                      {topic}
                    </span>
                  ))}
                </div>

                <p className="project-desc">
                  {repo.description || "No description provided for this repository."}
                </p>
              </div>

              <div className="project-card-footer" style={{ marginTop: "1rem" }}>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-btn"
                  id={`github-btn-${repo.id}`}
                >
                  🔗 View Repository on GitHub
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RepoList;
