# Design Spec

## Current-State Read

The current node settings surface mixes three concerns:

1. node management (`NodeManager.vue` Manage tab);
2. phone access setup/control (`PhoneAccessCard.vue`, currently embedded in Manage);
3. Docker tutorial/setup guidance (`DockerNodeStartGuideCard.vue`, already isolated in Docker Guide tab).

The revoked-phone bug comes from an active/history state boundary gap:

`PhoneAccessCard.onMounted() -> phoneAccessStore.loadAll() -> GET /remote-access/devices -> PairedDeviceService.listDeviceSummaries() -> PairedDeviceStore.listRecords() -> PhoneAccessCard renders store.devices`

Important current facts:

- `PairedDeviceStore` intentionally retains every valid device record in `remote-access/paired-devices.json`.
- `PairedDeviceService.revokeDevice()` and `revokeAllDevices()` mark `revokedAt`; they do not delete records.
- `RemoteAccessAuthService` needs retained revoked records so an old credential can be rejected as `REMOTE_ACCESS_DEVICE_REVOKED` instead of generic invalid credential.
- `GET /remote-access/devices` currently returns all stored summaries, including revoked summaries.
- `phoneAccessStore` already defines `activeDevices = devices.filter((device) => !device.revokedAt)`, but `PhoneAccessCard` renders `store.devices` directly.
- Local runtime data confirms the symptom: the current paired-device file has 20 records, 1 active and 19 revoked.

The phone setup guidance gap is adjacent:

- Android first-run UI and docs recommend stable Tailscale Serve HTTPS.
- The web Phone Access card only contains a short Tailscale hint and is not install-from-zero.
- The existing Docker guide pattern already proves that tutorial/setup content belongs in a separate tab and can use copyable command cards.
- Official Tailscale docs checked on 2026-05-22 confirm install pages for macOS, Windows, Linux, Android; `tailscale up`; and `tailscale serve [flags] <target>` with `--bg`, `status`, and `reset`.

Architecture review round 1 found two design-impact gaps now resolved in this revision:

- The design must distinguish the user-facing mobile shell URL from the internal server base URL.
- The design must choose a concrete HTTP policy rather than leaving block vs acknowledgement to implementation.

Current URL facts:

- Web `normalizeNodeBaseUrl()` strips API suffixes such as `/rest` and `/graphql`, but currently does not strip `/mobile`.
- Server remote-access `normalizeNodeBaseUrl()` currently preserves arbitrary pathnames, including `/mobile`.
- Android `NodeUrlNormalizer` already accepts `/mobile` and produces both clean `baseUrl` and `mobileUrl`.
- `RemoteAccessPairingService.buildMobileUrl()` currently uses `new URL("/mobile", serverBaseUrl)`, which works for origin-only URLs but drops an optional deployment base path such as `/autobyteus`.
- If the desktop payload stores `serverBaseUrl = https://host/mobile`, mobile status/exchange code appends `/rest/...` and can request `https://host/mobile/rest/...`, which is wrong.

## Intended Change

Create a clean Phone Setup surface and make active/revoked phone-device state plus phone URL identity explicit.

Target behavior:

- Node Manager has three top-level tabs: `Manage Nodes`, `Phone Setup`, `Docker Guide`.
- Manage Nodes contains node CRUD/current node/remote browser sharing only; it no longer embeds Phone Access controls.
- Phone Setup contains:
  - a new `PhoneSetupGuideCard` with install-from-zero Tailscale and Tailscale Serve HTTPS guidance;
  - `PhoneAccessCard` for enabling Phone Access, choosing the HTTPS reachable URL, creating QR/link, and viewing devices when the current window is the embedded/server node;
  - a simple unavailable-controls notice when opened from a remote-node window.
- `PhoneAccessCard` has separate Active and Revoked/History device views. Active rows have revoke actions. Revoked rows are non-actionable and never appear in the active view.
- Backend service/API expose active and revoked device summaries separately while retaining revoked records in persistence.
- New desktop-created Phone Access QR/pairing-session creation requires HTTPS. HTTP is blocked; no advanced HTTP acknowledgement escape hatch is added in this task.
- The canonical internal `serverBaseUrl` is the node API base URL: origin plus optional deployment base path, without `/mobile`, `/rest`, `/graphql`, `/ws`, query, or hash.
- The user-facing `mobileUrl` is derived from `serverBaseUrl` by appending `/mobile` while preserving any optional deployment base path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Feature + UX Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + File Placement Or Responsibility Drift + Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small/local
- Evidence:
  - Active vs revoked state is not enforced at the device listing boundary.
  - UI renders all retained records in an active list even though a local active filter exists.
  - Phone setup content lives in Manage Nodes while Docker setup already has a dedicated tab.
  - Current web/server URL normalizers allow `/mobile` to become part of `serverBaseUrl`, which breaks mobile REST path construction.
  - The prior design left HTTP block vs acknowledgement open.
- Design response:
  - Add explicit active/revoked service methods and REST boundaries.
  - Move Phone Access controls into a dedicated Phone Setup tab.
  - Add separate active/revoked device sub-views in `PhoneAccessCard`.
  - Add a phone setup guide card/command utility instead of growing `PhoneAccessCard` into a large tutorial blob.
  - Extend existing web/server node URL normalizers to strip recognized `/mobile` shell paths into the canonical internal base URL.
  - Add a mobile URL builder that appends `/mobile` while preserving optional base paths.
  - Block HTTP for new Phone Access QR/pairing-session creation in both frontend and backend.
- Refactor rationale:
  - Without explicit device-state boundaries, every caller must remember to filter revoked devices and the bug can recur.
  - Without a canonical base-vs-mobile URL boundary, a valid user-facing mobile URL can be stored as an invalid API base URL.
  - Without a concrete HTTP policy, implementers may preserve an unsafe normal path.
- Intentional deferrals and residual risk, if any:
  - Advanced revoked-history management (delete/export/search/bulk retention controls) is deferred. The simple revoked history view is in scope and sufficient to prevent active/history mixing.
  - Automated Tailscale detection/installation is deferred; this task provides user-followable instructions and copyable commands, not privileged installer automation.

## Terminology

- `Active paired device`: a retained device record whose `revokedAt` is `null` and whose credential may still be valid when Phone Access is enabled.
- `Revoked paired device`: a retained device record whose `revokedAt` is non-null; it is history/security state and must not be shown as active.
- `Phone Setup`: the node settings area that owns phone pairing setup, Tailscale HTTPS guidance, and Phone Access controls.
- `Canonical serverBaseUrl`: internal node API base URL, e.g. `https://desktop.tailnet.ts.net` or `https://gateway.example.com/autobyteus`; never includes `/mobile`, `/rest`, `/graphql`, `/ws`, query, or hash.
- `Mobile URL`: user-facing phone shell URL derived from `serverBaseUrl`, e.g. `https://desktop.tailnet.ts.net/mobile` or `https://gateway.example.com/autobyteus/mobile`.
- `Guided HTTPS path`: the normal user path that results in a stable HTTPS `mobileUrl` before QR creation.

## Design Reading Order

