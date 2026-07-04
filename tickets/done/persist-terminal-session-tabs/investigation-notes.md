# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; requirements/design refined to per-canonical-target terminal cache after user approval; architecture review round 2 finding AR-D2-001 resolved by choosing clear-cache-on-node-rebind policy.
- Investigation Goal: Determine why Terminal tab/session remount creates a new terminal session and design a fix that preserves terminal state across in-app tab switches and workspace/root-path switches within the current app/window host.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The behavior crosses right-side tab host lifecycle, terminal target identity, xterm component lifecycle, frontend WebSocket session composable, backend WebSocket cleanup, and PTY manager ownership. The refined design adds a frontend terminal host/cache owner but intentionally keeps backend cleanup unchanged.
- Scope Summary: Preserve terminal lifecycle and UI/transport session per canonical terminal target key: backend/node scope + normalized root path or server-home mode.
- Primary Questions Resolved:
  - What frontend component owns Terminal tab mount/unmount? `RightSideTabs.vue`.
  - What frontend cleanup runs on Terminal unmount? `Terminal.vue` calls `session.disconnect()` and disposes xterm.
  - What API/websocket creates/disposes terminal sessions? `/ws/terminal/:sessionId` route delegates to `TerminalHandler`, which creates PTY sessions and disconnects them on WebSocket close.
  - Is backend PTY lifecycle scoped to UI connection or stable durable identity? Current backend is scoped to active WebSocket session id/connection; WebSocket close deliberately releases the PTY.
  - What identity should a frontend terminal cache use? Backend/node endpoint scope + explicit mode (`cwd:<normalized-root>` or `server-home`). Root path, not workspace id/run id, is the workspace identity.
  - Where should multi-target preservation be owned? A new frontend terminal host/cache component between `RightSideTabs.vue` and single-target `Terminal.vue`.
  - What happens when the window backend/node binding changes? Chosen policy: clear the TerminalPanel cache on binding revision or terminal endpoint scope change, unmounting all children so old WebSockets close and old backend PTYs are released.

## Request Context
User report on 2026-07-04: when inside a terminal session, switching away and returning to the terminal creates a completely new session. Previous work is gone, causing bad UX. Provided screenshot shows Terminal tab with fresh "Terminal initialized" output and prompt at `~/autobyteus_org/autobyteus-workspace-superrepo`.

Reference image: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_d4921c385fae4d6493c1eeca29cdeaff/solution_designer_1007b9115387468ebbdcbb256c4e4e21/context_files/ctx_8b76deaeb239__image.png

