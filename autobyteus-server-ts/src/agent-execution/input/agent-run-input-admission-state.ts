import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentActiveTurn } from "../events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type {
  AgentRunBackendInputCapabilities,
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
  AgentRunInputLifecycle,
  AgentRunInputLifecycleObserver,
  AgentRunInputRejectionCode,
} from "./agent-run-input-contract.js";

type EntryState = "reserved" | "committed" | "queued" | "claimed" | "forwarded" | "terminal";
type InputTerminal =
  | { kind: "completed"; turnId: string | null }
  | { kind: "interrupted"; turnId: string | null }
  | { kind: "failed"; code: string; message: string; turnId: string | null };

type InputEntry = {
  readonly sequence: number;
  readonly message: AgentInputUserMessage;
  readonly observer: AgentRunInputLifecycleObserver | null;
  state: EntryState;
  dispatchKind: AgentRunBackendInputDispatch["kind"] | null;
  associatedTurnId: string | null;
  observedTurnId: string | null;
  pendingTerminal: InputTerminal | null;
};

export type AgentRunInputAdmission =
  | Readonly<{ accepted: false; code: AgentRunInputRejectionCode; message: string }>
  | Readonly<{ accepted: true; entrySequence: number }>;

export type AgentRunInputDispatchClaim = Readonly<{
  entrySequence: number;
  dispatch: AgentRunBackendInputDispatch;
}>;

export type AgentRunInputDispatchApplication =
  | Readonly<{ forwarded: false }>
  | Readonly<{ forwarded: true; turnId: string | null }>;

export type AgentRunInputSelection = Readonly<{
  activeTurn: AgentActiveTurn;
  hasPendingTurnStart: boolean;
  capabilities: AgentRunBackendInputCapabilities;
}>;

const requiredString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const safeNotify = (
  observer: AgentRunInputLifecycleObserver | null,
  fact: AgentRunInputLifecycle,
): void => {
  if (!observer) return;
  try {
    observer(fact);
  } catch {
    // Input ownership and provider dispatch must not depend on an observer.
  }
};

export class AgentRunInputAdmissionState {
  private readonly entries: InputEntry[] = [];
  private readonly quiescenceWaiters = new Set<() => void>();
  private nextSequence = 1;
  private accepting = true;
  private activeClaim: InputEntry | null = null;

  admit(
    message: AgentInputUserMessage,
    observer: AgentRunInputLifecycleObserver | null,
    runtimeAvailable: boolean,
  ): AgentRunInputAdmission {
    if (!this.accepting || !runtimeAvailable) {
      return {
        accepted: false,
        code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
        message: "AgentRun is not accepting input.",
      };
    }
    if (!message || !requiredString(message.content)) {
      return {
        accepted: false,
        code: "AGENT_RUN_INPUT_INVALID",
        message: "AgentRun input content must be a non-empty string.",
      };
    }

    const reservation = this.reserve(message, observer, runtimeAvailable);
    if (!reservation.accepted) return reservation;
    this.commitReservation(reservation.entrySequence);
    this.releaseReservation(reservation.entrySequence);
    return reservation;
  }

  reserve(
    message: AgentInputUserMessage,
    observer: AgentRunInputLifecycleObserver | null,
    runtimeAvailable: boolean,
  ): AgentRunInputAdmission {
    if (!this.accepting || !runtimeAvailable) {
      return {
        accepted: false,
        code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
        message: "AgentRun is not accepting input.",
      };
    }
    if (!message || !requiredString(message.content)) {
      return {
        accepted: false,
        code: "AGENT_RUN_INPUT_INVALID",
        message: "AgentRun input content must be a non-empty string.",
      };
    }

    const entry: InputEntry = {
      sequence: this.nextSequence++,
      message,
      observer,
      state: "reserved",
      dispatchKind: null,
      associatedTurnId: null,
      observedTurnId: null,
      pendingTerminal: null,
    };
    this.entries.push(entry);
    return { accepted: true, entrySequence: entry.sequence };
  }

  commitReservation(entrySequence: number): boolean {
    const entry = this.entries.find((candidate) => candidate.sequence === entrySequence);
    if (!entry || entry.state !== "reserved") return false;
    entry.state = "committed";
    safeNotify(entry.observer, { kind: "admitted" });
    return true;
  }

  releaseReservation(entrySequence: number): boolean {
    const entry = this.entries.find((candidate) => candidate.sequence === entrySequence);
    if (!entry || entry.state !== "committed") return false;
    entry.state = "queued";
    return true;
  }

  cancelReservation(entrySequence: number): boolean {
    const entry = this.entries.find((candidate) => candidate.sequence === entrySequence);
    if (!entry || entry.state !== "reserved") return false;
    this.removeEntry(entry);
    return true;
  }

