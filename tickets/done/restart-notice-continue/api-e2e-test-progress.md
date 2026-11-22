# API/E2E Test Progress — autobyteus-585

| Time (local) | Case | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-22 21:22 | V | Started | | HEAD e9ae5ad3c7; server unchanged by the ticket (its dist reused); phone bundle rebuilt from the commit |
| 2026-11-22 21:27 | V-04 | Checkpoint | | MSP-75 and MSP-99 Pass; MSP-76/77 Fail: no card matched. The screenshot shows the notice row correct (lead row, own "Background tasks finished" row, lead row): my lookup used the old header text that this ticket removes. Rewritten to match the row's label (aria-label) |
| 2026-11-22 21:31 | V-04 | Completed | Pass | MSP-75 1/2/2 "Application restarted" rows; MSP-76/77 one "Background tasks finished" row live and after reload; MSP-99 Pass |
| 2026-11-22 21:35 | V-01 | Completed | Pass | web typecheck 86/36 (baseline); three guards exit 0 |
| 2026-11-22 22:10 | V-05 | Checkpoint | | whole phone suite: 91 Pass, MSP-44/45 Fail (heading links, scrollIntoView timeout); fail alone too |
| 2026-11-22 22:31 | V-03 | Completed | Pass | desktop probe 8/8 checks; screenshot |
| 2026-11-22 22:33 | V-07 | Completed | | zh-CN label 应用已重启 and zh time Pass; dark mode: body slate-300 on white 1.48:1 |
| 2026-11-22 22:36 | V-05 | Completed | Pass for this change | MSP-44/45 identical on base 0da6bfbfc1 (FU-001) |
| 2026-11-22 22:38 | V-07 | Completed | Pass (dark mode pre-existing) | base dark mode: old notice slate-100 on white (worse); FU-002 |
| 2026-11-22 22:50 | V-02 | Completed | Pass | 793 files, 5994 tests |
| 2026-11-22 22:55 | V-06 | Completed | Pass | BG-BROWSER-000..007 |
| 2026-11-22 23:00 | V | Completed | Pass | report, API-REV-001; base worktree removed |
