# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/requirements-doc.md` (SR-002, approved 2026-10-08)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/design-spec.md` (SR-003)
- Supplemental Task Artifacts: `handoff-architecture-design-complete.md` (same folder)
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: `Implementation Complete` from `implementation_engineer` (IR-001, commit `fd5f32ba5`)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

An archived or deleted run that is open in the middle area must close to the existing `/workspace` empty view, no other run may be opened in its place, and the run must never return to the sidebar as a `local` row — for standalone agent, team (incl. member views) and Agent Org runs, and after window reload and app restart (REQ-001..REQ-004, REQ-006, REQ-007). A stale chat address of an archived stopped agent run shows the same empty view (REQ-008, DEC-002). Running-run protection is unchanged (REQ-005). Design SR-003: (1) `removeRun` / `removeTeamContext` clear selection instead of auto-selecting; (2) `pages/chat.vue` leaves to `/workspace` when the displayed stored run's context vanishes; (3) `openAgentRun` throws `ArchivedAgentRunOpenError` for resume config `reason === 'RUN_ARCHIVED' && !isActive`; (4) Org unchanged. No server/API/persistence change.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-006.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 Draft discard on `/chat?id=temp-*` while a stored run is loaded (real trigger: the draft row `×` in the sidebar, `agentRunStore.closeAgent`). The design changed `removeRun` for this caller too (RSK-001).
  - SCN-A2 Archive of a run while a *different* run kind is open (e.g. agent archived while a team view is open) — covered by REQ-006 semantics; probed live opportunistically.
  - SCN-A3 Server contract: archiving a stopped agent run makes its resume config report `RUN_ARCHIVED` + `isActive:false`. The client safety net now depends on it, but the design's claim that "the coordinator spec will catch it" is incorrect (that spec mocks resume config).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 agent open-run archive (row / Archive all) | Changed | REQ-001..003, AC-001/002/007 | Component + real-store integration + live desktop |
