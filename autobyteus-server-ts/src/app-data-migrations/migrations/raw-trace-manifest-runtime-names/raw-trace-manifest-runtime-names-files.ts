import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_MANIFEST_FILE_NAME } from "../../frozen/autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import type { AppDataMigrationItemDetail } from "../../domain/app-data-migration-types.js";

/**
 * Frozen shapes of this migration (sealed area: it imports neither `RuntimeKind` nor the library).
 * Older writers stored the agent runtime of a manifest entry as a short label; the code's one spelling is the
 * `RuntimeKind` value. A test asserts that the target values equal `Object.values(RuntimeKind)`.
 */
export const OLD_RUNTIME_LABELS: Readonly<Record<string, string>> = Object.freeze({
  CODEX: "codex_app_server",
  CLAUDE: "claude_agent_sdk",
  ANTIGRAVITY: "antigravity_cli",
  GROK_BUILD: "grok_build",
  AUTOBYTEUS: "autobyteus",
});
export const CURRENT_RUNTIME_VALUES: ReadonlySet<string> = new Set(Object.values(OLD_RUNTIME_LABELS));

/** The temporary file of one folder: a fixed name, so an interrupted attempt leaves at most one. The Memory Sync scanner skips `.tmp`. */
export const MANIFEST_TEMP_FILE_NAME = `${RAW_TRACES_MANIFEST_FILE_NAME}.tmp`;

/** Folder depths under the memory root that hold this node's own runs. */
const FAMILY_DEPTHS: readonly (readonly [string, number])[] = [["agents", 1], ["agent_teams", 2], ["agent_orgs", 3]];

export type ManifestDecision =
  | Readonly<{ kind: "current" }>
  | Readonly<{ kind: "convert"; manifest: Record<string, unknown>; convertedEntries: number }>
  | Readonly<{ kind: "unusable"; reason: string }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Pure: structure in, decision out. Only an old label is converted; every other key, value and the order stay. */
export const decideManifest = (parsed: unknown): ManifestDecision => {
  if (!isRecord(parsed)) return { kind: "unusable", reason: "the manifest is not a JSON object" };
  if (!Array.isArray(parsed.segments)) return { kind: "unusable", reason: "the manifest has no segment list" };
  let convertedEntries = 0;
  const segments: unknown[] = [];
  for (const [position, entry] of parsed.segments.entries()) {
    if (!isRecord(entry)) return { kind: "unusable", reason: `segment ${position} is not an object` };
    const value = entry.runtime_kind;
    if (value === undefined || value === null) {
      segments.push(entry);
    } else if (typeof value !== "string") {
      return { kind: "unusable", reason: `segment ${position} has a runtime_kind that is not text` };
    } else if (Object.hasOwn(OLD_RUNTIME_LABELS, value)) {
      convertedEntries += 1;
      segments.push({ ...entry, runtime_kind: OLD_RUNTIME_LABELS[value] });
    } else if (CURRENT_RUNTIME_VALUES.has(value)) {
      segments.push(entry);
    } else {
      return { kind: "unusable", reason: `segment ${position} has an unknown runtime_kind value` };
    }
  }
  return convertedEntries === 0 ? { kind: "current" } : { kind: "convert", manifest: { ...parsed, segments }, convertedEntries };
};

const toPosixRelativePath = (value: string): string => value.split(path.sep).filter(Boolean).join("/");

const subfolders = async (dirPath: string): Promise<string[]> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw error;
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(dirPath, entry.name)).sort();
};

/** The run folders of the three families, at exactly their depths; imports and other folders are never visited. */
export const discoverRunFolders = async (memoryDir: string): Promise<string[]> => {
  const folders: string[] = [];
  for (const [family, depth] of FAMILY_DEPTHS) {
    let level = [path.join(memoryDir, family)];
    for (let step = 0; step < depth; step += 1) {
      level = (await Promise.all(level.map(subfolders))).flat();
    }
    folders.push(...level);
  }
  return folders;
};

