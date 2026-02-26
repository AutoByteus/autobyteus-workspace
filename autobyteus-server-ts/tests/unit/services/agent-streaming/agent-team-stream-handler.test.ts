import { describe, expect, it } from "vitest";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { AgentTeamStreamHandler } from "../../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";

describe("AgentTeamStreamHandler", () => {
  it("rebroadcasts agent lifecycle events with member context", () => {
    const handler = new AgentTeamStreamHandler(undefined, {
      getTeamRun: () => null,
      getTeamEventStream: () => null,
    } as any);

    const teamEvent = new AgentTeamStreamEvent({
      team_id: "team-1",
      event_source_type: "AGENT",
      data: new AgentEventRebroadcastPayload({
        agent_name: "worker-a",
        agent_event: {
          event_type: StreamEventType.TOOL_EXECUTION_SUCCEEDED,
          data: { invocation_id: "inv-1", tool_name: "read_file", result: { ok: true } },
          agent_id: "agent-xyz",
        },
      }),
    });

    const message = handler.convertTeamEvent(teamEvent);
    expect(message.type).toBe(ServerMessageType.TOOL_EXECUTION_SUCCEEDED);
    expect(message.payload.invocation_id).toBe("inv-1");
    expect(message.payload.agent_name).toBe("worker-a");
    expect(message.payload.agent_id).toBe("agent-xyz");
  });
});
