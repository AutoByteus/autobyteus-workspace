# Code Review Revision Record — agent-tool-results-omit-empty (autobyteus-260)

The latest `code-review-report.md` or `api-e2e-test-review-report.md` is authoritative for its current result. This record indexes each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 (F-001, F-002) | Pass (CRR-001) | Fail | CR-001, CR-002 |
| CRR-003 | `code-review-report.md` | Implementation Review (Targeted Delta) / IR-002 | Fail (CRR-002) | Fail (Local Fix, Low) | CR-001, CR-002 resolved; CR-003 new |
| CRR-004 | `code-review-report.md` | Implementation Review (Targeted Delta) / IR-003 | Fail (CRR-003) | Pass | CR-003 resolved |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional Test-Code Review / API-REV-002 | Pass (CRR-004, source) | Pass | None |
| CRR-006 | `code-review-report.md` | Implementation Review (delivery re-entry) / IR-004, DR-001 | Pass (CRR-005) | Pass | None |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional Test-Code Review / API-REV-003 (DR-001) | Pass (CRR-006) | Not Applicable | None |

## Revision Entries

### CRR-001 — Initial implementation review of the result rule, Task title and `get_project_task`

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001); SCN-001–SCN-007
- Relevant solution revision IDs: SR-007, SR-008, SR-010, SR-011
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: `Pass` (9.4 / 10; every category ≥ 9.2) on `origin/personal@fc06a7355d...17d631c704` and autobyteus-agents `82b7bae`
- What changed in the review result and why: initial baseline. AR-001–AR-008 verified in code; nine candidates (C-01–C-09) recorded and rejected, including the implementer's four review points.
- Supported product scenario / material-premise basis changes: none; MP-001–MP-003 confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: `N/A`
- Recommended recipient: API/E2E engineer; implementation engineer informed
- Remaining risks or uncertainty: E2E files and web probes to update (API/E2E); DEC-023 wording vs the PM tool list (C-05); four root/service files near 500 lines.

### CRR-002 — Failure origin of API/E2E round 1: titles gated on keys-v1, worker-Task store drops the title

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); F-001 (API-03), F-002 (API-11c)
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-003 (MP-001)
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`
- What changed in the review result and why:
  - F-001 confirmed as CR-001, `Design Impact`. The titles migration's whole-run prerequisite on keys-v1 hides every Project's Tasks while one Project cannot be keyed, and base passes the same E2E.
  - F-002 confirmed as CR-002, implementation-owned `Local Fix`. `taskWorkerTaskStore.flush` drops `title` and the Workspaces tree crashes the app.
  - Both were earlier source-review gaps, and both are recorded in the report.
- Supported product scenario / material-premise basis changes: MP-001 reclassified from `Not Reachable` to `Reachable`, `Supported Explicit Edge Scenario`. Its basis is the released keys-v1 "hidden without lockout" contract plus data migration guideline § 1.

#### Prior Finding Resolution

None. CRR-001 had no findings.

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: CRR-001 categories 5 and 8 no longer hold; the next implementation review scores against the skill's new `>= 9.5` bar.
- Recommended recipient: Solution Designer (CR-001), carrying CR-002 into the next implementation round
- Remaining risks or uncertainty: API-11d and API-12 not yet run (blocked by CR-002); the web package has no type check that would have flagged CR-002.

### CRR-003 — IR-002 delta review: CR-001 and CR-002 resolved, one stale comment

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. The IR-002 source delta stays in the titles migration folder, the web worker-Task store, their tests, the startup E2E and `projects.md`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001, CR-002
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001 (the failures being fixed)
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` (CRR-002)
- Current authoritative result: `Fail`. The only finding is CR-003, a Low Local Fix.
- What changed in the review result and why:
  - CR-001 and CR-002 are verified fixed in code and tests.
  - keys-v1 keeps a title written before keying, and no later migration writes `task.json` (C-13).
  - The store's no-title guard is accepted as type narrowing for an unreachable answer (C-12).
  - New: the registry comment still states the removed keys dependency (CR-003).
- Supported product scenario / material-premise basis changes: MP-001 resolved (Reachable, now handled).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Design Impact) | Resolved | SR-012, ARCH-REV-004, IR-002 `dfbd2621bb` | Prerequisite is `projects-per-folder-v1` (`project-task-titles-app-data-migration.ts:59`). Own frozen validator with `taskKey` optional. keys-v1 writes `{...raw, taskKey}` (title kept). Unit test `:91` and startup E2E keys scenario: titles `SUCCEEDED` while keys-v1 is `FAILED`; other Projects listed with titles; blocked Task titled after the fix. IMP-12, IMP-13 Pass. |
| CR-002 | Open (Local Fix) | Resolved | IR-002 `52cbc28442` | `workerTaskOf` keeps `title`, and gives a Temp task `title: null` (`taskWorkerTaskStore.ts:14-21,74`). Store tests for both kinds and for a missing title. IMP-14 Pass. |

