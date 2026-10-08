# Design Spec — Workspaces in the collapsed left strip

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-003. The user approved it on 2026-10-08: "Like your suggestion. Let's do it." That approval covers the SR-002 content plus DEC-005 = lit only when a run is shown, with DEC-003/DEC-004 out of scope.
- Behavior-defining supplements and their approval references: Product `ui-ux-spec.md` + VIS-001..008 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/`). The user confirmed them in Product review on 2026-10-08, and they are included in the SR-003 approval.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md` (AF-001..AF-010)
- Authorities read (2026-10-08):
  - `references/architecture-design.md`
  - `design-principles.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/DESIGN.md` (root)
  - no closer `DESIGN*.md` under `autobyteus-web`
  - `design-examples.md` not needed
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- The collapsed strip (`LeftSidebarStrip.vue`) renders only page icons. In `redock-panel` mode every icon redocks and then `router.push`es its page (BEH-001).
- Highlight is path-only in `useShellPrimaryNavigation.isShellPrimaryRouteActive`, so Chat is lit on `/chat?id=…`. `/workspace` lights nothing (BEH-008, AF-005).
- The left panel mounts with `v-if`. Each mount creates a fresh `useWorkspaceHistoryTreeState`, whose immediate watch reveals the selected subject's ancestry. It does not open nested sub-team rows for a team's focused member (AF-006), and nothing scrolls.
- The center's "what is shown" decision lives in `pages/chat.vue` (route id + registered context) and in `WorkspaceAdaptiveLayout.vue` (Org run route, Team selection, empty state). Since `efc2bfd0f`, an archived open run leaves to an empty `/workspace` (AF-001..AF-003).
- `WorkspaceAdaptiveLayout.openRunHistory` already shows the panel without navigating and focuses the tree section (AF-004).

Structurally the code is healthy. The gap is a missing navigation affordance plus an incomplete reveal; no owner is wrong.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale:
  - About 12 source files, all in `autobyteus-web` and within existing owners:
    - strip, panel, navigation-highlight composable, route service
    - tree-state composable, tree panel, one row template, adaptive layout, chat page
    - en/zh-CN strings
  - Plus one new small composable, about 70 lines.
  - Plus docs (2 files), unit tests and a probe update.
  - No new subsystem.
- Architectural risk: `Low`
- Risk rationale:
  - Renderer-only.
  - No API, GraphQL, WebSocket, persistence, Electron main/IPC, security or concurrency surface.
  - No ownership-boundary move: highlight stays in `useShellPrimaryNavigation`, reveal state stays in `useWorkspaceHistoryTreeState`, and panel visibility stays in `useLeftPanel`/layout.
  - The one new owner is local to the tree panel and bounded by its mount lifetime.
  - The behavior is fully specified by the user-confirmed UI/UX spec, which a UI reference already validated.
- Escalation trigger:
  - Return `Design Impact` if implementation finds that "run shown" cannot be derived from the route plus the existing selection/context stores, or that the reveal needs a store-level or cross-component reveal coordinator.
  - Also return it if the Team/Org-hosted Task-card entries do not select the expected tree row (U-001).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | AF-001 `pages/chat.vue` @ `efc2bfd0f` | Empty `/workspace` after an archived run | D-2: the run-shown rule is not route-only | — |
| Code | AF-002 `WorkspaceAdaptiveLayout.vue` | Center selection rules | D-2; D-7 (shared Org-run route predicate) | — |
| Code | AF-003 `pages/chat.vue`, `WorkspaceAgentRunsTreePanel.vue` | Duplicated `/chat` id parsing | D-7 (one parser) | — |
| Code | AF-004 `openRunHistory` | Existing no-navigate panel open + focus pattern | D-3 (reuse pattern) | — |
| Code | AF-005 `useShellPrimaryNavigation.ts` | Single highlight owner | D-1, D-2 | — |
| Code | AF-006 tree state + projection | Missing member ancestry in reveal | D-5 | Timing if the member's rows arrive after the team ancestry (handled by D-5 rule) |
| Code | AF-007 row templates | Two ARIA selection markers; agent run row unmarked | D-4 | — |
| Code | AF-008 `layouts/default.vue` | Mount = panel appears; `data-nav-key` focus return | D-3, D-4 | — |
| Product UI reference | AF-009 | Validated reference shape | Overall | Simulated parts replaced by D-2 |

## Intended Change

