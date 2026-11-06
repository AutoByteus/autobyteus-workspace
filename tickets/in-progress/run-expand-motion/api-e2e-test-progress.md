# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06T06:05:00Z | round 1 | Started | | head 85bf73750b (code c5cc87d89d, spec cast 7cc31409af); load average ~110 |
| 2026-11-06T06:05:00Z | API-01, API-02 | Completed | Pass | Reused IMP-01, IMP-02, IMP-05 and IMP-03/IMP-04: only ticket documents after 7cc31409af |
| 2026-11-06T06:06:00Z | API-06 | Started | | fresh clone /tmp/rxm-390/clean-clone at 85bf73750b; frozen install exit 0; build:electron:mac -- --arm64 running |
| 2026-11-06T06:09:43Z | API-06 | Checkpoint | | r1: install, guards, typecheck PASS (99 = baseline), prepare-server, generate:electron; packaging stopped: "Unable to resolve GitHub updater repository" (the runner sets GITHUB_REPOSITORY; a local clone's origin is a path) |
| 2026-11-06T06:19:10Z | API-06 | Completed | Pass | r2 (fresh re-clone, GITHUB_REPOSITORY set): build exit 0, dmg and zip; Prisma and terminal-runtime verify steps ok (spawn probe); signing/notarization Not Tested (secrets) |
| 2026-11-06T06:25:00Z | API-03..API-05 | Started | | server dist rebuilt; RXM-001..003 on the launch-defaults stack |
| 2026-11-06T06:33:00Z | API-03..API-05 | Checkpoint | Fail | r1: RXM-001 Fail (rows mount one line tall, then their Task line arrives and the move transition slides them 18/36/54 px); RXM-002 Pass; RXM-003 Fail on my assertion that the fold survives a view switch (the disclosure state is per Runs-view instance, unchanged here): recorded instead of asserted |
| 2026-11-06T06:45:00Z | API-03 | Completed | Fail | r2: RXM-001 Fail again, same frames. Cause: collapse unmounts AgentRunTaskRows → useTaskWorkerTasks releases → taskWorkerTaskStore forgets the answers → on expand rows render without the Task line, the read answers, rows grow, tree-row-move FLIP slides them |
| 2026-11-06T06:45:00Z | API-04, API-05 | Completed | Pass | r2: RXM-002 fade 1 → 0 over 217 ms; RXM-003 stored rows same after unfold, reads 1 → 1, selection ok |
| 2026-11-06T06:55:00Z | round 2 | Started | | IR-002 (SR-002 narrowed): code 3e6b5a3dd4, head 3f78b649ef. Rerun by impact: RXM (RunListRow/RunListPanel changed; the case module edited by the implementer, reviewed), API-06 (package.json changed after its run), new AC-005/AC-006 cases. API-01/02 superseded by IMP-06..11 |
| 2026-11-06T06:56:26Z | API-06 | Started | | fresh-start at 3f78b649ef |
| 2026-11-06T07:06:00Z | API-06 | Completed | Pass | r3 at 3f78b649ef: build exit 0, typecheck 99 = baseline, dmg/zip, Prisma and terminal-runtime verify ok |
| 2026-11-06T07:12:00Z | API-03..API-05 | Checkpoint | | r3: RXM-001 Pass (Task line in every frame; Team expand 4→7 rows, none slid), RXM-002 Pass (no transform; row below glides 551→505 over 13 positions); RXM-003 Fail in the case: its first fold check still expected the tree removed (v-show keeps it mounted); fixed, rerun all three |
| 2026-11-06T07:20:00Z | API-03..API-05 | Completed | Pass | r4: RXM-001..003 Pass (Team expand 4→6 rows, none slid; r3 row's '4→7' was a miscount) |
| 2026-11-06T07:20:30Z | API-07 | Started | | task-closure-tree (Workspaces DONE leave, AC-006) |
| 2026-11-06T07:31:00Z | API-07 | Completed | Pass | task-closure-tree BR-001..016 Pass, unchanged probe; cleanup dataRootRemoved |
