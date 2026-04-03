# Requirements

## Status
- Current Status: `Design-ready`
- Updated On: `2026-03-30`

## Goal / Problem Statement
The current artifact area should be redefined as the live run area for all files the agent touches. Users should be able to quickly click any touched file and inspect its current content or preview without relying on deep diff rendering. The design should preserve the strong `write_file` streaming UX, bring `edit_file` to parity in discoverability, keep generated asset outputs visible, and remove the current dependency on unused backend artifact persistence for the live UX.

## Scope Classification
- Classification: `Medium`
- Rationale:
  - Cross-layer behavior spans frontend stream handlers, frontend touched-file state/view logic, and the current backend artifact persistence/query path.
  - The product concept is narrow, but the architectural cleanup crosses subsystem boundaries.

## In-Scope Use Cases
- `UC-001`: When the agent starts a `write_file`, the touched file appears immediately in the artifact area and can be inspected while content streams.
- `UC-002`: When the agent starts an `edit_file`, the touched file appears immediately in the artifact area and can be clicked to inspect the file content directly.
- `UC-003`: When the agent generates media/document outputs (for example image, video, audio, pdf, csv, excel), the touched output appears in the artifact area and can be previewed.
- `UC-004`: Clicking a text/code touched-file entry shows the full current file content rather than a diff-only rendering.
- `UC-005`: If a touched-file operation is denied or fails during the live run, the entry remains visible with an explicit failed state so users can still inspect the current file/output context.
- `UC-006`: The live touched-files UX works without reading persisted artifact metadata from backend storage.

## Out Of Scope / Non-Goals
- Reconstructing touched files from historical raw traces/tool calls for run restore.
- Designing a durable history/restore artifact model for past runs.
- Deep diff rendering for `edit_file` inside the artifact area.
- Broad right-panel IA renaming; product copy may keep `Artifacts` for this ticket even if the semantics shift to touched files.

## Requirements (Verifiable)
- `R-001` (Touched-Files Projection):
  - Expected outcome: The artifact area represents all files/outputs touched during the current run rather than only persisted backend artifacts.
- `R-002` (`write_file` Discoverability):
  - Expected outcome: `write_file` creates a touched-file entry as soon as the file path is known, and the entry stays inspectable through streaming, approval, and final success/failure states.
- `R-003` (`edit_file` Discoverability):
  - Expected outcome: `edit_file` creates a touched-file entry as soon as the file path is known, without waiting for backend artifact-update persistence semantics.
- `R-004` (Generated Output Visibility):
  - Expected outcome: Generated asset/document outputs with resolved paths/URLs appear in the artifact area as touched outputs.
- `R-005` (Full File Content Viewing):
  - Expected outcome: Clicking a text/code touched-file entry shows the full current file content, sourced from the current workspace file when available.
- `R-006` (Streamed Preview Retention):
  - Expected outcome: `write_file` retains live streamed preview behavior before the final file-backed content is available.
- `R-007` (No Diff Requirement For `edit_file`):
  - Expected outcome: `edit_file` does not require diff rendering in the artifact area; the main artifact-area responsibility is direct file inspection.
- `R-008` (Failure-State Clarity):
  - Expected outcome: If a touched-file operation is denied or fails during the live run, the corresponding entry remains visible with an explicit failed state and does not silently disappear.
- `R-009` (Live UX Independence From Persistence):
  - Expected outcome: The current live touched-files UX does not depend on querying persisted artifact metadata from backend storage.
- `R-010` (Persistence Simplification/Removal):
  - Expected outcome: The current unused backend artifact persistence/query path is removed or deactivated for this live UX scope rather than expanded, because future history restore is explicitly out of scope.
- `R-011` (Assets/Files Grouping Preservation):
  - Expected outcome: The artifact area continues to support both file and asset outputs in a way that keeps them easy to browse and inspect.
- `R-012` (Selection/Discoverability Parity):
  - Expected outcome: Newly touched files become as discoverable/selectable as streamed `write_file` entries; any automatic tab/selection behavior must not depend solely on streaming status.

