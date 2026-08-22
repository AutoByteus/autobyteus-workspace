import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedTaskAgentExecutionRegistry } from "../../../src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

describe("MixedTaskAgentExecutionRegistry task-agent memory", () => {
  it("prepares a fresh task Agent in the root plus exact AgentRun memory scope and releases work only after commit", async () => {
    const workerNode = testAgentNode("/worker", {
      agentRunId: "worker-template-run",
      agentDefinitionId: "agent-worker",
      llmModelIdentifier: "model-1",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "owning-team-run",
      rootTeamDefinitionId: "team-def",
      coordinatorAddress: "/worker",
      children: [workerNode],
    });
    const teamContext = new TeamRunContext({
      rootTeamRunId: "owning-team-run",
      teamRunId: "owning-team-run",
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: config.rootTeam,
      handoffs: config.handoffs,
      runtimeContext: new MixedTeamRunContext({
        memberContexts: [new MixedAgentMemberContext({
          address: workerNode.address,
          agentRunId: "worker-template-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: null,
        })],
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
        getPlatformAgentRunId: () => `${runId}-platform`,
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
        platformAgentRunId: `${runId}-platform`,
        commitPublication: () => run,
        abort: async () => ({ kind: "aborted" as const }),
      };
    });
    const registry = new MixedTaskAgentExecutionRegistry({
      teamContext,
      agentRunManager: { prepareNewAgentRun } as never,
      activityInspector: { inspect: () => ({ kind: "none" }) } as never,
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
      acceptPlatformBinding: vi.fn(async () => undefined),
    });
    const taskAgentRunId = "worker_00000000000000000000000000000001";
    const message = new AgentInputUserMessage("start task", SenderType.USER);

    const prepared = await registry.prepare({
      taskId: "task_0001",
      address: workerNode.address,
      agentRunId: taskAgentRunId,
      sourceNode: workerNode,
      message,
    });

    expect(prepared.binding).toEqual({ kind: "agent", address: "/worker", agentRunId: taskAgentRunId });
    expect(registry.get(taskAgentRunId)).toBeNull();
    expect(postedMessages).toEqual([]);
    prepared.sealForCommit();
    const committed = prepared.commitAfterDurability();
    expect(registry.get(taskAgentRunId)).not.toBeNull();
    committed.releaseWork();

    await vi.waitFor(() => expect(postedMessages).toEqual([message]));
    expect(prepareNewAgentRun).toHaveBeenCalledWith({
      runId: taskAgentRunId,
      config: expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({ rootTeamRunId: "owning-team-run", ancestorTeamRunIds: [] }, taskAgentRunId),
      }),
    });
    expect((createdConfigs[0] as { memoryDir?: string }).memoryDir).not.toBe("/tmp/template-member-memory-dir");
  });
});
