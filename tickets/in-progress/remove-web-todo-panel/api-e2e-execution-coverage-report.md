# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-spec.md` (SR-006)
- Supplemental Task Artifacts: `solution-handoff.md`, `probes/agy-daemon-exit-signal-probe.py`, `probe-evidence/p3-*.log`, `probe-evidence/p4-*.log`, `implementation-evidence/background-tasks-panel/`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/code-review-revision-record.md`
- Delivery Revision Record: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: `/code_reviewer` pass for IR-001 (CRR-001), 2026-09-29; commit `05b41091c` on base `43b6fc0f4`.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/api-e2e-evidence/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable test code added and updated)

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with two in-flight corrections below.
- Existing coverage decisions revised during execution, with evidence:
  - The planned live foreground-subagent and background-subagent cases were withdrawn. AutoByteus disallows Claude's `Agent`, `Task` and `Workflow` tools and does not enable `Monitor` (`autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:92-98`). Run 1 of those cases showed no Agent tool call at all (`l-cl-claude-live-run1.log`). They were replaced by the reachable foreground task: a foreground Bash command, which the CLI reports with task frames (OBS-002).
  - Two test-side corrections, both before any finding: the team fixture used a removed GraphQL field (`refType`), and the team case first read the terminal snapshot before its summary snapshot arrived. Neither changed source code.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (UI-06 checkpoint, event 23, resolved by event 24)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 31 (cleanup)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 contracts | Pass | 1 | `r01-contracts.log` | — |
| R-02 focused server suites | Pass (baseline failure only) | 2, 3 | `r02-server-focused.log` | `codex-tool-log-correlation.test.ts` fails identically on base `43b6fc0f4` |
| R-03 web specs | Pass | 4 | `r03-web-focused.log` | — |
| R-04 localization | Pass | 5 | `r04-web-localization.log` | — |
| R-05 AC-003 audit | Pass | 6 | `r05-static-audit.log` | — |
| R-06 typecheck | Pass | 28 | `r06-server-typecheck.log` | — |
| R-07 gated files skip | Pass | 29 | `r07-gated-skip-and-transport.log` | — |
| R-08 browser probe | Pass | 30 | `r08-browser-probe/` | — |
| P-01 raw Claude frames | Pass (observations) | 7 | `p01-claude-tools.log`, `p02-claude-*.log`, `p03-claude-workflow.log` | OBS-001, OBS-002 |
| L-CL-01 AC-007/008 live | Pass ×2 CLIs | 16 | `l-cl-claude-live-run2.log` | — |
| L-CL-02 failing command | Pass ×2 | 16 | same | — |
| L-CL-03 foreground work no entry | Pass ×2 | 16 | same | replaces the foreground-subagent case |
| L-CL-04 background subagent kind | N/A (withdrawn) | 9 | `l-cl-claude-live-run1.log` | unreachable in AutoByteus (OBS-002) |
| L-CL-05 Stop keeps running; terminate → stopped | Pass ×2 | 16 | same | — |
| L-CL-06 CLI kill → stopped | Pass ×2 | 16 | same | — |
| L-TM-01 team member + team terminate | Pass | 18 | `l-tm-claude-team-run3.log` | runs 1–2 were test-side errors |
| L-AGY-01..05 | Pass (5/5) | 11–15 | `l-agy-live-run1.log`, `l-agy/*.json` | — |
| UI-01 / UI-01b Codex | Pass | 19, 27 | this report | — |
| UI-02 / UI-02b Claude | Pass | 20, 25 | this report | — |
| UI-03 tree terminate | Pass | 21 | this report | — |
| UI-04 running-agents terminate | N/A (surface not mounted) | 22 | — | — |
| UI-05 team member isolation | Pass | 26 | this report | — |
| UI-06 AGY rendering and no switch | Pass | 24 | this report | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The live streams never carried `TODO_LIST_UPDATE`, and the static audit is clean.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (`Not Affected`). The list is empty after a page reload (observed; DEC-005).
- Durable coverage added or retained only for compatibility-only behavior: `No`. The two contract rejection tests are removal guards.
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R-01..R-08 | AC-001..006, AC-012, REQ-004/005 | Contracts, server rules, web store/panel, localization | Repository suites, static audit, browser probe | Durable | Pass | `r0*` logs |
| P-01 | RR-003, CAND-001, AC-010 | Claude CLI frames (SDK 0.3.280 / CLI 2.1.280) | SDK `query()` probe | Temporary | Pass | `p0*` logs |
| L-CL-01 | AC-007, AC-008, BEH-006, REQ-008 | CLI → registry → session → converter → websocket | Live Claude harness, PATH 2.1.283 + bundled 2.1.280 | Durable (gated) + Live | Pass | `l-cl-claude-live-run2.log` |
| L-CL-02 | AC-008 alt | same | same | Durable + Live | Pass | same |
| L-CL-03 | REQ-008 / AC-010 intent | same | same | Durable + Live | Pass | same |
| L-CL-05 | MP-003, AC-011 | interrupt vs terminate | same | Durable + Live | Pass | same |
| L-CL-06 | AC-011, REQ-009 | process exit | same, SIGKILL | Durable + Live | Pass | same |
| L-TM-01 | AC-009, AC-011 | collaboration adapter → team projector → team websocket | Real server GraphQL + `/ws/agent-team` | Durable + Live | Pass | `l-tm-claude-team-run3.log` |
| L-AGY-01..05 | AC-013 (a)(b)(c), non-daemon, CAND-007 | AGY converter → monitor → message files → websocket | Real server GraphQL + `/ws/agent`, agy 1.2.13 | Durable + Live | Pass | `l-agy/*.json` |
| UI-01..06 | AC-001, AC-002, AC-007, AC-008, AC-009, AC-011, AC-012, AC-013, REQ-010 | Rendered renderer with a real server | `pnpm dev` + browser (DOM assertions) | Browser | Pass (UI-04 N/A) | this report |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `RUN_CLAUDE_E2E=1 npx vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts --no-watch` | `autobyteus-server-ts` | L-CL-* | Pass 10/10 (run 2) | `l-cl-claude-live-run2.log` |
| 2 | `RUN_CLAUDE_E2E=1 npx vitest run tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts --no-watch` | `autobyteus-server-ts` | L-TM-01 | Pass (run 3) | `l-tm-claude-team-run3.log` |
| 3 | `RUN_AGY_BACKGROUND_E2E=1 AGY_BACKGROUND_EVIDENCE_DIR=<evidence>/l-agy npx vitest run tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts --no-watch` | `autobyteus-server-ts` | L-AGY-01..05 | Pass 5/5 | `l-agy-live-run1.log`, `l-agy/` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | +20 | Every AC has direct live proof. AC-010's literal trigger (foreground subagent) cannot occur in AutoByteus, so its intent is proven live with foreground Bash and at the raw-frame level with a real foreground subagent (P-01) | AC-010 literal trigger unreachable (OBS-002) |
| Changed-boundary execution directness | 75% | 96% | +21 | Real CLIs, real AGY, real server GraphQL/websocket, real renderer | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | Dev stack with a real backend; single, team and AGY streams rendered; a second websocket subscriber correlated tab behavior with stream timing | Packaged Electron shell not run (no shell change) |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | PATH Claude 2.1.283 and SDK-bundled 2.1.280; AGY 1.2.13; Codex 0.159.0; standalone env (parent Claude Code vars stripped) | Windows and other AGY versions untested (RR-004, accepted) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | +20 | failed (Claude and AGY), Stop keeps running, terminate → stopped (single, team, AGY, history tree), SIGKILL → stopped, non-daemon no entry, large-output daemon, stopped snapshot received before the terminate mutation response | The oversize (>64 KiB) exit-message path is unit-only: AGY truncates output (CAND-007 unreachable by output size) |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Empty state, accordion, counts, newest first, Running/Completed/Failed/Stopped rows, summaries, no tab switch (Claude and AGY, 100 ms sampling), team member isolation, Codex turn, history-tree terminate | Live screenshots blank in the agent browser (DOM assertions used; probe screenshots cover visuals); running-agents panel is not mounted |
| Durable regression coverage quality and relevance | 85% | 94% | +9 | Three gated live files (18 tests) at the AgentRun/websocket boundary, plus unit and probe coverage | Live files run only with opt-in flags and local logins |

- Overall post-repository confidence: 76%
- Overall final confidence: 95% (simple average: 95.0)
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +19
- Every critical acceptance criterion directly proven: `Yes` (AC-010 through its reachable form; see residuals)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: OBS-002 (requirement premise and docs wording), RR-004 (AGY format and Windows), the oversize-message path unit-only.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required` — live API (gated server E2E against real Claude and AGY), browser on the `pnpm dev` stack, and the temporary raw-frame probe.
- Material deviation from the planned mode or rationale: none. The live screenshots were blank in the agent browser, so assertions are DOM text and state, as TESTING.md rule 6 prefers. The repository probe's screenshots (R-08) provide the visual evidence.
- Confidence gap or residual risk actually addressed: real frames and files, real stream payloads, terminate/kill ordering (RR-001), rendered UI with real data, RR-003/CAND-001, CAND-007.
- Startup order, commands, and readiness results:
  - Live suites started their own servers.
  - `pnpm dev` was started with the parent Claude Code variables unset. Both `DEV_SERVER_READY http://127.0.0.1:8000` and `DEV_WEB_READY http://127.0.0.1:3000` were reported.
- Environment choices that materially affected the run:
  - Models: Claude `haiku`, AGY `gemini-3.8-flash-high`, Codex `gpt-5.5`.
  - The dev stack also lists the user's local agent-package folders (read-only). The test definitions were created in the dev-owned built-in storage.
- Seed data, fixtures, identities: agent definitions `bg-tasks-validation-agent` and `bg-tasks-peer-agent`, and team `bg-tasks-validation-team` (dev-owned). Local CLI logins were used.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| UI-01 Codex run, Activity tab | Section in the former To-Do slot; 0 counts; Activity expanded; accordion; empty state; no To-Do | `Background Tasks / 0 running · 0 total` above `Activity / 1 Events` (feed visible). Clicking the section shows "No background tasks" and collapses Activity; clicking Activity restores it. No To-Do text | DOM text | Pass |
| UI-01b Codex real turn | No to-do or background event | Stream types limited to CONNECTED, AGENT_STATUS, SYSTEM_INSTRUCTIONS_SUPPLIED, TURN_*, SEGMENT_*, TOKEN_USAGE_UPDATED. Counts `0 · 0`; reply "OK" | Websocket log + DOM | Pass |
| UI-02 Claude bg `sleep 20` from the composer, panel on Files | No switch; running 1/1 Shell; later Completed + summary; notice + Claude turn | Files kept through the turn. Activity showed `1 running · 1 total`, row `sleep 20; … / Running / Shell` with full text in `title`. Later `0 running · 1 total`, `Completed`, summary `Background command "sleep 20; echo done > …/marker" completed (exit code 0)`. Chat: `Background task completed: … (completed)`, then Read → `done` | DOM | Pass |
| UI-02b fresh Claude run, 100 ms tab sampling + websocket log | No switch across all task events | Files for 51 s. Stream: running 2.81 s (mid-turn), TURN_COMPLETED 3.68 s + AGENT_STATUS idle, completed ×2 at 22.85 s, then Claude-initiated turn with SYSTEM_TASK_NOTIFICATION | Observer + websocket log | Pass |
| UI-03 second task `sleep 150`, then history-tree Terminate | Newest first; Stopped | `1 running · 2 total` with the new task above the completed one. After Terminate: `Stopped` within 0.5 s; `0 running · 2 total`. Server `isActive=false`; child process gone; Codex run unaffected | DOM + GraphQL + `pgrep` | Pass |
| UI-04 running-agents panel terminate | — | `RunningAgentsPanel.vue` is not mounted anywhere in the app | Source grep | N/A |
| UI-05 Claude team, worker bg `sleep 45` | Only the worker's Activity lists it | Worker: `1 running · 1 total`, then `Completed · Shell · Background command "sleep 45; echo TEAM_WORKER_DONE" completed (exit code 0)`. Peer: `0 running · 0 total` | DOM | Pass |
| UI-06 AGY daemons | Running at turn end; completed/failed; no switch | Stream: running right after TURN_COMPLETED + AGENT_STATUS idle (status stays idle); completed at 30.2 s for a 25 s daemon; no switch in 78 s. Exit-3 row: `Failed · Shell · The command exited with code 3. Output: UI_FAILING` | Observer + websocket log + DOM | Pass |
| Reload mid-session | List empty after reload (DEC-005) | `0 running · 0 total` after reload | DOM | Pass (accepted behavior) |

Notes on two first-attempt observations:
- In the first AGY attempt, the panel showed Activity when it was expected to stay on Files. The controlled reruns (UI-06, UI-02b) show that no background-task event switches tabs. The earlier appearances match the pre-existing run-selection watch in `RightSideTabs.vue` (`activeMessagesScopeKey` → `progress` for standalone agents), which fires when a run is selected. This behavior is preserved by REQ-010.
- The exit-3 row appeared about 38 s after send in one sample. AGY wrote its exit message 11 s after send (message-file timestamp). The late reading comes from background-tab timer throttling in the agent browser; websocket-timestamped runs show completion at daemon exit.

## Desktop Application Validation (When Applicable)

- Validation approach executed: web-equivalent renderer on `pnpm dev`; no desktop-shell change in scope.
- Effect on any already-running desktop application: None. Another user's isolated instance (`iso-52986-06a5`) was not touched.
- Behavior not directly proven: packaged Electron rendering (no shell change; negligible).

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0), arm64
- Runtimes:
  - Node 22.21.1
  - Claude Agent SDK 0.3.280, with CLIs 2.1.280 (bundled) and 2.1.283 (PATH)
  - AGY CLI 1.2.13
  - Codex CLI 0.159.0
- Browser: agent browser tab (Chromium). The repository probe uses headless Chrome through playwright-core.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: N/A. After a reload the list starts empty, as designed.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Updated | AC-007, AC-008 (+ failing), REQ-008/AC-010 intent, MP-003, AC-011 (terminate and kill); BEH-006 preserved | 10/10 Pass (×2 CLIs) | Gated `RUN_CLAUDE_E2E=1`; the existing notice/turn assertions are kept |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts` | Added | AC-009, AC-011 (team terminate) | Pass | Gated `RUN_CLAUDE_E2E=1` |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | Added | AC-013 (a)(b)(c), non-daemon no entry, large-output fail-safe | 5/5 Pass | Gated `RUN_AGY_BACKGROUND_E2E=1`; writes JSON evidence to `AGY_BACKGROUND_EVIDENCE_DIR` |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: the three paths above (uncommitted in the worktree)
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/r0*.log`, `r08-browser-probe/` | Repository runs | Retained | — |
| `api-e2e-evidence/p0*.log` | Raw Claude frame captures | Retained | No secrets |
| `api-e2e-evidence/l-cl-*.log`, `l-tm-*.log`, `l-agy-live-run1.log`, `l-agy/*.json` | Live run logs and payload evidence | Retained | Includes run-1 failures kept for traceability |
| `api-e2e-evidence/ui-dev-stack.log` | Dev stack log | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/probes/claude-task-frame-probe.mjs` | Raw frames below the AutoByteus boundary (RR-003) | P-01 | Retained as evidence (ticket folder only) |
| Dev stack + browser journeys | Rendered behavior with a real backend | UI-01..06 | Stopped; `.autobyteus/development` removed |
| In-page tab observer + second websocket subscriber | Correlate tab changes with stream timing | UI-02b, UI-06 | Closed with the tab |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| None in the live and UI cases | — | — | The repository browser probe (R-08) uses a mocked backend by design |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01..R-08, P-01, L-CL-01/02/03/05/06, L-TM-01, L-AGY-01..05, UI-01, UI-01b, UI-02, UI-02b, UI-03, UI-05, UI-06 | All approved behavior proven directly |
| Out Of Scope / N/A | L-CL-04, UI-04 | Unreachable product surfaces: Claude subagent tools are disallowed in AutoByteus; `RunningAgentsPanel` is not mounted |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Live-suite servers, temp app-data dirs, definitions, runs | This run | Suite `afterAll` | Done |
| Dev runs and team (Codex, AGY, 2× Claude, team) | This run | `terminateAgentRun` ×3 / `terminateAgentTeamRun` (the tree already terminated one Claude run) | `success: true` |
| `pnpm dev` stack | This run | SIGINT to `run-dev.mjs` (Ctrl+C) | Ports 8000/3000 free; no processes left |
| `.autobyteus/development`, `/tmp/bgtasks-ui` | This run | `rm -rf` | Removed |
| `~/.claude/projects/*` transcript dirs for this run's temp workspaces | This run (33 dirs, all created after 19:59:58) | Removed | 0 left |
| Stray `sleep`/`http.server` processes | This run | Suite cleanup; checked with `pgrep` | None left |
| Browser tab | This run | `close_tab` | Closed |
| AGY brain conversations under `~/.gemini/antigravity-cli/brain/` from this run's AGY runs | AGY history | Left in place, as AGY's own conversation history (same as prior tickets) | Retained |

## Preliminary Classification

N/A — result is `Pass`.

Non-blocking observations for downstream owners:
- **OBS-002 (Solution Designer / delivery docs sync).** In AutoByteus, Claude can start only background shell commands. `Agent`, `Task` and `Workflow` are disallowed, and `Monitor` is not enabled (`claude-sdk-client.ts:92-98`). The requirement premise and SCN-003 mention subagents, monitors and workflows, and AC-010's trigger is a foreground subagent; none of these can occur. The implementation is correct for them (P-01 raw frames + unit tests), but the web docs (`autobyteus-web/docs/agent_execution_architecture.md:1642`, `autobyteus-web/docs/settings.md:1544`) say the list shows "Claude background shells, subagents, monitors and workflows". Delivery docs sync should state that Claude entries are background shell commands. No requirement change is needed unless the product intends to enable those tools.
- **OBS-001.** Informational only: with the raw SDK, the `Monitor` tool reports `task_type: local_bash`, so it would show as Shell.
- **CAND-001.** No `ambient` or internal task types (`dream`, `auto_mode_scan`, `mcp_task`, `in_process_teammate`, `remote_agent`) appeared in any probe or live run.
- **CAND-007.** AGY 1.2.13 truncates daemon output in its exit message (200 KB of output produced an 11.5 KB file), so the task ends `completed`. The > 64 KiB fail-safe is unit-covered only.
- **RR-001.** Confirmed: the stopped snapshot had already been received when the `terminateAgentRun` HTTP response arrived (AGY). The history-tree terminate rendered `Stopped` in the UI.

## Recommended Recipient

`/code_reviewer` — proportional test-code review of the three durable test files (confirm with `get_handoff_rules`).

## Evidence / Notes

- Raw task frames (P-01, SDK-bundled CLI 2.1.280):
  - background subagent → `local_agent`;
  - Workflow tool → `local_workflow`;
  - Monitor tool → `local_bash`;
  - a foreground subagent is never in the background set (`task_started is_backgrounded:false`, then `task_updated completed`, then `task_notification`);
  - a failing background Bash gives `task_updated {status: failed}`, then `task_notification` "failed with exit code 3".
- The registry's kind table matches every observed raw value.
- AGY payload evidence:
  - (a) completed 18.0 s after the turn ended, summary "The command exited with code 0.…";
  - (b) failed, summary "The command exited with code 3.\nOutput:\nFAILING";
  - (c) stopped, and the daemon port was freed.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (live API + browser on the dev stack + raw-frame probe)
- Critical acceptance criteria lacking direct proof: none. AC-010 is proven in its reachable form; its literal trigger is unreachable (OBS-002).
- Next recipient from `get_handoff_rules`: `/code_reviewer` (expected)
- Notes: Classification preserved (`Large`/`High`). The durable test changes are uncommitted in the worktree for review.
