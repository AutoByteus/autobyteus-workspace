import {
  renderApp,
  renderLessonDetail,
  renderNotifications,
  renderSocraticMathTeacherShell,
} from "./socratic-renderer.js";
import {
  SOCRATIC_TURN_BUSY_NOTICE,
  createIdleSocraticTutorState,
  createSocraticTutorSession,
} from "./socratic-tutor-session.js";

export const mountSocraticMathTeacher = ({
  applicationClient,
  runtimeBootstrap,
  browserWindow,
  createSocraticMathGraphqlClient,
  rootElement,
}) => {
  renderSocraticMathTeacherShell(rootElement);

  const client = createSocraticMathGraphqlClient(applicationClient);
  const state = {
    runtimeBootstrap,
    closingLessonId: null,
    detail: null,
    lessons: [],
    notificationHandle: null,
    notifications: [],
    selectedLessonId: null,
    statusText: "Socratic Math Teacher is ready to load lesson data.",
    statusTone: "idle",
    tutorLive: createIdleSocraticTutorState(),
  };

  const elements = {
    applicationName: rootElement.querySelector("#application-name"),
    applicationIds: rootElement.querySelector("#application-ids"),
    contractVersion: rootElement.querySelector("#runtime-contract-version"),
    canonicalApplicationId: rootElement.querySelector("#canonical-application-id"),
    backendBaseUrl: rootElement.querySelector("#backend-base-url"),
    backendNotificationsUrl: rootElement.querySelector("#backend-notifications-url"),
    workspaceStatus: rootElement.querySelector("#workspace-status"),
    lessonList: rootElement.querySelector("#lesson-list"),
    lessonDetail: rootElement.querySelector("#lesson-detail"),
    notificationList: rootElement.querySelector("#notification-list"),
    refreshButton: rootElement.querySelector("#refresh-button"),
    startLessonForm: rootElement.querySelector("#start-lesson-form"),
    startLessonButton: rootElement.querySelector("#start-lesson-button"),
    lessonPromptInput: rootElement.querySelector("#lesson-prompt-input"),
  };

  let disposed = false;
  let lifecycleGeneration = 0;
  let pendingStartOperation = null;
  let activeCloseClaim = null;

  const captureOperation = (lessonId = state.selectedLessonId) => ({
    generation: lifecycleGeneration,
    lessonId,
  });

  const isOperationCurrent = (operation) => Boolean(
    !disposed
    && operation.generation === lifecycleGeneration
    && operation.lessonId === state.selectedLessonId
  );

  const isPendingStartCurrent = () => Boolean(
    pendingStartOperation
    && isOperationCurrent(pendingStartOperation)
  );

  const isLessonClosing = (lessonId = state.selectedLessonId) => Boolean(
    lessonId
    && state.closingLessonId === lessonId
  );

  const advanceOperation = () => {
    lifecycleGeneration += 1;
    return captureOperation();
  };

  const setStartLessonBusy = (busy) => {
    if (elements.startLessonButton) elements.startLessonButton.disabled = busy;
    if (elements.lessonPromptInput) elements.lessonPromptInput.disabled = busy;
  };

  const setStatus = (text, tone = "idle") => {
    if (disposed) return;
    state.statusText = text;
    state.statusTone = tone;
    if (elements.workspaceStatus) {
      elements.workspaceStatus.textContent = text;
      elements.workspaceStatus.className = `workspace-status${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
    }
  };

  const setReadyStatus = () => {
    setStatus(
      state.lessons.length === 0
        ? "Socratic Math Teacher is ready. Start a lesson to begin guided help on one math problem."
        : "Socratic Math Teacher is ready. Open a lesson to continue the tutoring conversation.",
      "ready",
    );
  };

  const handleUiError = (error) => {
    if (disposed) return;
    setStatus(error instanceof Error ? error.message : String(error), "error");
  };

  const renderDetail = () => renderLessonDetail({
    state,
    elements,
    onAskFollowUp: askFollowUp,
    onRequestHint: requestHint,
    onCloseLesson: closeLesson,
    onError: handleUiError,
  });

  const tutorSession = createSocraticTutorSession({
    agentCommunication: applicationClient.agentCommunication,
    onStateChange: (tutorLive) => {
      if (disposed) return;
      state.tutorLive = tutorLive;
      renderDetail();
    },
  });

  const replaceSelection = (lessonId, { cancelPendingStart = true } = {}) => {
    lifecycleGeneration += 1;
    tutorSession.close();
    activeCloseClaim = null;
    state.closingLessonId = null;
    state.selectedLessonId = lessonId;
    if (cancelPendingStart) {
      pendingStartOperation = null;
      setStartLessonBusy(false);
    }
    return captureOperation(lessonId);
  };

  const render = () => {
    renderApp({
      state,
      elements,
      onSelectLesson: selectLesson,
      onAskFollowUp: askFollowUp,
      onRequestHint: requestHint,
      onCloseLesson: closeLesson,
      onError: handleUiError,
    });
  };

  const refreshDetail = async (operation, { allowConnection = true, closeClaim = null } = {}) => {
    const isCommitCurrent = () => Boolean(
      isOperationCurrent(operation)
      && (!closeClaim || activeCloseClaim === closeClaim)
    );
    if (!isCommitCurrent()) return;
    if (!operation.lessonId) {
      state.detail = null;
      tutorSession.close();
      renderDetail();
      return;
    }

    let detail;
    try {
      detail = await client.lesson(operation.lessonId);
    } catch (error) {
      if (isCommitCurrent()) throw error;
      return;
    }
    if (!isCommitCurrent()) return;

    state.detail = detail;
    tutorSession.reconcileDurableLesson(state.detail);
    if (!allowConnection || isLessonClosing(operation.lessonId)) {
      renderDetail();
      return;
    }
    if (state.detail?.tutorTargetAddress && !tutorSession.matchesLesson(state.detail)) {
      const connectionAttempt = tutorSession.connectLesson({ lesson: state.detail });
      renderDetail();
      try {
        await connectionAttempt;
      } catch (error) {
        if (isCommitCurrent()) throw error;
      }
    } else if (!state.detail?.tutorTargetAddress) {
      tutorSession.close();
      renderDetail();
    } else {
      renderDetail();
    }
  };

  const refresh = async (startingOperation = captureOperation()) => {
    let operation = startingOperation;
    if (!isOperationCurrent(operation)) return false;
    const closeOwnsLifecycle = isLessonClosing(operation.lessonId);
    const closeClaim = closeOwnsLifecycle ? activeCloseClaim : null;
    const isCommitCurrent = () => Boolean(
      isOperationCurrent(operation)
      && (!closeClaim || activeCloseClaim === closeClaim)
    );
    if (!isPendingStartCurrent() && !closeOwnsLifecycle) {
      setStatus("Loading lessons through the application GraphQL backend…");
    }
    let lessons;
    try {
      lessons = await client.lessons();
    } catch (error) {
      if (isCommitCurrent()) handleUiError(error);
      return false;
    }
    if (!isCommitCurrent()) return false;

    state.lessons = Array.isArray(lessons) ? lessons : [];
    if (!state.selectedLessonId || !state.lessons.some((lesson) => lesson.lessonId === state.selectedLessonId)) {
      if (!isPendingStartCurrent() && !closeOwnsLifecycle) {
        operation = replaceSelection(state.lessons[0]?.lessonId || null);
      }
    }
    try {
      await refreshDetail(operation, {
        allowConnection: !closeOwnsLifecycle,
        closeClaim,
      });
    } catch (error) {
      if (isCommitCurrent()) handleUiError(error);
      return false;
    }
    if (!isCommitCurrent()) return false;
    render();
    if (!isPendingStartCurrent() && !closeOwnsLifecycle) {
      setReadyStatus();
    }
    return true;
  };

  const selectLesson = async (lessonId) => {
    if (disposed) return;
    const operation = replaceSelection(lessonId);
    state.detail = null;
    render();
    try {
      await refreshDetail(operation);
    } catch (error) {
      if (isOperationCurrent(operation)) throw error;
    }
  };

  const startLesson = async () => {
    const prompt = elements.lessonPromptInput?.value?.trim() || "";
    if (!prompt) {
      setStatus("Enter a math problem before starting a lesson.", "error");
      return;
    }

    let operation = advanceOperation();
    pendingStartOperation = operation;
    setStartLessonBusy(true);
    setStatus("Starting a new lesson…");
    try {
      const lesson = await client.startLesson({ prompt });
      if (!isOperationCurrent(operation)) return;

      operation = replaceSelection(lesson.lessonId, { cancelPendingStart: false });
      pendingStartOperation = operation;
      state.detail = lesson;
      state.lessons = [lesson, ...state.lessons.filter((item) => item.lessonId !== lesson.lessonId)];
      const connectionAttempt = tutorSession.connectLesson({ lesson, sendInitialProblem: true });
      render();
      await connectionAttempt;
      if (!isOperationCurrent(operation)) return;
      if (pendingStartOperation === operation) pendingStartOperation = null;
      if (elements.lessonPromptInput) elements.lessonPromptInput.value = "";
      await refresh(operation);
    } catch (error) {
      if (isOperationCurrent(operation)) throw error;
    } finally {
      if (pendingStartOperation === operation) pendingStartOperation = null;
      if (isOperationCurrent(operation)) setStartLessonBusy(false);
    }
  };

  const askFollowUp = async () => {
    const operation = captureOperation();
    if (!isOperationCurrent(operation) || !operation.lessonId) return;
    if (isLessonClosing(operation.lessonId)) return;
    const textarea = elements.lessonDetail?.querySelector("#follow-up-input");
    const text = textarea?.value?.trim() || "";
    if (!text) {
      setStatus("Enter a follow-up message before sending.", "error");
      return;
    }
    const admission = tutorSession.tryBeginObservedTurn(state.detail);
    if (!admission) {
      setStatus(SOCRATIC_TURN_BUSY_NOTICE, "error");
      return;
    }
    setStatus("Sending your follow-up…");
    try {
      await client.askFollowUp({ lessonId: operation.lessonId, text });
    } catch (error) {
      admission.markDispatchFailed(error);
      if (!isOperationCurrent(operation)) return;
      throw error;
    }
    admission.markDispatchAccepted();
    if (!isOperationCurrent(operation)) return;
    if (textarea) textarea.value = "";
    await refresh(operation);
  };

  const requestHint = async () => {
    const operation = captureOperation();
    if (!isOperationCurrent(operation) || !operation.lessonId) return;
    if (isLessonClosing(operation.lessonId)) return;
    const admission = tutorSession.tryBeginObservedTurn(state.detail);
    if (!admission) {
      setStatus(SOCRATIC_TURN_BUSY_NOTICE, "error");
      return;
    }
    const text = browserWindow.prompt("Optional hint request detail", "") || "";
    setStatus("Requesting a hint…");
    try {
      await client.requestHint({
        lessonId: operation.lessonId,
        text: text.trim() || null,
      });
    } catch (error) {
      admission.markDispatchFailed(error);
      if (!isOperationCurrent(operation)) return;
      throw error;
    }
    admission.markDispatchAccepted();
    if (!isOperationCurrent(operation)) return;
    await refresh(operation);
  };

  const closeLesson = async () => {
    const currentOperation = captureOperation();
    if (!isOperationCurrent(currentOperation) || !currentOperation.lessonId) return;
    if (isLessonClosing(currentOperation.lessonId)) return;
    if (state.detail?.lessonId !== currentOperation.lessonId || state.detail.status !== "active") return;
    const operation = advanceOperation();
    const closeClaim = {};
    activeCloseClaim = closeClaim;
    state.closingLessonId = operation.lessonId;
    tutorSession.close();
    renderDetail();
    setStatus("Closing lesson…");
    try {
      await client.closeLesson({ lessonId: operation.lessonId });
    } catch (error) {
      if (isOperationCurrent(operation) && activeCloseClaim === closeClaim) {
        activeCloseClaim = null;
        state.closingLessonId = null;
        renderDetail();
      }
      if (isOperationCurrent(operation)) throw error;
      return;
    }
    if (!isOperationCurrent(operation) || activeCloseClaim !== closeClaim) return;
    const refreshed = await refresh(operation);
    if (!isOperationCurrent(operation) || activeCloseClaim !== closeClaim) return;
    activeCloseClaim = null;
    state.closingLessonId = null;
    renderDetail();
    if (refreshed) setReadyStatus();
  };

  const pushNotification = (notification) => {
    if (disposed) return;
    state.notifications = [notification, ...state.notifications].slice(0, 12);
    renderNotifications({ state, elements });
  };

  const connectNotifications = () => {
    state.notificationHandle?.close?.();
    state.notificationHandle = client.subscribeNotifications((notification) => {
      if (disposed) return;
      pushNotification(notification);
      const operation = captureOperation();
      refresh(operation).catch((error) => {
        if (isOperationCurrent(operation)) handleUiError(error);
      });
    });
  };

  const onRefresh = () => {
    const operation = captureOperation();
    refresh(operation).catch((error) => {
      if (isOperationCurrent(operation)) handleUiError(error);
    });
  };
  const onStartLesson = (event) => {
    event.preventDefault();
    startLesson().catch(handleUiError);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifecycleGeneration += 1;
    pendingStartOperation = null;
    activeCloseClaim = null;
    tutorSession.close();
    state.notificationHandle?.close?.();
    elements.refreshButton?.removeEventListener("click", onRefresh);
    elements.startLessonForm?.removeEventListener("submit", onStartLesson);
    browserWindow.removeEventListener("beforeunload", dispose);
  };

  connectNotifications();
  render();
  elements.refreshButton?.addEventListener("click", onRefresh);
  elements.startLessonForm?.addEventListener("submit", onStartLesson);
  browserWindow.addEventListener("beforeunload", dispose, { once: true });

  const initialOperation = captureOperation();
  void refresh(initialOperation).catch((error) => {
    if (isOperationCurrent(initialOperation)) handleUiError(error);
  });
  return dispose;
};
