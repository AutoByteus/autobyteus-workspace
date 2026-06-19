import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  getAgentToolMcpSessionRegistry,
  resetAgentToolMcpSessionRegistryForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import {
  resetAgentToolMcpSessionServiceForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildConfiguredAgentToolExposure } from "../../../src/agent-execution/shared/configured-agent-tool-exposure.js";

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
    const matching = registry.createSession({
      owner: {
        runId: "worker-run-1",
        teamRunId: "team-run-1",
        memberRunId: "worker-run-1",
        memberRouteKey: "worker",
        memberName: "worker",
      },
      sender,
      configuredExposure: buildConfiguredAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const otherMember = registry.createSession({
      owner: {
        runId: "other-run-1",
        teamRunId: "team-run-1",
        memberRunId: "other-run-1",
        memberRouteKey: "other",
        memberName: "other",
      },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "other-run-1",
        senderName: "other",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
      configuredExposure: buildConfiguredAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const handle = new MixedAgentMemberHandle({
      teamContext,
      context: memberContext,
      config,
      agentRunManager: { createAgentRun: vi.fn() } as never,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
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
