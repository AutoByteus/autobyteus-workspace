import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedSubTeamMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.js";
import { MixedSubTeamMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { ResolvedInterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { getSubTeamActiveRunDirectory } from "../../../src/agent-team-execution/services/sub-team-active-run-directory.js";
import { testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const reviewTeam = testAgentTeamNode({
  address: "/ReviewTeam",
  coordinatorAddress: "/ReviewTeam/Reviewer",
  teamDefinitionId: "review-team",
  teamRunId: "child-review-1",
  children: [
    testAgentNode("/ReviewTeam/Reviewer", {
      agentRunId: "run-reviewer",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/ReviewTeam/Observer", {
      agentRunId: "run-observer",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
  ],
});
const config = testTeamRunConfig({
  rootTeamRunId: "parent-1",
  coordinatorAddress: "/Lead",
  children: [testAgentNode("/Lead", { agentRunId: "run-lead" }), reviewTeam],
});

const build = () => {
  let active = true;
  const childPostMessage = vi.fn(async () => ({ accepted: true }));
  const childDeliverResolvedInterAgentMessage = vi.fn(async () => ({ accepted: true }));
  const childRuntime = new MixedTeamRunContext({
    memberContexts: [],
    teamExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: "parent-1",
      taskTeamRunIds: [],
      memberAddress: "/ReviewTeam/Reviewer",
    }),
  });
  const childRun = {
    teamRunId: "child-review-1",
    isActive: vi.fn(() => active),
    getRuntimeContext: vi.fn(() => childRuntime),
    subscribeToEvents: vi.fn(() => () => undefined),
    getLeafAgentStatusSnapshots: vi.fn(() => []),
    hasOpenExecutionWork: vi.fn(() => false),
    postMessage: childPostMessage,
    deliverResolvedInterAgentMessage: childDeliverResolvedInterAgentMessage,
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interruptMember: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => {
      active = false;
      return { accepted: true };
    }),
  };
  const subTeamRunFactory = { createOrRestore: vi.fn(async () => childRun) };
  const parentContext = new TeamRunContext({
    teamRunId: "parent-1",
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [],
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: "parent-1",
        taskTeamRunIds: [],
        memberAddress: "/Lead",
      }),
    }),
  });
  const context = new MixedSubTeamMemberContext({
    address: "/ReviewTeam",
    teamDefinitionId: "review-team",
    teamRunId: "child-review-1",
  });
  const handle = new MixedSubTeamMemberHandle({
    parentContext,
    context,
    config: reviewTeam,
    subTeamRunFactory: subTeamRunFactory as never,
    publish: vi.fn(),
    deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
  });
  return {
    handle,
    childDeliverResolvedInterAgentMessage,
    childPostMessage,
    childRun,
    subTeamRunFactory,
  };
};

describe("MixedSubTeamMemberHandle", () => {
  it("routes parent-to-subteam messages to the configured canonical child coordinator", async () => {
    const { handle, childPostMessage, subTeamRunFactory } = build();
    const message = new AgentInputUserMessage("please review");

    await expect(handle.postMessage(message)).resolves.toMatchObject({
      accepted: true,
      displayName: "/ReviewTeam",
    });
    expect(subTeamRunFactory.createOrRestore).toHaveBeenCalledWith(expect.objectContaining({
      config,
      teamNode: reviewTeam,
      parentBoundary: expect.objectContaining({
        parentTeamRunId: "parent-1",
        rootTeamRunId: "parent-1",
        parentTeamAddress: "/",
      }),
    }));
    expect(childPostMessage).toHaveBeenCalledWith(message, "/ReviewTeam/Reviewer");
    expect(getSubTeamActiveRunDirectory().resolveActiveRun("child-review-1")?.teamRunId)
      .toBe("child-review-1");
    await expect(handle.terminate()).resolves.toMatchObject({ accepted: true });
    expect(getSubTeamActiveRunDirectory().resolveActiveRun("child-review-1")).toBeNull();
  });

  it("forwards the complete resolved child request without path or run reinterpretation", async () => {
    const { handle, childDeliverResolvedInterAgentMessage, childPostMessage } = build();
    const senderAddress = createTeamExecutionAddress({
      rootTeamRunId: "parent-1",
      taskTeamRunIds: [],
      memberAddress: "/Lead",
    });
    const receiverAddress = createTeamExecutionAddress({
      rootTeamRunId: "parent-1",
      taskTeamRunIds: [],
      memberAddress: "/ReviewTeam/Reviewer",
    });
    const request: ResolvedInterAgentMessageDeliveryRequest = {
      rootTeamRunId: "parent-1",
      callerAddressing: { rootTeamRunId: "parent-1", memberAddress: "/Lead" },
      recipientAddress: "/ReviewTeam/Reviewer",
      sender: { participant: {
        kind: "agent",
        displayName: "Lead",
        agentRunId: "run-lead",
        executionAddress: senderAddress,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      } },
      recipient: { participant: {
        kind: "agent",
        displayName: "Reviewer",
        agentRunId: "run-reviewer",
        executionAddress: receiverAddress,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      } },
      senderAddress,
      receiverAddress,
      resolvedTargetKind: "logical_member",
      targetAgentRunId: "run-reviewer",
      content: "Please review.",
      messageType: "direct_message",
    };

    const beforePublishMemberInput = vi.fn();
    await expect(handle.deliverInterMemberMessage(request, beforePublishMemberInput))
      .resolves.toEqual({ accepted: true });
    expect(childDeliverResolvedInterAgentMessage)
      .toHaveBeenCalledWith(request, beforePublishMemberInput);
    expect(childDeliverResolvedInterAgentMessage).toHaveBeenCalledTimes(1);
    expect(childPostMessage).not.toHaveBeenCalled();
    await expect(handle.terminate()).resolves.toMatchObject({ accepted: true });
  });
});
