import { describe, expect, it, vi } from "vitest";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const buildMemberConfig = (): TeamRunAgentNode => testAgentNode("/worker", {
  agentRunId: "worker-run-1",
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
});

const buildHandle = (overrides: { platformAgentRunId?: string | null; agentRunManager?: unknown } = {}) => {
  const config = buildMemberConfig();
  const teamConfig = testTeamRunConfig({
    rootTeamRunId: "team-run-1",
    rootTeamDefinitionId: "team-def-1",
    coordinatorAddress: config.address,
    children: [config],
  });
  const memberContext = new MixedAgentMemberContext({
    address: config.address,
    agentRunId: config.agentRunId,
    runtimeKind: config.runtimeKind,
    platformAgentRunId: overrides.platformAgentRunId ?? null,
  });
  const teamContext = new TeamRunContext({
    teamRunId: "team-run-1",
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config: teamConfig,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [memberContext],
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: "team-run-1",
        memberAddress: config.address,
      }),
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
      getStatusSnapshot: () => ({ status: "running" }),
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
