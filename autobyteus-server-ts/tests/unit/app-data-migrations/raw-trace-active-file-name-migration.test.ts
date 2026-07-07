import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID,
  RawTraceActiveFileNameMigration,
} from "../../../src/app-data-migrations/migrations/raw-trace-active-file-name-migration.js";
import {
  OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
} from "../../../src/app-data-migrations/migrations/raw-trace-active-file-name-migration-files.js";
import {
  RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID,
  RawTraceRotationLayoutMigration,
} from "../../../src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.js";

type MemorySyncManifestFixture = {
  sourceNodeId: string;
  totals: { fileCount: number; totalBytes: number };
  files: Record<string, { kind: "agents" | "agent_teams"; relativePath: string; size: number; sha256: string; lastBatchId: string }>;
};

let memoryDir: string;

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const writeOldActiveFile = async (relativeRunDir: string, content = "old active\n"): Promise<string> => {
  const runDir = path.join(memoryDir, relativeRunDir);
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), content, "utf-8");
  return runDir;
};

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as T;

describe("RawTraceActiveFileNameMigration", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-trace-active-file-name-migration-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("renames local standalone and nested team active raw trace files", async () => {
    const standaloneDir = await writeOldActiveFile("agents/run-1", "standalone\n");
    const memberDir = await writeOldActiveFile("agent_teams/root-team/child-team/member-run", "member\n");

    const result = await new RawTraceActiveFileNameMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 2, migratedCount: 2, skippedCount: 0, failedCount: 0 });
    for (const [runDir, expectedContent] of [[standaloneDir, "standalone\n"], [memberDir, "member\n"]] as const) {
      expect(await pathExists(path.join(runDir, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toBe(false);
      expect(await fs.readFile(path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), "utf-8")).toBe(expectedContent);
    }
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agents/run-1", status: "MIGRATED" }),
      expect.objectContaining({ itemId: "agent_teams/root-team/child-team/member-run", status: "MIGRATED" }),
    ]));
  });

  it("renames imported Memory Sync active files and rewrites matching manifest file records", async () => {
    const importRoot = path.join(memoryDir, "imports", "source-a");
    const agentDir = await writeOldActiveFile("imports/source-a/agents/run-imported", "agent import\n");
    const memberDir = await writeOldActiveFile("imports/source-a/agent_teams/team-run/member-run", "member import\n");
    const manifestPath = path.join(importRoot, "sync-manifest.json");
    const manifest: MemorySyncManifestFixture = {
      sourceNodeId: "source-a",
      totals: { fileCount: 3, totalBytes: 99 },
      files: {
        [`agents/run-imported/${OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME}`]: {
          kind: "agents",
          relativePath: `run-imported/${OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME}`,
          size: 13,
          sha256: "hash-agent",
          lastBatchId: "batch-1",
        },
        [`agent_teams/team-run/member-run/${OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME}`]: {
          kind: "agent_teams",
          relativePath: `team-run/member-run/${OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME}`,
          size: 14,
          sha256: "hash-member",
          lastBatchId: "batch-1",
        },
        "agents/run-imported/semantic.jsonl": {
          kind: "agents",
          relativePath: "run-imported/semantic.jsonl",
          size: 72,
          sha256: "hash-semantic",
          lastBatchId: "batch-1",
        },
      },
    };
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");

    const result = await new RawTraceActiveFileNameMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(2);
    expect(await pathExists(path.join(agentDir, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toBe(false);
    expect(await pathExists(path.join(memberDir, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toBe(false);
    expect(await pathExists(path.join(agentDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toBe(true);
    expect(await pathExists(path.join(memberDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toBe(true);

    const updated = await readJson<MemorySyncManifestFixture>(manifestPath);
    expect(Object.keys(updated.files).sort()).toEqual([
      "agent_teams/team-run/member-run/raw_traces_active.jsonl",
      "agents/run-imported/raw_traces_active.jsonl",
      "agents/run-imported/semantic.jsonl",
    ]);
    expect(updated.files["agents/run-imported/raw_traces_active.jsonl"]?.relativePath)
      .toBe("run-imported/raw_traces_active.jsonl");
    expect(updated.files["agent_teams/team-run/member-run/raw_traces_active.jsonl"]?.relativePath)
      .toBe("team-run/member-run/raw_traces_active.jsonl");
    expect(updated.totals.fileCount).toBe(3);
  });

  it("is registered after the raw trace rotation layout migration", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const definitionIds = definitions.map((definition) => definition.id);

    expect(definitions.find((definition) => definition.id === RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID))
      .toBeInstanceOf(RawTraceActiveFileNameMigration);
    expect(definitions.find((definition) => definition.id === RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID))
      .toBeInstanceOf(RawTraceRotationLayoutMigration);
    expect(definitionIds.indexOf(RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID))
      .toBeGreaterThan(definitionIds.indexOf(RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID));
  });
});
