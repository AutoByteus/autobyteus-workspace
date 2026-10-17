# API/E2E Revision Record — delegated-copy-own-run-memory

## Revision Index
| ID | Trigger / round | Related revisions | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-003 | `code_reviewer` CRR-007 Pass (CR-004 / DEC-018 in `3e3a7b08cc`) | CRR-007, IR-003, DEC-018, DEC-017 | Pass / 93% | Pass / 94% |
| API-REV-002 | `code_reviewer` CRR-004 Fail (Local Fix) TR-001, TR-002 | CRR-004 | Pass / 93% | Pass / 93% |
| API-REV-001 | `code_reviewer` CRR-002 Pass (commits `8bbd081c8d`, `5a5359e707`, `6bcb206e4e`, `2f7f5b3f4b`; base `66429d6f31`) / round 1 | SR-009, ARCH-REV-004, IR-001/IR-002, CRR-001/CRR-002 | N/A | Pass / 93% |

## API-REV-001 — first validation
- **Process.** The investigation was written before any test change; the ledger keeps each case with its commit. Large/High, so the successful route is Code Review (proportional test-code review).
- **Repository suites:**
  - typecheck clean; unit 5775; web 4444; guards and contracts pass;
  - integration (rerun alone after my own concurrent run corrupted the shared test DB): 2 known product-defect cases and 1 load-sensitive 5 s bound;
  - whole e2e with the scripted runtime on: 105 pass. 5 failures fixed upstream (`ec934ca753`) and 1 in Task 0c7efc37. 2 stale tests of the old layout updated (R6a, R6b). 1 load-sensitive.
- **New durable e2e:** `task-agent-own-run-startup.e2e.test.ts`, TAU-1..3 on a faithful ledger:
  - migration and bytes, views, G1/G2, the context-file link, the Memory page and a second start;
  - AC-010: a failed step, then recovery;
  - AC-012: delete keeps the task agents.
- **Dropped:** TAU-4, migrated wake on hand-built data, because the hub needs runtime state that hand-built data can't faithfully carry. Proven in the desktop app instead.
- **Desktop (AC-016):** the released app (`66429d6f31`) was used for real (Haiku 5.5, DeepSeek flash), then the branch app started on the same data root:
  - migration SUCCEEDED, 15/15 task-agent files byte-identical, views identical;
  - a Settings edit stored in the copy's own file;
  - the migrated copy woke on the edited model;
  - the Memory page lists it;
  - delete keeps the copies; the second start changed nothing.
- **Not tested, by the user's decision:** the AC-020 sub-case with locator-v1 pending. A scope question on REQ-017 is raised.
- **Observation:** the Memory page group label for task agents shows the definition id.
- **Durable test changes:** 1 added, 2 updated, uncommitted, for test-code review.

### Prior Failure Resolution
No prior API/E2E round.

### Canonical Current Artifacts
api-e2e-coverage-investigation.md; api-e2e-execution-coverage-report.md; api-e2e-test-case-ledger.md; this record; evidence/api-e2e/ (desktop/ holds the journey's screenshots, views, file hash lists and the migration log).

## API-REV-002 — CRR-004 local fixes
- **TR-001:** TAU-2 is guarded by `modeBitsBlock`: it skips on root and Windows, with the reason in its title, the same check as project-task-boundaries.e2e. After the chmod it verifies that the block holds (a write into the folder is refused with EACCES/EPERM) before relying on it. The line-186 comment now matches what is asserted. 3/3 (TAU-run10.log).
- **TR-002:** the ledger row `TAU-auth` records every failed authoring run with its error and cause: run1 (org via the history index), run2 (empty history), run3 and run4 (hub restore and TAU-4 need runtime state the hand-built data lacks), run6 (the shared test DB reset collision), run8 (the standalone context-file route).

## API-REV-003 — CR-004 (DEC-018) rerun by impact
- **Diff since `2f7f5b3f4b`:** the explorer service and its unit test only.
- **Rerun:** typecheck; server build; `tests/unit/agent-memory` (112 pass); the Memory GraphQL e2e (pass; memory-sync-multiprocess is the known baseline failure fixed upstream); the TAU file 3/3.
- **TAU-1 updated:** it now asserts the group shows the definition's name ("Code Reviewer", created through the API), the id fallback (`helper`, no definition), and search by name. Uncommitted, for test-code review.
- **DEC-017:** closes the AC-020 locator-pending sub-case (verified by composition).
- **Confidence 94%:** the earlier AC-020 gap is closed by decision; durable test quality is pending review.
