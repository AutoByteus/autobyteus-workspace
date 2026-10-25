import {
  asFiniteNumber, asRecord, wholeRemainingPercent, toIsoTime, unknownUsageLimits, UNEXPECTED_ANSWER,
  type RuntimeUsageLimit, type UsageLimitsReading,
} from "./usage-limits-reading.js";

const WINDOW_NAMES: Readonly<Record<string, string>> = { "5h": "5-hour", weekly: "weekly" };

/** "Models within this group: Gemini Flash, Gemini Pro" → ["Gemini Flash", "Gemini Pro"]. */
const familiesIn = (description: unknown): string[] => {
  if (typeof description !== "string") return [];
  const listed = /models within this group:\s*(.+)$/i.exec(description.trim())?.[1];
  return listed ? listed.split(",").map((family) => family.trim().replace(/\.$/, "")).filter(Boolean) : [];
};

/**
 * `agy -p "/usage" --output-format json` → limits, one per bucket that is not disabled: "<group> · weekly" /
 * "<group> · 5-hour". Each applies to the models of the families its group description lists, or of the group's own
 * name ("Gemini 4 Argon"). Bucket descriptions and the tier text are dropped.
 */
export const parseAntigravityUsageLimits = (stdout: string): UsageLimitsReading => {
  let answer: unknown;
  try {
    answer = JSON.parse(stdout);
  } catch {
    return unknownUsageLimits(UNEXPECTED_ANSWER);
  }
  const groups = asRecord(asRecord(asRecord(answer)?.command)?.data)?.groups;
  if (!Array.isArray(groups)) return unknownUsageLimits(UNEXPECTED_ANSWER);
  const limits: RuntimeUsageLimit[] = [];
  for (const rawGroup of groups) {
    const group = asRecord(rawGroup);
    const groupName = typeof group?.name === "string" ? group.name.trim() : "";
    if (!group || !groupName || !Array.isArray(group.buckets)) continue;
    const families = [...familiesIn(group.description), groupName];
    for (const rawBucket of group.buckets) {
      const bucket = asRecord(rawBucket);
      if (!bucket || bucket.disabled === true) continue;
      const fraction = asFiniteNumber(bucket.remaining_fraction);
      const window = typeof bucket.window === "string" ? WINDOW_NAMES[bucket.window] ?? bucket.window : null;
      limits.push({
        name: window ? `${groupName} · ${window}` : groupName,
        remainingPercent: fraction === null ? null : wholeRemainingPercent(fraction * 100),
        resetsAt: toIsoTime(bucket.reset_time),
        exhausted: fraction !== null && fraction <= 0,
        appliesTo: { kind: "modelFamilies", families },
      });
    }
  }
  return limits.length ? Object.freeze({ state: "read", limits }) : unknownUsageLimits(UNEXPECTED_ANSWER);
};
