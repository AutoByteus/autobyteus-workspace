# Design Spec

## Current-State Read

The current Phone Setup path is no longer a two-mode private-network setup. It is effectively an HTTPS-only/Tailscale-Serve funnel even though backend address discovery still produces Local LAN candidates.

Current embedded-node path:

`Settings -> Nodes -> Phone Setup -> PhoneAccessCard -> phoneAccessStore.loadAll() -> /remote-access/address-candidates -> address candidates dropdown -> selectedUrlValidation -> Create QR button -> phoneAccessStore.createPairingSession() -> /remote-access/pairing-sessions -> RemoteAccessPairingService`

Current facts from investigation:

- `AddressCandidateService` still emits `lan` candidates such as `http://192.168.x.x:29695` and `tailnet_like` candidates such as `http://100.x.y.z:29695`; Local LAN discovery is not removed.
- `PhoneAccessCard.canCreatePairingSession` requires `store.selectedUrlValidation.isHttps`, so selecting Local LAN disables QR creation.
- `phoneAccessStore.createPairingSession()` repeats the HTTPS gate before POST.
- `RemoteAccessPairingService.createPairingSession()` is the authoritative QR/pairing-session owner and currently rejects all HTTP with `REMOTE_ACCESS_HTTPS_REQUIRED`.
- Docs/localization say Same LAN is a supported setup profile but also label HTTP candidates diagnostic-only and require HTTPS for QR creation.
- Android native code already supports HTTP private LAN/tailnet URLs with explicit acknowledgement, so desktop/web/server policy is narrower than the phone client capability.

The target design must not be a frontend-only workaround. Backend QR creation must own the authoritative pairing URL policy, while the frontend mirrors that policy for explainable UI state.

## Intended Change

Restore Local LAN/private HTTP as a first-class, QR-capable Phone Access path alongside Tailscale/private HTTPS.

