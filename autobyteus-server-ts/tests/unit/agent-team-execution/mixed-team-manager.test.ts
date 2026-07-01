import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import type {
  InterAgentMessageDeliveryIntent,
  TeamRepresentedSubTeam,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";

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

const taskTeamInstance: TaskTeamInstanceIdentity = {
  taskTeamInstanceId: "task-team-instance-1",
  taskTeamRunId: "task-team-run-1",
  parentTeamRunId: "parent-1",
  taskId: "task-1",
  logicalTeam: {
    memberName: "BuildSquad",
    memberPath: ["BuildSquad"],
    memberRouteKey: "BuildSquad",
    templateMemberRunId: "build-squad-run",
    teamDefinitionId: "build-squad-team",
    coordinatorMemberRouteKey: "review_lead",
  },
  ingress: {
    memberName: "review_lead",
    memberPath: ["review_lead"],
    memberRouteKey: "review_lead",
    memberRunId: "review-lead-run",
  },
  createdAt: "2026-05-13T12:00:00.000Z",
};

const taskTeamChildAddress = {
  segments: [
    { kind: "member" as const, memberRouteKey: "BuildSquad" },
    { kind: "task_team" as const, taskTeamRunId: "task-team-run-1" },
    { kind: "member" as const, memberRouteKey: "review_lead" },
  ],
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
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
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
      taskTeamInstance: input.taskTeamInstance ?? null,
    }),
  });
  return {
    parentDeliverInterAgentMessage,
    manager: new MixedTeamManager(context),
  };
};

const buildChildToParentRequest = ({
  teamRunId = "child-1",
  senderPath = ["review_lead"],
  senderAddressTeamRunId = "child-1",
  senderAddress = null,
  taskAgentRunId = null,
  logicalMemberRouteKey = null,
}: {
  teamRunId?: string;
  senderPath?: string[];
  senderAddressTeamRunId?: string;
  senderAddress?: InterAgentMessageDeliveryIntent["senderAddress"] | null;
  taskAgentRunId?: string | null;
  logicalMemberRouteKey?: string | null;
} = {}): InterAgentMessageDeliveryIntent => ({
  teamRunId,
  target: { kind: "recipient_name", recipientName: "program_manager" },
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
      ...(taskAgentRunId ? { taskAgentRunId } : {}),
      ...(logicalMemberRouteKey ? { logicalMemberRouteKey } : {}),
    },
    selector: { kind: "path", memberPath: ["review_lead"] },
  },
  ...(senderAddress ? { senderAddress } : {}),
  content: "Build is complete.",
  messageType: "status_update",
});

describe("MixedTeamManager parent-boundary delivery", () => {
  it("bridges child coordinator messages to the parent with absolute sender identity", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();

    const result = await manager.deliverInterAgentMessage(buildChildToParentRequest());

    expect(result.accepted).toBe(true);
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledTimes(1);
    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryIntent;
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
    expect(bridgedRequest.senderAddress).toEqual({
      segments: [{ kind: "member", memberRouteKey: "BuildSquad/review_lead" }],
    });
    expect(bridgedRequest.target).toEqual({ kind: "recipient_name", recipientName: "program_manager" });
    expect(bridgedRequest).not.toHaveProperty("recipient");
    expect(bridgedRequest).not.toHaveProperty("replyAddress");
    expect(bridgedRequest).not.toHaveProperty("reply_to_sender");
  });



  it("parent-roots static task-agent sender addresses before appending the task-agent segment", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();

    await manager.deliverInterAgentMessage(buildChildToParentRequest({
      taskAgentRunId: "task-agent-run-1",
      logicalMemberRouteKey: "review_lead",
    }));

    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryIntent;
    expect(bridgedRequest.sender.participant.memberPath).toEqual(["BuildSquad", "review_lead"]);
    expect(bridgedRequest.sender.participant.logicalMemberRouteKey).toBe("review_lead");
    expect(bridgedRequest.senderAddress).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad/review_lead" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-1" },
      ],
    });
  });

  it("preserves task-team scoped sender addresses across parent-boundary delivery", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager({ taskTeamInstance });

    await manager.deliverInterAgentMessage(buildChildToParentRequest({
      senderAddress: taskTeamChildAddress,
    }));

    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryIntent;
    expect(bridgedRequest.sender.participant.memberPath).toEqual(["BuildSquad", "review_lead"]);
    expect(bridgedRequest.senderAddress).toEqual(taskTeamChildAddress);
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

    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryIntent;
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

    const bridgedRequest = parentDeliverInterAgentMessage.mock.calls[0]?.[0] as InterAgentMessageDeliveryIntent;
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
