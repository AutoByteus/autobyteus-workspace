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
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.rows)) {
      throw new Error("run_history_index.json has unexpected structure (rows missing)");
    }
    return parsed;
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return null;
    }
    throw error;
  }
};

const writeIndex = async (indexPath, index) => {
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
};

const removeRunDir = async (memoryDir, runId) => {
  const runDirPath = path.join(memoryDir, "agents", runId);
  await fs.rm(runDirPath, { recursive: true, force: true });
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

  let removedRunDirs = 0;
  if (!args.dryRun) {
    for (const row of matchedRows) {
      if (typeof row?.runId === "string" && row.runId.length > 0) {
        await removeRunDir(args.memoryDir, row.runId);
        removedRunDirs += 1;
      }
    }
    await writeIndex(indexPath, { ...index, rows: preservedRows });
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
