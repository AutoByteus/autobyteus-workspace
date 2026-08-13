import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedTaskAgentInstanceRegistry } from "../../../src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.js";
import { MixedTeamMemberConfigResolver } from "../../../src/agent-team-execution/backends/mixed/members/mixed-team-member-config-resolver.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("MixedTaskAgentInstanceRegistry task-agent memory", () => {
  it("starts task agents with their own memoryDir under the logical member team path", async () => {
    const createdConfigs: unknown[] = [];
    const createAgentRun = vi.fn(async (config, runId) => {
      createdConfigs.push(config);
      return {
        runId,
        config,
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
    const logicalMember = new MixedAgentMemberContext({
      memberName: "worker",
      memberPath: ["worker"],
      memberRouteKey: "worker",
      memberRunId: "worker-template-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
    });
    const teamContext = new TeamRunContext({
      runId: "owning-team-run",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: "worker",
      coordinatorMemberRouteKey: "worker",
      config: new TeamRunConfig({
        teamDefinitionId: "team-def",
        teamBackendKind: TeamBackendKind.MIXED,
        memberConfigs: [{
          memberName: "worker",
          memberRouteKey: "worker",
          memberRunId: "worker-template-run",
          agentDefinitionId: "agent-worker",
          llmModelIdentifier: "model-1",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memoryDir: "/tmp/template-member-memory-dir",
        }],
      }),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: "worker",
        memberContexts: [logicalMember],
      }),
    });
    const registry = new MixedTaskAgentInstanceRegistry({
      teamContext,
      configResolver: new MixedTeamMemberConfigResolver(teamContext),
      agentRunManager: { createAgentRun } as never,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });
    const taskAgentRunId = "worker_00000000000000000000000000000001";

    const result = await registry.start({
      identity: {
        taskAgentInstanceId: "task-agent-instance-1",
        taskAgentRunId,
        teamRunId: "owning-team-run",
        taskId: "task_0001",
        logicalMember: {
          memberName: "worker",
          memberPath: ["worker"],
          memberRouteKey: "worker",
          templateMemberRunId: "worker-template-run",
        },
        createdAt: "2026-06-11T00:00:00.000Z",
      },
      message: new AgentInputUserMessage("start task", SenderType.USER),
    });

    expect(result).toMatchObject({ accepted: true });
    expect(createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({ rootTeamRunId: "owning-team-run", teamRunPath: [] }, taskAgentRunId),
      }),
      taskAgentRunId,
    );
    expect((createdConfigs[0] as { memoryDir?: string }).memoryDir)
      .not.toBe("/tmp/template-member-memory-dir");
  });
});
