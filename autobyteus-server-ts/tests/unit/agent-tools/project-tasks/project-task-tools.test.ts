import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { getProjectService, resetProjectServiceForTests } from "../../../../src/projects/services/project-service.js";
import { resetProjectTaskServiceForTests } from "../../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../../src/projects/context/project-task-context-store.js";
import { ListProjectsTool, ListProjectTasksTool, CreateOrUpdateTaskTool, registerProjectTaskTools } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveClaudeSessionToolingOptions } from "../../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { resolveAutoByteusExecutionToolNames } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.js";
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
    await fs.rm(root, {recursive: true, force: true});
    appConfigProvider.resetForTests(); resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests();
  });
  it("shares business reads and compact TODO create/known-ID status acknowledgements", async () => {
    const catalog = JSON.parse(await new ListProjectsTool().execute(null));
    expect((await mcp("list_projects", {})).structuredContent).toEqual(catalog);
    expect(catalog.projects).toEqual([{projectId, name: "Tools fixture", description: ""}]);
    const created = JSON.parse(await new CreateOrUpdateTaskTool().execute(null, {project_id: projectId, description: " hello "}));
    expect(created.task).toEqual({projectId, taskId: expect.any(String), status: "TODO"});
    const patched = await mcp("create_or_update_task", {project_id: projectId, task_id: created.task.taskId, status: "DONE"});
    expect(patched.structuredContent).toMatchObject({task: {...created.task, status: "DONE"}});
    const listed = JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId, status: "DONE"}));
    expect((await mcp("list_project_tasks", {project_id: projectId, status: "DONE"})).structuredContent).toEqual(listed);
    expect(listed.tasks).toEqual([{...patched.structuredContent!.task, description: "hello", contextFiles: [], assignments: []}]);
    expect((await mcp("list_project_tasks", {project_id: projectId, status: "TODO"})).structuredContent).toEqual({projectId, tasks: []});
  });
  it.each([
    ["list_projects", {extra: true}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: 12}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["list_project_tasks", {project_id: "p", status: "todo"}, "TASK_STATUS_INVALID"],
    ["create_or_update_task", {project_id: "p", task_id: null, description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {project_id: "p", task_id: "", description: "x"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
    ["create_or_update_task", {project_id: "p", description: ""}, "TASK_DESCRIPTION_REQUIRED"],
    ["create_or_update_task", {project_id: "p", description: "x", status: "TODO"}, "TASK_CREATE_STATUS_UNSUPPORTED"],
    ["create_or_update_task", {project_id: "p", task_id: "t"}, "TASK_PATCH_REQUIRED"],
  ])("preserves domain errors before BaseTool coercion for %s", async (name, raw, code) => {
    const tool = name === "list_projects" ? new ListProjectsTool() : name === "list_project_tasks" ? new ListProjectTasksTool() : new CreateOrUpdateTaskTool();
    const thrown = await tool.execute(null, raw).then(() => null, (e) => JSON.parse(e.message));
    const result = await mcp(name, raw);
    expect(thrown).toMatchObject({error: {code}});
    expect(result.structuredContent).toEqual(thrown); expect(result.isError).toBe(true);
  });
  it("unknown Task IDs fail without creating and aborted native execution stays a transport error", async () => {
    const args = {project_id: projectId, task_id: "missing", description: "No upsert"};
    const error = await new CreateOrUpdateTaskTool().execute(null, args).catch((e) => JSON.parse(e.message));
    expect(error.error.code).toBe("TASK_NOT_FOUND");
    expect((await mcp("create_or_update_task", args)).structuredContent).toEqual(error);
    expect(JSON.parse(await new ListProjectTasksTool().execute(null, {project_id: projectId})).tasks).toEqual([]);
    await expect(new ListProjectsTool().execute(null, {}, {signal: AbortSignal.abort()})).rejects.toThrow("aborted before start");
  });
  it("exposes exactly explicit selections to catalog/Claude/native members, never legacy task aliases", () => {
    const catalog = new AgentToolMcpCatalog({providers: [provider]});
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure([]))).toEqual([]);
    const exposure = buildRuntimeAgentToolExposure(["list_projects", "list_project_tasks", "create_or_update_task"]);
    expect(exposure.enabledProjectTaskToolNames).toEqual(exposure.requestedToolNames);
    expect(catalog.resolveConfiguredSupportedToolNames(exposure)).toEqual(exposure.requestedToolNames);
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure(["list_projects"]))).toEqual(["list_projects"]);
    expect(resolveClaudeSessionToolingOptions({runtimeToolExposure: exposure, memberExecutionContext: null, hasMaterializedSkills: false}).agentToolsMcpEnabledToolNames).toEqual(exposure.requestedToolNames);
    expect(resolveAutoByteusExecutionToolNames({toolNames: [...exposure.requestedToolNames, "create_task", "update_task_status"], memberExecutionContext: {} as never})).toEqual(exposure.requestedToolNames);
  });
});
