import { describe, expect, it } from "vitest";
import { AgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";

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

  it("preserves provider compaction boundary payload fields on standalone websocket messages", () => {
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

  it("maps global Agent communication messages without routing them through file changes", () => {
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
    [
      AgentRunEventType.SEGMENT_START,
      ServerMessageType.SEGMENT_START,
      { segment_type: "text", metadata: { source: "llm" } },
      { segment_type: "text", metadata: { source: "llm" } },
    ],
    [
      AgentRunEventType.SEGMENT_CONTENT,
      ServerMessageType.SEGMENT_CONTENT,
      { segment_type: "text", delta: "hello" },
      { segment_type: "text", delta: "hello" },
    ],
    [
      AgentRunEventType.SEGMENT_END,
      ServerMessageType.SEGMENT_END,
      { interrupted: true, reason: "user_interrupt", metadata: { tool_name: "search_web" } },
      {
        metadata: { tool_name: "search_web" },
        interrupted: true,
        reason: "user_interrupt",
        failed: false,
        error: null,
      },
    ],
  ])("projects current exact %s segment payloads", (eventType, messageType, inputPayload, outputPayload) => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType,
      runId: "run-1",
      payload: {
        id: "seg-1",
        turn_id: "turn-segment-1",
        ...inputPayload,
      },
      statusHint: null,
    });

    expect(message.type).toBe(messageType);
    expect(message.payload).toEqual({
      id: "seg-1",
      turn_id: "turn-segment-1",
      ...outputPayload,
    });
    expect(message.payload).not.toHaveProperty("turnId");
  });
});
