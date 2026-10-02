import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import http from "node:http";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import path from "node:path";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { ListProjectsTool, ListProjectTasksTool, CreateOrUpdateTaskTool } from "../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { registerProjectTaskTools } from "../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";

// Real Studio HTTP, default MCP host/provider/session authority, native public execute and
// test-owned files. No Project adapter/service/auth/multipart doubles. The unused publication
// capability is supplied because a real run scope requires it; it must never be called here.
// No model request, Manager package or interactive same-window node switching is represented.
const names = ["list_projects", "list_project_tasks", "create_or_update_task"];
const FILES = "storedFilename displayName mimeType sizeBytes locator";
const TASK = `taskId projectId description status createdAt updatedAt contextFiles { ${FILES} }`;
type FileRef = { storedFilename: string; displayName: string; mimeType: string; sizeBytes: number; locator: string };
type Task = { taskId: string; projectId: string; description: string; status: string; createdAt: string; updatedAt: string; contextFiles: FileRef[] };
const reset = () => { resetProjectTaskServiceForTests(); resetProjectServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };

describe("Project Task production HTTP boundaries", () => {
  let root: string, origin: string, mcpUrl: string, app: FastifyInstance;
  let authority: ScopedAgentToolMcpSessionAuthority;
  let flags: Record<string, string>, originalTemp: string | undefined;
  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data: T; errors?: unknown[] };
    expect(response.status).toBe(200); expect(body.errors).toBeUndefined(); return body.data;
  };
  const rpc = async (url: string, method: string, params: unknown = {}, headers: Record<string, string> = {}) => {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json", ...headers }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    return { status: response.status, body: await response.json() };
  };
  const call = async (name: string, args: unknown) => {
    const r = await rpc(mcpUrl, "tools/call", { name, arguments: args });
    expect(r.status).toBe(200); expect(r.body.error).toBeUndefined(); return r.body.result;
  };
  const createProject = async (name: string) => (await gql<{ createProject: { projectId: string } }>(
    "mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name } })).createProject.projectId;
  const list = async (projectId: string) => (await gql<{ projectTasks: Task[] }>(
    `query($id:String!){projectTasks(projectId:$id){${TASK}}}`, { id: projectId })).projectTasks;
  const draft = async (projectId: string, taskId?: string) => {
    const response = await fetch(`${origin}/rest/projects/${projectId}/task-context-drafts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(taskId ? { taskId } : {}) });
    expect(response.status).toBe(200); return await response.json() as { draftId: string };
  };
  const upload = async (projectId: string, draftId: string, bytes: string, mime = "text/plain", filename = "note.txt") => {
    const data = new FormData(); data.set("file", new Blob([bytes], { type: mime }), filename);
    return fetch(`${origin}/rest/projects/${projectId}/task-context-drafts/${draftId}/context-files`, { method: "POST", body: data });
  };
  beforeAll(async () => {
    flags = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => k.startsWith("ENABLE_") && v !== undefined)) as Record<string, string>;
    for (const key of Object.keys(flags)) delete process.env[key];
    originalTemp = process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-http-e2e-"));
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = path.join(root, "temp_workspace");
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    appConfigProvider.resetForTests(); appConfigProvider.config.setCustomAppDataDir(root); reset();
    registerProjectTaskTools();
    const started = await startStudioE2eRuntimeServer(); app = started.fastify; origin = started.mainUrl.origin;
    authority = started.agentToolsMcpHost.sessionAuthorities.begin({ scopeIdentity: "project-task-http-test" }).complete({
      executionCapabilities: { publishedArtifactPublisher: { publishManyForRun: async () => { throw new Error("Unexpected publication"); } }, applicationAgentTools: null },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const activate = (runId: string, selected: string[]) => authority.runSessions.activateForRun({ owner: { runId }, sender: buildAgentRunMessageSenderContext({ senderRunId: runId, senderName: runId }), runtimeExposure: buildRuntimeAgentToolExposure(selected) });
    expect(activate("unselected", []).kind).toBe("not_exposed");
    const selected = activate("selected", names); expect(selected.kind).toBe("active");
    if (selected.kind !== "active") throw new Error("Selected session absent"); mcpUrl = selected.descriptor.serverUrl;
    expect(selected.descriptor.enabledTools).toEqual(names);
    const one = activate("read-only", ["list_projects"]);
    if (one.kind !== "active") throw new Error("Read-only session absent");
    const listed = await rpc(one.descriptor.serverUrl, "tools/list");
    expect(listed.body.result.tools.map((t: { name: string }) => t.name)).toEqual(["list_projects"]);
    expect((await rpc(one.descriptor.serverUrl, "tools/call", { name: "create_or_update_task", arguments: {} })).body.error).toBeDefined();
    authority.runSessions.deactivateForRun("read-only");
    expect((await rpc(one.descriptor.serverUrl, "ping")).status).toBe(404);
  }, 120000);
  afterAll(async () => {
    authority?.close(); if (app) await app.close(); reset(); appConfigProvider.resetForTests();
    if (originalTemp === undefined) delete process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR; else process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = originalTemp;
    for (const key of Object.keys(process.env)) if (key.startsWith("ENABLE_")) delete process.env[key]; Object.assign(process.env, flags);
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 30000);

  it("API-MCP: selected default host executes equivalent raw native contracts while UI remains off", async () => {
    expect((await gql<{ projectsCapability: { enabled: boolean } }>("{projectsCapability{enabled}}" )).projectsCapability.enabled).toBe(false);
    expect((await call("list_projects", {})).structuredContent).toEqual({ projects: [] });
    const projectId = await createProject("HTTP parity");
    const catalog = await call("list_projects", {});
    expect(catalog.structuredContent).toEqual(JSON.parse(await new ListProjectsTool().execute(null, {})));
    expect((await rpc(mcpUrl, "initialize")).body.result.serverInfo.name).toBe("autobyteus_agent_tools");
    expect((await rpc(mcpUrl, "tools/list")).body.result.tools.map((t: { name: string }) => t.name)).toEqual(names);
    const created = (await call("create_or_update_task", { project_id: projectId, description: "  hello HTTP  " })).structuredContent.task as Task;
    expect(created).toMatchObject({ description: "hello HTTP", status: "TODO", contextFiles: [] });
    for (const status of ["IN_PROGRESS", "DONE", "TODO"]) await call("create_or_update_task", { project_id: projectId, task_id: created.taskId, status });
    const nativeList = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    expect((await call("list_project_tasks", { project_id: projectId })).structuredContent).toEqual(nativeList);
    expect((await call("list_project_tasks", { project_id: projectId, status: "DONE" })).structuredContent.tasks).toEqual([]);
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["list_projects", { extra: true }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["list_project_tasks", { project_id: 12 }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["list_project_tasks", { project_id: projectId, status: "todo" }, "TASK_STATUS_INVALID"],
      ["list_project_tasks", { project_id: "missing" }, "PROJECT_NOT_FOUND"],
      ["create_or_update_task", { project_id: projectId, task_id: null, description: "x" }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["create_or_update_task", { project_id: projectId, task_id: "", description: "x" }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["create_or_update_task", { project_id: projectId, description: " " }, "TASK_DESCRIPTION_REQUIRED"],
      ["create_or_update_task", { project_id: projectId, description: "x", status: "TODO" }, "TASK_CREATE_STATUS_UNSUPPORTED"],
      ["create_or_update_task", { project_id: projectId, task_id: created.taskId }, "TASK_PATCH_REQUIRED"],
      ["create_or_update_task", { project_id: projectId, task_id: "unknown", description: "no upsert" }, "TASK_NOT_FOUND"],
    ];
    for (const [name, args, code] of cases) {
      const tool = name === "list_projects" ? new ListProjectsTool() : name === "list_project_tasks" ? new ListProjectTasksTool() : new CreateOrUpdateTaskTool();
      const native = await tool.execute(null, args).then(() => null, (e: Error) => JSON.parse(e.message));
      expect(native.error.code).toBe(code); const result = await call(name, args);
      expect(result.isError).toBe(true); expect(result.structuredContent).toEqual(native);
    }
    expect(await list(projectId)).toHaveLength(1);
    expect((await rpc(mcpUrl, "ping", {}, { origin: "https://untrusted.example" })).status).toBe(403);
    const invalidHostStatus = await new Promise<number>((resolve, reject) => {
      const request = http.request(mcpUrl, { method: "POST", headers: { host: "untrusted.example", "content-type": "application/json", accept: "application/json" } }, response => {
        response.resume(); response.on("end", () => resolve(response.statusCode!));
      });
      request.on("error", reject); request.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }));
    });
    expect(invalidHostStatus).toBe(403);
    expect((await gql<{ projectsCapability: { enabled: boolean } }>("{projectsCapability{enabled}}" )).projectsCapability.enabled).toBe(false);
  });

  it("API-FILES: multipart bytes, saved ownership, typed deltas and Done survive reader reconstruction", async () => {
    const projectId = await createProject("HTTP files"), otherId = await createProject("Other owner");
    const original = path.join(root, "original.txt"); await fs.writeFile(original, "original workspace bytes");
    const d = await draft(projectId); const added = await upload(projectId, d.draftId, await fs.readFile(original, "utf8"));
    expect(added.status).toBe(200); const file = await added.json() as FileRef;
    expect(file).toMatchObject({ displayName: "note.txt", mimeType: "text/plain", sizeBytes: 24 });
    expect(await (await fetch(`${origin}/rest/projects/${projectId}/task-context-drafts/${d.draftId}/context-files/${file.storedFilename}`)).text()).toBe("original workspace bytes");
    const task = (await gql<{ createProjectTask: Task }>(`mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){${TASK}}}`, { i: { projectId, description: "Durable HTTP", contextDraft: { draftId: d.draftId, storedFilenames: [file.storedFilename] } } })).createProjectTask;
    const saved = task.contextFiles[0]!; expect(saved.storedFilename).not.toBe(file.storedFilename);
    const read = await fetch(`${origin}${saved.locator}`); expect(read.status).toBe(200);
    expect(read.headers.get("x-content-type-options")).toBe("nosniff"); expect(read.headers.get("content-disposition")).toContain("attachment"); expect(await read.text()).toBe("original workspace bytes");
    expect((await fetch(`${origin}${saved.locator}`, { headers: { authorization: "Bearer mra_invalid" } })).status).toBe(401);
    expect((await fetch(`${origin}${saved.locator.replace(projectId, otherId)}`)).status).toBe(404);
    const sibling = (await call("create_or_update_task", { project_id: projectId, description: "sibling" })).structuredContent.task as Task;
    expect((await fetch(`${origin}${saved.locator.replace(task.taskId, sibling.taskId)}`)).status).toBe(404);
    await call("create_or_update_task", { project_id: projectId, task_id: task.taskId, status: "DONE" });
    reset(); expect((await list(projectId)).find(t => t.taskId === task.taskId)).toMatchObject({ status: "DONE", contextFiles: [saved] });
    const projected = (await call("list_project_tasks", { project_id: projectId, status: "DONE" })).structuredContent.tasks[0];
    expect(await fs.readFile(projected.contextFiles[0].localPath, "utf8")).toBe("original workspace bytes");
    const cancel = await draft(projectId, task.taskId); await upload(projectId, cancel.draftId, "cancelled");
    expect((await fetch(`${origin}/rest/projects/${projectId}/task-context-drafts/${cancel.draftId}`, { method: "DELETE" })).status).toBe(204);
    expect(await (await fetch(`${origin}${saved.locator}`)).text()).toBe("original workspace bytes");
    const edit = await draft(projectId, task.taskId); const newFile = await (await upload(projectId, edit.draftId, "replacement")).json() as FileRef;
    const updated = (await gql<{ updateProjectTask: Task }>(`mutation($i:UpdateProjectTaskInput!){updateProjectTask(input:$i){${TASK}}}`, { i: { projectId, taskId: task.taskId, description: "edited", contextChanges: { draftId: edit.draftId, addStoredFilenames: [newFile.storedFilename], removeStoredFilenames: [saved.storedFilename] } } })).updateProjectTask;
    expect(updated).toMatchObject({ taskId: task.taskId, status: "DONE", createdAt: task.createdAt });
    expect((await fetch(`${origin}${saved.locator}`)).status).toBe(404);
    await expect(fs.stat(projected.contextFiles[0].localPath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await (await fetch(`${origin}${updated.contextFiles[0]!.locator}`)).text()).toBe("replacement");
    const replacementPath = (await call("list_project_tasks", { project_id: projectId, status: "DONE" })).structuredContent.tasks[0].contextFiles[0].localPath;
    const rejected = await draft(projectId); expect((await upload(projectId, rejected.draftId, "bad", "application/x-executable", "bad.exe")).status).toBe(400);
    const oversized = await upload(projectId, rejected.draftId, "x".repeat(25 * 1024 * 1024 + 1)); expect(oversized.ok).toBe(false);
    expect(await list(projectId)).toHaveLength(2);
    await gql("mutation($i:DeleteProjectTaskInput!){deleteProjectTask(input:$i)}", { i: { projectId, taskId: task.taskId } });
    expect((await fetch(`${origin}${updated.contextFiles[0]!.locator}`)).status).toBe(404);
    await expect(fs.stat(replacementPath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(original, "utf8")).toBe("original workspace bytes");
  }, 30000);
  it("API-MCP collision: selected protected Project adapter wins over a configured MCP name", async () => {
    const original = defaultToolRegistry.getToolDefinition("list_projects")!;
    const collision = new ToolDefinition("list_projects", "Configured same-name tool", ToolOrigin.MCP, "MCP",
      () => new ParameterSchema(), () => null, { metadata: { mcp_server_id: "collision-fixture" },
        customFactory: () => { throw new Error("Colliding remote tool must not be invoked"); } });
    defaultToolRegistry.registerTool(collision);
    try {
      const selected = authority.runSessions.activateForRun({ owner: { runId: "collision" },
        sender: buildAgentRunMessageSenderContext({ senderRunId: "collision", senderName: "collision" }),
        runtimeExposure: buildRuntimeAgentToolExposure(["list_projects"]) });
      expect(selected.kind).toBe("active"); if (selected.kind !== "active") throw new Error("Missing collision session");
      const result = await rpc(selected.descriptor.serverUrl, "tools/call", { name: "list_projects", arguments: {} });
      expect(result.body.result.structuredContent.projects).toEqual(JSON.parse(await new ListProjectsTool().execute(null)).projects);
      authority.runSessions.deactivateForRun("collision");
    } finally { defaultToolRegistry.registerTool(original); }
  });

  it("API-AGG: public registration is not mkdir; failed aggregate save preserves registry and prior records", async () => {
    const missingPath = path.join(root, "not-created-folder");
    const registered = (await gql<{ createWorkspace: { workspaceId: string; workspaceRootPath: string } }>(
      "mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId workspaceRootPath}}", { i: { rootPath: `${missingPath}/../not-created-folder` } })).createWorkspace;
    expect(registered.workspaceRootPath).toBe(missingPath); await expect(fs.stat(missingPath)).rejects.toMatchObject({ code: "ENOENT" });
    const projectId = await createProject("Aggregate existing");
    const task = (await call("create_or_update_task", { project_id: projectId, description: "Done still counts" })).structuredContent.task as Task;
    await call("create_or_update_task", { project_id: projectId, task_id: task.taskId, status: "DONE" });
    const fields = "projectId name taskCount openTaskCount workspaces { workspaceId workspaceRootPath description addedAt availability }";
    const updated = await gql<{ updateProject: { taskCount: number; openTaskCount: number; workspaces: Array<{ addedAt: string }> } }>(
      `mutation($i:UpdateProjectInput!){updateProject(input:$i){${fields}}}`, { i: { projectId, name: "Aggregate existing", description: "saved", workspaces: [{ workspaceId: registered.workspaceId, description: "normalized registration" }] } });
    expect(updated.updateProject).toMatchObject({ taskCount: 1, openTaskCount: 0 });
    const before = await fs.readFile(path.join(root, "projects", "projects.json"), "utf8");
    const failure = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      query: "mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", variables: { i: { name: "AGGREGATE EXISTING", workspaces: [{ workspaceId: registered.workspaceId }] } } }) });
    expect((await failure.json()).errors[0].extensions.code).toBe("PROJECT_NAME_TAKEN");
    expect(await fs.readFile(path.join(root, "projects", "projects.json"), "utf8")).toBe(before);
    expect(await fs.readFile(path.join(root, "workspaces.json"), "utf8")).toContain(registered.workspaceId);
    await gql("mutation($i:RemoveWorkspaceInput!){removeWorkspace(input:$i){success}}", { i: { workspaceId: registered.workspaceId } });
    const reread = await gql<{ updateProject: { workspaces: Array<{ addedAt: string }> } }>(
      `mutation($i:UpdateProjectInput!){updateProject(input:$i){${fields}}}`, { i: { projectId, name: "Aggregate renamed", description: "saved", workspaces: [{ workspaceId: registered.workspaceId, description: "retained unregistered" }] } });
    expect(reread.updateProject.workspaces[0]).toMatchObject({ workspaceRootPath: missingPath, availability: "UNREGISTERED", addedAt: updated.updateProject.workspaces[0]!.addedAt });
    expect(await list(projectId)).toHaveLength(1);
    await gql("mutation($id:String!){deleteProject(projectId:$id)}", { id: projectId });
    await expect(fs.stat(missingPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

});
