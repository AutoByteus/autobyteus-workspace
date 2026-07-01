import { describe, expect, it } from "vitest";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { prefixMixedSubTeamEvent } from "../../../src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";

const memberAddress = (memberRouteKey: string) => ({
  segments: [{ kind: "member" as const, memberRouteKey }],
});

const taskTeamInstance: TaskTeamInstanceIdentity = {
  taskTeamInstanceId: "task-team-instance-1",
  taskTeamRunId: "task-team-run-1",
  parentTeamRunId: "parent-run",
  taskId: "task-1",
  logicalTeam: {
    memberName: "BuildSquad",
    memberPath: ["BuildSquad"],
    memberRouteKey: "BuildSquad",
    templateMemberRunId: "build-squad-template",
    teamDefinitionId: "build-squad-team",
    coordinatorMemberRouteKey: "review_lead",
  },
  ingress: {
    memberName: "review_lead",
    memberPath: ["review_lead"],
    memberRouteKey: "review_lead",
    memberRunId: "review-run",
  },
  createdAt: "2026-05-13T12:00:00.000Z",
};

const taskTeamChildAddress = (memberRouteKey: string) => ({
  segments: [
    { kind: "member" as const, memberRouteKey: "BuildSquad" },
    { kind: "task_team" as const, taskTeamRunId: "task-team-run-1" },
    { kind: "member" as const, memberRouteKey },
  ],
});

const communicationPayload = (overrides: Partial<TeamRunCommunicationEventPayload> = {}): TeamRunCommunicationEventPayload => ({
  messageId: "message-child",
  teamRunId: "child-run",
  senderAddress: memberAddress("review_lead"),
  receiverAddress: memberAddress("qa_specialist"),
  content: "Please test this.",
  messageType: "child_internal",
  referenceFiles: [],
  createdAt: "2026-05-13T12:00:00.000Z",
  ...overrides,
});

describe("prefixMixedSubTeamEvent", () => {
  it("normalizes static child communication payloads to the parent run and prefixes addresses", () => {
    const event = prefixMixedSubTeamEvent({
      parentTeamRunId: "parent-run",
      sourcePrefix: ["BuildSquad"],
      event: {
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: "child-run",
        sourcePath: ["review_lead"],
        data: communicationPayload(),
      } satisfies TeamRunEvent,
    });

    expect(event.teamRunId).toBe("parent-run");
    expect(event.sourcePath).toEqual(["BuildSquad", "review_lead"]);
    expect(event.data).toEqual(expect.objectContaining({
      teamRunId: "parent-run",
      senderAddress: memberAddress("BuildSquad/review_lead"),
      receiverAddress: memberAddress("BuildSquad/qa_specialist"),
    }));
    expect(event.data).not.toHaveProperty("sender");
    expect(event.data).not.toHaveProperty("receiver");
  });

  it("prefixes child-local communication addresses when the child member starts with the parent subteam segment", () => {
    const event = prefixMixedSubTeamEvent({
      parentTeamRunId: "parent-run",
      sourcePrefix: ["BuildSquad"],
      event: {
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: "child-run",
        sourcePath: ["BuildSquad"],
        data: communicationPayload({
          messageId: "message-same-name-child-source",
          senderAddress: memberAddress("BuildSquad"),
          content: "Same visible child segment.",
          createdAt: "2026-05-13T12:01:00.000Z",
        }),
      } satisfies TeamRunEvent,
    });

    expect(event.teamRunId).toBe("parent-run");
    expect(event.sourcePath).toEqual(["BuildSquad", "BuildSquad"]);
    expect(event.data).toEqual(expect.objectContaining({
      teamRunId: "parent-run",
      senderAddress: memberAddress("BuildSquad/BuildSquad"),
      receiverAddress: memberAddress("BuildSquad/qa_specialist"),
    }));
  });

  it("preserves task-team scoped communication addresses during parent republish", () => {
    const event = prefixMixedSubTeamEvent({
      parentTeamRunId: "parent-run",
      sourcePrefix: ["BuildSquad"],
      taskTeamInstance,
      event: {
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: "task-team-run-1",
        sourcePath: ["review_lead"],
        data: communicationPayload({
          messageId: "message-task-team-child",
          teamRunId: "task-team-run-1",
          senderAddress: taskTeamChildAddress("review_lead"),
          receiverAddress: taskTeamChildAddress("qa_specialist"),
          createdAt: "2026-05-13T12:02:00.000Z",
        }),
      } satisfies TeamRunEvent,
    });

    expect(event.teamRunId).toBe("parent-run");
    expect(event.sourcePath).toEqual(["BuildSquad", "review_lead"]);
    expect(event.data).toEqual(expect.objectContaining({
      teamRunId: "parent-run",
      senderAddress: taskTeamChildAddress("review_lead"),
      receiverAddress: taskTeamChildAddress("qa_specialist"),
    }));
    expect(event.taskTeamInstance).toEqual(taskTeamInstance);
  });

  it("prefixes child agent event member identity for parent-rooted websocket projection", () => {
    const event = prefixMixedSubTeamEvent({
      parentTeamRunId: "parent-run",
      sourcePrefix: ["BuildSquad"],
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: "child-run",
        sourcePath: ["review_lead"],
        data: {
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberName: "review_lead",
          memberRunId: "review-run",
          memberPath: ["review_lead"],
          memberRouteKey: "review_lead",
          agentEvent: {
            eventType: AgentRunEventType.AGENT_STATUS,
            runId: "review-run",
            payload: {
              status: "running",
              can_interrupt: false,
              agent_id: "review-run",
              agent_name: "review_lead",
            },
            statusHint: "ACTIVE",
          },
        },
      } satisfies TeamRunEvent,
    });

    expect(event.teamRunId).toBe("parent-run");
    expect(event.sourcePath).toEqual(["BuildSquad", "review_lead"]);
    expect(event.data).toEqual(expect.objectContaining({
      memberName: "review_lead",
      memberRunId: "review-run",
      memberPath: ["BuildSquad", "review_lead"],
      memberRouteKey: "BuildSquad/review_lead",
    }));
  });
});
