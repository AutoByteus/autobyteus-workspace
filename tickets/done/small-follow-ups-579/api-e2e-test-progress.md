# API/E2E Test Progress

| Time | Case | Status | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-22 19:59 | API-06 | Decision | | evidence decision requested; DEC-004 received: (a), calm whole E2E by API/E2E, busy regime Accepted Unverified Risk |
| 2026-11-22 19:59 | API-02 | Completed | Pass | TESTING.md Claude home and recorder entry, b6b8020bf5 |
| 2026-11-22 19:59 | API-00 | Started | | server build |
| 2026-11-22 20:00 | API-00 | Completed | exit 0 | |
| 2026-11-22 20:00 | API-03 | Started |  | server integration |
| 2026-11-22 20:04 | API-03 | Completed | exit 0 | Tests  517 passed | 71 skipped (588) |
| 2026-11-22 20:04 | API-06 | Started |  | calm whole server E2E (DEC-004) |
| 2026-11-22 20:24 | API-06 | Completed | exit 0 | Test Files  128 passed | 160 skipped (288) |
| 2026-11-22 20:24 | API-04 | Started |  | rendered semantic memory probe |
| 2026-11-22 20:25 | API-04 | Completed | exit 1 | semantic memory view probe: Fail (36/36 checks) → /Users/normy/autobyteus_org/ |
| 2026-11-22 20:25 | API-05 | Started |  | packaged event-monitor-file-preview probe (builds the app) |
| 2026-11-22 20:31 | API-05 | Completed | exit 1 |  |
| 2026-11-22 20:33 | API-04 | Rerun | | first run: page.waitForURL time-out in the CR-001 step (cold Vite cache, as 576/554 saw); rerun |
| 2026-11-22 20:34 | API-05 | Rerun | | baseline fix: the probe's fixture sandbox gets a require for ~/ modules (N-001 setup failed: require is not defined, on base too) |
| 2026-11-22 20:35 | API-04 | Completed | Pass | rerun 41/41 (first run: cold Vite cache in the CR-001 step) |
| 2026-11-22 20:35 | API-05 | Completed | Not Tested | the packaged probe is broken on the base (sandbox require; taskExecutions removed by 461); partial fix reverted; leftover instance iso-60171-ce9e stopped (data root removed, ports released); FU-002 |
| 2026-11-22 20:36 | Round 1 | Closed | Pass | API-REV-001; to delivery |
