import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SAMPLE_SCENARIOS } from "../lib/mockRecommendationClient";

export async function getSampleScenarios(
  _request: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const scenarios = SAMPLE_SCENARIOS.map((s) => ({ label: s.label, intake: s.intake }));
  return { status: 200, jsonBody: scenarios };
}

app.http("getSampleScenarios", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sampleScenarios",
  handler: getSampleScenarios,
});
