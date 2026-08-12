import { getAzureOpenAIRecommendation } from "./azureOpenAIClient";
import { getMockRecommendation } from "./mockRecommendationClient";
import { MAX_FOLLOWUP_ROUNDS } from "./constants";
import { FollowupRound, LlmResponse, ProcessIntake } from "../types/domain";

function isMockEnabled(): boolean {
  return process.env.USE_MOCK_LLM === "true";
}

export async function getRecommendation(
  intake: ProcessIntake,
  conversation: FollowupRound[]
): Promise<LlmResponse> {
  const roundNumber = conversation.length + 1;

  const result = isMockEnabled()
    ? getMockRecommendation(intake, conversation)
    : await getAzureOpenAIRecommendation(intake, conversation);

  // Enforce the round cap server-side regardless of which client answered,
  // in case a real model call ignores the prompt's instructions.
  if (result.status === "needs_info" && roundNumber > MAX_FOLLOWUP_ROUNDS) {
    throw new Error(
      `Recommendation client returned needs_info on round ${roundNumber}, exceeding the ${MAX_FOLLOWUP_ROUNDS}-round cap`
    );
  }

  return result;
}
