# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/requirements-doc.md` (Approved; SR-004 content, approval SR-005)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-spec.md` (SR-006)
- Supplemental Task Artifacts: `solution-handoff.md`, `probes/agy-daemon-exit-signal-probe.py`, `probe-evidence/p3-agy-daemon-exit-signal.log`, `probe-evidence/p4-agy-daemon-failure-signal.log`, `implementation-evidence/background-tasks-panel/evidence.json`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` pass handoff for IR-001 (CRR-001, round 1), 2026-09-29. Commit `05b41091c` on base `43b6fc0f4`.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `1`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable test code will change)

## Current Requirement And Design Basis

- Remove the to-do path end to end: no event, message, contract, store, handler or panel (REQ-001, REQ-003; AC-001, AC-003, AC-004).
- A `Background Tasks` section replaces the To-Do section in place, with the same accordion (Activity expanded by default), a "No background tasks" empty state, running/total counts, newest first, and no tab switch (REQ-002, REQ-010; AC-002, AC-007, AC-012).
- Claude: each task in the CLI background set is shown as running with description and kind, and ends as completed/failed/stopped with the summary. Foreground work is never listed. Tasks still running when the process ends become stopped; a turn-level Stop leaves them running (MP-003). Notices and Claude-initiated turns are unchanged (REQ-006..009; AC-007..011; BEH-006).
- Antigravity: a daemon still open at turn end is shown as running, then completed (exit 0) or failed (non-zero) from AGY's message files within about 2 s, or stopped when AGY stops. Unreadable reports fail safe to stopped (REQ-011; AC-013).
- The new `BACKGROUND_TASK_UPDATED` event is a per-task upsert, not turn activity, and not persisted (design DS-001..DS-004; Persisted Data `Not Affected`).
- Residual risks handed over for live evidence: RR-001 (terminate-time ordering), RR-003 + CAND-001 (raw `task_type` values; ambient/internal types), RR-004 + CAND-007 (AGY format; > 64 KiB exit messages).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 To-Do section → Background Tasks section | Changed | REQ-001/002, DEC-004 | Web specs + rendered UI with real server data |
| BEH-002 to-do event removed; Codex plan delta no event | Removed | REQ-003, AC-003/004 | Contract tests, Codex converter rows, static audit |
| BEH-003 auto-switch removed | Removed | REQ-010, DEC-006 | RightSideTabs spec + live UI observation |
| BEH-004 Activity feed | Preserved | REQ-004 | Existing specs; UI observation |
| BEH-005 Claude background tasks | Added | REQ-006..010 | Unit + **live Claude** (single and team) + UI |
| BEH-006 notice + Claude-initiated turn | Preserved | REQ-004, AC-008 | Live Claude asserts notice and turn |
| BEH-007 AGY daemons | Added | REQ-011, AC-013 | Unit + **live AGY** through the real server + UI |
| `BACKGROUND_TASK_UPDATED` contract (single + team streams) | Added | DS-001 | Contract tests + live websocket payload checks |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Claude registry rules; AGY monitor/reader; domain builder/parser | Unit tests with fixtures | Real CLI frame order/values; real AGY files and timing | Live Claude / live AGY |
| API / transport / contract | Yes | New event through mapper, adapter, projectors, both Zod contracts, websocket | Contract + projector unit tests | Real websocket payloads for single and team member streams | Live websocket (server E2E) |
| Frontend component / state | Yes | Store, handler, panel, ProgressPanel, RightSideTabs | Web specs; browser probe with mocked backend | Rendering of real server-driven streams | Browser on the dev stack |
| Browser integration / user journey | Yes | Right-panel Activity tab journey | Browser probe (mock backend) | Real run selection, team member tabs, terminate actions (RR-001) | Browser on the dev stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as the browser | As above | As above | Browser (web-equivalent) |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | None |
| Process / lifecycle | Yes | Claude process exit/terminate → stopped; AGY stop/terminate → stopped; poll timer | Unit lifecycle tests | Real process kill/terminate timing | Live Claude/AGY lifecycle cases |
| Persisted-data transition | No (`Not Affected`) | Accumulator default branch | Unit | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Claude CLI frames (SDK 0.3.280 / CLI 2.1.280 and PATH 2.1.283); AGY 1.2.13 message files | Fixtures from probes | Live values and timing | Live probes and E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel`
- Project type and runtime stack: pnpm monorepo; Node 22; server `autobyteus-server-ts` (Fastify, GraphQL, websocket, Vitest); web `autobyteus-web` (Nuxt 3, Pinia, Vitest, Electron shell); contract packages (Zod, node:test).
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/TESTING.md` (no closer `TESTING*.md` under the changed packages).
- Conflicting, missing, or unclear project instructions: `timeout` is not available on this macOS shell (not a project instruction). Server `pnpm typecheck` fails on baseline (TS6059), so `tsc -p tsconfig.build.json --noEmit` is used, as the implementation handoff recorded.
- Required environment variables or secrets available: `Yes` for live runtimes through the local CLI logins (`claude` 2.1.283 on PATH plus the SDK-bundled 2.1.280; `agy` 1.2.13; `codex` 0.159.0). No secret values are read or recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Workspace testing guideline | Server tests for runtimes; web unit tests + browser probe for renderer; isolated instance or `pnpm dev` for full journeys; never test the user's running app; stop what you start; assertions first |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `vitest run <path> --no-watch` |
| `autobyteus-web/AGENTS.md` | Web test commands | `test:nuxt … --run`; never `git add .` |
| `README.md#local-full-stack-development` | Dev stack | `pnpm dev`: backend `127.0.0.1:8000`, frontend `127.0.0.1:3000`, state under `<repo>/.autobyteus/development`; Ctrl+C to stop; `rm -rf .autobyteus/development` resets |
| `docs/isolated-app-instances.md` | Isolated desktop instance | Needs a packaged worktree build; another user's instance (`iso-52986-06a5`) is running and must not be touched |
| `tests/e2e/helpers/claude-live-agent-harness.ts`, `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Existing gated live Claude harness | `RUN_CLAUDE_E2E=1`; runs per CLI candidate; strips parent Claude Code env |
| `tests/e2e/runtime/agy-background-task-live.e2e.test.ts`, `tests/e2e/helpers/studio-runtime-test-server.ts` | Existing gated live AGY suite through the real server | `RUN_AGY_BACKGROUND_E2E=1`; temp app-data dir; GraphQL `createAgentRun`/`terminateAgentRun`; websocket `/ws/agent/<runId>` |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Live Claude team pattern | Team definition + `createAgentTeamRun` + `/ws/agent-team/<teamRunId>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E runtime server (live suites) | `autobyteus-server-ts` | started inside the test (`startStudioE2eRuntimeServer`) | temp app-data dir, random port | test `beforeAll` | test `afterAll` (terminate runs, delete definitions, remove temp dir) |
| Claude live harness | `autobyteus-server-ts` | inside the test | real CLI; temp workspace | socket open | harness close + temp dir removal |
| Dev stack | repo root | `pnpm dev` (background) | ports 8000/3000 (verified free); `.autobyteus/development` | `DEV_SERVER_READY`/`DEV_WEB_READY` + HTTP | stop the owned process; remove `.autobyteus/development` if created by this run |
| Browser | — | agent browser tools (`open_tab`) | tab on `http://127.0.0.1:3000` | DOM snapshot | `close_tab` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/team definitions | GraphQL mutations in tests / UI in the dev stack | test-owned or dev-stack DB only | deleted in `afterAll`; dev state removed |
| Claude/AGY/Codex auth | Local CLI logins under the user's home (as the product uses them) | read-only use; no production AutoByteus data touched | none |
| Claude CLI project transcripts | Written by the CLI under `~/.claude/projects/<temp-workspace-slug>` | created by this run only | remove the dirs for this run's temp workspaces |
| AGY brain conversations | Written by `agy` under `~/.gemini/antigravity-cli/brain/<id>` | created by this run only | left in place (AGY-owned history, same as previous tickets); listed in report |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: none required; the event is live-only (DEC-005).
- Evidence planned: live AGY run projection still shows the daemon row unchanged (existing live assertions); no migration.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: No.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Live bg Bash keeps running after the turn; notice + Claude-initiated turn | BEH-006, AC-008 | Needs Update | Does not assert `BACKGROUND_TASK_UPDATED` | Extend with AC-007/008/010/011, MP-003, failing command, bg subagent kind |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts` | AGY daemon liveness, stop/terminate kills daemon, tool text | Prior ticket; BEH-007 preserved text | Still Valid | Assertions unaffected | Run as regression for the unchanged tool text and stop cleanup only if time permits; new AC-013 file instead |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` | AGY background transport (fake process) | Prior ticket | Still Valid | — | Run as regression |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Live team send_message_to | Out of scope behavior | Out Of Scope | — | Pattern reuse only |
| Unit suites listed in the implementation handoff (registry, session, converter, monitor, reader, converter, lifecycle, adapter, contracts, web specs) | DS-001..004 rules | All ACs at unit level | Still Valid | R-02/R-03 pass | Keep |
| `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs` | Rendered panel with mocked backend | AC-001/002/012 | Still Valid | Implementation evidence | Rerun as regression |
| `autobyteus-agent-presentation-contracts/tests/agent-presentation-contracts.test.mjs:28`, `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs:146` | Removed type is rejected | AC-003 | Still Valid | Regression guards, not compatibility | Keep |

