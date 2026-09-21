# API/E2E Execution Coverage Report — APP-STARTUP-LATENCY-20260918-001

## Execution Round Meta

- Current API/E2E revision: `API-REV-002`
- Current round: 2, recovery rerun after historical `API-REV-001` P01 Fail
- Requirements: approved `SR-010`
- Design: recovered `SR-011`
- Architecture review: `ARCH-REV-007` Pass
- Implementation: cumulative `IR-001`–`IR-005`
- Source review: `CRR-005` Pass
- Canonical investigation: `api-e2e-coverage-investigation.md`
- Canonical ledger: `api-e2e-test-case-ledger.md`
- Canonical revision history: `api-e2e-revision-record.md`
- Latest authoritative round: `API-REV-002`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: Code Reviewer
- Proportional test-code review: requested as `Not Applicable` because API/E2E added, updated or removed no durable repository test.

## Result

**Pass — 96.6% validation confidence.**

The prior critical P01 failure is resolved under the approved terminal-warning policy. On a fresh clone of the API/E2E-owned representative profile, the corrected migration ran once, retained all eight unchanged missing-tree identities and reasons with `failedCount=8`, created no target, and became terminal `SUCCEEDED_WITH_WARNINGS`. Three later full starts did not change attempts, timestamps, log path, targets, database bytes or any other tracked profile category. Typed token-data rollback/local unavailability and fatal precedence passed at the real SQLite/manager boundary. Normal Chrome retained Team and AgentOrg history and actual attachment Open behavior.

## Test-Case Ledger Reconciliation

| Case | Result | Direct evidence | Reconciliation |
| --- | --- | --- | --- |
| P01 | Pass | `validation/api-e2e-r2/p01-result.json` | Prior API-REV-001 failure resolved first |
| L01 | Pass | `p01-stable-{1,2,3}-summary.json`, `p01-terminal-stability.json` | Three terminal fresh starts under 10s, zero trace reads/fetches, exact stability |
| E01 | Pass | `token-warning-fatal-executable.log` | 5 files / 66 tests; typed rollback/local guard and fatal categories/precedence |
| H01/A01 | Pass | `browser-history-attachment-proof.json`, screenshots | Actual Team and AgentOrg history/attachment journeys |
| D01 | Pass | `p01-db-logical-comparison.json`, `browser-readonly-preservation.json` | Authorized first-run ledger-only delta; subsequent exact byte stability |
| C01 | Pass | `cleanup-process-check.txt`, empty browser tab list | Owned resources clean |

No case is running, interrupted, blocked or unstarted.

## P01 — Prior Failure Resolution

### First corrected startup

- Environment: fresh copy-on-write clone `.local/api-startup-profile-r2` of the prior API/E2E-owned representative clone; explicit owned database/memory paths; not the user's live profile.
- First health: **6425.083 ms**.
- Readiness raw-trace reads: **0**.
- External fetches: **0**.
- Flat-family ledger: `FAILED`, attempts 27 → `SUCCEEDED_WITH_WARNINGS`, attempts 28.
- Summary: `Scanned 526; migrated 0; skipped 518; failed 8.`
- Durable warning log: contains all eight sorted root identities and eight corresponding missing-tree reasons.
- Eight source roots: byte/stat exact before/after.
- New migration targets: **0**.
- Provider/inference start: **0**.

Exact warning roots:

1. `team_classroomsimulation_1ad20b5a`
2. `team_classroomsimulation_3629e668`
3. `team_classroomsimulation_77474497`
4. `team_classroomsimulation_7ebcecc4`
5. `team_classroomsimulation_8661ebcb`
6. `team_northstar-operating-company_6af4b5ba`
7. `team_software-engineering-team_359ede01`
8. `team_video-tutorial-creation-team_48955b3c`

### Authorized first-run persistence delta

A logical comparison of all 21 SQLite tables found only `app_data_migration_records` changed. The flat-family record changed to the approved terminal warning. A separate previously `NOT_RUN` history-summary migration recorded its first successful no-op result (`migrated 0`, `skipped 17`). Every other 20 SQLite table was exact. Definitions, traces, context files, history/runtime files and configuration were exact.

### Three later terminal starts

