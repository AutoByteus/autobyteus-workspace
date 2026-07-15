# Design Spec

## Current-State Read
The current Terminal path is:

`RightSideTabs.vue -> Terminal.vue -> useTerminalSession.ts -> /ws/terminal/:sessionId -> TerminalHandler -> PtySessionManager -> TerminalSession backend`

`RightSideTabs.vue` renders Terminal with `v-if="effectiveActiveTab === 'terminal'"`, so ordinary tab switching destroys and recreates the Terminal subtree. `Terminal.vue` correctly treats component unmount as terminal teardown: it calls `session.disconnect()` and disposes xterm. `useTerminalSession.disconnect()` closes the WebSocket. The backend route then calls `TerminalHandler.disconnect()`, and `PtySessionManager.closeSession()` closes the PTY. On return to Terminal, `useTerminalSession.ts` creates a new random `uuidv4()` session id, so the server starts a new PTY and the UI writes `➜ Terminal initialized` again.

The current design also has no owner for multiple terminal targets. `Terminal.vue` derives one effective target from either `props.target` or active workspace metadata and reconnects when that target key changes. That means switching from workspace/root path A to B replaces the existing terminal rather than preserving separate sessions. In addition, `props.target || fallback` cannot distinguish explicit `target: null` (server-home) from omitted target (derive from active workspace), which would cause hidden target drift in a cache design.

The backend cleanup boundary is intentionally strict. `autobyteus-web/docs/terminal.md` and `autobyteus-server-ts/docs/modules/terminal.md` describe WebSocket close as the point that releases the helper/PTY and prevents descriptor/process residue. Backend detached terminal reattach is not the right first fix for this UX issue. Architecture review round 2 identified one required lifecycle decision: node/backend rebinding. Current `useTerminalSession.ts` resolves the terminal endpoint from global window node context at connect time, so preserving old-node cached entries would require endpoint-pinned child transport design. This design chooses the scoped clear-cache-on-rebind policy instead.

## Intended Change
Introduce an in-window frontend terminal session host/cache that preserves one live `Terminal.vue` instance per canonical terminal target key while the host is mounted.

Target architecture:

`RightSideTabs.vue -> TerminalPanel.vue (terminal target cache) -> many Terminal.vue children -> useTerminalSession per child -> backend PTY per child`

Each canonical target key consists of:

- backend/node scope: current window node id plus normalized terminal WebSocket endpoint / backend base; and
- terminal mode:
  - `cwd:<normalized-root-path>` for explicit workspace/root terminal targets, or
  - `server-home` for omitted-cwd backend home terminal.

The terminal cache is lazy: it creates a terminal entry only when the Terminal tab is active for the current target. Switching workspace while the Terminal tab is hidden should not eagerly create hidden PTYs. Returning to an already-opened target shows that target's preserved xterm/WebSocket/PTTY session.

Do not change backend WebSocket-close/PTY cleanup in this scope. True host/component unmount should still close WebSockets and release PTYs.

Node/backend rebinding policy is fixed for this design: `TerminalPanel.vue` clears its entire cache when `windowNodeContextStore.bindingRevision` or the normalized terminal endpoint scope used for keys changes. Clearing the cache unmounts all child `Terminal.vue` instances, closes their WebSockets, and lets the old backend(s) release PTYs. New backend/node entries are created lazily after rebinding only when the Terminal tab is active for the current target. This intentionally rejects old-node terminal preservation in this scope.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted frontend refactor
- Evidence:
  - `RightSideTabs.vue` unmounts Terminal on tab deselection.
  - `Terminal.vue` disconnects on unmount and follows active workspace metadata when no explicit target is passed.
  - `useTerminalSession.ts` assigns a new random session id on each composable instance.
  - Backend WebSocket cleanup closes PTY by design.
  - Current target data and node endpoint stores provide the inputs for canonical target keys but no cache owner exists.
  - `useTerminalSession.ts` does not pin an endpoint per child; endpoint preservation across node rebinding would be a larger transport change.
- Design response: Add a terminal host/cache owner, keep single-target Terminal components alive per canonical key, clear the cache on node/backend rebinding, and keep backend cleanup unchanged.
- Refactor rationale: The stronger UX needs ownership separation that the earlier single Terminal cache cannot provide. `RightSideTabs.vue` should not manage many terminal instances directly, and `Terminal.vue` should not become a multi-target cache. A dedicated host keeps the boundary clean.
- Intentional deferrals and residual risk, if any:
  - Persistence across full page reload, app restart, backend restart, machine changes, or node/backend rebinding is deferred.
  - Backend detached session reattach and endpoint-pinned old-node preservation are deferred.
  - Preserving sessions across right-panel collapse may require a higher-level host if current layout fully unmounts `RightSideTabs`; this can be follow-up unless explicitly required now.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. right-side tab visibility spine
