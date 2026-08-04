import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import {
  prefixMixedSubTeamEvent,
  prefixMixedTeamLeafAgentStatusSnapshot,
  prefixMixedTeamStreamScope,
} from "../../../src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.js";
import { buildOrdinaryTeamLeafAgentStatusSnapshot } from "../../../src/agent-team-execution/domain/team-leaf-agent-status-snapshot.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import { buildTaskTeamStreamScope } from "../../../src/agent-team-execution/domain/task-team-stream-scope.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const taskTeamInstance: TaskTeamInstanceIdentity = {
  taskTeamInstanceId: "task-team-instance-7",
  taskTeamRunId: "task-team-run-7",
  parentTeamRunId: "research-run-2",
  taskId: "task-42",
  logicalTeam: {
    memberName: "review_team",
    memberPath: ["review_team"],
    memberRouteKey: "stale-route-key-is-rebuilt",
    templateMemberRunId: "review-team-template",
    teamDefinitionId: "review-team-definition",
    coordinatorMemberRouteKey: "review_group/critic",
  },
  ingress: {
    memberName: "critic",
    memberPath: ["review_group", "critic"],
    memberRouteKey: "review_group/critic",
    memberRunId: "critic-runtime-93",
  },
  createdAt: "2026-08-02T12:00:00.000Z",
};

const taskTeamScope = buildTaskTeamStreamScope({
  taskTeamInstance,
  parentTeamRunId: "research-run-2",
});

const memberAddress = (memberRouteKey: string) => ({
  segments: [{ kind: "member" as const, memberRouteKey }],
});

const taskTeamChildAddress = (memberRouteKey: string) => ({
  segments: [
    { kind: "member" as const, memberRouteKey: "review_team" },
    { kind: "task_team" as const, taskTeamRunId: "task-team-run-7" },
    { kind: "member" as const, memberRouteKey },
  ],
});

const communicationPayload = (
  overrides: Partial<TeamRunCommunicationEventPayload> = {},
): TeamRunCommunicationEventPayload => ({
  messageId: "message-child",
  teamRunId: "research-run-2",
  senderAddress: memberAddress("review_lead"),
  receiverAddress: memberAddress("qa_specialist"),
  content: "Please test this.",
  messageType: "child_internal",
  referenceFiles: [],
  createdAt: "2026-08-02T12:00:00.000Z",
  ...overrides,
});

const agentEvent = (sourcePath = ["review_group", "critic"]): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  teamRunId: "task-team-run-7",
  sourcePath,
  data: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberName: "critic",
    memberRunId: "critic-runtime-93",
    memberPath: [...sourcePath],
    memberRouteKey: sourcePath.join("/"),
    agentEvent: {
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "critic-runtime-93",
      payload: { status: "running" },
      statusHint: "ACTIVE",
    },
  } satisfies TeamRunAgentEventPayload,
});

const throughTaskTeamAndOrdinaryParent = (event: TeamRunEvent): TeamRunEvent => {
  const researchFrame = prefixMixedSubTeamEvent({
    parentTeamRunId: "research-run-2",
    sourcePrefix: ["review_team"],
    event,
    taskTeamScopeOverride: taskTeamScope,
  });
  return prefixMixedSubTeamEvent({
    parentTeamRunId: "root-team-1",
    sourcePrefix: ["research_group"],
    event: researchFrame,
  });
};

