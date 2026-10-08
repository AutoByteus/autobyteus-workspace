# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-spec.md`
- Architecture design handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/handoff-architecture-design-complete.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct Small/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete from `/software_engineering_team/implementation_engineer`, commit `203eb29e1`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (subject to `get_handoff_rules`)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

A delegated Team copy (any root: standalone Agent, Team, Org; description- or task_id-based) is prepared scope-only. Only the coordinator starts, through the delegated seed (`TeamRun.postMessage → ConfiguredAgentExecutionHandle.ensureReady`), and its provider binding is committed late to the root tree. Other members start only when a message/handoff reaches them; until then they have no AgentRun, no provider session, a `null` saved binding and report `offline` (gray "Offline", DEC-001 = A). A member start failure surfaces at first work (not-accepted delivery to the sender, member `error` status); a coordinator start failure fails `delegate_task`. Idle shutdown, restore after stop/restart, Task DONE + reactivation and restore of pre-fix copies (all members bound, unused ones without conversation) keep working. UI-started Teams, `send_message_to` a Team and single-Agent delegation are unchanged. The eager flat-Team preparation path is removed (no compatibility flag). Persisted data: `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: A copy member that failed to start (error) must not block the copy's idle shutdown or a later restore. Trigger: teammate message to a member whose configured model is unavailable, then the copy goes quiet.
  - SCN-A2: After a restore (idle shutdown, root stop/restore), a never-started member's first work plans a *new* provider session (no `--conversation`), while bound members resume theirs. Trigger: teammate message after restore.
  - SCN-A3: A pre-fix copy whose unused member is bound but has no conversation: its first work replaces the binding with a fresh provider session. Trigger: teammate message after restoring such a saved tree.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 delegated Team copy activation | Changed | REQ-001/003/004, AC-001/003, QR-001, design DS-001 | Must prove at the real server boundary: one provider session at delegation, null saved bindings, offline statuses, all three roots |
| BEH-005 first-work activation of copy members | Changed (now reached by fresh copies) | REQ-002/005, AC-002/004, DS-002 | Must prove teammate message starts only its recipient; failure path reported to sender + error status |
| BEH-001 coordinator failure | Preserved semantics | REQ-005, AC-004 | `delegate_task` returns no run; no member provider session |
| BEH-004 lifecycle (idle shutdown, restore, DONE/reopen, legacy) | Preserved, new data shape (null bindings) | REQ-006, AC-005 | Must prove with real lifecycle owners and persisted tree reader |
| BEH-002/003/006 | Preserved | REQ-007, AC-006 | Existing suites |
| Eager preparation plumbing | Removed | Design Removal Plan | Confirm no residual references; no durable test protects removed behavior |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Task Team preparation policy (`RootTeamExecutionDirectory`, `TaskTeamExecutionRegistry`, flat factory) | New unit suite with real factory/directory/handles/mutators; provider runtime mocked | Real `delegate_task` dispatch (operation gate, durability gate, seed delivery), real runtime process creation | Live API (scripted-AGY server E2E) |
| API / transport / contract | Yes (observable only) | `delegate_task` result; root view `agent_statuses`; status frames | None direct for the new behavior | Status projection of never-started copy members over WebSocket | Live API |
| Frontend component / state | No code change | Renders existing `offline` | Existing web code unchanged | Sidebar rendering of a delegated copy's offline members (AC-007, user check) | Not required (see decision) |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No code change | — | — | AC-007 is user verification | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Member activation moves to first work; idle shutdown/restore/DONE with never-started members | Unit (mocked runtime) | Real CLI process lifecycle, quiescence with never-started/errored members | Live API + process observation |
| Persisted-data transition | Yes (shape unchanged) | New copies save `null` bindings; legacy copies all-bound | Unit with real mutators | Real persisted tree reader on root restore; legacy saved tree | Live API with saved-tree edit while stopped |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (provider sessions) | Provider session per activation | Unit counts mocked candidates | Real provider process/session count | Scripted AGY CLI (one process per activation); optional real Claude |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation` (branch `codex/delegated-team-member-lazy-activation`, commit `203eb29e1`)
- Project type and runtime stack: pnpm monorepo; Node/TypeScript Fastify + GraphQL + WebSocket server (`autobyteus-server-ts`), Vitest; Nuxt/Electron frontend (`autobyteus-web`, unchanged)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts`)
- Conflicting, missing, or unclear project instructions: `pnpm -C autobyteus-server-ts typecheck` fails on base with TS6059 (recorded by implementation); `tsc -p tsconfig.build.json --noEmit` used. `mixed-task-delegation.e2e.test.ts` requires LM Studio + Codex + Claude together (not available as a set here).
- Required environment variables or secrets available: `Yes` for scripted AGY (`RUN_AGY_FAILURE_E2E`, `ANTIGRAVITY_CLI_COMMAND` → repo fixture); no secrets needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` (root) | Testing guideline | Server tests via `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; Project Task layer commands; gated scripted-AGY server E2Es (`RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`); `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` for machine-independent runs; never use user app/data; rule 9 (explain/fix baseline failures) |
| `AGENTS.md` (root) | Repo instructions | Follow DESIGN.md / TESTING.md |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY actor | `linked_skills` case: `CALL_TOOL:{...}` calls the real agent MCP tool; argv log per launch (`AGY_FAKE_ARGV_LOG`); exact `--conversation` resume |
| `src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | Runtime behavior | AGY activation launches one CLI process and binds its `conversation_id`; unavailable model → `AGY_MODEL_UNAVAILABLE` before launch |
| `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`, `task-reactivation-root-visibility.e2e.test.ts` | Existing patterns | Studio in-process server, disposable data dir/HOME, root views, idle grace 60 s via `.env` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (per suite) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside Vitest | Free port, disposable `appData` dir | GraphQL responds; WS snapshot | `app.close()`, data dir removed in `afterAll` |
| Scripted AGY CLI processes | test-owned capsule dirs | Spawned by server | One process per activated agent | `init` event | Root terminate / server close; leftover check in `afterAll` |
| Base comparison worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/dtl-api-e2e-base` | `git worktree add --detach … ace86bf1f`, `pnpm install`, `prebuild` | Read-only comparison | — | `git worktree remove` after use |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org definitions | GraphQL create mutations | Test-owned data dir under `os.tmpdir()` | Removed with data dir |
| Project + Task (task_id delegation) | GraphQL `createProject` / `createProjectTask` | Same | Same |
| Member start failure | Per-member launch override with unavailable model (`agentOverrides` for Org, `memberConfigs` for Team) | Real configuration path | Same |
| Legacy (pre-fix) copy | Edit the stopped root's saved tree: give one never-started member a binding with no conversation (exact pre-fix shape) | Only test-owned files | Same |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: a stopped root's saved tree where a never-used copy member has a provider binding and no conversation; restore must keep it offline and its first work must start a fresh session (binding replaced). New copies: `null` bindings for unused members.
- Evidence planned: unit (real mutators) + live server E2E reading the real saved tree on root restore.
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/delegated-team-lazy-member-activation.test.ts` (new) | AC-001..005, QR-001 per root, real factory/handles/mutators, mocked provider | REQ-001..006 | Still Valid | Read; runs 18/18 | Keep |
| `tests/unit/agent-team-execution/flat-team-member-release-independence.test.ts` (renamed) | Release independence re-based on first-work activation | Design R-2 | Still Valid | Read diff | Keep |
| `tests/unit/agent-team-execution/flat-team-execution-factory.test.ts` | Scope-only preparation | Design removal plan | Still Valid | Diff | Keep |
| `tests/unit/agent-collaboration/{task-terminal-publication-lifecycle,root-task-team-terminal-publication}.test.ts`, `tests/unit/agent-org-execution/agent-org-task-publication.test.ts`, `tests/unit/agent-team-execution/team-root-agent-initiated-collaborators.test.ts` | Re-based on coordinator starting through seed | AC-001, AC-006 | Still Valid | Diff | Keep |
| `tests/fixtures/task-release-generation-fixtures.ts` | `activateTeamMembers()` delivers work | Design R-2 | Still Valid | Diff | Keep |
| `tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts` | Removed option assertion + stale mock fix | Removal plan | Still Valid | 18/18 | Keep |
| `tests/integration/agent-team-execution/configured-scope-readiness.test.ts` | UI-started Team/Org members stay unstarted until input (BEH-002) | AC-006 | Needs Update (stale double) | Identical 6/8 failures on base `ace86bf1f`; cause: `agentRunManager` double exposes the retired `prepareNewAgentRun` instead of `beginActivation`, and its run lacks `getInputStateSnapshot`/`bindExecutionAdmissionFence` | Baseline fix: wrap the same candidates with `testActivationManager`; assertions unchanged; 8/8 |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Team root manager package/restore | AC-006 | Needs Update (stale double) | Identical 14/14 failures on base; cause: factory double implements the retired `materialize` instead of `beginMaterialization().prepare()`, and the expected callback keys predate the required `assertExecutionInputAllowed` | Baseline fix; 14/14 |
| `tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts` | Team MCP session lifecycle | AC-006 | Needs Update (stale double) | Identical failure on base; cause: backend factory double predates `beginPreparation` | Baseline fix via `testBackendFactory`; 1/1 |
| `tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` | Exact AgentRun targets incl. task-Team members over Team WS | AC-006 | Needs Update (stale double) | Identical 2/3 failures on base; cause: root snapshot double lacks `closedTaskExecutions`/`inputStates` (projector throws `TEAM_STREAM_UNAVAILABLE`) | Baseline fix; 3/3 |
| `tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts` | Org publication chain incl. collaborator, Task copies, Stop/restore | AC-006 | Needs Update (stale assertion) | Identical failure on base; cause: expects an `@` mention to add a collaborator, but current behavior (TESTING.md, `ad-hoc-task-delegation`) is that `@` adds none, collaborators are brought in on first `send_message_to`, and in-run definitions stay `@` candidates | Baseline fix: bring the helper in by `send_message_to`; candidate assertion follows documented behavior; 1/1 |
| `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` | Team copy coordinator lifecycle with background step | AC-005, AC-006 | Still Valid (expected) | Read; `mate` is never addressed | Run |
| `tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | DONE/reopen incl. Team copy restored via coordinator | AC-005 | Still Valid (expected) | Read | Run |
| `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts`, `task-closure-root-visibility.e2e.test.ts`, `project-change-feed.e2e.test.ts`, `project-task-context-files-delegation.e2e.test.ts`, `tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts` | Delegation/closure/feed/context/Org publication, incl. Team copies | AC-006 | Still Valid (expected) | Read headers | Run |
| `tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts` | Tool surface | AC-006 | Still Valid | Ungated | Run |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live LM Studio + Codex + Claude delegation | AC-006 | Out Of Scope for this run | Needs all three live runtimes | Record Not Tested |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DTL-001..DTL-008 | Delegated Team copy lazy activation through real `delegate_task` → dispatch → seed → AGY process; teammate message; member/coordinator start failure; idle shutdown + restore; DONE + reactivation; root stop + restore with a legacy saved tree; in all three roots | AC-001..005, QR-001, REQ-001..006 | `autobyteus-server-ts/tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` (gated like sibling scripted-AGY suites) | Only repository evidence of the new behavior mocks the provider runtime and drives seed release directly; the real dispatch, durability, process and persisted-reader boundaries need durable proof, in the existing scripted-AGY E2E layer |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| — | `TESTING.md` | Add the new gated suite's command and coverage summary next to the sibling Project Task suites | TESTING map convention | Doc-only |
| BL-01..BL-05 | The four integration files and the Org publication E2E above | Bring stale test doubles/assertions to the current contracts (TESTING rule 9); separate baseline-fix commit | AC-006 | Done; all pass |
| — | `tests/fixtures/agy-failure-cli.mjs` | `models` also lists `AGY_FAKE_EXTRA_MODELS` while set (retire a configured model) | AC-004 member case | Additive; default output unchanged |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | worktree root | Build typecheck after removal | Pass | `api-e2e-evidence/r01-tsc.log` |
| R-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/standalone-agent-run-root --no-watch` | worktree root | TESTING Project Task unit layer + affected Team/Org/standalone units | Pass (99 files, 837 tests) | `api-e2e-evidence/r02-unit.log` |
| R-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution tests/integration/standalone-agent-run-root tests/integration/collaboration-definition-admission tests/integration/agent-org-execution --no-watch` | worktree root | Integration layer incl. `task-delegation-tool-lifecycle`, `native-root-termination` | Fail → 23 baseline failures in 4 files; after baseline fixes Pass (12 files, 95 tests) | `api-e2e-evidence/r03-integration.log`, `r03-integration-after-baseline-fix.log` |
| R-04 | Same 4 failing integration files on base `ace86bf1f` | `/Users/normy/autobyteus_org/autobyteus-worktrees/dtl-api-e2e-base` | Baseline comparison (rule 9) | Identical 23 failures on base | `api-e2e-evidence/r04-integration-base.log` |
| R-05 | `tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts` (in the REG-E2E serial run) | worktree root | Ungated tool-surface E2E | Pass (3/3) | `api-e2e-evidence/e2e-regression.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — multiple independently meaningful E2E cases across three roots, long-running (idle grace ≥ 60 s per lifecycle step) and several regression suites of several minutes each.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | New unit suite proves AC-001..005 per root with real factory/handles/mutators | Provider runtime mocked; dispatch and seed release driven directly; AC-004 member case driven through `TeamRun.postMessage`, not teammate delivery | Live API E2E per root |
| Changed-boundary execution directness | 75% | Real preparation owners and binding mutators | `delegate_task` dispatch, durability gate, MCP tools not exercised | Live API |
| Cross-boundary integration realism and mock gap | 70% | — | Provider activation and process lifecycle mocked | Scripted AGY runtime (real process per activation) |
| Environment, configuration, identity, and fixture fidelity | 75% | Real mutators per root kind | No real persisted reader on restore; no real launch configuration | Live API with saved tree |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Unit: shutdown/restore/legacy/failure | Real quiescence, DONE/reopen, root stop/restore not exercised | Live lifecycle |
| User-surface, browser, and desktop-shell confidence | 75% | `offline` snapshot status in unit | Root-view `agent_statuses` over WS not exercised; frontend unchanged | Live view snapshots; AC-007 user check |
| Durable regression coverage quality and relevance | 90% | Rebased suites; baseline fixes restore 23 previously failing integration tests (incl. lazy UI-started Team readiness) | No durable real-boundary test of the new behavior | Add gated E2E |

