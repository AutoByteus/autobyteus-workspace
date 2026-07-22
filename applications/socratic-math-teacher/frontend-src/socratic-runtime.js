import {
  renderApp,
  renderLessonDetail,
  renderNotifications,
  renderSocraticMathTeacherShell,
} from "./socratic-renderer.js";
import {
  createIdleSocraticTutorState,
  createSocraticTutorSession,
} from "./socratic-tutor-session.js";

export const mountSocraticMathTeacher = ({
  applicationClient,
  bootstrap,
  browserWindow,
  createSocraticMathGraphqlClient,
  rootElement,
}) => {
  renderSocraticMathTeacherShell(rootElement);

  const client = createSocraticMathGraphqlClient(applicationClient);
  const state = {
    bootstrap,
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
    iframeLaunchId: rootElement.querySelector("#iframe-launch-id"),
    requestContext: rootElement.querySelector("#request-context"),
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

  const refreshDetail = async (operation) => {
    if (!isOperationCurrent(operation)) return;
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
      if (isOperationCurrent(operation)) throw error;
      return;
    }
    if (!isOperationCurrent(operation)) return;

    state.detail = detail;
    tutorSession.reconcileDurableLesson(state.detail);
    renderDetail();
    if (state.detail?.tutorTargetAddress && !tutorSession.matchesLesson(state.detail)) {
      try {
        await tutorSession.connectLesson({ lesson: state.detail });
      } catch (error) {
        if (isOperationCurrent(operation)) throw error;
      }
    } else if (!state.detail?.tutorTargetAddress) {
      tutorSession.close();
    }
  };

  const refresh = async (startingOperation = captureOperation()) => {
    let operation = startingOperation;
    if (!isOperationCurrent(operation)) return;
    if (!isPendingStartCurrent()) {
      setStatus("Loading lessons through the hosted GraphQL backend mount…");
    }
    let lessons;
    try {
      lessons = await client.lessons();
    } catch (error) {
      if (isOperationCurrent(operation)) handleUiError(error);
      return;
    }
    if (!isOperationCurrent(operation)) return;

    state.lessons = Array.isArray(lessons) ? lessons : [];
    if (!state.selectedLessonId || !state.lessons.some((lesson) => lesson.lessonId === state.selectedLessonId)) {
      if (!isPendingStartCurrent()) {
        operation = replaceSelection(state.lessons[0]?.lessonId || null);
      }
    }
    try {
      await refreshDetail(operation);
    } catch (error) {
      if (isOperationCurrent(operation)) handleUiError(error);
      return;
    }
    if (!isOperationCurrent(operation)) return;
    render();
    if (!isPendingStartCurrent()) {
      setStatus(
        state.lessons.length === 0
          ? "Socratic Math Teacher is ready. Start a lesson to begin guided help on one math problem."
          : "Socratic Math Teacher is ready. Open a lesson to continue the tutoring conversation.",
        "ready",
      );
    }
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
      render();
      await tutorSession.connectLesson({ lesson, sendInitialProblem: true });
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
    const textarea = elements.lessonDetail?.querySelector("#follow-up-input");
    const text = textarea?.value?.trim() || "";
    if (!text) {
      setStatus("Enter a follow-up message before sending.", "error");
      return;
    }
    setStatus("Sending your follow-up…");
    tutorSession.beginObservedTurn(state.detail);
    try {
      await client.askFollowUp({ lessonId: operation.lessonId, text });
    } catch (error) {
      if (!isOperationCurrent(operation)) return;
      tutorSession.markFailed(error);
      throw error;
    }
    if (!isOperationCurrent(operation)) return;
    if (textarea) textarea.value = "";
    await refresh(operation);
  };

  const requestHint = async () => {
    const operation = captureOperation();
    if (!isOperationCurrent(operation) || !operation.lessonId) return;
    const text = browserWindow.prompt("Optional hint request detail", "") || "";
    setStatus("Requesting a hint…");
    tutorSession.beginObservedTurn(state.detail);
    try {
      await client.requestHint({
        lessonId: operation.lessonId,
        text: text.trim() || null,
      });
    } catch (error) {
      if (!isOperationCurrent(operation)) return;
      tutorSession.markFailed(error);
      throw error;
    }
    if (!isOperationCurrent(operation)) return;
    await refresh(operation);
  };

  const closeLesson = async () => {
    const operation = captureOperation();
    if (!isOperationCurrent(operation) || !operation.lessonId) return;
    setStatus("Closing lesson…");
    try {
      await client.closeLesson({ lessonId: operation.lessonId });
    } catch (error) {
      if (isOperationCurrent(operation)) throw error;
      return;
    }
    if (!isOperationCurrent(operation)) return;
    tutorSession.close();
    await refresh(operation);
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
