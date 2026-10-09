import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Idle shutdown of delegated copies with runtime background tasks (idle-shutdown-background-tasks SR-003:
// REQ-001..REQ-004, AC-002, AC-003, AC-004, AC-006, AC-007) through the real Studio HTTP/WebSocket server, scoped
// MCP, Task services, roots, idle-shutdown lifecycle and the real AGY backend/background-task monitor, for the
// standalone Agent, Agent Team and Agent Org roots. Only the external AGY CLI is scripted
// (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes the agent call the actual agent
// tool; `BACKGROUND_STEP:{"seconds":N}` leaves a daemon step open at turn end and writes AGY's exit message after
// N seconds; anything else is answered `OK`. No provider inference.
// The grace period is the server setting at its minimum (60 s). In every root, at the same time:
// - an Agent copy and a Team copy (its coordinator) run a 100 s background step: neither is shut down while it runs,
//   and each is shut down one grace period after the step exits (no turn follows an AGY exit). The Agent copy's step
//   fails (exit code 3, task `failed`); the Team copy's step succeeds (exit code 0, task `completed`);
// - a quiet Agent copy is shut down after one grace period, and the Manager's message restores it;
// - copies whose 900 s step still runs are stopped at once by Task DONE and by root stop.
// "Shut down" is proven physically (the copy's CLI process is gone) and on the root's status feed (`offline`).
// About 3 minutes. `TASK_COPY_IDLE_LIFETIME_E2E_EVIDENCE_DIR` keeps a JSON receipt.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts --no-watch
// The AGY brain root (exit messages) is under HOME, resolved at module import: use a disposable HOME.
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "task-copy-idle-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const GRACE_KEY = "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS";
const GRACE_MS = 60_000;
const STEP_SECONDS = 100;
const LONG_STEP_SECONDS = 900;
/** A shutdown one grace period after its trigger, allowing for the monitor's 2 s poll, the serialized queue and our 2 s sampling. */
const SHUTDOWN_WINDOW = { min: GRACE_MS - 1_000, max: GRACE_MS + 15_000 };
const PROMPT_STOP_MS = 15_000;

type Frame = { type: string; payload: Record<string, any>; at: number };
type Kind = "agent" | "team" | "org";
type TaskNode = Record<string, any>;
type Signal = { agentRunId: string; kind: "status" | "background"; status: string; at: number };
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const step = (seconds: number, exitCode = 0) => `BACKGROUND_STEP:${JSON.stringify({ seconds, exitCode })}`;
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const objectsIn = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Record<string, any>, ...Object.values(value).flatMap(objectsIn)];
};
const taskNodes = (tree: unknown): TaskNode[] => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const agentRunId = record.agentRunId ?? record.agent_run_id;
  const teamRunId = record.teamRunId ?? record.team_run_id;
  if (typeof startedAt !== "string" || !(agentRunId || teamRunId)) return [];
  return [{ ...(teamRunId ? { teamRunId } : { agentRunId }), address: record.address,
    members: (record.members ?? []).map((member: any) => ({ address: member.address,
      agentRunId: member.agentRunId ?? member.agent_run_id })).filter((member: any) => member.agentRunId) }];
});
/** The `CALLED:<result>` replies of the scripted actor, in conversation order. */
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called }; }
};
/** Working directories of every live scripted AGY process (one per running agent; the cwd contains its run ID). */
const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => (spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout
    .split("\n").find((line) => line.startsWith("n")) ?? "").slice(1));
/**
 * Agent statuses and background-task updates on a root view: a Team view's `AGENT_STATUS` / `BACKGROUND_TASK_UPDATED`
 * frames, or an Agent/Org view's `agent_presentation` events carrying those messages.
 */
