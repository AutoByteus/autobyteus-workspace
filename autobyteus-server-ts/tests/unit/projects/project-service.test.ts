import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";

const WS_A = "agent_ws_aaa";
const WS_B = "agent_ws_bbb";

const createHarness = async () => {
  const appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "projects-service-"));
  const store = new ProjectStore({ getAppDataDir: () => appDataDir });
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
  const readFile = async () => JSON.parse(await fs.readFile(store.getFilePath(), "utf-8"));
  return { appDataDir, store, registry, workspaceLookup, service, readFile };
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

  it("drops malformed rows on read", async () => {
    await fs.mkdir(path.dirname(harness.store.getFilePath()), { recursive: true });
    await fs.writeFile(
      harness.store.getFilePath(),
      JSON.stringify([
        { projectId: "", name: "broken" },
        {
          projectId: "project_ok",
          name: "ok",
          description: "",
          createdAt: "2026-09-26T00:00:00.000Z",
          updatedAt: "2026-09-26T00:00:00.000Z",
          workspaces: [{ workspaceId: WS_A }, {
            workspaceId: WS_B,
            workspaceRootPath: "/work/autobyteus-marketing",
            description: "",
            addedAt: "2026-09-26T00:00:00.000Z",
          }],
        },
      ]),
    );

    const projects = await harness.service.listProjects();
    expect(projects.map((project) => project.projectId)).toEqual(["project_ok"]);
    expect(projects[0]?.workspaces.map((link) => link.workspaceId)).toEqual([WS_B]);
  });

  it("leaves the previous file intact when the atomic write fails (QR-001)", async () => {
    await harness.service.createProject({ name: "existing" });
    const before = await fs.readFile(harness.store.getFilePath(), "utf-8");

    const renameSpy = vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("disk full"));
    try {
      await expect(harness.service.createProject({ name: "new" })).rejects.toThrow("disk full");
    } finally {
      renameSpy.mockRestore();
    }

    expect(await fs.readFile(harness.store.getFilePath(), "utf-8")).toBe(before);
    expect((await harness.service.listProjects()).map((project) => project.name)).toEqual(["existing"]);
  });
});