1. Add a **Workspaces** button (tree glyph, divider) to the collapsed strip. It shows the panel through the strip's existing activation and never navigates.
2. Make highlight say where you are:
   - Chat is lit only on New chat.
   - Workspaces is lit when the center actually shows a run.
3. When the panel appears, reveal the open run:
   - expand ancestors, including the focused member's sub-team rows
   - scroll the selected row into view (centred, only if needed)
   - hand focus to it when the panel was opened from Workspaces
4. Move focus to Workspaces after collapse.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-006, REQ-007; AC-001, AC-006, AC-009, AC-010 | Click/Enter/Space on strip Workspaces | Page icons redock + navigate (AF-005, investigation BEH-001) | Workspaces only shows the panel. Page icons are unchanged. | DS-001 |
| BEH-002 | User | REQ-001..003, REQ-009; AC-005 | Workspaces on a narrow/short window | Strip icons open the drawer (BEH-002) | Same Workspaces control opens the drawer, which reveals the run; focus returns via `data-nav-key="workspaces"` | DS-001 (drawer branch), DS-003 |
| BEH-003 | User | REQ-009; AC-007, AC-012 | Docked collapse button | Collapses (BEH-003) | Unchanged, plus focus moves to Workspaces | DS-004 |
| BEH-004 | System | REQ-003..REQ-005; AC-001..AC-004, AC-008 | Tree panel mount while a run is selected | Ancestry reveal without member sub-teams; no scroll (AF-006) | Full ancestry + bounded scroll/focus reveal | DS-002, DS-003 |
| BEH-005 | User | REQ-005; AC-001..AC-003 | Task card / Team tab / first send open | Unchanged (BEH-005) | Preserved; feeds the selection that DS-002 reads | — |
| BEH-007 | User | REQ-007; AC-007 | Docked Chat row/pencil click | New chat | Click preserved; Chat row highlight follows D-1 | DS-005 |
| BEH-008 | User | REQ-008; AC-001, AC-007, AC-011 | Any route change / selection change | Chat lit on any `/chat`; nothing on `/workspace` (AF-005) | Chat lit only on New chat; Workspaces lit when a run is shown | DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md` + `visual-references/VIS-001..008` | Normative UI/UX | REQ-001..REQ-010 | Visual and interaction fidelity source; its Implementation Fidelity Boundary applies | Approved (user, Product review); part of the SR-003 approval |
| Design repo diff `9232842..6478eec` (`autobyteus-web-design`) | Reference implementation | REQ-001..REQ-010 | Shape guidance only; simulated parts are replaced | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (navigation affordance + highlight rule + reveal completion).
- Current design issue found: `No` (a missing capability, not a structural defect).
- Structural triggers:
  - **Repeated coordination**: the "run shown" decision exists in `chat.vue` and `WorkspaceAdaptiveLayout.vue`, and the highlight would be a third consumer. Fires mildly. Response: extract the two route predicates (`chatRouteRunId`, `isAgentOrgRunRoute`) into the route authority `workspaceNavigationService.ts` (D-7). Keep each consumer's own composition.
  - **Authoritative boundary**: not fired. Highlight stays behind `useShellPrimaryNavigation`, and the strip/panel do not compute it.
  - **Responsibility overload**: `WorkspaceAgentRunsTreePanel.vue` (515 lines) would otherwise absorb DOM reveal logic. Response: put that logic in its own composable (D-4).
  - **Empty indirection**: avoided; no new store or manager.
  - **Shared-structure looseness**: N/A (no shared types added).
- Root cause classification: `No Design Issue Found`. The existing owners absorb the change, and the small predicate extraction removes duplication rather than fixing a broken boundary.
- Refactor needed now: `No`. The bounded extraction in D-7 is part of the change, not a separate refactor.
- Evidence: AF-002..AF-008.
- Design response: D-1..D-7 below.
- Intentional deferrals and residual risk:
  - `WorkspaceAdaptiveLayout.openRunHistory` / `openLeftNavigation` duplicate the strip's redock-or-drawer choice (AF-004). They live on a different surface (empty state) and are left unchanged; this is a separate cleanup candidate. Residual risk: two places choose redock vs. drawer. That is acceptable because both read the same `stripActivation` policy.

## Terminology

- **Run shown**: the center pane displays a run.
  - `/chat?id=X` where X is a registered agent context.
  - Or `/workspace` showing an Org run (`rootSubjectKind=agent_org`, `mode` active/history, `orgRunId`).
  - Or `/workspace` with a Team selection (`selectedType==='team'` and a run id).
  - Not: New chat, the Org launch page, an empty `/workspace`, or "opening"/"missing" chat states.
- **Panel appears**: the tree panel mounts (docked expand, drawer open, app start).
- **Reveal window**: the bounded period after the panel appears during which the selected row is brought into view.

## Design Decisions

- **D-1 Chat highlight**: Chat is active only on New chat, i.e. `path === '/chat'` (or starts with `/chat`) with no route run id (`chatRouteRunId(query) === null`). The strip icon and the docked Chat row read it through `isPrimaryNavActive('chat')`. The docked row keeps its Draft-row override.
- **D-2 Workspaces highlight**: `useShellPrimaryNavigation` exposes `isWorkspacesActive: ComputedRef<boolean>` = run shown (Terminology), computed from:
  - `route`
  - `useAgentContextsStore().getRun(chatRouteRunId)`
  - `isAgentOrgRunRoute(route.query)`
  - `useAgentSelectionStore()` (team selection)

  It is not lit on other pages; on `/agents` etc. the page's icon is lit as today.
- **D-3 Workspaces activation**:
  - The strip's `handleWorkspacesClick` calls the existing `activateStrip(event)`, which redocks via `request-redock` or toggles the drawer, and pushes no route.
  - When it redocks, on `nextTick` it focuses `[data-test="app-left-panel-run-history"]` (existing tabindex=-1 section; same pattern as `openRunHistory`).
  - The button has `data-nav-key="workspaces"` so the existing drawer focus return in `layouts/default.vue` finds it.
- **D-4 Bounded reveal** (`useRevealSelectedTreeRow`), owned by the tree panel's mount lifetime:
  - On mount it starts a reveal window. The window ends at the first user `wheel`/`pointerdown`/`keydown` in the tree scroll container, at a short deadline (~3 s), or at unmount.
  - Within the window, on DOM changes (MutationObserver on the scroll container: subtree, childList, `aria-current`/`aria-selected` attributes), coalesced to one `requestAnimationFrame`:
    - find the last `[aria-current="true"], [aria-selected="true"]` row
    - if it is not fully visible, set `scrollTop` instantly so it is centred
    - if `document.activeElement` is the run-history section (D-3), focus the row once (`preventScroll`)
  - No scroll when the row is already visible.
  - Rationale for DOM observation in production:
    - Rows come from four independent sources (agent groups, collaboration task rows loaded by `collaboration.inspect`, team execution rows, Org rows) and load asynchronously after mount.
    - Observing the rendered tree for its selection marker is the one place where "the selected row exists" is knowable without coupling to each source.
    - It is bounded, passive and owns no state outside the panel.
- **D-5 Ancestry completion**: `revealTeamRunAncestry(teamRunId)` also expands the team's focused member's ancestor rows (`expandTeamMemberAncestors(workspaceId, teamRunId, focusedAgentRunId)`, with `focusedAgentRunId` from `getTeamNodes()`).
  - The team reveal counts as applied only when the focused member is present in the team's execution rows, or the team has no focused member.
  - Until then it stays pending and re-applies on the next `navigationTopologyRevision`, through the existing watch.
- **D-6 Collapse focus**: `AppLeftPanel`'s collapse button calls `toggleLeftPanel()`, then on `nextTick` focuses the strip's `[data-nav-key="workspaces"]` button.
- **D-7 Route predicates**: `services/workspace/workspaceNavigationService.ts` (the existing route authority) gains:
  - `chatRouteRunId(query): string | null` — the parser now in `chat.vue`
  - `isAgentOrgRunRoute(query): boolean` — now inline in `WorkspaceAdaptiveLayout`

  `chat.vue`, `WorkspaceAdaptiveLayout.vue`, `WorkspaceAgentRunsTreePanel.vue` and `useShellPrimaryNavigation.ts` use them.
- **Visual**: per the UI/UX spec:
  - divider `mx-auto h-px w-6 bg-gray-100`, hidden at `max-height:540px`
  - the icon column's `space-y-2` becomes `space-y-1` at `max-height:540px`
  - button = standard strip button with `ph:tree-view` `h-5 w-5`
  - lit = `bg-gray-100 text-gray-900` + `aria-current="location"`
  - tooltip = standard dark tooltip
  - strings `shell.navigation.workspaces`: en "Workspaces", zh-CN "工作区"

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The path-only Chat rule (`/chat` prefix ⇒ active) is replaced outright; no flag or dual rule.
- The inline `/chat` id parsing (chat page, tree panel) and the inline Org-run route check (adaptive layout) are replaced by the D-7 predicates.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Panel visibility, tree expansion and highlight are in-memory renderer state. No stored data is read or written differently.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | User activates strip Workspaces | Left panel (docked or drawer) mounted with focus on the tree section | `LeftSidebarStrip` → `layouts/default.vue` (redock) / `appLayoutStore` (drawer) | Opening without navigation |
| DS-002 | Primary End-to-End | BEH-004, BEH-005 | Run opened anywhere (Task card, Team tab, tree, first send) → selection/route set | Tree panel mounts and expands the selected run's full ancestry | `useWorkspaceHistoryTreeState` | Correct rows exist to reveal |
| DS-003 | Bounded Local | BEH-004 | Tree panel mount | Selected row centred/visible and (if opened via Workspaces) focused; window closed | `useRevealSelectedTreeRow` (tree panel) | Scroll/focus timing against async rows |
| DS-004 | Primary End-to-End | BEH-003 | Docked collapse button | Strip mounted; focus on Workspaces | `AppLeftPanel` + `useLeftPanel` | Keyboard continuity |
| DS-005 | Primary End-to-End | BEH-008 | Route/selection/context change | Strip Chat/Workspaces and docked Chat row highlight | `useShellPrimaryNavigation` | "Where you are" |

## Primary Execution Spine(s)

- DS-001: `Strip Workspaces button → activateStrip (redock-panel ⇒ emit request-redock → default.vue redockLeftPanel → useLeftPanel visible; open-drawer ⇒ appLayoutStore.openMobileMenu) → AppLeftPanel mounts → WorkspaceAgentRunsTreePanel mounts → focus run-history section`
- DS-002: `Task card / Team tab / tree / send → openWorkspaceExecutionLink / selection store / route → (panel mount) useWorkspaceHistoryTreeState watch → reveal ancestry (+ D-5 member ancestors) → rows render`
- DS-004: `Collapse button → useLeftPanel.toggleLeftPanel → default.vue renders strip → nextTick focus [data-nav-key=workspaces]`
- DS-005: `route + agentContextsStore + selectionStore → useShellPrimaryNavigation (isPrimaryNavActive, isWorkspacesActive) → LeftSidebarStrip / AppLeftPanel classes + aria-current`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Workspaces uses the strip's existing activation, so it redocks on wide windows and opens the drawer on narrow ones. It never touches the router. After docking it parks focus on the tree section so DS-003 can move it to the row. | Strip, layout, left panel | `LeftSidebarStrip` | Drawer focus return (`data-nav-key`) |
| DS-002 | Whatever opened the run already set the selection/route. The fresh tree-state instance reveals that subject's ancestry on mount; teams now also open the focused member's sub-team rows. | Selection, tree state | `useWorkspaceHistoryTreeState` | Navigation projection (read) |
| DS-003 | For a short window after mount, the panel watches its rendered rows. It brings the selected one into view once (centred, only if hidden) and focuses it if the user came from Workspaces. The user taking over ends the window. | Tree scroll container, selected row | `useRevealSelectedTreeRow` | — |
| DS-004 | Collapsing moves focus to Workspaces, which opens the panel again. | Panel, strip | `AppLeftPanel` | — |
| DS-005 | One composable decides what is lit: pages by path, Chat only on New chat, Workspaces when a run is shown. | Route, contexts, selection | `useShellPrimaryNavigation` | Route predicates (D-7) |

## Spine Actors / Main-Line Nodes

`LeftSidebarStrip`, `layouts/default.vue`, `AppLeftPanel`, `WorkspaceAgentRunsTreePanel`, `useWorkspaceHistoryTreeState`, `useRevealSelectedTreeRow`, `useShellPrimaryNavigation`.

## Ownership Map

- `LeftSidebarStrip`: strip rendering and activation (redock vs. drawer; navigation for page icons only). A thin consumer of highlight.
- `layouts/default.vue`: panel/drawer/strip presence and drawer focus return (unchanged).
- `AppLeftPanel`: panel rendering; collapse control and its focus handoff.
- `useShellPrimaryNavigation`: all strip/panel nav highlight rules (owner of D-1, D-2).
- `workspaceNavigationService`: route shapes and route predicates (D-7).
- `useWorkspaceHistoryTreeState`: expansion state and selected-ancestry reveal (D-5).
- `useRevealSelectedTreeRow`: reveal-window lifecycle, scroll and focus handoff for one mounted tree panel (D-4).

## Thin Entry Facades / Public Wrappers

N/A — none added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Path-only Chat active rule in `isShellPrimaryRouteActive` | Wrong for open runs | D-1 rule | In This Change | Update the spec files |
| Inline `routeRunId` parse in `pages/chat.vue`; inline `/chat` id read in `WorkspaceAgentRunsTreePanel.sectionState.selectedRunId` | Duplicated | `chatRouteRunId` | In This Change | — |
| Inline `showAgentOrgActive` route check in `WorkspaceAdaptiveLayout.vue` | Duplicated with D-2 | `isAgentOrgRunRoute` | In This Change | — |
| Probe D11 reopen via strip Chat (+ dead `workspace-left-strip-open` fallback) | Chat no longer the reopen path | Strip Workspaces (`data-nav-key="workspaces"`) | In This Change | `tests/e2e/chat-draft-rows-live-probe.mjs` |

## Return Or Event Spine(s)

N/A — synchronous renderer flows; DOM mutation observation is covered by DS-003.

## Bounded Local / Internal Spines

- Parent owner: `useRevealSelectedTreeRow` (tree panel mount)
- Chain: `mount → open window (observer + interaction listeners + deadline) → DOM change → rAF → find last selected row → scroll if not fully visible → focus once if focus is on run-history section → … → close window (interaction | deadline | unmount)`
- Why it matters: rows arrive asynchronously from several sources. Rows loading above the selected one can push it away again during the window. User interaction must win.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Route predicates (`chatRouteRunId`, `isAgentOrgRunRoute`) | DS-005, DS-002 | `useShellPrimaryNavigation`, chat page, adaptive layout, tree panel | Parse route shapes | One meaning of "run route" | Highlight and center disagree |
| Localization `shell.navigation.workspaces` | DS-001 | Strip | Label | en/zh-CN | — |

## Ownership Boundaries

- Highlight is decided only in `useShellPrimaryNavigation`. Components must not compute their own "run open" rules.
- The strip never calls the router for Workspaces.
- Expansion state changes go through `useWorkspaceHistoryTreeState`. The reveal composable only scrolls and focuses; it never expands or selects.
- Selection is never changed by any part of this feature.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useShellPrimaryNavigation` | Path rules, route predicates, store reads | `LeftSidebarStrip`, `AppLeftPanel` | Components reading `route.query.id` or selection to decide highlight | Add a computed to the composable |
| `useWorkspaceHistoryTreeState` | Expansion records, ancestry reveal | `WorkspaceAgentRunsTreePanel` | Reveal composable toggling expansion | Extend the tree state |
| `workspaceNavigationService` | Route shapes | chat page, adaptive layout, tree panel, nav composable | Re-implementing the `/chat` id or Org-route parse inline | Add a predicate |

