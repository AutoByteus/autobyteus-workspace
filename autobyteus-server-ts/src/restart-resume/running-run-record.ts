import fs from "node:fs/promises";
import path from "node:path";
import {
  createRootExecutionIdentity,
  rootExecutionIdentityKey,
  type RootExecutionIdentity,
} from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { atomicWriteJsonFile } from "../run-history/store/atomic-json-file-writer.js";

/**
 * The running-run record (autobyteus-638 C-1): the runs a person started whose entry agent is running (an Agent run's
 * agent, a Team run's coordinator), kept in `<appDataDir>/restart-resume/running-runs.json` so that the next start
 * brings them back idle. `RunningRunRecorder` is its only writer; `RunningRunRestorer` reads it once at startup, without
 * removing it. Transient: absence means "nothing to bring back". Only root identities are stored: the entry agent comes
 * from the root itself, and nothing reads a time, a status or a version.
 */
export type RunningRunRecord = Readonly<{ runs: readonly RootExecutionIdentity[] }>;

export type RunningRunRecordReadResult =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid"; reason: string }>
  | Readonly<{ kind: "present"; record: RunningRunRecord }>;

export const runningRunRecordPath = (appDataDir: string): string => path.join(appDataDir, "restart-resume", "running-runs.json");

/** The kinds a person starts that a restart brings back (never `agent_org`, DEC-004). */
const RECORDED_KINDS: readonly string[] = ["agent", "agent_team"];

/** One entry per root, sorted by kind then ID, so that equal sets compare equal. */
export const sortedRunningRuns = (runs: Iterable<RootExecutionIdentity>): readonly RootExecutionIdentity[] => {
  const byKey = new Map<string, RootExecutionIdentity>();
  for (const run of runs) byKey.set(rootExecutionIdentityKey(run), createRootExecutionIdentity(run));
  return Object.freeze([...byKey.values()].sort((left, right) =>
    left.rootSubjectKind.localeCompare(right.rootSubjectKind) || left.rootRunId.localeCompare(right.rootRunId)));
};

const parseRun = (value: unknown, index: number): RootExecutionIdentity => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`run ${index}: not an object`);
  const raw = value as Record<string, unknown>;
  if (!RECORDED_KINDS.includes(raw.rootSubjectKind as string)) throw new Error(`run ${index}: invalid rootSubjectKind`);
  try { return createRootExecutionIdentity({ rootSubjectKind: raw.rootSubjectKind as "agent" | "agent_team", rootRunId: raw.rootRunId as string }); }
  catch (error) { throw new Error(`run ${index}: invalid root (${error instanceof Error ? error.message : String(error)})`); }
};

/** Reads the record. A file that is not a valid record as a whole is `invalid`; nothing in it is used. */
export const readRunningRunRecord = async (filePath: string): Promise<RunningRunRecordReadResult> => {
  let text: string;
  try { text = await fs.readFile(filePath, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { kind: "missing" };
    return { kind: "invalid", reason: `unreadable: ${String(error)}` };
  }
  try {
    const parsed = JSON.parse(text) as { runs?: unknown };
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.runs)) throw new Error("no runs list");
    return { kind: "present", record: Object.freeze({ runs: sortedRunningRuns(parsed.runs.map(parseRun)) }) };
  } catch (error) {
    return { kind: "invalid", reason: error instanceof Error ? error.message : String(error) };
  }
};

/** Writes the record atomically (sorted, one entry per root). */
export const writeRunningRunRecord = (filePath: string, record: RunningRunRecord): Promise<void> =>
  atomicWriteJsonFile(filePath, { runs: sortedRunningRuns(record.runs) });

export const removeRunningRunRecord = (filePath: string): Promise<void> => fs.rm(filePath, { force: true });
