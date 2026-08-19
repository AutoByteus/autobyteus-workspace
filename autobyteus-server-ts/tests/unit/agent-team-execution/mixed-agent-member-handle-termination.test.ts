import { describe, expect, it, vi } from "vitest";

const revokeAgentToolMcpSessionsForAgentRun = vi.hoisted(() => vi.fn());
vi.mock("../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js", () => ({
  getAgentToolMcpSessionService: () => ({ revokeAgentToolMcpSessionsForAgentRun }),
}));

import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
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
    rootTeamRunId: "team-run-1",
    teamRunId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: teamConfig.rootTeam,
    handoffs: teamConfig.handoffs,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [memberContext],
    }),
  });

  return new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config,
    agentRunManager: overrides.agentRunManager as never,
    memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
    publish: vi.fn(),
    notifyStatusChange: vi.fn(),
    deliverInterAgentMessage: vi.fn(),
  });
};

describe("MixedAgentMemberHandle termination", () => {
  it("treats an absent local run as a benign root-shutdown interrupt without restoring it", async () => {
    const agentRunManager = {
      restoreAgentRunFromPlatformState: vi.fn(),
      createAgentRun: vi.fn(),
    };
    const handle = buildHandle({
      platformAgentRunId: "platform-worker-run-1",
      agentRunManager,
    });

    await expect(handle.interruptForRootTermination()).resolves.toEqual({ accepted: true });

    expect(agentRunManager.restoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(agentRunManager.createAgentRun).not.toHaveBeenCalled();
  });

  it("translates only NO_ACTIVE_TURN to a benign root-shutdown interrupt", async () => {
    const run = {
      runId: "worker-run-1",
      isActive: () => true,
      getPlatformAgentRunId: () => "platform-worker-run-1",
      getStatusSnapshot: () => ({ status: "waiting_for_tool" }),
      subscribeToEvents: vi.fn(() => () => undefined),
      postUserMessage: vi.fn(async () => ({ accepted: true as const })),
      interrupt: vi.fn()
        .mockResolvedValueOnce({ accepted: false, code: "NO_ACTIVE_TURN" })
        .mockResolvedValueOnce({ accepted: false, code: "INTERRUPT_REJECTED", message: "provider rejected" }),
    };
    const handle = buildHandle({
      agentRunManager: { createAgentRun: vi.fn(async () => run) },
    });
    (handle as unknown as { agentRun: typeof run }).agentRun = run;

    await expect(handle.interruptForRootTermination()).resolves.toEqual({ accepted: true });
    await expect(handle.interruptForRootTermination()).resolves.toEqual({
      accepted: false,
      code: "INTERRUPT_REJECTED",
      message: "provider rejected",
    });
    expect(run.interrupt).toHaveBeenCalledTimes(2);
  });

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
    expect(revokeAgentToolMcpSessionsForAgentRun).toHaveBeenCalledWith("worker-run-1");
    expect(handle.isActive()).toBe(false);
  });

  it("keeps a local active run attached when active termination is rejected", async () => {
    const rejected = {
      accepted: false as const,
      code: "TERMINATION_REJECTED",
      message: "still busy",
    };
    const run = {
      runId: "worker-run-1",
      isActive: () => true,
      getPlatformAgentRunId: () => "platform-worker-run-1",
      getStatusSnapshot: () => ({ status: "running" }),
      subscribeToEvents: vi.fn(() => () => undefined),
      postUserMessage: vi.fn(async () => ({ accepted: true as const })),
      prepareTermination: vi.fn(async () => ({
        cancel: vi.fn(),
        commit: vi.fn(() => ({ finish: vi.fn(async () => rejected) })),
      })),
    };
    const handle = buildHandle({
      agentRunManager: { createAgentRun: vi.fn(async () => run) },
    });
    (handle as unknown as { agentRun: typeof run }).agentRun = run;

    await expect(handle.terminate()).resolves.toEqual(rejected);

    expect(run.prepareTermination).toHaveBeenCalledTimes(1);
    expect(handle.isActive()).toBe(true);
  });
});
