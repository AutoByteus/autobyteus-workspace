import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ProjectChangeMessageSchema } from "../../../src/projects/changes/project-change-messages.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// project-manager-ux at the real server/wire boundary: the per-node `/ws/projects` change feed and the Task root,
// through the real Studio HTTP/WebSocket server, scoped MCP, Project/Task services, roots and the publisher.
// Only the external AGY CLI is scripted: a message containing `CALL_TOOL:{...}` makes that agent call the actual
// agent tool and reply `CALLED:<tool result>`. No provider inference. Every agent write below is a real tool call.
// Covers AC-001..AC-008, AC-019..AC-021, AC-023, QR-001 and QR-002 (server side), the feed contract (strict
// schema, `connected` on every connection, no replay, remote-access rejection) and event/snapshot parity (DS-003).
// Rendering and opening roots are covered by `test:e2e:project-manager-ux` (browser).
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = Record<string, any> & { type: string };
type Kind = "agent" | "team" | "org";
type TaskNode = Record<string, any> & { startedAt: string };
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"];
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const ROOT_FIELDS = "kind recipientAddress ingressAgentRunId teamRunId hostRoot { kind runId } start startError { code message } closed status";
const PROJECT_TASKS = `query($id:String!){projectTasks(projectId:$id){taskId projectId description status createdAt updatedAt
  contextFiles { storedFilename displayName mimeType sizeBytes locator } root { ${ROOT_FIELDS} }}}`;
const TASKS_WITHOUT_PROJECT = `query{tasksWithoutProject{taskId description status referenceFiles createdAt updatedAt root { ${ROOT_FIELDS} }}}`;
const PROJECT = `query($id:String!){project(projectId:$id){projectId name description createdAt updatedAt
  workspaces { workspaceRootPath displayName description availability } taskCount openTaskCount }}`;

const taskNodes = (tree: unknown): TaskNode[] => {
  const found: TaskNode[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, any>;
    const startedAt = record.startedAt ?? record.started_at;
    const agentRunId = record.agentRunId ?? record.agent_run_id;
    const teamRunId = record.teamRunId ?? record.team_run_id;
    if (typeof startedAt === "string" && (agentRunId || teamRunId)) {
      found.push({ ...(teamRunId ? { teamRunId } : { agentRunId }), address: record.address, startedAt,
        delegatorAgentRunId: record.delegatorAgentRunId ?? record.delegator_agent_run_id,
        members: (record.members ?? []).map((member: any) => ({ address: member.address,
          agentRunId: member.agentRunId ?? member.agent_run_id })).filter((member: any) => member.agentRunId) });
    }
    Object.values(record).forEach(visit);
  };
  visit(tree);
  return found;
};
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (value.includes("CALLED:")) strings.push(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(entry);
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called }; }
};
const scopeKey = (scope: Record<string, any>) => scope.kind === "project" ? `project:${scope.projectId}` : "no_project";
const sameScope = (frame: Frame, scope: Record<string, any>) => frame.scope && scopeKey(frame.scope) === scopeKey(scope);

