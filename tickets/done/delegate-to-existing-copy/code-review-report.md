# Code Review Report

> **Latest authoritative round: 4, Implementation Review after a delivery-stage Local Fix, Targeted Delta Review (CRR-005): `Pass`.** Round 4 comes first. Rounds 3, 2 and 1 follow as history. The round-1 structural checks and scorecard carry forward, as amended in round 3.

## Round 4 — Implementation Review (Targeted Delta Review, delivery re-entry)

### Review Round Meta

- Review Entry Point: `Implementation Review` (re-entry after a delivery-stage Local Fix)
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: 4
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence:
  - Commit `17a5f2125` changes only two test files (+8/−5); there is no source change.
  - The integration merge `97b767186` touched two feature source files, `standalone-agent-run-root.ts` and `standalone-root-message-delivery.ts`. I checked their resolution below.
- Trigger: implementation_engineer, IR-003, Local Fix requested by delivery (DR-001) after base integration
- Delivery Revision Record Reviewed: `delivery-revision-record.md` (DR-001), `delivery-evidence/dr1-*.log`
- Relevant revision IDs: SR-006, IR-003, CRR-003/004, API-REV-002, DR-001
- Routing classification: Large / High, unchanged.

### What was reviewed

- **Test fix, `17a5f2125`.** The base-added `delegated-copy-member-contact-delegator` tests used the pre-DEC-008 contract.
  - `standalone-agent-run-root.test.ts` now calls `delegateToNewCopy` and expects `{delegated: true, copy: {kind: "team"}}`, plus `{delegated: false, message}` for the refused host delegation. These are the internal outcome shapes at this unit boundary, which is correct.
  - DCM-005 now asserts `delegated: false`, a message, and the absence of all three copy-ID fields. This matches REQ-001 (failure carries no copy ID).
  - The intent of the base tests is preserved. No assertion was weakened.
- **Merge resolution, `97b767186`.**
  - `standalone-agent-run-root.ts`: the conflict hunk keeps the base's `collaboratorPortFor(viewerAgentRunId)` and this feature's `delegateToNewCopy` / `assignToExistingCopy` / `teamCoordinatorOf`, both under the existing `operationGate`. Correct.
  - `standalone-root-message-delivery.ts`: the base's viewer-scoped `resolveMentions` / `listAvailable` changes auto-merged and don't overlap the delegation methods.
- **Sweep for old shapes.** No `.delegateTask(` root/capability call, `DelegateTaskInput` or `{target_agent_run_id: null}` delegation shape remains in `src` or `tests`. The only `target_agent_run_id: null` is the `send_message_to` result contract, which is an agent run ID and still correct.

### Evidence (reviewer-run)

- `tsc -p tsconfig.build.json --noEmit`: exit 0.
- `vitest run` over the unit layers `standalone-agent-run-root`, `agent-collaboration`, `agent-team-execution`, `agent-org-execution`, `projects`, `agent-communication` and `agent-tools`: 140 files, 1122 tests passed.
- `RUN_AGY_FAILURE_E2E=1 … delegated-copy-member-contact-host.e2e.test.ts` (scripted AGY): passed. The logged `COLLABORATOR_ADD_FAILED` line is an expected refusal inside the suite.

### Candidate Gate (delta)

None. The change is test-only and conforms to the approved contract (REQ-001, DEC-008).

### Findings (Round 4)

None.

### Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass` (unchanged)
- Material-Premise Gate: `Pass` (unchanged)
- Score Summary: 9.3/10, carried forward; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`, per the handoff rule. The proportionate rerun scope is the two changed tests, already passing here, plus whatever post-integration checks delivery owns.
- Notes: the live-gated `agent-initiated-collaborators` and `standalone-agent-collaborator-mention` suites were swept but not run (O-003 context).

---

# Round 3 — Implementation Review (CRR-003), history

## Round 3 — Implementation Review (Targeted Delta Review)

### Review Round Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence:
  - Commit `88e59f500` changes only the CR-001 refusal path: `existing-copy-target.ts` and `root-task-execution-lifecycle.ts`, `assignToExistingCopy` miss branch plus the new private `refuseCopyOutsideTree`.
  - It also touches one runtime test fixture and two unit suites.
  - No shared interface, port contract, data shape or spine node changed. `resolveExistingCopy` is internal, and its only caller is the lifecycle.
- Trigger: implementation_engineer, IR-002 (Local Fix for CR-001 from CRR-002)
- Relevant revision IDs: SR-003, SR-006, ARCH-REV-003, IR-001, IR-002, API-REV-001
- Prior Review Round Reviewed: round 2 (CRR-002, failure origin, Fail / CR-001) and round 1 (CRR-001, Pass)
- Routing classification: Large / High, unchanged.

### Prior Finding Recheck

| ID | Prior Status | Current Status | Verification |
| --- | --- | --- | --- |
| CR-001 | Open | Resolved | See the trace and evidence below |

Trace through the code:
- On a tree miss, after the unchanged AC-008 refusals (other ID kind, coordinator, member), `resolveExistingCopy` returns `null`.
- `refuseCopyOutsideTree` then asks the Task side through the existing port. It does so only when `port.closedTaskExecutionsIn(this.adapter.root)` lists the copy. That holds when the copy's current entry is closed and hosted by this root; a start-failed copy's entry carries the plan's target root.
- `port.assertAssignable` throws the specific reason: "never started", the assigner-only refusal, already this Task, or the status of Task G. The existing `refusalCode` catch turns it into `{delegated:false, message}`.
- Every other ID keeps `notACopyOfThisRun`. That covers unknown IDs and a copy hosted by another root (REQ-005 outside-root).
- Nothing is written on any of these paths.

Evidence (reviewer-run):
- `tsc -p tsconfig.build.json --noEmit`: exit 0.
- `vitest run tests/unit/agent-collaboration tests/unit/projects tests/unit/agent-communication`: 42 files, 521 tests passed.
- `RUN_AGY_FAILURE_E2E=1 … task-existing-copy-assignment.e2e.test.ts -t EXC-E2E-006`: passed. This is the original failing case, with a real start failure on the Team root.

Tests:
- The runtime fixture can now leave a copy out of the tree (`control.absent`), as a failed start does in real use.
- The masking row (never-started copy kept in the fake tree) was removed.
- New cases cover: F open → generic; F CANCELLED → never started; another sender → assigner-only; wrong kind → generic; another root's closed copy → generic.
- A real-adapter case was added for all three root kinds.

### Candidate Gate (delta)

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-09 | While the failed copy's Task F is still open, the copy gets the generic refusal, not "never started" or "still works on Task F" | AC-006 / AC-009 | Reject | Any reassignment needs F closed first; after that, the specific reason applies. Reusing a never-started copy whose own Task is still open has no coherent product goal. The generic message already gives the working next step (delegate to a new copy). Distinguishing it would need a new port contract (an open copy's host root), which is disproportionate. Recorded as a residual risk. |
| C-10 | The `closedTaskExecutionsIn(root)` scan is linear per miss | — | Reject | It runs only on a refusal path, over one root's closed copies. Not material. |

### Structural / scorecard delta

- Ownership and boundaries are unchanged. The lifecycle uses only the port. The adapter lookup remains a pure tree lookup, and the miss decision lives with the lifecycle, which owns DS-002 sequencing. There is no boundary bypass.
- `root-task-execution-lifecycle.ts` is about 408 non-empty lines, under the limit.
- Runtime Correctness And Behavioral Fidelity: back to **9.0**. The AC-009 path is now reachable for real start failures and is covered by unit, real-adapter and E2E checks. The C-09 residual is accepted. All other round-1 scores carry forward. The overall score remains 9.3, and every category is ≥ 9.0.

### Findings (Round 3)

None open. CR-001 is resolved.

### Round 3 Result (superseded by round 4)

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 3, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (MP-004 / item 5 is now reachable)
- Score Summary: 9.3/10; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - API/E2E should rerun EXC-E2E-006 and the related refusal cases, then hand the passed package back for the proportional test-code review of its durable changes. Those changes are uncommitted: `task-existing-copy-assignment.e2e.test.ts`, `agy-failure-cli.mjs`, `task-closure-tree-probe.mjs`, `TESTING.md`.
  - Residual C-09 is accepted.

---

# Round 2 — API/E2E Failure-Origin Review (CRR-002), history

## Failure-Origin Review Meta (Round 2)

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `N/A` (failure-origin round; the full source audit and scorecard are not repeated)
- Trigger: api_e2e_engineer, API-REV-001 round 1, Fail on F-001
- Prior Review Round Reviewed: round 1 (CRR-001, Pass)
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs: F-001 / EXC-E2E-006 (AC-009, REQ-005; design eligibility item 5 / R-2)
- Exact Failing Command / Execution Mode: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t EXC-E2E-006 --no-watch` (scripted AGY, Team root; 3 of 3 runs)
- Failure Evidence Paths: `api-e2e-evidence/exc-e2e-final/task-existing-copy-assignment.json` (`neverStarted`), `api-e2e-evidence/exc-e2e-final.log`
- Testing guideline: repository `TESTING.md` (as recorded by the coverage investigation). No conflict with this skill.
- Routing classification: task_size `Large`, architectural_risk `High`, unchanged. The selected route is `API/E2E Failure-Origin Review`.

## Failure-Origin Analysis (Round 2)

### Approved behavior still represented by the failing scenario

