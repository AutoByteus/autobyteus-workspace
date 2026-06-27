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
      target_member_run_id: "member-42",
      agent_name: "worker-a",
    }]),
    subscribeToEvents: vi.fn().mockReturnValue(() => {}),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    postMessageToConversationTarget: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
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

  const getSentMessages = (connection: { send: ReturnType<typeof vi.fn> }) =>
    connection.send.mock.calls.map(([raw]) => JSON.parse(raw as string));

  const getSentErrors = (connection: { send: ReturnType<typeof vi.fn> }) =>
    getSentMessages(connection).filter(
      (message) => message.type === ServerMessageType.ERROR,
    );

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

  it("maps member input events to member input messages with canonical nested source identity", () => {
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

    expect(message.type).toBe(ServerMessageType.MEMBER_INPUT_MESSAGE);
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

  it("maps task-agent member input events with concrete task-agent identity", () => {
    const handler = new AgentTeamStreamHandler(
      undefined,
      createTeamRunService(null) as any,
    );

    const message = handler.convertTeamEvent({
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
      teamRunId: "team-1",
      sourcePath: ["worker"],
      data: {
        messageId: "task-agent-input-1",
        dedupeKey: "member_input:team-1:worker:task-agent-input-1",
        teamRunId: "team-1",
        recipientMemberRunId: "task-agent-run-1",
        recipientMemberName: "worker",
        recipientMemberPath: ["worker"],
        recipientMemberRouteKey: "worker",
        content: "Delegated task work packet",
        inputOrigin: "user_message",
        receivedAt: "2026-05-30T08:00:00.000Z",
        contextFilePaths: [],
        taskAgentInstance: {
          taskAgentInstanceId: "task-agent-instance-1",
          taskAgentRunId: "task-agent-run-1",
          taskId: "task-1",
          logicalMember: {
            memberName: "worker",
            memberPath: ["worker"],
            memberRouteKey: "worker",
          },
        },
      },
    });

    expect(message.type).toBe(ServerMessageType.MEMBER_INPUT_MESSAGE);
    expect(message.payload).toMatchObject({
      content: "Delegated task work packet",
      message_id: "task-agent-input-1",
      agent_name: "worker",
      agent_id: "task-agent-run-1",
      member_route_key: "worker",
      member_path: ["worker"],
      source_route_key: "worker",
      source_path: ["worker"],
      task_agent_instance_id: "task-agent-instance-1",
      task_agent_run_id: "task-agent-run-1",
      task_id: "task-1",
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
        target_member_run_id: "member-42",
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

    expect(teamRun.postMessageToConversationTarget).toHaveBeenCalledTimes(1);
    expect(teamRun.postMessageToConversationTarget.mock.calls[0]?.[1]).toEqual({
      segments: [{ kind: "member", memberRouteKey: "worker-a" }],
    });
    expect(teamRunService.recordRunActivity).toHaveBeenCalledWith(
      teamRun,
      expect.objectContaining({
        summary: "hello team",
      }),
    );
  });

  it("handles SEND_MESSAGE with structured camelCase route and path selectors", async () => {
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
          content: "hello route",
          targetMemberRouteKey: "BuildSquad/review_lead",
        },
      }),
    );
    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.SEND_MESSAGE,
        payload: {
          content: "hello path",
          targetMemberPath: ["BuildSquad", "qa_specialist"],
        },
      }),
    );

    expect(teamRun.postMessageToConversationTarget).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        segments: [{ kind: "member", memberRouteKey: "BuildSquad/review_lead" }],
      },
    );
    expect(teamRun.postMessageToConversationTarget).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        segments: [{ kind: "member", memberPath: ["BuildSquad", "qa_specialist"] }],
      },
    );
  });

  it("rejects every scalar SEND_MESSAGE target alias with invalid-target errors", async () => {
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

    expect(teamRun.postMessageToConversationTarget).not.toHaveBeenCalled();
    expect(teamRunService.recordRunActivity).not.toHaveBeenCalled();
    const errorMessages = getSentErrors(connection);
    expect(errorMessages).toHaveLength(16);
    expect(
      errorMessages.every(
        (message) => message.payload?.code === "INVALID_TARGET",
      ),
    ).toBe(true);
  });

  it("restores and rebinds a team run before SEND_MESSAGE when the active subject was removed", async () => {
    const initialRun = createTeamRun({
      subscribeToEvents: vi.fn().mockReturnValue(vi.fn()),
    });
    const restoredRun = createTeamRun({
      postMessageToConversationTarget: vi.fn().mockResolvedValue({ accepted: true }),
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
    expect(restoredRun.postMessageToConversationTarget).toHaveBeenCalledTimes(1);
    expect(initialRun.postMessageToConversationTarget).not.toHaveBeenCalled();
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
        payload: {
          target_member_route_key: "worker-a",
          target_member_run_id: "member-42",
        },
      }),
    );

    expect(teamRunService.resolveTeamRun).not.toHaveBeenCalled();
    expect(teamRun.interruptMember).not.toHaveBeenCalled();
  });

  it("routes interrupt-generation to the explicit member route key with run-id as guard", async () => {
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
        type: ClientMessageType.INTERRUPT_GENERATION,
        payload: {
          target_member_route_key: "worker-a",
          target_member_run_id: "member-42",
        },
      }),
    );

    expect(teamRun.interruptMember).toHaveBeenCalledWith("worker-a", "member-42");
  });

  it("routes interrupt-generation with structured camelCase member path selectors", async () => {
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
        type: ClientMessageType.INTERRUPT_GENERATION,
        payload: {
          targetMemberPath: ["BuildSquad", "review_lead"],
          targetMemberRunId: "child-member-1",
        },
      }),
    );

    expect(teamRun.interruptMember).toHaveBeenCalledWith("BuildSquad/review_lead", "child-member-1");
  });

  it("rejects interrupt-generation without a target instead of falling back to team-wide interrupt", async () => {
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
        type: ClientMessageType.INTERRUPT_GENERATION,
        payload: {},
      }),
    );

    expect(teamRun.interruptMember).not.toHaveBeenCalled();
    expect(getSentErrors(connection).at(-1)).toMatchObject({
      payload: {
        code: "INVALID_TARGET",
      },
    });
  });

  it("rejects scalar interrupt target aliases with invalid-target errors", async () => {
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
        type: ClientMessageType.INTERRUPT_GENERATION,
        payload: {
          target_member_name: "worker-a",
        },
      }),
    );

    expect(teamRun.interruptMember).not.toHaveBeenCalled();
    expect(getSentErrors(connection).at(-1)).toMatchObject({
      payload: {
        code: "INVALID_TARGET",
      },
    });
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
      null,
      null,
    );
  });

  it("routes approval commands with structured camelCase selector fields", async () => {
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
          invocation_id: "inv-camel-path",
          sourcePath: ["BuildSquad", "review_lead"],
        },
      }),
    );
    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.DENY_TOOL,
        payload: {
          invocation_id: "inv-camel-route",
          memberRouteKey: "BuildSquad/qa_specialist",
          reason: "not allowed",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).toHaveBeenNthCalledWith(
      1,
      {
        kind: "path",
        memberPath: ["BuildSquad", "review_lead"],
      },
      "inv-camel-path",
      true,
      null,
      null,
      null,
    );
    expect(teamRun.approveToolInvocation).toHaveBeenNthCalledWith(
      2,
      {
        kind: "route_key",
        memberRouteKey: "BuildSquad/qa_specialist",
      },
      "inv-camel-route",
      false,
      "not allowed",
      null,
      null,
    );
  });

  it("routes approval commands with task-agent run identity as a concrete run guard", async () => {
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
          invocation_id: "inv-task-agent",
          member_route_key: "worker-a",
          source_route_key: "worker-a",
          task_agent_run_id: "task-agent-run-1",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).toHaveBeenCalledWith(
      {
        kind: "route_key",
        memberRouteKey: "worker-a",
      },
      "inv-task-agent",
      true,
      null,
      "task-agent-run-1",
      null,
    );
  });

  it("routes task-team scoped approval commands with relative route selectors and run guards", async () => {
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
          invocation_id: "inv-task-team-route",
          task_team_run_id: "task-team-run-1",
          task_team_relative_member_route_key: "solution_designer",
          task_agent_run_id: "nested-task-agent-run",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).toHaveBeenCalledWith(
      {
        kind: "route_key",
        memberRouteKey: "solution_designer",
      },
      "inv-task-team-route",
      true,
      null,
      "nested-task-agent-run",
      "task-team-run-1",
    );
  });

  it("routes task-team scoped denial commands with relative path selectors", async () => {
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
        type: ClientMessageType.DENY_TOOL,
        payload: {
          invocation_id: "inv-task-team-path",
          taskTeamRunId: "task-team-run-2",
          taskTeamRelativeMemberPath: ["review_lead"],
          reason: "needs review",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).toHaveBeenCalledWith(
      {
        kind: "path",
        memberPath: ["review_lead"],
      },
      "inv-task-team-path",
      false,
      "needs review",
      null,
      "task-team-run-2",
    );
  });

  it("rejects task-team scoped approvals without relative child selectors", async () => {
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
          invocation_id: "inv-task-team-structural-only",
          task_team_run_id: "task-team-run-1",
          member_route_key: "SoftwareEngineeringTeam/solution_designer",
        },
      }),
    );
    await handler.handleMessage(
      sessionId as string,
      JSON.stringify({
        type: ClientMessageType.DENY_TOOL,
        payload: {
          invocation_id: "inv-task-team-scalar",
          task_team_run_id: "task-team-run-1",
          target_member_name: "solution_designer",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).not.toHaveBeenCalled();
    const errorMessages = getSentErrors(connection);
    expect(errorMessages).toHaveLength(2);
    expect(
      errorMessages.every(
        (message) => message.payload?.code === "INVALID_TARGET",
      ),
    ).toBe(true);
  });

  it("rejects every scalar tool approval target alias with invalid-target errors", async () => {
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
    const errorMessages = getSentErrors(connection);
    expect(errorMessages).toHaveLength(16);
    expect(
      errorMessages.every(
        (message) => message.payload?.code === "INVALID_TARGET",
      ),
    ).toBe(true);
  });

  it("rejects tool approvals without structured target identity with invalid-target errors", async () => {
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
          invocation_id: "inv-missing-target",
        },
      }),
    );

    expect(teamRun.approveToolInvocation).not.toHaveBeenCalled();
    expect(getSentErrors(connection).at(-1)).toMatchObject({
      payload: {
        code: "INVALID_TARGET",
      },
    });
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
                agent_id: "prof-run-1",
                member_route_key: "Professor",
                member_path: ["Professor"],
                source_route_key: "Professor",
                source_path: ["Professor"],
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
        agent_id: "prof-run-1",
        member_route_key: "Professor",
        member_path: ["Professor"],
        source_route_key: "Professor",
        source_path: ["Professor"],
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
