import fs from "node:fs/promises";
import path from "node:path";
import {
  buildRawTraceSegmentFileName,
  RAW_TRACES_ARCHIVE_DIR_NAME,
  RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME,
  RAW_TRACES_MANIFEST_FILE_NAME,
} from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import type { AppDataMigrationItemDetail } from "../domain/app-data-migration-types.js";
import {
  asManifest,
  buildConversionPlan,
  exists,
  readDirNames,
  readJson,
  reconcilePartialNewManifest,
  resolveOldSegmentPath,
  sameFileContent,
  timestampSuffix,
  validateNewLayout,
  writeJsonAtomic,
  type ConversionPlan,
  type RunCandidate,
} from "./raw-trace-rotation-layout-migration-files.js";

const removeIfExists = async (filePath: string): Promise<void> => {
  await fs.rm(filePath, { force: true });
};

const copyCompleteSegments = async (runDir: string, plan: ConversionPlan): Promise<string[]> => {
  const copied: string[] = [];
  for (const entry of plan.completeEntries) {
    const sourcePath = resolveOldSegmentPath(runDir, entry.file_name);
    if (!(await exists(sourcePath))) {
      throw new Error(`Complete raw trace segment source is missing: ${entry.file_name}`);
    }
    const targetFileName = buildRawTraceSegmentFileName(entry.index);
    const targetPath = path.join(runDir, targetFileName);
    if (await exists(targetPath)) {
      if (!(await sameFileContent(sourcePath, targetPath))) {
        throw new Error(`Existing new raw trace segment differs from old source: ${targetFileName}`);
      }
      continue;
    }
    await fs.copyFile(sourcePath, targetPath);
    copied.push(targetFileName);
  }
  return copied;
};

const backupPendingSegments = async (runDir: string, plan: ConversionPlan, backupDir: string): Promise<string[]> => {
  const notes: string[] = [];
  for (const entry of plan.pendingEntries) {
    const sourcePath = resolveOldSegmentPath(runDir, entry.file_name);
    if (!(await exists(sourcePath))) {
      notes.push(`Pending segment index ${entry.index} had no source file and was dropped.`);
      continue;
    }
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `pending_${String(entry.index).padStart(6, "0")}_${path.basename(entry.file_name)}`);
    await fs.copyFile(sourcePath, backupPath);
    notes.push(`Pending segment index ${entry.index} was backed up and excluded.`);
  }
  return notes;
};

const cleanupOldLayout = async (runDir: string, plan: ConversionPlan): Promise<void> => {
  for (const entry of [...plan.completeEntries, ...plan.pendingEntries]) {
    await removeIfExists(resolveOldSegmentPath(runDir, entry.file_name));
  }
  const archiveDir = path.join(runDir, RAW_TRACES_ARCHIVE_DIR_NAME);
  const leftovers = await readDirNames(archiveDir);
  if (leftovers.length === 0) {
    await fs.rm(archiveDir, { recursive: true, force: true });
  }
};

const backupOldManifest = async (oldManifestPath: string): Promise<string> => {
  const backupPath = `${oldManifestPath}.backup-${timestampSuffix()}`;
  await fs.copyFile(oldManifestPath, backupPath);
  return backupPath;
};

const handleOrphanArchiveDir = async (candidate: RunCandidate): Promise<AppDataMigrationItemDetail> => {
  const archiveDir = path.join(candidate.runDir, RAW_TRACES_ARCHIVE_DIR_NAME);
  const names = await readDirNames(archiveDir);
  if (names.length === 0) {
    await fs.rm(archiveDir, { recursive: true, force: true });
    return {
      itemId: candidate.itemId,
      filePath: archiveDir,
      status: "SKIPPED",
      message: "Removed empty old raw trace archive directory with no authoritative manifest.",
    };
  }
  return {
    itemId: candidate.itemId,
    filePath: archiveDir,
    status: "SKIPPED",
    message: "Old raw trace archive directory has no authoritative manifest; left non-authoritative files untouched.",
  };
};

