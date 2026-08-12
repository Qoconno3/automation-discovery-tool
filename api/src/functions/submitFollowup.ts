import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getRecommendation } from "../lib/recommendationEngine";
import { getSubmissionById, upsertSubmission } from "../lib/tableStorageClient";

export async function submitFollowup(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const id = request.params.id;
  if (!id) {
    return { status: 400, jsonBody: { error: "Missing submission id" } };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
  }
  const answers = (body as { answers?: Record<string, string> })?.answers;
  if (!answers || typeof answers !== "object") {
    return { status: 400, jsonBody: { error: "Request body must include an 'answers' object" } };
  }

  let submission;
  try {
    submission = await getSubmissionById(id);
  } catch (err) {
    context.error("getSubmissionById failed", err);
    return { status: 500, jsonBody: { error: "Failed to fetch the submission" } };
  }
  if (!submission) {
    return { status: 404, jsonBody: { error: "Submission not found" } };
  }
  if (submission.status !== "awaiting_followup" || !submission.pendingQuestions) {
    return { status: 409, jsonBody: { error: "This submission has no pending follow-up questions" } };
  }

  submission.conversation.push({
    roundNumber: submission.conversation.length + 1,
    questions: submission.pendingQuestions,
    answers,
  });
  submission.pendingQuestions = null;

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

  return { status: 200, jsonBody: submission };
}

app.http("submitFollowup", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "submissions/{id}/followup",
  handler: submitFollowup,
});
