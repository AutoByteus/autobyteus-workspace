# Design Review Report — ARCH-REV-006 (SR-021 Lifetime Authority, Membership And Composition)

This report is authoritative for the latest result only. The prior ARCH-REV-005 report (SR-014 basis) is archived byte-exact at `architecture-review-history/arch-rev-005-design-review-report.md` (sha1 `de27f534…`). Earlier history is in `architecture-review-revision-record.md`.

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`. REQ-BL-008 (SD-AP-001 + scoped SD-AP-002) is Approved. The SR-021 status line states no behavior change.
- Upstream Investigation Notes: `investigation-notes.md`, including the new SR-021 section E-079–E-082.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-021 entry.
- Reviewed Design Spec: `design-spec.md`, section "SR-021 Lifetime Authority, Membership And Composition" plus the rows edited in place (header supersession note, DS-003 narrative, Ownership Map, Removal plan, Task-gate bounded spine, Dependency Rules, Interface Mapping, Reuse/Reusable Structures, Final File Mapping, Applied Patterns).
- Supplemental Task Artifacts Reviewed: `solution-design-handoff.md` (SR-021). Triggering evidence: `code-review-report.md` (CRR-024), `code-review-revision-record.md`. `solution-scope-clarification.md` is unchanged and not affected.
- Relevant Solution Revision IDs: **SR-021** (current design delta). SR-014 is the semantic basis; SR-015–020 are evidence only; SR-007/011 are the approval and no-migration basis.
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: **ARCH-REV-006**
- Current Review Round: 6
- Trigger: Solution Designer "Architecture Design Complete (revised)" for SR-021, which follows CRR-024 Fail (Design Impact F04–F07, plus Local Fixes F01–F03). The user authorized routing it to the Solution Designer.
- Prior Review Round Reviewed: ARCH-REV-005, a Pass on SR-014. It does not cover the SR-021 delta.
- Latest Authoritative Round: 6
- Current-State Evidence Basis: I read these source files independently at HEAD `ccb5fbe3`:
  - `task-lifetime-operation-gate.ts`, `task-execution-lifetime.ts`, `root-task-lifetime-scope.ts`, `root-task-dispatch.ts` and `root-task-execution-lifecycle.ts`
  - `root-task-execution-adapter.ts` and the Team adapter `beginActivation` (stamp at commit)
  - `project-task-service.ts` and `project-task-runtime-release.ts`
  - the input-check call sites in `root-team-run.ts`, `agent-org-run.ts` and `standalone-agent-run-root.ts`
  - `general-process-run-supervisor.ts`, `build-studio-server.ts` and `start-standalone-application-host.ts`
  - the `AgentRunManager.initializeProcessInstance`/`releaseProcessInstance` pattern
  - the e2e studio harness

  I also ran both specified dependency greps on the current tree and on base `10fb6950`, and checked F01's `git ls-files` and `git check-ignore`. I ran no tests and made no source, test or Git changes.

## Routing Classification Review

- Task size: **Large**. Architectural risk: **High**.
- Classification rationale reviewed: the cumulative package (persisted lifetime fence, multi-root admission/release, provider teardown) remains Large/High. The SR-021 delta changes the closure/admission fence, cross-subsystem dependency direction and the release-reporting contract, which is exactly the High-risk surface.
- Independent Architecture Review required by the classification: **Yes**.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**
- Approved intent understood: a Manager delegates saved Tasks by ID. Explicit DONE atomically closes the Task's lifetime and starts platform-owned release of only that lifetime's owned runtime forest. Restart keeps closed lifetimes fenced. Repeated DONE retries cleanup. Helpers are per lifetime. Ordinary tool output is business-only. SR-021 changes none of this.
- Relevant existing behavior confirmed in source:
  - Closure is held in three places: durable `completedAt`, the private `TaskLifetimeOperationGate` in `ProjectTaskService` (`:47,114,185-199,203`), and the per-root `closed`/`fences` (`root-task-lifetime-scope.ts:8-9,16-28,55-56`).
  - The gate's `drain()` has no production caller.
  - Three builders default to `getProjectTaskService()`, and Projects calls `getActiveCollaborationRootDirectory()`.
  - Release unions requested, registered and stamped refs, then filters its result to requested (`:85-87`).
- Scope guardrail: in scope are the CRR-024 F04–F07 ownership/dependency corrections and the F01–F03 local fixes. Out of scope: any behavior, policy, persisted shape or migration change. Preserved: DONE/fence/retry/restart/helper/unlinked semantics and the LLM business contract. Review authority: technical only.
- Every prospective blocking Design Impact finding traceable to approved IDs: N/A, because there are no blocking findings.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment | Trigger / Current Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-003/005 (saved/inherited dispatch, reserve-before-resource) | User/System | Pass | Pass: `delegate` → `lifetimeScope.acquire` → `dispatchTaskCopy` → `reserveExecution` (durable check under lock) → commit (stamp) | Pass: `gate.admit` replaces `acquire`. Reservation keeps its durable under-lock check (`assertLifetimeOpen`), so removing the Task-side latch from `reserveExecution` leaves the DONE-wins race decided by the same atomic file. | Confirmed | — |
| BEH-006 (DONE atomic closure + release initiation) | User | Pass | Pass: `updateTask` commit callback latches, then `releaseEffect.initiate` | Pass: the commit callback calls the injected listener, which latches the one gate synchronously before any release await. The release request is injected and `null` maps to pending UNAVAILABLE. | Confirmed | — |
| BEH-007 (scoped force release, retry, restart-closed fence, input fence) | User/System | Pass | Pass: all root inputs pass `withLiveLease` → `acquireForAgent` before the synchronous checks. Configured-handle checks apply only to owned agents made live by dispatch or restore, both of which admit first. | Pass: `confirmClosed` → cancel → exact force release → report. The cancel-then-release order is unchanged. Synchronous `assertOpen` is CLOSED/UNAVAILABLE process-wide. After a restart, `admit` reads durable closed. | Confirmed | — |
| BEH-009 (lifetime helper) | System | Pass | Pass: `ensureLifetimeHelper` → acquire → dispatch | Pass: same flow with `admit`. The `admission.release()` calls are removed. | Confirmed | — |
| BEH-010 (business-only LLM contract) | User | Pass | Pass: CRR-024 F02 text in `agent-team-collaboration-llm-contract.ts` | Pass: F02 removes the mechanics sentences and keeps the work-source and post-DONE business notes. | Confirmed | — |
| BEH-001/002/004/008 | — | Pass | Not touched by SR-021 | Unchanged | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope | Linked | Complete | Consistent | Status/Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| solution-design-handoff.md (SR-021) | Pass | Pass | Pass | Pass | Pass (design-only; REQ-BL-008 Approved) | — |
| solution-history/sr-021-prior/ (5 archived Designer docs) | Pass | Pass (handoff) | Pass | N/A (history) | Pass | — |
| CRR-024 code-review-report.md (triggering, externally owned) | Pass | Pass | Pass | Pass (F01–F07 mapped 1:1 in SR-021 §1–§5) | Pass | — |

The design spec header (line 4) states that SR-021 supersedes older prose mentioning an admitted count/drain, a Task-service gate or per-root fences. I found no remaining contradiction. Line 554 ("preparation drain") and the stderr/ACP "drain" mentions refer to provider preparation settlement, not the removed gate drain.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | SR-021 §7 | — |
| Root cause explicit and evidence-backed | Pass | Boundary/Ownership Issue (duplicate state owners, two-way dependency) plus unused machinery. Matches E-079–E-082 and my source read. | — |
| Refactor decision explicit | Pass | Refactor now. Net deletion of three closure holders and three service-locator defaults. | — |
| Decision reflected in concrete sections | Pass | §1–§6 plus in-place Ownership/Dependency/Interface/File/Removal rows | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-002 dispatch | admit → plan → register → reserve → prepare → commit/stamp → seed | Pass | Pass | Pass | Pass | Pass (gate = runtime closure; Task service = durable reservation) | Pass | Pass |
| DS-003 DONE/release | Task commit → listener latch → effect → injected root request → scope release → report → Task reconciliation | Pass | Pass ("nothing waits for continuations to drain") | Pass (composition binds; Projects owns pending policy) | Pass | Pass | Pass | Pass |
| Task-gate bounded spine (SR-021) | unknown → confirmed-open → closed | Pass | Pass | N/A | Pass | Pass (one process instance) | Pass | Pass |
| DS-004/005/007/008 | unchanged | Pass | Pass | Pass | Pass | Pass | Pass | Pass (retained from ARCH-REV-005) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ProjectTaskService (durable closure + membership) | Pass | Pass | Pass | Pass | No runtime latch. It notifies through the neutral listener and releases through the injected request. |
| TaskLifetimeGate (runtime closure) | Pass | Pass | Pass | Pass | Roots call `admit`/`assertOpen`/`confirmClosed`; only the composition wires `onLifetimesClosed`. |
| RootTaskLifetimeScope | Pass | Pass | Pass | Pass | Stateless over adapter + `TaskLifetimeRuntime`. |
| Composition binding | Pass | Pass | Pass | Pass | The one place both sides are known; holds no state. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| projects/** → agent-collaboration | Pass | Pass | Pass | Pass | Neutral contracts only (`task-execution-lifetime`, `task-execution-reference`, `root-execution-identity`). Today Projects also imports `parseTaskLifetimeStamp` and `createRootExecutionIdentity` from those same neutral files, which is allowed. |
| runtime subsystems → projects/** | Pass | Pass | Pass | Pass | Grep 1 on the current tree hits exactly the three builder imports the design removes. Grep 2 hits exactly the gate class and the root-directory import it removes. Base has no runtime → projects match, so both greps can be met without out-of-scope edits. |
| hosts → composition → supervisor → builders | Pass | Pass | Pass | Pass | Both hosts already construct roots only via `createGeneralProcessRunSupervisor`, which takes collaborators as input. |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TaskExecutionLifetimePort.readLifetimeClosure` | Pass | Pass | Pass (lifetimeId; unknown → INVALID) | Low | Pass |
| `TaskLifetimeGate.admit/assertOpen/confirmClosed/onLifetimesClosed` | Pass | Pass | Pass | Low | Pass |
| `TaskLifetimeReleaseReport {requested, unrequested}` | Pass | Pass | Pass (exact `TaskExecutionReference` per outcome) | Low | Pass |
| `TaskRootReleaseRequest → report \| null` | Pass | Pass | Pass (root, lifetimeId, refs) | Low | Pass |
| `recordCleanup(lifetimeId, root, report)` | Pass | Pass | Pass | Low | Pass. See note N3: the dispatch catch path is also a caller. |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Process composition | Pass | Pass | Pass | Pass | Reuses the `src/compositions/` folder and the supervisor input pattern. |
| Process singleton lifecycle | Pass | Pass | Pass | Pass | Reuses the `initializeProcessInstance` pattern. See note N2 on its release half. |
| Runtime closure | Pass | Pass | Pass | Pass | Replaces the gate class; it is not an additional one. |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-collaboration/execution/task | Pass | Pass | Pass | Pass | Gate, neutral contract and report |
| projects/services, projects/runtime | Pass | Pass | Pass | Pass | Durable authority, pending policy, reconciliation |
| compositions | Pass | Pass | Pass | Pass | Binding only |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File Choice | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-lifetime runtime closure gate | Pass | Pass | Pass | Pass | No per-root copy, no count/drain |
| `TaskLifetimeRuntime {port, gate}` | Pass | Pass (runtime-side file; Projects never imports it) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | No Redundancy | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskLifetimeAdmission {lifetimeId, assertOpen}` | Pass | Pass (`release` removed) | Pass | N/A | Pass | — |
| `TaskLifetimeReleaseReport` | Pass | Pass | Pass (registered-unreserved excluded and owned by dispatch) | N/A | Pass | — |
| Port shape | Pass | Pass (three closure methods collapsed to one durable read) | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| task-lifetime-gate.ts (Add; replaces task-lifetime-operation-gate.ts) | Pass | Pass | Pass | Pass | — |
| task-execution-lifetime.ts (Modify) | Pass | Pass | Pass | Pass | — |
| root-task-lifetime-scope.ts / root-task-dispatch.ts / root-task-execution-lifecycle.ts | Pass | Pass | Pass | Pass | — |
| project-task-service.ts / project-task-runtime-release.ts | Pass | Pass | Pass | Pass | — |
| compositions/project-task-lifetime-composition.ts (Add) | Pass | Pass | N/A | Pass | — |
| supervisor + three builders + both hosts (Modify) | Pass | Pass | N/A | Pass | `lifetimePort` → `taskLifetimes` rename |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| src/compositions/project-task-lifetime-composition.ts | Pass | Pass | Low | Pass | Sits beside the other host compositions |
| agent-collaboration/execution/task/task-lifetime-gate.ts | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskLifetimeOperationGate` incl. `count`/`drained`/`drain()` | Pass | Pass | Pass | Pass | — |
| Task-service private gate; port `acquireAdmission`/`assertOpen`/`assertClosed` | Pass | Pass | Pass | Pass | — |
| RootTaskLifetimeScope `closed`/`fences` | Pass | Pass | Pass | Pass | — |
| `TaskLifetimeAdmission.release` + 7 call sites | Pass | Pass | Pass | Pass | Verified in source: dispatch `finally`, scope `acquire`/`acquireForAgent` catch, helper existing/pending, lease release/catch. Lease counters stay. |
| Three `getProjectTaskService()` defaults; Projects' root-directory call | Pass | Pass | Pass | Pass | Grep-enforced |
| Silent filter of unrequested outcomes | Pass | Pass | Pass | Pass | — |
| F03 `resolveInRunRecipient` duplicate | Pass | Pass | Pass | Pass | — |
| F01 tracked SDK `dist/` (64) | Pass | N/A | Pass | Pass | See note N1 on the ignore premise |

