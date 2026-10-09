import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY } from "../../../src/config/task-execution-idle-shutdown-setting.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT } from "../helpers/team-run-graphql-documents.js";
import {
  closeLiveRuntimeSecretVault,
  initializeLiveRuntimeSecretVaultFromEnvironment,
} from "../helpers/live-runtime-secret-vault-helpers.js";

/**
 * Live delegated-child resource lifecycle across AutoByteus, Codex and Claude:
 * `delegate_task` spawns a child and returns only its run ID; the child and the
 * delegator then talk through `send_message_to`; a quiet child is shut down after
 * the grace period and a same-root message by run ID restores it with its
 * conversation. Children are "resources, not tasks": no submit/review tools and
 * no task records or task events exist.
 */
const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const claudeBinaryReady = spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
const liveAllRuntimeDelegationEnabled =
  codexBinaryReady &&
  claudeBinaryReady &&
  process.env.RUN_LMSTUDIO_E2E === "1" &&
  process.env.RUN_CODEX_E2E === "1" &&
  process.env.RUN_CLAUDE_E2E === "1";
const describeLive = liveAllRuntimeDelegationEnabled ? describe : describe.skip;

/** The shortest supported grace period, so each shutdown is observable within about a minute. */
const GRACE_MS = 60_000;
/** Allowance for status-event delivery latency when checking "not before the grace period". */
const GRACE_OBSERVATION_TOLERANCE_MS = 2_000;
const SHUTDOWN_TIMEOUT_MS = GRACE_MS + 90_000;
const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen3.6-35b-a3b";
const CODEX_SEND_MESSAGE_TOOL = "mcp__autobyteus_agent_tools__send_message_to";
const originalCodexApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
const originalGraceSetting = process.env[TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY];

type WsMessage = { type: string; payload: Record<string, unknown>; receivedAt: number };
type WorkerRuntime = "auto" | "codex" | "claude";
type Connection = { socket: WebSocket; messages: WsMessage[] };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
    if (typeof parsed.type !== "string") return null;
    return { type: parsed.type, payload: asRecord(parsed.payload) ?? {}, receivedAt: Date.now() };
  } catch {
    return null;
  }
};

const preview = (messages: WsMessage[]) => messages.slice(-30)
  .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 240)}`).join(" | ");

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 240_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) return match;
    await wait(250);
  }
  throw new Error(`Timed out waiting for '${label}'. preview='${preview(messages)}'`);
};

const toolName = (payload: Record<string, unknown>): string => {
  const raw = typeof payload.tool_name === "string"
    ? payload.tool_name
    : typeof asRecord(payload.metadata)?.tool_name === "string" ? String(asRecord(payload.metadata)!.tool_name) : "";
  return raw.toLowerCase().split("__").at(-1) ?? raw.toLowerCase();
};

const invocationId = (payload: Record<string, unknown>): string | null => {
  for (const candidate of [payload.invocation_id, payload.tool_invocation_id, payload.id]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
};

/** Structured tool result across native (object or JSON string) and MCP (`structuredContent` / text) shapes. */
const toolResult = (payload: Record<string, unknown>): Record<string, unknown> | null => {
  if (typeof payload.result === "string") {
    try { return asRecord(JSON.parse(payload.result)); } catch { return null; }
  }
  const result = asRecord(payload.result);
  if (!result) return null;
  const structured = asRecord(result.structuredContent);
  if (structured) return structured;
  for (const item of Array.isArray(result.content) ? result.content : []) {
    const text = asRecord(item)?.text;
    if (typeof text !== "string") continue;
    try {
      const parsed = asRecord(JSON.parse(text));
      if (parsed) return parsed;
    } catch {
      // Keep scanning remaining content items.
    }
  }
  return "delegated" in result || "accepted" in result ? result : null;
};

const isStatus = (message: WsMessage, agentRunId: string, status: string) =>
  message.type === "AGENT_STATUS" && message.payload.agent_run_id === agentRunId && message.payload.status === status;

const isCommunication = (message: WsMessage, input: { sender: string; receiver: string; contains: string }) => {
  if (message.type !== "TEAM_COMMUNICATION_MESSAGE") return false;
  const projected = asRecord(message.payload.message);
  return projected?.sender_agent_run_id === input.sender &&
    projected.receiver_agent_run_id === input.receiver &&
    typeof projected.content === "string" &&
    projected.content.includes(input.contains);
};

const pickLmStudioModel = (models: string[]): string | null => {
  const exact = process.env.LMSTUDIO_MODEL_ID?.trim();
  if (exact && models.includes(exact)) return exact;
  const fragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL?.trim() || DEFAULT_LMSTUDIO_TEXT_MODEL;
  return models.find((model) => model.includes(fragment)) ?? models.find((model) => model.toLowerCase().includes("qwen")) ?? null;
};
const pickCodexModel = (models: string[]): string | null => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && models.includes(override)) return override;
  return ["gpt-5.4-mini", "gpt-5.5", "gpt-5.3-codex", "gpt-5.2-codex"].find((model) => models.includes(model))
    ?? models.find((model) => model.toLowerCase().includes("codex")) ?? null;
};
const pickClaudeModel = (models: string[]): string | null => {
  const override = process.env.CLAUDE_E2E_TOOL_MODEL?.trim();
  if (override && models.includes(override)) return override;
  return ["haiku", "sonnet"].find((model) => models.includes(model)) ?? models[0] ?? null;
};

const RUNTIME_KIND: Record<WorkerRuntime, RuntimeKind> = {
  auto: RuntimeKind.AUTOBYTEUS,
  codex: RuntimeKind.CODEX_APP_SERVER,
  claude: RuntimeKind.CLAUDE_AGENT_SDK,
};

/**
 * The delegating agent only needs to make exact tool calls; Claude does that reliably.
 * (A local reasoning model as coordinator can stream reasoning indefinitely.) AutoByteus, Codex
 * and Claude are all exercised as delegated children, where restore behavior differs per runtime.
 */
const COORDINATOR_RUNTIME: WorkerRuntime = "claude";

const COORDINATOR_INSTRUCTIONS = [
  "You are the coordinator in a live delegation lifecycle test.",
  "1. When the user asks you to call a tool with exact JSON arguments, call exactly that tool exactly once with exactly those arguments, then reply with the single word DONE.",
  "2. When you receive a message from another agent, do not call any tool; reply with the single word NOTED.",
  "3. Never call a tool unless the current user message gives exact JSON arguments for it. Do not explore the environment.",
].join("\n");

const workerInstructions = (runtime: WorkerRuntime, extraToolRule = "") => [
  "You are a delegated worker in a live delegation lifecycle test.",
  "1. Follow the instructions in each message you receive exactly and immediately.",
  "2. When a message asks you to call send_message_to with exact JSON arguments or exact values, call send_message_to exactly once with them.",
  runtime === "codex"
    ? `3. For you, send_message_to means the Agent Tools MCP tool ${CODEX_SEND_MESSAGE_TOOL}; never use Codex's native collaboration tools.`
    : "3. send_message_to is your collaboration tool.",
  `4. Do not explore the environment or run diagnostics.${extraToolRule}`,
  "5. Keep text replies to one word.",
].join("\n");

