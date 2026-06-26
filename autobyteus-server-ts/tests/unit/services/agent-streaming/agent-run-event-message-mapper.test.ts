import { describe, expect, it } from "vitest";
import { AgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { convertTeamRunEventToServerMessage } from "../../../../src/services/agent-streaming/team-run-event-websocket-message-mapper.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
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

  it("flattens task-team scoped event identity on child agent messages", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "parent-team-run",
      sourcePath: ["SoftwareEngineeringTeam", "solution_designer"],
      taskTeamInstance: {
        taskTeamInstanceId: "task-team-instance-1",
        taskTeamRunId: "task-team-run-1",
        parentTeamRunId: "parent-team-run",
        taskId: "task_0001",
        logicalTeam: {
          memberName: "SoftwareEngineeringTeam",
          memberPath: ["SoftwareEngineeringTeam"],
          memberRouteKey: "SoftwareEngineeringTeam",
          templateMemberRunId: "software-team-template",
          teamDefinitionId: "software-team-def",
          coordinatorMemberRouteKey: "solution_designer",
        },
        ingress: {
          memberName: "solution_designer",
          memberPath: ["solution_designer"],
          memberRouteKey: "solution_designer",
          memberRunId: "solution-child-run",
        },
        createdAt: "2026-06-26T00:00:00.000Z",
      },
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "solution_designer",
        memberRunId: "solution-child-run",
        memberPath: ["SoftwareEngineeringTeam", "solution_designer"],
        memberRouteKey: "SoftwareEngineeringTeam/solution_designer",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "solution-child-run",
          payload: {
            status: "running",
            can_interrupt: true,
          },
          statusHint: "ACTIVE",
        },
      },
    }, mapper);

    expect(message.type).toBe(ServerMessageType.AGENT_STATUS);
    expect(message.payload).toEqual(expect.objectContaining({
      task_team_run_id: "task-team-run-1",
      task_team_instance_id: "task-team-instance-1",
      task_id: "task_0001",
      team_route_key: "SoftwareEngineeringTeam",
      team_path: ["SoftwareEngineeringTeam"],
      task_team_relative_member_path: ["solution_designer"],
      task_team_relative_member_route_key: "solution_designer",
      source_route_key: "SoftwareEngineeringTeam/solution_designer",
      source_path: ["SoftwareEngineeringTeam", "solution_designer"],
    }));
  });

  it("maps derived team communication messages without routing them through file changes", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType: AgentRunEventType.TEAM_COMMUNICATION_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        messageId: "message-1",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        receiverRunId: "receiver-run-1",
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
      senderRunId: "sender-run-1",
      receiverRunId: "receiver-run-1",
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
