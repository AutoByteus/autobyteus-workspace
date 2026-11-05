# Design Spec — Three views of your runs; Remove a folder only in the chat chooser (autobyteus-385)

## Solution And Approval Basis

- Current solution revision ID: `SR-004`, revised after ARCH-REV-003 (AR-003, AR-004, and both recommendations adopted). It replaces SR-001…SR-003 (hide from the tree). SR-003 as reviewed (ARCH-REV-002 Pass) is in commit `1da49572ab`.

## ARCH-REV-003 Resolution

| Finding | Resolution |
| --- | --- |
| AR-003: the requirements doc still described the hide design | `requirements-doc.md` is rewritten to SR-004 only. Approval: the user's. Data continuity: `No`. BEH-001…BEH-005, UC-001…UC-003 and the Preserved boundary are new. DEC-001…DEC-007 are withdrawn |
| AR-004: the folder rule was in the shared builder, where teams and Orgs are not yet attached and Projects also reads | The rule moves to one Workspaces-only owner: `buildRunHistoryNavigationProjection` (`runHistoryNavigationProjection.ts`, used only by the store's navigation actions for the Workspaces tree). It applies after Org groups are attached (`runTreeProjection.ts:396-423`) and team rows are grouped per folder root (`:214-230`), and before the indexes are built. `buildRunHistoryTreeNodes` stays unchanged for Projects (`projectRunsProjection.ts:107`). New tests: a team-only folder, an Org-only folder, a draft-only folder, and an unchanged Projects view (DS-004) |
| Recommendation: set the window by the view | Adopted. The host sets the window from the chosen view: `null` for Runs, 6 for Workspaces and Projects. So the poll is uncapped only while the Runs view is shown (DESIGN.md rule 3), and the tree's display cap is dropped. Today's tree reads 6 per agent, as it does now (DS-002) |
| Recommendation: what prunes the tree's expansion | The Workspaces tree state (`useWorkspaceHistoryTreeState`) prunes the expansion of every folder that leaves its node list, by watching its own node keys. That covers both a chooser removal and a folder leaving by the rule. The removal composable keeps `pruneWorkspaceHistory` (`runHistoryStore.pruneWorkspace`) and no longer takes `pruneWorkspaceExpansion` (DS-006) |
- Approved requirements: `requirements-doc.md` SR-004. Kept: REQ-002 and REQ-004. New: REQ-006…REQ-011, AC-002, AC-005, AC-007, AC-009…AC-014. Decided: DEC-008, DEC-009 and DEC-010.
- Behavior-defining supplements, which are normative:
  - the Product spec `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/ui-ux-spec.md` with VIS-001…VIS-017 (branch `design/workspace-tree-vs-chooser` `7712ec14`), which the user approved twice on 2026-11-05;
  - for the Runs view's rows, `tickets/in-progress/left-panel-super-agents/ui-ux-spec.md` on branch `design/left-panel-super-agents` (`c42d1b64`).
- User approval of this technical design: not required. It adds nothing visible beyond the approved design; the user is informed.
- Design status: `Ready`.
- Investigation: `investigation-notes.md` (E-01…E-16).
- Authorities read: `DESIGN.md` (rules 3, 4, 7, 9, 11) and `TESTING.md`; the skill's `architecture-design.md`, `design-principles.md` and `ticket-scope.md`.

## Current-State Read

- The run section is `WorkspaceAgentRunsTreePanel.vue` (520 lines, already over the 500-line limit). It hosts both of today's views:
  - `RunSectionSwitch` (Workspaces | Projects) and `ProjectsRunsTree` when the mode is `projects` (line 64);
  - the inline add-folder form (`useWorkspaceHistoryWorkspaceCreation`);
  - the folder X and its confirmation.
- Its mount loads the history and starts a 5-second poll (lines 490–505).
- `runSectionModeStore` keeps `workspaces | projects` per node (E-11).
- The history read is capped at 6 agent runs per agent (`fetchTree(limitPerAgent = 6)`, `runHistoryStore.ts:119`; the per-folder read `:435`; the retired-run reconcile assumes the cap). Team runs are not capped (E-12).
- The tree builds a folder node for every registered folder, including Temp (`runTreeProjection.ts:229-243`), then fills runs in. A folder without runs is therefore listed (E-05, E-13).
- The Projects view lists every Project (`projectRunsProjection.ts:65`), and its empty state has a "New Project" link (`ProjectsRunsTree.vue:47`) (E-14).
- The Runs list was designed and mostly built in autobyteus-378 (E-15):
  - Design SR-006 passed ARCH-REV-003.
  - Its code is on `codex/left-panel-super-agents`: commits `79d6c0e584` and `04b1cc57b0`, plus the uncommitted `run-last-activity-reader.ts` for CR-001.
  - That ticket also removed both trees, the server reads that only they used, and moved the history load to `app.vue`.
- The paused SR-003 implementation is on this branch: server commit `8fe7b2e57e` and uncommitted web work (E-16).

## Task Size And Architectural Risk

- Task size: `Large`. A new view, which is a list, row, fold, archive-older and disclosure, ported from 378. The history read window. A server last-activity value. The section header and menu. The tree and Projects rules and empty states. The chooser Remove. Removal of the SR-003 code.
- Architectural risk: `High`.
  - A GraphQL argument changes meaning (`limitPerAgent: null` means every run).
  - The history items gain `lastActivityAt`, read from memory files on every history read.
  - The shared `runHistoryStore` gets one read window used by every caller.
  - The UI blast radius is broad.
- Escalation triggers:
  - a history caller that needs a cap other than the window;
  - a folder or Project with a listed run that a view cannot show;
  - the uncapped read with last activity over budget (Risks).

## Intended Change

1. The run section gets a header with the view's name and a `⋯` menu choosing Runs, Workspaces or Projects.
2. The Runs view is 378's run list, ported as new files.
3. The read window follows the view: the complete non-archived history while the Runs view is shown, and today's 6 per agent otherwise.
4. The Workspaces and Projects views list a folder or Project only when it has a listed run, and show the spec's empty states.
5. The folder X and every add action leave the run section.
6. The chat chooser gets "Remove".
7. The SR-003 hide code is removed.

## Change Scope

**In scope.**

Web:
- the section header and menu, and the mode store's third mode;
- the strip label;
- the Runs view: store, projection, components, archive-older and disclosure;
- the history read window;
- the Workspaces folder rule in the navigation projection;
- the Projects view's rule;
- the empty states;
- the removals;
- the chooser Remove;
- localization in en and zh-CN;
- docs.

Server:
- `listWorkspaceRunHistory` and `workspaceRunHistory` accept `limitPerAgent: null`;
- `lastActivityAt` on the Agent, Team and Org history items (`RunLastActivityReader`);
- reverting the SR-003 hide code.

**Deliberately left alone.**
- The history load stays in the run section's mount. 378's `app.vue` owner is not adopted: the section still mounts for every view.
- The right board's dependency on that mount is today's behavior.
- The phone: it keeps its window of 5.
- The New chat surface apart from the chooser's Remove.
- The Projects page, Memory, `workspaces.json` and `project_runs.json`.
- The trees' rows and actions.
- The 378 removals (the views, `workspaceRunHistory`, `archiveStoredAgentRunGroup`, `projectRunHistory`). They stay, because the views stay.
- 378's CR-002 (the `standalone` navigation target). It is not dead here, because the Workspaces tree still uses it.

**Follow-ups:**
- FU-001: the uncalled `createAgentRun`.
- FU-002: cancel autobyteus-378 after delivery.
- FU-003: `WorkspaceAgentRunsTreePanel` is named after one view but hosts three.

## Relevant Behavior And Production-Path Map

| Requirement / AC | Trigger | Path |
| --- | --- | --- |
| REQ-006, AC-009 | Header menu | DS-001 |
| REQ-008, AC-011 | Runs view | DS-002, DS-003, DS-005 |
| REQ-009, AC-012; REQ-011, AC-014 | History change | DS-004 |
| REQ-007, AC-010; REQ-010, AC-013 | — | Removal Plan |
| REQ-002, REQ-004; AC-002, AC-005 | Chooser Remove | DS-006 |

## Task Design Health Assessment

- Change posture: a behavior change approved by the user, with removal and reuse.
- Issues found:
  - The section host is over the size limit and owns three concerns: the history load, the view choice, and the Workspaces tree. Adding a view must not grow it (rule: a change must not make an oversized file worse).
  - 378's code solved the Runs list against the same base (`3ef5e33eec`). Rewriting it would duplicate reviewed work (Principle 4).
- Refactor needed now: yes, in a bounded form.
  - The header and menu are a new component (`RunSectionHeader.vue`).
  - The Runs view is its own component tree.
  - The host loses the switch, the add form and the X confirmation, so it ends at no more than 500 lines.
  - The rename is FU-003.

## Terminology

- **Run section**: the left panel's area under the page list.
- **View**: one of Runs, Workspaces or Projects. Code: `RunSectionMode` = `'runs' | 'workspaces' | 'projects'`.
- **Listed run**: a run a view shows.
  - It is non-archived, and agent, team or Org, of any status, including a prepared or just-started run.
  - It is not a New chat draft that has not been sent yet (VIS-017).
  - It is not an internal agent.

## Legacy Removal Policy

- Obsolete paths: see the Removal Plan.
- Compatibility kept: none (DESIGN.md rule 9). `listWorkspaceRunHistory` keeps its default of 6 and the phone's 5.
- An explicit `null` is new. Old clients never send it.

## Persisted Data / State Transition Decision

`Not Affected`.
- `lastActivityAt` is derived at read time from existing memory files. Nothing is written.
- The local-storage key `autobyteus.leftPanel.runSectionMode.<node>` gains the value `runs`. An unknown value reads as `workspaces`, as today.
- Reverting SR-003 removes code that never shipped, so no hidden-list file exists on any user's machine.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Bounded local | Menu choice | The view shown; the choice stored | `runSectionModeStore` |
| DS-002 | Primary | Section mount, poll, refresh | `runHistoryStore` holds every non-archived run | The run section host; `runHistoryStore` read window |
| DS-003 | Primary | History or context change | Runs view rows | `runListStore` → `RunListPanel` |
| DS-004 | Primary | History or context change | Workspaces and Projects views list only folders and Projects with listed runs, or their empty state | `buildRunHistoryNavigationProjection` (Workspaces) and `projectRunsProjection` (Projects), one predicate each |
| DS-005 | Primary, server | A history read | Each Agent, Team and Org item carries `lastActivityAt` | `RunLastActivityReader` |
| DS-006 | Primary | Chooser Remove | Folder unregistered, or refused | `ChatWorkspaceMenu` → the existing `removeWorkspace` |
| DS-007 | Bounded local | "Archive all older" | Older runs archived | `useRunListArchiveOlder` → `runHistoryStore.archiveRuns` |

## Primary Execution Spines

- **DS-001:**
  `RunSectionHeader ⋯ → menuitemradio → runSectionModeStore.setMode(mode) → localStorage → host renders RunListPanel | Workspaces tree | ProjectsRunsTree; LeftSidebarStrip label follows`
- **DS-002:**
  `host onMounted, or the view changes → runHistoryStore.setHistoryWindow(mode === 'runs' ? null : 6) → fetchTree() → 5 s poll refreshTreeQuietly() → every read (list, per-folder, retired reconcile) uses the window → GraphQL listWorkspaceRunHistory(limitPerAgent: window) + listCollaborationRootHistory`
  The mobile catalog calls `setHistoryWindow(5)` before its `fetchTree()`.
- **DS-003:**
  `runHistoryStore (workspaceGroups, teamNodes, agentOrgHistory) + agent/team contexts → runListProjection (pure) → runListStore.entries (newest first by lastActivityAt) → RunListPanel (newest 5, fold) → RunListRow (+ delegated rows)`
- **DS-004:**
  - Workspaces view:
    `workspace descriptors + groups + local runs → buildRunHistoryTreeNodes (unchanged) → Org groups attached → buildRunHistoryNavigationProjection: team rows grouped by folder root → workspaceNodes filtered by hasListedRun(node, teamRowsOfRoot) → indexes → getTreeNodes() → tree`
    Empty result: the Workspaces empty state.
  - Projects view:
    `projectRunHistory read → projectRunsProjection → Project kept only when it has a listed run`
    Empty states: none on the node, or none with runs.
- **DS-005:**
  `history read → catalog row → RunLastActivityReader (newest memory-file mtime of the run, and of its located members and delegated copies; else createdAt) → item.lastActivityAt → GraphQL`
- **DS-006:**
  `chooser row X → ConfirmationModal → workspaceStore.removeWorkspace (GraphQL removeWorkspace → WorkspaceManager.removeRegisteredWorkspace + WorkspaceRemovalGuard) → success toast, and the chip falls back to Temp if the folder was chosen; or the refusal toast`
- **DS-007:** as 378 DS-003. If any older run is active, the existing toast appears and nothing is archived. Otherwise, after the confirmation, each record is archived and the history is refreshed once.

## Spine Narratives

| Spine | Narrative |
| --- | --- |
| DS-001 | `RunSectionHeader.vue` is new. It holds the `h2` title and the `⋯` button with `role=menu`, three `menuitemradio` items and the spec's keyboard behavior. The host reads the mode and renders one view. `runSectionModeStore.read()` accepts `runs`. `LeftSidebarStrip` (line 112) maps the mode to "Your runs", "Workspaces" or "Projects" |
| DS-002 | **One read window**, as in 378 DS-001, but without moving the load owner.<br>`runHistoryStore` gains `historyWindow: number \| null` (default 6) and `setHistoryWindow`.<br>`fetchTree`, `refreshTreeQuietly` and `fetchWorkspaceHistory` take no limit. They, and `reconcileHistoryRead`, use the window, so every caller (378 E-017: agent and team stores, archive and delete cores, `ShowInternalAgentsCard`) follows it.<br>The run section host sets the window from the chosen view before its first read, and again (with one `fetchTree`) when the view changes: `null` for Runs, whose "Show older (N)" count and "Archive all older" need every run, and 6 otherwise. So the Workspaces and Projects views read exactly as today, and the uncapped poll runs only while the Runs view is shown (DESIGN.md rule 3). Shrinking the window from `null` to 6 is the case the retired-run reconcile already handles: a run that drops out of the window is not mistaken for a retired run (`runHistoryRetiredRuns.ts:36-42`). This needs a test.<br>Server: `listRunHistory(limitPerAgent: number \| null)`, where `null` skips the slice. `workspaceRunHistory` accepts `null` the same way, so the per-folder read stays complete |
| DS-003 | Ported from 378 with its reviewed shape. `runListProjection` builds:<br>• Agent rows from every folder group, plus `local` agent contexts (not drafts);<br>• Team rows from the navigation projection's `teamNodes`;<br>• Org rows from `agentOrgHistory`.<br>Live status comes from `mergeHistoryRowWithContext`. Sorting uses one clock, the server's `lastActivityAt` (DS-005); a `local` run not yet in the history uses its context's `createdAt`. This fixes 378 CR-001.<br>The 378 changes that stopped live contexts setting `lastActivityAt` (`runTreeLiveStatusMerge.ts:46`, `runHistoryTeamHelpers.ts:118-142`) apply to the run list's rows only. The trees keep today's behavior, because the tree sorts within an agent group. The implementation must check the trees' order is unchanged |
| DS-004 | **One predicate per view**, as ARCH-REV-002 recommended, each in a view-only owner.<br>• **Workspaces:** `hasListedRun(node, teamRows)` (exported from `runHistoryNavigationProjection.ts`) is true when the folder node has an agent run that is not a draft (`source !== 'draft'`), an Org run in `agentOrgDefinitions`, or a team row for its root. `buildRunHistoryNavigationProjection` drops folder nodes without one, Temp included, after the Org groups and the per-root team rows exist and before `runIndexById` and the ancestries are built. So every index and ancestry refers only to listed folders, and teams of a dropped folder cannot exist, because a team row makes its folder listed.<br>• The incremental navigation patches (`runHistoryNavigationPatches.ts`) must keep the rule. A patch that would add a run to a folder not in `workspaceNodes` falls back to a full rebuild, rather than being lost. Test: the first sent message in a draft-only folder makes it appear (VIS-017).<br>• `buildRunHistoryTreeNodes` and `runTreeProjection` are unchanged, so the Projects view is unaffected.<br>• `projectHasListedRun(project)` in `projectRunsProjection` filters Projects. The view tells "no Projects" from "none with runs" by the unfiltered count.<br>• The empty states are text only, per UXJ-002 step 4 |
| DS-005 | Ported from 378 SR-006 (AR-005 and AR-006 resolved), from its uncommitted `run-last-activity-reader.ts` and test, completed to that design.<br>• Per run folder: `MemoryRunSummaryBuilder`'s `latestMemoryMtime`.<br>• Per root: the newest over the root's own folder and every located agent, through `StandaloneRootLocationService`, `TeamRunExecutionTreeLocationService` and `AgentOrgExecutionTreeLocationService` (`listAgents({ rootRunId })`), combined with `mergeMemoryAvailability`. With no memory file, it uses `createdAt`.<br>• An unreadable tree keeps the root's own time, and a lookup that throws is caught (378's residual risk).<br>• Nothing is cached or written. The catalog row projectors set the value, and the GraphQL types expose `lastActivityAt: String!`.<br>• Dependency rules as in 378 SR-006 |
| DS-006 | `ChatWorkspaceMenu.vue` gets the remove button:<br>• on each user folder row, never on Temp;<br>• 28px, vertically centred, shown on hover or focus at `md` and up, always shown below `md`;<br>• the existing `ConfirmationModal` (danger) with the spec's copy.<br>It calls the existing removal. The guard's refusal message is shown as the error toast. When the removed folder is the chosen one, the chip falls back to Temp workspace.<br>The removal confirmation and the active-run check today live in `useWorkspaceHistoryWorkspaceRemoval.ts`. That composable becomes the chooser's, keeping its name, minus the `pruneWorkspaceExpansion` parameter (ARCH-REV-003). It keeps `pruneWorkspaceHistory` (`runHistoryStore.pruneWorkspace`). The tree's expansion is pruned by the tree state itself (Ownership Map). Its tree caller goes |
| DS-007 | 378 DS-003, unchanged. `runHistoryStore.archiveRuns({ agentRunIds, teamRunIds, orgRunIds })` uses the record-level cores |

