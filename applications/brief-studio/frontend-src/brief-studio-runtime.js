import {
  renderApp,
  renderBriefDetail,
  renderBriefStudioShell,
} from "./brief-studio-renderer.js";

const logBriefStudio = (message) => {
  console.info(`[BriefStudio] ${message}`);
};

export const mountBriefStudio = ({
  applicationClient,
  bootstrap,
  browserWindow,
  createBriefStudioGraphqlClient,
  rootElement,
}) => {
  renderBriefStudioShell(rootElement);

  const client = createBriefStudioGraphqlClient(applicationClient);
  const state = {
    briefs: [],
    detail: null,
    executions: [],
    notificationHandle: null,
    selectedBriefId: null,
    statusText: "",
    statusTone: "idle",
  };

  const elements = {
    workspaceStatus: rootElement.querySelector("#workspace-status"),
    briefList: rootElement.querySelector("#brief-list"),
    briefDetail: rootElement.querySelector("#brief-detail"),
    refreshButton: rootElement.querySelector("#refresh-button"),
    createBriefForm: rootElement.querySelector("#create-brief-form"),
    briefTitleInput: rootElement.querySelector("#brief-title-input"),
  };

  const setStatus = (text, tone = "idle") => {
    state.statusText = text;
    state.statusTone = tone;
    if (elements.workspaceStatus) {
      const normalizedText = typeof text === "string" ? text.trim() : "";
      if (!normalizedText) {
        elements.workspaceStatus.textContent = "";
        elements.workspaceStatus.className = "workspace-status is-hidden";
        return;
      }
      elements.workspaceStatus.textContent = text;
      elements.workspaceStatus.className = `workspace-status${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
    }
  };

  const clearStatus = () => {
    setStatus("", "idle");
  };

  const handleUiError = (error) => {
    setStatus(error instanceof Error ? error.message : String(error), "error");
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
    if (!state.selectedBriefId) {
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
      client.brief(state.selectedBriefId),
      client.briefExecutions(state.selectedBriefId),
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
    logBriefStudio(
      `refresh start applicationId=${bootstrap.application.applicationId || "unknown"} launch=${bootstrap.launch.launchInstanceId || "unknown"}`,
    );
    setStatus("Loading briefs through the hosted GraphQL backend mount…");
    const briefs = await client.briefs();
    state.briefs = Array.isArray(briefs) ? briefs : [];

    if (!state.selectedBriefId || !state.briefs.some((brief) => brief.briefId === state.selectedBriefId)) {
      state.selectedBriefId = state.briefs[0]?.briefId || null;
    }

    await refreshDetail();
    render();
    clearStatus();
  };

  const createBrief = async () => {
    const title = elements.briefTitleInput?.value?.trim() || "";
    if (!title) {
      setStatus("Enter a brief title before creating a business record.", "error");
      return;
    }

    setStatus("Creating a brief record…");
    const brief = await client.createBrief({ title });
    if (typeof brief?.briefId === "string" && brief.briefId.trim()) {
      state.selectedBriefId = brief.briefId;
    }
    if (elements.briefTitleInput) {
      elements.briefTitleInput.value = "";
    }
    await refresh();
  };

  const launchDraftRun = async () => {
    if (!state.selectedBriefId) {
      return;
    }

    setStatus("Generating a fresh draft for this brief…");
    await client.launchDraftRun({
      briefId: state.selectedBriefId,
    });
    await refresh();
  };

  const approveBrief = async () => {
    if (!state.selectedBriefId) {
      return;
    }
    setStatus("Approving brief…");
    await client.approveBrief({ briefId: state.selectedBriefId });
    await refresh();
  };

  const rejectBrief = async () => {
    if (!state.selectedBriefId) {
      return;
    }
    const reason = browserWindow.prompt("Optional rejection reason", "") || "";
    setStatus("Rejecting brief…");
    await client.rejectBrief({
      briefId: state.selectedBriefId,
      reason: reason.trim() || null,
    });
    await refresh();
  };

  const addReviewNote = async () => {
    if (!state.selectedBriefId) {
      return;
    }
    const textarea = document.getElementById("note-input");
    const body = textarea?.value?.trim() || "";
    if (!body) {
      setStatus("Write a short note before submitting.", "error");
      return;
    }
    setStatus("Adding review note…");
    await client.addReviewNote({
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
    state.notificationHandle = client.subscribeNotifications((notification) => {
      logBriefStudio(`notification received topic=${notification?.topic || "unknown"}`);
      refresh().catch(handleUiError);
    });
  };

  connectNotifications();
  render();

  elements.refreshButton?.addEventListener("click", () => {
    refresh().catch(handleUiError);
  });
  elements.createBriefForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createBrief().catch(handleUiError);
  });

  void refresh().catch(handleUiError);
};
