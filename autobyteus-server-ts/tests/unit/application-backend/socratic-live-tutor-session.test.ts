import { describe, expect, it, vi } from "vitest";
import { createSocraticTutorSession } from "../../../../applications/socratic-math-teacher/frontend-src/socratic-tutor-session.js";

const address = {
  bindingId: "binding-lesson-1",
  target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" },
};

const buildLesson = (overrides: Record<string, unknown> = {}) => ({
  lessonId: "lesson-1",
  prompt: "Solve 3x + 5 = 20",
  tutorTargetAddress: address,
  messages: [{ role: "student", body: "Solve 3x + 5 = 20" }],
  ...overrides,
});

const withTutorResponse = (overrides: Record<string, unknown> = {}) => buildLesson({
  messages: [
    { role: "student", body: "Solve 3x + 5 = 20" },
    { role: "tutor", body: "What should you subtract from both sides?" },
  ],
  ...overrides,
});

const buildConnectionHarness = () => {
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const listeners = {
    event: new Set<(event: any) => void>(),
    error: new Set<(error: Error) => void>(),
    close: new Set<(close: unknown) => void>(),
  };
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void ready.catch(() => undefined);
  const release = (kind: keyof typeof listeners, listener: any) => () => listeners[kind].delete(listener);
  const connection = {
    ready,
    sendInput: vi.fn(async () => undefined),
    onEvent: vi.fn((listener: (event: any) => void) => {
      listeners.event.add(listener);
      return release("event", listener);
    }),
    onError: vi.fn((listener: (error: Error) => void) => {
      listeners.error.add(listener);
      return release("error", listener);
    }),
    onClose: vi.fn((listener: (close: unknown) => void) => {
      listeners.close.add(listener);
      return release("close", listener);
    }),
    close: vi.fn(() => rejectReady(new Error("Application agent connection was aborted."))),
  };
  return {
    connection,
    listeners,
    resolveReady,
    emitEvent(sequence: number, event: Record<string, unknown>) {
      for (const listener of listeners.event) listener({
        sequence,
        observedAt: "2026-07-22T12:00:00.000Z",
        applicationId: "socratic-math-teacher",
        address,
        runtimeSubject: "TEAM_RUN",
        producer: {
          runId: "team-run-1::tutor",
          memberRouteKey: "tutor",
          memberName: "tutor",
          displayName: "Tutor",
          runtimeKind: "AGENT_TEAM_MEMBER",
          teamPath: [],
        },
        event,
      });
    },
    emitError(error: Error) {
      for (const listener of listeners.error) listener(error);
    },
    emitClose() {
      for (const listener of [...listeners.close]) listener({ reason: "BINDING_ENDED" });
    },
  };
};

const connectExisting = async () => {
  const harness = buildConnectionHarness();
  const session = createSocraticTutorSession({
    agentCommunication: { connect: vi.fn(() => harness.connection) },
  });
  const connecting = session.connectLesson({ lesson: buildLesson() });
  harness.resolveReady();
  await connecting;
  return { harness, session };
};

