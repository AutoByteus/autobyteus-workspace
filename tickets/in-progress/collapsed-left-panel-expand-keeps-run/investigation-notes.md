# Investigation Notes

## Investigation Meta

- Package identifier: `collapsed-left-panel-expand-keeps-run`
- Request / ticket: Project Task `project_task_b2b0538a-4613-457a-81ed-6c9e9949da77` ("Collapsed left panel: let the user expand it again without leaving the run they're on"), delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run` on `codex/collapsed-left-panel-expand-keeps-run`
- Resolved base remote / branch / revision: `origin/personal` @ `3a2496c95b16b0f7e0cedc7afdf615ada00b2267` (fetched 2026-10-08; `origin/HEAD -> origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/collapsed-left-panel-expand-keeps-run/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08); repo `AGENTS.md`, `TESTING.md`, `autobyteus-web/AGENTS.md`, `autobyteus-web/docs/workspace_layout.md`, `autobyteus-web/docs/chat.md` (2026-10-08)
- Investigation status: Requirements-level investigation complete; runtime reproduction of the reveal/scroll gaps deferred to the architecture phase (see U-001).

## Initial Request And Clarifications

- Original request: With the left panel collapsed to its icon strip, the user opens a run from an In Progress Task card in the right-hand Projects tab, then wants to open the left panel to see that run in the Workspaces tree. The only way is the Chat icon in the strip, which navigates away ("opens the data assistant"), losing the run.
- Clarifications received: None yet. The interaction is to be settled with the user before implementation (explicit task instruction).
- User-supplied facts and constraints: Desktop app, 2026-10-08. Two screenshots (copied to `evidence/`).
- Initial ambiguity: Which control expands the panel (dedicated expand button vs. Chat icon not navigating); whether other strip icons keep their navigation meaning.

## Product And Domain Understanding

