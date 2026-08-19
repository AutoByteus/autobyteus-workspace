import { beforeEach, describe, expect, it, vi } from "vitest";

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
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
});

const buildHandle = () => {
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
    rootTeamRunId: "team-run-1",
    teamRunId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext: new MixedTeamRunContext({ memberContexts: [memberContext] }),
  });
  return new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config: memberConfig,
    agentRunManager: { createAgentRun: vi.fn() } as never,
    publish: vi.fn(),
    deliverInterAgentMessage: vi.fn(),
  });
};

describe("MixedAgentMemberHandle Agent Tools MCP cleanup", () => {
  beforeEach(() => revokeAgentToolMcpSessionsForAgentRun.mockReset());

  it("revokes only the exact intrinsic AgentRun identity on every idempotent local dispose", () => {
    const handle = buildHandle();

    handle.dispose();
    handle.dispose();

    expect(revokeAgentToolMcpSessionsForAgentRun).toHaveBeenNthCalledWith(1, "worker-run-1");
    expect(revokeAgentToolMcpSessionsForAgentRun).toHaveBeenNthCalledWith(2, "worker-run-1");
    expect(revokeAgentToolMcpSessionsForAgentRun).not.toHaveBeenCalledWith("team-run-1");
  });
});