| BEH-002 team / member view archive | Changed | AC-003 | Store + integration + live (UNK-001 was never observed live before this ticket) |
| BEH-003 Org archive | Preserved | AC-004 | Existing panel/composable specs + live regression |
| BEH-004 running-run refusal | Preserved | AC-006 | Existing specs + live (not exercised live by implementation) |
| BEH-005 reload / restart / stale address | Changed | AC-005, AC-008 | Chat + coordinator specs, server contract test, live reload/restart/stale address |
| BEH-006 open-run delete | Changed | AC-009 | Integration spec + live (agent, team, member view, Org) |
| `removeRun` auto-select removal for draft discard | Changed (side effect) | Design Risks; RSK-001 | Chat spec (temp → New chat) + live SCN-A1 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — (server read-only dependency on `RUN_ARCHIVED`) | New server contract unit test | — | — |
| API / transport / contract | Yes (consumed, not changed) | `getAgentRunResumeConfig.modelConfigEditability.reason` read by the client | New server test; coordinator spec (mocked) | Real GraphQL → client chain for a stale archived address | Project desktop validation |
| Frontend component / state | Yes | chat.vue watcher/error mapping; context stores; open coordinator | chat/coordinator/store specs + integration spec | Route reaction ordering with real router + layout | Desktop |
| Browser integration / user journey | Yes | Sidebar action → empty view | None durable | Full journey incl. confirm dialogs, toasts, sidebar rows | Desktop |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Hash-routed renderer | Specs | Real router / hash route reload | Desktop |
| Desktop shell / Electron-specific integration | Partly | Window reload and app restart restore (route preserved on reload) | None | Reload / restart behavior | Desktop (isolated instance `restart`) |
| Process / lifecycle | Partly | App restart | None | — | Desktop |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | Fake AGY CLI only for run creation | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears` (branch `codex/archived-open-run-disappears`, HEAD `fd5f32ba5`)
- Project type: pnpm monorepo; Nuxt/Vue renderer + Electron shell (`autobyteus-web`), Node/TypeGraphQL server (`autobyteus-server-ts`).
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/TESTING.md` (no closer `TESTING*.md` under `autobyteus-web/`).
- Conflicting, missing, or unclear instructions: TESTING.md's web row does not mention that 7 web spec files need built workspace packages / Prisma client (implementation note; observed environment already prepared in this worktree).
- Required secrets: `N/A` (no provider calls; fake AGY CLI).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, path choice, rules | Web: `pnpm -C autobyteus-web test:nuxt <path> --run`; server single file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; full real-product journey → isolated desktop instance of a worktree build; rules 1–9 (worktree build, never the user's app, stop what you start, assertions first) |
| `docs/isolated-app-instances.md` | Isolated instance lifecycle and control | `pnpm --silent isolated-app start --from-worktree`, `restart <id>`, `stop <id>`; control with browser-automation `CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1` |
| `autobyteus-web/AGENTS.md` | Web package rules | Always `--run`; never `git add .` |
| `tickets/done/workspace-history-group-archive/api-e2e-evidence/live-seed.mjs` | Prior proven seed path | GraphQL seed with fake AGY CLI via data-root `.env` (`ANTIGRAVITY_CLI_COMMAND`); runs live on creation, `terminate*` to stop |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated desktop instance (worktree build) | repo root | `pnpm --silent isolated-app start --from-worktree` (build verified to contain the fix: `app.asar` has `ArchivedAgentRunOpenError`; source mtimes 15:33–15:36 < build 15:46; working tree clean vs HEAD) | Own control/server ports and temp data root | `start` waits for `/rest/health` + window | `pnpm --silent isolated-app stop <id>` (data root removed) |
| Browser automation | `/Users/normy/autobyteus_org/autobyteus_mcps/browser-automation` | CLI launcher with attach-only | Loopback CDP | `list-tabs` | n/a |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/team/Org definitions, stopped and live runs | Temporary seed script (adapted from prior ticket) through the instance GraphQL on `127.0.0.1` only | Private data root; fake AGY CLI; no model calls | Removed with the data root; seed script and output kept in `api-e2e-evidence/` |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/pages/__tests__/chat.spec.ts` (4 new cases + 1 assertion) | Removed stored run → `/workspace`, no reopen, selection cleared; other run removed → no change; temp removed → `/chat`; stale archived address → `/workspace` | AC-001, AC-007, AC-008, SCN-A1 | Still Valid | Read; pass | Keep |
| `autobyteus-web/services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts` (+3) | Archived & stopped → throws before any side effect; archived & active → opens; stopped not archived → opens | REQ-008, design DS-003 | Still Valid | Read; pass | Keep |
| `autobyteus-web/stores/__tests__/agentContextsStore.spec.ts` (rewritten case) | Removing the selected run clears selection | REQ-002 | Still Valid (old auto-select assertion correctly replaced) | Diff | Keep |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` (+2) | Removing selected team clears selection; other team stays | AC-003 | Still Valid | pass | Keep |
| `autobyteus-web/stores/__tests__/runHistoryOpenRunRemoval.integration.spec.ts` (new, 7) | Real run-history/context/selection stores; Apollo stubbed | AC-001..003, AC-007, AC-009 | Still Valid | Read; pass | Keep |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (Org archive/delete, running refusal) | Org route leave; "Stop running runs first." | AC-004, AC-006 | Still Valid | grep | Keep |
| `composables/__tests__/useWorkspaceHistoryGroupArchive.spec.ts` | Group archive blocked by running runs; Org route leave | AC-004, AC-006 | Still Valid | grep | Keep |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Server archive writes `archivedAt`, hides from listing | ASM-001 | Still Valid / Out Of Scope for change | Read | Keep |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-catalog-service.test.ts` | Catalog mutations | none (neighbouring suite) | Needs Update (baseline fix; revised during execution) | Failed alone with 5 s timeouts and a half-loaded module; passes with a 60 s timeout | Stub `collaborationRoots` in the shared builders; separate baseline commit (TESTING.md rule 9) |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | Server contract: archive of a stopped agent run → resume config `isActive:false`, `reason:'RUN_ARCHIVED'`; unarchived stopped → `reason:null`; archived active → `isActive:true` | REQ-008, AC-008, design "Key Tradeoffs" (reuse of `RUN_ARCHIVED`) | `autobyteus-server-ts/tests/unit/run-history/services/agent-run-resume-config-service.test.ts` (new; real catalog + metadata/index stores in a temp dir) | The client safety net now depends on this field; no server test pinned it for agent runs (only Org config). The coordinator spec mocks it, so a server-side change would go unnoticed. |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| BASE-001 | `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-catalog-service.test.ts` | Inject a `collaborationRoots` stub in `buildService` / `buildServiceWithIndexStore` | TESTING.md rule 9 (fix baseline failures) | Unrelated to the ticket; separate commit labelled baseline fix |

## Durable Coverage To Remove

None (the implementation already replaced the obsolete auto-select assertion in `agentContextsStore.spec.ts` / `agentTeamContextsStore.spec.ts`; reviewed as correct per design Removal Plan).

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt pages/__tests__/chat.spec.ts services/runOpen/__tests__ stores/__tests__/agentContextsStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/runHistoryOpenRunRemoval.integration.spec.ts --run` | worktree root | Changed/new web specs | Pass (9 files, 68 tests) | console |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-resume-config-service.test.ts --no-watch` | worktree root | API-001 server contract | Pass (2 tests) | console |
| 3 | `pnpm -C autobyteus-web test:nuxt --run` | worktree root (packages prebuilt in this worktree) | Full web renderer regression | Pass (587 passed, 2 skipped files; 3985 tests) | `api-e2e-evidence/web-full-suite.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` | worktree root | Neighbouring server run-history suites with the new test | Fail (baseline, unrelated) → Pass after BASE-001 (47 files, 233 tests) | `api-e2e-evidence/server-run-history.log` |
| 5 | `pnpm -C autobyteus-web guard:web-boundary` | worktree root | Web boundary rule | Pass | `api-e2e-evidence/guard-web-boundary.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — multiple independent live desktop journeys (agent/team/member/Org × archive/Archive all/delete, reload, restart, stale address, running refusal) with interruption risk.
- Canonical ledger path: `api-e2e-test-case-ledger.md` (same folder).

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | All ACs have spec-level assertions; integration spec uses real stores | AC-005 (reload/restart) and the UI outcome (empty view, no `local` row rendered) not proven by repository tests | Live desktop |
| Changed-boundary execution directness | 85% | Changed functions executed directly | Chat page tested with mocked router/navigation service | Live desktop |
| Cross-boundary integration realism and mock gap | 75% | Server contract pinned separately | No test joins real GraphQL → coordinator → chat route | Live stale address |
| Environment, configuration, identity, and fixture fidelity | 80% | Real stores, temp-dir server stores | Synthetic contexts | Live seeded runs |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Temp/promotion/other-run cases, active archived | Reload/restart, running refusal unchanged only by existing specs | Live |
| User-surface, browser, and desktop-shell confidence | 50% | None from repository | Entire rendered journey | Live desktop |
| Durable regression coverage quality and relevance | 92% | Specs fail on revert (implementation evidence: 10 cases), new server contract test | Rendered journey not durable (acceptable; probe-style durable E2E would be disproportionate for Small/Low) | — |

- Overall post-repository confidence: 77%
- Calculation method: simple average of the 7 categories (539/7).
- Every critical acceptance criterion directly proven: `No` (AC-005 and rendered outcomes)
- Any applicable category below `90%`: `Yes` — all except durable regression quality
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: rendered journey, reload/restart, real route reaction timing (flash of "chat not found" or spinner), team member view.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Project Desktop Validation` (isolated desktop instance of the worktree build)
- Specific confidence gap addressed: rendered outcome of every AC, reload/restart (shell), real GraphQL → coordinator → chat stale-address chain, team member view, running refusal, draft discard.
- Why the selected mode can materially improve confidence: TESTING.md maps "a full real-product journey" and app restart to an isolated desktop instance; it exercises the real router, server and shell.
- Expected confidence after the selected validation: ≥ 95%
- Browser-specific decision and rationale: browser Back in the web build is the same `ensureRunOpen` path as a hash-route stale address; the desktop instance is the primary product. A web-build Back probe is not added (the stale-address case exercises the same code path through the real router); recorded as residual.
- If `Blocked`: N/A

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the Nuxt renderer (hash routes).
- Guidance used: TESTING.md, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: sidebar actions, route reaction, empty view.
- Shell-specific or lifecycle behavior: window reload (keeps hash route), app restart (default route).
- Chosen approach: isolated instance `--from-worktree`, browser-automation attach-only, GraphQL seed with fake AGY CLI.
- Effect on any already-running desktop application: `None` (separate ports/data root; another worktree's stopped record `iso-63369-6c20` is not touched).
- Behavior not directly proven: web-build browser Back (same code path).

## Live Environment And Fixture Plan

- Startup: `pnpm --silent isolated-app start --from-worktree` → add `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` to `<dataRoot>/server-data/.env` → `isolated-app restart <id>` → seed via GraphQL.
- Seed: workspace; agents "Open Agent" (3 stopped), "Keeper Agent" (1 stopped, 1 live), "Bridge Lead"; "Bridge Team" (3 stopped + 1 live); "Delivery Org" (2 stopped + 1 live).
- Evidence: DOM/state checks via `run-script` (hash, empty-view text, sidebar row ids/titles, `local` badge, selection store via Pinia when reachable), GraphQL listing/resume-config queries, screenshots as support.
- Cleanup: `isolated-app stop <id>` (owned data root removed); temporary scripts kept in `api-e2e-evidence/`.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-01..LIVE-12 | Isolated desktop instance + browser automation + GraphQL seed | AC-001..AC-009, SCN-A1, SCN-A2 in the real product | Requires a packaged build and graphical session; the repo has no generic archive journey probe and adding one is disproportionate for a Small/Low fix. Durable store/component/server coverage protects the logic. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Browser Back in the web (`pnpm dev`) build | Same `ensureRunOpen` → coordinator path as the hash-route stale address exercised live | Low | None |
| LIVE-10 draft discard live (SCN-A1) | On desktop a `temp-*` row exists only during a first send (or on mobile); "New run with this agent" opens New chat without one | Low | Covered by `chat.spec.ts` (temp removal → `/chat`) |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Design "Key Tradeoffs" says the coordinator spec would catch a server editability change; it mocks resume config | Local Fix (test coverage) — closed by API-001 | coordinator spec mocks `loadCandidate` | api_e2e_engineer (done) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-001 added)
- Post-repository confidence: 77%
- Broader validation decision: `Required` — isolated desktop instance (executed; final confidence 95%, see execution report)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: API-001 was written right after the repository inventory; this investigation records its decision basis.