## Legacy / Backward-Compatibility Verdict

| Area | Compat/Dual-Path Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Gate/port replacement | No | Pass | Pass | No shim for the old port methods |
| Builder `??` defaults | No (removed) | Pass | Pass | An absent binding rejects owned paths `TASK_LIFETIME_UNAVAILABLE`; this is not a fallback to a global. |
| Unbound Task service when uninitialized | No | Pass | Pass | This is today's truthful no-root pending result, not an old-version path. |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Project array / lifetime collection | Not Affected (SR-021); SR-011 No Migration retained | Pass | Pass | N/A | Pass | No schema field or record added. The UNLINKED diagnostic is a log only. |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| §6 steps 1–7 (contract/gate → Task service → scope → composition → F01–F03 → self-checks → downstream) | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Gate/port/report shapes | Yes | Pass (TS sketch) | Pass (removed methods listed) | Pass | — |
| Composition binding | Yes | Pass (code sketch) | Pass (greps) | Pass | — |

## Material Premise Validation

### RV-MP-014 — The process-wide `assertOpen` (UNAVAILABLE if never admitted in this process) is no weaker than the per-root fence for supported inputs

- Related contract: REQ-007–009 input/restore fence; BEH-007.
- Initiating basis kind: User/System. An operator sends input or a message to an owned agent, or an owned agent runs its next turn or tool step.
- Forward path:
  - Every root entry (`deliverInterAgentMessage`, `deliverExactAgentMessage`, `executeAgentCommand`, Org/standalone delivery) goes through `withLiveLease` → `acquireLiveLease` → `acquireForAgent` → `admit` (durable read plus `assertExecutionLinked`) before any synchronous `assertInputAllowed`.
  - Configured-handle synchronous checks run only for owned agents that are live. Those became live only through dispatch (`admit` in the same root) or `restoreChain` inside `acquireAtHead` (after `acquireForAgent`).
