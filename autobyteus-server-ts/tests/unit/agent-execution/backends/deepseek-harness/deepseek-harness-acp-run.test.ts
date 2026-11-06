import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import type { AgentDefinitionService } from "../../../../../src/agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../../src/skills/services/skill-service.js";
import type {
  AgentToolMcpRunSessionActivator,
  AgentToolMcpRunSessionExposure,
} from "../../../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentCreationError } from "../../../../../src/agent-execution/errors.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AcpAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.js";
import type { AcpAgentRunBackend } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-backend.js";
import { AcpAgentRunContext } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-context.js";
import { AcpAgentProcess } from "../../../../../src/runtime-management/acp/acp-agent-process.js";
import type { AcpRunLaunchRequest } from "../../../../../src/runtime-management/acp/acp-agent-launch-profile.js";
import {
  ProviderRelayKeyMissingError,
  type ProviderRelayAccess,
} from "../../../../../src/credential-proxy/provider-relays/provider-relay-access.js";
import type { ProviderCallListener } from "../../../../../src/credential-proxy/provider-relays/provider-call-observation.js";
import { deepSeekHarnessSessionProfile } from "../../../../../src/agent-execution/backends/deepseek-harness/deepseek-harness-session-profile.js";
import {
  fakeAcpLaunchProfile,
  makeTestTempDir,
  removeTestTempDirs,
  waitFor,
  writeCustomFixture,
} from "../acp/acp-fake-agent-harness.js";
import { DSH_SESSION_ID, dshRunRows } from "./dsh-fake-fixtures.js";

/**
 * The shared ACP backend with the DeepSeek Harness session profile and a relay-naming launch profile over the fake
 * agent: the relay refusal rule (DEC-020), the run's relay access in its launch, instructions on every launch, restore
 * by `session/resume`, model and effort as config options, provider-call effects, and the one end order (DS-008).
 */

const DESCRIPTOR = {
  name: "autobyteus_agent_tools" as const, transport: "streamable_http" as const,
  serverUrl: "http://127.0.0.1:9/mcp/run-1", enabledTools: ["send_message_to"],
};

const backends: Array<Pick<AcpAgentRunBackend, "terminate">> = [];
afterEach(async () => {
  for (const backend of backends.splice(0)) await backend.terminate();
  vi.restoreAllMocks();
});
afterAll(removeTestTempDirs);

const relayAccessStub = (options: { keyMissing?: boolean } = {}) => {
  const listeners: ProviderCallListener[] = [];
  const order: string[] = [];
  const access: ProviderRelayAccess & { listeners: ProviderCallListener[]; order: string[] } = {
    listeners,
    order,
    prepareForRun: vi.fn(async () => {
      if (options.keyMissing) {
        throw new ProviderRelayKeyMissingError("The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.");
      }
      return { baseUrl: "http://127.0.0.1:7/relay/deepseek", apiKey: "rp_test-pass" };
    }),
    relayBaseUrl: vi.fn(() => "http://127.0.0.1:7/relay/deepseek"),
    observe: vi.fn((_runId: string, listener: ProviderCallListener) => {
      listeners.push(listener);
      return () => { order.push("unsubscribe"); listeners.splice(listeners.indexOf(listener), 1); };
    }),
  };
  return access;
};

