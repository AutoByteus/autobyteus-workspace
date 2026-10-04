import { describe, expect, it } from "vitest";
import {
  ClaudeCompactionOperationTracker,
  resolveClaudeCompactionCloseReason,
} from "../../../../../../src/agent-execution/backends/claude/session/claude-compaction-operation-tracker.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import type { ClaudeSessionEvent } from "../../../../../../src/agent-execution/backends/claude/claude-runtime-shared.js";
import {
  CLAUDE_AUTO_COMPACTION_FRAMES,
  CLAUDE_AUTO_FAILED_COMPACTION_FRAMES,
  CLAUDE_INTERRUPTED_COMPACTION_FRAMES,
  CLAUDE_LONG_MANUAL_COMPACTION_FRAMES,
  CLAUDE_MANUAL_COMPACTION_FRAMES,
  claudeCompactingKeepalive,
  type ClaudeFrame,
} from "../../../../../fixtures/claude-compaction/claude-compaction-frames.js";

const ctx = { turnId: "turn-1", sessionId: "session-1" };

const observeAll = (tracker: ClaudeCompactionOperationTracker, frames: readonly ClaudeFrame[]) =>
  frames.flatMap((frame) => tracker.observeFrame({ ...frame }, ctx));

const methods = (events: ClaudeSessionEvent[]) => events.map((event) => event.method);