- HTTPS/Tailscale Serve remains the recommended default path.
- Private HTTP is allowed only for phone-facing trusted private network hosts, with explicit cleartext/trusted-network acknowledgement before QR creation.
- Public/routable HTTP is not introduced as a supported Phone Access path.
- Loopback/container-local/unspecified hosts are rejected as phone-facing QR targets.
- Remote-node QR creation continues to verify `serverInstanceId` for the advertised phone-facing URL before creating the QR.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small targeted refactor
- Evidence: The same scheme policy is encoded in `PhoneAccessCard`, `phoneAccessStore`, `phoneAccessRemoteNode`, backend `RemoteAccessPairingService`, docs, localization, and tests. Android owns a different but compatible HTTP acknowledgement policy. A UI-only button change would still fail backend QR creation.
- Design response: Extract an explicit pairing URL policy at the backend authority boundary and mirror it in a frontend policy utility. Replace categorical HTTPS-only checks with an allowed transport policy: HTTPS is allowed; trusted private HTTP is allowed only with acknowledgement; public HTTP and phone-unreachable hosts are rejected.
- Refactor rationale: Without a named pairing URL policy owner, the Local LAN/Tailscale support matrix will keep drifting across component, store, backend, docs, and mobile client expectations.
- Intentional deferrals and residual risk, if any: Advanced public-looking private-DNS HTTP hostnames beyond deterministic private/local classification are deferred. Users can use discovered private IP candidates or HTTPS for those cases. A future explicit advanced override can be designed if needed.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Private HTTPS`: an HTTPS URL reachable by the phone through Tailscale Serve, private ingress, private DNS, or equivalent.
- `Trusted Private HTTP`: a cleartext HTTP URL that is phone-facing and restricted to deterministic private/local network addresses or local hostnames, with explicit acknowledgement.
- `Phone-unreachable local-only host`: loopback/container/unspecified hosts such as `localhost`, `127.*`, `::1`, `0.0.0.0`, `[::]`, `host.docker.internal`, or `*.localhost`.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the categorical HTTPS-only pairing policy as the in-scope behavior. Do not keep it as a hidden fallback, stale error code, or diagnostic-only UI copy for LAN.
- Treat removal as first-class design work: tests and docs that assert HTTP is always rejected must be rewritten to the new policy.
- Decision rule: the design must not rely on frontend-only bypasses, hidden advanced QR paths, or a dual old/new branch where backend rejects a mode the UI presents as supported.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User selects Phone Access URL in Phone Setup | QR/link rendered for the phone | Phone Access pairing flow | Main user-reported path: Local LAN must become QR-capable again. |
| DS-002 | Primary End-to-End | `/remote-access/pairing-sessions` POST | Stored one-time pairing session + returned `mobileUrl`/`qrText` | `RemoteAccessPairingService` | Backend is the authoritative boundary that must accept/reject URL policy. |
| DS-003 | Primary End-to-End | Remote-node Phone Setup advertised URL | Verified same-node QR creation or clear rejection | `phoneAccessStore` remote-node verification + backend pairing service | Prevents a host desktop from minting QR codes for the wrong remote node. |
| DS-004 | Return-Event | Phone scans/opens QR | Mobile shell receives pairing payload and exchanges code | Mobile Phone Access client | Ensures generated HTTP LAN payloads remain compatible with existing Android/WebView acknowledgement and mobile pairing. |
| DS-005 | Bounded Local | Selected URL changes in the UI | Validation state, warning, acknowledgement, and verification state update | `phoneAccessStore` | Prevents stale acknowledgements or stale remote verification from applying to a new URL. |

## Primary Execution Spine(s)

- DS-001 embedded-node QR: `Phone Setup UI -> PhoneAccessStore -> Frontend Pairing URL Policy -> Pairing Session API -> RemoteAccessPairingService -> Backend Pairing URL Policy -> QR Panel`
- DS-002 backend QR authority: `REST Route -> RemoteAccessPairingService -> Pairing URL Policy -> Pairing Session Registry -> Mobile URL Builder -> REST Response`
- DS-003 remote-node QR: `Remote Node Phone Setup UI -> PhoneAccessStore -> Advertised URL Status Probe -> Same-Node Verification -> Pairing Session API -> QR Panel`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | User selects an HTTPS or Local LAN/private HTTP candidate. The store evaluates the URL, asks for HTTP acknowledgement when needed, then calls backend QR creation with the normalized base and acknowledgement flag. The response QR text is rendered by the QR panel. | Phone Setup UI, PhoneAccessStore, Pairing Session API, RemoteAccessPairingService, QR Panel | Phone Access pairing flow | Candidate discovery, URL normalization, warning copy, QR SVG rendering |
| DS-002 | Backend receives a create-session request. The pairing service normalizes and validates the requested server base, rejects phone-unreachable/public HTTP, requires trusted-private-HTTP acknowledgement, then creates a short-lived pairing payload and mobile URL. | REST route, RemoteAccessPairingService, Pairing URL Policy, Pairing Session Registry, Mobile URL Builder | RemoteAccessPairingService | Error mapping, URL host classification, payload encoding |
| DS-003 | For remote-node windows, frontend validates the advertised URL, requires manual phone-facing input, fetches `/rest/remote-access/status` from both management and advertised bases, compares `serverInstanceId`, and only then calls pairing creation. | Remote Node PhoneAccessStore, Status Probe, Same-Node Verification, Pairing Session API | PhoneAccessStore for verification; RemoteAccessPairingService for final creation | Request error formatting, phone-facing host validation |
| DS-004 | The phone opens the QR `mobileUrl`. For Android, existing parsing supports HTTP but asks the user to acknowledge cleartext before WebView load; for browser/PWA, the desktop-created acknowledgement is the owner-side warning before the QR is made. | QR Link, Mobile Runtime, Pairing Exchange | Mobile Phone Access client | Origin-scoped storage, authorized transport |
| DS-005 | When selected URL changes, stale HTTP acknowledgement, stale remote verification, and any active QR tied to the old URL must be invalidated or made visibly stale. | Store-selected URL state, validation state, acknowledgement state, active pairing state | PhoneAccessStore | Component controls, candidate dropdown, manual URL input |

## Spine Actors / Main-Line Nodes

- `PhoneAccessCard`: presentation surface for selecting URL, acknowledging HTTP, creating QR, and rendering active QR.
- `PhoneAccessStore`: frontend state/orchestration owner for selected URL, validation, acknowledgement, remote-node verification, and API calls.
- `Frontend Pairing URL Policy`: frontend UX mirror of allowed URL classes and warning/error state.
- `RemoteAccessPairingService`: backend authoritative owner for pairing-session creation and pairing URL acceptance.
- `Backend Pairing URL Policy`: server-side accepted/rejected URL policy and host classification.
- `Mobile Phone Access client`: consumes QR/mobile URL and handles mobile pairing/acknowledgement.

## Ownership Map

- `PhoneAccessCard` owns rendering and user interactions only. It must not decide which URL classes are authoritative; it reads store policy state.
- `PhoneAccessStore` owns frontend sequencing: load candidates, selected URL state, acknowledgement state, remote-node same-server verification, and create-pairing API request shape.
- `Frontend Pairing URL Policy` owns browser-side normalization/classification used to show warnings and prevent obviously invalid calls.
- `RemoteAccessPairingService` owns backend pairing lifecycle: settings gate, URL policy enforcement, one-time code/session creation, mobile URL construction.
- `Backend Pairing URL Policy` owns server authority for schemes/hosts/acknowledgement; frontend and docs must match it.
- `AddressCandidateService` owns discovery only. It does not own QR policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `PhoneAccessCard.vue` | `phoneAccessStore` + frontend policy utility | Vue presentation for settings UI | Pairing URL acceptance policy, backend session lifecycle |
| `POST /remote-access/pairing-sessions` route | `RemoteAccessPairingService` | REST entrypoint and error response mapping | URL scheme/security policy beyond delegating to service |
| `AddressCandidateService` output | Phone Access pairing flow | Supplies candidate data from interfaces/manual input | QR eligibility or HTTP acknowledgement policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Categorical `assertHttpsServerBaseUrl()` policy | HTTPS is no longer the only supported QR scheme | Backend pairing URL policy | In This Change | Keep HTTPS success but remove all-HTTP rejection. |
| Frontend `isHttps` as the sole QR eligibility check | Local LAN private HTTP must be QR-capable | Frontend pairing URL policy + acknowledgement state | In This Change | `isHttps` can remain as a descriptive field, not as the only allowed condition. |
| `normalizeHttpsPhoneAccessCandidate()` default-selection-only behavior | HTTP private LAN candidates should be selectable/usable when no HTTPS candidate exists | Candidate selection based on policy preference | In This Change | Prefer HTTPS first; choose private HTTP next; never choose loopback/public HTTP. |
| UI/docs copy saying HTTP LAN candidates are diagnostic-only | Local LAN is a supported mode | Updated Phone Access copy and docs | In This Change | Replace with warning/acknowledgement copy. |
| Tests asserting HTTP pairing is categorically rejected | The product policy changes | Tests for private HTTP success and public/local-only rejection | In This Change | Keep tests for invalid/public cases. |
| `REMOTE_ACCESS_HTTPS_REQUIRED` active use | Error is no longer accurate for all HTTP | More specific policy errors | In This Change | Remove if unused; otherwise do not expose for this flow. |

## Return Or Event Spine(s) (If Applicable)

- Pairing response return: `RemoteAccessPairingService -> REST Response -> phoneAccessStore.activePairing -> PhoneAccessCard.renderQr() -> QR image/text`.
- Mobile pairing return: `Phone opens mobileUrl -> Mobile shell reads pairing payload -> POST /remote-access/pairing-exchanges -> credential/device response -> mobile session storage`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `PhoneAccessStore`
  - `Selected URL change -> normalize/evaluate policy -> reset trustedPrivateHttpAcknowledged if URL changed -> reset advertisedUrlVerified -> clear stale verification message -> component warning state updates`.
  - Why it matters: prevents a previous URL's acknowledgement or same-node verification from authorizing a different Local LAN/remote-node URL.
- Parent owner: `RemoteAccessPairingService`
  - `raw serverBaseUrl -> normalizeNodeBaseUrl -> classify host/scheme -> require acknowledgement if HTTP private -> build payload/mobileUrl`.
  - Why it matters: keeps QR acceptance and URL construction inside one backend lifecycle owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Address candidate discovery | DS-001 | PhoneAccessStore | List loopback/LAN/tailnet/manual candidates | Supplies choices but does not decide QR policy | Discovery could incorrectly become security policy. |
| URL normalization | DS-001, DS-002, DS-003 | Frontend and backend pairing policies | Strip `/mobile`/API surfaces to canonical base | Keeps `serverBaseUrl` vs `mobileUrl` contract intact | Duplicated ad hoc normalization can create mismatched payloads. |
| Host private/local classification | DS-001, DS-002 | Pairing URL policy | Distinguish phone-facing private HTTP from public/loopback HTTP | Enables LAN while avoiding public HTTP | Component-only checks could be bypassed. |
| HTTP acknowledgement state | DS-001, DS-005 | PhoneAccessStore | Ensure user explicitly accepts cleartext private HTTP | Browser/PWA does not have Android native acknowledgement before QR open | Hidden/global acknowledgement could apply to wrong URL. |
| QR rendering | DS-001 return | PhoneAccessCard | Convert active pairing text to QR SVG data URL | Presentation concern only | QR renderer should not own pairing state. |
| Remote-node status verification | DS-003 | PhoneAccessStore | Compare `serverInstanceId` from management and advertised URLs | Prevents wrong-node QR creation | Backend pairing service lacks management URL context. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Pairing lifecycle | Backend `remote-access/services` | Extend | Existing service owns pairing sessions and URL construction | N/A |
| URL normalization | Existing frontend/backend node URL normalizers | Reuse | They already define canonical server base vs `/mobile` | N/A |
| Pairing URL policy | Remote Access services / frontend utilities | Create New owned files | Current policy is scattered and too specific to HTTPS | Existing `phoneAccessRemoteNode.ts` mixes remote-node fetch helpers with general policy. |
| Candidate discovery | `AddressCandidateService` | Reuse | LAN candidates already exist | N/A |
| QR rendering | `services/qr/qrCodeDataUrlService.ts` | Reuse | Rendering is unchanged | N/A |
| Android HTTP acknowledgement | Android native connection shell | Reuse | Existing code already supports HTTP acknowledgement | No native changes needed unless validation later finds a defect. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Remote Access | Pairing settings, pairing sessions, backend URL acceptance, mobile URL payloads | DS-002 | RemoteAccessPairingService | Extend | Add explicit pairing URL policy. |
| Frontend Phone Access Settings | Selected URL state, acknowledgement, remote verification, QR UI | DS-001, DS-003, DS-005 | PhoneAccessStore | Extend | UI mirrors backend policy and owns warning state. |
| URL Utilities | Canonical base URL normalization | DS-001, DS-002, DS-004 | Backend/frontend policies | Reuse | Preserve `/mobile` stripping and base path behavior. |
| Android Mobile Shell | HTTP acknowledgement and WebView load policy | DS-004 | Android shell | Reuse | No code changes required in target design. |
| Documentation / Localization | User-facing setup language | DS-001 | Product setup surface | Extend | Restore Local LAN as supported mode while keeping HTTPS recommended. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/pairing-url-policy.ts` | Backend Remote Access | Backend Pairing URL Policy | Normalize/classify/allow/reject pairing server URLs | Keeps URL security policy out of pairing lifecycle code | Reuses `normalizeNodeBaseUrl` |
| `remote-access-pairing-service.ts` | Backend Remote Access | RemoteAccessPairingService | Call policy, create sessions, build mobile URLs | Lifecycle owner remains intact | Yes |
| `domain/models.ts` | Backend Remote Access | Remote Access domain model | Error code additions/removals | Domain error vocabulary belongs here | N/A |
| `api/rest/remote-access.ts` | Backend REST | Pairing session REST facade | Accept `trustedPrivateHttpAcknowledged` and delegate | Thin API entry | N/A |
| `autobyteus-web/utils/phoneAccessPairingUrlPolicy.ts` | Frontend Phone Access Settings | Frontend Pairing URL Policy | Browser-side mirror of allowed URL classes and warning/error state | Avoids policy hiding in component/store | Reuses `normalizeNodeBaseUrl` |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Frontend Phone Access Settings | Remote-node status helper | Request error formatting and advertised status fetch | Keeps remote-node-specific helpers separate | N/A |
| `autobyteus-web/stores/phoneAccessStore.ts` | Frontend Phone Access Settings | PhoneAccessStore | Selection, acknowledgement, remote verification, create request | Existing orchestration owner | Yes |
| `PhoneAccessCard.vue` | Frontend Settings UI | Presentation facade | Render warnings/checkbox/button/QR | Component remains presentational | Store policy state |
| Localization settings files | Localization | UI copy | Labels/warnings/errors | Existing copy owner | N/A |
| Remote access docs | Docs | Product docs | Network model and setup flows | Durable user/admin docs | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend pairing URL classification used by store and component | `utils/phoneAccessPairingUrlPolicy.ts` | Frontend Phone Access Settings | Prevent repeated `isHttps`/host checks | Yes | Yes | A generic URL helper unrelated to Phone Access |
| Backend pairing URL classification used by service/tests | `remote-access/services/pairing-url-policy.ts` | Backend Remote Access | Backend is authoritative and tests can target policy directly | Yes | Yes | A duplicate of address discovery |
| Private host classification across frontend/backend | Same-language policy files | Remote Access | Cross-runtime cannot share TS module directly; keep names and test cases aligned | Yes | Yes | Divergent definitions hidden in UI/service code |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Backend `AllowedPairingServerBaseUrl` / policy decision | Yes | Yes | Low | Fields: `normalizedBaseUrl`, `transportSecurity`, `requiresAcknowledgement`. Do not include UI labels. |
| Frontend `PhoneAccessPairingUrlValidation` | Yes | Yes | Medium | Keep `isAllowed`, `requiresTrustedPrivateHttpAcknowledgement`, `message`, and `warning` distinct. Do not use `isHttps` as eligibility. |
| API create pairing request | Yes | Yes | Low | Add only `trustedPrivateHttpAcknowledged?: boolean`; do not send candidate kind as authority. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/pairing-url-policy.ts` | Backend Remote Access | Backend Pairing URL Policy | Authoritative allowed pairing URL classification and errors | One backend policy concern | `normalizeNodeBaseUrl` |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Backend Remote Access | RemoteAccessPairingService | Pairing settings gate, policy call, code/session creation, mobile URL response | Existing lifecycle owner | Backend policy result |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | Backend Remote Access | Domain model | Remove/replace HTTPS-only failure code, add specific pairing URL policy failures | Central error vocabulary | N/A |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Backend REST | REST facade | Accept acknowledgement request field and map service errors | Thin delegation | Request shape |
| `autobyteus-web/utils/phoneAccessPairingUrlPolicy.ts` | Frontend Phone Access Settings | Frontend Pairing URL Policy | UI validation, host classification mirror, warning/error data | One frontend policy concern | `normalizeNodeBaseUrl` |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Frontend Phone Access Settings | Remote-node helper | Error formatting and status fetch only | Prevents mixed responsibilities | N/A |
| `autobyteus-web/stores/phoneAccessStore.ts` | Frontend Phone Access Settings | PhoneAccessStore | Candidate selection, selected URL setter, acknowledgement, remote verification, API request | Existing orchestration owner | Frontend policy result |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Frontend Settings UI | Presentation | Labels, warning/checkbox, candidate dropdown, create QR, QR display | Presentation concern | Store state |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Localization | Settings copy | Local LAN + Tailscale copy and warning strings | Existing localization owner | N/A |
| `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md` if needed | Docs | Product docs | Durable network model and pairing flow | Existing docs | N/A |
| Tests under web/server remote-access/settings | Validation | Test suites | Lock HTTPS and Local LAN behavior | Existing tests | N/A |

## Ownership Boundaries

- Backend `RemoteAccessPairingService` is the authoritative boundary for pairing-session creation. It must not rely on frontend validation to reject public HTTP or local-only hosts.
- Frontend `phoneAccessStore` owns user-facing sequencing and remote-node verification, but cannot weaken backend acceptance.
- `PhoneAccessCard` cannot decide URL eligibility by checking `isHttps` directly; it reads a store/policy decision.
- `AddressCandidateService` cannot promote a candidate into a QR target by itself; discovery does not equal policy approval.
- Android native URL acknowledgement remains an Android shell concern for scanned/pasted HTTP URLs after QR creation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RemoteAccessPairingService.createPairingSession` | Backend pairing URL policy, session registry, mobile URL builder | REST route, tests | REST route manually accepting HTTP while service rejects/ignores policy | Extend service input/result, not route-side workaround |
| `phoneAccessStore` | Selected URL state, acknowledgement state, remote verification, create API call | `PhoneAccessCard` | Component directly computing final QR eligibility from URL scheme | Add computed store policy properties/actions |
| `pairing-url-policy.ts` backend | Host classification and error codes | Pairing service | Duplicating private host checks in REST route or tests only | Add policy API functions and tests |
| `phoneAccessPairingUrlPolicy.ts` frontend | UX mirror of host classification and warning state | Store/component | Ad hoc component `isHttps` checks | Add fields to frontend validation decision |

