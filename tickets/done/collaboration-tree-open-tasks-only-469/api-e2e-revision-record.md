# API/E2E Revision Record

The latest coverage investigation and execution coverage report stay authoritative. This record holds one entry per completed API/E2E validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001, round 1 | SR-008, ARCH-REV-005, IR-001, CRR-001 | N/A | Fail / 82% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-003, round 2 | SR-009, ARCH-REV-006, DEC-011, IR-002, CRR-003 | Fail / 82% | Pass / 95% |
| API-REV-003 | Delivery Engineer, DR-002 (`delivery-revision-record.md`), round 3 | DR-002 | Pass / 95% (AC-007 overclaimed) | Pass / 95% |

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

### API-REV-002: round 2 on IR-002, prior failures resolved

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-003 (IR-002 passed), round 2.
- Triggering finding or case IDs: F-1, F-2, F-3 of API-REV-001.
- Related revision IDs: SR-009, ARCH-REV-006, DEC-011, IR-002 (`fa48d74a3e`), CRR-003.
- Why this revision was recorded: rerun after rework; prior failures rechecked first.
- Coverage decisions or durable test paths changed: EXC-E2E-007 now removes only the stopped copy's conversation and keeps today's text (DEC-011; `c7eb0d8626`). No other test change. IR-002 itself adapted two E2E helpers, which ran green here.
- Cases added, changed, removed, or rechecked:
  - API-I01 added (server integration; IR-002 had not rerun it).
  - Rerun, as every case is marked Rerun when a contract package changes: API-E01 (whole, includes API-E02), API-B01 (all 16 in one run), API-F01.
  - API-R01…R03 reuse IMP-08…IMP-11.
- Commands, environment, fixture, or broader-validation delta: server `dist/` rebuilt from `fa48d74a3e`; `test:integration:prepare` rerun; otherwise unchanged.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 EXC-E2E-007 agent text | Local Fix (preliminary); reviewed as a test fix, confirmed by DEC-011 | Test now covers the supported state (own file present, conversation gone); today's text holds | API-E01 round 2 `✓ EXC-E2E-007` |
| F-2 Team tab loses past-participant rows (Agent, Org) | Local Fix (web) | IR-002 CR-002: list re-fetches when a rebuilt view no longer holds an agent it names | API-B01 round 2 BR-001…BR-003 (0 differing frames), BR-005 |
| F-3 Team view after restart (AC-002, AC-003) | Unclear → design SR-009 | Team reopened event carries the record; the view inserts it | API-B01 round 2 BR-011, BR-015 |

- Canonical artifacts and sections updated: execution report (rebuilt for round 2; round 1 kept as history), coverage investigation (round-2 plan), progress log, this record.
- Prior result and confidence: Fail / 82%.
- Current result and confidence: Pass / 95% (no category below 95%).
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer, for proportional test-code review.
- Remaining risks, blocked evidence, or untested scope: Memory Sync imported sources with delegated runs (not tested); signing and non-macOS release jobs (runner only).

### API-REV-003: AC-007 proven for a run that left the tree (delivery re-entry DR-002)

- Triggering role, report path, and round: Delivery Engineer (`/software_engineering_team/delivery_engineer`), `delivery-revision-record.md` DR-002, round 3. Solution Designer's receipt verification: `prerequisite-469-delivery-receipt-verification.md` (ticket 461).
- Triggering finding or case IDs: AC-007 row of the execution report.
- Related revision IDs: DR-002.
- Why this revision was recorded: my round-2 row recorded AC-007 `Proven` by cases (API-I01, TAU-1, AOML-1/2) whose runs are in the tree. None opened an attachment of a run that left it. It was an evidence gap, not a known product failure.
- Coverage decisions or durable test paths changed:
  - Added `tests/e2e/projects/closed-run-attachments.e2e.test.ts` (API-E03, CRA-1).
  - Moved the built-server root helpers of `open-task-tree-upgrade-startup.e2e.test.ts` into `tests/e2e/helpers/built-studio-roots.ts`, now shared by both tests.
- Cases added, changed, removed, or rechecked: API-E03 added; API-E02 rerun (helpers moved); server typecheck rerun.
- Commands, environment, fixture, or broader-validation delta: ENV-4, the merged `1ee1ea61cf` in worktree `collaboration-tree-open-tasks-only-469-ac007`. Fresh install and server build there.

#### Prior Failure Resolution

None (no failure; an evidence gap closed).

- Canonical artifacts and sections updated: execution report (Round, environments, Cases, AC-007 row, durable coverage, result notes), this record, the progress log, the investigation's round-3 note.
- Prior result and confidence: Pass / 95%, with AC-007 overclaimed.
- Current result and confidence: Pass / 95%. AC-007 is proven by API-E03:
  - (1) a closed run's message reference opens through the top run, after the closure, after a restart and after a restore;
  - (2) its context file opens again once its Task is reopened.
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer, for proportional test-code review of the new and moved test code; then Delivery.
- Remaining risks, blocked evidence, or untested scope:
  - The Team root is not covered by API-E03 (draft-owner limit, see the AC-007 row).
  - The context-file route answers 404 while the Task is closed. That is observed only (FU-006, sent by the Solution Designer).
