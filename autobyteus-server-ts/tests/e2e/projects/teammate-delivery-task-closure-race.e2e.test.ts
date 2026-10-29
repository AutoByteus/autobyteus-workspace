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
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { AgentOrgCommunicationMessagesStore } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { RootCommunicationEngine } from "../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// A Task closing while a teammate message is being saved (agent-input-delivery-simplification SR-006 REQ-012, AC-012,
// DEC-005; DEC-001 = A) through the real Studio HTTP/WebSocket server, scoped MCP agent tools, Task services, roots,
// persistence coordinators and the AGY backend, for the standalone Agent, Agent Team and Agent Org roots. Only the
// external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`: `CALL_TOOL:{...}` calls the
// actual agent tool; anything else is answered `OK`).
// The Task is closed the way it is in real use: another agent marks the Project Task DONE with `update_task`
// (here an agent in a separate standalone root, the supported "DONE from another root" case). The race window is
// held open at the root's history store: one teammate message's file write waits until the closure has happened.
// Everything else (lock, Task scope, copy stop, results, events) is the production code. Per root:
// - TDR-001 (closure during the write): the Manager's run-ID message to a copy's lead is written while that copy's
//   Task is closed. The root does not fail-stop; the Manager gets the readable refusal
//   `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED"}` (DEC-005: the same as a closure found before the save); the
//   record stays in the message log and the root view; the lead never processes the message.
// - TDR-002 (closure while waiting behind another write, DEC-005 with the slot dropped): another copy's member is
//   writing a teammate message; the Manager's message to a second copy waits for the log lock; the second copy's Task
//   is closed. The Manager gets the same readable refusal; that message is never written; the first is delivered.
// - TDR-003 (the root keeps working): later messages are accepted and saved; after root stop and restore the history
//   reads back exactly (TDR-001's record and the blocking message, not TDR-002's), and messaging continues.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts --no-watch
// `TEAMMATE_DELIVERY_RACE_E2E_EVIDENCE_DIR` keeps a JSON receipt. The scripted CLI's opt-in `AGY_FAKE_TOOL_LOG` records
// what each agent saw; `AGY_FAKE_TOOL_TIMEOUT_MS` lifts its MCP client's 60 s timeout for the held call.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Kind = "agent" | "team" | "org";
type Frame = { type: string; payload: Record<string, any>; at: number };
type Copy = { teamRunId: string; members: Record<"lead" | "mate", { address: string; agentRunId: string }> };
const MODEL = "gemini-3.8-flash-low";
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const objectsIn = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Record<string, any>, ...Object.values(value).flatMap(objectsIn)];
};
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};
const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => (spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout
    .split("\n").find((line) => line.startsWith("n")) ?? "").slice(1));

/**
 * Holds one teammate-message log append open: the append of the message whose content starts with `marker` waits until
 * `release()`. The coordinator's log lock is held meanwhile, exactly as during a slow real write.
 */
type Gate = { marker: string; used: boolean; entered: Promise<void>; signalEntered(): void; released: Promise<void>; release(): void };
const gates: Gate[] = [];
const holdWrite = (marker: string): Gate => {
  let signalEntered!: () => void, release!: () => void;
  const gate: Gate = { marker, used: false, entered: new Promise<void>((resolve) => { signalEntered = resolve; }), signalEntered: () => signalEntered(),
    released: new Promise<void>((resolve) => { release = resolve; }), release: () => release() };
  gates.push(gate);
  return gate;
};
const restorers: Array<() => void> = [];
/**
 * What the delivery owner returned or threw for each message, by content (a read-only spy on the production engine).
 * The agent itself sees a thrown delivery error only as an opaque MCP protocol error, so this is where the
 * server-side outcome (e.g. `TaskDelegationError` `TASK_AGENT_RESOURCE_CLOSED`) is observed.
 */
