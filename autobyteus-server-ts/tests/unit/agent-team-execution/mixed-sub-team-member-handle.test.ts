import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedSubTeamRunFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.js";
import { MixedSubTeamMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.js";
import {
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunConfig, type TeamSubTeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { ResolvedInterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";

const buildChildAgent = (memberName: string, routeKey: string) => ({
  memberKind: "agent" as const,
  memberName,
  memberPath: ["ReviewTeam", memberName],
  memberRouteKey: routeKey,
  memberRunId: `${memberName.toLowerCase()}-opaque-run`,
  agentDefinitionId: `agent-${memberName.toLowerCase()}`,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

describe("MixedSubTeamMemberHandle", () => {
  it("routes parent-to-subteam messages to the configured child coordinator in multi-member child teams", async () => {
    const childPostMessage = vi.fn(async () => ({ accepted: true }));
    const contextBuilder = new MixedTeamRunBackendFactory({
      memoryLocationService: new AgentMemoryLocationService({ memoryDir: "/tmp/mixed-subteam-handle-test-memory" }),
    });
    const subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId, restoreRuntimeContext) =>
        contextBuilder.buildTeamRunContext(config, teamRunId, restoreRuntimeContext ?? null),
      createTeamManager: () => ({
        hasActiveMembers: () => true,
        postMessage: childPostMessage,
        deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
        approveToolInvocation: vi.fn(async () => ({ accepted: true })),
        interrupt: vi.fn(async () => ({ accepted: true })),
        terminate: vi.fn(async () => ({ accepted: true })),
        subscribeToEvents: vi.fn(() => () => undefined),
      }),
    });
    const parentContext = new TeamRunContext({
      runId: "parent-1",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "Lead",
      config: new TeamRunConfig({
        teamDefinitionId: "parent-team",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberRouteKey: "Lead",
        memberTree: [],
      }),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: "Lead",
        memberContexts: [],
      }),
    });
    const context = new MixedSubTeamMemberContext({
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "child-review-1",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-1",
    });
    const config: TeamSubTeamMemberRunConfig = {
      memberKind: "agent_team",
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "child-review-1",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-1",
      coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
      memberConfigs: [
        buildChildAgent("Reviewer", "ReviewTeam/Reviewer"),
        buildChildAgent("Observer", "ReviewTeam/Observer"),
      ],
    };
    const handle = new MixedSubTeamMemberHandle({
      parentContext,
      context,
      config,
      subTeamRunFactory,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
    });

    const result = await handle.postMessage(new AgentInputUserMessage("please review"));

    expect(result.accepted).toBe(true);
    expect(childPostMessage).toHaveBeenCalledWith(
      expect.any(AgentInputUserMessage),
      { kind: "route_key", memberRouteKey: "Reviewer" },
      null,
    );
  });

  it("strips the parent subteam prefix when delivering to an explicit represented child target", async () => {
    const childPostMessage = vi.fn(async () => ({ accepted: true }));
    const contextBuilder = new MixedTeamRunBackendFactory({
      memoryLocationService: new AgentMemoryLocationService({ memoryDir: "/tmp/mixed-subteam-handle-delivery-test-memory" }),
    });
    const subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId, restoreRuntimeContext, parentBoundary) =>
        contextBuilder.buildTeamRunContext(config, teamRunId, restoreRuntimeContext ?? null, parentBoundary ?? null),
      createTeamManager: () => ({
        hasActiveMembers: () => true,
        postMessage: childPostMessage,
        deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
        approveToolInvocation: vi.fn(async () => ({ accepted: true })),
        interrupt: vi.fn(async () => ({ accepted: true })),
        terminate: vi.fn(async () => ({ accepted: true })),
        subscribeToEvents: vi.fn(() => () => undefined),
      }),
    });
    const parentContext = new TeamRunContext({
      runId: "parent-1",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "Lead",
      config: new TeamRunConfig({
        teamDefinitionId: "parent-team",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberRouteKey: "Lead",
        memberTree: [],
      }),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: "Lead",
        memberContexts: [],
      }),
    });
    const context = new MixedSubTeamMemberContext({
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "child-review-1",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-1",
    });
    const config: TeamSubTeamMemberRunConfig = {
      memberKind: "agent_team",
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "child-review-1",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-1",
      coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
      memberConfigs: [
        buildChildAgent("Reviewer", "ReviewTeam/Reviewer"),
        buildChildAgent("Observer", "ReviewTeam/Observer"),
      ],
    };
    const handle = new MixedSubTeamMemberHandle({
      parentContext,
      context,
      config,
      subTeamRunFactory,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
    });
    const request: ResolvedInterAgentMessageDeliveryRequest = {
      teamRunId: "parent-1",
      target: { kind: "recipient_name", recipientName: "Reviewer" },
      sender: {
        participant: {
          memberKind: "agent",
          memberName: "Lead",
          memberPath: ["Lead"],
          memberRouteKey: "Lead",
          memberRunId: "run-lead",
          address: {
            teamRunId: "parent-1",
            memberPath: ["Lead"],
            memberRouteKey: "Lead",
          },
        },
        selector: { kind: "path", memberPath: ["Lead"] },
      },
      recipient: {
        participant: {
          memberKind: "agent",
          memberName: "Reviewer",
          memberPath: ["ReviewTeam", "Reviewer"],
          memberRouteKey: "ReviewTeam/Reviewer",
          memberRunId: "run-reviewer",
          address: {
            teamRunId: "parent-1",
            memberPath: ["ReviewTeam", "Reviewer"],
            memberRouteKey: "ReviewTeam/Reviewer",
          },
          representedSubTeam: {
            memberKind: "agent_team",
            memberName: "ReviewTeam",
            memberPath: ["ReviewTeam"],
            memberRouteKey: "ReviewTeam",
            memberRunId: "child-review-1",
            teamDefinitionId: "review-team",
            address: {
              teamRunId: "parent-1",
              memberPath: ["ReviewTeam"],
              memberRouteKey: "ReviewTeam",
            },
          },
        },
        selector: { kind: "path", memberPath: ["ReviewTeam", "Reviewer"] },
      },
      resolvedTargetKind: "logical_member",
      targetAgentRunId: "run-reviewer",
      content: "Please review.",
      messageType: "representative_message",
    };

    const result = await handle.deliverInterMemberMessage(request);

    expect(result.accepted).toBe(true);
    expect(childPostMessage).toHaveBeenCalledWith(
      expect.any(AgentInputUserMessage),
      { kind: "path", memberPath: ["Reviewer"] },
      null,
    );
  });
});
