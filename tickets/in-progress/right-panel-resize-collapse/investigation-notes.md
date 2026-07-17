# Investigation Notes — Right Panel Resize Collapse

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Current; root cause identified`
- Investigation Goal: Explain why a user-sized right panel changes from docked to a strip after the left navigation is collapsed, and define the smallest safe correction that preserves explicit collapse/redock behavior.
- Scope Classification: `Small`
- Scope Classification Rationale: The defect is in the shared responsive workspace policy and its focused layout tests; no backend, persistence, or cross-repository contract is involved.
- Scope Summary: Preserve a deliberate right-panel resize intent when the left panel is user-collapsed; prevent a responsive strip/drawer fallback while a compact center floor still fits; retain the existing explicit right-panel collapse and genuinely constrained drawer behavior; lighten and standardize both transient drawer scrims so underlying content remains visible.
- Primary Questions To Resolve:
  - Which state transition turns the docked right panel into a strip?
  - Why does a click on the resulting strip open a drawer?
  - Does the current policy distinguish explicit user collapse from responsive yielding?
  - What test and documentation coverage is needed?

## Request Context

The user reports this supported desktop journey: maximize the application, collapse the left panel to its narrow strip, drag the center/right separator left so the right panel grows, and observe that the right panel unexpectedly changes into a strip. Clicking a right-tool icon then opens a transient drawer. The requested behavior is to keep the right panel docked while the available width can support the user-sized split, allow dragging in both directions, and reserve strip-to-drawer behavior for genuinely constrained responsive states. If the user explicitly collapses the right panel, its strip should redock the panel when the current width can support it; it should not open a drawer merely because the panel was deliberately collapsed.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-resize-collapse`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-resize-collapse/tickets/in-progress/right-panel-resize-collapse`
- Current Branch: `codex/right-panel-resize-collapse`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-resize-collapse`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded before worktree creation.
- Task Branch: `codex/right-panel-resize-collapse`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal` after delivery refresh, if finalization is requested.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Worktree was created from `origin/personal` at `894edc01d`; dependency setup used `pnpm install --frozen-lockfile`, and Nuxt types were generated with `pnpm -C autobyteus-web exec nuxi prepare` for focused tests.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-resize-collapse/tickets/in-progress/right-panel-resize-collapse/ui-ux-spec.md` | User journey and state-transition contract for docked, strip, and drawer presentations | Distinguishes user-sized resize, explicit collapse/redock, responsive yield, and lighter contextual scrims; includes supplied screenshot references | Requirements, design spec | R-001–R-006; AC-001–AC-007 | `Requirements-ready` | Intended behavior; approval follows the user request | Keep synchronized if architecture review changes the state contract |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-17 | Command | `git fetch origin personal` | Refresh the tracked base before task isolation | `origin/personal` refreshed successfully | No |
| 2026-07-17 | Command | `git worktree add -b codex/right-panel-resize-collapse /Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-resize-collapse origin/personal` | Establish isolated task workspace | Dedicated branch/worktree created from `894edc01d` | No |
| 2026-07-17 | Code | `autobyteus-web/composables/useRightPanel.ts` | Trace right-panel visibility, width, and drag state | `initDragRightPanel()` marks `rightPanelResizeIntent` as `user-sized` and stores preferred width; `rightPanelWidth` is an actual clamped display width | No |
| 2026-07-17 | Code | `autobyteus-web/composables/layout/useResponsiveWorkspaceShell.ts` | Trace policy inputs | Production resolver receives `rightPanelWidth.value` plus the `user-sized` intent; left/right preferences are derived from the panel stores | No |
| 2026-07-17 | Code | `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts:378-448` | Inspect presentation ordering | The `leftIsUserHidden` branch runs before the user-sized branch and only attempts a full 480px center dock; if it fails, it selects a right strip using the 200px fallback. The later user-sized dock branch is unreachable for this left-collapsed path | Yes: design a reorder/specialized candidate path |
| 2026-07-17 | Code | `autobyteus-web/utils/layout/responsiveStripActivation.ts` | Determine why the strip opens a drawer | A strip whose preference is `visible` receives `open-drawer`; only a `hidden-by-user` strip can receive `redock-panel` when the dock candidate fits | No |
| 2026-07-17 | Code | `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Trace rendered outcomes | `openRightDrawer()` sets `isRightDrawerOpen`; `redockRightPanel()` restores visibility and closes the drawer; the template renders the drawer for the former and the docked panel for the latter | No |
| 2026-07-17 | Code | `autobyteus-web/components/layout/RightSidebarStrip.vue` | Trace right-strip click behavior | Tool clicks emit `request-open` for `open-drawer`, and `request-redock` for `redock-panel` | No |
| 2026-07-17 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Verify explicit collapse control | The right-side panel toggle calls `toggleRightPanel()` and therefore changes the user visibility preference rather than resize intent | No |
| 2026-07-17 | Code | `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Check existing policy coverage | Tests cover a user-sized dock with the left panel visible and explicit hidden-panel redock, but not user-sized dock with the left panel user-collapsed | Add scenario |
| 2026-07-17 | Code | `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Check rendered coverage | Tests cover responsive strips and explicit wide hidden-panel redock, but not the reported sequence (left hidden + right user-sized + right remains docked) | Add component scenario if feasible |
| 2026-07-17 | Code | `autobyteus-web/docs/workspace_layout.md` | Check durable behavior record | Docs state user-sized intent lowers center protection but also describe a generic strip fallback; they do not spell out the left-collapsed/user-sized combination | Update during delivery/docs sync |
| 2026-07-17 | Code | `git log --oneline -- autobyteus-web/utils/layout/responsiveLayoutPolicy.ts ...` | Identify regression source | Current ordering was introduced by recent responsive policy revisions, especially the manual-left-collapse branch and later user-sized intent branch | No |
| 2026-07-17 | Setup | `pnpm install --frozen-lockfile` | Prepare executable frontend checks | Workspace dependencies installed successfully | No |
| 2026-07-17 | Setup | `pnpm -C autobyteus-web exec nuxi prepare` | Generate missing `.nuxt/tsconfig.json` | Nuxt types generated successfully | No |
| 2026-07-17 | Test | `pnpm -C autobyteus-web exec vitest run utils/layout/__tests__/responsiveLayoutPolicy.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts composables/__tests__/useRightPanel.spec.ts --reporter=dot` | Establish current baseline | 3 files, 47 tests passed after Nuxt preparation; warnings were only KaTeX quirks-mode warnings | No |
| 2026-07-17 | User evidence | Supplied screenshots `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8482332e24b048f8b364a01db133b3e7/solution_designer_c57872615c404d48928a797b99956134/context_files/ctx_d77b8e3f6572__image.png`, `ctx_966f9d1594b8__image.png`, `ctx_ce0dc2de13cc__image.png`, `ctx_99de889f216d__image.png` | Confirm observed surface states | Screenshots show a normal docked right panel, collapsed strips, and a transient overlay drawer; they support the user journey but do not expose numeric widths | No |
| 2026-07-17 | User feedback | Supplied screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8482332e24b048f8b364a01db133b3e7/solution_designer_c57872615c404d48928a797b99956134/context_files/ctx_394804d3488f__image.png` and follow-up message | Validate backdrop readability | User confirms the underlying content is too dark and requests a lighter scrim that preserves visibility/context | Record as R-006 / AC-007; implementation must apply consistently left and right |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BE-001 | User | User collapses the left navigation from the maximized workspace | Left toggle -> `useLeftPanel` visibility preference -> `useResponsiveWorkspaceShell` -> `resolveResponsiveWorkspaceShellState` -> `layouts/default.vue` renders a 50px left strip | Left panel becomes a user-owned consuming strip while right tools normally remain docked if the 480px center candidate fits | `layouts/default.vue`; `responsiveLayoutPolicy.ts:378-417`; screenshot #1 |
| BE-002 | User | User drags the right center/right separator | `WorkspaceAdaptiveLayout.vue` mousedown -> `useRightPanel.initDragRightPanel` -> `user-sized` intent + preferred width -> responsive resolver -> docked/strip presentation | Current right panel stays docked while policy candidate fits; after left collapse, the resolver can incorrectly choose a strip before honoring the user-sized 200px center floor | `useRightPanel.ts:86-118`; `responsiveLayoutPolicy.ts:381-448`; existing policy tests |
| BE-003 | System/User | A responsive resolver emits a right strip and the user selects a tool | `resolveStripActivation` -> `RightSidebarStrip.selectTab` -> `WorkspaceAdaptiveLayout.openRightDrawer` -> `WorkspaceRightToolDrawer` | A strip with visible right preference is treated as responsive and opens an overlay drawer | `responsiveStripActivation.ts`; `RightSidebarStrip.vue`; `WorkspaceAdaptiveLayout.vue`; screenshot #4 |
| BE-004 | User | User explicitly collapses the right panel from the docked tab surface | `RightSideTabs` toggle -> `useRightPanel.set/toggleRightPanel(false)` -> resolver -> user-hidden strip -> activation decision | When a dock candidate fits, the strip is a redock affordance and selecting a tool restores the docked panel rather than opening a drawer; a truly constrained state may still use a drawer | `RightSideTabs.vue`; `responsiveStripActivation.ts`; `WorkspaceAdaptiveLayout.spec.ts` |
| BE-006 | User/System | User opens either transient left navigation or right tools drawer | Drawer owner renders a fixed backdrop beneath the drawer | Current left/right scrims are visually too dark and inconsistent (`bg-opacity-75` on the left, `bg-gray-900/50` on the right); underlying workspace remains technically visible but loses useful context | `layouts/default.vue`; `WorkspaceRightToolDrawer.vue`; supplied screenshot `ctx_394804d3488f__image.png` |

