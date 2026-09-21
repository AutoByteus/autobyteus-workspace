import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { RootedAgentMemoryLocator } from "../../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentToolsMcpHost } from "../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createAgentRunManagerInfrastructureFixture } from "../../fixtures/agent-run-manager-infrastructure-fixtures.js";
import {
  testAgentNode,
  testMemberExecutionContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const loggingConfig = Object.freeze({
  pinoLogLevel: "silent" as const,
  httpAccessLogMode: "off" as const,
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
});

const tempDirs: string[] = [];

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

const createAgentConfig = (): AgentRunConfig =>
  new AgentRunConfig({
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    agentDefinitionId: "team-agent-tools-lifecycle-agent",
    llmModelIdentifier: "team-agent-tools-lifecycle-model",
    autoExecuteTools: true,
    workspaceId: "team-agent-tools-lifecycle-workspace",
    llmConfig: null,
    skillAccessMode: SkillAccessMode.NONE,
  });

const createAgentBackend = (input: {
  runId: string;
  terminationResults: Array<{ accepted: boolean; code?: string; message?: string }>;
  context?: AgentRunContext<unknown | null>;
}): AgentRunBackend => {
  let active = true;
  const context = input.context ?? new AgentRunContext({
    runId: input.runId,
    config: createAgentConfig(),
    runtimeContext: null,
  });
  return {
    runId: input.runId,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    getContext: () => context,
    isActive: () => active,
    getPlatformAgentRunId: () => null,
    getLifecycleSnapshot: () => ({
      availability: active ? "active" : "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    }),
    subscribeToSourceEventBatches: () => () => undefined,
    postUserMessage: vi.fn(async () => ({ accepted: true })),
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interrupt: vi.fn(async () => ({ accepted: false, code: "NO_ACTIVE_TURN" })),
    terminate: vi.fn(async () => {
      const result = input.terminationResults.shift() ?? { accepted: true };
      if (result.accepted) active = false;
      return result;
    }),
  };
};

const expectMcpStatus = async (serverUrl: string, expectedStatus: number) => {
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `team-lifecycle-${expectedStatus}`,
      method: "ping",
      params: {},
    }),
  });
  expect(response.status).toBe(expectedStatus);
  return response;
};

