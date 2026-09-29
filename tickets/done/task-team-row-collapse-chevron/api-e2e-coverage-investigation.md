# API/E2E Coverage Investigation — task-team-row-collapse-chevron

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/design-spec.md`
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A (initial round)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1 (initial)
- Trigger: Implementation Complete from `implementation_engineer`, commit `4dc512f7b`
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Delegated (`task_team`) rows in the Agent Org history tree must disclose like mounted Team rows. They show the same chevron (REQ-001), and collapse or expand all descendants with correct connectors (REQ-002). State is per delegated execution (`rootRunId + teamRunId`) and independent of a same-named mounted Team and of other delegations (REQ-003). The row exposes `aria-expanded` and is keyboard-operable (REQ-004). Rows start expanded (REQ-005). A row click toggles and inspects the coordinator (REQ-006). Mounted Team, Agent and delegated Agent rows are unchanged (BEH-003 / AC-005). Frontend-only (`autobyteus-web`); no server, API, contract-package or persisted-data change. Architecture and source review: `N/A — not applicable`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 chevron + collapse on task-Team row | Added | REQ-001/002/004/005, AC-001/002 | Projector, component and browser proof of chevron, hidden descendants, connectors, `aria-expanded` |
| BEH-001 per-execution state | Added | REQ-003, AC-003, E-005 | Independence from the mounted Team, sibling delegations of the same Team, and nested delegations |
| BEH-002 row click = toggle + inspect coordinator | Changed | REQ-006, AC-004 | Component and panel-level proof, including the real subject-action path |
| BEH-003 mounted Team / Agent / delegated Agent rows | Preserved | AC-005 | Existing Org specs and probes remain valid |
| Panel binding (`WorkspaceAgentRunsTreePanel.vue`) | Added | design §2 | Not exercised by the implementer's specs (they spread the tree state directly). Needs a real panel test |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | tree-state composable, projector, collection template, panel binding | Projector spec, collection spec with the real tree state | Panel binding; sibling same-Team delegations; state across re-projection (live updates) | Durable Vitest additions |
| Browser integration / user journey | Yes | Real click, keyboard activation, rendered chevron, rotation, connector lines, alignment | None durable (the implementer's preview page was temporary) | Trusted keyboard Enter/Space; real CSS rotation and alignment; connector rendering | Browser dev-path probe (TESTING.md) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as the browser | As above | Same as the browser row | Browser dev-path probe |
| Desktop shell / Electron-specific | No | No main/preload/IPC change | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | `Not Affected` (in-memory UI state) | — | — | — |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron`
- Project type: pnpm monorepo; Nuxt 3 / Vue 3 renderer (`autobyteus-web`) with Vitest, Electron desktop shell
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/TESTING.md` (root; no closer `TESTING*.md`)
- Conflicting or unclear instructions: `pnpm test:nuxt` runs Vitest in watch mode by default; `autobyteus-web/AGENTS.md` says to add `--run`. `NUXT_TEST=true pnpm exec vitest run …` was used (equivalent).
- Required secrets: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers and path choice | Renderer UI → web unit tests + browser dev-path probe; probes live in `autobyteus-web/tests/e2e/` with `test:e2e:<name>` scripts; stop what you start; assertions first |
| `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md#testing` | Web test commands | Colocated `__tests__`; `test:nuxt` = `cross-env NUXT_TEST=true vitest`; use `--run` |
| `autobyteus-web/package.json` | Scripts | `test:e2e:*` → `node tests/e2e/<probe>.mjs` |
| `autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs` | Existing probe pattern | Copies a fixture page into `pages/`, starts its own `nuxi dev` on a free port with a dead backend URL, drives headless Chrome with playwright-core, and cleans up the process and page |
| Implementation handoff | Fresh worktree setup | `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web exec nuxi prepare` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies | worktree root | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-web exec nuxi prepare` | done, exit 0 | exit code | n/a |
| Nuxt dev server (probe-owned) | `autobyteus-web` | spawned by the probe: `pnpm exec nuxi dev --host 127.0.0.1 --port <free>` | free port; `BACKEND_NODE_BASE_URL=http://127.0.0.1:65534` | fixture route HTTP 200 | probe kills its process group |
| Headless Chrome | — | playwright-core `chromium.launch` with local Chrome | — | page loaded | probe closes it |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Org execution tree with a mounted and a delegated Team at the same address, nested delegation, and two delegations of the same Team | In-page reactive `AgentOrgRunHistoryItem` modelled on `taskBearingOrgFixture` and the user screenshot (Teacher, StudentStudyGroup, Reviewers) | No backend or user data touched; GraphQL is routed or blocked in the page | Fixture page copied into `pages/` for the run and removed afterwards |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (in-memory UI state only; resets on reload by design). No evidence required beyond confirming no persistence was introduced (diff review: none).

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `utils/__tests__/agentOrgHistoryRows.spec.ts` (new, 3 tests) | Default expanded; collapsed omits descendants, keeps coordinator, fixes branch metadata; nested collapse is independent | REQ-001/002/003/005 | Still Valid | Matches design §3 | Keep; extend with sibling same-Team delegations |
| `WorkspaceAgentOrgDelegatedRows.spec.ts` › "Org history delegated Team disclosure" (new, 3 tests) | Chevron down, `aria-expanded`, click toggles and inspects the coordinator, mounted `/team` independent | AC-001/002/003/004 | Still Valid | Real `useWorkspaceHistoryTreeState` | Keep; extend with state across re-projection |
| `WorkspaceAgentOrgDelegatedRows.spec.ts` › pre-existing delegated rows | "Started by" lines, plain names | BEH-001 preserved | Still Valid | default open keeps members visible | Keep |
| `WorkspaceAgentOrgDisclosure.spec.ts` | Mounted Team / run disclosure | AC-005 | Still Valid | unchanged branch | Keep |
| `WorkspaceAgentOrgActivityPublication.spec.ts` | Org row activity publication | AC-005 | Still Valid | — | Keep |
| `services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts` | Projector call without `isTaskTeamExpanded` | REQ-005 default | Still Valid | optional input defaults open | Keep |
| `stores/__tests__/agentOrgHistoryApollo.spec.ts` | Mounts the collection through history | AC-005 | Still Valid | — | Keep |
| `WorkspaceAgentRunsTreePanel.spec.ts` (Org cases) | Real panel Org archive/delete | AC-005 | Still Valid | — | Keep; add a delegated-Team binding case |
| `WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Panel regressions | — | Out Of Scope (pre-existing failure: stub lacks `beginSelectionIntent`, same on base) | implementation handoff | Record only |
| `tests/e2e/task-agent-monitor-visibility-probe.mjs`, `task-agent-peer-sidebar-probe.mjs` | Standalone Team tree / Team members panel | — | Out Of Scope (they do not render the Org history tree) | fixture inspection | None |
| `tests/e2e/agy-*-org-probe.mjs` | Real-provider Org journeys; select `agent-org-team-row-*` | AC-005 | Still Valid (the selector prefix does not match `agent-org-task-team-row-*`) | grep | None |

## Stale Or Obsolete Coverage Decisions

None. The old inspect-only row click had no dedicated assertion that asserted "no toggle".

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Req / AC | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| API-TTRC-001 | Two delegations of the same Team collapse independently; collapsing the mounted Team does not hide delegated rows | REQ-003 / AC-003 | `autobyteus-web/utils/__tests__/agentOrgHistoryRows.spec.ts` | E-005 names this case; not covered |
| API-TTRC-002 | Collapsed state survives re-projection when the live execution tree changes (new member added to a collapsed delegated Team stays hidden until expanded) | REQ-003/005, handoff hint "live run while collapsed" | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDelegatedRows.spec.ts` | Guards against state keyed on unstable row identity |
| API-TTRC-003 | Real `WorkspaceAgentRunsTreePanel` binding: task-Team row toggles through the panel's tree state and dispatches the real `inspect` subject action for the coordinator (`orgContexts.select` with `agent_execution`, router `agentRunId`) | REQ-006 / AC-004, design §2 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | The panel binding lines are otherwise unexercised |
| API-TTRC-B01..B07 | Browser dev-path journeys (see ledger) | AC-001..005, REQ-004 | `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs` + `tests/e2e/fixtures/agent-org-task-team-disclosure.page.vue` + `package.json` script `test:e2e:agent-org-task-team-disclosure` | TESTING.md prescribes a browser probe for renderer UI; trusted keyboard, CSS rotation and alignment cannot be proven in jsdom |

