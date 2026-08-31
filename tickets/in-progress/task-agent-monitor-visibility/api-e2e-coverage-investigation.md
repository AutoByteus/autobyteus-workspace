# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/deterministic-reproduction-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-evidence/task-monitor-browser-check.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-evidence/task-selected-desktop.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-evidence/task-selected-1024.png`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `/code_reviewer` CRR-003 Fail / Local Fix on the proportional durable-test review: correct CR-TF-001's tautological request exclusion and remove CR-TF-002's dead fixture query counter, then rerun the affected task-monitor probe.
- Prior Investigation Reviewed: `Yes`; API-REV-001's coverage decisions and Pass / 97.6% execution remain valid. Only the two bounded durable-test findings require rework and focused rerun.
- Latest Authoritative Investigation: this canonical file.

## Current Requirement And Design Basis

The critical behavior is an exact-run frontend invariant. A mounted/live task shell is not retained-projection authority merely because its exact `agentRunId` exists. Selecting a task must request, validate, and atomically apply `GetTeamMemberRunProjection(teamRunId, agentRunId)` before committing focus/current selection, while failure leaves the previous coherent surface selected. Header, monitor, Activity, lifecycle/execution labels, and execution rows must then describe the same exact task run without copying data from the configured same-address AgentRun. Content visibility is independent of the task lifecycle or the collaboration tool that emitted it.

R-004/AC-009 additionally require structural recovery convergence. A supported Team snapshot/reconnect invalidates retained projection authority and reconciles the focused run. If a later `TASK_EXECUTION_SETTLED` removes the focused task, focus repair selects a visible fallback, navigation refreshes from `TeamExecutionViewState`, and the fallback projection enters the existing row-scoped loading/error/success reconciliation rather than rendering an unauthoritative empty/stale context. `IR-002`/`CRR-002` added and reviewed this exact effect ordering; API-REV-001 proved the complete browser-executed lifecycle, and API-REV-002 rechecked it after the durable assertion cleanup.

