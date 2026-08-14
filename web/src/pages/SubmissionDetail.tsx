import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubmission } from "../api/client";
import ProcessFlowDiagram from "../components/ProcessFlowDiagram";
import { estimatedAnnualHours } from "../lib/constants";
import type { ProcessSubmission } from "../types/domain";

const URGENCY_LABEL: Record<ProcessSubmission["intake"]["urgency"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const DATA_SENSITIVITY_LABEL: Record<ProcessSubmission["intake"]["dataSensitivity"], string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted (PII / regulated)",
};

const API_ACCESS_LABEL: Record<ProcessSubmission["intake"]["hasApiOrIntegrationAccess"], string> = {
  yes: "Yes",
  no: "No, UI-only",
  unknown: "Not sure",
};

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<ProcessSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSubmission(id)
      .then(setSubmission)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load submission"));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!submission) return <p>Loading...</p>;

  const { intake } = submission;
  const annualHours = estimatedAnnualHours(
    intake.frequency,
    intake.timeSpentPerOccurrenceMinutes,
    intake.numberOfPeopleInvolved
  );

  return (
    <div className="submission-detail">
      <Link to="/submissions" className="back-link">
        &larr; Back to backlog
      </Link>

      <div className="confirmation-banner">
        Added to the backlog — thanks! The PM team will review this and reach out to talk through
        next steps.
      </div>

      <h1>{intake.title}</h1>
      <p className="submission-meta">
        Submitted by <strong>{intake.requesterName}</strong> ({intake.requesterEmail}),{" "}
        {intake.businessUnit} &middot; {new Date(submission.submittedAt).toLocaleString()}
      </p>

      <section className="detail-section">
        <h3>The process</h3>
        <p>{intake.description}</p>
        <p className="muted">Current tools: {intake.currentTools}</p>
        <ProcessFlowDiagram steps={intake.steps} />
      </section>

      <section className="detail-section">
        <h3>Volume &amp; time</h3>
        <ul className="detail-list">
          <li>Frequency: {intake.frequency}</li>
          <li>Volume per occurrence: {intake.volumePerOccurrence}</li>
          <li>Time spent per occurrence: {intake.timeSpentPerOccurrenceMinutes} minutes</li>
          <li>People involved: {intake.numberOfPeopleInvolved}</li>
          <li>Estimated annual time cost: {annualHours} hours/year</li>
        </ul>
      </section>

      <section className="detail-section">
        <h3>Pain points &amp; variability</h3>
        <p>{intake.painPoints}</p>
        <p className="muted">Variability: {intake.variability}</p>
      </section>

      <section className="detail-section">
        <h3>Data &amp; constraints</h3>
        <ul className="detail-list">
          <li>Data sensitivity: {DATA_SENSITIVITY_LABEL[intake.dataSensitivity]}</li>
          {intake.dataSensitivityNotes && <li>Notes: {intake.dataSensitivityNotes}</li>}
          <li>API / integration access: {API_ACCESS_LABEL[intake.hasApiOrIntegrationAccess]}</li>
          <li>How often the process changes: {intake.changeFrequency}</li>
          <li>Urgency: {URGENCY_LABEL[intake.urgency]}</li>
        </ul>
      </section>
    </div>
  );
}
