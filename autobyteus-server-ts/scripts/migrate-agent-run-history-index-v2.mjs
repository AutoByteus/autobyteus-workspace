#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const parseArgs = (argv) => {
  const args = {
    memoryDir: path.resolve(process.cwd(), "memory"),
    apply: false,
    pruneStale: false,
    help: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--memory-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--memory-dir requires a path value");
      }
      args.memoryDir = path.resolve(value);
      index += 1;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--dry-run") {
      args.apply = false;
      continue;
    }
    if (token === "--prune-stale") {
      args.pruneStale = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
};

const usage = () => {
  console.info(`Usage: node scripts/migrate-agent-run-history-index-v2.mjs --memory-dir <path> [--apply] [--prune-stale]\n\nDry-run is the default. --apply writes run_history_index.json after creating a backup when an index already exists.`);
};

const safeRunId = (value) => {
  const runId = typeof value === "string" ? value.trim() : "";
  if (!runId || path.isAbsolute(runId) || path.posix.isAbsolute(runId) || path.win32.isAbsolute(runId)) {
    return null;
  }
  if (/[\\/]/.test(runId) || runId === "." || runId === "..") {
    return null;
  }
  return runId;
};

const trimTrailingSeparators = (value) => {
  const parsedRoot = path.parse(value).root;
  if (value === parsedRoot) {
    return value;
  }
  return value.replace(/[\\/]+$/, "");
};

const canonicalizeWorkspaceRootPath = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    throw new Error("workspaceRootPath cannot be empty.");
  }
  return trimTrailingSeparators(path.normalize(path.resolve(trimmed)));
};

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
};

const readJson = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return null;
    }
    throw error;
  }
};

const timestamp = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || Number.isNaN(Date.parse(trimmed))) {
    return null;
  }
  return new Date(trimmed).toISOString();
};

const statTimestamp = async (filePath, field) => {
  try {
    const stat = await fs.stat(filePath);
    const value = field === "birthtime" ? stat.birthtime : stat.mtime;
    if (Number.isFinite(value.getTime()) && value.getTime() > 0) {
      return value.toISOString();
    }
  } catch {
    return null;
  }
  return null;
};

const readExistingIndex = async (indexPath) => {
  const payload = await readJson(indexPath);
  if (payload === null) {
    return { payload: null, rowsById: new Map(), invalid: false };
  }
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.rows)
      ? payload.rows
      : null;
  if (!rows) {
    return { payload: null, rowsById: new Map(), invalid: payload !== null };
  }
  const rowsById = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const runId = safeRunId(row.runId);
    if (!runId) {
      continue;
    }
    rowsById.set(runId, row);
  }
  return { payload, rowsById, invalid: false };
};

const listMetadataRecords = async (memoryDir) => {
  const agentsRoot = path.join(memoryDir, "agents");
  let entries = [];
  try {
    entries = await fs.readdir(agentsRoot, { withFileTypes: true });
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return [];
    }
    throw error;
  }

  const records = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const runId = safeRunId(entry.name);
    if (!runId) {
      records.push({ runId: entry.name, invalidIdentity: true });
      continue;
    }
    const runDir = path.join(agentsRoot, runId);
    const metadataPath = path.join(runDir, "run_metadata.json");
    const metadata = await readJson(metadataPath).catch((error) => ({ __readError: String(error) }));
    records.push({ runId, runDir, metadataPath, metadata });
  }
  return records;
};

const deriveCreatedAt = async ({ existingRow, metadata, metadataPath, runDir, migrationTime }) => {
  const candidates = [
    ["existing V2 index createdAt", timestamp(existingRow?.createdAt)],
    ["legacy metadata createdAt", timestamp(metadata?.createdAt)],
    ["legacy metadata preparedAt", timestamp(metadata?.preparedAt)],
    ["legacy index lastActivityAt", timestamp(existingRow?.lastActivityAt)],
    ["metadata file birthtime", await statTimestamp(metadataPath, "birthtime")],
    ["metadata file mtime", await statTimestamp(metadataPath, "mtime")],
    ["run directory birthtime", await statTimestamp(runDir, "birthtime")],
    ["run directory mtime", await statTimestamp(runDir, "mtime")],
    ["migration time", migrationTime],
  ];
  for (const [source, value] of candidates) {
    if (value) {
      return { value, source, warning: source === "migration time" };
    }
  }
  return { value: migrationTime, source: "migration time", warning: true };
};