- Product area: Desktop/web app shell — left navigation panel (`AppLeftPanel`), its collapsed icon strip (`LeftSidebarStrip`), the Workspaces run tree, and the right-panel Projects tab.
- Affected actors: Desktop user who keeps the left panel collapsed to give the conversation more room.
- Existing purpose: The strip is the collapsed form of the left panel; each icon is a shortcut to a primary page (Chat, Agents, Agent Teams, Agent Orgs, Projects, Skills, Memory, Nodes, Settings).
- Terminology: *Docked* = full left panel; *strip* = 50 px icon column; *drawer* = transient overlay left panel on narrow windows; *redock* = turning the strip back into the docked panel.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | User | `evidence/user-collapsed-strip-run-open.png` | Starting state | Collapsed strip; Chat icon highlighted (route is `/chat?id=…`); center shows "solution designer · Offline" opened from a Task card; Projects tab shows In Progress cards with "software en… · Idle" / "softwar… · Running" links. | — |
| 2026-10-08 | User | `evidence/user-host-run-hello.png` | Second screenshot | Center shows host run "hello · Idle" (PT avatar — the Project Task Manager run) with Context Files (1): this is the user composing the report (attachment = screenshot 4). Not evidence of the post-click state. | Treated as context only. |
| 2026-10-08 | Code | `autobyteus-web/components/layout/LeftSidebarStrip.vue` (`activateStrip`, `handlePrimaryClick`, `handleSettingsClick`) | Root cause | In `redock-panel` activation every icon click emits `request-redock` **and then** `router.push(resolvePrimaryRoute(key))`. In `open-drawer` activation it only opens the drawer and does not navigate. There is no navigation-free expand control. | — |
| 2026-10-08 | Code | `autobyteus-web/composables/useShellPrimaryNavigation.ts` `resolveShellPrimaryRoute('chat')` | What Chat opens | Chat resolves to bare `/chat` (no `id`), dropping the open run's `?id=`. | — |
| 2026-10-08 | Code | `autobyteus-web/pages/chat.vue`; `docs/chat.md` §Routes | What bare `/chat` shows | `/chat` without `id` renders the New chat surface (`ChatNewSurface`) whose default target is Daily Assistant (`DEFAULT_CHAT_AGENT_DEFINITION_ID = 'autobyteus-daily-assistant'`, `utils/chat/chatDefaults.ts`) or the currently open draft. This is the "data assistant" the user saw. | — |
| 2026-10-08 | Code | `autobyteus-web/utils/layout/responsiveStripActivation.ts` | When the strip redocks vs. opens a drawer | `redock-panel` only when the user hid the panel (`hidden-by-user`), the window is not narrow/short, and the docked panel fits; otherwise `open-drawer`. The user's case (wide desktop, user-collapsed) is `redock-panel`. | — |
| 2026-10-08 | Code | `autobyteus-web/layouts/default.vue` | Panel lifecycle | Docked panel (`AppLeftPanel`) is rendered with `v-if`; collapsing unmounts it; `redockLeftPanel()` → `setLeftPanelVisible(true)` remounts it. | Tree state is per-mount (below). |
| 2026-10-08 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Collapse control and panel Chat row | Collapse button (sidebar-panel icon, title "Collapse left panel") sits at the right of the first (Chat) row. Panel Chat row always opens a fresh New chat (`runStart.newChat()`, REQ-004 of the chat-draft work). | Strip has no mirror of the collapse button. |
| 2026-10-08 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `composables/useWorkspaceHistoryTreeState.ts` | Reveal on (re)mount | Tree expansion state lives in the component instance; on mount a `watch(..., {immediate:true})` reveals the selected subject's ancestry: `agent:<runId>` → workspace + agent-definition group; `team:<teamRunId>` → workspace + team-definition group + team row; `agent_org:<root>` → workspace + org definition + org run (+ configured team). No `scrollIntoView` exists anywhere in the tree. Manual expansions made before collapsing are lost on remount. | U-001, U-002 |
| 2026-10-08 | Code | `components/workspace/history/WorkspaceTeamExecutionTree.vue` `isSelected` | Team member highlight | A member row is highlighted when its team is the selected team and the row is the team's `focusedAgentRunId`. Nested sub-team ancestor rows use `expandTeamMemberAncestors`, which is only called from the tree's own member click (`useWorkspaceHistorySelectionActions`), not on route/Task-card open; sub-team rows have an `openByDefault` behavior. | U-002 |
| 2026-10-08 | Code | `components/workspace/history/AgentRunTaskRows.vue`, `stores/agentRunCollaborationStore.ts` | Agent-run-host child highlight | Under a standalone Agent run, task Agent/Team rows come from the collaboration store; the selected child and task-Team expansion live in that store (survive panel remount). | — |
| 2026-10-08 | Code | `composables/projects/useTaskRootNavigation.ts` | Task card open paths | Agent host: open host run, push `/chat?id=<host>`, expand task Team and `selectChild(worker)`. Team host: `openWorkspaceExecutionLink({kind:'team', teamRunId, agentRunId})`, push `/workspace?workspaceExecution…` (stripped after apply). Org host: Org `inspect` action. | Entry-point list below. |
| 2026-10-08 | Code | `grep useTaskRootNavigation|inspectTeamMember|openTeamMemberRun|selectChild(` | Other entry points | Callers: `components/projects/ProjectTaskWorkers.vue` (used by right-panel Projects tab cards, `ProjectTaskRow.vue`, `TaskRootSection.vue` on `/projects` pages), `components/workspace/team/TeamMembersPanel.vue` (right-panel Team tab member click), tree rows, mobile shell (out of scope). | — |
| 2026-10-08 | Code | `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` D11 (lines ~746–762) | Existing coverage of strip reopen | The probe reopens the collapsed panel by clicking the strip's Chat icon and has a fallback selector `workspace-left-strip-open` that does not exist in the product. Confirms there is no dedicated expand control today. | Probe will need updating if Chat stops being the reopen path. |
| 2026-10-08 | Code | `components/layout/RightSidebarStrip.vue` | Right-side analogue | Right strip icons only select a tab and redock/open the drawer; they never navigate the page. The left strip is the only strip whose icons also change the page. | Consistency input. |
| 2026-10-08 | Doc | `autobyteus-web/docs/workspace_layout.md` §App Shell Left Navigation | Documented contract | "Its strip keeps route-aware active state and existing navigation meaning." | Strip icons' navigation meaning is a documented contract (preserve unless user decides otherwise). |
| 2026-10-08 | Doc | `TESTING.md` | Validation layers | Renderer change → web unit tests + browser dev-path probe; full journey → isolated desktop instance. Existing probes: `test:e2e:project-manager-ux` (left-panel state across pages, every row kind opening from Projects), `test:e2e:chat-draft-rows-live` (collapsed strip). | Verification intent. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Click any strip icon while the user-collapsed panel can redock (wide window) | Panel redocks, then the app navigates to that icon's page; Chat → bare `/chat` (New chat / Daily Assistant). | The run that was open in the center is replaced. No way to only expand. | `LeftSidebarStrip.vue` `handlePrimaryClick`; `resolveShellPrimaryRoute` | High |
| BEH-002 | User | Click any strip icon on a narrow/short window (`open-drawer`) | Drawer opens over the content; no navigation. | Open run stays. | `LeftSidebarStrip.vue` `handlePrimaryClick` early return | High |
| BEH-003 | User | Click the collapse control on the docked panel's first row | Panel collapses to strip; panel unmounts. | Run stays open. | `AppLeftPanel.vue` `toggleLeftPanel` | High |
| BEH-004 | System | Panel (re)mounts while a run is selected | Tree reveals the selected subject's ancestry (workspace, definition group, team row / org run). No scroll to the row. Earlier manual expansions are reset. | Highlight follows route/selection. | `useWorkspaceHistoryTreeState.ts` `applySelectedReveal`; no `scrollIntoView` in tree | Medium — not yet runtime-reproduced for each root kind (U-001/U-002) |
| BEH-005 | User | Open a worker from a Task card (right-panel Projects tab or `/projects` pages) | Agent host → `/chat?id=<host>` with task Team expanded and worker selected; Team host → `/workspace` with the member focused; Org host → Org inspect. | Center shows the worker; right Projects tab stays selected. | `useTaskRootNavigation.ts`; `docs/workspace_layout.md` Projects note | High |
| BEH-006 | User | Click a member in the right-panel Team tab | Focuses that member in the open team run. | Center shows the member. | `TeamMembersPanel.vue` | High |
| BEH-007 | User | Click the docked panel's Chat row or pencil | Always opens a fresh New chat. | Documented contract (chat-draft REQ-004). | `AppLeftPanel.vue` `navigateToPrimary` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `components/layout/LeftSidebarStrip.vue` | Renders strip icons; couples redock + navigation | Needs a navigation-free expand path | Where the expand control lives; strings (en, zh-CN) |
| `layouts/default.vue` `redockLeftPanel` | Sets panel visible, closes drawer | Expansion mechanism already exists without navigation | Reuse |
| `composables/useWorkspaceHistoryTreeState.ts` | Per-instance expansion + selected reveal | Reveal must cover every selected kind incl. nested team member; scroll is missing | Whether to lift state or add a reveal-and-scroll on mount; team-member ancestor expansion on non-tree opens |
| `WorkspaceStableExecutionRow.vue` / `WorkspaceTransientExecutionRow.vue` | Mark selected rows (`aria-current`, `is-selected`) | A selected-row marker exists to scroll to | Scroll target lookup |
| `AgentRunTaskRows.vue` | Child rows of Agent-run host | Highlight already store-driven | Scroll target for child rows |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Localization strings for a new control label/tooltip (`localization/messages/en|zh-CN/shell*.ts`).
- Evidence paths: `localization/messages/en/shell.generated.ts` (`collapse_left_panel`).

