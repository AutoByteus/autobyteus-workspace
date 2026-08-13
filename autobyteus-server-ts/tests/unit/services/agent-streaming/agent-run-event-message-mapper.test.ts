import { describe, expect, it } from "vitest";
import { AgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { convertTeamRunEventToServerMessage } from "../../../../src/services/agent-streaming/team-run-event-websocket-message-mapper.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

describe("AgentRunEventMessageMapper", () => {
  it("maps compaction status events to the compaction websocket message type", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      runId: "run-1",
      payload: {
        phase: "started",
        turnId: " turn-1 ",
        compaction_operation_id: "operation-1",
        requested_turn_id: "turn-0",
        execution_turn_id: "turn-1",
        selected_block_count: 3,
        compacted_block_count: 2,
        compaction_model_identifier: "compaction-model",
      },
      statusHint: null,
    });

    expect(message.type).toBe(ServerMessageType.COMPACTION_STATUS);
    expect(message.payload).toEqual({
      phase: "started",
      turnId: " turn-1 ",
      turn_id: "turn-1",
      compaction_operation_id: "operation-1",
      requested_turn_id: "turn-0",
      execution_turn_id: "turn-1",
      selected_block_count: 3,
      compacted_block_count: 2,
      compaction_model_identifier: "compaction-model",
    });
  });

  it("preserves provider compaction boundary payload fields on websocket messages", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      runId: "run-1",
      payload: {
        kind: "provider_compaction_boundary",
        status: "compacted",
        turnId: " turn-provider ",
        runtime_kind: "CODEX",
        provider: "codex",
        source_surface: "codex.context_compaction_completed",
        boundary_key: "codex:thread-1:context-item-1",
        provider_thread_id: "thread-1",
        provider_event_id: "context-item-1",
        rotation_eligible: true,
        semantic_compaction: false,
      },
      statusHint: null,
    });

    expect(message.type).toBe(ServerMessageType.COMPACTION_STATUS);
    expect(message.payload).toEqual(expect.objectContaining({
      kind: "provider_compaction_boundary",
      status: "compacted",
      turnId: " turn-provider ",
      turn_id: "turn-provider",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: "codex.context_compaction_completed",
      boundary_key: "codex:thread-1:context-item-1",
      provider_thread_id: "thread-1",
      provider_event_id: "context-item-1",
      rotation_eligible: true,
      semantic_compaction: false,
    }));
  });

  it("preserves provider compaction payload fields when team member events are mapped", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      sourcePath: ["ReviewTeam", "Coder"],
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "Coder",
        memberRunId: "member-run-1",
        memberPath: ["ReviewTeam", "Coder"],
        memberRouteKey: "ReviewTeam/Coder",
        agentEvent: {
          eventType: AgentRunEventType.COMPACTION_STATUS,
          runId: "member-run-1",
          payload: {
            kind: "provider_compaction_boundary",
            status: "compacted",
            turnId: " turn-team-provider ",
            runtime_kind: "CODEX",
            provider: "codex",
            source_surface: "codex.raw_response_compaction_item",
            boundary_key: "codex:thread-1:raw-context-item-1",
            provider_thread_id: "thread-1",
            provider_response_id: "response-1",
            rotation_eligible: true,
          },
          statusHint: null,
        },
      },
    }, mapper);

    expect(message.type).toBe(ServerMessageType.COMPACTION_STATUS);
    expect(message.payload).toEqual(expect.objectContaining({
      kind: "provider_compaction_boundary",
      status: "compacted",
      turnId: " turn-team-provider ",
      turn_id: "turn-team-provider",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: "codex.raw_response_compaction_item",
      boundary_key: "codex:thread-1:raw-context-item-1",
      provider_thread_id: "thread-1",
      provider_response_id: "response-1",
      rotation_eligible: true,
      agent_name: "Coder",
      agent_id: "member-run-1",
      member_route_key: "ReviewTeam/Coder",
      member_path: ["ReviewTeam", "Coder"],
      source_route_key: "ReviewTeam/Coder",
      source_path: ["ReviewTeam", "Coder"],
    }));
  });

  it("flattens task-delegation websocket identity from current target and execution shapes", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      teamRunId: "team-1",
      sourcePath: ["worker"],
      data: {
        eventType: "TASK_DELEGATION_ACTIVATED",
        payload: {
          taskId: "task_0001_top_level",
          description: "Implement the websocket projection.",
          tasks: [
            {
              taskId: "task_0001",
              taskLabel: "Task 1",
              description: "Implement the websocket projection.",
            },
          ],
          target: {
            kind: "member",
            member: {
              memberRouteKey: "worker",
              memberPath: ["worker"],
            },
          },
          execution: {
            kind: "task_agent",
            taskAgentInstance: {
              taskAgentInstanceId: "task-agent-instance-1",
              taskAgentRunId: "task-agent-run-1",
              taskId: "task_0001",
              logicalMember: {
                memberRouteKey: "worker-logical",
                memberPath: ["worker-logical"],
              },
            },
          },
        },
      },
    }, mapper);

    expect(message.type).toBe(ServerMessageType.TASK_DELEGATION_EVENT);
    expect(message.payload).toEqual(expect.objectContaining({
      event_type: "TASK_DELEGATION_ACTIVATED",
      description: "Implement the websocket projection.",
      tasks: [
        {
          taskId: "task_0001",
          taskLabel: "Task 1",
          description: "Implement the websocket projection.",
        },
      ],
      execution_kind: "task_agent",
      task_agent_instance_id: "task-agent-instance-1",
      task_agent_run_id: "task-agent-run-1",
      agent_id: "task-agent-run-1",
      task_id: "task_0001",
      member_route_key: "worker",
      member_path: ["worker"],
      source_route_key: "worker",
      source_path: ["worker"],
    }));
  });

  it("does not flatten legacy top-level task-delegation identity fields", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      teamRunId: "team-1",
      sourcePath: [],
      data: {
        eventType: "TASK_DELEGATION_STATUS_UPDATED",
        payload: {
          taskId: "task_legacy_top_level",
          taskAgentInstance: {
            taskAgentInstanceId: "legacy-task-agent-instance",
            taskAgentRunId: "legacy-task-agent-run",
            taskId: "legacy-task-id",
            logicalMember: {
              memberRouteKey: "legacy-worker",
              memberPath: ["legacy-worker"],
            },
          },
          taskTeamInstance: {
            taskTeamInstanceId: "legacy-task-team-instance",
            taskTeamRunId: "legacy-task-team-run",
            taskId: "legacy-team-task-id",
            logicalTeam: {
              memberRouteKey: "legacy-team",
              memberPath: ["legacy-team"],
            },
          },
          member: {
            memberRouteKey: "legacy-member",
            memberPath: ["legacy-member"],
          },
        },
      },
    }, mapper);

    expect(message.type).toBe(ServerMessageType.TASK_DELEGATION_EVENT);
    expect(message.payload).toEqual(expect.objectContaining({
      event_type: "TASK_DELEGATION_STATUS_UPDATED",
      task_id: "task_legacy_top_level",
    }));
    for (const legacyFlattenedField of [
      "execution_kind",
      "task_agent_instance_id",
      "task_agent_run_id",
      "task_team_instance_id",
      "task_team_run_id",
      "member_route_key",
      "member_path",
    ]) {
      expect(message.payload).not.toHaveProperty(legacyFlattenedField);
    }
  });

  it("strictly flattens a multi-boundary task-team leaf without prefix fallback", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "root-team-1",
      sourcePath: ["research_group", "review_team", "review_group", "critic"],
      taskTeamScope: {
        taskTeamInstanceId: "task-team-instance-7",
        taskTeamRunId: "task-team-run-7",
        taskId: "task-42",
        logicalTeamPath: ["research_group", "review_team"],
        logicalTeamRouteKey: "research_group/review_team",
      },
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "critic",
        memberRunId: "critic-runtime-93",
        memberPath: ["research_group", "review_team", "review_group", "critic"],
        memberRouteKey: "research_group/review_team/review_group/critic",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "critic-runtime-93",
          payload: {
            status: "running",
          },
          statusHint: "ACTIVE",
        },
      },
    }, mapper);

    expect(message.type).toBe(ServerMessageType.AGENT_STATUS);
    expect(message.payload).toEqual(expect.objectContaining({
      task_team_run_id: "task-team-run-7",
      task_team_instance_id: "task-team-instance-7",
      task_id: "task-42",
      team_route_key: "research_group/review_team",
      team_path: ["research_group", "review_team"],
      task_team_relative_member_path: ["review_group", "critic"],
      task_team_relative_member_route_key: "review_group/critic",
      source_route_key: "research_group/review_team/review_group/critic",
      source_path: ["research_group", "review_team", "review_group", "critic"],
    }));
  });

  it("rejects a live task-team agent mapped at the task-team root", () => {
    const mapper = new AgentRunEventMessageMapper();
    expect(() => convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "root-team-1",
      sourcePath: ["research_group", "review_team"],
      taskTeamScope: {
        taskTeamInstanceId: "task-team-instance-7",
        taskTeamRunId: "task-team-run-7",
        taskId: "task-42",
        logicalTeamPath: ["research_group", "review_team"],
        logicalTeamRouteKey: "research_group/review_team",
      },
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "review_team",
        memberRunId: "task-team-run-7",
        memberPath: ["research_group", "review_team"],
        memberRouteKey: "research_group/review_team",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "task-team-run-7",
          payload: { status: "running" },
          statusHint: "ACTIVE",
        },
      },
    }, mapper)).toThrow("with a nonempty relative member path");
  });

  it("strictly flattens the same task-team scope for every non-agent event variant", () => {
    const mapper = new AgentRunEventMessageMapper();
    const scope = {
      taskTeamInstanceId: "task-team-instance-7",
      taskTeamRunId: "task-team-run-7",
      taskId: "task-42",
      logicalTeamPath: ["research_group", "review_team"],
      logicalTeamRouteKey: "research_group/review_team",
    };
    const events: TeamRunEvent[] = [
      {
        eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
        teamRunId: "root-team-1",
        sourcePath: ["research_group", "review_team"],
        taskTeamScope: scope,
        data: {
          eventType: "TASK_DELEGATION_STATUS_UPDATED",
          payload: { taskId: "task-42" },
        },
      },
      {
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        teamRunId: "root-team-1",
        sourcePath: ["research_group", "review_team"],
        taskTeamScope: scope,
        data: {
          messageId: "message-1",
          teamRunId: "root-team-1",
          senderAddress: { segments: [{ kind: "member", memberRouteKey: "critic" }] },
          receiverAddress: { segments: [{ kind: "member", memberRouteKey: "reviewer" }] },
          content: "Review this.",
          messageType: "handoff",
          referenceFiles: [],
          createdAt: "2026-08-02T12:00:00.000Z",
        },
      },
      {
        eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
        teamRunId: "root-team-1",
        sourcePath: ["research_group", "review_team"],
        taskTeamScope: scope,
        data: {
          messageId: "input-1",
          dedupeKey: "input-1",
          teamRunId: "root-team-1",
          recipientMemberRunId: "critic-runtime-93",
          recipientMemberName: "critic",
          recipientMemberPath: ["review_group", "critic"],
          recipientMemberRouteKey: "review_group/critic",
          content: "Continue.",
          inputOrigin: "user_message",
          receivedAt: "2026-08-02T12:00:00.000Z",
          contextFilePaths: [],
        },
      },
    ];

    for (const event of events) {
      expect(convertTeamRunEventToServerMessage(event, mapper).payload).toEqual(
        expect.objectContaining({
          task_team_run_id: "task-team-run-7",
          task_team_instance_id: "task-team-instance-7",
          task_id: "task-42",
          team_path: ["research_group", "review_team"],
          team_route_key: "research_group/review_team",
          task_team_relative_member_path: [],
        }),
      );
    }
  });

  it("maps derived team communication messages without routing them through file changes", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType: AgentRunEventType.TEAM_COMMUNICATION_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        messageId: "message-1",
        teamRunId: "team-1",
        senderAddress: { segments: [{ kind: "member", memberRouteKey: "sender" }] },
        receiverAddress: { segments: [{ kind: "member", memberRouteKey: "receiver" }] },
        createdAt: "2026-04-08T00:00:00.000Z",
        content: "Please review the attached report.",
        messageType: "handoff",
        referenceFiles: [{ referenceId: "ref-1", path: "/tmp/report.md" }],
      },
      statusHint: null,
    });

    expect(message.type).toBe(ServerMessageType.TEAM_COMMUNICATION_MESSAGE);
    expect(message.type).not.toBe(ServerMessageType.FILE_CHANGE);
    expect(message.payload).toEqual({
      messageId: "message-1",
      teamRunId: "team-1",
      senderAddress: { segments: [{ kind: "member", memberRouteKey: "sender" }] },
      receiverAddress: { segments: [{ kind: "member", memberRouteKey: "receiver" }] },
      createdAt: "2026-04-08T00:00:00.000Z",
      content: "Please review the attached report.",
      messageType: "handoff",
      referenceFiles: [{ referenceId: "ref-1", path: "/tmp/report.md" }],
    });
  });

  it.each([
    [AgentRunEventType.SEGMENT_START, ServerMessageType.SEGMENT_START, { segment_type: "text", metadata: { source: "llm" } }],
    [AgentRunEventType.SEGMENT_CONTENT, ServerMessageType.SEGMENT_CONTENT, { delta: "hello" }],
    [
      AgentRunEventType.SEGMENT_END,
      ServerMessageType.SEGMENT_END,
      { interrupted: true, reason: "user_interrupt", metadata: { tool_name: "search_web" } },
    ],
  ])("normalizes %s segment payloads to canonical turn_id", (eventType, messageType, extraPayload) => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType,
      runId: "run-1",
      payload: {
        id: "seg-1",
        turnId: " turn-segment-1 ",
        ...extraPayload,
      },
      statusHint: null,
    });

    expect(message.type).toBe(messageType);
    expect(message.payload).toEqual({
      id: "seg-1",
      turn_id: "turn-segment-1",
      ...extraPayload,
    });
    expect(message.payload).not.toHaveProperty("turnId");
  });
});
