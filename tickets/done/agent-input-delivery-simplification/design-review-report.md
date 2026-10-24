# Design Review Report — Agent Input Delivery Simplification (SR-007)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/requirements-doc.md`. SR-006, `Approved`; the explicit user approval of 2026-10-24 is recorded in Document Status.
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/investigation-notes.md`. Sections "Complete re-investigation" (RI-1..RI-8) and "Third check on `0216c6fb14`".
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/solution-revision-record.md` (SR-006, SR-007)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/design-spec.md`. SR-007, `Ready`, including "Self-Validation" A1–A16 and C-1..C-4.
- Supplemental Task Artifacts Reviewed:
  - `probes/req-012-task-close-during-append.repro.test.ts` and its run log `probes/req-012-repro-run-0216c6fb14.log`;
  - `follow-ups.md` (FU-001..FU-004);
  - `handoff-sr-007-design.md`.
- Relevant Solution Revision IDs: SR-006 (requirements), SR-007 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3. It is the first review of SR-007. ARCH-REV-001/002 reviewed the superseded SR-004/SR-005 design and are history only; their report is archived at `history/design-review-report.arch-rev-002.md`.
- Trigger: `Architecture Design Complete` (SR-007) from `/software_engineering_team/solution_designer`.
- Prior Review Round Reviewed: ARCH-REV-002 (its RR-001/RR-003/RR-004 lessons were rechecked against SR-007 below)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3`, branch `codex/agent-input-delivery-simplification-v3` @ `0216c6fb14` (= `origin/personal` after `git fetch`, 2026-10-24). Paths below are under `autobyteus-server-ts/src/`. Read directly:
  - `root-communication-engine.ts` (whole file);
  - `standalone-root-communication-adapter.ts` (whole file);
  - `services/team-communication/team-communication-service.ts`, `team-communication-adapter.ts` and `team-communication-message-append-plan.ts` (whole files);
  - `standalone-root-persistence-coordinator.ts:100-185`;
  - `agent-org-run-persistence-coordinator.ts:94-116`;
  - `team-run-persistence-coordinator.ts:43-150`;
  - root mirrors and correlation checks: `standalone-agent-run-root.ts:136-139, 175, 222-231, 269, 419`; `agent-org-run.ts:90-92, 121, 171-177, 215, 341, 437-452`; `root-team-run.ts:162-187, 210, 268, 417, 445, 515-538`;
  - `send-message-to-dispatcher.ts:80-100`;
  - `remote-collaboration/inbound/remote-message-receiver.ts:60-120`;
  - `standalone-root-message-delivery.ts:140-160` and the three `acceptFromRemote` call sites;
  - `wc -l` of the root files (515 / 538 / 453).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed:
  - The history-append protocol moves out of three adapters and into the shared engine.
  - The coordinator contract changes on all three persistence boundaries.
  - Post-durability failure semantics change (REQ-012) in lock/held-slot/Task-closure code.
  - Ownership of the message list moves.
  - The change touches 4–5 subsystems, about 20 source files and about 10 test files.

  Confirmed by the code read.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - The change is a behaviour-preserving refactor covering one teammate-delivery implementation (all three entry forms), removal of dead code and data, validation once, and docs.
  - It also includes the approved REQ-012 defect fix. DEC-005 unifies the closure outcome on today's readable before-save refusal.
  - SR-006 records the user's explicit approval of 2026-10-24 (requirements Document Status, line 26). DEC-003, DEC-004 and DEC-005 are part of that approved document.
