# Code Review Report — CRR-025 (IR-012 Source Re-Review)

## Latest Authoritative Result (summary)
**Pass — 9.2/10 (92/100).** IR-012 (commit `4b04d9097` on `ccb5fbe3c`) resolves all CRR-024 findings F01–F08 as designed in SR-021 (ARCH-REV-006) and SR-022 (ARCH-REV-008):
- Lifetime closure now has one durable authority and one process runtime latch.
- The unused drain machinery is gone.
- Projects and runtime roots are bound in one composition file, with the dependency running one way (both mechanical greps are empty).
- Membership authority is explicit, with reported reconciliation.
- Sender-side and repeat `delivered` writes are removed.

Both flagged implementation risks were assessed and are non-blocking (see Known-Risk Assessment). Ready for the changed-build API/E2E recheck.

Prior CRR-024 report archived at `code-review-evidence/crr-025/prior-code-review-report-crr-024.md`.

## Review Round Meta
- Review Entry Point: `Implementation Review`. Round 25; prior round CRR-024 (Fail — Design Impact + Local Fix).
- Review Scope: **Full Re-Audit of the changed ownership/admission/release/composition surface.** The delta changes a shared port interface, the release report shape and process composition, so ownership, dependency, boundary, cleanup and runtime checks were rerun over the IR-012 diff plus the unchanged spine it plugs into. Unchanged provider-private teardown keeps the CRR-022/CRR-024 basis.
- Trigger: `/implementation_engineer` IR-012 handoff (SR-021 F04–F07, SR-022 F08, Local Fixes F01–F03, notes N1–N3).
- Basis: REQ-BL-008 unchanged (SD-AP-001 + scoped SD-AP-002). Semantic SR-014 + SR-021/SR-022; ARCH-REV-005/006/007(withdrawn change)/008; Large / High / Reviewed preserved.
- Artifacts read:
  - design-spec.md (SR-021 and SR-022 sections)
  - solution-revision-record.md (SR-021/SR-022)
  - implementation-handoff.md
  - implementation-revision-record.md (IR-012)
  - implementation-evidence/ir-012/local-check-commands.md
  - code-review-report/record CRR-024
- Design authority: `.claude/skills/code-reviewer/design-principles.md` and repo `DESIGN.md` (both read this round).
- Reviewed diff: `git diff ccb5fbe3c 4b04d9097` (106 files, +642 / −1956 including 64 untracked dist files). Delivery's 8 uncommitted docs/TESTING.md paths are untouched.

## Routing Classification Review
Large / High / Reviewed confirmed. The delta removes state and dependencies and adds no new subsystem or persisted data. No reclassification.

## Prior-Finding Recheck (CRR-024)
| Finding | Status | Verification evidence |
| --- | --- | --- |
| F01 generated `dist/` committed | **Resolved** | `git ls-tree -r HEAD` → 0 paths under either package's `dist/`; files remain untracked locally; no ignore rule (per N1, optional). |
| F02 lifecycle mechanics in shared LLM contract | **Resolved** | inherit/fence/release/helper sentences removed. The contract now reads "…so follow-ups remain possible unless its Task is DONE." Work-source rule kept; pin test and prompt doc updated. |
| F03 dead `resolveInRunRecipient` | **Resolved** | definition and callers gone (grep empty); assertions retargeted to `resolveMessageRecipient`. |
| F04 three closure holders | **Resolved** | durable `completedAt` (Task service) + one process `TaskLifetimeGate` (unknown → confirmed-open → closed). `ProjectTaskService.admissions` and `RootTaskLifetimeScope.closed/fences` deleted; the scope is now stateless. DONE commit callback latches via `closureListener.onLifetimesClosed` (Task-scoped ids only). |
| F05 unused count/drain | **Resolved** | `task-lifetime-operation-gate.ts` deleted; `TaskLifetimeAdmission` has no `release`; all `admission.release()` sites removed. Live-lease counters (idle-shutdown state) unchanged, as designed. |
| F06 two-way dependency | **Resolved** | `compositions/project-task-lifetime-composition.ts` is the only binding. Both hosts compose once before the supervisor and release on close/rollback. Supervisor input requires `taskLifetimes`; three `getProjectTaskService` defaults deleted. Design §4 greps both empty (rerun by reviewer); architecture test encodes the rule. |
| F07 two membership sources | **Resolved** | durable link = membership authority. Root release returns `{requested, unrequested}`; `recordCleanup` reconciles unrequested onto existing unreleased links and logs a bounded `TASK_LIFETIME_UNLINKED_EXECUTION` without inventing a link. Dispatch catch path updated (N3). |
| F08 repeat `delivered` writes | **Resolved** | `withLiveLease(..., {recordAcceptance})` defaults false. Only receiver leases (team/org/standalone `withReceiverLease`) and operator `post_message` opt in; sender leases and non-post commands do not. `recordMessageAccepted` is private and does a lock-free read first. |

