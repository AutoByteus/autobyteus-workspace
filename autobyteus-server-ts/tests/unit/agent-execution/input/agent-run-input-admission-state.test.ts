import { describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunInputAdmissionState } from "../../../../src/agent-execution/input/agent-run-input-admission-state.js";
import type { AgentRunInputLifecycle } from "../../../../src/agent-execution/input/agent-run-input-contract.js";

const SUPPORTED = { activeTurnAppend: "supported" } as const;
const UNSUPPORTED = { activeTurnAppend: "unsupported" } as const;
const NONE = { kind: "NONE" } as const;
const turn = (turnId: string) => ({ kind: "IDENTIFIED", turnId }) as const;

const createState = () => {
  const state = new AgentRunInputAdmissionState();
  const facts = new Map<string, AgentRunInputLifecycle[]>();
  const admit = (content: string) => {
    const log: AgentRunInputLifecycle[] = [];
    facts.set(content, log);
    const admission = state.admit(new AgentInputUserMessage(content), (fact) => log.push(fact), true);
    if (!admission.accepted) throw new Error(admission.code);
    return admission.entrySequence;
  };
  /** start_turn A forwarded into `turnId` (the IMP-DI-001 precondition). */
  const startTurn = (content: string, turnId: string) => {
    admit(content);
    const claim = state.claimNext({ activeTurn: NONE, hasPendingTurnStart: false, capabilities: SUPPORTED })!;
    expect(claim.dispatch.kind).toBe("start_turn");
    state.observeTurnStarted(turnId);
    expect(state.applyDispatchResult(claim, { forwarded: true, turnId })).toEqual({ forwarded: true, turnId });
  };
  const kinds = (content: string) => facts.get(content)!.map((fact) => fact.kind);
  return { state, admit, startTurn, facts, kinds };
};

describe("AgentRunInputAdmissionState active-turn append claim (SR-011, AC-015)", () => {
  it("appends input posted while an earlier input's turn runs instead of waiting (IMP-DI-001 repro)", () => {
    const { state, admit, startTurn } = createState();
    startTurn("A", "turn-A");
    admit("B");

    const claim = state.claimNext({ activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: SUPPORTED });

    expect(claim?.dispatch).toEqual({
      kind: "append_to_active_turn",
      turnId: "turn-A",
      message: expect.objectContaining({ content: "B" }),
    });
  });

  it("appends B then C in order and resolves each exactly once at the turn terminal", () => {
    const { state, admit, startTurn, kinds } = createState();
    startTurn("A", "turn-A");
    admit("B");
    admit("C");
    const selection = { activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: SUPPORTED };

    const claimB = state.claimNext(selection)!;
    expect(state.claimNext(selection)).toBeNull(); // one active claim at a time
    state.applyDispatchResult(claimB, { forwarded: true, turnId: "turn-A" });
    const claimC = state.claimNext(selection)!;
    expect(claimC.dispatch.message.content).toBe("C");
    state.applyDispatchResult(claimC, { forwarded: true, turnId: "turn-A" });
    state.observeTurnTerminal({ kind: "completed", turnId: "turn-A" });
    state.observeTurnTerminal({ kind: "completed", turnId: "turn-A" });

    for (const content of ["A", "B", "C"]) {
      expect(kinds(content).filter((kind) => kind === "completed")).toHaveLength(1);
    }
    expect(kinds("B")).toEqual(["admitted", "forwarded", "turn_associated", "completed"]);
  });

  it("stops at a reservation ahead of the next queued input, preserving FIFO order", () => {
    const { state, admit, startTurn } = createState();
    startTurn("A", "turn-A");
    const reserved = state.reserve(new AgentInputUserMessage("reserved"), null, true);
    admit("B");

    expect(reserved.accepted).toBe(true);
    expect(state.claimNext({ activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: SUPPORTED })).toBeNull();
  });

  it("does not skip entries forwarded into a different turn, and blocks while a turn start is pending", () => {
    const { state, admit, startTurn } = createState();
    startTurn("A", "turn-A");
    admit("B");

    expect(state.claimNext({ activeTurn: turn("turn-provider"), hasPendingTurnStart: false, capabilities: SUPPORTED })).toBeNull();
    expect(state.claimNext({ activeTurn: turn("turn-A"), hasPendingTurnStart: true, capabilities: SUPPORTED })).toBeNull();
    expect(state.claimNext({ activeTurn: { kind: "ANONYMOUS" }, hasPendingTurnStart: false, capabilities: SUPPORTED })).toBeNull();
  });

  it("keeps runtimes without append support waiting until the turn terminal", () => {
    const { state, admit, startTurn } = createState();
    startTurn("A", "turn-A");
    admit("B");

    expect(state.claimNext({ activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: UNSUPPORTED })).toBeNull();
    state.observeTurnTerminal({ kind: "completed", turnId: "turn-A" });
    expect(state.claimNext({ activeTurn: NONE, hasPendingTurnStart: false, capabilities: UNSUPPORTED })?.dispatch.kind).toBe("start_turn");
  });
});

