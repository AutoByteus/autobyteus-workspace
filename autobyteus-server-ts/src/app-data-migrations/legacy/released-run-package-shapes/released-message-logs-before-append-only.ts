// Message logs as released before `20261018_append_only_message_logs_v1`: one pretty-printed JSON file
// per log with an envelope (`schemaVersion`, owner id, `messages`). Frozen copies, as of
// origin/personal@65cf41c6b4, of the JSON names and path helpers, the envelope types, the strict
// envelope and message validators, and `TaskAgentMessageLogs.merge` (the JSON task-log merge used by
// `20261017_task_agent_own_run_v1`). Owned by released app-data migrations and by the append-only
// conversion; current runtime code must never import this module.

import fsPromises from "node:fs/promises";
import path from "node:path";
import { TASK_AGENT_PLACEMENT } from "../../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../../run-history/store/atomic-run-package-file-commit-writer.js";

export const STANDALONE_ROOT_MESSAGES_FILE_NAME = "communication_messages.json";
export const TEAM_COMMUNICATION_MESSAGES_FILE_NAME = "team_communication_messages.json";
export const AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME = "agent_org_communication_messages.json";

export const getStandaloneRootMessagesPath = (collaborationDir: string): string =>
  path.join(path.resolve(collaborationDir), STANDALONE_ROOT_MESSAGES_FILE_NAME);
export const getTeamCommunicationMessagesPath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TEAM_COMMUNICATION_MESSAGES_FILE_NAME);
export const getAgentOrgCommunicationMessagesPath = (orgDir: string): string =>
  path.join(path.resolve(orgDir), AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME);

export type CollaborationCommunicationMessage = Readonly<{
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly string[];
  createdAt: string;
}>;

export type StandaloneRootMessagesFile = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent";
  hostRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;

export type TeamCommunicationMessagesFile = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;
export type TeamCommunicationMessagesSnapshot = TeamCommunicationMessagesFile;

export type AgentOrgCommunicationMessagesFile = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
};
const exactKeys = (value: Record<string, unknown>, expected: readonly string[], label: string): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};
const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value !== value.trim()) throw new Error(`${label} must be a non-empty trimmed string.`);
  return value;
};
const timestamp = (value: unknown, label: string): string => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return normalized;
};
const references = (value: unknown, label: string): readonly string[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return Object.freeze(value.map((entry, index) => {
    const filePath = required(entry, `${label}[${index}]`);
    if (!path.isAbsolute(filePath) || path.normalize(filePath) !== filePath) {
      throw new Error(`${label}[${index}] must be a normalized absolute local path.`);
    }
    return filePath;
  }));
};

/** The strict released message validator: exactly the seven message fields. */
export const validateCollaborationCommunicationMessage = (
  value: unknown,
  label = "message",
): CollaborationCommunicationMessage => {
  const message = record(value, label);
  exactKeys(message, [
    "messageId", "senderAgentRunId", "receiverAgentRunId", "content", "messageType",
    "referenceFiles", "createdAt",
  ], label);
  return Object.freeze({
    messageId: required(message.messageId, `${label}.messageId`),
    senderAgentRunId: required(message.senderAgentRunId, `${label}.senderAgentRunId`),
    receiverAgentRunId: required(message.receiverAgentRunId, `${label}.receiverAgentRunId`),
    content: required(message.content, `${label}.content`),
    messageType: required(message.messageType, `${label}.messageType`),
    referenceFiles: references(message.referenceFiles, `${label}.referenceFiles`),
    createdAt: timestamp(message.createdAt, `${label}.createdAt`),
  });
};

export const validateCollaborationCommunicationMessageArray = (
  value: unknown,
  label = "messages",
): readonly CollaborationCommunicationMessage[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  const ids = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    const message = validateCollaborationCommunicationMessage(entry, `${label}[${index}]`);
    if (ids.has(message.messageId)) throw new Error(`Duplicate message ID '${message.messageId}'.`);
    ids.add(message.messageId);
    return message;
  }));
};

