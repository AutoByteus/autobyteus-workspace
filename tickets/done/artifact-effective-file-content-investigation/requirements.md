# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Redefine the Artifacts area as one unified run-scoped touched-file/output surface for everything the run effectively creates or changes, including text files, edited files, images, audio, video, PDF, CSV, and Excel outputs. The source of truth for viewed content should be the current filesystem content, not persisted snapshot content inside a run-memory JSON record.

## Investigation Findings
- In the current codebase, **artifact** means a broad file-like output category, not only plain text files. The frontend `AgentArtifact` type already covers `file`, `image`, `audio`, `video`, `pdf`, `csv`, `excel`, and `other`.
- The current implementation is split into two ownership paths:
  - `write_file` / `edit_file` use the backend `run-file-changes` projection path.
  - generated media/document outputs use a separate artifact path backed by copied media-storage URLs.
- The current `run-file-changes` record stores inline text `content`, and the REST route serves that stored snapshot instead of re-reading the filesystem on every request.
- The current generated-media path relies on `MediaToolResultUrlTransformerProcessor`, which copies/stores media into app media storage and injects `output_file_url` before `AgentArtifactEventProcessor` emits the artifact event.
- The current generated-media path is not aligned with the desired product meaning, because it treats media outputs as copied artifact URLs rather than as run-scoped current files/outputs.
- The current per-run memory layout is mostly flat, so `run-file-changes/projection.json` is a weak and overly abstract storage name for a single run-level index file.
- The user clarified that historical snapshot fidelity is not required here; the desired behavior is to show the **current** file content, and Git/history should remain the tool for historical diffs/content.

## Locked Decisions
- The UI label **Artifacts** may remain, but the underlying implementation should become one unified touched-file/output model.
- `file_changes.json` is the canonical persisted filename for this feature.
- `FILE_CHANGE_UPDATED` remains the canonical live event name for this ticket, even though it now covers generated outputs too.
- Canonical effective-path identity is required: workspace-internal absolute paths and workspace-relative paths for the same file must collapse to one persisted/displayed path identity.
- The redesign must support both workspace-relative paths and absolute output paths that were actually produced by the run and indexed in the run-scoped metadata.
- Generated-output discovery cannot assume `TOOL_EXECUTION_SUCCEEDED` carries arguments; the unified owner must recover output-path data from invocation-scoped tool context when success payloads omit it.
- No production compatibility path may remain for legacy `run-file-changes/projection.json`; `file_changes.json` is the only supported persisted source after this redesign.
- Conversation/media-segment rendering owned by `MediaUrlTransformerProcessor` is out of scope and must keep working independently of the Artifacts redesign.

## Recommendations
- Unify text file changes and media/document outputs under one run-scoped touched-file/output model.
- Remove separate artifact-event ownership for the Artifacts area and replace it with the unified file-change event/store path.
- Remove persisted inline file `content` from the run-memory JSON file.
- Persist only a run-scoped index/metadata file for touched paths/outputs.
- Resolve content on demand from the current filesystem through a backend run-scoped file-serving boundary, not from stored JSON snapshots.
- Keep `write_file` streaming delta behavior only as a live transient UX, not as persisted content storage.
- Flatten storage from `run-file-changes/projection.json` to `<run-memory-dir>/file_changes.json`.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- `UC-001`: During a live run, `write_file` immediately appears in the Artifacts area and supports streaming preview while content is being written.
- `UC-002`: During a live run, `edit_file` immediately appears in the Artifacts area and later resolves to the current file content.
- `UC-003`: Generated image/audio/video/pdf/csv/excel outputs appear in the same Artifacts area as touched outputs/files.
- `UC-004`: After server restart and reopen, the user can click a touched/output file row and see the current filesystem-backed content if the file still exists.
- `UC-005`: The Artifacts area uses one unified row model keyed by effective output path rather than separate text-file vs generated-media ownership models.
- `UC-006`: Historical exact content snapshots are not required; current file content is the intended source of truth.
- `UC-007`: Live update delivery for touched/output files uses one unified event family rather than separate file-change events and artifact events.
- `UC-008`: Runs stored only in the removed legacy projection path do not hydrate artifact rows after the clean cut to `file_changes.json`.

