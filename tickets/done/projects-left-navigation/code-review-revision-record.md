# Code Review Revision Record — projects-left-navigation

The latest `code-review-report.md` is authoritative for the current result; this record indexes every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1; IR-001 from the implementation engineer | N/A | Fail (`Design Impact`) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2; IR-002 (SR-009, ARCH-REV-003) | Fail | Pass | CR-001, CR-002 (resolved) |
| CRR-003 | `code-review-report.md` (Latest Round section) | API/E2E Failure-Origin Review; API-REV-001 PLN-09 | Pass | Fail (`Local Fix`, implementation) | CR-003 |
| CRR-004 | `code-review-report.md` (Latest Round section) | Implementation Review, round 3 (Targeted Delta); IR-003 | Fail | Pass | CR-003 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional test-code review after API-REV-002 Pass | Pass (CRR-004 source) | Pass | None |

## Revision Entries

### CRR-001 — Initial source review of IR-001

- Canonical review report updated: `tickets/in-progress/projects-left-navigation/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, HEAD `73d598c008`); OPS-001
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`. The implementation follows the reviewed design and is otherwise ready. One approved constraint is contradicted.
- What changed in the review result and why: initial baseline.
- Supported product scenario / material-premise basis changes: OPS-001 is added. A rollback per `RELEASE.md` § Rollback is a supported explicit-edge operational scenario under the requirements' Data Continuity constraint.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - CR-001 (`Design Impact`): the index rows' `projectId` makes pre-change index readers reject the whole index after a rollback.
  - CR-002 (`Local Fix`, minor): a misplaced doc comment in `utils/runTreeProjection.ts`.
- Material score or classification changes: API/E2E Readiness 9.0 and Runtime Correctness 8.8, both because of CR-001.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: whether the Data Continuity constraint stands, given DESIGN rule 9 and the migration guideline § Rolling back; this is the Solution Designer's call, with the user's approval if the constraint changes.

### CRR-002 — Re-review of IR-002 (SR-009): the record moves to `project_runs.json`