describe("task-team stream scope", () => {
  it("derives a tight target-parent-frame scope and rebuilds its route key", () => {
    expect(taskTeamScope).toEqual({
      taskTeamRunId: "task-team-run-7",
      taskTeamInstanceId: "task-team-instance-7",
      taskId: "task-42",
      logicalTeamPath: ["review_team"],
      logicalTeamRouteKey: "review_team",
    });
    expect(taskTeamScope).not.toHaveProperty("parentTeamRunId");
    expect(taskTeamScope).not.toHaveProperty("ingress");
    expect(taskTeamScope).not.toHaveProperty("coordinatorMemberRouteKey");
  });

  it("rejects a target-parent-frame override built for another parent", () => {
    expect(() => buildTaskTeamStreamScope({
      taskTeamInstance,
      parentTeamRunId: "wrong-parent",
    })).toThrow("belongs to parent team run 'research-run-2', not 'wrong-parent'");
  });

  it("rebases retained logical scope with the source path and rebuilds the route key", () => {
    expect(prefixMixedTeamStreamScope({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      scope: {
        teamRunId: "research-run-2",
        sourcePath: ["review_team", "review_group", "critic"],
        taskTeamScope,
      },
    })).toEqual({
      teamRunId: "root-team-1",
      sourcePath: ["research_group", "review_team", "review_group", "critic"],
      sourceRouteKey: "research_group/review_team/review_group/critic",
      taskTeamScope: {
        ...taskTeamScope,
        logicalTeamPath: ["research_group", "review_team"],
        logicalTeamRouteKey: "research_group/review_team",
      },
    });
  });

  it("rejects a source path outside the selected target-parent frame", () => {
    expect(() => prefixMixedTeamStreamScope({
      parentTeamRunId: "research-run-2",
      sourcePrefix: ["different_team"],
      scope: {
        teamRunId: "task-team-run-7",
        sourcePath: ["review_group", "critic"],
        taskTeamScope: null,
      },
      taskTeamScopeOverride: taskTeamScope,
    })).toThrow("outside task-team scope 'review_team'");
  });
});

describe("prefixMixedSubTeamEvent", () => {
  it("normalizes ordinary communication payloads and avoids repeat-prefixing", () => {
    const childEvent = {
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: "research-run-2",
      sourcePath: ["review_lead"],
      data: communicationPayload(),
    } satisfies TeamRunEvent;
    const first = prefixMixedSubTeamEvent({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      event: childEvent,
    });
    const second = prefixMixedSubTeamEvent({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      event: first,
    });

    expect(second.sourcePath).toEqual(["research_group", "review_lead"]);
    expect(second.data).toEqual(expect.objectContaining({
      teamRunId: "root-team-1",
      senderAddress: memberAddress("research_group/review_lead"),
      receiverAddress: memberAddress("research_group/qa_specialist"),
    }));
  });

  it("preserves task-team conversation segments using only scoped task-team run identity", () => {
    const result = throughTaskTeamAndOrdinaryParent({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: "task-team-run-7",
      sourcePath: ["review_group", "critic"],
      data: communicationPayload({
        teamRunId: "task-team-run-7",
        senderAddress: taskTeamChildAddress("critic"),
        receiverAddress: taskTeamChildAddress("reviewer"),
      }),
    });

    expect(result.data).toEqual(expect.objectContaining({
      teamRunId: "root-team-1",
      senderAddress: taskTeamChildAddress("critic"),
      receiverAddress: taskTeamChildAddress("reviewer"),
    }));
    expect(result.taskTeamScope).toMatchObject({
      logicalTeamPath: ["research_group", "review_team"],
      logicalTeamRouteKey: "research_group/review_team",
    });
  });

  it.each([
    [TeamRunEventSourceType.TASK_DELEGATION, {
      eventType: "TASK_DELEGATION_STATUS_UPDATED",
      payload: { taskId: "task-42" },
    }],
    [TeamRunEventSourceType.COMMUNICATION, communicationPayload({
      teamRunId: "task-team-run-7",
      senderAddress: taskTeamChildAddress("critic"),
      receiverAddress: taskTeamChildAddress("reviewer"),
    })],
    [TeamRunEventSourceType.MEMBER_INPUT, {
      messageId: "input-1",
      dedupeKey: "dedupe-1",
      teamRunId: "task-team-run-7",
      recipientMemberRunId: "critic-runtime-93",
      recipientMemberName: "critic",
      recipientMemberPath: ["review_group", "critic"],
      recipientMemberRouteKey: "review_group/critic",
      content: "Continue.",
      inputOrigin: "user_message",
      receivedAt: "2026-08-02T12:00:00.000Z",
      contextFilePaths: [],
    }],
  ] as const)("rebases %s events through the shared scope core", (eventSourceType, data) => {
    const result = throughTaskTeamAndOrdinaryParent({
      eventSourceType,
      teamRunId: "task-team-run-7",
      sourcePath: [],
      data,
    } as TeamRunEvent);

    expect(result).toMatchObject({
      eventSourceType,
      teamRunId: "root-team-1",
      sourcePath: ["research_group", "review_team"],
      taskTeamScope: {
        taskTeamRunId: "task-team-run-7",
        logicalTeamPath: ["research_group", "review_team"],
        logicalTeamRouteKey: "research_group/review_team",
      },
    });
  });

  it("rebases a live agent through task-team and ordinary frames without double prefix", () => {
    const rootEvent = throughTaskTeamAndOrdinaryParent(agentEvent());
    const repeated = prefixMixedSubTeamEvent({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      event: rootEvent,
    });

    expect(repeated).toMatchObject({
      teamRunId: "root-team-1",
      sourcePath: ["research_group", "review_team", "review_group", "critic"],
      taskTeamScope: {
        logicalTeamPath: ["research_group", "review_team"],
        logicalTeamRouteKey: "research_group/review_team",
      },
      data: {
        memberPath: ["research_group", "review_team", "review_group", "critic"],
        memberRouteKey: "research_group/review_team/review_group/critic",
      },
    });
  });

  it("rebases through repeated distinct ordinary parents and remains idempotent in the root frame", () => {
    const researchFrame = prefixMixedSubTeamEvent({
      parentTeamRunId: "research-run-2",
      sourcePrefix: ["review_team"],
      event: agentEvent(),
      taskTeamScopeOverride: taskTeamScope,
    });
    const divisionFrame = prefixMixedSubTeamEvent({
      parentTeamRunId: "division-run-3",
      sourcePrefix: ["analysis_group"],
      event: researchFrame,
    });
    const rootFrame = prefixMixedSubTeamEvent({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      event: divisionFrame,
    });
    const repeated = prefixMixedSubTeamEvent({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      event: rootFrame,
    });

    const expectedLeafPath = [
      "research_group",
      "analysis_group",
      "review_team",
      "review_group",
      "critic",
    ];
    expect(repeated.sourcePath).toEqual(expectedLeafPath);
    expect((repeated.data as TeamRunAgentEventPayload).memberPath).toEqual(expectedLeafPath);
    expect(repeated.taskTeamScope).toMatchObject({
      logicalTeamPath: ["research_group", "analysis_group", "review_team"],
      logicalTeamRouteKey: "research_group/analysis_group/review_team",
    });
  });

  it("rejects a task-team AGENT event without a relative leaf selector", () => {
    const event = agentEvent(["critic"]);
    event.sourcePath = [];
    expect(() => prefixMixedSubTeamEvent({
      parentTeamRunId: "research-run-2",
      sourcePrefix: ["review_team"],
      event,
      taskTeamScopeOverride: taskTeamScope,
    })).toThrow("with a nonempty relative member path");
  });
});

