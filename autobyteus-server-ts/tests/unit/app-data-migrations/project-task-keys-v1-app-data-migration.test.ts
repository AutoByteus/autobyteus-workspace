import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { PROJECTS_PER_FOLDER_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.js";
import {
  PROJECT_TASK_KEYS_V1_MIGRATION_ID, ProjectTaskKeysV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/project-task-keys-v1/project-task-keys-v1-app-data-migration.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";

/**
 * project-task-keys-v1 on small synthesized records with the released (c600028072) per-folder shapes:
 * `project.json` {projectId, name, description, createdAt, updatedAt, workspaces[{workspaceRootPath, description}]}
 * (older files may still carry `workspaceId` / `addedAt` in links) and `task.json` {taskId, projectId, description,
 * status, createdAt, updatedAt, contextFiles}. Never real user data.
 */
type Json = Record<string, unknown>;
const releasedProject = (projectId: string, name: string, createdAt: string, extra: Json = {}): Json => ({
  projectId, name, description: `About ${name}`, createdAt, updatedAt: "2026-10-10T00:00:00.000Z",
  workspaces: [{ workspaceRootPath: `/work/${projectId}`, description: "Source" }], ...extra,
});
const releasedTask = (projectId: string, taskId: string, createdAt: string, status = "TODO", extra: Json = {}): Json => ({
  taskId, projectId, description: `Task ${taskId}`, status, createdAt, updatedAt: "2026-10-11T00:00:00.000Z",
  contextFiles: [{ storedFilename: "ctx_a__notes.txt", displayName: "notes.txt", mimeType: "text/plain", sizeBytes: 5 }], ...extra,
});
const detail = (result: Awaited<ReturnType<ProjectTaskKeysV1AppDataMigration["execute"]>>, id: string) =>
  result.summary.details.find((d) => d.itemId === id);

describe("project-task-keys-v1 migration (AC-006)", () => {
  let appData: string, layout: ProjectsLayout, migration: ProjectTaskKeysV1AppDataMigration;
  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-keys-v1-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    migration = new ProjectTaskKeysV1AppDataMigration(appData);
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });
  const write = async (file: string, value: unknown) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  const readJson = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8"));
  /** Every file under the Projects root with its bytes. */
  const snapshot = async (): Promise<Record<string, string>> => {
    const out: Record<string, string> = {};
    const walk = async (dir: string) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full); else out[path.relative(layout.root, full)] = await fs.readFile(full, "utf8");
      }
    };
    await walk(layout.root);
    return out;
  };
  const seedReleased = async () => {
    // "AutoByteus" is older than "AutoByteus Agents"; "autobyteus" (lower case, newest) collides on the prefix.
    await write(layout.projectFile("project_b"), releasedProject("project_b", "AutoByteus Agents", "2026-10-02T00:00:00.000Z"));
    await write(layout.projectFile("project_a"), releasedProject("project_a", "AutoByteus", "2026-10-01T00:00:00.000Z", {
      workspaces: [{ workspaceId: "released_ws", workspaceRootPath: "/work/a", description: "Old link", addedAt: "2026-09-26" }] }));
    await write(layout.projectFile("project_c"), releasedProject("project_c", "AutoByteus!", "2026-10-03T00:00:00.000Z"));
    // Tasks of project_a out of folder order, one createdAt tie (broken by taskId), all four statuses.
    await write(layout.taskFile("project_a", "task_z"), releasedTask("project_a", "task_z", "2026-10-01T01:00:00.000Z", "DONE"));
    await write(layout.taskFile("project_a", "task_y"), releasedTask("project_a", "task_y", "2026-10-01T03:00:00.000Z", "CANCELLED"));
    await write(layout.taskFile("project_a", "task_b"), releasedTask("project_a", "task_b", "2026-10-01T02:00:00.000Z", "IN_PROGRESS"));
    await write(layout.taskFile("project_a", "task_a"), releasedTask("project_a", "task_a", "2026-10-01T02:00:00.000Z"));
    await write(layout.taskFile("project_b", "task_1"), releasedTask("project_b", "task_1", "2026-10-02T01:00:00.000Z"));
  };

  it("is a required STARTUP_ONLY definition registered after projects-per-folder-v1, its prerequisite", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const index = definitions.findIndex((d) => d.id === PROJECT_TASK_KEYS_V1_MIGRATION_ID);
    expect(definitions[index]).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY", prerequisiteMigrationIds: [PROJECTS_PER_FOLDER_V1_MIGRATION_ID] });
    expect(index).toBeGreaterThan(definitions.findIndex((d) => d.id === PROJECTS_PER_FOLDER_V1_MIGRATION_ID));
  });

  it("keys every valid Task in creation order, reserves prefixes in Project creation order, and changes nothing else", async () => {
    await seedReleased();
    const before = await snapshot();
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 3, migratedCount: 3, skippedCount: 0, failedCount: 0 } });

    const keys = async (projectId: string) => Object.fromEntries(await Promise.all((await fs.readdir(layout.tasksDir(projectId)))
      .map(async (taskId) => [taskId, (await readJson(layout.taskFile(projectId, taskId))).taskKey])));
    expect(await keys("project_a")).toEqual({ task_z: "autobyteus-1", task_a: "autobyteus-2", task_b: "autobyteus-3", task_y: "autobyteus-4" });
    expect(await keys("project_b")).toEqual({ task_1: "autobyteus-agents-1" });
    expect((await readJson(layout.projectFile("project_a"))).taskKeys).toEqual({ prefix: "autobyteus", lastNumber: 4 });
    expect((await readJson(layout.projectFile("project_b"))).taskKeys).toEqual({ prefix: "autobyteus-agents", lastNumber: 1 });
    expect((await readJson(layout.projectFile("project_c"))).taskKeys).toEqual({ prefix: "autobyteus-2", lastNumber: 0 });

    // Only the two fields were added; every other key and value (old link extras included) is unchanged.
    const after = await snapshot();
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    for (const [file, bytes] of Object.entries(before)) {
      const { taskKey: _key, taskKeys: _keys, ...rest } = JSON.parse(after[file]!);
      expect(rest).toEqual(JSON.parse(bytes));
    }

    // The current runtime admits everything, and the next create continues after the highest number.
    const store = new ProjectStore(layout);
    expect((await store.listProjects()).map((p) => p.projectId).sort()).toEqual(["project_a", "project_b", "project_c"]);
    expect((await store.listTasks("project_a")).map((t) => t.dependsOnTaskIds)).toEqual([[], [], [], []]);
    const created = await new ProjectTaskService({ store }).createTask({ projectId: "project_a", description: "New" });
    expect(created.taskKey).toBe("autobyteus-5");
    expect((await new ProjectTaskService({ store }).createTask({ projectId: "project_c", description: "New" })).taskKey).toBe("autobyteus-2-1");
  });

  it("a second start changes nothing", async () => {
    await seedReleased();
    await migration.execute();
    const keyed = await snapshot();
    const second = await new ProjectTaskKeysV1AppDataMigration(appData).execute();
    expect(second).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 3, migratedCount: 0, skippedCount: 3, failedCount: 0 } });
    expect(detail(second, "SKIPPED_ALREADY_CURRENT")?.message).toContain("Count: 3");
    expect(await snapshot()).toEqual(keyed);
  });

  it("preserves an invalid project.json and an invalid task.json with warnings; residue folders are not candidates", async () => {
    await seedReleased();
    await write(layout.projectFile("project_broken"), { projectId: "project_broken", name: "", description: "", createdAt: "x", updatedAt: "x", workspaces: [] });
    await write(layout.projectFile("project_garbage"), "{ not json");
    await write(layout.taskFile("project_a", "task_broken"), { taskId: "task_broken", projectId: "project_a", description: "", status: "TODO" });
    await write(layout.taskFile("project_a", "task_other_project"), releasedTask("project_x", "task_other_project", "2026-10-01T00:30:00.000Z"));
    await write(layout.taskExecutionResourcesFile("project_a", "task_deleted"), { taskId: "task_deleted", agentRunResources: [] });
    await write(path.join(layout.tasksDir("project_deleted"), "task_old", "agent_run_resources.json"), { taskId: "task_old", agentRunResources: [] });
    const preserved = ["project_broken/project.json", "project_garbage/project.json", "project_a/tasks/task_broken/task.json",
      "project_a/tasks/task_other_project/task.json", "project_a/tasks/task_deleted/agent_run_resources.json", "project_deleted/tasks/task_old/agent_run_resources.json"];
    const before = await snapshot();

    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { scannedCount: 5, migratedCount: 3, failedCount: 0 } });
    expect(detail(result, "SKIPPED_INVALID_PROJECT_WARNING")?.message).toContain("Count: 2");
    expect(detail(result, "SKIPPED_INVALID_TASK_WARNING")?.message).toContain("Count: 2");
    const after = await snapshot();
    for (const file of preserved) expect(after[file]).toBe(before[file]);
    expect((await readJson(layout.projectFile("project_a"))).taskKeys).toEqual({ prefix: "autobyteus", lastNumber: 4 });
    await expect(fs.access(layout.projectFile("project_deleted"))).rejects.toThrow();
  });

  it("keeps a Project that cannot be keyed preserved and hidden, keys the others, and a restart finishes it with the same keys", async () => {
    await seedReleased();
    const rename = fs.rename.bind(fs);
    let failed = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (!failed && String(to) === layout.taskFile("project_a", "task_b")) { failed = true; throw new Error("interrupted"); }
      return rename(from, to);
    });
    const first = await migration.execute();
    expect(first).toMatchObject({ status: "FAILED", summary: { migratedCount: 2, failedCount: 1 } });
    expect(first.errorMessage).toContain("project_a");
    expect(await readJson(layout.projectFile("project_a"))).not.toHaveProperty("taskKeys");
    // Other Projects and new work keep working; the unkeyed Project is preserved but not shown.
    const store = new ProjectStore(layout);
    expect((await store.listProjects()).map((p) => p.projectId).sort()).toEqual(["project_b", "project_c"]);
    expect((await new ProjectTaskService({ store }).createTask({ projectId: "project_b", description: "New work" })).taskKey).toBe("autobyteus-agents-2");

    vi.restoreAllMocks();
    const retry = await new ProjectTaskKeysV1AppDataMigration(appData).execute();
    expect(retry).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1, skippedCount: 2, failedCount: 0 } });
    expect((await readJson(layout.taskFile("project_a", "task_z"))).taskKey).toBe("autobyteus-1");
    expect((await readJson(layout.taskFile("project_a", "task_b"))).taskKey).toBe("autobyteus-3");
    expect((await readJson(layout.projectFile("project_a"))).taskKeys).toEqual({ prefix: "autobyteus", lastNumber: 4 });
    expect((await readJson(layout.projectFile("project_b"))).taskKeys).toEqual({ prefix: "autobyteus-agents", lastNumber: 2 });
  });

  it("refuses to overwrite a Task that holds a different key: the Project fails and nothing of it is written", async () => {
    await seedReleased();
    await write(layout.taskFile("project_a", "task_a"), releasedTask("project_a", "task_a", "2026-10-01T02:00:00.000Z", "TODO", { taskKey: "other-7" }));
    const before = await snapshot();
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "FAILED", summary: { migratedCount: 2, failedCount: 1 } });
    expect(result.errorMessage).toContain("other-7");
    const after = await snapshot();
    for (const file of Object.keys(before).filter((f) => f.startsWith("project_a/"))) expect(after[file]).toBe(before[file]);
  });

  it("a fresh install is a no-op", async () => {
    expect(await migration.execute()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0, migratedCount: 0 } });
    await expect(fs.access(layout.root)).rejects.toThrow();
  });
});
