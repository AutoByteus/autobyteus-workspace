import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * `list_available_agent_runtimes` used by a real agent on each real runtime (autobyteus-303, REQ-001, AC-001, AC-002,
 * AC-012): the tool works like the other Agent Tools (`list_peer_nodes`, `list_available_agents`) on every runtime.
 *
 * Per enabled runtime, one live agent on a test-owned studio server:
 * - LR-1: an agent whose definition does not list the tool cannot call it (no successful call).
 * - LR-2: an agent whose definition lists only this tool calls it; the call succeeds and its result is the node's report
 *   (`{checkedAt, agentRuntimes}`), with the same runtimes (and AutoByteus providers) as the page's GraphQL
 *   `availableAgentRuntimes` read right after; no key or e-mail in it.
 * - LR-3 (autobyteus-32 QR-001, with RUN_ROUTED_DELEGATION_E2E=1 and a signed-in Codex CLI): with Model Routing on and the
 *   node's Model Router (a live Codex run) held busy, the agent's delegate_task waits the 40 s routing budget and its
 *   result (the copy on the agent's own launch, with the "busy" note) still reaches the agent as a tool result.
 * The tool reaches each runtime its own way: AutoByteus as a local tool; Codex through the thread's MCP config; Claude
 * through the SDK's MCP servers and allowed tools; Antigravity through its MCP config file (`call_mcp_tool`); Grok
 * through the ACP session's MCP servers (`search_tool`/`use_tool`).
 *
 * With AUTOBYTEUS_TEST_VAULT set, the server reads provider keys from the test vault (read-only), so the report also lists
 * the keyed AutoByteus providers with their balance or block (TESTING.md#test-vault).
 * Gates (each runtime independently): RUN_LMSTUDIO_E2E=1 (AutoByteus over LM Studio, local model), RUN_DEEPSEEK_E2E=1
 * (AutoByteus over DeepSeek; its key from the test vault, a missing key is reported as a skip), RUN_CODEX_E2E=1,
 * RUN_CLAUDE_E2E=1, RUN_AGY_E2E=1, RUN_GROK_E2E=1, plus the runtime's CLI on PATH, signed in. Live runs spend a little
 * of the account's usage (one short turn per case). The readers need the real HOME (and on macOS USER, LOGNAME) so the
 * signed-in CLIs answer; agy runs on the host login and adds its conversations to the host's agy history (TESTING.md).
 * Model overrides: LMSTUDIO_MODEL_ID, DEEPSEEK_E2E_MODEL, CODEX_E2E_TOOL_MODEL, CLAUDE_E2E_TOOL_MODEL, AGY_E2E_TOOL_MODEL, GROK_E2E_MODEL.
 * Per-step timeout: RUNTIMES_TOOL_E2E_STEP_TIMEOUT_MS (default 360000).
 *
 * Command (all five):
 *   RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 RUN_AGY_E2E=1 RUN_GROK_E2E=1 \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts --no-watch
 */

type RuntimeKind = "autobyteus" | "codex_app_server" | "claude_agent_sdk" | "antigravity_cli" | "grok_build";
type RuntimeCase = Readonly<{
  id?: string; runtimeKind: RuntimeKind; enabled: boolean; pickModel(models: string[]): string | null; toolHint?: string;
  /** AutoByteus provider whose catalog to load (LM Studio by default). */
  provider?: string;
  /** The provider key this case needs from the vault. */
  requiredSecretId?: string;
}>;
type WsMessage = { type: string; payload: Record<string, unknown>; at: number };
type Connection = { socket: WebSocket; messages: WsMessage[] };
type Record_ = Record<string, unknown>;
type Report = { checkedAt: string; agentRuntimes: Array<Record_> };

const TOOL = "list_available_agent_runtimes";
const binaryReady = (command: string): boolean => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const preferred = (override: string | undefined, ordered: string[], models: string[]): string | null => {
  const exact = override?.trim();
  if (exact && models.includes(exact)) return exact;
  return ordered.find((model) => models.includes(model)) ?? null;
};

const RUNTIMES: readonly RuntimeCase[] = [
  {
    runtimeKind: "autobyteus",
    enabled: process.env.RUN_LMSTUDIO_E2E === "1",
    pickModel: (models) => preferred(process.env.LMSTUDIO_MODEL_ID, [], models)
      ?? models.find((model) => /qwen/i.test(model) && !/embed/i.test(model)) ?? null,
  },
  {
    id: "autobyteus_deepseek",
    runtimeKind: "autobyteus",
    provider: "DEEPSEEK",
    requiredSecretId: "provider.deepseek.api-key",
    enabled: process.env.RUN_DEEPSEEK_E2E === "1",
    pickModel: (models) => preferred(process.env.DEEPSEEK_E2E_MODEL, ["deepseek-v4-flash"], models)
      ?? models.find((model) => /^deepseek/.test(model)) ?? null,
  },
  {
    runtimeKind: "codex_app_server",
    enabled: process.env.RUN_CODEX_E2E === "1" && binaryReady("codex"),
    pickModel: (models) => preferred(process.env.CODEX_E2E_TOOL_MODEL, ["gpt-5.5", "gpt-5.3-codex"], models)
      ?? models.find((model) => /codex/i.test(model)) ?? models[0] ?? null,
    // Codex CLI defers MCP tools behind tool_search.
    toolHint: ` AutoByteus tools such as ${TOOL} may be deferred: when it is not visible, find it with tool_search first, then call it.`,
  },
  {
    runtimeKind: "claude_agent_sdk",
    enabled: process.env.RUN_CLAUDE_E2E === "1" && binaryReady("claude"),
    pickModel: (models) => preferred(process.env.CLAUDE_E2E_TOOL_MODEL, ["haiku", "sonnet"], models) ?? models[0] ?? null,
  },
  {
    runtimeKind: "antigravity_cli",
    enabled: process.env.RUN_AGY_E2E === "1" && binaryReady("agy"),
    pickModel: (models) => preferred(process.env.AGY_E2E_TOOL_MODEL, ["gemini-3.8-flash-low"], models) ?? models[0] ?? null,
    toolHint: ` AutoByteus tools such as ${TOOL} are invoked with call_mcp_tool, ServerName autobyteus_agent_tools and the tool name as ToolName. Do not use shell tools; when a tool result was saved to a file, read it with view_file.`,
  },
  {
    runtimeKind: "grok_build",
    enabled: process.env.RUN_GROK_E2E === "1" && binaryReady("grok"),
    pickModel: (models) => preferred(process.env.GROK_E2E_MODEL, ["grok-4.7"], models) ?? models[0] ?? null,
    toolHint: ` AutoByteus tools such as ${TOOL} are tools of the MCP server autobyteus_agent_tools: find them with search_tool and call them with use_tool.`,
  },
];

const useVault = RUNTIMES.some((runtime) => runtime.enabled && runtime.requiredSecretId) || Boolean(process.env.AUTOBYTEUS_TEST_VAULT?.trim());
const describeLive = RUNTIMES.some((runtime) => runtime.enabled) ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.RUNTIMES_TOOL_E2E_STEP_TIMEOUT_MS ?? 360_000);
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const asRecord = (value: unknown): Record_ | null => (value && typeof value === "object" && !Array.isArray(value) ? value as Record_ : null);

/** Agent Tools calls are named by tool, `mcp__<server>__<tool>`, or (AGY) `call_mcp_tool` with `Arguments.ToolName`. */
const agentToolName = (payload: Record_): string => {
  const name = String(payload.tool_name ?? asRecord(payload.metadata)?.tool_name ?? "");
  if (name !== "call_mcp_tool") return name.toLowerCase().split("__").at(-1) ?? name;
  return String(asRecord(payload.arguments)?.ToolName ?? "");
};
const isToolDone = (message: WsMessage): boolean =>
  ["TOOL_EXECUTION_SUCCEEDED", "TOOL_EXECUTION_FAILED"].includes(message.type) && agentToolName(message.payload).endsWith(TOOL);
/** The report inside a tool result, whatever the runtime's encoding (object, JSON text, MCP content blocks). */
const reportIn = (payload: Record_): Report | null => {
  const visit = (value: unknown, depth: number): Report | null => {
    if (depth > 6 || value === null || value === undefined) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
      try { return visit(JSON.parse(trimmed), depth + 1); } catch { return null; }
    }
    if (Array.isArray(value)) {
      for (const item of value) { const found = visit(item, depth + 1); if (found) return found; }
      return null;
    }
    const record = asRecord(value);
    if (!record) return null;
    if (Array.isArray(record.agentRuntimes) && typeof record.checkedAt === "string") return record as unknown as Report;
    for (const nested of Object.values(record)) { const found = visit(nested, depth + 1); if (found) return found; }
    return null;
  };
  return visit(payload.result ?? null, 0);
};
/** What must match between two reads taken seconds apart: the runtimes and AutoByteus' providers (limits may tick). */
const shape = (report: Report) => report.agentRuntimes.map((entry) => entry.runtime === "autobyteus"
  ? { runtime: entry.runtime, providers: ((entry.providers ?? []) as Record_[]).map((provider) => provider.provider) }
  : { runtime: entry.runtime, models: Array.isArray(entry.models) ? "read" : entry.models, limits: Array.isArray(entry.limits) ? "read" : entry.limits });

