# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/requirements-doc.md` (Approved; SR-001 baseline with DEC-001 = A)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/investigation-notes.md` (AINV-001..012)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/solution-revision-record.md` (SR-001..SR-003)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-spec.md`. Reviewed together: the SR-002 base, the "SR-003 Design Revision" section and the "SR-004 Correction" section. Precedence: SR-004 over SR-003 over SR-002.
- Supplemental Task Artifacts Reviewed: None exist. Triggering downstream evidence was read as context:
  - `implementation-design-impact-ir-003.md` (DI-001)
  - `ir-003-wip-start-for-input.patch` (the IR-003 work in progress)
  - `handoff-sr-004-design-correction.md`
  - `code-review-report.md` (CRR-002)
  - `handoff-sr-003-design-revision.md`
  - `api-e2e-evidence/`
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger:
  - Round 2: Solution Designer "Architecture Design Complete (corrected)" SR-004 (Small/High), after Implementation Engineer reported Design Impact DI-001.
  - Round 1: SR-003, which followed CRR-002 (CR-FO-001/002/003) after API/E2E DTL-003 failed.
- Prior Review Round Reviewed: ARCH-REV-001 (Pass on SR-003; its premise that `readiness_failure` had no consumer was wrong, see below)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree HEAD `d30c11204` (IR-002 on top of IR-001 `203eb29e1`, base `ace86bf1f`). Files read directly:
  - `configured-agent-execution-handle.ts` (whole file)
  - `configured-agent-status-overlay.ts`
  - `agent-run-input-contract.ts`
  - `collaboration-agent-execution-event.ts`
  - `root-communication-engine.ts` (`deliver`)
  - `flat-team-agent-execution-handle.ts`
  - `flat-team-execution-manager.ts:144-158`
  - `standalone-root-message-delivery.ts:166-167`
  - `agent-org-run-message-delivery.ts:119-120`
  - `root-agent-execution-registry.ts:208-211`
  - `root-task-dispatch.ts` (seed failure)
  - `root-task-agent-resource-scope.ts` (input fence)
  - `configured-agent-activation-planner.ts` (`isRetrySafe`)
  - `agent-collaboration-stream-handler.ts` (ack forwarding)

  Greps: `readiness_failure`/`readinessFailureCode`, activation-code branching in server and web, `getOrCreateAgentRun` callers.

  Round 2, checked by type rather than by string:
  - Every `CollaborationAgentExecutionEvent` consumer and every `publishAgentEvent` sink. The sinks are `team-flat-execution-callbacks.ts:41-75`, `agent-org-execution-scope-builder.ts:104-109` → `agent-org-run.ts:270-288`, and `standalone-root-builder.ts:79-84` → `standalone-agent-run-root.ts:311-327`; the event gates only pass events through.
  - `collaboration-agent-presentation-event-adapter.ts:47-97`.
  - `agent-org-task-event-retirement.ts:49-54`.
  - Web: `agentStreamMessageProjector.ts:198-201` and `agentStatusHandler.ts:122-161`.
  - The WIP patch.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Classification rationale reviewed: A bounded refactor inside one owner. It changes the shared member-activation failure path for every Team, Org and collaborator member, changes the activation-failure code that clients see, removes an internal event variant, and corrects a prior wrong trace. The rationale is evidence-backed and accurate.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - REQ-001..007 and AC-001..007 are approved. SR-003 changes no intended behavior.
  - REQ-005 / AC-004 already require: a not-started member that cannot start reports the failure when work reaches it. The sender gets a delivery failure naming the cause, the member shows `error`, and others are unaffected. A coordinator start failure still fails `delegate_task`.
