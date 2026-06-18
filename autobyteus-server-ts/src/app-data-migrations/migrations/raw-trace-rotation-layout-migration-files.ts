import fs from "node:fs/promises";
import path from "node:path";
import {
  buildRawTraceSegmentFileName,
  RAW_TRACES_ARCHIVE_DIR_NAME,
  RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME,
  RAW_TRACES_MANIFEST_FILE_NAME,
  type RawTraceArchiveManifest,
  type RawTraceArchiveSegmentEntry,
} from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import type { AppDataMigrationItemDetail, AppDataMigrationSummary } from "../domain/app-data-migration-types.js";

export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;

export const asManifest = (value: unknown): RawTraceArchiveManifest => {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  if (!record) {
    throw new Error("Raw trace manifest JSON root is not an object.");
  }
  if (!Array.isArray(record.segments)) {
    throw new Error("Raw trace manifest segments field is not an array.");
  }
  return {
    schema_version: 1,
    next_segment_index: Math.max(1, Number(record.next_segment_index) || 1),
    segments: record.segments as RawTraceArchiveSegmentEntry[],
  };
};

export const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

export const timestampSuffix = (): string => new Date().toISOString().replace(/[:.]/g, "-");
const tempPath = (filePath: string): string => `${filePath}.${process.pid}.${Date.now()}.tmp`;

export const writeJsonAtomic = async (filePath: string, payload: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = tempPath(filePath);
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, filePath);
};

export const sameFileContent = async (left: string, right: string): Promise<boolean> => {
  try {
    const [leftBytes, rightBytes] = await Promise.all([fs.readFile(left), fs.readFile(right)]);
    return leftBytes.equals(rightBytes);
  } catch {
    return false;
  }
};

export const safeRelativePath = (value: string): string => {
  const normalized = value.trim();
  if (!normalized || path.isAbsolute(normalized) || path.posix.isAbsolute(normalized) || path.win32.isAbsolute(normalized)) {
    throw new Error(`Invalid raw trace segment file_name '${value}'.`);
  }
  return normalized;
};

export const resolveOldSegmentPath = (runDir: string, fileName: string): string => {
  const relative = safeRelativePath(fileName);
  const candidate = relative.includes("/") || relative.includes("\\")
    ? path.resolve(runDir, relative)
    : path.resolve(runDir, RAW_TRACES_ARCHIVE_DIR_NAME, relative);
  return resolveInsideRunDir(runDir, candidate, fileName);
};

const resolveInsideRunDir = (runDir: string, candidatePath: string, displayPath: string): string => {
  const root = path.resolve(runDir);
  if (candidatePath !== root && !candidatePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Invalid raw trace segment path outside run directory: '${displayPath}'.`);
  }
  return candidatePath;
};

const resolveNewSegmentPath = (runDir: string, fileName: string): string => {
  const relative = safeRelativePath(fileName);
  return resolveInsideRunDir(runDir, path.resolve(runDir, relative), fileName);
};

export const readDirNames = async (dirPath: string): Promise<string[]> => {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return [];
    }
    throw error;
  }
};

export type RunCandidate = {
  itemId: string;
  runDir: string;
};

export type ConversionPlan = {
  newManifest: RawTraceArchiveManifest;
  completeEntries: RawTraceArchiveSegmentEntry[];
  pendingEntries: RawTraceArchiveSegmentEntry[];
  notes: string[];
};

const hasEvidence = async (dirPath: string): Promise<boolean> => {
  if (await exists(path.join(dirPath, RAW_TRACES_MANIFEST_FILE_NAME))) return true;
  if (await exists(path.join(dirPath, RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME))) return true;
  if (await exists(path.join(dirPath, RAW_TRACES_ARCHIVE_DIR_NAME))) return true;
  return false;
};

const collectCandidatesUnder = async (rootDir: string, memoryDir: string, output: Map<string, RunCandidate>): Promise<void> => {
  if (!(await exists(rootDir))) {
    return;
  }
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  if (await hasEvidence(rootDir)) {
    output.set(rootDir, { itemId: path.relative(memoryDir, rootDir) || ".", runDir: rootDir });
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await collectCandidatesUnder(path.join(rootDir, entry.name), memoryDir, output);
    }
  }
};

export const discoverRunCandidates = async (memoryDir: string): Promise<RunCandidate[]> => {
  const output = new Map<string, RunCandidate>();
  await collectCandidatesUnder(path.join(memoryDir, "agents"), memoryDir, output);
  await collectCandidatesUnder(path.join(memoryDir, "agent_teams"), memoryDir, output);
  return [...output.values()].sort((a, b) => a.itemId.localeCompare(b.itemId));
};

export const buildConversionPlan = (oldManifest: RawTraceArchiveManifest): ConversionPlan => {
  const completeEntries = oldManifest.segments.filter((entry) => entry.status === "complete");
  const pendingEntries = oldManifest.segments.filter((entry) => entry.status === "pending");
  const notes = pendingEntries.length > 0
    ? [`${pendingEntries.length} pending segment entr${pendingEntries.length === 1 ? "y was" : "ies were"} excluded from the new manifest.`]
    : [];
  return {
    completeEntries,
    pendingEntries,
    notes,
    newManifest: {
      schema_version: 1,
      next_segment_index: oldManifest.next_segment_index,
      segments: completeEntries.map((entry) => ({
        ...entry,
        file_name: buildRawTraceSegmentFileName(entry.index),
        status: "complete" as const,
      })),
    },
  };
};

export const validateNewLayout = async (runDir: string, manifest: RawTraceArchiveManifest): Promise<void> => {
  for (const entry of manifest.segments.filter((segment) => segment.status === "complete")) {
    const segmentPath = resolveNewSegmentPath(runDir, entry.file_name);
    if (!(await exists(segmentPath))) {
      throw new Error(`New raw trace segment is missing: ${entry.file_name}`);
    }
  }
};

const segmentIdentity = (entry: RawTraceArchiveSegmentEntry): string =>
  `${entry.index}\u0000${entry.boundary_key}`;

export const reconcilePartialNewManifest = (
  newManifest: RawTraceArchiveManifest,
  plan: ConversionPlan,
): RawTraceArchiveManifest => {
  const oldEntryIdentities = new Set([
    ...plan.completeEntries.map(segmentIdentity),
    ...plan.pendingEntries.map(segmentIdentity),
  ]);
  const runtimeEntries = newManifest.segments.filter((entry) => !oldEntryIdentities.has(segmentIdentity(entry)));
  return {
    schema_version: 1,
    next_segment_index: Math.max(newManifest.next_segment_index, plan.newManifest.next_segment_index),
    segments: [...plan.newManifest.segments, ...runtimeEntries],
  };
};
