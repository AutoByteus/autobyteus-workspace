# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/design-spec.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Source/architecture review passed commit `530587a707a48567d9bcf0a04736c091453f51fb` and requested API/E2E plus realistic responsive/browser validation.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved behavior is a Settings-shell-owned, normally open 16rem desktop navigation that collapses to zero reserved width without a rail. Desktop Token Statistics selection or direct entry auto-collapses it; a collapsed header shows the same shared Agents panel icon and typed active context. Manual collapse/reopen transfers focus between visible toggles, while direct routes, CSS-only narrow layout, and viewport changes must not intentionally steal focus. At narrow width the navigation remains stacked and visible. Toggle-only actions must not remount or refetch the active manager and must preserve manager-owned dates, grouping, sorting, expanded/detail rows, loaded data, and scroll where the DOM remains mounted. Existing routes, Server Settings modes, embedded override, Back to Workspace, loading/error/empty/forms, localization, API contracts, and persistence remain unchanged. Browser and Electron use the same renderer implementation with no platform fork.

Critical live proof is required for `AC-003`–`AC-008`, `AC-010`–`AC-013`; repository coverage also maps all `AC-001`–`AC-014`.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Normally open Settings navigation with separate right-aligned shared toggle | Changed | `REQ-001`, `REQ-002`; `AC-001`, `AC-002` | Validate source/component assertions and real geometry/accessibility. |
| Desktop collapse to zero width plus shell header | Added | `REQ-003`–`REQ-006`; `AC-003`–`AC-006` | Direct browser layout, width, overflow, and focus evidence required. |
| Token Statistics contextual auto-collapse | Added | `REQ-003`; `AC-005` | Validate click and direct-route paths. |
| Non-statistics selection reopens navigation | Changed | `REQ-007`; `AC-008` | Validate live selection and existing page tests. |
| Manager/data/interaction preservation across toggle | Preserved with new shell transition | `REQ-008`, `REQ-012`; `AC-007`, `AC-011` | Validate DOM identity, request count, state, scroll, and non-happy states. |
| Narrow stacked navigation | Preserved | `REQ-010`; `AC-012` | Validate 390x844 CSS behavior, focus, containment, and absence of rail. |
| Route normalization, embedded default, Server Settings modes, Back | Preserved | `REQ-007`, `REQ-012`; `AC-009` | Existing durable coverage plus targeted browser direct-route journeys. |
| Exact Agents icon treatment | Changed by shared extraction | `REQ-002`; `AC-002`, `AC-013` | Shared-component durable assertion plus live SVG/button geometry comparison. |
| Backend/API and persisted state | Preserved / not affected | `REQ-008`, `REQ-012`; persisted-data decision | Verify no toggle-only GraphQL request and no persistence writes/compatibility path. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | Store and manager tests show unchanged data contract | None introduced | None |
| API / transport / contract | No | Toggle must not cause requests | Store/component/page tests are mocked | Real client request count during live toggle | Browser with intercepted deterministic GraphQL |
| Frontend component / state | Yes | Settings page, navigation, collapsed header, shared icon | Focused Vitest suites | Browser CSS geometry, real focus, mounted DOM identity | Browser |
| Browser integration / user journey | Yes | Responsive layout and transitions | Class/intent assertions | Actual breakpoints, overflow, focus, scroll | Browser |
| Authentication / session / permissions | No | None | N/A | None | None |
| Desktop renderer / web-equivalent UI | Yes | Same Vue/Nuxt renderer | Web build and shared-source design | Electron-target generation and equivalent runtime config | Browser plus Electron-target static generation |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, or lifecycle code changed | No changed Electron files | Negligible shell uncertainty only | Focused Electron suite; actual desktop not justified |
| Process / lifecycle | No | Ephemeral page state only | Page tests | None material | None |
| Persisted-data transition | No | `Not Affected` | Handoff and diff show one local ref only | Verify no storage mutation during live toggle | Browser storage snapshot |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | None | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Project type and runtime stack: pnpm workspace; Nuxt 3/Vue 3/Pinia frontend with Vitest and an Electron 42 web wrapper; browser development server at port 3000 by default.
- Conflicting, missing, or unclear project instructions: No repository-resident browser E2E framework/configuration exists. `playwright-core` is a project dependency and local Google Chrome is available, so a ticket-scoped temporary executable browser probe is appropriate rather than introducing a new durable framework in this UI-only ticket.
- Required environment variables or secrets available: `N/A`; deterministic GraphQL responses will be intercepted locally and no real account or secret is needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/AGENTS.md` | Closest frontend instructions | Colocated tests; `pnpm test:nuxt ... --run`; Electron suite separately; do not use broad staging. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/README.md` | Frontend development/runtime guide | `pnpm dev` serves browser app; `pnpm build`; `pnpm test:nuxt`; `pnpm test:electron`; Electron bundles same frontend and backend. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/ARCHITECTURE.md` | Architecture/testing guide | Vue component/store tests are colocated; Electron is a wrapper around generated Nuxt renderer. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/package.json` | Authoritative scripts/dependency versions | Nuxt/Vitest commands; `generate:electron`; Electron 42.4.1; `playwright-core` available. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/autobyteus-web/nuxt.config.ts` and `nuxt.electron.config.ts` | Runtime/build configuration | Web dev GraphQL proxy; Electron target points at embedded loopback; `ssr:false`; same app components render in both targets. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Nuxt browser development renderer | `autobyteus-web` | `pnpm dev --port 3317` | Ticket-owned non-default port; GraphQL intercepted in browser | HTTP 200 from `/settings` and Nuxt ready log | Interrupt owned process; verify port closed |
| Google Chrome via `playwright-core` | `autobyteus-web` | Temporary Node probe launches `/Applications/Google Chrome.app/...` headless | Isolated incognito contexts; 1440x900 and 390x844 | Page load and semantic locator readiness | Close contexts/browser in `finally` |
| Electron-equivalent build target | `autobyteus-web` | `pnpm generate:electron` | Exercises Electron Nuxt configuration/static renderer generation; no shell-specific source changed | Exit 0 and generated output | No process; retain log only |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Representative Token Statistics task/model rows | Shape copied from existing store/table fixtures and fulfilled at GraphQL transport boundary | Synthetic local data only; no backend mutation | Exists only in intercepted browser context |
| Loading/error/empty variants | Deterministic per-context GraphQL response controller | No shared service or database | Context destroyed |
| Remote/embedded window identity modes | Browser by default uses embedded fallback; repository tests cover explicit remote/embedded stores; optional init-script bridge emulation only if needed | No real Electron/user process touched | Context destroyed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: loaded statistics rows and manager interaction state exist before toggles and remain on the same mounted manager/table nodes afterward.
- Evidence planned: compare manager/table DOM identity, request count, input/group/sort/expanded/detail state, scroll position, and local/session storage before/after toggles.
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `pages/__tests__/settings.spec.ts` | Default/narrow layout, direct Token collapse, focus transfer/retention, manager identity, navigation away, routes, modes, embedded override, Back | `REQ-001`, `REQ-003`–`REQ-012`; `AC-001`, `AC-003`–`AC-005`, `AC-007`–`AC-010`, `AC-012`–`AC-014` | Still Valid | Assertions match reviewed design | Execute focused and full suite. |
| `components/settings/__tests__/settingsNavigation.spec.ts` | Semantic navigation, ARIA, toggle, exact shared icon | `REQ-002`, `REQ-009`, `REQ-011`; `AC-002`, `AC-010` | Still Valid | Direct component behavior | Execute. |
| `components/settings/__tests__/settingsNavigationModel.spec.ts` | Authoritative destinations, normalization, modes/context | `REQ-007`, `REQ-011`, `REQ-012`; `AC-008`, `AC-009` | Still Valid | Direct pure-model coverage | Execute. |
| `components/settings/__tests__/SettingsCollapsedHeader.spec.ts` | Active context, ARIA, shared icon, focus handle | `REQ-005`, `REQ-006`, `REQ-009`; `AC-003`, `AC-004`, `AC-010` | Still Valid | Direct component behavior | Execute. |
| `components/__tests__/AppLeftPanel.spec.ts` | Shared icon extraction/consumption and absence of duplicate SVG | `REQ-002`; `AC-002`, `AC-013` | Still Valid | Source boundary assertion | Execute. |
| `components/settings/__tests__/TokenUsageStatistics.spec.ts` | Group/date state and empty states | `REQ-008`, `REQ-012`; `AC-007`, `AC-011` | Still Valid | Direct manager coverage | Execute. |
| `components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Sorting, expansion, detail state and table semantics | `REQ-008`; `AC-006`, `AC-007` | Still Valid | Direct table behavior | Execute and supplement with live geometry. |
| `components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Model table rendering/sorting/details | `REQ-008`; `AC-007` | Still Valid | Direct table behavior | Execute. |
| `stores/__tests__/tokenUsageStatistics.spec.ts` | Real store normalization, paired GraphQL queries, errors/loading cleanup | `REQ-008`, `REQ-012`; `AC-007`, `AC-011`, `AC-014` | Still Valid | Direct store behavior with mocked transport | Execute; live probe observes transport count. |
| Full Nuxt Vitest suite | Broader frontend regression | `AC-014` | Still Valid | Project-authoritative suite | Execute after focused checks. |
| Electron Vitest suite | Shell regression | `AC-013`, `AC-014` | Still Valid | Project-authoritative Electron checks | Execute; no actual shell-specific code changed. |

## Stale Or Obsolete Coverage Decisions

None. No existing scenario asserts the superseded drawer/rail proposal or an invalid compatibility path.

## Durable Coverage To Add

None initially. Existing repository tests already protect the state/model/component contracts. The missing evidence is actual browser CSS geometry and live focus/request behavior, and this repository has no durable browser-E2E convention. A ticket-scoped executable probe avoids introducing an unreviewed framework while producing reproducible evidence.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt pages/__tests__/settings.spec.ts components/settings/__tests__/settingsNavigation.spec.ts components/settings/__tests__/settingsNavigationModel.spec.ts components/settings/__tests__/SettingsCollapsedHeader.spec.ts components/__tests__/AppLeftPanel.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts --run` | `autobyteus-web` | Focused shell, manager, table, store, routing, focus, and icon coverage | Pass — 9 files / 46 tests | `tickets/.../execution-evidence/focused-vitest.log` |
| 2 | `pnpm test:nuxt --run` | `autobyteus-web` | Full frontend affected-suite regression | Fail — known unrelated baseline: 4 files / 4 tests; 356 files / 1,878 tests passed, 1 skipped | `tickets/.../execution-evidence/full-nuxt-vitest.log` |
| 3 | `pnpm test:electron --run` | `autobyteus-web` | Electron shell regression baseline | Pass — 23 files / 97 tests passed, 1 file / 1 test skipped | `tickets/.../execution-evidence/electron-vitest.log` |
| 4 | `pnpm build` | `autobyteus-web` | Production browser bundle | Pass | `tickets/.../execution-evidence/nuxt-build.log` |
| 5 | `pnpm generate:electron` | `autobyteus-web` | Electron-target renderer generation | Pass | `tickets/.../execution-evidence/electron-generate.log` |
| 6 | `git diff --check` | worktree root | Patch hygiene | Pass | `tickets/.../execution-evidence/git-diff-check.log` |