describe("Socratic live tutor session", () => {
  it("reserves before READY, sends the initial problem once, and joins live-first with durable", async () => {
    const harness = buildConnectionHarness();
    const states: any[] = [];
    const agentCommunication = { connect: vi.fn(() => harness.connection) };
    const session = createSocraticTutorSession({
      agentCommunication,
      onStateChange: (state: any) => states.push(state),
    });

    const connecting = session.connectLesson({ lesson: buildLesson(), sendInitialProblem: true });
    expect(session.getSnapshot()).toMatchObject({
      livePhase: "connecting",
      turnAdmission: "dispatching",
      durableTutorMessageBaseline: 0,
    });
    expect(session.tryBeginObservedTurn(buildLesson())).toBeNull();
    expect(harness.connection.sendInput).not.toHaveBeenCalled();
    harness.resolveReady();
    await connecting;

    expect(agentCommunication.connect).toHaveBeenCalledWith(address);
    expect(harness.connection.onEvent).toHaveBeenCalledOnce();
    expect(harness.connection.sendInput).toHaveBeenCalledOnce();
    expect(harness.connection.sendInput).toHaveBeenCalledWith({
      text: "Solve 3x + 5 = 20",
      metadata: { lessonId: "lesson-1", requestKind: "lesson_start" },
    });
    expect(session.getSnapshot()).toMatchObject({
      livePhase: "streaming",
      turnAdmission: "awaiting_join",
      inputSent: true,
    });

    harness.emitEvent(1, { type: "TURN_STARTED" });
    harness.emitEvent(2, { type: "TEXT_DELTA", delta: "What should you subtract " });
    harness.emitEvent(2, { type: "TEXT_DELTA", delta: "duplicate" });
    harness.emitEvent(3, { type: "TEXT_DELTA", delta: "from both sides?" });
    harness.emitEvent(4, { type: "TURN_COMPLETED" });
    expect(session.getSnapshot()).toMatchObject({
      status: "completed",
      livePhase: "completed",
      text: "What should you subtract from both sides?",
      responseCompleted: true,
      lastSequence: 4,
      turnAdmission: "awaiting_join",
    });

    session.reconcileDurableLesson(withTutorResponse());
    expect(session.getSnapshot()).toMatchObject({
      status: "saved",
      durableObservedForTurn: true,
      deferDurableTutorMessages: false,
      text: "",
      errorMessage: null,
      liveWarning: null,
      turnAdmission: "available",
    });
    expect(states.some((state) => state.turnAdmission === "dispatching")).toBe(true);
  });

  it("keeps live text visible when durable wins, then atomically reveals durable on completion", async () => {
    const { harness, session } = await connectExisting();
    const admission = session.tryBeginObservedTurn(buildLesson());
    expect(admission).not.toBeNull();
    admission!.markDispatchAccepted();

    session.reconcileDurableLesson(withTutorResponse());
    expect(session.getSnapshot()).toMatchObject({
      status: "streaming",
      durableObservedForTurn: true,
      deferDurableTutorMessages: true,
      turnAdmission: "awaiting_join",
    });
    expect(session.tryBeginObservedTurn(withTutorResponse())).toBeNull();

    harness.emitEvent(1, { type: "TEXT_DELTA", delta: "  Preserve whitespace\n" });
    expect(session.getSnapshot().text).toBe("  Preserve whitespace\n");
    harness.emitEvent(2, { type: "TURN_COMPLETED" });
    expect(session.getSnapshot()).toMatchObject({
      status: "saved",
      text: "",
      deferDurableTutorMessages: false,
      turnAdmission: "available",
    });
  });

  it("turns durable-plus-error or durable-plus-close into a saved nonblocking warning", async () => {
    const first = await connectExisting();
    first.session.tryBeginObservedTurn(buildLesson())!.markDispatchAccepted();
    first.session.reconcileDurableLesson(withTutorResponse());
    first.harness.emitEvent(1, { type: "ERROR", message: "The agent response failed." });
    expect(first.session.getSnapshot()).toMatchObject({
      status: "saved",
      text: "",
      errorMessage: null,
      liveWarning: "The live tutor stream failed after the response was saved.",
      turnAdmission: "available",
    });

    const second = await connectExisting();
    second.session.tryBeginObservedTurn(buildLesson())!.markDispatchAccepted();
    second.session.reconcileDurableLesson(withTutorResponse());
    second.harness.emitClose();
    expect(second.session.getSnapshot()).toMatchObject({
      status: "saved",
      livePhase: "closed",
      turnAdmission: "closed",
      liveWarning: "The live tutor stream closed after the response was saved.",
    });
  });

  it("upgrades a failed live return when durable arrives later without resending", async () => {
    const { harness, session } = await connectExisting();
    session.tryBeginObservedTurn(buildLesson())!.markDispatchAccepted();
    harness.emitEvent(1, { type: "TEXT_DELTA", delta: "Partial" });
    harness.emitEvent(2, { type: "TURN_INTERRUPTED" });
    expect(session.getSnapshot()).toMatchObject({
      status: "failed",
      text: "Partial",
      errorMessage: "The tutor response was interrupted.",
      turnAdmission: "awaiting_join",
    });
    expect(session.tryBeginObservedTurn(buildLesson())).toBeNull();

    session.reconcileDurableLesson(withTutorResponse());
    expect(session.getSnapshot()).toMatchObject({
      status: "saved",
      text: "",
      errorMessage: null,
      liveWarning: "The live tutor stream failed after the response was saved.",
      turnAdmission: "available",
    });
    expect(harness.connection.sendInput).not.toHaveBeenCalled();
  });

  it("admits exactly one turn without mutating the baseline on denial, then re-enables after saved join", async () => {
    const { harness, session } = await connectExisting();
    const lesson = buildLesson();
    const first = session.tryBeginObservedTurn(lesson);
    expect(first).not.toBeNull();
    const claimed = session.getSnapshot();
    expect(session.tryBeginObservedTurn(lesson)).toBeNull();
    expect(session.getSnapshot()).toEqual(claimed);

    first!.markDispatchAccepted();
    expect(session.tryBeginObservedTurn(lesson)).toBeNull();
    harness.emitEvent(1, { type: "TURN_COMPLETED" });
    expect(session.tryBeginObservedTurn(lesson)).toBeNull();
    session.reconcileDurableLesson(withTutorResponse());
    expect(session.getSnapshot().turnAdmission).toBe("available");
    expect(session.tryBeginObservedTurn(withTutorResponse())).not.toBeNull();
  });

  it("keeps a rejected dispatch uncertain and ignores stale settlement after close", async () => {
    const { session } = await connectExisting();
    const handle = session.tryBeginObservedTurn(buildLesson())!;
    handle.markDispatchFailed(new Error("Follow-up acceptance is unknown."));
    expect(session.getSnapshot()).toMatchObject({
      status: "failed",
      turnAdmission: "uncertain",
      errorMessage: "Follow-up acceptance is unknown.",
    });
    expect(session.tryBeginObservedTurn(buildLesson())).toBeNull();

    session.close();
    const closed = session.getSnapshot();
    handle.markDispatchAccepted();
    handle.markDispatchFailed(new Error("late"));
    expect(session.getSnapshot()).toEqual(closed);
  });

  it("does not send for a future-only existing lesson and releases listeners exactly once", async () => {
    const first = buildConnectionHarness();
    const second = buildConnectionHarness();
    const session = createSocraticTutorSession({
      agentCommunication: {
        connect: vi.fn().mockReturnValueOnce(first.connection).mockReturnValueOnce(second.connection),
      },
    });
    const firstAttempt = session.connectLesson({ lesson: buildLesson() });
    const secondAttempt = session.connectLesson({
      lesson: buildLesson({
        lessonId: "lesson-2",
        tutorTargetAddress: {
          bindingId: "binding-lesson-2",
          target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" },
        },
      }),
    });
    await firstAttempt;
    expect(first.connection.close).toHaveBeenCalledOnce();
    expect(first.listeners.event.size).toBe(0);
    second.resolveReady();
    await secondAttempt;
    expect(second.connection.sendInput).not.toHaveBeenCalled();
    expect(session.getSnapshot().turnAdmission).toBe("available");

    session.close();
    session.close();
    expect(second.connection.close).toHaveBeenCalledOnce();
    expect(second.listeners.event.size).toBe(0);
    expect(session.getSnapshot().turnAdmission).toBe("closed");
  });

  it("marks an initial input rejection uncertain and never retries", async () => {
    const harness = buildConnectionHarness();
    harness.connection.sendInput.mockRejectedValueOnce(new Error("Application agent input was rejected."));
    const session = createSocraticTutorSession({
      agentCommunication: { connect: () => harness.connection },
    });
    const attempt = session.connectLesson({ lesson: buildLesson(), sendInitialProblem: true });
    harness.resolveReady();
    await expect(attempt).rejects.toThrow("Application agent input was rejected.");
    expect(harness.connection.sendInput).toHaveBeenCalledOnce();
    expect(session.getSnapshot()).toMatchObject({
      status: "failed",
      turnAdmission: "uncertain",
      inputSent: true,
      errorMessage: "Application agent input was rejected.",
    });
  });
});
