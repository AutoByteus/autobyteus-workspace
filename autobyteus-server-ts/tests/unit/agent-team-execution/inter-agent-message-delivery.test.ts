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
  representedSubTeam: {
    memberKind: "agent_team",
    memberName: "BuildSquad",
    memberPath: ["BuildSquad"],
    memberRouteKey: "BuildSquad",
    memberRunId: "build-squad-run",
    teamDefinitionId: "build-squad-team",
    address: {
      teamRunId: "team-parent",
      memberPath: ["BuildSquad"],
      memberRouteKey: "BuildSquad",
    },
  },
  ...overrides,
});

describe("inter-agent-message-delivery participant invariants", () => {
  it("accepts participant and represented-subteam addresses that exactly match their paths", () => {
    expect(() => buildDeliveryEndpointForParticipant(buildParticipant())).not.toThrow();
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

  it("rejects represented-subteam address paths that diverge from represented-subteam paths", () => {
    expect(() => buildDeliveryEndpointForParticipant(buildParticipant({
      representedSubTeam: {
        memberKind: "agent_team",
        memberName: "BuildSquad",
        memberPath: ["BuildSquad"],
        memberRouteKey: "BuildSquad",
        memberRunId: "build-squad-run",
        teamDefinitionId: "build-squad-team",
        address: {
          teamRunId: "team-parent",
          memberPath: ["OtherSquad"],
          memberRouteKey: "OtherSquad",
        },
      },
    }))).toThrow("representedSubTeam.address.memberPath 'OtherSquad' does not match representedSubTeam.memberPath 'BuildSquad'");
  });

  it("rejects represented-subteam paths that are not a participant path prefix", () => {
    expect(() => buildDeliveryEndpointForParticipant(buildParticipant({
      representedSubTeam: {
        memberKind: "agent_team",
        memberName: "OtherSquad",
        memberPath: ["OtherSquad"],
        memberRouteKey: "OtherSquad",
        memberRunId: "other-squad-run",
        teamDefinitionId: "other-squad-team",
        address: {
          teamRunId: "team-parent",
          memberPath: ["OtherSquad"],
          memberRouteKey: "OtherSquad",
        },
      },
    }))).toThrow("participant.representedSubTeam.memberPath 'OtherSquad' is not a prefix of participant.memberPath 'BuildSquad/review_lead'");
  });
});
