# Implementation Handoff — Workspaces in the collapsed left strip

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/` unless they are absolute. Ticket folder: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/`.

## Upstream Artifact Package

- IR-003 trigger (reopened package): Solution Designer `handoff-reopened-sr-006.md` (SR-006).
  - The user cancelled the package on 2026-10-09 and reopened it on 2026-10-10 with the tree-button direction.
  - Requirements SR-003 are reinstated unchanged; design SR-004 is unchanged.
  - The Product UI/UX spec is restored at its normal path (design repo `personal` @ `6fdf576`), byte-identical to `7a8e634`.

- Review applicability and handoff-rule result: direct route. Solution Designer `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low", so independent architecture review was skipped.
- Requirements doc: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md` (SR-003, Approved 2026-10-08)
- Investigation notes: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md` (AF-001..AF-010)
- Solution revision record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/solution-revision-record.md` (SR-001..SR-004)
- Design spec: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/design-spec.md` (SR-004, D-1..D-7)
- Supplemental task artifacts:
  - Product UI/UX spec (normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md`
  - Its visual references: `.../visual-references/VIS-001..VIS-008`
  - `handoff-architecture-design-complete.md`, `product-design-request.md`, `approval-request.md`, `evidence/user-collapsed-strip-run-open.png`
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable` (direct route)
- Triggering rework report, revision record or evidence (IR-002):
  - `code-review-report.md` + `code-review-revision-record.md` (CRR-001, CR-001, Local Fix)
  - `api-e2e-execution-coverage-report.md` + `api-e2e-revision-record.md` (API-REV-001, FAIL-001)
  - `api-e2e-evidence/pmu-018-r6/`, `api-e2e-evidence/isolated-desktop/run-4/`

## Current Implementation Summary

**IR-003 (reopened, SR-006):**
- No code change.
- The recovered implementation is IR-002. Every feature source file is byte-identical to `d0bf3db82` (`git diff d0bf3db82 HEAD` over the feature files is empty), and it was validated by API-REV-002.
- It still matches SR-003/SR-004: Workspaces only reopens the panel and reveals the open run; collapse is unchanged; page icons (incl. Chat → `/chat`) are unchanged; New chat is via the pencil. That is exactly the user's reopening direction.
- Re-integrated `origin/personal` `d28c56d5d` (19 commits) as merge `0604a9586`, with no conflicts and no incoming change to any feature file, doc or probe used here.
- Note for downstream: since `f8b1fb4ec`, this ticket's probe cases are **PMU-018** (strip journey) and **PMU-019** (other entries, incl. run-shown gate). PMU-017 is task-closed-status's Cancelled Tasks case.

**IR-002 (CR-001 Local Fix):** the reveal (D-4) now acts only while a run is shown in the center.
- `useRevealSelectedTreeRow(container, runShown)` returns early from `reveal()` when `runShown` is false: no scroll and no focus, so focus stays on the Workspaces section (D-3). A `watch(runShown)` reschedules the reveal inside the window if a run becomes shown, for example when its context registers.
- The signal is the existing D-2 owner's `useShellPrimaryNavigation().isWorkspacesActive`. `AppLeftPanel` already consumes it and passes it to `WorkspaceAgentRunsTreePanel` as the new `runShown` prop (default `false`).
- No predicate is duplicated. The tree's selection and highlight semantics and `selectionStore` are unchanged, as CR-001 requires.
- Bounded deviation from D-4 as designed:
  - The composable gains a second parameter, and the tree panel gains one prop.
  - The prop was chosen over calling `useShellPrimaryNavigation` inside the tree panel. The tree panel is deliberately router-tolerant (`useRoute()` may be undefined), and its specs mock the route that way. It also stays a non-consumer of shell highlight; `AppLeftPanel` is already the highlight consumer.

- The collapsed left strip has a **Workspaces** button (`ph:tree-view`) after the page icons and a light divider.
  - It reuses the strip's existing `activateStrip`: it redocks the panel, or opens the drawer when there is no room. It never calls the router.
  - After a redock, focus moves to the panel's Workspaces section.
- Highlight lives only in `useShellPrimaryNavigation`:
  - Chat is lit only on New chat.
  - `isWorkspacesActive` is true while the center shows a run: a registered Agent run on `/chat?id=`, an Org run route, or a selected Team run on `/workspace`. It is false on the Org launch page.
- The route predicates moved into the route authority, `workspaceNavigationService.ts`: `chatRouteRunId`, `isAgentOrgRunRoute`, and `isAgentOrgLaunchRoute` (an implementation refinement, see Assumptions). Their consumers were switched over.
- Reveal on panel appear:
  - The Team reveal in `useWorkspaceHistoryTreeState` now also opens the focused member's ancestor rows. It stays pending until that member's row exists (D-5).
  - The new `useRevealSelectedTreeRow` watches the mounted tree for up to 3 s. It centres the deepest selected row only if it is not fully visible, and moves focus onto that row when focus is on the Workspaces section. The first wheel, pointerdown or keydown in the tree ends the window, as do the deadline and unmount (D-4).
  - The standalone Agent run row now carries `aria-current="true"`.
- The docked collapse button moves focus to the strip's Workspaces button (D-6).
- Strings: en `Workspaces`, zh-CN `工作区`. Docs updated. Probes updated: chat-draft-rows D11 and its on-run Chat assertion, plus a new PMU-017.

- Implementation cycle: `Rework`. IR-003 re-verifies and re-integrates the recovered IR-002 implementation, which itself builds on the IR-001 baseline.
- Implementation revision record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-006`, with design SR-004 and requirements SR-003, both unchanged
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001` (failure-origin review on the direct route)
- Related delivery revision IDs (prior, before cancellation): `DR-001..DR-003`
- Related API/E2E revision IDs: `API-REV-001`, `API-REV-002` (Pass, on the old base)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001` (from `FAIL-001`)

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Scope: 12 production files changed plus 1 added, all in `autobyteus-web`, all within the owners the design named. Plus 2 docs, 9 spec files and 2 probes.
  - No API, GraphQL, WebSocket, persistence, Electron main/IPC, security or concurrency change.
  - No ownership move. Every changed source file stays under 500 effective non-empty lines; the largest is `WorkspaceAgentRunsTreePanel.vue` at 488 (486 before; +2).
  - Escalation triggers checked, none fired:
    - "Run shown" is derivable from the route plus the existing context and selection stores.
    - The reveal needed no store-level coordinator.
    - Team- and Org-hosted Task-card entries select the expected tree row (U-001; see PMU-017).