const finishPartialCleanup = async (
  candidate: RunCandidate,
  oldManifestPath: string,
  newManifestPath: string,
): Promise<AppDataMigrationItemDetail> => {
  const plan = buildConversionPlan(asManifest(await readJson(oldManifestPath)));
  const newManifest = asManifest(await readJson(newManifestPath));
  await copyCompleteSegments(candidate.runDir, plan);
  const backupDir = path.join(candidate.runDir, `raw_traces_migration_backup-${timestampSuffix()}`);
  const pendingNotes = await backupPendingSegments(candidate.runDir, plan, backupDir);
  const reconciledManifest = reconcilePartialNewManifest(newManifest, plan);
  await writeJsonAtomic(newManifestPath, reconciledManifest);
  await validateNewLayout(candidate.runDir, reconciledManifest);
  const backupPath = await backupOldManifest(oldManifestPath);
  await fs.rm(oldManifestPath, { force: true });
  await cleanupOldLayout(candidate.runDir, plan);
  return {
    itemId: candidate.itemId,
    filePath: newManifestPath,
    status: "MIGRATED",
    message: [
      "Completed cleanup for partially migrated raw trace layout.",
      ...plan.notes,
      ...pendingNotes,
    ].join(" ").trim(),
    backupPath,
  };
};

const convertOldLayout = async (
  candidate: RunCandidate,
  oldManifestPath: string,
  newManifestPath: string,
): Promise<AppDataMigrationItemDetail> => {
  const plan = buildConversionPlan(asManifest(await readJson(oldManifestPath)));
  const copied = await copyCompleteSegments(candidate.runDir, plan);
  const backupDir = path.join(candidate.runDir, `raw_traces_migration_backup-${timestampSuffix()}`);
  const pendingNotes = await backupPendingSegments(candidate.runDir, plan, backupDir);
  const backupPath = await backupOldManifest(oldManifestPath);
  await writeJsonAtomic(newManifestPath, plan.newManifest);
  await validateNewLayout(candidate.runDir, plan.newManifest);
  await fs.rm(oldManifestPath, { force: true });
  await cleanupOldLayout(candidate.runDir, plan);
  return {
    itemId: candidate.itemId,
    filePath: newManifestPath,
    status: "MIGRATED",
    message: [
      `Migrated ${copied.length} complete raw trace segment file(s) to the rotation layout.`,
      ...plan.notes,
      ...pendingNotes,
    ].join(" ").trim(),
    backupPath,
  };
};

export const migrateRawTraceRun = async (candidate: RunCandidate): Promise<AppDataMigrationItemDetail> => {
  const newManifestPath = path.join(candidate.runDir, RAW_TRACES_MANIFEST_FILE_NAME);
  const oldManifestPath = path.join(candidate.runDir, RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME);
  const oldManifestExists = await exists(oldManifestPath);
  const newManifestExists = await exists(newManifestPath);

  try {
    if (newManifestExists && !oldManifestExists) {
      await validateNewLayout(candidate.runDir, asManifest(await readJson(newManifestPath)));
      return {
        itemId: candidate.itemId,
        filePath: newManifestPath,
        status: "SKIPPED",
        message: "Raw trace layout is already migrated.",
      };
    }
    if (!oldManifestExists) {
      return await handleOrphanArchiveDir(candidate);
    }
    if (newManifestExists) {
      return await finishPartialCleanup(candidate, oldManifestPath, newManifestPath);
    }
    return await convertOldLayout(candidate, oldManifestPath, newManifestPath);
  } catch (error) {
    return {
      itemId: candidate.itemId,
      filePath: oldManifestExists ? oldManifestPath : newManifestPath,
      status: "FAILED",
      message: error instanceof Error ? error.message : String(error),
    };
  }
};
