import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import type { PatchProjectCommand } from "../../../src/projects/domain/models.js";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";

const WS_A = "/work/autobyteus-web-prototype";
const WS_B = "/work/autobyteus-marketing";

const createHarness = async () => {
  const appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "projects-service-"));
  const layout = new ProjectsLayout(path.join(appDataDir, "projects"));
  const store = new ProjectStore(layout);
  const registry = new Map<string, string>([
    [WS_A, "/work/autobyteus-web-prototype"],
    [WS_B, "/work/autobyteus-marketing"],
  ]);
  const workspaceLookup = {
    listRegisteredWorkspaceRootPaths: vi.fn(async () => [...registry.values()]),
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


  it("returns committed creation records, without Task or availability enrichment", async () => {
    const tasks = vi.spyOn(harness.store, "listTasks").mockRejectedValue(new Error("unrelated Tasks unavailable"));
    const saved = await harness.service.createProjectRecord({
      name: "  Record ", description: "  goal ", workspaces: [{workspaceRootPath: WS_A, description: " UI "}],
    });
    expect(saved).toEqual((await harness.readFile())[0]);
    expect(saved).toMatchObject({name: "Record", description: "goal", workspaces: [
      {workspaceRootPath: WS_A, description: "UI"},
    ]});
    expect(saved).not.toHaveProperty("taskCount");
    expect(saved.workspaces[0]).not.toHaveProperty("availability");
    expect(tasks).not.toHaveBeenCalled();
    expect(harness.workspaceLookup.listRegisteredWorkspaceRootPaths).not.toHaveBeenCalled();
    expect((await harness.service.createProjectRecord({name: "Defaults"}))).toMatchObject({description: "", workspaces: []});
  });

  it("patches only provided metadata, preserving identity, creation and workspace snapshots", async () => {
    const saved = await harness.service.createProjectRecord({name: "Original", description: "goal",
      workspaces: [{workspaceRootPath: WS_A, description: "UI"}]});
    const tasks = vi.spyOn(harness.store, "listTasks").mockRejectedValue(new Error("unrelated"));
    harness.workspaceLookup.listRegisteredWorkspaceRootPaths.mockClear();
    const renamed = await harness.service.patchProjectRecord({projectId: saved.projectId, name: " Renamed "});
    expect(renamed).toEqual({...saved, name: "Renamed", updatedAt: expect.any(String)});
    const described = await harness.service.patchProjectRecord({projectId: saved.projectId, description: " Updated "});
    expect(described).toEqual({...renamed, description: "Updated", updatedAt: expect.any(String)});
    const cleared = await harness.service.patchProjectRecord({projectId: saved.projectId, description: "   "});
    expect(cleared).toEqual({...described, description: "", updatedAt: expect.any(String)});
    expect(cleared.updatedAt > saved.updatedAt).toBe(true);
    expect(tasks).not.toHaveBeenCalled();
    expect(harness.workspaceLookup.listRegisteredWorkspaceRootPaths).not.toHaveBeenCalled();
    expect(cleared).toEqual((await harness.readFile())[0]);
  });

  it("replaces the whole link list preserving retained roots/omitted descriptions, even if unregistered", async () => {
    const saved = await harness.service.createProjectRecord({name: "Links", description: "goal",
      workspaces: [{workspaceRootPath: WS_A, description: "UI"}, {workspaceRootPath: WS_B, description: "Marketing"}]});
    harness.registry.set(WS_A, "/changed/root");
    const replaced = await harness.service.patchProjectRecord({projectId: saved.projectId, workspaces: [{workspaceRootPath: WS_A}]});
    expect(replaced).toEqual({...saved, workspaces: [saved.workspaces[0]], updatedAt: expect.any(String)});
    harness.registry.delete(WS_A);
    const retained = await harness.service.patchProjectRecord({projectId: saved.projectId, workspaces: [
      {workspaceRootPath: WS_A}, {workspaceRootPath: WS_B},
    ]});
    expect(retained.workspaces[0]).toEqual(saved.workspaces[0]);
    expect(retained.workspaces[1]).toMatchObject({workspaceRootPath: WS_B, description: ""});
    const described = await harness.service.patchProjectRecord({projectId: saved.projectId, workspaces: [
      {workspaceRootPath: WS_A, description: "  revised  "},
    ]});
    expect(described.workspaces[0]).toEqual({...saved.workspaces[0], description: "revised"});
    const cleared = await harness.service.patchProjectRecord({projectId: saved.projectId, workspaces: [{workspaceRootPath: WS_A, description: " "}]});
    expect(cleared.workspaces[0]).toEqual({...saved.workspaces[0], description: ""});
    expect((await harness.service.patchProjectRecord({projectId: saved.projectId, workspaces: []})).workspaces).toEqual([]);
    expect(harness.registry.get(WS_B)).toBe("/work/autobyteus-marketing");
    expect(await harness.readFile()).toEqual([expect.objectContaining({name: "Links", description: "goal", workspaces: []})]);
  });

  it("keeps active full-form omission semantics separate from patch", async () => {
    const saved = await harness.service.createProject({name: "Form", description: "goal",
      workspaces: [{workspaceRootPath: WS_A, description: "UI"}]});
    const form = await harness.service.updateProject({projectId: saved.projectId, name: "Form", workspaces: [{workspaceRootPath: WS_A}]});
    expect(form.description).toBe("");
    expect(form.workspaces[0]).toMatchObject({description: "", workspaceRootPath: saved.workspaces[0]!.workspaceRootPath});
    expect(form).toHaveProperty("taskCount", 0);
    const omitLinks = await harness.service.updateProject({projectId: saved.projectId, name: "Renamed"});
    expect(omitLinks.workspaces).toEqual(form.workspaces);
  });

  it("validates the whole patch before save, and never creates on unknown ID", async () => {
    const saved = await harness.service.createProjectRecord({name: "One", description: "goal", workspaces: [{workspaceRootPath: WS_A, description: "UI"}]});
    await harness.service.createProjectRecord({name: "Two"});
    const before = await fs.readFile(harness.layout.projectFile(saved.projectId), "utf8");
    const rejected: Array<[PatchProjectCommand, string]> = [
      [{projectId: saved.projectId}, "PROJECT_PATCH_REQUIRED"],
      [{projectId: saved.projectId, name: undefined, description: undefined, workspaces: undefined}, "PROJECT_PATCH_REQUIRED"],
      [{projectId: saved.projectId, name: " "}, "PROJECT_NAME_REQUIRED"],
      [{projectId: saved.projectId, name: " two "}, "PROJECT_NAME_TAKEN"],
      [{projectId: "missing", name: "New"}, "PROJECT_NOT_FOUND"],
      [{projectId: saved.projectId, name: "No partial rename", workspaces: [{workspaceRootPath: WS_B}, {workspaceRootPath: "agent_ws_missing"}]}, "WORKSPACE_PATH_INVALID"],
      [{projectId: saved.projectId, description: "No partial goal", workspaces: [{workspaceRootPath: WS_A}, {workspaceRootPath: " " + WS_A + "/../autobyteus-web-prototype/ "}]}, "WORKSPACE_ALREADY_LINKED"],
    ];
    for (const [command, code] of rejected) {
      await expectProjectError(harness.service.patchProjectRecord(command), code);
      expect(await fs.readFile(harness.layout.projectFile(saved.projectId), "utf8")).toBe(before);
    }
    expect(await harness.readFile()).toHaveLength(2);
    await expectProjectError(harness.service.createProjectRecord({name: "Invalid create", workspaces: [{workspaceRootPath: WS_A}, {workspaceRootPath: "missing"}]}), "WORKSPACE_PATH_INVALID");
    await expectProjectError(harness.service.createProjectRecord({name: "Invalid duplicate", workspaces: [{workspaceRootPath: WS_A}, {workspaceRootPath: WS_A}]}), "WORKSPACE_ALREADY_LINKED");
    expect(await harness.readFile()).toHaveLength(2);
  });

  it("merges concurrent partial patches against current records and serializes normalized uniqueness", async () => {
    const saved = await harness.service.createProjectRecord({name: "Concurrent", description: "old",
      workspaces: [{workspaceRootPath: WS_A, description: "UI"}]});
    await Promise.all([
      harness.service.patchProjectRecord({projectId: saved.projectId, name: "Renamed"}),
      harness.service.patchProjectRecord({projectId: saved.projectId, description: "New goal"}),
      harness.service.patchProjectRecord({projectId: saved.projectId, workspaces: [{workspaceRootPath: WS_A}, {workspaceRootPath: WS_B}]}),
    ]);
    expect((await harness.readFile())[0]).toMatchObject({
      projectId: saved.projectId, createdAt: saved.createdAt, name: "Renamed", description: "New goal",
      workspaces: [saved.workspaces[0], expect.objectContaining({workspaceRootPath: WS_B})],
    });
    const results = await Promise.allSettled([
      harness.service.createProjectRecord({name: "Unique"}),
      harness.service.createProjectRecord({name: " unique "}),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find(r => r.status === "rejected")).toMatchObject({reason: {code: "PROJECT_NAME_TAKEN"}});
    const other = await harness.service.createProjectRecord({name: "Other"});
    const renames = await Promise.allSettled([saved, other].map(p =>
      harness.service.patchProjectRecord({projectId: p.projectId, name: "Shared name"})));
    expect(renames.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(renames.find(r => r.status === "rejected")).toMatchObject({reason: {code: "PROJECT_NAME_TAKEN"}});
  });

  it("does not modify Tasks/context/resources/history, registered folders or unrelated Projects", async () => {
    const wsRoot = path.join(harness.appDataDir, "registered-workspace");
    await fs.mkdir(wsRoot);
    harness.registry.set(WS_A, wsRoot);
    const registry = [...harness.registry.entries()];
    const saved = await harness.service.createProjectRecord({name: "Protected", workspaces: [{workspaceRootPath: WS_A}]});
    const unrelated = await harness.service.createProjectRecord({name: "Unrelated"});
    const protectedFiles = [
      harness.layout.taskFile(saved.projectId, "task_owned"),
      path.join(harness.layout.contextDir(saved.projectId, "task_owned"), "ctx_owned__brief.txt"),
      harness.layout.taskExecutionResourcesFile(saved.projectId, "task_owned"),
      path.join(harness.appDataDir, "memory", "runs", "owned-history.jsonl"),
      path.join(wsRoot, "source.txt"),
      harness.layout.projectFile(unrelated.projectId),
    ];
    for (const file of protectedFiles.slice(0, -1)) {
      await fs.mkdir(path.dirname(file), {recursive: true});
      await fs.writeFile(file, '{"preserved":"bytes including spacing"}\n');
    }
    await harness.writeTask(saved.projectId, {taskId: "task_owned", description: "Saved task", status: "TODO",
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z",
      contextFiles: [{storedFilename: "ctx_owned__brief.txt", displayName: "brief.txt", mimeType: "text/plain", sizeBytes: 47}]});
    await harness.writeJson(harness.layout.taskExecutionResourcesFile(saved.projectId, "task_owned"), {taskId: "task_owned", agentRunResources: []});
    const bytes = await Promise.all(protectedFiles.map(file => fs.readFile(file, "utf8")));
    await harness.service.patchProjectRecord({projectId: saved.projectId, name: "Changed", description: "New", workspaces: []});
    expect(await Promise.all(protectedFiles.map(file => fs.readFile(file, "utf8")))).toEqual(bytes);
    expect([...harness.registry.entries()]).toEqual(registry);
    const [record] = await harness.readFile();
    expect(Object.keys(record).sort()).toEqual(["projectId", "name", "description", "workspaces", "createdAt", "updatedAt"].sort());
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

  it("accepts a nonexistent unregistered root without registry or directory writes, then resolves availability separately", async () => {
    const root = path.join(harness.appDataDir, "not created #? 文件夹");
    const registeredBefore = [...harness.registry.entries()];
    const p = await harness.service.createProjectRecord({name: "Direct", workspaces: [{workspaceRootPath: ` ${root}/child/../ `}]});
    expect(p.workspaces).toEqual([{workspaceRootPath: root, description: ""}]);
    expect(harness.workspaceLookup.listRegisteredWorkspaceRootPaths).not.toHaveBeenCalled();
    expect([...harness.registry.entries()]).toEqual(registeredBefore);
    await expect(fs.access(root)).rejects.toThrow();
    expect((await harness.service.getProject(p.projectId))!.workspaces[0]).toMatchObject({workspaceRootPath: root, availability: "UNREGISTERED"});
    harness.registry.set("registry-only-id", root);
    expect((await harness.service.getProject(p.projectId))!.workspaces[0].availability).toBe("AVAILABLE");
    expect((await harness.readFile())[0].workspaces).toEqual([{workspaceRootPath: root, description: ""}]);
  });

  it("uses one pure root snapshot per list, skips it without links, and preserves requested list order", async () => {
    await harness.service.createProjectRecord({name: "Empty"});
    await harness.service.listProjects();
    expect(harness.workspaceLookup.listRegisteredWorkspaceRootPaths).not.toHaveBeenCalled();
    const p = await harness.service.createProjectRecord({name: "Ordered", workspaces: [{workspaceRootPath: WS_A}, {workspaceRootPath: WS_B}]});
    await harness.service.createProjectRecord({name: "Other", workspaces: [{workspaceRootPath: WS_A}]});
    await harness.service.patchProjectRecord({projectId: p.projectId, workspaces: [{workspaceRootPath: WS_B}, {workspaceRootPath: WS_A}]});
    const views = await harness.service.listProjects();
    expect(harness.workspaceLookup.listRegisteredWorkspaceRootPaths).toHaveBeenCalledTimes(1);
    expect(views.find(v => v.projectId === p.projectId)!.workspaces.map(w => w.workspaceRootPath)).toEqual([WS_B, WS_A]);
    const edited = await harness.service.updateWorkspaceLink({projectId: p.projectId, workspaceRootPath: `${WS_B}/.`, description: "edited"});
    expect(edited.workspaces.map(w => w.workspaceRootPath)).toEqual([WS_B, WS_A]);
    await expect(harness.service.addWorkspaceLink({projectId: p.projectId, workspaceRootPath: `${WS_A}/../autobyteus-web-prototype/`})).rejects.toMatchObject({code: "WORKSPACE_ALREADY_LINKED"});
    const removed = await harness.service.removeWorkspaceLink({projectId: p.projectId, workspaceRootPath: `${WS_B}/.`});
    expect(removed.workspaces.map(w => w.workspaceRootPath)).toEqual([WS_A]);
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

  it("links a registered workspace with a description and stores its root path", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });

    const linked = await harness.service.addWorkspaceLink({
      projectId: project.projectId,
      workspaceRootPath: WS_A,
      description: " UI prototype workspace ",
    });

    expect(linked.workspaces).toEqual([
      {
        workspaceRootPath: WS_A,
        description: "UI prototype workspace",
        displayName: "autobyteus-web-prototype",
        availability: "AVAILABLE",
      },
    ]);
    const [stored] = await harness.readFile();
    expect(stored.workspaces[0]).toEqual({
      workspaceRootPath: WS_A,
      description: "UI prototype workspace",
    });
  });

  it("rejects linking the same workspace twice to one project", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A });

    await expectProjectError(
      harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A }),
      "WORKSPACE_ALREADY_LINKED",
    );
    const [stored] = await harness.readFile();
    expect(stored.workspaces).toHaveLength(1);
  });

  it("allows one workspace to be linked to several projects with separate descriptions", async () => {
    const a = await harness.service.createProject({ name: "A" });
    const b = await harness.service.createProject({ name: "B" });

    await harness.service.addWorkspaceLink({ projectId: a.projectId, workspaceRootPath: WS_B, description: "A marketing" });
    await harness.service.addWorkspaceLink({ projectId: b.projectId, workspaceRootPath: WS_B, description: "B marketing" });

    expect((await harness.service.getProject(a.projectId))?.workspaces[0]?.description).toBe("A marketing");
    expect((await harness.service.getProject(b.projectId))?.workspaces[0]?.description).toBe("B marketing");
  });

  it.each([
    ["relative/folder"], ["~/folder"], ["file:///folder"], [" "], ["/bad\0path"], [null], [42],
  ])("rejects malformed or non-absolute paths (%s)", async (workspaceRootPath) => {
    const project = await harness.service.createProject({ name: "autobyteus" });

    await expectProjectError(
      harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceRootPath: workspaceRootPath as string }),
      "WORKSPACE_PATH_INVALID",
    );
    const [stored] = await harness.readFile();
    expect(stored.workspaces).toEqual([]);
  });

  it("rejects linking to an unknown project", async () => {
    await expectProjectError(
      harness.service.addWorkspaceLink({ projectId: "project_missing", workspaceRootPath: WS_A }),
      "PROJECT_NOT_FOUND",
    );
  });

  it("resolves availability at read time and restores it on re-registration without duplicating the link", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A, description: "UI" });
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_B, description: "Marketing" });

    harness.registry.delete(WS_A);
    const unregistered = await harness.service.getProject(project.projectId);
    expect(unregistered?.workspaces.map((link) => [link.workspaceRootPath, link.availability, link.workspaceRootPath, link.description])).toEqual([
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
    await harness.service.addWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A, description: "old" });

    const edited = await harness.service.updateWorkspaceLink({
      projectId: project.projectId,
      workspaceRootPath: WS_A,
      description: " new ",
    });
    expect(edited.workspaces[0]?.description).toBe("new");

    harness.registry.delete(WS_A);
    const removed = await harness.service.removeWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A });
    expect(removed.workspaces).toEqual([]);
  });

  it("rejects editing or removing a link that does not exist", async () => {
    const project = await harness.service.createProject({ name: "autobyteus" });

    await expectProjectError(
      harness.service.updateWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A, description: "x" }),
      "WORKSPACE_LINK_NOT_FOUND",
    );
    await expectProjectError(
      harness.service.removeWorkspaceLink({ projectId: project.projectId, workspaceRootPath: WS_A }),
      "WORKSPACE_LINK_NOT_FOUND",
    );
  });

  it("deletes only the project record and its links", async () => {
    const keep = await harness.service.createProject({ name: "keep" });
    const drop = await harness.service.createProject({ name: "drop" });
    await harness.service.addWorkspaceLink({ projectId: drop.projectId, workspaceRootPath: WS_A });
    await harness.service.addWorkspaceLink({ projectId: keep.projectId, workspaceRootPath: WS_A });

    await expect(harness.service.deleteProject(drop.projectId)).resolves.toBe(true);

    const remaining = await harness.service.listProjects();
    expect(remaining.map((project) => project.projectId)).toEqual([keep.projectId]);
    expect(remaining[0]?.workspaces.map((link) => link.workspaceRootPath)).toEqual([WS_A]);
    await expect(harness.service.deleteProject(drop.projectId)).resolves.toBe(false);
  });

  it("lists only folders with a valid project.json and drops malformed fields on read", async () => {
    await harness.writeProject({ projectId: "broken", name: "" });
    await harness.writeJson(path.join(harness.layout.root, "orphan", "tasks", "t", "agent_run_resources.json"), { taskId: "t", agentRunResources: [] });
    await harness.writeProject({
      projectId: "project_ok", name: "ok", description: "",
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z",
      workspaces: [{ workspaceRootPath: WS_A }, { workspaceId: "old_b", workspaceRootPath: WS_B, description: "", addedAt: "2026-09-26T00:00:00.000Z" }],
    });
    await harness.writeProject({ projectId: "folder-mismatch", name: "x" });
    const projects = await harness.service.listProjects();
    expect(projects.map((project) => project.projectId)).toEqual(["project_ok"]);
    expect(projects[0]?.workspaces.map((link) => link.workspaceRootPath)).toEqual([WS_B]);
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
      workspaces: [{ workspaceId: "old_a", workspaceRootPath: WS_A, description: "UI", addedAt: "2026-09-20T00:00:00.000Z" }],
    };
    await harness.writeProject(project);
    const source = await fs.readFile(harness.layout.projectFile("project_x"), "utf8");
    const [view] = await harness.service.listProjects();
    expect(view).toMatchObject({ projectId: "project_x", name: "AutoByteus", description: "Hello", updatedAt: "2026-09-21T00:00:00.000Z", openTaskCount: 0, taskCount: 0 });
    expect(view?.workspaces.map((link) => [link.workspaceRootPath, link.description, link.availability])).toEqual([[WS_A, "UI", "AVAILABLE"]]);
    expect(await fs.readFile(harness.layout.projectFile("project_x"), "utf8")).toBe(source);
  });

  it("counts open Tasks (not DONE or CANCELLED) from valid task.json files and never exposes a Task list on the Project view", async () => {
    const task = (taskId: string, status: string) => ({ taskId, description: `Task ${taskId}`, status,
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" });
    await harness.writeProject({ projectId: "project_x", name: "x", description: "", createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z", workspaces: [] });
    for (const t of [task("t1", "TODO"), task("t2", "IN_PROGRESS"), task("t3", "DONE"), task("t4", "CANCELLED")]) await harness.writeTask("project_x", t);
    await harness.writeTask("project_x", { taskId: "broken" });
    await harness.writeJson(path.join(harness.layout.tasksDir("project_x"), "deleted", "agent_run_resources.json"), { taskId: "deleted", agentRunResources: [] });
    const project = await harness.service.getProject("project_x");
    expect(project?.openTaskCount).toBe(2);
    expect(project?.taskCount).toBe(4);
    expect(project).not.toHaveProperty("tasks");
  });

  it("leaves Task files untouched when the Project or its links change", async () => {
    const created = await harness.service.createProject({ name: "autobyteus" });
    await harness.writeTask(created.projectId, { taskId: "project_task_1", description: "Write release notes", status: "TODO",
      createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" });
    const taskFile = harness.layout.taskFile(created.projectId, "project_task_1");
    const before = await fs.readFile(taskFile, "utf8");
    await harness.service.updateProject({ projectId: created.projectId, name: "AutoByteus", description: "d" });
    await harness.service.addWorkspaceLink({ projectId: created.projectId, workspaceRootPath: WS_A });
    await harness.service.removeWorkspaceLink({ projectId: created.projectId, workspaceRootPath: WS_A });
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
    const resources = harness.layout.taskExecutionResourcesFile(drop.projectId, `task_of_${drop.projectId}`);
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
    const created = await harness.service.createProject({name: "Aggregate", workspaces: [{workspaceRootPath: WS_A, description: "a"}]});
    const original = created.workspaces[0]!;
    harness.registry.delete(WS_A);
    await harness.writeTask(created.projectId, { taskId: "concurrent", description: "current", status: "DONE", createdAt: "1", updatedAt: "2" });
    const saved = await harness.service.updateProject({projectId: created.projectId, name: "Changed", workspaces: [
      {workspaceRootPath: WS_A, description: "retained"}, {workspaceRootPath: WS_B, description: "b"},
    ]});
    expect(saved.workspaces.find((w) => w.workspaceRootPath === WS_A)).toMatchObject({
      workspaceRootPath: original.workspaceRootPath, description: "retained", availability: "UNREGISTERED",
    });
    expect(saved.taskCount).toBe(1);
    expect(saved.openTaskCount).toBe(0);
    const before = await harness.readFile();
    await expect(harness.service.updateProject({projectId: created.projectId, name: "No partial rename", workspaces: [
      {workspaceRootPath: WS_B}, {workspaceRootPath: WS_B},
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
