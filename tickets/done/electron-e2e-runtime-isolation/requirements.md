# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — approved by the user on 2026-08-20 for design production.

## Goal / Problem Statement

Enable the real packaged Electron application to run as an explicitly isolated E2E instance while an ordinary AutoByteus Electron instance is already running. The isolated instance must use a separate embedded-backend port and a separate root for all AutoByteus/Electron mutable state, must route its renderer to that selected backend, and must be safe to start and clean up without reading, overwriting, resetting, stopping, or otherwise disturbing the ordinary application. Ordinary packaged launches must retain today's production defaults. This ticket changes instance isolation only; it must preserve the existing caller-provided environment and server/API-key/provider/Codex credential-provisioning journey.

The capability should be launch-time configurable so one packaged artifact can be reused across E2E runs and parallel workers. Building a fresh artifact before a run remains supported, but choosing another port or data root must not require source edits or another rebuild.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | An ordinary packaged Electron launch starts its embedded backend on port `29695`; the backend keeps its current wildcard listener policy while Electron advertises/calls it through `127.0.0.1:29695`. It uses the canonical `~/.autobyteus` state root plus Electron's product-named `userData` directory. | Ordinary launch behavior remains the default when no explicit E2E profile is selected. | Existing listener policy, loopback client URL, port, data paths, stored production data, environment behavior, and normal auto-update behavior remain unchanged. | R-001, R-006; AC-001, AC-011 |
| BEH-002 | There is no supported packaged-Electron launch contract for an alternate backend port. If `29695` is occupied, startup waits and fails. | An explicit E2E launch profile requires a caller-selected non-default port and can start successfully while `29695` is occupied. | The backend retains its current listener-bind policy and Electron remains a loopback client; this work does not add host selection. | R-001, R-002, R-003; AC-002, AC-003 |
| BEH-003 | Backend DB/config/download/memory/skills/workspaces, Electron logs/extensions/browser artifacts, Chromium profile/session state, local storage, and the main-process node registry resolve from ordinary production paths; Electron and backend children receive the caller-provided environment through the existing launch/provisioning flow. A failed second launch can touch shared paths before the port collision is reported. | An E2E launch requires one isolated absolute data root from which every application-owned mutable path, including Electron `userData`/session state, is derived before any path-owning service writes data. The launcher overlays only the E2E isolation inputs on the caller-provided environment; application/server credential handling remains unchanged. | Production data remains directly usable in place with no schema migration or relocation. Existing server/API-key/provider/Codex environment inheritance and provisioning behavior remains unchanged in both profiles. | R-002, R-003, R-004, R-007, R-009; AC-004, AC-005, AC-006, AC-008, AC-014 |
| BEH-004 | Main-process server launch and parts of renderer routing/status use the compiled `29695` default. The main-process node registry also rewrites the embedded node to that compiled URL. | The selected port is authoritative for backend launch under the unchanged listener policy; its loopback base URL is authoritative for health/readiness, status IPC, embedded-node registry state, and all renderer HTTP/WebSocket traffic. | Remote-node routing, browser/non-Electron runtime configuration, and backend listener-host behavior remain unchanged. | R-003, R-005; AC-003, AC-004 |
| BEH-005 | There is no project-supported packaged-Electron isolation helper that allocates/reserves test resources, reports the selected launch configuration, and cleans up only test-owned resources. | Reusable process-neutral E2E preparation produces an available non-default port, unique safe data root, caller-environment-preserving launch inputs, exact executable inputs, and machine-readable metadata that either a direct or Playwright process adapter can consume once; a common session confirms completion of the adapter-owned process tree, treats ambient port state only as diagnostic evidence, and cleans up only owned resources. | The desktop application itself never recursively deletes an arbitrary caller-supplied root on exit, and the E2E helper does not redefine credential or server environment policy. | R-007, R-008; AC-007, AC-009, AC-014 |
| BEH-006 | Packaged startup has no grouped validation for test-only port/data overrides and therefore no fail-closed protection against partial isolation. | Partial, malformed, unsafe, or conflicting E2E configuration fails before opening a window, starting the backend, or touching production mutable state; there is no fallback to production paths in E2E mode. | An ordinary launch with no E2E selector remains valid. | R-002, R-009; AC-008 |
| BEH-007 | Every packaged instance schedules the normal startup update check. | Explicit E2E mode suppresses automatic update checks/installation side effects so a test run is deterministic and cannot act as a production updater. | Ordinary packaged launch auto-update behavior remains unchanged. | R-010; AC-010 |

