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
      selected_block_count: 3,
      compacted_block_count: 2,
      compaction_model_identifier: "compaction-model",
    });
  });

  it("maps inter-agent messages with team communication metadata without routing them through file changes", () => {
    const mapper = new AgentRunEventMessageMapper();

    const message = mapper.map({
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        message_id: "message-1",
        team_run_id: "team-1",
        sender_agent_id: "sender-run-1",
        receiver_run_id: "receiver-run-1",
        content: "Please review the attached report.",
        message_type: "handoff",
        reference_file_entries: [{ referenceId: "ref-1", path: "/tmp/report.md" }],
      },
      statusHint: null,
    });

    expect(message.type).toBe(ServerMessageType.INTER_AGENT_MESSAGE);
    expect(message.type).not.toBe(ServerMessageType.FILE_CHANGE);
    expect(message.payload).toEqual({
      message_id: "message-1",
      team_run_id: "team-1",
      sender_agent_id: "sender-run-1",
      receiver_run_id: "receiver-run-1",
      content: "Please review the attached report.",
      message_type: "handoff",
      reference_file_entries: [{ referenceId: "ref-1", path: "/tmp/report.md" }],
    });
  });
});
