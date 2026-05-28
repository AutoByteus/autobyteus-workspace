# Design Spec

## Current-State Read

AutoByteUs already has the frontend shape needed for the user's preferred Phase One flow: a Docker server can be added as a remote node and opened in a separate Electron window bound to that node. The missing capability is that Phone Access setup is not available from that remote node window.

Current implementation facts that shape this design:

- `autobyteus-web/components/settings/NodeManager.vue` renders `PhoneAccessCard` only for `windowNodeContextStore.isEmbeddedWindow`; remote node windows show a Phone Setup unavailable notice.
- `autobyteus-web/stores/phoneAccessStore.ts` calls `/remote-access/*` through the current node-bound API service, but has no remote-node admin claim and treats the selected URL as the QR advertised URL.
- `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` classifies Phone Access management routes as `LOCAL_ONLY` based on loopback peer IP.
- A host Electron process calling a Docker node through a published port is not loopback from the container's perspective, so current local-only management blocks remote Docker node Phone Access setup.
- `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` runs inside the target backend. In a Docker node it may produce container-local or unsuitable candidates, while Android needs a phone-reachable HTTPS URL that maps to the Docker node.
- Current `MobileTools.vue` hardcodes a Terminal/VNC mobile page, `MobileWorkShell.vue` hardcodes the `Tools` bottom tab and imports `MobileTools`, `types/mobileWork.ts` includes `tools`, `utils/mobileFeatureGates.ts` marks `terminal` and `vnc` supported, and mobile tests assert Terminal/VNC/Tools behavior.
- The Docker launcher currently starts nodes with broad defaults: root container, `SYS_ADMIN`, `seccomp=unconfined`, automatic host workspace/shared mounts, and all-interface port publishing.

This phase does not solve all mobile backend authorization concerns. Phase One's security milestone is Android pairing to a mobile-safe Docker node through the existing open-node workflow, with safer Docker defaults, a concrete node-admin claim boundary, a validated Android-facing Docker origin, and terminal/Tools UI removed from mobile.

## Intended Change

Implement Phase One:

```text
Create mobile-safe Docker node
  -> add/open remote Docker node in desktop
  -> separate Electron window connected to Docker node
  -> register/present node-admin claim for that Docker node
  -> Phone Access setup in that Docker node window
  -> enter Android-facing HTTPS Docker URL
  -> verify advertised URL reaches same Docker node
  -> create QR/link for Docker node
  -> Android scans QR/link
  -> Android pairs with Docker node
  -> mobile work runs against Docker node/container
```

Broader mobile backend operation hardening remains documented in `docs/future-tickets/mobile-backend-authorization-hardening.md`.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + Security Hardening, Phase One.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to Docker node Phone Access management, Docker launcher profiles, advertised-origin validation, and mobile terminal/Tools UI removal.
- Evidence: Remote node windows already exist, but Phone Access is embedded/local-only. The initial design failed architecture review because the claim lifecycle, Docker Android-facing origin flow, and terminal UI surface mapping were underspecified.
- Design response: Define the concrete node-admin claim lifecycle/request shape, split desktop management base URL from Android advertised URL with same-node verification, and name all mobile Terminal/Tools/VNC surfaces for removal/update.
- Refactor rationale: Do not broaden loopback trust and do not rely on UI-only guesses about Docker origins. The Docker node should own its Phone Access data; the desktop remote window is only claim-backed owner UI.
- Intentional deferrals and residual risk, if any: Full operation-level GraphQL/REST/WS mobile authorization, token/session hardening, Android secure credential storage, audit, and backend API hardening remain Phase Two. Phase One still improves practical safety by moving mobile work into a safer Docker node path.

## Terminology

- `Mobile-safe Docker profile`: launcher profile for Docker nodes intended to be paired with Android/mobile. It avoids privileged flags, automatic shared host mounts, and broad port exposure by default.
- `Management base URL`: URL used by the desktop/Electron app to manage the Docker node, often loopback-bound such as `http://127.0.0.1:8001`.
- `Android-facing advertised URL` / `mobileAdvertisedBaseUrl`: HTTPS URL encoded into the pairing QR and used by Android to reach the Docker node, for example a Tailscale Serve/private HTTPS URL mapped to the Docker node.
- `Server instance ID`: stable random identifier persisted in each AutoByteUs server data dir and returned by `/rest/remote-access/status`; used to prove management URL and advertised URL reach the same node.
- `Node-admin claim`: local-owner secret scoped only to Phone Access management on one target Docker node. It is not a mobile credential and does not authorize GraphQL/files/runs/terminal.

## Architecture Review Rework Summary

This revision resolves the round 1 design-impact findings as follows:

- `AR-P1-001`: The node-admin claim now has a concrete issuer, custody model, request shape, route class, target binding, redaction rule, and Phase One rotation behavior.
- `AR-P1-002`: The Docker-node QR origin flow now separates `managementBaseUrl` from `mobileAdvertisedBaseUrl`, requires manual HTTPS advertised URL input in remote Docker mode, and verifies both URLs reach the same `serverInstanceId` before QR creation.
- `AR-P1-003`: The mobile terminal removal now names the hardcoded `MobileTools.vue` surface, `MobileWorkShell.vue` tab/import path, `MobileTaskTab`/store/gate changes, and affected tests. The current Tools/VNC page is removed from mobile Phase One, not renamed or partially retained.

## Concrete Node-Admin Claim Contract (Resolves `AR-P1-001`)

### Claim generation and server-side storage

- The mobile-safe Docker launcher generates the claim when it creates, recreates, or rotates a launcher-managed mobile-safe node.
- The generated values are:
  - `claimId`: random non-secret identifier, e.g. `nac_<base64url-random>`.
  - `rawSecret`: random secret with at least 32 bytes of entropy, displayed/provided only to the local owner.
  - `secretHash`: SHA-256 or stronger hash of `rawSecret`.
  - `scope`: fixed string `phone-access-management`.