## Ownership Map

- **The run section host** (`WorkspaceAgentRunsTreePanel.vue`): owns the history load, the poll and the window setting (from the chosen view), and renders the header and the chosen view.
- **`RunSectionHeader.vue`** (new): the title and the menu.
- **`runSectionModeStore`**: the view choice.
- **`runHistoryStore`**: the data and its read window, the one owner of the cap, plus `archiveRuns`.
- **The Runs view**:
  - `runListStore` and `utils/runListProjection.ts`;
  - `components/runList/{RunListPanel,RunListRow,RunListRowActions,RunListFold}.vue`, with `AgentRunTaskRows`, `WorkspaceTeamExecutionTree` and `AgentOrgRunMemberTree` reused or ported;
  - `useRunListDisclosure` (expansion and reveal for the list);
  - `useRunListArchiveOlder`.
- **`buildRunHistoryNavigationProjection`**: the Workspaces folder rule (`hasListedRun`), Workspaces only.
- **`useWorkspaceHistoryTreeState`**: also prunes the expansion of folders that leave its node list.
- **`projectRunsProjection`**: the Projects rule.
- **`RunLastActivityReader`** (server, `run-history/services/run-last-activity-reader.ts`): a run's last activity.
- **`ChatWorkspaceMenu` with `useWorkspaceHistoryWorkspaceRemoval`**: the deliberate removal.