- Selected route: `Direct API/E2E`. Classification rechecked after IR-002: still Medium/Low (renderer-only, 4 production lines of gating plus 1 prop).
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Workspaces only shows the panel; page icons unchanged | `LeftSidebarStrip.vue` `handleWorkspacesClick` → `activateStrip` → `request-redock` → `layouts/default.vue redockLeftPanel`; then focus `[data-test="app-left-panel-run-history"]` on `nextTick` | Done. No router call. Page icons are untouched (unit test + PMU-017). |
| BEH-002 | Same control opens the drawer on narrow/short windows; focus returns to it on close | Same handler, `open-drawer` branch → `appLayoutStore.openMobileMenu` + `rememberDrawerTrigger`; `data-nav-key="workspaces"` lets `default.vue getLeftStripFocusTarget` return focus | Done. `default-drawer.spec.ts` case + PMU-017 at 760×900 with Escape. |
| BEH-003 | Collapse unchanged; focus moves to Workspaces | `AppLeftPanel.vue` `collapseLeftPanel` → `toggleLeftPanel()` + `nextTick` focus `[data-test="workspace-left-strip-workspaces"]`; `data-test="app-left-panel-collapse"` | Done. `AppLeftPanel_v2.spec.ts` + PMU-017 for all 3 hosts. |
| BEH-004 | Full ancestry incl. nested sub-team rows; bounded scroll and focus reveal | `useWorkspaceHistoryTreeState.revealTeamRunAncestry` (D-5); `components/workspace/history/useRevealSelectedTreeRow.ts` wired in `WorkspaceAgentRunsTreePanel.vue` (scroll ref `data-test="workspace-history-tree-scroll"`); `aria-current` on the Agent run row in `WorkspaceHistoryWorkspaceSection.vue` | Done. Unit specs + PMU-017: Agent host not scrolled (visible); Team host nested task-Team coordinator scrolled 187 px; Org host scrolled into view; all focused. IR-002: gated on `runShown` (`AppLeftPanel` → `:run-shown="isWorkspacesActive"`). On a no-run page with a stale selection: no scroll, no focus (unit + PMU-018 G). |
| BEH-005 | Run-open entry points unchanged | No change to Task-card, Team-tab or send open paths | Preserved. |
| BEH-007 | Chat row and pencil click unchanged; Chat row highlight per D-1 | `AppLeftPanel.vue` keeps `navigateToPrimary` / `startNewChat`; `isNavRowActive` reads `isPrimaryNavActive('chat')` | Done. Existing DI-001 test passes; new Chat-row highlight test. |
| BEH-008 | Chat lit only on New chat; Workspaces lit when a run is shown | `useShellPrimaryNavigation.isShellPrimaryRouteActive(key, {path, query})` + `isWorkspacesActive`; consumed by `LeftSidebarStrip.vue` (`bg-gray-100 text-gray-900`, `aria-current="location"`) and `AppLeftPanel.vue` | Done. `useShellPrimaryNavigation.highlight.spec.ts` covers AC-011 routes incl. Org launch, empty `/workspace`, Team draft and an opening run. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Page icons, Chat row and pencil clicks are unchanged. There is no auto-scroll while docked (DEC-004) and no expansion persistence (DEC-003).