## Upstream Behavior And Production-Path Basis Confirmation
- Behavior-basis status: **Confirmed**; no behavior changed.
- BEH-003/005 (dispatch): `dispatchTaskCopy` unchanged apart from admission shape and report shape.
- BEH-006/007 (DONE/release): commit latches the gate synchronously; release `confirmClosed` → cancel before await → exact release → report.
- BEH-009 (helpers): unchanged resolution order.
- BEH-010: LLM contract is now business-only.
- **Factual correction to CRR-024:** CRR-024's BEH-006 row claimed GraphQL `updateTask` gives UI status parity. That was wrong. The GraphQL resolver deliberately has no status mutation ("users only create, edit the description of, and delete Tasks"). The status-writing surfaces are the native/MCP Task tools, which share the same service. This does not change any finding.

## Supported Product Scenario Gate
Uses SCN-002/005/006/008/009/011 and contracts CT-OWN, CT-DEP and CT-CLEAN from CRR-024 unchanged.

### Candidate Finding And Mechanism Gate (this round)
| Candidate | Observation | Scenario / contract | Path / consequence | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| CR25-CAND-01 (flagged risk 1) | New read-only port method `readExecutionDispatch` | SR-022 "lock-free read first" + CT-DEP (root lifecycle may not read the Projects store) | the only dependency-respecting way for the runtime to pre-read; single subject, no store/`updateJsonFile`/`recordDispatch` change | `task-execution-lifetime.ts`, `project-task-service.ts` | **Reject** as finding | Correct boundary choice. SR-022's "No Projects service change" text is slightly inaccurate (one read method added); designer may align the wording. Non-blocking. |
| CR25-CAND-02 (flagged risk 2) | Application-platform scoped Team roots (`application-execution-scope-kernel-builder.ts:157`) now get no `taskLifetimes`; linked/owned paths there reject `TASK_LIFETIME_UNAVAILABLE`; unlinked unchanged | No approved scenario: REQ-001/DEC-001 scope the Manager to Chat/@ in the studio/standalone hosts; application-platform linked delegation is not in REQ-BL-008 | before: implicit default binding with release via the global root directory; now: explicit honest rejection | builder source; handoff Known Risk 2 | **Reject** as finding (unsupported scenario) | Safer than an implicit binding. Design §4 says "every host's roots received the Task service", which did not consider app-scoped roots; designer may record app-scoped roots as intentionally unbound. Non-blocking. |
| CR25-CAND-03 | Gate `assertOpen` before any `admit` in-process → `TASK_LIFETIME_UNAVAILABLE` | SR-021 escalation rule | user/operator input reaches owned members via `withLiveLease` → `acquireForAgent` → `admit` first; sync fences run after | `root-team-run.ts:338–354`, delivery services, handle fences | **Reject** (no supported path found that bypasses admit) | Matches the design's restored-work path. |
| CR25-CAND-04 | `initializeProjectTaskServiceProcessInstance` throws if an instance exists | startup contract | all production `getProjectTaskService()` callers are request-time (tool manifest, GraphQL getter, REST); none run before composition | grep of callers | **Reject** | Fail-fast as designed. |
| CR24-OBS-01 (carried) | One `error` field on the link carries both dispatch and cleanup errors; a cleanup error can overwrite the dispatch failure reason | design-principles "keep each field's meaning singular" | internal diagnostics only; no business DTO exposure; the design explicitly acknowledges the mixed field | `applyCleanup` / `recordDispatch` | **Not promoted this round** | Recorded as a data-model observation pending the user's decision on the data-model proposal (separate dispatch/release errors, naming of `purpose`). Not a regression in IR-012. |

## Structural / Design Checks
| Check | Result | Evidence |
| --- | --- | --- |
| Task design health preserved | Pass | Boundary/ownership issue fixed by deletion plus one composition file |
| Data-flow spine clarity | Pass | DS-002/003 unchanged in shape; release report explicit |
| Ownership boundary preservation | **Pass** | single closure latch; durable link membership authority; Task service owns no runtime latch |
| Off-spine concern clarity | Pass | gate is runtime-owned; release effect stays Task-owned |
| Existing capability reuse | Pass | process-instance pattern reused for the Task service |
| Reusable owned structures | Pass | neutral contract types in `task-execution-lifetime.ts` |
| Data-model tightness | Pass (observation OBS-01 carried) | report type is tight; link error field shared (pre-existing) |
| Repeated coordination | Pass | one composition binding instead of three defaults |
| Empty indirection | Pass | `RootTaskLifetimeScope` still owns per-root policy (chain checks, release sweep) |
| Ownership-driven dependencies | **Pass** | both §4 greps empty; architecture test enforces them |
| Authoritative Boundary Rule | Pass | no caller uses both an owner and its internals |
| Interface clarity | Pass | port lost three runtime methods and gained two read-only queries, all with one subject each |
| Naming | Pass | `taskLifetimes` rename consistent; `purpose`/`helper` naming discussion pending user decision (non-blocking) |
| Duplication / patch-on-patch | Pass | net −1300 source lines |
| Dead/obsolete cleanup | **Pass** | F01/F03/F05 removed |
| Tests aligned / no stale tests | Pass | gate, tree-scope, dispatch-race, quiet-generation and lifetime suites retargeted; sender-link mutation control added |
| API/E2E readiness | Pass | changed admission/fence/release/composition paths need the planned changed-build recheck |

