import ProcessFlowDiagram from "./ProcessFlowDiagram";
import ProposedFlowDiagram from "./ProposedFlowDiagram";
import type { AutomationRecommendation, ProcessStep } from "../types/domain";

const SCOPE_LABEL: Record<AutomationRecommendation["scope"], string> = {
  skip: "Don't automate",
  partial: "Automate one step",
  full: "Automate end-to-end",
};

const APPROACH_LABEL: Record<AutomationRecommendation["approach"], string> = {
  classic: "Classic automation",
  ai: "AI-based",
  hybrid: "Hybrid (classic + AI)",
};

interface Props {
  recommendation: AutomationRecommendation;
  steps: ProcessStep[];
}

export default function RecommendationCard({ recommendation, steps }: Props) {
  const r = recommendation;
  return (
    <div className="recommendation-card">
      <div className="badges">
        <span className={`badge scope-${r.scope}`}>{SCOPE_LABEL[r.scope]}</span>
        <span className={`badge approach-${r.approach}`}>{APPROACH_LABEL[r.approach]}</span>
        <span className={`badge confidence-${r.confidence}`}>{r.confidence} confidence</span>
        <span className="badge effort">{r.estimatedBuildEffort} to build</span>
      </div>

      <section>
        <h3>Current process</h3>
        <ProcessFlowDiagram steps={steps} />
        <p className="flow-legend">
          {r.scope === "full" && "Every step is a candidate for automation."}
          {r.scope === "skip" && "Not recommended for automation."}
          {r.scope === "partial" &&
            r.bottleneckStepIndex !== null &&
            `Automate step ${r.bottleneckStepIndex + 1} — the rest stays manual.`}
        </p>
      </section>

      <section>
        <h3>Proposed process</h3>
        <ProposedFlowDiagram proposedFlow={r.proposedFlow} />
        <p className="flow-legend">What the flow looks like after applying this recommendation.</p>
      </section>

      <section>
        <h3>Scope</h3>
        <p>{r.scopeRationale}</p>
      </section>

      <section>
        <h3>Approach</h3>
        <p>{r.approachRationale}</p>
      </section>

      {r.recommendedTools.length > 0 && (
        <section>
          <h3>Recommended tools</h3>
          <ul>
            {r.recommendedTools.map((t) => (
              <li key={t.tool}>
                <strong>{t.tool}</strong> — {t.role}. {t.rationale}
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.modelGuidance.tierNeeded !== "none" && (
        <section>
          <h3>Model guidance</h3>
          <p>
            <strong>{r.modelGuidance.tierNeeded}</strong> — {r.modelGuidance.reasoning}
          </p>
          <p className="muted">{r.modelGuidance.estimatedTokenCostNotes}</p>
        </section>
      )}

      <section>
        <h3>Human in the loop</h3>
        <p>
          {r.humanInTheLoopNeeded ? "Needed" : "Not needed"} — {r.humanInTheLoopNotes}
        </p>
      </section>

      {r.risks.length > 0 && (
        <section>
          <h3>Risks</h3>
          <ul>
            {r.risks.map((risk) => (
              <li key={risk.risk}>
                <span className={`severity severity-${risk.severity}`}>{risk.severity}</span>{" "}
                <strong>{risk.risk}</strong> — {risk.mitigation}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>ROI</h3>
        <p>{r.roiNotes}</p>
      </section>

      <section>
        <h3>Reasoning</h3>
        <p className="muted">{r.reasoning}</p>
      </section>
    </div>
  );
}