## Stale Or Obsolete Coverage Decisions

None beyond the implementation's deletion of `todoHandler.spec.ts` (obsolete to-do handler; no replacement needed; the handler is deleted).

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| L-TM-01 | Team member routing of real Claude snapshots; team terminate → stopped | AC-009, AC-011 | `autobyteus-server-ts/tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts` | Only unit/adapter tests cover team routing; a live gated case protects the real team stream |
| L-AGY-01..04 | AGY daemon completed/failed/stopped; non-daemon no entry | AC-013 | `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | The undocumented AGY format (RR-004) needs a rerunnable live check on AGY upgrades |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| L-CL-01..06 | `claude-agent-background-task.e2e.test.ts` | Assert running → completed snapshots around the existing notice; add failing command, foreground-work no-entry, Stop-then-terminate, and process-kill cases | AC-007, AC-008, REQ-008/AC-010 intent, AC-011, MP-003 | Gated `RUN_CLAUDE_E2E=1`, per CLI candidate. **Revised during execution:** the planned foreground-subagent and background-subagent cases were withdrawn because AutoByteus disallows Claude's `Agent`/`Task`/`Workflow` tools and does not enable `Monitor` (`claude-sdk-client.ts:92-98`); the reachable foreground task (foreground Bash, which the CLI reports with `task_started is_backgrounded:false` + `task_notification`) replaces the AC-010 live case. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-agent-presentation-contracts test && pnpm -C autobyteus-team-stream-contracts test` | repo root | Contracts; dist unchanged | Pass | `api-e2e-evidence/r01-contracts.log` |
| 2 | `npx vitest run tests/unit/agent-execution/backends/{claude,antigravity,codex} tests/unit/agent-execution/{domain,events} tests/unit/services/agent-streaming tests/unit/agent-collaboration tests/unit/agent-team-execution/team-agent-background-task-admission.test.ts --no-watch` | `autobyteus-server-ts` | Server rules and projections | Pass (75 files / 826 tests; only the pre-existing Codex file fails, verified on baseline) | `api-e2e-evidence/r02-server-focused.log` |
| 3 | `NUXT_TEST=true npx vitest run stores/__tests__/agentBackgroundTaskStore.spec.ts services/agentStreaming components/progress components/layout/__tests__/RightSideTabs.spec.ts localization/messages/__tests__/backgroundTaskPanelCatalog.spec.ts` | `autobyteus-web` | Web store/handler/panel/streaming | Pass (29 files / 216 tests) | `api-e2e-evidence/r03-web-focused.log` |
| 4 | `pnpm guard:localization-boundary`, `pnpm audit:localization-literals` | `autobyteus-web` | AC-006 | Pass | `api-e2e-evidence/r04-web-localization.log` |
| 5 | `git grep -E "TODO_LIST_UPDATE|agentTodoStore|todoHandler|TodoListPanel|types/todo|TURN_TASK_PROGRESS_UPDATED|ITEM_PLAN_DELTA|taskProgressUpdated"` | repo root, active packages | AC-003 | Pass | `api-e2e-evidence/r05-static-audit.log` |
| 6 | `npx tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | Build typecheck | Pass | `api-e2e-evidence/r06-server-typecheck.log` |
| 7 | `npx vitest run <3 new/updated gated files> tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` (no flags) | `autobyteus-server-ts` | Gated files skip cleanly in normal runs | Pass (18 skipped) | `api-e2e-evidence/r07-gated-skip-and-transport.log` |
| 8 | `pnpm -C autobyteus-web test:e2e:background-tasks-panel -- --output-dir …` | `autobyteus-web` | Rendered panel regression (mock backend) | Pass | `api-e2e-evidence/r08-browser-probe/` |

## Test-Case Ledger Plan (When Applicable)

- Ledger required: `Yes` — many independent cases and long live runs (1–10 min each); compression risk.
- Canonical ledger path: `tickets/in-progress/remove-web-todo-panel/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one scenario/journey/probe per case.
- Planned cases: see the ledger's "Planned Cases" (R-01..R-06, P-01, L-CL-01..06, L-TM-01, L-AGY-01..05, UI-01..06).

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Every AC has unit coverage; AC-003/004/006 fully proven | AC-007/008/009/011/013 proven only with fixtures and fakes | Live Claude, team and AGY runs |
| Changed-boundary execution directness | 75% | Registry, monitor, projectors and store exercised directly | Real CLI and AGY boundaries untouched by repository tests | Live runs through the real server and websocket |
| Cross-boundary integration realism and mock gap | 70% | Contract round-trips; browser probe with the production projector | No real server-to-web stream; AGY/Claude mocked | Dev-stack browser journeys |
| Environment, configuration, identity, and fixture fidelity | 80% | P3/P4 fixtures copied from real AGY files; P-01 raw frames match the registry's assumptions | Live timing and CLI versions | Live runs on both Claude CLIs and AGY 1.2.13 |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Unit tests for stop/terminate/exit/fail-safe | Real terminate/kill ordering (RR-001) | Live terminate and kill cases |
| User-surface, browser, and desktop-shell confidence | 75% | Browser probe with mock backend; component specs | Real runs, team member tabs, terminate actions | Dev-stack browser journeys |
| Durable regression coverage quality and relevance | 85% | Unit coverage maps to every AC | No live durable check for the new event | Gated live E2E additions |

