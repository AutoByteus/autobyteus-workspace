# API/E2E Revision Record — Integrations page (autobyteus-337)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-001 pass), round 1 | SR-009, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: live runtimes, the access rule's other paths on real runs, the upgrade from the released app, AC-008 in the packaged app

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001), round 1
- Triggering finding or case IDs: the handoff's Downstream Coverage Hints and the reviewer's residual risks
- Related revision IDs: SR-009, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E result
- Coverage changed: `github-credential-proxy-runtime-shells.e2e.test.ts`, three cells added:
  - an agent set to all installed skills, with disable and enable;
  - a team-local member;
  - Skills-page source removal while a run is active.
- Cases: API-R01 (reused IMP-01…IMP-14), API-01…API-06
- Environment delta: the installed release 1.5.11-beta.9 and this branch's packaged build on one owned data root; live CLIs; GitHub with the test token

#### Prior Failure Resolution

None.

- Canonical artifacts updated:
  - `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`;
  - `follow-ups.md` (FU-004).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: none in scope (API-03's 9 failures are FU-004, pre-existing)
- Recommended owner: the code reviewer (test-code review of the added cells)
- Remaining risks:
  - DEC-016 on a real GitHub revision (stub only);
  - an application bundle copy at runtime (repository test only);
  - AC-009's README is for delivery.