### Structural Surfaces

- Frontend-only: strip component, default layout, tree state composable/panel. No API, persistence, server or Electron main-process surface.
- Existing structural surfaces that support the behavior: `redockLeftPanel`, selected-reveal watcher, selected-row markers.

### Potential Structural Impacts To Investigate

- API or external-contract change: Absent.
- Persistence schema or invariant change: Absent (panel visibility is in-memory; tree expansion is in-memory).
- Security or privacy boundary change: Absent.
- Concurrency or lifecycle change: Panel mount timing vs. tree data load (reveal/scroll must wait for rows to exist) — present, local.
- Deployment/migration/ownership/refactor: Absent / unknown until design.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Code reading of existing probe `chat-draft-rows-live-probe.mjs` D11 | Collapse then click strip Chat | Probe uses Chat as the reopen path; fallback selector for a dedicated opener does not exist | Confirms BEH-001 / missing control | `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` |
| Live reproduction | — | Not run yet (rule 2 of TESTING.md forbids using the user's app; an isolated instance/probe is planned for the architecture phase) | U-001 | — |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task text) | "Expanding a panel and navigating are two different intents." Opening the panel must keep the current run and show it selected/visible in the tree. | Strong (explicit) | REQ-001..REQ-004 | Exact control (DEC-001) |
| User (Task text) | Check other entry points that open a run while collapsed. | Strong | REQ-003 coverage list | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Workspace layout contract | `autobyteus-web/docs/workspace_layout.md` | Strip keeps route-aware active state and existing navigation meaning; drawers are transient | doc | Doc update needed for the new control |
| Chat contract | `autobyteus-web/docs/chat.md` | Panel Chat row/pencil always opens New chat | doc | Preserve |

## Persisted Data And State Facts

- Affected stored or external subject: None. Panel visibility (`useLeftPanel`) and tree expansion are in-memory.
- Required semantics: N/A. Acceptable loss: N/A.

## Product Design Request Context

- Product Design request in the current input: `Present` (2026-10-08)
- User's requested outcome, in the user's own terms: "delegate a task to @Product Team to work on the UI first thanks"
- Requirement / behavior IDs involved: REQ-001..REQ-007, BEH-001..BEH-004, SCN-001..SCN-005, DEC-001..DEC-004
- Product decision to work on: the expand control and the strip icons' behavior (DEC-001, DEC-002); the expanded panel revealing the open run for every run kind; the narrow-window drawer.
- Critical journey and states: SCN-001 (Task card → expand); collapsed strip, docked panel and drawer.
- Known constraints and non-goals: see requirements Scope Guardrail.
- Product Design request artifact: `product-design-request.md`. Delegated to `/product_team`; coordinator run `product_ui_ux_designer_b22927e01ab64e47a03de8d41c18015d`.
- Separate design repository/root and ticket: owned by Product Team. Not yet known.

## Product Design Findings

### Final package (2026-10-08, `Design Completed`), integrated into requirements SR-002

- Product Design package (external): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/`
  - `ui-ux-spec.md` (status Approved)
  - `product-ticket.md`
  - `visual-references/VIS-001..VIS-008`
  - `review-evidence/`
- Design repository `/Users/normy/autobyteus_org/autobyteus-web-design` on `personal`:
  - validated commit `6478eec`, ticket closed `744152a`, integration record `7a8e634`
  - local and origin are equal (checked with `git log`/`git status` on 2026-10-08)
- Source pin `origin/personal@1cd1a3abc` (baseline WEB-BASELINE-REFRESH-008, integrated `9232842`).
- Consistency check (Solution Designer, 2026-10-08):
  - The spec and the ticket name the same repo/root, ticket, revisions and source pin.
  - All eight VIS files exist.
  - The user-confirmation quotes are recorded in both.
  - I inspected VIS-001 and VIS-003: they match the spec (lit tree icon after the divider, Chat not lit; docked panel with the worker row selected, center and Projects tab unchanged).
- User confirmation:
  - "Okay, I think this design is okay. I think this design is okay with a separate icon. Do it, because this will solve our navigation problem."
  - Tree icon: "the tree icon is good. I confirm by the way."
- Decisions: DEC-001 = D (Workspaces strip icon, `ph:tree-view`), Chat lit only on New chat, DEC-002 = a, DEC-003/DEC-004 out of scope.
- Mocked boundaries:
  - The UI reference's route-based `isRunOpen`, MutationObserver reveal wait and `data-nav-key` focus return are simulations.
  - Team- and Org-hosted Task-card fixtures are absent from the UI reference.
- New observation from integration (DEC-005): the spec's lit rule says "`/workspace`". The Org launch page is also `/workspace` (`buildAgentOrgLaunchRoute`: `rootSubjectKind=agent_org&mode=configuration`) with no run open, so the route rule and the stated intent ("whenever a run is open") differ there. Raised for the user.

### Interim notes (superseded by the final package above)

- Product Design package (external): Product ticket `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/collapsed-left-panel-expand-keeps-run/tickets/in-progress/collapsed-left-panel-expand-keeps-run/product-ticket.md`
  - Design repository `/Users/normy/autobyteus_org/autobyteus-web-design`
  - Branch `design/collapsed-left-panel-expand-keeps-run`
  - Base `origin/personal@afed67a3c`
- Round 1 (2026-10-08): DEC-001 A (dedicated "Expand left panel" control) was built. The user rejected it in review: "This is not really a dedicated one ... it looks really strange. Do we have other options?"
- Root-cause findings from Product. I verified them in source on 2026-10-08:
  - The strip has no icon for the Workspaces tree.
  - `isShellPrimaryRouteActive('chat', path)` returns `path.startsWith('/chat')`, so the Chat icon is lit on `/chat?id=<run>`. Clicking it still opens New chat (`useShellPrimaryNavigation.ts`).
  - `/workspace` (Team and Org runs) matches no primary key, so no strip icon is lit there.
- Auto-opening the panel on a Task-card open was considered. Product advised against it as the primary fix: it overrides an explicit collapse, behaves differently across entry points, can't work in the narrow drawer, and leaves the Chat trap.
- Proposed new DEC-001 option **D**, being built for the user to try. The user said "put a separate icon on so that I can experience it" and is unsure whether it's good:
  - A strip "Workspaces" icon, lit whenever a run is open. Clicking it shows the panel (docked or drawer) with the run revealed. It never navigates.
  - Chat is active only on New chat (`/chat` with no id), in both the strip and the docked Chat row.
  - No separate expand toggle. Page icons are unchanged (DEC-002 a).
- Potentially affected IDs if confirmed:
  - DEC-001; REQ-001 (replaced)
  - REQ-007, AC-006, AC-007 (Chat active-state rule)
  - AC-010 (rename)
  - a new highlight rule for the Workspaces icon
  - REQ-002, REQ-003, REQ-005 and REQ-006 still apply.
- UI-reference evidence relevant to U-002, from a prototype with a synthetic fixture (not production):
  - In the UI reference, the Team reveal left the nested sub-team row closed until design change DC-004 opened the focused member's sub-team ancestors.
  - This supports U-002. It still needs confirming in the production path during architecture.
- Product's baseline gap: the UI reference lacks the right-panel Projects tab, Team- and Org-hosted Task cards, and the Team-tab member list. Those entry paths were exercised through equivalent entries, not directly.
- Explicit user-confirmation reference: none yet.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/user-collapsed-strip-run-open.png` | User | Starting state of the reported journey | SCN-001 | AC-001 | Final | Evidence only |
| `evidence/user-host-run-hello.png` | User | Report-composition context | — | — | Final | Evidence only |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md` + `visual-references/VIS-001..008` | Product Team (external) | Normative UI/UX for the Workspaces strip icon and reveal | REQ-001..REQ-010 | REQ-001..REQ-010, AC-001..AC-012 | Approved by the user in Product review | Behavior-defining; part of the SR-002 approval basis |
| `product-design-request.md` | Solution Designer | Product request record | — | — | Final | Record only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether the on-mount reveal already works for every root kind (agent, agent-host child, team member incl. nested sub-team, org) once the panel redocks; only code-read so far. | Determines how much reveal work is needed vs. only scroll. | Architecture phase: browser probe / isolated instance. Solution Designer. | Open |
| U-003 | Unknown | Whether the user confirms Product's DEC-001 option D (Workspaces icon, Chat active only on New chat) | Replaces REQ-001 and changes the Chat active-state contract | Product Team returns the user-confirmed package | Resolved 2026-10-08: confirmed (SR-002) |
| U-004 | Unknown | DEC-005: should Workspaces be lit on a `/workspace` page with no run (Org launch page, empty `/workspace`)? | Highlight-rule edge | User | Open |
| U-002 | Unknown | A team member inside a nested sub-team opened from a Task card: are its sub-team ancestor rows expanded on reveal? (`expandTeamMemberAncestors` is only called from tree clicks.) | AC-003 | Architecture phase | Open |
| R-001 | Risk | Reveal/scroll must run after the tree's rows have loaded on mount (tree fetches on mount). | Scroll could target a not-yet-rendered row. | Design | Open |
| R-002 | Risk | Existing probe D11 reopens via the strip Chat icon; behavior change may need its update. | Test drift | Implementation / API-E2E | Open |

## Architecture Investigation Findings

Recorded 2026-10-08, after approval of SR-003.

Authorities read:
- `references/architecture-design.md`
- `design-principles.md`
- repo `DESIGN.md`

No closer `DESIGN*.md` exists under `autobyteus-web` (`find autobyteus-web -maxdepth 3 -name 'DESIGN*.md'` returned nothing).

| ID | Source / Command | Observation | Design implication |
| --- | --- | --- | --- |
| AF-001 | `git fetch origin; git log 3a2496c95..origin/personal` | Base moved to `efc2bfd0f`, which adds archived-open-run-disappears. In the scoped files only `pages/chat.vue` changed: an archived or deleted open run now leaves to `/workspace` with the selection cleared (`leaveToWorkspace`). Worktree fast-forwarded to `efc2bfd0f` (no local commits). | A route-only "`/workspace` = run open" rule would light Workspaces on that empty view. It confirms DEC-005, so the rule must use what the center shows. |
| AF-002 | `components/layout/WorkspaceAdaptiveLayout.vue` (template + `showAgentOrgActive`, `isTeamSelected`) | The `/workspace` center shows one of: the Org run view (`rootSubjectKind=agent_org`, `mode` active/history, `orgRunId`), run config, an Agent view, a Team view, or the empty state. `pages/workspace.vue` shows the Org launch page for `mode=configuration`. | "Run shown on `/workspace`" = Org run route, or selection type `team` with a run id. |
| AF-003 | `pages/chat.vue` `routeRunId`, `displayedContext` | `/chat?id=X` shows the run when `agentContextsStore.getRun(X)` exists. Otherwise it shows "opening" or "missing". The id parse is duplicated in `WorkspaceAgentRunsTreePanel.sectionState.selectedRunId`. | "Run shown on `/chat`" = route id with a registered context. Extract one route-id parser beside `buildAgentRunChatRoute`. |
| AF-004 | `WorkspaceAdaptiveLayout.openRunHistory` | The existing empty-state action already shows the left panel without navigating (drawer or redock), then focuses `[data-test="app-left-panel-run-history"]` on `nextTick`. | Same operation and focus pattern as Workspaces. The strip's own `activateStrip` already owns redock/drawer for strip clicks, so Workspaces reuses `activateStrip` plus this focus pattern. |
| AF-005 | `composables/useShellPrimaryNavigation.ts`; callers: `LeftSidebarStrip.vue`, `AppLeftPanel.vue`, two spec files | `isShellPrimaryRouteActive(key, path)` is path-only, and Chat = `path.startsWith('/chat')`. This composable is the single owner of strip and panel nav highlight. | Owner for the Chat New-chat rule and the new Workspaces highlight. The helper needs the query for Chat. |
| AF-006 | `useWorkspaceHistoryTreeState.ts` `revealTeamRunAncestry`; `runHistoryNavigationProjection.ts` L224–248 | Team reveal opens workspace, definition group and team row, but not the focused member's sub-team rows. Member ancestor keys come from the same projection as team ancestry. | Extend the team reveal with `expandTeamMemberAncestors(focusedAgentRunId)` (U-002). |
| AF-007 | Row markup: `WorkspaceStableExecutionRow.vue`, `WorkspaceTransientExecutionRow.vue` (`aria-current="true"` + `aria-selected`); `WorkspaceAgentOrgHistoryCollection.vue` (Org treeitems: `aria-selected`; Org run row: both); `WorkspaceHistoryWorkspaceSection.vue` agent run row (neither) | Selected rows are marked in two legitimate ARIA ways. The standalone Agent run row has no marker. | The reveal targets the last `[aria-current="true"], [aria-selected="true"]` in the tree scroll container. Add `aria-current="true"` to the selected Agent run row. |
| AF-008 | `layouts/default.vue` | The docked panel and drawer both mount `AppLeftPanel` with `v-if`. Collapse unmounts it. Drawer focus return finds the strip button by `data-nav-key`. | "Panel appears" = tree panel mount, which covers dock, drawer and app start. Workspaces gets `data-nav-key="workspaces"` for drawer focus return; no layout change. |
| AF-009 | UI reference diff `git -C autobyteus-web-design diff 9232842 6478eec` | Reference implementation of DC-001..DC-006. The spec marks the route-based `isRunOpen`, the MutationObserver wait and `data-nav-key` as simulations. | Production reuses the shape but uses the AF-002/AF-003 run-shown rule. The bounded DOM-observing reveal is kept as a production choice (rationale in the design spec). |
| AF-010 | `grep isShellPrimaryRouteActive|isPrimaryNavActive|useShellPrimaryNavigation` | Unit tests: `composables/__tests__/useShellPrimaryNavigation*.spec.ts`, `components/__tests__/AppLeftPanel*.spec.ts`. Probe `tests/e2e/chat-draft-rows-live-probe.mjs` D11 reopens via the strip Chat icon. | Tests to update or add; R-002. |

## Requirement Implications

- Root cause is a coupling in one place: the strip treats "expand" and "navigate" as one action in `redock-panel` mode. A navigation-free expand path already exists in the layout (`redockLeftPanel`).
- The narrow-window drawer path already keeps the run; only the wide-window user-collapsed path loses it.
- Tree reveal on mount exists but does not scroll and may miss nested team members; manual expansions do not survive collapse/expand.

## Notes For Architecture Design

- Map SCN-001..SCN-005 to: strip control → `redockLeftPanel` (no route change); panel mount → reveal selected ancestry → scroll selected row into view after rows render.
- Verify U-001/U-002 with a probe before deciding whether reveal needs extension.
- Keep strip icons' navigation contract unless DEC-002 says otherwise.

## Post-Design User Question (2026-10-08, via API/E2E Engineer)

- The user asked whether the strip Chat icon could just open the panel and stay on the current page, with the pencil opening New chat, so the Workspaces icon would not be needed. API/E2E relayed it from run `api_e2e_engineer_53e11486789946d7b9ab010d9972431b`. The implementation is validated (API-REV-002) and delivery DR-001 is in progress on `e0ee0ce99`.
- Assessment (Solution Designer): it is feasible, but not recommended. The reasons are in my reply to the user.
- Status: not a requirement change unless the user chooses it. Requirements stay `Approved` at SR-003, and no artifacts were changed.
- User decision (2026-10-08): "Yeah, I think you're right. It becomes inconsistent." Keep the Workspaces icon. The Chat-only-expands alternative is rejected. Requirements are unchanged (SR-003 `Approved`), and the design and delivery continue as they are.

## User Change Request (2026-10-09): one control should fold and unfold

- The user, after trying the build, wrote: "I don't like this approach ... after I click the collapse button on the chat row ... we got the tree icon and I click the tree icon, then it comes out again ... normally the same icon is controlling the folding and unfolding ... if we introduce a tree icon, the folding and unfolding are happening from two different icons. This is where things get strange."
- Facts checked in source (`efc2bfd0f`+):
  - Docked left collapse: panel glyph (`M9 3v18`) at the right end of the Chat row (`AppLeftPanel.vue`).
  - Right side, run views: collapse with the panel glyph (`M15 3v18`) in the tab row (`RightSideTabs.vue`). Reopen from the right strip's tab icons, which never navigate (`RightSidebarStrip.vue`). The right strip has no toggle glyph.
  - Right side, start surfaces: one panel glyph opens the tools (`StartSurfaceToolsToggle.vue`: "the same icon, in the same corner, as the panel's own close button").
- History: round 1 of the Product review built exactly a same-glyph expand toggle at the top of the strip (`review-evidence/round-1/R1-01`, `R1-02`). The user rejected it then as looking "really strange". The new feedback is about the fold/unfold principle, not the look.
- Classification: `Requirement Gap` (user change to intended behavior: DEC-001, REQ-001, REQ-008, REQ-009 and the confirmed UI/UX spec). It needs the user's direction, then revised requirements and renewed approval. Delivery DR-001 must not finalize the current design.
- Delivery halt confirmed (2026-10-09), DR-002 Blocked (Requirement Gap). Local commit `d61ae654d` records the halt. No merge, push, release or cleanup was done. Facts for the revision:
  - DR-001 merged `origin/personal@ebf68c4af` as `f8b1fb4ec`. This ticket's probe cases were renumbered PMU-017 → PMU-018 and PMU-018 (A–H) → PMU-019. Revised probe work starts from these IDs.
  - Docs that describe the rejected Workspaces design and must be revised or reverted:
    - `TESTING.md` (PMU-018/019)
    - `autobyteus-web/docs/projects.md`
    - `autobyteus-web/docs/workspace_layout.md`
    - `autobyteus-web/docs/chat.md`
    - ticket `release-notes.md` and `docs-sync-report.md`
  - Delivery restarts on the revised package with a base refresh, full docs sync, new release notes and new user verification.
- Alternatives discussed with the user (2026-10-09):
  - the same panel icon in the strip
  - the panel icon in the page's top row
  - a hover swap
  - every strip icon only unfolds (two-click page navigation)
- User decision (2026-10-09), verbatim: "After thinking for a long time, seems like the best option is still the tree option." The user also asked to have delivery resume.
- Result: the change request is withdrawn. Requirements stay `Approved` at SR-003, the design at SR-004 is unchanged, and the validated build stands. Delivery is asked to resume from DR-002.

## Cancellation And Reopening (2026-10-09 / 2026-10-10)

- Cancelled 2026-10-09. The cleanup is described in SR-006.
- Reopened 2026-10-10 by the user with the tree-button direction. It matches SR-003 exactly; see SR-006.
- Recovery evidence: `git cat-file -t 900443b11` returned `commit`. `git worktree add -b codex/collapsed-left-panel-expand-keeps-run <worktree> 900443b11` restored the branch and all ticket artifacts.
- `origin/personal@d28c56d5d` is 19 commits ahead; merge base `033a6d780`.
- Product design repo: removal commit `8740ada`. The spec and VIS files are retrievable at `7a8e634`.
- The Product spec was restored on 2026-10-10 by Product run `product_ui_ux_designer_7f2757f2f2aa47638f086d301753c83e`:
  - Design repo `personal` = `origin/personal` @ `6fdf576`, which reverts `8740ada`.
  - The spec, VIS-001..008 and UI-reference code are byte-identical to `7a8e634`. The only change is a "Cancellation And Restoration" section in `product-ticket.md`.
  - Product's validation: `vue-tsc` passed, and the VIS-001/VIS-003 journey was re-run with 0 page errors.
  - Canonical spec path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md`.