export const validateTeamCommunicationMessagesPayload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TeamCommunicationMessagesFile => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Team communication messages must be an object.");
  const payload = value as Record<string, unknown>;
  const actual = Object.keys(payload).sort();
  const expected = ["messages", "rootTeamRunId", "schemaVersion"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("Team communication messages has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1) throw new Error("Team communication schemaVersion must be 1.");
  const rootTeamRunId = required(payload.rootTeamRunId, "rootTeamRunId");
  if (expectedRootTeamRunId && rootTeamRunId !== expectedRootTeamRunId) {
    throw new Error(`Communication root '${rootTeamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    rootTeamRunId,
    messages: validateCollaborationCommunicationMessageArray(payload.messages),
  });
};

export const validateAgentOrgCommunicationMessages = (
  value: unknown,
  expectedOrgRunId?: string,
): AgentOrgCommunicationMessagesFile => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AgentOrg communication messages must be an object.");
  const payload = value as Record<string, unknown>;
  const actual = Object.keys(payload).sort();
  const expected = ["messages", "orgRunId", "schemaVersion", "subjectKind"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("AgentOrg communication messages has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1 || payload.subjectKind !== "agent_org") {
    throw new Error("AgentOrg communication messages requires schemaVersion 1 and subjectKind 'agent_org'.");
  }
  if (typeof payload.orgRunId !== "string" || !payload.orgRunId || payload.orgRunId !== payload.orgRunId.trim()) {
    throw new Error("AgentOrg communication messages orgRunId is invalid.");
  }
  if (expectedOrgRunId && payload.orgRunId !== expectedOrgRunId) {
    throw new Error(`AgentOrg communication root '${payload.orgRunId}' does not match '${expectedOrgRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    subjectKind: "agent_org",
    orgRunId: payload.orgRunId,
    messages: validateCollaborationCommunicationMessageArray(payload.messages),
  });
};

export const validateStandaloneRootMessages = (
  value: unknown,
  expectedHostRunId?: string,
): StandaloneRootMessagesFile => {
  const payload = record(value, "Agent run collaboration messages");
  const actual = Object.keys(payload).sort();
  const expected = ["hostRunId", "messages", "schemaVersion", "subjectKind"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("Agent run collaboration messages has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1 || payload.subjectKind !== "agent") {
    throw new Error("Agent run collaboration messages requires schemaVersion 1 and subjectKind 'agent'.");
  }
  const hostRunId = required(payload.hostRunId, "hostRunId");
  if (expectedHostRunId && hostRunId !== expectedHostRunId) {
    throw new Error(`Collaboration messages host '${hostRunId}' does not match '${expectedHostRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    subjectKind: "agent",
    hostRunId,
    messages: validateCollaborationCommunicationMessageArray(payload.messages),
  });
};

/** A task agent's own log: an agent task agent's, or a task agent team's. */
export type ReleasedTaskAgentLogOwner =
  | Readonly<{ kind: "task_agent"; agentRunId: string }>
  | Readonly<{ kind: "task_agent_team"; teamRunId: string }>;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** Task agents' own JSON message logs under one memory root, as `TaskAgentMessageLogs` wrote them. */
export class ReleasedTaskAgentMessageLogs {
  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryRoot: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  /**
   * Merges messages into a task agent's own log: union by `messageId`, existing entries kept, ordered by
   * `createdAt`; written only when something is missing (or when `ensureExists` and the log is missing).
   * `null` when nothing was written.
   */
  async merge(
    owner: ReleasedTaskAgentLogOwner,
    messages: readonly CollaborationCommunicationMessage[],
    options: Readonly<{ ensureExists?: boolean }> = {},
  ): Promise<RunPackageFileWriteResult | null> {
    let current: readonly CollaborationCommunicationMessage[] | null;
    try { current = this.validate(owner, JSON.parse(await fsPromises.readFile(this.pathOf(owner), "utf8"))).messages; }
    catch (error) { if (!isMissing(error)) throw error; current = null; }
    const known = new Set((current ?? []).map((message) => message.messageId));
    const missing = messages.filter((message) => !known.has(message.messageId));
    if (missing.length === 0 && (current !== null || !options.ensureExists)) return null;
    const merged = [...(current ?? []), ...missing]
      .map((message, order) => ({ message, order }))
      .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
      .map(({ message }) => message);
    return this.writeLog(owner, merged);
  }

  private writeLog(owner: ReleasedTaskAgentLogOwner, messages: readonly CollaborationCommunicationMessage[]) {
    const payload = owner.kind === "task_agent"
      ? { schemaVersion: 1, subjectKind: "agent", hostRunId: owner.agentRunId, messages }
      : { schemaVersion: 1, rootTeamRunId: owner.teamRunId, messages };
    return this.writer.write({ file: "communication_messages", filePath: this.pathOf(owner), payload: this.validate(owner, payload) });
  }

  private pathOf(owner: ReleasedTaskAgentLogOwner): string {
    return owner.kind === "task_agent"
      ? path.join(this.layout.getAgentRunMemoryDirPath(TASK_AGENT_PLACEMENT, owner.agentRunId), STANDALONE_ROOT_MESSAGES_FILE_NAME)
      : getTeamCommunicationMessagesPath(this.layout.getTeamDirPath({ rootTeamRunId: owner.teamRunId, ancestorTeamRunIds: [] }));
  }

  private validate(owner: ReleasedTaskAgentLogOwner, value: unknown) {
    return owner.kind === "task_agent"
      ? validateStandaloneRootMessages(value, owner.agentRunId)
      : validateTeamCommunicationMessagesPayload(value, owner.teamRunId);
  }
}