2. terminal host/cache spine
3. single-target terminal component lifecycle
4. transport/backend cleanup boundaries
5. file/test/doc mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace direct `RightSideTabs.vue -> Terminal.vue` unmount-on-tab-switch behavior with `RightSideTabs.vue -> TerminalPanel.vue` persistent host behavior.
- Required action: Replace `Terminal.vue`'s ambiguous `props.target || fallback` resolution with explicit undefined-vs-null semantics.
- Required action: Replace the previously ambiguous node-rebinding choice with a clean-cut clear-cache-on-rebind policy.
- Obsolete behavior in scope:
  - Terminal tab `v-if="effectiveActiveTab === 'terminal'"` as the steady-state host policy.
  - A single effective Terminal instance that reconnects and discards path A when current target changes to path B.
- No backend compatibility wrapper, endpoint-pinned old-node transport, detached session dual path, or session-replay fallback is introduced.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User selects Terminal for current workspace/root target | Correct cached Terminal child visible | `TerminalPanel.vue` | Main UX path for target-specific terminal preservation. |
| DS-002 | Primary End-to-End | User switches right-side tabs | Cached TerminalPanel and entries stay mounted | `RightSideTabs.vue` | Ordinary tab switching must not close sessions. |
| DS-003 | Return-Event | Backend PTY output for hidden target | Same target's xterm scrollback | `Terminal.vue` per target | Hidden output must be retained per target. |
| DS-004 | Bounded Local | Current target changes while Terminal tab active | Create/show matching cache entry | `TerminalPanel.vue` | Enables path A/path B/path A restoration. |
| DS-005 | Bounded Local | Cached child becomes visible | Fitted xterm and backend resize | `Terminal.vue` | Hidden DOM dimensions can be stale/zero. |
| DS-006 | Bounded Local | True host/component unmount | WebSocket close and backend PTY cleanup | `Terminal.vue` + backend terminal handler | Prevents orphan PTYs. |
| DS-007 | Bounded Local | Window node/backend binding changes | Empty TerminalPanel cache and old PTYs released | `TerminalPanel.vue` | Makes rebinding resource-safe without endpoint-pinned child transports. |

## Primary Execution Spine(s)

Primary target-open spine:

`User activates Terminal tab -> RightSideTabs.vue -> TerminalPanel.vue -> getTerminalTargetCacheKey(current target + node scope) -> ensure cached entry -> show matching Terminal.vue -> useTerminalSession WebSocket -> server terminal route -> TerminalHandler -> PtySessionManager -> PTY backend`

Primary tab-switch spine:

`User switches Terminal tab inactive -> RightSideTabs.vue hides TerminalPanel -> TerminalPanel keeps children mounted -> each Terminal.vue keeps WebSocket/session alive`

Node/backend rebinding cleanup spine:

`Window node binding changes -> TerminalPanel observes bindingRevision/terminal endpoint scope change -> TerminalPanel clears entries -> Terminal.vue children unmount -> useTerminalSession.disconnect() closes WebSockets -> backend releases PTYs`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When the Terminal tab is active, TerminalPanel computes the current canonical target key. If the key is already cached, it shows that child. If not, it snapshots the current target and creates a new child. | `RightSideTabs.vue`, `TerminalPanel.vue`, `Terminal.vue`, `useTerminalSession`, backend route/handler/manager | `TerminalPanel.vue` | Target key normalization, lazy entry creation, active child selection |
| DS-002 | RightSideTabs no longer destroys terminal state during ordinary tab switching. It lazy-mounts TerminalPanel after first Terminal activation and hides it with `v-show` or equivalent. | `RightSideTabs.vue`, `TerminalPanel.vue` | `RightSideTabs.vue` | First-open tracking, active flag |
| DS-003 | Each cached Terminal child owns one WebSocket read path. Output for hidden path A continues to write into path A's xterm instance. Returning to path A reveals accumulated scrollback. | `TerminalHandler`, `useTerminalSession`, `Terminal.vue`, xterm | `Terminal.vue` per child | UTF-8 decoder, xterm scrollback |
| DS-004 | If the current workspace/root target changes while Terminal is active, TerminalPanel does not mutate an existing child. It creates or selects the child for the new key. Old children stay mounted and hidden. | `TerminalPanel.vue`, `Terminal.vue` children | `TerminalPanel.vue` | Entry map/list, snapshot target metadata |
| DS-005 | When a child becomes visible, Terminal.vue waits for DOM visibility, refits xterm, and sends resize to backend if connected. | `Terminal.vue`, FitAddon, xterm, `useTerminalSession` | `Terminal.vue` | `nextTick`, nonzero dimension guard |
| DS-006 | When the host truly unmounts or an entry is removed, child Terminal.vue unmounts and calls `session.disconnect()`. Backend cleanup remains the PTY close owner. | `TerminalPanel.vue`, `Terminal.vue`, backend terminal route/handler/manager | `Terminal.vue` for child teardown; backend for PTY cleanup | Cleanup ordering, close-before-connect safety |
| DS-007 | When the active window backend/node binding changes, TerminalPanel treats that as a terminal-host reset boundary. It clears all entries before any new-node entry is created. | `windowNodeContextStore`, `TerminalPanel.vue`, child `Terminal.vue` instances, backend cleanup | `TerminalPanel.vue` | Binding revision / endpoint scope watcher, cache clear, lazy recreation |