describeLive("Live delegated-child resource lifecycle across AutoByteus, Codex and Claude", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  let runtimeServerApp: FastifyInstance | null = null;
  let runtimeServerUrl: URL | null = null;
  const models = new Map<WorkerRuntime, string>();
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();
  const createdOrgs: Array<{ orgRunId: string; orgDefinitionId: string }> = [];
  const openSockets = new Set<WebSocket>();

  beforeAll(async () => {
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    process.env[TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY] = String(GRACE_MS);
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "delegated-child-lifecycle-e2e-appdata-"));
    await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    graphql = (await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }))).graphql as typeof graphqlFn;
    const started = await startStudioE2eRuntimeServer();
    runtimeServerApp = started.fastify;
    runtimeServerUrl = started.mainUrl;
    schema = await buildGraphqlSchema();

    const lmStudio = await execGraphql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
      `mutation EnsureLmStudio($providerId: String!, $runtimeKind: String) {
        ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
      }`,
      { providerId: "LMSTUDIO", runtimeKind: RuntimeKind.AUTOBYTEUS },
    );
    models.set("auto", requireModel("auto", lmStudio.ensureProviderModelCatalog.llmModels.map((model) => model.modelIdentifier), pickLmStudioModel));
    models.set("codex", requireModel("codex", await fetchModels(RuntimeKind.CODEX_APP_SERVER), pickCodexModel));
    models.set("claude", requireModel("claude", await fetchModels(RuntimeKind.CLAUDE_AGENT_SDK), pickClaudeModel));
  }, 240_000);

  afterAll(async () => {
    if (typeof originalCodexApprovalPolicy === "string") process.env.CODEX_APP_SERVER_APPROVAL_POLICY = originalCodexApprovalPolicy;
    else delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    if (typeof originalGraceSetting === "string") process.env[TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY] = originalGraceSetting;
    else delete process.env[TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY];
    if (runtimeServerApp) await runtimeServerApp.close();
    runtimeServerApp = null;
    await closeLiveRuntimeSecretVault();
    for (const root of createdWorkspaceRoots) await rm(root, { recursive: true, force: true });
    if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
  }, 180_000);

  afterEach(async () => {
    for (const socket of openSockets) socket.close();
    openSockets.clear();
    const bestEffort = async (query: string, variables: Record<string, unknown>) => {
      await graphql({ schema, source: query, variableValues: variables }).catch(() => undefined);
    };
    for (const { orgRunId, orgDefinitionId } of createdOrgs.splice(0)) {
      await bestEffort(`mutation T($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }`, { id: orgRunId });
      await bestEffort(`mutation D($id: String!) { deleteAgentOrgDefinition(id: $id) }`, { id: orgDefinitionId });
    }
    for (const teamRunId of createdTeamRunIds) {
      await bestEffort(`mutation T($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }`, { teamRunId });
    }
    createdTeamRunIds.clear();
    for (const id of createdTeamDefinitionIds) {
      await bestEffort(`mutation D($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }`, { id });
    }
    createdTeamDefinitionIds.clear();
    for (const id of createdAgentDefinitionIds) {
      await bestEffort(`mutation D($id: String!) { deleteAgentDefinition(id: $id) { success } }`, { id });
    }
    createdAgentDefinitionIds.clear();
    await getCodexAppServerClientManager().close();
    await wait(750);
  }, 240_000);

  async function execGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  }

  async function fetchModels(runtimeKind: RuntimeKind): Promise<string[]> {
    const result = await execGraphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      `query Models($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }`,
      { runtimeKind },
    );
    return result.providerModelCatalogSnapshots.flatMap((provider) => provider.llmModels.map((model) => model.modelIdentifier)).filter(Boolean);
  }

  function requireModel(runtime: WorkerRuntime, available: string[], pick: (models: string[]) => string | null): string {
    const selected = pick(available);
    if (!selected) throw new Error(`No ${runtime} model available. Models: ${available.join(", ")}`);
    return selected;
  }

  const createAgentDefinition = async (input: { name: string; instructions: string; toolNames: string[] }) => {
    const result = await execGraphql<{ createAgentDefinition: { id: string } }>(
      `mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }`,
      { input: { ...input, description: `Live delegation lifecycle ${input.name}.`, role: "assistant", category: "runtime-e2e" } },
    );
    createdAgentDefinitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };

  type MemberSpec = {
    name: string;
    runtime: WorkerRuntime;
    toolNames: string[];
    instructions: string;
    autoExecuteTools?: boolean;
  };
  /** Team definitions are flat: Agent members only (task Teams exist only under Agent Org roots). */
  type TeamSpec = { name: string; coordinator: string; members: MemberSpec[] };

  const memberConfig = (address: string, definitionId: string, member: MemberSpec, workspaceRootPath: string) => ({
    memberAddress: address,
    agentDefinitionId: definitionId,
    llmModelIdentifier: models.get(member.runtime),
    autoExecuteTools: member.autoExecuteTools ?? true,
    runtimeKind: RUNTIME_KIND[member.runtime],
    workspaceRootPath,
    ...(member.runtime === "auto" ? { llmConfig: { temperature: 0 } } : {}),
    ...(member.runtime === "codex" ? { llmConfig: { reasoning_effort: "medium" } } : {}),
  });

  /** Creates the member and team definitions and returns the team definition ID plus its run configs. */
  const defineTeam = async (spec: TeamSpec, unique: string, workspaceRootPath: string) => {
    const memberConfigs: Array<Record<string, unknown>> = [];
    const nodes: Array<Record<string, unknown>> = [];
    for (const member of spec.members) {
      const definitionId = await createAgentDefinition({
        name: `${spec.name}-${member.name}-${unique}`,
        instructions: member.instructions,
        toolNames: member.toolNames,
      });
      nodes.push({ memberName: member.name, ref: definitionId, refScope: "SHARED" });
      memberConfigs.push(memberConfig(`/${member.name}`, definitionId, member, workspaceRootPath));
    }
    const result = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
      `mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
      { input: {
        name: `${spec.name}-${unique}`,
        description: `Live delegation lifecycle team ${spec.name}.`,
        instructions: "Members follow their own instructions exactly.",
        coordinatorMemberName: spec.coordinator,
        nodes,
      } },
    );
    createdTeamDefinitionIds.add(result.createAgentTeamDefinition.id);
    const coordinator = spec.members.find((member) => member.name === spec.coordinator)!;
    const teamConfigs = [{
      teamAddress: "/",
      llmModelIdentifier: models.get(coordinator.runtime),
      autoExecuteTools: true,
      runtimeKind: RUNTIME_KIND[coordinator.runtime],
      workspaceRootPath,
    }];
    return { teamDefinitionId: result.createAgentTeamDefinition.id, memberConfigs, teamConfigs };
  };

  const expectedMemberAddresses = (spec: TeamSpec): string[] => spec.members.map((member) => `/${member.name}`);

  const openTeamSocket = async (teamRunId: string): Promise<Connection> => {
    const socket = new WebSocket(`ws://${runtimeServerUrl!.hostname}:${runtimeServerUrl!.port}/ws/agent-team/${teamRunId}`);
    openSockets.add(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const message = parseWsMessage(raw);
      if (message) messages.push(message);
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out opening team websocket")), 15_000);
      socket.once("open", () => { clearTimeout(timer); resolve(); });
      socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    });
    await waitForMessageAfter(messages, 0, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { socket, messages };
  };

  const startTeam = async (spec: TeamSpec) => {
    const unique = randomUUID().slice(0, 8);
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "delegated-child-lifecycle-ws-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const defined = await defineTeam(spec, unique, workspaceRootPath);
    const created = await execGraphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      `mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }`,
      { input: { teamDefinitionId: defined.teamDefinitionId, teamConfigs: defined.teamConfigs, memberConfigs: defined.memberConfigs } },
    );
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    createdTeamRunIds.add(teamRunId);
    const resume = await execGraphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId },
    );
    const runIdByAddress = new Map(flattenE2eConfiguredAgentExecutions(resume.getTeamRunResumeConfig.executionTree)
      .map((member) => [member.memberAddress, member.agentRunId]));
    expect([...runIdByAddress.keys()].sort()).toEqual(expectedMemberAddresses(spec).sort());
    return { teamRunId, runIdByAddress, connection: await openTeamSocket(teamRunId), unique };
  };

  const checkpointHasOpenWork = async (teamRunId: string) => (await execGraphql<{
    getTeamRunExecutionCheckpoint: { hasOpenExecutionWork: boolean };
  }>(`query C($teamRunId: String!) { getTeamRunExecutionCheckpoint(teamRunId: $teamRunId) { hasOpenExecutionWork } }`, { teamRunId }))
    .getTeamRunExecutionCheckpoint.hasOpenExecutionWork;

  /** Asks an agent to make exactly one tool call and returns that call's succeeded event. */
  const callToolVia = async (
    connection: Connection,
    agentRunId: string,
    tool: "delegate_task" | "send_message_to",
    args: Record<string, unknown>,
    label: string,
    options: { expectRejection?: boolean } = {},
  ): Promise<{ result: Record<string, unknown> | null; startIndex: number }> => {
    const startIndex = connection.messages.length;
    sendE2eSendMessageCommand(connection.socket, {
      agent_run_id: agentRunId,
      content: `Call ${tool} exactly once now with these exact JSON arguments: ${JSON.stringify(args)}. Do not call any other tool.`,
    });
    const finished = await waitForMessageAfter(connection.messages, startIndex, (message) =>
      ["TOOL_EXECUTION_SUCCEEDED", "TOOL_EXECUTION_FAILED"].includes(message.type) &&
      message.payload.agent_run_id === agentRunId && toolName(message.payload) === tool,
    `${label} ${tool} result`, 300_000);
    if (finished.type === "TOOL_EXECUTION_FAILED" && options.expectRejection) {
      // A rejected send_message_to reaches MCP runtimes as an error result carrying the same JSON payload.
      return { result: asRecord(JSON.parse(String(finished.payload.error))), startIndex };
    }
    expect(finished.type, `${label}: ${JSON.stringify(finished.payload).slice(0, 600)}`).toBe("TOOL_EXECUTION_SUCCEEDED");
    return { result: toolResult(finished.payload), startIndex };
  };

  const waitForAgentStatus = (connection: Connection, startIndex: number, agentRunId: string, status: string, label: string, timeoutMs?: number) =>
    waitForMessageAfter(connection.messages, startIndex, (message) => isStatus(message, agentRunId, status), label, timeoutMs);

  const statusTimeline = (connection: Connection, startIndex: number, agentRunId: string) =>
    connection.messages.slice(startIndex).filter((message) => message.type === "AGENT_STATUS" && message.payload.agent_run_id === agentRunId);

  /**
   * Start of the quiet streak that ended in `offline`: the first idle/error status after the last
   * running/initializing status. Every later quiet status only re-arms the timer (a later deadline),
   * so the shutdown can never legitimately happen before this moment plus the grace period.
   */
  const quietStreakStartBefore = (timeline: WsMessage[], offline: WsMessage): number => {
    const beforeOffline = timeline.slice(0, timeline.indexOf(offline));
    const lastBusy = beforeOffline.map((message) => String(message.payload.status))
      .findLastIndex((status) => status === "running" || status === "initializing");
    const streak = beforeOffline.slice(lastBusy + 1).filter((message) => ["idle", "error"].includes(String(message.payload.status)));
    expect(streak.length, "no quiet status before the shutdown").toBeGreaterThan(0);
    return streak[0]!.receivedAt;
  };

  const expectShutdownAfterGrace = async (connection: Connection, quietIndex: number, agentRunId: string, label: string) => {
    const offline = await waitForAgentStatus(connection, quietIndex, agentRunId, "offline", `${label} idle shutdown`, SHUTDOWN_TIMEOUT_MS);
    const timeline = statusTimeline(connection, quietIndex, agentRunId);
    const streakStart = quietStreakStartBefore(timeline, offline);
    const observedGraceMs = offline.receivedAt - streakStart;
    const trace = timeline.map((message) => `${String(message.payload.status)}@${message.receivedAt - streakStart}`).join(",");
    console.log(`[grace] ${label} ${agentRunId}: offline ${observedGraceMs} ms after quiet streak start; statuses ${trace}`);
    expect(observedGraceMs, `${label} shut down ${observedGraceMs} ms after its quiet streak began (${trace})`)
      .toBeGreaterThanOrEqual(GRACE_MS - GRACE_OBSERVATION_TOLERANCE_MS);
    return { offline, observedGraceMs };
  };

  const expectNoRetiredTaskSurface = (connection: Connection) => {
    const retired = connection.messages.filter((message) =>
      message.type === "TASK_DELEGATION_EVENT" ||
      (/TOOL_/.test(message.type) && ["submit_task_result", "review_task_result"].includes(toolName(message.payload))));
    expect(retired).toEqual([]);
  };

  const readRootTree = async (teamRunId: string) => {
    const rootDir = new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
      .getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] });
    return {
      rootDir,
      tree: JSON.parse(await readFile(getTeamRunExecutionTreePath(rootDir), "utf8")) as Record<string, any>,
      files: await readdir(rootDir),
    };
  };

  it("LIVE-001/LIVE-004: spawns a child per runtime, shuts quiet children down after the grace period, rejects a cross-root wake, and wakes them with their conversation", async () => {
    const runtimes: WorkerRuntime[] = ["auto", "codex", "claude"];
    const root = await startTeam({
      name: "delegation-root",
      coordinator: "coordinator",
      members: [
        { name: "coordinator", runtime: COORDINATOR_RUNTIME, toolNames: ["delegate_task", "send_message_to"], instructions: COORDINATOR_INSTRUCTIONS },
        ...runtimes.map((runtime) => ({
          name: `${runtime}_worker`, runtime, toolNames: ["send_message_to"], instructions: workerInstructions(runtime),
        })),
      ],
    });
    const { connection, teamRunId } = root;
    const coordinatorRunId = root.runIdByAddress.get("/coordinator")!;
    const children = new Map<WorkerRuntime, { runId: string; recall: string; quietIndex: number }>();

    // AC-001 / AC-003: spawn one child per runtime; the result is only the new run ID.
    for (const runtime of runtimes) {
      const recall = `RECALL_${runtime.toUpperCase()}_${root.unique}`;
      const ack = `ACK_${runtime.toUpperCase()}_${root.unique}`;
      const description =
        `Your secret recall code is ${recall}. Remember it for later messages and do not send it now. ` +
        `Now call send_message_to exactly once with these exact JSON arguments: ${JSON.stringify({ recipient_address: "/coordinator", content: ack })}. ` +
        "Then reply with the single word DONE.";
      const { result, startIndex } = await callToolVia(connection, coordinatorRunId, "delegate_task", {
        recipient_address: `/${runtime}_worker`, description,
      }, `${runtime} spawn`);
      // A spawn result names the Agent copy (plus task_id when the delegation created a Task); nothing else.
      expect(Object.keys(result ?? {}).filter((key) => key !== "task_id")).toEqual(["delegated", "target_kind", "target_agent_run_id"]);
      expect(result!.target_kind).toBe("agent");
      const childRunId = String(result!.target_agent_run_id);
      expect(childRunId).not.toBe(root.runIdByAddress.get(`/${runtime}_worker`));

      const started = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TASK_EXECUTION_STARTED" && asRecord(message.payload.execution)?.agent_run_id === childRunId,
      `${runtime} TASK_EXECUTION_STARTED`, 60_000);
      expect(started.payload).toMatchObject({
        parent_team_run_id: teamRunId,
        execution: { kind: "task_agent", address: `/${runtime}_worker`, agent_run_id: childRunId, delegator_agent_run_id: coordinatorRunId },
      });
      expect(asRecord(started.payload.execution)).not.toHaveProperty("settled_at");

      const reply = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        isCommunication(message, { sender: childRunId, receiver: coordinatorRunId, contains: ack }),
      `${runtime} child reply to its delegator`, 300_000);
      const replyIndex = connection.messages.indexOf(reply);
      await waitForAgentStatus(connection, replyIndex, childRunId, "idle", `${runtime} child quiet after replying`, 300_000);
      // The delegator handles the reply (ordinary message) and goes quiet before the next spawn.
      await waitForAgentStatus(connection, replyIndex, coordinatorRunId, "idle", `coordinator quiet after ${runtime} reply`, 300_000);
      children.set(runtime, { runId: childRunId, recall, quietIndex: replyIndex });
    }

    // AC-015: every execution is quiet, so the root reports no open execution work.
    expect(await checkpointHasOpenWork(teamRunId)).toBe(false);
    // AC-003: one tree carries the children and their delegator; no task-records file is written.
    const persisted = await readRootTree(teamRunId);
    expect(persisted.tree).not.toHaveProperty("schemaVersion");
    for (const child of children.values()) {
      expect(persisted.tree.rootTeam.taskExecutions).toContainEqual(expect.objectContaining({
        agentRunId: child.runId, delegatorAgentRunId: coordinatorRunId,
      }));
    }
    expect(persisted.files.filter((file) => /task.*record/i.test(file))).toEqual([]);

    // A second root is prepared while the grace period runs, for the cross-root probe.
    const outsider = await startTeam({
      name: "outsider-root",
      coordinator: "outsider",
      members: [{ name: "outsider", runtime: COORDINATOR_RUNTIME, toolNames: ["send_message_to"], instructions: COORDINATOR_INSTRUCTIONS }],
    });

    // AC-004 / QR-001: each quiet child is shut down, and not before the grace period.
    const graceEvidence: Record<string, number> = {};
    for (const [runtime, child] of children) {
      graceEvidence[runtime] = (await expectShutdownAfterGrace(connection, child.quietIndex, child.runId, `${runtime} child`)).observedGraceMs;
    }
    console.log("[LIVE-001 observed grace ms]", JSON.stringify(graceEvidence));
    expect(await checkpointHasOpenWork(teamRunId)).toBe(false);
    const afterShutdown = await readRootTree(teamRunId);
    expect(afterShutdown.tree.rootTeam.taskExecutions).toHaveLength(children.size);

    // LIVE-004 / AC-012: a sender in another root cannot reach, or wake, a shut-down child.
    const autoChild = children.get("auto")!;
    const crossRootIndex = connection.messages.length;
    const crossRoot = await callToolVia(outsider.connection, outsider.runIdByAddress.get("/outsider")!, "send_message_to", {
      target_agent_run_id: autoChild.runId, content: `Cross-root probe ${root.unique}`,
    }, "cross-root", { expectRejection: true });
    expect(crossRoot.result).toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE" });
    await wait(5_000);
    expect(connection.messages.slice(crossRootIndex).filter((message) =>
      message.payload.agent_run_id === autoChild.runId && message.type === "AGENT_STATUS" && message.payload.status !== "offline")).toEqual([]);

    // AC-007: a same-root message by run ID restores each child with its conversation, and it replies.
    for (const [runtime, child] of children) {
      const followUp = "Follow-up from your delegator: call send_message_to exactly once with recipient_address \"/coordinator\" " +
        "and content made of the word RECALLED, one space, and the secret recall code from your original delegated task. " +
        "Then reply with the single word DONE.";
      const { result, startIndex } = await callToolVia(connection, coordinatorRunId, "send_message_to", {
        target_agent_run_id: child.runId, content: followUp,
      }, `${runtime} wake`);
      expect(result).toMatchObject({ accepted: true, target_agent_run_id: child.runId });
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        isCommunication(message, { sender: child.runId, receiver: coordinatorRunId, contains: child.recall }),
      `${runtime} restored child recalls its original packet`, 300_000);
      await waitForAgentStatus(connection, startIndex, child.runId, "idle", `${runtime} restored child quiet`, 300_000);
    }

    // BEH-012: only the spawn packet is a task notification; follow-ups are ordinary messages.
    for (const child of children.values()) {
      expect(connection.messages.filter((message) =>
        message.type === "SYSTEM_TASK_NOTIFICATION" && message.payload.agent_run_id === child.runId).length).toBeLessThanOrEqual(1);
    }
    expectNoRetiredTaskSurface(connection);
    expectNoRetiredTaskSurface(outsider.connection);
  }, 1_800_000);

  it("LIVE-002: never shuts down a child that is waiting for tool approval past the grace period", async () => {
    const runtimes: WorkerRuntime[] = ["auto", "codex", "claude"];
    const root = await startTeam({
      name: "approval-root",
      coordinator: "coordinator",
      members: [
        { name: "coordinator", runtime: COORDINATOR_RUNTIME, toolNames: ["delegate_task"], instructions: COORDINATOR_INSTRUCTIONS },
        ...runtimes.map((runtime) => ({
          name: `${runtime}_gate`, runtime, toolNames: ["write_file"], autoExecuteTools: false,
          instructions: workerInstructions(runtime, " When asked to create a file, use the write_file tool exactly once."),
        })),
      ],
    });
    const { connection, teamRunId } = root;
    const coordinatorRunId = root.runIdByAddress.get("/coordinator")!;
    const gates = new Map<WorkerRuntime, { runId: string; approvalIndex: number; invocation: string }>();
    for (const runtime of runtimes) {
      const fileName = `approval-${runtime}-${root.unique}.txt`;
      const { result, startIndex } = await callToolVia(connection, coordinatorRunId, "delegate_task", {
        recipient_address: `/${runtime}_gate`,
        description: `Create the file ${fileName} with exactly this content: GATE_${root.unique}. ` +
          "Use the write_file tool exactly once with a relative path, perform the real tool call, and do not answer with plain text.",
      }, `${runtime} gate spawn`);
      const childRunId = String(result!.target_agent_run_id);
      const approval = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_run_id === childRunId,
      `${runtime} child TOOL_APPROVAL_REQUESTED`, 300_000);
      gates.set(runtime, { runId: childRunId, approvalIndex: connection.messages.indexOf(approval), invocation: invocationId(approval.payload)! });
    }

    // AC-006: hold every approval past the grace period; no child is shut down and the root keeps open work.
    const heldFrom = Date.now();
    await wait(GRACE_MS + 30_000);
    for (const [runtime, gate] of gates) {
      const offline = connection.messages.slice(gate.approvalIndex).filter((message) => isStatus(message, gate.runId, "offline"));
      expect(offline, `${runtime} child was shut down while awaiting approval`).toEqual([]);
    }
    expect(await checkpointHasOpenWork(teamRunId)).toBe(true);
    console.log("[LIVE-002 approvals held ms]", Date.now() - heldFrom);

    // After approval the child finishes, goes quiet, and the normal grace shutdown applies again.
    const resumedIndex = connection.messages.length;
    for (const gate of gates.values()) {
      connection.socket.send(JSON.stringify({
        type: "APPROVE_TOOL",
        payload: { agent_run_id: gate.runId, invocation_id: gate.invocation, reason: "approved by delegated-child lifecycle e2e" },
      }));
    }
    // A runtime may follow up with another tool call (for example the collaboration tool get_handoff_rules);
    // under autoExecuteTools=false that waits for approval too. Deny any such extra request so the child can go quiet.
    const handled = new Set([...gates.values()].map((gate) => gate.invocation));
    const gateRunIds = new Set([...gates.values()].map((gate) => gate.runId));
    let denying = true;
    const denyExtraApprovals = (async () => {
      while (denying) {
        for (const message of connection.messages.slice(resumedIndex)) {
          const id = message.type === "TOOL_APPROVAL_REQUESTED" && gateRunIds.has(String(message.payload.agent_run_id)) ? invocationId(message.payload) : null;
          if (!id || handled.has(id)) continue;
          handled.add(id);
          connection.socket.send(JSON.stringify({
            type: "DENY_TOOL",
            payload: { agent_run_id: message.payload.agent_run_id, invocation_id: id, reason: "Not needed; reply with one word and stop." },
          }));
        }
        await wait(250);
      }
    })();
    try {
      for (const [runtime, gate] of gates) {
        await waitForAgentStatus(connection, resumedIndex, gate.runId, "idle", `${runtime} child quiet after approval`, 300_000);
      }
    } finally {
      denying = false;
      await denyExtraApprovals;
    }
    for (const [runtime, gate] of gates) {
      await expectShutdownAfterGrace(connection, resumedIndex, gate.runId, `${runtime} approved child`);
    }
    expect(await checkpointHasOpenWork(teamRunId)).toBe(false);
    expectNoRetiredTaskSurface(connection);
  }, 1_200_000);

  /** Normalizes an AgentOrg collaboration-stream frame into the Team-stream shape the assertions use. */
  const normalizeOrgFrame = (raw: WebSocket.RawData): WsMessage | null => {
    const frame = parseWsMessage(raw);
    if (!frame || frame.type !== "ROOT_EXECUTION_EVENT") return frame;
    const event = asRecord(frame.payload.event);
    if (event?.kind === "agent_presentation") {
      const message = asRecord(event.message)!;
      return { type: String(message.type), payload: { ...asRecord(message.payload), agent_run_id: event.agent_run_id }, receivedAt: frame.receivedAt };
    }
    if (event?.kind === "task_execution_started") {
      return { type: "TASK_EXECUTION_STARTED", payload: event, receivedAt: frame.receivedAt };
    }
    if (event?.kind === "communication") {
      const message = asRecord(event.message)!;
      return {
        type: "TEAM_COMMUNICATION_MESSAGE",
        payload: { message: { sender_agent_run_id: message.senderAgentRunId, receiver_agent_run_id: message.receiverAgentRunId, content: message.content } },
        receivedAt: frame.receivedAt,
      };
    }
    return frame;
  };

  const startOrg = async () => {
    const unique = randomUUID().slice(0, 8);
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "delegated-child-lifecycle-org-ws-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const agentDefinition = async (name: string, toolNames: string[], instructions: string) =>
      createAgentDefinition({ name: `org-${name}-${unique}`, toolNames, instructions });
    const coordinatorId = await agentDefinition("coordinator", ["delegate_task", "send_message_to"], COORDINATOR_INSTRUCTIONS);
    const plannerId = await agentDefinition("planner", ["delegate_task", "send_message_to"],
      workerInstructions("claude", " When asked to call delegate_task with exact JSON arguments, call it exactly once with them."));
    const helperId = await agentDefinition("helper", ["send_message_to"], workerInstructions("auto"));
    const leadId = await agentDefinition("lead", ["send_message_to"], workerInstructions("codex"));
    const analystId = await agentDefinition("analyst", ["send_message_to"], workerInstructions("auto"));
    const squad = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
      `mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
      { input: {
        name: `org-squad-${unique}`, description: "Flat Team delegated as one child.", instructions: "Members follow their own instructions exactly.",
        coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: leadId, refScope: "SHARED" }, { memberName: "analyst", ref: analystId, refScope: "SHARED" }],
      } },
    );
    createdTeamDefinitionIds.add(squad.createAgentTeamDefinition.id);
    const org = await execGraphql<{ createAgentOrgDefinition: { id: string } }>(
      `mutation CreateAgentOrgDefinition($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }`,
      { input: {
        name: `org-delegation-${unique}`, description: "Live Org-root delegation lifecycle.", instructions: "Members follow their own instructions exactly.",
        members: [
          { memberName: "coordinator", ref: coordinatorId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "planner", ref: plannerId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "helper", ref: helperId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "squad", ref: squad.createAgentTeamDefinition.id, refType: "AGENT_TEAM", refScope: "SHARED" },
        ],
        handoffs: [],
      } },
    );
    const orgDefinitionId = org.createAgentOrgDefinition.id;
    // Org launch configuration validates llmConfig against each model's schema; only Codex exposes a setting here.
    const override = (address: string, runtime: WorkerRuntime) => ({ address, configuration: {
      runtimeKind: RUNTIME_KIND[runtime], llmModelIdentifier: models.get(runtime),
      llmConfig: runtime === "codex" ? { reasoning_effort: "medium" } : null,
    } });
    const created = await execGraphql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      `mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }`,
      { input: {
        agentOrgDefinitionId: orgDefinitionId,
        rootConfiguration: {
          runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: models.get("auto"), llmConfig: null,
          autoExecuteTools: true, workspaceRootPath,
        },
        agentOverrides: [override("/coordinator", COORDINATOR_RUNTIME), override("/planner", "claude"), override("/squad/lead", "codex")],
      } },
    );
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    createdOrgs.push({ orgRunId, orgDefinitionId });

    const socket = new WebSocket(`ws://${runtimeServerUrl!.hostname}:${runtimeServerUrl!.port}/ws/agent-org/${orgRunId}`);
    openSockets.add(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const message = normalizeOrgFrame(raw);
      if (message) messages.push(message);
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });
    const snapshot = await waitForMessageAfter(messages, 0, (message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT", "Org snapshot", 30_000);
    const runIdByAddress = new Map<string, string>();
    const visit = (members: unknown[]) => {
      for (const member of members.map(asRecord)) {
        if (typeof member?.agentRunId === "string") runIdByAddress.set(String(member.address), member.agentRunId);
        if (Array.isArray(member?.members)) visit(member.members);
      }
    };
    visit(((asRecord(asRecord(asRecord(snapshot.payload.root_org)?.execution_tree)?.rootOrg)?.members) ?? []) as unknown[]);
    expect([...runIdByAddress.keys()].sort()).toEqual(["/coordinator", "/helper", "/planner", "/squad/analyst", "/squad/lead"]);
    const send = (targetAgentRunId: string, content: string) => {
      const messageId = `e2e-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: targetAgentRunId,
        command_id: `cmd-${messageId}`, content, context_file_paths: [], image_urls: [],
        message_id: messageId, dedupe_key: `agent_run_input:e2e:${messageId}`,
      } }));
    };
    return { orgRunId, unique, runIdByAddress, connection: { socket, messages }, send };
  };

  it("LIVE-003: in an Agent Org root, shuts a quiet task Team down as a whole, wakes it through its coordinator, and lets a grandchild wake its shut-down delegator", async () => {
    const org = await startOrg();
    const { connection, orgRunId } = org;
    const coordinatorRunId = org.runIdByAddress.get("/coordinator")!;
    const orgHasOpenWork = async () => (await execGraphql<{ getAgentOrgExecutionCheckpoint: { hasOpenExecutionWork: boolean } }>(
      `query C($orgRunId: String!) { getAgentOrgExecutionCheckpoint(orgRunId: $orgRunId) { hasOpenExecutionWork } }`, { orgRunId },
    )).getAgentOrgExecutionCheckpoint.hasOpenExecutionWork;
    const coordinatorCall = async (tool: "delegate_task" | "send_message_to", args: Record<string, unknown>, label: string) => {
      const startIndex = connection.messages.length;
      org.send(coordinatorRunId, `Call ${tool} exactly once now with these exact JSON arguments: ${JSON.stringify(args)}. Do not call any other tool.`);
      const done = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        ["TOOL_EXECUTION_SUCCEEDED", "TOOL_EXECUTION_FAILED"].includes(message.type) &&
        message.payload.agent_run_id === coordinatorRunId && toolName(message.payload) === tool,
      `${label} ${tool} result`, 300_000);
      expect(done.type, `${label}: ${JSON.stringify(done.payload).slice(0, 600)}`).toBe("TOOL_EXECUTION_SUCCEEDED");
      return { result: toolResult(done.payload), startIndex };
    };

    // AC-009 / REQ-017: delegate to a mounted flat Team; the result is the fresh task Team coordinator's run ID.
    const teamRecall = `RECALL_SQUAD_${org.unique}`;
    const teamAck = `ACK_SQUAD_${org.unique}`;
    const teamSpawn = await coordinatorCall("delegate_task", {
      recipient_address: "/squad",
      description: `Your secret recall code is ${teamRecall}. Remember it and do not send it now. ` +
        `Now call send_message_to exactly once with these exact JSON arguments: ${JSON.stringify({ recipient_address: "/coordinator", content: teamAck })}. ` +
        "Then reply with the single word DONE.",
    }, "task Team spawn");
    // A Team copy is named by its team run and its coordinator, never by an ambiguous target_agent_run_id.
    expect(Object.keys(teamSpawn.result ?? {}).filter((key) => key !== "task_id"))
      .toEqual(["delegated", "target_kind", "target_team_run_id", "target_team_coordinator_agent_run_id"]);
    expect(teamSpawn.result!.target_kind).toBe("team");
    const leadRunId = String(teamSpawn.result!.target_team_coordinator_agent_run_id);
    expect(leadRunId).not.toBe(org.runIdByAddress.get("/squad/lead"));
    const teamStarted = await waitForMessageAfter(connection.messages, teamSpawn.startIndex, (message) =>
      message.type === "TASK_EXECUTION_STARTED" && typeof asRecord(message.payload.execution)?.teamRunId === "string",
    "task Team task_execution_started", 60_000);
    const teamExecution = asRecord(teamStarted.payload.execution)!;
    expect(teamExecution).toMatchObject({ address: "/squad", delegatorAgentRunId: coordinatorRunId });
    const teamMemberRunIds = (teamExecution.members as Array<Record<string, unknown>>).map((member) => String(member.agentRunId));
    expect(teamMemberRunIds).toContain(leadRunId);
    const teamReply = await waitForMessageAfter(connection.messages, teamSpawn.startIndex, (message) =>
      isCommunication(message, { sender: leadRunId, receiver: coordinatorRunId, contains: teamAck }),
    "task Team coordinator reply", 300_000);
    const teamReplyIndex = connection.messages.indexOf(teamReply);
    await waitForAgentStatus(connection, teamReplyIndex, leadRunId, "idle", "task Team coordinator quiet", 300_000);

    // AC-010 setup: a child (planner, Claude) delegates to a grandchild (helper) and goes quiet.
    const plannerToken = `PLANNER_WOKEN_${org.unique}`;
    const plannerSpawn = await coordinatorCall("delegate_task", {
      recipient_address: "/planner",
      description: `Call delegate_task exactly once with these exact JSON arguments: ${JSON.stringify({
        recipient_address: "/helper",
        description: "Stand by. Do not call any tool until a later message tells you to. Reply with the single word WAITING.",
      })}. Then reply with the single word DONE.`,
    }, "planner spawn");
    const plannerRunId = String(plannerSpawn.result!.target_agent_run_id);
    const helperStarted = await waitForMessageAfter(connection.messages, plannerSpawn.startIndex, (message) =>
      message.type === "TASK_EXECUTION_STARTED" &&
      asRecord(message.payload.execution)?.address === "/helper" &&
      asRecord(message.payload.execution)?.delegatorAgentRunId === plannerRunId,
    "grandchild task_execution_started with the child as delegator", 300_000);
    const helperRunId = String(asRecord(helperStarted.payload.execution)!.agentRunId);
    await waitForAgentStatus(connection, connection.messages.indexOf(helperStarted), plannerRunId, "idle", "planner quiet", 300_000);
    await waitForAgentStatus(connection, connection.messages.indexOf(helperStarted), helperRunId, "idle", "grandchild quiet", 300_000);

    // The whole task Team and the delegating child shut down, not before the grace period.
    await expectShutdownAfterGrace(connection, teamReplyIndex, leadRunId, "task Team coordinator");
    await expectShutdownAfterGrace(connection, plannerSpawn.startIndex, plannerRunId, "delegating child");
    expect(await orgHasOpenWork()).toBe(false);

    // AC-009: a message to the task Team coordinator's run ID restores the team; the coordinator recalls its packet.
    const teamWake = await coordinatorCall("send_message_to", {
      target_agent_run_id: leadRunId,
      content: "Follow-up from your delegator: call send_message_to exactly once with recipient_address \"/coordinator\" and content made of " +
        "the word RECALLED, one space, and the secret recall code from your original delegated task. Then reply with the single word DONE.",
    }, "task Team wake");
    expect(teamWake.result).toMatchObject({ accepted: true, target_agent_run_id: leadRunId });
    await waitForMessageAfter(connection.messages, teamWake.startIndex, (message) =>
      isCommunication(message, { sender: leadRunId, receiver: coordinatorRunId, contains: teamRecall }),
    "restored task Team coordinator recalls its packet", 300_000);

    // AC-010: the operator messages the grandchild; its message by run ID wakes its shut-down delegator.
    const grandchildIndex = connection.messages.length;
    org.send(helperRunId, `Call send_message_to exactly once now with these exact JSON arguments: ${JSON.stringify({
      target_agent_run_id: plannerRunId,
      content: `Grandchild report: call send_message_to exactly once with recipient_address "/coordinator" and content ${plannerToken}. Then reply DONE.`,
    })}. Do not call any other tool.`);
    await waitForMessageAfter(connection.messages, grandchildIndex, (message) =>
      isCommunication(message, { sender: helperRunId, receiver: plannerRunId, contains: plannerToken }),
    "grandchild message to its shut-down delegator", 300_000);
    await waitForMessageAfter(connection.messages, grandchildIndex, (message) =>
      isCommunication(message, { sender: plannerRunId, receiver: coordinatorRunId, contains: plannerToken }),
    "restored delegator acts on the grandchild message", 300_000);
    expectNoRetiredTaskSurface(connection);
    const orgTree = JSON.parse(await readFile(path.join(appConfigProvider.config.getMemoryDir(), "agent_orgs", orgRunId, "agent_org_run_execution_tree.json"), "utf8"));
    expect(orgTree).not.toHaveProperty("schemaVersion");
    expect(await readdir(path.join(appConfigProvider.config.getMemoryDir(), "agent_orgs", orgRunId)))
      .not.toContain("agent_org_task_delegation_records.json");
  }, 1_800_000);

  it("LIVE-005: stopping the root stops every child, and after a reopen a message restores an earlier child with its conversation", async () => {
    const runtimes: WorkerRuntime[] = ["auto", "codex", "claude"];
    const root = await startTeam({
      name: "reopen-root",
      coordinator: "coordinator",
      members: [
        { name: "coordinator", runtime: COORDINATOR_RUNTIME, toolNames: ["delegate_task", "send_message_to"], instructions: COORDINATOR_INSTRUCTIONS },
        ...runtimes.map((runtime) => ({
          name: `${runtime}_worker`, runtime, toolNames: ["send_message_to"], instructions: workerInstructions(runtime),
        })),
      ],
    });
    const coordinatorRunId = root.runIdByAddress.get("/coordinator")!;
    const children = new Map<WorkerRuntime, { runId: string; recall: string }>();
    for (const runtime of runtimes) {
      const recall = `RECALL_REOPEN_${runtime.toUpperCase()}_${root.unique}`;
      const { result, startIndex } = await callToolVia(root.connection, coordinatorRunId, "delegate_task", {
        recipient_address: `/${runtime}_worker`,
        description: `Your secret recall code is ${recall}. Remember it for later messages and do not send it now. Reply with the single word READY.`,
      }, `${runtime} spawn before stop`);
      const childRunId = String(result!.target_agent_run_id);
      await waitForAgentStatus(root.connection, startIndex, childRunId, "idle", `${runtime} child quiet before stop`, 300_000);
      children.set(runtime, { runId: childRunId, recall });
    }

    // AC-014: children are live (inside their grace period) when the root stops; the stop takes all of them down.
    const stopIndex = root.connection.messages.length;
    const stopped = await execGraphql<{ terminateAgentTeamRun: { success: boolean } }>(
      `mutation T($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }`, { teamRunId: root.teamRunId },
    );
    expect(stopped.terminateAgentTeamRun.success).toBe(true);
    for (const [runtime, child] of children) {
      await waitForAgentStatus(root.connection, stopIndex, child.runId, "offline", `${runtime} child stopped with its root`, 60_000);
    }
    const resumeAfterStop = await execGraphql<{ getTeamRunResumeConfig: { isActive: boolean } }>(
      E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId: root.teamRunId },
    );
    expect(resumeAfterStop.getTeamRunResumeConfig.isActive).toBe(false);

    // AC-013: reopen the root; children come back shut down and wake on a message with their conversation.
    const restored = await execGraphql<{ restoreAgentTeamRun: { success: boolean; message: string } }>(
      `mutation R($teamRunId: String!) { restoreAgentTeamRun(teamRunId: $teamRunId) { success message } }`, { teamRunId: root.teamRunId },
    );
    expect(restored.restoreAgentTeamRun.success, restored.restoreAgentTeamRun.message).toBe(true);
    const reopened = await openTeamSocket(root.teamRunId);
    expect(await checkpointHasOpenWork(root.teamRunId)).toBe(false);
    for (const [runtime, child] of children) {
      const { result, startIndex } = await callToolVia(reopened, coordinatorRunId, "send_message_to", {
        target_agent_run_id: child.runId,
        content: "Follow-up after a restart: call send_message_to exactly once with recipient_address \"/coordinator\" and content made of " +
          "the word RECALLED, one space, and the secret recall code from your original delegated task. Then reply with the single word DONE.",
      }, `${runtime} wake after reopen`);
      expect(result).toMatchObject({ accepted: true, target_agent_run_id: child.runId });
      await waitForMessageAfter(reopened.messages, startIndex, (message) =>
        isCommunication(message, { sender: child.runId, receiver: coordinatorRunId, contains: child.recall }),
      `${runtime} child restored after reopen recalls its packet`, 300_000);
    }
    expectNoRetiredTaskSurface(root.connection);
    expectNoRetiredTaskSurface(reopened);
  }, 1_500_000);
});
