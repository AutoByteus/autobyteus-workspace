# Design Spec: Default Server-Home Terminal When No Workspace Is Selected

- Status: `Ready for architecture review`
- Ticket: `default-terminal-home-workspace`
- Date: `2026-06-04`
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace/investigation-notes.md`

## Scope Summary

Make the workspace Terminal productive when no active workspace/run context exists by connecting to a backend-default cwd: the backend process user's home directory. Preserve existing explicit workspace-root behavior when active workspace metadata exists. Preserve explicit invalid cwd rejection. Do not create a workspace record, select a workspace, or acquire File Explorer watchers for the default-home terminal.

## Task Design Health Assessment

- Change posture: `Behavior Change`
- Root-cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes, small boundary refactor`
- Evidence: `Terminal.vue` owns a local no-root UI rejection even though backend `/ws/terminal` is the only boundary that can authoritatively resolve and validate a server-side default cwd. `useTerminalSession.ts` only models explicit root targets, so no-context terminal open has no legitimate connection mode. Backend route also treats omitted cwd as invalid.
- Design response: Move the default cwd policy into backend terminal route resolution and extend the frontend terminal session boundary with an explicit “server default cwd” mode. Remove the workspace Terminal surface's no-active-workspace rejection. Keep explicit invalid cwd rejection as a backend invariant.
- Refactor size: Localized to terminal connection boundary files and tests; no broader terminal/PTY lifecycle refactor.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Required clean cut: The workspace Terminal surface should no longer preserve the old local “missing workspace root means terminal unavailable” behavior.
- Keep, not legacy: Explicit invalid cwd rejection remains because it is a safety/validation invariant, not old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-DTH-001` | Primary End-to-End | Empty-context right-side Terminal mount/open | PTY shell running in backend server home and streaming output to xterm | Backend terminal WebSocket route for cwd resolution; frontend Terminal for UI lifecycle | Main requested UX change. |
| `DS-DTH-002` | Primary End-to-End | Workspace-context Terminal mount/open | PTY shell running in active workspace root and streaming output to xterm | Existing explicit terminal target path | Protects current workspace behavior. |
| `DS-DTH-003` | Return/Event | Workspace context changes after a terminal session exists | Old session closed; new home/workspace session opened | Frontend Terminal component + terminal session composable | Prevents stale cwd sessions and resource leaks. |
| `DS-DTH-004` | Primary Validation | Explicit invalid cwd request | Backend closes WebSocket before PTY creation | Backend terminal WebSocket route | Ensures home fallback does not mask broken explicit workspace context. |
| `DS-DTH-005` | Bounded Local | WebSocket input/output loop | Base64 terminal I/O and resize forwarding | `TerminalHandler` read/message loop | Must remain unchanged except receiving resolved cwd. |

## Primary Execution Spine(s)

- `DS-DTH-001`: `RightSideTabs -> Terminal.vue target resolution (no explicit root) -> useTerminalSession default-cwd connection -> /ws/terminal route omitted-cwd resolver -> os.homedir() validation -> TerminalHandler/PtySessionManager -> PTY shell -> xterm output`
- `DS-DTH-002`: `Active workspace metadata -> TerminalTarget.rootPath -> useTerminalSession cwd query -> /ws/terminal explicit cwd validation -> TerminalHandler/PtySessionManager -> PTY shell -> xterm output`
- `DS-DTH-004`: `Explicit cwd query -> /ws/terminal explicit cwd validation -> fs.stat failure/non-directory -> close 4004 -> frontend session error`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-DTH-001` | When no active workspace target exists, the frontend opens a terminal session in default mode. The WebSocket URL omits cwd/rootPath. The backend route resolves omitted cwd to `os.homedir()`, validates it, and starts the existing PTY session there. | Terminal UI, terminal session composable, backend terminal route, PTY session manager | Backend terminal route owns default cwd resolution; Terminal UI owns mount/reconnect lifecycle | Remote auth, path canonicalization, docs/tests |
| `DS-DTH-002` | When active workspace metadata exists, the frontend builds a normal explicit target and sends that root as `cwd`; backend validates and starts in that path. | Active workspace metadata, Terminal target, session composable, route, PTY | Existing explicit terminal target path | Workspace metadata lookup only; no File Explorer watcher |
| `DS-DTH-003` | When the resolved target changes from home to workspace or workspace to home, Terminal closes the current WebSocket/session and opens a fresh one for the new target mode. | Terminal watcher, session composable, handler disconnect/connect | Terminal UI for reconnect sequencing; backend for cleanup | Session id handling, pending startup aborts |
| `DS-DTH-004` | If a caller sends an explicit invalid cwd/rootPath, backend rejects before PTY creation and frontend displays the server/session error. | Route resolver, fs stat, socket close | Backend terminal route | Error messaging |