## Design Health Assessment Evidence

- Change posture: `Bug Fix` / `Behavior Change`
- Candidate root cause classification: `Missing Invariant`
- Refactor posture evidence summary: The existing policy boundary, state owner, and strip activation owner are coherent. The missing invariant is that a recorded `user-sized` resize intent must be evaluated before responsive fallback caused solely by manual collapse of the opposite panel. No broad refactor is indicated.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `useRightPanel.ts` | Drag records explicit `user-sized` intent and clamps actual width using a compact 200px center floor | State owner already exposes the information needed to preserve the invariant | Reuse intent; do not add a second width state |
| `responsiveLayoutPolicy.ts` | Left-hidden branch demands 480px center before later 200px user-sized branch | Ordering defect in the authoritative policy, not a new subsystem problem | Evaluate user-sized left-strip + right-docked candidate first |
| `responsiveStripActivation.ts` | Visible-preference strip maps to `open-drawer`; hidden-preference strip can map to `redock-panel` | Drawer is an expected consequence of an incorrectly classified responsive strip | Preserve activation contract; prevent incorrect strip classification |
| Existing tests | Missing combination coverage | Regression can pass despite current common cases passing | Add policy and rendered journey tests |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | Authoritative responsive presentation policy | Candidate ordering erases the user-sized override for a manually collapsed left panel | Modify this owner; keep preference, intent, and capacity decisions centralized |
| `autobyteus-web/composables/useRightPanel.ts` | Right visibility, preferred width, actual width, drag intent | Correctly records `user-sized`; no change needed unless tests expose a state propagation issue | Do not duplicate policy in the layout component |
| `autobyteus-web/composables/layout/useResponsiveWorkspaceShell.ts` | Composes stores into resolver input | Passes actual width plus explicit intent | Preserve boundary; verify tests use the same actual-width semantics |
| `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Center/right DOM split, strip/drawer ownership | Correctly maps resolver presentation and strip activation to UI | Add/adjust journey coverage; no drawer workaround |
| `autobyteus-web/components/layout/RightSidebarStrip.vue` | Right strip affordance | Correctly distinguishes `open-drawer` from `redock-panel` | Preserve contract |
| `autobyteus-web/layouts/default.vue` | Left shell and left drawer backdrop | Uses a dark `bg-opacity-75` scrim | Standardize to the lighter shared drawer scrim target without changing the opposite-strip hit-test exception |
| `autobyteus-web/components/layout/WorkspaceRightToolDrawer.vue` | Right drawer and backdrop | Uses `bg-gray-900/50`, making the workspace too dark beneath the drawer | Standardize to the same lighter scrim target |
| `autobyteus-web/utils/layout/responsiveStripActivation.ts` | Strip activation policy | Correct for current input preference/presentation | No change expected |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Pure policy coverage | Missing left-hidden + user-sized case | Add boundary cases around compact fit and failure |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Rendered shell behavior | Missing reported sequence | Add component assertion for docked persistence and explicit collapse redock |
| `autobyteus-web/docs/workspace_layout.md` | Durable layout contract | Needs precise user-sized/left-strip wording | Update in delivery stage, not as a compatibility note |

## Runtime / Probe Findings

### Root-Cause Walkthrough

The reported drawer is downstream, not the initial defect:

1. `initDragRightPanel()` sets `rightPanelResizeIntent = 'user-sized'` while the right visibility preference remains `visible`.
2. With the left panel collapsed, `leftPreference === 'hidden-by-user'`, so the resolver enters the manual-left-collapse branch first.
3. That branch tries `{left: strip, right: docked}` with `WORKSPACE_CENTER_MIN_WIDTH_PX = 480`.
4. Once the preferred/effective right width makes that 480px candidate fail, the branch immediately chooses `{left: strip, right: strip}` with the compact 200px floor.
5. The later user-sized branch, which would try the 200px-center dock, is never reached.
6. Because the right preference is still `visible`, `resolveStripActivation()` returns `open-drawer`; the strip click therefore opens `WorkspaceRightToolDrawer`.

For example, with a 1,920px viewport, a 1,666px effective right panel, a 50px left strip, a 4px right handle, and a user-sized 200px center floor, the user-sized dock consumes exactly `50 + 1,666 + 4 + 200 = 1,920px` and is viable. The current left-hidden branch rejects the same dock under the automatic 480px floor (`50 + 1,666 + 4 + 480 = 2,200px`) and selects the strip instead. The exact threshold depends on the measured flow and preferred width; the invariant is the ordering, not a hard-coded screen size.

### Distinguishing Explicit Collapse

An explicit right toggle changes `rightPanelPreference` to `hidden-by-user`. If the hidden strip can redock at the current compact capacity, `resolveStripActivation()` returns `redock-panel`, and `RightSidebarStrip` emits `request-redock`; `WorkspaceAdaptiveLayout.redockRightPanel()` restores visibility and closes any drawer. This behavior must remain unchanged. Only genuinely constrained hidden strips should continue to open a drawer.

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required; the authoritative behavior and implementation are local.
- Version / tag / commit / freshness: Local `origin/personal` at `894edc01d`, refreshed 2026-07-17.
- Relevant contract, behavior, or constraint learned: None.
- Why it matters: No external contract should drive this local layout policy change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Focused Vitest policy/component tests; full browser probe optionally requires a running frontend/backend workspace state.
- Required config, feature flags, env vars, or accounts: Nuxt test setup; no user account required for pure policy tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-web exec nuxi prepare`.
- Cleanup notes for temporary investigation-only setup: Installed dependencies and generated `.nuxt` files are ignored build artifacts; no tracked source changes were made during investigation.

