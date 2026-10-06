# Code Review Revision Record — task-run-resources-workspace-cleanup

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record keeps the concise history of every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 from `/implementation_engineer` (commit `af690af33`) | N/A | Fail (`Local Fix`) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 from `/implementation_engineer` (commit `489268fc7`) | Fail (`Local Fix`) | Pass | CR-001 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 / API-F-001 (BR-002) from `/api_e2e_engineer` (API-REV-001) | Pass | Fail (`Local Fix`) | CR-002 (new) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (Targeted Delta + `DESIGN.md`/`TESTING.md` recheck) / IR-003 from `/implementation_engineer` (commit `3570b8c10`) | Fail (`Local Fix`) | Pass | CR-002 (resolved); DOC-001 (Delivery docs obligation) |
| CRR-005 | `code-review-report.md` | Implementation Review, round 5 (Targeted Delta) / IR-004 (SR-009, ARCH-REV-004) from `/implementation_engineer` (commit `50b08001d`) | Pass | Pass | DOC-001 (resolved) |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-003) from `/api_e2e_engineer` | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review: sound design realization; the Agent tree's last-row leave skips motion and focus move

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-001), N/A
- Relevant solution revision IDs: SR-006, SR-007, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, classified `Local Fix`
- What changed in the review result and why: this is the initial baseline.
  - The server, contracts, and the Team/Org web paths match the reviewed design, with R-1 to R-3 applied.
  - CR-001: `AgentRunTaskRows.vue` uses `v-if="rows.length || leaving"`. That guard unmounts the whole `TransitionGroup` when the last task rows leave, so there is no 200 ms fade, no `aria-hidden`, and focus is lost instead of moving to the run row. A reviewer probe confirmed this.
- Supported product scenario / material-premise basis changes:
  - Baseline: CS-01 to CS-04.
  - C-01 is promoted (CR-001). C-02 to C-06 are rejected. C-07 (the hand-edited `generated/graphql.ts`) is held for API/E2E codegen evidence.
  - MP-001 and MP-002 are confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (Medium, blocking)
- Material score or classification changes: N/A (baseline). Score 9.2/10. API/E2E Readiness is 8.6 and Runtime Correctness is 8.4.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - reduced-motion removal takes about 2 frames;
  - collapsing a Team also animates;
  - the Team REQ-009 scope covers the Workspaces tree and main view only;
  - `generated/graphql.ts` needs codegen confirmation;
  - `teamExecutionViewState.ts` is at 476 effective lines.

### CRR-002 — Targeted delta: CR-001 resolved; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `af690af33..489268fc7` changes only `AgentRunTaskRows.vue` (the CR-001 file) and adds `AgentRunTaskRowsLeave.spec.ts`. No spine, shared interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-002), CR-001 / CS-02
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (`Local Fix`, CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The guard is now `v-if="rendered"`. `rendered` turns on when rows exist and turns off only after the last leave settles.
  - The leave hooks (fade, `aria-hidden`, inert, focus move) now run for the last row.
  - The new real-transition component test covers this; the reviewer ran it and it passes.
- Supported product scenario / material-premise basis changes: None. C-07 (codegen) is still held for API/E2E.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Medium, blocking) | Resolved | IR-002, commit `489268fc7` | Verified in code: `rendered` ref, immediate watch, `onRowLeaveSettled` on `after-leave` and `leave-cancelled`. `AgentRunTaskRowsLeave.spec.ts`: only-row case (tree kept, `aria-hidden` and inert, focus to the run row, tree gone after settle) and re-appearance case. Reviewer run: 4 files, 83/83 pass. |

- New or remaining finding IDs: None
- Material score or classification changes:
  - API/E2E Readiness 8.6 → 9.2;
  - Runtime Correctness 8.4 → 9.3;
  - Cleanup 9.0 → 9.3;
  - overall 9.2 → 9.35/10;
  - no classification.
- Recommended recipient: `/api_e2e_engineer` (primary); `/implementation_engineer` (informational).
- Remaining risks or uncertainty:
  - `generated/graphql.ts` needs codegen confirmation;
  - the Agent and Team trees have not been rendered in a browser (the Agent last-row leave was verified in jsdom with the real `TransitionGroup`);
  - reduced-motion removal takes about 2 frames;
  - the Team REQ-009 scope is limited to the Workspaces tree and main view;
  - `teamExecutionViewState.ts` is at 476 effective lines.

### CRR-003 — Failure origin for API-F-001: leave transition overridden by the move rule (CR-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md`, API-F-001 / BR-002 (AC-010 under the Team root)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, classified `Local Fix` → `/implementation_engineer`
- What changed in the review result and why:
  - `treeRowLeave.css` declares `.tree-row-move { transition: transform }` after `.tree-row-leave-active`, with equal specificity.
  - A leaving row that still carries the move class therefore transitions only `transform`.
  - The BR-002 class history and the computed `transition-property: transform` confirm it in real Chrome, 4/4.
  - The scenario is product-valid: selecting a worker row (AC-009) moves rows, then the Manager marks the Task DONE.
  - This is not a design issue: the design and UI spec define the motion correctly, and the defect is local CSS precedence.
  - It is a minor round-1 review gap: the overlap of same-specificity `transition` rules was visible in source.
