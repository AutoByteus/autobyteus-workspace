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

export const renderSocraticMathTeacherShell = (rootElement) => {
  rootElement.innerHTML = `
    <main class="shell">
      <header class="hero card">
        <div class="eyebrow">Built-in teaching sample</div>
        <h1>Socratic Math Teacher</h1>
        <p class="lede">
          Start lessons, follow the tutor's live guidance, and keep every completed turn in one durable
          lesson transcript.
        </p>
      </header>

      <section id="workspace-status" class="workspace-status">
        Socratic Math Teacher is ready to load lesson data.
      </section>

      <details class="card details-panel">
        <summary class="details-summary">Advanced app details</summary>
        <p class="details-copy muted">
          The platform hosts the backend mount and launch lifecycle, while the app owns the lesson GraphQL schema,
          generated frontend client, tutor transcript projection, and repeated follow-up semantics.
        </p>
        <div class="meta-grid">
          <div>
            <span class="label">Application</span>
            <div id="application-name" class="value">Waiting for hosted application context…</div>
            <div id="application-ids" class="muted">—</div>
          </div>
          <div>
            <span class="label">Launch</span>
            <div id="iframe-launch-id" class="value">—</div>
            <div id="request-context" class="muted">—</div>
          </div>
          <div>
            <span class="label">Backend mount</span>
            <div id="backend-base-url" class="value small">—</div>
            <div id="backend-notifications-url" class="muted small">—</div>
          </div>
        </div>
      </details>

      <section class="card composer-panel">
        <div class="panel-header">
          <div>
            <h2>Start lesson</h2>
            <p class="muted">Create one lesson, connect to its tutor, and send the problem after the live connection is ready. Host-managed runtime and model selections keep their configured priority.</p>
          </div>
        </div>
        <form id="start-lesson-form" class="brief-composer">
          <div class="composer-grid">
            <label class="field">
              <span class="label">Math problem</span>
              <input id="lesson-prompt-input" type="text" placeholder="Solve 3x + 5 = 20" />
            </label>
          </div>
          <div class="action-row">
            <button id="start-lesson-button" class="primary-button" type="submit">Start lesson</button>
            <span class="muted small">The first response streams live, then the published tutor turn becomes the durable transcript.</span>
          </div>
        </form>
      </section>

      <section class="content-grid">
        <aside class="card list-panel">
          <div class="panel-header">
            <div>
              <h2>Lessons</h2>
              <p class="muted">Track each lesson, its current tutoring status, and the latest activity.</p>
            </div>
            <button id="refresh-button" class="ghost-button" type="button">Refresh</button>
          </div>
          <div id="lesson-list" class="brief-list empty-state">
            No lessons yet. Start one lesson to begin the tutoring conversation.
          </div>
        </aside>

        <section class="card detail-panel">
          <div class="panel-header">
            <div>
              <h2>Lesson detail</h2>
              <p class="muted">Review the tutoring conversation, current lesson status, and next student action.</p>
            </div>
          </div>
          <div id="lesson-detail" class="empty-state">
            Select a lesson to continue the tutoring conversation and review past guidance.
          </div>
        </section>
      </section>

      <section class="card notification-panel">
        <div class="panel-header">
          <div>
            <h2>Backend notifications</h2>
            <p class="muted">Optional app notifications fan out through the platform-owned application backend stream.</p>
          </div>
        </div>
        <div id="notification-list" class="notification-list empty-state">No notifications yet.</div>
      </section>
    </main>
  `;
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
    elements.lessonList.textContent = "No lessons yet. Start one lesson to begin the tutoring conversation.";
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
              <span>Lesson ${escapeHtml(lesson.lessonId)}</span>
              <span>Updated ${escapeHtml(formatTime(lesson.updatedAt))}</span>
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

const visibleTranscriptMessages = (messages, tutorLive) => {
  if (!Array.isArray(messages) || !tutorLive?.deferDurableTutorMessages) return messages;
  let tutorMessageCount = 0;
  return messages.filter((message) => {
    if (message?.role !== "tutor") return true;
    tutorMessageCount += 1;
    return tutorMessageCount <= tutorLive.durableTutorMessageBaseline;
  });
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

const renderRuntimeDiagnostics = (lesson) => `
  <details class="inline-details">
    <summary class="details-summary">Advanced runtime details</summary>
    <p class="details-copy muted">
      Optional diagnostics for app authors. The main lesson view stays centered on the tutoring conversation.
    </p>
    <div class="meta-grid compact-meta-grid">
      <div>
        <span class="label">Latest binding</span>
        <div class="value small">${escapeHtml(lesson.latestBindingId || "—")}</div>
        <div class="muted small">Status ${escapeHtml(lesson.latestBindingStatus || "—")}</div>
      </div>
      <div>
        <span class="label">Latest run</span>
        <div class="value small">${escapeHtml(lesson.latestRunId || "—")}</div>
        <div class="muted small">Updated ${escapeHtml(formatTime(lesson.updatedAt))}</div>
      </div>
      <div>
        <span class="label">Runtime note</span>
        <div class="muted small">${escapeHtml(lesson.lastErrorMessage || "No recorded runtime error")}</div>
      </div>
    </div>
  </details>
`;

const LIVE_STATUS_LABELS = {
  idle: "Tutor not connected",
  connecting: "Connecting to the tutor…",
  ready: "Tutor connected",
  streaming: "Tutor is responding…",
  completed: "Tutor response complete · saving transcript…",
  saved: "Tutor response saved",
  failed: "Tutor connection failed",
  closed: "Tutor connection closed",
};

const renderLiveTutor = (state, lesson) => {
  const live = state.tutorLive;
  const belongsToLesson = live?.lessonId === lesson.lessonId;
  const status = belongsToLesson ? live.status : "idle";
  const statusLabel = LIVE_STATUS_LABELS[status] ?? LIVE_STATUS_LABELS.idle;
  const text = belongsToLesson ? live.text : "";
  const errorMessage = belongsToLesson ? live.errorMessage : null;
  const liveWarning = belongsToLesson ? live.liveWarning : null;
  const placeholder = status === "saved"
    ? "The authoritative tutor response is shown in the transcript below."
    : status === "completed"
      ? "The live response is complete and is waiting for the durable transcript."
      : "Live text appears here while the tutor responds. Completed turns remain in the transcript below.";

  return `
    <section class="live-tutor" data-live-state="${escapeHtml(status)}" aria-live="polite" aria-atomic="false">
      <div class="live-tutor-header">
        <div>
          <span class="label">Live tutor</span>
          <strong>${escapeHtml(statusLabel)}</strong>
        </div>
        <span class="live-status-dot" aria-hidden="true"></span>
      </div>
      ${text
        ? `<p class="live-tutor-text">${escapeHtml(text)}</p>`
        : `<p class="muted small live-tutor-placeholder">${escapeHtml(placeholder)}</p>`}
      ${errorMessage ? `<p class="live-error" role="alert">${escapeHtml(errorMessage)}</p>` : ""}
      ${liveWarning ? `<p class="live-warning">${escapeHtml(liveWarning)}</p>` : ""}
    </section>
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
    elements.lessonDetail.textContent = "Select a lesson to continue the tutoring conversation and review past guidance.";
    return;
  }

  const live = state.tutorLive?.lessonId === lesson.lessonId ? state.tutorLive : null;
  const nextTurnAvailable = Boolean(
    lesson.status === "active"
    && live?.turnAdmission === "available"
  );
  const turnHelp = nextTurnAvailable
    ? "Send one follow-up or request one hint. The next action becomes available after the tutor response is saved."
    : "Wait for the current tutor response to be saved before sending another.";
  const closeDispatching = state.closingLessonId === lesson.lessonId;
  const transcriptMessages = visibleTranscriptMessages(lesson.messages, live);

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
          <span class="label">Lesson record</span>
          <div class="value small">${escapeHtml(lesson.lessonId)}</div>
          <div class="muted small">Status ${escapeHtml(lesson.status)}</div>
        </div>
        <div>
          <span class="label">Conversation</span>
          <div class="value small">${escapeHtml(String(Array.isArray(lesson.messages) ? lesson.messages.length : 0))} messages</div>
          <div class="muted small">Closed ${escapeHtml(formatTime(lesson.closedAt))}</div>
        </div>
        <div>
          <span class="label">Next step</span>
          <div class="muted small">Ask a follow-up question or request a hint to continue this lesson.</div>
        </div>
      </div>
      <div class="action-row">
        <button id="request-hint" class="secondary-button" type="button"${nextTurnAvailable ? "" : " disabled"}>Request hint</button>
        <button id="close-lesson" class="danger-button" type="button"${closeDispatching ? " disabled" : ""}>${closeDispatching ? "Closing lesson…" : "Close lesson"}</button>
      </div>
    </section>

    ${renderLiveTutor(state, lesson)}

    <section class="detail-section">
      <div>
        <h3>Transcript</h3>
        <p class="muted">The lesson keeps the tutoring conversation and student follow-ups together in one record.</p>
      </div>
      ${renderTranscript(transcriptMessages)}
      <form id="follow-up-form" class="note-composer">
        <textarea id="follow-up-input" placeholder="Send the next follow-up question or answer"${nextTurnAvailable ? "" : " disabled"}></textarea>
        <div class="action-row">
          <button class="primary-button" type="submit"${nextTurnAvailable ? "" : " disabled"}>Send follow-up</button>
        </div>
        <p id="turn-admission-help" class="muted small">${escapeHtml(turnHelp)}</p>
      </form>
    </section>

    <section class="detail-section">
      ${renderRuntimeDiagnostics(lesson)}
    </section>
  `;

  elements.lessonDetail.querySelector("#request-hint")?.addEventListener("click", () => {
    onRequestHint().catch(onError);
  });
  elements.lessonDetail.querySelector("#close-lesson")?.addEventListener("click", () => {
    onCloseLesson().catch(onError);
  });
  elements.lessonDetail.querySelector("#follow-up-form")?.addEventListener("submit", (event) => {
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
  if (elements.iframeLaunchId) {
    elements.iframeLaunchId.textContent = bootstrap.iframeLaunchId;
  }
  if (elements.requestContext) {
    elements.requestContext.textContent = `applicationId ${bootstrap.requestContext.applicationId}`;
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