## Spine Actors / Main-Line Nodes

- `RightSideTabs.vue`: mounts Terminal when right tab is active.
- `Terminal.vue`: owns xterm UI lifecycle, resolved target-mode watch, and session connect/disconnect timing.
- `useTerminalSession.ts`: owns WebSocket lifecycle and URL construction for either explicit root mode or backend-default mode.
- `registerTerminalWebsocket()` / cwd resolver: owns remote authorization handoff, cwd/default resolution, path validation, and pre-PTY rejection.
- `TerminalHandler` / `PtySessionManager`: own PTY lifecycle, I/O loop, session registry, and cleanup.

## Ownership Map

| Node | Owns | Notes |
| --- | --- | --- |
| `Terminal.vue` | UI mount/dispose, xterm setup, choosing explicit target vs default mode from available frontend context, reconnect on target-mode change | Must not know server home path or mutate workspace state. |
| `useTerminalSession.ts` | WebSocket state, URL construction, encoded input/output, connection errors | Can express “request backend default cwd” by omitting cwd/rootPath. |
| Backend terminal route | Remote auth sequencing, cwd/rootPath/default resolution, canonicalization, directory validation, pre-session rejection | Authoritative boundary for server filesystem cwd. |
| `PtySessionManager` | Session registry, target-key grouping, PTY backend startup/shutdown | Receives already-resolved cwd; no new policy. |
| Workspace store | Active workspace metadata only | Must not own terminal default home fallback. |
| File Explorer subsystem | Tree/search/watch state | Must not be touched by terminal default fallback. |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `Terminal.vue` prop `target` | `useTerminalSession` + backend route | Lets wrappers supply an explicit terminal root without workspace activation | Server home resolution or filesystem validation |
| `/ws/terminal/:sessionId` WebSocket route | Backend terminal route + `TerminalHandler` | Public terminal session entrypoint | File Explorer watcher acquisition or workspace metadata creation |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `Terminal.vue` local no-workspace-root blocking branch/banner for the workspace Terminal default case | Empty-context terminal is now valid and should connect in default mode | `useTerminalSession` default-cwd mode + backend omitted-cwd resolver | In This Change | Keep session/server error display for real connection failures. |
| Hardcoded “Connected to Workspace Terminal” startup copy | Terminal can be server-home rooted, not always workspace-rooted | Generic/accurate terminal startup text in `Terminal.vue` | In This Change | Example: `Connected to Terminal`. |
| Localized no-terminal-root key if no references remain | The workspace Terminal no longer uses local missing-root error | Backend/session error handling | In This Change if unused | Remove only after checking references. |
| Backend “missing cwd is invalid” behavior | Omitted cwd is now a first-class default-home request | `resolveTerminalCwd()` omitted-query branch | In This Change | Explicit empty/invalid cwd remains invalid if sent as `cwd=`. |

## Return Or Event Spine(s)

