const LIVE_TOOL_EVENT_STATES = {
  TOOL_APPROVAL_REQUESTED: "Preparing to save the tutor response…",
  TOOL_APPROVED: "Preparing to save the tutor response…",
  TOOL_DENIED: "The tutor response could not be saved.",
  TOOL_EXECUTION_STARTED: "Saving the tutor response…",
  TOOL_EXECUTION_SUCCEEDED: "The tutor response was published.",
  TOOL_EXECUTION_FAILED: "The tutor response could not be saved.",
  TOOL_EXECUTION_INTERRUPTED: "Saving the tutor response was interrupted.",
};

export const createIdleSocraticTutorState = (lessonId = null) => ({
  lessonId,
  status: "idle",
  text: "",
  toolStatus: "",
  responseCompleted: false,
  errorMessage: null,
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

export const createSocraticTutorSession = ({ agentCommunication, onStateChange }) => {
  let snapshot = createIdleSocraticTutorState();
  let active = null;
  let generation = 0;
  let durableTutorMessageCount = 0;

  const publish = (next) => {
    snapshot = { ...snapshot, ...next };
    onStateChange?.({ ...snapshot });
  };

  const releaseActive = ({ closeConnection }) => {
    const current = active;
    active = null;
    if (!current) return;
    for (const release of current.releases.splice(0)) release();
    if (closeConnection) current.connection.close();
  };

  const failCurrent = (error) => {
    publish({
      status: "failed",
      errorMessage: safeErrorMessage(error),
    });
  };

  const handleEvent = (sessionGeneration, event) => {
    if (!active || active.generation !== sessionGeneration || event.sequence <= snapshot.lastSequence) {
      return;
    }
    publish({ lastSequence: event.sequence });

    const publicEvent = event.event;
    if (publicEvent.source !== "AGENT") return;

    if (
      publicEvent.type === "SEGMENT_CONTENT"
      && publicEvent.data.kind === "TEXT"
      && publicEvent.data.delta.length > 0
    ) {
      publish({
        status: snapshot.status === "saved" ? "saved" : "streaming",
        text: `${snapshot.text}${publicEvent.data.delta}`,
      });
      return;
    }

    if (publicEvent.type === "AGENT_RESPONSE_COMPLETED") {
      publish({
        status: snapshot.status === "saved" ? "saved" : "streaming",
        responseCompleted: true,
      });
      return;
    }

    const toolState = LIVE_TOOL_EVENT_STATES[publicEvent.type];
    if (toolState && publicEvent.data.toolName === "publish_artifacts") {
      publish({
        status: snapshot.status === "saved" ? "saved" : "streaming",
        toolStatus: toolState,
      });
    }
  };

  const connectLesson = async ({ lesson, sendInitialProblem = false }) => {
    const targetAddress = lesson?.tutorTargetAddress;
    if (!targetAddress) {
      releaseActive({ closeConnection: true });
      durableTutorMessageCount = countDurableTutorMessages(lesson);
      publish(createIdleSocraticTutorState(lesson?.lessonId ?? null));
      return;
    }

    const nextAddressKey = addressKey(targetAddress);
    if (active?.addressKey === nextAddressKey && active.lessonId === lesson.lessonId) {
      return;
    }

    releaseActive({ closeConnection: true });
    const sessionGeneration = ++generation;
    durableTutorMessageCount = countDurableTutorMessages(lesson);
    publish({
      ...createIdleSocraticTutorState(lesson.lessonId),
      status: "connecting",
    });

    let connection;
    try {
      connection = agentCommunication.connect(targetAddress);
    } catch (error) {
      failCurrent(error);
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
    current.releases.push(
      connection.onEvent((event) => handleEvent(sessionGeneration, event)),
      connection.onError((error) => {
        if (active?.generation === sessionGeneration) failCurrent(error);
      }),
      connection.onClose(() => {
        if (active?.generation !== sessionGeneration) return;
        releaseActive({ closeConnection: false });
        if (snapshot.status !== "failed") publish({ status: "closed" });
      }),
    );

    try {
      await connection.ready;
      if (active?.generation !== sessionGeneration) return;
      publish({ status: "ready" });
      if (!sendInitialProblem) return;

      publish({ status: "streaming", inputSent: true });
      await connection.sendInput({
        text: lesson.prompt,
        metadata: {
          lessonId: lesson.lessonId,
          requestKind: "lesson_start",
        },
      });
    } catch (error) {
      if (active?.generation !== sessionGeneration) return;
      failCurrent(error);
      throw error;
    }
  };

  return {
    connectLesson,
    matchesLesson(lesson) {
      return Boolean(
        active
        && active.lessonId === lesson?.lessonId
        && active.addressKey === addressKey(lesson?.tutorTargetAddress),
      );
    },
    beginObservedTurn(lesson) {
      if (!active || active.lessonId !== lesson?.lessonId) return;
      durableTutorMessageCount = countDurableTutorMessages(lesson);
      publish({
        status: "streaming",
        text: "",
        toolStatus: "",
        responseCompleted: false,
        errorMessage: null,
        lastSequence: 0,
        inputSent: snapshot.inputSent,
      });
    },
    reconcileDurableLesson(lesson) {
      if (!lesson || lesson.lessonId !== snapshot.lessonId) return;
      const nextTutorMessageCount = countDurableTutorMessages(lesson);
      if (nextTutorMessageCount > durableTutorMessageCount) {
        durableTutorMessageCount = nextTutorMessageCount;
        publish({
          status: "saved",
          text: "",
          toolStatus: "Tutor response saved to the transcript.",
          errorMessage: null,
        });
      }
    },
    markFailed(error) {
      if (active) failCurrent(error);
    },
    close() {
      generation += 1;
      const hadActive = Boolean(active);
      releaseActive({ closeConnection: true });
      if (hadActive || snapshot.status !== "idle") publish({ status: "closed" });
    },
    getSnapshot() {
      return { ...snapshot };
    },
  };
};
