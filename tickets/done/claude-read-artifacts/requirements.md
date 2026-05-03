# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — user direction incorporated on 2026-05-03; awaiting user review of the revised design before downstream handoff.

## Goal / Problem Statement

Fix the bug where Claude Code Agent SDK read-only `Read` tool events appear as right-side `Artifacts` entries, and replace the root architecture that made the bug possible. A read-only path must stay an activity/tool event only. A file-impacting operation must emit the single public normalized file-change event type, `FILE_CHANGE`, through the same normalized event pipeline used by Codex, Claude Agent SDK, and AutoByteus runtime events. `FILE_CHANGE` is a state-update event type; one operation may produce multiple lifecycle update occurrences such as `streaming`, `pending`, and terminal `available`/`failed`.

The target design must not keep `FILE_CHANGE_UPDATED` compatibility or a two-event `FILE_CHANGE_OBSERVED` / `FILE_CHANGE_UPDATED` split. The normalized event name should be simply `FILE_CHANGE`.

## Investigation Findings

- The right-side `Artifacts` tab is backed by `runFileChangesStore`, which is currently fed by backend `FILE_CHANGE_UPDATED` events and historical `getRunFileChanges(runId)` hydration.
- `RunFileChangeService` is attached to every active `AgentRun` through `AgentRunManager.registerActiveRun(...)` and currently observes broad normalized runtime events.
- Current `FILE_CHANGE_UPDATED` is emitted by `RunFileChangeService.publishEntry(...)`; it is not an upstream normalized event from Claude/Codex/AutoByteus normalizers.
- Claude `Read` events are normalized by `ClaudeSessionEventConverter` into `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` with `tool_name: "Read"` and `arguments.file_path`.
- The current run-file-change derivation path treats non-file tools as possible generated outputs and previously treated `file_path` as an output path, causing `Read({ file_path })` to become `sourceTool: "generated_output"`.
- A focused probe running `ClaudeSessionEventConverter -> RunFileChangeService` reproduced the bug exactly: Claude `Read` emitted one false `FILE_CHANGE_UPDATED` row for the read source file.
- The cleaner architecture identified during user review is a post-normalization event processor chain: runtime-specific normalizers emit base normalized events, processors append derived normalized events, and `RunFileChangeService` consumes only the final `FILE_CHANGE` event for projection/persistence.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + behavior change + architecture refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary or ownership issue; shared structure looseness; missing invariant.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis: The projection service currently derives artifacts from unrelated tool lifecycle events; the helper conflated input paths with output paths; the service both detects and publishes file-change events.
- Requirement or scope impact: The fix must move file-change derivation into an explicit normalized event-processing boundary and make `RunFileChangeService` projection-only.

## Recommendations

- Introduce an ordered `AgentRunEventProcessor` / `AgentRunEventPipeline` boundary after runtime-specific normalization and before event publication.
- Rename the public event from `FILE_CHANGE_UPDATED` to `FILE_CHANGE` with no compatibility alias.
- Add a `FileChangeEventProcessor` that appends `FILE_CHANGE` events only for explicit file-impacting semantics:
  - Claude `Write`, `Edit`, `MultiEdit`, notebook edit variants.
  - Codex normalized file-change/edit-file events.
  - AutoByteus `write_file` / `edit_file` events.
  - `generate_image`, `edit_image`, `generate_speech`, and other approved generated-output tools when they expose explicit output/destination metadata.
- Ensure Claude `Read` never emits `FILE_CHANGE`.
- Make `RunFileChangeService` consume only `FILE_CHANGE`, update/persist the run-scoped projection, and stop emitting file-change events itself.
- Keep future custom derived events possible by registering additional processors in the same ordered pipeline.

## Scope Classification (`Small`/`Medium`/`Large`)

Large enough to require design review: it changes event architecture and removes the old file-change derivation path.

## In-Scope Use Cases

