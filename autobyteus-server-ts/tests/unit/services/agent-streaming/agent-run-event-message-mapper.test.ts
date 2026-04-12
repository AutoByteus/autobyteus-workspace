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
});
