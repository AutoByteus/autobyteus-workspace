# API/E2E Coverage Investigation — Universal Team status

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/requirements-doc.md` (Approved R2 / SR-002, AP-001)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/design-spec.md` (SR-003)
- Supplemental Task Artifacts: two user screenshots (evidence only; paths in requirements-doc). Architecture handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/handoff-architecture-design-complete.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation handoff IR-001 from `/software_engineering_team/implementation_engineer` (direct Medium/Low route)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Every Team row in the Workspaces tree shows one Team status dot before the slate people-group icon (REQ-005/006). Ranking: busy (running or starting) blue with pulse > error red > idle green > offline gray (REQ-001). The dot counts every agent shown under the Team row, collapsed included. It excludes closed (DONE) work (REQ-002). A Team in a run that is not alive is gray (REQ-003). A TEAMS group row shows the highest state of its runs (REQ-004). Team dots update live with agent statuses, with no new requests (REQ-008). The status word appears in the accessible label and title, and Stop/archive/delete buttons are unchanged (REQ-007). Agent rows and the Org root row are unchanged (BEH-006).

Design (SR-003) has one rule owner, `resolveTeamStatus` (`utils/workspaceTeamAggregateStatus.ts`), and per-root counting:
- Team runs: `workspaceHistoryTeamBranchStatus.ts`, derived at render time.
- Agent runs: `AgentRunCollaborationContext.listTaskRows`.
- Org runs: `agentOrgTeamBranchStatus.ts` and `agentOrgHistoryRows.ts`.
- TEAMS rows: `WorkspaceHistoryWorkspaceSection.vue`.

The shared contract fold is unchanged. Persisted data: `Not Affected`.

Note: SR-006 (an evidence-only entry) questions who owns the rule (frontend vs. server) as an open user decision. The record says "implementation of SR-003 continues unless the user pauses it", so SR-003 is the validation basis.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (delegated Team under an Agent run), SCN-002 (Team run with delegated Teams), SCN-003 (Org run with internal and delegated Teams), SCN-004 (standalone TeamRun row), SCN-005 (TEAMS group row).
- Real-use scenarios added from investigating the implemented behavior:
  - RU-1: the delegator messages its delegated Team's coordinator (`send_message_to`) while the Team row is collapsed. Real trigger: the agent's own tool call. This proves the live idle→running transition (AC-005) through the real collaboration stream.
  - RU-2: the user clicks "Stop generation" on a running coordinator. Real trigger: the composer Stop button. This moves the Team from busy to error/idle (AC-004) through a real event.
  - RU-3: a member turn fails at the provider (scripted CLI `ERROR` result). Real trigger: a runtime failure. This gives a real `error` agent status (AC-004).
  - RU-4: the user stops a TeamRun with the row's Stop button. Real trigger: the TEAMS row Stop button (AC-007, AC-008, AC-010).
  - RU-5: a freshly created TeamRun whose members have not started (alive, all offline). Real trigger: create without a message. This is ASM-002: gray, with Stop still shown.
  - RU-6: a Team run's member delegates a Team. The TEAMS run row counts the delegated Team's agents (REQ-002 "agents its members delegated").
