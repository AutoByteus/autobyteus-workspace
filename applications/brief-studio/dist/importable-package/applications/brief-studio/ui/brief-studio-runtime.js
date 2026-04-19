import { renderApp, renderBriefDetail, renderNotifications } from "./brief-studio-renderer.js";

const CHANNEL = "autobyteus.application.host";
const CONTRACT_VERSION = "2";
const READY_EVENT = "autobyteus.application.ui.ready";
const BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap";
const QUERY_CONTRACT_VERSION = "autobyteusContractVersion";
const QUERY_APPLICATION_ID = "autobyteusApplicationId";
const QUERY_HOST_ORIGIN = "autobyteusHostOrigin";
const QUERY_LAUNCH_INSTANCE_ID = "autobyteusLaunchInstanceId";

const logBriefStudio = (message) => {
  console.info(`[BriefStudio] ${message}`);
};

const matchesHostOrigin = (expectedOrigin, actualOrigin) => {
  if (expectedOrigin === "file://") {
    return actualOrigin === "file://" || actualOrigin === "null";
  }
  return actualOrigin === expectedOrigin;
};

const requireBootstrapUrl = (value, label) => {
  if (!value) {
    throw new Error(`${label} is unavailable in the host bootstrap payload.`);
  }
  return value;
};

const invokeJson = async (url, body) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }
  return payload.result;
};

