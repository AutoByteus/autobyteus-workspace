#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const E2E_WORKSPACE_PREFIXES = [
  "codex-continue-workspace-e2e-",
  "codex-workspaceid-continue-e2e-",
  "codex-history-projection-e2e-",
  "codex-team-roundtrip-e2e-",
  "codex-team-workspaceid-e2e-",
  "codex-tool-lifecycle-e2e-",
  "codex-tool-approval-e2e-",
  "codex-tool-deny-e2e-",
];

const parseArgs = (argv) => {
  const args = { dryRun: false, memoryDir: path.resolve(process.cwd(), "memory") };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--memory-dir") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--memory-dir requires a path value");
      }
      args.memoryDir = path.resolve(next);
      index += 1;
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

const isCodexE2EWorkspace = (workspaceRootPath) => {
  if (typeof workspaceRootPath !== "string" || workspaceRootPath.length === 0) {
    return false;
  }
  const workspaceName = path.basename(workspaceRootPath);
  return E2E_WORKSPACE_PREFIXES.some((prefix) => workspaceName.startsWith(prefix));
};

const readIndex = async (indexPath) => {
  try {
    const raw = await fs.readFile(indexPath, "utf-8");
    const parsed = JSON.parse(raw);
    return validateV2Index(parsed, indexPath);
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return null;
    }
    throw error;
  }
};

const migrationGuidance = (indexPath) =>
  `cleanup requires a valid V2 run_history_index.json at '${indexPath}'. Run scripts/migrate-agent-run-history-index-v2.mjs --memory-dir <memory-dir> --apply before cleanup.`;

const nullableString = (value) => value === null || typeof value === "string";

const normalizeV2Row = (row, rowIndex, indexPath) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`${migrationGuidance(indexPath)} Invalid row at index ${rowIndex}.`);
  }
  const runId = typeof row.runId === "string" ? row.runId.trim() : "";
  const safeTarget = resolveSafeRunDir(path.dirname(indexPath), runId);
  if (!safeTarget) {
    throw new Error(`${migrationGuidance(indexPath)} Invalid runId at row ${rowIndex}.`);
  }
  for (const fieldName of ["agentDefinitionId", "agentName", "workspaceRootPath", "summary", "createdAt"]) {
    if (typeof row[fieldName] !== "string") {
      throw new Error(`${migrationGuidance(indexPath)} Missing V2 field '${fieldName}' at row ${rowIndex}.`);
    }
  }
  if (!nullableString(row.archivedAt ?? null) || !nullableString(row.terminatedAt ?? null)) {
    throw new Error(`${migrationGuidance(indexPath)} Invalid V2 timestamp field at row ${rowIndex}.`);
  }
  return {
    runId,
    agentDefinitionId: row.agentDefinitionId,
    agentName: row.agentName,
    workspaceRootPath: row.workspaceRootPath,
    summary: row.summary,
    createdAt: row.createdAt,
    archivedAt: row.archivedAt ?? null,
    terminatedAt: row.terminatedAt ?? null,
  };
};

const validateV2Index = (payload, indexPath) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.version !== 2 ||
    !Array.isArray(payload.rows)
  ) {
    throw new Error(migrationGuidance(indexPath));
  }
  return {
    version: 2,
    rows: payload.rows.map((row, index) => normalizeV2Row(row, index, indexPath)),
  };
};

const writeIndex = async (indexPath, index) => {
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  const tempPath = `${indexPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
    await fs.rename(tempPath, indexPath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const resolveSafeRunDir = (memoryDir, runId) => {
  const normalizedRunId = typeof runId === "string" ? runId.trim() : "";
  if (!normalizedRunId || normalizedRunId.startsWith("temp-")) {
    return null;
  }
  if (path.isAbsolute(normalizedRunId) || path.posix.isAbsolute(normalizedRunId) || path.win32.isAbsolute(normalizedRunId)) {
    return null;
  }
  if (/[\\/]/.test(normalizedRunId) || normalizedRunId === "." || normalizedRunId === "..") {
    return null;
  }
  const agentsRoot = path.resolve(memoryDir, "agents");
  const runDirPath = path.resolve(agentsRoot, normalizedRunId);
  if (!runDirPath.startsWith(`${agentsRoot}${path.sep}`)) {
    return null;
  }
  return { runId: normalizedRunId, runDirPath };
};

const removeRunDir = async (safeTarget) => {
  await fs.rm(safeTarget.runDirPath, { recursive: true, force: true });
};

const printUsage = () => {
  console.info("Usage: node scripts/cleanup-codex-e2e-run-history.mjs [--memory-dir <path>] [--dry-run]");
};

const main = async () => {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    return;
  }

  const indexPath = path.join(args.memoryDir, "run_history_index.json");
  const index = await readIndex(indexPath);
  if (!index) {
    console.info(`No run history index found at '${indexPath}'. Nothing to clean.`);
    return;
  }

  const rows = Array.isArray(index.rows) ? index.rows : [];
  const matchedRows = [];
  const preservedRows = [];
  for (const row of rows) {
    if (isCodexE2EWorkspace(row?.workspaceRootPath)) {
      matchedRows.push(row);
    } else {
      preservedRows.push(row);
    }
  }

  const unsafeRunIds = matchedRows
    .map((row) => row?.runId)
    .filter((runId) => !resolveSafeRunDir(args.memoryDir, runId));
  if (unsafeRunIds.length > 0) {
    throw new Error(`Refusing to clean unsafe run ids: ${unsafeRunIds.join(", ")}`);
  }

  let removedRunDirs = 0;
  if (!args.dryRun) {
    await writeIndex(indexPath, { version: 2, rows: preservedRows });
    for (const row of matchedRows) {
      const safeTarget = resolveSafeRunDir(args.memoryDir, row.runId);
      if (safeTarget) {
        await removeRunDir(safeTarget);
        removedRunDirs += 1;
      }
    }
  }

  console.info(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "apply",
        memoryDir: args.memoryDir,
        totalRows: rows.length,
        matchedRows: matchedRows.length,
        removedRunDirs: args.dryRun ? 0 : removedRunDirs,
        retainedRows: preservedRows.length,
        unsafeRunIds,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(`cleanup-codex-e2e-run-history failed: ${String(error)}`);
  process.exitCode = 1;
});