## Spine Actors / Main-Line Nodes

- `RightSideTabs.vue`: tab host and first-open/lazy mount owner for TerminalPanel.
- `TerminalPanel.vue` / `TerminalSessionHost.vue`: governing owner for the per-target terminal cache.
- Terminal target key utility: identity normalization off-spine concern serving TerminalPanel.
- `Terminal.vue`: one cached target's xterm/WebSocket visual session owner.
- `useTerminalSession.ts`: frontend WebSocket transport owner for one Terminal child; uses current global node endpoint at connect time and is not endpoint-pinned in this scope.
- `registerTerminalWebsocket(...)`: backend WebSocket route boundary.
- `TerminalHandler`: backend terminal streaming owner.
- `PtySessionManager`: PTY session registry and cleanup owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RightSideTabs.vue` | Which right-side tab is visible, whether TerminalPanel has ever been opened, and whether TerminalPanel should receive `active=true`. |
| `TerminalPanel.vue` | Current target resolution, canonical target key computation, cached target entry list/map, entry creation/removal, which child is visible/active, and cache reset on node/backend rebinding. |
| Target key utility | Stable construction of target key from node scope and normalized terminal target mode. |
| `Terminal.vue` | One target's xterm instance, xterm addons, terminal visual output, input forwarding, fit/resize behavior, true component teardown cleanup. |
| `useTerminalSession.ts` | One target child's WebSocket URL/session id, connection state, base64/UTF-8 transport codec, input/resize messages. |
| Backend terminal route | Remote access auth, cwd/rootPath resolution, WebSocket lifecycle adaptation, cleanup on socket close/error. |
| `TerminalHandler` | PTY session creation, read loop, input/resize forwarding, disconnect task handling. |
| `PtySessionManager` | Backend session registry keyed by session id, target grouping, PTY close operations. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RightSidebarStrip.vue` terminal icon | `useRightSideTabs()` + `RightSideTabs.vue` | Lets users select Terminal from collapsed strip. | Terminal target cache or PTY cleanup. |
| `TerminalPanel.vue` child `<Terminal>` render | `Terminal.vue` per child | Creates visible xterm/WebSocket owner for one target. | Backend terminal streaming internals. |
| `Terminal.vue` call to `session.connect()` | `useTerminalSession.ts` | Thin call into frontend transport owner. | Multi-target cache policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Direct `RightSideTabs.vue -> <Terminal />` active-tab `v-if` | Causes session loss on tab switch and cannot cache per target. | `RightSideTabs.vue -> <TerminalPanel :active="..." />` | In This Change | Clean-cut replacement. |
| Single-current-target Terminal replacement behavior | Switching A -> B discards A, worse UX. | TerminalPanel per-target child cache | In This Change | Keep `Terminal.vue` single-target, but host many children. |
| Ambiguous `props.target || fallback` in `Terminal.vue` | Explicit server-home null would drift to active workspace. | `props.target === undefined ? fallback : props.target` | In This Change | Required for safe cached server-home entries. |
| Backend reattach idea for this bug | Unnecessary and conflicts with cleanup guarantees. | Frontend in-window cache | In This Change | Separate future feature if needed. |
| Preserving old-node cached entries across backend/node rebinding | Current transport does not pin endpoints per child and preservation risks hidden old-node PTYs. | TerminalPanel clear-cache-on-rebind policy | In This Change | Future endpoint-pinned preservation would be a separate design. |

## Return Or Event Spine(s) (If Applicable)

`PTY output -> TerminalHandler.readLoop -> WebSocket output frame -> useTerminalSession decoder for target key K -> Terminal.vue output callback for K -> K's xterm instance`

