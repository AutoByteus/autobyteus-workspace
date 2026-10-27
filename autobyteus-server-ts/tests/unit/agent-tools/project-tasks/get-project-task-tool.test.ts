import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ProjectStore } from "../../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../../../src/projects/services/project-service.js";
import * as taskServices from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskService } from "../../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../../src/projects/context/project-task-context-store.js";
import { AdHocTaskStore } from "../../../../src/projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { createRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TaskDelegationError } from "../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionOwner, TaskExecutionReleaseRequest } from "../../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { resolveAutoByteusAgentTools } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js";
import { buildRuntimeAgentToolExposure, resolveRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import {
  CreateTaskTool, GetProjectTaskTool, ListProjectTasksTool, createBoundGetProjectTaskTool, registerProjectTaskTools,
} from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ANY_TASK_READ_SCOPE, taskReadScopeOf } from "../../../../src/agent-tools/project-tasks/project-task-read-scope.js";
import { buildProjectTaskToolSchema } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";

/**
 * autobyteus-260: `get_project_task` (REQ-014, REQ-015, REQ-016; AC-012–AC-014), short `list_project_tasks` entries
 * (REQ-007, AC-006), the title on `create_task` (REQ-003, REQ-004, AC-003) and the one result rule on both routes (AC-001).
 * Scope through a real root (task agent, task team, delegated agent, no Task):
 * `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`.
 */
const mcp = async (name: string, args: Record<string, unknown>, member?: unknown) => {
  const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find((a) => a.definition.name === name)!
    .execute({ rawArguments: args, session: (member === undefined ? {} : { sender: { memberExecutionContext: member } }) as never });
  if (result.kind !== "mcp_tool_result") throw new Error("Expected structured result");
  return result.result;
};
const tool = async (name: string, args: Record<string, unknown>) => (await mcp(name, args)).structuredContent as Record<string, any>;
const native = (member: unknown, args: Record<string, unknown>) => createBoundGetProjectTaskTool(member as never).execute(null, args)
  .then((text) => JSON.parse(text), (error) => JSON.parse(error.message));
const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "manager-root" });
/** A member whose Task capability answers `ownedTaskOf` as given (the root's `ownerOf` is traced in the integration test). */
const member = (ownedTaskOf: () => TaskExecutionOwner | null) =>
  ({ identity: { root: hostRoot, memberAddress: "/worker", agentRunId: "worker" }, tasks: { ownedTaskOf } });
let dir: string, store: ProjectStore, projects: ProjectService, tasks: ProjectTaskService, projectId: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "get-project-task-"));
  const layout = new ProjectsLayout(path.join(dir, "projects"));
  store = new ProjectStore(layout);
  const changes = { taskChanged() {}, taskRemoved() {}, workerStatusChanged() {}, projectChanged() {}, projectRemoved() {} };
  projects = new ProjectService({ store, changes, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } });
  tasks = new ProjectTaskService({ store, changes, contextStore: new ProjectTaskContextStore(layout),
    adHocTasks: new AdHocTaskStore(new AdHocTasksLayout(path.join(dir, "ad-hoc-tasks"))),
    requestRelease: vi.fn<TaskExecutionReleaseRequest>(async (_root, runs) => runs.map((execution) => ({ execution, stopped: true }))) });
  await tasks.load();
  vi.spyOn(taskServices, "getProjectTaskService").mockImplementation(() => tasks);
  projectId = (await projects.createProject({ name: "AutoByteus" })).projectId;
});
afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

const create = async (title: string, description: string, extra: Record<string, unknown> = {}) =>
  (await tool("create_task", { project_id: projectId, title, description, ...extra })).task as { taskId: string };
const longIdOf = async (key: string) => (await store.listTasks(projectId)).find((t) => t.taskKey === key)!.taskId;
const owner = async (key: string): Promise<TaskExecutionOwner> => ({ taskId: await longIdOf(key), execution: { agentRunId: "worker" }, open: true });

