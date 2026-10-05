import { ProjectsPerFolderV1AppDataMigration } from "../../../src/app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.js";
import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { resetProjectsCapabilityServiceForTests } from "../../../src/projects/services/projects-capability-service.js";
import { resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { getServerSettingsService } from "../../../src/services/server-settings-service.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

// Un-mocked Projects GraphQL boundary: resolver -> ProjectService -> ProjectStore (per-Project folders)
// plus the real WorkspaceManager registry (workspaces.json) and real server settings, all in an
// isolated app data dir. Only the process run managers are emulated as "no active runs" so the
// unchanged workspace-removal guard can execute outside a full server process.

const workspaceManager = getWorkspaceManager();

const resetWorkspaceRegistryForTest = () => {
  const registryStore = (workspaceManager as unknown as {
    workspaceRegistryStore?: {
      loaded: boolean;
      loadPromise: Promise<void> | null;
      mutationQueue: Promise<unknown>;
      entries: Map<string, string>;
    };
  }).workspaceRegistryStore;
  if (!registryStore) {
    return;
  }
  registryStore.loaded = false;
  registryStore.loadPromise = null;
  registryStore.mutationQueue = Promise.resolve();
  registryStore.entries = new Map<string, string>();
};

const resetProjectsSingletons = () => {
  resetProjectStoreForTests();
  resetProjectServiceForTests();
  resetProjectTaskServiceForTests();
  resetProjectsCapabilityServiceForTests();
};

// A fresh node must not inherit feature flags from the developer's shell (e.g. ENABLE_PROJECTS=true):
// process.env overrides settings, which would make capability assertions depend on the machine.
const stashFeatureFlagEnv = (): Record<string, string> => {
  const stashed: Record<string, string> = {};
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("ENABLE_")) {
      stashed[key] = process.env[key] as string;
      delete process.env[key];
    }
  }
  return stashed;
};

const PROJECT_FIELDS = `
  projectId name description createdAt updatedAt
  workspaces { workspaceId workspaceRootPath displayName description addedAt availability }
  openTaskCount
`;
const TASK_FIELDS = "taskId projectId description status createdAt updatedAt";

type TaskResult = {
  taskId: string;
  projectId: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  createdAt: string;
  updatedAt: string;
};

type ProjectWorkspaceResult = {
  workspaceId: string;
  workspaceRootPath: string;
  displayName: string;
  description: string;
  addedAt: string;
  availability: "AVAILABLE" | "UNREGISTERED";
};

type ProjectResult = {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ProjectWorkspaceResult[];
  openTaskCount: number;
};

type Capability = { enabled: boolean; settingKey: string; source: string };

