import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSubmissions } from "../api/client";
import type { ProcessSubmission } from "../types/domain";

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<ProcessSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSubmissions()
      .then(setSubmissions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history"));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!submissions) return <p>Loading...</p>;

  return (
    <div className="submission-history">
      <div className="history-header">
        <h1>Automation backlog</h1>
        <Link to="/" className="new-link">
          + New process
        </Link>
      </div>

      {submissions.length === 0 && <p>No submissions yet. Log your first process to get started.</p>}

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Submitted</th>
            <th>Submitted by</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id}>
              <td>
                <Link to={`/submissions/${s.id}`}>{s.intake.title}</Link>
              </td>
              <td>{new Date(s.submittedAt).toLocaleDateString()}</td>
              <td>
                {s.intake.requesterName} &middot; {s.intake.businessUnit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
