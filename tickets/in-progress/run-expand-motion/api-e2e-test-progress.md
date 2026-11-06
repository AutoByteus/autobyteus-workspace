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
