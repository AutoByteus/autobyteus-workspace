/**
 * One identity per platform notice on every route (autobyteus-526 SR-002). A background command of an agent ends while
 * the agent is idle; the platform tells the agent in a notice ("[Platform notice — background tasks finished]"). Each
 * case reads that notice where a client reads it, live and stored, on a real in-process studio server:
 *
 *   PNI-01  native agent run: the agent stream's `SYSTEM_TASK_NOTIFICATION` carries a `message_id`; the stored
 *           conversation (`getRunProjection`, what a reload loads) has the notice once with that `messageId`; a
 *           reconnecting socket gives it at most once more as a frame (the web shows an id once)
 *   PNI-02  a Team member (native): the team stream's frame carries the member's `agent_run_id` and a `message_id`; the
 *           member's stored conversation (`getTeamMemberRunProjection`) has it once with that `messageId`
 *   PNI-03  an Org member (native): the Org view (`/ws/agent-org`, the collaboration presentation of each agent) carries
 *           the notice as an `agent_presentation` message with a `message_id`; the member's stored conversation
 *           (`getAgentOrgMemberRunProjection`) has it once with that `messageId`
 *   PNI-04  (live) Claude: a background Bash command ends; the Claude background notice reaches the agent stream with a
 *           `message_id`, and the stored conversation has it once with that `messageId`
 *
 * Inference for PNI-01..03 is a scripted LM Studio-compatible server (each request answered by the case's next step).
 * Gate: RUN_PLATFORM_NOTICE_IDENTITY_E2E=1; PNI-04 also RUN_CLAUDE_E2E=1, the signed-in `claude` CLI and the real
 * HOME, USER and LOGNAME. Run (in autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_PLATFORM_NOTICE_IDENTITY_E2E=1 \
 *     pnpm exec vitest run tests/e2e/runtime/platform-notice-identity.e2e.test.ts --no-watch
 * Optional PLATFORM_NOTICE_IDENTITY_E2E_EVIDENCE_DIR keeps per-case JSON.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NativeRuntimeLiveHarness, isRecord, wait, type Json } from "../helpers/native-runtime-live-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";

const ENABLED = process.env.RUN_PLATFORM_NOTICE_IDENTITY_E2E === "1" && process.platform !== "win32";
const CLAUDE = ENABLED && process.env.RUN_CLAUDE_E2E === "1" && resolveClaudeCliExecutableCandidates().length > 0;
const EVIDENCE_DIR = process.env.PLATFORM_NOTICE_IDENTITY_E2E_EVIDENCE_DIR?.trim() || null;
const MODEL_KEY = "platform-notice-fixture";
const HEADER = "[Platform notice — background tasks finished]";

type Frame = { type: string; payload: Json; at: number };
type Notice = { messageId: unknown; agentRunId: unknown; content: string; at: number };
const until = async <T>(probe: () => T | undefined | null | false | Promise<T | undefined | null | false>, label: string, ms = 60_000): Promise<T> => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const value = await probe(); if (value !== undefined && value !== null && value !== false) return value as T; await wait(150); }
  throw new Error(`Timed out after ${ms} ms waiting for ${label}`);
};
const objectsIn = (value: unknown): Json[] => Array.isArray(value) ? value.flatMap(objectsIn)
  : isRecord(value) ? [value, ...Object.values(value).flatMap(objectsIn)] : [];
/** Every background-task notice a stream carried, in any wrapping (agent, team and Org view frames). */
const noticesIn = (frames: Frame[]): Notice[] => frames.flatMap((frame) => objectsIn({ type: frame.type, payload: frame.payload }).flatMap((record) => {
  if (record.type !== "SYSTEM_TASK_NOTIFICATION" || !isRecord(record.payload) || !String(record.payload.content ?? "").includes(HEADER)) return [];
  return [{ messageId: record.payload.message_id, agentRunId: record.payload.agent_run_id ?? null, content: String(record.payload.content), at: frame.at }];
}));
const storedNotices = (conversation: unknown) => (Array.isArray(conversation) ? conversation : [])
  .filter((item: Json) => item.kind === "system_task_notification" && String(item.content ?? "").includes(HEADER))
  .map((item: Json) => ({ messageId: item.messageId ?? null, content: String(item.content ?? "") }));

// --- scripted model ---------------------------------------------------------------------------------------------

