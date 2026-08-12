import { useState } from "react";
import type { FormEvent } from "react";
import type { FollowupQuestion } from "../types/domain";

interface Props {
  partialAssessment?: string;
  questions: FollowupQuestion[];
  onSubmit: (answers: Record<string, string>) => Promise<void>;
}

export default function FollowupQuestions({ partialAssessment, questions, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="followup-card">
      <h2>A couple things before I can recommend anything</h2>
      {partialAssessment && <p className="partial-assessment">{partialAssessment}</p>}
      <form onSubmit={handleSubmit}>
        {questions.map((q) => (
          <label key={q.field}>
            {q.question}
            <span className="why">{q.why}</span>
            <textarea
              rows={2}
              required
              value={answers[q.field] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))}
            />
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Analyzing..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
