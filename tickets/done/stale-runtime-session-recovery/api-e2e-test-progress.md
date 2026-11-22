# API/E2E Test Progress

| Time | Case | Status | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-22 15:55 | API-00 | Started | | server build |
| 2026-11-22 15:55 | API-00 | Completed | exit 0 | |
| 2026-11-22 15:56 | API-02/03/04 | Started | | live Claude LC-01, LC-02 |
| 2026-11-22 16:09 | API-02/03/04 | Completed | Pass | LC-01 (renewal, line on reopen, notice first, answer recalls codeword from the journal, REQ-007 warning, auth failure not renewed, later resume no second notice) and LC-02 (busy restart resumes --resume=<id>, recalls, no renewal) pass; nothing written to ~/.claude |
| 2026-11-22 16:09 | API-05 | Started | | live Codex LC-03 |
| 2026-11-22 16:10 | API-05 | Completed | Pass | LC-03 Codex renewal: segment, marker, new thread, notice in turn/start, answer |
| 2026-11-22 16:10 | API-06 | Started | | lifecycle suite restore cases, isolated api-key mode |
| 2026-11-22 16:12 | API-06 | Completed | Pass | 4 restore cases pass isolated on both CLI candidates; negative control (harness without verifyResumable) fails both |
| 2026-11-22 16:13 | — | Committed | | test commits f23f0dc834 03e5d4b4b1  |
| 2026-11-22 16:13 | API-07 | Started | | server test:unit |
| 2026-11-22 16:25 | API-07 | Completed | exit 0 | Tests  8900 passed | 9 skipped (8909) |
| 2026-11-22 16:25 | API-08 | Started | | integration |
| 2026-11-22 16:28 | API-08 | Completed | exit 0 | Tests  517 passed | 71 skipped (588) |
| 2026-11-22 16:28 | API-09 | Started | | root test:e2e |
| 2026-11-22 16:45 | API-09 | Completed | exit 1 | Tests  1 failed | 573 passed | 759 skipped (1333) |
| 2026-11-22 16:50 | API-07..09 | Completed | Pass for this change | unit 8900, integration 517, E2E 126 pass; 2 cleanup races (FU-002), pass alone 2/2 |
| 2026-11-22 16:50 | Round 1 | Closed | Pass | API-REV-001; to code_reviewer |
