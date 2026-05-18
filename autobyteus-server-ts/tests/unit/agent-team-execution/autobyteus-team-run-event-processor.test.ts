import { describe, expect, it } from "vitest";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AutoByteusTeamRunEventProcessor } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.js";

const buildAgentTeamEvent = (eventType: StreamEventType): AgentTeamStreamEvent =>
  new AgentTeamStreamEvent({
    team_id: "team-run-1",
    event_source_type: "AGENT",
    data: new AgentEventRebroadcastPayload({
      agent_name: "Professor",
      agent_event: new StreamEvent({
        agent_id: "native-professor",
        event_type: eventType,
        data: eventType === StreamEventType.AGENT_STATUS_UPDATED
          ? { new_status: "idle" }
          : { turn_id: "turn-1" },
      }),
    }),
  });

describe("AutoByteusTeamRunEventProcessor", () => {
  it("keeps member status running for stale idle snapshots while the native turn is active", async () => {
    const processor = new AutoByteusTeamRunEventProcessor("team-run-1", {
      memberRunIdsByName: new Map([["Professor", "professor-run"]]),
      getMemberStatusSnapshot: () => ({
        status: "idle",
        can_interrupt: false,
        agent_id: "professor-run",
        agent_name: "Professor",
      }),
    });

    const turnStartedEvents = await processor.buildProcessedTeamEvents(
      buildAgentTeamEvent(StreamEventType.TURN_STARTED),
      null,
    );
    expect(turnStartedEvents).toContainEqual(expect.objectContaining({
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: expect.objectContaining({
        memberRunId: "professor-run",
        agentEvent: expect.objectContaining({
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: expect.objectContaining({ status: "running" }),
        }),
      }),
    }));

    const staleIdleEvents = await processor.buildProcessedTeamEvents(
      buildAgentTeamEvent(StreamEventType.AGENT_STATUS_UPDATED),
      null,
    );
    const statusEvents = staleIdleEvents.filter(
      (event) =>
        event.eventSourceType === TeamRunEventSourceType.AGENT &&
        (event.data as any).agentEvent.eventType === AgentRunEventType.AGENT_STATUS,
    );
    expect(statusEvents).toHaveLength(1);
    expect((statusEvents[0]?.data as any).agentEvent.payload).toMatchObject({
      status: "running",
      can_interrupt: false,
      agent_id: "professor-run",
    });
  });
});
