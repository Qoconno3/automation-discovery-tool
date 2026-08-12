import { AzureOpenAI } from "openai";
import { loadSystemPrompt } from "./promptLoader";
import { MAX_FOLLOWUP_ROUNDS } from "./constants";
import { FollowupRound, LlmResponse, ProcessIntake } from "../types/domain";

let cachedClient: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (cachedClient) return cachedClient;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME must be set"
    );
  }
  cachedClient = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });
  return cachedClient;
}

// Root-level anyOf union, per OpenAI structured outputs support for union types.
const RESPONSE_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        status: { type: "string", enum: ["needs_info"] },
        partialAssessment: { type: "string" },
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              question: { type: "string" },
              why: { type: "string" },
            },
            required: ["field", "question", "why"],
            additionalProperties: false,
          },
        },
      },
      required: ["status", "partialAssessment", "questions"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        status: { type: "string", enum: ["complete"] },
        recommendation: {
          type: "object",
          properties: {
            scope: { type: "string", enum: ["skip", "partial", "full"] },
            scopeRationale: { type: "string" },
            approach: { type: "string", enum: ["classic", "ai", "hybrid"] },
            approachRationale: { type: "string" },
            bottleneckStepIndex: { type: ["integer", "null"] },
            proposedFlow: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  kind: { type: "string", enum: ["automated", "manual"] },
                },
                required: ["label", "kind"],
                additionalProperties: false,
              },
            },
            recommendedTools: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tool: { type: "string" },
                  role: { type: "string" },
                  rationale: { type: "string" },
                },
                required: ["tool", "role", "rationale"],
                additionalProperties: false,
              },
            },
            modelGuidance: {
              type: "object",
              properties: {
                tierNeeded: {
                  type: "string",
                  enum: ["none", "small/cheap (e.g. gpt-4o-mini)", "frontier (e.g. gpt-4o)"],
                },
                reasoning: { type: "string" },
                estimatedTokenCostNotes: { type: "string" },
              },
              required: ["tierNeeded", "reasoning", "estimatedTokenCostNotes"],
              additionalProperties: false,
            },
            humanInTheLoopNeeded: { type: "boolean" },
            humanInTheLoopNotes: { type: "string" },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  mitigation: { type: "string" },
                },
                required: ["risk", "severity", "mitigation"],
                additionalProperties: false,
              },
            },
            estimatedBuildEffort: { type: "string", enum: ["hours", "days", "weeks"] },
            roiNotes: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            reasoning: { type: "string" },
          },
          required: [
            "scope",
            "scopeRationale",
            "approach",
            "approachRationale",
            "bottleneckStepIndex",
            "proposedFlow",
            "recommendedTools",
            "modelGuidance",
            "humanInTheLoopNeeded",
            "humanInTheLoopNotes",
            "risks",
            "estimatedBuildEffort",
            "roiNotes",
            "confidence",
            "reasoning",
          ],
          additionalProperties: false,
        },
      },
      required: ["status", "recommendation"],
      additionalProperties: false,
    },
  ],
} as const;

function buildUserMessage(intake: ProcessIntake, conversation: FollowupRound[], roundNumber: number): string {
  const parts = [
    `roundNumber: ${roundNumber} (max ${MAX_FOLLOWUP_ROUNDS + 1})`,
    "",
    "## Process intake",
    JSON.stringify(intake, null, 2),
  ];
  if (conversation.length > 0) {
    parts.push("", "## Prior follow-up rounds", JSON.stringify(conversation, null, 2));
  }
  return parts.join("\n");
}

export async function getAzureOpenAIRecommendation(
  intake: ProcessIntake,
  conversation: FollowupRound[]
): Promise<LlmResponse> {
  const roundNumber = conversation.length + 1;
  const client = getClient();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME as string;

  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: loadSystemPrompt() },
      { role: "user", content: buildUserMessage(intake, conversation, roundNumber) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "automation_recommendation_response",
        strict: true,
        schema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Azure OpenAI returned an empty response");
  }
  return JSON.parse(raw) as LlmResponse;
}
