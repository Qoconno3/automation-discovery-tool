import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { submitProcess } from "../api/client";
import ProcessFlowBuilder from "../components/ProcessFlowBuilder";
import { estimatedAnnualHours } from "../lib/constants";
import type {
  ChangeFrequency,
  DataSensitivity,
  Frequency,
  ProcessIntake,
  ProcessStep,
  Urgency,
  Variability,
} from "../types/domain";

const EMPTY_INTAKE: ProcessIntake = {
  requesterName: "",
  requesterEmail: "",
  businessUnit: "",
  title: "",
  description: "",
  currentTools: "",
  steps: [{ label: "" }],
  frequency: "weekly",
  volumePerOccurrence: "",
  timeSpentPerOccurrenceMinutes: 30,
  numberOfPeopleInvolved: 1,
  painPoints: "",
  variability: "some exceptions",
  dataSensitivity: "internal",
  dataSensitivityNotes: "",
  hasApiOrIntegrationAccess: "unknown",
  changeFrequency: "changes occasionally",
  urgency: "medium",
};

function cleanSteps(steps: ProcessStep[]): ProcessStep[] {
  return steps
    .map((step) => {
      const label = step.label.trim();
      let branches = step.branches;
      if (branches) {
        const cleaned = branches
          .map((b) => ({ label: b.label.trim(), steps: b.steps.map((s) => s.trim()).filter(Boolean) }))
          .filter((b) => b.label !== "" || b.steps.length > 0);
        branches = cleaned.length >= 2 ? cleaned : undefined;
      }
      return branches ? { label, branches } : { label };
    })
    .filter((step) => step.label !== "" || !!step.branches);
}

export default function IntakeForm() {
  const navigate = useNavigate();
  const [intake, setIntake] = useState<ProcessIntake>(EMPTY_INTAKE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const annualHours = useMemo(
    () =>
      estimatedAnnualHours(
        intake.frequency,
        intake.timeSpentPerOccurrenceMinutes,
        intake.numberOfPeopleInvolved
      ),
    [intake.frequency, intake.timeSpentPerOccurrenceMinutes, intake.numberOfPeopleInvolved]
  );

  function update<K extends keyof ProcessIntake>(field: K, value: ProcessIntake[K]) {
    setIntake((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanedSteps = cleanSteps(intake.steps);
    if (cleanedSteps.length === 0) {
      setError("Add at least one step to the process flow diagram.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitProcess({ ...intake, steps: cleanedSteps });
      navigate(`/submissions/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <h1>Describe a process</h1>
      <p className="subtitle">
        Tell us what the process does today. The more specific the steps and tools, the easier it is
        for us to prioritize and follow up with you.
      </p>

      <fieldset>
        <legend>Who's asking</legend>

        <label>
          Your name
          <input
            required
            value={intake.requesterName}
            onChange={(e) => update("requesterName", e.target.value)}
            placeholder="e.g. Jamie Rivera"
          />
        </label>

        <label>
          Your email
          <input
            type="email"
            required
            value={intake.requesterEmail}
            onChange={(e) => update("requesterEmail", e.target.value)}
            placeholder="e.g. jamie.rivera@example.com"
          />
        </label>

        <label>
          Business unit / team
          <input
            required
            value={intake.businessUnit}
            onChange={(e) => update("businessUnit", e.target.value)}
            placeholder="e.g. Accounts Payable"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>The process</legend>

        <label>
          Title
          <input
            required
            value={intake.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Weekly vendor invoice reconciliation"
          />
        </label>

        <label>
          Description
          <textarea
            required
            rows={3}
            value={intake.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="What does this process do, and why does it exist?"
          />
        </label>

        <label>
          Current tools
          <input
            required
            value={intake.currentTools}
            onChange={(e) => update("currentTools", e.target.value)}
            placeholder="e.g. Outlook, Excel, an internal SharePoint list"
          />
        </label>

        <div className="flow-field">
          <span className="flow-field-label">Step-by-step flow</span>
          <p className="flow-field-hint">
            Build the flow as a diagram — one box per step, in order. The bottleneck usually hides in here.
          </p>
          <ProcessFlowBuilder steps={intake.steps} onChange={(steps) => update("steps", steps)} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Volume &amp; time</legend>

        <label>
          Frequency
          <select value={intake.frequency} onChange={(e) => update("frequency", e.target.value as Frequency)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="ad-hoc">Ad-hoc</option>
          </select>
        </label>

        <label>
          Volume per occurrence
          <input
            required
            value={intake.volumePerOccurrence}
            onChange={(e) => update("volumePerOccurrence", e.target.value)}
            placeholder="e.g. 40 invoices, 12 emails"
          />
        </label>

        <label>
          Time spent per occurrence (minutes)
          <input
            type="number"
            min={1}
            required
            value={intake.timeSpentPerOccurrenceMinutes}
            onChange={(e) => update("timeSpentPerOccurrenceMinutes", Number(e.target.value))}
          />
        </label>

        <label>
          People involved
          <input
            type="number"
            min={1}
            required
            value={intake.numberOfPeopleInvolved}
            onChange={(e) => update("numberOfPeopleInvolved", Number(e.target.value))}
          />
        </label>

        <p className="derived-stat">
          Estimated annual time cost: <strong>{annualHours} hours/year</strong>
        </p>
      </fieldset>

      <fieldset>
        <legend>Pain points &amp; variability</legend>

        <label>
          What's painful about it today?
          <textarea
            required
            rows={3}
            value={intake.painPoints}
            onChange={(e) => update("painPoints", e.target.value)}
            placeholder="Errors, delays, burnout, whatever prompted you to log this"
          />
        </label>

        <label>
          How variable is it?
          <select
            value={intake.variability}
            onChange={(e) => update("variability", e.target.value as Variability)}
          >
            <option value="highly standardized">Highly standardized</option>
            <option value="some exceptions">Some exceptions</option>
            <option value="highly variable">Highly variable</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Data &amp; constraints</legend>

        <label>
          Data sensitivity
          <select
            value={intake.dataSensitivity}
            onChange={(e) => update("dataSensitivity", e.target.value as DataSensitivity)}
          >
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="confidential">Confidential</option>
            <option value="restricted">Restricted (PII / regulated)</option>
          </select>
        </label>

        <label>
          Data sensitivity notes (optional)
          <input
            value={intake.dataSensitivityNotes}
            onChange={(e) => update("dataSensitivityNotes", e.target.value)}
            placeholder="e.g. contains customer SSNs"
          />
        </label>

        <label>
          Does the current tool expose an API or integration?
          <select
            value={intake.hasApiOrIntegrationAccess}
            onChange={(e) =>
              update("hasApiOrIntegrationAccess", e.target.value as ProcessIntake["hasApiOrIntegrationAccess"])
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No, UI-only</option>
            <option value="unknown">Not sure</option>
          </select>
        </label>

        <label>
          How often does the process itself change?
          <select
            value={intake.changeFrequency}
            onChange={(e) => update("changeFrequency", e.target.value as ChangeFrequency)}
          >
            <option value="stable, rarely changes">Stable, rarely changes</option>
            <option value="changes occasionally">Changes occasionally</option>
            <option value="changes often">Changes often</option>
          </select>
        </label>

        <label>
          Urgency
          <select value={intake.urgency} onChange={(e) => update("urgency", e.target.value as Urgency)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </fieldset>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit to backlog"}
      </button>
    </form>
  );
}
