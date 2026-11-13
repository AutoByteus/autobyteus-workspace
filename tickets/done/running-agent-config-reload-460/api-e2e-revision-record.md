# API/E2E Revision Record — autobyteus-460

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 pass, round 1 | SR-002…SR-004, ARCH-REV-003, IR-002, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: live per-runtime adds, AGY capsule, Team/copy, GitHub at restart

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001), round 1.
- Triggering finding or case IDs: the review's "Left for you" list (AC-012 per runtime, AC-006, AC-009, AC-008 live, AR-003).
- Related revision IDs: SR-002, SR-003, SR-004; ARCH-REV-002, ARCH-REV-003; IR-001, IR-002; CRR-001.
- Why this baseline was recorded: first API/E2E validation of the package at `c7685b20c6`.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts` (API-05a/b/c).
  - Updated `autobyteus-server-ts/tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` (API-06, API-07).
- Cases added, changed, removed, or rechecked: API-01 (reused IMP checks), API-02…API-09 new.
- Commands, environment, fixture, or broader-validation delta: clean `env -i` for every E2E run; temporary `dsh`
  0.2.2-rc.1 install; GitHub test token from the vault; broader validation `Required` and executed (live runtimes,
  real proxy and GitHub).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`,
  `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: none. (API-04 run 1 had one harness time-out with its cause found; the file passes
  alone. See the report's API-04 row.)
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: the AGY CLI was scripted (no live `agy`: it would use the
  user's host login and history); the web notice body was not rendered in a browser.