1. Device state/listing and URL identity spines.
2. Backend remote-access ownership vs frontend settings ownership.
3. File responsibilities and small refactors.
4. Tests/docs/localization mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the all-devices active-list behavior from the active Paired Phones UI.
- Required action: remove `/mobile` from the internal `serverBaseUrl` contract by normalization instead of preserving both old/new base representations.
- Required action: remove HTTP as an allowed new desktop QR/pairing-session creation path.
- The existing retained persistence records stay; persistence retention is not legacy UI behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Phone Setup | Active Paired Phones view renders only active records | `PhoneAccessCard` + `PairedDeviceService` active-list boundary | Main bug-fix path; prevents revoked noise in active UI. |
| DS-002 | Return-Event | User revokes active phone | Active row removed; revoked row appears only in history | `PairedDeviceService` revoke lifecycle | Ensures mutation result and refreshed list match user expectation. |
| DS-003 | Primary End-to-End | User opens Settings -> Nodes | Phone setup controls/guidance appear in Phone Setup tab | `NodeManager` tab composition | Separates phone setup from node CRUD and Docker guide. |
| DS-004 | Primary End-to-End | User reads Phone Setup guide and enters URL | Canonical HTTPS `serverBaseUrl` stored and user-facing `mobileUrl` shown/QR-created | URL normalization owner + `PhoneSetupGuideCard` + `PhoneAccessCard` | Security/UX path for install-from-zero Tailscale Serve setup without `/mobile/rest` bug. |
| DS-005 | Bounded Local | User switches Active/Revoked device sub-tab | Correct device list and actions render | `PhoneAccessCard` local device-view state | Prevents active/history mixing inside the card. |

## Primary Execution Spine(s)

- DS-001 active list:
  `Phone Setup Tab -> PhoneAccessCard -> phoneAccessStore.refreshDevices -> /remote-access/devices -> PairedDeviceService.listActiveDeviceSummaries -> PairedDeviceStore -> Active Paired Phones view`

- DS-002 revoke refresh:
  `Revoke button -> phoneAccessStore.revokeDevice -> DELETE /remote-access/devices/:deviceId -> PairedDeviceService.revokeDevice -> refresh active + revoked lists -> Active view removes row / History view gains row`

- DS-003 tab composition:
  `Settings Nodes section -> NodeManagerTabs -> NodeManager activeTab -> Phone Setup panel -> PhoneSetupGuideCard + PhoneAccessCard-or-unavailable-notice`

- DS-004 HTTPS setup and URL identity:
  `PhoneSetupGuideCard -> Tailscale Serve status/MagicDNS HTTPS mobile URL -> PhoneAccessCard primary manual HTTPS URL -> normalizeNodeBaseUrl strips /mobile -> phoneAccessStore validates https -> RemoteAccessPairingService validates https -> buildMobileUrlFromServerBaseUrl appends /mobile -> QR/mobileUrl uses /mobile while payload serverBaseUrl stays base`


## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The UI asks for active phones only. The backend service owns the active filter and returns records with `revokedAt === null`; the card renders those records as actionable paired phones. | Phone Setup UI, Phone Access store, REST device list, Paired Device service, paired-device persistence | `PairedDeviceService` for device-state semantics; `PhoneAccessCard` for display | Date formatting, localization, API transport, retained record persistence |
| DS-002 | Revoke transitions one active record into revoked state. The UI refreshes both active and revoked lists so the row disappears from Active and appears in History. | Revoke action, device service lifecycle, refreshed store state, active/history device views | `PairedDeviceService` | Confirmation, alert/info message, non-actionable revoked row rendering |
| DS-003 | Node settings chooses a tab. Phone setup is no longer embedded in Manage; Phone Setup owns phone-specific setup and controls/unavailable state. | NodeManagerTabs, NodeManager panel switch, Phone Setup panel | `NodeManager` | Localization, tab ARIA attributes, embedded-window gating |
| DS-004 | The guide teaches users to get a private HTTPS mobile URL. The controls accept either that mobile URL or a bare base, normalize to the canonical base, block HTTP, and ask the backend to create a QR whose payload uses the base while QR/WebView uses `/mobile`. | PhoneSetupGuideCard, PhoneAccessCard, phoneAccessStore, web/server URL normalizers, pairing service | `normalizeNodeBaseUrl` in web/server for base identity; `RemoteAccessPairingService` for payload/mobile URL construction | Clipboard copy, external docs links, platform labels, HTTPS error messaging |
| DS-005 | The PhoneAccessCard maintains a local active/revoked view selector so active actions and revoked history cannot share one row list. | Device view tabs, active list, revoked list | `PhoneAccessCard` | Empty states, counts, formatting, no-action history rows |

## Spine Actors / Main-Line Nodes

- `NodeManagerTabs`: tab chooser for node settings.
- `NodeManager`: authoritative panel composition owner for node settings tabs.
- `PhoneSetupGuideCard`: owner of phone setup/tutorial guidance and Tailscale command presentation.
- `PhoneAccessCard`: owner of phone-access controls, URL field warnings, and device list display.
- `phoneAccessStore`: frontend state/action boundary for remote-access settings, candidates, pairing sessions, active devices, revoked devices, URL normalization, HTTPS validation before API call.
- `AddressCandidateService`: backend owner for reachable URL candidates and accurate interface-derived candidate labels.
- Web `normalizeNodeBaseUrl`: frontend canonical server base URL normalizer.
- Server `normalizeNodeBaseUrl`: backend canonical server base URL normalizer.
- `RemoteAccessPairingService`: pairing payload/session/mobile URL owner.
- `remote-access.ts` REST routes: transport entrypoints for remote access settings/pairing/device/address-candidate commands.
- `PairedDeviceService`: authoritative device lifecycle/listing owner.
- `PairedDeviceStore`: persistence owner for retained paired-device records.
- `RemoteAccessAuthService`: auth owner that consumes retained records to classify revoked credentials.

## Ownership Map

