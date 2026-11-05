# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-004, ARCH-REV-004, IR-002, CRR-002 | N/A | Pass / 93% |

## Revision Entries

### API-REV-001 — Baseline: read budget within limits; views, window and chooser Remove pass on the real stack

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002 Pass; C-05 held for the budget), round 1
- Triggering finding or case IDs: C-05 (read budget); design "Tests → API/E2E"
- Related revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-002
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed:
  - added `run-history-read-budget-probe.mjs` and `workspace-views-chooser-cases.mjs` (WVC-001…004), their registration and scripts;
  - updated PLN-08, `task-closure-tree-probe.mjs` and `team-status-live-probe.mjs` for REQ-009;
  - baseline fixes in three fixture probes (`25769bc969`).
- Cases added, changed, removed, or rechecked: API-01 reused; API-02…API-08 and API-10 Pass; API-09 Not Tested
- Commands, environment, fixture, or broader-validation delta: baseline. The base build is measured from a temporary worktree at `3ef5e33eec`

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log, `follow-ups.md` (FU-004, FU-005), `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 93%
- New or remaining failure IDs: none. OBS-1 is recorded as FU-004
- Recommended owner: code reviewer for the test-code review
- Remaining risks, blocked evidence, or untested scope: API-09 (real AGY); timings under load; OBS-1