## Investigation Findings

- The embedded host/port are compiled constants in `autobyteus-web/shared/embeddedServerConfig.ts`; the current port is `29695`.
- `BaseServerManager` initializes `serverPort`, `serverUrl`, and the backend data service from fixed defaults during module/singleton initialization. Its startup path waits for `29695` to become free and fails after the timeout if another app owns it.
- Every platform manager passes the same fixed port via CLI and environment and passes `~/.autobyteus/server-data` as `--data-dir`.
- The base AutoByteus root is fixed by `getCanonicalBaseDataPath()` to `~/.autobyteus`. It governs backend state, Electron logs, extensions, and browser artifacts.
- Electron/Chromium uses a separate product profile through `app.getPath('userData')`. That directory contains cache, cookies, IndexedDB/local storage, persistent browser partitions, updater state, and the node registry, so changing only the backend data directory would not provide full isolation.
- The main-process logger and server-manager singleton are created during static module evaluation. The logger opens/truncates its log file and the server manager initializes data directories before `bootstrap()`, so isolation must be resolved before those imports/owners are instantiated.
- Renderer traffic is partly correctly bound through `windowNodeContextStore`, but `serverConfig.ts`, the renderer embedded-node fallback, the Electron node-registry normalizer, server status display state, and several call sites still treat compiled defaults as runtime authority. A backend-only port override would therefore launch the server on one port while some renderer behavior continued targeting `29695`.
- The running local packaged app was observed listening on `*:29695`; its child command includes `--port 29695 --data-dir /Users/normy/.autobyteus/server-data`, and its Chromium helpers include `--user-data-dir=/Users/normy/Library/Application Support/autobyteus`.
- No `requestSingleInstanceLock()` call exists in the Electron source. Distinct backend port and application/session data paths are the material in-repository concurrency requirements; a separately branded/bundle-ID E2E build is not required for direct executable/Playwright launch.
- A prior API/E2E triage artifact independently records that no supported alternate packaged-app port/data launch exists and that this prevents reliable second-instance testing.

## Relevant Supplemental Task Artifacts

None. The launch contract is kept in this requirements doc and is projected into the design spec.

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: Production defaults currently act as runtime authority across process launch, filesystem ownership, registry normalization, and renderer routing; stateful owners are instantiated before an isolated runtime can be selected. Several renderer call sites bypass the already-established window-bound node context.
- Requirement or scope impact: The change cannot be implemented safely as one environment-variable read in the platform launcher. It needs one early validated Electron launch profile, injection into every path/endpoint owner, removal of compiled-default runtime bypasses, and a supported E2E launch boundary.

## Recommendations

1. Prefer one packaged artifact plus an explicit `e2e` launch profile over baking a port/data directory into a special build. This supports fresh builds, repeated runs, and parallel workers without rebuilding for every port.
2. Keep production defaults as defaults only. Resolve and validate one immutable Electron launch profile before importing/constructing the logger, server manager, updater behavior, registry, windows, or persistent sessions.
3. Require both an explicit non-default port and an explicit absolute isolated data root in E2E mode. Do not permit partial overrides or silently fall back to production values.
4. Derive backend state, Electron-owned AutoByteus state, Chromium `userData`/`sessionData`, registry/local storage, persistent browser partitions, and diagnostic artifacts from the one E2E root.
5. Keep main process runtime state authoritative and propagate its selected embedded base URL through the existing node-registry/status IPC path. Renderer traffic should use the window-bound node context rather than compiled Electron constants.
6. Let the reusable E2E helper choose an available port and temporary root by default, while the application contract consumes explicit resolved values. This keeps port allocation/test cleanup in the test owner rather than hiding nondeterministic allocation inside product startup.
7. Disable packaged auto-update activity in E2E mode.
8. Do not introduce a separately installed `AutoByteus E2E` product identity in this scope. The direct packaged executable can run concurrently because the application does not claim a single-instance lock; runtime/profile isolation is the actual requirement.
9. Preserve the existing caller-environment and credential-provisioning journey. The E2E helper should add only the launch-profile isolation inputs needed by this ticket; credential policy belongs to the existing server/application flows, not this launcher.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

The change crosses Electron entry/bootstrap order, backend process management on three platforms, filesystem/profile ownership, main-to-renderer configuration propagation, renderer endpoint consumers, package/runtime verification, and reusable E2E setup. It does not change backend schemas or business capabilities.

