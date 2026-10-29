import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { AtomicRunPackageFileCommitWriter } from "../../frozen/server/run-history/store/atomic-run-package-file-commit-writer.js";
import { MessageLog, type MessageLogBaseName } from "../../frozen/server/run-history/store/message-log.js";
import {
  validateAgentOrgCommunicationMessages,
  validateStandaloneRootMessages,
  validateTeamCommunicationMessagesPayload,
  type CollaborationCommunicationMessage,
} from "../../frozen/released-run-package-shapes/released-message-logs-before-append-only.js";

/** One JSON message log found on disk, and the append-only log it becomes (same folder). */
export type JsonMessageLog = Readonly<{
  /** `agent` (a hub), `agent_team`, `agent_org`: a coordinating run's log; `task_agent`, `task_agent_team`: a task agent's own log. */
  kind: "agent" | "agent_team" | "agent_org" | "task_agent" | "task_agent_team";
  /** The run whose folder holds the log (its owner). */
  runId: string;
  dir: string;
  jsonPath: string;
  baseName: MessageLogBaseName;
}>;

export class UnreadableJsonMessageLogError extends Error {}

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** Step 1: the released strict reader of this log's JSON shape. */
const readJsonMessages = async (log: JsonMessageLog): Promise<readonly CollaborationCommunicationMessage[]> => {
  try {
    const value = JSON.parse(await fs.readFile(log.jsonPath, "utf8")) as unknown;
    switch (log.kind) {
      case "agent":
      case "task_agent": return validateStandaloneRootMessages(value, log.runId).messages;
      case "agent_team":
      case "task_agent_team": return validateTeamCommunicationMessagesPayload(value, log.runId).messages;
      case "agent_org": return validateAgentOrgCommunicationMessages(value, log.runId).messages;
    }
  } catch (error) {
    throw new UnreadableJsonMessageLogError(message(error));
  }
};

const syncDirectory = async (dir: string): Promise<void> => {
  const handle = await fs.open(dir, "r");
  try { await handle.sync(); }
  finally { await handle.close().catch(() => undefined); }
};

/**
 * Converts one JSON log (design Migration Plan, steps 1–5): read the JSON strictly; read the append-only
 * log of the same folder (it may exist from an earlier attempt, runtime appends or a reappeared JSON);
 * append the JSON messages whose id is absent, in file order; read the whole log back and require every
 * JSON message with equal values; then remove the JSON file. Every step is recognized from the files,
 * so a stop at any point is continued by the next start. Throws `UnreadableJsonMessageLogError` when the
 * JSON cannot be read (step 1); any other error is a failed attempt with the JSON kept.
 */
export const convertJsonMessageLog = async (
  log: JsonMessageLog,
  writer: AtomicRunPackageFileCommitWriter,
): Promise<void> => {
  const jsonMessages = await readJsonMessages(log);
  const target = new MessageLog(log.dir, log.baseName, { writer });
  const present = new Set((await target.read() ?? []).map((entry) => entry.messageId));
  await target.appendBatch(jsonMessages.filter((entry) => !present.has(entry.messageId)));
  const converted = new Map((await target.read() ?? []).map((entry) => [entry.messageId, entry]));
  for (const entry of jsonMessages) {
    const stored = converted.get(entry.messageId);
    if (!stored || !isDeepStrictEqual({ ...stored, referenceFiles: [...stored.referenceFiles] }, { ...entry, referenceFiles: [...entry.referenceFiles] })) {
      throw new Error(`Message '${entry.messageId}' does not read back equal from the converted log.`);
    }
  }
  await fs.rm(log.jsonPath);
  await syncDirectory(path.dirname(log.jsonPath));
};
