# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/requirements-doc.md` (`RER-002`, Approved)
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/requirements-revision-record.md`
- Design Spec: `N/A — not applicable; direct route`
- Supplemental Task Artifacts: approved Product package under `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001`, specifically `ui-ux-spec.md`, `user-decision-record.md`, `requirement-impact.md`, `ui-behavior-test-matrix.md`, `prototype-runbook.md`, `browser-validation-rv-006.json`, and `visual-references/visual-reference-manifest.json`; implementation-render evidence under the task ticket's `implementation-evidence/` directory
- Architecture Design Revision Record: `N/A — not applicable; direct route`
- Design Review Report: `N/A — not applicable; direct route`
- Architecture Review Revision Record: `N/A — not applicable; direct route`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `N/A — not applicable; confirmed Medium/Low direct route`
- Code Review Revision Record: `N/A — not applicable; confirmed Medium/Low direct route`
- Delivery Revision Record (delivery re-entry only): `N/A — initial validation`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/api-e2e-revision-record.md` (to be created as `API-REV-001` after the completed result)
- Current API/E2E Revision ID: `N/A — initial investigation precedes the first completed result`
- Current Investigation Round: `1`
- Trigger: Implementation Engineer handoff for production commit `d64560aee9f828853c75a0abff7347ec4fbaf54b`, cumulative handoff `cc92be20d523b4740c1c4d9b2e57600f984e29b7`
- Prior Investigation Reviewed: `N/A — no prior API/E2E investigation or completed result exists`
- Latest Authoritative Investigation: This file

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architectural risk (`Low`/`High`): `Low`
- Input route (`Reviewed`/`Direct Low-Risk`): `Direct Low-Risk`
- Successful-output route (`Code Review`/`Delivery`): `Delivery`, subject to the completed result and dynamic handoff rules
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved change is a presentation and accessibility refinement of the existing Workspace-history TeamRun execution subtree. Production must render the definition/run boundary and all visible configured or transient execution descendants as one compact printed file tree with continuous ancestor rails, right-only non-crossing elbows, correct last-sibling termination, filled configured-Team identity, circular configured-Agent identity, and separate dashed/bolt transient-Team identity. Selection must remain the approved orthogonal `#eef2ff` row with a straight 2px `#6366f1` inset rule. At the supported 260px, 320px, and 520px panel widths and Default, Large, and Extra Large font presets, controls must remain operable, rows must not overflow, narrow metadata must yield as approved, and full role/name/address must remain recoverable through pointer and keyboard paths.

