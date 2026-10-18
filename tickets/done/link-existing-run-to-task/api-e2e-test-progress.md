# API/E2E Test Progress

Progress log while tests run (append-only). Read it first when picking the run back up.

- Execution coverage report: `api-e2e-execution-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-18 | WDR-R01..R10 | Completed | Pass | IMP-01..IMP-10 reused: same commit `ffeea43dac`, evidence headers checked |
| 2026-10-18T19:13:14Z | WDR-1 | Checkpoint | — | test written (`tests/e2e/projects/hand-started-run-refusal.e2e.test.ts`); runs after the desktop build (build regenerates the Prisma client) |
| 2026-10-18T19:13:14Z | WDR-3..5 | Checkpoint | — | desktop build of `1005f9eaaf` running (`isolated-app start --build`), owned data root in `evidence/api-e2e/withdraw/desktop/data-root.txt` |
| 2026-10-18T19:19:56Z | WDR-1 | Started | — | scripted-AGY e2e, clean env, resolved HOME; log `evidence/api-e2e/withdraw/WDR-1-hand-started-run-refusal.log` |
| 2026-10-18T19:20:54Z | WDR-1 | Completed | Pass | `1 passed`; agent and team run refused with the pre-adoption text, nothing written |
| 2026-10-18T19:20:54Z | WDR-2 | Started | — | whole server e2e in background, log `evidence/api-e2e/withdraw/WDR-2-server-e2e.full.log`; if interrupted, read the log and rerun only files not reached |
| 2026-10-18T19:21:08Z | WDR-3 | Started | — | desktop instance iso-65199-3241 (ctl 65199, srv 65200); data in `desktop/WDR-3-setup.json` |
| 2026-10-18T19:23:14Z | WDR-3 | Completed | Pass | refused with the pre-adoption text; nothing written (`desktop/WDR-3-nothing-written.txt`) |
| 2026-10-18T19:23:14Z | WDR-5 | Started | — | PM delegates Task 3 to a new task agent, then DONE, reopen + message |
| 2026-10-18T19:25:15Z | WDR-5 | Completed | Pass | new copy delegated, reported; DONE closed it; reopen + message reactivated it (`desktop/WDR-5-*.txt`) |
| 2026-10-18T19:25:15Z | WDR-4 | Started | — | archive writer A, delete team A from outside the window (GraphQL); sample sidebar |
| 2026-10-18T19:26:08Z | WDR-4 | Completed | Pass | both rows left within 1 s; `departedRunIds` holds both (`desktop/WDR-4-retired-state.json`) |
| 2026-10-18T19:29:30Z | WDR-2 | Checkpoint | — | 30 files in; `run-projection-toolcalls-graphql` 1 failed ("preserves the exact packaged tool-update reasoning sequence through GraphQL reload"); passed in round 1; base worktree `_tmp-wdr-base-check` (2b04a9971d) being prepared to classify after WDR-2 ends |
| 2026-10-18T19:31:45Z | WDR-2 | Checkpoint | — | run-projection failure classified: also fails on base 2b04a9971d (`WDR-2-classify-run-projection-on-base.log`); cause = test passes `runContext: {} as never`, rejection logging since f4490d258a reads `config.runtimeKind`; test fixed (baseline fix), 6/6 on base (`WDR-2-baseline-fix-on-base.log`); next: after WDR-2 ends, rerun the file here and commit the fix separately |
| 2026-10-18T19:48:34Z | WDR-2 | Completed | Pass | 114 passed, 49 skipped, 3 failed in the full run (`WDR-2-server-e2e.excerpt.log`); all 3 also fail on base, stale tests from earlier tickets; baseline fix `43aa0bcb36`; rerun 3/3 files pass (`WDR-2-baseline-fixes-rerun.log`) |