## Post-Repository Confidence Scorecard (Mandatory)

Repository execution completed before broader validation. The full Nuxt suite remains red only on four pre-existing unrelated failures also present in the implementation-stage baseline: `workspace-history-draft-send.integration.test.ts`, `MemoryHome.spec.ts`, `CodexFullAccessCard.spec.ts`, and `zhCnGlossaryConsistency.spec.ts`. None is in or depends on the changed Settings navigation source; the prior baseline had the same four plus one Electron extension flake that passed in this run.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 9 focused files / 46 tests pass; design-mapped routing, focus intent, state, table, icon, and store assertions are direct | Real geometry and viewport focus behavior remain unproven | Targeted browser journeys |
| Changed-boundary execution directness | 90% | Component/page/store code executes directly; web and Electron renderer builds pass | Visibility geometry is mocked in unit tests | Chrome DOM/geometry assertions |
| Cross-boundary integration realism and mock gap | 88% | Full Nuxt app build and focused layer coverage pass | Apollo/browser DOM integration and real CSS layout are not executed by repository tests | Nuxt production renderer with only backend responses intercepted |
| Environment, configuration, identity, and fixture fidelity | 90% | Project-authoritative commands, actual dependency graph, Chrome and Electron 42 target are available | Representative live fixture has not yet crossed Apollo/DOM | Browser transport fixture |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Store error/loading cleanup, manager empty states, focus handles, routes and manager identity are covered | Toggle while live loading/error/empty remains unobserved | Controlled browser phases |
| User-surface, browser, and desktop-shell confidence | 82% | Production web and Electron renderer generation pass | No actual 1440x900/390x844, browser focus, overflow or scroll evidence yet | Chrome responsive execution |
| Durable regression coverage quality and relevance | 95% | Focused durable suite is broad and requirement-aligned; no stale tests found | No repository browser-E2E convention and no viewport-resize focus assertion | Temporary executable probe; durable addition only if fix requires one |

