/**
 * autobyteus-646 DS-001, R-3, R-4, R-13, R-16: the detector is runtime-agnostic. It acts on what the run's backend
 * classified as a usage limit (a terminal ERROR with error_kind, or a late ERROR_CLASSIFIED), of runs held by a
 * collaboration root, publishes at most once per (run, turn) with the scope and reset from the availability service, and
 * does its work detached from the run's dispatch queue.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { UsageLimitDetector } from "../../../src/run-events/detectors/usage-limit-detector.js";

type Listener = (event: AgentRunEvent) => void;

const fakeRun = (runId: string, runtimeKind: string, llmModelIdentifier: string) => {
  const listeners = new Set<Listener>();
  return {
    run: { runId, runtimeKind, config: { llmModelIdentifier }, subscribeToEvents: (listener: Listener) => { listeners.add(listener); return () => listeners.delete(listener); } } as never,
    emit: (payload: Record<string, unknown>, eventType = AgentRunEventType.ERROR) =>
      listeners.forEach((listener) => listener({ eventType, runId, payload, statusHint: eventType === AgentRunEventType.ERROR ? "ERROR" : null })),
    listening: () => listeners.size,
  };
};
const entry = (models: Array<{ id: string; blocked?: { until: string | null; by: string } }>) => ({ runtime: "x", name: "x", limits: [], models: models.map((model) => ({ name: model.id, ...model })) });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const detector = (input: { held?: boolean; read?: unknown } = {}) => {
  const publish = vi.fn(async (_event: unknown) => undefined);
  const readRuntime = vi.fn(async () => input.read === undefined ? null : input.read);
  const created = new UsageLimitDetector({ publish, roots: { placeOf: () => (input.held === false ? null : { root: {}, place: "host" }) as never },
    runtimes: { readRuntime } as never, now: () => new Date("2026-11-25T06:42:41.500Z") });
  return { created, publish, readRuntime };
};

afterEach(() => vi.restoreAllMocks());

describe("UsageLimitDetector", () => {
  it("R-3: the three terminal ERRORs of one failed Codex turn publish one event; scope and reset from the availability service", async () => {
    const { created, publish, readRuntime } = detector({ read: entry([
      { id: "gpt-6.1-terra", blocked: { until: "2026-11-27T09:00:00.000Z", by: "weekly" } },
      { id: "gpt-6.1-terra-mini", blocked: { until: "2026-11-27T09:00:00.000Z", by: "weekly" } },
      { id: "o4" },
    ]) });
    const codex = fakeRun("op-1", "codex_app_server", "gpt-6.1-terra");
    created.runPublished(codex.run, "new");
    codex.emit({ code: "RUNTIME_ERROR", error_effect: "terminal", error_scope: "turn", turn_id: "turn-1", error_kind: "usage_limit" });
    // R-4: nothing runs inside the run's dispatch queue.
    expect(readRuntime).not.toHaveBeenCalled();
    codex.emit({ code: "CODEX_THREAD_STATUS_FAILED", error_effect: "terminal", error_scope: "turn", turn_id: "turn-1", error_kind: "usage_limit" });
    codex.emit({ code: "CODEX_TURN_FAILED", error_effect: "terminal", error_scope: "turn", turn_id: "turn-1", error_kind: "usage_limit" });
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    await flush();
    expect(publish).toHaveBeenCalledOnce();
    expect(readRuntime).toHaveBeenCalledWith("codex_app_server");
    expect(publish).toHaveBeenCalledWith({ at: "2026-11-25T06:42:41.500Z", kind: "usage_limit_reached", agentRunId: "op-1",
      data: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-6.1-terra", blockedModels: ["gpt-6.1-terra", "gpt-6.1-terra-mini"],
        resetAt: "2026-11-27T09:00:00.000Z" } });
    // A later turn of the same run is a new key.
    codex.emit({ code: "RUNTIME_ERROR", error_effect: "terminal", turn_id: "turn-2", error_kind: "usage_limit" });
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
  });

  it("R-13: an unclassified error is not read and publishes nothing, whatever the runtime; a diagnostic error is ignored", async () => {
    const { created, publish, readRuntime } = detector({ read: entry([{ id: "opus", blocked: { until: null, by: "weekly" } }]) });
    for (const [runId, runtime] of [["op-1", "codex_app_server"], ["pm-1", "claude_agent_sdk"], ["w-1", "antigravity_cli"]] as const) {
      const run = fakeRun(runId, runtime, "opus");
      created.runPublished(run.run, "new");
      run.emit({ code: "TURN_FAILED", error_effect: "terminal", turn_id: "turn-1" });
      run.emit({ code: "RUNTIME_ERROR", error_effect: "diagnostic", turn_id: "turn-1", error_kind: "usage_limit" });
    }
    await flush();
    expect(readRuntime).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("R-16: a late ERROR_CLASSIFIED after the turn's ERROR publishes once for that turn", async () => {
    const { created, publish } = detector({ read: entry([{ id: "gemini", blocked: { until: "2026-11-26T08:00:00.000Z", by: "Gemini weekly" } }, { id: "flash" }]) });
    const agy = fakeRun("w-1", "antigravity_cli", "gemini");
    created.runPublished(agy.run, "restore");
    agy.emit({ code: "AGY_TURN_FAILED", error_effect: "terminal", turn_id: "t-1" });
    agy.emit({ turn_id: "t-1", error_kind: "usage_limit" }, AgentRunEventType.ERROR_CLASSIFIED);
    agy.emit({ turn_id: "t-1", error_kind: "usage_limit" }, AgentRunEventType.ERROR_CLASSIFIED);
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    await flush();
    expect(publish).toHaveBeenCalledOnce();
    expect(publish.mock.calls[0]![0]).toMatchObject({ agentRunId: "w-1", data: { runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini",
      blockedModels: ["gemini"], resetAt: "2026-11-26T08:00:00.000Z" } });
  });

  it("when the scope read fails: the failed model, no reset time", async () => {
    const { created, publish } = detector({ read: null });
    const codex = fakeRun("op-1", "codex_app_server", "gpt-6.1-terra");
    created.runPublished(codex.run, "new");
    codex.emit({ error_effect: "terminal", turn_id: "turn-1", error_kind: "usage_limit" });
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    expect(publish.mock.calls[0]![0]).toMatchObject({ data: { blockedModels: ["gpt-6.1-terra"], resetAt: null } });
  });

  it("skips runs no collaboration root holds (system- and application-owned); a release stops watching", async () => {
    const notHeld = detector({ held: false });
    const router = fakeRun("router", "codex_app_server", "gpt-6.1-terra");
    notHeld.created.runPublished(router.run, "new");
    router.emit({ error_effect: "terminal", turn_id: "t", error_kind: "usage_limit" });
    notHeld.created.runReleased(router.run);
    expect(router.listening()).toBe(0);
    await flush();
    expect(notHeld.publish).not.toHaveBeenCalled();
  });

  it("an error without a turn ID is keyed by the run and the second: published once", async () => {
    const { created, publish } = detector({ read: entry([{ id: "opus", blocked: { until: null, by: "weekly" } }]) });
    const claude = fakeRun("pm-1", "claude_agent_sdk", "opus");
    created.runPublished(claude.run, "new");
    claude.emit({ error_effect: "terminal", error_kind: "usage_limit" });
    claude.emit({ error_kind: "usage_limit" }, AgentRunEventType.ERROR_CLASSIFIED);
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    await flush();
    expect(publish).toHaveBeenCalledOnce();
  });
});