- `DS-DTH-003`: `effective target-mode key change -> session.disconnect() -> backend handler cleanup -> session.connect() -> new route cwd resolution -> new PTY`
- The watcher key should distinguish explicit roots from default mode, e.g. `explicit:${rootPath}:${workspaceId}` vs `server-home`, so transitions are deterministic.

## Bounded Local / Internal Spines

- Parent owner: `TerminalHandler`
  - Spine: `readLoop -> session.read(timeout) -> encodeOutput -> connection.send -> sleep -> repeat`
  - Why it matters: Must remain unchanged to preserve terminal I/O behavior.
- Parent owner: `Terminal.vue`
  - Spine: `scheduleInitializeTerminal -> initialize xterm -> register onData/onResize/onOutput -> connectTerminal`
  - Why it matters: Removing the local error guard must not send input before session readiness or break delayed initialization.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Remote access WebSocket authorization | `DS-DTH-001`, `DS-DTH-002`, `DS-DTH-004` | Backend route | Authenticate/authorize terminal socket before path/session work | Terminal access is powerful | If skipped or moved later, unauthorized clients could trigger filesystem/path/session work |
| Path canonicalization and directory stat | `DS-DTH-001`, `DS-DTH-002`, `DS-DTH-004` | Backend route | Resolve stable cwd and reject non-directories | Prevent invalid PTY cwd | If done in frontend, remote server path truth is lost |
| Workspace metadata target extraction | `DS-DTH-002`, `DS-DTH-003` | Terminal UI | Convert selected workspace metadata into explicit target | Preserves existing context behavior | If backend queried workspace state, terminal would become coupled to workspace subsystem |
| Documentation | All | Delivery/project docs | Record omitted-cwd home behavior and no workspace materialization | Prevents regressions | If omitted, future work may reintroduce frontend guard |
| Targeted tests | All | Implementation validation | Protect empty-context, explicit context, invalid cwd | Avoid manual-only regression coverage | If misplaced as broad E2E only, failure diagnosis becomes slow |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Default terminal cwd policy | Backend terminal WebSocket route | Extend | Route already owns cwd/rootPath resolution and validation | N/A |
| WebSocket lifecycle for no-context terminal | `useTerminalSession.ts` | Extend | Composable already owns terminal socket connection and URL construction | N/A |
| Active workspace root extraction | `workspaceStore.activeWorkspaceMetadata` + `terminalTargetFromWorkspaceMetadata` | Reuse | Existing explicit context path is correct | N/A |
| PTY lifecycle | `TerminalHandler` / `PtySessionManager` | Reuse unchanged | They only need resolved cwd | N/A |
| File Explorer workspace state | File Explorer subsystem | Do Not Use | Home fallback must not materialize workspace/watchers | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Terminal UI | Mount, xterm, target-mode selection, reconnect, copy | `DS-DTH-001`, `DS-DTH-002`, `DS-DTH-003` | Terminal UI | Extend | Remove no-root red banner for default mode. |
| Frontend Terminal Session | Socket URL, connection state, error handling, I/O methods | `DS-DTH-001`, `DS-DTH-002`, `DS-DTH-003` | `useTerminalSession` | Extend | Add default-cwd mode. |
| Backend Terminal WebSocket | Auth, cwd/default resolution, validation, connect/cleanup handoff | `DS-DTH-001`, `DS-DTH-002`, `DS-DTH-004` | Route | Extend | Add `os.homedir()` branch for omitted query. |
| Backend Terminal Streaming | PTY session registry, read loop, cleanup | All | `TerminalHandler`, `PtySessionManager` | Reuse | No cwd policy changes inside manager. |
| Docs/Validation | Durable knowledge and regression protection | All | Project docs/tests | Extend | Frontend and backend docs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Frontend Terminal UI | Terminal UI | Remove no-root block, pass default-cwd-enabled session option, update watcher key/copy | Existing component owns xterm UI/session timing | `TerminalTarget` |
| `autobyteus-web/composables/useTerminalSession.ts` | Frontend Terminal Session | Terminal session boundary | Add option for backend default cwd and omit cwd/rootPath when no explicit target | Existing composable owns URL construction | `TerminalTarget` |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Backend Terminal WebSocket | Terminal route | Add omitted cwd/rootPath -> `os.homedir()` resolver branch; keep explicit validation | Existing route owns cwd resolution | `canonicalizeWorkspaceRootPath` |
| `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts` | Frontend Tests | Terminal component tests | Cover no active workspace default connection/no red banner and existing explicit target | Existing component test file | N/A |
| `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Frontend Tests | Session composable tests | Cover omitted query URL for default mode and disabled-default no-root error | Existing composable test file | N/A |
| `autobyteus-server-ts/tests/integration/terminal/terminal-websocket.integration.test.ts` | Backend Tests | Fake PTY WebSocket integration | Cover no cwd/rootPath uses canonicalized `os.homedir()` | Existing route/session integration test | N/A |
| `autobyteus-web/docs/terminal.md` | Frontend Docs | Terminal docs | State default-home behavior and generic copy | Existing terminal frontend docs | N/A |
| `autobyteus-server-ts/docs/modules/terminal.md` | Backend Docs | Terminal backend docs | State omitted cwd/rootPath defaults to server home; invalid explicit cwd still rejected | Existing backend terminal docs | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Terminal connection mode | None initially; keep as a small session option type in `useTerminalSession.ts` | Frontend Terminal Session | Only used by session composable/component in this scope | Yes | Yes | A fake `TerminalTarget` with `rootPath: '~'` or `rootPath: ''` |
| Backend default cwd resolver | None; private helper in `terminal.ts` unless testing requires export | Backend Terminal WebSocket | Only route needs it | Yes | Yes | A workspace manager concern |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TerminalTarget` | Yes: explicit root target | Yes | Low if not overloaded | Do not add optional/default-home meaning to `rootPath`; keep default as separate session option/mode. |
| New session default option | Yes: whether omitted target may request backend default cwd | Yes | Low | Name explicitly, e.g. `defaultCwd: 'server-home'` or `allowServerDefaultCwd: true`; avoid generic `fallback` ambiguity. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Frontend Terminal UI | Terminal UI | Resolve explicit target if available, otherwise allow default server-home session; remove local no-root UI error; reconnect on target-mode key changes; generic welcome text | Existing component owns terminal surface | `TerminalTarget`, session option |
| `autobyteus-web/composables/useTerminalSession.ts` | Frontend Terminal Session | Socket lifecycle boundary | Support explicit-root URL and default-server-home URL; retain local error when no target and default disabled | Existing composable owns socket mechanics | `TerminalTarget` |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Backend Terminal WebSocket | Cwd resolution boundary | Resolve omitted query to `os.homedir()`; canonicalize/stat both explicit/default cwd; keep `4004` for unavailable cwd | Existing route owns path validation before PTY creation | `canonicalizeWorkspaceRootPath` |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Localization | Terminal strings | Remove no-root key if no longer referenced, or leave only if another caller uses it | Existing localization location | N/A |
| `autobyteus-web/docs/terminal.md` | Frontend Docs | Terminal docs | Document default-home mode and no workspace materialization | Existing terminal doc | N/A |
| `autobyteus-server-ts/docs/modules/terminal.md` | Backend Docs | Terminal docs | Document omitted-query default and explicit invalid cwd rejection | Existing backend terminal doc | N/A |
| Existing frontend/backend terminal test files | Validation | Test ownership | Add targeted regression coverage | Existing relevant test owners | N/A |

