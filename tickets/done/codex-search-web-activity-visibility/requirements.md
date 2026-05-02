# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Tool visibility must be consistent between the middle conversation/transcript surface and the right-side Activity panel. When a tool-like card appears in the middle area, the Activity panel must show the same invocation immediately, even if the tool has not finished yet. For Codex built-in `search_web`, the backend must also emit canonical lifecycle events so the Activity entry is updated from running to terminal state.

The refined scope combines two related issues:

1. Codex `webSearch` live events were segment-only and therefore never reached Activity lifecycle handling.
2. The frontend Activity panel currently creates entries only from `TOOL_*` lifecycle messages, so any tool card created first by `SEGMENT_START` is absent from Activity until a later lifecycle/terminal event arrives.

## Investigation Findings

- The middle transcript is driven by `SEGMENT_START`/`SEGMENT_END` messages. Tool-like segments (`tool_call`, `run_bash`, `write_file`, `edit_file`) can appear there before any lifecycle event updates Activity.
- The Activity panel reads `useAgentActivityStore().getActivities(runId)`. Current frontend code populates it from `toolLifecycleHandler.ts`, not from `segmentHandler.ts`.
- Existing tests encode the older behavior: `segmentHandler.spec.ts` says a tool-call segment is created "without creating Activity state", and `toolLifecycleOrdering.spec.ts` expected Codex dynamic/file/search segments to create no Activity until lifecycle events arrive.
- The user clarified that this old invariant is now wrong: when the middle tool card/spinner appears, the right-side Activity area should also show that invocation.
- Codex-specific live logging confirmed raw `webSearch` arrives as `item/started` and `item/completed`. The implemented first-stage fix adds `TOOL_EXECUTION_STARTED`/terminal lifecycle events for `search_web`, but that does not solve the broader UI timing gap for tools whose `SEGMENT_START` precedes lifecycle.
- Backend event logging controls used during investigation:
  - `RUNTIME_RAW_EVENT_DEBUG=1` logs normalized runtime events and mapped websocket messages.
  - `CODEX_THREAD_RAW_EVENT_DEBUG=1` logs raw Codex thread events to console.
  - `CODEX_THREAD_RAW_EVENT_LOG_DIR=/path` writes raw Codex thread events as JSONL.
  - Browser-side streaming logs can be enabled with `localStorage.setItem('autobyteus.debug.streaming', 'true')` or `window.__AUTOBYTEUS_DEBUG_STREAMING__ = true`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/ownership issue from an earlier frontend refactor; Activity creation was made lifecycle-only while the first visible tool invocation boundary can be `SEGMENT_START`.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed Now
- Evidence basis: `segmentHandler.ts` owns creation of the middle tool card but has no Activity projection path; `toolLifecycleHandler.ts` owns Activity projection but may not receive an event until later. Shared Activity upsert/update behavior is currently private inside `toolLifecycleHandler.ts`, so segment handling cannot reuse it without a small ownership extraction.
- Requirement or scope impact: Fix remains in this ticket. Backend Codex `search_web` lifecycle fan-out stays in scope, and frontend Activity projection must be refactored so segment-start and lifecycle events share one deduplicating Activity projection owner.

## Recommendations

1. Keep the Codex backend `webSearch` lifecycle fan-out already implemented in this ticket.
2. Refactor frontend Activity projection into a shared helper/owner used by both `segmentHandler.ts` and `toolLifecycleHandler.ts`.
3. On eligible tool-like `SEGMENT_START`, seed or upsert one Activity entry immediately using the same invocation id and metadata/arguments as the middle segment.
4. Later lifecycle events must update that same Activity entry, not create a duplicate.
5. Remove or update tests that assert segment-start does not create Activity; that assertion is now the regression.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A live Codex run invokes built-in web search; the middle transcript shows `search_web` and the Activity panel shows the same invocation immediately, then terminal status after completion.
- UC-002: A non-Codex/runtime tool such as `generate_speech` appears in the middle transcript from `SEGMENT_START`; the Activity panel shows the same invocation immediately instead of waiting for completion.
- UC-003: Existing lifecycle-first tools (`run_bash`, file changes, MCP/browser/dynamic tools) still create exactly one Activity entry and do not duplicate when segment events arrive later.
- UC-004: Codex event logging or equivalent test-visible capture demonstrates normalized/mapped events include lifecycle for `search_web`.
- UC-005: Historical/reloaded run projections continue to include activities.

## Out of Scope

- Changing tool execution semantics or availability.
- Reworking Activity panel layout or visual styling.
- Creating duplicate Activity entries for both segment and lifecycle surfaces.
- Changing unrelated web search integrations outside the live-stream Activity projection path.

## Functional Requirements

