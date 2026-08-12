import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  getAgentToolMcpSessionRegistry,
  resetAgentToolMcpSessionRegistryForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import {
  resetAgentToolMcpSessionServiceForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const buildTeamContext = (memberConfig: TeamRunAgentNode) => {
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
  return {
    memberContext,
    teamContext: new TeamRunContext({
      teamRunId: "team-run-1",
      teamAddress: "/",
      teamBackendKind: TeamBackendKind.MIXED,
      config,
      runtimeContext: new MixedTeamRunContext({
        memberContexts: [memberContext],
        teamExecutionAddress: createTeamExecutionAddress({
          rootTeamRunId: "team-run-1",
          taskTeamRunIds: [],
          memberAddress: memberConfig.address,
        }),
      }),
    }),
  };
};

const buildMemberConfig = (): TeamRunAgentNode => testAgentNode("/worker", {
  agentRunId: "worker-run-1",
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
});

describe("MixedAgentMemberHandle Agent Tools MCP cleanup", () => {
  beforeEach(() => {
    resetAgentToolMcpSessionServiceForTests();
    resetAgentToolMcpSessionRegistryForTests();
  });

  afterEach(() => {
    resetAgentToolMcpSessionServiceForTests();
    resetAgentToolMcpSessionRegistryForTests();
  });

  it("revokes member-run-scoped Agent Tools MCP sessions on repeated dispose without revoking other members", () => {
    const config = buildMemberConfig();
    const { teamContext, memberContext } = buildTeamContext(config);
    const registry = getAgentToolMcpSessionRegistry();
    const sender = buildAgentRunMessageSenderContext({
      senderRunId: "worker-run-1",
      senderName: "worker",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const workerExecutionAddress = createTeamExecutionAddress({
      rootTeamRunId: "team-run-1",
      taskTeamRunIds: [],
      memberAddress: "/worker",
    });
    const matching = registry.createSession({
      owner: {
        runId: "worker-run-1",
        executionAddress: workerExecutionAddress,
        agentRunId: "worker-run-1",
        displayName: "worker",
      },
      sender,
      runtimeExposure: buildRuntimeAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const otherMember = registry.createSession({
      owner: {
        runId: "other-run-1",
        executionAddress: createTeamExecutionAddress({
          rootTeamRunId: "team-run-1",
          taskTeamRunIds: [],
          memberAddress: "/other",
        }),
        agentRunId: "other-run-1",
        displayName: "other",
      },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "other-run-1",
        senderName: "other",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
      runtimeExposure: buildRuntimeAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const handle = new MixedAgentMemberHandle({
      teamContext,
      context: memberContext,
      config,
      agentRunManager: { createAgentRun: vi.fn() } as never,
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });

    handle.dispose();
    handle.dispose();

    expect(registry.resolveSession({
      sessionId: matching.session.sessionId,
      bearerToken: matching.capabilityToken,
    })).toMatchObject({ ok: false, reason: "revoked" });
    expect(registry.resolveSession({
      sessionId: otherMember.session.sessionId,
      bearerToken: otherMember.capabilityToken,
    }).ok).toBe(true);
  });
});
