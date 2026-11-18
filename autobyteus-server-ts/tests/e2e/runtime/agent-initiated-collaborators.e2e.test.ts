import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";
import { readRootMessages, readParticipantMessages, type ParticipantMessage } from "../../helpers/collaboration-participant-messages.js";
import { delegatedRunsTree, readRunTree } from "../helpers/run-tree-delegated.js";
import { projectionByOwnRun } from "../helpers/own-run-reads.js";

/**
 * The collaboration model on real runtimes (live, paid/local inference): agent-initiated-collaborators SR-005 as revised by
 * collaboration-model-contract. Inside your run you message; outside it you delegate, then message the copy by run ID;
 * messaging never brings anyone in; delegating a teammate or your own Team is refused.
 *
 * Standalone (Agent root), per enabled runtime:
 * - LE-A1: `list_available_agents` is absent unless the definition selects it (AC-001); its result is
 *   `{agents:[{name, kind, address, description}]}` with the `@` menu's eligibility, distinct hashed
 *   addresses for two same-name definitions, and no write (AC-002/003/008); an unknown address and an
 *   unknown run ID create nothing (AC-003/004); a message to a listed address that is not in the run is not found, with
 *   guidance to use delegate_task, and creates nothing (AC-005); following it, delegate_task starts a root-hosted copy that is
 *   then messaged by its run ID (AC-004/AC-006); a re-list is identical (AC-002/003).
 * - LE-A2: three `delegate_task` calls to a listed team start three copies with a persisted `source`; each copy follows
 *   its own handoff inside itself and reports back by run ID; no message crosses copies (AC-005/007/008); after Stop, a
 *   message wakes a copy from its `source`.
 * - LE-A3: a delegated Team copy's member delegates a top-level (catalog) address: the copy is placed at the Agent root; it
 *   delegating its own teammate is refused and starts nothing; placement is kept after Stop.
 * Every catalog Team copy gets its own handoff rules and team instruction and hands off to its mate before
 *   reporting; a catalog Agent copy gets neither (SR-006 member scope).
 * Team root (LE-T1): configured handoffs and instruction kept; two catalog copies of a team follow their handoffs inside
 *   themselves (AC-007); a configured teammate is refused as a delegation target, a copy member's own teammate too; catalog
 *   Agent copies (root-level and from a copy member) get no scope and are placed at the Team root; scopes survive Stop → reopen.
 * Org root (LE-O1): configured, mounted and cross-placement handoffs and instructions kept (also after Stop →
 *   reopen, AC-012); a copy of a mounted Team stays inside the copy (SC-003); a catalog copy follows its own handoffs;
 *   a mounted member's catalog copy is placed at the Org top level and its teammate is refused; a message to an outside
 *   address is not found.
 * LE-F1 (SC-004): a run on a model its runtime still runs but the catalog no longer offers (Claude: the full Haiku
 *   ID, CLAUDE_E2E_STALE_MODEL; Codex only with CODEX_E2E_STALE_MODEL) gets the failure reason for a catalog copy and
 *   the not-found answer for an outside message; nothing is added.
 *
 * Gates (each runtime independently): RUN_LMSTUDIO_E2E=1 (AutoByteus over LM Studio), RUN_DEEPSEEK_E2E=1 (AutoByteus
 * over DeepSeek; set AUTOBYTEUS_TEST_VAULT so the key comes from the test vault, see TESTING.md#test-vault; a missing
 * key is reported as a skip), RUN_CODEX_E2E=1, RUN_CLAUDE_E2E=1, RUN_AGY_E2E=1, RUN_GROK_E2E=1 (ACP), plus the
 * runtime's CLI on PATH.
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
  /** The provider key this runtime needs from the live vault (the test vault when selected). */
  requiredSecretId?: string;
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
    requiredSecretId: "provider.deepseek.api-key",
    enabled: process.env.RUN_DEEPSEEK_E2E === "1",
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
/** The call's arguments as text: lets a wait pick the tool call it is about (an earlier call's completion may arrive late). */
const toolArgumentsText = (message: WsMessage): string => JSON.stringify(message.payload.arguments ?? {});
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
/**
 * A member's refused `delegate_task` to `address`, as its root stream shows it: the tool's completion frame, or (the
 * AutoByteus runtime on a Team or Org stream, as at base 827f1e68dc) the agent's tool-exception `ERROR` frame.
 */
const isRefusedDelegation = (message: WsMessage, agentRunId: string, address: string): boolean =>
  (message.payload.agent_run_id ?? (message.type === "ERROR" ? agentRunId : undefined)) === agentRunId && (
    (isToolDone(message, "delegate_task") && toolArgumentsText(message).includes(`"${address}"`))
    || (message.type === "ERROR" && String(message.payload.code ?? "").includes("delegate_task") && JSON.stringify(message.payload).includes(address)));
