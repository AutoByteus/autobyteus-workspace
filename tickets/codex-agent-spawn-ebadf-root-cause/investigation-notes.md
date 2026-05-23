# Investigation Notes: Codex `spawn EBADF` Activation Failure

Date: 2026-05-22
Investigator: solution_designer
Ticket branch/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause`
Observed user workspace: `/Users/normy/autobyteus_org/autobyteus-tutorial-videos`

## User-observed symptom

In the AutoByteus Electron app, sending the first message to the standalone `Codex` agent in workspace `autobyteus-tutorial-videos` fails immediately with UI error:

```text
An Error Occurred
spawn EBADF
```

The run shown by the user is a prepared run using:

- Agent definition: `codex`
- Runtime kind: `codex_app_server`
- Model: `gpt-5.5`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-tutorial-videos`

## Current process state during investigation

Embedded server process:

```text
PID 98772
/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus .../server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data
```

Existing AutoByteus child process:

```text
PID 12922 node /Users/normy/.nvm/versions/node/v22.21.1/bin/codex app-server
cwd: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
```

This explains why a later send in the superrepo workspace could succeed: the Codex app-server client for that cwd was already alive and did not need a new `spawn()`.

## Reproduction through the same backend path the UI uses

A direct GraphQL + WebSocket probe was used against the Electron-started server at `http://127.0.0.1:29695`:

1. `prepareAgentRun(input: CreateAgentRunInput!)`
2. WebSocket connect to `/ws/agent/:runId`
3. Send `SEND_MESSAGE` with one context file path

### Original failing run

Run: `7f230594-ead2-4760-9fda-afcf69ad884a`

Result:

```json
{
  "state": "failed",
  "accepted": false,
  "code": "ACTIVATION_FAILED",
  "message": "spawn EBADF"
}
```

Run metadata remains pre-activation:

```json
{
  "agentDefinitionId": "codex",
  "workspaceRootPath": "/Users/normy/autobyteus_org/autobyteus-tutorial-videos",
  "llmModelIdentifier": "gpt-5.5",
  "runtimeKind": "codex_app_server",
  "platformAgentRunId": null,
  "startedAt": null
}
```

### Fresh run in the same tutorial workspace

Prepared run: `e3f643fd-2220-4979-a20c-2001c486d198`

Context file:

```text
/Users/normy/autobyteus_org/autobyteus-tutorial-videos/video_tutorial_jobs/GLOBAL_SPEECH_GENERATION_CONFIG.md
```

Result: same `ACTIVATION_FAILED spawn EBADF`.

This proves the failure is not tied only to the original run id.

### Fresh run in an unrelated small workspace

Prepared run: `bf5c9f22-e263-49bc-93e4-5c56d480ed72`

Workspace:

```text
/tmp/autobyteus-codex-repro-small
```

Result: same `ACTIVATION_FAILED spawn EBADF`.

This proves the failure is not specific to files in `autobyteus-tutorial-videos`. In the current server state, starting any *new* Codex app-server cwd/client fails.

### Fresh run in superrepo workspace

Prepared run: `c702035b-e177-4696-afba-3e5e1ccc50a9`

Workspace:

```text
/Users/normy/autobyteus_org/autobyteus-workspace-superrepo
```

Result: accepted and created a Codex app-server agent run, then manually terminated to avoid unnecessary execution. This is consistent with the already-running app-server client for the superrepo cwd.

## Log evidence

Current server log entries include:

```text
SEND_MESSAGE command not accepted for agent run 7f230594-ead2-4760-9fda-afcf69ad884a: [ACTIVATION_FAILED] spawn EBADF
SEND_MESSAGE command not accepted for agent run e3f643fd-2220-4979-a20c-2001c486d198: [ACTIVATION_FAILED] spawn EBADF
SEND_MESSAGE command not accepted for agent run bf5c9f22-e263-49bc-93e4-5c56d480ed72: [ACTIVATION_FAILED] spawn EBADF
Successfully created codex_app_server agent run 'c702035b-e177-4696-afba-3e5e1ccc50a9'.
```

Older log evidence shows the same process-wide failure class on non-Codex operations too:

- `CodexAppServerClient.start(...)` during model listing
- `spawnSync git EBADF`
- Claude runtime/tool execution failures with `spawn EBADF`

These older examples show that `EBADF` is a generic child-process spawn failure after the server enters a bad resource state, not a GPT-5.5 prompt/model bug.

## File descriptor evidence

The embedded server process had about 11k open lsof rows:

```text
lsof -p 98772 | wc -l -> 11033
```

The high descriptor rows are dominated by workspace file watcher roots, especially:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- `/Users/normy/autobyteus_org/autobyteus-tutorial-videos`
- `/Users/normy/.autobyteus`
- `/Users/normy/autobyteus_org/autobyteus-com-workspace`

On macOS `lsof` renders fd numbers above 9999 with `*NNN` style output; e.g. after fd `9999r`, rows like `*000r`, `*001r`, etc. appeared under the tutorial workspace. That means the process has crossed the 10k+ descriptor range.

A standalone chokidar probe with the same watcher style on `/Users/normy/autobyteus_org/autobyteus-tutorial-videos` opened about 1,429 regular-file descriptors and released them after `watcher.close()`. This validates that the workspace watcher itself is capable of holding one fd per watched file on this macOS runtime.

## Independent EBADF reproduction under watcher pressure

A separate local Node reproduction created thousands of `fs.watch` watchers and then called `child_process.spawn('/bin/echo', ['ok'], { stdio: ['pipe','pipe','pipe'] })`.

Results:

```text
N=10220 watchers -> spawn exits successfully
N=10240 watchers -> spawn throws EBADF
N=10250 watchers -> spawn throws EBADF
N=10300 watchers -> spawn throws EBADF
N=10500 watchers -> spawn throws EBADF
```

Representative thrown stack:

```text
Error: spawn EBADF
    at ChildProcess.spawn (node:internal/child_process:420:11)
    at spawn (node:child_process:787:9)
```

