# Design Review Report — Agent Input Delivery Simplification

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/requirements-doc.md` (Approved, SR-003 intent; SR-004 wording clarification)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/design-spec.md` (SR-004, `Ready`; SR-005 base note and "SR-005 Self-Validation" with V-1..V-4)
- Supplemental Task Artifacts Reviewed: `probes/task-close-during-delivery.probe.ts`, `followup-cleanup-ticket-brief.md`, `history/requirements-doc.sr-002.md` (REQ-012 wording comparison)
- Relevant Solution Revision IDs: SR-003 (approved requirements), SR-004 (design), SR-005 (re-bootstrap on `46e94fdea`, user re-confirmation 2026-10-10, self-validation, V-1..V-4)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger:
  - Round 2: `Architecture Design Complete` (SR-005) from `/software_engineering_team/solution_designer`, `handoff-sr-005-rebootstrap.md`. Purpose: confirm that SR-004 applies to `origin/personal@46e94fdea` and that V-1..V-4 are proportionate.
  - Round 1: SR-004 on `048ea6cec` (another team copy).
- Prior Review Round Reviewed: ARCH-REV-001 (Pass; RR-001..RR-004)
- Latest Authoritative Round: 2
- Current-State Evidence Basis (round 2): worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification`, branch `codex/agent-input-delivery-simplification-v2` @ `46e94fdea`. See "Round 2 — Base Revalidation (ARCH-REV-002)" below.
- Current-State Evidence Basis (round 1): worktree `codex/agent-input-delivery-simplification` @ `048ea6cec` (= `origin/personal`). Read directly:
  - `root-communication-engine.ts`, `root-communication-adapter.ts`;
  - `standalone-root-communication-adapter.ts` (diffed against `agent-org-communication-adapter.ts`: the differences are only the envelope, validator, coordinator and code/message text);
  - `team-communication-{service,adapter,message-append-plan}.ts`;
  - `standalone-root-persistence-coordinator.ts`, `team-run-persistence-coordinator.ts`, `team-run-persistence-contract.ts`;
  - `agent-run.ts:171-232`, `agent-run-input-reservation.ts`, `agent-run-input-admission-state.ts:75-170`;
  - `agent-run-command-observer-dispatch.ts`;
  - `root-task-agent-resource-scope.ts`, `send-message-to-dispatcher.ts:55-100`;
  - `root-team-run.ts` wiring, `standalone-root-builder.ts:95-110`, `agent-org-run-manager.ts:130-145`, `team-communication-projection-service.ts`;
  - `flat-team-execution-manager.ts:144-160`, `task-agent-execution-registry.ts:221-225`;
  - `InterAgentMessageRouter` usages.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: five subsystems, about 15 files modified / 5 deleted / 1 added, about 10 test files, 7 docs. The persistence commit contract changes on three roots, post-durability failure semantics change, the work is concurrency-sensitive (lock and reservation lifecycle), and the message-list owner moves. Confirmed by the code read.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Round 2 — Base Revalidation (ARCH-REV-002)

### Does SR-004 apply to `46e94fdea`?

- `git diff --stat 048ea6cec 46e94fdea` (87 commits) over the in-scope areas found **no change** to any of these:
  - the engine and `root-communication-adapter.ts` (`agent-collaboration/execution/communication/`);
  - both root communication adapters;
  - the three persistence coordinators;
  - `src/services/team-communication/` (service, adapter, append plan);
  - `agent-execution/input` (admission state, reservation);
  - `inter-agent-message-router.ts` (still present, still unused);
  - `task-agent-execution-registry.ts`.
- Confirmed directly at `46e94fdea`:
  - The engine guarded `commit`/`release` still runs `assertAllowed()` after the durable write (`root-communication-engine.ts:59-61`), so OBS-003 still exists by code path.
  - `reservation.commit()` throws only when the entry can no longer be committed (`agent-run-input-reservation.ts:18-20`).
  - `closed()` is unchanged at `root-task-execution-resource-scope.ts:134`. The file diff is a pure rename (`RootTaskAgentResourceScope` → `RootTaskExecutionResourceScope`, `agentRun` → `execution`).
- In-scope files that changed in the base:
  - `root-team-run.ts`, `standalone-agent-run-root.ts`, `agent-org-run.ts`;
  - the three `*-message-delivery.ts` files.

  The changes are the resource-port rename, the `delegateTask` → `delegateToNewCopy` rename, `collaboratorPortFor`/mention-viewer threading (`24baaf7c5`), and the new `assignToExistingCopy` / `teamCoordinatorOf` (`1e5d757a9`, `88e59f500`). None of them alters the path from a resolved recipient onward, the coordinators, or `AgentRun` admission. The D-1..D-8 placement remains actionable.
- **New caller of the unified engine (AR2-NB-001):**
  - `assignToExistingCopy` exists in all three roots: `standalone-root-message-delivery.ts:155-160`, `agent-org-run-message-delivery.ts:112-117`, `root-team-run.ts:331-337`.
  - It delivers a follow-up Task's work to an existing copy through `deliverToRunId` → `engine.deliver` / `TeamCommunicationService.deliver`.
  - `RootTaskExecutionLifecycle.assignToExistingCopy` (`root-task-execution-lifecycle.ts:173-183`) maps the outcome: a thrown error becomes `TASK_WORK_NOT_DELIVERED`, and a non-accepted delivery triggers `markFailed` plus `delegated:false`.
  - The engine contract ("returns `AgentOperationResult` or throws a scope error") is unchanged, so this caller stays compatible and needs no design change.
  - REQ-012 also changes this caller's race outcome, from a root fail-stop to the same outcome as a closure just before the write: thrown, then `markFailed`.
  - The investigation recheck and the SR-005 note ("the only path change is a renamed file") do not mention this caller.
- Base drift since the review request: `origin/personal` is now at `d28c56d5d`, 9 commits past `46e94fdea`. Its `src` changes are limited to context files (`api/rest/context-files.ts`, `context-file-owner-types.ts`, `context-file-local-path-resolver.ts`), which are out of the delivery path. This does not affect the design.

### Are V-1..V-4 proportionate?

| Gate | Protects | Proportionate? | Note |
| --- | --- | --- | --- |
| V-1 baseline full-suite comparison, saved before code changes | AC-014; DESIGN.md rule 6 (honest proof) | Yes | It replaces an unsaved "fails on base too" claim, with no new machinery. Compare by test name. Known flaky tests must be listed by name with their baseline result, not waived. |
| V-2 persisted bytes and recipient IDs per root, compared with values recorded from the baseline code | REQ-013, AC-013, QR-002 | Yes | Envelope construction moves from the adapters into the coordinators, and the Team builder mapping moves, so recomputing the expected bytes with the new code would prove nothing. See AR2-NB-002 for the clock requirement. |
| V-3 codes, messages and event order per root (including the Team indeterminate text) | REQ-008, AC-005, AC-007; RR-001 | Yes | Rejections become port data and the event sequence is rewritten, which are exactly the drift risks the design names. |
| V-4 REQ-012 and the genuine-failure counterpart, per root, with real coordinators; API/E2E send-message round per root | REQ-012, AC-012, QR-003 | Yes | The counterpart ("presentation throw still fail-stops") is a contract test of REQ-012's last sentence, not a new scenario. Team and Org are established only by code reading, so per-root real-coordinator tests are the right proof. |

None of the gates adds product behavior or in-scope machinery. They are verification only.


- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - The work is a refactor: one teammate-delivery implementation, dead code removed, `admit()` validation defined once, docs updated.
  - It also fixes one defect (REQ-012 / DEC-001 = A): a closure discovered after the durable write must not fail-stop and terminate the root.
- Relevant existing behavior and evidence confirmed: Yes.
  - Standalone and Org adapters are copies.
  - The Team plan checks duplicate/open inside the lock; standalone and Org check before the lock.
  - Standalone and Org throw on an indeterminate write; Team returns it as an outcome.
  - The engine's guarded `commit()` re-runs `assertDeliveryAllowed` inside each coordinator's `finalize`/`finalizeAfterDurability`. Any throw there causes fail-stop (OBS-003).
  - Each root keeps a duplicate `messages` mirror (`replaceMessages` / `replaceSnapshot`).
  - `TaskAgentExecutionRegistry.reserveInput` has no caller: the manager calls `taskAgents.get(id).reserveInput` on the handle.
  - `InterAgentMessageRouter` is used only by one unit test and one architecture allow-list entry.
- Scope guardrail confirmed: Yes.
  - In-scope use cases: UC-001, UC-003, UC-004, UC-006, UC-007.
  - Out of scope: the "Not Pursued" items, address resolution, the `TeamRun` seam, persisted shapes.
  - Preserved behavior boundary and review authority are explicit.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: Yes (no blocking findings).
- Remaining material ambiguity: none blocking. See the approval-visibility note in Residual Risks (RR-002).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (`admit()` repeats the checks of `reserve()`, lines 75-100) | Pass (DS-004) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass (no change to the recovery claim; reservation path untouched) | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass (result shapes untouched; per-root codes and messages carried as port data) | Pass | Confirmed | — |
| BEH-004 | User/System | Pass | Pass (three adapter variants verified) | Pass (DS-001/DS-002; the append generalizes the existing Team plan) | Confirmed | — |
| BEH-005 | System | Pass | Pass (global router untouched; dead router and registry method verified unused) | Pass (DS-003 unchanged) | Confirmed | — |
| BEH-006 | System | Pass | Pass (handles not touched) | Pass | Confirmed | — |
| BEH-007 | Operational | Pass | Pass (doc rows) | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass (probe plus the same finalize shape in all three coordinators) | Pass (fix placed once, at the post-durability reservation commit inside the engine-owned append) | Confirmed | Non-blocking wording alignment (RR-002) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/task-close-during-delivery.probe.ts` | Pass | Pass | Pass | Pass | Pass (evidence, disposable) | — |
| `followup-cleanup-ticket-brief.md` | Pass | Pass | Pass | Pass (weak premises explicitly dropped) | Pass (input evidence) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Refactor plus bug fix | — |
| Root-cause classification is explicit and evidence-backed | Pass | Duplicated coordination (three commit variants, drifted) and a missing invariant (recipient-closed treated as a fatal local failure); both verified in code | — |
| Refactor decision is explicit | Pass | Refactor needed now; deferrals named (address-resolution duplication; `TeamRun` keeps three input methods) | — |
| Refactor decision is supported by the concrete design sections | Pass | D-1..D-7 map to the removal plan, file mapping and sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary: teammate delivery from tool call to recipient dispatch | Pass | Pass | Pass (port is a thin facade; engine governs) | Pass | Pass | Pass | Pass |
| DS-002 | Bounded local: append protocol under the coordinator lock | Pass | Pass (states, abandon and the REQ-012 step are explicit) | Pass | Pass | Pass (engine owns the protocol; coordinator owns lock, envelope, write and latch) | Pass | Pass |
| DS-003 | Primary: run-ID messaging | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local: admission validation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootCommunicationEngine.deliver` | Pass | Pass | Pass | Pass | Root delivery services call only `deliver`; reservation commit/cancel outside the engine is forbidden |
| Coordinator `commitMessageAppend` | Pass | Pass | Pass | Pass | Coordinators see only the one-shot append; they do not touch reservations. Same capability pattern as the existing `commitTreeMutation` / `prepareAgainstCurrent` |
| `TeamRun` | Pass | Pass | Pass | Pass | Team port routes through `TeamRun.reserveDirectAgentInput`; it does not reach the flat manager directly |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/communication` | Pass | Pass | Pass | Pass | No root imports. Roots and coordinators import its types, which matches today's direction (the Team coordinator already imports from `agent-collaboration`) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RootCommunicationEngine.deliver` | Pass | Pass | Pass | Low | Pass |
| `RootCommunicationPort` | Pass | Pass (root facts and effects only) | Pass | Low | Pass |
| `commitMessageAppend` | Pass | Pass | N/A | Low | Pass |
| `RootMessageAppend` / `RootMessageAppendResult` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Append protocol | Pass | Pass (generalizes the Team plan) | Pass (one new file replaces three variants) | Pass | |
| Recipient builders | Pass | Pass | N/A | Pass | Team mapping moves next to the Team builder |
| Fail-stop latch | Pass | Pass | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/communication` | Pass | Pass | Pass | Pass | |
| Standalone / Org / Team roots | Pass | Pass | Pass | Pass | Port objects in root constructors |
| `agent-execution/input` | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Commit protocol (3 copies) | Pass | Pass | Pass | Pass | `root-message-append.ts` |
| Commit result (thrown vs returned) | Pass | Pass | Pass | Pass | One result type; indeterminate always thrown |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RootMessageAppend` | Pass | Pass (root-ID self-check dropped; it is unreachable once each port binds its own coordinator) | Pass | N/A | Pass | |
| `RootMessageAppendResult` | Pass | Pass | Pass | N/A | Pass | |
| `RootCommunicationPort.rejections` | Pass | Pass | Pass | N/A | Pass | Unreachable variants of today's Team conflict message (stale plan, root mismatch) disappear correctly |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `root-communication-engine.ts` | Pass | Pass | Pass | Pass | |
| `root-message-append.ts` (new) | Pass | Pass | Pass | Pass | |
| `root-communication-port.ts` (renamed) | Pass | Pass | N/A | Pass | |
| Three coordinators | Pass | Pass | Pass | Pass | Each owns its envelope, validator, store and latch |
| Three roots | Pass | Pass | Pass | Pass | Port plus envelope from `engine.getMessages()` |
| `inter-agent-message-runtime-builders.ts` | Pass | Pass | N/A | Pass | |
| `agent-run-input-admission-state.ts` | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/communication/` | Pass | Pass | Low | Pass | No new folders |
| `services/team-communication/` | Pass | Pass | Low | Pass | Keeps store, schema and projection |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Two root adapters | Pass | Pass | Pass | Pass | |
| Team service, adapter and plan | Pass | Pass | Pass | Pass | |
| Three coordinator commit methods and Team append types | Pass | Pass | Pass | Pass | |
| Root `messages` mirrors and `replace*` callbacks | Pass | Pass | Pass | Pass | |
| Release-time `assertDeliveryAllowed` | Pass | Pass | Pass | Pass | No await between commit and release (verified) |
| `InterAgentMessageRouter`, `TaskAgentExecutionRegistry.reserveInput` | Pass | Pass | Pass | Pass | Test retargeted; allow-list updated |
| Duplicate `admit()` checks | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Commit contract, Team facade, message mirrors | No | Pass | Pass | Rejection log covers aliases, facade and mirrors |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Three message-history files; raw traces | `Not Affected` | Pass (same stores and validators; envelope construction only moves call site; `sourceEvent` and builders untouched) | Pass | N/A | Pass | AC-013 suites guard byte identity |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| D-7 → D-6 → append/port/engine → coordinators → roots → tests → docs | Pass | Pass (no temporary seams; one change) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Port shape | Yes | Pass | Pass | Pass | |
| Coordinator `commitMessageAppend` | Yes | Pass | N/A | Pass | |
| REQ-012 post-durability step | Yes | Pass | Pass | Pass | See implementation notes in Residual Risks |

## Material Premise Validation

Round 2: no new premise. The `assignToExistingCopy` caller is a supported product path in the base code (`delegate_task` with a copy ID), not a reviewer-invented premise.


The two approved post-durability scenarios are established by the approved basis (SCN-014, REQ-012, probe OBS-003) and need no reviewer premise:
- Task closure during the write;
- the recipient stopping input during the write.

The reviewer considered two further premises. Neither drives a finding:

### `MP-001` — A history-event publication throw after durability now leaves the reservation uncommitted

- Related approved requirement or established contract: REQ-008 (events/presentation), REQ-012 ("genuine post-durability failures still fail-stop as today").
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: System.
- Independent product-supported initiating trigger or applicable governing contract: none. A synchronous event publisher throwing is not a supported runtime event; publishers are in-process event sinks.
- Support evidence: none found.
- Forward production path: none supported.
- Lifecycle preconditions and material consequence: if it happened, the coordinator still fail-stops and terminates the root, as today. The only difference is that the recipient entry is cancelled instead of released into a terminating root.
- Reachability: `Not Reachable` (as a supported scenario).
- Review consequence: none.
  - On the success path, the design moves `publishMessage` before `reservation.commit()`. This is product-invisible: on teammate reservations, `commitReservation` emits only an `admitted` fact to the optional `lifecycleObserver`. Teammate reserve callers pass no options (`root-agent-execution-registry.ts:208`, `standalone-root-message-delivery.ts:159`, Team chain). Command observers react only to `forwarded`.

### `MP-002` — Team indeterminate-write error text changes

- Related approved requirement or established contract: REQ-008 ("history-write failure outcome"); cross-cutting invariant on caller-visible messages.
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: Operational / infrastructure.
- Independent product-supported initiating trigger or applicable governing contract: none supported. `renamed_finalization_indeterminate` is a filesystem finalization failure after the rename. SCN-015 covers only `not_renamed`.
- Support evidence: none. The existing code handles it defensively, which does not establish product support.
- Forward production path: Team coordinator latches fail-stop. Today the adapter throws `Error("Team message finalization is indeterminate at '<stage>'.")`. Target: `TeamRunPersistenceFinalizationIndeterminateError` ("TeamRun 'communication_messages' finalization is indeterminate at '<stage>'.").
- Lifecycle preconditions and material consequence: the root fail-stops and terminates in both cases. Only the sender's tool-error text differs. No test asserts the old text.
- Reachability: `Not Reachable` as a supported product scenario.
- Review consequence: non-blocking note (RR-001).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 2). SR-004 applies to `46e94fdea`, and V-1..V-4 are proportionate. Round 1 also passed:
- The behavior basis is confirmed.
- The design is concrete and actionable in the current codebase.
- No in-scope machinery depends on an unsupported premise.

## Findings

No blocking findings. Round 2 adds three non-blocking notes (`Within Approved Scope`; none changes approved behavior):

- **AR2-NB-001 — new engine caller not in the package inventory.** `assignToExistingCopy` (all three roots, `1e5d757a9`) delivers Task work through `deliverToRunId` → the unified engine. Required (implementation, docs):
  - name it as a DS-001/DS-003 entry in the implementation handoff;
  - include its suites (existing-copy assignment / `delegate_task` with a copy ID) in the V-1 named set and in the AC-014 run;
  - have V-3 assert one accepted delivery through it per root;
  - describe it in the D-8 docs (REQ-011: "the real input and delivery path").

  Protects REQ-008 and REQ-011. No design change: the engine contract is unchanged.
- **AR2-NB-002 — V-2 needs a deterministic clock.**
  - `messageId` hashes `createdAt` (`root-communication-engine.ts` `messageId`), and the history file stores `createdAt`.
  - Record the baseline values and run the new code under the same frozen system time and the same inputs. Otherwise the "compare against baseline-recorded values" gate cannot pass byte-for-byte, or invites normalizing away the bytes it should protect.
  - Protects REQ-013 / AC-013.
- **AR2-NB-003 — base and evidence accuracy.**
  - The base moved 87 commits (not 45), and in-scope root files changed beyond the rename (see Round 2).
  - `origin/personal` has since advanced to `d28c56d5d`, with context-file changes only.
  - When cherry-picking `3e78b455e`, expect conflicts in the root files and the three message-delivery services, not only the two tests. Keep the base's `assignToExistingCopy`/`delegateToNewCopy` code intact.
  - Rebase onto the current `origin/personal` before finalization, as usual.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules); informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

Round 2 status of the round-1 notes:
- RR-001, RR-003 and RR-004 still apply. The handoff carries them.
- RR-002 is resolved: BEH-008 is aligned with REQ-012, and the user re-confirmed the scope (with REQ-012's recipient-stopped wording) on 2026-10-10.
- R-3, a recorded residual (untyped throw before a configured handle exists), stays out of scope.

Non-blocking notes and implementation guidance (round 1):

- **RR-001 (MP-002):** the Team indeterminate-write error text changes when it is unified into the typed thrown error. This happens only on an infrastructure failure, and the root fail-stops either way. Two acceptable options:
  - the implementation keeps the old text in the thrown error; or
  - the change is accepted and noted as product-invisible.

  Code review should not treat it as unexplained drift.
- **RR-002 (approval visibility):** SR-004's "evidence-only" REQ-012 wording adds the recipient-stopped case to the approved SR-003 wording ("A Task closing … handled per DEC-001"). That case is the recipient runtime failing, or root shutdown, during the write, and the outcome becomes `AGENT_RUN_NOT_ACCEPTING_INPUT` instead of root fail-stop.
  - It is the same defect class and falls within the user's delegated choice, so it is not a review blocker.
  - The Solution Designer should make it visible to the user at the next touchpoint.
  - BEH-008 still says "normal rejection with the existing Task-closed code" while REQ-012 now says the sender gets the thrown `TaskDelegationError`. Align the wording in the next requirements touch.
- **RR-003 (implementation guidance for D-4/DS-002):**
  - `prepare()` must not change append state before throwing a scope error, so that `abandon()` cancels the held slot.
  - Pin the `AGENT_RUN_NOT_ACCEPTING_INPUT` message. The existing AgentRun text "AgentRun is not accepting input." is the natural choice.
  - Classifying the closure by error type is acceptable. A `TaskDelegationError` can also come from `reservation.commit()` through the bound execution-admission fence, and the type-based rule rethrows it correctly as Task-closed.
- **RR-004 (Team port `isOpen`):** keep it equivalent to today's Team `accepting` flag, which is closed together with the engine's `closeAdmission`. Do not substitute a broader root predicate such as `isAdmitting()`; that would change which code (`TEAM_RUN_NOT_ACCEPTING_MESSAGES` vs commit conflict) is returned in lifecycle edges.
- **Design-acknowledged risks:** per-root event-order and code drift, and Team/Org REQ-012 established by code reading. These are covered by the required engine suite across three real ports and the per-root real-coordinator REQ-012 tests.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass` (no new premise; MP-001 and MP-002 remain `Not Reachable`)
- Notes:
  - SR-004 applies to `46e94fdea`, and V-1..V-4 are proportionate.
  - Ready for implementation on `codex/agent-input-delivery-simplification-v2`.
  - Apply AR2-NB-001..003. RR-001, RR-003 and RR-004 still apply; RR-002 is resolved.
