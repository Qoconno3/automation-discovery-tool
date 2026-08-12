import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { listSubmissions } from "../lib/tableStorageClient";

export async function getSubmissions(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const submissions = await listSubmissions();
    return { status: 200, jsonBody: submissions };
  } catch (err) {
    context.error("listSubmissions failed", err);
    return { status: 500, jsonBody: { error: "Failed to list submissions" } };
  }
}

app.http("getSubmissions", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "submissions",
  handler: getSubmissions,
});
