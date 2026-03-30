import fs from "node:fs/promises";
import path from "node:path";
import {
  AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
} from "./agent-run-history-index-record-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createEmptyIndex = (): AgentRunHistoryIndexFileRecord => ({
  version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
  rows: [],
});

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const normalizeRow = (
  row: AgentRunHistoryIndexRowRecord,
): AgentRunHistoryIndexRowRecord => ({
  runId: row.runId,
  agentDefinitionId: row.agentDefinitionId,
  agentName: row.agentName,
  workspaceRootPath: row.workspaceRootPath,
  summary: row.summary,
  lastActivityAt: row.lastActivityAt,
  lastKnownStatus: row.lastKnownStatus,
});

const parseIndexFile = (value: unknown): AgentRunHistoryIndexFileRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.version !== "number" || !Array.isArray(payload.rows)) {
    return null;
  }
  const rows: AgentRunHistoryIndexRowRecord[] = [];
  for (const row of payload.rows) {
    if (!row || typeof row !== "object") {
      return null;
    }
    const candidate = row as Record<string, unknown>;
    if (
      typeof candidate.runId !== "string" ||
      typeof candidate.agentDefinitionId !== "string" ||
      typeof candidate.agentName !== "string" ||
      typeof candidate.workspaceRootPath !== "string" ||
      typeof candidate.summary !== "string" ||
      typeof candidate.lastActivityAt !== "string" ||
      (candidate.lastKnownStatus !== "ACTIVE" &&
        candidate.lastKnownStatus !== "IDLE" &&
        candidate.lastKnownStatus !== "ERROR" &&
        candidate.lastKnownStatus !== "TERMINATED")
    ) {
      return null;
    }
    rows.push(
      normalizeRow({
        runId: candidate.runId,
        agentDefinitionId: candidate.agentDefinitionId,
        agentName: candidate.agentName,
        workspaceRootPath: candidate.workspaceRootPath,
        summary: candidate.summary,
        lastActivityAt: candidate.lastActivityAt,
        lastKnownStatus: candidate.lastKnownStatus,
      }),
    );
  }
  return {
    version: payload.version,
    rows,
  };
};

export class AgentRunHistoryIndexStore {
  private indexFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(memoryDir: string) {
    this.indexFilePath = path.join(memoryDir, "run_history_index.json");
  }

  async readIndex(): Promise<AgentRunHistoryIndexFileRecord> {
    await this.writeQueue;
    return this.readIndexFile();
  }

  async listRows(): Promise<AgentRunHistoryIndexRowRecord[]> {
    const index = await this.readIndex();
    return index.rows;
  }

  async getRow(runId: string): Promise<AgentRunHistoryIndexRowRecord | null> {
    const rows = await this.listRows();
    return rows.find((row) => row.runId === runId) ?? null;
  }

  async writeIndex(index: AgentRunHistoryIndexFileRecord): Promise<void> {
    await this.queueWrite(async () => {
      const rows = index.rows.map(normalizeRow);
      await this.writeIndexFile({
        version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows,
      });
    });
  }

  async upsertRow(row: AgentRunHistoryIndexRowRecord): Promise<void> {
    await this.queueWrite(async () => {
      const index = await this.readIndexFile();
      const rows = index.rows.filter((entry) => entry.runId !== row.runId);
      rows.push(normalizeRow(row));
      await this.writeIndexFile({
        version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows,
      });
    });
  }

  async updateRow(
    runId: string,
    patch: Partial<Omit<AgentRunHistoryIndexRowRecord, "runId">>,
  ): Promise<void> {
    await this.queueWrite(async () => {
      const index = await this.readIndexFile();
      const current = index.rows.find((row) => row.runId === runId);
      if (!current) {
        return;
      }
      const next: AgentRunHistoryIndexRowRecord = {
        ...current,
        ...patch,
        runId,
      };
      const rows = index.rows
        .filter((row) => row.runId !== runId)
        .concat(normalizeRow(next));
      await this.writeIndexFile({
        version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
        rows,
      });
    });
  }

  async removeRow(runId: string): Promise<void> {
    await this.queueWrite(async () => {
      const index = await this.readIndexFile();
      const rows = index.rows.filter((row) => row.runId !== runId);
      if (rows.length === index.rows.length) {
        return;
      }
      await this.writeIndexFile({
        version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
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

  private async readIndexFile(): Promise<AgentRunHistoryIndexFileRecord> {
    try {
      const raw = await fs.readFile(this.indexFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      const validated = parseIndexFile(parsed);
      if (!validated) {
        logger.warn(`Invalid run history index file format: ${this.indexFilePath}`);
        return createEmptyIndex();
      }
      return {
        version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
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

  private async writeIndexFile(index: AgentRunHistoryIndexFileRecord): Promise<void> {
    const directory = path.dirname(this.indexFilePath);
    await fs.mkdir(directory, { recursive: true });
    const tempPath = createTempPath(this.indexFilePath);
    await fs.writeFile(tempPath, JSON.stringify(index, null, 2), "utf-8");
    await fs.rename(tempPath, this.indexFilePath);
  }
}
