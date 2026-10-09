import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds, sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

/**
 * cross-scope-agent-mentions (SR-008/SR-010) — collaborators of standalone Agent runs on real runtimes
 * (live, paid/local inference).
 *
 * Collaborator mention journey, per enabled runtime, for a standalone agent whose definition lists
 * neither collaboration tool:
 * - `delegate_task` exists from the first turn; to an address that is neither in the run nor an available
 *   agent it starts nothing and returns its reason, and no Agent-root package is written (AC-014, REQ-012;
 *   agent-initiated-collaborators REQ-005 lets a listed catalog address start a copy);
 * - a send with `mentions` adds ONE collaborator instance before the agent's turn: the entry carries its
 *   AgentRun ID and the run's own launch settings, Offline (AC-003, REQ-003/004);
 * - the host's `send_message_to(<address>)` starts it; the briefing and the report are both
 *   communication messages; the collaborator's conversation starts with the briefing as an
 *   inter-agent message with its sender (no task notice), and the host's conversation shows the report
 *   with its sender (AC-005, AC-016/RD-004 on that runtime);
 * - it is no longer a candidate (AC-011); a second mention reuses the instance (AC-004);
 * - `delegate_task(<address>)` starts an extra copy with the system task notice and leaves the
 *   instance unchanged (AC-015);
 * - Stop keeps the entry with the same run ID; another run cannot message it; a message through the
 *   Agent-root stream wakes the same run with its conversation (AC-006, AC-012).
 * The collaborator definition lists both tools itself, so a duplicate exposure would break its run (AC-014).
 *
 * Collaborator Team journey (DI-001): a Team collaborator's coordinator follows its authored handoff by
 * address and reaches its teammate in the same instance; the teammate replies (AC-003).
 *
 * Gates (each runtime independently): RUN_LMSTUDIO_E2E=1 (AutoByteus over LM Studio), RUN_CODEX_E2E=1,
 * RUN_CLAUDE_E2E=1, RUN_AGY_E2E=1, RUN_GROK_E2E=1 (ACP), plus the runtime's CLI on PATH.
 * Model overrides: LMSTUDIO_MODEL_ID, CODEX_E2E_TOOL_MODEL, CLAUDE_E2E_TOOL_MODEL, AGY_E2E_TOOL_MODEL, GROK_E2E_MODEL.
 * Per-step timeout override: COLLABORATOR_E2E_STEP_TIMEOUT_MS (default 360000).
 */

type RuntimeCase = Readonly<{
  runtimeKind: "autobyteus" | "codex_app_server" | "claude_agent_sdk" | "antigravity_cli" | "grok_build";
  enabled: boolean;
  pickModel(models: string[]): string | null;
  /** How this runtime's model reaches the Agent Tools MCP tools, when it needs telling. */
  toolHint?: string;
  /**
   * Whether a failed MCP call's text reaches the TOOL_EXECUTION_FAILED event. Grok's card projection
   * reports failed `use_tool` calls generically (pre-existing, grok-build-tool-projection.ts); the
   * model itself receives the server's text.
   */
  failedToolTextProjected?: false;
}>;

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
    runtimeKind: "codex_app_server",
    enabled: process.env.RUN_CODEX_E2E === "1" && binaryReady("codex"),
    pickModel: (models) => preferred(process.env.CODEX_E2E_TOOL_MODEL, ["gpt-5.4-mini", "gpt-5.5", "gpt-5.3-codex"], models)
      ?? models.find((model) => /codex/i.test(model)) ?? models[0] ?? null,
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
    // AGY reaches MCP tools through call_mcp_tool (see agy-team-inter-agent-roundtrip.e2e.test.ts).
    toolHint: " AutoByteus tools such as delegate_task, send_message_to and get_handoff_rules are invoked with call_mcp_tool, ServerName autobyteus_agent_tools and the tool name as ToolName. Do not use shell or file tools.",
  },
  {
    runtimeKind: "grok_build",
    enabled: process.env.RUN_GROK_E2E === "1" && binaryReady("grok"),
    pickModel: (models) => preferred(process.env.GROK_E2E_MODEL, ["grok-4.7"], models) ?? models[0] ?? null,
    // Grok reaches MCP tools through search_tool/use_tool (docs/modules/grok_build_runtime.md).
    toolHint: " AutoByteus tools such as delegate_task, send_message_to and get_handoff_rules are tools of the MCP server autobyteus_agent_tools: find them with search_tool and call them with use_tool.",
    failedToolTextProjected: false,
  },
];

