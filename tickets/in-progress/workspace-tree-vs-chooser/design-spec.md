# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (after ARCH-REV-001)
- Approved requirements baseline: `requirements-doc.md` SR-002 (the Solution Designer within the direction; the user informed and his scenario recorded, 2026-11-05)
- Behavior-defining supplements: none
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/workspace-tree-vs-chooser/investigation-notes.md`
- Authorities read (2026-11-05): `references/architecture-design.md` and `references/design-principles.md` (both updated, read in full), `references/project-documents.md`, `DESIGN.md` (repository root; rules 7, 9, 10; "Project-specific design documents"), `GLOSSARY.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 and §6
- Conflicts: none

## SR-003 Revision Summary (ARCH-REV-001)

| Finding | Resolution |
| --- | --- |
| AR-001: no client calls GraphQL `createAgentRun`; chat and mobile prepare an agent run (`PrepareAgentRun`, `agentRunStore.ts:190-211`) and the first message activates it | The agent-run re-show point is the GraphQL **`prepareAgentRun`** resolver on success (`agent-run.ts:233`). It is the user's command: a peer node's delegation calls the service (`remote-delegation-receiver.ts:98`), not the resolver. A prepared run that is cancelled or never started leaves the folder shown, because the user chose that folder for a new run. `createAgentRun` gets no re-show; it has no caller in the repository and is recorded as FU-001 (its removal needs a check for outside callers, Principle 7) |
| AR-002: restoring a run in a hidden folder | DEC-006: the tree shows a hidden folder **while one of its runs is active** (DS-004), with that run, and hides it again when none is. Only creation and "Add workspace" bring it back for good. This covers `restoreAgentRun`, `restoreAgentTeamRun`, `restoreAgentOrgRun` and restore by message without wiring each activation path |
| AC-003 under the "while active" rule | "Active run of a folder" means a run in that folder's history groups (standalone agent runs, team runs, org runs) or one of the user's own open local or draft runs there, with an active status. Delegated copies are not in a folder's groups (E-10), so they never show a hidden folder. The web's local contexts include an opened delegated copy only when the user opens it from its coordinating run; the implementation must not count a context that is a delegated copy (test: an active delegated copy in a hidden folder leaves it hidden) |
| Recommendation: serialize writes | `WorkspaceTreeVisibility` serializes its writes through one queue, as `WorkspaceRegistryStore` does (`withSerializedMutation`) |

## Current-State Read

One registry (`workspaces.json`, a flat `{ workspaceId: rootPath }` map, E-02) serves two different purposes:
- **choosing a folder:** the chat chooser, the Project editor, the Org launch page, the application root selector, mobile launch and Settings (E-07);
- **listing runs by folder:** the desktop tree and the phone's work list (E-05, E-07).

`WorkspaceManager.removeRegisteredWorkspace` deletes the entry (E-01). Any use of the folder, including an agent's delegation, re-registers it (E-03). The tree draws a folder node only for a listed folder and skips the history of others (E-05). The server's `workspaces` query (`listVisibleWorkspaces`, E-04) already applies one visibility rule: internal workspaces are hidden while internal agents are hidden. That rule stays as it is.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale:
  - Server: a small store, two manager commands, one field and one mutation on the workspace GraphQL type, and a re-show call in four user creation commands. Web: the tree also shows a hidden folder while it has an active run.
  - Web: the workspace store, the tree's descriptors, the phone's list, the tree action, the chooser action, strings, tests.
  - About 15–20 files.
- Architectural risk: `High`
- Risk rationale: new persisted state (an additive file), a contract field and mutation used by every client, and the rule about which commands count as the user's own (DS-003) must cover every launch surface.
- Escalation trigger: a user creation surface that does not go through `prepareAgentRun`, `createAgentTeamRun`, `createAgentOrgRun` or `createWorkspace`; or a reader that needs the hidden state from somewhere other than the `workspaces` query.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| E-02 (`workspace-registry-file-persistence.ts:20-80`) | Strict flat map; atomic, validated writes | Leave it unchanged; a separate file |
| E-03 (`workspace-manager.ts:54-103`); internal `ensureWorkspaceByRootPath` callers (team, org, task agents, provisioning, lifecycle) | Re-registration happens in many internal paths | The hidden state lives outside the registry, so none of them can un-hide |
| `api/graphql/types/agent-run.ts:233` `prepareAgentRun`, `agent-team-run.ts:178` `createAgentTeamRun`, `agent-org-run.ts:208` `createAgentOrgRun`, `workspace.ts:117` `createWorkspace` | The user's own creation commands (ARCH-REV-001 checked the clients) | The only places that bring a folder back for good (DS-003) |
| `workspace-manager.ts:163-173`; `workspace.ts:76-80` | One list for every client | It gains a per-workspace `shownInWorkspacesTree` |
| E-05, `runHistoryReadModel.ts:141-176`; `useMobileWorkCatalog.ts:217` | The two run lists build from `allWorkspaces` | Filter on the new field there only |

