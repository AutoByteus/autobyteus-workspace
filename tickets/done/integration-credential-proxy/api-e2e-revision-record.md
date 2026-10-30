# API/E2E Revision Record — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-001 pass), round 1 | SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: real agent shells in five runtimes, the packaged desktop journey, loopback and streaming

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001), round 1
- Triggering finding or case IDs: the reviewer's residual risks and the handoff's Downstream Coverage Hints. These are:
  - per-runtime runs, team, untick and stop;
  - QR-001, QR-002;
  - the AC-007 scan.
- Related revision IDs: SR-005, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed (added):
  - `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts`;
  - `autobyteus-server-ts/tests/fixtures/agy-shell-env-probe-cli.mjs`;
  - `autobyteus-server-ts/tests/fixtures/github-proxy-shell-probe.sh`.
- Cases:
  - API-R01 reused (IMP-01…IMP-14);
  - API-01…API-09 (the new gated suite, including API-06b);
  - API-10 (full server e2e);
  - API-11 (isolated desktop instance);
  - API-12 (token scan of the ticket and the new tests).
- Commands, environment, fixture, or broader-validation delta: the baseline itself. Its environments:
  - live Claude, Codex (both sandbox modes), Grok, AGY and LM Studio;
  - a packaged worktree build;
  - GitHub with the test token.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`;
  - `follow-ups.md` (FU-002 extended, FU-005 added).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.6%
- New or remaining failure IDs: none in scope. API-10's 9 failing files are FU-002 (8) and FU-005 (1).
- Recommended owner: the code reviewer, for proportional test-code review of the three added paths
- Remaining risks, blocked evidence, or untested scope:
  - live push to GitHub (read-only token, DEC-009; push proven against a local `git http-backend`);
  - echo redaction proven only against a fake upstream (IMP-03);
  - a server restart ending passes (R-5) was not exercised;
  - the new suite is gated, and test files are not typechecked (FU-002).
