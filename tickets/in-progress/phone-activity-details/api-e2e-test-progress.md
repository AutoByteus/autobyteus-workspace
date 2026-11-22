# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-22 11:55 | CR-1 | Started | — | Read summary keys vs. the node's AGY argument names |
| 2026-11-22 12:05 | CR-1 | Completed | Fail | `TargetFile` (write_to_file, replace_file_content), `Query`/`SearchPath`, `Pattern`/`SearchDirectory`, `DirectoryPath` are AGY argument names the summary does not read; F-1 |
| 2026-11-22 12:08 | B-1 | Started | — | server build, then phone bundle (background) |
| 2026-11-22 12:16 | B-1 | Completed | Pass | both exit 0 |
| 2026-11-22 12:10 | CR-2 | Completed | Pass | `contextText` only in a hydration spec that asserts it is dropped |
| 2026-11-22 12:17 | MSP-94…97 | Started | — | `--cases=MSP-94,MSP-95,MSP-96,MSP-97` → /tmp/api590/msp-94-97 |
| 2026-11-22 12:22 | MSP-94…97 | Completed | Fail | 94/95/96 Pass; MSP-97 Fail (write_to_file, replace_file_content rows without file) |
| 2026-11-22 12:24 | MSP-94…98 | Started | — | with the live gate → /tmp/api590/msp-94-98 |
| 2026-11-22 12:28 | MSP-94…98 | Completed | Fail | 94/95/96 Pass; 97 Fail (F-1); 98 Fail by my assertion (one-line match on a multi-line log); behavior correct |
| 2026-11-22 12:29 | MSP-98 | Started | — | assertion fixed, rerun alone → /tmp/api590/msp-98 |
| 2026-11-22 12:30 | MSP-98 | Completed | Pass | Logs (1) → Logs (3) while open; Running → Success |
| 2026-11-22 12:31 | TC-1 | Started | — | demo build, then typecheck (background) |
| 2026-11-22 12:33 | TC-1 | Completed | Pass | `86 in 36 files (baseline 86 in 36 files)`, demo build 13M present |
| 2026-11-22 12:35 | WS-1 | Started | — | whole `test:e2e:mobile-shell` → /tmp/api590/ws-1 |
| 2026-11-22 12:36 | WS-1 | Completed | Not Tested | setup assert "alpha serves the phone bundle at /mobile": the demo build had replaced `autobyteus-web/dist/public` (my order); rebuild the phone bundle, rerun |
| 2026-11-22 12:38 | WS-1 | Started | — | phone bundle rebuilt; whole run → /tmp/api590/ws-1 (first attempt kept in ws-1-setup-abort) |
| 2026-11-22 13:45 | WS-1 | Completed | Fail | 96 cases, 93 Pass; MSP-97 (F-1), MSP-44, MSP-45 fail; MSP-98 skipped (gate) |
| 2026-11-22 13:47 | WS-2 | Started | — | MSP-44, MSP-45 alone → /tmp/api590/msp-44-45 |
| 2026-11-22 13:52 | WS-2 | Completed | Fail | reproduce alone; cause in base (autobyteus-576 `8c3810df95`: relative links open the file); follow-up candidate |
