# API/E2E Test Progress — remote-node-runtime-sign-in

Your own progress log while tests run. Read it first whenever you pick the run back up.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-21 | API-01…API-05 | Completed | Pass (reused) | Reused IMP-02…IMP-07 on `c0b385524`; diff since touches only ticket docs |
| 2026-10-21T08:12:28Z | API-06 | Started | | server E2E agent-runtimes-graphql incl. new AR-13 |
| 2026-10-21T08:13:53Z | API-06 | Completed | Pass | 13/13 incl. AR-13 |
| 2026-10-21T08:17:11Z | API-07 | Started | | settings probe (server build + ARP-01…ARP-12), output /tmp/api07-probe-1 |
| 2026-10-21T08:20:24Z | API-07 | Checkpoint | Fail (probe defect) | run 1: ARP-11 regex for runningAgentCount could not span nested row objects; fixed to JSON parse; rerun to /tmp/api07-probe-2 with --skip-server-build (build from run 1 is current) |
| 2026-10-21T08:23:07Z | API-07 | Completed | Pass | run 2: 12/12 Pass, cleanup ok |
| 2026-10-21T08:25:33Z | API-08 | Started | | Docker node journey, output evidence/API-08-docker-node-remote-signin/ |
| 2026-10-21T08:26:35Z | API-08 | Completed | Pass | D1–D4 Pass; container removed; frontend terminated |
