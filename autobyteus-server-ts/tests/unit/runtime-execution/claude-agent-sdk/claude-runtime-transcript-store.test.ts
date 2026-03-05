import { describe, expect, it } from "vitest";
import { ClaudeRuntimeTranscriptStore } from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-transcript-store.js";

describe("ClaudeRuntimeTranscriptStore", () => {
  it("stores and returns cached messages for a session", () => {
    const store = new ClaudeRuntimeTranscriptStore();
    store.appendMessage("session-1", { role: "user", content: "hello" });

    expect(store.getCachedMessages("session-1")).toEqual([
      { role: "user", content: "hello" },
    ]);
  });

  it("merges sdk and local messages without duplicates", () => {
    const store = new ClaudeRuntimeTranscriptStore();
    store.appendMessage("session-1", { role: "user", content: "from-local" });
    store.appendMessage("session-1", { role: "assistant", content: "from-sdk" });

    const merged = store.getMergedMessages("session-1", [
      { role: "assistant", content: "from-sdk" },
    ]);

    expect(merged).toEqual([
      { role: "assistant", content: "from-sdk" },
      { role: "user", content: "from-local" },
    ]);
  });

  it("migrates cached transcript rows to a resolved session id", () => {
    const store = new ClaudeRuntimeTranscriptStore();
    store.appendMessage("run-1", { role: "user", content: "first-turn" });
    store.appendMessage("run-1", { role: "assistant", content: "first-reply" });
    store.appendMessage("resolved-session-1", { role: "assistant", content: "from-resolved" });

    store.migrateSessionMessages("run-1", "resolved-session-1");

    expect(store.getCachedMessages("run-1")).toEqual([]);
    expect(store.getCachedMessages("resolved-session-1")).toEqual([
      { role: "user", content: "first-turn" },
      { role: "assistant", content: "first-reply" },
      { role: "assistant", content: "from-resolved" },
    ]);
  });
});