type Reply = { toolCalls?: Array<{ name: string; args: Json }>; text?: string };
class ScriptedModel {
  readonly requests: Array<{ caseId: string; at: number; lastUser: string }> = [];
  private readonly scripts = new Map<string, Reply[]>();
  private server: Server | null = null;
  origin = "";
  script(caseId: string, steps: Reply[]): void { this.scripts.set(caseId, [...steps]); }
  of(caseId: string) { return this.requests.filter((request) => request.caseId === caseId); }
  async listen(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const address = this.server.address();
    this.origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  }
  async close(): Promise<void> { this.server?.closeAllConnections(); await new Promise<void>((resolve) => this.server ? this.server.close(() => resolve()) : resolve()); }
  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: MODEL_KEY, max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Json;
    const messages = (Array.isArray(body.messages) ? body.messages : []) as Json[];
    const caseId = JSON.stringify(messages).match(/CASE:([A-Z0-9-]+)/)?.[1] ?? "unknown";
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
    const lastUser = JSON.stringify([...messages].reverse().find((message) => message.role === "user")?.content ?? "");
    if (hasTools) this.requests.push({ caseId, at: Date.now(), lastUser });
    const reply: Reply = (hasTools ? this.scripts.get(caseId)?.shift() : undefined) ?? { text: "OK." };
    const toolCalls = reply.toolCalls?.map((call, index) => ({ index, id: `call-${randomUUID().slice(0, 12)}`, type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.args) } }));
    const delta = toolCalls?.length ? { role: "assistant", tool_calls: toolCalls } : { role: "assistant", content: reply.text ?? "OK." };
    const chunk = (value: Json, finish: string | null) => ({ id: `fixture-${this.requests.length}`, object: "chat.completion.chunk", created: 1,
      model: MODEL_KEY, choices: [{ index: 0, delta: value, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, toolCalls?.length ? "tool_calls" : "stop"))}\n\ndata: [DONE]\n\n`);
  }
}
const background = (command: string) => ({ name: "run_bash", args: { command, run_in_background: true } });

describe.skipIf(!ENABLED)("One identity per platform notice on every route", () => {
  const model = new ScriptedModel();
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: null, stepTimeoutMs: 300_000, tempPrefix: "pni-e2e" });
  const sockets: WebSocket[] = [];
  let modelIdentifier = "";

  const record = async (caseId: string, value: Json) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, `${caseId}.json`), JSON.stringify(value, null, 2));
  };
  const open = async (route: string, ready: string): Promise<Frame[] & { socket?: WebSocket }> => {
    const socket = new WebSocket(`ws://${harness.url.hostname}:${harness.url.port}${route}`);
    sockets.push(socket);
    const frames: Frame[] & { socket?: WebSocket } = [];
    frames.socket = socket;
    socket.on("message", (raw: unknown) => {
      try { const parsed = JSON.parse(String(raw)) as Json; if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {}, at: Date.now() }); } catch { /* ignore */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === ready), `${route} ${ready}`, 30_000);
    return frames;
  };
  const definition = (toolNames: string[]) => harness.createDefinition("pni", "Run the commands you are asked to run.", toolNames);
  const workspace = async () => fs.realpath(await harness.makeWorkspace());
  const nativeConfig = async () => ({ llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath: await workspace() });

  beforeAll(async () => {
    await model.listen();
    vi.stubEnv("LMSTUDIO_HOSTS", model.origin);
    await harness.start();
    const catalog = await harness.gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string; value: string }> } }>(
      "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value } } }",
      { p: "LMSTUDIO", r: "autobyteus" });
    modelIdentifier = catalog.ensureProviderModelCatalog.llmModels.find((entry) => entry.value === MODEL_KEY || entry.modelIdentifier.startsWith(MODEL_KEY))?.modelIdentifier ?? "";
    expect(modelIdentifier).not.toBe("");
  }, 180_000);
  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    await harness.stop();
    await model.close();
    vi.unstubAllEnvs();
  }, 180_000);

  it("PNI-01: native agent: the live frame's message_id is the stored notice's messageId; a reconnect gives it at most once", async () => {
    model.script("PNI-01", [{ toolCalls: [background("sleep 3; echo built")] }, { text: "Started." }, { text: "Noted." }]);
    const created = (await harness.gql<{ createAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: await definition(["run_bash"]), ...(await nativeConfig()) } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const frames = await open(`/ws/agent/${created.runId}`, "CONNECTED");
    sendE2eSendMessageCommand(frames.socket!, { content: "CASE:PNI-01 Start the build in the background." });
    const live = await until(() => noticesIn(frames)[0], "the background-task notice on the agent stream", 90_000);
    await until(() => model.of("PNI-01").length >= 3, "the agent's turn on the notice", 60_000);
    await wait(2_000);
    const stored = storedNotices((await harness.gql<{ getRunProjection: { conversation: unknown } }>(
      "query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: created.runId })).getRunProjection?.conversation);
    const reconnect = await open(`/ws/agent/${created.runId}`, "CONNECTED");
    await wait(3_000);
    await record("PNI-01", { runId: created.runId, live: noticesIn(frames), stored, reconnect: noticesIn(reconnect), reconnectTypes: [...new Set(reconnect.map((frame) => frame.type))] });

    expect(typeof live.messageId === "string" && live.messageId.length > 0, JSON.stringify(live)).toBe(true);
    expect(noticesIn(frames)).toHaveLength(1);
    expect(stored).toEqual([{ messageId: live.messageId, content: live.content }]);
    expect(noticesIn(reconnect).filter((notice) => notice.messageId !== live.messageId)).toEqual([]);
    expect(noticesIn(reconnect).length).toBeLessThanOrEqual(1);
  }, 300_000);

  it("PNI-02: a Team member: the team stream's frame carries its message_id; the member's stored conversation has it once", async () => {
    model.script("PNI-02", [{ toolCalls: [background("sleep 3; echo built")] }, { text: "Started." }, { text: "Noted." }]);
    const lead = await definition(["run_bash"]);
    const mate = await definition(["run_bash"]);
    const team = await harness.gql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `pni-team-${randomUUID().slice(0, 8)}`, description: "notice identity", instructions: "Follow your instructions.",
        coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: lead, refScope: "SHARED" }, { memberName: "mate", ref: mate, refScope: "SHARED" }] } });
    const config = await nativeConfig();
    const created = (await harness.gql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId: team.createAgentTeamDefinition.id, teamConfigs: [{ teamAddress: "/", ...config }],
        memberConfigs: [{ memberAddress: "/lead", agentDefinitionId: lead, ...config }, { memberAddress: "/mate", agentDefinitionId: mate, ...config }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const tree = (await harness.gql<{ getTeamRunResumeConfig: { executionTree: Json } }>(
      "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: created.teamRunId })).getTeamRunResumeConfig.executionTree;
    const leadRunId = String((((tree.root_team as Json).members as Json[]).find((member) => member.address === "/lead") ?? {}).agent_run_id);
    const frames = await open(`/ws/agent-team/${created.teamRunId}`, "CONNECTED");
    sendE2eSendMessageCommand(frames.socket!, { agent_run_id: leadRunId, content: "CASE:PNI-02 Start the build in the background." });
    const live = await until(() => noticesIn(frames)[0], "the background-task notice on the team stream", 90_000);
    await until(() => model.of("PNI-02").length >= 3, "the lead's turn on the notice", 60_000);
    await wait(2_000);
    const stored = storedNotices((await harness.gql<{ getTeamMemberRunProjection: { conversation: unknown } }>(
      "query($t: String!, $a: String!) { getTeamMemberRunProjection(teamRunId: $t, agentRunId: $a) { conversation } }",
      { t: created.teamRunId, a: leadRunId })).getTeamMemberRunProjection?.conversation);
    await record("PNI-02", { teamRunId: created.teamRunId, leadRunId, live: noticesIn(frames), stored });
    await harness.gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: created.teamRunId }).catch(() => undefined);

    expect(typeof live.messageId === "string" && live.messageId.length > 0, JSON.stringify(live)).toBe(true);
    expect(live.agentRunId).toBe(leadRunId);
    expect(noticesIn(frames)).toHaveLength(1);
    expect(stored).toEqual([{ messageId: live.messageId, content: live.content }]);
  }, 300_000);

  it("PNI-03: an Org member: the Org view's presentation of the notice carries its message_id; the member's stored conversation has it once", async () => {
    model.script("PNI-03", [{ toolCalls: [background("sleep 3; echo built")] }, { text: "Started." }, { text: "Noted." }]);
    const worker = await definition(["run_bash"]);
    const org = await harness.gql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `pni-org-${randomUUID().slice(0, 8)}`, description: "notice identity", instructions: "Deliver.", handoffs: [],
        members: [{ memberName: "worker", ref: worker, refType: "AGENT", refScope: "SHARED" }] } });
    const created = (await harness.gql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: org.createAgentOrgDefinition.id, rootConfiguration: { ...(await nativeConfig()), llmConfig: null }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId;
    const workerRunId = String(JSON.stringify((await harness.gql<{ getAgentOrgRunConfig: { executionTree: Json } }>(
      "query($id: String!) { getAgentOrgRunConfig(orgRunId: $id) { executionTree } }", { id: orgRunId })).getAgentOrgRunConfig.executionTree)
      .match(/"address":"\/worker"[^}]*?"agentRunId":"([^"]+)"/)?.[1] ?? "");
    expect(workerRunId).not.toBe("");
    const frames = await open(`/ws/agent-org/${orgRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const messageId = `pni-${randomUUID()}`;
    frames.socket!.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: workerRunId,
      command_id: `cmd-${messageId}`, content: "CASE:PNI-03 Start the build in the background.", context_file_paths: [], image_urls: [], message_id: messageId,
      dedupe_key: `agent_run_input:e2e:${messageId}` } }));
    const live = await until(() => noticesIn(frames)[0], "the background-task notice on the Org view", 90_000);
    await until(() => model.of("PNI-03").length >= 3, "the worker's turn on the notice", 60_000);
    await wait(2_000);
    const stored = storedNotices((await harness.gql<{ getAgentOrgMemberRunProjection: { conversation: unknown } }>(
      "query($id: String!, $a: String!, $m: String!) { getAgentOrgMemberRunProjection(orgRunId: $id, memberAddress: $m, agentRunId: $a) { conversation } }",
      { id: orgRunId, a: workerRunId, m: "/worker" })).getAgentOrgMemberRunProjection?.conversation);
    const wrapper = frames.find((frame) => JSON.stringify(frame.payload).includes(String(live.messageId)));
    await record("PNI-03", { orgRunId, workerRunId, live: noticesIn(frames), stored, wrapper: wrapper ? { type: wrapper.type, payload: JSON.stringify(wrapper.payload).slice(0, 1200) } : null });
    await harness.gql("mutation($id: String!) { terminateAgentOrgRun(orgRunId: $id) { success } }", { id: orgRunId }).catch(() => undefined);

    expect(typeof live.messageId === "string" && live.messageId.length > 0, JSON.stringify(live)).toBe(true);
    expect(JSON.stringify(wrapper?.payload ?? {})).toContain(workerRunId);
    expect(noticesIn(frames)).toHaveLength(1);
    expect(stored).toEqual([{ messageId: live.messageId, content: live.content }]);
  }, 300_000);

  it.skipIf(!CLAUDE)("PNI-04 (live): Claude: the background notice's message_id is the stored notice's messageId", async () => {
    const created = (await harness.gql<{ createAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: await harness.createDefinition("pni-claude", "Keep replies to one short sentence.", []), workspaceRootPath: await workspace(),
        llmModelIdentifier: process.env.PNI_CLAUDE_MODEL ?? "haiku", autoExecuteTools: true, runtimeKind: "claude_agent_sdk" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const frames = await open(`/ws/agent/${created.runId}`, "CONNECTED");
    sendE2eSendMessageCommand(frames.socket!, { content: "Use the Bash tool with run_in_background set to true to run exactly: sleep 8; echo PNI_DONE. Do not wait for it. Reply STARTED." });
    const running = await until(() => frames.find((frame) => frame.type === "BACKGROUND_TASK_UPDATED" && frame.payload.status === "running") ?? null, "Claude's background task (precondition)", 180_000);
    const notice = await until(() => frames.flatMap((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" ? [frame] : [])[0], "Claude's background notice on the agent stream", 180_000);
    await until(() => frames.some((frame) => frame.at > notice.at && frame.type === "AGENT_STATUS" && frame.payload.status === "idle"), "idle after the notice's turn", 180_000).catch(() => undefined);
    await wait(2_000);
    const conversation = (await harness.gql<{ getRunProjection: { conversation: unknown } }>(
      "query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: created.runId })).getRunProjection?.conversation;
    const stored = (Array.isArray(conversation) ? conversation as Json[] : []).filter((item) => item.kind === "system_task_notification")
      .map((item) => ({ messageId: item.messageId ?? null, content: String(item.content ?? "").slice(0, 300) }));
    const liveNotices = frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION").map((frame) => ({ messageId: frame.payload.message_id, content: String(frame.payload.content ?? "").slice(0, 300) }));
    await record("PNI-04", { runId: created.runId, running: running.payload, liveNotices, stored });

    expect(typeof notice.payload.message_id === "string" && String(notice.payload.message_id).length > 0, JSON.stringify(notice.payload)).toBe(true);
    expect(liveNotices.filter((entry) => entry.messageId === notice.payload.message_id)).toHaveLength(1);
    expect(stored.filter((entry) => entry.messageId === notice.payload.message_id)).toHaveLength(1);
  }, 600_000);
});
