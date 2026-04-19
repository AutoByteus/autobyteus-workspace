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

export const renderLessonList = ({ state, elements, onSelectLesson, onError }) => {
  if (!elements.lessonList) {
    return;
  }

  if (state.lessons.length === 0) {
    elements.lessonList.className = "brief-list empty-state";
    elements.lessonList.textContent = "No lessons yet. Start one lesson to create a long-lived conversational binding.";
    return;
  }

  elements.lessonList.className = "brief-list";
  elements.lessonList.innerHTML = state.lessons
    .map(
      (lesson) => `
        <article class="brief-row${lesson.lessonId === state.selectedLessonId ? " active" : ""}">
          <button type="button" data-lesson-id="${escapeHtml(lesson.lessonId)}">
            <div class="brief-title-row">
              <strong>${escapeHtml(lesson.prompt)}</strong>
              <span class="badge">${escapeHtml(lesson.status)}</span>
            </div>
            <div class="brief-meta-row muted small" style="margin-top: 10px;">
              <span>${escapeHtml(lesson.lessonId)}</span>
              <span>${escapeHtml(lesson.latestBindingStatus || "not attached")}</span>
            </div>
            <div class="brief-meta-row muted small" style="margin-top: 8px;">
              <span>${escapeHtml(lesson.latestRunId || "no run yet")}</span>
              <span>${escapeHtml(formatTime(lesson.updatedAt))}</span>
            </div>
          </button>
        </article>
      `,
    )
    .join("");

  for (const button of elements.lessonList.querySelectorAll("button[data-lesson-id]")) {
    button.addEventListener("click", () => {
      onSelectLesson(button.dataset.lessonId || null).catch(onError);
    });
  }
};

const renderTranscript = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return `<div class="empty-state">No lesson messages yet.</div>`;
  }

  return `
    <div class="note-list">
      ${messages
        .map(
          (message) => `
            <article class="note-row">
              <div class="brief-title-row">
                <strong>${escapeHtml(message.role)}</strong>
                <span class="badge">${escapeHtml(message.kind)}</span>
              </div>
              <div class="muted small" style="margin-top: 8px;">${escapeHtml(formatTime(message.createdAt))}</div>
              <p style="margin-top: 10px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message.body)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
};

export const renderLessonDetail = ({
  state,
  elements,
  onAskFollowUp,
  onRequestHint,
  onCloseLesson,
  onError,
}) => {
  if (!elements.lessonDetail) {
    return;
  }

  const lesson = state.detail;
  if (!lesson) {
    elements.lessonDetail.className = "empty-state";
    elements.lessonDetail.textContent = "Select a lesson to inspect its projected tutor transcript and binding state.";
    return;
  }

  elements.lessonDetail.className = "detail-grid";
  elements.lessonDetail.innerHTML = `
    <section class="detail-section">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(lesson.prompt)}</h3>
          <p class="muted small">lessonId ${escapeHtml(lesson.lessonId)}</p>
        </div>
        <span class="badge">${escapeHtml(lesson.status)}</span>
      </div>
      <div class="detail-actions muted small">
        <span>Created ${escapeHtml(formatTime(lesson.createdAt))}</span>
        <span>Updated ${escapeHtml(formatTime(lesson.updatedAt))}</span>
      </div>
      <div class="meta-grid compact-meta-grid">
        <div>
          <span class="label">Binding</span>
          <div class="value small">${escapeHtml(lesson.latestBindingId || "—")}</div>
          <div class="muted small">Status ${escapeHtml(lesson.latestBindingStatus || "—")}</div>
        </div>
        <div>
          <span class="label">Run</span>
          <div class="value small">${escapeHtml(lesson.latestRunId || "—")}</div>
          <div class="muted small">Closed ${escapeHtml(formatTime(lesson.closedAt))}</div>
        </div>
        <div>
          <span class="label">Errors</span>
          <div class="muted small">${escapeHtml(lesson.lastErrorMessage || "No runtime error recorded")}</div>
        </div>
      </div>
      <div class="action-row">
        <button id="request-hint" class="secondary-button" type="button">Request hint</button>
        <button id="close-lesson" class="danger-button" type="button">Close lesson</button>
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Transcript</h3>
        <p class="muted">Tutor turns are projected by the app from runtime artifacts, while student follow-ups reuse the same binding.</p>
      </div>
      ${renderTranscript(lesson.messages)}
      <form id="follow-up-form" class="note-composer">
        <textarea id="follow-up-input" placeholder="Send the next follow-up question or answer"></textarea>
        <div class="action-row">
          <button class="primary-button" type="submit">Send follow-up</button>
        </div>
      </form>
    </section>
  `;

  document.getElementById("request-hint")?.addEventListener("click", () => {
    onRequestHint().catch(onError);
  });
  document.getElementById("close-lesson")?.addEventListener("click", () => {
    onCloseLesson().catch(onError);
  });
  document.getElementById("follow-up-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    onAskFollowUp().catch(onError);
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
  renderLessonList(input);
  renderLessonDetail(input);
  renderNotifications(input);
};
