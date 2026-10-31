# Design Spec — Projects view in the left panel

## Solution And Approval Basis

- Current solution revision ID: SR-008 (revision for architecture review ARCH-REV-001: AR-001…AR-005)
- Approved requirements baseline: `requirements-doc.md` R4 at SR-005, with REQ-008/DEC-013/AC-007 refined in SR-008 by the Solution Designer within the direction (AR-002; user informed), approved by the user (journey, folder rules, New chat Project choice, the Product package) and by the Solution Designer within the direction for the remaining decisions; references in the requirements doc's Document Status and User Decisions.
- Behavior-defining supplements: Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/ui-ux-spec.md` with VIS-001…VIS-025 (design revision `0675adca`, integration `1988a503`), confirmed by the user 2026-10-31.
- User approval of the design (the Task requires it before the build): `Obtained` — the user, 2026-10-31, in the Solution Designer's conversation, after asking how runs are linked to Projects: "i think your design is good. lets go. basically." SR-008 corrects technical gaps found by the review (projection owner, file placement, scope definition) and settles the multi-Project copy rule within the approved direction; the user is informed, not asked again.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/investigation-notes.md`
- Authorities read (2026-10-31): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–4, `autobyteus-server-ts/docs/design/collaboration_model.md`, `GLOSSARY.md` (domain words, below). `references/design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: none found.

## Current-State Read

- The left panel's run section is always the Workspaces tree (E-001). `WorkspaceAgentRunsTreePanel.vue` (495 effective lines, E-033) owns its header, the add-workspace form, archive/delete dialogs and the list; `WorkspaceHistoryWorkspaceSection.vue` (445 effective lines) renders one workspace's agent, team and org groups, runs and delegated rows (`AgentRunTaskRows`, `WorkspaceTeamExecutionTree`, `WorkspaceAgentOrgHistoryCollection`).
- Runs carry no Project (E-005, E-029, E-036). The only Task ↔ run link is the Task's `agent_run_resources.json`, held in memory by `TaskExecutionResourceService` (E-025): every entry has `hostRoot` (the top-level run) and `execution`; each copy has one current Task. Local and remote copies are linked the same way (E-024). Every committed write publishes `task_upserted` for its Task (E-026).
- History listing groups index rows by folder and definition, caps each agent group at 6 newest (E-031); a Task's worker is openable from the board only when its host is listed (E-012).
- Delegated copies take their delegator's folder (E-007). Runs start from New chat with a folder chip (E-021, E-035); the draft creates the run on first send through `prepareAgentRun` / Team creation (E-036, E-028).
- Every runtime's system instructions come from one shared Carpenter composition (E-032).
- Closing a Task already stops and hides its delegated runs (E-006).
- Workspaces nodes are not the raw history snapshot: `runHistoryNavigationProjection.ts` 35–57 builds them with `buildRunHistoryTreeNodes` / `buildRunHistoryTeamNodes` (`runHistoryReadModel.ts` 180–331), which add local and draft runs from the agent and team contexts and overlay live status (`mergeRunTreeWithLiveContexts`, `utils/runTreeLiveStatusMerge.ts` 58–83), and it builds the ancestry indexes the open-run mark and reveal use (E-037).
- Constraints: the collaboration model (CM-6…CM-11) and Task ownership stay unchanged; Task data stays the only Task ↔ run truth; no file may exceed 500 effective (non-empty) lines (E-038).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: two subsystems (server run history, run creation, prompt composition, Projects run links, GraphQL; web left panel, start surface, stores, icons), about 20 modified and 10 new files, plus a new GraphQL contract and a stored field in four run records.
- Architectural risk: `High`
- Risk rationale: a new persisted field in Agent run metadata, Agent and Team index rows and the Team tree (no migration, but a persistence change); a new GraphQL query and two changed inputs; a new system-instruction section on every runtime; a new cross-subsystem read from run history into Projects through a port; a structural split of the left panel's oversized components.
- Escalation trigger: a need to change Task ownership, delegation or closure; any evidence that existing runs must be rewritten; a runtime whose instructions do not come from the shared composition.

## Architecture Investigation Evidence

| Source | Exact path | Observation | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| E-024 | `server/src/agent-collaboration/execution/task/root-task-dispatch.ts` 32–61 | Local and remote copies are linked to their Task before activation | Remote rows scoped by the same rule (DEC-015) | — |
| E-025 | `server/src/projects/services/task-execution-resource-service.ts` 21–47, 279–300 | In-memory files by location, entries per copy, current Task per copy | `runLinksOf(projectId)` answered from memory | — |
| E-026 | `server/src/projects/services/project-task-service.ts` 81 | Every committed run-resource write publishes `task_upserted` | Live re-read trigger (DS-004) | — |
| E-027 | `server/src/run-history/store/agent-run-metadata-types.ts` 7–28; `agent-run-metadata-store.ts` 41–72 | Optional run facts with truthful absence | `projectId?`, no migration | — |
| E-028 | `server/src/agent-execution/services/agent-run-provisioning-service.ts` 84–110 | Fresh run metadata + index row written here | Stamp `projectId` once | — |
| E-029, E-030 | index record types; `team-run-history-index-row-projector.ts` 24–41; `team-run-execution-tree-builder.ts` 33–48; `team-run-execution-tree-schema.ts` 109 | Rows have folder, no Project; Team row projected from tree; tree holds run-level facts | `projectId?` on tree and rows | — |
| E-031 | `server/src/run-history/services/agent-run-history-service.ts` 77–130; `workspace-run-history-service.ts` 51–98 | Grouping by folder over catalog rows | `ProjectRunHistoryService` as a sibling | — |
| E-032 | `server/src/agent-execution/prompt/carpenter-prompt-composer.ts` 13–65; five composer callers | One composition for all runtimes | `Project` section (REQ-006) | ACP backend serves `grok_build`; verify in implementation |
| E-033, E-034 | web `WorkspaceAgentRunsTreePanel.vue`, `WorkspaceHistoryWorkspaceSection.vue`; `agentRunCollaborationContext.ts` 287–330 | Oversized panel; sub-work listed at the root's top level | Split the panel; share the groups body; scope every top-level task row | — |
| E-035 | web `projectsPanelStore.ts` 8–69; `useShellPrimaryNavigation.ts` 37; `ChatWorkspaceMenu.vue`; `chatDraftStore.ts` 203–240 | Owners of board choice, nav icon, chip, draft | Extend each owner | — |
| E-036 | `server/src/api/graphql/types/agent-run.ts` 37–60; `agent-team-run.ts` 107–116 | Run inputs without Project | Optional `projectId` input | — |
| E-037 | web `runHistoryNavigationProjection.ts` 35–57; `runHistoryReadModel.ts` 180–331; `runTreeLiveStatusMerge.ts` 58–83; `runHistoryTeamHelpers.ts` 88–113 | Workspaces nodes = builders + live context overlay + ancestry indexes | `projectRunsProjection` reuses them keyed by Project (AR-001) | — |
| E-038 | effective-line counts of touched files | Several files at 487–500 | New logic in owned files (AR-003) | — |
| E-039 | `server/src/projects/changes/project-change-publisher.ts` 27–31, 64–73; projects.md 1054–1060 | Temp-task events carry no Project but their `root.hostRoot` | DS-004 trigger (2) (AR-004) | — |
| E-040 | `team-run-service.ts` 112; `agent-team-run-manager.ts` 126–140; projects.md § Follow-up Task | Team creation owners; copies may hold open Tasks of two Projects | Team stamp site; REQ-008 rule (AR-002, AR-005) | — |

## Intended Change

Add a Projects mode to the left panel that lists, per Project, the runs started under it plus the runs hosting its Tasks' work, with delegated rows scoped to the Project; let any Agent or Team run be started under a Project (from the tree or the New chat chip), record that on the run, run it in the Project's first folder (else the temp workspace) and tell it its Project; swap the Project icon to the briefcase.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005. Server: run records (`projectId`), run creation inputs, a Project-runs read (`projectRunHistory`), Project run links from Task records, the `Project` instruction section. Web: run-section switch and mode, Projects tree, shared groups body, delegated-row scoping, start surface chip and draft Project, board coupling, strip label, Project icon.
- Derived consumers of the changed stored structures (Principle 11):
  - Agent run metadata `projectId` → index row (written in `recordPreparedRun`), restore config (`standalone-agent-run-lifecycle-service.ts` 352), Project-runs read. Index repair from metadata (`run-history/maintenance/collaboration-run-history-index-repair.ts` and the agent index rebuild): carry the field. Run copy ("+" on a run view, `copyAgentFromConfig`): does **not** copy the Project (a copy is a new plain start unless the user chooses one) — decided: copies start with no Project, as the chip shows.
  - Team tree `projectId` → Team index row projector, Team restore config (`buildTeamRunConfigFromExecutionTree`, members' `AgentRunConfig` via `configured-agent-execution-handle.ts` 435), Project-runs read. Team package validators read the tree tolerantly: add the optional field to the schema.
  - GraphQL `RunHistoryItem` / `TeamRunHistoryItem`: unchanged (the Project read returns its own grouping).
- Deliberately left alone: delegation, Task ownership, closure, reactivation (CM-6…CM-11); the Workspaces listing cap; the right Projects board and Projects pages except the icon; Org starts; the board's own openability rule (`presentTaskRoot` `hostListed`), which this ticket does not need to change (FU-005).
- Follow-ups: FU-001…FU-005 (FU-006 withdrawn).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing evidence | Change / preserved outcome | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 002, 012, 015, 016; AC-001, 010, 013, 016, 017 | Switch tabs; expand/select Project | E-001, E-033 | Projects mode beside unchanged Workspaces | DS-006, DS-007, DS-003 |
| BEH-002 | User/System | REQ-003…006; AC-002, 003, 005, 015 | "+" on Project/group; chip choice; first send | E-005, E-028, E-036 | Run records `projectId`; told its Project | DS-001, DS-002, DS-005 |
| BEH-003 | System | REQ-007, 008, 011; AC-006, 007 | `delegate_task` | E-024…E-026, E-034 | Scoped delegated rows, live | DS-003, DS-004 |
| BEH-004 | System | REQ-009; AC-008 | Task DONE/CANCELLED | E-006 | Preserved: closed subtrees hidden by the existing rule | Existing closure path; DS-004 re-read |
| BEH-005 | System | REQ-005; AC-003, 004, 015 | Start under a Project | E-007, E-021 | First folder else temp; changeable | DS-001 (draft folder rule) |
| BEH-006 | User | REQ-010; AC-009 | Open a listed run | E-012 | Project read lists hosts regardless of the Workspaces cap; opening by run id | DS-003 |
| BEH-007 | User | REQ-013, 014; AC-012 | Archive/Delete/Stop | E-011 | Existing per-run actions; group archive scoped | DS-003 (web actions) |
| BEH-008 | System | REQ-011; AC-011 | Reconnect, failure | E-026 | Re-read on `connected`; last good tree kept | DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…VIS-025 | Normative UI | REQ-001…016 | Implementation matches it (AC-017) | Approved by the user |
| `product-design-request.md` | Request to Product | — | Context only | Done |
| `follow-ups.md` | FU-001…FU-005 | — | Out of this change | Recorded |

## Task Design Health Assessment (Mandatory)

- Change posture: Larger Requirement (feature).
- Current design issue found: Yes, for placement only.
- Structural triggers that fire:
  - Responsibility overload / file size (effective non-empty lines, E-038): `WorkspaceAgentRunsTreePanel.vue` 495 and `WorkspaceHistoryWorkspaceSection.vue` 445: the switch goes in a new `RunSectionSwitch.vue` (the panel's heading line is replaced, no growth), Projects mode in a new `ProjectsRunsTree.vue`, and the definition-groups body moves into `RunDefinitionGroups.vue`, shared by workspace and Project sections. `chatDraftStore.ts` 500: the draft's Project choice and folder rule go in a new owned module `stores/chatDraftProjectChoice.ts`; the store keeps only the `projectId` field and calls (if that would pass 500, the launch-input assembly moves into the same module). `agent-run-history-catalog-service.ts` 499: the index row built from metadata moves into a new `run-history/services/agent-run-history-row-projector.ts` (the Agent sibling of `team-run-history-index-row-projector.ts`), used by `recordPreparedRun` and repair, so the service shrinks. `autobyteus-agent-run-backend-factory.ts` 499: gains only the `project` argument line (500 at most); any further line requires extracting its prompt-assembly block (lines 340–354) into an owned file. `configured-agent-execution-handle.ts` 487, `agentTeamRunStore.ts` 488: a few lines each, no new logic. `runHistoryStore.ts` 498: not touched (Projects state is in its own stores).
  - Capability-area reuse: listing, archive, open, status, live feed, closed-subtree hiding, Task lines are reused, not rebuilt.
  - Persisted-data transition: decided below (no migration).
  - Several kinds: run kinds Agent, Team, Org; start entry forms "+" on Project, "+" on group, chip in plain New chat; copies local and remote. Each is mapped in the spines.
  - Derived data: the Project scope of an execution is derived once on the server (`TaskExecutionResourceService.runLinksOf`, joined per root by `ProjectRunHistoryService`) and only read by the web; live status is derived once by the existing context overlay, reused by the Projects projection.
  - Ruled out: ambiguous boundary (the new query takes an explicit `projectId`); behavior by absence (scope membership is an explicit set; "not started under a Project" is an explicit absent field with defined meaning, the documented convention).
- Root cause classification: `File Placement Or Responsibility Drift` (for the touched web files); otherwise `No Design Issue Found`.
- Refactor needed now: Yes (the two web extractions above), in this change.
- Evidence: E-033, E-037, E-038.
- Design response: extract `RunDefinitionGroups.vue` and `agent-run-history-row-projector.ts` first (no behavior change), then add the Projects mode on top; new draft logic lives in `chatDraftProjectChoice.ts`.
- Intentional deferrals: none. (FU-006 withdrawn: the panel is 495 effective lines, under the limit.)

## Terminology

- **Run under a Project / started under a Project**: a top-level Agent or Team run whose record holds `projectId` (it was started with that Project chosen).
- **Project runs**: the runs listed under a Project: runs started under it plus runs hosting an assignment of its Tasks.
- **Execution scope** of a run for a Project: the set of its delegated copies (local or remote) listed under that Project.
- Glossary: `GLOSSARY.md` defines Project, Task, run, delegated run; this design adds no new domain word to it beyond "started under a Project", recorded in the server Projects and run-history docs during delivery.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: the static "Workspaces" heading in `WorkspaceAgentRunsTreePanel.vue` (replaced by the switch); the definition-groups markup inside `WorkspaceHistoryWorkspaceSection.vue` (moved, not duplicated); `heroicons:folder` as the Project icon in the nav owner, Project cards, Projects empty states and right strip tab.
- Compatibility wrappers, dual paths or fallbacks kept: None.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: Agent run `memory/agents/<id>/run_metadata.json`; `memory/run_history_index.json` rows; Team `memory/agent_teams/<id>/team_run_execution_tree.json`; `memory/team_run_history_index.json` rows. Volume: every run on the node (hundreds).
- Change: one optional field `projectId` (the Project's ID string) on each; written only for runs started under a Project.
- Reader/writer behavior: metadata reader projects known fields with an optional-marker rule (E-027); Team tree schema parses optional run-level facts (E-030); index rows are written from metadata / projected from the tree (E-028, E-029).
- Semantics: absent = the run was not started under a Project (true for every existing run). Never rewritten after creation.
- Decision: `Directly Usable — No Migration` (Data Migration Guideline §3, compatible addition with truthful absence).
- Rationale: all existing files lack the field and mean exactly "no Project"; nothing needs transforming; existing runs reach Projects only through Task records (DEC-005).
- Checklist (guideline §2): 1 Need — none. 2 Availability — unchanged; a non-string or blank `projectId` is dropped by the reader and logged with the run ID (DESIGN rule 7: that run reads as "not started under a Project"; the file is not changed). This deliberately differs from `optionalMarker`, which throws. 3 Source shapes — current metadata/tree/rows without the field (all runs). 4 Disposition — unchanged files stay as they are. 5 Commit — existing atomic writers. 6 Current-only — no old-shape code. 7 Cost — no pass. 8 References — `projectId` references a Project ID; a deleted Project is simply not listed (REQ-013); validated at creation only. 9 Evidence — reader/writer key-set tests, restore tests. 10 Reviewed by architecture review.

## Data-Flow Spine Inventory

| Spine | Scope | BEH | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | 002, 005 | "+" or chip in New chat (Agent) | Run metadata + index row with `projectId`; run listed under the Project | `AgentRunProvisioningService` (server); `chatDraftStore` (web draft) | Start an Agent under a Project |
| DS-002 | Primary | 002, 005 | Same, for a Team | Team tree + index row with `projectId` | Team run creation service | Start a Team under a Project |
| DS-003 | Primary | 001, 003, 006, 007 | Projects mode shown | Tree with groups, runs (live status), scoped delegated rows, ancestry indexes | `ProjectRunHistoryService` (server); `projectRunsStore` (read) and `projectRunsProjection` (nodes) (web) | List a Project's runs |
| DS-004 | Return-Event | 003, 004, 008 | Committed Task run-resource write (Project or Temp task); `connected`; run created/archived/deleted from the web; run status change | Project's runs re-read, or live status re-projected, and tree updated | `projectRunsStore` (re-read); `projectRunsProjection` (status overlay) | Live tree |
| DS-005 | Primary | 002 | Run bootstrap (start or restore) | `Project` section in system instructions | Carpenter composer, fed by run config builders | Tell the run its Project |
| DS-006 | Bounded Local | 001 | Switch tab | Panel body swapped, remembered | `runSectionModeStore` | Mode switch |
| DS-007 | Bounded Local | 001 | Click a Project name | Right board shows the Project | `projectsPanelStore.choose` | Board coupling |

## Primary Execution Spine(s)

- DS-001: `New chat chip / "+" → chatDraftStore (draft.projectId, folder rule) → agentRunStore.prepare (projectId) → GraphQL prepareAgentRun(projectId) → AgentRunService (Project exists? via RunProjectContextReader) → AgentRunProvisioningService (metadata.projectId) → AgentRunHistoryCatalogService.recordPreparedRun (row.projectId) → web: projectRunsStore re-read → run listed under the Project`
- DS-002: `chip / "+" → chatDraftStore → agentTeamRunStore.create (projectId) → GraphQL createAgentTeamRun(projectId) → Team run creation (validate; buildInitialTeamRunExecutionTree with projectId) → TeamRunHistoryCatalogService (projected row.projectId) → listed`
- DS-003: `ProjectsRunsTree (mode shown) → projectRunsStore.loadAll() (one projectRunHistory(P) per Project, in parallel) → GraphQL projectRunHistory(P) → ProjectRunHistoryService → ProjectRunLinks.runLinksOf(P) and runLinksOf(null) [TaskExecutionResourceService, in memory] + catalog rows started under P + Org history rows for Org hosts → ProjectRunHistory {groups, scopes} → projectRunsProjection (snapshots + agent/team contexts → RunTreeAgentNode / TeamTreeNode / Org rows with live status and local runs, + ancestry indexes) → ProjectHistorySection → RunDefinitionGroups with execution scopes → rows (AgentRunTaskRows / WorkspaceTeamExecutionTree / Org collection filter top-level task rows by scope)`
- DS-005: `run start/restore → run config builder reads projectId (metadata or Team tree) → RunProjectContextReader.contextOf(projectId) → AgentRunConfig.project → backend bootstrap → composeShared/NativeCarpenterPrompt({…, project}) → "Project" section`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | The draft holds the chosen Project and its folder (first linked folder, else temp, unless the user picked a folder). First send prepares the run with `projectId`; the server refuses an unknown Project (`PROJECT_NOT_FOUND`) before any record, stamps metadata and the index row once. The web re-reads that Project's runs, so the run appears under it; it also appears under its folder in Workspaces as today. | Draft, run, Project | Draft: `chatDraftStore`; record: provisioning service | Project existence check (port) |
| DS-002 | Same for a Team: the Team tree gets `projectId` at creation; its index row is projected from the tree; members inherit the Project for DS-005. | Team run | Team creation | Same port |
| DS-003 | When Projects mode is shown, the store reads every Project's runs (11 Projects today; the reads are in-memory on the server), so the open run can be found and revealed in any Project. Per Project, the query returns runs grouped by definition and, per listed root, its execution scope: `executions(root) = runLinksOf(P)[root] ∪ (root started under P ? runLinksOf(null)[root] : ∅)`. Agent groups are capped at 6 newest per definition, plus every run hosting open work of the Project; Team and Org hosts are uncapped as in Workspaces; archived and hidden-definition runs are dropped as in Workspaces. `projectRunsProjection` turns the snapshots into the same node types the workspace section renders, by the same builders: Agent rows through `buildRunTreeProjection` + `mergeRunTreeWithLiveContexts`, Team rows through `buildTeamNodes`, keyed by Project instead of folder (both builders take the grouping key through their inputs: workspace descriptors and injected root resolvers). Local runs come from agent and team contexts whose config carries the `projectId` given at launch (drafts and newly created runs before the next read). It also builds `runAncestryById` / `teamAncestryById` / `agentOrgAncestryById`, each a list of `{projectId, groupKey}` because a run can be listed under several Projects. The rows' open-run mark is the existing `state.selectedRunId` comparison; on switching to Projects mode, or opening a run while it is shown, `useProjectsTreeState` expands the open run's ancestry in every Project that lists it, and the existing `useRevealSelectedTreeRow` scrolls to it. | Project, runs, executions | `ProjectRunHistoryService`; `projectRunsStore`; `projectRunsProjection` | Contexts (live status), collaboration stores, Task lines (reused) |
| DS-004 | Re-read triggers, each explicit: (1) `task_upserted` / `task_removed` with scope `{kind: project, projectId: P}` → re-read P (every committed run-resource write publishes one, E-026); (2) `task_upserted` with scope `no_project` (a Temp task, which carries no Project, E-039) whose `task.root.hostRoot.runId` is a root listed under a loaded Project → re-read those Projects (SCN-009); (3) `connected` → re-read every loaded Project; (4) the web created, archived or deleted a run → re-read the Projects listing it (and, for a new run, its chosen Project); (5) a delegated row whose copy key is in no scope of its root yet (the run stream showed it before its Task commit was read) → one re-read of that Project per copy key. Reads are coalesced per Project (one in flight, one queued); an older answer never replaces a newer one. A failed re-read keeps the last good tree with the refresh-error banner. Status changes need no re-read: `projectRunsProjection` overlays the live agent and team contexts exactly as Workspaces does, so a run turning active or idle updates both trees. | Feed events, contexts | `projectRunsStore`; `projectRunsProjection` | `ProjectChangeFeed` retention |
| DS-005 | The run's config builder turns the stored `projectId` into `{projectId, name}` through the reader; a deleted Project yields none and the section is omitted. The shared composer renders `## Project` after the identity/team sections for every runtime: "You work in the Project <name> (Project ID <id>). Use this Project ID with the Project tools; ask the user before working on another Project." | Run config, prompt | Composer (section owner) | Reader port |

