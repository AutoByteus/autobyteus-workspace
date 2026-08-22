# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` / `code-review-report.md` / API/E2E round 1 | SR-001, ARCH-REV-001, IR-001–IR-003, CRR-001–CRR-003 | N/A | Fail / 61.4% |
| API-REV-002 | `/code_reviewer` / `code-review-report.md` / API/E2E round 2 | IR-004, CRR-004–CRR-005, API-REV-001 | Fail / 61.4% | Pass / 96.6% |
| API-REV-003 | `/code_reviewer` / `api-e2e-test-review-report.md` / API/E2E round 3 | CRR-006, API-REV-002 | Pass / 96.6% | Pass / 96.6% |
| API-REV-004 | user packaged-Electron field report / API/E2E round 4 | API-REV-003, approved prototype/requirements | Pass / 96.6% | Fail / 89.1% |

## Revision Entries

### API-REV-001 — Initial analytics coverage baseline exposes sparse-bucket reconciliation failure

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`; API/E2E round 1
- Triggering finding or scenario IDs: source review Pass with downstream risk list; API-001–API-003 executed; API-F-001 discovered
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, ARCH-REV-001, IR-001–IR-003, CRR-001–CRR-003
- Why this baseline or coverage/execution revision was recorded: establishes the first completed independent API/E2E result and records the critical failure discovered by the narrowest new durable analytics policy coverage
- Coverage decisions or durable test paths changed: added three requirement-linked server analytics test files; no update/removal
- Scenarios added, changed, removed, or rechecked: added API-001–API-003; API-004/API-005/WEB-001–WEB-003 remain planned and unexecuted
- Commands, environment, fixture, or broader-validation delta: project Vitest global setup applied all 24 migrations to isolated SQLite; focused 3-file run produced 10 pass / 1 fail; broader validation stopped

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail`, `61.4%`
- New or remaining failure IDs: `API-F-001` / scenario `API-003`
- Recommended recipient: `/code_reviewer` for focused failure-origin review
- Remaining risks, blocked evidence, or untested scope: atomic rollback/contention, analytics GraphQL/SafeInt/filter reconciliation, persisted coverage/restart/no-backfill, frontend stale/error/state/accessibility/responsiveness, exact CSV escaping/download; browser validation required after rework

### API-REV-002 — Sparse-bucket fix verified and full API/browser matrix passes

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`; API/E2E round 2
- Triggering finding or scenario IDs: `CRR-005` source Pass for `IR-004`; mandatory first recheck of API-F-001/API-003 followed by API-004/API-005/WEB-001–WEB-003
- Related revision IDs: IR-004, CRR-004–CRR-005, API-REV-001
- Why recorded: replaces the prior failed result with the completed independent rerun and captures durable cross-boundary coverage plus successful browser evidence
- Coverage changes: retained the three baseline backend units; added atomicity integration, analytics GraphQL E2E, Pinia state, analytics state, and trend tests; updated breakdown and CSV tests; removed none
- Scenario delta: API-F-001 resolved; API-001–API-005 and WEB-001–WEB-003 all pass; preserved Run-details GraphQL rechecked
- Execution delta: 5 backend files/18 tests, preserved GraphQL 1 pass, 11 web files/26 tests, both builds/guards, and a 19-assertion live Chrome journey passed on isolated state

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 / API-003 | Local Fix — implementation | Resolved: empty zero-usage buckets remain `NO_USAGE`/null and reconcile; usage-bearing null-cost buckets still fail | `server-analytics-aggregation-rerun.log` and `server-analytics-combined.log` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this record
- Prior result and confidence: `Fail`, `61.4%`
- Current result and confidence: `Pass`, `96.6%`
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` for proportional durable-test review
- Remaining risks: reviewed bounded SQLite timeout under sufficient saturation; packaged Electron and a separate restart cycle not run; live browser used empty/unavailable data while populated charts are directly covered by exact components plus populated GraphQL E2E

