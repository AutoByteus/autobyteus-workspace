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
