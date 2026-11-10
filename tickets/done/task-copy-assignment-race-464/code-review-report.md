# Code Review Report — task-copy-assignment-race-464

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; REQ-001…REQ-005, AC-001…AC-006, Scope Guardrail, Preserved Behavior Boundary)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (REPRO-01, ASM-001, RSK-002)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (D1–D5, DS-001…DS-004, Risks, Removal Plan)
- Supplemental Task Artifacts Reviewed As Context: `evidence/REPRO-01-race-diagnostics.log`, `evidence/PROTO-01-queued-release-prototype.log`
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass; AR-001, AR-002, MP-001, MP-002)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001, Checks Run IMP-01…IMP-09)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation Complete, IR-001 at `37cb04f288` (source in `c29edfb1f7`), base `c8f303af70`
- Prior Review Round Reviewed: None
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API-E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High: concurrency ordering for all three root kinds)
- Classification evidence or correction required: None. Three source files in `src/agent-collaboration/execution/task/` (+21, +6, +1 effective lines); the change is concurrency ordering, as classified.

## Review Scope

- Changed implementation and behavior reviewed: D1 (closure release split into an out-of-queue remote fence and a queued hosted release, with a direct path once `!accepting`), D2 (assignment commit inside its `reopen` step), D3 (reactivation commit inside its `reopen` step), the queue kind `release`, D4 tests, D5 docs.
- Files / areas reviewed:
  - `root-task-execution-lifecycle.ts`: whole file; changed `assignToExistingCopy`, `releaseTaskExecutions`, `reactivateClosedTarget`, `prepareClosedCopyForResume`.
  - `root-task-execution-resource-scope.ts`: `fenceRemoteClosedExecutions`, `releaseHostedExecutions`, `discardReleasedExecution`, `settleExactRelease`.
  - `root-task-execution-command-queue.ts`: whole file.
  - Release path down to the runtime: `standalone-root-task-execution-adapter.ts:199-207`, `team-task-execution-adapter.ts:152-156`, `task-agent-execution-registry.ts:217-222`, `configured-agent-execution-handle.ts:288-306`, `agent-run-manager.ts:366-381`, `agent-run.ts:146-150`, `agent-run-termination.ts:120-122, 202-222`, `autobyteus-agent-run-backend.ts:290-330`, `agy-agent-run-backend.ts:150-159`.
  - Task side: `task-execution-resource-release.ts` (whole); `project-task-service.ts:348-359` (`closeAndWrite`); `task-execution-resource-service.ts:66-83` (`serializeCopyInTask`).
  - Tests: the fixture, the two D4 files, and the five adjusted test files.
  - Docs: `projects.md`, `agent_team_execution.md`, `docs/design-cases.md`.
