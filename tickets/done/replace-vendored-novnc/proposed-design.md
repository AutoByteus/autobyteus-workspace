# Design Spec

## Current-State Read

The VNC user flow already has a coherent application owner. `VncHostTile.vue` owns per-host UI and DOM lifecycle, while `useVncSession.ts` owns one session's connection state, RFB lifecycle, credentials/events, view-only policy, initial resize handshake, fullscreen-fit policy, and cleanup. The composable is the only production source that imports noVNC.

The structural defect is below that healthy application boundary: `useVncSession.ts` imports a 57-file checked-in upstream snapshot from `autobyteus-web/lib/novnc/`. Investigation proves that tree exactly equals upstream noVNC commit `f5a4eed`; it contains no AutoByteus-specific changes. The repository therefore owns third-party implementation source without a product-specific responsibility or boundary need.

Two secondary issues are exposed by the replacement:

1. the current official package ships no TypeScript declaration for its package-root export, while available community declarations target obsolete deep module paths;
2. the current `RFB` constructor call contains viewport/display keys that neither the vendored snapshot nor upstream constructor reads. Effective session policy already comes from `applyViewportStrategy()` after construction.

The target must preserve approved `BEH-001` through `BEH-004`, especially the product-reachable automatic clipboard path documented in [upstream-novnc-evaluation.md](./upstream-novnc-evaluation.md). Stable noVNC 1.7.0 omits that path, so the approved exact upstream build is `1.7.0-g7c36fab`.

## Intended Change

Replace repository-owned noVNC implementation source with exact official dependency `@novnc/novnc@1.7.0-g7c36fab` and use its package-root `RFB` export. Preserve `useVncSession` as the authoritative application session owner, declare only the used package-root public contract locally for TypeScript, update the two mock seams, regenerate dependency resolution, and delete the entire vendored tree without a fallback.

