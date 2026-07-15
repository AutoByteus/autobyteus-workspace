import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const buildMemberConfig = (): TeamMemberRunConfig => ({
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
});

const buildHandle = (overrides: { platformAgentRunId?: string | null; agentRunManager?: unknown } = {}) => {
  const config = buildMemberConfig();
  const memberContext = new MixedAgentMemberContext({
    memberName: config.memberName,
    memberPath: config.memberPath,
    memberRouteKey: config.memberRouteKey,
    memberRunId: config.memberRunId!,
    runtimeKind: config.runtimeKind,
    platformAgentRunId: overrides.platformAgentRunId ?? null,
  });
  const teamContext = new TeamRunContext({
    runId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberName: config.memberName,
    coordinatorMemberRouteKey: config.memberRouteKey,
    config: new TeamRunConfig({
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      memberConfigs: [config],
    }),
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: config.memberRouteKey,
      memberContexts: [memberContext],
    }),
  });

  return new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config,
    agentRunManager: overrides.agentRunManager as never,
    publish: vi.fn(),
    notifyStatusChange: vi.fn(),
    deliverInterAgentMessage: vi.fn(),
  });
};

describe("MixedAgentMemberHandle termination", () => {
  it("does not restore platform state solely to terminate an absent local run", async () => {
    const agentRunManager = {
      restoreAgentRunFromPlatformState: vi.fn(),
      createAgentRun: vi.fn(),
    };
    const handle = buildHandle({
      platformAgentRunId: "platform-worker-run-1",
      agentRunManager,
    });

    await expect(handle.terminate()).resolves.toEqual({ accepted: true });

    expect(agentRunManager.restoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(agentRunManager.createAgentRun).not.toHaveBeenCalled();
    expect(handle.isActive()).toBe(false);
  });

  it("keeps a local active run attached when active termination is rejected", async () => {
    const handle = buildHandle();
    const run = {
      runId: "worker-run-1",
      isActive: () => true,
      getPlatformAgentRunId: () => "platform-worker-run-1",
      getStatusSnapshot: () => ({ status: "running", can_interrupt: true }),
      subscribeToEvents: vi.fn(() => () => undefined),
      terminate: vi.fn(async () => ({
        accepted: false,
        code: "TERMINATION_REJECTED",
        message: "still busy",
      })),
    };
    handle.adoptExistingRun(run as never);

    await expect(handle.terminate()).resolves.toEqual({
      accepted: false,
      code: "TERMINATION_REJECTED",
      message: "still busy",
    });

    expect(run.terminate).toHaveBeenCalledTimes(1);
    expect(handle.isActive()).toBe(true);
  });
});
