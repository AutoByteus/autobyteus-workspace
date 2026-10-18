# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-18 | API-01..API-04 | Completed | Pass (Reused) | IMP-01/02/03/05 reused; `git diff --name-only f4490d258a HEAD` touches only `tickets/` |
| 2026-10-18 | API-05 | Started | — | Live Claude E2E round 1 on HEAD (both CLI candidates), worktree `autobyteus-server-ts` |
| 2026-10-18 | API-05 | Checkpoint | — | Round 1: sdk-bundled passed but only one provider turn (race shape absent); path-claude: haiku never started the background task (setup). Test changed to two parallel background tasks + setup precondition. `/tmp/api05-r1.log` |
| 2026-10-18 | API-05 | Checkpoint | — | Round 2 on HEAD: 2 passed; both CLIs produced T1 (notice, no text) + T2 (work). `/tmp/api05-r2.log` |
| 2026-10-18 | API-06 | Started | — | Base comparison: 4 modified src files checked out from 1c718202b2 in the worktree; MUST restore with `git checkout HEAD -- autobyteus-server-ts/src` afterwards |
| 2026-10-18 | API-06 | Completed | Pass (no defect detected at base) | Base src: 2/2 passed, race did not occur (queue idle). Worktree src restored, `git status` clean. `/tmp/api06-base.log` |
| 2026-10-18 | API-05 | Checkpoint | — | Round 3 (final file with timing) on HEAD: 2 passed; sdk-bundled T1 end→T2 start 0.2 ms at dispatch; path-claude single provider turn this time. `/tmp/api05-r3.log` |
| 2026-10-18 | API-06b | Started | — | Temporary probe copy at autobyteus-server-ts/tests/e2e/runtime/zz-probe-claude-live-queue-lag.e2e.test.ts; base src checked out first; MUST restore src and delete the copy |
| 2026-10-18 | API-06b | Completed | Pass (defect reproduced at base, fixed at HEAD) | Base: 2/2 failed, 8 lifecycle notices each, no T2 text. HEAD: 2/2 passed, 0 notices. Src restored; probe copy deleted. `/tmp/api06b-base.log`, `/tmp/api06b-head.log` |
| 2026-10-18 | API-05 | Checkpoint | — | Durable test now runs idle + loaded (25 ms) per CLI; typecheck of the new file clean (3 pre-existing errors in claude-live-agent-harness.ts). Final run starting |
| 2026-10-18 | API-05 | Completed | Pass | HEAD: 4/4 passed (idle+loaded × 2 CLIs), 0 notices, 0 rejection log lines. `/tmp/api05-final.log` |
| 2026-10-18 | API-06c | Started | — | Final durable file on base src (4 files from 1c718202b2); MUST restore src |
| 2026-10-18 | API-06c | Completed | Pass (durable test detects defect) | Base: idle 2/2 pass, loaded 2/2 fail with 8 lifecycle notices each. Src restored, clean. `/tmp/api06c-base.log` |
| 2026-10-18 | API-07 | Started | — | Existing live suite claude-agent-background-task.e2e.test.ts, first case, both CLIs |
| 2026-10-18 | API-07 | Completed | Pass | 2/2 passed (10 other cases skipped by -t filter). `/tmp/api07.log` |
| 2026-10-18 | API-08 | Started | — | isolated-app start --build from worktree root (background); stdout /tmp/api08-start.json, stderr /tmp/api08-build.log; MUST stop our instanceId at the end |
| 2026-10-18 | API-08 | Checkpoint | — | First build attempt was stopped before finishing (session ended); no instance of ours was started. Restarting isolated-app start --build (stdout /tmp/api08-start.json, stderr /tmp/api08-build.log) |
| 2026-10-18 | API-08 | Checkpoint | — | Instance iso-59932-7c13 started (control 59932, server 59933, own data root); build 1.5.6-beta.2 from worktree. Next: attach, create Claude agent, run journey |
| 2026-10-18 | API-08 | Completed | Pass | Desktop journey: T1 notices only, T2 "Claude started a turn on its own." + text visible, header Running mid-T2, Idle after, 0 error cards, 0 rejection log lines, T2 text in run memory. Instance stopped (dataRootRemoved true, ports released); `list` shows no instance of ours |
| 2026-10-18 | API-09 | Completed | Not Tested | Optional ASM-001 Codex turn in the instance skipped: instance was started without a test-owned CODEX_HOME; ASM-001 covered by reused full unit/integration suites |
