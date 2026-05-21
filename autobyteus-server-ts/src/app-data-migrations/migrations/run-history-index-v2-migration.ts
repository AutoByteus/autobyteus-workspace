import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import type { AgentRunHistoryIndexRowRecord } from "../../run-history/store/agent-run-history-index-record-types.js";
import { AgentRunHistoryIndexStore } from "../../run-history/store/agent-run-history-index-store.js";
import { compactSummary } from "../../run-history/services/run-history-service-helpers.js";
import { resetAgentRunHistoryCatalogState } from "../../run-history/services/agent-run-history-catalog-service.js";
import { canonicalizeWorkspaceRootPath } from "../../run-history/utils/workspace-path-normalizer.js";

const MIGRATION_ID = "20260521_run_history_index_v2";

type AgentDefinitionLookup = {
  getAgentDefinitionById(
    agentDefinitionId: string,
  ): Promise<{ name?: string | null } | null>;
};

type LegacyIndexRead = {
  rowsById: Map<string, Record<string, unknown>>;
  invalid: boolean;
};

type MetadataRecord = {
  runId: string;
  runDir: string;
  metadataPath: string;
  metadata: Record<string, unknown> | null;
  readError?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const safeRunId = (value: unknown): string | null => {
  const runId = typeof value === "string" ? value.trim() : "";
  if (!runId || path.isAbsolute(runId) || path.posix.isAbsolute(runId) || path.win32.isAbsolute(runId)) {
    return null;
  }
  if (/[\\/]/.test(runId) || runId === "." || runId === "..") {
    return null;
  }
  return runId;
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

const readExistingIndex = async (indexPath: string): Promise<LegacyIndexRead> => {
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
    const runId = safeRunId(row?.runId);
    if (row && runId) {
      rowsById.set(runId, row);
    }
  }
  return { rowsById, invalid: false };
};

const listMetadataRecords = async (memoryDir: string): Promise<MetadataRecord[]> => {
  const agentsRoot = path.join(memoryDir, "agents");
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(agentsRoot, { withFileTypes: true });
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
    const runId = safeRunId(entry.name);
    if (!runId) {
      records.push({
        runId: entry.name,
        runDir: path.join(agentsRoot, entry.name),
        metadataPath: path.join(agentsRoot, entry.name, "run_metadata.json"),
        metadata: null,
        readError: "Unsafe run directory identity.",
      });
      continue;
    }
    const runDir = path.join(agentsRoot, runId);
    const metadataPath = path.join(runDir, "run_metadata.json");
    try {
      records.push({
        runId,
        runDir,
        metadataPath,
        metadata: asRecord(await readJson(metadataPath)),
      });
    } catch (error) {
      records.push({
        runId,
        runDir,
        metadataPath,
        metadata: null,
        readError: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return records;
};

const deriveCreatedAt = async (input: {
  existingRow?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  metadataPath: string;
  runDir: string;
  migrationTime: string;
}): Promise<{ value: string; source: string; warning: boolean }> => {
  const candidates: Array<[string, string | null]> = [
    ["existing V2 index createdAt", timestamp(input.existingRow?.createdAt)],
    ["legacy metadata createdAt", timestamp(input.metadata.createdAt)],
    ["legacy metadata preparedAt", timestamp(input.metadata.preparedAt)],
    ["legacy index lastActivityAt", timestamp(input.existingRow?.lastActivityAt)],
    ["metadata file birthtime", await statTimestamp(input.metadataPath, "birthtime")],
    ["metadata file mtime", await statTimestamp(input.metadataPath, "mtime")],
    ["run directory birthtime", await statTimestamp(input.runDir, "birthtime")],
    ["run directory mtime", await statTimestamp(input.runDir, "mtime")],
    ["migration time", input.migrationTime],
  ];
  for (const [source, value] of candidates) {
    if (value) {
      return { value, source, warning: source === "migration time" };
    }
  }
  return { value: input.migrationTime, source: "migration time", warning: true };
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

const deriveWorkspaceRootPath = (
  metadata: Record<string, unknown>,
  existingRow?: Record<string, unknown>,
): string => {
  const metadataPath = typeof metadata.workspaceRootPath === "string"
    ? metadata.workspaceRootPath.trim()
    : "";
  const existingPath = typeof existingRow?.workspaceRootPath === "string"
    ? existingRow.workspaceRootPath.trim()
    : "";
  const candidate = metadataPath || existingPath;
  return canonicalizeWorkspaceRootPath(candidate);
};

export class RunHistoryIndexV2AppDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Standalone run history index V2 migration";
  readonly description = "Migrates and repairs standalone agent run_history_index.json into a strict V2 catalog row array.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly memoryDir: string,
    private readonly agentDefinitionService: AgentDefinitionLookup | null = null,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const indexPath = path.join(this.memoryDir, "run_history_index.json");
    const migrationTime = new Date().toISOString();
    const existing = await readExistingIndex(indexPath);
    const metadataRecords = await listMetadataRecords(this.memoryDir);
    const indexedRunIds = new Set<string>();
    const rowsById = new Map<string, AgentRunHistoryIndexRowRecord>();
    const details: AppDataMigrationItemDetail[] = [];

    if (existing.invalid) {
      details.push({
        itemId: "run_history_index.json",
        filePath: indexPath,
        status: "SKIPPED",
        message: "Existing index was not a plain row array or legacy rows wrapper; rebuilding from metadata scan.",
      });
    }

    for (const record of metadataRecords) {
      indexedRunIds.add(record.runId);
      if (record.readError || !record.metadata) {
        details.push({
          itemId: record.runId,
          filePath: record.metadataPath,
          status: "FAILED",
          message: record.readError ?? "Missing or invalid run_metadata.json.",
        });
        continue;
      }

      const existingRow = existing.rowsById.get(record.runId);
      const createdAt = await deriveCreatedAt({
        existingRow,
        metadata: record.metadata,
        metadataPath: record.metadataPath,
        runDir: record.runDir,
        migrationTime,
      });
      const agentDefinitionId = String(
        record.metadata.agentDefinitionId ?? existingRow?.agentDefinitionId ?? record.runId,
      ).trim() || record.runId;
      let workspaceRootPath: string;
      try {
        workspaceRootPath = deriveWorkspaceRootPath(record.metadata, existingRow);
      } catch (error) {
        details.push({
          itemId: record.runId,
          filePath: record.metadataPath,
          status: "FAILED",
          message: `Cannot synthesize V2 catalog row: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        continue;
      }
      const row: AgentRunHistoryIndexRowRecord = {
        runId: record.runId,
        agentDefinitionId,
        agentName: await this.resolveAgentName(agentDefinitionId, record.metadata, existingRow),
        workspaceRootPath,
        summary: compactSummary(String(existingRow?.summary ?? record.metadata.summary ?? "")),
        createdAt: createdAt.value,
        archivedAt: timestamp(existingRow?.archivedAt ?? record.metadata.archivedAt),
        terminatedAt: timestamp(existingRow?.terminatedAt ?? record.metadata.terminatedAt),
      };
      rowsById.set(row.runId, row);
      details.push({
        itemId: row.runId,
        filePath: record.metadataPath,
        status: "MIGRATED",
        message: `Synthesized V2 catalog row; createdAt source: ${createdAt.source}${createdAt.warning ? " (last-resort fallback)" : ""}.`,
      });
    }

    for (const runId of existing.rowsById.keys()) {
      if (!indexedRunIds.has(runId)) {
        details.push({
          itemId: runId,
          filePath: indexPath,
          status: "SKIPPED",
          message: "Removed stale existing index row because no metadata directory was found.",
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
      await new AgentRunHistoryIndexStore(this.memoryDir).writeIndex(nextRows);
      resetAgentRunHistoryCatalogState(this.memoryDir);
    }

    const detailsWithBackup = backupPath
      ? details.map((detail) =>
        detail.status === "MIGRATED" ? { ...detail, backupPath } : detail,
      )
      : details;
    const summary = buildSummary(detailsWithBackup);

    return {
      status,
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} standalone run metadata item(s) could not be migrated.`
        : null,
    };
  }

  private async resolveAgentName(
    agentDefinitionId: string,
    metadata: Record<string, unknown>,
    existingRow?: Record<string, unknown>,
  ): Promise<string> {
    const direct = String(existingRow?.agentName ?? metadata.agentName ?? "").trim();
    if (direct) {
      return direct;
    }
    try {
      const service = this.agentDefinitionService ?? await this.loadAgentDefinitionService();
      return (await service.getAgentDefinitionById(agentDefinitionId))?.name?.trim() || agentDefinitionId;
    } catch {
      return agentDefinitionId;
    }
  }

  private async loadAgentDefinitionService(): Promise<AgentDefinitionLookup> {
    const { AgentDefinitionService } = await import(
      "../../agent-definition/services/agent-definition-service.js"
    );
    return AgentDefinitionService.getInstance();
  }
}

export const RUN_HISTORY_INDEX_V2_APP_DATA_MIGRATION_ID = MIGRATION_ID;
