# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/requirements-doc.md` (Approved, SR-001 baseline, DEC-001 = A)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/solution-revision-record.md` (SR-002)
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/design-spec.md` (Ready)
- Supplemental Task Artifacts: `evidence/probe-bash-bg.log`, `evidence/probe-monitor.log`, `evidence/probes/claude-bg-command-probe.mjs` (evidence, not behavior-defining); `solution-handoff.md`
- Design Review Report: `N/A — not applicable` (direct Medium + Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: implementation_engineer direct-route handoff (commit `346765623`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

A runtime-neutral background-task snapshot (`BACKGROUND_TASK_UPDATED`) carries a required nullable `command` (REQ-001). The Claude registry takes it from the assistant `tool_use.input.command` named by `task_started.tool_use_id` (REQ-002). A command learned after the first snapshot fills the same row (REQ-007). AGY sets `command = commandLine` (REQ-003). The panel shows `<Kind> · <command>` in monospace on one truncated line, with a tooltip and click/keyboard expansion with `aria-expanded` (REQ-005, QR-002). It hides the command when it is null or blank (REQ-004) or equals the title (REQ-006). The correlation state is released on tool_result and in `clear()` (QR-001). Persisted data: `Not Affected` (live-only). No compatibility path: `command` is a required key everywhere.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (Claude background Bash), SCN-002 (Claude Monitor; see the reachability note below), SCN-003 (AGY daemon), SCN-004 (subagent/workflow/uncorrelated).
- Real-use scenarios added from investigating the implemented behavior:
  - RU-1 (UNK-001): a foreground Bash that the CLI moves to the background after it starts. Real trigger: an operator runs AutoByteus with the CLI's own `CLAUDE_AUTO_BACKGROUND_TASKS=1`, which passes through to the CLI because AutoByteus sets no CLI policy env (`claude-sdk-client.ts:268-273`, `resolveSpawnEnvironment`). Live CLI 2.1.283 order: tool_use → `task_started(is_backgrounded:false, tool_use_id)` → `background_tasks_changed` → `task_updated(is_backgrounded:true)` → tool_result (`api-e2e-evidence/probe-auto-bg-env.log`). Without the switch, a foreground Bash that times out is killed rather than backgrounded (`probe-auto-bg.log`).
  - RU-2: the user presses Stop in the turn that starts a background Bash (handoff edge case). Real trigger: an `INTERRUPT_GENERATION` from the composer Stop.
  - RU-3: the command persists when the task ends failed, ends stopped through run terminate, or ends stopped through a CLI crash (lifecycle of the same row).
- Designer scenarios recorded as contrived: None.
- Reachability observation (SCN-002): AutoByteus starts Claude with a fixed built-in tool list `["Bash","Read","Edit","Write","Glob","Grep","NotebookEdit","WebFetch","WebSearch","Skill"]` (`autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:92-94`, applied at `:403`). Monitor is not in that list, so a Monitor background task cannot occur in an AutoByteus run today. AC-002 is therefore proven at the registry boundary (unit test with the live probe frame shape) and at the raw CLI boundary (re-run raw SDK probe), not through the product. This is reported as a non-blocking observation to the Solution Designer. The implementation does not filter by tool name, so it covers Monitor automatically if the tool is ever enabled.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Claude background Bash command | Added | REQ-001/002/005/007, AC-001 | Registry unit + live Claude agent/team E2E + web component + browser probe |
| BEH-002 Claude Monitor command | Added | REQ-002, AC-002 | Registry unit + raw CLI probe (product cannot reach Monitor, see above) |
| BEH-003 AGY command, no visible change | Added (payload) / Preserved (row) | REQ-003/006, AC-004 | AGY monitor unit + live AGY E2E + panel dedupe component test + browser probe |
| BEH-004 Subagent/uncorrelated rows unchanged | Preserved | REQ-004, AC-005 | Registry unit + component test + browser probe |
| BEH-005 Contract `command` required nullable | Changed | REQ-001, AC-006 | Contract tests, domain parser tests, projector/admission tests, live agent and team websocket payloads |
| Correlation lifecycle (QR-001) | Added | QR-001 | Registry unit (tool_result release, `clear()`) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Registry correlation, AGY monitor, domain build/parse | Unit tests | Real CLI frame order and drift (RSK-001) | Live Claude/AGY E2E |
| API / transport / contract | Yes | `BACKGROUND_TASK_UPDATED` strict schema, agent + team projectors | Contract and projector tests | Real websocket payloads | Live Claude agent + team E2E |
| Frontend component / state | Yes | Handler, store, `BackgroundTaskPanel.vue` | Component/handler/store specs | Real rendering, truncation, a11y | Browser probe |
| Browser integration / user journey | Yes | Activity → Background Tasks row | Browser dev-path probe (production ProgressPanel + stream projector) | Real server → real renderer | Isolated desktop journey |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same panel inside the desktop renderer | Browser probe | Packaged renderer with a real Claude run | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window change | — | — | — |
| Process / lifecycle | Yes (indirect) | Stop, terminate, crash keep/clear the command | Registry unit (`clear()`) | Command kept on live stopped snapshots | Live Claude E2E |
| Persisted-data transition | No | Live-only snapshots | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Claude CLI task frames (undocumented), AGY CLI | Probes | CLI version drift | Live E2E on PATH + SDK-bundled CLIs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command` (branch `codex/background-task-shell-command`, HEAD `346765623`)
- Project type and runtime stack: pnpm monorepo; Node/TypeScript server (Vitest), Nuxt 3 web (Vitest + headless-Chrome probes), Electron desktop shell, zod contract packages
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/TESTING.md` (root; no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`)
- Conflicting, missing, or unclear project instructions: the server `pnpm typecheck` script fails on the baseline with TS6059 (rootDir), so changed test files were checked with `tsc --noEmit` and only the pre-existing TS6059 lines appeared for them.
- Required environment variables or secrets available: `Yes` (local Claude CLI login and `agy` login; no secret values recorded)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers and commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; `RUN_CLAUDE_E2E=1` live Claude on every installed CLI; `RUN_AGY_BACKGROUND_E2E=1` live AGY; browser probes `pnpm -C autobyteus-web test:e2e:<name>`; isolated desktop `pnpm --silent isolated-app start --build` driven by browser-automation with `CHROME_REMOTE_DEBUGGING_PORT` + `BROWSER_AUTOMATION_ATTACH_ONLY=1` |
| `AGENTS.md`, `DESIGN.md` | Repo instructions | Read TESTING.md before validation |
| `docs/isolated-app-instances.md` | Isolated desktop lifecycle | Own ports/data root; `stop <instanceId>` ends only its own process group and removes the auto-created data root |
| `agy-background-task-updates-live.e2e.test.ts` header | AGY live prerequisites | `agy` login; about 5 minutes; `AGY_BACKGROUND_EVIDENCE_DIR` |
| `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs` header | Browser probe | Own Nuxt dev server on a free port, Chrome, `--output-dir` |
| `claude-sdk-client.ts:92-104, 268-273, 403-404, 418-430` | Claude CLI spawn policy | Fixed built-in tool list (no Monitor); process env passes through to the CLI |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Live Claude harness | `autobyteus-server-ts` | `RUN_CLAUDE_E2E=1 pnpm exec vitest run …` | PATH CLI 2.1.283 and SDK-bundled CLI | Test harness | Test `afterEach` cleanups (temp workspace, harness, marker processes) |
| Live AGY server | `autobyteus-server-ts` | `RUN_AGY_BACKGROUND_E2E=1 … vitest run …` | `agy` 1.2.16, model per test file | Test harness | Test `afterAll` |
| Nuxt dev + Chrome probe | `autobyteus-web` | `pnpm test:e2e:background-tasks-panel --output-dir <evidence>` | Free port | Probe | Probe-owned cleanup (receipt in `evidence.json`) |
| Isolated desktop instance | worktree root | `pnpm --silent isolated-app start --build` | Own ports and temp data root | `start` JSON | `pnpm --silent isolated-app stop <instanceId>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Claude agent run | Live harness creates its own run context and temp workspace | Uses the local CLI login; no user data | Removed by test cleanups |
| AGY run | Live server helper with its own data | `agy` login | Test-owned |
| Desktop agent definition | Created through the normal UI in the isolated instance | Isolated data root; user's app untouched | Data root removed on `stop` |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-agent-presentation-contracts/tests/agent-presentation-contracts.test.mjs` | Strict schema incl. `command` | REQ-001, AC-006 | Still Valid | r1-contracts.log | Run |
| `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs` | Team schema accepts `command` | AC-006 | Still Valid | r1-contracts.log | Run |
| `server tests/unit/.../claude-background-task-registry.test.ts` | Correlation, order, Monitor, UNK-001 (no `background_tasks_changed`), release, `clear()`, subagent null | REQ-002/004/007, AC-001/002/005, QR-001 | Still Valid; one gap (live UNK-001 order) | r7 | Add one case |
| `server tests/unit/.../claude-turn-tracker.test.ts`, `claude-session.test.ts` | Tracker passes the frame; session emits the update | DS-001 | Still Valid | r2 | Run |
| `server tests/unit/.../domain/agent-background-task.test.ts` | Build/parse incl. invalid command | REQ-001 | Still Valid | r2 | Run |
| `server tests/unit/.../agy-background-task-monitor.test.ts` | `command = commandLine` | REQ-003 | Still Valid | r2 | Run |
| Converter, team admission, broadcaster/handler, lifecycle transformer tests | Pass-through of the field | AC-006 | Still Valid | r2 | Run |
| `server tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Live Bash bg: command equals the Bash call (follow-up allowed), completed keeps command; failed, foreground, Stop/terminate, crash | AC-001, REQ-007 | Needs Update (failed/stopped cases do not check the command; UNK-001 missing) | r4 | Update + add case |
| `server tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts` | Team-member completed snapshot contains `echo WORKER_DONE` | AC-006 | Still Valid | r4 | Run |
| `server tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | `command === description` on running snapshot | AC-004, REQ-003 | Still Valid | r5 | Run |
| `web components/progress/__tests__/BackgroundTaskPanel.spec.ts` | Kind line, truncation classes, tooltip, toggle + aria-expanded, AGY dedupe, null/blank | AC-003/004/005, QR-002 | Still Valid | r3 | Run |
| Web handler/store/agent+team streaming specs | Field mapping | AC-006 | Still Valid | r3 | Run |
| `web tests/e2e/background-tasks-panel-probe.mjs` (BT-UI-001..007) | Rendered panel incl. BT-UI-007 command line | AC-001/003/004/005 | Still Valid | r6 | Run |
| Other web/server suites (pre-existing failing tests in `team-execution-view-projector` etc.) | Unrelated (`agent_input_states`, `recoverableBlock`) | — | Out Of Scope | r2; implementation baseline comparison | None |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| AE-U1 | Registry: live auto-background frame order gives the first snapshot with the command; command kept to completion | UNK-001, REQ-002/007 | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-background-task-registry.test.ts` | The existing UNK-001 unit case omits the `background_tasks_changed` frame that the live CLI emits between `task_started` and `task_updated` |
| AE-L5 | Live: auto-backgrounded foreground Bash shows its command from the first snapshot to completion (both CLIs) | UNK-001 (RU-1), REQ-002 | `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Guards the third entry path against CLI drift on upgrades (RSK-001) |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| AE-L2 | `claude-agent-background-task.e2e.test.ts` failing-command case | Assert the failed snapshot keeps the Bash command | REQ-002 (RU-3) | — |
| AE-L3 | same file, Stop + terminate case | Assert the command survives Stop and the stopped snapshot keeps it | REQ-002 (RU-2/RU-3) | — |
| AE-L4 | same file, crash case | Assert the stopped snapshot keeps the command | REQ-002 (RU-3) | — |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-agent-presentation-contracts test && pnpm -C autobyteus-team-stream-contracts test` | worktree root | Wire schema (AC-006) | Pass (9/9, 5/5) | `api-e2e-evidence/r1-contracts.log` |
| 2 | `pnpm exec vitest run tests/unit/agent-execution/backends/claude tests/unit/agent-execution/backends/antigravity tests/unit/agent-execution/domain tests/unit/agent-team-execution tests/unit/services/agent-streaming tests/unit/agent-collaboration --no-watch` | `autobyteus-server-ts` | Registry/tracker/session/AGY/domain/projectors/admission | Pass except 2 pre-existing, unrelated `team-execution-view-projector` failures (925 passed) | `api-e2e-evidence/r2-server-focused.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt --run components/progress services/agentStreaming stores/__tests__/agentBackgroundTaskStore.spec.ts` | worktree root | Panel/handler/store/streaming | Pass 221/221 | `api-e2e-evidence/r3-web-focused.log` |
| 4 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts --no-watch` (as delivered) | `autobyteus-server-ts`, PATH CLI 2.1.283 + SDK-bundled CLI | AC-001, AC-006 live (agent + team websocket) | Pass 11/11 | `api-e2e-evidence/r4-claude-live-e2e.log` |
| 5 | `RUN_AGY_BACKGROUND_E2E=1 AGY_BACKGROUND_EVIDENCE_DIR=… pnpm exec vitest run tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts --no-watch` | `autobyteus-server-ts`, agy 1.2.16 | AC-004 live payload | Pass 5/5 | `api-e2e-evidence/r5-agy-live-e2e.log`, `api-e2e-evidence/agy-live/` |
| 6 | `pnpm -C autobyteus-web test:e2e:background-tasks-panel --output-dir <evidence>/browser-probe` | worktree root, Chrome | Rendered row AC-001/003/004/005, QR-002 | Pass (BT-UI-001..007) | `api-e2e-evidence/browser-probe/evidence.json` |
| 7 | Registry + tracker unit after AE-U1 | `autobyteus-server-ts` | UNK-001 order | Pass 64/64 | `api-e2e-evidence/r7-registry-unit.log` |
| 8 | Live Claude agent file after AE-L2..L5 + temporary probe TP-2 | `autobyteus-server-ts`, both CLIs | RU-1/2/3 | Pass 14/14 (12 durable + 2 temporary) | `api-e2e-evidence/r8-claude-live-e2e-updated.log`, `api-e2e-evidence/stop-probe.jsonl` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are multiple independent live cases, long-running live provider runs, and a packaged desktop build plus journey.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-001/006 live on both CLIs and both streams; AC-003/004/005 rendered in the browser probe and component tests; AC-004 live AGY payload; AC-002 unit + raw CLI probe | AC-002 not reachable through the product (Monitor not enabled) | — (requirements-level observation) |
| Changed-boundary execution directness | 95% | Real CLI → registry → real websocket payloads; production panel rendering | Real server → packaged renderer seam not exercised together | Isolated desktop journey |
| Cross-boundary integration realism and mock gap | 90% | Live server websocket payloads are exact; the browser probe feeds the same shape through the production stream projector | Server and renderer proven separately | Isolated desktop journey |
| Environment, configuration, identity, and fixture fidelity | 95% | Both installed CLIs, real logins, real `agy` | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Unit release/`clear()`; UNK-001 raw probe; failed/stopped live runs exist | Command retention on live failed/stopped snapshots and Stop-at-start were not asserted in the delivered suite | AE-L2..L5 + TP-2 |
| User-surface, browser, and desktop-shell confidence | 90% | Browser probe BT-UI-007 at panel width with metrics; screenshots | Not seen in the real desktop app with a real Claude run | Isolated desktop journey |
| Durable regression coverage quality and relevance | 90% | Strong unit/component/probe coverage | Live UNK-001 and lifecycle command retention missing | AE-U1, AE-L2..L5 |

