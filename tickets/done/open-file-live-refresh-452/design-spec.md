# Design Spec — autobyteus-452

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (the user approved the Task on 2026-11-11), user informed.
- User approval of the design: `Not required`. Design status: `Ready`.
- Investigation notes: `investigation-notes.md` (same folder).
- Authorities read (design gate, in this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`. No persisted data is affected.
- Conflicts or discrepancies: None.

## Current-State Read

- The node watches the whole workspace (`chokidar-watcher-runtime.ts:40-66`). A file content change goes `watchdog-handler.handleModify` → `ModifyNodeSynchronizer`. That looks the file up in the node's lazily loaded tree (`file-explorer.ts:60-69`) and sends **nothing** when the file's folder is not loaded (`modify-node-synchronizer.ts:9-18`).
- The `modify` change is `{ type, node_id, parent_id }` (`file-system-changes.ts:49-53`; web `types/fileSystemChangeTypes.ts:32-36`, `services/fileExplorerStreaming/types.ts:34`). It is read only by the web client: `fileUtils.handleModifyChange` makes no tree change, `stateSync` skips it, and `fileExplorerTreeActions.ts:86-96` looks the node up by id and calls `invalidateFileContent`, which reloads **Text only**.
- autobyteus-450 added `_reloadOpenFile` (`fileExplorerContentActions.ts:109-133`): it reloads an open file as it was loaded (text refetch, media `contentRevision`), never touching `editorDraft`. It is used only by explicit opens.
- The window's own saves are marked in `filesToIgnoreNextModify` **by path** (`:329-342`).
- Measured (repro run 1):
  - a loaded folder refreshes in about 0.5 s, including an atomic rewrite;
  - an unexpanded folder, images and PDFs never refresh;
  - the node's watcher logged every change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 7 production files in two packages:
  - server: change type, modify synchronizer, watcher handler;
  - web: two type files, the tree-change applier, the store's modify reaction;
  
  plus tests.
- Architectural risk: `Low`
- Risk rationale: a clean-cut change of one message field set on an internal stream between the node and the web client of the same release (DESIGN.md rule 9; no other reader). No persistence, security or new concurrency; no polling. It reuses 450's reload.
- Escalation trigger: another reader of `modify`; a measurable message flood during agent bursts; the reload interfering with the editor's own save.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| Repro run 1 | A, C, D: no refresh; E, B: 0.5 s | Two defects, one fix path |
| Watcher log | Every change detected | The fix belongs after detection |
| Grep of `modify` readers | Only node + web | Clean cut allowed |

## Intended Change

A content change is addressed by **path**, not by tree node. The node sends `{ type: 'modify', path }` for every changed workspace file, loaded or not, and also when a file is (re)added. The window reloads the open file with that path through `_reloadOpenFile`.

## Change Scope (Mandatory)

- In scope: UC-001.
  - server: `src/file-explorer/file-system-changes.ts`, `tree-state-synchronizers/modify-node-synchronizer.ts`, `watcher/watchdog-handler.ts`;
  - web: `types/fileSystemChangeTypes.ts`, `services/fileExplorerStreaming/types.ts`, `utils/fileExplorer/fileUtils.ts`, `stores/fileExplorerTreeActions.ts`.
- Derived consumers: `utils/fileExplorer/stateSync.ts` skips `modify`, so there is no change. The 450 explicit-open path is unchanged. Desktop and phone share the store.
- Deliberately left alone:
  - viewers (450's `contentRevision` already drives them);
  - tree structure events;
  - files outside the workspace (FU-001);
  - `invalidateFileContent`'s other callers (the composable API, `useWorkspaceFileExplorer.ts:163-166`).
- Overlap (relayed by the PM): autobyteus-471/472 work in the same viewer area. This change does not touch viewer components. Whoever merges second rebases and reruns the other's cases.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Change | Spine |
| --- | --- | --- | --- |
| BEH-003…005 | REQ-001 / AC-001, 002 | Path-addressed modify; media reload | DS-001 |
| BEH-001, 002, 006, 007 | REQ-002 / AC-003…005 | Preserved | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `evidence/repro/open-viewer-refresh-repro.mjs` | Implementation starts from A, C, D failing |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers:
  - *Ambiguous boundary / wrong identity* (Principle 10): a content change is identified by a tree node id, which exists only for loaded folders, both on the node and in the window. Paths are already the identity of open files and of `filesToIgnoreNextModify`.
  - *Behavior by absence* (Principle 13): a refresh happens only when a lookup finds a node.
  - *Duplicated policy* (Principle 13): the live reaction (`invalidateFileContent`, Text only) and the explicit open (`_reloadOpenFile`) reload differently. One reload owner is used for both.
- Root cause classification: `Boundary Or Ownership Issue` (wrong identity for content changes).
- Refactor needed now: `Yes`, bounded: re-key `modify` by path and use one reload owner.

## Terminology

- *Content change*: a workspace file's bytes changed on disk (in place, by rename over it, or by a new file at that path). No glossary entry needed.

## Legacy Removal Policy (Mandatory)

- Removed: `node_id` and `parent_id` on `modify` (server and web); the tree lookup in `ModifyNodeSynchronizer`; the id lookup and `invalidateFileContent` call in `fileExplorerTreeActions.ts:86-96`; the unknown-node warning in `fileUtils.handleModifyChange`.
- Compatibility kept: `None` (rule 9).

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | chokidar `change`/`add` of a workspace file | Open viewer shows new content | Node: `watchdog-handler` + `ModifyNodeSynchronizer`; window: `fileExplorerTreeActions` → `_reloadOpenFile` |

## Primary Execution Spine(s)

`chokidar change|add (file) -> WatchdogHandler.handleModify|handleAdd -> ModifyNodeSynchronizer(relative path, POSIX separators) -> FileSystemChangeEvent([{ type: 'modify', path }]) -> event batcher -> /ws/file-explorer -> FileExplorerStreamingService -> fileExplorerTreeActions (modify: own-save mark? skip : open file with that path? _reloadOpenFile) -> text refetch (draft kept) | media contentRevision -> viewer`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | On a file `change`, the node sends `modify` with the file's workspace-relative path (POSIX separators), whether or not the path is in its tree. On a file `add`, it sends its structural `add` as today plus `modify` for the path, so a file replaced by a rename from another folder also refreshes. The window applies structural changes as today. For each `modify`: if the path is marked as the window's own save, it unmarks it and stops (as today); if a file with that path is open, it calls `_reloadOpenFile`; otherwise nothing, so there are no reads. | node handler; window tree actions |

## Spine Actors / Main-Line Nodes

`WatchdogHandler`, `ModifyNodeSynchronizer`, `FileExplorerStreamingService`, `fileExplorerTreeActions`, `_reloadOpenFile`.

## Ownership Map

- `ModifyNodeSynchronizer` owns turning a content change into `{ type: 'modify', path }`. It no longer reads the tree.
- `WatchdogHandler` owns which watcher events count as content changes: file `change`, and file `add` (in addition to the structural add).
- `fileExplorerTreeActions` owns the window's reaction to `modify`: own-save mark, open-file match by path, reload.
- `_reloadOpenFile` (450) owns how an open file is read again. It is the one reload owner for explicit opens and live changes.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `ModifyChange.node_id`, `parent_id` (server, web) | Wrong identity for content changes | `path` |
| Tree lookup in `ModifyNodeSynchronizer` | Drops unloaded folders | None (no lookup) |
| `nodeIdToNode` lookup + `invalidateFileContent` in the modify branch (`fileExplorerTreeActions.ts:88-95`) | Id-based, Text only | Path match + `_reloadOpenFile` |
| Unknown-node warning in `fileUtils.handleModifyChange` | No node ids any more | Nothing (no tree effect) |

## Return Or Event Spine(s)

DS-001 is itself an event spine.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Note |
| --- | --- | --- |
| Event batcher (existing) | stream | Batches bursts |
| Path normalization (POSIX) | `ModifyNodeSynchronizer` | Open files use `/`-separated workspace-relative paths |

## Ownership Boundaries

The window never reads a file because of a `modify` unless that path is open. The node sends content changes without needing its tree.

## Boundary Encapsulation Map

| Boundary | Internal | Callers |
| --- | --- | --- |
| `fileExplorerStore` | `_reloadOpenFile`, `fetchFileContent` | stream applier, explicit opens |

## Dependency Rules

Unchanged.

## Interface Boundary Mapping

| Interface | Subject | Identity Shape |
| --- | --- | --- |
| Stream change `{ type: 'modify', path: string }` | one workspace file's content | workspace-relative POSIX path |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Risk |
| --- | --- | --- | --- |
| `modify` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Change type | `modify` (unchanged name) | Its meaning (a content change) is unchanged; only its identity field changes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Detect changes | chokidar watcher | Reuse |
| Deliver | file-explorer stream + batcher | Reuse |
| Reload | `_reloadOpenFile` (450) | Reuse |

## Subsystem / Capability-Area Allocation

| Subsystem | Decision |
| --- | --- |
| Server file-explorer | Extend |
| Web file explorer | Extend |

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Structure | Decision |
| --- | --- |
| Reload of an open file | One owner (`_reloadOpenFile`) for explicit and live |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant Removed? |
| --- | --- | --- |
| `ModifyChange` | Yes (content change of a path) | Yes (`node_id`, `parent_id`) |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/file-explorer/file-system-changes.ts` | Modify | `ModifyChange(path)` |
| `autobyteus-server-ts/src/file-explorer/tree-state-synchronizers/modify-node-synchronizer.ts` | Modify | Emit for the path, no tree lookup |
| `autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts` | Modify | File `add` also emits a modify for its path |
| `autobyteus-web/types/fileSystemChangeTypes.ts`, `services/fileExplorerStreaming/types.ts` | Modify | `ModifyChange { type: 'modify'; path }` |
| `autobyteus-web/utils/fileExplorer/fileUtils.ts` | Modify | `handleModifyChange`: no tree effect, no node-id warning |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` | Modify | Path match → `_reloadOpenFile` |
| Tests: server unit (synchronizer emits for an unloaded path; add emits modify; ignored paths emit nothing); web unit (open text, image and PDF reload; a not-open path reads nothing; own save skipped; draft kept); probe case (repro shape) on the phone bundle and a desktop window | Add/Modify | AC-001…005 |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Window reaction | `if (change.type === 'modify') { if (ws.filesToIgnoreNextModify.delete(change.path)) return; const open = ws.openFiles.find(f => f.path === change.path); if (open) this._reloadOpenFile(open, change.path, workspaceId, useWindowNodeContextStore()) }` | Loading the folder into the tree to find the node; polling open files |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `node_id` next to `path` | Rejected: two identities for one change (rule 9 allows a clean cut) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server: the change type, the synchronizer and the handler, with unit tests.
2. Web: types, `fileUtils`, the tree actions, with unit tests.
3. Probe: the repro shape as a durable case: phone bundle plus a desktop window; cases A (in place and atomic), C, D, E, a text file with an unsaved edit, 20 not-open files rewritten (no reads), and a same-window save.
4. Measure the message count for a burst of 200 file changes in an unexpanded folder (RSK-001) and record it.

## Key Tradeoffs

- The node sends a `modify` for every changed file, including ones nobody has open: small messages, batched; the window ignores them. The alternative, subscribing to open paths, adds a protocol and state for no measured need.

## Risks

- RSK-001, message volume during bursts: measured in validation (step 4).
- UNK-001, an atomic write from another folder: covered by the `add` → `modify` rule and tested.

## Guidance For Implementation

- Reproduction to start from: `node /Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452/tickets/in-progress/open-file-live-refresh-452/evidence/repro/open-viewer-refresh-repro.mjs --output-dir=<fresh>`, after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`. Today A, C and D show no re-read; after the fix each re-reads within 3 s and A shows `A-VERSION-2`.
- Normalize the path with POSIX separators (`path.relative(...).split(path.sep).join('/')`).
