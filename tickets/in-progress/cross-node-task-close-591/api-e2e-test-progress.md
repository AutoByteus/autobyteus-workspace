# API/E2E Test Progress — autobyteus-591

My working log. The report's Cases table is the result.

| Time | Case | State | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-21 15:38 | BUILD | Started | | autobyteus-ts, server, test:integration:prepare; /tmp/api591/build.log |
| 2026-11-21 15:44 | BUILD | Completed | Pass | exit 0 |
| 2026-11-21 15:46 | TYPECHECK (suite edits) | Completed | Pass | 1002 in 314 (baseline) |
| 2026-11-21 15:47 | RC-ALL r1 | Started | | /tmp/api591/rc1.log, evidence /tmp/api591/rc1 |
| 2026-11-21 15:57 | RC-ALL r1 | Completed | Fail (6) | RC-11 tree row gone after close (F-1, a pre-existing open-subtree rule vs AC-006 text); my test errors: ad-hoc Task not a saved Task (RC-51, RC-52), update_task reports the Task key (RC-23); cascades RC-53, RC-14 |
| 2026-11-21 15:59 | RC-ALL r2 | Started | | /tmp/api591/rc2.log |
| 2026-11-21 16:09 | RC-ALL r2 | Completed | Fail (6) | F-2: reopened own Task refused "already has Task" (RC-51, RC-52); RC-23 picked the open confirmation (mine); RC-19 window (mine, solo grew); cascades RC-53, RC-14 |
| 2026-11-21 16:13 | RC-ALL r3 | Started | | /tmp/api591/rc3.log |
| 2026-11-21 16:25 | RC-ALL r3 | Completed | Fail (3) | 50 passed; RC-51, RC-53 = F-2; RC-52 my older-beta check (idle grace) |
| 2026-11-21 16:33 | RC-52 alone (with RC-01, RC-03) | Completed | Pass | delivered 28.0 s / 28.3 s after beta back; rf reopened alone still stopped (F-2 b) |
| 2026-11-21 16:28 | NEIGHBOURS (stories, CPW) | Started | | /tmp/api591/neighbours.log |
| 2026-11-21 16:50 | NEIGHBOURS (stories, CPW) | Completed | Fail (2) | CPW 14/14 (+P1..P3); stories §5.3 Pass; §5.1 S18 and §5.2 U9: 565 counterpart not in the contract fixture (no 591 change touches it); base check next |
| 2026-11-21 16:50 | BASE stories §5.2 (7591aa307f) | Started | | worktree ../591-base-7591aa30 |
| 2026-11-21 16:58 | BASE stories §5.2 (7591aa307f) | Completed | Fail (same) | U9 counterpart identical: base-side |
| 2026-11-21 17:09 | BASE stories §5.1 (7591aa307f) | Completed | Fail (same) | S18 counterpart identical: base-side; worktree removed |
| 2026-11-21 17:09 | MSP-93 (build:mobile-web, probe) | Started | | /tmp/api591/mobile-build.log, /tmp/api591/msp |
| 2026-11-21 17:16 | MSP-93 (build:mobile-web, probe) | Completed | Pass | list 0.9 s after DONE; phone 4.1 s, desktop 4.2 s after the list; reopen alone: away; new saved Task: back in 1.3 s |
| 2026-11-21 17:16 | RC-ALL r4 (final) | Started | | /tmp/api591/rc4.log |
| 2026-11-21 17:28 | RC-ALL r4 (final) | Completed | Fail (2, F-2) | 51 passed; RC-51, RC-53 = F-2 |
| 2026-11-21 17:31 | ROUND 1 | Completed | Fail | F-1, F-2 (Requirement Gap, preliminary); 89% |
| 2026-11-21 18:01 | ROUND 2 | Started | | CRR-003 (head 81a504de13, code a811f94348, DN-9): F-1, F-2 rerun against SR-010 |
| 2026-11-21 18:01 | BUILD (r2) | Started | | /tmp/api591/r2/build.log |
| 2026-11-21 18:03 | BUILD (r2) | Completed | Pass | exit 0 |
| 2026-11-21 18:03 | RC-ALL r5 (round 2) | Started | | /tmp/api591/r2/rc.log |
| 2026-11-21 18:15 | RC-ALL r5 (round 2) | Completed | Fail (5) | the delegator now gets the local text "This Task is DONE. The agent that assigned it can …" (my assertions: RC-11, RC-23, RC-49); cascades RC-51, RC-53 |
| 2026-11-21 18:16 | RC-ALL r6 (round 2) | Started | | /tmp/api591/r2/rc6.log |
| 2026-11-21 18:28 | RC-ALL r6 (round 2) | Completed | Pass | 53/53 |
| 2026-11-21 18:28 | MSP-93 (round 2) | Started | | /tmp/api591/r2/msp |
| 2026-11-21 18:30 | MSP-93 (round 2) | Completed | Pass | back 2.1 s after the assigner's message |
| 2026-11-21 18:32 | CPW (round 2) | Completed | Pass | 14/14 |
| 2026-11-21 18:40 | ROUND 2 | Completed | Pass | 95%; F-1, F-2 resolved |