This return spine exists independently for each cached Terminal child.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TerminalPanel.vue`
  - `active=true + currentTargetKey=K -> entry K exists? -> if no, snapshot target and append entry -> render children -> child K active=true, all others active=false`
  - This preserves path A/path B sessions without mutating existing children.
- Parent owner: `Terminal.vue`
  - `active=false -> remain mounted/connected and hidden -> output callback still writes to xterm -> active=true -> nextTick -> safeFit -> sendResizeIfConnected`
- Parent owner: `TerminalPanel.vue`
  - `node bindingRevision / normalized terminal endpoint scope changes -> clear entries array/map -> children unmount -> old WebSockets close -> old PTYs release -> wait for Terminal tab active to lazily create new entries`
  - This prevents old-node hidden sessions without adding endpoint-pinned transports.
- Parent owner: backend terminal route/handler
  - `WebSocket close/error -> route cleanup -> TerminalHandler.disconnect -> PtySessionManager.closeSession -> PTY close`
  - This remains unchanged.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Terminal target key normalization | DS-001, DS-004 | `TerminalPanel.vue` | Build stable key from node scope + root path/server-home. | Prevent collisions and duplicated terminals. | If hidden in component conditionals, target identity will drift or duplicate. |
| Target snapshot entry metadata | DS-001, DS-004 | `TerminalPanel.vue` | Store target object/null at creation time. | Prevent cached entries from following active workspace changes. | If `Terminal.vue` uses fallback, old entries mutate targets. |
| Lazy entry creation | DS-001, DS-004 | `TerminalPanel.vue` | Avoid creating PTYs for every workspace switch while Terminal hidden. | Resource conservation. | If placed in workspace store, every workspace selection may spawn terminals. |
| Active child visibility | DS-001, DS-005 | `TerminalPanel.vue` + `Terminal.vue` | Show only current target child and refit when visible. | Keeps many terminals alive but one visible. | If transport owns it, UI lifecycle leaks into WebSocket code. |
| WebSocket codec | DS-003 | `useTerminalSession.ts` | Keep byte/base64/UTF-8 transport isolated. | Prevent mojibake and keep Terminal.vue transport-agnostic. | Duplicating codec in Terminal.vue would blur ownership. |
| Backend cleanup | DS-006, DS-007 | Backend route/handler/manager | Release PTY on true WebSocket close. | Prevent leaks. | If weakened for tab switching, hidden orphan PTYs become likely. |
| Node rebinding watcher | DS-007 | `TerminalPanel.vue` | Detect binding revision / terminal endpoint scope changes and clear cached entries. | Resource safety without endpoint pinning. | If left to children/transport, old sessions may reconnect to the wrong endpoint or leak. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Preserve stateful tab host after first open | `RightSideTabs.vue` Files lazy-cache pattern | Extend | Same tab-host concern. | N/A |
| Multi-target terminal cache | None currently | Create New | RightSideTabs should not own many terminal entries; Terminal.vue should stay single-target. | Existing files lack the right owner. |
| Target root normalization | `workspaceMetadata.ts` / `terminalTarget.ts` | Extend | Existing helpers already define normalized root semantics. | N/A |
| Backend/node endpoint scope | `windowNodeContextStore.ts` / `nodeEndpoints.ts` | Reuse | Existing store owns current node binding, binding revision, and endpoints. | N/A |
| Node/backend rebinding cleanup | `windowNodeContextStore.ts` + `TerminalPanel.vue` | Extend | Use binding revision / endpoint scope as cache reset signal. | N/A |
| Terminal visual fit/resize | `Terminal.vue` existing `safeFit`, `FitAddon`, resize observer | Extend | Terminal already owns xterm fit/resize. | N/A |
| Terminal transport lifecycle | `useTerminalSession.ts` | Reuse unchanged | Existing owner remains correct for one child because rebinding clears old children instead of preserving old-node endpoint identity. | N/A |
| Backend PTY cleanup | `terminal-streaming` route/handler/manager | Reuse unchanged | Existing cleanup is correct for true WebSocket close. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout` | Right-side tab lifecycle and lazy host visibility | DS-002 | `RightSideTabs.vue` | Extend | Host TerminalPanel, not Terminal directly. |
| `autobyteus-web/components/workspace/tools` | Terminal host/cache, node-rebind cache reset, and individual terminal visual sessions | DS-001, DS-003, DS-004, DS-005, DS-006, DS-007 | `TerminalPanel.vue`, `Terminal.vue` | Create/Extend | New host beside existing Terminal component. |
| `autobyteus-web/utils` | Terminal target identity construction | DS-001, DS-004 | `TerminalPanel.vue` | Extend | Add key utility near target helpers. |
| `autobyteus-web/composables` | Terminal WebSocket session transport | DS-001, DS-003, DS-006 | `useTerminalSession.ts` | Reuse | No tab/cache policy. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Backend terminal streaming and PTY cleanup | DS-001, DS-003, DS-006 | `TerminalHandler`, `PtySessionManager` | Reuse | No change intended. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Layout/tab host | `RightSideTabs.vue` | Track TerminalPanel first-open; render panel with lazy mount + show/hide; pass active. | Existing file owns tab content lifecycle. | Reuses Files pattern. |
| `autobyteus-web/components/workspace/tools/TerminalPanel.vue` | Workspace tools/Terminal | Terminal cache owner | Compute current target/key; lazily create cache entries; render all cached Terminal children with v-show/active. | New owner needed for multi-target cache. | Reuses target key utility and `Terminal.vue`. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Workspace tools/Terminal | Single target visual owner | Accept `active`; distinguish omitted vs null target; refit/resize on visible reactivation; keep unmount cleanup. | Existing file owns xterm lifecycle. | Uses `useTerminalSession`. |
| `autobyteus-web/utils/terminalTarget.ts` | Utils/terminal target | Terminal target identity utility | Add canonical key builder and maybe key type. | Existing target construction owner. | Reuses `normalizeWorkspaceRootPath`. |
| `autobyteus-web/components/workspace/tools/__tests__/TerminalPanel.spec.ts` | Terminal tests | Terminal cache coverage | Assert per-key creation/reuse/lazy behavior. | New component needs focused tests. | Mocks Terminal. |
| Existing `RightSideTabs.spec.ts` / `Terminal.spec.ts` | Tests | Existing owners | Update for TerminalPanel and active/target behavior. | Existing coverage locations. | N/A |
| `autobyteus-web/docs/terminal.md` | Web docs | Terminal architecture docs | Document TerminalPanel/per-target cache and cleanup boundaries. | Existing terminal doc. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Terminal target key derivation | `autobyteus-web/utils/terminalTarget.ts` | Terminal target utilities | Needed by TerminalPanel and tests; should not duplicate key string logic. | Yes | Yes | Generic workspace key for unrelated domains. |
| Cached terminal entry shape | Local type in `TerminalPanel.vue` unless reused | TerminalPanel | Only local for now. | Yes | Yes | Global store before cross-component need exists. |
| Lazy stateful tab pattern | None for this scope | `RightSideTabs.vue` | Files + Terminal pattern is small; no shared abstraction yet. | N/A | N/A | Generic tab lifecycle framework prematurely. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TerminalTarget` | Yes | Existing | Low | Use `rootPath` as identity; workspaceId/displayName metadata only. |
| Terminal target cache key | Yes | Yes | Low | Include node scope + one mode. Do not include display name. |
| TerminalPanel entry `{ key, target, label? }` | Yes | Yes | Low | `target` is explicit snapshot; `null` means server-home. |
| Terminal `active` prop | Yes | Yes | Low | Only visible/active state for layout/refit. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Layout/tab host | Right-side tab lifecycle owner | Import/render TerminalPanel. Add `isTerminalTabActive`, `hasOpenedTerminalTab`, `shouldMountTerminalPanel`; render with `v-if` + `v-show` and pass active. | Existing owner of tab content mount/visibility. | Local Files pattern. |
| `autobyteus-web/components/workspace/tools/TerminalPanel.vue` | Workspace tools/Terminal | Terminal cache owner | Resolve current effective target from explicit prop or workspace metadata if needed; compute target key with node scope; lazily append entries when active; render children keyed by target key; clear all entries on node binding revision / terminal endpoint scope changes. | New governing owner for per-target cache. | Target key utility, Terminal.vue. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Workspace tools/Terminal | Single target visual/session owner | Add `active` prop; fix target resolution (`undefined` fallback vs explicit null); refit/resize when active child becomes visible; keep true unmount disconnect. | Existing xterm owner. | `useTerminalSession`, target utilities. |
| `autobyteus-web/utils/terminalTarget.ts` | Utils/terminal target | Terminal target identity | Export helper to build canonical key from target + node scope; keep `createTerminalTarget`. | Existing target utility owner. | `normalizeWorkspaceRootPath`. |
| `autobyteus-web/components/workspace/tools/__tests__/TerminalPanel.spec.ts` | Terminal tests | TerminalPanel tests | Cover same path reuse, different path separation, server-home separation, lazy create only when active, backend/node scope key separation, and clear-cache-on-node-rebind behavior. | New component. | Mocks/stubs. |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | Layout tests | Right-side tab lifecycle tests | Update Terminal stub to TerminalPanel; assert TerminalPanel stays lazy/persistent across tab switch. | Existing RightSideTabs suite. | N/A |
| `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts` | Terminal tests | Terminal component tests | Add explicit-null target behavior and active reactivation fit/resize; assert unmount still disconnects. | Existing Terminal suite. | N/A |
| `autobyteus-web/docs/terminal.md` | Web docs | Terminal docs | Update module structure and runtime lifecycle. | Existing terminal doc. | N/A |

## Ownership Boundaries

- `RightSideTabs.vue` is authoritative for tab selection and whether TerminalPanel is part of the right-side tab content after first use. It must not create individual terminal sessions.
- `TerminalPanel.vue` is authoritative for terminal cache identity, entry lifecycle within the current host, and cache reset on node/backend rebinding. It must not own xterm internals or WebSocket byte handling.
- `Terminal.vue` is authoritative for one xterm/WebSocket visual terminal instance. It must not own the multi-target cache or tab list policy.
- `useTerminalSession.ts` remains authoritative for one WebSocket transport. It should not learn about active tabs, target cache maps, or workspace history.
- Backend terminal route/handler/manager remain authoritative for PTY lifecycle after WebSocket open/close.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RightSideTabs.vue` tab lifecycle | Local first-open and active state | Workspace layout/right strip | TerminalPanel reading/modifying global active tab itself | Pass `active` and keep selection owner in RightSideTabs. |
| `TerminalPanel.vue` cache boundary | Entry map/list, target key, child selection, node-rebind cache reset | `RightSideTabs.vue` | RightSideTabs rendering many Terminal children or computing keys directly; children preserving old-node sessions without endpoint pinning | Add/extend TerminalPanel props/methods. |
| `Terminal.vue` single-target boundary | xterm, FitAddon, output callback, unmount cleanup | TerminalPanel | TerminalPanel manipulating xterm/session internals directly | Add minimal props/events to Terminal. |
| `useTerminalSession.ts` transport | WebSocket, decoder, sendInput/sendResize/disconnect | Terminal.vue | Terminal.vue rebuilding WebSocket URLs or encoding bytes directly | Add composable API only if needed. |
| Backend terminal WebSocket route/handler | Auth, cwd resolution, PTY creation/cleanup | Frontend WebSocket clients | Frontend assuming backend PTY survives a closed socket | Separate detached-session design if needed. |