| Node | Owns |
| --- | --- |
| `NodeManager` | Which high-level node settings panel is visible; separation of Manage/Phone Setup/Docker Guide concerns; embedded vs remote window Phone Setup unavailable-controls state. |
| `PhoneSetupGuideCard` | Static/durable setup flow, platform install pointers, Tailscale Serve commands, HTTPS mobile URL examples. |
| `PhoneAccessCard` | Phone Access UI controls, QR display, HTTPS-required warning display, active/revoked device sub-view state, per-device action availability. |
| `phoneAccessStore` | Fetching and holding settings/candidates/pairing/active devices/revoked devices; invoking API commands; normalizing user-entered URL to canonical base; blocking non-HTTPS before POST. |
| `AddressCandidateService` | Builds URL candidates and labels HTTP interface candidates accurately so the UI does not present a Tailscale IP as Tailscale Serve HTTPS. |
| Web `normalizeNodeBaseUrl` | Canonical frontend node base identity from user input or stored session; strips `/mobile`, API, WS suffixes while preserving optional deployment base path. |
| Server `normalizeNodeBaseUrl` | Canonical backend node base identity from pairing/address inputs; strips `/mobile`, API, WS suffixes while preserving optional deployment base path. |
| `RemoteAccessPairingService` | Pairing session lifecycle, HTTPS defense-in-depth, payload `serverBaseUrl`, and QR/mobile URL construction from canonical base. |
| `remote-access.ts` | HTTP transport mapping to remote-access services; explicit active/revoked device endpoints. |
| `PairedDeviceService` | Device creation, active/revoked state transitions, active/revoked summary list semantics, retained credential lookup. |
| `PairedDeviceStore` | Retained JSON records; no business interpretation beyond validity/normalization. |
| `RemoteAccessAuthService` | Credential authentication and revoked/disabled rejection classification. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `GET /remote-access/devices` | `PairedDeviceService.listActiveDeviceSummaries` | HTTP transport for active device list | Filtering policy outside service |
| `GET /remote-access/devices/revoked` | `PairedDeviceService.listRevokedDeviceSummaries` | HTTP transport for non-actionable history list | Revoked-row action policy |
| `DELETE /remote-access/devices/:deviceId` | `PairedDeviceService.revokeDevice` | HTTP transport for revoke command | Device state mutation logic outside service |
| `POST /remote-access/pairing-sessions` | `RemoteAccessPairingService.createPairingSession` | HTTP transport for QR/pairing creation | URL normalization/HTTPS rules outside pairing service |
| `PhoneSetupGuideCard` command buttons | `phoneSetupGuideCommands` utility | Reusable command data for rendering/testing | Tailscale lifecycle automation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Rendering `store.devices` as active paired phones | Mixes active and revoked state | Active endpoint/store state + Active view | In This Change | Direct bug fix. |
| Revoked timestamp inside active row rendering | Revoked rows no longer appear in active list | Revoked/History view row rendering | In This Change | Active rows should not need revoked state display. |
| `PhoneAccessCard` inside Manage Nodes panel | Phone setup does not belong in node CRUD flow | Phone Setup tab/panel | In This Change | Manage remains node CRUD/current-node/remote-browser sharing. |
| Catch-all Docker `v-else` panel in `NodeManager.vue` | Adding a third tab makes catch-all panel unsafe | Explicit `v-if` / `v-else-if` panels for manage/phoneSetup/dockerGuide | In This Change | Avoids accidental Docker render for unknown tab values. |
| Ambiguous `PairedDeviceService.listDeviceSummaries()` as UI active source | It returns all records and invites UI misuse | `listActiveDeviceSummaries()` and `listRevokedDeviceSummaries()` | In This Change | Keep internal all-record helper only if needed. |
| Misnamed `findActiveDeviceByCredential()` if it continues returning revoked records | Name conflicts with retained revoked lookup needed by auth | `findDeviceByCredential()` | In This Change | Auth must still classify revoked credentials precisely. |
| Preserving `/mobile` in `serverBaseUrl` | Causes `/mobile/rest/...` API calls | Web/server normalizers strip `/mobile`; pairing service builds `mobileUrl` separately | In This Change | Clean-cut canonical identity. |
| HTTP QR/pairing-session creation | Normal phone setup must be HTTPS | Frontend and backend HTTPS-required validation | In This Change | No advanced acknowledgement escape hatch. |

## Return Or Event Spine(s) (If Applicable)

- Revoke return path:
  `PairedDeviceService.revokeDevice -> REST response -> phoneAccessStore.refreshDevices -> PhoneAccessCard active/revoked views`

- Pairing QR return path:
  `RemoteAccessPairingService.createPairingSession -> REST response with payload.serverBaseUrl + mobileUrl -> phoneAccessStore.activePairing -> QR data URL render -> PhoneAccessCard QR panel`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `PhoneAccessCard`
  - `Device view tab click -> deviceListView ref -> active/revoked computed list selection -> row component/markup render`
  - Matters because action availability differs by state; active rows may revoke, revoked rows must not.

- Parent owner: `PhoneAccessCard`
  - `Selected/manual URL change -> normalized preview/error recompute -> Create QR enabled only when HTTPS canonical base is available`
  - Matters because HTTP is blocked before API call and `/mobile` input must normalize to base.

- Parent owner: `PhoneSetupGuideCard`
  - `Copy button click -> navigator.clipboard.writeText(command) -> copied state timer -> button feedback`
  - Mirrors Docker guide behavior and must stay local to guide UI.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization strings | DS-003, DS-004, DS-005 | UI components | English/zh-CN labels, descriptions, warnings | Existing settings UI is localized | Hard-coded user-facing text and failed localization guards |