- The Docker container receives only non-raw validation material via env/config:
  - `AUTOBYTEUS_NODE_ADMIN_CLAIM_ID=<claimId>`
  - `AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH=<secretHash>`
  - `AUTOBYTEUS_NODE_ADMIN_CLAIM_SCOPE=phone-access-management`
- The raw secret must not be passed to the container environment, written to server settings, returned by `/status`, included in node snapshots, or logged.

### Local owner custody

- The launcher writes the raw claim secret to a launcher-owned local state file keyed by container/node name, with user-only permissions where supported (`0600` on POSIX).
- Launcher output may show the claim once during creation and may provide an explicit owner command such as `autobyteus-docker admin-claim show --name <node>`; exact command names can vary, but the command must be deliberate and not part of routine status output.
- Electron stores raw claims in the Electron main process user-data area, separate from renderer `localStorage` and separate from the normal node registry snapshot. The store is keyed by:
  - desktop node registry ID;
  - normalized `managementBaseUrl`;
  - `claimId`.
- Renderer-visible node data exposes only redacted state such as `missing`, `configured`, or `invalid`, plus at most a claim ID suffix/fingerprint. It never exposes `rawSecret` in normal stores/devtools-friendly snapshots.

### Request shape and route integration

- Claim-backed Phone Access owner requests use headers, not query parameters:
  - `X-Autobyteus-Node-Admin-Claim-Id: <claimId>`
  - `X-Autobyteus-Node-Admin-Claim: <rawSecret>`
- `RemoteAccessRoutePolicy` should replace the relevant current `LOCAL_ONLY` classification with a narrower `PHONE_ACCESS_OWNER` or equivalent route class for:
  - `GET /rest/remote-access/address-candidates`;
  - `GET/PUT /rest/remote-access/settings`;
  - `POST /rest/remote-access/pairing-sessions`;
  - `GET /rest/remote-access/devices`;
  - `GET /rest/remote-access/devices/revoked`;
  - `DELETE /rest/remote-access/devices/:deviceId`;
  - `DELETE /rest/remote-access/devices`.
- The `PHONE_ACCESS_OWNER` route class authorizes either:
  - loopback peer, preserving existing embedded/local desktop behavior; or
  - valid node-admin claim validated by `RemoteNodeAdminService`.
- `RemoteNodeAdminService` validates claim ID equality, hashes the presented raw secret, compares with the configured hash using timing-safe comparison where possible, and checks `scope === "phone-access-management"`.
- A valid node-admin claim creates only a narrow owner-management context for those routes. It must not authorize `/graphql`, protected file/workspace REST, `/ws/*`, terminal, browser bridge, packages, global settings, runs, or any general admin API.

### Target binding, invalid state, rotation, and redaction

- A claim is target-bound by two layers:
  - server-side: only the target Docker node has the configured claim ID/hash, so the same headers fail on other nodes;
  - desktop-side: Electron claim store keys the secret by node registry ID and normalized `managementBaseUrl`; if either changes, UI treats the claim as missing/needs confirmation instead of silently reusing it.
- Phase One rotation/revocation is launcher-owned. Recreating or rotating a mobile-safe Docker node generates a new claim ID/hash/secret and updates/restarts/recreates the container with the new hash. Old desktop-stored claims then fail validation and the remote Phone Access UI shows an invalid/missing claim state requiring owner registration of the new claim.
- Remote in-app claim rotation on the Docker server is explicitly not in Phase One. Desktop UI may forget/delete its local stored claim, but cannot remotely mint a new server-side claim without the launcher/container update path.
- Automatic time-based claim expiry is not required in Phase One because the claim is a local-owner management secret, not a mobile session credential. Compensating limits are route scope, server-side hash storage, target binding, redaction, local custody, and launcher-owned rotation/recreate.
- Redaction must cover the new headers and any similarly named query/body fields in server HTTP logging, URL redaction, frontend diagnostics, Electron logs, and test snapshots. Routine launcher/node status output must not print the raw secret.

## Concrete Docker Advertised-Origin Contract (Resolves `AR-P1-002`)

### URL identities

- `managementBaseUrl` is the desktop/Electron URL used to call the selected Docker node for owner management. For mobile-safe Docker nodes this is commonly loopback-bound, e.g. `http://127.0.0.1:8001`.
- `mobileAdvertisedBaseUrl` is the HTTPS URL encoded into the QR/link and later used by Android. Example: a Tailscale Serve/private HTTPS URL mapped to the Docker node's loopback-bound backend, e.g. `https://autobyteus-docker.<tailnet>.ts.net`.
- The two values are never implicitly interchangeable. A localhost `managementBaseUrl` is safe for desktop management but invalid as an Android QR origin unless it is independently HTTPS and Android-facing, which will normally not be true.

### Remote Docker window UX and validation flow

1. In an embedded/local desktop window, existing address candidates can continue to help choose a reachable HTTPS URL.
2. In a remote Docker node window, address candidates returned from inside the Docker container are diagnostic only. The UI must not auto-select them for QR creation because they can be container-local, Docker-bridge-local, or otherwise wrong for Android.
3. Remote Docker Phone Access setup requires the owner to manually enter `mobileAdvertisedBaseUrl`.
4. Before enabling QR creation, the UI/store must:
   - normalize the URL;
   - require `https:`;
   - reject loopback, unspecified, container-local, and obvious non-Android-facing hosts such as `localhost`, `127.0.0.1`, `::1`, and `0.0.0.0`;
   - fetch `GET {managementBaseUrl}/rest/remote-access/status`;
   - fetch `GET {mobileAdvertisedBaseUrl}/rest/remote-access/status`;
   - compare the returned stable `serverInstanceId` values;
   - fail closed if either status request is unreachable, lacks `serverInstanceId`, or returns a mismatch.
5. Error guidance should say the URL must be a private HTTPS URL mapped to the selected Docker node, for example Tailscale Serve or an equivalent company-controlled HTTPS tunnel/ingress.
6. After validation succeeds, the UI creates the pairing session by posting to `managementBaseUrl` with claim headers and body `{ serverBaseUrl: mobileAdvertisedBaseUrl, serverName: currentNode.name }`. The Docker node pairing service stores the session and returns a QR/link whose payload uses `mobileAdvertisedBaseUrl`.