The same production boundary must preserve existing TeamRun grouping/actions, exact concrete-member selection, structural-Team no-selection behavior, independent default-collapsed disclosure, selected-member ancestor reveal, exact/aggregate status, configured/transient topology, quiet refresh, and live/historical hydration. The execution topology, identities, status calculation, persistence, backend contracts, desktop shell, and lifecycle ownership are explicitly unchanged. `AC-001` through `AC-008`, `QR-001` through `QR-004`, the approved `ui-ux-spec.md`, and `VIS-001` through `VIS-005` govern proof. Architecture-design, architecture-review, and source-review artifacts are `N/A — not applicable` on this confirmed direct route.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`, `REQ-001`, `AC-001` definition/run/execution hierarchy | Changed | Approved requirements; `IR-001` | Retain grouping/action assertions and add rendered browser proof that the real production components form one attached hierarchy. |
| `BEH-002`, `REQ-002`, `REQ-004`, `AC-001`–`AC-003` ancestry/disclosure | Changed + Preserved | Approved `DEC-001`; implementation components | Prove branch geometry, last-sibling/ancestor continuation, independent pointer/keyboard disclosure, and unchanged valid-selection behavior. |
| `BEH-003`, `REQ-003`, `REQ-008`, `REQ-009`, `AC-005`, `AC-006` identity/status/metadata | Changed + Preserved | Approved `DEC-002`/`DEC-003`; implementation handoff | Prove configured Team/Agent/transient identity, responsive metadata, and retained exact/aggregate status with current projection rows. |
| `BEH-004`, `REQ-006`, `REQ-007`, `REQ-012`, `AC-004`, `AC-005` responsive/localized identity | Changed | Approved Product matrix and implementation CSS/localization | Add durable Chromium coverage across the complete 3×3 width/font matrix, long English/Chinese identities, overflow, hover, focus, and tooltip stacking. |
| `BEH-005`, `REQ-005`, `REQ-010`, `REQ-011`, `AC-002`, `AC-003`, `AC-007`, `AC-008` selection/accessibility/preservation | Changed + Preserved | Requirements and current component/state suites | Prove computed selected geometry, tree/treeitem attributes and accessible output, keyboard operation, quiet-refresh state retention, and the current hydration/action suites. |
| Backend/API/persistence/shell | Preserved / not changed | Routing assessment; implementation compatibility and transition checks | Confirm no changed contract or compatibility path; browser renderer plus existing integration coverage is appropriate, while actual Electron execution is not. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | Existing projection/status tests show unchanged input semantics | None from this presentation delta | None |
| API / transport / contract | No | None | Existing run-history types/projection and historical hydration integration | No new API contract; a browser fixture will not independently prove a backend transport that did not change | None beyond retained integration suite |
| Frontend component / state | Yes | Workspace history execution-tree orchestration, rows, connectors, container-query presentation, localization | Component, composable, projection, and hydration suites | happy-dom cannot prove layout, CSS pseudo-elements, overflow, focus tooltip stacking, or browser accessibility output | Chromium browser probe |
| Browser integration / user journey | Yes | Rendered Workspace-history tree and user interactions | Implementation-only temporary Chromium preview | No repository-resident browser regression coverage for the approved hierarchy | Durable Chromium browser probe |
| Authentication / session / permissions | No | None | N/A | N/A | None |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer used by web and Electron | Nuxt component tests and development renderer | Responsive CSS and semantic interaction require a real browser engine | Browser development path |
| Desktop shell / Electron-specific integration | No | No IPC, preload, window, packaging, updater, or native integration change | Source diff and routing assessment | None material | None; actual desktop launch would add no relevant proof |
| Process / lifecycle | No production change | Existing quiet-refresh interval/action flows are preserved | Panel tests, tree-state tests, historical hydration integration | Browser reactivity and non-navigation should be observed once | Browser probe plus existing repository tests |
| Persisted-data transition | No | `Not Affected` | Implementation handoff explicitly consumes current rows unchanged | None | None |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None |
| External integration | No | None | N/A | N/A | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements`, branch `requirements/nested-team-hierarchy-ui`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue 3/TypeScript/Pinia/Tailwind frontend; Vitest/Nuxt Test Utils; Playwright Core with installed Chromium for browser probes; Electron wrapper exists but is outside the changed boundary
- Conflicting, missing, or unclear project instructions: No conflict. Root full-stack development is fixed to ports 8000/3000, but port 8000 is already occupied by an unowned process. It must not be stopped or reused. The repository's self-starting browser-probe convention uses a free owned loopback port and is the safe documented alternative for this renderer-only boundary.
- Required environment variables or secrets available: `N/A`; the selected deterministic browser renderer path needs no credentials. Repository `.env` values are not recorded or changed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest repository instruction | Colocated tests; use `pnpm test:nuxt ... --run`; do not use broad Git staging. |
| `autobyteus-web/README.md` | Development, test, browser-probe, and Electron instructions | `pnpm dev` is the browser path; Vitest is authoritative; existing self-starting probes install a temporary route, choose a free port, use Playwright Core, capture evidence, and remove owned resources. Browser-first is appropriate for web-equivalent renderer behavior. |
| `README.md` (`Local full-stack development`) | Monorepo stack ownership and safety | Canonical root `pnpm dev` owns fixed 8000/3000 and persistent worktree development state; do not interfere with an occupied port. |
| `autobyteus-web/ARCHITECTURE.md#testing-strategy` | Test organization | Unit/component coverage is colocated and web/Electron scopes are distinct. |
| `autobyteus-web/package.json` | Executable script authority | `test:nuxt`, production `build`, localization guards/audit, and existing browser probe scripts are available. |
| `autobyteus-web/vitest.config.mts` | Nuxt test configuration | Nuxt test environment and existing aliases/plugins are authoritative. |
| `autobyteus-web/tests/e2e/nested-team-aggregate-status-probe.mjs` and fixture | Closest durable browser precedent | Uses production history components, free port, owned Nuxt process group, Chromium, deterministic reactive fixture, request/error recording, screenshots, evidence JSON, and guaranteed temporary-route cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Nuxt repository checks | `autobyteus-web` | `corepack pnpm test:nuxt ... --run` | Existing workspace dependencies are installed | Command result | Process exits normally |
| Self-starting hierarchy browser probe | `autobyteus-web` | New `corepack pnpm test:e2e:nested-team-hierarchy -- --output-dir ...` | Copy durable fixture to one temporary page; free loopback port; owned detached Nuxt process; installed Chromium | HTTP 200 and production tree selector visible | Close page/context/browser, terminate owned process group, remove only installed temporary page |
| Production build | `autobyteus-web` | Build existing contract packages if needed, then `corepack pnpm build` | Generated workspace `dist` prerequisites are uncommitted outputs | Nuxt build completes and 15 routes prerender | Command exits; generated outputs remain ignored |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Representative root coordinator, three sibling configured teams, six-agent subtree, deeper configured team, transient task team/child, mixed statuses, long English/Chinese names | Durable browser fixture using current `RunHistoryTeamExecutionRow`/`TeamTreeNode` production types and production `WorkspaceHistoryWorkspaceSection` | Synthetic and deterministic; no backend, user, shared database, or production state touched | Fixture remains as durable test source; only copied Nuxt route is removed |
| Selection, expansion, quiet refresh, action counters | Fixture callbacks on the existing production component contracts | Counters observe emitted production actions; no fabricated production API claim | Page/browser state removed with owned context |
| Historical hydration | Existing `HistoricalTeamLazyHydration.integration.spec.ts` with isolated mocked transport/store setup | Does not use shared live data | Test process cleanup |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: Requirements `Data Continuity And Acceptable Loss`; implementation `Persisted Data Transition Check`
- Representative existing-data setup and required behavior: Current live and historical execution rows continue through the same projection/readers; only their presentation changes.
- Evidence planned: existing run-history execution-row/navigation projection tests plus historical lazy-hydration integration and production-component browser rendering of the same current row shapes
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` (9 cases) | Current stable/transient identities, exact selection, actions, disclosure, live projection removal, aggregate status; new printed-tree semantic assertions | `AC-001`–`AC-003`, `AC-006`, `AC-008` | Still Valid | Assertions match approved preserved behavior and production change | Rerun; do not weaken. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` relevant cases | Default collapse, independent structural toggle, no fabricated selection, ancestor reveal, quiet refresh, hydration selection, Stop/Archive/Delete | `REQ-010`; `AC-003`, `AC-008` | Still Valid | Uses full panel/state/action orchestration | Rerun complete file. |
| `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Historical Team selection lazily hydrates exact focused member and conversations | `QR-003`; `AC-008` | Still Valid | Existing integration boundary remains current | Rerun. |
| `components/workspace/history/__tests__/workspaceHistoryNestedTeamStatus.spec.ts` | Recursive configured/transient aggregate and sibling isolation | `REQ-008`; `AC-006`, `AC-008` | Still Valid | Status semantics explicitly preserved | Rerun. |
| `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Default collapse, ancestor reveal, independent state, quiet refresh behavior | `REQ-010`; `AC-003`, `AC-008` | Still Valid | State boundary unchanged and still authoritative | Rerun. |
| `composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Exact nested AgentRun selection, rejects stale selector | `REQ-010`; `AC-008` | Still Valid | Valid-target rule preserved | Rerun. |
| `stores/__tests__/runHistoryTeamExecutionRows.spec.ts` | Stable/transient rows, settled history descendants, exact run IDs | `REQ-009`; `AC-006`, `AC-008` | Still Valid | Production UI still consumes this shape unchanged | Rerun. |
| `stores/__tests__/runHistoryNavigationProjection.spec.ts` | Current exact topology/focus/live patches/historical rows | `QR-003`; `AC-008` | Still Valid | Direct current projection evidence | Rerun. |
| `tests/e2e/nested-team-aggregate-status-probe.mjs` + fixture | Production history components in Chromium; five statuses, recursive/transient scope, live reactive patch, localization, interaction, error/cleanup evidence | `REQ-008`–`REQ-010`; `AC-003`, `AC-005`, `AC-006`, `AC-008` | Needs Update | The initial rerun reached the new production row but its placement helper still expected the aggregate wrapper and old circular Team avatar to be direct siblings. The approved implementation now wraps status in `.member-status` and replaces that obsolete Team avatar with the filled configured-Team icon. Status semantics remain valid. | Update only the obsolete placement traversal/identity assertion; retain all aggregate, interaction, localization, live-patch, and exclusion assertions. |
| Implementation-only temporary preview evidence | Three selected visual states and component interactions | All visual ACs | Out Of Scope as durable authority | Preview route/script was intentionally removed and evidence is upstream implementation-scoped | Do not treat as repository-resident regression coverage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/nested-team-aggregate-status-probe.mjs` / `dotDetails` placement | Aggregate wrapper's next direct sibling is a circular 16px Team avatar | The approved configured-Team node identity is now the unboxed filled User group icon; status is intentionally grouped in `.member-status` before that icon | `DEC-003`; `REQ-003`; implementation `WorkspaceStableExecutionRow.vue` | Traverse through the `.member-status` container and assert the 16px `[data-team-icon="user-group-solid"]` identity while retaining exact gap/order checks | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `NTHUI-BR-001` | Deep configured/transient printed tree, node roles, connector geometry, selected-row styling | `REQ-001`–`REQ-005`, `REQ-009`; `AC-001`, `AC-002`, `AC-006` | `autobyteus-web/tests/e2e/nested-team-hierarchy-probe.mjs` and `fixtures/nested-team-hierarchy.page.vue` | Existing DOM tests cannot prove CSS/pseudo-element geometry or computed browser styling. |
| `NTHUI-BR-002` | Complete 260/320/520 × Default/Large/Extra Large matrix, overflow/control geometry, age/status yielding and recovery | `REQ-006`–`REQ-008`, `REQ-012`; `AC-004`, `AC-005`; `QR-002`, `QR-004` | Same durable probe/fixture | Browser layout and container-query behavior have no durable repository coverage. |
| `NTHUI-BR-003` | Pointer/Enter/Space disclosure, structural no-selection, concrete selection, quiet refresh, action isolation | `REQ-005`, `REQ-010`; `AC-003`, `AC-008` | Same durable probe/fixture | Proves production component event behavior and reactivity in a browser rather than only happy-dom. |
| `NTHUI-BR-004` | Tree/treeitem accessible identity/state/level and localized focus tooltip/keyboard recovery | `REQ-007`, `REQ-011`, `REQ-012`; `AC-004`, `AC-007`; `QR-001`, `QR-004` | Same durable probe/fixture | Critical accessibility acceptance needs direct browser/AX evidence. |
| `NTHUI-BR-005` | Runtime-error/request-failure absence and owned cleanup | Operational evidence | Same durable probe | Makes the new executable coverage reproducible and safe. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `NTHUI-SCRIPT-001` | `autobyteus-web/package.json` | Add the discoverable self-starting browser-probe script | Repository browser-probe convention | Production code unchanged. |
| `NTHUI-DOC-001` | `autobyteus-web/README.md` | Document purpose, command, ownership, and browser executable option | Project execution authority | Keeps durable execution discoverable. |
| `NTAS-BR-001` | `autobyteus-web/tests/e2e/nested-team-aggregate-status-probe.mjs` placement helper | Replace the obsolete direct-sibling circular-Team-avatar expectation with traversal through `.member-status` to the approved filled configured-Team icon | `DEC-003`; `REQ-003`; `AC-006` | Initial rerun failed in test code before any status assertion contradicted production; classified as API/E2E-owned stale coverage update. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `corepack pnpm test:nuxt components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts --run --pool threads --maxWorkers 1 --no-file-parallelism --no-isolate` | `autobyteus-web` | Changed component semantics and preserved actions/status | Pass — 9/9 | `api-e2e-evidence/repository/01-workspace-history-section.log` |
| 2 | Focused eight-file history/tree/state/selection/projection/hydration command with default per-file isolation | `autobyteus-web`; threads, one worker, no file parallelism | Full directly affected repository suite | Pass — 8 files, 120/120 | `api-e2e-evidence/repository/03b-focused-history-state-projection-isolated.log` |
| 2a | Same eight-file command with `--no-isolate` | `autobyteus-web`; one shared worker | Runner configuration check | Blocked as a usable configuration — first file passed 56/56, then Vitest made no progress for more than three minutes; API/E2E-owned process tree was terminated and the documented/default isolated mode passed | `api-e2e-evidence/repository/03-focused-history-state-projection.log` |
| 3 | `corepack pnpm test:e2e:nested-team-hierarchy -- --output-dir ../tickets/in-progress/nested-team-hierarchy-ui/api-e2e-evidence/nested-team-hierarchy` | `autobyteus-web`; owned free port/Chromium | New durable hierarchy browser scenarios | Pass — `NTHUI-BR-001`–`005` | `api-e2e-evidence/nested-team-hierarchy/evidence.json`, three screenshots, `nuxt.log` |
| 4 | `corepack pnpm test:e2e:nested-team-aggregate-status -- --output-dir ../tickets/in-progress/nested-team-hierarchy-ui/api-e2e-evidence/nested-team-aggregate-status` | `autobyteus-web`; owned free port/Chromium | Complementary current projection/status browser behavior | Pass — `NTAS-BR-001`–`004` after updating the obsolete placement assertion | `api-e2e-evidence/nested-team-aggregate-status/evidence.json`, three screenshots, `nuxt.log` |
| 5 | `corepack pnpm guard:localization-boundary` and `corepack pnpm audit:localization-literals` | `autobyteus-web` | Localization policy | Pass; zero unresolved literals | `api-e2e-evidence/repository/05-localization-boundary.log`; `06-localization-literals.log` |
| 6 | Affected history, tree-state, selection, projection, GraphQL, and hydration suite (20 files) | `autobyteus-web`; threads, one worker, default per-file isolation | Broader affected regression boundary | Pass — 201/201 | `api-e2e-evidence/repository/07-broader-history-hydration.log` |
| 7 | Contract prerequisite builds, then `corepack pnpm build` | workspace contract packages + `autobyteus-web` | Production bundling | Pass; 15 routes prerendered | `api-e2e-evidence/repository/08-production-build.log` |
| 8 | Probe syntax, temporary-route absence, and `git diff --check` | worktree root | Patch integrity and cleanup | Pass | `api-e2e-evidence/repository/09-patch-and-cleanup-check.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 201/201 broader affected checks include hierarchy semantics, preserved actions, projection, status, selection, quiet refresh, and historical hydration | Browser-only layout, responsive, focus, and AX criteria remain indirect | Execute `NTHUI-BR-001`–`004` in Chromium. |
| Changed-boundary execution directness | 88% | Production Vue components execute in Nuxt Test Utils and integration tests | happy-dom does not execute the real CSS/pseudo-element/layout boundary | Execute production components in Chromium. |
| Cross-boundary integration realism and mock gap | 92% | Full panel/state/action orchestration, current projection, GraphQL shape, and historical hydration integration pass | Backend transport remains mocked, but no backend/API boundary changed | Browser reactivity and action observation can close the material UI gap. |
| Environment, configuration, identity, and fixture fidelity | 85% | Current production row shapes and both locales are covered in repository tests; production build passes | Supported panel widths/font presets and real browser rendering are not exercised | Execute the deterministic current-contract matrix in the repository-supported Nuxt/Chromium path. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Error/status states, structural no-selection, transient removal, Stop/Archive/Delete outcomes, quiet refresh, and hydration recovery pass | Extreme hierarchy volume has no approved performance threshold | Browser interaction/reactive refresh check; retain extreme-volume residual risk. |
| User-surface, browser, and desktop-shell confidence | 75% | Component DOM semantics exist and production build succeeds | No real browser layout, focus, tooltip, container query, or AX proof yet | Required Chromium broader validation; Electron shell is not a changed boundary. |
| Durable regression coverage quality and relevance | 90% | Direct component/integration suites remain valid; durable hierarchy probe and fixture are implemented and syntax-valid | New browser assertions are not yet executable evidence at this score point; one stale aggregate placement assertion was found | Execute both durable probes after the stale assertion update. |

- Overall post-repository confidence: `88%`
- Calculation method: Simple average of the seven applicable categories
- Every critical acceptance criterion directly proven: `No — AC-001/002/004/005/007 still need direct browser layout/AX proof`
- Any applicable category below `90%`: `Yes — requirement proof, changed-boundary directness, environment/fixture fidelity, and user-surface/browser confidence`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: Browser layout/accessibility proof remains pending at this gate; extremely large-tree performance is non-blocking and outside the approved acceptance threshold.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`
- Specific confidence gap or residual risk addressed: CSS connector geometry, selected-row rendering, complete responsive/font matrix, truncation/metadata recovery, real focus/keyboard behavior, accessibility-tree exposure, and reactive state preservation cannot be proved by happy-dom/Vitest.
- Why the selected mode can materially improve confidence: It executes the changed production Vue/CSS/localization components under Chromium's actual layout, pseudo-element, focus, container-query, and accessibility implementations while retaining deterministic current production row contracts.
- Expected confidence after the selected validation: At least `95%` overall with no category below `90%`, if all repository and browser scenarios pass.
- Browser-specific decision and rationale: Required because the affected boundary is a web-equivalent Electron renderer; the repository explicitly supports self-starting Playwright Core probes for this purpose.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the same Nuxt renderer
- Relevant README or development instructions: `autobyteus-web/README.md` browser development and packaged Electron E2E sections
- Web-equivalent behavior: Entire changed scope—Workspace history Vue rendering, CSS, container queries, localization, keyboard/pointer actions, and ARIA
- Shell-specific or lifecycle behavior: None changed; no preload, IPC, window, native, packaging, updater, or embedded-server boundary is implicated
- Chosen validation approach and why it fits the project: Chromium against an owned Nuxt development renderer, following the repository's browser-probe convention
- Server/frontend setup when browser validation is used: Self-started Nuxt on a free loopback port with deterministic current production row contracts; no backend needed for a presentation-only change
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Actual Electron shell presentation is not separately launched; negligible consequence because no shell-specific boundary changed.

