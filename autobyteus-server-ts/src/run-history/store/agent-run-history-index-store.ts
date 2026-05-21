import fs from "node:fs/promises";
import path from "node:path";
import type {
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
} from "./agent-run-history-index-record-types.js";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createEmptyIndex = (): AgentRunHistoryIndexFileRecord => [];

const allowedRowKeys = new Set([
  "runId",
  "agentDefinitionId",
  "agentName",
  "workspaceRootPath",
  "summary",
  "createdAt",
  "archivedAt",
  "terminatedAt",
]);

const normalizeSafeRunId = (value: string): string => {
  const runId = value.trim();
  if (
    !runId ||
    path.isAbsolute(runId) ||
    path.posix.isAbsolute(runId) ||
    path.win32.isAbsolute(runId) ||
    /[\\/]/.test(runId) ||
    runId === "." ||
    runId === ".."
  ) {
    throw new Error("runId must be a safe standalone run identity.");
  }
  return runId;
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return trimmed;
};

const normalizeRow = (
  row: AgentRunHistoryIndexRowRecord,
): AgentRunHistoryIndexRowRecord => ({
  runId: normalizeSafeRunId(row.runId),
  agentDefinitionId: normalizeRequiredString(row.agentDefinitionId, "agentDefinitionId"),
  agentName: normalizeRequiredString(row.agentName, "agentName"),
  workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
  summary: row.summary,
  createdAt: normalizeRequiredString(row.createdAt, "createdAt"),
  archivedAt: row.archivedAt ?? null,
  terminatedAt: row.terminatedAt ?? null,
});

const parseIndexFile = (value: unknown): AgentRunHistoryIndexFileRecord | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const rows: AgentRunHistoryIndexRowRecord[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") {
      return null;
    }
    const candidate = row as Record<string, unknown>;
    if (Object.keys(candidate).some((key) => !allowedRowKeys.has(key))) {
      return null;
    }
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
    if (
      !(
        candidate.archivedAt === undefined ||
        candidate.archivedAt === null ||
        typeof candidate.archivedAt === "string"
      ) ||
      !(
        candidate.terminatedAt === undefined ||
        candidate.terminatedAt === null ||
        typeof candidate.terminatedAt === "string"
      )
    ) {
      return null;
    }
    try {
      rows.push(
        normalizeRow({
          runId: candidate.runId,
          agentDefinitionId: candidate.agentDefinitionId,
          agentName: candidate.agentName,
          workspaceRootPath: candidate.workspaceRootPath,
          summary: candidate.summary,
          createdAt: candidate.createdAt,
          archivedAt: candidate.archivedAt ?? null,
          terminatedAt: candidate.terminatedAt ?? null,
        }),
      );
    } catch {
      return null;
    }
  }
  return rows;
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
    return this.readIndex();
  }

  async getRow(runId: string): Promise<AgentRunHistoryIndexRowRecord | null> {
    const rows = await this.listRows();
    return rows.find((row) => row.runId === runId) ?? null;
  }

  async writeIndex(rows: AgentRunHistoryIndexFileRecord): Promise<void> {
    await this.queueWrite(async () => {
      await this.writeIndexFile(rows.map(normalizeRow));
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
      return validated;
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(`Failed reading run history index: ${message}`);
      }
      return createEmptyIndex();
    }
  }

  private async writeIndexFile(rows: AgentRunHistoryIndexFileRecord): Promise<void> {
    await atomicWriteJsonFile(this.indexFilePath, rows);
  }
}
