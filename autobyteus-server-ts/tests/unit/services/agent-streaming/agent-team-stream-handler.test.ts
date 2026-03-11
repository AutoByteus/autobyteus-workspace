import { describe, expect, it, vi } from "vitest";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { AgentTeamStreamHandler } from "../../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { TeamStreamBroadcaster } from "../../../../src/services/agent-streaming/team-stream-broadcaster.js";
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
        getTeamRuntimeMode: () => "member_runtime",
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

  it("registers the websocket connection for team-scoped live message broadcasts", async () => {
    const broadcaster = new TeamStreamBroadcaster();
    const handler = new AgentTeamStreamHandler(
      undefined,
      {
        getTeamRun: () => ({ teamRunId: "team-1" }),
        getTeamEventStream: () => ({
          allEvents: async function* () {},
          close: vi.fn().mockResolvedValue(undefined),
        }),
      } as any,
      {
        sendTurn: vi.fn(),
        approveTool: vi.fn(),
        interruptRun: vi.fn(),
      } as any,
      {
        getTeamRuntimeMode: () => "native_team",
        sendToMember: vi.fn(),
        approveForMember: vi.fn(),
        getTeamBindings: vi.fn().mockReturnValue([]),
      } as any,
      {
        subscribeTeam: vi.fn(),
      } as any,
      broadcaster,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");
    expect(sessionId).toBeTruthy();

    expect(
      broadcaster.publishToTeamRun("team-1", {
        toJson: () =>
          JSON.stringify({
            type: ServerMessageType.EXTERNAL_USER_MESSAGE,
            payload: {
              content: "hello from telegram",
              agent_name: "Professor",
            },
          }),
      } as any),
    ).toBe(1);

    expect(connection.send).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(connection.send.mock.calls[1][0]);
    expect(payload).toMatchObject({
      type: ServerMessageType.EXTERNAL_USER_MESSAGE,
      payload: {
        content: "hello from telegram",
        agent_name: "Professor",
      },
    });

    await handler.disconnect(sessionId as string);
  });

  it("sends initial member-runtime status snapshot messages on connect", async () => {
    const getInitialSnapshotMessages = vi.fn(() => [
      {
        type: ServerMessageType.TEAM_STATUS,
        toJson: () =>
          JSON.stringify({
            type: ServerMessageType.TEAM_STATUS,
            payload: { new_status: "PROCESSING" },
          }),
      },
      {
        type: ServerMessageType.AGENT_STATUS,
        toJson: () =>
          JSON.stringify({
            type: ServerMessageType.AGENT_STATUS,
            payload: {
              new_status: "RUNNING",
              agent_name: "Professor",
              agent_id: "run-professor",
            },
          }),
      },
    ]);

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
        getTeamRuntimeMode: () => "member_runtime",
        sendToMember: vi.fn(),
        approveForMember: vi.fn(),
        getTeamBindings: vi.fn().mockReturnValue([]),
      } as any,
      {
        subscribeTeam: vi.fn(() => vi.fn()),
        getInitialSnapshotMessages,
      } as any,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    await handler.connect(connection, "team-live-1");

    expect(getInitialSnapshotMessages).toHaveBeenCalledWith("team-live-1");
    expect(connection.send).toHaveBeenCalledTimes(3);
    expect(JSON.parse(connection.send.mock.calls[1][0])).toMatchObject({
      type: ServerMessageType.TEAM_STATUS,
      payload: { new_status: "PROCESSING" },
    });
    expect(JSON.parse(connection.send.mock.calls[2][0])).toMatchObject({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        new_status: "RUNNING",
        agent_name: "Professor",
        agent_id: "run-professor",
      },
    });
  });

  it("sends initial native-team member status snapshot messages on connect", async () => {
    const handler = new AgentTeamStreamHandler(
      undefined,
      {
        getTeamRun: () => ({
          teamRunId: "team-native-1",
          currentStatus: "ACTIVE",
          context: {
            agents: [
              {
                agentId: "run-professor",
                currentStatus: "ACTIVE",
                context: { config: { name: "Professor" } },
              },
              {
                agentId: "run-student",
                currentStatus: "IDLE",
                context: { config: { name: "Student" } },
              },
            ],
          },
        }),
        getTeamEventStream: () => ({
          allEvents: async function* () {},
          close: vi.fn().mockResolvedValue(undefined),
        }),
      } as any,
      {
        sendTurn: vi.fn(),
        approveTool: vi.fn(),
        interruptRun: vi.fn(),
      } as any,
      {
        getTeamRuntimeMode: () => "native_team",
        sendToMember: vi.fn(),
        approveForMember: vi.fn(),
        getTeamBindings: vi.fn().mockReturnValue([]),
      } as any,
      {
        subscribeTeam: vi.fn(),
      } as any,
    );

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    await handler.connect(connection, "team-native-1");

    expect(connection.send).toHaveBeenCalledTimes(4);
    expect(JSON.parse(connection.send.mock.calls[1][0])).toMatchObject({
      type: ServerMessageType.TEAM_STATUS,
      payload: { new_status: "ACTIVE" },
    });
    expect(JSON.parse(connection.send.mock.calls[2][0])).toMatchObject({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        new_status: "ACTIVE",
        agent_name: "Professor",
        agent_id: "run-professor",
      },
    });
    expect(JSON.parse(connection.send.mock.calls[3][0])).toMatchObject({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        agent_name: "Student",
        agent_id: "run-student",
      },
    });
  });
});
