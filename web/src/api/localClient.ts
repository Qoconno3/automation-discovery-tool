import type { ProcessIntake, ProcessSubmission } from "../types/domain";

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

export function submitProcess(intake: ProcessIntake): Promise<ProcessSubmission> {
  const submission: ProcessSubmission = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    intake,
  };

  const all = readAll();
  all.push(submission);
  writeAll(all);
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
