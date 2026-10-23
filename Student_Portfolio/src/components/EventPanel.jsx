import { useState, useEffect, useRef, useCallback } from "react";
import "./EventPanel.css";
import {
  openEventStream,
  getEventHistory,
  getEventStats,
  enqueueJob,
  getJobs,
  downloadJobExport,
} from "../api";

const JOB_TYPES = [
  { type: "export_csv", label: "Export Tasks CSV", hint: "Writes your tasks to a downloadable file" },
  { type: "task_report", label: "Generate Report", hint: "Aggregates tasks by status and priority" },
  { type: "simulate_failure", label: "Simulate Failure", hint: "Always fails: retries with backoff, then DLQ" },
];

const MAX_EVENTS = 100;

const topicGroup = (topic) => topic.split(":")[0];

const describe = (event) => {
  const p = event.payload || {};
  if (p.message) return p.message;
  if (p.title) return p.from ? `${p.title}: ${p.from} → ${p.to}` : p.title;
  if (p.jobId) return `Job: ${p.jobId}${p.error ? ` — ${p.error}` : ""}`;
  if (p.topic) return `Audit row written for ${p.topic}`;
  if (p.email) return p.email;
  return JSON.stringify(p);
};

const formatTime = (iso) => new Date(iso).toLocaleTimeString();