### Proof that QR lands on the Docker node

Implementation validation must prove all of the following:

- The QR payload's `serverBaseUrl` equals the validated `mobileAdvertisedBaseUrl`, not the desktop `managementBaseUrl` unless they are the same verified HTTPS URL.
- The Android pairing exchange posts to `{mobileAdvertisedBaseUrl}/rest/remote-access/pairing-exchanges`.
- The paired device appears in the Docker node's paired-device list and does not appear in the embedded host node's paired-device list.
- A mobile-started run shows Docker-node evidence, such as Docker node ID/status or container workspace path, rather than embedded host node evidence.

## Concrete Mobile Terminal/Tools Removal Mapping (Resolves `AR-P1-003`)

The current mobile Tools page is a Terminal/VNC host. Phase One removes that mobile page entirely; it does not keep a VNC-only Tools page and it does not hide terminal behind an advanced toggle.

Required surface changes:

- `autobyteus-web/components/mobile/MobileWorkShell.vue`: remove `MobileTools` import, `activeTab === 'tools'` render branch, Tools bottom-nav item, and `grid-cols-5`; bottom navigation becomes Chat/Runs/Files/Activity (`grid-cols-4`), and `showTeamFocusBar` no longer special-cases `tools`.
- `autobyteus-web/components/mobile/MobileTools.vue`: delete or decommission after no imports/tests remain. It must not remain reachable by route, tab, or dynamic component mapping.
- `autobyteus-web/types/mobileWork.ts`: remove `tools` from `MobileTaskTab`.
- `autobyteus-web/stores/mobileWorkStore.ts`: reject/normalize any stale `tools` active-tab value to a safe tab such as `chat` or `activity`.
- `autobyteus-web/utils/mobileFeatureGates.ts`: remove `terminal` and `vnc` from `MobileFeatureId` support lists for mobile.
- `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` and related copy/tests: remove text that presents "Chat/Runs/Files/Tools/Activity" as supported mobile surfaces.
- Tests to update include `MobileRemoteAccessShell.spec.ts`, `MobileUxRefinement.spec.ts`, `MobileContextSelectionRegression.spec.ts`, and `mobileFeatureGates.spec.ts`; they should assert no Tools/Terminal/VNC mobile UI rather than assert rendering.

The conversation/history renderer may still display historical terminal-command tool output as read-only agent activity if that component already exists outside the interactive terminal surface. That is not the mobile terminal control UI and should not create a command-entry path.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. file responsibilities and target mapping
4. migration/refactor sequence

## Legacy Removal Policy (Mandatory)

- No legacy compatibility should preserve automatic shared mounts in the mobile-safe profile.
- No legacy compatibility should keep terminal/Tools/VNC visible in mobile UI for Phase One.
- Do not solve Docker node Phone Access by broadening `isLoopbackPeerAddress` to include Docker bridge/LAN addresses.
- Existing non-mobile Docker workflows may remain under a separate standard/compatibility profile; that is not the mobile-safe default.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-P1-001 | Primary End-to-End | User starts mobile-safe Docker node | Docker node is registered/openable as remote node with admin claim available to owner | Docker launcher profile owner + Node Registry | Creates the safer target runtime and the owner claim needed for management. |
| DS-P1-002 | Primary End-to-End | User clicks **Open** on Docker node | Node-bound Electron window manages Phone Access for that Docker node | Node Manager + RemoteNodeAdminService | Implements the user's requested flow without weakening loopback trust. |
| DS-P1-003 | Primary End-to-End | User enters Android-facing Docker HTTPS URL | URL is verified to reach the same Docker node | PhoneAccessCard remote mode + server status identity | Prevents QR from targeting embedded host, localhost, or container-local origins. |
| DS-P1-004 | Primary End-to-End | Docker node Phone Access QR created | Android pairs with Docker node | Remote Access Pairing Service on Docker node | Makes mobile target the container, not the host. |
| DS-P1-005 | Primary End-to-End | Mobile starts test work | Work executes against Docker node backend/container | Mobile session/node binding | Validates the security benefit. |
| DS-P1-006 | Bounded Local | Mobile UI renders work shell | Terminal/Tools/VNC are absent from mobile UI | Mobile work shell + feature gates | Removes low-value high-risk mobile feature. |

## Primary Execution Spine(s)

