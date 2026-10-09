import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import type { Project, ProjectTask } from "../../../src/projects/domain/models.js";

const project = (projectId: string): Project => ({ projectId, name: projectId, description: "", createdAt: "2026-10-05T00:00:00.000Z",
  updatedAt: "2026-10-05T00:00:00.000Z", workspaces: [] });
const task = (taskId: string): ProjectTask => ({ taskId, description: `Task ${taskId}`, status: "TODO",
  createdAt: "2026-10-05T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z", contextFiles: [] });

describe("per-Project folder ProjectStore (SR-024)", () => {
  let root: string, layout: ProjectsLayout, store: ProjectStore;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-store-folders-"));
    layout = new ProjectsLayout(path.join(root, "projects"));
    store = new ProjectStore(layout);
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const seed = async () => {
    await store.createProject(() => project("project_A"));
    await store.createTask("project_A", "task_1", async () => task("task_1"));
    await store.createTask("project_A", "task_2", async () => task("task_2"));
  };

  it("writes exactly the documented layout: project.json, tasks/<taskId>/task.json with projectId", async () => {
    await seed();
    expect(JSON.parse(await fs.readFile(path.join(layout.root, "project_A", "project.json"), "utf8"))).toEqual(project("project_A"));
    expect(JSON.parse(await fs.readFile(path.join(layout.root, "project_A", "tasks", "task_1", "task.json"), "utf8")))
      .toEqual({ ...task("task_1"), projectId: "project_A" });
    expect((await store.findTask("task_2")).map(m => m.projectId)).toEqual(["project_A"]);
  });

  it.each([false, true])("reads path associations without rewriting and writes exactly two keys, preserving Task bytes (old extras: %s)", async oldExtras => {
    await seed();
    const link = {workspaceRootPath: "/work/space #? 文件夹", description: "Source"};
    const raw = {...project("project_A"), workspaces: [{...link, ...(oldExtras ? {workspaceId: "released_id", addedAt: "2026-09-26"} : {})}]};
    const file = layout.projectFile("project_A");
    const original = JSON.stringify(raw, null, 4) + "\n";
    await fs.writeFile(file, original);
    const contextFile = path.join(layout.contextDir("project_A", "task_1"), "ctx_a__note.txt");
    await fs.mkdir(path.dirname(contextFile), {recursive: true});
    await fs.writeFile(contextFile, "saved context");
    await fs.writeFile(layout.taskExecutionResourcesFile("project_A", "task_1"), '{"saved":"assignment"}');
    const preserved = [layout.taskFile("project_A", "task_1"), layout.taskFile("project_A", "task_2"), contextFile, layout.taskExecutionResourcesFile("project_A", "task_1")];
    const bytes = await Promise.all(preserved.map(f => fs.readFile(f, "utf8")));
    expect((await store.readProject("project_A"))!.workspaces).toEqual([link]);
    expect((await store.listProjects())[0].workspaces).toEqual([link]);
    expect(await fs.readFile(file, "utf8")).toBe(original);
    await store.updateProject("project_A", current => ({...current, description: "description-only save"}));
    const saved = JSON.parse(await fs.readFile(file, "utf8"));
    expect(saved).toEqual({...project("project_A"), description: "description-only save", workspaces: [link]});
    expect(Object.keys(saved.workspaces[0]).sort()).toEqual(["description", "workspaceRootPath"]);
    expect((await new ProjectStore(layout).readProject("project_A"))!.workspaces).toEqual([link]);
    expect(await Promise.all(preserved.map(f => fs.readFile(f, "utf8")))).toEqual(bytes);
  });

  it("lists a Task only with a valid task.json under a valid project.json (N7)", async () => {
    await seed();
    await fs.mkdir(path.join(layout.tasksDir("project_A"), "resources_only"), { recursive: true });
    await fs.writeFile(path.join(layout.tasksDir("project_A"), "resources_only", "agent_run_resources.json"), "{}");
    await fs.writeFile(layout.taskFile("project_A", "task_2"), JSON.stringify({ ...task("task_2"), projectId: "project_OTHER" }));
    expect((await store.listTasks("project_A")).map(t => t.taskId)).toEqual(["task_1"]);
    expect(await store.findTask("task_2")).toEqual([]);
  });

  it("an interrupted Project delete (project.json gone, Task files left) admits nothing under that Project", async () => {
    await seed();
    await fs.unlink(layout.projectFile("project_A"));
    expect(await store.listProjects()).toEqual([]);
    expect(await store.findTask("task_1")).toEqual([]);
    await expect(store.readTask("project_A", "task_1")).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    await expect(store.createTask("project_A", "task_3", async () => task("task_3"))).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });

  it("Task delete removes task.json and context/ but keeps agent_run_resources.json (B-5)", async () => {
    await seed();
    await fs.mkdir(layout.contextDir("project_A", "task_1"), { recursive: true });
    await fs.writeFile(path.join(layout.contextDir("project_A", "task_1"), "ctx_a__b.txt"), "bytes");
    await fs.writeFile(layout.taskExecutionResourcesFile("project_A", "task_1"), JSON.stringify({ taskId: "task_1", agentRunResources: [] }));
    expect(await store.deleteTask("project_A", "task_1")).toMatchObject({ taskId: "task_1" });
    await expect(fs.access(layout.taskFile("project_A", "task_1"))).rejects.toThrow();
    await expect(fs.access(layout.contextDir("project_A", "task_1"))).rejects.toThrow();
    await expect(fs.readFile(layout.taskExecutionResourcesFile("project_A", "task_1"), "utf8")).resolves.toContain("task_1");
    expect((await store.listTasks("project_A")).map(t => t.taskId)).toEqual(["task_2"]);
    expect(await store.deleteTask("project_A", "task_1")).toBeUndefined();
  });

  it("never builds a path from an unsafe id (N5)", async () => {
    await seed();
    for (const id of ["..", ".", "a/b", "a\\b", "", "x\0y"]) {
      expect(await store.readProject(id)).toBeNull();
      expect(await store.findTask(id)).toEqual([]);
      await expect(store.readTask("project_A", id)).resolves.toBeNull();
    }
    expect(() => layout.projectDir("../escape")).toThrow();
    expect(() => layout.taskDir("project_A", "..")).toThrow();
    expect(layout.idOfFolder("project%2FA")).toBeNull();
    expect(layout.idOfFolder("project_A")).toBe("project_A");
  });

  it("rejects every operation while the released projects.json exists, by existence only (migration gate)", async () => {
    await seed();
    await fs.writeFile(layout.releasedProjectsFile(), "not even json");
    for (const operation of [() => store.listProjects(), () => store.readProject("project_A"), () => store.listTasks("project_A"),
      () => store.findTask("task_1"), () => store.updateTask("project_A", "task_1", t => t), () => store.deleteProject("project_A")]) {
      await expect(operation()).rejects.toMatchObject({ code: "PROJECTS_MIGRATION_PENDING" });
    }
    await fs.rm(layout.releasedProjectsFile());
    expect((await store.listTasks("project_A")).length).toBe(2);
  });
});
