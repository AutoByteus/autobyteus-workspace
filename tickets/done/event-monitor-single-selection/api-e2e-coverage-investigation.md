# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/ui-ux-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `Initial coverage baseline completed`
- Trigger: Review-passed implementation handoff `IR-001` / `CRR-001` for commit `7664e6b47`.
- Prior Investigation Reviewed: `No prior API/E2E investigation or execution report existed; this was the required baseline.`
- Latest Authoritative Investigation: This file, updated with completed repository and browser evidence.

## Current Requirement And Design Basis

The reviewed implementation must keep the workspace history tree aligned with the single center event-monitor target. For team-member rows, current/selected identity is the compound `(teamRunId, memberRouteKey)`: the authoritative `agentSelectionStore` team selection must match the row's team run, and the row route must match that team's focused member route. Only that row may receive selected styling and `aria-current="true"`. Stable and transient rows must use the same predicate. Expansion, activity/status dots, hover, keyboard focus, and the transient ghost presentation remain independent states. Existing row selection, historical hydration, supported workspace execution-link parsing/opening, query stripping, and center-pane lifecycle remain unchanged. No browser-reload persistence or API/persisted-data migration is in scope.

Critical acceptance criteria are `AC-001` (duplicate route keys across team runs), `AC-002` (independent expansion/status/activity and standalone-agent selection), `AC-003` (selection transfer), `AC-004` (history/link lifecycle alignment and no-target state), and `AC-005` (focus/hover distinction and at most one current semantic).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / frontend history row current predicate | Changed | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`; `WorkspaceHistoryWorkspaceSection.vue` and `WorkspaceAgentRunsTreePanel.vue` | Direct component assertions must cover duplicate route keys, clear/no selection, and standalone-agent type. |
| `BEH-002` / stable and transient row presentation | Changed | `ui-ux-spec.md`; `WorkspaceTransientExecutionRow.vue`; `WorkspaceHistoryWorkspaceSection.spec.ts` | Rendered DOM/browser evidence should confirm only the current row has current semantics and the non-current transient row retains ghost styling without selected text/ring emphasis. |
| `BEH-003` / row, history, and execution-link lifecycle | Preserved | Existing `useWorkspaceHistorySelectionActions`, `selectTreeRunFromHistory`, `useWorkspaceRouteSelection`, and `workspaceNavigationService` paths; implementation diff does not alter them | Existing history/hydration and route/navigation tests remain valid and must be rerun. A realistic link-to-render journey is a bounded browser risk because the live coordinator normally needs backend data. |
| Persisted/API contracts | Preserved | Requirements persisted-data decision `Not Affected`; implementation compatibility check passed | No migration, storage, API, or compatibility coverage is needed. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? (`Yes`/`No`) | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | No backend files changed; source review confirms no server/API diff | None for this ticket | None |
| API / transport / contract | No | Existing workspace execution-link contract only | Navigation service tests and route-selection test cover parsing, routing, and query clearing through mocks | Real coordinator/backend response is not covered | Live API only if a safe backend fixture is available |
| Frontend component / state | Yes | History row predicate and transient prop naming | Colocated `WorkspaceHistoryWorkspaceSection.spec.ts` directly exercises the changed component; tree-panel tests cover selection/opening and expansion | Vue Test Utils does not prove browser-computed styles or real page composition | Browser fixture |
| Browser integration / user journey | Yes | Rendered workspace-history current/non-current distinction | No existing browser probe targets this invariant; existing probes are activity/contention concerns | Real DOM state, focus/hover, transient ghost visual distinction, and selection transfer are not yet proven | Browser temporary executable probe |
| Authentication / session / permissions | No | None | No auth boundary changed | None | None |
| Desktop renderer / web-equivalent UI | Yes | The changed Vue components are shared by the web renderer and Electron renderer | Production build and component tests; E2E fixtures are browser-capable | Browser rendering is not the Electron shell, but proves the equivalent renderer surface | Browser |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, or lifecycle change | No changed shell code | Shell-specific behavior is unrelated | None |
| Process / lifecycle | No | No process lifecycle change | No relevant source change | None | None |
| Persisted-data transition | No | Pinia selection and transient query only; no persisted subject | Requirements and implementation handoff both say `Not Affected`; no migration code | Browser reload persistence is explicitly unsupported/out of scope | None |
| Worker / queue / distributed coordination | No | None | No worker/queue changes | None | None |
| External integration | No | None | No external integration changes | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection`
- Project type and runtime stack: Nuxt/Vue frontend, Pinia state, Vitest + Vue Test Utils, Playwright Core browser probes, Electron wrapper.
- Conflicting, missing, or unclear project instructions: No material conflict found. The web guide says to use `pnpm test:nuxt ... --run`; browser probes use project scripts and temporary Nuxt fixture routes. `nuxi typecheck` is a known repository dependency-export blocker from upstream review and is not a changed-file gate.
- Required environment variables or secrets available: `N/A` for repository checks and temporary fixture browser validation. Live backend credentials/data are not required for the selected browser fixture; no secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/autobyteus-web/AGENTS.md` | Web contributor/testing guide | Use `pnpm test:nuxt`; always include `--run`; use browser-responsive probe conventions where applicable. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/autobyteus-web/README.md` | Frontend setup and testing | `pnpm install`; `pnpm test:nuxt <path> --run`; browser probes start Nuxt and use Playwright Core; normal browser dev uses `pnpm dev`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/autobyteus-web/package.json` | Authoritative scripts/dependencies | `test:nuxt`, `build`, `test:e2e:team-activity` is not a registered script; existing browser probes are direct Node scripts. `playwright-core` and Chrome are available. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/autobyteus-web/vitest.config.mts` | Nuxt Vitest configuration | Run focused tests from `autobyteus-web` through `pnpm exec vitest run ...`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/autobyteus-web/tests/e2e/team-activity-presentation-probe.mjs` | Existing browser probe pattern | Owns a temporary Nuxt page, starts/stops its own process, captures JSON/log/screenshots, and removes the installed page. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` | Existing browser probe pattern | Browser is preferred for web-equivalent renderer behavior; fixture updates here only satisfy the new typed contract and are not lifecycle evidence. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Nuxt frontend for temporary probe | `autobyteus-web` | Probe starts `pnpm exec nuxi dev --host 127.0.0.1 --port <owned-port>` with an unreachable backend base URL | Browser-only fixture page; no shared backend or user data | HTTP 200 for temporary route and fixture marker visible | Kill owned process group; remove temporary `pages/api-e2e-*.vue`; retain evidence under ticket `api-e2e` directory |
| Vitest | `autobyteus-web` | `pnpm exec vitest run <files> --no-watch` | Uses installed worktree dependencies and generated ignored `.nuxt` context | Command exits 0 | Process exits after command; no persistent resource |
| Chrome / Playwright Core | Ticket probe process | `chromium.launch({ headless: true, executablePath: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome })` | Browser-only web-equivalent renderer evidence | Route marker and DOM assertions | Close context/browser in probe `finally` block |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Two team runs with duplicate focused route keys, one selected | Temporary fixture page using real `WorkspaceHistoryWorkspaceSection` and typed section contract | Synthetic deterministic data; no backend, account, or persisted data | Temporary page removed; JSON/screenshots/log retained as evidence |
| Current and non-current transient ghost rows | Temporary fixture's execution rows include a transient row for each team and a committed selection predicate | Synthetic projection only; tests presentation boundary, not backend hydration | Same cleanup; retained evidence documents limitation |
| Supported team execution-link parsing/clearing | Existing `useWorkspaceRouteSelection.spec.ts` and `workspaceNavigationService.spec.ts` | Mocked coordinators avoid unsafe/unavailable backend; direct contract and route cleanup assertions remain valid | No data created |

