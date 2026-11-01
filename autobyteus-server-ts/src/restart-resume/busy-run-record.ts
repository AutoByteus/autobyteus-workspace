import fs from "node:fs/promises";
import path from "node:path";
import type { CollaborationRunPlace } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import {
  createRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { atomicWriteJsonFile } from "../run-history/store/atomic-json-file-writer.js";

/**
 * The busy-run record (autobyteus-285): the runs that were mid-turn when the node last shut down gracefully,
 * kept in `<appDataDir>/restart-resume/busy-runs.json` until the next start consumes it. Transient: absence means
 * "nothing to resume". The recorder is its only writer (it never deletes); the resumer is its only reader and deleter.
 */
export type BusyRunEntry = Readonly<{
  root: RootExecutionIdentity;
  agentRunId: string;
  place: CollaborationRunPlace;
  status: "initializing" | "running";
  recordedAt: string;
  /** The release that recorded this entry; `null` when that server had no release stamp. */
  version: string | null;
}>;

export type BusyRunRecord = Readonly<{ entries: readonly BusyRunEntry[] }>;

export type BusyRunRecordReadResult =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid"; reason: string }>
  | Readonly<{ kind: "present"; record: BusyRunRecord }>;

export const busyRunRecordPath = (appDataDir: string): string => path.join(appDataDir, "restart-resume", "busy-runs.json");

const PLACES: readonly string[] = ["host", "member", "delegated"];
const STATUSES: readonly string[] = ["initializing", "running"];
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const parseEntry = (value: unknown, index: number): BusyRunEntry => {
  const fail = (what: string): never => { throw new Error(`entry ${index}: ${what}`); };
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("not an object");
  const raw = value as Record<string, unknown>;
  const rootRaw = raw.root as Record<string, unknown> | undefined;
  if (!rootRaw || typeof rootRaw !== "object") fail("no root");
  let root: RootExecutionIdentity;
  try { root = createRootExecutionIdentity({ rootSubjectKind: rootRaw!.rootSubjectKind as never, rootRunId: rootRaw!.rootRunId as string }); }
  catch (error) { return fail(`invalid root (${String(error)})`); }
  if (!nonEmpty(raw.agentRunId)) fail("no agentRunId");
  if (!PLACES.includes(raw.place as string)) fail("invalid place");
  if (!STATUSES.includes(raw.status as string)) fail("invalid status");
  if (!nonEmpty(raw.recordedAt) || Number.isNaN(Date.parse(raw.recordedAt as string))) fail("invalid recordedAt");
  if (raw.version !== null && !nonEmpty(raw.version)) fail("invalid version");
  return Object.freeze({
    root,
    agentRunId: (raw.agentRunId as string).trim(),
    place: raw.place as CollaborationRunPlace,
    status: raw.status as BusyRunEntry["status"],
    recordedAt: raw.recordedAt as string,
    version: raw.version === null ? null : (raw.version as string).trim(),
  });
};

/** Reads the record. A file that is not a valid record as a whole is `invalid`; nothing in it is used. */
export const readBusyRunRecord = async (filePath: string): Promise<BusyRunRecordReadResult> => {
  let text: string;
  try { text = await fs.readFile(filePath, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { kind: "missing" };
    return { kind: "invalid", reason: `unreadable: ${String(error)}` };
  }
  try {
    const parsed = JSON.parse(text) as { entries?: unknown };
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) throw new Error("no entries list");
    return { kind: "present", record: Object.freeze({ entries: Object.freeze(parsed.entries.map(parseEntry)) }) };
  } catch (error) {
    return { kind: "invalid", reason: error instanceof Error ? error.message : String(error) };
  }
};

export const writeBusyRunRecord = (filePath: string, record: BusyRunRecord): Promise<void> =>
  atomicWriteJsonFile(filePath, { entries: record.entries });

export const removeBusyRunRecord = (filePath: string): Promise<void> => fs.rm(filePath, { force: true });
