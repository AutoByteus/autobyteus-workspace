import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedTaskAgentExecutionRegistry } from "../../../src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.js";
import { MixedTeamMemberConfigResolver } from "../../../src/agent-team-execution/backends/mixed/members/mixed-team-member-config-resolver.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

describe("MixedTaskAgentExecutionRegistry task-agent memory", () => {
  it("starts a task Agent with its own memory directory in the owning TeamRun scope", async () => {
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
    const teamExecutionAddress = createTeamExecutionAddress({
      rootTeamRunId: "owning-team-run",
      taskTeamRunIds: [],
      memberAddress: "/worker",
    });
    const teamContext = new TeamRunContext({
      teamRunId: "owning-team-run",
      teamAddress: "/",
      teamBackendKind: TeamBackendKind.MIXED,
      config,
      runtimeContext: new MixedTeamRunContext({
        memberContexts: [new MixedAgentMemberContext({
          address: "/worker",
          agentRunId: "worker-template-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: null,
        })],
        teamExecutionAddress,
      }),
    });
    const createdConfigs: unknown[] = [];
    const createAgentRun = vi.fn(async (runConfig, runId) => {
      createdConfigs.push(runConfig);
      return {
        runId,
        config: runConfig,
        isActive: () => true,
        getPlatformAgentRunId: () => null,
        getStatusSnapshot: () => ({ status: "idle" }),
        subscribeToEvents: () => () => undefined,
        postUserMessage: async () => ({ accepted: true }),
        approveToolInvocation: async () => ({ accepted: true }),
        interrupt: async () => ({ accepted: true }),
        terminate: async () => ({ accepted: true }),
      };
    });
    const registry = new MixedTaskAgentExecutionRegistry({
      teamContext,
      configResolver: new MixedTeamMemberConfigResolver(teamContext),
      agentRunManager: { createAgentRun } as never,
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });
    const taskAgentRunId = "worker_00000000000000000000000000000001";

    await expect(registry.start({
      taskId: "task_0001",
      receiver: createTeamExecutionAddress({
        rootTeamRunId: "owning-team-run",
        taskTeamRunIds: [],
        memberAddress: "/worker",
        taskAgentRunId,
      }),
      sourceNode: workerNode,
      message: new AgentInputUserMessage("start task", SenderType.USER),
    })).resolves.toEqual({ accepted: true });
    registry.releaseWork(taskAgentRunId);

    await vi.waitFor(() => expect(createAgentRun).toHaveBeenCalledTimes(1));
    expect(createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({
            rootTeamRunId: "owning-team-run",
            ancestorTeamRunIds: [],
          }, taskAgentRunId),
      }),
      taskAgentRunId,
    );
    expect((createdConfigs[0] as { memoryDir?: string }).memoryDir)
      .not.toBe("/tmp/template-member-memory-dir");
  });
});
