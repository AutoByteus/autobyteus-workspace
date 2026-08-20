# Design Spec

## Current-State Read

The packaged entrypoint is `autobyteus-web/electron/main.ts`, compiled to the package main `dist/electron/main.js`. Its static import graph constructs the logger, the platform server-manager singleton, `AppDataService`, the server-status bridge, and the updater before `bootstrap()` begins. The logger can open/truncate `~/.autobyteus/logs/app.log`, and the server-manager constructor initializes canonical backend directories before the fixed-port check reports that `29695` is occupied. The current entry therefore cannot enforce isolation by reading an environment value only inside `bootstrap()`.

Endpoint authority is also fragmented. `shared/embeddedServerConfig.ts` supplies `127.0.0.1:29695` as both a production default and an active client/advertised value to the server manager, platform launchers, first-run server environment, main node-registry normalizer, Nuxt build configuration, renderer fallbacks, and diagnostics. That loopback client endpoint is not the listener-bind policy: `autobyteus-server-ts/src/app.ts` defaults the backend listener to `0.0.0.0`, and the Electron platform managers preserve that wildcard policy by passing no `--host`. The renderer already has a healthy dynamic path—main node registry -> preload IPC -> renderer node store -> `windowNodeContextStore` -> derived HTTP/WebSocket endpoints—but main and renderer normalization can rewrite the embedded node back to the compiled default, while several supported call sites bypass the window-bound owner.

Mutable state spans two root families. AutoByteus backend/config/log/extension/browser-artifact state is rooted at `~/.autobyteus`; Chromium state, persistent partitions, local storage, cookies, caches, updater state, and the node registry use Electron paths such as `userData` and `sessionData`. The live packaged process confirmed the backend child uses `--port 29695 --data-dir ~/.autobyteus/server-data` and Chromium helpers use the ordinary product `userData` directory. Changing only the backend port or `--data-dir` is therefore insufficient.

There is no `requestSingleInstanceLock()` in the application. A second process is allowed by the codebase if its port and mutable paths are isolated, whether a direct child-process adapter or Playwright's Electron adapter owns creation. The current blocker is bootstrap/configuration ownership, not bundle identity. The target must preserve the ordinary launch defaults, main package entry, loopback client/advertised endpoint, wildcard backend listener policy, three platform launchers, remote-node/phone-access behavior, existing production data in place, and the caller-provided environment/server credential-provisioning journey for both launch profiles. See `investigation-notes.md` BEH-001 through BEH-007 for the evidence-backed current paths.

## Intended Change

Introduce one immutable **Electron launch profile**, resolved synchronously at the top of the packaged entry before any stateful application module is loaded.

- An absent selector or `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=production` resolves the current production port and paths.
- `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e` requires `AUTOBYTEUS_ELECTRON_SERVER_PORT` and `AUTOBYTEUS_ELECTRON_DATA_ROOT` in the spawned process environment.
- A valid E2E profile accepts only a pre-existing, canonically proven safe root, derives every AutoByteus/Electron mutable child path from that branded canonical root, applies Electron path overrides before readiness, injects one loopback client/advertised endpoint while preserving the backend's wildcard listener policy, disables updater startup, preserves existing caller-environment/server provisioning behavior, and fails closed on partial, unsafe, or conflicting isolation inputs.
- Reusable E2E launch preparation builds or reuses the artifact in the ticket worktree, resolves the exact executable, chooses a listener-equivalent free non-default port, prepares or accepts a canonically safe root, and overlays the three launch-profile keys on the caller-provided environment. Separate direct-process and Playwright/Electron adapters consume that prepared resource and return adapter-specific control plus common readiness/cleanup metadata.

The artifact remains the ordinary production-equivalent electron-builder output. Port and root are launch inputs, not Nuxt/electron-builder build values and not repository or production `.env` values. A running installed/user AutoByteus instance remains running and usable while the E2E instance executes.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | R-001, R-006; AC-001, AC-011 | Normal packaged launch, selector absent or explicitly `production` | Investigation BEH-001 and live trace | Preserve port `29695`, loopback client URL, wildcard backend listener, `~/.autobyteus`, ordinary Electron paths/environment, data, build artifact, and updater behavior | Thin entry -> production profile -> application lifecycle -> existing backend/renderer behavior; DS-001, DS-004, DS-007 |
| BEH-002 | Operational | R-001, R-002, R-003; AC-002, AC-003 | Explicit valid `e2e` launch while `29695` is owned | Investigation BEH-002 and backend listener evidence | Start a distinct wildcard-listening backend on the requested non-default port and advertise/call it through loopback without touching/stopping the existing owner | Prepared launch -> direct or Playwright process adapter -> launch resolver/listener-equivalent preflight -> injected manager; DS-002, DS-005 |
| BEH-003 | System | R-002, R-003, R-004, R-007, R-009; AC-004, AC-005, AC-006, AC-008, AC-014 | Any E2E main-process startup | Investigation BEH-003, path inventory, live helper arguments, AR-F-001 evidence, user scope clarification | Prove a pre-existing root canonically safe without mutation and derive children from the canonical value while preserving caller environment and existing credential provisioning; no canonical path mutation/fallback | Preparation/safe-root resolver -> thin entry -> path applier -> configured application owners; DS-002, DS-005, DS-006 |
| BEH-004 | Contract | R-003, R-005; AC-003, AC-004 | Backend launch, registry bootstrap, status, supported renderer network call | Investigation BEH-004 and renderer call-site inventory | One selected port governs backend spawn under the preserved listener policy; its loopback client URL governs health, registry, status, HTTP, and WebSocket traffic; remote nodes remain unchanged | Profile -> manager/registry -> preload -> node/window context -> clients; DS-003, DS-004, DS-007 |
| BEH-005 | Operational | R-007, R-008; AC-007, AC-009, AC-014 | E2E command or another probe prepares a launch and chooses a process adapter | Investigation BEH-005, backend-only verifier, AR-F-002 evidence, user scope clarification | Provide one prepared exact-binary/resource/caller-environment contract consumable by direct smoke and Playwright-owned UI journeys, with adapter-specific process control and common ownership-safe cleanup | E2E runner -> preparation -> direct/Playwright adapter -> common session/readiness/cleanup; DS-002, DS-006 |
| BEH-006 | Contract | R-002, R-009; AC-008 | Selector/port/root is partial, malformed, unsafe, unknown, or occupied | Investigation BEH-006 | Exit actionably before a window/backend and without production writes; never fall back | Resolver/path safety/port preflight -> diagnostic exit; DS-005 |
| BEH-007 | Operational | R-010; AC-010 | Packaged lifecycle under E2E versus production profile | Investigation BEH-007 | Do not construct/start updater behavior for E2E; preserve normal updater for production | Application policy from resolved profile; DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence: Compiled defaults act as active configuration in multiple owners; logger/server-manager state is constructed before bootstrap; AutoByteus and Electron path selection is split; client endpoint and listener-bind meanings are conflated; direct spawn is coupled to resource preparation; renderer code has a dynamic governing context but supported bypasses still target the compiled endpoint. Environment/credential handling is not a ticket root cause and is explicitly preserved.
- Design response: Establish an early launch-profile/safe-root boundary, make the current main file a thin entry, delay stateful application construction, inject separate client-endpoint and preserved-listener semantics into server owners, make renderer node binding authoritative, split launch preparation from direct/Playwright process adapters, preserve the caller-provided environment/server provisioning path, and remove fixed Electron endpoint fallbacks and the global server-manager singleton.
- Refactor rationale: A platform-launcher-only environment read would still mutate production state and route some renderer calls to `29695`. The bootstrap and ownership refactor is required to satisfy fail-closed full isolation, not optional cleanup.
- Intentional deferrals and residual risk, if any: Broader decomposition of all existing main-process IPC and window coordination is deferred because it is not required to establish the launch-profile invariant. `ElectronApplication` becomes the explicit lifecycle owner while existing focused services remain behind it. Playwright/package-version compatibility and cross-platform process-tree behavior remain execution risks for API/E2E, not reasons to weaken the product contract.

### Architecture Review Round 1 Resolution

| Finding ID | Blocking Design Impact | SR-002 Resolution | Primary Design Locations |
| --- | --- | --- | --- |
| AR-F-001 | Root creation could follow a symlinked ancestor into protected production state before canonical rejection | Require an existing selected root; project candidate/protected paths without mutation through nearest existing ancestors; reject selected-root symlinks/overlap; mint `ResolvedSafeE2EDataRoot`; permit preparation-owned `mkdtemp` only under a prevalidated canonical temp parent; path applier accepts branded root only | DS-005; ownership/boundary map; `e2eDataRootSafety.ts`; examples and guidance |
| AR-F-002 | One direct-spawn launcher could not yield Playwright `ElectronApplication` control | Separate single-use `PreparedElectronE2ELaunch` from direct and Playwright process adapters; compose both with a common readiness/cleanup session; Playwright adapter owns `_electron.launch`, `.process()`, `.firstWindow()`, and `.close()` | DS-002/DS-006; adapter boundaries; E2E support file map |
| AR-F-003 | Loopback client host was conflated with wildcard listener policy | Rename loopback value `EmbeddedServerClientEndpoint`; inject literal `preserve-backend-default` listener policy; pass port/data but no host; preflight via IPv4 wildcard/exclusive bind matching backend `0.0.0.0` | DS-001/DS-007; server config/interface; listener examples/tests |
| AR-F-004 | Architecture review treated inherited caller credentials as a defect and expanded the ticket into credential-policy redesign | **Superseded by explicit user clarification in SR-003.** Preserve caller-provided environment and existing pnpm/import/application/server API-key/provider/Codex provisioning. Remove the allowlist, denylist, main scrub, sanitized backend snapshot, secret-seeding prerequisite, and AC-013 introduced from this finding. | Scope guardrails; BEH-003/BEH-005; R-007; AC-014; environment-preservation boundary |

### Code Review Round 1 Design-Impact Resolution

| Finding ID | Review Classification / Problem | SR-003 Resolution Or Retained Action | Primary Design Locations |
| --- | --- | --- | --- |
| CR-F-001 | `Design Impact`: DS-006 allowed ambient selected-port occupancy to veto disposal of a preparation-owned root after a foreign process won the accepted allocation race | Make adapter-owned whole-process-tree completion the sole process-lifecycle authorization for owned-root disposal. Port availability is observed only after tree completion as a bounded diagnostic; a foreign/rebound listener is never signaled and cannot block disposal. Unconfirmed tree completion retains the root and fails cleanup. | DS-006; common-session boundary; process-controller interface; cleanup example/risk/guidance |
| CR-F-002 | `Local Fix` under the now-superseded AR-F-004 policy: supported E2E launch preserved `CODEX_HOME` | **Do not implement.** The user requires `CODEX_HOME` and other caller-provided credential/provisioning inputs to retain existing behavior. Remove the credential-sanitization mechanism rather than extending it. | Scope guardrails; environment-preservation boundary; implementation guidance |
| CR-F-003 | `Local Fix`: Playwright rejection without an application handle retained an owned root despite the installed launcher's settled-cleanup contract | Retain as implementation rework: on verified installed-launcher rejection, preserve the primary error and dispose a preparation-owned root; caller-owned roots remain retained. | Adapter failure rule; DS-006; implementation guidance |
| CR-F-004 | `Local Fix`: direct cleanup waited for only the root Electron child | Retain as implementation rework under the strengthened controller contract: direct and Playwright controllers return success only after their entire owned tree is confirmed absent, with targeted graceful-to-forceful escalation. | DS-006; adapter/controller interface; implementation guidance |
| CR-F-005 | `Local Fix`: `ElectronApplication.isAppQuitting` is assigned but unread | Retain as implementation cleanup; remove the field and assignment rather than restoring obsolete lifecycle behavior. | Removal plan; implementation guidance |