const createFactory = (fixture: string, providerRelayAccess: ProviderRelayAccess | null) => {
  const recordFile = path.join(makeTestTempDir("dsh-record-"), "client.jsonl");
  const launches: AcpRunLaunchRequest[] = [];
  const releases: Array<{ processExited: boolean }> = [];
  const processes: AcpAgentProcess[] = [];
  const spawn = AcpAgentProcess.spawn.bind(AcpAgentProcess);
  const spawnSpy = vi.spyOn(AcpAgentProcess, "spawn").mockImplementation((spec) => {
    const created = spawn(spec);
    processes.push(created);
    return created;
  });
  const launchProfile = fakeAcpLaunchProfile("Fake DeepSeek Harness", () => ({ FAKE_ACP_FIXTURE: fixture, FAKE_ACP_RECORD: recordFile }), {
    providerRelayId: "deepseek",
    onRunLaunch: (request) => { launches.push(request); },
    release: async () => {
      (providerRelayAccess as { order?: string[] } | null)?.order?.push("release");
      releases.push({ processExited: processes.at(-1)?.exited !== null });
    },
  });
  const factory = new AcpAgentRunBackendFactory({
    launchProfile,
    sessionProfile: deepSeekHarnessSessionProfile,
    definitions: { getAgentDefinitionById: async () => new AgentDefinition({
      id: "def-1", name: "Reviewer", role: "Code reviewer", description: "Reviews code {name} literally.", instructions: "Review carefully.", toolNames: [],
    }) } as unknown as AgentDefinitionService,
    skills: { resolveSkillScope: () => "CONFIGURED", resolveConfiguredSkillBindingsForAgent: () => [] } as unknown as SkillService,
    workspaces: { resolveWorkingDirectory: async () => makeTestTempDir("dsh-ws-") },
    mcpSessions: { activateForRun: vi.fn(() => ({ kind: "active", descriptor: DESCRIPTOR })) } as unknown as AgentToolMcpRunSessionActivator & AgentToolMcpRunSessionExposure,
    skillMaterializer: {
      materializeConfiguredWorkspaceSkills: async () => ({ materializedSkills: [], effectiveRequests: [] }),
      cleanupMaterializedWorkspaceSkills: async () => undefined,
    } as never,
    integrationRunAccess: null,
    providerRelayAccess,
  });
  const recorded = () => fs.existsSync(recordFile)
    ? fs.readFileSync(recordFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
  return { factory, recorded, launches, releases, spawnSpy };
};

const config = () => new AgentRunConfig({
  agentDefinitionId: "def-1", llmModelIdentifier: "deepseek-v4-flash", autoExecuteTools: false,
  llmConfig: { reasoning_effort: "max" }, memoryDir: makeTestTempDir("dsh-memory-"), runtimeKind: RuntimeKind.DEEPSEEK_HARNESS,
});

describe("DeepSeek Harness on the shared ACP backend", () => {
  it("refuses a run before anything starts when this host has no provider relay (DEC-020)", async () => {
    const { factory, launches, spawnSpy } = createFactory(writeCustomFixture(dshRunRows({ mode: "new" })), null);
    const failure = await factory.beginPreparation({ kind: "new", runId: "run-1", config: config() }).prepare().catch((error) => error);
    expect(failure).toBeInstanceOf(AgentCreationError);
    expect((failure as Error).message).toBe(
      "PROVIDER_RELAY_UNAVAILABLE: Fake DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run.");
    expect(launches).toEqual([]);
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it("refuses a run whose DeepSeek key is not in the vault with where to set it, before dsh starts (AC-009)", async () => {
    const access = relayAccessStub({ keyMissing: true });
    const { factory, launches, spawnSpy } = createFactory(writeCustomFixture(dshRunRows({ mode: "new" })), access);
    await expect(factory.beginPreparation({ kind: "new", runId: "run-1", config: config() }).prepare()).rejects.toThrow(
      new AgentCreationError("RELAY_KEY_NOT_SET: The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys."));
    expect(launches).toEqual([]);
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it("launches with the run's relay access and instructions, selects model and effort, and applies provider-call effects in the turn", async () => {
    const access = relayAccessStub();
    const { factory, recorded, launches } = createFactory(writeCustomFixture(dshRunRows({ mode: "new" })), access);
    const backend = await factory.beginPreparation({ kind: "new", runId: "run-1", config: config() }).prepare();
    backends.push(backend);

    expect(access.prepareForRun).toHaveBeenCalledWith({ runId: "run-1", agentDefinitionId: "def-1" }, "deepseek");
    expect(launches).toHaveLength(1);
    expect(launches[0]).toMatchObject({
      runId: "run-1", model: "deepseek-v4-flash", reasoningEffort: "max",
      relayAccess: { baseUrl: "http://127.0.0.1:7/relay/deepseek", apiKey: "rp_test-pass" },
    });
    expect(launches[0]!.instructions).toContain("Reviews code {name} literally.");
    const sessionNew = recorded().find((message) => message.method === "session/new");
    expect(sessionNew.params._meta).toBeUndefined();
    expect(recorded().filter((message) => message.method === "session/set_config_option").map((message) => message.params)).toEqual([
      { sessionId: DSH_SESSION_ID, configId: "model", value: "[\"deepseek-official\",\"deepseek-v4-flash\"]" },
      { sessionId: DSH_SESSION_ID, configId: "reasoning_effort", value: "max" },
    ]);
    expect(access.observe).toHaveBeenCalledWith("run-1", expect.any(Function));

    const events: AgentRunEvent[] = [];
    backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
    await backend.dispatchUserInput({ kind: "start_turn", message: { content: "go", contextFiles: [] } as never });
    await waitFor(() => events.some((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT));
    const [listener] = access.listeners;
    listener!({ kind: "started", callId: "c-1", purpose: "compaction" });
    listener!({ kind: "finished", callId: "c-1", purpose: "compaction", httpStatus: 200, stopReason: "end_turn",
      usage: { inputTokens: 900, outputTokens: 80, cacheReadInputTokens: 100, cacheCreationInputTokens: 0 } });
    listener!({ kind: "finished", callId: "c-2", purpose: "turn", httpStatus: 200, stopReason: "end_turn",
      usage: { inputTokens: 120, outputTokens: 30, cacheReadInputTokens: null, cacheCreationInputTokens: null } });
    await waitFor(() => events.filter((event) => event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED).length === 2);

    const compaction = events.filter((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS).map((event) => event.payload);
    expect(compaction).toEqual([
      expect.objectContaining({ status: "compacting", rotation_eligible: false, provider: "deepseek_harness", provider_event_id: "c-1" }),
      expect.objectContaining({ status: "compacted", rotation_eligible: true, trigger: "auto", provider_event_id: "c-1" }),
    ]);
    const usage = events.filter((event) => event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED).map((event) => event.payload);
    expect(usage).toEqual([
      expect.objectContaining({ ingestion_kind: "deepseek_harness_compaction_call", reported_input_tokens: 900, cache_read_input_tokens: 100, call_sequence: 1 }),
      expect.objectContaining({ ingestion_kind: "deepseek_harness_call", reported_input_tokens: 120, reported_output_tokens: 30, call_sequence: 2,
        model_identifier: "deepseek-v4-flash", runtime_kind: "deepseek_harness" }),
    ]);
  });

  it("ends a generation in order: its provider-call listener, then the process, then the launch's files (DS-008)", async () => {
    const access = relayAccessStub();
    const { factory, releases } = createFactory(writeCustomFixture(dshRunRows({ mode: "new" })), access);
    const backend = await factory.beginPreparation({ kind: "new", runId: "run-1", config: config() }).prepare();
    expect(access.listeners).toHaveLength(1);
    await backend.terminate();
    expect(access.order).toEqual(["unsubscribe", "release"]);
    expect(access.listeners).toEqual([]);
    expect(releases).toEqual([{ processExited: true }]);
  });

  it("restores by session/resume with the run's instructions and model again; no session/load (AC-004, AC-006)", async () => {
    const access = relayAccessStub();
    const { factory, recorded, launches } = createFactory(writeCustomFixture(dshRunRows({ mode: "resume" })), access);
    const backend = await factory.beginPreparation({ kind: "restore", context: new AgentRunContext({
      runId: "run-1", config: config(), runtimeContext: new AcpAgentRunContext(DSH_SESSION_ID),
    }) }).prepare();
    backends.push(backend);
    expect(backend.getPlatformAgentRunId()).toBe(DSH_SESSION_ID);
    expect(recorded().map((message) => message.method)).toEqual(
      ["initialize", "session/resume", "session/set_config_option", "session/set_config_option"]);
    expect(recorded().find((message) => message.method === "session/resume").params).toMatchObject({
      sessionId: DSH_SESSION_ID, mcpServers: [{ type: "http", name: "autobyteus_agent_tools", url: DESCRIPTOR.serverUrl, headers: [] }],
    });
    expect(launches[0]!.instructions).toContain("Reviews code {name} literally.");
    expect(launches[0]!.relayAccess).toEqual({ baseUrl: "http://127.0.0.1:7/relay/deepseek", apiKey: "rp_test-pass" });
  });
});