  claimNext(selection: AgentRunInputSelection): AgentRunInputDispatchClaim | null {
    if (this.activeClaim) return null;
    const entry = this.entries.find((candidate) => candidate.state !== "terminal");
    if (!entry || entry.state !== "queued" || selection.hasPendingTurnStart) return null;

    let dispatch: AgentRunBackendInputDispatch;
    if (selection.activeTurn.kind === "NONE") {
      dispatch = { kind: "start_turn", message: entry.message };
    } else if (
      selection.activeTurn.kind === "IDENTIFIED" &&
      selection.capabilities.activeTurnAppend === "supported"
    ) {
      dispatch = {
        kind: "append_to_active_turn",
        turnId: selection.activeTurn.turnId,
        message: entry.message,
      };
    } else {
      return null;
    }

    entry.state = "claimed";
    entry.dispatchKind = dispatch.kind;
    entry.associatedTurnId = dispatch.kind === "append_to_active_turn" ? dispatch.turnId : null;
    this.activeClaim = entry;
    return { entrySequence: entry.sequence, dispatch };
  }

  isClaimForEntry(claim: AgentRunInputDispatchClaim, entrySequence: number): boolean {
    return claim.entrySequence === entrySequence &&
      this.activeClaim?.sequence === entrySequence;
  }

  applyDispatchResult(
    claim: AgentRunInputDispatchClaim,
    result: AgentRunBackendInputDispatchResult,
  ): AgentRunInputDispatchApplication {
    const entry = this.getActiveClaim(claim);
    if (!entry) return { forwarded: false };

    if (!result.forwarded) {
      const protocolViolation = entry.observedTurnId !== null;
      this.failEntry(entry, {
        code: protocolViolation
          ? "AGENT_RUN_INPUT_PROVIDER_PROTOCOL_VIOLATION"
          : requiredString(result.code) ?? "RUNTIME_COMMAND_FAILED",
        message: protocolViolation
          ? "Provider rejected input after publishing a canonical turn start."
          : requiredString(result.message) ?? "Runtime rejected the input dispatch.",
        turnId: entry.observedTurnId,
      });
      this.clearClaim(entry);
      return { forwarded: false };
    }

    const resultTurnId = requiredString(result.turnId);
    const expectedTurnId = claim.dispatch.kind === "append_to_active_turn"
      ? claim.dispatch.turnId
      : entry.observedTurnId;
    if (resultTurnId && expectedTurnId && resultTurnId !== expectedTurnId) {
      this.failEntry(entry, {
        code: "AGENT_RUN_INPUT_PROVIDER_PROTOCOL_VIOLATION",
        message: "Provider input result conflicted with the canonical turn identity.",
        turnId: expectedTurnId,
      });
      this.clearClaim(entry);
      return { forwarded: false };
    }

    entry.state = "forwarded";
    entry.associatedTurnId = expectedTurnId ?? resultTurnId;
    safeNotify(entry.observer, {
      kind: "forwarded",
      dispatchKind: claim.dispatch.kind,
      turnId: entry.associatedTurnId,
    });
    if (entry.associatedTurnId) {
      safeNotify(entry.observer, {
        kind: "turn_associated",
        turnId: entry.associatedTurnId,
      });
    }
    this.clearClaim(entry);
    this.applyPendingTerminal(entry);
    return { forwarded: true, turnId: entry.associatedTurnId };
  }