describe("prefixMixedTeamLeafAgentStatusSnapshot", () => {
  it("uses the same multi-boundary coordinate transition for reconnect snapshots", () => {
    const childSnapshot = buildOrdinaryTeamLeafAgentStatusSnapshot({
      teamRunId: "task-team-run-7",
      payload: {
        status: "running",
        agent_id: "critic-runtime-93",
        agent_name: "critic",
        member_route_key: "review_group/critic",
        member_path: ["review_group", "critic"],
        source_route_key: "review_group/critic",
        source_path: ["review_group", "critic"],
      },
    });
    const researchSnapshot = prefixMixedTeamLeafAgentStatusSnapshot({
      parentTeamRunId: "research-run-2",
      sourcePrefix: ["review_team"],
      snapshot: childSnapshot,
      taskTeamScopeOverride: taskTeamScope,
    });
    const rootSnapshot = prefixMixedTeamLeafAgentStatusSnapshot({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      snapshot: researchSnapshot,
    });
    const repeated = prefixMixedTeamLeafAgentStatusSnapshot({
      parentTeamRunId: "root-team-1",
      sourcePrefix: ["research_group"],
      snapshot: rootSnapshot,
    });

    expect(repeated).toEqual(expect.objectContaining({
      scopeKind: "task_team_member",
      teamRunId: "root-team-1",
      taskTeamScope: {
        ...taskTeamScope,
        logicalTeamPath: ["research_group", "review_team"],
        logicalTeamRouteKey: "research_group/review_team",
      },
      payload: expect.objectContaining({
        member_path: ["research_group", "review_team", "review_group", "critic"],
        member_route_key: "research_group/review_team/review_group/critic",
        source_path: ["research_group", "review_team", "review_group", "critic"],
        source_route_key: "research_group/review_team/review_group/critic",
      }),
    }));
  });
});
