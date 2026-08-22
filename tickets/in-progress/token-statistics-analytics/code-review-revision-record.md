# Code Review Revision Record

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative. This record preserves the concise chronological review history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | Implementation Review round 1 / `IR-001` | N/A | Fail — Local Fix | F-001, F-002, F-003 |
| CRR-002 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | Implementation Review round 2 / `IR-002` | Fail — Local Fix | Fail — Local Fix | F-003 |
| CRR-003 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | Implementation Review round 3 / `IR-003` | Fail — Local Fix | Pass | None |
| CRR-004 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | API/E2E Failure-Origin Review / `API-REV-001`, API-F-001/API-003 | Pass | Fail — Local Fix | F-004 |
| CRR-005 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | Implementation Review round 5 / `IR-004` | Fail — Local Fix | Pass | F-004 |
| CRR-006 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-test-review-report.md` | Successful API/E2E Test-Code Review / `API-REV-002` | Pass — source review and API/E2E | Fail — Local Fix | TR-F-001 |
| CRR-007 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-test-review-report.md` | API/E2E Test-Code Re-review / `API-REV-003` | Fail — Local Fix | Pass | TR-F-001 |
| CRR-008 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | API/E2E Failure-Origin Review / `API-REV-004`, FIELD-F-001/FIELD-F-002 | Pass | Fail — split rework | F-005, F-006 |
| CRR-009 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md` | Implementation Review round 9 / `IR-005`, F-005 | Fail — split rework | Fail overall; IR-005 Pass | F-005 resolved; F-006 open |

## Revision Entries

### CRR-001 — Initial implementation review finds preserved-run and analytics-evidence defects

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `Implementation Review`, round `1`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-handoff.md`; `IR-001`; existing Run-details GraphQL scenario plus F-001–F-003
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: `Fail` — `Local Fix` to `/implementation_engineer`
- What changed in the review result and why: established the initial code-review baseline after tracing the complete write/read/UI paths. The core architecture is coherent, but shared aggregation regresses the preserved mixed-runtime Run-details contract, Custom-range pace uses bucket ordinal rather than elapsed calendar position, and chart/table/CSV evidence omits or mislabels approved share/status/accessibility facts.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `F-001`, `F-002`, `F-003`
- Material score or classification changes: initial score `8.9/10 (89/100)`; shared structures `8.2`, API/E2E readiness `7.8`, and runtime correctness `7.9`; overall classification `Local Fix`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: cross-run SQLite contention, SafeInt extremes, digest/cardinality cases, cost-quality combinations, and full rendered states remain downstream executable-coverage work after source review passes.

### CRR-002 — Rework resolves F-001/F-002 but leaves one cumulative-quality mismatch

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `Implementation Review`, round `2`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-handoff.md`; `IR-002`; F-001–F-003
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` — Local Fix, F-001–F-003
- Current authoritative result: `Fail` — Local Fix, remaining F-003 only
- What changed in the review result and why: verified F-001 by source and the formerly failing clean-DB E2E; verified F-002 through elapsed-coordinate source/tests; accepted the exact table, tooltip, local formatting, share, and CSV portions of F-003. A remaining cumulative-quality branch marks separate complete remote plus local/no-bill buckets `PARTIAL`, contradicting the canonical/server policy that this combination is `COMPLETE`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open | Resolved | IR-002, CRR-001 | Run adapter restores distinct-summary merge; existing clean migrated GraphQL E2E now passes 1/1. |
| F-002 | Open | Resolved | IR-002, CRR-001 | Pace uses linear elapsed-day points; focused test proves unequal 8-vs-7 bucket endpoints both land at day 213 and shorter prior month at day 28. |
| F-003 | Open | Remaining (narrowed) | IR-002, CRR-001 | Exact evidence/share/local formatting/CSV fields pass focused tests; direct source probe shows COMPLETE + LOCAL cumulative endpoint mislabeled PARTIAL. |

- New or remaining finding IDs: `F-003`
- Material score or classification changes: score improved from `8.9/10 (89/100)` to `9.3/10 (93/100)`; F-001/F-002 resolved; classification remains `Local Fix`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: downstream contention, SafeInt, digest/cardinality, cost-quality matrix, and rendered-state coverage remain after source review passes.