| Command data utility | DS-004 | `PhoneSetupGuideCard` | Stable command/link metadata for rendering/tests | Keeps guide component from embedding long command arrays | Large mixed component hard to test/update |
| Clipboard copy feedback | DS-004 | `PhoneSetupGuideCard` | Copy command UX | Reuses Docker guide pattern | Setup guide becomes less actionable |
| HTTPS URL validation/error | DS-004 | `phoneAccessStore` / `PhoneAccessCard` / `RemoteAccessPairingService` | Block HTTP in UI/store and backend | Security posture for normal phone setup | Backend accepts unsafe defaults and guide is undermined |
| Mobile URL builder | DS-004 | `RemoteAccessPairingService` | Convert canonical base to `/mobile` URL preserving base path | Prevents base-vs-mobile representation overlap | `/mobile` leaks into API base or base path is dropped |
| Date formatting | DS-001, DS-005 | `PhoneAccessCard` | Human-readable device timestamps | Display concern only | Service starts owning presentation formatting |
| Retained JSON persistence | DS-001, DS-002 | `PairedDeviceService` | Durable records for auth/history | Enables revoked credential classification | UI deletes history and loses security diagnostics |
| Route-policy regression | DS-001, DS-005 | Remote access route policy | Ensure revoked endpoint is local-only | New management endpoint must not be mobile/public | History endpoint accidentally exposed remotely |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Device lifecycle/listing | `autobyteus-server-ts/src/remote-access` | Extend | Same remote access domain owns paired devices | N/A |
| Phone Access frontend state | `autobyteus-web/stores/phoneAccessStore.ts` | Extend | Existing store already owns settings/candidates/devices/pairing | N/A |
| Node settings tab composition | `autobyteus-web/components/settings/NodeManager.vue` | Extend | Existing tab owner | N/A |
| Web node URL normalization | `autobyteus-web/utils/nodeEndpoints.ts` | Extend | Existing canonical base URL normalizer used by phone store/mobile session store/node store | N/A |
| Server remote-access URL normalization | `autobyteus-server-ts/src/remote-access/services/url-normalization.ts` | Extend | Existing remote-access base URL normalizer used by candidates/pairing/client-facing URLs | N/A |
| Docker command guide pattern | `DockerNodeStartGuideCard` + `dockerNodeLauncherCommands` | Reuse pattern, not code | Similar copyable command UX, different domain | Phone commands are not Docker lifecycle and need separate utility |
| Phone setup guide | No existing dedicated component | Create New | Current hint is too small; putting setup in `PhoneAccessCard` would overload it | Existing Docker guide is domain-specific |
| Revoked history view | `PhoneAccessCard` | Extend | It is the device-list display owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server remote access | Paired device lifecycle, active/revoked list semantics, credential lookup, pairing HTTPS validation, canonical server base normalization, mobile URL building | DS-001, DS-002, DS-004 | `PairedDeviceService`, `RemoteAccessPairingService`, `RemoteAccessAuthService` | Extend | Add explicit active/revoked methods and URL/HTTPS hardening. |
| Web settings / Node Manager | Top-level Manage/Phone/Docker tab composition and remote-window Phone Setup unavailable notice | DS-003 | `NodeManager` | Extend | Add `phoneSetup` tab. |
| Web phone access UI | Phone Access controls, QR, active/revoked device views, URL field warning state | DS-001, DS-002, DS-004, DS-005 | `PhoneAccessCard`, `phoneAccessStore` | Extend | Split active/revoked lists and block HTTP. |
| Web phone setup guide | Install-from-zero Tailscale Serve HTTPS guidance | DS-004 | `PhoneSetupGuideCard` | Create New | Reuse Docker guide command-card pattern conceptually. |
| Web URL utilities | Canonical node base URL normalization and derived endpoints | DS-004 | `normalizeNodeBaseUrl`, `deriveNodeEndpoints` | Extend | Strip `/mobile` as a known app-surface suffix. |
| Localization/docs/tests | Durable user-facing strings and validation | All | Respective components/services | Extend | Required for long-term maintainability. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `PairedDeviceService` | Server remote access | Device lifecycle service | Add active/revoked list methods; rename retained credential lookup | Existing lifecycle owner | `PairedDeviceSummary` |
| `url-normalization.ts` (server) | Server remote access | Canonical base normalizer | Strip `/mobile`, API, WS suffixes; preserve optional base path; remove query/hash | Existing server normalizer owner | URL APIs |
| `remote-access-pairing-service.ts` | Server remote access | Pairing owner | Enforce HTTPS; store payload/session/device base URL; build mobile URL preserving base path | Existing pairing owner | `RemoteAccessPairingPayload` |
| `address-candidate-service.ts` | Server remote access | Candidate owner | Candidate labels/kinds for loopback, LAN, Tailscale-like IP, and manual URLs | Existing candidate owner | `RemoteAccessUrlCandidate` |
| `remote-access.ts` | Server remote access transport | REST facade | Add revoked endpoint; map active endpoint to active service method; return address candidates; return HTTPS errors | Existing route owner | Existing models |
| `nodeEndpoints.ts` (web) | Web URL utilities | Canonical base normalizer | Strip `/mobile`, API, WS suffixes; preserve optional base path; tests for `/mobile` input | Existing frontend normalizer owner | `NodeEndpoints` |
| `phoneAccessStore.ts` | Web phone access UI | Store/API client | Store active/revoked lists separately; refresh both; normalize URL; block HTTP before POST | Existing frontend state owner | `PairedDeviceSummary` |
| `PhoneAccessCard.vue` | Web phone access UI | UI control owner | Render controls, QR, active/revoked sub-tabs, HTTPS-required warning/disabled state | Existing Phone Access card owner | Store state |
| `PhoneSetupGuideCard.vue` | Web phone setup guide | Guide component | Render install steps, command cards, security notes, mobile URL/base URL explanation | New guide is substantial enough for own component | `phoneSetupGuideCommands` |
| `phoneSetupGuideCommands.ts` | Web phone setup guide | Command metadata owner | Platform install link metadata and Tailscale Serve commands | Keeps guide data testable/reusable | Command type |
| `NodeManager.vue` | Web settings / Node Manager | Tab panel owner | Add Phone Setup panel; move PhoneAccessCard; add remote-window unavailable notice | Existing composition owner | Tab ID type |
| `NodeManagerTabs.vue` | Web settings / Node Manager | Tab chooser | Add Phone Setup tab metadata | Existing tab list owner | Localization keys |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Phone setup command/link metadata | `autobyteus-web/utils/phoneSetupGuideCommands.ts` | Web phone setup guide | Used by component and tests; mirrors Docker utility pattern | Yes | Yes | Generic setup guide utility for unrelated domains |
| Device state filtering | `PairedDeviceService` methods, not a generic util | Server remote access | State semantics belong to paired-device lifecycle owner | Yes | Yes | Repeated frontend filters across callers |
| Frontend active/revoked device state | `phoneAccessStore.ts` refs/getters | Web phone access UI | Components should consume named state, not filter ad hoc | Yes | Yes | Duplicated all-devices list that components reinterpret |
| Base vs mobile URL conversion | Existing web/server URL normalizers + pairing service mobile URL builder | Web URL utilities / Server remote access | Same conversion is needed for manual field, payload creation, mobile session store, backend pairing validation | Yes | Yes | A separate ad hoc phone-only normalizer that diverges from node endpoint derivation |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `PairedDeviceSummary` | Yes | Yes | Low | Keep same DTO for active and revoked lists; state is explicit through `revokedAt` and endpoint/list ownership. |
| `RemoteAccessPairingPayload.serverBaseUrl` | Yes after revision | Yes | Low | Define as canonical internal base only; normalizers strip `/mobile`. |
| `CreatePairingSessionResult.mobileUrl` | Yes | Yes | Low | Define as user-facing mobile shell URL, derived from canonical base. |
| `RemoteAccessUrlCandidate` | Yes | Yes | Medium currently | Keep candidate kind/metadata clear enough that HTTP interface candidates are not treated as recommended HTTPS pairing targets. |
| `PhoneSetupGuideCommand` (new) | Yes | Yes | Low | Include only id/group/platform/title/description/command or link; do not mix Docker fields. |
| Store device state | Yes | Yes | Medium currently | Replace `devices` as all-purpose UI list with `activeDevices` and `revokedDevices` refs or clearly named getters. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | Server remote access | Paired device lifecycle | Create/revoke devices; list active summaries; list revoked summaries; find retained device by credential | One domain lifecycle owner | `PairedDeviceRecord`, `PairedDeviceSummary` |
| `autobyteus-server-ts/src/remote-access/services/url-normalization.ts` | Server remote access | Canonical server base normalizer | Normalize node base and strip recognized app/API surfaces including `/mobile` | Existing remote-access URL normalizer | URL |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Server remote access | Pairing lifecycle and URL contract | Enforce HTTPS; store canonical `serverBaseUrl`; construct `mobileUrl` from base without dropping base path | Existing pairing owner | `RemoteAccessPairingPayload` |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Server remote access | URL candidate policy | Return loopback/interface/manual candidates with accurate labels/kinds; do not inspect or control Tailscale | Existing candidate service owner | `RemoteAccessUrlCandidate` |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Server remote access | REST transport | Address candidates endpoint, active devices endpoint, revoked devices endpoint, revoke commands, pairing session errors | One remote-access REST entrypoint | Service methods |
| `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Server remote access | Auth owner | Use retained credential lookup and classify revoked credentials | Auth classification owner | Paired device service |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Server remote access security | Route classification | Ensure revoked devices endpoint remains local-only | Existing route policy owner | No route handlers |
| `autobyteus-web/utils/nodeEndpoints.ts` | Web URL utilities | Canonical base normalizer / endpoint derivation | Strip `/mobile` and API/WS suffixes; preserve optional base path | Existing frontend endpoint utility | Phone UI state |
| `autobyteus-web/stores/phoneAccessStore.ts` | Web phone access UI | Store/API client | Load settings/candidates/active/revoked devices; normalize selected URL; block HTTP; create QR | Existing Phone Access frontend state owner | Remote access types |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Web phone access UI | Phone Access control UI | Enable access, select URL, show HTTPS-required warning, create QR, render active/revoked device views | Existing control card, not setup tutorial | Store state |
| `autobyteus-web/components/settings/PhoneSetupGuideCard.vue` | Web phone setup guide | Setup guide UI | Install-from-zero Tailscale and Serve HTTPS steps, macOS app-direct Serve commands, MagicDNS URL guidance, copyable commands, base-vs-mobile URL note | New tutorial concern separate from controls | Command metadata utility |
| `autobyteus-web/utils/phoneSetupGuideCommands.ts` | Web phone setup guide | Command/link data | Platform install link metadata and Serve command metadata | Testable data owner | Local command type |
| `autobyteus-web/components/settings/NodeManager.vue` | Web settings / Node Manager | Panel composition | Three explicit panels; move PhoneAccessCard into Phone Setup; show remote-window unavailable note | Existing tab panel owner | `NodeManagerTabId` |
| `autobyteus-web/components/settings/NodeManagerTabs.vue` | Web settings / Node Manager | Tab list | Add Phone Setup tab | Existing tablist owner | Localization keys |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | English settings strings | New tab, guide, active/revoked labels, HTTPS errors, unavailable note | Existing settings messages | N/A |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese settings strings | Same keys translated | Existing settings messages | N/A |
| `autobyteus-web/docs/remote_access.md` | Docs | Remote access guide | Updated Phone Setup, base-vs-mobile URL contract, HTTPS-required behavior, active-history behavior | Existing remote access guide | Release notes |
| `autobyteus-web/docs/settings.md` | Docs | Settings guide | Node tabs include Phone Setup | Existing settings guide | Low-level implementation details |

## Ownership Boundaries

- `PairedDeviceService` is the authoritative owner for active vs revoked device state. UI and route code must not independently decide list semantics from raw records.
- `PairedDeviceStore` remains persistence-only. It must not filter active/revoked by itself because filtering is domain state semantics, not storage mechanics.
- `RemoteAccessPairingService` is the authoritative backend owner for pairing URL contracts: payload/session/device `serverBaseUrl` is canonical base; returned `mobileUrl` is derived shell URL; HTTP is rejected.
- Web and server `normalizeNodeBaseUrl` functions are the authoritative normalization boundaries in their runtimes. Callers must not hand-roll `/mobile` stripping.
- `RemoteAccessAuthService` owns auth classification. It can ask for a retained device by credential and then reject revoked devices precisely.
- `NodeManager` owns top-level settings tab composition. Individual card components do not decide which top-level tab they belong to.
- `PhoneSetupGuideCard` owns setup/tutorial content. `PhoneAccessCard` owns operational controls and URL validation feedback; do not put long install instructions inside `PhoneAccessCard`.
- `phoneAccessStore` owns frontend API state and command validation. Components should consume `activeDevices` / `revokedDevices` and `selectedUrlValidation` rather than filtering or parsing ad hoc.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PairedDeviceService.listActiveDeviceSummaries()` | Store record read + `revokedAt === null` semantics | REST routes | REST route reads store and filters records directly | Add service method parameters or explicit methods |
| `PairedDeviceService.listRevokedDeviceSummaries()` | Store record read + non-null `revokedAt` semantics | REST routes | Frontend gets all records and filters history itself | Add revoked route/service method |
| Server `normalizeNodeBaseUrl()` | Strip known app/API surfaces including `/mobile`; remove query/hash | Pairing service, address candidates, client-facing resolver | Pairing service does string replace on `/mobile` itself | Extend normalizer tests and behavior |
| Web `normalizeNodeBaseUrl()` | Strip known app/API surfaces including `/mobile`; remove query/hash | `phoneAccessStore`, mobile session store, node endpoint derivation | Component parses mobile URL manually | Extend normalizer tests and behavior |
| `RemoteAccessPairingService.createPairingSession()` | Settings check, canonical base, HTTPS defense-in-depth, payload/mobileUrl construction | REST route | Route builds payload/mobile URL or accepts HTTP | Strengthen service input/return contract |
| `phoneAccessStore.activeDevices/revokedDevices` | API calls and state refresh sequencing | `PhoneAccessCard` | Component renders all-device array and interprets state | Strengthen store state shape |
| `phoneAccessStore.createPairingSession()` | URL normalization and HTTP no-POST validation | `PhoneAccessCard` | Component calls API directly after local-only parsing | Add store-level validation result/state |
| `NodeManager` tab panel | Top-level settings composition | Settings page | Cards self-register into arbitrary panels | Add explicit tab/panel mapping |
| `PhoneSetupGuideCard` | Setup steps, links, command copy | Phone Setup panel | Embed long Tailscale instructions in `NodeManager` or `PhoneAccessCard` | Add guide-specific props/utility |