## Spine Actors / Main-Line Nodes

Web: `ChatWorkspaceMenu` (+ `ChatProjectOptions`), `chatDraftStore`, `agentRunStore` / `agentTeamRunStore`, `ProjectsRunsTree`, `projectRunsStore`, `RunDefinitionGroups`, row components. Server: `AgentRunService`, `AgentRunProvisioningService`, Team creation service, history catalog services, `ProjectRunHistoryService`, `TaskExecutionResourceService`, run config builders, Carpenter composer.

## Ownership Map

- `chatDraftStore`: a draft's target, folder and Project; the folder rule (Project's first folder else temp, unless the user picked a folder on this draft); passes `projectId` at launch.
- `AgentRunProvisioningService` (Agent) and `TeamRunService.createTeamRun` (validation) → `AgentTeamRunManager.createTeamRun` (`agent-team-run-manager.ts` 126–140, tree built with `projectId` as it adds `delegatedFrom`) (Team): the one write of `projectId` per run.
- `ProjectRunHistoryService` (new, run-history): which runs are listed under a Project, grouping, cap rule, scopes per root. Thin GraphQL resolver in front.
- `TaskExecutionResourceService.runLinksOf(projectId | null)` (projects): which host roots and executions belong to a Project (or to Tasks with no Project), from Task records (the only Task ↔ run truth). Rule (REQ-008, DEC-013): an execution belongs to P when it holds an open entry in a Task of P; an execution with no open entry belongs to the Project of its current (latest) Task. One answer, not recomputed elsewhere.
- `projectRunsProjection` (new, web, pure): the Projects nodes, live overlay and ancestry indexes (DS-003).
- `chatDraftProjectChoice` (new, web): choosing a Project or a folder on a draft and the folder rule; the launch input's `projectId`.
- `RunProjectContextReader` (port beside `RunProjectContext` in `agent-execution/domain/run-project-context.ts`, implemented by projects): `contextOf(projectId) → {projectId, name} | null`.
- Carpenter composer: the `Project` section text.
- `projectRunsStore` (new, web): per-Project read state, re-read policy, last good tree.
- `runSectionModeStore` (new, web): the mode per node.