- UC-001: A Claude Code Agent SDK run reads source files using `Read`.
- UC-002: Claude/Codex/AutoByteus runtime events are converted to normalized base events.
- UC-003: Post-normalization processors append derived events, including `FILE_CHANGE`.
- UC-004: The `Artifacts` tab renders only true run-touched/generated files.
- UC-005: Claude file mutations (`Write`, `Edit`, `MultiEdit`, notebook edit variants) create `FILE_CHANGE`.
- UC-006: Codex file-change/edit-file behavior creates `FILE_CHANGE`.
- UC-007: AutoByteus runtime events and the `autobyteus-ts` tool lifecycle for `write_file`, `edit_file`, `generate_image`, `edit_image`, and `generate_speech` create `FILE_CHANGE`.
- UC-008: Future custom event processors can emit additional normalized derived events without changing runtime converter ownership.

## Out of Scope

- Preserving `FILE_CHANGE_UPDATED` as a compatibility alias.
- Introducing both `FILE_CHANGE_OBSERVED` and `FILE_CHANGE_UPDATED`.
- Hiding polluted entries only in the frontend while backend events/persistence remain wrong.
- Changing the visual design of the `Artifacts` tab.
- Migrating already-persisted polluted historical `file_changes.json` rows unless later requested separately.

## Functional Requirements

- REQ-001: Read-only Claude `Read` tool events must not create, emit, persist, or hydrate run-file-change/artifact rows.
- REQ-002: Claude read-file tool/activity events must remain visible as normal activity/tool lifecycle events.
- REQ-003: The normalized event stream must use a single public file-change event named `FILE_CHANGE`.
- REQ-004: `FILE_CHANGE_UPDATED` must be removed/renamed cleanly rather than retained as an alias or compatibility wrapper.
- REQ-005: Runtime-specific normalizers must remain responsible for provider-to-normalized base event conversion.
- REQ-006: A post-normalization `AgentRunEventPipeline` must allow ordered processors to append additional normalized events.
- REQ-007: `FileChangeEventProcessor` must derive `FILE_CHANGE` only from explicit file-impacting semantics, not from generic path-like fields.
- REQ-008: `RunFileChangeService` must consume only `FILE_CHANGE` for live projection/persistence and must no longer inspect arbitrary `TOOL_EXECUTION_*` / `SEGMENT_*` events to infer file changes.
- REQ-009: Generated output tools must create `FILE_CHANGE` only when a known output-capable tool exposes explicit output/destination metadata or result shape. In `autobyteus-ts`, `generate_image`, `edit_image`, and `generate_speech` must be covered because they require `output_file_path` and return `{ file_path: resolvedPath }` after writing the file.
- REQ-010: The event pipeline must support future derived/custom event processors without turning runtime converters, AutoByteus customization processors, or projection services into mixed-concern coordinators.
- REQ-011: Frontend streaming and protocol code must consume `FILE_CHANGE`, not `FILE_CHANGE_UPDATED`.
- REQ-012: Executable validation must cover Claude `Read`, Claude mutation, Codex file change, generated output, and `RunFileChangeService` ignoring unrelated events.
- REQ-013: The `FILE_CHANGE` event stream must be idempotent for interim state updates. Duplicate identical `streaming`/`pending` updates for the same run/path/source invocation are permitted and must not create duplicate Artifacts rows; validation must assert terminal state and projection identity rather than exact interim event counts.

## Acceptance Criteria