## Dependency Rules

Allowed:

- `NodeManager.vue` may import `PhoneSetupGuideCard`, `PhoneAccessCard`, and `DockerNodeStartGuideCard` for panel composition.
- `PhoneAccessCard.vue` may depend on `phoneAccessStore` and QR service.
- `PhoneSetupGuideCard.vue` may depend on `phoneSetupGuideCommands.ts` and localization.
- `phoneAccessStore.ts` may depend on web `normalizeNodeBaseUrl`.
- `RemoteAccessPairingService` may depend on server `normalizeNodeBaseUrl` and its own mobile URL builder helper.
- REST routes may call `PairedDeviceService` and pairing/settings services.
- `RemoteAccessAuthService` may call `PairedDeviceService.findDeviceByCredential()`.

Forbidden:

- UI components must not render retained all-device records as active rows.
- REST routes must not directly read/filter `PairedDeviceStore` records.
- No component, store, or service may preserve `/mobile` inside a value named `serverBaseUrl`.
- `PhoneSetupGuideCard` must not mutate Phone Access settings or create pairing sessions.
- `PhoneAccessCard` must not own platform install guide command arrays.
- Docker guide command utilities must not be reused as a generic command framework if doing so introduces Docker naming or fields into phone setup.
- Do not create compatibility branches that show revoked entries in Active for old behavior.
- Do not add an HTTP acknowledgement escape hatch in this task.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `GET /remote-access/devices` | Active paired devices | Return active device summaries only | None | Clean-cut changed semantics from all retained to active. |
| `GET /remote-access/devices/revoked` | Revoked paired devices | Return non-actionable revoked summaries | None | Separate history boundary; local-only. |
| `DELETE /remote-access/devices/:deviceId` | One paired device | Mark device revoked | `deviceId` | Refresh active/revoked lists after success. |
| `DELETE /remote-access/devices` | Active paired devices | Revoke all active devices | None | Existing count remains active-only. |
| `PairedDeviceService.listActiveDeviceSummaries()` | Active paired devices | Active list semantics | None | Used by active endpoint. |
| `PairedDeviceService.listRevokedDeviceSummaries()` | Revoked paired devices | Revoked/history list semantics | None | Used by history endpoint. |
| `PairedDeviceService.findDeviceByCredential(credential)` | Retained device credential lookup | Find any retained matching credential | Raw credential string | Allows auth to classify revoked vs invalid. |
| Web `normalizeNodeBaseUrl(input)` | Canonical frontend node base | Accept base, `/mobile`, API, GraphQL, WS URL and return canonical base | URL string | `https://host/mobile?pairing=x` -> `https://host`. |
| Server `normalizeNodeBaseUrl(input)` | Canonical backend node base | Accept base, `/mobile`, API, GraphQL, WS URL and return canonical base | URL string | Also used defensively in pairing service. |
| `RemoteAccessPairingService.createPairingSession({ serverBaseUrl, serverName })` | Pairing session | Normalize base, require HTTPS, create payload/session/mobileUrl | `serverBaseUrl` may be base or `/mobile` input but normalized before storage | Rejects HTTP. |
| `phoneAccessStore.refreshDevices()` | Frontend device state | Refresh active and revoked device lists | None | Should update both lists together after revoke. |
| `phoneAccessStore.createPairingSession()` | Pairing setup | Normalize selected URL, require HTTPS, avoid POST on HTTP, create QR | Selected/manual URL string | No `allowInsecureHttp` option. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `GET /remote-access/devices` | Yes | Yes | Low | Make active semantics explicit in route/docs/tests. |
| `GET /remote-access/devices/revoked` | Yes | Yes | Low | Non-actionable history only. |
| `findDeviceByCredential` | Yes | Yes | Low | Rename from misleading active name if needed. |
| `normalizeNodeBaseUrl` web/server | Yes | Yes | Low after revision | Add `/mobile` stripping and tests. |
| `RemoteAccessPairingService.createPairingSession` | Yes | Yes | Low after revision | Enforce HTTPS and mobile URL builder tests. |
| `phoneAccessStore.createPairingSession` | Yes | Yes | Low after revision | No HTTP acknowledgement option; no POST on HTTP. |
| `phoneAccessStore.activeDevices` | Yes | Yes | Low | Use in Active view only. |
| `phoneAccessStore.revokedDevices` | Yes | Yes | Low | Use in Revoked/History view only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Top-level phone tab | `phoneSetup` / `Phone Setup` | Yes | Low | Add localization key. |
| Active device list | `activeDevices` / `listActiveDeviceSummaries` | Yes | Low | Use everywhere active rows are meant. |
| Revoked device list | `revokedDevices` / `listRevokedDeviceSummaries` | Yes | Low | Use in history tab. |
| Credential lookup | `findActiveDeviceByCredential` current | No if it returns revoked | Medium | Rename to `findDeviceByCredential`. |
| Setup guide | `PhoneSetupGuideCard` | Yes | Low | Do not call it Tailscale-only; it owns broader phone setup. |
| Internal base URL | `serverBaseUrl` | Yes with contract | Low | Document and test no `/mobile`. |
| User-facing mobile URL | `mobileUrl` | Yes | Low | Derive only from canonical base. |

