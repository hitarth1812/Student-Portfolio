import { useState, useEffect, useCallback } from "react";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import RepoList from "../components/RepoList";

function Projects() {
  // Step 1: Set up state variables for data, loading, and error
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch GitHub repositories
  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);

    // Step 2: Fetch repository data from GitHub REST API
    fetch("https://api.github.com/users/hitarth1812/repos")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}: Failed to fetch repositories`);
        }
        return res.json();
      })
      .then((data) => {
        // Filter out non-repository profile README if desired and sort by updated date
        const sortedData = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          : [];
        setRepos(sortedData);
      })
      .catch((err) => {
        setError(err.message || "Network error occurred while fetching repositories.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Trigger API fetch on component mount
  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return (
    <div className="page-container projects-page" id="projects-page">
      <h1 className="page-title" id="projects-title">My Projects</h1>
      <p className="page-subtitle" id="projects-subtitle">
        A collection of research projects and software applications fetched dynamically from the GitHub REST API.
      </p>

      {/* Step 3: Conditionally render components based on state */}
      {loading && <Spinner text="Loading GitHub Repositories..." />}
      
      {!loading && error && (
        <ErrorMessage 
          message={error} 
          onRetry={fetchRepos} 
        />
      )}
      
      {!loading && !error && (
        <RepoList data={repos} />
      )}
    </div>
  );
}

export default Projects;