## Dependency Rules

- `PhoneAccessCard` may depend on `phoneAccessStore` and localization/QR rendering. It must not import backend policy or duplicate private network regexes.
- `phoneAccessStore` may depend on `phoneAccessPairingUrlPolicy`, `phoneAccessRemoteNode`, node/window stores, and API service.
- `phoneAccessPairingUrlPolicy` may depend on URL normalization only; it must not call APIs or mutate stores.
- `RemoteAccessPairingService` must depend on backend `pairing-url-policy.ts`; the REST route must delegate to the service.
- Backend `pairing-url-policy.ts` may depend on `url-normalization.ts` and Node URL/IP parsing helpers; it must not depend on REST/Fastify.
- Android code should not depend on desktop/web implementation files; compatibility is maintained through the QR payload and URL contract.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `POST /rest/remote-access/pairing-sessions` | Pairing session | Create one-time QR pairing session | `{ serverBaseUrl: string; serverName?: string; trustedPrivateHttpAcknowledged?: boolean }` | `trustedPrivateHttpAcknowledged` only affects private HTTP; HTTPS ignores it. |
| `RemoteAccessPairingService.createPairingSession(input)` | Pairing session lifecycle | Enforce settings + URL policy + create payload | Same as API plus service-level types | Backend authority. |
| `evaluatePhoneAccessPairingUrl(rawUrl)` | Frontend URL policy | Return validation/warning/ack state | Raw selected/manual URL string | UI mirror only. |
| `validatePairingServerBaseUrl(rawUrl, options)` | Backend URL policy | Return allowed canonical URL or throw policy error | Raw URL + `trustedPrivateHttpAcknowledged` | Backend authority. |
| `fetchRemoteAccessStatusFromBaseUrl(baseUrl)` | Remote-node verification | Fetch status for advertised URL | Canonical base URL | Works for allowed HTTPS or private HTTP. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `POST /pairing-sessions` | Yes | Yes | Low | Add explicit acknowledgement field; do not infer from candidate label. |
| `evaluatePhoneAccessPairingUrl` | Yes | Yes | Low | Returns policy decision, not side effects. |
| `validatePairingServerBaseUrl` | Yes | Yes | Low | Throws typed errors for invalid/public/local-only/ack-required cases. |
| `AddressCandidateService.listCandidates` | Yes | Yes | Medium | Keep discovery-only; do not make candidate kind authoritative. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Backend policy | `pairing-url-policy.ts` | Yes | Low | Name by concrete concern, not “helper”. |
| Frontend policy | `phoneAccessPairingUrlPolicy.ts` | Yes | Low | Avoid `remoteNode` name because embedded Local LAN also uses it. |
| HTTP acknowledgement | `trustedPrivateHttpAcknowledged` | Yes | Low | Explicitly says trust boundary and scheme. |
| Transport classification | `transportSecurity: 'https' | 'trusted_private_http'` | Yes | Low | Avoid boolean-only `isHttps` eligibility. |