## Source File Size Audit
All IR-012-touched sources are well under 500 effective lines. The largest touched is `root-team-run.ts` at ~490 raw (delta 15). New files: gate 51, composition 29. No new pressure.

## Legacy / Compatibility
Pass. No compatibility path. The removed port methods are deleted, not wrapped. No persisted-data change.

## Docs-Impact
Yes, minor: `docs/modules/prompt_engineering.md` was updated for F02. Delivery's uncommitted module docs may mention the removed per-root fence or `lifetimePort`. Delivery should resync after API/E2E.

## Review Scorecard
- Overall **9.2 / 10 (92 / 100)**.

| # | Category | Score | Why | Remaining drag |
| --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.3 | release/report flow explicit end to end | dense line style |
| 2 | Ownership & Boundary Encapsulation | 9.3 | one closure latch, one membership authority, Task service owns no runtime state | — |
| 3 | API / Interface Clarity | 9.1 | slimmer port; business-only LLM contract | `readExecutionDispatch` adds a narrow query (justified) |
| 4 | SoC & File Placement | 9.1 | gate in runtime; binding in compositions | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.0 | tight report type | OBS-01 shared error field (pre-existing) |
| 6 | Naming & Readability | 9.0 | consistent rename | `purpose`/`helper` vocabulary under discussion; long lines |
| 7 | API/E2E Readiness | 9.2 | reviewer reran 37 files / 380 tests Pass; tsc clean | changed-build journeys pending |
| 8 | Runtime Correctness | 9.2 | latch-during-read, DONE-before/after-reserve and restart-closed covered | provider teardown basis unchanged |
| 9 | No Legacy | 9.3 | clean removal | — |
| 10 | Cleanup Completeness | 9.3 | F01/F03/F05 done; net deletion | — |

## Findings
None blocking. Observations for the designer (non-blocking, no routing):
1. Align SR-022's "No Projects service change" wording with the added `readExecutionDispatch` read method.
2. Record application-platform scoped roots as intentionally unbound (`TASK_LIFETIME_UNAVAILABLE` for linked/owned paths).
3. OBS-01 (shared link `error`) and the `purpose` naming/data-model proposal await the user's decision.

## Classification / Recommended Recipient
Pass, so no failure classification. Primary: `/api_e2e_engineer` for the changed-build recheck:
- DONE fence: synchronous rejection after DONE in every root.
- Repeat-DONE retry.
- Restart-closed: `admit` reads durable closed.
- Helper scope.
- Task-team messaging write count: 0 after delivery, 1 for a helper's first message.
- Unbound-service pending outcome.
- Both host startups compose once.

Informational: `/implementation_engineer`. DR-002 must not finalize `ccb5fbe3c`.

## Residual Risks
- Provider-private teardown (Claude SDK process owner etc.) was not re-traced; Claude owner necessity remains Unclear per SR-022 note.
- Pending `TASK_ROOT_RELEASE_UNAVAILABLE` records for unregistered roots still do not self-resolve (unchanged, truthful).
- IR-012 wide run: 82 failures reproduce identically on unchanged `ccb5fbe3`. These are pre-existing baseline failures, not relabelled green.

## Latest Authoritative Result
- Review Decision: **Pass**
- Entry Point: Implementation Review (round 25, Full Re-Audit of changed surface)
- Scenario Gate: Pass. Material-Premise Gate: Pass (none new)
- Score: 9.2/10; all categories ≥ 9.0
- Recipient: `/api_e2e_engineer` (primary), `/implementation_engineer` (informational)

---

# CRR-026 — User-Directed Data-Model Review (supersedes CRR-025 as latest result)

## Result
**Fail — Design Impact (persisted data model / ownership).** CRR-025's source Pass of IR-012 stays valid for its code. This round is a data-model review held with the user. It finds that the persisted Task-work model couples runtime run state into the business Task file and duplicates the runtime execution tree. Basis: design-principles P3 (single owner per fact; tight shared structures with one meaning per field) and DESIGN.md rule 5 / §3 (no duplicate state owners; remove unnecessary work). CRR-025 archived at `code-review-evidence/crr-025/code-review-report-crr-025-pass.md`.

