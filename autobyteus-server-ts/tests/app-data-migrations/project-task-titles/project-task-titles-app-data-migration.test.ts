import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { PROJECT_TASK_KEYS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/project-task-keys-v1/project-task-keys-v1-app-data-migration.js";
import {
  PROJECT_TASK_TITLES_MIGRATION_ID, ProjectTaskTitlesAppDataMigration,
} from "../../../src/app-data-migrations/migrations/project-task-titles/project-task-titles-app-data-migration.js";
import { titleFromFirstLine } from "../../../src/app-data-migrations/migrations/project-task-titles/title-from-first-line.js";
import * as frozenStoreUtils from "../../../src/app-data-migrations/frozen/server/persistence/file/store-utils.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";

/**
 * project-task-titles on small synthesized records with the four released `task.json` shapes (key sets from
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

  it("is a required STARTUP_ONLY definition registered right after project-task-keys-v1, its prerequisite", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const index = definitions.findIndex((d) => d.id === PROJECT_TASK_TITLES_MIGRATION_ID);
    expect(definitions[index]).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY", prerequisiteMigrationIds: [PROJECT_TASK_KEYS_V1_MIGRATION_ID] });
    expect(index).toBe(definitions.findIndex((d) => d.id === PROJECT_TASK_KEYS_V1_MIGRATION_ID) + 1);
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

  it("keeps a Task that already has a title, and leaves files the pre-title reader refused unchanged with a warning", async () => {
    await write(layout.projectFile(PROJECT), releasedProject());
    await write(layout.taskFile(PROJECT, "task_titled"), { ...shape1("task_titled", "autobyteus-5", "First line"), title: "Chosen by its writer" });
    await write(layout.taskFile(PROJECT, "task_unkeyed"), { ...shape1("task_unkeyed", "autobyteus-6", "x"), taskKey: undefined });
    await write(layout.taskFile(PROJECT, "task_wrong_project"), { ...shape1("task_wrong_project", "autobyteus-7", "x"), projectId: "elsewhere" });
    await write(layout.taskFile(PROJECT, "task_broken"), "{ not json");
    const unchanged = await Promise.all(["task_unkeyed", "task_wrong_project", "task_broken"].map((id) => fs.readFile(layout.taskFile(PROJECT, id), "utf8")));
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { scannedCount: 4, migratedCount: 0, skippedCount: 4, failedCount: 0 } });
    expect(detail(result, "SKIPPED_INVALID_TASK_WARNING")?.message).toContain("Count: 3.");
    expect((await readJson(layout.taskFile(PROJECT, "task_titled"))).title).toBe("Chosen by its writer");
    expect(await Promise.all(["task_unkeyed", "task_wrong_project", "task_broken"].map((id) => fs.readFile(layout.taskFile(PROJECT, id), "utf8")))).toEqual(unchanged);
  });

  it("titles every Task the pre-title reader accepted, including a description that is not trimmed", async () => {
    // The pre-title reader required only a non-empty description string, not a trimmed one.
    await write(layout.projectFile(PROJECT), releasedProject());
    await write(layout.taskFile(PROJECT, "task_spaced"), shape1("task_spaced", "autobyteus-8", "\n  Indented first line\n"));
    await write(layout.taskFile(PROJECT, "task_blank"), shape1("task_blank", "autobyteus-9", " \n\t "));
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { scannedCount: 2, migratedCount: 1, skippedCount: 1 } });
    expect((await readJson(layout.taskFile(PROJECT, "task_spaced"))).title).toBe("Indented first line");
    expect(detail(result, "SKIPPED_NO_TITLE_LINE_WARNING")?.message).toContain(`${PROJECT}/task_blank`);
    expect(Object.hasOwn(await readJson(layout.taskFile(PROJECT, "task_blank")), "title")).toBe(false);
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
  it("has no title for a description without a non-empty line", () => {
    expect(titleFromFirstLine(" \n\t")).toBeNull();
  });
});