## Persisted Data Transition Coverage Basis

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data section; `implementation-handoff.md` persisted-data transition check.
- Representative existing-data setup and required behavior: None; no stored subject changed. Existing in-memory team/history projections and transient route query values continue through current readers.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: Verify no migration code, storage shape, API contract, or compatibility fallback is present; rerun history hydration and route tests as regression evidence.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` — transient/current identity and duplicate route scenarios | Asserts transient row current styling/`aria-current`, duplicate route keys across team runs, clear selection, and standalone-agent type | `AC-001`, `AC-002`, `AC-005`; `DS-002`/`DS-003` | Still Valid | Updated in reviewed implementation commit; code review passed the six focused section tests | Rerun unchanged |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — history expansion, team/member activation, hydration, selection | Exercises tree-panel selection adapter and supported row/history paths | `AC-002`, `AC-003`, `AC-004`; `DS-001` | Still Valid | Existing tests cover nested selection, coordinator-focused member, hydration, and row lifecycle | Rerun unchanged |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` — persisted member hydration and multi-team expansion | Protects supported history selection and independent expansion | `AC-002`, `AC-003`, `AC-004` | Still Valid | Existing regression scenarios remain aligned; implementation did not change open actions | Rerun unchanged |
| `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Opens historical team from sidebar and lazily hydrates selected member | `AC-003`, `AC-004`; `DS-001` | Still Valid | Integration path is outside changed predicate but is a critical preserved lifecycle | Rerun unchanged |
| `autobyteus-web/composables/workspace/__tests__/useWorkspaceRouteSelection.spec.ts` | Parses supported team execution query, calls link opener, strips query | `AC-004`; `BEH-003` | Still Valid | Directly asserts team run/member route input and route cleanup | Rerun unchanged |
| `autobyteus-web/services/workspace/__tests__/workspaceNavigationService.spec.ts` | Builds/parses team link, strips query, routes to team coordinator | `AC-004`; `BEH-003` | Still Valid | Direct contract tests use mocked coordinators but assert exact route identity | Rerun unchanged |
| `autobyteus-web/tests/e2e/team-activity-presentation-probe.mjs` + fixture | Activity dot presentation across history/running surfaces | `REQ-002` only as unrelated independent visual state | Out Of Scope | Does not assert current-row selection; fixture's `isTeamRunSelected` is intentionally always false | Do not modify or treat as lifecycle evidence |
| `autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` + fixture | Background stream/contention, expansion, transient rows, and renderer responsiveness | Broad renderer regression; only partial `AC-002`/`AC-005` relevance | Still Valid | Fixture contract was updated by implementation but its selected query is intentionally false; no current-row assertion | Rerun only if needed as broader regression; not primary proof |
| No existing repository-resident browser probe for current team/member selection | Missing direct browser DOM and rendered visual proof | `AC-001`, `AC-003`, `AC-005`; `DS-002`/`DS-003` | Add Durable Coverage not selected for this round; use temporary executable probe | Existing unit coverage is direct for logic, but browser-only visual distinction remains unproven | Temporary browser probe first; durable addition only if a maintainable project fixture is justified |

## Stale Or Obsolete Coverage Decisions

No stale or obsolete coverage is identified. The reviewed implementation directly replaces route-only current styling; no old assertion is being removed or disabled.

## Durable Coverage To Add

No durable API/E2E coverage is planned before the initial execution. The implementation commit already added focused durable component assertions for the compound identity. A temporary browser probe is preferred for this ticket because the existing E2E harnesses are fixture-based and no production workspace E2E setup is available without a backend/data contract. If execution exposes a durable coverage gap that is appropriate for repository ownership, update this investigation before changing test code and route the resulting package back through `code_reviewer`.

## Durable Coverage To Update

None planned. Existing route and history tests are still valid; fixture contract updates already belong to the reviewed implementation commit.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result (`Planned`/`Pass`/`Fail`/`Blocked`) | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts --no-watch` | `autobyteus-web` | Direct stable/transient compound current predicate, duplicate route keys, clear/agent selection, row interaction | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e/01-history-section-vitest.log` — 1 file / 6 tests passed |
| 2 | `pnpm exec vitest run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts --no-watch` | `autobyteus-web` | History selection transfer, expansion, hydration, preserved tree lifecycle | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e/02-history-tree-vitest.log` — 3 files / 55 tests passed; hydration test emitted a caught missing mocked `GetTaskDelegationRecords` warning |
| 3 | `pnpm exec vitest run composables/workspace/__tests__/useWorkspaceRouteSelection.spec.ts services/workspace/__tests__/workspaceNavigationService.spec.ts --no-watch` | `autobyteus-web` | Supported workspace execution-link parse/open/strip contract | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e/03-workspace-link-vitest.log` — 2 files / 6 tests passed |
| 4 | `git diff --check HEAD -- autobyteus-web/components/workspace/history autobyteus-web/tests/e2e tickets/in-progress/event-monitor-single-selection` | Worktree root | Changed-surface whitespace / patch integrity | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e/06-diff-check.log` |
| 5 | `pnpm build` | `autobyteus-web` | Nuxt production bundling of changed renderer | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e/05-production-build.log` — Nuxt client/server build and prerender completed; existing chunk-size warning only |

## Post-Repository Confidence Scorecard (Mandatory)

Initial pre-execution estimates are deliberately provisional; they will be replaced with observed scores after the repository checks.

| Confidence Category | Score (`0-100%`/`N/A`) | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Repository tests directly cover duplicate IDs/clear/type, preserved history/hydration, and route parsing/clearing | Rendered transfer and user-surface semantics are not yet executed | Temporary browser fixture |
| Changed-boundary execution directness | 90% | Direct Vue component suite and production build pass | Browser DOM/style and shared page composition are unexecuted | Temporary browser fixture |
| Cross-boundary integration realism and mock gap | 75% | History integration and route tests cover real local calls but navigation coordinator/API responses are mocked | No live backend/coordinator journey | Browser fixture for renderer; live backend feasibility remains open |
| Environment, configuration, identity, and fixture fidelity | 90% | Worktree dependencies, generated Nuxt context, deterministic typed fixtures, and exact duplicate identities are available | Fixture does not reproduce authenticated/live server data | Browser fixture with backend responses emulated |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Existing tests cover clear, expansion, hydration, route strip, and caught open errors | Browser focus/hover and selection transfer rendering remain open | Browser probe and retained evidence |
| User-surface, browser, and desktop-shell confidence | 50% | Browser tooling/Chrome available; changed components are renderer-shared | No browser execution yet; Electron shell is unaffected but not launched | Browser validation; shell remains out of scope |
| Durable regression coverage quality and relevance | 90% | Focused durable component assertions are narrow and code-review approved; preserved lifecycle tests exist | No durable browser scenario for rendered compound state | Temporary probe may establish no durable addition is necessary |

- Overall post-repository confidence: `82%` (simple mean of 90, 90, 75, 90, 85, 50, 95 = 82.1%, rounded)
- Calculation method: Simple average of applicable categories.
- Every critical acceptance criterion directly proven: `No` — rendered user-surface evidence is pending.
- Any applicable category below `90%`: `Yes` — all except durable coverage are provisional below 90%.
- Default clean-confidence target of 95% met: `No`
- Material residual risks: Real browser rendering and a live supported execution-link coordinator/backend journey remain unproven.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode (`Browser`/`Live API`/`Project Desktop Validation`/`CLI`/`Lifecycle`/`Worker or Distributed`/`Other`/`None`): `Browser`
- Specific confidence gap or residual risk addressed: Rendered distinction of current versus non-current stable/transient rows, one `aria-current`, focus/hover independence, and selection transfer after committed state changes.
- Why the selected mode can materially improve confidence: The changed behavior is a Vue renderer predicate and class/ARIA projection; a real browser can inspect semantic DOM, computed class/color/ring styles, keyboard focus, hover, and reactive updates across multiple displayed team runs.
- Expected confidence after the selected validation: At least `90%` for changed-boundary and user-surface categories; overall target depends on repository results and the remaining mocked link-coordinator boundary.
- Browser-specific decision and rationale: `Required`; no existing browser probe exercises this current-row invariant. Use a temporary fixture, not a durable test addition, unless execution demonstrates a reusable project-owned scenario.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A at investigation time`

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapper around the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md` and `autobyteus-web/AGENTS.md` say browser development is the normal web-equivalent path; actual Electron is reserved for shell-specific behavior.
- Web-equivalent behavior: History component and current-row semantics; covered by browser mode.
- Shell-specific or lifecycle behavior: None changed (no preload, IPC, window, packaging, or server lifecycle files changed).
- Chosen validation approach and why it fits the project: Browser-only validation; launching Electron adds no evidence for this renderer-only change.
- Server/frontend setup when browser validation is used: Temporary Nuxt dev route with unreachable backend URL; the fixture supplies deterministic local state.
- Effect on any already-running desktop application: `None`; only an owned temporary Nuxt process/browser will be started.
- Behavior not directly proven and confidence consequence: Electron shell integration is not directly proven but is not an affected boundary.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Temporary probe copies a page into `autobyteus-web/pages/`, starts `pnpm exec nuxi dev --host 127.0.0.1 --port <owned-port>`, waits for route HTTP 200, launches headless Chrome, navigates to the fixture route, executes DOM/keyboard/hover assertions, writes evidence, then stops process/removes page.
- Environment choices that materially affect the run: macOS; Node `v22.23.1`; pnpm `10.28.2`; Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; light color scheme; fixed viewport.
- Health / readiness checks: Temporary route HTTP 200, fixture marker visible, no page errors/console errors, and required row locators visible.
- Seed data / fixtures: Two stable team runs and two transient execution rows using duplicate focused route keys; selected team ID starts at A and changes to B/none/agent.
- Test identities, authentication, permissions, or session state: None; local fixture only.
- Requirement-linked journeys or scenarios: `BR-001` duplicate route/current semantics; `BR-002` transfer/clear/standalone agent; `BR-003` transient current/non-current ghost distinction; `BR-004` keyboard focus/hover and disclosure independence; route contract remains repository-tested rather than live-coordinator tested.
- DOM, screenshot, log, API, process, or other evidence to capture: JSON scenario evidence, DOM attributes/classes/computed styles, screenshots for stable/transient current and non-current states, Nuxt log, browser events, cleanup result.
- Owned processes and temporary state to clean up: Temporary Nuxt process group, temporary page, browser/context, output directory only.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `BR-001` | Temporary Nuxt fixture renders two team runs with same focused route key and changes selected team ID | Exactly one stable row has `aria-current` and selected classes | Synthetic page is a task-specific visual probe; unit coverage already owns predicate logic |
| `BR-002` | Same fixture switches selected team, clears selection, and switches to standalone-agent type | Current state transfers/clears and no team row is current for agent selection | No production backend data; not a reusable user journey fixture yet |
| `BR-003` | Temporary fixture renders transient rows under both current and non-current teams | Current transient gets text/ring/current semantics; non-current retains ghost background but not selected text/ring/current state | Computed styling evidence is valuable for this ticket but fixture is not a product route |
| `BR-004` | Browser Tab/hover/disclosure interactions on a non-current row | Focus/hover/disclosure do not create a second current target | Existing product accessibility test ownership is colocated component tests; probe validates rendered output only |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live supported workspace execution-link -> backend open coordinator -> rendered history row | No assigned backend fixture/data/auth setup is provided; coordinator reads server/history state and a synthetic probe cannot honestly claim the live API boundary | Medium for AC-004 integration realism; route parsing/stripping and coordinator dispatch remain directly unit-tested | Report as untested residual risk; do not claim live-link Pass. Delivery may accept with documented risk or request a backend fixture if required. |
| Electron shell-specific execution | No shell-specific code changed | Low / not applicable | No action unless delivery identifies shell regression |
| Browser reload persistence | Explicitly out of scope and no persisted selection path exists | None | No test |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Requirements/design/review package and implementation are consistent | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `82%` before broader validation; final execution confidence is `94%`.
- Broader validation decision: `Required` — Browser temporary fixture completed with `BR-001`–`BR-004` passing.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Coverage investigation was written before final execution and before any durable coverage edit. Repository checks passed; browser validation passed. `LIVE-001` remains explicitly not tested because no safe backend/data/auth environment was provisioned. No durable test code changed in this round, so route the completed package to `code_reviewer` for a `Not Applicable` proportional test review, then delivery.

## Completed Execution Update — API-REV-001

- Repository result: `Pass` — 6 focused section tests, 55 history/tree/hydration tests, 6 route/navigation tests, production build, and diff check passed. The hydration suite emitted a caught missing mocked `GetTaskDelegationRecords` warning but still passed; no test-code change was made.
- Browser result: `Pass` — temporary Nuxt/Chrome scenarios `BR-001`–`BR-004` passed. Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/api-e2e/browser-output/evidence.json`.
- Final confidence: `94%` (simple mean of final scores `95, 95, 90, 90, 95, 95, 95`; no applicable category below `90%`; default `95%` target not met).
- Final confidence rationale: Browser evidence closed the renderer, focus/hover, transfer/clear, and transient ghost distinction gaps. A live backend/authenticated execution-link journey remains `LIVE-001 Not Tested`; route parsing, query cleanup, coordinator dispatch, history selection, and hydration remain directly covered by repository tests.
- Final broader-validation status: `Required` and completed in Browser mode; no Electron execution because the shell boundary is unaffected.
- Durable coverage decision: `No` durable repository coverage added/updated/removed during this round. Temporary probe only; no return through code reviewer for test-code changes is required, but the cumulative pass package still goes to `code_reviewer` for proportional review status.
- Latest result: `Pass`.
