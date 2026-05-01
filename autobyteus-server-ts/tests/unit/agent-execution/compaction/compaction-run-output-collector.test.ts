import { describe, expect, it } from "vitest";
import { CompactionRunOutputCollector } from "../../../../src/agent-execution/compaction/compaction-run-output-collector.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";

const event = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown> = {},
  statusHint: AgentRunEvent["statusHint"] = null,
): AgentRunEvent => ({
  eventType,
  runId: "compaction-run-1",
  payload,
  statusHint,
});

describe("CompactionRunOutputCollector", () => {
  it("collects AutoByteus assistant-complete output", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.ASSISTANT_COMPLETE, { content: '{"episodic_summary":"auto"}' }));
    collector.observe(event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }, "IDLE"));

    await expect(output).resolves.toBe('{"episodic_summary":"auto"}');
  });

  it("collects Codex text segment deltas while ignoring reasoning", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-1",
      segment_type: "reasoning",
      delta: "thinking",
    }));
    collector.observe(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "message-1",
      segment_type: "text",
      delta: '{"episodic_',
    }));
    collector.observe(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "message-1",
      segment_type: "text",
      delta: 'summary":"codex"}',
    }));
    collector.observe(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }, "IDLE"));

    await expect(output).resolves.toBe('{"episodic_summary":"codex"}');
  });

  it("collects Claude text deltas and completes on idle status", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "msg-1",
      segment_type: "text",
      delta: '{"episodic_summary":"claude"}',
    }));
    collector.observe(event(AgentRunEventType.AGENT_STATUS, { new_status: "IDLE" }, "IDLE"));

    await expect(output).resolves.toBe('{"episodic_summary":"claude"}');
  });

  it("fails clearly when the compactor asks for tool approval", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.TOOL_APPROVAL_REQUESTED, { tool_name: "run_bash" }));

    await expect(output).rejects.toThrow(/requested tool approval.*run_bash/);
  });

  it("fails clearly when a run finishes without assistant output", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }, "IDLE"));

    await expect(output).rejects.toThrow(/without a final assistant output/);
  });
});