describe("get_project_task (REQ-014, AC-012)", () => {
  it("returns one Task in full, the same by key in any letter case or long ID, on native and MCP", async () => {
    const parent = await create("Parent", "The bigger work.");
    const a = await create("Fix login", "The login page loses the session.\nSteps follow.", { part_of: parent.taskId, depends_on: [parent.taskId] });
    await tool("update_task", { task_id: a.taskId, add_comment: "Seen on Safari." });
    const expected = { projectId, taskId: "autobyteus-2", title: "Fix login", status: "TODO", description: "The login page loses the session.\nSteps follow.",
      dependsOn: ["autobyteus-1"], partOf: "autobyteus-1", comments: ["Seen on Safari."] };
    expect(await tool("get_project_task", { project_id: projectId, task_id: "AUTOBYTEUS-2" })).toEqual(expected);
    expect(await tool("get_project_task", { project_id: projectId, task_id: await longIdOf("autobyteus-2") })).toEqual(expected);
    expect(await native(null, { project_id: projectId, task_id: "autobyteus-2" })).toEqual(expected);
    expect(await tool("get_project_task", { project_id: projectId, task_id: "autobyteus-1" })).toMatchObject({ taskId: "autobyteus-1", parts: ["autobyteus-2"] });
  });

  it("names context files {name, path} and carries open and closed assignments", async () => {
    const source = path.join(dir, "brief.md");
    await fs.writeFile(source, "brief bytes");
    const a = await create("With files", "Body.", { context_files: [source] });
    const longId = await longIdOf(a.taskId);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: longId, assignedBy: "manager", hostRoot, execution: { agentRunId: "earlier" } });
    await tool("update_task", { task_id: a.taskId, status: "DONE" }); await tasks.drainRuntimeReleases();
    await tool("update_task", { task_id: a.taskId, status: "IN_PROGRESS" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: longId, assignedBy: "manager", hostRoot, execution: { agentRunId: "current" } });
    const read = await tool("get_project_task", { project_id: projectId, task_id: a.taskId });
    expect(read.contextFiles).toEqual([{ name: "brief.md", path: expect.stringContaining("brief.md") }]);
    expect(await fs.readFile(read.contextFiles[0].path, "utf8")).toBe("brief bytes");
    expect(read.assignments).toEqual([{ kind: "agent", agentRunId: "current", assignedBy: "manager", outcome: "not_confirmed" }]);
    expect(read.closedAssignments).toEqual([{ kind: "agent", agentRunId: "earlier", assignedBy: "manager", outcome: "not_confirmed" }]);
  });

  it("refuses an unknown Task and another Project's Task with TASK_NOT_FOUND, and a Temp task is not read", async () => {
    await create("Here", "In this Project.");
    const otherProjectId = (await projects.createProject({ name: "Elsewhere" })).projectId;
    const foreign = (await tool("create_task", { project_id: otherProjectId, title: "There", description: "In another Project." })).task;
    const { taskId: temp } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/w", hostRoot,
      execution: { agentRunId: "temp-worker" }, adHocTask: { description: "Temp", referenceFiles: [] } });
    for (const reference of ["autobyteus-99", foreign.taskId, `${await longIdOf("autobyteus-1")}x`, temp]) {
      const result = await mcp("get_project_task", { project_id: projectId, task_id: reference });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toEqual({ error: { code: "TASK_NOT_FOUND", message: `Task '${reference}' was not found in this project.` } });
    }
    expect(await tool("get_project_task", { project_id: "project_missing", task_id: "autobyteus-1" })).toMatchObject({ error: { code: "PROJECT_NOT_FOUND" } });
  });

  it("checks its arguments: both required, nothing else", async () => {
    expect(Object.keys((buildProjectTaskToolSchema("get_project_task").toJsonSchema() as { properties: object }).properties)).toEqual(["project_id", "task_id"]);
    for (const args of [{ project_id: projectId }, { task_id: "autobyteus-1" }, { project_id: projectId, task_id: " " }, { project_id: projectId, task_id: "x", status: "TODO" }]) {
      expect(await tool("get_project_task", args)).toMatchObject({ error: { code: "PROJECT_TOOL_ARGUMENT_INVALID" } });
    }
  });
});

