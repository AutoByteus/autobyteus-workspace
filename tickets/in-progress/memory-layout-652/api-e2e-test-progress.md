# API/E2E Test Progress

Ticket autobyteus-652 (memory-layout-652), round 1, commit under test `7bf21db56e`. Working root `/tmp/api652` (mine).

| Time (2026-11-26) | Case | Event | Note |
| --- | --- | --- | --- |
| 07:41 | API-001 | Started | `pnpm test:nuxt` (`env -i`), machine load ~160–215 from other work |
| 07:44 | API-003 | Checkpoint | probe updated: fixture (an h2, a 40-character file in `sites/`) and SMV-110…119; runs after API-001 |
| 07:44 | API-010…014 | Checkpoint | my stack `/tmp/api652/scripts/stack.mjs` (from IMP-003's, extended: org and org run, long document, beta syncing into the hub, file kinds in the workspace and a skill); starts after API-001 |
| 07:47 | API-001 | Completed: Pass | 811 files; 6290 passed, 2 skipped |
| 07:48 | API-010…014 | Started | my stack (`/tmp/api652/stack`) |
| 07:53 | API-010…014 | Completed | views at 1440×900, 1280×800, 390×844, 1280×720; org, imported, search, keyboard, icons: all as specified, 0 errors, EXCEPT F-1 (Episodic cards overflow a 390 px window with a long workspace path) and F-2 (owner page name cut when the subtitle shows: 157/172 px at 1440, 89/172 at 1280). Stack stopped, root removed |
| 07:54 | API-003 | Started | `semantic-memory-view-probe.mjs` with SMV-110…119 |
| 07:56 | API-003 | Completed: Pass (run 1) | 52/52 (SMV-110…119 added, all pass) |
| 07:58 | API-003 | Completed: Fail (run 2) | SMV-120 (F-2) and SMV-121 (F-1) added as reproductions: SMV-120 fails at 1280 (90 of 153 px); one run with SMV-120 non-fatal (reverted): SMV-121 fails (cards end at 695 px in 390) |
| 07:59 | Round 1 | Completed: Fail | report and revision record written |
| 08:25 | Round 2 | Started | IR-002 `0072beea13` (CRR-001 CR-001, CR-002) |
| 08:26 | API-016 | Checkpoint | specs: 45 files, 304 tests passed |
| 08:27 | API-003 | Completed: Pass (round 2) | 54/54; SMV-120 whole at 1440/1280; SMV-121 cards end at 370 in 390 |
| 08:28 | API-016 | Started | stack with a very long owner name; steps r2, hdr2, hdr3 |
| 08:31 | API-016 | Completed: Fail (F-3) | CR-001 and CR-002 hold at 1440, 1280, 390; at 1024×768 the agent's name is 0 px (team 73/219, run title 34/276); 768: 36 px. Stack stopped |
| 08:34 | API-003 | Completed: Fail (round 2, SMV-122 added) | SMV-122 reproduces F-3: at 1024 px the name is 0 of 153 px; SMV-001…121 before it pass |
