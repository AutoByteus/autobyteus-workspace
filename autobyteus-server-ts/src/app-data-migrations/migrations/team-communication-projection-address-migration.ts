import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import { buildTeamCommunicationMessageId, buildTeamCommunicationReferenceId, normalizeTeamCommunicationReferencePath } from "../../services/team-communication/team-communication-identity.js";
import type { TeamCommunicationMessage, TeamCommunicationProjection, TeamCommunicationReferenceFile, TeamCommunicationReferenceFileType } from "../../services/team-communication/team-communication-types.js";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail, AppDataMigrationSummary } from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260701_team_communication_projection_addresses";
const FILE_NAME = "team_communication_messages.json";
const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const timestamp = (value: unknown): string | null => { const valueText = text(value); return valueText && !Number.isNaN(Date.parse(valueText)) ? new Date(valueText).toISOString() : null; };
const pathParts = (value: unknown): string[] => Array.isArray(value) ? value.map(text).filter((item): item is string => !!item) : [];
const exact = (record: Record<string, unknown>, keys: readonly string[]) => Object.keys(record).length === keys.length && keys.every((key) => Object.hasOwn(record, key));

const currentAddress = (value: unknown): TeamExecutionAddress | null => {
  const record = asRecord(value);
  if (!record || !exact(record, ["rootTeamRunId", "taskTeamRunIds", "memberAddress", "taskAgentRunId"])) return null;
  try { return createTeamExecutionAddress(record as never); } catch { return null; }
};

const legacyAddress = (message: Record<string, unknown>, prefix: "sender" | "receiver", rootTeamRunId: string): TeamExecutionAddress => {
  const stored = message[`${prefix}Address`] ?? message[`${prefix}_address`];
  const existing = currentAddress(stored);
  if (existing) return existing;
  const addressRecord = asRecord(stored);
  const segments = Array.isArray(addressRecord?.segments) ? addressRecord!.segments : [];
  let memberSegments: string[] = [];
  const taskTeamRunIds: string[] = [];
  let taskAgentRunId: string | null = null;
  for (const raw of segments) {
    const segment = asRecord(raw);
    const kind = text(segment?.kind);
    if (kind === "member") {
      const parts = pathParts(segment?.memberPath ?? segment?.member_path);
      const route = text(segment?.memberRouteKey ?? segment?.member_route_key);
      memberSegments = parts.length ? parts : route?.split("/").filter(Boolean) ?? memberSegments;
    } else if (kind === "task_team") {
      const id = text(segment?.taskTeamRunId ?? segment?.task_team_run_id);
      if (id) taskTeamRunIds.push(id);
    } else if (kind === "task_agent") {
      taskAgentRunId = text(segment?.taskAgentRunId ?? segment?.task_agent_run_id);
    }
  }
  if (!memberSegments.length) {
    const parts = pathParts(message[`${prefix}MemberPath`] ?? message[`${prefix}_member_path`]);
    const route = text(message[`${prefix}MemberRouteKey`] ?? message[`${prefix}_member_route_key`]);
    memberSegments = parts.length ? parts : route?.split("/").filter(Boolean) ?? [];
    taskAgentRunId ??= text(message[`${prefix}TaskAgentRunId`] ?? message[`${prefix}_task_agent_run_id`]);
  }
  if (!memberSegments.length) throw new Error(`${prefix} member address cannot be reconstructed.`);
  return createTeamExecutionAddress({
    rootTeamRunId,
    taskTeamRunIds,
    memberAddress: createAgentTeamAddress(memberSegments),
    taskAgentRunId,
  });
};

const referenceType = (filePath: string): TeamCommunicationReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return "image";
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return "audio";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv")) return "csv";
  if (/\.(xlsx|xls)$/.test(lower)) return "excel";
  return "file";
};
const references = (message: Record<string, unknown>, rootTeamRunId: string, messageId: string, createdAt: string): TeamCommunicationReferenceFile[] => {
  const raw = message.referenceFiles ?? message.reference_files ?? message.referenceFileEntries ?? message.reference_file_entries;
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => {
    const record = asRecord(value);
    const filePath = normalizeTeamCommunicationReferencePath(text(record?.path) ?? text(value) ?? "");
    if (!filePath) throw new Error("Reference file path is required.");
    const referenceCreatedAt = timestamp(record?.createdAt ?? record?.created_at) ?? createdAt;
    return {
      referenceId: text(record?.referenceId ?? record?.reference_id) ?? buildTeamCommunicationReferenceId({ teamRunId: rootTeamRunId, messageId, path: filePath }),
      path: filePath,
      type: text(record?.type) as TeamCommunicationReferenceFileType || referenceType(filePath),
      createdAt: referenceCreatedAt,
      updatedAt: timestamp(record?.updatedAt ?? record?.updated_at) ?? referenceCreatedAt,
    };
  });
};

