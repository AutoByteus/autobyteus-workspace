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
| 2026-11-17 21:07 | ROUND 2 | Started | | CRR-004 at c22af3b892 (code 7eb78a701b); dist rebuilt; static check exemption for RSE-1 (3/3); new ODM-1 on-demand models e2e: Pass (base: false note after restart) |
| 2026-11-17 21:07 | F-1, F-2, F-3, G-5 e2e | Started | | batch /tmp/api500/r2/batch.log (8 files, sequential) |
| 2026-11-17 21:39 | F-1, F-2, F-3, G-5 e2e | Completed | Pass | E-002 4/4, SCP 6/6, DLC F-2 case; DTL batch failure was load (rerun 2/2); DLC 3/3 and ODM-1 in Linux |
| 2026-11-17 21:39 | LE-F1 | Completed | Pass | live Claude with CLAUDE_E2E_STALE_MODEL=claude-sonnet-4-5-20250929 (default stale model is in the catalog) |
| 2026-11-17 21:39 | G5-001..003, DLP-005, DLP-003/004 | Completed | Pass | 6/6 /tmp/api500/r2/probe |
| 2026-11-17 21:39 | ROUND 2 | Completed | Pass | 95% |
| 2026-11-17 21:45 | ODM-1 (CR-500-006) | Completed | Pass | positive assertions; lead options unconditional |
| 2026-11-18 01:53 | ROUND 3 | Started | | merged state 2f10dbe1bb (code eb741a097e, base ff13782f36); dist built by delivery 01:07 |
| 2026-11-18 01:53 | WATCH-MAC | Completed | Evidence only | load 5-7 but fseventsd 169%, a VM 214%: 1/5 pass, 13 failures all INCONCLUSIVE, 0 ENVIRONMENT, 0 unlabeled; not quiet (D-13b) |
| 2026-11-18 01:53 | FULL-SERVER (r3) | Started | | tests/e2e, detached, /tmp/api500/r3/full-e2e.log |
| 2026-11-18 03:54 | FULL-SERVER (r3) | Checkpoint | | full run done 03:45: 275 files, 167 passed / 78 skipped / 30 failed (38 tests), 7186 s, load ~7-10. Sequential: the 30 alone on the branch, then on base ff13782f36 (/tmp/api500/r3/seq-summary.log) |
| 2026-11-18 04:24 | FULL-SERVER (r3) | Completed | Pass after one test fix | branch-only alone: 5 load, E-007 my FU-011 harness gap (fixed, 18/18); base-side: AAR-01..04, CPW-P1..P3, NAS x2, configured-skill, SM x6, DCF-E2E-007; INTEGRATION started |
| 2026-11-18 04:40 | INTEGRATION (r3) | Completed | Pass (base-side/FSEvents only) | 503 passed, 2 failed: watcher INCONCLUSIVE (macOS), package-auto-refresh FSEvents (base fails 2 too); Linux: watcher 5/5, refresh 14/15 (root-only EACCES case) |
| 2026-11-18 04:52 | PROBES (r3) | Completed | Pass | merged web: 8/8, composer 12/12; WATCH-LINUX-M 5/5; ROUND 3 Pass |
| 2026-11-18 05:38 | ROUND 4 | Started | | CRR-010 merge of 0570c47fd9 (head 44fec882bc, merge e93671cce0, fix 4db98c6d1a); dist rebuilt 05:36; TS-009 added (Org background rows) |
| 2026-11-18 05:38 | FOCUS, TS-008/009, PROBES | Started | | chain /tmp/api500/r4/chain.log |
| 2026-11-18 06:57 | FOCUS, TS, PROBES (r4) | Completed | Pass after test fixes | focus: this ticket's cases, episodic 7/7, BTS-01..03,06, PBS-01 pass; DCM-001..003 failed 2x in sequences, 11/11 alone (base 11/11); TS-009 added, label fix, TS-008/009 Pass; SIR-002 fixed for 493's derived memory/episodic (base fails earlier on G-3's data); G5 3/3, DLP, DCP-004, composer 12/12; app restart killed one run (rerun) |
| 2026-11-18 06:57 | FULL-SERVER, INTEGRATION (r4) | Started | | chain2 /tmp/api500/r4/chain2.log |
| 2026-11-18 11:05 | FULL-SERVER, INTEGRATION (r4) | Completed | Fail (F-4) | full 36 failed at load 50-110; alone 18 pass; Linux 12/13 pass + watcher 5/5; base-side as r3; DTL fails on base at the same load; F-4 open-task-tree OT-2/3 (base 3/3) |
| 2026-11-18 11:05 | ROUND 4 | Completed | Fail | F-4 to the code reviewer |
