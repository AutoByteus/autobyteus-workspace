# Design Spec

## Current-State Read

The user-visible Terminal startup path is:

`Terminal tab -> Terminal.vue -> useTerminalSession -> /ws/terminal/:sessionId -> TerminalHandler -> PtySessionManager -> IsolatedPtySession -> node-pty bridge -> bash prompt -> websocket output -> xterm`

On latest `origin/personal` (`3171a5a4`, 2026-06-18), the development backend terminal tests pass on the Intel host after workspace dependency installation. The packaged Intel app still fails. A direct websocket probe to the packaged server opens, then closes with code `1011` and no output. The packaged server logs `Failed to create terminal session: Error: posix_spawnp failed.`

The native-helper ownership problem is now precise:

- Packaged Intel app: `/Applications/AutoByteus.app`, version `1.3.58`, x86_64.
- `node-pty/lib/utils.js.loadNativeModule('pty')` selects `node-pty/prebuilds/darwin-x64` on the Intel runtime.
- The selected helper, `prebuilds/darwin-x64/spawn-helper`, is x86_64 but mode `0644`, not executable.
- The current AutoByteus runtime bootstrap resolves `build/Release/spawn-helper` first. In the Intel package that file is arm64 and executable, so AutoByteus repairs/checks the wrong helper.
- Latest `autobyteus-web/build/scripts/afterPack.ts` treats `spawn-helper` as a codesigning candidate, but codesigning candidacy does not make the selected helper executable.

Windows works because it does not use this Darwin helper executable-bit path. Apple Silicon works because the arm64 helper path is executable. Intel macOS fails because the x64 helper selected by `node-pty` is present but not executable.

## Intended Change

- Make runtime node-pty helper repair resolve and chmod the helper adjacent to the native module actually selected by `node-pty` for the current process.
- Normalize packaged macOS `spawn-helper` permissions during desktop server-resource preparation / after-packaging so the x64 package ships valid before runtime repair is needed.
- Add a packaged runtime validation check that fails on the current Intel package shape.
- Surface actionable startup errors instead of allowing the frontend terminal to look silently stuck.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with duplicated helper-selection policy between runtime repair and packaging/postinstall paths.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted.
- Evidence: Latest packaged Intel v1.3.58 has x64 selected helper mode `0644`; packaged websocket closes `1011`; packaged `node-pty.spawn()` throws `posix_spawnp failed`; packaged AutoByteus bootstrap currently resolves the executable arm64 `build/Release/spawn-helper` instead of the selected x64 prebuild helper.
- Design response: Move the invariant from "some spawn-helper exists/executable" to "the selected node-pty native module's adjacent spawn-helper is executable". Enforce it both at runtime and in package validation.
- Refactor rationale: The existing owner exists (`autobyteus-ts` terminal bootstrap), but its selection invariant is wrong. A one-line package chmod would help the current release but would leave runtime repair and validation able to miss the selected helper again.
- Intentional deferrals and residual risk, if any: Do not add fallback to direct shell or another PTY backend. Fallback would hide packaging defects and make CI validation weaker. Broader release artifact pruning is limited to what is needed for terminal helper correctness.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. Data-flow spine and native-helper invariant.
2. Packaging and validation ownership.
3. Error return path.
4. Concrete file responsibilities and migration order.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace the obsolete static-order helper repair behavior (`build/Release`, `build/Debug`, then current-arch prebuild) for runtime startup. Static search may remain only as a diagnostic fallback when `node-pty`'s selected native module cannot be resolved; it must not be the normal authority.
- Obsolete in-scope behavior: "repair first found helper" becomes invalid.
- The design rejects dual old/new helper selection as steady state.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Terminal tab | Prompt/output rendered in xterm | Terminal streaming stack | Main failing user path. |
| DS-002 | Primary End-to-End | Desktop package prepares server resources | Packaged app contains executable selected node-pty helper | Desktop packaging pipeline | Prevents broken Intel releases. |
| DS-003 | Return-Event | Native terminal startup failure | Visible frontend error and actionable server log | TerminalHandler / useTerminalSession | Avoids silent stuck terminal. |
| DS-004 | Bounded Local | IsolatedPtySession startup | Bridge ready or helper diagnostic failure | `autobyteus-ts` terminal backend | Local invariant that must select/chmod the correct helper. |