const convertMessage = (value: unknown, rootTeamRunId: string): TeamCommunicationMessage => {
  const message = asRecord(value);
  if (!message || typeof message.content !== "string") throw new Error("Communication message content is required.");
  const senderAddress = legacyAddress(message, "sender", rootTeamRunId);
  const receiverAddress = legacyAddress(message, "receiver", rootTeamRunId);
  const createdAt = timestamp(message.createdAt ?? message.created_at ?? message.updatedAt ?? message.updated_at);
  if (!createdAt) throw new Error("Communication message createdAt is required.");
  const messageType = text(message.messageType ?? message.message_type) ?? "agent_message";
  const messageId = text(message.messageId ?? message.message_id) ?? buildTeamCommunicationMessageId({
    teamRunId: rootTeamRunId, senderAddress, receiverAddress, messageType, content: message.content, createdAt,
  });
  return { messageId, senderAddress, receiverAddress, content: message.content, messageType, createdAt, referenceFiles: references(message, rootTeamRunId, messageId, createdAt) };
};

const convertProjection = (value: unknown, fallbackId: string): TeamCommunicationProjection => {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.messages)) throw new Error("Communication projection is invalid.");
  const teamRunId = text(record.teamRunId) ?? fallbackId;
  return { teamRunId, messages: record.messages.map((message) => convertMessage(message, teamRunId)) };
};
const isCurrent = (value: unknown): boolean => {
  const record = asRecord(value);
  return !!record && exact(record, ["teamRunId", "messages"]) && !!text(record.teamRunId) && Array.isArray(record.messages) && record.messages.every((value) => {
    const message = asRecord(value);
    return !!message && !!currentAddress(message.senderAddress) && !!currentAddress(message.receiverAddress);
  });
};
const summary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length, migratedCount: details.filter((item) => item.status === "MIGRATED").length,
  skippedCount: details.filter((item) => item.status === "SKIPPED").length,
  failedCount: details.filter((item) => item.status === "FAILED").length, details,
});

export class TeamCommunicationProjectionAddressMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Team communication execution-address migration";
  readonly description = "Converts communication projections to exact TeamExecutionAddress sender and receiver identities.";
  readonly requiredOnStartup = true;
  constructor(private readonly memoryDir: string) {}
  async execute(): Promise<AppDataMigrationExecutionResult> {
    const root = path.join(this.memoryDir, "agent_teams");
    let entries: Dirent[] = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (!String(error).includes("ENOENT")) throw error; }
    const details: AppDataMigrationItemDetail[] = [];
    for (const entry of entries.filter((item) => item.isDirectory())) {
      const filePath = path.join(root, entry.name, FILE_NAME);
      try {
        const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
        if (isCurrent(raw)) { details.push({ itemId: entry.name, filePath, status: "SKIPPED", message: "Already current." }); continue; }
        const converted = convertProjection(raw, entry.name);
        const backupPath = `${filePath}.backup-${Date.now()}`;
        await fs.copyFile(filePath, backupPath);
        const temp = `${filePath}.${process.pid}.tmp`;
        await fs.writeFile(temp, JSON.stringify(converted, null, 2));
        await fs.rename(temp, filePath);
        details.push({ itemId: entry.name, filePath, backupPath, status: "MIGRATED", message: "Converted to exact execution addresses." });
      } catch (error) {
        if (String(error).includes("ENOENT")) continue;
        details.push({ itemId: entry.name, filePath, status: "FAILED", message: error instanceof Error ? error.message : String(error) });
      }
    }
    const migrationSummary = summary(details);
    return { status: migrationSummary.failedCount ? "FAILED" : "SUCCEEDED", summary: migrationSummary,
      errorMessage: migrationSummary.failedCount ? `${migrationSummary.failedCount} projection(s) failed.` : null };
  }
}
export const TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID = MIGRATION_ID;
