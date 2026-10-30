import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import type { AgentDefinitionService } from "../../../../../src/agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../../src/skills/services/skill-service.js";
import type { AgentToolMcpRunSessionActivator } from "../../../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentCreationError } from "../../../../../src/agent-execution/errors.js";
import type { AcpAgentLaunchProfile } from "../../../../../src/runtime-management/acp/acp-agent-launch-profile.js";
import { AcpAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.js";
import type { AcpAgentRunBackend } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend.js";
import { AcpAgentRunContext } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-context.js";
import { AcpAgentProcess } from "../../../../../src/runtime-management/acp/acp-agent-process.js";
import type { IntegrationRunAccess } from "../../../../../src/credential-proxy/integration-run-access.js";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { getGrokWorkspaceSkillMaterializer } from "../../../../../src/agent-execution/backends/grok/grok-workspace-skill-materializer.js";
import {
  FAKE_ACP_AGENT,
  fixturePath,
  fixtureSessionId,
  readFixture,
  waitFor,
  writeCustomFixture,
  type FixtureRow,
} from "./acp-fake-agent-harness.js";

const DESCRIPTOR = {
  name: "autobyteus_agent_tools" as const, transport: "streamable_http" as const,
  serverUrl: "http://127.0.0.1:9/mcp/run-1", enabledTools: ["send_message_to"],
};

const AGENT_TOOLS_MCP_SERVER = { type: "http", name: "autobyteus_agent_tools", url: DESCRIPTOR.serverUrl, headers: [] };

const backends: AcpAgentRunBackend[] = [];
afterEach(async () => { for (const backend of backends.splice(0)) await backend.terminate(); });

const tempDir = (prefix: string) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const launchProfileFor = (fixture: string, recordFile: string, reportMcpReady: boolean): AcpAgentLaunchProfile => ({
  agentLabel: "Fake Agent",
  command: () => process.execPath,
  args: () => [FAKE_ACP_AGENT],
  env: (base) => ({
    ...base, FAKE_ACP_FIXTURE: fixture, FAKE_ACP_RECORD: recordFile,
    ...(reportMcpReady ? { FAKE_ACP_REPORT_MCP_READY: "1" } : {}),
  }),
  normalizeModels: () => [],
});

const createFactory = (fixture: string, options: {
  /** The fixture carries its own MCP server status rows; otherwise the fake agent reports ready. */
  fixtureReportsMcp?: boolean; skillScope?: "CONFIGURED" | "ALL_INSTALLED"; skillMaterializer?: unknown;
  integrationRunAccess?: IntegrationRunAccess;
} = {}) => {
  const recordFile = path.join(tempDir("acp-record-"), "client.jsonl");
  const workingDirectory = tempDir("acp-ws-");
  // Every run has an Agent Tools MCP session, so every session configures the server.
  const mcpSessions = { activateForRun: vi.fn(() => ({ kind: "active", descriptor: DESCRIPTOR })) };
  const factory = new AcpAgentRunBackendFactory({
    launchProfile: launchProfileFor(fixture, recordFile, !options.fixtureReportsMcp),
    sessionProfile: grokBuildSessionProfile,
    definitions: { getAgentDefinitionById: async () => new AgentDefinition({
      id: "def-1", name: "Reviewer", role: "Code reviewer", description: "Reviews code", toolNames: [],
    }) } as unknown as AgentDefinitionService,
    skills: { resolveSkillScope: () => options.skillScope ?? "CONFIGURED", resolveConfiguredSkillBindingsForAgent: () => [] } as unknown as SkillService,
    workspaces: { resolveWorkingDirectory: async () => workingDirectory },
    mcpSessions: mcpSessions as unknown as AgentToolMcpRunSessionActivator,
    skillMaterializer: (options.skillMaterializer ?? getGrokWorkspaceSkillMaterializer()) as ReturnType<typeof getGrokWorkspaceSkillMaterializer>,
    integrationRunAccess: options.integrationRunAccess ?? null,
  });
  const recorded = () => fs.existsSync(recordFile)
    ? fs.readFileSync(recordFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
  return { factory, recorded, workingDirectory, mcpSessions };
};

const config = (overrides: Partial<ConstructorParameters<typeof AgentRunConfig>[0]> = {}) => new AgentRunConfig({
  agentDefinitionId: "def-1", llmModelIdentifier: "grok-4.7", autoExecuteTools: false,
  memoryDir: tempDir("acp-memory-"),
  runtimeKind: RuntimeKind.GROK_BUILD, ...overrides,
});

const withInitialize = (rows: FixtureRow[], patch: (result: Record<string, any>) => void): FixtureRow[] => rows.map((row) => {
  if (row.dir !== "in" || !row.msg.result?.agentCapabilities) return row;
  const result = structuredClone(row.msg.result);
  patch(result);
  return { dir: "in", msg: { ...row.msg, result } };
});

const mcpStatus = (status: string): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", method: "_x.ai/mcp/server_status",
  params: { sessionId: fixtureSessionId("handshake"), name: "autobyteus_agent_tools", status, reason: "x" } } });

