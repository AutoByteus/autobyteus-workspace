import fs from "node:fs/promises";
import path from "node:path";
import {
  RUN_HISTORY_INDEX_VERSION,
  RunHistoryIndexFile,
  RunHistoryIndexRow,
} from "../domain/models.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createEmptyIndex = (): RunHistoryIndexFile => ({
  version: RUN_HISTORY_INDEX_VERSION,
  rows: [],
});

const normalizeRow = (row: RunHistoryIndexRow): RunHistoryIndexRow => ({
  runId: row.runId,
  agentDefinitionId: row.agentDefinitionId,
  agentName: row.agentName,
  workspaceRootPath: row.workspaceRootPath,
  summary: row.summary,
  lastActivityAt: row.lastActivityAt,
  lastKnownStatus: row.lastKnownStatus,
});

const isRowLike = (value: unknown): value is RunHistoryIndexRow => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.runId === "string" &&
    typeof row.agentDefinitionId === "string" &&
    typeof row.agentName === "string" &&
    typeof row.workspaceRootPath === "string" &&
    typeof row.summary === "string" &&
    typeof row.lastActivityAt === "string" &&
    (row.lastKnownStatus === "ACTIVE" ||
      row.lastKnownStatus === "IDLE" ||
      row.lastKnownStatus === "ERROR")
  );
};

const validateIndex = (value: unknown): RunHistoryIndexFile | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.version !== "number" || !Array.isArray(payload.rows)) {
    return null;
  }
  const rows: RunHistoryIndexRow[] = [];
  for (const row of payload.rows) {
    if (!isRowLike(row)) {
      return null;
    }
    rows.push(normalizeRow(row));
  }
  return {
    version: payload.version,
    rows,
  };
};

export class RunHistoryIndexStore {
  private indexFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(memoryDir: string) {
    this.indexFilePath = path.join(memoryDir, "run_history_index.json");
  }

  async readIndex(): Promise<RunHistoryIndexFile> {
    await this.writeQueue;
    return this.readIndexDirect();
  }

  async listRows(): Promise<RunHistoryIndexRow[]> {
    const index = await this.readIndex();
    return index.rows;
  }

  async getRow(runId: string): Promise<RunHistoryIndexRow | null> {
    const rows = await this.listRows();
    return rows.find((row) => row.runId === runId) ?? null;
  }

  async writeIndex(index: RunHistoryIndexFile): Promise<void> {
    await this.enqueueWrite(async () => {
      const rows = index.rows.map(normalizeRow);
      await this.writeIndexDirect({
        version: RUN_HISTORY_INDEX_VERSION,
        rows,
      });
    });
  }

  async upsertRow(row: RunHistoryIndexRow): Promise<void> {
    await this.enqueueWrite(async () => {
      const index = await this.readIndexDirect();
      const rows = index.rows.filter((entry) => entry.runId !== row.runId);
      rows.push(normalizeRow(row));
      await this.writeIndexDirect({
        version: RUN_HISTORY_INDEX_VERSION,
        rows,
      });
    });
  }

  async updateRow(
    runId: string,
    patch: Partial<Omit<RunHistoryIndexRow, "runId">>,
  ): Promise<void> {
    await this.enqueueWrite(async () => {
      const index = await this.readIndexDirect();
      const current = index.rows.find((row) => row.runId === runId);
      if (!current) {
        return;
      }
      const next: RunHistoryIndexRow = {
        ...current,
        ...patch,
        runId,
      };
      const rows = index.rows
        .filter((row) => row.runId !== runId)
        .concat(normalizeRow(next));
      await this.writeIndexDirect({
        version: RUN_HISTORY_INDEX_VERSION,
        rows,
      });
    });
  }

  async removeRow(runId: string): Promise<void> {
    await this.enqueueWrite(async () => {
      const index = await this.readIndexDirect();
      const rows = index.rows.filter((row) => row.runId !== runId);
      if (rows.length === index.rows.length) {
        return;
      }
      await this.writeIndexDirect({
        version: RUN_HISTORY_INDEX_VERSION,
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

  private async readIndexDirect(): Promise<RunHistoryIndexFile> {
    try {
      const raw = await fs.readFile(this.indexFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      const validated = validateIndex(parsed);
      if (!validated) {
        logger.warn(`Invalid run history index file format: ${this.indexFilePath}`);
        return createEmptyIndex();
      }
      return {
        version: RUN_HISTORY_INDEX_VERSION,
        rows: validated.rows,
      };
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(`Failed reading run history index: ${message}`);
      }
      return createEmptyIndex();
    }
  }

  private async writeIndexDirect(index: RunHistoryIndexFile): Promise<void> {
    const directory = path.dirname(this.indexFilePath);
    await fs.mkdir(directory, { recursive: true });
    const tempPath = `${this.indexFilePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(index, null, 2), "utf-8");
    await fs.rename(tempPath, this.indexFilePath);
  }
}