## Intended Change

A workspace is either **shown in the Workspaces tree** or **hidden from it**; both remain registered and choosable. The tree hides a folder; the user's own new run or "Add workspace" shows it again; the chooser removes a folder deliberately.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. Server: `workspaces/` (new store, manager commands), the workspace GraphQL type, the three run-creation mutations. Web: the workspace store and its removal and hide actions, the tree descriptor builder, the phone's work list, the tree's workspace action, the chat chooser, strings (en, zh-CN). Docs: `GLOSSARY.md` (a new term), the web and server docs that describe removing a workspace.
- Derived consumers of `workspaces` / `allWorkspaces`:
  - choosers keep reading all;
  - the desktop tree and the phone's work list filter `shownInWorkspacesTree`;
  - `existingRunConfigStore` and `projectRunsProjection` resolve paths: unchanged.
- Deliberately left alone: `workspaces.json`, internal-workspace visibility, Project folder links, applications' runs (they do not re-show: not the user's command), run history and files.
- Follow-ups: FU-001 (GraphQL `createAgentRun` has no caller in the repository).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, 004, 005; AC-001, 005, 006 | Tree "Hide from Workspaces" | Hidden, still choosable | DS-001 |
| BEH-002 | REQ-002, 004; AC-002, 005 | Chooser "Remove" | Today's removal; also clears hidden | DS-002 |
| BEH-003 | REQ-003; AC-003, AC-004 | The user's run creation or "Add workspace"; or a delegation | Re-show only on the user's commands | DS-003 |
| BEH-004 | AC-001 | Tree build | Folder nodes only for shown folders | DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`. One list carries two meanings ("registered, choosable" and "shown in the tree").
- Structural triggers:
  - *Vocabulary drift* (Principle 15): "remove from Workspaces" means unregister everywhere.
  - *Derived data* (Principle 11): the tree and the phone's list derive from the same list as the choosers.
  - *Several kinds or forms* (Principle 1): run creation has three user commands and many internal paths.
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`, bounded: the hidden state gets one owner (`WorkspaceTreeVisibility`) behind `WorkspaceManager`, and one field carries it to every client.
- Design response: DS-001…DS-004.
- Intentional deferrals: none.

## Terminology

- **Shown in the Workspaces tree / hidden from the Workspaces tree:** a registered workspace's place in the desktop tree and the phone's work list. Added to `GLOSSARY.md`. "Remove" keeps its meaning: unregister.

## Legacy Removal Policy (Mandatory)

- Obsolete: the tree's "Remove from Workspaces" calling `removeWorkspace` (replaced by hide), and its texts.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Stored subject: a new file `<appData>/workspaces_hidden_from_tree.json`, holding `{ "workspaceIds": ["agent_ws_…"] }`. One entry per hidden folder; tens at most.
- Change: additive. `workspaces.json` is unchanged.
- Readers and writers: only `WorkspaceTreeVisibility`. Reads are tolerant: a missing file means none hidden; an unreadable file means none hidden, with a logged warning naming the file (rule 7). Writes are serialized through one queue and atomic (a temp file, then rename), like the registry.
- Invariant: an ID that is no longer registered is ignored when read and dropped on the next write. The `workspaceIds` field keeps one meaning.
- Decision: `Not Affected` for existing data; the new file is `Directly Usable — No Migration` (Data Migration Guideline §2):
  - (1) no migration needed;
  - (2) startup and new work never wait on it; an unreadable file only shows everything;
  - (5) the atomic writer suffices;
  - (7) one small file read once, then kept in memory;
  - (8) the only references are workspace IDs, checked against the registry when listing.
