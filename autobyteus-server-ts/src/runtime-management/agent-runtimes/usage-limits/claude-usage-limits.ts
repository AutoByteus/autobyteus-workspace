import {
  asFiniteNumber, asRecord, clampPercent, toIsoTime, unknownUsageLimits, UNEXPECTED_ANSWER,
  type RuntimeUsageLimit, type UsageLimitsReading,
} from "./usage-limits-reading.js";

const KIND_NAMES: Readonly<Record<string, string>> = { session: "5-hour", weekly_all: "Weekly", weekly_scoped: "Weekly" };

/** An unnamed kind keeps its own words: "weekly_opus" → "Weekly opus". */
const kindName = (kind: string): string =>
  KIND_NAMES[kind] ?? `${kind.charAt(0).toUpperCase()}${kind.slice(1).replace(/_/g, " ")}`;

/**
 * Claude Agent SDK `get_usage` answer → limits, from `rate_limits.limits[]`: session → "5-hour", weekly_all →
 * "Weekly", weekly_scoped → "Weekly · <model>" (applies to that model's display name). No plan rate limits (API key,
 * Bedrock, Vertex) → not reported. Subscription, spend, credits and session cost are dropped.
 */
export const parseClaudeUsageLimits = (answer: unknown): UsageLimitsReading => {
  const root = asRecord(answer);
  if (!root) return unknownUsageLimits(UNEXPECTED_ANSWER);
  const rateLimits = asRecord(root.rate_limits);
  if (root.rate_limits_available === false || (root.rate_limits_available === true && root.rate_limits === null)) {
    return Object.freeze({ state: "not_reported" });
  }
  if (!rateLimits || !Array.isArray(rateLimits.limits)) return unknownUsageLimits(UNEXPECTED_ANSWER);
  const limits: RuntimeUsageLimit[] = [];
  for (const raw of rateLimits.limits) {
    const entry = asRecord(raw);
    const kind = typeof entry?.kind === "string" ? entry.kind : null;
    if (!entry || !kind) continue;
    const percent = asFiniteNumber(entry.percent);
    const scopedModel = asRecord(asRecord(entry.scope)?.model)?.display_name;
    const model = typeof scopedModel === "string" && scopedModel.trim() ? scopedModel.trim() : null;
    limits.push({
      name: model ? `${kindName(kind)} · ${model}` : kindName(kind),
      remainingPercent: percent === null ? null : clampPercent(100 - percent),
      resetsAt: toIsoTime(entry.resets_at),
      exhausted: percent !== null && percent >= 100,
      appliesTo: model ? { kind: "modelFamilies", families: [model] } : { kind: "runtime" },
    });
  }
  return limits.length ? Object.freeze({ state: "read", limits }) : unknownUsageLimits(UNEXPECTED_ANSWER);
};