## Dependency Rules

- `useShellPrimaryNavigation` → route, `agentContextsStore`, `agentSelectionStore`, `workspaceNavigationService`. Allowed.
- `LeftSidebarStrip`/`AppLeftPanel` → `useShellPrimaryNavigation` (highlight), `useLeftPanel`/layout events (visibility). They must not import selection/context stores for highlight.
- `useRevealSelectedTreeRow` → DOM only (container ref). No store imports.
- `useWorkspaceHistoryTreeState` → its injected `runHistoryStore`/`selectionStore` params (unchanged pattern).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `isShellPrimaryRouteActive(key, location: { path: string; query: LocationQuery })` | Page highlight | Pure path/query rule; Chat needs `query` | `ShellPrimaryNavKey` + route location | Signature change (was `path`) |
| `useShellPrimaryNavigation().isWorkspacesActive: ComputedRef<boolean>` | Run-shown highlight | D-2 | — | New |
| `chatRouteRunId(query: LocationQuery): string \| null` | `/chat` run id | Trimmed first `id` value | route query | New (moved) |
| `isAgentOrgRunRoute(query: LocationQuery): boolean` | Org run route | `rootSubjectKind=agent_org`, `mode` active/history, `orgRunId` | route query | New (moved) |
| `useRevealSelectedTreeRow(container: Ref<HTMLElement \| null>): void` | Reveal window | D-4 | scroll container | New |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `isShellPrimaryRouteActive` | Yes | Yes | Low | — |
| `isWorkspacesActive` | Yes | N/A | Low | — |
| `chatRouteRunId` | Yes | Yes | Low | — |
| `isAgentOrgRunRoute` | Yes | Yes | Low | — |
| `useRevealSelectedTreeRow` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Strip control | Workspaces (`data-nav-key="workspaces"`, `data-test="workspace-left-strip-workspaces"`) | Yes | Low | Matches the docked "Workspaces" heading |
| Highlight | `isWorkspacesActive` | Yes | Low | Parallel to `isPrimaryNavActive` |
| Reveal | `useRevealSelectedTreeRow` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Open panel without navigating | `LeftSidebarStrip.activateStrip` + `default.vue` redock / `appLayoutStore` drawer | Reuse | Already the strip's activation |
| Focus the tree after redock | `openRunHistory` pattern, `app-left-panel-run-history` section | Reuse | Same target |
| Drawer focus return | `default.vue getLeftStripFocusTarget` (`data-nav-key`) | Reuse | No change needed |
| Expand member ancestors | `expandTeamMemberAncestors`, navigation projection | Extend | Already computes the keys |
| Highlight rules | `useShellPrimaryNavigation` | Extend | Single owner |
| Scroll/focus reveal | none | Create New (`useRevealSelectedTreeRow`) | No existing owner scrolls the tree |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Shell navigation (`composables/useShellPrimaryNavigation.ts`, `components/layout/LeftSidebarStrip.vue`, `components/AppLeftPanel.vue`) | Highlight, strip control, collapse focus | DS-001, DS-004, DS-005 | Extend |
| Workspace navigation service (`services/workspace/workspaceNavigationService.ts`) | Route predicates | DS-005 | Extend |
| Workspace history tree (`composables/useWorkspaceHistoryTreeState.ts`, `components/workspace/history/*`) | Ancestry + reveal | DS-002, DS-003 | Extend + one new file |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft beyond D-7).

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Redundant Attrs Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `/chat` id parse | `workspaceNavigationService.ts` `chatRouteRunId` | Route authority | 3 consumers must agree | Yes | Yes | A generic query util |
| Org-run route check | `workspaceNavigationService.ts` `isAgentOrgRunRoute` | Route authority | Highlight and center must agree | Yes | Yes | A general route classifier |

