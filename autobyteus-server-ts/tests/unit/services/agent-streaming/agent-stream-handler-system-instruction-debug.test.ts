import { afterEach, describe, expect, it, vi } from "vitest";

describe("Agent stream system-instruction diagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // Cold-imports the agent-streaming module graph after resetModules (about 4 s here); the default
  // 5 s timeout fails under full-suite load on the base as well (baseline timing fix).
  it("retains identifiers and derived length without serializing exact prompt content", async () => {
    vi.stubEnv("RUNTIME_RAW_EVENT_DEBUG", "1");
    vi.resetModules();
    // A run's events are numbered, and logged, by its own stream sequence (autobyteus-461 SR-087).
    const { AgentStreamSequence } = await import("../../../../src/services/agent-streaming/agent-stream-sequence.js");
    const { ServerMessage, ServerMessageType } = await import("../../../../src/services/agent-streaming/models.js");
    const sentinel = "SYSTEM_PROMPT_SENTINEL_🔒_DO_NOT_LOG";
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const sequence = new AgentStreamSequence("run-debug-1", {
      storedTurnIds: () => new Set(),
      whenPersisted: async () => undefined,
      map: () => new ServerMessage(ServerMessageType.SYSTEM_INSTRUCTIONS_SUPPLIED, {
        trace_id: "rt_debug_1", content: sentinel, ts: 1_776_000_000.25,
      }),
    });
    const connection = await sequence.connect(async () => null);
    const frames: unknown[] = [];
    connection.subscribe((frame) => frames.push(frame.message));

    sequence.accept({
      runId: "run-debug-1",
      eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED" as never,
      payload: { trace_id: "rt_debug_1", content: sentinel, ts: 1_776_000_000.25 },
      statusHint: null,
    });

    expect(consoleLog).toHaveBeenCalledWith("[RuntimeEvent]", {
      eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      trace_id: "rt_debug_1",
      ts: 1_776_000_000.25,
      contentLength: Array.from(sentinel).length,
    });
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain(sentinel);
    expect(frames).toEqual([expect.objectContaining({ type: "SYSTEM_INSTRUCTIONS_SUPPLIED", sequence: 1 })]);
  }, 30_000);
});