## Out of Scope
- Preserving historical exact file content as an artifact-area feature.
- Replacing Git as the source of file history/diff inspection.
- Designing a new historical snapshot subsystem.
- Deep diff/patch rendering for `edit_file` in the Artifacts area.
- Preserving or emulating old historical runs that only have `run-file-changes/projection.json`.
- Building a legacy migration/compatibility subsystem for the removed projection path.
- Changing assistant-message media segment behavior handled by `MediaUrlTransformerProcessor`.

## Functional Requirements
- `requirement_id: R-001` — The Artifacts area must use one unified run-scoped touched-file/output model for text files, edited files, and generated media/document outputs.
- `requirement_id: R-002` — The unified row model must be keyed by effective path/output identity for the run and support one visible row per effective output path.
- `requirement_id: R-003` — Persisted run-memory state for touched/output files must store metadata/index information only and must not persist inline file `content` snapshots.
- `requirement_id: R-004` — When the user opens a touched/output file row outside live streaming preview, the backend must resolve content from the current filesystem or equivalent current file-serving boundary rather than from stored JSON content.
- `requirement_id: R-005` — Live `write_file` streaming preview must remain supported through transient delta buffering during the active run.
- `requirement_id: R-006` — `edit_file` does not require persisted patch/diff content for artifact viewing; its viewed content should be the current file content.
- `requirement_id: R-007` — Generated image/audio/video/pdf/csv/excel outputs must use the same unified touched-file/output model rather than a separate copied-media artifact ownership path.
- `requirement_id: R-008` — After server restart and run reopen, the Artifacts area must still list touched/output file rows from persisted run metadata/index and must attempt to resolve current content from the current filesystem when clicked.
- `requirement_id: R-009` — If a touched/output file no longer exists after reopen, the viewer must fail clearly with a missing-file state rather than pretending historical content still exists.
- `requirement_id: R-010` — Run-memory storage naming for this feature must be concrete and domain-descriptive rather than abstract names like `projection.json`.
- `requirement_id: R-011` — The run-memory file for touched/output metadata should live directly in the run memory directory unless a stronger structural reason for a subfolder remains after redesign.
- `requirement_id: R-012` — The unified model must support media/document preview by current file-serving URL/path resolution, not only pre-generated copied media URLs.
- `requirement_id: R-013` — Separate `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` ownership for the Artifacts area must be removed or absorbed into the unified file-change path so frontend artifact viewing no longer depends on a second event/store model.
- `requirement_id: R-014` — The frontend artifact/touched-output UI should no longer require a separate generated-output store path when the underlying subject is still a touched/output file for the run.
- `requirement_id: R-015` — No runtime fallback, hydration fallback, or REST compatibility behavior may remain for legacy `run-file-changes/projection.json`; only `file_changes.json` is supported after the redesign.

## Acceptance Criteria
- `acceptance_criteria_id: AC-001` — One touched/output row model is used for `write_file`, `edit_file`, and generated media/document outputs in the Artifacts area.
- `acceptance_criteria_id: AC-002` — The persisted run-memory JSON for this feature no longer contains inline text `content` snapshots.
- `acceptance_criteria_id: AC-003` — Clicking a non-streaming text/code touched row reads the current file content from the current server/file boundary rather than returning stored JSON text.
- `acceptance_criteria_id: AC-004` — Clicking an image/audio/video/pdf/csv/excel touched row resolves its preview from the current file-serving path/boundary rather than depending on a copied media-storage URL.
- `acceptance_criteria_id: AC-005` — Live `write_file` still shows buffered content during streaming before final filesystem-backed viewing takes over.
- `acceptance_criteria_id: AC-006` — After server restart and reopen, touched/output rows can still be listed from persisted metadata/index and current content is shown when the underlying file still exists.
- `acceptance_criteria_id: AC-007` — After server restart and reopen, missing files show an explicit missing/deleted state instead of stale historical content.
- `acceptance_criteria_id: AC-008` — Storage naming uses `file_changes.json` rather than `projection.json`.
- `acceptance_criteria_id: AC-009` — Generated media outputs no longer require a separate ownership model from touched/output files.
- `acceptance_criteria_id: AC-010` — The live touched/output pipeline no longer requires separate artifact events for generated outputs when the unified file-change path is active.
- `acceptance_criteria_id: AC-011` — The frontend no longer needs a separate generated-output artifact store path for run-touched/output files.
- `acceptance_criteria_id: AC-012` — When only legacy `run-file-changes/projection.json` exists, the system does not hydrate artifact rows from it and exposes only `file_changes.json`-backed history.