- Relevant existing behavior and evidence confirmed:
  - At HEAD, `reserveInput` (L121-134) carries IR-002's copy of the `postMessage` catch (L136-157).
  - `initializeReady` emits `readiness_failure` (L330-334).
    - **Corrected in round 2 (AINV-013):** this event *has* a consumer. The final, unnamed fall-through of `CollaborationAgentPresentationEventAdapter.adapt` (L86-97) turns it into an `ERROR` presentation event (`runtime`/`terminal`).
    - All three roots publish that event. The web shows it in the member's conversation as an error segment (code plus cause) and calls `markConversationComplete`.
    - The roots drive task lifecycle only from `status_overlay` and `agent_run`/`AGENT_STATUS`, so the event affects only the conversation card.
    - ARCH-REV-001 accepted AINV-010 using the same string grep and missed this. Round 2 checked consumers by type.
  - The engine maps `reserved:false` into a not-accepted delivery (`root-communication-engine.ts:55-57`), but a thrown error escapes `deliver`.
  - The seed failure becomes `throw new Error(receipt.message)` and then a `delegate_task` failure message (`root-task-dispatch.ts:65-66, 84`).
  - No production code in server or web branches on activation codes. The stream handler only forwards `code`/`message` into the command ack. This confirms AINV-011.