**MP-003 reassessment:** The factual premise that caller-provided API-key/provider/Codex environment values can reach an E2E Electron/backend process is `Reachable`, but its prior material consequence is invalid under the corrected requirement. That inheritance is established behavior the user requires this ticket to preserve, not an isolation defect. MP-003 therefore cannot support AR-F-004, AC-013, CR-F-002, or credential-sanitization machinery in this scope.

### Scope Authority For Re-Review

The approved subject is Electron instance isolation: selected port, application-owned data/profile paths, renderer endpoint propagation, updater suppression, exact process ownership, and cleanup. Existing caller-provided environment and internal server/API-key/provider/search/Codex provisioning are preserved. A blocking review finding must cite an approved requirement or acceptance criterion that it protects. Credential filtering, provider-home redirection, secret-seeding requirements, or other policy changes are outside scope and require a separate user-approved requirement; they must not be inferred from the word “isolation.”

## Terminology

- **Electron launch profile:** Immutable main-process startup selection named `production` or `e2e`. This is the approved term; do not call it a runtime or build profile.
- **Production-equivalent packaged artifact:** The normal artifact emitted by existing electron-builder commands in the current worktree, with the ordinary app ID/product name/signing configuration.
- **Resolved safe E2E data root:** A branded canonical path minted only after the selected directory already exists, its canonical/lexical projections are disjoint from every protected production root, and the selected entry is not a symlink. Only this value may authorize descendant creation or cleanup.
- **Client/advertised endpoint:** The loopback `127.0.0.1:<selected-port>` URL used by Electron, health/status, registry, and renderer clients.
- **Listener policy:** The unchanged backend default bind behavior (`0.0.0.0` today). The launch profile does not expose listener-host selection, and platform adapters continue to omit `--host`.
- **Prepared E2E launch:** A single-use resource containing exact executable/options, the caller-provided environment with the three isolation keys overlaid, selected port, resolved safe root, readiness URLs, and ownership flags, but no process yet.
- **Ordinary application:** A user-started installed or worktree AutoByteus process using the production launch profile and default resources.
- **Resource/process ownership:** Preparation owns only resources it created; a selected adapter owns only the complete process tree rooted in or assigned to the process it launched; the common session may delete only the preparation-owned canonical root and only after the adapter confirms that owned tree is gone. No layer owns an arbitrary caller root, another AutoByteus process, or a process merely because it uses the selected port.
- **Owned-process-tree completion:** An adapter-specific affirmative result that every process in the adapter's owned group/tree is absent, or that launch rejected under a verified launcher contract that already killed and waited for any spawned tree. Root-child exit and port availability are not equivalent evidence.
- **Port observation:** A bounded wildcard-bind availability probe used for allocation/startup failure and post-cleanup diagnostics. After launch ownership exists, port state never identifies a process owner and cannot authorize signaling, root deletion, or root retention by itself.

## Design Reading Order

Follow this document in the template order: approved behavior map -> health/removal/data decision -> spines and owners -> boundaries/subsystems -> files/folders -> sequence, tradeoffs, risks, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Production defaults remain, but only as inputs to the single launch-profile resolver. They must not remain as a parallel active-configuration path.
- Remove the fixed-port manager field/reset, the global server-manager singleton, main and renderer embedded-node rewrites to compiled URLs, generic Electron branches in global server-config helpers, and module-import filesystem initialization.
- Remove the SR-002 credential-sanitization expansion: the E2E allowlist/denylist, main-process scrubber, sanitized backend snapshot, generic HOME/config redirection, and secret-seeding prerequisite. Preserve the established caller environment and server provisioning path, adding only the explicit isolation inputs.
- Do not replace the backend's preserved wildcard listener with the loopback client host. No `--host` or listener-host environment override is introduced.
- Rename/remove `shared/embeddedServerConfig.ts` rather than keep an alias re-export. All importers move to the canonical shared endpoint/default structure.
- Accept only the three approved `AUTOBYTEUS_ELECTRON_*` variables. Do not add older aliases, `.env` fallback, build-time fallback, or a second E2E app identity.
- Any implementation that permits port-only/root-only overrides, re-reads the three launch-profile keys in downstream managers, filters unrelated caller environment, or retains a renderer fallback to `29695` in Electron fails this design.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Backend/database/config/content under `~/.autobyteus/**`; node registry, Chromium cookies/cache/local storage/IndexedDB/persistent partitions and updater-related state under the OS product `userData`/`sessionData`; volume varies by user and was inspected only at metadata/top-level because no transformation is proposed.
- Relevant code-model, serialization, semantic, or physical-store change: Location selection becomes profile-owned. No database, registry, cookie, extension, or browser-session schema changes.
- Normal reader/writer behavior and representative evidence: `AppDataService`, logger, extension service, browser runtime, Electron sessions, and node registry already operate against a supplied/derived directory. The defect is that current callers always select production roots. The revised path boundary requires the selected E2E root itself to pre-exist and be canonically validated without mutation before any descendant writer is constructed.
- Required semantics and invariants under direct use: Production readers/writers must keep current locations and meaning; E2E readers/writers use the same current schemas in a blank/seeded isolated root; no cross-root read, reset, or delete is allowed.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Production filesystem/profile data can contain credentials and user content and is never copied into E2E implicitly. Preparation creates owned roots atomically under a prevalidated canonical temporary parent; accepted caller roots must already exist. Harness-created roots are disposable; caller-supplied roots are retained by default. The application itself never recursively deletes the selected root. Existing caller-environment and credential-provisioning behavior is preserved and is outside the filesystem migration/isolation decision.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Production location and schema remain unchanged, and blank E2E roots use existing first-run/current migration behavior. Copying or moving production data has no functional benefit and adds privacy, corruption, downtime, and cleanup risk.
- Acceptance criteria or design constraints supported by this decision: R-003, R-004, R-006, R-008, R-009; AC-001, AC-005, AC-006, AC-008, AC-009.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — the approved decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-007 | Ordinary packaged process launch | Production backend and renderer lifecycle | `ElectronApplication` after launch-profile resolution | Preserves production paths, environment, client URL, wildcard listener, and updater behavior |
| DS-002 | Primary End-to-End | BEH-002, BEH-003, BEH-005, BEH-007 | `pnpm test:e2e:electron` or reusable preparation caller | Ready direct-spawn or Playwright-controlled packaged E2E renderer/backend | Preparation owns pre-process resources; selected adapter owns the process; `ElectronApplication` owns in-process lifecycle | Carries coexistence and Playwright reuse end to end |
| DS-003 | Primary End-to-End | BEH-004 | Resolved embedded client endpoint | Actual supported renderer HTTP/WebSocket call | Main node registry then `windowNodeContextStore` | Prevents split-brain backend/renderer endpoints |
| DS-004 | Return-Event | BEH-001, BEH-004 | Backend lifecycle event/health result | Renderer status and session readiness observation | `ServerStatusManager` | Returns the actual selected loopback base URL/status rather than a compiled guess |
| DS-005 | Primary End-to-End | BEH-002, BEH-003, BEH-006 | Prepared/raw packaged process environment | Actionable nonzero exit with no window/backend/production mutation | Safe-root resolver, path applier, listener-equivalent preflight | Enforces fail-closed filesystem and listener isolation without changing credential behavior |
| DS-006 | Bounded Local | BEH-003, BEH-005, BEH-006 | Prepared resources claimed by one process adapter | Entire adapter-owned process tree conclusively stopped; preparation-owned root disposed or retained from ownership evidence; ambient port state reported separately | Common E2E session controller around direct/Playwright adapters | Makes cleanup reusable without letting a foreign listener control E2E resource ownership |
| DS-007 | Bounded Local | BEH-001, BEH-002, BEH-004 | Server start/restart request | Ready/error generation settled | `BaseServerManager` | Keeps port/data/client URL consistent while preserving the independent wildcard listener policy |

## Primary Execution Spine(s)

- **DS-001:** OS/user launch -> thin `main.ts` -> resolve `production` launch profile -> configure production paths/logger -> dynamically load `ElectronApplication` -> construct server config with loopback client endpoint plus `preserve-backend-default` listener policy -> ordinary window/backend/updater/environment lifecycle.
- **DS-002:** E2E command/caller -> optional worktree build -> prepare exact executable + wildcard-listener-equivalent port + resolved safe root + caller environment with forced isolation keys -> claim once through direct adapter **or** Playwright `_electron.launch` adapter -> thin `main.ts` revalidates/applies `e2e` profile -> application/server readiness -> smoke or packaged renderer journey.
- **DS-003:** Resolved client endpoint -> injected `BaseServerManager` and main node registry -> preload registry/context IPC -> renderer `nodeStore` -> `windowNodeContextStore` -> derived REST/GraphQL/WebSocket client endpoint.
- **DS-005:** Spawn environment -> grouped parsing of only the three profile keys -> non-mutating protected/candidate path projection and existing-root realpath proof -> isolated descendant creation/application -> wildcard-listener-equivalent port preflight -> on error stderr + nonzero `app.exit` -> no stateful application import/window/backend. All unrelated environment values pass through unchanged.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The same artifact resolves production defaults and follows the ordinary lifecycle; no production path, environment, listener host, or client endpoint is relocated or translated. | Launch profile, application, server launch config, window | `ElectronApplication` | Logger configuration, updater, scheme registration |
| DS-002 | Preparation builds/reuses only the current worktree artifact, proves/creates safe resources, and overlays isolation keys on the caller environment; then one adapter owns process creation. Direct smoke receives an exact child handle; Playwright UI receives `ElectronApplication`; both use a common readiness/session cleanup owner. | Prepared launch, process adapter, E2E profile, ready application | Preparation owner, adapter, then `ElectronApplication` | Build discovery, environment overlay, diagnostics, adapter-specific close |
| DS-003 | Main writes the active embedded client URL into the isolated registry; renderer accepts it and binds clients through the existing window context. | Client endpoint, registry profile, window binding, endpoint set | Main registry owns persisted embedded identity; window context owns per-window client routing | IPC typing, browser fallback, remote-node preservation |
| DS-004 | The backend manager emits status based on its injected client endpoint; status IPC carries the actual loopback base URL; renderer derives display/client URLs and the common session probes the same health target. | Server status snapshot, health result | `ServerStatusManager` | Fanout, diagnostics |
| DS-005 | Unknown/partial isolation values, nonexistent/unresolved/symlinked/overlapping roots, or occupied wildcard-listener ports fail before configuration can degrade to production; unrelated caller environment remains unchanged. | Launch input, canonical root, validation error | Launch-profile boundary | Stderr formatting, protected-path projections, isolated log after valid path application |
| DS-006 | A prepared launch is single-use. The selected adapter supplies a process-tree controller whose completion result covers the entire owned tree. The common session orders graceful close, whole-tree wait/escalation, owned-root disposal, and a separate port diagnostic. It retains the root only when owned-tree completion is unconfirmed, never because a foreign listener remains. | Prepared launch, owned-tree controller, cleanup disposition, port observation | Common E2E session | POSIX process groups, Windows tree completion, Playwright close/rejection, temp deletion retries |
| DS-007 | The server manager reuses one injected client endpoint, data root, and literal preserved-listener policy for preflight, start, readiness, status, restart, and stop. Platform adapters preserve established environment propagation, pass selected port/data, and deliberately pass no host. | Server generation, client endpoint, listener policy, data directory | `BaseServerManager` | Platform spawn adapters, output logging |

