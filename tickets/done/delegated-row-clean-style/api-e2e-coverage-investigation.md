# API/E2E Coverage Investigation — delegated-row-clean-style

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md` (SR-001)
- Design Spec: `.../design-spec.md`
- Supplemental Task Artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (Visual Language; VIS-001, VIS-008); `.../solution-design-handoff.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md`
- Implementation Revision Record: `.../implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (commit `c21d312c0`)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (per `get_handoff_rules`)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

REQ-001: delegated rows (delegated Agents, delegated Teams and their members) under Agent, Agent Team and Agent Org roots read like other tree rows. AC-001 sets the rendered values: no border or tint, `gray-600` text (`#666666`), `gray-50` hover (`#f2f2f2`), `2px indigo-500` focus ring, a 16 px `slate-500` bolt, a semibold Team name, and a selected style identical to member rows (`#eef2ff`, inset `2px #6366f1`, `indigo-900`, square). AC-002: interaction is unchanged (select, expand, Enter/Space, tooltip). There are two presentation owners: `WorkspaceTransientExecutionRow.vue` (Agent and Team roots) and `WorkspaceAgentOrgHistoryCollection.vue` (Org root). The design names one risk: branch-line alignment after the `inset: -1px` removal.

## Supported Scenarios And Real Usage

- Designer scenarios: UC-001 (render delegated rows under each root kind).
- Real-use scenarios added:
  - A user views a stored standalone Agent run with `@` collaborators and a delegated task Agent. Trigger: the history tree hydrates through `agentRunCollaboration`.
  - A user moves the pointer over rows (hover).
  - A user tabs through the tree with the keyboard (focus-visible ring and tooltip).
  - A user selects with click, Enter or Space.
  - A user collapses and expands a delegated Team.
  - A user views the tree at a 390 px width.
- Unsupported or contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Agent/Team-root delegated row style | Changed | design spec "Exact Target Changes" | Class-level component tests plus computed-style browser proof |
| BEH-001 Org-root task rows: focus ring, bolt, semibold | Changed | design spec | Same |
| `inset: -1px` branch offset | Removed | design spec Removal Plan | Branch geometry browser proof (nested-team-hierarchy probe plus an inset check) |
| Selection, disclosure, keyboard, tooltip, aria | Preserved | AC-002 | Existing tests plus browser interaction |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | Vue classes and icon | Component tests (jsdom, class assertions, Icon mocked) | Classes are not proof of the rendered Tailwind values, `:focus-visible` or hover | Browser |
| Browser integration / user journey | Yes | Rendered row appearance and interaction | Existing headless probes (no computed-style assertions) | Computed hover, focus and border; the Agent root never rendered | Browser |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer | As above | — | Browser (web-equivalent) |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style` (branch `codex/delegated-row-clean-style`, HEAD `c21d312c0`).
- Stack: Nuxt 3 / Vue 3 renderer, Tailwind 3.4 (custom gray palette in `autobyteus-web/tailwind.config.js`), Vitest, Playwright-core headless Chrome probes.
- Testing guidelines: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/TESTING.md`. There is no closer `TESTING*.md` under `autobyteus-web`. Root `AGENTS.md` and `DESIGN.md` were also read.
- Conflicts: none. TESTING.md path for "Renderer UI" = web unit tests + a browser dev-path probe. An isolated desktop instance is not needed: there is no shell-specific behavior.
- Secrets: N/A.

| Instruction / Configuration Path | Authority / Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` | Test map and rules | `pnpm -C autobyteus-web test:nuxt`; browser probes `pnpm -C autobyteus-web test:e2e:<name>` start their own Nuxt server against mocked routes; assertions first, screenshots supporting; never touch the user's app |
| `autobyteus-web/package.json` | Scripts | `test:e2e:nested-team-hierarchy`, `test:e2e:agent-org-task-team-disclosure`; peer probe run with `node tests/e2e/task-agent-peer-sidebar-probe.mjs` |
| `autobyteus-web/tailwind.config.js` | Palette | gray-600 `#666666`, gray-50 `#f2f2f2` (matches the UI spec) |
| Implementation handoff | Env | `pnpm install --frozen-lockfile` and `nuxt prepare` already done in this worktree |

| Component / Dependency | Working Directory | Start / Setup | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Nuxt dev server (per probe) | `autobyteus-web` | `pnpm exec nuxi dev --host 127.0.0.1 --port <free>`, `BACKEND_NODE_BASE_URL` dead | Own process group | HTTP 200 on the fixture route | SIGTERM/SIGKILL of the owned process group |
| Headless Chrome | — | Playwright `chromium.launch` with system Chrome | Fresh context | — | `browser.close()` |