## Primary Execution Spine(s)

- DS-001: `Terminal tab click -> Terminal.vue -> useTerminalSession websocket -> registerTerminalWebsocket -> TerminalHandler.connect -> PtySessionManager.createSession -> IsolatedPtySession.start -> selected node-pty helper repair -> bridge bash spawn -> websocket output -> xterm prompt`
- DS-002: `release/build workflow -> prepare server resources -> normalize node-pty helper executable bits -> afterPack/codesign -> packaged terminal runtime validation -> publishable artifact`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Frontend opens a terminal websocket for a workspace cwd. Backend creates a PTY session. The macOS isolated PTY backend repairs the selected node-pty helper, starts the bridge, and streams prompt output back. | Terminal UI, websocket session, terminal handler, PTY manager, isolated PTY backend, node-pty helper, shell prompt | Terminal streaming stack | cwd validation, resize/input events, xterm fitting |
| DS-002 | Packaging stages server resources, ensures Darwin helper files are executable, signs native binaries, and validates that the app's runtime-selected helper can spawn. | Build workflow, server bundle, node-pty dependency, packaged app | Desktop packaging pipeline | Prisma engines, signing identity, notarization |
| DS-003 | Startup failure is reported by the PTY owner, logged by the terminal handler with helper diagnostics, and preserved by the frontend state. | PTY failure, error protocol frame/close reason, frontend error state | TerminalHandler / useTerminalSession | log privacy, close-code mapping |
| DS-004 | Inside `IsolatedPtySession.start()`, helper repair resolves node-pty's selected native directory and chmods that directory's `spawn-helper` before the bridge starts. | helper resolver, chmod repair, bridge process, ready message | `autobyteus-ts` terminal backend | private node-pty API drift, fallback diagnostics |

## Spine Actors / Main-Line Nodes

- `Terminal.vue`
- `useTerminalSession`
- `registerTerminalWebsocket`
- `TerminalHandler`
- `PtySessionManager`
- `IsolatedPtySession`
- `node-pty` selected native module/helper
- Desktop packaging scripts/workflow

## Ownership Map

- `Terminal.vue`: owns xterm rendering and user-visible terminal surface.
- `useTerminalSession`: owns browser websocket lifecycle and frontend terminal error state.
- `registerTerminalWebsocket`: owns websocket route binding and cwd validation before terminal connection.
- `TerminalHandler`: owns backend terminal websocket session lifecycle, output/error frames, and cleanup.
- `PtySessionManager`: owns PTY session identity and session creation/closure coordination.
- `IsolatedPtySession`: owns macOS PTY bridge startup and the native-helper startup precondition.
- `node-pty-bootstrap`: owns the selected-helper resolution and executable-bit repair invariant.
- Desktop packaging pipeline: owns shipped server-resource permissions and packaged-app validation.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `registerTerminalWebsocket` route | `TerminalHandler` and `PtySessionManager` | Transport entrypoint | Native helper selection or package repair |
| `PtySessionManager.createSession` | concrete terminal session backend | Session registry/lifecycle boundary | node-pty filesystem probing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Static-order runtime helper authority | It can select an executable helper for the wrong architecture | Selected-native-dir helper resolver in `node-pty-bootstrap` | In This Change | Static fallback only allowed when selected-native-dir cannot be resolved and must report diagnostics. |
| Package validation limited to artifact presence/codesign | It misses executable-bit failure on selected helper | Packaged terminal runtime validator | In This Change | Codesigning candidate logic is not enough. |
| Generic frontend "connection lost" overwrite after backend startup error | It hides the real terminal startup failure | Error preservation in `useTerminalSession` | In This Change | Preserve backend error if received before close. |

## Return Or Event Spine(s) (If Applicable)

