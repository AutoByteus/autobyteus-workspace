export const SOCRATIC_TURN_BUSY_NOTICE =
  "Wait for the current tutor response to be saved before sending another.";

const TERMINAL_LIVE_PHASES = new Set(["completed", "failed", "closed"]);

export const createIdleSocraticTutorState = (lessonId = null) => ({
  lessonId,
  status: "idle",
  livePhase: "idle",
  durableObservedForTurn: false,
  turnAdmission: "closed",
  durableTutorMessageBaseline: 0,
  deferDurableTutorMessages: false,
  text: "",
  responseCompleted: false,
  errorMessage: null,
  liveWarning: null,
  lastSequence: 0,
  inputSent: false,
});

const countDurableTutorMessages = (lesson) => (
  Array.isArray(lesson?.messages)
    ? lesson.messages.filter((message) => message?.role === "tutor").length
    : 0
);

const safeErrorMessage = (error) => (
  error instanceof Error && error.message.trim()
    ? error.message
    : "The tutor connection failed."
);

const addressKey = (address) => address ? JSON.stringify(address) : null;

const isTerminalLivePhase = (phase) => TERMINAL_LIVE_PHASES.has(phase);

const deriveStatus = (state) => {
  if (state.durableObservedForTurn && isTerminalLivePhase(state.livePhase)) return "saved";
  if (state.livePhase === "completed") return "completed";
  return state.livePhase;
};

