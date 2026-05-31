# Design-Impact Resolution: Stable Compaction Operation Identity

## Status

- Status: Ready for architecture review reroute
- Owner: solution_designer
- Date: 2026-05-31
- Triggering validation: CUI-E2E-009, API/E2E Round 2, `Fail / Design Impact`

## Trigger

API/E2E validation exercised the ticket in a real browser against the local AutoByteus native runtime and LM Studio model `qwen3.6-27b:lmstudio@127.0.0.1:1234` with lowered compaction thresholds. The validation proved the original design and implementation shape allowed one deferred semantic compaction lifecycle to fan out into multiple Activity rows.

Evidence package:

- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/validation-report.md`
- Browser finding summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/browser-compaction-finding.md`
- Backend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/backend-live.log`
- Screenshots:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/05-queued-activity-row.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/06-compacting-duplicate-row.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/07-final-duplicate-failed-rows.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/08-user-observed-duplicate-rows.png`

## Observed Runtime Behavior

The browser validation observed one semantic compaction lifecycle split across turns:

1. `turn_0002` crossed the threshold and backend emitted compaction phase `requested`; UI rendered `Compaction queued` / `QUEUED` / `Turn: turn_0002`.
2. `turn_0003` executed pending compaction and backend emitted phase `started`; UI rendered a second row, `Compacting memory…` / `COMPACTING` / `Turn: turn_0003`.
3. The compactor timed out after 120 seconds and backend emitted phase `failed`; UI rendered a third compaction row for the failed phase.

This is one deferred semantic compaction operation, not three independent activities.

## Root Cause Classification

- Classification: Boundary / ownership issue plus shared identity-shape looseness.
- Design issue: the AutoByteus semantic compaction lifecycle did not have one authoritative parent operation identity spanning scheduling, execution, and terminal status.
- Symptom: frontend projection fell back to per-phase identities (`turn_id`, then child `compaction_run_id` / `compaction_task_id`) and therefore created multiple activity rows.
- Required design response: introduce a backend-owned parent compaction operation identity and make Activity projection update one row by that identity.

## Design Decision

AutoByteus deferred semantic compaction now has a stable parent identity:

- Name: `compaction_operation_id`
- Conceptual type: `CompactionOperationId`
- Scope: opaque, run-local identity for one AutoByteus semantic compaction operation
- Owner: backend/runtime pending compaction state, centered on `MemoryManager` and the pending compaction executor path
- Lifecycle: created when `requestCompaction()` first transitions to pending; reused while the request remains pending or active; emitted on `requested`, `started`, `completed`, and `failed`; cleared only when pending compaction is successfully completed/cleared; preserved across failure while the pending compaction gate remains active

Identity semantics:

- `compaction_operation_id` is the parent Activity row identity for AutoByteus semantic compaction.
- `turn_id` remains event/current-turn metadata, not parent identity.
- `requested_turn_id` and `execution_turn_id` may be carried where useful to show lifecycle context without fragmenting rows.
- `compaction_run_id` and `compaction_task_id` are child compactor execution metadata. They enrich the existing row but must not replace the parent identity.
- Provider-native compaction identity remains separate and may continue using provider boundary / operation identities when those events are not AutoByteus semantic compaction lifecycle events.

## Requirements Updated

The requirements document now includes:

- `REQ-CUI-013`: one AutoByteus deferred semantic compaction lifecycle must update one compaction activity row from queued/requested through compacting/started to terminal completed/failed, even when request and execution turns differ.
- `REQ-CUI-014`: child `compaction_run_id` and `compaction_task_id` must not replace the parent compaction activity identity.
- `AC-CUI-013`: live native-runtime requested-on-`turn_N`, started/terminal-on-`turn_N+1` flow must show one updating row/card.
- `AC-CUI-014`: terminal child metadata must enrich the existing queued/active row rather than creating a child-keyed row.

Updated file:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/requirements.md`

## Design Spec Updated

The design spec now adds `DS-CUI-006`, the stable deferred semantic compaction identity spine:

`Token threshold crossed -> MemoryManager.requestCompaction creates/returns CompactionOperationId -> requested status with operation id -> PendingCompactionExecutor executes same pending operation on later turn -> started/completed/failed status with same operation id + child compactor metadata -> one activity row updates in place`

The design spec also now requires:

1. Backend/runtime pending compaction state owns `compaction_operation_id` creation and retention.
2. Compaction status payloads include `compaction_operation_id` for AutoByteus semantic compaction.
3. Frontend projection identity precedence uses semantic `compaction_operation_id` first.
4. Active semantic lifecycle reuse is permitted only as defensive handling for old/incomplete events, not as the authoritative model.
5. Provider-native compaction boundary identity stays separate.
6. `compaction_run_id` / `compaction_task_id` are terminal child metadata, never the parent row identity for semantic compaction.
7. `turn_id` is not a parent identity for deferred semantic compaction.

Updated file:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row/design-spec.md`

## Implementation Guidance

Backend/runtime:

- Extend pending compaction state so `MemoryManager.requestCompaction()` creates or returns the existing pending `compaction_operation_id`.
- Ensure repeated threshold evaluation while a request is pending reuses the same operation id.
- Carry the same operation id into status events emitted by both the request/evaluation path and `PendingCompactionExecutor`.
- Clear the id only when the semantic compaction request is successfully cleared; preserve it on failure while the pending gate still blocks/retains compaction state.

Frontend projection/store:

- Resolve semantic compaction `activityId` by `compaction_operation_id`.
- Do not switch an existing queued/active semantic row to a later `compaction_run_id`, `compaction_task_id`, or execution `turn_id`.
- Store child run/task ids as metadata on the same compaction activity row.
- Keep compaction rows typed as non-tool Activity entries in the existing Activity area/feed.

Validation:

- Add/adjust tests so the native deferred flow `requested(turn_N) -> started(turn_N+1) -> failed/completed(turn_N+1)` produces exactly one Activity row whose phase/status/title updates in place.
- Keep existing provider-native compaction tests intact or update them only to preserve their separate identity semantics.

## Reviewer Focus

Architecture review should verify:

1. The backend owner for `compaction_operation_id` is the correct authoritative boundary.
2. The interface shape avoids mixed parent/child identities.
3. The frontend projection no longer has to infer one operation from unrelated turn/task ids.
4. The design still satisfies the original user-visible requirement: compaction appears in-flow in the event monitor and inside the existing Activity area as a non-tool activity, without a separate compaction-only section.
