import { describe, expect, it, vi } from "vitest";
import { createRecordingAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const buildMemberConfig = (): TeamRunAgentNode => testAgentNode("/worker", {
  agentRunId: "worker-run-1",
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
});

const buildHandle = () => {
  const recording = createRecordingAgentToolMcpRunSessionReleaser();
  const memberConfig = buildMemberConfig();
  const memberContext = new MixedAgentMemberContext({
    address: memberConfig.address,
    agentRunId: memberConfig.agentRunId,
    runtimeKind: memberConfig.runtimeKind,
    platformAgentRunId: null,
  });
  const config = testTeamRunConfig({
    rootTeamRunId: "team-run-1",
    coordinatorAddress: memberConfig.address,
    children: [memberConfig],
  });
  const teamContext = new TeamRunContext({
    physicalScope: createRootTeamRunPhysicalScope("team-run-1"),
    teamRunId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext: new MixedTeamRunContext({ memberContexts: [memberContext] }),
  });
  const handle = new MixedAgentMemberHandle({
    agentToolMcpRunSessionReleaser: recording.releaser,
    teamContext,
    context: memberContext,
    config: memberConfig,
    agentRunManager: { createAgentRun: vi.fn() } as never,
    publish: vi.fn(),
    deliverInterAgentMessage: vi.fn(),
  });
  return { handle, recording };
};

describe("MixedAgentMemberHandle Agent Tools MCP cleanup", () => {
  it("revokes only the exact intrinsic AgentRun identity on every idempotent local dispose", () => {
    const { handle, recording } = buildHandle();

    handle.dispose();
    handle.dispose();

    expect(recording.getRevokedRunIds()).toEqual(["worker-run-1", "worker-run-1"]);
    expect(recording.getRevokedRunIds()).not.toContain("team-run-1");
  });
});