- DS-P1-001: `Docker Launcher -> Claim/Profile Resolver -> Docker Run Spec(hash only) -> Launcher State(raw claim) -> Backend URL -> Node Registry Add`.
- DS-P1-002: `Node Manager -> Open Remote Node Window -> Window Node Context -> PhoneAccessCard Remote Mode -> Electron Claim Store -> Claim-Backed Phone Access Request -> Docker Node Remote Access Routes`.
- DS-P1-003: `PhoneAccessCard Remote Mode -> Manual Android HTTPS URL -> Management Status Probe -> Advertised Status Probe -> Server Instance ID Match -> QR Creation Allowed`.
- DS-P1-004: `Docker Node PhoneAccessCard -> Docker Node Pairing Session -> QR/Link With Advertised Docker Origin -> Android Pairing Parser -> /mobile Pairing Exchange On Docker Node`.
- DS-P1-005: `Android Mobile Shell -> Docker Node Session/Base URL -> Mobile Run Request -> Docker Node Runtime -> Container Workspace`.
- DS-P1-006: `Mobile Runtime Detection -> MobileWorkShell Tabs -> No MobileTools -> No Terminal/VNC UI`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-P1-001 | The launcher creates a Docker node using `mobile-safe`. It generates a claim ID and raw secret, passes only hash/ID/scope to the container, stores raw secret in local launcher state, and prints/provides it for desktop registration. | Launcher Command, Claim Generator, Profile Resolver, Docker Run Spec, Launcher State | Docker launcher profile owner | Secret generation, state file permissions, claim show/rotate command |
| DS-P1-002 | The user opens the Docker node. The remote window can show Phone Access controls after the owner registers or has a stored claim. Requests include claim headers and the Docker node validates them for Phone Access owner routes only. | Node Manager, Remote Node Window, Electron Claim Store, PhoneAccessCard, RemoteNodeAdminService | Node Manager + RemoteNodeAdminService | Claim redaction, claim invalid state, route classification |
| DS-P1-003 | Remote PhoneAccessCard does not use container candidates as QR origins. It requires a manual Android-facing HTTPS URL and verifies that this URL's status endpoint returns the same server instance ID as the management URL. | Management URL, Advertised URL, Status Identity, Validation Result | PhoneAccessCard remote mode + server status identity | HTTPS enforcement, loopback rejection, copy guidance |
| DS-P1-004 | Pairing is created on the Docker node itself after URL verification. The QR points Android at the verified advertised URL. Android exchanges the code against that URL, which lands on the Docker node owning the pairing session. | Pairing Session, QR/Link, Android Parser, Pairing Exchange | Docker node Remote Access Pairing Service | URL normalization, pairing payload, device records on Docker node |
| DS-P1-005 | After pairing, the mobile session is bound to the Docker node base URL. A test mobile run goes to Docker backend/runtime, demonstrating the work is not executing on the embedded host node. | Mobile Session, Run Request, Docker Runtime | Mobile node session store + Docker backend | Evidence logging, workspace path display |
| DS-P1-006 | Mobile work shell removes the Tools tab and MobileTools component, so the user never sees Terminal or VNC on mobile. Tests that asserted Terminal/VNC mobile behavior are updated to assert absence. | MobileWorkShell, MobileTaskTab, MobileFeatureGates, Mobile tests | Mobile UI feature policy | Locale/copy updates, stale route handling |

## Spine Actors / Main-Line Nodes

- Docker Launcher Claim/Profile Resolver.
- Electron Node Registry and separate Node Admin Claim Store.
- Remote Node Electron Window / Window Node Context.
- PhoneAccessCard remote mode.
- RemoteNodeAdminService or equivalent claim verifier on the Docker node.
- Server status identity provider (`serverInstanceId`).
- Docker node Remote Access Pairing Service.
- Android pairing parser and mobile shell.
- MobileWorkShell / mobile feature gates.

## Ownership Map

- Docker launcher owns mobile-safe runtime defaults and first claim generation/rotation for launcher-managed mobile-safe nodes.
- Electron main process owns local desktop custody of raw node-admin claims in a dedicated claim store, not renderer localStorage and not regular node snapshots.
- RemoteNodeAdminService owns claim validation on the target Docker node for Phone Access owner routes only.
- Docker node Remote Access services own actual Phone Access settings, pairing sessions, paired devices, and revocation for that node.
- PhoneAccessCard remote mode owns the UX distinction between management base URL and Android-facing advertised URL.
- Server status identity provider owns the stable per-node ID used to prove two URLs reach the same node.
- Mobile UI feature policy owns removal of the Tools/Terminal/VNC mobile surface.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `PhoneAccessCard` remote mode | Docker node Remote Access services + RemoteNodeAdminService | UI for owner actions in node-bound window | Broad backend admin permissions or claim persistence |
| Remote node window context | Node registry/window bootstrap | Selects target node management base URL | Advertised URL validation policy |
| Docker launcher CLI command | Docker profile/claim resolver | User entrypoint for mobile-safe node creation | Hidden privileged defaults or raw claim in container |
| Route policy for Phone Access owner routes | RemoteNodeAdminService | Transport-level owner proof gate | GraphQL/files/runs/terminal authorization |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Remote-node Phone Setup unavailable steady state | Docker node pairing is Phase One core flow | Remote-mode `PhoneAccessCard` with node-admin claim | In This Change | Keep unavailable/register-claim state only when claim missing/invalid. |
| Automatic shared host mounts in mobile-safe Docker profile | Exposes host folders and complicates safety | Explicit user-selected mounts at creation time | In This Change | Non-mobile/compat profiles can differ. |
| Default `SYS_ADMIN` in mobile-safe profile | Too privileged for secure mobile runtime | Least-privilege mobile-safe Docker profile | In This Change | Compat profile can be explicit. |
| Default `seccomp=unconfined` in mobile-safe profile | Disables Docker syscall filtering | Docker default seccomp profile | In This Change | Compat profile can be explicit. |
| Container/address-candidate QR origin in remote mode | Docker/container candidates may not be Android-reachable and may be wrong node | Manual advertised URL + same-node status verification | In This Change | Candidates may stay diagnostic only. |
| `MobileTools.vue` mobile terminal/VNC page | Low value on phone and high risk | No Tools tab/page in Phase One mobile work shell | In This Change | VNC/noVNC remains non-mobile/desktop/compat surface only. |
| `tools` value in `MobileTaskTab` | No mobile Tools page remains | `chat | runs | files | activity` tabs | In This Change | Update stores/tests accordingly. |

## Return Or Event Spine(s) (If Applicable)

- Pairing result return: `Docker Pairing Exchange -> Mobile Session Stored In Mobile Shell -> Window Node Context Bound To Docker Advertised Base URL -> Mobile home/work UI`.
- Claim validation return: `Claim-backed request -> RemoteNodeAdminService validation -> route handler executes OR 403 invalid/missing claim -> PhoneAccessCard claim state`.
- Advertised URL validation return: `Status probes -> serverInstanceId match/mismatch -> create QR enabled OR error guidance`.

## Bounded Local / Internal Spines (If Applicable)

- Docker claim/profile resolution:
  - `command/profile flag -> generate claim ID/raw secret -> hash secret -> write launcher state -> pass hash env -> docker run args -> validation output`.
- Remote-node Phone Access request:
  - `remote PhoneAccessCard action -> get claim from Electron claim store -> attach claim headers -> route policy validates claim -> handler executes`.
