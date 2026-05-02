# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

After the desktop/server application is shut down and restarted, historical or resumed runs must preserve the same tool-call visibility contract as live streaming: tool invocations that appear in the right-side Activity panel must also appear in the middle transcript trace, and both surfaces must share the same invocation identity, tool name, arguments, result, and status progression semantics.

The user observed a restarted session where the right-side Activity panel showed `generate_image` entries, but those entries had no `Arguments` section and the middle transcript did not show the corresponding `generate_image` tool-call card. This suggests the live-stream segment/activity synchronization fix is incomplete for persisted/reloaded run state.

## Investigation Findings

Investigation found two related issues: (1) active run/team reopen paths can hydrate Activity from persisted projection while preserving an existing live transcript conversation, so the right panel can show projected tool calls that the middle transcript did not reconcile; and (2) the observed `generate_image` / `generate_speech` / Codex MCP rows have empty `tool_args` in the persisted raw trace itself, so Activity and historical conversation projection have no arguments to display after reload.


Real Codex E2E confirmation:

- A real Codex websocket E2E for the MCP `speak` tool, with `CODEX_THREAD_RAW_EVENT_LOG_DIR` enabled, confirmed that live `SEGMENT_START` carries arguments while persisted `raw_traces.jsonl` stores `tool_args: {}` and `getRunProjection` returns empty Activity/conversation args.
- A real Codex `generate_image` probe confirmed the same source-loss pattern for the user-named tool: Codex raw `item/started` includes `output_file_path` and `prompt`, but AutoByteus persisted `tool_call` and `tool_result` rows with `tool_args: {}`.
- Therefore the primary confirmed defect is not that Codex omits arguments; AutoByteus drops them between live item/segment events and memory/history persistence.

Known context from the previous merged ticket:

- Live streaming now has a shared segment/lifecycle Activity projection path.
- `SEGMENT_START` should create the middle tool card and seed right-side Activity.
- `TOOL_*` lifecycle events should update status/result/logs and hydrate details without duplicating entries.
- The new symptom occurs after shutdown/restart and may involve reconstruction from raw traces, working context snapshots, run history, or persisted Activity projection rather than fresh live websocket delivery.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue for frontend restart/reconnect projection reconciliation; separate source-capture defect for missing `generate_image` arguments.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now; Codex MCP tool-start conversion must emit a canonical lifecycle-start event with arguments for persistence, and reload/reconnect must keep transcript and Activity projection application synchronized.
- Evidence basis: User screenshots, frontend run-open/recovery code, backend projection transformers, local `$HOME/.autobyteus` raw traces showing `generate_image.tool_args = {}`, focused converter/memory probe, and real Codex E2E probes with raw Codex event logging enabled.
- Requirement or scope impact: The previous live-stream-only contract may need to be extended to historical/restarted run hydration.

## Recommendations

1. Bootstrap a new ticket from `origin/personal` because the previous ticket is finalized/merged.
2. Investigate the persisted run data model and reload path for both middle transcript and Activity.
3. Compare live normalized events with persisted raw traces/snapshots for the failing run.
4. Define a single replay/hydration invariant: persisted tool calls must reconstruct both transcript tool segments and Activity entries from the same canonical event facts.
5. Only implement after the reload ownership boundary is understood.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium until investigation proves otherwise. The symptom crosses backend persistence, frontend hydration, middle transcript state, and Activity state.

## In-Scope Use Cases

- UC-001: A run invokes `generate_image` live; after app/server restart, the middle transcript still shows the `generate_image` tool card and Activity shows the same invocation with arguments and result.
- UC-002: A run invokes fixed and dynamic tools (`run_bash`, `generate_image`, MCP/browser/configured tools); after restart, transcript and Activity are synchronized by invocation identity.
- UC-003: A currently running run reconnects after restart; historical tool calls are restored and new live tool calls continue to append/update correctly without duplicates.

## Out of Scope

