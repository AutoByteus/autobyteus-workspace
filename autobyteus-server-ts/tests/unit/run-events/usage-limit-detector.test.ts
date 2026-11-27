/**
 * autobyteus-646 DS-001, C-4, R-3, R-4: the detector watches terminal ERRORs of runs held by a collaboration root,
 * recognizes a usage limit (Codex: its own error_kind; others: the runtime's model blocked in a limits read after the
 * error), publishes at most once per (run, turn), and does its work detached from the run's dispatch queue.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { UsageLimitDetector } from "../../../src/run-events/detectors/usage-limit-detector.js";

type Listener = (event: AgentRunEvent) => void;

const fakeRun = (runId: string, runtimeKind: string, llmModelIdentifier: string) => {
  const listeners = new Set<Listener>();
  return {
    run: { runId, runtimeKind, config: { llmModelIdentifier }, subscribeToEvents: (listener: Listener) => { listeners.add(listener); return () => listeners.delete(listener); } } as never,
    emit: (payload: Record<string, unknown>) => listeners.forEach((listener) => listener({ eventType: AgentRunEventType.ERROR, runId, payload, statusHint: "ERROR" })),
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
  it("R-3: the three terminal ERRORs of one failed Codex turn publish one event, with the blocked models and reset from Codex's limits", async () => {
    const { created, publish, readRuntime } = detector({ read: entry([
      { id: "gpt-6.1-terra", blocked: { until: "2026-11-27T09:00:00.000Z", by: "weekly" } },
      { id: "gpt-6.1-terra-mini", blocked: { until: "2026-11-27T09:00:00.000Z", by: "weekly" } },
      { id: "gpt-5", blocked: { until: "2026-11-25T08:00:00.000Z", by: "5h" } },
      { id: "o4" },
    ]) });
    const codex = fakeRun("op-1", "codex_app_server", "gpt-6.1-terra");
    created.runPublished(codex.run, "new");
    codex.emit({ code: "RUNTIME_ERROR", error_effect: "terminal", error_scope: "turn", turn_id: "turn-1", error_kind: "usage_limit" });
    // R-4: nothing runs inside the run's dispatch queue.
    expect(readRuntime).not.toHaveBeenCalled();
    codex.emit({ code: "CODEX_TURN_FAILED", error_effect: "terminal", error_scope: "turn", turn_id: "turn-1", error_kind: "usage_limit" });
    codex.emit({ code: "CODEX_THREAD_STATUS_FAILED", error_effect: "terminal", error_scope: "turn", turn_id: "turn-1" });
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

  it("Codex: an error it does not call a usage limit is not read again; a diagnostic error is ignored", async () => {
    const { created, publish, readRuntime } = detector({ read: entry([{ id: "gpt-6.1-terra", blocked: { until: null, by: "weekly" } }]) });
    const codex = fakeRun("op-1", "codex_app_server", "gpt-6.1-terra");
    created.runPublished(codex.run, "new");
    codex.emit({ code: "CODEX_TURN_FAILED", error_effect: "terminal", turn_id: "turn-1" });
    codex.emit({ code: "RUNTIME_ERROR", error_effect: "diagnostic", turn_id: "turn-1", error_kind: "usage_limit" });
    await flush();
    expect(readRuntime).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("another runtime: the limits read after the error decides; its model blocked publishes, not blocked logs at debug and publishes nothing", async () => {
    const blocked = detector({ read: entry([{ id: "opus", blocked: { until: "2026-11-26T08:00:00.000Z", by: "weekly opus" } }, { id: "sonnet" }]) });
    const claude = fakeRun("pm-1", "claude_agent_sdk", "opus");
    blocked.created.runPublished(claude.run, "restore");
    claude.emit({ code: "CLAUDE_TURN_FAILED", error_effect: "terminal", turn_id: "t-1" });
    await vi.waitFor(() => expect(blocked.publish).toHaveBeenCalledOnce());
    expect(blocked.publish.mock.calls[0]![0]).toMatchObject({ data: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", blockedModels: ["opus"],
      resetAt: "2026-11-26T08:00:00.000Z" } });

    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const unrelated = detector({ read: entry([{ id: "opus" }]) });
    const other = fakeRun("pm-2", "claude_agent_sdk", "opus");
    unrelated.created.runPublished(other.run, "new");
    other.emit({ code: "CLAUDE_TURN_FAILED", error_effect: "terminal", turn_id: "t-1" });
    await vi.waitFor(() => expect(debug).toHaveBeenCalledWith(expect.stringContaining("not a usage limit (its model is not blocked)")));
    expect(unrelated.publish).not.toHaveBeenCalled();
  });

  it("Codex's own word stands when its limits can't be read: the failed model, no reset time", async () => {
    const { created, publish } = detector({ read: null });
    const codex = fakeRun("op-1", "codex_app_server", "gpt-6.1-terra");
    created.runPublished(codex.run, "new");
    codex.emit({ error_effect: "terminal", turn_id: "turn-1", error_kind: "usage_limit" });
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    expect(publish.mock.calls[0]![0]).toMatchObject({ data: { blockedModels: ["gpt-6.1-terra"], resetAt: null } });
  });

  it("skips runs no collaboration root holds (system- and application-owned) and native AutoByteus runs; a release stops watching", async () => {
    const notHeld = detector({ held: false });
    const router = fakeRun("router", "codex_app_server", "gpt-6.1-terra");
    notHeld.created.runPublished(router.run, "new");
    router.emit({ error_effect: "terminal", turn_id: "t", error_kind: "usage_limit" });
    const native = fakeRun("native", "autobyteus", "lmstudio-model");
    notHeld.created.runPublished(native.run, "new");
    expect(native.listening()).toBe(0);
    notHeld.created.runReleased(router.run);
    expect(router.listening()).toBe(0);
    await flush();
    expect(notHeld.publish).not.toHaveBeenCalled();
  });

  it("an error without a turn ID is keyed by the run and the second: published once", async () => {
    const { created, publish } = detector({ read: entry([{ id: "opus", blocked: { until: null, by: "weekly" } }]) });
    const claude = fakeRun("pm-1", "claude_agent_sdk", "opus");
    created.runPublished(claude.run, "new");
    claude.emit({ error_effect: "terminal" });
    claude.emit({ error_effect: "terminal" });
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    await flush();
    expect(publish).toHaveBeenCalledOnce();
  });
});