## Thin Entry Facades / Public Wrappers

| Facade | Owner behind it | Why | Must not own |
| --- | --- | --- | --- |
| GraphQL `projectRunHistory(projectId)` resolver | `ProjectRunHistoryService` | Transport | Grouping, scope rules |
| GraphQL `projectId` on run inputs | Run creation services | Transport | Existence check |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| Static "Workspaces" `<h3>` in `WorkspaceAgentRunsTreePanel.vue` | The switch names both modes | `RunSectionSwitch.vue` | — |
| Definition-groups markup in `WorkspaceHistoryWorkspaceSection.vue` | Moved to one shared owner | `RunDefinitionGroups.vue` | Moved, not copied |
| `heroicons:folder` for Projects (nav owner line 37, Project cards, Projects empty states, right strip tab) | Briefcase is the Project icon (REQ-016) | `heroicons:briefcase` | Workspaces keep the folder |

## Return Or Event Spine(s)

DS-004 above.

## Bounded Local / Internal Spines

- `projectRunsStore` read cycle: `event(P) → if loading(P) mark pending else read(P) → apply if latest → if pending read again`. Parent: `projectRunsStore`. It keeps one read per Project in flight and never applies an older answer over a newer one (DESIGN.md best practice 4).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk if on main line |
| --- | --- | --- | --- | --- | --- |
| Project existence/name (`RunProjectContextReader`) | DS-001, 002, 005 | Run services, config builders | Read a Project's name by ID | Run history must not import Projects services | Run services reaching into Projects stores |
| Project run links port binding (`compositions/project-run-links-composition.ts`) | DS-003 | `ProjectRunHistoryService` | Bind the port to `TaskExecutionResourceService` | Dependency direction | Run history importing Projects |
| Feed retention (`ProjectChangeFeed`) | DS-004 | `projectRunsStore` | Keep `/ws/projects` open while Projects mode shows | Reuse | A second socket |
| Board choice (`projectsPanelStore`) | DS-007 | `ProjectsRunsTree` | Remember the board's Project | Existing owner | Duplicated choice state |

