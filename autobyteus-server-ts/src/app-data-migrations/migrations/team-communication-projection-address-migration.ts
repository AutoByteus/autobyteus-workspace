import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import {
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetSegment,
} from "../../agent-team-execution/domain/conversation-target-address.js";
import { buildMemberRouteKeyFromPath } from "../../agent-team-execution/domain/team-run-member-identity.js";
import {
  buildTeamCommunicationMessageId,
  buildTeamCommunicationReferenceId,
  normalizeTeamCommunicationReferencePath,
} from "../../services/team-communication/team-communication-identity.js";
import type {
  TeamCommunicationMessage,
  TeamCommunicationProjection,
  TeamCommunicationReferenceFile,
  TeamCommunicationReferenceFileType,
} from "../../services/team-communication/team-communication-types.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260701_team_communication_projection_addresses";
const PROJECTION_FILE_NAME = "team_communication_messages.json";
const OBSOLETE_MESSAGE_FIELDS = [
  "teamRunId",
  "team_run_id",
  "senderRunId",
  "sender_run_id",
  "sender_agent_id",
  "senderMemberKind",
  "sender_member_kind",
  "senderMemberName",
  "sender_agent_name",
  "senderMemberPath",
  "sender_member_path",
  "senderMemberRouteKey",
  "sender_member_route_key",
  "senderRepresentedSubTeam",
  "sender_represented_subteam",
  "receiverRunId",
  "receiver_run_id",
  "receiverMemberKind",
  "receiver_member_kind",
  "receiverMemberName",
  "receiver_agent_name",
  "receiverMemberPath",
  "receiver_member_path",
  "receiverMemberRouteKey",
  "receiver_member_route_key",
  "receiverRepresentedSubTeam",
  "receiver_represented_subteam",
  "taskTeamScope",
  "task_team_scope",
  "updatedAt",
  "updated_at",
];
const OBSOLETE_ROOT_FIELDS = ["version", "updatedAt", "updated_at"];
const CURRENT_PROJECTION_FIELDS = ["teamRunId", "messages"];
const CURRENT_MESSAGE_FIELDS = [
  "messageId",
  "senderAddress",
  "receiverAddress",
  "content",
  "messageType",
  "createdAt",
  "referenceFiles",
];
const CURRENT_REFERENCE_FIELDS = ["referenceId", "path", "type", "createdAt", "updatedAt"];
const REFERENCE_FILE_TYPES: TeamCommunicationReferenceFileType[] = [
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "csv",
  "excel",
  "other",
];

type ProjectionCandidate = {
  itemId: string;
  teamRunId: string;
  filePath: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = readString(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const readStringPath = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return null;
  }
  const pathParts = value.map((entry) => entry.trim()).filter(Boolean);
  return pathParts.length > 0 ? pathParts : null;
};

const readTimestamp = (value: unknown): string | null => {
  const normalized = readString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const inferReferenceFileType = (filePath: string): TeamCommunicationReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return "image";
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return "audio";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv")) return "csv";
  if (/\.(xlsx|xls)$/.test(lower)) return "excel";
  return "file";
};

const normalizeReferenceType = (value: unknown): TeamCommunicationReferenceFileType | null =>
  REFERENCE_FILE_TYPES.includes(value as TeamCommunicationReferenceFileType)
    ? value as TeamCommunicationReferenceFileType
    : null;

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;

const createBackupPath = (filePath: string): string =>
  `${filePath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.tmp`;

const writeJsonAtomic = async (filePath: string, payload: unknown): Promise<void> => {
  const tempPath = createTempPath(filePath);
  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tempPath, filePath);
};

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const statusFromSummary = (summary: AppDataMigrationSummary): AppDataMigrationExecutionResult["status"] => {
  if (summary.failedCount === 0) return "SUCCEEDED";
  return summary.migratedCount + summary.skippedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "FAILED";
};

const obsoleteFieldsPresent = (record: Record<string, unknown>, fields: readonly string[]): boolean =>
  fields.some((field) => field in record);

const hasOnlyFields = (record: Record<string, unknown>, allowedFields: readonly string[]): boolean =>
  Object.keys(record).every((field) => allowedFields.includes(field));

const parseAddressSegment = (value: unknown): ConversationTargetSegment => {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Conversation target segment is not an object.");
  }
  const kind = readRequiredString(record.kind, "address segment kind");
  if (kind === "member") {
    const memberRouteKey = readString(record.memberRouteKey) || readString(record.member_route_key);
    const memberPath = readStringPath(record.memberPath) ?? readStringPath(record.member_path);
    return {
      kind: "member",
      ...(memberRouteKey ? { memberRouteKey } : {}),
      ...(memberPath ? { memberPath } : {}),
    };
  }
  if (kind === "task_team") {
    return { kind: "task_team", taskTeamRunId: readRequiredString(record.taskTeamRunId ?? record.task_team_run_id, "taskTeamRunId") };
  }
  if (kind === "task_agent") {
    return { kind: "task_agent", taskAgentRunId: readRequiredString(record.taskAgentRunId ?? record.task_agent_run_id, "taskAgentRunId") };
  }
  throw new Error(`Unsupported conversation target segment kind '${kind}'.`);
};

