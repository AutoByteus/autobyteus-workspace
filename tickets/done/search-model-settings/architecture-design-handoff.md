# Handoff — Architecture Design Complete

- Package: `search-model-settings` (Project Task `autobyteus-146`, follow-up FU-1 of `autobyteus-71`)
- From: Solution Designer, 2026-10-19
- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=High`
- Route: handoff rule "Large or High → independent architecture review" → `/software_engineering_team/architecture_reviewer`
- Revisions: requirements `SR-007` (approved; REQ-011 approved by the user), design `SR-007`

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

## SR-005 Revision (code review CRR-001)

- **CR-002 (`Requirement Gap`):** decided as DEC-011. Keep the implementer's action error line (REQ-010, AC-014).
- **CR-001 (`Local Fix`, implementation-owned):** remove the dead code listed in design G7.
- **Unchanged:** architecture, boundaries and contracts. Re-review scope: REQ-010 / DEC-011 and G7 only.
- **Code:** `codex/search-model-settings` @ `e48806b035`.

## SR-006 Revision (failure origin FO-001)

- **Status cache:** the Project index status no longer re-reads every Task on each poll. Per-Project status is cached for the active model and marked dirty by the composed `ProjectChangeMarks` fan-out. Live job progress comes from memory (`collectionJobStatus`). See the design spec's "Failure-Origin Resolution".
- **QR-001 refined (DEC-012):** first load on Docker no slower than the `projects` list. **DEC-013:** "Couldn’t reach the server.".
- **Follow-up FU-1:** the Project store's whole-backlog read.
- **Re-review scope:** the FO-001 resolution section, DEC-012/DEC-013, G8.
- **Code:** `codex/search-model-settings` @ `671a1e596b` (validated `d2bcb95d3a`).

## SR-007 Revision (ARCH-REV-004 AR-005; user-approved REQ-011)

- **AR-005:** inputs cached (opaque fingerprints per Project), status computed fresh each poll, `collectionJobStatus` removed. Tests for MP-005…MP-007.
- **REQ-011 / DEC-014 (approved by the user 2026-10-19):** after a Task create or edit, a debounced background `indexProject` runs when the active model is on disk. Same change-mark listener; the search-time check is kept as a safety net. AC-015.
- **Re-review scope:** the design spec's "Revision SR-007" section, REQ-011 / AC-015 / DEC-014.

## Expected Next Action

Independent architecture review.