## Applied Patterns (If Any)

- Tabbed panel composition: existing `NodeManagerTabs`/`NodeManager` pattern extended to a third tab.
- Local sub-tab state: `PhoneAccessCard` uses a bounded local active/revoked device view selector.
- Command-card guide: new phone guide follows the proven Docker guide pattern for copyable commands, but with its own data utility and labels.
- Explicit service boundary: paired-device active/revoked state is represented by named service methods rather than ad hoc filters.
- Normalizer boundary: existing URL normalizers become the owned conversion point from user-entered surface URLs to canonical server base.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | File | Paired device lifecycle | Active/revoked listing, revoke, retained credential lookup | Existing service owner | HTTP concerns, date display formatting |
| `autobyteus-server-ts/src/remote-access/services/url-normalization.ts` | File | Canonical server base normalizer | Strip `/mobile`, API, WS suffixes; preserve optional base path | Existing server normalizer | Pairing session state |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | File | Pairing owner | HTTPS enforcement; base/mobile URL conversion; pairing session lifecycle | Existing pairing service | UI warning copy |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | File | REST facade | Route address candidates, active/revoked devices, and pairing commands | Existing remote-access REST owner | Store filtering, UI policy text |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | File | Route security policy | Classify revoked endpoint local-only | Existing security owner | Handler implementation |
| `autobyteus-web/utils/nodeEndpoints.ts` | File | Canonical frontend base normalizer | Strip `/mobile`, API, WS suffixes; preserve optional base path | Existing frontend endpoint owner | Phone Access UI state |
| `autobyteus-web/components/settings/NodeManager.vue` | File | Node settings composition | Explicit manage/phoneSetup/docker panels; remote-window unavailable state | Existing node settings component | Long setup command data |
| `autobyteus-web/components/settings/NodeManagerTabs.vue` | File | Node settings tablist | Three tab labels/ARIA IDs | Existing tablist component | Panel rendering |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | File | Phone Access controls | Enable access, URL/QR, HTTPS error, active/revoked device views | Existing phone controls component | Install-from-zero Tailscale guide content |
| `autobyteus-web/components/settings/PhoneSetupGuideCard.vue` | File | Phone setup guide | Install, connect, serve HTTPS, copy commands, base/mobile explanation | Dedicated setup tutorial component | Phone Access API mutation/control logic |
| `autobyteus-web/utils/phoneSetupGuideCommands.ts` | File | Phone setup guide data | Install links and command metadata | Existing utilities area for testable command builders | Docker launcher command concerns |
| `autobyteus-web/localization/messages/en/settings.ts` | File | English localization | New user-facing strings | Existing settings messages | Hard-coded generated-only keys |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | File | Chinese localization | New translated strings | Existing settings messages | English-only fallback for new UI |
| `autobyteus-web/docs/remote_access.md` | File | Durable remote access docs | Updated Phone Setup/HTTPS/base-mobile/active-history behavior | Existing remote access guide | Release notes |
| `autobyteus-web/docs/settings.md` | File | Durable settings docs | Node tabs include Phone Setup | Existing settings guide | Low-level implementation details |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services` | Main-Line Domain-Control | Yes | Low | Existing service folder owns remote-access domain behavior and URL normalization. |
| `autobyteus-server-ts/src/api/rest` | Transport | Yes | Low | Existing REST route folder. |
| `autobyteus-server-ts/src/api/security` | Transport/security policy | Yes | Low | Existing route policy owner. |
| `autobyteus-web/components/settings` | Mixed Justified | Yes | Medium | Existing settings components are flat; adding focused cards is consistent. Avoid stuffing guide into existing cards. |
| `autobyteus-web/utils` | Off-Spine Concern | Yes | Low | Existing pattern for endpoint and command utilities. |
| `autobyteus-web/localization/messages` | Off-Spine Concern | Yes | Low | Existing localization structure. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active/revoked lists | `GET /remote-access/devices` -> active only; `GET /remote-access/devices/revoked` -> history only | One `/devices` response rendered as active rows with disabled revoked buttons | Prevents recurrence of current bug. |
| Phone setup tab | `NodeManagerTabs: Manage, Phone Setup, Docker Guide` | Phone setup controls and Tailscale tutorial inside Manage Nodes | Keeps node CRUD separate from setup/tutorial workflows. |
| Base vs mobile URL | Input `https://desktop.tailnet.ts.net/mobile` -> canonical `serverBaseUrl = https://desktop.tailnet.ts.net`; QR/mobileUrl `https://desktop.tailnet.ts.net/mobile?pairing=...`; mobile status `https://desktop.tailnet.ts.net/rest/remote-access/status` | Store `serverBaseUrl = https://desktop.tailnet.ts.net/mobile` and request `https://desktop.tailnet.ts.net/mobile/rest/...` | Resolves AR-001 and prevents broken mobile API paths. |
| Base-path preservation | Input `https://gateway.example.com/autobyteus/mobile` -> base `https://gateway.example.com/autobyteus`; mobile URL `https://gateway.example.com/autobyteus/mobile` | `new URL("/mobile", base)` dropping `/autobyteus` | Existing endpoint utilities support base paths; mobile builder must not regress that. |
| HTTPS pairing validation | Selected `https://desktop.tailnet.ts.net/mobile` creates QR; selected `http://192.168.1.25:29695` shows HTTPS-required error and makes no POST | Short text says “prefer HTTPS” but QR still defaults to HTTP LAN candidate | Resolves AR-002 and aligns with user security requirement. |
| Phone guide command data | `phoneSetupGuideCommands.ts` returns install links and commands | Long hard-coded array in `PhoneSetupGuideCard.vue` mixed with rendering | Makes commands testable and updateable. |
| Revoked history UI | Active tab has Revoke buttons; Revoked tab has no actions | A single list where some rows have disabled Revoke | Users can understand current access state. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `/remote-access/devices` returning all records and only filter in the component | Minimal change | Rejected | Make active route/service semantics explicit; add separate revoked endpoint. |
| Keep revoked rows in Active with disabled buttons | Shows history without a new view | Rejected | Separate Revoked/History view. |
| Leave PhoneAccessCard in Manage and only add a guide link | Minimal navigation change | Rejected | Add Phone Setup tab and move phone controls there. |
| Allow HTTP QR creation with an advanced acknowledgement | Existing LAN workflow may rely on HTTP | Rejected | Block HTTP for new desktop-created QR/pairing sessions in frontend and backend. |
| Preserve `/mobile` inside `serverBaseUrl` for old inputs | Avoids changing normalizers | Rejected | Canonical serverBaseUrl strips `/mobile`; mobileUrl derives from base. |
| Use `new URL("/mobile", serverBaseUrl)` for mobile URL construction | Existing code shape | Rejected | Use base-path-preserving builder. |
| Reuse Docker command utility for phone guide | Similar command cards | Rejected | Create phone-specific command utility to avoid mixed domain fields. |
| Delete revoked records instead of retaining | Would remove rows from all lists | Rejected | Retention supports revoked credential classification and history. |

