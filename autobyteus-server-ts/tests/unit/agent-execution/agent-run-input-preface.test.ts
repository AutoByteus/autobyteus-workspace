import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata, readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunInputPreface, AgentRunPreface } from "../../../src/agent-execution/domain/agent-run-input-preface.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentRunBackendInputDispatch } from "../../../src/agent-execution/input/agent-run-input-contract.js";

// DEC-010 / DS-003: a pending platform notice is combined into the provider message of the run's
// next external input at dispatch (one dispatch, one turn); admission and the backend contract
// are unchanged.

const NOTICE = "[Platform notice — skill updated]\n\nYour skill package `code-review` has been updated (/s/code-review).\n\nChanged files:\n- SKILL.md (changed)";
const SENDER = "system.skill_update_notifier";

const event = (runId: string, eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent =>
  ({ eventType, runId, payload, statusHint: null });

/** A port holding one pending notice: take moves it in flight, returned puts it back. */
const createPrefacePort = (text: string | null = NOTICE) => {
  let pending: AgentRunPreface | null = text
    ? { id: "preface-1", text, presentation: { senderId: SENDER, content: text } }
    : null;
  const port = {
    takePreface: vi.fn(async (): Promise<AgentRunPreface | null> => {
      const taken = pending;
      pending = null;
      return taken;
    }),
    prefaceDelivered: vi.fn(),
    prefaceReturned: vi.fn((_run: AgentRun, preface: AgentRunPreface) => { pending = preface; }),
  } satisfies AgentRunInputPreface;
  return port;
};

const createHarness = (options: {
  append?: "supported" | "unsupported";
  dispatchUserInput?: ReturnType<typeof vi.fn>;
  inputPreface?: AgentRunInputPreface;
  compactionRecovery?: unknown;
  onUserMessageForwarded?: ReturnType<typeof vi.fn>;
} = {}) => {
  const runId = "agent-run-preface";
  const context = new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: "codex_app_server", agentDefinitionId: "agent-def-1", llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false, workspaceId: null, llmConfig: null,
    }),
    runtimeContext: null,
  });
  let snapshot: AgentRuntimeLifecycleSnapshot = { availability: "active", phase: "idle", currentTurn: { kind: "NONE" } };
  let sourceListener: ((events: readonly AgentRunEvent[]) => void | Promise<void>) | null = null;
  const backend = {
    runId,
    runtimeKind: context.config.runtimeKind,
    compactionRecovery: options.compactionRecovery ?? { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: options.append ?? "unsupported" },
    getContext: () => context,
    getPlatformAgentRunId: () => "platform-run-1",
    isActive: () => snapshot.availability === "active",
    getLifecycleSnapshot: () => snapshot,
    hasRunningBackgroundTasks: vi.fn(() => false),
    subscribeToSourceEventBatches: vi.fn().mockImplementation((next: typeof sourceListener) => {
      sourceListener = next;
      return () => { sourceListener = null; };
    }),
    dispatchUserInput: options.dispatchUserInput ?? vi.fn().mockResolvedValue({ forwarded: true, turnId: "turn-1" }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
    commandObservers: options.onUserMessageForwarded ? [{ onUserMessageForwarded: options.onUserMessageForwarded }] : [],
    inputPreface: options.inputPreface ?? null,
  });
  const published: AgentRunEvent[] = [];
  run.subscribeToEvents((value) => { published.push(value); });
  return {
    backend,
    run,
    published,
    emit: async (events: AgentRunEvent[]) => { await sourceListener?.(events); },
    setSnapshot: (value: AgentRuntimeLifecycleSnapshot) => { snapshot = value; },
  };
};

const dispatchedMessage = (harness: ReturnType<typeof createHarness>, call = 0): AgentInputUserMessage =>
  (harness.backend.dispatchUserInput.mock.calls[call]![0] as AgentRunBackendInputDispatch).message;

