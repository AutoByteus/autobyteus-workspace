# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement
Users lose interactive terminal work when they leave the Terminal surface and later return. The first-level bug is that ordinary right-side tab switching unmounts `Terminal.vue`, closes the frontend WebSocket, and causes the backend PTY to close. The improved UX requirement is stronger than preserving only the currently visible terminal: while the app/window is alive, users should be able to switch between workspaces/root paths and later return to each path's terminal state.

The target behavior is an in-window terminal cache keyed by canonical terminal target. A canonical terminal target is the active backend/node terminal endpoint plus either the normalized workspace/root path or the server-home terminal mode. The cache preserves separate live terminal sessions per target while the host is alive, without changing backend cleanup semantics for true WebSocket closure.

## Investigation Findings
- `autobyteus-web/components/layout/RightSideTabs.vue` currently mounts Terminal with `v-if="effectiveActiveTab === 'terminal'"`; switching away destroys the Terminal subtree.
- `autobyteus-web/components/workspace/tools/Terminal.vue` calls `session.disconnect()` and disposes xterm in `onBeforeUnmount()`. It writes `➜ Terminal initialized` each time a new xterm instance is created.
- `autobyteus-web/composables/useTerminalSession.ts` creates a random `uuidv4()` session id unless one is provided. A remount therefore starts a new frontend session id.
- Server route `autobyteus-server-ts/src/api/websocket/terminal.ts` maps WebSocket cleanup to `TerminalHandler.disconnect()`, and `TerminalHandler.disconnect()` closes the PTY via `PtySessionManager.closeSession()`.
- Backend terminal docs intentionally require PTY cleanup on WebSocket close to avoid descriptor/process leaks; backend detached-session reattach is not present today and should not be introduced casually.
- Current terminal target data is `TerminalTarget { rootPath, workspaceId?, displayName? }`. `createTerminalTarget()` and `normalizeWorkspaceRootPath()` normalize workspace/root paths by trimming, converting backslashes to slashes, and removing trailing slashes.
- The active backend endpoint comes from `useWindowNodeContextStore()` and `deriveNodeEndpoints(nodeBaseUrl).terminalWs`; target identity must include the backend/node scope so identical paths on different backends do not collide.
- Architecture review round 2 identified node/backend rebinding as a lifecycle decision that must be explicit. Chosen scoped policy: TerminalPanel clears all cached terminal entries when the window node binding revision or normalized terminal endpoint scope changes, unmounting children so WebSockets close and backend PTYs are released. Old-node terminal preservation is out of scope because current `useTerminalSession.ts` resolves the global node endpoint at connect time rather than pinning endpoint identity per child.
- `Terminal.vue` currently treats `target: null` and omitted `target` the same by using `props.target || activeWorkspaceMetadata`. A per-target cache needs to distinguish omitted target (legacy/default behavior: derive from active workspace) from explicit `null` target (server-home cache entry).

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Targeted refactor needed now
- Evidence basis: The tab host treats tab deselection as terminal lifetime end; Terminal component identity is not separated by target; `Terminal.vue` cannot currently represent explicit server-home target independently from omitted target fallback.
- Requirement or scope impact: Introduce a dedicated terminal session host/cache owner between `RightSideTabs.vue` and individual `Terminal.vue` instances. Keep one `Terminal.vue` instance per canonical terminal target key after first use.

## Recommendations
1. Add a terminal host/cache component, e.g. `autobyteus-web/components/workspace/tools/TerminalPanel.vue` or `TerminalSessionHost.vue`.
   - It owns the in-window cache of terminal entries.
   - It computes the current canonical terminal target key from backend/node scope + normalized root path or server-home mode.
   - It creates an entry only when the Terminal tab is active/visible and that current target has not already been opened.
   - It renders cached entries keyed by target key and hides inactive entries with `v-show`.
2. Keep `RightSideTabs.vue` as the tab lifecycle owner, but make it host `TerminalPanel` lazily and hide/show it instead of unmounting it during tab switches.
3. Keep `Terminal.vue` as the owner of one xterm + one WebSocket session for one explicit target.
   - Add `active?: boolean` so hidden cached instances do not refit until shown.
   - Distinguish omitted `target` from explicit `target={null}` so a server-home cached entry does not later follow active workspace metadata.
