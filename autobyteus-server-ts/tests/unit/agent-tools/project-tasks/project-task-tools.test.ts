import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { getProjectService, resetProjectServiceForTests } from "../../../../src/projects/services/project-service.js";
import { resetProjectTaskServiceForTests } from "../../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../../src/projects/context/project-task-context-store.js";
import { ListProjectsTool, ListProjectTasksTool, CreateOrUpdateProjectTool, CreateOrUpdateTaskTool, registerProjectTaskTools } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveClaudeSessionToolingOptions } from "../../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { resolveAutoByteusExecutionToolNames } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.js";
import * as projectServices from "../../../../src/projects/services/project-service.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import { getProjectStore } from "../../../../src/projects/stores/project-store.js";
import { buildProjectTaskToolSchema, parseProjectTaskToolInput } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
const provider = new ProjectTaskToolsMcpAdapterProvider();
const mcp = async (name: string, args: Record<string, unknown>) => {
  const result = await provider.getAdapters().find((a) => a.definition.name === name)!.execute({rawArguments: args, session: {} as never});
  if (result.kind === "mcp_tool_result") return result.result;
  throw new Error("Expected structured domain result.");
};
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

  it("protects the selected Project mutator from configured MCP collision and rejects unselected calls", () => {
    const name = "create_or_update_project";
    const collision = new ToolDefinition(name, "Configured collision", ToolOrigin.MCP, "MCP",
      () => buildProjectTaskToolSchema(name), () => null, {customFactory: () => new CreateOrUpdateProjectTool(), metadata: {mcp_server_id: "configured-server"}});
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
    const readOnly = catalog.resolveRuntimeSessionToolExposure(buildRuntimeAgentToolExposure(["list_projects"]));
    expect(catalog.resolveToolCallAvailability(readOnly as never, name)).toEqual({ok: false, reason: "tool_not_enabled"});
  });

  it("documents nested workspace rows with no omission-erasing defaults", () => {
    const native = CreateOrUpdateProjectTool.getArgumentSchema().toJsonSchema();
    expect(native).toEqual(buildProjectTaskToolSchema("create_or_update_project").toJsonSchema());
    const schema = native as {properties: Record<string, any>, required?: string[]};
    expect(Object.keys(schema.properties)).toEqual(["project_id", "name", "description", "workspaces"]);
    expect(schema.required ?? []).toEqual([]);
    expect(schema.properties.workspaces).toMatchObject({type: "array", items: {
      type: "object", required: ["workspace_path"], properties: {workspace_path: {type: "string"}, description: {type: "string"}},
    }});
    expect(schema.properties.workspaces).not.toHaveProperty("default");
    expect(schema.properties.workspaces.items.properties.description).not.toHaveProperty("default");
    expect(provider.getAdapters().find(a => a.definition.name === "create_or_update_project")!.configuredMcpCollisionPolicy).toBe("protect_static_adapter");
  });

  it("documents one optional additive context_files string array on create_or_update_task, identical on native and MCP (AC-011)", async () => {
    const native = CreateOrUpdateTaskTool.getArgumentSchema().toJsonSchema() as {properties: Record<string, any>, required?: string[]};
    expect(native).toEqual(buildProjectTaskToolSchema("create_or_update_task").toJsonSchema());
    expect(Object.keys(native.properties)).toEqual(["project_id", "task_id", "description", "status", "context_files"]);
    expect(native.required ?? []).toEqual([]);
    expect(native.properties.context_files).toMatchObject({type: "array", items: {type: "string"}});
    expect(native.properties.context_files.description).toMatch(/Absolute local file paths.*appended on patch; never removes.*25 MiB/);
    const listed = provider.getAdapters().find(a => a.definition.name === "create_or_update_task")!.definition;
    expect(listed.description).toBe(CreateOrUpdateTaskTool.getDescription());
    expect(listed.description).toMatch(/context_files.*patch appends and never removes.*not for a Task with no Project.*attachedContextFiles/);
    expect(parseProjectTaskToolInput("create_or_update_task", {task_id: " t ", context_files: [" /tmp/a.png ", "/tmp/b.md"]}))
      .toEqual({task_id: "t", context_files: ["/tmp/a.png", "/tmp/b.md"]});
    expect(parseProjectTaskToolInput("create_or_update_task", {project_id: "p", description: "x", context_files: []}))
      .toEqual({project_id: "p", description: "x", context_files: []});
  });

  it("creates and patches compact saved Project results identically through native and MCP", async () => {
    const tool = new CreateOrUpdateProjectTool();
    const created = JSON.parse(await tool.execute(null, {name: " New project ", description: " Goal "}));
    expect(created).toEqual({project: {projectId: expect.any(String), name: "New project", description: "Goal", workspaces: []}});
    const args = {project_id: created.project.projectId, name: " Renamed "};
    const patched = JSON.parse(await tool.execute(null, args));
    expect(patched).toEqual({project: {...created.project, name: "Renamed"}});
    const parity = await mcp("create_or_update_project", args);
    expect(parity.structuredContent).toEqual(patched);
    expect(JSON.parse((parity.content[0]!.text as string))).toEqual(patched);
    const described = await mcp("create_or_update_project", {project_id: args.project_id, description: " Updated "});
    expect(described.structuredContent).toEqual({project: {...patched.project, description: "Updated"}});
    const clear = JSON.parse(await tool.execute(null, {project_id: args.project_id, description: " "}));
    expect(clear).toEqual({project: {...patched.project, description: ""}});
    const defaults = (await mcp("create_or_update_project", {name: "Defaults"})).structuredContent as typeof created;
    expect(defaults.project).toEqual({projectId: expect.any(String), name: "Defaults", description: "", workspaces: []});
    const listed = JSON.parse(await new ListProjectsTool().execute(null));
    expect(listed.projects).toContainEqual({projectId: args.project_id, name: "Renamed", description: ""});
    expect((await getProjectService().getProject(args.project_id))?.name).toBe("Renamed");
    await expect(tool.execute(null, {name: "Abort"}, {signal: AbortSignal.abort()})).rejects.toThrow("aborted before start");
    expect((await getProjectService().listProjectSummaries()).some(p => p.name === "Abort")).toBe(false);
  });

  it("preserves nested omission through public native preparation/coercion and MCP replacement/clear", async () => {
    const store = getProjectStore();
    const lookup = vi.fn(async () => { throw new Error("Registry must not gate tool writes"); });
    const wsA = path.join(root, "workspace-a"), wsB = path.join(root, "workspace-b");
    const service = new ProjectService({store, workspaceLookup: {listRegisteredWorkspaceRootPaths: lookup}});
    vi.spyOn(projectServices, "getProjectService").mockReturnValue(service);
    const tasks = vi.spyOn(store, "listTasks").mockRejectedValue(new Error("Task reads must not gate tool write acknowledgements"));
    const tool = new CreateOrUpdateProjectTool();
    const created = JSON.parse(await tool.execute(null, {name: "Linked", description: "Goal", workspaces: [
      {workspace_path: ` ${wsA} `, description: " UI "}, {workspace_path: wsB, description: "Backend"},
    ]}));
    expect(created.project.workspaces).toEqual([{workspaceRootPath: wsA, description: "UI"}, {workspaceRootPath: wsB, description: "Backend"}]);
    const saved = await store.readProject(created.project.projectId);
    const args = {project_id: created.project.projectId, workspaces: [{workspace_path: wsA}]};
    const prepared = await tool.prepareExecution(null, args);
    expect(prepared).toBeDefined();
    expect(parseProjectTaskToolInput("create_or_update_project", args)).toEqual(args);
    expect(JSON.parse(await tool.execute(null, args))).toEqual({project: {...created.project, workspaces: [{workspaceRootPath: wsA, description: "UI"}]}});
    expect((await mcp("create_or_update_project", args)).structuredContent).toEqual({project: {...created.project, workspaces: [{workspaceRootPath: wsA, description: "UI"}]}});
    expect((await store.readProject(args.project_id))!.workspaces).toEqual([saved!.workspaces[0]]);
    expect((await mcp("create_or_update_project", {project_id: args.project_id, workspaces: [{workspace_path: wsA, description: " "}]})).structuredContent)
      .toEqual({project: {...created.project, workspaces: [{workspaceRootPath: wsA, description: ""}]}});
    expect(JSON.parse(await tool.execute(null, {project_id: args.project_id, workspaces: []}))).toEqual({project: {...created.project, workspaces: []}});
    expect(tasks).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    await expect(fs.access(wsA)).rejects.toThrow();
    await expect(fs.access(wsB)).rejects.toThrow();
  });

  it.each([
    [{}, "PROJECT_NAME_REQUIRED"],
    [{name: ""}, "PROJECT_NAME_REQUIRED"],
    [{name: " "}, "PROJECT_NAME_REQUIRED"],
    [{name: null}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: 123}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: true}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{project_id: null, name: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{project_id: "", name: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{project_id: " ", name: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{project_id: 123, name: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{project_id: undefined, name: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{project_id: "p"}, "PROJECT_PATCH_REQUIRED"],
    [{name: "x", description: null}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", description: false}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", description: 123}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", description: undefined}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", extra: true}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: ""}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: "[]"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: null}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: {}}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: undefined}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [null]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: ["ws"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [123]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [new Date()]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [[]]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: Array(1)}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_id: "old_id"}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: null}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: ""}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: 123}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: "ws", description: null}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: "ws", description: false}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: "ws", description: 123}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: "ws", extra: true}]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    [{name: "x", workspaces: [{workspace_path: "/work/site"}, {workspace_path: "/work/site/../site/"}]}, "WORKSPACE_ALREADY_LINKED"],
  ])("rejects malformed Project input before native coercion with MCP parity: %j", async (args, code) => {
    const before = await getProjectService().listProjectSummaries();
    const native = await new CreateOrUpdateProjectTool().execute(null, args).then(() => null, e => JSON.parse(e.message));
    const result = await mcp("create_or_update_project", args);
    expect(native).toMatchObject({error: {code}});
    expect(result.structuredContent).toEqual(native);
    expect(result.isError).toBe(true);
    expect(JSON.parse((result.content[0]!.text as string))).toEqual(native);
    expect(await getProjectService().listProjectSummaries()).toEqual(before);
  });

  it.each([null, [], new Date(), Object.assign(Object.create({name: "Inherited"}), {description: "x"})])(
    "rejects nonplain top-level Project arguments", async args => {
      const native = await new CreateOrUpdateProjectTool().execute(null, args as never).catch(e => JSON.parse(e.message));
      expect(native).toMatchObject({error: {code: "PROJECT_TOOL_ARGUMENT_INVALID"}});
      expect((await mcp("create_or_update_project", args as never)).structuredContent).toEqual(native);
    },
  );

  it("returns service validation errors without partial metadata or implicit upsert", async () => {
    const file = path.join(root, "projects", projectId, "project.json");
    const before = await fs.readFile(file, "utf8");
    for (const [args, code] of [
      [{project_id: "missing", name: "Never create"}, "PROJECT_NOT_FOUND"],
      [{name: " tools fixture "}, "PROJECT_NAME_TAKEN"],
      [{project_id: projectId, name: "No partial rename", workspaces: [{workspace_path: "agent_ws_missing"}]}, "WORKSPACE_PATH_INVALID"],
    ] as const) {
      const input = {...args};
      const error = await new CreateOrUpdateProjectTool().execute(null, input).catch(e => JSON.parse(e.message));
      expect(error).toMatchObject({error: {code}});
      expect((await mcp("create_or_update_project", input)).structuredContent).toEqual(error);
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
    for (const args of [{name: "Recorded but unconfirmed"}, {project_id: projectId, description: "Saved goal"}]) {
      const result = mode === "native"
        ? await new CreateOrUpdateProjectTool().execute(null, args).then(() => null, e => JSON.parse(e.message))
        : (await mcp("create_or_update_project", args)).structuredContent;
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
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, {project_id: projectId, description: " hello "}));
    expect(created.task).toEqual({projectId, taskId: expect.any(String), status: "TODO"});
    const patched = await mcp("create_or_update_task", {task_id: created.task.taskId, status: "DONE"});
    expect(patched.structuredContent).toMatchObject({task: {...created.task, status: "DONE"}});
    const listed = JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId, status: "DONE"}));
    expect((await mcp("list_project_tasks", {project_id: projectId, status: "DONE"})).structuredContent).toEqual(listed);
    expect(listed.tasks).toEqual([{...created.task, status: "DONE", description: "hello", contextFiles: [], assignments: [], closedAssignments: []}]);
    expect((await mcp("list_project_tasks", {project_id: projectId, status: "TODO"})).structuredContent).toEqual({projectId, tasks: []});
  });
  it("documents and accepts CANCELLED (dropped as not needed) on patch and list, never on create (AC-004, AC-006, AC-007)", async () => {
    for (const name of ["create_or_update_task", "list_project_tasks"] as const) {
      const schema = buildProjectTaskToolSchema(name).toJsonSchema() as {properties: Record<string, any>};
      expect(schema.properties.status.enum).toEqual(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
    }
    expect(CreateOrUpdateTaskTool.getDescription()).toMatch(/TODO\/IN_PROGRESS\/DONE\/CANCELLED status.*CANCELLED means the Task was dropped as not needed \(not completed\)\. Both stop the copies whose current Task this is.*set the Task to TODO or IN_PROGRESS first/);
    expect(ListProjectTasksTool.getDescription()).toMatch(/TODO, IN_PROGRESS, DONE or CANCELLED status \(CANCELLED = dropped as not needed\)/);
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, {project_id: projectId, description: "unneeded"}));
    const kept = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, {project_id: projectId, description: "kept"}));
    expect((await mcp("create_or_update_task", {task_id: created.task.taskId, status: "CANCELLED"})).structuredContent)
      .toEqual({task: {...created.task, status: "CANCELLED"}});
    const closed = JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId, status: "CANCELLED"}));
    expect(closed.tasks.map((t: {taskId: string}) => t.taskId)).toEqual([created.task.taskId]);
    expect((await mcp("list_project_tasks", {project_id: projectId})).structuredContent.tasks.map((t: {taskId: string}) => t.taskId).sort())
      .toEqual([created.task.taskId, kept.task.taskId].sort());
    // Reopen through the tool.
    expect(JSON.parse(await new CreateOrUpdateTaskTool().execute(null, {task_id: created.task.taskId, status: "TODO"})).task.status).toBe("TODO");
    const invalid = await new CreateOrUpdateTaskTool().execute(null, {task_id: created.task.taskId, status: "WONT_DO"}).then(() => null, (e) => JSON.parse(e.message));
    expect(invalid).toMatchObject({error: {code: "TASK_STATUS_INVALID", message: "Task status must be TODO, IN_PROGRESS, DONE or CANCELLED."}});
  });
  it.each([
    ["list_projects", {extra: true}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: 12}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: "p", status: "todo"}, "TASK_STATUS_INVALID"],
    ["create_or_update_task", {task_id: null, description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "", description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    // Update takes task_id only: project_id with task_id is an unsupported argument (AC-004).
    ["create_or_update_task", {project_id: "p", task_id: "t", status: "DONE"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    // Create still needs a Project (AC-006).
    ["create_or_update_task", {description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {project_id: "p", description: ""}, "TASK_DESCRIPTION_REQUIRED"],
    ["create_or_update_task", {project_id: "p", description: "x", status: "TODO"}, "TASK_CREATE_STATUS_UNSUPPORTED"],
    ["create_or_update_task", {project_id: "p", description: "x", status: "CANCELLED"}, "TASK_CREATE_STATUS_UNSUPPORTED"],
    ["create_or_update_task", {task_id: "t"}, "TASK_PATCH_REQUIRED"],
    // context_files: one additive array of non-blank path strings in both modes (AC-004, AC-008).
    ["create_or_update_task", {task_id: "t", context_files: []}, "TASK_PATCH_REQUIRED"],
    ["create_or_update_task", {project_id: "p", description: "x", context_files: "/a.md"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {project_id: "p", description: "x", context_files: null}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {project_id: "p", description: "x", context_files: {path: "/a.md"}}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "t", context_files: [123]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "t", context_files: [null]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "t", context_files: [" "]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "t", context_files: Array(1)}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "t", context_files: [["/a.md"]]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {task_id: "t", remove_context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {project_id: "p", task_id: "t", context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: "p", context_files: ["/a.md"]}, "PROJECT_TOOL_ARGUMENT_INVALID"],
  ])("preserves domain errors before BaseTool coercion for %s", async (name, raw, code) => {
    const tool = name === "list_projects" ? new ListProjectsTool() : name === "list_project_tasks" ? new ListProjectTasksTool() : new CreateOrUpdateTaskTool();
    const thrown = await tool.execute(null, raw).then(() => null, (e) => JSON.parse(e.message));
    const result = await mcp(name, raw);
    expect(thrown).toMatchObject({error: {code}});
    expect(result.structuredContent).toEqual(thrown); expect(result.isError).toBe(true);
  });
  it("unknown Task IDs fail without creating and aborted native execution stays a transport error", async () => {
    const args = {task_id: "missing", description: "No upsert"};
    const error = await new CreateOrUpdateTaskTool().execute(null, args).catch((e) => JSON.parse(e.message));
    expect(error.error.code).toBe("TASK_NOT_FOUND");
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(error);
    expect(JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId})).tasks).toEqual([]);
    await expect(new ListProjectsTool().execute(null, {}, {signal: AbortSignal.abort()})).rejects.toThrow("aborted before start");
  });
  it("exposes exactly explicit selections to catalog/Claude/native members, never legacy task aliases", () => {
    const catalog = new AgentToolMcpCatalog({providers: [provider]});
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure([]))).toEqual([]);
    const exposure = buildRuntimeAgentToolExposure(["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"]);
    expect(exposure.enabledProjectTaskToolNames).toEqual(exposure.requestedToolNames);
    expect(catalog.resolveConfiguredSupportedToolNames(exposure)).toEqual(exposure.requestedToolNames);
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure(["list_projects"]))).toEqual(["list_projects"]);
    const mutatorOnly = buildRuntimeAgentToolExposure(["create_or_update_project"]);
    expect(mutatorOnly.enabledProjectTaskToolNames).toEqual(["create_or_update_project"]);
    expect(catalog.resolveConfiguredSupportedToolNames(mutatorOnly)).toEqual(["create_or_update_project"]);
    expect(resolveAutoByteusExecutionToolNames({toolNames: ["create_or_update_project"], memberExecutionContext: null})).toEqual(["create_or_update_project"]);
    expect(resolveClaudeSessionToolingOptions({runtimeToolExposure: exposure, memberExecutionContext: null, hasMaterializedSkills: false}).agentToolsMcpEnabledToolNames).toEqual(exposure.requestedToolNames);
    expect(resolveAutoByteusExecutionToolNames({toolNames: [...exposure.requestedToolNames, "create_task", "update_task_status"], memberExecutionContext: {} as never})).toEqual(exposure.requestedToolNames);
  });
});
