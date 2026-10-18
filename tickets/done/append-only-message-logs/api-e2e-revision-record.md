# API/E2E Revision Record — Append-Only Message Logs

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` CRR-001 / round 1 | SR-004, SR-005, ARCH-REV-004, IR-001, CRR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: built-server and desktop validation of the append-only message logs and their startup conversion

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-001, Pass 9.4/10), round 1
- Triggering finding or case IDs: none (first validation). Code review handed over AC-008, AC-009 and the server E2E suites as "Not run".
- Related revision IDs: SR-004 (requirements), SR-005 (design), ARCH-REV-004, IR-001, CRR-001
- Why this baseline was recorded: the first completed API/E2E result for the package
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` (AOML-1, AOML-2)
  - Updated `task-agent-own-run-startup.e2e.test.ts`: the faithful root also removes the conversion's ledger row, and TAU-1 asserts the conversion.
  - Updated `team-run-v1-production-upgrade.e2e.test.ts`: in the warning scenario the conversion waits and keeps the JSON, and its status is asserted on both starts.
  - Updated `agent-org-token-continuation.e2e.test.ts`: the conversion runs after the in-process flat-families, as on a real start.
  - The three updates correct test-side causes found in API-01 (TESTING.md rule 9).
- Cases added, changed, removed, or rechecked: API-R1..R3 (reused implementation checks), API-01..API-06
- Commands, environment, fixture, or broader-validation delta:
  - Built server dist and Electron worktree build of `78b42de3ae` (source = `201a4933c6`)
  - Released v1.5.6-beta.4 isolated instance to write the data package
  - Isolated worktree desktop instance for AC-009
  - Scripted AGY CLI for all tool calls

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-progress.md`, evidence `API-*`
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 96% (no category below 95%)
- New or remaining failure IDs: none in scope. Out-of-scope findings with causes are in the execution report: the terminal suite's symlinked-HOME environment artifact, and the context-file storage gated test, which fails identically on the base: FU-API-1, see the report's API-02 row.
- Recommended owner: proportional test-code review by `/software_engineering_team/code_reviewer`
- Remaining risks, blocked evidence, or untested scope:
  - R-2/R-3 as designed, and observed
  - DEC-008 is covered in-process only
  - Conversion and timing on the user's own data are the user's check (DEC-001)