- An older build ignores the file: the tree shows everything. Acceptable (rule 9 concerns running versions; no data is lost).

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Tree action "Hide from Workspaces" | Hidden saved; the tree and the phone update | `WorkspaceManager.hideFromWorkspacesTree` |
| DS-002 | Primary | BEH-002 | Chooser "Remove" | Unregistered and un-hidden | `WorkspaceManager.removeRegisteredWorkspace` |
| DS-003 | Primary | BEH-003 | The user's run creation or "Add workspace" | Shown again | the four GraphQL commands → `WorkspaceManager.showInWorkspacesTree` |
| DS-004 | Bounded | BEH-004 | `workspaces` query | `shownInWorkspacesTree` per workspace; the two run lists filter | `listVisibleWorkspaces`; web read models |

## Primary Execution Spine(s)

- DS-001: `tree row action -> confirmation (DEC-005 text) -> workspaceStore.hideFromWorkspacesTree -> GraphQL hideWorkspaceFromTree -> WorkspaceManager.hideFromWorkspacesTree (filesystem and registered; WorkspaceRemovalGuard: refused while a run is active) -> WorkspaceTreeVisibility.hide -> result -> workspaceStore refetch -> tree and phone list drop the folder`.
- DS-002: `chooser row "Remove" -> confirmation (today's text) -> workspaceStore.removeWorkspace -> GraphQL removeWorkspace -> WorkspaceManager.removeRegisteredWorkspace (unchanged guard, close, delete entry) -> WorkspaceTreeVisibility.forget(id) -> the chooser and the tree drop it`.
- DS-003: `prepareAgentRun / createAgentTeamRun / createAgentOrgRun / createWorkspace (GraphQL resolvers) succeed -> WorkspaceManager.showInWorkspacesTree(workspace ID of the run's root path) -> WorkspaceTreeVisibility.show`. The web refetches workspaces after these, as the run lists already refresh after a creation. Internal `ensureWorkspaceByRootPath` / `createWorkspace` calls from delegation, team members, org members, task agents and applications never call it.
- DS-004: `workspaces query -> listVisibleWorkspaces -> each with shownInWorkspacesTree = !visibility.isHidden(id) -> web workspaceStore -> choosers: all; runHistoryReadModel descriptors: shown, plus hidden folders whose history groups have an active run (the read model's isActive, runHistoryReadModel.ts:97-106,261-280); useMobileWorkCatalog: the same rule`.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Hiding never closes the workspace object or touches the registry, so a run can still be started there. The active-run guard is the same one removal uses, because a hidden folder would hide its running run |
| DS-002 | Removal is today's, and it also forgets the hidden mark, so a later "Add workspace" starts clean |
| DS-003 | The user's own creation commands are the only points that bring a folder back for good. Each GraphQL resolver calls one manager method after success; the rule ("the user's command re-shows") is stated once, in `WorkspaceManager.showInWorkspacesTree`'s contract, and the four call sites are listed. Showing an already-shown folder does nothing (no write) |
| DS-004 | The field is computed on the server, so every client (desktop windows, phone) agrees after its next fetch. The "while active" part is a view rule over data the read model already has (run status), so no activation path needs wiring, and the folder hides again when its last active run stops |

## Spine Actors / Main-Line Nodes

The tree action and the chooser action (web), `workspaceStore`, the workspace GraphQL type, `WorkspaceManager`, `WorkspaceTreeVisibility`.

## Ownership Map

- `WorkspaceTreeVisibility` (new, `workspaces/workspace-tree-visibility.ts`): the hidden set, its file, tolerant read, atomic write.
- `WorkspaceManager`: the commands `hideFromWorkspacesTree`, `showInWorkspacesTree`, `removeRegisteredWorkspace` and the list. It is the only caller of `WorkspaceTreeVisibility`.
- Web `workspaceStore`: the actions; components never call GraphQL.

## Thin Entry Facades / Public Wrappers (If Applicable)

The GraphQL resolvers are thin.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| The tree action's call to `removeWorkspace` and its texts (`useWorkspaceHistoryWorkspaceRemoval.ts`, the tree row menu) | Hiding replaces it there | `hideFromWorkspacesTree` and new texts |

## Return Or Event Spine(s) (If Applicable)

The refetch after a command (DS-001…DS-003).

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Owner |
| --- | --- |
| Strings (en, zh-CN): "Hide from Workspaces", its confirmation, the chooser's "Remove" | web localization |
| `GLOSSARY.md` term | docs |

## Ownership Boundaries

Only `WorkspaceManager` touches the hidden file. Web components go through `workspaceStore`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden Bypass |
| --- | --- | --- |
| `WorkspaceManager` | `WorkspaceRegistryStore`, `WorkspaceTreeVisibility`, `WorkspaceRemovalGuard` | A resolver writing the visibility store |