## Ownership Boundaries

- Task ↔ run truth stays in Projects (`TaskExecutionResourceService`); run history reads it only through `ProjectRunLinks`.
- Run records own "started under a Project"; Projects never writes run records.
- The web never computes which copy belongs to which Project; it reads the server's scopes.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | If too thin |
| --- | --- | --- | --- | --- |
| `ProjectRunHistoryService.projectRunHistory(projectId)` | Catalog reads, cap rule, port calls, Org lookups | GraphQL resolver | Resolver reading catalogs or the port directly | Extend the service |
| `ProjectRunLinks` port | `TaskExecutionResourceService` internals | `ProjectRunHistoryService` | Reading `agent_run_resources.json` from run history | Add a port method |
| `RunProjectContextReader` port | `ProjectService` | Run creation, config builders | Importing `ProjectStore` into agent-execution | Add a port method |
| `projectRunsStore` | GraphQL query, feed handling | `ProjectsRunsTree`, chip launch, archive actions | Components running the query | Add a store action |

## Dependency Rules

- Allowed: `api/graphql → run-history services`; `run-history → its own ports`; `compositions → projects + run-history + agent-execution ports`; `agent-execution / agent-team-execution → RunProjectContextReader port`; web components → stores → GraphQL.
- Forbidden for new code: run-history, agent-execution or agent-team-execution importing `src/projects/**` directly (new code goes through the ports; the existing `getProjectTaskService` imports in `agent-run-history-catalog-service.ts` 14 and `team-run-history-service.ts` 16 for `deleteAdHocTasksHostedBy` stay, out of scope); web components importing Apollo; any writer of `projectId` other than run creation.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `projectRunHistory(projectId: String!): ProjectRunHistory!` | One Project's runs | List and scope | `projectId` | Returns `{projectId, agentDefinitions: [RunHistoryAgentGroup], teamDefinitions: [WorkspaceTeamDefinitionHistoryGroup], agentOrgRuns: [AgentOrgRootHistoryObject], scopes: [{rootKind: AGENT|AGENT_TEAM|AGENT_ORG, rootRunId, executions: [TaskExecutionReference]}]}` where `executions` = `runLinksOf(P)[root]` ∪ (root started under P ? `runLinksOf(null)[root]` : ∅); unknown Project → `PROJECT_NOT_FOUND` |
| `CreateAgentRunInput.projectId: String` (optional) | Agent run | Start under a Project | Project ID | `prepareAgentRun` and `createAgentRun` |
| `CreateAgentTeamRunInput.projectId: String` (optional) | Team run | Same | Project ID | — |
| `TaskExecutionResourceService.runLinksOf(projectId: string \| null)` | Task records of one Project (or of Tasks with no Project) | `{hostRoots: [{hostRoot, hasOpenWork}], executionsByHostRoot: Map<rootKey, TaskExecutionReference[]>}`: hosts of any assignment of the Project's Tasks; executions holding an open entry in one of its Tasks, plus executions with no open entry whose current Task is one of its Tasks (an execution may therefore appear for two Projects) | Explicit `projectId` or `null` | In memory |
| `RunProjectContextReader.contextOf(projectId)` | One Project | Name for prompt and existence | Project ID | Null when missing |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `projectRunHistory` | Yes | Yes | Low | — |
| `runLinksOf` | Yes | Yes (`null` documented as Tasks with no Project) | Low | — |
| `contextOf` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere | Drift risk | Action |
| --- | --- | --- | --- | --- | --- |
| Stored fact | `projectId` on run records | Yes | Yes (Project ID everywhere) | Low | Doc it as "started under the Project" |
| Read | `projectRunHistory` | Yes, sibling of `workspaceRunHistory` | Yes | Low | — |
| Scope | `executions` per root (task execution references) | Yes (existing term `TaskExecutionReference`) | Yes | Low | — |
| Mode | `Workspaces` / `Projects` | User words | Yes | "Projects" page vs mode: the page stays "Projects" in primary nav | Labels per spec |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Grouped run rows | `RunHistoryAgentGroup`, Team groups, Org rows | Reuse | Same rows |
| Run status | Catalog status projection | Reuse | — |
| Delegated rows, closed hiding, Task lines | `AgentRunTaskRows`, `WorkspaceTeamExecutionTree`, Org collection, `taskWorkerTaskStore` | Extend (scope prop) | One row implementation |
| Live updates | `/ws/projects` | Reuse | E-026 |
| Archive/delete/stop | `runHistoryStore` actions | Reuse | Same semantics |
| Board choice | `projectsPanelStore` | Reuse | — |
| Folder chip | `ChatWorkspaceMenu` | Extend | Spec: one chip |
| Prompt section | Carpenter composer | Extend | Single section owner |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| server run-history | Records' `projectId`; Project-runs read | DS-001…003 | Extend + new service |
| server projects | `runLinksOf`; context reader implementation | DS-003, DS-005 | Extend |
| server agent-execution / agent-team-execution | Creation input, config `project`, prompt section | DS-001, 002, 005 | Extend |
| server api/graphql | New query, input fields | DS-001…003 | Extend + new type file |
| web stores | `projectRunsStore`, `runSectionModeStore`, `chatDraftStore` | DS-001, 003, 004, 006 | New + extend |
| web components (history, chat, layout, projects) | Switch, Projects tree, shared groups, scoped rows, chip tabs, icons, strip label | all | New + extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping; no shared structure beyond those listed below was found.