## Shared Structure / Data Model Tightness Check

N/A — no shared data types added.

## Final File Responsibility Mapping

| File | Kind | Concrete Change |
| --- | --- | --- |
| `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Modify | `isShellPrimaryRouteActive(key, {path, query})` with the D-1 Chat rule. Add `isWorkspacesActive` (D-2). |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | Modify | Add `chatRouteRunId`, `isAgentOrgRunRoute` (D-7). |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Modify | Divider + Workspaces button (glyph, classes, tooltip, `aria-current="location"`, `data-nav-key="workspaces"`, `data-test="workspace-left-strip-workspaces"`). `handleWorkspacesClick` (D-3). Short-window spacing. |
| `autobyteus-web/components/AppLeftPanel.vue` | Modify | Collapse handler with focus to strip Workspaces (D-6); `data-test="app-left-panel-collapse"`. Chat row highlight comes via `isPrimaryNavActive` (no local rule). |
| `autobyteus-web/components/workspace/history/useRevealSelectedTreeRow.ts` | Add | D-4 bounded reveal. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Modify | Scroll-container ref + `useRevealSelectedTreeRow`. `sectionState.selectedRunId` uses `chatRouteRunId`. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Modify | `aria-current="true"` on the selected Agent run row (same condition as its selected class). |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Modify | D-5 member ancestry in the team reveal, with pending-until-present rule. |
| `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Modify | `showAgentOrgActive` uses `isAgentOrgRunRoute`. |
| `autobyteus-web/pages/chat.vue` | Modify | `routeRunId` uses `chatRouteRunId`. |
| `autobyteus-web/localization/messages/{en,zh-CN}/shell.ts` (+ generated catalogs per the localization workflow) | Modify | `shell.navigation.workspaces`. |
| `autobyteus-web/docs/workspace_layout.md`, `autobyteus-web/docs/chat.md` | Modify | Strip Workspaces, highlight rule, reveal-on-appear. |
| Tests | Add/Modify | `composables/__tests__/useShellPrimaryNavigation*.spec.ts` (Chat/Workspaces rules incl. Org launch and empty `/workspace`); strip component test (render, activation without router push in both modes, aria); `AppLeftPanel` specs (collapse focus, Chat row highlight); `useWorkspaceHistoryTreeState.spec.ts` (nested member ancestry, pending rule); new `useRevealSelectedTreeRow` spec (scroll only when hidden, centring, cancel on interaction, deadline, focus handoff); `workspaceNavigationService` predicate tests; probe D11 update. |