- Canonical review report updated: `tickets/in-progress/projects-left-navigation/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. Server structural checks were rerun in full because the stored shape, the ports, the composition and the DS-001/002/005 order changed. Web evidence is carried forward: the only web change is the CR-002 comment move in `utils/runTreeProjection.ts`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002, HEAD `e1d9a58a13`, code `467cff24c0`); CR-001, CR-002; OPS-001
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: the CR-001 premise (OPS-001) is now satisfied. The run-history files are byte-equal to the base, and the Projects-owned `project_runs.json` is never read by older builds. New candidates C-08…C-12 were each rejected with evidence: harmless orphan entries, the Team refusal order, the per-activation lookup cost, the `{kind, runId}` vocabulary (it matches the Task file's `hostRoot`), and the application host's view.
- Supported product scenario / material-premise basis changes: OPS-001 goes from Contradicted to Confirmed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Design Impact) | Resolved | SR-009, ARCH-REV-003, IR-002 | `git diff --stat 0ae78c9b91 e1d9a58a13 -- run-history/store team-run-execution-tree.ts team-run-history-index-row-projector.ts` is empty; `run-records-rollback-shape.test.ts`; IMP-10; IMP-11 (released index and metadata keys, `project_runs.json` written, listed after restart) |
| CR-002 | Open (Local Fix) | Resolved | IR-002 | `utils/runTreeProjection.ts`: the doc comment is back above `projectWorkspaceHistoryByWorkspace` |

- New or remaining finding IDs: none.
- Material score or classification changes: average 9.5; API/E2E Readiness 9.0 → 9.4; Runtime Correctness 8.8 → 9.4.
- Recommended recipient: API/E2E Engineer; informational notice to the implementation engineer.
- Remaining risks or uncertainty: the report's Residual Risks (a live restore or Team-member prompt, Team placement timing, the multi-Project Task line, the Org scope filter test, the real-delegation journeys).

### CRR-003 — Failure-origin review of API-REV-001 PLN-09

- Canonical review report updated: `code-review-report.md`, § Latest Round: API/E2E Failure-Origin Review
- Review entry point and round: API/E2E Failure-Origin Review
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); API-04 PLN-09 (AC-012)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail, an implementation defect.
- What changed in the review result and why: after a web Stop, `agentRunStore.terminateRun` updates only the run history store (`markRunAsInactive`, `refreshTreeQuietly`). `projectRunsStore` re-reads only after archive and delete (`RUN_REMOVALS`), and `projectRunsProjection` overlays status from live contexts only. So a stopped run with no context stays "running" in Projects mode, and "Archive all" stays blocked, until the next re-read. The same applies to Team stop by code inspection; Org stop is to be checked. The test is valid; the scenario is a Supported Normal Scenario.
- Supported product scenario / material-premise basis changes: DS-004's "status changes need no re-read" holds only for runs with a live context. The extension of trigger (4) to web Stop is within the approved intent ("exactly as Workspaces").

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved | CRR-002 | Unaffected; API-01 confirms the released run-record keys |
| CR-002 | Resolved | Resolved | CRR-002 | Unaffected |

- New or remaining finding IDs: CR-003 (Local Fix, implementation).
- Review gap: CRR-001 C-04 and CRR-002 accepted the `RUN_REMOVALS` trigger set without checking how Workspaces handles a stop of a run with no context. That was detectable in `agentRunStore.terminateRun`.
- Material score or classification changes: the classification is now `Local Fix`. The CRR-002 scorecard is not rewritten; its next source round rescores Runtime Correctness.
- Recommended recipient: Implementation Engineer. Then a targeted-delta source review, the API/E2E rerun, and the proportional test-code review of the API/E2E durable tests, which was deferred because the failure-origin and test-code reviews are separate entry points.
- Remaining risks or uncertainty: whether the Org stop path behaves the same, to be checked in the fix. FU-007 and FU-008 stay out of scope.

### CRR-004 — Targeted-delta review of IR-003 (CR-003 fix)

- Canonical review report updated: `code-review-report.md`, § Latest Round: Implementation Review, Targeted Delta
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. The delta is `projectRunsStore.ts` and its spec only, within CR-003's owner and files. There is no server change and no shared interface change.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003, HEAD `344ccade3d`); CR-003; API-04 PLN-09
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why: DS-004 trigger (4) now covers the web's Stop of a listed root (Agent, Team and Org) through one `rereadAfter` rule in `projectRunsStore`. The probe passes PLN-01…10 (IMP-12) and the web checks pass (IMP-13).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Local Fix) | Resolved | IR-003 (`60499aa479`, `c9972a1581`) | `projectRunsStore.ts` `rereadAfter` covers the four owners; two new spec cases fail before the fix; IMP-12 PLN-09 `projectsStopButtonsAfter5s: 0`; IMP-13 typecheck PASS and 1350 tests |

- New or remaining finding IDs: none.
- Material score or classification changes: Runtime Correctness 9.4; every category ≥ 9.4.
- Recommended recipient: API/E2E Engineer, for the rerun, then the deferred proportional test-code review of the API/E2E durable tests.
- Remaining risks or uncertainty: none new. FU-007 and FU-008 stay out of scope.

### CRR-005 — Proportional test-code review after API-REV-002

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1 (deferred from CRR-003)
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, Pass, 95%)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-004, source review)
- Current authoritative result: Pass (test-code review)
- What changed in the review result and why: four durable test changes were reviewed: the server E2E `project-run-history.e2e.test.ts`, the harness `startRoot(..., extra)`, the browser probe with its `package.json` script, and the Org scope component spec. The scenarios are clear and requirement-aligned, the assertions are on stored state, reads and DOM, the stacks are isolated and owned, and the tests enter through real triggers. No findings.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (first test review; CR-001…CR-003 were resolved in earlier source rounds).

- New or remaining finding IDs: none.
- Material score or classification changes: N/A.
- Recommended recipient: Delivery Engineer.
- Remaining risks or uncertainty: the API/E2E residual risks (FU-007, FU-008; restore prompt for recomposing runtimes is unit-only; SCN-010 remote by shared key; Org Stop by store spec; the multi-Project Task line). The DS-004 wording follow-through is for delivery.