- Divergence premise: root B synchronously accepts input for lifetime L after only root A admitted L, without B's own `acquireForAgent`. **Not Reachable** on the traced paths.
- Consequence: no finding. The design's escalation clause (SR-021 §7) is the correct proportionate response if implementation finds such a path. Do not re-add per-root state.

### RV-MP-015 — Unrequested stamped outcomes in the release report

- Related contract: CRR-024 F07 (CT-OWN), BEH-007 repeated DONE (SCN-006 retry).
- **Already-released link (Reachable)**:
  - Trigger: a user repeats DONE (UI status or `create_or_update_task`).
  - Path: release stops runtime but the tree entry stays (`releaseOwnedExecution` → host `releaseDirectTaskExecution`; the index still lists it). So `ownedExecutions` includes stamped refs whose links are already `released`, while `requested` holds only non-released links.
  - Result: those refs appear in `unrequested` and reconciliation makes no change. The branch is grounded in a supported scenario.
- **Unlinked stamp (Not Reachable under the supported sequence)**:
  - The stamp is written in `commitActivation` only after `reserveExecution` succeeds (Team adapter `beginActivation` → `commit`; same shape in Org/standalone). Registered-unreserved attempts appear in `registeredActivations`, not as stamps.
  - The design adds only one bounded structured log, needed because the report must be handled totally. It adds no record, link, retry or state, so this is not new machinery under DESIGN.md rule 1/4. The union sweep itself predates SR-021 (reviewed ARCH-REV-001/002).

