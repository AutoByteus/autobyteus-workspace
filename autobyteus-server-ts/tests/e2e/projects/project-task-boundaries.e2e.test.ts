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
import { ListProjectsTool, ListProjectTasksTool, CreateProjectTool, UpdateProjectTool, CreateTaskTool, UpdateTaskTool } from "../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { registerProjectTaskTools } from "../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";

// Real Studio HTTP, default MCP host/provider/session authority, native public execute and
// test-owned files. No Project adapter/service/auth/multipart doubles. The unused publication
// capability is supplied because a real run scope requires it; it must never be called here.
// No model request, Manager package or interactive same-window node switching is represented.
// A Project mutation call goes to update_project when project_id is present, otherwise to create_project.
const names = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
const projectTool = (args: unknown) => typeof args === "object" && args !== null && Object.hasOwn(args, "project_id") ? "update_project" : "create_project";
const FILES = "storedFilename displayName mimeType sizeBytes locator";
const TASK = `taskId projectId description status createdAt updatedAt contextFiles { ${FILES} }`;
type FileRef = { storedFilename: string; displayName: string; mimeType: string; sizeBytes: number; locator: string };
type Task = { taskId: string; projectId: string; description: string; status: string; createdAt: string; updatedAt: string; contextFiles: FileRef[] };
const PROJECT = "projectId name description createdAt updatedAt taskCount openTaskCount workspaces { workspaceRootPath description availability }";
type Link = { workspaceRootPath: string; description: string; availability: string };
type Project = { projectId: string; name: string; description: string; createdAt: string; updatedAt: string; workspaces: Link[]; taskCount: number; openTaskCount: number };
// Snapshot content AND directory entries; detect deletions, rewrites and unexpected additions.
const snapshot = async (directory: string): Promise<Record<string, string>> => {
  const entries: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(error => {
      if (error.code === "ENOENT") return []; throw error;
    })) {
      const full = path.join(dir, entry.name), relative = path.relative(directory, full);
      if (entry.isDirectory()) { entries[relative + "/"] = "directory"; await walk(full); }
      else entries[relative] = (await fs.readFile(full)).toString("base64");
    }
  };
  await walk(directory); return entries;
};
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
  /** The stored long ID behind a Task reference a tool returned (tool results name Project Tasks by key). */
  const idOf = async (projectId: string, reference: string) => (await gql<{ projectTasks: Array<{ taskId: string; taskKey: string }> }>(
    "query($id:String!){projectTasks(projectId:$id){taskId taskKey}}", { id: projectId })).projectTasks.find(t => t.taskId === reference || t.taskKey === reference)!.taskId;
  const readProject = async (projectId: string) => (await gql<{ project: Project }>(
    `query($id:String!){project(projectId:$id){${PROJECT}}}`, { id: projectId })).project;
  const registerWorkspace = async (folder: string) => {
    const rootPath = path.join(root, folder); await fs.mkdir(rootPath);
    await fs.writeFile(path.join(rootPath, "source.txt"), `untouched ${folder} bytes`);
    return (await gql<{ createWorkspace: { workspaceId: string; workspaceRootPath: string } }>(
      "mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId workspaceRootPath}}", { i: { rootPath } })).createWorkspace;
  };
  const projectCall = async (args: Record<string, unknown>) => {
    const result = await call(projectTool(args), args);
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
    return result.structuredContent.project as Pick<Project, "projectId" | "name" | "description"> & { workspaces: Array<Pick<Link, "workspaceRootPath" | "description">> };
  };
  /** The tool the args belong to rejects them natively and over MCP with the same error. */
  const expectProjectError = async (args: Record<string, unknown>, code: string) => {
    const before = await snapshot(path.join(root, "projects"));
    const name = projectTool(args);
    const native = await new (name === "update_project" ? UpdateProjectTool : CreateProjectTool)().execute(null, args).then(
      () => { throw new Error("Expected native rejection"); }, (error: Error) => JSON.parse(error.message));
    expect(native.error.code).toBe(code); expect(native.error.message).not.toBe("");
    const result = await call(name, args);
    expect(result.isError).toBe(true); expect(result.structuredContent).toEqual(native);
    expect(JSON.parse(result.content[0].text)).toEqual(native);
    expect(await snapshot(path.join(root, "projects"))).toEqual(before);
  };
  const draft = async (projectId: string, taskId?: string) => {
    const response = await fetch(`${origin}/rest/projects/${projectId}/task-context-drafts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(taskId ? { taskId } : {}) });
    expect(response.status).toBe(200); return await response.json() as { draftId: string };
  };
  const upload = async (projectId: string, draftId: string, bytes: string, mime = "text/plain", filename = "note.txt") => {
    const data = new FormData(); data.set("file", new Blob([bytes], { type: mime }), filename);
    return fetch(`${origin}/rest/projects/${projectId}/task-context-drafts/${draftId}/context-files`, { method: "POST", body: data });
  };
  beforeAll(async () => {
    flags = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => (k.startsWith("ENABLE_") || k.startsWith("AUTOBYTEUS_")) && v !== undefined)) as Record<string, string>;
    for (const key of Object.keys(flags)) delete process.env[key];
    originalTemp = flags.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
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
    // task-tool-split AC-007: a configuration that still lists the removed name gets no task tool and no launch error.
    expect(activate("legacy-task-tool-name", ["create_or_update_task"]).kind).toBe("not_exposed");
    const selected = activate("selected", names); expect(selected.kind).toBe("active");
    if (selected.kind !== "active") throw new Error("Selected session absent"); mcpUrl = selected.descriptor.serverUrl;
    expect(selected.descriptor.enabledTools).toEqual(names);
    const one = activate("read-only", ["list_projects"]);
    if (one.kind !== "active") throw new Error("Read-only session absent");
    const listed = await rpc(one.descriptor.serverUrl, "tools/list");
    expect(listed.body.result.tools.map((t: { name: string }) => t.name)).toEqual(["list_projects"]);
    for (const name of ["create_task", "update_task"]) {
      expect((await rpc(one.descriptor.serverUrl, "tools/call", { name, arguments: {} })).body.error).toBeDefined();
    }
    for (const [name, args] of [["create_project", { name: "Unauthorized" }], ["update_project", { project_id: "p", name: "Unauthorized" }]] as const) {
      expect((await rpc(one.descriptor.serverUrl, "tools/call", { name, arguments: args })).body.error).toBeDefined();
    }
    const listedTools = (await rpc(mcpUrl, "tools/list")).body.result.tools as Array<{ name: string; inputSchema: { properties: Record<string, any>; required?: string[] } }>;
    for (const name of ["create_project", "update_project"]) {
      expect(listedTools.find(t => t.name === name)!.inputSchema.properties.workspaces.items.properties.workspace_path.type).toBe("string");
    }
    expect(listedTools.find(t => t.name === "create_project")!.inputSchema.required).toEqual(["name"]);
    expect(listedTools.find(t => t.name === "update_project")!.inputSchema.required).toEqual(["project_id"]);
    authority.runSessions.deactivateForRun("read-only");
    expect((await rpc(one.descriptor.serverUrl, "ping")).status).toBe(404);
  }, 120000);
  afterAll(async () => {
    authority?.close(); if (app) await app.close(); reset(); appConfigProvider.resetForTests();
    if (originalTemp === undefined) delete process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR; else process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = originalTemp;
    for (const key of Object.keys(process.env)) if (key.startsWith("ENABLE_") || key.startsWith("AUTOBYTEUS_")) delete process.env[key]; Object.assign(process.env, flags);
    if (origin) await expect(fetch(origin, {signal: AbortSignal.timeout(1500)})).rejects.toThrow();
    if (mcpUrl) await expect(fetch(mcpUrl, {signal: AbortSignal.timeout(1500)})).rejects.toThrow();
    if (root) { await fs.rm(root, { recursive: true, force: true }); await expect(fs.stat(root)).rejects.toMatchObject({code: "ENOENT"}); }
    console.info("Owned HTTP fixture cleanup: Studio/MCP listeners closed, data directory removed.");
  }, 30000);

  it("API-MCP: selected default host executes equivalent compact mutations and detailed native reads", async () => {
    expect((await call("list_projects", {})).structuredContent).toEqual({ projects: [] });
    const projectId = await createProject("HTTP parity");
    const catalog = await call("list_projects", {});
    expect(catalog.structuredContent).toEqual(JSON.parse(await new ListProjectsTool().execute(null, {})));
    expect((await rpc(mcpUrl, "initialize")).body.result.serverInfo.name).toBe("autobyteus_agent_tools");
    expect((await rpc(mcpUrl, "tools/list")).body.result.tools.map((t: { name: string }) => t.name)).toEqual(names);
    expect((await rpc(mcpUrl, "tools/call", { name: "create_or_update_task", arguments: { project_id: projectId, description: "old name" } })).body.error).toBeDefined();
    expect(await list(projectId)).toEqual([]);
    const created = (await call("create_task", { project_id: projectId, description: "  hello HTTP  " })).structuredContent.task;
    // A Project Task's agent-facing taskId is its key.
    expect(created).toEqual({ projectId, taskId: "http-parity-1", status: "TODO", dependsOn: [], partOf: null });
    expect(await list(projectId)).toEqual([expect.objectContaining({
      projectId, taskId: await idOf(projectId, created.taskId), description: "hello HTTP", status: "TODO", contextFiles: [],
    })]);
    for (const status of ["IN_PROGRESS", "DONE", "TODO"]) {
      const input = { task_id: created.taskId, status };
      const patched = (await call("update_task", input)).structuredContent;
      expect(patched).toEqual({ task: { projectId, taskId: created.taskId, status, dependsOn: [], partOf: null } });
      expect(JSON.parse(await new UpdateTaskTool().execute(null, input))).toEqual(patched);
    }
    const nativeList = JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId }));
    expect((await call("list_project_tasks", { project_id: projectId })).structuredContent).toEqual(nativeList);
    expect((await call("list_project_tasks", { project_id: projectId, status: "DONE" })).structuredContent.tasks).toEqual([]);
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["list_projects", { extra: true }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["list_project_tasks", { project_id: 12 }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["list_project_tasks", { project_id: projectId, status: "todo" }, "TASK_STATUS_INVALID"],
      ["list_project_tasks", { project_id: "missing" }, "PROJECT_NOT_FOUND"],
      ["update_task", { task_id: null, description: "x" }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["update_task", { task_id: "", description: "x" }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["update_task", { project_id: projectId, task_id: created.taskId, status: "DONE" }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["create_task", { project_id: projectId, task_id: created.taskId, description: "x" }, "PROJECT_TOOL_ARGUMENT_INVALID"],
      ["create_task", { project_id: projectId, description: " " }, "TASK_DESCRIPTION_REQUIRED"],
      ["create_task", { project_id: projectId, description: "x", status: "TODO" }, "TASK_CREATE_STATUS_UNSUPPORTED"],
      ["update_task", { task_id: created.taskId }, "TASK_PATCH_REQUIRED"],
      ["update_task", { task_id: "unknown", description: "no upsert" }, "TASK_NOT_FOUND"],
    ];
    for (const [name, args, code] of cases) {
      const tool = name === "list_projects" ? new ListProjectsTool() : name === "list_project_tasks" ? new ListProjectTasksTool() : name === "create_task" ? new CreateTaskTool() : new UpdateTaskTool();
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
    const sibling = (await call("create_task", { project_id: projectId, description: "sibling" })).structuredContent.task as Task;
    expect((await fetch(`${origin}${saved.locator.replace(task.taskId, sibling.taskId)}`)).status).toBe(404);
    await call("update_task", { task_id: task.taskId, status: "DONE" });
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
  it.each(["list_projects", "create_project", "update_project"])("API-MCP collision: selected protected %s adapter wins over a configured MCP name", async (name) => {
    const target = name === "update_project" ? await createProject("Collision target") : undefined;
    const original = defaultToolRegistry.getToolDefinition(name)!;
    const collision = new ToolDefinition(name, "Configured same-name tool", ToolOrigin.MCP, "MCP",
      () => new ParameterSchema(), () => null, { metadata: { mcp_server_id: "collision-fixture" },
        customFactory: () => { throw new Error("Colliding remote tool must not be invoked"); } });
    defaultToolRegistry.registerTool(collision);
    try {
      const selected = authority.runSessions.activateForRun({ owner: { runId: "collision" },
        sender: buildAgentRunMessageSenderContext({ senderRunId: "collision", senderName: "collision" }),
        runtimeExposure: buildRuntimeAgentToolExposure([name]) });
      expect(selected.kind).toBe("active"); if (selected.kind !== "active") throw new Error("Missing collision session");
      expect(selected.descriptor.enabledTools).toEqual([name]);
      const listed = await rpc(selected.descriptor.serverUrl, "tools/list");
      expect(listed.body.result.tools.map((t: {name: string}) => t.name)).toEqual([name]);
      const args = name === "list_projects" ? {} : {...(target ? {project_id: target} : {}), name: `Protected mutation ${name}`};
      const result = await rpc(selected.descriptor.serverUrl, "tools/call", { name, arguments: args });
      expect(result.body.error).toBeUndefined(); expect(result.body.result.isError).not.toBe(true);
      if (name === "list_projects") expect(result.body.result.structuredContent.projects).toEqual(JSON.parse(await new ListProjectsTool().execute(null)).projects);
      else expect(await readProject(result.body.result.structuredContent.project.projectId)).toMatchObject({...(target ? {projectId: target} : {}), name: `Protected mutation ${name}`, description: "", workspaces: []});
      authority.runSessions.deactivateForRun("collision");
    } finally { defaultToolRegistry.registerTool(original); }
  });

  it("API-AGG: public registration is not mkdir; failed aggregate save preserves registry and prior records", async () => {
    const missingPath = path.join(root, "not-created-folder");
    const registered = (await gql<{ createWorkspace: { workspaceId: string; workspaceRootPath: string } }>(
      "mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId workspaceRootPath}}", { i: { rootPath: `${missingPath}/../not-created-folder` } })).createWorkspace;
    expect(registered.workspaceRootPath).toBe(missingPath); await expect(fs.stat(missingPath)).rejects.toMatchObject({ code: "ENOENT" });
    const projectId = await createProject("Aggregate existing");
    const task = (await call("create_task", { project_id: projectId, description: "Done still counts" })).structuredContent.task as Task;
    await call("update_task", { task_id: task.taskId, status: "DONE" });
    const fields = "projectId name taskCount openTaskCount workspaces { workspaceRootPath description availability }";
    const updated = await gql<{ updateProject: { taskCount: number; openTaskCount: number; workspaces: Link[] } }>(
      `mutation($i:UpdateProjectInput!){updateProject(input:$i){${fields}}}`, { i: { projectId, name: "Aggregate existing", description: "saved", workspaces: [{ workspaceRootPath: registered.workspaceRootPath, description: "normalized registration" }] } });
    expect(updated.updateProject).toMatchObject({ taskCount: 1, openTaskCount: 0 });
    const projectsDir = path.join(root, "projects");
    const projectFiles = async () => (await fs.readdir(projectsDir)).sort();
    const before = { entries: await projectFiles(), project: await fs.readFile(path.join(projectsDir, projectId, "project.json"), "utf8") };
    const failure = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      query: "mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", variables: { i: { name: "AGGREGATE EXISTING", workspaces: [{ workspaceRootPath: registered.workspaceRootPath }] } } }) });
    expect((await failure.json()).errors[0].extensions.code).toBe("PROJECT_NAME_TAKEN");
    expect({ entries: await projectFiles(), project: await fs.readFile(path.join(projectsDir, projectId, "project.json"), "utf8") }).toEqual(before);
    expect(await fs.readFile(path.join(root, "workspaces.json"), "utf8")).toContain(registered.workspaceId);
    await gql("mutation($i:RemoveWorkspaceInput!){removeWorkspace(input:$i){success}}", { i: { workspaceId: registered.workspaceId } });
    const reread = await gql<{ updateProject: { workspaces: Link[] } }>(
      `mutation($i:UpdateProjectInput!){updateProject(input:$i){${fields}}}`, { i: { projectId, name: "Aggregate renamed", description: "saved", workspaces: [{ workspaceRootPath: registered.workspaceRootPath, description: "retained unregistered" }] } });
    expect(reread.updateProject.workspaces[0]).toMatchObject({ workspaceRootPath: missingPath, availability: "UNREGISTERED" });
    expect(await list(projectId)).toHaveLength(1);
    await gql("mutation($id:String!){deleteProject(projectId:$id)}", { id: projectId });
    await expect(fs.stat(missingPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("E-005: selected HTTP and native Project create/patch save defaults and reject invalid input atomically", async () => {
    const created = await projectCall({name: "  Agent authored  ", description: "  Saved goal  "});
    expect(created).toEqual({projectId: expect.stringMatching(/^project_/), name: "Agent authored", description: "Saved goal", workspaces: []});
    const initial = await readProject(created.projectId);
    expect(initial).toMatchObject({...created, taskCount: 0, openTaskCount: 0});
    expect(Number.isFinite(Date.parse(initial.createdAt))).toBe(true);
    const nativeCreated = JSON.parse(await new CreateProjectTool().execute(null, {name: " Native authored "})).project;
    expect(nativeCreated).toEqual({projectId: expect.stringMatching(/^project_/), name: "Native authored", description: "", workspaces: []});
    expect(await readProject(nativeCreated.projectId)).toMatchObject(nativeCreated);
    const defaults = await projectCall({name: "HTTP defaults"});
    expect(defaults).toMatchObject({description: "", workspaces: []});
    const summary = (await call("list_projects", {})).structuredContent;
    expect(summary).toEqual(JSON.parse(await new ListProjectsTool().execute(null, {})));
    expect(summary.projects).toContainEqual({projectId: created.projectId, name: created.name, description: created.description});
    for (const patch of [{name: "Renamed authored"}, {description: "New goal"}, {description: "   "}, {name: "Combined authored", description: "Combined goal"}]) {
      const args = {project_id: ` ${created.projectId} `, ...patch};
      const ack = await projectCall(args);
      expect(JSON.parse(await new UpdateProjectTool().execute(null, args))).toEqual({project: ack});
      const read = await readProject(created.projectId);
      expect(read).toMatchObject({...ack, createdAt: initial.createdAt, workspaces: []});
      expect(Date.parse(read.updatedAt)).toBeGreaterThanOrEqual(Date.parse(initial.updatedAt));
      if (!Object.hasOwn(patch, "description")) expect(read.description).toBe("Saved goal");
      if (!Object.hasOwn(patch, "name")) expect(read.name).toBe("Renamed authored");
      if (patch.description === "   ") expect(read.description).toBe("");
    }
    const invalid: Array<[Record<string, unknown>, string]> = [
      [{}, "PROJECT_NAME_REQUIRED"], [{name: " "}, "PROJECT_NAME_REQUIRED"],
      [{name: 12}, "PROJECT_TOOL_ARGUMENT_INVALID"], [{name: "x", description: null}, "PROJECT_TOOL_ARGUMENT_INVALID"],
      [{name: "x", extra: true}, "PROJECT_TOOL_ARGUMENT_INVALID"],
      [{project_id: null, name: "No implicit create"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
      [{project_id: "", name: "No implicit create"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
      [{project_id: 12, name: "No coercion"}, "PROJECT_TOOL_ARGUMENT_INVALID"],
      [{project_id: created.projectId}, "PROJECT_PATCH_REQUIRED"],
      [{project_id: "missing", name: "No upsert"}, "PROJECT_NOT_FOUND"],
      [{name: " native AUTHORED "}, "PROJECT_NAME_TAKEN"],
      [{project_id: created.projectId, name: "NATIVE AUTHORED", description: "Must not save"}, "PROJECT_NAME_TAKEN"],
    ];
    for (const [args, code] of invalid) await expectProjectError(args, code);
  });

  it("E-006: path links retain descriptions; lists replace, blanks and [] clear only associations", async () => {
    const a = await registerWorkspace("tool-workspace-a"), b = await registerWorkspace("tool-workspace-b"), c = await registerWorkspace("tool-workspace-c");
    const roots = [a, b, c].map(w => w.workspaceRootPath);
    const beforeFolders = await Promise.all(roots.map(snapshot));
    const registry = await fs.readFile(path.join(root, "workspaces.json"), "utf8");
    const created = await projectCall({name: "Linked authored", description: "Project goal", workspaces: [
      {workspace_path: ` ${a.workspaceRootPath} `, description: " Frontend "}, {workspace_path: b.workspaceRootPath},
    ]});
    expect(created.workspaces).toEqual([{workspaceRootPath: a.workspaceRootPath, description: "Frontend"}, {workspaceRootPath: b.workspaceRootPath, description: ""}]);
    const missingPath = path.join(root, "unregistered missing #?雪");
    const direct = await projectCall({name: "Direct path", workspaces: [{workspace_path: missingPath}]});
    expect(direct.workspaces).toEqual([{workspaceRootPath: missingPath, description: ""}]);
    expect(JSON.parse(await fs.readFile(path.join(root, "projects", direct.projectId, "project.json"), "utf8")).workspaces).toEqual(direct.workspaces);
    const nativeDirect = JSON.parse(await new CreateProjectTool().execute(null, {name: "Native direct path", workspaces: [{workspace_path: missingPath}]})).project;
    expect(nativeDirect.workspaces).toEqual(direct.workspaces);
    expect(JSON.parse(await fs.readFile(path.join(root, "projects", nativeDirect.projectId, "project.json"), "utf8")).workspaces).toEqual(direct.workspaces);
    expect((await readProject(direct.projectId)).workspaces[0]).toMatchObject({workspaceRootPath: missingPath, availability: "UNREGISTERED"});
    await expect(fs.stat(missingPath)).rejects.toMatchObject({code: "ENOENT"});
    expect(await fs.readFile(path.join(root, "workspaces.json"), "utf8")).toBe(registry);
    const nativeCreated = JSON.parse(await new CreateProjectTool().execute(null, {name: "Native linked", workspaces: [{workspace_path: c.workspaceRootPath}]})).project;
    const nativeInitial = await readProject(nativeCreated.projectId);
    expect(nativeInitial).toMatchObject({workspaces: [{workspaceRootPath: c.workspaceRootPath, description: "", availability: "AVAILABLE"}]});
    const initial = await readProject(created.projectId);
    expect(initial.workspaces).toEqual([expect.objectContaining({workspaceRootPath: a.workspaceRootPath, description: "Frontend", availability: "AVAILABLE"}), expect.objectContaining({workspaceRootPath: b.workspaceRootPath, description: "", availability: "AVAILABLE"})]);
    await projectCall({project_id: created.projectId, description: "Edited goal"});
    expect((await readProject(created.projectId)).workspaces).toEqual(initial.workspaces);
    const replacement = {project_id: created.projectId, workspaces: [{workspace_path: a.workspaceRootPath}, {workspace_path: c.workspaceRootPath, description: " Backend "}]};
    const replaced = await projectCall(replacement);
    expect(JSON.parse(await new UpdateProjectTool().execute(null, replacement))).toEqual({project: replaced});
    const linked = await readProject(created.projectId);
    expect(linked).toMatchObject({name: initial.name, description: "Edited goal", createdAt: initial.createdAt});
    expect(linked.workspaces[0]).toEqual(initial.workspaces[0]);
    expect(linked.workspaces[1]).toMatchObject({workspaceRootPath: c.workspaceRootPath, description: "Backend", availability: "AVAILABLE"});
    expect(linked.workspaces.map(w => w.workspaceRootPath)).toEqual([a.workspaceRootPath, c.workspaceRootPath]); // not append
    await projectCall({project_id: created.projectId, workspaces: [{workspace_path: a.workspaceRootPath, description: "  "}, {workspace_path: c.workspaceRootPath}]});
    expect((await readProject(created.projectId)).workspaces).toEqual([{...linked.workspaces[0], description: ""}, linked.workspaces[1]]);
    const malformed: unknown[] = [null, "", "[]", {}, [null], [12], [[]], [{workspace_path: null}], [{workspace_path: " "}], [{workspace_path: 12}],
      [{workspace_path: a.workspaceRootPath, description: null}], [{workspace_path: a.workspaceRootPath, description: 12}], [{workspace_path: a.workspaceRootPath, workspaceRootPath: a.workspaceRootPath}], [{workspace_id: a.workspaceId}]];
    for (const workspaces of malformed) await expectProjectError({project_id: created.projectId, name: "Must not rename", description: "Must not change", workspaces}, "PROJECT_TOOL_ARGUMENT_INVALID");
    for (const args of [
      {project_id: created.projectId, name: "Must not rename", workspaces: [{workspace_path: a.workspaceRootPath}, {workspace_path: `${a.workspaceRootPath}/../tool-workspace-a/`}]},
      {name: "Must not create duplicate links", workspaces: [{workspace_path: a.workspaceRootPath}, {workspace_path: a.workspaceRootPath}]},
    ]) await expectProjectError(args, "WORKSPACE_ALREADY_LINKED");
    for (const args of [
      {project_id: created.projectId, name: "Must not rename", workspaces: [{workspace_path: a.workspaceRootPath}, {workspace_path: "agent_ws_missing"}]},
      {name: "Must not create unknown links", workspaces: [{workspace_path: a.workspaceRootPath}, {workspace_path: "agent_ws_missing"}]},
    ]) await expectProjectError(args, "WORKSPACE_PATH_INVALID");
    for (const workspace_path of ["relative/folder", "~/folder", "/invalid\0path", "file:///tmp/folder"]) {
      await expectProjectError({project_id: created.projectId, name: "Must not rename", workspaces: [{workspace_path}]}, "WORKSPACE_PATH_INVALID");
    }
    const cleared = await projectCall({project_id: created.projectId, workspaces: []});
    expect(cleared.workspaces).toEqual([]);
    expect(await readProject(created.projectId)).toMatchObject({projectId: created.projectId, createdAt: initial.createdAt, name: initial.name, description: "Edited goal", workspaces: []});
    expect(await fs.readFile(path.join(root, "workspaces.json"), "utf8")).toBe(registry);
    expect(await Promise.all(roots.map(snapshot))).toEqual(beforeFolders);
    // Supported retained-link policy also works after an ordinary public unregistration.
    await gql("mutation($i:RemoveWorkspaceInput!){removeWorkspace(input:$i){success}}", {i: {workspaceId: c.workspaceId}});
    const retained = {project_id: nativeCreated.projectId, workspaces: [{workspace_path: c.workspaceRootPath}]};
    const ack = await projectCall(retained);
    expect(JSON.parse(await new UpdateProjectTool().execute(null, retained))).toEqual({project: ack});
    const reread = await readProject(nativeCreated.projectId);
    expect(reread.workspaces[0]).toEqual({...nativeInitial.workspaces[0], availability: "UNREGISTERED"});
    expect(await Promise.all(roots.map(snapshot))).toEqual(beforeFolders);
  });

  it("E-007: current Projects/Tasks/context/assignments/history/registry/folders survive metadata/list patches and reader reconstruction", async () => {
    const workspace = await registerWorkspace("protected-source");
    // Existing supported full-form creation, NOT a tool-created-only fixture.
    const old = (await gql<{createProject: Project}>(`mutation($i:CreateProjectInput!){createProject(input:$i){${PROJECT}}}`, {
      i: {name: "Existing preserved", description: "Saved goal", workspaces: [{workspaceRootPath: workspace.workspaceRootPath, description: "Saved link"}]},
    })).createProject;
    const otherId = await createProject("Unrelated preserved");
    const d = await draft(old.projectId);
    const file = await (await upload(old.projectId, d.draftId, "existing task context bytes")).json() as FileRef;
    const task = (await gql<{createProjectTask: Task}>(`mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){${TASK}}}`, {
      i: {projectId: old.projectId, description: "Existing assigned task", contextDraft: {draftId: d.draftId, storedFilenames: [file.storedFilename]}},
    })).createProjectTask;
    // Minimum current-format persisted assignment; no model/run launch needed for preservation.
    const resources = path.join(root, "projects", old.projectId, "tasks", task.taskId, "agent_run_resources.json");
    await fs.writeFile(resources, JSON.stringify({taskId: task.taskId, agentRunResources: [{role: "assigned", assignedBy: "fixture-manager",
      hostRoot: {kind: "agent", runId: "fixture-root"}, agentRun: {kind: "agent", agentRunId: "fixture-worker"},
      linkedAt: task.createdAt, start: "started", closedAt: null}]}, null, 2));
    // Opaque preservation sentinel: not inference/history replay certification.
    const historyDir = path.join(root, "memory", "agents", "fixture-worker");
    await fs.mkdir(historyDir, {recursive: true}); await fs.writeFile(path.join(historyDir, "raw_traces_active.jsonl"), '{"sentinel":"owned history bytes"}\n');
    reset();
    const businessBefore = (await call("list_project_tasks", {project_id: old.projectId})).structuredContent;
    expect(businessBefore.tasks[0].assignments).toEqual([{kind: "agent", agentRunId: "fixture-worker", assignedBy: "fixture-manager", outcome: "accepted"}]);
    expect(businessBefore.tasks[0].closedAssignments).toEqual([]);
    const protectedDirs = [path.join(root, "projects", old.projectId, "tasks"), path.join(root, "projects", otherId), historyDir, workspace.workspaceRootPath];
    const before = await Promise.all(protectedDirs.map(snapshot));
    const registry = await fs.readFile(path.join(root, "workspaces.json"), "utf8");
    const originalRecord = await fs.readFile(path.join(root, "projects", old.projectId, "project.json"), "utf8");
    expect(await readProject(old.projectId)).toEqual({...old, taskCount: 1, openTaskCount: 1});
    expect(await fs.readFile(path.join(root, "projects", old.projectId, "project.json"), "utf8")).toBe(originalRecord); // no migration/read rewrite
    for (const patch of [{name: "Existing renamed"}, {description: ""}, {workspaces: [{workspace_path: workspace.workspaceRootPath}]}, {workspaces: []}]) {
      await projectCall({project_id: old.projectId, ...patch}); reset();
      const project = await readProject(old.projectId);
      expect(project).toMatchObject({projectId: old.projectId, createdAt: old.createdAt, taskCount: 1, openTaskCount: 1});
      expect(await list(old.projectId)).toEqual([task]);
      expect((await call("list_project_tasks", {project_id: old.projectId})).structuredContent).toEqual(businessBefore);
      expect(await (await fetch(`${origin}${task.contextFiles[0]!.locator}`)).text()).toBe("existing task context bytes");
      expect(await Promise.all(protectedDirs.map(snapshot))).toEqual(before);
      expect(await fs.readFile(path.join(root, "workspaces.json"), "utf8")).toBe(registry);
    }
    expect(Object.keys(JSON.parse(await fs.readFile(path.join(root, "projects", old.projectId, "project.json"), "utf8"))).sort()).toEqual(
      ["projectId", "name", "description", "createdAt", "updatedAt", "workspaces", "taskKeys"].sort());
  });

  // project-task-tool-context-files: agent-named node-local files copied into a Project Task's saved context
  // through create_task / update_task context_files, over the selected MCP session and the native tool.
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const taskCall = async (args: Record<string, unknown>) => {
    const result = await call("task_id" in args ? "update_task" : "create_task", args);
    expect(result.isError, JSON.stringify(result.structuredContent)).not.toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
    return result.structuredContent.task as { projectId: string; taskId: string; status: string; attachedContextFiles?: Array<{ storedFilename: string; displayName: string }> };
  };
  const nativeTaskCall = async (args: Record<string, unknown>) => JSON.parse(await ("task_id" in args ? new UpdateTaskTool() : new CreateTaskTool()).execute(null, args)).task;
  const taskJson = async (projectId: string, reference: string) => JSON.parse(await fs.readFile(path.join(root, "projects", projectId, "tasks", await idOf(projectId, reference), "task.json"), "utf8"));
  const readOne = async (projectId: string, reference: string) => { const taskId = await idOf(projectId, reference); return (await list(projectId)).find(t => t.taskId === taskId)!; };
  const ownedSources = async (name: string) => { const dir = path.join(root, "sources", name); await fs.mkdir(dir, { recursive: true }); return dir; };
  const attached = (displayName: string) => ({ storedFilename: expect.stringMatching(/\S/), displayName });

  it("CTX-E2E-001: context_files create/patch over MCP and native are saved, readable through GraphQL/REST/list and outlive their sources (AC-001..004, 006, 009, 011)", async () => {
    // AC-011: one optional additive string array on each task tool.
    const tools = (await rpc(mcpUrl, "tools/list")).body.result.tools as Array<{ name: string; description: string; inputSchema: { properties: Record<string, any>; required?: string[] } }>;
    expect(tools.map(t => t.name)).toEqual(names);
    for (const [name, keys] of [["create_task", ["context_files", "depends_on", "description", "part_of", "project_id"]], ["update_task", ["add_comment", "context_files", "depends_on", "description", "part_of", "status", "task_id"]]] as const) {
      const taskTool = tools.find(t => t.name === name)!;
      expect(taskTool.inputSchema.properties.context_files).toMatchObject({ type: "array", items: { type: "string" } });
      expect(taskTool.inputSchema.properties.context_files.description).toMatch(/Absolute local file paths/);
      expect(taskTool.inputSchema.required ?? []).not.toContain("context_files");
      expect(taskTool.description).toContain("context_files");
      expect(taskTool.description).toContain("attachedContextFiles");
      expect(Object.keys(taskTool.inputSchema.properties).sort()).toEqual(keys);
    }

    // RU-001: a pasted macOS screenshot under /private/tmp (real name: spaces and U+202F before AM).
    const tmpBase = await fs.stat("/private/tmp").then(() => "/private/tmp", () => os.tmpdir());
    const pasted = await fs.mkdtemp(path.join(tmpBase, "ctx-files-e2e-"));
    try {
      const shot = path.join(pasted, "Screenshot 2026-10-08 at 10.15.32 AM.png");
      const sources = await ownedSources("create");
      const notes = path.join(sources, "notes.md"), log = path.join(sources, "run log.txt"), more = path.join(sources, "more.md"), done = path.join(sources, "final.png");
      await fs.writeFile(shot, PNG); await fs.writeFile(notes, "# Notes\nGreen status is wrong.\n");
      await fs.writeFile(log, "log bytes\n"); await fs.writeFile(more, "more context\n"); await fs.writeFile(done, PNG);
      const projectId = await createProject("Context files");

      // AC-001: create with [png, md] through the selected MCP session.
      const created = await taskCall({ project_id: projectId, description: " Fix the green status ", context_files: [shot, notes] });
      expect(created).toEqual({ projectId, taskId: expect.stringMatching(/^context-files-\d+$/), status: "TODO", dependsOn: [], partOf: null,
        attachedContextFiles: [attached(path.basename(shot)), attached("notes.md")] });
      const taskId = created.taskId;
      let task = await readOne(projectId, taskId);
      expect(task).toMatchObject({ description: "Fix the green status", status: "TODO" });
      expect(task.contextFiles).toEqual([
        { storedFilename: created.attachedContextFiles![0]!.storedFilename, displayName: path.basename(shot), mimeType: "image/png", sizeBytes: PNG.length, locator: expect.any(String) },
        { storedFilename: created.attachedContextFiles![1]!.storedFilename, displayName: "notes.md", mimeType: "text/markdown", sizeBytes: 31, locator: expect.any(String) },
      ]);
      // Persisted in the existing record shape (Persisted data: Not Affected).
      expect((await taskJson(projectId, taskId)).contextFiles).toEqual(task.contextFiles.map(({ locator: _locator, ...file }) => file));
      // App preview/download: image inline with its MIME, markdown as an attachment; exact bytes.
      const image = await fetch(`${origin}${task.contextFiles[0]!.locator}`);
      expect(image.status).toBe(200); expect(image.headers.get("content-type")).toContain("image/png");
      expect(image.headers.get("content-disposition")).toBe(`inline; filename*=UTF-8''${encodeURIComponent(path.basename(shot))}`);
      expect(Buffer.from(await image.arrayBuffer())).toEqual(PNG);
      const markdown = await fetch(`${origin}${task.contextFiles[1]!.locator}`);
      expect(markdown.headers.get("content-disposition")).toContain("attachment");
      expect(await markdown.text()).toBe("# Notes\nGreen status is wrong.\n");

      // AC-006: sources are only read; deleting them leaves the saved copies and their app reads intact.
      expect(await fs.readFile(shot)).toEqual(PNG);
      await fs.rm(pasted, { recursive: true, force: true }); await fs.rm(notes);
      reset();
      expect(Buffer.from(await (await fetch(`${origin}${task.contextFiles[0]!.locator}`)).arrayBuffer())).toEqual(PNG);
      const business = (await call("list_project_tasks", { project_id: projectId })).structuredContent.tasks[0];
      expect(business.contextFiles.map((f: { displayName: string }) => f.displayName)).toEqual([path.basename(shot), "notes.md"]);
      expect(await fs.readFile(business.contextFiles[0].localPath)).toEqual(PNG);
      expect(await fs.readFile(business.contextFiles[1].localPath, "utf8")).toBe("# Notes\nGreen status is wrong.\n");

      // AC-002: files-only patch appends, keeps text/status/earlier files, returns only this call's file.
      const before = task;
      const appended = await taskCall({ task_id: taskId, context_files: [log] });
      expect(appended).toEqual({ projectId, taskId, status: "TODO", dependsOn: [], partOf: null, attachedContextFiles: [attached("run log.txt")] });
      task = await readOne(projectId, taskId);
      expect(task).toMatchObject({ description: before.description, status: "TODO", createdAt: before.createdAt });
      expect(task.contextFiles.slice(0, 2)).toEqual(before.contextFiles);
      expect(task.contextFiles[2]).toMatchObject({ storedFilename: appended.attachedContextFiles![0]!.storedFilename, displayName: "run log.txt", mimeType: "text/plain", sizeBytes: 10 });
      expect(Date.parse(task.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before.updatedAt));
      // AC-002 alternate, native surface: the same source again is another saved copy.
      const again = await nativeTaskCall({ task_id: taskId, context_files: [log] });
      expect(again).toEqual({ projectId, taskId, status: "TODO", dependsOn: [], partOf: null, attachedContextFiles: [attached("run log.txt")] });
      expect(again.attachedContextFiles[0].storedFilename).not.toBe(appended.attachedContextFiles![0]!.storedFilename);
      expect((await readOne(projectId, taskId)).contextFiles).toHaveLength(4);

      // AC-003: description + status + files in one call; then DONE + files.
      const combined = await taskCall({ task_id: taskId, description: "Edited by agent", status: "IN_PROGRESS", context_files: [more] });
      expect(combined).toEqual({ projectId, taskId, status: "IN_PROGRESS", dependsOn: [], partOf: null, attachedContextFiles: [attached("more.md")] });
      expect(await readOne(projectId, taskId)).toMatchObject({ description: "Edited by agent", status: "IN_PROGRESS" });
      const closed = await taskCall({ task_id: taskId, status: "DONE", context_files: [done] });
      expect(closed).toEqual({ projectId, taskId, status: "DONE", dependsOn: [], partOf: null, attachedContextFiles: [attached("final.png")] });
      task = await readOne(projectId, taskId);
      expect(task.status).toBe("DONE");
      expect(task.contextFiles.map(f => f.displayName)).toEqual([path.basename(shot), "notes.md", "run log.txt", "run log.txt", "more.md", "final.png"]);
      for (const file of task.contextFiles) expect((await fetch(`${origin}${file.locator}`)).status).toBe(200);

      // AC-004 / AC-009: an empty list on create is a plain create; plain patches keep the plain return.
      const plain = await nativeTaskCall({ project_id: projectId, description: "No files", context_files: [] });
      expect(plain).toEqual({ projectId, taskId: expect.any(String), status: "TODO", dependsOn: [], partOf: null });
      expect((await readOne(projectId, plain.taskId)).contextFiles).toEqual([]);
      await expect(fs.stat(path.join(root, "projects", projectId, "tasks", await idOf(projectId, plain.taskId), "context"))).rejects.toMatchObject({ code: "ENOENT" });
      expect(await taskCall({ task_id: plain.taskId, description: "Still no files" })).toEqual({ projectId, taskId: plain.taskId, status: "TODO", dependsOn: [], partOf: null });

      // RU-002: a Task with an app-uploaded file; the agent appends; the user removes the agent's file in the app.
      const d = await draft(projectId);
      const uiFile = await (await upload(projectId, d.draftId, "ui uploaded bytes", "text/plain", "ui.txt")).json() as FileRef;
      const uiTask = (await gql<{ createProjectTask: Task }>(`mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){${TASK}}}`,
        { i: { projectId, description: "UI task", contextDraft: { draftId: d.draftId, storedFilenames: [uiFile.storedFilename] } } })).createProjectTask;
      const uiRecord = (await taskJson(projectId, uiTask.taskId)).contextFiles[0];
      const agentAdd = await taskCall({ task_id: uiTask.taskId, context_files: [more] });
      expect(agentAdd.attachedContextFiles).toEqual([attached("more.md")]);
      expect((await taskJson(projectId, uiTask.taskId)).contextFiles).toEqual([uiRecord, expect.objectContaining({ displayName: "more.md" })]);
      const removed = (await gql<{ updateProjectTask: Task }>(`mutation($i:UpdateProjectTaskInput!){updateProjectTask(input:$i){${TASK}}}`,
        // As the app's Save sends it (useProjectTaskDraft): the current text plus the removal, no draft.
        { i: { projectId, taskId: uiTask.taskId, description: "UI task", contextChanges: { addStoredFilenames: [], removeStoredFilenames: [agentAdd.attachedContextFiles![0]!.storedFilename] } } })).updateProjectTask;
      expect(removed.contextFiles).toEqual([uiTask.contextFiles[0]]);
      expect((await fetch(`${origin}${uiTask.contextFiles[0]!.locator}`)).status).toBe(200);
      expect(await fs.readdir(path.join(root, "projects", projectId, "tasks", uiTask.taskId, "context"))).toEqual([uiRecord.storedFilename]);
      expect(await fs.readFile(more, "utf8")).toBe("more context\n");
    } finally {
      await fs.rm(pasted, { recursive: true, force: true });
    }
  }, 60000);

  it("CTX-E2E-002: invalid context_files fail with a path-naming error and change nothing, including no DONE closure (AC-004, 005, 008)", async () => {
    const sources = await ownedSources("errors");
    const valid = path.join(sources, "valid.png"); await fs.writeFile(valid, PNG);
    const folder = path.join(sources, "folder"); await fs.mkdir(folder);
    const unreadable = path.join(sources, "secret.txt"); await fs.writeFile(unreadable, "secret"); await fs.chmod(unreadable, 0o000);
    const script = path.join(sources, "script.ts"); await fs.writeFile(script, "export {};\n");
    const extensionless = path.join(sources, "Makefile"); await fs.writeFile(extensionless, "all:\n");
    const exe = path.join(sources, "tool.exe"); await fs.writeFile(exe, "MZ");
    const limit = 25 * 1024 * 1024;
    const huge = path.join(sources, "huge.txt"); await fs.writeFile(huge, ""); await fs.truncate(huge, limit + 1);
    const exact = path.join(sources, "exact.txt"); await fs.writeFile(exact, ""); await fs.truncate(exact, limit);
    const projectId = await createProject("Context file errors");
    const existing = await taskCall({ project_id: projectId, description: "Existing", context_files: [valid] });
    // A current-format open run resource: DONE + an invalid file must not close it.
    const existingId = await idOf(projectId, existing.taskId);
    const resources = path.join(root, "projects", projectId, "tasks", existingId, "agent_run_resources.json");
    await fs.writeFile(resources, JSON.stringify({ taskId: existingId, agentRunResources: [{ role: "assigned", assignedBy: "fixture-manager",
      hostRoot: { kind: "agent", runId: "fixture-root" }, agentRun: { kind: "agent", agentRunId: "fixture-worker" },
      linkedAt: new Date().toISOString(), start: "started", closedAt: null }] }, null, 2));
    const expectTaskError = async (args: Record<string, unknown>, code: string, named?: string) => {
      const before = await snapshot(path.join(root, "projects"));
      const mode = "task_id" in args ? "update_task" : "create_task";
      const native = await (mode === "update_task" ? new UpdateTaskTool() : new CreateTaskTool()).execute(null, args).then(
        (value) => { throw new Error(`Expected native rejection, got ${value}`); }, (error: Error) => JSON.parse(error.message));
      expect(native.error.code, JSON.stringify({ args, native })).toBe(code);
      if (named) expect(native.error.message).toContain(named);
      const result = await call(mode, args);
      expect(result.isError).toBe(true); expect(result.structuredContent).toEqual(native);
      expect(JSON.parse(result.content[0].text)).toEqual(native);
      expect(await snapshot(path.join(root, "projects"))).toEqual(before);
    };
    const fileCases: Array<[string, string, string]> = [
      ["relative", "relative/note.txt", "TASK_CONTEXT_INVALID"],
      ["non-normalized", `${sources}/sub/../valid.png`, "TASK_CONTEXT_INVALID"],
      ["missing", path.join(sources, "missing.png"), "TASK_CONTEXT_FILE_UNAVAILABLE"],
      ["directory", folder, "TASK_CONTEXT_FILE_UNAVAILABLE"],
      ...(process.getuid?.() === 0 ? [] : [["unreadable", unreadable, "TASK_CONTEXT_FILE_UNAVAILABLE"] as [string, string, string]]),
      ["unsupported .ts", script, "TASK_CONTEXT_INVALID"],
      ["unsupported .exe", exe, "TASK_CONTEXT_INVALID"],
      ["extensionless", extensionless, "TASK_CONTEXT_INVALID"],
      ["over 25 MiB", huge, "TASK_CONTEXT_INVALID"],
    ];
    for (const [, bad, code] of fileCases) {
      await expectTaskError({ project_id: projectId, description: "Must not be created", context_files: [valid, bad] }, code, bad);
      await expectTaskError({ task_id: existing.taskId, description: "Must not change", status: "DONE", context_files: [valid, bad] }, code, bad);
    }
    await expectTaskError({ project_id: projectId, description: "Duplicate", context_files: [valid, exact, valid] }, "TASK_CONTEXT_INVALID", valid);
    await expectTaskError({ task_id: existing.taskId, status: "DONE", context_files: [valid, valid] }, "TASK_CONTEXT_INVALID", valid);
    // AC-008: argument shape and strict modes.
    for (const context_files of ["/abs/file.png", null, {}, [12], [" "], [null], [[valid]]]) {
      await expectTaskError({ project_id: projectId, description: "Bad shape", context_files }, "PROJECT_TOOL_ARGUMENT_INVALID");
      await expectTaskError({ task_id: existing.taskId, context_files }, "PROJECT_TOOL_ARGUMENT_INVALID");
    }
    await expectTaskError({ task_id: existing.taskId, remove_context_files: [valid] }, "PROJECT_TOOL_ARGUMENT_INVALID");
    await expectTaskError({ project_id: projectId, task_id: existing.taskId, context_files: [valid] }, "PROJECT_TOOL_ARGUMENT_INVALID");
    await expectTaskError({ project_id: projectId, context_files: [valid] }, "TASK_DESCRIPTION_REQUIRED");
    await expectTaskError({ project_id: projectId, description: "x", status: "TODO", context_files: [valid] }, "TASK_CREATE_STATUS_UNSUPPORTED");
    await expectTaskError({ task_id: "project_task_unknown", context_files: [valid] }, "TASK_NOT_FOUND");
    // AC-004: an empty list alone is not a change.
    await expectTaskError({ task_id: existing.taskId, context_files: [] }, "TASK_PATCH_REQUIRED");
    // Nothing above changed the Task, its files or its open run.
    expect(await readOne(projectId, existing.taskId)).toMatchObject({ description: "Existing", status: "TODO" });
    expect((await list(projectId)).map(t => t.taskId)).toEqual([existingId]);
    expect(JSON.parse(await fs.readFile(resources, "utf8")).agentRunResources[0].closedAt).toBeNull();
    // RU-005: exactly 25 MiB is accepted.
    const atLimit = await nativeTaskCall({ task_id: existing.taskId, context_files: [exact] });
    expect(atLimit.attachedContextFiles).toEqual([attached("exact.txt")]);
    expect((await readOne(projectId, existing.taskId)).contextFiles[1]).toMatchObject({ displayName: "exact.txt", sizeBytes: limit, mimeType: "text/plain" });
    await fs.chmod(unreadable, 0o600);
  }, 120000);

  // task-closed-status: CANCELLED ("dropped as not needed") over the selected MCP session, the native tools and GraphQL.
  // Live workers, refusals and reactivation are in the gated task-reactivation-root-visibility suite (CLS-E2E-*).
  it("CLS-API-001: CANCELLED patch/ack, DONE<->CANCELLED, reopen, list filter, tool schemas, errors, GraphQL enum, open count and stored shape (task-closed-status AC-004, 006, 007, 010, 012)", async () => {
    // AC-007: both tool schemas offer CANCELLED and the descriptions state its meaning, the worker stop and the reopen path.
    const tools = (await rpc(mcpUrl, "tools/list")).body.result.tools as Array<{ name: string; description: string; inputSchema: any }>;
    const tool = (name: string) => tools.find(t => t.name === name)!;
    for (const name of ["update_task", "list_project_tasks"]) {
      expect(tool(name).inputSchema.properties.status.enum).toEqual(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
    }
    expect(tool("list_project_tasks").description).toContain("TODO, IN_PROGRESS, DONE or CANCELLED status (CANCELLED = dropped as not needed)");
    expect(tool("update_task").description).toContain("CANCELLED means the Task was dropped as not needed (not finished). Both stop the task agents whose current Task this is");
    expect(tool("update_task").description).toContain("first set the Task to TODO or IN_PROGRESS");
    expect(tool("create_or_update_task")).toBeUndefined();
    // REQ-001 / AC-002: the GraphQL enum carries CANCELLED (read-only: no status input anywhere).
    const enumValues = (await gql<{ __type: { enumValues: Array<{ name: string }> } }>(
      "{__type(name:\"ProjectTaskStatus\"){enumValues{name}}}")).__type.enumValues.map(v => v.name);
    expect(enumValues.sort()).toEqual(["CANCELLED", "DONE", "IN_PROGRESS", "TODO"]);
    const updateInput = (await gql<{ __type: { inputFields: Array<{ name: string }> } }>(
      "{__type(name:\"UpdateProjectTaskInput\"){inputFields{name}}}")).__type.inputFields.map(f => f.name);
    expect(updateInput).not.toContain("status");

    const projectId = await createProject("Cancelled status");
    const ids: Record<string, string> = {};
    for (const key of ["todo", "progress", "done", "cancelled"]) ids[key] = (await taskCall({ project_id: projectId, description: `Task ${key}` })).taskId;
    // A current-format open run resource on the Task to be cancelled: CANCELLED must close it exactly like DONE.
    const cancelledId = await idOf(projectId, ids.cancelled!);
    const resources = path.join(root, "projects", projectId, "tasks", cancelledId, "agent_run_resources.json");
    await fs.writeFile(resources, JSON.stringify({ taskId: cancelledId, agentRunResources: [{ role: "assigned", assignedBy: "fixture-manager",
      hostRoot: { kind: "agent", runId: "fixture-root" }, agentRun: { kind: "agent", agentRunId: "fixture-worker" },
      linkedAt: new Date().toISOString(), start: "started", closedAt: null }] }, null, 2));
    // An invalid context file with CANCELLED fails first and closes nothing (inputs are checked before closure).
    const missing = path.join(root, "sources", "cancelled-missing.png");
    const rejected = await call("update_task", { task_id: ids.cancelled, status: "CANCELLED", context_files: [missing] });
    expect(rejected.isError).toBe(true); expect(rejected.structuredContent.error.code).toBe("TASK_CONTEXT_FILE_UNAVAILABLE");
    expect(JSON.parse(await fs.readFile(resources, "utf8")).agentRunResources[0].closedAt).toBeNull();

    // AC-004: CANCELLED by task_id over MCP, IN_PROGRESS and DONE for the others.
    expect(await taskCall({ task_id: ids.progress, status: "IN_PROGRESS" })).toEqual({ projectId, taskId: ids.progress, status: "IN_PROGRESS", dependsOn: [], partOf: null });
    expect(await taskCall({ task_id: ids.done, status: "DONE" })).toEqual({ projectId, taskId: ids.done, status: "DONE", dependsOn: [], partOf: null });
    expect(await taskCall({ task_id: ids.cancelled, status: "CANCELLED" })).toEqual({ projectId, taskId: ids.cancelled, status: "CANCELLED", dependsOn: [], partOf: null });
    const closedEntry = JSON.parse(await fs.readFile(resources, "utf8")).agentRunResources[0];
    expect(closedEntry.closedAt).toEqual(expect.any(String));
    // Repeating CANCELLED (retry) and DONE<->CANCELLED change the status only; the closed entry is not rewritten.
    const resourceBytes = await fs.readFile(resources, "utf8");
    expect(await taskCall({ task_id: ids.cancelled, status: "CANCELLED" })).toMatchObject({ status: "CANCELLED" });
    expect(await nativeTaskCall({ task_id: ids.cancelled, status: "DONE" })).toMatchObject({ status: "DONE" });
    expect(await taskCall({ task_id: ids.cancelled, status: "CANCELLED" })).toMatchObject({ status: "CANCELLED" });
    expect(await fs.readFile(resources, "utf8")).toBe(resourceBytes);
    // AC-012: the stored Task keeps its exact key set; CANCELLED reads back after reader reconstruction.
    expect(Object.keys(await taskJson(projectId, ids.cancelled!)).sort()).toEqual(Object.keys(await taskJson(projectId, ids.todo!)).sort());
    expect((await taskJson(projectId, ids.cancelled!)).status).toBe("CANCELLED");
    reset();

    // AC-006: the CANCELLED filter returns only the Cancelled Task; unfiltered returns all four; MCP equals native.
    const filtered = (await call("list_project_tasks", { project_id: projectId, status: "CANCELLED" })).structuredContent;
    expect(filtered.tasks.map((t: { taskId: string; status: string }) => [t.taskId, t.status])).toEqual([[ids.cancelled, "CANCELLED"]]);
    expect(filtered).toEqual(JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId, status: "CANCELLED" })));
    const all = (await call("list_project_tasks", { project_id: projectId })).structuredContent.tasks as Array<{ taskId: string; status: string }>;
    expect(Object.fromEntries(all.map(t => [t.taskId, t.status]))).toEqual({ [ids.todo!]: "TODO", [ids.progress!]: "IN_PROGRESS", [ids.done!]: "DONE", [ids.cancelled!]: "CANCELLED" });
    expect((await list(projectId)).find(t => t.taskId === cancelledId)?.status).toBe("CANCELLED");
    // AC-010: open = TODO + IN_PROGRESS; taskCount counts all four.
    expect(await readProject(projectId)).toMatchObject({ taskCount: 4, openTaskCount: 2 });

    // AC-004 errors: create with CANCELLED is refused; an invalid status names all four values (MCP equals native).
    const errors: Array<[string, Record<string, unknown>, string]> = [
      ["create_task", { project_id: projectId, description: "x", status: "CANCELLED" }, "TASK_CREATE_STATUS_UNSUPPORTED"],
      ["update_task", { task_id: ids.todo, status: "cancelled" }, "TASK_STATUS_INVALID"],
      ["update_task", { task_id: ids.todo, status: "CANCELED" }, "TASK_STATUS_INVALID"],
      ["update_task", { task_id: ids.todo, status: "CLOSED" }, "TASK_STATUS_INVALID"],
      ["list_project_tasks", { project_id: projectId, status: "Cancelled" }, "TASK_STATUS_INVALID"],
    ];
    for (const [name, args, code] of errors) {
      const native = await (name === "list_project_tasks" ? new ListProjectTasksTool() : name === "create_task" ? new CreateTaskTool() : new UpdateTaskTool()).execute(null, args)
        .then(() => null, (e: Error) => JSON.parse(e.message));
      expect(native?.error.code, JSON.stringify(args)).toBe(code);
      if (code === "TASK_STATUS_INVALID") expect(native.error.message).toBe("Task status must be TODO, IN_PROGRESS, DONE or CANCELLED.");
      const result = await call(name, args);
      expect(result.isError).toBe(true); expect(result.structuredContent).toEqual(native);
    }
    expect(await list(projectId)).toHaveLength(4);

    // AC-003 (status side): reopening a Cancelled Task writes only the status; the closed entry stays closed (nothing starts).
    expect(await taskCall({ task_id: ids.cancelled, status: "TODO" })).toEqual({ projectId, taskId: ids.cancelled, status: "TODO", dependsOn: [], partOf: null });
    expect(await fs.readFile(resources, "utf8")).toBe(resourceBytes);
    expect(await readProject(projectId)).toMatchObject({ taskCount: 4, openTaskCount: 3 });
  }, 120000);

  // task-keys-and-dependencies: the key is the agent-facing Task ID over the selected MCP session (REQ-018–021).
  // `delegate_task` and Temp tasks need a live runtime: the gated task-existing-copy-assignment TKD-AGY-001 covers them.
  it("TKD-API-001: keys as Task IDs, depends_on by key / any case / long ID, rejected dependencies write nothing, blocked Tasks start, a deleted Project's keys stay unknown (AC-020, 022, 024, 025, 027)", async () => {
    const projectId = await createProject("Keys Tools"), otherId = await createProject("Keys Other");
    const projectsDir = path.join(root, "projects");
    const toolError = async (name: "create_task" | "update_task", args: Record<string, unknown>, code: string) => {
      const before = await snapshot(projectsDir);
      const native = await (name === "create_task" ? new CreateTaskTool() : new UpdateTaskTool()).execute(null, args)
        .then(() => null, (e: Error) => JSON.parse(e.message));
      expect(native?.error.code, JSON.stringify(args)).toBe(code);
      const result = await call(name, args);
      expect(result.isError, JSON.stringify(args)).toBe(true); expect(result.structuredContent).toEqual(native);
      // Nothing written: no Task, no key number spent, no dependency or description change.
      expect(await snapshot(projectsDir), JSON.stringify(args)).toEqual(before);
      return native.error.message as string;
    };
    const stored = async (reference: string, project = projectId) => (await taskJson(project, reference)).dependsOnTaskIds as string[];

    // AC-020: create_task returns the key as taskId; depends_on takes a key in any letter case and stores the long ID.
    const a = await taskCall({ project_id: projectId, description: "A: schema" });
    expect(a).toEqual({ projectId, taskId: "keys-tools-1", status: "TODO", dependsOn: [], partOf: null });
    const longA = await idOf(projectId, a.taskId);
    expect(longA).toMatch(/^project_task_/);
    const b = await taskCall({ project_id: projectId, description: "B: API", depends_on: ["KEYS-TOOLS-1"] });
    expect(b).toEqual({ projectId, taskId: "keys-tools-2", status: "TODO", dependsOn: ["keys-tools-1"], partOf: null });
    expect(await stored(b.taskId)).toEqual([longA]);
    // References naming the same Task twice (long ID, key, other case) collapse to one stored ID (REQ-007, CR-001).
    const c = await taskCall({ project_id: projectId, description: "C: UI", depends_on: [longA, "keys-tools-2", "Keys-Tools-2", " keys-tools-1 "] });
    expect(c.taskId).toBe("keys-tools-3");
    expect([...(c as unknown as { dependsOn: string[] }).dependsOn].sort()).toEqual(["keys-tools-1", "keys-tools-2"]);
    const longB = await idOf(projectId, b.taskId);
    expect([...await stored(c.taskId)].sort()).toEqual([longA, longB].sort());
    const q1 = await taskCall({ project_id: otherId, description: "Q1: elsewhere" });
    expect(q1.taskId).toBe("keys-other-1");

    // AC-020: list_project_tasks names every Task and dependency by key; no long Task ID in any Task-ID field.
    const listed = (await call("list_project_tasks", { project_id: projectId })).structuredContent;
    expect(listed).toEqual(JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId })));
    const byKey = Object.fromEntries((listed.tasks as Array<{ taskId: string; dependsOn: string[] }>).map(t => [t.taskId, [...t.dependsOn].sort()]));
    expect(byKey).toEqual({ "keys-tools-1": [], "keys-tools-2": ["keys-tools-1"], "keys-tools-3": ["keys-tools-1", "keys-tools-2"] });
    expect(JSON.stringify(listed)).not.toContain("project_task_");

    // AC-022 (update_task part): by key in another letter case and by long ID, acting on the same Task; results show the key.
    expect(await taskCall({ task_id: "Keys-Tools-1", status: "IN_PROGRESS" })).toEqual({ projectId, taskId: "keys-tools-1", status: "IN_PROGRESS", dependsOn: [], partOf: null });
    expect(await taskCall({ task_id: longA, description: "A: schema (edited by long ID)" })).toEqual({ projectId, taskId: "keys-tools-1", status: "IN_PROGRESS", dependsOn: [], partOf: null });
    expect((await readOne(projectId, "keys-tools-1")).description).toBe("A: schema (edited by long ID)");

    // AC-027 / AC-019: B is blocked by open A and C by A and B; both can still be started and finished.
    expect(await taskCall({ task_id: "keys-tools-2", status: "IN_PROGRESS" })).toEqual({ projectId, taskId: "keys-tools-2", status: "IN_PROGRESS", dependsOn: ["keys-tools-1"], partOf: null });
    expect(await taskCall({ task_id: "KEYS-TOOLS-3", status: "DONE" })).toMatchObject({ taskId: "keys-tools-3", status: "DONE" });

    // AC-024: invalid depends_on → TASK_DEPENDENCY_INVALID with nothing written (MCP equals native).
    expect(await toolError("update_task", { task_id: "keys-tools-1", depends_on: ["keys-tools-1"] }, "TASK_DEPENDENCY_INVALID")).toBe("A Task cannot depend on itself.");
    expect(await toolError("update_task", { task_id: "keys-tools-1", depends_on: ["keys-tools-2"] }, "TASK_DEPENDENCY_INVALID"))
      .toBe("This Task cannot depend on keys-tools-2: keys-tools-2 already depends on this Task, directly or through other Tasks.");
    expect(await toolError("update_task", { task_id: "keys-tools-1", description: "never saved", depends_on: ["keys-tools-3"] }, "TASK_DEPENDENCY_INVALID"))
      .toContain("keys-tools-3 already depends on this Task");
    expect(await toolError("update_task", { task_id: "keys-tools-1", depends_on: ["keys-tools-99"] }, "TASK_DEPENDENCY_INVALID")).toBe("Task 'keys-tools-99' is not a current Task of this Project.");
    expect(await toolError("update_task", { task_id: "keys-tools-1", depends_on: [q1.taskId] }, "TASK_DEPENDENCY_INVALID")).toBe("Task 'keys-other-1' is not a current Task of this Project.");
    expect(await toolError("create_task", { project_id: projectId, description: "never created", depends_on: [q1.taskId] }, "TASK_DEPENDENCY_INVALID")).toContain("keys-other-1");
    expect(await toolError("create_task", { project_id: projectId, description: "never created", depends_on: ["no-such-task-1"] }, "TASK_DEPENDENCY_INVALID")).toContain("no-such-task-1");
    // Shape errors are the parser's.
    await toolError("update_task", { task_id: "keys-tools-1", depends_on: "keys-tools-2" }, "PROJECT_TOOL_ARGUMENT_INVALID");
    await toolError("update_task", { task_id: "keys-tools-1", depends_on: [" "] }, "PROJECT_TOOL_ARGUMENT_INVALID");
    await toolError("create_task", { project_id: projectId, description: "x", depends_on: [7] }, "PROJECT_TOOL_ARGUMENT_INVALID");
    expect((await readOne(projectId, "keys-tools-1")).description).toBe("A: schema (edited by long ID)");

    // AC-010 via tools: omitted depends_on keeps; a depends_on-only patch is valid; [] clears.
    expect(await taskCall({ task_id: "keys-tools-2", description: "B: API v2" })).toMatchObject({ dependsOn: ["keys-tools-1"] });
    expect(await stored("keys-tools-2")).toEqual([longA]);
    expect(await taskCall({ task_id: "keys-tools-2", depends_on: [] })).toEqual({ projectId, taskId: "keys-tools-2", status: "IN_PROGRESS", dependsOn: [], partOf: null });
    expect(await stored("keys-tools-2")).toEqual([]);
    expect(await taskCall({ task_id: longB, depends_on: [longA] })).toMatchObject({ taskId: "keys-tools-2", dependsOn: ["keys-tools-1"] });
    // Rejected creates spent no number: the next Task continues at 4.
    expect((await taskCall({ project_id: projectId, description: "D" })).taskId).toBe("keys-tools-4");

    // AC-025: a deleted Project's prefix stays reserved; its old keys resolve to nothing, the new Project is suffixed.
    const retiredId = await createProject("Retired Keys");
    const old = await taskCall({ project_id: retiredId, description: "R1" });
    expect(old.taskId).toBe("retired-keys-1");
    expect((await gql<{ deleteProject: boolean }>("mutation($id:String!){deleteProject(projectId:$id)}", { id: retiredId })).deleteProject).toBe(true);
    expect(JSON.parse(await fs.readFile(path.join(projectsDir, "retired-task-key-prefixes.json"), "utf8")).prefixes).toContain("retired-keys");
    const reborn = await createProject("Retired Keys");
    expect((await taskCall({ project_id: reborn, description: "R1 again" })).taskId).toBe("retired-keys-2-1");
    for (const reference of ["retired-keys-1", "RETIRED-KEYS-1"]) {
      expect(await toolError("update_task", { task_id: reference, status: "DONE" }, "TASK_NOT_FOUND")).toContain(reference);
    }
    reset();
    // After reader reconstruction the same references resolve the same way.
    expect(await taskCall({ task_id: "keys-tools-4", depends_on: ["KEYS-TOOLS-2"] })).toMatchObject({ taskId: "keys-tools-4", dependsOn: ["keys-tools-2"] });
    await toolError("update_task", { task_id: "retired-keys-1", status: "DONE" }, "TASK_NOT_FOUND");
  }, 120000);

  // task-part-of over the selected MCP session (and the native tools where a call changes nothing): part_of by key in any case
  // and by long ID, partOf / parts in results, refusals that write nothing, and the parent-close cascade on a Task whose part
  // has an open run resource. A live running task agent, the feed and Temp tasks are in the gated project-task-parts-live suite.
  it("POF-API-001: part_of by key / any case / long ID, \"\" clears, omitted keeps; partOf / parts in numeric key order; refusals write nothing; a parent's DONE / CANCELLED closes its open parts and lists them; reopen, repeats and a part's close never cascade (task-part-of AC-003, 004, 006, 014, 015, 018)", async () => {
    // Tool schemas: part_of is an optional string on both Task tools; descriptions name the new fields.
    const tools = (await rpc(mcpUrl, "tools/list")).body.result.tools as Array<{ name: string; description: string; inputSchema: { properties: Record<string, any>; required?: string[] } }>;
    const tool = (name: string) => tools.find(t => t.name === name)!;
    for (const name of ["create_task", "update_task"]) {
      expect(tool(name).inputSchema.properties.part_of).toMatchObject({ type: "string" });
      expect(tool(name).inputSchema.required ?? []).not.toContain("part_of");
      expect(tool(name).description).toContain("Optional part_of");
    }
    expect(tool("update_task").inputSchema.properties.part_of.description).toContain("\"\" clears it; omit to keep.");
    expect(tool("update_task").description).toContain("Setting a Task that has parts to DONE or CANCELLED also sets its open parts the same way (stopping their task agents); closedParts lists them.");
    expect(tool("list_project_tasks").description).toContain("the bigger Task it is part of (partOf, a taskId or null) and its parts (parts, by taskId)");

    const projectId = await createProject("Parts Tools"), otherId = await createProject("Parts Elsewhere");
    const projectsDir = path.join(root, "projects");
    const toolError = async (name: "create_task" | "update_task", args: Record<string, unknown>, code: string) => {
      const before = await snapshot(projectsDir);
      const native = await (name === "create_task" ? new CreateTaskTool() : new UpdateTaskTool()).execute(null, args)
        .then(() => null, (e: Error) => JSON.parse(e.message));
      expect(native?.error.code, JSON.stringify(args)).toBe(code);
      const result = await call(name, args);
      expect(result.isError, JSON.stringify(args)).toBe(true); expect(result.structuredContent).toEqual(native);
      expect(await snapshot(projectsDir), JSON.stringify(args)).toEqual(before);
      return native.error.message as string;
    };
    const storedParent = async (reference: string) => (await taskJson(projectId, reference)).partOfTaskId as string | null;
    const listed = async () => {
      const result = (await call("list_project_tasks", { project_id: projectId })).structuredContent;
      expect(result).toEqual(JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId })));
      expect(JSON.stringify(result)).not.toContain("project_task_");
      return Object.fromEntries((result.tasks as Array<{ taskId: string; status: string; partOf: string | null; parts: string[] }>)
        .map(t => [t.taskId, { status: t.status, partOf: t.partOf, parts: t.parts }]));
    };
    const ack = (taskId: string, status: string, partOf: string | null, extra: Record<string, unknown> = {}) => ({ projectId, taskId, status, dependsOn: [], partOf, ...extra });

    // AC-014: create_task part_of by key in upper case, by long ID, and trimmed in mixed case; the result names the parent by key.
    const parent = await taskCall({ project_id: projectId, description: "P: cross-node collaboration" });
    expect(parent).toEqual(ack("parts-tools-1", "TODO", null));
    const longParent = await idOf(projectId, parent.taskId);
    expect(await taskCall({ project_id: projectId, description: "A: discovery", part_of: "PARTS-TOOLS-1" })).toEqual(ack("parts-tools-2", "TODO", "parts-tools-1"));
    expect(await storedParent("parts-tools-2")).toBe(longParent);
    expect(await taskCall({ project_id: projectId, description: "B: transport", part_of: longParent })).toEqual(ack("parts-tools-3", "TODO", "parts-tools-1"));
    for (let n = 4; n <= 9; n += 1) await taskCall({ project_id: projectId, description: `Filler ${n}` });
    // RU-002: a part at key 10 sorts after 2 and 3 (numeric key order, not text order).
    expect(await taskCall({ project_id: projectId, description: "C: UI", part_of: " Parts-Tools-1 " })).toEqual(ack("parts-tools-10", "TODO", "parts-tools-1"));
    const second = await taskCall({ project_id: projectId, description: "Q: second bigger Task" });
    const loose = await taskCall({ project_id: projectId, description: "L: loose" });
    expect([second.taskId, loose.taskId]).toEqual(["parts-tools-11", "parts-tools-12"]);
    const foreign = await taskCall({ project_id: otherId, description: "Elsewhere" });

    // AC-015: list_project_tasks names parent and parts by key; MCP equals native; no long ID.
    let byKey = await listed();
    expect(byKey["parts-tools-1"]).toEqual({ status: "TODO", partOf: null, parts: ["parts-tools-2", "parts-tools-3", "parts-tools-10"] });
    expect(byKey["parts-tools-2"]).toEqual({ status: "TODO", partOf: "parts-tools-1", parts: [] });
    expect(byKey["parts-tools-5"]).toEqual({ status: "TODO", partOf: null, parts: [] });

    // AC-014 / SCN-010: update_task replaces the parent, omitted keeps it, "" clears it; a part_of-only patch is a change.
    expect(await taskCall({ task_id: "parts-tools-2", part_of: "parts-tools-11" })).toEqual(ack("parts-tools-2", "TODO", "parts-tools-11"));
    expect(await taskCall({ task_id: "Parts-Tools-2", description: "A: discovery (edited)" })).toEqual(ack("parts-tools-2", "TODO", "parts-tools-11"));
    expect(await storedParent("parts-tools-2")).toBe(await idOf(projectId, "parts-tools-11"));
    byKey = await listed();
    expect(byKey["parts-tools-1"]!.parts).toEqual(["parts-tools-3", "parts-tools-10"]);
    expect(byKey["parts-tools-11"]!.parts).toEqual(["parts-tools-2"]);
    expect(await taskCall({ task_id: "parts-tools-2", part_of: "" })).toEqual(ack("parts-tools-2", "TODO", null));
    expect(await storedParent("parts-tools-2")).toBeNull();
    expect(await nativeTaskCall({ task_id: "parts-tools-2", part_of: "PARTS-TOOLS-11" })).toEqual(ack("parts-tools-2", "TODO", "parts-tools-11"));

    // AC-003 / AC-004: invalid parents → TASK_PARENT_INVALID, nothing written (MCP equals native).
    expect(await toolError("update_task", { task_id: "parts-tools-2", part_of: "parts-tools-2" }, "TASK_PARENT_INVALID")).toBe("A Task cannot be part of itself.");
    expect(await toolError("update_task", { task_id: "parts-tools-2", part_of: "parts-tools-99" }, "TASK_PARENT_INVALID")).toBe("Task 'parts-tools-99' is not a current Task of this Project.");
    expect(await toolError("update_task", { task_id: "parts-tools-2", description: "never saved", part_of: foreign.taskId }, "TASK_PARENT_INVALID")).toBe("Task 'parts-elsewhere-1' is not a current Task of this Project.");
    expect(await toolError("update_task", { task_id: loose.taskId, part_of: "parts-tools-3" }, "TASK_PARENT_INVALID")).toBe("parts-tools-3 is itself part of parts-tools-1; a part can't have parts of its own.");
    expect(await toolError("update_task", { task_id: "parts-tools-1", part_of: "parts-tools-12" }, "TASK_PARENT_INVALID")).toBe("This Task has parts, so it can't be part of another Task.");
    expect(await toolError("create_task", { project_id: projectId, description: "never created", part_of: "parts-tools-3" }, "TASK_PARENT_INVALID")).toContain("is itself part of");
    expect(await toolError("create_task", { project_id: projectId, description: "never created", part_of: "no-such-task-1" }, "TASK_PARENT_INVALID")).toContain("no-such-task-1");
    // Shape errors are the parser's: create_task part_of "" is not a clear, and part_of is one string.
    expect(await toolError("create_task", { project_id: projectId, description: "x", part_of: "" }, "PROJECT_TOOL_ARGUMENT_INVALID")).toContain("part_of");
    expect(await toolError("create_task", { project_id: projectId, description: "x", part_of: "  " }, "PROJECT_TOOL_ARGUMENT_INVALID")).toContain("part_of");
    for (const part_of of [null, 7, ["parts-tools-1"]]) await toolError("update_task", { task_id: "parts-tools-2", part_of }, "PROJECT_TOOL_ARGUMENT_INVALID");
    // Rejected creates spent no key number.
    expect((await taskCall({ project_id: projectId, description: "D: docs", part_of: "parts-tools-1" })).taskId).toBe("parts-tools-13");

    // AC-006 / REQ-005: a part's own close never changes its parent (Q stays TODO; no closedParts).
    expect(await taskCall({ task_id: "parts-tools-2", status: "DONE" })).toEqual(ack("parts-tools-2", "DONE", "parts-tools-11"));
    expect((await listed())["parts-tools-11"]).toEqual({ status: "TODO", partOf: null, parts: ["parts-tools-2"] });

    // AC-018 (tool level): P's parts: 3 IN_PROGRESS with an open run resource, 10 TODO, 13 DONE, 14 CANCELLED.
    expect(await taskCall({ task_id: "parts-tools-3", status: "IN_PROGRESS" })).toMatchObject({ status: "IN_PROGRESS" });
    expect(await taskCall({ task_id: "parts-tools-13", status: "DONE" })).toMatchObject({ status: "DONE" });
    expect(await taskCall({ project_id: projectId, description: "E: dropped", part_of: "parts-tools-1" })).toMatchObject({ taskId: "parts-tools-14" });
    expect(await taskCall({ task_id: "parts-tools-14", status: "CANCELLED" })).toMatchObject({ status: "CANCELLED" });
    const runningId = await idOf(projectId, "parts-tools-3");
    const resources = path.join(projectsDir, projectId, "tasks", runningId, "agent_run_resources.json");
    await fs.writeFile(resources, JSON.stringify({ taskId: runningId, agentRunResources: [{ role: "assigned", assignedBy: "fixture-manager",
      hostRoot: { kind: "agent", runId: "fixture-root" }, agentRun: { kind: "agent", agentRunId: "fixture-part-worker" },
      linkedAt: new Date().toISOString(), start: "started", closedAt: null }] }, null, 2));
    const closedBytes = async () => Promise.all(["parts-tools-13", "parts-tools-14"].map(async key => fs.readFile(path.join(projectsDir, projectId, "tasks", await idOf(projectId, key), "task.json"), "utf8")));
    const terminalBefore = await closedBytes();
    const cancelled = await taskCall({ task_id: "parts-tools-1", status: "CANCELLED" });
    expect(cancelled).toEqual(ack("parts-tools-1", "CANCELLED", null, { closedParts: ["parts-tools-3", "parts-tools-10"] }));
    byKey = await listed();
    expect(Object.fromEntries(["parts-tools-1", "parts-tools-3", "parts-tools-10", "parts-tools-13", "parts-tools-14"].map(k => [k, byKey[k]!.status]))).toEqual(
      { "parts-tools-1": "CANCELLED", "parts-tools-3": "CANCELLED", "parts-tools-10": "CANCELLED", "parts-tools-13": "DONE", "parts-tools-14": "CANCELLED" });
    // The IN_PROGRESS part's open run was closed like any CANCELLED; the parts that were already closed were not rewritten.
    expect(JSON.parse(await fs.readFile(resources, "utf8")).agentRunResources[0].closedAt).toEqual(expect.any(String));
    expect(await closedBytes()).toEqual(terminalBefore);
    // A repeat of the same status and a reopen never cascade; the parts stay as they are.
    expect(await taskCall({ task_id: "parts-tools-1", status: "CANCELLED" })).toEqual(ack("parts-tools-1", "CANCELLED", null));
    expect(await taskCall({ task_id: "parts-tools-1", status: "TODO" })).toEqual(ack("parts-tools-1", "TODO", null));
    expect((await listed())["parts-tools-10"]!.status).toBe("CANCELLED");
    // DONE on the reopened parent closes only its open parts, as DONE (a new part); Cancelled parts stay Cancelled.
    expect(await taskCall({ project_id: projectId, description: "F: follow-up slice", part_of: "parts-tools-1" })).toMatchObject({ taskId: "parts-tools-15", status: "TODO" });
    expect(await taskCall({ task_id: "parts-tools-1", status: "DONE" })).toEqual(ack("parts-tools-1", "DONE", null, { closedParts: ["parts-tools-15"] }));
    byKey = await listed();
    expect([byKey["parts-tools-15"]!.status, byKey["parts-tools-10"]!.status]).toEqual(["DONE", "CANCELLED"]);
    // DONE → CANCELLED with no open part closes nothing.
    expect(await taskCall({ task_id: "parts-tools-1", status: "CANCELLED" })).toEqual(ack("parts-tools-1", "CANCELLED", null));
    // DEC-018: a part created under, or attached to, a closed parent keeps its own status.
    expect(await taskCall({ project_id: projectId, description: "G: filed under a closed Task", part_of: "parts-tools-1" })).toEqual(ack("parts-tools-16", "TODO", "parts-tools-1"));
    expect(await taskCall({ task_id: loose.taskId, part_of: "parts-tools-1" })).toEqual(ack("parts-tools-12", "TODO", "parts-tools-1"));
    expect((await listed())["parts-tools-1"]).toEqual({ status: "CANCELLED", partOf: null,
      parts: ["parts-tools-3", "parts-tools-10", "parts-tools-12", "parts-tools-13", "parts-tools-14", "parts-tools-15", "parts-tools-16"] });

    // After reader reconstruction the stored parents read the same; deleting the parent leaves its parts without one.
    reset();
    expect((await listed())["parts-tools-12"]!.partOf).toBe("parts-tools-1");
    await gql("mutation($i:DeleteProjectTaskInput!){deleteProjectTask(input:$i)}", { i: { projectId, taskId: longParent } });
    byKey = await listed();
    expect(Object.entries(byKey).filter(([, t]) => t.partOf !== null).map(([key]) => key)).toEqual(["parts-tools-2"]); // only Q's part remains a part
    expect(byKey["parts-tools-11"]!.parts).toEqual(["parts-tools-2"]);
  }, 120000);

  // task-comments over the selected MCP session and the native tools: add_comment appends one comment per call without touching
  // the description, combines with other fields in one write, and refusals write nothing. Live delegation, the feed and Temp
  // tasks are in the gated project-task-comments-live suite.
  const openRunFixture = async (projectId: string, reference: string, agentRunId: string) => {
    const taskId = await idOf(projectId, reference);
    const file = path.join(root, "projects", projectId, "tasks", taskId, "agent_run_resources.json");
    await fs.writeFile(file, JSON.stringify({ taskId, agentRunResources: [{ role: "assigned", assignedBy: "fixture-manager",
      hostRoot: { kind: "agent", runId: "fixture-root" }, agentRun: { kind: "agent", agentRunId },
      linkedAt: new Date().toISOString(), start: "started", closedAt: null }] }, null, 2));
    return file;
  };

  it("CMT-API-001: update_task add_comment by key / any case / long ID appends numbered comments, never the description; DONE + comment is one write; blank, wrong-shape and unknown are refused with nothing written; list_project_tasks shows the texts (task-comments AC-001, AC-005, AC-008)", async () => {
    // REQ-005 / REQ-010: one optional string on update_task only; no new tool in the selected session.
    const tools = (await rpc(mcpUrl, "tools/list")).body.result.tools as Array<{ name: string; description: string; inputSchema: { properties: Record<string, any>; required?: string[] } }>;
    expect(tools.map(t => t.name)).toEqual(names);
    const update = tools.find(t => t.name === "update_task")!;
    expect(update.inputSchema.properties.add_comment).toMatchObject({ type: "string" });
    expect(update.inputSchema.required ?? []).not.toContain("add_comment");
    expect(update.description).toContain("Optional add_comment (Project Tasks only): text added as a new comment at the end of the Task's comments; the description is not changed. Each call adds one comment.");
    expect(tools.find(t => t.name === "create_task")!.inputSchema.properties.add_comment).toBeUndefined();

    const projectId = await createProject("Comments Tools");
    const projectsDir = path.join(root, "projects");
    const ack = (taskId: string, status: string, extra: Record<string, unknown> = {}) => ({ projectId, taskId, status, dependsOn: [], partOf: null, ...extra });
    const toolError = async (name: "create_task" | "update_task", args: Record<string, unknown>, code: string) => {
      const before = await snapshot(projectsDir);
      const native = await (name === "create_task" ? new CreateTaskTool() : new UpdateTaskTool()).execute(null, args)
        .then(() => null, (e: Error) => JSON.parse(e.message));
      expect(native?.error.code, JSON.stringify(args)).toBe(code);
      const result = await call(name, args);
      expect(result.isError, JSON.stringify(args)).toBe(true); expect(result.structuredContent).toEqual(native);
      expect(await snapshot(projectsDir), JSON.stringify(args)).toEqual(before);
      return native.error.message as string;
    };
    const a = await taskCall({ project_id: projectId, description: "A: release notes" });
    const b = await taskCall({ project_id: projectId, description: "B: no comments yet" });
    expect([a.taskId, b.taskId]).toEqual(["comments-tools-1", "comments-tools-2"]);
    const longA = await idOf(projectId, a.taskId);
    const first = await taskJson(projectId, a.taskId);
    expect(first.comments).toEqual([]);

    // AC-001: three calls (key in upper case over MCP, long ID over MCP, mixed case natively) → comments 1, 2, 3, in order;
    // the result never gains a comment field; the description stays as it was.
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(await taskCall({ task_id: "COMMENTS-TOOLS-1", add_comment: "  Decision: use X  " })).toEqual(ack("comments-tools-1", "TODO"));
    expect(await taskCall({ task_id: longA, add_comment: "Second comment\nwith a second line" })).toEqual(ack("comments-tools-1", "TODO"));
    expect(await nativeTaskCall({ task_id: "Comments-Tools-1", add_comment: "Third, by the native tool" })).toEqual(ack("comments-tools-1", "TODO"));
    let stored = await taskJson(projectId, a.taskId);
    expect(stored.comments.map((c: { id: number; text: string }) => [c.id, c.text])).toEqual([[1, "Decision: use X"], [2, "Second comment\nwith a second line"], [3, "Third, by the native tool"]]);
    expect(stored.comments.every((c: { createdAt: string }) => !Number.isNaN(Date.parse(c.createdAt)))).toBe(true);
    expect(stored.comments.map((c: { createdAt: string }) => Date.parse(c.createdAt))).toEqual([...stored.comments.map((c: { createdAt: string }) => Date.parse(c.createdAt))].sort((x, y) => x - y));
    expect(stored).toMatchObject({ description: "A: release notes", status: "TODO", createdAt: first.createdAt });
    expect(Date.parse(stored.updatedAt)).toBeGreaterThan(Date.parse(first.updatedAt));
    expect(stored.updatedAt).toBe(stored.comments[2].createdAt);

    // AC-001: DONE + a comment in one call: status and comment saved together, and the open run is closed as for any DONE.
    const resources = await openRunFixture(projectId, a.taskId, "fixture-comment-worker");
    expect(await taskCall({ task_id: a.taskId, status: "DONE", add_comment: "Merged and released." })).toEqual(ack("comments-tools-1", "DONE"));
    stored = await taskJson(projectId, a.taskId);
    expect(stored.status).toBe("DONE");
    expect(stored.comments.at(-1)).toMatchObject({ id: 4, text: "Merged and released." });
    expect(JSON.parse(await fs.readFile(resources, "utf8")).agentRunResources[0].closedAt).toEqual(expect.any(String));

    // Refusals: nothing written, not even the status of a combined call, and B's open run stays open (MCP equals native).
    const bResources = await openRunFixture(projectId, b.taskId, "fixture-open-worker");
    expect(await toolError("update_task", { task_id: b.taskId, add_comment: "" }, "TASK_COMMENT_INVALID")).toBe("Comment text is required.");
    expect(await toolError("update_task", { task_id: b.taskId, status: "DONE", add_comment: "   \n " }, "TASK_COMMENT_INVALID")).toBe("Comment text is required.");
    for (const add_comment of [7, null, ["text"], { text: "x" }]) await toolError("update_task", { task_id: b.taskId, status: "DONE", add_comment }, "PROJECT_TOOL_ARGUMENT_INVALID");
    expect(await toolError("update_task", { task_id: "comments-tools-99", status: "DONE", add_comment: "Lost?" }, "TASK_NOT_FOUND")).toContain("comments-tools-99");
    await toolError("create_task", { project_id: projectId, description: "never created", add_comment: "x" }, "PROJECT_TOOL_ARGUMENT_INVALID");
    expect(JSON.parse(await fs.readFile(bResources, "utf8")).agentRunResources[0].closedAt).toBeNull();
    expect(await taskJson(projectId, b.taskId)).toMatchObject({ status: "TODO", comments: [] });
    // add_comment alone is a change (no TASK_PATCH_REQUIRED); description-only updates leave the thread alone.
    expect(await taskCall({ task_id: b.taskId, add_comment: "Only a comment" })).toEqual(ack("comments-tools-2", "TODO"));
    expect(await taskCall({ task_id: a.taskId, description: "A: release notes (edited)" })).toEqual(ack("comments-tools-1", "DONE"));
    expect((await taskJson(projectId, a.taskId)).comments).toHaveLength(4);

    // AC-005 (list): comment texts oldest first, no IDs or times; no field when a Task has none; MCP equals native; after
    // reader reconstruction the same.
    const c = await taskCall({ project_id: projectId, description: "C: none" });
    for (const attempt of ["first read", "after reader reconstruction"]) {
      const listed = (await call("list_project_tasks", { project_id: projectId })).structuredContent;
      expect(listed, attempt).toEqual(JSON.parse(await new ListProjectTasksTool().execute(null, { project_id: projectId })));
      const byKey = Object.fromEntries((listed.tasks as Array<Record<string, unknown> & { taskId: string }>).map(t => [t.taskId, t]));
      expect(byKey["comments-tools-1"]!.comments, attempt).toEqual(["Decision: use X", "Second comment\nwith a second line", "Third, by the native tool", "Merged and released."]);
      expect(byKey["comments-tools-2"]!.comments, attempt).toEqual(["Only a comment"]);
      expect(Object.hasOwn(byKey[c.taskId]!, "comments"), attempt).toBe(false);
      reset();
    }
  }, 120000);

  it("CMT-API-002: a parent's close names the part it could not close (damaged run data) in partsNotClosed, next to closedParts; the field is absent when every part closes (task-comments AC-009, autobyteus-187)", async () => {
    const projectId = await createProject("Parts Not Closed");
    const ack = (taskId: string, status: string, extra: Record<string, unknown> = {}) => ({ projectId, taskId, status, dependsOn: [], partOf: null, ...extra });
    const parent = await taskCall({ project_id: projectId, description: "P: bigger Task" });
    const ok = await taskCall({ project_id: projectId, description: "Closes", part_of: parent.taskId });
    const damaged = await taskCall({ project_id: projectId, description: "Its run data is damaged", part_of: parent.taskId });
    const last = await taskCall({ project_id: projectId, description: "Also closes", part_of: parent.taskId });
    // DESIGN.md rule 7: a Task whose run data cannot be read; written as unparsable bytes in this test-owned root.
    const damagedId = await idOf(projectId, damaged.taskId);
    const damagedFile = path.join(root, "projects", projectId, "tasks", damagedId, "agent_run_resources.json");
    await fs.writeFile(damagedFile, "{ this is not JSON");
    reset();
    const closed = await taskCall({ task_id: parent.taskId, status: "CANCELLED" });
    expect(closed).toEqual(ack(parent.taskId, "CANCELLED", { closedParts: [ok.taskId, last.taskId], partsNotClosed: [damaged.taskId] }));
    const statuses = Object.fromEntries(((await call("list_project_tasks", { project_id: projectId })).structuredContent.tasks as Array<{ taskId: string; status: string }>).map(t => [t.taskId, t.status]));
    expect(statuses).toEqual({ [parent.taskId]: "CANCELLED", [ok.taskId]: "CANCELLED", [damaged.taskId]: "TODO", [last.taskId]: "CANCELLED" });
    expect(await fs.readFile(damagedFile, "utf8")).toBe("{ this is not JSON");

    // Every part closes: closedParts only (the exact result has no partsNotClosed).
    const other = await taskCall({ project_id: projectId, description: "Q: another bigger Task" });
    const p1 = await taskCall({ project_id: projectId, description: "Q1", part_of: other.taskId });
    const p2 = await taskCall({ project_id: projectId, description: "Q2", part_of: other.taskId });
    expect(await taskCall({ task_id: other.taskId, status: "DONE" })).toEqual(ack(other.taskId, "DONE", { closedParts: [p1.taskId, p2.taskId] }));
    // The damaged file is this Project's own; removing the Project leaves no damaged data for later cases.
    await gql("mutation($id:String!){deleteProject(projectId:$id)}", { id: projectId });
  }, 120000);

});
