import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import type { Project, ProjectTask } from "../../../src/projects/domain/models.js";

/** Task keys, "depends on" and "part of" in the per-Project store: written key sets, allocation, immutability, readers. */
const CREATED = "2026-10-17T00:00:00.000Z";
const project = (projectId: string, prefix = "autobyteus", lastNumber = 0): Project => ({ projectId, name: "AutoByteus", description: "",
  createdAt: CREATED, updatedAt: CREATED, workspaces: [], taskKeys: { prefix, lastNumber } });
const task = (taskId: string, dependsOnTaskIds: string[] = []): Omit<ProjectTask, "taskKey"> => ({ taskId, title: `Title ${taskId}`, description: `Task ${taskId}`, status: "TODO",
  dependsOnTaskIds, partOfTaskId: null, comments: [], createdAt: CREATED, updatedAt: CREATED, contextFiles: [] });

describe("ProjectStore Task keys and dependencies", () => {
  let root: string, layout: ProjectsLayout, store: ProjectStore;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-store-keys-"));
    layout = new ProjectsLayout(path.join(root, "projects"));
    store = new ProjectStore(layout);
    await store.createProject(() => project("project_A"));
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

  it("writes exactly the current key sets of project.json and task.json", async () => {
    await store.createTask("project_A", "task_1", async () => task("task_1", ["task_0"]));
    expect(Object.keys(await readJson(layout.projectFile("project_A"))).sort())
      .toEqual(["createdAt", "description", "name", "projectId", "taskKeys", "updatedAt", "workspaces"]);
    expect(Object.keys((await readJson(layout.projectFile("project_A"))).taskKeys).sort()).toEqual(["lastNumber", "prefix"]);
    const written = await readJson(layout.taskFile("project_A", "task_1"));
    expect(Object.keys(written).sort())
      .toEqual(["comments", "contextFiles", "createdAt", "dependsOnTaskIds", "description", "partOfTaskId", "projectId", "status", "taskId", "taskKey", "title", "updatedAt"]);
    expect(written).toMatchObject({ taskKey: "autobyteus-1", dependsOnTaskIds: ["task_0"], partOfTaskId: null });
    await store.updateTask("project_A", "task_1", (current) => ({ ...current, partOfTaskId: "task_0" }));
    expect(await readJson(layout.taskFile("project_A", "task_1"))).toMatchObject({ partOfTaskId: "task_0" });
  });

  it("reads a task.json without partOfTaskId (every file written before part-of) as having no parent, unchanged until it is saved (AC-016)", async () => {
    await store.createTask("project_A", "task_1", async () => task("task_1"));
    const { partOfTaskId: _absent, ...before } = await readJson(layout.taskFile("project_A", "task_1"));
    const bytes = JSON.stringify(before, null, 2);
    await fs.writeFile(layout.taskFile("project_A", "task_1"), bytes);
    expect((await store.readTask("project_A", "task_1"))!.partOfTaskId).toBeNull();
    expect((await store.listTasks("project_A")).map((t) => t.partOfTaskId)).toEqual([null]);
    expect(await fs.readFile(layout.taskFile("project_A", "task_1"), "utf8")).toBe(bytes);
    for (const partOfTaskId of ["", 7, null, ["task_2"]]) {
      await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify({ ...before, partOfTaskId }));
      expect((await store.readTask("project_A", "task_1"))!.partOfTaskId).toBeNull();
    }
    await store.updateTask("project_A", "task_1", (current) => ({ ...current, description: "Saved" }));
    expect(await readJson(layout.taskFile("project_A", "task_1"))).toMatchObject({ description: "Saved", partOfTaskId: null });
  });

  it("allocates the next number in the first write and leaves the Project's updatedAt unchanged (REC-002)", async () => {
    const first = await store.createTask("project_A", "task_1", async () => task("task_1"));
    const second = await store.createTask("project_A", "task_2", async () => task("task_2"));
    expect([first.taskKey, second.taskKey]).toEqual(["autobyteus-1", "autobyteus-2"]);
    expect(await readJson(layout.projectFile("project_A"))).toEqual(project("project_A", "autobyteus", 2));
  });

  it("never reuses a number, also after deleting the newest Task (AC-002)", async () => {
    await store.createTask("project_A", "task_1", async () => task("task_1"));
    await store.createTask("project_A", "task_2", async () => task("task_2"));
    await store.deleteTask("project_A", "task_2");
    expect((await store.createTask("project_A", "task_3", async () => task("task_3"))).taskKey).toBe("autobyteus-3");
  });

  it("gives concurrent creates distinct consecutive numbers (QR-001)", async () => {
    const created = await Promise.all(Array.from({ length: 12 }, (_, i) => store.createTask("project_A", `task_${i}`, async () => task(`task_${i}`))));
    expect(created.map((t) => Number(t.taskKey.split("-").at(-1))).sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect((await store.readProject("project_A"))!.taskKeys.lastNumber).toBe(12);
  });

  it("spends no number when the create's prepare step fails", async () => {
    await expect(store.createTask("project_A", "task_1", async () => { throw new Error("context failed"); })).rejects.toThrow("context failed");
    expect((await store.createTask("project_A", "task_2", async () => task("task_2"))).taskKey).toBe("autobyteus-1");
  });

  it("keeps a Task's key and a Project's key state whatever an update returns", async () => {
    await store.createTask("project_A", "task_1", async () => task("task_1"));
    const updated = await store.updateTask("project_A", "task_1", (current) => ({ ...current, taskKey: "other-9", description: "Changed" }));
    expect(updated).toMatchObject({ taskKey: "autobyteus-1", description: "Changed" });
    expect((await readJson(layout.taskFile("project_A", "task_1"))).taskKey).toBe("autobyteus-1");
    const renamed = await store.updateProject("project_A", (current) => ({ ...current, name: "AutoByteus Core", taskKeys: { prefix: "autobyteus-core", lastNumber: 0 } }));
    expect(renamed.taskKeys).toEqual({ prefix: "autobyteus", lastNumber: 1 });
    expect((await readJson(layout.projectFile("project_A"))).taskKeys).toEqual({ prefix: "autobyteus", lastNumber: 1 });
  });

  it("admits a Project only with valid taskKeys and a Task only with a taskKey; dependsOnTaskIds absent means none", async () => {
    await store.createTask("project_A", "task_1", async () => task("task_1"));
    const raw = await readJson(layout.taskFile("project_A", "task_1"));
    const { dependsOnTaskIds: _omitted, ...withoutDependencies } = raw;
    await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify(withoutDependencies));
    expect((await store.readTask("project_A", "task_1"))!.dependsOnTaskIds).toEqual([]);
    await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify({ ...raw, dependsOnTaskIds: ["task_2", 7, "", null] }));
    expect((await store.readTask("project_A", "task_1"))!.dependsOnTaskIds).toEqual(["task_2"]);
    const { taskKey: _key, ...unkeyedTask } = raw;
    await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify(unkeyedTask));
    expect(await store.listTasks("project_A")).toEqual([]);
    // A Task file without a non-blank title is not current (project-task-titles gives existing Tasks theirs).
    for (const title of [undefined, "", "  ", 7]) {
      await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify({ ...raw, title }));
      expect(await store.listTasks("project_A")).toEqual([]);
    }
    await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify(raw));
    expect((await store.readTask("project_A", "task_1"))!.title).toBe("Title task_1");
    const projectRaw = await readJson(layout.projectFile("project_A"));
    for (const taskKeys of [undefined, null, { prefix: "", lastNumber: 1 }, { prefix: "a", lastNumber: -1 }, { prefix: "a", lastNumber: 1.5 }]) {
      await fs.writeFile(layout.projectFile("project_A"), JSON.stringify({ ...projectRaw, taskKeys }));
      expect(await store.listProjects()).toEqual([]);
    }
  });

  it("reads a task.json without comments (every file written before task-comments) as none and keeps only well-formed comments in ID order (AC-011)", async () => {
    await store.createTask("project_A", "task_1", async () => task("task_1"));
    const { comments: _absent, ...before } = await readJson(layout.taskFile("project_A", "task_1"));
    const bytes = JSON.stringify(before, null, 2);
    await fs.writeFile(layout.taskFile("project_A", "task_1"), bytes);
    expect((await store.readTask("project_A", "task_1"))!.comments).toEqual([]);
    expect(await fs.readFile(layout.taskFile("project_A", "task_1"), "utf8")).toBe(bytes);
    await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify({ ...before, comments: [
      { id: 2, createdAt: "t2", text: "second" }, { id: 1, createdAt: "t1", text: "first", extra: true }, { id: 0, createdAt: "t", text: "zero" },
      { id: 3, createdAt: "t3", text: "" }, { id: "4", createdAt: "t4", text: "string id" }, null, "text", { id: 5, text: "no time" },
    ] }));
    expect((await store.readTask("project_A", "task_1"))!.comments).toEqual([{ id: 1, createdAt: "t1", text: "first" }, { id: 2, createdAt: "t2", text: "second" }]);
    await fs.writeFile(layout.taskFile("project_A", "task_1"), JSON.stringify({ ...before, comments: "not a list" }));
    expect((await store.readTask("project_A", "task_1"))!.comments).toEqual([]);
    await store.updateTask("project_A", "task_1", (current) => ({ ...current, description: "Saved" }));
    expect(await readJson(layout.taskFile("project_A", "task_1"))).toMatchObject({ description: "Saved", comments: [] });
  });

  it("serializes relation-changing writes (dependencies and parent) of one Project", async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const first = store.withTaskRelations("project_A", async () => { order.push("first:start"); await new Promise<void>((r) => { releaseFirst = r; }); order.push("first:end"); });
    await new Promise((r) => setTimeout(r, 20));
    const second = store.withTaskRelations("project_A", async () => { order.push("second"); });
    await new Promise((r) => setTimeout(r, 20));
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "first:end", "second"]);
    await expect(store.withTaskRelations("project_missing", async () => undefined)).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });
});