## Key Files Or Areas

Production:
- `autobyteus-web/composables/useShellPrimaryNavigation.ts`: D-1, D-2
- `autobyteus-web/services/workspace/workspaceNavigationService.ts`: D-7 predicates
- `autobyteus-web/components/layout/LeftSidebarStrip.vue`: divider, Workspaces, activation, short-window spacing
- `autobyteus-web/components/AppLeftPanel.vue`: D-6
- `autobyteus-web/components/workspace/history/useRevealSelectedTreeRow.ts` (new): D-4
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`: scroll ref, reveal wiring, `chatRouteRunId`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`: `aria-current` on the Agent run row
- `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`: D-5
- `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue`, `autobyteus-web/pages/chat.vue`, `autobyteus-web/pages/workspace.vue`: predicate consumers
- `autobyteus-web/localization/messages/{en,zh-CN}/shell.ts`

Docs:
- `autobyteus-web/docs/workspace_layout.md` (new "Collapsed strip: pages and Workspaces" section)
- `autobyteus-web/docs/chat.md` (Highlight paragraph)

Tests:
- `composables/__tests__/useShellPrimaryNavigation{,.capabilities,.highlight}.spec.ts`
- `components/layout/__tests__/LeftSidebarStrip.spec.ts`
- `components/__tests__/AppLeftPanel_v2.spec.ts`
- `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts`
- `components/workspace/history/__tests__/useRevealSelectedTreeRow.spec.ts` (new)
- `services/workspace/__tests__/workspaceNavigationService.spec.ts`
- `layouts/__tests__/default-drawer.spec.ts`
- `pages/__tests__/chat.spec.ts` (service mock gains `chatRouteRunId`)

Probes:
- `tests/e2e/chat-draft-rows-live-probe.mjs`:
  - D11 reopens via Workspaces and asserts the route is unchanged; the dead `workspace-left-strip-open` fallback is removed.
  - The on-run Chat-row assertion now expects Chat not lit (REQ-008).
- `tests/e2e/project-manager-ux-probe.mjs`: new PMU-017.

## Important Assumptions

- **`isAgentOrgLaunchRoute` added to D-7.** On `/workspace`, the center shows the Org launch page for `rootSubjectKind=agent_org&mode=configuration` before any selection rule (`pages/workspace.vue`). A Team selection may still be in the store there, so the highlight must exclude the launch page explicitly to satisfy DEC-005.
  - I added this third predicate beside the two in the design, in the same route authority. `pages/workspace.vue`'s inline check now uses it too.
  - This refines D-7 inside its owner; behavior is unchanged.
- **Run-shown rule on `/workspace`.** It is "Org run route, or a selected Team run" exactly as D-2 states.
  - A selected Team in run-config mode (`RunConfigPanel`) also counts, because its center belongs to that run.
  - `team_draft` does not count.
- **Icons.** `ph:tree-view` loads through `@iconify/vue` the same way as the existing Memory `ph:brain`. There is no separate bundling step in this repo.

## Known Risks

- IR-003: the PMU-017 narrow-overflow step (task-closed-status) races the shell's docked→strip switch. It measures `project-detail` in the same frame as `setViewportSize`, while the left panel is still docked: `202/70`. Within a frame the shell switches to the strip and the board measures `340/340`.
  - The failure reproduced on unmodified `origin/personal` `d28c56d5d`: Pass, Pass, Fail.
  - Branch: Fail, Fail, Fail, Pass. Docked→strip timing measured identical on both.
  - Implementation view: a pre-existing probe race, not caused by this change. API/E2E should classify it; a settle wait before that measurement would fix it.