## Applied Patterns (If Any)

- Policy object/function pattern inside the Remote Access subsystem: one backend policy file classifies pairing URLs before lifecycle creation.
- Store-as-state-orchestrator pattern in frontend: the Pinia store owns selected URL, acknowledgement, and remote verification sequencing; component remains presentation.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/pairing-url-policy.ts` | File | Backend Pairing URL Policy | Allowed pairing URL classification and typed errors | Remote-access service concern | REST handlers, UI labels |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | File | RemoteAccessPairingService | Pairing lifecycle and QR response | Existing owner | Host regex duplication |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | File | Domain model | Remote access failure code vocabulary | Existing domain owner | UI copy |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | File | REST facade | Request/response mapping | Existing REST boundary | URL policy logic |
| `autobyteus-web/utils/phoneAccessPairingUrlPolicy.ts` | File | Frontend Pairing URL Policy | UI validation mirror and warning decision | Frontend settings utility | API calls, store mutation |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | File | Remote-node helper | Status fetch and error formatting | Existing helper with narrowed responsibility | General pairing policy |
| `autobyteus-web/stores/phoneAccessStore.ts` | File | PhoneAccessStore | Phone Access UI orchestration | Existing store owner | QR SVG rendering |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | File | Presentation facade | URL controls, acknowledgement UI, QR panel | Existing settings component | Backend authority decisions |
| `autobyteus-web/localization/messages/en/settings.ts` | File | English settings copy | Updated labels/warnings | Existing localization file | Logic |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | File | Chinese settings copy | Updated labels/warnings | Existing localization file | Logic |
| `autobyteus-web/docs/remote_access.md` | File | Durable docs | Updated Tailscale + Local LAN setup model | Existing docs | Stale HTTPS-only statements |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services` | Main-Line Domain-Control + service policies | Yes | Low | Existing remote-access service folder; policy serves pairing service. |
| `autobyteus-web/utils` | Off-Spine Concern | Yes | Medium | Add narrowly named `phoneAccessPairingUrlPolicy.ts` to avoid generic utility sprawl. |
| `autobyteus-web/components/settings` | Presentation | Yes | Low | Component remains UI-only. |
| `autobyteus-web/stores` | Frontend state orchestration | Yes | Low | Existing Pinia store owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Embedded Local LAN | Select `http://192.168.1.25:29695`, see “Trusted Local LAN HTTP” warning, tick acknowledgement, create QR `http://192.168.1.25:29695/mobile?pairing=...` | Button disappears or remains disabled because `!isHttps` | Directly fixes the reported issue. |
| Tailscale HTTPS | Paste `https://desktop.tailnet.ts.net/mobile`, no HTTP acknowledgement needed, create QR with canonical `serverBaseUrl` `https://desktop.tailnet.ts.net` | Treat Tailscale HTTPS as the only path | Preserves current recommended flow without excluding LAN. |
| Public HTTP rejection | `http://example.com:29695` returns a policy error: use HTTPS for public/routable hostnames | Allow any HTTP URL if checkbox is ticked | Avoids adding public HTTP Phone Access. |
| Loopback rejection | `http://127.0.0.1:29695` and `http://host.docker.internal:29695` are blocked as phone-unreachable | Creating a QR that opens loopback on the phone | Prevents QR that cannot reach the desktop node. |
| Backend authority | `RemoteAccessPairingService -> validatePairingServerBaseUrl()` | Component unlocks button but backend still rejects HTTP | Keeps behavior coherent across UI/API. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend-only QR button enablement for LAN | Smallest apparent fix | Rejected | Backend pairing service policy must change too. |
| Keep HTTPS-only backend and create a fake frontend LAN QR locally | Avoids backend change | Rejected | Backend owns one-time pairing codes and payloads. |
| Allow all HTTP with a checkbox | Maximizes flexibility | Rejected | Allow only deterministic private/local HTTP; use HTTPS for public hostnames. |
| Keep HTTP candidates as diagnostic-only but add help text | Minimal policy change | Rejected | User explicitly needs Local LAN QR support. |
| Preserve `REMOTE_ACCESS_HTTPS_REQUIRED` for Local LAN rejection | Existing tests expect it | Rejected | Error vocabulary must match new policy. |
| Remove Tailscale guide | Local LAN is restored | Rejected | Tailscale HTTPS remains recommended and supported. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Presentation: `PhoneAccessCard.vue`, localization strings.
- Frontend orchestration: `phoneAccessStore.ts`.
- Frontend policy mirror: `phoneAccessPairingUrlPolicy.ts`.
- Backend transport: `api/rest/remote-access.ts`.
- Backend domain/control: `RemoteAccessPairingService`, `pairing-url-policy.ts`.
- Mobile consumer: existing Android/mobile web shell.