describe("get_project_task caller scope (REQ-015, AC-013; AR-006, AR-008)", () => {
  it("a worker reads its own Task and is refused another one, its parent included, with no data, on both routes", async () => {
    const parent = await create("Parent", "Parent body.");
    const own = await create("Own", "Own body.", { part_of: parent.taskId });
    const ownedTask = await owner(own.taskId);
    const worker = member(() => ownedTask);
    const refusal = { error: { code: "TASK_READ_OUT_OF_SCOPE", message: `You work on ${own.taskId}; you can read only that Task.` } };
    const routes = [
      (args: Record<string, unknown>) => mcp("get_project_task", args, worker).then((r) => r.structuredContent),
      (args: Record<string, unknown>) => native(worker, args),
    ];
    for (const read of routes) {
      expect(await read({ project_id: projectId, task_id: own.taskId })).toMatchObject({ taskId: own.taskId, description: "Own body." });
      expect(await read({ project_id: projectId, task_id: parent.taskId })).toEqual(refusal);
    }
    // A caller that works on no Task reads any Project Task.
    expect(await native(member(() => null), { project_id: projectId, task_id: parent.taskId })).toMatchObject({ taskId: parent.taskId });
    expect(taskReadScopeOf(member(() => null) as never)).toBe(ANY_TASK_READ_SCOPE);
    expect(taskReadScopeOf(null)).toBe(ANY_TASK_READ_SCOPE);
  });

  it("names a worker's own Task in another Project by its key, and a Temp-task worker's Task as having no Project", async () => {
    const target = await create("Target", "Target body.");
    const otherProjectId = (await projects.createProject({ name: "Other" })).projectId;
    const elsewhere = (await tool("create_task", { project_id: otherProjectId, title: "Mine", description: "Mine." })).task;
    const elsewhereId = (await store.listTasks(otherProjectId))[0]!.taskId;
    expect((await mcp("get_project_task", { project_id: projectId, task_id: target.taskId },
      member(() => ({ taskId: elsewhereId, execution: { agentRunId: "worker" }, open: true })))).structuredContent)
      .toEqual({ error: { code: "TASK_READ_OUT_OF_SCOPE", message: `You work on ${elsewhere.taskId}; you can read only that Task.` } });
    expect(await native(member(() => ({ taskId: "ad_hoc_task_1", execution: { agentRunId: "worker" }, open: true })), { project_id: projectId, task_id: target.taskId }))
      .toEqual({ error: { code: "TASK_READ_OUT_OF_SCOPE", message: "Your Task has no Project; get_project_task reads Project Tasks." } });
  });

  it("a copy holding two open Tasks reads only its current one, the latest given to it (AR-006)", async () => {
    const a = await create("A", "First Task."), b = await create("B", "Second Task.");
    const copy: TaskExecutionReference = { agentRunId: "copy" };
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: await longIdOf(a.taskId), assignedBy: "manager", hostRoot, execution: copy });
    await tasks.markStarted(copy);
    await tasks.assignExistingTaskExecution({ hostRoot, execution: copy, taskId: await longIdOf(b.taskId), assignedBy: "manager" });
    expect((await tool("get_project_task", { project_id: projectId, task_id: a.taskId })).status).toBe("TODO"); // A stays open
    // The member's answer is the Task side's own ownerOf for the copy.
    const worker = member(() => tasks.ownerOf([copy]));
    expect((await mcp("get_project_task", { project_id: projectId, task_id: b.taskId }, worker)).structuredContent).toMatchObject({ taskId: b.taskId });
    expect((await mcp("get_project_task", { project_id: projectId, task_id: a.taskId }, worker)).structuredContent)
      .toEqual({ error: { code: "TASK_READ_OUT_OF_SCOPE", message: `You work on ${b.taskId}; you can read only that Task.` } });
  });

  it("fails closed when the scope can't be told: damaged run data is a refusal with its code, never a read (AR-008)", async () => {
    const a = await create("A", "Body.");
    const damaged = member(() => { throw new TaskDelegationError("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read."); });
    const refusal = { error: { code: "TASK_AGENT_RESOURCES_UNAVAILABLE", message: "Task run data could not be read." } };
    const viaMcp = await mcp("get_project_task", { project_id: projectId, task_id: a.taskId }, damaged);
    expect(viaMcp.isError).toBe(true);
    expect(viaMcp.structuredContent).toEqual(refusal);
    expect(await native(damaged, { project_id: projectId, task_id: a.taskId })).toEqual(refusal);
    // The other Project Task tools never ask for the scope.
    expect((await mcp("list_project_tasks", { project_id: projectId }, damaged)).structuredContent).toMatchObject({ tasks: [{ taskId: a.taskId }] });
  });

  it("is created only bound to its caller: an instance the registry makes without one refuses (AR-008)", async () => {
    registerProjectTaskTools();
    await create("A", "Body.");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unbound = defaultToolRegistry.createTool("get_project_task") as GetProjectTaskTool;
    const refused = await unbound.execute(null, { project_id: projectId, task_id: "autobyteus-1" }).then(() => null, (e) => JSON.parse(e.message));
    expect(refused).toEqual({ error: { code: "PROJECT_OPERATION_FAILED", message: "Project operation failed." } });
  });
});