## Spine Actors / Main-Line Nodes

1. E2E command/caller
2. Prepared E2E launch resource
3. Direct process adapter or Playwright Electron process adapter
4. Common E2E session/readiness/cleanup controller
5. Thin Electron entry
6. Electron launch-profile safe-root/path boundary
7. `ElectronApplication`
8. `BaseServerManager` plus platform spawn adapter
9. Main node-registry persistence
10. Preload IPC contract
11. Renderer node store and `windowNodeContextStore`
12. Bound HTTP/WebSocket clients

## Ownership Map

- **Launch preparation:** Owns optional build invocation, exact artifact discovery, wildcard-listener-equivalent port selection, safe root preparation/acceptance, caller-environment overlay with the three isolation keys, readiness metadata, and a single-use claim state. It creates no application process and owns no credential policy.
- **Direct process adapter:** Claims one prepared launch, spawns the exact executable in an OS-specific controllable process group/tree, and exposes a controller that identifies the owned root PID/group/tree, requests graceful shutdown, escalates only that owned tree, and reports completion only when the whole tree is absent. It does not duplicate allocation, environment, readiness, or root policy.
- **Playwright process adapter:** Claims one prepared launch, maps its exact executable/args/environment into `_electron.launch(...)`, and exposes the returned `ElectronApplication`, `process()`, `firstWindow()`, and `close()` through a controller with the same whole-tree completion semantics. A rejection without an application handle is governed by the verified installed Playwright contract that has already killed/waited for any spawned process; the adapter disposes preparation-owned resources before preserving/rethrowing the primary error. It does not attach to a prelaunched process.
- **Common E2E session:** Owns readiness polling and idempotent cleanup order around an adapter-specific whole-tree controller. It owns only a root marked as preparation-created. It deletes that root after affirmative owned-tree completion, retains it with an actionable error when completion cannot be established, and records selected-port availability only as a diagnostic after the ownership decision.
- **`main.ts`:** Thin package/transport entry only. It owns ordering—scheme registration, profile/safe-root resolution, path application, logging initialization, listener-equivalent E2E preflight, dynamic application loading, fatal exit—but no ongoing app lifecycle or environment filtering.
- **Launch-profile subsystem:** Owns reading only the three launch-profile isolation keys, validation, defaults, non-mutating lexical/canonical protected-root comparison, resolved-safe-root branding, descendant path application, and the immutable profile. No downstream owner may reinterpret those three keys or accept a raw root string. It does not own credentials or the remainder of `process.env`.
- **`ElectronApplication`:** Governs main-process subsystem construction, readiness order, windows, status fanout, updater policy, and orderly/failure shutdown. It receives, but does not reinterpret, the profile.
- **`BaseServerManager`:** Governs one embedded backend process generation. It owns the injected loopback client endpoint, `preserve-backend-default` listener policy, and data root for listener-equivalent preflight, spawn, health, status, restart, reset, and stop. Environment behavior remains the established server-launch behavior.
- **Platform managers:** Thin process adapters. They translate manager-owned configuration into platform-specific executable/CLI/environment details, pass the selected port/data path, intentionally omit host selection, preserve the existing caller/application environment propagation, and apply the same existing application-generated runtime overrides.
- **Main node registry:** Owns persisted node profiles and guarantees the embedded-node record uses the application-provided client base URL while preserving remote nodes.
- **Renderer `nodeStore`:** Owns registry snapshots. In Electron it trusts/validates the main snapshot; in browser mode it alone may synthesize the build/runtime-config default.
- **`windowNodeContextStore`:** Governs per-window active node identity and all renderer endpoint derivation. It must be initialized before supported Electron network calls.
- **Logger:** `logger.ts` remains the canonical logging owner but becomes explicitly configurable and side-effect-free until configured.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `electron/main.ts` | Launch-profile subsystem and `ElectronApplication` | Preserve `dist/electron/main.js` package entry and enforce earliest ordering | Windows, server singleton, updater, mutable paths beyond applying the resolved plan |
| `ServerManagerFactory.createServerManager(config)` | Returned `BaseServerManager` subclass | Select only the OS adapter | Defaults, singleton lifecycle, environment parsing |
| `scripts/run-electron-e2e.mjs` | Launch preparation + selected process adapter + common session | Stable package command and build/skip-build CLI | Allocation policy duplication, broad process killing, production data cleanup |
| Preload `electronAPI` methods | Main registry/status/application owners | Context-isolated IPC boundary | Endpoint fallback or business/runtime configuration selection |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `shared/embeddedServerConfig.ts` active-config semantics/file | One name conflates defaults, client URL, and listener meaning | `shared/embeddedServerClientEndpoint.ts` for loopback client/default formatting plus `electron/server/embeddedServerLaunchConfig.ts` for preserved listener policy | In This Change | Rename cleanly; no alias re-export; no listener-host selector |
| `FIXED_SERVER_PORT`, fixed `serverUrl` initializer/reset | Manager receives one immutable client endpoint and listener policy | `ElectronLaunchProfile.clientEndpoint` plus `EmbeddedServerLaunchConfig` injected into `BaseServerManager` | In This Change | Start/restart cannot re-read defaults; platform adapters omit host |
| Exported global `serverManager` singleton | Instantiates path-owning state during import | `ElectronApplication` calls factory after profile/logger setup | In This Change | Factory remains stateless |
| Import-time file logger creation/truncation | Violates early isolation | Explicit `configureElectronLogger(baseDataRoot)` on a deferred/no-I/O-before-config logger owner | In This Change | Existing import path may remain canonical, not as a compatibility wrapper |
| Main registry hard-reference to compiled base URL | Splits active endpoint authority | `ensureEmbeddedNode(snapshot, activeBaseUrl)` and profile-aware load | In This Change | Remote records remain unchanged |
| Renderer Electron normalization/fallback to `29695` | Can route E2E traffic to ordinary app | Main snapshot + `windowNodeContextStore` binding | In This Change | Electron bootstrap failure remains an error, not a default fallback |
| Generic `utils/serverConfig.ts` Electron branches and `utils/embeddedNodeBaseUrl.ts` | Names imply active global config and permit bypasses | Browser-only config helper plus window-bound Electron owner | In This Change | Rename/remove, update all call sites, no forwarding aliases |
| `ServerStore` static port/URL initialization | Diagnostics can disagree with manager | Typed status snapshot carrying active base URL; renderer derives port/URLs | In This Change | Remove `any` status contract |
| E2E updater construction/auto-check | Nondeterministic and shares updater behavior | `ElectronApplication` constructs/starts updater only for `production` | In This Change | Production path preserved |
| Special build-profile proposal | Values vary per run and do not require product identity | Same package + launch environment | In This Change | No alternate app ID/product name/signing/update channel |
| Raw-root authorization and create-then-realpath ordering | Can follow symlinked ancestors into protected state before rejection | `ResolvedSafeE2EDataRoot` minted read-only from an existing directory; preparation alone creates owned roots under a prevalidated temp parent | In This Change | Raw root strings never reach path-owning services |
| Monolithic direct-spawn packaged launcher | Cannot be reused by Playwright-owned Electron launch | Prepared launch resource + direct adapter + Playwright adapter + common session | In This Change | No attach emulation or duplicated allocators |
| SR-002 E2E allowlist/denylist, main scrubber, sanitized backend environment, and generic home/config redirection | They implement the superseded AR-F-004 credential policy and break existing caller/server provisioning | Caller-environment overlay with only the three isolation keys plus established platform-manager environment behavior | In This Change | Remove the policy and its tests; do not replace it with another credential filter |
| Port-release gate for owned-root disposal | Ambient port occupancy has no process identity and lets a foreign race winner veto cleanup | Adapter-owned whole-tree completion result plus independent post-completion port diagnostic | In This Change | Never kill by port; retain root only when owned-tree completion is unconfirmed |
| Root-child-only wait semantics in E2E controllers | Electron's backend/Chromium descendants can outlive the root child and still use the isolated root | OS-specific whole-tree controller contract with graceful wait, targeted force escalation, and affirmative completion | In This Change | Root `exit` alone is insufficient |
| `ElectronApplication.isAppQuitting` field/assignment | Extracted lifecycle owner no longer reads this obsolete guard | Existing explicit start/stop/fatal-exit sequencing | In This Change | Remove; do not restore compatibility behavior |

## Return Or Event Spine(s) (If Applicable)

- **DS-004:** Backend child health -> `BaseServerManager` `ready`/`error` event -> `ServerStatusManager` typed snapshot with active `baseUrl` -> main fanout -> preload `onServerStatus` -> renderer `serverStore` derives/display actual port and endpoints.
- Common session readiness uses the same client-endpoint-derived health URL. It must not infer readiness from window existence or probe `29695`.
- Node-registry updates flow main registry owner -> IPC broadcast -> renderer `nodeStore.applyRegistrySnapshot()` -> window context/revision -> clients resolve current endpoints.

## Bounded Local / Internal Spines (If Applicable)