describeLive("list_available_agent_runtimes used by a live agent on every runtime (autobyteus-303)", () => {
  let dataDir: string | null = null;
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  const sockets = new Set<WebSocket>();
  const runIds = new Set<string>();
  const definitionIds = new Set<string>();
  const workspaces = new Set<string>();

  const gql = async <T>(query: string, variables: Record_ = {}): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };
  const pageRead = async (): Promise<Report> => (await gql<{ availableAgentRuntimes: Report }>("{ availableAgentRuntimes }")).availableAgentRuntimes;
  const modelsFor = async (runtime: RuntimeCase): Promise<string[]> => {
    if (runtime.runtimeKind === "autobyteus") {
      const result = await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
        `mutation($providerId: String!, $runtimeKind: String) {
          ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
        }`, { providerId: runtime.provider ?? "LMSTUDIO", runtimeKind: "autobyteus" });
      return result.ensureProviderModelCatalog.llmModels.map((model) => model.modelIdentifier);
    }
    const result = await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: runtime.runtimeKind });
    return result.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
  };
  const createAgentDefinition = async (name: string, instructions: string, toolNames: string[]): Promise<string> => {
    const result = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name, description: "autobyteus-303 live tool check", instructions, category: "runtime-e2e", toolNames } });
    definitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };
  const createAgentRun = async (agentDefinitionId: string, runtimeKind: string, model: string): Promise<string> => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "aar-live-ws-"));
    workspaces.add(workspaceRootPath);
    const result = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind } });
    expect(result.createAgentRun.success, result.createAgentRun.message).toBe(true);
    runIds.add(result.createAgentRun.runId!);
    return result.createAgentRun.runId!;
  };
  const waitFor = async (messages: WsMessage[], from: number, predicate: (message: WsMessage) => boolean, label: string, timeoutMs = STEP_TIMEOUT_MS): Promise<WsMessage> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.slice(from).find(predicate);
      if (found) return found;
      await wait(400);
    }
    const tail = messages.slice(-25).map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 200)}`).join(" | ");
    throw new Error(`Timed out waiting for ${label}. Recent: ${tail}`);
  };
  const openSocket = async (runId: string): Promise<Connection> => {
    const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    sockets.add(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: asRecord(parsed.payload) ?? {}, at: Date.now() });
      } catch { /* ignore non-JSON frames */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitFor(messages, 0, (message) => message.type === "CONNECTED", `CONNECTED ${runId}`, 120_000);
    return { socket, messages };
  };
  const sendTurn = async (connection: Connection, content: string): Promise<number> => {
    const from = connection.messages.length;
    sendE2eSendMessageCommand(connection.socket, { content });
    const ack = await waitFor(connection.messages, from, (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.command_type === "SEND_MESSAGE", "SEND_MESSAGE ack", 120_000);
    expect(ack.payload.accepted, JSON.stringify(ack.payload)).toBe(true);
    return from;
  };
  const waitIdle = (connection: Connection, from: number, label: string) =>
    waitFor(connection.messages, from, (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle", `${label} idle`);
  /** Evidence lines for the ticket's report (grep `LR-EVIDENCE`). */
  const evidence = (label: string, value: unknown) => console.log(`LR-EVIDENCE ${label} ${JSON.stringify(value)}`);

  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "aar-live-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (useVault) await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
  }, 180_000);

  afterEach(async () => {
    for (const socket of sockets) socket.close();
    sockets.clear();
    for (const id of runIds) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id }).catch(() => undefined);
    runIds.clear();
    for (const id of definitionIds) await gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    definitionIds.clear();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    app = null;
    if (useVault) await closeLiveServerVault();
    for (const workspace of workspaces) await rm(workspace, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  for (const runtime of RUNTIMES) {
    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LR-1 without the tool it cannot be called; LR-2 a live agent with the tool calls it and gets the node's report`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
      const available = await modelsFor(runtime);
      const model = runtime.pickModel(available);
      expect(model, `no model for ${runtime.runtimeKind} in ${JSON.stringify(available).slice(0, 400)}`).toBeTruthy();
      const hint = runtime.toolHint ?? "";
      const suffix = randomUUID().slice(0, 6);
      const operator = "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`;

      // LR-1: a definition without the tool (REQ-001 opt-in, AC-012).
      const plainId = await createAgentDefinition(`AAR Plain ${suffix}`, operator, []);
      const plain = await openSocket(await createAgentRun(plainId, runtime.runtimeKind, model!));
      const plainFrom = await sendTurn(plain, `Call the ${TOOL} tool exactly once now if you have it; if you do not have it, reply NO TOOL. Do not call any other tool.`);
      await waitIdle(plain, plainFrom, "plain run");
      const plainCalls = plain.messages.filter((message) => message.type === "TOOL_EXECUTION_SUCCEEDED" && isToolDone(message));
      evidence(`${runtime.id ?? runtime.runtimeKind} LR-1`, { model, successfulCalls: plainCalls.length,
        toolEvents: plain.messages.filter((message) => message.type.startsWith("TOOL_")).map((message) => `${message.type}:${agentToolName(message.payload)}`) });
      expect(plainCalls, "no successful call without the tool").toEqual([]);

      // LR-2: a definition that lists only this tool (AC-001 / AC-002).
      const scoutId = await createAgentDefinition(`AAR Scout ${suffix}`, operator, [TOOL]);
      const scout = await openSocket(await createAgentRun(scoutId, runtime.runtimeKind, model!));
      const started = Date.now();
      const from = await sendTurn(scout, `Call the ${TOOL} tool exactly once now with these exact JSON arguments: {}. `
        + "Do not call any other AutoByteus tool. Then reply with one short sentence naming the agent runtimes it listed.");
      const done = await waitFor(scout.messages, from, isToolDone, `${runtime.runtimeKind} ${TOOL} result`);
      const toolMs = Date.now() - started;
      await waitIdle(scout, scout.messages.indexOf(done) + 1, "scout run");
      const report = reportIn(done.payload);
      const page = await pageRead();
      const reply = scout.messages.slice(from).filter((message) => message.type === "SEGMENT_CONTENT").map((message) => String(message.payload.delta ?? message.payload.content ?? "")).join("").slice(-400);
      evidence(`${runtime.id ?? runtime.runtimeKind} LR-2`, {
        model, event: done.type, toolName: done.payload.tool_name, toolMs,
        reportShape: report ? shape(report) : null, pageShape: shape(page), agentReplyTail: reply,
      });
      // The data the agent received, in full (no secrets: the report never carries keys or identities, AC-009).
      evidence(`${runtime.id ?? runtime.runtimeKind} LR-2 report`, report);
      expect(done.type, JSON.stringify(done.payload).slice(0, 800)).toBe("TOOL_EXECUTION_SUCCEEDED");
      expect(report, `the tool result carries the report: ${JSON.stringify(done.payload).slice(0, 800)}`).not.toBeNull();
      expect(Date.parse(report!.checkedAt)).not.toBeNaN();
      expect(shape(report!), "the same runtimes and providers as the page's read").toEqual(shape(page));
      expect(JSON.stringify(report)).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}\b(?!:)|sk-[A-Za-z0-9_-]{16,}|xai-[A-Za-z0-9]{16,}/);
    }, STEP_TIMEOUT_MS * 3);
  }

  // autobyteus-32 QR-001 (LR-3): a routed delegate_task takes up to the 40 s routing budget; it must come back to the
  // live agent as a tool result on every runtime (each runtime has its own MCP tool-call time-out). The node's Model
  // Router is a live Codex run held busy by a user turn (`sleep`), so the routing request waits its whole budget and the
  // copy falls back to the delegating run's launch with the "busy" note, about 40 s after the call.
  const ROUTED = process.env.RUN_ROUTED_DELEGATION_E2E === "1" && binaryReady("codex");
  const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const routerRuntime = RUNTIMES.find((runtime) => runtime.runtimeKind === "codex_app_server")!;
  let routerReady: Promise<{ runId: string; connection: Connection }> | null = null;
  const holdRouter = async (): Promise<{ connection: Connection; from: number }> => {
    routerReady ??= (async () => {
      // The router's choices are the node's report (as on the page), not the model catalog: an unblocked Codex model.
      const codex = (await pageRead()).agentRuntimes.find((entry) => entry.runtime === "codex_app_server");
      const offered = (Array.isArray(codex?.models) ? codex!.models : []) as Record_[];
      const model = routerRuntime.pickModel(offered.filter((entry) => !entry.blocked).map((entry) => String(entry.id)));
      evidence("LR-3 router", { model, offered: offered.map((entry) => entry.id) });
      expect(model, `a Codex model for the router in ${JSON.stringify(codex).slice(0, 600)}`).toBeTruthy();
      await gql(`mutation($r:String!,$m:String!){setModelRouterLaunch(runtimeKind:$r, llmModelIdentifier:$m)}`, { r: "codex_app_server", m: model });
      const status = (await gql<{ setModelRoutingEnabled: Record_ }>(`mutation{setModelRoutingEnabled(enabled:true)}`)).setModelRoutingEnabled;
      expect(status, JSON.stringify(status)).toMatchObject({ enabled: true, active: true });
      const runId = (await gql<{ openModelRouterAgent: string }>(`mutation{openModelRouterAgent}`)).openModelRouterAgent;
      const connection = await openSocket(runId);
      sockets.delete(connection.socket);
      return { runId, connection };
    })();
    const { connection } = await routerReady;
    const from = await sendTurn(connection, "This is a test of the node, not a routing request. Run exactly this shell command now and wait for it to finish: sleep 55. "
      + "Then reply DONE. Do not call any other tool.");
    await waitFor(connection.messages, from, (message) => message.type !== "AGENT_COMMAND_ACK" && JSON.stringify(message.payload).includes("sleep 55"),
      "the router running sleep", 120_000);
    return { connection, from };
  };

  for (const runtime of RUNTIMES) {
    it.runIf(runtime.enabled && ROUTED)(`${runtime.id ?? runtime.runtimeKind}: LR-3 a routed delegate_task that takes the 40 s routing budget comes back to the live agent as its tool result`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
      // The delegator's model: one the node's report offers unblocked (AutoByteus: its provider catalog).
      const reported = ((await pageRead()).agentRuntimes.find((entry) => entry.runtime === runtime.runtimeKind)?.models ?? null) as Record_[] | null;
      const model = runtime.pickModel(runtime.runtimeKind === "autobyteus" || !Array.isArray(reported) ? await modelsFor(runtime)
        : reported.filter((entry) => !entry.blocked).map((entry) => String(entry.id)));
      expect(model, `no unblocked ${runtime.runtimeKind} model in the node's report: ${JSON.stringify(reported).slice(0, 800)}`).toBeTruthy();
      const suffix = randomUUID().slice(0, 6);
      const targetName = `AAR Routed Target ${suffix}`;
      await createAgentDefinition(targetName, "Reply OK to any task.", []);
      const hint = (runtime.toolHint ?? "").replaceAll(TOOL, "delegate_task");
      const delegatorId = await createAgentDefinition(`AAR Delegator ${suffix}`, "You are a precise tool operator. Follow the user's instructions exactly, "
        + `call only the tools the user names, and keep every reply to one short sentence.${hint}`, []);
      const delegator = await openSocket(await createAgentRun(delegatorId, runtime.runtimeKind, model!));
      const router = await holdRouter();
      const from = await sendTurn(delegator, `Call the delegate_task tool exactly once now with these exact JSON arguments: `
        + `${JSON.stringify({ recipient_address: `/${segment(targetName)}`, description: "Reply OK." })}. It can take about a minute; wait for its result. `
        + "Do not call any other tool. Then reply with one short sentence giving the delegated value and the launch_notes text.");
      const isDelegate = (message: WsMessage) => agentToolName(message.payload).endsWith("delegate_task");
      // The successful call (a model may first try a wrong tool name, e.g. Grok's use_tool without the server prefix).
      const done = await waitFor(delegator.messages, from, (message) => message.type === "TOOL_EXECUTION_SUCCEEDED" && isDelegate(message),
        `${runtime.runtimeKind} delegate_task result`);
      const failedAttempts = delegator.messages.slice(from, delegator.messages.indexOf(done)).filter((message) => message.type === "TOOL_EXECUTION_FAILED")
        .map((message) => ({ tool: agentToolName(message.payload), error: JSON.stringify(message.payload.error ?? message.payload.result ?? null).slice(0, 300) }));
      // The call's own duration where the runtime streams its start (Grok reports a tool call only when it is done:
      // there the turn's duration bounds it from above, and the "busy" note shows the routing waited its 40 s budget).
      const turnStartedAt = delegator.messages[from]?.at ?? done.at;
      // The successful call's first event (its start or approval; not an earlier failed attempt's).
      const afterFailures = delegator.messages.slice(from, delegator.messages.indexOf(done)).map((message, index) => ({ message, index }))
        .filter(({ message }) => message.type === "TOOL_EXECUTION_FAILED" && isDelegate(message)).at(-1)?.index ?? -1;
      const callStartedAt = delegator.messages.slice(from + afterFailures + 1, delegator.messages.indexOf(done))
        .find((message) => message.type.startsWith("TOOL_") && isDelegate(message))?.at;
      // A call reported only when done (its start and end arrive together) is timed by its turn.
      const startedAt = callStartedAt !== undefined && done.at - callStartedAt > 1_000 ? callStartedAt : turnStartedAt;
      await waitIdle(delegator, delegator.messages.indexOf(done) + 1, "delegator run");
      const resultText = JSON.stringify(done.payload.result ?? done.payload);
      const reply = delegator.messages.slice(from).filter((message) => message.type === "SEGMENT_CONTENT").map((message) => String(message.payload.delta ?? message.payload.content ?? "")).join("").slice(-400);
      evidence(`${runtime.id ?? runtime.runtimeKind} LR-3`, { model, event: done.type, toolMs: callStartedAt ? done.at - callStartedAt : null, turnMs: done.at - turnStartedAt, failedAttempts, result: resultText.slice(0, 1200), agentReplyTail: reply });
      expect(done.type, resultText.slice(0, 800)).toBe("TOOL_EXECUTION_SUCCEEDED");
      expect(resultText, "the delegation result reached the agent").toContain("delegated");
      expect(resultText, "with the busy router's note").toContain("Model Router could not choose (the Model Router was busy)");
      expect(done.at - startedAt, "the call took the routing budget").toBeGreaterThan(38_000);
      // The router's own turn ends (sleep done) before the next case holds it again.
      await waitIdle(router.connection, router.from, "router turn");
    }, STEP_TIMEOUT_MS * 3);
  }

  afterAll(async () => {
    if (!routerReady) return;
    const router = await routerReady.catch(() => null);
    router?.connection.socket.close();
    await gql(`mutation{setModelRoutingEnabled(enabled:false)}`).catch(() => undefined);
  });
});
