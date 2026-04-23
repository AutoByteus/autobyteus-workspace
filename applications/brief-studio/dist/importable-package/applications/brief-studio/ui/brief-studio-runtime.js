import {
  renderApp,
  renderBriefDetail,
} from "./brief-studio-renderer.js";

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

export const createBriefStudioApp = ({
  browserWindow,
  document,
  createBriefStudioGraphqlClient,
}) => {
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
    executions: [],
    statusText: "Preparing brief workspace…",
    statusTone: "idle",
    notificationHandle: null,
  };

  const elements = {
    statusBanner: document.getElementById("status-banner"),
    briefList: document.getElementById("brief-list"),
    briefDetail: document.getElementById("brief-detail"),
    refreshButton: document.getElementById("refresh-button"),
    createBriefForm: document.getElementById("create-brief-form"),
    briefTitleInput: document.getElementById("brief-title-input"),
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
      onLaunchDraftRun: launchDraftRun,
      onApprove: approveBrief,
      onReject: rejectBrief,
      onAddReviewNote: addReviewNote,
      onError: handleUiError,
    });
  };

  const refreshDetail = async () => {
    if (!state.client || !state.selectedBriefId) {
      state.detail = null;
      state.executions = [];
      renderBriefDetail({
        state,
        elements,
        onLaunchDraftRun: launchDraftRun,
        onApprove: approveBrief,
        onReject: rejectBrief,
        onAddReviewNote: addReviewNote,
        onError: handleUiError,
      });
      return;
    }

    const [brief, executions] = await Promise.all([
      state.client.brief(state.selectedBriefId),
      state.client.briefExecutions(state.selectedBriefId),
    ]);
    state.detail = brief || null;
    state.executions = Array.isArray(executions) ? executions : [];
    renderBriefDetail({
      state,
      elements,
      onLaunchDraftRun: launchDraftRun,
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

    logBriefStudio(
      `refresh start applicationId=${state.bootstrap?.application?.applicationId || "unknown"} launch=${state.bootstrap?.launch?.launchInstanceId || "unknown"}`,
    );
    setStatus("Loading briefs through the hosted GraphQL backend mount…");
    const briefs = await state.client.briefs();
    state.briefs = Array.isArray(briefs) ? briefs : [];

    if (!state.selectedBriefId || !state.briefs.some((brief) => brief.briefId === state.selectedBriefId)) {
      state.selectedBriefId = state.briefs[0]?.briefId || null;
    }

    await refreshDetail();
    render();
    setStatus(
      state.briefs.length === 0
        ? "Start by creating a brief. Then generate a draft when it is ready for review."
        : "Open a brief to review drafts, notes, and approval state.",
      "ready",
    );
  };

  const createBrief = async () => {
    if (!state.client) {
      return;
    }

    const title = elements.briefTitleInput?.value?.trim() || "";
    if (!title) {
      setStatus("Enter a brief title before creating a business record.", "error");
      return;
    }

    setStatus("Creating a brief record…");
    const brief = await state.client.createBrief({ title });
    if (typeof brief?.briefId === "string" && brief.briefId.trim()) {
      state.selectedBriefId = brief.briefId;
    }
    if (elements.briefTitleInput) {
      elements.briefTitleInput.value = "";
    }
    await refresh();
  };

  const launchDraftRun = async () => {
    if (!state.client || !state.selectedBriefId) {
      return;
    }

    setStatus("Generating a fresh draft for this brief…");
    await state.client.launchDraftRun({
      briefId: state.selectedBriefId,
    });
    await refresh();
  };

  const approveBrief = async () => {
    if (!state.client || !state.selectedBriefId) {
      return;
    }
    setStatus("Approving brief…");
    await state.client.approveBrief({ briefId: state.selectedBriefId });
    await refresh();
  };

  const rejectBrief = async () => {
    if (!state.client || !state.selectedBriefId) {
      return;
    }
    const reason = browserWindow.prompt("Optional rejection reason", "") || "";
    setStatus("Rejecting brief…");
    await state.client.rejectBrief({
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
    await state.client.addReviewNote({
      briefId: state.selectedBriefId,
      body,
    });
    if (textarea) {
      textarea.value = "";
    }
    await refresh();
  };

  const connectNotifications = () => {
    state.notificationHandle?.close?.();
    state.notificationHandle = state.client?.subscribeNotifications((notification) => {
      logBriefStudio(`notification received topic=${notification?.topic || "unknown"}`);
      refresh().catch(handleUiError);
    }) || null;
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
    state.client = createBriefStudioGraphqlClient(payload);
    connectNotifications();

    logBriefStudio(
      `bootstrap received applicationId=${payload.application.applicationId} launchInstanceId=${payload.launch.launchInstanceId} backendBaseUrl=${payload.transport.backendBaseUrl || "missing"}`,
    );

    refresh().catch(handleUiError);
  };

  const init = () => {
    browserWindow.addEventListener("message", handleBootstrap);
    elements.refreshButton?.addEventListener("click", () => {
      refresh().catch(handleUiError);
    });
    elements.createBriefForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      createBrief().catch(handleUiError);
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
