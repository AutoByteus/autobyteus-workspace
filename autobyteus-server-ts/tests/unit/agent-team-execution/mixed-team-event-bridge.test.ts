import { describe, expect, it } from "vitest";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { prefixMixedSubTeamEvent } from "../../../src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.js";

describe("prefixMixedSubTeamEvent", () => {
  it("normalizes child communication payloads to the parent run and prefixes participants", () => {
    const childPayload: TeamRunCommunicationEventPayload = {
      messageId: "message-child",
      teamRunId: "child-run",
      sender: {
        memberKind: "agent",
        memberName: "review_lead",
        memberPath: ["review_lead"],
        memberRouteKey: "review_lead",
        memberRunId: "review-run",
        address: {
          teamRunId: "child-run",
          memberPath: ["review_lead"],
          memberRouteKey: "review_lead",
        },
      },
      receiver: {
        memberKind: "agent",
        memberName: "qa_specialist",
        memberPath: ["qa_specialist"],
        memberRouteKey: "qa_specialist",
        memberRunId: "qa-run",
        address: {
          teamRunId: "child-run",
          memberPath: ["qa_specialist"],
          memberRouteKey: "qa_specialist",
        },
      },
      content: "Please test this.",
      messageType: "child_internal",
      referenceFiles: [],
      createdAt: "2026-05-13T12:00:00.000Z",
    };

    const event = prefixMixedSubTeamEvent({
      parentTeamRunId: "parent-run",
      sourcePrefix: ["BuildSquad"],
      event: {
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: "child-run",
        sourcePath: ["review_lead"],
        data: childPayload,
      } satisfies TeamRunEvent,
    });

    expect(event.teamRunId).toBe("parent-run");
    expect(event.sourcePath).toEqual(["BuildSquad", "review_lead"]);
    expect(event.data).toEqual(expect.objectContaining({
      teamRunId: "parent-run",
      sender: expect.objectContaining({
        memberPath: ["BuildSquad", "review_lead"],
        memberRouteKey: "BuildSquad/review_lead",
        address: {
          teamRunId: "parent-run",
          memberPath: ["BuildSquad", "review_lead"],
          memberRouteKey: "BuildSquad/review_lead",
        },
      }),
      receiver: expect.objectContaining({
        memberPath: ["BuildSquad", "qa_specialist"],
        memberRouteKey: "BuildSquad/qa_specialist",
        address: {
          teamRunId: "parent-run",
          memberPath: ["BuildSquad", "qa_specialist"],
          memberRouteKey: "BuildSquad/qa_specialist",
        },
      }),
    }));
  });

  it("prefixes child-local source paths even when they start with the parent subteam segment", () => {
    const childPayload: TeamRunCommunicationEventPayload = {
      messageId: "message-same-name-child-source",
      teamRunId: "child-run",
      sender: {
        memberKind: "agent",
        memberName: "BuildSquad",
        memberPath: ["BuildSquad"],
        memberRouteKey: "BuildSquad",
        memberRunId: "nested-buildsquad-run",
        address: {
          teamRunId: "child-run",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
        },
      },
      receiver: {
        memberKind: "agent",
        memberName: "qa_specialist",
        memberPath: ["qa_specialist"],
        memberRouteKey: "qa_specialist",
        memberRunId: "qa-run",
        address: {
          teamRunId: "child-run",
          memberPath: ["qa_specialist"],
          memberRouteKey: "qa_specialist",
        },
      },
      content: "Same visible child segment.",
      messageType: "child_internal",
      referenceFiles: [],
      createdAt: "2026-05-13T12:01:00.000Z",
    };

    const event = prefixMixedSubTeamEvent({
      parentTeamRunId: "parent-run",
      sourcePrefix: ["BuildSquad"],
      event: {
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: "child-run",
        sourcePath: ["BuildSquad"],
        data: childPayload,
      } satisfies TeamRunEvent,
    });

    expect(event.teamRunId).toBe("parent-run");
    expect(event.sourcePath).toEqual(["BuildSquad", "BuildSquad"]);
    expect(event.data).toEqual(expect.objectContaining({
      teamRunId: "parent-run",
      sender: expect.objectContaining({
        memberPath: ["BuildSquad", "BuildSquad"],
        memberRouteKey: "BuildSquad/BuildSquad",
        address: {
          teamRunId: "parent-run",
          memberPath: ["BuildSquad", "BuildSquad"],
          memberRouteKey: "BuildSquad/BuildSquad",
        },
      }),
    }));
  });
});
