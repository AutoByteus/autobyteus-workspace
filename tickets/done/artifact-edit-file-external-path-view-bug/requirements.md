# Requirements

- Ticket: `artifact-edit-file-external-path-view-bug`
- Status: `Design-ready`
- Last Updated: `2026-04-10`

## Goal / Problem Statement

Redesign file-backed artifact rendering so `write_file` and `edit_file` are driven by one backend-owned agent-run file-change projection instead of a browser-owned mix of segment parsing, artifact events, lifecycle fallbacks, and current-path reads. The new source of truth must support both live display and historical rerendering from agent-run memory, without Electron-local reads and without requiring the original filesystem path to still exist later.

## Scope Triage

- Final Triage: `Large`
- Rationale:
  - The redesign now spans backend file-change ownership, run-memory persistence, live streaming transport, historical hydration, frontend state ownership, and removal of the narrower path-serving stopgap as the long-term file-change authority.

## Initial User Context

- The original user-visible bug was an empty `edit_file` viewer even though the file path and actual file content existed.
- The user explicitly rejected Electron-local reads because the server may be remote.
- The earlier run/path-serving redesign fixed only the immediate authority issue, but the user then asked for a broader redesign so file changes can be rerendered from memory in the future.
- The user clarified two important scope decisions for the current redesign:
  - current scope can stay agent-run-owned instead of team-run-owned,
  - the UI only needs the current/final effective content for a path, not diff rendering and not a public `changeId`.

## In-Scope Use Cases

- `UC-001` Live `write_file` creates a file-change row immediately and streams buffered content while the write is still in progress.
  - Expected: the Artifacts tab shows one file-change row for the path and renders the live buffered content without relying on direct workspace reads.
- `UC-002` Live `edit_file` creates a file-change row immediately and becomes inspectable once final effective content is captured.
  - Expected: the row is visible while pending, and after commit the viewer renders the committed file content from backend-owned run memory.
- `UC-003` User reloads or later reopens the same agent run.
  - Expected: the backend reconstructs the file-change list from agent-run memory and the frontend can render it again without re-deriving file rows from conversation segments.
- `UC-004` The touched file path is outside the workspace or the original file is later moved/deleted.
  - Expected: once the file change committed successfully, the user can still inspect the committed content from run memory rather than depending on the current filesystem path.
- `UC-005` The same normalized path is touched multiple times during one run.
  - Expected: the UI still shows one visible row for that path and always renders the latest effective content for that run/path pair.
- `UC-006` A file change fails or is denied.
  - Expected: the row remains visible with an explicit terminal failed state instead of disappearing or rendering blank content.
- `UC-007` Generated media/document outputs continue to work in the Artifacts tab during this redesign.
  - Expected: current generated-output behavior is not regressed even though file-backed rows move to a dedicated file-change subsystem.

## Out of Scope

- Team-run-owned aggregated file-change projection in the current iteration.
- Diff rendering for `edit_file`.
- Public multi-revision history or a public `changeId` field for file-change rows.
- Redesigning generated outputs into the same backend file-change model.
- Electron-local fallback for artifact/file-change content.
- Workspace inference or silent workspace creation as the primary source of truth for file-backed rows.

## Functional Requirements

- `REQ-001` The backend must own a dedicated agent-run file-change projection for `write_file` and `edit_file`.
- `REQ-002` The visible identity of a file-change row must be one normalized `runId + path` pair; a public `changeId` is not required in current scope.
- `REQ-003` Live `write_file` content must be available through the backend-owned file-change projection while the write is still in progress.
- `REQ-004` Live `edit_file` must become inspectable only after the backend captures the final effective content for that path.
- `REQ-005` Committed file-change content must be persisted under agent-run memory so historical rendering does not depend on the original filesystem path still existing.
- `REQ-006` Historical reopen must hydrate file changes from a backend projection/query path, not by reconstructing them from conversation-only history in the browser.
- `REQ-007` File-change content fetches must go through a run-scoped server boundary backed by run memory, not through Electron-local reads or workspace ownership inference.
- `REQ-008` Out-of-workspace file paths emitted by the run must render through the same backend file-change content contract.
- `REQ-009` When the same normalized path is touched again in the same run, the projection must update the existing row rather than creating a second visible row.
- `REQ-010` Failed or denied file changes must remain visible with an explicit failed status.
- `REQ-011` Generated media/document outputs must remain on the existing artifact flow with no regression in current scope.
- `REQ-012` Current redesign scope is agent-run-owned; team-run-owned aggregation is deferred.