Follow-up requirement refinement: user agreed on 2026-07-04 that the better UX is one terminal session cached per canonical workspace path / terminal target key, not just preserving the currently active terminal tab instance.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs
- Current Branch: codex/persist-terminal-session-tabs
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin` succeeded on 2026-07-04.
- Task Branch: codex/persist-terminal-session-tabs
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Current HEAD: `a64ee085aba28df22112f40a996e382a0e84a210`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Main checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated untracked files; authoritative artifacts and any future edits must use the dedicated task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-04 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git symbolic-ref refs/remotes/origin/HEAD; git worktree list` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment and base branch | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, shared branch `personal` tracks `origin/personal`, default remote head `origin/personal`, many existing worktrees. | No |
| 2026-07-04 | Command | `git fetch origin; git branch codex/persist-terminal-session-tabs origin/personal; git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs codex/persist-terminal-session-tabs` | Create dedicated task worktree from fresh tracked base | Worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs` on branch `codex/persist-terminal-session-tabs` tracking `origin/personal`. | No |
| 2026-07-04 | Other | User-provided screenshot path above, inspected with `view_image` | Understand reported UI surface | Screenshot shows app Terminal tab with fresh `Terminal initialized` and shell prompt, consistent with remount/new-terminal behavior. | No |
| 2026-07-04 | Command | `find . -iname '*terminal*'; rg -n "Terminal initialized|terminal|pty|xterm|websocket|socket" autobyteus-web autobyteus-server-ts autobyteus-ts` | Locate terminal frontend/backend code paths | Found terminal frontend in `autobyteus-web/components/workspace/tools/Terminal.vue`, session composable in `autobyteus-web/composables/useTerminalSession.ts`, server route/handler/manager in `autobyteus-server-ts/src/api/websocket/terminal.ts` and `src/services/terminal-streaming/**`. | No |
| 2026-07-04 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` lines 24-52 | Verify tab content lifecycle | Files tab is lazy-mounted with `v-if="shouldMountFilesPanel"` and hidden with `v-show="isFilesTabActive"`; Terminal uses `v-if="effectiveActiveTab === 'terminal'"`, so switching away unmounts Terminal. | Replace Terminal direct child with lazy-hosted terminal panel. |
| 2026-07-04 | Code | `autobyteus-web/components/workspace/tools/Terminal.vue` lines 59-72, 213-214, 244-255, 270-288 | Verify terminal component lifecycle | Effective target uses `props.target || terminalTargetFromWorkspaceMetadata(...)`, so explicit null cannot be distinguished from fallback. Initialization banner is written during each xterm creation; `onMounted` initializes/connects; target-key watcher disconnects/reconnects; `onBeforeUnmount` disconnects and disposes xterm. | Add active prop; distinguish `target === undefined` from `target === null`; single-target component should receive frozen target entries from host. |
| 2026-07-04 | Code | `autobyteus-web/composables/useTerminalSession.ts` lines 52-58, 112-120, 123-127, 213-220 | Verify frontend session id and WebSocket lifecycle | Each composable instance uses `options.sessionId || uuidv4()`; URL uses that session id; `disconnect()` closes WebSocket and marks disconnected. | Per-target preservation should keep component/composable instances alive; no transport ownership change needed. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/api/websocket/terminal.ts` lines 88-130 | Verify route cleanup | WebSocket cleanup aborts startup and calls `handler.disconnect()` for connected/pending/late sessions. | Backend close-on-WebSocket-close is deliberate and remains valid for true unmount. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` lines 47-73 and 115-130 | Verify handler connect/disconnect | `connect()` creates a new PTY session for a session id and starts a read loop; `disconnect()` removes active task and closes manager session. | Do not add detached backend retention for this scope. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` lines 38-62 and 106-114 | Verify PTY manager lifecycle | Duplicate session ids are rejected; session is stored before async startup; `closeSession()` deletes the record and closes the PTY. | Reattach would require broader manager redesign; defer. |
| 2026-07-04 | Code | `autobyteus-web/types/terminal/TerminalTarget.ts` | Inspect target shape | `TerminalTarget` contains `rootPath`, optional `workspaceId`, optional `displayName`. | Cache identity must use root path, not display metadata. |
| 2026-07-04 | Code | `autobyteus-web/utils/terminalTarget.ts` | Inspect target construction | `createTerminalTarget()` normalizes root path and keeps workspaceId/displayName metadata. | Add target-key utility here or nearby to avoid duplicated identity logic. |
| 2026-07-04 | Code | `autobyteus-web/utils/workspaceMetadata.ts` | Inspect root path normalization | `normalizeWorkspaceRootPath()` trims, replaces backslashes with slashes, preserves `/`, strips trailing slashes. `workspaceMetadataKeyForRootPath()` already keys metadata by normalized root. | Use same normalization semantics for terminal cache root identity. |
| 2026-07-04 | Code | `autobyteus-web/stores/windowNodeContextStore.ts` and `autobyteus-web/utils/nodeEndpoints.ts` | Inspect backend/node scope source | Store exposes `nodeId`, `nodeBaseUrl`, `bindingRevision`, `boundEndpoints`, and `getBoundEndpoints()`. `deriveNodeEndpoints()` normalizes base URL and produces `terminalWs`. | Terminal key should include node/backend scope; TerminalPanel should watch binding revision / normalized terminal endpoint scope and clear cache on changes. |
| 2026-07-04 | Code | `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | Understand existing tab lifecycle tests | Tests already assert Files stays lazy before first use and remains mounted/inactive after switching. No equivalent Terminal persistence coverage exists. | Update for TerminalPanel host and add persistence test. |
| 2026-07-04 | Code | `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts` | Understand Terminal component tests | Tests mock xterm/FitAddon/useTerminalSession and assert initialization/connect behavior. No explicit null target or `active` visibility/refit behavior exists. | Add coverage. |
| 2026-07-04 | Code | `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Verify transport/session tests | Tests cover URL/session behavior, connect/disconnect, UTF-8 input/output, and error handling. Existing behavior remains valid. | Likely unchanged. |
| 2026-07-04 | Doc | `autobyteus-web/docs/terminal.md` | Verify documented frontend terminal architecture | Docs say `RightSideTabs` hosts `Terminal`, `Terminal.vue` manages xterm, and `useTerminalSession.ts` manages WebSocket connect/disconnect. Backend notes say closing WebSocket releases helper to avoid lingering descriptors. | Update to mention TerminalPanel/per-target cache. |
| 2026-07-04 | Doc | `autobyteus-server-ts/docs/modules/terminal.md` | Verify backend lifecycle expectations | Docs require disconnect cleanup, invalid cwd rejection, close-before-connect cleanup, and descriptor residue avoidance. | Preserve backend lifecycle tests/semantics. |
| 2026-07-04 | Command | `git rev-parse HEAD; git status --short --branch; jq '.scripts' autobyteus-web/package.json autobyteus-server-ts/package.json` | Capture current revision and relevant test scripts | HEAD `a64ee085`; only task artifacts untracked; web tests use `pnpm -C autobyteus-web test:nuxt`; server tests use `pnpm -C autobyteus-server-ts test`. | Downstream can run targeted tests. |
| 2026-07-04 | Doc | `tickets/done/persist-terminal-session-tabs/design-review-report.md` round 2 / AR-D2-001 | Incorporate architecture review design-impact finding | Review approved TerminalPanel owner/key/null semantics/backend cleanup in principle but failed the design because node/backend rebinding was left as a choice. Current `useTerminalSession.ts` does not pin endpoint identity per child. | Requirements/design updated to clear cache on node binding revision or normalized terminal endpoint changes. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: In-app right-side `Terminal` tab shown in the provided screenshot.
- Current execution flow:
  1. `RightSideTabs.vue` renders `<Terminal />` only while `effectiveActiveTab === 'terminal'`.
  2. `Terminal.vue` mounts, creates an xterm instance, writes `➜ Terminal initialized`, registers input/output/resize handlers, and calls `useTerminalSession.connect()`.
  3. `useTerminalSession.ts` opens `/ws/terminal/{uuid}?cwd=...` or `/ws/terminal/{uuid}`.
  4. Server route `registerTerminalWebsocket()` authorizes, resolves cwd, and calls `TerminalHandler.connect()`.
  5. `TerminalHandler.connect()` creates a PTY session and starts a read loop.
  6. On ordinary tab switch away from Terminal, `RightSideTabs.vue` removes the Terminal subtree because the `v-if` becomes false.
  7. `Terminal.vue` `onBeforeUnmount()` calls `session.disconnect()` and disposes xterm.
  8. The WebSocket closes; backend cleanup calls `TerminalHandler.disconnect()`, which closes the PTY.
  9. Returning to Terminal remounts a new component, creates a new `uuidv4()` session id, writes a new initialization banner, and starts a new backend PTY.
- Current cross-workspace behavior:
  - A single `Terminal.vue` instance follows `activeWorkspaceMetadata` when no explicit target prop is passed.
  - Target changes cause `Terminal.vue`'s target-key watcher to disconnect/reconnect, replacing the previous terminal session rather than preserving a separate session per path.
  - Because `props.target || fallback` treats `null` as fallback, a hidden server-home entry cannot currently be represented safely if active workspace metadata later exists.
- Ownership or boundary observations:
  - `RightSideTabs.vue` owns tab selection and mount/visibility policy.
  - There is no current multi-target terminal cache owner.
  - `Terminal.vue` owns xterm lifetime and visual terminal behavior for one effective target.
  - `useTerminalSession.ts` owns frontend terminal transport connection and session id.
  - Backend route/handler/manager owns PTY creation and cleanup for WebSocket sessions.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture evidence summary: Targeted frontend refactor needed: introduce a governing terminal host/cache owner so `RightSideTabs.vue` does not directly own all terminal instances and `Terminal.vue` stays single-target. Backend refactor deferred.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `RightSideTabs.vue` | Terminal uses active-tab `v-if`; Files has lazy cache + `v-show`. | Missing tab-host invariant for stateful Terminal. | RightSideTabs should host a persistent TerminalPanel. |
| `Terminal.vue` | Unmount calls `session.disconnect()` and disposes xterm. | Correct for true teardown, wrong if ordinary tab switch unmounts the component. | Avoid unmount on tab switch; preserve unmount cleanup. |
| `Terminal.vue` target fallback | `props.target || activeWorkspaceMetadata` cannot represent explicit server-home null. | Per-target cache would have hidden target drift unless this is fixed. | Distinguish `undefined` from `null`. |
| `useTerminalSession.ts` | New composable mount gets random `uuidv4()` session id. | Remount cannot reconnect to old session. | Keep composable instances alive per target. |
| `terminalTarget.ts` + `workspaceMetadata.ts` | Existing normalized root path helpers. | Target identity should be centralized and path-based. | Add cache key utility. |
| `windowNodeContextStore.ts` + `nodeEndpoints.ts` | Node/backend endpoint scope and binding revision available; `useTerminalSession` currently resolves endpoint globally at connect time. | Identical root paths on different backend nodes must not collide; preserving old-node sessions would require endpoint pinning. | Include node/backend scope in cache key and clear TerminalPanel cache on node/endpoint rebinding. |
| Backend terminal route/handler/manager | WebSocket close closes PTY. | Backend correctly protects against orphan PTYs; do not weaken for this scope. | Preserve tests/docs. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Hosts right-side tool tabs and decides which tab content is mounted/visible. | Terminal is mounted only while active via `v-if`; Files has state-preserving pattern. | Should lazy-host `TerminalPanel`, not direct single Terminal. |
| `autobyteus-web/components/workspace/tools/TerminalPanel.vue` (new) | Not present. | Needed to own multi-target terminal cache. | New governing owner for per-target cached Terminal instances. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Owns xterm instance, fit/resize, input/output binding, WebSocket composable connection. | Single-target owner should remain; target fallback needs explicit-null fix. | Add `active` prop and safe target resolution. |
| `autobyteus-web/utils/terminalTarget.ts` | Builds `TerminalTarget` from root/workspace metadata. | No cache key helper yet. | Add target-key function/type here or adjacent. |
| `autobyteus-web/stores/windowNodeContextStore.ts` | Owns current window node binding and endpoints. | Provides `nodeId`, `nodeBaseUrl`, `boundEndpoints.terminalWs`, `bindingRevision`. | TerminalPanel must use these for node scope key and cache reset on binding/endpoint changes. |
| `autobyteus-web/composables/useTerminalSession.ts` | Owns terminal WebSocket URL/session id, connection state, codec, send/receive methods. | Per-instance session; no multi-target cache. | Reuse unchanged unless optional stable sessionId injection is desired. |
| Backend terminal route/handler/manager | WebSocket/PTY lifecycle. | Cleanup is correct for true close. | Leave unchanged. |
| `autobyteus-web/components/workspace/tools/__tests__/TerminalPanel.spec.ts` (new) | Not present. | Needed for per-target cache behavior. | Add focused unit coverage. |
| Existing RightSideTabs/Terminal tests | Layout and component coverage. | Need updates for TerminalPanel and active/explicit-null behavior. | Update. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-04 | Setup | Dedicated worktree setup commands above. | Investigation proceeded in isolated worktree. | Prevents interference with shared checkout. |
| 2026-07-04 | Static Trace | Manual code trace from `RightSideTabs.vue` through `Terminal.vue`, `useTerminalSession.ts`, server route, handler, and manager. | A normal tab switch triggers the same cleanup path as a real terminal teardown. | Fix must separate tab visibility from terminal lifetime. |
| 2026-07-04 | Static Trace | Manual code trace of Terminal target identity helpers and node endpoint store. | Current code has enough data to derive a frontend canonical target key, but no owner for cache entries. | Add TerminalPanel + key utility. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, frontend unit tests can mock `Terminal.vue`, xterm, `useTerminalSession`, workspace store, and node context store. Full manual reproduction requires running the web/electron app and switching right-side tabs and workspace contexts after entering terminal state.
- Required config, feature flags, env vars, or accounts: None identified for unit coverage.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin`, `git worktree add`.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

The root cause is not that the backend randomly loses state. Backend does what its current contract requires: close the PTY when the WebSocket closes. The immediate state loss occurs because the frontend tab host closes the WebSocket during ordinary UI tab switching by unmounting `Terminal.vue`.

For the improved UX, a single cached Terminal component is not sufficient. If users move between workspace path A and path B, they should not lose A's terminal simply because the current target changed. The correct architecture is a terminal host/cache owner that holds one single-target `Terminal.vue` child per canonical target key. Each child keeps its own xterm, `useTerminalSession` instance, WebSocket, and backend PTY. The host creates entries lazily only when the Terminal tab is active for the current target and cleans all entries on true host teardown.

Node/backend rebinding is now explicitly resolved: TerminalPanel clears all cached entries when `windowNodeContextStore.bindingRevision` or the normalized terminal endpoint scope changes. This avoids old-node hidden sessions and avoids adding endpoint-pinned transport identity to `useTerminalSession.ts` in this scoped change.

## Constraints / Dependencies / Compatibility Facts

- Backend terminal cleanup on WebSocket close is intentional and covered by docs/tests to prevent PTY/helper leaks.
- Do not add backend dual-path behavior or detached PTY retention in this task.
- Do not preserve terminal entries across node/backend rebinding in this task; clear cache to close old WebSockets and release old PTYs.
- `workspaceId` is not stable enough as target identity because the same canonical root path can be reached through different run/context metadata.
- Existing frontend root path normalization should be reused for cache identity.
- Server-home must be an explicit target mode in the cache, not "no target so use active workspace fallback".
- Hidden terminal refit must wait until the child is visible; otherwise dimensions can be zero.
- xterm scrollback remains bounded by current `scrollback: 5000` configuration.

## Open Unknowns / Risks

- Whether right-panel collapse should preserve terminal host state. If the right panel is unmounted, a host inside `RightSideTabs.vue` will close sessions. A higher-level host or hidden mounted panel would be needed for collapse persistence.
- Old-node terminal preservation across node/backend rebinding is out of scope. If future UX requires it, each cached entry must pin endpoint identity and define old-node cleanup/eviction policy.
- If a future requirement wants persistence across page reload/app restart, backend detached sessions with replay/TTL must be designed separately.

## Notes For Architect Reviewer

This revision supersedes the earlier single-Terminal-cache design. The user explicitly agreed that one terminal session per canonical workspace path / terminal target key is better UX. Please review the new owner split: `RightSideTabs.vue` remains tab lifecycle owner, a new `TerminalPanel`/host owns the per-target cache, and `Terminal.vue` remains one target's xterm/WebSocket owner. The key architecture risks were hidden target drift and node/backend rebinding. Hidden target drift is handled with explicit-null server-home handling and snapshot target entries. Node/backend rebinding is now handled by clear-cache-on-rebind to avoid endpoint-pinned transport work in this scope.
