# API/E2E Coverage Investigation — collapsed-left-panel-expand-keeps-run

All relative paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/`. Ticket folder: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md` (SR-003, Approved 2026-10-08)
- Investigation Notes: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `tickets/in-progress/collapsed-left-panel-expand-keeps-run/design-spec.md` (SR-004, D-1..D-7)
- Supplemental Task Artifacts: Product `ui-ux-spec.md` + VIS-001..008 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/`); `handoff-architecture-design-complete.md`; `product-design-request.md`; `approval-request.md`; `evidence/user-collapsed-strip-run-open.png`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-test-case-ledger.md`
- Current Investigation Round: 3
- Trigger: round 1 — implementation handoff IR-001 (`1639cba95`); round 2 — IR-002 (`d0bf3db82`), Local Fix for CR-001 / FAIL-001
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Behavior to prove (REQ-001..REQ-010, AC-001..AC-012, design D-1..D-7):

- A collapsed-strip **Workspaces** button (`ph:tree-view`, divider, en "Workspaces" / zh-CN "工作区") shows the left panel (docked, or the drawer on narrow/short windows) and never changes the route, selection, center, draft or right panel/tab.
- Highlight (single owner `useShellPrimaryNavigation`): Chat lit only on New chat; Workspaces lit (`aria-current="location"`) while a run is shown (`/chat?id=` with a registered context, an Org run route, a selected Team run on `/workspace`); not on the Org launch page or an empty `/workspace`.
- On panel appear: the open run's row is selected, all ancestors expanded (incl. a focused member's nested sub-team rows, D-5), centred only if not fully visible, focused when opened from Workspaces; the reveal window (3 s) is cancelled by wheel/pointerdown/keydown.
- Collapse moves focus to Workspaces; drawer Escape returns focus to Workspaces.
- Short windows (481–540 px tall): divider hidden, 4 px gap, Settings visible.
- Preserved: page icons dock+navigate; Chat row/pencil open New chat; Task-card/Team-tab/send open paths.
- Final real-product check: an isolated desktop instance of a worktree build (requirements "Done when … in the desktop app"; design Guidance).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-006.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 (REQ-005, AC-002, D-5): a **non-coordinator member of a nested task Team**. Planned as a right **Team tab** open; execution showed the right Team tab renders only team messages (`RightSideTabs` → `CollaborationOverviewPanel`; `TeamMembersPanel` is fixture-only), so that trigger does not exist in this product. The real path is: select the member in the docked tree, collapse, later Workspaces (fresh tree mount; D-5 must reopen the sub-team rows).
  - SCN-A2 (REQ-005): a **New chat first send** while collapsed (the run opens on `/chat?id=`), then Workspaces.
  - SCN-A3 (AC-004): an Org member far down a long tree (many workspace rows above), opened from a Task card at 1440×620, so the reveal needs a large scroll.
  - SCN-A4 (AC-004 alternate, QR-002): rows that arrive after the panel appears. Execution showed an open Org worker's row is already rendered (live Org projection) when Workspaces docks the panel, so rows only arrive late when the app starts on the run with a slow backend. Covered as a slow app start on the worker route, with a user scroll before the rows arrive (no jump) and without input (revealed on arrival).
  - SCN-A5 (AC-011, AC-006 in a real browser): Org launch page and empty `/workspace` do not light Workspaces; `/agents` lights Agents; a collapsed-strip page icon docks and navigates.
  - SCN-A6 (product journey): the same Task-card → Workspaces flow in the packaged desktop app (isolated instance).