## Acceptance Criteria
- `AC-001`: The artifact area behavior is explicitly modeled as “all files/outputs touched in this run.”
- `AC-002`: `write_file` entries appear immediately once the file path is known.
- `AC-003`: `edit_file` entries appear immediately once the file path is known.
- `AC-004`: Generated image/video/audio/pdf/csv/excel outputs appear in the same artifact area.
- `AC-005`: Clicking a text/code touched-file entry shows the full current file content.
- `AC-006`: `write_file` retains streamed preview UX before final file-backed content is shown.
- `AC-007`: `edit_file` does not require diff rendering in the artifact area.
- `AC-008`: Failed/denied touched-file operations remain visible with an explicit failed state during the live run.
- `AC-009`: The live touched-files UX functions without calling the backend persisted-artifact GraphQL query.
- `AC-010`: The current backend artifact persistence/query path is removed or otherwise no longer part of the live touched-files design for this ticket.
- `AC-011`: Assets and files remain grouped/browsable in the artifact area.
- `AC-012`: Selection/discoverability behavior no longer privileges only streaming `write_file` entries.

## Constraints / Dependencies
- Current frontend touched-file behavior is implemented in `autobyteus-web/services/agentStreaming`, `autobyteus-web/stores/agentArtifactsStore.ts`, and artifact UI components.
- Current backend artifact persistence lives in `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts`, `src/agent-artifacts/**`, and `src/api/graphql/types/agent-artifact.ts`.
- Workspace/file fetching is already the effective source of truth for persisted text/code artifact viewing.
- Any removal/simplification must preserve current live run UX for `write_file`, `edit_file`, and generated outputs.

## Assumptions
- The current product priority is live run inspection, not persisted history restore.
- Future history reconstruction can be designed later from raw traces/tool calls if needed.
- Keeping the tab label `Artifacts` for now is acceptable if behavior changes to touched files underneath.

## Open Questions / Risks
- If `edit_file` entries appear before execution success, users may briefly see pre-edit content until the underlying file changes; this is acceptable if status semantics stay clear.
- Failure-state semantics need to remain understandable when the visible file content is the current workspace content rather than a failed patch preview.
- Removing backend persistence must not accidentally break any hidden server test/setup dependency that was not part of the live frontend call path.

## Requirement-To-Use-Case Coverage

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Artifact area is the live touched-files projection for the run. | AC-001, AC-011 | Touched-files semantics + files/assets browsing preserved | UC-001, UC-002, UC-003, UC-006 |
| R-002 | `write_file` creates immediate, inspectable touched-file entries. | AC-002, AC-006 | Immediate entry + retained streaming preview | UC-001 |
| R-003 | `edit_file` creates immediate, inspectable touched-file entries. | AC-003, AC-007 | Immediate entry + no diff requirement | UC-002 |
| R-004 | Generated outputs appear in the artifact area. | AC-004, AC-011 | Asset/document visibility + browsing | UC-003 |
| R-005 | Text/code touched-file entries show full current file content. | AC-005 | Full file content viewing | UC-004 |
| R-006 | `write_file` keeps live streamed preview UX. | AC-006 | Streamed preview retained | UC-001 |
| R-007 | `edit_file` artifact-area diff rendering is not required. | AC-007 | No deep diff requirement | UC-002, UC-004 |
| R-008 | Failed/denied touched-file operations remain visible with clear failed state. | AC-008 | Failure visibility retained | UC-005 |
| R-009 | Live touched-files UX does not depend on persisted artifact reads. | AC-009 | No GraphQL persisted-artifact query in live UX | UC-006 |
| R-010 | Unused backend artifact persistence/query path is removed or deactivated. | AC-010 | Persistence/query path removed from this scope | UC-006 |
| R-011 | Assets/files grouping remains usable. | AC-011 | Browsable grouping preserved | UC-003 |
| R-012 | Selection/discoverability no longer depends only on streaming state. | AC-012 | `edit_file` / assets become equally discoverable | UC-001, UC-002, UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Active run produces a unified touched-files list instead of a persistence-driven artifact subset. |
| AC-002 | User sees a newly written file in the artifact area as soon as the write starts. |
| AC-003 | User sees an edited file in the artifact area as soon as the edit starts. |
| AC-004 | User sees generated assets/documents in the same artifact area without a separate product concept. |
| AC-005 | User clicks a touched text/code file and sees the file’s full current content. |
| AC-006 | User can monitor `write_file` progress with live content before final completion. |
| AC-007 | User is not forced into a patch/diff view for `edit_file`. |
| AC-008 | User can still understand attempted-but-failed file touches from the artifact area. |
| AC-009 | Live artifact/touched-files UX still works even if persisted artifact query path is gone. |
| AC-010 | Server artifact persistence/query complexity is not retained without current product value. |
| AC-011 | Files and assets remain easy to browse in the panel. |
| AC-012 | Newly touched non-streaming entries are as easy to notice/select as streaming ones. |
