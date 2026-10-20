# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record indexes every completed API/E2E validation result.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-002, round 1 | SR-001..SR-008, ARCH-REV-003..007, IR-001..IR-002, CRR-001..CRR-002 | N/A | Pass / 95.1% |
| API-REV-002 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-004, round 2 (INT-001 merge) | IR-003, CRR-003, CRR-004, DR-001 | Pass / 95.1% | Pass / 95.1% |

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

### API-REV-002 — Rerun by impact on the INT-001 merge

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-004, Pass), round 2.
- Triggering change: merge `26ad4ace20` of `origin/personal` @ `ad784b0a8f`, head `c5da4745e3`.
  - The three task-execution adapters resolve ingress by `ingressMember`, and a Team copy's coordinator comes from its own `source.coordinatorAddress`.
  - The merge also brings 46 base commits, including `autobyteus-ts` memory store and MCP changes.
- Related revision IDs: IR-003, CRR-003 (test-code review of API-REV-001: Pass, TO-001 non-blocking), CRR-004, DR-001.
- Why this revision was recorded: product code changed after API-REV-001.
- Coverage decisions or durable test paths changed: none. TO-001 (a stale header comment) is left open on purpose, so no test code changes.
- Cases added, changed, removed, or rechecked:
  - Rerun-by-impact plan: everything Rerun, because `autobyteus-ts` is a shared foundation.
  - API-01..API-09 reused from the implementation's integration round IMP-15..IMP-22 on `26ad4ace20`: typecheck, server unit 6169, integration 419, build, startup and upgrade e2e 9/9, the new unclean-shutdown restore e2e 5/5, web unit 4565, guards.
  - API-10..API-13 rerun: the full probe, 18 Pass, 0 Fail, on the merged build.
- Commands, environment, fixture, or broader-validation delta: ENV-4 (merged build); the same probe command with a fresh output directory.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: the execution report (Round, environments, Cases round-2 notes, scorecard note, Latest Authoritative Result, durable coverage note), the investigation meta, and the progress log.
- Prior result and confidence: Pass / 95.1%.
- Current result and confidence: Pass / 95.1%.
- New or remaining failure IDs: none.
- Recommended owner: `/software_engineering_team/code_reviewer`, per `get_handoff_rules`. Test-code review: Not Applicable this round (no durable test changed).
- Remaining risks, blocked evidence, or untested scope: AC-010 (delivery; the user's real data); the Memory-page residual for mirrored F-X3b copies; TO-001 (comment only).