describe("ClaudeCompactionOperationTracker", () => {
  it("turns the real manual sequence into one started and one boundary event sharing the operation id", () => {
    const events = observeAll(new ClaudeCompactionOperationTracker(), CLAUDE_MANUAL_COMPACTION_FRAMES);

    expect(events).toEqual([
      {
        method: ClaudeSessionEventName.STATUS_COMPACTING,
        params: {
          sessionId: "session-1",
          turnId: "turn-1",
          operationId: "a85e8ae9-cc82-478d-a145-118ee3e10f81",
          frameUuid: "a85e8ae9-cc82-478d-a145-118ee3e10f81",
        },
      },
      {
        method: ClaudeSessionEventName.COMPACT_BOUNDARY,
        params: {
          sessionId: "session-1",
          turnId: "turn-1",
          operationId: "a85e8ae9-cc82-478d-a145-118ee3e10f81",
          frameUuid: "2957fbd4-9d68-4db8-8cad-70ff68afa4d2",
          trigger: "manual",
          pre_tokens: 3350,
          post_tokens: 1149,
          duration_ms: 12216,
          result: "success",
        },
      },
    ]);
  });

  it("collapses 30 s compacting keepalives into the open operation (AC-023)", () => {
    const [compacting, success, boundary] = CLAUDE_AUTO_COMPACTION_FRAMES;
    const sessionId = String(compacting!.session_id);
    const events = observeAll(new ClaudeCompactionOperationTracker(), [
      compacting!,
      claudeCompactingKeepalive(sessionId, "keepalive-30s"),
      claudeCompactingKeepalive(sessionId, "keepalive-60s"),
      claudeCompactingKeepalive(sessionId, "keepalive-90s"),
      success!,
      boundary!,
    ]);

    expect(methods(events)).toEqual([
      ClaudeSessionEventName.STATUS_COMPACTING,
      ClaudeSessionEventName.COMPACT_BOUNDARY,
    ]);
    expect(events.map((event) => event.params?.operationId)).toEqual([
      "7a12debe-56a1-4b84-ba8d-c69fd6973df9",
      "7a12debe-56a1-4b84-ba8d-c69fd6973df9",
    ]);
    expect(events[1]?.params).toMatchObject({
      frameUuid: "22921f5d-e183-4a18-9560-33aac82ea929",
      trigger: "auto",
      pre_tokens: 128715,
      post_tokens: 1546,
      duration_ms: 16593,
    });
  });

  it("closes the operation as failed with the provider error and keeps tracking later compactions (auto turn 2 → turn 3)", () => {
    const tracker = new ClaudeCompactionOperationTracker();
    const failed = observeAll(tracker, CLAUDE_AUTO_FAILED_COMPACTION_FRAMES);
    const later = observeAll(tracker, CLAUDE_AUTO_COMPACTION_FRAMES);

    expect(failed).toEqual([
      expect.objectContaining({ method: ClaudeSessionEventName.STATUS_COMPACTING }),
      {
        method: ClaudeSessionEventName.COMPACTION_FAILED,
        params: {
          sessionId: "session-1",
          turnId: "turn-1",
          operationId: "abd3f4d3-a350-4ead-9cb3-bbb255827ad0",
          error_message: "too_few_groups",
          reason: "compact_result_failed",
        },
      },
    ]);
    expect(methods(later)).toEqual([
      ClaudeSessionEventName.STATUS_COMPACTING,
      ClaudeSessionEventName.COMPACT_BOUNDARY,
    ]);
    expect(later[0]?.params?.operationId).toBe("7a12debe-56a1-4b84-ba8d-c69fd6973df9");
  });

  it("reports an interrupted compaction as the provider's failure", () => {
    const events = observeAll(new ClaudeCompactionOperationTracker(), CLAUDE_INTERRUPTED_COMPACTION_FRAMES);

    expect(methods(events)).toEqual([
      ClaudeSessionEventName.STATUS_COMPACTING,
      ClaudeSessionEventName.COMPACTION_FAILED,
    ]);
    expect(events[1]?.params).toMatchObject({
      operationId: "914919f9-f6d1-4c91-8c34-99027a60ec0d",
      error_message: "API Error: Request was aborted.",
    });
  });

  it("closes an operation still open at turn settlement exactly once", () => {
    const tracker = new ClaudeCompactionOperationTracker();
    observeAll(tracker, CLAUDE_LONG_MANUAL_COMPACTION_FRAMES.slice(0, 1));

    const closed = tracker.closeOpenOperation({ ...ctx, reason: "process_exited" });
    expect(closed).toEqual([{
      method: ClaudeSessionEventName.COMPACTION_FAILED,
      params: {
        sessionId: "session-1",
        turnId: "turn-1",
        operationId: "26d1be01-80c7-4a0b-a2f3-42d2c718a70e",
        error_message: "Claude process exited before the compaction completed.",
        reason: "process_exited",
      },
    }]);
    expect(tracker.closeOpenOperation({ ...ctx, reason: "turn_ended_before_boundary" })).toEqual([]);
  });

  it("emits nothing at settlement when no operation is open", () => {
    const tracker = new ClaudeCompactionOperationTracker();
    observeAll(tracker, CLAUDE_MANUAL_COMPACTION_FRAMES);
    expect(tracker.closeOpenOperation({ ...ctx, reason: "interrupted" })).toEqual([]);
  });

  it("uses the boundary frame uuid as the operation id when no status preceded it", () => {
    const boundary = CLAUDE_MANUAL_COMPACTION_FRAMES[2]!;
    const events = observeAll(new ClaudeCompactionOperationTracker(), [boundary]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      method: ClaudeSessionEventName.COMPACT_BOUNDARY,
      params: {
        operationId: "2957fbd4-9d68-4db8-8cad-70ff68afa4d2",
        frameUuid: "2957fbd4-9d68-4db8-8cad-70ff68afa4d2",
        trigger: "manual",
      },
    });
  });

  it("ignores non-compaction frames, requesting status and a success status without an operation", () => {
    const events = observeAll(new ClaudeCompactionOperationTracker(), [
      { type: "system", subtype: "init", session_id: "s" },
      { type: "system", subtype: "status", status: "requesting", uuid: "r-1" },
      { type: "system", subtype: "status", status: null, uuid: "n-1" },
      CLAUDE_MANUAL_COMPACTION_FRAMES[1]!,
      { type: "assistant", message: { content: [] } },
      { type: "compact_boundary", uuid: "not-a-real-shape" },
    ]);
    expect(events).toEqual([]);
  });

  it("maps turn settlements to close reasons", () => {
    expect(resolveClaudeCompactionCloseReason({ kind: "completed" })).toBe("turn_ended_before_boundary");
    expect(resolveClaudeCompactionCloseReason({ kind: "interrupted" })).toBe("interrupted");
    expect(resolveClaudeCompactionCloseReason({
      kind: "error",
      failure: { code: "CLAUDE_PROCESS_EXITED", message: "exit" },
    })).toBe("process_exited");
    expect(resolveClaudeCompactionCloseReason({
      kind: "error",
      failure: { code: "CLAUDE_RUNTIME_RESULT_ERROR", message: "bad" },
    })).toBe("turn_ended_before_boundary");
  });
});