This independently reproduces the same exception class without Codex, GPT-5.5, prompts, or the AutoByteus agent definition. It links the symptom to macOS/Node child-process spawning after watcher/fd pressure exceeds the threshold.

## Code path inspected

### Codex activation path

- `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts`
  - `start()` calls `spawn(this.options.command, this.options.args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] })`.
- `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts`
  - Maintains one Codex app-server client per normalized cwd.
  - A workspace/cwd with no existing client must spawn a new `codex app-server` process.

### Workspace watcher path

- `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
  - `createWorkspace()` initializes and stores workspaces in `activeWorkspaces` indefinitely.
- `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
  - `initialize()` performs shallow tree build and starts a background full scan.
  - `completeFullInitialization()` calls `fileNameIndexer.start()`.
- `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts`
  - `start()` builds the filename index and then starts the workspace watcher through `fileExplorer.ensureWatcherStarted()`.
- `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`
  - `start()` calls `chokidar.watch(workspaceRootPath, ...)` recursively.
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`
  - `disconnect()` closes the streaming session but does not stop the workspace watcher.
- `autobyteus-server-ts/src/file-explorer/file-explorer.ts`
  - `close()` stops the watcher, but workspace manager caching means this is not normally reached for visited workspaces.

## Root cause

The root cause is a missing lifecycle boundary for expensive workspace watcher resources:

1. Creating or resolving a workspace starts a background indexer.
2. The indexer unconditionally starts a persistent recursive watcher.
3. Workspaces are cached indefinitely.
4. File explorer stream disconnects do not release the underlying watcher.
5. After enough large workspaces have been opened/scanned, the server accumulates 10k+ watcher/file descriptors.
6. In that process state, new child-process activation (`spawn`) can throw `EBADF` before the Codex app-server process is created.

## Why this looked rare

It requires the embedded server to have already accumulated enough watched files/descriptors. Runs whose cwd already has a live Codex app-server client can still work because they avoid a new spawn. Runs in a new cwd fail. That matches the user observation: most agents/runs work, but this particular new Codex run fails.

## Immediate workaround

Restart AutoByteus to release the watcher descriptors. Then run Codex before opening/scanning many large workspaces.

Do not treat this as a permanent fix; the descriptors can accumulate again.

## Additional Product/Architecture Investigation: File Explorer Visibility Ownership

After the user clarified the original product purpose of the file explorer, the investigation expanded from backend descriptor pressure to the frontend/backend lifecycle that decides when watching should occur.

### Frontend findings

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Code | `autobyteus-web/stores/workspace.ts` | Find frontend live file-change stream owner | `createWorkspace()` calls `connectToFileSystemChanges(newWorkspace.workspaceId)` immediately after storing the workspace. | Remove auto-connect. |
| 2026-05-22 | Code | `autobyteus-web/stores/workspace.ts` | Find startup behavior for all workspaces | `fetchAllWorkspaces()` calls `connectToFileSystemChanges(ws.workspaceId)` for each fetched workspace. This watches every loaded workspace even if file explorer is closed. | Replace with visible-consumer live session API. |
| 2026-05-22 | Code | `autobyteus-web/stores/workspace.ts` | Find skill workspace behavior | `registerSkillWorkspace()` immediately connects to filesystem changes. | Let embedded `FileExplorer` mount drive live connection. |
| 2026-05-22 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Check desktop Files tab mounting | `FileExplorerLayout` uses `v-if="activeTab === 'files'"`, but right panel collapse uses an outer `v-show`, so hidden panel may keep Files component mounted. | Gate Files content on active tab and right-panel visible state. |
| 2026-05-22 | Code | `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | Check mobile explorer visibility | Explorer uses `v-if="hasActiveWorkspace"` plus `v-show="activeMobilePanel === 'explorer'"`; hidden mobile panels remain mounted. | Use `v-if` tied to active panel or explicit release. |
| 2026-05-22 | Code | `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Locate natural visibility entrypoint | Component currently handles search/display but does not own live stream declaration. It is the right place to declare visible file-explorer interest on mount/workspace change. | Add acquire/release calls via `WorkspaceStore`. |
| 2026-05-22 | Code | `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` | Check transport behavior | Service already owns one WS connection, reconnect, parsing, disconnect. It is a transport adapter, not the right place for workspace-wide visibility policy. | Reuse behind `WorkspaceStore`. |

### Backend findings

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Code | `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Check workspace initialization | `initialize()` builds shallow tree, creates `FileNameIndexer`, starts `completeFullInitialization()`; background task builds full tree and calls `fileNameIndexer.start()`. | Remove watcher-triggering background path; defer full scan/search work. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | Check indexer lifecycle | `start()` calls `fileExplorer.ensureWatcherStarted()` and subscribes to live watcher events. | Split snapshot index from live monitoring. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` | Check stream watcher ownership | `connect()` calls `ensureWatcher()`, which starts watcher; `disconnect()` closes session but has no explicit watcher lease to release. | Add acquire/release lease lifecycle. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` | Check session cleanup | `close()` pushes null to outbound queue but does not explicitly call `return()` on the watcher event generator. | Make close async and cancel generator/subscription. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts` | Check public watcher API | `ensureWatcherStarted()` starts watcher and offers no release token. | Replace direct public usage with `acquireWatcherLease()`. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Check concrete watcher holder | `close()` calls `fileWatcher.stop()` but current stop is void and fileWatcher is not clearly nulled through explicit stop API. | Add async stop and clear active watcher reference. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Check chokidar close | `stop()` calls `void this.watcher.close()` rather than awaiting descriptor release. | Make stop async and await close. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Check request/response operations | File content, search, folderChildren, and mutations are GraphQL request/response operations and can remain independent from live watchers. | Ensure they do not start watchers implicitly. |

### Refined current-flow conclusion

The root cause is a two-sided lifecycle mismatch:

1. Frontend currently opens file system streams when workspaces are loaded, not when the file explorer is visible.
2. Backend currently starts recursive watchers from workspace/indexer initialization and streaming setup without a release lease.

The correct refactor must therefore alter both sides:

- Frontend: visible file explorer surfaces acquire/release live stream interest.
- Backend: live stream sessions acquire/release watcher leases.
- Search/snapshot/file operations remain on-demand request/response flows.

This is stronger than an idle cleanup-only patch because it aligns resource lifetime with actual product intent: users only need live monitoring while they are looking at file explorer.

## Architecture Review Round 1 Findings And Revision Notes

Architecture review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`