## Business model (confirmed with the user)
- A Task has work periods. A period opens at first delegation and closes at DONE; reopening and delegating again starts a new period.
- Each assignment (`delegate_task(task_id)` to an Agent or a Team) is the root of a run tree. Every run later created for that Task by `delegate_task` (delegated) or by `send_message_to` starting a copy (broughtIn) has exactly one creator, so the creation lineage is a tree; team members hang under their Team copy. Messages add no edges. Several assignments in one period form a forest.
- Borrowed pre-existing outside runs are not part of the tree and are not released.
- DONE releases the whole tree (stops runs, frees runtime resources) and keeps conversations, files and history.

## Findings
### CR26-F01 — Runtime run state is stored in the business Task file (Design Impact)
- Current `projects.json` carries, for **every** owned run (assignment, delegation, helper), `dispatch`, `cleanup` and `error`. The root performs the release, and its result is copied back into the business file (`recordCleanup`).
- Release progress is runtime operation state owned by the root that stops the run. Storing it in the Task file creates a second holder (the same smell as CRR-024 F04), and it can go stale: after a restart nothing runs, yet the file can stay `pending`.
- Required: release state and its errors are owned and recorded by the host root, in its own runtime record. On repeat DONE, the Task service asks each `hostRoot` to release work period W, and the root retries only its unreleased runs.

### CR26-F02 — The Task file duplicates the runtime tree as a flat list (Design Impact)
- The runtime execution tree (run history) already holds the structure: delegated copies with `delegatorAgentRunId`, Team members, and the work-period stamp on each owned run.
- The Task file additionally lists every owned run flatly, and the release unions both records (F07 reconciliation exists only because of this duplication).
- Required: the Task stores only work periods and, per period, the **tops of its trees** (assignments: `role`, `hostRoot`, `worker`, dispatch accepted/failed). Everything below is derived from the runtime tree via the work-period stamp and creation lineage. Note that hosting position can differ from lineage (a brought-in helper may be hosted at root level), so the stamp/lineage, not physical nesting, defines the Task's tree.
- To verify in design: per-helper/per-delegation durable reservation exists so that DONE cannot miss an in-flight startup (AC-011). Under this model that guarantee must come from the IR-012 process latch plus the root's cancel-and-release sweep of its registered activations. The designer must confirm this coverage rather than assume it.

### CR26-F03 — Overloaded and unintuitive fields (Design Impact, folded into the reshape)
- One `error` field carries both dispatch and cleanup errors (previously CR24-OBS-01): a cleanup error overwrites the dispatch failure reason. Fix: separate errors, or none in the Task once release moves to the root.
- The Projects array mixes Project rows with one non-Project `{taskLifetimes}` record, discriminated by key presence.
- Vocabulary is runtime-flavoured: `lifetime`, `purpose: helper`, `completedAt` on a reopenable Task, and a redundant `ingressAgentRunId` for Agent workers.

## Proposed target shape (for the designer's decision; no migration needed, since this format never shipped)
```json
// Task row in projects.json (option A: work periods inside the Task)
{ "taskId": "t1", "description": "…", "status": "DONE", "contextFiles": [],
  "workPeriods": [ { "workPeriodId": "wp_1", "openedAt": "…", "closedAt": "…",
    "assignments": [ { "hostRoot": { "kind": "agent", "runId": "mgr_root" },
                       "worker": { "kind": "team", "teamRunId": "tr_1", "coordinatorAgentRunId": "ar_7" },
                       "dispatch": "accepted" } ] } ] }
// Runtime tree node (run history), each Task-owned run:
// taskWork: { workPeriodId, role: "assigned" | "delegated" | "broughtIn" }, createdBy (existing delegator), release: { state, error }
```

## Decisions for the Solution Designer to resolve with the user
1. **Where work periods live.**
   - (A) Inside the Task row, which is cleanest: DONE is atomic in one row and there is no extra array record. Consequence: deleting a Task removes its periods, so a deleted still-running Task's workers can no longer be messaged or woken. That fails closed, but it changes approved REQ-011/DEC-005 and needs explicit approval.
   - (B) A separate `project-task-work.json` keeps today's delete behavior, but DONE becomes an ordered two-file write.
2. **Role names:** one vocabulary everywhere: `assigned | delegated | broughtIn`. "collaborator" stays reserved for the user's @ concept. Does the Manager's Task view show only `assigned`? The reviewer recommends yes.
3. **The in-flight API/E2E recheck of IR-012:** this reshape touches the store, schema, port, stamps and release, so pausing that recheck avoids rework. This is the designer's and the user's call.

## Classification / Recipient
Design Impact → `/solution_designer`. User-directed on 2026-10-05.