- AC-009 says a "copy whose start failed" is "Refused with the specific reason; nothing changes". REQ-005 lists "the copy never started" as its own refusal reason. Design eligibility item 5 (R-2) defines it as "no entry of the copy ever started".
- EXC-E2E-006 asserts exactly this: a refusal whose message names the never-started reason, and byte-identical Project files. The test is valid and not stale.

### Supported scenario basis (Independent Origin Rule)

| Field | Value |
| --- | --- |
| Scenario | FO-SCN-001 — the delegator tries to give a new Task to a copy whose start failed |
| Kind | Contract (AC-009 / REQ-005 refusal contract) |
| Actor / trigger | Project Task Manager: `delegate_task(recipient_address, task_id=F)` fails with a real start failure (`AGY_MODEL_UNAVAILABLE`, thrown by `agy-agent-run-backend-factory.ts:135` during activation) |
| How the ID becomes known | `list_project_tasks` (REQ-010, approved surface) lists F's assignment `{kind:"agent", agentRunId, assignedBy, outcome:"failed"}`. The ID is listed by this run's own Task and is not invented by the test. |
| Forward path | F CANCELLED → `delegate_task({target_agent_run_id, task_id: G})` → root `assignToExistingCopy` → `RootTaskExecutionLifecycle.assignToExistingCopy` → `resolveExistingCopy(adapter, copy)` |
| Lifecycle state | `dispatchTaskCopy` linked F's entry, then activation failed before `prepared.commit()`. Its catch path cancels or releases the operation and marks the entry `failed`. The copy was never registered in the root's index (and a committed-then-failed copy is released). The Task side holds the copy's history; the root's tree does not. |
| Consequence | `taskExecutionTargetOf` misses. The other-kind, coordinator and member probes miss. The generic `TASK_COPY_NOT_ASSIGNABLE` "…is not a delegated copy in this run. Use the ID delegate_task returned…" is thrown before `port.assertAssignable`, so eligibility item 5 is never reached. The reason and next step are wrong for an ID that this run's Task lists. Safety holds: refused, nothing written. |
| Validity | `Supported Explicit Edge Scenario` (an approved AC with a product-reachable trigger and surface) |
| Evidence | E2E receipt (`neverStarted`), source of `root-task-execution-lifecycle.ts` `assignToExistingCopy` (lookup at step 1, eligibility at step 4), `existing-copy-target.ts`, and `root-task-dispatch.ts` (registration only at `prepared.commit()`; release on failure) |

### Origin classification

