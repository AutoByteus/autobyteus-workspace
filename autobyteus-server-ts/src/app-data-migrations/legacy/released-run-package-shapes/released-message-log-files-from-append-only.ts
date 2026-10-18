// Message logs as written from `20261018_append_only_message_logs_v1` on: per log, sealed files
// `<base>_<6 digits>.jsonl` and the active file `<base>_active.jsonl` in the run's folder, one message
// per `\n`-terminated line. A frozen reader of that layout for the released migrations that may run after
// the conversion on pending installs (same-ID repairs R-A, R-B, R-C): their logs may already be in this
// layout. It does not follow the current `MessageLog`. Current runtime code must never import it.

import fs from "node:fs/promises";
import path from "node:path";
import {
  validateCollaborationCommunicationMessage,
  type CollaborationCommunicationMessage,
} from "./released-message-logs-before-append-only.js";

export type ReleasedAppendOnlyMessageLogBaseName =
  | "communication_messages"
  | "team_communication_messages"
  | "agent_org_communication_messages";

/** A team or organization run's append-only message log file (the context-file locator sources). */
export const RELEASED_APPEND_ONLY_ROOT_MESSAGE_LOG_FILE = /^(team|agent_org)_communication_messages_(active|\d{6})\.jsonl$/;

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The log's files in read order: sealed files by index, then the active file. */
export const listReleasedAppendOnlyMessageLogFiles = async (
  dir: string,
  baseName: ReleasedAppendOnlyMessageLogBaseName,
): Promise<string[]> => {
  const names = await fs.readdir(dir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [] as string[];
    throw error;
  });
  const sealed = new RegExp(`^${escape(baseName)}_(\\d{6})\\.jsonl$`);
  const active = `${baseName}_active.jsonl`;
  const files = names.filter((name) => sealed.test(name)).sort();
  if (names.includes(active)) files.push(active);
  return files.map((name) => path.join(dir, name));
};

export const hasReleasedAppendOnlyMessageLogFile = async (
  dir: string,
  baseName: ReleasedAppendOnlyMessageLogBaseName,
): Promise<boolean> => (await listReleasedAppendOnlyMessageLogFiles(dir, baseName)).length > 0;

/**
 * The log's messages: every `\n`-terminated line of each file (an unterminated final line is an append
 * that never completed and is ignored), each parsed strictly as the seven-field message, the first
 * occurrence of an id kept, in `createdAt` order (ties in file order). `null` when the log has no file.
 */
export const readReleasedAppendOnlyMessageLog = async (
  dir: string,
  baseName: ReleasedAppendOnlyMessageLogBaseName,
): Promise<readonly CollaborationCommunicationMessage[] | null> => {
  const files = await listReleasedAppendOnlyMessageLogFiles(dir, baseName);
  if (files.length === 0) return null;
  const byId = new Map<string, CollaborationCommunicationMessage>();
  for (const filePath of files) {
    const lines = (await fs.readFile(filePath, "utf8")).split("\n");
    lines.pop();
    lines.forEach((line, index) => {
      const label = `${path.basename(filePath)}:line ${index + 1}`;
      let value: unknown;
      try { value = JSON.parse(line); }
      catch { throw new Error(`${label} is not valid JSON.`); }
      const message = validateCollaborationCommunicationMessage(value, label);
      if (!byId.has(message.messageId)) byId.set(message.messageId, message);
    });
  }
  return Object.freeze([...byId.values()]
    .map((message, order) => ({ message, order }))
    .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
    .map(({ message }) => message));
};
