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
| 0.000000T| 2026-11-22T17:13:25Z | Round 2 | Started | | IR-004 cd6a777b24 (HEAD c6db4fe7ca); BLD-01 build exit 0 |
| 2026-11-22T17:22:23Z | OC-01..13 | Finished | Fail | 12/13: OC-04 Pass (F-1 fixed, DEC-007 text from the Org agent), OC-12 Pass (new, F-4 Org form); OC-13 Fail (new F-5: an Org rule naming a removed Team member makes the Org definition unusable, AGENT_ORG_DEFINITION_NOT_FOLLOWED). Attempt 1 had a test error in OC-12 (Team rule to /writer left in team-config) |
| 2026-11-22T17:22:23Z | ORG-E2E | Finished | Pass | 3/3 with the round-1 gates (stopped-org-workspace Pass: F-3 fixed); without the AGY gates scoped-org-history differs on a summary (env-dependent) |
| 2026-11-22T17:22:23Z | RC (whole file) | Started | | round 2 |
| 2026-11-22T17:35:51Z | RC (whole file) | Finished | Pass | 56/56: RC-56, RC-12/13/24 (F-4 fixed), RC-47 (F-2 fixed) |
| 2026-11-22T17:36:51Z | OCL-01/02 | Finished | Pass | 2/2: leaving writer's 3 approvals answered in the Org view; delivered; released (F-1 fixed) |
| 2026-11-22T17:38:33Z | OCU-01..05 | Finished | Pass | 5/5: OCU-04 the leaving writer row tagged Leaving |
| 2026-11-22T17:41:46Z | OF-01..06, AOML | Finished | Pass | 6/6, 2/2 on IR-004 |
| 2026-11-22T17:41:46Z | Round 2 | Finished | Fail | F-1..F-4, A-1 resolved; F-5 open (OC-13) |
| 2026-11-22T18:22:12Z | Round 3 | Started | | IR-005 cfc4bc67f2 (HEAD d3c87be5c5); BLD-01 rebuilt |
| 2026-11-22T18:24:38Z | OC-01..13 | Finished | Pass | 13/13; OC-13 followed, no AGENT_ORG_DEFINITION_NOT_FOLLOWED (F-5 fixed) |
| 2026-11-22T18:24:38Z | TC-01 | Finished | Pass | baseline 974 in 300 |
| 2026-11-22T18:24:38Z | 2026-11-22T18:26:47Z | OF-01..06, OCU-01..05 | Finished | Pass | 6/6; probe 5/5 (follow path rechecked on IR-005) |
| 2026-11-22T18:26:47Z | Round 3 | Finished | Pass | all criteria proven |
| 2026-11-22T21:03:48Z | Round 4 | Started | | IR-008 26c6240f33 (HEAD 29a1bf23a8); pnpm install --frozen-lockfile; BLD-01 exit 0; TC-01 server 973 baseline |
| 2026-11-22T21:03:48Z | FSB-01 | Finished | Pass | regenerated from the current workflow; units step 27 root-limited; clean-image step needs docker (not here); packaged server startup passed. First attempt: my generator ignored working-directory (fixed) |
| 2026-11-22T21:10:57Z | MIG | Finished | Pass | tests/app-data-migrations 75 files, 649 tests |
| 2026-11-22T21:10:57Z | OC-01..14 | Finished | Pass | 14/14 (OC-14 new). Attempt 1: my OC-14 asserted the Org view lists a cross-node line, which the unchanged MessageViewScope never shows (test fixed) |
| 2026-11-22T21:14:57Z | OF, AOML, ORG-E2E, TF | Finished | Pass | 6/6, 2/2, 3/3, 12/12 |
| 2026-11-22T21:14:57Z | RC (whole file, 62) | Started | | |
| 2026-11-22T21:29:55Z | RC (whole file) | Finished | Pass | 62/62 |
| 2026-11-22T21:30:59Z | OCL-01/02 | Finished | Pass | 2/2; OCL-02 3 approvals, delivered, released |
| 2026-11-22T21:32:43Z | OCU-01..05 | Finished | Pass | 5/5 |
| 2026-11-22T21:32:43Z | COST-01 | Started | | opt-in cost measurement |
| 2026-11-22T21:37:04Z | COST-01 | Finished | Pass (measured) | 1,347 MiB: conversion 2,220 ms; 23 follow-ups 1.3-2.2 s each; upgrade start 44.1 s vs 4.6 s (C-1). Attempt 1: my unprobed listener URL (test fixed) |
| 2026-11-22T21:37:04Z | Round 4 | Finished | Pass | all criteria proven; C-1 observation for decision |
| 2026-11-22T21:58:05Z | Round 5 | Started | | IR-009 70dd2b03f1 (HEAD aad78efc0b); BLD-01 rebuilt |
| 2026-11-22T22:00:19Z | MIG | Finished | Pass | 75 files, 651 tests |
| 2026-11-22T22:00:19Z | COST-01 | Finished | Pass (measured) | first start 8,663 ms vs 4,206 ms second; conversion 2,028 ms; 23 follow-ups 2,101 ms total (max 102) — T-1 fixed (round 4: 44,069 ms) |
| 2026-11-22T22:04:41Z | OC-01..14, ORG-E2E, AOML, TC-01 | Finished | Pass | 14/14, 3/3, 2/2; typecheck baseline 973 |
| 2026-11-22T22:04:41Z | Round 5 | Finished | Pass | T-1 resolved |
