# Design Spec — mobile-experience-redesign (autobyteus-277)

## Solution And Approval Basis

- Current solution revision ID: `SR-003`.
- Approved requirements baseline: `requirements-doc.md` at SR-003. SR-003 is SR-002 with AC-006's wording refined and the optional "needs you" marker (REQ-010, DEC-005) removed at the user's request after his approval.
  - The user approved the mobile UI/UX on 2026-11-06: "okayyy. everything is good now. i approve".
  - The Solution Designer integrated the approved design within that direction (requirements-doc Document Status).
- Behavior-defining supplement: the Product UI/UX spec and VIS-001…029.
  - Spec: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md`.
  - Design branch `design/mobile-experience-redesign` @ `976457a418d6355296c8a366bf403c865ee0646c`.
  - It is normative for layout, copy, states and behavior. Its "Implementation Fidelity Boundary" applies: the reference's stores, fixtures and component split are not a prescription.
- User approval of the design: `Not required`. The Task asks the user to approve the UI, which he did; the technical design needs no separate approval.
- Design status: `Ready`.
- Canonical investigation notes: [investigation-notes.md](investigation-notes.md). Architecture evidence is E-10…E-27.
- Authorities read (2026-11-06):
  - `references/architecture-design.md` and `references/design-principles.md`;
  - the project's `DESIGN.md` at the repository root (rules 1–12, project documents);
  - `docs/design-cases.md`: case titles, with Cases 1, 3, 4, 6 and 13 applied below;
  - `GLOSSARY.md`: the phone, delegated run and remote terms;
  - `TESTING.md`: test layers, path choice, browser probes;
  - `autobyteus-web/AGENTS.md`;
  - the autobyteus-385 and autobyteus-278 design specs (read-only).
  - `references/design-examples.md` was not used.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

The `/mobile` page renders `MobileRemoteAccessShell`. It switches between pairing, Home, a work shell with five tabs and Troubleshooting, plus a "Switch work" sheet.

**The phone's own model.** The phone keeps its own model of what is open: `MobileWorkContext`, held in `mobileWorkStore` (E-23).
- `useMobileWorkCatalog` builds its own flat run list from `runHistoryStore.workspaceGroups`: no delegated rows, no Org runs, window 5 per agent (E-01, E-02).
- `MobileChat` decides itself which conversation to show by comparing its stored run id with the selection (E-03, E-20).
- The views (Files, Artifacts, Activity, Messages) each re-derive the open run from `MobileWorkContext` through `useMobileFocusedRunIdentity`.

**The desktop's owners.** The desktop already has one owner for each thing the phone needs:
- the run list and fold: `runListStore` (E-11);
- delegated rows, local and remote: `agentRunCollaborationStore` (E-12), team execution rows (E-13), Org rows (E-14);
- disclosure: `useRunListDisclosure` (E-15);
- open actions (E-16);
- what conversation is shown, and what the composer sends to: `activeContextStore.activeWorkspaceTarget` (E-17);
- the target's conversation binding (E-18).

**The cause of today's problems.**
- The phone built a second, parallel model instead of using these owners. That second model never learned delegation, Org runs or remote runs.
- It also stored a copy of the run id that goes stale when a new run gets its permanent id (E-20).

**Constraints.**
- The phone talks only to its paired node.
- The desktop stays unchanged.
- Standard web APIs only.
- No Android or iOS changes.

## Task Size And Architectural Risk (Mandatory)

- **Task size: `Large`.**
  - The phone shell is rebuilt: about 15 phone components and composables are added or rewritten, and about 20 phone files are removed.
  - Seven shared desktop owners get a narrow extension or extraction: history load, conversation binding, collaboration row rules, selection and subject actions, the selection store action, and disclosure.
  - The file preview composable is rebound.
  - It spans the phone shell, shared stores and composables, and two desktop surfaces.
- **Architectural risk: `High`.**
  - Ownership boundaries move: the phone drops its own model for the shared target and selection owners, and the phone's navigation state moves into the `/mobile` route.
  - Shared owners that the desktop uses are changed (blast radius: the desktop Runs view, chat surfaces and Org opening).
  - A history poll runs on a phone.
  - No server, persistence, security or contract change.
- **Escalation trigger.** Return a Design Impact if implementation finds any of the following:
  - a desktop behavior change in the extracted owners (the surfaces' read-only rule, the history poll, Org opening);
  - an open action that cannot run without shell navigation;
  - a phone screen needing a server change;
  - the Back-key history interfering with Nuxt's router state on Android WebView or iOS WKWebView.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| E-10 | `WorkspaceAgentRunsTreePanel.vue:118-120, 380-409` | Desktop history load + 5 s poll in the host | DS-001: one shared load owner | — |
| E-11 | `stores/runListStore.ts`, `utils/runListProjection.ts` | Runs, order, fold | Reuse for REQ-001 | — |
| E-12 | `AgentRunTaskRows.vue:58-104`; `agentRunCollaborationStore.ts` | Task rows; two component-local rules | Move both rules into the store | — |
| E-13, E-14 | `WorkspaceTeamExecutionTree.vue`; `utils/agentOrgHistoryRows.ts:210` | Team and Org rows | Reuse | — |
| E-15 | `composables/useRunListDisclosure.ts:67` | Org runs folded by default | Construction option | — |
| E-16 | `useWorkspaceHistorySelectionActions.ts`, `useWorkspaceHistorySubjectActions.ts`, `runHistorySelectionActions.ts:129` | Desktop shell navigation hard-wired; stores already take `selectionMode: 'mobile'` | `shell` option; local-run branch honors the mode | — |
| E-17 | `activeContextStore.ts:72-150`; `useComposerTarget.ts:55-60` | One target for conversation and composer; Org from the route query on any path | The phone renders the target; Org keys in `/mobile`'s query | — |
| E-18 | `AgentWorkspaceSurface.vue`, `TeamWorkspaceSurface.vue` | Same conversation binding twice | Extract `useTargetConversation` | Unified read-only rule: verify per kind (Guidance) |
| E-19 | `useAgentRunCollaborationSync.ts`; `AgentWorkspaceView.vue:47` | Live collaboration stream attached by the view | The run screen mounts it | — |
| E-20 | `agentContextsStore.ts:160-173` | Selection follows the permanent id | The run screen reads the selection, not a copy | — |
| E-21 | `useEventMonitorFilePreview.ts:40-96` | Phone path goes through `mobileWorkStore` | Rebind to the target and navigation | — |
| E-22 | `remoteCollaborationStore.ts`, `remoteCollaborationOffersStore.ts` | Peers and offers | Reuse in the connection sheet | Offer read takes up to ~20 s per peer |
| E-23, E-24 | mobile consumer map; run setup controller | Phone model and team launch | Removal plan | — |
| E-25 | Measured on the user's node | 36 KB for his complete history; window has no effect at his size | `null` window on the phone; poll only while the list is visible | Cellular cost grows with history (Risks) |
| E-26 | History fields; server events | No pending-approval state on history | Confirms the user's drop of the marker (DEC-005) | — |
| E-27 | `MobileRemoteAccessShell.vue:150-163` | 401 rejects the session | Kept on the new read | — |

## Intended Change

Rebuild the `/mobile` shell as the approved design: one run list, a slim run screen with a ⋮ menu, view screens, an agent-only New run, and a connection sheet.

The rebuilt shell does not keep its own model. It reads the desktop's owners:
- `runListStore` with the shared disclosure;
- the collaboration, team and Org row sources;
- the shared open actions in their existing mobile selection mode;
- `activeWorkspaceTarget` for what is open.

The phone's screen state lives in `/mobile`'s route query, so the system Back key walks the screens. The phone's own model, catalog, tabs and team launch are removed.

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-006, which cover these areas:
  - the `/mobile` shell (`autobyteus-web/components/mobile/**`, `composables/mobile/**`, `pages/mobile.vue` unchanged);
  - the removal of `stores/mobileWorkStore.ts` and `types/mobileWork.ts`.
  - It also makes narrow shared changes:
    - `useRunHistorySectionLoad` (new; the desktop host adopts it);
    - `useTargetConversation` (new; both desktop surfaces adopt it);
    - `agentRunCollaborationStore` (`ensureStoredView`, `selectTaskRow`; `AgentRunTaskRows` adopts them);
    - `useWorkspaceHistorySelectionActions` and `useWorkspaceHistorySubjectActions` (`shell` option);
    - `runHistorySelectionActions.selectTreeRunFromHistory` (local-run branch honors `selectionMode`);
    - `useRunListDisclosure` (Org default option);
    - `useEventMonitorFilePreview` (phone branch).
  - Docs: `autobyteus-web/docs/remote_access.md` (phone section).
- **Derived consumers.** These shared structures change; every consumer is listed with its decision (Principle 11):
  - `mobileWorkStore` and `MobileWorkContext` are removed. Every consumer in E-23 is removed or rebound; `useEventMonitorFilePreview` is rebound (E-21).
  - `useWorkspaceHistorySelectionActions` gains an option whose default is unchanged. Its desktop callers are `RunListPanel.vue:200` and the Workspaces/Projects tree hosts that call it (implementation lists them with `grep`); they keep the default.
  - `useWorkspaceHistorySubjectActions` gains an option whose default is unchanged. Desktop callers keep the default.
  - `useRunListDisclosure` gains an option whose default is unchanged.
  - `selectTreeRunFromHistory`'s local branch: in desktop mode the behavior is unchanged.
- **Deliberately left alone:**
  - the desktop's visible behavior;
  - the server, the Android and iOS shells;
  - pairing (`MobilePairingBootstrap`, the session store, client data migrations);
  - the shared composer (no compact composer);
  - `AgentEventMonitor`;
  - the Team messages screen's loading and unavailable states (autobyteus-358);
  - mobile localization (phone copy stays English literals as today; the phone is not in `localization/audit/migrationScopes.ts`);
  - `mobileFeatureGates.ts` beyond the notice text.
- **Follow-ups:** FU-001 (autobyteus-391).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002; AC-001, AC-002 | Open the app (paired) | Flat list (E-01) | The desktop runs with their tree | DS-001, DS-002 |
| BEH-002 | User | REQ-003; AC-003 | Tap a row | Own agent only (E-03) | Any agent's conversation; a Team run opens its coordinator; an Org run opens its first member | DS-003, DS-009 |
| BEH-003 | User | REQ-005, REQ-007, REQ-009; AC-005, AC-007, AC-009 | ← / Back / ⋮ | Home, tabs, Switch sheet | Route-driven screens | DS-004, DS-005, DS-008 |
| BEH-004 | User | REQ-006; AC-006 | "+" | Agent or Team setup | Agent only; rows and sheets | DS-006 |
| BEH-005 | System | REQ-004; AC-004 | A run delegated to a peer | Invisible | Rows and conversation through 278's data | DS-002, DS-003, DS-009 |
| BEH-006 | User | REQ-008; AC-008 | Node name | Home card, Troubleshoot | Connection sheet with read-only peers | DS-007 |
| BEH-007 | User | REQ-009 | — | No row actions | No row actions | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…029 (path above) | Normative UI | REQ-001…REQ-009 | Every screen, state and copy below follows it | Approved by the user |
| Product `ui-reference-runbook.md` (design worktree root) | Runnable reference | AC-005 | Visual comparison | — |
| [follow-ups.md](follow-ups.md) | FU-001 | DEC-003 | Out of this change | Recorded |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Larger Requirement` (feature, behavior change, and the bug fix of the invisible delegated runs).
- **Current design issue found:** `Yes`.
- **Structural triggers that fire, with evidence:**
  - *Repeated coordination* (Principle 13):
    - the history load and poll would exist twice (E-10);
    - the target's conversation binding exists twice and would become three (E-18);
    - the task-row load and select rules live in a component (E-12) the phone would copy.
  - *Authoritative boundary / boundary or ownership* (Principle 3): the phone's `MobileWorkContext` is a second owner of "what is open" beside `activeWorkspaceTarget` (E-17, E-20, E-23).
  - *Derived data* (Principle 11): the phone recomputed the run list (E-01) that `runListStore` owns.
  - *Legacy cleanup* (Principle 8): the phone's catalog, tabs, Home, Switch sheet, member focus bar and team launch become unnecessary.
  - *Several kinds* (Principle 1): rows and open actions serve Agent, Team, Org, task agent, task team, member, and remote of each. Each is traced in DS-003's table.
  - *Split sequence* (Principle 13): the subject action's navigation destination differs by shell. It is resolved by a construction option, so the composable still calls the router itself; no function is passed in.
  - *Behavior by absence*: avoided. The run screen's "Opening…" state is an explicit state of the screen owner (DS-003), not "no target, so …".
- **Root cause classification:** `Boundary Or Ownership Issue`, with `Duplicated Policy Or Coordination`.
- **Refactor needed now:** `Yes`.
- **Evidence:** E-01, E-03, E-10, E-12, E-17, E-18, E-20, E-23.
- **Design response:**
  - remove the phone's model;
  - read the shared owners;
  - extract the three shared rules named above into their owners;
  - give the two open-action composables the existing mobile selection mode.
- **Refactor rationale:**
  - Extending the phone's own list with delegation, Org and remote rows would repeat 278's and 385's work and drift again.
  - Copying the binding or the rules into phone files would make three owners of one rule.
- **Intentional deferrals and residual risk:** switching nodes (FU-001).

## Terminology

The domain words are in `GLOSSARY.md`: run, delegated run, task agent, task team, remote, peer, paired node, the phone. This change adds no domain word. Screen words used below:

- **Run list:** the phone's main screen (UIS-001).
- **Run screen:** one agent's conversation (UIS-002).
- **View screen:** Artifacts, Files, Messages, Activity.
- **Connection sheet:** UIS-010.
- **Tree row:** one row of the run list, top-level or nested.
- **Open target:** `activeContextStore.activeWorkspaceTarget`.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: the whole phone model and its screens (Removal Plan).
- Compatibility wrappers, dual paths or fallbacks kept: `None`. The old tabs, Home and Switch sheet are removed, not hidden.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: none on the server. On the phone, `mobileWorkStore` holds memory only (E-23, no local storage). The pairing session (`autobyteus.remote_access.mobile_session`) is unchanged.
- **Decision: `Not Affected`.** Navigation state moves into the URL query of the open page (memory and browser history only).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | The phone shell mounts (paired), or the poll ticks | The run list shows the runs | `useRunHistorySectionLoad` → `runHistoryStore` → `runListStore` | Same runs as the desktop |
| DS-002 | Primary End-to-End | BEH-001, BEH-005 | Run list entries or row sources change | Flat tree rows with depth, state and node | `useMobileRunTree` with `buildMobileRunTreeRows` | Delegated work, members, remote |
| DS-003 | Primary End-to-End | BEH-002, BEH-005 | Tap a tree row | The run screen shows that agent and its composer sends to it | `useMobileRunOpening` → the shared open action → selection or Org query → `activeWorkspaceTarget` | Talk to any agent |
| DS-004 | Bounded Local | BEH-003 | ←, system Back, ⋮ item, "+" | The screen for the route query | `useMobileNavigation` | One-hand navigation; Back walks screens |
| DS-005 | Primary End-to-End | BEH-003 | ⋮ → a view | The view for the open target | the view's component reading the open target | Results of that agent |
| DS-006 | Primary End-to-End | BEH-004 | "+" → Create run | A new agent run, its run screen open, first message sent | `useMobileRunSetupController` → `useMobileRunLaunchCoordinator` → `agentContextsStore` | Start work |
| DS-007 | Primary End-to-End | BEH-006 | Node name | Connection sheet with status and peers | `MobileConnectionSheet` with the session, peers and offers stores | Option A |
| DS-008 | Primary End-to-End | BEH-003 | Tap a file path in a conversation | The file open full screen | `useEventMonitorFilePreview` → `useMobileNavigation.openFile` | Read results |
| DS-009 | Return-Event | BEH-001, BEH-002, BEH-005 | Stream events (agent, team, collaboration, Org, remote) and promotion of a temp id | Rows and run screen re-render | the existing stream owners and `agentContextsStore` | Live states; id change |

## Primary Execution Spine(s)

- **DS-001.** `MobileRemoteAccessShell (paired) → useRunHistorySectionLoad({ window: null, polling: list shown ∧ page visible }) → runHistoryStore.fetchTree / refreshTreeQuietly (every 5 s) → GraphQL listWorkspaceRunHistory(limitPerAgent: null) + listCollaborationRootHistory → runListStore.entries → MobileRunList`.
- **DS-002.** `runListStore.shownEntries → useMobileRunTree`. For each entry:
  - Agent: `collaboration.ensureStoredView(runId, hasCollaboration)` and `collaboration.taskRows(runId)`;
  - Team: `team.executionRows`;
  - Org: `projectAgentOrgHistoryRows(run, orgContext, …)`.
  - Then `→ buildMobileRunTreeRows(entries, sources, disclosure, remoteRuns) → MobileRunRow[]`.
- **DS-003.** `MobileRunRow tap → useMobileRunOpening.open(row) → [kind's shared action, mobile shell] → selection store (agent / team) or /mobile Org query → useMobileNavigation.openRun() (push screen=run) → MobileRunScreen → activeWorkspaceTarget → useTargetConversation(target) → AgentEventMonitor + composer (useComposerTarget) → send through target.interaction`.
- **DS-005.** `⋮ item → useMobileNavigation.openView(view) → view screen → reads activeWorkspaceTarget (runId, browse, workspaceRootPath, collaborationMessages) → existing data owners (artifacts, file explorer, participant messages, agentActivityStore)`.
- **DS-006.** `"+" → openNewRun() → MobileNewRun → useMobileRunSetupController (agent, folder, runtime, model, auto approve) → Create run → useMobileRunLaunchCoordinator.createAgentRun → agentContextsStore.createRunFromTemplate({ selectionMode: 'mobile' }) → useMobileNavigation.openRun({ replace: true }) → first message in the composer → agentRunStore → promoteTemporaryId → selection follows (DS-009)`.
- **DS-007.** `list bar node button → MobileConnectionSheet → mobileNodeSessionStore (status, URL, fetchStatus, unpair) + remoteCollaborationStore.load() → remoteCollaborationOffersStore.ask(nodeId) per peer → rows`.
- **DS-008.** `AgentEventMonitor file link → useEventMonitorFilePreview (phone branch) → locator from activeWorkspaceTarget.workspaceRootPath → useMobileNavigation.openFile({ workspaceId, path }) → Files screen with the file open`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When the paired shell mounts, the shared load composable sets the complete window, loads history, the folder catalog and definitions, and polls every 5 s while the list is on screen and the page is visible. The run list reads `runListStore`. A read that fails with 401 rejects the session, as today (E-27) | history, run list | `useRunHistorySectionLoad` | visibility (`document.visibilityState`), auth failure |
| DS-002 | Each shown entry contributes its delegated rows from the owner of its kind. The phone projection flattens them into rows with depth, state, title, node chip and folding, using one shared disclosure instance (Org runs unfolded). The open row is the row whose agent is the open target's | tree row | `useMobileRunTree` | stored-view loading, remote reachability |
| DS-003 | A tap is dispatched by row kind to the desktop's own open action in mobile mode. Agent and Team open through the selection store; an Org through its context and `/mobile`'s Org query. Then the run screen is pushed. The run screen renders whatever the open target is, so a promoted id, a delegated child or a remote child all just work. While the target is not there yet it shows "Opening…" and re-opens once | open target | `useMobileRunOpening`, `MobileRunScreen` | remote notice (278), collaboration stream sync |
| DS-004 | The route query is the phone's screen state. Every forward move is a router push; ← is `router.back()`. A query naming a screen whose subject is gone (a reload) is replaced by the list | screen | `useMobileNavigation` | — |
| DS-005 | View screens read the open target; Messages appears only for member kinds | view | the view component | remote "on that node" wording |
| DS-006 | New run preselects the agent of the open target, else the Project Task Manager, else the first agent; folder, runtime and model use the existing workspaces and config owners; Create run launches through the existing coordinator, agent only | agent run | `useMobileRunSetupController` | folder by path (`useMobileLaunchWorkspaces`) |
| DS-007 | The sheet reads the session status and the peers; offers are asked per peer when the sheet opens | node, peer | `MobileConnectionSheet` | unpair confirm |
| DS-008 | A file link in a conversation becomes a pushed Files screen with the file open | file | `useEventMonitorFilePreview` | — |
| DS-009 | Streams update contexts; rows and the run screen are computed from them; a promoted id moves the selection | — | existing owners | — |

## Spine Actors / Main-Line Nodes

- `useRunHistorySectionLoad`
- `runHistoryStore`
- `runListStore`
- `useMobileRunTree`
- `useMobileRunOpening`
- the shared open actions
- `activeContextStore.activeWorkspaceTarget`
- `useMobileNavigation`
- `MobileRunScreen`
- `useTargetConversation`
- `useMobileRunSetupController`
- `useMobileRunLaunchCoordinator`
- `MobileConnectionSheet`

## Ownership Map

- **`useRunHistorySectionLoad`** (new, shared). Owns:
  - the history load sequence: window, `fetchTree`, `loadWorkspaceCatalogForNavigation`, agent/team/Org definition fetches;
  - the 5 s poll's lifetime: start, stop, and pause while `polling` is false;
  - re-reading when the window changes.
  - It owns no view state. The desktop host passes the window from its view mode and `polling: true`.
- **`runListStore`** (existing). Owns which runs, their order and the fold; unchanged.
- **`useMobileRunTree`** (new, phone). Owns:
  - the phone's row list: entries + per-kind child rows + disclosure → rows;
  - asking the collaboration store for stored views of listed Agent runs;
  - which row is open: the open target's agent run id.
  - The pure transformation lives in `buildMobileRunTreeRows`.
- **`useMobileRunOpening`** (new, phone). Owns the dispatch from a row kind to the shared action and then `openRun()`. It owns no open rule of its own; the rules stay in the shared actions.
- **`useMobileNavigation`** (new, phone). Owns the phone's screen state in the route query:
  - keys `screen`, `file`/`workspace`, `reference`/`message`;
  - push, back and replace;
  - the list fallback for a screen without its subject.
  - It never writes the Org keys; the subject actions write those.
- **`MobileRunScreen`** (new, phone). Owns:
  - the run screen's states (opening, open);
  - its one re-open attempt;
  - the ⋮ menu items (Messages only for member kinds);
  - mounting `useAgentRunCollaborationSync`.
- **`useTargetConversation`** (new, shared). Owns the binding of a target to `AgentEventMonitor`:
  - the display name;
  - the read-only rule;
  - sender names;
  - `useRemoteRunView`.
- **`agentRunCollaborationStore`** (existing). Additionally owns:
  - `ensureStoredView(runId, hasCollaboration)`: inspect once when it has collaboration and is not loaded;
  - `selectTaskRow(hostRunId, row)`: a task agent row selects its agent; a task team row selects its coordinator. It returns whether a child was selected.
- **`useMobileRunSetupController` / `useMobileRunLaunchCoordinator`** (existing, reduced). Own agent run setup and creation only.
- **`MobileConnectionSheet`** (new, phone). Owns:
  - the sheet's presentation of the session status and diagnostic;
  - Check connection;
  - the peers list (read-only);
  - asking offers on open;
  - Unpair (through the existing confirm and session store).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/mobile.vue` | `MobileRemoteAccessShell` | Route entry, head tags | Any state |
| `useMobileRunOpening` | The shared open actions | Phone rows carry several kinds | Its own open rules (team target member, Org selection, child selection) |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `components/mobile/MobileHome.vue`, `MobileWorkShell.vue`, `MobileContextSwitcher.vue`, `MobileRuns.vue`, `MobileReadableWorkRow.vue` | Home, tabs, Switch sheet and the Runs tab are gone (spec "Removed") | `MobileRunList`, `MobileRunRow`, `MobileRunScreen` | — |
| `MobileTeamMemberFocusBar.vue`, `composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Members are tree rows | `useMobileRunTree`, the shared member open | — |
| `MobileTroubleshooting.vue` | The Troubleshoot page is gone | `MobileConnectionSheet` (diagnostic text) | — |
| `MobileActivity.vue`, `MobileActivityDigest.vue` | The combined Activity screen is gone | Messages and Activity view screens | — |
| `MobileChat.vue` | The run screen renders the open target | `MobileRunScreen` | Cause of Product finding 1 (E-20) |
| `MobileComposerContextTray.vue`, `composables/mobile/useMobileFileContextCoordinator.ts` | The shared composer shows attachments; Files' Attach is removed | The shared composer | Verify no other consumer with `grep` |
| `composables/mobile/useMobilePendingTeamRunAttachments.ts`, the team branches of `useMobileRunSetupController.ts` and `useMobileRunLaunchCoordinator.ts`, `MobileRunSetupTeamWorkspacePath.spec.ts`, `MobileRunSetupMemberSeeding.spec.ts` (team parts) | New run is agent only (DEC-007) | Agent paths | Dead once team launch goes |
| `composables/mobile/useMobileWorkCatalog.ts`, `useMobileFocusedRunIdentity.ts` | The run list and the open target come from the shared owners | `runListStore`, `activeWorkspaceTarget` | The 401 helper moves to `utils/remoteAccess/` (E-27) |
| `stores/mobileWorkStore.ts`, `types/mobileWork.ts`; `types/mobileLaunch.ts` if only the removed code reads it | The phone model is gone; navigation lives in the route | `useMobileNavigation` | — |
| `MobileLaunchRunOptionsCard.vue`, `MobileLaunchRuntimeModelCard.vue`, `MobileLaunchTargetPicker.vue`, `MobileLaunchWorkspacePicker.vue` | Replaced by the five uniform rows and one sheet | `MobileRunSetup` rows, `MobileChoiceSheet` | Keep only if the implementer reshapes one in place under the new name |
| The Files filter chips and the Attach button | Not on the phone (DEC-004) | — | — |
| `unsupportedFeatureMessages` text for `desktopWorkspace` | New copy | Spec's notice text | — |
| Tests of removed code: `useMobileWorkCatalog.spec.ts`, `useMobileFocusedRunIdentity.spec.ts`, `useMobileFileContextCoordinator.spec.ts`, `mobileWorkStore.spec.ts`, `MobileContextSelectionRegression.spec.ts`, `MobileUxRefinement.spec.ts`, and the parts of `MobileRemoteAccessShell.spec.ts`, `MobileFiles.spec.ts`, `MobileTeamMessages.spec.ts`, `MobileArtifacts.spec.ts` that assert removed UI | Dead: they test removed code (DESIGN.md rule 11) | New tests (Guidance) | — |

## Return Or Event Spine(s) (If Applicable)

DS-009 uses the existing stream owners: agent run stream, team stream, collaboration streaming service (`useAgentRunCollaborationSync` on the run screen), Org contexts, and the remote runs store.
- Rows and the run screen are computed from them, with no copies.
- `promoteTemporaryId` moves the selection (E-20). The run screen and the open row follow because they read the selection.
- A delegated child whose Task closes leaves its rows. If it was open, `returnToHostWhenUnlisted` returns the target to the host, as on the desktop.

## Bounded Local / Internal Spines (If Applicable)

- **Phone screen state** (parent `useMobileNavigation`): `route.query → screen`.
  - Possible screens: list (no `screen`), `run`, `artifacts`, `files` (with optional `file` + `workspace`), `messages` (with optional `reference` + `message`), `activity`, `new`.
  - Forward moves push. ← and the system Back key are `router.back()`.
  - On entry, a screen whose subject is missing (no open target for `run` and the views, no paired session) is replaced by the list.
  - It matters because the system Back key must walk file → view → run → list (AC-005), and a reload must not show an empty screen.
- **Run screen** (parent `MobileRunScreen`): `opening` (target absent, or its conversation not attached) → `open`.
  - On entering `opening` with a selection but no target, it calls the shared re-open once for the selected run (`useMobileRunOpening.reopenSelected()`).
  - With no selection and no Org query, it replaces to the list.
  - "Opening…" is the only content while opening (Product finding 2).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spines | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Page visibility for the poll | DS-001 | `useRunHistorySectionLoad` (through the phone's `polling` input) | Pause polling when hidden | Battery and data on a phone (E-25) | Polling in the background |
| Auth failure on read | DS-001 | `MobileRemoteAccessShell` status check | 401 → `rejectLocalSessionForAuthFailure` | E-27 | Stale session |
| Remote run view | DS-003 | `useTargetConversation` | Notice, placeholder, retry (278) | Unreachable nodes | Divergent remote behavior |
| Collaboration stream sync | DS-003, DS-009 | `MobileRunScreen` | Live child states while open | E-19 | Stale children |
| Relative ages | DS-002 | `MobileRunList` | Minute tick, `runHistoryStore.formatRelativeTime` | Ages "6m" | — |
| Peer offers | DS-007 | `MobileConnectionSheet` | Ask on open, show counts or not reachable | Option A | Slow sheet if awaited serially (ask in parallel; rows render immediately) |

## Ownership Boundaries

- **Shared owners** (the history store, run list store, collaboration store, open actions, target resolver) are the authority for data and open rules. Phone files call their public APIs only.
- **The phone** owns presentation, its screen state (route) and its row flattening.
- **The desktop** owns its shell navigation. The shared open composables reach the phone's route only through their `shell: 'mobile'` construction option. The destination path and query are given by `useMobileNavigation`'s exported `mobileRunScreenLocation`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `activeContextStore.activeWorkspaceTarget` | selection store, collaboration child targets, team view, Org contexts | `MobileRunScreen`, view screens, `useEventMonitorFilePreview` | Reading `agentContextsStore.getRun` / team contexts directly to pick what is open (the old `MobileChat`) | Extend the target |
| `agentRunCollaborationStore` | streaming service, member loader, context index | `useMobileRunTree`, `AgentRunTaskRows` | Calling `inspect` / `selectChild` with a component-local rule | `ensureStoredView`, `selectTaskRow` |
| Shared open actions | `runHistoryStore.selectTreeRun`, team stream reopen, Org contexts | `useMobileRunOpening`, desktop panels | The phone calling `runHistoryStore.openTeamMemberRun` or `orgContexts.select` itself | Options on the actions |
| `useMobileNavigation` | `vue-router` | phone components | Phone components calling `router.push` or `history.pushState` | Add a navigation method |
| `useRunHistorySectionLoad` | `runHistoryStore` load methods, the timer | desktop host, phone shell | A host starting its own poll | Add an input |

## Dependency Rules

- Phone files may depend on shared stores and composables. Shared files never import from `components/mobile` or `composables/mobile`. The one exception is `useEventMonitorFilePreview`, which already branches on the phone runtime and calls `useMobileNavigation` (E-21; it is the existing owner of conversation file links).
- `useWorkspaceHistorySubjectActions` may import `mobileRunScreenLocation` from `composables/mobile/useMobileNavigation.ts` (one constant) for its mobile shell. Rejected alternative: a function argument, because the composable must keep calling the router itself (Principle 13).
- No phone file uses `history.pushState`. All navigation is through `vue-router`, so Nuxt's history state stays consistent (the reference's `pushState` is not a prescription).
- No phone file reads `MobileWorkContext` (removed) or keeps its own copy of a run id.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `useRunHistorySectionLoad({ window, polling })` | Run history load | Load and poll | `window: () => number \| null`, `polling: () => boolean` | Desktop: `historyWindowOf(mode)`, `() => true` |
| `buildMobileRunTreeRows(input)` | Phone tree rows | Pure flattening | Entries plus per-kind sources plus disclosure functions | Returns `MobileRunTreeRow[]` |
| `MobileRunTreeRow` | One row | Presentation data and its open subject | `key`, `depth`, `name`, `title`, `status`, `remote: { nodeName, reachable } \| null`, `hasChildren`, `expanded`, `open: MobileRowOpen` | `open` is discriminated: `{ kind: 'agentRun', run }`, `{ kind: 'taskRow', hostRun, row }`, `{ kind: 'team', team }`, `{ kind: 'teamMember', target: TeamMemberFocusTarget }`, `{ kind: 'orgRun', orgRun }`, `{ kind: 'orgMember', orgRun, address }`, `{ kind: 'orgExecution', orgRun, agentRunId, address }` |
| `useMobileRunOpening().open(row.open)` / `reopenSelected()` | Opening | Dispatch to the shared action, then `openRun()` | `MobileRowOpen` | Agent: `collaboration.selectChild(runId, null)` then `onSelectRun`. Task row: `selectTaskRow` then `onSelectRun(hostRun)`. Team: `onOpenTeamRun`. Member: `onSelectTeamMember`. Org: subject `open` / `select` / `inspect` |
| `useMobileNavigation()` | Screen state | `screen`, `openRun({ replace? })`, `openView(view)`, `openNewRun()`, `openFile({ workspaceId, path })`, `openReference({ messageId, referenceId })`, `back()`, `toList()` | Route query keys | Org keys untouched except by the subject actions; `openRun` for agent/team removes Org keys |
| `useWorkspaceHistorySelectionActions({ …, shell? })` | Agent and Team open | Unchanged rules | `shell: 'desktop' \| 'mobile'` (default `desktop`) | Mobile: `selectionMode: 'mobile'` to store calls; `selectRunWithoutShellNavigation` instead of `selectRun` |
| `useWorkspaceHistorySubjectActions({ shell? })` | Org open/select/inspect/stop | Unchanged rules | as above | Mobile: push `mobileRunScreenLocation` with the Org keys; `clearSelectionWithoutShellNavigation`; stop replaces within `/mobile` |
| `collaboration.ensureStoredView(runId, hasCollaboration)` | A standalone root's stored view | Inspect once | Agent run id | Moved from `AgentRunTaskRows.vue:60-64` |
| `collaboration.selectTaskRow(hostRunId, row)` | A task row | Select its agent or its team's coordinator | Host run id + `RunHistoryTransientExecutionRow` | Moved from `AgentRunTaskRows.vue:95-101` |
| `useTargetConversation(target)` | One target's conversation | `displayName`, `readOnly`, `senderNameByAgentRunId`, `remoteView` | `ActiveAgentWorkspaceTarget` | Used by both desktop surfaces and the run screen |
| `useRunListDisclosure({ …, orgRunsExpandedByDefault? })` | Expansion | As today | Option default `false` | The phone passes `true` |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileRowOpen` | Yes | Yes (discriminated kinds) | Low | — |
| `useMobileNavigation` | Yes | Yes (named methods per screen) | Low | — |
| `selectTaskRow` | Yes | Yes | Low | — |
| `useRunHistorySectionLoad` | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural | Same Meaning Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Phone main screen | Run list (`MobileRunList`) | Yes | Yes ("Your runs" on the desktop is the same list) | Low | — |
| Phone conversation | Run screen (`MobileRunScreen`) | Yes | Yes | Low | — |
| Navigation owner | `useMobileNavigation` | Yes | Yes | Low | Replaces "work" words (`mobileWorkStore`, "Switch work") |
| Open target | `activeWorkspaceTarget` | Existing | Yes | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New, Why Not Existing |
| --- | --- | --- | --- | --- |
| Runs and fold | `runListStore` | Reuse | E-11 | — |
| Delegated rows | Collaboration store, team rows, Org rows | Reuse; extend the collaboration store | E-12…E-14 | — |
| Expansion | `useRunListDisclosure` | Extend (option) | E-15 | — |
| Opening | Selection and subject actions | Extend (option) | E-16 | — |
| What is open | `activeWorkspaceTarget` | Reuse | E-17 | — |
| Conversation binding | Desktop surfaces | Extract `useTargetConversation` | E-18 | — |
| History load and poll | Desktop host | Extract `useRunHistorySectionLoad` | E-10 | — |
| Phone row flattening | — | Create new (`buildMobileRunTreeRows`) | The desktop renders three tree components; the phone renders one list of rows | The desktop components are desktop presentation |
| Screen state | `vue-router` | Reuse through `useMobileNavigation` | Back key | — |
| Peers and offers | Remote collaboration stores | Reuse | E-22 | — |
| Agent setup | `useMobileRunSetupController`, `useMobileLaunchWorkspaces`, launch coordinator | Reuse, reduce | E-24 | — |
| Files, artifacts, activity, messages data | File explorer composable, artifacts, `agentActivityStore`, participant messages | Reuse | Existing phone views | — |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Owners Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web` shared run history | Load and poll, list, disclosure, open actions | DS-001, DS-003 | Desktop and phone | Extend | Defaults unchanged |
| Shared workspace conversation | Target binding | DS-003 | Desktop surfaces, run screen | Extract | — |
| Phone shell (`components/mobile`, `composables/mobile`) | Screens, rows, navigation, setup, connection | All | — | Rewrite | — |

## Draft File Responsibility Mapping

See the final mapping below. The draft was the same, except that `MobileScreenBar` was folded in as one shared phone bar after the extraction check.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why Shared | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Conversation binding | `composables/workspace/useTargetConversation.ts` | Shared workspace | Three users | Yes | Yes | A header component |
| History load and poll | `composables/runHistory/useRunHistorySectionLoad.ts` | Run history | Two hosts | Yes | Yes | A view-mode owner |
| Phone 48/56px bar | `components/mobile/MobileScreenBar.vue` | Phone | Every view screen and New run | Yes | Yes | A navigation owner (it emits `back`) |
| Bottom sheet | `components/mobile/MobileBottomSheet.vue` | Phone | Choice sheets and the connection sheet | Yes | Yes | A list owner |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `MobileRunTreeRow` | Yes | Yes. It carries no run id copies beyond `open` and `key`; the open-row check uses `open`'s agent run id | Low | Do not add a second status field: `status` is the shared status type (`AgentStatus` or team status) |
| `MobileRowOpen` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `composables/runHistory/useRunHistorySectionLoad.ts` (new) | Run history | Load owner | Load and poll | One sequence | — |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` (modify) | Desktop | Host | Uses the load composable | — | Yes |
| `composables/workspace/useTargetConversation.ts` (new) | Workspace | Binding | Name, read-only, senders, remote view | One binding | — |
| `components/workspace/agent/AgentWorkspaceSurface.vue`, `components/workspace/team/TeamWorkspaceSurface.vue` (modify) | Desktop | Surfaces | Use the binding; header unchanged | — | Yes |
| `stores/agentRunCollaborationStore.ts` (modify), `components/workspace/history/AgentRunTaskRows.vue` (modify) | Collaboration | Store | `ensureStoredView`, `selectTaskRow` | — | — |
| `composables/useWorkspaceHistorySelectionActions.ts`, `composables/useWorkspaceHistorySubjectActions.ts`, `stores/runHistorySelectionActions.ts`, `composables/useRunListDisclosure.ts` (modify) | Run history | Open and disclosure | Options and the local-branch mode | — | — |
| `composables/useEventMonitorFilePreview.ts` (modify) | Conversation | File links | Phone branch via target and navigation | — | — |
| `components/mobile/MobileRemoteAccessShell.vue` (rewrite) | Phone | Shell | Pairing, post-pair check, status check and 401 rule, history load, screen switch by `useMobileNavigation`, unsupported notice | The shell | — |
| `composables/mobile/useMobileNavigation.ts` (new) | Phone | Navigation | Route-query screen state; `mobileRunScreenLocation` | — | — |
| `composables/mobile/useMobileRunTree.ts` (new), `utils/mobile/mobileRunTreeProjection.ts` (new) | Phone | Tree | Wiring; pure flattening and row types | Store wiring vs pure function | — |
| `composables/mobile/useMobileRunOpening.ts` (new) | Phone | Opening | Dispatch and re-open | — | — |
| `components/mobile/runList/MobileRunList.vue`, `MobileRunRow.vue` (new) | Phone | List | Screen (bar with node button, banner, notice, tree, fold, "+", states); one row | — | — |
| `components/mobile/runScreen/MobileRunScreen.vue`, `MobileRunMenu.vue` (new) | Phone | Run screen | Bar, opening state, conversation, ⋮ menu | — | `useTargetConversation` |
| `components/mobile/views/MobileArtifacts.vue`, `MobileFiles.vue`, `MobileFileViewer.vue`, `MobileMessages.vue` (from `MobileTeamMessages.vue`), `MobileTeamReferenceViewer.vue`, `MobileActivity.vue` (from `MobileRunActivityList.vue`), `MobileRunActivityItem.vue` (move and rebind) | Phone | Views | One view each, reading the open target | — | `MobileScreenBar` |
| `components/mobile/newRun/MobileNewRun.vue`, `MobileRunSetup.vue`, `MobileChoiceSheet.vue` (new or rewrite); `composables/mobile/useMobileRunSetupController.ts`, `useMobileRunLaunchCoordinator.ts`, `useMobileLaunchWorkspaces.ts` (reduce) | Phone | New run | Rows, sheets, agent setup and creation | — | `MobileBottomSheet` |
| `components/mobile/connection/MobileConnectionSheet.vue` (new); `MobileUnpairConfirm.vue` (keep, move) | Phone | Connection | Sheet; confirm | — | `MobileBottomSheet` |
| `components/mobile/MobileScreenBar.vue`, `MobileBottomSheet.vue` (new) | Phone | Shared phone presentation | Bar; sheet | — | — |
| `components/mobile/MobilePairingBootstrap.vue`, `MobileUnsupportedFeatureNotice.vue` (keep) | Phone | Pairing | Unchanged | — | — |
| `utils/remoteAccess/remoteAccessAuthFailure.ts` (new, from the catalog's `isAuthFailureCause`) | Remote access | Session | 401 recognition | — | — |
| `docs/remote_access.md` (modify) | Docs | — | Phone section | — | — |

## Applied Patterns (If Any)

- **Strategy-like dispatch** in `useMobileRunOpening`, by the discriminated `MobileRowOpen`, to the existing owners.
- **Router as state** for the phone screens.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/` | Folder | Phone | Shell, pairing, shared phone bar and sheet | Root of the phone shell | Desktop components |
| `components/mobile/runList/` | Folder | Phone | List screen and row | One screen | Open rules |
| `components/mobile/runScreen/` | Folder | Phone | Run screen and menu | One screen | Navigation calls other than `useMobileNavigation` |
| `components/mobile/views/` | Folder | Phone | Artifacts, Files, Messages, Activity and viewers | The ⋮ views | Own selection of the open run |
| `components/mobile/newRun/` | Folder | Phone | New run and its sheets | One screen | Team launch |
| `components/mobile/connection/` | Folder | Phone | Connection sheet and unpair confirm | One sheet | Peer edits |
| `composables/mobile/` | Folder | Phone | Navigation, tree, opening, setup, workspaces | Phone logic | Shared rules |
| `utils/mobile/` | Folder | Phone | Pure tree projection | Pure | Store access |
| `composables/runHistory/`, `composables/workspace/` | Folder | Shared | The two extracted composables | Shared owners | Phone imports (except the noted constant) |

## Folder Boundary Check

| Folder | Depth | Ownership Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `components/mobile/*` subfolders | Main-line presentation per screen | Yes | Low | One folder per screen keeps 20 files readable |
| `composables/mobile` | Main-line phone control | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| What the run screen shows | `const target = computed(() => activeContext.activeWorkspaceTarget)`; render `target.context` with `useTargetConversation(target)` | `MobileChat`: `if (selection.selectedRunId !== props.context.runId) showEmptyFallback()` | A copy of the id goes stale at promotion (E-20) |
| Opening a task team row | `if (collaboration.selectTaskRow(host.runId, row)) await selection.onSelectRun(host)` | Recomputing `coordinatorRunIdOf` in the phone row | One rule, one owner (Case 6) |
| Org open on the phone | `subjectActions({ shell: 'mobile' }).execute({ rootSubjectKind: 'agent_org', rootRunId, action: 'open' })` → `/mobile?rootSubjectKind=agent_org&orgRunId=…&mode=…&screen=run` | `router.push('/workspace', …)` on the phone (blocked by the feature gate) | E-16, E-17 |
| Back | `navigation.back()` → `router.back()` | `history.pushState({ mx: 'run' }, '')` beside vue-router | Router state consistency |
| Poll | `useRunHistorySectionLoad({ window: () => null, polling: () => navigation.screen.value === 'list' && pageVisible.value })` | `setInterval(fetchTree, 5000)` in the phone shell | One owner (E-10) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `MobileWorkContext` and add delegated kinds | Smaller diff | Rejected | Shared owners |
| Keep Home and tabs hidden behind a flag | Fallback | Rejected | Removed |
| Keep team launch on the phone, hidden | "Might be wanted" | Rejected | DEC-007; removed |
| Keep `mobileWorkStore` for the file preview | Minimal change to `useEventMonitorFilePreview` | Rejected | Route-based `openFile` |

## Derived Layering (If Useful)

Phone screens → phone composables (navigation, tree, opening, setup) → shared stores and composables (history, run list, collaboration, open actions, target) → GraphQL and streams.

## Change / Refactor Sequence

1. **Shared extractions, desktop behavior unchanged.**
   - `useRunHistorySectionLoad`; the desktop host adopts it.
   - `useTargetConversation`; both surfaces adopt it.
   - The collaboration store's `ensureStoredView` and `selectTaskRow`; `AgentRunTaskRows` adopts them.
   - Run the existing desktop tests of these files.
2. **Shared options.**
   - `shell` on the two action composables;
   - the local-run branch honors `selectionMode`;
   - the disclosure Org option.
   - Add tests for each in mobile mode.
3. **Phone navigation and tree:** `useMobileNavigation`, `buildMobileRunTreeRows` with tests, `useMobileRunTree`, `useMobileRunOpening`.
4. **Phone screens:** the shell rewrite, run list and row, run screen and menu, the four views rebound, New run (agent only) with sheets, the connection sheet.
5. **Rebind `useEventMonitorFilePreview`'s phone branch.**
6. **Remove** everything in the Removal Plan, and its tests. Confirm with `grep` that nothing references `mobileWorkStore`, `MobileWorkContext` or `useMobileWorkCatalog`.
7. **Docs:** `docs/remote_access.md`.
8. **Verify:**
   - the web unit and component tests;
   - typecheck;
   - the guards;
   - a browser probe at 390×844 and 360×800 against a probe-owned stack with delegated, team, Org and remote fixture runs;
   - the Android emulator and a device (an APK from this branch, or the existing APK against a node built from this branch);
   - the user's check on his phone.

## Key Tradeoffs

- **The route query as phone screen state.** Back works natively on Android and iOS, and a reload lands on a safe screen. The cost: Org keys share the query with phone keys; mitigated by one writer for each (subject actions for Org, `useMobileNavigation` for screens).
- **Options on shared open actions instead of phone copies.** One rule per open kind. The cost: the shared composables know two shells; this follows the stores' existing `selectionMode` pattern.
- **The complete history window on the phone.** It matches the desktop Runs view. The cost is data on cellular; the poll pauses when the list is hidden or the app is in the background (E-25).

## Risks

- **R-001, cellular data.** The poll grows with history size. The measured 36 KB is fine now. If it becomes a problem, refine the poll (DESIGN.md phase 2), for example to changed rows only.
- **R-002, phone sleep and streams.** Reconnect is the existing stream behavior; verify on the device that a sleeping phone shows current states after wake (the poll resumes on `visibilitychange`).
- **The read-only rule unified** in `useTargetConversation` must be verified per kind (Guidance).
- **Desktop regressions** from the shared extractions: covered by the existing desktop tests plus the sequence in step 1.

## Guidance For Implementation

- **Reproduction to start from:** none in the repository today. Start with a failing unit test of `buildMobileRunTreeRows`: a standalone run with a task agent and a task team (with members), and a remote task team, yields nested rows in that order with depths 0/1/1/2/1. Also a failing component test: `MobileRunScreen` keeps showing the conversation when the selected `temp-*` id is promoted.
- **Read-only rule.** Today, `AgentWorkspaceSurface` allows sending for `agent_org_direct_agent` and `TeamWorkspaceSurface` for `agent_org_team_member`, when `'root' in target`. The unified rule: `access === 'read_only' && !('root' in target && (submissionPending || kind === 'agent_org_direct_agent' || kind === 'agent_org_team_member'))`. Verify that each desktop surface only ever receives its own Org kinds, so the desktop is unchanged (test both).
- **Messages menu item.** Shown for the member kinds: `standalone_team_member`, `agent_org_direct_agent`, `agent_org_team_member`, `agent_org_task_team_member`, `agent_run_task_team_member` (spec: "members of a team or Org only"). Not shown for `standalone_agent`, `agent_run_task_agent` or `agent_org_task_agent`.
- **The run screen's second line.** State · "in <parent name>". The parent is the open row's parent in `useMobileRunTree`. A top-level run has no "in". For a remote run, the node chip comes first.
- **New run preselection.** The agent of `activeWorkspaceTarget` (the run last opened, still selected), else the agent named "Project Task Manager" in `agentDefinitionStore`, else the first agent.
- **Connection sheet.**
  - The node's own name is `mobileNodeSessionStore.lastStatus.serverName`.
  - The diagnostic text of `lastDiagnostic` shows in the sheet's state area.
  - "Check connection" runs the shell's status check.
  - Peers: `remoteCollaborationStore.load()` on open, then `offersStore.ask` per peer in parallel. Show the entries count ("6 agents · 3 teams") or "Not reachable".
  - With no peers the "Peer nodes" section is absent.
- **The paired node not reachable** (VIS-024) is the shell's existing diagnostic state, shown as the spec's bar line and banner.
- **Files.**
  - Search uses the existing workspace search (`useMobileWorkspaceFileExplorer.searchFiles`).
  - No filters, no Attach.
  - An opened file is `openFile` (route).
  - A remote run's Files and Artifacts show the desktop's "on that node" wording (278).
- **Unsupported route.** The notice text for `desktopWorkspace` is the spec's "The desktop workspace isn’t on the phone. Your runs are here.", shown above the run list.
- **Tests** (TESTING.md: web unit/component tests + a browser probe):
  - the projection;
  - opening per kind in mobile mode (no shell navigation);
  - navigation and Back;
  - the run screen states and promotion;
  - the Messages rule;
  - New run agent only and preselection;
  - the connection sheet with and without peers;
  - the poll pause;
  - the 401 rule;
  - absence checks for the "Not on the phone" list;
  - the desktop tests of every touched shared file.
  - A browser probe at both viewports for the touch-target size and no horizontal scroll.
- **Evidence:** no secrets, pairing codes or tokens in screenshots or logs (QR-005).
