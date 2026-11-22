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
| 2026-11-22 13:42 | — | Checkpoint | — | Round 2 (IR-002, `3de03fef6e`): history rewrite checked (`git diff 5b9979ba05 c48316e28b` empty); F-2 checked (R2-TD-2 Pass: `37ed9cdf00` TESTING.md only); MSP-97 now asserts search/list rows |
| 2026-11-22 13:43 | U-1 | Started | — | queued behind another agent's LCP measurement (pid 79946, other repo); `test:nuxt` + guards → /tmp/api590/r2-u1.log |
| 2026-11-22 13:50 | U-1 | Completed | Pass | `Test Files  796 passed (796)`, `Tests  6046 passed (6046)`; three guards pass (13:44–13:50; the other agent's second LCP run started 13:45, overlapping) |
| 2026-11-22 13:52 | WS-1 (R2) | Started | — | queued behind the other agent's run (pid 46798); phone bundle rebuild, then whole `test:e2e:mobile-shell` → /tmp/api590/r2-ws-1 |
| 2026-11-22 14:39 | WS-1 (R2) | Completed | Fail (outside) | 96 cases, 94 Pass; MSP-97 Pass (all native rows summarized); MSP-44/45 fail (FU-006); 1 unknown browser error MSP-55 `net::ERR_SOCKET_NOT_CONNECTED` (case Pass; its deliberate link cut; allowlist has only CONNECTION_RESET) |
| 2026-11-22 14:42 | MSP-98 (R2) | Completed | Pass | Running, 2 log lines → Success, 30 |
| 2026-11-22 14:44 | FS-1 | Started | — | fresh clone `648a8e0299` /tmp/api590/fs-1: install --frozen-lockfile, `build:electron:mac -- --arm64`, verify steps → /tmp/api590/fs-1.log |
| 2026-11-22 14:49 | FS-1 | Completed | Pass | install --frozen-lockfile, `build:electron:mac -- --arm64` (typecheck 86 in 36 at baseline), DMG/ZIP; Prisma and terminal runtime (spawn probe) ok |
| 2026-11-22 14:50 | RR-1 | Started | — | Secret Gate PASS (16 commits); pushed `HEAD:refs/heads/codex/phone-activity-details` (`648a8e0299`); `pnpm release:test --ref codex/phone-activity-details` → run 45029500186 (polling) |
| 2026-11-22 15:17 | RR-1 | Completed | Pass | run 45029500186 success: five build jobs success; signing/publish skipped |