## Durable Coverage To Update

None beyond the additive cases above.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `NUXT_TEST=true pnpm exec vitest run` on the 8 focused files (projector, 4 Org collection specs, hydration, Apollo history, panel, tree-state composable) | `autobyteus-web` | Baseline before test edits | Pass (143/143) | console |
| 2 | Same focused set after the durable additions | `autobyteus-web` | API-TTRC-001..003 + regression | see execution report | — |
| 3 | `NUXT_TEST=true pnpm exec vitest run components/workspace/history composables utils services/agentOrgExecution stores` | `autobyteus-web` | Broader regression | see execution report | — |
| 4 | `pnpm -C autobyteus-web test:e2e:agent-org-task-team-disclosure` | worktree root | Browser journeys B01..B07 | see execution report | `autobyteus-web/test-results/agent-org-task-team-disclosure/` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. Multiple independent cases, including a Nuxt dev-server browser run.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-row-collapse-chevron/tickets/in-progress/task-team-row-collapse-chevron/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one durable scenario or one browser journey

## Post-Repository Confidence Scorecard

Recorded after repository execution (Vitest focused 146/146; broad run has no new failures):

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | All ACs asserted in jsdom | REQ-004 keyboard not driven; rendering unmeasured | Browser probe |
| Changed-boundary execution directness | 90% | Real composable, projector, collection, panel binding | jsdom only | Browser probe |
| Cross-boundary integration realism and mock gap | 90% | Real panel + subject actions; non-participating stores mocked | No real browser | Browser probe |
| Environment, configuration, identity, and fixture fidelity | 90% | Fixture mirrors the DTO shape | Not a live run | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Nested, sibling, live re-projection | Not in a real browser | Browser probe |
| User-surface, browser, and desktop-shell confidence | 75% | jsdom class assertions only | CSS rotation, alignment, trusted keys | Browser probe |
| Durable regression coverage quality and relevance | 90% | 3 new cases + mutation check | No durable browser journey | Durable probe |

