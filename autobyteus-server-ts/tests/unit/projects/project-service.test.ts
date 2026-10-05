import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";

const WS_A = "agent_ws_aaa";
const WS_B = "agent_ws_bbb";

const createHarness = async () => {
  const appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "projects-service-"));
  const layout = new ProjectsLayout(path.join(appDataDir, "projects"));
  const store = new ProjectStore(layout);
  const registry = new Map<string, string>([
    [WS_A, "/work/autobyteus-web-prototype"],
    [WS_B, "/work/autobyteus-marketing"],
  ]);
  const workspaceLookup = {
    getRegisteredWorkspaceRootPath: vi.fn(async (workspaceId: string) =>
      workspaceId.startsWith("agent_ws_") ? registry.get(workspaceId) ?? null : null,
    ),
  };
  let tick = 0;
  let idCounter = 0;
  const service = new ProjectService({
    store,
    workspaceLookup,
    now: () => new Date(Date.UTC(2026, 8, 26, 0, 0, tick++)),
    createId: () => `project_${++idCounter}`,
  });
  /** Every persisted `<projectId>/project.json`, by projectId. */
  const readFile = async () => {
    const dirs = await fs.readdir(layout.root).catch(() => [] as string[]);
    const rows = await Promise.all(dirs.map(d => fs.readFile(path.join(layout.root, d, "project.json"), "utf-8").then(JSON.parse, () => null)));
    return rows.filter(Boolean).sort((a, b) => a.projectId.localeCompare(b.projectId));
  };
  const writeJson = async (file: string, value: unknown) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value));
  };
  const writeProject = (value: { projectId: string } & Record<string, unknown>) => writeJson(path.join(layout.root, value.projectId, "project.json"), value);
  const writeTask = (projectId: string, value: { taskId: string } & Record<string, unknown>) =>
    writeJson(path.join(layout.root, projectId, "tasks", value.taskId, "task.json"), { projectId, ...value });
  return { appDataDir, layout, store, registry, workspaceLookup, service, readFile, writeJson, writeProject, writeTask };
};

const expectProjectError = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(ProjectError);
  await promise.catch((error: ProjectError) => expect(error.code).toBe(code));
};