describe("Projects GraphQL e2e (un-mocked)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let appDataDir: string;
  let rootsDir: string;
  let initialActiveWorkspaceIds: Set<string>;
  let originalTempWorkspaceDir: string | undefined;
  let stashedFeatureFlagEnv: Record<string, string>;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  beforeEach(() => {
    stashedFeatureFlagEnv = stashFeatureFlagEnv();
    appConfigProvider.resetForTests();
    appDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-projects-e2e-"));
    rootsDir = path.join(appDataDir, "roots");
    for (const name of ["autobyteus-web-prototype", "autobyteus-marketing", "autobyteus-superrepo", "new-root"]) {
      fs.mkdirSync(path.join(rootsDir, name), { recursive: true });
    }
    fs.writeFileSync(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    originalTempWorkspaceDir = process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = path.join(appDataDir, "temp_workspace");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    resetWorkspaceRegistryForTest();
    resetProjectsSingletons();
    initialActiveWorkspaceIds = new Set(workspaceManager.getAllWorkspaces().map((ws) => ws.workspaceId));
    vi.spyOn(AgentRunManager, "getInstance").mockReturnValue({
      listActiveRuns: () => [],
      getActiveRun: () => null,
    } as unknown as AgentRunManager);
    vi.spyOn(AgentTeamRunManager, "getInstance").mockReturnValue({
      listManagedTeamRunIds: () => [],
      getManagedTeamRun: () => null,
    } as unknown as AgentTeamRunManager);
  });

  afterEach(async () => {
    for (const workspace of workspaceManager.getAllWorkspaces()) {
      if (!initialActiveWorkspaceIds.has(workspace.workspaceId)) {
        await Promise.race([workspace.close(), new Promise((resolve) => setTimeout(resolve, 2000))]);
        (workspaceManager as unknown as { activeWorkspaces?: Map<string, unknown> }).activeWorkspaces
          ?.delete(workspace.workspaceId);
      }
    }
    vi.restoreAllMocks();
    resetWorkspaceRegistryForTest();
    resetProjectsSingletons();
    appConfigProvider.resetForTests();
    if (originalTempWorkspaceDir === undefined) {
      delete process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
    } else {
      process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = originalTempWorkspaceDir;
    }
    fs.rmSync(appDataDir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ENABLE_")) delete process.env[key];
    }
    Object.assign(process.env, stashedFeatureFlagEnv);
  }, 20000);

  const exec = async (source: string, variableValues?: Record<string, unknown>) =>
    graphql({ schema, source, variableValues });

  const execOk = async <T>(source: string, variableValues?: Record<string, unknown>): Promise<T> => {
    const result = await exec(source, variableValues);
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const expectErrorCode = async (source: string, variableValues: Record<string, unknown>, code: string) => {
    const result = await exec(source, variableValues);
    expect(result.errors?.[0]?.extensions?.code).toBe(code);
  };

  const registerWorkspace = async (folder: string) => {
    const data = await execOk<{ createWorkspace: { workspaceId: string; workspaceRootPath: string } }>(
      `mutation($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId workspaceRootPath } }`,
      { input: { rootPath: path.join(rootsDir, folder) } },
    );
    return data.createWorkspace;
  };

  const removeWorkspace = async (workspaceId: string) => {
    const data = await execOk<{ removeWorkspace: { success: boolean; message: string } }>(
      `mutation($input: RemoveWorkspaceInput!) { removeWorkspace(input: $input) { success message } }`,
      { input: { workspaceId } },
    );
    return data.removeWorkspace;
  };

  const createProject = async (name: string, description?: string) =>
    (await execOk<{ createProject: ProjectResult }>(
      `mutation($input: CreateProjectInput!) { createProject(input: $input) { ${PROJECT_FIELDS} } }`,
      { input: { name, description } },
    )).createProject;

  const getProject = async (projectId: string) =>
    (await execOk<{ project: ProjectResult | null }>(
      `query($projectId: String!) { project(projectId: $projectId) { ${PROJECT_FIELDS} } }`,
      { projectId },
    )).project;

  const listProjects = async () =>
    (await execOk<{ projects: ProjectResult[] }>(`query { projects { ${PROJECT_FIELDS} } }`)).projects;

  const ADD_LINK = `mutation($input: AddProjectWorkspaceInput!) { addProjectWorkspace(input: $input) { ${PROJECT_FIELDS} } }`;
  const addLink = async (projectId: string, workspaceId: string, description?: string) =>
    (await execOk<{ addProjectWorkspace: ProjectResult }>(ADD_LINK, { input: { projectId, workspaceId, description } }))
      .addProjectWorkspace;

  const createTask = async (projectId: string, description: string) =>
    (await execOk<{ createProjectTask: TaskResult }>(
      `mutation($input: CreateProjectTaskInput!) { createProjectTask(input: $input) { ${TASK_FIELDS} } }`,
      { input: { projectId, description } },
    )).createProjectTask;

  const listTasks = async (projectId: string) =>
    (await execOk<{ projectTasks: TaskResult[] }>(
      `query($projectId: String!) { projectTasks(projectId: $projectId) { ${TASK_FIELDS} } }`,
      { projectId },
    )).projectTasks;

  const readWorkspacesJson = () => fs.readFileSync(path.join(appDataDir, "workspaces.json"), "utf-8");
  /** Every persisted `<projectId>/project.json` with its Tasks' `task.json` contents. */
  const readProjectsJson = () => {
    const root = path.join(appDataDir, "projects");
    const read = (file: string) => { try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; } };
    const dirs = fs.existsSync(root) ? fs.readdirSync(root) : [];
    return dirs.flatMap(dir => {
      const project = read(path.join(root, dir, "project.json"));
      if (!project) return [];
      const tasksDir = path.join(root, dir, "tasks");
      const tasks = (fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir) : []).map(t => read(path.join(tasksDir, t, "task.json"))).filter(Boolean);
      return [{ ...project, tasks }];
    }) as unknown[];
  };
  /** Byte snapshot of every file under the Projects root. */
  const snapshotProjectsDir = () => {
    const root = path.join(appDataDir, "projects");
    const files: Record<string, string> = {};
    const walk = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full); else files[path.relative(root, full)] = fs.readFileSync(full, "utf-8");
    } };
    if (fs.existsSync(root)) walk(root);
    return files;
  };

  it("API-001: projects capability defaults to disabled, persists, toggles, and leaves Applications/SI settings untouched", async () => {
    const CAPABILITY = `query { projectsCapability { enabled settingKey source } }`;
    const SET = `mutation($enabled: Boolean!) { setProjectsEnabled(enabled: $enabled) { enabled settingKey source } }`;

    expect(appConfigProvider.config.get("ENABLE_PROJECTS")).toBeFalsy();
    const initial = await execOk<{ projectsCapability: Capability }>(CAPABILITY);
    expect(initial.projectsCapability).toEqual({ enabled: false, settingKey: "ENABLE_PROJECTS", source: "INITIALIZED_DISABLED" });
    expect(appConfigProvider.config.get("ENABLE_PROJECTS")).toBe("false");

    const reread = await execOk<{ projectsCapability: Capability }>(CAPABILITY);
    expect(reread.projectsCapability).toEqual({ enabled: false, settingKey: "ENABLE_PROJECTS", source: "SERVER_SETTING" });

    appConfigProvider.config.set("ENABLE_APPLICATIONS", "true");
    appConfigProvider.config.set("ENABLE_SKILL_IMPROVEMENT", "false");

    const enabled = await execOk<{ setProjectsEnabled: Capability }>(SET, { enabled: true });
    expect(enabled.setProjectsEnabled).toEqual({ enabled: true, settingKey: "ENABLE_PROJECTS", source: "SERVER_SETTING" });
    expect(appConfigProvider.config.get("ENABLE_PROJECTS")).toBe("true");
    expect(fs.readFileSync(path.join(appDataDir, ".env"), "utf-8")).toMatch(/^ENABLE_PROJECTS=true$/m);

    const disabled = await execOk<{ setProjectsEnabled: Capability }>(SET, { enabled: false });
    expect(disabled.setProjectsEnabled.enabled).toBe(false);
    expect(appConfigProvider.config.get("ENABLE_PROJECTS")).toBe("false");

    // AC-010: toggling Projects leaves the other capability settings alone, and the refactored generic
    // accessor still serves Skill Improvement through its GraphQL capability. (The Applications resolver
    // needs studio services that exist only in a full server; the browser probe covers it end to end.)
    const others = await execOk<{
      skillImprovementCapability: { enabled: boolean; settingKey: string; source: string };
    }>(`query { skillImprovementCapability { enabled settingKey source } }`);
    expect(others.skillImprovementCapability).toMatchObject({ enabled: false, settingKey: "ENABLE_SKILL_IMPROVEMENT", source: "SERVER_SETTING" });
    expect(getServerSettingsService().getBooleanSetting("ENABLE_APPLICATIONS")).toBe(true);
    expect(appConfigProvider.config.get("ENABLE_APPLICATIONS")).toBe("true");
    expect(appConfigProvider.config.get("ENABLE_SKILL_IMPROVEMENT")).toBe("false");
  });

  it("API-002: creates, lists, edits and rejects invalid or duplicate Project names", async () => {
    const CREATE = `mutation($input: CreateProjectInput!) { createProject(input: $input) { projectId } }`;
    const UPDATE = `mutation($input: UpdateProjectInput!) { updateProject(input: $input) { ${PROJECT_FIELDS} } }`;

    expect(await listProjects()).toEqual([]);
    const autobyteus = await createProject("  autobyteus  ", "  AutoByteus product  ");
    expect(autobyteus).toMatchObject({ name: "autobyteus", description: "AutoByteus product", workspaces: [] });
    expect(autobyteus.projectId).toMatch(/^project_/);
    const marketing = await createProject("Marketing");
    expect(marketing.description).toBe("");

    await expectErrorCode(CREATE, { input: { name: "   " } }, "PROJECT_NAME_REQUIRED");
    await expectErrorCode(CREATE, { input: { name: "AUTOBYTEUS" } }, "PROJECT_NAME_TAKEN");
    expect((await listProjects()).map((project) => project.name)).toEqual(["autobyteus", "Marketing"]);

    const renamed = (await execOk<{ updateProject: ProjectResult }>(UPDATE, {
      input: { projectId: marketing.projectId, name: "Brand", description: "Campaigns" },
    })).updateProject;
    expect(renamed).toMatchObject({ projectId: marketing.projectId, name: "Brand", description: "Campaigns" });
    expect(Date.parse(renamed.updatedAt)).toBeGreaterThanOrEqual(Date.parse(renamed.createdAt));

    await expectErrorCode(UPDATE, { input: { projectId: marketing.projectId, name: "Autobyteus", description: "" } }, "PROJECT_NAME_TAKEN");
    await expectErrorCode(UPDATE, { input: { projectId: "project_missing", name: "x", description: "" } }, "PROJECT_NOT_FOUND");
    expect(await getProject("project_missing")).toBeNull();
    expect((await getProject(autobyteus.projectId))?.description).toBe("AutoByteus product");
    expect(readProjectsJson()).toHaveLength(2);
  });

  it("API-003: links registered workspaces through the real registry and rejects temp, unregistered and duplicate links", async () => {
    const prototype = await registerWorkspace("autobyteus-web-prototype");
    const marketingWs = await registerWorkspace("autobyteus-marketing");
    const projectA = await createProject("autobyteus");
    const projectB = await createProject("brand");

    const linked = await addLink(projectA.projectId, prototype.workspaceId, "  UI prototype workspace  ");
    expect(linked.workspaces).toEqual([
      expect.objectContaining({
        workspaceId: prototype.workspaceId,
        workspaceRootPath: prototype.workspaceRootPath,
        displayName: "autobyteus-web-prototype",
        description: "UI prototype workspace",
        availability: "AVAILABLE",
      }),
    ]);

    await expectErrorCode(ADD_LINK, { input: { projectId: projectA.projectId, workspaceId: prototype.workspaceId } }, "WORKSPACE_ALREADY_LINKED");
    await expectErrorCode(ADD_LINK, { input: { projectId: projectA.projectId, workspaceId: "temp_ws_default" } }, "WORKSPACE_NOT_REGISTERED");
    await expectErrorCode(ADD_LINK, { input: { projectId: projectA.projectId, workspaceId: "agent_ws_not_registered" } }, "WORKSPACE_NOT_REGISTERED");
    await expectErrorCode(ADD_LINK, { input: { projectId: "project_missing", workspaceId: marketingWs.workspaceId } }, "PROJECT_NOT_FOUND");

    // AC-006: the same workspace may be linked to another Project with its own description.
    const shared = await addLink(projectB.projectId, prototype.workspaceId, "Brand site mockups");
    expect(shared.workspaces[0]).toMatchObject({ workspaceId: prototype.workspaceId, description: "Brand site mockups" });
    expect((await getProject(projectA.projectId))?.workspaces[0]?.description).toBe("UI prototype workspace");

    // Register-then-link (REQ-005): the new root goes through the unchanged createWorkspace mutation first.
    const newRoot = await registerWorkspace("new-root");
    expect(newRoot.workspaceId).toMatch(/^agent_ws_/);
    const withNewRoot = await addLink(projectA.projectId, newRoot.workspaceId, "Fresh root");
    expect(withNewRoot.workspaces.map((link) => link.workspaceId)).toEqual([prototype.workspaceId, newRoot.workspaceId]);
    expect(JSON.parse(readWorkspacesJson())).toMatchObject({
      [prototype.workspaceId]: prototype.workspaceRootPath,
      [marketingWs.workspaceId]: marketingWs.workspaceRootPath,
      [newRoot.workspaceId]: newRoot.workspaceRootPath,
    });
  });

  it("API-004: keeps a link as UNREGISTERED after real workspace removal and restores it on re-registration", async () => {
    const UPDATE_LINK = `mutation($input: UpdateProjectWorkspaceInput!) { updateProjectWorkspace(input: $input) { ${PROJECT_FIELDS} } }`;
    const REMOVE_LINK = `mutation($input: RemoveProjectWorkspaceInput!) { removeProjectWorkspace(input: $input) { ${PROJECT_FIELDS} } }`;
    const prototype = await registerWorkspace("autobyteus-web-prototype");
    const marketingWs = await registerWorkspace("autobyteus-marketing");
    const project = await createProject("autobyteus");
    await addLink(project.projectId, prototype.workspaceId, "UI prototype workspace");
    await addLink(project.projectId, marketingWs.workspaceId, "Marketing");

    const removal = await removeWorkspace(prototype.workspaceId);
    expect(removal.success).toBe(true);
    expect(fs.existsSync(path.join(rootsDir, "autobyteus-web-prototype"))).toBe(true);

    const afterRemoval = await getProject(project.projectId);
    expect(afterRemoval?.workspaces).toEqual([
      expect.objectContaining({
        workspaceId: prototype.workspaceId,
        workspaceRootPath: prototype.workspaceRootPath,
        displayName: "autobyteus-web-prototype",
        description: "UI prototype workspace",
        availability: "UNREGISTERED",
      }),
      expect.objectContaining({ workspaceId: marketingWs.workspaceId, availability: "AVAILABLE" }),
    ]);

    const reRegistered = await registerWorkspace("autobyteus-web-prototype");
    expect(reRegistered.workspaceId).toBe(prototype.workspaceId);
    const restored = await getProject(project.projectId);
    expect(restored?.workspaces).toHaveLength(2);
    expect(restored?.workspaces[0]).toMatchObject({ workspaceId: prototype.workspaceId, availability: "AVAILABLE" });

    // An unregistered link can be edited and unlinked.
    await removeWorkspace(marketingWs.workspaceId);
    const edited = (await execOk<{ updateProjectWorkspace: ProjectResult }>(UPDATE_LINK, {
      input: { projectId: project.projectId, workspaceId: marketingWs.workspaceId, description: "Old marketing" },
    })).updateProjectWorkspace;
    expect(edited.workspaces[1]).toMatchObject({ description: "Old marketing", availability: "UNREGISTERED" });
    const unlinked = (await execOk<{ removeProjectWorkspace: ProjectResult }>(REMOVE_LINK, {
      input: { projectId: project.projectId, workspaceId: marketingWs.workspaceId },
    })).removeProjectWorkspace;
    expect(unlinked.workspaces.map((link) => link.workspaceId)).toEqual([prototype.workspaceId]);
    await expectErrorCode(REMOVE_LINK, { input: { projectId: project.projectId, workspaceId: marketingWs.workspaceId } }, "WORKSPACE_LINK_NOT_FOUND");
  });

  it("API-005: deleting a Project removes only its record and leaves workspaces.json and other Projects unchanged", async () => {
    const prototype = await registerWorkspace("autobyteus-web-prototype");
    const superrepo = await registerWorkspace("autobyteus-superrepo");
    const doomed = await createProject("autobyteus");
    const kept = await createProject("brand");
    await addLink(doomed.projectId, prototype.workspaceId, "UI");
    await addLink(doomed.projectId, superrepo.workspaceId, "Main");
    await addLink(kept.projectId, prototype.workspaceId, "Brand UI");
    const workspacesBefore = readWorkspacesJson();

    const DELETE = `mutation($projectId: String!) { deleteProject(projectId: $projectId) }`;
    expect((await execOk<{ deleteProject: boolean }>(DELETE, { projectId: doomed.projectId })).deleteProject).toBe(true);
    expect((await execOk<{ deleteProject: boolean }>(DELETE, { projectId: doomed.projectId })).deleteProject).toBe(false);

    expect(readWorkspacesJson()).toBe(workspacesBefore);
    expect(await getProject(doomed.projectId)).toBeNull();
    expect((await listProjects()).map((project) => project.name)).toEqual(["brand"]);
    expect((await getProject(kept.projectId))?.workspaces).toEqual([
      expect.objectContaining({ workspaceId: prototype.workspaceId, description: "Brand UI", availability: "AVAILABLE" }),
    ]);
    const workspaces = await execOk<{ workspaces: Array<{ workspaceId: string }> }>(`query { workspaces { workspaceId } }`);
    expect(workspaces.workspaces.map((ws) => ws.workspaceId)).toEqual(
      expect.arrayContaining([prototype.workspaceId, superrepo.workspaceId]),
    );
  });

  it("API-006: a restarted Projects subsystem reads the same persisted Projects and capability", async () => {
    const prototype = await registerWorkspace("autobyteus-web-prototype");
    const project = await createProject("autobyteus", "AutoByteus product");
    await addLink(project.projectId, prototype.workspaceId, "UI prototype workspace");
    const task = await createTask(project.projectId, "Write release notes for 1.4.87\nInclude Projects and Tasks");
    await execOk(`mutation { setProjectsEnabled(enabled: true) { enabled } }`);
    const persistedBefore = snapshotProjectsDir();

    // Simulate a process restart: fresh config provider, registry and Projects singletons over the same data dir.
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    resetWorkspaceRegistryForTest();
    resetProjectsSingletons();

    const capability = await execOk<{ projectsCapability: Capability }>(`query { projectsCapability { enabled settingKey source } }`);
    expect(capability.projectsCapability).toEqual({ enabled: true, settingKey: "ENABLE_PROJECTS", source: "SERVER_SETTING" });
    const reloaded = await listProjects();
    expect(reloaded).toEqual([
      expect.objectContaining({
        projectId: project.projectId,
        name: "autobyteus",
        description: "AutoByteus product",
        workspaces: [expect.objectContaining({ workspaceId: prototype.workspaceId, availability: "AVAILABLE" })],
        openTaskCount: 1,
      }),
    ]);
    expect(await listTasks(project.projectId)).toEqual([task]);
    expect(snapshotProjectsDir()).toEqual(persistedBefore);
  });
  it("API-007: creates, lists, edits and deletes Tasks through the real store without touching the Project or offering a status mutation", async () => {
    const CREATE = `mutation($input: CreateProjectTaskInput!) { createProjectTask(input: $input) { ${TASK_FIELDS} } }`;
    const UPDATE = `mutation($input: UpdateProjectTaskInput!) { updateProjectTask(input: $input) { ${TASK_FIELDS} } }`;
    const DELETE = `mutation($input: DeleteProjectTaskInput!) { deleteProjectTask(input: $input) }`;
    const project = await createProject("autobyteus", "AutoByteus product");
    const other = await createProject("brand");
    expect(project.openTaskCount).toBe(0);
    expect(await listTasks(project.projectId)).toEqual([]);

    const first = await createTask(project.projectId, "  Write release notes for 1.4.87\nInclude Projects and Tasks  ");
    expect(first).toMatchObject({
      projectId: project.projectId,
      description: "Write release notes for 1.4.87\nInclude Projects and Tasks",
      status: "TODO",
    });
    expect(first.taskId).toMatch(/^project_task_/);
    const second = await createTask(project.projectId, "Fix the release pipeline");
    const third = await createTask(project.projectId, "Plan the Tasks admission work");

    await expectErrorCode(CREATE, { input: { projectId: project.projectId, description: " \n  " } }, "TASK_DESCRIPTION_REQUIRED");
    await expectErrorCode(CREATE, { input: { projectId: "project_missing", description: "x" } }, "PROJECT_NOT_FOUND");
    const missingList = await exec(`query { projectTasks(projectId: "project_missing") { taskId } }`);
    expect(missingList.errors?.[0]?.extensions?.code).toBe("PROJECT_NOT_FOUND");

    expect((await listTasks(project.projectId)).map((task) => task.taskId)).toEqual([third.taskId, second.taskId, first.taskId]);
    expect(await listTasks(other.projectId)).toEqual([]);

    // Editing moves the Task to the top (most recently updated first) and changes only the description.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const edited = (await execOk<{ updateProjectTask: TaskResult }>(UPDATE, {
      input: { projectId: project.projectId, taskId: first.taskId, description: "Write release notes for 1.4.87 and 1.4.88" },
    })).updateProjectTask;
    expect(edited).toMatchObject({ taskId: first.taskId, status: "TODO", createdAt: first.createdAt });
    expect(Date.parse(edited.updatedAt)).toBeGreaterThan(Date.parse(first.updatedAt));
    expect((await listTasks(project.projectId))[0]?.taskId).toBe(first.taskId);
    await expectErrorCode(UPDATE, { input: { projectId: project.projectId, taskId: first.taskId, description: "   " } }, "TASK_DESCRIPTION_REQUIRED");
    await expectErrorCode(UPDATE, { input: { projectId: project.projectId, taskId: "project_task_missing", description: "x" } }, "TASK_NOT_FOUND");

    // Task writes never touch the Project's own fields or updatedAt; the view exposes the open count only.
    const projectAfterTasks = await getProject(project.projectId);
    expect(projectAfterTasks).toMatchObject({
      name: "autobyteus", description: "AutoByteus product", updatedAt: project.updatedAt, openTaskCount: 3,
    });

    expect((await execOk<{ deleteProjectTask: boolean }>(DELETE, { input: { projectId: project.projectId, taskId: second.taskId } })).deleteProjectTask).toBe(true);
    expect((await execOk<{ deleteProjectTask: boolean }>(DELETE, { input: { projectId: project.projectId, taskId: second.taskId } })).deleteProjectTask).toBe(false);
    await expectErrorCode(DELETE, { input: { projectId: "project_missing", taskId: second.taskId } }, "PROJECT_NOT_FOUND");
    expect((await getProject(project.projectId))?.openTaskCount).toBe(2);
    expect((await listProjects()).find((item) => item.projectId === other.projectId)?.openTaskCount).toBe(0);

    // REQ-003: there is no status-changing operation, and Task types never reuse delegated-task names.
    const mutationFields = Object.keys(schema.getMutationType()?.getFields() ?? {});
    expect(mutationFields.filter((name) => /projecttask/i.test(name)).sort()).toEqual(
      ["createProjectTask", "deleteProjectTask", "updateProjectTask"],
    );
    const updateInputFields = Object.keys((schema.getType("UpdateProjectTaskInput") as { getFields(): Record<string, unknown> }).getFields());
    expect(updateInputFields.sort()).toEqual(["contextChanges", "description", "projectId", "taskId"]);
    expect(schema.getType("Task")).toBeUndefined();
    expect(schema.getType("TaskStatus")).toBeUndefined();
  });

  it("API-008: deleting a Project removes its Tasks atomically and leaves other Projects and workspaces.json unchanged", async () => {
    const prototype = await registerWorkspace("autobyteus-web-prototype");
    const doomed = await createProject("autobyteus");
    const kept = await createProject("brand");
    await addLink(doomed.projectId, prototype.workspaceId, "UI");
    for (let index = 1; index <= 5; index += 1) {
      await createTask(doomed.projectId, `Doomed task ${index}`);
    }
    const keptTask = await createTask(kept.projectId, "Brand refresh");
    expect((await getProject(doomed.projectId))?.openTaskCount).toBe(5);
    const workspacesBefore = readWorkspacesJson();

    expect((await execOk<{ deleteProject: boolean }>(
      `mutation($projectId: String!) { deleteProject(projectId: $projectId) }`, { projectId: doomed.projectId },
    )).deleteProject).toBe(true);

    const persisted = readProjectsJson() as Array<{ projectId: string; tasks?: Array<{ taskId: string }> }>;
    expect(persisted.map((row) => row.projectId)).toEqual([kept.projectId]);
    expect(JSON.stringify(persisted)).not.toContain("Doomed task");
    expect(persisted[0]?.tasks?.map((task) => task.taskId)).toEqual([keptTask.taskId]);
    const missing = await exec(`query($projectId: String!) { projectTasks(projectId: $projectId) { taskId } }`, { projectId: doomed.projectId });
    expect(missing.errors?.[0]?.extensions?.code).toBe("PROJECT_NOT_FOUND");
    expect(readWorkspacesJson()).toBe(workspacesBefore);
  });

  it("API-009: a released v1.4.86 projects.json is gated until the startup migration moves it, then reads intact and the first Task write keeps every released field", async () => {
    const prototype = await registerWorkspace("autobyteus-web-prototype");
    const releasedRow = {
      projectId: "project_3f0c9a52-1b7e-4d1e-9d4f-0a6b2c1d7e11",
      name: "autobyteus",
      description: "AutoByteus product",
      createdAt: "2026-09-20T08:00:00.000Z",
      updatedAt: "2026-09-21T09:30:00.000Z",
      workspaces: [{
        workspaceId: prototype.workspaceId,
        workspaceRootPath: prototype.workspaceRootPath,
        description: "UI prototype workspace",
        addedAt: "2026-09-21T09:30:00.000Z",
      }],
    };
    const filePath = path.join(appDataDir, "projects", "projects.json");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const releasedContent = `${JSON.stringify([releasedRow], null, 2)}\n`;
    fs.writeFileSync(filePath, releasedContent, "utf-8");

    // Before the migration runs, Projects rejects clearly instead of showing an empty list; nothing is read or written.
    await expect(listProjects()).rejects.toThrow("Projects data is being upgraded; restart the app to finish.");
    expect(fs.readFileSync(filePath, "utf-8")).toBe(releasedContent);

    expect((await new ProjectsPerFolderV1AppDataMigration(appDataDir).execute()).status).toBe("SUCCEEDED");
    expect(fs.readFileSync(path.join(appDataDir, "projects", "projects.pre-folders.json"), "utf-8")).toBe(releasedContent);
    expect(await listProjects()).toEqual([
      expect.objectContaining({
        projectId: releasedRow.projectId, name: "autobyteus", description: "AutoByteus product",
        createdAt: releasedRow.createdAt, updatedAt: releasedRow.updatedAt, openTaskCount: 0,
        workspaces: [expect.objectContaining({ workspaceId: prototype.workspaceId, description: "UI prototype workspace", availability: "AVAILABLE" })],
      }),
    ]);
    expect(await listTasks(releasedRow.projectId)).toEqual([]);

    const task = await createTask(releasedRow.projectId, "First task on a released Project");
    const [persisted] = readProjectsJson() as Array<Record<string, unknown>>;
    expect(persisted).toEqual({ ...releasedRow, tasks: [expect.objectContaining({ taskId: task.taskId, projectId: releasedRow.projectId, status: "TODO" })] });
  });
});