const parseAddress = (value: unknown, fieldName: string): ConversationTargetAddress => {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.segments) || record.segments.length === 0) {
    throw new Error(`${fieldName} must contain one or more segments.`);
  }
  return normalizeConversationTargetAddress({
    segments: record.segments.map(parseAddressSegment),
  });
};

const readAddress = (
  message: Record<string, unknown>,
  camelKey: "senderAddress" | "receiverAddress",
  snakeKey: "sender_address" | "receiver_address",
): ConversationTargetAddress | null => {
  const rawAddress = message[camelKey] ?? message[snakeKey];
  return rawAddress === undefined ? null : parseAddress(rawAddress, camelKey);
};

const buildLegacyFlatAddress = (
  message: Record<string, unknown>,
  prefix: "sender" | "receiver",
): ConversationTargetAddress => {
  const routeKey = readString(message[`${prefix}MemberRouteKey`]) || readString(message[`${prefix}_member_route_key`]);
  const memberPath = readStringPath(message[`${prefix}MemberPath`]) ?? readStringPath(message[`${prefix}_member_path`]);
  const memberRouteKey = routeKey || (memberPath ? buildMemberRouteKeyFromPath(memberPath) : "");
  if (!memberRouteKey) {
    throw new Error(`${prefix} member route/path cannot be converted to an address.`);
  }
  const segments: ConversationTargetSegment[] = [{ kind: "member", memberRouteKey }];
  const taskAgentRunId = readString(message[`${prefix}TaskAgentRunId`]) || readString(message[`${prefix}_task_agent_run_id`]);
  if (taskAgentRunId) {
    segments.push({ kind: "task_agent", taskAgentRunId });
  }
  return normalizeConversationTargetAddress({ segments });
};

const normalizeAddressForMigration = (
  message: Record<string, unknown>,
  prefix: "sender" | "receiver",
): ConversationTargetAddress => {
  const existing = readAddress(
    message,
    prefix === "sender" ? "senderAddress" : "receiverAddress",
    prefix === "sender" ? "sender_address" : "receiver_address",
  );
  return existing ?? buildLegacyFlatAddress(message, prefix);
};

const readRawReferenceEntries = (message: Record<string, unknown>): unknown[] => {
  const raw = message.referenceFiles ?? message.reference_files ?? message.referenceFileEntries ?? message.reference_file_entries;
  return Array.isArray(raw) ? raw : [];
};

const normalizeReferenceFiles = (input: {
  teamRunId: string;
  messageId: string;
  messageCreatedAt: string;
  message: Record<string, unknown>;
}): TeamCommunicationReferenceFile[] => {
  const referencesByPath = new Map<string, TeamCommunicationReferenceFile>();
  for (const [index, rawReference] of readRawReferenceEntries(input.message).entries()) {
    const record = asRecord(rawReference);
    const rawPath = typeof rawReference === "string"
      ? rawReference
      : readString(record?.path);
    const normalizedPath = normalizeTeamCommunicationReferencePath(rawPath);
    if (!normalizedPath) {
      throw new Error(`Reference file at index ${index} is missing path.`);
    }
    const createdAt = readTimestamp(record?.createdAt ?? record?.created_at) ?? input.messageCreatedAt;
    const reference: TeamCommunicationReferenceFile = {
      referenceId: readString(record?.referenceId ?? record?.reference_id) || buildTeamCommunicationReferenceId({
        teamRunId: input.teamRunId,
        messageId: input.messageId,
        path: normalizedPath,
      }),
      path: normalizedPath,
      type: normalizeReferenceType(record?.type) ?? inferReferenceFileType(normalizedPath),
      createdAt,
      updatedAt: readTimestamp(record?.updatedAt ?? record?.updated_at) ?? createdAt,
    };
    const existing = referencesByPath.get(reference.path);
    if (!existing || reference.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      referencesByPath.set(reference.path, reference);
    }
  }
  return [...referencesByPath.values()];
};

const normalizeMessage = (
  rawMessage: unknown,
  teamRunId: string,
): TeamCommunicationMessage => {
  const message = asRecord(rawMessage);
  if (!message) {
    throw new Error("Team communication message is not an object.");
  }
  const senderAddress = normalizeAddressForMigration(message, "sender");
  const receiverAddress = normalizeAddressForMigration(message, "receiver");
  const content = typeof message.content === "string" ? message.content : null;
  if (content === null) {
    throw new Error("Team communication message content is required.");
  }
  const messageType = readString(message.messageType) || readString(message.message_type) || "agent_message";
  const createdAt = readTimestamp(message.createdAt ?? message.created_at)
    ?? readTimestamp(message.updatedAt ?? message.updated_at);
  if (!createdAt) {
    throw new Error("Team communication message createdAt is required.");
  }
  const messageId = readString(message.messageId) || readString(message.message_id) || buildTeamCommunicationMessageId({
    teamRunId,
    senderAddress,
    receiverAddress,
    messageType,
    content,
    createdAt,
  });
  return {
    messageId,
    senderAddress,
    receiverAddress,
    content,
    messageType,
    createdAt,
    referenceFiles: normalizeReferenceFiles({ teamRunId, messageId, messageCreatedAt: createdAt, message }),
  };
};

