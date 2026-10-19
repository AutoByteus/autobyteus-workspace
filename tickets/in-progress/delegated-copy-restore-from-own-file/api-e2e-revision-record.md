# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record indexes every completed API/E2E validation result.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-002, round 1 | SR-001..SR-008, ARCH-REV-003..007, IR-001..IR-002, CRR-001..CRR-002 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Baseline: configured-place copies restore from their own files at the system boundary

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002, Pass), round 1
- Triggering finding or case IDs: the code reviewer's residual risks: AC-001/AC-003 journeys in Team and Org runs; the AC-004 run view, "As configured in this run" and names; AC-011(a) end to end
- Related revision IDs: SR-008, ARCH-REV-007, IR-002, CRR-002
- Why this baseline was recorded: first API/E2E validation of the package.
- Coverage decisions or durable test paths changed:
  - added `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` (DCR-001..DCR-003);
  - updated `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (registration and header);
  - updated `autobyteus-web/package.json` (`test:e2e:delegated-copy-own-file`).
- Cases added, changed, removed, or rechecked: API-01..API-05 reused (IMP-01, 02, 07, 04/05/06, 09); API-06..API-10 rerun; API-11..API-13 new.
- Commands, environment, fixture, or broader-validation delta: browser probe on a fresh build of `96de77efb3`; startup and upgrade e2e rerun on that build.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: all of `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.1%
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review), per `get_handoff_rules`
- Remaining risks, blocked evidence, or untested scope: AC-010 (delivery; the user's real data after his backup); the accepted Memory-page residual for mirrored F-X3b copies.
