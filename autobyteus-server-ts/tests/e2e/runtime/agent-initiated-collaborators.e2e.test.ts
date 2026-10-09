import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds, sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "../helpers/live-runtime-secret-vault-helpers.js";

/**
 * agent-initiated-collaborators (SR-005) on real runtimes (live, paid/local inference).
 *
 * Standalone (Agent root), per enabled runtime:
 * - LE-A1: `list_available_agents` is absent unless the definition selects it (AC-001); its result is
 *   `{agents:[{name, kind, address, description}]}` with the `@` menu's eligibility, distinct hashed
 *   addresses for two same-name definitions, and no write (AC-002/003/008); an unknown address and an
 *   unknown run ID create nothing (AC-003/004); the first `send_message_to` to a listed address brings
 *   the agent in (added by the sender, the run's settings) and delivers, a second message reaches the
 *   same run ID (AC-004); `@` after a bring-in and a bring-in after `@` reuse one instance (AC-010); a
 *   re-list gives identical addresses, in-run ones at their in-run address (AC-002/003).
 * - LE-A2: three `delegate_task` calls to a listed team start three copies with a persisted `source` and
 *   no collaborator; each copy follows its own handoff inside itself and reports back by run ID; no
 *   message crosses copies (AC-005/007/008); after Stop, a message wakes a copy from its `source`.
 * Every catalog Team copy gets its own handoff rules and team instruction and hands off to its mate before
 *   reporting; a catalog Agent copy gets neither (SR-006 member scope).
 * Team root (LE-T1): configured handoffs and instruction kept; two catalog copies and a brought-in instance of
 *   the same team follow their handoffs inside themselves (AC-007); catalog Agent copies (root-level and from a
 *   copy member) get no scope; a brought-in team's member brings in a listed agent (AC-006/008); two members'
 *   concurrent first messages to one new address make one instance (RS-003); scopes survive Stop → reopen.
 * Org root (LE-O1): configured, mounted and cross-placement handoffs and instructions kept (also after Stop →
 *   reopen, AC-012); a copy of a mounted Team stays inside the copy (SC-003, approved behavior change); a
 *   catalog copy follows its own handoffs; a member brings a listed agent in (AC-008).
 * Copy placement (AC-013 / REQ-012): a copy is recorded at the level of its address — a collaborator-team or mounted-team
 *   member's copy of a top-level address at the root (LE-A3, LE-T1, LE-O1), its teammate copy inside the team; placement
 *   is unchanged after Stop → reopen.
 * LE-F1 (SC-004): a run on a model its runtime still runs but the catalog no longer offers (Claude: the full Haiku
 *   ID, CLAUDE_E2E_STALE_MODEL; Codex only with CODEX_E2E_STALE_MODEL) gets the failure reason for a bring-in and a
 *   catalog copy; nothing is added.
 *
 * Gates (each runtime independently): RUN_LMSTUDIO_E2E=1 (AutoByteus over LM Studio), RUN_DEEPSEEK_E2E=1 with
 * DEEPSEEK_API_KEY in the environment (AutoByteus over DeepSeek; the key is saved into the test vault), RUN_CODEX_E2E=1,
 * RUN_CLAUDE_E2E=1, RUN_AGY_E2E=1, RUN_GROK_E2E=1 (ACP), plus the runtime's CLI on PATH.
 * Root cases (LE-T1, LE-O1) run for the runtimes listed in AIC_ROOT_RUNTIMES (default: claude_agent_sdk).
 * Model overrides: LMSTUDIO_MODEL_ID, CODEX_E2E_TOOL_MODEL, CLAUDE_E2E_TOOL_MODEL, AGY_E2E_TOOL_MODEL, GROK_E2E_MODEL.
 * Per-step timeout override: COLLABORATOR_E2E_STEP_TIMEOUT_MS (default 360000).
 */

type RuntimeKind = "autobyteus" | "codex_app_server" | "claude_agent_sdk" | "antigravity_cli" | "grok_build";
type RuntimeCase = Readonly<{
  /** Case label (test names); defaults to the runtime kind. */
  id?: string;
  runtimeKind: RuntimeKind;
  enabled: boolean;
  /** AutoByteus provider whose catalog to load (LM Studio by default). */
  provider?: string;
  /** Provider credentials come from the environment and are saved into the test vault (live-runtime helper). */
  vaultCredentials?: boolean;
  pickModel(models: string[]): string | null;
  toolHint?: string;
}>;

const binaryReady = (command: string): boolean => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const preferred = (override: string | undefined, ordered: string[], models: string[]): string | null => {
  const exact = override?.trim();
  if (exact && models.includes(exact)) return exact;
  return ordered.find((model) => models.includes(model)) ?? null;
};
const TOOL_LIST = "list_available_agents, send_message_to, delegate_task and get_handoff_rules";

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
    vaultCredentials: true,
    enabled: process.env.RUN_DEEPSEEK_E2E === "1" && Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    pickModel: (models) => preferred(process.env.DEEPSEEK_E2E_MODEL, ["deepseek-v4-flash"], models)
      ?? models.find((model) => /^deepseek-v4-flash/.test(model)) ?? models.find((model) => /^deepseek/.test(model)) ?? null,
  },
  {
    runtimeKind: "codex_app_server",
    enabled: process.env.RUN_CODEX_E2E === "1" && binaryReady("codex"),
    pickModel: (models) => preferred(process.env.CODEX_E2E_TOOL_MODEL, ["gpt-5.5", "gpt-5.3-codex"], models)
      ?? models.find((model) => /codex/i.test(model)) ?? models[0] ?? null,
    // Codex CLI defers MCP tools behind tool_search; none of the Agent Tools is listed up front.
    toolHint: ` AutoByteus tools such as ${TOOL_LIST} may be deferred: when one is not visible, find it with tool_search first, then call it.`,
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
    toolHint: ` AutoByteus tools such as ${TOOL_LIST} are invoked with call_mcp_tool, ServerName autobyteus_agent_tools and the tool name as ToolName. Do not use shell tools; when a tool result was saved to a file, read it with view_file.`,
  },
  {
    runtimeKind: "grok_build",
    enabled: process.env.RUN_GROK_E2E === "1" && binaryReady("grok"),
    pickModel: (models) => preferred(process.env.GROK_E2E_MODEL, ["grok-4.7"], models) ?? models[0] ?? null,
    toolHint: ` AutoByteus tools such as ${TOOL_LIST} are tools of the MCP server autobyteus_agent_tools: find them with search_tool and call them with use_tool.`,
  },
];
/**
 * SC-004: a model the runtime still runs but its catalog does not offer (a run created before the catalog dropped it),
 * so the run's settings cannot start a collaborator. Claude: the full Haiku ID (the catalog lists the alias).
 */
const staleModelFor = (runtimeKind: RuntimeKind): string | null => ({
  claude_agent_sdk: process.env.CLAUDE_E2E_STALE_MODEL?.trim() || "claude-haiku-4-5-20251001",
  codex_app_server: process.env.CODEX_E2E_STALE_MODEL?.trim() || null,
} as Partial<Record<RuntimeKind, string | null>>)[runtimeKind] ?? null;
const INSTRUCTIONS_NOT_EMITTED = "<instructions not emitted by this runtime>";
const ROOT_RUNTIMES = new Set((process.env.AIC_ROOT_RUNTIMES ?? "claude_agent_sdk").split(",").map((value) => value.trim()));

const describeLive = RUNTIMES.some((runtime) => runtime.enabled) ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.COLLABORATOR_E2E_STEP_TIMEOUT_MS ?? 360_000);

type WsMessage = { type: string; payload: Record<string, unknown> };
type Connection = { socket: WebSocket; messages: WsMessage[] };
type ListedAgent = { name: string; kind: string; address: string; description: string };
type Record_ = Record<string, unknown>;
type CollaborationView = {
  is_active: boolean;
  execution_tree: { collaborators: Record_[]; taskExecutions: Record_[] };
  communication_messages: { messages: Array<{ senderAgentRunId: string; receiverAgentRunId: string; content: string }> };
};
type ConversationEntry = { kind: string; role?: string | null; content?: string | null; senderAgentRunId?: string | null };
type Comm = { sender: string; receiver: string; content: string };

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const asRecord = (value: unknown): Record_ | null => (value && typeof value === "object" && !Array.isArray(value) ? value as Record_ : null);
/** Snake- or camel-case field. */
const field = (value: unknown, camel: string): unknown => {
  const record = asRecord(value);
  if (!record) return undefined;
  return record[camel] ?? record[camel.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)];
};
const str = (value: unknown, camel: string): string => String(field(value, camel) ?? "");
/** `<segment>_<6 hex of sha256(definitionId)>` (CatalogAddressMap). */
const hash6 = (definitionId: string): string => createHash("sha256").update(definitionId).digest("hex").slice(0, 6);
const segmentFor = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** Agent Tools calls are named by tool, `mcp__<server>__<tool>`, or (AGY) `call_mcp_tool` with `Arguments.ToolName`. */
const agentToolName = (payload: Record_): string => {
  const name = String(payload.tool_name ?? asRecord(payload.metadata)?.tool_name ?? "");
  if (name !== "call_mcp_tool") return name.toLowerCase().split("__").at(-1) ?? name;
  return String(asRecord(payload.arguments)?.ToolName ?? "");
};
const isToolDone = (message: WsMessage, tool: string): boolean =>
  ["TOOL_EXECUTION_SUCCEEDED", "TOOL_EXECUTION_FAILED"].includes(message.type) && agentToolName(message.payload).endsWith(tool);