describe("ProjectService", () => {
  let harness: Awaited<ReturnType<typeof createHarness>>;

  beforeEach(async () => {
    harness = await createHarness();
  });

  afterEach(async () => {
    await fs.rm(harness.appDataDir, { recursive: true, force: true });
  });

  it("lists no projects when the store file does not exist", async () => {
    await expect(harness.service.listProjects()).resolves.toEqual([]);
  });

  it("creates a project with trimmed name, trimmed description and timestamps", async () => {
    const project = await harness.service.createProject({
      name: "  autobyteus  ",
      description: "  AutoByteus product  ",
    });

    expect(project).toEqual({
      projectId: "project_1",
      name: "autobyteus",
      description: "AutoByteus product",
      createdAt: "2026-09-26T00:00:00.000Z",
      updatedAt: "2026-09-26T00:00:00.000Z",
      workspaces: [],
      openTaskCount: 0,
      taskCount: 0,
    });
    expect(await harness.readFile()).toEqual([
      {
        projectId: "project_1",
        name: "autobyteus",
        description: "AutoByteus product",
        createdAt: "2026-09-26T00:00:00.000Z",
        updatedAt: "2026-09-26T00:00:00.000Z",
        workspaces: [],
      },
    ]);
  });

  it("stores an empty description as an empty string", async () => {
    const project = await harness.service.createProject({ name: "Empty", description: null });
    expect(project.description).toBe("");
  });

  it("rejects an empty or whitespace name", async () => {
    await expectProjectError(harness.service.createProject({ name: "   " }), "PROJECT_NAME_REQUIRED");
    await expect(harness.service.listProjects()).resolves.toEqual([]);
  });

  it("rejects a case-insensitive duplicate name without creating a record", async () => {
    await harness.service.createProject({ name: "autobyteus" });

    await expectProjectError(harness.service.createProject({ name: "AutoByteus " }), "PROJECT_NAME_TAKEN");
    expect(await harness.readFile()).toHaveLength(1);
  });

  it("sorts projects by name case-insensitively", async () => {
    await harness.service.createProject({ name: "zeta" });
    await harness.service.createProject({ name: "Alpha" });
    await harness.service.createProject({ name: "beta" });

    const names = (await harness.service.listProjects()).map((project) => project.name);
    expect(names).toEqual(["Alpha", "beta", "zeta"]);
  });

  it("updates name and description, allowing a case change of its own name", async () => {
    const created = await harness.service.createProject({ name: "autobyteus", description: "old" });

    const updated = await harness.service.updateProject({
      projectId: created.projectId,
      name: "AutoByteus",
      description: " new ",
    });

    expect(updated).toMatchObject({ name: "AutoByteus", description: "new", createdAt: created.createdAt });
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    expect(await harness.service.getProject(created.projectId)).toEqual(updated);
  });

  it("rejects renaming to another project's name and leaves the file unchanged", async () => {
    await harness.service.createProject({ name: "one" });
    const two = await harness.service.createProject({ name: "two" });
    const before = await harness.readFile();

    await expectProjectError(
      harness.service.updateProject({ projectId: two.projectId, name: "ONE", description: "" }),
      "PROJECT_NAME_TAKEN",
    );
    expect(await harness.readFile()).toEqual(before);
  });

  it("rejects updates for unknown projects", async () => {
    await expectProjectError(
      harness.service.updateProject({ projectId: "project_missing", name: "x" }),
      "PROJECT_NOT_FOUND",
    );
  });

  it("returns null for an unknown project", async () => {
    await expect(harness.service.getProject("project_missing")).resolves.toBeNull();
  });

  it("links a registered workspace with a description and snapshots its root path", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });

    const linked = await harness.service.addWorkspaceLink({
      projectId: project.projectId,
      workspaceId: WS_A,
      description: " UI prototype workspace ",
    });

    expect(linked.workspaces).toEqual([
      {
        workspaceId: WS_A,
        workspaceRootPath: "/work/autobyteus-web-prototype",
        description: "UI prototype workspace",
        addedAt: expect.any(String),
        displayName: "autobyteus-web-prototype",
        availability: "AVAILABLE",
      },
    ]);
    const [stored] = await harness.readFile();
    expect(stored.workspaces[0]).toEqual({
      workspaceId: WS_A,
      workspaceRootPath: "/work/autobyteus-web-prototype",
      description: "UI prototype workspace",
      addedAt: expect.any(String),
    });
  });

  it("rejects linking the same workspace twice to one project", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A });

    await expectProjectError(
      harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A }),
      "WORKSPACE_ALREADY_LINKED",
    );
    const [stored] = await harness.readFile();
    expect(stored.workspaces).toHaveLength(1);
  });

  it("allows one workspace to be linked to several projects with separate descriptions", async () => {
    const a = await harness.service.createProject({ name: "A" });
    const b = await harness.service.createProject({ name: "B" });

    await harness.service.addWorkspaceLink({ projectId: a.projectId, workspaceId: WS_B, description: "A marketing" });
    await harness.service.addWorkspaceLink({ projectId: b.projectId, workspaceId: WS_B, description: "B marketing" });

    expect((await harness.service.getProject(a.projectId))?.workspaces[0]?.description).toBe("A marketing");
    expect((await harness.service.getProject(b.projectId))?.workspaces[0]?.description).toBe("B marketing");
  });

  it.each([
    ["temp_ws_default"],
    ["skill_ws_foo"],
    ["agent_ws_unknown"],
  ])("rejects linking a workspace that is not a registered filesystem workspace (%s)", async (workspaceId) => {
    const project = await harness.service.createProject({ name: "autobyteus" });

    await expectProjectError(
      harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceId }),
      "WORKSPACE_NOT_REGISTERED",
    );
    const [stored] = await harness.readFile();
    expect(stored.workspaces).toEqual([]);
  });

  it("rejects linking to an unknown project", async () => {
    await expectProjectError(
      harness.service.addWorkspaceLink({ projectId: "project_missing", workspaceId: WS_A }),
      "PROJECT_NOT_FOUND",
    );
  });

  it("resolves availability at read time and restores it on re-registration without duplicating the link", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A, description: "UI" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceId: WS_B, description: "Marketing" });

    harness.registry.delete(WS_A);
    const unregistered = await harness.service.getProject(project.projectId);
    expect(unregistered?.workspaces.map((link) => [link.workspaceId, link.availability, link.workspaceRootPath, link.description])).toEqual([
      [WS_A, "UNREGISTERED", "/work/autobyteus-web-prototype", "UI"],
      [WS_B, "AVAILABLE", "/work/autobyteus-marketing", "Marketing"],
    ]);
    const [stored] = await harness.readFile();
    expect(stored.workspaces[0]).not.toHaveProperty("availability");

    harness.registry.set(WS_A, "/work/autobyteus-web-prototype");
    const restored = await harness.service.getProject(project.projectId);
    expect(restored?.workspaces.map((link) => link.availability)).toEqual(["AVAILABLE", "AVAILABLE"]);
    expect(restored?.workspaces).toHaveLength(2);
  });

  it("edits a link description and unlinks an unregistered workspace", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A, description: "old" });

    const edited = await harness.service.updateWorkspaceLink({
      projectId: project.projectId,
      workspaceId: WS_A,
      description: " new ",
    });
    expect(edited.workspaces[0]?.description).toBe("new");

    harness.registry.delete(WS_A);
    const removed = await harness.service.removeWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A });
    expect(removed.workspaces).toEqual([]);
  });

  it("rejects editing or removing a link that does not exist", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });

    await expectProjectError(
      harness.service.updateWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A, description: "x" }),
      "WORKSPACE_LINK_NOT_FOUND",
    );
    await expectProjectError(
      harness.service.removeWorkspaceLink({ projectId: project.projectId, workspaceId: WS_A }),
      "WORKSPACE_LINK_NOT_FOUND",
    );
  });

  it("deletes only the project record and its links", async () => {
    const keep = await harness.service.createProject({ name: "keep" });
    const drop = await harness.service.createProject({ name: "drop" });
    await harness.service.addWorkspaceLink({ projectId: drop.projectId, workspaceId: WS_A });
    await harness.service.addWorkspaceLink({ projectId: keep.projectId, workspaceId: WS_A });

    await expect(harness.service.deleteProject(drop.projectId)).resolves.toBe(true);

    const remaining = await harness.service.listProjects();
    expect(remaining.map((project) => project.projectId)).toEqual([keep.projectId]);
    expect(remaining[0]?.workspaces.map((link) => link.workspaceId)).toEqual([WS_A]);
    await expect(harness.service.deleteProject(drop.projectId)).resolves.toBe(false);
  });

  it("lists only folders with a valid project.json and drops malformed fields on read", async () => {
    await harness.writeProject({ projectId: "broken", name: "" });
    await harness.writeJson(path.join(harness.layout.root, "orphan", "tasks", "t", "agent_run_resources.json"), { taskId: "t", agentRunResources: [] });
    await harness.writeProject({
      projectId: "project_ok", name: "ok", description: "",
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z",
      workspaces: [{ workspaceId: WS_A }, { workspaceId: WS_B, workspaceRootPath: "/work/autobyteus-marketing", description: "", addedAt: "2026-09-26T00:00:00.000Z" }],
    });
    await harness.writeProject({ projectId: "folder-mismatch", name: "x" });
    const projects = await harness.service.listProjects();
    expect(projects.map((project) => project.projectId)).toEqual(["project_ok"]);
    expect(projects[0]?.workspaces.map((link) => link.workspaceId)).toEqual([WS_B]);
  });

  it("leaves no listed Project when its atomic write fails (QR-001)", async () => {
    await harness.service.createProject({ name: "existing" });
    const before = await harness.readFile();
    const renameSpy = vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("disk full"));
    try {
      await expect(harness.service.createProject({ name: "new" })).rejects.toThrow("disk full");
    } finally {
      renameSpy.mockRestore();
    }
    expect(await harness.readFile()).toEqual(before);
    expect((await harness.service.listProjects()).map((project) => project.name)).toEqual(["existing"]);
  });

  it("reads a Project without Tasks or optional fields and never rewrites it on read", async () => {
    const project = {
      projectId: "project_x", name: "AutoByteus", description: "Hello",
      createdAt: "2026-09-20T00:00:00.000Z", updatedAt: "2026-09-21T00:00:00.000Z",
      workspaces: [{ workspaceId: WS_A, workspaceRootPath: "/work/autobyteus-web-prototype", description: "UI", addedAt: "2026-09-20T00:00:00.000Z" }],
    };
    await harness.writeProject(project);
    const source = await fs.readFile(harness.layout.projectFile("project_x"), "utf8");
    const [view] = await harness.service.listProjects();
    expect(view).toMatchObject({ projectId: "project_x", name: "AutoByteus", description: "Hello", updatedAt: "2026-09-21T00:00:00.000Z", openTaskCount: 0, taskCount: 0 });
    expect(view?.workspaces.map((link) => [link.workspaceId, link.description, link.availability])).toEqual([[WS_A, "UI", "AVAILABLE"]]);
    expect(await fs.readFile(harness.layout.projectFile("project_x"), "utf8")).toBe(source);
  });

  it("counts open Tasks from valid task.json files and never exposes a Task list on the Project view", async () => {
    const task = (taskId: string, status: string) => ({ taskId, description: `Task ${taskId}`, status,
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" });
    await harness.writeProject({ projectId: "project_x", name: "x", description: "", createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z", workspaces: [] });
    for (const t of [task("t1", "TODO"), task("t2", "IN_PROGRESS"), task("t3", "DONE")]) await harness.writeTask("project_x", t);
    await harness.writeTask("project_x", { taskId: "broken" });
    await harness.writeJson(path.join(harness.layout.tasksDir("project_x"), "deleted", "agent_run_resources.json"), { taskId: "deleted", agentRunResources: [] });
    const project = await harness.service.getProject("project_x");
    expect(project?.openTaskCount).toBe(2);
    expect(project?.taskCount).toBe(3);
    expect(project).not.toHaveProperty("tasks");
  });

  it("leaves Task files untouched when the Project or its links change", async () => {
    const created = await harness.service.createProject({ name: "autobyteus" });
    await harness.writeTask(created.projectId, { taskId: "project_task_1", description: "Write release notes", status: "TODO",
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" });
    const taskFile = harness.layout.taskFile(created.projectId, "project_task_1");
    const before = await fs.readFile(taskFile, "utf8");
    await harness.service.updateProject({ projectId: created.projectId, name: "AutoByteus", description: "d" });
    await harness.service.addWorkspaceLink({ projectId: created.projectId, workspaceId: WS_A });
    await harness.service.removeWorkspaceLink({ projectId: created.projectId, workspaceId: WS_A });
    expect(await fs.readFile(taskFile, "utf8")).toBe(before);
    expect((await harness.service.getProject(created.projectId))?.openTaskCount).toBe(1);
  });

  it("deletes a Project with its drafts, Tasks and context, keeps every agent_run_resources.json and leaves other Projects intact (REQ-008, B-5)", async () => {
    const keep = await harness.service.createProject({ name: "keep" });
    const drop = await harness.service.createProject({ name: "drop" });
    for (const project of [keep, drop]) {
      await harness.writeTask(project.projectId, { taskId: `task_of_${project.projectId}`, description: "d", status: "TODO",
        createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" });
      await harness.writeJson(path.join(harness.layout.contextDir(project.projectId, `task_of_${project.projectId}`), "ctx_a__b.txt"), "x");
    }
    const resources = harness.layout.agentRunResourcesFile(drop.projectId, `task_of_${drop.projectId}`);
    await harness.writeJson(resources, { taskId: `task_of_${drop.projectId}`, agentRunResources: [] });
    await harness.writeJson(path.join(harness.layout.draftsDir(drop.projectId), "draft", "manifest.json"), {});

    await expect(harness.service.deleteProject(drop.projectId)).resolves.toBe(true);

    expect((await harness.readFile()).map((row: { projectId: string }) => row.projectId)).toEqual([keep.projectId]);
    await expect(fs.access(resources)).resolves.toBeUndefined();
    await expect(fs.access(harness.layout.taskFile(drop.projectId, `task_of_${drop.projectId}`))).rejects.toThrow();
    await expect(fs.access(harness.layout.contextDir(drop.projectId, `task_of_${drop.projectId}`))).rejects.toThrow();
    await expect(fs.access(harness.layout.draftsDir(drop.projectId))).rejects.toThrow();
    await expect(fs.access(harness.layout.taskFile(keep.projectId, `task_of_${keep.projectId}`))).resolves.toBeUndefined();
    await expect(harness.service.deleteProject(drop.projectId)).resolves.toBe(false);
  });

  it("atomically saves aggregate workspace rows, preserves unregistered snapshots and current Tasks", async () => {
    const created = await harness.service.createProject({name: "Aggregate", workspaces: [{workspaceId: WS_A, description: "a"}]});
    const original = created.workspaces[0]!;
    harness.registry.delete(WS_A);
    await harness.writeTask(created.projectId, { taskId: "concurrent", description: "current", status: "DONE", createdAt: "1", updatedAt: "2" });
    const saved = await harness.service.updateProject({projectId: created.projectId, name: "Changed", workspaces: [
      {workspaceId: WS_A, description: "retained"}, {workspaceId: WS_B, description: "b"},
    ]});
    expect(saved.workspaces.find((w) => w.workspaceId === WS_A)).toMatchObject({
      workspaceRootPath: original.workspaceRootPath, addedAt: original.addedAt, description: "retained", availability: "UNREGISTERED",
    });
    expect(saved.taskCount).toBe(1);
    expect(saved.openTaskCount).toBe(0);
    const before = await harness.readFile();
    await expect(harness.service.updateProject({projectId: created.projectId, name: "No partial rename", workspaces: [
      {workspaceId: WS_B}, {workspaceId: WS_B},
    ]})).rejects.toMatchObject({code: "WORKSPACE_ALREADY_LINKED"});
    expect(await harness.readFile()).toEqual(before);
  });

  it("reads known fields only and never persists unknown or derived fields", async () => {
    const p = await harness.service.createProject({name: "Known"});
    const [row] = await harness.readFile();
    await harness.writeProject({ ...row, prototypeField: "extra", taskCount: 999 });
    await harness.writeTask(p.projectId, { taskId: "task", description: "read", status: "TODO", createdAt: "1", updatedAt: "2", unknown: true,
      contextFiles: [{storedFilename: "ctx_test__note.txt", displayName: "note.txt", mimeType: "text/plain", sizeBytes: 3, locator: "evil", localPath: "/external"}] });
    const source = await fs.readFile(harness.layout.projectFile(p.projectId), "utf8");
    expect(await harness.store.readProject(p.projectId)).not.toHaveProperty("prototypeField");
    const [task] = await harness.store.listTasks(p.projectId);
    expect(task).not.toHaveProperty("unknown");
    expect(task!.contextFiles![0]).not.toHaveProperty("localPath");
    expect(await fs.readFile(harness.layout.projectFile(p.projectId), "utf8")).toBe(source);
    await harness.service.updateProject({projectId: p.projectId, name: "Saved"});
    const json = await fs.readFile(harness.layout.projectFile(p.projectId), "utf8");
    expect(json).not.toContain("prototypeField"); expect(json).not.toContain("taskCount");
  });

  it("rejects every Projects operation while the released projects.json awaits migration, without reading it", async () => {
    await harness.service.createProject({ name: "current" });
    await harness.writeJson(harness.layout.releasedProjectsFile(), "{ not json");
    await expectProjectError(harness.service.listProjects(), "PROJECTS_MIGRATION_PENDING");
    await expectProjectError(harness.service.createProject({ name: "blocked" }), "PROJECTS_MIGRATION_PENDING");
    await fs.rm(harness.layout.releasedProjectsFile());
    expect((await harness.service.listProjects()).map(p => p.name)).toEqual(["current"]);
  });
});