- Overall post-repository confidence: `89.6%`
- Calculation method: Simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `No`
- Any applicable category below `90%`: `Yes` — cross-boundary integration realism (`88%`) and user-surface/browser confidence (`82%`).
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: actual table fit, breakpoint geometry, real focus across transitions/resize, toggle-only request/state/scroll preservation, and live non-happy states.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` plus Electron-target static generation.
- Specific confidence gap or residual risk addressed: Real responsive layout, table overflow, focus, DOM/state preservation, API request count, non-happy states, route journeys, and platform-equivalent renderer build.
- Why the selected mode can materially improve confidence: It exercises the real Nuxt app, Pinia/Apollo client, generated CSS, Chrome layout engine, and focus model while mocking only the unchanged backend transport result.
- Expected confidence after the selected validation: At least 95%, with every applicable category at least 90%, if all critical scenarios pass.
- Browser-specific decision and rationale: Required because the changed boundary is responsive web-equivalent renderer behavior and repository tests mock visibility geometry.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1 wrapping the Nuxt generated renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, `ARCHITECTURE.md`, `docs/electron_packaging.md`, `nuxt.electron.config.ts`.
- Web-equivalent behavior: All changed Settings Vue components, Tailwind responsive CSS, Pinia state, routing, focus, and Apollo requests.
- Shell-specific or lifecycle behavior: None changed; no preload/IPC/window/native integration is involved.
- Chosen validation approach and why it fits the project: Chrome against Nuxt for direct web-equivalent evidence, Electron Vitest for shell regression, and `generate:electron` for Electron renderer configuration. Actual desktop launch is not justified because it would add no material changed-boundary evidence and could disturb a running user application.
- Server/frontend setup when browser validation is used: ticket-owned production static Nuxt renderer on port 3317; GraphQL requests intercepted with deterministic fixtures.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Native window chrome/packaging is not directly launched; negligible because no shell/native source changed and Electron-target generation is executed.

## Live Environment And Fixture Plan

- Startup order and commands: create evidence directory; execute repository checks; serve the successful production build with `python3 -m http.server 3317 --directory dist/public`; wait for `/settings`; run the ticket-scoped Playwright-core probe with local Chrome; stop the owned server.
- Environment choices that materially affect the run: macOS, Chrome headless, English/default font, Europe/Berlin host timezone, isolated contexts, viewports 1440x900 and 390x844.
- Health / readiness checks: Nuxt ready log and successful HTTP load.
- Seed data / fixtures: representative team run plus child row and model row using current GraphQL response shape; explicit delayed/error/empty phases.
- Test identities/authentication/permissions/session state: Not applicable.
- Requirement-linked journeys: scenario IDs `BROWSER-001` through `BROWSER-008` described below.
- Evidence to capture: JSON geometry/focus/request/state records, screenshots at both viewports and non-happy states, browser console/error log, Nuxt log.
- Owned processes and temporary state to clean up: Nuxt PID/process group, Playwright contexts, Chrome process, intercepted data.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `BROWSER-001` | 1440x900 direct Token Statistics with deterministic loaded rows | Zero-width navigation, full content width, all headers through Created Time fit without table horizontal scrolling | Repo has no E2E framework; geometry is recorded as ticket evidence. |
| `BROWSER-002` | Desktop API Keys -> Token -> reopen -> collapse | Real focus transfer, ARIA, controlled region, no rail, manager DOM identity | Same. |
| `BROWSER-003` | Loaded Token manager interactions before two toggles | Request count, dates, grouping, sort, expansion/detail, loaded values, manager/table identity, scroll, storage preservation | Same; existing component/store tests retain durable contract. |
| `BROWSER-004` | Delayed, GraphQL-error, task-empty, model-empty response phases | Toggle usable and no toggle-only refetch/reset in loading/error/empty states | Same; durable unit tests already cover rendering/state branches. |
| `BROWSER-005` | 390x844 selection and direct Token route | Stacked visible navigation, hidden collapsed header, focus retention, no rail, viewport/content containment | Same. |
| `BROWSER-006` | Direct route contexts | `about`, `server-status`, invalid fallback, quick/advanced/migrations, non-statistics open | Same; repository unit coverage is durable. |
| `BROWSER-007` | Back action plus shared icon inspection | Workspace routing and exact SVG geometry/right alignment; compare shared source consumption | Same. |
| `BROWSER-008` | Electron-target generate plus browser renderer | Same component behavior has no platform fork; Electron static renderer builds | Build result is execution evidence, not a new test artifact. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual packaged Electron window launch | No shell-specific code changed; browser directly exercises the renderer and Electron target generation exercises build configuration; desktop launch is last resort and could affect a running app | Negligible bounded native-shell visual uncertainty | None unless browser/build evidence contradicts equivalence. |
| Real backend data persistence | Backend/API unchanged; deterministic GraphQL boundary is sufficient for toggle-only request proof | Low | Existing store/backend coverage remains authoritative. |

## Ambiguities Or Reroute Triggers

None identified.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `89.6%`.
- Broader validation decision: `Required — Browser`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Execute repository checks first, update this artifact with actual scores, then perform targeted browser validation.