## Reusable Owned Structures Check

| Repeated structure | Shared file | Owner | Why | Redundant removed | Overlap removed | Must not become |
| --- | --- | --- | --- | --- | --- | --- |
| Definition groups body | `components/workspace/history/RunDefinitionGroups.vue` | web history | Used by workspace and Project sections | Yes | Yes | A section owner (no workspace or Project header logic) |
| Execution scope filter | `utils/collaboration/taskExecutionScope.ts` | web collaboration utils | Applied by Agent, Team and Org task rows | Yes | Yes | A second closed-subtree rule |
| `RunProjectContext {projectId, name}` | `server/src/agent-execution/domain/run-project-context.ts` | agent-execution | Config and composer | Yes | Yes | A Project view model |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning | Redundant removed | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| `ProjectRunHistory.scopes[]` | Yes: which copies of this root are listed under this Project (`executions` only; no flag) | Yes | Low (one per root) | — |
| `projectId` on run records | Yes | Yes | Low | Not copied into rows' GraphQL items |

## Final File Responsibility Mapping

Server (`autobyteus-server-ts/src/`):

| File | Kind | Concern |
| --- | --- | --- |
| `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts` | Modify | Optional `projectId` (read tolerantly, written when present) |
| `run-history/store/agent-run-history-index-record-types.ts`; `run-history/services/agent-run-history-row-projector.ts` (new, extracted from `agent-run-history-catalog-service.ts` `recordPreparedRun` 160–177 and repair) | Modify/New | Row `projectId` from metadata; the catalog service calls the projector and shrinks |
| `run-history/store/team-run-execution-tree-schema.ts`, `agent-team-execution/services/team-run-execution-tree-builder.ts`, `run-history/services/team-run-history-index-row-projector.ts`, `team-run-history-index-record-types.ts` | Modify | Tree and row `projectId` |
| `run-history/domain/project-run-links.ts` | New | Port type `ProjectRunLinks` |
| `run-history/services/project-run-history-service.ts` | New | DS-003 owner |
| `projects/services/task-execution-resource-service.ts` | Modify | `runLinksOf(projectId \| null)` |
| `compositions/project-run-links-composition.ts` | New | Binds both ports to Projects |
| `api/graphql/types/project-run-history.ts` | New | Query and types |
| `api/graphql/types/agent-run.ts`, `agent-team-run.ts` | Modify | Optional `projectId` input |
| `agent-execution/services/agent-run-service.ts`, `agent-run-provisioning-service.ts` | Modify | Validate and stamp |
| `agent-team-execution/services/team-run-service.ts` (`createTeamRun`, validation) and `agent-team-run-manager.ts` 126–140 (tree with `projectId`) | Modify | Validate and stamp |
| `agent-execution/domain/agent-run-config.ts`, `domain/run-project-context.ts` (new: `RunProjectContext` type and `RunProjectContextReader` port) | Modify/New | `project` on config |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` 352; `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` 435 | Modify | Fill `project` on restore / for Team members (task agents: none) |
| `agent-execution/prompt/carpenter-prompt-sections.ts`, `carpenter-prompt-composer.ts`; the five backend callers | Modify | `Project` section, passed `config.project` |

Web (`autobyteus-web/`):

| File | Kind | Concern |
| --- | --- | --- |
| `stores/runSectionModeStore.ts` | New | Mode per node (`autobyteus.leftPanel.runSectionMode.<nodeId>`) |
| `stores/projectRunsStore.ts` | New | Per-Project snapshots, load-all on mode shown, re-read triggers (DS-004), last good snapshot, read state |
| `stores/projectRunsProjection.ts` | New | Pure builder: snapshots + agent/team contexts → Project nodes (same node types as Workspaces, via `buildRunTreeProjection`, `mergeRunTreeWithLiveContexts`, `buildTeamNodes`, Org row builder) + ancestry indexes; exposed through a computed getter of `projectRunsStore` |
| `composables/useProjectsTreeState.ts` | New | Expansion of Projects and groups; expands the open run's ancestry in each Project listing it |
| `graphql/queries/projectRunHistoryQueries.ts` | New | Query document |
| `components/workspace/history/RunSectionSwitch.vue` | New | Tabs (tablist, keys) |
| `components/workspace/history/ProjectsRunsTree.vue` | New | Projects mode body and states, header "+" New Project |
| `components/workspace/history/ProjectHistorySection.vue` | New | One Project row (chevron/name/"+") and its groups |
| `components/workspace/history/RunDefinitionGroups.vue` | New (extracted) | Agent/team/org groups, runs, "+", archive-all, scope pass-through |
| `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Modify | Uses `RunDefinitionGroups` |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Modify | Heading → `RunSectionSwitch` |
| `components/AppLeftPanel.vue` | Modify | Body by mode |
| `components/workspace/history/AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`; `utils/collaboration/taskExecutionScope.ts` (new) | Modify/New | Optional execution scope on top-level task rows (local and remote) |
| `composables/useWorkspaceHistoryGroupArchive.ts` | Modify | Project-scoped group archive (listed runs, per-run archive) |
| `stores/chatDraftStore.ts` (field and calls only, ≤ 500 effective lines); `stores/chatDraftProjectChoice.ts` (new: choose Project / choose folder / folder rule / launch `projectId`); `components/chat/ChatWorkspaceMenu.vue`; `components/chat/ChatProjectOptions.vue` (new); `ChatNewSurface.vue` | Modify/New | Draft `projectId`, folder rule, one chip with tabs |
| `composables/runSettings/useRunStart.ts` | Modify | `newChatInProject({projectId, target?})` |
| `stores/agentRunStore.ts`, `stores/agentTeamRunStore.ts` (488: input line only), `graphql/mutations/*`; web `AgentRunConfig` / team context config type | Modify | Pass `projectId`; contexts created from a draft keep it (for local placement) |
| `components/layout/LeftSidebarStrip.vue` | Modify | Run-tree entry name/tooltip by mode |
| `composables/useShellPrimaryNavigation.ts`, Project cards, Projects empty states, right strip Projects tab | Modify | Briefcase |
| `localization` en / zh-CN catalogs | Modify | Spec labels |