- AC-001: Given a Claude `Read` event sequence with `arguments.file_path`, the Claude normalizer emits activity/tool lifecycle events, the event pipeline emits no `FILE_CHANGE`, and the Artifacts projection remains empty.
- AC-002: Given a Claude `Write` event sequence with `arguments.file_path`, the pipeline emits exactly one terminal `FILE_CHANGE` for that path with `sourceTool: "write_file"` after success, plus any streaming/pending `FILE_CHANGE` updates if the normalized base events carry streaming content.
- AC-003: Given a Claude `Edit` / `MultiEdit` / notebook edit event sequence, the pipeline emits `FILE_CHANGE` with `sourceTool: "edit_file"` for the mutation target path.
- AC-004: Given a Codex file-change item normalized as edit-file/tool lifecycle events, the pipeline emits `FILE_CHANGE` and preserves existing Codex activity rendering. Duplicate idempotent interim `pending` updates for the same run/path/source invocation are acceptable if a terminal `available` or `failed` update follows and the final projection remains one row for the path.
- AC-005: Given AutoByteus `write_file` / `edit_file`, the pipeline emits `FILE_CHANGE` without `RunFileChangeService` inspecting raw segment/tool events.
- AC-006: Given `autobyteus-ts` `generate_image`, `edit_image`, or `generate_speech` with explicit `output_file_path` and returned `{ file_path: resolvedPath }`, the runtime/event pipeline emits `FILE_CHANGE` with `sourceTool: "generated_output"`.
- AC-007: Given a non-file tool whose only path-like field is `file_path`, no `FILE_CHANGE` is emitted.
- AC-008: `RunFileChangeService.attachToRun(...)` handles `FILE_CHANGE` only; tests prove unrelated normalized events do not mutate projection or emit secondary file-change events.
- AC-009: No repository runtime/protocol/frontend enum, message type, or handler still uses `FILE_CHANGE_UPDATED` after the clean-cut rename.
- AC-010: A focused automated regression test logs/inspects the base normalized events, derived pipeline events, and final projection for the Claude read pollution scenario.
- AC-011: Given a live/runtime Codex edit-file flow that emits duplicate identical interim `pending` `FILE_CHANGE` updates followed by terminal `available`, validation classifies the flow as passing if the duplicate updates are idempotent, activity events are preserved, and the Artifacts projection has a single row.

## Constraints / Dependencies

- Must work within the existing AgentRun backend subscription and streaming architecture.
- Must preserve user-visible activity/tool events.
- Must keep file-change path/type/persistence semantics centralized enough to avoid divergent frontend/backend representations.
- AutoByteus customization processors must not be used as the server/web `FILE_CHANGE` derivation path in this task; they are AutoByteus-only and do not cover Claude/Codex.
- Must avoid broad path heuristics and frontend-only filtering.
- No backward-compatibility wrapper or dual event names for the in-scope rename.

## Assumptions

- The existing normalized events carry enough tool identity and arguments/result metadata for the file-change processor to classify known file-impacting operations.
- Generated media/audio tools can expose explicit output path metadata; if an integration only returns ambiguous `file_path`, it should be corrected instead of making `file_path` globally artifact-producing.
- The event pipeline can be introduced behind a common boundary used by Claude, Codex, and AutoByteus backend event dispatch.
- Native `autobyteus-ts` `StreamEventType.FILE_CHANGE` is not required for this task because server/web Artifacts can be derived after AutoByteus stream normalization.

## Risks / Open Questions

- Streaming write preview requires either multiple `FILE_CHANGE` events with status/content delta or a terminal-only update. The clean design should prefer `FILE_CHANGE` updates for streaming states rather than letting `RunFileChangeService` inspect `SEGMENT_CONTENT`.
- The current backends do not yet share one central normalized event dispatch helper; implementation must avoid duplicating pipeline wiring across backends.
- Some currently uncommitted implementation files appear to reflect an earlier tactical classifier design; implementation should either replace or remove them under the new processor-chain design.

## Requirement-To-Use-Case Coverage

- REQ-001, REQ-002 cover UC-001, UC-004.
- REQ-003, REQ-004, REQ-011 cover UC-003, UC-004.
- REQ-005, REQ-006, REQ-010 cover UC-002, UC-003, UC-008.
- REQ-007 covers UC-005, UC-006, UC-007.
- REQ-008 covers UC-004.
- REQ-009 covers UC-007.
- REQ-012 covers all in-scope validation paths.
- REQ-013 covers UC-003, UC-004, UC-006, and projection idempotency.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the reported Claude read-only pollution scenario.
- AC-002 through AC-006 protect true file-change/generated-output behavior.
- AC-007 locks the invariant that generic `file_path` is not output evidence.
- AC-008 proves `RunFileChangeService` is projection-only.
- AC-009 proves the clean-cut event rename.
- AC-010 provides reviewer/debug evidence for the event chain.
- AC-011 clarifies that exact-one interim `pending` is not part of the product contract; idempotent duplicate interim updates are acceptable.

## Approval Status

Pending user review of the revised architecture design. The user has explicitly approved the direction of a single `FILE_CHANGE` event plus post-normalization event processors, but asked to review the new design before downstream work proceeds.