## Ownership Boundaries

- Backend `/ws/terminal` is the authoritative filesystem boundary. It resolves server home, canonicalizes cwd, validates directory existence, and decides whether to create a PTY.
- Frontend Terminal is only a UI/session lifecycle owner. It may decide “explicit target exists” vs “request server default,” but it must not compute server home or create fake workspace identity.
- Workspace store remains the owner of selected workspace metadata only. It must not be mutated to support default terminal.
- File Explorer remains the owner of tree/watch/search state. Terminal default must not acquire File Explorer sessions.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Backend terminal WebSocket route | `os.homedir()` resolution, canonicalization, `fs.stat`, close code/reason | Frontend `useTerminalSession`, any terminal WebSocket client | Frontend sending `~`, browser/electron home, or empty string as fake cwd | Add explicit omitted-query/default-cwd contract to route/composable |
| `useTerminalSession.ts` | WebSocket URL/session state | `Terminal.vue` and any future terminal UI wrapper | Components manually constructing terminal URLs with inconsistent default behavior | Extend session options/types |
| Workspace store | Active workspace metadata | `Terminal.vue` for explicit root only | Registering/creating home workspace just to satisfy terminal | Keep terminal fallback separate |

## Dependency Rules

Allowed:
- `Terminal.vue` may depend on `workspaceStore.activeWorkspaceMetadata` and `terminalTargetFromWorkspaceMetadata()` for explicit workspace context.
- `Terminal.vue` may depend on `useTerminalSession()` for connection lifecycle.
- `useTerminalSession()` may depend on window node context endpoints and remote-access credential utilities.
- Backend terminal route may depend on Node `os`, `fs`, path canonicalization, remote access auth, and terminal handler.

