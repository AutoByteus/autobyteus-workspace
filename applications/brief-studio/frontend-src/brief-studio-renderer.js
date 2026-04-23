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

const isFinalArtifact = (artifact) => artifact?.path === "brief-studio/final-brief.md";

const formatArtifactLabel = (artifact) => {
  switch (artifact?.publicationKind) {
    case "research":
      return "research";
    case "research_blocker":
      return "research blocker";
    case "draft":
      return "draft";
    case "final":
      return "final";
    case "writer_blocker":
      return "writer blocker";
    default:
      return artifact?.publicationKind || artifact?.artifactKind || "artifact";
  }
};

export const renderBriefList = ({ state, elements, onSelectBrief, onError }) => {
  if (!elements.briefList) {
    return;
  }

  if (state.briefs.length === 0) {
    elements.briefList.className = "brief-list empty-state";
    elements.briefList.textContent = "No briefs yet. Create your first brief to start the workflow.";
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
              <span>Brief ${escapeHtml(brief.briefId)}</span>
              <span>Updated ${escapeHtml(formatTime(brief.updatedAt))}</span>
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
    return `<div class="empty-state">No draft generations yet for this brief.</div>`;
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

const renderRuntimeDiagnostics = (brief, executions) => `
  <details class="inline-details">
    <summary class="details-summary">Workflow diagnostics</summary>
    <p class="details-copy muted">
      Optional app-author diagnostics. The main brief workflow stays focused on drafts, notes, and approval state.
    </p>
    <div class="meta-grid compact-meta-grid">
      <div>
        <span class="label">Latest binding</span>
        <div class="value small">${escapeHtml(brief.latestBindingId || "—")}</div>
        <div class="muted small">Status ${escapeHtml(brief.latestBindingStatus || "—")}</div>
      </div>
      <div>
        <span class="label">Latest run</span>
        <div class="value small">${escapeHtml(brief.latestRunId || "—")}</div>
        <div class="muted small">Last updated ${escapeHtml(formatTime(brief.updatedAt))}</div>
      </div>
      <div>
        <span class="label">Runtime note</span>
        <div class="muted small">${escapeHtml(brief.lastErrorMessage || "No recorded runtime error")}</div>
      </div>
    </div>
    <div style="margin-top: 18px;">
      <h3>Draft generation history</h3>
      <p class="muted">One brief can accumulate many app-owned draft generations over time.</p>
    </div>
    <div style="margin-top: 18px;">
      ${renderExecutionHistory(executions)}
    </div>
  </details>
`;

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
    elements.briefDetail.textContent = "Select a brief to review generated drafts, notes, and approval status.";
    return;
  }

  const artifacts = Array.isArray(brief.artifacts) ? brief.artifacts : [];
  const reviewNotes = Array.isArray(brief.reviewNotes) ? brief.reviewNotes : [];
  const finalArtifactCount = artifacts.filter((artifact) => isFinalArtifact(artifact)).length;

  elements.briefDetail.className = "detail-grid";
  elements.briefDetail.innerHTML = `
    <section class="detail-section">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(brief.title)}</h3>
          <p class="muted small">briefId ${escapeHtml(brief.briefId)}</p>
        </div>
        <span class="badge">${escapeHtml(brief.status)}</span>
      </div>
      <div class="detail-actions muted small">
        <span>Created ${escapeHtml(formatTime(brief.createdAt))}</span>
        <span>Updated ${escapeHtml(formatTime(brief.updatedAt))}</span>
      </div>
      <div class="meta-grid compact-meta-grid">
        <div>
          <span class="label">Brief record</span>
          <div class="value small">${escapeHtml(brief.briefId)}</div>
          <div class="muted small">Status ${escapeHtml(brief.status)}</div>
        </div>
        <div>
          <span class="label">Draft outputs</span>
          <div class="value small">${escapeHtml(String(artifacts.length))}</div>
          <div class="muted small">${escapeHtml(String(finalArtifactCount))} final</div>
        </div>
        <div>
          <span class="label">Review</span>
          <div class="value small">${escapeHtml(String(reviewNotes.length))} notes</div>
          <div class="muted small">Approved ${escapeHtml(formatTime(brief.approvedAt))} · Rejected ${escapeHtml(formatTime(brief.rejectedAt))}</div>
        </div>
      </div>
      <div class="action-row">
        <button id="launch-draft-run" class="secondary-button" type="button">Generate draft</button>
        <button id="approve-brief" class="primary-button" type="button">Approve</button>
        <button id="reject-brief" class="danger-button" type="button">Reject</button>
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Draft outputs</h3>
        <p class="muted">Generated drafts stay attached to the same brief record for review.</p>
      </div>
      <div class="artifact-grid">
        ${artifacts.length === 0
          ? `<div class="empty-state">No draft outputs yet.</div>`
          : artifacts
              .map(
                (artifact) => `
                  <article class="artifact-card">
                    <div class="brief-title-row">
                      <strong>${escapeHtml(artifact.artifactKind)}</strong>
                      <span class="badge">${escapeHtml(formatArtifactLabel(artifact))}</span>
                    </div>
                    <p class="muted small" style="margin-top: 8px;">${escapeHtml(artifact.path)}</p>
                    <p class="muted small" style="margin-top: 6px;">${escapeHtml(artifact.description || "No description provided")}</p>
                    <pre>${escapeHtml(artifact.body || "")}</pre>
                  </article>
                `,
              )
              .join("")}
      </div>
    </section>

    <section class="detail-section">
      <div>
        <h3>Review notes</h3>
        <p class="muted">Keep the approval conversation on the brief record itself.</p>
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

    <section class="detail-section">
      ${renderRuntimeDiagnostics(brief, state.executions)}
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

export const renderApp = (input) => {
  renderBriefList(input);
  renderBriefDetail(input);
};
