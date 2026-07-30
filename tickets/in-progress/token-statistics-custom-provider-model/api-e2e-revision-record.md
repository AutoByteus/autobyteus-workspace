# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` CRR-002 / execution round 1 | `IR-002`, `CRR-002`, approved architecture package | N/A / N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Live GraphQL, migration lifecycle, and browser validation baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/code-review-report.md`; round `1`, after CRR-002 source-review Pass for commit `6176e1525`.
- Triggering finding or scenario IDs: `API-GQL-001/002`, `API-MIG-001..004`, `BROWSER-TOK-001`; prior source finding F-001 was already resolved upstream and had no API/E2E failure.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-*` in solution package; `ARCH-REV-*`; `IR-002`; `CRR-002`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: First completed API/E2E result. The approved change added live GraphQL display fields, recursive Task display alignment, a required persisted-data migration, and a changed web-equivalent settings surface; repository tests alone left live API/lifecycle/browser gaps.
- Coverage decisions or durable test paths changed: Updated `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`; added `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`; retained a temporary Chrome probe because no durable Token Statistics browser harness exists.
- Scenarios added, changed, removed, or rechecked: Added live Model/Task GraphQL assertions for custom/built-in/non-AutoByteus/collision/raw/accounting behavior; added real Prisma/runner warning/failure/retry/sibling lifecycle scenarios; rechecked full token-usage E2E, focused frontend tests, Nuxt guards, production build, and diff check; removed none.
- Commands, environment, fixture, or broader-validation delta: Focused server `3 files / 15 tests`; targeted GraphQL/migration `2 files / 6 tests`; full token-usage E2E `8 files / 16 tests`; web `3 files / 6 tests`; Nuxt prepare and both guards passed; server build and diff check passed. Live run used isolated SQLite `/tmp/token-statistics-custom-provider-browser-pw0Zay`, real built server on `38201`, Nuxt dev runtime on `38202`, secret-free provider fixture `provider_browser` named `alibaba_cloud`, two deterministic ledger rows, direct GraphQL/curl readiness, and Chrome/Playwright semantic assertions.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| None | N/A | No prior API/E2E result existed; this is the initial baseline. | Prior result and confidence are explicitly `N/A`. |

- Canonical artifacts and sections updated: `coverage-investigation.md` (initial plan, post-repository score, final score, evidence, residual risks); `execution-coverage-report.md` (authoritative commands/results, lifecycle/browser evidence, cleanup, final result); this revision record.
- Prior result and confidence (`N/A` for `API-REV-001`): `N/A` / `N/A`.
- Current result and confidence: `Pass` / `96%` (669 / 7 = 95.57%, rounded; simple average).
- New or remaining failure IDs: None.
- Recommended recipient: `code_reviewer` for the separate proportional test-code review of changed durable test code.
- Remaining risks, blocked evidence, or untested scope: real external-provider network/credentials and Electron shell packaging/preload/window lifecycle were not tested; they are out of scope because the change is metadata/display/migration/API and web-equivalent renderer only. Browser evidence is temporary and retained under `probes/api-e2e`; no material in-scope evidence is blocked.