## Porting Rules (from `codex/left-panel-super-agents`)

- Port files, not commits. 378's commits also delete the trees and server reads, and move the load to `app.vue`, and none of that applies here.
- Port these, adapted to this design, with their tests:
  - `components/runList/*`, `AgentOrgRunMemberTree.vue`;
  - `stores/runListStore.ts`, `utils/runListProjection.ts`;
  - `composables/useRunListDisclosure.ts`, `composables/useRunListArchiveOlder.ts`;
  - `runHistoryStore`'s window and `archiveRuns`, with the record-level archive split;
  - the server window (`null`) and its schema test;
  - `run-last-activity-reader.ts` and its test;
  - the `shell.ts` localization keys.
- Do not port:
  - `useRunHistoryLoad.ts` or the `app.vue` change;
  - the removals of the trees, projections, ancestries, server reads and `run-projects-composition.ts` rename;
  - the `standalone` navigation removal (CR-002).
- The ported code passed 378's architecture review, but not its code review, because of CR-001. This ticket's code review treats it as new code.

## Removal / Decommission Plan

| Item | Why |
| --- | --- |
| Server commit `8fe7b2e57e`: `WorkspaceTreeVisibility`, `hideFromWorkspacesTree` / `showInWorkspacesTree` / `isShown`, `shownInWorkspacesTree`, the `hideWorkspaceFromTree` mutation, the four re-show calls, and their tests | SR-003 was withdrawn: nothing is hidden. Revert it with a new commit (`git revert`), because the branch history is shared |
| The uncommitted SR-003 web work: the `shownInWorkspacesTree` field and actions, `stores/workspacesTreeVisibility.ts`, the tree's "Hide from Workspaces", the phone filter, strings, the docs and GLOSSARY entries, and the `useWorkspaceHistoryWorkspaceHiding.ts` rename | The same. Keep the chooser Remove work and adapt it to DS-006 |
| `RunSectionSwitch.vue` and its tests | Replaced by the header menu |
| The folder X on Workspaces rows (`WorkspaceHistoryWorkspaceSection.vue`), its confirmation in the host, and `canRemoveFromWorkspaces` in the descriptors and projection | REQ-007 |
| The inline add-folder form, `useWorkspaceHistoryWorkspaceCreation.ts`, and its header "+" | REQ-010 |
| The "New Project" link in `ProjectsRunsTree.vue`, and its key `projectsTree.newProject` if unused elsewhere | REQ-010 |
| Localization keys and specs only these used | DESIGN.md rule 11 |

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| GraphQL `listWorkspaceRunHistory(limitPerAgent: Int = 6)` and `workspaceRunHistory(…, limitPerAgent: Int = 6)` | Nullable. An explicit `null` returns every run. The default is unchanged. Tests cover `null` as an argument and as a variable, and the omitted default |
| GraphQL `RunHistoryItem` and the Team and Org history items | Gain `lastActivityAt: String!` |
| `runHistoryStore.setHistoryWindow(limit: number \| null)`; `fetchTree(options)`, `refreshTreeQuietly()` and `fetchWorkspaceHistory(workspaceId, options)` without a limit | The window is the only cap |
| `runHistoryStore.archiveRuns({ agentRunIds, teamRunIds, orgRunIds })` | New |
| `RunSectionMode` | Adds `'runs'` |
| GraphQL `hideWorkspaceFromTree` and `WorkspaceMetadataInfo.shownInWorkspacesTree` | Removed (never shipped) |

