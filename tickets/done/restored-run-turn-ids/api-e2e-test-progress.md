# API/E2E Test Progress — autobyteus-526 round 1

| Time (local) | Case | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-18 07:00 | V | Started | | plan in api-e2e-coverage-investigation.md; head dist built at 238be7dbc0; base worktree api526-base-2e9ac1e65b building |
| 2026-11-18 07:13 | V-01 | Checkpoint | | RR-10 first run: product right (traces turn_0001..3, live new per session); my assertion wrong (projection inputs/notices have no turnId); rewritten to the reader's sequence |
| 2026-11-18 07:20 | V-01 | Completed | Pass | RR-10 Pass on this build; Fail on base 2e9ac1e65b (turn_0001 ×3, replies all @turn_0001) = before |
| 2026-11-18 07:20 | V-02 | Completed | Pass | RR-11: base history turn_0001 ×3 kept byte-for-byte; next turn turn_0002; old replies all @turn_0001 (a turn-grouping view shows them as one turn) |
| 2026-11-18 07:22 | V-03 | Checkpoint | | MSP-75 (new phone case, own node delta, production phone bundle, Europe/Berlin): runs 1-2 hit the probe setup's AGY discovery timeout (load) and my reload step (the reload keeps the run open); fixed |
| 2026-11-18 07:28 | V-03 | Checkpoint | Fail | head: live after restart 1 → 2 cards for 1 restart (REPLY_ONE shown); live after restart 2 → 3 cards for 2 (all replies shown); after reload 2 cards, all once; time "18 Nov 2026, 07:27 CET" |
| 2026-11-18 07:29 | V-01 | Checkpoint | | server frame order (temporary recording, removed): ONE SYSTEM_TASK_NOTIFICATION per restart, before TURN_STARTED; the duplicate is made in the web |
| 2026-11-18 07:33 | V-03 | Checkpoint | | base 2e9ac1e65b (module copied into the base worktree, base phone bundle): live 2 then 3 cards and REPLY_ONE / REPLY_TWO hidden; reload 2 cards, all replies; UTC time. So: the turn-id fix restores the hidden replies; the live duplicate card is a second, pre-existing cause |
| 2026-11-18 07:35 | V-04 | Started | | isolated desktop instance of 238be7dbc0 with the test vault (building) |
| 2026-11-18 07:52 | V-04 | Completed | Fail | desktop: live 2 cards for 1 restart; 3 for 2 (newest twice); reload of the live run still 3; replies all once; CET cards / UTC stored; 2nd restart hit "Backend exit not confirmed" (load), app restarted the server itself |
| 2026-11-18 08:02 | V-03 | Completed | Fail | clean run: live 2 → 3 cards, reload 2; replies once; "07:58 CET" for "06:58 UTC" |
| 2026-11-18 08:09 | V-05/V-06 | Completed | Pass | RR-01..06, RR-10, RR-11 pass; typecheck at baseline after typing ConversationItem |
| 2026-11-18 08:15 | V | Completed | Fail | F-1 (live duplicate reminder card), report and API-REV-001 written |
| 2026-11-18 09:20 | R2 | Started | | round 2 (CRR-002 Pass, SR-002 one identity per notice, IR-002, tested at ee5e87495f); head dist + phone bundle built |
| 2026-11-18 09:31 | R2-03 | Completed | Pass | new platform-notice-identity.e2e.test.ts PNI-01..03: message_id on agent stream, team stream (with agent_run_id), Org view agent_presentation; equal to the stored messageId; reconnect adds none |
| 2026-11-18 09:33 | R2-04 | Completed | Pass | PNI-04 live Claude: "Background task completed" notice, same id live and stored |
| 2026-11-18 09:58 | R2-02 | Completed | Pass | RR-01..06, RR-10, RR-11 (base rebuilt in a temporary worktree) |
| 2026-11-18 10:40 | R2-01 | Completed | Pass | phone MSP-75 1/2/2 cards (F-1 resolved), MSP-76 Team coordinator and MSP-77 Org member: notice once live and after reload (after fixing my module: pairing before any run, list navigation after a reload; shared-stack setup timeouts under load) |
| 2026-11-18 10:42 | R2-05 | Started | | isolated desktop instance of ee5e87495f (building) |
| 2026-11-18 10:58 | R2-05 | Completed | Pass | desktop: 1 card after one restart, live and after a reload of the live run; 2 after two; replies once; Claude notice once live and after reload; one restart hit the server's 10 s shutdown budget (load) |
| 2026-11-18 11:02 | R2-06 | Completed | Pass | server typecheck at baseline with the new suite |
| 2026-11-18 11:10 | R2 | Completed | Pass | report round 2, API-REV-002 |
