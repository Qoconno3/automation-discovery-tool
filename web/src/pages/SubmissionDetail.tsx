import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubmission, submitFollowup } from "../api/client";
import FollowupQuestions from "../components/FollowupQuestions";
import RecommendationCard from "../components/RecommendationCard";
import type { ProcessSubmission } from "../types/domain";

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

  async function handleFollowupSubmit(answers: Record<string, string>) {
    if (!id) return;
    const updated = await submitFollowup(id, answers);
    setSubmission(updated);
  }

  if (error) return <p className="error">{error}</p>;
  if (!submission) return <p>Loading...</p>;

  return (
    <div className="submission-detail">
      <Link to="/submissions" className="back-link">
        &larr; Back to history
      </Link>
      <h1>{submission.intake.title}</h1>

      {submission.conversation.length > 0 && (
        <details className="conversation-trail">
          <summary>Follow-up history ({submission.conversation.length} round(s))</summary>
          {submission.conversation.map((round) => (
            <div key={round.roundNumber} className="round">
              {round.questions.map((q) => (
                <div key={q.field} className="qa-pair">
                  <p className="question">{q.question}</p>
                  <p className="answer">{round.answers[q.field]}</p>
                </div>
              ))}
            </div>
          ))}
        </details>
      )}

      {submission.status === "awaiting_followup" && submission.pendingQuestions && (
        <FollowupQuestions
          questions={submission.pendingQuestions}
          onSubmit={handleFollowupSubmit}
        />
      )}

      {submission.status === "complete" && submission.recommendation && (
        <RecommendationCard recommendation={submission.recommendation} steps={submission.intake.steps} />
      )}
    </div>
  );
}