## Dependency Rules

Allowed:
- `RightSideTabs.vue` may import/render `TerminalPanel.vue` and pass `active`.
- `TerminalPanel.vue` may import `Terminal.vue`, workspace store, window node context store, and terminal target key utilities. It must watch the node binding revision or normalized terminal endpoint scope to clear its cache on rebinding.
- `Terminal.vue` may call `useTerminalSession`, xterm/FitAddon APIs, and workspace metadata utilities for legacy no-prop fallback.
- `useTerminalSession.ts` may resolve active bound terminal endpoint and open WebSocket.
- Backend route may call `TerminalHandler`; handler may call `PtySessionManager`.

Forbidden:
- Do not have `RightSideTabs.vue` call `useTerminalSession`, xterm, or backend terminal APIs directly.
- Do not have `Terminal.vue` own a map of workspace path terminals.
- Do not have `useTerminalSession.ts` know about right-side tabs or workspace switching policy.
- Do not include `workspaceId` or display name as identity fields that split sessions for the same normalized path.
- Do not retain backend PTYs after WebSocket close in this change.
- Do not preserve cached terminal children across node/backend rebinding; do not add endpoint-pinned transport identity in this task.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `<TerminalPanel :active="isTerminalTabActive" />` | Terminal cache host visibility | Let cache owner know when it may create/show current target and when children are hidden. | Boolean active | RightSideTabs owns active tab state. |
| Terminal target key helper | Terminal target identity | Build canonical key and expose/consume the normalized endpoint scope TerminalPanel watches. | `{ nodeId, terminalWs, target: TerminalTarget|null }` or equivalent | Null target means server-home; undefined should not be accepted as identity. |
| TerminalPanel node-rebind watcher | Terminal cache reset | Clear cache on node binding revision / normalized endpoint scope changes. | Previous scope vs current scope | Chosen policy; no old-node preservation. |
| `<Terminal :target="entry.target" :active="entry.key === activeKey && panelActive" />` | One terminal target child | Render a specific cached target session. | Snapshot target object or explicit null; boolean active | Prevents target drift. |
| `session.connect()` / `session.disconnect()` | Terminal transport session | Open/close WebSocket. | Internal composable session id and target/cwd | No cache semantics. |
| `/ws/terminal/:sessionId` | Backend terminal WebSocket | Create active PTY-backed terminal session. | WebSocket path `sessionId` + optional cwd/rootPath | Unchanged. |