## In-Scope Use Cases

- **UC-001 — Ordinary packaged launch:** A user launches AutoByteus with no E2E selector and receives the existing production runtime behavior.
- **UC-002 — Isolated packaged E2E launch:** A test launches a freshly built or existing packaged executable while the ordinary app/default port is already active, using a distinct backend port and distinct data root. The ordinary user application remains running and usable.
- **UC-003 — Renderer-in-Electron validation:** A test drives or inspects the real packaged renderer and all its HTTP/WebSocket traffic reaches the isolated embedded backend.
- **UC-004 — Parallel isolated launches:** Two E2E workers launch the same packaged artifact with different ports and roots without sharing application state or stopping one another.
- **UC-005 — Invalid E2E configuration:** A partially or unsafely configured E2E launch exits early with an actionable diagnostic and no production-path fallback.
- **UC-006 — Test-owned cleanup:** The E2E harness stops only its own process tree and removes only roots it created; caller-provided roots are retained unless the caller explicitly owns their cleanup.
- **UC-007 — Existing credential/provisioning journey:** A developer or API/E2E run launches Electron with its normal caller-provided environment and continues using existing pnpm/import/application/internal-server API-key/provider/Codex provisioning without a new filter or setup path from this ticket.

## Out of Scope

- Changing the ordinary production port, canonical `~/.autobyteus` root, Electron product profile, or auto-update behavior.
- A general end-user settings UI for selecting the embedded port or data root.
- A separately installed/branded E2E application, alternate bundle ID/app ID, alternate signing identity, or separate release/update channel.
- Automatic dynamic-port discovery inside the production Electron process. Port selection belongs to the E2E support boundary; the app receives an explicit resolved port.
- Changing backend bind-host/security policy, remote-node behavior, Docker routing, authentication, or phone access.
- Defining the business-domain E2E scenarios that later tests will run after the isolated Electron instance is available.
- Copying production user content, databases, extensions, browser profiles, or stored credential files into an E2E root. This ticket adds no copying mechanism; it also does not filter the existing caller-provided environment.
- Automatic deletion by the application of an arbitrary data root supplied by a caller.
- Any change to API-key, provider, search, Codex, or other credential handling; any environment allowlist/denylist or `CODEX_HOME` policy; any new secret-seeding requirement; and any change to existing pnpm/import/application/server credential-provisioning flows.

## Scope Guardrail

This ticket isolates one Electron application's port, application-owned filesystem/profile state, renderer endpoint, updater behavior, and owned process lifecycle. It does **not** redefine which credentials or caller environment values the application/server may receive. Architecture or implementation review must tie every blocking finding to an approved requirement or acceptance criterion. A proposed credential/security policy without that basis is a separate requirement requiring explicit user approval; it must not be introduced as a blocking interpretation of this ticket.

## Functional Requirements

