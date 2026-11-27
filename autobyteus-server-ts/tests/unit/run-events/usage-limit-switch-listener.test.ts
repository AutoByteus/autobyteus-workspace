import { describe, expect, it, vi } from "vitest";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { readPresentAsNotice } from "autobyteus-ts/agent/message/present-as-notice-metadata.js";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { USAGE_LIMIT_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import {
  CONTINUE_TEXT,
  noFallbackText,
  UsageLimitSwitchListener,
  type SwitchAction,
  type SwitchActionOutcome,
  type SwitchChoice,
} from "../../../src/run-events/listeners/usage-limit-switch-listener.js";
import type { RunEvent } from "../../../src/run-events/run-event-types.js";

const EVENT: RunEvent<"usage_limit_reached"> = {
  at: "2026-11-25T06:43:00.000Z", kind: "usage_limit_reached", agentRunId: "run-1",
  data: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", blockedModels: ["gpt-sol"], resetAt: "2026-11-27T09:00:00.000Z" },
};
const SUBJECT = { agentDefinitionId: "operator", agentName: "operator", agentDescription: null, runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol" };
const ROUTED: SwitchChoice = { kind: "chosen", launch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" }, chosenBy: "model_router",
  reason: "Claude worked well.", routerFailure: null };

const listenerOf = (input: Partial<{ enabled: boolean; choice: SwitchChoice; outcomes: SwitchActionOutcome[]; idle: boolean; subject: typeof SUBJECT | null;
  choose: () => Promise<SwitchChoice> }> = {}) => {
  const outcomes = [...(input.outcomes ?? [{ kind: "switched" }])];
  const switchAgentRuntime = vi.fn(async (_id: string, _action: SwitchAction) => outcomes.shift() ?? { kind: "switched" as const });
  const choose = vi.fn(input.choose ?? (async () => input.choice ?? ROUTED));
  const record = vi.fn(async () => undefined);
  const showNotice = vi.fn(async () => undefined);
  const nextIdle = vi.fn(async () => input.idle ?? true);
  const listener = new UsageLimitSwitchListener({
    enabled: () => input.enabled ?? true,
    describeRun: async () => input.subject === undefined ? SUBJECT : input.subject,
    chooser: { choose },
    switcher: { switchAgentRuntime },
    nextIdle,
    exhaustion: { exhaustedNow: () => [
      { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", until: "2026-11-27T09:00:00.000Z" },
      { runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini", until: "2026-11-25T18:00:00.000Z" },
    ] },
    showNotice,
    records: { record },
    now: () => new Date("2026-11-25T06:43:05.000Z"),
  });
  return { listener, switchAgentRuntime, choose, record, showNotice, nextIdle };
};

describe("UsageLimitSwitchListener (DS-003)", () => {
  it("switches with the cause and a continue message presented as a notice (R-10), then records C-2", async () => {
    const f = listenerOf();
    await f.listener.handle(EVENT);
    expect(f.choose).toHaveBeenCalledWith({ agentDefinitionId: "operator", agentName: "operator", agentDescription: null, why: EVENT.data });
    const action = f.switchAgentRuntime.mock.calls[0]![1];
    expect(action.launch).toEqual({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null });
    expect(action.cause).toEqual({ kind: "usage_limit", resetAt: "2026-11-27T09:00:00.000Z", chosenBy: "model_router", reason: "Claude worked well." });
    expect(action.notice.content).toBe(CONTINUE_TEXT);
    expect(CONTINUE_TEXT).toBe("Continue the task where you left off.");
    expect(action.notice.senderType).toBe(SenderType.SYSTEM);
    expect(action.notice.metadata).toMatchObject({ sender_id: USAGE_LIMIT_NOTICE_SENDER_ID, message_id: expect.any(String),
      [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true });
    expect(readPresentAsNotice(action.notice.metadata)).toEqual({ senderId: USAGE_LIMIT_NOTICE_SENDER_ID });
    // An ordinary input, not a platform notice: the hand-over preface can combine into it on the same turn.
    expect(readPlatformInputPreface(action.notice.metadata)).toBeNull();
    expect(f.showNotice).not.toHaveBeenCalled();
    // Once forwarded, the run publishes the notice with the input's id and turn (so it is recorded once, with its turn).
    action.postOptions.lifecycleObserver?.({ kind: "forwarded", acceptedAt: "2026-11-25T06:43:06.000Z", dispatchKind: "start_turn", turnId: "turn-9" } as never);
    expect(f.showNotice).toHaveBeenCalledWith("run-1", { text: CONTINUE_TEXT, messageId: action.notice.metadata.message_id, turnId: "turn-9" });
    expect(f.record).toHaveBeenCalledWith({ at: "2026-11-25T06:43:05.000Z", agentRunId: "run-1", agentDefinitionId: "operator",
      from: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol" }, to: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" },
      chosenBy: "model_router", reason: "Claude worked well.", routerFailure: null, outcome: "switched" });
  });

  it("a history choice stores no reason in the cause, but records it in C-2", async () => {
    const f = listenerOf({ choice: { kind: "chosen", launch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" }, chosenBy: "agent_history",
      reason: "most used by this agent in the last 30 days", routerFailure: "Model Routing is off" } });
    await f.listener.handle(EVENT);
    expect(f.switchAgentRuntime.mock.calls[0]![1].cause).toEqual({ kind: "usage_limit", resetAt: "2026-11-27T09:00:00.000Z", chosenBy: "agent_history", reason: null });
    expect(f.record).toHaveBeenCalledWith(expect.objectContaining({ chosenBy: "agent_history", reason: "most used by this agent in the last 30 days",
      routerFailure: "Model Routing is off", outcome: "switched" }));
  });

  it("no fallback: one Error notice naming each exhausted runtime, and C-2 no_fallback; nothing is switched", async () => {
    const f = listenerOf({ choice: { kind: "no_fallback", routerFailure: null } });
    await f.listener.handle(EVENT);
    expect(f.switchAgentRuntime).not.toHaveBeenCalled();
    expect(f.showNotice).toHaveBeenCalledOnce();
    expect(f.showNotice).toHaveBeenCalledWith("run-1",
      { text: "Usage limits reached: Codex App Server until Nov 27, 09:00 UTC; Antigravity CLI until Nov 25, 18:00 UTC. No other runtime is usable." });
    expect(f.record).toHaveBeenCalledWith(expect.objectContaining({ to: null, chosenBy: null, reason: null, outcome: "no_fallback" }));
    expect(noFallbackText([])).toBe("A usage limit was reached. No other runtime is usable.");
  });

  it("not quiet: asked once more after the next idle status; a second refusal or no idle is switch_failed", async () => {
    const retried = listenerOf({ outcomes: [{ kind: "not_quiet" }, { kind: "switched" }] });
    await retried.listener.handle(EVENT);
    expect(retried.switchAgentRuntime).toHaveBeenCalledTimes(2);
    expect(retried.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "switched" }));
    const twice = listenerOf({ outcomes: [{ kind: "not_quiet" }, { kind: "not_quiet" }] });
    await twice.listener.handle(EVENT);
    expect(twice.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "switch_failed" }));
    const neverIdle = listenerOf({ outcomes: [{ kind: "not_quiet" }], idle: false });
    await neverIdle.listener.handle(EVENT);
    expect(neverIdle.switchAgentRuntime).toHaveBeenCalledOnce();
    expect(neverIdle.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "switch_failed" }));
    const failed = listenerOf({ outcomes: [{ kind: "failed", reason: "the agent cannot be stopped quietly" }] });
    await failed.listener.handle(EVENT);
    expect(failed.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "switch_failed" }));
  });

  it("setting off, a run no longer live, or already on another runtime: nothing is chosen or recorded", async () => {
    for (const f of [listenerOf({ enabled: false }), listenerOf({ subject: null }), listenerOf({ subject: { ...SUBJECT, runtimeKind: "claude_agent_sdk" } })]) {
      await f.listener.handle(EVENT);
      expect(f.choose).not.toHaveBeenCalled();
      expect(f.record).not.toHaveBeenCalled();
    }
  });

  it("R-3: one switch in flight per run; an event for that run meanwhile is not acted on", async () => {
    let release!: (choice: SwitchChoice) => void;
    let calls = 0;
    const f = listenerOf({ choose: () => ++calls === 1 ? new Promise<SwitchChoice>((resolve) => { release = resolve; }) : Promise.resolve(ROUTED) });
    const first = f.listener.handle(EVENT);
    await vi.waitFor(() => expect(f.choose).toHaveBeenCalled());
    await f.listener.handle({ ...EVENT, at: "2026-11-25T06:43:01.000Z" });
    release(ROUTED);
    await first;
    expect(f.choose).toHaveBeenCalledOnce();
    expect(f.switchAgentRuntime).toHaveBeenCalledOnce();
    await f.listener.handle(EVENT);
    expect(f.choose).toHaveBeenCalledTimes(2);
  });
});