const deliveryOutcomes = new Map<string, Record<string, unknown>>();
/** When the delivery owner started each message's delivery (epoch ms), by content. */
const deliveryStarts = new Map<string, number>();
const spyDeliveries = () => {
  const proto = RootCommunicationEngine.prototype as any;
  const original = proto.deliver as (...args: any[]) => Promise<unknown>;
  proto.deliver = async function spiedDeliver(this: unknown, input: { content?: string }, ...rest: unknown[]) {
    const key = String(input?.content ?? "").trim();
    const startedAt = Date.now();
    deliveryStarts.set(key, startedAt);
    try {
      const value = await original.call(this, input, ...rest);
      deliveryOutcomes.set(key, { resolved: value });
      return value;
    } catch (error) {
      deliveryOutcomes.set(key, { thrown: { name: (error as Error)?.name, code: (error as { code?: unknown })?.code ?? null,
        message: (error as Error)?.message } });
      throw error;
    }
  };
  restorers.push(() => { proto.deliver = original; });
};
const gateStore = (proto: Record<string, any>, method: string) => {
  const original = proto[method] as (...args: any[]) => Promise<unknown>;
  // `appendMessage(dir, rootRunId, message, owners)`: one committed message appended to each log it belongs to.
  proto[method] = function gatedAppend(this: unknown, ...args: any[]) {
    const content = args[2]?.content;
    const gate = gates.find((entry) => !entry.used && typeof content === "string" && content.startsWith(entry.marker));
    if (!gate) return original.apply(this, args);
    gate.used = true;
    gate.signalEntered();
    return gate.released.then(() => original.apply(this, args));
  };
  restorers.push(() => { proto[method] = original; });
};