- New or remaining finding IDs: CR-003
- Material score or classification changes: scored against the new `>= 9.2` bar. Overall 9.4; category 10 at 9.0 because of CR-003 only.
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: the live probes are still to run (API/E2E); the Solution Designer's SR-012 docs are uncommitted.

### CRR-004 — CR-003 resolved; source review passes

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review` (IR-003 changes one comment, `56ceef568a`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); CR-003
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` (CRR-003)
- Current authoritative result: `Pass` (9.4 / 10; every category ≥ 9.2)
- What changed in the review result and why: the registry comment now states the per-Project-folders dependency and why keys-v1 is not a prerequisite. No code changed.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Local Fix, Low) | Resolved | IR-003 `56ceef568a` | `app-data-migration-registry.ts:133-134` diff, comment only. The implementer's recheck was 75 passed. |

- New or remaining finding IDs: None
- Material score or classification changes: category 6 is 9.4 and category 10 is 9.5; overall 9.4
- Recommended recipient: API/E2E engineer; implementation engineer informed
- Remaining risks or uncertainty: the live probes are still to run (API-03, API-11c, API-11d, API-12); the Solution Designer's SR-012 docs are uncommitted.

### CRR-005 — Proportional review of API/E2E test code: Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Proportional test-code review after the successful API/E2E run, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, 95%)
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` (CRR-004, source review)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The test commits are `75ad3e4cb2` and `fba908bff5`.
  - The new scope and titles-startup E2Es and the updated boundaries, project E2Es and web probes prove the approved shapes.
  - Removed assertions have replacements.
  - Nothing is newly skipped.
  - The fixtures follow TESTING.md's data and migration rules.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: `N/A`
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty:
  - FU-005's updated expectation is unexecuted (the base API changed).
  - FU-007 is a suite-load race with its cause recorded.
  - Docs "summary" wording at `autobyteus-web/docs/projects.md:694,696,706` for docs sync.
  - The documents listed in the report are uncommitted.

### CRR-006 — Delivery re-entry DR-001: the merged runtimes tool follows the one result rule

- Canonical review report updated: `code-review-report.md` (section "Round 5")
- Review entry point and round: Implementation Review, round 5 (delivery re-entry)
- Review scope: `Targeted Delta Review`. One tool pair from the integration merge; no spine node, shared interface or data shape of this ticket changed.
- Triggering role, report path, and finding or scenario IDs: delivery engineer, `delivery-revision-record.md` DR-001; implementation engineer, `implementation-handoff.md` IR-004
- Relevant solution revision IDs: `N/A`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-005)
- Current authoritative result: `Pass`
- What changed in the review result and why: `list_available_agent_runtimes` (autobyteus-303) now uses `toToolResultJson` and `toAgentToolsMcpStructuredJsonResult`. The shape changes by the rule only (null `remainingPercent`, `resetsAt` and `until` are left out). There is no output schema; GraphQL is unchanged; no skill depends on the nulls. Tests and docs were updated.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None. No findings were open.

- New or remaining finding IDs: None
- Material score or classification changes: none (9.4 / 10)
- Recommended recipient: API/E2E engineer; implementation engineer informed
- Remaining risks or uncertainty: FU-008 (fails on `origin/personal`). The tool's result shape changed after autobyteus-303 shipped in beta `v1.5.9-beta.7`; the release notes should mention it with this ticket's other result changes.

### CRR-007 — Test-code review after API/E2E round 3: no durable test changed

- Canonical review report updated: `api-e2e-test-review-report.md` (round 2)
- Review entry point and round: Proportional test-code review, round 2 (delivery re-entry DR-001)
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-003, 95%)
- Relevant solution revision IDs: `N/A`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-006)
- Current authoritative result: `Not Applicable`
- What changed in the review result and why: API/E2E round 3 commits (`9434420df5`, `d7a2b9c1ef`) touch only `tickets/`. The DR-001 fix's test changes belong to implementation and were reviewed in CRR-006.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: `N/A`
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: FU-002 to FU-008 (out of scope, recorded); the code-review documents are uncommitted.