### RV-MP-016 — Task-service process instance initialized twice in one process

- Basis: Operational/Contract.
- Production path: each host process composes once before accepting requests. Electron/standalone restart is a new process.
- Production reachability: **Not Reachable**.
- Test harness: e2e uses `pool: forks` with one studio start per file, so it is not a product witness.
- Consequence: non-blocking guidance N2 only.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass.** The behavior basis is confirmed and SR-021 resolves CRR-024 F04–F07 in design:
- one runtime closure owner, derived from the durable fact
- drain removed, with a coherent cancel + exact release guarantee
- one composition binding, with grep-enforced one-way dependencies
- durable link as membership authority, the stamp as a validated projection, and an explicit report/reconciliation contract

F01–F03 are carried correctly as Local Fixes. No in-scope machinery depends on an unsupported premise.

## Findings

None blocking. Non-blocking implementation notes, which are not upstream rework:

- **N1 (F01 ignore premise is false; Implementation/Delivery note):** SR-021 §5 says to "confirm the packages' existing ignore rules cover `dist/`". Verified false: `git check-ignore -v --no-index` matches nothing for `autobyteus-application-sdk-contracts/dist/*` or `autobyteus-application-backend-sdk/dist/*`, neither package has a `.gitignore`, the root `.gitignore` has no matching rule, and base tracks 0 files there. `git rm -r --cached` (64 files) is still the complete fix for the CRR-024 consequence. After untracking, stage explicitly rather than with blanket `git add -A`, because build output will reappear as untracked. Adding an ignore rule is optional repository hygiene, not required by this design.
- **N2 (Task-service process-instance lifecycle):** follow the whole existing pattern. `initializeProjectTaskServiceProcessInstance` should have a matching release, called on host close and in startup rollback, as the supervisor does for `AgentRunManager`/`AgentTeamRunManager`/`AgentOrgRunManager` (`general-process-run-supervisor.ts:374-392,430-440`). Otherwise an in-process host rebuild fails "already initialized" (RV-MP-016: not a production path). Composition must also run before anything calls `getProjectTaskService()`, so the uninitialized unbound fallback is never memoized in a host process. The design's fail-fast already makes a misordering visible.
- **N3 (port signature callers):** the `recordCleanup(…, report)` change also affects the dispatch catch path (`root-task-dispatch.ts:62`, which becomes `{requested:[outcome], unrequested:[]}`) and `ActiveCollaborationRootDirectory.releaseTaskLifetime?` plus the three root/`TeamTaskExecutionService` `releaseTaskLifetime` return types. §6 step 3 says "dispatch flow is unchanged apart from the admission shape", which slightly understates this. The compiler enforces it.