## Dependency Rules

GraphQL → `WorkspaceManager` → stores. Internal run paths keep their existing `ensureWorkspaceByRootPath` dependency only.

## Interface Boundary Mapping

| Interface | Subject | Identity |
| --- | --- | --- |
| `WorkspaceManager.hideFromWorkspacesTree(workspaceId) -> { success, message, workspaceId }` | one registered filesystem workspace | `agent_ws_*` ID |
| `WorkspaceManager.showInWorkspacesTree(workspaceId)` | the same | the same |
| GraphQL `hideWorkspaceFromTree(input: { workspaceId })`; `WorkspaceMetadataInfo.shownInWorkspacesTree: Boolean!` | — | — |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Risk |
| --- | --- | --- | --- |
| all above | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Name | Natural? | Glossary? |
| --- | --- | --- |
| `hideFromWorkspacesTree`, `shownInWorkspacesTree`, `WorkspaceTreeVisibility`, `workspaces_hidden_from_tree.json` | Yes | Added: "hidden from the Workspaces tree" |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Active-run guard | `WorkspaceRemovalGuard` | Reuse |
| Atomic JSON write | the registry's persistence | Follow its pattern in the new store (its own small file) |
| Refetch | `fetchAllWorkspaces(true)` | Reuse |

## Subsystem / Capability-Area Allocation

Server `workspaces/` (Extend); web `stores/workspace*`, `components/chat`, `components/workspace/history`, `composables/mobile` (Extend).

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-tree-visibility.ts` (new) | Hidden set and file |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | `hideFromWorkspacesTree`, `showInWorkspacesTree`; `removeRegisteredWorkspace` forgets; `listVisibleWorkspaces` marks |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Field, mutation; `createWorkspace` re-shows |
| `api/graphql/types/agent-run.ts` (`prepareAgentRun`), `agent-team-run.ts` (`createAgentTeamRun`), `agent-org-run.ts` (`createAgentOrgRun`) | Re-show after creation |
| `autobyteus-web/stores/workspace.ts`, `workspaceRemovalActions.ts` (or a sibling actions file) | The field; the hide action; refetch |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Descriptors for shown folders, plus hidden ones with an active run |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | The same rule |
| `autobyteus-web/composables/useWorkspaceHistoryWorkspaceRemoval.ts` and the tree row menu | Hide, with the new confirmation |
| `autobyteus-web/components/chat/ChatWorkspaceMenu.vue` | Remove action and confirmation per user folder |
| `autobyteus-web/graphql/*` and generated types | The field and mutation |
| `autobyteus-web/localization/messages/{en,zh-CN}/…` | Strings |
| `GLOSSARY.md`; the web and server docs describing workspace removal | Docs |
| Tests: a server unit test for the store; manager and GraphQL tests (hide, guard, show, remove forgets, delegation does not show); web specs (tree and phone filter, chooser remove, tree hide) | Coverage |

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

The new store sits beside the registry store in `workspaces/`. Low risk.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Storage | `workspaces_hidden_from_tree.json`: `{ "workspaceIds": ["agent_ws_…"] }` | `workspaces.json` values turned into objects (older builds fail to read it) |
| Re-show | `prepareAgentRun` (resolver) → `showInWorkspacesTree` | `ensureWorkspaceByRootPath` re-showing (every delegation would undo the user's cleanup) |
| The user's scenario | Archive runs → hide folder → still in chat → new run there → folder back with that run | Removing the folder from chat to clean the tree |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| A flag inside `workspaces.json` | Rejected: changes its shape |

## Change / Refactor Sequence

1. The store and the manager commands, with tests.
2. GraphQL: field, mutation, the four re-show calls; codegen.
3. Web store, tree, phone, chooser, strings.
4. Docs and glossary; suites from a clean clone.

## Key Tradeoffs

- Explicit hide rather than hiding empty folders automatically: the user decides, and "Add workspace" keeps working for an empty folder.

## Risks

- A future user creation surface that does not use the four commands would not bring a folder back for good; its runs still show while active. Recorded in `showInWorkspacesTree`'s doc comment.

## Guidance For Implementation

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`, branch `codex/workspace-tree-vs-chooser`. Dependencies are not installed yet.
- Reproduction: `None` (new behavior). Isolated app data only (TESTING.md).
