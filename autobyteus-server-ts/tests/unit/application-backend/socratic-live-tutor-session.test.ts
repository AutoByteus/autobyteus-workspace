import { describe, expect, it, vi } from "vitest";
import { createSocraticTutorSession } from "../../../../applications/socratic-math-teacher/frontend-src/socratic-tutor-session.js";

const address = {
  bindingId: "binding-lesson-1",
  target: {
    kind: "AGENT_TEAM_MEMBER",
    memberRouteKey: "tutor",
  },
};

const buildLesson = (overrides: Record<string, unknown> = {}) => ({
  lessonId: "lesson-1",
  prompt: "Solve 3x + 5 = 20",
  tutorTargetAddress: address,
  messages: [
    { role: "student", body: "Solve 3x + 5 = 20" },
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
  const release = (kind: keyof typeof listeners, listener: any) => () => {
    listeners[kind].delete(listener);
  };
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
    close: vi.fn(() => {
      rejectReady(new Error("Application agent connection was aborted."));
    }),
  };

  return {
    connection,
    listeners,
    resolveReady,
    rejectReady,
    emitEvent(event: any) {
      for (const listener of listeners.event) listener(event);
    },
  };
};

const buildPublicEvent = (sequence: number, type: string, data: Record<string, unknown>) => ({
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
  event: {
    source: "AGENT",
    type,
    data,
  },
});

describe("Socratic live tutor session", () => {
  it("registers listeners before READY, sends the stored problem once, and renders only provider-neutral live state", async () => {
    const harness = buildConnectionHarness();
    const states: any[] = [];
    const agentCommunication = { connect: vi.fn(() => harness.connection) };
    const session = createSocraticTutorSession({
      agentCommunication,
      onStateChange: (state: any) => states.push(state),
    });

    const connecting = session.connectLesson({
      lesson: buildLesson(),
      sendInitialProblem: true,
    });

    expect(agentCommunication.connect).toHaveBeenCalledWith(address);
    expect(harness.connection.onEvent).toHaveBeenCalledOnce();
    expect(harness.connection.onError).toHaveBeenCalledOnce();
    expect(harness.connection.onClose).toHaveBeenCalledOnce();
    expect(harness.connection.sendInput).not.toHaveBeenCalled();

    harness.resolveReady();
    await connecting;

    expect(states.map((state) => state.status)).toContain("ready");
    expect(harness.connection.sendInput).toHaveBeenCalledOnce();
    expect(harness.connection.sendInput).toHaveBeenCalledWith({
      text: "Solve 3x + 5 = 20",
      metadata: {
        lessonId: "lesson-1",
        requestKind: "lesson_start",
      },
    });

    harness.emitEvent(buildPublicEvent(1, "SEGMENT_CONTENT", {
      segmentId: "reasoning-1",
      turnId: "turn-1",
      kind: "REASONING",
      delta: "hidden reasoning",
    }));
    harness.emitEvent(buildPublicEvent(2, "SEGMENT_CONTENT", {
      segmentId: "text-1",
      turnId: "turn-1",
      kind: "TEXT",
      delta: "What should you subtract ",
    }));
    harness.emitEvent(buildPublicEvent(2, "SEGMENT_CONTENT", {
      segmentId: "text-1",
      turnId: "turn-1",
      kind: "TEXT",
      delta: "duplicated",
    }));
    harness.emitEvent(buildPublicEvent(3, "SEGMENT_CONTENT", {
      segmentId: "text-1",
      turnId: "turn-1",
      kind: "TEXT",
      delta: "from both sides?",
    }));
    harness.emitEvent(buildPublicEvent(4, "TOOL_EXECUTION_STARTED", {
      invocationId: "tool-1",
      toolName: "publish_artifacts",
      turnId: "turn-1",
      argumentSummary: "must not render",
    }));
    harness.emitEvent(buildPublicEvent(5, "AGENT_RESPONSE_COMPLETED", {
      content: "provider completion content",
      reasoning: "provider reasoning",
    }));

    expect(session.getSnapshot()).toMatchObject({
      status: "streaming",
      text: "What should you subtract from both sides?",
      toolStatus: "Saving the tutor response…",
      responseCompleted: true,
      lastSequence: 5,
      inputSent: true,
    });
    expect(JSON.stringify(session.getSnapshot())).not.toContain("hidden reasoning");
    expect(JSON.stringify(session.getSnapshot())).not.toContain("argumentSummary");
    expect(JSON.stringify(session.getSnapshot())).not.toContain("provider completion content");

    session.reconcileDurableLesson(buildLesson({
      messages: [
        { role: "student", body: "Solve 3x + 5 = 20" },
        { role: "tutor", body: "What should you subtract from both sides?" },
      ],
    }));
    expect(session.getSnapshot()).toMatchObject({
      status: "saved",
      text: "",
      toolStatus: "Tutor response saved to the transcript.",
      responseCompleted: true,
    });
  });

  it("does not send for a future-only existing lesson and releases a pending connection exactly once", async () => {
    const first = buildConnectionHarness();
    const second = buildConnectionHarness();
    const agentCommunication = {
      connect: vi.fn()
        .mockReturnValueOnce(first.connection)
        .mockReturnValueOnce(second.connection),
    };
    const session = createSocraticTutorSession({ agentCommunication });

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
    await expect(firstAttempt).resolves.toBeUndefined();
    expect(first.connection.close).toHaveBeenCalledOnce();
    expect(first.listeners.event.size).toBe(0);
    expect(first.listeners.error.size).toBe(0);
    expect(first.listeners.close.size).toBe(0);

    second.resolveReady();
    await secondAttempt;
    expect(second.connection.sendInput).not.toHaveBeenCalled();

    session.close();
    session.close();
    expect(second.connection.close).toHaveBeenCalledOnce();
    expect(second.listeners.event.size).toBe(0);
    expect(second.listeners.error.size).toBe(0);
    expect(second.listeners.close.size).toBe(0);
    expect(session.getSnapshot().status).toBe("closed");
  });

  it("surfaces a safe input failure without resending uncertain work", async () => {
    const harness = buildConnectionHarness();
    harness.connection.sendInput.mockRejectedValueOnce(new Error("Application agent input was rejected."));
    const session = createSocraticTutorSession({
      agentCommunication: { connect: () => harness.connection },
    });

    const attempt = session.connectLesson({
      lesson: buildLesson(),
      sendInitialProblem: true,
    });
    harness.resolveReady();
    await expect(attempt).rejects.toThrow("Application agent input was rejected.");

    expect(harness.connection.sendInput).toHaveBeenCalledOnce();
    expect(session.getSnapshot()).toMatchObject({
      status: "failed",
      inputSent: true,
      errorMessage: "Application agent input was rejected.",
    });
  });
});
