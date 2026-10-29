import { useState } from "react";
import "./AiSuggestPanel.css";
import { getAiSuggestion } from "../api";

const formatDue = (iso, days) => {
  const date = new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date} (${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`})`;
};

/**
 * AI Task Insights (Practical 13)
 * Asks the backend for a suggestion and lets the user review it before applying.
 * Nothing is applied automatically: the human stays in control of the task.
 */
function AiSuggestPanel({ title, description, onApply }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canAsk = title.trim().length >= 3 && !loading;

  const handleAsk = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuggestion(await getAiSuggestion({ title: title.trim(), description: description.trim() }));
    } catch (err) {
      if (err.status !== 401) setError(err.message || "AI suggestion failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    // The description field is a single-line input, so steps are numbered inline
    const steps = suggestion.steps.map((s, i) => `${i + 1}) ${s}`).join(" ");
    onApply({
      description: `${suggestion.description} Steps: ${steps}`,
      priority: suggestion.priority,
    });
    setSuggestion(null);
  };

  const isAi = suggestion?.source === "gemini";

  return (
    <div className="ai-panel" id="ai-panel">
      <div className="ai-panel-bar">
        <button
          type="button"
          className="ai-ask-btn"
          id="ai-suggest-btn"
          onClick={handleAsk}
          disabled={!canAsk}
          title={title.trim().length < 3 ? "Type a task title first" : "Get AI suggestions"}
        >
          {loading ? "Thinking…" : "✨ AI Suggest"}
        </button>
        <span className="ai-panel-hint">
          Only the title and description are sent; personal data is redacted on the server.
        </span>
      </div>

      {error && <div className="ai-error">{error}</div>}

      {suggestion && (
        <div className={`ai-card ${isAi ? "ai-card-gemini" : "ai-card-fallback"}`} id="ai-card">
          <div className="ai-card-head">
            <strong>🤖 AI Task Insights</strong>
            <span className={`ai-source ${isAi ? "ai-source-gemini" : "ai-source-fallback"}`}>
              {isAi
                ? `Google Gemini · ${suggestion.model} · ${(suggestion.latencyMs / 1000).toFixed(1)}s${suggestion.cached ? " · cached" : ""}`
                : "Rule-based fallback"}
            </span>
          </div>

          {!isAi && (
            <div className="ai-fallback-note">
              AI unavailable ({suggestion.fallbackReason}). Showing a rule-based suggestion so you can keep working.
            </div>
          )}

          <div className="ai-grid">
            <div className="ai-field">
              <span className="ai-label">Recommended priority</span>
              <span className={`ai-priority ai-priority-${suggestion.priority}`}>{suggestion.priority}</span>
            </div>
            <div className="ai-field">
              <span className="ai-label">Proposed due date</span>
              <span className="ai-value">📅 {formatDue(suggestion.dueDate, suggestion.dueInDays)}</span>
            </div>
          </div>

          <div className="ai-field">
            <span className="ai-label">Generated description</span>
            <p className="ai-value">{suggestion.description}</p>
          </div>

          <div className="ai-field">
            <span className="ai-label">Proposed action steps</span>
            <ul className="ai-steps">
              {suggestion.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>

          {suggestion.reasoning && <p className="ai-reasoning">💡 Reasoning: {suggestion.reasoning}</p>}

          {suggestion.redacted?.length > 0 && (
            <p className="ai-redacted">
              🔒 Redacted before sending: {suggestion.redacted.join(", ")}
            </p>
          )}

          <p className="ai-disclaimer">⚠️ {suggestion.disclaimer}</p>

          <div className="ai-actions">
            <button type="button" className="ai-apply-btn" id="ai-apply-btn" onClick={handleApply}>
              Apply suggestions
            </button>
            <button type="button" className="ai-dismiss-btn" onClick={() => setSuggestion(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiSuggestPanel;
