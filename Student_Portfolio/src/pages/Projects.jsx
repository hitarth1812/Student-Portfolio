import { useState, useEffect, useCallback } from "react";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import RepoList from "../components/RepoList";

function Projects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetch("https://api.github.com/users/hitarth1812/repos")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `HTTP ${res.status} ${res.statusText}: Failed to fetch repositories`
          );
        }

        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const sortedData = Array.isArray(data)
          ? data.sort(
              (a, b) =>
                new Date(b.updated_at) - new Date(a.updated_at)
            )
          : [];

        setRepos(sortedData);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err.message ||
            "Network error occurred while fetching repositories."
        );
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <div
      className="page-container projects-page"
      id="projects-page"
    >
      <h1
        className="page-title"
        id="projects-title"
      >
        My Projects
      </h1>

      <p
        className="page-subtitle"
        id="projects-subtitle"
      >
        A collection of research projects and software applications
        fetched dynamically from the GitHub REST API.
      </p>

      {loading && (
        <Spinner text="Loading GitHub Repositories..." />
      )}

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
