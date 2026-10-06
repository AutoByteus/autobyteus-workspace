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

// Task closure (DONE) as a root view fact, through the real Studio HTTP/WebSocket server, scoped MCP,
// Project/Task services, roots, publishers and projectors. Only the external AGY CLI is scripted:
// a message containing `CALL_TOOL:{...}` makes it call that actual agent tool. No provider inference.
// Covers task-run-resources-workspace-cleanup AC-001–AC-008 at the server/wire boundary for the
// standalone Agent, Agent Team and Agent Org roots. Rendering is covered by the web tests.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
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

/** Every task execution node (Agent or Team; nested anywhere), identified by its recorded start. */
const taskNodes = (tree: unknown): TaskNode[] => {
  const found: TaskNode[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, any>;
    // Agent/Org trees are camelCase; the Team tree is snake_case. Normalize the identity fields only.
    const startedAt = record.startedAt ?? record.started_at;
    const agentRunId = record.agentRunId ?? record.agent_run_id;
    const teamRunId = record.teamRunId ?? record.team_run_id;
    if (typeof startedAt === "string" && (agentRunId || teamRunId)) {
      found.push({ ...(teamRunId ? { teamRunId } : { agentRunId }), address: record.address, startedAt,
        delegatorAgentRunId: record.delegatorAgentRunId ?? record.delegator_agent_run_id });
    }
    Object.values(record).forEach(visit);
  };
  visit(tree);
  return found;
};

