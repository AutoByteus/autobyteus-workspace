import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { PROJECT_TASK_KEYS_V1_MIGRATION_ID, ProjectTaskKeysV1AppDataMigration } from "../../../src/app-data-migrations/migrations/project-task-keys-v1/project-task-keys-v1-app-data-migration.js";
import { PROJECTS_PER_FOLDER_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.js";
import { readReleasedTaskFileBeforeTitles } from "../../../src/app-data-migrations/migrations/project-task-titles/released-task-file-before-titles.js";
import {
  PROJECT_TASK_TITLES_MIGRATION_ID, ProjectTaskTitlesAppDataMigration,
} from "../../../src/app-data-migrations/migrations/project-task-titles/project-task-titles-app-data-migration.js";
import { titleFromFirstLine } from "../../../src/app-data-migrations/migrations/project-task-titles/title-from-first-line.js";
import * as frozenStoreUtils from "../../../src/app-data-migrations/frozen/server/persistence/file/store-utils.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";

/**
 * project-task-titles on small synthesized records with the four released keyed `task.json` shapes (key sets from
 * `evidence/SD-task-file-shape-inventory-output-20261025.txt`; every one already keyed by project-task-keys-v1):
 * 1. {taskId, projectId, taskKey, description, status, createdAt, updatedAt, contextFiles}
 * 2. 1 + {dependsOnTaskIds, partOfTaskId}
 * 3. 1 + {dependsOnTaskIds}
 * 4. 2 + {comments}
 * Never real user data.
 */
type Json = Record<string, unknown>;
const PROJECT = "project_a";
const releasedProject = (): Json => ({
  projectId: PROJECT, name: "AutoByteus", description: "", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
  workspaces: [], taskKeys: { prefix: "autobyteus", lastNumber: 9 },
});
const shape1 = (taskId: string, taskKey: string, description: string): Json => ({
  taskId, projectId: PROJECT, taskKey, description, status: "TODO", createdAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z",
  contextFiles: [{ storedFilename: "ctx_a__notes.txt", displayName: "notes.txt", mimeType: "text/plain", sizeBytes: 5 }],
});
const shape2 = (taskId: string, taskKey: string, description: string): Json => ({ ...shape1(taskId, taskKey, description), dependsOnTaskIds: ["task_1"], partOfTaskId: "task_3" });
const shape3 = (taskId: string, taskKey: string, description: string): Json => ({ ...shape1(taskId, taskKey, description), status: "DONE", dependsOnTaskIds: [] });
const shape4 = (taskId: string, taskKey: string, description: string): Json => ({
  ...shape2(taskId, taskKey, description), status: "IN_PROGRESS", comments: [{ id: 1, createdAt: "2026-10-04T00:00:00.000Z", text: "Started." }],
});
const LONG_LINE = `${"a".repeat(198)}😀${"b".repeat(20)}`;

describe("project-task-titles migration (AC-004)", () => {
  let appData: string, layout: ProjectsLayout, migration: ProjectTaskTitlesAppDataMigration;
  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-titles-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    migration = new ProjectTaskTitlesAppDataMigration(appData);
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });
  const write = async (file: string, value: unknown) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  const readJson = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8"));
  const seed = async () => {
    await write(layout.projectFile(PROJECT), releasedProject());
    await write(layout.taskFile(PROJECT, "task_1"), shape1("task_1", "autobyteus-1", "  Fix the login page  \n\nDetails follow."));
    await write(layout.taskFile(PROJECT, "task_2"), shape2("task_2", "autobyteus-2", "\n\n   \r\nAdd a title field\r\nmore"));
    await write(layout.taskFile(PROJECT, "task_3"), shape3("task_3", "autobyteus-3", `${LONG_LINE}\nsecond line`));
    await write(layout.taskFile(PROJECT, "task_4"), shape4("task_4", "autobyteus-4", "Short lists by default"));
  };
  const detail = (result: Awaited<ReturnType<ProjectTaskTitlesAppDataMigration["execute"]>>, id: string) =>
    result.summary.details.find((d) => d.itemId === id);

  it("is a required STARTUP_ONLY definition registered right after project-task-keys-v1, depending only on projects-per-folder-v1 (SR-012)", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const index = definitions.findIndex((d) => d.id === PROJECT_TASK_TITLES_MIGRATION_ID);
    // Not on keys-v1: its failure is per Project, and a whole-run prerequisite would leave every Project untitled (CR-001).
    expect(definitions[index]).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY", prerequisiteMigrationIds: [PROJECTS_PER_FOLDER_V1_MIGRATION_ID] });
    expect(index).toBe(definitions.findIndex((d) => d.id === PROJECT_TASK_KEYS_V1_MIGRATION_ID) + 1);
  });

  it("titles the released per-folder shape without taskKey too; the Task is listed once keys-v1 keys it, with its title kept", async () => {
    await write(layout.projectFile(PROJECT), releasedProject());
    // The per-folder shape before keys (projects-per-folder-v1 output): no taskKey.
    const { taskKey: _key, ...unkeyed } = shape2("task_unkeyed", "unused", "Plan the release\nDetails.");
    await write(layout.taskFile(PROJECT, "task_unkeyed"), unkeyed);
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 1 } });
    expect(await readJson(layout.taskFile(PROJECT, "task_unkeyed"))).toEqual({ ...unkeyed, title: "Plan the release" });
    // Admission is unchanged: no key, not listed.
    expect(await new ProjectStore(layout).listTasks(PROJECT)).toEqual([]);
    // keys-v1 later writes {...raw, taskKey}: the title stays and the Task is listed with it.
    const { taskKeys: _keys, ...unkeyedProject } = releasedProject() as Json & { taskKeys: unknown };
    await write(layout.projectFile(PROJECT), unkeyedProject);
    expect(await new ProjectTaskKeysV1AppDataMigration(appData).execute()).toMatchObject({ status: "SUCCEEDED" });
    expect((await new ProjectStore(layout).listTasks(PROJECT)).map((t) => [t.taskKey, t.title])).toEqual([["autobyteus-1", "Plan the release"]]);
  });

  it("a Project keys-v1 cannot key stays hidden alone: titles still runs, the other Projects list titled Tasks, and a later keying lists its Tasks with titles (CR-001)", async () => {
    const OTHER = "project_b";
    const unkeyedProject = (projectId: string, name: string, createdAt: string) =>
      ({ projectId, name, description: "", createdAt, updatedAt: createdAt, workspaces: [] });
    const unkeyedTask = (projectId: string, taskId: string, description: string, extra: Json = {}) => {
      const { taskKey: _key, ...task } = { ...shape1(taskId, "unused", description), projectId };
      return { ...task, ...extra };
    };
    await write(layout.projectFile(PROJECT), unkeyedProject(PROJECT, "AutoByteus", "2026-10-01T00:00:00.000Z"));
    await write(layout.projectFile(OTHER), unkeyedProject(OTHER, "Blocked", "2026-10-02T00:00:00.000Z"));
    await write(layout.taskFile(PROJECT, "task_main"), unkeyedTask(PROJECT, "task_main", "Main work\nmore"));
    // A Task already holding a different key: keys-v1 cannot key this Project (its released failure disposition).
    await write(layout.taskFile(OTHER, "task_blocked"), unkeyedTask(OTHER, "task_blocked", "Blocked work", { taskKey: "other-9" }));
    // One start: keys-v1 FAILED for one Project; titles has no prerequisite on it and runs.
    expect(await new ProjectTaskKeysV1AppDataMigration(appData).execute()).toMatchObject({ status: "FAILED" });
    expect(await migration.execute()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 2 } });
    const store = new ProjectStore(layout);
    expect((await store.listProjects()).map((p) => p.projectId)).toEqual([PROJECT]);
    expect((await store.listTasks(PROJECT)).map((t) => [t.taskKey, t.title])).toEqual([["autobyteus-1", "Main work"]]);
    // The conflict is fixed; the next start keys the Project and its Tasks list with the titles they already have.
    await write(layout.taskFile(OTHER, "task_blocked"), { ...(await readJson(layout.taskFile(OTHER, "task_blocked"))), taskKey: undefined });
    expect(await new ProjectTaskKeysV1AppDataMigration(appData).execute()).toMatchObject({ status: "SUCCEEDED" });
    expect(await new ProjectTaskTitlesAppDataMigration(appData).execute()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, skippedCount: 2 } });
    expect((await store.listTasks(OTHER)).map((t) => [t.taskKey, t.title])).toEqual([["blocked-1", "Blocked work"]]);
  });

  it("titles every released shape from its first non-empty line, changes nothing else, and the current store reads them", async () => {
    await seed();
    const before = Object.fromEntries(await Promise.all(["task_1", "task_2", "task_3", "task_4"].map(async (id) => [id, await readJson(layout.taskFile(PROJECT, id))])));
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 4, migratedCount: 4, skippedCount: 0, failedCount: 0 } });
    const titles: Record<string, string> = {
      task_1: "Fix the login page", task_2: "Add a title field", task_3: `${"a".repeat(198)}…`, task_4: "Short lists by default",
    };
    for (const [taskId, title] of Object.entries(titles)) {
      expect(await readJson(layout.taskFile(PROJECT, taskId))).toEqual({ ...before[taskId], title });
    }
    const tasks = await new ProjectStore(layout).listTasks(PROJECT);
    expect(tasks.map((task) => [task.taskKey, task.title]).sort()).toEqual([
      ["autobyteus-1", titles.task_1], ["autobyteus-2", titles.task_2], ["autobyteus-3", titles.task_3], ["autobyteus-4", titles.task_4],
    ]);
    expect(tasks.find((task) => task.taskId === "task_4")).toMatchObject({ comments: [{ id: 1, text: "Started." }], partOfTaskId: "task_3", dependsOnTaskIds: ["task_1"] });
  });

  it("is idempotent: a second start changes nothing", async () => {
    await seed();
    await migration.execute();
    const after = await Promise.all(["task_1", "task_2", "task_3", "task_4"].map((id) => fs.readFile(layout.taskFile(PROJECT, id), "utf8")));
    const second = await new ProjectTaskTitlesAppDataMigration(appData).execute();
    expect(second).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 4, migratedCount: 0, skippedCount: 4 } });
    expect(detail(second, "SKIPPED_ALREADY_CURRENT")?.message).toContain("Count: 4.");
    expect(await Promise.all(["task_1", "task_2", "task_3", "task_4"].map((id) => fs.readFile(layout.taskFile(PROJECT, id), "utf8")))).toEqual(after);
  });

  it("keeps a Task that already has a title, and leaves files that are not released Task files unchanged with a warning", async () => {
    await write(layout.projectFile(PROJECT), releasedProject());
    await write(layout.taskFile(PROJECT, "task_titled"), { ...shape1("task_titled", "autobyteus-5", "First line"), title: "Chosen by its writer" });
    await write(layout.taskFile(PROJECT, "task_wrong_project"), { ...shape1("task_wrong_project", "autobyteus-7", "x"), projectId: "elsewhere" });
    await write(layout.taskFile(PROJECT, "task_unknown_status"), { ...shape1("task_unknown_status", "autobyteus-8", "x"), status: "ARCHIVED" });
    await write(layout.taskFile(PROJECT, "task_blank"), shape1("task_blank", "autobyteus-9", " \n\t "));
    await write(layout.taskFile(PROJECT, "task_broken"), "{ not json");
    const refused = ["task_wrong_project", "task_unknown_status", "task_blank", "task_broken"];
    const unchanged = await Promise.all(refused.map((id) => fs.readFile(layout.taskFile(PROJECT, id), "utf8")));
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { scannedCount: 5, migratedCount: 0, skippedCount: 5, failedCount: 0 } });
    expect(detail(result, "SKIPPED_INVALID_TASK_WARNING")?.message).toContain("Count: 4.");
    expect((await readJson(layout.taskFile(PROJECT, "task_titled"))).title).toBe("Chosen by its writer");
    expect(await Promise.all(refused.map((id) => fs.readFile(layout.taskFile(PROJECT, id), "utf8")))).toEqual(unchanged);
  });

  it("titles a description that is not trimmed from its first non-empty line", async () => {
    await write(layout.projectFile(PROJECT), releasedProject());
    await write(layout.taskFile(PROJECT, "task_spaced"), shape1("task_spaced", "autobyteus-8", "\n  Indented first line\n"));
    expect(await migration.execute()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 1 } });
    expect((await readJson(layout.taskFile(PROJECT, "task_spaced"))).title).toBe("Indented first line");
  });

  it("skips a deleted Project's residue and a deleted Task's kept run resources", async () => {
    await write(path.join(layout.tasksDir("project_gone"), "task_x", "agent_run_resources.json"), { taskId: "task_x", executionResources: [] });
    await write(layout.projectFile(PROJECT), releasedProject());
    await write(path.join(layout.taskDir(PROJECT, "task_deleted"), "agent_run_resources.json"), { taskId: "task_deleted", executionResources: [] });
    expect(await migration.execute()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0 } });
  });

  it("fails only the Task whose write fails; the others are titled and a restart titles the rest", async () => {
    await seed();
    const real = frozenStoreUtils.writeJsonFile;
    const spy = vi.spyOn(frozenStoreUtils, "writeJsonFile").mockImplementation(async (file, value) => {
      if (String(file).includes("task_2")) throw new Error("disk full");
      return real(file, value);
    });
    const first = await migration.execute();
    expect(first).toMatchObject({ status: "FAILED", summary: { migratedCount: 3, failedCount: 1 } });
    expect(first.errorMessage).toContain(`${PROJECT}/task_2: disk full`);
    expect(Object.hasOwn(await readJson(layout.taskFile(PROJECT, "task_2")), "title")).toBe(false);
    expect((await new ProjectStore(layout).listTasks(PROJECT)).map((task) => task.taskId).sort()).toEqual(["task_1", "task_3", "task_4"]);
    spy.mockRestore();
    const retry = await new ProjectTaskTitlesAppDataMigration(appData).execute();
    expect(retry).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1, skippedCount: 3 } });
    expect((await readJson(layout.taskFile(PROJECT, "task_2"))).title).toBe("Add a title field");
  });
});

