export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "ad-hoc";

export type Variability = "highly standardized" | "some exceptions" | "highly variable";

export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

export type ChangeFrequency = "stable, rarely changes" | "changes occasionally" | "changes often";

export type Urgency = "low" | "medium" | "high";

export interface ProcessBranch {
  /** e.g. "Approved", "Rejected" */
  label: string;
  steps: string[];
}

export interface ProcessStep {
  label: string;
  /** Present (length >= 2) means this step is a decision point that fans out into named branches, which implicitly rejoin the main flow at the next step. */
  branches?: ProcessBranch[];
}

export interface ProcessIntake {
  requesterName: string;
  requesterEmail: string;
  businessUnit: string;
  title: string;
  description: string;
  currentTools: string;
  /** Ordered main flow; any step may branch into named sub-paths that rejoin afterward. */
  steps: ProcessStep[];
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

export interface ProcessSubmission {
  id: string;
  submittedAt: string;
  intake: ProcessIntake;
}