/** Finds `key` in a tool result, whatever the runtime's encoding (object, JSON text, MCP content blocks). */
const findInResult = (payload: Record_, key: string): unknown => {
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
    const record = asRecord(value);
    if (record) {
      if (key in record) return record[key];
      for (const nested of Object.values(record)) { const found = visit(nested, depth + 1); if (found !== undefined) return found; }
    }
    return undefined;
  };
  return visit(payload.result ?? payload.error ?? null, 0);
};
const rejected = (message: WsMessage): boolean => message.type === "TOOL_EXECUTION_FAILED" || findInResult(message.payload, "accepted") === false;
const resultRunId = (message: WsMessage): string | null => {
  const runId = findInResult(message.payload, "target_agent_run_id");
  return typeof runId === "string" && runId ? runId : null;
};
/** Root streams: Team frames are top-level; Org and Agent-root collaboration frames are ROOT_EXECUTION_EVENTs. */
const normalizeFrame = (parsed: { type: string; payload: Record_ }): WsMessage => {
  if (parsed.type !== "ROOT_EXECUTION_EVENT") return parsed;
  const event = asRecord(parsed.payload.event) ?? {};
  if (event.kind === "agent_presentation") {
    const message = asRecord(event.message) ?? {};
    return { type: String(message.type), payload: { ...asRecord(message.payload), agent_run_id: event.agent_run_id } };
  }
  if (event.kind === "communication") return { type: "TEAM_COMMUNICATION_MESSAGE", payload: { message: event.message } };
  if (event.kind === "task_execution_started") return { type: "TASK_EXECUTION_STARTED", payload: event };
  if (event.kind === "collaborator_added") return { type: "COLLABORATOR_ADDED", payload: event };
  return parsed;
};
const commOf = (message: WsMessage): Comm | null => {
  if (message.type !== "TEAM_COMMUNICATION_MESSAGE") return null;
  const projected = asRecord(message.payload.message);
  return projected ? { sender: str(projected, "senderAgentRunId"), receiver: str(projected, "receiverAgentRunId"), content: str(projected, "content") } : null;
};
const comms = (connection: Connection): Comm[] => connection.messages.map(commOf).filter((item): item is Comm => item !== null);
const memberRunIds = (execution: unknown): string[] => ((field(execution, "members") ?? []) as unknown[]).map((member) => str(member, "agentRunId"));
const memberRunId = (execution: unknown, suffix: string): string =>
  str(((field(execution, "members") ?? []) as unknown[]).find((member) => str(member, "address").endsWith(suffix)), "agentRunId");
/** JSON paths (e.g. `rootOrg.taskExecutions[0]`) of every object in `tree` whose run ID field equals `runId`. */
const pathsOf = (tree: unknown, runId: string): string[] => {
  const found: string[] = [];
  const visit = (value: unknown, at: string): void => {
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, `${at}[${index}]`)); return; }
    const record = asRecord(value);
    if (!record) return;
    if ([record.agentRunId, record.agent_run_id, record.teamRunId, record.team_run_id].includes(runId) && "address" in record) found.push(at);
    for (const [key, nested] of Object.entries(record)) visit(nested, at ? `${at}.${key}` : key);
  };
  visit(tree, "");
  return found;
};
/** The stored path of a task copy (by its own run ID: an Agent copy's agent run, a Team copy's team run). */
const copyPath = (tree: unknown, copyRunId: string): string => pathsOf(tree, copyRunId).filter((at) => /task_?[eE]xecutions\[\d+\]$/.test(at)).sort((a, b) => a.length - b.length)[0] ?? "";
/** Every message from or to a copy stays between that copy's members and `allowed` outside run IDs. */
const crossings = (messages: Comm[], copies: string[][], allowed: string[]): string[] => messages.flatMap((message) => copies.flatMap((copy) => {
  const inCopy = (runId: string) => copy.includes(runId) || allowed.includes(runId);
  if (copy.includes(message.sender) && !inCopy(message.receiver)) return [`${message.sender} → ${message.receiver}: ${message.content.slice(0, 60)}`];
  if (copy.includes(message.receiver) && !inCopy(message.sender)) return [`${message.sender} → ${message.receiver}: ${message.content.slice(0, 60)}`];
  return [];
}));

