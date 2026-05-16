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
    getStatusSnapshot: vi.fn().mockReturnValue({ status: "running" }),
    getMemberStatusSnapshots: vi.fn().mockReturnValue([{
      status: "running",
      can_interrupt: true,
      agent_id: "member-42",
      agent_name: "worker-a",
    }]),
    subscribeToEvents: vi.fn().mockReturnValue(() => {}),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    context: {
      runtimeContext: {
        memberContexts: [
          {
            memberKind: "agent",
            memberName: "worker-a",
            memberPath: ["worker-a"],
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
          memberKind: "agent",
          memberName: "worker-a",
          memberPath: ["worker-a"],
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

  it("projects canonical team communication events to the flattened websocket payload", () => {
    const handler = new AgentTeamStreamHandler(
      undefined,
      createTeamRunService(null) as any,
    );

    const message = handler.convertTeamEvent({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      teamRunId: "team-1",
      sourcePath: ["program_manager"],
      data: {
        messageId: "message-1",
        teamRunId: "team-1",
        sender: {
          memberKind: "agent",
          memberName: "program_manager",
          memberPath: ["program_manager"],
          memberRouteKey: "program_manager",
          memberRunId: "program-manager-run",
        },
        receiver: {
          memberKind: "agent",
          memberName: "review_lead",
          memberPath: ["BuildSquad", "review_lead"],
          memberRouteKey: "BuildSquad/review_lead",
          memberRunId: "review-lead-run",
          representedSubTeam: {
            memberKind: "agent_team",
            memberName: "BuildSquad",
            memberPath: ["BuildSquad"],
            memberRouteKey: "BuildSquad",
            memberRunId: "build-squad-run",
            teamDefinitionId: "build-squad-definition",
            address: {
              teamRunId: "team-1",
              memberPath: ["BuildSquad"],
              memberRouteKey: "BuildSquad",
            },
          },
        },
        content: "Reply with exactly token.",
        messageType: "frontend_parent_to_subteam",
        referenceFiles: [],
        createdAt: "2026-05-13T06:00:00.000Z",
      },
    });

    expect(message.type).toBe(ServerMessageType.TEAM_COMMUNICATION_MESSAGE);
    expect(message.payload).toMatchObject({
      messageId: "message-1",
      teamRunId: "team-1",
      senderRunId: "program-manager-run",
      senderMemberKind: "agent",
      senderMemberName: "program_manager",
      senderMemberPath: ["program_manager"],
      senderMemberRouteKey: "program_manager",
      receiverRunId: "review-lead-run",
      receiverMemberKind: "agent",
      receiverMemberName: "review_lead",
      receiverMemberPath: ["BuildSquad", "review_lead"],
      receiverMemberRouteKey: "BuildSquad/review_lead",
      receiverRepresentedSubTeam: {
        memberKind: "agent_team",
        memberName: "BuildSquad",
        memberPath: ["BuildSquad"],
        memberRouteKey: "BuildSquad",
        memberRunId: "build-squad-run",
        teamDefinitionId: "build-squad-definition",
        address: {
          teamRunId: "team-1",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
        },
      },
      content: "Reply with exactly token.",
      messageType: "frontend_parent_to_subteam",
      referenceFiles: [],
      createdAt: "2026-05-13T06:00:00.000Z",
      updatedAt: "2026-05-13T06:00:00.000Z",
      source_path: ["program_manager"],
      source_route_key: "program_manager",
    });
    expect(message.payload.sender).toBeUndefined();
    expect(message.payload.receiver).toBeUndefined();
  });

  it("maps member input events to external user messages with canonical nested source identity", () => {
    const handler = new AgentTeamStreamHandler(
      undefined,
      createTeamRunService(null) as any,
    );

    const message = handler.convertTeamEvent({
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
      teamRunId: "team-1",
      sourcePath: ["BuildSquad", "review_lead"],
      data: {
        messageId: "member-input-1",
        dedupeKey: "member_input:team-1:BuildSquad/review_lead:member-input-1",
        teamRunId: "team-1",
        recipientMemberRunId: "review-lead-run",
        recipientMemberName: "review_lead",
        recipientMemberPath: ["review_lead"],
        recipientMemberRouteKey: "review_lead",
        content: "You received a message from sender name: program_manager",
        inputOrigin: "inter_agent_delivery",
        receivedAt: "2026-05-13T06:30:00.000Z",
        contextFilePaths: [],
        senderRunId: "program-manager-run",
        senderMemberName: "program_manager",
        senderMemberPath: ["program_manager"],
        senderMemberRouteKey: "program_manager",
        parentCommunicationMessageId: "team-message-1",
      },
    });

    expect(message.type).toBe(ServerMessageType.EXTERNAL_USER_MESSAGE);
    expect(message.payload).toMatchObject({
      content: "You received a message from sender name: program_manager",
      message_id: "member-input-1",
      dedupe_key: "member_input:team-1:BuildSquad/review_lead:member-input-1",
      input_origin: "inter_agent_delivery",
      received_at: "2026-05-13T06:30:00.000Z",
      agent_name: "review_lead",
      agent_id: "review-lead-run",
      member_route_key: "BuildSquad/review_lead",
      member_path: ["BuildSquad", "review_lead"],
      source_route_key: "BuildSquad/review_lead",
      source_path: ["BuildSquad", "review_lead"],
      sender_agent_id: "program-manager-run",
      sender_agent_name: "program_manager",
      sender_member_route_key: "program_manager",
      sender_member_path: ["program_manager"],
      parent_communication_message_id: "team-message-1",
    });
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
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        status: "running",
        can_interrupt: true,
        agent_id: "member-42",
        agent_name: "worker-a",
      },
    });
    expect(JSON.parse(connection.send.mock.calls[2][0])).toMatchObject({
      type: ServerMessageType.TEAM_STATUS,
      payload: {
        status: "running",
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
          target_member_route_key: "worker-a",
          context_file_paths: ["/tmp/info.txt"],
        },
      }),
    );

    expect(teamRun.postMessage).toHaveBeenCalledTimes(1);
    expect(teamRun.postMessage.mock.calls[0]?.[1]).toEqual({
      kind: "route_key",
      memberRouteKey: "worker-a",
    });
    expect(teamRunService.recordRunActivity).toHaveBeenCalledWith(
      teamRun,
      expect.objectContaining({
        summary: "hello team",
        lastKnownStatus: "ACTIVE",
      }),
    );
  });

  it("rejects every legacy scalar SEND_MESSAGE target alias", async () => {
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
    for (const legacyKey of [
      "target_member_name",
      "target_member_id",
      "target_agent_name",
      "target_agent_id",
      "targetMemberName",
      "targetMemberId",
      "targetAgentName",
      "targetAgentId",
      "agent_name",
      "agent_id",
      "agentName",
      "agentId",
      "member_name",
      "member_id",
      "memberName",
      "memberId",
    ]) {
      await handler.handleMessage(
        sessionId as string,
        JSON.stringify({
          type: ClientMessageType.SEND_MESSAGE,
          payload: {
            content: `legacy target via ${legacyKey}`,
            [legacyKey]: "worker-a",
          },
        }),
      );
    }

    expect(teamRun.postMessage).not.toHaveBeenCalled();
    expect(teamRunService.recordRunActivity).not.toHaveBeenCalled();
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
          target_member_route_key: "worker-a",
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

  it("keeps interrupt-generation active-only and does not restore a stopped team run", async () => {
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
        type: ClientMessageType.INTERRUPT_GENERATION,
      }),
    );

    expect(teamRunService.resolveTeamRun).not.toHaveBeenCalled();
    expect(teamRun.interrupt).not.toHaveBeenCalled();
  });

  it("routes approval commands with explicit member path selectors", async () => {
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
          member_path: ["worker-a"],
        },
      }),
    );

    expect(teamRun.approveToolInvocation).toHaveBeenCalledWith(
      {
        kind: "path",
        memberPath: ["worker-a"],
      },
      "inv-1",
      true,
      null,
    );
  });

  it("rejects every legacy scalar tool approval target alias", async () => {
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
    for (const legacyKey of [
      "target_member_name",
      "target_member_id",
      "target_agent_name",
      "target_agent_id",
      "targetMemberName",
      "targetMemberId",
      "targetAgentName",
      "targetAgentId",
      "agent_name",
      "agent_id",
      "agentName",
      "agentId",
      "member_name",
      "member_id",
      "memberName",
      "memberId",
    ]) {
      await handler.handleMessage(
        sessionId as string,
        JSON.stringify({
          type: ClientMessageType.APPROVE_TOOL,
          payload: {
            invocation_id: `inv-legacy-${legacyKey}`,
            [legacyKey]: "worker-a",
          },
        }),
      );
    }

    expect(teamRun.approveToolInvocation).not.toHaveBeenCalled();
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

    const lastSentMessage = connection.send.mock.calls.at(-1)?.[0];
    expect(lastSentMessage).toBeTypeOf("string");
    expect(JSON.parse(lastSentMessage as string)).toMatchObject({
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
          status: "running",
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
