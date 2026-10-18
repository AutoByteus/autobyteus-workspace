# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/requirements-doc.md` (Approved, SR-002: REQ-004/QR-001/AC-005/AC-006/DEC-003 clarified within the direction)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/design-spec.md` (Ready, SR-002)
- Supplemental Task Artifacts Reviewed: `experiments/experiment-results.md`, `experiments/E4-shared-turn-identity.patch` (read in full), `experiments/E2-provisional-snapshot-turn.patch` / `E3-arrival-snapshot.patch` (via the results record), `probes/claude-provider-turn-segment-race.probe.test.ts`, `evidence/probe-run-base-1c718202b2.txt`, `handoff-summary.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Solution Designer re-review request for ARCH-REV-001 findings AR-001..AR-003 (SR-002), `Medium` / `High` unchanged
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail — Design Impact)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: worktree `codex/segment-lifecycle-error-flood` @ `1c718202b2` (no source changes). Read: `agent-turn-lifecycle-state.ts`, `lifecycle-status-event-transformer.ts`, `agent-segment-lifecycle-state.ts`, `agent-segment-lifecycle-event-transformer.ts`, `dispatch-processed-agent-run-events.ts`, `default-agent-run-event-pipeline.ts`, `agent-run.ts` (dispatch, `reconcileRecovery`, input claim/accept), `agent-run-interrupt-state.ts`, `agent-run-termination.ts`; TURN_STARTED/terminal emission in all backend converters (ACP, AGY, AutoByteus, Codex, Claude); existing tests asserting `AGENT_SEGMENT_LIFECYCLE_INVALID`; repository `DESIGN.md`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: 1 new + 3 modified source files in one subsystem (`events/processors`) → Medium is right. The change alters which evidence may end a turn in run-owned state that every runtime shares and that drives status, interrupt targeting, input claims and root-shutdown quiescence. That is a concurrency/lifecycle-semantics change with a wide blast radius → High is right.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Fix the snapshot-ahead-of-queue turn race (REQ-001/002). Show at most one plain-language notice per turn, only in the current turn (REQ-003). Log the first rejection with a reason and a count summary at turn end, max 2 lines per turn (REQ-004, QR-001). Keep snapshot-only turns, other diagnostics and the DTO unchanged (REQ-005).
- Relevant existing behavior and evidence confirmed: Yes. In the code, both states retire a different active turn on any open, including snapshot opens (`openIdentifiedTurn`, `openTurn`). The pipeline snapshot is read inside the queued task (`dispatch-processed-agent-run-events.ts`). `reconcileRecovery()` reconciles with the live snapshot after every batch and on status reads and claims. The transformer emits one ERROR per rejected event and logs nothing.
- Scope guardrail confirmed: Yes. In scope: UC-001/UC-002. Out of scope: the Codex gate, recovering lost text, wire/web changes, and command-side "now" rework. Preserved: BEH-006, BEH-008, REQ-005. Review Authority as stated.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings remain).
- Remaining material ambiguity, if any: None. SR-002 clarifies REQ-004/QR-001/DEC-003: the log is bounded by lifecycle boundaries, not event count, and late counts are reported at the next boundary. The Solution Designer made this change within the Task's direction (user informed), on the same approval basis as SR-001. It doesn't widen scope. It fills in the case the original wording didn't cover, and it is consistent with BEH-003's "bounded" intent.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (SCN-001; probe instrumentation; code confirms snapshot open + stream-start retirement) | Pass (DS-001/DS-003; traced user case through ledger rule, including segment `canOpen` and same-id `observeStreamStart` promotion) | Confirmed | — |
| BEH-007 | System | Pass | Pass (X5) | Pass (snapshot ignored while stream-held) | Confirmed | — |
| BEH-002 | System | Pass | Pass (X2; `status` getter derives from `activeTurn`) | Pass (post-batch `reconcileRecovery` fills the empty slot with snapshot T2 after T1's terminal) | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass (SR-002 "Rejection accounting lifecycle": accounts live as long as the run, every boundary flushes, release returns summaries, termination logs them; AC-005 a–d) | Confirmed | — (AR-001 resolved) |
| BEH-008 | Contract | Pass | Pass (E1: 22 tests) | Pass (snapshot fills an empty or snapshot-held slot) | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass (other producers untouched) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `experiments/experiment-results.md` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| `experiments/E4-shared-turn-identity.patch` | Pass | Pass | Pass for turn identity (notice/log not prototyped, as the design says) | Pass (design renames: `AgentTurnLedger`, `hasEnded`, `end`, `endActive`, `forgetActive`) | Pass | — |
| `experiments/E2/E3 patches`, scoring probe | Pass | Pass | Pass | Pass | Pass | — |
| `probes/…race.probe.test.ts`, `evidence/probe-run-base-…txt` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix; design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | The duplicated active/retired policy in both states is confirmed in the code. The missing invariant (only ordered evidence ends a turn) is confirmed by the probe instrumentation. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded refactor now; FU-002 deferred with a named residual | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ledger extraction, removal plan and file mapping are concrete; E2 vs E4 compared | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary E2E (Claude frame → chat/memory/status) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary (command-side reads → live reconcile → turn state) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local (ledger rule) | Pass | Pass (four worked examples) | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local (rejection → notice/log) | Pass | Pass (account key, lifetime, fields, flush boundaries 1–3, bound stated; examples for late, Terminate and no-turn cases) | N/A | Pass | Pass | Pass (formats in `agent-segment-rejection-log.ts`; state has no I/O) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentTurnLifecycleState` | Pass | Pass (ledger private; `activeTurn` becomes a derived getter) | Pass | Pass | No external writers to `activeTurn` or `retiredTurnIds` (the only `activeTurn =` hit in tests is an unrelated native `context.state`) |
| `AgentSegmentLifecycleState` | Pass | Pass | Pass (transformer is a cached singleton; per-run accounting correctly placed in the state) | Pass | Note: `AgentRunTermination` also calls `releaseRun()` (`agent-run-termination.ts:216`), outside the transformer. This matters for AR-001. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `segment-lifecycle/*` → `lifecycle-status/agent-turn-ledger.ts` | Pass | Pass (`lifecycle-status` must not import `segment-lifecycle`; segment state must not read the turn state's ledger) | Pass (follows the existing import of the turn-state type) | Pass | — |
| `AgentTurnLedger` | Pass | Pass | Pass | Pass | No imports; no I/O |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentTurnLedger.observeStreamStart` / `observeRuntimeSnapshotTurn` | Pass | Pass | Pass (evidence kind is in the method name) | Low | Pass |
| `AgentTurnLedger.end` / `endActive` / `forgetActive` / `hasEnded` / `activeTurnId` | Pass | Pass | Pass | Low | Pass |
| Rejection reason union | Pass | Pass | Pass | Low | Pass |
| `recordRejection(turnId \| null) → { warn, showNotice }`, `takeRejectionSummaries()`, `releaseRun(): AgentSegmentRejectionSummary[]` | Pass | Pass | Pass | Low | Pass |
| `logAgentSegmentRejection` / `logAgentSegmentRejectionSummaries` | Pass | Pass (formats only) | Pass (run id + runtime kind) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Turn identity rule | Pass | Pass | Pass (removes two copies) | Pass | — |
| Rejection accounting | Pass | Pass | N/A | Pass | — |
| Logging | Pass | Pass (module-local `logger` → `console.warn`, as in the file-change and team-communication processors) | N/A | Pass | `runContext.runId` / `runContext.config.runtimeKind` are available on the transformer input |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `events/processors/lifecycle-status` | Pass | Pass | Pass | Pass | — |
| `events/processors/segment-lifecycle` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Active/ended turn tracking + snapshot reconcile | Pass | Pass | Pass (one instance per state, justified by the pipeline pass order) | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Ledger active slot `{ turnId, evidence }` | Pass | Pass | Pass (the active turn no longer carries two meanings) | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `lifecycle-status/agent-turn-ledger.ts` (Add) | Pass | Pass | N/A | Pass | — |
| `lifecycle-status/agent-turn-lifecycle-state.ts` | Pass | Pass | Pass | Pass | — |
| `segment-lifecycle/agent-segment-lifecycle-state.ts` | Pass | Pass | Pass | Pass | — |
| `segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` | Pass | Pass | N/A | Pass | — |
| `segment-lifecycle/agent-segment-rejection-log.ts` (Add) | Pass | Pass (off-spine log formats for two callers) | N/A | Pass | Avoids duplicating formats in the transformer and termination |
| `domain/agent-run-termination.ts` (Modify) | Pass | Pass (already owns the termination `releaseRun()` call) | N/A | Pass | Implementation note: its `backend` option is `Pick<…, "getLifecycleSnapshot" \| "hasRunningBackgroundTasks" \| "terminate">`, so `runtimeKind` must be added to the Pick (or passed as an option) for the summary line |
| Test inventory | Pass | — | — | Pass | AR-002 resolved: both intentionally changed integration tests are named with their new expectations; AC-006 notes them |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `lifecycle-status/agent-turn-ledger.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Segment state `activeTurnId` / `retiredTurnIds` / `openTurn()` | Pass | Pass | Pass | Pass | — |
| Turn state mutable `activeTurn` / public `retiredTurnIds` | Pass | Pass | Pass | Pass | Repo search verified |
| Per-event `diagnostic()` | Pass | Pass | Pass | Pass | — |
| Throwaway probes | Pass | Pass | Pass (step 5) | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Diagnostic flag, `retiredTurnIds` for tests | No | Pass | Pass | Both explicitly rejected |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Lifecycle states; run memory | `Not Affected` | Pass (in-memory per run; memory writer and shape unchanged) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Ledger → turn state → segment state → transformer → regression test → docs → suites | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Ledger rule (user case, X5, ordered supersede) | Yes | Pass | Pass | Pass | — |
| Notice/log for in-turn rejections | Yes | Pass | Pass | Pass | — |
| Notice/log for late rejections, Terminate, no-turn | Yes | Pass | Pass | Pass | AR-001 resolved |
| Snapshot offline/error kept | Yes | Pass | Pass | Pass | AR-003 resolved |

## Material Premise Validation (Only When Needed)

### `MP-001` — A stream-held turn with no terminal event, followed by a turn known only from the snapshot (no `TURN_STARTED`), would now stay blocked

- Related approved requirement or established contract: REQ-001, REQ-005
- Relevant behavior ID(s): BEH-001, BEH-008
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: none found. Every backend converter emits `TURN_STARTED` for every turn and a terminal event: ACP (`acp-session-update-converter.ts:86/176/188`), AGY (`agy-stream-event-converter.ts:59/102/282`), AutoByteus native (`autobyteus-stream-event-converter.ts:72-74`), Codex (`codex-turn-event-converter.ts:47-83`), Claude (`claude-session-event-converter.ts:231-239`). When a terminal is missing, the next turn's stream start still supersedes it (rule kept).
- Support evidence: code inventory above
- Forward current or approved target production caller/event path: N/A — no supported trigger
- Lifecycle preconditions and material consequence at the claimed point: N/A
- Reachability: `Not Reachable`
- Review consequence / proportionate response: no finding, no extra machinery. The design's escalation trigger and Risks entry already cover finding such a runtime later.

### `MP-002` — Stop or append during the queue lag targets the old stream-held turn although the runtime has already moved to the next turn (FU-002)

- Related approved requirement or established contract: REQ-005 (BEH-008 covers snapshot-only turns, not this case); out-of-scope item "Reworking how AgentRun answers command-side 'which turn is running now'"
- Relevant behavior ID(s): BEH-008 (adjacent)
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the user presses Stop (or sends an append) in the chat while an agent runs consecutive turns
- Support evidence: Stop control and message input are exposed product surfaces
- Forward path: `AgentRunInterruptState.interrupt` and the input claim/accept steps all run inside the per-run dispatch queue (`agent-run-interrupt-state.ts:35`, `agent-run.ts:359-385`, `drainInputAfterLifecycleChange`). So every batch enqueued before the command has already been processed. The old turn stays stream-held only if the runtime has finished it natively but its terminal batch hasn't been enqueued yet. Claude emits synchronously, so this doesn't happen there. It is possible only for backends with asynchronous batch delivery (Codex documents this).
- Lifecycle preconditions and material consequence at the claimed point: a millisecond-scale window. The first Stop is rejected as "not the active turn"; a second Stop works. At base, a live snapshot naming the new turn would have retargeted the command, so this is a narrow shift for async backends, not purely pre-existing.
- Reachability: `Reachable` (narrow, async backends only)
- Review consequence / proportionate response: non-blocking. It is outside the approved scope and already recorded as FU-002 with its consequence. Recommendation: when FU-002 is filed, note that the window comes from the new rule on async backends.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`: the behavior basis is confirmed (SR-002), AR-001..AR-003 are resolved in the current canonical artifacts, and no in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. Resolution of the ARCH-REV-001 findings, checked against the current `design-spec.md` / `requirements-doc.md` (SR-002):

- **AR-001 — Resolved.** The "Rejection accounting lifecycle" section defines:
  - account key: turn id, or one no-turn account;
  - run-lifetime accounts, so a late rejection finds its existing account and never writes a second detailed warning;
  - fields `warned`/`pending`/`noticed`;
  - a `takeRejectionSummaries()` flush at three boundaries: a batch containing a turn terminal or a release, in-pipeline release, and termination release;
  - `releaseRun()` returns summaries, and `AgentRunTermination` logs them through `agent-segment-rejection-log.ts`, so the state stays free of I/O.

  REQ-004, QR-001, AC-005 (a–d) and DEC-003 are clarified so the bound is ≤1 detailed warning per account plus ≤1 summary per account per boundary, with no count dropped. Examples cover late, Terminate and no-turn rejections. Dependency rule added: termination → log module; the log module imports nothing from `domain`.
- **AR-002 — Resolved.** `agent-status-websocket.integration.test.ts` (~l.559–583) and `team-agent-segment-admission.integration.test.ts` ("retires an ended turn…") are listed as intentional Modify items with exact new expectations. AC-006 notes them. `streaming_parsing_architecture.md` is added to the docs list.
- **AR-003 — Resolved.** Intended Change, Terminology and DS-003 limit the rule to the snapshot's turn naming. Snapshot `offline` / `phase: error` keep ending the active turn through `endActive()`/`forgetActive()` as today, and an example row was added.

Non-blocking implementation notes, no design rework:
- `design-spec.md` l.163 still has the SR-001 DS-004 one-liner ("turn terminal → summary log if count > 1") under the new pointer on l.162. The "Rejection accounting lifecycle" section is authoritative.
- `AgentRunTerminationOptions.backend` has no `runtimeKind` in its `Pick`. Add it, or pass `runtimeKind` as an option, for the summary line.

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary), then an informational pass notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- MP-002 / FU-002: a narrow command-targeting window on asynchronous backends (Codex), which the new rule introduces. It is out of scope, recoverable with a second Stop, and recorded in the design.
- ASM-001: re-run the full server unit, integration and typecheck suites on the final implementation. The notice/log part and the termination logging were not prototyped.
- Under the SR-002 bound, a turn that keeps getting late events across many boundaries gets one summary per boundary. That is bounded by lifecycle boundaries, as approved.
- Optional: `start()` may promote a snapshot-held same-id turn with `observeStreamStart`. This has no behavioral effect (MP-001).
- AC-007 depends on a signed-in Claude in an isolated app. Record the gap if that's unavailable.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Not Reachable, no machinery added; MP-002 Reachable but out of scope and recorded as FU-002)
- Notes: ARCH-REV-002 for SR-002. All structural verdicts pass. Verdicts unaffected by SR-002 are kept from round 1.
