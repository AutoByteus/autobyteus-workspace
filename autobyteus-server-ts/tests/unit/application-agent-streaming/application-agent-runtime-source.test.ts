import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { ApplicationAgentStreamRuntimeSource } from "../../../src/application-agent-streaming/services/application-agent-stream-runtime-source.js";
import { ApplicationAgentEventMapper } from "../../../src/application-agent-streaming/services/application-agent-stream-event-mapper.js";

describe("ApplicationAgentStreamRuntimeSource team attribution", () => {
  it("attributes nested current team-agent events through the closed producer envelope and filters selected members", () => {
    let listener!: (event: { changeSequence: number; event: any }) => void;
    const runtimeSource = new ApplicationAgentStreamRuntimeSource({
      agentRunManager: { getActiveRun: () => null },
      teamRunManager: {
        getActiveTeamRun: () => ({ subscribeToEvents: (next: typeof listener) => { listener = next; return () => undefined; } }),
      },
    });
    const captured: any[] = [];
    runtimeSource.attach({
      subject: "TEAM_RUN",
      teamRunId: "team-run-1",
      targetAgentRunId: "task-run-1",
      producers: [{ agentRunId: "task-run-1", displayName: "Researcher" }],
    }, (event) => captured.push(event));

    listener({
      changeSequence: 1,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution: {
          rootTeamRunId: "team-run-1",
          memberAddress: "/researcher/task-worker",
          agentRunId: "task-run-1",
        },
        payload: {
          eventType: AgentRunEventType.TURN_STARTED,
          statusHint: null,
          details: { turnId: "turn-1", providerThreadId: "secret" },
        },
      },
    });
    listener({
      changeSequence: 2,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution: {
          rootTeamRunId: "team-run-1",
          memberAddress: "/writer",
          agentRunId: "writer-run",
        },
        payload: {
          eventType: AgentRunEventType.TURN_STARTED,
          statusHint: null,
          details: { turnId: "drop" },
        },
      },
    });

    expect(captured).toHaveLength(1);
    const mapped = new ApplicationAgentEventMapper().map(captured[0]);
    expect(mapped).toEqual({
      producer: { agentRunId: "task-run-1", displayName: "Researcher" },
      event: { type: "TURN_STARTED" },
    });
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
          payload: { providerSecret: "must-not-cross" },
        } as never,
      })).toBeNull();
    }
  });
});
