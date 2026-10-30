import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const SEEN_TOOL_NAMES_FILE_NAME = "seen_tool_names.json";
const RECORD_VERSION = 1;

/** A run as far as its seen tool names record is concerned. */
export type SeenToolNamesOwner = Readonly<{ runId: string; memoryDir: string | null }>;

/** `written`; `folder_missing` (no memory folder yet, retry later); `aborted` (stopped by `shouldContinue`). */
export type SeenToolNamesWriteResult = "written" | "folder_missing" | "aborted";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * The per-run record of the tool names a run was last given, at
 * `<memoryDir>/seen_tool_names.json` as `{ "version": 1, "toolNames": [...] }` (deleted with the
 * run's memory). Runs without a memory folder keep it in memory only. The rules are those of the
 * seen skill versions record: reads are tolerant (missing, unreadable or invalid all mean "no
 * record"); writes are atomic and never create or re-create the run's memory folder.
 */
export class SeenToolNamesStore {
  private readonly inMemory = new Map<string, readonly string[]>();

  /** The run's record, or null when it has none (missing, unreadable or invalid). */
  async read(owner: SeenToolNamesOwner): Promise<readonly string[] | null> {
    if (!owner.memoryDir) return this.inMemory.get(owner.runId) ?? null;
    const filePath = path.join(owner.memoryDir, SEEN_TOOL_NAMES_FILE_NAME);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn(`SEEN_TOOL_NAMES_UNREADABLE:${filePath}: ${String(error)}`);
      }
      return null;
    }
    try {
      return parseRecord(JSON.parse(raw));
    } catch (error) {
      logger.warn(`SEEN_TOOL_NAMES_INVALID:${filePath}: ${String(error)}`);
      return null;
    }
  }

  /**
   * Writes the run's record atomically into its **existing** memory folder, never creating it: a
   * missing folder is either not created yet by the runtime (`"folder_missing"`, the caller
   * retries later) or deleted with the run, which must not come back. `shouldContinue` is checked
   * before each step; once it says no (the run was released), nothing more is written.
   */
  async write(
    owner: SeenToolNamesOwner,
    toolNames: readonly string[],
    shouldContinue: () => boolean = () => true,
  ): Promise<SeenToolNamesWriteResult> {
    const sorted = Object.freeze([...new Set(toolNames)].sort());
    if (!owner.memoryDir) {
      this.inMemory.set(owner.runId, sorted);
      return "written";
    }
    if (!shouldContinue()) return "aborted";
    if (!(await isDirectory(owner.memoryDir))) return "folder_missing";
    if (!shouldContinue()) return "aborted";
    const filePath = path.join(owner.memoryDir, SEEN_TOOL_NAMES_FILE_NAME);
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      // `wx`: only into the folder as it is; never creates a missing one.
      await fs.writeFile(
        tempPath,
        `${JSON.stringify({ version: RECORD_VERSION, toolNames: sorted }, null, 2)}\n`,
        { encoding: "utf8", flag: "wx" },
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "folder_missing";
      throw error;
    }
    try {
      if (!shouldContinue()) return "aborted";
      await fs.rename(tempPath, filePath);
      return "written";
    } finally {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
    }
  }

  /** Forgets an in-memory record (runs without a memory folder); file records stay with the run. */
  forget(owner: SeenToolNamesOwner): void {
    if (!owner.memoryDir) this.inMemory.delete(owner.runId);
  }
}

const parseRecord = (value: unknown): readonly string[] => {
  const record = value as { version?: unknown; toolNames?: unknown } | null;
  if (!record || record.version !== RECORD_VERSION) throw new Error(`'version' must be ${RECORD_VERSION}.`);
  if (!Array.isArray(record.toolNames)) throw new Error("'toolNames' must be an array.");
  const names = record.toolNames.map((name, index) => {
    if (typeof name !== "string" || name.length === 0) throw new Error(`Tool name ${index} is not a name.`);
    return name;
  });
  return Object.freeze([...new Set(names)].sort());
};

const isDirectory = async (dir: string): Promise<boolean> => {
  try {
    return (await fs.stat(dir)).isDirectory();
  } catch {
    return false;
  }
};
