import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentTeamStreamHandler } from "../../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { TeamStreamBroadcaster } from "../../../../src/services/agent-streaming/team-stream-broadcaster.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import {
  ClientMessageType,
  ServerMessageType,
} from "../../../../src/services/agent-streaming/models.js";

describe("AgentTeamStreamHandler", () => {
  const createTeamRun = (overrides: Record<string, unknown> = {}) => ({
    runId: "team-1",
    runtimeKind: "autobyteus",
    getStatus: vi.fn().mockReturnValue("ACTIVE"),
    subscribeToEvents: vi.fn().mockReturnValue(() => {}),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    context: {
      runtimeContext: {
        memberContexts: [
          {
            memberName: "worker-a",
            memberRouteKey: "worker-a",
            memberRunId: "member-42",
            getPlatformAgentRunId: () => null,
          },
        ],
      },
    },
    config: {
      memberConfigs: [
        {
          memberName: "worker-a",
          memberRunId: "member-42",
        },
      ],
    },
    ...overrides,
  });

  const createTeamRunService = (
    teamRun: ReturnType<typeof createTeamRun> | null,
    options: {
      activeTeamRun?: ReturnType<typeof createTeamRun> | null;
      resolvedTeamRun?: ReturnType<typeof createTeamRun> | null;
    } = {},
  ) => ({
    getTeamRun: vi.fn().mockReturnValue(
      "activeTeamRun" in options ? options.activeTeamRun : teamRun,
    ),
    resolveTeamRun: vi.fn().mockResolvedValue(
      "resolvedTeamRun" in options ? options.resolvedTeamRun : teamRun,
    ),
    recordRunActivity: vi.fn().mockResolvedValue(undefined),
    refreshRunMetadata: vi.fn().mockResolvedValue(undefined),
  });

  it("rebroadcasts agent lifecycle events with member context", () => {
    const handler = new AgentTeamStreamHandler(
      undefined,
      createTeamRunService(null) as any,
    );

    const teamEvent = {
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "worker-a",
        memberRunId: "agent-xyz",
        agentEvent: {
          runId: "agent-xyz",
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          payload: {
            invocation_id: "inv-1",
            tool_name: "read_file",
            result: { ok: true },
          },
          statusHint: null,
        },
      },
    };

    const message = handler.convertTeamEvent(teamEvent);
    expect(message.type).toBe(ServerMessageType.TOOL_EXECUTION_SUCCEEDED);
    expect(message.payload.invocation_id).toBe("inv-1");
    expect(message.payload.agent_name).toBe("worker-a");
    expect(message.payload.agent_id).toBe("agent-xyz");
  });

  it("connects through TeamRunService.resolveTeamRun and sends CONNECTED plus initial status", async () => {
    const teamRun = createTeamRun();
    const teamRunService = createTeamRunService(null, {
      activeTeamRun: null,
      resolvedTeamRun: teamRun,
    });
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");

    expect(sessionId).toBeTruthy();
    expect(teamRunService.resolveTeamRun).toHaveBeenCalledWith("team-1");
    expect(teamRunService.getTeamRun).not.toHaveBeenCalled();
    expect(teamRun.subscribeToEvents).toHaveBeenCalledWith(expect.any(Function));
    expect(JSON.parse(connection.send.mock.calls[0][0])).toMatchObject({
      type: ServerMessageType.CONNECTED,
      payload: {
        team_id: "team-1",
        session_id: sessionId,
      },
    });
    expect(JSON.parse(connection.send.mock.calls[1][0])).toMatchObject({
      type: ServerMessageType.TEAM_STATUS,
      payload: {
        new_status: "ACTIVE",
      },
    });
  });

  it("closes with 4004 when the team run is missing", async () => {
    const teamRunService = createTeamRunService(null);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "missing-team");

    expect(sessionId).toBeNull();
    expect(teamRunService.resolveTeamRun).toHaveBeenCalledWith("missing-team");
    expect(connection.close).toHaveBeenCalledWith(4004);
    expect(JSON.parse(connection.send.mock.calls[0][0])).toMatchObject({
      type: ServerMessageType.ERROR,
      payload: {
        code: "TEAM_NOT_FOUND",
      },
    });
  });

  it("handles SEND_MESSAGE via the service-resolved TeamRun subject", async () => {
    const teamRun = createTeamRun();
    const teamRunService = createTeamRunService(teamRun);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.SEND_MESSAGE,
        payload: {
          content: "hello team",
          target_member_name: "worker-a",
          context_file_paths: ["/tmp/info.txt"],
        },
      }),
    );

    expect(teamRun.postMessage).toHaveBeenCalledTimes(1);
    expect(teamRun.postMessage.mock.calls[0]?.[1]).toBe("worker-a");
    expect(teamRunService.recordRunActivity).toHaveBeenCalledWith(
      teamRun,
      expect.objectContaining({
        summary: "hello team",
        lastKnownStatus: "ACTIVE",
      }),
    );
  });

  it("restores and rebinds a team run before SEND_MESSAGE when the active subject was removed", async () => {
    const initialRun = createTeamRun({
      subscribeToEvents: vi.fn().mockReturnValue(vi.fn()),
    });
    const restoredRun = createTeamRun({
      postMessage: vi.fn().mockResolvedValue({ accepted: true }),
      subscribeToEvents: vi.fn().mockReturnValue(vi.fn()),
    });
    const teamRunService = createTeamRunService(null, {
      activeTeamRun: null,
      resolvedTeamRun: initialRun,
    });
    teamRunService.resolveTeamRun
      .mockResolvedValueOnce(initialRun)
      .mockResolvedValueOnce(restoredRun);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");
    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.SEND_MESSAGE,
        payload: {
          content: "resume team",
          target_member_name: "worker-a",
        },
      }),
    );

    expect(teamRunService.resolveTeamRun).toHaveBeenCalledTimes(2);
    expect(restoredRun.postMessage).toHaveBeenCalledTimes(1);
    expect(initialRun.postMessage).not.toHaveBeenCalled();
    expect(restoredRun.subscribeToEvents).toHaveBeenCalledWith(expect.any(Function));
    expect(teamRunService.recordRunActivity).toHaveBeenCalledWith(
      restoredRun,
      expect.objectContaining({
        summary: "resume team",
      }),
    );
  });

  it("keeps stop-generation active-only and does not restore a stopped team run", async () => {
    const teamRun = createTeamRun();
    const teamRunService = createTeamRunService(teamRun);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");
    teamRunService.getTeamRun.mockReturnValue(null);
    teamRunService.resolveTeamRun.mockClear();

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.STOP_GENERATION,
      }),
    );

    expect(teamRunService.resolveTeamRun).not.toHaveBeenCalled();
    expect(teamRun.interrupt).not.toHaveBeenCalled();
  });

  it("resolves approval target names from TeamRun member context instead of manager state", async () => {
    const teamRun = createTeamRun();
    const teamRunService = createTeamRunService(teamRun);
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      teamRunService as any,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");

    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.APPROVE_TOOL,
        payload: {
          invocation_id: "inv-1",
          agent_id: "member-42",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).toHaveBeenCalledWith(
      "worker-a",
      "inv-1",
      true,
      null,
    );
  });

  it("registers the websocket connection for team-scoped live message broadcasts", async () => {
    const teamRun = createTeamRun();
    const broadcaster = new TeamStreamBroadcaster();
    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      createTeamRunService(teamRun) as any,
      broadcaster,
    );
    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "team-1");

    expect(sessionId).toBeTruthy();
    expect(
      broadcaster.publishToTeamRun(
        "team-1",
        {
          toJson: () =>
            JSON.stringify({
              type: ServerMessageType.EXTERNAL_USER_MESSAGE,
              payload: {
                content: "hello from telegram",
                agent_name: "Professor",
              },
            }),
        } as any,
      ),
    ).toBe(1);

    expect(JSON.parse(connection.send.mock.calls[2][0])).toMatchObject({
      type: ServerMessageType.EXTERNAL_USER_MESSAGE,
      payload: {
        content: "hello from telegram",
        agent_name: "Professor",
      },
    });
  });

  it("coalesces metadata refresh work across a burst of streamed team events", async () => {
    vi.useFakeTimers();
    try {
      const teamRun = createTeamRun();
      const teamRunService = createTeamRunService(teamRun);
      const handler = new AgentTeamStreamHandler(
        new AgentSessionManager(),
        teamRunService as any,
      );
      const connection = {
        send: vi.fn(),
        close: vi.fn(),
      };

      await handler.connect(connection, "team-1");

      const eventListener = teamRun.subscribeToEvents.mock.calls[0]?.[0];
      expect(typeof eventListener).toBe("function");

      const teamEvent = {
        eventSourceType: TeamRunEventSourceType.TEAM,
        teamRunId: "team-1",
        data: {
          new_status: "ACTIVE",
        },
      };

      eventListener(teamEvent);
      eventListener(teamEvent);
      eventListener(teamEvent);

      expect(teamRunService.refreshRunMetadata).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2000);

      expect(teamRunService.refreshRunMetadata).toHaveBeenCalledTimes(1);
      expect(teamRunService.refreshRunMetadata).toHaveBeenCalledWith(teamRun);
    } finally {
      vi.useRealTimers();
    }
  });
});