const rejected = (message: WsMessage): boolean => message.type === "TOOL_EXECUTION_FAILED" || findInResult(message.payload, "accepted") === false;
/** The agent run a result names: send_message_to's receiver, an Agent copy, or a Team copy's coordinator. */
const resultRunId = (message: WsMessage): string | null => {
  const runId = findInResult(message.payload, "target_agent_run_id") ?? findInResult(message.payload, "target_team_coordinator_agent_run_id");
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
/** A delegated run's own run ID: a Team copy's team run, an Agent copy's agent run. */
const runIdOf = (record: unknown): string => str(record, "teamRunId") || str(record, "agentRunId");
/** Every delegated run of a tree's records, at every depth (a run delegated inside a Team copy sits in that copy's list). */
const flatDelegated = (records: readonly Record_[]): Record_[] =>
  records.flatMap((record) => [record, ...flatDelegated((record.taskExecutions ?? []) as Record_[])]);
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

  // autobyteus-461 SR-084: a run's view carries its own parts only; its delegated runs are rows of its tree (`runTree`), each
  // nested under the agent that delegated it. Rule 2: a delegated run is a run of its own, read by its own identity (its
  // own file, its own conversation, its own team's stream and messages).
  const anyGql = (query: string, variables?: Record<string, unknown>) => gql<Record<string, any>>(query, (variables ?? {}) as Record_);
  /** A run's delegated runs, read from its tree. */
  const delegatedOf = async (kind: "agent" | "agent_team" | "agent_org", runId: string): Promise<Record_[]> =>
    (await delegatedRunsTree(anyGql, kind, runId)).taskExecutions as Record_[];
  /** Where a delegated run's row sits in a tree: under the row of the agent that delegated it. */
  const placementOf = async (kind: "agent" | "agent_team" | "agent_org", rootRunId: string, runId: string) => {
    const rows = (await readRunTree(anyGql, kind, rootRunId)).rows;
    const row = rows.find((candidate) => ["agent", "team"].includes(String(candidate.kind)) && candidate.openTarget?.runId === runId);
    if (!row) return null;
    return { parentKey: row.parentKey as string | null, delegatorAgentRunId: rows.find((parent) => parent.key === row.parentKey)?.openTarget?.agentRunId ?? null };
  };
  const memoryDir = () => path.join(dataDir!, "memory");
  /** An Agent copy's own file (its definition and the run it was delegated from). */
  const ownAgentFile = async (agentRunId: string): Promise<Record_> =>
    JSON.parse(await readFile(path.join(memoryDir(), "agents", agentRunId, "run_metadata.json"), "utf-8")) as Record_;
  /** A Team copy's own file (rooted at `/`: its definition, coordinator and delegation). */
  const ownTeamFile = async (teamRunId: string): Promise<Record_> =>
    JSON.parse(await readFile(path.join(memoryDir(), "agent_teams", teamRunId, "team_run_execution_tree.json"), "utf-8")) as Record_;
  /** The runs the server holds, one folder each: listing and refused calls add none; a delegation adds the copy's own. */
  const runFolders = async (): Promise<string[]> => [
    ...(await readdir(path.join(memoryDir(), "agents")).catch(() => [] as string[])),
    ...(await readdir(path.join(memoryDir(), "agent_teams")).catch(() => [] as string[])),
  ].sort();
  /** The system instructions a run of its own (or a member of a team run) was given, from its own stored activities. */
  const ownInstructions = async (agentRunId: string): Promise<string> => {
    if (!instructionsVisible) return INSTRUCTIONS_NOT_EMITTED;
    return poll(`stored instructions of ${agentRunId}`, async () => {
      const activities = ((await projectionByOwnRun(anyGql, memoryDir(), agentRunId))?.activities ?? []) as Record_[];
      return activities.filter((activity) => activity.kind === "system_instruction").map((activity) => String(activity.content ?? "")).join("\n") || null;
    });
  };
  /** An Agent copy's own conversation. */
  const agentConversation = async (agentRunId: string): Promise<ConversationEntry[]> =>
    (await gql<{ getRunProjection: { conversation: ConversationEntry[] } | null }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId: agentRunId })).getRunProjection?.conversation ?? [];
  /**
   * The messages between a root's agents and the Team copies it delegated to: the root's own participants' lists, and each
   * Team copy's own log (its members talk inside it). A message between two runs is stored in both; one entry per message.
   */
  const treeMessages = async (rootKind: "agent" | "agent_team" | "agent_org", rootRunId: string, ownAgentRunIds: string[]): Promise<ParticipantMessage[]> => {
    const byId = new Map<string, ParticipantMessage>();
    for (const message of await readRootMessages(gql, { rootKind, rootRunId, agentRunIds: ownAgentRunIds })) byId.set(message.messageId, message);
    for (const copy of flatDelegated(await delegatedOf(rootKind, rootRunId)).filter((record) => str(record, "teamRunId"))) {
      for (const message of await readRootMessages(gql, { rootKind: "agent_team", rootRunId: str(copy, "teamRunId"), agentRunIds: memberRunIds(copy) })) byId.set(message.messageId, message);
    }
    return [...byId.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.messageId.localeCompare(right.messageId));
  };
  const hubMessages = (runId: string) => treeMessages("agent", runId, [runId]);
  const asComms = (messages: readonly ParticipantMessage[]): Comm[] =>
    messages.map((message) => ({ sender: message.senderAgentRunId, receiver: message.receiverAgentRunId, content: message.content }));
  /** Waits for a delegated run that is new to `known` and matches. */
  const newCopy = (kind: "agent" | "agent_team" | "agent_org", rootRunId: string, known: ReadonlySet<string>, match: (record: Record_) => boolean, label: string) =>
    poll(label, async () => flatDelegated(await delegatedOf(kind, rootRunId)).find((record) => !known.has(runIdOf(record)) && match(record)) ?? null);
  const knownCopies = async (kind: "agent" | "agent_team" | "agent_org", rootRunId: string) => new Set(flatDelegated(await delegatedOf(kind, rootRunId)).map(runIdOf));
  const sortedOf = (ids: Iterable<string>) => [...new Set(ids)].sort();
  /** A Team copy's own stream: its members are reached here (rule 2), not through the run that delegated it. */
  const openCopyTeam = async (copyTeamRunId: string) => {
    const connection = await openSocket(`/ws/agent-team/${copyTeamRunId}`, "TEAM_EXECUTION_VIEW_SNAPSHOT");
    const send = (agentRunId: string, content: string) => sendE2eSendMessageCommand(connection.socket, { content, agent_run_id: agentRunId, context_file_paths: [], image_urls: [] });
    return { connection, send };
  };
  /** autobyteus-461 rule 2: a delegated Team copy's member is read by its own team (its conversation, its messages). */
  const copyMemberConversation = async (copyTeamRunId: string, agentRunId: string): Promise<ConversationEntry[]> =>
    (await gql<{ getTeamMemberRunProjection: { conversation: ConversationEntry[] } | null }>(
      "query($t: String!, $a: String!) { getTeamMemberRunProjection(teamRunId: $t, agentRunId: $a) { conversation } }",
      { t: copyTeamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation ?? [];
  const participantMessages = (rootKind: "agent" | "agent_team" | "agent_org", rootRunId: string, agentRunId: string) =>
    readParticipantMessages(gql, { rootKind, rootRunId, agentRunId }).catch(() => []);
  /** TC-12: a copy's own handoffs name its teammate from its own root (`/mate`), never under the delegation's name. */
  const namesOwnMate = (text: string) => /(?<![\w/])\/mate\b/.test(text);
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
    throw new Error(`Timed out waiting for ${label}. Last: ${String(JSON.stringify(last ?? null)).slice(0, 1_500)}`);
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
    // The completion of the call that was asked for: the agent may also make calls of its own (for example answering a report it
    // just received), so a completion counts only when its arguments carry the requested values.
    const wanted = Object.values(args).filter((value): value is string => typeof value === "string").map((value) => JSON.stringify(value).slice(1, -1));
    const asked = (message: WsMessage) => { const text = toolArgumentsText(message); return text === "{}" || wanted.every((value) => text.includes(value)); };
    const done = await waitFor(connection.messages, from, (message) => isToolDone(message, tool) && asked(message) && (accepted ? !rejected(message) : true), `${label} ${tool} result`);
    await waitIdle(connection, connection.messages.indexOf(done) + 1, label);
    return done;
  };
  /** Waits until the run is idle and has sent nothing for `quietMs`: it has finished reacting to what it was last told. */
  const waitQuiet = async (connection: Connection, label: string, quietMs = 6_000): Promise<void> => {
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    let seen = -1, since = Date.now();
    while (Date.now() < deadline) {
      const length = connection.messages.length;
      const status = [...connection.messages].reverse().find((message) => message.type === "AGENT_STATUS")?.payload.status;
      if (length !== seen) { seen = length; since = Date.now(); }
      else if ((status === "idle" || status === undefined) && Date.now() - since >= quietMs) return;
      await wait(500);
    }
    throw new Error(`Timed out waiting for ${label} to go quiet`);
  };
  /**
   * Waits until one member of a root stream is idle and has sent nothing for `quietMs`: it has finished reacting to what
   * reached it (for example its copies' reports), so the next scripted prompt is its own turn.
   */
  const waitMemberQuiet = async (connection: Connection, agentRunId: string, label: string, quietMs = 8_000): Promise<void> => {
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    const ofMember = () => connection.messages.filter((message) => message.payload.agent_run_id === agentRunId);
    let seen = -1, since = Date.now();
    while (Date.now() < deadline) {
      const frames = ofMember();
      const status = [...frames].reverse().find((message) => message.type === "AGENT_STATUS")?.payload.status;
      if (frames.length !== seen) { seen = frames.length; since = Date.now(); }
      else if ((status === "idle" || status === undefined) && Date.now() - since >= quietMs) return;
      await wait(500);
    }
    throw new Error(`Timed out waiting for ${label} to go quiet`);
  };
  /** The results of a tool's calls whose arguments mention `argument` (the call that was asked for, not an earlier one). */
  const toolCallResultsWith = (conversation: ConversationEntry[], tool: string, argument: string): string[] =>
    conversation.filter((item) => item.kind === "tool_call" && String((item as Record_).toolName ?? "").endsWith(tool)
      && JSON.stringify((item as Record_).toolArgs ?? {}).includes(argument))
      .map((item) => JSON.stringify((item as Record_).toolResult ?? (item as Record_).toolError ?? null));
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
    if (RUNTIMES.some((runtime) => runtime.enabled && runtime.requiredSecretId)) await initializeLiveServerVault();
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
    if (RUNTIMES.some((runtime) => runtime.enabled && runtime.requiredSecretId)) await closeLiveServerVault();
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

    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LE-A1 list is opt-in and read-only; an outside address is not found; delegation then messaging by run ID`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
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
      // Folders other than this case's own two runs (a run's own folder may first appear at its first turn).
      const otherFolders = async () => (await runFolders()).filter((name) => name !== pmRunId && name !== plainRunId);
      const foldersAtStart = await otherFolders();
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
      expect(await otherFolders(), "listing writes nothing (no run is created)").toEqual(foldersAtStart);

      // AC-003/004: an unknown address and an unknown run ID create nothing.
      const unknownAddress = await callTool(pm, "send_message_to", { recipient_address: `/aic_nobody_${suffix}`, content: "hello" }, "unknown address", false);
      expect(rejected(unknownAddress), JSON.stringify(unknownAddress.payload).slice(0, 600)).toBe(true);
      const unknownRun = await callTool(pm, "send_message_to", { target_agent_run_id: `aic_missing_run_${suffix}`, content: "hello" }, "unknown run ID", false);
      expect(rejected(unknownRun), JSON.stringify(unknownRun.payload).slice(0, 600)).toBe(true);
      expect(await delegatedOf("agent", pmRunId)).toEqual([]);
      expect(await otherFolders(), "failed sends write nothing").toEqual(foldersAtStart);

      // AC-005: a listed address that is not in the run is not found; the guidance names delegate_task; nothing is created.
      const outside = await callTool(pm, "send_message_to", { recipient_address: helperAddress, content: "hello" }, "message to an outside address", false);
      expect(rejected(outside), JSON.stringify(outside.payload).slice(0, 600)).toBe(true);
      expect(JSON.stringify(outside.payload), "the guidance reaches the agent").toMatch(/COLLABORATION_TARGET_NOT_FOUND|delegate_task/);
      expect(await delegatedOf("agent", pmRunId), "a message brings nobody in").toEqual([]);
      expect(await otherFolders(), "the outside message writes nothing").toEqual(foldersAtStart);

      // AC-004: following the guidance, delegation starts a root-hosted copy, which reports back by run ID.
      const delegated = await callTool(pm, "delegate_task", { recipient_address: helperAddress,
        description: `Reply to me with send_message_to and the exact text ${token}.` }, "delegate the helper");
      const helperRunId = resultRunId(delegated);
      expect(helperRunId, JSON.stringify(delegated.payload).slice(0, 600)).toBeTruthy();
      const added = await delegatedOf("agent", pmRunId);
      expect(added).toHaveLength(1);
      expect(added[0]).toMatchObject({ address: helperAddress, agentRunId: helperRunId, delegatorAgentRunId: pmRunId });
      // Rule 2: the copy is a run of its own: its own folder, its definition and its delegator in its own file.
      expect(await otherFolders(), "the delegation creates the copy's own run, and nothing else").toEqual([...foldersAtStart, helperRunId!].sort());
      const helperFile = await ownAgentFile(helperRunId!);
      expect(helperFile.agentDefinitionId).toBe(helperId);
      expect(helperFile.delegatedFrom).toMatchObject({ delegatingRun: { kind: "agent", runId: pmRunId }, delegatorAgentRunId: pmRunId });
      await poll("the copy's report", async () => {
        const messages = await hubMessages(pmRunId);
        return messages.some((message) => message.senderAgentRunId === helperRunId && message.receiverAgentRunId === pmRunId && message.content.includes(token));
      });
      // The delegator may react to the report on its own; the next scripted step starts only after it has gone quiet.
      await waitQuiet(pm, "the delegator after the copy's report");

      // AC-006: the copy is messaged by its run ID.
      const again = await callTool(pm, "send_message_to", { target_agent_run_id: helperRunId, content: "Reply in one short sentence, without tools." }, "message by run ID");
      expect(resultRunId(again)).toBe(helperRunId);
      expect((await delegatedOf("agent", pmRunId)).map((copy) => field(copy, "agentRunId"))).toEqual([helperRunId]);
      // The address still resolves to nothing for messaging: a copy is reached by its run ID only.
      const byAddress = await callTool(pm, "send_message_to", { recipient_address: helperAddress, content: "By address?" }, "message by address after delegation", false);
      expect(rejected(byAddress), JSON.stringify(byAddress.payload).slice(0, 600)).toBe(true);

      // AC-002/003: a re-list gives identical addresses.
      const second = await listOnce("re-list");
      if (listed) expect(second).toEqual(first);
    }, 2_400_000);

    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LE-A2 three catalog copies with source, each one unit; restore after Stop`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
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
      const copies = await delegatedOf("agent", pmRunId);
      expect(copies).toHaveLength(3);
      // Rule 2 and TC-12: each copy is a Team run of its own, rooted at `/`; its own file names its definition, its coordinator
      // (`/lead`) and the run it was delegated from.
      const sourceOf = async (copy: Record_) => {
        const own = await ownTeamFile(str(copy, "teamRunId"));
        return { teamDefinitionId: field(own.rootTeam, "teamDefinitionId"), coordinatorAddress: field(own.rootTeam, "coordinatorAddress"), delegatingRunId: field(field(own.delegatedFrom, "delegatingRun"), "runId") };
      };
      const sources: unknown[] = [];
      for (const copy of copies) {
        expect(copy).toMatchObject({ address: squad.squadAddress, delegatorAgentRunId: pmRunId });
        const source = await sourceOf(copy);
        expect(source).toEqual({ teamDefinitionId: squad.squadId, coordinatorAddress: "/lead", delegatingRunId: pmRunId });
        sources.push(source);
      }
      const copyMembers = copies.map(memberRunIds);

      // UC-004 / SC-002: inside each copy, get_handoff_rules names that copy's own teammate.
      for (const copy of copies) {
        const results = await poll("copy lead called get_handoff_rules", async () => {
          const found = toolCallResults(await copyMemberConversation(str(copy, "teamRunId"), memberRunId(copy, "/lead")), "get_handoff_rules");
          return found.length ? found : null;
        });
        // TC-12: a copy's own handoffs name its teammate from its own root (`/mate`).
        expect(namesOwnMate(results[0]!), `a catalog copy follows its own handoffs: ${results[0]!.slice(0, 400)}`).toBe(true);
        if (instructionsVisible) expect(await ownInstructions(memberRunId(copy, "/lead")), "a catalog copy member gets its own team instruction").toContain(squad.squadInstruction);
      }

      let recorded: unknown = null;
      await poll("each copy: lead → own mate → lead → PM", async () => {
        const messages = await hubMessages(pmRunId);
        recorded = messages.map((message) => `${message.senderAgentRunId} → ${message.receiverAgentRunId}: ${message.content.slice(0, 60)}`);
        return copies.every((copy) => {
          const lead = memberRunId(copy, "/lead");
          const mate = memberRunId(copy, "/mate");
          return messages.some((message) => message.senderAgentRunId === lead && message.receiverAgentRunId === mate)
            && messages.some((message) => message.senderAgentRunId === mate && message.receiverAgentRunId === lead)
            && messages.some((message) => message.senderAgentRunId === lead && message.receiverAgentRunId === pmRunId && /DONE/.test(message.content));
        });
      }).catch(async (error: unknown) => {
        const leads = await Promise.all(copies.map(async (copy) => (await copyMemberConversation(str(copy, "teamRunId"), memberRunId(copy, "/lead")))
          .filter((item) => item.kind === "tool_call").map((item) => JSON.stringify(item).slice(0, 400))));
        throw new Error(`${error instanceof Error ? error.message : String(error)} Recorded: ${JSON.stringify(recorded)} Lead tool calls: ${JSON.stringify(leads)}`);
      });
      const all = (await hubMessages(pmRunId))
        .map((message) => ({ sender: message.senderAgentRunId, receiver: message.receiverAgentRunId, content: message.content }));
      expect(crossings(all, copyMembers, [pmRunId]), "no message crosses copies").toEqual([]);
      for (const copy of copies) {
        const lead = memberRunId(copy, "/lead");
        const toMate = all.findIndex((message) => message.sender === lead && message.receiver === memberRunId(copy, "/mate"));
        const report = all.findIndex((message) => message.sender === lead && message.receiver === pmRunId);
        expect(toMate > -1 && toMate < report, `copy ${lead} hands off to its mate before reporting`).toBe(true);
      }

      // Restore: the PM's Stop leaves its copies running and listed (REQ-001); copy #1 is stopped by its own Stop; a message on
      // its own stream (rule 2) restores it from its own file, with its own handoffs.
      const stopped = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: pmRunId });
      expect(stopped.terminateAgentRun.success, stopped.terminateAgentRun.message).toBe(true);
      const listedAfterStop = await delegatedOf("agent", pmRunId);
      expect(listedAfterStop.map(runIdOf).sort(), "the copies stay listed after the PM's Stop").toEqual(copies.map(runIdOf).sort());
      const firstTeamRunId = str(copies[0], "teamRunId");
      const copyStopped = await gql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: firstTeamRunId });
      expect(copyStopped.terminateAgentTeamRun.success, copyStopped.terminateAgentTeamRun.message).toBe(true);
      expect(await sourceOf(copies[0]!), "a stopped copy keeps its own source").toEqual(sources[0]);
      const firstLead = memberRunId(copies[0], "/lead");
      await wait(3_000);
      const own = await openCopyTeam(firstTeamRunId);
      own.send(firstLead, "Call get_handoff_rules exactly once now with these exact JSON arguments: {}. Do not call any other tool. Then reply with the single word WOKEN.");
      const woken = await poll("restored copy answered", async () => {
        const conversation = await copyMemberConversation(firstTeamRunId, firstLead);
        return conversation.some((item) => item.role !== "user" && item.kind !== "inter_agent_message" && /WOKEN/.test(item.content ?? "")) ? conversation : null;
      });
      expect(namesOwnMate(toolCallResults(woken, "get_handoff_rules").at(-1) ?? ""), "a restored catalog copy keeps its own handoffs").toBe(true);
    }, 2_400_000);

    it.runIf(runtime.enabled)(`${runtime.id ?? runtime.runtimeKind}: LE-A3 Agent root — a delegated Team copy's member delegates a top-level address (copy placed at the root) and its own teammate (refused); kept after Stop`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
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
      const delegatedSquad = await callTool(pm, "delegate_task", { recipient_address: squad.squadAddress,
        description: `Task code PA-${suffix}. Follow your handoff rules, then report DONE PA-${suffix} to me by my run ID.` }, "delegate the squad");
      expect(resultRunId(delegatedSquad)).toBeTruthy();
      const squadCopy = (await delegatedOf("agent", pmRunId))[0]!;
      const copyLead = memberRunId(squadCopy, "/lead");
      const squadTeamRunId = str(squadCopy, "teamRunId");
      // Rule 2: the copy's lead is reached on its own team's stream.
      const { send: sendTo } = await openCopyTeam(squadTeamRunId);
      await poll("the copy's lead reported", async () => {
        const messages = await hubMessages(pmRunId);
        return messages.some((message) => message.senderAgentRunId === copyLead && message.receiverAgentRunId === pmRunId) ? messages : null;
      });
      const delegatedBy = async (address: string) => flatDelegated(await delegatedOf("agent", pmRunId))
        .find((record) => record.delegatorAgentRunId === copyLead && record.address === address) ?? null;
      const leadResults = async () => toolCallResults(await copyMemberConversation(squadTeamRunId, copyLead), "delegate_task");
      // A top-level (catalog) address: the copy is listed in the PM's tree, its row under the copy lead that delegated it
      // (SR-084: a delegated row hangs under the agent that delegated it), with its delegator kept.
      const echoAddress = `/${segmentFor(echoName)}`;
      sendTo(copyLead, operatorPrompt("delegate_task", { recipient_address: echoAddress, description: "Reply in one short sentence." }));
      const echoCopy = await poll(`copy of ${echoAddress} recorded`, () => delegatedBy(echoAddress))
        .catch(async (error: unknown) => { throw new Error(`${error instanceof Error ? error.message : String(error)} Lead delegate_task results: ${JSON.stringify(await leadResults()).slice(0, 1_500)}`); });
      const placed = await placementOf("agent", pmRunId, String(echoCopy.agentRunId));
      expect(placed?.delegatorAgentRunId, "a copy member's catalog copy sits under that member in the PM's tree").toBe(copyLead);
      // Its own teammate: refused with guidance, nothing started (AC-002).
      const mateAddress = `${squad.squadAddress}/mate`;
      sendTo(copyLead, operatorPrompt("delegate_task", { recipient_address: mateAddress, description: "Reply with the single word CONFIRMED." }));
      // The result of the call to the teammate's address (a runtime may store the earlier call's result late).
      const refusal = await poll("the lead's refused teammate delegation", async () =>
        toolCallResultsWith(await copyMemberConversation(squadTeamRunId, copyLead), "delegate_task", mateAddress).at(-1) ?? null);
      expect(refusal, "the refusal reaches the agent (its code, or the guidance text on runtimes that show only the message)").toMatch(/COLLABORATION_SELF_TARGET_REJECTED|is in your own team/);
      expect(await delegatedBy(mateAddress), "no teammate copy is started").toBeNull();
      const stopped = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: pmRunId });
      expect(stopped.terminateAgentRun.success, stopped.terminateAgentRun.message).toBe(true);
      expect(await placementOf("agent", pmRunId, String(echoCopy.agentRunId)), "placement kept after Stop").toEqual(placed);
    }, 2_400_000);

    it.runIf(rootCases)(`${runtime.id ?? runtime.runtimeKind}: LE-T1 Team root — catalog copies stay apart with their own scope; a teammate is refused; catalog Agent copies get none; configured scope kept after Stop → reopen`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
      const model = runtime.pickModel(await modelsFor(runtime));
      const hint = runtime.toolHint ?? "";
      instructionsVisible = runtime.runtimeKind === "claude_agent_sdk";
      const suffix = randomUUID().slice(0, 6);
      const squad = await createSquad(suffix, hint);
      const operator = "You are a precise tool operator. Follow the user's instructions exactly, call only the tools the user names, "
        + `and keep every reply to one short sentence.${hint}`;
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

      // Two catalog copies of a listed team (AC-005 in a Team root): each is a Team run of its own (rule 2), listed in the
      // Team's tree under the coordinator that delegated it, and carries its own scope.
      const copyCodes = [`T1-${suffix}`, `T2-${suffix}`];
      const started: Record_[] = [];
      for (const code of copyCodes) {
        const known = await knownCopies("agent_team", teamRunId);
        sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: squad.squadAddress, description: `Task code ${code}. Follow your handoff rules, then report DONE ${code} to me by my run ID.` }));
        started.push(await newCopy("agent_team", teamRunId, known, (record) => record.address === squad.squadAddress && Boolean(str(record, "teamRunId")), `copy ${code} started`));
      }
      expect(started).toHaveLength(2);
      for (const copy of started) {
        expect(copy, JSON.stringify(copy).slice(0, 600)).toMatchObject({ delegatorAgentRunId: coordRunId });
        const own = await ownTeamFile(str(copy, "teamRunId"));
        expect(field(own.rootTeam, "teamDefinitionId"), "the copy's own file names its definition").toBe(squad.squadId);
        const lead = memberRunId(copy, "/lead");
        const rules = await poll("Team-root copy lead get_handoff_rules", async () =>
          toolCallResults(await copyMemberConversation(str(copy, "teamRunId"), lead), "get_handoff_rules")[0]);
        expect(namesOwnMate(rules), `a Team-root catalog copy follows its own handoffs: ${rules.slice(0, 400)}`).toBe(true);
        if (instructionsVisible) {
          const instructions = await ownInstructions(lead);
          expect(instructions, "a catalog copy member gets its own team instruction").toContain(squad.squadInstruction);
          expect(instructions, "…not the root team's").not.toContain(hostInstruction);
        }
      }

      // The two catalog copies follow their own handoffs inside themselves and report to the coordinator (each copy's messages
      // are in its own log; its report is in the coordinator's).
      const instances = started;
      const teamComms = async () => asComms(await treeMessages("agent_team", teamRunId, [coordRunId, workerRunId]));
      let recorded: unknown = null;
      await poll("two copies: lead → own mate → lead → coordinator", async () => {
        const messages = await teamComms();
        recorded = messages.map((message) => `${message.sender} → ${message.receiver}: ${message.content.slice(0, 50)}`);
        return instances.every((instance) => {
          const lead = memberRunId(instance, "/lead");
          const mate = memberRunId(instance, "/mate");
          return messages.some((message) => message.sender === lead && message.receiver === mate)
            && messages.some((message) => message.sender === mate && message.receiver === lead)
            && messages.some((message) => message.sender === lead && message.receiver === coordRunId && /DONE/.test(message.content));
        });
      }).catch((error: unknown) => { throw new Error(`${error instanceof Error ? error.message : String(error)} Recorded: ${JSON.stringify(recorded)}`); });
      const allComms = await teamComms();
      expect(crossings(allComms, instances.map(memberRunIds), [coordRunId]), "the two copies never cross").toEqual([]);
      for (const instance of instances) {
        const lead = memberRunId(instance, "/lead");
        const toMate = allComms.findIndex((message) => message.sender === lead && message.receiver === memberRunId(instance, "/mate"));
        const report = allComms.findIndex((message) => message.sender === lead && message.receiver === coordRunId);
        expect(toMate > -1 && toMate < report, `${lead} hands off to its mate before reporting`).toBe(true);
      }

      // AC-001 in a Team root: the coordinator cannot delegate its configured teammate; the refusal names the code and nothing starts.
      // (Asked once the copies' reports have reached it and it has gone quiet, so the request is its own turn.)
      await waitMemberQuiet(team, coordRunId, "the coordinator after its copies' reports");
      const knownBeforeRefusal = await knownCopies("agent_team", teamRunId);
      const refusedFrom = team.messages.length;
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: "/worker", description: "Reply OK." }));
      const refusedTeammate = await waitFor(team.messages, refusedFrom, (message) => isRefusedDelegation(message, coordRunId, "/worker"), "refused teammate delegation");
      expect(JSON.stringify(refusedTeammate.payload), "the teammate refusal reaches the agent").toMatch(/COLLABORATION_SELF_TARGET_REJECTED|is in your own team/);
      expect(sortedOf(await knownCopies("agent_team", teamRunId)), "the refusal starts nothing").toEqual(sortedOf(knownBeforeRefusal));

      // A catalog Agent copy (at root level, and delegated by a copy member) gets no handoffs and no team instruction.
      const echoTask = "Call get_handoff_rules exactly once with no arguments, then reply in one short sentence.";
      const echoAddress = `/${segmentFor(echoName)}`;
      const knownBeforeRootEcho = await knownCopies("agent_team", teamRunId);
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: echoAddress, description: echoTask }));
      const rootEcho = await newCopy("agent_team", teamRunId, knownBeforeRootEcho, (record) => record.address === echoAddress && record.delegatorAgentRunId === coordRunId, "root-level catalog Agent copy");
      const copyLead = memberRunId(started[0], "/lead");
      const copyTeamRunId = str(started[0], "teamRunId");
      // Rule 2: the copy's lead is reached on its own team's stream.
      const copyTeam = await openCopyTeam(copyTeamRunId);
      const knownBeforeCopyEcho = await knownCopies("agent_team", teamRunId);
      copyTeam.send(copyLead, operatorPrompt("delegate_task", { recipient_address: echoAddress, description: echoTask }));
      const copyEcho = await newCopy("agent_team", teamRunId, knownBeforeCopyEcho, (record) => record.address === echoAddress && record.delegatorAgentRunId === copyLead, "copy member delegates to a listed agent");
      expect(str(copyEcho, "delegatorAgentRunId"), "AC-006: a copy member delegates").toBe(copyLead);
      for (const [label, echo] of [["root-level", rootEcho], ["copy-member", copyEcho]] as const) {
        const echoRunId = str(echo, "agentRunId");
        expect((await ownAgentFile(echoRunId)).agentDefinitionId, `${label} catalog Agent copy's own file names its definition`).toBe(echoId);
        const rules = await poll(`${label} catalog Agent copy get_handoff_rules`, async () => toolCallResults(await agentConversation(echoRunId), "get_handoff_rules")[0])
          .catch(async (error: unknown) => {
            // What the copy did instead (its own conversation), for classification.
            const conversation = await agentConversation(echoRunId);
            const did = conversation.map((item) => item.kind === "tool_call" ? `tool ${String((item as Record_).toolName)}` : `${item.role ?? item.kind}: ${String(item.content ?? "").slice(0, 120)}`);
            throw new Error(`${error instanceof Error ? error.message : String(error)} The copy's own conversation: ${JSON.stringify(did).slice(0, 2_000)}`);
          });
        expect(rules, `${label} catalog Agent copy has no handoffs`).not.toMatch(/recipient_address/);
        if (instructionsVisible) {
          const instructions = await ownInstructions(echoRunId);
          expect(instructions, `${label} catalog Agent copy has no root team instruction`).not.toContain(hostInstruction);
          expect(instructions, `${label} catalog Agent copy has no squad instruction`).not.toContain(squad.squadInstruction);
        }
      }

      // AC-002 in a Team root: a copy member cannot delegate its own teammate; its catalog copy sits under it in the Team's tree.
      await waitMemberQuiet(copyTeam.connection, copyLead, "the copy lead after its delegation");
      const knownBeforeMate = await knownCopies("agent_team", teamRunId);
      const teammateFrom = copyTeam.connection.messages.length;
      copyTeam.send(copyLead, operatorPrompt("delegate_task", { recipient_address: "/mate", description: "Reply with the single word CONFIRMED." }));
      const refusedMate = await waitFor(copyTeam.connection.messages, teammateFrom, (message) => isRefusedDelegation(message, copyLead, "/mate"), "copy member's refused teammate delegation");
      expect(JSON.stringify(refusedMate.payload), "the copy member's teammate refusal reaches the agent").toMatch(/COLLABORATION_SELF_TARGET_REJECTED|is in your own team/);
      expect(sortedOf(await knownCopies("agent_team", teamRunId)), "the refusal starts nothing").toEqual(sortedOf(knownBeforeMate));
      const placedRoot = await placementOf("agent_team", teamRunId, str(rootEcho, "agentRunId"));
      const placedCopy = await placementOf("agent_team", teamRunId, str(copyEcho, "agentRunId"));
      expect(placedRoot?.delegatorAgentRunId, "a root-level catalog copy sits under the coordinator").toBe(coordRunId);
      expect(placedCopy?.delegatorAgentRunId, "a copy member's catalog copy sits under that member").toBe(copyLead);

      // AC-012 after Stop → reopen: the configured and catalog-copy scopes are restored. The Team's Stop leaves its copies
      // running (REQ-001); the copy is stopped by its own Stop, and each is reopened on its own stream.
      const stopped = await gql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId });
      expect(stopped.terminateAgentTeamRun.success, stopped.terminateAgentTeamRun.message).toBe(true);
      const copyStopped = await gql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: copyTeamRunId });
      expect(copyStopped.terminateAgentTeamRun.success, copyStopped.terminateAgentTeamRun.message).toBe(true);
      team.socket.close();
      copyTeam.connection.socket.close();
      await wait(3_000);
      team = await openSocket(`/ws/agent-team/${teamRunId}`, "TEAM_EXECUTION_VIEW_SNAPSHOT");
      expect(await rulesOf(team, sendTo, coordRunId, "reopened configured coord"), "configured handoffs after reopen").toContain("/worker");
      const reopenedCopy = await openCopyTeam(copyTeamRunId);
      expect(namesOwnMate(await rulesOf(reopenedCopy.connection, reopenedCopy.send, copyLead, "reopened catalog copy lead")), "catalog copy handoffs after reopen").toBe(true);
      expect(await placementOf("agent_team", teamRunId, str(copyEcho, "agentRunId")), "placement kept after reopen").toEqual(placedCopy);
    }, 2_400_000);

    it.runIf(rootCases)(`${runtime.id ?? runtime.runtimeKind}: LE-O1 Org root — a copy of a mounted Team stays inside the copy; configured, mounted and cross-placement handoffs kept (also after Stop → reopen); catalog copy scope; a mounted member's teammate is refused; an outside message is not found`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
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
      const knownBeforeCopy = await knownCopies("agent_org", orgRunId);
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: "/squad", description:
        `Call send_message_to exactly once with recipient_address "/squad/mate" and content "COPY-${suffix}". Then call send_message_to exactly once `
        + `with recipient_address "/coordinator" and content "REPORT-${suffix}". Do not call any other tool. Then reply DONE.` }));
      // SR-084: the copy is a row of the Org's tree (the Org's view carries its own parts only).
      const execution = await newCopy("agent_org", orgRunId, knownBeforeCopy, (record) => record.address === "/squad" && Boolean(str(record, "teamRunId")), "copy of the mounted squad");
      const copyLead = memberRunId(execution, "/lead");
      const copyMate = memberRunId(execution, "/mate");
      expect(copyLead && copyMate && copyLead !== mountedLead && copyMate !== mountedMate, JSON.stringify(execution).slice(0, 600)).toBe(true);
      void copyMate;
      // autobyteus-461 SR-081 (TC-12, A-6): "/squad/mate" is the name the copy was delegated to plus its own member, so the
      // copy lead is answered with the correction (its team is addressed from its own root), before step 2 could reach the
      // Org's mounted namesake. Read by rule 2: the copy lead's conversation through its own team.
      const copyTeamRunId = str(execution, "teamRunId");
      expect(copyTeamRunId, JSON.stringify(execution).slice(0, 600)).toBeTruthy();
      const correction = await poll("the copy lead's /squad/mate answered with the correction", async () =>
        toolCallResults(await copyMemberConversation(copyTeamRunId, copyLead), "send_message_to").find((result) => /no longer an address/.test(result)));
      expect(correction, "the correction names the address to use").toMatch(/\/mate|its own root/);
      await poll("copy lead → /coordinator (outside its team)", async () => (await participantMessages("agent_org", orgRunId, coordRunId))
        .some((message) => message.senderAgentRunId === copyLead && message.content.includes(`REPORT-${suffix}`)));
      const toMountedMate = (await participantMessages("agent_org", orgRunId, mountedMate)).filter((message) => message.content.includes(`COPY-${suffix}`));
      expect([...toMountedMate, ...comms(stream).filter((comm) => comm.receiver === mountedMate && comm.content.includes(`COPY-${suffix}`))], "nothing reaches the mounted mate").toEqual([]);

      // AC-005/007 in an Org: a catalog copy of a listed (not mounted) team follows its own handoffs with its own instruction.
      const catalogSquad = await createSquad(suffix, hint);
      const catalogCode = `OC-${suffix}`;
      const knownBeforeCatalog = await knownCopies("agent_org", orgRunId);
      sendTo(coordRunId, operatorPrompt("delegate_task", { recipient_address: catalogSquad.squadAddress, description: `Task code ${catalogCode}. Follow your handoff rules, then report DONE ${catalogCode} to me by my run ID.` }));
      const catalogCopy = await newCopy("agent_org", orgRunId, knownBeforeCatalog, (record) => record.address === catalogSquad.squadAddress, "Org catalog copy started");
      expect(field((await ownTeamFile(str(catalogCopy, "teamRunId"))).rootTeam, "teamDefinitionId"), "the copy's own file names its definition").toBe(catalogSquad.squadId);
      const catalogLead = memberRunId(catalogCopy, "/lead");
      const catalogMate = memberRunId(catalogCopy, "/mate");
      // Rule 2: the catalog copy's member is read through its own team; TC-12: its handoffs name `/mate`.
      const catalogTeamRunId = str(catalogCopy, "teamRunId");
      const catalogRules = await poll("Org catalog copy lead get_handoff_rules", async () =>
        toolCallResults(await copyMemberConversation(catalogTeamRunId, catalogLead), "get_handoff_rules")[0]);
      expect(namesOwnMate(catalogRules), `an Org catalog copy follows its own handoffs: ${catalogRules.slice(0, 400)}`).toBe(true);
      if (instructionsVisible) {
        const catalogInstructions = await ownInstructions(catalogLead);
        expect(catalogInstructions, "an Org catalog copy member gets its own team instruction").toContain(catalogSquad.squadInstruction);
        expect(catalogInstructions).not.toContain(orgInstruction);
      }
      await poll("Org catalog copy lead → its own mate", async () => (await participantMessages("agent_team", catalogTeamRunId, catalogLead))
        .some((message) => message.senderAgentRunId === catalogLead && message.receiverAgentRunId === catalogMate));
      await poll("Org catalog copy reports DONE", async () => (await participantMessages("agent_org", orgRunId, coordRunId))
        .some((message) => message.senderAgentRunId === catalogLead && /DONE/.test(message.content)));

      // AC-013 / REQ-012: a mounted member's copy of a top-level (catalog) address is listed in the Org's tree, its row under
      // that member (SR-084: a delegated row hangs under the agent that delegated it); its teammate is refused.
      const knownBeforeMounted = await knownCopies("agent_org", orgRunId);
      sendTo(mountedLead, operatorPrompt("delegate_task", { recipient_address: catalogSquad.squadAddress, description: `Task code OM-${suffix}. Follow your handoff rules, then report DONE OM-${suffix} to me by my run ID.` }));
      const mountedCatalogCopy = await newCopy("agent_org", orgRunId, knownBeforeMounted, (record) => record.delegatorAgentRunId === mountedLead, "mounted member's catalog copy");
      const catalogCopyRunId = str(mountedCatalogCopy, "teamRunId");
      const placedOrg = await placementOf("agent_org", orgRunId, catalogCopyRunId);
      expect(placedOrg?.delegatorAgentRunId, "a mounted member's catalog copy sits under that member").toBe(mountedLead);
      expect(str(mountedCatalogCopy, "delegatorAgentRunId"), "the delegator is kept").toBe(mountedLead);
      await poll("the top-level copy reports to the mounted lead", async () => (await participantMessages("agent_org", orgRunId, mountedLead))
        .some((message) => /DONE/.test(message.content) && memberRunIds(mountedCatalogCopy).includes(message.senderAgentRunId)));
      // The mounted member cannot delegate its teammate (asked once its copy's report has reached it and it has gone quiet).
      await waitMemberQuiet(stream, mountedLead, "the mounted lead after its copy's report");
      const teammateFrom = stream.messages.length;
      sendTo(mountedLead, operatorPrompt("delegate_task", { recipient_address: "/squad/mate", description: "Reply with the single word NOTED." }));
      const refusedMounted = await waitFor(stream.messages, teammateFrom, (message) => isRefusedDelegation(message, mountedLead, "/squad/mate"), "mounted member's refused teammate delegation");
      expect(JSON.stringify(refusedMounted.payload), "a mounted member cannot delegate its teammate").toMatch(/COLLABORATION_SELF_TARGET_REJECTED|is in your own team/);
      expect(sortedOf(await knownCopies("agent_org", orgRunId)), "the refusal starts nothing").toEqual(sortedOf([...knownBeforeMounted, runIdOf(mountedCatalogCopy)]));

      // AC-005 in an Org: a message to an outside address is not found; nothing is added.
      const outsideFrom = stream.messages.length;
      sendTo(coordRunId, operatorPrompt("send_message_to", { recipient_address: `/${segmentFor(helperName)}`, content: "hello" }));
      const outsideDone = await waitFor(stream.messages, outsideFrom, (message) => message.payload.agent_run_id === coordRunId && isToolDone(message, "send_message_to"), "outside message result");
      expect(rejected(outsideDone), JSON.stringify(outsideDone.payload).slice(0, 600)).toBe(true);
      expect(JSON.stringify(outsideDone.payload), "the guidance reaches the agent").toMatch(/COLLABORATION_TARGET_NOT_FOUND|delegate_task/);

      // AC-012 after Stop → reopen.
      const stopped = await gql<{ terminateAgentOrgRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId });
      expect(stopped.terminateAgentOrgRun.success, stopped.terminateAgentOrgRun.message).toBe(true);
      stream.socket.close();
      await wait(3_000);
      // Reopen as the app does: restore the stopped Org, then attach its stream.
      // The stopped run's view serves it from its stored file; the next message to one of its members on it restores the run (autobyteus-461 CR-461-008).
      stream = await openSocket(`/ws/agent-org/${orgRunId}`, "ROOT_EXECUTION_VIEW_SNAPSHOT");
      expect(await rulesOf(stream, sendTo, coordRunId, "reopened org coordinator"), "Org placement handoff after reopen").toContain("/squad");
      const reopenedMounted = await rulesOf(stream, sendTo, mountedLead, "reopened mounted lead");
      expect(reopenedMounted, "mounted team handoff after reopen").toContain("/squad/mate");
      expect(reopenedMounted, "cross-placement handoff after reopen").toContain("/coordinator");
      // Rule 2: the catalog copy's member is reached by its own team's stream (its own restore by member message).
      const catalogOwn = await openSocket(`/ws/agent-team/${catalogTeamRunId}`, "TEAM_EXECUTION_VIEW_SNAPSHOT");
      const sendToCatalog = (agentRunId: string, content: string) => sendE2eSendMessageCommand(catalogOwn.socket, { content, agent_run_id: agentRunId, context_file_paths: [], image_urls: [] });
      expect(namesOwnMate(await rulesOf(catalogOwn, sendToCatalog, catalogLead, "reopened Org catalog copy lead")), "Org catalog copy handoffs after reopen").toBe(true);
      catalogOwn.socket.close();
      expect(await placementOf("agent_org", orgRunId, catalogCopyRunId), "placement kept after restore").toEqual(placedOrg);
    }, 2_400_000);

    it.runIf(runtime.enabled && Boolean(staleModelFor(runtime.runtimeKind)))(`${runtime.id ?? runtime.runtimeKind}: LE-F1 SC-004 — a run whose model left the catalog: a catalog copy fails with the reason, an outside message is not found, and nothing is added`, async (ctx) => {
      if (runtime.requiredSecretId) await requireLiveCapability(ctx, runtime.requiredSecretId);
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
      const foldersBefore = await runFolders();
      const pmRunId = await createAgentRun(pmId, runtime.runtimeKind, staleModel);
      const pm = await openSocket(`/ws/agent/${pmRunId}`, "CONNECTED");
      const outside = await callTool(pm, "send_message_to", { recipient_address: `/${segmentFor(helperName)}`, content: "hello" }, "outside message on a stale model", false);
      const outsideText = JSON.stringify(outside.payload);
      expect(rejected(outside), outsideText.slice(0, 800)).toBe(true);
      expect(outsideText, "an outside message is not found whatever the model").toMatch(/COLLABORATION_TARGET_NOT_FOUND|delegate_task/);
      const delegated = await callTool(pm, "delegate_task", { recipient_address: squad.squadAddress, description: "ping" }, "stale catalog copy", false);
      const delegateText = JSON.stringify(delegated.payload);
      expect(resultRunId(delegated), delegateText.slice(0, 800)).toBeNull();
      expect(delegateText, "the delegation reason reaches the agent").toMatch(/can't be delegated to|not available/);
      expect(await delegatedOf("agent", pmRunId), "no copy started").toEqual([]);
      expect((await runFolders()).filter((name) => name !== pmRunId), "nothing written").toEqual(foldersBefore);
    }, 1_200_000);
  }
});
