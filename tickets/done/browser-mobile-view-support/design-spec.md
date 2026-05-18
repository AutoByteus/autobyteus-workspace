# Design Spec

## Current-State Read

The current Browser implementation is a desktop embedded Electron Browser surface with a strict server tool contract and an Electron-main-owned session lifecycle.

Agent/server flow: runtime tool call -> server browser manifest/parser/service -> bridge HTTP route -> Electron `BrowserTabManager` -> `WebContentsView` / `webContents`.

UI flow: `BrowserPanel.vue` -> `browserShellStore` -> preload IPC -> `BrowserShellController` -> `BrowserTabManager` -> `WebContentsView`.

Current evidence:

- Server stable tools are only `open_tab`, `navigate_to`, `close_tab`, `list_tabs`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`.
- Electron bridge routes mirror only those operations.
- BrowserPanel has no mobile toggle.
- Browser session state stores `viewportBounds`, meaning physical host/view bounds, not a device-emulation state.
- Electron 38.8.2 exposes `webContents.enableDeviceEmulation(parameters)` and `disableDeviceEmulation()`.

## Intended Change

Add first-class per-tab device/mobile emulation for Browser sessions, including both device metrics and Chrome DevTools-like centered finite device viewport presentation, exposed through both:

1. a new server/agent Browser tool, `set_device_emulation`, and
2. a BrowserPanel mobile/desktop toggle for the active tab.

Desktop remains the default. The implementation must not create a renderer-only mobile mode or a second source of truth. Mobile mode must not merely narrow the CSS viewport inside a full-width/full-height Browser host; it must project the native Browser view into a centered finite device rectangle derived from the active profile.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Mobile emulation spans server tool schema, bridge transport, Electron `webContents`, Browser shell snapshots, and UI controls. Current `viewportBounds` is physical projection state only; overloading it would blur host layout with device emulation. The first implementation confirmed this: it applies `enableDeviceEmulation(...)` but still uses full host bounds for the native `WebContentsView`, producing left-aligned/full-host presentation.
- Design response: Add a focused Browser device-emulation concern under the Electron Browser subsystem. `BrowserTabManager` remains the authoritative session owner and delegates application/normalization to the focused concern. Server and UI both call that same owner.
- Refactor rationale: Without extracting a focused emulation concern, `BrowserTabPageOperations` would mix screenshots/reads/DOM/JS with persistent device profile policy, or the renderer would become a hidden owner of native browser mode.
- Intentional deferrals and residual risk, if any: Full Chrome DevTools device catalog, network throttling, geolocation, sensors, and deep touch emulation are deferred. If validation proves Electron `enableDeviceEmulation` is insufficient for touch semantics, a follow-up can add CDP-backed touch emulation behind the same owner.

## Terminology

- Browser session: one Electron Browser tab/session addressed by `tab_id`.
- Host bounds: renderer-measured rectangle where Electron can place the native browser view.
- Device presentation bounds: computed native `WebContentsView` rectangle used in mobile mode; finite, centered, and derived from the active device profile plus available host bounds.
- Device emulation state: per-tab desktop/mobile mode plus effective mobile profile, separate from host bounds.
- Device profile: width, height, device scale factor, screen position, scale, and optional user-agent policy.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy mobile API exists. Do not add compatibility aliases such as `mobileView`, `is_mobile`, `viewport`, or overloaded `open_tab` parameters.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent `set_device_emulation` call | Electron Browser tab has applied mobile/desktop emulation and tool result returns | `BrowserTabManager` | Server/tool path must reach the same native session owner used by the UI |
| DS-002 | Primary End-to-End | BrowserPanel mobile toggle | Active tab snapshot updates and native view changes mode | `BrowserShellController` + `BrowserTabManager` | UI must not own native mobile mode itself |
| DS-003 | Return-Event | Browser session emulation state change | Renderer Browser shell snapshot/store update | `BrowserShellController` | UI needs durable per-tab state feedback |
| DS-004 | Bounded Local | Host bounds or active tab changes | Emulation-aware centered finite device projection applied | `BrowserShellController` + `BrowserTabManager` | Mobile mode must survive tab switching, resizing, and full-view toggles without stretching to full host |

## Primary Execution Spine(s)

- DS-001: `Agent Tool Call -> BrowserToolService -> BrowserBridgeClient -> BrowserBridgeServer -> BrowserTabManager -> BrowserDeviceEmulationController -> webContents`
- DS-002: `BrowserPanel Toggle -> BrowserShellStore -> Preload IPC -> BrowserShellController -> BrowserTabManager -> BrowserDeviceEmulationController -> centered WebContentsView bounds + webContents metrics`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Agent calls `set_device_emulation`; server parses strict args and sends a bridge request; Electron main validates tab/session and applies/clears emulation on the tab's `webContents`; result returns with the effective state. | Tool call, bridge request, browser session, device-emulation application | `BrowserTabManager` | Parser/validator, bridge auth, result serialization |
| DS-002 | User clicks mobile toggle; renderer requests mode change through IPC; shell controller delegates to session manager; active tab emulation changes and snapshot returns. | BrowserPanel, shell IPC, browser session | `BrowserTabManager` behind `BrowserShellController` | Store state, localized tooltip, toolbar icon |
| DS-003 | Emulation changes publish through existing shell snapshot channel so the renderer sees mode/profile state. | Session summary, shell snapshot, renderer store | `BrowserShellController` | Snapshot equality logic |
| DS-004 | When host bounds or active session changes, shell projection computes full-host desktop bounds or centered finite mobile device bounds, then reapplies emulation metrics without losing per-tab state. | Host bounds, active session, native view, device profile | `BrowserShellController` + `BrowserTabManager` | ResizeObserver, zen/full-view mode, fit scale |

## Spine Actors / Main-Line Nodes

- Agent/browser tool call
- Server browser tool boundary
- Browser bridge transport
- Electron Browser session manager
- Browser device-emulation applicator
- Electron `webContents`
- Browser shell snapshot/store
- BrowserPanel toolbar

## Ownership Map

- Server browser tool boundary owns stable tool names, strict schemas, input parsing, validation, and runtime-specific exposure.
- Browser bridge owns authenticated local/remote transport to Electron main.
- `BrowserTabManager` owns Browser session lifecycle and per-tab device emulation state.
- `BrowserDeviceEmulationController` (new focused helper) owns profile normalization, mobile presentation-bound computation, and native `webContents.enableDeviceEmulation` / `disableDeviceEmulation` application.
- `BrowserShellController` owns shell-scoped active tab projection and snapshot publishing.
- Renderer store/UI owns controls and local projection only.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `set_device_emulation` server tool | Electron `BrowserTabManager` via bridge | Stable agent-facing command | Native view state or renderer layout |
| BrowserPanel mobile toggle | `BrowserShellController` / `BrowserTabManager` | User-facing control for active tab | Device profile policy or `webContents` calls |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| N/A | No existing mobile support exists | N/A | In This Change | Avoid adding aliases or compatibility wrappers |

## Return Or Event Spine(s) (If Applicable)

- `BrowserTabManager emulation update -> session-upserted/snapshot publishing -> BrowserShellController snapshot -> BrowserShellStore -> BrowserPanel mode indicator`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `BrowserShellController`
- Chain: `host bounds update -> active session lookup -> emulation-aware projection -> attach/focus WebContentsView -> publish snapshot if state changed`
- Why: resizing/full-view/tab-switching must not accidentally clear or overwrite mobile state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Input parsing/validation | DS-001 | Server browser tool boundary | Strict snake_case typed input | Keeps runtime tool contracts stable | Tool schemas drift or accept aliases |
| Profile normalization and presentation bounds | DS-001, DS-002, DS-004 | `BrowserTabManager` | Clamp/default mobile dimensions, compute centered finite bounds, compute fit scale | Prevents invalid Electron parameters and Chrome-incompatible left/full-host presentation | Duplicated rules in UI and server |
| Snapshot projection | DS-002, DS-003 | `BrowserShellController` | Expose per-tab mode/profile to renderer | UI feedback and tab switching | Renderer infers state incorrectly |
| Screenshot preservation | DS-001 | `BrowserTabPageOperations` | Preserve emulation through screenshot/full-page capture | Avoids hidden reset/regression | Screenshots silently become desktop |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Browser tool exposure | Server browser tools | Extend | Existing manifest/builders already project tools to Codex/Claude | N/A |
| Native browser session state | Electron Browser subsystem | Extend | `BrowserTabManager` already owns sessions and tab records | N/A |
| Device profile application | Electron Browser subsystem | Create New focused file | New persistent native-mode concern; not a page read/screenshot concern | Existing `BrowserTabPageOperations` would become mixed if it owned profile policy |
| UI toggle | BrowserPanel / Browser shell store | Extend | Existing Browser shell UI owns toolbar controls | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server browser tools | Contract, parser, manifest, service method, bridge client route | DS-001 | Server browser boundary | Extend | Add `set_device_emulation` |
| Electron Browser subsystem | Per-tab emulation state and native `webContents` application | DS-001, DS-002, DS-004 | `BrowserTabManager` | Extend | Add focused helper |
| Browser shell IPC/store/UI | User toggle and snapshot state | DS-002, DS-003 | `BrowserShellController` | Extend | No renderer-only mode |
| Browser docs/tests | Durable docs and validation | All | Delivery/validation | Extend | Update browser_sessions.md if implementing |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `browser-tool-contract.ts` | Server browser tools | Browser tool contract | Add tool name, DTOs, result/error code if needed | Existing stable contract location | Yes, shared browser emulation DTO |
| `browser-tool-manifest.ts` | Server browser tools | Tool manifest | Expose strict schema and executor | Existing manifest owner | Yes |
| `browser-tool-input-parsers.ts` / validators | Server browser tools | Parser/semantic validator | Parse and validate mode/profile args | Existing parser/validator split | Yes |
| `browser-bridge-client.ts` | Server browser tools | Bridge client | Add POST method/route | Existing bridge route owner | Yes |
| `browser-bridge-server.ts` | Electron Browser bridge | Bridge server | Add route dispatch | Existing bridge router | Yes |
| `browser-tab-types.ts` | Electron Browser subsystem | Browser session types | Add emulation request/result/state types and `BrowserTabRecord.deviceEmulation` | Central session type file | Yes |
| `browser-device-emulation.ts` (new) | Electron Browser subsystem | Device emulation concern | Normalize profiles, compute presentation bounds/fit scale, and call `webContents` APIs | Keeps profile/native/presentation policy focused | Yes |
| `browser-tab-manager.ts` | Electron Browser subsystem | Session manager | Add `setDeviceEmulation`, state storage, summary output | Governing session owner | Yes |
| `browser-shell-controller.ts` | Electron Browser shell | Shell projection | Expose state in snapshot and reproject active view | Existing shell owner | Yes |
| `types/browserShell.ts` | Renderer/IPC types | Browser shell contract | Add emulation summary/request types | Existing UI contract location | Yes |
| `BrowserPanel.vue` | Renderer Browser UI | Browser toolbar | Add mobile toggle and state pill | Existing toolbar owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Browser device-emulation state/request/result | Server: `browser-tool-contract.ts`; Electron/UI: `browser-tab-types.ts` / `browserShell.ts` | Respective boundary contracts | Same subject crosses tool, bridge, shell snapshot | Yes | Yes | A generic viewport bag with unrelated fields |
| Profile defaults/clamping | `browser-device-emulation.ts` | Electron Browser subsystem | One native owner computes effective profile | Yes | Yes | Duplicated server/UI validation policy |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `BrowserDeviceEmulationState` | Yes | Yes | Medium | Keep separate from `viewportBounds`; do not duplicate host bounds |
| `SetDeviceEmulationInput` | Yes | Yes | Low | Use `mode`, dimensions, scale factor only; no aliases |
| `BrowserShellTabSummary.deviceEmulation` | Yes | Yes | Low | Summary only; not a renderer-owned source of native state |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-contract.ts` | Server browser tools | Browser tool contract | Add `SET_DEVICE_EMULATION_TOOL_NAME`, DTOs/result, include in tool list | Central contract file | Yes |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-manifest.ts` | Server browser tools | Tool manifest | Add `set_device_emulation` entry | Central manifest file | Yes |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-input-parsers.ts` | Server browser tools | Parser | Parse strict input | Existing parser file | Yes |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-semantic-validators.ts` | Server browser tools | Validator | Validate mode/dimensions/scale | Existing validator file | Yes |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts` | Server browser tools | Bridge client | POST `/browser/device-emulation` | Existing client file | Yes |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts` | Server browser tools | Service facade | `setDeviceEmulation` service method | Existing service owner | Yes |
| `autobyteus-web/electron/browser/browser-device-emulation.ts` | Electron Browser subsystem | Device-emulation concern | Profile defaults, clamping, `webContents.enableDeviceEmulation` / `disableDeviceEmulation` | Keeps new policy focused | Yes |
| `autobyteus-web/electron/browser/browser-tab-types.ts` | Electron Browser subsystem | Session type contract | Add state/request/result types and session record field | Central type owner | Yes |
| `autobyteus-web/electron/browser/browser-tab-manager.ts` | Electron Browser subsystem | Session manager | Store/apply per-tab state; emit upsert | Governing session owner | Yes |
| `autobyteus-web/electron/browser/browser-bridge-server.ts` | Electron Browser bridge | HTTP router | Add route | Existing router | Yes |
| `autobyteus-web/electron/browser/browser-shell-controller.ts` | Electron Browser shell | Shell projection | Return emulation state in snapshot, reapply projection on host changes | Existing projection owner | Yes |
| `autobyteus-web/electron/browser/register-browser-shell-ipc-handlers.ts` | Electron Browser shell IPC | IPC boundary | Add `browser-shell:set-device-emulation` | Existing IPC file | Yes |
| `autobyteus-web/electron/preload.ts`; `electron/types.d.ts`; `types/electron.d.ts` | Preload/global typing | Renderer API boundary | Expose `setBrowserDeviceEmulation` | Existing Electron API surface | Yes |
| `autobyteus-web/types/browserShell.ts` | Renderer shell types | UI contract | Add request/summary types | Existing shared type file | Yes |
| `autobyteus-web/stores/browserShellStore.ts` | Renderer Browser state | Browser shell store | Add action and snapshot equality for emulation | Existing store owner | Yes |
| `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Renderer Browser UI | Toolbar | Add mobile toggle and indicator | Existing toolbar owner | Yes |
| `autobyteus-web/docs/browser_sessions.md` | Docs | Browser docs | Update stable tool list and ownership notes | Existing docs file | Yes |