DS-003: `IsolatedPtySession startup error -> TerminalHandler logs helper diagnostics and sends terminal error frame/close reason -> useTerminalSession records error without overwriting -> Terminal.vue displays error banner/state`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `autobyteus-ts` terminal backend.
- Local chain: `resolve node-pty utils -> load selected native module -> derive selected native dir -> check selected spawn-helper -> chmod executable bit -> start isolated bridge`.
- Why it matters: this is the exact place the Intel package currently repairs the wrong helper.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Helper diagnostics formatting | DS-003, DS-004 | `TerminalHandler`, `node-pty-bootstrap` | Provide platform/arch/helper path/mode details | Needed for future native failures | Main terminal flow becomes logging-heavy |
| Package helper chmod normalization | DS-002 | Desktop packaging pipeline | Ensure shipped helper modes are valid | Prevents broken artifacts | Runtime becomes only defense |
| Packaged runtime probe | DS-002 | Release validation | Validate selected helper and optional spawn | Catches package-only failures | Unit tests falsely imply release is safe |
| Frontend error preservation | DS-003 | `useTerminalSession` | Keep actionable backend errors visible | Avoids empty terminal UX | Backend failures look like UI hangs |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime selected-helper repair | `autobyteus-ts` terminal backend | Extend | Existing bootstrap already owns node-pty repair | N/A |
| Desktop resource permission normalization | `autobyteus-web` desktop packaging scripts | Extend | Existing scripts stage and package server resources | N/A |
| Packaged app terminal validation | `autobyteus-web/scripts` release validation | Create New script | No existing package terminal runtime validator exists | Existing tests run dev deps, not packaged app. |
| Websocket startup error propagation | `autobyteus-server-ts` terminal streaming | Extend | Existing handler owns connection lifecycle | N/A |
| Frontend error rendering/preservation | `autobyteus-web` terminal composable/UI | Extend | Existing composable already tracks `errorMessage` | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` terminal backend | selected node-pty helper invariant | DS-001, DS-004 | `IsolatedPtySession` | Extend | Primary product fix. |
| `autobyteus-web` desktop packaging | packaged helper modes and packaged validator | DS-002 | Release workflow | Extend/Create validator | Prevent regression before publish. |
| `autobyteus-server-ts` terminal streaming | error frame/logging on startup failure | DS-003 | `TerminalHandler` | Extend | Keep transport contract clear. |
| `autobyteus-web` terminal UI/composable | visible error preservation | DS-003 | `useTerminalSession`, `Terminal.vue` | Extend | Avoid silent stuck state. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | terminal backend | selected helper resolver | Resolve selected node-pty native dir and chmod adjacent helper | Existing focused owner | Internal diagnostics type may live here |
| `autobyteus-ts/scripts/fix-node-pty-permissions.mjs` | terminal backend/package install | postinstall helper repair | Align postinstall repair with selected/current-arch helper policy | Existing script | Mirror/port logic carefully |
| `autobyteus-web/scripts/prepare-server.sh` / `.mjs` | desktop packaging | server bundle preparation | chmod Darwin `spawn-helper` files in staged/target server resources | Existing preparation path | May share small JS validator script |
| `autobyteus-web/build/scripts/afterPack.ts` | desktop packaging | after-pack signing | Ensure helper chmod before signing or at least before validation | Existing afterPack hook already sees helper files | No |
| `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs` | desktop packaging validation | package terminal validator | Check selected helper executable and optionally spawn via Electron Node | New concern | Could include reusable path/mode checks |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | terminal streaming | backend session lifecycle | Log/send startup error details | Existing handler | No |
| `autobyteus-web/composables/useTerminalSession.ts` | frontend terminal | client transport state | Preserve backend error on close | Existing composable | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| node-pty selected helper diagnostics | Keep in `node-pty-bootstrap.ts` unless used by multiple files | `autobyteus-ts` terminal backend | Runtime diagnostics are local to helper repair | Yes | Yes | Generic native-dependency helper blob |
| packaged helper executable scan | `verify-packaged-terminal-runtime.mjs` local functions | desktop packaging | Only release validation needs package path scanning | Yes | Yes | Cross-project utility without ownership |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `NodePtySpawnHelperDiagnostics` if added | Yes | Yes | Low | Fields should be platform, arch, selectedNativeDir, helperPath, helperExecutable, resolutionError. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | terminal backend | selected helper invariant | Use node-pty selection to find/chmod the actual helper; expose diagnostics | Existing focused owner | Owns diagnostics |
| `autobyteus-ts/scripts/fix-node-pty-permissions.mjs` | terminal backend install | postinstall repair | Prefer current-arch/selected helper; avoid stale build-first authority | Existing install hook | Mirrors policy |
| `autobyteus-web/scripts/prepare-server.mjs` and/or `prepare-server.sh` | desktop packaging | server bundle prep | chmod packaged Darwin helpers after install/rebuild/staging | Existing pipeline | No |
| `autobyteus-web/build/scripts/afterPack.ts` | desktop packaging | afterPack signing | Ensure `spawn-helper` is executable before signing if touched here | Existing hook already scans helpers | No |
| `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs` | desktop validation | package runtime validator | Fail if selected helper is missing/non-executable; optionally run Electron Node spawn probe | New standalone validator is appropriate | Local helpers |
| `.github/workflows/release-desktop.yml` | release workflow | CI release orchestration | Invoke packaged terminal validation for mac x64 and arm64 | Existing release owner | No |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | terminal streaming | websocket lifecycle | Send/log actionable startup errors | Existing lifecycle owner | May use diagnostics from backend error |
| `autobyteus-web/composables/useTerminalSession.ts` | frontend terminal | client websocket state | Preserve backend error state across close | Existing client transport owner | No |

## Ownership Boundaries

Runtime helper selection belongs under `autobyteus-ts` because `IsolatedPtySession` is the owner that must satisfy native startup preconditions before spawning the bridge. Packaging owns shipped file modes, but packaging must not be the only place the runtime invariant is enforced. Frontend and server streaming own error visibility, not native repair.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ensureNodePtySpawnHelperExecutable()` | node-pty selected-native-dir probing and chmod | `IsolatedPtySession` | `IsolatedPtySession` manually scanning node-pty dirs | Add diagnostics/API to bootstrap owner |
| `TerminalHandler.connect()` | session create/read loop/error frame/cleanup | websocket route | route directly controlling PTY internals | Strengthen handler error contract |
| Packaged terminal validator script | selected-helper package checks | release workflow | ad-hoc shell checks spread across workflow | Add options to validator script |

