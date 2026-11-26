import path from "node:path";
import { readJsonFile, writeJsonFile } from "../persistence/file/store-utils.js";
import { createServerLogger } from "../logging/server-app-logger.js";

const logger = createServerLogger("sandboxes.records");

export type SandboxState = "starting" | "ready" | "removing";

/** C6: one sandbox this host node created and has not removed yet. */
export type SandboxRecord = Readonly<{
  sandboxId: string;
  /** The sandbox node's node ID, learned at pairing (`null` while it starts). */
  nodeId: string | null;
  image: string;
  workspaceFolder: string;
  runMemoryFolder: string;
  hostPort: number;
  createdAt: string;
  expiresAt: string;
  /** The run that created it: only it, or the owner, may use or remove it. */
  createdByRunId: string;
  state: SandboxState;
}>;

const STATES: readonly SandboxState[] = ["starting", "ready", "removing"];
const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const parseRecord = (value: unknown): SandboxRecord | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isString(row.sandboxId) || !isString(row.image) || !isString(row.workspaceFolder) || !isString(row.runMemoryFolder)
    || typeof row.hostPort !== "number" || !isString(row.createdAt) || !isString(row.expiresAt)
    || !isString(row.createdByRunId) || !STATES.includes(row.state as SandboxState)
    || !(row.nodeId === null || isString(row.nodeId))) return null;
  return Object.freeze({
    sandboxId: row.sandboxId, nodeId: row.nodeId as string | null, image: row.image,
    workspaceFolder: row.workspaceFolder, runMemoryFolder: row.runMemoryFolder, hostPort: row.hostPort,
    createdAt: row.createdAt, expiresAt: row.expiresAt, createdByRunId: row.createdByRunId, state: row.state as SandboxState,
  });
};

/**
 * `<appDataDir>/sandboxes/sandboxes.json` (`{ "sandboxes": [...] }`), the C6 list. A missing file is empty. An
 * unreadable entry is logged and left out (DESIGN rule 7); the start sweep still finds its container by label. Only
 * `SandboxManager` uses it, one change at a time.
 */
export class SandboxRecordsStore {
  private readonly filePath: string;

  constructor(appDataDir: string) {
    this.filePath = path.join(appDataDir, "sandboxes", "sandboxes.json");
  }

  async read(): Promise<readonly SandboxRecord[]> {
    const raw = await readJsonFile<{ sandboxes?: unknown }>(this.filePath, { sandboxes: [] });
    const rows = Array.isArray(raw?.sandboxes) ? raw.sandboxes : [];
    const records: SandboxRecord[] = [];
    rows.forEach((row, index) => {
      const record = parseRecord(row);
      if (record) records.push(record);
      else logger.warn(`Sandbox record ${index} in sandboxes.json cannot be read; it is left out.`);
    });
    return records;
  }

  async write(records: readonly SandboxRecord[]): Promise<void> {
    await writeJsonFile(this.filePath, { sandboxes: records });
  }
}
