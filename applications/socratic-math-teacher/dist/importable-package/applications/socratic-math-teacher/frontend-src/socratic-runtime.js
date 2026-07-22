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

  const setStatus = (text, tone = "idle") => {
    state.statusText = text;
    state.statusTone = tone;
    if (elements.workspaceStatus) {
      elements.workspaceStatus.textContent = text;
      elements.workspaceStatus.className = `workspace-status${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
    }
  };

  const handleUiError = (error) => {
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
      state.tutorLive = tutorLive;
      renderDetail();
    },
  });

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

  const refreshDetail = async () => {
    if (!state.selectedLessonId) {
      state.detail = null;
      tutorSession.close();
      renderDetail();
      return;
    }

    state.detail = await client.lesson(state.selectedLessonId);
    tutorSession.reconcileDurableLesson(state.detail);
    renderDetail();
    if (state.detail?.tutorTargetAddress && !tutorSession.matchesLesson(state.detail)) {
      await tutorSession.connectLesson({ lesson: state.detail });
    } else if (!state.detail?.tutorTargetAddress) {
      tutorSession.close();
    }
  };

  const refresh = async () => {
    setStatus("Loading lessons through the hosted GraphQL backend mount…");
    const lessons = await client.lessons();
    state.lessons = Array.isArray(lessons) ? lessons : [];
    if (!state.selectedLessonId || !state.lessons.some((lesson) => lesson.lessonId === state.selectedLessonId)) {
      state.selectedLessonId = state.lessons[0]?.lessonId || null;
    }
    await refreshDetail();
    render();
    setStatus(
      state.lessons.length === 0
        ? "Socratic Math Teacher is ready. Start a lesson to begin guided help on one math problem."
        : "Socratic Math Teacher is ready. Open a lesson to continue the tutoring conversation.",
      "ready",
    );
  };

  const selectLesson = async (lessonId) => {
    tutorSession.close();
    state.selectedLessonId = lessonId;
    await refreshDetail();
  };

  const startLesson = async () => {
    const prompt = elements.lessonPromptInput?.value?.trim() || "";
    if (!prompt) {
      setStatus("Enter a math problem before starting a lesson.", "error");
      return;
    }

    if (elements.startLessonButton) elements.startLessonButton.disabled = true;
    if (elements.lessonPromptInput) elements.lessonPromptInput.disabled = true;
    setStatus("Starting a new lesson…");
    try {
      const lesson = await client.startLesson({ prompt });
      tutorSession.close();
      state.selectedLessonId = lesson.lessonId;
      state.detail = lesson;
      state.lessons = [lesson, ...state.lessons.filter((item) => item.lessonId !== lesson.lessonId)];
      render();
      await tutorSession.connectLesson({ lesson, sendInitialProblem: true });
      if (elements.lessonPromptInput) elements.lessonPromptInput.value = "";
      await refresh();
    } finally {
      if (elements.startLessonButton) elements.startLessonButton.disabled = false;
      if (elements.lessonPromptInput) elements.lessonPromptInput.disabled = false;
    }
  };

  const askFollowUp = async () => {
    if (!state.selectedLessonId) return;
    const textarea = elements.lessonDetail?.querySelector("#follow-up-input");
    const text = textarea?.value?.trim() || "";
    if (!text) {
      setStatus("Enter a follow-up message before sending.", "error");
      return;
    }
    setStatus("Sending your follow-up…");
    tutorSession.beginObservedTurn(state.detail);
    try {
      await client.askFollowUp({ lessonId: state.selectedLessonId, text });
    } catch (error) {
      tutorSession.markFailed(error);
      throw error;
    }
    await refresh();
  };

  const requestHint = async () => {
    if (!state.selectedLessonId) return;
    const text = browserWindow.prompt("Optional hint request detail", "") || "";
    setStatus("Requesting a hint…");
    tutorSession.beginObservedTurn(state.detail);
    try {
      await client.requestHint({
        lessonId: state.selectedLessonId,
        text: text.trim() || null,
      });
    } catch (error) {
      tutorSession.markFailed(error);
      throw error;
    }
    await refresh();
  };

  const closeLesson = async () => {
    if (!state.selectedLessonId) return;
    setStatus("Closing lesson…");
    await client.closeLesson({ lessonId: state.selectedLessonId });
    tutorSession.close();
    await refresh();
  };

  const pushNotification = (notification) => {
    state.notifications = [notification, ...state.notifications].slice(0, 12);
    renderNotifications({ state, elements });
  };

  const connectNotifications = () => {
    state.notificationHandle?.close?.();
    state.notificationHandle = client.subscribeNotifications((notification) => {
      pushNotification(notification);
      refresh().catch(handleUiError);
    });
  };

  const onRefresh = () => refresh().catch(handleUiError);
  const onStartLesson = (event) => {
    event.preventDefault();
    startLesson().catch(handleUiError);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
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

  void refresh().catch(handleUiError);
  return dispose;
};
