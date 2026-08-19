import { describe, expect, it } from "vitest";
import { CodexOrderedToolBoundaryTracker } from "../../../../../../src/agent-execution/backends/codex/events/codex-ordered-tool-boundary-tracker.js";

describe("CodexOrderedToolBoundaryTracker", () => {
  it("classifies a later matching lifecycle event as an existing-card update", () => {
    const tracker = new CodexOrderedToolBoundaryTracker();

    expect(tracker.classifyToolLifecycleUpdate("turn-1", "tool-1"))
      .toBe("result_first_creation");
    expect(tracker.classifyToolLifecycleUpdate("turn-1", "tool-1"))
      .toBe("existing_card_update");
  });

  it("retains only one exact same-turn invocation tool name", () => {
    const tracker = new CodexOrderedToolBoundaryTracker();

    tracker.markOrderedToolCreated("turn-1", "tool-1", "delegate_task");

    expect(tracker.resolveToolName("turn-1", "tool-1")).toBe("delegate_task");
    expect(tracker.resolveToolName("turn-2", "tool-1")).toBeNull();
    expect(tracker.resolveToolName("turn-1", "tool-2")).toBeNull();
  });

  it("fails closed after conflicting names for the same invocation", () => {
    const tracker = new CodexOrderedToolBoundaryTracker();

    tracker.markOrderedToolCreated("turn-1", "tool-1", "delegate_task");
    tracker.markOrderedToolCreated("turn-1", "tool-1", "review_task_result");
    tracker.markOrderedToolCreated("turn-1", "tool-1", "delegate_task");

    expect(tracker.resolveToolName("turn-1", "tool-1")).toBeNull();
  });

  it("conservatively classifies missing identity and allocates no reusable state", () => {
    const tracker = new CodexOrderedToolBoundaryTracker();

    expect(tracker.classifyToolLifecycleUpdate("turn-1", null))
      .toBe("result_first_creation");
    expect(tracker.classifyToolLifecycleUpdate("turn-1", null))
      .toBe("result_first_creation");
  });

  it("forgets ordered tools after turn and global lifecycle clears", () => {
    const tracker = new CodexOrderedToolBoundaryTracker();
    tracker.markOrderedToolCreated("turn-1", "tool-1");
    tracker.markOrderedToolCreated("turn-2", "tool-2");

    tracker.clearForTurn("turn-1");
    expect(tracker.resolveToolName("turn-1", "tool-1")).toBeNull();
    expect(tracker.classifyToolLifecycleUpdate("turn-1", "tool-1"))
      .toBe("result_first_creation");
    expect(tracker.resolveToolName("turn-2", "tool-2")).toBeNull();
    expect(tracker.classifyToolLifecycleUpdate("turn-2", "tool-2"))
      .toBe("existing_card_update");

    tracker.clearAll();
    expect(tracker.classifyToolLifecycleUpdate("turn-2", "tool-2"))
      .toBe("result_first_creation");
  });

  it("evicts the oldest turn without resetting newer ordered-tool state", () => {
    const tracker = new CodexOrderedToolBoundaryTracker();
    for (let index = 0; index <= 128; index += 1) {
      tracker.markOrderedToolCreated(`turn-${index}`, `tool-${index}`);
    }

    expect(tracker.classifyToolLifecycleUpdate("turn-0", "tool-0"))
      .toBe("result_first_creation");
    expect(tracker.classifyToolLifecycleUpdate("turn-128", "tool-128"))
      .toBe("existing_card_update");
  });
});