- Advertised URL validation:
  - `manual URL input -> normalize -> reject non-HTTPS/loopback -> fetch management status -> fetch advertised status -> compare serverInstanceId -> persist selected advertised URL for this node`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Claim redaction | DS-P1-001, DS-P1-002 | Launcher, Electron claim store, Route policy | Redact claim headers/state/log output | Claim can manage Phone Access | Secret leaks through status/log/UI. |
| Server instance identity | DS-P1-003 | Advertised URL validation | Stable ID returned by status endpoint | Proves URLs target same node | QR may target host or container-local wrong origin. |
| Android reachability guidance | DS-P1-003, DS-P1-004 | Pairing UX | Explain Tailscale Serve/private HTTPS mapping | Phone cannot use host `127.0.0.1` | Users may expose raw ports or choose wrong URL. |
| Mobile terminal UI removal | DS-P1-006 | Mobile UI feature policy | Remove Tools/Terminal/VNC affordances and tests | Clear UX and risk reduction | Hardcoded component bypasses feature gate. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Remote node open window | Node registry / Electron window context | Reuse | Already supports clicked-open Docker node windows | N/A |
| Phone Access pairing | `remote-access` backend services + `PhoneAccessCard` | Extend | Existing target-node pairing lifecycle should run on Docker node too | N/A |
| Docker node launcher | `scripts/public/docker` | Extend/Refactor | Existing launcher owns Docker run shape | N/A |
| Remote-node owner proof | No exact current owner | Create `RemoteNodeAdminService` + Electron claim store | Local-only loopback does not fit Docker host-to-container | Needed to avoid broadening local trust. |
| Advertised origin proof | Existing status endpoint and PhoneAccessCard URL input | Extend | Status can return stable node identity; UI already has manual URL field | Need same-node validation, not just URL input. |
| Mobile terminal UI removal | `MobileWorkShell`, `MobileTools`, `mobileFeatureGates`, mobile tests | Modify/Remove | Current hardcoded Tools/Terminal/VNC surface exists | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker Launcher | mobile-safe profile, claim generation, hash env, raw local state, no privileged flags/mounts | DS-P1-001 | Docker profile/claim owner | Extend/Refactor | Shell/PowerShell parity. |
| Electron Node Management | remote node windows, redacted claim state, raw claim custody in main process | DS-P1-002 | Node Manager | Extend | Store claims outside renderer localStorage. |
| Server Remote Access | claim validation, status identity, Phone Access management, pairing QR on Docker node | DS-P1-002, DS-P1-003, DS-P1-004 | RemoteNodeAdminService + Pairing Service | Extend | Keep actual pairing on target node. |
| Android/Mobile Shell | pairing with Docker node QR/origin, session bound to Docker base URL | DS-P1-004, DS-P1-005 | Mobile node session store | Extend/Validate | Existing payload likely works after origin validation. |
| Mobile UI Feature Policy | remove Tools/Terminal/VNC UI | DS-P1-006 | MobileWorkShell/Feature gate owner | Modify/Remove | Concrete file mapping below. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Docker Launcher | Profile/claim resolver | Add mobile-safe profile, claim generation/show/rotate, hash env | Existing public launcher | Yes |
| `scripts/public/docker/autobyteus-docker.ps1` | Docker Launcher | Profile/claim resolver | Windows parity | Existing public launcher | Yes |
| `autobyteus-web/electron/nodeAdminClaimStore.ts` | Electron Node Management | Claim custody | Store raw claims by node ID/base URL; redact snapshots | Separate from node registry profiles | Yes |
| `autobyteus-web/electron/preload.ts` / IPC handlers | Electron Node Management | Claim IPC | Register/get claim for current node without normal snapshot exposure | Existing Electron boundary | Yes |
| `autobyteus-server-ts/src/remote-access/services/remote-node-admin-service.ts` | Server Remote Access | Claim validator | Validate claim ID/hash/scope for Phone Access owner routes | New narrow owner | Yes |
| `autobyteus-server-ts/src/remote-access/services/server-instance-identity-service.ts` | Server Remote Access | Node identity | Stable per-data-dir server instance ID for status comparison | Separate from pairing/session | Yes |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Server Remote Access API | Phone Access routes | Status includes instance ID; management routes accept loopback or claim | Existing route ownership | Yes |
| `autobyteus-web/stores/phoneAccessStore.ts` | Desktop Node Management | Phone Access client state | Distinguish managementBaseUrl/mobileAdvertisedBaseUrl; validate status IDs; attach claim headers | Existing store | Yes |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Desktop Node Management | Phone Access UI | Remote mode, claim registration state, advertised URL validation UI/copy | Existing component | Yes |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile UI Feature Policy | Mobile nav/surface | Remove Tools tab and MobileTools branch/import | Current hardcoded nav owner | Yes |
| `autobyteus-web/components/mobile/MobileTools.vue` | Mobile UI Feature Policy | Obsolete mobile Tools page | Remove/decommission or leave unreachable only after explicit deletion decision | Current Terminal/VNC component | No |
| `autobyteus-web/types/mobileWork.ts` | Mobile UI Feature Policy | Mobile tab type | Remove `tools` from `MobileTaskTab` | Current type owner | No |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile UI Feature Policy | Active tab state | Remove/guard `tools` active tab states and defaulting | Current tab state owner | No |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile UI Feature Policy | Feature gate | Remove `terminal` and `vnc` from supported mobile feature set | Existing gate | No |
| Mobile tests | Validation | UI expectations | Update tests asserting Tools/Terminal/VNC to assert absence | Existing test owners | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Docker profile spec | Launcher profile helper/constants | Docker Launcher | Shell/PowerShell profile defaults must match | Yes | Yes | Loose string blob with hidden privileged defaults |
| Node admin claim metadata | Remote access domain model + Electron claim store types | Server Remote Access / Electron | UI/store/API need same claim ID/scope meaning | Yes | Yes | A mobile credential or broad admin token |
| Server instance status identity | Remote access status type | Server Remote Access | Management and advertised probes compare same field | Yes | Yes | User-facing display name only |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DockerSecurityProfile` | Yes | Yes | Medium | Keep profile fields explicit: ports, privileged flags, seccomp, mounts, claim. |
| `RemoteNodeAdminClaim` | Yes | Yes | Medium | Fields: `claimId`, raw secret only in local owner stores, server hash, `scope: phone-access-management`, `createdAt`, optional `rotatedAt`. |
| `RemoteAccessStatus` extension | Yes | Yes | Medium | Add `serverInstanceId` and maybe `nodeProfileKind`; do not use mutable `serverName` as identity. |
| `PhoneAccessUrlContext` | Yes | Yes | Medium | Distinguish `managementBaseUrl` from `mobileAdvertisedBaseUrl`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Docker Launcher | Mobile-safe profile/claim owner | Create mobile-safe nodes, generate claim, store raw local state, pass hash env, show/rotate claim | Existing macOS/Linux launcher | Yes |
| `scripts/public/docker/autobyteus-docker.ps1` | Docker Launcher | Mobile-safe profile/claim owner | Windows parity | Existing Windows launcher | Yes |
| `autobyteus-web/electron/nodeAdminClaimStore.ts` | Electron Node Management | Claim custody | Persist raw claims in Electron userData file separate from node snapshot; bind to node ID/base URL | Keeps secrets out of renderer localStorage/snapshots | Yes |
| `autobyteus-web/electron/main.ts` / `preload.ts` | Electron Node Management | Claim IPC | Register, retrieve-for-request, clear invalid claim for current node | Existing IPC boundary | Yes |
| `autobyteus-web/types/node.ts` | Node model | Redacted claim state | Add non-secret `phoneAccessAdminClaimState` if needed | Renderer needs state only | Yes |
| `autobyteus-server-ts/src/remote-access/services/remote-node-admin-service.ts` | Server Remote Access | Claim validator | Validate header claim ID/secret hash/scope for Phone Access owner routes | New authority boundary | Yes |
| `autobyteus-server-ts/src/remote-access/services/server-instance-identity-service.ts` | Server Remote Access | Server identity | Stable random instance ID persisted in app data and exposed by status | Required for advertised URL proof | Yes |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Server Remote Access API | Phone Access endpoints | Status includes serverInstanceId; management route handlers run after loopback/claim auth | Existing route owner | Yes |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Server API Security | Route classification | Replace relevant `LOCAL_ONLY` with `PHONE_ACCESS_OWNER`/equivalent: loopback OR valid claim | Existing route facade | Yes |
| `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts` and logging policy | Server API Security | Redaction | Redact claim headers/query/body key names | Existing redaction owner | Yes |
| `autobyteus-web/stores/phoneAccessStore.ts` | Desktop Node Management | Phone Access client store | Current node management base, claim-backed headers, manual advertised URL, status-ID validation | Existing store | Yes |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Desktop Node Management | Phone Access UI | Embedded mode plus remote Docker mode with claim registration and advertised URL validation | Existing component | Yes |
| `autobyteus-web/components/settings/NodeManager.vue` | Desktop Node Management | Node settings UI | Replace remote unavailable notice with claim/register state and remote PhoneAccessCard | Existing component | Yes |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile UI Feature Policy | Mobile work tabs | Remove Tools tab/import/render branch; nav becomes Chat/Runs/Files/Activity | Current tab owner | No |
| `autobyteus-web/components/mobile/MobileTools.vue` | Mobile UI Feature Policy | Obsolete component | Delete or decommission once no imports/tests remain | Current Terminal/VNC page | No |
| `autobyteus-web/types/mobileWork.ts` | Mobile UI Feature Policy | Tab type | Remove `tools` from `MobileTaskTab` | Type owner | No |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile UI Feature Policy | Tab state | Remove/normalize any `tools` state to safe tab | Store owner | No |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile UI Feature Policy | Feature gate | Remove `terminal`/`vnc` from supported mobile features | Existing gate | No |
| `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts` | Tests | Shell nav expectations | Update Chat/Runs/Files/Activity expectation; remove Tools source assertion | Existing tests | No |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Tests | MobileTools expectations | Remove MobileTools Terminal/VNC test; add absence/no import expectations | Existing tests | No |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` | Tests | Tab traversal | Remove tools stub/tab case | Existing tests | No |
| `docs/android_mobile_access.md` | Docs | User guidance | Docker node pairing flow, claim registration, advertised URL guidance, phase split | Existing mobile doc | N/A |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | Docs/Future Ticket | Future security roadmap | Track Phase Two hardening | User requested future ticket doc | N/A |

