import { describe, expect, it } from "vitest";
import {
  applyRuntimeSelection,
  commitRuntimeSwitch,
  type RuntimeBindingState,
} from "../../../../src/run-history/domain/runtime-selection-rule.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * The shared rule of an agent runtime switch for every record that holds a binding (autobyteus-316 REQ-001, autobyteus-348
 * REQ-001/002/003, AC-003): what a settings save does (switch, undo, model-only) and what the activation's commit does.
 */
const claude: RuntimeBindingState = {
  binding: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, platformAgentRunId: "session-1" },
};
// `continuation: "hand_over"` matches every bare use below: another agent runtime than the session the record last ran
// on (autobyteus-53 REQ-003); a case that resumes the session overrides it explicitly.
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, continuation: "hand_over" as const };
const antigravity = { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini", llmConfig: null, continuation: "hand_over" as const };

describe("applyRuntimeSelection", () => {
  it("another agent runtime, continuation hand_over, is a switch: the new binding, no session ID, the previous binding and the switch ID remembered", () => {
    expect(applyRuntimeSelection(claude, codex, "switch-1")).toEqual({
      binding: { runtimeKind: codex.runtimeKind, llmModelIdentifier: codex.llmModelIdentifier, llmConfig: codex.llmConfig, platformAgentRunId: null },
      pendingRuntimeSwitch: { switchId: "switch-1", from: claude.binding },
    });
  });

  it("the same agent runtime, continuation hand_over, is a model hand-over: the new binding, no session ID, the previous (same-runtime) binding remembered (autobyteus-53)", () => {
    const next = applyRuntimeSelection(claude, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, continuation: "hand_over" }, "switch-1");
    expect(next).toEqual({
      binding: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, platformAgentRunId: null },
      pendingRuntimeSwitch: { switchId: "switch-1", from: claude.binding },
    });
  });

  it("a second save before the first input keeps the first previous binding and the first switch ID", () => {
    const first = applyRuntimeSelection(claude, codex, "switch-1");
    const second = applyRuntimeSelection(first, antigravity, "switch-2");
    expect(second.binding).toEqual({ runtimeKind: antigravity.runtimeKind, llmModelIdentifier: antigravity.llmModelIdentifier, llmConfig: antigravity.llmConfig, platformAgentRunId: null });
    expect(second.pendingRuntimeSwitch).toEqual(first.pendingRuntimeSwitch);
  });

  it("the previous agent runtime again, continuation same_session, is the undo: the session comes back, the pending switch goes, the chosen model is kept", () => {
    const pending = applyRuntimeSelection(claude, codex, "switch-1");
    const undone = applyRuntimeSelection(pending, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, continuation: "same_session" }, "switch-2");
    expect(undone).toEqual({
      binding: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, platformAgentRunId: "session-1" },
    });
    expect(Object.hasOwn(undone, "pendingRuntimeSwitch")).toBe(false);
  });

  it("continuation same_session on the record's own agent runtime is a model-only edit, and a pending switch stays untouched", () => {
    expect(applyRuntimeSelection(claude, { ...claude.binding, llmModelIdentifier: "opus", llmConfig: null, continuation: "same_session" }, "x")).toEqual({
      binding: { ...claude.binding, llmModelIdentifier: "opus", llmConfig: null },
    });
    const pending = applyRuntimeSelection(claude, codex, "switch-1");
    const edited = applyRuntimeSelection(pending, { ...codex, llmModelIdentifier: "gpt-5-mini" }, "x");
    expect(edited.binding.llmModelIdentifier).toBe("gpt-5-mini");
    expect(edited.pendingRuntimeSwitch).toEqual(pending.pendingRuntimeSwitch);
  });

  it("continuation same_session throws when the selection names a runtime other than the session's (a wiring mistake fails loudly)", () => {
    expect(() => applyRuntimeSelection(claude, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, continuation: "same_session" }, "x"))
      .toThrow(/continues only on its own agent runtime/);
    const pending = applyRuntimeSelection(claude, codex, "switch-1");
    expect(() => applyRuntimeSelection(pending, { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini", llmConfig: null, continuation: "same_session" }, "x"))
      .toThrow(/continues only on its own agent runtime/);
  });

  it("copies the model settings and does not alias the caller's object", () => {
    const llmConfig = { effort: "high" };
    const next = applyRuntimeSelection(claude, { ...codex, llmConfig }, "switch-1");
    llmConfig.effort = "changed";
    expect(next.binding.llmConfig).toEqual({ effort: "high" });
  });
});