const describeLive = RUNTIMES.some((runtime) => runtime.enabled) ? describe : describe.skip;
/** One agent step; slow local models (LM Studio) may need more: COLLABORATOR_E2E_STEP_TIMEOUT_MS. */
const STEP_TIMEOUT_MS = Number(process.env.COLLABORATOR_E2E_STEP_TIMEOUT_MS ?? 360_000);

type WsMessage = { type: string; payload: Record<string, unknown> };
type Connection = { socket: WebSocket; messages: WsMessage[] };
type AgentEntry = { kind: "agent"; address: string; agentDefinitionId: string; agentRunId: string; launchConfiguration: Record<string, unknown>; addedViaAgentRunId: string };
type TeamEntry = { kind: "agent_team"; address: string; teamDefinitionId: string; teamRunId: string; coordinatorAddress: string; members: Array<{ address: string; agentDefinitionId: string; agentRunId: string }> };
type CollaborationView = {
  is_active: boolean;
  execution_tree: {
    host: { address: string; agentRunId: string; agentDefinitionId: string };
    collaborators: Array<AgentEntry | TeamEntry>;
    taskExecutions: Array<Record<string, unknown> & { address: string; agentRunId?: string }>;
  };
  communication_messages: { messages: Array<{ senderAgentRunId: string; receiverAgentRunId: string; content: string }> };
  agent_statuses: Array<{ agent_run_id: string; status: string }>;
};
type ConversationEntry = { kind: string; role?: string | null; content?: string | null; senderAgentRunId?: string | null };

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
/** Agent Tools calls are named by tool, or (AGY) `call_mcp_tool` with `Arguments.ToolName`. */
const agentToolName = (message: WsMessage): string => {
  const name = String(message.payload.tool_name ?? "");
  if (name !== "call_mcp_tool") return name;
  const args = (message.payload.arguments ?? {}) as Record<string, unknown>;
  return String(args.ToolName ?? "");
};
const isDelegateTask = (message: WsMessage): boolean => agentToolName(message).endsWith("delegate_task");
const isSendMessageTo = (message: WsMessage): boolean => agentToolName(message).endsWith("send_message_to");
const isToolDone = (message: WsMessage): boolean => ["TOOL_EXECUTION_SUCCEEDED", "TOOL_EXECUTION_FAILED"].includes(message.type);
/** Finds `key` in a tool result, whatever the runtime's encoding (object, JSON text, MCP content blocks). */
const findInResult = (payload: Record<string, unknown>, key: string): unknown => {
  const visit = (value: unknown, depth: number): unknown => {
    if (depth > 6 || value === null || value === undefined) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
      try { return visit(JSON.parse(trimmed), depth + 1); } catch { return undefined; }
    }
    if (Array.isArray(value)) {
      for (const item of value) { const found = visit(item, depth + 1); if (found !== undefined) return found; }
      return undefined;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (key in record) return record[key];
      for (const nested of Object.values(record)) { const found = visit(nested, depth + 1); if (found !== undefined) return found; }
    }
    return undefined;
  };
  return visit(payload.result ?? payload.error ?? null, 0);
};
/** The ingress a delegate_task result names (an Agent copy, or a Team copy's coordinator), or null. */
const delegatedRunId = (payload: Record<string, unknown>): string | null => {
  const runId = findInResult(payload, "target_agent_run_id") ?? findInResult(payload, "target_team_coordinator_agent_run_id");
  return typeof runId === "string" && runId ? runId : null;
};
const rejected = (message: WsMessage): boolean => message.type === "TOOL_EXECUTION_FAILED" || findInResult(message.payload, "accepted") === false;

