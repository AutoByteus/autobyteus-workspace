/**
 * 20261118_remove_retired_built_in_agents (autobyteus-491) on test-owned, synthesized app data: the installed folders
 * of the retired built-in Skill Self-Evolver (with its own skill) and Memory Compactor are deleted; every other agent
 * folder and every run folder, the retired agents' own runs and old episodic/semantic item files included, stays
 * byte-identical (REQ-003, REQ-004, REQ-005).
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDataMigrationDefinition } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { RemoveRetiredBuiltInAgentsMigration } from "../../../src/app-data-migrations/migrations/remove-retired-built-in-agents/remove-retired-built-in-agents-migration.js";

let tempDir: string;
let agentsDir: string;
let evolverDir: string;
let compactorDir: string;

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

/** The two installed copies as earlier builds wrote them. */
const populateInstalledCopies = async (which: { evolver?: boolean; compactor?: boolean } = { evolver: true, compactor: true }): Promise<void> => {
  if (which.evolver) {
    await writeText(path.join(evolverDir, "agent.md"), "---\nname: Skill Self-Evolver\n---\n\nOld built-in.\n");
    await writeText(path.join(evolverDir, "agent-config.json"), "{\"skillNames\":[\"retrospective-skill-coach\"]}");
    await writeText(path.join(evolverDir, "skills", "retrospective-skill-coach", "SKILL.md"), "# coach\n");
  }
  if (which.compactor) {
    await writeText(path.join(compactorDir, "agent.md"), "---\nname: Memory Compactor\n---\n\nOld built-in.\n");
    await writeText(path.join(compactorDir, "agent-config.json"), "{}");
  }
};

const migrationFor = () => new RemoveRetiredBuiltInAgentsMigration([
  { itemId: "skillSelfEvolverDir", dirPath: evolverDir },
  { itemId: "memoryCompactorDir", dirPath: compactorDir },
]);

/** Every file under a folder with its bytes, for a byte-identical comparison. */
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const files: Record<string, string> = {};
  for (const entry of await fs.readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath = path.join(entry.parentPath, entry.name);
    files[path.relative(root, filePath)] = (await fs.readFile(filePath)).toString("base64");
  }
  return files;
};