## Findings From Code / Docs / Data / Logs

- The task is frontend-only and does not touch persisted data, API contracts, or backend execution.
- The current code already has the correct concepts: user visibility preference, preferred/effective width, resize intent, center protection mode, and explicit strip activation.
- The policy has a reachable product path to the incorrect state; no synthetic hidden-state mutation is needed. The user can reach it through the normal left collapse, right separator drag, and right strip tool click sequence.
- The latest focused baseline is green: 47 tests across the three affected test suites.
- The new UX feedback is a reachable visual behavior: both drawer owners render their backdrops during normal left/right strip activation, so scrim opacity is a user-visible requirement rather than a cosmetic implementation detail.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: None; panel preferences are in-memory refs for this shared application session.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: N/A.
- Representative direct-read or compatibility evidence: N/A.
- Required semantics and invariants preserved by direct use: `Not applicable`.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: None.
- Concrete benefit, cost, and risk of migration if it remains a candidate: N/A.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- Keep `WORKSPACE_CENTER_MIN_WIDTH_PX = 480` for automatic/responsive presentation.
- Keep `USER_RESIZE_CENTER_MIN_WIDTH_PX = 200` as the compact floor for an explicit right-panel drag.
- Keep narrow-window and short-height responsive strip/drawer behavior unchanged.
- Keep a visible-preference responsive strip mapped to `open-drawer` and an explicit hidden-preference fitting strip mapped to `redock-panel`.
- Do not introduce a generic top-level tool trigger, CSS-only workaround, duplicate width state, compatibility wrapper, or alternate responsive policy.

## Open Unknowns / Risks

- Full Electron/browser visual reproduction may require a running app and seeded workspace state; policy/component coverage can prove the core invariant without it.
- The preferred/effective width naming at the resolver boundary should be reviewed by implementation and code review; production currently passes the effective clamped width while tests often pass preferred width directly. The fix must not accidentally change that existing boundary.
- At genuinely insufficient widths, a responsive strip/drawer remains correct; acceptance should test both the compact-fit and compact-fail thresholds.

## Notes For Architecture Reviewer

The proposed change should stay inside the existing responsive policy and drawer presentation owners. The key decision is to evaluate a user-sized right-docked candidate using the current left presentation (`strip` when the user collapsed left navigation) before the manual-left-collapse automatic 480px candidate. If it fits, preserve docked presentation and `user-override`; if it does not fit, retain the existing strip fallback. Explicit right collapse remains preference-driven and continues to redock when fit. The new visual requirement is to standardize left and right drawer scrims at approximately 30% black (25–35% acceptable) so context remains visible; drawer lifecycle and hit testing remain unchanged. No persisted-data, API, or broad refactor impact was found.
