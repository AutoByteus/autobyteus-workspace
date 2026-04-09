# Requirements

- Ticket: `artifact-edit-file-external-path-view-bug`
- Status: `Design-ready`
- Last Updated: `2026-04-09`

## Goal / Problem Statement

Fix the Artifacts panel so clicking an `edit_file` artifact shows the actual file content even when the edited file path is outside the agent's currently assigned workspace root.

## Scope Triage

- Final Triage: `Small`
- Rationale: investigation shows the issue is a frontend workspace-resolution gap and can be fixed without expanding backend file-serving scope.

## Initial User Context

- The Artifacts panel lists `edit_file` entries correctly.
- Clicking affected entries shows an empty viewer pane even though the underlying file has content.
- The reported failing case involves a file path outside the agent workspace currently associated with the run.
- The user explicitly suspects workspace/path ownership may be involved.

## In-Scope Use Cases

- `UC-001` User opens an `edit_file` artifact for a file inside the run workspace.
  - Expected: the viewer still resolves the current file content.
- `UC-002` User opens an `edit_file` artifact for a file under another loaded workspace root.
  - Expected: the viewer resolves that workspace and renders the file content instead of staying blank.
- `UC-003` User opens an `edit_file` artifact before the workspace catalog has been loaded into the client.
  - Expected: the viewer refreshes the workspace catalog once and retries resolution.
- `UC-004` User views a streaming `write_file` artifact.
  - Expected: buffered preview behavior is unchanged.

## Out of Scope

- Broad artifact-viewer redesign.
- Diff rendering for `edit_file`.
- Arbitrary unrestricted filesystem browsing unrelated to artifact-backed files.

## Functional Requirements

- `REQ-001` The artifact viewer must resolve `edit_file` text artifacts against the correct loaded workspace when the artifact path belongs to a workspace other than the run workspace.
- `REQ-002` Workspace resolution must prefer the most specific matching workspace root for absolute artifact paths.
- `REQ-003` If workspace resolution initially fails because the client workspace catalog is not loaded yet, the viewer must refresh the workspace list once before giving up.
- `REQ-004` Existing `write_file` buffered preview behavior must remain unchanged.
- `REQ-005` The fix must stay within the existing workspace REST file-serving boundary; no new unrestricted file-serving API is introduced.

## Acceptance Criteria

- `AC-001` An `edit_file` artifact whose absolute path is under another loaded workspace root fetches content through that workspace and renders non-empty text.
- `AC-002` An in-workspace `edit_file` artifact continues to fetch content correctly.
- `AC-003` A cold workspace catalog is refreshed at most once per unresolved artifact-resolution attempt before the viewer gives up.
- `AC-004` Streaming `write_file` artifacts still render buffered content without workspace fetch regression.
- `AC-005` Focused artifact viewer tests covering the new resolution path pass.

## Constraints / Dependencies

- Workspace-backed content must continue to flow through `/workspaces/:workspaceId/content`.
- The solution may depend on the client having access to loaded workspace `absolutePath` data or being able to refresh it through existing workspace-loading logic.

## Assumptions

- The user-visible failing files belong to workspace roots that are either already registered or fetchable through the existing workspace catalog.

## Risks

- Files outside every registered workspace will still remain unresolved until a broader product decision is made.
- An overly eager workspace refresh loop could produce unnecessary network chatter if not bounded.

## Requirement Coverage Map

- `REQ-001` -> `UC-002`, `AC-001`, `AC-005`
- `REQ-002` -> `UC-001`, `UC-002`, `AC-001`, `AC-002`
- `REQ-003` -> `UC-003`, `AC-003`, `AC-005`
- `REQ-004` -> `UC-004`, `AC-004`, `AC-005`
- `REQ-005` -> `UC-001`, `UC-002`, `UC-003`, `AC-001`, `AC-002`, `AC-003`

## Acceptance Criteria -> Stage 7 Scenario Coverage Map

- `AC-001` -> `S7-001` alternate-workspace absolute-path viewer resolution
- `AC-002` -> `S7-002` in-workspace viewer regression check
- `AC-003` -> `S7-003` one-time workspace catalog refresh on unresolved path
- `AC-004` -> `S7-004` `write_file` buffered preview non-regression
- `AC-005` -> `S7-005` focused Vitest artifact-viewer suite
