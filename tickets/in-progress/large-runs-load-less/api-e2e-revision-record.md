# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-003, ARCH-REV-003, IR-003, CRR-002 | N/A | Fail / 88% |

## Revision Entries

### API-REV-001 — Baseline: every AC proven; a running hub re-reads its message list on every context publish

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002 Pass), round 1
- Triggering finding or case IDs: API-08 (Fail)
- Related revision IDs: SR-003, ARCH-REV-003, IR-001…IR-003, CRR-001, CRR-002
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` (LRL-001…004), registered in `delegated-launch-defaults-probe.mjs` with the script `test:e2e:large-runs-load-less`. In `delegated-copies-large-hub-probe.mjs`: L-010's AC-007 display checks, and a baseline fix replacing the removed `isChildHydrated` with `MemberLoader`
- Cases added, changed, removed, or rechecked: API-01 and API-02 reused; API-03…API-07 Pass; API-08 Fail
- Commands, environment, fixture, or broader-validation delta: baseline (report: ENV-1, ENV-2)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `follow-ups.md` (FU-004), `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88%
- New or remaining failure IDs: API-08 (a running hub's participant lists reloaded on every context publish)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` (Solution Designer)
- Remaining risks, blocked evidence, or untested scope: FU-004; remote participants, the sequence-gap reopen and the reasoning renderer (residuals in the investigation)