Rule:
- `undefined target` means "Terminal.vue may derive from active workspace metadata for legacy direct usage".
- `null target` means "explicit server-home terminal".
- `TerminalPanel` entries must pass either a concrete target object or `null`, not `undefined`.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| TerminalPanel `active` prop | Yes | Yes | Low | Add tests. |
| Target key helper | Yes | Yes | Low | Enforce target argument is explicit target or null; include endpoint scope. |
| TerminalPanel node-rebind watcher | Yes | Yes | Low | Clear entries on scope change. |
| Terminal `target` prop | Yes after fix | Yes | Medium currently | Distinguish undefined vs null. |
| `useTerminalSession` existing API | Yes | Yes | Low | Reuse unchanged. |
| `/ws/terminal/:sessionId` | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Terminal cache host | `TerminalPanel` or `TerminalSessionHost` | Yes | Low | Prefer `TerminalPanel` if it is UI-rendered; prefer `TerminalSessionHost` if implementation wants host emphasis. |
| Target key utility | `getTerminalTargetCacheKey` or `buildTerminalTargetKey` | Yes | Low | Include node scope in parameter names. |
| Cached entry | `CachedTerminalEntry` | Yes | Low | Local type in host. |
| Active child key | `activeTerminalTargetKey` | Yes | Low | Computed in host. |
| Node endpoint scope | `terminalEndpointScope` or `activeTerminalNodeScope` | Yes | Low | Computed from node context and watched for cache clear. |

## Applied Patterns (If Any)