Docs (delivery): `autobyteus-web/docs/projects.md`, `docs/workspace_layout.md`, `docs/chat.md`; server `docs/modules/projects.md`, `run_history.md`, `prompt_engineering.md`.

## Applied Patterns

- Port and composition binding (existing `compositions/` pattern) for run-history ↔ projects.
- Coalesced re-read in `projectRunsStore` (bounded local spine above).

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; new web components live beside the workspace history components they share rows with (`components/workspace/history/`), new stores in `stores/`, server read in `run-history/services/`, ports in `run-history/domain/`, binding in `compositions/`.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `server/src/run-history/domain/project-run-links.ts` | Off-spine port | Yes | Low | Types only |
| `server/src/compositions/project-run-links-composition.ts` | Composition | Yes | Low | Existing pattern |
| `web/components/workspace/history/` | Transport/UI | Yes | Low | Projects tree shares rows |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Scope | Server: `scopes: [{rootKind: "AGENT", rootRunId: "pm_1", executions: [{teamRunId: "set_9"}, {agentRunId: "apc_3"}]}]`; web shows only those top-level copies (and everything under them) | Web asking `taskWorkerTasks` per row and guessing sub-work's Project | One owner; sub-work is not a Task root (E-034) |
| Cap | P's Project Task Manager group lists its 6 newest runs plus an older run still hosting P's open Task | Hiding the older run because of the cap | REQ-010 |
| Prompt | `## Project\nYou work in the Project AutoByteus (Project ID project_a13…). Use this Project ID with the Project tools; ask the user before working on another Project.` | Putting the Project in the user's first message | Survives restore; every runtime |
| Multi-Project copy | Copy C holds open A (P) and gets open B (Q): listed under P and Q; A closes: listed under Q only; B closes too: listed nowhere live (closed) | Listing C only under its current Task Q while A is still open | REQ-008 "no hidden work" (AR-002) |
| Live status | A Project Task Manager run listed under P turns idle: its dot changes in Projects mode at once (context overlay), no re-read | Re-reading P on every status event, or showing the read-time status | AR-001 |
| Folder rule | Draft folder untouched by the user: choosing P sets P's first folder; user had picked `/x`: stays `/x`, chip "AutoByteus · x" | Overwriting the user's folder | REQ-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Migrating existing runs to a `projectId` | Show old managers under Projects | Rejected | Derived from Task records (DEC-005) |
| Keeping the "Workspaces" heading beside the switch | Familiarity | Rejected | The switch |
| Duplicating the workspace section for Projects | Speed | Rejected | Shared `RunDefinitionGroups` |

