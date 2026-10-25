import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REMOVE_WORK_TRACE_EXPORTS_MIGRATION_ID,
  RemoveWorkTraceExportsMigration,
} from "../../../src/app-data-migrations/migrations/remove-work-trace-exports/remove-work-trace-exports-migration.js";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";

let memoryDir: string;

const write = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const exists = async (filePath: string): Promise<boolean> => fs.lstat(filePath).then(() => true, () => false);

/** A released export folder: its manifest plus rendered files (hand-built, never user data). */
const writeExport = async (dir: string): Promise<string> => {
  await write(path.join(dir, "work_traces_manifest.json"), JSON.stringify({ schemaVersion: 3, files: [] }));
  await write(path.join(dir, "work_trace_active.md"), "# Work Trace\n");
  await write(path.join(dir, "work_trace_archive_000001.md"), "# Work Trace\n");
  return dir;
};

const runDir = (...parts: string[]): string => path.join(memoryDir, ...parts);

describe("RemoveWorkTraceExportsMigration (DS-005)", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "remove-work-trace-exports-"));
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("is a required startup migration after the task-agent own-run migration", () => {
    const migration = new RemoveWorkTraceExportsMigration(memoryDir);
    expect(migration.id).toBe(REMOVE_WORK_TRACE_EXPORTS_MIGRATION_ID);
    expect(migration.requiredOnStartup).toBe(true);
    expect(migration.prerequisiteMigrationIds).toEqual([TASK_AGENT_OWN_RUN_V1_MIGRATION_ID]);
  });

  it("deletes the three released locations and keeps raw traces, run data and a decoy folder", async () => {
    const runA = runDir("agents", "run_a");
    const runB = runDir("agent_teams", "team_1", "members", "coder");
    const runC = runDir("agents", "run_c");
    const exportA = await writeExport(path.join(runA, "work_traces"));
    const exportB = await writeExport(path.join(runB, "self_evolution", "work_traces"));
    const exportC = await writeExport(path.join(runC, "skill_improvement", "work_traces"));
    await write(path.join(runA, "raw_traces_active.jsonl"), "{\"id\":\"rt_1\"}\n");
    await write(path.join(runC, "skill_improvement", "improver_session.json"), "{}");
    const decoy = runDir("agents", "run_d", "workspace_copy", "work_traces");
    await write(path.join(decoy, "notes.md"), "user notes");

    const result = await new RemoveWorkTraceExportsMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.errorMessage).toBeNull();
    expect(result.summary).toMatchObject({ scannedCount: 4, migratedCount: 3, skippedCount: 1, failedCount: 0 });
    expect(result.summary.details.map((detail) => [detail.itemId, detail.status])).toEqual([
      ["agent_teams/team_1/members/coder/self_evolution/work_traces", "MIGRATED"],
      ["agents/run_a/work_traces", "MIGRATED"],
      ["agents/run_c/skill_improvement/work_traces", "MIGRATED"],
      ["agents/run_d/workspace_copy/work_traces", "SKIPPED"],
    ]);
    for (const dir of [exportA, exportB, exportC]) expect(await exists(dir)).toBe(false);
    expect(await fs.readFile(path.join(runA, "raw_traces_active.jsonl"), "utf-8")).toBe("{\"id\":\"rt_1\"}\n");
    expect(await exists(path.join(runC, "skill_improvement", "improver_session.json"))).toBe(true);
    expect(await fs.readFile(path.join(decoy, "notes.md"), "utf-8")).toBe("user notes");
  });

  it("N7: a recognized folder is removed without being walked into first", async () => {
    const exportDir = await writeExport(runDir("agents", "run_a", "work_traces"));
    await writeExport(path.join(exportDir, "nested", "work_traces"));
    const readdir = vi.spyOn(fs, "readdir");
    const result = await new RemoveWorkTraceExportsMigration(memoryDir).execute();
    expect(result.summary.details.map((detail) => detail.itemId)).toEqual(["agents/run_a/work_traces"]);
    expect(readdir.mock.calls.map((call) => path.relative(memoryDir, String(call[0])))).not.toContain("agents/run_a/work_traces");
    expect(await exists(exportDir)).toBe(false);
  });

  it("a symlinked work_traces is not followed; its target is kept", async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "work-traces-outside-"));
    try {
      await writeExport(outside);
      await fs.mkdir(runDir("agents", "run_a"), { recursive: true });
      await fs.symlink(outside, runDir("agents", "run_a", "work_traces"), "dir");
      const result = await new RemoveWorkTraceExportsMigration(memoryDir).execute();
      expect(result.summary.details).toEqual([expect.objectContaining({ itemId: "agents/run_a/work_traces", status: "SKIPPED" })]);
      expect(await exists(path.join(outside, "work_traces_manifest.json"))).toBe(true);
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  });

  it("a folder that cannot be deleted is a FAILED item and the migration succeeds with warnings", async () => {
    const failing = await writeExport(runDir("agents", "run_a", "work_traces"));
    const removable = await writeExport(runDir("agents", "run_b", "work_traces"));
    const rm = fs.rm;
    vi.spyOn(fs, "rm").mockImplementation(async (target, options) => {
      if (String(target) === failing) throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      return rm(target, options);
    });
    const result = await new RemoveWorkTraceExportsMigration(memoryDir).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.errorMessage).toBe("1 work-trace folder could not be removed; they are unused and can be deleted by hand.");
    expect(result.summary.details).toEqual([
      expect.objectContaining({ itemId: "agents/run_a/work_traces", status: "FAILED", message: expect.stringContaining("EACCES") }),
      expect.objectContaining({ itemId: "agents/run_b/work_traces", status: "MIGRATED" }),
    ]);
    expect(await exists(failing)).toBe(true);
    expect(await exists(removable)).toBe(false);
  });

  it("is idempotent: a second run finds nothing; a missing memory folder is empty", async () => {
    await writeExport(runDir("agents", "run_a", "work_traces"));
    const migration = new RemoveWorkTraceExportsMigration(memoryDir);
    expect((await migration.execute()).summary.migratedCount).toBe(1);
    expect(await migration.execute()).toEqual({
      status: "SUCCEEDED",
      summary: { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] },
      errorMessage: null,
    });
    expect((await new RemoveWorkTraceExportsMigration(path.join(memoryDir, "absent")).execute()).status).toBe("SUCCEEDED");
  });
});
