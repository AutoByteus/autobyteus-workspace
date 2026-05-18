import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import type {
  InterAgentMessageDeliveryRequest,
  TeamRepresentedSubTeam,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";

const representedSubTeam: TeamRepresentedSubTeam = {
  memberKind: "agent_team",
  memberName: "BuildSquad",
  memberPath: ["BuildSquad"],
  memberRouteKey: "BuildSquad",
  memberRunId: "build-squad-run",
  teamDefinitionId: "build-squad-team",
  address: {
    teamRunId: "parent-1",
    memberPath: ["BuildSquad"],
    memberRouteKey: "BuildSquad",
  },
};

const parentMember = {
  memberKind: "agent" as const,
  memberName: "program_manager",
  memberPath: ["program_manager"],
  memberRouteKey: "program_manager",
  memberRunId: "program-manager-run",
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  role: "manager",
  description: "Owns parent coordination.",
  address: {
    teamRunId: "parent-1",
    memberPath: ["program_manager"],
    memberRouteKey: "program_manager",
  },
};

const createChildManager = (input: {
  parentDeliverInterAgentMessage?: ReturnType<typeof vi.fn>;
  representedSubTeamOverride?: TeamRepresentedSubTeam;
} = {}) => {
  const parentDeliverInterAgentMessage =
    input.parentDeliverInterAgentMessage ?? vi.fn(async () => ({ accepted: true }));
  const config = new TeamRunConfig({
    teamDefinitionId: "build-squad-team",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "review_lead",
    memberTree: [
      {
        memberKind: "agent",
        memberName: "review_lead",
        memberPath: ["review_lead"],
        memberRouteKey: "review_lead",
        memberRunId: "review-lead-run",
        agentDefinitionId: "agent-review-lead",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      },
    ],
  });
  const context = new TeamRunContext({
    runId: "child-1",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "review_lead",
    config,
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "review_lead",
      memberContexts: [
        new MixedAgentMemberContext({
          memberName: "review_lead",
          memberPath: ["review_lead"],
          memberRouteKey: "review_lead",
          memberRunId: "review-lead-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "platform-review-lead-run",
        }),
      ],
      parentBoundary: {
        parentTeamRunId: "parent-1",
        representedSubTeam: input.representedSubTeamOverride ?? representedSubTeam,
        parentMembers: [parentMember],
        deliverInterAgentMessage: parentDeliverInterAgentMessage,
      },
    }),
  });
  return {
    parentDeliverInterAgentMessage,
    manager: new MixedTeamManager(context),
  };
};

const buildChildToParentRequest = ({
  teamRunId = "parent-1",
  senderPath = ["review_lead"],
  senderAddressTeamRunId = "child-1",
}: {
  teamRunId?: string;
  senderPath?: string[];
  senderAddressTeamRunId?: string;
} = {}): InterAgentMessageDeliveryRequest => ({
  teamRunId,
  sender: {
    participant: {
      memberKind: "agent",
      memberName: "review_lead",
      memberPath: senderPath,
      memberRouteKey: senderPath.join("/"),
      memberRunId: "review-lead-run",
      address: {
        teamRunId: senderAddressTeamRunId,
        memberPath: senderPath,
        memberRouteKey: senderPath.join("/"),
      },
    },
    selector: { kind: "path", memberPath: ["review_lead"] },
  },
  recipient: {
    participant: {
      memberKind: "agent",
      memberName: "program_manager",
      memberPath: ["program_manager"],
      memberRouteKey: "program_manager",
      memberRunId: "program-manager-run",
      address: {
        teamRunId: "parent-1",
        memberPath: ["program_manager"],
        memberRouteKey: "program_manager",
      },
    },
    selector: { kind: "path", memberPath: ["program_manager"] },
  },
  content: "Build is complete.",
  messageType: "status_update",
});

describe("MixedTeamManager parent-boundary delivery", () => {
  it("bridges child coordinator messages to the parent with absolute sender identity", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();

    const result = await manager.deliverInterAgentMessage(buildChildToParentRequest());

    expect(result.accepted).toBe(true);
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledTimes(1);
    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryRequest;
    expect(bridgedRequest).toEqual(expect.objectContaining({
      teamRunId: "parent-1",
      content: "Build is complete.",
      messageType: "status_update",
    }));
    expect(bridgedRequest.sender).toEqual(expect.objectContaining({
      selector: { kind: "path", memberPath: ["BuildSquad", "review_lead"] },
      participant: expect.objectContaining({
        memberName: "review_lead",
        memberPath: ["BuildSquad", "review_lead"],
        memberRouteKey: "BuildSquad/review_lead",
        address: {
          teamRunId: "parent-1",
          memberPath: ["BuildSquad", "review_lead"],
          memberRouteKey: "BuildSquad/review_lead",
        },
        representedSubTeam: expect.objectContaining({
          memberName: "BuildSquad",
          memberRouteKey: "BuildSquad",
        }),
      }),
    }));
    expect(bridgedRequest.recipient.selector).toEqual({ kind: "path", memberPath: ["program_manager"] });
    expect(bridgedRequest).not.toHaveProperty("replyAddress");
    expect(bridgedRequest).not.toHaveProperty("reply_to_sender");
  });

  it("rejects delivery to an unreachable parent boundary", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();

    const result = await manager.deliverInterAgentMessage(buildChildToParentRequest({ teamRunId: "other-parent" }));

    expect(result).toEqual({
      accepted: false,
      code: "TARGET_MEMBER_NOT_FOUND",
      message: "Team run 'other-parent' is not reachable from this team boundary.",
    });
    expect(parentDeliverInterAgentMessage).not.toHaveBeenCalled();
  });

  it("does not double-prefix already parent-rooted child sender paths", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();

    await manager.deliverInterAgentMessage(buildChildToParentRequest({
      senderPath: ["BuildSquad", "review_lead"],
      senderAddressTeamRunId: "parent-1",
    }));

    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryRequest;
    expect(bridgedRequest.sender.participant.memberPath).toEqual(["BuildSquad", "review_lead"]);
    expect(bridgedRequest.sender.participant.memberRouteKey).toBe("BuildSquad/review_lead");
  });

  it("uses full-prefix and root-aware normalization instead of first-segment sender matching", async () => {
    const nestedRepresentedSubTeam: TeamRepresentedSubTeam = {
      ...representedSubTeam,
      memberName: "NestedBuildSquad",
      memberPath: ["BuildSquad", "Nested"],
      memberRouteKey: "BuildSquad/Nested",
      address: {
        teamRunId: "parent-1",
        memberPath: ["BuildSquad", "Nested"],
        memberRouteKey: "BuildSquad/Nested",
      },
    };
    const { manager, parentDeliverInterAgentMessage } = createChildManager({
      representedSubTeamOverride: nestedRepresentedSubTeam,
    });

    await manager.deliverInterAgentMessage(buildChildToParentRequest({
      senderPath: ["BuildSquad", "review_lead"],
      senderAddressTeamRunId: "child-1",
    }));

    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryRequest;
    expect(bridgedRequest.sender.participant.memberPath).toEqual([
      "BuildSquad",
      "Nested",
      "BuildSquad",
      "review_lead",
    ]);
    expect(bridgedRequest.sender.participant.memberRouteKey).toBe(
      "BuildSquad/Nested/BuildSquad/review_lead",
    );
  });
});
