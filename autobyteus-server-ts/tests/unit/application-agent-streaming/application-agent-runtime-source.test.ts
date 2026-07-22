import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { ApplicationAgentStreamRuntimeSource } from "../../../src/application-agent-streaming/services/application-agent-stream-runtime-source.js";
import { ApplicationAgentEventMapper } from "../../../src/application-agent-streaming/services/application-agent-stream-event-mapper.js";

describe("ApplicationAgentStreamRuntimeSource team attribution", () => {
  it("attributes nested task-agent events through the closed producer envelope and filters selected members", () => {
    let listener!: (event: any) => void;
    const runtimeSource = new ApplicationAgentStreamRuntimeSource({
      teamRunManager: {
        getActiveRun: () => ({ subscribeToEvents: (next: typeof listener) => { listener = next; return () => undefined; } }),
      },
    });
    const captured: any[] = [];
    runtimeSource.attach({
      applicationId: "app-1",
      address: { bindingId: "binding-1", target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "researcher" } },
      runtimeSubject: "TEAM_RUN",
      runtimeRunId: "team-run-1",
      producers: [{ runId: "member-run-1", memberRouteKey: "researcher", memberName: "Researcher", displayName: "Researcher", runtimeKind: "AGENT_TEAM_MEMBER", teamPath: ["researcher"] }],
    }, (event) => captured.push(event));

    listener({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["researcher"],
      data: {
        runtimeKind: "autobyteus",
        memberName: "Researcher",
        memberRunId: "template-run-secret",
        memberPath: ["researcher"],
        memberRouteKey: "researcher",
        taskAgentInstance: {
          taskAgentInstanceId: "instance-secret",
          taskAgentRunId: "task-run-1",
          teamRunId: "team-run-1",
          taskId: "task-secret",
          createdAt: "2026-07-21T00:00:00.000Z",
          logicalMember: { memberName: "Researcher", memberPath: ["researcher"], memberRouteKey: "researcher", templateMemberRunId: "template-run-secret" },
        },
        agentEvent: { eventType: AgentRunEventType.TURN_STARTED, runId: "task-run-1", statusHint: null, payload: { turnId: "turn-1", providerThreadId: "secret" } },
      },
    });
    listener({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["writer"],
      data: {
        runtimeKind: "autobyteus", memberName: "Writer", memberRunId: "writer-run", memberPath: ["writer"], memberRouteKey: "writer",
        agentEvent: { eventType: AgentRunEventType.TURN_STARTED, runId: "writer-run", statusHint: null, payload: { turnId: "drop" } },
      },
    });

    expect(captured).toHaveLength(1);
    const mapped = new ApplicationAgentEventMapper().map(captured[0]);
    expect(mapped).toEqual({
      producer: { runId: "task-run-1", memberRouteKey: "researcher", memberName: "Researcher", displayName: "Researcher", runtimeKind: "AGENT_TEAM_MEMBER", teamPath: ["researcher"] },
      event: { type: "TURN_STARTED" },
    });
    expect(JSON.stringify(mapped)).not.toContain("providerThreadId");
    expect(JSON.stringify(mapped)).not.toContain("instance-secret");
  });

  it("drops every non-agent team source before public projection", () => {
    const mapper = new ApplicationAgentEventMapper();
    for (const eventSourceType of Object.values(TeamRunEventSourceType)) {
      if (eventSourceType === TeamRunEventSourceType.AGENT) continue;
      expect(mapper.map({
        source: "AGENT_TEAM",
        producer: null,
        event: {
          eventSourceType,
          teamRunId: "team-run-1",
          sourcePath: [],
          data: { providerSecret: "must-not-cross" },
        } as never,
      })).toBeNull();
    }
  });
});
