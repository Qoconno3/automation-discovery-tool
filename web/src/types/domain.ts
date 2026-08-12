export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "ad-hoc";

export type Variability = "highly standardized" | "some exceptions" | "highly variable";

export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

export type ChangeFrequency = "stable, rarely changes" | "changes occasionally" | "changes often";

export type Urgency = "low" | "medium" | "high";

export interface ProcessIntake {
  title: string;
  description: string;
  currentTools: string;
  /** Ordered list of short step labels, in the order they happen. */
  steps: string[];
  frequency: Frequency;
  volumePerOccurrence: string;
  timeSpentPerOccurrenceMinutes: number;
  numberOfPeopleInvolved: number;
  painPoints: string;
  variability: Variability;
  dataSensitivity: DataSensitivity;
  dataSensitivityNotes?: string;
  hasApiOrIntegrationAccess: "yes" | "no" | "unknown";
  changeFrequency: ChangeFrequency;
  urgency: Urgency;
}

export interface FollowupQuestion {
  field: string;
  question: string;
  why: string;
}

export interface FollowupRound {
  roundNumber: number;
  questions: FollowupQuestion[];
  answers: Record<string, string>;
}

export interface RecommendedTool {
  tool: string;
  role: string;
  rationale: string;
}

export interface ModelGuidance {
  tierNeeded: "none" | "small/cheap (e.g. gpt-4o-mini)" | "frontier (e.g. gpt-4o)";
  reasoning: string;
  estimatedTokenCostNotes: string;
}

export interface Risk {
  risk: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
}

export interface ProposedFlowStep {
  label: string;
  /** "automated" = no human effort required at this step in the new flow; "manual" = a human still does this. */
  kind: "automated" | "manual";
}

export interface AutomationRecommendation {
  scope: "skip" | "partial" | "full";
  scopeRationale: string;
  approach: "classic" | "ai" | "hybrid";
  approachRationale: string;
  /** 0-based index into the submitted intake.steps array; null unless scope is "partial". */
  bottleneckStepIndex: number | null;
  /** The process flow as it looks after applying this recommendation — a new sequence, not just the original steps relabeled. */
  proposedFlow: ProposedFlowStep[];
  recommendedTools: RecommendedTool[];
  modelGuidance: ModelGuidance;
  humanInTheLoopNeeded: boolean;
  humanInTheLoopNotes: string;
  risks: Risk[];
  estimatedBuildEffort: "hours" | "days" | "weeks";
  roiNotes: string;
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

export type SubmissionStatus = "awaiting_followup" | "complete";

export interface ProcessSubmission {
  id: string;
  submittedAt: string;
  status: SubmissionStatus;
  intake: ProcessIntake;
  conversation: FollowupRound[];
  recommendation: AutomationRecommendation | null;
  pendingQuestions: FollowupQuestion[] | null;
}
