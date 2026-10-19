# API/E2E Test Progress

Your own progress log while tests run. The conversation can be compacted in the middle of a run, and afterwards you may not remember which cases already ran, which one was running, or how they ended. This file tells you. Read it first whenever you pick the run back up, or are unsure what has already run.

- Write a `Started` row right before a case begins and a `Completed` row with its result right after it ends, before the next case starts. During a long case, add `Checkpoint` rows.
- Only add rows; never change earlier ones.
- Keep it to progress. What a case ran, its evidence and what it proves go into the execution report's Cases table when the case completes.

- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-19T05:09Z | (setup) | Checkpoint | — | `pnpm -C autobyteus-server-ts build` in the worktree, exit 0 (`dist` current for HEAD 581fecdf8e, code 03f2d4da05) |
| 2026-10-19T05:10:03Z | API-02 | Started | — | Gated E2E `agent-run-collaboration-member-file-changes.e2e.test.ts`, unmodified file as reviewed (row written after the run; start time from the vitest log) |
| 2026-10-19T05:10:16Z | API-02 | Completed | Pass | 3/3, `evidence/API-02-member-file-changes-e2e.log`; rerun after the planned durable update (API-02b) |
| 2026-10-19T05:10:18Z | API-03 | Started | — | Gated E2E `standalone-unreadable-tree-containment.e2e.test.ts`, unmodified (row written after the run; start time from the vitest log) |
| 2026-10-19T05:10:35Z | API-03 | Completed | Pass | 2/2, `evidence/API-03-unreadable-tree-containment-e2e.log`. Its warning check covers all calls together; tighten to the scanning read (API-03b) |
| 2026-10-19T05:13:47Z | API-02b | Started | — | Updated member-file-changes E2E (uncommitted working tree on HEAD 581fecdf8e) |
| 2026-10-19T05:13:58Z | API-02b | Completed | Pass | exit=0, evidence/API-02b-member-file-changes-e2e.log |
| 2026-10-19T05:13:58Z | API-03b | Started | — | Updated containment E2E |
| 2026-10-19T05:14:13Z | API-03b | Completed | Pass | exit=0, evidence/API-03b-unreadable-tree-containment-e2e.log |
| 2026-10-19T05:16:16Z | API-03c | Completed | Pass | Mutation check (temp file, removed): non-scanning read → no warning at all, both cases fail as expected; evidence/API-03c-containment-mutation-check.log |
| 2026-10-19T05:16:16Z | API-04 | Started | — | New gated E2E owner-scoped-member-file-changes (first run, development iteration; output in /tmp/rfcosr-api/api04-dev.log) |
| 2026-10-19T05:20:03Z | API-04 | Checkpoint | — | Dev run 1: Team Pass, Org Fail (timeout 'direct agent /manager file recorded'); Org alone Pass; full file rerun Pass. Diagnosing (Rule 9): 8-run loop in /tmp/rfcosr-api/api04-loop-*.log |
| 2026-10-19T05:26:05Z | API-04 | Checkpoint | — | Loop 8 runs: 7 Pass, run 6 Fail (team /mate pending file never listed). Cause found: RunFileChangeService.load cache race (unchanged file, identical on base cba6b85122) |
| 2026-10-19T05:26:05Z | API-08 | Completed | Pass | Deterministic temp probe reproduces the race (stored has entry, later live reads []); evidence/API-08-*.{log,probe.test.ts}; follow-up FU-C, outside Change Scope |
| 2026-10-19T05:26:05Z | API-04 | Checkpoint | — | Test now waits for the stored record before the first live read; stability loop of 10 full-file runs next (/tmp/rfcosr-api/api04-stable-*.log) |
| 2026-10-19T05:28:47Z | API-04 | Checkpoint | — | Stability loop after the disk-wait change: 10/10 Pass (/tmp/rfcosr-api/api04-stable-*.log); final evidence run comes after all test edits |
| 2026-10-19T05:49:18Z | API-07 | Completed | Pass | vue-tsc 3.3.13 ad hoc: 0 errors on ticket-added lines; 404 pre-existing project-wide; evidence/API-07-* |
| 2026-10-19T05:58:19Z | API-02b | Started | — | final evidence run on 2486c8b7c4: tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts |
| 2026-10-19T05:58:30Z | API-02b | Completed | Pass | exit=0, evidence/API-02b-member-file-changes-e2e-final.log |
| 2026-10-19T05:58:30Z | API-03b | Started | — | final evidence run on 2486c8b7c4: tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts |
| 2026-10-19T05:58:43Z | API-03b | Completed | Pass | exit=0, evidence/API-03b-unreadable-tree-containment-e2e-final.log |
| 2026-10-19T05:58:43Z | API-04 | Started | — | final evidence run on 2486c8b7c4: tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts |
| 2026-10-19T05:58:55Z | API-04 | Completed | Pass | exit=0, evidence/API-04-owner-scoped-member-file-changes-e2e.log |
| 2026-10-19T05:59:09Z | API-06 | Started | — | Seeds via probe on 2486c8b7c4: small (10 unrelated) then large (680 unrelated) into /tmp/rfcosr-api/seed-{small,large}; seed evidence evidence/API-06-seed-{small,large} |
| 2026-10-19T06:01:40Z | API-06 | Checkpoint | — | Seeds done (small exit, large exit above in task output); next: checks per seed |
| 2026-10-19T06:01:52Z | API-06 | Checkpoint | — | Seeds Pass: small 10, large 680 unrelated (evidence/API-06-seed-*) |
| 2026-10-19T06:01:52Z | API-05 | Started | — | probe check on seed-small (T-API + B-001..B-007), output evidence/API-05-06-small-seed-check |
| 2026-10-19T06:02:59Z | API-05 | Completed | Pass | seed-small exit=0 (API-05 journeys and API-06 timing in the same run) |
| 2026-10-19T06:02:59Z | API-05 | Started | — | probe check on seed-large (T-API + B-001..B-007), output evidence/API-05-06-large-seed-check |
| 2026-10-19T06:04:07Z | API-05 | Completed | Pass | seed-large exit=0 (API-05 journeys and API-06 timing in the same run) |
| 2026-10-19T06:06:58Z | API-09 | Started | — | agy fixture routing unit test |
| 2026-10-19T06:07:03Z | API-09 | Completed | Pass | exit=0, evidence/API-09-agy-fixture-routing-unit.log |
| 2026-10-19T06:07:49Z | (all) | Checkpoint | — | All planned and added cases complete; temp data removed; reports written; committing ticket docs and evidence |
