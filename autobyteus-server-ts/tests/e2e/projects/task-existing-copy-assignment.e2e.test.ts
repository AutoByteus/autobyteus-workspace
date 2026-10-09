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

// Follow-up Tasks to an existing copy (delegate-to-existing-copy AC-001..AC-010, AC-012, AC-013, AC-018, QR-001, QR-002)
// through the real Studio HTTP/WebSocket server, scoped MCP, Project/Task services, roots, exact delivery, publishers
// and the AGY runtime, for the standalone Agent, Agent Team and Agent Org roots. Only the external AGY CLI is scripted:
// a message containing `CALL_TOOL:{...}` makes that agent call the actual agent tool and reply `CALLED:<tool result>`;
// `CALL_TOOLS:[...]` makes it issue several calls at once (parallel tool calls in one turn) and reply `CALLED_ALL:[...]`.
// No provider inference. Every Task status change is the Manager's own create_or_update_task.
// A real backend restart around the assignment (AC-011), damaged Task data (only detected at load) and the rendered
// tree and board (REQ-008) are covered by `test:e2e:task-closure-tree` BR-012..BR-016.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const liveClaude = enabled && process.env.RUN_CLAUDE_E2E === "1"
  && spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type Kind = "agent" | "team" | "org";
type TaskNode = Record<string, any> & { startedAt: string };
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"];
const ROOT_FIELDS = "kind recipientAddress ingressAgentRunId teamRunId hostRoot { kind runId } start startError { code message } closed status";
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const keyOf = (ref: Record<string, any>) => ref.teamRunId ?? ref.team_run_id ? `team:${ref.teamRunId ?? ref.team_run_id}` : `agent:${ref.agentRunId ?? ref.agent_run_id}`;
const keys = (refs: readonly Record<string, any>[]) => refs.map(keyOf).sort();
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const callTools = (calls: Array<{ name: string; arguments: object; delayMs?: number }>) => `CALL_TOOLS:${JSON.stringify(calls)}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
/** Every string of a conversation that carries a scripted tool reply with the given prefix, in order. */
const repliesWith = (conversation: unknown, prefix: string): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (value.includes(prefix)) strings.push(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(entry);
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf(prefix) + prefix.length)] : [];
});
/** The structured tool result of one MCP call result (`structuredContent`, else its JSON text content). */
const resultOf = (raw: Record<string, any>): Record<string, any> => {
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? JSON.stringify(raw) }; }
};
/** Run IDs of the live scripted AGY processes (each AGY run works in `<memory>/…/<agentRunId>/agy-project`). */
const liveAgyRunIds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout)
  .map((out) => /([^/\n]+)\/agy-project\s*$/m.exec(out)?.[1] ?? "").filter(Boolean);
const processLive = (agentRunId: string) => liveAgyRunIds().includes(agentRunId);
const exactKeys = (value: Record<string, any>) => Object.keys(value).sort();

suite("Follow-up Tasks to an existing copy in every root (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", helper: "", squad: "", team: "", org: "" };
  const names = { worker: "", helper: "", squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  const feedFrames: any[] = [];

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = (overrides: Record<string, unknown> = {}) => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli", ...overrides });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (existing-copy E2E)`, instructions: "Follow the user's request.", toolNames } },
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
  const createProject = async (label: string) => (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
    { input: { name: `Existing copy ${label} ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
  const createTask = async (projectId: string, description: string) => (await graphql(
    `mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, description } })).createProjectTask.taskId as string;
  const tasksOf = async (projectId: string) => (await graphql(`query($id:String!){projectTasks(projectId:$id){taskId status root { ${ROOT_FIELDS} }}}`,
    { id: projectId })).projectTasks as Array<Record<string, any>>;
  const taskOf = async (projectId: string, taskId: string) => (await tasksOf(projectId)).find((task) => task.taskId === taskId)!;
  const taskDir = (projectId: string, taskId: string) => path.join(dataDir, "projects", encodeURIComponent(projectId), "tasks", encodeURIComponent(taskId));
  const resourcesFile = (projectId: string, taskId: string) => path.join(taskDir(projectId, taskId), "agent_run_resources.json");
  /** Every file under a Project's folder with its exact content: "nothing changes" means this map is identical. */
  const projectFiles = async (projectId: string): Promise<Record<string, string>> => {
    const root = path.join(dataDir, "projects", encodeURIComponent(projectId));
    const out: Record<string, string> = {};
    const walk = async (dir: string) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full); else out[path.relative(root, full)] = await fs.readFile(full, "utf8");
      }
    };
    await walk(root);
    return out;
  };
  /** The persisted entries of one copy in one Task file, in file order. */
  const entriesOf = async (projectId: string, taskId: string, key: string): Promise<Array<Record<string, any>>> => {
    const raw = await fs.readFile(resourcesFile(projectId, taskId), "utf8").catch(() => "");
    if (!raw) return [];
    return (JSON.parse(raw).agentRunResources as any[]).filter((entry) => keyOf(entry.agentRun) === key);
  };
  /** Open entries of one copy across every Task of the Project (QR-001: never more than one). */
  const openEntriesAcross = async (projectId: string, key: string) => {
    const tasksDir = path.join(dataDir, "projects", encodeURIComponent(projectId), "tasks");
    const open: string[] = [];
    for (const taskId of await fs.readdir(tasksDir)) {
      for (const entry of await entriesOf(projectId, decodeURIComponent(taskId), key)) if (entry.closedAt === null) open.push(decodeURIComponent(taskId));
    }
    return open;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-existing-copy-e2e-"));
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
    names.worker = `EXC Worker ${suffix}`; names.helper = `EXC Helper ${suffix}`; names.squad = `EXC Squad ${suffix}`;
    ids.manager = await agentDefinition(`EXC Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(names.worker, []);
    ids.helper = await agentDefinition(names.helper, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `EXC Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" },
          { memberName: "helper", ref: ids.helper, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `EXC Org ${suffix}`, description: "Org root", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "worker", ref: ids.worker, refType: "AGENT", refScope: "SHARED" },
        { memberName: "helper", ref: ids.helper, refType: "AGENT", refScope: "SHARED" },
        { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }] } },
    )).createAgentOrgDefinition.id;
    // The per-node Projects feed (the live board): every frame of the run must match the strict server schema.
    const feed = new WebSocket(`ws://${url.host}/ws/projects`);
    sockets.push(feed);
    feed.on("message", (raw: unknown) => feedFrames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { feed.once("open", resolve); feed.once("error", reject); });
    await until(() => feedFrames.some((f) => f.type === "connected"), "projects feed connected");
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    const invalidFeedFrames = feedFrames.filter((frame) => !ProjectChangeMessageSchema.safeParse(frame).success);
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    const leftover = liveAgyRunIds().filter((runId) => JSON.stringify(evidence).includes(runId));
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_EXISTING_COPY_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "task-existing-copy-assignment.json"), `${JSON.stringify({ ...evidence,
        feed: { frames: feedFrames.length, invalid: invalidFeedFrames.length },
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
    expect(invalidFeedFrames, JSON.stringify(invalidFeedFrames).slice(0, 2000)).toEqual([]);
  }, 120000);

  /** A root of one kind with the Manager, its channels and readers of its view. */
  const startRoot = async (kind: Kind, memberOverrides: Record<string, Record<string, unknown>> = {}, orgAgentOverrides: unknown[] = []) => {
    let rootId: string, managerRunId: string;
    const members: Record<string, string> = {};
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: ["manager", "worker", "helper"]
          .map((member) => ({ memberAddress: `/${member}`, agentDefinitionId: (ids as any)[member], ...config(memberOverrides[`/${member}`]) })) } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      for (const member of flattenE2eConfiguredAgentExecutions(tree)) members[member.memberAddress] = member.agentRunId;
      managerRunId = members["/manager"]!;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: orgAgentOverrides, teamOverrides: [] } })).createAgentOrgRun;
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
    // One long-lived view socket collects every live frame of the root (closures and reopenings); snapshots use their own.
    const live = await openView();
    const sendTo = (agentRunId: string, content: string) => {
      if (kind === "org") live.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : live.socket, { agent_run_id: agentRunId, content });
    };
    const snapshot = async () => {
      const view = await openView();
      const payload = view.frames.find(isSnapshot)!.payload;
      view.socket.close();
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
    /** Sends one scripted message to an agent of the root and returns its next reply with the prefix, parsed. */
    const agentReply = async (agentRunId: string, address: string, content: string, prefix: string) => {
      const before = repliesWith(await conversationOf(agentRunId, address), prefix).length;
      sendTo(agentRunId, content);
      let results: string[] = [];
      await until(async () => { results = repliesWith(await conversationOf(agentRunId, address), prefix); return results.length > before; },
        `${prefix} reply of ${address} for ${content.slice(0, 120)}`, 90_000);
      return JSON.parse(results[before]!);
    };
    const agentCalls = async (agentRunId: string, address: string, content: string) => resultOf(await agentReply(agentRunId, address, content, "CALLED:"));
    const managerAddress = kind === "agent" ? "/" : "/manager";
    const managerCalls = (content: string) => agentCalls(managerRunId, managerAddress, content);
    /** One Manager turn with parallel tool calls: the results in call order. */
    const managerCallsAtOnce = async (calls: Array<{ name: string; arguments: object; delayMs?: number }>) =>
      ((await agentReply(managerRunId, managerAddress, callTools(calls), "CALLED_ALL:")) as Record<string, any>[]).map(resultOf);
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
    const refsOf = (frame: Frame) => (kind === "team" ? frame.payload.task_executions : frame.payload.event.task_executions) as Record<string, any>[];
    /** Keys of the copies in every closure / reopening frame since a mark. */
    const closedSince = (from: number) => live.frames.slice(from).filter(closedFrame).flatMap((frame) => keys(refsOf(frame)));
    const reopenedSince = (from: number) => live.frames.slice(from).filter(reopenedFrame).map((frame) => keys(refsOf(frame)));
    const mark = () => live.frames.length;
    const close = () => { live.socket.close(); inputChannel?.socket.close(); };
    return { kind, rootId, managerRunId, members, managerAddress, sendTo, snapshot, liveTree, conversationOf, agentCalls, managerCalls,
      managerCallsAtOnce, waitForNodes, closedSince, reopenedSince, mark, close };
  };
  type Root = Awaited<ReturnType<typeof startRoot>>;

  /** The launches of one agent run since a mark of the AGY argv log: whether each resumed a saved conversation. */
  const launchesOf = async (agentRunId: string, from: number) => (await fs.readFile(process.env["AGY_FAKE_ARGV_LOG"]!, "utf8")).trim().split("\n")
    .slice(from).map((line) => JSON.parse(line) as { argv: string[]; cwd: string })
    .filter((entry) => entry.cwd.endsWith(`/${agentRunId}/agy-project`))
    .map((entry) => ({ resumed: entry.argv.includes("--conversation"), conversation: entry.argv.includes("--conversation") ? entry.argv[entry.argv.indexOf("--conversation") + 1] : null }));
  const argvMark = async () => (await fs.readFile(process.env["AGY_FAKE_ARGV_LOG"]!, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).length;
  const feedMark = () => feedFrames.length;
  const feedRootOf = (taskId: string, from: number) => feedFrames.slice(from).filter((f) => f.type === "task_upserted" && f.task.taskId === taskId).map((f) => f.task.root);

  /** A Team copy: its IDs, its coordinator's address and its members, as the root's tree shows them. */
  const teamCopyOf = async (root: Root, teamRunId: string) => {
    const node = (await root.waitForNodes("Team copy in the tree", (nodes) => nodes.some((n) => n.teamRunId === teamRunId))).find((n) => n.teamRunId === teamRunId)!;
    return node;
  };

  /**
   * One root kind, the whole feature: explicit IDs (AC-001), busy refusal (AC-006), the AC-008 identity refusals, a
   * non-assigner (AC-007, QR-002), AC-009 Task refusals, the Team copy given Task B by its team run ID (AC-002) and the
   * Agent copy given Task D by its agent run ID (AC-003), repeated DONE/CANCELLED of the earlier Task never stopping it
   * (AC-004), DONE of the new Task stopping it (AC-005), the reopen hint (AC-010), the A → B → A return (AC-018), the
   * assignment views (AC-013) and the team-run-ID message refusal (AC-012).
   */
  const rootScenario = async (kind: Kind) => {
    const record: Record<string, unknown> = {};
    const projectId = await createProject(kind);
    const squadAddress = kind === "org" ? "/squad" : `/${segment(names.squad)}`;
    const workerAddress = kind === "agent" ? `/${segment(names.worker)}` : "/worker";
    const helperAddress = kind === "agent" ? `/${segment(names.helper)}` : "/helper";
    const taskA = await createTask(projectId, "Review the release checklist.");
    const taskB = await createTask(projectId, "Clean up the checklist wording you proposed.");
    // Task C's worker sub-delegates to the helper (sub-work of Task C).
    const taskC = await createTask(projectId, callTool("delegate_task", { recipient_address: helperAddress, description: "Reply OK." }));
    const taskD = await createTask(projectId, "Follow up on the notes you drafted.");
    const root = await startRoot(kind);
    const filesNow = () => projectFiles(projectId);

    // AC-001: explicit IDs at the wire for a Team copy and an Agent copy.
    const delegatedA = await root.managerCalls(callTool("delegate_task", { recipient_address: squadAddress, task_id: taskA }));
    expect(exactKeys(delegatedA), JSON.stringify(delegatedA)).toEqual(["delegated", "target_kind", "target_team_coordinator_agent_run_id", "target_team_run_id"]);
    expect(delegatedA).toMatchObject({ delegated: true, target_kind: "team" });
    const team = delegatedA.target_team_run_id as string;
    const coordinator = delegatedA.target_team_coordinator_agent_run_id as string;
    const teamKey = `team:${team}`;
    const teamNode = await teamCopyOf(root, team);
    const coordinatorAddress = teamNode.members.find((member: any) => member.agentRunId === coordinator)!.address as string;
    const mate = teamNode.members.find((member: any) => member.agentRunId !== coordinator)!.agentRunId as string;
    const teamMembers = teamNode.members.map((member: any) => member.agentRunId).sort();
    const delegatedC = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskC }));
    expect(exactKeys(delegatedC), JSON.stringify(delegatedC)).toEqual(["delegated", "target_agent_run_id", "target_kind"]);
    expect(delegatedC).toMatchObject({ delegated: true, target_kind: "agent" });
    const worker = delegatedC.target_agent_run_id as string;
    const cNodes = await root.waitForNodes("Task C worker and its sub-work", (nodes) => nodes.some((n) => n.agentRunId === worker)
      && nodes.some((n) => n.agentRunId && n.agentRunId !== worker && n.delegatorAgentRunId === worker));
    const workerNode = cNodes.find((n) => n.agentRunId === worker)!;
    const subWork = cNodes.find((n) => n.agentRunId && n.delegatorAgentRunId === worker)!.agentRunId as string;
    record.delegations = { delegatedA, delegatedC, coordinatorAddress, mate, subWork };

    // Earlier conversation of both copies, to be continued by the new Tasks.
    await root.managerCalls(callTool("send_message_to", { target_agent_run_id: coordinator, content: `Checklist notes. Marker PRE-A-${kind}.` }));
    await until(async () => JSON.stringify(await root.conversationOf(coordinator, coordinatorAddress)).includes(`PRE-A-${kind}`), "coordinator got the Task A message", 60_000);
    await root.managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: `Draft notes. Marker PRE-C-${kind}.` }));
    await until(async () => JSON.stringify(await root.conversationOf(worker, workerNode.address)).includes(`PRE-C-${kind}`), "worker got the Task C message", 60_000);

    // AC-006: the copy's Task A is still open (TODO, then IN_PROGRESS): refused naming Task A; nothing changes.
    let files = await filesNow();
    let from = root.mark();
    const busyTodo = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    expect(busyTodo).toEqual({ delegated: false, message: `This copy still works on Task ${taskA} (TODO). Mark it DONE or CANCELLED first, `
      + `or delegate Task ${taskB} to a new copy with recipient_address.` });
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "IN_PROGRESS" }));
    files = await filesNow();
    const busyInProgress = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    expect(busyInProgress.message).toMatch(new RegExp(`still works on Task ${taskA} \\(IN_PROGRESS\\)`));
    expect(await filesNow()).toEqual(files);
    expect(root.reopenedSince(from)).toEqual([]);
    record.busy = { busyTodo, busyInProgress };

    // Task A DONE: the Team copy closes and its coordinator process stops.
    from = root.mark();
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "DONE" }));
    await until(() => root.closedSince(from).includes(teamKey), "closure of the Team copy at Task A DONE", 60_000);
    await until(() => !processLive(coordinator), "coordinator process stopped at Task A DONE", 30_000);
    const aEntryAtDone = await entriesOf(projectId, taskA, teamKey);
    expect(aEntryAtDone).toHaveLength(1);
    expect(aEntryAtDone[0]!.closedAt).toEqual(expect.any(String));

    // AC-008: identities that are not this kind of copy, or not a copy of this run: specific refusals; nothing changes.
    files = await filesNow(); from = root.mark();
    const idRefusals = {
      coordinatorAsAgent: await root.managerCalls(callTool("delegate_task", { target_agent_run_id: coordinator, task_id: taskB })),
      memberAsAgent: await root.managerCalls(callTool("delegate_task", { target_agent_run_id: mate, task_id: taskB })),
      teamRunAsAgent: await root.managerCalls(callTool("delegate_task", { target_agent_run_id: team, task_id: taskB })),
      agentAsTeam: await root.managerCalls(callTool("delegate_task", { target_team_run_id: worker, task_id: taskB })),
      subWork: await root.managerCalls(callTool("delegate_task", { target_agent_run_id: subWork, task_id: taskB })),
      unknown: await root.managerCalls(callTool("delegate_task", { target_team_run_id: `team_${randomUUID()}`, task_id: taskB })),
      bothIds: await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, target_agent_run_id: coordinator, task_id: taskB })),
      withAddress: await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, recipient_address: squadAddress, task_id: taskB })),
      noTaskId: await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, description: "Do B." })),
    };
    expect(idRefusals.coordinatorAsAgent).toEqual({ delegated: false,
      message: `${coordinator} is the coordinator of Team copy ${team}; use target_team_run_id "${team}".` });
    expect(idRefusals.memberAsAgent).toEqual({ delegated: false, message: `${mate} is a member of Team copy ${team}, not a copy itself; `
      + `to assign that Team copy, use target_team_run_id "${team}".` });
    expect(idRefusals.teamRunAsAgent).toEqual({ delegated: false, message: `${team} is a Team copy's team run ID; use target_team_run_id "${team}".` });
    expect(idRefusals.agentAsTeam).toEqual({ delegated: false, message: `${worker} is an Agent copy's agent run ID; use target_agent_run_id "${worker}".` });
    expect(idRefusals.subWork).toMatchObject({ delegated: false });
    expect(idRefusals.subWork.message).toMatch(/This copy is sub-work or a helper of a Task worker, not an assignment/);
    expect(idRefusals.unknown).toMatchObject({ delegated: false });
    expect(idRefusals.unknown.message).toMatch(/is not a delegated copy in this run/);
    for (const invalid of [idRefusals.bothIds, idRefusals.withAddress, idRefusals.noTaskId]) {
      expect(invalid.delegated ?? false, JSON.stringify(invalid)).toBe(false);
      expect(JSON.stringify(invalid)).not.toMatch(/target_team_coordinator_agent_run_id/);
    }
    expect(await filesNow()).toEqual(files);
    expect(root.reopenedSince(from)).toEqual([]);
    expect(processLive(coordinator)).toBe(false);
    record.idRefusals = idRefusals;

    // AC-007 / QR-002: a sender that did not make the copy's most recent assignment cannot give it a new Task. In a Team
    // or Org root a configured teammate; in a standalone Agent root the other senders are Task copies (refused as owned).
    let nonAssigner: Record<string, any>;
    if (kind === "agent") {
      // A copy whose own work is that call (its delegated description), as a Task copy would issue it.
      const probe = await root.managerCalls(callTool("delegate_task", { recipient_address: workerAddress,
        description: callTool("delegate_task", { target_team_run_id: team, task_id: taskB }) }));
      const probeNode = (await root.waitForNodes("non-assigner copy", (nodes) => nodes.some((n) => n.agentRunId === probe.target_agent_run_id)))
        .find((n) => n.agentRunId === probe.target_agent_run_id)!;
      let results: string[] = [];
      await until(async () => { results = repliesWith(await root.conversationOf(probeNode.agentRunId, probeNode.address), "CALLED:"); return results.length >= 1; },
        "non-assigner copy's delegate result", 60_000);
      nonAssigner = resultOf(JSON.parse(results[0]!));
      expect(nonAssigner).toEqual({ delegated: false, message: "Task workers delegate sub-work without task_id." });
    } else {
      const teammate = kind === "team" ? "/worker" : "/helper";
      nonAssigner = await root.agentCalls(root.members[teammate]!, teammate, callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
      expect(nonAssigner).toEqual({ delegated: false, message: "Only the run that made this copy's most recent assignment can give it a new Task; "
        + `or delegate Task ${taskB} to a new copy with recipient_address.` });
    }
    expect(await filesNow()).toEqual(files);
    expect(root.reopenedSince(from)).toEqual([]);
    record.nonAssigner = nonAssigner;

    // AC-009: Task B DONE, then CANCELLED, and an unknown Task: refused; nothing changes.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "DONE" }));
    files = await filesNow();
    const bDone = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "CANCELLED" }));
    files = await filesNow();
    const bCancelled = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    const unknownTask = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: `project_task_${randomUUID()}` }));
    expect(bDone).toMatchObject({ delegated: false });
    expect(bDone.message).toMatch(/DONE/);
    expect(bCancelled).toMatchObject({ delegated: false });
    expect(bCancelled.message).toMatch(/CANCELLED/);
    expect(unknownTask).toMatchObject({ delegated: false });
    expect(unknownTask.message).toMatch(/must identify exactly one current node-local Task \(found 0\)/);
    expect(await filesNow()).toEqual(files);
    expect(root.reopenedSince(from)).toEqual([]);
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "TODO" }));
    record.taskRefusals = { bDone, bCancelled, unknownTask };

    // AC-002: Task B given to the Team copy by its team run ID: same IDs back; the copy is reopened, restored with its
    // saved conversation and receives B from the Manager; B's root is the copy; Task A and its file are untouched.
    const aFileAtDone = await fs.readFile(resourcesFile(projectId, taskA), "utf8");
    const aTaskAtDone = await fs.readFile(path.join(taskDir(projectId, taskA), "task.json"), "utf8");
    from = root.mark();
    let argvFrom = await argvMark();
    let feedFrom = feedMark();
    const assignedB = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    expect(assignedB).toEqual({ delegated: true, target_kind: "team", target_team_run_id: team, target_team_coordinator_agent_run_id: coordinator });
    expect(root.reopenedSince(from)).toEqual([[teamKey]]);
    let coordinatorConversation = "";
    await until(async () => { coordinatorConversation = JSON.stringify(await root.conversationOf(coordinator, coordinatorAddress));
      return coordinatorConversation.includes(`New Task assigned to you: ${taskB}`)
        && coordinatorConversation.lastIndexOf("OK") > coordinatorConversation.indexOf(`New Task assigned to you: ${taskB}`); },
    "coordinator answered Task B", 60_000);
    expect(coordinatorConversation.indexOf(`PRE-A-${kind}`)).toBeGreaterThan(-1);
    expect(coordinatorConversation.indexOf(`PRE-A-${kind}`)).toBeLessThan(coordinatorConversation.indexOf(`New Task assigned to you: ${taskB}`));
    expect(coordinatorConversation).toContain("Clean up the checklist wording you proposed.");
    const resumedB = await launchesOf(coordinator, argvFrom);
    expect(resumedB, JSON.stringify(resumedB)).toEqual([{ resumed: true, conversation: expect.any(String) }]);
    expect(processLive(coordinator)).toBe(true);
    const afterB = await root.snapshot();
    expect(keys(afterB.closed)).not.toContain(teamKey);
    const teamAfterB = taskNodes(afterB.tree).filter((n) => n.teamRunId === team);
    expect(teamAfterB).toHaveLength(1);
    expect(teamAfterB[0]!.members.map((member: any) => member.agentRunId).sort()).toEqual(teamMembers);
    // The board (GraphQL snapshot and the live feed): B's root is the copy, live; A stays DONE with that copy closed.
    let bTask: Record<string, any> = {};
    await until(async () => { bTask = await taskOf(projectId, taskB); return bTask.root?.start === "started" && ["idle", "running"].includes(bTask.root?.status); },
      "Task B root live", 30_000);
    expect(bTask.root).toMatchObject({ kind: "team", teamRunId: team, ingressAgentRunId: coordinator, recipientAddress: squadAddress, closed: false, startError: null });
    const aTask = await taskOf(projectId, taskA);
    expect(aTask.status).toBe("DONE");
    expect(aTask.root).toMatchObject({ kind: "team", teamRunId: team, closed: true, status: "offline" });
    await until(() => feedRootOf(taskB, feedFrom).some((r) => r?.teamRunId === team && r?.closed === false && ["idle", "running"].includes(r?.status)),
      "feed: Task B root is the live copy", 30_000);
    expect(await fs.readFile(resourcesFile(projectId, taskA), "utf8")).toBe(aFileAtDone);
    expect(await fs.readFile(path.join(taskDir(projectId, taskA), "task.json"), "utf8")).toBe(aTaskAtDone);
    const bEntries = await entriesOf(projectId, taskB, teamKey);
    expect(bEntries).toEqual([expect.objectContaining({ role: "assigned", assignedBy: root.managerRunId, recipientAddress: squadAddress,
      start: "started", closedAt: null, agentRun: { kind: "team", teamRunId: team, coordinatorAgentRunId: coordinator } })]);
    record.assignedB = { assignedB, resumedB, bRoot: bTask.root, aRoot: aTask.root };

    // AC-012 (same-root sender): a team run ID is not a send_message_to target; the message names the coordinator.
    const toTeamRun = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: team, content: "Hello team?" }));
    expect(toTeamRun).toMatchObject({ accepted: false, code: "TARGET_IS_TEAM_RUN",
      message: `${team} is a Team run; send_message_to reaches agents. Message its coordinator agent run ${coordinator}.` });
    const toCoordinator = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: coordinator, content: "B status?" }));
    expect(toCoordinator).toMatchObject({ accepted: true, target_agent_run_id: coordinator });
    expect(toCoordinator.message).not.toMatch(/reactivated/);
    record.messaging = { toTeamRun, toCoordinator };

    // AC-004: DONE, CANCELLED and DONE again of Task A never stop or hide the copy that now works on Task B.
    const coordinatorLaunchesBefore = (await launchesOf(coordinator, 0)).length;
    const repeated: unknown[] = [];
    for (const status of ["DONE", "CANCELLED", "DONE"] as const) {
      from = root.mark();
      const ack = await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status }));
      expect(ack).toMatchObject({ task: { taskId: taskA, status } });
      await sleep(2_000);
      expect(root.closedSince(from), `closure frames after Task A ${status}`).not.toContain(teamKey);
      expect(processLive(coordinator), `coordinator process after Task A ${status}`).toBe(true);
      expect(keys((await root.snapshot()).closed)).not.toContain(teamKey);
      expect(await fs.readFile(resourcesFile(projectId, taskA), "utf8")).toBe(aFileAtDone);
      repeated.push({ status, ack, closedKeys: root.closedSince(from) });
    }
    expect((await launchesOf(coordinator, 0)).length).toBe(coordinatorLaunchesBefore);
    const stillOpen = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: coordinator, content: "Still on B? Marker STILL-B." }));
    expect(stillOpen).toMatchObject({ accepted: true });
    expect(stillOpen.message).not.toMatch(/reactivated/);
    expect((await taskOf(projectId, taskB)).root).toMatchObject({ teamRunId: team, closed: false });
    record.repeatedCloseOfA = repeated;

    // AC-013: list_project_tasks names every copy for what it is; Task A lists its copy under closedAssignments.
    const listed = await root.managerCalls(callTool("list_project_tasks", { project_id: projectId }));
    const listedTask = (taskId: string) => (listed.tasks as any[]).find((task) => task.taskId === taskId);
    const teamView = { kind: "team", teamRunId: team, teamCoordinatorAgentRunId: coordinator, assignedBy: root.managerRunId, outcome: "accepted" };
    const workerView = { kind: "agent", agentRunId: worker, assignedBy: root.managerRunId, outcome: "accepted" };
    expect(listedTask(taskA)).toMatchObject({ assignments: [], closedAssignments: [teamView] });
    expect(listedTask(taskB)).toMatchObject({ assignments: [teamView], closedAssignments: [] });
    expect(listedTask(taskC)).toMatchObject({ assignments: [workerView], closedAssignments: [] });
    for (const view of [...listedTask(taskA).closedAssignments, ...listedTask(taskB).assignments]) expect(exactKeys(view)).toEqual(exactKeys(teamView));
    expect(exactKeys(listedTask(taskC).assignments[0])).toEqual(exactKeys(workerView));
    expect(JSON.stringify(listed)).not.toMatch(/targetAgentRunId/);
    record.listed = { a: listedTask(taskA), b: listedTask(taskB), c: listedTask(taskC) };

    // AC-005: DONE of Task B closes and stops the copy as for any DONE.
    from = root.mark();
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "DONE" }));
    await until(() => root.closedSince(from).includes(teamKey), "closure of the Team copy at Task B DONE", 60_000);
    await until(() => !processLive(coordinator), "coordinator process stopped at Task B DONE", 30_000);
    expect(keys((await root.snapshot()).closed)).toContain(teamKey);
    const bFileAtDone = await fs.readFile(resourcesFile(projectId, taskB), "utf8");

    // AC-010: the Manager reopens Task A and messages the coordinator: refused; the hint names Task B and the next step.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "IN_PROGRESS" }));
    files = await filesNow(); from = root.mark();
    const reopenHint = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: coordinator, content: "Back to A?" }));
    expect(reopenHint).toMatchObject({ accepted: false });
    expect(reopenHint.message).toContain(`This copy's current Task is ${taskB} (DONE); reopening Task ${taskA} does not reach it. `
      + `To have this copy continue Task ${taskA}, call delegate_task with target_team_run_id "${team}" and task_id "${taskA}".`);
    // AC-009: the copy's most recent assignment is already Task B: use reopen + message instead.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "TODO" }));
    files = await filesNow();
    const alreadyB = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    expect(alreadyB).toEqual({ delegated: false, message: `This copy's most recent assignment is already Task ${taskB}. To continue it, `
      + `move Task ${taskB} to TODO or IN_PROGRESS with create_or_update_task, then message the copy (for a Team, its coordinator).` });
    expect(await filesNow()).toEqual(files);
    expect(root.reopenedSince(from)).toEqual([]);
    expect(processLive(coordinator)).toBe(false);
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskB, status: "DONE" }));
    await sleep(1_000);
    expect(await fs.readFile(resourcesFile(projectId, taskB), "utf8")).toBe(bFileAtDone);
    record.returnRefusals = { reopenHint, alreadyB };

    // AC-018: A → B → A. Task A (reopened) given back to the copy: a second period entry is appended to A's file, the
    // earlier one kept exactly; the copy resumes its conversation; A's root is the copy; B stays DONE.
    from = root.mark(); argvFrom = await argvMark(); feedFrom = feedMark();
    const backToA = await root.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskA }));
    expect(backToA).toEqual({ delegated: true, target_kind: "team", target_team_run_id: team, target_team_coordinator_agent_run_id: coordinator });
    expect(root.reopenedSince(from)).toEqual([[teamKey]]);
    await until(async () => { coordinatorConversation = JSON.stringify(await root.conversationOf(coordinator, coordinatorAddress));
      return coordinatorConversation.includes(`New Task assigned to you: ${taskA}`); }, "coordinator received Task A again", 60_000);
    expect(coordinatorConversation.indexOf(`New Task assigned to you: ${taskB}`)).toBeLessThan(coordinatorConversation.indexOf(`New Task assigned to you: ${taskA}`));
    expect(coordinatorConversation).toContain("STILL-B");
    expect(await launchesOf(coordinator, argvFrom)).toEqual([{ resumed: true, conversation: resumedB[0]!.conversation }]);
    const aEntries = await entriesOf(projectId, taskA, teamKey);
    expect(aEntries).toHaveLength(2);
    expect(aEntries[0]).toEqual(aEntryAtDone[0]);
    expect(aEntries[1]).toMatchObject({ role: "assigned", assignedBy: root.managerRunId, recipientAddress: squadAddress, start: "started", closedAt: null });
    expect(Date.parse(aEntries[1]!.linkedAt)).toBeGreaterThan(Date.parse(aEntries[0]!.closedAt));
    expect(await fs.readFile(resourcesFile(projectId, taskB), "utf8")).toBe(bFileAtDone);
    await until(async () => (await taskOf(projectId, taskA)).root?.closed === false, "Task A root is the copy again", 30_000);
    expect((await taskOf(projectId, taskA)).root).toMatchObject({ kind: "team", teamRunId: team, closed: false });
    expect(await taskOf(projectId, taskB)).toMatchObject({ status: "DONE", root: { teamRunId: team, closed: true, status: "offline" } });
    const listedAgain = await root.managerCalls(callTool("list_project_tasks", { project_id: projectId }));
    const aListed = (listedAgain.tasks as any[]).find((task) => task.taskId === taskA);
    expect(aListed).toMatchObject({ assignments: [teamView], closedAssignments: [teamView] });
    expect(await openEntriesAcross(projectId, teamKey)).toEqual([taskA]);
    record.backToA = { backToA, aEntries };

    // AC-003: the Agent copy. Task C DONE closes the worker and its sub-work; Task D given to the worker by its agent run
    // ID reopens only the worker (the sub-work stays closed) and continues its conversation.
    from = root.mark();
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskC, status: "DONE" }));
    await until(() => root.closedSince(from).includes(`agent:${worker}`), "closure of the worker at Task C DONE", 60_000);
    await until(() => !processLive(worker), "worker process stopped at Task C DONE", 30_000);
    from = root.mark(); argvFrom = await argvMark();
    const assignedD = await root.managerCalls(callTool("delegate_task", { target_agent_run_id: worker, task_id: taskD }));
    expect(assignedD).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: worker });
    expect(root.reopenedSince(from)).toEqual([[`agent:${worker}`]]);
    let workerConversation = "";
    await until(async () => { workerConversation = JSON.stringify(await root.conversationOf(worker, workerNode.address));
      return workerConversation.includes(`New Task assigned to you: ${taskD}`); }, "worker received Task D", 60_000);
    expect(workerConversation.indexOf(`PRE-C-${kind}`)).toBeLessThan(workerConversation.indexOf(`New Task assigned to you: ${taskD}`));
    expect(await launchesOf(worker, argvFrom)).toEqual([{ resumed: true, conversation: expect.any(String) }]);
    const afterD = await root.snapshot();
    expect(keys(afterD.closed)).toContain(`agent:${subWork}`);
    expect(keys(afterD.closed)).not.toContain(`agent:${worker}`);
    await until(async () => (await taskOf(projectId, taskD)).root?.start === "started", "Task D root started", 30_000);
    expect((await taskOf(projectId, taskD)).root).toMatchObject({ kind: "agent", ingressAgentRunId: worker, teamRunId: null, closed: false });
    // AC-004 for the Agent copy: Task C DONE again does not stop it; AC-005 with CANCELLED: Task D CANCELLED does.
    from = root.mark();
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskC, status: "DONE" }));
    await sleep(2_000);
    expect(root.closedSince(from)).not.toContain(`agent:${worker}`);
    expect(processLive(worker)).toBe(true);
    from = root.mark();
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskD, status: "CANCELLED" }));
    await until(() => root.closedSince(from).includes(`agent:${worker}`), "closure of the worker at Task D CANCELLED", 60_000);
    await until(() => !processLive(worker), "worker process stopped at Task D CANCELLED", 30_000);
    record.agentCopy = { assignedD, worker };

    root.close();
    await terminate(kind, root.rootId);
    evidence[kind] = { ...record, rootId: root.rootId, managerRunId: root.managerRunId, projectId, taskA, taskB, taskC, taskD, team, coordinator };
  };

  it("EXC-E2E-001 standalone Agent root: explicit IDs, every refusal, Team copy A → B → A, Agent copy C → D, repeated closes of the earlier Task, views", async () => {
    await rootScenario("agent");
  }, 420000);

  it("EXC-E2E-002 Agent Team root: the same journey through the Team stream; a teammate is not the assigner", async () => {
    await rootScenario("team");
  }, 420000);

  it("EXC-E2E-003 Agent Org root: the same journey through the Org stream; an Org member is not the assigner", async () => {
    await rootScenario("org");
  }, 420000);

  it("EXC-E2E-004 QR-001: DONE of the copy's Task and its next assignment as parallel tool calls in one Manager turn, both orders", async () => {
    const projectId = await createProject("race");
    const root = await startRoot("team");
    const squadAddress = `/${segment(names.squad)}`;
    const rounds: unknown[] = [];
    for (const copyKind of ["team", "agent"] as const) {
      let current = await createTask(projectId, `Race ${copyKind} start.`);
      const first = await root.managerCalls(callTool("delegate_task", { recipient_address: copyKind === "team" ? squadAddress : "/worker", task_id: current }));
      expect(first.delegated, JSON.stringify(first)).toBe(true);
      const idField = copyKind === "team" ? "target_team_run_id" : "target_agent_run_id";
      const copyId = first[idField] as string;
      const ingress = (copyKind === "team" ? first.target_team_coordinator_agent_run_id : first.target_agent_run_id) as string;
      const key = copyKind === "team" ? `team:${copyId}` : `agent:${copyId}`;
      const node = copyKind === "team" ? await teamCopyOf(root, copyId)
        : (await root.waitForNodes("agent copy", (nodes) => nodes.some((n) => n.agentRunId === copyId))).find((n) => n.agentRunId === copyId)!;
      const ingressAddress = copyKind === "team" ? node.members.find((m: any) => m.agentRunId === ingress)!.address as string : node.address as string;
      // Delays put the assignment after the DONE (positive) or the DONE after the assignment (negative), in ms. The
      // assignment lands right behind the DONE's commit and release at a few ms (dense offsets there), refused before.
      for (const offset of [0, 5, 7, 9, 11, 13, 15, 30, 60, 120, -20, -60]) {
        const next = await createTask(projectId, `Race ${copyKind} follow-up ${offset}.`);
        const [done, assigned] = await root.managerCallsAtOnce([
          { name: "create_or_update_task", arguments: { task_id: current, status: "DONE" }, delayMs: offset < 0 ? -offset : 0 },
          { name: "delegate_task", arguments: { [idField]: copyId, task_id: next }, delayMs: offset > 0 ? offset : 0 },
        ]);
        expect(done, JSON.stringify(done)).toMatchObject({ task: { taskId: current, status: "DONE" } });
        await sleep(2_500); // Let a release requested by the DONE settle before checking that it did not stop a moved copy.
        const open = await openEntriesAcross(projectId, key);
        expect(open.length, `open entries of ${key}: ${JSON.stringify(open)}`).toBeLessThanOrEqual(1);
        let outcome: string;
        if (assigned.delegated === true) {
          // The copy now works on the next Task: open there only, live, listed, and it received the work.
          expect(open).toEqual([next]);
          expect(processLive(ingress), `${key} must not be stopped while assigned ${next} (offset ${offset})`).toBe(true);
          expect(keys((await root.snapshot()).closed)).not.toContain(key);
          await until(async () => JSON.stringify(await root.conversationOf(ingress, ingressAddress)).includes(`New Task assigned to you: ${next}`),
            "the copy received the next Task", 60_000);
          await sleep(1_500);
          expect(processLive(ingress), `${key} still live after the next Task arrived (offset ${offset})`).toBe(true);
          outcome = "assigned";
          current = next;
        } else {
          // The assignment saw the earlier Task still open: refused naming it; the copy closed with that Task and stopped.
          expect(assigned.message, JSON.stringify(assigned)).toMatch(new RegExp(`This copy still works on Task ${current}`));
          expect(open).toEqual([]);
          expect(await entriesOf(projectId, next, key)).toEqual([]);
          await until(() => !processLive(ingress), "copy stopped with its DONE Task", 30_000);
          outcome = "refused-busy";
          // The Manager retries the follow-up now that the Task is DONE.
          const retried = await root.managerCalls(callTool("delegate_task", { [idField]: copyId, task_id: next }));
          expect(retried.delegated, JSON.stringify(retried)).toBe(true);
          current = next;
        }
        rounds.push({ copyKind, offset, outcome, assigned });
      }
    }
    const outcomes = new Set(rounds.map((round: any) => round.outcome));
    root.close();
    await terminate("team", root.rootId);
    evidence.race = { projectId, rounds, outcomes: [...outcomes] };
  }, 600000);

  it("EXC-E2E-005 cross-root sender: a team run ID message names the coordinator; another root's copy is not assignable", async () => {
    const projectId = await createProject("cross-root");
    const taskA = await createTask(projectId, "Cross-root A.");
    const taskB = await createTask(projectId, "Cross-root B.");
    const owner = await startRoot("team");
    const other = await startRoot("agent");
    const delegated = await owner.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.squad)}`, task_id: taskA }));
    const team = delegated.target_team_run_id as string;
    const coordinator = delegated.target_team_coordinator_agent_run_id as string;
    await owner.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "DONE" }));
    const files = await projectFiles(projectId);
    // AC-012 from another root's agent: the directory finds the Team copy in its active root and names the coordinator.
    const toTeamRun = await other.managerCalls(callTool("send_message_to", { target_agent_run_id: team, content: "Hello from another root." }));
    expect(toTeamRun).toMatchObject({ accepted: false, code: "TARGET_IS_TEAM_RUN",
      message: `${team} is a Team run; send_message_to reaches agents. Message its coordinator agent run ${coordinator}.` });
    // AC-008: a copy hosted by another root is not a copy of the sender's run.
    const crossAssign = await other.managerCalls(callTool("delegate_task", { target_team_run_id: team, task_id: taskB }));
    expect(crossAssign).toEqual({ delegated: false, message: `${team} is not a delegated copy in this run. Use the ID delegate_task returned `
      + "for a copy delegated in this run, or delegate to a new copy with recipient_address." });
    expect(await projectFiles(projectId)).toEqual(files);
    // A team run of a root that is no longer active gets the existing not-active refusal, as an agent run ID there would.
    owner.close();
    await terminate("team", owner.rootId);
    const inactive = await other.managerCalls(callTool("send_message_to", { target_agent_run_id: team, content: "Anyone?" }));
    expect(inactive).toMatchObject({ accepted: false });
    expect(inactive.code).not.toBe("TARGET_IS_TEAM_RUN");
    other.close();
    await terminate("agent", other.rootId);
    evidence.crossRoot = { team, coordinator, toTeamRun, crossAssign, inactive };
  }, 300000);

  it("EXC-E2E-006 AC-009: a copy that never started (a real start failure, found through list_project_tasks) is refused as never started", async () => {
    const projectId = await createProject("never-started");
    // The /worker member is configured with a model its runtime does not offer: its copy cannot start (a real start failure).
    const root = await startRoot("team", { "/worker": { llmModelIdentifier: "exc-no-such-model" } });
    const taskF = await createTask(projectId, "Start-failure work.");
    const taskG = await createTask(projectId, "Follow-up for a copy that never started.");
    const failed = await root.managerCalls(callTool("delegate_task", { recipient_address: "/worker", task_id: taskF }));
    expect(failed.delegated ?? false, JSON.stringify(failed)).toBe(false);
    // The Manager finds the copy in a new chat through list_project_tasks (outcome failed), cancels F, and tries again.
    const listed = await root.managerCalls(callTool("list_project_tasks", { project_id: projectId }));
    const fAssignment = (listed.tasks as any[]).find((task) => task.taskId === taskF).assignments[0];
    expect(fAssignment).toMatchObject({ kind: "agent", assignedBy: root.managerRunId, outcome: "failed" });
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskF, status: "CANCELLED" }));
    const files = await projectFiles(projectId);
    const neverStarted = await root.managerCalls(callTool("delegate_task", { target_agent_run_id: fAssignment.agentRunId, task_id: taskG }));
    evidence.neverStarted = { failed, fAssignment, neverStarted };
    expect(await projectFiles(projectId)).toEqual(files);
    expect(neverStarted.delegated).toBe(false);
    // REQ-005 / AC-009: the specific reason, not "not a delegated copy in this run" for an ID this run's Task lists.
    expect(neverStarted.message).toMatch(/never started/);
    root.close();
    await terminate("team", root.rootId);
  }, 300000);

  it("EXC-E2E-007 AC-009: a copy whose saved conversation is gone is refused before any change", async () => {
    const projectId = await createProject("lost-conversation");
    const root = await startRoot("team");
    // A copy whose saved conversation is gone (its memory folder removed while it is stopped): refused before the commit.
    const taskH = await createTask(projectId, "Helper work.");
    const taskI = await createTask(projectId, "Follow-up for a copy whose conversation is gone.");
    const helper = (await root.managerCalls(callTool("delegate_task", { recipient_address: "/helper", task_id: taskH }))).target_agent_run_id as string;
    await root.waitForNodes("helper copy", (nodes) => nodes.some((n) => n.agentRunId === helper));
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskH, status: "DONE" }));
    await until(() => !processLive(helper), "helper stopped at DONE", 30_000);
    const memoryDirs = spawnSync("find", [path.join(dataDir, "memory"), "-type", "d", "-name", helper], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
    expect(memoryDirs.length, "the helper's memory folder").toBeGreaterThan(0);
    for (const dir of memoryDirs) await fs.rm(dir, { recursive: true, force: true });
    const files = await projectFiles(projectId);
    const from = root.mark();
    const lost = await root.managerCalls(callTool("delegate_task", { target_agent_run_id: helper, task_id: taskI }));
    expect(lost).toMatchObject({ delegated: false });
    expect(lost.message).toMatch(/saved conversation is unavailable/);
    expect(await projectFiles(projectId)).toEqual(files);
    expect(root.reopenedSince(from)).toEqual([]);
    expect(processLive(helper)).toBe(false);
    root.close();
    await terminate("team", root.rootId);
    evidence.lostConversation = { helper, memoryDirs: memoryDirs.length, lost };
  }, 300000);

  (liveClaude ? it : it.skip)("EXC-E2E-008 real model (Claude Agent SDK) copy: after Task A is DONE, its follow-up Task B recalls Task A's conversation (AC-002)", async () => {
    const projectId = await createProject("live");
    const codeword = `HERON-${Math.floor(1000 + Math.random() * 9000)}`;
    const taskA = await createTask(projectId, `Remember this codeword for later: ${codeword}. Do not use any tools. Reply with only the word READY.`);
    const taskB = await createTask(projectId, "Which codeword did I give you in your previous Task? Do not use any tools. Reply with only the codeword.");
    // The scripted Manager drives the tools; the Org's /worker member (the copy) runs on a real Claude model.
    const root = await startRoot("org", {}, [{ address: "/worker", configuration: {
      workspaceRootPath: workspace, llmModelIdentifier: "haiku", llmConfig: null, autoExecuteTools: true, runtimeKind: "claude_agent_sdk" } }]);
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: "/worker", task_id: taskA }));
    expect(delegated).toMatchObject({ delegated: true, target_kind: "agent" });
    const worker = delegated.target_agent_run_id as string;
    const node = (await root.waitForNodes("live worker", (nodes) => nodes.some((n) => n.agentRunId === worker))).find((n) => n.agentRunId === worker)!;
    await until(async () => /READY/.test(JSON.stringify(await root.conversationOf(worker, node.address))), "live worker answered READY", 180_000);
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskA, status: "DONE" }));
    const assigned = await root.managerCalls(callTool("delegate_task", { target_agent_run_id: worker, task_id: taskB }));
    expect(assigned).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: worker });
    let conversation = "";
    await until(async () => { conversation = JSON.stringify(await root.conversationOf(worker, node.address));
      const asked = conversation.indexOf(`New Task assigned to you: ${taskB}`);
      return asked >= 0 && conversation.lastIndexOf(codeword) > asked; }, "live copy recalled Task A's codeword in Task B", 180_000);
    expect((await taskOf(projectId, taskA)).status).toBe("DONE");
    root.close();
    await terminate("org", root.rootId);
    // The scripted AGY actor only answers "OK" or "CALLED:…": READY and the recalled codeword come from the real model.
    evidence.liveClaude = { worker, codeword, assigned, recalled: true,
      replyAfterAssignment: conversation.slice(conversation.indexOf(`New Task assigned to you: ${taskB}`)).slice(0, 600) };
  }, 420000);
});
