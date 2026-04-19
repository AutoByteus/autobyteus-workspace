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

const formatArtifactRef = (artifact) => {
  if (!artifact?.artifactRef) {
    return "No artifact payload";
  }
  if (artifact.artifactRef.kind === "INLINE_JSON") {
    return JSON.stringify(artifact.artifactRef.value, null, 2);
  }
  return JSON.stringify(artifact.artifactRef, null, 2);
};

export const renderNotifications = ({ state, elements }) => {
  if (!elements.notificationList) {
    return;
  }

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

export const renderBriefList = ({ state, elements, onSelectBrief, onError }) => {
  if (!elements.briefList) {
    return;
  }

  if (state.briefs.length === 0) {
    elements.briefList.className = "brief-list empty-state";
    elements.briefList.textContent = "No briefs yet. Create one to start an app-owned runtime binding.";
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
              <span>${escapeHtml(brief.latestBindingStatus || "not started")}</span>
            </div>
            <div class="brief-meta-row muted small" style="margin-top: 8px;">
              <span>${escapeHtml(brief.latestRunId || "no run yet")}</span>
              <span>${escapeHtml(formatTime(brief.updatedAt))}</span>
            </div>
          </button>
        </article>
      `,
    )
    .join("");

  for (const button of elements.briefList.querySelectorAll("button[data-brief-id]")) {
    button.addEventListener("click", () => {
      onSelectBrief(button.dataset.briefId || null).catch(onError);
    });
  }
};

export const renderBriefDetail = ({
  state,
  elements,
  onApprove,
  onReject,
  onAddReviewNote,
  onError,
}) => {
  if (!elements.briefDetail) {
    return;
  }

  const brief = state.detail;
  if (!brief) {
    elements.briefDetail.className = "empty-state";
    elements.briefDetail.textContent = "Select a brief to inspect its projected artifacts, binding metadata, and review workflow.";
    return;
  }

  const artifacts = Array.isArray(brief.artifacts) ? brief.artifacts : [];
  const reviewNotes = Array.isArray(brief.reviewNotes) ? brief.reviewNotes : [];

  elements.briefDetail.className = "detail-grid";
  elements.briefDetail.innerHTML = `
    <section class="detail-section">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(brief.title)}</h3>
          <p class="muted small">executionRef ${escapeHtml(brief.briefId)}</p>
        </div>
        <span class="badge">${escapeHtml(brief.status)}</span>
      </div>
      <div class="detail-actions muted small">
        <span>Created ${escapeHtml(formatTime(brief.createdAt))}</span>
        <span>Updated ${escapeHtml(formatTime(brief.updatedAt))}</span>
      </div>
      <div class="meta-grid compact-meta-grid">
        <div>
          <span class="label">Binding</span>
          <div class="value small">${escapeHtml(brief.latestBindingId || "—")}</div>
          <div class="muted small">Status ${escapeHtml(brief.latestBindingStatus || "—")}</div>
        </div>
        <div>
          <span class="label">Run</span>
          <div class="value small">${escapeHtml(brief.latestRunId || "—")}</div>
          <div class="muted small">Approved ${escapeHtml(formatTime(brief.approvedAt))}</div>
        </div>
        <div>
          <span class="label">Review</span>
          <div class="value small">Rejected ${escapeHtml(formatTime(brief.rejectedAt))}</div>
          <div class="muted small">${escapeHtml(brief.lastErrorMessage || "No runtime error recorded")}</div>
        </div>
      </div>
      <div class="action-row">
        <button id="approve-brief" class="primary-button" type="button">Approve</button>
        <button id="reject-brief" class="danger-button" type="button">Reject</button>
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Projected artifacts</h3>
        <p class="muted">Stored in app-owned tables after durable execution-event dispatch.</p>
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

  document.getElementById("approve-brief")?.addEventListener("click", () => {
    onApprove().catch(onError);
  });
  document.getElementById("reject-brief")?.addEventListener("click", () => {
    onReject().catch(onError);
  });
  document.getElementById("note-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    onAddReviewNote().catch(onError);
  });
};

export const renderMetadata = ({ state, elements }) => {
  const bootstrap = state.bootstrap;
  if (!bootstrap) {
    return;
  }

  if (elements.applicationName) {
    elements.applicationName.textContent = bootstrap.application.name;
  }
  if (elements.applicationIds) {
    elements.applicationIds.textContent = [
      `app ${bootstrap.application.applicationId}`,
      `local ${bootstrap.application.localApplicationId}`,
      `package ${bootstrap.application.packageId}`,
    ].join(" · ");
  }
  if (elements.launchInstanceId) {
    elements.launchInstanceId.textContent = bootstrap.launch.launchInstanceId;
  }
  if (elements.requestContext) {
    elements.requestContext.textContent = `applicationId ${bootstrap.requestContext.applicationId} · launchInstanceId ${bootstrap.requestContext.launchInstanceId || "—"}`;
  }
  if (elements.backendQueriesUrl) {
    elements.backendQueriesUrl.textContent = bootstrap.transport.backendQueriesBaseUrl || "—";
  }
  if (elements.backendCommandsUrl) {
    elements.backendCommandsUrl.textContent = bootstrap.transport.backendCommandsBaseUrl || "—";
  }
  if (elements.backendNotificationsUrl) {
    elements.backendNotificationsUrl.textContent = bootstrap.transport.backendNotificationsUrl || "—";
  }
};

export const renderApp = (input) => {
  renderMetadata(input);
  renderBriefList(input);
  renderBriefDetail(input);
  renderNotifications(input);
};
