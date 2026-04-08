# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Fix the frontend bug where clicking a file artifact/touched-file entry for an `edit_file` activity can open an empty viewer instead of showing the edited file's content.

## Investigation Findings
- The selected `edit_file` artifact is often mounted before it has enough metadata to resolve a workspace-backed fetch URL.
- The viewer falls back to empty `artifact.content` for `edit_file`, because full file content is intentionally not buffered from diff/patch payloads.
- Later store updates mutate the same selected artifact object in place, but the viewer only refreshes on artifact object replacement, so it does not refetch when the row becomes fetchable.
- Re-selecting the same row currently does not force a retry, because selection state is id-based and clicking the same row does not change the selected artifact identity.
- The intended content source for `edit_file` remains the workspace content endpoint, not diff rendering.

## Recommendations
- Keep the fix frontend-scoped.
- Refresh selected `edit_file` artifact content automatically when the artifact becomes fetchable after success/metadata enrichment.
- Allow a user click on the artifact row to trigger a viewer refresh/retry even when the same row is already selected.

## Scope Classification (`Small`/`Medium`/`Large`)
Small

## In-Scope Use Cases
- `UC-001`: User clicks a touched file created from an `edit_file` activity and sees the file content.
- `UC-002`: User clicks a touched file after the edit has completed and sees the final file content.
- `UC-003`: Existing `write_file` streaming preview behavior remains intact.
- `UC-004`: A selected `edit_file` row becomes fetchable after success/metadata enrichment and the viewer refreshes without requiring the user to switch away and back.
- `UC-005`: User clicks the same artifact row again after a blank or failed fetch and the viewer retries content resolution.

## Out of Scope
- Redesigning the overall artifact/touched-files information architecture.
- Adding diff rendering for `edit_file`.
- Historical restore for prior runs.
- Changing backend artifact visibility rules across all runtimes.

## Functional Requirements
- `requirement_id: R-001` — `edit_file` touched-file entries must open a non-empty content view when the referenced file exists and is readable in the current workspace.
- `requirement_id: R-002` — The viewer must use workspace-backed file fetch as the source of truth for `edit_file` content whenever the selected artifact can be resolved to the workspace content endpoint.
- `requirement_id: R-003` — Existing `write_file` streamed-content viewing must continue to work.
- `requirement_id: R-004` — When the selected `edit_file` artifact gains fetchable metadata after success or artifact enrichment, the viewer must automatically refresh and fetch the current file content.
- `requirement_id: R-005` — Re-selecting the same artifact row must trigger a content refresh attempt so the user can retry the fetch without changing selection.

## Acceptance Criteria
- `acceptance_criteria_id: AC-001` — Given a successful `edit_file` entry in the artifact/touched-files panel, when the user clicks it, the viewer shows the file content instead of a blank state.
- `acceptance_criteria_id: AC-002` — Given the file path resolves in the active workspace after edit completion, the viewer shows the current on-disk content.
- `acceptance_criteria_id: AC-003` — `write_file` entries still show streamed content and/or final file-backed content as before.
- `acceptance_criteria_id: AC-004` — Given an already-selected `edit_file` row receives success-time or artifact-event metadata that makes workspace fetch possible, the viewer automatically refetches and shows the file content.
- `acceptance_criteria_id: AC-005` — Given the user clicks the same artifact row again after a blank or failed view, the viewer retries content resolution.

## Constraints / Dependencies
- Frontend scope in `autobyteus-web` touched-file store/viewer/selection flow.
- `edit_file` content should continue to come from the workspace endpoint rather than diff/patch payloads.

## Assumptions
- The bug is in the current frontend touched-file/artifact viewing flow, not in backend file-serving.
- Selected artifact metadata can continue to arrive asynchronously after the artifact is already visible.

## Risks / Open Questions
- Need to avoid duplicate fetch loops or unnecessary refetch churn for `write_file` streaming rows.
- Need to preserve current behavior for rows that legitimately remain unresolved or deleted.

## Requirement-To-Use-Case Coverage
- `R-001` -> `UC-001`, `UC-002`
- `R-002` -> `UC-002`
- `R-003` -> `UC-003`
- `R-004` -> `UC-004`
- `R-005` -> `UC-005`

## Acceptance-Criteria-To-Scenario Intent
- `AC-001` -> Clicking an edited file should not produce an empty content pane.
- `AC-002` -> Completed edits should show final file content.
- `AC-003` -> Regression guard for streamed write-file behavior.
- `AC-004` -> The selected viewer must react when the artifact becomes fetchable after success.
- `AC-005` -> Clicking the same row again acts as a retry signal for content refresh.

## Approval Status
Requirements refined from investigation and latest user direction. Ready for Stage 3 design.
