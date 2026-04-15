import { createApplicationClient } from "./vendor/application-frontend-sdk.js";

const CHANNEL = "autobyteus.application.host";
const CONTRACT_VERSION = "1";
const READY_EVENT = "autobyteus.application.ui.ready";
const BOOTSTRAP_EVENT = "autobyteus.application.host.bootstrap";
const QUERY_CONTRACT_VERSION = "autobyteusContractVersion";
const QUERY_APPLICATION_SESSION_ID = "autobyteusApplicationSessionId";
const QUERY_HOST_ORIGIN = "autobyteusHostOrigin";
const QUERY_LAUNCH_INSTANCE_ID = "autobyteusLaunchInstanceId";

const searchParams = new URLSearchParams(window.location.search);
const hintedContractVersion = searchParams.get(QUERY_CONTRACT_VERSION) || "";
const launchedApplicationSessionId = searchParams.get(QUERY_APPLICATION_SESSION_ID) || "";
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
  sessionId: document.getElementById("session-id"),
  runtimeSummary: document.getElementById("runtime-summary"),
  backendQueriesUrl: document.getElementById("backend-queries-url"),
  backendNotificationsUrl: document.getElementById("backend-notifications-url"),
  statusBanner: document.getElementById("status-banner"),
  briefList: document.getElementById("brief-list"),
  briefDetail: document.getElementById("brief-detail"),
  notificationList: document.getElementById("notification-list"),
  refreshButton: document.getElementById("refresh-button"),
};