describe("AgentRun input preface (DS-003)", () => {
  it("combines the notice into one start_turn dispatch of an idle run's next input, delivered with the turn id", async () => {
    const port = createPrefacePort();
    const onUserMessageForwarded = vi.fn();
    const harness = createHarness({ inputPreface: port, onUserMessageForwarded });
    const input = new AgentInputUserMessage("Please review PR 12.", SenderType.AGENT, null, { input_origin: "inter_agent_delivery" });

    await harness.run.postUserMessage(input);

    await vi.waitFor(() => expect(port.prefaceDelivered).toHaveBeenCalledOnce());
    expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce();
    const dispatch = harness.backend.dispatchUserInput.mock.calls[0]![0] as AgentRunBackendInputDispatch;
    expect(dispatch.kind).toBe("start_turn");
    expect(dispatch.message.content).toBe(`${NOTICE}\n\nPlease review PR 12.`);
    expect(dispatch.message.senderType).toBe(SenderType.AGENT);
    expect(dispatch.message.metadata.input_origin).toBe("inter_agent_delivery");
    expect(readPlatformInputPreface(dispatch.message.metadata)).toEqual({
      content: NOTICE, senderId: SENDER, originalContent: "Please review PR 12.",
    });
    expect(port.prefaceDelivered).toHaveBeenCalledWith(harness.run, expect.objectContaining({ id: "preface-1" }), "turn-1");
    expect(port.prefaceReturned).not.toHaveBeenCalled();
    // The admitted input itself is unchanged for its observers (history records it as sent).
    await vi.waitFor(() => expect(onUserMessageForwarded).toHaveBeenCalledOnce());
    expect(onUserMessageForwarded.mock.calls[0]![0].message).toBe(input);
    // The notice is published as the run's system notice in that turn.
    await vi.waitFor(() => expect(harness.published.some((value) => value.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION)).toBe(true));
    expect(harness.published.find((value) => value.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION)!.payload)
      .toEqual({ sender_id: SENDER, content: NOTICE, turn_id: "turn-1" });
  });

  it("combines the notice into an append when the next input arrives mid-turn on an append-capable runtime", async () => {
    const port = createPrefacePort(null);
    const dispatchUserInput = vi.fn()
      .mockResolvedValueOnce({ forwarded: true, turnId: "turn-A" })
      .mockResolvedValueOnce({ forwarded: true, turnId: "turn-A" });
    const harness = createHarness({ append: "supported", dispatchUserInput, inputPreface: port });
    await harness.run.postUserMessage(new AgentInputUserMessage("A"));
    await harness.emit([event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-A" })]);
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(1));
    harness.setSnapshot({ availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-A" } });
    port.takePreface.mockResolvedValueOnce({ id: "preface-2", text: NOTICE, presentation: { senderId: SENDER, content: NOTICE } });

    await harness.run.postUserMessage(new AgentInputUserMessage("B"));

    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(2));
    expect(dispatchUserInput.mock.calls[1]![0]).toMatchObject({ kind: "append_to_active_turn", turnId: "turn-A" });
    expect(dispatchedMessage(harness, 1).content).toBe(`${NOTICE}\n\nB`);
    await vi.waitFor(() => expect(port.prefaceDelivered).toHaveBeenCalledWith(harness.run, expect.objectContaining({ id: "preface-2" }), "turn-A"));
  });

  it("returns the notice to pending when the dispatch is not forwarded, and the next input carries it", async () => {
    const port = createPrefacePort();
    const dispatchUserInput = vi.fn()
      .mockResolvedValueOnce({ forwarded: false, code: "REJECTED", message: "no", turnId: null })
      .mockResolvedValueOnce({ forwarded: true, turnId: "turn-2" });
    const harness = createHarness({ dispatchUserInput, inputPreface: port });

    await harness.run.postUserMessage(new AgentInputUserMessage("first"));
    await vi.waitFor(() => expect(port.prefaceReturned).toHaveBeenCalledOnce());
    expect(port.prefaceDelivered).not.toHaveBeenCalled();

    await harness.run.postUserMessage(new AgentInputUserMessage("second"));
    await vi.waitFor(() => expect(port.prefaceDelivered).toHaveBeenCalledOnce());
    expect(dispatchedMessage(harness, 1).content).toBe(`${NOTICE}\n\nsecond`);
  });

  it("returns the notice when the dispatch fails, and an undelivered append retried as a start carries it again", async () => {
    const failing = createPrefacePort();
    const failingHarness = createHarness({
      dispatchUserInput: vi.fn().mockRejectedValueOnce(new Error("socket closed")),
      inputPreface: failing,
    });
    await failingHarness.run.postUserMessage(new AgentInputUserMessage("lost"));
    await vi.waitFor(() => expect(failing.prefaceReturned).toHaveBeenCalledOnce());
    expect(failing.prefaceDelivered).not.toHaveBeenCalled();

    const port = createPrefacePort(null);
    const dispatchUserInput = vi.fn()
      .mockResolvedValueOnce({ forwarded: true, turnId: "turn-A" })
      .mockResolvedValueOnce({ forwarded: false, code: "CLAUDE_APPEND_TURN_MISMATCH", turnId: null, undeliveredRetryAsStart: true })
      .mockResolvedValueOnce({ forwarded: true, turnId: "turn-B" });
    const harness = createHarness({ append: "supported", dispatchUserInput, inputPreface: port });
    await harness.run.postUserMessage(new AgentInputUserMessage("A"));
    await harness.emit([event(harness.run.runId, AgentRunEventType.TURN_STARTED, { turn_id: "turn-A" })]);
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(1));
    harness.setSnapshot({ availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-A" } });
    port.takePreface.mockResolvedValueOnce({ id: "preface-3", text: NOTICE, presentation: { senderId: SENDER, content: NOTICE } });
    await harness.run.postUserMessage(new AgentInputUserMessage("B"));
    await vi.waitFor(() => expect(port.prefaceReturned).toHaveBeenCalledOnce());

    harness.setSnapshot({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } });
    await harness.emit([event(harness.run.runId, AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-A" })]);
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(3));
    expect(dispatchUserInput.mock.calls[2]![0]).toMatchObject({ kind: "start_turn" });
    expect(dispatchedMessage(harness, 2).content).toBe(`${NOTICE}\n\nB`);
    await vi.waitFor(() => expect(port.prefaceDelivered).toHaveBeenCalledWith(harness.run, expect.objectContaining({ id: "preface-3" }), "turn-B"));
  });

  it("carries the notice on a reserved input once its reservation is committed", async () => {
    const port = createPrefacePort();
    const harness = createHarness({ inputPreface: port });
    const reservation = await harness.run.reserveUserMessage(new AgentInputUserMessage("reserved task"));
    if (!reservation.reserved) throw new Error("Expected reservation.");
    expect(port.takePreface).not.toHaveBeenCalled();

    reservation.reservation.commit().release();

    await vi.waitFor(() => expect(port.prefaceDelivered).toHaveBeenCalledOnce());
    expect(dispatchedMessage(harness).content).toBe(`${NOTICE}\n\nreserved task`);
  });

  it("never puts a notice in front of a message that already is a platform notice", async () => {
    const port = createPrefacePort();
    const harness = createHarness({ inputPreface: port });
    const noticeOnly = new AgentInputUserMessage("another notice", SenderType.SYSTEM, null,
      platformInputPrefaceMetadata({ content: "another notice", senderId: SENDER, originalContent: null }));

    await harness.run.postUserMessage(noticeOnly);

    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce());
    expect(port.takePreface).not.toHaveBeenCalled();
    expect(dispatchedMessage(harness).content).toBe("another notice");
  });

  it("dispatches the input unchanged when the port fails (REQ-013)", async () => {
    const port = createPrefacePort();
    port.takePreface.mockRejectedValueOnce(new Error("store unavailable"));
    const harness = createHarness({ inputPreface: port });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await harness.run.postUserMessage(new AgentInputUserMessage("still delivered"));

    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce());
    expect(dispatchedMessage(harness).content).toBe("still delivered");
    expect(port.prefaceDelivered).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("never puts a notice in front of the compaction-recovery dispatch", async () => {
    const port = createPrefacePort();
    let block = {
      operationId: "op-1", failureEpoch: 1, position: { kind: "next_turn", failedTurnId: "turn-0" },
      state: "awaiting_user", code: "COMPACTION_FAILED", message: "Compaction failed.",
    };
    const compactionRecovery = {
      kind: "supported" as const,
      getSnapshot: () => block,
      authorize: vi.fn(async () => { block = { ...block, state: "authorized" }; return "accepted"; }),
      revokeUnused: vi.fn(async () => undefined),
    };
    const harness = createHarness({ inputPreface: port, compactionRecovery });

    await harness.run.postUserMessage(new AgentInputUserMessage("continue after the failed compaction"));

    await vi.waitFor(() => expect(harness.backend.dispatchUserInput).toHaveBeenCalledOnce());
    expect(compactionRecovery.authorize).toHaveBeenCalledOnce();
    expect(port.takePreface).not.toHaveBeenCalled();
    expect(dispatchedMessage(harness).content).toBe("continue after the failed compaction");
  });
});