Decision: Fail — Design Impact. Overall direction accepted, but two lifecycle gaps required upstream revision.

### AR-001: Mobile hidden `RightSideTabs` file-explorer path

Additional current-state finding:

- `WorkspaceMobileLayout.vue` has a dedicated mobile `explorer` panel, but it also mounts `RightSideTabs` in the mobile `tools` panel through `v-show`.
- `RightSideTabs.vue` uses global right-side-tab state and can render `FileExplorerLayout` when `activeTab === 'files'`.
- Therefore a second mobile file-explorer path exists today: mobile active panel can be something other than `explorer`, while mobile tools `RightSideTabs` remains mounted and can host the files tab.

Revision decision:

- The dedicated mobile `explorer` panel is the only mobile file-explorer live surface.
- Mobile tools `RightSideTabs` must run in a no-files/mobile-tools mode that filters out `files`, disables auto-switch-to-files behavior, and cannot render `FileExplorerLayout`.
- Requirements updated with REQ-004A and AC-004A.
- Design spec updated in current-state read, ownership map, removal plan, file responsibilities, examples, and validation plan.

### AR-002: WebSocket close before async `connect()` resolves

Additional current-state finding:

- `autobyteus-server-ts/src/api/websocket/file-explorer.ts` currently stores `sessionId` only after `fileExplorerStreamHandler.connect(...)` resolves.
- The route close handler returns if `sessionId` is still null.
- Once watcher leases are introduced, a socket close during async setup could happen before `sessionId` assignment; a late-created session/lease would not be disconnected by the current route.

Revision decision:

- The route owns raw socket lifecycle and pending-connect cleanup before a session id exists.
- The route must register close/error cleanup before authorization/connect, track `closed`, `cleanupStarted`, `connectPromise`, and `sessionId`, skip connect if already closed, and disconnect any late session id after early close.
- `FileExplorerStreamHandler.connect()` must be atomic: on setup failure after lease acquisition or session creation, it releases the lease and closes any partial session before returning null/rejecting.
- Requirements updated with REQ-009A, REQ-009B, AC-014, and AC-015.
- Design spec updated with DS-007, route/handler cleanup contract, file responsibility mappings, examples, and validation plan.

### Post-restart continuation verification

After the computer restart, continued in the same dedicated worktree/branch and re-verified the two architecture-review blockers before resending:

- Command: `rg -n 'AR-001|AR-002|mobile-tools|Pending file-explorer|DS-007|REQ-004A|REQ-009A|REQ-009B|AC-004A|AC-014|AC-015' tickets/codex-agent-spawn-ebadf-root-cause/*.md`
  - Result: requirements, investigation notes, and design spec all contain the revised mobile-tools and pending-connect coverage.
- Source re-read: `autobyteus-web/components/layout/RightSideTabs.vue`
  - Confirmed current `RightSideTabs` still has a global Files tab path and auto-switch-to-files watcher; design therefore explicitly requires mobile-tools/no-files mode to filter `files` and disable that auto-switch behavior in mobile tools.
- Source re-read: `autobyteus-web/components/layout/WorkspaceMobileLayout.vue`
  - Confirmed current dedicated explorer uses `v-show` and mobile tools hosts `<RightSideTabs />` through `v-show`; design therefore covers both direct and nested mobile explorer paths.
- Source re-read: `autobyteus-server-ts/src/api/websocket/file-explorer.ts`
  - Confirmed current close handler is installed after auth/connect setup and returns when `sessionId` is null; design therefore registers cleanup before auth/connect and tracks late-session disconnects.
- Additional design tightening:
  - Added explicit `WorkspaceDesktopLayout.vue` ownership for desktop collapsed right-panel unmount/visibility so AC-003 has a concrete file target.
  - Expanded the route cleanup pseudocode to catch `connect()` rejection and to close the socket only when it is still open, while leaving handler-level setup cleanup authoritative for leases/sessions.

## Late Release Blocker: Historical Run Open Eager Workspace Activation

### Context

During packaged Electron validation of the current-ticket implementation, the user observed that opening a historical run row was very slow. The user noted that after opening the run, clicking the Files area was fast, suggesting the workspace/file-system cost may already have been paid during history-row opening. The user clarified this is not a follow-up because the current ticket cannot be released if history opening is too slow.

A temporary separate worktree/ticket was mistakenly created for `history-run-lazy-workspace-activation`; it was removed and the scope was folded back into the current `codex-agent-spawn-ebadf-root-cause` ticket as a same-ticket design-impact rework.

### Required design-reference reload

Per user request, reloaded the shared solution-designer design guidance before revising scope:

- Source: `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md`
  - Relevant principles: spine inventory, ownership clarity, authoritative boundary rule, explicit identity shapes, no mixed subject/generic boundary, no compatibility/dual-path retention.
- Source: `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md`
  - Relevant examples: request-flow shape, generic-list/generalist-boundary bad practice, thin facade vs governing owner distinction.