const logBriefStudio = (message) => {
  console.info(`[BriefStudio] ${message}`);
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTime = (value) => {
  if (!value) {
    return "—";
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  return timestamp.toLocaleString();
};

const setStatus = (text, tone = "idle") => {
  state.statusText = text;
  state.statusTone = tone;
  elements.statusBanner.textContent = text;
  elements.statusBanner.className = `status-banner${tone === "ready" ? " ready" : tone === "error" ? " error" : ""}`;
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

const renderNotifications = () => {
  if (state.notifications.length === 0) {
    elements.notificationList.className = "notification-list empty-state";
    elements.notificationList.textContent = "No notifications yet.";
    return;
  }

  elements.notificationList.className = "notification-list";
  elements.notificationList.innerHTML = state.notifications
    .map(
      (notification) => `
        <article class="notification-row" role="listitem">
          <div class="brief-title-row">
            <strong>${escapeHtml(notification.topic)}</strong>
            <span class="muted small">${escapeHtml(formatTime(notification.publishedAt))}</span>
          </div>
          <pre>${escapeHtml(JSON.stringify(notification.payload, null, 2))}</pre>
        </article>
      `,
    )
    .join("");
};

const renderBriefList = () => {
  if (state.briefs.length === 0) {
    elements.briefList.className = "brief-list empty-state";
    elements.briefList.textContent =
      "No brief rows yet. Launch the app and let the researcher/writer publish runtime events.";
    return;
  }

  elements.briefList.className = "brief-list";
  elements.briefList.innerHTML = state.briefs
    .map(
      (brief) => `
        <article class="brief-row${brief.briefId === state.selectedBriefId ? " active" : ""}">
          <button type="button" data-brief-id="${escapeHtml(brief.briefId)}">
            <div class="brief-title-row">
              <strong>${escapeHtml(brief.title)}</strong>
              <span class="badge">${escapeHtml(brief.status)}</span>
            </div>
            <div class="brief-meta-row muted small" style="margin-top: 10px;">
              <span>${escapeHtml(brief.briefId)}</span>
              <span>${escapeHtml(formatTime(brief.updatedAt))}</span>
            </div>
          </button>
        </article>
      `,
    )
    .join("");

  for (const button of elements.briefList.querySelectorAll("button[data-brief-id]")) {
    button.addEventListener("click", () => {
      state.selectedBriefId = button.dataset.briefId || null;
      void refreshDetail();
    });
  }
};

const formatArtifactRef = (artifact) => {
  if (!artifact?.artifactRef) {
    return "No artifact payload";
  }
  if (artifact.artifactRef.kind === "INLINE_JSON") {
    return JSON.stringify(artifact.artifactRef.value, null, 2);
  }
  return JSON.stringify(artifact.artifactRef, null, 2);
};

const renderBriefDetail = () => {
  const brief = state.detail;
  if (!brief) {
    elements.briefDetail.className = "empty-state";
    elements.briefDetail.textContent = "Select a brief to inspect its projected artifacts and review state.";
    return;
  }

  const artifacts = brief.artifacts || [];
  const reviewNotes = brief.reviewNotes || [];

  elements.briefDetail.className = "detail-grid";
  elements.briefDetail.innerHTML = `
    <section class="detail-section">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(brief.title)}</h3>
          <p class="muted small">${escapeHtml(brief.briefId)} · session ${escapeHtml(brief.applicationSessionId)}</p>
        </div>
        <span class="badge">${escapeHtml(brief.status)}</span>
      </div>
      <div class="detail-actions muted small">
        <span>Created ${escapeHtml(formatTime(brief.createdAt))}</span>
        <span>Updated ${escapeHtml(formatTime(brief.updatedAt))}</span>
        <span>Status ${escapeHtml(brief.status)}</span>
      </div>
      <div class="action-row">
        <button id="approve-brief" class="primary-button" type="button">Approve</button>
        <button id="reject-brief" class="danger-button" type="button">Reject</button>
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Projected artifacts</h3>
        <p class="muted">Stored in app-owned tables after durable event dispatch.</p>
      </div>
      <div class="artifact-grid">
        ${artifacts.length === 0
          ? `<div class="empty-state">No artifact projections yet.</div>`
          : artifacts
              .map(
                (artifact) => `
                  <article class="artifact-card">
                    <div class="brief-title-row">
                      <strong>${escapeHtml(artifact.artifactKind)}</strong>
                      <span class="badge">${escapeHtml(artifact.isFinal ? "final" : "draft")}</span>
                    </div>
                    <p class="muted small" style="margin-top: 8px;">${escapeHtml(artifact.title)}</p>
                    <p class="muted small" style="margin-top: 6px;">${escapeHtml(artifact.summary || "No summary provided")}</p>
                    <pre>${escapeHtml(formatArtifactRef(artifact))}</pre>
                  </article>
                `,
              )
              .join("")}
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Review notes</h3>
        <p class="muted">User-driven commands update app-owned review workflow state.</p>
      </div>
      <div class="note-list">
        ${reviewNotes.length === 0
          ? `<div class="empty-state">No review notes yet.</div>`
          : reviewNotes
              .map(
                (note) => `
                  <article class="note-row">
                    <div class="brief-title-row">
                      <strong>${escapeHtml(note.noteId)}</strong>
                      <span class="muted small">${escapeHtml(formatTime(note.createdAt))}</span>
                    </div>
                    <p style="margin-top: 10px; line-height: 1.6;">${escapeHtml(note.body)}</p>
                  </article>
                `,
              )
              .join("")}
      </div>
      <form id="note-form" class="note-composer">
        <textarea id="note-input" placeholder="Add a review note for the selected brief"></textarea>
        <div class="action-row">
          <button class="secondary-button" type="submit">Add review note</button>
        </div>
      </form>
    </section>
  `;

  document.getElementById("approve-brief")?.addEventListener("click", () => void approveBrief());
  document.getElementById("reject-brief")?.addEventListener("click", () => void rejectBrief());
  document.getElementById("note-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void addReviewNote();
  });
};

const renderMetadata = () => {
  const bootstrap = state.bootstrap;
  if (!bootstrap) {
    return;
  }
  elements.applicationName.textContent = bootstrap.application.name;
  elements.applicationIds.textContent = [
    `app ${bootstrap.application.applicationId}`,
    `local ${bootstrap.application.localApplicationId}`,
    `package ${bootstrap.application.packageId}`,
  ].join(" · ");
  elements.sessionId.textContent = bootstrap.session.applicationSessionId;
  elements.runtimeSummary.textContent = `${bootstrap.runtime.kind} · ${bootstrap.runtime.runId}`;
  elements.backendQueriesUrl.textContent = bootstrap.transport.backendQueriesBaseUrl || "—";
  elements.backendNotificationsUrl.textContent = bootstrap.transport.backendNotificationsUrl || "—";
};

const render = () => {
  renderMetadata();
  renderBriefList();
  renderBriefDetail();
  renderNotifications();
};

const refreshDetail = async () => {
  if (!state.client || !state.selectedBriefId) {
    state.detail = null;
    renderBriefDetail();
    return;
  }
  const result = await state.client.query("briefs.getDetail", { briefId: state.selectedBriefId });
  state.detail = result?.brief || null;
  renderBriefDetail();
};

const refresh = async () => {
  if (!state.client) {
    return;
  }
  logBriefStudio(`refresh start sessionId=${state.bootstrap?.session?.applicationSessionId || "unknown"}`);
  setStatus("Loading briefs through the app backend gateway…");
  const result = await state.client.query("briefs.list", null);
  state.briefs = Array.isArray(result?.briefs) ? result.briefs : [];

  if (!state.selectedBriefId || !state.briefs.some((brief) => brief.briefId === state.selectedBriefId)) {
    state.selectedBriefId = state.briefs[0]?.briefId || null;
  }

  await refreshDetail();
  renderBriefList();
  setStatus("Brief Studio is ready. Use the list/detail/command flow backed by the frontend SDK.", "ready");
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
  setStatus("Rejecting brief…");
  await state.client.command("rejectBrief", { briefId: state.selectedBriefId });
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
  renderNotifications();
  if (["brief.ready_for_review", "brief.review_updated", "brief.note_added"].includes(notification.topic)) {
    try {
      await refresh();
    } catch {
      // keep the notification even if the follow-up refresh fails
    }
  }
};

const createClient = (bootstrap) =>
  createApplicationClient({
    applicationId: bootstrap.application.applicationId,
    requestContext: {
      applicationId: bootstrap.application.applicationId,
      applicationSessionId: bootstrap.session.applicationSessionId,
    },
    transport: createTransport(bootstrap),
  });

const handleBootstrap = async (event) => {
  if (event.source !== window.parent) {
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
  if (message.payload?.session?.applicationSessionId !== launchedApplicationSessionId) {
    return;
  }
  if (message.payload?.session?.launchInstanceId !== launchedLaunchInstanceId) {
    return;
  }
  if (message.payload?.host?.origin !== hostOrigin) {
    return;
  }

  logBriefStudio(
    `bootstrap received sessionId=${message.payload.session.applicationSessionId} launchInstanceId=${message.payload.session.launchInstanceId} backendQueriesBaseUrl=${message.payload.transport.backendQueriesBaseUrl || "missing"}`,
  );
  state.bootstrap = message.payload;
  state.client = createClient(message.payload);
  renderMetadata();

  state.notificationHandle?.close();
  state.notificationHandle = state.client.subscribeNotifications((notification) => {
    void handleNotification(notification);
  });

  try {
    await refresh();
  } catch (error) {
    console.warn(
      `[BriefStudio] initial refresh failed sessionId=${message.payload.session.applicationSessionId} message=${error instanceof Error ? error.message : String(error)}`,
    );
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
};

const sendReady = () => {
  if (hintedContractVersion !== CONTRACT_VERSION || !launchedApplicationSessionId || !launchedLaunchInstanceId) {
    return;
  }

  window.parent.postMessage(
    {
      channel: CHANNEL,
      contractVersion: CONTRACT_VERSION,
      eventName: READY_EVENT,
      payload: {
        applicationSessionId: launchedApplicationSessionId,
        launchInstanceId: launchedLaunchInstanceId,
      },
    },
    "*",
  );
  logBriefStudio(`ready event posted sessionId=${launchedApplicationSessionId} launchInstanceId=${launchedLaunchInstanceId}`);
};

window.addEventListener("message", (event) => {
  void handleBootstrap(event);
});

elements.refreshButton?.addEventListener("click", () => {
  void refresh().catch((error) => {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  });
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", sendReady, { once: true });
} else {
  sendReady();
}