describe("AgentRunInputAdmissionState definitely-undelivered append (AC-016)", () => {
  it("requeues a proven-undelivered append without failing it and starts it after the terminal, with no retry loop", () => {
    const { state, admit, startTurn, kinds } = createState();
    startTurn("A", "turn-A");
    admit("B");
    admit("C");
    const selection = { activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: SUPPORTED };
    const claimB = state.claimNext(selection)!;

    expect(state.applyDispatchResult(claimB, {
      forwarded: false,
      code: "CLAUDE_APPEND_TURN_MISMATCH",
      turnId: null,
      undeliveredRetryAsStart: true,
    })).toEqual({ forwarded: false });

    expect(kinds("B")).toEqual(["admitted"]);
    expect(state.claimNext(selection)).toBeNull(); // B stays first and is never appended into turn-A again
    state.observeTurnTerminal({ kind: "completed", turnId: "turn-A" });
    const restart = state.claimNext({ activeTurn: NONE, hasPendingTurnStart: false, capabilities: SUPPORTED })!;
    expect(restart.dispatch).toEqual({ kind: "start_turn", message: expect.objectContaining({ content: "B" }) });
  });

  it("may append a requeued input into a different later turn", () => {
    const { state, admit, startTurn } = createState();
    startTurn("A", "turn-A");
    admit("B");
    const claimB = state.claimNext({ activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: SUPPORTED })!;
    state.applyDispatchResult(claimB, { forwarded: false, turnId: null, undeliveredRetryAsStart: true });
    state.observeTurnTerminal({ kind: "completed", turnId: "turn-A" });

    const claim = state.claimNext({ activeTurn: turn("turn-provider"), hasPendingTurnStart: false, capabilities: SUPPORTED });

    expect(claim?.dispatch).toMatchObject({ kind: "append_to_active_turn", turnId: "turn-provider" });
  });

  it("still fails an ambiguous append rejection visibly", () => {
    const { state, admit, startTurn, facts } = createState();
    startTurn("A", "turn-A");
    admit("B");
    const claimB = state.claimNext({ activeTurn: turn("turn-A"), hasPendingTurnStart: false, capabilities: SUPPORTED })!;

    state.applyDispatchResult(claimB, { forwarded: false, code: "CODEX_TURN_STEER_REJECTED", message: "rejected", turnId: null });

    expect(facts.get("B")!.at(-1)).toMatchObject({ kind: "failed", code: "CODEX_TURN_STEER_REJECTED" });
  });

  it("ignores the undelivered flag on a start_turn dispatch", () => {
    const { state, admit, facts } = createState();
    admit("A");
    const claim = state.claimNext({ activeTurn: NONE, hasPendingTurnStart: false, capabilities: SUPPORTED })!;

    state.applyDispatchResult(claim, { forwarded: false, code: "X", message: "x", turnId: null, undeliveredRetryAsStart: true });

    expect(facts.get("A")!.at(-1)).toMatchObject({ kind: "failed", code: "X" });
  });
});