### Current code path evidence

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Code | `autobyteus-web/stores/runHistoryLoadActions.ts` | Find history row open path | `openHistoricalRun()` passes `ensureWorkspaceByRootPath` into `openAgentRun()`; `ensureRunHistoryWorkspaceByRootPath()` may call `workspaceStore.fetchAllWorkspaces()` and then `workspaceStore.createWorkspace({ root_path })`. | Replace history-open eager creation with lazy workspace reference. |
| 2026-05-22 | Code | `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Find run-open coordinator responsibility | `openAgentRun()` calls `loadRunContextHydrationPayload()` before selecting/upserting the run context. | Preserve history-open coordinator but change workspace dependency contract. |
| 2026-05-22 | Code | `autobyteus-web/services/runHydration/runContextHydrationService.ts` | Find hydration root cause | `loadRunContextHydrationPayload()` calls `input.ensureWorkspaceByRootPath(resumeConfig.metadataConfig.workspaceRootPath)` before building `AgentRunConfig`. | Main frontend coupling to remove. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Check backend workspace creation semantics | `WorkspaceManager.createWorkspace()` always awaits `workspace.initialize()`; `ensureWorkspaceByRootPath()` delegates to `createWorkspace()`. | Need cheap reference/materialization split. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Check initialization cost | `initialize()` calls `fileExplorer.buildWorkspaceDirectoryTree(1)`. | Confirms history open can pay tree traversal. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts` | Check root path identity capability | `buildFilesystemWorkspaceId(rootPath)` deterministically hashes root path; mappings persist id-to-root. | Reuse as identity owner; do not add ad hoc helper. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts` | Check canonicalization | `canonicalizeWorkspaceRootPath()` normalizes/resolves/trims trailing separators. | Canonical path can serve as local filesystem identity basis. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` and `WorkspaceConverter` | Check API shape | `createWorkspace` returns `WorkspaceInfo` including shallow `fileExplorer`; `workspaces` serializes shallow tree. | Existing `WorkspaceInfo` is too heavy for history workspace identity. |
| 2026-05-22 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Check later file explorer materialization path | `folderChildren()` uses `getOrCreateWorkspace(workspaceId)` and may call `buildWorkspaceDirectoryTree()` for unloaded folders. | Lazy file-tree materialization still needs loading state; folder-scope optimization may be separate if needed. |

### Current history-open flow

```text
User clicks historical run row
-> runHistoryStore.openRun()
-> openHistoricalRun()
-> openAgentRun()
-> loadRunContextHydrationPayload()
-> GraphQL getRunProjection + getAgentRunResumeConfig + getRunFileChanges
-> ensureWorkspaceByRootPath(resumeConfig.metadataConfig.workspaceRootPath)
-> workspaceStore.fetchAllWorkspaces() or workspaceStore.createWorkspace()
-> backend WorkspaceManager.createWorkspace()
-> FileSystemWorkspace.initialize()
-> fileExplorer.buildWorkspaceDirectoryTree(1)
-> run context is finally built/selected
```

### Root-cause refinement

The original watcher design issue is fixed at the live monitoring layer, but the current ticket still has a related workspace lifecycle boundary issue:

- Historical run viewing needs historical metadata, not a live/current workspace.
- `workspaceRootPath` is already persisted in `RunMetadataConfigPayload` and is the meaningful historical identity.
- `AgentRunConfig.workspaceId` pressure causes history hydration to convert root path into live workspace id immediately.
- That conversion goes through a heavyweight workspace creation boundary that also initializes a file tree.

Classification update: `Boundary Or Ownership Issue / Shared Structure Looseness` in addition to the original watcher `Missing Invariant`. `WorkspaceInfo` and `AgentRunConfig.workspaceId` are too coarse for this use case because they collapse distinct subjects:

1. historical workspace reference,
2. current initialized workspace metadata,
3. file explorer snapshot.

### Revised design direction

Fold this into the same ticket:

- Historical run opening should hydrate using `workspaceRootPath`/cheap workspace reference only.
- Server should expose or reuse a cheap reference boundary that canonicalizes root path and derives deterministic workspace id without initializing `FileSystemWorkspace` or building a tree.
- File-tree surfaces/actions should explicitly materialize/initialize workspace at their own boundary: Files, context picker browsing, and similar. Terminal and resume/rerun should use `workspaceRootPath` directly unless a future runtime path truly needs file-tree state.
- Missing/inaccessible workspace paths must not block viewing stored history; errors surface only when current workspace functionality is used.

## Architecture Review Round 3 Findings And Revision Notes

Architecture review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`

Decision: Fail — Design Impact. Prior watcher findings AR-001 and AR-002 remain resolved. The new blockers were AR-003 (`WorkspaceReference` not integrated into run context/config data model) and AR-004 (team historical hydration path not concretely designed).

### Additional current code evidence for AR-003

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Design Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Code | `autobyteus-web/types/agent/AgentRunConfig.ts` | Check current config shape | `AgentRunConfig` has `workspaceId: string | null` and no `workspaceReference` companion carrying root path/display metadata. | Define `workspaceId` as deterministic reference id only and add `workspaceReference`. |
| 2026-05-22 | Code | `autobyteus-web/types/agent/TeamRunConfig.ts` | Check team config shape | `TeamRunConfig` has `workspaceId: string | null` and no primary/team workspace reference. | Add `workspaceReference`; define primary/team reference semantics. |
| 2026-05-22 | Code | `autobyteus-web/types/agent/AgentContext.ts` | Check context ownership | `AgentContext` only carries `config` and `state`; workspace identity is consumed through config. | Keep reference in config; do not duplicate materialization state in context. |
| 2026-05-22 | Code | `autobyteus-web/types/agent/AgentTeamContext.ts` | Check historical team state | `HistoricalTeamHydrationState` stores member metadata and projection load state but no per-member workspace reference map. | Add `memberWorkspaceReferencesByRouteKey`. |
| 2026-05-22 | Code | `autobyteus-web/stores/workspace.ts` | Check active workspace selectors | `activeWorkspace()` reads selected `config.workspaceId` and returns `workspaces[workspaceId]`; `currentWorkspaceTree()` reads `activeWorkspace.fileExplorer`. | Add `activeWorkspaceReference`; keep `activeWorkspace` initialized-only; do not materialize from getter. |
| 2026-05-22 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Check display consumer | `resolveWorkspacePath(workspaceId)` displays paths from `workspaceStore.workspaces[workspaceId]` only. | Display from `config.workspaceReference` before initialized workspace lookup. |
| 2026-05-22 | Code | `autobyteus-web/stores/agentRunStore.ts` | Check send/resume path | `sendUserInputAndSubscribe()` derives `workspaceRootPath` from `workspaceStore.workspaces[workspaceId]` when `workspaceId` exists and falls back to resume metadata only when no workspace id exists. | Prefer `config.workspaceReference.workspaceRootPath` for existing/historical runs; do not initialize to recover path. |
| 2026-05-22 | Code | `autobyteus-web/components/workspace/tools/Terminal.vue` | Check Terminal action consumer | Terminal derives its connection from an initialized workspace id path, so historical references without initialized workspace cannot connect cheaply. | Superseded by 2026-05-23 finding: Terminal must use the focused/active `WorkspaceReference.workspaceRootPath` directly, not materialize before connecting. |

AR-003 design decision:

- `WorkspaceReference` is a metadata-only identity/display object: deterministic `workspaceId`, canonical `workspaceRootPath`, display name, and kind. It does not include file explorer tree and does not include mutable materialization status.
- Mutable materialization state is centrally owned by `WorkspaceStore`, keyed by reference id.
- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` mean deterministic reference id only, not proof that `WorkspaceStore.workspaces[workspaceId]` exists.
- Target configs carry both `workspaceId` and `workspaceReference`; initialized `WorkspaceInfo` remains exclusively in `WorkspaceStore.workspaces`.