- Overall post-repository confidence: 87%. Categories below 90%: requirement proof (85%) and user surface (75%). Broader validation is `Required`. Final scores are in the execution report (final 95%).

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` (dev-path probe, per TESTING.md "Renderer UI … Web unit tests + a browser dev-path probe")
- Confidence gap addressed: REQ-004 keyboard operability with trusted key events; real rendered chevron rotation and alignment with the mounted Team chevron; connector lines in the collapsed state; the full click journey in a real browser, with the live tree mutating while collapsed
- Expected confidence after: ≥ 95%
- Browser-specific rationale: the change is purely renderer UI; the browser surface directly exercises it
- Isolated desktop instance: not selected. There is no shell-specific change. A real delegated-Team Org run would need live model providers to produce a delegation, and adds no evidence about the changed renderer boundary beyond the probe. Recorded as a residual, not a gap.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer
- Web-equivalent behavior: all changed behavior
- Shell-specific behavior: none
- Chosen approach: browser dev-path probe (web-equivalent renderer)
- Effect on any running desktop application: None (own Nuxt process on a free port; no user data)

## Live Environment And Fixture Plan

- Startup: the probe copies the fixture into `pages/`, spawns `nuxi dev` on a free port, and waits for the route to return 200
- Environment: `BACKEND_NODE_BASE_URL=http://127.0.0.1:65534` (dead), `/graphql` and `/rest/health` routed in the page
- Seed data: a reactive in-page Org run; no backend
- Journeys: B01..B07 in the ledger
- Evidence: `evidence.json` (DOM/state assertions, recorded inspect calls, geometry), screenshots, `nuxt.log`
- Cleanup: close the browser, kill the Nuxt process group, remove the installed fixture page

## Temporary Executable Validation Plan

None. All new executable checks are durable.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Real provider-backed Org run producing a delegation, in an isolated desktop instance | Requires live model providers to make an agent delegate; no renderer difference from the probe | Low: the renderer consumes the same `AgentOrgRunHistoryItem` shape, which is covered by the existing hydration and Apollo specs | None |
| Auto-reveal of a user-collapsed delegated Team when a hidden member is selected | Approved non-goal | — | — |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (API-TTRC-001..003, browser probe B01..B07)
- Post-repository confidence: see execution report
- Broader validation decision: `Required` (Browser)
- Reroute Required Before Validation Execution: `No`
