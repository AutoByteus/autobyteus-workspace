# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-008`. This document is consolidated after ARCH-REV-003 (AR-003): it states only the current design. History is in `solution-revision-record.md` (SR-001…SR-008) and in git.
- Approved requirements: `requirements-doc.md` at SR-008.
  - SR-001/SR-002: approved by the Solution Designer within the direction, user informed.
  - SR-004…SR-007: the founder's words.
  - SR-007: the UI was approved by the founder ("Approved", 2026-11-20).
- Behavior-defining supplement: the Product-owned UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md` (Approved). It is normative for everything visible. Where its "Data" column names `semanticMemoryFolders`, this design governs production (N-6).
- Design status: `Ready`
- Investigation: `investigation-notes.md` (INV-1…INV-12); `global-semantic-memory-investigation.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (this conversation); `DESIGN.md` (rules 3, 5, 7, 8, 9, 11); Data Migration Guideline; node access model; the internal-agent rule (autobyteus-308)

## Current-State Read

- **Semantic memory gate.** One gate: `AgentSemanticMemory.folderOf/prepareForRun` returns null unless `semanticMemoryEnabled` (`agent-memory/services/agent-semantic-memory.ts:21-33`). All five run-start owners call it (Claude `claude-session-bootstrapper.ts:103`, Codex `codex-thread-bootstrapper.ts:213`, AutoByteus factory `:345`, Antigravity `:63`, ACP `:166`; Grok and DeepSeek through ACP). The composer adds the section for a non-null path (`carpenter-prompt-composer.ts:57-61`).
- **The switch.** The field runs through the model, config, readers, service, GraphQL, personal settings, package capture and the web (INV-1). Tolerant readers exist (INV-3, INV-4).
- **Memory page.** Browse tabs Agents / Agent Teams / Agent Orgs with cards; the agent runs page; the team/org runs pages; the inspectors. The resolver builds `AgentMemoryExplorerService` per request (`api/graphql/types/memory-explorer.ts:1-120`).
- **Folder views.**
  - The Skills page browses a skill folder through a transient `SkillWorkspace` (`workspaces/skill-workspace.ts`; `workspace-manager.ts:109-131`).
  - Transient active workspaces are listed by `listVisibleWorkspaces()` (`workspace-manager.ts:167-175`) and served by the `workspaces` query (`api/graphql/types/workspace.ts:82`).
  - The explorer follows links: `directory-traversal.ts:156-166` and `file-explorer.ts:149-151, 349-353` use `fs.stat`, and the live watcher uses chokidar's default `followSymlinks` (`file-explorer/watcher/runtime/chokidar-watcher-runtime.ts:40-47`).
  - File-name search runs `rg --files` (`search-strategy/ripgrep-search-strategy.ts:85`), which does not follow links by default.
- **Callers that resolve a workspace id** (AR-005 d):
  - file-explorer GraphQL (`file-explorer.ts:28`);
  - the explorer stream (`file-explorer-stream-handler.ts:43`);
  - the AutoByteus factory (`autobyteus-agent-run-backend-factory.ts:308`);
  - the Claude and Codex workspace resolvers (`claude-workspace-resolver.ts:24`, `codex-workspace-resolver.ts:23`);
  - published artifacts (`published-artifact-publication-service.ts:117`);
  - the workspace REST content route and the file-change runtime and payload builder (run-bound).
  - `POST /upload-file` takes no workspace id and writes to media storage only (`upload-file.ts:87-120`); it is not a workspace write.