### Additional current code evidence for AR-004

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Design Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Code | `autobyteus-web/stores/runHistorySelectionActions.ts` | Check team history entrypoint | `openTeamMemberRunFromHistory()` calls `openTeamRun()` and passes `ensureWorkspaceByRootPath`. | Team historical open must pass/use a cheap reference resolver, not eager materialization. |
| 2026-05-22 | Code | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Check team open coordinator | `openTeamRun()` consumes `firstWorkspaceId` from hydration and reconstructs `TeamRunConfig` with it. | Replace `firstWorkspaceId` handoff with `primaryWorkspaceReference`. |
| 2026-05-22 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Check live/historical team branches | Both live and historical branches call `buildTeamMemberContexts({ ensureWorkspaceByRootPath })`; historical branch fetches focused projection but still builds all members through the eager helper. | Split live materialization helper from historical shell/reference helper. |
| 2026-05-22 | Code | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Check member context builder | `buildTeamMemberContexts()` loops every flattened agent member and calls `ensureWorkspaceByRootPath(member.workspaceRootPath)` before building member config. | Historical helper must resolve `WorkspaceReference` only and must not call materialization. |
| 2026-05-22 | Code | `autobyteus-web/utils/teamRunConfigUtils.ts` | Check config reconstruction | `reconstructTeamRunConfigFromMetadata({ firstWorkspaceId })` writes that id into `TeamRunConfig.workspaceId` and loses root-path/display metadata. | Accept `primaryWorkspaceReference` and derive `workspaceId` from it. |
| 2026-05-22 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:ensureHistoricalTeamMemberHydrated` | Check sibling hydration | Sibling focus fetches projection and applies it to existing member context; it does not inherently need workspace materialization if shell references already exist. | Keep this path projection-only; no workspace materialization. |

AR-004 design decision:

- Historical team hydration gets its own spine: team row/member click -> team open coordinator -> historical team hydration -> member workspace references -> shell contexts -> focused projection render.
- The current generic `buildTeamMemberContexts({ ensureWorkspaceByRootPath })` must be split into live and historical helpers because the materialization mode differs by branch.
- Historical team shells carry per-member `workspaceReference` values and a team-level `primaryWorkspaceReference`; `firstWorkspaceId` is removed/replaced or, if temporarily retained during refactor, documented as a reference id only.
- Focusing a historical sibling member hydrates projection only; Files/context file-tree actions for a focused member materialize that member's reference at the action boundary; Terminal uses that member's reference root path directly.

## Same-Ticket Release Blocker: Terminal Still Uses Materialized Workspace Path

Date: 2026-05-23
Trigger: While validating the latest delivered Electron build, the user observed that opening the `Terminal` tab can be very slow and asked whether Terminal is still using the old workspace/materialization path.

### Current code evidence

| Source Type | Exact Source / Command | Relevant Finding | Design Impact |
| --- | --- | --- | --- |
| Code | `autobyteus-web/components/workspace/tools/Terminal.vue` | `connectTerminal()` calls `ensureWorkspaceForTerminal()`. That function calls `workspaceStore.ensureWorkspaceInitialized(reference)` whenever an explicit initialized workspace is not already present. | Terminal currently materializes a workspace before connecting. |
| Code | `autobyteus-web/components/workspace/tools/Terminal.vue` | The xterm instance writes `➜ Connected to Workspace Terminal` during terminal widget initialization, before the backend WebSocket has necessarily opened. | UI can claim connection while backend Terminal may still be materializing/connecting. |
| Code | `autobyteus-web/composables/useTerminalSession.ts` | `TerminalSessionOptions` requires `workspaceId`; `connect()` builds `${terminalWs}/${workspaceId}/${sessionId}`. | Frontend transport shape assumes an initialized workspace-id target, not a root-path/cwd target. |
| Code | `autobyteus-web/stores/workspaceReferenceActions.ts` | `ensureWorkspaceInitializedForStore()` calls `store.createWorkspace({ root_path: reference.workspaceRootPath })` and waits for the backend mutation. | Terminal's frontend path reaches the heavy workspace create/materialization boundary. |
| Code | `autobyteus-server-ts/src/api/websocket/terminal.ts` | Route `/ws/terminal/:workspaceId/:sessionId` rejects unless `workspaceManagerInstance.getWorkspaceById(workspaceId)` returns a workspace; it then passes `workspace.getBasePath()` into `handler.connect(...)`. | Backend Terminal requires an already materialized workspace only to obtain cwd. |
| Code | `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | `connect(connection, workspaceId, sessionId, cwd)` passes `cwd` to `PtySessionManager.createSession(...)`; it does not otherwise need file explorer state. | Handler can accept a validated cwd directly. |
| Code | `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | `createSession(sessionId, workspaceId, cwd)` starts the PTY with `session.start(cwd)` and stores `workspaceId` only for grouping/close-all behavior. | Session manager can use optional `workspaceKey`/cwd grouping instead of requiring materialized workspace identity. |
| Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | `createWorkspace()` awaits `workspace.initialize()` before registering. | Any frontend Terminal call to `createWorkspace()` pays initialization latency. |
| Code | `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | `initialize()` calls `fileExplorer.buildWorkspaceDirectoryTree(1)` and creates search/index structures. | Terminal does not need this tree/index setup; it only needs cwd. |
| Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` and `autobyteus-web/graphql/queries/workspace_queries.ts` | `workspaceReference(rootPath)` already returns deterministic `workspaceId`, canonical `workspaceRootPath`, display name, and kind without `WorkspaceManager.createWorkspace()`. | Existing cheap reference boundary is sufficient for selecting Terminal cwd. |
| Logs | `/Users/normy/.autobyteus/logs/app.log`, searched with `grep -nE "Terminal websocket|Created terminal session|Creating new workspace|Initialized FileSystemWorkspace|GraphQL mutation to create workspace"` | Recent packaged-Electron logs show workspace create/init events around historical navigation and Terminal sessions, e.g. `GraphQL mutation to create workspace`, `Creating new workspace for rootPath: ...`, `Initialized FileSystemWorkspace...`, followed by `Terminal websocket attached...` / `Created terminal session...`. | Confirms the runtime still exercises workspace materialization and Terminal connection paths in the same user flow. |

### Current Terminal data flow

```text
Terminal tab click
-> Terminal.vue connectTerminal()
-> ensureWorkspaceForTerminal()
-> workspaceStore.ensureWorkspaceInitialized(reference)
-> workspaceStore.createWorkspace({ root_path })
-> GraphQL createWorkspace
-> WorkspaceManager.createWorkspace()
-> FileSystemWorkspace.initialize()
-> buildWorkspaceDirectoryTree(1)
-> useTerminalSession.connect(workspaceId)
-> /ws/terminal/:workspaceId/:sessionId
-> workspaceManager.getWorkspaceById(workspaceId)
-> workspace.getBasePath()
-> TerminalHandler.connect(..., cwd)
-> PtySessionManager.createSession(..., cwd)
```

### Root-cause refinement

Terminal is a cwd/root-path feature, not a file-tree feature. The PTY backend only needs:

- an authenticated WebSocket,
- a validated/canonical cwd path,
- a terminal session id,
- optional grouping metadata for close/list behavior.

It does not need:

- `WorkspaceInfo.fileExplorer`,
- shallow or full directory tree construction,
- file explorer live streams,
- file explorer watcher leases,
- `WorkspaceManager.createWorkspace()` or `FileSystemWorkspace.initialize()` for ordinary filesystem workspaces.

Therefore Terminal belongs in the same root-path/reference category as history display and resume/rerun. Files/context picker file browsing remain materialized-workspace/file-tree features.

### Same-ticket design impact

The current ticket cannot be considered releasable if Terminal still materializes workspaces on open. The design must add DS-012 and require:

1. `Terminal.vue` resolves the active/focused `WorkspaceReference` and passes `workspaceRootPath` to the terminal session composable.
2. `useTerminalSession.ts` accepts a root-path terminal target rather than an initialized workspace-id-only target.
3. `api/websocket/terminal.ts` authorizes, canonicalizes, and validates the cwd/root path directly, then calls the terminal handler with cwd.
4. `TerminalHandler` / `PtySessionManager` start the PTY with validated cwd and optional workspace grouping metadata, without workspace materialization or file-explorer APIs.
5. Missing/inaccessible cwd errors surface when Terminal is opened; they do not block history display and do not mutate run context.

## Architecture Review Round 5 Findings: Mobile Terminal And Terminal Pending Cleanup

Architecture review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`