- **DS-006 parent owner: Common E2E session.** Claim prepared launch exactly once -> adapter launches and establishes an owned tree identity -> poll selected readiness -> run caller/probe -> request adapter graceful close (`ElectronApplication.close()` for Playwright; owned-group/tree shutdown for direct) -> await the entire owned tree -> targeted force escalation of that same tree if needed -> receive affirmative `OwnedProcessTreeCompletion` or a cleanup failure. On affirmative completion, remove only `ownsDataRoot=true` root; caller-owned roots remain. Then perform a bounded wildcard listener probe and record `available` or `occupied-after-owned-tree-exit` diagnostically. An occupied port never blocks root disposal and never authorizes signaling because its owner can be foreign. If whole-tree completion is unconfirmed, retain the owned root and report the exact ownership/termination failure. On adapter launch rejection before a session exists, dispose preparation-owned resources when the governing launcher contract establishes that no process tree remains. Cleanup is idempotent. Broad `pkill AutoByteus`, kill-by-port, `open -a`, root-child-only exit checks, or unconditional recursive deletion are forbidden.
- **DS-007 parent owner: `BaseServerManager`.** Start generation -> bind-probe selected port using `0.0.0.0`/exclusive semantics matching the backend default listener -> initialize selected server data -> platform spawn with port/data and no host -> poll loopback client health -> settle one ready/error event -> restart/stop only the stored child. This keeps listener and client meanings explicit through every lifecycle transition.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Logging | DS-001, DS-002, DS-005, DS-007 | Entry/application/server owners | Write diagnostics only after root selection | Cross-cutting observation | Import-time logger would break isolation |
| Local-file scheme registration | DS-001, DS-002, DS-005 | Thin entry | Register privileged scheme synchronously before app readiness | Electron timing requirement | Loading full protocol/application early reintroduces stateful imports |
| Updater policy | DS-001, DS-002 | `ElectronApplication` | Production only | Deterministic E2E and ordinary behavior preservation | A global updater would share state/side effects |
| Path safety/canonicalization | DS-002, DS-005 | Safe-root resolver/path applier | Project raw/protected paths without mutation, require/canonicalize existing root, then create only verified descendants | Prevents symlink-ancestor writes while satisfying `app.setPath` directory requirements | Create-then-realpath can mutate production before rejection |
| Launch-environment overlay | DS-002, DS-005, DS-007 | Preparation and existing platform managers | Preserve caller-provided values, allow caller/test extras, force the three isolation keys, and retain existing backend runtime overrides | Keeps isolation configuration explicit without changing credential policy | Allowlist/denylist or generic HOME/Codex redirection would expand scope and break existing provisioning |
| Platform spawn translation | DS-001, DS-002, DS-007 | `BaseServerManager` | Convert client endpoint/preserved-listener/data config to macOS/Linux/Windows child invocation while preserving established environment propagation | Executable layouts differ | Adapter-selected host/default or new credential policy would fragment authority |
| Browser-mode defaults | DS-003 | Renderer browser bootstrap | Preserve non-Electron runtime config | Electron and browser have different governing inputs | Generic fallback can leak production Electron URL |
| Process-tree cleanup | DS-006 | Common session and selected adapter | Adapter proves whole-tree exit through POSIX process-group or equivalent Windows tree control; Playwright close/rejection follows its verified launcher contract; targeted fallback never uses port/product name | Process ownership differs by adapter/OS and root deletion must not race live descendants | Root-child exit, port gating, product-name killing, or duplicated root policy is unsafe |
| Documentation | All | Delivery | Explain launch variables, command, default behavior, safety | Durable operator/tester contract | Stale docs could encourage build-time or `.env` misuse |

## Ownership Boundaries

Launch preparation crosses into process ownership through one single-use `PreparedElectronE2ELaunch`. It contains no process handle. The direct and Playwright adapters consume the same executable/args/environment/metadata, then expose adapter-specific process control behind a common E2E session. Neither adapter may allocate a new port/root or rebuild the child environment.

The spawn environment crosses into the application unchanged except for explicit values supplied by the caller/test and the three forced launch-profile isolation keys. `resolveElectronLaunchProfile` reads only those three keys, performs non-mutating safe-root resolution, and returns the canonical safe root; it does not enumerate, filter, copy, log, or reinterpret credential variables. Platform server managers continue using the established caller/application environment plus selected port/data and existing application-generated overrides. This preserves existing pnpm/import/application/server API-key/provider/Codex provisioning in both profiles.

The safe-root resolver, not the path applier, owns authorization to write. It lexically normalizes and non-mutatingly projects the selected and protected paths through their nearest existing ancestors, resolves every existing protected root, compares both lexical and projected/canonical forms, requires the selected root itself to exist as a real directory and not a symlink, then mints `ResolvedSafeE2EDataRoot`. The path applier accepts only that branded value and creates/verifies descendants. Services receive canonical paths rather than raw strings or calls back to `process.env`, `os.homedir()`, or product defaults.

The symlink-component policy is explicit: symlinks in an existing ancestor chain are resolved read-only and allowed only when the resulting projection is disjoint from every protected form; the selected root entry itself and every application-created/used descendant entry must not be a symlink. Missing selected roots are rejected without creation.

`ElectronApplication` owns lifecycle ordering and constructs the manager, registry operations, updater, browser runtime, and windows after configuration. It delegates backend process generations to `BaseServerManager`; platform subclasses only translate an injected configuration. The main registry owns the embedded node URL crossing into the renderer. Renderer code obtains Electron endpoints only through node/window binding; browser configuration remains a separate browser-only boundary.

The preparation/adapter/application boundaries are process-level. Preparation owns no process; the adapter owns the complete process group/tree established by its launch; the app shuts down only its own backend/browser children; the common session coordinates adapter close, whole-tree completion/escalation, owned-root disposition, and a separate port observation. A Playwright adapter closes its own `ElectronApplication` and fulfills the verified launcher-owned completion contract; a direct adapter controls its exact process group/tree. No layer sends generic kill commands, targets a process by port, deletes a caller-owned root, or uses ambient port occupancy as root-lifecycle authority.

### Caller-Environment Preservation Boundary

Preparation starts from a shallow copy of the caller-provided environment, optionally overlays caller/test-supplied `extraEnv`, and finally forces only the three isolation keys so they cannot be contradicted:

```ts
const childEnvironment = {
  ...sourceEnv,
  ...extraEnv,
  AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
  AUTOBYTEUS_ELECTRON_SERVER_PORT: String(selectedPort),
  AUTOBYTEUS_ELECTRON_DATA_ROOT: canonicalRoot,
}
```

No key is removed because it looks like a credential, provider selector, package-manager value, loader option, or home/configuration path. In particular, `CODEX_HOME`, API-key variables, and existing application/import/server provisioning inputs retain caller-defined behavior. `extraEnv` may supply credentials or fixture configuration when a test explicitly chooses to do so; only the three launch-profile keys are reserved by this boundary. The product does not log environment values or introduce a new credential-storage/provisioning path. External provider/Codex account or tool-owned home state is not reclassified as application-owned E2E data by this ticket.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `resolveElectronLaunchProfile(input)` | Env grouping, production defaults, port parsing, non-mutating safe-root resolution, immutable profile creation | Thin entry only | Downstream launch-env reads or raw root use | Add a typed profile/safe-root field, not another env/path read |
| `resolveExistingSafeE2EDataRoot(input)` | Lexical normalization, nearest-existing-ancestor projection, protected-root canonicalization, overlap checks, selected-root `lstat`/`realpath`, branded value | Launch preparation and profile resolver | `mkdir` before proof; raw string passed to applier/service/cleanup | Extend protected-path input or validation result |
| `applyElectronLaunchProfilePaths(app, profile)` | Verified descendant creation, no-symlink checks, `setPath`, `setAppLogsPath` | Thin entry only after safe-root resolution | Rechecking raw path or authorizing root creation | Extend the isolated descendant path plan |
| `buildElectronE2ELaunchEnvironment({ sourceEnv, extraEnv, launch })` | Caller-environment copy plus forced three-key isolation overlay | Launch preparation only | Credential allowlist/denylist, reserved-key override, main-process scrub, or generic HOME/config redirection | Add only another explicitly approved isolation key; credential policy remains out of scope |
| `ElectronApplication.start(profile)` / `.stop()` | Subsystem construction/order, windows, IPC, updater policy, failure cleanup | Thin entry | Module-level global lifecycle owners or credential/environment reinterpretation | Add an application-owned collaborator |
| `BaseServerManager` public lifecycle | Wildcard-equivalent port check, server-data init, no-host spawn, loopback health, restart/reset/stop | Status/application owners | Platform manager selects/passes host or reads global env/default | Add a specific launch-config field/method |
| Main node-registry functions with `activeEmbeddedBaseUrl` | Load/normalize/persist embedded and remote profiles | `ElectronApplication` registry coordination | Renderer/build default overwriting Electron embedded record | Correct registry contract/validation |
| `windowNodeContextStore` | Bound node/base URL and endpoint derivation | Renderer clients/composables/components | `getServerBaseUrl()` in Electron | Add a specific bound endpoint getter |
| `prepareElectronE2ELaunch(options)` | Exact artifact, listener-equivalent port, safe root, caller-environment overlay, metadata, single-use state | Direct/Playwright adapters and CLI | Adapter reallocates/rebuilds, filters environment, or directly spawns inside preparation | Extend prepared spec, not adapter/credential policy |
| `launchPreparedElectronDirect(prepared)` | Exact OS process-group/tree controller with affirmative whole-tree completion | Direct smoke callers | Root-child-only wait, Playwright attach emulation, or broad PID discovery | Extend the direct controller's owned-tree mechanics only |
| `launchPreparedElectronWithPlaywright(prepared, electronLauncher)` | `_electron.launch` mapping, `ElectronApplication`, and verified launcher-owned whole-tree completion | Renderer E2E callers | Pre-spawn then attach; speculative root retention after settled rejection; duplicate preparation | Extend the Playwright adapter only |
| `createElectronE2ESession(prepared, processTreeController)` | Readiness, idempotent whole-tree cleanup ordering, owned-root disposition, independent port diagnostics | Both adapters | Adapter deletes root; root exit/port state substitutes for tree completion; session signals by port/name | Extend the common session result/diagnostic contract |

## Dependency Rules

