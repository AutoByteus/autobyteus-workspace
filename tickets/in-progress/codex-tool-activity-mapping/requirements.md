# Requirements

## Status
- Refined

## Date
- 2026-02-25

## Goal / Problem Statement
- Ensure Codex runtime tool executions are surfaced through the same canonical tool lifecycle UX as the default runtime.
- Specifically, when Codex performs tool operations (terminal, edit/write, generic tool calls), conversation segments and Activity panel entries must appear and progress through lifecycle states.

## Scope Triage
- Scope: `Medium`
- Rationale:
  - Cross-layer change (backend runtime adapter + frontend stream lifecycle handling + tests).
  - Affects runtime event normalization contracts and UI lifecycle robustness.
  - Requires design artifact and future-state call stack review loops.

## In-Scope Use Cases
- UC-001: Codex emits a tool-like item with canonical/variant item type; UI shows corresponding tool segment and Activity entry.
- UC-002: Codex emits TOOL_* lifecycle events before any tool SEGMENT_START; UI still creates a tool lifecycle anchor and displays progress.
- UC-003: Codex emits TOOL_APPROVAL_REQUESTED/APPROVED/DENIED; lifecycle state is reflected in segment and Activity consistently.
- UC-004: Codex emits TOOL_LOG/TOOL_EXECUTION_SUCCEEDED/TOOL_EXECUTION_FAILED; logs and terminal status are visible in Activity and segment state.
- UC-005: Non-tool events (text/reasoning/user message) remain unchanged and do not create false Activity items.
- UC-006: Codex file-change lifecycle payloads with placeholder-empty explicit args still surface non-empty canonical `edit_file` arguments (`path`, `patch`) by deriving from runtime `changes` data.
- UC-007: Codex command-execution lifecycle payloads surface non-empty canonical `run_bash` `command` arguments/metadata so Activity and segment details are never blank when runtime provided command text.

## Out Of Scope
- Changing Codex App Server protocol itself.
- Introducing runtime-specific frontend rendering branches.
- Reworking team-run tool lifecycle behavior beyond canonical handler reuse.

## Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | Backend adapter must classify Codex tool-like item variants into canonical segment types (`run_bash`, `edit_file`, `tool_call`) rather than fallback `text` when sufficient tool signal exists. | `SEGMENT_START` payload for tool-like Codex items uses canonical tool segment type and metadata. |
| R-002 | Tool lifecycle visibility must be guaranteed even if TOOL_* events arrive without a prior tool `SEGMENT_START`. | Frontend creates a canonical tool lifecycle anchor and Activity entry on first TOOL_* event for unseen invocation id. |
| R-003 | Lifecycle state transitions must remain canonical and monotonic (`parsing/parsed -> awaiting-approval/approved/executing -> success/error/denied`). | Segment status and Activity status stay in sync for approval, execution, success/failure, and denial flows. |
| R-004 | Activity/segment mapping must remain runtime-agnostic in frontend architecture. | No codex-specific branching in UI components; only canonical handler-level logic. |
| R-005 | Regression safety must be enforced with automated tests covering normal and missing-segment-start paths. | Added/updated backend+frontend tests fail before fix and pass after fix. |
| R-006 | Backend adapter must normalize file-change arguments when explicit args are empty placeholders and recover `path`/`patch` from `change`/`file_change`/`changes[]`. | Canonical `TOOL_APPROVAL_REQUESTED`/tool lifecycle payloads for `edit_file` include non-empty path/patch whenever runtime payload carries those values in nested file-change fields. |
| R-007 | Backend adapter must normalize command-execution payloads so canonical `run_bash` metadata/arguments include non-empty `command` when runtime payload includes command text (`payload.command`, `item.command`, or command action variants). | `SEGMENT_START`/`SEGMENT_END` and tool-argument projections for `run_bash` include non-empty `command`, and frontend Activity `run_bash.arguments.command` is populated. |

## Acceptance Criteria
- AC-001 (`R-001`): Given Codex `item/added` with command/file/tool-like item type variants, mapper emits `SEGMENT_START` with canonical tool segment type and non-empty id.
- AC-002 (`R-002`): Given TOOL_EXECUTION_STARTED for unseen invocation id, frontend conversation gains a tool lifecycle segment and Activity feed gains one corresponding activity row.
- AC-003 (`R-003`): Given follow-up TOOL_LOG and TOOL_EXECUTION_SUCCEEDED/FAILED for that invocation, Activity logs/result/error update and status reaches terminal state.
- AC-004 (`R-004`): Frontend views/components remain unchanged except consuming existing canonical segment/activity data.
- AC-005 (`R-005`): Test suites include new assertions for missing-segment-start recovery and tool-type classification variants.
- AC-006 (`R-006`): Given `item/file_change/request_approval` with `arguments: { path: "", patch: "" }` and `item.changes[0]` containing `path` and `diff`, mapper emits canonical payload with `arguments.path=<path>` and `arguments.patch=<diff>`.
- AC-007 (`R-007`): Given `item/added`/`item/completed` command-execution payloads with `item.command=<command>`, mapper emits canonical `run_bash` metadata/arguments with that command and frontend Activity displays non-empty `command`.

## Constraints / Dependencies
- Existing WebSocket protocol message types remain authoritative.
- Existing Activity store contract remains authoritative.
- No backward compatibility layers; clean canonical path only.

## Assumptions
- Codex runtime continues emitting TOOL_* events with at least invocation id and tool name on lifecycle payloads.
- Tool-like item events contain enough semantic hints (item type, method names, command/path/tool fields) to infer canonical segment type.

## Open Questions / Risks
- Some Codex versions may emit previously unseen item type aliases.
- Invocation id correlation may vary by approval mode (`itemId` vs `itemId:approvalId`), requiring resilient matching strategy.
- Codex payload structures for file edits can vary (`change`, `file_change`, `changes[]`), requiring resilient extraction precedence.

## Requirement Coverage Map (Requirement -> Use Cases)

| requirement_id | Covered by use_case_id |
| --- | --- |
| R-001 | UC-001 |
| R-002 | UC-002 |
| R-003 | UC-003, UC-004 |
| R-004 | UC-005 |
| R-005 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| R-006 | UC-006 |
| R-007 | UC-007 |