| Run | First health | Raw-trace reads | External fetches | Ledger/profile stability |
| --- | ---: | ---: | ---: | --- |
| `p01-stable-1` | 3210.487 ms | 0 | 0 | exact |
| `p01-stable-2` | 2555.660 ms | 0 | 0 | exact |
| `p01-stable-3` | 2562.309 ms | 0 | 0 | exact |

Across all three, the flat-family record stayed `SUCCEEDED_WITH_WARNINGS`, attempts stayed 28, and its timestamps/log path were identical. Targets stayed absent. Every tracked profile category, including physical SQLite bytes, was exact after the first corrected run.

## Typed-Token And Fatal Controls

Command:

`pnpm -C autobyteus-server-ts exec vitest run --no-watch tests/unit/app-data-migrations/agent-org-flat-team-families-v1-app-data-migration.test.ts tests/unit/app-data-migrations/agent-org-token-attribution-transition.test.ts tests/unit/app-data-migrations/agent-org-token-attribution-repository.test.ts tests/unit/app-data-migrations/agent-org-token-attribution-transition-classification.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts`

Result: **5 files / 66 tests Pass**.

Directly covered:

- malformed/conflicting token data becomes the approved typed rejection;
- the exact root SQL transaction rolls back;
- warning detail is retained and the warning-only result is terminal;
- the affected Org remains locally rejected by `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`;
- unrelated roots remain usable;
- query/update/precondition/reread/structural/unknown faults remain fatal;
- global discovery/database faults remain attempt-fatal;
- dependency failures remain fatal;
- fatal outcomes dominate warnings;
- the generic runner terminally skips the warning result.

Qualification: these destructive/corrupt states are not safely user-authorable from the frontend. They were therefore executed as repository fixtures at the real SQLite, transaction, migration coordinator and readiness-manager boundaries, not represented as browser acceptance.

## Browser History And Attachment Continuity

Execution surface: normal Chrome → current Nuxt → owned compiled backend.

### Team journey

1. Expanded the real `autobyteus-workspace-superrepo` workspace.
2. Opened `Software Engineering Team`.
3. Opened the retained history whose summary begins `Currently in the token statistics`.
4. Selected retained member `solution_designer`.
5. Observed and invoked the actual `Open image.png` control.
6. The stored image loaded from the exact Team REST locator at 3024×1886.

### AgentOrg journey

1. Opened retained Org run `nested_classroom_test_team_50a66215ad3648688d73998834c9ceb4` through the normal history route.
2. Selected mounted member `/StudentStudyGroup/student_one`.
3. Confirmed the retained conversation marker `can you see this image?`.
4. Observed and invoked the actual `Open image.png` control.
5. Chrome opened a new tab on the exact AgentOrg REST URL; title reported `ctx_c2e359d21475__image.png (3012×1892)`.

The prior API-REV-001 normal Agent history and 13/13 live Team/Org REST status/continuity evidence remain valid because the access/readiness production sources are preserved. This rerun proportionately rechecked the actual user-visible Team/Org paths affected by migration continuity instead of manufacturing API-only substitutes.

## Preservation After Browser Read

Relative to the post-terminal-start baseline, the final browser/backend journey preserved all tracked groups exactly:

| Category | Files | Bytes | Result |
| --- | ---: | ---: | --- |
| Definitions | 22 | 27,975 | exact |
| Raw traces | 6,577 | 6,622,505,377 | exact |
| Context files | 1,107 | 547,486,511 | exact |
| History/runtime | 5,618 | 294,209,275 | exact |
| Database | 1 | 875,474,944 | exact |
| Configuration | 1 | 3,635 | exact |

No Send was made and no provider inference was invoked. Normal background MCP/cache registration during server operation is not an inference/provider run.

## Repository And Build Evidence

| Scope | Result | Evidence |
| --- | --- | --- |
| Current production build | Pass | `validation/api-e2e/api-rev-002-build.log` |
| Current warning/fatal executable scope | 5 files / 66 tests Pass | `validation/api-e2e-r2/token-warning-fatal-executable.log` |
| Upstream current source review | 17/17 reviewer/detail coordinator checks, 88/88 focused, 3/3 adjacent, build Pass | `validation/crr005-detail-and-coordinator.log`, `ir005-*.log` |
| Historical API-REV-001 owner/access scope | 27 + 3 + 18 tests and build Pass | `validation/api-e2e/repository-*.log` |

API/E2E changed no durable repository test. Temporary observer/snapshot/comparison artifacts are retained only as execution evidence.

