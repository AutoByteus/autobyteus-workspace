import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import type { TeamRunIndexRowRecord } from "../../run-history/store/team-run-history-index-record-types.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import { parseCurrentTeamRunMetadata } from "../../run-history/store/team-run-metadata-schema.js";
import { TeamRunHistoryIndexStore } from "../../run-history/store/team-run-history-index-store.js";
import { canonicalizeWorkspaceRootPath } from "../../run-history/utils/workspace-path-normalizer.js";
import { getTeamRunLeafAgentMetadata, resolveTeamRunLeafAgentByRouteKey } from "../../run-history/services/team-run-metadata-flattener.js";
import { compactSummary, extractSummaryFromRawTraces } from "../../run-history/services/run-history-service-helpers.js";
import { resetTeamRunHistoryCatalogState } from "../../run-history/services/team-run-history-catalog-service.js";

const MIGRATION_ID = "20260521_team_run_history_index_v2";

type TeamDefinitionLookup = {
  getDefinitionById(teamDefinitionId: string): Promise<{ name?: string | null } | null>;
};

type ExistingIndexRead = {
  rowsById: Map<string, Record<string, unknown>>;
  invalid: boolean;
};

type MetadataRecord = {
  teamRunId: string;
  teamDir: string;
  metadataPath: string;
  metadata: TeamRunMetadata | null;
  raw: Record<string, unknown> | null;
  readError?: string;
  skipped?: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const safeTeamRunId = (value: unknown): string | null => {
  const teamRunId = typeof value === "string" ? value.trim() : "";
  if (!teamRunId || path.isAbsolute(teamRunId) || path.posix.isAbsolute(teamRunId) || path.win32.isAbsolute(teamRunId)) {
    return null;
  }
  if (/[\\/]/.test(teamRunId) || teamRunId === "." || teamRunId === "..") {
    return null;
  }
  return teamRunId;
};

const readJson = async (filePath: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return null;
    }
    throw error;
  }
};

const timestamp = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || Number.isNaN(Date.parse(trimmed))) {
    return null;
  }
  return new Date(trimmed).toISOString();
};

const statTimestamp = async (
  filePath: string,
  field: "birthtime" | "mtime",
): Promise<string | null> => {
  try {
    const stat = await fs.stat(filePath);
    const value = field === "birthtime" ? stat.birthtime : stat.mtime;
    if (Number.isFinite(value.getTime()) && value.getTime() > 0) {
      return value.toISOString();
    }
  } catch {
    return null;
  }
  return null;
};

const readExistingIndex = async (indexPath: string): Promise<ExistingIndexRead> => {
  const payload = await readJson(indexPath);
  if (payload === null) {
    return { rowsById: new Map(), invalid: false };
  }
  const wrapped = asRecord(payload);
  const rows = Array.isArray(payload)
    ? payload
    : wrapped && Array.isArray(wrapped.rows)
      ? wrapped.rows as unknown[]
      : null;
  if (!rows) {
    return { rowsById: new Map(), invalid: true };
  }
  const rowsById = new Map<string, Record<string, unknown>>();
  for (const item of rows) {
    const row = asRecord(item);
    const teamRunId = safeTeamRunId(row?.teamRunId);
    if (row && teamRunId) {
      rowsById.set(teamRunId, row);
    }
  }
  return { rowsById, invalid: false };
};