- **Origin: implementation defect (missing invariant on the refusal path), with an earlier source-review gap.** The approved requirement and the design's eligibility rule (item 5) are unambiguous. The implementation orders the root-tree lookup before the Task-side eligibility check, and its miss path does not consult the Task side. A never-started copy is therefore never present in the tree for any real start failure, so the Task-side `everStarted` refusal is effectively unreachable through mode C.
- **Design consideration.** DS-002 lists "[Adapter: resolve copy] → [Port: … assertAssignable]", and the AC-008 guidance places the "not a copy of this run" refusal at lookup. The design did not state that a never-started copy is absent from the tree. That is an incomplete assumption, not a wrong structure. The correction stays inside the existing owners: the lifecycle already depends on the port, and no port, ownership or requirement change is required. I therefore classify it as a bounded `Local Fix`, not `Design Impact`. If the implementation engineer finds that the correction needs a new port contract (for example, exposing a copy's host root), they should escalate to the Solution Designer instead.
- **Why the local checks missed it.** The runtime unit table in `tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts` (l.37, "the copy never started (AC-009)") deletes `everStarted` on a fake resource entry while the fake adapter still holds the copy in the tree. Real use never produces that setup. The Task-side unit test exercises the port directly. Neither crosses the real lookup-miss path.
- **Review gap (CRR-001).** Yes, reasonably detectable from source. In round 1, I confirmed MP-004/item 5 against the Task-side code (`historyOf.everStarted`) without tracing whether a never-started copy reaches `assertAssignable` past `resolveExistingCopy`. `root-task-dispatch.ts` shows that registration happens only at `prepared.commit()` and that a failed dispatch is released. The round-1 Runtime Correctness rationale ("Eligibility … verified in code and tests") overstated this one path. It should have been ≤ 8.5 with CR-001 open.

### Proportionate correction (direction, not prescription)

- On a lookup miss in `assignToExistingCopy`, before the generic "not a delegated copy in this run" refusal, consult the Task side for the copy's history through the existing port (for example `assertAssignable` for the named copy, the sender and Task G). Surface its specific refusal ("This copy never started…", or the assigner, busy or same-Task reasons). Keep the generic refusal for IDs the Task side does not know, and for copies that this root does not host, so the "outside the sender's root" refusal (REQ-005) is preserved.
- Keep the AC-008 other-kind, coordinator and member refusals before this fallback.
- Correct the runtime unit fixture so the never-started case removes the copy from the fake adapter's tree, as real use does. Keep a real-adapter case if feasible.
- No retry, compatibility or new state machinery is warranted.

### Durable test-code review requested in the same pass

Not performed in this round. The skill keeps the post-pass proportional test-code review and the failure-origin review as mutually exclusive entry points. The added and updated tests will be reviewed in `api-e2e-test-review-report.md` after the rerun passes:
- `task-existing-copy-assignment.e2e.test.ts`
- `agy-failure-cli.mjs`
- `task-closure-tree-probe.mjs`
- `TESTING.md`

The only judgment made here is the one this classification needs: EXC-E2E-006 enters through the real trigger and actor steps and is a valid assertion of AC-009.

### Non-blocking API/E2E observations

- O-001 (idle-lifetime timing under parallel load) and O-003 (stale `@`-mention collaborator assertions and catalog-dependent cases) are unrelated to this change. They are not attributed here.
- O-002: the unreadable-data refusal text "Agent run resource data could not be read" predates this change. Error and message strings were intentionally kept by the design. Non-blocking; candidate for a separate wording cleanup.

## Findings (Round 2)

| ID | Severity | Behavior / Contract | Evidence | Required Action | Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Blocking (approved AC not met) | AC-009 / REQ-005 "the copy never started" refusal reason; scenario FO-SCN-001 | `root-task-execution-lifecycle.ts` `assignToExistingCopy`: `resolveExistingCopy` runs before `port.assertAssignable`; `existing-copy-target.ts` generic miss refusal; `root-task-dispatch.ts` never registers a start-failed copy. E2E F-001: 3 of 3 runs. | Consult the Task side on a lookup miss before the generic refusal (see direction). Fix the runtime unit fixture to match real use. | implementation_engineer |

## Round 2 Result (superseded by round 3 above)

- Review Decision: `Fail` (failure-origin confirmed)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (FO-SCN-001 is a Supported Explicit Edge Scenario)
- Material-Premise Gate: `Pass` (MP-004 reclassified: item 5 is unreachable through the current lookup order; see CR-001)
- Score Summary: no rescoring in a failure-origin round. The round-1 Runtime Correctness rationale is amended to ≤ 8.5 while CR-001 is open.
- Failure Origin: implementation defect (refusal-path ordering), plus a round-1 source-review gap
- Classification: `Local Fix`
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes:
  - After the fix: source review (targeted delta on CR-001), then an API/E2E rerun of EXC-E2E-006 plus the affected refusal cases, then the proportional test-code review.
  - All other API/E2E results passed and are unaffected.

---

# Round 1 — Implementation Review Baseline (CRR-001)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/delegate-to-existing-copy/requirements-doc.md` (Approved, SR-003; REQ-001..014, AC-001..018, QR-001..003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (skimmed for the cited sources)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006, Ready)
- Supplemental Task Artifacts Reviewed As Context: None (`N/A — not applicable`); product design `N/A — not applicable`
- Relevant Solution Revision IDs: SR-003 (requirements), SR-006 (design)
- Design Review Report Reviewed As Context: `design-review-report.md` (Pass, round 3)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation_engineer handoff IR-001 (Large / High → independent source review)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation-review entry point)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Repositories reviewed:
- Server worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy`, branch `codex/delegate-to-existing-copy`, base `742a0df97`, commits `c395e24a5` (S1), `1e5d757a9` (S2–S6), `1e676ca54` (S7 docs), `24056ffdd` (baseline timing), `1aa02f256` (integration/E2E assertions), `cc6ca46d3` (ticket package).
- Agents worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-agents-delegate-to-existing-copy`, commit `0bd84e0` (PTM skill + board template).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change touched exactly the predicted areas: the Task side, the root-neutral lifecycle, three roots, two tool contracts and the cross-repo skill. It also changed the one-Task-per-copy invariant and DONE release semantics.

## Review Scope

- Changed implementation and behavior reviewed: the S1 rename (spot-checked as rename-only; 443/436 balanced, no logic lines outside the renames), the full S2–S6 source diff, the S7 docs sections, the baseline timing commit, the integration/E2E assertion alignment, and the PTM skill diff.
- Files / areas reviewed in depth:
  - Task side: `projects/services/task-execution-resource-service.ts` (whole file), `projects/domain/task-execution-resources.ts` (whole file), `projects/stores/task-execution-resource-schema.ts`, `projects/services/project-task-service.ts` (diff plus the `closeAndWrite` context).
  - Runtime: `agent-collaboration/execution/task/{root-task-execution-lifecycle,existing-copy-target,task-delegation-command,task-execution-input,task-execution-resource-port,root-task-dispatch,member-task-command-capability,task-delegation-target}.ts`.
  - Adapters: the three `taskExecutionTargetOf` implementations.
  - Roots and wiring: Team, Org and standalone (`root-team-run.ts`, the delivery services, `team-task-execution-service.ts`, the builders and materializer).
  - Messaging: `active-collaboration-root-directory.ts`, `global-agent-run-message-router.ts`.
  - Tool layer: parser, parameter schema, result contract, serializer, run router, `project-task-tool-manifest.ts`; `task-scoped-message-recipient.ts`.