export const createBriefStudioApp = ({ browserWindow, document, createApplicationClient }) => {
  const searchParams = new URLSearchParams(browserWindow.location.search);
  const hintedContractVersion = searchParams.get(QUERY_CONTRACT_VERSION) || "";
  const launchedApplicationId = searchParams.get(QUERY_APPLICATION_ID) || "";
  const launchedLaunchInstanceId = searchParams.get(QUERY_LAUNCH_INSTANCE_ID) || "";
  const hostOrigin = searchParams.get(QUERY_HOST_ORIGIN) || "";

  const state = {
    bootstrap: null,
    client: null,
    briefs: [],
    selectedBriefId: null,
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
    backendQueriesUrl: document.getElementById("backend-queries-url"),
    backendCommandsUrl: document.getElementById("backend-commands-url"),
    backendNotificationsUrl: document.getElementById("backend-notifications-url"),
    statusBanner: document.getElementById("status-banner"),
    briefList: document.getElementById("brief-list"),
    briefDetail: document.getElementById("brief-detail"),
    notificationList: document.getElementById("notification-list"),
    refreshButton: document.getElementById("refresh-button"),
    createBriefForm: document.getElementById("create-brief-form"),
    briefTitleInput: document.getElementById("brief-title-input"),
    modelIdentifierInput: document.getElementById("model-identifier-input"),
  };

  const handleUiError = (error) => {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  };

  const setStatus = (text, tone = "idle") => {
    state.statusText = text;
    state.statusTone = tone;
    if (elements.statusBanner) {
      elements.statusBanner.textContent = text;
      elements.statusBanner.className = `status-banner${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
    }
  };

  const render = () => {
    renderApp({
      state,
      elements,
      onSelectBrief: async (briefId) => {
        state.selectedBriefId = briefId;
        await refreshDetail();
      },
      onApprove: approveBrief,
      onReject: rejectBrief,
      onAddReviewNote: addReviewNote,
      onError: handleUiError,
    });
  };

  const createTransport = (bootstrap) => ({
    invokeQuery: async ({ queryName, requestContext, input }) =>
      invokeJson(
        `${requireBootstrapUrl(bootstrap.transport.backendQueriesBaseUrl, "backendQueriesBaseUrl")}/${encodeURIComponent(queryName)}`,
        { requestContext, input },
      ),
    invokeCommand: async ({ commandName, requestContext, input }) =>
      invokeJson(
        `${requireBootstrapUrl(bootstrap.transport.backendCommandsBaseUrl, "backendCommandsBaseUrl")}/${encodeURIComponent(commandName)}`,
        { requestContext, input },
      ),
    executeGraphql: async ({ requestContext, request }) =>
      invokeJson(requireBootstrapUrl(bootstrap.transport.backendGraphqlUrl, "backendGraphqlUrl"), {
        requestContext,
        request,
      }),
    subscribeNotifications: ({ listener }) => {
      const url = bootstrap.transport.backendNotificationsUrl;
      if (!url) {
        return { close: () => undefined };
      }
      const socket = new WebSocket(url);
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data));
          if (message?.type === "notification" && message.notification) {
            listener(message.notification);
          }
        } catch {
          // ignore malformed notifications in the demo UI
        }
      });
      return {
        close: () => {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
          }
        },
      };
    },
  });

  const createClient = (bootstrap) =>
    createApplicationClient({
      applicationId: bootstrap.application.applicationId,
      requestContext: bootstrap.requestContext ?? {
        applicationId: bootstrap.application.applicationId,
        launchInstanceId: bootstrap.launch.launchInstanceId,
      },
      transport: createTransport(bootstrap),
    });

  const refreshDetail = async () => {
    if (!state.client || !state.selectedBriefId) {
      state.detail = null;
      renderBriefDetail({
        state,
        elements,
        onApprove: approveBrief,
        onReject: rejectBrief,
        onAddReviewNote: addReviewNote,
        onError: handleUiError,
      });
      return;
    }

    const result = await state.client.query("briefs.getDetail", { briefId: state.selectedBriefId });
    state.detail = result?.brief || null;
    renderBriefDetail({
      state,
      elements,
      onApprove: approveBrief,
      onReject: rejectBrief,
      onAddReviewNote: addReviewNote,
      onError: handleUiError,
    });
  };

  const refresh = async () => {
    if (!state.client) {
      return;
    }

    logBriefStudio(`refresh start applicationId=${state.bootstrap?.application?.applicationId || "unknown"} launch=${state.bootstrap?.launch?.launchInstanceId || "unknown"}`);
    setStatus("Loading projected briefs through the app backend gateway…");
    const result = await state.client.query("briefs.list", null);
    state.briefs = Array.isArray(result?.briefs) ? result.briefs : [];

    if (!state.selectedBriefId || !state.briefs.some((brief) => brief.briefId === state.selectedBriefId)) {
      state.selectedBriefId = state.briefs[0]?.briefId || null;
    }

    await refreshDetail();
    render();
    setStatus(
      state.briefs.length === 0
        ? "Brief Studio is ready. Create a brief to start app-owned orchestration."
        : "Brief Studio is ready. Review projected brief state and notifications.",
      "ready",
    );
  };

  const createBrief = async () => {
    if (!state.client) {
      return;
    }

    const title = elements.briefTitleInput?.value?.trim() || "";
    const llmModelIdentifier = elements.modelIdentifierInput?.value?.trim() || "";

    if (!title) {
      setStatus("Enter a brief title before creating a run.", "error");
      return;
    }
    if (!llmModelIdentifier) {
      setStatus("Enter an LLM model identifier before creating a run.", "error");
      return;
    }

    setStatus("Creating brief and starting app-owned runtime orchestration…");
    const result = await state.client.command("createBrief", { title, llmModelIdentifier });
    if (typeof result?.briefId === "string" && result.briefId.trim()) {
      state.selectedBriefId = result.briefId;
    }
    if (elements.briefTitleInput) {
      elements.briefTitleInput.value = "";
    }
    await refresh();
  };

  const approveBrief = async () => {
    if (!state.client || !state.selectedBriefId) {
      return;
    }
    setStatus("Approving brief…");
    await state.client.command("approveBrief", { briefId: state.selectedBriefId });
    await refresh();
  };

  const rejectBrief = async () => {
    if (!state.client || !state.selectedBriefId) {
      return;
    }
    const reason = browserWindow.prompt("Optional rejection reason", "") || "";
    setStatus("Rejecting brief…");
    await state.client.command("rejectBrief", {
      briefId: state.selectedBriefId,
      reason: reason.trim() || null,
    });
    await refresh();
  };

  const addReviewNote = async () => {
    if (!state.client || !state.selectedBriefId) {
      return;
    }
    const textarea = document.getElementById("note-input");
    const body = textarea?.value?.trim() || "";
    if (!body) {
      setStatus("Write a short note before submitting.", "error");
      return;
    }
    setStatus("Adding review note…");
    await state.client.command("addReviewNote", {
      briefId: state.selectedBriefId,
      body,
    });
    if (textarea) {
      textarea.value = "";
    }
    await refresh();
  };

  const handleNotification = async (notification) => {
    state.notifications = [notification, ...state.notifications].slice(0, 6);
    renderNotifications({ state, elements });
    if (["brief.created", "brief.ready_for_review", "brief.review_updated", "brief.note_added"].includes(notification.topic)) {
      try {
        await refresh();
      } catch {
        // keep the notification even if the follow-up refresh fails
      }
    }
  };

  const handleBootstrap = async (event) => {
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
    if (!message.payload || typeof message.payload !== "object") {
      return;
    }

    const payload = message.payload;
    if (payload?.application?.applicationId !== launchedApplicationId) {
      return;
    }
    if (payload?.launch?.launchInstanceId !== launchedLaunchInstanceId) {
      return;
    }
    if (payload?.host?.origin !== hostOrigin) {
      return;
    }

    logBriefStudio(
      `bootstrap received applicationId=${payload.application.applicationId} launchInstanceId=${payload.launch.launchInstanceId} backendQueriesBaseUrl=${payload.transport.backendQueriesBaseUrl || "missing"}`,
    );
    state.bootstrap = payload;
    state.client = createClient(payload);
    render();

    state.notificationHandle?.close();
    state.notificationHandle = state.client.subscribeNotifications((notification) => {
      void handleNotification(notification);
    });

    try {
      await refresh();
    } catch (error) {
      console.warn(
        `[BriefStudio] initial refresh failed applicationId=${payload.application.applicationId} message=${error instanceof Error ? error.message : String(error)}`,
      );
      setStatus(error instanceof Error ? error.message : String(error), "error");
    }
  };

  const sendReady = () => {
    if (hintedContractVersion !== CONTRACT_VERSION || !launchedApplicationId || !launchedLaunchInstanceId) {
      return;
    }

    browserWindow.parent.postMessage(
      {
        channel: CHANNEL,
        contractVersion: CONTRACT_VERSION,
        eventName: READY_EVENT,
        payload: {
          applicationId: launchedApplicationId,
          launchInstanceId: launchedLaunchInstanceId,
        },
      },
      "*",
    );
    logBriefStudio(`ready event posted applicationId=${launchedApplicationId} launchInstanceId=${launchedLaunchInstanceId}`);
  };

  const init = () => {
    browserWindow.addEventListener("message", (event) => {
      void handleBootstrap(event);
    });

    browserWindow.addEventListener("beforeunload", () => {
      state.notificationHandle?.close();
    });

    elements.refreshButton?.addEventListener("click", () => {
      void refresh().catch(handleUiError);
    });

    elements.createBriefForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void createBrief().catch(handleUiError);
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", sendReady, { once: true });
    } else {
      sendReady();
    }
  };

  return {
    init,
  };
};
