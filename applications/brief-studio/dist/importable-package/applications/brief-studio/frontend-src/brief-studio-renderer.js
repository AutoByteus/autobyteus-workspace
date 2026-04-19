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
    elements.briefList.textContent = "No briefs yet. Create a business record, then launch one or more draft runs from it.";
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

const renderExecutionHistory = (executions) => {
  if (!Array.isArray(executions) || executions.length === 0) {
    return `<div class="empty-state">No draft runs yet for this brief.</div>`;
  }

  return `
    <div class="note-list">
      ${executions
        .map(
          (execution) => `
            <article class="note-row">
              <div class="brief-title-row">
                <strong>${escapeHtml(execution.bindingId)}</strong>
                <span class="badge">${escapeHtml(execution.status)}</span>
              </div>
              <div class="brief-meta-row muted small" style="margin-top: 10px;">
                <span>Run ${escapeHtml(execution.runId)}</span>
                <span>${escapeHtml(formatTime(execution.createdAt))}</span>
              </div>
              <div class="muted small" style="margin-top: 10px;">
                Definition ${escapeHtml(execution.definitionId)} · Closed ${escapeHtml(formatTime(execution.terminatedAt))}
              </div>
              <div class="muted small" style="margin-top: 6px;">${escapeHtml(execution.lastErrorMessage || "No recorded runtime error")}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
};

export const renderBriefDetail = ({
  state,
  elements,
  onLaunchDraftRun,
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
    elements.briefDetail.textContent = "Select a brief to inspect its projected artifacts, execution history, and review workflow.";
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
          <span class="label">Latest binding</span>
          <div class="value small">${escapeHtml(brief.latestBindingId || "—")}</div>
          <div class="muted small">Status ${escapeHtml(brief.latestBindingStatus || "—")}</div>
        </div>
        <div>
          <span class="label">Latest run</span>
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
        <button id="launch-draft-run" class="secondary-button" type="button">Launch draft run</button>
        <button id="approve-brief" class="primary-button" type="button">Approve</button>
        <button id="reject-brief" class="danger-button" type="button">Reject</button>
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Execution history</h3>
        <p class="muted">One briefId can accumulate many bound runs over time.</p>
      </div>
      ${renderExecutionHistory(state.executions)}
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
        <p class="muted">GraphQL mutations update the app-owned review workflow state.</p>
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

  document.getElementById("launch-draft-run")?.addEventListener("click", () => {
    onLaunchDraftRun().catch(onError);
  });
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
  if (elements.backendBaseUrl) {
    elements.backendBaseUrl.textContent = bootstrap.transport.backendBaseUrl || "—";
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