The behavior change is intentionally zero at the application/user level. Removing constructor keys that were never consumed is source-contract cleanup, not a request to activate their apparent values.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `REQ-001`, `REQ-003`, `REQ-004`; `AC-001`, `AC-004`, `AC-006`, `AC-007` | User opens configured VNC tool and a tile auto-connects or Connect is clicked | Investigation “Relevant Existing Behavior” row `BEH-001`; `RightSideTabs.vue`, `VncViewer.vue`, `VncHostTile.vue`, `useVncSession.ts` | Replace only RFB provider resolution; preserve connection, credentials, remote display, status/error, disconnect, and cleanup | VNC tab -> viewer -> host tile -> `useVncSession` -> official `RFB` -> VNC/WebSocket server -> canvas/status (`DS-001`, `DS-005`) |
| `BEH-002` | User | `REQ-003`, `REQ-004`; `AC-004`, `AC-006`, `AC-007` | Connected user toggles interaction, maximizes/restores, presses Escape, or tile resizes | Investigation row `BEH-002`; `useVncSession.spec.ts`; fullscreen-fit evidence | Preserve view-only default, scaling, clipping, remote resize, retry/restore, fullscreen, and cleanup policy through public RFB properties | Tile controls/observer -> session policy -> official RFB public properties -> scale/resize outcome (`DS-002`, `DS-006`) |
| `BEH-003` | User | `REQ-002`, `REQ-003`; `AC-002`, `AC-005`, `AC-008` | Interactive session focus with clipboard permission; remote clipboard message | Investigation row `BEH-003`; exact upstream snapshot/commit evidence in supplement | Preserve permission-aware automatic local-to-remote and remote-to-local clipboard behavior by selecting the exact upstream-master package containing it | Interactive focus -> package RFB/clipboard owner -> browser clipboard -> VNC server (`DS-003`); server clipboard -> package RFB -> browser clipboard (`DS-004`) |
| `BEH-004` | Operational | `REQ-001`, `REQ-004`, `REQ-005`, `REQ-006`; `AC-001`, `AC-003`, `AC-004`, `AC-009`, `AC-010` | Developer installs, tests, builds, or upgrades frontend dependencies | Investigation row `BEH-004`; package/build probe | Make manifest/lockfile the upstream revision authority; delete copied source; preserve Nuxt/Vite/test resolution | `package.json` + lock -> pnpm -> official root export -> Vite/Nuxt -> frontend/Electron renderer bundle (`DS-007`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/upstream-novnc-evaluation.md` | Exact snapshot provenance, upstream version/clipboard comparison, package/type metadata, and actual project compatibility probes | `REQ-001`–`REQ-006`; `AC-001`–`AC-010` | Supplies the dependency/version/type/removal evidence on which the target boundaries and exact package pin are based | Complete / approval N/A (evidence only) |

## Task Design Health Assessment (Mandatory)

- Change posture: Cleanup / Refactor
- Current design issue found: Yes
- Root cause classification: Legacy Or Compatibility Pressure
- Refactor needed now: Yes
- Evidence: The checked-in third-party tree exactly equals upstream `f5a4eed`, has no local responsibility, and exists because an earlier unscoped package import failed. The official scoped root export now passes the actual project test/build probe.
- Design response: Move implementation ownership to official package metadata; retain the healthy `useVncSession` application boundary; remove the entire copied source tree and misleading ignored constructor keys.
- Refactor rationale: Leaving the tree would preserve the exact maintenance problem the task addresses. Creating a wrapper/fallback would add a second boundary without solving any supported behavior.
- Intentional deferrals and residual risk, if any: A later move from exact development build to stable noVNC is deferred until a stable release contains or explicitly replaces approved automatic clipboard behavior. The exact pin prevents unreviewed drift, but downstream live VNC/browser validation is still required because this stage did not connect to a real server.

## Terminology

- **Package-root contract:** the single default `RFB` export from `@novnc/novnc`; no internal `core/` path is an application contract.
- **Vendored tree:** all tracked files under `autobyteus-web/lib/novnc/`.
- **Type declaration bridge:** an application-owned ambient declaration of only the public package-root members AutoByteus directly calls; it is not an implementation fork or compatibility runtime.

## Design Reading Order

The design follows current behavior and package evidence first, then makes source removal and package ownership explicit. Existing application ownership is preserved; only provider resolution and its compile-time boundary change.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete legacy scope: `autobyteus-web/lib/novnc/**`, local `~/lib/novnc/core/rfb` production/test references, and ignored display/viewport constructor keys.
- Required action: remove them in the same implementation after official package/import/type seams are in place.
- No compatibility alias, fallback source copy, package patch, conditional import, or dual provider is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: None.
- Relevant code-model, serialization, semantic, or physical-store change: None; runtime provider/dependency resolution only.
- Normal reader/writer behavior and representative evidence: N/A.
- Required semantics and invariants under direct use: Existing VNC session semantics remain unchanged; no persisted semantics exist.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: N/A.
- Decision: Not Affected
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: No stored data is read, written, transformed, or removed by this change.
- Acceptance criteria or design constraints supported by this decision: `REQ-001`–`REQ-006`; `AC-001`–`AC-010`.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — decision is `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001` | User opens/initiates a configured VNC host | Remote canvas plus connected/disconnected/error UI outcome | `useVncSession` for application session lifecycle; official `RFB` for protocol lifecycle | Shows the complete supported connection path and provider boundary |
| `DS-002` | Primary End-to-End | `BEH-002` | Tile interaction/maximize/resize trigger | Scaled or remotely resized canvas with correct interaction policy | `useVncSession` | Protects the application-owned viewport/view-only invariants |
| `DS-003` | Primary End-to-End | `BEH-003` | Interactive VNC canvas focus | Local clipboard text delivered through RFB to remote server | Official `RFB` package | Establishes why selected package revision must retain async clipboard behavior |
| `DS-004` | Return-Event | `BEH-003` | Remote server sends clipboard text | Browser clipboard receives text when permitted | Official `RFB` package | Protects reverse clipboard behavior absent from stable 1.7.0 |
| `DS-005` | Return-Event | `BEH-001` | RFB/network emits connect/disconnect/credential/security/desktop events | Current session state/error/status displayed by tile | `useVncSession` | Keeps event guards and cleanup at the existing owner |
| `DS-006` | Bounded Local | `BEH-002` | Successful RFB `connect` callback | Initial remote-resize attempt/retry completes and intended policy is restored | `useVncSession` | Timer/state sequence is material to current fit behavior |
| `DS-007` | Primary End-to-End | `BEH-004` | Manifest/lock dependency resolution | Bundled web/Electron renderer asset uses official RFB | pnpm manifest/lock plus existing Nuxt/Vite build | Proves copied source is replaced by one reproducible dependency path |

## Primary Execution Spine(s)

- `DS-001`: `Workspace VNC Tab -> VncViewer Host Resolution -> VncHostTile DOM Lifecycle -> useVncSession -> @novnc/novnc RFB -> VNC WebSocket Server -> Remote Canvas / Session Status`
- `DS-002`: `Tile Interaction / Maximize / Resize Trigger -> VncHostTile -> useVncSession Policy -> RFB Public Viewport Properties -> noVNC Scaling / Remote Resize -> Visible Remote Canvas`
- `DS-003`: `Interactive Canvas Focus -> noVNC RFB Async Clipboard -> Browser Clipboard Read -> RFB Clipboard Protocol -> VNC Server`
- `DS-007`: `autobyteus-web/package.json + pnpm-lock.yaml -> pnpm Resolver -> @novnc/novnc Root Export -> Vite/Nuxt Bundler -> Web/Electron Renderer Asset`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Existing UI resolves a host and gives a mounted container to the session composable. The composable creates official RFB with supported connection options, applies current policy, subscribes to events, and exposes state back to the tile. | VNC tool, host tile, VNC session, RFB connection, server, remote canvas/status | `useVncSession` / official `RFB` at protocol boundary | Host parsing, password setting, type declaration, tests |
| `DS-002` | Tile controls and observer notify the session owner; it writes view-only/scale/clip/resize public properties and triggers resize without exposing RFB to components. | Tile control, session policy, RFB viewport, canvas | `useVncSession` | Resize observer, timers |
| `DS-003` | When interactive, package-owned canvas focus and permission-aware clipboard code read local text and send it over RFB. No application replacement loop is added. | Canvas focus, package clipboard owner, browser clipboard, RFB server | official `RFB` | Exact package version/integrity |
| `DS-004` | Package-owned RFB decodes remote clipboard data and writes browser clipboard when allowed, retaining fallback behavior internally. | Server clipboard message, RFB decoder, package clipboard owner, browser clipboard | official `RFB` | Browser permission/API availability |
| `DS-005` | Package emits public lifecycle events; composable ignores stale-session events, translates current-session outcomes to Vue state, and performs cleanup. | RFB event, session guard, state/error, tile | `useVncSession` | Logging |
| `DS-006` | Connect callback briefly enables interaction/remote resize, dispatches initial resize, retries after 120 ms, then restores approved policy after 320 ms; cleanup cancels timers. | Connect callback, resize trigger, retry timer, restore timer | `useVncSession` | Browser window resize dispatch |
| `DS-007` | Exact manifest and lockfile resolve the official package root; Vite follows its ESM graph into the bundle. There is no repository source alias or provider fallback. | Manifest, lock, pnpm, package export, bundler, asset | Existing package/build tooling | License metadata, structural scan |

## Spine Actors / Main-Line Nodes

- Workspace VNC tool / `VncViewer`
- Per-host UI / `VncHostTile`
- VNC session lifecycle / `useVncSession`
- Official public RFB object / `@novnc/novnc`
- Browser WebSocket/clipboard/canvas facilities
- VNC/WebSocket server
- pnpm dependency resolver and Nuxt/Vite bundler for the operational path

## Ownership Map

- `VncViewer` owns host/password resolution and per-host tile creation; it must not own RFB lifecycle.
- `VncHostTile` owns user controls, mount/unmount, container observation, and presentation; it must use the composable rather than import RFB.
- `useVncSession` is the authoritative application owner for one session: current RFB identity, connection state, event-to-state translation, timers, view-only/viewport policy, and cleanup. It is not a thin facade.
- `@novnc/novnc` `RFB` owns the RFB protocol, WebSocket interaction, canvas/input mechanisms, and automatic clipboard implementation. Application code must use only its public root contract.
- `package.json` plus `pnpm-lock.yaml` own selected upstream identity/reproducibility; repository source files no longer do.
- `types/novnc.d.ts` owns compile-time description of the subset AutoByteus calls, not runtime behavior.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. `useVncSession` is a governing session owner, not a thin wrapper. Adding another noVNC adapter would duplicate rather than clarify authority.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/lib/novnc/**` (57 files) | Official package directly supplies the identical capability and later fixes | `@novnc/novnc@1.7.0-g7c36fab` resolved by manifest/lock | In This Change | Delete entire folder; no retained pako/vendor subset |
| `~/lib/novnc/core/rfb` production import | Local provider path no longer exists | `@novnc/novnc` root export in `useVncSession.ts` | In This Change | No deep import |
| Two test mocks of local import | Tests must mock the same boundary production uses | `vi.mock('@novnc/novnc', ...)` | In This Change | Preserve existing mock behavior |
| Ignored viewport/display/compression constructor keys | Both current and target RFB constructor ignore them; they misstate the contract | Existing `applyViewportStrategy()` for effective policy; upstream defaults for unchanged ignored values | In This Change | Do not activate them via post-construction assignments in this cleanup |
| Any proposed vendored fallback/alias | Direct package path is proven and fallback would retain legacy maintenance | Single official dependency path | In This Change | Must never be introduced |

## Return Or Event Spine(s) (If Applicable)

- `DS-004`: `VNC Server Clipboard Message -> Official RFB Decode -> Package AsyncClipboard -> Browser Clipboard Write`
- `DS-005`: `VNC Server / WebSocket -> RFB Public Event -> useVncSession Current-Instance Guard -> Vue Connection/Error State -> VncHostTile Status`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useVncSession`
- `DS-006`: `RFB Connect Event -> Clear Prior Timers -> Set viewOnly=false + resizeSession=true -> Dispatch Resize -> 120 ms Retry -> 320 ms applyViewportStrategy Restore -> Timer References Cleared`
- Why it matters: The package replacement must not accidentally remove the current remote-size initialization needed for view-only sessions or leave stale timers after disconnect/replacement.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Host/password resolution | `DS-001` | `VncViewer` | Convert settings into host URL/password inputs | Existing product configuration | Mixing it into session/provider replacement expands scope and weakens current owner |
| Package-root type declaration | `DS-001`, `DS-002`, `DS-005`, `DS-007` | `useVncSession` / compiler | Describe only called public RFB members | Upstream package has no `.d.ts` | Runtime wrapper or copied internal types would create a second implementation contract |
| Dependency integrity | `DS-003`, `DS-004`, `DS-007` | Build/package tooling | Pin exact package and commit behavior | Stable release is not behavior-equivalent | Floating tag could silently change clipboard/runtime behavior |
| Test mocks | `DS-001`, `DS-002`, `DS-006` | Durable coverage | Isolate session policy while matching real module boundary | Existing composable tests should stay focused | Mocking local files/internals would hide provider-resolution regressions |
| Browser clipboard permissions | `DS-003`, `DS-004` | Official `RFB` | Gate read/write and safe fallback | Browser security contract | App-owned duplicate polling/listeners would fragment clipboard ownership |
| License metadata | `DS-007` | Delivery/build tooling | Preserve normal third-party license handling | MPL-2.0 dependency | Copying source/license back into feature code would recreate vendoring |

## Ownership Boundaries

The UI boundary ends at `useVncSession`'s returned refs and commands. `VncHostTile` must never depend on `RFB` directly. The application session boundary delegates protocol work to the official package-root `RFB` object; it may set public properties and listen to public events, but must not import `core/`, `vendor/`, or package internals. The package boundary owns clipboard internals and protocol behavior. Manifest/lockfile own upstream revision selection.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useVncSession(options)` | RFB instance identity, lifecycle events, timers, session policy, cleanup | `VncHostTile` and any future VNC UI | Component imports `@novnc/novnc` alongside composable | Extend the composable with a behavior-specific command/ref |
| `@novnc/novnc` root `RFB` | Protocol, canvas/input, WebSocket, clipboard internals | `useVncSession` only in production | Import `@novnc/novnc/core/...`, vendored file, or vendor/pako | Use documented public RFB API or revise requirements if unavailable |
| `package.json` + `pnpm-lock.yaml` | Package identity, exact version, integrity/transitive graph | pnpm/Nuxt/Vite/build/release tooling | Runtime URL/CDN import, floating `dev` tag, local source alias | Update exact manifest version and regenerate lock under review |

## Dependency Rules

- `VncViewer` may depend on `VncHostTile`; `VncHostTile` may depend on `useVncSession`; `useVncSession` may depend on `@novnc/novnc` root.
- No other production file should import `@novnc/novnc` for this scope.
- `types/novnc.d.ts` may declare module `@novnc/novnc` only. It must not declare or expose internal paths.
- Tests may mock `@novnc/novnc` at the package root; they must not mock deleted local files or upstream internals.
- `@novnc/novnc` must be a runtime `dependencies` entry, exact `1.7.0-g7c36fab`, with lock integrity.
- No package patch under `patches/`, compatibility alias, conditional provider, copied fallback, or CDN import is allowed.
- Clipboard behavior remains package-owned. Do not recreate it in `useVncSession` unless a future approved requirement changes the owner.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useVncSession(VncSessionOptions)` | One application VNC session | Create/control/disconnect session and expose reactive state | URL/password values plus optional view-only/label | Existing authoritative UI boundary; unchanged |
| `new RFB(target, url, { credentials, shared })` | One protocol connection | Attach official RFB client to container and initiate connection | Mounted `Element`, WebSocket URL, optional password/shared | Constructor receives only supported connection options |
| RFB public properties: `scaleViewport`, `clipViewport`, `resizeSession`, `viewOnly` | Session viewport/input policy | Apply current policy after construction and state changes | Boolean values | `applyViewportStrategy()` remains sole application writer |
| RFB public events | Current connection lifecycle | Notify connect/disconnect/credentials/security/desktop changes | Event name plus public event detail | Current-instance guard remains in composable |
| `disconnect()`, `sendCredentials()` | Connection control | End session or continue authentication | Current RFB instance; optional credential fields | Public package API only |
| ambient module `@novnc/novnc` | Compile-time public provider contract | Type only the members above | Exact package-root module name | No runtime code or internal exports |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `useVncSession` | Yes | Yes | Low | Preserve |
| Official `RFB` root API | Yes | Yes | Low | Use root only; remove ignored constructor keys |
| `types/novnc.d.ts` | Yes | Yes | Low | Keep subset narrow and aligned with called public API |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Application VNC session | `useVncSession` | Yes | Low | Preserve |
| Per-host UI | `VncHostTile` | Yes | Low | Preserve |
| Protocol connection | Upstream `RFB` | Yes (governing protocol term) | Low | Preserve upstream public name |
| Compile-time declaration | `types/novnc.d.ts` | Yes | Low | Keep package-specific, not generic adapter naming |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Session lifecycle/policy | Existing VNC composable | Reuse | Already owns exactly one session coherently | N/A |
| Protocol implementation | Official noVNC package | Reuse | Upstream-owned capability; direct integration proven | N/A |
| Compile-time external module declaration | Existing `autobyteus-web/types/` | Extend | Established location for application ambient declarations | N/A |
| Dependency resolution | Existing frontend manifest/root pnpm lock | Extend | Canonical workspace dependency authority | N/A |
| Runtime adapter/wrapper | None needed | Reuse existing composable instead of creating new | A new adapter would duplicate current boundary | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace VNC UI | Host/tile presentation and triggers | `DS-001`, `DS-002` | `VncViewer`, `VncHostTile` | Reuse | No source changes expected outside mock-bearing layout test |
| VNC session integration | RFB lifecycle, policy, timers, event translation | `DS-001`, `DS-002`, `DS-005`, `DS-006` | `useVncSession` | Reuse/Modify | One production import changes |
| Official noVNC provider | Protocol/canvas/input/clipboard | `DS-001`–`DS-005` | Upstream `RFB` | Reuse | Dependency replaces vendored source |
| Frontend type integration | Public package-root declaration | Compile-time support for `DS-001`, `DS-002`, `DS-005` | TypeScript compiler / `useVncSession` | Extend | One small declaration file |
| Workspace package/build | Exact dependency/integrity/bundling | `DS-007` | pnpm/Nuxt/Vite | Extend | Manifest and root lock only |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useVncSession.ts` | VNC session integration | Application VNC session | Import official RFB; construct with supported keys; retain policy/events | Existing single session owner | Uses package public types |
| `autobyteus-web/types/novnc.d.ts` | Frontend type integration | Package-root compile-time contract | Minimal ambient declaration for used RFB API | One external package contract | N/A |
| `autobyteus-web/package.json` | Package/build | Frontend dependency authority | Exact runtime package version | Canonical manifest | N/A |
| `pnpm-lock.yaml` | Package/build | Workspace resolver authority | Exact resolution/integrity | Canonical lock | N/A |
| Two existing test files | Durable test coverage | Production package seam mocks | Rename mocked module boundary only | Tests remain with owned behavior/layout | Reuse same mock shape |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| RFB public type surface used by application | `autobyteus-web/types/novnc.d.ts` | Frontend type integration | One ambient source serves import/type checking without runtime wrapper | Yes — only called members included | Yes — no copied internal/provider types | A complete upstream type fork or runtime adapter |
| Mock RFB shape | None | Tests remain local | Only one detailed session mock and one minimal layout mock; semantics differ | N/A | N/A | A generic test helper unrelated to this narrow import change |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RfbCredentials` declaration | Yes | Yes | Low | Make username/password/target optional per public contract |
| `RfbOptions` declaration | Yes | Yes | Low | Include only credentials/shared/repeaterID/wsProtocols actually accepted by constructor |
| `RFB` declaration subset | Yes | Yes | Low | Include only constructor, four policy properties, `disconnect`, and `sendCredentials`; inherit public EventTarget behavior |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useVncSession.ts` | VNC session integration | `useVncSession` | Official root import and supported constructor contract while retaining all session behavior | Existing coherent owner | Uses local public declaration |
| `autobyteus-web/types/novnc.d.ts` | Frontend type integration | `@novnc/novnc` compile-time boundary | Narrow ambient declaration of used root API | Single package contract | N/A |
| `autobyteus-web/composables/__tests__/useVncSession.spec.ts` | VNC session tests | Session policy coverage | Mock official root module | Behavior-specific test | Local mock only |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Layout tests | Layout isolation | Mock official root module | Existing layout test seam | Minimal local mock |
| `autobyteus-web/package.json` | Package/build | Frontend manifest | Exact runtime dependency | Canonical file | N/A |
| `pnpm-lock.yaml` | Package/build | Workspace lock | Registry integrity/resolution | Canonical file | N/A |
| `autobyteus-web/lib/novnc/**` | Obsolete | None after change | Remove copied provider source | Decommissioned | N/A |

## Applied Patterns (If Any)

- **External provider behind an application owner:** `useVncSession` owns product/session policy while official RFB owns protocol mechanics.
- **Narrow ambient declaration:** TypeScript describes only the external public surface the application calls, avoiding a runtime wrapper or copied full provider types.
- **Clean-cut dependency replacement:** one official package path replaces the vendored implementation completely.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useVncSession.ts` | File | Application VNC session | Official provider use plus session lifecycle/policy | Existing composable folder already owns reusable Vue session behavior | Deep imports, clipboard reimplementation, provider fallback |
| `autobyteus-web/types/novnc.d.ts` | File | External package compile-time boundary | Minimal `@novnc/novnc` root declaration | Existing `types/` folder owns ambient external/application declarations | Runtime code, upstream internals, deprecated `lib/` module declarations |
| `autobyteus-web/package.json` | File | Frontend dependency authority | Exact official package entry | Canonical frontend manifest | Floating `dev` tag, unscoped `novnc`, git/CDN dependency |
| `pnpm-lock.yaml` | File | Workspace resolver authority | Exact package integrity | Canonical root lock | Manual edits disconnected from pnpm |
| Existing colocated tests | File | Behavior/layout test owners | Package-root mocks | Repository test convention | Mocks of deleted/internal files |
| `autobyteus-web/lib/novnc/` | Folder | Removed | None | No application ownership justifies it | Any retained files or fallback |

The layout remains intentionally compact: the application already has a single session owner, and the only new concern is one ambient package declaration in the established `types/` folder. A new `vnc/provider/adapter` hierarchy would over-split this replacement and imply a runtime owner that is not needed.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/composables/` | Main-Line Domain-Control (Vue session control) | Yes | Low | Existing flat composable location is appropriate for one reusable session owner |
| `autobyteus-web/types/` | Off-Spine Concern | Yes | Low | External compile-time declarations already live here |
| `autobyteus-web/lib/novnc/` | Provider source (obsolete) | No application ownership | High if retained | Delete entire folder |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Provider import | `import RFB from '@novnc/novnc'` inside `useVncSession.ts` | `~/lib/novnc/core/rfb`, `@novnc/novnc/core/rfb.js`, CDN URL, or conditional fallback | Enforces the official public root and one provider path |
| Constructor vs policy | `new RFB(target, url, { credentials, shared }); applyViewportStrategy(rfb);` | Passing `scaleViewport`, `resizeSession`, `viewOnly`, compression/display keys to a constructor that ignores them | Makes the real public contract and current owner explicit |
| Type boundary | Ambient root module with only used constructor/properties/methods | Copying full upstream JS/types or re-exporting obsolete `@novnc/novnc/lib/rfb` declarations | Keeps maintenance proportional and avoids a second library fork |
| Version selection | Exact `"@novnc/novnc": "1.7.0-g7c36fab"` plus lock integrity | `"dev"`, `^1.7.0`, or stable `1.7.0` without clipboard replacement | Prevents unreviewed behavior drift and preserves approved clipboard path |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `lib/novnc` as fallback | Concern official package might fail | Rejected | Probe already proves package build/test resolution; delete tree |
| Alias old import to package | Could reduce test/source edits | Rejected | Update all three active module references to official root; no compatibility alias |
| Conditional stable/dev provider | Could prefer stable where possible | Rejected | One exact approved version owns all environments |
| Package patch/local fork | Could preserve clipboard on stable | Rejected | Current official dev package already contains required upstream behavior; pin it directly |
| Copy community deep-path declarations | Could avoid writing a root declaration | Rejected | Declare only current root contract; do not retain obsolete module paths |

## Derived Layering (If Useful)

A compact explanatory layering is sufficient:

`Workspace UI -> VNC Session Policy Owner -> Official RFB Public Boundary -> Browser/VNC Transport`

Package manifest/lock and the type declaration are off-spine build/compile concerns. No additional runtime layer is introduced.

## Change / Refactor Sequence

1. From the dedicated task worktree, add exact runtime dependency with pnpm so `autobyteus-web/package.json` and root `pnpm-lock.yaml` are updated together.
2. Add `autobyteus-web/types/novnc.d.ts` for the narrow package-root public contract.
3. Change `useVncSession.ts` to import from `@novnc/novnc`; limit constructor options to `credentials` and `shared`; leave `applyViewportStrategy()` and all lifecycle/timer/event logic unchanged.
4. Update the two durable mock module identifiers to `@novnc/novnc` without broad test rewrites.
5. Delete all of `autobyteus-web/lib/novnc/` in one clean cut. No committed intermediate dual-provider state is allowed.
6. Run structural scans for local/deep/unscoped references and confirm exact package/lock identity.
7. Run implementation-scoped targeted tests and production generation/build checks. Compare `nuxi typecheck` noVNC-specific delta with the recorded 242-error baseline rather than claiming global success.
8. Send source implementation through code review, then API/E2E for realistic VNC/browser/clipboard coverage and execution.

## Key Tradeoffs

- **Exact development build vs stable:** The exact master build is less release-conservative, but it is the only published direct package that preserves the current reachable automatic clipboard behavior. Exact pinning bounds reproducibility and avoids maintaining a patch/fork.
- **Local narrow declaration vs community types:** A small local declaration is modest maintenance, but current community types do not describe the actual package-root export. The declaration is intentionally smaller and more accurate than importing obsolete definitions.
- **Remove ignored constructor keys vs activate them:** Removing them makes the actual contract honest and preserves current behavior. Applying their apparent values post-construction would be an unapproved behavior/performance/UI change.
- **No adapter layer:** Reusing `useVncSession` keeps authority clear and minimizes structure. A separate noVNC adapter would add indirection without another implementation or policy need.

## Risks

- Real VNC handshake/clipboard behavior still needs downstream live/browser validation; unit/build probes do not prove external server interoperability end to end.
- Future stable noVNC upgrades must verify that `f5a4eed` behavior is present or explicitly redesign/approve clipboard ownership before changing the exact pin.
- Upstream may later ship official root types. When that occurs, remove the local declaration if official types cover the used contract; do not let two type authorities coexist.
- Existing global typecheck failures can obscure regressions. Validation must search/report noVNC-specific errors and compare the 242-error baseline.
- License/package attribution should be checked by delivery against existing dependency documentation/build practices after source deletion.

## Guidance For Implementation

- Work only in `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc` on `codex/replace-vendored-novnc`.
- Use pnpm to mutate dependency metadata; do not hand-edit lock integrity.
- Expected runtime dependency is exact `@novnc/novnc@1.7.0-g7c36fab`.
- The local declaration should contain optional credential fields, supported connection options, constructor, `viewOnly`, `clipViewport`, `scaleViewport`, `resizeSession`, `disconnect()`, and `sendCredentials()`; use inherited `EventTarget` behavior rather than reproducing the entire upstream event API.
- Do not add `@types/novnc__novnc`; investigation proved its current module paths do not match the package-root export.
- Do not change the timing constants, event guards, status strings, connection policies, or UI components as part of this cleanup.
- Do not turn ignored constructor keys into post-construction `showDotCursor`, `background`, `qualityLevel`, or `compressionLevel` assignments.
- After deletion, verify no active source/test reference uses `~/lib/novnc`, `lib/novnc/core/rfb`, an unscoped `novnc`, or an internal `@novnc/novnc/...` path.
- Implementation checks should at minimum include the three approved targeted suites and production `pnpm -C autobyteus-web generate`; record the known global typecheck baseline truthfully.