/**
 * AC-006 (a)-(d): a model hand-over is pending from model A (same agent runtime on both sides); separately choosing A
 * again, a third model smaller or of unknown capacity, a third model equal to or bigger than A, or another agent
 * runtime. The continuation each case is given is what `RunModelSelectionService.validateWithEvidence` would decide.
 */
describe("applyRuntimeSelection: a model hand-over pending from A (autobyteus-53, AC-006)", () => {
  const qwenSmall: RuntimeBindingState = {
    binding: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-small", llmConfig: null, platformAgentRunId: null },
    pendingRuntimeSwitch: { switchId: "switch-A", from: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-removed", llmConfig: null, platformAgentRunId: "session-A" } },
  };

  it("(a) A again, continuation same_session: A's session resumes, nothing pending", () => {
    const resumed = applyRuntimeSelection(qwenSmall, { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-removed", llmConfig: null, continuation: "same_session" }, "switch-B");
    expect(resumed).toEqual({
      binding: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-removed", llmConfig: null, platformAgentRunId: "session-A" },
    });
  });

  it("(b) a third model smaller or unknown, continuation hand_over: still pending from A", () => {
    const next = applyRuntimeSelection(qwenSmall, { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-tiny", llmConfig: null, continuation: "hand_over" }, "switch-B");
    expect(next).toEqual({
      binding: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-tiny", llmConfig: null, platformAgentRunId: null },
      pendingRuntimeSwitch: qwenSmall.pendingRuntimeSwitch,
    });
  });

  it("(c) a third model equal to or bigger than A (both verified), continuation same_session: A's session resumes with it, nothing pending", () => {
    const resumed = applyRuntimeSelection(qwenSmall, { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-big", llmConfig: null, continuation: "same_session" }, "switch-B");
    expect(resumed).toEqual({
      binding: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-big", llmConfig: null, platformAgentRunId: "session-A" },
    });
  });

  it("(d) another agent runtime, continuation hand_over: still pending from A", () => {
    const next = applyRuntimeSelection(qwenSmall, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, continuation: "hand_over" }, "switch-B");
    expect(next).toEqual({
      binding: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: null },
      pendingRuntimeSwitch: qwenSmall.pendingRuntimeSwitch,
    });
  });

  it("RS-08: a native model edit while a switch to native is pending from another runtime, continuation hand_over: still pending from the other runtime", () => {
    const pendingFromAgy: RuntimeBindingState = {
      binding: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-small", llmConfig: null, platformAgentRunId: null },
      pendingRuntimeSwitch: { switchId: "switch-A", from: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini", llmConfig: null, platformAgentRunId: "session-A" } },
    };
    const edited = applyRuntimeSelection(pendingFromAgy, { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-big", llmConfig: null, continuation: "hand_over" }, "switch-B");
    expect(edited).toEqual({
      binding: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "qwen-big", llmConfig: null, platformAgentRunId: null },
      pendingRuntimeSwitch: pendingFromAgy.pendingRuntimeSwitch,
    });
  });
});

describe("commitRuntimeSwitch", () => {
  const pending = applyRuntimeSelection(claude, codex, "switch-1");

  it("sets the session ID and removes the pending switch in the one returned state", () => {
    const result = commitRuntimeSwitch(pending, "switch-1", "thread-9");
    expect(result).toEqual({ kind: "committed", state: { binding: { runtimeKind: codex.runtimeKind, llmModelIdentifier: codex.llmModelIdentifier, llmConfig: codex.llmConfig, platformAgentRunId: "thread-9" } } });
    expect(Object.hasOwn((result as { state: object }).state, "pendingRuntimeSwitch")).toBe(false);
  });

  it("commits a native target with no provider session (null)", () => {
    const toNative = applyRuntimeSelection(claude, { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "lmstudio:x", llmConfig: null, continuation: "hand_over" }, "switch-2");
    expect(commitRuntimeSwitch(toNative, "switch-2", null)).toMatchObject({ kind: "committed", state: { binding: { runtimeKind: "autobyteus", platformAgentRunId: null } } });
  });

  it("a stale switch ID or a record with no pending switch is a conflict, never a silent no-op", () => {
    expect(commitRuntimeSwitch(pending, "another", "thread-9")).toEqual({ kind: "conflict", reason: "switch_id_mismatch" });
    expect(commitRuntimeSwitch(claude, "switch-1", "thread-9")).toEqual({ kind: "conflict", reason: "not_pending" });
  });
});