describe("titleFromFirstLine (frozen derivation)", () => {
  it("takes the first non-empty line, trimmed", () => {
    expect(titleFromFirstLine("\n \r\n  First  \nSecond")).toBe("First");
  });
  it("keeps a line of exactly 200 characters whole and cuts a longer one to 199 plus …", () => {
    expect(titleFromFirstLine("x".repeat(200))).toBe("x".repeat(200));
    expect(titleFromFirstLine("x".repeat(201))).toBe(`${"x".repeat(199)}…`);
  });
  it("never ends on half of a surrogate pair", () => {
    const title = titleFromFirstLine(LONG_LINE)!;
    expect(title).toBe(`${"a".repeat(198)}…`);
    expect(titleFromFirstLine(`${"a".repeat(197)}😀${"b".repeat(5)}`)).toBe(`${"a".repeat(197)}😀…`);
  });
  it("is never given a blank description (the frozen validator refuses one)", () => {
    expect(() => titleFromFirstLine(" \n\t")).toThrow();
  });
});

describe("readReleasedTaskFileBeforeTitles (frozen validator)", () => {
  const base = { taskId: "t", projectId: "p", description: "d", status: "TODO", createdAt: "2026-10-01", updatedAt: "2026-10-01" };
  it("accepts a released Task file keyed or not, and ignores other keys", () => {
    expect(readReleasedTaskFileBeforeTitles(base, "p", "t")).toEqual({ taskId: "t", description: "d" });
    expect(readReleasedTaskFileBeforeTitles({ ...base, taskKey: "p-1", comments: [], extra: true }, "p", "t")).toEqual({ taskId: "t", description: "d" });
  });
  it.each([
    ["another folder's Task", { ...base, taskId: "x" }], ["another folder's Project", { ...base, projectId: "x" }],
    ["a blank description", { ...base, description: "  " }], ["an unknown status", { ...base, status: "ARCHIVED" }],
    ["no createdAt", { ...base, createdAt: "" }], ["no updatedAt", { ...base, updatedAt: undefined }], ["not an object", ["t"]],
  ])("refuses %s", (_label, raw) => {
    expect(readReleasedTaskFileBeforeTitles(raw, "p", "t")).toBeNull();
  });
});