- Scope guardrail confirmed: In-scope UC-002 (first message to a not-started member) and UC-003 (lifecycle). Preserved: BEH-002/003/004/006, Task DONE and reactivation behavior. Review authority is honored. The deferred cleanup items (post-start asymmetry, `postUserMessage` reserve-then-commit, adapter merging, lifecycle-state audit) are out of this ticket by user agreement.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A (no blocking findings).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (incl. REQ-005 coordinator clause) | System | Pass | Pass. Seed → `TeamRun.postMessage` → handle `postMessage`; the not-accepted receipt becomes a dispatch failure (`root-task-dispatch.ts:65-66`) | Pass. DS-001 unchanged; `postMessage` now gets its failure result from DS-005, and the cause stays in `message`, which reaches the `delegate_task` failure message | Confirmed | None |
| BEH-005 (start on first teammate message; REQ-002) | System | Pass | Pass. Corrected DS-002 matches the code: `standalone-root-message-delivery.ts:166-167` / `agent-org-run-message-delivery.ts:119-120` → `rootAgents.reserveInput` (`root-agent-execution-registry.ts:211`) or `reserveDirectAgentInput` (`flat-team-execution-manager.ts:144-158`) → `FlatTeamAgentExecutionHandle.reserveInput` (L60-61) → `ConfiguredAgentExecutionHandle.reserveInput` | Pass | Confirmed | None |
| BEH-005 / REQ-005 / AC-004 member branch | System | Pass | Pass. The FO-SCN-001 / DTL-003 evidence (CRR-002) shows the failure was not handled on the reserve path at IR-001 | Pass. DS-005 returns `{reserved:false, code:"AGENT_RUN_ACTIVATION_FAILED", message:<cause>}` plus the `error` overlay; the engine maps it unchanged | Confirmed | None |
| BEH-004 / REQ-006 / AC-005 (lifecycle; Task DONE) | System/Operational | Pass | Pass. `ensureReady` runs the input fence first (L271), and `prepareActivation` runs it again after the async config build (L343). The task fence throws `closed()` when the Task is DONE (`root-task-agent-resource-scope.ts:59-61`) | Pass. The DS-005 closed-input branch keeps "no errors from never-started members" (AC-005) during a DONE race (see PREM-001) | Confirmed | None |
| BEH-002/003/006 (REQ-007) | User/System | Pass | Pass. Round 2: the member's conversation error card on a start failure is existing, user-visible behavior in every root (AINV-013) | Pass. SR-004 keeps the card: one `readiness_failure` per failed start attempt, emitted by `initializeReady` as today. Members of UI-started and collaborator Teams share the handle; their typed start-failure result changes from a thrown error / -32603 to the approved typed failure (CAND-005, accepted under REQ-005's "same as UI-started Teams") | Confirmed | None |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | SR-002 assessment plus the SR-003 "Design health (this revision)" | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination` plus `Shared Structure Looseness`. Matches L121-157 (two copies of the catch) and the four failure channels (throw, unconsumed event, overlay, two codes) | None |
| Refactor needed now / deferred decision is explicit | Pass | Yes, bounded to the handle, the event type and the input contract. Deferrals are listed with the reason they do not affect REQ-005 | None |
| Refactor decision is supported by concrete design sections | Pass | DS-005 pseudo-code, callers, contract table, file delta, tests, change sequence. SR-004 adds an owner table with one channel per audience: sender gets the typed result; status dot gets the overlay; conversation gets the `readiness_failure` card | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 (corrected) | Primary | Pass | Pass | Pass. The delivery services, engine and flat handle are pass-through; `ConfiguredAgentExecutionHandle` governs start | Pass | Pass | Pass | Pass |
| DS-003 | Secondary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass. SR-004 gives each audience one channel: the overlay for status and `readiness_failure` → `ERROR` for the conversation, with no duplication | Pass |
| DS-005 | Bounded local | Pass | Pass | Pass. Private to the handle | Pass (`startForInput`) | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConfiguredAgentExecutionHandle` | Pass. `reserveInput` / `postMessage` | Pass. `startForInput`, overlay, `ensureReady` stay private | Pass. "No change to delivery services, roots, engine"; no per-root try/catch | Pass | Escalation trigger recorded if callers above the handle would need to change |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Handle → input contract / event type | Pass | Pass. No new `readiness_failure` consumer; no per-root catches. Adds an explicit adapter branch with an exhaustive `never` check (SR-004) | Pass | Pass | — |
| Flat Team preparation (SR-002) | Pass | Pass. "Flat Team preparation must not call member activation" | Pass | Pass | Unchanged from SR-002 |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `startForInput(): {started:true, run} \| {started:false, code, message}` (private) | Pass | Pass | Pass | Low | Pass |
| `AgentRunInputRejectionCode` (+`AGENT_RUN_ACTIVATION_FAILED`) | Pass | Pass | Pass | Low | Pass |
| `AgentOperationResult.code` from a `postMessage` start failure | Pass. One code, with the cause in `message` | Pass | Pass | Low | Pass |
| `CollaborationAgentExecutionEvent` (unchanged in SR-004; `readiness_failure` kept) | Pass | Pass | Pass | Low | Pass |
| `CollaborationAgentPresentationEventAdapter.adapt` (explicit `readiness_failure` branch, exhaustive check) | Pass | Pass | Pass | Low | Pass. Same output; a future variant can no longer fall through into an error card unnoticed |
| SR-002 interfaces (`beginMaterialization`, `PreparedFlatTeamExecution`, …) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member-facing failure signal | Pass | Pass. Reuses `ConfiguredAgentStatusOverlay` | N/A | Pass | — |
| Typed delivery rejection | Pass | Pass. Reuses `AgentRunInputReservationResult` and the engine mapping | N/A | Pass | — |
| Retry safety | Pass | Pass. `initializeReady` / `planner.isRetrySafe` unchanged | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/backends` | Pass | Pass | Pass | Pass | — |
| `agent-execution/input` | Pass | Pass | Pass | Pass | Contract-only change |
| `agent-team-execution/local` (SR-002) | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Start-failure handling in `reserveInput` / `postMessage` | Pass | Pass. A private method in the same owner | Pass | Pass | This is the core of the revision |
| Failure code/cause formatting | Pass | Pass | Pass | Pass | See AR-NB-001: one helper must also serve the indeterminate wrapper |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Activation-failure reporting | Pass | Pass. The duplicated per-entry-point handling is removed. What remains is one owner per audience: the typed result, the overlay, and the conversation card | Pass | Pass | Pass | SR-004 |
| `PreparedFlatTeamExecution` (SR-002) | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `configured-agent-execution-handle.ts` | Pass | Pass | Pass | Pass | AR-NB-001 / AR-NB-002 are implementation precision notes |
| `collaboration-agent-execution-event.ts` | Pass | Pass | N/A | Pass | Unchanged in SR-004 |
| `collaboration-agent-presentation-event-adapter.ts` | Pass | Pass | N/A | Pass | SR-004: explicit branch plus `never` check; output unchanged |
| `agent-run-input-contract.ts` | Pass | Pass | N/A | Pass | — |
| SR-002 file set | Pass | Pass | Pass | Pass | Unchanged |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-003/SR-004 delta (handle, input contract, presentation adapter) | Pass | Pass | Low | Pass | No new files |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| IR-002 duplicated `reserveInput` catch | Pass | Pass (`startForInput`) | Pass | Pass | Replaced in one commit, with no intermediate duplicate |
| `readiness_failure` variant + emission | N/A. **Kept** (SR-004) | N/A | Pass. SR-004 explicitly strikes the SR-003 removal and its test changes | Pass | Removing it would have silently dropped the conversation card (REQ-007) |
| `readinessFailureCode()` | Pass | Pass, with a caveat | Pass, with a caveat | Pass | It has a second consumer at L318-323 (indeterminate wrapper). See AR-NB-001 |
| SR-002 eager-preparation plumbing | Pass | Pass | Pass | Pass | Unchanged |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Old activation codes on `postMessage` results | No | Pass | Pass | Clean switch to `AGENT_RUN_ACTIVATION_FAILED`; no consumer branches on the old codes |
| `readiness_failure` | No. It is the current channel, not legacy | N/A | Pass | — |
| Eager task-Team option | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Task-Team member `platformAgentRunId` (nullable) | `Directly Usable — No Migration` | Pass (AINV-002, AINV-006) | Pass | N/A | Pass | SR-003 does not touch persisted data. A failed start leaves the binding `null` |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| SR-003 handle refactor | Pass | Pass (none) | Pass | Pass |
| SR-002 eager removal | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-005 start step | Yes | Pass | Pass (IR-002 duplication named as the rejected shape) | Pass | — |
| Task-Team preparation | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### PREM-001 — Input closes (Task DONE) while a not-started member is starting for a teammate message

- Related approved requirement or established contract: REQ-006 / AC-005 ("no errors from never-started members"), plus the preserved Task DONE behavior. This justifies the DS-005 closed-input branch.
- Relevant behavior ID(s): BEH-004, BEH-005
- Initiating basis kind: `Operational` / `Contract`
- Independent product-supported initiating trigger:
  - The delegating Agent marks the Task `DONE` through `create_or_update_task`. The tool contract states "DONE stops the Task's delegated copies".
  - At the same time, a teammate's `send_message_to` reaches a not-started member of that copy.
- Support evidence: the `create_or_update_task` tool contract; `root-task-agent-resource-scope.ts:59-61` (`assertInputAllowed` throws `closed()` once the owner is no longer open).
- Forward path:
  1. The sender's delivery passes the live-lease, `assertMessageScope` and `assertDeliveryAllowed` checks while the Task is still open.
  2. The message reaches `reserveInput → ensureReady → initializeReady → prepareActivation`.
  3. `buildAgentRunConfig` awaits (workspace activation). Meanwhile the Task becomes DONE.
  4. `prepareActivation` re-runs `assertInputAllowed` (L343) and throws, or the copy stop calls `cancelActivation` (`rootShutdownFenced`).
  5. The failure reaches the new start step with no active run.
- Lifecycle preconditions and material consequence: the member has never started, and the copy is closing. Without the branch, the member would be reported as an activation failure and shown red (`error` overlay), and the sender would be told the member could not start. That contradicts AC-005. With the branch, the sender gets `AGENT_RUN_NOT_ACCEPTING_INPUT` with the DONE guidance, and the member gets no red status. This ticket makes the window more likely, because activation now happens on first work instead of at delegation.
- Reachability: `Reachable` (a low-frequency race)
- Review consequence: the branch is accepted as proportionate. It is a classification step on an existing failure, with no new state or retry. See AR-NB-002 for the overlay-clearing precision.
- Round 2 (SR-004): the same premise also justifies suppressing the `readiness_failure` card in this race. Today the card appears and `markConversationComplete` runs for a member that was only closed, which contradicts AC-005's "no errors from never-started members".
  - The suppression uses the same "input closed now" predicate. Every other start failure keeps its card, so REQ-007 behavior is unchanged outside the race.
  - Proportionate: it reuses the predicate and adds no new state.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

No blocking findings. Round 2: no new findings. AR-NB-001..003 still apply, unchanged; the WIP patch already applies all three.

Non-blocking implementation-precision notes (`Within Approved Scope`, no behavior change; the implementer should apply them, and they do not require another design round):

### AR-NB-001 — `readinessFailureCode()` has a second consumer (non-blocking)

- Evidence:
  - `configured-agent-execution-handle.ts:318-323`: `initializeReady` wraps a failure after a durable binding commit into `CollaborationAgentActivationError(this.readinessFailureCode(error), "Provider binding committed durably but Agent readiness publication failed.", {indeterminate:true})`.
  - The SR-003 file table says only "remove `readinessFailureCode`".
- Required update (implementation): replace `readinessFailureCode()` with one private cause helper, not two. The helper extracts the code and formats `<code>: <message>`. It serves both the indeterminate wrapper and the `startForInput` cause formatting.
- For the indeterminate case, the sender's `message` should still name the underlying cause, because the wrapper message is generic. Include the wrapped `cause` message, or keep the underlying code as the wrapper's code (today's behavior).
- Protects: REQ-005 / AC-004 ("naming the cause").

### AR-NB-002 — Closed-input branch: how to detect the closed state, and which overlay to clear (non-blocking)

- Evidence:
  - `ConfiguredAgentStatusOverlay.set("initializing", …)` returns `false` and does nothing when the current status is `error` (`configured-agent-status-overlay.ts:15-16`).
  - `overlay.clear()` drops any snapshot.
- Required update (implementation):
  - Decide "input is closed" by re-evaluating `assertInputAllowed()` (which also covers `rootShutdownFenced`) at catch time, after the active-run check.
  - In that branch, clear only the `initializing` overlay that `startForInput` itself set. Use the boolean that `set` returns. Do not clear a pre-existing `error` snapshot.
- Protects: AC-005; REQ-003 (truthful status).

### AR-NB-003 — Keep `postMessage` behavior after a successful start unchanged (non-blocking)

- Evidence: today one catch (L146-155) wraps start, the post-start `assertInputAllowed()`, and `run.postUserMessage()`. The design moves only the start-failure handling into `startForInput` and says "otherwise post as today".
- Required update (implementation): after a successful start, keep the current behavior. An `accepted:false` from `postUserMessage` gets an `error` overlay. A throw while the run is active is rethrown.
- Do not add a new catch or new semantics for throws after a successful start. That area is the deferred "post-start asymmetry" cleanup.
- This is not a finding about a reachable defect; it is guidance against scope creep.

## Classification

N/A — `Pass`.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass rule). The Solution Designer receives an informational notice.

## Residual Risks

- Round 2 (SR-004): `initializeReady`'s catch and `startForInput`'s catch each evaluate the "input closed now" predicate, a few awaits apart.
  - In a Task DONE race that lands exactly between them, the card and the typed result could disagree. Example: a card appears while the sender gets `AGENT_RUN_NOT_ACCEPTING_INPUT`.
  - The consequence is cosmetic and limited to PREM-001's race. It is acceptable as designed and needs no extra machinery.
  - Implementation option: evaluate the predicate once in `initializeReady` (after the cleanup await) and pass that classification to `startForInput` on the rejected error.
- Method note: ARCH-REV-001 confirmed AINV-010 with a string grep. Event-consumer checks in this package now go by type and exhaustiveness, and the explicit adapter branch makes the compiler enforce it from here on.

- CAND-005 (accepted): members of UI-started Teams and Orgs that cannot start on a teammate message now return the typed not-accepted result plus `error` instead of `-32603`. This is the REQ-005 intent.
- Operator- and agent-visible code for a member start failure becomes `AGENT_RUN_ACTIVATION_FAILED`, with the cause in `message`. No consumer branches on the old codes (verified in server and web).
- Pre-existing and outside this revision:
  - `FlatTeamAgentExecutionHandle.getHandle()` / `createHandle()` can throw before the configured handle exists (a root-shutdown fence, or a `buildMemberExecutionContext` failure). Such a throw would still escape `reserveInput`.
  - The design keeps the handle as the single owner and does not ask for this to be covered. It belongs with the deferred lifecycle-state audit or the separate cleanup ticket.
  - It does not affect AC-004's provider-start failure, which happens inside `ensureReady`.
- Deferred cleanup items (user-agreed separate ticket) remain as listed in the SR-003 design revision.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (PREM-001 is Reachable and supports the closed-input branch and the SR-004 card suppression)
- Notes:
  - SR-004, with SR-003 and the SR-002 base, is ready for implementation.
  - Keep `readiness_failure` and make the adapter branch explicit with an exhaustive check.
  - Apply AR-NB-001..003; the WIP patch already does.
  - Restore the event and the emission the WIP patch removed, and add the suppression for the closed-input case.
  - IR-002 (`d30c11204`) is superseded: replace it, do not extend it.