- Overall post-repository confidence: 76% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-007, AC-008, AC-009, AC-011, AC-013 need live proof)
- Any applicable category below `90%`: `Yes` — all seven
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: RR-001, RR-003/CAND-001, RR-004/CAND-007, real-stream rendering.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (gated server E2E against real Claude and AGY), `Browser` on the `pnpm dev` stack for the web-equivalent renderer, and a temporary CLI probe (P-01).
- Specific confidence gap addressed: real CLI/AGY frames and files, real websocket payloads on single and team streams, real terminate and kill ordering, rendered UI with real server data.
- Why the selected mode can materially improve confidence: it exercises every changed boundary with the real external systems the fixtures stand in for.
- Expected confidence after the selected validation: ≥ 95% if all live cases pass.
- Browser-specific decision and rationale: Required. The change is renderer + server; the dev stack runs the same renderer the desktop app uses. No desktop-shell code changed, so an isolated packaged build is not needed.
- If `Blocked`: N/A.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron (unchanged by this package).
- Testing guideline used: `TESTING.md` "Renderer UI, stores, client–server behavior that also runs in a browser → web unit tests + a browser dev-path probe"; "For a real local stack use `pnpm dev`".
- Web-equivalent behavior: all UI behavior in scope.
- Shell-specific or lifecycle behavior: none.
- Chosen validation approach: `pnpm dev` in this worktree + browser tab.
- Effect on any already-running desktop application: None (another isolated instance `iso-52986-06a5` exists and is not touched; ports 8000/3000 were free).
- Behavior not directly proven: packaged shell rendering (not changed).

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: live server suites start their own server; later `pnpm dev` in the background for the UI journeys.
- Environment choices: Claude model `haiku`; AGY model `gemini-3.8-flash-high` (same as the existing live suite); Codex default model for UI-01.
- Health / readiness checks: suite `beforeAll`; dev-stack ready markers and HTTP 200.
- Seed data / fixtures: agent/team definitions created through GraphQL or the UI.
- Test identities: local CLI logins.
- Requirement-linked journeys: ledger L-* and UI-*.
- Evidence to capture: websocket message lists and payloads (JSON), DOM snapshots and screenshots, process checks.
- Owned processes and temporary state to clean up: live suites (self-cleaning), dev stack, `.autobyteus/development`, browser tab, stray `sleep`/`http.server` processes started by the runs, `~/.claude/projects` dirs for this run's temp workspaces.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| P-01 | `api-e2e-evidence/probes/claude-task-frame-probe.mjs` (SDK `query()`, raw frames) | Raw `task_type` values; ambient/internal types; foreground vs background frames | It observes CLI internals below the AutoByteus boundary; durable coverage belongs at the AgentRun/websocket boundary |
| UI-* | Browser journeys on the dev stack | Rendering of real streams, tab behavior, terminate actions | The repo's browser probes use mocked backends; a real-runtime browser journey needs live model access and is not a durable CI test |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Windows AGY brain paths | No Windows host | RR-004 (accepted) | None |
| Packaged Electron shell | No shell change | Negligible | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| OBS-001: with the raw SDK, the Claude `Monitor` tool reports `task_type: local_bash` (kind `shell`). Moot inside AutoByteus because `Monitor` is not enabled there (OBS-002). | Non-blocking observation | `api-e2e-evidence/p02-claude-monitor.log` | Informational; no reroute |
| OBS-002: AutoByteus Claude sessions expose only `Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill` and explicitly disallow `Agent`, `Task`, `Workflow` (`claude-sdk-client.ts:92-98`). Background subagents, workflows and monitors (listed in the requirement premise, SCN-003 and DEC-003) and the "foreground subagent" trigger of AC-010 cannot occur in AutoByteus; only background shell commands can. The implementation handles the other kinds correctly (raw-frame probe P-01 and unit tests); the web docs say the list includes "Claude background shells, subagents, monitors and workflows". | Non-blocking requirement-premise and docs-accuracy observation. Approved behavior holds for every reachable task; nothing to fix in the implementation. | `api-e2e-evidence/l-cl-claude-live-run1.log` (no Agent tool call), `claude-sdk-client.ts:92-98`, `git diff … autobyteus-web/docs` | Delivery docs sync (REQ-005 wording); Solution Designer informed through the report |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated; none removed)
- Post-repository confidence: 76%
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The pre-existing `codex-tool-log-correlation.test.ts` failure reproduces on the baseline source and is not attributable to this package. Execution outcome and final confidence are recorded in `api-e2e-execution-coverage-report.md`.