## Classification

N/A (Pass).

## Recommended Recipient

Primary: the Implementation Engineer, as returned by post-result handoff rules. Then an informational Pass notice to the Solution Designer.

## Residual Risks

- All SR-021 controls are unimplemented. The §6 self-check controls, the two dependency greps, source re-review and the API/E2E recheck on a changed build (DONE fence, retry, restart-closed, helper scope) remain required.
- RV-MP-014 depends on the traced input paths. Any newly found synchronous input check before `admit` is Design Impact (SR-021 §7).
- Provider-private teardown was not re-traced by CRR-024 or by this review. CRR-022/API-REV-017 evidence stands at its recorded layer.
- Internal cleanup records for unregistered roots (after restart or an idle-shut-down host) stay `pending` and never self-resolve. This is truthful and unchanged by SR-021.
- **Delivery DR-002 must not finalize the pre-SR-021 candidate (HEAD `ccb5fbe3`).** Delivery's uncommitted docs/TESTING.md sync (8 modified tracked paths at review time) remains untouched.

## Latest Authoritative Result

- Review Decision: **Pass — SR-021 (ARCH-REV-006)**
- Material-Premise Gate: **Pass** (RV-MP-014 Not Reachable divergence; RV-MP-015 Reachable for the released-link case and Not Reachable for an unlinked stamp, with log-only handling; RV-MP-016 Not Reachable in production)
- Notes: Large/High preserved. This design Pass is not source/API acceptance. N1–N3 are implementation guidance, not upstream rework.