### CRR-003 — Final cumulative-quality correction passes source review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `Implementation Review`, round `3`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-handoff.md`; `IR-003`; remaining F-003
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` — Local Fix, remaining F-003
- Current authoritative result: `Pass`
- What changed in the review result and why: the cumulative pace helper now centralizes provider-equivalent precedence. `COMPLETE` priced usage plus `LOCAL` no-bill usage remains `COMPLETE` with the priced currency, while captured status remains `mixed`; focused mounted and direct policy checks pass.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-003 | Remaining | Resolved | IR-003, CRR-002 | Source merge matches canonical precedence; focused 3-file frontend run passes 6/6; mounted endpoint exact row shows Complete estimate, mixed captured status, and USD; direct policy probe confirms complete+local, complete+missing, all-local, and mixed-currency outcomes. |

- New or remaining finding IDs: None.
- Material score or classification changes: score improved from `9.3/10 (93/100)` to `9.4/10 (94/100)`; review decision changed from `Fail — Local Fix` to `Pass`.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: independent API/E2E investigation/execution still owns contention, SafeInt, identity/cardinality, cost-quality, range, and rendered-state coverage.

### CRR-004 — Sparse-bucket API failure reopens bounded reconciliation policy

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `API/E2E Failure-Origin Review`, round `4`
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-execution-coverage-report.md`; `API-REV-001`; `API-F-001` / `API-003`
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`, `IR-002`, `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` — implementation review CRR-003
- Current authoritative result: `Fail` — `Local Fix` to `/implementation_engineer`
- What changed in the review result and why: independent API/E2E coverage exercised an ordinary sparse complete-cost range. Empty calendar buckets are correctly constructed as `NO_USAGE`/null cost, but the source guard rejects every null bucket whenever the whole range has a known cost, so the supported Settings analytics path fails before rendering. The origin is an implementation defect and an earlier source-review gap.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved | Remains resolved | IR-002, CRR-002, CRR-003 | API-F-001 does not touch Run-details identity aggregation. |
| F-002 | Resolved | Remains resolved | IR-002, CRR-002, CRR-003 | API-F-001 does not touch elapsed pace coordinates. |
| F-003 | Resolved | Remains resolved | IR-003, CRR-003 | API-F-001 does not touch cumulative presentation-quality precedence or exact evidence. |

- New or remaining finding IDs: `F-004`
- Material score or classification changes: no full scorecard was repeated. The prior Pass is superseded by a failure-origin `Fail`; CRR-003's API/E2E-readiness and runtime-correctness rationale is reopened only for F-004. Classification is `Local Fix`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: after source correction/re-review, API/E2E must recheck API-F-001/API-003 first and then execute the still-pending API-004/API-005/WEB-001–WEB-003 matrix. Successful-run proportional review of the three durable tests remains pending.

### CRR-005 — Sparse-bucket correction resolves F-004 and returns to API/E2E

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `Implementation Review`, round `5`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-handoff.md`; `IR-004`; `F-004`, `API-F-001` / `API-003`
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` — Local Fix, F-004
- Current authoritative result: `Pass`
- What changed in the review result and why: reconciliation now excludes only buckets whose aggregate has zero reports and zero tokens before known-cost null checking and summation. Returned empty buckets remain `NO_USAGE`/null; usage-bearing null-cost buckets still fail. The focused migrated test passes all four policy scenarios.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-004 | Open | Resolved | IR-004, CRR-004, API-REV-001 | Source filters only truly empty bucket aggregates; reviewer rerun passes 1 file / 4 tests after 24 migrations, including explicit empty `NO_USAGE`/null preservation and companion usage-bearing null rejection. |

- New or remaining finding IDs: None.
- Material score or classification changes: full implementation score returns to `9.4/10 (94/100)` and the decision changes from `Fail — Local Fix` to `Pass`; F-001–F-003 remain resolved.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: API-REV-001 remains failed until API-F-001/API-003 is independently rechecked; API-004/API-005/WEB-001–WEB-003 and later successful-run proportional review of durable API/E2E test changes remain required.

### CRR-006 — Proportional test review finds over-broad contention rejection assertion

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-test-review-report.md`
- Review entry point and round: `Successful API/E2E Test-Code Review`, round `1`
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-execution-coverage-report.md`; `API-REV-002`; API-001–API-005 and WEB-001–WEB-003
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`–`IR-004`
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` — CRR-005 source review and API-REV-002 API/E2E execution
- Current authoritative result: `Fail` — `Local Fix` to `/api_e2e_engineer`
- What changed in the review result and why: proportional review of ten durable test paths found that API-004 accepts any `Error` for rejected concurrent writes even though the governing coverage decision permits specifically bounded SQLite contention/timeouts and the evidence identifies `P1008`. This can hide unrelated transaction or programming failures. The other durable tests are coherent, deterministic, and requirement-aligned.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `TR-F-001`
- Material score or classification changes: no implementation scorecard or execution-confidence score was reopened. The separate durable-test review result is `Fail — Local Fix`.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: enumerate/assert the governed SQLite contention rejection code(s), rerun the focused integration and affected combined backend set, and return for proportional test-code re-review before delivery.

### CRR-007 — Exact P1008 assertion resolves TR-F-001

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-test-review-report.md`
- Review entry point and round: `API/E2E Test-Code Re-review`, round `2`
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-execution-coverage-report.md`; `API-REV-003`; `TR-F-001` / API-004
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`–`IR-004`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` — Local Fix, TR-F-001
- Current authoritative result: `Pass`
- What changed in the review result and why: API-004 now requires every rejected concurrent promise to be an `Error` with exact Prisma code `P1008`. The variable contention outcome and exact reconciliation for all committed writes remain unchanged, so unrelated errors can no longer satisfy the governed residual. Focused integration and affected backend-matrix reruns pass.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-F-001 | Open | Resolved | CRR-006, API-REV-003 | Corrected lines 147–150 assert `Error` plus exact `code: "P1008"`; focused API-004 passes 1 file/3 tests and combined API-001–API-005 passes 5 files/18 tests. |

- New or remaining finding IDs: None.
- Material score or classification changes: the separate proportional test-review decision changes from `Fail — Local Fix` to `Pass`; the implementation scorecard and API/E2E confidence remain unchanged.
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: only the bounded, already documented operational/product residuals in API-REV-003 remain; no test-review blocker remains.

### CRR-008 — Packaged field report splits prototype fix from first-upgrade requirement reset

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `API/E2E Failure-Origin Review`, round `8`
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer` after user packaged-Electron field report; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-execution-coverage-report.md`; `API-REV-004`; `FIELD-F-001`, `FIELD-F-002`
- Relevant solution revision IDs: `SR-001`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`–`IR-004`
- Relevant API/E2E revision IDs: `API-REV-004`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` — CRR-007 with API-REV-003 Pass/96.6%
- Current authoritative result: `Fail` — split rework: Local Fix for F-005 and Requirement Gap for F-006
- What changed in the review result and why: the real packaged surface and independent current-frontend execution prove that the selected Analytics/Run-details tab uses a dark filled style contrary to the approved transparent blue-underlined prototype. Production data also proves the locked no-backfill behavior works as designed, but the user now explicitly rejects the initially empty first-upgrade experience despite extensive retained lifetime data. Later live GraphQL/current-frontend data is populated, so no current backend aggregation defect was reproduced.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001–F-004 | Resolved | Remain resolved | IR-002–IR-004, CRR-002–CRR-005, API-REV-004 | Field evidence does not reopen mixed Run-details identity, pace/evidence, cumulative quality, or sparse-bucket reconciliation; live API remains coherent. |
| TR-F-001 | Resolved | Remains resolved | API-REV-003, CRR-007 | Round 4 changed no durable test and produced no contrary contention evidence. |

- New or remaining finding IDs: `F-005` / FIELD-F-001; `F-006` / FIELD-F-002.
- Material score or classification changes: no scorecard was repeated. The latest result changes from Pass to Fail; F-005 is `Local Fix` implementation and F-006 is `Requirement Gap`. The possible stale mounted-result subtype remains `Unclear` and does not drive a finding or prescription.
- Recommended recipients: `/implementation_engineer` for F-005; `/solution_designer` for F-006.
- Remaining risks or uncertainty: solution design must define a truthful immediately useful existing-data experience and refresh semantics before implementation; delivery remains blocked.

### CRR-009 — Tab-fidelity correction passes while F-006 keeps the package blocked

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Review entry point and round: `Implementation Review`, round `9`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-handoff.md`; `IR-005`; `F-005` / `FIELD-F-001`
- Relevant solution revision IDs: `SR-001`; F-006 solution revision pending
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-005`
- Relevant API/E2E revision IDs: `API-REV-004`
- Relevant delivery revision IDs: `DR-001`, `DR-002`
- Prior authoritative result: `Fail` — split rework, F-005 Local Fix and F-006 Requirement Gap
- Current authoritative result: `Fail` overall; bounded IR-005 source correction `Pass`
- What changed in the review result and why: both selected tab branches now directly implement the approved transparent blue-underlined treatment. Source, the strengthened focused regression, computed styles, and desktop/mobile rendered evidence agree; semantics, focus, activation, inactive styling, and overflow remain correct. IR-005 deliberately does not address the independently routed F-006 requirement gap.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-005 / FIELD-F-001 | Open | Resolved | CRR-008, IR-005 | `TokenUsageStatistics.vue` uses shared transparent/2px-border styling and selected blue-600/blue-700 classes for both tabs; reviewer Vitest passes 1/1; computed-style JSON and four screenshots verify both states at 1440×1000 and 390×844. |
| F-006 / FIELD-F-002 | Open — Requirement Gap | Remains open | CRR-008; solution revision pending | IR-005 changes no backfill, existing-data, polling, or refresh policy; the upstream product decision is still unresolved. |
| F-001–F-004, TR-F-001 | Resolved | Remain resolved | IR-002–IR-004, CRR-002–CRR-007 | IR-005 changes only the tab coordinator/style regression and supplies no contrary evidence. |

- New or remaining finding IDs: `F-006` only.
- Material score or classification changes: implementation-quality score is `9.4/10 (94/100)` and F-005 changes from open to resolved. The overall decision remains `Fail` solely because the independent F-006 Requirement Gap prevents implementation-review/API/E2E advancement.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: the truthful immediately useful first-upgrade experience and refresh lifecycle require renewed approval and architecture review; API-REV-004 remains the latest execution result and delivery stays blocked.