- Changing the visual design of the middle trace cards or Activity cards.
- Reworking the tool execution backend itself beyond Codex event conversion/persistence mapping required to preserve canonical tool-call arguments.
- Reopening the already finalized `search_web`-specific lifecycle mapping except as context.

## Functional Requirements

- REQ-001: On app/server restart and run reload, tool invocations with persisted canonical event data must reconstruct the same middle transcript tool segments that live streaming would have shown.
- REQ-002: On app/server restart and run reload, Activity entries for those tool invocations must include persisted or reconstructable arguments and result/error details when available.
- REQ-003: Reloaded transcript and Activity entries must dedupe by the same invocation identity/alias rules used in live streaming.
- REQ-004: Reload/historical projection must not create Activity-only tool entries when enough persisted data exists to create a middle transcript tool segment.
- REQ-005: Reload/historical projection must preserve terminal statuses and must not regress running/terminal state when live reconnect events arrive later.
- REQ-006: Validation must include deterministic persisted/reload projection coverage using a Codex MCP/dynamic tool with arguments and result/error, and must prove both raw traces and `getRunProjection` retain those arguments.
- REQ-007: Codex MCP/dynamic tool starts must be persisted as canonical `tool_call` raw traces at start time, not only synthesized from terminal lifecycle events.

## Acceptance Criteria

- AC-001: Given persisted trace data for a `generate_image` invocation with arguments and result, loading the run after restart produces one middle transcript tool card and one Activity entry for the same invocation.
- AC-002: The Activity entry in AC-001 exposes the invocation arguments and result/error detail sections.
- AC-003: Given persisted trace data for a fixed tool like `run_bash`, reloaded transcript and Activity remain synchronized and do not duplicate when live reconnect resumes.
- AC-004: Given missing or partial persisted arguments, the UI should display the best available canonical data and investigation should identify whether the loss occurred at capture, persistence, or hydration.
- AC-005: Existing live-stream segment-first Activity behavior remains unchanged.
- AC-006: A real or integration-level Codex MCP tool-call validation shows live `SEGMENT_START` args, persisted `tool_call.toolArgs`, persisted `tool_result.toolArgs`, projection Activity `arguments`, and projection conversation `toolArgs` all match for the same invocation id.

## Constraints / Dependencies

- Must use the current `personal` branch state because the prior ticket is merged.
- Must respect the existing live-stream projection contract from the previous ticket.
- Must not introduce a second divergent Activity projection policy if the same shared projection can be reused for replay/hydration.

## Assumptions

- The failing screenshot is from a team/member run after app/server restart.
- The relevant persisted data exists under `$HOME/.autobyteus/server-data/memory` or equivalent local storage.
- `generate_image` is a normal dynamic/configured tool invocation and should be represented like other tool calls.

## Risks / Open Questions

- Is the middle transcript reconstructed from `working_context_snapshot`, raw traces, database state, or a frontend cache?
- Is Activity reconstructed from a different source than the middle transcript?
- Are `generate_image` arguments missing from persisted raw traces, or only dropped during reload projection? Answered: missing in persisted raw traces; Codex raw events and live segment metadata do contain them.
- Does the issue reproduce only for team runs/member focus after restart?

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-003
- REQ-002 -> UC-001, UC-002
- REQ-003 -> UC-002, UC-003
- REQ-004 -> UC-001
- REQ-005 -> UC-003
- REQ-006 -> UC-001, UC-002
- REQ-007 -> UC-001, UC-002, UC-003

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> Main user screenshot regression: Activity-only `generate_image` after restart.
- AC-002 -> Missing arguments/result detail in right Activity.
- AC-003 -> Reconnect safety and no duplicate/reordered history.
- AC-004 -> Diagnoses source-of-truth loss vs projection loss.
- AC-005 -> Protects previous finalized ticket behavior.
- AC-006 -> Real Codex MCP/live-to-history argument persistence regression.

## Approval Status

Approved by user after real Codex E2E/generate_image proof. Ready for architecture review.
