# API/E2E Revision Record

The latest coverage investigation and execution coverage report stay authoritative. This record holds one entry per completed API/E2E validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001, round 1 | SR-008, ARCH-REV-005, IR-001, CRR-001 | N/A | Fail / 82% |

## Revision Entries

### API-REV-001: baseline validation of trees built from open Tasks

- Triggering role, report path, and round: Code Reviewer (`/software_engineering_team/code_reviewer`), `code-review-report.md` CRR-001, round 1.
- Triggering finding or case IDs: N/A (first round).
- Related revision IDs: SR-008, ARCH-REV-005, IR-001, CRR-001.
- Why this baseline was recorded: first executable validation of IR-001 (code `832f0a4572`, `42652879b3`).
- Coverage decisions or durable test paths changed:
  - added `tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts`;
  - 17 server E2E files updated to the approved behavior or fixed as baseline (commits `009f707955`, `431de4c9d1`);
  - fixture `AGY_FAKE_REPLY_USAGE` and `writeOpenTaskRecordsOfReleasedData`;
  - probe `task-closure-tree-probe.mjs` extended for AC-001 and AC-011.
- Cases added, changed, removed, or rechecked: API-R01…R04 (reused IMP checks), API-E01, API-E02, API-B01, API-F01.
- Commands, environment, fixture, or broader-validation delta: baseline (see the execution report's environments).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: all API/E2E documents created.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, overall 82% (requirement proof 70%, user surface 60%).
- New or remaining failure IDs: F-1 (EXC-E2E-007 agent text), F-2 (Agent/Org Team tab loses past-participant rows after a view rebuild), F-3 (Team root view does not list a run reopened after a restart without a manual reload).
- Recommended owner: failure-origin review by the Code Reviewer; preliminary F-1 and F-2 `Local Fix` (implementation), F-3 `Unclear`.
- Remaining risks, blocked evidence, or untested scope: BR-005 and BR-007 not run (they need BR-001…BR-003 in the same run); imported Memory Sync sources with delegated runs not tested; signing and non-macOS release jobs not tested.
- Rerun plan for the next round: EXC-E2E-007; the probe's BR-001…BR-005, BR-007, BR-011 and BR-015; the files a fix touches (TESTING.md "Rerun by impact"); API-F01 again if a fix touches a build input.