- Explicit exclusions: registries and Task-side rules (unchanged, out of scope); remote fencing behavior (unchanged; only moved behind a split method).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001/REQ-002 make the root queue order every closure release against every reopening commit, so B is delivered in either order and a reopened copy is never stopped by a later release. BEH-003, texts and results are preserved; `closed`/`reopened` keep their commit order (an overtaken `closed` is omitted, ARCH-REV-001 AR-001, SR-002).
- Design-spec behavior map verified against the implementation: DS-001 `lifecycle.ts:262-269` (fence at `:263`; queued `release` at `:266`; direct while `!accepting`; merged in input order at `:267-268`). DS-002 `:199-203`. DS-003 `:321-324`. DS-004 queue unchanged except the kind (`command-queue.ts:1`).
- Design review report and round confirmed: ARCH-REV-001 `Pass`; AR-001 is reflected in the D4 event assertions and the `projects.md` text, and AR-002's lock order in `projects.md` step 3.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None
- Remaining material ambiguity, if any: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | The `reopen` step runs `prepareClosedCopyForResume` → `assignExistingTaskExecution` as one head step (`lifecycle.ts:199-203`). A DONE's release (`task-execution-resource-release.ts:11-17`, synchronous submit) queues before the step, or after it and finds the copy open (`resource-scope.ts:113-126` `isClosed` at head → `TASK_AGENT_RESOURCE_NOT_CLOSED`). D4 cases fail on base with the E2E's exact refusal (IMP-01); EXC-E2E-004 3/3 under load (IMP-07) | — |
| BEH-002 | Confirmed | `reactivateClosedTarget` step returns `port.reopenAssignment` from the head (`lifecycle.ts:321-324`); `reopened` published after (`:325`). D4 reactivation case fails on base (IMP-01) | — |
| BEH-003 | Confirmed | Same `releaseHostedExecutions` logic (publish closed, cancel, settle exact release), now at the queue head. Queued releases still run while the queue drains at termination (`command-queue.ts:70-86`; admission closes but entries run). After that, the release runs directly (`lifecycle.ts:266`). Remote fence unchanged (`resource-scope.ts:90-104`; `remote-messaging-owners` test through the lifecycle) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/002 | User (agent) | Manager | Close A and hand B to the same copy in one turn | Parallel `update_task` DONE + `delegate_task(copy, B)` | Normal | DS-001 + DS-002 as above | B delivered; copy live on B | Requirements SCN-001; REPRO-01; EXC-E2E-004 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, REQ-002/003 | User (agent) | Assigner | Reactivate a closed copy by message | `send_message_to(copy)` while a release is in flight | Explicit Edge | DS-001 + DS-003 | Copy restored and receives the message | Requirements SCN-002 | Supported Explicit Edge Scenario | Use |
| SCN-003 | BEH-003 | System | Task side | Stop a copy whose last open Task closed | DONE/CANCELLED | Normal | DS-001 | Copy stopped | `projects.md` | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | New hold-and-wait edge: the `release` step at the head awaits the copy's runtime termination. If that waited for the copy's own in-flight tool call, and that call waited for a root-queue step behind the release, the queue would stall | SCN-003; ASM-001 (deadlock freedom) | DONE while the copy is mid-turn in a tool call that submits to the root queue (`send_message_to` → `wake`, `delegate_task` → `activate`) | The closure release is a force release that skips the quiescence wait (`agent-run.ts:146-150` → `agent-run-termination.ts:120-122`). External runtimes kill their process (`agy-agent-run-backend.ts:150-159`). The native runtime's `terminate` is capped at 10 s and then returns a failure (`autobyteus-agent-run-backend.ts:299-311`), which is logged and retried by a repeated DONE (`task-execution-resource-release.ts:26`). Worst case: a bounded stall and a failed release, not a deadlock. Base already accepts the same exposure: user Stop releases a running copy at the queue head (`lifecycle.ts:463`, `releaseRuntimeForUserStop`) | Code cited | Reject (as a finding) | — | Bounded and no worse than base's user Stop; recorded as a residual risk for API/E2E awareness |
| C-02 | If a queued release is rejected (root fail-stop), `releaseTaskExecutions` rejects without awaiting the remote `fenced` promises | MP-002 | `enterRootFailStop` + a closure group that mixes remote and hosted copies + a fence that rejects | Possible unhandled rejection of a fence promise | `command-queue.ts:50-56`; `lifecycle.ts:263-268` | Reject | — | Infrastructure-failure state outside scope (Principle 6; ARCH-REV-001 MP-002 residual); needs three independent rare conditions. The same pattern existed on base for a rejected hosted release |
| C-03 | The lifecycle is at 494 effective lines (limit 500) | Engineering contract (size limit) | — | Within limit; the next addition will need a properly owned file | `grep -c` base 473 → 494 | Reject (no breach) | — | Residual note only |
| C-04 | Updated QR-001 case checks "release not yet settled" after a single microtask | D4 test quality | — | Weak intermediate check; the final assertions (`NOT_CLOSED` result, only `reopened` published, copy live) prove the ordering | Test `:233-245` | Reject | — | Not a defect; final assertions carry the proof |
| C-05 | Release/lock order: the queue head awaits Task-side `serializeCopyInTask` | AR-002, RSK-002 | — | `closeAndWrite` requests the release in `finally` after `closeTask` and does not await it (`project-task-service.ts:349-358`); `submit` enqueues synchronously; no Task lock holder awaits the root queue | Code cited; implementation's escalation check | Reject (no reverse edge) | — | Confirms the design's safety argument |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present, preserved | Pass | `Duplicated Policy Or Coordination` → three steps moved under the existing queue owner; no new owner | — |
| Matches behavior-defining supplements | Pass | None exist; REPRO-01 and PROTO-01 shapes are matched | — |
| Data-flow spine inventory preserved | Pass | DS-001…DS-003 map 1:1 to the three changed methods | — |
| Ownership boundary preservation and clarity | Pass | Lifecycle orders; scope keeps mechanics; queue only admits/orders/closes/drains | — |
| Off-spine concern clarity | Pass | Remote fence stays off the queue (`fenceRemoteClosedExecutions`), as designed | — |
| Existing capability reuse | Pass | Queue, `prepareClosedCopyForResume`, `releaseHostedExecutions`, `isClosed` reused unchanged | — |
| Reusable owned structures | Pass | No new structures | — |
| Shared-structure tightness | Pass | One kind added to the union | — |
| Repeated coordination ownership | Pass | The ordering policy for a copy has one owner (the queue); the scope never submits to it | — |
| Empty indirection | Pass | `releaseTaskExecutions` owns the split, ordering and merge; not a pass-through | — |
| Separation of concerns, file responsibility | Pass | Fence/release mechanics in the scope, order in the lifecycle | — |
| Ownership-driven dependency | Pass | Lifecycle → queue, scope; no scope → queue callback (Principle 13) | — |
| Authoritative Boundary Rule | Pass | All callers use `lifecycle.releaseTaskExecutions`; `grep` shows the scope methods called only by the lifecycle in `src` (tests call the scope for its mechanics) | — |
| File placement | Pass | Unchanged | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `fenceRemoteClosedExecutions` returns `{ fenced, hosted }`; `releaseHostedExecutions` returns results in input order | — |
| Naming quality (Principle 15) | Pass | `release` kind matches `releaseTaskExecutions` and "closure release" in docs | — |
| No unjustified duplication | Pass | The two reopen steps share `prepareClosedCopyForResume`; each commit differs | — |
| Patch-on-patch complexity | Pass | Moves calls into existing steps; no flags or retries | — |
| Dead code removed (Principle 7) | Pass | The combined scope `releaseTaskExecutions` is removed; the Map round-trip is gone; no other caller (`grep`) | — |
| Test scenarios clear and requirement-aligned | Pass | D4 cases name AC-001/AC-003. They assert delivery, the release result, the copy's state, that nothing was stopped (`release:` log absent), and the exact event sequence (AR-001) | — |
| Fixtures/helpers reusable, coherent | Pass | The fixture's `stopping` state models the registry rule (`task-team-execution-registry.ts:49-51`), and it is what makes the base failure reproduce | — |
| No stale/duplicated/compat tests | Pass | The QR-001 window that no longer exists was rewritten, not kept. The other five tests were updated to the designed timing (RSK-001) or the split | — |
| API/E2E readiness | Pass | Gated EXC-E2E-004 3/3 under load; delegation gated suites; full default E2E green | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `root-task-execution-lifecycle.ts` | 473 | 494 | Pass | Pass (+21) | Pass | Pass | — | None (near the limit: residual note) |
| `root-task-execution-resource-scope.ts` | 157 | 163 | Pass | Pass | Pass | Pass | — | None |
| `root-task-execution-command-queue.ts` | 82 | 83 | Pass | Pass | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The `!accepting` direct path is the design's explicit state rule (admission closed), not a fallback for a refused submit |
| No legacy old-behavior retention | Pass | The unqueued release and both out-of-step commits are removed |
| Dead code removed | Pass | See above |
| Persisted-data transition followed | Pass | `Not Affected` |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: AC-006 / REQ-005.
- Files: `projects.md` (Follow-up Task steps 3–5: one queue step; lock order queue → copy → Task; release before/after, no `closed` when overtaken), `agent_team_execution.md` (queue paragraph lists the closure release and the reopening commits; remote fence outside), `docs/design-cases.md` Case 1.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | D4 asserts `["reopened"]` when overtaken and `["closed","reopened"]` when the release is first |
| MP-002 | Confirmed | Unchanged; C-02 is a further consequence in the same out-of-scope state |

