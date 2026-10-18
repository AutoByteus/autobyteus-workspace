# API/E2E Revision Record — delegated-copies-slow-open

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass; round 1 | SR-002, SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Baseline: GraphQL E2E for the scoped query, large-hub base-vs-fix timings, live journeys, desktop instance

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, round 1
- Triggering finding or case IDs: none (pass). Still-required items 1–5 from the code review message
- Related revision IDs: SR-002 (requirements), SR-004 (design), ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E validation of the package
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts`.
  - Added the `GENERATE_IMAGE:` directive to `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.
  - Added `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` and the `test:e2e:delegated-copies-large-hub` script.
  - Nothing removed or replaced.
- Cases added, changed, removed, or rechecked:
  - Reused: API-R1..R5 (IMP-01..IMP-09).
  - New: API-02..API-15 and L-001..L-011.
- Commands, environment, fixture, or broader-validation delta:
  - Test-owned seed of 50 Teams × 6 members plus 300 unrelated team runs, made through public APIs with scripted AGY.
  - Base build `5ceb43039a` in a temporary git worktree.
  - Isolated desktop instance of the packaged fix build.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`, `evidence/OBS-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.0%
- New or remaining failure IDs: none
- Recommended owner: `/software_engineering_team/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope:
  - The synthesized fixture makes the baseline 7.3 s, not minutes.
  - CAND-003 under continuous streaming is not reproduced.
  - Live cases were not run inside the desktop shell.
  - Out-of-scope follow-ups: OBS-1 (live view lists part of the hub log, pre-existing), OBS-2 (an extra hub-view request per hub click, now visible), OBS-3 (unbroken 60 KB-token conversations take ~86 s of client processing, pre-existing).
