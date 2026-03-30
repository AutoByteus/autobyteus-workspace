import fs from "node:fs/promises";
import path from "node:path";
import {
  TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
  TeamRunDeleteLifecycleRecord,
  TeamRunIndexFileRecord,
  TeamRunIndexRowRecord,
  TeamRunStatusRecord,
} from "./team-run-history-index-record-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createEmptyIndex = (): TeamRunIndexFileRecord => ({
  version: TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
  rows: [],
});

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const normalizeStatus = (
  value: TeamRunStatusRecord,
): TeamRunStatusRecord => {
  if (value === "ERROR") {
    return "ERROR";
  }
  if (value === "IDLE") {
    return "IDLE";
  }
  return "ACTIVE";
};

const normalizeDeleteLifecycle = (
  value: TeamRunDeleteLifecycleRecord,
): TeamRunDeleteLifecycleRecord => {
  return value === "CLEANUP_PENDING" ? "CLEANUP_PENDING" : "READY";
};

const normalizeOptionalWorkspaceRootPath = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return canonicalizeWorkspaceRootPath(normalized);
};

const normalizeRow = (row: TeamRunIndexRowRecord): TeamRunIndexRowRecord => ({
  teamRunId: row.teamRunId.trim(),
  teamDefinitionId: row.teamDefinitionId.trim(),
  teamDefinitionName: row.teamDefinitionName.trim(),
  workspaceRootPath: normalizeOptionalWorkspaceRootPath(row.workspaceRootPath),
  summary: row.summary.trim(),
  lastActivityAt: row.lastActivityAt,
  lastKnownStatus: normalizeStatus(row.lastKnownStatus),
  deleteLifecycle: normalizeDeleteLifecycle(row.deleteLifecycle),
});

const parseIndexFile = (value: unknown): TeamRunIndexFileRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.version !== "number" || !Array.isArray(payload.rows)) {
    return null;
  }
  const rows: TeamRunIndexRowRecord[] = [];
  for (const row of payload.rows) {
    if (!row || typeof row !== "object") {
      return null;
    }
    const normalizedRow = row as Record<string, unknown>;
    if (
      typeof normalizedRow.teamRunId !== "string" ||
      typeof normalizedRow.teamDefinitionId !== "string" ||
      typeof normalizedRow.teamDefinitionName !== "string" ||
      (typeof normalizedRow.workspaceRootPath !== "string" &&
        normalizedRow.workspaceRootPath !== null &&
        normalizedRow.workspaceRootPath !== undefined) ||
      typeof normalizedRow.summary !== "string" ||
      typeof normalizedRow.lastActivityAt !== "string" ||
      (normalizedRow.lastKnownStatus !== "ACTIVE" &&
        normalizedRow.lastKnownStatus !== "IDLE" &&
        normalizedRow.lastKnownStatus !== "ERROR") ||
      (normalizedRow.deleteLifecycle !== "READY" &&
        normalizedRow.deleteLifecycle !== "CLEANUP_PENDING")
    ) {
      return null;
    }
    rows.push(
      normalizeRow({
        teamRunId: String(normalizedRow.teamRunId),
        teamDefinitionId: String(normalizedRow.teamDefinitionId),
        teamDefinitionName: String(normalizedRow.teamDefinitionName),
        workspaceRootPath:
          typeof normalizedRow.workspaceRootPath === "string"
            ? normalizedRow.workspaceRootPath
            : null,
        summary: String(normalizedRow.summary),
        lastActivityAt: String(normalizedRow.lastActivityAt),
        lastKnownStatus: normalizedRow.lastKnownStatus as TeamRunStatusRecord,
        deleteLifecycle: normalizedRow.deleteLifecycle as TeamRunDeleteLifecycleRecord,
      }),
    );
  }
  return {
    version: payload.version,
    rows,
  };
};

export class TeamRunHistoryIndexStore {
  private readonly indexFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(memoryDir: string) {
    this.indexFilePath = path.join(memoryDir, "team_run_history_index.json");
  }

  async readIndex(): Promise<TeamRunIndexFileRecord> {
    await this.writeQueue;
    return this.readIndexFile();
  }

  async listRows(): Promise<TeamRunIndexRowRecord[]> {
    const index = await this.readIndex();
    return index.rows;
  }

  async getRow(teamRunId: string): Promise<TeamRunIndexRowRecord | null> {
    const rows = await this.listRows();
    return rows.find((row) => row.teamRunId === teamRunId) ?? null;
  }

  async writeIndex(index: TeamRunIndexFileRecord): Promise<void> {
    await this.queueWrite(async () => {
      await this.writeIndexFile({
        version: TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows: index.rows.map(normalizeRow),
      });
    });
  }

  async upsertRow(row: TeamRunIndexRowRecord): Promise<void> {
    await this.queueWrite(async () => {
      const index = await this.readIndexFile();
      const rows = index.rows.filter((entry) => entry.teamRunId !== row.teamRunId);
      rows.push(normalizeRow(row));
      await this.writeIndexFile({
        version: TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows,
      });
    });
  }

  async updateRow(
    teamRunId: string,
    patch: Partial<Omit<TeamRunIndexRowRecord, "teamRunId">>,
  ): Promise<void> {
    await this.queueWrite(async () => {
      const index = await this.readIndexFile();
      const current = index.rows.find((row) => row.teamRunId === teamRunId);
      if (!current) {
        return;
      }
      const next: TeamRunIndexRowRecord = normalizeRow({
        ...current,
        ...patch,
        teamRunId,
      });
      const rows = index.rows
        .filter((row) => row.teamRunId !== teamRunId)
        .concat(next);
      await this.writeIndexFile({
        version: TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows,
      });
    });
  }

  async removeRow(teamRunId: string): Promise<void> {
    await this.queueWrite(async () => {
      const index = await this.readIndexFile();
      const rows = index.rows.filter((row) => row.teamRunId !== teamRunId);
      if (rows.length === index.rows.length) {
        return;
      }
      await this.writeIndexFile({
        version: TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows,
      });
    });
  }

  private queueWrite(task: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.then(task, task);
    this.writeQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async readIndexFile(): Promise<TeamRunIndexFileRecord> {
    try {
      const raw = await fs.readFile(this.indexFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      const validated = parseIndexFile(parsed);
      if (!validated) {
        logger.warn(`Invalid team run history index format: ${this.indexFilePath}`);
        return createEmptyIndex();
      }
      return {
        version: TEAM_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows: validated.rows,
      };
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        logger.warn(`Failed reading team run history index: ${String(error)}`);
      }
      return createEmptyIndex();
    }
  }

  private async writeIndexFile(index: TeamRunIndexFileRecord): Promise<void> {
    const directory = path.dirname(this.indexFilePath);
    await fs.mkdir(directory, { recursive: true });
    const tempPath = createTempPath(this.indexFilePath);
    await fs.writeFile(tempPath, JSON.stringify(index, null, 2), "utf-8");
    await fs.rename(tempPath, this.indexFilePath);
  }
}
