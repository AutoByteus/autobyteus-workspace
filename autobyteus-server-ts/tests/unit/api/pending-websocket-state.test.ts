import { describe, expect, it } from "vitest";
import { observePendingWebSocketState } from "../../../src/api/websocket/pending-websocket-state.js";

describe("observePendingWebSocketState", () => {
  it("records close or error synchronously while async establishment is pending", () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const state = observePendingWebSocketState({
      on: (event, listener) => { listeners.set(event, listener); },
    });
    expect(state.isClosed()).toBe(false);
    listeners.get("close")?.();
    expect(state.isClosed()).toBe(true);

    const errorState = observePendingWebSocketState({
      on: (event, listener) => { listeners.set(`second-${event}`, listener); },
    });
    listeners.get("second-error")?.(new Error("network failure"));
    expect(errorState.isClosed()).toBe(true);
  });
});