- Overall post-repository confidence: 92%
- Calculation method: simple average of the seven categories (rounded)
- Every critical acceptance criterion directly proven: `Yes` for the product-reachable criteria. AC-002 is proven at the registry and raw-CLI boundaries; the product cannot reach it.
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real server-to-renderer journey; lifecycle and UNK-001 live retention

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (added live cases and the temporary Stop probe) + `Project Desktop Validation` (isolated desktop instance with a real Claude agent)
- Specific confidence gap or residual risk addressed: live lifecycle/UNK-001 retention; a real server → packaged renderer journey for SCN-001
- Why the selected mode can materially improve confidence: it exercises the user's actual scenario (desktop app, Claude agent, background Bash) end to end with no mocked hop
- Expected confidence after the selected validation: ≥ 95%
- Browser-specific decision and rationale: the browser probe already proves the rendering rules; the desktop journey adds the real-transport seam and the packaged renderer
- If `Blocked`: N/A

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron (packaged worktree build)
- Testing guideline used: `TESTING.md` → isolated desktop instances; `docs/isolated-app-instances.md`
- Web-equivalent behavior: panel rendering (covered by the browser probe)
- Shell-specific or lifecycle behavior: none changed
- Chosen validation approach: isolated instance (`--build`), driven over its loopback CDP control port with the browser-automation launcher
- Effect on any already-running desktop application: `None` (own ports and data root; stop only our instance id)
- Behavior not directly proven and confidence consequence: recorded in the execution report