- Relevant existing behavior and evidence confirmed:
  - **Engine.** It owns `current` and `accepting`, with `refuseUnlessOpen` → generic `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES` (`:214-218`). `refuseOutsideTaskScope` returns `TASK_AGENT_RESOURCE_CLOSED`/`_CONFLICT` refusals (`:23, :224-231`). After the slot is held, the pre-lock check throws (`:200`). The guarded commit/release re-checks scope inside the coordinator's finalize (`:196-198`). `commitSentToRemote` stays accepted with a warning (`:142-157`). `acceptFromRemote` does not publish to the root view (`:180`).
  - **Standalone adapter.** It has two commit paths, each with the open/duplicate check before the lock (`:41, :70`) and a `nextMessages` envelope that nothing reads. The success order is list → mirror → `reservation.commit` → publish (if root view) → present → release (`:87-97`).
  - **Team.** The service keeps its own `accepting` flag. Its only own outcome is `TEAM_RUN_NOT_ACCEPTING_MESSAGES` on `deliver` (`:43-45`); `acceptFromRemote` and the remote send bypass it. The adapter's `isOpen()` reads that flag. The plan checks open/duplicate and resolves log owners under the lock, and its success order is `replaceCurrent` → commit → `COMMUNICATION` → `MEMBER_INPUT` → release. The coordinator returns an indeterminate result, and the adapter throws `Error("Team message finalization is indeterminate at '<stage>'.")` (`:117-118`). The coordinator's root-mismatch branch (`:107-114`) compares IDs from the same root.
  - **Coordinators.** The standalone coordinator writes the package on the first message inside the lock, before the append (`:118-133`). The Org and Team coordinators do not. In all three, `finalize*` fail-stops on any throw.
  - **REQ-012 defect.** It is reproduced: the repro log shows a rejected `RootTaskPersistenceFinalizationIndeterminateError … The Task work for this agent run is closed`.
  - **DEC-005 consumers.**
    - `send-message-to-dispatcher.ts:89-93` rethrows a non-contract error, so the agent sees MCP `-32603`.
    - `remote-message-receiver.ts:87` passes thrown errors to the transport.
    - `assignToExistingCopy` maps a thrown error to `TASK_WORK_NOT_DELIVERED` plus `markFailed`.

    Each consumer already handles the readable refusal on the before-slot path, so unifying on it gives every consumer an outcome it already produces today.
- Scope guardrail confirmed:
  - In scope: UC-001, UC-003 (including SCN-016 remote forms), UC-004, UC-006, UC-007.
  - Out of scope: address resolution (FU-001), the `TeamRun` seam, `AgentRun` semantics, persisted shapes and the "Not Pursued" items.
  - Review authority: as stated in the requirements.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: N/A (no blocking findings).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (RI-4; `admit()` repeats `reserve()`) | Pass (DS-005) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass (no change to `AgentRun`) | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass. Codes and messages become port data, copied byte-for-byte (A5, A6) | Pass | Confirmed | — |
