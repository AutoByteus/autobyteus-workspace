# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `implementation_engineer`; `implementation-handoff.md`; round 1 | `RER-010`, `IR-001` | N/A | Fail / 89.9% |

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
