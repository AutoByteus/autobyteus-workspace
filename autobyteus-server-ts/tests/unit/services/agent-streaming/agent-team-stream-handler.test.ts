import { describe, expect, it, vi } from "vitest";
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

  it("routes SEND_MESSAGE over codex member runtime mode without requiring team manager run object", async () => {
    const sendToMember = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = vi.fn().mockResolvedValue(undefined);
    const subscribeTeam = vi.fn().mockReturnValue(unsubscribe);

    const handler = new AgentTeamStreamHandler(
      undefined,
      {
        getTeamRun: () => null,
        getTeamEventStream: () => null,
      } as any,
      {
        sendTurn: vi.fn(),
        approveTool: vi.fn(),
        interruptRun: vi.fn(),
      } as any,
      {
        getTeamRuntimeMode: () => "codex_members",
        sendToMember,
        approveForMember: vi.fn(),
        getTeamBindings: vi.fn().mockReturnValue([]),
      } as any,
      {
        subscribeTeam,
      } as any,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-codex-1");
    expect(sessionId).toBeTruthy();
    expect(connection.close).not.toHaveBeenCalled();
    expect(subscribeTeam).toHaveBeenCalledTimes(1);

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          content: "hello codex member",
          target_member_name: "member-b",
        },
      }),
    );

    expect(sendToMember).toHaveBeenCalledTimes(1);
    expect(sendToMember.mock.calls[0]?.[0]).toBe("team-codex-1");
    expect(sendToMember.mock.calls[0]?.[1]).toBe("member-b");

    await handler.disconnect(sessionId as string);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
