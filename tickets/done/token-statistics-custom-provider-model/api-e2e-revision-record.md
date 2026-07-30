# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` CRR-002 / execution round 1 | `IR-002`, `CRR-002`, approved architecture package | N/A / N/A | Pass / 96% |
| API-REV-002 | `code_reviewer` CRR-005 / execution round 2 | `SR-006`, `IR-004`, `CRR-005` | Pass / 96% | Pass / 96% |

## Revision Entries

### API-REV-001 — Live GraphQL, migration lifecycle, and browser validation baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`; round `1`, after CRR-002 source-review Pass for commit `6176e1525`.
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

### API-REV-002 — Revalidate provider snapshots, Migration B lifecycle, live GraphQL, and browser

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`; round `2`, after CRR-005 source-review Pass for commit `9e3d8d86e` (`IR-004`).
- Triggering finding or scenario IDs: `AC-TOKMODEL-009` through `AC-TOKMODEL-011`; prior `API-REV-001` was successful but stale because it predated `SR-006`. No prior API/E2E failure remained open.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-005`, `IR-004`, `CRR-005`; delivery `DR-N/A` because downstream delivery artifacts predate this round.
- Why this revision was recorded: The provider-name snapshot schema/producer contract and Migration B full-field invariant proof changed after the prior API/E2E result. Coverage and execution evidence had to be regenerated independently before sign-off.
- Coverage decisions or durable test paths changed: Updated `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` for real provider_name persistence and provider-file deletion stability; added `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`; updated `token-usage-legacy-path-columns-drop-startup.e2e.test.ts` to apply the current provider_name schema in its manually assembled fixture.
- Scenarios added, changed, removed, or rechecked: Added real Migration B startup warning/retry/failure/sibling/invariant scenarios; rechecked Migration A, complete token usage E2E, live GraphQL Model/Task fields, direct Prisma row facts, provider deletion, Nuxt Settings Task/Model grouping, frontend suites, guards, build, and diff check; removed none.
- Commands/environment/fixture/broader-validation delta: Focused server `6` files / `28` tests; shared normalizers `1` / `9`; new Migration B E2E `1` / `2`; GraphQL E2E `1` / `4`; final token-usage folder `9` / `18`; web `3` / `6`; Nuxt prepare and both guards; production server build; live isolated SQLite with all `19` schema migrations, built server `38301`, Nuxt `38302`, three seeded ledger rows, secret-free provider metadata, direct GraphQL before/after provider deletion, and headless Chrome screenshots/assertions.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| None from `API-REV-001` | N/A | Prior API/E2E result was Pass; no unresolved API/E2E failure was carried forward. | `API-REV-001` entry above |
| Initial full-folder rerun: `token-usage-legacy-path-columns-drop-startup.e2e.test.ts` missing `provider_name` column | API/E2E `Local Fix` | Added `20260730090000_add_token_usage_provider_name/migration.sql` to the test's manually applied schema list; targeted test and final full folder then passed. | Targeted `1` file / `2` tests Pass; final `9` files / `18` tests Pass |

- Canonical artifacts and sections updated: `coverage-investigation.md`, `execution-coverage-report.md`, this revision record, and retained evidence under `probes/api-e2e/api-rev-002/`.
- Prior result and confidence: `Pass` / `96%` (`API-REV-001`).
- Current result and confidence: `Pass` / `96%` (simple average `95.57%`, rounded; no final category below `90%`).
- New or remaining failure IDs: None. The intermediate missing-column error was a stale test fixture and was resolved locally; it was not a product failure.
- Recommended recipient: `code_reviewer` for separate proportional test-code review of the three changed durable E2E paths.
- Remaining risks, blocked evidence, or untested scope: External provider network/credentials, alternate DB engines, and Electron packaging/preload/window lifecycle remain untested and out of scope. Live browser GraphQL requests used the configured backend directly rather than a Vite proxy hop; this is recorded, not overstated.