Forbidden:
- Frontend must not compute backend server home or send fake `~`/empty cwd values.
- Backend terminal route must not create workspace metadata or acquire File Explorer watchers.
- `PtySessionManager` must not learn workspace/default-home policy; it receives resolved cwd only.
- Explicit invalid cwd/rootPath must not fall back to home.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useTerminalSession(options)` | Terminal session connection | Connect/disconnect terminal socket | Explicit `TerminalTarget` with `rootPath`, or no target plus explicit default-server-home option | Keep no-target error when default option is absent/disabled. |
| Terminal WebSocket URL | Terminal cwd request | Select explicit or default cwd | `?cwd=/abs/path`, `?rootPath=/abs/path`, or omitted `cwd/rootPath` for server home | Omitted means default; explicit empty string should be treated as invalid explicit input if present. |
| `resolveTerminalCwd(query)` | Backend cwd resolver | Canonicalize/validate cwd before PTY | Explicit query string or omitted query | Add `os.homedir()` branch only for omitted parameters. |
| `TerminalHandler.connect(connection, targetKey, sessionId, cwd)` | PTY lifecycle | Start resolved terminal session | Resolved cwd string | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `useTerminalSession` | Yes after default option | Yes | Low | Name option clearly as server default cwd, not generic fallback. |
| `/ws/terminal` query | Yes | Yes | Medium if empty query and empty string are conflated | Implement helper that distinguishes property absence from explicit empty value. |
| `TerminalTarget` | Yes | Yes | Low | Do not overload with default-home identity. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Explicit root target | `TerminalTarget` | Yes | Low | Keep for explicit root target only. |
| Default mode | Proposed `server-home` / `serverDefaultCwd` | Yes | Low | Avoid `workspace fallback` naming. |
| Route resolver | `resolveTerminalCwd` | Yes | Low | Keep name; add default behavior comments/tests. |

## Applied Patterns

- Boundary resolver: backend route resolves and validates input into a single concrete cwd before handing to session manager.
- Existing WebSocket lifecycle pattern: no change to handler/manager cleanup, read loop, or abort behavior.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | File | Terminal UI | Empty-context connection behavior and copy | Existing terminal component | Server home path resolution |
| `autobyteus-web/composables/useTerminalSession.ts` | File | Terminal session | Default-cwd URL mode | Existing WebSocket session owner | Workspace store mutation |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | File | Backend terminal route | Omitted cwd -> `os.homedir()`; validation | Existing cwd/rootPath route owner | PTY backend internals or workspace metadata creation |
| `autobyteus-server-ts/src/services/terminal-streaming/*` | Folder | Terminal streaming | No planned change | Existing lifecycle owner remains healthy | Default cwd policy |
| `autobyteus-web/docs/terminal.md` | File | Frontend docs | Update runtime behavior | Existing terminal doc | Backend-only implementation details beyond summary |
| `autobyteus-server-ts/docs/modules/terminal.md` | File | Backend docs | Update route contract | Existing backend terminal module doc | Frontend UI instructions beyond relevant contract |

## Implementation Sequence

1. Backend route resolver:
   - Import `os` in `autobyteus-server-ts/src/api/websocket/terminal.ts`.
   - Distinguish omitted `cwd`/`rootPath` from explicit provided values.
   - If both are omitted, set raw cwd to `os.homedir()`.
   - If either is provided, use existing precedence `cwd ?? rootPath`; keep canonicalize/stat rejection.
   - Preserve close code/reason for unavailable cwd.
2. Frontend session boundary:
   - Add an explicit option to `useTerminalSession()` for backend default cwd, e.g. `defaultCwd: 'server-home'` or `allowServerDefaultCwd: true`.
   - In `connect()`, when no target exists and default mode is enabled, build the WebSocket URL without `cwd` or `rootPath` query parameters.
   - Preserve current no-target error when default mode is not enabled.
3. Frontend Terminal UI:
   - Pass the default-server-home option to `useTerminalSession()` for the workspace Terminal surface.
   - Remove the local no-root red banner/block from `connectTerminal()`; real connection failures still show `session.errorMessage`.
   - Update target-change watch key to include default mode (`server-home`) when no explicit target exists.
   - Change hardcoded welcome copy from workspace-specific to generic/accurate text.
4. Tests:
   - Update/add frontend component/session tests for empty-context default and explicit workspace behavior.
   - Add backend integration test for omitted cwd/rootPath -> `os.homedir()`.
   - Ensure explicit invalid cwd tests remain unchanged and passing.
5. Docs/localization cleanup:
   - Update frontend/backend terminal docs.
   - Remove obsolete localization key if unused after component change.

## Validation Plan

Targeted implementation checks:

- Frontend:
  - `pnpm -C autobyteus-web exec vitest run components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts`
- Backend:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- Optional broader checks if implementation touches shared types/config:
  - `pnpm -C autobyteus-web exec vitest run components/layout/__tests__/RightSideTabs.spec.ts`
  - `pnpm -C autobyteus-server-ts typecheck`

Manual/product validation expectation:
- Open `/workspace` with no selected agent/team/run/config. Terminal should show no no-workspace-root red banner and should accept commands from server home.
- Select or open a workspace-backed run/config. Terminal should reconnect to that workspace root.
- Try an explicit invalid cwd through backend test/client. It should still close with `Terminal cwd unavailable` and create no PTY session.

## Design Tradeoffs

- Server home vs managed shared workspace: Server home best matches the user's request and mirrors VS Code-like default terminal behavior. A managed shared workspace could be safer in some deployments but would introduce workspace/materialization semantics out of scope.
- Frontend omission vs fake path: Omitting cwd is cleaner because it lets the backend choose the real server home. Fake `~` would resolve relative to backend process cwd or shell semantics inconsistently and would be wrong for remote clients.
- Immediate PTY on first open: Since Terminal is the default right tab today, this change may create a PTY immediately on initial workspace page mount. This is acceptable for the improved first-use UX and remains bounded by existing disconnect cleanup.

## Open Risks / Follow-Up

- Confirm deployment expectations for Docker `HOME=/root`. If product wants a safer default later, add a backend configurable default cwd resolver; do not move default policy to frontend.
- If home fallback becomes configurable, keep one authoritative backend resolver and avoid dual frontend/backend defaults.
