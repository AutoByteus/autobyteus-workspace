# API/E2E Test Progress

Read this first whenever the run is picked back up. Only add rows.

- Execution coverage report: `tickets/in-progress/shell-command-time-limits-483/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-17 12:22 | API-01 | Started | | smoke run of the new suite with short durations (LONG=120 s, FG=60 s) to check the harness; output /tmp/lcl-smoke |
| 2026-11-17 12:24 | API-FSB | Started | | fresh clone /tmp/fsb-483 of c77d83ef27; log /tmp/fsb-483-scripts/API-FSB.log |
| 2026-11-17 12:29 | API-01 | Checkpoint | | smoke (120 s jobs): 8/10 pass; LCL-LONG-GROK-BG: Grok 429 free usage exhausted for grok-4.7 (user's plan, rolling 24 h); LCL-LONG-AGY-DAEMON: AGY view lists running tasks only (pre-existing monitor list()), assertion moved to stream; Codex view assertion added. Smoke output /tmp/lcl-smoke |
| 2026-11-17 12:29 | API-01 | Started | | real long run: LONG=2100 s, FG=660 s, -t LCL-LONG, maxConcurrency 12; evidence tickets/in-progress/shell-command-time-limits-483/evidence/API-01-long-runs; log tickets/in-progress/shell-command-time-limits-483/evidence/API-01-long-runs/vitest.log |
| 2026-11-17 12:30 | API-01 (LCL-ENV) | Started | | -t LCL-ENV in its own vitest process; evidence tickets/in-progress/shell-command-time-limits-483/evidence/API-01-env |
| 2026-11-17 12:31 | API-01 (LCL-ENV) | Completed | Pass | 3/3: DEFAULT, SETTINGS, SERVER |
| 2026-11-17 12:37 | API-FSB | Completed | Pass | RESULT: PASS; clone removed |
| 2026-11-17 12:37 | API-03 | Started | | native transport e2e, evidence tickets/in-progress/shell-command-time-limits-483/evidence/API-03-native-transport |
| 2026-11-17 12:46 | API-03 | Checkpoint | | full file: 8/9 pass; BGT-09 failed: observation path stale since 461 (collaboration view projects communication only); baseline fix rewrote BGT-09 to watch the copy's own stream/view/isActive |
| 2026-11-17 12:46 | API-03 | Completed | Pass | BGT-01..08 pass (evidence/API-03-native-transport), BGT-09 pass after baseline fix (evidence/API-03-native-transport-bgt09) |
| 2026-11-17 12:46 | API-02 | Started | | RUN_CLAUDE_E2E claude-agent-background-task.e2e.test.ts |
| 2026-11-17 13:07 | API-01 | Completed | Pass (8/9; Grok Not Tested yet) | LCL-LONG-* pass except LCL-LONG-GROK-BG (Grok capability probe timed out under load; earlier 429 quota for grok-4.7). Retry Grok alone later |
| 2026-11-17 13:15 | API-01 (GROK) | Started | | retry loop /tmp/lcl-scripts/grok-retry.sh, evidence /tmp/lcl-grok-long (attempts.log); quota 429 at 13:0x |
| 2026-11-17 13:26 | API-02 | Checkpoint | | run 1: 12/12 fail AGENT_STREAM_UNAVAILABLE (harness has no stream sequence since 461); baseline fix in claude-live-agent-harness.ts (lazyAgentStreamSequences); rerun |
| 2026-11-17 13:26 | API-04 | Started | | RUN_AGY_BACKGROUND_E2E cases (a)(b)(c) |
| 2026-11-17 13:28 | API-04 | Completed | Pass | (a)(b)(c) pass |
| 2026-11-17 13:28 | API-05 | Started | | building server dist + build:mobile-web, then mobile-shell MSP-47,48,49,56 |
| 2026-11-17 13:31 | API-02 | Completed | Pass | 12/12 after harness baseline fix |
| 2026-11-17 13:33 | API-05 | Completed | Pass | MSP-47,48,49,59 pass (attempt 1 setup timed out on AGY model discovery under load) |
| 2026-11-17 13:33 | API-01 (GROK) | Checkpoint | | loop 1: attempt 1 quota 429, attempt 2 model discovery timeout (load); restarted loop 2 → /tmp/lcl-grok-long |
| 2026-11-17 13:33 | API-06 | Started | | server + web typecheck |
| 2026-11-17 14:43 | API-01 (GROK) | Completed | Pass | attempt 3 accepted 13:05Z; 2104 s, alive past 30 min, done; evidence/API-01-grok |
| 2026-11-17 14:44 | — | Completed | Pass | round result Pass 95.1%; documents and evidence committed; handoff to /delivery_engineer |