## Migration / Refactor Sequence

1. Backend policy extraction:
   - Add `pairing-url-policy.ts`.
   - Move HTTPS-only assertion into a broader `validatePairingServerBaseUrl(raw, { trustedPrivateHttpAcknowledged })` policy.
   - Implement classification:
     - allow `https:` unless host is phone-unreachable local-only;
     - allow `http:` only when host is deterministic private/local and acknowledgement is true;
     - return ack-required error when private HTTP is not acknowledged;
     - reject public/routable HTTP;
     - reject unsupported schemes/invalid URLs via existing normalization errors.
   - Private/local HTTP host guidance:
     - private IPv4: `10/8`, `172.16/12`, `192.168/16`;
     - link-local IPv4: `169.254/16`;
     - CGNAT/tailnet-like IPv4: `100.64/10`;
     - IPv6 ULA/link-local where URL parsing supports it (`fc00::/7`, `fe80::/10`);
     - local hostnames such as single-label names, `.local`, `.lan`, `.home.arpa`;
     - reject loopback/unspecified/container-local names separately.
2. Backend service/API update:
   - Replace `assertHttpsServerBaseUrl()` call with policy validation result.
   - Add `trustedPrivateHttpAcknowledged?: boolean` to REST request body and service input.
   - Remove/replace active use of `REMOTE_ACCESS_HTTPS_REQUIRED` with specific policy errors.
   - Preserve canonical `serverBaseUrl` and base-path-preserving `mobileUrl` builder.