## Derived Layering (If Useful)

- Server transport/security: `api/rest/remote-access.ts`, `api/security/remote-access-route-policy.ts`.
- Server domain/control: `remote-access/services/paired-device-service.ts`, `remote-access-pairing-service.ts`, `remote-access-auth-service.ts`, `url-normalization.ts`.
- Server persistence: `remote-access/stores/paired-device-store.ts`.
- Web URL utilities: `utils/nodeEndpoints.ts`.
- Web composition: `components/settings/NodeManager.vue`, `NodeManagerTabs.vue`.
- Web control UI: `PhoneAccessCard.vue`.
- Web guide UI/off-spine data: `PhoneSetupGuideCard.vue`, `utils/phoneSetupGuideCommands.ts`.

## Migration / Refactor Sequence

1. URL identity first:
   - Extend web `normalizeNodeBaseUrl()` to strip recognized `/mobile` shell paths, including `/mobile`, `/mobile/`, `/mobile?...`, and `/mobile/<subpath>`, while preserving any prefix before `/mobile`.
   - Extend server `normalizeNodeBaseUrl()` with equivalent behavior for `/mobile`, API, GraphQL, and WS suffixes while preserving optional base path.
   - Add tests: `https://desktop.tailnet.ts.net/mobile?pairing=x -> https://desktop.tailnet.ts.net`; `https://gateway.example.com/autobyteus/mobile -> https://gateway.example.com/autobyteus`.
2. Pairing service URL contract:
   - Add/adjust a helper such as `buildMobileUrlFromServerBaseUrl(serverBaseUrl, payload)` that appends `/mobile` to the canonical base path and preserves optional base path.
   - Enforce HTTPS in `createPairingSession()` after normalization. Reject `http:` with a 400-style error.
   - Add tests for HTTPS success, HTTP rejection, mobile input stripping, base-path-preserving mobile URL construction, and pairing exchange matching.
3. Backend paired-device semantics:
   - Add `listActiveDeviceSummaries()` and `listRevokedDeviceSummaries()` to `PairedDeviceService`.
   - Rename `findActiveDeviceByCredential()` to `findDeviceByCredential()` if it continues returning revoked records for auth classification.
   - Keep revoke methods marking `revokedAt` and retaining records.
4. Backend routes and route policy:
   - Change `GET /remote-access/devices` to active summaries.
   - Add `GET /remote-access/devices/revoked` for history summaries.
   - Keep `GET /remote-access/address-candidates` routed through the existing candidate service; it must not execute Tailscale commands or inspect local Tailscale state.
   - Add route-policy regression that `/rest/remote-access/devices/revoked` is local-only for loopback and rejected for non-loopback unauthenticated/mobile callers.
5. Frontend store:
   - Replace all-purpose UI `devices` usage with `activeDevices` and `revokedDevices` state.
   - Update `loadAll()` / `refreshDevices()` to fetch both active and revoked endpoints.
   - Ensure `revokeDevice()` and `revokeAllDevices()` refresh both lists.
   - Normalize selected/manual URL through web `normalizeNodeBaseUrl()`.
   - Under the HTTPS-required phone setup posture, do not auto-select an HTTP local/tailnet-IP candidate by default. If no HTTPS candidate exists, leave the target empty and require the user to paste the Serve HTTPS URL into the manual field.
   - Add store-level validation: if normalized protocol is not `https:`, set a localized/typed HTTPS-required error and do not POST.
6. Phone Access UI:
   - Update `PhoneAccessCard` to render Active and Revoked/History views.
   - Active view uses active devices and Revoke actions.
   - Revoked view uses revoked devices and no Revoke action.
   - Ensure Revoke all is based on active count.
   - Make the manual HTTPS URL field visually primary for QR creation, with copy such as: “After `tailscale serve status`, paste the HTTPS URL here and add `/mobile`.”
   - De-emphasize automatically listed HTTP interface candidates as advanced/local diagnostics. A Tailscale `100.x.y.z` candidate is only a Tailscale private IP address, not the Tailscale Serve HTTPS origin.
   - Show HTTPS-required warning/error near the URL field/create button when selected/manual URL normalizes to HTTP.
