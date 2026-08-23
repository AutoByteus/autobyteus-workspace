# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer` / `CRR-001` / API/E2E round 1 | `SR-004`, `ARCH-REV-002`, `IR-001`, `CRR-001` | `N/A` | `Fail` / `82.7%` |

## Revision Entries

### API-REV-001 — Initial restart-hydration API/E2E baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/code-review-report.md`; round `1`.
- Triggering finding or scenario IDs: `CRR-001` Pass plus stale exact-ledger note; `NTH-E2E-001`–`004`, `NTH-LIVE-001`, `NTH-BR-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-004`, `ARCH-REV-002`, `IR-001`, `CRR-001`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: first completed mandatory API/E2E investigation and validation result. No prior outcome or confidence is inferred.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts`; updated `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` and `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts`; removed none. Existing frontend coverage was reclassified as inadequate for settled historical delegated-task navigation.
- Scenarios added, changed, removed, or rechecked: added restart/migration recovery, MP-001/MP-002, real-provider cold API/browser journey; updated exact ledger transition; rechecked changed owners, focused frontend controls, production build, full server E2E, and broad failures serially.
- Commands, environment, fixture, or broader-validation delta: 3 durable E2E files / 7 tests passed; 23 owner files / 101 tests passed; 4 frontend files / 18 tests passed; production build passed. Real `deepseek-v4-flash` Nested Classroom browser journey used isolated data/database and actual packages, then SIGKILL/cold restart. Full server E2E exposed unrelated baseline/stale failures separately.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; retained evidence under `api-e2e-evidence/`.
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail` / `82.7%`
- New or remaining failure IDs: `NTH-BR-001`; AC-002 and browser AC-012.
- Recommended recipient: `/code_reviewer` for focused failure-origin review.
- Remaining risks, blocked evidence, or untested scope: configured nested member browser AC-001 was not separately live-proven; Electron-only behavior is out of scope. The critical task-Team browser failure already blocks Pass. Five persistent unrelated broad-suite baseline/stale failures and two parallel flakes are documented without conflation.
