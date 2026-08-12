import { MAX_FOLLOWUP_ROUNDS } from "../lib/constants";
import { SAMPLE_SCENARIOS, getMockRecommendation } from "../lib/mockScenarios";
import type { ProcessIntake, ProcessSubmission, SampleScenario } from "../types/domain";

const STORAGE_KEY = "automation-discovery-tool:submissions";
const ARTIFICIAL_DELAY_MS = 500;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ARTIFICIAL_DELAY_MS));
}

function readAll(): ProcessSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(submissions: ProcessSubmission[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

function upsert(submission: ProcessSubmission): void {
  const all = readAll();
  const index = all.findIndex((s) => s.id === submission.id);
  if (index === -1) all.push(submission);
  else all[index] = submission;
  writeAll(all);
}

function applyRecommendation(submission: ProcessSubmission): void {
  const roundNumber = submission.conversation.length + 1;
  const result = getMockRecommendation(submission.intake, submission.conversation);

  if (result.status === "needs_info" && roundNumber > MAX_FOLLOWUP_ROUNDS) {
    throw new Error(
      `Recommendation client returned needs_info on round ${roundNumber}, exceeding the ${MAX_FOLLOWUP_ROUNDS}-round cap`
    );
  }

  if (result.status === "needs_info") {
    submission.status = "awaiting_followup";
    submission.pendingQuestions = result.questions;
  } else {
    submission.status = "complete";
    submission.recommendation = result.recommendation;
    submission.pendingQuestions = null;
  }
}

export function submitProcess(intake: ProcessIntake): Promise<ProcessSubmission> {
  const submission: ProcessSubmission = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "awaiting_followup",
    intake,
    conversation: [],
    recommendation: null,
    pendingQuestions: null,
  };

  applyRecommendation(submission);
  upsert(submission);
  return delay(submission);
}

export function submitFollowup(id: string, answers: Record<string, string>): Promise<ProcessSubmission> {
  const submission = readAll().find((s) => s.id === id);
  if (!submission) {
    return Promise.reject(new Error("Submission not found"));
  }
  if (submission.status !== "awaiting_followup" || !submission.pendingQuestions) {
    return Promise.reject(new Error("This submission has no pending follow-up questions"));
  }

  submission.conversation.push({
    roundNumber: submission.conversation.length + 1,
    questions: submission.pendingQuestions,
    answers,
  });
  submission.pendingQuestions = null;

  applyRecommendation(submission);
  upsert(submission);
  return delay(submission);
}

export function listSubmissions(): Promise<ProcessSubmission[]> {
  const all = [...readAll()].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return Promise.resolve(all);
}

export function getSubmission(id: string): Promise<ProcessSubmission> {
  const submission = readAll().find((s) => s.id === id);
  if (!submission) return Promise.reject(new Error("Submission not found"));
  return Promise.resolve(submission);
}

export function listSampleScenarios(): Promise<SampleScenario[]> {
  return Promise.resolve(SAMPLE_SCENARIOS.map((s) => ({ label: s.label, intake: s.intake })));
}
