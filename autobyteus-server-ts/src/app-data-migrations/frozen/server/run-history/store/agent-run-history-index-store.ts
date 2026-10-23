import path from "node:path";
import type {
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
} from "./agent-run-history-index-record-types.js";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

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
  ...(row.hasCollaboration === true ? { hasCollaboration: true as const } : {}),
});

export class AgentRunHistoryIndexStore {
  private indexFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(memoryDir: string) {
    this.indexFilePath = path.join(memoryDir, "run_history_index.json");
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

  private async writeIndexFile(rows: AgentRunHistoryIndexFileRecord): Promise<void> {
    await atomicWriteJsonFile(this.indexFilePath, rows);
  }
}
