import { describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunActivationRegistry } from "../../../src/agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunResourceManager } from "../../../src/agent-execution/services/agent-run-resource-manager.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import type { AgentToolMcpToolAdapter } from "../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import { AgentToolMcpCatalog } from "../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { createAgentToolMcpSessionAuthorityFactory } from "../../../src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testMemberTaskRootResolver,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const TOOL_NAME = "test_tool";
const adapter: AgentToolMcpToolAdapter = {
  definition: {
    name: TOOL_NAME,
    description: "Test tool",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  isAvailable: () => true,
  execute: vi.fn(async () => ({
    kind: "operation_result" as const,
    result: { accepted: true },
  })),
};

const createConfig = () => new AgentRunConfig({
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "claude-sonnet-4-5",
  autoExecuteTools: false,
  workspaceId: null,
  llmConfig: null,
  skillAccessMode: null,
});

const createBackend = (config: AgentRunConfig) => {
  let active = true;
  return {
    getContext: () => new AgentRunContext({
      runId: "worker-run-1",
      config,
      runtimeContext: null,
    }),
    getPlatformAgentRunId: () => "platform-worker-run-1",
    isActive: () => active,
    getLifecycleSnapshot: () => ({
      availability: active ? "active" as const : "inactive" as const,
      phase: active ? "running" as const : "terminated" as const,
      currentTurn: { kind: "NONE" as const },
    }),
    subscribeToSourceEventBatches: () => () => undefined,
    postUserMessage: vi.fn(async () => ({ accepted: true as const })),
    approveToolInvocation: vi.fn(async () => ({ accepted: true as const })),
    interrupt: vi.fn(async () => ({ accepted: true as const })),
    terminate: vi.fn(async () => {
      active = false;
      return { accepted: true as const };
    }),
  };
};

const unavailableFactory: AgentRunBackendFactory = {
  createBackend: async () => { throw new Error("Factory is outside this test."); },
  restoreBackend: async () => { throw new Error("Factory is outside this test."); },
};

const activateInput = (displayName: string) => ({
  owner: { runId: "worker-run-1", displayName },
  sender: buildAgentRunMessageSenderContext({
    senderRunId: "worker-run-1",
    senderName: displayName,
  }),
  runtimeExposure: buildRuntimeAgentToolExposure([TOOL_NAME]),
});

describe("MixedAgentMemberHandle managed Agent Tools cleanup", () => {
  it("keeps the deterministic session on cancel, removes it before accepted stop, and permits fresh reactivation", async () => {
    const registry = new AgentToolMcpSessionRegistry();
    const authority = createAgentToolMcpSessionAuthorityFactory({
      registry,
      catalog: new AgentToolMcpCatalog({ adapters: [adapter] }),
      getLocalBaseUrl: () => "http://127.0.0.1:43124",
      assertHostOpen: () => undefined,
    }).begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const firstSession = authority.runSessions.activateForRun(activateInput("worker-v1"));
    if (firstSession.kind !== "active") throw new Error("Expected active Agent Tools session.");

    const config = createConfig();
    const backend = createBackend(config);
    const memoryRecorder = {
      attachToRun: vi.fn(() => vi.fn()),
      onUserMessageForwarded: vi.fn(),
    };
    const activationRegistry = new AgentRunActivationRegistry(
      new AgentRunResourceManager({
        runSessions: authority.runSessions,
        runFileChangeService: { attachToRun: vi.fn(() => vi.fn()) } as never,
        publishedArtifactRelayService: { attachToRun: vi.fn(() => vi.fn()) } as never,
        memoryRecorder,
      }),
    );
    const manager = new AgentRunManager({
      autoByteusBackendFactory: unavailableFactory,
      codexBackendFactory: unavailableFactory,
      claudeBackendFactory: {
        createBackend: vi.fn(async () => backend),
        restoreBackend: vi.fn(),
      },
      activationRegistry,
      memoryRecorder,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: authority.runSessions,
    });
    const candidate = await manager.prepareNewAgentRun({
      runId: "worker-run-1",
      config,
    });
    const run = candidate.commitPublication();

    const node = testAgentNode("/worker", {
      agentRunId: "worker-run-1",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const teamConfig = testTeamRunConfig({
      rootTeamRunId: "team-run-1",
      coordinatorAddress: node.address,
      children: [node],
    });
    const memberContext = new MixedAgentMemberContext({
      address: node.address,
      agentRunId: node.agentRunId,
      runtimeKind: node.runtimeKind,
      platformAgentRunId: "platform-worker-run-1",
    });
    const handle = new MixedAgentMemberHandle({
      teamContext: new TeamRunContext({
        physicalScope: createRootTeamRunPhysicalScope("team-run-1"),
        teamRunId: "team-run-1",
        teamBackendKind: TeamBackendKind.MIXED,
        teamNode: teamConfig.rootTeam,
        runtimeContext: new MixedTeamRunContext({ memberContexts: [memberContext] }),
      }),
      context: memberContext,
      config: node,
      activationMode: "restore",
      agentRunManager: manager,
      memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
      taskRootResolver: testMemberTaskRootResolver(),
      publish: vi.fn(),
      acceptPlatformBinding: vi.fn(async () => undefined),
      deliverInterAgentMessage: vi.fn(),
    });
    (handle as unknown as { agentRun: typeof run }).agentRun = run;

    const cancelled = await handle.prepareTermination();
    cancelled.cancel();
    expect(registry.resolveSession(firstSession.sessionId).ok).toBe(true);
    expect(manager.getActiveRun(run.runId)).toBe(run);

    await expect(handle.terminate()).resolves.toEqual({ accepted: true });
    expect(registry.resolveSession(firstSession.sessionId)).toEqual({
      ok: false,
      reason: "missing_session",
    });
    expect(manager.getActiveRun(run.runId)).toBeNull();
    expect(handle.isActive()).toBe(false);

    const restoredSession = authority.runSessions.activateForRun(activateInput("worker-v2"));
    if (restoredSession.kind !== "active") throw new Error("Expected restored Agent Tools session.");
    expect(restoredSession.sessionId).toBe(firstSession.sessionId);
    expect(registry.getSession(restoredSession.sessionId)?.owner.displayName).toBe("worker-v2");
    authority.close();
  });
});