## Dependency Rules

- `components/runList → stores/runListStore → stores/runHistoryStore + the context stores`. No component imports Apollo.
- Server `run-last-activity-reader.ts`: as in 378 SR-006.
  - Allowed: `memory-run-summary-builder.ts`, `memory-file-store.ts` and the three location services.
  - Forbidden: the other `agent-memory/services/*` files, which would close a service cycle.

## Tests (DESIGN.md rule 11, TESTING.md)

**Server:**
- the `null` window for both reads (schema and service);
- `RunLastActivityReader` for Agent, with delegated copies, Team and Org, plus the no-memory and unreadable-tree cases;
- the history items carry `lastActivityAt`;
- `removeWorkspace` refusal unchanged.

**Web units:**
- the mode store with `runs`;
- the header menu's roles and keyboard;
- the strip label;
- the window used by every read and by the reconcile;
- `runListProjection` order and the fold;
- archive-older all-or-nothing;
- the window follows the view (`null` for Runs, 6 otherwise; one fetch on change), and shrinking it does not retire runs;
- `hasListedRun` in the navigation projection: a team-only folder and an Org-only folder are listed; a draft-only and an empty folder are not; Temp follows the rule; the indexes and ancestries cover only listed folders; a patch into a dropped folder rebuilds;
- the Projects view is unchanged by the Workspaces rule (same nodes as before for the same input, apart from `projectHasListedRun`);
- the tree state prunes the expansion of a folder that leaves its node list;
- `projectHasListedRun` and the two Projects empty states;
- the Workspaces empty state;
- no X and no add form in the tree;
- chooser Remove: no X on Temp, the confirmation copy, success, refusal, and the chip falling back to Temp.

