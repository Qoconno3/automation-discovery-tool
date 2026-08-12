import type { ProcessIntake, ProcessSubmission } from "../types/domain";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function submitProcess(intake: ProcessIntake): Promise<ProcessSubmission> {
  return fetch("/api/submitProcess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(intake),
  }).then((res) => handle<ProcessSubmission>(res));
}

export function submitFollowup(
  id: string,
  answers: Record<string, string>
): Promise<ProcessSubmission> {
  return fetch(`/api/submissions/${id}/followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  }).then((res) => handle<ProcessSubmission>(res));
}

export function listSubmissions(): Promise<ProcessSubmission[]> {
  return fetch("/api/submissions").then((res) => handle<ProcessSubmission[]>(res));
}

export function getSubmission(id: string): Promise<ProcessSubmission> {
  return fetch(`/api/submissions/${id}`).then((res) => handle<ProcessSubmission>(res));
}

export interface SampleScenario {
  label: string;
  intake: ProcessIntake;
}

export function listSampleScenarios(): Promise<SampleScenario[]> {
  return fetch("/api/sampleScenarios").then((res) => handle<SampleScenario[]>(res));
}