## Ownership Boundaries

- Server browser tools must not directly decide Electron profile application semantics beyond validating public input shape.
- Renderer must not call `webContents` or own native emulation state.
- `BrowserTabManager` is authoritative for session state and delegates native/device API details to `browser-device-emulation.ts`.
- `BrowserShellController` is authoritative for shell projection and snapshot publishing, not profile policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BrowserTabManager.setDeviceEmulation` | `BrowserDeviceEmulationController`, `webContents.enableDeviceEmulation` | Bridge server, shell controller | Renderer directly storing/applying mobile mode | Add manager API/result fields |
| Server `set_device_emulation` tool | Parser/validator/service/bridge client | Agent runtimes | Overloaded `open_tab` mobile args | Add explicit tool |
| Browser shell IPC | Shell controller/manager | BrowserPanel/store | Renderer-only CSS/host width toggle | Add IPC method and snapshot state |

## Dependency Rules

Allowed:

- Server manifest/service -> Browser bridge client.
- Browser bridge server -> `BrowserTabManager`.
- `BrowserTabManager` -> `BrowserDeviceEmulationController`.
- `BrowserShellController` -> `BrowserTabManager`.
- Renderer store -> preload IPC only.

Forbidden:

- Renderer must not own or infer native emulation state from CSS/layout alone.
- Server must not bypass bridge/server and reach Electron internals.
- Do not add mobile aliases or hidden compatibility fields to `open_tab`.
- Do not duplicate mobile profile default/clamping in both server and renderer.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `set_device_emulation` | Browser tab device emulation | Set target tab mode/profile | `tab_id` + `mode` + optional profile values | New stable tool |
| `/browser/device-emulation` | Browser bridge emulation command | Authenticated transport to Electron main | JSON body matching tool DTO | Local and remote bridge |
| `BrowserTabManager.setDeviceEmulation` | Browser session state | Validate tab, store state, apply native emulation | Browser session id | Authoritative owner |
| `browser-shell:set-device-emulation` IPC | Active shell Browser tab | UI command path | request containing tab id/mode/profile | Snapshot return |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `set_device_emulation` | Yes | Yes | Low | Use explicit `tab_id` |
| Browser shell IPC set-emulation | Yes | Yes | Low | Use `tabId` in UI contract |
| `BrowserDeviceEmulationController.apply` | Yes | Yes | Low | Accept session record/effective state only |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser device emulation helper | `BrowserDeviceEmulationController` or `BrowserDeviceEmulation` | Yes | Low | Avoid vague `viewportHelper` |
| Tool name | `set_device_emulation` | Yes | Low | Avoid overloaded `resize_browser` |
| State | `deviceEmulation` | Yes | Low | Keep separate from `viewportBounds` |

## Applied Patterns (If Any)

- Adapter/focused controller: `browser-device-emulation.ts` adapts normalized tab/profile state into Electron `webContents` API calls. It serves `BrowserTabManager` and does not become an independent lifecycle owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/*` | Folder | Server browser tool boundary | Tool schema/parser/service/bridge client additions | Existing server Browser tool subsystem | Electron native policy |
| `autobyteus-web/electron/browser/browser-device-emulation.ts` | File | Electron Browser subsystem | Profile normalization and native application | Same folder as Browser runtime owners | UI state or server schemas |
| `autobyteus-web/electron/browser/browser-tab-manager.ts` | File | Session manager | Per-tab state and lifecycle API | Existing session owner | Renderer layout logic |
| `autobyteus-web/electron/browser/browser-shell-controller.ts` | File | Shell projection | Snapshot/projection updates | Existing shell projection owner | Profile defaults |
| `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | File | Renderer toolbar | Toggle/indicator only | Existing UI owner | Native `webContents` logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser` | Transport/tool boundary | Yes | Low | Existing cohesive server Browser tool area |
| `autobyteus-web/electron/browser` | Main-line domain-control with focused concerns | Yes | Medium | Add focused file to avoid overloading page operations |
| `autobyteus-web/components/workspace/tools` | Renderer UI | Yes | Low | BrowserPanel remains chrome/control-only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Agent API | `set_device_emulation({ tab_id: "abc123", mode: "mobile", width: 390, height: 844, device_scale_factor: 3 })` | `open_tab({ url, mobileView: true })` | Emulation is a tab state change, not navigation/opening |
| UI ownership | BrowserPanel calls store/IPC, snapshot returns `deviceEmulation.mode` | BrowserPanel adds CSS class and assumes native view is mobile | Keeps native state in Electron main |
| State separation | host bounds = shell input; `viewportBounds` = actual native view presentation bounds; `deviceEmulation.profile` = CSS/device profile | Store mobile width only inside host/full-panel bounds | Prevents resize/full-view from destroying mobile mode and prevents left/full-height presentation |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Add `mobile` or `viewport` optional parameters to `open_tab` | Could open directly into mobile mode | Rejected | Use explicit `set_device_emulation` after/open alongside open flow |
| Accept camelCase aliases (`deviceScaleFactor`, `isMobile`) | Mirrors JS/Electron naming | Rejected | Keep existing strict snake_case browser tool contract |
| Renderer-only mobile CSS toggle | Quick UI approximation | Rejected | Use Electron main-owned native emulation state |