- R-001 (rows load after mount): covered by the 3 s window plus the D-5 pending rule; PMU-017 passed all three hosts. On a very slow history load (> 3 s) the row is still selected and expanded, but not scrolled. The spec allows that wait limit to vary.
- D-5 pending rule: while a Team's focused member has no row yet, the team/workspace/definition expansions re-apply on each topology revision. Once the member row exists, the reveal is applied and a manual collapse is respected (unit-tested). A focused member that never gets a row is not a known product state.
- R-004 (accepted): during "opening" (`/chat?id` before the context registers), neither Chat nor Workspaces is lit.
- Docked-panel reveal on app start: the reveal also runs whenever the panel mounts (app start, drawer open), per the spec's "Panel appears" definition.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed` (the D-7 extraction is part of the change)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The tree panel's DOM reveal is in its own composable, not in the 517-line panel (488 effective non-empty lines, +2).
  - The adaptive layout's `openRunHistory`/`openLeftNavigation` duplication was left as the design deferred it.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The path-only Chat rule was replaced outright.
- Dead or obsolete code removed in scope: `Yes`
  - inline `/chat` id parsing in `chat.vue` and the tree panel
  - inline Org-run check in the adaptive layout
  - inline Org-launch check in `pages/workspace.vue`
  - the probe's dead `workspace-left-strip-open` fallback