3. Frontend policy extraction:
   - Add `phoneAccessPairingUrlPolicy.ts` with same decision categories and aligned test cases.
   - Narrow `phoneAccessRemoteNode.ts` to status fetch/error formatting, or leave exports only where still cohesive.
4. Frontend store update:
   - Add `trustedPrivateHttpAcknowledged` state.
   - Add selected/manual URL setter action(s) that reset acknowledgement, remote verification, and stale messages on URL change.
   - Change default candidate selection: prefer non-loopback HTTPS; if none, select first allowed non-loopback trusted private HTTP LAN/tailnet candidate; never select loopback/public HTTP.
   - Change `createPairingSession()` to require acknowledgement only for private HTTP and to send `trustedPrivateHttpAcknowledged` to backend.
   - Preserve remote-node manual URL requirement and same-node verification; use allowed HTTP/HTTPS policy instead of HTTPS-only.
5. Frontend component update:
   - Replace Tailscale-only manual field label with private-network URL label.
   - Show HTTPS recommendation copy plus Local LAN/private HTTP warning.
   - Show checkbox/acknowledgement when selected URL is trusted private HTTP.
   - Keep Create QR visible; disable only until required acknowledgement or other policy errors are resolved.
   - Replace diagnostic-only candidate note with Local LAN support copy.
