import fs from "node:fs/promises";
import path from "node:path";
import {
  AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
} from "./agent-run-history-index-record-types.js";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createEmptyIndex = (): AgentRunHistoryIndexFileRecord => ({
  version: AGENT_RUN_HISTORY_INDEX_RECORD_VERSION,
  rows: [],
});

const normalizeRow = (
  row: AgentRunHistoryIndexRowRecord,
): AgentRunHistoryIndexRowRecord => ({
  runId: row.runId,
  agentDefinitionId: row.agentDefinitionId,
  agentName: row.agentName,
  workspaceRootPath: row.workspaceRootPath,
  summary: row.summary,
  createdAt: row.createdAt,
  archivedAt: row.archivedAt ?? null,
  terminatedAt: row.terminatedAt ?? null,
});

const parseIndexFile = (value: unknown): AgentRunHistoryIndexFileRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (
    payload.version !== AGENT_RUN_HISTORY_INDEX_RECORD_VERSION ||
    !Array.isArray(payload.rows)
  ) {
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
      typeof candidate.createdAt !== "string"
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
        createdAt: candidate.createdAt,
        archivedAt:
          typeof candidate.archivedAt === "string" ? candidate.archivedAt : null,
        terminatedAt:
          typeof candidate.terminatedAt === "string" ? candidate.terminatedAt : null,
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
    await atomicWriteJsonFile(this.indexFilePath, index);
  }
}
