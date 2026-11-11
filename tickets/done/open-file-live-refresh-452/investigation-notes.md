# Investigation Notes — autobyteus-452

## Investigation Meta

- Package identifier: `open-file-live-refresh-452` (Project Task `autobyteus-452`, FU-001 of autobyteus-450)
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452`, branch `codex/open-file-live-refresh-452`
- Resolved base: `origin/personal` at `827f1e68dc`, fetched 2026-11-11; finalization target `origin/personal`
- Bootstrap: worktree created; install, server `prebuild` + `build`, `nuxt prepare`, `build:mobile-web` passed. Blocker: None.
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate; read in this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `TESTING.md`, `AGENTS.md`
- Status: reproduced and causes established.

## Initial Request And Clarifications

- Request: a file viewer left open refreshes by itself within a few seconds when the agent rewrites the file. The Task names four cases: a file in an unexpanded folder, an atomic rewrite (temporary file + rename), images, and PDFs.
- The user approved the Task on 2026-11-11 (PM message).
- Constraints:
  - no new reads when nothing changed (no polling of the folder tree; see the 434 and 446 measurements);
  - unsaved edits kept;
  - the phone reads files with its key (436);
  - isolated nodes for tests;
  - DESIGN.md and TESTING.md;
  - release only on the user's word.
- Coordination: autobyteus-471 (desktop opens any file path; big files) and 472 (phone pinch zoom) work in the same viewer area, with another SD. The platform refuses direct messages to an agent on another Task (`TASK_AGENT_RESOURCE_CONFLICT`, 2026-11-11), so the overlap list goes to the PM to relay.

## Source Log

| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-11-11 | Code | `autobyteus-server-ts/src/file-explorer/watcher/runtime/chokidar-watcher-runtime.ts:40-66` | What the node watches | chokidar on the **whole workspace** (ignore matcher, `awaitWriteFinish` 200 ms); `change`, `add`, `unlink` events |
| 2026-11-11 | Code | `…/watcher/watchdog-handler.ts:105-120`, `tree-state-synchronizers/modify-node-synchronizer.ts:9-18` | What a change becomes | `findNodeByPath` in the node's own tree; **no node → no event** (`new FileSystemChangeEvent([])`) |
| 2026-11-11 | Code | `…/file-explorer.ts:60-69, 205`, `directory-traversal.ts:40-100` | The node's tree | Built with `maxDepth`, folders loaded as the client asks (`childrenLoaded`): a file in an unexpanded folder is not in it |
| 2026-11-11 | Code | `…/file-system-changes.ts:49-53`; web `types/fileSystemChangeTypes.ts:32-36`, `services/fileExplorerStreaming/types.ts:34` | Change shape | `modify` carries `node_id`, `parent_id` only |
| 2026-11-11 | Code | web `stores/fileExplorerTreeActions.ts:75-96` | Client reaction | On `modify`, looks up the node by id in the loaded tree; calls `invalidateFileContent` (**Text only**, `fileExplorerContentActions.ts:308-316`) |
| 2026-11-11 | Code | web `stores/fileExplorerContentActions.ts:96-135` (`_reloadOpenFile`, autobyteus-450) | Existing reload | Reloads an open file the way it was loaded: media through `contentRevision`, text by refetch; `editorDraft` untouched |
| 2026-11-11 | Code | grep `ModifyChange`, `'modify'` over the server, web, application SDKs and applications | Who reads `modify` | Only the node and the web client (`fileUtils.ts` handleModifyChange: no tree change; `stateSync.ts`: skips modify; tree actions). `filesToIgnoreNextModify` is keyed by **path** (`fileExplorerContentActions.ts:329-342`) |
| 2026-11-11 | Command | `node evidence/repro/open-viewer-refresh-repro.mjs --output-dir=evidence/repro-run-1` | Reproduce | See below |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Open text file in a loaded folder rewritten in place | Refreshes about 0.5 s later (desktop and phone) | Repro E | Measured |
| BEH-002 | System | Open text file rewritten atomically (same-folder temp + rename) in a loaded folder | Refreshes about 0.5 s later: chokidar reports a `change` | Repro B; watcher log: modification | Measured (not a separate defect) |
| BEH-003 | System | Open text file in an unexpanded folder rewritten | Never refreshes: the node sends no event | Repro A; watcher saw the change | Reproduced |
| BEH-004 | System | Open image rewritten | No re-read: its folder was unexpanded (no event), and the client reloads only Text on `modify` | Repro C | Reproduced |
| BEH-005 | System | Open PDF rewritten | Same as BEH-004 | Repro D | Reproduced |
| BEH-006 | User | Explicit open of an already-open file (450) | Current content | 450 | Read |
| BEH-007 | User | Unsaved edits in an open editor | Kept on committed refreshes (`editorDraft`) | Code | Read |
| BEH-008 | System | A file open on the phone by absolute path outside the workspace (436), or an Electron local file outside the workspace | No live feed covers it | Code | Read |

## Runtime, Probe, Or Reproduction Findings

Setup: an isolated node (owner credential, scripted AGY `ECHO_INPUT` links), a `nuxt dev` desktop window and the paired phone bundle. Each file is opened from its conversation link and the viewer is left open; the file changes on disk, and the script waits 8 s.

| Case | Desktop | Phone | Established |
| --- | --- | --- | --- |
| E root text, in place | ONE → TWO; re-read 512 ms | ONE → TWO; 515 ms | Measured |
| B root text, atomic | ONE → TWO; 509 ms | ONE → TWO; 513 ms | Measured |
| A `deep/inner/a.md`, in place | ONE → ONE; no re-read | ONE → ONE; no re-read | Reproduced |
| C `pics/c.png` | no re-read | no re-read | Reproduced |
| D `docs/d.pdf` | no re-read | no re-read | Reproduced |

The node's watcher logged a modification for all five files (20 lines over both surfaces), so the changes reach the node. Cleanup: server exited, temp root removed. Evidence: `evidence/repro-run-1/repro-summary.json`, `server.log`, screenshots.

- Temporary diagnostics: None.
- Reproduction for implementation: `node <worktree>/tickets/in-progress/open-file-live-refresh-452/evidence/repro/open-viewer-refresh-repro.mjs --output-dir=<fresh>` (about 3 min). Today A, C and D show no re-read; after the fix each re-reads within a few seconds and A shows `A-VERSION-2`.

## Persisted Data And State Facts

Not affected.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/repro/open-viewer-refresh-repro.mjs` | Solution Designer | Reproduction | Current, evidence |
| `evidence/repro-run-1/` | Solution Designer | Results | Current, evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| RSK-001 | Risk | More `modify` messages: one per changed file anywhere in the workspace, also in unloaded folders | Small messages, batched by the existing event batcher; adds for unloaded areas are already sent today (`AddNodeSynchronizer` creates parents). The client ignores paths that are not open. Validation counts messages during a burst |
| UNK-001 | Unknown | An atomic write whose temporary file lives in another folder (e.g. the system temp dir) | It arrives as `add`, not `change`. The design treats `add` of an open path as a content change too |

## Architecture Investigation Findings

The cause is two-sided:
1. **Node:** a content change is expressed as a tree change against its lazily loaded tree, so a change in an unloaded folder is dropped.
2. **Client:** it reacts by node id, and for Text only.

Content changes are not structural. `fileUtils.ts:201` already says so, and the client's `filesToIgnoreNextModify` already uses paths.

## Requirement Implications

- The four Task cases reduce to two defects: unloaded folders (A, C, D) and media not reloaded (C, D). The atomic rewrite works in a loaded folder (B).
- Files outside the workspace have no live feed (BEH-008): recorded as FU-001, not in the Task's cases.
