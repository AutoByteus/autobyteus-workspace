import fs from "node:fs/promises";
import path from "node:path";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";
import type { AgentOrgRunIndexFileRecord, AgentOrgRunIndexRowRecord } from "./agent-org-run-history-index-record-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

export const AGENT_ORG_RUN_HISTORY_INDEX_FILE_NAME = "agent_org_run_history_index.json";

const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) throw new Error(`${label} is invalid.`);
  if ((label === "orgRunId") && (path.isAbsolute(value) || /[\\/]/.test(value) || value === "." || value === "..")) {
    throw new Error("orgRunId is not a safe identity.");
  }
  return value;
};
const optionalTimestamp = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  return required(value, label);
};
const normalize = (value: unknown): AgentOrgRunIndexRowRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AgentOrg history row must be an object.");
  const row = value as Record<string, unknown>;
  const expected = ["archivedAt", "createdAt", "orgDefinitionId", "orgDefinitionName", "orgRunId", "summary", "terminatedAt", "workspaceRootPath"];
  const actual = Object.keys(row).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("AgentOrg history row has unsupported or missing fields.");
  }
  if (row.workspaceRootPath !== null && typeof row.workspaceRootPath !== "string") throw new Error("workspaceRootPath is invalid.");
  return Object.freeze({
    orgRunId: required(row.orgRunId, "orgRunId"),
    orgDefinitionId: required(row.orgDefinitionId, "orgDefinitionId"),
    orgDefinitionName: required(row.orgDefinitionName, "orgDefinitionName"),
    workspaceRootPath: row.workspaceRootPath === null ? null : canonicalizeWorkspaceRootPath(required(row.workspaceRootPath, "workspaceRootPath")),
    summary: typeof row.summary === "string" ? row.summary.trim() : "",
    createdAt: required(row.createdAt, "createdAt"),
    archivedAt: optionalTimestamp(row.archivedAt, "archivedAt"),
    terminatedAt: optionalTimestamp(row.terminatedAt, "terminatedAt"),
  });
};

export class AgentOrgRunHistoryIndexStore {
  readonly filePath: string;
  private queue: Promise<void> = Promise.resolve();
  constructor(memoryDir: string) { this.filePath = path.join(path.resolve(memoryDir), AGENT_ORG_RUN_HISTORY_INDEX_FILE_NAME); }
  async readIndex(): Promise<AgentOrgRunIndexRowRecord[]> {
    await this.queue;
    try {
      const value = JSON.parse(await fs.readFile(this.filePath, "utf8")) as unknown;
      if (!Array.isArray(value)) throw new Error("AgentOrg history index must be an array.");
      return value.map(normalize);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  async writeIndex(rows: AgentOrgRunIndexFileRecord): Promise<void> {
    const normalized = rows.map(normalize).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const next = this.queue.then(() => atomicWriteJsonFile(this.filePath, normalized));
    this.queue = next.then(() => undefined, () => undefined);
    await next;
  }
}