export const createSocraticTutorSession = ({ agentCommunication, onStateChange }) => {
  let snapshot = createIdleSocraticTutorState();
  let active = null;
  let generation = 0;
  let currentAdmissionHandle = null;

  const publish = (next) => {
    const merged = { ...snapshot, ...next };
    snapshot = { ...merged, status: deriveStatus(merged) };
    onStateChange?.({ ...snapshot });
  };

  const invalidateAdmission = () => {
    currentAdmissionHandle = null;
  };

  const releaseActive = ({ closeConnection }) => {
    const current = active;
    active = null;
    if (!current) return;
    for (const release of current.releases.splice(0)) release();
    if (closeConnection) current.connection.close();
  };

  const isActiveLesson = (lesson) => Boolean(
    active
    && active.lessonId === lesson?.lessonId
    && active.addressKey === addressKey(lesson?.tutorTargetAddress)
  );

  const activeStillOwnsSnapshot = () => Boolean(
    active && active.lessonId === snapshot.lessonId
  );

  const safeLiveWarning = (phase) => {
    if (phase === "failed") return "The live tutor stream failed after the response was saved.";
    if (phase === "closed") return "The live tutor stream closed after the response was saved.";
    return "The live tutor response was interrupted after the response was saved.";
  };

  const completeSavedJoin = ({ warning = null } = {}) => {
    invalidateAdmission();
    publish({
      durableObservedForTurn: true,
      deferDurableTutorMessages: false,
      text: "",
      errorMessage: null,
      liveWarning: warning,
      turnAdmission: activeStillOwnsSnapshot() ? "available" : "closed",
    });
  };

  const beginClaim = (lesson) => {
    if (!isActiveLesson(lesson) || snapshot.turnAdmission !== "available") return null;

    const baseline = countDurableTutorMessages(lesson);
    const handle = {
      accepted: true,
      markDispatchAccepted() {
        if (currentAdmissionHandle !== handle) return;
        publish({ turnAdmission: "awaiting_join", inputSent: true });
      },
      markDispatchFailed(error) {
        if (currentAdmissionHandle !== handle) return;
        publish({
          livePhase: "failed",
          turnAdmission: "uncertain",
          inputSent: true,
          errorMessage: safeErrorMessage(error),
        });
      },
    };
    currentAdmissionHandle = handle;
    publish({
      durableObservedForTurn: false,
      durableTutorMessageBaseline: baseline,
      deferDurableTutorMessages: false,
      text: "",
      responseCompleted: false,
      errorMessage: null,
      liveWarning: null,
      lastSequence: 0,
      inputSent: false,
      livePhase: snapshot.livePhase === "connecting" ? "connecting" : "streaming",
      turnAdmission: "dispatching",
    });
    return handle;
  };

  const settleLiveTerminal = ({ phase, errorMessage = null }) => {
    if (snapshot.status === "saved") return;
    const next = {
      livePhase: phase,
      responseCompleted: phase === "completed",
      errorMessage,
    };
    if (snapshot.durableObservedForTurn) {
      publish(next);
      completeSavedJoin({
        warning: phase === "completed" ? null : safeLiveWarning(phase),
      });
      return;
    }
    publish({
      ...next,
      turnAdmission: snapshot.turnAdmission === "uncertain" ? "uncertain" : "awaiting_join",
    });
  };

  const handleEvent = (sessionGeneration, event) => {
    if (!active || active.generation !== sessionGeneration || event.sequence <= snapshot.lastSequence) {
      return;
    }
    publish({ lastSequence: event.sequence });

    if (snapshot.status === "saved") return;
    const publicEvent = event.event;
    if (publicEvent.type === "TURN_STARTED") {
      publish({ livePhase: "streaming" });
      return;
    }
    if (publicEvent.type === "TEXT_DELTA") {
      publish({
        livePhase: "streaming",
        text: `${snapshot.text}${publicEvent.delta}`,
      });
      return;
    }
    if (publicEvent.type === "TURN_COMPLETED") {
      settleLiveTerminal({ phase: "completed" });
      return;
    }
    if (publicEvent.type === "TURN_INTERRUPTED") {
      settleLiveTerminal({
        phase: "failed",
        errorMessage: "The tutor response was interrupted.",
      });
      return;
    }
    if (publicEvent.type === "ERROR") {
      settleLiveTerminal({ phase: "failed", errorMessage: publicEvent.message });
    }
  };

  const connectLesson = async ({ lesson, sendInitialProblem = false }) => {
    const targetAddress = lesson?.tutorTargetAddress;
    if (!targetAddress) {
      invalidateAdmission();
      releaseActive({ closeConnection: true });
      publish(createIdleSocraticTutorState(lesson?.lessonId ?? null));
      return;
    }

    const nextAddressKey = addressKey(targetAddress);
    if (active?.addressKey === nextAddressKey && active.lessonId === lesson.lessonId) return;

    invalidateAdmission();
    releaseActive({ closeConnection: true });
    const sessionGeneration = ++generation;
    const initialDurableTutorMessageCount = countDurableTutorMessages(lesson);

    let connection;
    try {
      connection = agentCommunication.connect(targetAddress);
    } catch (error) {
      publish({
        ...createIdleSocraticTutorState(lesson.lessonId),
        livePhase: "failed",
        errorMessage: safeErrorMessage(error),
      });
      throw error;
    }

    const current = {
      addressKey: nextAddressKey,
      connection,
      generation: sessionGeneration,
      lessonId: lesson.lessonId,
      releases: [],
    };
    active = current;
    snapshot = {
      ...createIdleSocraticTutorState(lesson.lessonId),
      livePhase: "connecting",
      turnAdmission: sendInitialProblem ? "available" : "closed",
      durableTutorMessageBaseline: initialDurableTutorMessageCount,
    };
    const initialAdmission = sendInitialProblem ? beginClaim(lesson) : null;
    if (!initialAdmission) publish(snapshot);

    current.releases.push(
      connection.onEvent((event) => handleEvent(sessionGeneration, event)),
      connection.onError((error) => {
        if (active?.generation !== sessionGeneration) return;
        settleLiveTerminal({ phase: "failed", errorMessage: safeErrorMessage(error) });
      }),
      connection.onClose(() => {
        if (active?.generation !== sessionGeneration) return;
        releaseActive({ closeConnection: false });
        invalidateAdmission();
        if (snapshot.status === "saved") {
          publish({ livePhase: "closed", turnAdmission: "closed" });
        } else if (snapshot.durableObservedForTurn) {
          publish({ livePhase: "closed" });
          completeSavedJoin({ warning: safeLiveWarning("closed") });
        } else {
          publish({
            livePhase: "closed",
            turnAdmission: "closed",
            errorMessage: snapshot.errorMessage || "The tutor connection closed before the response was saved.",
          });
        }
      }),
    );

    try {
      await connection.ready;
      if (active?.generation !== sessionGeneration) return;
      publish({
        livePhase: sendInitialProblem ? "streaming" : "ready",
        turnAdmission: sendInitialProblem ? snapshot.turnAdmission : "available",
      });
      if (!sendInitialProblem) return;

      await connection.sendInput({
        text: lesson.prompt,
        metadata: {
          lessonId: lesson.lessonId,
          requestKind: "lesson_start",
        },
      });
      initialAdmission.markDispatchAccepted();
    } catch (error) {
      if (active?.generation !== sessionGeneration) return;
      if (currentAdmissionHandle !== initialAdmission) return;
      if (sendInitialProblem) {
        initialAdmission.markDispatchFailed(error);
      } else {
        publish({
          livePhase: "failed",
          turnAdmission: "closed",
          errorMessage: safeErrorMessage(error),
        });
      }
      throw error;
    }
  };

  return {
    connectLesson,
    matchesLesson: isActiveLesson,
    tryBeginObservedTurn(lesson) {
      return beginClaim(lesson);
    },
    reconcileDurableLesson(lesson) {
      if (!lesson || lesson.lessonId !== snapshot.lessonId) return;
      const nextTutorMessageCount = countDurableTutorMessages(lesson);

      if (snapshot.turnAdmission === "available") {
        if (!snapshot.durableObservedForTurn) {
          publish({ durableTutorMessageBaseline: nextTutorMessageCount });
        }
        return;
      }
      if (snapshot.turnAdmission === "closed" || nextTutorMessageCount <= snapshot.durableTutorMessageBaseline) {
        return;
      }

      publish({
        durableObservedForTurn: true,
        deferDurableTutorMessages: !isTerminalLivePhase(snapshot.livePhase),
      });
      if (isTerminalLivePhase(snapshot.livePhase)) {
        completeSavedJoin({
          warning: snapshot.livePhase === "completed" ? null : safeLiveWarning(snapshot.livePhase),
        });
      }
    },
    close() {
      generation += 1;
      invalidateAdmission();
      const hadSession = Boolean(active) || snapshot.livePhase !== "idle";
      releaseActive({ closeConnection: true });
      if (hadSession) publish({ livePhase: "closed", turnAdmission: "closed" });
    },
    getSnapshot() {
      return { ...snapshot };
    },
  };
};
