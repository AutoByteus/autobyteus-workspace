import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import type { AppDataMigrationItemDetail, AppDataMigrationSummary } from "../domain/app-data-migration-types.js";

export const OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME = "raw_traces.jsonl";
const IMPORTS_DIR_NAME = "imports";
const MEMORY_SYNC_MANIFEST_FILE_NAME = "sync-manifest.json";

type ImportManifestRewrite = {
  manifestPath: string;
  kind: "agents" | "agent_teams";
  oldRelativePath: string;
  newRelativePath: string;
};

export type RawTraceActiveFileCandidate = {
  itemId: string;
  runDir: string;
  oldFilePath: string;
  newFilePath: string;
  importManifestRewrite?: ImportManifestRewrite;
};

export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const toPosixRelativePath = (value: string): string =>
  value.split(path.sep).filter(Boolean).join("/");

const readDirentsIfPresent = async (dirPath: string): Promise<Dirent[]> => {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

type CollectOptions = {
  memoryDir: string;
  importRootDir?: string;
  importKind?: "agents" | "agent_teams";
};

const buildImportManifestRewrite = (
  dirPath: string,
  options: CollectOptions,
): ImportManifestRewrite | undefined => {
  if (!options.importRootDir || !options.importKind) {
    return undefined;
  }
  const kindRoot = path.join(options.importRootDir, options.importKind);
  const runRelativePath = toPosixRelativePath(path.relative(kindRoot, dirPath));
  const oldRelativePath = toPosixRelativePath(path.posix.join(runRelativePath, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME));
  const newRelativePath = toPosixRelativePath(path.posix.join(runRelativePath, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME));
  return {
    manifestPath: path.join(options.importRootDir, MEMORY_SYNC_MANIFEST_FILE_NAME),
    kind: options.importKind,
    oldRelativePath,
    newRelativePath,
  };
};

const collectCandidatesUnder = async (
  dirPath: string,
  options: CollectOptions,
  output: Map<string, RawTraceActiveFileCandidate>,
): Promise<void> => {
  const dirents = await readDirentsIfPresent(dirPath);
  const oldFilePath = path.join(dirPath, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
  if (await exists(oldFilePath)) {
    output.set(dirPath, {
      itemId: toPosixRelativePath(path.relative(options.memoryDir, dirPath)) || ".",
      runDir: dirPath,
      oldFilePath,
      newFilePath: path.join(dirPath, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
      importManifestRewrite: buildImportManifestRewrite(dirPath, options),
    });
  }
  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      await collectCandidatesUnder(path.join(dirPath, dirent.name), options, output);
    }
  }
};

export const discoverRawTraceActiveFileCandidates = async (
  memoryDir: string,
): Promise<RawTraceActiveFileCandidate[]> => {
  const output = new Map<string, RawTraceActiveFileCandidate>();
  await collectCandidatesUnder(path.join(memoryDir, "agents"), { memoryDir }, output);
  await collectCandidatesUnder(path.join(memoryDir, "agent_teams"), { memoryDir }, output);

  const importsDir = path.join(memoryDir, IMPORTS_DIR_NAME);
  for (const sourceEntry of await readDirentsIfPresent(importsDir)) {
    if (!sourceEntry.isDirectory()) {
      continue;
    }
    const importRootDir = path.join(importsDir, sourceEntry.name);
    await collectCandidatesUnder(path.join(importRootDir, "agents"), {
      memoryDir,
      importRootDir,
      importKind: "agents",
    }, output);
    await collectCandidatesUnder(path.join(importRootDir, "agent_teams"), {
      memoryDir,
      importRootDir,
      importKind: "agent_teams",
    }, output);
  }

  return [...output.values()].sort((left, right) => left.itemId.localeCompare(right.itemId));
};

const tempPath = (filePath: string): string => `${filePath}.${process.pid}.${Date.now()}.tmp`;

const writeJsonAtomic = async (filePath: string, payload: unknown): Promise<void> => {
  const tmp = tempPath(filePath);
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, filePath);
};

type MutableManifest = {
  files?: Record<string, Record<string, unknown>>;
  totals?: Record<string, unknown>;
  [key: string]: unknown;
};

const updateImportedManifest = async (rewrite: ImportManifestRewrite): Promise<boolean> => {
  if (!(await exists(rewrite.manifestPath))) {
    return false;
  }
  const manifest = JSON.parse(await fs.readFile(rewrite.manifestPath, "utf-8")) as MutableManifest;
  const files = manifest.files && typeof manifest.files === "object" ? manifest.files : null;
  if (!files) {
    return false;
  }
  const oldKey = `${rewrite.kind}/${rewrite.oldRelativePath}`;
  const oldRecord = files[oldKey];
  if (!oldRecord) {
    return false;
  }
  const newKey = `${rewrite.kind}/${rewrite.newRelativePath}`;
  delete files[oldKey];
  files[newKey] = {
    ...oldRecord,
    kind: rewrite.kind,
    relativePath: rewrite.newRelativePath,
  };
  if (manifest.totals && typeof manifest.totals === "object") {
    manifest.totals = {
      ...manifest.totals,
      fileCount: Object.keys(files).length,
    };
  }
  await writeJsonAtomic(rewrite.manifestPath, manifest);
  return true;
};

export const migrateRawTraceActiveFileCandidate = async (
  candidate: RawTraceActiveFileCandidate,
): Promise<AppDataMigrationItemDetail> => {
  try {
    await fs.rename(candidate.oldFilePath, candidate.newFilePath);
    const manifestUpdated = candidate.importManifestRewrite
      ? await updateImportedManifest(candidate.importManifestRewrite)
      : false;
    return {
      itemId: candidate.itemId,
      filePath: candidate.newFilePath,
      status: "MIGRATED",
      message: manifestUpdated
        ? "Renamed active raw trace file to raw_traces_active.jsonl and updated imported Memory Sync manifest."
        : "Renamed active raw trace file to raw_traces_active.jsonl.",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        itemId: candidate.itemId,
        filePath: candidate.oldFilePath,
        status: "SKIPPED",
        message: "Old active raw trace file was already absent.",
      };
    }
    return {
      itemId: candidate.itemId,
      filePath: candidate.oldFilePath,
      status: "FAILED",
      message: error instanceof Error ? error.message : String(error),
    };
  }
};
