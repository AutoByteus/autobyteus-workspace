import fs from "node:fs/promises";
import path from "node:path";
import {
  TEAM_RUN_HISTORY_INDEX_VERSION,
  TeamRunDeleteLifecycle,
  TeamRunIndexFile,
  TeamRunIndexRow,
  TeamRunKnownStatus,
} from "../domain/team-models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createEmptyIndex = (): TeamRunIndexFile => ({
  version: TEAM_RUN_HISTORY_INDEX_VERSION,
  rows: [],
});

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const normalizeStatus = (value: TeamRunKnownStatus): TeamRunKnownStatus => {
  if (value === "ERROR") {
    return "ERROR";
  }
  if (value === "IDLE") {
    return "IDLE";
  }
  return "ACTIVE";
};

const normalizeDeleteLifecycle = (value: TeamRunDeleteLifecycle): TeamRunDeleteLifecycle => {
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

const normalizeRow = (row: TeamRunIndexRow): TeamRunIndexRow => ({
  teamRunId: row.teamRunId.trim(),
  teamDefinitionId: row.teamDefinitionId.trim(),
  teamDefinitionName: row.teamDefinitionName.trim(),
  workspaceRootPath: normalizeOptionalWorkspaceRootPath(row.workspaceRootPath),
  summary: row.summary.trim(),
  lastActivityAt: row.lastActivityAt,
  lastKnownStatus: normalizeStatus(row.lastKnownStatus),
  deleteLifecycle: normalizeDeleteLifecycle(row.deleteLifecycle),
});

const isRowLike = (value: unknown): value is TeamRunIndexRow => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.teamRunId === "string" &&
    typeof row.teamDefinitionId === "string" &&
    typeof row.teamDefinitionName === "string" &&
    (typeof row.workspaceRootPath === "string" ||
      row.workspaceRootPath === null ||
      row.workspaceRootPath === undefined) &&
    typeof row.summary === "string" &&
    typeof row.lastActivityAt === "string" &&
    (row.lastKnownStatus === "ACTIVE" || row.lastKnownStatus === "IDLE" || row.lastKnownStatus === "ERROR") &&
    (row.deleteLifecycle === "READY" || row.deleteLifecycle === "CLEANUP_PENDING")
  );
};

const validateIndex = (value: unknown): TeamRunIndexFile | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.version !== "number" || !Array.isArray(payload.rows)) {
    return null;
  }
  const rows: TeamRunIndexRow[] = [];
  for (const row of payload.rows) {
    if (!isRowLike(row)) {
      return null;
    }
    const normalizedRow = row as unknown as Record<string, unknown>;
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
        lastKnownStatus: normalizedRow.lastKnownStatus as TeamRunKnownStatus,
        deleteLifecycle: normalizedRow.deleteLifecycle as TeamRunDeleteLifecycle,
      }),
    );
  }
  return {
    version: payload.version,
    rows,
  };
};

export class TeamRunIndexStore {
  private readonly indexFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(memoryDir: string) {
    this.indexFilePath = path.join(memoryDir, "team_run_history_index.json");
  }

  async readIndex(): Promise<TeamRunIndexFile> {
    await this.writeQueue;
    return this.readIndexDirect();
  }

  async listRows(): Promise<TeamRunIndexRow[]> {
    const index = await this.readIndex();
    return index.rows;
  }

  async getRow(teamRunId: string): Promise<TeamRunIndexRow | null> {
    const rows = await this.listRows();
    return rows.find((row) => row.teamRunId === teamRunId) ?? null;
  }

  async writeIndex(index: TeamRunIndexFile): Promise<void> {
    await this.enqueueWrite(async () => {
      await this.writeIndexDirect({
        version: TEAM_RUN_HISTORY_INDEX_VERSION,
        rows: index.rows.map(normalizeRow),
      });
    });
  }

  async upsertRow(row: TeamRunIndexRow): Promise<void> {
    await this.enqueueWrite(async () => {
      const index = await this.readIndexDirect();
      const rows = index.rows.filter((entry) => entry.teamRunId !== row.teamRunId);
      rows.push(normalizeRow(row));
      await this.writeIndexDirect({
        version: TEAM_RUN_HISTORY_INDEX_VERSION,
        rows,
      });
    });
  }

  async updateRow(
    teamRunId: string,
    patch: Partial<Omit<TeamRunIndexRow, "teamRunId">>,
  ): Promise<void> {
    await this.enqueueWrite(async () => {
      const index = await this.readIndexDirect();
      const current = index.rows.find((row) => row.teamRunId === teamRunId);
      if (!current) {
        return;
      }
      const next: TeamRunIndexRow = normalizeRow({
        ...current,
        ...patch,
        teamRunId,
      });
      const rows = index.rows
        .filter((row) => row.teamRunId !== teamRunId)
        .concat(next);
      await this.writeIndexDirect({
        version: TEAM_RUN_HISTORY_INDEX_VERSION,
        rows,
      });
    });
  }

  async removeRow(teamRunId: string): Promise<void> {
    await this.enqueueWrite(async () => {
      const index = await this.readIndexDirect();
      const rows = index.rows.filter((row) => row.teamRunId !== teamRunId);
      if (rows.length === index.rows.length) {
        return;
      }
      await this.writeIndexDirect({
        version: TEAM_RUN_HISTORY_INDEX_VERSION,
        rows,
      });
    });
  }

  private enqueueWrite(task: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.then(task, task);
    this.writeQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async readIndexDirect(): Promise<TeamRunIndexFile> {
    try {
      const raw = await fs.readFile(this.indexFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      const validated = validateIndex(parsed);
      if (!validated) {
        logger.warn(`Invalid team run history index format: ${this.indexFilePath}`);
        return createEmptyIndex();
      }
      return {
        version: TEAM_RUN_HISTORY_INDEX_VERSION,
        rows: validated.rows,
      };
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        logger.warn(`Failed reading team run history index: ${String(error)}`);
      }
      return createEmptyIndex();
    }
  }

  private async writeIndexDirect(index: TeamRunIndexFile): Promise<void> {
    const directory = path.dirname(this.indexFilePath);
    await fs.mkdir(directory, { recursive: true });
    const tempPath = createTempPath(this.indexFilePath);
    await fs.writeFile(tempPath, JSON.stringify(index, null, 2), "utf-8");
    await fs.rename(tempPath, this.indexFilePath);
  }
}
