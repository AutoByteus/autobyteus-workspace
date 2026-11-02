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
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null };
const antigravity = { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini", llmConfig: null };

describe("applyRuntimeSelection", () => {
  it("another agent runtime is a switch: the new binding, no session ID, the previous binding and the switch ID remembered", () => {
    expect(applyRuntimeSelection(claude, codex, "switch-1")).toEqual({
      binding: { ...codex, platformAgentRunId: null },
      pendingRuntimeSwitch: { switchId: "switch-1", from: claude.binding },
    });
  });

  it("a second save before the first input keeps the first previous binding and the first switch ID", () => {
    const first = applyRuntimeSelection(claude, codex, "switch-1");
    const second = applyRuntimeSelection(first, antigravity, "switch-2");
    expect(second.binding).toEqual({ ...antigravity, platformAgentRunId: null });
    expect(second.pendingRuntimeSwitch).toEqual(first.pendingRuntimeSwitch);
  });

  it("the previous agent runtime again is the undo: the session comes back, the pending switch goes, the chosen model is kept", () => {
    const pending = applyRuntimeSelection(claude, codex, "switch-1");
    const undone = applyRuntimeSelection(pending, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null }, "switch-2");
    expect(undone).toEqual({
      binding: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, platformAgentRunId: "session-1" },
    });
    expect(Object.hasOwn(undone, "pendingRuntimeSwitch")).toBe(false);
  });

  it("the record's own agent runtime is a model-only edit, and a pending switch stays", () => {
    expect(applyRuntimeSelection(claude, { ...claude.binding, llmModelIdentifier: "opus", llmConfig: null }, "x")).toEqual({
      binding: { ...claude.binding, llmModelIdentifier: "opus", llmConfig: null },
    });
    const pending = applyRuntimeSelection(claude, codex, "switch-1");
    const edited = applyRuntimeSelection(pending, { ...codex, llmModelIdentifier: "gpt-5-mini" }, "x");
    expect(edited.binding.llmModelIdentifier).toBe("gpt-5-mini");
    expect(edited.pendingRuntimeSwitch).toEqual(pending.pendingRuntimeSwitch);
  });

  it("copies the model settings and does not alias the caller's object", () => {
    const llmConfig = { effort: "high" };
    const next = applyRuntimeSelection(claude, { ...codex, llmConfig }, "switch-1");
    llmConfig.effort = "changed";
    expect(next.binding.llmConfig).toEqual({ effort: "high" });
  });
});

describe("commitRuntimeSwitch", () => {
  const pending = applyRuntimeSelection(claude, codex, "switch-1");

  it("sets the session ID and removes the pending switch in the one returned state", () => {
    const result = commitRuntimeSwitch(pending, "switch-1", "thread-9");
    expect(result).toEqual({ kind: "committed", state: { binding: { ...codex, platformAgentRunId: "thread-9" } } });
    expect(Object.hasOwn((result as { state: object }).state, "pendingRuntimeSwitch")).toBe(false);
  });

  it("commits a native target with no provider session (null)", () => {
    const toNative = applyRuntimeSelection(claude, { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "lmstudio:x", llmConfig: null }, "switch-2");
    expect(commitRuntimeSwitch(toNative, "switch-2", null)).toMatchObject({ kind: "committed", state: { binding: { runtimeKind: "autobyteus", platformAgentRunId: null } } });
  });

  it("a stale switch ID or a record with no pending switch is a conflict, never a silent no-op", () => {
    expect(commitRuntimeSwitch(pending, "another", "thread-9")).toEqual({ kind: "conflict", reason: "switch_id_mismatch" });
    expect(commitRuntimeSwitch(claude, "switch-1", "thread-9")).toEqual({ kind: "conflict", reason: "not_pending" });
  });
});