## Ownership Boundaries

- The Docker node owns its Phone Access settings, pairing sessions, and paired devices.
- The desktop remote node window may manage those settings only with explicit node-admin claim proof for that node.
- The node-admin claim is generated/rotated by the launcher for launcher-managed mobile-safe Docker nodes, stored raw only in local owner-side files, and validated as a hash by the target Docker server.
- The management base URL and Android-facing advertised URL are distinct identities and must be validated as reaching the same server instance before QR creation.
- The mobile UI owns terminal/Tools/VNC visibility and must remove hardcoded surfaces, not only update feature gates.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| RemoteNodeAdminService | Claim hash comparison, claim scope, claim ID validation | Route policy, Phone Access routes | Treating Docker bridge IP as loopback | Add explicit claim headers/service API. |
| Electron node admin claim store | Raw claim persistence and redaction | PhoneAccessStore/PhoneAccessCard | Storing raw claim in renderer localStorage or node snapshots | Add IPC method for claim-backed requests/lookup. |
| Server instance identity service | Stable per-node ID | PhoneAccessStore advertised URL validation, status endpoint | Comparing mutable display name or URL text only | Add `serverInstanceId` to status. |
| Docker mobile-safe profile resolver | Docker run flags, mounts, claim hash env | Launcher commands | Hardcoding privileged flags in run path | Add/adjust profile fields. |
| MobileWorkShell/tab model | Mobile-visible work surfaces | Mobile shell/navigation/tests | Keeping `MobileTools` reachable but hidden by CSS | Remove tab/import/type/tests. |