## Change / Refactor Sequence

1. Extractions with no behavior change: web `RunDefinitionGroups.vue` from the workspace section; server `agent-run-history-row-projector.ts` from the catalog service (existing tests green).
2. Server: `projectId` on run records and inputs, validation, index rows, Team tree; reader/writer tests.
3. Server: `runLinksOf`, ports, composition, `ProjectRunHistoryService`, GraphQL query; tests including a 350-Task fixture (QR-001) and >6 runs (AC-009).
4. Server: `RunProjectContext` on config, composer `Project` section, five backends, restore and Team member builders.
5. Web: mode store, switch, `projectRunsStore` + `projectRunsProjection` + `useProjectsTreeState`, Projects tree, scope filter on task rows, group archive scope, board coupling, strip label.
6. Web: `chatDraftProjectChoice.ts`, draft `projectId`, chip tabs, `newChatInProject`, launch inputs.
7. Web: briefcase icon swap; localization; screenshots against VIS-001…VIS-025.
8. Docs (delivery).

## Key Tradeoffs

- Derived Project membership for existing runs (no migration) means a run that dispatched for three Projects shows under all three; accepted by the user (REQ-003).
- Scope computed on the server costs one query per expanded Project, re-read on that Project's Task changes; cheaper and more correct than per-row reads in the web.
- Agent groups capped at 6 plus open-work hosts: keeps long-lived Projects readable without hiding running work.

