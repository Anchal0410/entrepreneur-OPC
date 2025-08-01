import { useState, useEffect } from "react";

const ExecutionResults = ({ result, onPollStatus }) => {
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (result && result.status === "RUNNING" && result.runId) {
      setIsPolling(true);
      const pollInterval = setInterval(async () => {
        try {
          await onPollStatus(result.runId);
        } catch (error) {
          console.error("Polling error:", error);
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      }, 3000);

      return () => {
        clearInterval(pollInterval);
        setIsPolling(false);
      };
    }
  }, [result, onPollStatus]);

  useEffect(() => {
    if (
      result &&
      ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(result.status)
    ) {
      setIsPolling(false);
    }
  }, [result]);

  if (!result) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case "SUCCEEDED":
        return "✅";
      case "FAILED":
        return "❌";
      case "RUNNING":
        return "⏳";
      case "ABORTED":
        return "🛑";
      case "TIMED-OUT":
        return "⏰";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SUCCEEDED":
        return "#22c55e";
      case "FAILED":
        return "#ef4444";
      case "RUNNING":
        return "#f59e0b";
      case "ABORTED":
        return "#6b7280";
      case "TIMED-OUT":
        return "#f97316";
      default:
        return "#6b7280";
    }
  };

  const formatDuration = (startedAt, finishedAt) => {
    if (!startedAt) return "N/A";

    const start = new Date(startedAt);
    const end = finishedAt ? new Date(finishedAt) : new Date();
    const duration = Math.round((end - start) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600)
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor(
      (duration % 3600) / 60
    )}m`;
  };

  return (
    <div className="execution-results">
      <div className="section-header">
        <h3>🎯 Execution Results</h3>
      </div>

      <div className="result-status">
        <div
          className="status-badge"
          style={{ backgroundColor: getStatusColor(result.status) }}
        >
          {getStatusIcon(result.status)} {result.status}
          {isPolling && <span className="polling-indicator">🔄</span>}
        </div>

        <div className="status-details">
          <div className="detail-item">
            <strong>Run ID:</strong>
            <code>{result.runId}</code>
          </div>

          <div className="detail-item">
            <strong>Duration:</strong>
            {formatDuration(result.startedAt, result.finishedAt)}
          </div>

          {result.stats && (
            <div className="detail-item">
              <strong>Compute Units:</strong>
              {result.stats.computeUnits?.toFixed(4) || "N/A"}
            </div>
          )}
        </div>
      </div>

      {result.message && (
        <div className="result-message">
          <p>{result.message}</p>
        </div>
      )}

      {result.warning && (
        <div className="result-warning">
          <p>⚠️ {result.warning}</p>
        </div>
      )}

      {result.results && result.results.length > 0 && (
        <div className="results-data">
          <h4>📊 Output Data ({result.results.length} items)</h4>
          <div className="results-container">
            <pre className="results-json">
              {JSON.stringify(result.results, null, 2)}
            </pre>
          </div>

          <div className="results-actions">
            <button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(result.results, null, 2)],
                  { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `apify-results-${result.runId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="download-btn"
            >
              💾 Download JSON
            </button>
          </div>
        </div>
      )}

      {result.status === "RUNNING" && (
        <div className="running-info">
          <p>
            🔄 Actor is still running. Results will appear automatically when
            complete.
          </p>
        </div>
      )}

      {result.status === "FAILED" && (
        <div className="error-info">
          <p>❌ Execution failed.</p>
          {result.errorDetails && (
            <details className="error-details">
              <summary>View Error Details</summary>
              <pre className="error-log">{result.errorDetails}</pre>
            </details>
          )}
          {result.exitCode && (
            <p>
              <strong>Exit Code:</strong> {result.exitCode}
            </p>
          )}
          <p>
            💡 <strong>Common solutions:</strong>
          </p>
          <ul>
            <li>Try a different URL (some sites block scrapers)</li>
            <li>
              Use a simpler URL like <code>https://example.com</code>
            </li>
            <li>Check if the website requires special handling</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExecutionResults;
