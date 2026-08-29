# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `implementation_engineer`; `implementation-handoff.md`; round 1 | `RER-010`, `IR-001` | N/A | Fail / 89.9% |
| API-REV-002 | `code_reviewer`; `code-review-report.md`; round 2 | `RER-010`, `IR-002`, `CRR-002`, prior `API-REV-001` | Fail / 89.9% | Pass / 97.1% |

## Revision Entries

### API-REV-001 — Initial direct-route live API/browser baseline

- Triggering role, report path, and round: `implementation_engineer`; `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-handoff.md`; execution round 1
- Triggering finding or scenario IDs: initial validation package; completed finding `APIE2E-F001` / `TS-E2E-002`
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: architecture/design/code-review/delivery revisions `N/A — not applicable or not yet produced`; implementation `IR-001`
- Why this baseline was recorded: first completed API/E2E result for REQPKG-TSUI-001; no prior record/result/confidence exists or is inferred.
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/token-statistics-seed.mjs`; added `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs`; updated `autobyteus-web/package.json` with `test:e2e:token-statistics-ui`; no API/E2E test removal.
- Scenarios added/rechecked: `TS-E2E-001` request/chart/failure-retry, `TS-E2E-002` truth matrix/gaps, `TS-E2E-003` Detailed usage, `TS-E2E-004` Run details, `TS-E2E-005` responsive/localized/negative file boundary; focused frontend/server regressions and builds.
- Commands/environment/fixture delta: built current server and Nuxt; generated current Prisma client; migrated and seeded probe-owned SQLite with production-format current rows; executed real Nuxt proxy and built backend on free ports in Chromium 149 at 1440/390, en/zh-CN; cleaned all owned runtime state.

#### Prior Failure Resolution

None — `API-REV-001` is the initial completed result.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; `evidence/api-e2e/*`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 89.9%`
- New or remaining failure IDs: `APIE2E-F001` — valid partial-pricing daily facets return `TOKEN_USAGE_ANALYTICS_SELECTED_COST_RECONCILIATION_FAILED`, blocking AC-004/009/011/016.
- Recommended recipient: `/code_reviewer` for focused failure-origin review
- Remaining risks/untested scope: successful partial monetary gap is blocked; unchanged packaged Electron shell not run; Linux validation host lacked full CJK glyph font although Simplified Chinese DOM/catalog and layout passed.

### API-REV-002 — Corrected partial-pricing live API/browser rerun

- Triggering role, report path, and round: `code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/code-review-report.md`; execution round 2 after `CRR-002`
- Triggering finding or scenario IDs: prior `F-001`; `APIE2E-F001 / TS-E2E-002`
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: architecture design/review `N/A — direct route`; implementation `IR-002`; code review `CRR-001`, `CRR-002`; prior API/E2E `API-REV-001`; delivery `N/A`
- Why this revision was recorded: rechecks the historical critical failure first against the reviewed implementation correction, then reruns the complete durable Live API + Browser + Lifecycle workflow.
- Coverage decisions or durable test paths changed: updated `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` so TS-E2E-002 opens `Exact bucket data` before reading visible evidence, asserts `Unpriced` plus raw `price_missing`, and captures `analytics-partial-cost.png`; no API/E2E addition or removal.
- Scenarios added, changed, removed, or rechecked: changed the interaction step inside TS-E2E-002; rechecked APIE2E-F001 and all TS-E2E-001–005, 13 server tests, 53 frontend tests, current server build, and lifecycle cleanup; no scenario added or removed.
- Commands, environment, fixture, or broader-validation delta: rebuilt current server; used current migrations and an isolated server test database; executed the retained self-starting probe twice after the first execution revealed its collapsed-disclosure read error; authoritative rerun used a fresh owned SQLite/data root, free ports, current built backend, Nuxt, and Chromium 149 at 1440/390 in English/Simplified Chinese.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F001 / TS-E2E-002`; `API-REV-001` | `Local Fix` — inherited backend aggregation policy rejected a legitimate usage-bearing null daily cost | Resolved by `IR-002 / CRR-002`; the null is admitted only with `MISSING` quality, remains null/gapped, and known values still reconcile | current server build PASS; policy + analytics GraphQL + ledger GraphQL 3 files/13 tests PASS; live `PARTIAL` result with no API error, $0.06 known total, `gapPoints=2`, `gapPaths=2`, and visible `Unpriced` / `price_missing` evidence |
| Round-2 collapsed exact-disclosure read | API/E2E-owned `Local Fix` found during rerun, not a production defect | Resolved within API-REV-002 by opening the disclosure before `innerText()` and rerunning the entire workflow | first rerun log; durable probe diff; final structured result `Pass`, failures empty, cleanup complete; partial-cost screenshot |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; retained current/historical JSON, logs, and screenshots under `evidence/api-e2e`
- Prior result and confidence: `Fail / 89.9%`
- Current result and confidence: `Pass / 97.1%`
- New or remaining failure IDs: `None`
- Recommended recipient: `/software_engineering_team/delivery_engineer`, subject to dynamic handoff rules
- Remaining risks, blocked evidence, or untested scope: deterministic current-schema seed instead of external provider ingestion; Linux host lacks a complete CJK screenshot font although correct Chinese DOM/layout passed; unchanged packaged Electron shell not run. None blocks delivery.