Decision: Fail — Design Impact. Prior watcher and lazy-history findings remained resolved, but the Terminal root-path revision was incomplete in two places: the secondary mobile Terminal surface and backend Terminal WebSocket cleanup during pending async connect.

### Additional current code evidence for AR-005

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Design Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-05-23 | Code | `autobyteus-web/components/mobile/MobileTools.vue` | Verify mobile Tools Terminal target path | `MobileTools.vue` imports `useWorkspaceStore`, computes `workspaceFromContext`, derives `terminalWorkspaceId`, and renders `<Terminal :workspace-id="terminalWorkspaceId" />`. Agent/team contexts search `workspaceStore.allWorkspaces` by normalized root path; workspace contexts require `workspaceStore.workspaces[context.workspaceId]`. | Remove `workspaceFromContext` / `terminalWorkspaceId` as the Terminal gate; compute `TerminalTarget` directly from root-path context data. |
| 2026-05-23 | Code | `autobyteus-web/types/mobileWork.ts` | Verify whether mobile context already has root-path data | `MobileWorkContext` carries `agent-run.workspaceRootPath`, `team-run.workspaceRootPath` with `focusedMemberRouteKey`, and `workspace.rootPath` with optional `workspaceId`. Definition contexts have no root path. | Use these root-path fields as Terminal cwd input; show choose-work prompt only when no root path exists. |
| 2026-05-23 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue` | Locate mobile Tools surface in the active-tab spine | `MobileWorkShell.vue` renders `<MobileTools :context="context" />` when `activeTab === 'tools'`. | Treat MobileTools as a first-class Terminal host in the design, not as a passive wrapper. |
| 2026-05-23 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Verify mobile catalog origin of root-path fields | Recent agent/team run contexts are built from run metadata `workspace.workspaceRootPath`; workspace contexts are built from workspace `rootPath`. | Confirms MobileTools does not need initialized `WorkspaceInfo` to build cwd labels/targets. |
| 2026-05-23 | Code | `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Verify focused team member selection | Focused route key comes from `teamContext.focusedMemberRouteKey` or `MobileWorkContext.focusedMemberRouteKey`; changing focus calls `focusMemberAndEnsureHydrated()` and updates mobile store focus memory. | For team-run Terminal, prefer an already-hydrated focused member `AgentContext.config.workspaceReference`; otherwise fall back to `MobileWorkContext.workspaceRootPath` without materialization. |
| 2026-05-23 | Code | `autobyteus-web/components/mobile/MobileChat.vue` and `autobyteus-web/stores/agentTeamContextsStore.ts` | Verify how mobile components access active agent/team contexts | Mobile Chat already reads `agentContextsStore.getRun(context.runId)` and `teamContextsStore.getTeamContextById(context.teamRunId)`; team store exposes `leafAgentContextsByRouteKey` and `focusedMemberContext`. | MobileTools may use the same stores only as already-loaded reference sources, not as a reason to initialize workspaces. |

