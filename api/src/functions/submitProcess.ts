import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID } from "node:crypto";
import { getRecommendation } from "../lib/recommendationEngine";
import { upsertSubmission } from "../lib/tableStorageClient";
import { ProcessIntake, ProcessSubmission } from "../types/domain";

const REQUIRED_SCALAR_FIELDS: (keyof ProcessIntake)[] = [
  "title",
  "description",
  "currentTools",
  "frequency",
  "volumePerOccurrence",
  "timeSpentPerOccurrenceMinutes",
  "numberOfPeopleInvolved",
  "painPoints",
  "variability",
  "dataSensitivity",
  "hasApiOrIntegrationAccess",
  "changeFrequency",
  "urgency",
];

function isValidBranch(b: unknown): boolean {
  if (typeof b !== "object" || b === null) return false;
  const branch = b as { label?: unknown; steps?: unknown };
  if (typeof branch.label !== "string" || !branch.label.trim()) return false;
  if (!Array.isArray(branch.steps)) return false;
  return branch.steps.every((s) => typeof s === "string" && s.trim().length > 0);
}

function isValidStep(s: unknown): boolean {
  if (typeof s !== "object" || s === null) return false;
  const step = s as { label?: unknown; branches?: unknown };
  if (typeof step.label !== "string" || !step.label.trim()) return false;
  if (step.branches === undefined) return true;
  return Array.isArray(step.branches) && step.branches.length >= 2 && step.branches.every(isValidBranch);
}

function isValidSteps(steps: unknown): boolean {
  return Array.isArray(steps) && steps.length > 0 && steps.every(isValidStep);
}

function validateIntake(body: unknown): { intake: ProcessIntake } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object" };
  }
  const record = body as Record<string, unknown>;
  const missing = REQUIRED_SCALAR_FIELDS.filter((field) => {
    const value = record[field];
    return value === undefined || value === null || value === "";
  });
  if (!isValidSteps(record.steps)) {
    missing.push("steps");
  }
  if (missing.length > 0) {
    return { error: `Missing required fields: ${missing.join(", ")}` };
  }
  return { intake: body as ProcessIntake };
}

export async function submitProcess(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
  }

  const validated = validateIntake(body);
  if ("error" in validated) {
    return { status: 400, jsonBody: { error: validated.error } };
  }

  const submission: ProcessSubmission = {
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "awaiting_followup",
    intake: validated.intake,
    conversation: [],
    recommendation: null,
    pendingQuestions: null,
  };

  try {
    const result = await getRecommendation(submission.intake, submission.conversation);
    if (result.status === "needs_info") {
      submission.status = "awaiting_followup";
      submission.pendingQuestions = result.questions;
    } else {
      submission.status = "complete";
      submission.recommendation = result.recommendation;
    }
  } catch (err) {
    context.error("getRecommendation failed", err);
    return { status: 502, jsonBody: { error: "Failed to generate a recommendation" } };
  }

  try {
    await upsertSubmission(submission);
  } catch (err) {
    context.error("upsertSubmission failed", err);
    return { status: 500, jsonBody: { error: "Failed to save the submission" } };
  }

  return { status: 201, jsonBody: submission };
}

app.http("submitProcess", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "submitProcess",
  handler: submitProcess,
});