describe("supported Team Agent Tools MCP lifecycle integration", () => {
  it("keeps a rejected member session active, deletes it before accepted Team stop, and restores the same route with fresh live state twice", async () => {
    const memoryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "team-agent-tools-lifecycle-"),
    );
    tempDirs.push(memoryDir);

    const host = createAgentToolsMcpHost({ loggingConfig });
    const authority = host.sessionAuthorities.begin({
      scopeIdentity: "team-agent-tools-lifecycle",
    }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: {
          publishManyForRun: vi.fn(async () => []),
        },
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    await host.listen();

    try {
      const infrastructure = createAgentRunManagerInfrastructureFixture({
        agentToolMcpRunSessionDeactivator: authority.runSessions,
      });
      const createBackends: AgentRunBackend[] = [];
      const restoreBackends: AgentRunBackend[] = [];
      const agentBackendFactory: AgentRunBackendFactory = {
        createBackend: vi.fn(async () => {
          const backend = createBackends.shift();
          if (!backend) throw new Error("Missing fresh AgentRun backend fixture.");
          return backend;
        }),
        restoreBackend: vi.fn(async () => {
          const backend = restoreBackends.shift();
          if (!backend) throw new Error("Missing restored AgentRun backend fixture.");
          return backend;
        }),
      };
      const agentRunManager = new AgentRunManager({
        autoByteusBackendFactory: agentBackendFactory,
        codexBackendFactory: agentBackendFactory,
        claudeBackendFactory: agentBackendFactory,
        activationRegistry: infrastructure.activationRegistry,
        memoryRecorder: infrastructure.memoryRecorder,
        providerInputNormalizer: infrastructure.providerInputNormalizer,
        agentToolMcpRunSessionDeactivator: authority.runSessions,
      });

      const memberNode = testAgentNode("/Coordinator", {
        agentRunId: "team-agent-tools-member-run",
        agentDefinitionId: "team-agent-tools-lifecycle-agent",
        llmModelIdentifier: "team-agent-tools-lifecycle-model",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }) as TeamRunAgentNode;
      const teamConfig = testTeamRunConfig({
        rootTeamRunId: "team-agent-tools-root",
        rootTeamDefinitionId: "team-agent-tools-definition",
        coordinatorAddress: memberNode.address,
        children: [memberNode],
      });

      let currentCycle = 0;
      let hasNativeConversationActivity = false;
      const teamExecutionFactory = new FlatTeamExecutionFactory({
        agentRunManager,
        memoryLocator: new RootedAgentMemoryLocator({ memoryDir }),
        activityInspector: {
          inspect: vi.fn(() => hasNativeConversationActivity
            ? { kind: "present" as const }
            : { kind: "none" as const }),
        },
      });
      const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
        AgentRunIdentityAllocator.getInstance({
          memoryDir,
          agentDefinitionService: {
            getAgentDefinitionById: async (id: string) => ({ id, name: id }) as never,
          },
          agentRunManager: { hasActiveRun: () => false },
          agentRunMetadataService: { readMetadata: async () => null },
          teamRunExecutionTreeLocationService: { containsRunId: async () => false },
          createToken: () => "00000000000000000000000000000000",
        }),
      );
      const teamRunManager = new AgentTeamRunManager({
        memoryDir,
        flatTeamExecutionFactory: teamExecutionFactory,
        memberExecutionContextBuilder: {
          build: vi.fn(async ({ teamContext, agentNode, taskCommands }) => testMemberExecutionContext({
            memberAddress: agentNode.address,
            rootTeamRunId: teamContext.rootIdentity.rootRunId,
            agentRunId: agentNode.agentRunId,
            taskCommands,
          })),
        } as never,
        taskExecutionIdentity,
        activeRootDirectory: new ActiveCollaborationRootDirectory(),
        modelSelectionValidator: {
          validateMany: vi.fn(),
          validate: vi.fn(async ({ selection }) => ({
            kind: "valid" as const,
            selection,
          })),
        },
      });

      const activate = () => {
        currentCycle += 1;
        const result = authority.runSessions.activateForRun({
          owner: { runId: memberNode.agentRunId },
          sender: buildAgentRunMessageSenderContext({
            senderRunId: memberNode.agentRunId,
            senderName: `Coordinator cycle ${currentCycle}`,
          }),
          runtimeExposure: buildRuntimeAgentToolExposure(["publish_artifacts"]),
        });
        if (result.kind !== "active") throw new Error("Expected active Agent Tools route.");
        expect(result.descriptor).not.toHaveProperty("headers");
        return result.descriptor.serverUrl;
      };

      const firstBackend = createAgentBackend({
        runId: memberNode.agentRunId,
        terminationResults: [
          { accepted: false, code: "TERMINATION_REJECTED", message: "still busy" },
          { accepted: true },
        ],
      });
      createBackends.push(firstBackend);
      const freshTeam = await teamRunManager.createTeamRun({
        config: teamConfig,
        teamDefinitionName: "Agent Tools lifecycle Team",
      });
      expect(agentRunManager.getActiveRun(memberNode.agentRunId)).toBeNull();
      await expect(freshTeam.postMessage(new AgentInputUserMessage("Start lifecycle probe"), memberNode.agentRunId)).resolves.toMatchObject({ accepted: true });
      const currentRun = agentRunManager.getActiveRun(memberNode.agentRunId);
      expect(currentRun).not.toBeNull();
      const firstServerUrl = activate();

      await expectMcpStatus(firstServerUrl, 200);
      await expect(
        teamRunManager.terminateTeamRun(teamConfig.rootTeam.teamRunId),
      ).resolves.toBe(false);
      expect(agentRunManager.getActiveRun(memberNode.agentRunId)).toBe(currentRun);
      await expectMcpStatus(firstServerUrl, 200);

      await expect(
        teamRunManager.terminateTeamRun(teamConfig.rootTeam.teamRunId),
      ).resolves.toBe(true);
      expect(agentRunManager.getActiveRun(memberNode.agentRunId)).toBeNull();
      await expectMcpStatus(firstServerUrl, 404);

      const restoredContext = new AgentRunContext({
        runId: memberNode.agentRunId,
        config: createAgentConfig(),
        runtimeContext: null,
      });
      restoreBackends.push(createAgentBackend({
        runId: memberNode.agentRunId,
        terminationResults: [{ accepted: true }],
        context: restoredContext,
      }));
      hasNativeConversationActivity = true;
      const restoredTeam = await teamRunManager.restoreTeamRun(teamConfig.rootTeam.teamRunId);
      expect(agentRunManager.getActiveRun(memberNode.agentRunId)).toBeNull();
      await expect(restoredTeam.postMessage(new AgentInputUserMessage("Continue lifecycle probe"), memberNode.agentRunId)).resolves.toMatchObject({ accepted: true });
      const restoredRun = agentRunManager.getActiveRun(memberNode.agentRunId);
      expect(restoredRun).not.toBeNull();
      expect(restoredRun).not.toBe(currentRun);
      const restoredServerUrl = activate();
      expect(restoredServerUrl).toBe(firstServerUrl);
      await expectMcpStatus(restoredServerUrl, 200);
      await expect(
        teamRunManager.terminateTeamRun(teamConfig.rootTeam.teamRunId),
      ).resolves.toBe(true);
      expect(agentRunManager.getActiveRun(memberNode.agentRunId)).toBeNull();
      await expectMcpStatus(restoredServerUrl, 404);
      expect(agentBackendFactory.createBackend).toHaveBeenCalledTimes(1);
      expect(agentBackendFactory.restoreBackend).toHaveBeenCalledTimes(1);
    } finally {
      await host.close();
    }
  }, 30_000);
});