- REQ-001: Codex `webSearch` item start conversion must emit a canonical `TOOL_EXECUTION_STARTED` event with `tool_name: "search_web"`, the web-search invocation id, turn id when available, and search arguments when available.
- REQ-002: Codex `webSearch` item completion conversion must emit a canonical terminal lifecycle event (`TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED`) with the same invocation id and `tool_name: "search_web"`.
- REQ-003: Existing `SEGMENT_START`/`SEGMENT_END` output for Codex `webSearch` must remain intact so the middle transcript keeps rendering the `search_web` card.
- REQ-004: The frontend must seed/upsert an Activity entry when an eligible tool-like `SEGMENT_START` creates or updates a middle tool segment with a valid invocation id and displayable tool identity/metadata.
- REQ-005: Segment-start seeded Activity entries must be deduplicated with later lifecycle events by invocation id/aliases; lifecycle events must update the same entry's status, arguments, result, logs, and error.
- REQ-006: The Activity entry seeded from segment-start must carry the same basic display facts as the middle card: tool name, inferred Activity type, current non-terminal status, context text, and available arguments.
- REQ-007: Existing visible Activity behavior for lifecycle-first tools (`run_bash`, `send_message_to`, file changes, MCP/browser tools) must not regress or duplicate.
- REQ-008: Validation must include focused backend converter tests, frontend segment/lifecycle ordering tests that cover segment-first Activity creation, and either a Codex live E2E/probe or documented event-log capture for `search_web` lifecycle events.

## Acceptance Criteria

- AC-001: Given a Codex `webSearch` `ITEM_STARTED` event, the normalized event stream includes both `SEGMENT_START` and `TOOL_EXECUTION_STARTED` for the same invocation id and `tool_name: "search_web"`.
- AC-002: Given a completed Codex `webSearch` item, the normalized event stream includes `TOOL_EXECUTION_SUCCEEDED` and `SEGMENT_END` for the same invocation id.
- AC-003: Given a failed/errored Codex `webSearch` item, the normalized event stream includes `TOOL_EXECUTION_FAILED` with a non-empty error string and still finalizes the segment.
- AC-004: Given the frontend receives an eligible `SEGMENT_START` for a named tool such as `generate_speech` or `search_web`, `useAgentActivityStore().getActivities(runId)` immediately contains one non-terminal Activity entry for that invocation.
- AC-005: Given `SEGMENT_START` arrives before `TOOL_EXECUTION_STARTED`, the Activity remains a single entry and transitions from the segment-seeded non-terminal status to lifecycle `executing` and then terminal status.
- AC-006: Given `TOOL_EXECUTION_STARTED` arrives before `SEGMENT_START`, the Activity remains a single entry and is hydrated by later segment metadata without status regression.
- AC-007: Existing Codex conversion tests for `run_bash`, `send_message_to`, `fileChange`, MCP, browser dynamic tools, and `search_web` continue to pass.
- AC-008: A Codex E2E/probe with runtime event logging enabled shows `search_web` in mapped lifecycle messages as well as segment messages.

## Constraints / Dependencies

- The Activity panel should not independently parse raw provider/Codex payloads; it should use normalized segment/lifecycle payloads.
- Activity projection must be centralized enough that segment and lifecycle paths share dedupe, argument merge, status transition, and alias handling.
- Live Codex E2E remains gated by `RUN_CODEX_E2E=1` and local Codex availability.
- Runtime event debug flags are environment-based and must not be required for normal operation.
- No backward-compatibility/dual-path duplicate behavior should be introduced; the old segment-start-without-Activity invariant should be removed.

## Assumptions

- Segment ids for tool-like segments are the same stable invocation ids later used by lifecycle events or aliases.
- Tool-like segment metadata contains enough identity (`tool_name`, segment type, command/path/arguments) to display a pending/running Activity entry when the middle card appears.
- The existing Activity item UI already labels `parsing`/`executing` as running, so no visual component styling is required for this behavior.

## Risks / Open Questions

- Some `SEGMENT_START` events may have placeholder or missing tool names. Implementation should avoid noisy blank Activity titles or use a controlled placeholder only where the middle card itself has a displayable identity.
- Segment-start status can be earlier than actual execution. The UI requirement is visibility when the middle card appears; lifecycle events remain authoritative for execution/terminal status.
- Live E2E prompting for built-in web search can be model-dependent; unit and handler coverage should carry the deterministic contract, with live E2E used as supplemental event-path confirmation.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-004
- REQ-002 -> UC-001, UC-004
- REQ-003 -> UC-001
- REQ-004 -> UC-001, UC-002
- REQ-005 -> UC-001, UC-002, UC-003
- REQ-006 -> UC-001, UC-002
- REQ-007 -> UC-003
- REQ-008 -> UC-004, UC-005

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> Converter start fan-out scenario.
- AC-002 -> Converter success completion fan-out scenario.
- AC-003 -> Converter failure completion fan-out scenario.
- AC-004 -> Segment-first Activity visibility scenario requested by the user.
- AC-005 -> Segment-first then lifecycle ordering scenario.
- AC-006 -> Lifecycle-first then segment ordering scenario.
- AC-007 -> Existing tool regression suite scenario.
- AC-008 -> Runtime/E2E event logging scenario requested by the user.

## Approval Status

Initial requirements approved by user on 2026-05-01. Refined segment-first Activity visibility requirement approved by user on 2026-05-01 via clarification: “the right side, i meant the activity area. Basically when the middle[area] appear, the right side should also appear” and “we can continue to fix the problem on this ticket.”