### API-REV-003 — Contention regression accepts only governed P1008 failures

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-test-review-report.md`; API/E2E round 3
- Triggering finding: `TR-F-001` in API-004's real-SQLite contention scenario
- Related revision IDs: CRR-006, API-REV-002
- Why recorded: the prior execution Pass remains valid, but the durable contention assertion was broader than the explicitly governed Prisma `P1008` residual and required a test-owned Local Fix before delivery
- Coverage-path change: updated only `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-analytics-atomicity.integration.test.ts`; no test added or removed
- Scenario delta: each rejected concurrent promise must now be an `Error` with exact code `P1008`; exact reconciliation of all committed run rows and the shared facet remains unchanged
- Execution delta: focused atomicity integration passed 1 file/3 tests; affected API-001–API-005 backend set passed 5 files/18 tests; `git diff --check` passed; no browser/build rerun was proportionate for a test-only assertion narrowing

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| TR-F-001 / API-004 | Local Fix — test | Resolved: unrelated errors can no longer satisfy the contention residual; every rejection must have exact Prisma code `P1008` | `server-analytics-atomicity-tr-f-001-rerun.log`; `server-analytics-combined-tr-f-001-rerun.log` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this record
- Prior result and confidence: `Pass`, `96.6%`
- Current result and confidence: `Pass`, `96.6%`
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` for proportional re-review of the corrected API-004 test
- Remaining risks: reviewed exact `P1008` timeout under sufficient SQLite saturation; previously documented packaged Electron/restart/live-populated-browser residuals unchanged

### API-REV-004 — Production-backend diagnosis confirms active-tab defect and first-upgrade expectation conflict

- Triggering role, report path, and round: user field report with two packaged Electron screenshots; API/E2E round 4
- Triggering finding or scenario IDs: `FIELD-F-001` selected dark-filled Analytics tab; `FIELD-F-002` empty first-upgrade/current-month graph despite existing stored lifetime usage
- Related revision IDs: API-REV-003; approved requirements/design/prototype package
- Why recorded: a real packaged-installation observation reopened the prior user-surface and persisted-data-transition conclusions, and the user explicitly requested independent current-frontend execution against the already-running Electron backend
- Coverage-path change: none in round 4; no durable test was added, edited, or removed
- Scenario delta: read-only live health/SQLite/GraphQL diagnosis plus current frontend production build and Chrome execution against the embedded backend
- Execution delta: the production backend currently returns non-zero post-coverage analytics and a fresh frontend renders it; Chrome independently reproduced the dark active-tab style and the production DB confirmed that 26.27B lifetime tokens are intentionally excluded by the approved no-backfill transition

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 / API-003 | Local Fix — implementation | remains resolved; live API returns coherent populated aggregates | `user-live-electron-graphql-this-month.json`; browser result |
| TR-F-001 / API-004 | Local Fix — test | remains resolved; round 4 did not alter durable coverage | API-REV-003 evidence remains authoritative |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this record
- Prior result and confidence: `Pass`, `96.6%`
- Current result and confidence: `Fail`, `89.1%`
- New or remaining failure IDs:
  - `FIELD-F-001` — Local Fix / implementation: selected tabs use `bg-slate-900 text-white`, while approved prototype requires transparent background plus blue active text/underline
  - `FIELD-F-002` — Design Impact / Requirement Gap: current no-backfill behavior is technically compliant but creates the user-rejected initially empty analytics experience despite extensive stored lifetime data
- Secondary risk: no polling/background refresh can retain an earlier empty result until explicit apply/range change/remount; the supplied screenshot timing does not conclusively identify this as its cause
- Recommended recipient: `/code_reviewer` for focused failure-origin review, likely splitting implementation ownership for FIELD-F-001 and solution-design ownership for FIELD-F-002
- Remaining risks: final intended historical/initial analytics behavior and refresh semantics require ownership before a fix and durable coverage can be validated