describeLive("Standalone Agent collaborators on real runtimes (SR-010)", () => {
  let dataDir: string | null = null;
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  const sockets = new Set<WebSocket>();
  const runIds = new Set<string>();
  const definitionIds = new Set<string>();
  const teamDefinitionIds = new Set<string>();
  const workspaces = new Set<string>();

  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };

  const modelsFor = async (runtimeKind: RuntimeCase["runtimeKind"]): Promise<string[]> => {
    if (runtimeKind === "autobyteus") {
      const result = await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
        `mutation($providerId: String!, $runtimeKind: String) {
          ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
        }`, { providerId: "LMSTUDIO", runtimeKind });
      return result.ensureProviderModelCatalog.llmModels.map((model) => model.modelIdentifier);
    }
    const result = await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: runtimeKind });
    return result.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
  };

  const createAgentDefinition = async (name: string, instructions: string, toolNames: string[]): Promise<string> => {
    const result = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name, description: "Collaborator mention e2e agent.", instructions, category: "runtime-e2e", toolNames } });
    definitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };

  const createAgentRun = async (input: { agentDefinitionId: string; runtimeKind: string; model: string }): Promise<string> => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "collaborator-mention-e2e-ws-"));
    workspaces.add(workspaceRootPath);
    const result = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: input.agentDefinitionId, workspaceRootPath, llmModelIdentifier: input.model,
        autoExecuteTools: true, runtimeKind: input.runtimeKind } });
    expect(result.createAgentRun.success, result.createAgentRun.message).toBe(true);
    runIds.add(result.createAgentRun.runId!);
    return result.createAgentRun.runId!;
  };

  const collaborationView = async (runId: string): Promise<CollaborationView | null> =>
    (await gql<{ agentRunCollaboration: { root_agent: CollaborationView } | null }>(
      "query($runId: String!) { agentRunCollaboration(runId: $runId) }", { runId })).agentRunCollaboration?.root_agent ?? null;
  /** The Agent root's on-disk package; it is written only when a first mention is admitted. */
  const packageExists = (runId: string): Promise<boolean> =>
    stat(path.join(dataDir!, "memory", "agents", runId, "collaboration", "collaboration_tree.json")).then(() => true, () => false);
  const memberConversation = async (hostRunId: string, memberAddress: string, agentRunId: string): Promise<ConversationEntry[]> =>
    (await gql<{ agentRunCollaborationMemberProjection: { conversation: ConversationEntry[] } }>(
      `query($h: String!, $a: String!, $r: String!) { agentRunCollaborationMemberProjection(hostRunId: $h, memberAddress: $a, agentRunId: $r) { conversation } }`,
      { h: hostRunId, a: memberAddress, r: agentRunId })).agentRunCollaborationMemberProjection.conversation;
  const hostConversation = async (runId: string): Promise<ConversationEntry[]> =>
    (await gql<{ getRunProjection: { conversation: ConversationEntry[] } }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId })).getRunProjection.conversation;

  /** The host composer's `@` candidates (the focused agent is the host). */
  const candidates = async (runId: string, focusedAgentRunId: string = runId) =>
    (await gql<{ collaboratorMentionCandidates: { availability: string; candidates: Array<{ kind: string; definitionId: string; name: string }> } }>(
      `query($k: String!, $id: String!, $f: String) { collaboratorMentionCandidates(rootSubjectKind: $k, rootRunId: $id, focusedAgentRunId: $f) {
        availability candidates { kind definitionId name } } }`, { k: "agent", id: runId, f: focusedAgentRunId })).collaboratorMentionCandidates;

  const openSocket = async (urlPath: string): Promise<Connection> => {
    const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}${urlPath}`);
    sockets.add(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* ignore non-JSON frames */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitFor(messages, 0, (message) => message.type === "CONNECTED", `CONNECTED ${urlPath}`, 120_000);
    return { socket, messages };
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

  const poll = async <T>(label: string, read: () => Promise<T | null | undefined | false>): Promise<T> => {
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    let last: unknown = null;
    while (Date.now() < deadline) {
      try { const value = await read(); if (value) return value as T; last = value; } catch (error) { last = error instanceof Error ? error.message : error; }
      await wait(1_500);
    }
    throw new Error(`Timed out waiting for ${label}. Last: ${JSON.stringify(last).slice(0, 1_500)}`);
  };

  /** Sends one user turn on the host stream; returns the message index and the command ack. */
  const sendTurn = async (connection: Connection, runId: string, content: string,
    mentions?: Array<{ kind: string; definition_id: string }>): Promise<{ from: number; ack: WsMessage }> => {
    const from = connection.messages.length;
    sendE2eSendMessageCommand(connection.socket, { content, ...(mentions ? { mentions } : {}) });
    const ack = await waitFor(connection.messages, from, (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.command_type === "SEND_MESSAGE", `SEND_MESSAGE ack for ${runId}`, 120_000);
    return { from, ack };
  };
  const waitIdle = (connection: Connection, from: number, label: string) =>
    waitFor(connection.messages, from, (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle", `${label} idle`);
  const isInterAgentFrom = (entry: ConversationEntry, senderRunId: string) => entry.kind === "inter_agent_message" && entry.senderAgentRunId === senderRunId;

  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "collaborator-mention-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
  }, 180_000);

  afterEach(async () => {
    for (const socket of sockets) socket.close();
    sockets.clear();
    for (const runId of runIds) {
      await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
    }
    runIds.clear();
    for (const id of teamDefinitionIds) {
      await gql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    }
    teamDefinitionIds.clear();
    for (const id of definitionIds) {
      await gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    }
    definitionIds.clear();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    app = null;
    for (const workspace of workspaces) await rm(workspace, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  for (const runtime of RUNTIMES) {
    it.runIf(runtime.enabled)(`${runtime.runtimeKind}: first-turn tools, mention adds one Offline instance, send_message_to briefs and starts it, reuse, extra copy, Stop and wake`, async () => {
      const model = runtime.pickModel(await modelsFor(runtime.runtimeKind));
      expect(model, `no model for ${runtime.runtimeKind}`).toBeTruthy();
      const token = `REPORT-${randomUUID().slice(0, 8)}`;
      const hint = runtime.toolHint ?? "";
      const suffix = randomUUID().slice(0, 6);

      const hostId = await createAgentDefinition(`Mention Host ${suffix}`,
        "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`, []);
      const helperId = await createAgentDefinition(`Mention Helper ${suffix}`,
        "When another agent messages you, do what it asks: call send_message_to exactly once with target_agent_run_id set to "
        + "the sender id given in the message and content set to the exact text it asks for. Then reply 'sent' and stop. "
        + `When the user talks to you directly, reply in one short sentence without tools.${hint}`, ["send_message_to", "delegate_task"]);

      const hostRunId = await createAgentRun({ agentDefinitionId: hostId, runtimeKind: runtime.runtimeKind, model: model! });
      const before = await candidates(hostRunId);
      expect(before.availability).toBe("AVAILABLE");
      expect(before.candidates.map((candidate) => candidate.definitionId)).toContain(helperId);
      expect(before.candidates.map((candidate) => candidate.definitionId)).not.toContain(hostId);
      expect(before.candidates.map((candidate) => candidate.definitionId)).not.toContain("autobyteus-daily-assistant");

      const host = await openSocket(`/ws/agent/${hostRunId}`);

      // AC-014: first turn, no mention yet — delegate_task exists; an address that is neither in the run nor an
      // available agent starts nothing and returns its reason (agent-initiated-collaborators REQ-003/005: a
      // listed catalog address would now start a copy).
      const missingAddress = `/no_such_helper_${suffix}`;
      const first = await sendTurn(host, hostRunId,
        `Call the delegate_task tool exactly once with recipient_address "${missingAddress}" and description "ping". `
        + "Do not call any other AutoByteus tool. Then reply with one short sentence quoting the tool result.");
      expect(first.ack.payload.accepted, JSON.stringify(first.ack.payload)).toBe(true);
      const firstDelegate = await waitFor(host.messages, first.from, (message) => isToolDone(message) && isDelegateTask(message), "pre-mention delegate_task result");
      const firstResult = JSON.stringify(firstDelegate.payload);
      expect(firstResult, firstResult.slice(0, 1500)).toContain("is not a mounted Agent or Agent Team, a collaborator or an available agent of this run");
      expect(delegatedRunId(firstDelegate.payload)).toBeNull();
      expect((await collaborationView(hostRunId))?.execution_tree.taskExecutions ?? []).toEqual([]);
      await waitIdle(host, first.from, "first turn");
      expect((await collaborationView(hostRunId))?.execution_tree.collaborators ?? []).toEqual([]);
      expect(await packageExists(hostRunId), "no package before the first mention").toBe(false);

      // AC-003 / REQ-003/004: the mention adds one instance before the agent's turn.
      const second = await sendTurn(host, hostRunId,
        `Use send_message_to to message the mentioned collaborator at its address. Ask it to reply to you with send_message_to `
        + `and the exact text "${token}". After the tool returns, reply with one short sentence.`,
        [{ kind: "agent", definition_id: helperId }]);
      expect(second.ack.payload.accepted, JSON.stringify(second.ack.payload)).toBe(true);
      const atAck = (await collaborationView(hostRunId))!;
      expect(atAck.execution_tree.collaborators).toHaveLength(1);
      const entry = atAck.execution_tree.collaborators[0] as AgentEntry;
      expect(entry).toMatchObject({ kind: "agent", agentDefinitionId: helperId, addedViaAgentRunId: hostRunId });
      expect(entry.agentRunId).toBeTruthy();
      expect(entry.launchConfiguration).toMatchObject({ runtimeKind: runtime.runtimeKind, llmModelIdentifier: model, autoExecuteTools: true });
      expect(atAck.agent_statuses.filter((status) => status.agent_run_id === entry.agentRunId && status.status !== "offline"), "Offline at admission").toEqual([]);
      expect(atAck.communication_messages.messages, "nothing delivered before the agent's turn").toEqual([]);
      expect(await packageExists(hostRunId), "package written by the first admission").toBe(true);
      const helperRunId = entry.agentRunId;

      // The host briefs it with send_message_to by address; that starts it; it reports back.
      // The first accepted send_message_to (a model may retry after a malformed call, which the server rejects).
      const briefing = await waitFor(host.messages, second.from, (message) => isToolDone(message) && isSendMessageTo(message) && !rejected(message), "accepted briefing send_message_to");
      const briefingText = JSON.stringify(briefing.payload);
      expect(briefingText.includes(entry.address) || briefingText.includes(helperRunId), briefingText.slice(0, 800)).toBe(true);
      const reported = await poll("briefing and report as communication messages", async () => {
        const view = await collaborationView(hostRunId);
        const messages = view?.communication_messages.messages ?? [];
        const brief = messages.find((message) => message.senderAgentRunId === hostRunId && message.receiverAgentRunId === helperRunId);
        const report = messages.find((message) => message.senderAgentRunId === helperRunId && message.receiverAgentRunId === hostRunId && message.content.includes(token));
        return brief && report ? view : null;
      });
      expect(reported.execution_tree.taskExecutions, "a collaborator is not a task execution").toEqual([]);
      expect((reported.execution_tree.collaborators[0] as AgentEntry).agentRunId).toBe(helperRunId);
      await waitIdle(host, second.from, "briefing turn");

      // AC-005 / AC-016 (RD-004 on this runtime): the briefing opens the collaborator's conversation as an
      // inter-agent message with its sender; the host's conversation shows the report with its sender.
      const helperConversation = await poll("collaborator conversation", async () => {
        const conversation = await memberConversation(hostRunId, entry.address, helperRunId);
        return conversation.some((item) => isInterAgentFrom(item, hostRunId)) ? conversation : null;
      });
      expect(helperConversation[0], JSON.stringify(helperConversation.slice(0, 2)).slice(0, 800)).toMatchObject({ kind: "inter_agent_message", senderAgentRunId: hostRunId });
      expect(JSON.stringify(helperConversation)).not.toContain("Task delegator address");
      const hostView = await poll("host conversation shows the report with its sender", async () => {
        const conversation = await hostConversation(hostRunId);
        return conversation.some((item) => isInterAgentFrom(item, helperRunId)) ? conversation : null;
      });
      expect(hostView.filter((item) => item.kind === "inter_agent_message" && item.senderAgentRunId !== helperRunId), "the user's own messages stay user messages").toEqual([]);

      // AC-011 / AC-004: no longer offered; a second mention reuses the same instance.
      expect((await candidates(hostRunId)).candidates.map((candidate) => candidate.definitionId)).not.toContain(helperId);
      const third = await sendTurn(host, hostRunId, "Reply with the single word NOTED. Do not call any tool.", [{ kind: "agent", definition_id: helperId }]);
      expect(third.ack.payload.accepted, JSON.stringify(third.ack.payload)).toBe(true);
      const reused = (await collaborationView(hostRunId))!;
      expect(reused.execution_tree.collaborators.map((item) => (item as AgentEntry).agentRunId)).toEqual([helperRunId]);
      await waitIdle(host, third.from, "reuse turn");

      // AC-015: delegate_task(<address>) starts an extra copy with the system task notice; the instance is unchanged.
      const fourth = await sendTurn(host, hostRunId,
        `Call the delegate_task tool exactly once with recipient_address "${entry.address}" and description "Reply in one short sentence without tools.". `
        + "Do not call any other AutoByteus tool. Then reply with one short sentence.");
      const copied = await waitFor(host.messages, fourth.from, (message) => isToolDone(message) && isDelegateTask(message) && delegatedRunId(message.payload) !== null, "extra-copy delegate_task");
      const copyRunId = delegatedRunId(copied.payload);
      expect(copyRunId, JSON.stringify(copied.payload).slice(0, 800)).toBeTruthy();
      expect(copyRunId).not.toBe(helperRunId);
      const withCopy = await poll("extra copy recorded", async () => {
        const view = await collaborationView(hostRunId);
        return view?.execution_tree.taskExecutions.some((execution) => execution.agentRunId === copyRunId) ? view : null;
      });
      expect(withCopy.execution_tree.taskExecutions).toEqual([expect.objectContaining({ address: entry.address, agentRunId: copyRunId, delegatorAgentRunId: hostRunId })]);
      expect(withCopy.execution_tree.collaborators.map((item) => (item as AgentEntry).agentRunId)).toEqual([helperRunId]);
      const copyConversation = await poll("copy conversation", async () => {
        const conversation = await memberConversation(hostRunId, entry.address, copyRunId!);
        return conversation.length ? conversation : null;
      });
      expect(JSON.stringify(copyConversation)).toContain("Task delegator address");
      await waitIdle(host, fourth.from, "extra-copy turn");

      // AC-006: Stop keeps the instance with the same run ID.
      const stopped = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: hostRunId });
      expect(stopped.terminateAgentRun.success, stopped.terminateAgentRun.message).toBe(true);
      const stored = await poll("stored view after Stop", async () => { const view = await collaborationView(hostRunId); return view && !view.is_active ? view : null; });
      expect(stored.execution_tree.collaborators.map((item) => (item as AgentEntry).agentRunId)).toEqual([helperRunId]);

      // AC-004/AC-006: another run cannot reach it, by address or run ID, and a mention there does not see it.
      const otherRunId = await createAgentRun({ agentDefinitionId: hostId, runtimeKind: runtime.runtimeKind, model: model! });
      const other = await openSocket(`/ws/agent/${otherRunId}`);
      const otherTurn = await sendTurn(other, otherRunId,
        `Call the send_message_to tool exactly once with target_agent_run_id "${helperRunId}" and content "hello". `
        + "Do not call any other AutoByteus tool. Then reply with one short sentence quoting the tool result.");
      const otherSend = await waitFor(other.messages, otherTurn.from, (message) => isToolDone(message) && isSendMessageTo(message), "other-run send_message_to result");
      expect(rejected(otherSend), JSON.stringify(otherSend.payload).slice(0, 800)).toBe(true);
      if (runtime.failedToolTextProjected !== false) expect(JSON.stringify(otherSend.payload)).toContain("TARGET_AGENT_RUN_NOT_ACTIVE");
      await waitIdle(other, otherTurn.from, "other-run turn");
      expect((await collaborationView(otherRunId))?.execution_tree.collaborators ?? []).toEqual([]);

      // AC-006 / AC-012: a message through the Agent-root stream restores the host and wakes the same run.
      const collab = await openSocket(`/ws/agent-collaboration/${hostRunId}`);
      const ids = buildE2eClientCommandIds();
      collab.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent", root_run_id: hostRunId, target_agent_run_id: helperRunId, command_id: randomUUID(),
        content: "Reply with the single word WOKEN, without tools.", context_file_paths: [], image_urls: [], ...ids,
      } }));
      const wakeAck = await waitFor(collab.messages, 0, (message) => message.type === "AGENT_COMMAND_ACK", "wake ack", 180_000);
      expect(wakeAck.payload.state, JSON.stringify(wakeAck.payload)).toBe("accepted");
      await poll("collaborator answered after reopen", async () => {
        const conversation = await memberConversation(hostRunId, entry.address, helperRunId);
        return conversation.some((item) => item.role !== "user" && item.kind !== "inter_agent_message" && /WOKEN/.test(item.content ?? "")) ? conversation : null;
      });
      const woken = (await collaborationView(hostRunId))!;
      expect(woken.is_active).toBe(true);
      expect(woken.execution_tree.collaborators.map((item) => (item as AgentEntry).agentRunId)).toEqual([helperRunId]);
    }, 2_400_000);

    it.runIf(runtime.enabled)(`${runtime.runtimeKind}: a collaborator Team's authored handoff reaches its teammate in the same instance (DI-001)`, async () => {
      const model = runtime.pickModel(await modelsFor(runtime.runtimeKind));
      const hint = runtime.toolHint ?? "";
      const suffix = randomUUID().slice(0, 6);
      const hostId = await createAgentDefinition(`Team Host ${suffix}`,
        "When your message mentions a collaborator, call send_message_to once with its address and the user's request, then reply "
        + `in one short sentence. Otherwise reply in one short sentence.${hint}`, []);
      const leadId = await createAgentDefinition(`Obs Lead ${suffix}`,
        "When another agent gives you a task: 1) call get_handoff_rules; 2) follow the handoff by calling send_message_to with "
        + "the recipient_address it gives you, asking your teammate to confirm with one word; 3) after the teammate answers, report "
        + `to the agent that gave you the task with send_message_to and its sender id. Keep messages short.${hint}`, []);
      const mateId = await createAgentDefinition(`Obs Mate ${suffix}`,
        `If a teammate messages you, reply to it with send_message_to (the sender id given in the message) and the word CONFIRMED.${hint}`, []);
      const team = await gql<{ createAgentTeamDefinition: { id: string } }>(
        "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }", { input: {
          name: `Obs Team ${suffix}`, description: "Handoff team.", instructions: "Work together.", coordinatorMemberName: "lead",
          nodes: [{ memberName: "lead", ref: leadId, refScope: "SHARED" }, { memberName: "mate", ref: mateId, refScope: "SHARED" }],
          handoffs: [{ from: "/lead", to: "/mate", rules: ["Always ask the mate to confirm before reporting back."] }],
        } });
      teamDefinitionIds.add(team.createAgentTeamDefinition.id);

      const hostRunId = await createAgentRun({ agentDefinitionId: hostId, runtimeKind: runtime.runtimeKind, model: model! });
      const host = await openSocket(`/ws/agent/${hostRunId}`);
      const turn = await sendTurn(host, hostRunId, "Please plan a tiny settings page with the mentioned team.",
        [{ kind: "agent_team", definition_id: team.createAgentTeamDefinition.id }]);
      expect(turn.ack.payload.accepted, JSON.stringify(turn.ack.payload)).toBe(true);
      const admitted = (await collaborationView(hostRunId))!;
      const teamEntry = admitted.execution_tree.collaborators[0] as TeamEntry;
      expect(teamEntry).toMatchObject({ kind: "agent_team", teamDefinitionId: team.createAgentTeamDefinition.id });
      const lead = teamEntry.members.find((member) => member.address.endsWith("/lead"))!;
      const mate = teamEntry.members.find((member) => member.address.endsWith("/mate"))!;
      expect(teamEntry.coordinatorAddress).toBe(lead.address);

      let recorded: unknown = null;
      const flow = await poll("lead → mate → lead → host", async () => {
        const messages = (await collaborationView(hostRunId))?.communication_messages.messages ?? [];
        recorded = messages.map((message) => `${message.senderAgentRunId} → ${message.receiverAgentRunId}: ${message.content.slice(0, 80)}`);
        const toMate = messages.find((message) => message.senderAgentRunId === lead.agentRunId && message.receiverAgentRunId === mate.agentRunId);
        const fromMate = messages.find((message) => message.senderAgentRunId === mate.agentRunId && message.receiverAgentRunId === lead.agentRunId);
        const report = messages.find((message) => message.senderAgentRunId === lead.agentRunId && message.receiverAgentRunId === hostRunId);
        return toMate && fromMate && report ? messages : null;
      }).catch((error: unknown) => { throw new Error(`${error instanceof Error ? error.message : String(error)} Recorded: ${JSON.stringify(recorded)} Lead ${lead.agentRunId}, mate ${mate.agentRunId}.`); });
      expect(flow.length).toBeGreaterThanOrEqual(4);
      const mateConversation = await memberConversation(hostRunId, mate.address, mate.agentRunId);
      expect(mateConversation[0]).toMatchObject({ kind: "inter_agent_message", senderAgentRunId: lead.agentRunId });
    }, 2_400_000);
  }
});
