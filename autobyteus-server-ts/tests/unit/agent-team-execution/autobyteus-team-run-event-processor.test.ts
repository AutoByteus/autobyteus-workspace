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
import { AutoByteusTeamMemberStatusProjector } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.js";

const buildAgentTeamEvent = (eventType: StreamEventType): AgentTeamStreamEvent =>
  new AgentTeamStreamEvent({
    team_id: "team-run-1",
    event_source_type: "AGENT",
    data: new AgentEventRebroadcastPayload({
      agent_name: "Professor",
      agent_event: new StreamEvent({
        agent_id: "native-professor",
        event_type: eventType,
        data: eventType === StreamEventType.AGENT_STATUS
          ? { status: "idle" }
          : { turn_id: "turn-1" },
      }),
    }),
  });

describe("AutoByteusTeamRunEventProcessor", () => {
  it("keeps member status running for stale idle snapshots while the native turn is active", async () => {
    const memberRunIdsByName = new Map([["Professor", "professor-run"]]);
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: {
        agents: [{
          agentId: "native-professor",
          currentStatus: "idle",
          context: { config: { name: "Professor" } },
        }],
      },
    }, {
      memberRunIdsByName,
      isActive: () => true,
    });
    const processor = new AutoByteusTeamRunEventProcessor("team-run-1", {
      projector,
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
      buildAgentTeamEvent(StreamEventType.AGENT_STATUS),
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

  it("uses explicit idle status after turn completion when the native snapshot is missing", async () => {
    const memberRunIdsByName = new Map([["Professor", "professor-run"]]);
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: { agents: [] },
    }, {
      memberRunIdsByName,
      isActive: () => true,
    });
    const processor = new AutoByteusTeamRunEventProcessor("team-run-1", {
      projector,
    });

    await processor.buildProcessedTeamEvents(
      buildAgentTeamEvent(StreamEventType.TURN_STARTED),
      null,
    );
    await processor.buildProcessedTeamEvents(
      buildAgentTeamEvent(StreamEventType.TURN_COMPLETED),
      null,
    );

    const idleEvents = await processor.buildProcessedTeamEvents(
      buildAgentTeamEvent(StreamEventType.AGENT_STATUS),
      null,
    );
    const statusEvents = idleEvents.filter(
      (event) =>
        event.eventSourceType === TeamRunEventSourceType.AGENT &&
        (event.data as any).agentEvent.eventType === AgentRunEventType.AGENT_STATUS,
    );
    expect(statusEvents).toHaveLength(1);
    expect((statusEvents[0]?.data as any).agentEvent.payload).toMatchObject({
      status: "idle",
      can_interrupt: false,
      agent_id: "professor-run",
    });
  });
});