## Applied Patterns

- Bounded observer window (D-4) inside one owner; no registry/manager.

## Target Subsystem / Folder / File Mapping

All paths are listed above. The new composable sits beside the other history-tree component composables (`components/workspace/history/useLeavingTreeRows.ts` precedent), because it is DOM-coupled to that panel.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `components/workspace/history/useRevealSelectedTreeRow.ts` | Off-Spine Concern (component-local) | Yes | Low | Matches the `useLeavingTreeRows.ts` precedent |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Highlight | Strip: `:class="isWorkspacesActive ? 'bg-gray-100 text-gray-900' : ''"` from `useShellPrimaryNavigation()` | Strip: `route.path.startsWith('/workspace') \|\| route.query.id` | DEC-005; single owner |
| Activation | `handleWorkspacesClick = (e) => { const docks = stripActivation === 'redock-panel'; activateStrip(e); if (docks) nextTick(focusRunHistory) }` | Calling `router.push('/chat?id=…')` or `setLeftPanelVisible` directly from the strip | Never navigate; reuse activation |
| Reveal | Composable only scrolls/focuses the last selected row | Composable toggling expansion or selecting runs | REQ-004 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep Chat lit on `/chat?id=` behind a flag | Existing tests/probes | Rejected | D-1 rule; update tests |
| Keep strip Chat as an alternate reopen path in probes | Probe D11 | Rejected | Probe uses Workspaces |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add the D-7 predicates and switch `chat.vue`, `WorkspaceAdaptiveLayout.vue` and the tree panel to them. This is behavior-neutral.
2. Highlight: change `isShellPrimaryRouteActive` and add `isWorkspacesActive`, with unit tests.
3. Strip: divider + Workspaces + activation + spacing + strings, with tests.
4. Panel: collapse focus; Chat row highlight verified.
5. Tree: D-5 member ancestry; `aria-current` on the agent run row; `useRevealSelectedTreeRow` wired in the tree panel, with tests.
6. Docs; probe D11 update; browser probe/isolated-instance checks per Guidance.

