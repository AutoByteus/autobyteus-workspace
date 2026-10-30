import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunBackendInputDispatch } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { runtimeSessionReopenFailedResult } from "../../../src/agent-execution/backends/shared/runtime-session-reopen.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

// autobyteus-324 SR-010 (API-05): a single run's input that fails before it is sent (a tool-list
// reopen failure) is shown on the run's stream as one ERROR frame, through the real command
// coordinator and a real AgentRun. An input that was sent and whose turn then failed gets no extra
// frame from the coordinator: the run's own ERROR reaches the stream through the run's events.

type Behavior = "reopen_fails" | "turn_fails";

const createRun = (behavior: Behavior) => {
  const runId = "run-single";
  const context = new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.GROK_BUILD, agentDefinitionId: "def", llmModelIdentifier: "grok",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: null,
    }),
    runtimeContext: null,
  });
  const listeners = new Set<(events: readonly AgentRunEvent[]) => void | Promise<void>>();
  const emit = (eventType: AgentRunEventType, payload: Record<string, unknown>) => {
    for (const listener of listeners) void listener([{ eventType, runId, payload, statusHint: null }]);
  };
  const dispatchUserInput = vi.fn(async (_dispatch: AgentRunBackendInputDispatch) => {
    if (behavior === "reopen_fails") return runtimeSessionReopenFailedResult(new Error("Session not found."));
    setTimeout(() => {
      emit(AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" });
      emit(AgentRunEventType.ERROR, {
        code: "PROVIDER_ERROR", message: "rate limited", error_scope: "turn", error_effect: "terminal", turn_id: "turn-1",
      });
    }, 0);
    return { forwarded: true, turnId: "turn-1" };
  });
  const backend = {
    runId,
    runtimeKind: RuntimeKind.GROK_BUILD,
    compactionRecovery: { kind: "unsupported" } as const,
    backgroundTaskInspection: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "unsupported" },
    getContext: () => context,
    getPlatformAgentRunId: () => "session-1",
    isActive: () => true,
    getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
    hasRunningBackgroundTasks: () => false,
    subscribeToSourceEventBatches: (listener: (events: readonly AgentRunEvent[]) => void | Promise<void>) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatchUserInput,
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    applyDefinitionTools: vi.fn(),
    getToolNames: () => [],
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
  });
  return { run, dispatchUserInput };
};

const buildCoordinator = (run: AgentRun) => {
  const frames: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const coordinator = new AgentRunCommandCoordinator({
    agentRunService: {
      getAgentRun: vi.fn(() => run),
      getRunMetadata: vi.fn(async () => ({ startedAt: "2026-10-29T00:00:00Z" })),
      resolveCommandReadyAgentRun: vi.fn(async () => run),
      recordRunActivity: vi.fn(async () => undefined),
    } as never,
    registry: new AgentRunCommandRegistry(),
    overlayStore: new AgentRunCommandStatusOverlayStore(),
    projectionService: { getRunStatusProjection: vi.fn(async () => ({ statusPayload: { status: "idle", agent_id: run.runId } })) } as never,
    broadcaster: {
      publishToRun: vi.fn((_runId: string, message: { toJson(): string }) => {
        frames.push(JSON.parse(message.toJson()));
        return 1;
      }),
    } as never,
  });
  const errors = () => frames.filter((frame) => frame.type === "ERROR");
  const post = (messageId: string, content: string) => coordinator.postUserMessage({
    runId: run.runId, messageId, dedupeKey: `dedupe-${messageId}`, message: new AgentInputUserMessage(content),
  });
  return { frames, errors, post };
};

describe("a single run's failed message that was not sent (SR-010)", () => {
  it("shows one ERROR frame with the code and the message", async () => {
    const { run, dispatchUserInput } = createRun("reopen_fails");
    const { errors, post } = buildCoordinator(run);

    const result = await post("msg-1", "Use the new tool.");
    expect(result.ack).toMatchObject({ accepted: true });
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(errors()).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(errors()).toEqual([expect.objectContaining({
      type: "ERROR",
      payload: expect.objectContaining({
        code: "RUNTIME_SESSION_REOPEN_FAILED",
        message: "Couldn't give this run its new tools (Session not found.). Send your message again to retry, or stop and resume the run.",
      }),
    })]);
  });

  it("adds no ERROR frame for a message that was sent and whose turn then failed", async () => {
    const { run, dispatchUserInput } = createRun("turn_fails");
    const { errors, post } = buildCoordinator(run);
    const runEvents: AgentRunEvent[] = [];
    run.subscribeToEvents((event) => { if ((event as AgentRunEvent).eventType) runEvents.push(event as AgentRunEvent); });

    expect((await post("msg-1", "Do the work.")).ack).toMatchObject({ accepted: true });
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledOnce());
    // The run's own ERROR (the one the stream shows) is published by the run itself.
    await vi.waitFor(() => expect(runEvents.some((event) => event.eventType === AgentRunEventType.ERROR)).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(errors()).toEqual([]);
  });
});
