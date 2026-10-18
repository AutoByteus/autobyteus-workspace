import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { getProjectService, resetProjectServiceForTests } from "../../../../src/projects/services/project-service.js";
import { resetProjectTaskServiceForTests } from "../../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../../src/projects/context/project-task-context-store.js";
import { ListProjectsTool, ListProjectTasksTool, CreateProjectTool, UpdateProjectTool, CreateTaskTool, UpdateTaskTool, registerProjectTaskTools } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveClaudeSessionToolingOptions } from "../../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import * as projectServices from "../../../../src/projects/services/project-service.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import { getProjectStore } from "../../../../src/projects/stores/project-store.js";
import { PROJECT_TASK_TOOL_NAMES, buildProjectTaskToolSchema, isProjectTaskToolName, parseCreateTaskInput, parseProjectTaskToolInput, parseUpdateTaskInput } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
const provider = new ProjectTaskToolsMcpAdapterProvider();
const mcp = async (name: string, args: Record<string, unknown>) => {
  const result = await provider.getAdapters().find((a) => a.definition.name === name)!.execute({rawArguments: args, session: {} as never});
  if (result.kind === "mcp_tool_result") return result.result;
  throw new Error("Expected structured domain result.");
};
const PROJECT_TOOLS = {create_project: CreateProjectTool, update_project: UpdateProjectTool} as const;
type ProjectMutationToolName = keyof typeof PROJECT_TOOLS;
const PROJECT_TOOL_NAMES = Object.keys(PROJECT_TOOLS) as ProjectMutationToolName[];
/** Runs a failing call through the native class and the MCP adapter, checks that both report the same error, and returns it. */
const projectToolError = async (name: ProjectMutationToolName, args: unknown) => {
  const native = await new PROJECT_TOOLS[name]().execute(null, args as never).then(() => null, e => JSON.parse(e.message));
  const result = await mcp(name, args as never);
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual(native);
  expect(JSON.parse((result.content[0]!.text as string))).toEqual(native);
  return native;
};
const invalidArg = (message: string) => ["PROJECT_TOOL_ARGUMENT_INVALID", message] as const;
const NAME_REQUIRED = ["PROJECT_NAME_REQUIRED", "Project name is required."] as const;
const PATCH_REQUIRED = ["PROJECT_PATCH_REQUIRED", "Supply name, description and/or workspaces to update a Project."] as const;
const PROJECT_ID_INVALID = invalidArg("project_id must be a non-empty string.");
const UNSUPPORTED = invalidArg("Unsupported tool argument.");
const WORKSPACE_NOT_PLAIN = invalidArg("Each workspace must be a plain object.");
describe("Project data tools — actual native preparation/execute and selected MCP adapter", () => {
  let root: string, projectId: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-tools-unit-"));
    appConfigProvider.resetForTests(); appConfigProvider.initialize({appDataDir: root});
    resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests();
    registerProjectTaskTools();
    projectId = (await getProjectService().createProject({name: "Tools fixture"})).projectId;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(root, {recursive: true, force: true});
    appConfigProvider.resetForTests(); resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests();
  });

  it.each(PROJECT_TOOL_NAMES)("protects the selected Project tool %s from configured MCP collision and rejects unselected calls", name => {
    const collision = new ToolDefinition(name, "Configured collision", ToolOrigin.MCP, "MCP",
      () => buildProjectTaskToolSchema(name), () => null, {customFactory: () => new PROJECT_TOOLS[name](), metadata: {mcp_server_id: "configured-server"}});
    const catalog = new AgentToolMcpCatalog({providers: [provider], registry: {
      getToolDefinition: requested => requested === name ? collision : undefined,
      createTool: () => { throw new Error("Configured collision must not execute"); },
    }});
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const exposure = catalog.resolveRuntimeSessionToolExposure(buildRuntimeAgentToolExposure([name]));
    expect(exposure.enabledTools).toEqual([name]);
    expect(exposure.configuredMcpToolSources).toEqual([]);
    expect(exposure.diagnostics).toContainEqual(expect.objectContaining({code: "configured_mcp_tool_collision", registeredToolName: name}));
    const selected = {enabledTools: exposure.enabledTools, toolRoutes: exposure.toolRoutes} as never;
    expect(catalog.resolveToolCallAvailability(selected, name)).toMatchObject({ok: true, definition: {name}});
    expect(catalog.listMcpToolsForSession(selected, "2025-06-18").map(tool => tool.name)).toEqual([name]);
    expect(provider.getAdapters().find(a => a.definition.name === name)!.configuredMcpCollisionPolicy).toBe("protect_static_adapter");
    const readOnly = catalog.resolveRuntimeSessionToolExposure(buildRuntimeAgentToolExposure(["list_projects"]));
    expect(catalog.resolveToolCallAvailability(readOnly as never, name)).toEqual({ok: false, reason: "tool_not_enabled"});
  });

  it("documents create_project and update_project with one meaning each, identical on native and MCP, with no omission-erasing defaults (AC-001, AC-002, AC-007)", () => {
    for (const [name, keys, required] of [
      ["create_project", ["name", "description", "workspaces"], ["name"]],
      ["update_project", ["project_id", "name", "description", "workspaces"], ["project_id"]],
    ] as const) {
      const Tool = PROJECT_TOOLS[name];
      const native = Tool.getArgumentSchema().toJsonSchema() as {properties: Record<string, any>, required?: string[]};
      expect(native).toEqual(buildProjectTaskToolSchema(name).toJsonSchema());
      expect(Object.keys(native.properties)).toEqual(keys);
      expect(native.required ?? []).toEqual(required);
      expect(native.properties.workspaces).toMatchObject({type: "array", items: {
        type: "object", required: ["workspace_path"], properties: {workspace_path: {type: "string"}, description: {type: "string"}},
      }});
      expect(native.properties.workspaces).not.toHaveProperty("default");
      expect(native.properties.workspaces.items.properties.description).not.toHaveProperty("default");
      const listed = provider.getAdapters().find(a => a.definition.name === name)!.definition;
      expect(listed.description).toBe(Tool.getDescription());
      expect(listed.inputSchema.toJsonSchema()).toEqual(native);
      // A description names no other tool: an agent may not have it.
      expect(Tool.getDescription()).not.toMatch(/create_project|update_project/);
    }
    expect(CreateProjectTool.getDescription()).toMatch(/^Create a Project on the current node: required name/);
    expect(CreateProjectTool.getDescription()).not.toMatch(/project_id|patch|update/i);
    expect(UpdateProjectTool.getDescription()).toMatch(/^Update a known Project by its project_id.*replaces ALL links \(\[\] unlinks all/);
  });

  it("has exactly the six Project/Task tools on the contract, the MCP adapters and the native registry; the removed create_or_update_project is unknown (REQ-001, REQ-002)", () => {
    const current = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
    expect([...PROJECT_TASK_TOOL_NAMES]).toEqual(current);
    expect(provider.getAdapters().map(a => a.definition.name)).toEqual(current);
    expect(defaultToolRegistry.listToolNames().filter(name => isProjectTaskToolName(name) || /project/.test(name)).sort()).toEqual([...current].sort());
    expect(isProjectTaskToolName("create_or_update_project")).toBe(false);
  });

  it("documents one optional additive context_files string array on create_task and update_task, identical on native and MCP (AC-011)", async () => {
    for (const [Tool, name, keys, required] of [
      [CreateTaskTool, "create_task", ["project_id", "description", "context_files", "depends_on"], ["project_id", "description"]],
      [UpdateTaskTool, "update_task", ["task_id", "description", "status", "context_files", "depends_on"], ["task_id"]],
    ] as const) {
      const native = Tool.getArgumentSchema().toJsonSchema() as {properties: Record<string, any>, required?: string[]};
      expect(native).toEqual(buildProjectTaskToolSchema(name).toJsonSchema());
      expect(Object.keys(native.properties)).toEqual(keys);
      expect(native.required ?? []).toEqual(required);
      expect(native.properties.context_files).toMatchObject({type: "array", items: {type: "string"}});
      expect(native.properties.context_files.description).toMatch(/Absolute local file paths.*25 MiB/);
      const listed = provider.getAdapters().find(a => a.definition.name === name)!.definition;
      expect(listed.description).toBe(Tool.getDescription());
      expect(listed.description).toMatch(/context_files.*attachedContextFiles/);
    }
    expect(provider.getAdapters().map(a => a.definition.name)).not.toContain("create_or_update_task");
    expect(UpdateTaskTool.getDescription()).toMatch(/appended, never removed.*not for a Task with no Project/);
    expect(parseUpdateTaskInput({task_id: " t ", context_files: [" /tmp/a.png ", "/tmp/b.md"]}))
      .toEqual({task_id: "t", context_files: ["/tmp/a.png", "/tmp/b.md"]});
    expect(parseCreateTaskInput({project_id: "p", description: "x", context_files: []}))
      .toEqual({project_id: "p", description: "x", context_files: []});
    expect(parseProjectTaskToolInput("update_task", {task_id: "t", status: "DONE"})).toEqual({task_id: "t", status: "DONE"});
    expect(parseProjectTaskToolInput("create_task", {project_id: "p", description: "x"})).toEqual({project_id: "p", description: "x"});
  });

  it("create_project and update_project return today's compact saved Project results through native and MCP (AC-001, AC-002)", async () => {
    const created = JSON.parse(await new CreateProjectTool().execute(null, {name: " New project ", description: " Goal "}));
    expect(created).toEqual({project: {projectId: expect.any(String), name: "New project", description: "Goal", workspaces: []}});
    const update = new UpdateProjectTool();
    const args = {project_id: created.project.projectId, name: " Renamed "};
    const patched = JSON.parse(await update.execute(null, args));
    expect(patched).toEqual({project: {...created.project, name: "Renamed"}});
    const described = await mcp("update_project", {project_id: args.project_id, description: " Updated "});
    expect(described.structuredContent).toEqual({project: {...patched.project, description: "Updated"}});
    expect(JSON.parse((described.content[0]!.text as string))).toEqual(described.structuredContent);
    const clear = JSON.parse(await update.execute(null, {project_id: args.project_id, description: " "}));
    expect(clear).toEqual({project: {...patched.project, description: ""}});
    const defaults = (await mcp("create_project", {name: "Defaults"})).structuredContent as typeof created;
    expect(defaults.project).toEqual({projectId: expect.any(String), name: "Defaults", description: "", workspaces: []});
    const listed = JSON.parse(await new ListProjectsTool().execute(null));
    expect(listed.projects).toContainEqual({projectId: args.project_id, name: "Renamed", description: ""});
    expect((await getProjectService().getProject(args.project_id))?.name).toBe("Renamed");
    await expect(new CreateProjectTool().execute(null, {name: "Abort"}, {signal: AbortSignal.abort()})).rejects.toThrow("aborted before start");
    expect((await getProjectService().listProjectSummaries()).some(p => p.name === "Abort")).toBe(false);
  });

  it("preserves nested omission through public native preparation/coercion and MCP replacement/clear", async () => {
    const store = getProjectStore();
    const lookup = vi.fn(async () => { throw new Error("Registry must not gate tool writes"); });
    const wsA = path.join(root, "workspace-a"), wsB = path.join(root, "workspace-b");
    const service = new ProjectService({store, workspaceLookup: {listRegisteredWorkspaceRootPaths: lookup}});
    vi.spyOn(projectServices, "getProjectService").mockReturnValue(service);
    const tasks = vi.spyOn(store, "listTasks").mockRejectedValue(new Error("Task reads must not gate tool write acknowledgements"));
    const links = [{workspace_path: ` ${wsA} `, description: " UI "}, {workspace_path: wsB, description: "Backend"}];
    const tool = new UpdateProjectTool();
    const created = JSON.parse(await new CreateProjectTool().execute(null, {name: "Linked", description: "Goal", workspaces: links}));
    expect(created.project.workspaces).toEqual([{workspaceRootPath: wsA, description: "UI"}, {workspaceRootPath: wsB, description: "Backend"}]);
    const saved = await store.readProject(created.project.projectId);
    const args = {project_id: created.project.projectId, workspaces: [{workspace_path: wsA}]};
    expect(await tool.prepareExecution(null, args)).toBeDefined();
    expect(parseProjectTaskToolInput("update_project", args)).toEqual(args);
    expect(JSON.parse(await tool.execute(null, args))).toEqual({project: {...created.project, workspaces: [{workspaceRootPath: wsA, description: "UI"}]}});
    expect((await mcp("update_project", args)).structuredContent).toEqual({project: {...created.project, workspaces: [{workspaceRootPath: wsA, description: "UI"}]}});
    expect((await store.readProject(args.project_id))!.workspaces).toEqual([saved!.workspaces[0]]);
    expect((await mcp("update_project", {project_id: args.project_id, workspaces: [{workspace_path: wsA, description: " "}]})).structuredContent)
      .toEqual({project: {...created.project, workspaces: [{workspaceRootPath: wsA, description: ""}]}});
    expect(JSON.parse(await tool.execute(null, {project_id: args.project_id, workspaces: []}))).toEqual({project: {...created.project, workspaces: []}});
    expect(tasks).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    await expect(fs.access(wsA)).rejects.toThrow();
    await expect(fs.access(wsB)).rejects.toThrow();
  });

  // Project argument errors, pinned by code AND message: update_project when project_id is present, otherwise create_project.
  // Order matters: unknown keys before project_id; project_id before fields; name/patch requirements after field validation.
  it.each([
    [{}, ...NAME_REQUIRED],
    [{name: ""}, ...NAME_REQUIRED],
    [{name: " "}, ...NAME_REQUIRED],
    [{name: null}, ...invalidArg("name must be a string.")],
    [{name: 123}, ...invalidArg("name must be a string.")],
    [{name: true}, ...invalidArg("name must be a string.")],
    [{project_id: null, name: "x"}, ...PROJECT_ID_INVALID],
    [{project_id: "", name: "x"}, ...PROJECT_ID_INVALID],
    [{project_id: " ", name: "x"}, ...PROJECT_ID_INVALID],
    [{project_id: 123, name: "x"}, ...PROJECT_ID_INVALID],
    [{project_id: undefined, name: "x"}, ...PROJECT_ID_INVALID],
    [{project_id: null, name: ""}, ...PROJECT_ID_INVALID],
    [{project_id: "p"}, ...PATCH_REQUIRED],
    [{project_id: "p", name: 5}, ...invalidArg("name must be a string.")],
    [{project_id: "p", name: " "}, ...NAME_REQUIRED],
    [{project_id: "p", workspaces: "[]"}, ...invalidArg("workspaces must be an array.")],
    [{project_id: "p", extra: true}, ...UNSUPPORTED],
    [{project_id: null, extra: true}, ...UNSUPPORTED],
    [{description: 5}, ...invalidArg("description must be a string.")],
    [{workspaces: 5}, ...invalidArg("workspaces must be an array.")],
    [{name: "x", description: null}, ...invalidArg("description must be a string.")],
    [{name: "x", description: false}, ...invalidArg("description must be a string.")],
    [{name: "x", description: 123}, ...invalidArg("description must be a string.")],
    [{name: "x", description: undefined}, ...invalidArg("description must be a string.")],
    [{name: "x", extra: true}, ...UNSUPPORTED],
    [{extra: true}, ...UNSUPPORTED],
    [{name: "x", workspaces: ""}, ...invalidArg("workspaces must be an array.")],
    [{name: "x", workspaces: "[]"}, ...invalidArg("workspaces must be an array.")],
    [{name: "x", workspaces: null}, ...invalidArg("workspaces must be an array.")],
    [{name: "x", workspaces: {}}, ...invalidArg("workspaces must be an array.")],
    [{name: "x", workspaces: undefined}, ...invalidArg("workspaces must be an array.")],
    [{name: "x", workspaces: [null]}, ...WORKSPACE_NOT_PLAIN],
    [{name: "x", workspaces: ["ws"]}, ...WORKSPACE_NOT_PLAIN],
    [{name: "x", workspaces: [123]}, ...WORKSPACE_NOT_PLAIN],
    [{name: "x", workspaces: [new Date()]}, ...WORKSPACE_NOT_PLAIN],
    [{name: "x", workspaces: [[]]}, ...WORKSPACE_NOT_PLAIN],
    [{name: "x", workspaces: Array(1)}, ...WORKSPACE_NOT_PLAIN],
    [{name: "x", workspaces: [{workspace_id: "old_id"}]}, ...invalidArg("Unsupported workspace argument.")],
    [{name: "x", workspaces: [{}]}, ...invalidArg("workspace_path must be a non-empty string.")],
    [{name: "x", workspaces: [{workspace_path: null}]}, ...invalidArg("workspace_path must be a non-empty string.")],
    [{name: "x", workspaces: [{workspace_path: ""}]}, ...invalidArg("workspace_path must be a non-empty string.")],
    [{name: "x", workspaces: [{workspace_path: 123}]}, ...invalidArg("workspace_path must be a non-empty string.")],
    [{name: "x", workspaces: [{workspace_path: "ws", description: null}]}, ...invalidArg("Workspace description must be a string.")],
    [{name: "x", workspaces: [{workspace_path: "ws", description: false}]}, ...invalidArg("Workspace description must be a string.")],
    [{name: "x", workspaces: [{workspace_path: "ws", description: 123}]}, ...invalidArg("Workspace description must be a string.")],
    [{name: "x", workspaces: [{workspace_path: "ws", extra: true}]}, ...invalidArg("Unsupported workspace argument.")],
    [{name: "x", workspaces: [{workspace_path: "/work/site"}, {workspace_path: "/work/site/../site/"}]}, "WORKSPACE_ALREADY_LINKED", "Duplicate workspace links are not allowed."],
  ])("rejects malformed Project input before native coercion with MCP parity: %j", async (args, code, message) => {
    const before = await getProjectService().listProjectSummaries();
    const expected = {error: {code, message}};
    expect(await projectToolError(Object.hasOwn(args, "project_id") ? "update_project" : "create_project", args)).toEqual(expected);
    expect(await getProjectService().listProjectSummaries()).toEqual(before);
  });

  it.each([
    ["create_project", {project_id: "p", name: "x"}, ...UNSUPPORTED],
    ["create_project", {project_id: "p"}, ...UNSUPPORTED],
    ["create_project", {project_id: null, name: ""}, ...UNSUPPORTED],
    ["update_project", {}, ...PROJECT_ID_INVALID],
    ["update_project", {name: "x"}, ...PROJECT_ID_INVALID],
    ["update_project", {name: "x", extra: true}, ...UNSUPPORTED],
  ] as const)("%s accepts only its own arguments: %j (AC-001, AC-002)", async (name, args, code, message) => {
    const before = await getProjectService().listProjectSummaries();
    expect(await projectToolError(name, args)).toEqual({error: {code, message}});
    expect(await getProjectService().listProjectSummaries()).toEqual(before);
  });

  it.each([null, [], new Date(), Object.assign(Object.create({name: "Inherited"}), {description: "x"})])(
    "rejects nonplain top-level Project arguments on every Project mutation tool: %j", async args => {
      for (const name of PROJECT_TOOL_NAMES) {
        expect(await projectToolError(name, args)).toEqual({error: {code: "PROJECT_TOOL_ARGUMENT_INVALID", message: "Tool arguments must be a plain object."}});
      }
    },
  );

  it("returns service validation errors without partial metadata or implicit upsert", async () => {
    const file = path.join(root, "projects", projectId, "project.json");
    const before = await fs.readFile(file, "utf8");
    for (const [name, args, code] of [
      ["update_project", {project_id: "missing", name: "Never create"}, "PROJECT_NOT_FOUND"],
      ["create_project", {name: " tools fixture "}, "PROJECT_NAME_TAKEN"],
      ["update_project", {project_id: projectId, name: "No partial rename", workspaces: [{workspace_path: "agent_ws_missing"}]}, "WORKSPACE_PATH_INVALID"],
    ] as const) {
      const error = await projectToolError(name, {...args});
      expect(error).toMatchObject({error: {code}});
      expect(await fs.readFile(file, "utf8")).toBe(before);
      expect(await getProjectService().listProjectSummaries()).toHaveLength(1);
    }
  });

  it.each(["native", "mcp"] as const)("reports unconfirmed Project writes truthfully through %s without exposing private failure details", async mode => {
    const store = getProjectStore();
    const uncertainStore = Object.assign(Object.create(store), {
      createProject: async (...args: Parameters<typeof store.createProject>) => {
        await store.createProject(...args);
        throw new Error("private postcommit detail");
      },
      updateProject: async (...args: Parameters<typeof store.updateProject>) => {
        await store.updateProject(...args);
        throw new Error("private postcommit detail");
      },
    });
    vi.spyOn(projectServices, "getProjectService").mockReturnValue(new ProjectService({store: uncertainStore}));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const [name, args] of [
      ["create_project", {name: "Recorded but unconfirmed"}],
      ["update_project", {project_id: projectId, description: "Saved goal"}],
    ] as const) {
      const result = mode === "native"
        ? await new PROJECT_TOOLS[name]().execute(null, args).then(() => null, e => JSON.parse(e.message))
        : (await mcp(name, args)).structuredContent;
      expect(result).toEqual({error: {code: "PROJECT_OPERATION_UNCONFIRMED", message: "Project change could not be confirmed. Check the saved Project before repeating."}});
      expect(JSON.stringify(result)).not.toMatch(/private|rollback/);
    }
    expect((await store.listProjects()).some(p => p.name === "Recorded but unconfirmed")).toBe(true);
    expect((await store.readProject(projectId))!.description).toBe("Saved goal");
  });

  it("shares business reads and compact TODO create/known-ID status acknowledgements", async () => {
    const catalog = JSON.parse(await new ListProjectsTool().execute(null));
    expect((await mcp("list_projects", {})).structuredContent).toEqual(catalog);
    expect(catalog.projects).toEqual([{projectId, name: "Tools fixture", description: ""}]);
    const created = JSON.parse(await new CreateTaskTool().execute(null, {project_id: projectId, description: " hello "}));
    // A Project Task's agent-facing taskId is its key (REQ-018).
    expect(created.task).toEqual({projectId, taskId: "tools-fixture-1", status: "TODO", dependsOn: []});
    const patched = await mcp("update_task", {task_id: created.task.taskId, status: "DONE"});
    expect(patched.structuredContent).toMatchObject({task: {...created.task, status: "DONE"}});
    const listed = JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId, status: "DONE"}));
    expect((await mcp("list_project_tasks", {project_id: projectId, status: "DONE"})).structuredContent).toEqual(listed);
    expect(listed.tasks).toEqual([{...created.task, status: "DONE", description: "hello", contextFiles: [], assignments: [], closedAssignments: []}]);
    expect((await mcp("list_project_tasks", {project_id: projectId, status: "TODO"})).structuredContent).toEqual({projectId, tasks: []});
  });
  it("documents and accepts CANCELLED (dropped as not needed) on patch and list, never on create (AC-004, AC-006, AC-007)", async () => {
    for (const name of ["update_task", "list_project_tasks"] as const) {
      const schema = buildProjectTaskToolSchema(name).toJsonSchema() as {properties: Record<string, any>};
      expect(schema.properties.status.enum).toEqual(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
    }
    expect(UpdateTaskTool.getDescription()).toMatch(/status \(TODO, IN_PROGRESS, DONE, CANCELLED\).*CANCELLED means the Task was dropped as not needed \(not finished\)\. Both stop the task agents whose current Task this is.*first set the Task to TODO or IN_PROGRESS/s);
    expect(ListProjectTasksTool.getDescription()).toMatch(/TODO, IN_PROGRESS, DONE or CANCELLED status \(CANCELLED = dropped as not needed\)/);
    const created = JSON.parse(await new CreateTaskTool().execute(null, {project_id: projectId, description: "unneeded"}));
    const kept = JSON.parse(await new CreateTaskTool().execute(null, {project_id: projectId, description: "kept"}));
    expect((await mcp("update_task", {task_id: created.task.taskId, status: "CANCELLED"})).structuredContent)
      .toEqual({task: {...created.task, status: "CANCELLED"}});
    const closed = JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId, status: "CANCELLED"}));
    expect(closed.tasks.map((t: {taskId: string}) => t.taskId)).toEqual([created.task.taskId]);
    expect((await mcp("list_project_tasks", {project_id: projectId})).structuredContent.tasks.map((t: {taskId: string}) => t.taskId).sort())
      .toEqual([created.task.taskId, kept.task.taskId].sort());
    // Reopen through the tool.
    expect(JSON.parse(await new UpdateTaskTool().execute(null, {task_id: created.task.taskId, status: "TODO"})).task.status).toBe("TODO");
    const invalid = await new UpdateTaskTool().execute(null, {task_id: created.task.taskId, status: "WONT_DO"}).then(() => null, (e) => JSON.parse(e.message));
    expect(invalid).toMatchObject({error: {code: "TASK_STATUS_INVALID", message: "Task status must be TODO, IN_PROGRESS, DONE or CANCELLED."}});
  });
  it.each([
    ["list_projects", {extra: true}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: 12}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: "p", status: "todo"}, "TASK_STATUS_INVALID"],
    ["update_task", {task_id: null, description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "", description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    // Update takes task_id only: project_id with task_id is an unsupported argument (AC-004).
    ["create_task", {project_id: "p", task_id: "t", status: "DONE"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {project_id: "p", task_id: "t", status: "DONE"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    // Create still needs a Project (AC-006).
    ["create_task", {description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_task", {project_id: "p", description: ""}, "TASK_DESCRIPTION_REQUIRED"],
    ["create_task", {project_id: "p", description: "x", status: "TODO"}, "TASK_CREATE_STATUS_UNSUPPORTED"],
    ["create_task", {project_id: "p", description: "x", status: "CANCELLED"}, "TASK_CREATE_STATUS_UNSUPPORTED"],
    ["update_task", {task_id: "t"}, "TASK_PATCH_REQUIRED"],
    // context_files: one additive array of non-blank path strings in both modes (AC-004, AC-008).
    ["update_task", {task_id: "t", context_files: []}, "TASK_PATCH_REQUIRED"],
    ["create_task", {project_id: "p", description: "x", context_files: "/a.md"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_task", {project_id: "p", description: "x", context_files: null}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_task", {project_id: "p", description: "x", context_files: {path: "/a.md"}}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "t", context_files: [123]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "t", context_files: [null]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "t", context_files: [" "]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "t", context_files: Array(1)}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "t", context_files: [["/a.md"]]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {task_id: "t", remove_context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_task", {project_id: "p", task_id: "t", context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["update_task", {project_id: "p", task_id: "t", context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: "p", context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
  ])("preserves domain errors before BaseTool coercion for %s", async (name, raw, code) => {
    const tool = name === "list_projects" ? new ListProjectsTool() : name === "list_project_tasks" ? new ListProjectTasksTool()
      : name === "create_task" ? new CreateTaskTool() : new UpdateTaskTool();
    const thrown = await tool.execute(null, raw).then(() => null, (e) => JSON.parse(e.message));
    const result = await mcp(name, raw);
    expect(thrown).toMatchObject({error: {code}});
    expect(result.structuredContent).toEqual(thrown); expect(result.isError).toBe(true);
  });
  it("unknown Task IDs fail without creating and aborted native execution stays a transport error", async () => {
    const args = {task_id: "missing", description: "No upsert"};
    const error = await new UpdateTaskTool().execute(null, args).catch((e) => JSON.parse(e.message));
    expect(error.error.code).toBe("TASK_NOT_FOUND");
    expect((await mcp("update_task", args)).structuredContent).toEqual(error);
    expect(JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId})).tasks).toEqual([]);
    await expect(new ListProjectsTool().execute(null, {}, {signal: AbortSignal.abort()})).rejects.toThrow("aborted before start");
  });
  it("exposes exactly explicit selections to catalog/Claude/native members, never legacy task aliases", () => {
    const catalog = new AgentToolMcpCatalog({providers: [provider]});
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure([]))).toEqual([]);
    const exposure = buildRuntimeAgentToolExposure(["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"]);
    expect(exposure.enabledProjectTaskToolNames).toEqual(exposure.requestedToolNames);
    expect(catalog.resolveConfiguredSupportedToolNames(exposure)).toEqual(exposure.requestedToolNames);
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure(["list_projects"]))).toEqual(["list_projects"]);
    // Each Project mutation tool alone is exactly that tool.
    for (const name of PROJECT_TOOL_NAMES) {
      const mutatorOnly = buildRuntimeAgentToolExposure([name]);
      expect(mutatorOnly.enabledProjectTaskToolNames).toEqual([name]);
      expect(catalog.resolveConfiguredSupportedToolNames(mutatorOnly)).toEqual([name]);
    }
    expect(resolveClaudeSessionToolingOptions({runtimeToolExposure: exposure, memberExecutionContext: null, hasMaterializedSkills: false}).agentToolsMcpEnabledToolNames).toEqual(exposure.requestedToolNames);
    // The old combined name is not a tool: nothing exposes it and no adapter serves it.
    const old = buildRuntimeAgentToolExposure(["create_or_update_task"]);
    expect(old.enabledProjectTaskToolNames).toEqual([]);
    expect(catalog.resolveConfiguredSupportedToolNames(old)).toEqual([]);
  });
});