const signalsIn = (frames: readonly Frame[]): Signal[] => frames.flatMap((frame) => {
  const kindOf = (type: unknown) => type === "AGENT_STATUS" ? "status" as const : type === "BACKGROUND_TASK_UPDATED" ? "background" as const : null;
  const direct = kindOf(frame.type);
  if (direct) return typeof frame.payload.agent_run_id === "string" && typeof frame.payload.status === "string"
    ? [{ agentRunId: frame.payload.agent_run_id, kind: direct, status: frame.payload.status, at: frame.at }] : [];
  return objectsIn(frame.payload).flatMap((record) => {
    const kind = kindOf(record.message?.type);
    const status = record.message?.payload?.status;
    return kind && typeof record.agent_run_id === "string" && typeof status === "string"
      ? [{ agentRunId: record.agent_run_id, kind, status, at: frame.at }] : [];
  });
});

suite("Idle shutdown keeps delegated copies with running background tasks in every root (real HTTP/WS/scoped MCP and AGY monitor, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL, argvLog = "";
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", squad: "", team: "", org: "" };
  const names = { worker: "", squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  /** Live/gone times of every agent's CLI process, sampled every 2 s for the whole suite. */
  const processTimes = new Map<string, { firstSeen: number; lastSeen: number }>();
  let sampler: ReturnType<typeof setInterval> | undefined;
  const sample = () => {
    const now = Date.now();
    for (const cwd of liveAgyCwds()) {
      const runId = /([^/]+)\/agy-project$/.exec(cwd)?.[1] ?? cwd;
      const times = processTimes.get(runId);
      if (times) times.lastSeen = now; else processTimes.set(runId, { firstSeen: now, lastSeen: now });
    }
  };
  /** A CLI process for the run whose cwd mentions it is live now. */
  const processLive = (agentRunId: string) => liveAgyCwds().some((cwd) => cwd.includes(agentRunId));

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
    { input: { name, role: "assistant", description: `${name} (idle lifetime E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const launches = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean)
    .map((line) => JSON.parse(line) as { argv: string[]; cwd: string });
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

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-copy-idle-lifetime-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    // The operator setting at its minimum, so a background step can outlive it within the test.
    await fs.writeFile(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n${GRACE_KEY}=${GRACE_MS}\n`);
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const listed = ((await graphql(`query{getServerSettings{key value}}`)).getServerSettings as any[]).find((entry) => entry.key === GRACE_KEY);
    expect(listed?.value).toBe(String(GRACE_MS));
    const suffix = randomUUID().slice(0, 6);
    names.worker = `TIL Worker ${suffix}`; names.squad = `TIL Squad ${suffix}`;
    ids.manager = await agentDefinition(`TIL Manager ${suffix}`, ["create_or_update_task"]);
    ids.worker = await agentDefinition(names.worker, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `TIL Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `TIL Org ${suffix}`, description: "Org root", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "worker", ref: ids.worker, refType: "AGENT", refScope: "SHARED" },
        { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }] } },
    )).createAgentOrgDefinition.id;
    sampler = setInterval(sample, 2_000);
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    if (sampler) clearInterval(sampler);
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    const leftover = liveAgyCwds().filter((cwd) => cwd.startsWith(dataDir));
    if (leftover.length) errors.push(`live AGY processes after close: ${leftover.join(", ")}`);
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    const dir = process.env["TASK_COPY_IDLE_LIFETIME_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "task-copy-idle-lifetime.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true),
          homeRemoved: !home || await fs.access(home).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A root of one kind with its Manager, a live view of the root, and readers of its copies' conversations. */
  const startRoot = async (kind: Kind) => {
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
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() }] } })).createAgentTeamRun;
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
      managerRunId = (tree.rootOrg.members as any[]).find((member) => member.address === "/manager")!.agentRunId;
    }
    active.push({ kind, rootId });
    expect(managerRunId).toBeTruthy();
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const inputChannel = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null;
    const view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
    const sendToManager = (content: string) => {
      if (kind === "org") view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : view.socket, { agent_run_id: managerRunId, content });
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
    const managerAddress = kind === "agent" ? "/" : "/manager";
    /** The Manager calls one actual agent tool; returns its tool result. */
    const managerCalls = async (content: string) => {
      const before = calledResults(await conversationOf(managerRunId, managerAddress)).length;
      sendToManager(content);
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(managerRunId, managerAddress)); return results.length > before; },
        `${kind} manager tool result for ${content.slice(0, 120)}`, 60_000);
      return toolResult(results[before]!);
    };
    const nodes = async () => taskNodes(await liveTree());
    const signals = () => signalsIn(view.frames);
    /** Resolves with the first signal matching, waiting up to `ms`. */
    const signal = async (label: string, match: (entry: Signal) => boolean, ms = 60_000) => {
      let found: Signal | undefined;
      await until(() => Boolean(found = signals().find(match)), `${kind}: ${label}`, ms);
      return found!;
    };
    const answered = (agentRunId: string, address: string, marker: string) => until(async () => {
      const text = JSON.stringify(await conversationOf(agentRunId, address));
      return text.includes(marker) && text.lastIndexOf("OK") > text.indexOf(marker);
    }, `${kind}: ${address} (${agentRunId}) answered ${marker}`, 60_000);
    return { kind, rootId, managerRunId, view, managerCalls, nodes, signals, signal, answered };
  };

  /** Delegates one copy (its own Task with no Project); returns its ingress run, Task and tree node. */
  const delegate = async (root: Awaited<ReturnType<typeof startRoot>>, recipient: string, description: string) => {
    const result = await root.managerCalls(callTool("delegate_task", { recipient_address: recipient, description }));
    // An Agent copy is named by its own run; a Team copy by its team run and coordinator (the ingress).
    const ingress = (result.target_kind === "team" ? result.target_team_coordinator_agent_run_id : result.target_agent_run_id) as string;
    expect(ingress, JSON.stringify(result)).toBeTruthy();
    const taskId = AD_HOC_ID.exec(JSON.stringify(result))?.[0] as string;
    expect(taskId, JSON.stringify(result)).toBeTruthy();
    let node: TaskNode | undefined;
    await until(async () => Boolean(node = (await root.nodes()).find((entry) => entry.agentRunId === ingress
      || entry.members?.some((member: any) => member.agentRunId === ingress))), `${root.kind}: node of ${ingress}`, 60_000);
    const address = node!.teamRunId ? node!.members.find((member: any) => member.agentRunId === ingress)!.address : node!.address;
    return { ingress, taskId, node: node!, address: address as string, kind: result.target_kind as string,
      members: node!.teamRunId ? node!.members.map((member: any) => member.agentRunId as string) : [ingress] };
  };

  /** One root: every copy, its timeline and its assertions. */
  const rootScenario = async (kind: Kind) => {
    const root = await startRoot(kind);
    const workerAddress = kind === "agent" ? `/${segment(names.worker)}` : "/worker";
    const teamAddress = kind === "org" ? "/squad" : `/${segment(names.squad)}`;
    const background = await delegate(root, workerAddress, `Agent background work. ${step(STEP_SECONDS, 3)}`);
    const team = await delegate(root, teamAddress, `Team background work. ${step(STEP_SECONDS)}`);
    expect([background.kind, team.kind]).toEqual(["agent", "team"]);
    const quiet = await delegate(root, workerAddress, "Quiet work. Marker QUIET-FIRST.");
    const doneCopy = await delegate(root, workerAddress, `Work closed by DONE. ${step(LONG_STEP_SECONDS)}`);
    const stopCopy = await delegate(root, workerAddress, `Work stopped with the root. ${step(LONG_STEP_SECONDS)}`);

    // Each background copy reports its running task, then goes idle (its turn ended); the quiet copy answered and is idle.
    const timeline = async (agentRunId: string) => {
      const running = await root.signal(`${agentRunId} background running`, (e) => e.agentRunId === agentRunId && e.kind === "background" && e.status === "running");
      const idle = await root.signal(`${agentRunId} idle`, (e) => e.agentRunId === agentRunId && e.kind === "status" && e.status === "idle" && e.at >= running.at);
      return { running, idle };
    };
    const bg = await timeline(background.ingress);
    const tm = await timeline(team.ingress);
    const dn = await timeline(doneCopy.ingress);
    const st = await timeline(stopCopy.ingress);
    await root.answered(quiet.ingress, quiet.address, "QUIET-FIRST");
    const quietIdle = await root.signal("quiet idle", (e) => e.agentRunId === quiet.ingress && e.kind === "status" && e.status === "idle");
    for (const run of [background.ingress, team.ingress, quiet.ingress, doneCopy.ingress, stopCopy.ingress]) expect(processLive(run), run).toBe(true);

    // AC-006 control: the quiet copy is shut down one grace period after it went idle (the grace setting is in effect).
    const quietOffline = await root.signal("quiet offline", (e) => e.agentRunId === quiet.ingress && e.kind === "status" && e.status === "offline", GRACE_MS + 30_000);
    await until(() => !processLive(quiet.ingress), `${kind}: quiet copy process gone`, 15_000);
    const quietShutdownMs = quietOffline.at - quietIdle.at;

    // While their steps run, the background copies are not shut down although their grace period has elapsed.
    const lastIdle = Math.max(bg.idle.at, tm.idle.at, dn.idle.at, st.idle.at);
    await wait(Math.max(0, lastIdle + GRACE_MS + 5_000 - Date.now()));
    expect(Date.now() - lastIdle, "observed beyond one grace period").toBeGreaterThan(GRACE_MS);
    for (const run of [background.ingress, ...team.members, doneCopy.ingress, stopCopy.ingress]) {
      expect(root.signals().filter((e) => e.agentRunId === run && e.status === "offline"), `${kind} ${run} offline while its step runs`).toEqual([]);
    }
    for (const run of [background.ingress, team.ingress, doneCopy.ingress, stopCopy.ingress]) expect(processLive(run), `${kind} ${run} process`).toBe(true);

    // AC-007: Task DONE stops a copy whose background step is still running, at once.
    const doneAt = Date.now();
    await root.managerCalls(callTool("create_or_update_task", { task_id: doneCopy.taskId, status: "DONE" }));
    const doneStopped = await root.signal("DONE copy's task stopped", (e) => e.agentRunId === doneCopy.ingress && e.kind === "background" && e.status === "stopped", PROMPT_STOP_MS);
    await until(() => !processLive(doneCopy.ingress), `${kind}: DONE copy process gone`, PROMPT_STOP_MS);
    const doneStopMs = Date.now() - doneAt;

    // AC-006: the Manager's message restores the shut-down quiet copy (a relaunch with its provider conversation).
    const launchesBefore = (await launches()).length;
    const woken = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: quiet.ingress, content: "Wake up. Marker QUIET-LATER." }));
    expect(woken, `${kind} wake`).toMatchObject({ accepted: true, target_agent_run_id: quiet.ingress });
    await root.answered(quiet.ingress, quiet.address, "QUIET-LATER");
    const relaunches = (await launches()).slice(launchesBefore).filter((entry) => entry.cwd.includes(quiet.ingress));
    expect(relaunches, `${kind} quiet copy restore`).toHaveLength(1);
    expect(relaunches[0]!.argv).toContain("--conversation");

    // AC-002 / AC-003 / AC-004: each step exits (no turn follows); the copy is shut down one grace period later.
    const ended = async (copy: typeof background, endStatus: "completed" | "failed") => {
      const completed = await root.signal(`${copy.ingress} ${endStatus}`, (e) => e.agentRunId === copy.ingress && e.kind === "background" && e.status === endStatus, STEP_SECONDS * 1_000);
      const before = root.signals().filter((e) => e.agentRunId === copy.ingress && e.kind === "status" && e.status === "offline" && e.at < completed.at);
      expect(before, `${kind} ${copy.ingress} offline before its step ended`).toEqual([]);
      const offline = await root.signal(`${copy.ingress} offline after its step`, (e) => e.agentRunId === copy.ingress && e.kind === "status" && e.status === "offline", GRACE_MS + 30_000);
      await until(() => copy.members.every((member) => !processLive(member)), `${kind}: ${copy.ingress} processes gone`, 15_000);
      return { completed, offline, runningMs: completed.at - (copy === background ? bg : tm).idle.at, shutdownAfterEndMs: offline.at - completed.at };
    };
    const [bgEnd, tmEnd] = await Promise.all([ended(background, "failed"), ended(team, "completed")]);

    // The root-stop copy is still live (its step runs on), then root stop stops it at once.
    expect(processLive(stopCopy.ingress), `${kind} root-stop copy still live`).toBe(true);
    expect(root.signals().filter((e) => e.agentRunId === stopCopy.ingress && e.status === "offline")).toEqual([]);
    const stopAt = Date.now();
    await terminate(kind, root.rootId);
    await until(() => !processLive(stopCopy.ingress), `${kind}: root-stop copy process gone`, PROMPT_STOP_MS);
    const rootStopMs = Date.now() - stopAt;
    const stopCopyAliveMs = stopAt - st.idle.at;

    const record = { rootId: root.rootId, quietShutdownMs, doneStopMs, rootStopMs, stopCopyAliveMs,
      doneCopyAliveBeforeDoneMs: doneAt - dn.idle.at, doneTaskStoppedMs: doneStopped.at - doneAt,
      agentCopy: { endStatus: "failed", runningMs: bgEnd.runningMs, shutdownAfterEndMs: bgEnd.shutdownAfterEndMs },
      teamCopy: { endStatus: "completed", members: team.members, runningMs: tmEnd.runningMs, shutdownAfterEndMs: tmEnd.shutdownAfterEndMs },
      wakeRelaunch: relaunches[0]!.argv.slice(relaunches[0]!.argv.indexOf("--conversation"), relaunches[0]!.argv.indexOf("--conversation") + 2) };
    evidence[kind] = record;
    expect(quietShutdownMs).toBeGreaterThanOrEqual(SHUTDOWN_WINDOW.min);
    expect(quietShutdownMs).toBeLessThanOrEqual(SHUTDOWN_WINDOW.max);
    for (const end of [bgEnd, tmEnd]) {
      expect(end.runningMs, `${kind}: step outlived the grace period`).toBeGreaterThan(GRACE_MS);
      expect(end.shutdownAfterEndMs).toBeGreaterThanOrEqual(SHUTDOWN_WINDOW.min);
      expect(end.shutdownAfterEndMs).toBeLessThanOrEqual(SHUTDOWN_WINDOW.max);
    }
    expect(record.doneCopyAliveBeforeDoneMs).toBeGreaterThan(GRACE_MS);
    expect(doneStopMs).toBeLessThanOrEqual(PROMPT_STOP_MS + 60_000); // includes the scripted Manager's tool round-trip
    expect(record.doneTaskStoppedMs).toBeLessThanOrEqual(PROMPT_STOP_MS);
    expect(stopCopyAliveMs).toBeGreaterThan(GRACE_MS);
    expect(rootStopMs).toBeLessThanOrEqual(PROMPT_STOP_MS);
    return record;
  };

  it("background copies outlive the grace period and are released one grace period after their step ends; quiet copies, DONE and root stop are unchanged", async () => {
    const settled = await Promise.allSettled((["agent", "team", "org"] as const).map(rootScenario));
    evidence.processTimes = Object.fromEntries(processTimes);
    const failures = settled.flatMap((result, index) => result.status === "rejected" ? [`${["agent", "team", "org"][index]}: ${String(result.reason?.stack ?? result.reason)}`] : []);
    expect(failures).toEqual([]);
  }, 900_000);
});