## Constraints / Dependencies
- The current codebase already persists per-run metadata including `workspaceRootPath` and `memoryDir`, which can support reopen-time current file resolution.
- The current frontend Artifacts tab is a composite of `runFileChangesStore` and `agentArtifactsStore`; redesign will collapse this split.
- The current media pipeline depends on `MediaToolResultUrlTransformerProcessor` and `AgentArtifactEventProcessor`; redesign must remove or absorb those artifact-area responsibilities without breaking unrelated conversation media-segment rendering.
- The solution must preserve live streaming usability for `write_file` without reintroducing persisted content snapshots.
- The current route `/runs/:runId/file-change-content` and store/service class names may remain during the first unification iteration if that materially reduces churn; the product requirement is semantic unification, not mandatory symbol renaming.
- Existing historical runs stored only under the removed legacy projection path are intentionally unsupported after the clean cut.

## Assumptions
- The desired product semantics are “show the current file/output content” rather than “preserve exact historical content at the time of the run.”
- Git or other source-control tools remain the right place for historical diffs/content concerns.
- For reopen, showing current content is acceptable even if it has changed since the run.
- If a file is deleted or moved after the run, showing a missing-file state is acceptable.
- Absolute output paths produced by tools are acceptable to serve back only when they were actually indexed by the run metadata.
- Dropping in-code legacy compatibility for `run-file-changes/projection.json` is acceptable even if some old runs no longer hydrate artifact rows.

## Risks / Open Questions
- Live rows that were persisted in `streaming` / `pending` before a crash may become stale after restart; the file-serving route must prefer actual file existence over stale status alone.
- Removing tool-result media URL transformation must not unintentionally affect any non-artifact consumer that relied on `output_file_url`; current code search suggests no active runtime consumer beyond artifact processing, but this needs verification during implementation.
- Legacy `ARTIFACT_*` transport enums and handlers may need a short deprecation window even after the Artifacts area stops depending on them.
- Clean-cut removal of legacy projection fallback means older runs stored only in the removed format will appear to have no artifact rows unless migrated out of band.

## Requirement-To-Use-Case Coverage
- `R-001` -> `UC-001`, `UC-002`, `UC-003`, `UC-005`
- `R-002` -> `UC-005`
- `R-003` -> `UC-004`, `UC-006`
- `R-004` -> `UC-002`, `UC-004`, `UC-006`
- `R-005` -> `UC-001`
- `R-006` -> `UC-002`
- `R-007` -> `UC-003`, `UC-005`
- `R-008` -> `UC-004`
- `R-009` -> `UC-004`
- `R-010` -> `UC-005`
- `R-011` -> `UC-005`
- `R-012` -> `UC-003`, `UC-004`
- `R-013` -> `UC-007`
- `R-014` -> `UC-005`, `UC-007`
- `R-015` -> `UC-008`

## Acceptance-Criteria-To-Scenario Intent
- `AC-001` -> User experiences one consistent artifact/touched-output model.
- `AC-002` -> Run-memory storage becomes metadata-only rather than payload snapshot storage.
- `AC-003` -> Text file views reflect the current filesystem.
- `AC-004` -> Media/doc previews also reflect the current filesystem/file-serving path.
- `AC-005` -> Live streamed writing UX is preserved.
- `AC-006` -> Reopen after restart still works using persisted path/index metadata.
- `AC-007` -> Missing files fail honestly rather than showing stale content.
- `AC-008` -> Storage naming becomes concrete and understandable.
- `AC-009` -> Media no longer lives in a separate artifact concept.
- `AC-010` -> Generated outputs no longer depend on a second event family.
- `AC-011` -> Frontend store ownership becomes unified too.
- `AC-012` -> Legacy projection-only runs are intentionally unsupported after the clean cut.

## Approval Status
Approved by user on 2026-04-11 as locked design input. Clarified after architect review round 1 on 2026-04-11 with no scope expansion, then corrected after API/E2E validation round 2 on 2026-04-11: no legacy compatibility may remain for `run-file-changes/projection.json`.
