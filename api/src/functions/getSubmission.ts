import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getSubmissionById } from "../lib/tableStorageClient";

export async function getSubmission(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const id = request.params.id;
  if (!id) {
    return { status: 400, jsonBody: { error: "Missing submission id" } };
  }
  try {
    const submission = await getSubmissionById(id);
    if (!submission) {
      return { status: 404, jsonBody: { error: "Submission not found" } };
    }
    return { status: 200, jsonBody: submission };
  } catch (err) {
    context.error("getSubmissionById failed", err);
    return { status: 500, jsonBody: { error: "Failed to fetch submission" } };
  }
}

app.http("getSubmission", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "submissions/{id}",
  handler: getSubmission,
});