function EventPanel({ open, onClose, onTaskEvent, onCountChange }) {
  const [tab, setTab] = useState("stream");
  const [events, setEvents] = useState([]);
  const [streamStatus, setStreamStatus] = useState("connecting");
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState(null);

  const onTaskEventRef = useRef(onTaskEvent);
  useEffect(() => {
    onTaskEventRef.current = onTaskEvent;
  }, [onTaskEvent]);

  const refreshJobs = useCallback(async () => {
    try {
      setJobs(await getJobs());
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await getEventStats());
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
  }, []);

  // Live stream: seed with recent history, then append pushed events.
  // Reconnects with a fresh ticket if the connection drops.
  useEffect(() => {
    let closeStream = null;
    let retryTimer = null;
    let cancelled = false;
    let syncTimer = null;

    // Jobs and telemetry are re-read (debounced) whenever the stream reports activity
    const scheduleSync = () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        refreshJobs();
        refreshStats();
      }, 250);
    };

    const connect = async () => {
      try {
        setStreamStatus("connecting");
        closeStream = await openEventStream({
          onStatus: (status) => {
            if (cancelled) return;
            setStreamStatus(status);
            if (status === "disconnected") {
              retryTimer = setTimeout(connect, 3000);
            }
          },
          onEvent: (event) => {
            if (cancelled) return;
            setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
            scheduleSync();
            if (event.topic.startsWith("task:") && onTaskEventRef.current) {
              onTaskEventRef.current(event);
            }
          },
        });
      } catch {
        if (!cancelled) {
          setStreamStatus("disconnected");
          retryTimer = setTimeout(connect, 3000);
        }
      }
    };

    getEventHistory(30)
      .then((history) => !cancelled && setEvents(history))
      .catch(() => {});
    scheduleSync();
    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearTimeout(syncTimer);
      if (closeStream) closeStream();
    };
  }, [refreshJobs, refreshStats]);

  useEffect(() => {
    if (onCountChange) onCountChange(events.length);
  }, [events.length, onCountChange]);

  const handleEnqueue = async (type) => {
    try {
      setError(null);
      const response = await enqueueJob(type);
      setBanner(`HTTP 202 Accepted: ${type} enqueued asynchronously (${response.data.id})`);
      refreshJobs();
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
  };

  const handleDownload = async (job) => {
    try {
      const blob = await downloadJobExport(job.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tasks-export-${job.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!open) return null;

  return (
    <div className="eda-overlay" onClick={onClose}>
      <aside
        className="eda-drawer"
        id="eda-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Event-driven architecture panel"
      >
        <header className="eda-header">
          <div className="eda-header-top">
            <h2>Event-Driven Architecture</h2>
            <button type="button" className="eda-close" onClick={onClose}>
              ✕ Close
            </button>
          </div>
          <div className="eda-header-sub">
            <span>Pub/Sub event bus · Async jobs · Real-time SSE</span>
            <span className={`eda-stream-status eda-stream-${streamStatus}`}>
              Stream: {streamStatus}
            </span>
          </div>
        </header>

        <nav className="eda-tabs">
          <button
            type="button"
            className={tab === "stream" ? "active" : ""}
            onClick={() => setTab("stream")}
          >
            Live Stream ({events.length})
          </button>
          <button
            type="button"
            className={tab === "jobs" ? "active" : ""}
            onClick={() => setTab("jobs")}
          >
            Async Jobs (HTTP 202)
          </button>
          <button
            type="button"
            className={tab === "telemetry" ? "active" : ""}
            onClick={() => setTab("telemetry")}
          >
            Telemetry &amp; Stats
          </button>
        </nav>

        {banner && <div className="eda-banner">✓ {banner}</div>}
        {error && <div className="eda-banner eda-banner-error">{error}</div>}

        <div className="eda-body">
          {tab === "stream" && (
            <section>
              <h3 className="eda-section-title">Real-time server-sent events</h3>
              {events.length === 0 ? (
                <div className="eda-empty">
                  <strong>Waiting for events...</strong>
                  <p>Create, update, complete or delete a task, or start a job, to see domain events arrive live.</p>
                </div>
              ) : (
                <ul className="eda-event-list">
                  {events.map((event) => (
                    <li key={event.id} className={`eda-event eda-group-${topicGroup(event.topic)}`}>
                      <div className="eda-event-top">
                        <span className="eda-topic">{event.topic}</span>
                        <span className="eda-time">{formatTime(event.timestamp)}</span>
                      </div>
                      <p className="eda-event-desc">{describe(event)}</p>
                      <div className="eda-event-meta">
                        <span>ID: {event.id}</span>
                        <span>Actor: {event.actor}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "jobs" && (
            <section>
              <h3 className="eda-section-title">Enqueue a background job</h3>
              <div className="eda-job-buttons">
                {JOB_TYPES.map((job) => (
                  <button
                    key={job.type}
                    type="button"
                    className={`eda-job-btn eda-job-${job.type}`}
                    onClick={() => handleEnqueue(job.type)}
                  >
                    <strong>{job.label}</strong>
                    <span>{job.hint}</span>
                  </button>
                ))}
              </div>

              <h3 className="eda-section-title">Jobs ({jobs.length})</h3>
              {jobs.length === 0 ? (
                <div className="eda-empty">
                  <p>No jobs yet. Each request above returns 202 immediately; the work runs in background workers.</p>
                </div>
              ) : (
                <ul className="eda-job-list">
                  {jobs.map((job) => (
                    <li key={job.id} className={`eda-job eda-job-status-${job.status}`}>
                      <div className="eda-event-top">
                        <span className="eda-topic">{job.type}</span>
                        <span className={`eda-job-status`}>{job.status}</span>
                      </div>
                      <div className="eda-progress">
                        <div style={{ width: `${job.progress}%` }} />
                      </div>
                      <div className="eda-event-meta">
                        <span>{job.id}</span>
                        <span>
                          Attempts {job.attempts}/{job.maxAttempts}
                          {job.durationMs !== null && ` · ${job.durationMs} ms`}
                        </span>
                      </div>
                      {job.error && <p className="eda-job-error">{job.error}</p>}
                      {job.type === "task_report" && job.result && (
                        <p className="eda-job-result">
                          {job.result.total} tasks · completion {job.result.completionRate} ·{" "}
                          {Object.entries(job.result.byStatus)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </p>
                      )}
                      {job.type === "export_csv" && job.status === "completed" && (
                        <button type="button" className="eda-download" onClick={() => handleDownload(job)}>
                          ⬇ Download CSV ({job.result.rows} rows)
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "telemetry" && stats && (
            <section>
              <div className="eda-stat-grid">
                <div className="eda-stat">
                  <span>Total emitted</span>
                  <strong>{stats.telemetry.totalEmitted}</strong>
                </div>
                <div className="eda-stat eda-stat-yellow">
                  <span>Avg handler time</span>
                  <strong>{stats.telemetry.avgHandlerMs} ms</strong>
                </div>
                <div className="eda-stat eda-stat-blue">
                  <span>Notifications</span>
                  <strong>{stats.notificationsSent}</strong>
                </div>
                <div className="eda-stat eda-stat-red">
                  <span>DLQ count</span>
                  <strong>{stats.queue.dlqCount}</strong>
                </div>
              </div>

              <div className="eda-queue-line">
                Workers {stats.queue.activeWorkers}/{stats.queue.concurrency} busy · queued {stats.queue.queued} ·
                completed {stats.queue.completed} · failed {stats.queue.failed} · subscriber errors{" "}
                {stats.telemetry.subscriberErrors} · live SSE clients {stats.telemetry.liveConnections}
              </div>

              <h3 className="eda-section-title">Subscriber topic bindings</h3>
              <div className="eda-bindings">
                {stats.bindings.map((binding) => (
                  <div key={binding.topic} className="eda-binding" title={binding.subscribers.join(", ")}>
                    <span className="eda-binding-topic">{binding.topic}</span>
                    <span className="eda-binding-count">
                      {binding.listeners} {binding.listeners === 1 ? "listener" : "listeners"}
                    </span>
                    <span className="eda-binding-subs">{binding.subscribers.join(", ") || "—"}</span>
                  </div>
                ))}
              </div>

              {stats.recentNotifications.length > 0 && (
                <>
                  <h3 className="eda-section-title">Recent notifications</h3>
                  <ul className="eda-notifications">
                    {stats.recentNotifications.map((n) => (
                      <li key={`${n.sourceEvent}-${n.sentAt}`}>
                        <span className="eda-topic">{n.channel}</span> {n.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <h3 className="eda-section-title">How it works</h3>
              <ul className="eda-notes">
                <li><strong>Non-blocking ingestion:</strong> controllers publish an event and respond; subscribers run on a later tick.</li>
                <li><strong>Decoupled subscribers:</strong> audit log, notifications and metrics only know topics, never the controllers.</li>
                <li><strong>Fault isolation:</strong> a failing subscriber is caught and counted; failing jobs retry with backoff and land in the DLQ.</li>
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

export default EventPanel;