## Key Tradeoffs

- **DOM-observed reveal vs. data-driven reveal**: data-driven would need a "row rendered" signal from four row sources. The bounded observer is simpler, local and source-agnostic. Its cost is a few rAF passes for ≤ 3 s after the panel appears.
- **Selection/context-based highlight vs. route-only**: route-only is simpler but violates DEC-005 (Org launch page, the empty `/workspace` after archive). It adds two store reads to the highlight owner.

## Risks

- R-001: rows load after mount; covered by the D-4 window and the D-5 pending rule.
- R-002: tests and probes that assume Chat is lit on `/chat?id=` or reopen via Chat (D11) must be updated.
- R-003: there are no Team- or Org-hosted Task-card fixtures in the UI reference. Production validation must cover them (AC-002/AC-003).
- R-004: short "opening" states (`/chat?id` before the context registers) light neither Chat nor Workspaces briefly. This is accepted per DEC-005.

## Guidance For Implementation

- Follow the UI/UX spec's Implementation Fidelity Boundary exactly (placement, glyph, colors, spacing, short-window rule, highlight, no navigation, reveal, focus, strings).
- Do not change the strip page icons' click behavior or the docked Chat row/pencil behavior.
- Validation (per `TESTING.md`):
  - web unit/component tests (`pnpm -C autobyteus-web test:nuxt`)
  - a browser dev-path probe for AC-001..AC-005, AC-008, AC-009, AC-011, AC-012 at 1440×900, 1440×620, 760×900 and 1440×500. Extending `test:e2e:project-manager-ux` (it already opens every row kind from the Projects tab, including Team- and Org-hosted roots) is the natural home for the Task-card cases.
  - updating `chat-draft-rows-live` D11
  - final journey on an isolated desktop instance of a worktree build before user verification
- Rule: never use the user's running app or data.