export type ManifestOutcome =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "current" }>
  | Readonly<{ kind: "converted"; detail: AppDataMigrationItemDetail }>
  | Readonly<{ kind: "excluded"; detail: AppDataMigrationItemDetail }>
  | Readonly<{ kind: "failed"; detail: AppDataMigrationItemDetail }>;

const isFile = async (filePath: string): Promise<boolean | "unreadable"> => {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOTDIR" ? false : "unreadable";
  }
};

const removeQuietly = async (filePath: string): Promise<void> => {
  await fs.rm(filePath, { force: true }).catch(() => undefined);
};

/** Re-reads the temporary file: same entries and keys as the source, every runtime value current or absent. */
const validateTemporaryFile = async (tempPath: string, source: Record<string, unknown>, expected: Record<string, unknown>): Promise<void> => {
  const written = JSON.parse(await fs.readFile(tempPath, "utf-8")) as unknown;
  if (JSON.stringify(written) !== JSON.stringify(expected)) throw new Error("the rewritten manifest differs from the converted one");
  const entries = (isRecord(written) && Array.isArray(written.segments) ? written.segments : []) as Record<string, unknown>[];
  const originals = source.segments as Record<string, unknown>[];
  if (entries.length !== originals.length) throw new Error("the rewritten manifest has another number of entries");
  entries.forEach((entry, position) => {
    const value = entry.runtime_kind;
    if (value !== undefined && value !== null && !CURRENT_RUNTIME_VALUES.has(value as string)) {
      throw new Error(`entry ${position} still holds a runtime_kind that is not a current value`);
    }
    const { runtime_kind: _converted, ...rest } = entry;
    const { runtime_kind: _original, ...originalRest } = originals[position]!;
    if (JSON.stringify(rest) !== JSON.stringify(originalRest)) throw new Error(`entry ${position} changed beyond runtime_kind`);
  });
};

/** One run folder: decide by structure; convert through a validated temporary file and an atomic rename. */
export const migrateManifest = async (memoryDir: string, runDir: string): Promise<ManifestOutcome> => {
  const manifestPath = path.join(runDir, RAW_TRACES_MANIFEST_FILE_NAME);
  const tempPath = path.join(runDir, MANIFEST_TEMP_FILE_NAME);
  const itemId = toPosixRelativePath(path.relative(memoryDir, runDir));
  const present = await isFile(manifestPath);
  if (present === false) return { kind: "absent" };
  const excluded = (reason: string): ManifestOutcome => ({
    kind: "excluded",
    detail: { itemId, filePath: manifestPath, status: "SKIPPED", message: `Kept as it is: ${reason}.` },
  });
  if (present === "unreadable") return excluded("the manifest cannot be read");
  // Only this migration writes this name, and nothing runs during the startup run: a leftover is an interrupted attempt.
  await removeQuietly(tempPath);

  let source: unknown;
  try {
    source = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  } catch (error) {
    return excluded(error instanceof SyntaxError ? "the manifest is not valid JSON" : "the manifest cannot be read");
  }
  const decision = decideManifest(source);
  if (decision.kind === "current") return { kind: "current" };
  if (decision.kind === "unusable") return excluded(decision.reason);

  try {
    const handle = await fs.open(tempPath, "w");
    try {
      await handle.writeFile(JSON.stringify(decision.manifest), "utf-8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await validateTemporaryFile(tempPath, source as Record<string, unknown>, decision.manifest);
    await fs.rename(tempPath, manifestPath);
  } catch (error) {
    await removeQuietly(tempPath);
    return {
      kind: "failed",
      detail: {
        itemId,
        filePath: manifestPath,
        status: "FAILED",
        message: `Could not convert the manifest; it is unchanged: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  return {
    kind: "converted",
    detail: {
      itemId,
      filePath: manifestPath,
      status: "MIGRATED",
      message: `Converted ${decision.convertedEntries} runtime name${decision.convertedEntries === 1 ? "" : "s"} to the RuntimeKind values.`,
    },
  };
};
