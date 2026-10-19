# Handoff — Architecture Design Complete

- Package: `search-model-settings` (Project Task `autobyteus-146`, follow-up FU-1 of `autobyteus-71`)
- From: Solution Designer, 2026-10-19
- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=High`
- Route: handoff rule "Large or High → independent architecture review" → `/software_engineering_team/architecture_reviewer`
- Revisions: requirements `SR-004` (approved), design `SR-004` (revised after ARCH-REV-001; SR-003 first round)

## Request And Approval

- **Request:** the Project Task Manager delegated `autobyteus-146`, which the user asked for on 2026-10-18. Users can choose, download and index the embedding model from Settings. Server-side only; catalog models only; automatic first-search preparation stays.
- **Product Design:** at the user's request, the Product Team designed the UI. The user approved it ("done", 2026-10-19). Spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`, integration `cb384e3`). The user decided:
  - placement: Server Settings → Embedding;
  - minimal facts per model;
  - a switch dialog with the download size only;
  - D-1…D-5.
- **Requirements approval:** `Approved` at SR-002 by the Solution Designer within the direction. The only Needs-user decision and the UI came from the user; the user was informed.

## Design Summary

See `design-spec.md`:

- **Embedding layer** (`EmbeddingIndex` boundary):
  - model management and status, using a new internal `EmbeddingModelDownloads` (single flight; cancel);
  - a read-only collection status (fingerprints only; never schedules or loads anything);
  - `prepareActiveModel`;
  - downloaded model folders are kept until Remove (`removeAllExcept` removed).
- **Project Task search:** index status, index, rebuild and index-all.
- **GraphQL:** `embeddingSettingsStatus` plus mutations.
- **Web:** the approved sub-section, polling every 2 s.

## Risks

- RSK-001: status cost at QR-001 scale.
- RSK-002: cancel during rename.
- RSK-003: proxies (`autobyteus-168`).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`, branch `codex/search-model-settings`.
- Base: `origin/personal` @ `8d40ba3b6c`.
- Finalization target: `origin/personal`.

## Documents

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/`

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`
- `design-review-report.md`, `architecture-review-revision-record.md`: owned by the reviewer (round 1)
- `product-design-request.md`: history
- The Product spec and visual references, at the path above

## SR-004 Revision (response to ARCH-REV-001)

Re-review scope: AR-001…AR-004 and the UI-basis change from AR-002. See "Architecture Review Resolution" in the design spec.

- **AR-001:** an explicit active display-state table; Preparing only while work runs; restart test AC-013.
- **AR-002:** DEC-009 "Active · Not downloaded" + Download (prepares the active model). The Solution Designer decided it because the approved design left the gap; it reuses existing spec pieces. AC-011.
- **AR-003:** Retry = `retryModel()` then `prepareActiveModel()` (spine DS-006). AC-012.
- **AR-004:** `embeddingModelsStatus` (embeddings) and `projectTaskIndexes` (Project search), fetched in one document.
- **R-1…R-7:** applied; see the table.

## Expected Next Action

Independent architecture review.
