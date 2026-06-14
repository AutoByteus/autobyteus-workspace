import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const buildTeamContext = (memberConfig: TeamMemberRunConfig) => {
  const memberContext = new MixedAgentMemberContext({
    memberName: memberConfig.memberName,
    memberPath: memberConfig.memberPath,
    memberRouteKey: memberConfig.memberRouteKey,
    memberRunId: memberConfig.memberRunId!,
    runtimeKind: memberConfig.runtimeKind,
    platformAgentRunId: null,
  });
  return {
    memberContext,
    teamContext: new TeamRunContext({
      runId: "team-run-1",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: memberConfig.memberName,
      coordinatorMemberRouteKey: memberConfig.memberRouteKey,
      config: new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.MIXED,
        memberConfigs: [memberConfig],
      }),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: memberConfig.memberRouteKey,
        memberContexts: [memberContext],
      }),
    }),
  };
};

const buildMemberConfig = (overrides: Partial<TeamMemberRunConfig> = {}): TeamMemberRunConfig => ({
  memberKind: "agent",
  memberName: "worker",
  memberPath: ["worker"],
  memberRouteKey: "worker",
  memberRunId: "worker-run-1",
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  memoryDir: "/tmp/worker-memory",
  ...overrides,
});

describe("MixedAgentMemberHandle memoryDir invariant", () => {
  it("fails fast for recordable non-AutoByteus members missing upstream memoryDir", async () => {
    const config = buildMemberConfig({ memoryDir: null });
    const { teamContext, memberContext } = buildTeamContext(config);
    const createAgentRun = vi.fn();
    const memberTeamContextBuilder = { build: vi.fn() };
    const handle = new MixedAgentMemberHandle({
      teamContext,
      context: memberContext,
      config,
      agentRunManager: { createAgentRun } as never,
      memberTeamContextBuilder: memberTeamContextBuilder as never,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .rejects.toThrow(/missing memoryDir before AgentRun creation/);
    expect(memberTeamContextBuilder.build).not.toHaveBeenCalled();
    expect(createAgentRun).not.toHaveBeenCalled();
  });

  it("passes the supplied memoryDir through to AgentRunManager without deriving a fallback", async () => {
    const config = buildMemberConfig({ memoryDir: "/tmp/supplied-worker-memory" });
    const { teamContext, memberContext } = buildTeamContext(config);
    const createAgentRun = vi.fn(async (agentRunConfig, runId) => ({
      runId,
      config: agentRunConfig,
      isActive: () => true,
      getPlatformAgentRunId: () => null,
      getStatusSnapshot: () => ({ status: "idle", can_interrupt: true }),
      subscribeToEvents: () => () => undefined,
      postUserMessage: async () => ({ accepted: true }),
      approveToolInvocation: async () => ({ accepted: true }),
      interrupt: async () => ({ accepted: true }),
      terminate: async () => ({ accepted: true }),
    }));
    const handle = new MixedAgentMemberHandle({
      teamContext,
      context: memberContext,
      config,
      agentRunManager: { createAgentRun } as never,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({ memoryDir: "/tmp/supplied-worker-memory" }),
      "worker-run-1",
    );
  });
});