## Derived Layering (If Useful)

- Runtime/tool layer: server browser tool manifest/service.
- Bridge layer: Browser bridge client/server route.
- Native Browser domain-control layer: `BrowserTabManager` and `BrowserDeviceEmulationController`.
- Shell projection layer: `BrowserShellController`.
- Renderer UI layer: store and BrowserPanel controls.

## Migration / Refactor Sequence

1. Add shared server Browser tool contract DTOs/tool name and parser/validator coverage.
2. Add Electron `BrowserDeviceEmulationController` and tab state types.
3. Add `BrowserTabManager.setDeviceEmulation` and summary/result projection.
4. Add bridge server route and server bridge client/service/manifest entry.
5. Add Browser shell IPC/preload/types/store action and snapshot state.
5a. Add mobile presentation projection: when active tab is mobile, derive centered finite bounds from the profile and available host, set the native `WebContentsView` to those bounds, and pass fit scale to Electron emulation while preserving profile dimensions.
6. Add BrowserPanel toggle and mode indicator.
7. Update docs and tests.
8. Validate desktop default, mobile enable, desktop restore, tab switching, screenshot/run_script behavior, Codex dynamic tool exposure, and Claude MCP exposure.

## Key Tradeoffs

- New explicit tool vs. overloading `open_tab`: explicit tool is slightly more API surface but preserves subject ownership and works for existing tabs.
- Minimal default mobile profile vs. full catalog: minimal profile is faster and enough for requested Chrome-like toggle; catalog can follow after validation.
- Electron `enableDeviceEmulation` first vs. CDP debugger: native Electron API is simpler and lower risk; CDP can be added behind the same owner if needed.

## Risks

- Some responsive/mobile behavior depends on user-agent/server rendering and may require reload/navigation.
- The first implementation demonstrated that metrics-only emulation is insufficient for user expectations; without centered finite presentation bounds, mobile mode looks left-aligned and full-height.
- Full-page screenshot currently mutates bounds and may need careful emulation-state preservation.
- Electron visual behavior may not perfectly match Chrome DevTools device toolbar; validation should capture actual screenshots.

## Guidance For Implementation

- Keep `deviceEmulation` state per tab; default is `{ mode: "desktop" }`.
- Use strict validation: dimensions and scale factor bounded, no aliases.
- In mobile mode, compute a centered finite device presentation rectangle first, set `WebContentsView` bounds to that rectangle, then call `webContents.enableDeviceEmulation` with normalized profile values and the computed fit scale.
- In desktop mode, call `webContents.disableDeviceEmulation` and restore host-bound projection.
- Publish shell snapshots after state changes so BrowserPanel reflects state immediately.
- Add tests in both `autobyteus-server-ts` and `autobyteus-web/electron`/renderer suites before API/E2E validation.