## Live Environment And Fixture Plan

- Startup order and commands: Durable probe verifies the fixture source and browser executable, refuses to overwrite a real page, copies the fixture to a temporary Nuxt page, starts an owned detached Nuxt process on a free port, waits for HTTP 200 and the production tree selector, then launches an isolated Chromium context.
- Environment choices that materially affect the run: loopback-only host, free port, Chromium/Playwright Core, UTC host, locale switched explicitly, root font scale set explicitly, no shared backend/database/credentials
- Health / readiness checks: Nuxt route returns 200 and `[data-test="workspace-team-execution-tree"]` is visible
- Seed data / fixtures: deterministic current `TeamTreeNode` and `RunHistoryTeamExecutionRow` shapes described above
- Test identities, authentication, permissions, or session state: no authentication; deterministic display names/addresses/run IDs; isolated browser context
- Requirement-linked journeys or scenarios: `NTHUI-BR-001` through `NTHUI-BR-005`
- DOM, screenshot, log, API, process, or other evidence to capture: computed styles and bounding boxes, pseudo-element geometry, ARIA attributes and Chromium AX nodes, interaction counters/state, width/font matrix, console/page/request events, screenshots at approved anchor states, Nuxt log, cleanup status, evidence JSON
- Owned processes and temporary state to clean up: page/context/browser, owned Nuxt process group, copied temporary route; retained outputs exist only under ticket `api-e2e-evidence/`

## Temporary Executable Validation Plan

None. The identified browser scenarios are material, deterministic regression coverage and will remain durable.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Extremely large trees beyond the approved representative depth/density | Upstream explicitly records this as a non-blocking risk with no performance acceptance threshold | Potential future layout/render performance at extreme volume | Record residual risk; separate performance ticket if product establishes a target. |
| Actual Electron shell | No shell-specific change and browser directly exercises the renderer boundary | Negligible | None unless later evidence identifies shell-only divergence. |
| External provider/network behavior | Not affected | None | None. |

## Ambiguities Or Reroute Triggers

None found during initial investigation. No requirement gap, design impact, compatibility path, or implementation contradiction is currently indicated.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — add hierarchy browser probe/fixture and update package script/README; remove none`
- Post-repository confidence: `88%`
- Broader validation decision: `Required — Browser`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The occupied unowned backend port is not a blocker because the selected repository-supported self-starting Nuxt browser path proves the actual changed renderer boundary without touching shared state.