- **Episodic catalog (autobyteus-493).** `EpisodicCatalog` keeps every attributed run of each definition in memory (`agent-episodic-catalog/services/episodic-catalog.ts:59`): `runId`, `memoryDir`, `root`, `startedAt`, `lastActivityAt`, `taskTitle`, `workspace`. It covers the local node and is complete after its start pass (3.4–12.5 s on the founder's data, 493 AC-010). It is created by the composition root (`compositions/build-studio-server.ts:256`).
- **Discovery.** `RunFolderDiscovery` over a memory folder attributes every run folder (INV-12). Run folders: local about 4,000; the founder's imported Docker node: 474.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
  - Server: the gate and field removal across about 30 files; global memory; the read-only workspace with a link-aware explorer option and run refusal; explorer owner queries; catalog read API.
  - Web: the Memory page rebuilt to the spec; read-only explorer mode; switch removal.
  - About 50 test files; docs.
- Architectural risk: `High`:
  - a GraphQL contract change (clean cut);
  - every agent's instructions change in every runtime;
  - a shared file-explorer change (an option whose default keeps today's behaviour);
  - a new workspace kind that runs must refuse;
  - new owner queries over many runs.
- Escalation triggers:
  - a runtime that cannot give a run access to both folders;
  - a write path to a read-only workspace that the list below misses;
  - an imported-source owner query measured over 3 s on the founder's import copy (AC-012);
  - any need to write stored data.

## Intended Change

- Every agent has semantic memory, and the node has one global semantic folder; every run is told both and can use both.
- The switch is removed as a clean cut.
- The Memory page is organized by owner (UI/UX spec). Folders are shown read-only through a transient workspace that the node refuses to write, never lists, never runs in, and in which links are never followed.

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-003 and the merged global memory (REQ-010…REQ-012). The files are in "Target File Mapping".
- **Derived consumers:**
  - GraphQL `AgentDefinition.semanticMemoryPath` becomes non-null.
  - Personal-settings kinds lose `SEMANTIC_MEMORY`.
  - `TreeNode` gains `isSymbolicLink` (every explorer consumer renders it; the default `false` keeps them unchanged).
  - `WorkspaceKind` gains `semantic_memory`; each consumer's decision is in DS-003.
  - `listAgentRunsWithMemory` is replaced by `listAgentEpisodes`; its only callers are the web store and the doc (grep).
- **Deliberately left alone:**
  - the semantic and global folders' content;
  - Memory Sync;
  - the phone;
  - Search results and the inspectors (only the inspector's Back label changes);
  - the Skills page (it keeps editing);
  - the founder's stored files (no rewrite).
- **Follow-ups:** FU-001 (two packages still carry the key), FU-002 (relative Markdown links).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Spine |
| --- | --- | --- | --- |
| BEH-001, BEH-005 (agents use memory) | REQ-001, REQ-010, REQ-011; AC-001, AC-009 | run start | DS-001 |
| BEH-002, BEH-003 (no switch) | REQ-002…004; AC-002…004 | definition read/save | — |
| BEH-004, BEH-005 (Memory page) | REQ-005…008, REQ-012; AC-005…008, AC-010…012 | user opens Memory | DS-002, DS-003 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` + `Cleanup` + `Feature` (the owner view).
- Current design issue found: `No`. The gate has one owner, workspaces have one manager, and the episodic catalog already is the per-agent run index the owner view needs.
- Structural triggers and responses:
  - **Legacy cleanup.** The field is removed as a clean cut. The config writer's retired-key drop list keeps the name (as `selfEvolution`): it removes the key at the next save; nothing reads it.
  - **Persisted-data transition.** See below.
  - **Capability-area reuse:**
    - the folder view reuses the Skills workspace pattern, the file explorer and the Files tabs;
    - the agent's episodes reuse the episodic catalog (local) and discovery (imported);
    - file content reuses the workspace content route.
  - **Several kinds or forms:**
    - every runtime and run kind goes through `prepareForRun`;
    - every caller that resolves a workspace id gets a decision (DS-003);
    - the local and imported sources are handled separately.
  - **Hidden dependency (16):** fires once. The GraphQL resolver builds the explorer service per request and reaches the catalog through a process binding `getProcessEpisodicCatalog()`. It follows the existing `setProcess…` pattern of the composition root (for example `setProcessAgentRunHistoryService`). The conditions hold:
    - the composition root sets it before the HTTP server serves GraphQL;
    - a missing binding throws `EPISODIC_CATALOG_NOT_COMPOSED`, with no fallback;
    - no cycle: the catalog does not use the explorer.
  - **Vocabulary.** The glossary gains "Global semantic memory (of a node)"; "Semantic memory (of an agent)" now says every agent has one.
- Deliberate deviations: none.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`.

## Terminology

- **Global semantic memory:** the node's folder `<memory>/semantic-global/`, shared by every agent.
- **Semantic memory workspace:** a transient, read-only workspace rooted at an agent's or the global semantic folder; kind `semantic_memory`.
- **Owner:** what a Memory page card stands for: Global, an agent, a team, an org.
- **Episodes (of an agent):** its runs from every place it works.

## Legacy Removal Policy (Mandatory)

- Removed: everything in the Removal Plan.
- Compatibility wrappers: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `agent-config.json` and `personal-settings.json` hold `semanticMemoryEnabled`: `Directly Usable — No Migration` (tolerant readers; the key is dropped at the next write). The personal-settings store logs `PERSONAL_SETTINGS_ENTRY_SKIPPED … semanticMemoryEnabled` per such record until it is rewritten (DEC-006).
- Semantic folders and the new global folder: `Not Affected`. The global folder is created empty when missing at run start.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | a run starts (any runtime, any run kind) | the instructions name both folders; both exist; Claude and Codex can reach them | each runtime owner through `AgentSemanticMemory` |
| DS-002 | Primary | the user opens Memory → Browse and an owner | cards; owner page; episodes; members; folder state | `AgentMemoryExplorerService` and its GraphQL resolver; web `memoryExplorerStore` |
| DS-003 | Primary | the user opens a Semantic tab or Global | the folder tree, a file previewed, writes and links refused, workspace released from the web on leave | `WorkspaceManager` + `SemanticMemoryWorkspace`, file explorer (read-only and link-aware), web read-only explorer |

## Primary Execution Spine(s)

- **DS-001:** `Run start (Claude / Codex / ACP incl. Grok, DeepSeek / Antigravity / AutoByteus) -> AgentSemanticMemory.prepareForRun(definitionId) -> mkdir agent folder + global folder -> prompt composer: Semantic Memory section + Global Semantic Memory section (DEC-013) -> runtime access (Claude additionalDirectories, Codex writableRoots: both folders)`
- **DS-002:**
  - Browse: `Memory -> GraphQL listAgentsWithMemory / listAgentTeamsWithMemory / listAgentOrgsWithMemory (source) -> AgentMemoryExplorerService -> definitions + EpisodicCatalog (local) or RunFolderDiscovery (imported) -> cards`
  - Agent page: `agent card -> listAgentEpisodes(selector, source, search, page) -> episodes -> run card -> existing inspector`
  - Team or org page: `team/org card -> listMemoryGroupMembers(kind, id, source) + existing runs query`
  - Semantic tab and Global: `agentSemanticMemoryFolder(id) / globalSemanticMemoryFolder -> {folderPath, exists, isEmpty}`
- **DS-003:** `Semantic tab / Global (exists, not empty) -> web registers transient workspace id (semantic_ws_<encoded id> | semantic_global_ws) -> file explorer GraphQL folderChildren / fileContent and explorer stream -> WorkspaceManager.getOrCreateWorkspace(id) -> SemanticMemoryWorkspace (readOnly, followSymbolicLinks=false) -> lstat-based tree (links as isSymbolicLink rows), watcher followSymlinks=false -> file content via the workspace content route (links refused) -> any write mutation refused WORKSPACE_READ_ONLY -> leave: web unregisters; the server instance stays cached but is never listed and never runnable`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | The gate is gone. `prepareForRun` creates both folders and returns both paths. Every runtime passes them into the composer, which adds two sections, and Claude and Codex add both folders to the run's access. Agents write with their own tools. |
| DS-002 | **Cards:** for the local source, agents are the non-team-local definitions plus every definition the episodic catalog holds, with the latest change taken from the catalog, then "Unattributed runs" (the existing standalone scan). Teams and orgs come from their definitions and the existing team/org run lists, with member counts from definitions. For an imported source, everything comes from one discovery of that source per request. The internal-agent rule filters agents (AC-008). **An agent's episodes:** local from the catalog (awaiting its start pass); imported from one discovery per request, filtered by attribution. Both filter by run id, Task title and run summary, newest first, and page in memory; summaries come only for the page. **Members:** from the team or org definition (local), else from the newest stored tree of that team or org in the source. |
| DS-003 | A semantic folder is opened like a skill folder, but its workspace is read-only and does not follow links. The server refuses writes, links and runs on it, and never lists it. |

## Spine Actors / Main-Line Nodes

`AgentSemanticMemory`, runtime owners, prompt composer; `AgentMemoryExplorerService`, `EpisodicCatalog` (read API), `RunFolderDiscovery`; `WorkspaceManager`, `SemanticMemoryWorkspace`, file explorer; web `memoryExplorerStore` and the Memory components.

## Ownership Map

- **`AgentSemanticMemory`** (`agent-memory/services/agent-semantic-memory.ts`):
  - the path rules: `folderOf(definitionId)`, `globalFolder()` (both through `AgentMemoryLayout`: `getAgentSemanticMemoryDirPath`, new `getGlobalSemanticMemoryDirPath`);
  - `prepareForRun(definitionId): Promise<{ agentFolder, globalFolder }>`, which creates both;
  - `folderState(definitionId)` and `globalFolderState()`, each `{ folderPath, exists, isEmpty }` from one `readdir`. These replace `AgentSemanticMemoryBrowser`, which does not survive.
- **`AgentMemoryExplorerService`** (extended; its GraphQL resolver is the thin entry):
  - the owner lists, `listAgentEpisodes` and `listMemoryGroupMembers`;
  - the local/imported split;
  - the internal-agent rule.
  - It receives `Pick<EpisodicCatalog, "agentDefinitionIds" | "runsOf" | "whenStartPassDone">` through `getProcessEpisodicCatalog()` (see Hidden dependency).
- **`EpisodicCatalog`** (extended with a read API): `agentDefinitionIds()`, `runsOf(id): readonly CatalogEntry[]`, `whenStartPassDone(): Promise<void>`. These are reads of its existing in-memory entries; nothing else changes.
- **`WorkspaceManager`** (extended):
  - creates `semantic_ws_<encodeURIComponent(id)>` and `semantic_global_ws` on demand; refuses when the folder is missing; never creates the folder;
  - `listVisibleWorkspaces()` excludes kind `semantic_memory` always;
  - new `getOrCreateRunWorkspace(id)` refuses a read-only workspace (`WORKSPACE_NOT_RUNNABLE`). The run-bound callers switch to it (DS-003 table).
- **`SemanticMemoryWorkspace`** (`workspaces/semantic-memory-workspace.ts`, `extends FileSystemWorkspace`): `workspaceKind = "semantic_memory"`, `readOnly = true`, `followSymbolicLinks = false`.
- **File explorer** (extended, option-driven): with `followSymbolicLinks === false` it classifies entries by `lstat`.
  - A link becomes a `TreeNode` with `isSymbolicLink = true` and is never entered.
  - `fileContent` and the content route refuse a link, or a real path outside the root (`WORKSPACE_LINK_NOT_OPENED`).
  - Non-regular, non-link entries are skipped (N-4).
  - The watcher is started with `followSymlinks: false`.
  - The `rg --files` search does not follow links (its default); a non-rg fallback traversal uses the same option.
  - Mutations check `workspace.readOnly` first (`WORKSPACE_READ_ONLY`).
  - Defaults keep today's behaviour for every other workspace.
- **Web:** `memoryExplorerStore` (owner state, addresses per the spec's UIS routes, transient workspace register and unregister); the components in the File Mapping; the `readOnly` explorer mode.

### DS-003 decision per workspace-id caller (AR-005 d)

| Caller | Decision for `semantic_memory` |
| --- | --- |
| File-explorer GraphQL queries (`folderChildren`, `fileContent`, `searchFiles`) | Allowed; link-aware |
| File-explorer GraphQL mutations (write, delete, move, rename, create) | Refused `WORKSPACE_READ_ONLY` before any fs call |
| Workspace REST content (the tabs' file content) | Allowed for regular files inside the root; links refused |
| Explorer stream (live tree updates) | Allowed; watcher `followSymlinks: false` |
| `workspaces` query (`listVisibleWorkspaces`) | Excluded (never listed; AC-011) |
| AutoByteus factory, Claude and Codex workspace resolvers | Use `getOrCreateRunWorkspace` → refused `WORKSPACE_NOT_RUNNABLE` (AC-011) |
| Published artifacts, the file-change runtime and payload builder | Run-bound: unreachable once runs are refused; they also use `getOrCreateRunWorkspace` where they resolve by id |
| `POST /upload-file` | Not a workspace write (media storage); no change |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner |
| --- | --- |
| GraphQL memory-explorer resolver (`listAgentsWithMemory`, `listAgentEpisodes`, `listAgentTeamsWithMemory`, `listAgentOrgsWithMemory`, `listMemoryGroupMembers`, the existing team/org runs queries) | `AgentMemoryExplorerService` |
| GraphQL `agentSemanticMemoryFolder(agentDefinitionId)`, `globalSemanticMemoryFolder` | `AgentSemanticMemory` |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by |
| --- | --- | --- |
| `AgentDefinition.semanticMemoryEnabled` and its option and update type; config read/write; node reader; application source; service personal-field and edits | the switch is gone | — (drop list keeps the key name) |
| GraphQL `AgentDefinition.semanticMemoryEnabled`, the inputs' field, the converter line | same | `semanticMemoryPath: String!` |
| Personal setting `SEMANTIC_MEMORY` (record, service, GraphQL enum) | same | — |
| `package-edit-capture.ts` field | same | — |
| `AgentSemanticMemory` gate and `string \| null` returns; the composer's null branch | the gate is gone | the always-present paths |
| `AgentSemanticMemoryBrowser`, GraphQL `semanticMemoryFolders` / `semanticMemoryFiles` (in `wip-uncommitted.patch`, never committed) | replaced by the owner pages and the workspace | `folderState` / `globalFolderState`, the workspace |
| `AgentMemoryExplorerService.listAgentRunsWithMemory` and its GraphQL query (callers: the web store and `autobyteus-web/docs/memory.md` only) | replaced | `listAgentEpisodes` |
| Web: `AgentSemanticMemoryField.vue` and the form's field and reset; the detail's switch-dependent `v-if`; the store and GraphQL fields; `PersonalSetting 'SEMANTIC_MEMORY'`; localization `AgentSemanticMemoryField.*` | the switch is gone | the detail's folder sentence and path |
| Web: `MemoryHome.vue`'s card grids and `AgentMemoryDetail.vue` | the owner pages replace them | `MemoryBrowse.vue`, `AgentMemoryPage.vue`, `GroupMemoryPage.vue` |
| Tests asserting the switch or the old Browse pages | removed behaviour | rewritten (always on; owner pages); UI tests of removed parts deleted |

## Return Or Event Spine(s) (If Applicable)

The explorer stream's live updates (DS-003) are unchanged except for the watcher option.

## Bounded Local / Internal Spines (If Applicable)

The link-aware traversal: `readdir(withFileTypes) -> lstat -> directory: child folder; file: file node; link: link node (not entered); other: skipped`.

## Off-Spine Concerns Around The Spine

| Concern | Owner |
| --- | --- |
| Definition names and members | definition services (read) |
| Run summaries for a page of episodes | the existing memory summary builder and the in-memory run-history catalogs |
| Internal-agent rule | `InternalAgentVisibility` (as today) |

## Ownership Boundaries

- Only `AgentSemanticMemory` composes the semantic paths.
- Only `WorkspaceManager` creates workspaces and decides who may run in them.
- The explorer never decides read-only by itself: it reads the workspace's properties.
- The explorer service never walks folders itself: it asks the catalog or discovery.

## Boundary Encapsulation Map

| Boundary | Internal | Forbidden |
| --- | --- | --- |
| `WorkspaceManager` | workspace kinds, the cache | a runtime resolving a workspace without `getOrCreateRunWorkspace` |
| `AgentMemoryExplorerService` | catalog, discovery | the resolver calling discovery directly |

## Dependency Rules

- Allowed directions:
  - `agent-memory` → `agent-episodic-catalog` (read API) and `agent-definition`;
  - `workspaces` → `agent-memory` (paths);
  - `file-explorer` → nothing new (it reads workspace properties).
- How collaborators arrive:
  - The composition roots create `EpisodicCatalog` (as today) and call `setProcessEpisodicCatalog(catalog)` in step 2, beside it. The release is called at close.
  - The resolver's per-request service gets it through `getProcessEpisodicCatalog()` (Hidden dependency, above).
  - The standalone application host keeps catalogs too (493); it sets the binding the same way.

## Interface Boundary Mapping

| Interface | Identity |
| --- | --- |
| `AgentSemanticMemory.prepareForRun(definitionId): Promise<{ agentFolder: string; globalFolder: string }>` | definition id |
| `AgentSemanticMemory.folderState(definitionId)`, `globalFolderState()` → `{ folderPath, exists, isEmpty }` | definition id / — |
| GraphQL `listAgentEpisodes(selector: AgentWithMemorySelectorInput!, source, search, page, pageSize): AgentEpisodePage` | the existing selector: `{ attribution: DEFINITION, agentDefinitionId }` or `{ attribution: UNATTRIBUTED }`. "Unattributed" lists the standalone runs no definition names, as today |
| `AgentEpisode = { runId, subject (AGENT / TEAM_MEMBER / ORG_MEMBER + ids), place: { kind, name } \| null, summary, workspaceRootPath, lastActivityAt, memory }` | — |
| GraphQL `listMemoryGroupMembers(kind: TEAM \| ORG, definitionId, source): [MemoryGroupMember]`; `MemoryGroupMember = { kind: AGENT \| TEAM, id, name, shared, memberCount }` | explicit kind |
| `WorkspaceManager.getOrCreateRunWorkspace(id)` | workspace id |
| `TreeNode.isSymbolicLink: boolean` (JSON `is_symbolic_link`) | — |
| `EpisodicCatalog.agentDefinitionIds()`, `runsOf(id)`, `whenStartPassDone()` | definition id |

## Interface Boundary Check

All singular, with explicit identity; low risk.

## Main Domain Subject Naming Check

`SemanticMemoryWorkspace`, `globalFolder`, `listAgentEpisodes`, `listMemoryGroupMembers`, `getOrCreateRunWorkspace`: natural, and consistent with the glossary.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| An agent's runs across places (local) | `EpisodicCatalog` | Extend (read API) |
| The same, imported | `RunFolderDiscovery` | Reuse |
| Folder view | Skills workspace + file explorer + tabs | Extend (read-only, link-aware) |
| Members | team/org definitions; stored trees | Reuse |

## Subsystem / Capability-Area Allocation

`agent-memory`, `agent-episodic-catalog`, `workspaces`, `file-explorer`, `api/graphql`, `agent-execution` (runtime owners and resolvers), `agent-definition`, `personal-settings`, `agent-packages`, web `components/memory`, `components/fileExplorer`, `components/agents`, `stores`.

## Draft File Responsibility Mapping

As the final mapping.

## Reusable Owned Structures Check

`AgentWithMemorySelectorInput` is reused for episodes. There are no new shared structures beyond `AgentEpisode` and `MemoryGroupMember`.

## Shared Structure / Data Model Tightness Check

`AgentEpisode.place` is null when the run is the agent's own standalone run. `MemoryGroupMember.memberCount` is set only for `TEAM`.

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `agent-memory/services/agent-semantic-memory.ts`, `agent-memory/store/agent-memory-layout.ts` | paths, prepare, folder states |
| `agent-execution/prompt/carpenter-prompt-sections.ts`, `carpenter-prompt-composer.ts` | the two sections (DEC-013 exact text) |
| the five runtime owners | pass both paths; Claude/Codex roots |
| field-removal files (Removal Plan) | removals |
| `agent-episodic-catalog/services/episodic-catalog.ts` | read API; process binding (`getProcessEpisodicCatalog`, `setProcessEpisodicCatalog`) |
| `agent-memory/services/agent-memory-explorer-service.ts` (+ team/org explorer services where they own their lists) | owners, episodes, members |
| `api/graphql/types/memory-explorer.ts`; `api/graphql/types/semantic-memory-view.ts` (folder states only) | GraphQL |
| `workspaces/semantic-memory-workspace.ts`, `workspaces/workspace-manager.ts`, `workspaces/filesystem-workspace.ts` (the two properties, defaults false/true) | workspace |
| `file-explorer/directory-traversal.ts`, `file-explorer.ts`, `tree-node.ts`, `watcher/runtime/chokidar-watcher-runtime.ts`, `api/graphql/types/file-explorer.ts`, the workspace content route | read-only, link-aware |
| the run-bound workspace resolvers (DS-003 table) | `getOrCreateRunWorkspace` |
| `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts` | the catalog binding |
| web: `components/memory/MemoryBrowse.vue`, `AgentMemoryPage.vue`, `GroupMemoryPage.vue`, `SemanticMemoryFolder.vue`, `CollaborationMemoryDetail.vue` (embedded); `components/fileExplorer/FileExplorer.vue`, `FileItem.vue`, `FileExplorerTabs.vue` (readOnly, link rows); `components/agents/*` (switch removed, path sentence); `stores/memoryExplorerStore.ts`, `stores/workspace.ts` (register/unregister); GraphQL documents + codegen; localization `memory.ts`, `agents.ts`, `personalSettings.ts` (en, zh-CN, the spec's strings) | UI per spec |
| docs: `agent_memory.md`, `agent_definition.md`, `personal_settings.md`, `prompt_engineering.md`, `agent_execution.md`, `file_explorer` and workspace docs, web `memory.md`, `agent_management.md`; `GLOSSARY.md` | updated |

## Applied Patterns (If Any)

The transient workspace pattern of the Skills page.

## Target Subsystem / Folder / File Mapping

As above. New files: `workspaces/semantic-memory-workspace.ts`, and the four web memory components.

## Folder Boundary Check

Fits the existing folders.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

The UI/UX spec's visual references VIS-001…VIS-019. Examples of the server contract:

```
listAgentEpisodes(selector:{attribution:DEFINITION, agentDefinitionId:"team-local-agent:software-engineering-team:solution-designer"}, page:1, pageSize:25)
→ entries: [{ runId:"solution_designer_7031…", subject:{kind:TEAM_MEMBER, teamRunId:"software_engineering_team_a7e9…", agentRunId:"solution_designer_7031…"},
              place:{kind:TEAM, name:"Software Engineering Team"}, summary:"…", lastActivityAt:"2026-11-20T…", memory:{hasWorkJournal:true,…} }], total: 597
agentSemanticMemoryFolder(agentDefinitionId:"project-task-manager") → { folderPath:"/…/memory/semantic/project-task-manager", exists:true, isEmpty:false }
folderChildren(workspaceId:"semantic_ws_project-task-manager", path:"notes") → [{ name:"shared", is_file:false, is_symbolic_link:true, children:[] }, …]
writeFileContent(workspaceId:"semantic_ws_project-task-manager", …) → error WORKSPACE_READ_ONLY
```

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Decision |
| --- | --- |
| Keep `semanticMemoryEnabled` in GraphQL as deprecated | Rejected (rule 9) |
| Honour a stored `false` | Rejected (off is no longer supported) |
| Keep `listAgentRunsWithMemory` beside `listAgentEpisodes` | Rejected (one query) |
| A migration rewriting stored files | Rejected (tolerant readers) |

## Change / Refactor Sequence

1. **From `wip-uncommitted.patch`:**
   - keep the gate, the server field removal and the core tests;
   - drop `AgentSemanticMemoryBrowser`, its queries and its tests.
2. Global folder and the second prompt section through the runtimes.
3. The workspace: `SemanticMemoryWorkspace`, the manager (create, exclude from lists, `getOrCreateRunWorkspace`, resolvers switched), the explorer's option, the watcher option, mutation refusals, `isSymbolicLink`.
4. Catalog read API and binding; explorer owner queries; `listAgentEpisodes` (replacing the old query); members; folder states.
5. Web: the switch removed; the read-only explorer; the Memory page per the spec; codegen.
6. Tests: unit per runtime, explorer, workspace manager, explorer service; API/E2E per AC; the isolated instance; the UI probe; the measurement (AC-012).
7. Docs and glossary.

## Key Tradeoffs

- **Local episodes from the catalog, not discovery.** This costs nothing per request on about 4,000 runs (DESIGN.md rule 3). After a restart, the first agent page waits for the catalog's start pass (up to about 12 s on the founder's node; the spec's loading state).
- **Imported sources use one discovery per request** (474 run folders on the founder's import), measured in AC-012. Escalation: over 3 s, add a per-source cache invalidated by the source's sync time.
- **The semantic workspace instance stays cached on the server after the view closes.** It is bounded by the agents viewed, never listed and never runnable. Closing it at stream end would add lifecycle code for no user-visible gain.

## Risks

- Every agent's instructions grow by about 130 words (two sections), which stay cached.
- Concurrent writes to the global folder by several agents (N-5; accepted, DEC-014).

## Guidance For Implementation

- Reproduction: `None`.
- Never write into a semantic or global folder from the view. Never follow a link. Never create a folder from the view.
- The same release for app and node (REQ-009).
