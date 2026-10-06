import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDataMigrationDefinition } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  REMOVE_BUILT_IN_PROJECT_TASK_MANAGER_MIGRATION_ID,
  RemoveBuiltInProjectTaskManagerMigration,
} from "../../../src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.js";

let tempDir: string;
let agentsDir: string;
let installedAgentDir: string;

const exists = async (target: string): Promise<boolean> => {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
};

const writeText = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const populateInstalledCopy = async (): Promise<void> => {
  await writeText(path.join(installedAgentDir, "agent.md"), "---\nname: Project Task Manager\n---\n\nOld built-in.\n");
  await writeText(path.join(installedAgentDir, "agent-config.json"), "{\"toolNames\":[\"list_projects\"]}");
  await writeText(path.join(installedAgentDir, "skills", "leftover", "SKILL.md"), "# leftover\n");
};

describe("RemoveBuiltInProjectTaskManagerMigration", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "remove-built-in-ptm-"));
    agentsDir = path.join(tempDir, "app-data", "agents");
    installedAgentDir = path.join(agentsDir, "autobyteus-project-task-manager");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("is a startup-only required migration without prerequisites", () => {
    const migration: AppDataMigrationDefinition = new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir);

    expect(migration.id).toBe(REMOVE_BUILT_IN_PROJECT_TASK_MANAGER_MIGRATION_ID);
    expect(migration.id).toBe("20261006_remove_built_in_project_task_manager");
    expect(migration.displayName).toBe("Remove built-in Project Task Manager");
    expect(migration.description).toContain("No backup is made.");
    expect(migration.requiredOnStartup).toBe(true);
    expect(migration.executionPolicy).toBe("STARTUP_ONLY");
    expect(migration.prerequisiteMigrationIds).toBeUndefined();
  });

  it("deletes the installed copy with all its contents and succeeds", async () => {
    await populateInstalledCopy();

    const result = await new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.errorMessage).toBeNull();
    expect(result.summary).toEqual({
      scannedCount: 1,
      migratedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      details: [{ itemId: "installedAgentDir", filePath: installedAgentDir, status: "MIGRATED", message: "Removed." }],
    });
    expect(await exists(installedAgentDir)).toBe(false);
    expect(await exists(agentsDir)).toBe(true);
  });

  it("records nothing to remove when the folder never existed", async () => {
    const result = await new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.errorMessage).toBeNull();
    expect(result.summary).toMatchObject({ scannedCount: 1, migratedCount: 0, skippedCount: 1, failedCount: 0 });
    expect(result.summary.details[0]).toMatchObject({ status: "SKIPPED", message: "Not present." });
  });

  it("leaves sibling agents, package-root agents and other app data untouched", async () => {
    await populateInstalledCopy();
    const keep = [
      path.join(agentsDir, "project-task-manager", "agent.md"),
      path.join(agentsDir, "autobyteus-daily-assistant", "agent.md"),
      path.join(agentsDir, "my-user-agent", "agent-config.json"),
      path.join(agentsDir, "autobyteus-project-task-manager-2", "agent.md"),
      path.join(tempDir, "app-data", "memory", "agents", "run-1", "raw_traces.jsonl"),
      path.join(tempDir, "package-root", "agents", "project-task-manager", "agent.md"),
    ];
    for (const filePath of keep) {
      await writeText(filePath, "keep");
    }

    const result = await new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    for (const filePath of keep) {
      expect(await fs.readFile(filePath, "utf-8")).toBe("keep");
    }
    expect((await fs.readdir(agentsDir)).sort()).toEqual([
      "autobyteus-daily-assistant",
      "autobyteus-project-task-manager-2",
      "my-user-agent",
      "project-task-manager",
    ]);
  });

  it("records a removal failure without throwing, keeps the folder and reports FAILED so startup retries", async () => {
    await populateInstalledCopy();
    vi.spyOn(fs, "rm").mockRejectedValueOnce(
      Object.assign(new Error("EBUSY: resource busy or locked"), { code: "EBUSY" }),
    );

    const result = await new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe(
      "The retired built-in Project Task Manager folder could not be removed; the cleanup retries on the next start.",
    );
    expect(result.summary).toMatchObject({ scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 1 });
    expect(result.summary.details[0]).toMatchObject({ itemId: "installedAgentDir", filePath: installedAgentDir, status: "FAILED" });
    expect(result.summary.details[0]?.message).toContain("Could not remove: EBUSY");
    expect(await exists(path.join(installedAgentDir, "agent.md"))).toBe(true);
  });

  it("records an inspection failure without throwing", async () => {
    await populateInstalledCopy();
    vi.spyOn(fs, "lstat").mockRejectedValueOnce(
      Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }),
    );

    const result = await new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary).toMatchObject({ migratedCount: 0, failedCount: 1 });
    expect(result.summary.details[0]?.message).toContain("Could not inspect: EACCES");
    expect(await exists(installedAgentDir)).toBe(true);
  });

  it("removes a symlinked folder without touching the link target", async () => {
    const outsideTarget = path.join(tempDir, "outside", "agent");
    await writeText(path.join(outsideTarget, "agent.md"), "keep");
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.symlink(outsideTarget, installedAgentDir, "dir");

    const result = await new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.details[0]?.status).toBe("MIGRATED");
    expect(await exists(installedAgentDir)).toBe(false);
    expect(await fs.readFile(path.join(outsideTarget, "agent.md"), "utf-8")).toBe("keep");
  });

  it("succeeds on a retry after a previous failure", async () => {
    await populateInstalledCopy();
    vi.spyOn(fs, "rm").mockRejectedValueOnce(new Error("transient"));
    const migration = new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir);
    expect((await migration.execute()).status).toBe("FAILED");

    const retry = await migration.execute();

    expect(retry.status).toBe("SUCCEEDED");
    expect(retry.summary).toMatchObject({ migratedCount: 1, skippedCount: 0, failedCount: 0 });
    expect(await exists(installedAgentDir)).toBe(false);
  });
});