## Acceptance Criteria

- `AC-001` Given a live `write_file`, when the runtime begins writing, the Artifacts tab shows the row immediately and renders streamed buffered content from the backend-owned file-change path.
- `AC-002` Given a live `edit_file`, when the edit succeeds, the viewer renders the final effective content from backend-owned run memory rather than from workspace inference or local filesystem access.
- `AC-003` Given the user reloads or later reopens the run, the frontend hydrates the same file-change rows from the backend projection and can still open committed content.
- `AC-004` Given the original touched file was outside the workspace or has since been moved/deleted, committed content is still inspectable from run memory for that run.
- `AC-005` Given the same normalized path is touched multiple times during one run, the UI shows one row for that path and renders the latest effective content.
- `AC-006` Given a file change fails or is denied, the row remains visible with a failed status and does not silently disappear.
- `AC-007` Given generated media/document outputs are produced during the run, their current artifact behavior still works after the file-change redesign.
- `AC-008` Focused backend and frontend tests covering live file changes, historical rerendering, same-path retouching, and failure handling pass.

## Constraints / Dependencies

- The server that executed the run remains the authority for file-change state and content.
- Current scope should use agent-run memory as the durable persistence boundary because it is already available and easy to reconstruct from.
- The existing WebSocket and history hydration paths need extension because neither currently exposes a dedicated file-change domain.
- Generated outputs remain a separate concern in current scope even though they still share the visible Artifacts tab.

## Assumptions

- `write_file` and `edit_file` in current scope primarily target inspectable text/code content.
- The product can accept one visible row per normalized path instead of a public multi-revision file-change timeline.
- Team-run aggregation can be deferred without blocking the current redesign.

## Open Questions / Risks

- Large or binary file writes may need a different snapshot/content-storage policy later.
- The split between file-backed rows and generated outputs remains a deliberate current-scope compromise and should be revisited only after the file-change redesign stabilizes.
- Live transport needs a normalized file-change event family or equivalent server-owned live projection notifications; otherwise the frontend would keep inferring file-change state from unrelated runtime events.

## Requirement Coverage Map

- `REQ-001` -> `UC-001`, `UC-002`, `UC-003`, `AC-001`, `AC-002`, `AC-003`
- `REQ-002` -> `UC-005`, `AC-005`
- `REQ-003` -> `UC-001`, `AC-001`, `AC-008`
- `REQ-004` -> `UC-002`, `AC-002`, `AC-008`
- `REQ-005` -> `UC-003`, `UC-004`, `AC-003`, `AC-004`
- `REQ-006` -> `UC-003`, `AC-003`, `AC-008`
- `REQ-007` -> `UC-001`, `UC-002`, `UC-004`, `AC-001`, `AC-002`, `AC-004`
- `REQ-008` -> `UC-004`, `AC-004`
- `REQ-009` -> `UC-005`, `AC-005`
- `REQ-010` -> `UC-006`, `AC-006`
- `REQ-011` -> `UC-007`, `AC-007`
- `REQ-012` -> scope guard for all current design/use-case mapping

## Acceptance Criteria -> Stage 7 Scenario Coverage Map

- `AC-001` -> `S7-001` live `write_file` row creation and buffered preview
- `AC-002` -> `S7-002` `edit_file` commit snapshot and server-backed rendering
- `AC-003` -> `S7-003` historical reopen hydrates file-change projection
- `AC-004` -> `S7-004` committed content survives out-of-workspace paths and later filesystem removal
- `AC-005` -> `S7-005` same-path retouch collapses to one row with latest content
- `AC-006` -> `S7-006` failed/denied file-change visibility
- `AC-007` -> `S7-007` generated-output non-regression
- `AC-008` -> `S7-008` focused backend/frontend validation suites