4. Add a terminal target identity utility, likely in `autobyteus-web/utils/terminalTarget.ts`, for canonical cache key generation.
   - Key shape should include node/backend scope and mode.
   - Workspace identity should be the normalized root path, not `workspaceId`, because the same canonical path should reuse the same terminal even if reached from a different run/context.
5. Keep backend WebSocket-close/PTY cleanup unchanged.
   - Cached terminal preservation is achieved by keeping frontend terminal components/WebSockets alive while the app/window host is alive.
   - True unmount or cache removal still closes the WebSocket and releases the PTY.
6. Clear the terminal cache on backend/node rebinding.
   - `TerminalPanel` must watch `windowNodeContextStore.bindingRevision` and/or the normalized terminal endpoint scope used in the key.
   - When that scope changes, it removes all cached entries, which unmounts child `Terminal.vue` instances and closes their WebSockets.
   - New entries for the new backend/node are created lazily only after the Terminal tab is active again.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- UC-001: User opens Terminal in workspace/root path A, runs commands, switches to another right-side tab, then returns to Terminal while still in path A.
- UC-002: User opens Terminal in path A, switches to workspace/root path B, opens Terminal there, then returns to path A and sees path A's prior terminal session.
- UC-003: User opens Terminal for server-home mode when no workspace/root target is active, later opens workspace terminal(s), then returns to server-home mode and sees the prior server-home terminal.
- UC-004: User changes active run/context but the canonical workspace/root path and backend/node target remain the same; the terminal session should be reused for that canonical target.
- UC-005: User changes to a different backend/node endpoint; existing terminal cache entries are cleared, old WebSockets close, old backend PTYs clean up, and new-node terminal entries are created lazily.
- UC-006: User leaves/destroys the terminal host/window/workspace layout; cached terminal components unmount and close WebSockets so backend PTYs clean up.

## Out of Scope
- Persisting terminal sessions across full page reloads, app restarts, backend restarts, or machine changes.
- Backend detached terminal retention, multi-client terminal attach, scrollback replay API, or idle TTL policy.
- A general-purpose stateful-tab framework for all right-side tabs.
- Multiple named terminal tabs for the same canonical target.
- Changing PTY backend implementation or the terminal WebSocket protocol.
- Preserving live terminals across backend/node rebinding. The scoped policy is to clear the cache on node/endpoint changes rather than pin old-node endpoints into each terminal child.

## Functional Requirements
- REQ-001: Ordinary right-side tab switching away from Terminal must not close or recreate already-opened terminal sessions.
- REQ-002: The frontend must preserve one live terminal component/session per canonical terminal target key while the terminal host remains mounted.
- REQ-003: The canonical terminal target key must include backend/node scope and exactly one terminal mode: explicit normalized root path or server-home.
- REQ-004: Explicit root-path target identity must use normalized root path as the primary workspace identity; `workspaceId` and display name may be metadata but must not split sessions for the same canonical root path on the same backend/node.
- REQ-005: Server-home terminal identity must be distinct from any explicit root path and must remain explicit when represented by `target: null`.
- REQ-006: Cached terminal entries must be created lazily only after the user activates the Terminal tab for the current target; merely switching workspace while Terminal is hidden must not eagerly create new PTYs.
- REQ-007: Returning to a previously opened canonical target must show the same xterm instance, scrollback, WebSocket session, and backend PTY if still connected.
- REQ-008: Terminal output emitted while a cached target is hidden must continue to append to that target's existing xterm scrollback.
- REQ-009: When a cached terminal entry becomes visible, it must refit xterm and send a resize to the backend if connected.
- REQ-010: True terminal host/component unmount or explicit cache entry removal must disconnect the WebSocket and allow backend PTY cleanup.
- REQ-011: Backend terminal lifecycle semantics on WebSocket close must remain unchanged in this scope.
- REQ-012: The implementation must avoid hidden target drift: a cached `Terminal.vue` instance for path A or server-home must not follow later active workspace metadata and reconnect itself to path B.
- REQ-013: When the window node binding revision or normalized terminal endpoint scope changes, TerminalPanel must clear all cached entries and unmount child Terminal instances so old WebSockets close and old backend PTYs are released.
- REQ-014: After node/backend rebinding, TerminalPanel must create terminal entries for the new backend/node lazily; it must not preserve old-node entries or require endpoint-pinned `useTerminalSession` behavior in this scope.

