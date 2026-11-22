# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-22T13:13:17Z | BUILD | Started | | server build of 1f0aad498b (HEAD 818e950d53) |
| 2026-11-22T13:15:33Z | BUILD | Finished | Pass | server dist built from HEAD 818e950d53 |
| 2026-11-22T13:15:33Z | OF-01..06, AOML | Started | | rerun on IR-003 built server |
| 2026-11-22T13:41:19Z | OF-01..06 | Finished | Pass | 6/6 on IR-003 build |
| 2026-11-22T13:41:19Z | AOML-1/2, MIG | Finished | Pass | AOML 2/2; migration suites 93/93 (10 files) |
| 2026-11-22T13:41:19Z | FSB-01 | Finished | Pass | release job from a clean clone of 818e950d53; units step 27 root-limited (known) |
| 2026-11-22T13:41:19Z | OC-01..11 | Started | | new suite, first run |
| 2026-11-22T13:54:20Z | RC (whole file, incl. RC-56) | Started | | two-server suite |
| 2026-11-22T13:58:03Z | OC-01..11 | Finished | Fail | 10/11 pass; OC-04 fails: the Org's rows drop a Team member while it is leaving (no Leaving row). Earlier runs: test-side fixes (Org config keys, snapshot path, notice order) |
| 2026-11-22T13:58:03Z | TC-01 | Finished | Pass | server typecheck: production 0; tests 974 in 300 (baseline) |
| 2026-11-22T13:58:03Z | ORG-E2E | Finished | Fail | stopped-org-workspace: file-shape assertion updated for the container (ticket-made-untrue); then the mixed save returns PERSISTENCE_INDETERMINATE with correct files |
| 2026-11-22T13:58:03Z | TF-REG | Finished | Pass | TF-01..12 12/12 |
| 2026-11-22T13:58:03Z | RC (whole file) | Restarted | | first start stopped: Brief Studio package missing; ran test:integration:prepare |
| 2026-11-22T14:09:09Z | RC (whole file) | Finished | Fail | 48/56: RC-07, RC-20 asserted pre-change behavior (updated); RC-47 Org agent unit listed as running agent (defect); RC-56 trigger wrong (no /ws/run-status hold) and left beta changed → RC-33/12/13/24 cascade. Evidence remote-run1/ |
| 2026-11-22T15:12:24Z | RC (whole file) run 2 | Finished | Fail | 51/56: RC-56 Pass; RC-07 Org links lookup (updated); RC-47 defect; RC-12/13/24 refused follow-ups to beta's studio copy (isolation run next). Evidence remote-run2/ |
| 2026-11-22T15:39:28Z | RC without RC-56 (isolation) | Finished | Fail | 54/55 (RC-56 skipped): only RC-47 fails; RC-07 updated passes. Evidence remote-no56/ |
| 2026-11-22T15:39:28Z | RC (whole file) run 3 | Finished | Fail | 52/56: RC-56 Pass; RC-47 defect; RC-12/13/24: beta refuses follow-ups to the Studio copy after RC-56's member changes (REMOTE_TARGET_NOT_FOUND, alpha's link intact). Evidence remote/ |
| 2026-11-22T15:39:28Z | OC-01..11 | Started | | rerun after OC-10 run-status check |
| 2026-11-22T15:42:23Z | OC-01..11 | Finished | Fail | 10/11: OC-04 Org rows drop the leaving Team member (defect). Test fixes: OC-02 waits for both logs; OC-10 reads unit-run statuses |
| 2026-11-22T15:42:23Z | OCL-01/02 | Started | | live: Codex + native AutoByteus |
| 2026-11-22T15:56:25Z | OCL-01 | Finished | Pass | Codex concierge → /team/lead (AutoByteus) → /concierge; both logs, counterparts |
| 2026-11-22T15:56:25Z | OCL-02 | Finished | Fail | twice: leaving writer's events stop at the Org view after removal; its 2nd approval (get_handoff_rules) only on the Team run's own stream; never delivered/released |
| 2026-11-22T15:56:25Z | OCU-01..05 | Started | | rendered probe |
| 2026-11-22T16:00:54Z | OCU-01..05 | Finished | Fail | 4/5: OCU-04 the busy leaving writer has no row (team shows Offline); OCU-05 unit Leaving tag renders |
| 2026-11-22T16:00:54Z | Round 1 | Finished | Fail | F-1 Org rows/view drop a Team unit's leaving member (OC-04, OCU-04, OCL-02); F-2 list_running_agents lists Org units (RC-47); F-3 stopped Org mixed save PERSISTENCE_INDETERMINATE (ORG-E2E); F-4 peer Team copy not restorable after members changed (RC-12/13/24 after RC-56) |
