import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import { parseCurrentTeamRunMetadata } from "../../run-history/store/team-run-metadata-schema.js";
import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";

const MIGRATION_ID = "20260517_team_run_metadata_member_tree";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readNullableString = (value: unknown): string | null => {
  const normalized = readString(value);
  return normalized || null;
};

const readObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : null;

const normalizeSkillAccessMode = (value: unknown): SkillAccessMode => {
  if (
    value === SkillAccessMode.NONE ||
    value === SkillAccessMode.PRELOADED_ONLY ||
    value === SkillAccessMode.GLOBAL_DISCOVERY
  ) {
    return value;
  }
  return SkillAccessMode.PRELOADED_ONLY;
};

const buildLegacyMemberPath = (member: Record<string, unknown>): string[] => {
  if (Array.isArray(member.memberPath)) {
    const pathSegments = member.memberPath.map(readString).filter(Boolean);
    if (pathSegments.length > 0) {
      return pathSegments;
    }
  }
  const routeOrName = readString(member.memberRouteKey) || readString(member.memberName);
  return routeOrName.split("/").map((segment) => segment.trim()).filter(Boolean);
};

const convertLegacyMember = (member: Record<string, unknown>): TeamRunAgentMemberMetadata => {
  const declaredKind = readString(member.memberKind);
  if (declaredKind && declaredKind !== "agent") {
    throw new Error("Legacy flat memberMetadata contains a non-agent member; topology cannot be reconstructed safely.");
  }
  if ("memberTree" in member || "teamRunId" in member || "teamDefinitionId" in member) {
    throw new Error("Legacy flat memberMetadata contains nested-team fields; topology cannot be reconstructed safely.");
  }
  const memberPath = buildLegacyMemberPath(member);
  if (memberPath.length !== 1) {
    throw new Error("Legacy flat memberMetadata contains a nested member path; topology cannot be reconstructed safely.");
  }
  const memberRouteKey = normalizeMemberRouteKey(readString(member.memberRouteKey) || memberPath.join("/"));
  const memberName = readString(member.memberName) || memberRouteKey;
  const memberRunId = readString(member.memberRunId);
  if (!memberRouteKey || !memberRunId) {
    throw new Error("Legacy team member metadata is missing member route/path/run identity.");
  }

  return {
    memberKind: "agent",
    memberRouteKey,
    memberPath,
    memberName,
    memberRunId,
    role: readNullableString(member.role),
    description: readNullableString(member.description),
    runtimeKind: runtimeKindFromString(readString(member.runtimeKind)) ?? RuntimeKind.AUTOBYTEUS,
    platformAgentRunId: readNullableString(member.platformAgentRunId),
    agentDefinitionId: readString(member.agentDefinitionId),
    llmModelIdentifier: readString(member.llmModelIdentifier),
    autoExecuteTools: Boolean(member.autoExecuteTools),
    skillAccessMode: normalizeSkillAccessMode(member.skillAccessMode),
    llmConfig: readObject(member.llmConfig),
    workspaceRootPath: readNullableString(member.workspaceRootPath),
    applicationExecutionContext: readObject(member.applicationExecutionContext) as ApplicationExecutionContext | null,
  };
};

const convertLegacyMetadata = (payload: Record<string, unknown>, teamRunId: string): TeamRunMetadata => {
  const legacyMembers = Array.isArray(payload.memberMetadata)
    ? payload.memberMetadata.map(asRecord)
    : [];
  if (legacyMembers.length === 0 || legacyMembers.some((member) => member === null)) {
    throw new Error("Legacy team metadata has no valid memberMetadata entries.");
  }
  const memberTree = legacyMembers.map((member) => convertLegacyMember(member!));
  const now = new Date().toISOString();
  const coordinatorMemberRouteKey =
    normalizeMemberRouteKey(readString(payload.coordinatorMemberRouteKey)) ||
    memberTree[0]?.memberRouteKey ||
    "";

  return parseCurrentTeamRunMetadata({
    teamRunId: readString(payload.teamRunId) || teamRunId,
    teamDefinitionId: readString(payload.teamDefinitionId),
    teamDefinitionName: readString(payload.teamDefinitionName),
    coordinatorMemberRouteKey,
    createdAt: readString(payload.createdAt) || now,
    updatedAt: readString(payload.updatedAt) || now,
    archivedAt: readNullableString(payload.archivedAt),
    memberTree,
  }, teamRunId);
};

const isLegacyMetadata = (payload: Record<string, unknown>): boolean =>
  "memberMetadata" in payload || "runVersion" in payload;

const createBackupPath = (metadataPath: string): string =>
  `${metadataPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const createTempPath = (metadataPath: string): string =>
  `${metadataPath}.${process.pid}.${Date.now()}.tmp`;

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

export class TeamRunMetadataMemberTreeMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Team run metadata member tree migration";
  readonly description = "Converts historical flat team-run metadata to canonical recursive memberTree metadata.";
  readonly requiredOnStartup = true;

  private readonly metadataStore: TeamRunMetadataStore;

  constructor(memoryDir: string) {
    this.metadataStore = new TeamRunMetadataStore(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const teamRunIds = await this.metadataStore.listTeamRunIds();
    const details: AppDataMigrationItemDetail[] = [];

    for (const teamRunId of teamRunIds) {
      const metadataPath = this.metadataStore.getMetadataPath(teamRunId);
      try {
        const raw = await fs.readFile(metadataPath, "utf-8");
        const payload = JSON.parse(raw) as unknown;
        const record = asRecord(payload);
        if (!record) {
          throw new Error("Team metadata JSON root is not an object.");
        }
        if (!isLegacyMetadata(record)) {
          parseCurrentTeamRunMetadata(record, teamRunId);
          details.push({
            itemId: teamRunId,
            filePath: metadataPath,
            status: "SKIPPED",
            message: "Metadata is already in canonical memberTree format.",
          });
          continue;
        }

        const converted = convertLegacyMetadata(record, teamRunId);
        const backupPath = createBackupPath(metadataPath);
        await fs.copyFile(metadataPath, backupPath);
        const tempPath = createTempPath(metadataPath);
        await fs.writeFile(tempPath, JSON.stringify(converted, null, 2), "utf-8");
        await fs.rename(tempPath, metadataPath);
        details.push({
          itemId: teamRunId,
          filePath: metadataPath,
          status: "MIGRATED",
          message: "Converted legacy flat memberMetadata to canonical memberTree metadata.",
          backupPath,
        });
      } catch (error) {
        if (String(error).includes("ENOENT")) {
          details.push({
            itemId: teamRunId,
            filePath: metadataPath,
            status: "SKIPPED",
            message: "No team_run_metadata.json file found.",
          });
          continue;
        }
        details.push({
          itemId: teamRunId,
          filePath: metadataPath,
          status: "FAILED",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = buildSummary(details);
    const status = summary.failedCount > 0
      ? summary.migratedCount + summary.skippedCount > 0
        ? "SUCCEEDED_WITH_WARNINGS"
        : "FAILED"
      : "SUCCEEDED";

    return {
      status,
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} team metadata file(s) could not be migrated.`
        : null,
    };
  }
}

export const TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID = MIGRATION_ID;
