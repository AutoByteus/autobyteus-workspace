import fs from "node:fs/promises";
import path from "node:path";
import type { CollaborationRunPlace } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import {
  createRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { atomicWriteJsonFile } from "../run-history/store/atomic-json-file-writer.js";
import { RESTART_CAUSES, type RestartCause } from "./restart-cause.js";
import type { RestartReminderFacts } from "./restart-notice.js";

/**
 * A restart reminder still to deliver (autobyteus-448): the run, and the facts its text is built from. Kept in
 * `<appDataDir>/restart-resume/restart-reminders.json` by `RestartReminderService`, its only owner, until delivered.
 */
export type PendingRestartReminder = RestartReminderFacts & Readonly<{
  root: RootExecutionIdentity;
  agentRunId: string;
  place: CollaborationRunPlace;
}>;

export const restartReminderRecordPath = (appDataDir: string): string =>
  path.join(appDataDir, "restart-resume", "restart-reminders.json");

export type RestartReminderRecordReadResult =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid"; reason: string }>
  | Readonly<{ kind: "present"; reminders: readonly PendingRestartReminder[] }>;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const parseReminder = (value: unknown, index: number): PendingRestartReminder => {
  const fail = (what: string): never => { throw new Error(`reminder ${index}: ${what}`); };
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("not an object");
  const raw = value as Record<string, unknown>;
  const rootRaw = raw.root as Record<string, unknown> | undefined;
  if (!rootRaw || typeof rootRaw !== "object") fail("no root");
  let root: RootExecutionIdentity;
  try { root = createRootExecutionIdentity({ rootSubjectKind: rootRaw!.rootSubjectKind as never, rootRunId: rootRaw!.rootRunId as string }); }
  catch (error) { return fail(`invalid root (${String(error)})`); }
  if (!nonEmpty(raw.agentRunId)) fail("no agentRunId");
  if (raw.place !== "host" && raw.place !== "member") fail("invalid place");
  if (!RESTART_CAUSES.includes(raw.cause as RestartCause)) fail("invalid cause");
  if (raw.version !== null && !nonEmpty(raw.version)) fail("invalid version");
  if (!nonEmpty(raw.restartedAt) || Number.isNaN(Date.parse(raw.restartedAt as string))) fail("invalid restartedAt");
  if (typeof raw.interruptedTurn !== "boolean") fail("invalid interruptedTurn");
  return Object.freeze({
    root,
    agentRunId: (raw.agentRunId as string).trim(),
    place: raw.place as CollaborationRunPlace,
    cause: raw.cause as RestartCause,
    version: raw.version as string | null,
    restartedAt: raw.restartedAt as string,
    interruptedTurn: raw.interruptedTurn as boolean,
  });
};

export const readRestartReminderRecord = async (filePath: string): Promise<RestartReminderRecordReadResult> => {
  let text: string;
  try { text = await fs.readFile(filePath, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { kind: "missing" };
    return { kind: "invalid", reason: `unreadable: ${String(error)}` };
  }
  try {
    const parsed = JSON.parse(text) as { reminders?: unknown };
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.reminders)) throw new Error("no reminders list");
    return { kind: "present", reminders: Object.freeze(parsed.reminders.map(parseReminder)) };
  } catch (error) {
    return { kind: "invalid", reason: error instanceof Error ? error.message : String(error) };
  }
};

/** Writes the pending reminders; removes the file when there are none. */
export const writeRestartReminderRecord = (filePath: string, reminders: readonly PendingRestartReminder[]): Promise<void> =>
  reminders.length ? atomicWriteJsonFile(filePath, { reminders }) : fs.rm(filePath, { force: true });
