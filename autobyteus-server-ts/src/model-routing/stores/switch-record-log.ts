import path from "node:path";
import { SealedJsonlLog } from "../../utils/sealed-jsonl-log.js";
import type { SwitchLaunch, SwitchRecord } from "../domain/runtime-switch-types.js";

const OUTCOMES: readonly string[] = ["switched", "no_fallback", "switch_failed"];
const CHOSEN_BY: readonly (string | null)[] = ["model_router", "agent_history", null];

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const nullableText = (value: unknown): value is string | null => value === null || typeof value === "string";
const isLaunch = (value: unknown): value is SwitchLaunch => {
  const launch = value as Record<string, unknown> | null;
  return !!launch && typeof launch === "object" && isText(launch.runtimeKind) && isText(launch.llmModelIdentifier);
};

/** One line as a record, or the reason it is not one. */
const parseRecord = (value: unknown): SwitchRecord | string => {
  const record = value as Record<string, unknown> | null;
  if (!record || typeof record !== "object") return "not an object";
  if (!isText(record.at) || !Number.isFinite(Date.parse(record.at))) return "at is not a time";
  if (!isText(record.agentRunId) || !isText(record.agentDefinitionId)) return "agentRunId and agentDefinitionId must be text";
  if (!isLaunch(record.from)) return "from is not a launch";
  if (record.to !== null && !isLaunch(record.to)) return "to is not a launch or null";
  if (!CHOSEN_BY.includes(record.chosenBy as string | null)) return "chosenBy is unknown";
  if (!nullableText(record.reason) || !nullableText(record.routerFailure)) return "reason and routerFailure must be text or null";
  if (!OUTCOMES.includes(record.outcome as string)) return "outcome is unknown";
  return Object.freeze({ at: record.at, agentRunId: record.agentRunId, agentDefinitionId: record.agentDefinitionId,
    from: Object.freeze({ runtimeKind: record.from.runtimeKind, llmModelIdentifier: record.from.llmModelIdentifier }),
    to: record.to ? Object.freeze({ runtimeKind: (record.to as SwitchLaunch).runtimeKind, llmModelIdentifier: (record.to as SwitchLaunch).llmModelIdentifier }) : null,
    chosenBy: record.chosenBy as SwitchRecord["chosenBy"], reason: record.reason as string | null,
    routerFailure: record.routerFailure as string | null, outcome: record.outcome as SwitchRecord["outcome"] });
};

const atOf = (value: unknown): number | null => {
  const at = Date.parse(String((value as { at?: unknown } | null)?.at ?? ""));
  return Number.isFinite(at) ? at : null;
};

/** How long switch records are kept (R-14, DEC-008: 90 days, the default until the founder decides). */
export const SWITCH_RECORD_RETENTION_DAYS = 90;

/**
 * The switch records (autobyteus-646 C-2): one line per handled usage-limit event, beside the routing decisions in
 * `<appData>/model-routing/` (`switches_active.jsonl`, sealed at 4 MB). An unreadable line is skipped with a warning
 * (DESIGN rule 7).
 */
export class SwitchRecordLog {
  private readonly log: SealedJsonlLog;

  constructor(options: Readonly<{ dir: string; rotationLimitBytes?: number; now?: () => Date }>) {
    this.log = new SealedJsonlLog({ dir: options.dir, baseName: "switches", retention: { days: SWITCH_RECORD_RETENTION_DAYS, timeOf: atOf }, ...(options.now ? { now: options.now } : {}),
      ...(options.rotationLimitBytes ? { rotationLimitBytes: options.rotationLimitBytes } : {}) });
  }

  /** Deletes the sealed files past the retention (R-14); run once at startup. */
  removeExpired(now?: Date): Promise<readonly string[]> {
    return this.log.removeSealedOlderThan(undefined, now);
  }

  record(record: SwitchRecord): Promise<void> {
    return this.log.append([record]);
  }

  /** One agent definition's records since `since`, most recent first (the router request's earlier switches). */
  async recentOf(agentDefinitionId: string, since: Date): Promise<readonly SwitchRecord[]> {
    const records: SwitchRecord[] = [];
    for (const name of [...await this.log.fileNames()].reverse()) {
      let newest = 0;
      (await this.log.completeLines(name)).forEach((line, index) => {
        let parsed: SwitchRecord | string;
        try { parsed = parseRecord(JSON.parse(line)); } catch { parsed = "not valid JSON"; }
        if (typeof parsed === "string") { console.warn(`Model Routing: switch log ${name} line ${index + 1} is skipped (${parsed}).`); return; }
        newest = Math.max(newest, Date.parse(parsed.at));
        if (parsed.agentDefinitionId === agentDefinitionId && Date.parse(parsed.at) >= since.getTime()) records.push(parsed);
      });
      if (newest && newest < since.getTime()) break;
    }
    return Object.freeze(records.sort((left, right) => right.at.localeCompare(left.at)));
  }
}

export const switchRecordLogDir = (appDataDir: string): string => path.join(appDataDir, "model-routing");