- Lazy-mounted stateful tab: `RightSideTabs.vue` mounts TerminalPanel only after first Terminal activation and hides it when inactive.
- Per-target component cache: `TerminalPanel.vue` maintains many keyed `Terminal.vue` children and toggles visibility rather than mutating one child.
- Cache reset boundary: node/backend rebinding is a reset boundary; all cached children are removed to release old resources and avoid endpoint-pinning complexity.
- Visibility-reactivation layout correction: `Terminal.vue` uses `active` transitions to refit xterm and send backend resize.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | File | Right-side tab lifecycle | Lazy-host TerminalPanel and pass active visibility. | Existing owner of right-side tab content. | Terminal session maps, xterm, WebSocket internals. |
| `autobyteus-web/components/workspace/tools/TerminalPanel.vue` | File | Terminal cache owner | Per-target cache entries, child visibility, and cache reset on node/backend rebinding. | Workspace tools area already owns Terminal UI. | Backend PTY management, codec, or endpoint-pinned transport. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | File | Single target visual owner | xterm/session binding for one target. | Existing terminal component. | Multi-target cache or right-side tab selection. |
| `autobyteus-web/utils/terminalTarget.ts` | File | Terminal target utilities | Canonical target key helper. | Existing target construction and normalization logic. | UI component state. |
| `autobyteus-web/components/workspace/tools/__tests__/TerminalPanel.spec.ts` | File | Terminal cache tests | Unit tests for host behavior including node-rebind cache clearing. | Beside component under test. | Backend e2e. |
| `autobyteus-web/docs/terminal.md` | File | Terminal docs | Document new host/cache. | Existing terminal docs. | Claims of reload persistence. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout` | Main-Line UI layout control | Yes | Low | RightSideTabs remains the tab owner only. |
| `autobyteus-web/components/workspace/tools` | Main-Line UI tool + local host | Yes | Low | TerminalPanel owns cache and node-rebind reset; Terminal owns one visual session. |
| `autobyteus-web/utils` | Off-Spine identity utility | Yes | Low | Target key logic is reusable and non-UI. |
| `autobyteus-web/composables` | Transport/off-spine concern | Yes | Low | `useTerminalSession` remains one WebSocket owner. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Backend transport/runtime control | Yes | Low | No change in scope. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tab host | `<TerminalPanel v-if="shouldMountTerminalPanel" v-show="isTerminalTabActive" :active="isTerminalTabActive" />` | `<Terminal v-if="effectiveActiveTab === 'terminal'" />` | The good shape preserves the host; the bad shape destroys sessions. |
| Per-target children | `entries.map(entry => <Terminal key=entry.key target=entry.target active=entry.key===activeKey && active />)` | One `<Terminal :target="currentTarget" />` that reconnects on target change | The good shape preserves A and B separately. |
| Target key | `nodeScope|cwd:/Users/normy/project` and `nodeScope|server-home` | `workspaceId` only or display name based key | Root path is the real terminal cwd identity; display names drift. |
| Server-home target | Pass `target={null}` explicitly to Terminal child | Omit target prop and let Terminal fallback to active workspace | Explicit null prevents hidden server-home entry from mutating. |
| Node/backend rebinding | `bindingRevision changes -> TerminalPanel entries = [] -> children unmount -> old WebSockets close` | Preserve old-node children while `useTerminalSession` still resolves global current endpoint | Clear-on-rebind is resource-safe and avoids endpoint-pinning transport work. |
| Backend lifecycle | True host unmount closes children/WebSockets and backend closes PTYs | Keep backend PTYs alive after arbitrary socket close | Current backend cleanup is safety-critical. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep direct Terminal `v-if` and add backend reattach | Could make remount recover if backend retained PTY. | Rejected | Avoid remount for in-window UX; preserve backend cleanup. |
| Use deterministic session id per workspace while still remounting | Could reconnect by id. | Rejected | Backend closes on disconnect and duplicate/reuse semantics are not designed. |
| One cached Terminal only | Smaller change. | Rejected after user refinement | Add per-canonical-target host cache for better UX. |
| Key cache by `workspaceId` | Simple field exists. | Rejected | Same canonical path may appear under different context/run ids; root path is identity. |
| Treat `null` target as fallback | Existing behavior. | Rejected | Explicit server-home entries must remain server-home. |
| Generic stateful-tab framework | Could unify Files and Terminal. | Rejected for now | Terminal-specific host is the real new owner; generic tab abstraction is premature. |
| Preserve old-node entries across backend/node rebinding | Would keep terminal sessions alive if user switches nodes and later returns. | Rejected for this scope | Clear TerminalPanel cache on rebinding. Future preservation requires endpoint-pinned entry transport and explicit cleanup policy. |

## Derived Layering (If Useful)

Frontend layers for this scope:
- Layout/tab host: `RightSideTabs.vue` decides panel visibility.
- Terminal cache host: `TerminalPanel.vue` owns canonical target entries and node/backend rebinding cache reset.
- Tool component: `Terminal.vue` owns one target's xterm/WebSocket visual lifecycle.
- Transport composable: `useTerminalSession.ts` owns one WebSocket transport.
- Backend runtime: route/handler/manager own PTY lifecycle.

The layout layer must not bypass the cache host or manipulate terminal internals.

## Migration / Refactor Sequence

1. Add/extend terminal target identity utility:
   - Add a canonical key helper under `autobyteus-web/utils/terminalTarget.ts` or adjacent file.
   - Inputs should include node/backend scope (`nodeId` and normalized terminal endpoint/base URL) plus explicit `TerminalTarget | null`.
   - Expose or reuse the same normalized endpoint scope in TerminalPanel's rebinding watcher so key identity and reset identity stay aligned.
   - Use `normalizeWorkspaceRootPath()` for root path.
   - Return distinct keys for server-home and cwd modes.
2. Add `TerminalPanel.vue`:
   - Accept `active?: boolean`, default false/true according to usage; from RightSideTabs pass explicit active.
   - Use workspace store to derive current terminal target from `activeWorkspaceMetadata` when a workspace exists; otherwise explicit server-home `null`.
   - Use window node context store to derive node scope and observe `bindingRevision` and/or normalized `terminalWs` scope.
   - Keep local cached entries array/map: `{ key, target }`, where `target` is a snapshot object or `null`.
   - Watch active/current key. Only when `active === true`, ensure current entry exists.
   - Render all entries with stable `:key="entry.key"`; `v-show` only the current active entry; pass `:active="active && entry.key === activeKey"` and `:target="entry.target"`.
   - On node/backend binding change, clear all cached entries. This unmounts children, closes WebSockets, and releases old PTYs. Do not preserve entries across rebinding in this scope.
3. Modify `RightSideTabs.vue`:
   - Replace direct Terminal import/render with TerminalPanel.
   - Add `hasOpenedTerminalTab`, `isTerminalTabActive`, and `shouldMountTerminalPanel` analogous to Files state.
   - Lazy mount TerminalPanel after first activation and hide/show afterward.
4. Modify `Terminal.vue`:
   - Add `active?: boolean` prop with default true for non-panel legacy usage.
   - Fix effective target resolution: omitted target prop (`undefined`) means fallback to active workspace metadata; explicit `null` means server-home.
   - Preserve current target-change reconnect behavior inside a child, but cached children from TerminalPanel should get snapshot targets and therefore not drift.
   - Watch active true and run refit/resize after DOM visibility.
   - Keep `onBeforeUnmount()` cleanup unchanged.
5. Tests:
   - Add `TerminalPanel.spec.ts` for key cache behavior: same normalized path reused, different path creates separate entry, server-home separate, lazy create only when active, no target drift, node scope separation, and cache clear on binding revision / terminal endpoint scope change.
   - Update `RightSideTabs.spec.ts` for TerminalPanel lazy persistence.
   - Update `Terminal.spec.ts` for explicit null target behavior and active reactivation fit/resize; keep unmount disconnect test.
6. Docs:
   - Update `autobyteus-web/docs/terminal.md` module structure and lifecycle notes.
7. Validation guidance:
   - Run targeted frontend tests:
     - `pnpm -C autobyteus-web exec vitest --run components/layout/__tests__/RightSideTabs.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts components/workspace/tools/__tests__/TerminalPanel.spec.ts composables/__tests__/useTerminalSession.spec.ts`
   - Backend targeted tests are optional unless backend touched; if touched accidentally, run:
     - `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/services/terminal/terminal-handler.test.ts tests/unit/services/terminal/pty-session-manager.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`

## Key Tradeoffs

- Best UX keeps one live terminal per opened target while the host is alive. The cost is that multiple opened targets mean multiple live WebSockets/PTYs.
- Lazy creation avoids spawning PTYs for workspace switches when Terminal is hidden, but hidden already-opened terminals remain alive by design.
- Not adding backend detached reattach keeps the change safe and aligned with cleanup docs. The cost is no persistence across full reload/restart, host destruction, or node/backend rebinding.
- Clearing cache on node/backend rebinding avoids endpoint-pinned transport work and hidden old-node PTYs. The cost is that old-node terminals are closed when the window is rebound.
- A new TerminalPanel is more code than a one-Terminal cache, but it gives a clear owner for per-target lifecycle and keeps Terminal.vue single-target.

## Risks

- Many opened target paths can accumulate multiple PTYs. If this becomes a problem, add explicit close buttons or an LRU/idle policy in TerminalPanel as a separate UX decision.
- Right-panel collapse may still destroy TerminalPanel if the parent layout unmounts it. If users expect collapse persistence, move the host above the collapsing boundary or change collapse to hide instead of unmount.
- Frontend path normalization may not match backend filesystem canonicalization in all symlink/case cases. For current UX, use existing frontend normalized root path; backend still validates actual cwd.
- Node/backend rebinding intentionally clears cached terminals. If users later need old-node preservation, design endpoint-pinned child transports and explicit old-node eviction/close UI.

## Guidance For Implementation

- Keep backend files unchanged unless tests reveal a coupling not found in investigation.
- Do not add backend reattach, replay, idle TTL, or endpoint-pinned old-node transport in this task.
- Ensure TerminalPanel entries store target snapshots. Do not let old entries depend on current workspace metadata.
- Ensure TerminalPanel clears its entries on node binding revision / normalized terminal endpoint scope changes. The test should verify child components unmount and no old entry is reused after rebinding.
- In `Terminal.vue`, do not use truthiness for target resolution; use explicit undefined/null semantics.
- In `Terminal.vue`, `active=false` must not disconnect. It should only suppress visible-layout work.
- After `safeFit()` on active true, send resize using xterm dimensions if available. Guard missing `terminalInstance`, hidden zero dimensions, and disconnected session.
- Keep initialization banner tied to xterm creation only. Because cached xterm instances are reused, duplicate banners should disappear naturally for restored targets.