- Designer scenarios recorded as Unsupported/Contrived: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 delegated Team under Agent run | Added | REQ-001..003/005..008; DS-001 | Unit (context) + component + live browser |
| BEH-002 delegated/nested Team under Team run | Added/Changed | DS-002 | Unit (branch status) + component + live browser |
| BEH-003 delegated/Org-internal Team under Org run | Added/Changed | DS-003 | Unit (projection) + component + live browser |
| BEH-004 starting → blue; stopped → gray on nested/Org Teams | Changed | REQ-001/003 | Unit (rule) + live stop |
| BEH-005 TEAMS run/group rows binary → universal | Changed | REQ-004, DS-004 | Component + live browser (multi-run group) |
| BEH-006 agent rows, Org root row | Preserved | REQ-007 | Component + live negative assertions |
| Binary `TeamActivityDot` on tree rows, `hasActiveRuns`, dead l10n keys | Removed | Removal plan | Grep + negative assertions |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | Consumes existing `AGENT_STATUS`, lifecycle, history list, collaboration view | — | Whether real server statuses/lifecycle reach the new derivations correctly (shape, timing, history-load path) | Live browser against built backend |
| Frontend component / state | Yes | Rule, three projections, five renderers | Colocated specs (33 files / 409 tests) | Mocked inputs only | — |
| Browser integration / user journey | Yes | Rendered dot, live updates, Stop button, collapse | Nuxt dev probes with controlled inputs (nested, group-icon) | No real stream/lifecycle events | Live browser against built backend (new durable probe) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as browser | as above | — | Browser covers it |
| Desktop shell / Electron-specific integration | No | — | — | — | AC-011 user verification (Delivery) |
| Process / lifecycle | Indirect | Run liveness gate reads existing lifecycle | Unit | Real terminate → gray timing | Live browser terminate |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status` (branch `codex/delegated-team-aggregate-status`, HEAD `fb9580e11`)
- Project type and runtime stack: pnpm monorepo. Nuxt 3 / Vue 3 web renderer (Electron-wrapped), Node/TypeScript server, Vitest, Playwright-core probes with headless Chrome.
- Project testing guideline paths: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/TESTING.md` (the worktree's root guideline at base `927796780`, authoritative). No closer `TESTING*.md` under `autobyteus-web`.
- Correction during execution: I first read the main checkout's `TESTING.md` (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md`). It is 145 commits behind and **differs** from the worktree copy. I re-read the worktree copy (layers, § Server unit and integration baseline, § Choosing the path, § Rules, § Team identity glyph regression). Its guidance for this change is the same: web unit tests + a browser dev-path probe.
- Conflicting, missing, or unclear project instructions: none material. A plain `vitest run` without `NUXT_TEST=true` also picks up the Electron specs outside their config: two `electron/server/__tests__/platformServerEnvironment.spec.ts` cases then fail, and they pass under `test:electron`. The documented `test:nuxt` is authoritative and is green.
- Required environment variables or secrets available: `N/A`. No provider credentials: the scripted AGY CLI is used.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, § Choosing the path | Layer selection | Renderer change → web unit tests + a browser dev-path probe. Full product → isolated desktop instance. |
| `TESTING.md` § Task closure in the Workspaces tree | Real backend + Nuxt + Chrome probe pattern | `pnpm -C autobyteus-server-ts prebuild && build`. The probe owns its data root, ports and processes. Scripted AGY via `ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills`. |
| `TESTING.md` § Team identity glyph regression | Existing probe | `pnpm -C autobyteus-web test:e2e:team-group-icon --output-dir <fresh>` |
| `TESTING.md` § Rules 2, 5, 6, 9 | Safety | Never the user's app or `~/.autobyteus`. Stop what you started. Assertions first. Explain baseline failures. |
| `autobyteus-web/AGENTS.md`, root `AGENTS.md` | Package rules | Read DESIGN/TESTING. |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Reference harness | GraphQL setup mutations, `/ws/<root>` manager input, `openRoot`, row selectors. |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY actor | `linked_skills`: `CALL_TOOL:{…}` calls a real scoped MCP tool. Other text replies "OK". An invalid JSON payload yields an `ERROR` result. There is no hold-turn mode in `linked_skills`. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>` (spawned by the probe) | Private SQLite/data root in `os.tmpdir()` | stdout `listening` + GraphQL `{__typename}` | Process-group SIGTERM, then data root removed |
| Nuxt dev | `autobyteus-web` | `pnpm exec nuxi dev --port <free>` (spawned by the probe) | Backend endpoints by env | HTTP 200 | Process-group SIGTERM |
| Chrome | — | Playwright `chromium.launch` headless | `/Applications/Google Chrome.app` | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org definitions, project + tasks, runs | Public GraphQL mutations (same as the app's launch) | Probe-owned data root only | Data root removed |
| Agent turns (idle, running, error) | Scripted AGY CLI. Add a `HOLD_TURN` marker to `linked_skills` (durable fixture change) so a turn stays running until stopped. | No provider calls | Process ends with its run |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `utils/__tests__/workspaceTeamAggregateStatus.spec.ts` | Rule: rank, initializing→running, liveness gate, group ranking | REQ-001/003/004; AC-002..004/007 | Still Valid | Read diff; passes | Keep |
| `components/workspace/history/__tests__/workspaceHistoryTeamBranchStatus.spec.ts` | Branch/run/group counting incl. transient Teams, stopped run | REQ-002..005; AC-007/008 | Still Valid | passes | Keep |
| `services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts` | Agent-root task Team status collapsed/expanded, reactive member changes, not-alive gray | AC-001/005/007 | Still Valid | passes | Keep |
| `services/agentCollaboration/__tests__/agentRunCollaborationClosure.spec.ts` | Closed work not counted; reopen counts again | AC-006 | Still Valid | passes | Keep |
| `services/agentOrgExecution/__tests__/agentOrgTeamBranchStatus.spec.ts`, `utils/__tests__/agentOrgHistoryRows.spec.ts` | Org configured/task Team status, closure, liveness | AC-003/006/007/009 | Still Valid | passes | Keep |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | TEAMS run/group dots reactive, Stop on alive runs, no binary dot | AC-008/009/010 | Still Valid | passes | Keep |
| `.../WorkspaceTransientExecutionRow.spec.ts`, `AgentRunTaskRowsSelect.spec.ts`, `WorkspaceAgentOrgDelegatedRows.spec.ts` | Renderer dot placement, aria label, agent rows without Team dot, Org root row without Team dot | AC-009/010, BEH-006 | Still Valid | passes | Keep |
| `.../workspaceHistoryTeamDefinitionGroups.spec.ts` | Grouping without `hasActiveRuns` | Removal plan | Still Valid | passes | Keep |
| `tests/e2e/nested-team-aggregate-status-probe.mjs` | Controlled-input browser: nested/delegated/TEAMS dots, one dot per row, no binary dot, a11y, zh-CN | AC-009/010 | Still Valid (updated by implementation) | Rerun planned | Run |
| `tests/e2e/team-group-icon-probe.mjs` | Team glyph identity/sizes | REQ-006 icon preserved | Still Valid | Rerun planned | Run |
| `tests/e2e/team-activity-presentation-probe.mjs` (unregistered) | History + `running/*` surface | Out-of-scope `running/*` | Out Of Scope (running part); history part cannot render because the fixture crashes before reaching it | Implementation handoff; pre-existing | Not run as evidence. Follow-up removal stays with the listed `running/*` cleanup. |
| `components/workspace/running/__tests__/*`, `common/__tests__/TeamActivityDot.spec.ts` | Unmounted `running/*` cluster | Follow-up removal | Out Of Scope | Design removal plan | None |
| `tests/e2e/task-closure-tree-probe.mjs` | Closure/reactivation with real backend | Adjacent (member dots, closure) | Out Of Scope (not changed; reference harness) | — | Reuse pattern |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| TS-001 | Delegated Team under an Agent run: idle, live busy while collapsed, error/idle after Stop generation, gray after root terminate; member rows agree; agent rows have no Team dot | SCN-001; AC-001..005, AC-007, AC-009, AC-010 | `autobyteus-web/tests/e2e/team-status-live-probe.mjs` (`test:e2e:team-status-live`) | Repository specs mock agent statuses and lifecycle. Only a real server proves that real status/lifecycle events reach the new derivations, live and collapsed. |
| TS-002 | TEAMS run and group rows: idle run green (screenshot 2 case), alive-unstarted gray with Stop, busy run blue, group = highest across runs, Stop button → gray, all stopped → gray with archive/delete | SCN-004/005; AC-002, AC-007, AC-008, AC-010; ASM-002 | same probe | Same. Also proves the history-load path after a fresh page load. |
| TS-003 | Team run with a member-delegated Team: delegated Team row status, run row counts delegated agents, terminate → gray | SCN-002; AC-009, REQ-002 | same probe | Same |
| TS-004 | Org run: delegated task Team and Org-internal Team rows show status; Org root row has no Team dot; terminate → gray | SCN-003; AC-009, AC-007, BEH-006 | same probe | Same |
| FX-001 | `HOLD_TURN` marker in the scripted AGY CLI `linked_skills` mode | Enables a real `running` status | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | No existing `linked_skills` mode keeps a turn running |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DOC-001 | `TESTING.md` | Register the new probe (command, prerequisites, what it does and does not prove) | TESTING.md conventions | Test-infrastructure documentation only. Product docs sync stays with Delivery. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run components/workspace/history/__tests__/ services/agentCollaboration/__tests__/ services/agentOrgExecution/__tests__/ utils/__tests__/workspaceTeamAggregateStatus.spec.ts utils/__tests__/agentOrgHistoryRows.spec.ts stores/__tests__/agentOrgHistoryApollo.spec.ts components/workspace/common/__tests__` | `autobyteus-web` | Rule, projections, renderers (mocked inputs) | Pass (33 files / 409 tests) | `api-e2e-evidence/vitest-changed-specs.log` |
| 2 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree root | Build prerequisite for the live probe | Pass | `api-e2e-evidence/server-build.log` |
| 3 | `pnpm -C autobyteus-web test:e2e:nested-team-aggregate-status --output-dir <ticket>/api-e2e-evidence/nested` | worktree root | Controlled-input browser rendering (all Team surfaces, a11y, zh-CN) | Pass | `api-e2e-evidence/nested/evidence.json` |
| 4 | `pnpm -C autobyteus-web test:e2e:team-group-icon --output-dir <ticket>/api-e2e-evidence/group-icon` | worktree root | Glyph identity preserved | Pass (ports released) | `api-e2e-evidence/group-icon/result.json` |
| 4b | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts --no-watch` | worktree root | Scripted AGY fixture modes coexist (incl. new `HOLD_TURN` case) | Pass (18/18) | `api-e2e-evidence/agy-fixture-routing.log` |
| 5 | `pnpm -C autobyteus-web test:nuxt --run` | worktree root | Full web unit/component regression | Pass (590 files / 4035 tests, 5 skipped, 0 failed) | `api-e2e-evidence/vitest-test-nuxt.log` |
| 5a | `pnpm -C autobyteus-web test:electron --run electron/server/__tests__/platformServerEnvironment.spec.ts` | worktree root | Confirms that the 2 failures from a non-documented plain `vitest run` (`vitest-full-web.log`) were a runner artifact | Pass (2/2) | console |
| 6 | `pnpm -C autobyteus-web test:e2e:team-status-live --output-dir <ticket>/api-e2e-evidence/live --ledger-file <ledger>` | worktree root | Real server + Nuxt + Chrome, TS-001..TS-004 | Pass (attempt 1: TS-004 failed on a probe selector, fixed; attempt 2 and two repeats: 4/4) | `api-e2e-evidence/live/evidence.json`, `live-attempt1/`, `live-repeat2/`, `live-repeat3/` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. The live probe has four independently meaningful, long-running journeys (backend build, Nuxt cold start, real runs), with interruption risk.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Scored after orders 1–2 (before the browser probes):

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Every AC-001..010 has unit/component assertions | All with mocked statuses and lifecycle | Live journeys TS-001..004 |
| Changed-boundary execution directness | 80% | Real components mounted | Real stream events → derivation not exercised | Live backend |
| Cross-boundary integration realism and mock gap | 70% | — | Agent contexts, history list, lifecycle and Org authority all mocked | Live backend |
| Environment, configuration, identity, and fixture fidelity | 75% | jsdom + Pinia | No real Nuxt, browser or server | Probes |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Error ranking, stopped gate, closure in unit tests | Real terminate/stop, real error status | TS-001/002 |
| User-surface, browser, and desktop-shell confidence | 70% | — | Rendered placement/pulse/aria in a browser | Probes |
| Durable regression coverage quality and relevance | 90% | Specs are requirement-linked | No real-stack regression guard | New live probe |

- Overall post-repository confidence: 79%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No` (AC-001, AC-005, AC-007, AC-008 are proven only with mocked inputs)
- Any applicable category below `90%`: `Yes`: all except durable regression quality
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real event and lifecycle paths into each per-root derivation. The history-load path for TEAMS rows. Rendering in a real browser.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` against a real built backend (web-equivalent desktop renderer), plus the existing controlled-input browser probes
- Specific confidence gap addressed: real status/lifecycle events → Team dot on every surface, live and collapsed. Real Stop/terminate. TEAMS group across runs. Agent-row and Org-root no-regression.
- Why the selected mode can materially improve confidence: it exercises the actual server event shapes, history-load and collaboration-stream paths, and real DOM, with no mocked statuses.
- Expected confidence after the selected validation: ≥95%
- Browser-specific decision and rationale: Required. This is a renderer-presentation change, and its risk is in browser rendering and live integration.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the same Nuxt renderer
- Testing guideline used: TESTING.md § Choosing the path
- Web-equivalent behavior: all changed behavior (renderer components, stores)
- Shell-specific or lifecycle behavior: none changed
- Chosen validation approach and why it fits: browser against a built backend. No shell code changed.
- Server/frontend setup: probe-owned built backend + Nuxt dev on free ports
- Effect on any already-running desktop application: `None`. The user's app and `~/.autobyteus` are not touched.
- Behavior not directly proven and confidence consequence: packaged-app rendering. This is covered by AC-011 explicit user verification on an isolated worktree build (Delivery/user). It is not a confidence gap for this renderer-only change.

## Live Environment And Fixture Plan

- Startup order and commands: server build (done) → probe starts the backend (`dist/app.js`, private data root, scripted AGY), then Nuxt dev, then Chrome.
- Environment choices: `AGY_FAKE_CASE=linked_skills`, AGY runtime with model `gemini-3.8-flash-low` (scripted), `autoExecuteTools: true`.
- Health / readiness checks: backend `listening` + GraphQL. Nuxt HTTP 200. Workspace rows visible.
- Seed data / fixtures: definitions, project and Task, runs via public GraphQL. Agent turns via `/ws/<root>` manager input and `CALL_TOOL` (real scoped MCP `delegate_task` / `send_message_to`).
- Test identities: none (local, no auth).
- Requirement-linked journeys: TS-001..TS-004 (above).
- Evidence: `evidence.json` per case, with `data-status`, `aria-label`, `title` and dot classes of each Team row, plus screenshots and backend/frontend logs.
- Owned processes and temporary state to clean up: backend and Nuxt process groups, Chrome, private data root.

## Temporary Executable Validation Plan

None. The live journeys are durable (registered probe).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-011 explicit user verification in the desktop app | Owned by Delivery/user by definition | None for API/E2E | Delivery: isolated worktree build |
| AC-006 live (a hidden closed agent that is still running) | In real use, DONE stops the closed copies, so a "running but hidden" agent exists only transiently | Low | Unit coverage (two specs) is authoritative |
| Freshness gap ASM-001/R-002 (Agent hosts never selected, Orgs never opened) | Accepted assumption; follow-up candidate, not in R2 | Known, accepted | Solution Designer follow-up |

## Ambiguities Or Reroute Triggers

None at this point.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (new live probe + script, AGY fixture `HOLD_TURN`, TESTING.md entry)
- Post-repository confidence: 79%
- Broader validation decision: `Required` (Browser against a built backend)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: executed. Final confidence and result are in the execution coverage report (Pass, 95%).