const isCurrentAddress = (value: unknown): boolean => {
  try {
    parseAddress(value, "address");
    return true;
  } catch {
    return false;
  }
};

const isCurrentReferenceFile = (value: unknown): boolean => {
  const reference = asRecord(value);
  return Boolean(
    reference &&
    hasOnlyFields(reference, CURRENT_REFERENCE_FIELDS) &&
    readString(reference.referenceId) &&
    readString(reference.path) &&
    normalizeReferenceType(reference.type) &&
    readTimestamp(reference.createdAt) &&
    readTimestamp(reference.updatedAt)
  );
};

const isCurrentMessage = (value: unknown): boolean => {
  const message = asRecord(value);
  return Boolean(
    message &&
    !obsoleteFieldsPresent(message, OBSOLETE_MESSAGE_FIELDS) &&
    hasOnlyFields(message, CURRENT_MESSAGE_FIELDS) &&
    readString(message.messageId) &&
    isCurrentAddress(message.senderAddress) &&
    isCurrentAddress(message.receiverAddress) &&
    typeof message.content === "string" &&
    readString(message.messageType) &&
    readTimestamp(message.createdAt) &&
    Array.isArray(message.referenceFiles) &&
    message.referenceFiles.every(isCurrentReferenceFile)
  );
};

const isCurrentProjection = (payload: unknown): boolean => {
  const projection = asRecord(payload);
  return Boolean(
    projection &&
    hasOnlyFields(projection, CURRENT_PROJECTION_FIELDS) &&
    readString(projection.teamRunId) &&
    !obsoleteFieldsPresent(projection, OBSOLETE_ROOT_FIELDS) &&
    Array.isArray(projection.messages) &&
    projection.messages.every(isCurrentMessage)
  );
};

const normalizeProjection = (payload: unknown, fallbackTeamRunId: string): TeamCommunicationProjection => {
  const projection = asRecord(payload);
  if (!projection) {
    throw new Error("Team communication projection JSON root is not an object.");
  }
  const teamRunId = readString(projection.teamRunId) || fallbackTeamRunId;
  if (!teamRunId) {
    throw new Error("Team communication projection teamRunId is required.");
  }
  if (!Array.isArray(projection.messages)) {
    throw new Error("Team communication projection messages field is not an array.");
  }
  return {
    teamRunId,
    messages: projection.messages.map((message) => normalizeMessage(message, teamRunId)),
  };
};

const listProjectionCandidates = async (memoryDir: string): Promise<ProjectionCandidate[]> => {
  const teamsRoot = path.join(memoryDir, "agent_teams");
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(teamsRoot, { withFileTypes: true });
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return [];
    }
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      itemId: entry.name,
      teamRunId: entry.name,
      filePath: path.join(teamsRoot, entry.name, PROJECTION_FILE_NAME),
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
};

export class TeamCommunicationProjectionAddressMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Team communication projection address migration";
  readonly description = "Converts historical flat Team Communication projections to the address-first sender/receiver model.";
  readonly requiredOnStartup = true;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const candidate of await listProjectionCandidates(this.memoryDir)) {
      try {
        const payload = await readJson(candidate.filePath);
        if (isCurrentProjection(payload)) {
          details.push({
            itemId: candidate.itemId,
            filePath: candidate.filePath,
            status: "SKIPPED",
            message: "Team communication projection is already address-first.",
          });
          continue;
        }
        const converted = normalizeProjection(payload, candidate.teamRunId);
        const backupPath = createBackupPath(candidate.filePath);
        await fs.copyFile(candidate.filePath, backupPath);
        await writeJsonAtomic(candidate.filePath, converted);
        details.push({
          itemId: candidate.itemId,
          filePath: candidate.filePath,
          status: "MIGRATED",
          message: "Converted Team Communication projection to address-first sender/receiver addresses.",
          backupPath,
        });
      } catch (error) {
        if (String(error).includes("ENOENT")) {
          continue;
        }
        details.push({
          itemId: candidate.itemId,
          filePath: candidate.filePath,
          status: "FAILED",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = buildSummary(details);
    return {
      status: statusFromSummary(summary),
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} Team Communication projection file(s) could not be migrated.`
        : null,
    };
  }
}

export const TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID = MIGRATION_ID;