## Acceptance Criteria
- AC-001: Given a terminal with prior output in path A, when the user switches Terminal -> another right-side tab -> Terminal while still in path A, then the same output/session is visible and no extra initialization banner is written.
- AC-002: Given an active long-running command in path A, when the user switches to another tab and back, then output continues in the same path A terminal session.
- AC-003: Given the user opens terminal in path A, then opens terminal in path B, then returns to path A, then path A's prior terminal scrollback and shell state are still visible.
- AC-004: Given two run contexts with the same normalized root path on the same backend/node, when the user moves between those contexts, then they share the same cached terminal entry.
- AC-005: Given cached terminals exist and the window node/backend binding changes, when TerminalPanel observes the new binding revision or terminal endpoint scope, then all old cached Terminal children unmount and their sessions disconnect.
- AC-006: Given no Terminal tab activation has happened for path B, when the user switches to path B while Terminal is hidden, then no path B terminal is eagerly mounted/connected until the Terminal tab is activated.
- AC-007: Given a server-home terminal entry was created with explicit `target: null`, when active workspace metadata later becomes non-null, then that server-home entry remains server-home and does not reconnect to the workspace path.
- AC-008: Given the terminal host unmounts, then all cached Terminal children unmount and each open session disconnects so backend cleanup can release PTYs.
- AC-009: Existing backend terminal tests asserting WebSocket close releases PTY sessions remain valid.
- AC-010: Given the same root path is later opened on the new backend/node after rebinding, then a fresh terminal entry is created under the new node scope and no old-node terminal child is reused.

## Constraints / Dependencies
- `RightSideTabs.vue` owns tab visibility and can host a terminal panel lazily after first use.
- The new terminal host/cache owner should live in the frontend tools area, not inside backend or transport code.
- `Terminal.vue` should remain a single-target component; it should not own the multi-target cache.
- `useTerminalSession.ts` should remain the WebSocket transport owner and should not learn about tab lists or workspace switching policy.
- Backend WebSocket close currently maps to PTY close by design.
- Current `useTerminalSession.ts` resolves the terminal WebSocket endpoint from the global window node context at connect time; preserving old-node entries would require endpoint pinning, which is out of scope.
- Hidden DOM elements may have zero dimensions; visible reactivation must guard/refit after DOM visibility.

## Assumptions
- The desired persistence window is the current app/window/terminal-host lifetime, not durable persistence across reloads or restart.
- Users expect terminals to follow canonical filesystem roots rather than individual run ids within the same backend/node binding.
- Keeping previously opened target terminals live while hidden is acceptable for desktop UX, as long as creation remains lazy and true unmount cleans up.
- The frontend's normalized root path is sufficient as the target key for UX-level reuse; backend remains responsible for validating/canonicalizing cwd for actual PTY startup.

## Risks / Open Questions
- If a user opens many workspace paths and leaves all terminals live, multiple PTYs remain active until host teardown or node rebinding. This is an intentional UX tradeoff; a future explicit close/eviction UI can be added if needed.
- Whether right-panel collapse should preserve the terminal host. Current right-panel layout may unmount `RightSideTabs` when the whole right panel is hidden; preserving across panel collapse may require a higher-level host or changing panel visibility semantics and can be follow-up unless user specifically wants collapse persistence now.
- Node/backend rebinding intentionally clears cached terminals. Users expecting old-node terminal preservation will need a future endpoint-pinned transport/cache design.

## Requirement-To-Use-Case Coverage
- UC-001: REQ-001, REQ-007, REQ-009
- UC-002: REQ-002, REQ-003, REQ-004, REQ-006, REQ-007, REQ-008
- UC-003: REQ-003, REQ-005, REQ-007, REQ-012
- UC-004: REQ-004, REQ-007
- UC-005: REQ-003, REQ-011, REQ-013, REQ-014
- UC-006: REQ-010, REQ-011

## Acceptance-Criteria-To-Scenario Intent
- AC-001 and AC-002 cover same-target tab switching continuity.
- AC-003 covers per-canonical-path cache UX.
- AC-004 covers path identity rather than run identity.
- AC-005 and AC-010 cover backend/node rebinding cache clearing and new-node entry creation.
- AC-006 covers lazy resource creation.
- AC-007 covers explicit server-home identity and prevents hidden target drift.
- AC-008 and AC-009 preserve cleanup invariants.

## Approval Status
Refined by explicit user approval on 2026-07-04 for the stronger UX: one terminal session cached per canonical workspace path / terminal target key while the app/window host is alive.
