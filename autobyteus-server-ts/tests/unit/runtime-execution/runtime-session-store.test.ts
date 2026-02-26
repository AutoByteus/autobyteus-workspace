import { describe, expect, it } from "vitest";
import { RuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";

describe("RuntimeSessionStore", () => {
  it("stores and retrieves runtime sessions", () => {
    const store = new RuntimeSessionStore();
    store.upsertSession({
      runId: "run-1",
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "autobyteus",
        sessionId: "run-1",
        threadId: null,
        metadata: null,
      },
    });

    const session = store.getSession("run-1");
    expect(session).toBeTruthy();
    expect(session?.runtimeKind).toBe("autobyteus");
    expect(store.listSessions()).toHaveLength(1);
  });

  it("removes sessions", () => {
    const store = new RuntimeSessionStore();
    store.upsertSession({
      runId: "run-1",
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: null,
    });
    store.removeSession("run-1");
    expect(store.getSession("run-1")).toBeNull();
  });
});