suite("Task DONE hides the Task's agent run resources in every root view (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", helper: "", assistant: "", squad: "", team: "", org: "" };
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
    { input: { name, role: "assistant", description: `${name} (task closure E2E)`, instructions: "Follow the user's request.", toolNames } },
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
    active.splice(active.findIndex((run) => run.rootId === rootId), 1);
  };
  const createProjectWithTasks = async (label: string) => {
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Task closure ${label} ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const task = async (description: string) => (await graphql(
      `mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId status}}`,
      { input: { projectId, description } })).createProjectTask.taskId as string;
    return { projectId, task };
  };
  const statusOf = async (projectId: string, taskId: string) => ((await graphql(
    `query($id:String!){projectTasks(projectId:$id){taskId status}}`, { id: projectId })).projectTasks as any[])
    .find((task) => task.taskId === taskId)?.status as string | undefined;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-closure-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.worker = `TRC Worker ${suffix}`; names.helper = `TRC Helper ${suffix}`; names.assistant = `TRC Assistant ${suffix}`;
    names.squad = `TRC Squad ${suffix}`;
    ids.manager = await agentDefinition(`TRC Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(names.worker, []);
    ids.helper = await agentDefinition(names.helper, []);
    ids.assistant = await agentDefinition(names.assistant, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `TRC Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" },
          { memberName: "helper", ref: ids.helper, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `TRC Org ${suffix}`, description: "Org root", instructions: "Follow requests.",
        members: [{ memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
          { memberName: "worker", ref: ids.worker, refType: "AGENT", refScope: "SHARED" },
          { memberName: "helper", ref: ids.helper, refType: "AGENT", refScope: "SHARED" },
          { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }], handoffs: [] } },
    )).createAgentOrgDefinition.id;
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_CLOSURE_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "task-closure-root-visibility.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  /** One root kind: a Manager in that root drives Task-linked work, closes a Task, reopens it, and stops. */
  const rootScenario = async (kind: Kind) => {
    const { projectId, task } = await createProjectWithTasks(kind);
    // Task A's worker sub-delegates to the helper; that copy brings in a catalog assistant with
    // send_message_to. Both join Task A by inheritance (roles delegated and broughtIn).
    const workerAddress = kind === "agent" ? `/${segment(names.worker)}` : "/worker";
    const helperAddress = kind === "agent" ? `/${segment(names.helper)}` : "/helper";
    const assistantAddress = `/${segment(names.assistant)}`;
    const teamAddress = kind === "org" ? "/squad" : `/${segment(names.squad)}`;
    const taskA = await task(callTool("delegate_task", { recipient_address: helperAddress,
      description: callTool("send_message_to", { recipient_address: assistantAddress, content: "Reply OK." }) }));
    const taskB = await task("Review the docs site.");

    // Root run with the Manager.
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
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() },
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
    expect(managerRunId).toBeTruthy();

    // The root's own view stream (what the browser attaches to) and the Manager's input channel.
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const inputChannel = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null;
    const openView = () => connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
    let view = await openView();
    const send = (content: string) => {
      if (kind === "org") view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : view.socket, { agent_run_id: managerRunId, content });
    };
    const snapshotOf = (frames: Frame[]) => {
      const payload = frames.find(isSnapshot)!.payload;
      const body = kind === "agent" ? payload.root_agent : kind === "org" ? payload.root_org : payload;
      return { tree: body.execution_tree, closed: body.closed_task_executions as Record<string, any>[],
        messages: (body.communication_messages?.messages ?? body.messages ?? []) as Record<string, any>[] };
    };
    const liveTree = async () => {
      if (kind === "agent") {
        const raw = (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration;
        return raw?.root_agent?.execution_tree ?? null;
      }
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    };
    const conversationOf = async (node: TaskNode) => {
      if (kind === "agent") return (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: node.address, r: node.agentRunId })).agentRunCollaborationMemberProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: node.agentRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: node.agentRunId, m: node.address })).getAgentOrgMemberRunProjection?.conversation;
    };
    const waitForNodes = async (label: string, predicate: (nodes: TaskNode[]) => boolean) => {
      let nodes: TaskNode[] = [];
      await until(async () => { nodes = taskNodes(await liveTree()); return predicate(nodes); }, label, 60_000)
        .catch(async (error) => {
          const conversations = await Promise.all(nodes.filter((node) => node.agentRunId).map(async (node) => {
            const projection = await conversationOf(node).catch((cause) => String(cause));
            return { agentRunId: node.agentRunId, projection };
          }));
          const manager = await conversationOf({ agentRunId: managerRunId, address: kind === "agent" ? "/" : "/manager", startedAt: "" })
            .catch((cause) => String(cause));
          throw new Error(`${error.message}; nodes=${JSON.stringify(nodes).slice(0, 1500)}; conversations=${JSON.stringify(conversations).slice(0, 4000)}`
            + `; manager=${JSON.stringify(manager).slice(0, 3000)}; frames=${view.frames.map((f) => f.type).join(",").slice(0, 1500)}`
            + `; tree=${JSON.stringify(await liveTree().catch((cause) => String(cause))).slice(0, 3000)}`);
        });
      return nodes;
    };

    // 1. Task A (Agent + sub-delegation + brought-in helper), Task B (Team where the root offers one), non-Task work.
    send(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskA }));
    const aNodes = await waitForNodes("Task A assigned, delegated and broughtIn runs", (nodes) => nodes.length >= 3);
    const aAssigned = aNodes.find((node) => node.delegatorAgentRunId === managerRunId)!;
    expect(aAssigned).toBeTruthy();
    const taskARefs = aNodes.map(refOf);
    send(callTool("delegate_task", { recipient_address: teamAddress, task_id: taskB }));
    const bNodes = (await waitForNodes("Task B run", (nodes) => nodes.length >= aNodes.length + 1))
      .filter((node) => !taskARefs.some((ref) => keyOf(ref) === keyOf(refOf(node))));
    expect(bNodes).toHaveLength(1);
    expect(bNodes[0]).toHaveProperty("teamRunId");
    send(callTool("delegate_task", { recipient_address: workerAddress, description: "Plain work without a Task." }));
    const allBefore = await waitForNodes("non-Task run", (nodes) => nodes.length >= aNodes.length + 2);
    const plain = allBefore.filter((node) => ![...taskARefs, refOf(bNodes[0]!)].some((ref) => keyOf(ref) === keyOf(refOf(node))));
    expect(plain).toHaveLength(1);
    // The Manager also talks to Task A's worker; that exchange must survive closure (AC-008).
    send(callTool("send_message_to", { target_agent_run_id: aAssigned.agentRunId, content: "Status of Task A?" }));
    const touchesTaskA = (message: Record<string, any>) => taskARefs.some((ref) => JSON.stringify(message).includes((ref as any).agentRunId));
    let before = snapshotOf(view.frames);
    await until(async () => {
      view.socket.close();
      view = await openView();
      before = snapshotOf(view.frames);
      return before.messages.some((message) => touchesTaskA(message) && JSON.stringify(message).includes(managerRunId));
    }, "Manager message with Task A's worker", 60_000);
    expect(before.closed).toEqual([]);
    const aMessageIdsBefore = before.messages.filter(touchesTaskA).map((m) => m.messageId);
    expect(aMessageIdsBefore.length).toBeGreaterThanOrEqual(2);

    // 2. DONE through the Manager's real tool call: the root publishes the closed refs (Task A only) before stopping.
    const doneFrom = view.frames.length;
    send(callTool("create_or_update_task", { project_id: projectId, task_id: taskA, status: "DONE" }));
    const closedFrame = (frame: Frame) => kind === "team" ? frame.type === "TASK_EXECUTIONS_CLOSED"
      : frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_closed";
    await until(() => view.frames.slice(doneFrom).some(closedFrame), "live task_executions_closed", 60_000);
    const closedIndex = view.frames.findIndex((frame, index) => index >= doneFrom && closedFrame(frame));
    const closedPayload = kind === "team" ? view.frames[closedIndex]!.payload.task_executions : view.frames[closedIndex]!.payload.event.task_executions;
    expect(keys(closedPayload)).toEqual(keys(taskARefs));
    await until(async () => (await statusOf(projectId, taskA)) === "DONE", "Task A DONE");
    // Stop effects for Task A's runs, if streamed, come after the closed event.
    const stopIndex = view.frames.findIndex((frame, index) => index >= doneFrom && index !== closedIndex
      && /"(offline|terminated|shutdown|stopped)"/i.test(JSON.stringify(frame.payload))
      && taskARefs.some((ref) => JSON.stringify(frame.payload).includes((ref as any).agentRunId ?? (ref as any).teamRunId)));
    if (stopIndex >= 0) expect(closedIndex).toBeLessThan(stopIndex);
    // No second closure for the other Task or the non-Task run.
    expect(view.frames.slice(doneFrom).filter(closedFrame)).toHaveLength(1);

    // 3. Fresh snapshot (reload): closed refs listed; the tree and the Manager's messages are kept (AC-007/008).
    view.socket.close();
    view = await openView();
    const after = snapshotOf(view.frames);
    expect(keys(after.closed)).toEqual(keys(taskARefs));
    expect(keys(taskNodes(after.tree).map(refOf))).toEqual(keys(allBefore.map(refOf)));
    const aMessageIdsAfter = after.messages.filter(touchesTaskA).map((m) => m.messageId);
    expect(aMessageIdsAfter).toEqual(aMessageIdsBefore);
    const memoryHits = spawnSync("grep", ["-rl", aAssigned.agentRunId, path.join(dataDir, "memory")], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
    expect(memoryHits.length, "closed run's conversation/run history files are kept on disk").toBeGreaterThan(0);

    // 4. Reopen and delegate again (AC-006): the new run is open; the old Task A runs stay closed.
    send(callTool("create_or_update_task", { project_id: projectId, task_id: taskA, status: "IN_PROGRESS" }));
    await until(async () => (await statusOf(projectId, taskA)) === "IN_PROGRESS", "Task A reopened");
    send(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskA }));
    const reopened = await waitForNodes("redelegated Task A run", (nodes) => nodes.filter((n) => n.delegatorAgentRunId === managerRunId).length >= 4);
    const fresh = reopened.filter((node) => !allBefore.some((old) => keyOf(refOf(old)) === keyOf(refOf(node))) && node.delegatorAgentRunId === managerRunId);
    expect(fresh.length).toBeGreaterThanOrEqual(1);
    view.socket.close();
    view = await openView();
    const afterReopen = snapshotOf(view.frames);
    expect(keys(afterReopen.closed)).toEqual(keys(taskARefs));

    // 4b. Repeated DONE on the reopened Task: the live event carries the new run; the closed set is the union.
    const redoneFrom = view.frames.length;
    send(callTool("create_or_update_task", { project_id: projectId, task_id: taskA, status: "DONE" }));
    await until(() => view.frames.slice(redoneFrom).some(closedFrame), "live closure for the repeated DONE", 60_000);
    const redone = view.frames.slice(redoneFrom).find(closedFrame)!;
    const redonePayload = kind === "team" ? redone.payload.task_executions : redone.payload.event.task_executions;
    for (const node of fresh) expect(keys(redonePayload)).toContain(keyOf(refOf(node)));
    const closedA = [...taskARefs, ...fresh.map(refOf)];
    view.socket.close();
    view = await openView();
    expect(keys(snapshotOf(view.frames).closed)).toEqual(keys(closedA));

    // 5. Stop the root; stored reads carry the closure (AC-004).
    view.socket.close();
    inputChannel?.socket.close();
    await terminate(kind, rootId);
    const storedClosed = async (): Promise<Record<string, any>[]> => {
      if (kind === "agent") {
        const raw = (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration;
        return raw.root_agent.closed_task_executions;
      }
      if (kind === "team") {
        const resume = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive closedTaskExecutions}}`, { id: rootId })).getTeamRunResumeConfig;
        expect(resume.isActive).toBe(false);
        return resume.closedTaskExecutions;
      }
      const item = (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){is_active closed_task_executions}}`, { id: rootId })).getAgentOrgRootHistory;
      expect(item.is_active).toBe(false);
      const listed = ((await graphql(`query{listCollaborationRootHistory{__typename ... on AgentOrgRootHistoryObject{root_run_id closed_task_executions}}}`))
        .listCollaborationRootHistory as any[]).find((row) => row.root_run_id === rootId);
      expect(keys(listed.closed_task_executions)).toEqual(keys(item.closed_task_executions));
      return item.closed_task_executions;
    };
    expect(keys(await storedClosed())).toEqual(keys(closedA));

    // 6. DONE while the host root is stopped (SCN-003): another Manager closes Task B.
    const other = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(other.success, other.message).toBe(true);
    active.push({ kind: "agent", rootId: other.runId });
    const otherInput = await connect("agent", other.runId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    sendE2eSendMessageCommand(otherInput.socket, { agent_run_id: other.runId,
      content: callTool("create_or_update_task", { project_id: projectId, task_id: taskB, status: "DONE" }) });
    await until(async () => (await statusOf(projectId, taskB)) === "DONE", "Task B DONE by another Manager", 60_000);
    otherInput.socket.close();
    await terminate("agent", other.runId);
    expect(keys(await storedClosed())).toEqual(keys([...closedA, refOf(bNodes[0]!)]));

    // 7. Task delete keeps the closure (AC-004); the open re-delegated run and the non-Task run stay listed.
    expect((await graphql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`,
      { input: { projectId, taskId: taskA } })).deleteProjectTask).toBe(true);
    const finalClosed = await storedClosed();
    expect(keys(finalClosed)).toEqual(keys([...closedA, refOf(bNodes[0]!)]));
    for (const open of plain) expect(keys(finalClosed)).not.toContain(keyOf(refOf(open)));
    evidence[kind] = { rootId, managerRunId, projectId, taskA, taskB, taskARefs, taskBRef: refOf(bNodes[0]!), plain: plain.map(refOf),
      redelegated: fresh.map(refOf), redonePayload, closedPayload, closedIndex, stopIndex, storedClosedAfterDelete: finalClosed,
      aMessageIds: aMessageIdsAfter, memoryHits: memoryHits.length };
  };

  it("standalone Agent root: live closed event before stop, snapshot, stored read, SCN-003, reopen + repeated DONE, Task delete", async () => {
    await rootScenario("agent");
  }, 300000);

  it("Agent Team root: TASK_EXECUTIONS_CLOSED, snapshot, resume config, SCN-003, reopen + repeated DONE, Task delete", async () => {
    await rootScenario("team");
  }, 300000);

  it("Agent Org root: live closed event, snapshot, inspection and history item (SP-3), SCN-003, reopen + repeated DONE, Task delete", async () => {
    await rootScenario("org");
  }, 300000);
});