## Dependency Rules

- Remote-node Phone Access UI may call the target Docker node's management endpoints only with node-admin claim support.
- Server route policy may delegate claim validation to RemoteNodeAdminService; it must not embed Docker bridge address exceptions.
- Docker launcher profile code must be the single source for mobile-safe defaults and claim hash injection.
- PhoneAccessStore must treat management and advertised URLs as separate fields.
- Mobile UI components must remove Terminal/Tools/VNC surfaces directly; feature gates are necessary but insufficient.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-docker new-container --profile mobile-safe` or equivalent | Docker node profile | Create mobile-safe Docker node and claim | profile name + explicit optional mounts | Generates claim ID/raw secret/hash. |
| `autobyteus-docker admin-claim show/rotate --name <node>` or equivalent | Node-admin claim | Reveal/rotate local owner claim | node name | Exact command naming can vary; rotation recreates/updates container hash and invalidates old desktop claim. |
| `RemoteNodeAdminService.validateClaim(...)` | Remote node owner proof | Allow Phone Access management from remote node window | `{ claimId, rawSecret, routeScope }` | Compares SHA-256 or stronger hash to configured hash. |
| Phone Access owner routes | Docker node Phone Access | Enable/create QR/list/revoke | loopback OR valid node-admin claim | Scope limited to Phone Access management. |
| `/rest/remote-access/status` | Server identity/status | Public reachability and same-node proof | none | Returns `serverInstanceId`, server name, phone access enabled. |
| `PhoneAccessCard` remote mode | Node-scoped Phone Access UI | Manage current window node and QR advertised URL | `managementBaseUrl`, `mobileAdvertisedBaseUrl`, claim state | QR must use validated advertised URL. |
| `MobileWorkShell` tabs | Mobile UI | Show phone work surfaces | `MobileTaskTab` excluding `tools` | Chat/Runs/Files/Activity only. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile-safe launcher profile | Yes | Yes | Low | Use named profile. |
| Node admin claim | Yes | Yes | Low | Claim ID + raw secret + server hash + route scope. |
| PhoneAccessCard remote mode | Yes | Yes | Low | Explicit management/advertised URL fields. |
| Status identity | Yes | Yes | Low | Use stable `serverInstanceId`. |
| Mobile tab model | Yes | Yes | Low | Remove `tools`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile-safe Docker runtime | `mobile-safe` profile | Yes | Low | Keep explicit profile label. |
| Remote node admin proof | `RemoteNodeAdminClaim` | Yes | Low | Do not call it a mobile token. |
| Android-facing URL | `mobileAdvertisedBaseUrl` | Yes | Low | Keep distinct from management base URL. |
| Server instance identity | `serverInstanceId` | Yes | Low | Do not use display name as identity. |
| Mobile tools page removal | `MobileTools.vue` decommission | Yes | Low | No Tools tab in Phase One mobile. |

## Applied Patterns (If Any)

- Profile resolver for Docker run args.
- Claim-based admin authorization for remote-node Phone Access management.
- Existing node-bound Electron window pattern reused for Docker node setup.
- Status-fingerprint validation for advertised URL proof.
- Clean-cut UI removal for mobile Tools/Terminal/VNC.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/` | Folder | Docker launcher | Mobile-safe profile and launcher claim commands | Existing launcher distribution | Backend authorization policy |
| `autobyteus-web/electron/` | Folder | Electron local custody | Node admin claim store and IPC | Local desktop secret owner | Remote server validation logic |
| `autobyteus-server-ts/src/remote-access/` | Folder | Remote Access | Node-admin claim validation and server instance identity | Existing Phone Access owner | General mobile GraphQL scopes |
| `autobyteus-web/components/settings/` | Folder | Node/Phone settings UI | Remote-node Phone Access controls and advertised URL UI | Existing settings UI | Backend security decisions |
| `autobyteus-web/components/mobile/` | Folder | Mobile UI | Remove Tools/Terminal/VNC work surface | Existing mobile UI owner | Desktop terminal/VNC code |
| `docs/` | Folder | User/future docs | Updated Android Docker flow and future ticket | Existing docs root | Source code |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker` | Runtime launcher | Yes | Medium | Keep profile/claim decisions centralized and mirrored across sh/ps1. |
| `autobyteus-web/electron` | Local desktop privileged boundary | Yes | Medium | Raw claims belong in Electron main, not renderer/localStorage. |
| `remote-access` | Domain-control/API | Yes | Medium | Claim owner and status identity stay separate from route facade. |
| `components/settings` | UI | Yes | Low | Existing Phone Access UI location. |
| `components/mobile` | UI | Yes | Low | Existing mobile work shell and tests. |
| `docs/future-tickets` | Planning docs | Yes | Low | Separates Phase Two scope. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| User flow | `Open Docker node window -> register claim if needed -> Phone Setup -> enter https://docker-node.tailnet.ts.net/mobile -> verify same serverInstanceId -> Create QR` | Create QR only from embedded node and hope it targets Docker | Matches user's mental model and existing UI. |
| Docker management auth | Headers `X-Autobyteus-Node-Admin-Claim-Id: nac_...` and `X-Autobyteus-Node-Admin-Claim: aus_nac_...` accepted only on Phone Access owner routes | Mark Docker bridge IP as local loopback | Keeps local trust meaningful. |
| Claim storage | Launcher passes `AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH`, desktop stores raw claim in Electron claim store | Container receives raw claim env; renderer localStorage stores claim | Limits raw secret exposure. |
| Docker advertised URL | Management URL `http://127.0.0.1:8001`; Android URL `https://autobyteus-docker.tailnet.ts.net`; status IDs must match before QR | QR uses `http://127.0.0.1:8001` or container IP | Android can reach correct Docker node. |
| Docker profile | `mobile-safe` omits `SYS_ADMIN`, seccomp-unconfined, shared mounts | One default with privileged flags and mounts | Makes secure path clear. |
| Mobile terminal | `MobileWorkShell` has Chat/Runs/Files/Activity only; `MobileTools.vue` deleted/decommissioned | Disabled Terminal button or hidden advanced toggle | User should not see phone terminal. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Phone Access unavailable in remote node windows | Current behavior | Rejected | Remote-node Phone Access using node-admin claim. |
| Broaden loopback to Docker bridge/LAN | Easy remote-node management | Rejected | Explicit node-admin claim. |
| Pass/store raw claim in container env | Simpler server validation | Rejected | Pass only claim hash/ID/scope; raw stays owner-side. |
| Trust manually entered QR URL without same-node verification | Simpler UI | Rejected | Compare `serverInstanceId` from management and advertised URLs. |
| Keep shared mounts in mobile-safe profile | Convenience | Rejected | No automatic shared mounts; explicit creation-time mounts only. |
| Keep mobile Tools page with VNC only | Preserve part of current feature | Rejected for Phase One | Remove Tools page entirely; VNC/noVNC can be future/non-mobile. |
| Keep mobile terminal visible but disabled | Minimal UI change | Rejected | Remove from mobile UI entirely. |