describeLive("Agent-initiated collaborators on real runtimes (SR-005)", () => {
  let dataDir: string | null = null;
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  const sockets = new Set<WebSocket>();
  const runIds = new Set<string>();
  const teamRunIds = new Set<string>();
  const orgRunIds = new Set<string>();
  const definitionIds = new Set<string>();
  const teamDefinitionIds = new Set<string>();
  const orgDefinitionIds = new Set<string>();
  const workspaces = new Set<string>();

  const gql = async <T>(query: string, variables: Record_ = {}): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };

  const modelsFor = async (runtime: RuntimeCase): Promise<string[]> => {
    const { runtimeKind } = runtime;
    if (runtimeKind === "autobyteus") {
      const result = await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
        `mutation($providerId: String!, $runtimeKind: String) {
          ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
        }`, { providerId: runtime.provider ?? "LMSTUDIO", runtimeKind });
      return result.ensureProviderModelCatalog.llmModels.map((model) => model.modelIdentifier);
    }
    const result = await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: runtimeKind });
    return result.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
  };

  const createAgentDefinition = async (name: string, description: string, instructions: string, toolNames: string[]): Promise<string> => {
    const result = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name, description, instructions, category: "runtime-e2e", toolNames } });
    definitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };
  const createTeamDefinition = async (input: Record_): Promise<string> => {
    const result = await gql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }", { input });
    teamDefinitionIds.add(result.createAgentTeamDefinition.id);
    return result.createAgentTeamDefinition.id;
  };
  const newWorkspace = async (): Promise<string> => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "aic-e2e-ws-"));
    workspaces.add(workspaceRootPath);
    return workspaceRootPath;
  };
  const createAgentRun = async (agentDefinitionId: string, runtimeKind: string, model: string): Promise<string> => {
    const result = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath: await newWorkspace(), llmModelIdentifier: model, autoExecuteTools: true, runtimeKind } });
    expect(result.createAgentRun.success, result.createAgentRun.message).toBe(true);
    runIds.add(result.createAgentRun.runId!);
    return result.createAgentRun.runId!;
  };

  const collaborationView = async (runId: string): Promise<CollaborationView | null> =>
    (await gql<{ agentRunCollaboration: { root_agent: CollaborationView } | null }>(
      "query($runId: String!) { agentRunCollaboration(runId: $runId) }", { runId })).agentRunCollaboration?.root_agent ?? null;
  const packageExists = (runId: string): Promise<boolean> =>
    stat(path.join(dataDir!, "memory", "agents", runId, "collaboration", "collaboration_tree.json")).then(() => true, () => false);
  const memberConversation = async (hostRunId: string, memberAddress: string, agentRunId: string): Promise<ConversationEntry[]> =>
    (await gql<{ agentRunCollaborationMemberProjection: { conversation: ConversationEntry[] } }>(
      `query($h: String!, $a: String!, $r: String!) { agentRunCollaborationMemberProjection(hostRunId: $h, memberAddress: $a, agentRunId: $r) { conversation } }`,
      { h: hostRunId, a: memberAddress, r: agentRunId })).agentRunCollaborationMemberProjection.conversation;
  /** An Agent root answers for one focused agent; the host's own composer unless another is given. */
  const mentionCandidates = async (rootSubjectKind: string, rootRunId: string, focusedAgentRunId: string | null = rootSubjectKind === "agent" ? rootRunId : null) =>
    (await gql<{ collaboratorMentionCandidates: { candidates: Array<{ kind: string; definitionId: string; name: string }> } }>(
      `query($k: String!, $id: String!, $f: String) { collaboratorMentionCandidates(rootSubjectKind: $k, rootRunId: $id, focusedAgentRunId: $f) { candidates { kind definitionId name } } }`,
      { k: rootSubjectKind, id: rootRunId, f: focusedAgentRunId })).collaboratorMentionCandidates.candidates;
  const teamTree = async (teamRunId: string): Promise<Record_> =>
    asRecord(field((await gql<{ getTeamRunResumeConfig: { executionTree: Record_ } }>(
      "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: teamRunId })).getTeamRunResumeConfig.executionTree, "rootTeam"))!;

  const openSocket = async (urlPath: string, ready: string): Promise<Connection> => {
    const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}${urlPath}`);
    sockets.add(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push(normalizeFrame({ type: parsed.type, payload: asRecord(parsed.payload) ?? {} }));
      } catch { /* ignore non-JSON frames */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitFor(messages, 0, (message) => message.type === ready, `${ready} ${urlPath}`, 120_000);
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
  const poll = async <T>(label: string, read: () => Promise<T | null | undefined | false>, timeoutMs = STEP_TIMEOUT_MS): Promise<T> => {
    const deadline = Date.now() + timeoutMs;
    let last: unknown = null;
    while (Date.now() < deadline) {
      try { const value = await read(); if (value) return value as T; last = value; } catch (error) { last = error instanceof Error ? error.message : error; }
      await wait(1_500);
    }
    throw new Error(`Timed out waiting for ${label}. Last: ${JSON.stringify(last).slice(0, 1_500)}`);
  };

  /** One user turn on a standalone run's stream. */
  const sendTurn = async (connection: Connection, content: string, mentions?: Array<{ kind: string; definition_id: string }>): Promise<number> => {
    const from = connection.messages.length;
    sendE2eSendMessageCommand(connection.socket, { content, ...(mentions ? { mentions } : {}) });
    const ack = await waitFor(connection.messages, from, (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.command_type === "SEND_MESSAGE", "SEND_MESSAGE ack", 120_000);
    expect(ack.payload.accepted, JSON.stringify(ack.payload)).toBe(true);
    return from;
  };
  const waitIdle = (connection: Connection, from: number, label: string) =>
    waitFor(connection.messages, from, (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle", `${label} idle`);
  /** Asks the agent for exactly one tool call and returns its accepted result (a retry after a malformed call is allowed). */
  const callTool = async (connection: Connection, tool: string, args: Record_, label: string, accepted = true): Promise<WsMessage> => {
    const from = await sendTurn(connection, `Call the ${tool} tool exactly once now with these exact JSON arguments: ${JSON.stringify(args)}. `
      + "Do not call any other AutoByteus tool. Then reply with one short sentence quoting the tool result.");
    const done = await waitFor(connection.messages, from, (message) => isToolDone(message, tool) && (accepted ? !rejected(message) : true), `${label} ${tool} result`);
    await waitIdle(connection, from, label);
    return done;
  };
  const toolCallResults = (conversation: ConversationEntry[], tool: string): string[] =>
    conversation.filter((item) => item.kind === "tool_call" && String((item as Record_).toolName ?? "").endsWith(tool))
      .map((item) => JSON.stringify((item as Record_).toolResult ?? (item as Record_).toolError ?? null));
  /**
   * The system instructions an agent run was given (root streams carry SYSTEM_INSTRUCTIONS_SUPPLIED per member).
   * Only the Claude backend emits that event; elsewhere the instruction checks are skipped (the prompt composer is
   * shared by every runtime and pinned by unit tests).
   */
  let instructionsVisible = true;
  const instructionsOf = (connection: Connection, agentRunId: string): Promise<string> => !instructionsVisible ? Promise.resolve(INSTRUCTIONS_NOT_EMITTED) : waitFor(connection.messages, 0,
    (message) => message.type === "SYSTEM_INSTRUCTIONS_SUPPLIED" && message.payload.agent_run_id === agentRunId, `system instructions of ${agentRunId}`)
    .then((message) => String(message.payload.content ?? ""));
  /** Asks one member (by run ID, over a root stream) to call get_handoff_rules and returns the result text. */
  const rulesOf = async (connection: Connection, send: (agentRunId: string, content: string) => void, agentRunId: string, label: string): Promise<string> => {
    const from = connection.messages.length;
    send(agentRunId, "Call get_handoff_rules exactly once now with these exact JSON arguments: {}. Do not call any other tool. Then reply with the single word DONE.");
    const done = await waitFor(connection.messages, from, (message) => message.payload.agent_run_id === agentRunId && isToolDone(message, "get_handoff_rules"), `${label} get_handoff_rules`);
    return JSON.stringify(done.payload.result ?? done.payload.error ?? null);
  };
  const isInterAgentFrom = (entry: ConversationEntry, senderRunId: string) => entry.kind === "inter_agent_message" && entry.senderAgentRunId === senderRunId;
  const operatorPrompt = (tool: string, args: Record_) =>
    `Call ${tool} exactly once now with these exact JSON arguments: ${JSON.stringify(args)}. Do not call any other tool. Then reply with the single word DONE.`;

  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "aic-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (RUNTIMES.some((runtime) => runtime.enabled && runtime.vaultCredentials)) await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
  }, 180_000);

  afterEach(async () => {
    for (const socket of sockets) socket.close();
    sockets.clear();
    for (const id of orgRunIds) await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id }).catch(() => undefined);
    orgRunIds.clear();
    for (const id of teamRunIds) await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id }).catch(() => undefined);
    teamRunIds.clear();
    for (const id of runIds) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id }).catch(() => undefined);
    runIds.clear();
    for (const id of orgDefinitionIds) await gql("mutation($id: String!) { deleteAgentOrgDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    orgDefinitionIds.clear();
    for (const id of teamDefinitionIds) await gql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    teamDefinitionIds.clear();
    for (const id of definitionIds) await gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    definitionIds.clear();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    app = null;
    if (RUNTIMES.some((runtime) => runtime.enabled && runtime.vaultCredentials)) await closeLiveRuntimeSecretVault();
    for (const workspace of workspaces) await rm(workspace, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  /** A lead/mate team whose lead follows its handoff to the mate and reports DONE to whoever gave it the task. */
  const createSquad = async (suffix: string, hint: string) => {
    const leadId = await createAgentDefinition(`AIC Lead ${suffix}`, "Leads a two-member squad.",
      "You lead a two-member squad. When you receive a task that contains a task code: 1) call get_handoff_rules; 2) call send_message_to "
      + "with the recipient_address of your teammate from those rules and content 'CHECK <task code>'; 3) when the teammate answers, call "
      + "send_message_to with target_agent_run_id set to the run ID of the agent that gave you the task (the task delegator, or the sender "
      + "id of the message) and content 'DONE <task code>'. If a message tells you to call a tool with exact JSON arguments, do exactly "
      + `that instead. Keep every message short.${hint}`, []);
    const mateId = await createAgentDefinition(`AIC Mate ${suffix}`, "Confirms checks for its squad lead.",
      "When a teammate messages you, call send_message_to once with target_agent_run_id set to the sender id given in the message and "
      + `content 'CONFIRMED' followed by the task code it mentions. If a message tells you to call a tool with exact JSON arguments, do exactly that instead.${hint}`, []);
    const squadName = `AIC Squad ${suffix}`;
    const squadInstruction = `AIC squad instruction ${suffix}: confirm every task code with the mate.`;
    const squadId = await createTeamDefinition({
      name: squadName, description: "A lead and a mate who confirm each task.", instructions: squadInstruction, coordinatorMemberName: "lead",
      nodes: [{ memberName: "lead", ref: leadId, refScope: "SHARED" }, { memberName: "mate", ref: mateId, refScope: "SHARED" }],
      handoffs: [{ from: "/lead", to: "/mate", rules: ["Always ask the mate to confirm the task code before reporting back."] }],
    });
    return { leadId, mateId, squadId, squadName, squadInstruction, squadAddress: `/${segmentFor(squadName)}` };
  };

  for (const runtime of RUNTIMES) {
    const rootCases = runtime.enabled && (ROOT_RUNTIMES.has(runtime.runtimeKind) || ROOT_RUNTIMES.has(runtime.id ?? ""));

    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LE-A1 list is opt-in and read-only; first message brings in; reuse with @ in both orders; failures create nothing`, async () => {
      const available = await modelsFor(runtime);
      const model = runtime.pickModel(available);
      expect(model, `no model for ${runtime.runtimeKind} in ${JSON.stringify(available).slice(0, 400)}`).toBeTruthy();
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const token = `AIC-${suffix}`;
      const operator = "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`;
      const helperName = `AIC Helper ${suffix}`;
      const helperDescription = `Replies to whoever messages it (${suffix}).`;
      const helperId = await createAgentDefinition(helperName, helperDescription,
        "When another agent messages you, do what it asks: call send_message_to exactly once with target_agent_run_id set to the sender id "
        + "given in the message and content set to the exact text it asks for. Then reply 'sent' and stop. When the user talks to you "
        + `directly, reply in one short sentence without tools.${hint}`, []);
      const twinName = `AIC Twin ${suffix}`;
      const twinAId = await createAgentDefinition(twinName, "Twin A.", `Reply in one short sentence without tools.${hint}`, []);
      const twinBId = await createAgentDefinition(twinName, "Twin B.", `Reply in one short sentence without tools.${hint}`, []);
      const plainId = await createAgentDefinition(`AIC Plain ${suffix}`, "Has no discovery tool.", operator, []);
      const pmId = await createAgentDefinition(`AIC PM ${suffix}`, "Plans work with other agents.", operator, ["list_available_agents"]);
      const helperAddress = `/${segmentFor(helperName)}`;
      const twinAAddress = `/${segmentFor(twinName)}_${hash6(twinAId)}`;
      const twinBAddress = `/${segmentFor(twinName)}_${hash6(twinBId)}`;

      // AC-001: an agent whose definition does not select the tool has no list_available_agents.
      const plainRunId = await createAgentRun(plainId, runtime.runtimeKind, model!);
      const plain = await openSocket(`/ws/agent/${plainRunId}`, "CONNECTED");
      const plainFrom = await sendTurn(plain, "Call the list_available_agents tool exactly once now if you have it; if you do not have it, "
        + "reply NO TOOL. Do not call any other tool.");
      await waitIdle(plain, plainFrom, "plain run");
      expect(plain.messages.filter((message) => isToolDone(message, "list_available_agents") && !rejected(message)),
        "no successful list_available_agents without the tool").toEqual([]);

      // AC-002/003/008: the list's shape, eligibility equal to @, hashed twin addresses, no write.
      const pmRunId = await createAgentRun(pmId, runtime.runtimeKind, model!);
      const pm = await openSocket(`/ws/agent/${pmRunId}`, "CONNECTED");
      let lastListEvent = "";
      const listOnce = async (label: string): Promise<ListedAgent[] | null> => {
        const done = await callTool(pm, "list_available_agents", {}, label);
        lastListEvent = JSON.stringify(done.payload).slice(0, 800);
        const agents = findInResult(done.payload, "agents") as ListedAgent[] | undefined;
        if (!Array.isArray(agents) && runtime.runtimeKind === "antigravity_cli") return null;
        expect(Array.isArray(agents), JSON.stringify(done.payload).slice(0, 1_000)).toBe(true);
        return [...agents!].sort((left, right) => left.address.localeCompare(right.address));
      };
      const listed = await listOnce("first list");
      if (listed === null) {
        // AGY saves a large MCP result to a file (the stream event then has no output) and the model reads it
        // with view_file: ask the model to quote the addresses.
        const from = await sendTurn(pm, `From the list_available_agents result you just received, reply with the exact address of every entry named `
          + `"${helperName}" or "${twinName}" (there are three), copied character for character from the tool result, comma-separated, and nothing else. `
          + "If you cannot see the tool result, reply NO OUTPUT. Do not call any tool.");
        await waitIdle(pm, from, "AGY list quote");
        const reply = (await (await gql<{ getRunProjection: { conversation: ConversationEntry[] } }>(
          "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId: pmRunId })).getRunProjection.conversation)
          .filter((item) => item.role === "assistant").at(-1)?.content ?? "";
        for (const address of [helperAddress, twinAAddress, twinBAddress]) expect(reply, `${reply.slice(0, 600)} | list event: ${lastListEvent}`).toContain(address);
      }
      const first = listed ?? [];
      if (listed) {
        for (const entry of first) expect(Object.keys(entry).sort()).toEqual(["address", "description", "kind", "name"]);
        expect(first.find((entry) => entry.name === helperName)).toEqual({ name: helperName, kind: "agent", address: helperAddress, description: helperDescription });
        expect(first.filter((entry) => entry.name === twinName).map((entry) => entry.address).sort()).toEqual([twinAAddress, twinBAddress].sort());
        expect(first.some((entry) => entry.name === `AIC PM ${suffix}`), "the run's own definition is excluded").toBe(false);
        expect(first.some((entry) => entry.name === `AIC Plain ${suffix}`)).toBe(true);
        const atMenu = (await mentionCandidates("agent", pmRunId)).map((candidate) => `${candidate.kind}:${candidate.name}`).sort();
        expect(first.map((entry) => `${entry.kind}:${entry.name}`).sort(), "same eligibility as the @ menu").toEqual(atMenu);
      }
      expect(await packageExists(pmRunId), "listing writes nothing").toBe(false);

      // AC-003/004: an unknown address and an unknown run ID create nothing.
      const unknownAddress = await callTool(pm, "send_message_to", { recipient_address: `/aic_nobody_${suffix}`, content: "hello" }, "unknown address", false);
      expect(rejected(unknownAddress), JSON.stringify(unknownAddress.payload).slice(0, 600)).toBe(true);
      const unknownRun = await callTool(pm, "send_message_to", { target_agent_run_id: `aic_missing_run_${suffix}`, content: "hello" }, "unknown run ID", false);
      expect(rejected(unknownRun), JSON.stringify(unknownRun.payload).slice(0, 600)).toBe(true);
      expect((await collaborationView(pmRunId))?.execution_tree.collaborators ?? []).toEqual([]);
      expect(await packageExists(pmRunId), "failed sends write nothing").toBe(false);

      // AC-004: the first message to a listed address brings it in and delivers.
      const bringIn = await callTool(pm, "send_message_to", { recipient_address: helperAddress,
        content: `Reply to me with send_message_to and the exact text ${token}.` }, "bring-in");
      const helperRunId = resultRunId(bringIn);
      expect(helperRunId, JSON.stringify(bringIn.payload).slice(0, 600)).toBeTruthy();
      const added = (await collaborationView(pmRunId))!;
      expect(added.execution_tree.collaborators).toHaveLength(1);
      expect(added.execution_tree.collaborators[0]).toMatchObject({ kind: "agent", address: helperAddress, agentDefinitionId: helperId, agentRunId: helperRunId, addedViaAgentRunId: pmRunId });
      expect(field(added.execution_tree.collaborators[0], "launchConfiguration")).toMatchObject({ runtimeKind: runtime.runtimeKind, llmModelIdentifier: model });
      expect(await packageExists(pmRunId), "the first bring-in creates the package").toBe(true);
      await poll("briefing and report", async () => {
        const messages = (await collaborationView(pmRunId))?.communication_messages.messages ?? [];
        return messages.some((message) => message.senderAgentRunId === pmRunId && message.receiverAgentRunId === helperRunId)
          && messages.some((message) => message.senderAgentRunId === helperRunId && message.receiverAgentRunId === pmRunId && message.content.includes(token));
      });
      const helperConversation = await memberConversation(pmRunId, helperAddress, helperRunId!);
      expect(helperConversation[0], JSON.stringify(helperConversation.slice(0, 2)).slice(0, 600)).toMatchObject({ kind: "inter_agent_message", senderAgentRunId: pmRunId });

      // AC-004: a second message reaches the same run ID.
      const again = await callTool(pm, "send_message_to", { recipient_address: helperAddress, content: "Reply in one short sentence, without tools." }, "second message");
      expect(resultRunId(again)).toBe(helperRunId);
      expect((await collaborationView(pmRunId))!.execution_tree.collaborators.map((entry) => entry.agentRunId)).toEqual([helperRunId]);

      // AC-010: @ after a bring-in reuses it; a bring-in after @ reuses the @ instance.
      const mentionHelper = await sendTurn(pm, "Reply with the single word NOTED. Do not call any tool.", [{ kind: "agent", definition_id: helperId }]);
      await waitIdle(pm, mentionHelper, "@ after bring-in");
      expect((await collaborationView(pmRunId))!.execution_tree.collaborators.map((entry) => entry.agentRunId)).toEqual([helperRunId]);
      const mentionTwin = await sendTurn(pm, "Reply with the single word NOTED. Do not call any tool.", [{ kind: "agent", definition_id: twinAId }]);
      await waitIdle(pm, mentionTwin, "@ twin");
      const twinEntry = (await collaborationView(pmRunId))!.execution_tree.collaborators.find((entry) => entry.agentDefinitionId === twinAId)!;
      expect(twinEntry, "the @ instance").toBeTruthy();
      expect(twinEntry.address, "@ uses the listed address").toBe(twinAAddress);
      const twinMessage = await callTool(pm, "send_message_to", { recipient_address: twinAAddress, content: "Reply in one short sentence, without tools." }, "bring-in after @");
      expect(resultRunId(twinMessage)).toBe(twinEntry.agentRunId);
      expect((await collaborationView(pmRunId))!.execution_tree.collaborators).toHaveLength(2);

      // AC-002/003: a re-list gives identical addresses; in-run definitions at their in-run address.
      const second = await listOnce("re-list");
      if (listed) expect(second).toEqual(first);
    }, 2_400_000);

    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LE-A2 three catalog copies with source, each one unit, no collaborator; restore after Stop`, async () => {
      const model = runtime.pickModel(await modelsFor(runtime));
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const squad = await createSquad(suffix, hint);
      const pmId = await createAgentDefinition(`AIC PM ${suffix}`, "Plans work with other agents.",
        "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`, ["list_available_agents"]);
      const pmRunId = await createAgentRun(pmId, runtime.runtimeKind, model!);
      const pm = await openSocket(`/ws/agent/${pmRunId}`, "CONNECTED");
      const members = await openSocket(`/ws/agent-collaboration/${pmRunId}`, "CONNECTED");

      const codes = [1, 2, 3].map((index) => `C${index}-${suffix}`);
      const copyRunIds: string[] = [];
      for (const code of codes) {
        const delegated = await callTool(pm, "delegate_task", { recipient_address: squad.squadAddress,
          description: `Task code ${code}. Follow your handoff rules, then report DONE ${code} to me by my run ID.` }, `delegate ${code}`);
        const runId = resultRunId(delegated);
        expect(runId, JSON.stringify(delegated.payload).slice(0, 600)).toBeTruthy();
        copyRunIds.push(runId!);
      }
      expect(new Set(copyRunIds).size).toBe(3);
      const view = (await collaborationView(pmRunId))!;
      expect(view.execution_tree.collaborators, "delegation adds no collaborator (Q-1)").toEqual([]);
      const copies = view.execution_tree.taskExecutions;
      expect(copies).toHaveLength(3);
      for (const copy of copies) {
        expect(copy).toMatchObject({ address: squad.squadAddress, delegatorAgentRunId: pmRunId });
        expect(field(copy, "source")).toMatchObject({ kind: "agent_team", teamDefinitionId: squad.squadId, coordinatorAddress: `${squad.squadAddress}/lead` });
      }
      expect(await packageExists(pmRunId), "the first catalog copy creates the package").toBe(true);
      const copyMembers = copies.map(memberRunIds);

      // UC-004 / SC-002: inside each copy, get_handoff_rules names that copy's own teammate.
      for (const copy of copies) {
        const results = await poll("copy lead called get_handoff_rules", async () => {
          const found = toolCallResults(await memberConversation(pmRunId, `${squad.squadAddress}/lead`, memberRunId(copy, "/lead")), "get_handoff_rules");
          return found.length ? found : null;
        });
        expect(results[0], `a catalog copy follows its own handoffs (source.handoffs ${JSON.stringify(field(field(copy, "source"), "handoffs"))})`).toContain(`${squad.squadAddress}/mate`);
        if (instructionsVisible) expect(await instructionsOf(members, memberRunId(copy, "/lead")), "a catalog copy member gets its own team instruction").toContain(squad.squadInstruction);
      }

      let recorded: unknown = null;
      await poll("each copy: lead → own mate → lead → PM", async () => {
        const messages = (await collaborationView(pmRunId))?.communication_messages.messages ?? [];
        recorded = messages.map((message) => `${message.senderAgentRunId} → ${message.receiverAgentRunId}: ${message.content.slice(0, 60)}`);
        return copies.every((copy) => {
          const lead = memberRunId(copy, "/lead");
          const mate = memberRunId(copy, "/mate");
          return messages.some((message) => message.senderAgentRunId === lead && message.receiverAgentRunId === mate)
            && messages.some((message) => message.senderAgentRunId === mate && message.receiverAgentRunId === lead)
            && messages.some((message) => message.senderAgentRunId === lead && message.receiverAgentRunId === pmRunId && /DONE/.test(message.content));
        });
      }).catch(async (error: unknown) => {
        const leads = await Promise.all(copies.map(async (copy) => (await memberConversation(pmRunId, `${squad.squadAddress}/lead`, memberRunId(copy, "/lead")))
          .filter((item) => item.kind === "tool_call").map((item) => JSON.stringify(item).slice(0, 400))));
        throw new Error(`${error instanceof Error ? error.message : String(error)} Recorded: ${JSON.stringify(recorded)} Lead tool calls: ${JSON.stringify(leads)}`);
      });
      const all = (await collaborationView(pmRunId))!.communication_messages.messages
        .map((message) => ({ sender: message.senderAgentRunId, receiver: message.receiverAgentRunId, content: message.content }));
      expect(crossings(all, copyMembers, [pmRunId]), "no message crosses copies").toEqual([]);
      for (const copy of copies) {
        const lead = memberRunId(copy, "/lead");
        const toMate = all.findIndex((message) => message.sender === lead && message.receiver === memberRunId(copy, "/mate"));
        const report = all.findIndex((message) => message.sender === lead && message.receiver === pmRunId);
        expect(toMate > -1 && toMate < report, `copy ${lead} hands off to its mate before reporting`).toBe(true);
      }

      // Restore: after Stop the copies keep their source; a message wakes copy #1 from it.
      const stopped = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: pmRunId });
      expect(stopped.terminateAgentRun.success, stopped.terminateAgentRun.message).toBe(true);
      const stored = await poll("stored view after Stop", async () => { const value = await collaborationView(pmRunId); return value && !value.is_active ? value : null; });
      expect(stored.execution_tree.taskExecutions.map((copy) => field(copy, "source"))).toEqual(copies.map((copy) => field(copy, "source")));
      const firstLead = memberRunId(copies[0], "/lead");
      const collab = await openSocket(`/ws/agent-collaboration/${pmRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
      collab.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent", root_run_id: pmRunId, target_agent_run_id: firstLead, command_id: randomUUID(),
        content: "Call get_handoff_rules exactly once now with these exact JSON arguments: {}. Do not call any other tool. Then reply with the single word WOKEN.",
        context_file_paths: [], image_urls: [], ...buildE2eClientCommandIds(),
      } }));
      const wakeAck = await waitFor(collab.messages, 0, (message) => message.type === "AGENT_COMMAND_ACK", "wake ack", 180_000);
      expect(wakeAck.payload.state, JSON.stringify(wakeAck.payload)).toBe("accepted");
      const woken = await poll("restored copy answered", async () => {
        const conversation = await memberConversation(pmRunId, `${squad.squadAddress}/lead`, firstLead);
        return conversation.some((item) => item.role !== "user" && item.kind !== "inter_agent_message" && /WOKEN/.test(item.content ?? "")) ? conversation : null;
      });
      expect(toolCallResults(woken, "get_handoff_rules").at(-1), "a restored catalog copy keeps its own handoffs").toContain(`${squad.squadAddress}/mate`);
    }, 2_400_000);

    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LE-A3 Agent root — a collaborator-team member's top-level copy is placed at the root, its teammate copy inside the team; kept after Stop`, async () => {
      const model = runtime.pickModel(await modelsFor(runtime));
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const squad = await createSquad(suffix, hint);
      const echoName = `AIC Echo ${suffix}`;
      await createAgentDefinition(echoName, "Answers delegated tasks.", `Reply to any task in one short sentence without tools.${hint}`, []);
      const pmId = await createAgentDefinition(`AIC PM ${suffix}`, "Plans work with other agents.",
        "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`, ["list_available_agents"]);
      const pmRunId = await createAgentRun(pmId, runtime.runtimeKind, model!);
      const pm = await openSocket(`/ws/agent/${pmRunId}`, "CONNECTED");
      const bring = await callTool(pm, "send_message_to", { recipient_address: squad.squadAddress, content: `Task code PA-${suffix}. Follow your handoff rules, then report DONE PA-${suffix} to me (my sender id).` }, "bring in the squad");
      expect(resultRunId(bring)).toBeTruthy();
      const collaborator = (await collaborationView(pmRunId))!.execution_tree.collaborators.find((entry) => entry.address === squad.squadAddress)!;
      const collaboratorLead = memberRunId(collaborator, "/lead");
      const members = await openSocket(`/ws/agent-collaboration/${pmRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
      const sendTo = (agentRunId: string, content: string) => members.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent", root_run_id: pmRunId, target_agent_run_id: agentRunId, command_id: randomUUID(), content,
        context_file_paths: [], image_urls: [], ...buildE2eClientCommandIds(),
      } }));
      await poll("collaborator lead idle after its task", async () => {
        const messages = (await collaborationView(pmRunId))?.communication_messages.messages ?? [];
        return messages.some((message) => message.senderAgentRunId === collaboratorLead && message.receiverAgentRunId === pmRunId) ? messages : null;
      });
      const delegatedBy = (tree: unknown, address: string): boolean => {
        let hit = false;
        const scan = (value: unknown): void => {
          if (Array.isArray(value)) { value.forEach(scan); return; }
          const record = asRecord(value); if (!record) return;
          if (record.delegatorAgentRunId === collaboratorLead && record.address === address) hit = true;
          Object.values(record).forEach(scan);
        };
        scan(tree);
        return hit;
      };
      const leadToolCalls = async () => toolCallResults(await memberConversation(pmRunId, `${squad.squadAddress}/lead`, collaboratorLead), "delegate_task");
      let placed: unknown = null;
      for (const address of [`/${segmentFor(echoName)}`, `${squad.squadAddress}/mate`]) {
        sendTo(collaboratorLead, operatorPrompt("delegate_task", { recipient_address: address, description: "Reply in one short sentence." }));
        placed = await poll(`copy of ${address} recorded`, async () => {
          const tree = (await collaborationView(pmRunId))?.execution_tree;
          return tree && delegatedBy(tree, address) ? tree : null;
        }).catch(async (error: unknown) => { throw new Error(`${error instanceof Error ? error.message : String(error)} Lead delegate_task results: ${JSON.stringify(await leadToolCalls()).slice(0, 1_500)}`); });
      }
      const copies: Array<Record_> = [];
      const collect = (value: unknown): void => {
        if (Array.isArray(value)) { value.forEach(collect); return; }
        const record = asRecord(value); if (!record) return;
        if (record.delegatorAgentRunId === collaboratorLead) copies.push(record);
        Object.values(record).forEach(collect);
      };
      collect(placed);
      const echoCopy = copies.find((copy) => copy.address === `/${segmentFor(echoName)}`)!;
      const mateCopy = copies.find((copy) => copy.address === `${squad.squadAddress}/mate`)!;
      expect(copyPath(placed, String(echoCopy.agentRunId)), "a collaborator member's top-level copy is at the Agent root").toMatch(/^taskExecutions\[\d+\]$/);
      expect(copyPath(placed, String(mateCopy.agentRunId)), "its teammate copy stays inside the collaborator team").toMatch(/^collaborators\[\d+\]\.taskExecutions\[\d+\]$/);
      const stopped = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: pmRunId });
      expect(stopped.terminateAgentRun.success, stopped.terminateAgentRun.message).toBe(true);
      const stored = await poll("stored view after Stop", async () => { const value = await collaborationView(pmRunId); return value && !value.is_active ? value : null; });
      expect(copyPath(stored.execution_tree, String(echoCopy.agentRunId)), "placement kept after Stop").toBe(copyPath(placed, String(echoCopy.agentRunId)));
      expect(copyPath(stored.execution_tree, String(mateCopy.agentRunId)), "teammate placement kept after Stop").toBe(copyPath(placed, String(mateCopy.agentRunId)));
    }, 2_400_000);

    it.runIf(rootCases)(`${runtime.id ?? runtime.runtimeKind}: LE-T1 Team root — catalog copies and a brought-in team stay apart with their own scope; catalog Agent copies get none; configured scope kept after Stop → reopen`, async () => {
      const model = runtime.pickModel(await modelsFor(runtime));
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const squad = await createSquad(suffix, hint);
      const operator = "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`;
      const replyBack = "When another agent messages you, call send_message_to exactly once with target_agent_run_id set to the sender id given in the "
        + `message and content set to the exact text it asks for. Then reply 'sent'.${hint}`;
      const helperName = `AIC Helper ${suffix}`;
      await createAgentDefinition(helperName, "Replies to whoever messages it.", replyBack, []);
      const racerName = `AIC Racer ${suffix}`;
      await createAgentDefinition(racerName, "Replies to whoever messages it.", replyBack, []);
      const echoName = `AIC Echo ${suffix}`;
      const echoId = await createAgentDefinition(echoName, "Answers delegated tasks.",
        `When you get a task, do exactly what it says, then reply in one short sentence.${hint}`, []);
      const coordId = await createAgentDefinition(`AIC Coord ${suffix}`, "Coordinates.", operator, ["list_available_agents"]);
      const workerId = await createAgentDefinition(`AIC Worker ${suffix}`, "Works.", operator, []);
      const hostInstruction = `AIC host instruction ${suffix}: keep the plan small.`;
      const hostTeamId = await createTeamDefinition({
        name: `AIC Host Team ${suffix}`, description: "Host team.", instructions: hostInstruction, coordinatorMemberName: "coord",
        nodes: [{ memberName: "coord", ref: coordId, refScope: "SHARED" }, { memberName: "worker", ref: workerId, refScope: "SHARED" }],
        handoffs: [{ from: "/coord", to: "/worker", rules: ["Give the worker the build step."] }],
      });
      const workspaceRootPath = await newWorkspace();
      const config = { llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: runtime.runtimeKind, workspaceRootPath };
      const created = await gql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
        "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
        { input: { teamDefinitionId: hostTeamId, teamConfigs: [{ teamAddress: "/", ...config }],
          memberConfigs: [{ memberAddress: "/coord", agentDefinitionId: coordId, ...config }, { memberAddress: "/worker", agentDefinitionId: workerId, ...config }] } });
      expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
      const teamRunId = created.createAgentTeamRun.teamRunId!;
      teamRunIds.add(teamRunId);
      const configured = async (address: string) => str(((field(await teamTree(teamRunId), "members") ?? []) as unknown[]).find((member) => str(member, "address") === address), "agentRunId");
      const coordRunId = await configured("/coord");
      const workerRunId = await configured("/worker");
      expect(coordRunId && workerRunId).toBeTruthy();
      let team = await openSocket(`/ws/agent-team/${teamRunId}`, "TEAM_EXECUTION_VIEW_SNAPSHOT");
      const sendTo = (agentRunId: string, content: string) => sendE2eSendMessageCommand(team.socket, { content, agent_run_id: agentRunId, context_file_paths: [], image_urls: [] });

      // AC-012: the configured member's handoffs and the root team's instruction.
      expect(await rulesOf(team, sendTo, coordRunId, "configured coord"), "configured member keeps its handoffs").toContain("/worker");
      if (instructionsVisible) expect(await instructionsOf(team, coordRunId), "configured member keeps the root team instruction").toContain(hostInstruction);

      // Two catalog copies of a listed team (AC-005 in a Team root): each carries its source and its own scope.
      const copyCodes = [`T1-${suffix}`, `T2-${suffix}`];
      for (const code of copyCodes) {
        const from = team.messages.length;
        sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: squad.squadAddress, description: `Task code ${code}. Follow your handoff rules, then report DONE ${code} to me by my run ID.` }));
        await waitFor(team.messages, from, (message) => message.type === "TASK_EXECUTION_STARTED" && str(field(message.payload, "execution") ?? message.payload, "address") === squad.squadAddress, `copy ${code} started`);
      }
      const started = team.messages.filter((message) => message.type === "TASK_EXECUTION_STARTED").map((message) => field(message.payload, "execution") ?? message.payload);
      expect(started).toHaveLength(2);
      for (const copy of started) {
        expect(str(field(copy, "source"), "kind"), JSON.stringify(copy).slice(0, 600)).toBe("agent_team");
        expect(str(field(copy, "source"), "teamDefinitionId")).toBe(squad.squadId);
        const lead = memberRunId(copy, "/lead");
        const rules = await waitFor(team.messages, 0, (message) => message.payload.agent_run_id === lead && isToolDone(message, "get_handoff_rules"), "Team-root copy lead get_handoff_rules");
        expect(JSON.stringify(rules.payload), "a Team-root catalog copy follows its own handoffs").toContain(`${squad.squadAddress}/mate`);
        if (instructionsVisible) {
          const instructions = await instructionsOf(team, lead);
          expect(instructions, "a catalog copy member gets its own team instruction").toContain(squad.squadInstruction);
          expect(instructions, "…not the root team's").not.toContain(hostInstruction);
        }
      }
      expect(field(await teamTree(teamRunId), "collaborators") ?? [], "delegation adds no collaborator (Q-1)").toEqual([]);

      // SC-001 in a Team root: the coordinator then brings the same listed team in by message (a third instance).
      const bringCode = `B-${suffix}`;
      const bringFrom = team.messages.length;
      sendTo(coordRunId, operatorPrompt("send_message_to", { recipient_address: squad.squadAddress, content: `Task code ${bringCode}. Follow your handoff rules, then report DONE ${bringCode} to me (my sender id).` }));
      const added = await waitFor(team.messages, bringFrom, (message) => message.type === "COLLABORATOR_ADDED", "collaborator added");
      const collaborator = field(added.payload, "collaborator");
      expect(collaborator).toMatchObject({ kind: "agent_team", address: squad.squadAddress });
      expect(str(collaborator, "addedViaAgentRunId")).toBe(coordRunId);
      const instances = [collaborator, ...started];
      let recorded: unknown = null;
      await poll("three instances: lead → own mate → lead → coordinator", async () => {
        const messages = comms(team);
        recorded = messages.map((message) => `${message.sender} → ${message.receiver}: ${message.content.slice(0, 50)}`);
        return instances.every((instance) => {
          const lead = memberRunId(instance, "/lead");
          const mate = memberRunId(instance, "/mate");
          return messages.some((message) => message.sender === lead && message.receiver === mate)
            && messages.some((message) => message.sender === mate && message.receiver === lead)
            && messages.some((message) => message.sender === lead && message.receiver === coordRunId && /DONE/.test(message.content));
        });
      }).catch((error: unknown) => { throw new Error(`${error instanceof Error ? error.message : String(error)} Recorded: ${JSON.stringify(recorded)}`); });
      expect(crossings(comms(team), instances.map(memberRunIds), [coordRunId]), "the three instances never cross").toEqual([]);
      for (const instance of instances) {
        const lead = memberRunId(instance, "/lead");
        const messages = comms(team);
        const toMate = messages.findIndex((message) => message.sender === lead && message.receiver === memberRunId(instance, "/mate"));
        const report = messages.findIndex((message) => message.sender === lead && message.receiver === coordRunId);
        expect(toMate > -1 && toMate < report, `${lead} hands off to its mate before reporting`).toBe(true);
      }

      // A catalog Agent copy (at root level, and delegated by a copy member) gets no handoffs and no team instruction.
      const echoTask = "Call get_handoff_rules exactly once with no arguments, then reply in one short sentence.";
      const rootEchoFrom = team.messages.length;
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: `/${segmentFor(echoName)}`, description: echoTask }));
      const rootEcho = field((await waitFor(team.messages, rootEchoFrom, (message) => message.type === "TASK_EXECUTION_STARTED", "root-level catalog Agent copy")).payload, "execution");
      const copyLead = memberRunId(started[0], "/lead");
      const copyEchoFrom = team.messages.length;
      sendTo(copyLead, operatorPrompt("delegate_task", { recipient_address: `/${segmentFor(echoName)}`, description: echoTask }));
      const copyEcho = field((await waitFor(team.messages, copyEchoFrom, (message) => message.type === "TASK_EXECUTION_STARTED", "copy member delegates to a listed agent")).payload, "execution");
      expect(str(copyEcho, "delegatorAgentRunId"), "AC-006: a copy member delegates").toBe(copyLead);
      for (const [label, echo] of [["root-level", rootEcho], ["copy-member", copyEcho]] as const) {
        expect(str(field(echo, "source"), "agentDefinitionId")).toBe(echoId);
        const echoRunId = str(echo, "agentRunId");
        const rules = await waitFor(team.messages, 0, (message) => message.payload.agent_run_id === echoRunId && isToolDone(message, "get_handoff_rules"), `${label} catalog Agent copy get_handoff_rules`);
        expect(JSON.stringify(rules.payload.result ?? rules.payload.error ?? null), `${label} catalog Agent copy has no handoffs`).not.toMatch(/recipient_address/);
        if (instructionsVisible) {
          const instructions = await instructionsOf(team, echoRunId);
          expect(instructions, `${label} catalog Agent copy has no root team instruction`).not.toContain(hostInstruction);
          expect(instructions, `${label} catalog Agent copy has no squad instruction`).not.toContain(squad.squadInstruction);
        }
      }

      // AC-006: a member of the brought-in team brings in a listed agent.
      const collaboratorLead = memberRunId(collaborator, "/lead");
      const helperToken = `H-${suffix}`;
      const helperFrom = team.messages.length;
      sendTo(collaboratorLead, operatorPrompt("send_message_to", { recipient_address: `/${segmentFor(helperName)}`, content: `Reply to me with send_message_to and the exact text ${helperToken}.` }));
      const helperAdded = await waitFor(team.messages, helperFrom, (message) => message.type === "COLLABORATOR_ADDED", "helper added by a collaborator member");
      expect(str(field(helperAdded.payload, "collaborator"), "addedViaAgentRunId")).toBe(collaboratorLead);
      await waitFor(team.messages, helperFrom, (message) => commOf(message)?.receiver === collaboratorLead && (commOf(message)?.content ?? "").includes(helperToken), "helper replies to the collaborator member");

      // AC-013 / REQ-012: copies are placed by address — top-level targets at the root, teammates inside the team.
      const placeFrom = team.messages.length;
      sendTo(collaboratorLead, operatorPrompt("delegate_task", { recipient_address: `/${segmentFor(echoName)}`, description: "Reply in one short sentence." }));
      const collaboratorEcho = field((await waitFor(team.messages, placeFrom, (message) => message.type === "TASK_EXECUTION_STARTED" && str(field(message.payload, "execution"), "delegatorAgentRunId") === collaboratorLead, "collaborator member delegates a top-level address")).payload, "execution");
      const teammateFrom = team.messages.length;
      sendTo(collaboratorLead, operatorPrompt("delegate_task", { recipient_address: `${squad.squadAddress}/mate`, description: "Reply with the single word CONFIRMED." }));
      const teammateCopy = field((await waitFor(team.messages, teammateFrom, (message) => message.type === "TASK_EXECUTION_STARTED" && str(field(message.payload, "execution"), "address") === `${squad.squadAddress}/mate`, "collaborator member delegates its teammate")).payload, "execution");
      const placed = await teamTree(teamRunId);
      expect(copyPath(placed, str(collaboratorEcho, "agentRunId")), "a collaborator member's top-level copy is at the Team root").toMatch(/^task_executions\[\d+\]$/);
      expect(copyPath(placed, str(copyEcho, "agentRunId")), "a copy member's top-level copy is at the Team root").toMatch(/^task_executions\[\d+\]$/);
      expect(copyPath(placed, str(teammateCopy, "agentRunId")), "a teammate copy stays inside its team").toMatch(/^collaborators\[\d+\]\.task_executions\[\d+\]$/);
      expect(str(collaboratorEcho, "delegatorAgentRunId"), "the delegator is kept").toBe(collaboratorLead);

      // RS-003: two members send their first message to the same new address at the same time → one instance.
      const racerAddress = `/${segmentFor(racerName)}`;
      const raceFrom = team.messages.length;
      sendTo(coordRunId, operatorPrompt("send_message_to", { recipient_address: racerAddress, content: "Reply to me with send_message_to and the exact text RACE-COORD." }));
      sendTo(workerRunId, operatorPrompt("send_message_to", { recipient_address: racerAddress, content: "Reply to me with send_message_to and the exact text RACE-WORKER." }));
      const raceResults = await Promise.all([coordRunId, workerRunId].map((runId) => waitFor(team.messages, raceFrom,
        (message) => message.payload.agent_run_id === runId && isToolDone(message, "send_message_to") && !rejected(message), `race send by ${runId}`)));
      const raceTargets = raceResults.map((message) => resultRunId(message));
      expect(raceTargets[0], JSON.stringify(raceResults.map((message) => message.payload.result)).slice(0, 600)).toBeTruthy();
      expect(raceTargets[1], "both first messages reached the same instance").toBe(raceTargets[0]);
      const racers = ((field(await teamTree(teamRunId), "collaborators") ?? []) as unknown[]).filter((entry) => str(entry, "address") === racerAddress);
      expect(racers, "one instance for two concurrent first messages").toHaveLength(1);
      console.log(`[LE-T1] race results: ${JSON.stringify(raceResults.map((message) => [message.payload.agent_run_id, resultRunId(message)]))}`);

      // AC-012 after Stop → reopen: the configured, collaborator and catalog-copy scopes are restored.
      const stopped = await gql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId });
      expect(stopped.terminateAgentTeamRun.success, stopped.terminateAgentTeamRun.message).toBe(true);
      team.socket.close();
      await wait(3_000);
      team = await openSocket(`/ws/agent-team/${teamRunId}`, "TEAM_EXECUTION_VIEW_SNAPSHOT");
      expect(await rulesOf(team, sendTo, coordRunId, "reopened configured coord"), "configured handoffs after reopen").toContain("/worker");
      expect(await rulesOf(team, sendTo, collaboratorLead, "reopened collaborator lead"), "collaborator team handoffs after reopen").toContain(`${squad.squadAddress}/mate`);
      expect(await rulesOf(team, sendTo, copyLead, "reopened catalog copy lead"), "catalog copy handoffs after reopen").toContain(`${squad.squadAddress}/mate`);
      const reopened = await teamTree(teamRunId);
      expect(copyPath(reopened, str(collaboratorEcho, "agentRunId")), "placement kept after reopen").toBe(copyPath(placed, str(collaboratorEcho, "agentRunId")));
      expect(copyPath(reopened, str(teammateCopy, "agentRunId")), "teammate placement kept after reopen").toBe(copyPath(placed, str(teammateCopy, "agentRunId")));
    }, 2_400_000);

    it.runIf(rootCases)(`${runtime.id ?? runtime.runtimeKind}: LE-O1 Org root — a copy of a mounted Team stays inside the copy; configured, mounted and cross-placement handoffs kept (also after Stop → reopen); catalog copy scope; a member brings in`, async () => {
      const model = runtime.pickModel(await modelsFor(runtime));
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const operator = "You are a precise tool operator. Follow the user's instructions exactly, call only the tools named, "
        + `and keep every reply to one short sentence. Never call get_handoff_rules unless told to.${hint}`;
      const coordId = await createAgentDefinition(`AIC Org Coord ${suffix}`, "Coordinates the org.", operator, ["list_available_agents"]);
      const leadId = await createAgentDefinition(`AIC Org Lead ${suffix}`, "Squad lead.", operator, []);
      const mateId = await createAgentDefinition(`AIC Org Mate ${suffix}`, "Squad mate.", `${operator} When a teammate messages you without exact tool arguments, reply with the single word NOTED and no tool.`, []);
      const helperName = `AIC Helper ${suffix}`;
      await createAgentDefinition(helperName, "Replies to whoever messages it.",
        "When another agent messages you, call send_message_to exactly once with target_agent_run_id set to the sender id given in the message "
        + `and content set to the exact text it asks for. Then reply 'sent'.${hint}`, []);
      const mountedInstruction = `AIC mounted squad instruction ${suffix}.`;
      const squadId = await createTeamDefinition({
        name: `AIC Org Squad ${suffix}`, description: "Mounted squad.", instructions: mountedInstruction, coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: leadId, refScope: "SHARED" }, { memberName: "mate", ref: mateId, refScope: "SHARED" }],
        handoffs: [{ from: "/lead", to: "/mate", rules: ["Ask the mate."] }],
      });
      const orgInstruction = `AIC org instruction ${suffix}: members follow their own instructions exactly.`;
      const org = await gql<{ createAgentOrgDefinition: { id: string } }>(
        "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }", { input: {
          name: `AIC Org ${suffix}`, description: "Org with a mounted squad.", instructions: orgInstruction,
          members: [
            { memberName: "coordinator", ref: coordId, refType: "AGENT", refScope: "SHARED" },
            { memberName: "squad", ref: squadId, refType: "AGENT_TEAM", refScope: "SHARED" },
          ],
          handoffs: [
            { from: "/coordinator", to: "/squad", rules: ["Give the squad the build work."] },
            { from: "/squad/lead", to: "/coordinator", rules: ["Report finished work to the coordinator."] },
          ],
        } });
      orgDefinitionIds.add(org.createAgentOrgDefinition.id);
      const createdOrg = await gql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
        "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }", { input: {
          agentOrgDefinitionId: org.createAgentOrgDefinition.id,
          rootConfiguration: { runtimeKind: runtime.runtimeKind, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: await newWorkspace() },
          agentOverrides: [],
        } });
      expect(createdOrg.createAgentOrgRun.success, createdOrg.createAgentOrgRun.message).toBe(true);
      const orgRunId = createdOrg.createAgentOrgRun.agentOrgRunId!;
      orgRunIds.add(orgRunId);
      let stream = await openSocket(`/ws/agent-org/${orgRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
      const snapshot = stream.messages.find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT")!;
      const runIdByAddress = new Map<string, string>();
      const visit = (members: unknown[]) => {
        for (const member of members) {
          if (str(member, "agentRunId")) runIdByAddress.set(str(member, "address"), str(member, "agentRunId"));
          if (Array.isArray(field(member, "members"))) visit(field(member, "members") as unknown[]);
        }
      };
      visit((field(field(field(field(snapshot.payload, "rootOrg"), "executionTree"), "rootOrg"), "members") ?? []) as unknown[]);
      const coordRunId = runIdByAddress.get("/coordinator")!;
      const mountedLead = runIdByAddress.get("/squad/lead")!;
      const mountedMate = runIdByAddress.get("/squad/mate")!;
      expect([coordRunId, mountedLead, mountedMate].every(Boolean), JSON.stringify([...runIdByAddress])).toBe(true);
      const sendTo = (agentRunId: string, content: string) => {
        const messageId = `aic-${randomUUID()}`;
        stream.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
          root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agentRunId, command_id: `cmd-${messageId}`,
          content, context_file_paths: [], image_urls: [], message_id: messageId, dedupe_key: `agent_run_input:e2e:${messageId}`,
        } }));
      };

      // AC-012: configured and cross-placement Org handoffs, the mounted team's own handoff, and their instructions.
      expect(await rulesOf(stream, sendTo, coordRunId, "org coordinator"), "Org placement handoff").toContain("/squad");
      const mountedRules = await rulesOf(stream, sendTo, mountedLead, "mounted lead");
      expect(mountedRules, "mounted team handoff").toContain("/squad/mate");
      expect(mountedRules, "cross-placement Org handoff from a mounted member").toContain("/coordinator");
      if (instructionsVisible) {
        expect(await instructionsOf(stream, coordRunId), "Org direct Agent gets the Org instruction").toContain(orgInstruction);
        expect(await instructionsOf(stream, mountedLead), "mounted member gets its team instruction").toContain(mountedInstruction);
      }
      const mountedFrom = stream.messages.length;
      sendTo(mountedLead, operatorPrompt("send_message_to", { recipient_address: "/squad/mate", content: `MOUNTED-${suffix}` }));
      await waitFor(stream.messages, mountedFrom, (message) => { const comm = commOf(message); return comm?.sender === mountedLead && comm.receiver === mountedMate; }, "mounted lead → mounted mate");

      // SC-003: a copy of the mounted Team reaches its own mate; an outside address resolves as before.
      const copyFrom = stream.messages.length;
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: "/squad", description:
        `Call send_message_to exactly once with recipient_address "/squad/mate" and content "COPY-${suffix}". Then call send_message_to exactly once `
        + `with recipient_address "/coordinator" and content "REPORT-${suffix}". Do not call any other tool. Then reply DONE.` }));
      const copyStarted = await waitFor(stream.messages, copyFrom, (message) => message.type === "TASK_EXECUTION_STARTED", "copy of the mounted squad");
      const execution = field(copyStarted.payload, "execution") ?? copyStarted.payload;
      const copyLead = memberRunId(execution, "/lead");
      const copyMate = memberRunId(execution, "/mate");
      expect(copyLead && copyMate && copyLead !== mountedLead && copyMate !== mountedMate, JSON.stringify(execution).slice(0, 600)).toBe(true);
      const toMate = await waitFor(stream.messages, copyFrom, (message) => { const comm = commOf(message); return comm?.sender === copyLead && comm.content.includes(`COPY-${suffix}`); }, "copy lead → /squad/mate");
      expect(commOf(toMate)!.receiver, "the copy's own mate, not the mounted one (REQ-007)").toBe(copyMate);
      await waitFor(stream.messages, copyFrom, (message) => { const comm = commOf(message); return comm?.sender === copyLead && comm.receiver === coordRunId && comm.content.includes(`REPORT-${suffix}`); }, "copy lead → /coordinator (outside its team)");
      expect(comms(stream).filter((comm) => comm.receiver === mountedMate && comm.content.includes(`COPY-${suffix}`)), "nothing reaches the mounted mate").toEqual([]);

      // AC-005/007 in an Org: a catalog copy of a listed (not mounted) team follows its own handoffs with its own instruction.
      const catalogSquad = await createSquad(suffix, hint);
      const catalogCode = `OC-${suffix}`;
      const catalogFrom = stream.messages.length;
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: catalogSquad.squadAddress, description: `Task code ${catalogCode}. Follow your handoff rules, then report DONE ${catalogCode} to me by my run ID.` }));
      const catalogStarted = await waitFor(stream.messages, catalogFrom, (message) => message.type === "TASK_EXECUTION_STARTED" && str(field(message.payload, "execution") ?? message.payload, "address") === catalogSquad.squadAddress, "Org catalog copy started");
      const catalogCopy = field(catalogStarted.payload, "execution") ?? catalogStarted.payload;
      expect(str(field(catalogCopy, "source"), "teamDefinitionId")).toBe(catalogSquad.squadId);
      const catalogLead = memberRunId(catalogCopy, "/lead");
      const catalogMate = memberRunId(catalogCopy, "/mate");
      const catalogRules = await waitFor(stream.messages, catalogFrom, (message) => message.payload.agent_run_id === catalogLead && isToolDone(message, "get_handoff_rules"), "Org catalog copy lead get_handoff_rules");
      expect(JSON.stringify(catalogRules.payload), "an Org catalog copy follows its own handoffs").toContain(`${catalogSquad.squadAddress}/mate`);
      if (instructionsVisible) {
        const catalogInstructions = await instructionsOf(stream, catalogLead);
        expect(catalogInstructions, "an Org catalog copy member gets its own team instruction").toContain(catalogSquad.squadInstruction);
        expect(catalogInstructions).not.toContain(orgInstruction);
      }
      await waitFor(stream.messages, catalogFrom, (message) => { const comm = commOf(message); return comm?.sender === catalogLead && comm.receiver === catalogMate; }, "Org catalog copy lead → its own mate");
      await waitFor(stream.messages, catalogFrom, (message) => { const comm = commOf(message); return comm?.sender === catalogLead && comm.receiver === coordRunId && /DONE/.test(comm.content); }, "Org catalog copy reports DONE");

      // AC-013 / REQ-012: a mounted member's copy of a top-level (catalog) address is recorded at the Org top level;
      // its copy of a teammate stays under its team.
      const orgSnapshot = async (): Promise<Record_> => {
        const probe = await openSocket(`/ws/agent-org/${orgRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
        const snap = probe.messages.find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT")!;
        probe.socket.close();
        return asRecord(field(field(field(snap.payload, "rootOrg"), "executionTree"), "rootOrg"))!;
      };
      const mountedCopyFrom = stream.messages.length;
      sendTo(mountedLead, operatorPrompt("delegate_task", { recipient_address: catalogSquad.squadAddress, description: `Task code OM-${suffix}. Follow your handoff rules, then report DONE OM-${suffix} to me by my run ID.` }));
      const mountedCatalogCopy = field((await waitFor(stream.messages, mountedCopyFrom, (message) => message.type === "TASK_EXECUTION_STARTED" && str(field(message.payload, "execution"), "delegatorAgentRunId") === mountedLead, "mounted member's catalog copy")).payload, "execution");
      const teammateFrom = stream.messages.length;
      sendTo(mountedLead, operatorPrompt("delegate_task", { recipient_address: "/squad/mate", description: "Reply with the single word NOTED." }));
      const mountedTeammateCopy = field((await waitFor(stream.messages, teammateFrom, (message) => message.type === "TASK_EXECUTION_STARTED" && str(field(message.payload, "execution"), "address") === "/squad/mate", "mounted member's teammate copy")).payload, "execution");
      const placedOrg = await orgSnapshot();
      const catalogCopyRunId = str(mountedCatalogCopy, "teamRunId");
      const teammateCopyRunId = str(mountedTeammateCopy, "agentRunId");
      expect(copyPath(placedOrg, catalogCopyRunId), "a mounted member's catalog copy is at rootOrg.taskExecutions").toMatch(/^taskExecutions\[\d+\]$/);
      expect(copyPath(placedOrg, teammateCopyRunId), "a mounted member's teammate copy stays under its team").toMatch(/^members\[\d+\]\.taskExecutions\[\d+\]$/);
      expect(str(mountedCatalogCopy, "delegatorAgentRunId"), "the delegator is kept").toBe(mountedLead);
      await waitFor(stream.messages, mountedCopyFrom, (message) => { const comm = commOf(message); return comm?.receiver === mountedLead && /DONE/.test(comm.content) && memberRunIds(mountedCatalogCopy).includes(comm.sender); }, "the top-level copy still reports to its delegator");

      // AC-008 in an Org: a member brings a listed agent in.
      const helperToken = `OH-${suffix}`;
      const helperFrom = stream.messages.length;
      sendTo(coordRunId, operatorPrompt("send_message_to", { recipient_address: `/${segmentFor(helperName)}`, content: `Reply to me with send_message_to and the exact text ${helperToken}.` }));
      const added = await waitFor(stream.messages, helperFrom, (message) => message.type === "COLLABORATOR_ADDED", "helper added in the Org");
      expect(str(field(added.payload, "collaborator"), "addedViaAgentRunId")).toBe(coordRunId);
      await waitFor(stream.messages, helperFrom, (message) => commOf(message)?.receiver === coordRunId && (commOf(message)?.content ?? "").includes(helperToken), "helper replies to the Org coordinator");

      // AC-012 after Stop → reopen.
      const stopped = await gql<{ terminateAgentOrgRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId });
      expect(stopped.terminateAgentOrgRun.success, stopped.terminateAgentOrgRun.message).toBe(true);
      stream.socket.close();
      await wait(3_000);
      // Reopen as the app does: restore the stopped Org, then attach its stream.
      const restored = await gql<{ restoreAgentOrgRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId });
      expect(restored.restoreAgentOrgRun.success, restored.restoreAgentOrgRun.message).toBe(true);
      stream = await openSocket(`/ws/agent-org/${orgRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
      expect(await rulesOf(stream, sendTo, coordRunId, "reopened org coordinator"), "Org placement handoff after reopen").toContain("/squad");
      const reopenedMounted = await rulesOf(stream, sendTo, mountedLead, "reopened mounted lead");
      expect(reopenedMounted, "mounted team handoff after reopen").toContain("/squad/mate");
      expect(reopenedMounted, "cross-placement handoff after reopen").toContain("/coordinator");
      expect(await rulesOf(stream, sendTo, catalogLead, "reopened Org catalog copy lead"), "Org catalog copy handoffs after reopen").toContain(`${catalogSquad.squadAddress}/mate`);
      const reopenedOrg = await orgSnapshot();
      expect(copyPath(reopenedOrg, catalogCopyRunId), "placement kept after restore").toBe(copyPath(placedOrg, catalogCopyRunId));
      expect(copyPath(reopenedOrg, teammateCopyRunId), "teammate placement kept after restore").toBe(copyPath(placedOrg, teammateCopyRunId));
    }, 2_400_000);

    it.runIf(runtime.enabled && Boolean(staleModelFor(runtime.runtimeKind)))(`${runtime.id ?? runtime.runtimeKind}: LE-F1 SC-004 — a run whose model left the catalog: bring-in and catalog copy fail with the reason and add nothing`, async () => {
      const staleModel = staleModelFor(runtime.runtimeKind)!;
      const offered = await modelsFor(runtime);
      expect(offered.includes(staleModel), `${staleModel} must not be in the ${runtime.runtimeKind} catalog (${offered.join(", ")})`).toBe(false);
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const helperName = `AIC Helper ${suffix}`;
      await createAgentDefinition(helperName, "Replies to whoever messages it.", `Reply in one short sentence.${hint}`, []);
      const squad = await createSquad(suffix, hint);
      const pmId = await createAgentDefinition(`AIC PM ${suffix}`, "Plans work with other agents.",
        `You are a precise tool operator. Follow the user's instructions exactly and keep every reply to one short sentence.${hint}`, ["list_available_agents"]);
      const pmRunId = await createAgentRun(pmId, runtime.runtimeKind, staleModel);
      const pm = await openSocket(`/ws/agent/${pmRunId}`, "CONNECTED");
      const bringIn = await callTool(pm, "send_message_to", { recipient_address: `/${segmentFor(helperName)}`, content: "hello" }, "stale bring-in", false);
      const bringText = JSON.stringify(bringIn.payload);
      expect(rejected(bringIn), bringText.slice(0, 800)).toBe(true);
      expect(bringText, "the reason reaches the agent").toMatch(/COLLABORATOR_ADD_FAILED|not available/);
      const delegated = await callTool(pm, "delegate_task", { recipient_address: squad.squadAddress, description: "ping" }, "stale catalog copy", false);
      const delegateText = JSON.stringify(delegated.payload);
      expect(resultRunId(delegated), delegateText.slice(0, 800)).toBeNull();
      expect(delegateText, "the delegation reason reaches the agent").toMatch(/cannot be delegated to|not available/);
      const view = await collaborationView(pmRunId);
      expect(view?.execution_tree.collaborators ?? [], "nothing added").toEqual([]);
      expect(view?.execution_tree.taskExecutions ?? [], "no copy started").toEqual([]);
      expect(await packageExists(pmRunId), "nothing written").toBe(false);
    }, 1_200_000);
  }
});
