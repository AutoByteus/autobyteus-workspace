import {
  renderApp,
  renderLessonDetail,
  renderNotifications,
} from "./socratic-renderer.js";

const CHANNEL = "autobyteus.application.host";
const CONTRACT_VERSION = "2";
const READY_EVENT = "autobyteus.application.ui.ready";
const BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap";
const QUERY_CONTRACT_VERSION = "autobyteusContractVersion";
const QUERY_APPLICATION_ID = "autobyteusApplicationId";
const QUERY_HOST_ORIGIN = "autobyteusHostOrigin";
const QUERY_LAUNCH_INSTANCE_ID = "autobyteusLaunchInstanceId";

const matchesHostOrigin = (expectedOrigin, actualOrigin) => {
  if (expectedOrigin === "file://") {
    return actualOrigin === "file://" || actualOrigin === "null";
  }
  return actualOrigin === expectedOrigin;
};

export const createSocraticMathTeacherApp = ({
  browserWindow,
  document,
  createSocraticMathGraphqlClient,
}) => {
  const searchParams = new URLSearchParams(browserWindow.location.search);
  const hintedContractVersion = searchParams.get(QUERY_CONTRACT_VERSION) || "";
  const launchedApplicationId = searchParams.get(QUERY_APPLICATION_ID) || "";
  const launchedLaunchInstanceId = searchParams.get(QUERY_LAUNCH_INSTANCE_ID) || "";
  const hostOrigin = searchParams.get(QUERY_HOST_ORIGIN) || "";

  const state = {
    bootstrap: null,
    client: null,
    lessons: [],
    selectedLessonId: null,
    detail: null,
    notifications: [],
    statusText: "Waiting for the host bootstrap payload…",
    statusTone: "idle",
    notificationHandle: null,
  };

  const elements = {
    applicationName: document.getElementById("application-name"),
    applicationIds: document.getElementById("application-ids"),
    launchInstanceId: document.getElementById("launch-instance-id"),
    requestContext: document.getElementById("request-context"),
    backendBaseUrl: document.getElementById("backend-base-url"),
    backendNotificationsUrl: document.getElementById("backend-notifications-url"),
    statusBanner: document.getElementById("status-banner"),
    lessonList: document.getElementById("lesson-list"),
    lessonDetail: document.getElementById("lesson-detail"),
    notificationList: document.getElementById("notification-list"),
    refreshButton: document.getElementById("refresh-button"),
    startLessonForm: document.getElementById("start-lesson-form"),
    lessonPromptInput: document.getElementById("lesson-prompt-input"),
    modelIdentifierInput: document.getElementById("model-identifier-input"),
  };

  const setStatus = (text, tone = "idle") => {
    state.statusText = text;
    state.statusTone = tone;
    if (elements.statusBanner) {
      elements.statusBanner.textContent = text;
      elements.statusBanner.className = `status-banner${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
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
    if (!state.client || !state.selectedLessonId) {
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

    state.detail = await state.client.lesson(state.selectedLessonId);
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
    if (!state.client) {
      return;
    }
    setStatus("Loading lessons through the hosted GraphQL backend mount…");
    const lessons = await state.client.lessons();
    state.lessons = Array.isArray(lessons) ? lessons : [];
    if (!state.selectedLessonId || !state.lessons.some((lesson) => lesson.lessonId === state.selectedLessonId)) {
      state.selectedLessonId = state.lessons[0]?.lessonId || null;
    }
    await refreshDetail();
    render();
    setStatus(
      state.lessons.length === 0
        ? "Socratic Math Teacher is ready. Start one lesson to create a long-lived conversational binding."
        : "Socratic Math Teacher is ready. Follow-up inputs reuse the same lesson binding through runtimeControl.postRunInput(...).",
      "ready",
    );
  };

  const startLesson = async () => {
    if (!state.client) {
      return;
    }
    const prompt = elements.lessonPromptInput?.value?.trim() || "";
    const llmModelIdentifier = elements.modelIdentifierInput?.value?.trim() || "";
    if (!prompt) {
      setStatus("Enter a math problem before starting a lesson.", "error");
      return;
    }
    if (!llmModelIdentifier) {
      setStatus("Enter an LLM model identifier before starting a lesson.", "error");
      return;
    }

    setStatus("Starting lesson and binding one long-lived tutor run…");
    const lesson = await state.client.startLesson({ prompt, llmModelIdentifier });
    state.selectedLessonId = lesson.lessonId;
    if (elements.lessonPromptInput) {
      elements.lessonPromptInput.value = "";
    }
    await refresh();
  };

  const askFollowUp = async () => {
    if (!state.client || !state.selectedLessonId) {
      return;
    }
    const textarea = document.getElementById("follow-up-input");
    const text = textarea?.value?.trim() || "";
    if (!text) {
      setStatus("Enter a follow-up message before sending.", "error");
      return;
    }
    setStatus("Posting follow-up input into the existing lesson binding…");
    await state.client.askFollowUp({ lessonId: state.selectedLessonId, text });
    if (textarea) {
      textarea.value = "";
    }
    await refresh();
  };

  const requestHint = async () => {
    if (!state.client || !state.selectedLessonId) {
      return;
    }
    const text = browserWindow.prompt("Optional hint request detail", "") || "";
    setStatus("Requesting a hint through the existing lesson binding…");
    await state.client.requestHint({
      lessonId: state.selectedLessonId,
      text: text.trim() || null,
    });
    await refresh();
  };

  const closeLesson = async () => {
    if (!state.client || !state.selectedLessonId) {
      return;
    }
    setStatus("Closing lesson…");
    await state.client.closeLesson({ lessonId: state.selectedLessonId });
    await refresh();
  };

  const pushNotification = (notification) => {
    state.notifications = [notification, ...state.notifications].slice(0, 12);
    renderNotifications({ state, elements });
  };

  const connectNotifications = () => {
    state.notificationHandle?.close?.();
    state.notificationHandle = state.client?.subscribeNotifications((notification) => {
      pushNotification(notification);
      refresh().catch(handleUiError);
    }) || null;
  };

  const sendReady = () => {
    if (hintedContractVersion !== CONTRACT_VERSION || !launchedApplicationId || !launchedLaunchInstanceId) {
      return;
    }

    browserWindow.parent.postMessage({
      channel: CHANNEL,
      contractVersion: CONTRACT_VERSION,
      eventName: READY_EVENT,
      payload: {
        applicationId: launchedApplicationId,
        launchInstanceId: launchedLaunchInstanceId,
      },
    }, "*");
  };

  const handleBootstrap = (event) => {
    if (event.source !== browserWindow.parent) {
      return;
    }
    if (!matchesHostOrigin(hostOrigin, event.origin)) {
      return;
    }
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }
    if (message.channel !== CHANNEL || message.contractVersion !== CONTRACT_VERSION || message.eventName !== BOOTSTRAP_EVENT) {
      return;
    }

    const payload = message.payload;
    if (!payload || typeof payload !== "object") {
      return;
    }
    if (payload.application?.applicationId !== launchedApplicationId) {
      return;
    }
    if (payload.launch?.launchInstanceId !== launchedLaunchInstanceId) {
      return;
    }
    if (payload.host?.origin !== hostOrigin) {
      return;
    }

    state.bootstrap = payload;
    state.client = createSocraticMathGraphqlClient(payload);
    connectNotifications();
    refresh().catch(handleUiError);
  };

  const init = () => {
    browserWindow.addEventListener("message", handleBootstrap);
    elements.refreshButton?.addEventListener("click", () => {
      refresh().catch(handleUiError);
    });
    elements.startLessonForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      startLesson().catch(handleUiError);
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", sendReady, { once: true });
    } else {
      sendReady();
    }
  };

  return { init };
};
