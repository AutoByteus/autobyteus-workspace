import {
  asFiniteNumber, asRecord, clampPercent, toIsoTime, unknownUsageLimits, UNEXPECTED_ANSWER,
  type UsageLimitsReading,
} from "./usage-limits-reading.js";

/**
 * Grok ACP `_x.ai/billing` answer → one limit "Billing period" that resets at the period's end. Its remaining percent
 * is 100 − `creditUsagePercent` when Grok reports it, else null with a note saying so (UNK-001). Tier, caps and
 * balances are dropped.
 */
export const parseGrokUsageLimits = (answer: unknown): UsageLimitsReading => {
  const root = asRecord(answer);
  const config = asRecord(root?.config);
  const period = asRecord(config?.currentPeriod);
  const resetsAt = toIsoTime(period?.end ?? config?.billingPeriodEnd);
  if (!config || !resetsAt) return unknownUsageLimits(UNEXPECTED_ANSWER);
  const usedPercent = asFiniteNumber(config.creditUsagePercent ?? root?.creditUsagePercent);
  const remainingPercent = usedPercent === null ? null : clampPercent(100 - usedPercent);
  return {
    state: "read",
    limits: [{
      name: "Billing period",
      remainingPercent,
      resetsAt,
      exhausted: remainingPercent !== null && remainingPercent <= 0,
      appliesTo: { kind: "runtime" },
    }],
    ...(usedPercent === null ? { note: "Grok does not report how much of the period is used." } : {}),
  };
};