1. `main.ts` may statically import only Electron, the pure/shared client-endpoint/default model, launch-profile/safe-root/path/preflight modules, side-effect-free logger facade, and the isolated privileged-scheme registrar. It dynamically imports application code only after configuration succeeds.
2. Launch-profile modules may depend on Node path/fs/net primitives and shared client endpoint defaults; they may not import application services, renderer stores, server managers, or `.env` loaders.
3. Safe-root resolution is read-only. The selected directory must already exist. Only launch preparation may create an owned root, and only by `mkdtemp` under an already canonicalized, protected-root-disjoint temporary parent. The app path applier accepts only `ResolvedSafeE2EDataRoot`.
4. `ElectronApplication` may depend on application subsystems and the resolved profile; it may not parse launch values, select fallback ports/roots, or filter/reinterpret the caller environment.
5. Server-manager factory/subclasses must receive `EmbeddedServerLaunchConfig { clientEndpoint, listenerPolicy: 'preserve-backend-default', baseDataRoot }`. They must not import production active constants/canonical-home defaults or pass `--host`.
6. In both profiles, platform managers preserve their established caller/application environment propagation, then apply manager-required port/data variables and existing application-generated runtime overrides (for example the per-instance browser bridge token). E2E changes the selected values, not the credential/provisioning policy.
7. `AppDataService`, logger, extension service, browser runtime, and registry receive selected roots/client URLs. No in-scope Electron path owner may call the no-argument production path helper after profile resolution.
8. Main registry/status IPC sends the selected client base URL. Renderer code must not receive listener policy, the launch profile, environment, or data paths.
9. Electron renderer network paths depend on `windowNodeContextStore`. Browser-only code may use Nuxt runtime configuration. A generic utility may not silently decide between Electron and browser by returning `29695`.
10. Launch preparation creates a single-use `PreparedElectronE2ELaunch`; direct and Playwright adapters consume it without changing executable, arguments, environment, port, root, readiness URL, or ownership. Preparation never spawns; adapters never allocate.
11. The preparation environment builder copies the caller-provided environment, applies any caller/test `extraEnv`, and forces the three launch-profile keys last. It has no environment allowlist, credential denylist, special `CODEX_HOME` rule, or secret-seeding requirement.
12. The thin entry does not scrub or snapshot environment values. Platform managers retain existing environment propagation; environment values are not newly logged by this work.
13. No package/build script may bake E2E port/root into generated renderer assets, electron-builder config, app ID, or product name.
14. Each adapter must expose one whole-tree termination operation/result. The common session may dispose a preparation-owned root only after affirmative `OwnedProcessTreeCompletion`; it must retain the root and fail cleanup when the controller cannot prove the tree is gone. Root-child exit and port availability are insufficient substitutes.
15. Selected-port probing after owned-tree completion is observation only. An occupied result is returned/logged as `occupied-after-owned-tree-exit` without signaling the holder or vetoing root disposal. Listener preflight before application startup remains fail-closed and unchanged.
16. A launcher dependency accepted by the Playwright adapter must document or be verified to settle all spawned process cleanup before rejecting without an application handle. The installed `playwright-core@1.58.2` meets that contract; on such rejection the adapter disposes only preparation-owned resources and rethrows the original launch error.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveElectronLaunchProfile({ env, protectedPaths })` | Electron launch selection | Parse grouped profile and mint only validated final selection | Selector absent/`production`, or `e2e` plus port and `ResolvedSafeE2EDataRoot` | Unknown selector/stray values/nonexisting unsafe root fail |
| `projectCanonicalPathWithoutMutation(path)` | Candidate/protected location | Resolve deepest existing ancestor, realpath it, append missing suffix without writes | Absolute lexical path | Used for both candidate and every protected root, including symlinked protected roots |
| `resolveExistingSafeE2EDataRoot({ selectedPath, protectedPaths })` | E2E root authorization | Compare lexical/projected/canonical overlaps, require existing real non-symlink directory, return branded canonical path | Raw absolute input -> `ResolvedSafeE2EDataRoot` | Non-existing input is rejected without creation; preparation creates owned roots first under safe temp parent |
| `applyElectronLaunchProfilePaths(app, profile)` | Electron mutable descendants | Create/verify children and apply `userData`, `sessionData`, logs, crash dumps, downloads before readiness | Profile containing `ResolvedSafeE2EDataRoot` | Production is a no-op for Electron defaults |
| `buildElectronE2ELaunchEnvironment({ sourceEnv, launch, extraEnv })` | E2E Electron child environment | Copy caller values, overlay explicit test values, force the three isolation keys | Caller environment plus explicit overlays | Credential/provider/Codex values preserved; only core isolation keys cannot be overridden |
| `assertEmbeddedServerListenerPortAvailable(port)` | Backend listener port | Bind-probe `0.0.0.0` with exclusive semantics matching current backend listener | Selected numeric port only | Used early and by manager; never changes host/picks another port |
| `configureElectronLogger(baseDataRoot)` | Main logging destination | Initialize logger exactly once after profile selection | Canonical production root or `ResolvedSafeE2EDataRoot` | Calls before configuration fail rather than guess |
| `ServerManagerFactory.createServerManager(config)` | Embedded backend lifecycle | Select OS adapter using explicit client/listener/data config | `{ clientEndpoint:{host:'127.0.0.1',port}, listenerPolicy:'preserve-backend-default', baseDataRoot }` | No singleton; adapter passes no host; established env behavior preserved |
| `ensureEmbeddedNode(snapshot, activeClientBaseUrl)` | Embedded registry record | Add/normalize only embedded node to active application URL | Registry snapshot + normalized loopback client base URL | Remote-node identities untouched |
| `ServerStatusSnapshot` IPC | Embedded backend observation | Carry status/message/health and authoritative client `baseUrl` | One embedded backend per app process | Renderer derives URLs/port; listener details stay main-only |
| `prepareElectronE2ELaunch(options)` | Pre-process launch resources | Prepare exact artifact/port/root/env/metadata and claim/dispose lifecycle | Existing caller root or owned `mkdtemp` root; current worktree artifact | No process handle; single-use |
| `OwnedElectronProcessTreeController.closeAndConfirmTree(options)` | Adapter-owned process lifecycle | Graceful close, bounded whole-tree wait, targeted force escalation, affirmative completion or actionable failure | Direct OS process group/tree or verified Playwright application/tree | Success means every owned descendant is absent; root-child exit alone cannot succeed |
| `launchPreparedElectronDirect(prepared)` | Direct packaged process | Spawn exact child in a controllable OS group/tree and return common session with whole-tree controller | One unclaimed prepared launch | POSIX uses exact process-group identity; Windows uses an equivalent controller that can verify the launched descendant tree |
| `launchPreparedElectronWithPlaywright(prepared, electronLauncher)` | Playwright-controlled packaged process | Map prepared values into `_electron.launch` and return session plus `ElectronApplication` and whole-tree controller | One unclaimed prepared launch | Uses `process()`, `firstWindow()`, `close()`; no attach; settled rejection disposes owned root |
| `createElectronE2ESession(prepared, processTreeController)` | Common E2E lifecycle | Readiness plus idempotent cleanup: confirm owned tree, dispose/retain root from that result, then report port observation independently | One claimed prepared launch and one adapter-owned controller | Never signals by port/name; `occupied-after-owned-tree-exit` is diagnostic, not a cleanup veto |
| `pnpm test:e2e:electron [-- --skip-build]` | Real packaged E2E execution | Build by default, prepare once, select adapter required by probe | Current worktree | API/E2E extends journeys through preparation/adapters |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Launch-profile resolver | Yes | Yes | Low | Discriminated union; raw root must be converted by safe-root owner |
| Safe-root resolver | Yes | Yes | Low | Read-only projection plus existing canonical directory requirement |
| Path applier | Yes | Yes | Low | Accept branded root only; never authorize selected-root creation |
| Launch-environment overlay | Yes | Yes | Low | Caller environment remains authoritative except for the three forced isolation keys; no product credential policy |
| Application lifecycle | Yes | Yes | Low | One profile/environment per process |
| Server factory | Yes | Yes | Low | Client endpoint and listener policy named separately; required env |
| Registry normalizer | Yes | Yes | Low | Active client URL mandatory |
| Status IPC | Yes | Yes | Low | Typed client URL; no listener leakage |
| Prepared launch | Yes | Yes | Low | Single-use resources without process handle |
| Direct/Playwright adapters | Yes | Yes | Low | Each owns its process API and must produce whole-tree completion; common session owns readiness/root disposition/port diagnostics |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Startup selection | `ElectronLaunchProfile` | Yes | Low | Use `production`/`e2e`; prohibit “runtime profile” naming |
| Client routing address | `EmbeddedServerClientEndpoint` | Yes | Low | Host means loopback client/advertised host only |
| Listener behavior | `EmbeddedServerListenerPolicy: 'preserve-backend-default'` | Yes | Low | Do not expose host or call it an endpoint |
| Selected root authority | `ResolvedSafeE2EDataRoot` | Yes | Low | Branded canonical value; no raw `runtimeDataDir` alias |
| Prepared resources | `PreparedElectronE2ELaunch` | Yes | Low | Must not contain a process/application handle |
| Adapter-owned execution | `DirectElectronProcessController` / `PlaywrightElectronProcessController` | Yes | Low | Common session composes rather than merges meanings |
| Main lifecycle | `ElectronApplication` | Yes | Low | Keep `main.ts` thin |
| Renderer routing | `windowNodeContextStore` | Yes | Low | Preserve owner; remove global “active server” naming |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Production client endpoint defaults/formatting | Shared embedded-server config | Extend | Correct loopback client values exist; name separately from listener | N/A |
| Listener bind policy | Backend CLI default + manager port probe | Extend | Preserve backend `0.0.0.0` and current no-`--host` adapter behavior | N/A |
| AutoByteus descendant paths | `electron/appDataPaths.ts` | Extend | Existing helpers derive server/log/extension descendants | N/A |
| Canonical safe-root proof | None | Create New | Existing helpers are lexical/default-only and cannot authorize mutation | Needs read-only projection and branded result |
| Backend lifecycle | `BaseServerManager` and platform subclasses | Extend | Lifecycle remains owner once client/listener/env config is explicit | N/A |
| Renderer endpoint propagation | Registry/preload/node/window-context spine | Extend | Already the governing dynamic routing path | N/A |
| Early launch-profile selection | None | Create New | No current owner can validate the three isolation keys before stateful imports | Existing server/path helpers are late/partial; credential policy is not part of this owner |
| Main lifecycle ownership after thin entry | Current `main.ts` coordination | Create New | Need a constructible owner behind package entry | Existing file is also statically stateful transport |
| Packaged resource preparation | Backend-only verifier allocation patterns | Create New | Existing verifier is Node-mode and coupled to its own process | Shared preparation must serve two adapters |
| Direct process control | Node child-process APIs | Create New | Exact PID/process-group smoke control | Playwright cannot attach to this process |
| Playwright process control | Existing `playwright-core` Electron API | Extend | `_electron.launch` is required to obtain `ElectronApplication` | Adapter isolates compatibility/details from preparation |
| Browser defaults | Nuxt runtime config/current helper | Extend | Browser behavior remains legitimate but browser-scoped | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron launch profile | Three-key env contract, safe-root proof, descendant path application, listener-equivalent preflight | DS-001, DS-002, DS-005 | Thin entry | Create New | Earliest read-only authorization then controlled side effects; unrelated env untouched |
| Electron application | Main lifecycle, failure/normal shutdown, updater policy | DS-001, DS-002, DS-004 | `ElectronApplication` | Create New from current main coordination | Preserve package entry and environment behavior separately |
| Embedded server | Client endpoint, preserved listener, injected env/data, spawn/readiness/restart/status | DS-001, DS-002, DS-004, DS-007 | `BaseServerManager` | Extend | Platform adapters pass no host |
| Node routing | Main registry, preload, renderer registry/window binding | DS-003, DS-004 | Registry and window-context owners | Extend | No second renderer config channel |
| Logging/path capabilities | Deferred logging and safe descendant paths | DS-001, DS-002, DS-005 | Entry/application services | Extend | No import-time/root-authorization writes |
| E2E launch preparation | Worktree artifact, port, root, safe env, metadata, single-use claim | DS-002, DS-006 | Both process adapters | Create New | No process creation |
| E2E process adapters/session | Direct child and Playwright application whole-tree control; common readiness/root disposition/port diagnostics | DS-002, DS-006 | E2E callers | Create New | Adapter-specific tree completion behind common session; port state is never ownership |
| Browser runtime configuration | Browser-only build/runtime defaults | DS-003 | Browser bootstrap | Extend | Must not act as Electron fallback |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `shared/embeddedServerClientEndpoint.ts` | Shared client endpoint | Client endpoint value/default | Loopback host/port type, production default, URL formatting | One client-routing subject, no listener meaning | Yes |
| `electron/launch-profile/electronLaunchProfile.ts` | Launch profile | Resolver/type | Exact env keys, discriminated selection, safe-root field | One startup selection | Client endpoint + safe root |
| `electron/launch-profile/e2eDataRootSafety.ts` | Launch profile | Safe-root resolver | Non-mutating projection, protected comparisons, existing-root branding | Root authorization is distinct from descendant application | `ResolvedSafeE2EDataRoot` |
| `electron/launch-profile/electronLaunchProfilePaths.ts` | Launch profile | Path applier | Verified descendant plan/creation and Electron path APIs | Side effects only after safe-root authorization | Safe root/profile |
| `electron/launch-profile/e2eLaunchPreflight.ts` | Launch profile | Listener preflight | IPv4 wildcard/exclusive availability check | Network concern stays out of parser | Selected port/listener contract |
| `electron/server/embeddedServerLaunchConfig.ts` | Embedded server | Launch config | Client endpoint, preserved listener literal, base root | Semantically separates advertised client from listener | Client endpoint |
| `electron/application/electronApplication.ts` | Application | Lifecycle owner | Construct/start/stop subsystems and profile policies | One governing lifecycle subject | Profile/server config |
| `electron/logger.ts` | Logging | Configured logger | No-I/O-before-config facade and scoped children | Existing canonical import | Safe base root |
| Registry/store/renderer files | Node routing | Registry/window context | Propagate selected client URL and remove fallbacks | Existing subsystem owns behavior | Snapshot/endpoint types |
| `scripts/electron-e2e/electronE2EEnvironment.mjs` | E2E preparation | Child env overlay | Copy caller env, apply caller/test extras, force three isolation keys | Reused by all adapters through preparation | No credential policy |
| `scripts/electron-e2e/electronE2ELaunchPreparation.mjs` | E2E preparation | Prepared resource | Artifact, wildcard port, safe root, env, metadata, claim/dispose | No process creation | Environment + safe-root algorithms |
| `scripts/electron-e2e/directElectronProcessAdapter.mjs` | E2E execution | Direct adapter | Exact spawn and OS-specific owned-tree controller | Direct-only process API and group/tree identity | Prepared launch/session |
| `scripts/electron-e2e/playwrightElectronProcessAdapter.mjs` | E2E execution | Playwright adapter | `_electron.launch`, `ElectronApplication`, verified close/rejection and owned-tree controller | Playwright-only process API | Prepared launch/session |
| `scripts/electron-e2e/electronE2ESession.mjs` | E2E execution | Common session | Readiness, whole-tree completion orchestration, owned-root disposition, separate port diagnostics | Shared across process adapters | Prepared metadata/controllers |
| `scripts/run-electron-e2e.mjs` | E2E support | CLI | Optional build then select coverage adapter | Thin command wrapper | Preparation/adapters |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Client host/port/base URL | `shared/embeddedServerClientEndpoint.ts` | Shared client endpoint | Main, Nuxt defaults, registry and tests need identical client formatting | Yes | Yes | Backend listener configuration |
| Listener/client/data server launch contract | `electron/server/embeddedServerLaunchConfig.ts` | Embedded server | Manager and adapters require one explicit immutable shape while existing environment behavior stays outside the config | Yes | Yes | A launch-profile host or credential-policy selector |
| Canonical root authorization | `e2eDataRootSafety.ts` | Launch profile | Preparation and app must apply identical non-mutating proof | Yes | Yes | A helper that creates before validating |
| Launch selection/path plan | `electronLaunchProfile.ts` | Launch profile | All main owners need one immutable selection | Yes | Yes | A bag of optional raw strings |
| Caller-environment overlay | `scripts/electron-e2e/electronE2EEnvironment.mjs` | E2E preparation | Both process adapters need identical caller/test overlay and forced isolation keys | Yes | Yes | Credential allowlist/denylist or backend environment replacement |
| Server status IPC payload | `types/serverStatus.ts` | Node/server contract | Main/preload/renderer need one typed payload | Yes | Yes | Listener policy or redundant editable port/URL fields |
| Renderer endpoint derivation | Existing `utils/nodeEndpoints.ts` | Node routing | Clients need consistent surfaces from client base URL | Yes | Yes | A place to choose active Electron URL |
| Prepared resources and common cleanup | `electronE2ELaunchPreparation.mjs` + `electronE2ESession.mjs` | E2E support | Direct and Playwright paths share resources/readiness and ownership-based root disposition | Yes | Yes | A process-specific handle, port-based cleanup authority, or broad cleanup singleton |
| Adapter-owned process-tree completion | Direct/Playwright controller shapes behind `electronE2ESession.mjs` | E2E execution | Both adapters must prove the same semantic outcome despite different process APIs | Yes | Yes | A root-child-only `waitForExit` boolean or PID/name/port guessing API |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `EmbeddedServerClientEndpoint { host, port }` | Yes | Yes | Low | `host` is loopback client/advertised host only; listener policy is separate |
| `EmbeddedServerLaunchConfig` | Yes | Yes | Low | Literal listener policy, one client endpoint, and one root; no environment-policy field |
| `ResolvedSafeE2EDataRoot` | Yes | Yes | Low | Only safe-root owner can mint; store canonical path once |
| `ElectronLaunchProfile` union | Yes | Yes | Low | E2E variant requires safe root/client endpoint; production uses defaults |
| `ServerStatusSnapshot { status, baseUrl, ... }` | Yes | Yes | Low | Derive renderer endpoints; no listener detail |
| `PreparedElectronE2ELaunch` | Yes | Yes | Low | No PID/Application; exact single-use resource and ownership metadata |
| `OwnedProcessTreeCompletion` | Yes | Yes | Low | Affirmative success means the entire adapter-owned tree is absent; failure carries diagnostic ownership/termination detail and authorizes no root deletion |
| Direct/Playwright process controllers | Yes | Yes | Low | Common semantic `closeAndConfirmTree` result; specialized process/application handle and OS mechanics remain inside each adapter |
| `NodeProfile.baseUrl` | Yes | Yes | Low | Main owns embedded value; remote profiles remain registry-owned |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/shared/embeddedServerClientEndpoint.ts` | Shared client endpoint | Client model | Production loopback default and base-URL formatting | One client subject | Canonical shared structure |
| `autobyteus-web/electron/launch-profile/electronLaunchProfile.ts` | Launch profile | Resolver/type | Approved env names, grouped validation, immutable union | Pure selection concern | Client endpoint/safe root |
| `autobyteus-web/electron/launch-profile/e2eDataRootSafety.ts` | Launch profile | Safe-root owner | Read-only projection/canonical comparison and branded existing root | Central safety invariant | Protected path structures |
| `autobyteus-web/electron/launch-profile/electronLaunchProfilePaths.ts` | Launch profile | Path applier | Verified descendants and Electron path APIs | Side effects after proof | Launch profile |
| `autobyteus-web/electron/launch-profile/e2eLaunchPreflight.ts` | Launch profile | Preflight | `0.0.0.0`/exclusive availability | Matches listener | Port |
| `autobyteus-web/electron/main.ts` | Package transport | Thin entry | Strict safe-root/path/logger/preflight/dynamic-load order | Stable package entry | Launch boundaries |
| `autobyteus-web/electron/application/electronApplication.ts` | Application | Governing owner | Configured lifecycle and production/E2E policies | One application lifecycle | Profile |
| `autobyteus-web/electron/local-file-protocol/register-local-file-scheme.ts` | Local-file protocol | Early registrar | Privileged scheme without stateful imports | Must run before readiness | Scheme constant |
| `autobyteus-web/electron/logger.ts` | Logging | Configured logger | Explicit root; no import-time file I/O | Existing capability | Safe root/path helpers |
| `autobyteus-web/electron/appDataPaths.ts` | Paths | Pure path derivation | Production default plus generic descendants | One path policy | Profile supplies root |
| `autobyteus-web/electron/server/embeddedServerLaunchConfig.ts` | Embedded server | Config contract | Client endpoint, preserved listener, base root/env | Separates meanings | Client endpoint |
| `autobyteus-web/electron/server/baseServerManager.ts` | Embedded server | Governing owner | Injected config across preflight/spawn/health/restart | Existing owner | Launch config |
| `autobyteus-web/electron/server/serverManagerFactory.ts` and platform managers | Embedded server | Thin adapters | Required config translation, no singleton/host/global-env read | Existing platform allocation | Launch config |
| `autobyteus-web/electron/server/services/AppDataService.ts` / `serverRuntimeEnv.ts` | Server data/env | Provider | Injected root/client URL with established environment/provisioning behavior | Existing service | Launch config |
| `autobyteus-web/electron/server/serverStatusManager.ts`, `autobyteus-web/types/serverStatus.ts` | Status | Status owner/shared type | Typed client `baseUrl` status | Main/renderer contract | Endpoint derivation |
| `autobyteus-web/electron/nodeRegistryStore.ts` | Node routing | Registry | Require active client URL | Existing persistence | Node types |
| `autobyteus-web/electron/preload.ts`, `electron/types.d.ts` | IPC | Thin bridge | Typed registry/status only | Security boundary | Shared types |
| Renderer routing/store/consumer files from investigation | Renderer | Window-bound owners/callers | Trust main, derive bound endpoints, preserve browser/remote | Existing spine | Node endpoints |
| `autobyteus-web/scripts/electron-e2e/electronE2EEnvironment.mjs` | E2E preparation | Env overlay | Preserve caller/test values and force three isolation keys | One launch-environment concern | Launch metadata |
| `autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs` | E2E preparation | Prepared resource | Artifact/port/root/env/claim/dispose | No process | Safe root/env |
| `autobyteus-web/scripts/electron-e2e/directElectronProcessAdapter.mjs` | E2E execution | Direct controller | Exact `child_process` launch plus OS-specific owned-group/tree close, wait, escalation, and completion | Adapter-specific | Preparation/session |
| `autobyteus-web/scripts/electron-e2e/playwrightElectronProcessAdapter.mjs` | E2E execution | Playwright controller | `_electron.launch`/`ElectronApplication`, settled rejection disposal, owned-tree completion | Adapter-specific | Preparation/session |
| `autobyteus-web/scripts/electron-e2e/electronE2ESession.mjs` | E2E execution | Common session | Readiness, idempotent tree-completion cleanup, root disposition, independent port observation | Shared controller composition | Prepared metadata + `OwnedProcessTreeCompletion` |
| `autobyteus-web/scripts/run-electron-e2e.mjs`, `package.json` | E2E command | CLI | Build-by-default/`--skip-build` and adapter selection | Thin CLI | Preparation/adapters |
| Focused unit/integration tests adjacent to owners | Verification | Implementation checks | Safe-root/symlink, env sentinel, listener, manager, registry/status/renderer contracts | Tests follow ownership | Fixtures |
| `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` (subject to API/E2E coverage investigation) | Durable packaged coverage | API/E2E | Direct coexistence plus Playwright renderer path, parallelism, invalid config, cleanup | Real shell evidence | Preparation/adapters |