| BEH-004 | User/System | Pass | Pass. Three protocol copies, two commit paths per adapter, drifted lock-time check and dead `nextMessages` all verified | Pass. Entry-form table and DS-001..DS-004 match the code, after C-1/C-4 and the notes AR3-NB-001..004 | Confirmed | Non-blocking precision notes |
| BEH-005 | System | Pass | Pass (router and registry method unused, RI-3) | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass (handles untouched) | Pass | Confirmed | — |
| BEH-007 | Operational | Pass | Pass (`agent_execution.md:401`) | Pass (D-9) | Confirmed | — |
| BEH-008 | System | Pass | Pass (Reproduced on standalone; Team/Org reach the same `finalize*` by code) | Pass. One closure rule, placed in the single append; V-4 is per root with real coordinators | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/req-012-task-close-during-append.repro.test.ts` + log | Pass | Pass (design Guidance, investigation Third check) | Pass (four assertions) | Pass | Pass (evidence; working copy untracked, not to be committed) | — |
| `follow-ups.md` | Pass | Pass (design Change Scope) | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Refactor + Bug Fix; structural triggers named | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination` + `Missing Invariant`; RI-2, RI-5, repro | — |
| Refactor needed now / deferred decision is explicit | Pass | Yes; FU-001..FU-004 deferred with reasons | — |
| Refactor decision is supported by the concrete design sections | Pass | D-1..D-9, entry-form table, DS-004, file mapping, self-validation | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 same-root deliver | Primary | Pass | Pass | Pass (root delivery resolves; engine sequences) | Pass | Pass | Pass | Pass |
| DS-002 remote receive | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 remote send record | Primary | Pass | Pass | Pass (`RemoteMessageSend` order kept) | Pass | Pass | Pass | Pass |
| DS-004 append protocol | Bounded local | Pass | Pass | Pass (engine semantics; coordinator lock/durability) | Pass | Pass | Pass | Pass (AR3-NB-001/002) |
| DS-005 admission | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootCommunicationEngine` | Pass | Pass (append and slot lifecycle private to the engine) | Pass (no slot commit outside the engine) | Pass | — |
| Coordinator `commitMessageAppend` | Pass | Pass (lock, store, latch) | Pass | Pass | — |
| `TeamRun` | Pass | Pass | Pass (port reaches only `reserveDirectAgentInput`) | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Communication module → none of the roots | Pass | Pass | Pass | Pass | The ports import their own root's coordinator and builders |
| Coordinators → append types only | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Engine `deliver / acceptFromRemote / prepareRemoteSend / commitSentToRemote` | Pass | Pass | Pass | Low | Pass (signatures unchanged) |
| `RootCommunicationPort` (facts and effects; `rejections.deliverNotAccepting` per C-1) | Pass | Pass | Pass | Low | Pass |
| `<Coordinator>.commitMessageAppend(append)` | Pass | Pass | Pass | Low | Pass |
| `RootMessageAppend` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Append protocol | Pass | Pass (generalizes the Team plan, the stricter form) | Pass (`root-message-append.ts` replaces three copies) | Pass | — |
| Recipient builders, `messageLogOwners`, stores, latches | Pass | Pass (reused unchanged) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/communication` | Pass | Pass | Pass | Pass | Engine, port type, append |
| Root subsystems (standalone, Org, Team + `services/team-communication`) | Pass | Pass | Pass | Pass | One port file each; coordinator method |
| `agent-execution/input` | Pass | Pass | Pass | Pass | Removal only |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Append protocol (3 owners, 5 methods) | Pass | Pass | Pass (engine) | Pass | — |
| Commit result (thrown vs returned indeterminate) | Pass | Pass (`RootMessageAppendResult`; indeterminate thrown by each coordinator with its own text) | Pass | Pass | A7 / V-3 |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RootMessageAppend` (optional receiver) | Pass | Pass (no root ID, no `nextMessages`) | Pass | Pass (one shape with an optional receiver part for the send record) | Pass | — |
| Port `rejections` | Pass | Pass | Pass | N/A | Pass | `deliverNotAccepting` (C-1) supersedes the example's `notAccepting` |
| Message list | Pass | Pass (mirrors removed) | Pass (derived-consumer table) | N/A | Pass | AR3-NB-003 |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `root-message-append.ts` (new) | Pass | Pass | Pass | Pass | — |
| `root-communication-port.ts` (renamed) | Pass | Pass | Pass | Pass | — |
| Three per-root port files (new) | Pass | Pass | Pass | Pass | They keep the over-limit root files from growing |
| Three coordinators + Team contract | Pass | Pass | Pass | Pass | AR3-NB-002: package creation is standalone-only |
| Three root files | Pass | Pass | Pass | Pass | Must not grow; mirrors removed |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New and renamed files beside the files they replace | Pass | Pass | Low | Pass | No new folders |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Two adapters; Team service, adapter and plan | Pass | Pass | Pass | Pass | — |
| Three coordinator methods and Team append types | Pass | Pass | Pass | Pass | — |
| `nextMessages` | Pass | N/A | Pass | Pass | Verified unread |
| Team coordinator root-mismatch branch | Pass | N/A | Pass | Pass | Verified: same-root IDs only |
| Root mirrors and `replaceMessages`/`replaceSnapshot` | Pass | Pass (`engine.getMessages()`) | Pass | Pass | AR3-NB-003 (correlation checks) |
| Engine guarded wrapper and post-reserve pre-lock check | Pass | Pass (append) | Pass | Pass | — |
| `InterAgentMessageRouter`, `TaskAgentExecutionRegistry.reserveInput`, `admit()` duplicates | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Adapters, facade, mirrors, thrown closure form | No | Pass | Pass | Rejection log present |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Append-only message logs, initial package files, raw traces | `Not Affected` | Pass. The same `store.appendMessage`/`writeMessages`/`writeTree` calls; log owners via `messageLogOwners` | Pass | N/A | Pass | V-2 with a frozen clock. For standalone/Org, log-owner resolution moves under the lock (Team's form); identical outside a race (AR3-NB-002) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Baseline contract (V-1..V-3) → repro red → D-8/D-7 → append/engine → coordinators → ports/roots → tests (repro green, V-4) → docs → full-suite comparison | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Port shape | Yes | Pass | Pass (port inside root files rejected for size) | Pass | `deliverNotAccepting` per C-1 |
| Append protocol (DS-004 pseudo) | Yes | Pass | N/A | Pass | AR3-NB-001 aligns it with C-2 and the entry-form table |
| Conflict texts | Yes | Pass (byte-for-byte) | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `PREM-301` — Task closure after the recipient's slot is held, before the save (DEC-005 trigger)

- Related approved requirement or established contract: REQ-012, DEC-005.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `Operational` (an operator or delegator closes the Task) racing `System` (an agent sends a teammate message).
- Independent product-supported initiating trigger: the Task is set DONE/CANCELLED (a supported Task action, SCN-010) while a member's `send_message_to` is in flight (SCN-005).
- Support evidence: the engine's own two-stage handling. The closure is refused before the slot (`:82-83`) and thrown after it (`:200`).
- Forward path: `deliver` passes the scope check → `reserveRecipientInput` awaits (a not-started member starts here, SCN-008, which can take seconds) → the Task closes → the post-reserve `assertAllowed()` throws `TaskDelegationError` → the dispatcher rethrows it → the agent sees `-32603`.
- Lifecycle preconditions and material consequence: the sender sees an opaque internal error for an ordinary closure that, a moment earlier, would have been a readable refusal.
- Reachability: `Reachable`.
- Review consequence: DEC-005 is grounded. The unified refusal is an outcome every consumer already produces on the before-slot path. No new machinery.

### `PREM-302` — A refused or conflicting first message to a standalone run with no package yet

- Related approved requirement or established contract: REQ-013 (no persisted change); A8.
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger: a run started by a peer node has no package until its first message (`standalone-root-persistence-coordinator.ts:118`). The root starts closing at the same time as that first message.
- Support evidence: the coordinator code; the engine's open check runs at entry, so only a race remains.
- Forward path: today the open/duplicate check runs before the lock, so a message that passes it creates the package and is appended even if the root closes in between. Under SR-007 as written, the package is created inside the lock, then `prepare()` may refuse the message.
- Lifecycle preconditions and material consequence: only in a race with root closing, and no worse than today. Package files written for a closing root are valid package files.
- Reachability: `Reachable` (race only).
- Review consequence: non-blocking. AR3-NB-002 recommends running `prepare()` before package creation, so that a refused message writes nothing. It is simpler and needs no new state.

MP-001/MP-002 from the archived round are not reused: SR-007 states the publish/present order and the Team indeterminate text explicitly (A1, A7, V-3).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`.
- The behavior basis is confirmed against `0216c6fb14`.
- The design is concrete and actionable.
- The self-validation is accurate.
- No in-scope machinery depends on an unsupported premise.

