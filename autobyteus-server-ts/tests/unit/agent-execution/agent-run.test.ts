import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createHarness = (options: {
  runId?: string;
  snapshot?: AgentRuntimeLifecycleSnapshot;
  postUserMessage?: ReturnType<typeof vi.fn>;
} = {}) => {
  const runId = options.runId ?? "agent-run-1";
  const context = new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: "codex_app_server",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: null,
      llmConfig: null,
      skillAccessMode: null,
    }),
    runtimeContext: null,
  });
  let snapshot: AgentRuntimeLifecycleSnapshot = options.snapshot ?? {
    availability: "active",
    phase: "idle",
    currentTurn: { kind: "NONE" },
  };
  let sourceListener:
    | ((events: readonly AgentRunEvent[]) => void | Promise<void>)
    | null = null;
  const backend = {
    runId,
    runtimeKind: context.config.runtimeKind,
    getContext: () => context,
    getPlatformAgentRunId: () => "platform-run-1",
    isActive: () => snapshot.availability === "active",
    getLifecycleSnapshot: () => snapshot,
    subscribeToSourceEventBatches: vi.fn().mockImplementation(
      (next: (events: readonly AgentRunEvent[]) => void | Promise<void>) => {
        sourceListener = next;
        return () => {
          sourceListener = null;
        };
      },
    ),
    postUserMessage: options.postUserMessage ?? vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
  };
  const run = new AgentRun({ context, backend: backend as never });
  return {
    backend,
    run,
    getSourceListener: () => sourceListener,
    setSnapshot: (value: AgentRuntimeLifecycleSnapshot) => {
      snapshot = value;
    },
  };
};

const event = (
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({ eventType, runId, payload, statusHint: null });

const observedStatuses = (events: AgentRunEvent[]) => events
  .filter((item) => item.eventType === AgentRunEventType.AGENT_STATUS)
  .map((item) => item.payload.status);

describe("AgentRun", () => {
  it("serializes delayed command facts and runtime turn evidence through one run-owned state", async () => {
    const sendDeferred = createDeferred<{ accepted: true }>();
    const harness = createHarness({
      postUserMessage: vi.fn().mockImplementation(() => sendDeferred.promise),
    });
    const observedEvents: AgentRunEvent[] = [];
    harness.run.subscribeToEvents((item) => observedEvents.push(item));

    const postPromise = harness.run.postUserMessage({ text: "start" } as never);
    await vi.waitFor(() => {
      expect(harness.backend.postUserMessage).toHaveBeenCalledTimes(1);
    });

    expect(harness.run.getStatusSnapshot()).toEqual({
      status: "initializing",
      agent_id: "agent-run-1",
    });
    expect(observedStatuses(observedEvents)).toEqual(["initializing"]);

    sendDeferred.resolve({ accepted: true });
    await postPromise;
    expect(harness.run.getStatusSnapshot().status).toBe("initializing");

    harness.setSnapshot({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "IDENTIFIED", turnId: "turn-1" },
    });
    await harness.getSourceListener()?.([
      event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }),
    ]);

    expect(harness.run.getStatusSnapshot()).toEqual({
      status: "running",
      agent_id: "agent-run-1",
    });
    expect(observedStatuses(observedEvents)).toEqual([
      "initializing",
      "initializing",
      "running",
    ]);
  });

  it("restores the prior status when command admission is rejected", async () => {
    const harness = createHarness({
      runId: "agent-run-rejected",
      postUserMessage: vi.fn().mockResolvedValue({ accepted: false, code: "REJECTED" }),
    });
    const observedEvents: AgentRunEvent[] = [];
    harness.run.subscribeToEvents((item) => observedEvents.push(item));

    await harness.run.postUserMessage({ text: "start" } as never);

    expect(observedStatuses(observedEvents)).toEqual(["initializing", "idle"]);
    expect(harness.run.getStatusSnapshot()).toEqual({
      status: "idle",
      agent_id: "agent-run-rejected",
    });
  });

  it("keeps a command failure as terminal error across a fresh empty runtime read", async () => {
    const harness = createHarness({
      runId: "agent-run-error",
      postUserMessage: vi.fn().mockRejectedValue(new Error("startup failed")),
    });
    const observedEvents: AgentRunEvent[] = [];
    harness.run.subscribeToEvents((item) => observedEvents.push(item));

    await expect(harness.run.postUserMessage({ text: "start" } as never))
      .rejects.toThrow("startup failed");

    expect(observedStatuses(observedEvents)).toEqual(["initializing", "error"]);
    expect(harness.run.getStatusSnapshot()).toEqual({
      status: "error",
      agent_id: "agent-run-error",
    });
  });

  it("publishes a status companion for local diagnostic events without making hints authoritative", async () => {
    const harness = createHarness({ runId: "agent-run-hints" });
    const observedEvents: AgentRunEvent[] = [];
    harness.run.subscribeToEvents((item) => observedEvents.push(item));

    await harness.run.publishEvent({
      ...event(harness.run.runId, AgentRunEventType.ERROR, { message: "diagnostic" }),
      statusHint: "ERROR",
    });

    expect(observedEvents.map((item) => item.eventType)).toEqual([
      AgentRunEventType.ERROR,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(observedStatuses(observedEvents)).toEqual(["idle"]);
    expect(harness.run.getStatusSnapshot().status).toBe("idle");
  });

  it("preserves source callback order when two runtime batches arrive concurrently", async () => {
    const harness = createHarness({ runId: "agent-run-ordering" });
    const observedEvents: AgentRunEvent[] = [];
    harness.run.subscribeToEvents((item) => observedEvents.push(item));
    const sourceListener = harness.getSourceListener();
    expect(sourceListener).not.toBeNull();

    const started = sourceListener?.([
      event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }),
    ]);
    const completed = sourceListener?.([
      event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }),
    ]);
    await Promise.all([started, completed]);

    expect(observedEvents.map((item) => item.eventType)).toEqual([
      AgentRunEventType.AGENT_STATUS,
      AgentRunEventType.TURN_STARTED,
      AgentRunEventType.TURN_COMPLETED,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(observedStatuses(observedEvents)).toEqual(["running", "idle"]);
  });

  it("rejects local publication for a different run id", async () => {
    const harness = createHarness();

    await expect(harness.run.publishEvent(
      event("another-run", AgentRunEventType.SEGMENT_CONTENT, { delta: "nope" }),
    )).rejects.toThrow("another-run");
  });
});