- Supported product scenario / material-premise basis changes: None. CS-01 and CS-04 are reused.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Still resolved | API-REV-001 | BR-006: the last rows fade over 234 ms in real Chrome, the tree stays until they settle, and focus goes to the run row. |

- New or remaining finding IDs: CR-002 (Medium, blocking)
- Material score or classification changes: Runtime Correctness 9.3 → 8.5; classification `Local Fix`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - why the move class persisted past its 200 ms (no `transitionend`) is unexplained runtime detail; the required fix does not depend on it;
  - the proportional test-code review of `task-closure-root-visibility.e2e.test.ts` and the three updated web probes is still due on the API/E2E pass round.

### CRR-004 — CR-002 resolved; project `DESIGN.md`/`TESTING.md` recheck; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`. `489268fc7..3570b8c10` changes only `treeRowLeave.css` and its spec. The project-guide recheck covers the whole change set.
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-003), CR-002 / API-F-001
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (`Local Fix`, CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  1. CR-002 is resolved. The move rule now comes first, and the leave rule lists opacity, max-height, margin-top and transform. The new cascade test passes, and it fails against the old CSS (reviewer-verified, then the file was restored).
  2. Correction: rounds 1–3 had not read the repository's `DESIGN.md`, `TESTING.md` or the package `AGENTS.md` files. Round 4 rechecks the whole change against them:
     - no structural verdict or score changes;
     - the global-work count for `closedAgentRunsIn` is now recorded (in memory, N_org × E for the history list, no cache warranted under `DESIGN.md` rule 5 / BP 6);
     - **DOC-001**: the canonical area-contract doc `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` must list `TASK_EXECUTIONS_CLOSED` and the snapshot's `closed_task_executions` in the same change. Delivery owns this.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (Medium, blocking) | Resolved | IR-003, commit `3570b8c10` | CSS order and leave property list verified. `useLeavingTreeRows.spec.ts` cascade test passes and fails on the old CSS. 6/6 targeted tests pass. The real-browser BR-002 rerun is pending with API/E2E. |
| CR-001 | Resolved | Still resolved | API-REV-001 | `AgentRunTaskRowsLeave.spec.ts` passes; BR-006 passed in the browser. |

- New or remaining finding IDs: None blocking. DOC-001 is a non-blocking Delivery docs obligation.
- Material score or classification changes: Runtime Correctness 8.5 → 9.3; overall 9.35/10.
- Recommended recipient: `/api_e2e_engineer` (primary); `/implementation_engineer` (informational).
- Remaining risks or uncertainty:
  - the real-browser BR-002 rerun is pending;
  - the history-list closure cost is N_org × E in memory (refine only if observed);
  - the earlier residuals still stand.

### CRR-005 — SR-009 per-root closed index and protocol and module docs (IR-004); Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review`. `3570b8c10..50b08001d` changes one service (+20/−6), its unit test and four docs. The `closedAgentRunsIn` signature and contract are unchanged.
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-004), SR-009 / AE-16, AE-17 / R-5, R-6 / DOC-001
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001 (a rerun is pending)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The user-approved, architecture-reviewed SR-009 index replaces the per-call full scan. It belongs to the same owner and has the same single `swap()` update point as `owners`. It supersedes my round-4 "no cache warranted" note, which the approved design decision now overrides.
  - Verified: the update order (forget previous, then add closed), the `closedAgentRunsIn` contract, the damaged-file exclusion, the restart rebuild, the R-5 name, and the consistency test.
  - DOC-001 is resolved (protocol doc), and R-6 module docs are verified against the code.
- Supported product scenario / material-premise basis changes: C-08 (cross-Task conflict) and C-09 (ordering) are rejected: unsupported or no consumer.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DOC-001 | Open (Delivery docs obligation) | Resolved | IR-004, SR-009 | `agent_websocket_streaming_protocol.md` § Team Server Messages and the new "Closed task executions" subsection |
| CR-001, CR-002 | Resolved | Still resolved | — | No change in this delta. The browser rerun is pending with API/E2E. |

- New or remaining finding IDs: None
- Material score or classification changes: overall 9.35 → 9.4/10; no classification.
- Recommended recipient: `/api_e2e_engineer` (primary); `/implementation_engineer` (informational).
- Remaining risks or uncertainty:
  - the API/E2E rerun must cover both CR-002 (BR-002) and the IR-004 server change (closure reads and the Org history list);
  - the earlier residuals still stand.

### CRR-006 — Proportional test-code review after the API/E2E Pass; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (round 3), BR-001 to BR-007 and API-E2E-001
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A (first test review; source review stands at CRR-005, Pass)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Reviewed six durable paths: the new gated server E2E, the new browser probe and its `package.json` script, and three probes updated with a bounded `afterLeave` wait for the approved collapse motion.
  - The tests enter through real triggers, assert requirement outcomes, own their isolation and cleanup, and agree with the round-3 evidence.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (no prior test-review findings).

- New or remaining finding IDs: None. Non-blocking observations:
  - the conditional stop-order assertion;
  - the BR-002 move-class state is recorded but not asserted;
  - `TESTING.md` entries for Delivery;
  - the test changes need explicit staging.
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: the accepted residuals listed in the test review report.