const listMetadataRecords = async (memoryDir: string): Promise<MetadataRecord[]> => {
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

  const records: MetadataRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const rawTeamRunId = entry.name;
    const metadataPath = path.join(teamsRoot, rawTeamRunId, "team_run_metadata.json");
    const teamRunId = safeTeamRunId(rawTeamRunId);
    if (!teamRunId) {
      records.push({
        teamRunId: rawTeamRunId,
        teamDir: path.join(teamsRoot, rawTeamRunId),
        metadataPath,
        metadata: null,
        raw: null,
        readError: "Unsafe team run directory identity.",
      });
      continue;
    }
    try {
      const payload = await readJson(metadataPath);
      if (payload === null) {
        records.push({
          teamRunId,
          teamDir: path.join(teamsRoot, teamRunId),
          metadataPath,
          metadata: null,
          raw: null,
          skipped: true,
          readError: "No team_run_metadata.json file found.",
        });
        continue;
      }
      const raw = asRecord(payload);
      if (!raw) {
        throw new Error("Team metadata JSON root is not an object.");
      }
      if ("memberMetadata" in raw || "runVersion" in raw) {
        throw new Error("Unsupported legacy team metadata after member-tree migration.");
      }
      const declaredTeamRunId = typeof raw.teamRunId === "string" ? raw.teamRunId.trim() : "";
      if (declaredTeamRunId && declaredTeamRunId !== teamRunId) {
        throw new Error(`Metadata teamRunId '${declaredTeamRunId}' does not match directory '${teamRunId}'.`);
      }
      records.push({
        teamRunId,
        teamDir: path.join(teamsRoot, teamRunId),
        metadataPath,
        metadata: parseCurrentTeamRunMetadata(raw, teamRunId),
        raw,
      });
    } catch (error) {
      records.push({
        teamRunId,
        teamDir: path.join(teamsRoot, teamRunId),
        metadataPath,
        metadata: null,
        raw: null,
        readError: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return records;
};

const parseTeamDefinitionIdFromRunId = (teamRunId: string): string | null => {
  const match = /^team_(.+)_[^_]+$/.exec(teamRunId.trim());
  return match?.[1]?.trim() || null;
};

const resolveWorkspaceRootPath = (
  metadata: TeamRunMetadata,
  existingRow?: Record<string, unknown>,
): string | null => {
  const existing = typeof existingRow?.workspaceRootPath === "string"
    ? existingRow.workspaceRootPath.trim()
    : "";
  if (existing) {
    try {
      return canonicalizeWorkspaceRootPath(existing);
    } catch {
      // Fall through to metadata-derived workspace.
    }
  }
  const leaves = getTeamRunLeafAgentMetadata(metadata);
  const coordinator = resolveTeamRunLeafAgentByRouteKey(
    metadata,
    metadata.coordinatorMemberRouteKey,
  );
  const candidate = coordinator?.workspaceRootPath?.trim() ||
    leaves.find((member) => member.workspaceRootPath?.trim())?.workspaceRootPath?.trim() ||
    "";
  return candidate ? canonicalizeWorkspaceRootPath(candidate) : null;
};

const memberPreparedTimestamps = async (
  teamDir: string,
  leaves: TeamRunAgentMemberMetadata[],
): Promise<string | null> => {
  const values: string[] = [];
  for (const leaf of leaves) {
    const metadataPath = path.join(teamDir, leaf.memberRunId, "run_metadata.json");
    const payload = asRecord(await readJson(metadataPath).catch(() => null));
    const value = timestamp(payload?.createdAt) ?? timestamp(payload?.preparedAt) ?? timestamp(payload?.startedAt);
    if (value) {
      values.push(value);
    }
  }
  values.sort((a, b) => a.localeCompare(b));
  return values[0] ?? null;
};

const deriveCreatedAt = async (input: {
  existingRow?: Record<string, unknown>;
  rawMetadata: Record<string, unknown>;
  metadataPath: string;
  teamDir: string;
  metadata: TeamRunMetadata;
  migrationTime: string;
}): Promise<{ value: string; source: string; warning: boolean }> => {
  const leaves = getTeamRunLeafAgentMetadata(input.metadata);
  const candidates: Array<[string, string | null, boolean]> = [
    ["existing V2 index createdAt", timestamp(input.existingRow?.createdAt), false],
    ["team directory birthtime", await statTimestamp(input.teamDir, "birthtime"), false],
    ["earliest leaf member metadata timestamp", await memberPreparedTimestamps(input.teamDir, leaves), false],
    ["metadata file birthtime", await statTimestamp(input.metadataPath, "birthtime"), false],
    ["legacy metadata createdAt", timestamp(input.rawMetadata.createdAt), true],
    ["legacy metadata updatedAt", timestamp(input.rawMetadata.updatedAt), true],
    ["legacy index lastActivityAt", timestamp(input.existingRow?.lastActivityAt), true],
    ["team directory mtime", await statTimestamp(input.teamDir, "mtime"), true],
    ["metadata file mtime", await statTimestamp(input.metadataPath, "mtime"), true],
    ["migration time", input.migrationTime, true],
  ];
  for (const [source, value, warning] of candidates) {
    if (value) {
      return { value, source, warning };
    }
  }
  return { value: input.migrationTime, source: "migration time", warning: true };
};

const extractSummaryFromCoordinator = (
  memoryDir: string,
  metadata: TeamRunMetadata,
): string => {
  const coordinator = resolveTeamRunLeafAgentByRouteKey(metadata, metadata.coordinatorMemberRouteKey) ??
    getTeamRunLeafAgentMetadata(metadata)[0];
  if (!coordinator) {
    return "";
  }
  const memberLayout = new TeamMemberMemoryLayout(memoryDir);
  const teamDir = memberLayout.getTeamDirPath(metadata.teamRunId);
  const memberStore = new MemoryFileStore(teamDir, {
    runRootSubdir: "",
    warnOnMissingFiles: false,
  });
  return extractSummaryFromRawTraces(
    memberStore.readRawTracesActive(coordinator.memberRunId, 300),
    memberStore.readRawTracesArchive(coordinator.memberRunId, 300),
  );
};

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const createBackupPath = (indexPath: string): string =>
  `${indexPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const backupIndex = async (indexPath: string): Promise<string | null> => {
  try {
    await fs.access(indexPath);
  } catch {
    return null;
  }
  const backupPath = createBackupPath(indexPath);
  await fs.copyFile(indexPath, backupPath);
  return backupPath;
};

export class TeamRunHistoryIndexV2AppDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Team run history index V2 migration";
  readonly description = "Migrates and repairs team_run_history_index.json into a strict V2 catalog row array.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly memoryDir: string,
    private readonly teamDefinitionService: TeamDefinitionLookup | null = null,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const indexPath = path.join(this.memoryDir, "team_run_history_index.json");
    const migrationTime = new Date().toISOString();
    const existing = await readExistingIndex(indexPath);
    const records = await listMetadataRecords(this.memoryDir);
    const indexedTeamRunIds = new Set<string>();
    const rowsById = new Map<string, TeamRunIndexRowRecord>();
    const details: AppDataMigrationItemDetail[] = [];

    if (existing.invalid) {
      details.push({
        itemId: "team_run_history_index.json",
        filePath: indexPath,
        status: "SKIPPED",
        message: "Existing team index was not a plain row array or legacy rows wrapper; rebuilding from metadata scan.",
      });
    }

    for (const record of records) {
      indexedTeamRunIds.add(record.teamRunId);
      if (record.skipped) {
        details.push({
          itemId: record.teamRunId,
          filePath: record.metadataPath,
          status: "SKIPPED",
          message: record.readError ?? "No team_run_metadata.json file found.",
        });
        continue;
      }
      if (record.readError || !record.metadata || !record.raw) {
        details.push({
          itemId: record.teamRunId,
          filePath: record.metadataPath,
          status: "FAILED",
          message: record.readError ?? "Missing or invalid team_run_metadata.json.",
        });
        continue;
      }

      const existingRow = existing.rowsById.get(record.teamRunId);
      let teamDefinitionId = record.metadata.teamDefinitionId.trim() ||
        (typeof existingRow?.teamDefinitionId === "string" ? existingRow.teamDefinitionId.trim() : "") ||
        parseTeamDefinitionIdFromRunId(record.teamRunId) ||
        "";
      if (!teamDefinitionId) {
        details.push({
          itemId: record.teamRunId,
          filePath: record.metadataPath,
          status: "FAILED",
          message: "Cannot synthesize V2 team catalog row: teamDefinitionId cannot be empty.",
        });
        continue;
      }
      teamDefinitionId = teamDefinitionId.trim();

      const name = await this.resolveTeamDefinitionName(teamDefinitionId, record.metadata, existingRow);
      const createdAt = await deriveCreatedAt({
        existingRow,
        rawMetadata: record.raw,
        metadataPath: record.metadataPath,
        teamDir: record.teamDir,
        metadata: record.metadata,
        migrationTime,
      });
      const missingFromLegacy = !existingRow;
      const row: TeamRunIndexRowRecord = {
        teamRunId: record.teamRunId,
        teamDefinitionId,
        teamDefinitionName: name.value,
        workspaceRootPath: resolveWorkspaceRootPath(record.metadata, existingRow),
        summary: compactSummary(
          typeof existingRow?.summary === "string" && existingRow.summary.trim()
            ? existingRow.summary
            : extractSummaryFromCoordinator(this.memoryDir, record.metadata),
        ),
        createdAt: createdAt.value,
        archivedAt: timestamp(existingRow?.archivedAt) ?? timestamp(record.raw.archivedAt),
        terminatedAt: timestamp(existingRow?.terminatedAt),
      };
      rowsById.set(row.teamRunId, row);
      details.push({
        itemId: row.teamRunId,
        filePath: record.metadataPath,
        status: "MIGRATED",
        message: `Synthesized V2 team catalog row${missingFromLegacy ? "; missing from legacy index" : ""}; createdAt source: ${createdAt.source}${createdAt.warning ? " (warning)" : ""}${name.warning ? "; teamDefinitionName fallback warning" : ""}.`,
      });
    }

    for (const teamRunId of existing.rowsById.keys()) {
      if (!indexedTeamRunIds.has(teamRunId)) {
        details.push({
          itemId: teamRunId,
          filePath: indexPath,
          status: "SKIPPED",
          message: "Removed stale existing team index row because no metadata directory was found.",
        });
      }
    }

    const summaryBeforeWrite = buildSummary(details);
    const status = summaryBeforeWrite.failedCount > 0
      ? summaryBeforeWrite.migratedCount > 0
        ? "SUCCEEDED_WITH_WARNINGS"
        : "FAILED"
      : "SUCCEEDED";

    let backupPath: string | null = null;
    if (status !== "FAILED") {
      const nextRows = Array.from(rowsById.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      backupPath = await backupIndex(indexPath);
      await new TeamRunHistoryIndexStore(this.memoryDir).writeIndex(nextRows);
      resetTeamRunHistoryCatalogState(this.memoryDir);
    }

    const detailsWithBackup = backupPath
      ? details.map((detail) => detail.status === "MIGRATED" ? { ...detail, backupPath } : detail)
      : details;
    const summary = buildSummary(detailsWithBackup);

    return {
      status,
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} team run metadata item(s) could not be migrated.`
        : null,
    };
  }

  private async resolveTeamDefinitionName(
    teamDefinitionId: string,
    metadata: TeamRunMetadata,
    existingRow?: Record<string, unknown>,
  ): Promise<{ value: string; warning: boolean }> {
    const existing = typeof existingRow?.teamDefinitionName === "string"
      ? existingRow.teamDefinitionName.trim()
      : "";
    if (existing) {
      return { value: existing, warning: false };
    }
    const direct = metadata.teamDefinitionName.trim();
    if (direct) {
      return { value: direct, warning: false };
    }
    try {
      const service = this.teamDefinitionService ?? await this.loadTeamDefinitionService();
      const lookup = (await service.getDefinitionById(teamDefinitionId))?.name?.trim();
      if (lookup) {
        return { value: lookup, warning: false };
      }
    } catch {
      // Fall back below and report a warning.
    }
    return { value: teamDefinitionId, warning: true };
  }

  private async loadTeamDefinitionService(): Promise<TeamDefinitionLookup> {
    const { AgentTeamDefinitionService } = await import(
      "../../agent-team-definition/services/agent-team-definition-service.js"
    );
    return AgentTeamDefinitionService.getInstance();
  }
}

export const TEAM_RUN_HISTORY_INDEX_V2_APP_DATA_MIGRATION_ID = MIGRATION_ID;
