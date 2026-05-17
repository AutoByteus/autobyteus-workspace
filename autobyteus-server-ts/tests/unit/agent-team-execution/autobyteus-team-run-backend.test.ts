import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AutoByteusTeamRunBackend } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const buildAgentEvent = (
  agentEvent: AgentRunEvent,
): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  teamRunId: "team-1",
  data: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberName: "Worker",
    memberRunId: "member-run-1",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    agentEvent,
  },
  sourcePath: ["Worker"],
});

describe("AutoByteusTeamRunBackend", () => {
  it("uses same-batch member recovery status when publishing aggregate team status", () => {
    const backend = new AutoByteusTeamRunBackend({
      teamId: "team-1",
      currentStatus: "error",
      context: {
        agents: [{
          agentId: "native-member-run-1",
          currentStatus: "error",
          context: {
            config: {
              name: "Worker",
            },
          },
        }],
      },
    } as any, {
      isActive: () => true,
      removeTeamRun: vi.fn(),
    });
    const publishedEvents: TeamRunEvent[] = [];
    (backend as any).listeners.add((event: TeamRunEvent) => {
      publishedEvents.push(event);
    });

    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.SEGMENT_START,
        runId: "member-run-1",
        payload: {
          id: "segment-1",
          turn_id: "turn-1",
          segment_type: "text",
        },
        statusHint: null,
      }),
      buildAgentEvent({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: {
          status: "running",
          can_interrupt: false,
          agent_id: "member-run-1",
          agent_name: "Worker",
        },
        statusHint: "ACTIVE",
      }),
    ]);

    expect(publishedEvents.map((event) => event.eventSourceType)).toEqual([
      TeamRunEventSourceType.AGENT,
      TeamRunEventSourceType.AGENT,
      TeamRunEventSourceType.TEAM,
    ]);
    expect(publishedEvents[1]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: {
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: {
            status: "running",
          },
        },
      },
    });
    expect(publishedEvents[2]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: {
        status: "running",
      },
    });
  });

  it("keeps aggregate team status running during active member events until member completion", () => {
    const backend = new AutoByteusTeamRunBackend({
      teamId: "team-1",
      currentStatus: "idle",
      context: {
        agents: [{
          agentId: "native-member-run-1",
          currentStatus: "idle",
          context: {
            config: {
              name: "Worker",
            },
          },
        }],
      },
    } as any, {
      isActive: () => true,
      removeTeamRun: vi.fn(),
    });
    const publishedEvents: TeamRunEvent[] = [];
    (backend as any).listeners.add((event: TeamRunEvent) => {
      publishedEvents.push(event);
    });

    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: {
          status: "running",
          can_interrupt: false,
          agent_id: "member-run-1",
          agent_name: "Worker",
        },
        statusHint: "ACTIVE",
      }),
    ]);
    expect((publishedEvents.at(-1)?.data as any).status).toBe("running");

    publishedEvents.length = 0;
    (backend as any).fanOutProcessedEvents([{
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-1",
      sourcePath: [],
      data: { status: "idle" },
    } satisfies TeamRunEvent]);

    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: { status: "running" },
    });

    publishedEvents.length = 0;
    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.ASSISTANT_COMPLETE,
        runId: "member-run-1",
        payload: { content: "done" },
        statusHint: null,
      }),
    ]);

    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: {
        agentEvent: {
          eventType: AgentRunEventType.ASSISTANT_COMPLETE,
        },
      },
    });

    publishedEvents.length = 0;
    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: {
          status: "idle",
          can_interrupt: false,
          agent_id: "member-run-1",
          agent_name: "Worker",
        },
        statusHint: "IDLE",
      }),
    ]);

    expect(publishedEvents.at(-1)).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: { status: "idle" },
    });
  });
});