  applyDispatchFailure(claim: AgentRunInputDispatchClaim, error: unknown): void {
    const entry = this.getActiveClaim(claim);
    if (!entry) return;
    this.failEntry(entry, {
      code: entry.observedTurnId
        ? "AGENT_RUN_INPUT_PROVIDER_PROTOCOL_VIOLATION"
        : "RUNTIME_COMMAND_FAILED",
      message: entry.observedTurnId
        ? "Provider failed input dispatch after publishing a canonical turn start."
        : `Runtime input dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      turnId: entry.observedTurnId,
    });
    this.clearClaim(entry);
  }

  observeTurnStarted(turnId: string | null): void {
    if (this.activeClaim?.dispatchKind === "start_turn") {
      if (turnId && this.activeClaim.observedTurnId && this.activeClaim.observedTurnId !== turnId) {
        this.activeClaim.pendingTerminal = {
          kind: "failed",
          code: "AGENT_RUN_INPUT_PROVIDER_PROTOCOL_VIOLATION",
          message: "Provider published conflicting canonical turn-start identities.",
          turnId: this.activeClaim.observedTurnId,
        };
        return;
      }
      this.activeClaim.observedTurnId = turnId;
      return;
    }

    const entry = this.entries.find(
      (candidate) => candidate.state === "forwarded" && candidate.associatedTurnId === null,
    );
    if (!entry || !turnId) return;
    entry.associatedTurnId = turnId;
    safeNotify(entry.observer, { kind: "turn_associated", turnId });
  }

  observeTurnTerminal(terminal: Exclude<InputTerminal, { kind: "failed" }>): void {
    const claim = this.activeClaim;
    if (claim && this.terminalMatchesEntry(claim, terminal.turnId)) {
      claim.pendingTerminal = terminal;
    }
    for (const entry of [...this.entries]) {
      if (entry.state === "forwarded" && this.terminalMatchesEntry(entry, terminal.turnId)) {
        this.finishEntry(entry, terminal);
      }
    }
  }

  observeTurnFailure(input: { turnId: string; code: string; message: string }): void {
    const terminal: InputTerminal = { kind: "failed", ...input };
    if (this.activeClaim && this.terminalMatchesEntry(this.activeClaim, input.turnId)) {
      this.activeClaim.pendingTerminal = terminal;
    }
    for (const entry of [...this.entries]) {
      if (entry.state === "forwarded" && entry.associatedTurnId === input.turnId) {
        this.failEntry(entry, terminal);
      }
    }
  }

  observeRuntimeFailure(input: { code: string; message: string }): void {
    this.accepting = false;
    for (const entry of [...this.entries]) {
      if (entry.state === "terminal") continue;
      this.failEntry(entry, {
        kind: "failed",
        code: input.code,
        message: input.message,
        turnId: entry.associatedTurnId ?? entry.observedTurnId,
      });
    }
    this.activeClaim = null;
    this.resolveQuiescenceWaitersIfReady();
  }

  quiesce(): void {
    this.accepting = false;
  }

  reopen(): void {
    this.accepting = true;
  }

  settleAcceptedTermination(): void {
    if (!this.isQuiescent()) {
      throw new Error("AgentRun termination cannot settle while submitted input remains unresolved.");
    }
    this.activeClaim = null;
  }

  waitForQuiescence(): Promise<void> {
    if (this.isQuiescent()) return Promise.resolve();
    return new Promise((resolve) => this.quiescenceWaiters.add(resolve));
  }

  get queuedEntryCount(): number {
    return this.entries.filter((entry) => entry.state === "queued").length;
  }

  private getActiveClaim(claim: AgentRunInputDispatchClaim): InputEntry | null {
    return this.activeClaim?.sequence === claim.entrySequence ? this.activeClaim : null;
  }

  private clearClaim(entry: InputEntry): void {
    if (this.activeClaim === entry) {
      this.activeClaim = null;
      this.resolveQuiescenceWaitersIfReady();
    }
  }

  private terminalMatchesEntry(entry: InputEntry, turnId: string | null): boolean {
    if (turnId) {
      return entry.associatedTurnId === turnId || entry.observedTurnId === turnId;
    }
    return entry.associatedTurnId === null && entry.observedTurnId === null;
  }

  private applyPendingTerminal(entry: InputEntry): void {
    const terminal = entry.pendingTerminal;
    if (!terminal || entry.state !== "forwarded") return;
    if (terminal.kind === "failed") {
      this.failEntry(entry, terminal);
    } else {
      this.finishEntry(entry, terminal);
    }
  }

  private failEntry(
    entry: InputEntry,
    input: { code: string; message: string; turnId: string | null } | Extract<InputTerminal, { kind: "failed" }>,
  ): void {
    if (entry.state === "terminal") return;
    entry.state = "terminal";
    safeNotify(entry.observer, {
      kind: "failed",
      code: input.code,
      message: input.message,
      turnId: input.turnId,
    });
    this.removeEntry(entry);
  }

  private finishEntry(
    entry: InputEntry,
    terminal: Exclude<InputTerminal, { kind: "failed" }>,
  ): void {
    if (entry.state === "terminal") return;
    entry.state = "terminal";
    safeNotify(entry.observer, terminal);
    this.removeEntry(entry);
  }

  private removeEntry(entry: InputEntry): void {
    const index = this.entries.indexOf(entry);
    if (index >= 0) this.entries.splice(index, 1);
    this.resolveQuiescenceWaitersIfReady();
  }

  private isQuiescent(): boolean {
    return this.entries.length === 0 && this.activeClaim === null;
  }

  private resolveQuiescenceWaitersIfReady(): void {
    if (!this.isQuiescent()) return;
    const waiters = [...this.quiescenceWaiters];
    this.quiescenceWaiters.clear();
    waiters.forEach((resolve) => resolve());
  }
}