const normalizeRowFromMetadata = async ({ record, existingRow, migrationTime }) => {
  const metadata = record.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || metadata.__readError) {
    return null;
  }
  const rawMetadataRunId = typeof metadata.runId === "string" ? metadata.runId.trim() : "";
  const safeMetadataRunId = safeRunId(metadata.runId);
  const runIdMismatch = rawMetadataRunId && rawMetadataRunId !== record.runId
    ? { directoryRunId: record.runId, metadataRunId: safeMetadataRunId ?? rawMetadataRunId }
    : null;
  const workspaceRootPath = canonicalizeWorkspaceRootPath(
    firstNonEmptyString(metadata.workspaceRootPath, existingRow?.workspaceRootPath),
  );
  const createdAt = await deriveCreatedAt({
    existingRow,
    metadata,
    metadataPath: record.metadataPath,
    runDir: record.runDir,
    migrationTime,
  });
  return {
    row: {
      runId: record.runId,
      agentDefinitionId: String(metadata.agentDefinitionId || existingRow?.agentDefinitionId || "").trim() || record.runId,
      agentName: String(existingRow?.agentName || metadata.agentName || metadata.agentDefinitionId || record.runId).trim() || record.runId,
      workspaceRootPath,
      summary: String(existingRow?.summary || metadata.summary || "").trim(),
      createdAt: createdAt.value,
      archivedAt: timestamp(existingRow?.archivedAt ?? metadata.archivedAt) ?? null,
      terminatedAt: timestamp(existingRow?.terminatedAt ?? metadata.terminatedAt) ?? null,
    },
    createdAtSource: createdAt.source,
    createdAtWarning: createdAt.warning,
    runIdMismatch,
  };
};

const atomicWriteJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const backupIndex = async (indexPath) => {
  try {
    await fs.access(indexPath);
  } catch {
    return null;
  }
  const backupPath = `${indexPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await fs.copyFile(indexPath, backupPath);
  return backupPath;
};

const main = async () => {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const indexPath = path.join(args.memoryDir, "run_history_index.json");
  const migrationTime = new Date().toISOString();
  const existing = await readExistingIndex(indexPath);
  const metadataRecords = await listMetadataRecords(args.memoryDir);
  const rowsById = new Map();
  const createdAtSources = [];
  const invalidMetadata = [];
  const invalidIdentities = [];
  const invalidExistingRows = [];
  const runIdMismatches = [];

  for (const record of metadataRecords) {
    if (record.invalidIdentity) {
      invalidIdentities.push(record.runId);
      continue;
    }
    if (record.metadata?.__readError) {
      invalidMetadata.push({ runId: record.runId, error: record.metadata.__readError });
      continue;
    }
    let normalized = null;
    try {
      normalized = await normalizeRowFromMetadata({
        record,
        existingRow: existing.rowsById.get(record.runId),
        migrationTime,
      });
    } catch (error) {
      invalidMetadata.push({
        runId: record.runId,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (!normalized) {
      invalidMetadata.push({ runId: record.runId, error: "missing or invalid run_metadata.json" });
      continue;
    }
    rowsById.set(normalized.row.runId, normalized.row);
    createdAtSources.push({
      runId: normalized.row.runId,
      source: normalized.createdAtSource,
      warning: normalized.createdAtWarning,
    });
    if (normalized.runIdMismatch) {
      runIdMismatches.push(normalized.runIdMismatch);
    }
  }

  const staleRows = [];
  for (const [runId, row] of existing.rowsById.entries()) {
    if (rowsById.has(runId)) {
      continue;
    }
    staleRows.push(runId);
    if (!args.pruneStale && timestamp(row.createdAt)) {
      try {
        rowsById.set(runId, {
          runId,
          agentDefinitionId: String(row.agentDefinitionId || runId).trim() || runId,
          agentName: String(row.agentName || row.agentDefinitionId || runId).trim() || runId,
          workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath || ""),
          summary: String(row.summary || "").trim(),
          createdAt: timestamp(row.createdAt),
          archivedAt: timestamp(row.archivedAt) ?? null,
          terminatedAt: timestamp(row.terminatedAt) ?? null,
        });
      } catch (error) {
        invalidExistingRows.push({
          runId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const nextIndex = Array.from(rowsById.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let backupPath = null;
  if (args.apply) {
    backupPath = await backupIndex(indexPath);
    await atomicWriteJson(indexPath, nextIndex);
  }

  console.info(JSON.stringify({
    mode: args.apply ? "apply" : "dry-run",
    memoryDir: args.memoryDir,
    indexPath,
    backupPath,
    existingRows: existing.rowsById.size,
    scannedMetadataDirs: metadataRecords.length,
    outputRows: nextIndex.length,
    staleRows,
    prunedStaleRows: args.pruneStale ? staleRows : [],
    invalidIdentities,
    invalidMetadata,
    invalidExistingRows,
    runIdMismatches,
    createdAtSources,
    invalidExistingIndex: existing.invalid,
  }, null, 2));
};

main().catch((error) => {
  console.error(`migrate-agent-run-history-index-v2 failed: ${String(error)}`);
  process.exitCode = 1;
});