## Risks

- A runtime that does not use the shared composition would miss the `Project` section (all five known runtimes do, E-032; verify `acp` = Grok in implementation).
- A copy appearing in a run stream before its Task link is read: trigger (5) covers it; validate in AC-006.
- A damaged Task file: its hosts and executions are not listed under its Project (the view skips damaged files, DESIGN rule 7); `runLinksOf` logs `TASK_AGENT_RESOURCES_UNAVAILABLE` once per read for that Task.
- `PROJECT_NOT_FOUND` on Team creation arrives as the existing `{success: false, message}`; the web shows the existing start error.
- Hidden internal agents: the Project read applies the same visibility as Workspaces.

## Guidance For Implementation

- Reproduction to start from: `None` (new behavior).
- Match the Product references exactly (AC-017); fixture content is illustrative.
- Keep every touched file under 500 lines; `WorkspaceAgentRunsTreePanel.vue` must not grow.
- Tests: server reader/writer key sets; `runLinksOf` on mixed Projects, reused copies (open in P and Q; then P closed), remote links, Temp tasks; Projects projection live status and ancestry; DS-004 triggers (2) and (5); Project read cap and scope; prompt section on all composer paths; web stores, switch, scope filter, chip folder rule, group archive scope; browser journeys per TESTING.md; real delegation for AC-006/AC-008/AC-014.