## Findings

No blocking findings. Non-blocking precision notes (`Within Approved Scope`; none changes approved behavior; apply them in implementation):

- **AR3-NB-001 — Make the DS-004 mapping and branches agree with C-2 and the entry-form table.** (Protects REQ-008, REQ-012; A2, C-2.)
  - DS-004 maps "refused / task_closed → TASK_AGENT_RESOURCE_CLOSED refusal". C-2 says each check returns the error's own refusal code from `DELIVERY_REFUSAL_CODES` (`CLOSED` or `CONFLICT`) with the error's own message. Implement C-2 at all three checkpoints (before the slot, under the lock, after durability).
  - DS-004's closure branches say "publish to the root view" unconditionally. They must publish only when the entry form publishes: `acceptFromRemote` never does (A2).
- **AR3-NB-002 — Coordinator order and package creation.** (Protects REQ-013, A8.)
  - Package creation exists only in the standalone coordinator (`:118-133`), not in Org. The design's "standalone/Org only" is inaccurate.
  - Recommended: in the standalone `commitMessageAppend`, run `append.prepare()` before package creation and call `cancelBeforeDurability` if creation fails. A refused message then writes nothing, as with today's pre-lock check (PREM-302).
  - Log-owner resolution moves under the lock for standalone/Org (Team's form). V-2 covers the bytes.
- **AR3-NB-003 — Root correlation checks when the mirrors go.** (Protects A10, C-4.)
  - The Team `assertRootCorrelation()` runs from `replaceTree` as well as `replaceMessages` (`root-team-run.ts:521-537`). Keep its tree half on `replaceTree`, and check the messages half once on the loaded input.
  - Org `assertCorrelation()` (`agent-org-run.ts:437-442`) and the standalone constructor check (`:139`) keep checking the loaded messages' root ID.
- **AR3-NB-004 — State the "open" predicate used in `prepare()`.** (Protects RR-004 / A11.)
  - It is `engine.accepting && port.isOpen()`. With the Team port's `isOpen()` returning `true` (C-4), the engine flag is what keeps today's under-lock Team check.
  - Keep `deliverNotAccepting` at the same first position in `deliver` where the Team service's pre-check is today.
- **AR3-NB-005 — Approval citation consistency.** (Artifact hygiene; non-blocking.)
  - The design-spec "Approval basis" and the requirements "Approved Basis Ready For Design" line still cite only the Solution Designer's approval. Requirements Document Status records the explicit user approval of 2026-10-24. Cite it in both places at the next touch.
  - SCN-016 is missing from UC-003's scenario list.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass rule). The Solution Designer receives an informational notice.

## Residual Risks

- Per-root code, text and event-order drift: covered by the V-3 baseline contract recorded before any change. Copy rejections byte-for-byte.
- The REQ-012 behaviour is Reproduced only on standalone. V-4 must run each root kind with real coordinators, including the counterpart where a publish/present throw still fail-stops.
- After a REQ-012 closure, the record is kept and published to the live root view while the sender sees a refusal. This is the accepted trade-off: the live view matches the stored log after a reload.
- Root file size: `standalone-agent-run-root.ts` (515) and `root-team-run.ts` (538) must not grow. The port factories and mirror removal make this feasible.
- FU-001..FU-004 stay outside this ticket. FU-004 (opaque `-32603` on other thrown errors) remains for non-closure throws.
- Archived lessons: RR-001 (Team indeterminate text) is now A7/V-3; RR-003 (`prepare()` must not change state before a throw, and must pin the `AGENT_RUN_NOT_ACCEPTING_INPUT` text) is now C-3 plus `dropSlot`; RR-004 is now A11/AR3-NB-004.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-003)
- Material-Premise Gate: `Pass` (PREM-301 Reachable, grounds DEC-005; PREM-302 race only, non-blocking)
- Notes: SR-007 is ready for implementation on `codex/agent-input-delivery-simplification-v3` @ `0216c6fb14`. Apply AR3-NB-001..004 in implementation; AR3-NB-005 is artifact hygiene for the Solution Designer.