6. Tests:
   - Backend unit/e2e: HTTPS success, private LAN HTTP requires acknowledgement, private LAN HTTP success with acknowledgement, public HTTP rejection, loopback/local-only rejection, canonical `/mobile` behavior.
   - Frontend store/component: HTTP LAN warning/acknowledgement enables QR; HTTPS path still works; public/loopback blocked; remote-node verification still compares `serverInstanceId`.
   - Policy utility tests in both runtimes for representative hosts/ranges.
7. Docs/localization:
   - Update `remote_access.md` and settings docs/copy to say both Tailscale HTTPS and Local LAN are supported.
   - Keep Tailscale Serve HTTPS as recommended for travel/stable origins.
   - State that Local LAN HTTP uses cleartext and is intended only for trusted private networks.
8. Final cleanup:
   - Remove stale HTTPS-only assertions, stale tests, stale localization keys, and docs statements saying HTTP LAN candidates are diagnostic-only.

## Key Tradeoffs

- Requiring a lightweight acknowledgement for private HTTP adds one click but makes the cleartext trust boundary explicit, especially for browser/PWA users who do not have Android-native acknowledgement before opening the QR.
- Deterministic private/local host classification may reject some custom private DNS names that look public. This is safer than allowing public HTTP and can be revisited with a future explicit advanced override.
- Maintaining separate frontend/backend policy implementations is unavoidable across runtime boundaries, so both need focused tests with matching representative cases.
- Keeping Tailscale HTTPS preferred avoids regressing the safer travel/stable-origin path while restoring the user's home/LAN workflow.

## Risks

- Private hostname classification can be imperfect without DNS resolution. Keep allowed HTTP hostnames conservative and document IP-based Local LAN as the reliable path.
- Remote-node HTTP status verification may encounter CORS/network differences in Electron/browser contexts; API/E2E validation should include a mock or reachable private HTTP target if practical.
- Users may pair over HTTP and later switch to HTTPS/Tailscale, which changes browser/WebView origin and may require re-pairing. Docs should retain that warning.
- Missing frontend dependencies in this worktree currently block local test execution until installed/restored.

## Guidance For Implementation

- Do not change the QR payload schema unnecessarily; the existing `serverBaseUrl` + `pairingCode` shape already supports HTTP and HTTPS.
- Keep `serverBaseUrl` canonical and never store `/mobile` inside it.
- Do not pass candidate `kind` as an authority signal to backend; backend must classify the URL itself.
- Prefer small owned policy files over sprinkling `isHttps || isLan` checks through components/services.
- Keep error messages user-facing and specific: “Private HTTP requires acknowledgement”, “HTTP host must be private/local”, “Loopback/local-only URLs cannot be opened from the phone”.
- Run targeted frontend and backend tests after dependencies are available; update any HTTPS-only snapshots/assertions.