suite("Projects change feed and Task roots (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", helper: "", squad: "", team: "", org: "" };
  const names = { worker: "", helper: "", squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  /** Every frame any feed connection of this suite received (raw text), for the contract check. */
  const allRaw: string[] = [];
  let monitor!: { socket: WebSocket; frames: Frame[] };

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (project change feed E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
  /** One `/ws/projects` connection; resolves once open. */
  const openFeed = async (query = "") => {
    const socket = new WebSocket(`ws://${url.host}/ws/projects${query}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    const closed = new Promise<{ code: number; reason: string }>((resolve) =>
      socket.once("close", (code: number, reason: Buffer) => resolve({ code, reason: String(reason) })));
    socket.on("message", (raw: unknown) => { const text = String(raw); allRaw.push(text); frames.push(JSON.parse(text)); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { socket, frames, closed };
  };
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const terminate = async (kind: Kind, rootId: string) => {
    const result = kind === "agent"
      ? (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId })).terminateAgentRun
      : kind === "team"
        ? (await graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId })).terminateAgentTeamRun
        : (await graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).terminateAgentOrgRun;
    expect(result.success, result.message).toBe(true);
    const index = active.findIndex((run) => run.rootId === rootId);
    if (index >= 0) active.splice(index, 1);
  };
  const createProject = async (name: string) => (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
    { input: { name } })).createProject.projectId as string;
  const createTask = async (projectId: string, description: string) => (await graphql(
    `mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, description } })).createProjectTask.taskId as string;
  const gqlTask = async (projectId: string, taskId: string) =>
    ((await graphql(PROJECT_TASKS, { id: projectId })).projectTasks as any[]).find((task) => task.taskId === taskId) ?? null;
  const gqlTempTask = async (taskId: string) =>
    ((await graphql(TASKS_WITHOUT_PROJECT)).tasksWithoutProject as any[]).find((task) => task.taskId === taskId) ?? null;
  /** The Task as a client that applied every feed event so far sees it (upsert, then worker-status patches). */
  const feedTask = (frames: Frame[], scope: Record<string, any>, taskId: string) => {
    let task: Record<string, any> | null = null;
    for (const frame of frames) {
      if (!sameScope(frame, scope)) continue;
      if (frame.type === "task_upserted" && frame.task.taskId === taskId) task = structuredClone(frame.task);
      else if (frame.type === "task_removed" && frame.taskId === taskId) task = null;
      else if (frame.type === "task_worker_status" && frame.taskId === taskId && task?.root) task.root.status = frame.status;
    }
    return task;
  };
  const feedProject = (frames: Frame[], projectId: string) => {
    let project: Record<string, any> | null = null;
    for (const frame of frames) {
      if (frame.type === "project_upserted" && frame.project.projectId === projectId) project = frame.project;
      if (frame.type === "project_removed" && frame.projectId === projectId) project = null;
    }
    return project;
  };
  /** Waits until the feed's view of the Task equals the GraphQL snapshot (DS-003 parity) and returns it. */
  const settledTask = async (scope: Record<string, any>, taskId: string, label: string, predicate: (task: any) => boolean = () => true) => {
    let fed: any = null, read: any = null;
    await until(async () => {
      fed = feedTask(monitor.frames, scope, taskId);
      read = scope.kind === "project" ? await gqlTask(scope.projectId, taskId) : await gqlTempTask(taskId);
      return fed !== null && read !== null && expectEqual(fed, read) && predicate(fed);
    }, `${label}: feed equals snapshot`, 30_000).catch((error) => {
      throw new Error(`${error.message}; feed=${JSON.stringify(fed)}; snapshot=${JSON.stringify(read)}`);
    });
    return fed;
  };
  const expectEqual = (a: unknown, b: unknown) => { try { expect(a).toEqual(b); return true; } catch { return false; } };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "project-change-feed-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    monitor = await openFeed();
    await until(() => monitor.frames.length >= 1, "monitor connected");
    const suffix = randomUUID().slice(0, 6);
    names.worker = `PCF Worker ${suffix}`; names.helper = `PCF Helper ${suffix}`; names.squad = `PCF Squad ${suffix}`;
    ids.manager = await agentDefinition(`PCF Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(names.worker, []);
    ids.helper = await agentDefinition(names.helper, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `PCF Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" },
          { memberName: "helper", ref: ids.helper, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `PCF Org ${suffix}`, description: "Org root", instructions: "Follow requests.", handoffs: [],
        members: [{ memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
          { memberName: "worker", ref: ids.worker, refType: "AGENT", refScope: "SHARED" }] } },
    )).createAgentOrgDefinition.id;
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["PROJECT_CHANGE_FEED_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      const counts: Record<string, number> = {};
      for (const text of allRaw) { const type = JSON.parse(text).type; counts[type] = (counts[type] ?? 0) + 1; }
      await fs.writeFile(path.join(dir, "project-change-feed.json"), `${JSON.stringify({ ...evidence, frameCounts: counts, frames: allRaw.length,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  /** A root of one kind with the Manager and readers of its tree and conversations. */
  const startRoot = async (kind: Kind, workerOverride: Record<string, unknown> = {}) => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config(), ...workerOverride },
          { memberAddress: "/helper", agentDefinitionId: ids.helper, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      managerRunId = tree.rootOrg.members.find((member: any) => member.address === "/manager").agentRunId;
    }
    active.push({ kind, rootId });
    const route = kind === "agent" ? "agent" : kind === "team" ? "agent-team" : "agent-org";
    const isReady = (frames: Frame[]) => frames.some((f) => f.type === (kind === "agent" ? "CONNECTED" : kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const channel = await connect(route, rootId, isReady);
    const send = (content: string) => {
      if (kind === "org") channel.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(channel.socket, { agent_run_id: managerRunId, content });
    };
    const liveTree = async () => {
      if (kind === "agent") return (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    };
    const managerConversation = async () => {
      if (kind === "agent") return (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: rootId })).getRunProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: managerRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: managerRunId, m: "/manager" })).getAgentOrgMemberRunProjection?.conversation;
    };
    /** One scripted tool call by the Manager; returns its tool result. */
    const managerCalls = async (content: string) => {
      const before = calledResults(await managerConversation()).length;
      send(content);
      let results: string[] = [];
      await until(async () => { results = calledResults(await managerConversation()); return results.length > before; },
        `Manager tool result for ${content.slice(0, 120)}`, 60_000);
      return toolResult(results[before]!);
    };
    const waitForNodes = async (label: string, predicate: (nodes: TaskNode[]) => boolean) => {
      let nodes: TaskNode[] = [];
      await until(async () => { nodes = taskNodes(await liveTree()); return predicate(nodes); }, label, 60_000)
        .catch((error) => { throw new Error(`${error.message}; nodes=${JSON.stringify(nodes).slice(0, 1500)}`); });
      return nodes;
    };
    return { kind, rootId, managerRunId, managerCalls, waitForNodes, liveTree, close: () => channel.socket.close() };
  };

  it("feed contract: `connected` first on every connection, no replay, remote-access rejection like the sibling sockets", async () => {
    // Existing data must not be replayed to a new connection.
    const projectId = await createProject(`PCF contract ${randomUUID().slice(0, 6)}`);
    await createTask(projectId, "Existing Task.");
    await until(() => monitor.frames.some((f) => f.type === "task_upserted" && f.scope?.projectId === projectId), "monitor saw the Task");
    const first = await openFeed(), second = await openFeed();
    await until(() => first.frames.length >= 1 && second.frames.length >= 1, "both connected");
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(first.frames).toEqual([{ type: "connected" }]);
    expect(second.frames).toEqual([{ type: "connected" }]);
    // Both connections receive the same later change (broadcast to every client of the node).
    const taskId = await createTask(projectId, "Broadcast me.");
    await until(() => [first, second].every((feed) => feed.frames.some((f) => f.type === "task_upserted" && f.task.taskId === taskId)), "broadcast");
    // A rejected remote credential closes the socket the same way the other sockets do.
    const rejected = await openFeed("?access_token=mra_not_a_paired_device");
    const closed = await rejected.closed;
    expect(rejected.frames).toEqual([]);
    const sibling = new WebSocket(`ws://${url.host}/ws/file-explorer/${randomUUID()}?access_token=mra_not_a_paired_device`);
    sockets.push(sibling);
    const siblingClosed = await new Promise<{ code: number; reason: string }>((resolve) =>
      sibling.once("close", (code: number, reason: Buffer) => resolve({ code, reason: String(reason) })));
    expect(closed.code).toBe(4401);
    expect(closed).toEqual(siblingClosed);
    first.socket.close(); second.socket.close();
    await Promise.all([first.closed, second.closed]);
    // Normal disconnected-client recovery: no replay, snapshot then future path updates.
    const workspaceRootPath = path.join(dataDir, "feed missing #?雪");
    const update = `mutation($i:UpdateProjectInput!){updateProject(input:$i){projectId}}`;
    await graphql(update, {i: {projectId, name: "Feed path", workspaces: [{workspaceRootPath, description: "Saved offline"}]}});
    await until(() => feedProject(monitor.frames, projectId)?.workspaces[0]?.description === "Saved offline", "offline change published");
    const reconnected = await openFeed();
    await until(() => reconnected.frames.length > 0, "reconnected");
    expect(reconnected.frames).toEqual([{type: "connected"}]);
    const snapshot = (await graphql(PROJECT, {id: projectId})).project;
    expect(snapshot.workspaces).toEqual([{workspaceRootPath, description: "Saved offline", displayName: "feed missing #?雪", availability: "UNREGISTERED"}]);
    await graphql(`mutation($i:UpdateProjectWorkspaceInput!){updateProjectWorkspace(input:$i){projectId}}`, {i: {projectId, workspaceRootPath, description: "Live edit"}});
    await until(() => feedProject(reconnected.frames, projectId)?.workspaces[0]?.description === "Live edit", "live path edit");
    expect(feedProject(reconnected.frames, projectId)).toEqual((await graphql(PROJECT, {id: projectId})).project);
    await graphql(`mutation($i:RemoveProjectWorkspaceInput!){removeProjectWorkspace(input:$i){projectId}}`, {i: {projectId, workspaceRootPath}});
    await until(() => feedProject(reconnected.frames, projectId)?.workspaces.length === 0, "live unlink");
    expect(feedProject(reconnected.frames, projectId)).toEqual((await graphql(PROJECT, {id: projectId})).project);
    reconnected.socket.close(); await reconnected.closed;
    await expect(fs.stat(workspaceRootPath)).rejects.toMatchObject({code: "ENOENT"});
    evidence.contract = { remoteRejection: closed, siblingRejection: siblingClosed };
  }, 60000);

  it("Agent root: an agent's Project/Task writes, delegation, worker status, helpers, DONE, reopen and reactivation are live and equal the snapshot", async () => {
    const root = await startRoot("agent");
    const workerAddress = `/${segment(names.worker)}`;
    const record: Record<string, unknown> = {};
    // AC-001: the agent creates a Project; it arrives (QR-001: ~2 s on a local node).
    let from = monitor.frames.length;
    const created = await root.managerCalls(callTool("create_or_update_project", { name: `PCF Launch ${randomUUID().slice(0, 6)}`, description: "Agent-made.", workspaces: [{workspace_path: path.join(dataDir, "missing #?雪"), description: "Agent path"}] }));
    const projectId = (JSON.stringify(created).match(/"projectId":"([^"]+)"/) ?? [])[1]!;
    expect(projectId, JSON.stringify(created)).toBeTruthy();
    await until(() => monitor.frames.slice(from).some((f) => f.type === "project_upserted" && f.project.projectId === projectId), "project arrives", 2_000);
    await until(async () => expectEqual(feedProject(monitor.frames, projectId), (await graphql(PROJECT, {id: projectId})).project), "agent path matches snapshot");
    expect(feedProject(monitor.frames, projectId).workspaces).toEqual([{
      workspaceRootPath: path.join(dataDir, "missing #?雪"), description: "Agent path", displayName: "missing #?雪", availability: "UNREGISTERED",
    }]);
    expect(JSON.parse(await fs.readFile(path.join(dataDir, "projects", projectId, "project.json"), "utf8")).workspaces).toEqual([
      {workspaceRootPath: path.join(dataDir, "missing #?雪"), description: "Agent path"},
    ]);
    await expect(fs.stat(path.join(dataDir, "missing #?雪"))).rejects.toMatchObject({code: "ENOENT"});
    // AC-002: the agent creates a Task; it arrives with no root; the Project's counts follow.
    from = monitor.frames.length;
    const taskCreated = await root.managerCalls(callTool("create_or_update_task", { project_id: projectId,
      description: callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Reply OK." }) }));
    const taskId = (JSON.stringify(taskCreated).match(/"taskId":"([^"]+)"/) ?? [])[1]!;
    expect(taskId, JSON.stringify(taskCreated)).toBeTruthy();
    const scope = { kind: "project", projectId };
    await until(() => monitor.frames.slice(from).some((f) => f.type === "task_upserted" && f.task.taskId === taskId), "task arrives", 2_000);
    let task = await settledTask(scope, taskId, "new Task");
    expect(task).toMatchObject({ status: "TODO", root: null });
    await until(async () => expectEqual(feedProject(monitor.frames, projectId), (await graphql(PROJECT, { id: projectId })).project), "project counts equal");
    expect(feedProject(monitor.frames, projectId)).toMatchObject({ taskCount: 1, openTaskCount: 1 });
    // AC-004/005: the agent delegates the Task; the root arrives (agent, started, named, hosted by this root) and its
    // worker's status follows. The worker's own helper (AC-006) never becomes the root.
    from = monitor.frames.length;
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskId }));
    const worker = delegated.target_agent_run_id as string;
    expect(worker).toBeTruthy();
    const nodes = await root.waitForNodes("worker and its helper", (all) => all.length >= 2);
    const helper = nodes.find((node) => node.agentRunId !== worker)!;
    task = await settledTask(scope, taskId, "delegated Task", (t) => t.root?.status === "idle");
    expect(task.root).toEqual({ kind: "agent", recipientAddress: workerAddress, ingressAgentRunId: worker, teamRunId: null,
      hostRoot: { kind: "agent", runId: root.rootId }, start: "started", startError: null, closed: false, status: "idle" });
    const rootsSeen = monitor.frames.slice(from).filter((f) => f.type === "task_upserted" && f.task.taskId === taskId && f.task.root)
      .map((f) => f.task.root.ingressAgentRunId);
    expect(new Set(rootsSeen)).toEqual(new Set([worker]));
    expect(rootsSeen).not.toContain(helper.agentRunId);
    const statusesAfterDelegation = monitor.frames.slice(from).filter((f) => f.type === "task_worker_status" && f.taskId === taskId).map((f) => f.status);
    record.statusesAfterDelegation = statusesAfterDelegation;
    // AC-003: the agent changes the status; one moved view; counts follow.
    from = monitor.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "IN_PROGRESS" }));
    task = await settledTask(scope, taskId, "IN_PROGRESS", (t) => t.status === "IN_PROGRESS");
    expect(task.root.closed).toBe(false);
    // AC-008: DONE. Views in commit order; the last view is DONE with a closed, Offline root (P-002); counts follow.
    from = monitor.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE" }));
    task = await settledTask(scope, taskId, "DONE", (t) => t.status === "DONE" && t.root?.closed === true);
    expect(task.root).toMatchObject({ ingressAgentRunId: worker, start: "started", closed: true, status: "offline" });
    const doneViews = monitor.frames.slice(from).filter((f) => f.type === "task_upserted" && f.task.taskId === taskId).map((f) => f.task);
    expect(doneViews.at(-1)).toMatchObject({ status: "DONE", root: { closed: true, status: "offline" } });
    for (const later of monitor.frames.slice(from).filter((f) => f.type === "task_worker_status" && f.taskId === taskId)
      .slice(-1)) expect(later.status).toBe("offline");
    await until(async () => expectEqual(feedProject(monitor.frames, projectId), (await graphql(PROJECT, { id: projectId })).project), "counts after DONE");
    expect(feedProject(monitor.frames, projectId)).toMatchObject({ taskCount: 1, openTaskCount: 0 });
    record.doneViews = doneViews.map((view) => ({ status: view.status, closed: view.root?.closed, rootStatus: view.root?.status }));
    // AC-023: the agent reopens; the Task moves, the root stays closed/Offline. The assigner's message reactivates it.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "IN_PROGRESS" }));
    task = await settledTask(scope, taskId, "reopened", (t) => t.status === "IN_PROGRESS");
    expect(task.root).toMatchObject({ closed: true, status: "offline" });
    from = monitor.frames.length;
    const reactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Another round." }));
    expect(reactivated.message).toMatch(/was reactivated\.$/);
    task = await settledTask(scope, taskId, "reactivated", (t) => t.root?.closed === false && t.root?.status === "idle");
    // P-001: the first turn after the wake reports Running, never a final Initializing.
    const afterWake = monitor.frames.slice(from).filter((f) => f.type === "task_worker_status" && f.taskId === taskId).map((f) => f.status);
    expect(afterWake.at(-1)).toBe("idle");
    record.statusesAfterReactivation = afterWake;
    // A UI delete removes the Task live; the Project's counts follow; deleting the Project removes it.
    await graphql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`, { input: { projectId, taskId } });
    await until(() => monitor.frames.some((f) => f.type === "task_removed" && f.taskId === taskId && sameScope(f, scope)), "task removed");
    await until(() => feedProject(monitor.frames, projectId)?.taskCount === 0, "count after delete");
    await graphql(`mutation($id:String!){deleteProject(projectId:$id)}`, { id: projectId });
    await until(() => monitor.frames.some((f) => f.type === "project_removed" && f.projectId === projectId), "project removed");
    root.close();
    await terminate("agent", root.rootId);
    evidence.agent = { ...record, rootId: root.rootId, projectId, taskId, worker, helper: helper.agentRunId, root: task.root };
  }, 300000);

  it("Team root: a real start failure shows Couldn't start; re-delegation replaces the root; a task Team root folds its members", async () => {
    // The /worker member is configured with a model its runtime does not offer: its copy cannot start (AC-007).
    const root = await startRoot("team", { llmModelIdentifier: "pcf-no-such-model" });
    const projectId = await createProject(`PCF team ${randomUUID().slice(0, 6)}`);
    const scope = { kind: "project", projectId };
    const taskId = await createTask(projectId, "Review the docs.");
    const failed = await root.managerCalls(callTool("delegate_task", { recipient_address: "/worker", task_id: taskId }));
    expect(failed.delegated ?? false).toBe(false);
    let task = await settledTask(scope, taskId, "failed start", (t) => t.root?.start === "failed");
    expect(task.status).toBe("TODO");
    expect(task.root).toMatchObject({ kind: "agent", recipientAddress: "/worker", start: "failed", closed: false, status: "offline",
      hostRoot: { kind: "agent_team", runId: root.rootId } });
    expect(task.root.startError.code).toBe("TASK_DISPATCH_FAILED");
    expect(task.root.startError.message).toMatch(/AGY_MODEL_UNAVAILABLE/);
    const failedRoot = task.root;
    // Re-delegation to a working member: the root is the new delegation only.
    const redelegated = await root.managerCalls(callTool("delegate_task", { recipient_address: "/helper", task_id: taskId }));
    task = await settledTask(scope, taskId, "re-delegated", (t) => t.root?.start === "started" && t.root?.status === "idle");
    expect(task.root).toMatchObject({ kind: "agent", recipientAddress: "/helper", ingressAgentRunId: redelegated.target_agent_run_id,
      startError: null, closed: false });
    // A task Team root: kind team, the coordinator as ingress, the team's folded status.
    const teamTaskId = await createTask(projectId, "Review with a team.");
    const teamDelegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.squad)}`, task_id: teamTaskId }));
    expect(teamDelegated.target_kind).toBe("team");
    const teamTask = await settledTask(scope, teamTaskId, "team root", (t) => t.root?.start === "started" && t.root?.status === "idle");
    expect(teamTask.root).toMatchObject({ kind: "team", ingressAgentRunId: teamDelegated.target_team_coordinator_agent_run_id, closed: false,
      hostRoot: { kind: "agent_team", runId: root.rootId } });
    expect(teamTask.root.teamRunId).toBeTruthy();
    // DONE closes the Team root: Offline.
    await root.managerCalls(callTool("create_or_update_task", { task_id: teamTaskId, status: "DONE" }));
    await settledTask(scope, teamTaskId, "team DONE", (t) => t.root?.closed === true && t.root?.status === "offline");
    root.close();
    await terminate("team", root.rootId);
    evidence.team = { rootId: root.rootId, projectId, failedRoot, redelegatedRoot: task.root, failed, teamRoot: teamTask.root };
  }, 300000);

  it("Org root: an Org-hosted root reports its worker's status and goes Offline at DONE", async () => {
    const root = await startRoot("org");
    const projectId = await createProject(`PCF org ${randomUUID().slice(0, 6)}`);
    const scope = { kind: "project", projectId };
    const taskId = await createTask(projectId, "Draft notes.");
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: "/worker", task_id: taskId }));
    const task = await settledTask(scope, taskId, "org root", (t) => t.root?.status === "idle");
    expect(task.root).toMatchObject({ kind: "agent", recipientAddress: "/worker", ingressAgentRunId: delegated.target_agent_run_id,
      hostRoot: { kind: "agent_org", runId: root.rootId }, start: "started", closed: false });
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE" }));
    await settledTask(scope, taskId, "org DONE", (t) => t.root?.closed === true && t.root?.status === "offline");
    root.close();
    await terminate("org", root.rootId);
    evidence.org = { rootId: root.rootId, projectId, root: task.root };
  }, 300000);

  it("Temp tasks: a described delegation arrives in the no-Project scope; DONE, reopen + reactivation follow; deleting the chat removes its Temp tasks", async () => {
    const root = await startRoot("agent");
    const scope = { kind: "no_project" };
    // AC-019: a plain-description delegation creates a Temp task; it arrives with its root.
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.worker)}`, description: "Summarize the meeting." }));
    const taskId = AD_HOC_ID.exec(JSON.stringify(delegated))?.[0] as string;
    expect(taskId, JSON.stringify(delegated)).toBeTruthy();
    let task = await settledTask(scope, taskId, "temp task", (t) => t.root?.status === "idle");
    expect(task).toMatchObject({ status: "TODO", description: "Summarize the meeting.", referenceFiles: [] });
    expect(task.root).toMatchObject({ kind: "agent", ingressAgentRunId: delegated.target_agent_run_id, start: "started", closed: false,
      hostRoot: { kind: "agent", runId: root.rootId } });
    // AC-020: DONE moves it; root Offline.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE" }));
    task = await settledTask(scope, taskId, "temp DONE", (t) => t.status === "DONE" && t.root?.closed === true);
    expect(task.root.status).toBe("offline");
    // AC-023 (Temp): the agent reopens to TODO (root stays Offline), then messages the worker (live again).
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "TODO" }));
    task = await settledTask(scope, taskId, "temp reopened", (t) => t.status === "TODO");
    expect(task.root).toMatchObject({ closed: true, status: "offline" });
    await root.managerCalls(callTool("send_message_to", { target_agent_run_id: delegated.target_agent_run_id, content: "One more pass." }));
    await settledTask(scope, taskId, "temp reactivated", (t) => t.root?.closed === false && t.root?.status === "idle");
    // A second Temp task of the same chat, then the chat is permanently deleted (AC-021): both leave live.
    const second = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Check the links." }));
    const secondId = AD_HOC_ID.exec(JSON.stringify(second))?.[0] as string;
    await settledTask(scope, secondId, "second temp task");
    root.close();
    await terminate("agent", root.rootId);
    const deleted = (await graphql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: root.rootId })).deleteStoredRun;
    expect(deleted.success, deleted.message).toBe(true);
    for (const id of [taskId, secondId]) {
      await until(() => monitor.frames.some((f) => f.type === "task_removed" && f.taskId === id && sameScope(f, scope)), `temp task ${id} removed`);
      expect(await gqlTempTask(id)).toBeNull();
    }
    evidence.temp = { rootId: root.rootId, taskIds: [taskId, secondId] };
  }, 300000);

  it("QR-001 under load: on a Project with 60 Tasks and a busy worker, a UI write reaches the feed within 2 s; message volume is recorded", async () => {
    const projectId = await createProject(`PCF volume ${randomUUID().slice(0, 6)}`);
    const taskIds: string[] = [];
    for (let i = 0; i < 60; i += 1) taskIds.push(await createTask(projectId, `Volume Task ${i}.`));
    const root = await startRoot("agent");
    const from = monitor.frames.length;
    await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: taskIds[0] }));
    for (let i = 0; i < 5; i += 1) {
      await root.managerCalls(callTool("create_or_update_task", { task_id: taskIds[0], status: i % 2 ? "TODO" : "IN_PROGRESS" }));
    }
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskIds[0], status: "DONE" }));
    await settledTask({ kind: "project", projectId }, taskIds[0]!, "volume DONE", (t) => t.status === "DONE" && t.root?.closed === true);
    const journey = monitor.frames.slice(from);
    // A UI write under this load: time from the mutation's response to its feed event.
    const sentAt = Date.now();
    await graphql(`mutation($input:UpdateProjectTaskInput!){updateProjectTask(input:$input){taskId}}`,
      { input: { projectId, taskId: taskIds[59], description: "Edited under load." } });
    await until(() => monitor.frames.some((f) => f.type === "task_upserted" && f.task.taskId === taskIds[59]
      && f.task.description === "Edited under load."), "edit arrives", 2_000);
    const latencyMs = Date.now() - sentAt;
    expect(latencyMs).toBeLessThanOrEqual(2_000);
    const counts: Record<string, number> = {};
    for (const frame of journey) counts[frame.type] = (counts[frame.type] ?? 0) + 1;
    root.close();
    await terminate("agent", root.rootId);
    evidence.volume = { tasks: 60, journeyFrames: journey.length, counts, uiWriteLatencyMs: latencyMs };
  }, 300000);

  it("every frame received in this run is a valid message of the strict server schema", () => {
    expect(allRaw.length).toBeGreaterThan(0);
    const invalid = allRaw.filter((text) => !ProjectChangeMessageSchema.safeParse(JSON.parse(text)).success);
    expect(invalid).toEqual([]);
  });
});