## Confidence Scorecard

| Category | Score | Supporting evidence | Residual |
| --- | ---: | --- | --- |
| Requirement and AC proof | 98% | Direct P01, terminal starts, typed/fatal controls, browser continuity | No material AC gap |
| Changed-boundary directness | 98% | Actual migration runner/SQLite/compiled process/exact stored roots | None material |
| Cross-boundary integration realism | 96% | Real server, Nuxt, Chrome, representative persisted profile | Corrupt inputs appropriately remain fixtures |
| Environment/config/identity fidelity | 95% | Fresh clone of an already-owned representative profile with explicit paths | Clone rather than user's live profile by safety design |
| Failure/edge/lifecycle/recovery | 97% | Warning transition, terminal skip, rollback, local guard, fatal precedence | No unsafe destructive live injection |
| User-surface/browser/desktop | 95% | Actual Team/Org navigation and attachment Open | No Electron shell-only execution; shell code unchanged |
| Durable regression quality | 97% | Real coordinator and SQLite regression scopes; owner/access coverage retained | Two unrelated base nested-Team fixture failures excluded |

- Overall confidence: **96.6%** (676 / 7, rounded).
- Applicable category below 90%: `No`.
- Missing/failing critical acceptance criterion: `No`.
- Confidence is certainty, not a pass rate.

## Broader Validation Decision

- Decision: `Required and completed`.
- Why required: API-REV-001 failed only at the representative persisted startup boundary; repository tests alone could not certify one-time terminal transition or byte stability. Browser continuity also remained material.
- Selected surfaces: compiled server lifecycle, filesystem/SQLite comparison, normal Nuxt/Chrome, repository SQLite fixtures for destructive negative states.
- Result: all selected journeys Pass.

## Compatibility / Persisted-Data Decision

- Backward-compatibility mechanism introduced: `No`.
- Legacy fallback/dual read/cache/background audit: `No`.
- Approved persisted-data outcome: one corrected execution of the existing failed migration, followed by terminal reuse.
- Observed: exact approved transition and terminal stability.
- Migration warning roots are not reported migrated; their sources remain unchanged and targets absent.

## Durable Coverage Changed By API/E2E

- Added: none.
- Updated: none.
- Removed: none.
- Proportional test-code review: request Code Reviewer record `Not Applicable` for the successful reviewed route.

## Temporary Evidence

Primary current-round directory: `validation/api-e2e-r2/`.

- `p01-result.json` — concise scenario result.
- `p01-ledger-*.json`, `p01-terminal-warning-log.txt` — persisted status/details.
- `p01-before-roots.json`, `p01-after-first-roots.json` — exact eight-root preservation/target absence.
- `p01-db-logical-comparison.json` — table-level first-run authorization check.
- `p01-terminal-stability.json` — later-start exact stability.
- `token-warning-fatal-executable.log` — typed/fatal control execution.
- `browser-history-attachment-proof.json` and screenshots — actual UI journeys.
- `browser-readonly-preservation.json` — post-browser byte stability.
- `cleanup-process-check.txt` — owned process/port cleanup.

## Cleanup

- Browser tabs: closed; final tab list empty.
- Backend port 51481 and Nuxt port 51483: stopped; no listeners.
- Owned processes referencing the worktree/profile: zero.
- Generated untracked SDK `dist` prerequisites: removed.
- Owned profile/evidence: retained for reproducibility.
- User process/profile/data: not used, stopped, migrated, reset or repaired in API-REV-002.

Historical note: API-REV-001's invalid absolute-path setup incident remains disclosed in that revision. It was not repeated in API-REV-002.

## Residual Risks And Limits

- `<10s` is representative-profile acceptance, not a universal SLA.
- Typed corrupt data and fatal SQL/structural states are real executable fixture evidence, not frontend-user actions.
- Browser evidence proves the web-equivalent renderer path; Electron window/preload behavior was not implicated or rerun.
- Two unrelated historical nested-Team REST fixture failures remain outside this ticket and are not hidden.

## Latest Authoritative Result

- Result: **Pass**
- Confidence: **96.6%**
- Broader validation: **Required and completed**
- Prior failure `API-REV-001 / P01`: **Resolved**
- Required next recipient: Code Reviewer for reviewed-route proportional test-code review; no API-owned durable test changed, so `Not Applicable` is requested.
