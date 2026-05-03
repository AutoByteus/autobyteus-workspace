# Validation Follow-up: Codex Duplicate Pending `FILE_CHANGE`

## Trigger

User asked whether the live Codex app-server observation below should be treated as a bug and routed for design review.

## Observation

Round 3 live Codex CLI/app-server validation exercised a real `edit_file` turn. The normalized stream emitted three `FILE_CHANGE` events for the same path/source invocation:

1. `pending`
2. duplicate idempotent `pending`
3. `available`

Evidence:

- Event summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/done/claude-read-artifacts/validation/live-runtime/live-runtime-event-summary.json`
- Codex live log: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/done/claude-read-artifacts/validation/live-runtime/logs/codex-live-filechange.log`
- Codex event log: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/done/claude-read-artifacts/validation/live-runtime/events/codex/codex-backend-edit-file.json`

## Current Impact Assessment

- No duplicate terminal `available` event was observed.
- The duplicate interim events are same path/source/status and are idempotent.
- The final projection remains a single file-change row; no artifact duplication was observed.
- Tool lifecycle events remained visible.

## Requirements / Design Reading

- `AC-004` requires Codex file-change/edit-file behavior to create `FILE_CHANGE` and preserve Codex activity rendering.
- `AC-004` does not explicitly require exactly one interim `pending` update.
- `AC-002` explicitly says Claude mutation emits exactly one terminal `FILE_CHANGE` plus any streaming/pending updates if normalized base events carry streaming content.
- The phrase “one first-class normalized `FILE_CHANGE` event” in the requirements primarily rejects the old two-event naming/compatibility split, but it can be read ambiguously if interpreted as exactly one event occurrence per operation.

## Classification

Resolved: Not a product bug; accepted idempotent interim stream behavior.

The current validation result can remain pass if idempotent duplicate interim updates are an acceptable stream characteristic. If the intended contract is exactly one interim `pending` event per file-impacting Codex operation, this should be captured as a design/requirement refinement and then routed to implementation to add suppression/deduplication at the processor or dispatch boundary.

## Question For Solution Designer

Should the normalized event stream contract permit duplicate idempotent interim `FILE_CHANGE` updates for the same path/source invocation, or should it require at most one `pending` update before the terminal `available` update?



## Solution Design Resolution

The normalized stream contract permits duplicate identical interim `FILE_CHANGE` updates for the same run/path/source invocation. `FILE_CHANGE` is one public event type, not an exact-one event occurrence guarantee.

The accepted contract is:

- interim `streaming`/`pending` updates are state updates and may be repeated idempotently;
- terminal `available`/`failed` state and final projection identity are the correctness criteria;
- `RunFileChangeService` and frontend stores must upsert by canonical identity and must not create duplicate Artifacts rows;
- validation should not require exactly one interim `pending` update;
- duplicate interim updates become a bug only if they create visible duplicate rows, stale final state, non-idempotent content changes, or material performance issues.

Therefore the Round 3 Codex observation (`pending`, duplicate `pending`, `available`) is a pass-with-observation, not an implementation rework trigger.
