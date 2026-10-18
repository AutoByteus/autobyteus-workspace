# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-002 (Pass) | SR-001, SR-002, ARCH-REV-001, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: removal validated in the packaged app; two suite defects fixed from their causes

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-002 round 2
- Triggering finding or case IDs: none (pass). Handed over: AC-006, picker names for AC-001, `team-status-live-probe`.
- Related revision IDs: SR-001, SR-002, ARCH-REV-001, IR-001, IR-002, CRR-001, CRR-002
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` (`c740d16b3c`)
  - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (`d1796f010d`)
- Cases: as in the ledger; every case is recorded with the commit it passed on (TESTING.md "Rerun by impact").
- Commands, environment, fixture, or broader-validation delta:
  - Isolated packaged worktree instance with a LOCAL_PATH package.
  - Scripted AGY via `updateServerSetting`.
  - Claude Agent SDK Haiku 5.5 for real inference (the user's standing direction).
  - AutoByteus native launch without inference.

#### Prior Failure Resolution

None prior. Failures found within this round, with their resolution:

| Case / Failure | Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| `task-copy-idle-lifetime` 2 of 3 full-folder runs | test defect: synchronous host-wide process scan blocked the in-process server | baseline fix `c740d16b3c`; 18/18 twice | tcil-diag/, server-e2e-projects-agy-fixed-*.log |
| TCT BR-012..016 | test defect: probe stale after task-keys (REQ-018) | baseline fix `d1796f010d`; 16/16 | tct-diag/, probe-tct-2/ |

- Canonical artifacts updated: coverage investigation, execution report, ledger, this record
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96%
- New or remaining failure IDs: none
- Recommended owner: `/software_engineering_team/code_reviewer` (test-code review)
- Remaining risks: the Codex runtime was not run live (no ChatGPT quota); it is covered at unit level.
