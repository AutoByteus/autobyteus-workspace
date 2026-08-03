import { describe, expect, it } from "vitest";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageParticipant,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";

const buildParticipant = (
  overrides: Partial<InterAgentMessageParticipant> = {},
): InterAgentMessageParticipant => ({
  memberKind: "agent",
  memberName: "review_lead",
  memberPath: ["BuildSquad", "review_lead"],
  memberRouteKey: "BuildSquad/review_lead",
  memberRunId: "review-lead-run",
  address: {
    teamRunId: "team-parent",
    memberPath: ["BuildSquad", "review_lead"],
    memberRouteKey: "BuildSquad/review_lead",
  },
  ...overrides,
});

describe("inter-agent-message-delivery participant invariants", () => {
  it("accepts the actual participant when its address exactly matches its path", () => {
    expect(buildDeliveryEndpointForParticipant(buildParticipant())).toEqual({
      participant: buildParticipant(),
      selector: { kind: "path", memberPath: ["BuildSquad", "review_lead"] },
    });
  });

  it("rejects participant address paths that diverge from participant paths", () => {
    expect(() => buildDeliveryEndpointForParticipant(buildParticipant({
      address: {
        teamRunId: "team-parent",
        memberPath: ["BuildSquad", "qa_specialist"],
        memberRouteKey: "BuildSquad/qa_specialist",
      },
    }))).toThrow("participant.address.memberPath 'BuildSquad/qa_specialist' does not match participant.memberPath 'BuildSquad/review_lead'");
  });

  it("rejects participant route keys that diverge from the actual participant path", () => {
    expect(() => buildDeliveryEndpointForParticipant(buildParticipant({
      memberRouteKey: "BuildSquad/qa_specialist",
    }))).toThrow("participant.memberRouteKey 'BuildSquad/qa_specialist' does not match participant.memberPath 'BuildSquad/review_lead'");
  });

  it("rejects address route keys that diverge from the address path", () => {
    expect(() => buildDeliveryEndpointForParticipant(buildParticipant({
      address: {
        teamRunId: "team-parent",
        memberPath: ["BuildSquad", "review_lead"],
        memberRouteKey: "BuildSquad/qa_specialist",
      },
    }))).toThrow("memberRouteKey 'BuildSquad/qa_specialist' does not match memberPath 'BuildSquad/review_lead'");
  });
});
