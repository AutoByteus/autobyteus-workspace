import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedTaskAgentExecutionRegistry } from "../../../src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testMemberTeamContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

describe("MixedTaskAgentExecutionRegistry task-agent memory", () => {
  it("keeps a fresh task Agent as a leaf in its containing nested TeamRun scope and releases work only after commit", async () => {
    const workerNode = testAgentNode("/review/worker", {
      agentRunId: "worker-template-run",
      agentDefinitionId: "agent-worker",
      llmModelIdentifier: "model-1",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const reviewTeam = testAgentTeamNode({
      address: "/review",
      coordinatorAddress: workerNode.address,
      teamRunId: "review-team-run",
      children: [workerNode],
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "owning-team-run",
      rootTeamDefinitionId: "team-def",
      coordinatorAddress: "/lead",
      children: [testAgentNode("/lead"), reviewTeam],
    });
    const physicalScope = createChildTeamRunPhysicalScope(
      createRootTeamRunPhysicalScope("owning-team-run"),
      reviewTeam.teamRunId,
    );
    const teamContext = new TeamRunContext({
      physicalScope,
      teamRunId: reviewTeam.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: reviewTeam,
      handoffs: config.handoffs,
      runtimeContext: new MixedTeamRunContext({
        memberContexts: [new MixedAgentMemberContext({
          address: workerNode.address,
          agentRunId: "worker-template-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: null,
        })],
        configuredMemberActivationMode: "fresh",
      }),
    });
    const postedMessages: AgentInputUserMessage[] = [];
    const createdConfigs: unknown[] = [];
    const prepareNewAgentRun = vi.fn(async ({ config: runConfig, runId }) => {
      createdConfigs.push(runConfig);
      const run = {
        runId,
        config: runConfig,
        isActive: () => true,
        getPlatformAgentRunId: () => null,
        getStatusSnapshot: () => ({ status: "idle" }),
        subscribeToEvents: () => () => undefined,
        postUserMessage: async (message: AgentInputUserMessage) => {
          postedMessages.push(message);
          return { accepted: true as const };
        },
        approveToolInvocation: async () => ({ accepted: true as const }),
        interrupt: async () => ({ accepted: true as const }),
        prepareTermination: async () => ({
          cancel: () => undefined,
          commit: () => ({ finish: async () => ({ accepted: true as const }) }),
        }),
      };
      return {
        runId,
        runtimeKind: runConfig.runtimeKind,
        platformAgentRunId: `platform-${runId}`,
        commitPublication: () => run,
        abort: async () => ({ kind: "aborted" as const }),
      };
    });
    const memoryLocationService = new AgentMemoryLocationService({
      memoryDir: appConfigProvider.config.getMemoryDir(),
    });
    const getTeamAgentRunLocation = vi.spyOn(
      memoryLocationService,
      "getTeamAgentRunLocation",
    );
    const revokeAgentToolMcpSessionsForRun = vi.fn();
    const taskAgentRunId = "worker_00000000000000000000000000000001";
    const registry = new MixedTaskAgentExecutionRegistry({
      teamContext,
      agentRunManager: { prepareNewAgentRun } as never,
      agentToolMcpSessionManager: { revokeAgentToolMcpSessionsForRun } as never,
      memoryLocationService,
      activityInspector: { inspect: vi.fn(() => ({ kind: "none" })) } as never,
      memberTeamContextBuilder: {
        build: vi.fn(async () => testMemberTeamContext({
          rootTeamRunId: config.rootTeam.teamRunId,
          memberAddress: workerNode.address,
          agentRunId: taskAgentRunId,
        })),
      } as never,
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
      acceptPlatformBinding: vi.fn(async () => undefined),
    });
    const message = new AgentInputUserMessage("start task", SenderType.USER);

    const prepared = await registry.prepare({
      taskId: "task_0001",
      address: workerNode.address,
      agentRunId: taskAgentRunId,
      sourceNode: workerNode,
      message,
    });

    expect(prepared.binding).toEqual({
      kind: "agent",
      address: "/review/worker",
      agentRunId: taskAgentRunId,
    });
    expect(prepared.stagedPlatformBindings).toEqual([
      expect.objectContaining({
        platformAgentRunId: `platform-${taskAgentRunId}`,
      }),
    ]);
    expect(registry.get(taskAgentRunId)).toBeNull();
    expect(postedMessages).toEqual([]);
    prepared.sealForCommit();
    const committed = prepared.commitAfterDurability();
    expect(registry.get(taskAgentRunId)).not.toBeNull();
    committed.releaseWork();

    await vi.waitFor(() => expect(postedMessages).toEqual([message]));
    expect(prepareNewAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: taskAgentRunId,
        config: expect.objectContaining({
          memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
            .getTeamAgentRunDirPath({
              rootTeamRunId: "owning-team-run",
              ancestorTeamRunIds: ["review-team-run"],
            }, taskAgentRunId),
        }),
      }),
    );
    expect(getTeamAgentRunLocation).toHaveBeenCalledWith({
      ...physicalScope,
      agentRunId: taskAgentRunId,
    });
    expect((createdConfigs[0] as { memoryDir?: string }).memoryDir).not.toBe("/tmp/template-member-memory-dir");
    registry.dispose();
    expect(revokeAgentToolMcpSessionsForRun).toHaveBeenCalledWith(taskAgentRunId);
  });
});
