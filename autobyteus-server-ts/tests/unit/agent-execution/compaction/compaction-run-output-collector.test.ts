import { describe, expect, it } from "vitest";
import {
  CompactionRunCollectionError,
  CompactionRunOutputCollector,
} from "../../../../src/agent-execution/compaction/compaction-run-output-collector.js";
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

    collector.observe(event(AgentRunEventType.ASSISTANT_COMPLETE, { content: '{"episodes":[{"summary":"auto"}]}' }));
    collector.observe(event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }, "IDLE"));

    await expect(output).resolves.toBe('{"episodes":[{"summary":"auto"}]}');
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
      delta: '{"episodes":[{"sum',
    }));
    collector.observe(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "message-1",
      segment_type: "text",
      delta: 'mary":"codex"}]}',
    }));
    collector.observe(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }, "IDLE"));

    await expect(output).resolves.toBe('{"episodes":[{"summary":"codex"}]}');
  });

  it("collects Claude text deltas and completes on idle status", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "msg-1",
      segment_type: "text",
      delta: '{"episodes":[{"summary":"claude"}]}',
    }));
    collector.observe(event(AgentRunEventType.AGENT_STATUS, {
      status: "idle",
    }, "IDLE"));

    await expect(output).resolves.toBe('{"episodes":[{"summary":"claude"}]}');
  });

  it("keeps classified diagnostics as content-only before normal completion", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.ERROR, {
      message: "recoverable",
      error_scope: "turn",
      error_effect: "diagnostic",
      turn_id: "turn-1",
    }));
    collector.observe(event(AgentRunEventType.ASSISTANT_COMPLETE, { content: '{"episodes":[{"summary":"ok"}]}' }));
    collector.observe(event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }, "IDLE"));

    await expect(output).resolves.toBe('{"episodes":[{"summary":"ok"}]}');
  });

  it("fails immediately on classified terminal error evidence", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);

    collector.observe(event(AgentRunEventType.ERROR, {
      message: "terminal failure",
      error_scope: "turn",
      error_effect: "terminal",
      turn_id: "turn-1",
    }, "ERROR"));
    collector.observe(event(AgentRunEventType.AGENT_STATUS, { status: "error" }, "ERROR"));

    await expect(output).rejects.toThrow(/failed: terminal failure/);
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

  it("rejects an error completion before returning valid-looking JSON content", async () => {
    const collector = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const output = collector.waitForFinalOutput(1_000);
    collector.observe(event(AgentRunEventType.ASSISTANT_COMPLETE, {
      content: '{"episodes":[{"summary":"must not parse"}]}',
      is_error: true,
    }));
    await expect(output).rejects.toMatchObject<Partial<CompactionRunCollectionError>>({
      kind: "error_completion",
    });
  });

  it("classifies interruption and timeout separately", async () => {
    const interrupted = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    const interruptedOutput = interrupted.waitForFinalOutput(1_000);
    interrupted.observe(event(AgentRunEventType.TURN_INTERRUPTED, { reason: "stopped" }));
    await expect(interruptedOutput).rejects.toMatchObject({ kind: "interrupted" });

    const timedOut = new CompactionRunOutputCollector({ runId: "compaction-run-1" });
    await expect(timedOut.waitForFinalOutput(1)).rejects.toMatchObject({ kind: "timeout" });
  });
});