- Reviewer-run evidence:
  - `npx tsc -p tsconfig.build.json --noEmit`: exit 0.
  - `pnpm exec vitest run` on 13 focused suites: 13 files and 156 tests passed. The suites are the three new Task-side suites, the new runtime suite, `task-reactivation-backends`, the router suite, the Team/Org/standalone root suites, the tool suites under `agent-tools/task-delegation` and the `task-delegation-tool-lifecycle` integration suite.
- Explicit exclusions:
  - Real-runtime AC-level API/E2E. API/E2E owns it.
  - The live-model E2E suites, whose assertions were updated mechanically.
  - Browser probes.
  - Full re-verification of every S1 rename line. Its behavior is covered by the green suite at `c395e24a5`, per the handoff.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. Delegation to an existing copy by its own ID; one current Task per copy; DONE/CANCELLED releases only current-Task copies; explicit ID names; agent-only `send_message_to` with a team-run hint; `closedAssignments`; no migration.
- Design-spec behavior map verified against the implementation: `Yes` (DS-001..DS-007).
- Design review report and round confirmed: Pass, ARCH-REV-003, round 3. MP-001..MP-004 are carried below.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None. The implementation found that root indexes are keyed by run ID only and fixed it in scope by requiring an exact reference kind in `taskExecutionTargetOf`. This enforces the approved REQ-005 refusal; it is not new behavior.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `dispatchTaskCopy` returns `TaskDelegationOutcome` via `delegatedCopyOf`. `toDelegateTaskResult` serializes it at the tool edge. `DelegateTaskResultSchema` is a strict three-branch union (`delegated`, `target_kind`, explicit IDs); the Team branch has no `target_agent_run_id`. | — |
| BEH-002 | Confirmed | Parser mode C (`parseExistingCopyInput`: exactly one ID plus `task_id`, no other keys) → `MemberTaskCommandCapability.assignToExistingCopy` → root `assignToExistingCopy`. The Team root runs it under the materialization gate. Each root passes its own `deliverToRunId` through `buildTaskWorkMessageInput`. Then `RootTaskExecutionLifecycle.assignToExistingCopy` runs: `resolveExistingCopy` → `resolveAssignment` → `assertAssignable` → queue `prepareClosedCopyForResume` → `assignExistingTaskExecution` → `publishTaskExecutionsReopened` → `deliverWork` under the sender's live lease → `markStarted`/`markFailed`. | — |
| BEH-003 | Confirmed | `TaskExecutionResourceService.deriveCurrent` (open entry, else latest `linkedAt`, tie → greater Task ID). `entriesByExecution` keeps each copy's last entry per file (`latestEntryOf` in `swap`). `assertTaskExecutionAssignable` checks items 3–6. `ProjectTaskService.assertAssignable` / `assignExistingTaskExecution` check items 1–2 and repeat the copy checks under `serializeCopyInTask` (copy key → Task ID). The schema enforces "at most one open entry, and only the last". Reopen uses the same lock order; `closeTask` takes only the Task ID. | — |
| BEH-004 | Confirmed | `closeAndWrite` → `finally` → `releasableByHostRoot(taskId)`, which selects closed entries whose copy's current Task is this Task, deduplicated per copy. `closedByHostRootKey` is built from current entries only. | — |
| BEH-005 | Confirmed | The router checks the same-root agent, then `ActiveCollaborationRootDirectory.findTeamCoordinator` over all active roots (Team/Org/standalone `teamCoordinatorOf` → lifecycle → exact-kind adapter lookup), and refuses with `TARGET_IS_TEAM_RUN` naming the coordinator. The live-only fallback follows unchanged. | — |
| BEH-006 | Confirmed | `openAssignments` / `closedAssignments` return explicit-ID agent/team variants with `assignedBy` kept. `list_project_tasks` returns `assignments` + `closedAssignments`, or `assignmentsUnavailable`. | — |
| BEH-007 | Confirmed | Text only (`DELEGATE_TASK_LLM_DESCRIPTION`, collaboration prompt), per DEC-006. | — |
| BEH-008 | Confirmed | `latestAssignedEntry` (last `assigned` entry in file order; entries are append-only), the commit listener → change feed, `publishTaskExecutionsReopened`, and the closed-per-root index from current entries. | — |
| BEH-009 | Confirmed | S1 rename map applied. Removed: `agentRunKey`, `currentAssignments`, `TaskAssignment`, `closedByHostRoot`, `DelegateTaskInput`, the `owners` map and the cross-Task `ownerOf` throw. No "always spawns" or "every delegate_task starts a new worker" text remains in server src, docs or the PTM skill (grep). Persisted names appear only in `task-execution-resource-schema.ts`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-002..004, 008 | Contract | Project Task Manager | Give follow-up Task B to the copy that did A | `delegate_task(target_*_run_id, task_id=B)` | Normal | DS-002 as traced above | B appended `starting` → `started`; A unchanged; copy current = B; DONE(A) skips it | Requirements SCN-001, user 2026-10-09 | Supported Normal Scenario | Use |
| SCN-002 | BEH-001 | Contract | Delegator | Know which ID is which | `delegate_task` result | Normal | Serializer at the tool edge | Explicit IDs per kind | DEC-003/008 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002 | Contract | Delegator | Resume a stopped/restarted copy for new work | As SCN-001 after idle stop or restart | Normal | Queue step settles the stop, discards authority, `assertRestorableChain`; exact delivery restores | Copy continues; missing conversation → refusal before the commit | REQ-003, AC-011 | Supported Normal Scenario | Use |
| SCN-004 | BEH-003 | Contract | Delegator / other agent | Ownership and authorization refusals | Mode C / reopen + message | Explicit Edge | `resolveExistingCopy` refusals (AC-008); Task-side refusals (REQ-005); AC-010 hint in `assertReopenTaskNotTerminal` | `{delegated:false, message}`; nothing written before the commit | REQ-005/007 | Supported Explicit Edge Scenario | Use |
| SCN-005 | BEH-005 | Contract | Any agent | Message a team copy | `send_message_to` | Normal | Router → directory → root → lifecycle → adapter | Refusal naming the coordinator | REQ-009 | Supported Normal Scenario | Use |
| SCN-006 | BEH-006 | Contract | Delegator in a new chat | Find the copy of a closed Task | `list_project_tasks` | Normal | Manifest → `ProjectTaskService.assignments` → service views | `closedAssignments` lists it | REQ-010 | Supported Normal Scenario | Use |
| QR-001 | BEH-003/004 | Contract | PTM | Parallel `create_or_update_task(A, DONE)` + `delegate_task(target_*, B)` in one turn | Parallel tool calls | Explicit Edge | MP-003 path (verified in code below) | Never two open entries; copy never stopped while assigned B | QR-001, MP-003 | Supported Explicit Edge Scenario | Use |
| AC-018 | BEH-003 | Contract | PTM | A → B → A | Mode C after the AC-010 refusal | Explicit Edge | `linkExistingTaskExecution` appends; last-entry lookups | Earlier period kept; new open last entry | MP-001, AC-018 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | QR-001 interleavings of DONE(A) and assign(B) | QR-001, MP-003 | Parallel tool calls in one PTM turn | Assign re-checks `historyOf` under copy → B locks. A's closure takes only A's lock, and its release runs in `finally` after the lock. If A's commit has not happened yet, the re-check sees A open and refuses. If `releasableByHostRoot(A)` runs after B's commit, the copy is filtered out. If it runs between the queue step and the commit, it reaches a discarded authority. Reopen also takes the copy key first, so no path yields two open entries. | Code above; runtime QR-001 tests (4 orders) and the Task-side "either order" test, all passing | Reject (as a defect) | Handled as designed; residual window as accepted in MP-003 |
| C-02 | `refusalCode` in `assignToExistingCopy` maps any coded `Error` before the commit (including a Node fs error from the commit write) to `{delegated:false}` | Design DS-002 failure handling; spawn-path parity | Infrastructure write failure during the commit | The atomic `updateJsonFile` either replaces the file or leaves it unchanged. The spawn path's link-write failure also returns `delegated:false` via `asTaskDelegationError`. | `root-task-dispatch.ts` link `.catch(asTaskDelegationError)`; design: "infrastructure failure … not a supported scenario" | Reject | Infrastructure failure is out of scope by default; behavior matches the spawn path |
| C-03 | The AC-010 hint fires when any earlier Task of the copy is non-terminal, even if the PTM did not reopen it for that copy (e.g. A was moved back and given to a new copy) | REQ-007 | PTM messages a copy whose current Task is DONE | The refusal still names the copy's current Task and its status, as REQ-007 requires. The suggested next step (delegate_task with the copy's ID and A) is valid under REQ-004. | `assertReopenTaskNotTerminal` | Reject | No incorrect outcome; the wording is guidance only and no contract is broken |
| C-04 | Org and standalone `assignToExistingCopy` run outside a materialization gate; the Team root runs inside one | Design DS-002 | — | Matches each root's existing `delegateToNewCopy` structure; only the Team root has a gate | Diffs | Reject | Consistent with existing root shapes |
| C-05 | `ActiveRootMessageBoundary.teamCoordinatorOf?` is optional | Design AR-003 | — | All three root classes implement it (grep). The optionality matches the existing optional `releaseTaskExecutions?` member. | grep | Reject | No supported root lacks it |
| C-06 | Kind-agnostic `getTaskExecution` used by new callers | REQ-005 / AC-008 | Team run ID passed as `target_agent_run_id` | New callers (`resolveExistingCopy`, `teamCoordinatorOf`) go only through the exact-kind `taskExecutionTargetOf`. Older callers receive Task-side references of the correct kind. | grep of `getTaskExecution(`; real-adapter tests | Reject | The in-scope fix is complete for new callers |
| C-07 | `task-execution-resource-service.ts` is a 229-line delta (>220) | Design DS-004 / file mapping | — | 326 non-empty lines (338 total) for one owner of the current-entry rule: view, indexes, serialization and queries. Splitting it would spread the rule. | File read | Reject (as a finding) | Design-directed; cohesive single responsibility |
| C-08 | `project-task-service.ts` is at 489 non-empty lines, near the 500 limit | Engineering contract (size) | — | Under the hard limit; the added methods belong to the port implementation | `grep -cv` | Reject (as a finding) | Recorded as a residual risk for future growth |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The current-entry rule lives only in `TaskExecutionResourceService`. Callers ask the port (`ownerOf`, `isOpen`, `locationOf`, `historyOf`). | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist; the design and requirements are matched (behavior table) | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..007 map one-to-one to code paths | None |
| Ownership boundary preservation and clarity | Pass | The lifecycle never reads Task files. The root owns only authorization and its delivery function. The Task side owns eligibility. | None |
| Off-spine concern clarity | Pass | `buildTaskWorkText`, `resolveExistingCopy`, `toDelegateTaskResult` and the assignment views each serve one owner | None |
| Existing capability/subsystem reuse check | Pass | Reactivation's queue step is extracted as the shared `prepareClosedCopyForResume`. Delivery reuses root `deliverToRunId`. Start lifecycle reuses `markStarted`/`markFailed`. | None |
| Reusable owned structures check | Pass | `DelegatedCopy`, `delegatedCopyOf`/`copyTargetOf`, `buildTaskWorkMessageInput` and the assignment views are each defined once | None |
| Shared-structure/data-model tightness check | Pass | Agent/team variants are discriminated unions with no optional-field bags. `delegated` and `target_kind` discriminate the tool result. | None |
| Repeated coordination ownership check | Pass | Lock order lives in `serializeCopyInTask` (one owner). The resume step is one private method. | None |
| Empty indirection check | Pass | `TeamTaskExecutionService` stays a design-approved thin facade. The root methods carry authorization and the delivery function. | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Domain rules are pure functions; the service holds state and indexes; `ProjectTaskService` handles status and orchestration | None |
| Ownership-driven dependency check | Pass | tool → capability → root → lifecycle → {adapter, port}. The runtime imports only port types. | None |
| Authoritative Boundary Rule check | Pass | No caller uses both `ProjectTaskService` and `TaskExecutionResourceService`. The lifecycle uses the port only. | None |
| File placement check | Pass | The new `existing-copy-target.ts` sits in `agent-collaboration/execution/task`. All renames stay within their folders. | None |
| Flat-vs-over-split layout judgment | Pass | No new folders | None |
| Interface/API/query/command boundary clarity | Pass | Commands are split by subject (`delegateToNewCopy` / `assignToExistingCopy`). Reference kinds are explicit, and exact-kind lookup is enforced. | None |
| Naming quality and naming-to-responsibility alignment | Pass | Matches the REQ-014 map. Remaining `coordinatorAgentRunId` names are persisted or prepared-execution fields that already say "coordinator" (AC-017 satisfied). | None |
| No unjustified duplication in changed scope | Pass | The three adapter `taskExecutionTargetOf` methods are three-line per-index lookups, the existing per-adapter pattern | None |
| Patch-on-patch complexity control | Pass | The exact-kind fix lives in one method per adapter, not layered on top of other code | None |
| Dead/obsolete code cleanup completeness | Pass | See the Legacy section | None |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Test names cite AC/REQ/QR IDs. The runtime QR-001 suite covers four orders. Real-registry tests cover all three root kinds. | None |
| Test fixtures/helpers reusable, structure coherent | Pass | Suites are split by owner: Task side, current entry, runtime, backends, roots, router, tool | None |
| No stale, duplicated, or compatibility-only tests retained | Pass | Old shape assertions were updated (`1aa02f256`); no alias tests | None |
| API/E2E readiness for the next workflow stage | Pass | The handoff lists AC-level scenarios for the real runtime. The focused suites and the build pass. | None |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `projects/services/task-execution-resource-service.ts` | 326 | Pass | Delta 229 (S2): design-directed rewrite of the one current-entry owner | Pass | Pass | Accepted (C-07) | None |
| `projects/services/project-task-service.ts` | 489 | Pass (near limit) | Delta ~90 | Pass | Pass | Accepted (C-08, residual risk) | None now |
| `agent-team-execution/domain/root-team-run.ts` | 472 | Pass | Small | Pass | Pass | Pass | None |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 393 | Pass | ~117 | Pass | Pass | Pass | None |
| `projects/domain/task-execution-resources.ts` | ~180 | Pass | ~161 | Pass | Pass | Pass | None |
| Other changed source files | <420 | Pass | <125 | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No alias for `target_agent_run_id` on Team results or `targetAgentRunId` in views (DEC-008 clean break) |
| No legacy old-behavior retention in changed scope | Pass | The root/capability `delegateTask` single entry is removed |
| Dead/obsolete code cleanup completeness | Pass | Removed: the `owners` map, the swap conflict log, the cross-Task `ownerOf` throw, `agentRunKey`, `closedByHostRoot`, `currentAssignments`, `TaskAssignment`, internal `DelegateTaskResult`, `DelegateTaskInput` and the `{target_agent_run_id:null}` shape (grep-verified) |
| Approved persisted-data transition decision followed | Pass | `Directly Usable — No Migration`. Persisted names are mapped only in the schema. The relaxed per-file rule accepts every existing file. |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already addressed in S7.
- Why: tool contracts, ownership semantics and assignment views changed.
- Files or areas affected: `docs/modules/projects.md` (new "Current Task of a copy" and "Follow-up Task to an existing copy" sections, plus the downgrade note for files with several entries), `agent_team_execution.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `agent_communication.md`, `codex_integration.md`, `prompt_engineering.md`, `TESTING.md`; the PTM skill and board template in the agents repo. Delivery should confirm the docs at integration.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 (A → B → A) | Confirmed | Implemented as an append. `latestEntryOf` is used in settle, reopen/`assertReopenable`, the inherited creator check and `swap`; no first-match `find` remains in `task-execution-resources.ts`. |
| MP-002 (unreadable current file) | Confirmed | `assertAllReadable` runs in `assertAssignable` and again inside the commit lock |
| MP-003 (DONE(A) vs assign(B)) | Confirmed | See C-01 |
| MP-004 (post-commit delivery failure) | Confirmed in round 1; **Reclassified in round 2** | "Never started" means no entry ever started (`historyOf.everStarted`), so a failed B does not make the copy unassignable after B is cancelled. Round 2 (CR-001): a copy whose start failed is never in the root's tree, so `resolveExistingCopy` refuses it generically before item 5 is reached. |

New or reclassified premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-002 reads top to bottom in one lifecycle method with the design's exact step order | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | The current-entry rule has one owner. The port is the only runtime↔Task boundary. Roots own only authorization and delivery. | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Commands are split by subject. Strict parser modes. Explicit reference kinds, with exact-kind lookup enforced. | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.0 | Pure domain rules, a stateful service, an orchestrating port | `project-task-service.ts` is at 489/500 lines (C-08) | Split by concern before the next feature adds to it |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Discriminated agent/team variants; no optional-field bags; one `DelegatedCopy` | — | — |
| `6` | `Naming Quality and Local Readability` | 9.0 | REQ-014 map applied. Comments state the invariants. | Some long single-line expressions (adapter lookups, `historyOf`) are dense | Optional readability wrapping |
| `7` | `API/E2E Readiness` | 9.5 | Focused suites green. Coverage hints are listed per AC. | — | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.0 (round 2 amendment: ≤ 8.5 while CR-001 is open) | Eligibility, lock order, release filter, last-entry lookups and QR-001 orders verified in code and tests | The release window still depends on adapters capturing authority synchronously (accepted MP-003 profile) | Real-runtime QR-001 at the wire in API/E2E |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean break per DEC-008; persisted names are mapped, not aliased | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Every item in the design's removal list is gone (grep) | — | — |

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer`, with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- `project-task-service.ts` is at 489 non-empty lines; the next feature that touches it should split it first.
- Release window (MP-003): it depends on each adapter's `releaseOwnedExecution` capturing its authority at invocation. API/E2E should exercise parallel DONE(A) + assign(B) at the wire in both orders.
- Post-commit delivery failure leaves B's entry open with `start: failed`. The returned message tells the delegator to message the ingress or cancel B. This is design-accepted.
- DEC-008 clean break: the PTM skill branch (`0bd84e0`, not pushed) must ship with the server change.
- Real-runtime AC-002/003/004/005/010/011/012/013/018 coverage, the live-model E2E suites and the browser probes for REQ-008 have not run; API/E2E owns them.

## Round 1 Result (superseded by round 2 above)

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10; every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Round 1, full review, CRR-001. No findings.