The approved persisted-data result is `Directly Usable — No Migration`: existing execution trees, task records, exact IDs, conversation, and Activity are consumed without rewrite. Server prompt, tool choice, task service, persistence, and lifecycle behavior must remain unchanged.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / R-001–R-003 / AC-001–AC-003 | Changed | Requirements and SR-005 deterministic reproduction | Directly exercise mounted exact task selection, exact query identity, loading-before-focus, retained conversation/Activity commit, and one coherent focused identity. |
| BEH-002 / AC-006 / AC-010 | Changed | Design DS-001/DS-002 and implementation handoff | Preserve durable success, conflict/failure, retry, and authoritative-empty checks; browser proof should observe honest loading/success and existing unit/component coverage supplies failure/empty detail. |
| BEH-003 / R-004 / AC-009 / CR-MP-001 | Changed | IR-002 and CRR-002 | Add browser-executable durable coverage for snapshot invalidation followed by focused task settlement, exact fallback focus repair, and fallback projection reconciliation. |
| BEH-004 / R-005–R-006 / AC-004–AC-005/AC-011 | Added | UI/UX spec and implementation handoff | Exercise visible Task marker, combined lifecycle/execution text, keyboard selection, and focus semantics in production components. |
| BEH-005 / R-007–R-008 / AC-008/AC-012–AC-014 | Preserved/Changed presentation | User-refined scope and node-8001 evidence | Prove retained messages/tool output remain visible while lifecycle truth is not inferred from ordinary wording; confirm no backend diff. |
| BEH-006 / R-009 / AC-007/AC-015 | Preserved with stronger isolation | Requirements and implementation browser evidence | Exercise exact task-versus-configured identity/content separation and direct use of retained node-8001 data. |
| PB-001 | Preserved | Design DS-008 and focused standalone coverage | Re-run focused standalone open/keep-live tests; no desktop-shell execution is needed because the changed behavior is renderer/client state. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Backend lifecycle and projection production are explicit no-change boundaries. | Existing server remains unchanged; frontend exact-query mocks and node-8001 retained data. | None beyond verifying the existing contract is consumed without mutation. | Live API/browser against node 8001. |
| API / transport / contract | Yes (consumer only) | Existing exact member-projection GraphQL contract and Team stream snapshot/task messages. | Hydration and stream unit specs. | Unit mocks do not prove real Apollo request variables or browser runtime sequencing. | Browser fixture with intercepted GraphQL plus live node-8001 query traffic. |
| Frontend component / state | Yes | Team view focus, run-history navigation projection, Activity store, hydration attempt state, header/monitor/feed rows. | 27 focused unit/component/integration spec files. | Cross-component rendering and async focus/loading sequence need browser observation. | Self-starting browser E2E. |
| Browser integration / user journey | Yes | Mounted task selection and stream recovery/settlement surface. | Prior implementation browser evidence used retained data but no fresh formal settlement. | Reconnect/snapshot -> settlement -> fallback projection was not browser-executed. | Durable Chromium E2E plus targeted node-8001 browser journey. |
| Authentication / session / permissions | No | No auth/session change. | N/A. | N/A. | None. |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer shared with Electron. | Component tests and prior browser captures. | Electron shell itself adds no material behavior to this state transition. | Browser preferred per project/skill guidance. |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or native boundary changed. | Frontend diff and implementation handoff. | None material. | None; actual desktop execution not justified. |
| Process / lifecycle | Yes | Team stream synchronization, snapshot invalidation, task settlement, focus repair. | TeamExecutionViewState and TeamStreamingService specs. | Complete async projection request and rendered fallback transition not yet proven in browser. | Browser lifecycle fixture using real service/store/component code. |
| Persisted-data transition | Yes (direct-read proof only) | Existing retained exact task and configured-parent records are consumed as-is. | Node-8001 evidence and browser implementation check. | Independent API/E2E confirmation still required. | Live node-8001 browser/API journey. |
| Worker / queue / distributed coordination | No | No worker/queue logic changed. | N/A. | N/A. | None. |
| External integration | No | Docker node 8001 is a validation backend, not a changed external integration. | Health endpoint and retained evidence are available. | Node may not contain a newly active formal task during this round. | Existing retained-data journey; deterministic browser lifecycle fixture for settlement. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue 3/Pinia renderer; Vitest; self-starting Chromium browser probes through Playwright Core; optional Electron wrapper; existing GraphQL and Team WebSocket contracts.
- Conflicting, missing, or unclear project instructions: repository root has no `AGENTS.md`; closest applicable `/autobyteus-web/AGENTS.md` is authoritative. The README documents browser probes but does not currently document the background-contention script individually. Standard Nuxt typecheck is already known to be blocked by the installed `vue-tsc`/TypeScript export mismatch.
- Required environment variables or secrets available: `N/A` for deterministic fixtures; `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001` for live browser validation. No secret value is required. Docker node 8001 health returned HTTP 200 during discovery.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/autobyteus-web/AGENTS.md` | Closest repository instruction | Use `pnpm test:nuxt ... --run` to avoid watch mode; colocated tests are primary; never broad-stage with `git add .`/`-A`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/autobyteus-web/README.md` | Frontend development/test/E2E guide | Browser dev uses `pnpm dev`; `BACKEND_NODE_BASE_URL` controls the proxy; Playwright Core probes should use an owned port/output directory and browser executable discovery; browser is preferred for web-equivalent behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/autobyteus-web/package.json` | Authoritative scripts | `test:nuxt`, `build`, and repository E2E scripts; add a named task-monitor probe script if durable coverage is added. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/autobyteus-web/nuxt.config.ts` | Runtime endpoints | Development `/graphql` and `/rest` proxy to `BACKEND_NODE_BASE_URL`; Team WebSocket defaults derive from it. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` | Existing self-starting durable browser harness | Installs/removes one fixture page, selects a free loopback port, launches owned Nuxt/Chromium, writes JSON/screenshots/logs, and cleans owned resources. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-notes.md` | Live node setup | Node 8001 plus Nuxt proxy is the supported reported-data path; exact task/root IDs and existing retained data are recorded. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| SDK contracts | repository root | `pnpm --filter @autobyteus/application-sdk-contracts build` | Generated ignored `dist` is needed by frontend checks. | Build exit 0. | Remove only ignored output if created by this round and not pre-existing; record actual ownership. |
| Focused Nuxt checks | `autobyteus-web` | `pnpm test:nuxt <paths> --run` | No backend or secret. | Vitest summary. | Process exits. |
| Self-starting browser probes | `autobyteus-web` | named `pnpm test:e2e:* -- --output-dir <ticket evidence>` | Probe owns temporary fixture route, free port, Nuxt process, and Chromium context. | Probe route visible and control installed. | Harness removes route, closes browser, stops its process; verify no route/process remains. |
| Live node-8001 browser renderer | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001 pnpm dev --host 127.0.0.1 --port <owned-free-port>` | Use retained test data only; do not mutate Docker storage or launch stochastic new work unless necessary. | Node `/rest/health` 200; Nuxt route 200. | Stop only the owned Nuxt process/browser. Node 8001 is not owned and must remain running. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Deterministic task and fallback projections | New fixture using `currentTeamTestFixtures`, actual TeamStreamingService/store/components, and Playwright-intercepted exact GraphQL | Synthetic run IDs and content markers; no persistent backend mutation. | Fixture page removed by harness; JSON/log/screenshots retained in ticket evidence. |
| Exact retained node-8001 task/configured identities | Existing `nested_classroom_test_team_3d07...` data from approved evidence | Read-only browser open/select/query; no migration/rewrite. | Browser state/process cleaned; Docker data retained untouched. |
| Browser executable | Existing Google Chrome at the documented macOS candidate or explicit flag | No download/install required. | Browser context/process closed by harness. |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; implementation handoff `Persisted Data Transition Check`; R-009 and AC-007/AC-013/AC-015.
- Representative existing-data setup and required behavior: node-8001 configured parent and task AgentRuns at the same logical address with distinct exact IDs, statuses, conversations, Activity, and task lifecycle records.
- Evidence for the approved direct-use outcome: the read-only API-E2E-LIVE-001 browser journey opened the retained Team in the current frontend, selected task `student_one_8e5...` and configured parent `student_one_88bc...` repeatedly, observed exact projection request variables and distinct content/status/counts, and performed no storage transformation.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `services/runHydration/__tests__/teamMemberProjectionHydrationService.spec.ts` | Exact single-flight mounted projection, Activity/conversation atomicity, Activity-only races, context replacement | R-002–R-003; AC-003/AC-006; DS-001/DS-002 | Still Valid | Assertions match approved authority/CAS behavior. | Re-run. |
| `services/runOpen/__tests__/teamMemberInspectionCoordinator.spec.ts` and `stores/__tests__/runHistorySelectionActions.spec.ts` | Hydration-before-focus, prior-selection preservation, retry path, mounted-vs-fresh branch | R-001–R-003; AC-001–AC-003/AC-006 | Still Valid | Directly protects atomic selection. | Re-run. |
| `services/runHydration/__tests__/teamRunContextHydrationService.spec.ts` and `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` | Fresh exact/fail-fast target, best-effort nonfocus, conflict/no partial mount, settled historical task | R-002–R-004/R-009; AC-002/AC-006/AC-007/AC-015 | Still Valid | Matches DS-007. | Re-run. |
| `stores/__tests__/agentActivityStore.spec.ts` and run projection hydration specs | Revision ownership, atomic replacement, ABA, retention, projection adapters | R-003/R-007; AC-003/AC-008 | Still Valid | Direct unit evidence for content integrity. | Re-run. |
| `services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | Snapshot invalidation/reconcile, exact task identities, settlement focus repair | R-001/R-004/R-009; AC-009/AC-015 | Still Valid | CRR-002 reviewed effect ordering. | Re-run. |
| `services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Activation no-steal and settlement dispatch of repaired fallback identity | R-004; AC-009; CR-MP-001 | Still Valid | IR-002/CRR-002 focused assertions. | Re-run, but do not treat mocked store dispatch alone as complete browser proof. |
| component/presentation specs (`WorkspaceTransientExecutionRow.task-monitor`, `TeamWorkspaceView`, `AgentTeamEventMonitor`, `ActivityFeed`, `taskDelegationPresentation`) | Task marker, combined status, exact conversation identity, loading/error/retry/true-empty | R-005–R-010; AC-004–AC-013 | Still Valid | Assertions align with approved UI/UX wording and accessibility semantics. | Re-run. |
| `services/runOpen/__tests__/agentRunOpenCoordinator*.spec.ts` and `runContextHydrationService.spec.ts` | PB-001 keep-live and replacement-before-selection/stream | PB-001 / DS-008 | Still Valid | Preserved behavior boundary. | Re-run. |
| `tests/e2e/team-task-conversation-probe.mjs` + fixture | Formal task history/status/filtering, ordinary Team messages, keyboard/localization | R-005/R-008; parts of AC-004/AC-011/AC-013 | Still Valid | Uses current `TeamExecutionViewState`; concerns the Team overview/task-detail pane, not the changed run monitor. | Do not use as substitute for exact monitor lifecycle coverage; no edit planned. |
| `tests/e2e/background-agent-renderer-contention-probe.mjs` + `fixtures/background-agent-renderer-contention.page.vue` / BG-BROWSER-004 | Browser responsiveness and stable/transient execution hierarchy/focus under load | R-001/R-009 adjacent; performance regression protection | Still Valid (after required update) | Initial investigation found the removed pre-view context shape and `applyRunNavigationTeamFocus`; the completed edit now uses `buildTestTeamContext`, exact `view.focusAgent(agentRunId)`, current addresses/IDs, and derived topology. Final 12-scenario browser run passed. | Keep the updated probe; no scenario removal. |
| `tests/e2e/task-agent-monitor-visibility-probe.mjs` + fixture / API-E2E-TMV-001/002 | Exact mounted task hydration plus snapshot invalidation -> focused task settlement -> fallback projection hydration | R-001–R-010; AC-001–AC-013/AC-015; CR-MP-001 | Still Valid (added this round) | New durable browser coverage uses the production service/stores/components and exact GraphQL variables; both scenarios passed. | Keep and route through proportional test-code review. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/fixtures/background-agent-renderer-contention.page.vue` BG-BROWSER-004 setup/focus action | A plain context's mutable `focusedMemberRouteKey` plus `applyRunNavigationTeamFocus(teamRunId, memberRouteKey)` can authoritatively select a Team member. | The reviewed design removed split focus authority. `AgentTeamContext` now owns only `view`, exact focus is an `agentRunId`, and navigation is derived from view state. | R-001–R-004, design DS-001/DS-003, implementation legacy-removal check, CRR-002. | Keep BG-BROWSER-004 but update it to current view-owned exact focus and navigation derivation; add the new lifecycle browser probe for requirement-direct proof. | N/A; the wider contention probe remains valuable and should not be deleted. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-TMV-001 | Exact mounted task selection performs the exact GraphQL request before focus commit and renders retained task conversation/tool Activity with Task + combined status | R-001–R-003/R-005–R-007/R-009–R-010; AC-001–AC-005/AC-007–AC-008/AC-011–AC-013 | `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs` and `fixtures/task-agent-monitor-visibility.page.vue` | The original defect existed only in an already-open browser flow and unit mocks do not prove cross-component runtime behavior. |
| API-E2E-TMV-002 | Snapshot/reconnect invalidates projections, reconciles focused task, then settlement repairs focus to configured fallback and triggers row-scoped exact fallback loading/success with distinct content | R-004/R-009/R-010; AC-006/AC-007/AC-009; CR-MP-001 | Same probe/fixture | This is the explicit unexecuted CRR-002 residual risk and must be durable because it is a supported lifecycle regression boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-BG-004 | `tests/e2e/fixtures/background-agent-renderer-contention.page.vue` + BG-BROWSER-004 | Replace legacy context creation/member-route focus mutation with current `buildTestTeamContext`/`TeamExecutionViewState` exact-run focus and topology refresh. | R-001/R-004/R-009; design removal plan; implementation legacy check. | Preserve performance, hierarchy, upload, voice, retention, and mobile assertions; this is a fixture modernization, not production behavior change. |
| API-E2E-SCRIPT | `autobyteus-web/package.json` (and README test command index if proportionate) | Add named script for the new focused probe. | Repository execution discoverability. | Return all repository-resident durable edits through code review. |