- Overall post-repository confidence: 76% (simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `No`
- Any applicable category below `90%`: `Yes` — all but durable regression
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real delegation dispatch, real teammate delivery path, real process lifecycle, persisted reader on restore

## Broader Validation Decision (Mandatory)

- Decision: `Required` (confirmed after repository execution: 76%)
- Selected execution mode: `Live API` + `Lifecycle` — gated scripted-AGY server E2E through the real Studio HTTP/WebSocket server, scoped MCP agent tools, Task services, root lifecycle owners and the real AGY backend (one CLI process per activation).
- Specific confidence gap: repository proof of AC-001..005 mocks the provider runtime and bypasses real dispatch (`delegate_task` tool, operation gate, durability event gate, seed acceptance), real process lifecycle and the persisted tree reader on restore.
- Why the selected mode can materially improve confidence: it enters through the real trigger (an agent calling `delegate_task` / `send_message_to` over MCP), observes real provider-session creation (process launch argv log + live processes), real saved trees and the root views' `agent_statuses` that drive the sidebar dots.
- Expected confidence after the selected validation: ≥ 95%
- Browser-specific decision and rationale: Not required. The frontend is unchanged and already renders `offline` as gray "Offline" for UI-started Teams; the server's root-view `agent_statuses`/status frames are the changed contract and are asserted directly. AC-007 (desktop app) is explicit user verification.

## Live Environment And Fixture Plan

- Startup order and commands: `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run <suite> --no-watch`
- Environment choices: idle grace stored at its 60 s minimum via the data dir `.env`; disposable `HOME`; `AGY_FAKE_CASE=linked_skills`; argv log per suite.
- Health / readiness checks: GraphQL responses; WS `CONNECTED` / view snapshot frames.
- Seed data / fixtures: GraphQL-created definitions/runs/Projects/Tasks; one saved-tree edit (legacy shape) on a stopped root.
- Test identities / auth: none required.
- Requirement-linked journeys: DTL-001..DTL-008 (ledger).
- Evidence to capture: argv launch log, live AGY process cwd list, saved tree member bindings, root view `agent_statuses`, status frames, tool results; JSON receipt via `DELEGATED_TEAM_LAZY_E2E_EVIDENCE_DIR`.
- Owned processes and temporary state: in-process server, AGY processes, temp data dir/HOME — all removed in `afterAll` with a leftover-process check.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| DTL-B01 | Run the new E2E against base `ace86bf1f` (copied test file in the base worktree) | The new E2E discriminates: on base every member is started at delegation | Base comparison only |
| DTL-P01 | Org-only temporary copies of the suite: (a) dump the lead's conversation/statuses on timeout; (b) call `send_message_to` through the lead's own scoped MCP session (`.agents/mcp_config.json`) to the not-started writer | Exact sender outcome and writer status for AC-004 | Diagnostic only |
| DTL-P02 | Org-only temporary copy skipping DTL-003 (`DTL_SKIP_MEMBER_FAILURE=1`) | Org DTL-005..007 evidence while DTL-003 fails | Diagnostic only |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-007 desktop app status | Explicit user verification by design | Low (frontend unchanged) | User check |
| `mixed-task-delegation.e2e.test.ts` | Requires LM Studio + Codex + Claude simultaneously | Low | None |
| AC-004 member failure in Agent/Team roots | Catalog copies use the delegator's configuration for every member, so no real-use member-specific start failure exists there; Org placements cover the shared handle path | Low | None |
| Whole-process app restart | Root stop + restore in the same server process re-reads the saved tree (proven by the edited legacy binding being honored); a cold process restart was not run this round | Low | Consider on rerun |
| Real-provider (Claude/Codex) delegated Team | Not run this round; scripted AGY proves the shared activation path with a real process per activation | Low | Consider on rerun |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| AC-004 / REQ-005 member branch fails on real teammate delivery: a member that cannot start makes the sender's `send_message_to` throw `MCP error -32603: Internal error` (cause hidden), and the member stays `offline` (no `error` status). Teammate delivery reaches `ConfiguredAgentExecutionHandle.reserveInput`, which has no start-failure handling; only `postMessage` (operator/command path) has it. Design DS-002 assumed the `postMessage` catch path | `Local Fix` (preliminary) | DTL-003; `dtl-org-member-failure-probe.log`; `configured-agent-execution-handle.ts:120-147` | Implementation Engineer (subject to failure-origin review) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (add E2E suite; TESTING.md entry; possible baseline fixes)
- Post-repository confidence: 76%
- Broader validation decision: `Required` (executed)
- Reroute Required Before Validation Execution: `No` (reroute after execution: AC-004 member branch)
- Recommended Owner If Reroute Required: Implementation Engineer (preliminary `Local Fix`)
- Notes: Final result and confidence are in the execution coverage report.