## Applied Patterns (If Any)

- **Thin entry + governing application owner:** `main.ts` enforces safe-root/path/preflight order; `ElectronApplication` owns ongoing lifecycle without credential-policy changes.
- **Branded authority value:** `ResolvedSafeE2EDataRoot` is the only value allowed to authorize descendant writes or owned-root cleanup.
- **Discriminated configuration union:** E2E-only values cannot exist as optional partial production fields.
- **Prepared resource + strategy adapters:** One single-use prepared launch composes with direct or Playwright process control without duplicating allocation/safety logic.
- **Dependency injection:** Server/data/registry owners receive client/listener/root values rather than reading active defaults; established environment propagation remains unchanged.
- **Single renderer routing spine:** Main registry and window context remain the one active client-endpoint path.
- **Common session controller:** Adapter-specific whole-tree close mechanics sit behind shared readiness and idempotent cleanup; owned-tree completion governs root disposition while port observation remains diagnostic.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/shared/embeddedServerClientEndpoint.ts` | File | Shared client model | Loopback production default and client URL formatting | Used by Electron/Nuxt without listener ambiguity | Listener host selector, env reads, mutable singleton |
| `autobyteus-web/electron/launch-profile/` | Folder | Launch-profile subsystem | Three-key resolution, safe root, controlled path effects, listener preflight | Makes early configuration depth visible | Windows, updater, backend process lifecycle, credential policy |
| `.../electronLaunchProfile.ts` | File | Resolver/type | Exact env contract and immutable union | Public selection boundary | Directory creation or raw environment forwarding |
| `.../e2eDataRootSafety.ts` | File | Safe-root owner | Non-mutating projection/canonical proof and branded value | Central invariant deserves isolated tests | `mkdir`, Electron APIs, cleanup |
| `.../electronLaunchProfilePaths.ts` | File | Path applier | Verified descendant creation and Electron path overrides | Effects occur only after safe-root proof | Root authorization or env parsing |
| `.../e2eLaunchPreflight.ts` | File | Listener preflight | IPv4 wildcard/exclusive port availability | Mirrors actual backend listener | Port selection/fallback or client routing |
| `autobyteus-web/electron/application/` | Folder | Main lifecycle | Configured application owner | Separates package transport from lifecycle | Raw launch env/root reads |
| `autobyteus-web/electron/server/embeddedServerLaunchConfig.ts` | File | Server config | Client endpoint, preserved listener, data root | Prevents client/listener conflation | Public host or credential-policy customization |
| `autobyteus-web/electron/server/` existing files | Folder | Embedded server | Injected lifecycle/status/platform adapters | Existing coherent capability | Host override or original env recovery |
| Renderer stores/plugins/utils | Existing modules | Node/window routing | Client endpoint binding and browser-only fallback | Existing healthy spine | Listener details or compiled Electron fallback |
| `autobyteus-web/scripts/electron-e2e/electronE2EEnvironment.mjs` | File | Preparation env overlay | Caller environment + explicit extras + forced three isolation keys | Shared before adapter choice | Credential filtering or reserved-key override |
| `autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs` | File | Prepared resource | Exact artifact, port, safe root, environment, metadata, claim/dispose | Process-neutral reusable core | `spawn`, `_electron.launch`, PID/Application handle |
| `autobyteus-web/scripts/electron-e2e/directElectronProcessAdapter.mjs` | File | Direct adapter | Exact child/PID controller | Direct smoke-specific | Resource allocation/root deletion |
| `autobyteus-web/scripts/electron-e2e/playwrightElectronProcessAdapter.mjs` | File | Playwright adapter | `_electron.launch` and `ElectronApplication` controller | UI journey-specific | Attach emulation/resource allocation |
| `autobyteus-web/scripts/electron-e2e/electronE2ESession.mjs` | File | Common session | Readiness and cleanup order | Shared across adapters | Broad process discovery or raw-root deletion |
| `autobyteus-web/scripts/run-electron-e2e.mjs` | File | CLI | Build/skip-build and probe adapter selection | Thin stable command | Preparation duplication |
| `autobyteus-web/tests/e2e/` | Existing folder | Durable E2E coverage | Real packaged scenarios after coverage investigation | Existing coverage location | Duplicated preparation/adapter implementation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `electron/main.ts` | Transport | Yes | Low | Thin ordered package entry only |
| `electron/launch-profile/` | Main-Line Domain-Control with bounded path/env/preflight effects | Yes | Low | All files establish one safe startup boundary |
| `electron/application/` | Main-Line Domain-Control | Yes | Medium | Keep lifecycle-only and delegate focused services |
| `electron/server/` | Main-Line Domain-Control/Persistence-Provider mixed justified | Yes | Low | Existing manager/service/adapter split plus explicit config |
| Renderer stores/plugins | Main-Line Domain-Control | Yes | Low | Existing node/window ownership remains |
| `scripts/electron-e2e/` | Off-Spine Concern with internal strategy depth | Yes | Low | Preparation, adapters, and common session are distinct responsibilities but one capability |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Launch values | Preparation emits child-only `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, port `31001`, and an existing canonical temp root | Repository `.env`, build-time port, or `open -a AutoByteus` | One process owns values; installed app is never addressed |
| Existing symlink root | `lstat(selected)` says symlink -> reject before any child `mkdir` | `mkdir(selected/server-data)` -> `realpath(selected)` -> discover it points into production | Invalid input must not mutate before rejection |
| Missing child below symlink ancestor | Project `/tmp/e2e-alias/new` by realpathing nearest existing `/tmp/e2e-alias`; detect projected overlap with protected root; reject without creation | Recursive `mkdir` follows `/tmp/e2e-alias -> ~/.autobyteus` | Covers AR-F-001 reachable case |
| Safe owned root | Canonicalize/approve OS temp parent -> `mkdtemp(parent/autobyteus-e2e-)` -> resolve existing root -> mark `ownsDataRoot=true` | App accepts missing arbitrary path and creates it | Only preparation creates the selected root, in a proven safe parent |
| Bootstrap | Scheme register -> profile/safe-root resolve -> verified descendant paths -> logger -> wildcard port preflight -> dynamic application import; unrelated environment stays untouched | Stateful imports -> create root -> validate later, or scrub credentials during isolation bootstrap | No filesystem mutation precedes authorization and no out-of-scope credential policy is introduced |
| Listener/client split | `clientEndpoint={host:'127.0.0.1',port:31001}`; `listenerPolicy='preserve-backend-default'`; adapter passes `--port 31001` and no `--host`; preflight binds `0.0.0.0:31001` | Pass `--host 127.0.0.1` because the client URL is loopback | Preserves phone/security/listener behavior while clients remain local |
| Direct adapter | `prepared -> spawn exact executable in owned group/tree -> DirectElectronProcessTreeController -> common session` | Root-child-only `waitForExit` or monolithic allocator/spawner | Smoke path must prove all backend/Chromium descendants are gone, not only the root |
| Playwright adapter | `prepared -> _electron.launch({executablePath,env,args}) -> ElectronApplication + PlaywrightElectronProcessTreeController -> common session`; settled pre-handle rejection disposes an owned root | Direct-spawn first and attach later, or speculative owned-root retention after verified launcher cleanup | Playwright must own launch and its cleanup contract must govern process completion |
| Environment preservation | `{...sourceEnv,...extraEnv,threeForcedIsolationKeys}`; `CODEX_HOME` and non-secret API-key/provider sentinels reach Electron/backend unchanged; existing server overrides remain | Empty baseline, allowlist/denylist, main scrub, generic HOME/Codex redirection, or mandatory secret seeding | Isolation configuration does not redefine credential/provisioning behavior |
| Cleanup | Adapter graceful close -> confirm entire owned tree or targeted force that same tree -> delete preparation-owned root -> observe selected port diagnostically; if a foreign listener still binds it, report without signaling | `pkill AutoByteus`; wait only for root; wait for port before root deletion; adapter independently `rm -rf root` | Process identity governs root safety; port state has no ownership identity |
| Build semantics | `pnpm test:e2e:electron` builds current worktree; `--skip-build` reuses its exact artifact | `build:e2e` changes product identity or bakes one port | Release-equivalent artifact remains reusable |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old fixed exports as aliases after endpoint-file rename | Reduce import edits | Rejected | Update all importers; delete old file/exports |
| Support generic backend env aliases as Electron selectors | Existing backend recognizes some names | Rejected | Electron accepts only three grouped launch variables |
| Port-only/root-only override | Convenience | Rejected | E2E requires both and existing safe root |
| Create missing caller root before canonical validation | Convenience | Rejected | Caller root must exist; preparation creates only owned `mkdtemp` root under safe parent |
| Renderer fallback to compiled Electron URL | Keep UI reachable | Rejected | Electron bootstrap/unbound request fails; browser fallback explicit |
| Pass loopback client host as backend `--host` | One apparent host field | Rejected | Separate client endpoint and literal preserved listener policy; omit host |
| One direct launcher for smoke and UI | Fewer files | Rejected | Shared preparation + direct/Playwright adapters + common session |
| E2E credential allowlist/denylist and main/backend scrub | Architecture-review security expansion | Rejected by explicit user scope correction | Preserve caller/test environment and existing server provisioning; force only the three isolation keys |
| Separate E2E app identity/build profile | Visual distinction | Rejected | Same production-equivalent artifact plus launch profile |
| Preserve global server-manager singleton | Limit refactor | Rejected | Construct manager with explicit launch config |
| Application deletes any selected E2E root | Simplify cleanup | Rejected | Common session deletes only preparation-owned root |

