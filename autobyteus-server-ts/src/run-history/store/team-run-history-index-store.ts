import fs from "node:fs/promises";
import path from "node:path";
import type {
  TeamRunIndexFileRecord,
  TeamRunIndexRowRecord,
} from "./team-run-history-index-record-types.js";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const allowedRowKeys = new Set([
  "teamRunId",
  "teamDefinitionId",
  "teamDefinitionName",
  "workspaceRootPath",
  "summary",
  "createdAt",
  "archivedAt",
  "terminatedAt",
]);

const createEmptyIndex = (): TeamRunIndexFileRecord => [];

const normalizeSafeTeamRunId = (value: string): string => {
  const teamRunId = value.trim();
  if (
    !teamRunId ||
    path.isAbsolute(teamRunId) ||
    path.posix.isAbsolute(teamRunId) ||
    path.win32.isAbsolute(teamRunId) ||
    /[\\/]/.test(teamRunId) ||
    teamRunId === "." ||
    teamRunId === ".."
  ) {
    throw new Error("teamRunId must be a safe team run identity.");
  }
  return teamRunId;
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return normalized;
};

const normalizeOptionalWorkspaceRootPath = (value: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? canonicalizeWorkspaceRootPath(trimmed) : null;
};

const normalizeOptionalTimestamp = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeRow = (row: TeamRunIndexRowRecord): TeamRunIndexRowRecord => ({
  teamRunId: normalizeSafeTeamRunId(row.teamRunId),
  teamDefinitionId: normalizeRequiredString(row.teamDefinitionId, "teamDefinitionId"),
  teamDefinitionName: normalizeRequiredString(row.teamDefinitionName, "teamDefinitionName"),
  workspaceRootPath: normalizeOptionalWorkspaceRootPath(row.workspaceRootPath),
  summary: row.summary.trim(),
  createdAt: normalizeRequiredString(row.createdAt, "createdAt"),
  archivedAt: normalizeOptionalTimestamp(row.archivedAt),
  terminatedAt: normalizeOptionalTimestamp(row.terminatedAt),
});

const parseIndexFile = (value: unknown): TeamRunIndexFileRecord | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const rows: TeamRunIndexRowRecord[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") {
      return null;
    }
    const candidate = row as Record<string, unknown>;
    if (Object.keys(candidate).some((key) => !allowedRowKeys.has(key))) {
      return null;
    }
    if (
      typeof candidate.teamRunId !== "string" ||
      typeof candidate.teamDefinitionId !== "string" ||
      typeof candidate.teamDefinitionName !== "string" ||
      (typeof candidate.workspaceRootPath !== "string" && candidate.workspaceRootPath !== null) ||
      typeof candidate.summary !== "string" ||
      typeof candidate.createdAt !== "string" ||
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
      rows.push(normalizeRow({
        teamRunId: candidate.teamRunId,
        teamDefinitionId: candidate.teamDefinitionId,
        teamDefinitionName: candidate.teamDefinitionName,
        workspaceRootPath: candidate.workspaceRootPath ?? null,
        summary: candidate.summary,
        createdAt: candidate.createdAt,
        archivedAt: candidate.archivedAt ?? null,
        terminatedAt: candidate.terminatedAt ?? null,
      }));
    } catch {
      return null;
    }
  }
  return rows;
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
    return this.readIndex();
  }

  async getRow(teamRunId: string): Promise<TeamRunIndexRowRecord | null> {
    const rows = await this.listRows();
    return rows.find((row) => row.teamRunId === teamRunId.trim()) ?? null;
  }

  async writeIndex(rows: TeamRunIndexFileRecord): Promise<void> {
    await this.queueWrite(async () => {
      await atomicWriteJsonFile(this.indexFilePath, rows.map(normalizeRow));
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
      const parsed = JSON.parse(raw) as unknown;
      const validated = parseIndexFile(parsed);
      if (!validated) {
        logger.warn(`Invalid team run history index format: ${this.indexFilePath}`);
        return createEmptyIndex();
      }
      return validated;
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        logger.warn(`Failed reading team run history index: ${String(error)}`);
      }
      return createEmptyIndex();
    }
  }
}
