# API/E2E Test Progress

My progress log while tests run. Read it first when picking the run back up. Rows are only added.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)
- Raw logs: `/tmp/api500/`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17 13:37 | WATCH-LINUX | Started | | Docker `node:22-bookworm` (arm64, linuxkit kernel), `git archive` of `cc8dbce099`, frozen install, `test:integration:prepare`, watcher file ×5; logs `/tmp/api500/watch` |
| 2026-11-17 13:44 | WATCH-LINUX | Completed | Pass | 5 of 5 runs 14/14, no ENVIRONMENT or INCONCLUSIVE label; container load ~6 (10 cpus); next: host server build, then MIG-UNITS / NOTREADY-INT |
| 2026-11-17 13:45 | BUILD | Started | | pnpm -C autobyteus-server-ts build at cc8dbce099 (dist was 10:18, older than source) |
| 2026-11-17 13:50 | BUILD | Completed | Pass | dist 13:44 from cc8dbce099 |
| 2026-11-17 13:52 | MIG-UNITS, NOTREADY-INT | Completed | Pass | attachment 8/8, team-index 3+1, not-ready 9/9, order 6/6 (recorder gated; IMP-07 reused) |
| 2026-11-17 13:56 | GATES | Completed | Pass | probe guard 58 IDs no duplicate; runtime-names 2/2; web typecheck fresh .nuxt at baseline; server typecheck |
| 2026-11-17 13:58 | FULL-SERVER | Started | | tests/e2e with RUN_AGY_FAILURE_E2E=1 (scripted AGY), clean env; log /tmp/api500/r1/full-e2e.log, json full-e2e.json |
| 2026-11-17 13:52 | — | Checkpoint | | Correction: the times in the rows above were estimated; actual: WATCH-LINUX completed 13:43, build 13:44, MIG-UNITS 13:44, GATES 13:46, FULL-SERVER started 13:47 (log mtimes). Written meanwhile: MIG-ATTACH, NOTREADY-REAL, LTI-1 update, G5 probe cases (not run yet) |
| 2026-11-17 15:48 | FULL-SERVER | Checkpoint | | part 1 stopped at the tool's 2 h limit at 15:47: 99 of 271 files done, 62 passed / 37 skipped, 0 failed (load 70-100). Part 2: the other 172 files (incl. the new MIG-ATTACH, NOTREADY-REAL and updated LTI-1), detached (nohup, pid 58981), log /tmp/api500/r1/full-e2e-part2.log |
| 2026-11-17 17:25 | FULL-SERVER | Checkpoint | | part 2 done 17:24: 172 files, 95 passed / 39 skipped / 38 failed (55 tests), load 70-100; RSE-1 and LTI-1 pass; ALM-1 failed on my summary assertion (fixed). Rerun of the 38 files one file at a time: /tmp/api500/r1/rerun-failed.log |
| 2026-11-17 18:14 | FULL-SERVER | Checkpoint | | Sequential rerun of the 38 failed files done 18:12: 9 pass alone, 29 still fail (load 80-100). Next: base 9695d310c5 worktree build, the unclear files on base |
| 2026-11-17 18:31 | FULL-SERVER | Checkpoint | | Base 9695d310c5 (18 unclear files): available-agent-runtimes, configured-skill, terminal fail on base too (not 500); 10 files pass on base. Stale tests updated (FU-011 harness x6, G-5 x3, FU-030 peer x1). Batch 2 (23 files, sequential): /tmp/api500/r1/batch2.log |
| 2026-11-17 19:29 | FULL-SERVER | Completed | Fail | After batch 2 and the Linux container (13 of 16 load suspects pass there): branch-caused: E-002 (G-5 before the definition lookup), DLC inherited-layer text, SCP-E2E-006 (mate gets no answer after restart; branch 0/6, base 2/2); base-side: available-agent-runtimes, configured-skill + project-task-boundaries (search_memory), terminal; stale tests updated |
| 2026-11-17 19:29 | MIG-COST | Completed | Measured | 8.66 GB / 7523 files / 84 converted: pass 1 14.3 s, follow-up 12.3 s (warm, load ~85); backups 182 MB; data removed |
| 2026-11-17 19:29 | G5-001..003, TEXT-PROBES | Started | | delegated-launch-defaults-probe --cases G5-001,G5-002,G5-003,DLP-005,DLP-003,DLP-004,DCP-004,SIR-001,SIR-002; out /tmp/api500/probe1 |
| 2026-11-17 19:44 | G5, TEXT-PROBES | Checkpoint | | probe1: SIR-002 Pass; DLP-005 Fail (inherited-layer text, as DLC); SIR-001 Fail on base too; G5-001/002/003, DLP-003/004, DCP-004 failed on my case or stale probe lines (fixed). probe2 rerun: /tmp/api500/probe2 |
| 2026-11-17 20:00 | G5-001..003, TEXT-PROBES | Completed | Pass (G5 3/3, DLP-003/004, DCP-004, SIR-002, composer 12/12); DLP-005 Fail (F-2); SIR-001 base-side | probe2/probe3/composer1 |
| 2026-11-17 20:00 | LE-F1 | Not run | Next Round | its scripted twin (F-2) fails first |
