import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { ApplicationAgentStreamSubscription } from "../../../src/application-agent-streaming/services/application-agent-stream-subscription.js";
import { ApplicationAgentEventMapper } from "../../../src/application-agent-streaming/services/application-agent-stream-event-mapper.js";
import { APPLICATION_AGENT_EVENT_QUEUE_LIMIT } from "../../../src/application-communication-limits.js";

const address = { bindingId: "binding-1", target: { kind: "AGENT_RUN" as const } };
const producer = { runId: "run-1", memberRouteKey: "root", memberName: "Root", displayName: "Root", runtimeKind: "AGENT" as const, teamPath: [] };
const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({ eventType, payload, runId: "run-1", statusHint: null });
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };

const setup = () => {
  let sourceListener!: (source: never) => void;
  let terminal!: () => void;
  const released = vi.fn();
  const sourceReleased = vi.fn();
  const preReadyFailure = vi.fn();
  const emitted: Array<{ kind: string; value: unknown }> = [];
  const subscription = new ApplicationAgentStreamSubscription({
    applicationId: "app-1",
    address,
    orchestration: {
      openAgentEventStreamLease: vi.fn(async (_app, _address, onTerminal) => {
        terminal = onTerminal;
        return {
          descriptor: { applicationId: "app-1", address, runtimeSubject: "AGENT_RUN", runtimeRunId: "run-1", producers: [producer] },
          release: released,
        };
      }),
    } as never,
    runtimeSource: {
      attach: vi.fn((_descriptor, listener) => { sourceListener = listener; return sourceReleased; }),
    } as never,
    mapper: new ApplicationAgentEventMapper(),
    emitter: {
      emitEvent: async (value) => { emitted.push({ kind: "event", value }); },
      emitError: async (value) => { emitted.push({ kind: "error", value }); },
      emitClosed: async (value) => { emitted.push({ kind: "closed", value }); },
    },
    onPreReadyTerminal: vi.fn(),
    onPreReadyFailure: preReadyFailure,
    onFinalized: vi.fn(),
  });
  return { subscription, emit: (source: unknown) => sourceListener(source as never), terminal: () => terminal(), emitted, released, sourceReleased, preReadyFailure };
};

describe("ApplicationAgentStreamSubscription", () => {
  it("retains accepted events while paused, drops excluded events without sequence, then drains FIFO", async () => {
    const harness = setup();
    await harness.subscription.establishPaused();
    harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.ARTIFACT_PERSISTED, {}) });
    harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1", providerSecret: "drop" }) });
    expect(harness.emitted).toEqual([]);
    expect(harness.subscription.beginReadyCommit()).toBe(true);
    expect(harness.subscription.enableDrain()).toBe(true);
    await flush();
    expect(harness.emitted).toHaveLength(1);
    expect(harness.emitted[0]?.kind).toBe("event");
    expect(harness.emitted[0]?.value).toMatchObject({ sequence: 1, applicationId: "app-1", producer, event: { source: "AGENT", type: "TURN_STARTED", data: { turnId: "turn-1" } } });
    expect(JSON.stringify(harness.emitted[0]?.value)).not.toContain("providerSecret");
  });

  it("lets terminal-before-ready discard the paused FIFO and release source only once", async () => {
    const harness = setup();
    await harness.subscription.establishPaused();
    harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }) });
    harness.terminal();
    expect(harness.subscription.enableDrain()).toBe(false);
    harness.subscription.cancelPreReady();
    await flush();
    expect(harness.emitted).toEqual([]);
    expect(harness.sourceReleased).toHaveBeenCalledOnce();
    expect(harness.released).toHaveBeenCalledOnce();
  });

  it("isolates mapping failures as a safe error followed by STREAM_FAILED", async () => {
    const harness = setup();
    await harness.subscription.establishPaused();
    expect(harness.subscription.beginReadyCommit()).toBe(true);
    expect(harness.subscription.enableDrain()).toBe(true);
    harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.SEGMENT_CONTENT, { segmentId: "segment-1" }) });
    await flush();
    expect(harness.emitted).toEqual([
      { kind: "error", value: { code: "EVENT_MAPPING_FAILED", message: "The application agent event could not be projected safely.", recoverable: false } },
      { kind: "closed", value: { reason: "STREAM_FAILED" } },
    ]);
  });

  it("retains assigned sequence values when terminal follows the READY commit start", async () => {
    const harness = setup();
    await harness.subscription.establishPaused();
    harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }) });
    expect(harness.subscription.beginReadyCommit()).toBe(true);
    harness.terminal();
    expect(harness.subscription.enableDrain()).toBe(true);
    await flush();
    expect(harness.emitted.map((entry) => entry.kind)).toEqual(["event", "closed"]);
    expect(harness.emitted[0]?.value).toMatchObject({ sequence: 1, event: { data: { turnId: "turn-1" } } });
    expect(harness.emitted[1]?.value).toEqual({ reason: "BINDING_ENDED" });
  });

  it("accepts exactly the configured event queue limit with contiguous sequence", async () => {
    const harness = setup();
    await harness.subscription.establishPaused();
    for (let index = 0; index < APPLICATION_AGENT_EVENT_QUEUE_LIMIT; index += 1) {
      harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.TURN_STARTED, { turnId: `turn-${index}` }) });
    }
    expect(harness.preReadyFailure).not.toHaveBeenCalled();
    expect(harness.subscription.beginReadyCommit()).toBe(true);
    expect(harness.subscription.enableDrain()).toBe(true);
    await flush();
    expect(harness.emitted).toHaveLength(APPLICATION_AGENT_EVENT_QUEUE_LIMIT);
    expect((harness.emitted.at(-1)?.value as { sequence: number }).sequence).toBe(APPLICATION_AGENT_EVENT_QUEUE_LIMIT);
  });

  it("fails only the consumer when one event exceeds the configured queue limit", async () => {
    const harness = setup();
    await harness.subscription.establishPaused();
    for (let index = 0; index <= APPLICATION_AGENT_EVENT_QUEUE_LIMIT; index += 1) {
      harness.emit({ source: "AGENT", producer, event: event(AgentRunEventType.TURN_STARTED, { turnId: `turn-${index}` }) });
    }
    expect(harness.preReadyFailure).toHaveBeenCalledOnce();
    expect(harness.preReadyFailure).toHaveBeenCalledWith({
      code: "BACKPRESSURE_LIMIT",
      message: "The application agent event stream exceeded its backpressure limit.",
      recoverable: true,
    });
    expect(harness.subscription.beginReadyCommit()).toBe(false);
    expect(harness.released).toHaveBeenCalledOnce();
  });
});