describe("get_project_task exposure (REQ-016, AC-014)", () => {
  it("is absent unless the agent definition lists it, on the MCP catalog and the native resolver; listed, it is created bound", () => {
    registerProjectTaskTools();
    const catalog = new AgentToolMcpCatalog({ providers: [new ProjectTaskToolsMcpAdapterProvider()] });
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure(["list_project_tasks"]))).toEqual(["list_project_tasks"]);
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure(["get_project_task"]))).toEqual(["get_project_task"]);
    const resolve = (toolNames: string[]) => {
      const agentDefinition = new AgentDefinition({ name: "Worker", description: "d", instructions: "i", toolNames });
      return resolveAutoByteusAgentTools({ agentDefinition, runtimeToolExposure: resolveRuntimeAgentToolExposure(agentDefinition),
        memberExecutionContext: member(() => null) as never, logger: { warn: vi.fn(), error: vi.fn() } });
    };
    expect(resolve(["list_project_tasks"]).actualToolNames).toEqual(["list_project_tasks"]);
    const listed = resolve(["get_project_task"]);
    expect(listed.actualToolNames).toEqual(["get_project_task"]);
    expect(listed.tools[0]).toBeInstanceOf(GetProjectTaskTool);
  });
});

describe("list_project_tasks short entries (REQ-007, AC-006)", () => {
  it("lists short entries only and has no task_ids parameter", async () => {
    const a = await create("Fix login", "The login page loses the session.");
    await create("Add titles", "Tasks get a title.");
    await tool("update_task", { task_id: a.taskId, add_comment: "Seen on Safari." });
    const listed = await tool("list_project_tasks", { project_id: projectId });
    expect(listed.tasks).toEqual(expect.arrayContaining([
      { taskId: "autobyteus-1", title: "Fix login", status: "TODO", commentCount: 1 },
      { taskId: "autobyteus-2", title: "Add titles", status: "TODO" },
    ]));
    expect(JSON.stringify(listed)).not.toMatch(/description|comments"|contextFiles|closedAssignments/);
    expect(Object.keys((ListProjectTasksTool.getArgumentSchema().toJsonSchema() as { properties: object }).properties)).toEqual(["project_id", "status"]);
    expect(await tool("list_project_tasks", { project_id: projectId, task_ids: [a.taskId] }))
      .toEqual({ error: { code: "PROJECT_TOOL_ARGUMENT_INVALID", message: "Unsupported tool argument." } });
  });
});

describe("create_task title (REQ-003, REQ-004, AC-003)", () => {
  it.each(["native", "mcp"] as const)("refuses a missing or blank title through %s and creates nothing", async (mode) => {
    const run = async (args: Record<string, unknown>) => mode === "mcp"
      ? (await mcp("create_task", args)).structuredContent
      : new CreateTaskTool().execute(null, args).then(() => { throw new Error("Must reject"); }, (e) => JSON.parse(e.message));
    for (const args of [{ project_id: projectId, description: "No title" }, { project_id: projectId, title: "   ", description: "Blank title" }]) {
      expect(await run(args)).toEqual({ error: { code: "TASK_TITLE_REQUIRED", message: "Task title is required." } });
    }
    expect(await store.listTasks(projectId)).toEqual([]);
  });

  it("keeps a long title whole and stores it; the acknowledgement names it", async () => {
    const title = `Make every agent tool result leave out empty fields ${"and more ".repeat(40)}`.trim();
    const created = await tool("create_task", { project_id: projectId, title, description: "Brief." });
    expect(created).toEqual({ task: { projectId, taskId: "autobyteus-1", title, status: "TODO" } });
    expect((await store.listTasks(projectId))[0]!.title).toBe(title);
  });
});

describe("one result rule on both routes (REQ-001, REQ-002, AC-001)", () => {
  it("writes the same compact text on native and MCP, with no empty field, and keeps refusals' code and message", async () => {
    await create("Only", "One Task.");
    const nativeText = await new ListProjectTasksTool().execute(null, { project_id: projectId });
    const viaMcp = await mcp("list_project_tasks", { project_id: projectId });
    expect(nativeText).toBe(`{"projectId":"${projectId}","tasks":[{"taskId":"autobyteus-1","title":"Only","status":"TODO"}]}`);
    expect(viaMcp.content).toEqual([{ type: "text", text: nativeText }]);
    expect(viaMcp.structuredContent).toEqual(JSON.parse(nativeText));
    expect(nativeText).not.toMatch(/\n|null|\[\]|""|\{\}/);
    const refused = await mcp("update_task", { task_id: "autobyteus-9", status: "DONE" });
    expect(refused.content).toEqual([{ type: "text", text: '{"error":{"code":"TASK_NOT_FOUND","message":"Task \'autobyteus-9\' must identify exactly one current node-local Task (found 0)."}}' }]);
  });
});