| Data / Fixture Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent root with `@` Agent, `@` Team (2 members), delegated task Agent | Temporary page `api-e2e-evidence/probe/agent-root.page.vue` + GraphQL `GetAgentRunCollaboration` emulation using the `agentRootFixture` shape | In-page only; no backend | Page removed in finally |
| Team root with delegated Agents, delegated Team, nested delegated Agent | Durable fixture `tests/e2e/fixtures/task-agent-peer-sidebar.page.vue` installed under a temporary route | In-page | Removed |
| Org root with task Agent, task Teams (nested) | Durable fixture `tests/e2e/fixtures/agent-org-task-team-disclosure.page.vue` installed under a temporary route | In-page | Removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history/__tests__/WorkspaceTransientExecutionRow.spec.ts` (new) | Classes: no dashed/tint; gray-600, gray-50 hover, ring-2 indigo-500; selected classes; 16 px slate bolt and semibold; Agent dot and avatar; click/Enter/Space emit | AC-001, AC-002 | Still Valid | Matches design "Exact Target Changes" | Keep |
| `__tests__/WorkspaceAgentOrgDelegatedRows.spec.ts` (+1 case) | Org task rows' focus-ring classes, bolt, no user-group, semibold | AC-001 | Still Valid | Same | Keep |
| Other `components/workspace/history/__tests__/*` | Tree structure, selection, disclosure, labels | AC-002 | Still Valid | 154/154 pass | Keep |
| `WorkspaceHistoryWorkspaceSection.spec.ts` user-group assertions | Configured Team header icon | — | Out Of Scope | Not delegated rows | None |
| `tests/e2e/nested-team-hierarchy-probe.mjs` | Branch geometry (rail coordinate, 1px lines, vertical continuity) for all rows incl. transient; `temporary-task-team` count | AC-001 (alignment risk), AC-002 | Still Valid | Asserts geometry, not style | Run |
| `tests/e2e/task-agent-peer-sidebar-probe.mjs` | Team-root delegated peers, selection, retry, containment | AC-002 | Still Valid | — | Run |
| `tests/e2e/agent-org-task-team-disclosure-probe.mjs` | Org task-Team disclosure | AC-002 | Still Valid | — | Run |

## Durable Coverage To Add

None. The new and updated component tests already cover the approved class contract at the right layer. Computed-style proof in a browser only certifies the rendered result of this restyle once. A durable computed-color probe would pin Tailwind palette values and add maintenance without guarding any behavior beyond what the class tests already guard.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory | Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt components/workspace/history --run` | worktree root | Changed components (class contract), history regressions | Pass (11 files / 154 tests) | `api-e2e-evidence/history-tests.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt components --run` | worktree root | Broader web component regressions | 208 pass / 9 files (16 tests) fail. All failures are unrelated: an unresolved `@autobyteus/application-sdk-contracts` entry (3 Application specs), a cross-package `autobyteus-ts` fixture import (UserMessageStoredUploadNames), and assertions in FileExplorer, ToastContainer, RightSideTabs (Loading workspace), MobileUxRefinement (auto-approve switch) and AgentCompactionLiveFlow. No failing spec references any changed or parent tree component. Same set as the implementation report. | `api-e2e-evidence/components-tests.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are several independent browser cases, each with its own Nuxt server.
- Path: `.../api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

| Category | Score | Supports | Remaining | Improve |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | Class assertions for every AC-001 value under both owners | Rendered values, hover and focus-visible not proven | Computed-style browser probe |
| Changed-boundary directness | 75% | Production components mounted | jsdom, Icon mocked, no CSS | Browser |
| Integration realism / mock gap | 75% | Real stores in history tests | Agent root never rendered through its store | Browser with the real store and GraphQL read path |
| Env / fixture fidelity | 90% | Fixtures mirror production shapes | — | — |
| Edge / lifecycle | 90% | Selected, collapsed, nested Team | Narrow width | 390 px browser |
| User-surface / browser | 60% | — | No rendered proof yet | Browser |
| Durable regression quality | 95% | Focused, requirement-linked class tests | — | — |

- Overall post-repository confidence: ~80% (simple average 80%).
- Every critical AC directly proven: `No` (AC-001 rendered appearance).
- Categories below 90%: requirement proof, directness, mock gap, browser.
- 95% target met: `No`.

## Broader Validation Decision

- Decision: `Required`
- Mode: `Browser` (TESTING.md web-equivalent renderer path)
- Gap addressed: rendered computed styles, real hover and keyboard `:focus-visible`, the Agent root through its real store, branch geometry after the inset removal, and the 390 px width.
- Why: the change is purely visual. Only a real CSS engine proves the values.
- Expected confidence after: ≥95%.
- Desktop shell: not applicable. This is renderer-only, with no IPC, preload or window changes, so the web-equivalent browser path proves the boundary.

## Live Environment And Fixture Plan

- Startup: each probe starts its own Nuxt dev server on a free port with a dead backend URL and its own headless Chrome.
- Seed: the in-page fixtures above. Agent-root data goes through emulated `GetAgentRunCollaboration` and `GetAgentRunCollaborationMemberProjection` responses.
- Journeys: E2E-001..008 in the ledger.
- Evidence: `evidence.json` with computed styles per row, screenshots and Nuxt logs under `api-e2e-evidence/`.
- Cleanup: temporary pages, the Nuxt process group and the browser are removed in finally. The cleanup receipts are recorded.

## Temporary Executable Validation Plan

| Case ID | Probe | Proven | Why Not Durable |
| --- | --- | --- | --- |
| E2E-001..005 | `api-e2e-evidence/probe/delegated-row-style-probe.mjs` (+ `agent-root.page.vue`) | Computed style, hover, keyboard focus ring, selection parity and interaction under the Agent, Team and Org roots; 390 px | A one-off certification of the restyle. Durable value is already held by the class-level component tests. Pinning computed palette colors durably would be brittle. |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Packaged Electron rendering | No shell change; same renderer | Negligible | None |
| Visual pixel diff against VIS-001/VIS-008 | Fixture content differs from the references; values asserted instead; screenshots supporting | Low | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Added / Updated / Removed: `No`
- Post-repository confidence: ~80%
- Broader validation decision: `Required` (Browser), executed.
- Reroute Required: `No`
- Post-execution update (round 1): every planned case passed. Final confidence is 96%, with no category below 90% (see the execution coverage report). Three temporary-probe attempts were voided for probe-only assertion and timing defects (Tailwind preflight border style, the `outline-none` transparent outline, `transition-colors` timing). No coverage decision changed.