suite("A Task closing while a teammate message is being saved never fail-stops the root (real HTTP/WS/scoped MCP, Task services and AGY backend, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", toolLog = "", app: FastifyInstance | undefined, url!: URL;
  /**
   * The outcome the scripted agent saw (result or MCP protocol error) for exactly one `send_message_to` call: the one whose
   * `content` is `content` and that targets `target` (a run ID or a recipient address). Never a call that only embeds the
   * text, such as a request asking another agent to send it.
   */
  type Target = Readonly<{ targetAgentRunId: string }> | Readonly<{ recipientAddress: string }>;
  const toolOutcome = async (content: string, target: Target) => {
    const lines = (await fs.readFile(toolLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const entry = lines.find((line) => line.name === "send_message_to" && line.arguments?.content === content
      && ("targetAgentRunId" in target ? line.arguments?.target_agent_run_id === target.targetAgentRunId
        : line.arguments?.recipient_address === target.recipientAddress));
    if (!entry) return null;
    return entry.error ? { protocolError: entry.error } : toolResult(`${JSON.stringify(entry.result)}`);
  };
  const awaitToolOutcome = async (content: string, target: Target, label: string) => {
    let outcome: Record<string, any> | null = null;
    await until(async () => Boolean(outcome = await toolOutcome(content, target)), label, 300_000);
    return outcome!;
  };
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", closer: "", worker: "", squad: "", team: "", org: "" };
  const names = { squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (teammate delivery race E2E)`, instructions: "Follow the user's request.", toolNames } },
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
  /**
   * The saved teammate messages among a root's agents: every `*communication_messages_*.jsonl` log under the memory
   * root (the root's coordinating log and the Task agents' own logs, sealed and active files), one message per line,
   * kept when its sender or receiver is one of `agentRunIds`, unique by `messageId`, in `createdAt` order. An unfinished
   * last line (an append that never returned) is ignored, as the reader does.
   */
  const savedHistory = async (agentRunIds: ReadonlySet<string>): Promise<Array<Record<string, any>>> => {
    const byId = new Map<string, Record<string, any>>();
    const visit = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "agy-project" && entry.name !== ".agents") await visit(file); continue; }
        if (!entry.isFile() || !/communication_messages_(active|\d{6})\.jsonl$/.test(entry.name)) continue;
        for (const line of (await fs.readFile(file, "utf8")).split("\n")) {
          if (!line.trim()) continue;
          let message: Record<string, any>; try { message = JSON.parse(line); } catch { continue; }
          if (typeof message.messageId !== "string") continue;
          if (agentRunIds.has(message.senderAgentRunId) || agentRunIds.has(message.receiverAgentRunId)) byId.set(message.messageId, message);
        }
      }
    };
    await visit(path.join(dataDir, "memory"));
    return [...byId.values()].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  };
  const contents = (messages: Array<Record<string, any>>) => messages.map((message) => String(message.content));
  /** `closedAt` of a Project Task's assigned copy (its Task side record, the Task's source of truth). */
  const closedAt = async (projectId: string, taskId: string, teamRunId: string) => {
    const file = path.join(dataDir, "projects", encodeURIComponent(projectId), "tasks", encodeURIComponent(taskId), "agent_run_resources.json");
    const parsed = JSON.parse(await fs.readFile(file, "utf8").catch(() => "{}"));
    return ((parsed.agentRunResources ?? []) as any[]).find((entry) => entry.agentRun?.teamRunId === teamRunId)?.closedAt ?? null;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "teammate-delivery-race-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_TOOL_TIMEOUT_MS", "AGY_FAKE_TOOL_LOG"]) savedEnv.set(key, process.env[key]);
    toolLog = path.join(dataDir, "agy-tool-calls.jsonl");
    process.env["AGY_FAKE_TOOL_LOG"] = toolLog;
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    // A tool call is held open across a cross-root Task closure: more than the MCP client's 60 s default on a loaded host.
    process.env["AGY_FAKE_TOOL_TIMEOUT_MS"] = "240000";
    gateStore(StandaloneRootPackageStore.prototype as any, "appendMessage");
    gateStore(AgentOrgCommunicationMessagesStore.prototype as any, "appendMessage");
    gateStore(TeamCommunicationStore.prototype as any, "appendMessage");
    spyDeliveries();
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.squad = `TDR Squad ${suffix}`;
    ids.manager = await agentDefinition(`TDR Manager ${suffix}`, []);
    ids.closer = await agentDefinition(`TDR Closer ${suffix}`, ["create_task", "update_task"]);
    ids.worker = await agentDefinition(`TDR Worker ${suffix}`, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.worker, refScope: "SHARED" }, { memberName: "mate", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `TDR Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `TDR Org ${suffix}`, description: "Org root", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }] } },
    )).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const gate of gates) gate.release();
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    for (const restore of restorers) restore();
    const leftover = liveAgyCwds().filter((cwd) => dataDir && cwd.includes(path.basename(dataDir)));
    if (leftover.length) errors.push(`live AGY processes after close: ${leftover.join(", ")}`);
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TEAMMATE_DELIVERY_RACE_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "teammate-delivery-task-closure-race.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A root of one kind with its Manager, a live view, and readers of conversations and the tree. */
  const startRoot = async (kind: Kind, definitionId?: string) => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: definitionId ?? ids.manager, ...config() } })).createAgentRun;
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
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), teamOverrides: [], agentOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      managerRunId = (tree.rootOrg.members as any[]).find((member) => member.address === "/manager")!.agentRunId;
    }
    active.push({ kind, rootId });
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const channels: { input: Awaited<ReturnType<typeof connect>> | null; view: Awaited<ReturnType<typeof connect>> } = {
      input: kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null,
      view: await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot)),
    };
    const reconnect = async () => {
      if (kind === "org") {
        const restored = (await graphql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).restoreAgentOrgRun;
        expect(restored.success, restored.message).toBe(true);
      }
      if (kind === "agent") channels.input = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
      channels.view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
      active.push({ kind, rootId });
    };
    const closeChannels = () => { channels.view.socket.close(); channels.input?.socket.close(); };
    /** A fresh view's snapshot of the root's saved messages (what a newly opened Team tab shows). */
    const snapshotMessages = async (): Promise<string[]> => {
      const view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
      const payload = view.frames.find(isSnapshot)!.payload;
      view.socket.close();
      const body = kind === "agent" ? payload.root_agent : kind === "org" ? payload.root_org : payload;
      const list = (body.communication_messages?.messages ?? body.messages ?? []) as any[];
      return list.map((message) => String(message.content));
    };
    const send = (agentRunId: string, content: string) => {
      if (kind === "org") channels.view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? channels.input!.socket : channels.view.socket, { agent_run_id: agentRunId, content });
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
    /** Sends one scripted tool call to the Manager; resolves with its tool result (started now, awaited by the caller). */
    const managerCalls = async (content: string, ms = 120_000) => {
      const before = calledResults(await conversationOf(managerRunId, managerAddress)).length;
      send(managerRunId, content);
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(managerRunId, managerAddress)); return results.length > before; },
        `${kind}: Manager tool result for ${content.slice(0, 100)}`, ms);
      return toolResult(results[before]!);
    };
    const memberCalled = async (member: { agentRunId: string; address: string }, before: number, label: string) => {
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(member.agentRunId, member.address)); return results.length > before; },
        `${kind}: ${label}`, 120_000);
      return toolResult(results[before]!);
    };
    const conversationText = async (member: { agentRunId: string; address: string }) => JSON.stringify(await conversationOf(member.agentRunId, member.address));
    const answered = (member: { agentRunId: string; address: string }, marker: string) => until(async () => {
      const text = await conversationText(member);
      return text.includes(marker) && text.lastIndexOf("OK") > text.indexOf(marker);
    }, `${kind}: ${member.address} answered ${marker}`, 60_000);
    const sendToManager = (content: string) => send(managerRunId, content);
    return { kind, rootId, managerRunId, liveTree, conversationOf, conversationText, managerCalls, memberCalled, answered, snapshotMessages, sendToManager,
      reconnect, closeChannels };
  };
  type Root = Awaited<ReturnType<typeof startRoot>>;

  const copyOf = async (root: Root, result: Record<string, any>, known: readonly string[]): Promise<Copy> => {
    // A Team copy's result names its team run and coordinator.
    const lead = (result.target_team_coordinator_agent_run_id ?? result.target_agent_run_id) as string;
    expect(lead, JSON.stringify(result)).toBeTruthy();
    if (typeof result.target_team_run_id === "string") known = known.filter((id) => id !== result.target_team_run_id);
    let found: Copy | undefined;
    await until(async () => {
      for (const record of objectsIn(await root.liveTree())) {
        const teamRunId = record.teamRunId ?? record.team_run_id;
        if (typeof teamRunId !== "string" || known.includes(teamRunId) || !Array.isArray(record.members)) continue;
        const members = Object.fromEntries((record.members as any[]).map((member) => [String(member.address).split("/").pop(),
          { address: member.address, agentRunId: member.agentRunId ?? member.agent_run_id }]));
        if (members.lead?.agentRunId === lead) { found = { teamRunId, members: members as Copy["members"] }; return true; }
      }
      return false;
    }, `${root.kind}: copy of ${lead}`, 60_000);
    return found!;
  };

  /** The Closer: an agent in its own standalone root that marks Tasks DONE, as another agent does in real use. */
  let closer: Root;
  const closeTask = (taskId: string) => {
    // Not awaited: the Closer's tool call may finish only after the held write (the closure also stops the copy).
    void closer.managerCalls(callTool("update_task", { task_id: taskId, status: "DONE" }), 240_000).catch(() => undefined);
  };

  const rootScenario = async (kind: Kind) => {
    const record: Record<string, unknown> = {};
    evidence[kind] = record;
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `TDR ${kind} ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    // Tools name a Project Task by its key; its folder (and `agent_run_resources.json`) by its stored ID.
    const task = async (description: string) => (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}`,
      { input: { projectId, title: description.split("\n")[0]!, description } })).createProjectTask as { taskId: string; taskKey: string };
    const [taskA, taskB, taskC] = [await task("Docs review A."), await task("Docs review B."), await task("Docs review C.")];
    const root = await startRoot(kind);
    const squad = kind === "org" ? "/squad" : `/${segment(names.squad)}`;
    const copies: Copy[] = [];
    const delegate = async (task: { taskKey: string }) => {
      const result = await root.managerCalls(callTool("delegate_task", { recipient_address: squad, task_id: task.taskKey }));
      expect(result.target_kind, JSON.stringify(result)).toBe("team");
      const copy = await copyOf(root, result, copies.map((entry) => entry.teamRunId));
      copies.push(copy);
      return copy;
    };
    const [copyA, copyB, copyC] = [await delegate(taskA), await delegate(taskB), await delegate(taskC)];
    /** This root's agents: its Manager and every copy member (the senders and receivers of its messages). */
    const rootAgents = () => new Set([root.managerRunId, ...copies.flatMap((copy) => Object.values(copy.members).map((member) => member.agentRunId))]);
    record.copies = { copyA, copyB, copyC };

    // TDR-001: copy C's Task closes while the Manager's message to C's lead is being written.
    const t0 = Date.now();
    const timeline: Array<[string, number]> = [];
    const mark = (label: string) => timeline.push([label, Date.now() - t0]);
    record.timeline = timeline;
    const race1 = `RACE1-${kind}-${randomUUID().slice(0, 6)}`;
    const gate1 = holdWrite(race1);
    root.sendToManager(callTool("send_message_to", { target_agent_run_id: copyC.members.lead.agentRunId, content: race1 }));
    await Promise.race([gate1.entered, wait(60_000).then(() => { throw new Error(`${kind}: TDR-001 write never started`); })]);
    mark("tdr001 write held");
    closeTask(taskC.taskKey);
    await until(async () => (await closedAt(projectId, taskC.taskId, copyC.teamRunId)) !== null, `${kind}: Task C closed`, 120_000);
    mark("tdr001 task closed");
    await wait(1_500); // the closure's copy stop proceeds while the write is held
    gate1.release();
    mark("tdr001 write released");
    const outcome1 = await awaitToolOutcome(race1, { targetAgentRunId: copyC.members.lead.agentRunId }, `${kind}: TDR-001 sender outcome`);
    mark("tdr001 sender result");
    const delivered1 = deliveryOutcomes.get(race1);
    record.tdr001 = { agentSaw: outcome1, delivery: delivered1 };
    // DEC-005: the same returned refusal as a closure found before the save, readable by the agent; not a fail-stop.
    expect(delivered1, `${kind} TDR-001 delivery outcome`).toMatchObject({ resolved: { accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" } });
    expect(outcome1, `${kind} TDR-001 agent-visible outcome`).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    await until(async () => contents(await savedHistory(rootAgents())).includes(race1), `${kind}: TDR-001 record saved`, 15_000);
    expect(await root.snapshotMessages(), `${kind} TDR-001 record shown in the root view`).toContain(race1);
    await wait(2_000);
    expect(await root.conversationText(copyC.members.lead), `${kind} TDR-001 recipient never processes`).not.toContain(race1);

    // TDR-002 (CR-001): copy A's lead is writing a teammate message; the Manager's message to B waits for the lock;
    // B's Task closes; then A's write finishes.
    const blocker = `BLOCKER-${kind}-${randomUUID().slice(0, 6)}`;
    const raceB = `RACEB-${kind}-${randomUUID().slice(0, 6)}`;
    const gate2 = holdWrite(blocker);
    const asked = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copyA.members.lead.agentRunId,
      content: callTool("send_message_to", { recipient_address: copyA.members.mate.address, content: blocker }) }));
    expect(asked, `${kind} Manager → A lead ${JSON.stringify(asked)}`).toMatchObject({ accepted: true });
    await Promise.race([gate2.entered, wait(60_000).then(() => { throw new Error(`${kind}: TDR-002 blocking write never started`); })]);
    root.sendToManager(callTool("send_message_to", { target_agent_run_id: copyB.members.lead.agentRunId, content: raceB }));
    await wait(3_000); // the Manager's delivery holds B's slot and waits for the history lock
    mark("tdr002 blocking write held; B message waiting");
    closeTask(taskB.taskKey);
    await until(async () => (await closedAt(projectId, taskB.taskId, copyB.teamRunId)) !== null, `${kind}: Task B closed`, 120_000);
    mark("tdr002 task closed");
    const taskBClosedAt = Date.now();
    await wait(1_500);
    gate2.release();
    mark("tdr002 write released");
    const outcome2 = await awaitToolOutcome(raceB, { targetAgentRunId: copyB.members.lead.agentRunId }, `${kind}: TDR-002 sender outcome`);
    mark("tdr002 sender result");
    const blockerOutcome = await awaitToolOutcome(blocker, { recipientAddress: copyA.members.mate.address }, `${kind}: A lead's teammate message result`);
    const delivered2 = deliveryOutcomes.get(raceB);
    record.tdr002 = { agentSaw: outcome2, delivery: delivered2, blockerAgentSaw: blockerOutcome, blockerDelivery: deliveryOutcomes.get(blocker),
      mateAgentRunId: copyA.members.mate.agentRunId, bDeliveryStartedMsBeforeTaskBClosed: taskBClosedAt - (deliveryStarts.get(raceB) ?? taskBClosedAt) };
    expect(delivered2, `${kind} TDR-002 delivery outcome`).toMatchObject({ resolved: { accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" } });
    expect(outcome2, `${kind} TDR-002 agent-visible outcome`).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    // Precondition of the CR-001 case: B's delivery was already in flight (its slot held, waiting for the lock) when B closed.
    expect(deliveryStarts.get(raceB), `${kind} TDR-002 B delivery started before Task B closed`).toBeLessThan(taskBClosedAt);
    expect(blockerOutcome, `${kind} blocking message`).toMatchObject({ accepted: true, target_agent_run_id: copyA.members.mate.agentRunId });
    expect(deliveryOutcomes.get(blocker)).toMatchObject({ resolved: { accepted: true } });
    await root.answered(copyA.members.mate, blocker);
    const afterRace = contents(await savedHistory(rootAgents()));
    expect(afterRace, `${kind} history after the races`).toEqual(expect.arrayContaining([race1, blocker]));
    expect(afterRace).not.toContain(raceB);
    expect(await root.conversationText(copyB.members.lead)).not.toContain(raceB);

    // TDR-003: the root keeps working; stop and restore read the history back; messaging continues.
    const after = `AFTER-${kind}-${randomUUID().slice(0, 6)}`;
    const afterOutcome = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copyA.members.lead.agentRunId, content: after }));
    expect(afterOutcome, `${kind} after the races ${JSON.stringify(afterOutcome)}`).toMatchObject({ accepted: true });
    await root.answered(copyA.members.lead, after);
    const beforeStop = contents(await savedHistory(rootAgents()));
    expect(beforeStop).toEqual(expect.arrayContaining([race1, blocker, after]));
    expect(await root.snapshotMessages(), `${kind} live snapshot`).toEqual(beforeStop);
    root.closeChannels();
    await terminate(kind, root.rootId);
    await root.reconnect();
    expect(await root.snapshotMessages(), `${kind} restored snapshot`).toEqual(beforeStop);
    const post = `POST-RESTORE-${kind}-${randomUUID().slice(0, 6)}`;
    const postOutcome = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copyA.members.lead.agentRunId, content: post }));
    expect(postOutcome, `${kind} after restore ${JSON.stringify(postOutcome)}`).toMatchObject({ accepted: true });
    await root.answered(copyA.members.lead, post);
    const final = contents(await savedHistory(rootAgents()));
    expect(final).toEqual([...beforeStop, ...final.slice(beforeStop.length)]);
    expect(final).toContain(post);
    expect(final).not.toContain(raceB);
    record.tdr003 = { afterOutcome, postOutcome, history: final };
    root.closeChannels();
    await terminate(kind, root.rootId);
  };

  it.each(["agent", "team", "org"] as const)("%s root: Task closure during and before a teammate message save; the root keeps working and restores its history", async (kind) => {
    if (!closer) {
      closer = await startRoot("agent", ids.closer);
      // Warm the Closer (its first turn starts its runtime) so its DONE lands promptly during the held write.
      await closer.managerCalls(callTool("create_task", { project_id: (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
        { input: { name: `TDR warm-up ${randomUUID().slice(0, 6)}` } })).createProject.projectId, title: "Warm-up task.", description: "Warm-up task." }));
    }
    await rootScenario(kind);
  }, 600_000);
});
