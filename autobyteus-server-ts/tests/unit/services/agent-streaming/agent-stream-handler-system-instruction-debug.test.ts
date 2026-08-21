import { afterEach, describe, expect, it, vi } from "vitest";

describe("AgentStreamHandler system-instruction diagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("retains identifiers and derived length without serializing exact prompt content", async () => {
    vi.stubEnv("RUNTIME_RAW_EVENT_DEBUG", "1");
    vi.resetModules();
    const { AgentStreamHandler } = await import(
      "../../../../src/services/agent-streaming/agent-stream-handler.js"
    );
    const sentinel = "SYSTEM_PROMPT_SENTINEL_🔒_DO_NOT_LOG";
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const messageMapper = {
      map: vi.fn().mockReturnValue({
        type: "SYSTEM_INSTRUCTIONS_SUPPLIED",
        payload: {
          trace_id: "rt_debug_1",
          content: sentinel,
          ts: 1_776_000_000.25,
        },
      }),
    };
    const handler = new AgentStreamHandler(
      {} as never,
      {} as never,
      messageMapper as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const sink = { send: vi.fn() };

    await (handler as any).forwardRunEvent(sink, "run-debug-1", {
      runId: "run-debug-1",
      eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      payload: {
        trace_id: "rt_debug_1",
        content: sentinel,
        ts: 1_776_000_000.25,
      },
      statusHint: null,
    });

    expect(consoleLog).toHaveBeenCalledWith("[RuntimeEvent]", {
      eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      trace_id: "rt_debug_1",
      ts: 1_776_000_000.25,
      contentLength: Array.from(sentinel).length,
    });
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain(sentinel);
    expect(sink.send).toHaveBeenCalledWith(expect.objectContaining({
      type: "SYSTEM_INSTRUCTIONS_SUPPLIED",
    }));
  });
});
