// Number of follow-up rounds the model is allowed to ask for before it must
// commit to a final recommendation. Shared by the real and mock recommendation
// clients, and by the engine that enforces the cap.
export const MAX_FOLLOWUP_ROUNDS = 2;
