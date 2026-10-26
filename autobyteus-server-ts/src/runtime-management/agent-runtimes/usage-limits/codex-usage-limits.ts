import {
  asFiniteNumber, asRecord, wholeRemainingPercent, toIsoTime, unexpectedUsageAnswer,
  type RuntimeUsageLimit, type UsageLimitsReading,
} from "./usage-limits-reading.js";

const WINDOW_KEYS = ["primary", "secondary"] as const;

/** "5-hour", "Weekly", else "<n>-minute". */
const windowName = (minutes: number | null): string =>
  minutes === 300 ? "5-hour" : minutes === 10_080 ? "Weekly" : minutes ? `${minutes}-minute` : "Usage";

/** Codex continues on paid credits when a window is used up (DEC-007). Credits themselves are not shown. */
const hasCredits = (credits: Record<string, unknown> | null): boolean =>
  credits?.hasCredits === true || credits?.unlimited === true;

/**
 * Codex app-server `account/rateLimits/read` → limits. Each window of each `rateLimitsByLimitId` entry is one limit;
 * a window is exhausted when it is used up (or the entry says a limit was reached, for its fullest window) and the
 * account has no credits; with credits, the reading's note says Codex runs on paid credits. Plan, credit amounts and
 * account fields are dropped.
 */
export const parseCodexUsageLimits = (answer: unknown): UsageLimitsReading => {
  const root = asRecord(answer);
  const byLimitId = asRecord(root?.rateLimitsByLimitId);
  const entries = byLimitId ? Object.values(byLimitId) : root?.rateLimits ? [root.rateLimits] : [];
  const limits: RuntimeUsageLimit[] = [];
  /** A window used up while credits let Codex run on (DEC-007): the limits read differently, so the reading says so. */
  let runningOnCredits: string | null = null;
  for (const raw of entries) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const windows = WINDOW_KEYS.map((key) => asRecord(entry[key])).filter((window) => window !== null);
    const used = windows.map((window) => asFiniteNumber(window.usedPercent));
    const fullest = Math.max(...used.map((value) => value ?? -1));
    const reached = entry.rateLimitReachedType != null;
    const credits = hasCredits(asRecord(entry.credits));
    const modelSlug = typeof entry.normalModelSlug === "string" && entry.normalModelSlug.trim() ? entry.normalModelSlug.trim() : null;
    const scopeLabel = modelSlug ? (typeof entry.limitName === "string" && entry.limitName.trim() ? entry.limitName.trim() : modelSlug) : null;
    windows.forEach((window, index) => {
      const usedPercent = used[index] ?? null;
      const usedUp = usedPercent !== null && (usedPercent >= 100 || (reached && usedPercent === fullest));
      const name = windowName(asFiniteNumber(window.windowDurationMins));
      if (usedUp && credits) runningOnCredits ??= scopeLabel ? `${name} · ${scopeLabel}` : name;
      limits.push({
        name: scopeLabel ? `${name} · ${scopeLabel}` : name,
        remainingPercent: usedPercent === null ? null : wholeRemainingPercent(100 - usedPercent),
        resetsAt: toIsoTime(window.resetsAt),
        exhausted: usedUp && !credits,
        appliesTo: modelSlug ? { kind: "models", modelIds: [modelSlug] } : { kind: "runtime" },
      });
    });
  }
  if (limits.length) {
    return runningOnCredits
      ? { state: "read", limits, note: `${runningOnCredits} limit used up; running on paid credits.` }
      : { state: "read", limits };
  }
  // Entries without any window: this account has no usage windows (e.g. an API-key provider).
  if (!entries.some((entry) => asRecord(entry))) throw unexpectedUsageAnswer();
  return Object.freeze({ state: "not_reported" });
};
