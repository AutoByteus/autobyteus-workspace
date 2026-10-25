/**
 * Which of a runtime's models one limit covers.
 * - `runtime`: every model of the runtime.
 * - `models`: these model identifiers (Codex names the model by its id).
 * - `modelFamilies`: models whose display name belongs to one of these families (Claude names its scoped limit by
 *   the model's display name, Antigravity its groups by model families). The limits are read in parallel with the
 *   model list, so the service resolves families against the models it read (`available-agent-runtimes/usage-limit-model-matching.ts`).
 */
export type UsageLimitScope =
  | Readonly<{ kind: "runtime" }>
  | Readonly<{ kind: "models"; modelIds: readonly string[] }>
  | Readonly<{ kind: "modelFamilies"; families: readonly string[] }>;

/** One of a runtime's own usage limits, as its parser reads it. */
export type RuntimeUsageLimit = Readonly<{
  /** What it covers and its window: "Weekly", "5-hour", "Claude and GPT models · weekly", "Billing period". */
  name: string;
  /** Null when the runtime does not report it for this limit. */
  remainingPercent: number | null;
  /** ISO-8601; null when not reported. */
  resetsAt: string | null;
  /** The covered models cannot run now under this limit (by the runtime's own rules, e.g. Codex credits, DEC-007). */
  exhausted: boolean;
  appliesTo: UsageLimitScope;
}>;

/**
 * A runtime's limits: read, or not reported by this runtime or account. A read that fails throws (SR-007): the
 * available-agent-runtimes service alone words failures. `note`: one short sentence from the strategy, only when a
 * runtime-specific fact changes how to read its limits (SR-004); never plans, account data or vendor texts.
 */
export type UsageLimitsReading =
  | Readonly<{ state: "read"; limits: readonly RuntimeUsageLimit[]; note?: string }>
  | Readonly<{ state: "not_reported" }>;

/** An answer a parser cannot use. `reason`: short and classified, never vendor text (it is shown after "could not be read: "). */
export class UsageLimitsUnreadableError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "UsageLimitsUnreadableError";
  }
}

/** The parsers' one reason for an answer they do not recognise. */
export const unexpectedUsageAnswer = (): UsageLimitsUnreadableError =>
  new UsageLimitsUnreadableError("the answer was not in the expected form");

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** A finite number, or a numeric string; null otherwise. */
export const asFiniteNumber = (value: unknown): number | null => {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
};

/** An ISO-8601 time from an ISO text or epoch seconds; null when absent or not a time. */
export const toIsoTime = (value: unknown): string | null => {
  const time = typeof value === "number" ? value * 1000 : typeof value === "string" && value.trim() ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

/**
 * A remaining percentage as a whole number rounded down (99.68 → 99), kept within 0–100: it never shows 1 % when less
 * is left. The tiny epsilon only absorbs float noise (100 × 0.29 = 28.999…96). Exhaustion is decided on the raw value.
 */
export const wholeRemainingPercent = (value: number): number => Math.min(100, Math.max(0, Math.floor(value + 1e-9)));
