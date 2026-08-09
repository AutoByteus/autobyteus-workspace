import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamMemberDeliveryCoordinator } from "../../../src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.js";
import { buildDeliveryEndpointForParticipant, type InterAgentMessageDeliveryIntent, type InterAgentMessageParticipant } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const senderAddress = createTeamExecutionAddress({
  rootTeamRunId: "root-run",
  taskTeamRunIds: [],
  memberAddress: "/research_lead",
});
const recipientAddress = createTeamExecutionAddress({
  rootTeamRunId: "root-run",
  taskTeamRunIds: [],
  memberAddress: "/product_manager",
});
const sender: InterAgentMessageParticipant = {
  kind: "agent",
  displayName: "research_lead",
  agentRunId: "run-research-lead",
  executionAddress: senderAddress,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
  taskId: null,
};
const recipient: InterAgentMessageParticipant = {
  kind: "agent",
  displayName: "product_manager",
  agentRunId: "run-product-manager",
  executionAddress: recipientAddress,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
  taskId: null,
};
const recipientContext = new MixedAgentMemberContext({
  address: "/product_manager",
  agentRunId: recipient.agentRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
});
const intent: InterAgentMessageDeliveryIntent = {
  rootTeamRunId: "root-run",
  callerAddressing: { rootTeamRunId: "root-run", memberAddress: "/research_lead" },
  recipientAddress: "/product_manager",
  sender: buildDeliveryEndpointForParticipant(sender),
  content: "Research is ready for product review.",
  messageType: "handoff",
};

const createSubject = (accepted: boolean) => {
  const published: TeamRunEvent[] = [];
  const delivery = vi.fn(async (_request, beforeCommit?: (() => void) | null) => {
    if (accepted) beforeCommit?.();
    return accepted
      ? { accepted: true, code: "DELIVERED" }
      : { accepted: false, code: "RECIPIENT_REJECTED", message: "Recipient rejected input." };
  });
  const config = testTeamRunConfig({
    rootTeamRunId: "root-run",
    coordinatorAddress: "/product_manager",
    children: [
      testAgentNode("/product_manager", { agentRunId: "run-product-manager" }),
      testAgentNode("/research_lead", { agentRunId: "run-research-lead" }),
    ],
  });
  const context = new TeamRunContext({
    teamRunId: "root-run",
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [recipientContext],
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: "root-run",
        taskTeamRunIds: [],
        memberAddress: "/product_manager",
      }),
    }),
  });
  const coordinator = new TeamMemberDeliveryCoordinator({
    teamContext: context,
    memberRegistry: {
      resolveContext: vi.fn(),
      getOrCreate: () => ({ deliverInterMemberMessage: delivery }) as never,
    },
    publish: (event) => published.push(event),
  });
  return { coordinator, delivery, published };
};

describe("TeamMemberDeliveryCoordinator", () => {
  it("commits recipient input once and publishes one canonical accepted communication", async () => {
    const { coordinator, delivery, published } = createSubject(true);

    await expect(coordinator.deliver(intent, {
      memberContext: recipientContext,
      endpoint: buildDeliveryEndpointForParticipant(recipient),
      targetAgentRunId: recipient.agentRunId,
    })).resolves.toMatchObject({
      accepted: true,
      agentRunId: "run-product-manager",
      displayName: "product_manager",
    });

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: "root-run",
      executionAddress: senderAddress,
      data: {
        teamRunId: "root-run",
        senderAddress,
        receiverAddress: recipientAddress,
        content: "Research is ready for product review.",
        messageType: "handoff",
      },
    });
    expect(published[0]?.data).not.toHaveProperty("senderRouteKey");
  });

  it("publishes no accepted communication when recipient input is rejected", async () => {
    const { coordinator, delivery, published } = createSubject(false);

    await expect(coordinator.deliver(intent, {
      memberContext: recipientContext,
      endpoint: buildDeliveryEndpointForParticipant(recipient),
      targetAgentRunId: recipient.agentRunId,
    })).resolves.toMatchObject({ accepted: false, code: "RECIPIENT_REJECTED" });

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(published).toEqual([]);
  });
});
