import type { Frequency } from "../types/domain";

export const FREQUENCY_PER_YEAR: Record<Frequency, number> = {
  daily: 250,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  "ad-hoc": 12,
};

export function estimatedAnnualHours(
  frequency: Frequency,
  timeSpentPerOccurrenceMinutes: number,
  numberOfPeopleInvolved: number
): number {
  const hours =
    (FREQUENCY_PER_YEAR[frequency] * timeSpentPerOccurrenceMinutes * numberOfPeopleInvolved) / 60;
  return Math.round(hours * 10) / 10;
}