## Derived Layering (If Useful)

`E2E caller -> launch preparation -> direct|Playwright process adapter -> common session -> thin Electron entry -> safe launch-profile boundary -> ElectronApplication -> server/registry/window owners -> preload -> renderer window context -> clients`.

Production starts at the thin entry and bypasses E2E preparation/adapters while preserving its established environment/listener/path policies. Safe-root proof, caller-environment overlay in preparation, path application, updater policy, platform spawn translation, and session cleanup remain off-spine under their named owners.

## Change / Refactor Sequence

1. Replace `embeddedServerConfig.ts` with the client-specific shared model. Add `EmbeddedServerLaunchConfig` with `listenerPolicy: 'preserve-backend-default'`; lock current `0.0.0.0` backend default/no-`--host` adapter behavior in focused contract tests.
2. Add safe-root projection/branding before any path effects. Tests cover existing safe root, selected-root symlink, missing root, missing descendant below symlink ancestor into production, protected root symlink, lexical/canonical ancestor/descendant/equality, filesystem root, and unchanged protected sentinels.
3. Remove the SR-002/implemented credential-sanitization expansion (`e2eLaunchEnvironment.ts`, allowlist/denylist, main scrub, sanitized backend base snapshot, generic HOME/config redirection, secret-seeding assertions). Make preparation copy caller env, apply `extraEnv`, and force the three isolation keys; preserve established platform-manager environment behavior. Add non-secret sentinel tests for API-key/provider variables and `CODEX_HOME` reaching Electron/backend unchanged.
4. Add launch-profile resolver/path/listener-preflight tests. The path applier accepts only `ResolvedSafeE2EDataRoot`; preflight and manager checks bind IPv4 wildcard/exclusive and never choose a replacement port.
5. Refactor logger to one-time explicit configuration with no import-time I/O; prove safe-module imports do not create/truncate canonical files.
6. Split the early privileged scheme registrar; convert `main.ts` to ordered entry: register -> resolve safe profile -> apply verified descendants -> configure logger -> listener preflight -> dynamic `ElectronApplication` load. Do not filter unrelated environment values.
7. Move lifecycle coordination into `ElectronApplication`; remove server singleton; inject explicit client/listener/root config through manager and AppDataService for start/readiness/status/restart/reset/shutdown while preserving established platform-manager environment propagation.
8. Update main registry/status/preload types to carry the active client URL. Make renderer trust main in Electron, remove compiled fallbacks, and update all listed consumers while preserving browser/remote behavior.
9. Construct/start updater only for production. In E2E, require backend readiness before opening the test window and run application-owned cleanup on partial failure.
10. Add process-neutral E2E preparation and its single-use resource. Then add direct and Playwright process adapters plus common readiness/cleanup session. Each adapter must prove whole-tree completion; common cleanup disposes an owned root from that proof and observes port state only diagnostically. The CLI builds by default or reuses current-worktree artifact with `--skip-build`.
11. Remove obsolete constants/imports, raw-root writers, create-then-realpath logic, zero-argument factory, host conflation, SR-002 credential/environment filters, root-child-only cleanup semantics, direct-only launcher boundary, renderer bypasses, and dead `isAppQuitting`. Run repository-wide shortcut audits.
12. Run implementation-scoped Electron/Nuxt/unit/integration checks. After code review, API/E2E owns coverage investigation and realistic direct/Playwright packaged execution; durable coverage edits reroute through code review per team policy.
13. Delivery documents client-versus-listener semantics, the three process launch variables, existing-root/preparation rule, preserved caller environment/provisioning behavior, direct/Playwright adapters, ownership-based cleanup, and exact command against integrated state.