AR-005 design decision:

- `MobileTools.vue` owns the mobile context-to-`TerminalTarget` conversion.
- For `agent-run`, it uses an already-loaded `AgentRunConfig.workspaceReference` when available and otherwise `MobileWorkContext.workspaceRootPath`.
- For `team-run`, it reads the current focused member from an already-loaded team context when present and otherwise uses the mobile context root path. It must not hydrate/materialize a member workspace only to open Terminal.
- For `workspace`, it uses `MobileWorkContext.rootPath`; `workspaceId` is optional grouping metadata only.
- Definition contexts have no root path and show the existing choose-work prompt.
- `MobileTools.vue` must pass `<Terminal :target="terminalTarget" />` or equivalent root-path target shape; it must not pass initialized `workspaceId` as the required Terminal contract.

### Additional current code evidence for AR-006

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Design Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/websocket/terminal.ts` | Verify Terminal WebSocket lifecycle | Current route stores `connectedSessionId` after `handler.connect(...)` resolves; the close handler returns when `connectedSessionId` is null. It also queues messages while connect is pending. | Add route-owned `closed`, `cleanupStarted`, `connectPromise`, `connectedSessionId`, and pending-message cleanup before auth/connect starts. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Verify Terminal handler boundary | Handler creates a PTY session and can disconnect by session id; it does not need file-explorer watcher state. | Route should disconnect late-created session ids; handler should guarantee partial session cleanup on setup failure. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | Verify retained resource type | PTY sessions are process/read-loop resources. Session manager stores sessions by id and exposes session-count/close behavior used by tests. | Add validation that early close/setup failure returns `PtySessionManager.sessionCount` to baseline and leaves no retained PTY/read loop. |

AR-006 design decision:

- `api/websocket/terminal.ts` owns raw WebSocket lifecycle before `TerminalHandler.connect()` returns a session id.
- Close/error cleanup must be registered before authorization, cwd validation, and `connect()`.
- If close/error wins before `connectPromise` resolves, cleanup clears pending input and chains a late disconnect for any returned session id.
- `TerminalHandler.disconnect()` must be idempotent because close/error/late-connect paths can race.
- `TerminalHandler.connect()` / `PtySessionManager` must close partial sessions if setup fails after PTY creation but before route ownership is established.

### Root-cause refinement

The Terminal root-path design was correct but not yet stretched across the full data-flow spine. Desktop Terminal, mobile Tools Terminal, frontend session composable, backend route, and PTY manager all participate in one root-path Terminal capability. If any entry surface keeps the initialized-workspace-id contract, Terminal still reintroduces the same materialization latency and descriptor pressure the ticket is removing. If the backend route lacks pending-connect cleanup, the fix removes workspace watchers but can still retain terminal process resources after disconnect races.

## Round 6 Current-State Evidence: WorkspaceMetadata + Lazy Single FileExplorer

User clarified that the intended architecture is not merely “lazy materialized workspace,” but a stricter split:

```text
Workspace = WorkspaceMetadata + optional lazy FileExplorer capability
```

The cheap identity object should be named `WorkspaceMetadata`; the existing target/design name `WorkspaceReference` is less accurate because it sounds like a live handle. The backend has only one local filesystem, so `BaseFileExplorer` and `LocalFileExplorer` add false variability.

### Additional code evidence

| Date | Source Type | Exact Source / Query / Command | Relevant Finding | Design Follow-Up |
| --- | --- | --- | --- | --- |
| 2026-05-23 | Code | `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Constructor immediately creates `this.fileExplorer = new LocalFileExplorer(this.rootPath)`. `initialize()` builds shallow tree and creates `FileNameIndexer`/search strategy. | Workspace construction must become metadata-only; FileExplorer must be optional/lazy. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | `createWorkspace()` constructs `FileSystemWorkspace`, awaits `workspace.initialize()`, and stores it. `getOrCreateWorkspace()` can call `ensureWorkspaceByRootPath()` and therefore initialize tree state. | Workspace manager methods must return metadata-bearing workspace without FileExplorer creation/tree traversal. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts` and `local-file-explorer.ts` | `BaseFileExplorer` has only one current implementation, `LocalFileExplorer`, which mostly forwards to `file-explorer/FileExplorer` while adding watcher lease logic. | Collapse base/local/adaptee split into one concrete `FileExplorer`. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Owns local traversal, file operations, watcher start/stop, and tree state already. | Make this the single authoritative file explorer and move lease logic into it. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` and `converters/workspace-converter.ts` | GraphQL `WorkspaceInfo` includes nullable `fileExplorer`; converter calls `workspace.getFileExplorer().toShallowJson(1)`. | General workspace metadata API must stop returning file tree payload. |
| 2026-05-23 | Code | `autobyteus-web/stores/workspace.ts` | Frontend `WorkspaceInfo` includes `fileExplorer: TreeNode` and `nodeIdToNode`. `createWorkspace()` converts `newWorkspace.fileExplorer`; `fetchAllWorkspaces()` converts `ws.fileExplorer`. | Frontend metadata state must split from FileExplorer tree state. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` and `agent-run-service.ts` | Prepare/activate/restore call `workspaceManager.ensureWorkspaceByRootPath()` to derive `workspaceId`, which currently builds tree state. | Runtime paths should derive/cache `WorkspaceMetadata` only. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-resolver.ts` and `claude/claude-workspace-resolver.ts` | Resolver calls `workspaceManager.getOrCreateWorkspace(workspaceId)` to get cwd, which can initialize workspace/file tree. | Runtime cwd resolution should read metadata/id mapping/rootPath directly. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | FileExplorer resolvers currently call `getOrCreateWorkspace(workspaceId)` and then `workspace.getFileExplorer()` or `workspace.searchFiles()`. | These are the correct consumers to acquire FileExplorer, but the API should name that boundary explicitly. |
| 2026-05-23 | Code | `autobyteus-web/components/skills/SkillWorkspaceLoader.vue` and `workspace.ts:registerSkillWorkspace()` | Skill loader registers a transient workspace and `registerSkillWorkspace()` immediately calls `fetchFolderChildren(workspaceId, "")`. | Skill metadata registration should not fetch tree unless a visible skill FileExplorer requests it. |