## Dependency Rules

- `IsolatedPtySession` may call `node-pty-bootstrap`; it must not duplicate helper directory search.
- `node-pty-bootstrap` may depend on `node-pty` package internals only behind one resolver function with diagnostics and tests.
- Packaging scripts may chmod packaged resources but must not become the runtime source of truth for helper selection.
- Frontend terminal code may display backend error messages but must not infer native helper state.
- Release workflow should call one validator script rather than duplicate filesystem probes inline.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ensureNodePtySpawnHelperExecutable()` | selected node-pty helper | Repair executable bit | current process platform/arch | Runtime precondition. |
| `getNodePtySpawnHelperDiagnostics()` if added | selected node-pty helper | Diagnostic details | current process platform/arch | For logs/tests. |
| `verify-packaged-terminal-runtime.mjs` CLI | packaged app/server bundle | Validate helper and spawn | explicit app path or server path, optional arch | Used by release/local checks. |
| Terminal websocket `error` frame | terminal startup failure | Communicate actionable failure | session id and message | Keep message user-safe. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ensureNodePtySpawnHelperExecutable()` | Yes | Yes | Low | Resolve actual selected helper. |
| Validator CLI | Yes | Should be | Medium | Require explicit path and report selected helper. |
| Terminal websocket error frame | Yes | Yes | Low | Do not overload output frames. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runtime helper bootstrap | `node-pty-bootstrap.ts` | Yes | Low | Keep. |
| Package validator | `verify-packaged-terminal-runtime.mjs` | Yes | Low | Add as named release check. |
| Terminal handler | `TerminalHandler` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Startup precondition repair inside one owner: `IsolatedPtySession` calls one bootstrap function before bridge spawn.
- Package validation script: bounded release-check pattern, not a runtime fallback.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | File | terminal backend | Selected helper resolution/chmod/diagnostics | Existing terminal-native owner | Desktop package workflow logic |
| `autobyteus-ts/scripts/fix-node-pty-permissions.mjs` | File | install repair | Development/postinstall helper chmod | Existing postinstall repair path | Frontend or websocket behavior |
| `autobyteus-web/scripts/prepare-server.mjs` / `.sh` | File | packaging prep | Normalize staged server helper modes | Existing server-resource staging | Runtime terminal session control |
| `autobyteus-web/build/scripts/afterPack.ts` | File | afterPack signing | Sign and, if needed, chmod helper before signing | Existing native binary signing hook | node-pty selected-helper runtime logic |
| `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs` | File | release validation | Check packaged selected helper/spawn behavior | Desktop package validation concern | General CI orchestration |
| `.github/workflows/release-desktop.yml` | File | release orchestration | Invoke validation in mac package jobs | Existing release workflow | Inline native probing logic |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | File | terminal streaming | Send/log startup errors | Existing backend lifecycle owner | Filesystem helper repair |
| `autobyteus-web/composables/useTerminalSession.ts` | File | frontend terminal transport | Preserve startup error message | Existing client websocket owner | Native helper diagnostics probing |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal` | Main-Line Domain-Control | Yes | Low | Owns terminal backends and native startup. |
| `autobyteus-web/scripts` | Off-Spine Concern | Yes | Low | Owns packaging/validation scripts. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Main-Line Domain-Control | Yes | Low | Owns backend terminal streaming lifecycle. |
| `autobyteus-web/composables` | Transport/UI state | Yes | Low | Owns frontend websocket composables. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Helper repair | `selectedDir = nodePty.loadNativeModule('pty').dir; chmod selectedDir/spawn-helper` | `for dir in build/Release build/Debug prebuilds/currentArch; return first helper` | The bad shape is the current Intel failure. |
| Package validation | Run validator against `.app` and fail if selected helper is non-executable | Only codesign files named `spawn-helper` | Codesigning does not set executable bits. |
| Error visibility | Backend sends `type:error` then frontend preserves it | Close websocket `1011` with no frame, frontend shows generic loss | Prevents users seeing a silent hang. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep build-first helper selection and add x64 chmod elsewhere | Smallest patch | Rejected | Runtime resolver must target selected helper. |
| Add fallback terminal backend if node-pty fails | Could make UI appear usable | Rejected | Fix packaged native helper; fallback would hide release defects. |
| Keep no-error websocket close behavior | Avoid protocol change | Rejected | Send/preserve actionable startup error. |

## Derived Layering (If Useful)

- UI layer: `Terminal.vue`, `useTerminalSession`.
- Backend streaming layer: websocket route and `TerminalHandler`.
- Terminal runtime layer: `PtySessionManager`, `IsolatedPtySession`, `node-pty-bootstrap`.
- Packaging/release validation layer: server-resource preparation, afterPack, release workflow validator.

## Migration / Refactor Sequence

1. Update `node-pty-bootstrap.ts` to resolve the actual selected native dir and chmod the adjacent `spawn-helper`; add diagnostics.
2. Align `fix-node-pty-permissions.mjs` so dev/postinstall repair does not preserve stale build-first behavior.
3. Add focused unit tests for stale/wrong-arch `build/Release` plus non-executable current-arch prebuild.
4. Update `IsolatedPtySession`/`TerminalHandler` logging to include helper diagnostics on startup failure.
5. Add/adjust server and frontend tests for startup error frame/error preservation.
6. Update packaging scripts to chmod Darwin helpers in staged/packaged server resources before signing/validation.
7. Add packaged terminal validator and wire it into mac release jobs.
8. Run dev terminal integration/E2E and package validation; verify packaged Intel websocket emits prompt.

## Key Tradeoffs

- Using `node-pty/lib/utils.js.loadNativeModule('pty')` couples to a private node-pty utility, but it is the most accurate oracle for the actual selected helper. Encapsulate that coupling in `node-pty-bootstrap.ts` and cover it with tests.
- Packaging chmod plus runtime repair is intentionally redundant: packaging prevents bad releases, runtime repair protects installed/local dependency states.
- Do not solve this by frontend retries; retrying the same non-executable helper will still fail.

## Risks

- `node-pty` private utility shape could change. Mitigation: one encapsulated resolver with diagnostic fallback and tests.
- Electron-builder signing/notarization may require chmod before signing. Mitigation: chmod during preparation/afterPack before codesign and validate after packaging.
- The installed app currently fails even at v1.3.58; final implementation must test the packaged app, not just dev dependencies.

## Guidance For Implementation

- Start with `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts`; make the selected helper path observable in tests.
- Reproduce the failing package shape in a unit test: executable arm64 `build/Release/spawn-helper`, non-executable x64 `prebuilds/darwin-x64/spawn-helper`, and assert the x64 helper is selected/repaired.
- Keep package validation explicit: print selected native dir, helper path, mode, executable status, and spawn probe result.
- Final proof on Intel should be a direct websocket probe to the packaged server that receives prompt/output before timeout.