No temporary dual behavior may remain after step 11.

## Key Tradeoffs

- **Existing-root requirement versus app-created arbitrary root:** Requiring an existing root makes authorization fully read-only and closes symlink-ancestor mutation. Preparation preserves convenience by atomically creating owned temp roots under a safe canonical parent.
- **Prepared resource plus two adapters versus one launcher:** More small files are required, but allocation/safety remains singular and Playwright can own process creation as its API requires.
- **Client endpoint plus preserved listener policy versus one host field:** The explicit split prevents accidental bind/security/phone-access changes while retaining one selected port.
- **Caller-environment preservation versus credential filtering:** Preserving the environment keeps real-provider E2E and existing server/API-key/Codex provisioning usable and respects ticket scope. Credential filtering could reduce ambient access but is a separate product/security policy requiring its own approved requirement; it is explicitly not implemented here.
- **Same artifact versus separate E2E build:** Same artifact maximizes production fidelity and per-worker reuse; early configuration supplies isolation.
- **Explicit port versus `port=0`:** Preparation reports deterministic metadata. The residual allocation race fails closed at both entry and manager checks.
- **Thin dynamic entry versus minimal patch:** The bootstrap seam is required to keep stateful imports after root/path authorization.
- **Owned-tree completion versus port-release gating:** Whole-tree identity requires adapter/OS-specific control, but it is the only sound authority for root disposal. A port probe is simpler but cannot distinguish an owned backend from a foreign race winner.
- **E2E backend-before-window versus production background startup:** E2E guarantees port/start failure before a test window; production remains responsive/current.
- **Browser-only fallback versus global convenience:** Explicit browser configuration prevents Electron from bypassing its window-bound client endpoint.

## Risks

1. **Filesystem TOCTOU:** Read-only canonical proof plus existing non-symlink root eliminates the reviewed create-before-check flaw. A malicious local actor could still swap ancestor entries between proof and descendant creation. Descendant `lstat`/`realpath` checks, preparation-owned private temp roots, restrictive permissions, and immediate fail-closed behavior reduce this; do not claim a hostile-local-user security boundary without descriptor-relative no-follow primitives.
2. **Electron path timing:** `sessionData` must be set before `ready`, and target directories must exist. Keep verified descendant creation/application synchronous after safe-root proof.
3. **Unseen mutable paths:** Audit Electron and AutoByteus home/default helpers, profile paths, persistent partitions, registry, extensions, artifacts, and backend descendants. Report OS-global state outside app control explicitly.
4. **Port allocation race:** The selected port can be taken after preparation. Both entry and manager use actual IPv4 wildcard listener semantics and fail closed without fallback. After owned-tree completion, an occupied port is reported as ambient/foreign-or-rebound state; it never blocks owned-root disposal or authorizes signaling.
5. **Playwright compatibility:** Current `playwright-core`/Electron/package layout requires downstream execution. The adapter boundary is valid even if a version adjustment is later needed; do not fall back to pre-spawn/attach.
6. **Environment scope regression:** A future security-minded change could reintroduce the rejected allowlist/denylist or redirect provider homes and silently break real-provider E2E. Lock caller-environment preservation and the absence of credential filtering in focused contract tests; route any future credential policy through a separate approved requirement.
7. **Cross-platform termination:** POSIX groups and Windows descendant termination differ. Controllers must return success only after the complete owned group/tree is absent; Playwright graceful close/direct owned-tree close precede targeted fallback. Never match product name or port.
8. **Renderer regression:** Browser, remote-node, attachment, and MCP paths need focused coverage after generic fallback removal.
9. **Future single-instance lock:** Such a change would invalidate parallel same-artifact operation; retain a guard/audit invariant.
10. **Code signing/OS launch behavior:** Direct adapter executes the exact binary; Playwright receives the exact executable path. Finder/`open -a` is unsupported because it can activate the installed app.

## Guidance For Implementation

- Treat the three approved launch variables as resolver-owned. Absence/explicit `production` is valid only with no E2E-only values; downstream modules never re-read them.
- Parse port strictly as base-10 `1024..65535`, reject `29695`, and expose no host input. `EmbeddedServerClientEndpoint.host` is always `127.0.0.1`. `listenerPolicy` is the literal `preserve-backend-default`; adapters pass no `--host`/host env. Both preflights try `net.createServer().listen({ host:'0.0.0.0', port, exclusive:true })` and close immediately on success.
- Implement read-only `projectCanonicalPathWithoutMutation`: normalize the absolute lexical path; walk upward using `lstat` to the nearest existing ancestor; require that ancestor be a directory or resolvable directory; `realpath` it; append missing suffix without touching it. Compute this for selected and protected roots and compare normalized lexical plus projected/canonical forms for equality and both ancestor directions.
- Canonicalize every existing protected root, including protected paths that are themselves symlinks. For a non-existing protected path, retain both lexical and projected forms so future creation remains protected.
- Ancestor symlinks are not rejected mechanically (for example, platform temp aliases can be legitimate); they are resolved and judged by their canonical projection. The selected root entry and its managed descendants are never allowed to be symlinks.
- The app-selected E2E root must already exist, be a directory, and have `lstat().isSymbolicLink() === false`; `realpath(selected)` must equal its precomputed projection and remain disjoint. Otherwise fail before logger/descendant creation. Only then mint/freeze `ResolvedSafeE2EDataRoot`.
- Preparation-created roots use `mkdtemp` under an existing canonical OS temp parent that was first checked disjoint from protected roots; then run the same safe-root resolver. Caller-supplied roots must pre-exist and are never marked owned. The app never creates/deletes the selected root.
- The path applier accepts only the branded root. For each required descendant, reject an existing symlink, create it only under the canonical root, then `realpath`/containment-check before the next write. Apply `userData`, `sessionData`, logs, crash dumps, and downloads before readiness; other app paths derive from the canonical root.
- The preparation environment builder returns `{ ...sourceEnv, ...extraEnv, threeForcedLaunchKeys }`. It does not filter `NODE_OPTIONS`, `ELECTRON_RUN_AS_NODE`, dynamic-loader variables, provider/API-key variables, `CODEX_HOME`, package-manager values, or generic HOME/config values. Any later desire to restrict those is a separate scope decision.
- `extraEnv` is explicit, copied by key/value, may contain the caller/test's existing credential or fixture inputs, and cannot override the three core launch keys because they are forced last. Never newly log environment values.
- In E2E, the thin entry reads only the three launch keys and does not scrub the rest of `process.env`. `ElectronApplication` does not carry a sanitized environment snapshot. Platform managers keep their pre-ticket environment construction and add the selected port/data plus existing application-generated per-instance overrides.
- Make logger configuration one-time; `logger.child()` may be no-I/O, while log calls before configuration fail clearly. Invalid profile/root fails through stderr/nonzero `app.exit`; a later valid-root failure may also log only under E2E root.
- Keep the privileged scheme registrar early and dependency-safe. Prove the static `main.ts` graph cannot write files or construct server/updater/application owners.
- Platform managers use the injected client URL for public URL/health/status/first-run config, use selected port/data for spawn, and omit host. `ServerStatusSnapshot` exposes client `baseUrl`, not listener policy.
- Electron renderer registry failure is a bootstrap error; no `29695` synthesis. Browser mode retains Nuxt default. Prefer explicit bound URL parameters over utilities that catch/fallback from Pinia.
- `PreparedElectronE2ELaunch` is single-use and contains exact `executablePath`, `args`, caller-derived `env` with forced isolation keys, port, canonical root, `ownsDataRoot`, client/health URLs, and claim/dispose state—never a PID or Playwright application.
- Direct adapter claims then `spawn`s the exact executable in a dedicated POSIX process group or an equivalent Windows controllable tree and retains that ownership identity. Graceful and forced paths poll/verify the whole group/tree until absent; a root-child `exit` event cannot produce `OwnedProcessTreeCompletion`. Playwright adapter claims then calls `_electron.launch({ executablePath, args, env })`, retains `ElectronApplication`, derives the root process via `.process()`, exposes `.firstWindow()`, closes via `.close()`, and uses the launcher/targeted fallback contract to confirm the whole owned tree. If adapter launch rejects before a session exists, dispose a preparation-owned root only when the verified launcher contract has already settled any spawned tree, then rethrow the primary error.
- The common session owns readiness and idempotent cleanup: graceful adapter close -> bounded whole-tree completion -> targeted force of the same owned tree if needed -> delete the root only when `ownsDataRoot` and completion is affirmative -> observe selected-port availability diagnostically. If tree completion is unconfirmed, retain the owned root and fail cleanup. A foreign/rebound port holder is never signaled and never vetoes owned-root disposal. Adapters do not independently delete roots except on pre-session launch rejection under a verified no-live-tree contract. Caller-owned roots are retained.
- `pnpm test:e2e:electron` builds current host artifact by default; `--skip-build` reuses only current-worktree artifact unless an exact path is supplied. No `:packaged` suffix or build profile.
- Implementation checks include Electron `--run`, focused Nuxt/Vitest `--run`, safe-root symlink fixtures, caller-environment preservation sentinels, listener/no-host contracts, direct/Playwright adapter unit contracts including foreign-port and delayed-descendant cleanup, TypeScript transpilation, and build boundary. API/E2E later owns realistic packaged execution/coverage.
- Before handoff, audit for: old endpoint config; `FIXED_SERVER_PORT`; singleton manager; raw E2E root passed beyond resolver; `mkdir` before safe-root proof; `--host`; client/listener name conflation; E2E allowlists/denylists/scrubbers or `CODEX_HOME` special cases; direct-spawn-only preparation; root-child-only cleanup; port-gated root disposal; Electron compiled URL fallback; downstream launch-env reads.