## Live Environment And Fixture Plan

- Startup order and commands: `pnpm --silent isolated-app start --build` → browser-automation `list-tabs` → create a Claude agent through the UI → run it with a background Bash prompt → inspect the Activity → Background Tasks row → `pnpm --silent isolated-app stop <instanceId>`
- Environment choices: the embedded server gets the system-baseline env (HOME), so the local Claude CLI login is used
- Health / readiness checks: `start` JSON (`/rest/health` + window)
- Seed data / fixtures: one agent definition created in the isolated data root
- Test identities: local Claude CLI login
- Journeys: DJ-1 (SCN-001: running row `Shell · <command>`, tooltip, expand, then completed row keeps the command)
- Evidence: DOM state (text, `title`, `aria-expanded`, computed style), screenshots, instance log
- Cleanup: stop the instance (removes its data root); kill marker processes if any

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TP-1 | `api-e2e-evidence/probes/claude-auto-bg-probe.mjs` (raw SDK, `auto-bg`, `auto-bg-long` with `PROBE_CLI_ENV`) | UNK-001 live frame order; timeout without the switch kills | Raw CLI investigation; durable proof is AE-U1 + AE-L5 |
| TP-2 | Temporary vitest file `tests/e2e/runtime/zz-tmp-claude-stop-during-bg-start.e2e.test.ts` (copy kept at `api-e2e-evidence/probes/claude-stop-during-bg-start.probe.e2e.test.ts.txt`; removed from the tree after the run) | RU-2: Stop right after the background Bash is announced; any listed task carries the exact command | Whether the CLI still starts the task is timing-dependent, so a durable assertion would be non-deterministic; the deterministic part is the unit case "learns tool commands even while an interrupt is requested" |
| TP-3 | Designer's `evidence/probes/claude-bg-command-probe.mjs monitor` re-run on CLI 2.1.283 | AC-002 frame shape | Monitor is not reachable through the product |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| SCN-002 through the product | Monitor is not in AutoByteus's enabled Claude tools | None today; covered automatically if enabled | Observation to Solution Designer |
| Mobile (Android/iOS) | Not consumers (design/investigation grep) | None | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| SCN-002/AC-002 is recorded as a Supported Normal Scenario, but the product's Claude tool policy excludes Monitor | Non-blocking observation (not a failing criterion; the implementation satisfies REQ-002 for Monitor frames) | `claude-sdk-client.ts:92-94, 403` | Solution Designer (for awareness) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added AE-U1, AE-L5; updated AE-L2..L4)
- Post-repository confidence: 92%
- Broader validation decision: `Required` (live cases + isolated desktop journey)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: The investigation was written after the first execution of the delivered coverage (orders 1-6) and before the final execution of the updated coverage.
- Final outcome (round 1): broader validation executed; final confidence 96%; result `Pass`. See `api-e2e-execution-coverage-report.md`.