- **R-001 — Explicit launch profile:** Electron startup shall resolve one immutable launch profile with `production` as the default and `e2e` only when the explicit `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e` selector is present. Build-time production constants shall remain defaults, not the authority for an active E2E instance.
- **R-002 — Complete E2E input contract:** E2E mode shall require a valid non-default TCP port and an absolute isolated data root. Missing, malformed, production-equivalent, or otherwise unsafe values shall be rejected as one configuration error before stateful startup.
- **R-003 — Early single-owner resolution:** The launch profile shall be resolved before any logger, data service, backend manager, updater, renderer window, persistent Electron session, or other path-owning runtime writes data. All downstream owners shall consume this resolved profile rather than re-read independent defaults.
- **R-004 — Full mutable-state isolation:** E2E mode shall route backend data/config/database/logs/downloads/memory/skills/workspaces, Electron application logs/extensions/browser artifacts, Electron `userData` and session data, node registry, renderer local storage/cookies/caches, and persistent browser partitions to the isolated root or its defined descendants.
- **R-005 — End-to-end port and client-endpoint propagation:** The selected E2E port shall govern backend CLI/env launch while preserving the backend's current listener-bind policy. The loopback client base URL derived from that port shall govern health/readiness, restart/status IPC, the embedded-node registry entry, window-bound renderer HTTP endpoints, and window-bound renderer WebSocket endpoints. No supported Electron request path may continue targeting `29695` in E2E mode, and no launch-profile host selector shall be introduced.
- **R-006 — Production preservation:** Without E2E mode, the application shall continue to use port `29695`, canonical `~/.autobyteus` AutoByteus state, the ordinary Electron product profile, and current packaged auto-update behavior. Existing stored data shall remain directly usable with no migration.
- **R-007 — Reusable E2E launch support:** The repository shall provide reusable process-neutral launch preparation consumable by process-smoke and Playwright/Electron process adapters. It shall prepare or accept a free non-default port and unique absolute data root, preserve the caller-provided environment, overlay `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, `AUTOBYTEUS_ELECTRON_SERVER_PORT`, and `AUTOBYTEUS_ELECTRON_DATA_ROOT`, expose the chosen launch metadata/readiness target and root ownership, and let the selected adapter identify/control only its launched process tree. These three values are launch-time inputs and shall not be stored in a repository `.env`, a production data-root `.env`, or a build profile. The helper shall not add credential filtering, an environment allowlist/denylist, or a replacement provisioning path.
- **R-008 — Parallelism and ownership:** Multiple E2E instances may run from the same packaged artifact when each has distinct ports and roots. Cleanup shall target only the process tree and temporary root owned by that harness instance and shall not inspect/kill/reset another AutoByteus instance based only on product name or port. Confirmed completion of the adapter-owned process tree shall authorize disposal of a preparation-owned root. Ambient occupancy or availability of the selected port shall be diagnostic evidence only: it shall neither authorize nor veto root disposal and shall never authorize signaling a foreign port owner.
- **R-009 — Fail-closed isolation:** E2E configuration errors and port conflicts shall never cause fallback to production port/data paths. Failure diagnostics shall identify the invalid/conflicting field without exposing secrets, and failure shall occur before a renderer window or backend process is started.
- **R-010 — Deterministic updater behavior:** Automatic update checks, downloads, and install-on-quit side effects shall be disabled while the explicit E2E profile is active. Normal packaged update behavior shall be preserved outside E2E mode.

## Acceptance Criteria

- **AC-001 — Production regression contract:** With no E2E selector, a packaged launch resolves port `29695`, `~/.autobyteus` AutoByteus state, and the ordinary Electron product profile, reads existing production data in place, and retains the current updater path.
- **AC-002 — Default-port coexistence:** With `29695` already occupied by the ordinary user application or a controlled process, a packaged Electron executable launched in valid E2E mode becomes ready on the requested alternate port without stopping, restarting, activating, connecting to, or otherwise disturbing the owner of `29695`. The ordinary application remains running and usable throughout the test.
- **AC-003 — Backend launch/client consistency:** The isolated embedded backend child receives the selected port consistently through CLI/environment, receives the isolated `server-data` path and matching database URL, retains the current wildcard listener policy with no launch-profile host override, and its health endpoint succeeds through the selected loopback E2E base URL.
- **AC-004 — Renderer runtime consistency:** The packaged renderer's embedded-node registry/window binding, status diagnostics, GraphQL/REST traffic, and relevant WebSocket endpoints resolve from the selected E2E base URL; no observed supported Electron request targets `29695`.
- **AC-005 — AutoByteus state isolation:** During an E2E launch and shutdown, backend state, Electron logs, extensions, and browser artifacts are created only under the isolated E2E root. Sentinel metadata/content representing canonical production paths remains unchanged.
- **AC-006 — Electron profile isolation:** Chromium/Electron helper processes for the E2E instance use isolated `userData`/session paths; renderer local storage, cookies/caches, persistent browser partition state, updater state, and the node registry do not use the ordinary product profile.
- **AC-007 — Parallel instance isolation:** Two E2E instances of the same packaged artifact can be ready concurrently on distinct ports and roots; state written through one instance is not visible through the other unless a test explicitly supplies shared external data.
- **AC-008 — Invalid/partial configuration:** Missing one required E2E value, selecting `29695`, selecting the canonical production data root, supplying a relative/invalid root, or selecting an already-bound requested port yields an actionable startup failure before a window/backend starts and without creating or modifying canonical production state.
- **AC-009 — Prepared-launch and cleanup safety:** Reusable launch preparation reports its port, root, executable, root ownership, and readiness URL and can be consumed once by either a direct process adapter or a Playwright/Electron adapter. The resulting session reports its exact process-tree controller; on completion/failure it confirms that the entire adapter-owned process tree has exited before removing only a temporary root preparation created. If owned-tree completion cannot be confirmed, the owned root is retained with an actionable cleanup error. If the tree is confirmed gone but the selected port is occupied by a foreign or newly bound process, that ambient process is not signaled and does not prevent owned-root disposal. The already-running ordinary app and any caller-supplied retained root remain untouched.
- **AC-010 — No updater side effects in E2E:** A packaged E2E instance does not schedule/check/download/install application updates and does not alter the ordinary app's updater state.
- **AC-011 — Build independence:** Existing platform Electron build commands still produce ordinary release artifacts, and any resulting packaged executable can be launched in E2E mode with different valid port/root pairs without rebuilding or editing source constants.
- **AC-012 — Failure and normal shutdown ownership:** Normal E2E shutdown confirms that its isolated embedded backend, Chromium helpers, and other adapter-owned descendants have exited and ordinarily leaves the selected port available while the ordinary app/default listener remains running. Startup failure performs the same ownership-safe cleanup for resources already acquired by that E2E instance. A foreign process that wins the accepted allocation race or binds after owned-tree exit is reported as ambient port occupancy, is never terminated, and does not acquire ownership of the E2E root.
- **AC-014 — Environment and credential-provisioning preservation:** Given caller-provided non-secret sentinel values representing existing API-key/provider/search/Codex environment inputs, including `CODEX_HOME`, the prepared Electron environment and embedded backend handoff preserve those values except for the three E2E launch-profile isolation keys and existing application-generated per-instance overrides. Existing pnpm/import/application/server provisioning flows remain usable, and no environment allowlist, credential denylist, or new secret-seeding prerequisite is introduced.

## Constraints / Dependencies

- Electron/main/renderer continues to address the embedded backend through loopback. The backend retains its current wildcard listener-bind default; host customization is not part of the E2E contract, and availability checks must match actual listener semantics.
- Launch-profile inputs must be available to the Electron main process when the packaged executable is spawned; the intended caller is a test process/Playwright harness, not Finder/double-click configuration.
- `app.setPath(...)` for Electron/Chromium profile paths must happen before `app.whenReady()` and before persistent sessions/windows are created.
- Static ES/CommonJS imports execute before the current `main.ts` body, while the existing logger/server-manager singletons perform writes in module initialization. Bootstrap ordering must therefore change rather than merely adding code near the current `bootstrap()` call.
- The backend already accepts `--port` and `--data-dir`; no backend storage schema change is required.
- Renderer endpoint bootstrap is asynchronous through the existing preload/node-registry/window-context path. Supported Electron network calls must remain gated on that binding rather than using compiled defaults during bootstrap.
- The E2E support boundary may allocate a port, but the Electron application itself receives a concrete port. This avoids an unobservable `port=0` backend assignment and keeps test metadata deterministic.
- Cross-platform source behavior is required; realistic packaged execution will run on the host platform available to API/E2E, with focused platform-manager contract coverage for other launchers.
- Cleanup safety is identity-based rather than port-based. Each adapter must expose a completion contract for its entire owned process tree; listener availability may be observed after completion for diagnostics but cannot stand in for process identity.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing backend and Electron mutable data under `~/.autobyteus/**` and the OS-specific ordinary Electron `userData` profile; new disposable E2E data under a caller/harness-owned isolated root.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Existing production data stays in its current locations and remains the normal-mode source. New E2E roots start isolated and may be discarded only by the harness that created them. No production data is copied or transformed.
- Unacceptable data loss or corruption: Any E2E read/write/reset/delete against the ordinary database, `.env`, secrets/vault, logs, extensions, browser artifacts, node registry, cookies/cache/local storage, updater metadata, or other ordinary Electron profile state.
- Relevant availability, maintenance-window, or rollout constraints: None; normal-mode paths and schema remain unchanged.
- Related requirement and acceptance-criteria IDs: R-003, R-004, R-006, R-008, R-009; AC-001, AC-005, AC-006, AC-008, AC-009.

## Assumptions

- API/E2E will launch the packaged executable directly (or through Playwright Electron support) with a controlled environment rather than relying on a user double-clicking the app.
- No hidden native addon or external service derives production state from a location outside the inspected AutoByteus root and Electron `userData`/session roots; implementation/API-E2E must re-audit this as code changes.
- A blank isolated backend root can perform its normal first-run initialization and migrations without production data.
- Tests that require providers or credentials may continue using the repository's existing caller-environment, pnpm/import, application, and internal-server provisioning flows. This ticket neither guarantees that credentials exist nor changes how they are supplied.
- The current absence of `requestSingleInstanceLock()` is intentional for this capability and will remain unchanged.

## Risks / Open Questions

- The user approved the same-package launch-profile model rather than a separately branded or separately configured E2E build. The environment contract is `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE`, `AUTOBYTEUS_ELECTRON_SERVER_PORT`, and `AUTOBYTEUS_ELECTRON_DATA_ROOT`; the helper CLI implementation shape remains a design concern.
- Playwright/Electron compatibility with the repository's current Electron and `playwright-core` versions must be verified downstream; process/readiness isolation is required regardless of whether UI automation needs a version adjustment.
- Platform-specific process-tree shutdown behavior must be implemented and tested behind the adapter-owned tree-completion contract without broad product-name killing.
- Remote node behavior must be regression-tested because renderer endpoint cleanup touches shared routing utilities, even though its intended behavior is unchanged.

## Requirement-To-Use-Case Coverage

| Requirement ID | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 | UC-007 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Yes | Yes | Yes | Yes | Yes | No | No |
| R-002 | No | Yes | Yes | Yes | Yes | No | No |
| R-003 | Yes | Yes | Yes | Yes | Yes | No | No |
| R-004 | Yes | Yes | Yes | Yes | Yes | Yes | No |
| R-005 | No | Yes | Yes | Yes | No | No | No |
| R-006 | Yes | Yes | No | No | Yes | No | Yes |
| R-007 | No | Yes | Yes | Yes | No | Yes | Yes |
| R-008 | No | Yes | No | Yes | No | Yes | No |
| R-009 | No | Yes | No | Yes | Yes | Yes | No |
| R-010 | Yes | Yes | No | Yes | No | Yes | No |

## Acceptance-Criteria-To-Scenario Intent

| Scenario ID | Acceptance Criteria | Intended Observable Scenario |
| --- | --- | --- |
| SCN-001 | AC-001, AC-011 | Resolve/launch normal mode and prove all ordinary defaults and build outputs remain unchanged. |
| SCN-002 | AC-002, AC-003 | Occupy/observe `29695`, launch packaged E2E on another port/root, and verify child arguments plus health/readiness. |
| SCN-003 | AC-004 | Inspect/drive the packaged renderer through the Playwright-owned launch adapter and correlate registry/status/client HTTP/WebSocket endpoints to the isolated base URL. |
| SCN-004 | AC-005, AC-006, AC-010, AC-014 | Use sentinel ordinary roots plus non-secret sentinel caller environment/provisioning values and an isolated E2E root; verify application/profile/updater writes stay isolated while the existing environment/provisioning journey remains unchanged. |
| SCN-005 | AC-007 | Launch two packaged E2E instances with distinct profiles, verify simultaneous readiness and non-shared state. |
| SCN-006 | AC-008 | Exercise each invalid/partial profile and an occupied requested port; verify fail-closed behavior and no canonical mutations. |
| SCN-007 | AC-009, AC-012 | Exercise both direct and Playwright prepared-launch adapters, including a delayed descendant and a foreign process winning the selected-port race; prove owned-tree completion/root cleanup without killing the foreign owner or affecting the ordinary app. |
| SCN-008 | AC-014 | Supply non-secret sentinel caller values for existing provider/API-key/Codex inputs through the supported launch/provisioning paths and prove Electron/backend receive them unchanged except for the three forced isolation keys and existing per-instance overrides. |

## Approval Status

Approved by the user on 2026-08-20. The approved direction is: **use the worktree-built, production-equivalent packaged Electron artifact with an explicit Electron launch profile named `e2e`; provide port and data-root values only when the test harness launches that artifact; do not create a separately branded/build-configured test binary; and do not require the already-running ordinary user application to stop.** The user also explicitly approved the term **launch profile** instead of **runtime profile**.

Solution revision `SR-002` clarified the safe-root, client/listener, and process-adapter architecture, but it also incorporated AR-F-004's credential-sanitization expansion. The user later rejected that expansion as outside this ticket's approved business scope.

Solution revision `SR-003` both corrects that scope error and clarifies the already-approved ownership-safe cleanup outcome: existing caller-environment and credential-provisioning behavior is preserved; disposal of a preparation-owned root is governed by confirmed completion of the adapter-owned process tree; and selected-port occupancy is diagnostic only and never transfers ownership to or authorizes termination of a foreign process. The user explicitly approved this correction on 2026-08-20.
