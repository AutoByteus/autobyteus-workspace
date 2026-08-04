import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamMemberDeliveryCoordinator } from "../../../src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.js";
import { buildDeliveryEndpointForParticipant, type InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";

const sender = {
  memberKind: "agent" as const,
  memberName: "research_lead",
  memberPath: ["research", "research_lead"],
  memberRouteKey: "research/research_lead",
  memberRunId: "run-research-lead",
  address: {
    teamRunId: "root-run",
    memberPath: ["research", "research_lead"],
    memberRouteKey: "research/research_lead",
  },
};
const recipient = {
  memberKind: "agent" as const,
  memberName: "product_manager",
  memberPath: ["product_manager"],
  memberRouteKey: "product_manager",
  memberRunId: "run-product-manager",
  address: {
    teamRunId: "root-run",
    memberPath: ["product_manager"],
    memberRouteKey: "product_manager",
  },
};
const recipientContext = new MixedAgentMemberContext({
  memberName: recipient.memberName,
  memberPath: recipient.memberPath,
  memberRouteKey: recipient.memberRouteKey,
  memberRunId: recipient.memberRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
});
const intent: InterAgentMessageDeliveryIntent = {
  teamRunId: "root-run",
  callerAddressing: {
    rootTeamRunId: "root-run",
    memberAddress: "/research/research_lead",
  },
  recipientName: "/product_manager",
  sender: buildDeliveryEndpointForParticipant(sender),
  senderAddress: {
    segments: [{ kind: "member", memberRouteKey: "research/research_lead" }],
  },
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
  const context = new TeamRunContext({
    runId: "root-run",
    teamBackendKind: TeamBackendKind.MIXED,
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "product_manager",
      memberContexts: [recipientContext],
      collaborationRootTeamRunId: "root-run",
      teamMountPath: [],
      effectiveHandoffs: [],
    }),
  });
  const coordinator = new TeamMemberDeliveryCoordinator({
    teamContext: context,
    memberRegistry: {
      resolveContext: vi.fn(),
      getOrCreate: () => ({ deliverInterMemberMessage: delivery }) as never,
    },
    publish: (event) => published.push(event),
    notifyStatusChange: vi.fn(),
  });
  return { coordinator, delivery, published };
};

describe("TeamMemberDeliveryCoordinator", () => {
  it("commits recipient input once and publishes one accepted communication with actual participants", async () => {
    const { coordinator, delivery, published } = createSubject(true);

    await expect(coordinator.deliver(intent, {
      memberContext: recipientContext,
      endpoint: buildDeliveryEndpointForParticipant(recipient),
      targetAgentRunId: recipient.memberRunId,
    })).resolves.toMatchObject({
      accepted: true,
      memberRunId: "run-product-manager",
      memberName: "product_manager",
    });

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: "root-run",
      sourcePath: ["research", "research_lead"],
      data: {
        senderAddress: { segments: [{ kind: "member", memberRouteKey: "research/research_lead" }] },
        receiverAddress: { segments: [{ kind: "member", memberRouteKey: "product_manager" }] },
        content: "Research is ready for product review.",
      },
    });
  });

  it("publishes no accepted communication when recipient input is rejected", async () => {
    const { coordinator, delivery, published } = createSubject(false);

    await expect(coordinator.deliver(intent, {
      memberContext: recipientContext,
      endpoint: buildDeliveryEndpointForParticipant(recipient),
      targetAgentRunId: recipient.memberRunId,
    })).resolves.toMatchObject({ accepted: false, code: "RECIPIENT_REJECTED" });

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(published).toEqual([]);
  });
});