### Round 6 design decision

- Rename/recast `WorkspaceReference` target to `WorkspaceMetadata`.
- Make backend workspace creation/list/id resolution metadata-only.
- Treat FileExplorer as a lazy optional capability under a workspace, not as part of workspace creation.
- Remove `BaseFileExplorer` and `LocalFileExplorer`; keep one concrete local `FileExplorer` owner.
- Move file search fully under FileExplorer.
- For every data-flow span, explicitly mark whether FileExplorer can be created. Agent/Terminal/History/runtime spans must all be `No`; Files/Skill/Context file browser/search spans are `Yes`.


## Round 7 Current-State Framing: WorkspaceManager API Is Good, Implementation Is Too Eager

User clarification on 2026-05-23 refined the target from “rename everything to metadata” to an API-preserving architecture correction:

```text
WorkspaceManager.createWorkspace(rootPath)
  should create/register a Workspace
  should not create/register FileExplorer internals
```

Current evidence remains the same as Round 6, but the interpretation is tighter:

- `autobyteus-server-ts/src/workspaces/workspace-manager.ts:createWorkspace()` is a reasonable top-level domain entrypoint. The problem is that it awaits `workspace.initialize()` and thereby performs file-tree/search/index work.
- `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` is a reasonable location for a workspace object. The problem is that the constructor eagerly creates `LocalFileExplorer`, and `initialize()` builds the shallow tree plus `FileNameIndexer`/search state.
- `SkillWorkspace` and `TempWorkspace` are still useful domain specializations. They should remain metadata/capability-container specializations, not immediate file-explorer initializers.
- `WorkspaceInfo`/GraphQL workspace responses are only problematic when they include the shallow `fileExplorer` tree. The name can remain if its payload becomes metadata-only; otherwise the tree-bearing part must move to FileExplorer-specific responses/state.
- `FileNameIndexer` and file search follow the FileExplorer concern because their input and lifecycle are file-tree/snapshot oriented. They should not be constructed as part of workspace creation.

Architecture implication:

- Preserve `WorkspaceManager` as the authoritative boundary for workspace metadata and workspace object lookup.
- Do not add a steady-state `WorkspaceMetadataManager`; that would create two owners for one subject.
- Make `Workspace` a cheap metadata object plus optional lazy FileExplorer capability.
- Make FileExplorer acquisition explicit and visible in code so reviewer/validation can prove which paths create tree/index/watcher state.


## Round 8 Current-State Framing: WorkspaceFileExplorer As The Capability Boundary

User clarification on 2026-05-23 refined the Round 7 target one level deeper. The right separation is not only “WorkspaceMetadata vs FileExplorer,” but:

```text
WorkspaceMetadata            -> cheap workspace identity/root-path/display/kind
WorkspaceFileExplorer        -> lazy backend capability for browsing/searching/mutating/watching workspace files
WorkspaceFileExplorerTree    -> serializable/UI tree projection owned by FileExplorer-specific frontend state
```

Current-code evidence that motivates this naming/boundary:

- `FileSystemWorkspace` currently owns or constructs file-explorer-specific things directly: `LocalFileExplorer`, `FileNameIndexer`, and search strategy setup. This makes file-explorer state look like workspace state.
- `WorkspaceInfo.fileExplorer` currently sends a shallow tree as part of a general workspace payload. This makes tree projection look like workspace metadata.
- `stores/workspace.ts` currently stores `fileExplorer: TreeNode` and `nodeIdToNode` alongside workspace metadata. This makes file tree UI state look like workspace selection/metadata state.
- `file-explorer/file-explorer.ts` already owns most local traversal and file operation behavior, while `local-file-explorer.ts` wraps it and adds watcher lease logic. The target should consolidate those into a single workspace-scoped file-explorer capability rather than preserve a base/local/adaptee stack.

Design interpretation:

- Backend `Workspace` should remain the top-level object, but it should only hold metadata and a nullable/lazy `WorkspaceFileExplorer` field/factory.
- Backend `WorkspaceFileExplorer` should not become a monolithic god-object; it can coordinate internal owned collaborators:
  - `WorkspaceFileTreeState` for loaded tree/folder state,
  - `WorkspaceFileSearchIndex` for `FileNameIndexer` and search strategy lifecycle,
  - `WorkspaceFileOperations` for validated read/write/move/delete/create operations,
  - `WorkspaceFileWatcherLeaseManager` for watcher lifecycle and live-update leases.
- Those collaborators are internal to the file-explorer capability boundary. Non-file-explorer flows should not depend on them directly.
- Frontend should mirror the split: `workspaceStore` stores `WorkspaceMetadata`; `fileExplorerStore` stores `WorkspaceFileExplorerTree`/folder/search/open-file/live-stream state keyed by `workspaceId`.


## AR-007 Reconciliation Notes

Architecture review round 6 accepted the Round 8 concept but failed the design artifact because pre-Round-8 target sections still looked authoritative. The rework on 2026-05-23 rewrote the design spec from `## Intended Change` onward so there is one steady-state target:

```text
WorkspaceMetadata
Workspace = WorkspaceMetadata + optional lazy WorkspaceFileExplorer
WorkspaceFileExplorer = tree/search/operation/watcher capability with internal collaborators
WorkspaceFileExplorerTree = file-explorer API/frontend projection
```

Old names are now explicitly documented as current-state evidence or temporary migration aliases only: `WorkspaceReference`, `WorkspaceActivationState`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, and `ensureWorkspaceInitialized(reference)`. The old “Final File Responsibility Mapping” and related ownership/interface/dependency/migration sections were removed/replaced with a single Round 8-aligned mapping.