7. Phone Setup tab:
   - Add `phoneSetup` to `NodeManagerTabId` and `NodeManagerTabs`.
   - Make `NodeManager.vue` use explicit panel branches for manage/phoneSetup/dockerGuide.
   - Move `PhoneAccessCard` into Phone Setup panel for embedded-node windows.
   - Add remote-node unavailable-controls note when `windowNodeContextStore.isEmbeddedWindow` is false.
   - Add `PhoneSetupGuideCard` above or beside `PhoneAccessCard` in the Phone Setup panel.
8. Phone setup guide:
   - Add `phoneSetupGuideCommands.ts` with install links and command groups.
   - Add guide component with copy buttons and HTTPS/base-vs-mobile URL explanation.
   - Include install-from-zero pointers for macOS, Windows, Linux, Android.
   - For macOS, treat the installed Tailscale.app as the primary user path: users can sign in, confirm MagicDNS, and inspect IPv4/IPv6 in the app UI; command cards should use the app's bundled executable directly for Serve, for example `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695`.
   - For non-macOS and users who already have a CLI alias, include generic `tailscale serve --bg 29695`, `tailscale serve status`, and `tailscale serve reset` commands.
   - Include an explicit “what next?” step after Serve status: if status prints `https://<machine>.<tailnet>.ts.net (tailnet only) |-- / proxy http://127.0.0.1:29695`, the URL to paste into AutoByteus is `https://<machine>.<tailnet>.ts.net/mobile` without `:29695`.
9. Localization/docs/tests:
   - Add English and Chinese settings strings.
   - Update `remote_access.md` with canonical base-vs-mobile contract and HTTPS-required QR creation.
   - Update `settings.md` for Phone Setup tab.
   - Extend `NodeManager.spec.ts`; add/extend `PhoneAccessCard` tests, including “HTTP-only candidates are not auto-selected as QR target” and “manual Serve HTTPS URL enables QR creation”; add `PhoneSetupGuideCard`/command utility tests; add backend candidate service tests and route-policy tests.
10. Final cleanup:
   - Remove any stale direct rendering of `store.devices` as active list.
   - Remove any `v-else` Docker catch-all.
   - Verify no active UI displays revoked rows.
   - Verify no code path writes `/mobile` into pairing payload/session/device `serverBaseUrl`.

## Key Tradeoffs

- Separate backend active/revoked endpoints are slightly more work than a frontend filter, but they make the invariant durable and prevent every caller from reimplementing state policy.
- Extending existing normalizers instead of creating phone-only normalizers avoids two conflicting definitions of node base URL; the tradeoff is that `/mobile` becomes a reserved app-surface suffix in generic node URL normalization.
- Blocking HTTP may inconvenience local LAN testing, but it is the requested and safer normal phone setup posture and prevents QR creation with insecure origins.
- The guide uses instructions/links rather than automatic Tailscale installation because installation requires OS-specific privileges and user account sign-in.

## Risks

- Tailscale CLI syntax can change; docs were checked on 2026-05-22 and should be cited in docs/comments where practical.
- macOS users may have Tailscale.app installed but not the `tailscale` CLI in PATH. The guide must not make CLI-wrapper installation the normal path. Use the app UI for sign-in/status/MagicDNS and use the app's bundled executable directly for Serve command cards. If wrapper/installer guidance is included, keep it behind optional troubleshooting copy because the bundled AppleScript can fail on bundle-id mismatches.
- Existing tests may need additional mocks because moving `PhoneAccessCard` into a new tab changes default NodeManager render expectations.
- If another consumer expects `/remote-access/devices` to include revoked records, the clean-cut route change will require updating that consumer. Current investigation found the web store as the relevant consumer.
- If a deployment genuinely uses `/mobile` as an external base path rather than the app shell path, stripping `/mobile` would be wrong; this is accepted because `/mobile` is an AutoByteus app shell route and the task requires mobile URL normalization.

## Guidance For Implementation

- Do not delete revoked records from `paired-devices.json` as part of this task.
- Treat `revokedAt` as state, not display decoration in the active list.
- Treat `serverBaseUrl` as API base only. Never store `/mobile` in it.
- Treat `mobileUrl` as derived display/WebView URL only.
- Block HTTP QR creation in both frontend and backend. Do not add an acknowledgement checkbox in this task.
- Keep the Phone Setup guide readable for non-technical users: short step headings, copy buttons, and an explicit “use the printed HTTPS URL before creating QR” note.
- Do not let the address dropdown teach the wrong next step. Interface-derived candidates such as `http://100.x.y.z:29695` or `http://192.168.x.x:29695` are HTTP diagnostics under this HTTPS-required flow. They must not be auto-selected as the QR target. The manual Serve HTTPS URL field is primary.
- Recommended guide command set and macOS app-first note:

```bash
# Linux install option; macOS/Windows/Android should link to official download/install pages.
curl -fsSL https://tailscale.com/install.sh | sh

# macOS with Tailscale.app installed:
# Sign in and confirm MagicDNS/addresses in the Tailscale app UI.
# Use the bundled app executable directly for Serve; no CLI wrapper is required.
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve 29695
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve reset

# Optional advanced macOS shortcut only if the user wants to type `tailscale`:
# The bundled installer script may fail on bundle-id mismatches, so do not make it
# the primary setup path. A manual wrapper is safer if users want the alias.
sudo sh -c 'cat > /usr/local/bin/tailscale <<"EOF"
#!/bin/sh
exec /Applications/Tailscale.app/Contents/MacOS/Tailscale "$@"
EOF
chmod +x /usr/local/bin/tailscale'

# Generic CLI path for Linux/Windows or macOS users who already have the alias.
# Connect/authenticate the desktop or server node to Tailscale if not already signed in.
tailscale up

# Confirm the desktop/server and phone are in the tailnet.
tailscale status

# Serve AutoByteus over private tailnet HTTPS in the foreground.
tailscale serve 29695

# Or keep Serve running in the background.
tailscale serve --bg 29695

# Inspect current Serve configuration.
tailscale serve status

# Clear Serve configuration if you need to start over.
tailscale serve reset
```

- Show target URL shape near the command cards:

```text
https://<machine>.<tailnet>.ts.net/mobile
```


- Also show the internal contract in plain language:
  - “You may paste the `/mobile` URL here. AutoByteus stores the clean server base internally and creates the QR with `/mobile`.”
- Concrete expected conversion:

```text
Input:              https://desktop.tailnet.ts.net/mobile
Stored serverBase:  https://desktop.tailnet.ts.net
QR/mobileUrl:       https://desktop.tailnet.ts.net/mobile?pairing=...
Status/exchange:    https://desktop.tailnet.ts.net/rest/remote-access/...
```


- macOS/Tailscale app UI guidance:
  - Use the MagicDNS hostname shown by Tailscale for the HTTPS URL.
  - Preferred URL shape: `https://<MagicDNS-name>/mobile`.
  - IPv4/IPv6 addresses are useful for diagnostics but are not the preferred HTTPS Serve URL because the Serve certificate/hostname path is tied to MagicDNS.

- State clearly that public Funnel is not the recommended path for this phone setup; use private tailnet Serve HTTPS.
- Validation commands before handoff should include targeted backend remote-access tests, route-policy test for `/devices/revoked`, frontend node endpoint normalization tests, and targeted frontend settings/PhoneAccess/guide tests.
