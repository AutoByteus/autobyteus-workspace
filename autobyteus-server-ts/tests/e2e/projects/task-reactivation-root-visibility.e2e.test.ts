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
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { ProjectChangeMessageSchema } from "../../../src/projects/changes/project-change-messages.js";

// Reactivation of a DONE Task's worker (reactivate-done-task-runs AC-001..AC-008, AC-010, AC-012,
// AC-014, AC-015, QR-001, QR-002) through the real Studio HTTP/WebSocket server, scoped MCP,
// Project/Task services, roots, publishers and projectors, for the standalone Agent, Agent Team and
// Agent Org roots. Only the external AGY CLI is scripted: a message containing `CALL_TOOL:{...}`
// makes that agent call the actual agent tool and reply `CALLED:<tool result>`. No provider inference.
// The agent owns the Task status: every status change below is the Manager's own create_or_update_task.
// An optional case (RUN_CLAUDE_E2E=1 and a logged-in `claude`) gives the worker a real Claude model and
// proves it remembers its pre-DONE conversation after reactivation.
// Rendering and a real backend restart (AC-004, AC-011) are covered by `test:e2e:task-closure-tree` BR-008..BR-011.
// CLS-E2E-001/002 (task-closed-status AC-001, AC-003..AC-005, AC-011): the same live journey with CANCELLED ("dropped as
// not needed") in an Agent and a Team root: closure and physical stop, retry, refusals naming CANCELLED, DONE<->CANCELLED,
// reopen and reactivation, a Task with no Project, and the strict `/ws/projects` frames that carry CANCELLED.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const liveClaude = enabled && process.env.RUN_CLAUDE_E2E === "1"
  && spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type Kind = "agent" | "team" | "org";
type Ref = { agentRunId: string } | { teamRunId: string };
type TaskNode = Record<string, any> & { startedAt: string };
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"];
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const refOf = (node: Record<string, any>): Ref => node.teamRunId ? { teamRunId: node.teamRunId } : { agentRunId: node.agentRunId };
const keyOf = (ref: Record<string, any>) => ref.teamRunId ?? ref.team_run_id ? `team:${ref.teamRunId ?? ref.team_run_id}` : `agent:${ref.agentRunId ?? ref.agent_run_id}`;
const keys = (refs: readonly Record<string, any>[]) => refs.map(keyOf).sort();
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;

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
/** The `CALLED:<result>` replies of the scripted actor, in conversation order. */
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
/** Working directories of the live scripted AGY processes (one per running agent: `memory/agents/<run>/agy-project`). */
const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout);
/** Every object in a JSON value. */
const objectsIn = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Record<string, any>, ...Object.values(value).flatMap(objectsIn)];
};
/** The structured tool result inside a `CALLED:` reply (MCP `structuredContent`, else its JSON text content). */
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called }; }
};