## Durable Coverage To Remove

None. The obsolete focus assertion is replaced inside the still-valid contention scenario; deleting the entire probe would remove unrelated durable responsiveness and hierarchy coverage.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --filter @autobyteus/application-sdk-contracts build` | repository root | Required generated frontend contract setup | Pass | `tickets/in-progress/task-agent-monitor-visibility/api-e2e-evidence-contract-build.log` |
| 2 | `pnpm test:e2e:task-agent-monitor-visibility -- --output-dir ../tickets/in-progress/task-agent-monitor-visibility/api-e2e-evidence/task-agent-monitor-visibility` | `autobyteus-web` | API-E2E-TMV-001/002 exact hydration, DOM semantics, snapshot reconciliation, settlement focus repair, fallback projection | Pass (2/2) | `api-e2e-evidence/task-agent-monitor-visibility/evidence.json`, screenshots, `nuxt.log` |
| 3 | `pnpm test:e2e:background-contention -- --output-dir ../tickets/in-progress/task-agent-monitor-visibility/api-e2e-evidence/background-contention` | `autobyteus-web` | Updated current-model fixture, focus/hierarchy under load, retention, upload/voice responsiveness, mobile | Pass (12/12) | `api-e2e-evidence/background-contention/evidence.json`, screenshots, `nuxt.log` |
| 4 | dynamically selected 27 changed/relevant spec files via `pnpm test:nuxt <paths> --run` | `autobyteus-web` | Focused implementation and preserved-boundary checks | Pass (27 files, 258 tests) | `api-e2e-evidence/focused-vitest.log` |
| 5 | `pnpm test:nuxt --run` | `autobyteus-web` | Broad frontend regression | Expected baseline exception: 436 files/2433 tests passed; one unrelated fixed-px typography audit failed with the same 14 pre-existing violations | `api-e2e-evidence/full-nuxt-suite.log` |
| 6 | `pnpm build` | `autobyteus-web` | Nuxt production bundle and prerender integration | Pass | `api-e2e-evidence/nuxt-build.log` |
| 7 | `pnpm exec nuxi typecheck` | `autobyteus-web` | Typechecking environment availability | Blocked by known tooling mismatch before project checking: `ERR_PACKAGE_PATH_NOT_EXPORTED` for `typescript/lib/tsc` | `api-e2e-evidence/nuxt-typecheck.log` |
| 8 | syntax, diff, backend-boundary, removed-symbol, fixture-cleanup, and node-health guards | repository root | Clean coverage code, no removed API, no backend change, owned-resource cleanup | Pass | `api-e2e-evidence/source-guards.log` |
| 9 | `pnpm test:e2e:task-agent-monitor-visibility -- --output-dir ../tickets/in-progress/task-agent-monitor-visibility/api-e2e-evidence/task-agent-monitor-visibility` | `autobyteus-web`; API-REV-002 focused rerun after CR-TF-001/002 fixes | Exact complete request sequence and task/snapshot/settlement/fallback lifecycle | Pass (2/2) | updated `api-e2e-evidence/task-agent-monitor-visibility/evidence.json`, screenshots, `nuxt.log` |
| 10 | syntax, dead-counter absence, exact-evidence-sequence, cleanup, and diff guards | repository root | CR-TF-001/002 local-fix enforcement | Pass | `api-e2e-evidence/api-rev-002-test-fix-guards.log` |

The first attempted dynamic focused invocation was issued after changing into `autobyteus-web`, so its root-relative diff selection was empty and Vitest correctly ran the full suite. The output was retained as the broad-suite result, and the intended 27-file command was then run separately and passed. Pre-final probe dry runs exposed only test-harness assumptions (an unscoped duplicate text locator, one-time Vite optimization noise, and stale hierarchy defaults); the durable tests were corrected before the authoritative passing executions.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | Focused 258-test pass plus API-E2E-TMV-001/002 directly cover exact selection, rendering, status, identity, snapshot, settlement, and fallback; source guards cover no-backend/legacy constraints. | Retained persisted records were not yet independently reopened in this post-repository score. | Read-only node-8001 browser journey. |
| Changed-boundary execution directness | 97% | Chromium executed actual TeamStreamingService, Pinia stores, Apollo hydration, member tree, workspace monitor, and Activity feed. | Projection responses were deterministic interceptions. | Correlate current frontend with a real node projection. |
| Cross-boundary integration realism and mock gap | 92% | Browser boundary and real Apollo request path were executed, including exact request variables and asynchronous loading. | Deterministic lifecycle fixture emulates WebSocket messages and GraphQL payloads rather than relying on nondeterministic live settlement. | Exercise existing data through node 8001. |
| Environment, configuration, identity, and fixture fidelity | 94% | Current project fixtures, compound root/run IDs, production build, real Chrome, and owned Nuxt processes passed. | Synthetic lifecycle IDs do not alone prove direct use of persisted historical data. | Select recorded exact task/configured identities on node 8001. |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Existing retry/conflict/empty/race tests passed; browser snapshot invalidation and settlement fallback loading/success passed. | No fresh stochastic live formal settlement, intentionally excluded. | None needed if deterministic lifecycle and live retained data agree. |
| User-surface, browser, and desktop-shell confidence | 97% | Semantic DOM assertions, keyboard selection, honest busy/selected states, combined status, conversation/Activity, responsive contention/mobile probe, and screenshots passed in Chrome. | Electron shell host was not launched; no shell boundary changed. | Not material for this renderer-only change. |
| Durable regression coverage quality and relevance | 96% | Stale coverage was modernized rather than discarded; two requirement-linked deterministic browser scenarios were added with owned cleanup and named commands. | Proportional code review is still required for the durable changes. | Code reviewer review. |

- Overall post-repository confidence: `95.7%`
- Calculation method: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `Yes`, across focused repository coverage and the durable browser boundary.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.
- Material residual risks: only the deterministic fixture's server-emulation gap and independent direct-read confirmation for recorded node-8001 data remained; therefore broader live browser validation was still executed as planned.

## Broader Validation Decision (Mandatory)

- API-REV-001 decision and outcome: `Required`, completed successfully through deterministic Browser lifecycle execution plus read-only live node-8001 browser/API correlation.
- API-REV-002 additional decision: `Not Required`.
- Selected execution mode for API-REV-002: focused repository-resident Browser probe rerun only.
- Specific confidence gap or residual risk addressed: CR-TF-001 weakened durable rejection of a wrong configured-run projection request, and CR-TF-002 exposed a dead non-authoritative counter. Both were test-code quality issues; neither changed product behavior, runtime configuration, live data, or the already-passing broader boundary.
- Why no additional broader execution can materially improve confidence: the corrected probe now asserts the complete exact sequence `task, task, teacher`, excludes configured Student from the complete request log, passes both lifecycle scenarios, and cleans all owned resources. The API-REV-001 live evidence remains current and unaffected.
- Current confidence: unchanged Pass / 97.6%; no applicable category below 90%.
- Browser-specific rationale: the affected durable browser probe itself was rerun because that is the narrowest direct surface for both findings. Repeating node-8001 or unrelated full-suite execution would not test the corrected assertions/counter removal more directly.
- Blocker: `N/A`.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the same Nuxt renderer.
- Relevant README or development instructions: `/autobyteus-web/README.md` Web Development, Testing, and Packaged Electron E2E sections.
- Web-equivalent behavior: all changed focus, hydration, GraphQL, Team stream, Vue/Pinia, monitor, Activity, and accessibility behavior.
- Shell-specific or lifecycle behavior: none; no preload/IPC/window/native/packaging code changed.
- Chosen validation approach and why it fits the project: execute the shared renderer in Chromium with the documented Nuxt development path, then correlate against Docker node 8001. Actual desktop launch would add cost and risk without exercising a different changed boundary.
- Server/frontend setup when browser validation is used: self-starting deterministic fixture on an owned free port; separate owned Nuxt instance proxied to existing node 8001 for live retained data.
- Effect on any already-running desktop application: `None`; no Electron process or user profile will be touched.
- Behavior not directly proven and confidence consequence: Electron shell hosting itself is not retested and is not an applicable confidence category for this frontend-only boundary.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: build SDK contract if needed; run self-starting durable probes; confirm node 8001 health; start owned Nuxt on a free loopback port with `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001`; launch isolated Chromium context.
- Environment choices that materially affect the run: English locale, desktop viewport for full surfaces, optional 1024px confirmation, no persistent browser profile, read-only use of retained Team history.
- Health / readiness checks: probe route HTTP 200 and control installed; node `/rest/health` 200; live `/workspace` rendered and Team history available.
- Seed data / fixtures: deterministic synthetic task/fallback projections for the durable lifecycle; existing retained Nested Classroom Team on node 8001 for live identity/content.
- Test identities, authentication, permissions, or session state: no authentication; exact root/task/configured AgentRun IDs recorded in evidence; no secret.
- Requirement-linked journeys or scenarios: API-E2E-TMV-001/002 plus retained task/configured parent switching and exact request capture.
- DOM, screenshot, log, API, process, or other evidence to capture: visible row/header/task status/conversation/Activity markers, exact GraphQL variables/counts, lifecycle phase/focus/attempt state, page/console errors, screenshots, Nuxt log, cleanup result.
- Owned processes and temporary state to clean up: each probe's Nuxt process/fixture page/browser; live-validation Nuxt process/browser. Do not stop or modify Docker node 8001.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-LIVE-001 | One ticket-scoped Playwright script or direct browser automation against owned Nuxt -> node 8001 | Existing exact task/configured records are directly usable, isolated, and rendered by the current implementation. | Depends on mutable retained local Docker data and recorded IDs; keep evidence, not a repository test tied to one developer node. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual Electron shell | No shell-specific code or behavior changed; browser proves the shared renderer. | Negligible and inapplicable to current acceptance. | None unless browser evidence uncovers shell-only behavior. |
| New stochastic LLM-created formal settlement on node 8001 | User scope excludes LLM/tool behavior, and deterministic browser service execution can prove the frontend lifecycle without adding backend state. | Live backend timing/tool availability would make this non-deterministic, not more authoritative for frontend correctness. | Preserve durable deterministic lifecycle; record live retained-data limitation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Approved artifacts decide the stale fixture and required current behavior. | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — add focused task-monitor lifecycle probe; update stale background-contention fixture and test script discoverability; remove none.`
- Post-repository confidence: `95.7%`
- Broader validation decision: `API-REV-001 Required and completed; API-REV-002 additional broader execution Not Required after the focused corrected browser probe passed.`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: API-REV-002 resolved CR-TF-001 by asserting the full projection request sequence/log and CR-TF-002 by removing the dead parallel counter/control/state and unused reactive imports. The affected browser probe passed 2/2 again. Return the cumulative package through `/code_reviewer` for proportional re-review.