- Shared structures remain tight: `Yes`. The only new type, `ShellRouteLocation`, is `{ path, query }`.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (largest 488 effective non-empty lines; every per-file delta well under 220)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` § "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes` (in-memory renderer state only)
- Direct-use or discard/rebuild evidence: N/A
- Migration: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxt prepare`.
- The probe used a backend built in this worktree (`pnpm -C autobyteus-server-ts prebuild && build`).
- That build leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. They are not staged.
- Running the web suite while the server prebuild rebuilds those SDK `dist/` folders makes 4 Applications/Codex files fail to resolve the package. Rerunning after the build passes. TESTING.md warns about this for shared-output builds.

## Local Implementation Checks Run

IR-003, new base `0604a9586`:
- Setup: `pnpm install --frozen-lockfile`, `nuxt prepare`, server prebuild and build, all completed before any test ran.
- Full `pnpm -C autobyteus-web test:nuxt --run`: 593 files passed, 2 skipped; 4062 tests passed, 5 skipped (`implementation-evidence/ir-003/web-unit-full-run.txt`).
- Browser, owned stacks: PMU-015, PMU-016, PMU-018 and PMU-019 pass (`implementation-evidence/ir-003/pmu-017-018-019-evidence.json` plus screenshots).
  - The rendered reveal still matches VIS-003/VIS-004/VIS-005: nested task-Team member, Org worker, run-shown gate on New chat.
- PMU-017 (not this ticket's case) is flaky at its 390 px overflow step on both branch and base. See Known Risks and `implementation-evidence/ir-003/pmu-017-baseline-race.txt`.


IR-002:
- Affected specs (reveal composable incl. 2 new run-shown cases, tree panel and every spec that mounts it, AppLeftPanel incl. a new `runShown` wiring case, nav highlight, tree state, layout, route service, layouts): 36 files, 366 tests passed (`implementation-evidence/ir-002/unit-runs.txt`).
- `AppLeftPanel_v2.spec.ts`'s module mock of the tree panel now declares the `runShown` prop.
- Browser: PMU-017 + PMU-018 on an owned stack both pass (`implementation-evidence/ir-002/pmu-017-018-evidence.json`). That includes PMU-018 G: after Workspaces on New chat following a Team run, focus is on `app-left-panel-run-history`, the tree is at `scrollTop 0` and the route is `/chat` with the draft kept. The late-load steps (nested member, first send, far-down Org, slow start with and without a user scroll) also pass.

IR-001:

- Web unit/component suite, full (`pnpm -C autobyteus-web test:nuxt --run`): 4005 passed, 5 skipped.
  - 3 tests in 4 files failed only because the run overlapped the server prebuild (SDK `dist` resolution). Rerun after the build: 4/4 files, 11/11 tests passed.
  - Summary: `implementation-evidence/web-unit-full-run.txt`.
- Focused specs for this change (all pass):
  - nav highlight (3 files)
  - strip (14)
  - AppLeftPanel (incl. collapse focus and Chat row)
  - tree state (12, incl. 4 new D-5 cases)
  - reveal composable (9)
  - route service predicates
  - default-drawer (Workspaces drawer + focus return)
  - chat page
- `tsc --noEmit` (no `vue-tsc` installed): no errors in the changed `.ts` sources. The remaining errors are pre-existing `.vue` module-resolution and test-typing errors on unchanged lines.
- `node --check` on both probe files.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: collapsed strip (UIS-001), docked panel with revealed run (UIS-002), left drawer (UIS-003); UXJ-001..UXJ-007.
- Approved references: `ui-ux-spec.md` Implementation Fidelity Boundary; VIS-001..VIS-008.
- Existing design system and adjacent surfaces reviewed:
  - Strip button, tooltip and highlight classes reused from the existing page icons.
  - Tree row selection markers (`aria-current`/`aria-selected`) reused.
  - Drawer focus-return mechanism reused (`data-nav-key`).
- Surface used: TESTING.md "Browser dev-path probes", via `test:e2e:project-manager-ux` with the new PMU-017 case. It runs a real Nuxt dev server, the built backend with the scripted AGY CLI, and headless Chrome, with an owned data root and ports. The user's app and data were not used.
- States, layouts, viewports and interactions inspected (screenshots reviewed against VIS):
  - 1440×620, for each host kind: Agent (task Agent), Team (task Team nested under the Team run → its coordinator), Org (task Agent; keyboard Enter).
    - collapse → focus on Workspaces
    - worker opened from the right Projects-tab Task card → Workspaces lit, Chat not lit
    - Workspaces → docked, route/center/Projects tab unchanged, docked Chat row not lit
    - worker row selected, ancestors open, fully visible, focused
    - scroll only when needed: Agent 0 px; Team 187 px; Org scrolled
  - 760×900: Workspaces opens the drawer with the Org worker row visible; Escape closes it and focus returns to Workspaces; route unchanged.
  - 1440×500: divider hidden (`display:none`), Settings visible (bottom 484 of 500), Workspaces lit.
  - 1440×900 New chat with typed text: Chat lit, Workspaces not; Workspaces docks the panel; route `/chat` and the text are kept; nothing selected in the tree.
- Visual or interaction issues found and corrected: none in the product. Two probe-timing issues in my own PMU-017 draft were fixed:
  - At 1440×500 it now collapses the restored docked panel first.
  - It records the route only after the Task-card open's own Org `agentRunId` route write settles.
- Evidence: `implementation-evidence/pmu-017/` (`evidence.json` + 9 screenshots; cleanup receipts show backend, frontend and browser stopped and the data root removed).
- Remaining unverified states or limitations:
  - The VIS-002 hover tooltip was not screenshotted; it uses the same classes as the other strip tooltips (unit-asserted).
  - The keyboard focus ring was not screenshotted.
  - Probe D11 (`test:e2e:chat-draft-rows-live`) was syntax-checked only. It needs a logged-in Codex runtime and earlier cases' state.
  - The final isolated-desktop journey and user verification were not run here.

## Downstream Coverage Hints / Suggested Scenarios

- IR-002: rerun the full PMU-018 (incl. G) and DSK-001 on a rebuilt desktop instance.
- Ideally also add Workspaces activation on `/agents` and `/projects` after an Agent or Team run (same gate; unit-covered via `runShown=false`).

- Run `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh> --cases PMU-017` (about 20 s after warm-up), and preferably the full PMU suite for regressions (PMU-008/015/016 touch the same panel).
- Run `test:e2e:chat-draft-rows-live` (D11 and the on-run Chat assertion changed) with a runtime available.
- Not covered by PMU-017:
  - a member opened from the right **Team tab** (REQ-005)
  - a New chat **first send** while collapsed
  - a far-down Org member at 1440×620 that needs a large centring scroll
  - AC-004's "user scroll before rows load → no later jump" in a real browser (unit-tested only)
- Isolated desktop instance of a worktree build for the final journey (TESTING.md: `pnpm --silent isolated-app start --build`). Never the user's running app.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-012, including the gaps above, is still required, as is classification of PMU-017 as durable coverage (it was authored here for rendered self-validation; please review or extend it).
- Desktop-app user verification is still required ("Done when … The user verifies this in the desktop app").