suite("Reactivating a DONE Task's worker by run ID in every root (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", helper: "", assistant: "", squad: "", team: "", org: "", claudeOrg: "" };
  const names = { worker: "", helper: "", assistant: "", squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

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
    { input: { name, role: "assistant", description: `${name} (task reactivation E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
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
  const statusOf = async (projectId: string, taskId: string) => ((await graphql(
    `query($id:String!){projectTasks(projectId:$id){taskId status}}`, { id: projectId })).projectTasks as any[])
    .find((task) => task.taskId === taskId)?.status as string | undefined;
  const projectTaskDir = (projectId: string, taskId: string) =>
    path.join(dataDir, "projects", encodeURIComponent(projectId), "tasks", encodeURIComponent(taskId));
  const adHocTaskDir = (taskId: string) => path.join(dataDir, "ad-hoc-tasks", taskId);
  const readBytes = (file: string) => fs.readFile(file, "utf8");
  /** `closedAt` of every entry of a Task's `agent_run_resources.json`, by run key. */
  const closedAtByKey = async (taskDir: string) => {
    const file = JSON.parse(await readBytes(path.join(taskDir, "agent_run_resources.json")));
    return Object.fromEntries((file.agentRunResources as any[]).map((entry) => [
      entry.agentRun.kind === "team" ? `team:${entry.agentRun.teamRunId}` : `agent:${entry.agentRun.agentRunId}`, entry.closedAt]));
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-reactivation-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = path.join(dataDir, "agy-argv.jsonl");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.worker = `TRA Worker ${suffix}`; names.helper = `TRA Helper ${suffix}`; names.assistant = `TRA Assistant ${suffix}`;
    names.squad = `TRA Squad ${suffix}`;
    ids.manager = await agentDefinition(`TRA Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(names.worker, []);
    ids.helper = await agentDefinition(names.helper, []);
    ids.assistant = await agentDefinition(names.assistant, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `TRA Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" },
          { memberName: "helper", ref: ids.helper, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    const orgMembers = [{ memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "worker", ref: ids.worker, refType: "AGENT", refScope: "SHARED" },
      { memberName: "helper", ref: ids.helper, refType: "AGENT", refScope: "SHARED" },
      { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }];
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `TRA Org ${suffix}`, description: "Org root", instructions: "Follow requests.", members: orgMembers, handoffs: [] } },
    )).createAgentOrgDefinition.id;
    ids.claudeOrg = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `TRA Claude Org ${suffix}`, description: "Org root with a real-model worker", instructions: "Follow requests.",
        members: orgMembers.slice(0, 2), handoffs: [] } },
    )).createAgentOrgDefinition.id;
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_REACTIVATION_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "task-reactivation-root-visibility.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  /** A root of one kind with the Manager, its channels, and readers of its view. */
  const startRoot = async (kind: Kind, orgDefinitionId = ids.org, agentOverrides: unknown[] = []) => {
    let rootId: string, managerRunId: string;
    const members: Record<string, string> = {};
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() },
          { memberAddress: "/helper", agentDefinitionId: ids.helper, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      for (const member of flattenE2eConfiguredAgentExecutions(tree)) members[member.memberAddress] = member.agentRunId;
      managerRunId = members["/manager"]!;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: orgDefinitionId, rootConfiguration: config(), agentOverrides, teamOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      for (const member of tree.rootOrg.members as any[]) if (member.agentRunId) members[member.address] = member.agentRunId;
      managerRunId = members["/manager"]!;
    }
    active.push({ kind, rootId });
    expect(managerRunId).toBeTruthy();

    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const inputChannel = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null;
    const openView = () => connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
    const state = { view: await openView() };
    /** What the user's composer sends to one agent of the root (the Manager, or a configured member). */
    const sendTo = (agentRunId: string, content: string) => {
      if (kind === "org") state.view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : state.view.socket, { agent_run_id: agentRunId, content });
    };
    const snapshot = async () => {
      state.view.socket.close();
      state.view = await openView();
      const payload = state.view.frames.find(isSnapshot)!.payload;
      const body = kind === "agent" ? payload.root_agent : kind === "org" ? payload.root_org : payload;
      return { tree: body.execution_tree, closed: body.closed_task_executions as Record<string, any>[] };
    };
    const liveTree = async () => {
      if (kind === "agent") return (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    };
    const conversationOf = async (agentRunId: string, address: string) => {
      if (kind === "agent" && agentRunId === rootId) return (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`,
        { id: agentRunId })).getRunProjection?.conversation;
      if (kind === "agent") return (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
    };
    /** Sends one scripted tool call to an agent of the root and returns that agent's tool result. */
    const agentCalls = async (agentRunId: string, address: string, content: string) => {
      const before = calledResults(await conversationOf(agentRunId, address)).length;
      sendTo(agentRunId, content);
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(agentRunId, address)); return results.length > before; },
        `tool result of ${address} for ${content.slice(0, 120)}`, 60_000);
      return toolResult(results[before]!);
    };
    const managerAddress = kind === "agent" ? "/" : "/manager";
    const managerCalls = (content: string) => agentCalls(managerRunId, managerAddress, content);
    const waitForNodes = async (label: string, predicate: (nodes: TaskNode[]) => boolean) => {
      let nodes: TaskNode[] = [];
      await until(async () => { nodes = taskNodes(await liveTree()); return predicate(nodes); }, label, 60_000)
        .catch((error) => { throw new Error(`${error.message}; nodes=${JSON.stringify(nodes).slice(0, 2000)}`); });
      return nodes;
    };
    const closedFrame = (frame: Frame) => kind === "team" ? frame.type === "TASK_EXECUTIONS_CLOSED"
      : frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_closed";
    const reopenedFrame = (frame: Frame) => kind === "team" ? frame.type === "TASK_EXECUTIONS_REOPENED"
      : frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_reopened";
    const refsOf = (frame: Frame) => kind === "team" ? frame.payload.task_executions : frame.payload.event.task_executions;
    const close = () => { state.view.socket.close(); inputChannel?.socket.close(); };
    return { kind, rootId, managerRunId, members, state, sendTo, snapshot, liveTree, conversationOf, agentCalls, managerCalls,
      waitForNodes, closedFrame, reopenedFrame, refsOf, close };
  };

  /** One root kind: delegate, DONE, every refusal, reactivation of an Agent and a Team copy, the cycle, delete, ad hoc. */
  const rootScenario = async (kind: Kind) => {
    const record: Record<string, unknown> = {};
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Task reactivation ${kind} ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const task = async (description: string) => (await graphql(
      `mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, description } })).createProjectTask.taskId as string;
    const workerAddress = kind === "agent" ? `/${segment(names.worker)}` : "/worker";
    const helperAddress = kind === "agent" ? `/${segment(names.helper)}` : "/helper";
    const teamAddress = kind === "org" ? "/squad" : `/${segment(names.squad)}`;
    // Task A: the worker's own work sub-delegates to the helper, which brings in the assistant (two helpers of Task A).
    const taskA = await task(callTool("delegate_task", { recipient_address: helperAddress,
      description: callTool("send_message_to", { recipient_address: `/${segment(names.assistant)}`, content: "Reply OK." }) }));
    const taskB = await task("Review the docs site.");
    const root = await startRoot(kind);
    const { managerRunId } = root;
    const aDir = projectTaskDir(projectId, taskA), bDir = projectTaskDir(projectId, taskB);

    // 1. Delegations return the ingress run ID and its kind (AC-012).
    const delegatedA = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskA }));
    expect(delegatedA).toMatchObject({ target_kind: "agent" });
    const worker = delegatedA.target_agent_run_id as string;
    expect(worker).toBeTruthy();
    const aNodes = await root.waitForNodes("Task A worker and its two helpers", (nodes) => nodes.length >= 3);
    const aRefs = aNodes.map(refOf);
    const workerNode = aNodes.find((node) => node.agentRunId === worker)!;
    expect(workerNode?.delegatorAgentRunId).toBe(managerRunId);
    const helpers = aNodes.filter((node) => node !== workerNode);
    expect(helpers).toHaveLength(2);
    const delegatedB = await root.managerCalls(callTool("delegate_task", { recipient_address: teamAddress, task_id: taskB }));
    expect(delegatedB).toMatchObject({ delegated: true, target_kind: "team" });
    expect(delegatedB).not.toHaveProperty("target_agent_run_id");
    const coordinator = delegatedB.target_team_coordinator_agent_run_id as string;
    expect(delegatedB.target_team_run_id).toBeTruthy();
    const bNode = (await root.waitForNodes("Task B Team copy", (nodes) => nodes.some((node) => node.teamRunId))).find((node) => node.teamRunId)!;
    expect(bNode.members.map((member: any) => member.agentRunId)).toContain(coordinator);
    const mate = bNode.members.find((member: any) => member.agentRunId !== coordinator)!.agentRunId as string;
    const bMembersBefore = bNode.members.map((member: any) => member.agentRunId).sort();
    const delegatedPlain = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, description: "Draft a short summary." }));
    expect(delegatedPlain).toMatchObject({ target_kind: "agent" });
    const adHocTaskId = AD_HOC_ID.exec(JSON.stringify(delegatedPlain))?.[0] as string;
    expect(adHocTaskId, JSON.stringify(delegatedPlain)).toBeTruthy();
    const plain = delegatedPlain.target_agent_run_id as string;
    record.delegations = { delegatedA, delegatedB, delegatedPlain };

    // 2. An open worker is messaged as before: no reactivation note (AC-014).
    const open = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Status of Task A? Marker PRE-DONE-7731." }));
    expect(open).toMatchObject({ accepted: true, target_agent_run_id: worker });
    expect(open.message).not.toMatch(/reactivated/);
    let workerConversationBefore = "";
    await until(async () => { workerConversationBefore = JSON.stringify(await root.conversationOf(worker, workerNode.address));
      return workerConversationBefore.includes("PRE-DONE-7731") && calledResults(await root.conversationOf(worker, workerNode.address)).length >= 1; },
    "worker received the pre-DONE message", 60_000);

    // 3. DONE by the Manager: Task A's three runs close.
    let from = root.state.view.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "DONE" }));
    await until(() => root.state.view.frames.slice(from).some(root.closedFrame), "live closure of Task A", 60_000);
    expect(keys(root.refsOf(root.state.view.frames.slice(from).find(root.closedFrame)!))).toEqual(keys(aRefs));
    expect(await statusOf(projectId, taskA)).toBe("DONE");

    // 4. AC-015: while the Task is DONE the assigner's message is refused with the reopen-first hint; nothing changes.
    const resourcesDone = await readBytes(path.join(aDir, "agent_run_resources.json"));
    const taskDone = await readBytes(path.join(aDir, "task.json"));
    let view = root.state.view; from = view.frames.length;
    const tooEarly = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Too early?" }));
    expect(tooEarly).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(tooEarly.message).toMatch(/This Task is DONE\. Move it to TODO or IN_PROGRESS with create_or_update_task first/);
    expect(await readBytes(path.join(aDir, "agent_run_resources.json"))).toBe(resourcesDone);
    expect(await readBytes(path.join(aDir, "task.json"))).toBe(taskDone);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);
    expect(keys((await root.snapshot()).closed)).toEqual(keys(aRefs));
    expect(JSON.stringify(await root.conversationOf(worker, workerNode.address))).not.toContain("Too early?");

    // 5. The agent reopens the Task itself: a status change alone reopens nothing (AC-014, BEH-002).
    view = root.state.view; from = view.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "IN_PROGRESS" }));
    expect(await statusOf(projectId, taskA)).toBe("IN_PROGRESS");
    expect(await readBytes(path.join(aDir, "agent_run_resources.json"))).toBe(resourcesDone);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);
    expect(keys((await root.snapshot()).closed)).toEqual(keys(aRefs));
    const taskReopened = await readBytes(path.join(aDir, "task.json"));

    // 6. AC-005: a helper is not an assignment: refused with the assigner-only, delegate_task run-ID guidance.
    view = root.state.view; from = view.frames.length;
    const toHelper = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: helpers[0]!.agentRunId, content: "Helper?" }));
    expect(toHelper).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(toHelper.message).toMatch(/Only the run that assigned (it|the work) can reactivate it.*message the copy's agent run ID/);

    // 7. QR-002 / AC-006: a sender that is not the assigner cannot reactivate. In a Team or Org root, a configured
    // teammate; in a standalone Agent root, the other senders are Task copies (a copy whose work is that message).
    let nonAssigner: Record<string, any>;
    if (kind === "agent") {
      const probe = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress,
        description: callTool("send_message_to", { target_agent_run_id: worker, content: "From a non-assigner." }) }));
      const probeNode = (await root.waitForNodes("non-assigner copy", (nodes) => nodes.some((node) => node.agentRunId === probe.target_agent_run_id)))
        .find((node) => node.agentRunId === probe.target_agent_run_id)!;
      let results: string[] = [];
      await until(async () => { results = calledResults(await root.conversationOf(probeNode.agentRunId, probeNode.address)); return results.length >= 1; },
        "non-assigner copy's send result", 60_000);
      nonAssigner = toolResult(results[0]!);
    } else {
      const teammate = kind === "team" ? "/worker" : "/helper";
      nonAssigner = await root.agentCalls(root.members[teammate]!, teammate,
        callTool("send_message_to", { target_agent_run_id: worker, content: "From a non-assigner." }));
    }
    expect(nonAssigner).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(nonAssigner.message).toMatch(/Only the run that assigned it can reactivate it/);
    expect(await readBytes(path.join(aDir, "agent_run_resources.json"))).toBe(resourcesDone);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);
    expect(JSON.stringify(await root.conversationOf(worker, workerNode.address))).not.toContain("From a non-assigner.");
    record.refusals = { tooEarly, toHelper, nonAssigner };

    // 8. AC-001: the assigner's run-ID message reactivates exactly the worker, which continues its conversation.
    view = root.state.view; from = view.frames.length;
    const argvBefore = (await readBytes(process.env["AGY_FAKE_ARGV_LOG"]!)).trim().split("\n").length;
    const reactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Second round for Task A. Marker POST-REOPEN-9902." }));
    expect(reactivated).toMatchObject({ accepted: true, target_agent_run_id: worker });
    expect(reactivated.message).toMatch(new RegExp(`${worker} was reactivated\\.$`));
    await until(() => view.frames.slice(from).some(root.reopenedFrame), "live task_executions_reopened", 30_000);
    const reopenedEvents = view.frames.slice(from).filter(root.reopenedFrame);
    expect(reopenedEvents).toHaveLength(1);
    expect(keys(root.refsOf(reopenedEvents[0]!))).toEqual([`agent:${worker}`]);
    let workerConversation = "";
    await until(async () => { workerConversation = JSON.stringify(await root.conversationOf(worker, workerNode.address));
      return workerConversation.includes("POST-REOPEN-9902") && workerConversation.lastIndexOf("OK") > workerConversation.indexOf("POST-REOPEN-9902"); },
    "reactivated worker answered", 60_000);
    // Same run, earlier conversation kept in front of the new message (REQ-002).
    expect(workerConversation.indexOf("PRE-DONE-7731")).toBeGreaterThan(-1);
    expect(workerConversation.indexOf("PRE-DONE-7731")).toBeLessThan(workerConversation.indexOf("POST-REOPEN-9902"));
    const helperKeys = keys(helpers.map(refOf));
    const afterReactivation = await root.snapshot();
    expect(keys(afterReactivation.closed)).toEqual(helperKeys);
    expect(taskNodes(afterReactivation.tree).filter((node) => node.agentRunId === worker)).toHaveLength(1);
    // Restored with an exact provider-conversation binding: the relaunch resumes an existing conversation.
    const launches = (await readBytes(process.env["AGY_FAKE_ARGV_LOG"]!)).trim().split("\n").slice(argvBefore).map((line) => JSON.parse(line).argv as string[]);
    const resumed = launches.filter((argv) => argv.includes("--conversation")).map((argv) => argv[argv.indexOf("--conversation") + 1]!);
    expect(resumed, JSON.stringify(launches)).toHaveLength(1);
    // The resumed provider conversation is the one stored on this worker's node of the root's run tree before DONE.
    const conversationHits = spawnSync("grep", ["-rl", resumed[0]!, path.join(dataDir, "memory")], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
    const boundToWorker = (await Promise.all(conversationHits.map(async (file) => objectsIn(JSON.parse(await readBytes(file)))
      .some((node) => (node.agentRunId ?? node.agent_run_id) === worker && JSON.stringify(node).includes(resumed[0]!))))).some(Boolean);
    expect(boundToWorker, JSON.stringify(conversationHits)).toBe(true);
    // Only the worker's entry is open; the Task status is what the agent set; task.json was not written (REQ-003/004).
    const entries = await closedAtByKey(aDir);
    expect(entries[`agent:${worker}`]).toBeNull();
    for (const key of helperKeys) expect(entries[key]).toEqual(expect.any(String));
    expect(await readBytes(path.join(aDir, "task.json"))).toBe(taskReopened);
    expect(await statusOf(projectId, taskA)).toBe("IN_PROGRESS");
    // A helper stays closed after the reactivation (AC-005).
    const helperAfter = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: helpers[1]!.agentRunId, content: "Helper again?" }));
    expect(helperAfter).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });

    // 9. A second message to the now-open worker takes the unchanged path: no note, no event (RU-1, AC-014).
    view = root.state.view; from = view.frames.length;
    const followUp = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "And one more thing." }));
    expect(followUp).toMatchObject({ accepted: true });
    expect(followUp.message).not.toMatch(/reactivated/);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);

    // 10. AC-010: DONE closes the reactivated worker again; reopen + message reactivates it again.
    view = root.state.view; from = view.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "DONE" }));
    await until(() => view.frames.slice(from).some(root.closedFrame), "closure of the reactivated worker", 60_000);
    expect(keys(root.refsOf(view.frames.slice(from).find(root.closedFrame)!))).toContain(`agent:${worker}`);
    expect(keys((await root.snapshot()).closed)).toEqual(keys(aRefs));
    expect((await closedAtByKey(aDir))[`agent:${worker}`]).toEqual(expect.any(String));
    const fencedAgain = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Still DONE?" }));
    expect(fencedAgain).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "TODO" }));
    view = root.state.view; from = view.frames.length;
    const again = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Third round. Marker CYCLE-2." }));
    expect(again).toMatchObject({ accepted: true });
    expect(again.message).toMatch(/was reactivated\.$/);
    await until(() => view.frames.slice(from).some(root.reopenedFrame), "second reactivation event", 30_000);
    await until(async () => JSON.stringify(await root.conversationOf(worker, workerNode.address)).includes("CYCLE-2"), "worker got the third round", 60_000);
    expect(await statusOf(projectId, taskA)).toBe("TODO");
    expect(keys((await root.snapshot()).closed)).toEqual(helperKeys);

    // 11. AC-002 / AC-007: a Team copy is reactivated as a whole through its coordinator; a member is refused.
    view = root.state.view; from = view.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "DONE" }));
    await until(() => view.frames.slice(from).some(root.closedFrame), "closure of Task B", 60_000);
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "IN_PROGRESS" }));
    const resourcesB = await readBytes(path.join(bDir, "agent_run_resources.json"));
    const toMember = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: mate, content: "Member?" }));
    expect(toMember).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(toMember.message).toMatch(/for a Team copy, its coordinator's/);
    expect(await readBytes(path.join(bDir, "agent_run_resources.json"))).toBe(resourcesB);
    view = root.state.view; from = view.frames.length;
    const teamReactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: coordinator, content: "Team, second round. Marker TEAM-REOPEN-5150." }));
    expect(teamReactivated).toMatchObject({ accepted: true, target_agent_run_id: coordinator });
    expect(teamReactivated.message).toMatch(new RegExp(`${coordinator} was reactivated\\.$`));
    await until(() => view.frames.slice(from).some(root.reopenedFrame), "Team copy reopened event", 30_000);
    expect(keys(root.refsOf(view.frames.slice(from).find(root.reopenedFrame)!))).toEqual([`team:${bNode.teamRunId}`]);
    const coordinatorAddress = bNode.members.find((member: any) => member.agentRunId === coordinator)!.address;
    await until(async () => JSON.stringify(await root.conversationOf(coordinator, coordinatorAddress)).includes("TEAM-REOPEN-5150"),
      "coordinator received the message", 60_000);
    const teamAfter = await root.snapshot();
    const bAfter = taskNodes(teamAfter.tree).filter((node) => node.teamRunId === bNode.teamRunId);
    expect(bAfter).toHaveLength(1);
    expect(bAfter[0]!.members.map((member: any) => member.agentRunId).sort()).toEqual(bMembersBefore);
    expect(keys(teamAfter.closed)).not.toContain(`team:${bNode.teamRunId}`);
    expect((await closedAtByKey(bDir))[`team:${bNode.teamRunId}`]).toBeNull();
    record.team = { teamRunId: bNode.teamRunId, coordinator, mate, members: bMembersBefore, toMember, teamReactivated };

    // 12. AC-008: after DONE and Task delete, the coordinator cannot be reactivated; nothing is published.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "DONE" }));
    expect((await graphql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`,
      { input: { projectId, taskId: taskB } })).deleteProjectTask).toBe(true);
    view = root.state.view; from = view.frames.length;
    const deleted = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: coordinator, content: "Deleted?" }));
    expect(deleted).toMatchObject({ accepted: false, code: "TASK_NOT_FOUND" });
    expect(deleted.message).toMatch(/The Task was deleted; its work cannot be reactivated/);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);
    expect(keys((await root.snapshot()).closed)).toContain(`team:${bNode.teamRunId}`);

    // 13. AC-003: a Task with no Project (description-only delegation) reopened to TODO by task_id, then messaged.
    const adHocDone = await root.managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, status: "DONE" }));
    expect(JSON.stringify(adHocDone)).toContain(adHocTaskId);
    await root.managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, status: "TODO" }));
    const adHocTaskBytes = await readBytes(path.join(adHocTaskDir(adHocTaskId), "task.json"));
    view = root.state.view; from = view.frames.length;
    const adHocReactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: plain, content: "Ad hoc, again." }));
    expect(adHocReactivated).toMatchObject({ accepted: true });
    expect(adHocReactivated.message).toMatch(/was reactivated\.$/);
    await until(() => view.frames.slice(from).some(root.reopenedFrame), "ad hoc copy reopened event", 30_000);
    expect(JSON.parse(await readBytes(path.join(adHocTaskDir(adHocTaskId), "task.json"))).status).toBe("TODO");
    expect(await readBytes(path.join(adHocTaskDir(adHocTaskId), "task.json"))).toBe(adHocTaskBytes);
    expect((await closedAtByKey(adHocTaskDir(adHocTaskId)))[`agent:${plain}`]).toBeNull();

    root.close();
    await terminate(kind, root.rootId);
    evidence[kind] = { ...record, rootId: root.rootId, managerRunId, projectId, taskA, taskB, adHocTaskId, worker, helpers: helpers.map(refOf),
      reactivated, followUp, again, deleted, adHocReactivated, reopenedEvent: root.refsOf(reopenedEvents[0]!), resumedConversation: resumed[0], conversationFiles: conversationHits.length };
  };

  /** task-closed-status: CANCELLED ends a Task's work exactly like DONE, refuses new and reactivated work naming CANCELLED, and reopens. */
  const cancelledScenario = async (kind: Kind) => {
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Task cancelled ${kind} ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const taskC = (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, description: "Draft the migration guide." } })).createProjectTask.taskId as string;
    const cDir = projectTaskDir(projectId, taskC);
    const workerAddress = kind === "agent" ? `/${segment(names.worker)}` : "/worker";
    // A raw /ws/projects client: every frame must satisfy the strict server schema, including CANCELLED views.
    const feed = new WebSocket(`ws://${url.host}/ws/projects`);
    sockets.push(feed);
    const feedFrames: any[] = [];
    feed.on("message", (raw: unknown) => feedFrames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { feed.once("open", resolve); feed.once("error", reject); });
    await until(() => feedFrames.some((f) => f.type === "connected"), "projects feed connected");
    const upserts = (taskId: string, from = 0) => feedFrames.slice(from).filter((f) => f.type === "task_upserted" && f.task.taskId === taskId).map((f) => f.task);
    const root = await startRoot(kind);
    const status = () => statusOf(projectId, taskC);
    const openCount = async () => (await graphql(`query($id:String!){project(projectId:$id){taskCount openTaskCount}}`, { id: projectId })).project;
    const record: Record<string, unknown> = {};

    // Delegate and talk to the worker before the close.
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskC }));
    expect(delegated).toMatchObject({ target_kind: "agent" });
    const worker = delegated.target_agent_run_id as string;
    const workerNode = (await root.waitForNodes("Task C worker", (nodes) => nodes.some((node) => node.agentRunId === worker)))
      .find((node) => node.agentRunId === worker)!;
    await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Start the guide. Marker PRE-CLOSE-4410." }));
    await until(async () => JSON.stringify(await root.conversationOf(worker, workerNode.address)).includes("PRE-CLOSE-4410"), "worker got the pre-close message", 60_000);
    await until(() => liveAgyCwds().some((cwd) => cwd.includes(worker)), "worker process is live before the close", 30_000);
    expect(await openCount()).toEqual({ taskCount: 1, openTaskCount: 1 });

    // AC-001 / AC-004: the Manager closes the Task as not needed: ack CANCELLED, one live closure of exactly the worker,
    // its entry closed, its process stopped, and the feed carries CANCELLED with a closed root.
    let view = root.state.view; let from = view.frames.length; let feedFrom = feedFrames.length;
    const ack = await root.managerCalls(callTool("create_or_update_task", { task_id: taskC, status: "CANCELLED" }));
    expect(ack).toMatchObject({ task: { projectId, taskId: taskC, status: "CANCELLED" } });
    await until(() => view.frames.slice(from).some(root.closedFrame), "live closure on CANCELLED", 60_000);
    expect(keys(root.refsOf(view.frames.slice(from).find(root.closedFrame)!))).toEqual([`agent:${worker}`]);
    expect(await status()).toBe("CANCELLED");
    expect((await closedAtByKey(cDir))[`agent:${worker}`]).toEqual(expect.any(String));
    await until(() => liveAgyCwds().every((cwd) => !cwd.includes(worker)), "no live worker process after CANCELLED", 30_000);
    expect(keys((await root.snapshot()).closed)).toEqual([`agent:${worker}`]);
    await until(() => upserts(taskC, feedFrom).some((t) => t.status === "CANCELLED" && t.root?.closed === true && t.root?.status === "offline"),
      "feed: CANCELLED view with a closed, Offline root", 30_000);
    expect(await openCount()).toEqual({ taskCount: 1, openTaskCount: 0 });
    const resourcesClosed = await readBytes(path.join(cDir, "agent_run_resources.json"));
    const taskCancelled = await readBytes(path.join(cDir, "task.json"));

    // AC-004: repeating CANCELLED re-requests the stop (closure re-published) and changes no file.
    view = root.state.view; from = view.frames.length;
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskC, status: "CANCELLED" }));
    await until(() => view.frames.slice(from).some(root.closedFrame), "repeated CANCELLED re-publishes the closure", 60_000);
    expect(await readBytes(path.join(cDir, "agent_run_resources.json"))).toBe(resourcesClosed);
    expect(await readBytes(path.join(cDir, "task.json"))).toBe(taskCancelled);

    // AC-005: while CANCELLED, saved-ID delegation spawns nothing and a run-ID message is refused; both name CANCELLED.
    const nodesBefore = taskNodes(await root.liveTree()).length;
    view = root.state.view; from = view.frames.length;
    const redelegated = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskC }));
    expect(redelegated).toEqual({ error: { code: "TASK_AGENT_RESOURCE_CLOSED",
      message: "The Task is CANCELLED; move it to TODO or IN_PROGRESS before assigning new work." } });
    const fenced = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "While cancelled?" }));
    expect(fenced).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(fenced.message).toMatch(/This Task is CANCELLED\. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again\./);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(taskNodes(await root.liveTree()).length).toBe(nodesBefore);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);
    expect(await readBytes(path.join(cDir, "agent_run_resources.json"))).toBe(resourcesClosed);
    expect(await readBytes(path.join(cDir, "task.json"))).toBe(taskCancelled);
    expect(JSON.stringify(await root.conversationOf(worker, workerNode.address))).not.toContain("While cancelled?");
    expect(liveAgyCwds().every((cwd) => !cwd.includes(worker))).toBe(true);
    record.refusals = { redelegated, fenced };

    // DONE<->CANCELLED behaves as a repeated DONE: closure re-published, resources unchanged, refusals name the current status.
    for (const next of ["DONE", "CANCELLED"] as const) {
      view = root.state.view; from = view.frames.length;
      await root.managerCalls(callTool("create_or_update_task", { task_id: taskC, status: next }));
      await until(() => view.frames.slice(from).some(root.closedFrame), `${next} after a terminal status re-publishes the closure`, 60_000);
      expect(await status()).toBe(next);
      expect(await readBytes(path.join(cDir, "agent_run_resources.json"))).toBe(resourcesClosed);
      const refused = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: `Still ${next}?` }));
      expect(refused).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
      expect(refused.message).toMatch(new RegExp(`This Task is ${next}\\.`));
    }

    // AC-003: the agent reopens the Task: the status changes live, nothing starts, the entry stays closed.
    view = root.state.view; from = view.frames.length; feedFrom = feedFrames.length;
    const reopenedAck = await root.managerCalls(callTool("create_or_update_task", { task_id: taskC, status: "IN_PROGRESS" }));
    expect(reopenedAck).toMatchObject({ task: { taskId: taskC, status: "IN_PROGRESS" } });
    await until(() => upserts(taskC, feedFrom).some((t) => t.status === "IN_PROGRESS"), "feed: reopened view", 30_000);
    expect(await readBytes(path.join(cDir, "agent_run_resources.json"))).toBe(resourcesClosed);
    expect(view.frames.slice(from).some(root.reopenedFrame)).toBe(false);
    expect(keys((await root.snapshot()).closed)).toEqual([`agent:${worker}`]);
    expect(liveAgyCwds().every((cwd) => !cwd.includes(worker))).toBe(true);
    expect(await openCount()).toEqual({ taskCount: 1, openTaskCount: 1 });

    // AC-005 (after reopen): the assigner's message reactivates exactly the worker, which continues its conversation.
    view = root.state.view; from = view.frames.length;
    const reactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Back on. Marker POST-CLOSE-7720." }));
    expect(reactivated).toMatchObject({ accepted: true, target_agent_run_id: worker });
    expect(reactivated.message).toMatch(new RegExp(`${worker} was reactivated\\.$`));
    await until(() => view.frames.slice(from).some(root.reopenedFrame), "live task_executions_reopened after a CANCELLED reopen", 30_000);
    expect(keys(root.refsOf(view.frames.slice(from).find(root.reopenedFrame)!))).toEqual([`agent:${worker}`]);
    let conversation = "";
    await until(async () => { conversation = JSON.stringify(await root.conversationOf(worker, workerNode.address));
      return conversation.includes("POST-CLOSE-7720"); }, "reactivated worker got the message", 60_000);
    expect(conversation.indexOf("PRE-CLOSE-4410")).toBeGreaterThan(-1);
    expect(conversation.indexOf("PRE-CLOSE-4410")).toBeLessThan(conversation.indexOf("POST-CLOSE-7720"));
    expect((await closedAtByKey(cDir))[`agent:${worker}`]).toBeNull();
    expect(await status()).toBe("IN_PROGRESS");

    // A Task with no Project (Temp task): CANCELLED by task_id alone closes its copy, fences it, reopens and reactivates.
    const plainDelegated = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, description: "Collect the open questions." }));
    const adHocTaskId = AD_HOC_ID.exec(JSON.stringify(plainDelegated))?.[0] as string;
    expect(adHocTaskId, JSON.stringify(plainDelegated)).toBeTruthy();
    const plain = plainDelegated.target_agent_run_id as string;
    await root.waitForNodes("Temp task copy", (nodes) => nodes.some((node) => node.agentRunId === plain));
    view = root.state.view; from = view.frames.length; feedFrom = feedFrames.length;
    const adHocAck = await root.managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, status: "CANCELLED" }));
    expect(adHocAck).toMatchObject({ task: { projectId: null, taskId: adHocTaskId, status: "CANCELLED" } });
    await until(() => view.frames.slice(from).some(root.closedFrame), "live closure of the Temp task copy", 60_000);
    expect(keys(root.refsOf(view.frames.slice(from).find(root.closedFrame)!))).toEqual([`agent:${plain}`]);
    expect(JSON.parse(await readBytes(path.join(adHocTaskDir(adHocTaskId), "task.json"))).status).toBe("CANCELLED");
    expect(((await graphql(`query{tasksWithoutProject{taskId status}}`)).tasksWithoutProject as any[]).find((t) => t.taskId === adHocTaskId)?.status).toBe("CANCELLED");
    await until(() => feedFrames.slice(feedFrom).some((f) => f.type === "task_upserted" && f.scope.kind === "no_project"
      && f.task.taskId === adHocTaskId && f.task.status === "CANCELLED"), "feed: Temp task CANCELLED", 30_000);
    await until(() => liveAgyCwds().every((cwd) => !cwd.includes(plain)), "no live Temp copy process after CANCELLED", 30_000);
    const adHocFenced = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: plain, content: "Temp, cancelled?" }));
    expect(adHocFenced).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(adHocFenced.message).toMatch(/This Task is CANCELLED\./);
    await root.managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, status: "TODO" }));
    view = root.state.view; from = view.frames.length;
    const adHocReactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: plain, content: "Temp, again." }));
    expect(adHocReactivated).toMatchObject({ accepted: true });
    expect(adHocReactivated.message).toMatch(/was reactivated\.$/);
    await until(() => view.frames.slice(from).some(root.reopenedFrame), "Temp copy reopened event", 30_000);

    // Every /ws/projects frame of this journey matched the strict server schema (CANCELLED included).
    const invalid = feedFrames.filter((frame) => !ProjectChangeMessageSchema.safeParse(frame).success);
    expect(invalid, JSON.stringify(invalid).slice(0, 2000)).toEqual([]);
    const statusesSeen = [...new Set(feedFrames.filter((f) => f.type === "task_upserted").map((f) => f.task.status))].sort();
    expect(statusesSeen).toEqual(expect.arrayContaining(["CANCELLED", "DONE", "IN_PROGRESS", "TODO"]));
    feed.close();
    root.close();
    await terminate(kind, root.rootId);
    evidence[`closed-${kind}`] = { ...record, rootId: root.rootId, projectId, taskC, worker, ack, reopenedAck, reactivated,
      adHocTaskId, plain, adHocAck, adHocFenced, adHocReactivated, feedFrames: feedFrames.length, statusesSeen };
  };

  it("CLS-E2E-001 standalone Agent root: CANCELLED closes and stops the worker, retry, refusals naming CANCELLED, DONE<->CANCELLED, reopen and reactivation, Temp task CANCELLED", async () => {
    await cancelledScenario("agent");
  }, 300000);

  it("CLS-E2E-002 Agent Team root: the same CANCELLED journey through the Team stream (TASK_EXECUTIONS_CLOSED / _REOPENED)", async () => {
    await cancelledScenario("team");
  }, 300000);

  it("standalone Agent root: target_kind, refused while DONE, status-only reopen, helper and non-assigner refusals, Agent and Team copy reactivation, DONE cycle, deleted Task, ad hoc TODO", async () => {
    await rootScenario("agent");
  }, 300000);

  it("Agent Team root: the same journey through the Team stream (TASK_EXECUTIONS_REOPENED); a teammate cannot reactivate", async () => {
    await rootScenario("team");
  }, 300000);

  it("Agent Org root: the same journey through the Org stream; an Org member cannot reactivate", async () => {
    await rootScenario("org");
  }, 300000);

  it("QR-001: a DONE from another root racing the assigner's reactivating message never leaves a DONE Task with an open entry", async () => {
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Task reactivation race ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const taskId = (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, description: "Write the release notes." } })).createProjectTask.taskId as string;
    const root = await startRoot("agent");
    const other = await startRoot("agent");
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: taskId }));
    const worker = delegated.target_agent_run_id as string;
    await root.waitForNodes("worker started", (nodes) => nodes.some((node) => node.agentRunId === worker));
    const rounds: unknown[] = [];
    for (let round = 1; round <= 3; round += 1) {
      await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE" }));
      await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "IN_PROGRESS" }));
      // Two agents act at once: the other Manager closes the Task while the assigner messages its worker.
      const [done, message] = await Promise.all([
        other.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE" })),
        root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: `Race round ${round}.` })),
      ]);
      await until(async () => (await statusOf(projectId, taskId)) === "DONE", "Task DONE after the race", 30_000);
      // After both settle: the Task is DONE and its worker's entry is closed, whichever came first.
      await until(async () => typeof (await closedAtByKey(projectTaskDir(projectId, taskId)))[`agent:${worker}`] === "string",
        "worker entry closed after the race", 30_000);
      expect(keys((await root.snapshot()).closed)).toContain(`agent:${worker}`);
      // The orderings the design allows:
      // - reactivated and delivered before the DONE;
      // - the DONE first: refused with the reopen-first hint;
      // - the reactivation committed and the DONE then closed the entry before delivery (P-001). The restore was
      //   stopped (TASK_EXECUTION_RESTORE_FAILED), or the live-input fence refused it (TASK_AGENT_RESOURCE_CLOSED).
      //   Either way the result says it was reactivated but did not receive the message.
      const notReached = /was reactivated \(its Task work is open again\) but did not receive this message/;
      const outcome = message.accepted ? "reactivated-then-done"
        : notReached.test(message.message ?? "") && ["TASK_EXECUTION_RESTORE_FAILED", "TASK_AGENT_RESOURCE_CLOSED"].includes(message.code)
          ? `done-after-commit:${message.code}`
          : message.code === "TASK_AGENT_RESOURCE_CLOSED" && /This Task is DONE/.test(message.message ?? "") ? "done-first" : "unexpected";
      expect(outcome, JSON.stringify(message)).not.toBe("unexpected");
      if (outcome === "reactivated-then-done") expect(message.message).toMatch(/was reactivated\.$/);
      // No runtime process of the worker is left running (each AGY run works in memory/agents/<run>/agy-project).
      await until(() => liveAgyCwds().every((cwd) => !cwd.includes(worker)), "no live worker process after the race", 30_000);
      // The worker never takes input while its entry is closed.
      const fenced = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: `After round ${round}?` }));
      expect(fenced).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
      expect(fenced.message).toMatch(/This Task is DONE/);
      rounds.push({ round, outcome, done: JSON.stringify(done).slice(0, 200), message });
    }
    root.close(); other.close();
    await terminate("agent", root.rootId);
    await terminate("agent", other.rootId);
    evidence.race = { projectId, taskId, worker, rounds };
  }, 300000);

  (liveClaude ? it : it.skip)("real model (Claude Agent SDK) worker: after DONE, reopen and the assigner's message, it recalls its pre-DONE conversation (AC-001)", async () => {
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Task reactivation live ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const codeword = `PELICAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const taskId = (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, description: `Remember this codeword for later: ${codeword}. Do not use any tools. Reply with only the word READY.` } })).createProjectTask.taskId as string;
    // The scripted Manager drives the tools; the worker member runs on a real Claude model.
    const root = await startRoot("org", ids.claudeOrg, [{ address: "/worker", configuration: {
      workspaceRootPath: workspace, llmModelIdentifier: "haiku", llmConfig: null, autoExecuteTools: true, runtimeKind: "claude_agent_sdk" } }]);
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: "/worker", task_id: taskId }));
    expect(delegated).toMatchObject({ target_kind: "agent" });
    const worker = delegated.target_agent_run_id as string;
    const node = (await root.waitForNodes("live worker", (nodes) => nodes.some((n) => n.agentRunId === worker))).find((n) => n.agentRunId === worker)!;
    await until(async () => /READY/.test(JSON.stringify(await root.conversationOf(worker, node.address))), "live worker answered READY", 180_000);
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE" }));
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "IN_PROGRESS" }));
    const reactivated = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker,
      content: "Which codeword did I give you earlier? Do not use any tools. Reply with only the codeword." }));
    expect(reactivated).toMatchObject({ accepted: true });
    expect(reactivated.message).toMatch(/was reactivated\.$/);
    let conversation = "";
    await until(async () => { conversation = JSON.stringify(await root.conversationOf(worker, node.address));
      return conversation.lastIndexOf(codeword) > conversation.indexOf("Which codeword"); }, "live worker recalled the codeword", 180_000);
    root.close();
    await terminate("org", root.rootId);
    // The scripted AGY actor only ever answers "OK" or "CALLED:…": READY and the codeword come from the real model.
    evidence.liveClaude = { worker, codeword, reactivated, recalled: true,
      replyAfterReactivation: conversation.slice(conversation.indexOf("Which codeword")).slice(0, 600) };
  }, 420000);
});
