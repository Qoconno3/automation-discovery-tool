import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedPrompt: string | null = null;

export function loadSystemPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  const path = join(__dirname, "..", "..", "..", "prompts", "systemPrompt.md");
  cachedPrompt = readFileSync(path, "utf-8");
  return cachedPrompt;
}
