import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";

import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { ProjectTaskContextLayout } from "../../../src/projects/context/project-task-context-layout.js";

const createHarness = async () => {
  const appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "project-tasks-service-"));
  const contextStore = new ProjectTaskContextStore(new ProjectTaskContextLayout(path.join(appDataDir, "projects")));
  const store = new ProjectStore({ getAppDataDir: () => appDataDir });
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 8, 26, 0, 0, tick++));
  let projectCounter = 0;
  let taskCounter = 0;
  const projects = new ProjectService({
    store,
    contextStore,
    workspaceLookup: { getRegisteredWorkspaceRootPath: vi.fn(async () => null) },
    now,
    createId: () => `project_${++projectCounter}`,
  });
  const tasks = new ProjectTaskService({ store, contextStore, now, createId: () => `project_task_${++taskCounter}` });
  const readFile = async () => JSON.parse(await fs.readFile(store.getFilePath(), "utf-8"));
  return { appDataDir, store, projects, tasks, readFile };
};

const expectProjectError = async (promise: Promise<unknown>, code: string) => {
  const error = await promise.then(() => null, (cause: unknown) => cause);
  expect(error).toBeInstanceOf(ProjectError);
  expect((error as ProjectError).code).toBe(code);
};

describe("ProjectTaskService", () => {
  let harness: Awaited<ReturnType<typeof createHarness>>;
  let projectId: string;

  beforeEach(async () => {
    harness = await createHarness();
    projectId = (await harness.projects.createProject({ name: "AutoByteus" })).projectId;
  });

  afterEach(async () => {
    await fs.rm(harness.appDataDir, { recursive: true, force: true });
  });

  it("creates a TODO Task from a trimmed multi-line description and stores it inside the Project", async () => {
    const task = await harness.tasks.createTask({
      projectId,
      description: "  Write release notes for 1.4.87\nInclude Projects and Tasks  \n",
    });

    expect(task).toEqual({
      taskId: "project_task_1",
      projectId,
      description: "Write release notes for 1.4.87\nInclude Projects and Tasks",
      status: "TODO",
      contextFiles: [],
      createdAt: expect.any(String),
      updatedAt: task.createdAt,
    });
    const [stored] = await harness.readFile();
    expect(stored.tasks).toEqual([{
      taskId: "project_task_1",
      description: "Write release notes for 1.4.87\nInclude Projects and Tasks",
      status: "TODO",
      contextFiles: [],
      createdAt: task.createdAt,
      updatedAt: task.createdAt,
    }]);
    expect(stored.tasks[0]).not.toHaveProperty("projectId");
    expect((await harness.projects.getProject(projectId))?.openTaskCount).toBe(1);
  });

  it.each([[""], ["   "], ["\n\t\n"]])("rejects an empty description %j without writing", async (description) => {
    const before = await harness.readFile();
    await expectProjectError(harness.tasks.createTask({ projectId, description }), "TASK_DESCRIPTION_REQUIRED");
    expect(await harness.readFile()).toEqual(before);
  });

  it("rejects Task operations on an unknown Project", async () => {
    await expectProjectError(harness.tasks.listTasks("project_missing"), "PROJECT_NOT_FOUND");
    await expectProjectError(
      harness.tasks.createTask({ projectId: "project_missing", description: "x" }),
      "PROJECT_NOT_FOUND",
    );
    await expectProjectError(
      harness.tasks.deleteTask({ projectId: "project_missing", taskId: "t" }),
      "PROJECT_NOT_FOUND",
    );
  });

  it("lists Tasks most recently updated first", async () => {
    const first = await harness.tasks.createTask({ projectId, description: "first" });
    await harness.tasks.createTask({ projectId, description: "second" });
    await harness.tasks.createTask({ projectId, description: "third" });
    await harness.tasks.updateTask({ projectId, taskId: first.taskId, description: "first, edited" });

    const listed = await harness.tasks.listTasks(projectId);
    expect(listed.map((task) => task.description)).toEqual(["first, edited", "third", "second"]);
    expect(listed.every((task) => task.projectId === projectId)).toBe(true);
  });

  it("orders Tasks with equal update times by taskId", async () => {
    const fixed = new ProjectTaskService({
      store: harness.store,
      now: () => new Date(Date.UTC(2026, 8, 27)),
      createId: (() => { let n = 0; return () => `project_task_z${++n}`; })(),
    });
    await fixed.createTask({ projectId, description: "b" });
    await fixed.createTask({ projectId, description: "a" });

    expect((await fixed.listTasks(projectId)).map((task) => task.taskId)).toEqual(["project_task_z1", "project_task_z2"]);
  });

  it("edits only the description and updatedAt; status stays TODO", async () => {
    const task = await harness.tasks.createTask({ projectId, description: "old" });

    const edited = await harness.tasks.updateTask({ projectId, taskId: task.taskId, description: " new\nsecond line " });

    expect(edited).toMatchObject({
      taskId: task.taskId,
      description: "new\nsecond line",
      status: "TODO",
      contextFiles: [],
      createdAt: task.createdAt,
    });
    expect(edited.updatedAt > task.updatedAt).toBe(true);
  });

  it("rejects editing a missing Task or with an empty description, leaving the file intact", async () => {
    const task = await harness.tasks.createTask({ projectId, description: "keep" });
    const before = await harness.readFile();

    await expectProjectError(
      harness.tasks.updateTask({ projectId, taskId: "project_task_missing", description: "x" }),
      "TASK_NOT_FOUND",
    );
    await expectProjectError(
      harness.tasks.updateTask({ projectId, taskId: task.taskId, description: "  " }),
      "TASK_DESCRIPTION_REQUIRED",
    );
    expect(await harness.readFile()).toEqual(before);
  });

  it("deletes a Task and reports whether it existed", async () => {
    const keep = await harness.tasks.createTask({ projectId, description: "keep" });
    const drop = await harness.tasks.createTask({ projectId, description: "drop" });

    await expect(harness.tasks.deleteTask({ projectId, taskId: drop.taskId })).resolves.toBe(true);
    await expect(harness.tasks.deleteTask({ projectId, taskId: drop.taskId })).resolves.toBe(false);
    expect((await harness.tasks.listTasks(projectId)).map((task) => task.taskId)).toEqual([keep.taskId]);
  });

  it("never changes the Project's own fields or updatedAt", async () => {
    const [before] = await harness.readFile();

    const task = await harness.tasks.createTask({ projectId, description: "a" });
    await harness.tasks.updateTask({ projectId, taskId: task.taskId, description: "b" });
    await harness.tasks.createTask({ projectId, description: "c" });
    await harness.tasks.deleteTask({ projectId, taskId: task.taskId });

    const [after] = await harness.readFile();
    const { tasks: _beforeTasks, ...beforeFields } = before;
    const { tasks: _afterTasks, ...afterFields } = after;
    expect(afterFields).toEqual(beforeFields);
  });

  it("keeps other Projects' Tasks separate", async () => {
    const other = (await harness.projects.createProject({ name: "Marketing" })).projectId;
    await harness.tasks.createTask({ projectId, description: "mine" });
    await harness.tasks.createTask({ projectId: other, description: "theirs" });

    expect((await harness.tasks.listTasks(projectId)).map((task) => task.description)).toEqual(["mine"]);
    expect((await harness.tasks.listTasks(other)).map((task) => task.description)).toEqual(["theirs"]);
  });

  it("leaves the previous file intact when the atomic write fails (QR-001)", async () => {
    await harness.tasks.createTask({ projectId, description: "existing" });
    const before = await fs.readFile(harness.store.getFilePath(), "utf-8");

    const renameSpy = vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("disk full"));
    try {
      await expect(harness.tasks.createTask({ projectId, description: "new" })).rejects.toThrow("disk full");
    } finally {
      renameSpy.mockRestore();
    }

    expect(await fs.readFile(harness.store.getFilePath(), "utf-8")).toBe(before);
    expect((await harness.tasks.listTasks(projectId)).map((task) => task.description)).toEqual(["existing"]);
  });

  it("patches only supplied fields, supports reset/reopen, exact filtering and same-state retry", async () => {
    const task = await harness.tasks.createTask({projectId, description: "unchanged"});
    const beforeProject = (await harness.readFile())[0];
    const active = await harness.tasks.updateTask({projectId, taskId: task.taskId, status: "IN_PROGRESS"});
    expect(active.description).toBe(task.description);
    expect(active.createdAt).toBe(task.createdAt);
    expect(await harness.tasks.updateTask({projectId, taskId: task.taskId, status: "IN_PROGRESS"})).toEqual(active);
    expect(await harness.tasks.listTasks(projectId, "TODO")).toEqual([]);
    expect(await harness.tasks.listTasks(projectId, "IN_PROGRESS")).toEqual([active]);
    await harness.tasks.updateTask({projectId, taskId: task.taskId, status: "DONE"});
    await harness.tasks.updateTask({projectId, taskId: task.taskId, status: "TODO"});
    expect((await harness.readFile())[0].updatedAt).toBe(beforeProject.updatedAt);
    await expectProjectError(harness.tasks.updateTask({projectId, taskId: task.taskId}), "TASK_PATCH_REQUIRED");
    await expectProjectError(harness.tasks.updateTask({projectId, taskId: task.taskId, status: "bad" as never}), "TASK_STATUS_INVALID");
  });
  it("merges independent concurrent text and status writes against current records", async () => {
    const task = await harness.tasks.createTask({projectId, description: "old"});
    await Promise.all([
      harness.tasks.updateTask({projectId, taskId: task.taskId, description: "new"}),
      harness.tasks.updateTask({projectId, taskId: task.taskId, status: "DONE"}),
    ]);
    expect((await harness.tasks.listTasks(projectId))[0]).toMatchObject({description: "new", status: "DONE"});
  });
});
