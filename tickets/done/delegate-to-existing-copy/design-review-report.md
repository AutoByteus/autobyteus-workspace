# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/requirements-doc.md` (Approved SR-003; SR-006 restored the approved REQ-003 text; AC-018 verifies behavior REQ-004 already allows)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-spec.md` (SR-006, Ready)
- Supplemental Task Artifacts Reviewed: None (the package declares none; investigation-notes inventory says None)
- Relevant Solution Revision IDs: SR-003 (requirements baseline), SR-004 (design), SR-005 (round 1 resolutions), SR-006 (round 2 resolutions)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer revised package SR-006 (handoff section "SR-006 — Round 2 Resolutions"), 2026-10-09
- Prior Review Round Reviewed: Round 2 (ARCH-REV-002, Fail: AR-001 open, AR-005 new)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/delegate-to-existing-copy` at base `048ea6cec` (no source changes yet). Read directly: `projects/services/task-agent-resource-service.ts`, `projects/services/project-task-service.ts`, `projects/domain/task-agent-resources.ts`, `projects/stores/task-agent-resource-schema.ts` (+ store `update` re-parse at l.63), `projects/runtime/task-agent-resource-release.ts`, `projects/services/task-root-view-builder.ts`, `agent-collaboration/execution/task/{root-task-execution-lifecycle,root-task-agent-resource-scope,task-agent-resource-port,root-task-execution-adapter,task-execution-closure,task-execution-reference}.ts`, `agent-team-execution/domain/root-team-run.ts` (l.290-350), `agent-team-execution/domain/root-team-run-materialization-gate.ts`, `standalone-agent-run-root/services/standalone-root-message-delivery.ts`, `agent-communication/services/global-agent-run-message-router.ts`, `agent-collaboration/execution/services/active-collaboration-root-directory.ts`, `compositions/project-task-agent-resource-composition.ts`, `agent-tools/project-tasks/project-task-tool-manifest.ts`, `docs/modules/projects.md`, repo `DESIGN.md`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Yes. The change spans the Task side, the root-neutral lifecycle, three root kinds, two agent-facing tool contracts (clean break), docs, a cross-repo skill and a ~55-file rename. It also changes the core one-Task-per-copy ownership invariant and adds cross-Task concurrency (reopen versus new assignment, DONE versus new assignment).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The behavior map is accurate, and in round 3 every row is Confirmed.
- Approved requirements / intended behavior understood: Yes. A stays DONE. A new Task B is assigned to the same copy by its own ID, only by the copy's most recent assigner and only when its current Task is closed. DONE never stops a copy that has moved on. IDs are named explicitly. `send_message_to` stays agent-only. `list_project_tasks` gets explicit IDs and `closedAssignments`. Sub-work is described only. Internal names are corrected.
- Relevant existing behavior and evidence confirmed: Yes. Confirmed in code: the single `owners` map and link conflict (service l.207-211), DONE releasing every closed entry (project-task-service l.312), the reactivation queue step (lifecycle l.205-226), the innermost-first chain order (adapter interface doc, l.95-98) with `ownerOf` picking `known[0]`, the strict per-file schema with duplicate rejection (schema l.67-68, re-validated before every write at store l.63), the root's exact delivery restoring the target through its live lease (standalone delivery l.228-235; team delivery l.68/83), the reentrant materialization gate, release decided and invoked synchronously from `closeAndWrite`'s `finally` through the composition into the root scope, and closed-execution listing derived from the Task side.
- Scope guardrail confirmed: Yes (In-Scope UC-001..008; Out of Scope list; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes.
- Remaining material ambiguity, if any: None (round 3). SR-006 keeps every entry, so nothing is deleted, and the approved REQ-003 text is restored.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass (round 3: A → B → A appends a new entry and keeps every earlier one; AR-001 and AR-004 resolved) | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Contract | Pass (round 2: AR-003 resolved; the hint uses the directory across all active roots) | Pass | Pass | Confirmed | — |
| BEH-006 | Contract | Pass (round 2: AR-002 resolved; `assignedBy` kept) | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass (text only, per DEC-006) | Confirmed | — |
| BEH-008 | User | Pass | Pass (`buildTaskRootView` shows a closed entry as closed/offline; closed listing comes from the Task side) | Pass | Confirmed | — |
| BEH-009 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec → Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/Ownership (single-owner map, service l.207-211, swap conflict log l.233-234) + Shared Structure Looseness (`agentRun` holding a team reference, the `agentRunKey` duplicate, tool shape leaking into `ensureTaskHelper` l.150) are all confirmed in code | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Refactor needed now: Yes"; deferrals (persisted names, error codes, child Tasks) are explicit | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Name map, removal plan, S1-S8 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Spawn (preserved) + result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Assign to existing copy | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | DONE/CANCELLED release | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Current-entry derivation (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | `send_message_to` team-run hint | Pass | Pass | N/A | Pass | Pass | Pass | Pass (scope: AR-003) |
| DS-006 | `list_project_tasks` views | Pass | Pass | N/A | Fail (AR-002 field name) | Pass | Pass | Pass (naming: AR-002) |
| DS-007 | Reopened event / run-tree visibility | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskExecutionResourcePort` (`ProjectTaskService`) | Pass | Pass | Pass | Pass | The lifecycle never reads the service or store; new `assertAssignable` / `assignExistingTaskExecution` sit on the port |
| `TaskExecutionResourceService` (current-entry rule) | Pass | Pass | Pass | Pass | Sole owner of the current-entry rule; the raw multi-entry map is not exposed |
| `RootTaskExecutionLifecycle` | Pass | Pass | Pass | Pass | Roots call `assignToExistingCopy` and pass `deliverWork`, mirroring the existing `deliverToExactTarget` closure pattern |
| Root adapters | Pass | Pass | Pass | Pass | One read-only `taskExecutionTargetOf` added |
| Schema module (persisted names) | Pass | Pass | Pass | Pass | The only module that knows persisted names |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool → capability → root → lifecycle → {adapter, port} | Pass | Pass | Pass | Pass | — |
| `ProjectTaskService` → resource service → store/schema | Pass | Pass | Pass | Pass | — |
| Router → root directory boundary (`teamCoordinatorOf`) | Pass | Pass | Pass | Pass | AR-003 may widen the lookup; it must stay on the directory/root boundary, not reach into projects |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `delegate_task` modes A/B/C (strict, mutually exclusive keys) | Pass | Pass | Pass | Low | Pass |
| Tool result union (`delegated` + `target_kind`) | Pass | Pass | Pass | Low | Pass |
| Capability/root `delegateToNewCopy` / `assignToExistingCopy` | Pass | Pass | Pass | Low | Pass |
| `RootTaskExecutionLifecycle.assignToExistingCopy(context, input, deliverWork)` | Pass | Pass | Pass | Low | Pass |
| Port `assertAssignable` / `assignExistingTaskExecution` | Pass | Pass | Pass | Low | Pass (rule completeness: AR-001, AR-004) |
| Adapter `taskExecutionTargetOf(reference)` | Pass | Pass | Pass | Low | Pass |
| Port/service `openAssignments` / `closedAssignments` | Pass | Pass | Pass | Low | Pass |
| Root `teamCoordinatorOf(teamRunId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Wake a closed copy | Pass | Pass | N/A | Pass | Shared `prepareClosedCopyForResume` extracted from reactivation |
| Deliver B's work | Pass | Pass | N/A | Pass | Root exact delivery restores the target through its own live lease; the Team gate is reentrant (counter), so delivering from inside the root command cannot deadlock |
| Run-tree / board visibility | Pass | Pass | N/A | Pass | `publishTaskExecutionsReopened`, Task change feed |
| Entry start lifecycle | Pass | Pass | N/A | Pass | See residual note on post-commit `failed` |
| Copy lookup | Pass | Pass | Pass | Pass | One adapter method per root |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects` (domain/services/stores/runtime) | Pass | Pass | Pass | Pass | — |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| Roots (Team/Org/standalone) | Pass | Pass | Pass | Pass | — |
| `agent-tools/task-delegation`, `agent-tools/project-tasks` | Pass | Pass | Pass | Pass | — |
| `agent-communication` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `DelegatedCopy` / `TaskDelegationOutcome` | Pass | Pass | Pass | Pass | Replaces the inward-leaking tool shape |
| Assignment views (open/closed) | Pass | Pass | Pass | Pass | Agent/Team variants, not a bag of optional fields |
| `buildTaskWorkText` | Pass | Pass | Pass | Pass | One wording for the seed packet and the existing-copy message |
| Resume step | Pass | Pass | Pass | Pass | Private lifecycle method shared by reactivation and DS-002 |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskExecutionResource` | Pass | Pass | Pass | N/A | Pass | `agentRunKey` duplicate removed |
| `DelegatedCopy` | Pass | Pass | Pass | Pass | Pass | — |
| Tool result union | Pass | Pass | Pass | Pass | Pass | — |
| Assignment views | Pass | Pass | Pass | Pass | Pass | Field rename conflicts with REQ-010 (AR-002) |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/domain/task-execution-resources.ts` | Pass | Pass | Pass | Pass | `linkExistingTaskExecution` precondition must cover AR-001 |
| `projects/services/task-execution-resource-service.ts` | Pass | Pass | Pass | Pass | — |
| `projects/stores/task-execution-resource-{store,schema}.ts` | Pass | Pass | N/A | Pass | — |
| `projects/services/project-task-service.ts` | Pass | Pass | N/A | Pass | — |
| Runtime contract/lifecycle/dispatch/input files | Pass | Pass | Pass | Pass | — |
| Root files (3 kinds) and capability builders | Pass | Pass | N/A | Pass | — |
| Router / root directory | Pass | Pass | N/A | Pass | — |
| Tool layer, texts, docs, PTM skill | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Renamed files inside existing folders | Pass | Pass | Low | Pass | No new folders |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Single-owner map, link conflict, swap conflict log | Pass | Pass | Pass | Pass | — |
| `ownerOf` cross-Task throw | Pass | Pass | Pass | Pass | — |
| `agentRunKey` | Pass | Pass | Pass | Pass | — |
| Ambiguous tool/assignment fields, old failure shape | Pass | Pass | Pass | Pass | — |
| Internal use of `DelegateTaskResult` | Pass | Pass | Pass | Pass | — |
| Root `delegateTask` single entry | Pass | Pass | Pass | Pass | — |
| "Always spawns" texts, PTM skill | Pass | Pass | Pass | Pass | Cross-repo |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Tool results / assignment views | No | Pass | Pass | DEC-008 clean break |
| Persisted names mapped at the schema | No | Pass | Pass | Only a current-name mapping, not a dual reader |
| Error codes `TASK_AGENT_RESOURCE_*` kept | No | Pass | Pass | Kept as opaque agent-visible codes; the deferral is recorded |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_run_resources.json` (Project and no-Project Tasks) | Directly Usable — No Migration | Pass (round 3) | Pass | N/A | Pass | Round 3: entries are only ever appended; earlier periods keep their `linkedAt`, `start`/`startError` and `closedAt`. The per-file rule is relaxed to "a copy has at most one open entry, and only its last entry may be open", which every existing file already satisfies (it is a tolerant reader, not a migration). Lookups within a file use the copy's last entry. The Persisted Data rationale ("no entry-meaning change") is now accurate. Downgrade (an older build marks such a file damaged) is unsupported and recorded. Round-2 note, superseded: Existing data stays directly usable, and no migration is needed. However, the SR-005 re-link rewrites the meaning of a stored entry: it becomes "the copy's most recent assignment to this Task" (design-spec, Guidance → "Re-link entry semantics"), and the earlier closed entry (first `linkedAt`, `start`/`startError`, `closedAt`) is dropped. That contradicts the decision's own "no meaning change" rationale and the approved "Acceptable loss: none". |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| S1 mechanical rename (no behavior change) | Pass | Pass | Pass | Pass |
| S2 current entry; S3 assign on the Task side | Pass | Pass | Pass | Pass |
| S4-S6 runtime, roots, tool | Pass | Pass | Pass | Pass |
| S7 docs and cross-repo skill | Pass | Pass | Pass | Pass |

S1 scope (requested focus): the rename covers the Task-execution-resource vocabulary that the feature rewrites anyway. It falls within REQ-014 ("misleading names in the touched delegation/assignment paths"). It is separate from the messaging-domain `targetAgentRunId`, whose targets really are agent runs. It keeps the persisted names and error codes deliberately. Sequencing it first as a commit that changes no behavior is sound. The one exception is the agent-facing `assignedBy` view field (AR-002).

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool results, follow-up call, refusals, assignment view, current entry | Yes | Pass | Pass | Pass | The assignment-view example uses `assignedByAgentRunId` (AR-002) |

## Material Premise Validation

### `MP-001` — A copy is assigned back to a Task whose file already contains that copy (A → B → A)

- Related approved requirement or established contract: REQ-004 (allowed when the sender is the most recent assigner and the current Task is closed); REQ-005 (closed refusal list); REQ-007 / AC-010 (reopening A is refused and the hint names B).
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `Contract` (agent tool contract), user-directed through the Project Task Manager.
- Independent product-supported initiating trigger or applicable governing contract: approved AC-010 itself. After A DONE → B assigned to the copy → B DONE, the PTM moves A to TODO/IN_PROGRESS with `create_or_update_task` and messages the copy. That is refused with a hint naming B as the current Task. The PTM's coherent goal is to have the copy that did A (and knows it) continue A. The supported next action is `delegate_task(target_team_run_id=<copy>, task_id=A)`.
- Support evidence: AC-010 is an approved acceptance criterion that establishes the starting state. `create_or_update_task` status changes and the new mode C are approved agent-facing surfaces (REQ-002, REQ-012).
- Forward target production path: tool mode C → root `assignToExistingCopy` → lifecycle → `taskExecutionTargetOf` (found) → port `assertAssignable`. This passes under the design's listed checks: current entry B is closed, `assigned`, `started`, the sender is its assigner, the current Task is not A, and A is not terminal. The path continues → queue step (copy stopped and discarded) → `assignExistingTaskExecution` → domain `linkExistingTaskExecution(fileA, …)`, which the design defines only for "a copy new to this file". A's file already holds the copy's closed entry, and the schema rejects a second entry (schema l.67-68, re-checked before every write at store l.63).
- Lifecycle preconditions and material consequence at the claimed point: the request either fails with an unspecified conflict that REQ-005 does not list, after the copy's runtime has already been stopped and discarded by the queue step, or implementation must invent a semantic (reuse and reopen A's old entry, which also affects the "latest `linkedAt`" current-entry rule; or allow several entries per copy per file, which changes the persisted invariant). The AC-010 hint also has no defined follow-on action.
- Reachability: `Reachable`.
- Review consequence / proportionate response: AR-001. The design must decide this case explicitly. Either it supports the case, with a defined entry semantic consistent with the current-entry rule and the persisted invariant, or it refuses the case. A refusal adds a REQ-005 reason, so it needs user approval through the Solution Designer.
- Round 2 (SR-005): the premise is unchanged and still `Reachable` (AC-018 now verifies it). The path is now defined: eligibility runs before the queue step, then `relinkExistingTaskExecution` removes the copy's earlier closed entry from X's file and appends a fresh `starting` entry. The new material consequence is that the earlier entry's persisted data (first `linkedAt`, `start`/`startError`, `closedAt`) is deleted from the Task file. The design records this itself ("What is not kept: the earlier entry's first-link time and old start outcome"). That conflicts with the approved data-continuity contract (see AR-001, round 2).
- Round 3 (SR-006): the premise is still `Reachable`, and the consequence is now correct. A new `starting` entry is appended to X's file, every earlier entry of the copy stays unchanged, the current entry is the new one (open), and X's root is the copy (last `assigned` entry). Nothing is deleted. AC-018 verifies this.

### `MP-002` — The copy's current Task file is unreadable when it is assigned a new Task

- Related approved requirement or established contract: REQ-005 ("…its Task data is unreadable" → refused); QR-001 (never two open entries); the existing damaged-file contract (`TASK_AGENT_RESOURCES_UNAVAILABLE`, `assignmentsUnavailable`, `load()` l.43-47).
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `Contract`. REQ-005 explicitly names this refusal, and the product already supports and reports damaged files as a state ("Fix or restore the file and restart").
- Independent product-supported initiating trigger or applicable governing contract: approved REQ-005 refusal clause together with the existing damaged-Task-file operating state.
- Support evidence: `TaskAgentResourceService.load` marks a damaged Task and keeps running. Description-only delegation already refuses when any data is unreadable because "an unowned copy could not be told apart" (lifecycle l.115-116).
- Forward target production path: a damaged file is not swapped into the view, so `entriesByExecution` for the copy holds only its readable entries. If the damaged file is the copy's open current Task, the derived current entry is an older closed entry. `assertAssignable` then passes, and the new entry is committed while the damaged file still records an open entry.
- Lifecycle preconditions and material consequence at the claimed point: the copy ends up with two open entries once the file is repaired. The design then treats that as corruption ("pick latest, console.error"), which violates QR-001 and REQ-005.
- Reachability: `Reachable` under the approved REQ-005 contract (the state is operator-repairable damage that the product explicitly reports).
- Review consequence / proportionate response: AR-004. Map the REQ-005 clause to one existing check: refuse an existing-copy assignment while any Task's resource data is unreadable (the existing `assertResourceDataReadable` pattern). No new machinery.
- Round 2 (SR-005): resolved. `assertAllReadable` is eligibility item 1 and also runs in the commit.

### `MP-003` — Repeated or first DONE of A races the assignment of B (requested focus)

- Related approved requirement or established contract: QR-001 (explicit concurrency requirement), REQ-006, AC-004.
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: `Contract`. The PTM can issue `create_or_update_task(A, DONE)` and `delegate_task(target_*, B)` as parallel tool calls in one turn. QR-001 makes this concurrency an approved requirement.
- Forward path (verified in code): `closeTask(A)` commits A's closed entries under A's lock, then `await write()` (status), then `finally` → `releasableByHostRoot(A)` → `release` → composition → root scope `releaseTaskAgentResources`. That chain runs synchronously from the `isClosed` re-check through `cancelOwnedExecution` and the `releaseOwnedExecution` invocation. DS-002 checks `assertAssignable` (A closed), then the queue step settles the stop and discards the authority (or refuses `TASK_REACTIVATION_STOP_PENDING`), then commits B under the execution → B lock order, then restores and delivers. If A's `finally` runs after B's commit, the Task-side filter excludes the copy. If it runs between B's queue step and B's commit, the release reaches an already discarded authority, publishes "closed", and B's commit then publishes "reopened". If it runs before B's queue step, the queue step settles it.
- Lifecycle preconditions and material consequence: no supported interleaving leaves the copy stopped while assigned to B. The remaining window depends on each adapter's `releaseOwnedExecution` capturing its authority synchronously at invocation. That is the same profile the earlier reactivation ticket accepted.
- Reachability: `Reachable` (parallel calls); handled by the design.
- Review consequence: No finding. Recommendation R-1: the Risks text says the residual is "limited to repeated-DONE races", but the first DONE racing the assignment is the more likely QR-001 case. Add an explicit QR-001 test for both orders of parallel `DONE(A)` and `assign(B)`.
- Round 2 (SR-005): R-1 addressed. The Risks text now covers both cases, and the tests cover both orders.

### `MP-004` — Delivery fails after B's commit and leaves the copy permanently unassignable

- Related approved requirement or established contract: REQ-005 ("the copy never started").
- Initiating basis kind: System (delivery not accepted after commit: restore or input-reservation failure).
- Forward path: B's entry is marked `failed` (and stays open). If B is later CANCELLED, the copy's current entry is closed with `start: failed`. The design's rule "current entry … started" then refuses every later assignment as "never started", although the copy did start (for A).
- Reachability: `Unclear`. The design itself classes post-commit infrastructure failure as unsupported. No product-supported trigger was established for a post-commit, non-infrastructure delivery refusal.
- Review consequence: No finding. Residual note R-2: REQ-005 says "the copy never started". If the designer touches this rule for AR-001, consider reading it as "no entry of the copy ever started" rather than the current entry only.
- Round 2 (SR-005): R-2 addressed in Guidance (eligibility item 5). The S3 sequence text still states the old rule (AR-005).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001..AR-005 are resolved; verification is recorded in `architecture-review-revision-record.md` (ARCH-REV-002 for AR-002..004; ARCH-REV-003 for AR-001 and AR-005).

## Classification

N/A (Pass)

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass handoff); informational pass notice to `/software_engineering_team/solution_designer`

## Residual Risks

These are for implementation and code review; none blocks the pass.
- Schema rule (AR-001): implement exactly "at most one open entry per copy, and only its last entry may be open", with the unit cases listed in Guidance (two closed + last open accepted; two open, or an open non-last entry, rejected). Every lookup within a file (settle, reopen/`assertReopenable`, inherited-link creator check, `entriesByExecution`) must use the copy's last entry. A first-match `find` left in place would act on a stale period.
- `releasableByHostRoot`: dedupe per copy and include only current entries; earlier periods never trigger a stop.
- Text consistency: the design-spec Persisted Data "Constraints" bullet and the Risks bullet "Downgrade after reuse is unsupported" still give only the one-owner consequence. The extended note (an older build marks a file with two entries for one copy as damaged) is in the Rationale. Both say unsupported, so this is not a contradiction. Carry the extended note into `projects.md` in S7.
- Release window (MP-003 / R-1): depends on each adapter's `releaseOwnedExecution` capturing its authority synchronously at invocation; the same profile as accepted reactivation; tests cover both orders.
- AR-003: an inactive root's team run gets the existing not-active refusal (parity with agent run IDs). AR-004: any damaged Task file blocks existing-copy assignment (same as today's description-only rule).
- AC-008: try the other reference kind and member lookup to produce the specific refusal messages.
- Cross-repo PTM skill must ship with the server change; the S1 rename is a pure first commit.

## Requested-Focus Summary

- Current-entry ownership rule: sound. Entries are append-only, so file order equals link order and the latest `linkedAt` identifies the current entry.
- DONE versus new-assignment race: sound (MP-003); tests cover both orders.
- Lock order: sound. Execution key → Task ID for assign and reopen; `closeTask` takes only the Task ID; keys cannot collide.
- Innermost-owner rule: sound (the chain is innermost-first; only the cross-Task throw is removed).
- S1 rename scope: sound and within REQ-014; the agent-facing `assignedBy` is kept.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Reachable and correctly handled; MP-002 handled by AR-004's resolution; MP-003 Reachable and handled; MP-004 Unclear, addressed by R-2 without new machinery)
- Notes: Round 3. AR-001 is resolved by the history-preserving append rule, with the approved REQ-003 text restored. AR-005 is resolved by S3 pointing to the single eligibility list and entry rule. The behavior basis is confirmed, and the design is ready for implementation.
