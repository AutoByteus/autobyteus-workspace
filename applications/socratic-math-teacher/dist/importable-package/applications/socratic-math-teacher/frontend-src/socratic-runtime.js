import {
  renderApp,
  renderLessonDetail,
  renderNotifications,
  renderSocraticMathTeacherShell,
} from "./socratic-renderer.js";

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
    lessonPromptInput: rootElement.querySelector("#lesson-prompt-input"),
  };

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

  const render = () => {
    renderApp({
      state,
      elements,
      onSelectLesson: async (lessonId) => {
        state.selectedLessonId = lessonId;
        await refreshDetail();
      },
      onAskFollowUp: askFollowUp,
      onRequestHint: requestHint,
      onCloseLesson: closeLesson,
      onError: handleUiError,
    });
  };

  const refreshDetail = async () => {
    if (!state.selectedLessonId) {
      state.detail = null;
      renderLessonDetail({
        state,
        elements,
        onAskFollowUp: askFollowUp,
        onRequestHint: requestHint,
        onCloseLesson: closeLesson,
        onError: handleUiError,
      });
      return;
    }

    state.detail = await client.lesson(state.selectedLessonId);
    renderLessonDetail({
      state,
      elements,
      onAskFollowUp: askFollowUp,
      onRequestHint: requestHint,
      onCloseLesson: closeLesson,
      onError: handleUiError,
    });
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

  const startLesson = async () => {
    const prompt = elements.lessonPromptInput?.value?.trim() || "";
    if (!prompt) {
      setStatus("Enter a math problem before starting a lesson.", "error");
      return;
    }

    setStatus("Starting a new lesson…");
    const lesson = await client.startLesson({ prompt });
    state.selectedLessonId = lesson.lessonId;
    if (elements.lessonPromptInput) {
      elements.lessonPromptInput.value = "";
    }
    await refresh();
  };

  const askFollowUp = async () => {
    if (!state.selectedLessonId) {
      return;
    }
    const textarea = document.getElementById("follow-up-input");
    const text = textarea?.value?.trim() || "";
    if (!text) {
      setStatus("Enter a follow-up message before sending.", "error");
      return;
    }
    setStatus("Sending your follow-up…");
    await client.askFollowUp({ lessonId: state.selectedLessonId, text });
    if (textarea) {
      textarea.value = "";
    }
    await refresh();
  };

  const requestHint = async () => {
    if (!state.selectedLessonId) {
      return;
    }
    const text = browserWindow.prompt("Optional hint request detail", "") || "";
    setStatus("Requesting a hint…");
    await client.requestHint({
      lessonId: state.selectedLessonId,
      text: text.trim() || null,
    });
    await refresh();
  };

  const closeLesson = async () => {
    if (!state.selectedLessonId) {
      return;
    }
    setStatus("Closing lesson…");
    await client.closeLesson({ lessonId: state.selectedLessonId });
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

  connectNotifications();
  render();

  elements.refreshButton?.addEventListener("click", () => {
    refresh().catch(handleUiError);
  });
  elements.startLessonForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    startLesson().catch(handleUiError);
  });

  void refresh().catch(handleUiError);
};
