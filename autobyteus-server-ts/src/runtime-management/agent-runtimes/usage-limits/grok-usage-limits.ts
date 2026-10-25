import {
  asFiniteNumber, asRecord, wholeRemainingPercent, toIsoTime, unexpectedUsageAnswer,
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
  if (!config || !resetsAt) throw unexpectedUsageAnswer();
  const usedPercent = asFiniteNumber(config.creditUsagePercent ?? root?.creditUsagePercent);
  const remainingPercent = usedPercent === null ? null : wholeRemainingPercent(100 - usedPercent);
  return {
    state: "read",
    limits: [{
      name: "Billing period",
      remainingPercent,
      resetsAt,
      exhausted: usedPercent !== null && usedPercent >= 100,
      appliesTo: { kind: "runtime" },
    }],
    ...(usedPercent === null ? { note: "Grok does not report how much of the period is used." } : {}),
  };
};
