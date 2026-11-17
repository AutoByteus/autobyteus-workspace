# Design Review Report

Part 1 (the restart reminder) was reviewed in ARCH-REV-001 to ARCH-REV-003 (Pass) and is delivered (DR-001). This report holds the latest complete result: part 2.

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/requirements-doc.md` (Approved; part 2: REQ-006, REQ-007, AC-005, AC-006, DEC-004, DEC-005, the user 2026-11-17)
- Upstream Investigation Notes: `.../background-task-restart-notice/investigation-notes.md`
- Upstream Solution Revision Record: `.../background-task-restart-notice/solution-revision-record.md` (SR-006)
- Reviewed Design Spec: `.../background-task-restart-notice/design-spec.md`, section "Part 2 — Show an agent with a running background task" (SR-005, revised SR-006)
- Supplemental Task Artifacts Reviewed: `architecture-design-handoff.md` ("Round 5 (SR-006)"); none behavior-defining
- Relevant Solution Revision IDs: `SR-005`, `SR-006`
- Architecture Review Revision Record: `.../background-task-restart-notice/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: `5` (part 2, second round)
- Trigger: SR-006 revision for ARCH-REV-004, from the Solution Designer, 2026-11-17
- Prior Review Round Reviewed: `4` (ARCH-REV-004, Fail)
- Latest Authoritative Round: `5`
- Current-State Evidence Basis: branch `codex/background-task-restart-notice` @ `895cf3992d`. Round-4 reads stand:
  - `agent-run.ts` L180-215, L525-540, `publishSourceEvents` L331-351 (every source batch runs `dispatchProcessedAgentRunEvents`, which runs the default pipeline including `LifecycleStatusEventTransformer` and dispatches its output to listeners);
  - every `buildAgentStatusPayload(` call site;
  - every server `AGENT_STATUS` reader.

  Round 5 checked that each runtime's view is updated before its `BACKGROUND_TASK_UPDATED` reaches the batch, so the count set at batch start already reflects it:
  - Claude registry `publish()`: `view.set` before `onBackgroundTaskChanged`; `clear()` publishes `stopped` for each running task before emptying the view;
  - native: the reporter publishes from the manager's change listener, after the manager recorded the change;
  - AGY: the monitor's `running` set changes at L64 and L107 (Solution Designer, R-12).

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High` (unchanged; confirmed)
- Independent Architecture Review required: `Yes`
- Classification correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved intent: unchanged from round 4 (DEC-004 display; DEC-005 delivery at once; runtimes that cannot say so unchanged).
- Every prospective blocking finding traceable: `Yes` (none remain)
- Remaining material ambiguity: None

| Behavior ID | Kind | Alignment | Trigger / Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — (MP-101 now traced through the example sequence) |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. The handoff is refreshed for part 2.

## Task Design Health Assessment Verdict

All rows `Pass`. The one derivation now reaches every producer through the run-owned lifecycle state and a required payload field.

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner Per Node | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-101 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass: `AgentRun` sets the count on the run-owned lifecycle state before each batch and snapshot; the transformer, canonical status and snapshot read it; no separate republish |
| DS-102 | Return-Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-103 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRun` (sets the count) / `AgentTurnLifecycleState` (holds it) | Pass | Pass | Pass | Pass | One writer (`AgentRun`, from the one derivation); readers are the run's own status builders |
| `runningBackgroundTaskCount(inspection)` | Pass | Pass | Pass | Pass | Used by `AgentRun` and the quiet check |
| Web `agentActivityPresentation` | Pass | Pass | Pass | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

`Pass`. Composition: no new lookup (Principle 16 `Pass`).

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `buildAgentStatusPayload({…, backgroundTasksRunning})` (required) | Pass | Pass | Pass | Low | Pass |
| `AgentStatusPayload.background_tasks_running` and the five route DTO fields | Pass | Pass | Pass | Low | Pass (every producer listed with its count source) |
| `pairedAgentStatusFrame(status, backgroundTasksRunning)` / `PairedAgentStatus` | Pass | Pass | Pass | Low | Pass |
| Run state `backgroundTasksRunning` (server-side sum) | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability Reuse / Allocation / Structures / Files / Placement

`Pass` (unchanged from round 4). Derived consumers: `Pass`. Producers are listed in the "Status Payload Producers And Their Count" table. Readers are listed as harmless in "AGENT_STATUS Readers Checked". Vocabulary: `Pass`.

## Removal / Decommission Completeness Verdict

`Pass`: backend `hasRunningBackgroundTasks()` and six implementations; per-runtime `hasRunning…` helpers if unused. Equivalence checked for native, Claude and AGY.

## Legacy / Backward-Compatibility, Persisted Data, Change Sequence

`Pass` (strict contracts cut cleanly; `Not Affected`; step 1 lets the compiler find the producers).

## Example Adequacy Verdict

`Pass`. The sequence "turn starts → task starts → turn ends → reload → task ends → wake" shows the count on every status, including the turn-end and snapshot cases that failed in round 4.

## Material Premise Validation

MP-101 (task started in a turn, turn ends): resolved. The turn-end status is built by the transformer from the lifecycle state that holds the count; the snapshot recomputes it. No new premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-004 is resolved (ARCH-REV-005).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer.

## Residual Risks

- R-9: status frames that differ only in the count are bounded by task changes (design Risks).
- R-11: Codex idle with background terminals shows "Idle"; ACP unchanged (accepted).
- R-13: the count is set once per source batch from the runtime's current view, so every status in that batch carries the latest count, even one emitted for an event earlier in the batch. Final states are right; within-batch order is immaterial to the display.
- For implementation: let the compiler drive the producer list (required field). Test the example sequence per event-stream runtime (native, Claude, AGY scripted), plus a Team row with a member in "background" while another is idle. Check that the phone header and rows show no Stop for "Background task running".

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: part 2 is ready for implementation as Large / High. One derivation feeds one run-owned field that every status producer must supply. Five routes carry it, the server sums it for teams and orgs, and the web has one mapping.