New premise: C-01 above (Reject as finding; bounded).

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | Each spine maps to one method; DS-001's fence/queue/merge reads top to bottom | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Queue is the single owner of a copy's runtime order; scope keeps mechanics; no callback into the queue | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Split methods have one subject each; results in input order | `{ fenced, hosted }` mixes a result map with a work list in one return | Acceptable as designed; no change needed |
| 4 | Separation of Concerns and File Placement | 9.4 | Correct files | Lifecycle at 494/500 | Next lifecycle growth goes to an owned file |
| 5 | Shared-Structure / Data-Model Tightness | 9.6 | One kind added | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Names match the docs' vocabulary; comments explain the order | `releaseTaskExecutions` packs fence/queue/merge into four dense lines | — |
| 7 | API/E2E Readiness | 9.5 | Base-failing unit cases; gated EXC-E2E-004 under load; full E2E green | Live runtimes not exercised (user direction; scripted AGY) | API/E2E per plan |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Both orders proven; reverse lock edge absent; termination still drains releases | New hold of the queue head during a runtime stop (C-01, bounded); fail-stop corner (C-02) | Residual only |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | Clean replacement | — | — |
| 10 | Cleanup Completeness | 9.6 | Combined method and Map round-trip removed; stale QR-001 window rewritten | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review pass); informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- C-01: a `release` step now holds the root's queue while a hosted copy's runtime stops. For the native runtime this can take up to 10 s if its shutdown does not finish, and the release then fails (logged; a repeated DONE retries). Wakes of the root wait meanwhile (RSK-001). Worth watching in API/E2E for a closure of a copy that is mid-turn.
- C-02 / MP-002: under root fail-stop a queued release is rejected; the copy is not stopped by it.
- The lifecycle file is at 494/500 effective lines.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: Implementation Review
- Supported Product Scenario Gate: Pass
- Material-Premise Gate: Pass
- Score Summary: 9.5 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Small / High unchanged. No findings.
