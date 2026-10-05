# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command`
- Coverage investigation: `tickets/in-progress/background-task-shell-command/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/background-task-shell-command/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/background-task-shell-command/api-e2e-revision-record.md`
- Ledger scope and reason it is required: multiple live provider cases (Claude ×2 CLIs, AGY), a packaged desktop build and journey; long-running and interruption-prone
- Last updated: 2026-10-05

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RC-1 | Contract tests | REQ-001, AC-006 | Contract packages | `pnpm -C <contracts> test` | 1 | — |
| RC-2 | Focused server unit suites | REQ-001..004/007, QR-001 | Server unit | vitest (see investigation order 2) | 2 | — |
| RC-3 | Focused web unit/component | AC-003/004/005, QR-002 | Web | `test:nuxt --run …` | 3 | — |
| AE-L1 | Live Claude agent bg Bash running → completed with command (as delivered) | AC-001, REQ-007 | Real CLI → server websocket | `RUN_CLAUDE_E2E=1 vitest run claude-agent-background-task…` | 4 | Both CLIs |
| AE-T1 | Live Claude team member command | AC-006 | Team websocket | same run | 4 | — |
| AE-A1 | Live AGY command === description | AC-004, REQ-003 | Real agy → server websocket | `RUN_AGY_BACKGROUND_E2E=1 …` | 5 | — |
| BP-1 | Browser probe BT-UI-001..007 | AC-001/003/004/005, QR-002 | Nuxt + Chrome, production panel | `test:e2e:background-tasks-panel` | 6 | — |
| TP-1 | Raw CLI auto-background probe | UNK-001 | Raw SDK/CLI | `claude-auto-bg-probe.mjs` | 7 | Temporary |
| TP-3 | Raw CLI Monitor probe re-run | AC-002 | Raw SDK/CLI | designer probe `monitor` | 8 | Temporary |
| AE-U1 | Registry unit: live UNK-001 order | UNK-001 | Unit | registry test | 9 | Added |
| AE-L2..L5 | Live: failed/stopped/crash keep command; auto-background (UNK-001) | REQ-002, RU-1, RU-3 | Real CLI → server websocket | updated agent live file | 10 | Both CLIs |
| TP-2 | Temporary live probe: Stop right after the background Bash is announced | RU-2 | Real CLI → server websocket | temp vitest file | 10 | Temporary |
| DJ-1 | Isolated desktop: Claude agent background Bash row `Shell · <command>`, tooltip, expand, completed | SCN-001, AC-001, AC-003 | Packaged Electron + real server + real CLI | `isolated-app start --build` + browser-automation | 11 | — |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | RC-1 | 05:41 | Completed | contracts tests | pass | 9/9, 5/5 | Pass | `api-e2e-evidence/r1-contracts.log` | — |
| 2 | RC-2 | 05:42 | Completed | focused server unit | pass | 925 passed; 2 failed in `team-execution-view-projector` (`agent_input_states`, `recoverableBlock`; file untouched; pre-existing per baseline comparison) | Pass | `api-e2e-evidence/r2-server-focused.log` | — |
| 3 | RC-3 | 05:43 | Completed | focused web | pass | 221/221 | Pass | `api-e2e-evidence/r3-web-focused.log` | — |
| 4 | AE-L1, AE-T1 | 05:46 | Completed | live Claude agent + team (PATH 2.1.283, SDK-bundled) | command reaches agent and team streams | 11/11 | Pass | `api-e2e-evidence/r4-claude-live-e2e.log` | — |
| 5 | TP-1 | 05:46 | Completed | raw probe `auto-bg`, `auto-bg-long` + `CLAUDE_AUTO_BACKGROUND_TASKS=1` | reveal UNK-001 order | without switch: timeout kills; with switch: task_started(fg, tool_use_id) → background_tasks_changed → task_updated(bg) | Pass (informational) | `api-e2e-evidence/probe-auto-bg.log`, `probe-auto-bg-env.log` | Added AE-U1, AE-L5 |
| 6 | BP-1 | 05:47 | Completed | browser probe | BT-UI-001..007 pass | Pass; collapsed 16px mono line, scrollWidth 1315 > clientWidth 231; expanded 96px no overflow | Pass | `api-e2e-evidence/browser-probe/` | — |
| 7 | AE-U1 | 05:48 | Completed | registry + tracker unit | pass | 64/64 | Pass | `api-e2e-evidence/r7-registry-unit.log` | — |
| 8 | TP-3 | 05:49 | Completed | designer probe `monitor` (CLI 2.1.283) | tool_use(Monitor, input.command) id = task_started.tool_use_id | matches | Pass | `api-e2e-evidence/probe-monitor-rerun.log` | — |
| 9 | AE-A1 | 05:52 | Completed | live AGY | command === description | 5/5; running snapshots carry command = commandLine | Pass | `api-e2e-evidence/r5-agy-live-e2e.log`, `agy-live/` | — |
| 10 | AE-L2..L5, TP-2 | 05:50 | Started | updated live agent file + temp probe | — | running | — | `api-e2e-evidence/r8-claude-live-e2e-updated.log` | — |
| 11 | DJ-1 | 05:50 | Started | `isolated-app start --build` | — | build in progress | — | `api-e2e-evidence/isolated-build.log` | — |
| 12 | AE-L2..L5 | 05:53 | Completed | both CLIs (2.1.283, 2.1.280) | failed/stopped/crash keep the command; auto-backgrounded Bash has its command from the first snapshot | 12/12 durable pass | Pass | `r8-claude-live-e2e-updated.log` | — |
| 13 | TP-2 | 05:54 | Completed | temp vitest, Stop on the bg Bash TOOL_EXECUTION_STARTED | any listed task carries the exact command | both CLIs: task listed (null → command), interrupted, stopped with the command kept | Pass | `stop-probe.jsonl` | Temp file removed |
| 14 | DJ-1 | 05:55 | Checkpoint | instance `iso-64531-f7fc` ready (control 64531) | — | packaged build ok | — | `isolated-start.json` | — |
| 15 | DJ-1 | 05:58 | Completed | Claude Agent SDK / haiku, background Bash prompt | Running row `Shell · <cmd>`; completed keeps it; click expand/collapse | As expected; metrics in `dom-evidence.json` | Pass | `desktop-journey/` | Instance stopped, data root removed |

## Re-entry And Reconciliation

- Last durably recorded event: 15
- Last completed case and result: DJ-1 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: none (handoff)
- Interruption, context-compression, or rerun note: —
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` §Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: —