## Derived Layering (If Useful)

- Launcher layer: Docker mobile-safe profile and launcher-side claim generation.
- Electron local-owner layer: node registry/window context plus raw claim custody.
- Backend Phone Access management layer: node-admin claim validation, status identity, pairing/settings/devices on target Docker node.
- Settings UI layer: remote PhoneAccessCard with management vs advertised URL split.
- Android/mobile layer: pair and use verified Docker node origin.
- Mobile UI layer: Chat/Runs/Files/Activity only; no Tools/Terminal/VNC.

## Migration / Refactor Sequence

1. Add/define mobile-safe Docker profile and claim generation in launcher scripts:
   - no `SYS_ADMIN`, no `seccomp=unconfined`, no automatic shared mounts;
   - localhost-bound or disabled published ports;
   - generate claim ID/raw secret;
   - pass hash/ID/scope to container;
   - store raw secret in launcher state with local file permissions;
   - add show/rotate or equivalent claim command/output.
2. Add server node-admin claim validation and status identity:
   - add stable `serverInstanceId` persisted in server data dir and returned by status;
   - add `RemoteNodeAdminService` validating claim ID/hash/scope;
   - update route policy/routes so Phone Access owner routes allow loopback or valid claim only;
   - add redaction for claim headers/keys.
3. Add Electron claim custody:
   - store raw claims in Electron main/userData claim file separate from node registry snapshots;
   - bind claim to node ID and normalized management base URL;
   - expose redacted claim state and claim registration/clear IPC;
   - make non-Electron remote Phone Access management unavailable.
4. Update Node Manager / PhoneAccessCard:
   - in remote Docker node window, show claim registration state when missing/invalid;
   - distinguish management base URL from mobileAdvertisedBaseUrl;
   - require manual HTTPS Android-facing URL in remote mode;
   - reject loopback/container-local/HTTP URL for QR;
   - probe management and advertised `/rest/remote-access/status` and compare `serverInstanceId`;
   - create pairing session on Docker management base with validated advertised URL.
5. Validate Android pairing to Docker node:
   - scan QR;
   - pair successfully;
   - verify active device appears on Docker node, not embedded host;
   - verify mobile session/serverBaseUrl is advertised Docker URL.
6. Validate mobile work executes in Docker node:
   - run a simple mobile-started task;
   - confirm backend/node ID/container workspace evidence.
7. Remove terminal/Tools/VNC mobile UI:
   - update `MobileWorkShell.vue` to remove Tools tab, import, render branch, and grid column count;
   - remove `tools` from `MobileTaskTab` and normalize any stale activeTab to `chat` or `activity`;
   - remove `terminal`/`vnc` from `mobileFeatureGates.ts` supported mobile features;
   - delete/decommission `MobileTools.vue` or leave only after no imports/tests and no route reachability;
   - update mobile tests named above.
8. Docs:
   - update `docs/android_mobile_access.md` with phase-one flow, claim registration, advertised URL/Tailscale Serve guidance, and residual Phase Two risk;
   - keep `docs/future-tickets/mobile-backend-authorization-hardening.md` as Phase Two scope.

## Key Tradeoffs

- Phase One does not solve all mobile backend authorization issues, but it delivers the largest practical blast-radius reduction first by moving mobile work into Docker.
- Node-admin claim adds one local secret and UI step, but avoids the worse shortcut of broadening loopback trust.
- Localhost-bound Docker ports are safer, but Android needs a controlled private HTTPS/tunnel/serve path to reach the Docker node.
- Same-node status verification adds implementation work, but prevents host/container-local QR mistakes.
- Removing the whole Tools page removes VNC from mobile too; this is acceptable in Phase One because VNC/noVNC is not part of the core secure phone workflow and Docker mobile-safe may disable noVNC by default.

## Risks

- Claim handling could become too broad if route classification accidentally applies it beyond Phone Access owner routes.
- If the mobile-safe profile removes too much, existing Docker workflows may need a separate compatibility profile.
- Pairing URL/origin must be carefully generated so Android reaches the Docker node, not the embedded node.
- Desktop may be able to reach a Tailscale Serve/private URL that Android cannot due to Android VPN state; docs should still guide user to validate on phone.
- Phase Two must not be forgotten; Docker isolation is not a replacement for backend authorization hardening.

## Guidance For Implementation

- Implement around the user's existing workflow: create Docker node, add/open node, manage Phone Access from that opened node window.
- Treat the Docker node as the owner of its own Phone Access data. The embedded host should not mint Docker node QR codes.
- Keep node-admin claim narrow, redacted, and route-limited.
- Keep `managementBaseUrl` and `mobileAdvertisedBaseUrl` separate in code and UI.
- Require same-node status verification before QR creation.
- Keep mobile-safe Docker profile visibly separate from standard/compat profiles.
- Remove mobile Tools/Terminal/VNC UI now, but avoid expanding this ticket into full mobile API hardening.
