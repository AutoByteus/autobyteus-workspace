# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 89% (F-1 Requirement Gap) |

## Revision Entries

### API-REV-001 — Baseline: restart reminder across real restarts; crash leaves tasks running

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001), round 1
- Triggering finding or case IDs: none (first validation)
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E validation of autobyteus-448 part 1 (product code `d5e9f350cf`)
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` (RR-01..06 scripted, RR-07/08 live)
- Cases: API-R01..R03 reused (IMP-01..03); API-01..17 new
- Commands, environment, fixture, or broader-validation delta: built server sessions with a previous-release stamped copy; base build in a temporary worktree for the before; live Claude/Codex; isolated desktop instance with the test vault

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 89% (post-repository 88%)
- New or remaining failure IDs: F-1 (after an unexpected stop the reminder says the background tasks were stopped; they keep running)
- Recommended owner: Solution Designer (Requirement Gap), after the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: ACP live (dsh not installed); Linux crash behavior; API-01 watcher files not green while `fseventsd` is saturated (environment); FU-002
