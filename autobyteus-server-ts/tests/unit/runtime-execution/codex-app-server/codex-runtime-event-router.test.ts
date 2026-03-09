import { describe, expect, it, vi } from "vitest";
import {
  handleRuntimeNotification,
  isRuntimeMessageForSession,
} from "../../../../src/runtime-execution/codex-app-server/codex-runtime-event-router.js";
import { createCodexSessionStartupState } from "../../../../src/runtime-execution/codex-app-server/codex-runtime-shared.js";

const createState = () => ({
  runId: "run-1",
  client: {} as never,
  threadId: "thread-1",
  model: "gpt-5.3-codex",
  workingDirectory: "/tmp/workspace",
  reasoningEffort: "medium",
  currentStatus: "IDLE",
  activeTurnId: null,
  startup: createCodexSessionStartupState(),
  approvalRecords: new Map(),
  listeners: new Set(),
  unbindHandlers: [],
  teamRunId: null,
  memberName: null,
  sendMessageToEnabled: false,
});

describe("codex-runtime-event-router", () => {
  it("routes startup notifications to a session even when multiple sessions exist", () => {
    const state = createState();

    expect(
      isRuntimeMessageForSession(state, "codex/event/mcp_startup_complete", {}, 2),
    ).toBe(true);
  });

  it("marks the session startup state ready on mcp startup complete", async () => {
    const state = createState();
    const emitEvent = vi.fn();

    handleRuntimeNotification(
      state,
      "codex/event/mcp_startup_complete",
      {
        msg: {
          type: "mcp_startup_complete",
          ready: ["browser"],
          failed: [],
          cancelled: [],
        },
      },
      emitEvent,
    );

    await expect(state.startup.waitForReady).resolves.toBeUndefined();
    expect(state.startup.status).toBe("ready");
    expect(emitEvent).toHaveBeenCalledWith(
      state,
      expect.objectContaining({
        method: "codex/event/mcp_startup_complete",
      }),
    );
  });

  it("updates current status on turn lifecycle notifications", () => {
    const state = createState();
    const emitEvent = vi.fn();

    handleRuntimeNotification(
      state,
      "turn/started",
      {
        threadId: "thread-1",
        turn: {
          id: "turn-1",
        },
      },
      emitEvent,
    );
    expect(state.currentStatus).toBe("RUNNING");
    expect(state.activeTurnId).toBe("turn-1");

    handleRuntimeNotification(
      state,
      "turn/completed",
      {
        threadId: "thread-1",
        turn: {
          id: "turn-1",
        },
      },
      emitEvent,
    );
    expect(state.currentStatus).toBe("IDLE");
    expect(state.activeTurnId).toBeNull();
  });
});