describe("RemoveRetiredBuiltInAgentsMigration", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "remove-retired-built-ins-"));
    agentsDir = path.join(tempDir, "app-data", "agents");
    evolverDir = path.join(agentsDir, "autobyteus-skill-evolver");
    compactorDir = path.join(agentsDir, "autobyteus-memory-compactor");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("is a startup-only required migration without prerequisites, and says the runs stay", () => {
    const migration: AppDataMigrationDefinition = migrationFor();

    expect(migration.id).toBe("20261118_remove_retired_built_in_agents");
    expect(migration.displayName).toBe("Remove retired built-in agents");
    expect(migration.description).toBe(
      "Permanently deletes the retired built-in agents Skill Self-Evolver (`agents/autobyteus-skill-evolver`) and Memory Compactor (`agents/autobyteus-memory-compactor`) from app data. Their runs stay. No backup is made.",
    );
    expect(migration.requiredOnStartup).toBe(true);
    expect(migration.executionPolicy).toBe("STARTUP_ONLY");
    expect(migration.prerequisiteMigrationIds).toBeUndefined();
  });

  it("deletes both installed copies with all their contents and succeeds", async () => {
    await populateInstalledCopies();

    const result = await migrationFor().execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.errorMessage).toBeNull();
    expect(result.summary).toEqual({
      scannedCount: 2, migratedCount: 2, skippedCount: 0, failedCount: 0,
      details: [
        { itemId: "skillSelfEvolverDir", filePath: evolverDir, status: "MIGRATED", message: "Removed." },
        { itemId: "memoryCompactorDir", filePath: compactorDir, status: "MIGRATED", message: "Removed." },
      ],
    });
    expect(await exists(evolverDir)).toBe(false);
    expect(await exists(compactorDir)).toBe(false);
    expect(await exists(agentsDir)).toBe(true);
  });

  it("removes the one that is present and skips the other", async () => {
    await populateInstalledCopies({ compactor: true });

    const result = await migrationFor().execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.details).toEqual([
      { itemId: "skillSelfEvolverDir", filePath: evolverDir, status: "SKIPPED", message: "Not present." },
      { itemId: "memoryCompactorDir", filePath: compactorDir, status: "MIGRATED", message: "Removed." },
    ]);
    expect(await exists(compactorDir)).toBe(false);
  });

  it("records nothing to remove when neither folder exists, and does nothing on a second run", async () => {
    const first = await migrationFor().execute();
    expect(first.status).toBe("SUCCEEDED");
    expect(first.summary).toMatchObject({ scannedCount: 2, migratedCount: 0, skippedCount: 2, failedCount: 0 });

    await populateInstalledCopies();
    await migrationFor().execute();
    const second = await migrationFor().execute();
    expect(second.summary).toMatchObject({ migratedCount: 0, skippedCount: 2, failedCount: 0 });
  });

  it("leaves every other agent folder and every run folder byte-identical, the retired agents' runs and old item files included", async () => {
    await populateInstalledCopies();
    const appData = path.join(tempDir, "app-data");
    const keep = {
      "agents/autobyteus-daily-assistant/agent.md": "assistant",
      "agents/autobyteus-model-router/agent.md": "router",
      "agents/my-user-agent/agent-config.json": "{\"x\":1}",
      "agents/autobyteus-skill-evolver-2/agent.md": "a user's own similarly named agent",
      "memory/agents/memory_compactor_1a2b3c4d/raw_traces_active.jsonl": "{\"id\":\"rt-1\"}\n",
      "memory/agents/memory_compactor_1a2b3c4d/run_metadata.json": "{\"agentDefinitionId\":\"autobyteus-memory-compactor\"}",
      "memory/agents/old_run_1/episodic.jsonl": "{\"id\":\"ep-1\",\"summary\":\"old\"}\n",
      "memory/agents/old_run_1/semantic.jsonl": "{\"id\":\"sem-1\",\"fact\":\"old\"}\n",
      "memory/agent_teams/team_1/member_1/raw_traces_active.jsonl": "{}\n",
    };
    for (const [rel, content] of Object.entries(keep)) await writeText(path.join(appData, rel), content);
    const before = await snapshot(appData);

    expect((await migrationFor().execute()).status).toBe("SUCCEEDED");

    const after = await snapshot(appData);
    const removedPrefixes = ["agents/autobyteus-skill-evolver/", "agents/autobyteus-memory-compactor/"];
    const expected = Object.fromEntries(Object.entries(before).filter(([rel]) => !removedPrefixes.some((prefix) => rel.startsWith(prefix))));
    expect(after).toEqual(expected);
    expect(Object.keys(after).sort()).toEqual(Object.keys(keep).sort());
  });

  it("reports FAILED without throwing when a folder cannot be removed, removes the other, and succeeds on the retry", async () => {
    await populateInstalledCopies();
    vi.spyOn(fs, "rm").mockRejectedValueOnce(Object.assign(new Error("EBUSY: resource busy or locked"), { code: "EBUSY" }));
    const migration = migrationFor();

    const result = await migration.execute();

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("A retired built-in agent folder could not be removed; the cleanup retries on the next start.");
    expect(result.summary).toMatchObject({ scannedCount: 2, migratedCount: 1, skippedCount: 0, failedCount: 1 });
    expect(result.summary.details[0]).toMatchObject({ itemId: "skillSelfEvolverDir", status: "FAILED" });
    expect(result.summary.details[0]?.message).toContain("Could not remove: EBUSY");
    expect(await exists(path.join(evolverDir, "agent.md"))).toBe(true);
    expect(await exists(compactorDir)).toBe(false);

    const retry = await migration.execute();
    expect(retry.status).toBe("SUCCEEDED");
    expect(retry.summary).toMatchObject({ migratedCount: 1, skippedCount: 1, failedCount: 0 });
    expect(await exists(evolverDir)).toBe(false);
  });

  it("reports an inspection failure without throwing", async () => {
    await populateInstalledCopies();
    vi.spyOn(fs, "lstat").mockRejectedValueOnce(Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }));

    const result = await migrationFor().execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.details[0]?.message).toContain("Could not inspect: EACCES");
    expect(await exists(evolverDir)).toBe(true);
  });

  it("removes a symlinked folder without touching the link target", async () => {
    const outsideTarget = path.join(tempDir, "outside", "agent");
    await writeText(path.join(outsideTarget, "agent.md"), "keep");
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.symlink(outsideTarget, evolverDir, "dir");

    const result = await migrationFor().execute();

    expect(result.summary.details[0]).toMatchObject({ itemId: "skillSelfEvolverDir", status: "MIGRATED" });
    expect(await exists(evolverDir)).toBe(false);
    expect(await fs.readFile(path.join(outsideTarget, "agent.md"), "utf-8")).toBe("keep");
  });
});