**Rendered check against the screenshots:**
- VIS-001…VIS-017;
- the Runs view against the 378 spec's VIS for the list rows.

**API/E2E:**
- a folder appears with its first sent message and leaves after its last run is archived;
- Remove from the chooser;
- the uncapped read with `lastActivityAt` on a large isolated data set shaped like the user's (about 40 agent runs and about 200 team runs; 378 E-013), against a poll-read budget of 250 ms, with the Runs view shown; and the capped read with `lastActivityAt` in the Workspaces view, which must not be slower than today's read by more than that budget.

Browser probes that click the removed switch, the add form or the X must be updated in this ticket.

## Risks

- **Cost of the uncapped read with last activity.** While the Runs view is shown, each poll (5 s) reads all non-archived runs and stats their memory files. The other views read 6 per agent, as today, though with `lastActivityAt` for the runs they read. The budget is 250 ms per read on the shaped data set. Over budget is an escalation trigger: it needs a design revision, not a silent cap.
- **The Runs list recomputes on every streamed context change.** That is a few hundred rows; it was measured cheap in 378.
- **The ported code was written against the same base.** Later `personal` changes may conflict, so check the merge with `origin/personal` at implementation start.
- **The phone and the desktop share `runHistoryStore`.** The window is set by whichever surface mounts. They are separate pages (`pages/mobile.vue` vs `AppLeftPanel`, confirmed in ARCH-REV-003), and a test must show that switching between them sets the right window.