- Contrived scenarios: none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Workspaces strip button, no navigation | Added | REQ-001/002, D-3 | Unit (strip) + browser (route/center/tab unchanged) |
| BEH-002 drawer + focus return | Changed | REQ-002/009, D-3 | Unit (default-drawer) + browser 760×900 |
| BEH-003 collapse focus | Changed | REQ-009, D-6 | Unit + browser |
| BEH-004 full ancestry + bounded reveal | Changed | REQ-003/004, D-4/D-5 | Unit (tree state, reveal composable) + browser for every host kind, far-down scroll, user takeover |
| BEH-005 open paths | Preserved | REQ-005 | Browser: Task card (3 hosts), Team tab, first send |
| BEH-007 Chat row/pencil clicks | Preserved | REQ-007 | Unit (existing DI-001) |
| BEH-008 highlight rule | Changed | REQ-008, D-1/D-2, DEC-005 | Unit (all AC-011 routes) + browser for each route kind |
| D-7 route predicates | Changed (extraction) | design D-7 | Unit (service) + consumers' existing specs |
| Path-only Chat rule; inline parsers; probe Chat reopen | Removed | Removal plan | Verify no remaining consumer/test asserts the old rule |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | Renderer reads existing GraphQL/WS only | — | — | — |
| Frontend component / state | Yes | Strip, panel, highlight composable, tree state, reveal composable | Unit/component specs | Real layout geometry, async row arrival, real stores | Browser |
| Browser integration / user journey | Yes | Collapse → open run → Workspaces → reveal | PMU-017 (implementation-authored) | Team tab, first send, far-down scroll, takeover in a real browser | Browser (PMU probe extension) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer inside Electron | Browser probe | Packaged renderer bundle (production build, icon bundling) | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | — |
| Process / lifecycle | No | Panel mount lifetime only (renderer) | Unit (reveal window unmount) | — | — |
| Persisted-data transition | No | `Not Affected` (in-memory renderer state) | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | Scripted AGY CLI used only to create real Task roots | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run`, branch `codex/collapsed-left-panel-expand-keeps-run`
- Project type: pnpm monorepo; Nuxt 3 renderer (`autobyteus-web`), Node/TS backend (`autobyteus-server-ts`), Electron desktop shell.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-web`.
- Conflicting/missing instructions: none. TESTING.md lists PMU-001..PMU-016; PMU-017 (and any new case) needs a docs line at delivery docs sync.
- Required secrets: `N/A` for PMU (scripted AGY CLI). `chat-draft-rows-live` needs a logged-in Codex CLI (`~/.codex/auth.json` present; small prompts on the user's Codex quota, as the guideline documents).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers and rules | Renderer UI → web unit tests + browser dev-path probe; full product journey → isolated desktop instance of a worktree build; never the user's app/data; stop what you start |
| `TESTING.md` § Live Projects pages | PMU probe | Rebuild server, `pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir <fresh>`; probe owns stack/data/Chrome |
| `TESTING.md` § Chat Draft Rows Regression | D11 probe | `prebuild && build`, `nuxt prepare`, `test:e2e:chat-draft-rows-live --output-dir <fresh>`; needs Codex CLI |
| `autobyteus-web/AGENTS.md` | Web package rules | `test:nuxt --run`; never `git add -A` |
| `docs/isolated-app-instances.md` | Isolated desktop | `pnpm --silent isolated-app start --build` / `--from-worktree`; `--data-root <owned>`; isolated server gets only baseline env, AutoByteus settings come from the data root `.env`; control via browser automation on `controlPort`; `stop <instanceId>` |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` header | Probe prerequisites | Built `dist/app.js`, Chrome; scripted AGY CLI `AGY_FAKE_CASE=linked_skills`; `CALL_TOOL:{…}` drives real scoped tools |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built backend | `autobyteus-server-ts` | already built in worktree (`dist/app.js`); probe spawns it | private SQLite, free port | probe `backend GraphQL` | probe stops its process group |
| Nuxt dev frontend | `autobyteus-web` | probe spawns `nuxi dev` | free port | probe warm-up | probe stops its process group |
| Headless Chrome | — | probe launches | `/Applications/Google Chrome.app` | — | probe closes |
| Isolated desktop app | repo root | `pnpm --silent isolated-app start --build --data-root <owned dir>` | own ports/data; another agent's instance `iso-63369-6c20` (agpl-slice-2) is running and must not be touched | `start` JSON readiness | `pnpm --silent isolated-app stop <myInstanceId>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org definitions, Projects, Tasks, Task roots | Probe GraphQL mutations + scripted Manager `delegate_task` | probe-owned temp data root | data root removed by probe |
| Long tree (far-down Org member) | Extra registered workspace folders created through `createWorkspace` | probe-owned paths under its data root | removed with data root |
| Isolated desktop data | Same GraphQL mutations against the instance backend; scripted AGY CLI via the owned data root `.env` (to be verified) | owned `--data-root` under `/tmp` | stop instance; delete owned root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `composables/__tests__/useShellPrimaryNavigation.highlight.spec.ts` (new) | Chat only on New chat; Workspaces on registered `/chat?id`, Org run, selected Team; not Org launch, empty `/workspace`, team draft, opening run | AC-011, D-1/D-2 | Still Valid | diff reviewed | Run |
| `composables/__tests__/useShellPrimaryNavigation.spec.ts`, `.capabilities.spec.ts` | Path rule now takes `{path, query}` | AC-011 | Still Valid (updated) | diff | Run |
| `components/layout/__tests__/LeftSidebarStrip.spec.ts` | Divider, button, no router push in both modes, aria, labels | AC-006, AC-010, REQ-001/002 | Still Valid | diff | Run |
| `components/__tests__/AppLeftPanel_v2.spec.ts` | Collapse focus, Chat row highlight, existing DI-001 | AC-007, AC-012 | Still Valid | diff | Run |
| `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | D-5 member ancestry + pending rule + manual collapse respected | REQ-003/004 | Still Valid | diff | Run |
| `components/workspace/history/__tests__/useRevealSelectedTreeRow.spec.ts` (new) | Scroll only when hidden, centring, cancel on interaction, deadline, focus handoff | AC-004, D-4 | Still Valid (jsdom geometry mocked) | diff | Run |
| `services/workspace/__tests__/workspaceNavigationService.spec.ts` | Predicates | D-7 | Still Valid | diff | Run |
| `layouts/__tests__/default-drawer.spec.ts` | Workspaces drawer + focus return | AC-005 | Still Valid | diff | Run |
| `pages/__tests__/chat.spec.ts` | Chat page with mocked service | — | Still Valid | diff | Run |
| `tests/e2e/project-manager-ux-probe.mjs` PMU-001..016 | Projects journeys incl. left panel (PMU-008), Projects tab (PMU-015/016) | REQ-007 preserved paths | Still Valid | — | Run full suite (regression) |
| `tests/e2e/project-manager-ux-probe.mjs` PMU-017 (implementation-authored) | 3 hosts via Task card, drawer, short window, New chat | AC-001/003/005/009/010/011/012 | Needs Update | Worker-row match is permissive (`!r.agentRunId` passes any selected row); center check accepts any worker text; AC-009 "nothing newly selected" and AC-008 not asserted | Tighten assertions (keep case ID) |
| `tests/e2e/chat-draft-rows-live-probe.mjs` D02 on-run Chat assertion, D11 reopen | Chat not lit on a run; Workspaces reopens with route unchanged | REQ-008, R-002 | Still Valid (updated by implementation, never executed) | diff | Run with Codex |
| Other probes/specs asserting Chat lit on `/chat?id=` | Old rule | REQ-008 | Still Valid (none found) | grep of `autobyteus-web` specs/probes for `isShellPrimaryRouteActive`, `isPrimaryNavActive`, `data-nav-key="chat"` | None |
| `tests/e2e/projects-primary-navigation-probe.mjs` B-001/B-005 compact order | Strip page-icon order = `button[data-nav-key]` minus Settings | AC-010, REQ-001 (Workspaces after the page icons) | Needs Update | r1 B-001 Fail: the selector now also matches Workspaces | Narrow the selector to page icons; assert Workspaces directly follows them |
| `tests/e2e/workspace-responsive-probe.mjs` | Opens the strip's first button (Chat) as the drawer opener; page highlight on `/agents`, `/agent-teams` | REQ-007 | Still Valid (by inspection) | Reads only the first strip button and page keys; no `/chat?id` or strip-count assertion | Not run (needs an externally started frontend; no assertion touches the change) |
| `tests/e2e/fixtures/task-agent-monitor-visibility.page.vue` (`TeamMembersPanel`) | Fixture-only member tree | — | Out Of Scope | `TeamMembersPanel` is not mounted by any product component; the right Team tab renders `CollaborationOverviewPanel` (messages only) | None |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| PMU-018 | Team-tab nested task-Team member; New chat first send; far-down Org member large scroll; slow load + user scroll → no jump; AC-011 route highlight and AC-006 page icon in the browser | REQ-003/005/007/008, AC-002/004/006/008/011 | `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (new case PMU-018) | Real geometry, async row arrival and real open paths are only exercised in a rendered browser; the gaps were explicitly called out in the handoff |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| PMU-017 | `project-manager-ux-probe.mjs` | Require the selected row to be exactly the worker's row; require the center to still show the worker; assert it is the only selected row and the selection store/route are unchanged; on New chat assert no selected tree row and unchanged selection after Workspaces | AC-001/003/008/009 | Same case ID |
| NAV-PROBE | `projects-primary-navigation-probe.mjs` | Page-icon selector excludes `workspaces`; compact mode asserts Workspaces directly follows the last page icon (DOM + visual order) | AC-010, REQ-001 | Found during execution |

## Durable Coverage To Remove

None. The implementation already removed the D11 dead `workspace-left-strip-open` fallback (design Removal Plan); confirmed in the diff.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt <changed specs> --run` | worktree | Changed units | Planned | `api-e2e-evidence/` |
| 2 | `pnpm -C autobyteus-web test:nuxt --run` | worktree | Web regression | Planned | `api-e2e-evidence/web-unit-full-run.log` |
| 3 | `node --check` + PMU-017/018 | worktree | Browser journeys | Planned | `api-e2e-evidence/pmu-*/` |
| 4 | full `test:e2e:project-manager-ux` | worktree | PMU regression | Planned | `api-e2e-evidence/pmu-full/` |
| 5 | `test:e2e:chat-draft-rows-live` | worktree, Codex runtime | D02/D11 updated assertions | Planned | `api-e2e-evidence/chat-draft-rows/` |
| 6 | isolated desktop journey | worktree build | Packaged renderer | Planned | `api-e2e-evidence/isolated-desktop/` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independently meaningful browser journeys, long-running probes and a desktop build; interruption risk.
- Canonical ledger path: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Scored after the unit suite and before the browser/desktop runs.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | Unit specs for every D-* and AC-006/007/010/011 | AC-001..005/008/009/012 need rendered proof | Browser probe per host kind |
| Changed-boundary execution directness | 85% | Real composables/components in jsdom | Mocked stores/geometry | Browser |
| Cross-boundary integration realism and mock gap | 80% | — | Real Task roots, history loading | Probe with real backend |
| Environment, configuration, identity, and fixture fidelity | 80% | — | Packaged bundle | Isolated desktop |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Reveal cancel/deadline unit-tested | Real late rows, user takeover | Slow-backend browser case |
| User-surface, browser, and desktop-shell confidence | 70% | — | Rendering, focus, scroll | Browser + desktop |
| Durable regression coverage quality and relevance | 85% | New specs | PMU-017 permissive assertions | Tighten + extend |

- Overall post-repository confidence: 79%. Calculation: simple average. Critical ACs directly proven: `No` (rendered ACs pending). Categories below 90%: all. Target met: `No`.
- Final scores and result: see `api-e2e-execution-coverage-report.md` (Fail, 89%, FAIL-001).

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (PMU probe, real backend + scripted AGY CLI) and `Project Desktop Validation` (isolated desktop instance of a worktree build)
- Specific confidence gap: real layout geometry and async row arrival for the reveal; real open paths for every host kind; packaged renderer behavior.
- Why the selected mode can materially improve confidence: jsdom cannot measure scroll geometry or real row arrival; the probe drives the real stores, routes and backend.
- Expected confidence after: ≥ 95%.
- Browser-specific decision: required (UI state transitions, routing, focus, geometry).

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (packaged Nuxt renderer + embedded server).
- Guideline used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: everything in this change (renderer only).
- Shell-specific behavior: none changed. The packaged build matters only as the real product bundle (production build of the renderer, icon availability).
- Chosen approach: browser probe for the full matrix; one isolated desktop instance journey for the core SCN-001 flow (plus a Team-tab member if setup allows).
- Effect on any running desktop app: none. Another agent's isolated instance (`iso-63369-6c20`) is running and will not be touched; the user's app is not used.

## Live Environment And Fixture Plan

- Startup: PMU probe owns backend (scripted AGY), Nuxt dev and Chrome. Isolated desktop via `isolated-app start --build --data-root <owned>`.
- Seed data: probe GraphQL mutations; isolated instance GraphQL mutations on its reported backend URL.
- Evidence: probe `evidence.json` (DOM/route/state assertions), screenshots, cleanup receipts; desktop DOM/route assertions via the control port.
- Cleanup: probes clean up themselves (verify receipts); `isolated-app stop <id>`, remove owned data root, `isolated-app list` shows only the pre-existing foreign instance.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| DSK-001 | Isolated desktop instance driven over its control port | SCN-001 (and Team tab if seedable) in the packaged app | A build-heavy one-off journey; the durable equivalent is PMU-017/018 |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Explicit user verification in the desktop app | Owned by delivery/user | — | Delivery |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| FAIL-001: on New chat reached in-app after a Team run, Workspaces scrolls to and focuses the stale Team member row (REQ-009/REQ-006) | `Local Fix` (preliminary; execution failure → failure-origin review) | PMU-018 step G (`api-e2e-evidence/pmu-018-r6/`), DSK-001 run-4 | implementation_engineer via code_reviewer |
| REQ-005/AC-002 name a "right Team tab" member open; the right Team tab is messages-only in this product | Observation (non-blocking) | `RightSideTabs.vue` → `CollaborationOverviewPanel`; `TeamMembersPanel` fixture-only | solution_designer (wording) |

## Round 2 Delta (IR-002)

- Changed boundary: `useRevealSelectedTreeRow(container, runShown)`. It returns early unless a run is shown, with `runShown` = `useShellPrimaryNavigation().isWorkspacesActive` passed by `AppLeftPanel` to the tree panel, plus a `watch(runShown)` reschedule.
- Validity of existing coverage:
  - PMU-017 and PMU-018 A–G remain valid; G is the FAIL-001 reproduction.
  - Unit specs were updated by IR-002 (run-shown gate cases).
  - NAV-PROBE and CDR-LIVE are unaffected (strip order, highlight, route, rows).
- Added: PMU-018 step H (`/agents` after an Agent run, `/projects` after a Team run), the code reviewer's FO-SCN-002. G now also asserts `scrollTop` 0.
- Plan:
  1. Recheck FAIL-001 first (PMU-018).
  2. Unit suite.
  3. Full PMU.
  4. Rebuilt app + DSK-001 (with an Org host added).
- Result: all Pass; see the execution coverage report (Pass, 95%).

## Round 3 Delta (IR-003, new base)

- Basis: reopened package SR-006 (SR-003/SR-004 unchanged); IR-003 is a no-code re-verification merged onto `origin/personal` `d28c56d5d`.
- Verified independently:
  - The feature files are byte-identical to `d0bf3db82`.
  - The strip probe cases are identical apart from renumbering (PMU-018 and PMU-019).
  - The base changed the Projects board, Task cards and the Projects panel (the entry path), two chat composer lines and the probe. It did not change the layout, left panel, tree or selection.
- Coverage validity: all durable coverage is still valid. Two pre-existing probe flakes failed on the base as well and were fixed as test-only baseline commits:
  - PMU-017's 390 px settle
  - the projects-navigation dev-server warm-up
- Plan: rerun the unit suite, full PMU, NAV-PROBE, CDR-LIVE and DSK-001 on a rebuilt app. Carry REAL-001 forward.
- Result: all Pass; see the execution coverage report (round 3).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (PMU-017 updated, PMU-018 added, NAV-PROBE and CDR-LIVE updated)
- Post-repository confidence: 79%
- Broader validation decision: `Required` (executed)
- Reroute Required Before Validation Execution: `No`; after execution: `Yes` (FAIL-001)
