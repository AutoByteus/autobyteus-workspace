# Investigation Notes — mobile-experience-redesign (autobyteus-277)

## Investigation Meta

- Package identifier: `mobile-experience-redesign`
- Request / ticket: Project Task `autobyteus-277` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), with the user's comment of 2026-11-06.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/mobile-experience-redesign`
- Resolved base remote / branch / revision: `origin/personal` @ `e00581d485a128bddc428d4441400ed21dc14db7` (fetched 2026-11-06; includes the autobyteus-385 merge `8142ba8116`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the refreshed base; ticket folder `tickets/in-progress/mobile-experience-redesign/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate, 2026-11-06): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md`; templates for requirements, investigation notes and revision record
- Investigation status: requirements-level investigation complete for the Product brief; architecture investigation not started (it follows requirements approval)

## Initial Request And Clarifications

- Original request (Task, 2026-10-23): three points. (1) Delegated runs are not visible on mobile: the Project Task Manager shows, its task agents and task teams do not. (2) The UI is not good: navigation and use are hard on a phone; the layout must use the small screen very well. (3) Remote collaboration: from the phone, start work on a node and see and talk to delegated runs on any node.
- Clarification (the user, 2026-11-06, his words): "currently the mobile experience is really bad. for example, i can not see the task agent or agent team, many problems, ui experience also not good enough. could you create a ticket and ask software engineering team after finishing investigation, and delegate a task to product team".
- PM notes (2026-11-06): consider the new desktop left panel of autobyteus-385 (Runs, Workspaces, Projects views; the Runs view nests delegated work and lists newest first). autobyteus-278 (remote delegated runs under their delegator) is DONE. The user checks on his own phone and names the worst problems with screenshots.
- User-supplied constraints: Android first; iOS paused but the shared web shell stays iOS-safe; Android shell touched only if needed; no new permissions without approval; trusted private network and Tailscale assumptions unchanged; no secrets in screenshots or logs; no release unless asked.
- Initial ambiguity: how far "remote nodes on mobile" goes (see U-001); what is deliberately not on mobile (U-002).

## Product And Domain Understanding

- Product area: the `/mobile` web shell served by the node (`autobyteus-web`), wrapped by the Android WebView shell (`autobyteus-android`) and later the iOS shell (`autobyteus-ios`).
- Affected actors: the user away from his desk, on his phone, reaching his desktop node over Tailscale.
- Existing purpose: see and continue work on the paired node: Home, Chat, Runs, Files, Artifacts, Activity, start a new agent or team run.
- Terms: *delegated run* / *task agent* / *task team* = a run another run created with `delegate_task` (a "delegated copy" in older tickets); *remote delegated run* = one running on another node (autobyteus-278); *paired node* = the node the phone pairs with by QR; *peer node* = a node the paired node registered under Nodes → Remote Collaboration.

## Source Log

| Date | Type | Source | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06 | Code | `autobyteus-web/pages/mobile.vue`, `components/mobile/MobileRemoteAccessShell.vue` | Entry and screens | `/mobile` renders `MobileRemoteAccessShell`: pairing, Home, Work shell, Troubleshooting, a "Switch work" bottom sheet, Unpair confirm | — |
| 2026-11-06 | Code | `components/mobile/MobileWorkShell.vue` | Navigation | Header (Home button, context title, "Switch" button), optional team member focus bar, and a 5-tab bottom bar: Chat, Runs, Files, Artifacts, Activity, with emoji icons and 10px labels | Product baseline |
| 2026-11-06 | Code | `components/mobile/MobileHome.vue` | Home | Status card (node, URL, status pill), "Recent work" (5 rows), four tiles: Choose work, Files, Troubleshoot, Unpair | Product baseline |
| 2026-11-06 | Code | `components/mobile/MobileContextSwitcher.vue` | Switch work | Bottom sheet with search and segments Recent / Agents / Teams / Workspaces; a flat list of rows | — |
| 2026-11-06 | Code | `composables/mobile/useMobileWorkCatalog.ts` | Run list source | `recentWorkItems` walks `runHistoryStore.workspaceGroups` → agent runs and team runs only: a flat list, sorted active first then `createdAt`. No delegated rows, no Org runs, no nesting. Reads `setHistoryWindow(5)` (5 runs per agent) | E-01, E-02 |
| 2026-11-06 | Code | `components/mobile/MobileRuns.vue` | Runs tab | Same flat `recentWorkItems` filtered to runs; "Start new" toggles the setup form in place | E-01 |
| 2026-11-06 | Code | `components/mobile/MobileChat.vue` | Chat | Renders `AgentEventMonitor` with `agentContextsStore.getRun(runId)` (the run's own agent) or `AgentTeamEventMonitor`. It does not use `activeContextStore.activeWorkspaceTarget`, the desktop resolver that shows a selected delegated child (local or remote) | E-03 |
| 2026-11-06 | Code | `stores/activeContextStore.ts:72-150` | Desktop target | For a selected agent run, `agentRunCollaborationStore.childTargetFor(runId)` returns the selected delegated child as the target; teams and Org runs (route `rootSubjectKind=agent_org`) resolve here too | E-03 |
| 2026-11-06 | Code | `stores/runListStore.ts`, `utils/runListProjection.ts`, `components/runList/RunListRow.vue` | Desktop Runs view (385) | Every top-level Agent, Team and Org run, newest first by server `lastActivityAt`; newest 5 then "Show older (N)"; under an Agent run `AgentRunTaskRows` (task agents and task teams), under a Team run `WorkspaceTeamExecutionTree`, under an Org run `AgentOrgRunMemberTree` | E-04 |
| 2026-11-06 | Code | `stores/agentRunCollaborationStore.ts`, `components/workspace/history/AgentRunTaskRows.vue` | Delegated rows data | `taskRows(runId)` gives the delegated rows of a standalone run; `selectChild` selects one; remote executions are registered in `remoteRunsStore` (autobyteus-278) | E-04, E-05 |
| 2026-11-06 | Code | `services/agentCollaboration/agentRunCollaborationChildHydration.ts:38-80` | Remote child loading | "A remote child's conversation is read from its node by this node's server"; the window never contacts a peer | E-05 |
| 2026-11-06 | Doc | `tickets/done/remote-runs-in-tree/requirements-doc.md` (278) DEC-801, DEC-803, DEC-805, REQ-806, REQ-808 | Remote runs contract | Remote runs stream through this node's server, so mobile works with one connection; the user may message a remote run; "The mobile shell uses the same tree data"; remote run view: text-only composer, no files/terminal | E-05 |
| 2026-11-06 | Doc | `tickets/done/workspace-tree-vs-chooser/requirements-doc.md`, `design-spec.md` (385) | Desktop left panel | Runs view REQ-008; read window `null` for Runs (complete history), 6 otherwise; "The phone keeps its window of 5"; the phone was out of scope | E-04 |
| 2026-11-06 | Code | `autobyteus-server-ts/src/api/graphql/types/remote-collaboration-settings.ts:95-160` | Peers | The paired node answers peer list, a peer's offer (`peerNodeOffer`: the agents and teams it offers) and availability; it has no API for the user to start a run on a peer. Remote work starts by delegation (`delegate_task` with `node`) | E-06 |
| 2026-11-06 | Code | `autobyteus-android/.../connection/SavedNodeStore.kt`, `ui/ConnectionScreen.kt` | Several nodes | The Android shell already keeps a list of saved nodes with a selected one; its connection screen lists "Saved nodes" with Open / Remove. Each node is paired separately with its own Phone Setup QR | E-07 |
| 2026-11-06 | Code | E-09: `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts`; `stores/mobileNodeSessionStore.ts:22-27,86`; `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts`, `stores/paired-device-store.ts`; `autobyteus-android/.../connection/SavedNodeEntry.kt:34`, `MainActivity.kt:97-110,178-194`, `web/TrustedNavigationPolicy.kt` | The user's question: pair with several nodes at once? | **Pairing with several nodes works today (Read; not yet run on a device).** The web session lives in localStorage key `autobyteus.remote_access.mobile_session` of the page's origin; each node serves `/mobile` from its own origin (Tailscale host and port), so each node keeps its own session and credential. Each server keeps its own paired-device list (`paired-devices.json` in its app data) with no limit across nodes. The Android shell saves one entry per origin and lists "Saved nodes" with Open; Back from the web shell (no web history left) returns there. **Missing for an in-shell "Switch node":** the page cannot read the shell's saved nodes or other origins' storage, and the shell opens another origin outside the WebView. It needs a small trusted-origin bridge from the shell (no new permission) | FU-001 |
| 2026-11-06 | Code | `utils/mobileFeatureGates.ts` | What is on mobile | Supported: pairing, status, agent and team runs, history, workspace files, artifacts. Not: terminal, vnc, desktop workspace, settings, updates, folder picker, applications, projects, browser | E-08 |
| 2026-11-06 | Code | `services/runHydration/runtimeStatusNormalization.ts` | "Needs you" state | History statuses are error / initializing / running / idle / offline; no stored "waiting for your approval" state | U-003 |
| 2026-11-06 | Doc | `tickets/done/mobile-ux-simplification`, `mobile-functionality-parity`, `mobile-ux-cleanup-followup`, `mobile-run-config-chat-flow`, `mobile-auto-approve-toggle` | History of the shell | The shell was improved by local patches (copy removal, scroll fix, parity, setup flow). The user's earlier rules: "if desktop/web does not need a control or explanatory label, mobile should not invent that extra complexity"; mobile is "a responsive version of the web product, not a reduced MVP"; Start new = configure, create, then send the first message in Chat | Preserved product intent |
| 2026-11-06 | Runtime | `adb devices`; `emulator -list-avds` | Devices | No device attached now; AVDs `android_operator_play_api35`, `codex_api35_arm64` exist for later verification | Verification |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open Runs or Switch work → Recent | Flat list of top-level agent and team runs, active first, then by creation time, 5 per agent | Delegated task agents and task teams never appear; Org runs never appear; older runs past 5 per agent are missing | E-01, E-02 | Read; matches the user's report |
| BEH-002 | User | Tap a run | Selects the run; Chat shows the run's own agent (or the team's focused member) | No way to open a delegated child, local or remote | E-03 | Read |
| BEH-003 | User | Navigate | Home ↔ Work shell (Home button), "Switch" sheet, 5 bottom tabs | Two entry points for the same list (Home's Recent, Runs tab, Switch sheet's Recent) | Code | Read; the user calls it hard to use |
| BEH-004 | User | Start new | Runs tab → "Start new" → setup form → create → Chat | Works (mobile-run-config-chat-flow) | Code, earlier ticket | Read |
| BEH-005 | System | A run delegates to a peer node | Desktop tree shows it with its node (278); the phone shows nothing | Remote work invisible on the phone | E-05 | Read |
| BEH-006 | User | Use several nodes | Android shell keeps several saved nodes; switching is from the native connection screen | Possible today, not visible inside the web shell | E-07 | Read |

## Relevant Codebase And Technical Facts

| Path / Component | Responsibility | Requirement implication | Architecture question |
| --- | --- | --- | --- |
| `useMobileWorkCatalog.recentWorkItems` | Mobile's own flat run list | The cause of BEH-001: a parallel list builder that never learned about delegation | Replace with the desktop's `runListStore`/projection rather than extend a second builder (DESIGN.md: one owner) |
| `MobileChat` | Picks the context itself | The cause of BEH-002 | Render from `activeContextStore.activeWorkspaceTarget` like `AgentWorkspaceSurface` |
| `runHistoryStore.setHistoryWindow` | One read window shared by every surface | Showing the same runs as the desktop Runs view needs the `null` window | Payload size and poll cost over Tailscale on a phone: measure |
| `agentRunCollaborationStore`, `remoteRunsStore` | Delegated rows, local and remote, and their loading | Mobile gets remote delegated runs by reuse (278 DEC-805) | The stream per opened run on a phone (battery, reconnect) |
| `mobileWorkStore` | Mobile UI state (context, tab, run setup intent) | Keeps owning mobile-only navigation state | Its `MobileWorkContext` kinds may need a delegated-child target or be replaced by the selection the desktop uses |
| `MobileFeatureGates` | Lists mobile features | Decides what is not on mobile | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Run history GraphQL `listWorkspaceRunHistory` / `listCollaborationRootHistory`, read with a window (phone 5 today).
- Collaboration view per standalone run (`agentRunCollaboration`), remote task executions inside it.
- Peer list and offers (`peerNodeOffer`).

### Structural Surfaces

- Web: `components/mobile/*`, `composables/mobile/*`, `stores/mobileWorkStore.ts`, `types/mobileWork.ts`; shared `runListStore`, `runListProjection`, `activeContextStore`, `agentRunCollaborationStore`, `remoteRunsStore`, run row components.
- Android: WebView shell, saved nodes, QR, diagnostics.
- Server: none required for points 1 and 2; none for remote delegated runs (278 delivered); a new server capability only if the user chooses direct start on a peer (U-001 option C).

### Potential Structural Impacts To Investigate

- API change: none expected for options A/B of U-001; option C needs a new cross-node launch API.
- Persistence: none expected; mobile UI state in local storage only.
- Security: none for A; B touches the shell's node switching (no new permission); C adds a new cross-node request type.
- Lifecycle: live streams per opened run on a phone.
- Refactor: replacing the mobile run list builder and the Chat target selection with the shared owners.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| Code reading | Delegated rows on mobile | `recentWorkItems` has no path to collaboration children | Read (reproduction on a device pending; the user reports it) | REQ-001 | `useMobileWorkCatalog.ts:108-175` |
| — | Phone-sized screenshots of today's shell | Not taken: the only running node is the user's own app, and pairing a probe phone session there would touch his data. The Product Team's baseline of the current UI (its rule) and the user's own screenshots cover this | — | Product baseline | — |

- Temporary diagnostics: none.
- Reproduction for implementation: none yet; architecture will add a failing projection test (a standalone run with a delegated child must yield a nested row on mobile).

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open |
| --- | --- | --- | --- | --- |
| The user, 2026-10-23 and 2026-11-06 | See task agents and task teams; better phone UX; use remote nodes from outside | Direct request | REQ-001…REQ-008 | Worst problems with screenshots (U-004) |
| The user, earlier mobile tickets | No mobile-only complexity; responsive version of the web product | Direct, earlier | QR-002 | — |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Android WebView / iOS WKWebView | Platform | Shared web shell must stay iOS-safe (no Android-only web APIs) | Task | Low |
| Tailscale reachability | The user's setup | Unchanged; the phone talks only to the paired node | Task, 278 DEC-801 | — |
| Touch target guidance | Material (48dp) / Apple HIG (44pt) | Large touch targets for one-hand use | Platform guidelines | — |

## Persisted Data And State Facts

- Affected stored subject: none on the server. Mobile UI state lives in the phone's local storage (`mobileWorkStore`, node session).
- Must be preserved: the phone's pairing/session; saved node entries in the Android shell.
- Acceptable loss: mobile UI preferences (last tab, remembered member focus) may reset.

## Product Design Request Context

- Product Design request: `Present` (the user: "delegate a task to product team"; the Task: the Product Team designs code-first, baseline of the current UI first; the user approves the UI).
- User's requested outcome, his terms: mobile is "really bad"; "i can not see the task agent or agent team"; "ui experience also not good enough"; layout must use the small screen very well; remote collaboration from outside.
- Requirement IDs involved: REQ-001…REQ-009; U-001, U-002, U-003.
- Decision to design: the mobile information architecture and navigation; the delegation tree on a phone; the run screen (talk, approve, read results); remote runs and nodes; what is not on mobile.
- Critical journeys: SCN-001…SCN-006 in the requirements doc.
- Known constraints and non-goals: see requirements Scope Guardrail.
- Request artifact: `product-design-request.md` in this folder.

## Product Design Findings

- Product Design package: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/`: `ui-ux-spec.md`, `product-ticket.md`, `visual-references/VIS-001…029`, `evidence/user-screenshots/` (22, with README).
- Design repository: `/Users/normy/autobyteus_org/autobyteus-web-design`. Branch: `design/mobile-experience-redesign` @ `e6ca7b6098b8bee1d194ad9cc0292c8e88ef59a6 (after `976457a4`, text fixes only)` (pushed). Accepted base: `a0e18abb`. Integration into `personal` is pending until the implementation is confirmed (the user's standing rule).
- Runnable reference: in the design worktree, `corepack pnpm exec nuxt dev --port 3277`, entry `/mobile`.
- Explicit user confirmation (2026-11-06): "okayyy. everything is good now. i approve".
- Journeys validated: UXJ-001…UXJ-008.
- Decisions supported by evidence:
  - DEC-003 A as built.
  - DEC-004: the "What Is Not On The Phone" list.
  - DEC-007: agent-only New run.
  - OPT-001 (the "needs you" marker): dropped by the user after the approval (Product round 17).
- Alternatives the user rejected: five tabs plus Home; a sibling strip or tree sheet on the run screen; a "Results" screen with tabs; an Agent | Team toggle; Files filters; cards with borders.
- Mocked boundaries and production gaps: the spec's "Data, Contract, And Mock Boundaries" and its five findings for engineering (new run id change; no fallback navigation state; Back closes overlays; remote composer text-only; the node's own name).
- Requirements sections affected: all (SR-002).
- Verified on receipt (2026-11-06):
  - the design worktree HEAD is `16678d53…` (first approval) and then `976457a4…` (the marker removed at the user's request, Product round 17);
  - the spec links the runnable reference, the runbook and VIS-001…029, all present;
  - the spec's repository, branch and revision match the Product message.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `product-design-request.md` | Solution Designer | The brief sent to the Product Team | Product design | All | Sent 2026-11-06 | Not behavior-defining by itself |
| `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md` with VIS-001…029 (rev `e6ca7b60`) | Product Team | Normative UI | Product design | REQ-001…REQ-009 | Approved | The user, 2026-11-06 |
| `follow-ups.md` | Solution Designer | FU-001 = autobyteus-391 | Follow-up | DEC-003 B | Sent | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why it matters | Resolution / owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown (user decision) | How far remote nodes go on mobile: A through the paired node only; B also switch between several paired nodes; C start a run directly on a peer through the paired node | Scope, security, Android shell | The user (DEC-003) | Open |
| U-002 | Unknown (user decision via UI approval) | What is not on mobile | Layout | Product proposes, the user approves | Open |
| U-003 | Unknown (feasibility) | A "needs you" marker on run rows (waiting for an approval or an answer) | One of the things the user does outside | History has no such status; live contexts know pending approvals only for runs the phone streams. Architecture to measure; Product must not make it a hard visible element before that | Closed: confirmed (E-26); the user dropped the marker (DEC-005) |
| U-004 | Unknown | The user's own screenshots and worst problems | Prioritization | The user, during Product review | Open |
| R-001 | Risk | The complete history window on a phone over Tailscale (payload, polling) | Performance, battery | Architecture: measure payload with the user's real history size | Open |
| R-002 | Risk | Live streams for opened runs on a phone that sleeps | Reliability | Architecture: reconnect behavior, same as desktop | Open |

## Architecture Investigation Findings

The architecture investigation of 2026-11-06 ran after the requirements were approved at SR-002. All paths are under `autobyteus-web/` unless noted. Every finding here was established by reading the code, except E-17, which was measured.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| E-10 | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue:118-120, 380-409` | The desktop run section host owns the history load: window per view, `fetchTree` + `loadWorkspaceCatalogForNavigation` + agent/team/Org definition fetches on mount, a 5 s `refreshTreeQuietly` poll, cleared on unmount | The phone needs the same load and poll; one owner, not a second copy (Principle 13) |
| E-11 | `stores/runListStore.ts:17-52`; `utils/runListProjection.ts:113-126` | `runListStore.entries`: every top-level Agent, Team, Org run newest first by `lastActivityAt`; `shownEntries`/`olderEntries`/`setOlderShown`/`showRun` give the fold. It only reads `runHistoryStore` | Reused as is for REQ-001 |
| E-12 | `components/workspace/history/AgentRunTaskRows.vue:58-104`; `stores/agentRunCollaborationStore.ts:41-140, 320-340` | An Agent run's delegated rows are `collaboration.taskRows(runId)`; the stored view loads with `collaboration.inspect(runId)` when `hasCollaboration` (component-local rule, lines 60-64); a row tap does `selectChild(host, row.agentRunId ?? coordinatorRunIdOf(teamRunIdForNode))` then opens the host (lines 95-101); remote children come from the same context (278) | Reuse; move the two component-local rules (load stored view, select a task row) into the store so the phone does not copy them |
| E-13 | `components/workspace/history/WorkspaceTeamExecutionTree.vue:120-150`; `TeamTreeNode.executionRows` | A Team run's members and their delegated work are `team.executionRows` with depth and `hasChildren`; expansion is per row key | Reuse the rows; the phone renders them |
| E-14 | `components/workspace/history/AgentOrgRunMemberTree.vue:136-150`; `utils/agentOrgHistoryRows.ts:210` | An Org run's rows: `projectAgentOrgHistoryRows({ run, context, isTeamExpanded, isTaskTeamExpanded })` | Reuse |
| E-15 | `composables/useRunListDisclosure.ts:33-156` | Expansion keyed by run identity; defaults: a run's delegated work shown, teams and members folded, Org runs folded (`:67`); reveals the open run (opens the fold) | Reuse one instance for the phone; the Org default differs from the spec (Org unfolded): a construction option |
| E-16 | `composables/useWorkspaceHistorySelectionActions.ts:51-151`; `stores/runHistorySelectionActions.ts:114-139`; `composables/useWorkspaceHistorySubjectActions.ts:14-79` | The desktop open actions: Agent `selectTreeRun`; Team `openTeam` (focused or first member, then `selectionStore.selectRun(team,'team')` with shell navigation); member `selectTreeRun`; Org `openForInspection` + `select` + `router.push('/workspace', {rootSubjectKind:'agent_org', orgRunId, mode,…})`. The stores already take `selectionMode: 'mobile'` (`runHistoryLoadActions.ts:49-53`, `runHistoryTeamMemberInspectionActions.ts:90`), but `selectTreeRunFromHistory`'s local-run branch always calls `selectRun` (shell navigation, `:129`), and the two composables always navigate the desktop shell | Give both composables the existing mobile selection mode; fix the local-run branch to honor it |
| E-17 | `stores/activeContextStore.ts:72-150`; `composables/agentInput/useComposerTarget.ts:55-60` | The open conversation of every kind, and the composer's target, come from `activeWorkspaceTarget`: Org when `route.query.rootSubjectKind === 'agent_org'` (any path), else the selected agent (or its selected task child) or the selected team's focused member | The phone renders `activeWorkspaceTarget`; it keeps the open Org in `/mobile`'s own query |
| E-18 | `components/workspace/agent/AgentWorkspaceSurface.vue:29-109`; `components/workspace/team/TeamWorkspaceSurface.vue:30-87` | Both desktop surfaces bind `AgentEventMonitor` from the target with the same pieces: display name, read-only rule, sender names from `collaborationMessages`, `useRemoteRunView` (notice, placeholder, retry) | The phone needs the same binding; extract it once (Principle 11) |
| E-19 | `composables/agentCollaboration/useAgentRunCollaborationSync.ts:15-33`, mounted only in `components/workspace/agent/AgentWorkspaceView.vue:47` | The selected standalone run's live collaboration stream is attached by this composable | The phone's run screen mounts it too |
| E-20 | `stores/agentContextsStore.ts:160-173` | Promoting `temp-*` to the permanent id moves the selection (`selectRunWithoutShellNavigation`) | A screen that reads the selection follows the new id; the old `MobileChat` compared a stored copy of the id (`MobileChat.vue:73-77`), the cause of Product finding 1 |
| E-21 | `composables/useEventMonitorFilePreview.ts:40-96` | On the phone, a file path tapped in a conversation is resolved through `mobileWorkStore.currentContext` and opened through `mobileWorkStore.requestFilePreview` | Rebind it to the open target and the phone's navigation owner |
| E-22 | `stores/remoteCollaborationStore.ts:25-35`; `stores/remoteCollaborationOffersStore.ts:17-60` | Peers: `load()` → `peers`; per peer `ask(nodeId)` → `available` (entries) or `unavailable` (refusal code) | Reuse for the connection sheet |
| E-23 | `composables/mobile/*`, `components/mobile/*`, `stores/mobileWorkStore.ts`, `types/mobileWork.ts` (consumer map by `grep`) | The mobile shell's own model (`MobileWorkContext`: agent-run, team-run, agent-definition, team-definition, workspace) feeds Home, Switch work, tabs, Files, Artifacts, Activity, Messages, run setup, pending team attachments; `mobileWorkStore` has no local storage | The model and its owners become unnecessary when the views read the open target; no stored data |
| E-24 | `composables/mobile/useMobileRunSetupController.ts` (455 lines, 78 lines naming team), `useMobileRunLaunchCoordinator.ts:14-160` | New run supports agent and team, with team member focus and pending team attachments | Agent only (DEC-007): the team branches become dead |
| E-25 | Measured: `python3 -I /tmp/sd277-probe/probe.py http://127.0.0.1:29695/graphql …` (read-only, the user's running node "AutoByteus Desktop"; sizes and counts only, no content kept) | `listWorkspaceRunHistory`: 36,463 bytes for 7 folders, 7 agent runs, 6 team runs; window 5, 6 or `null` give the same result; 0.03–0.05 s locally. `listCollaborationRootHistory`: 917 bytes, 6 roots | R-001: the complete window is small for his real history. A 5 s poll is ~26 MB/hour while the list is shown, so the phone polls only while the list is on screen and the page is visible |
| E-26 | `/tmp/sd277-probe/list.graphql` fields; server `grep` for approval events | History items carry `status`, `statusSource` and `isActive` only. A pending tool approval is a stream event of a live run | Confirms U-003: no source for a "needs you" marker; the user dropped the marker (DEC-005) |
| E-27 | `stores/mobileNodeSessionStore.ts`; `MobileRemoteAccessShell.vue:150-163` | A 401 on the catalog read rejects the local session (`rejectLocalSessionForAuthFailure`) | Keep that rule on the new history read |

| E-28 | ARCH-REV-001 MP-001: `agentSelectionStore.ts:48-53`, `agentRunOpenCoordinator.ts:114-118` | The selection keeps the previous run until a new open commits; an open of an unloaded run or a Team reads over the network | The run screen's opening state must come from a pending-open owner, not from the target (SR-004) |
| E-29 | ARCH-REV-001 MP-002 | No case found where the selection survives but the target is gone | The re-open is removed (SR-004) |
| E-30 | ARCH-REV-001 MP-003: `activeContextStore.ts:73-76`, `RunListPanel.vue:149-155`, `useWorkspaceHistorySubjectActions.ts:68-70` | The Org target and the Org's selected state come only from the route query; Back to an entry without the Org keys loses them | The Org keys go on the list entry too (SR-004) |
| E-31 | `app.vue:12`; `localization/messages/en/workspace.ts:40-42` | The toast container renders on every page, `/mobile` included; the Team stream-recovery copy exists | The phone reuses the desktop's toast; no new copy (SR-004) |
| E-32 | `useWorkspaceHistorySelectionActions.ts:131-150`; callers via `grep` | `onCreateRun` is used only by `WorkspaceAgentRunsTreePanel.vue:256` and fixtures; it needs `startPresetChat` | It moves to its only caller, so the phone passes no unused parameter (SR-004) |

- Temporary diagnostics: none in the product. The probe script `/tmp/sd277-probe/probe.py` is outside the repository; it only reads and is not part of the package.

## Requirement Implications

- The delegation tree can and should come from the desktop's owners (runList projection, collaboration store, remote runs store): no new server work for points 1 and 2 or for remote delegated runs.
- Mobile's own flat list and own Chat target selection are the causes; they are this ticket's code (the mobile shell), not prerequisites.
- Starting work directly on a peer has no API; it is a scope decision for the user.

## Notes For Architecture Design

- Map SCN-001…SCN-006 onto: `runListStore` (rows and fold), `agentRunCollaborationStore` (delegated rows, selection), `activeContextStore.activeWorkspaceTarget` (what Chat shows), `remoteRunsStore` (node chip, reachability), `mobileWorkStore` (mobile navigation only).
- Read window on the phone: measure.
- Keep `AgentEventMonitor` and the composer shared with desktop.