describe("AcpAgentRunBackendFactory", () => {
  it("creates a run bound to the agent session id with the composed prompt in the session rules (DS-001)", async () => {
    const { factory, recorded, workingDirectory } = createFactory(fixturePath("prompt"));
    const runConfig = config();
    const backend = await factory.beginPreparation({ kind: "new", config: runConfig, runId: "run-1" }).prepare();
    backends.push(backend);
    expect(backend.getPlatformAgentRunId()).toBe(fixtureSessionId("prompt"));
    expect(backend.getContext().runtimeContext).toEqual(new AcpAgentRunContext(fixtureSessionId("prompt"), workingDirectory));

    const newSession = recorded().find((message) => message.method === "session/new");
    expect(newSession.params).toMatchObject({ cwd: workingDirectory, mcpServers: [AGENT_TOOLS_MCP_SERVER], _meta: { yoloMode: false } });
    expect(newSession.params._meta.rules).toContain("Reviewer");
    expect(Object.keys(newSession.params._meta).sort()).toEqual(["rules", "yoloMode"]);

    const batches: AgentRunEvent[][] = [];
    backend.subscribeToSourceEventBatches((events) => { batches.push([...events]); });
    const result = await backend.dispatchUserInput({ kind: "start_turn", message: { content: "hello", contextFiles: [] } as never });
    expect(result).toMatchObject({ forwarded: true, platformAgentRunId: fixtureSessionId("prompt") });
    await waitFor(() => batches.flat().some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    const types = batches.flat().map((event) => event.eventType);
    expect(types[0]).toBe(AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED);
    expect(types.filter((type) => type === AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED)).toHaveLength(1);
    expect(types[1]).toBe(AgentRunEventType.TURN_STARTED);
    expect(backend.getLifecycleSnapshot()).toMatchObject({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
  });

  it("starts an allowed run's agent process with the launch profile's environment plus its integration variables (DS-002)", async () => {
    const variables = { AUTOBYTEUS_GITHUB_API_URL: "http://127.0.0.1:5555/r/rp_test-dummy/github/api", GIT_TERMINAL_PROMPT: "0" };
    const environmentForRun = vi.fn((run: { agentDefinitionId: string }) => (run.agentDefinitionId === "def-1" ? variables : {}));
    const spawn = vi.spyOn(AcpAgentProcess, "spawn");
    try {
      const { factory } = createFactory(fixturePath("prompt"), { integrationRunAccess: { environmentForRun, revokeForRun: vi.fn() } });
      backends.push(await factory.beginPreparation({ kind: "new", config: config(), runId: "run-1" }).prepare());
      expect(environmentForRun).toHaveBeenCalledWith({ runId: "run-1", agentDefinitionId: "def-1" }, process.env);
      const env = spawn.mock.calls[0]![0].env as Record<string, string>;
      expect(env).toMatchObject({ ...variables, FAKE_ACP_FIXTURE: fixturePath("prompt"), PATH: process.env.PATH });
      expect(process.env.AUTOBYTEUS_GITHUB_API_URL).toBeUndefined();

      const { factory: other } = createFactory(fixturePath("prompt"), { integrationRunAccess: { environmentForRun, revokeForRun: vi.fn() } });
      backends.push(await other.beginPreparation({ kind: "new", config: config({ agentDefinitionId: "def-2" }), runId: "run-2" }).prepare());
      expect(spawn.mock.calls[1]![0].env).not.toHaveProperty("AUTOBYTEUS_GITHUB_API_URL");
    } finally {
      spawn.mockRestore();
    }
  });

  it.each([["CONFIGURED", "fail"], ["ALL_INSTALLED", "prefer_workspace"]] as const)(
    "materializes .grok/skills with the collision policy of the %s scope (D-15 Rule 1)", async (skillScope, workspaceCollisionPolicy) => {
      const materialize = vi.fn(async () => { throw new Error("stop after materialization"); });
      const { factory } = createFactory("unused.json", { skillScope,
        skillMaterializer: { materializeConfiguredWorkspaceSkills: materialize, cleanupMaterializedWorkspaceSkills: vi.fn() } });

      await expect(factory.beginPreparation({ kind: "new", config: config(), runId: "run-strength" }).prepare()).rejects.toThrow("stop after materialization");
      expect(materialize).toHaveBeenCalledWith(expect.objectContaining({ runId: "run-strength", workspaceCollisionPolicy }));
    });

  it("attaches Agent Tools MCP over HTTP and waits until the agent reports it ready", async () => {
    const { factory, recorded } = createFactory(writeCustomFixture([...readFixture("handshake"), mcpStatus("ready")]), { fixtureReportsMcp: true });
    const backend = await factory.beginPreparation({ kind: "new", config: config(), runId: "run-1" }).prepare();
    backends.push(backend);
    expect(recorded().find((message) => message.method === "session/new").params.mcpServers)
      .toEqual([{ type: "http", name: "autobyteus_agent_tools", url: DESCRIPTOR.serverUrl, headers: [] }]);
  });

  it("fails activation with an error naming the MCP server when it is unavailable (REQ-007)", async () => {
    const { factory } = createFactory(writeCustomFixture([...readFixture("handshake"), mcpStatus("unavailable")]), { fixtureReportsMcp: true });
    const error = await factory.beginPreparation({ kind: "new", config: config(), runId: "run-1" }).prepare().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AgentCreationError);
    expect((error as Error).message).toContain("MCP server 'autobyteus_agent_tools' unavailable");
  });

  it("surfaces the agent's session/new error text as an AgentCreationError (CR-004, AC-012)", async () => {
    const rows = readFixture("handshake");
    const newIndex = rows.findIndex((row) => row.dir === "out" && row.msg.method === "session/new");
    const unauthenticated: FixtureRow[] = [...rows.slice(0, newIndex + 1), { dir: "in", msg: { jsonrpc: "2.0", id: rows[newIndex]!.msg.id,
      error: { code: -32000, message: "Authentication required", data: "no auth method id provided" } } }];
    const { factory } = createFactory(writeCustomFixture(unauthenticated));
    const error = await factory.beginPreparation({ kind: "new", config: config(), runId: "run-1" }).prepare().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AgentCreationError);
    expect((error as Error).message).toBe("Fake Agent: Authentication required: no auth method id provided");
  });

  it("reports a missing HTTP MCP capability explicitly instead of failing obscurely (AC-016)", async () => {
    const rows = withInitialize(readFixture("handshake"), (result) => { result.agentCapabilities.mcpCapabilities = {}; });
    const { factory, recorded } = createFactory(writeCustomFixture(rows), { fixtureReportsMcp: true });
    await expect(factory.beginPreparation({ kind: "new", config: config(), runId: "run-1" }).prepare()).rejects.toThrow(new AgentCreationError(
      "ACP_AGENT_CAPABILITY_MISSING: Fake Agent does not support HTTP MCP servers."));
    expect(recorded().some((message) => message.method === "session/new")).toBe(false);
  });

  it("restores exactly the stored session without re-sending instructions (DS-006)", async () => {
    const { factory, recorded } = createFactory(fixturePath("load"));
    const sessionId = fixtureSessionId("load");
    const backend = await factory.beginPreparation({ kind: "restore", context: new AgentRunContext({
      runId: "run-1", config: config(), runtimeContext: new AcpAgentRunContext(sessionId),
    }) }).prepare();
    backends.push(backend);
    expect(backend.getPlatformAgentRunId()).toBe(sessionId);
    const load = recorded().find((message) => message.method === "session/load");
    expect(load.params).toMatchObject({ sessionId, mcpServers: [AGENT_TOOLS_MCP_SERVER] });
    expect(load.params._meta).toBeUndefined();
    const batches: AgentRunEvent[][] = [];
    backend.subscribeToSourceEventBatches((events) => { batches.push([...events]); });
    await backend.dispatchUserInput({ kind: "start_turn", message: { content: "again", contextFiles: [] } as never });
    await waitFor(() => batches.flat().some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(batches.flat().some((event) => event.eventType === AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED)).toBe(false);
  });

  it("rejects restore without an exact session binding or without session/load support", async () => {
    const { factory } = createFactory(fixturePath("load"));
    await expect(factory.beginPreparation({ kind: "restore", context: new AgentRunContext({ runId: "run-1", config: config(), runtimeContext: null }) }).prepare())
      .rejects.toBeInstanceOf(AgentCreationError);
    await expect(factory.beginPreparation({ kind: "restore", context: new AgentRunContext({ runId: "run-1", config: config(), runtimeContext: new AcpAgentRunContext("run-1") }) }).prepare())
      .rejects.toThrow("PLATFORM_AGENT_RUN_BINDING_INVALID");
    const noLoad = withInitialize(readFixture("load"), (result) => { result.agentCapabilities.loadSession = false; });
    const { factory: dshLike } = createFactory(writeCustomFixture(noLoad));
    await expect(dshLike.beginPreparation({ kind: "restore", context: new AgentRunContext({
      runId: "run-1", config: config(), runtimeContext: new AcpAgentRunContext(fixtureSessionId("load")),
    }) }).prepare()).rejects.toThrow("Fake Agent does not support session/load");
  });

  it("surfaces a load failure as an AgentCreationError carrying the agent text (restore wraps it as cause, AR-006)", async () => {
    const rows = readFixture("load");
    const loadIndex = rows.findIndex((row) => row.dir === "out" && row.msg.method === "session/load");
    const failing: FixtureRow[] = [...rows.slice(0, loadIndex + 1),
      { dir: "in", msg: { jsonrpc: "2.0", id: rows[loadIndex]!.msg.id, error: { code: -32603, message: "Path not found." } } }];
    const { factory } = createFactory(writeCustomFixture(failing));
    await expect(factory.beginPreparation({ kind: "restore", context: new AgentRunContext({
      runId: "run-1", config: config(), runtimeContext: new AcpAgentRunContext(fixtureSessionId("load")),
    }) }).prepare()).rejects.toThrow(new AgentCreationError("Fake Agent: Path not found."));
  });

  it("reports an interrupted turn on terminate and becomes inactive", async () => {
    const promptRows: FixtureRow[] = [...readFixture("handshake"), { dir: "out", msg: { jsonrpc: "2.0", id: 9, method: "session/prompt" } }];
    const { factory } = createFactory(writeCustomFixture(promptRows));
    const backend = await factory.beginPreparation({ kind: "new", config: config(), runId: "run-1" }).prepare();
    const events: AgentRunEvent[] = [];
    backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
    const { turnId } = await backend.dispatchUserInput({ kind: "start_turn", message: { content: "hi", contextFiles: [] } as never });
    expect(await backend.dispatchUserInput({ kind: "start_turn", message: { content: "again", contextFiles: [] } as never }))
      .toMatchObject({ forwarded: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT" });
    await backend.terminate();
    expect(events.at(-1)).toMatchObject({ eventType: AgentRunEventType.TURN_INTERRUPTED, payload: { turn_id: turnId } });
    expect(backend.isActive()).toBe(false);
  });
});
