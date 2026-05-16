# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/design-spec.md`
- Current Review Round: 2
- Trigger: Solution designer round 1 rework handoff on 2026-05-16.
- Prior Review Round Reviewed: Round 1 design review findings in this canonical report path before update.
- Latest Authoritative Round: Round 2
- Current-State Evidence Basis: Refined requirements, investigation notes, revised design spec, prior round 1 findings, and targeted code context already inspected in round 1 for server route registration, GraphQL/WebSocket entrypoints, frontend endpoint/auth transport seams, and packaging/static serving seams.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | 4 | Fail | No | Required route/local trust specificity, URL resolver mapping, disable/revoke-all coverage, and fixed WebSocket token policy. |
| 2 | Rework review | AR-MRA-001..004 | 0 | Pass | Yes | Prior findings are resolved; design is implementation-ready with residual risks recorded. |

## Reviewed Design Spec

The revised design remains aligned with the product direction: PWA/mobile-web first, Android/iOS wrappers deferred, VPN-provider agnostic core protocol, Tailscale as first validation profile only, app-level pairing/auth before supported remote access, and reuse of `windowNodeContextStore` / `deriveNodeEndpoints` as the authoritative active-node endpoint model.

The round 2 rework adds the missing security and implementation specificity: a spine coverage rule and use-case coverage matrix, precise peer-socket loopback semantics, a concrete route classification table, concrete `ClientFacingUrlResolver` target/interface/producers, Phone Access settings and revoke-all design, selected `WEBSOCKET_AUTH_QUERY_TOKEN` policy, redaction obligations, and mobile diagnostics mapping.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design continues to classify the task as Larger Requirement / Feature. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies Boundary Or Ownership Issue, Missing Invariant, and Duplicated Policy/Coordination risk, supported by current route/auth/frontend transport evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is required for production-supported Remote Access and separates smoke-test-only connectivity. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Remote Access services, route policy, local trust helper, settings/device stores, URL resolver, authorized transports, WebSocket auth helper, and diagnostics sections now support the decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-MRA-001 | High / Design Impact | Resolved | Revised design adds `RemoteAccessRoutePolicy And Local Trust Semantics`, exact peer-socket-only loopback predicate, ignored `Host`/`Origin`/forwarded headers, route classification table, and validation obligations. | Ready. |
| 1 | AR-MRA-002 | High / Design Impact | Resolved | Revised design maps `autobyteus-server-ts/src/remote-access/services/client-facing-url-resolver.ts`, includes resolver types/base-url policy, pairing/device integration, MVP URL producers, and validation obligations. | Ready. |
| 1 | AR-MRA-003 | Medium/High / Requirement Gap | Resolved | Requirements now include R-MRA-074, R-MRA-076, R-MRA-077 and AC-MRA-018/019; design adds settings store/service, settings APIs, revoke-all command, UI behavior, and diagnostics. | Ready. |
| 1 | AR-MRA-004 | Medium / Design Impact | Resolved | Revised design chooses `WEBSOCKET_AUTH_QUERY_TOKEN` with `access_token`, client/server helpers, close-code mapping, and `redact-sensitive-url.ts` logging obligations. | Ready. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-MRA-001 | Desktop QR/pairing session creation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-002 | Phone first-run pairing and node binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-003 | Mobile REST/GraphQL action auth | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-004 | Mobile WebSocket stream auth | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-005 | Per-device revocation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-006 | `/mobile` static serving | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-007 | Remote-safe generated URL handling | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-008 | Tailscale validation profile | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-MRA-009 | Phone Access enable/disable | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-010 | Address candidate/manual URL selection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-011 | Reconnect-on-open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-012 | Mobile feature gating | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-013 | Revoke-all | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MRA-014 | Documentation/provider profiles | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| RS-MRA-001..005 | Return/error spines | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| BLS-MRA-001..004 | Bounded local spines | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Remote Access | Pass | Pass | Pass | Pass | Now covers pairing, settings, paired devices, auth verification, route policy, address candidates, and client-facing URL resolver. |
| Mobile Web Access | Pass | Pass | Pass | Pass | Owns bootstrap, credential storage, auth transports, diagnostics, reconnect, and mobile feature gating. |
| Node Context | Pass | Pass | Pass | Pass | Reuse/extension of `windowNodeContextStore` remains correct. |
| Desktop Settings / Nodes | Pass | Pass | Pass | Pass | Phone Access card now covers enable toggle, QR, candidate selection, per-device revoke, and revoke-all. |
| Packaging / Build | Pass | Pass | Pass | Pass | Desktop/server-served `/mobile` remains a sound first PWA approach. |
| Client-Facing URL | Pass | Pass | Pass | Pass | Concrete resolver and migration targets are now mapped. |
| Validation / Docs | Pass | Pass | Pass | Pass | Tailscale is a validation/docs profile, not a product dependency. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Pairing payload shape | Pass | Pass | Pass | Pass | Contains selected `serverBaseUrl`, code, expiry, server metadata; no long-lived token. |
| Device/settings/auth models | Pass | Pass | Pass | Pass | Settings are separate from device records; credential hashes stay secret. |
| Auth route classification/local trust | Pass | Pass | Pass | Pass | Route policy and local trust helper are separate and testable. |
| Auth token transport rules | Pass | Pass | Pass | Pass | HTTP bearer and WS query-token helpers are centralized. |
| URL candidate shape | Pass | Pass | Pass | Pass | Provider-agnostic candidate model remains sound. |
| Auth/mobile failure model | Pass | Pass | Pass | Pass | `mobileConnectionDiagnostics.ts` now owns failure normalization. |
| Client-facing URL resolution | Pass | Pass | Pass | Pass | Resolver target/interface/producers are concrete. |
| Sensitive URL redaction | Pass | Pass | Pass | Pass | Central redaction helper protects access_token/code/pairingCode logs. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RemoteAccessPairingPayload` | Pass | Pass | Pass | Pass | Pass | Paired base URL feeds later client-facing URL context. |
| `PairedDeviceRecord` | Pass | Pass | Pass | Pass | Pass | Stores credential hash, device metadata, revoked state, and client-facing base URL. |
| `RemoteAccessSettings` | Pass | Pass | Pass | Pass | Pass | `phoneAccessEnabled` is separate persistent feature state. |
| `RemoteAccessAuthContext` | Pass | Pass | Pass | Pass | Pass | Includes mode/client-facing base without raw token. |
| `RemoteAccessRouteClassification` | Pass | Pass | Pass | Pass | Pass | Route classification table is concrete enough to implement. |
| `WebSocketAuthPolicy` | Pass | Pass | Pass | Pass | Pass | One MVP value: `WEBSOCKET_AUTH_QUERY_TOKEN`. |
| `ClientFacingUrlContext` / resolver input | Pass | Pass | Pass | Pass | Pass | Base-url fallback order is explicit and does not trust headers. |
| `MobileConnectionFailureKind` | Pass | Pass | Pass | Pass | Pass | Distinguishes network, auth, revoked, disabled, WebSocket-blocked, unsupported, incompatible. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile-supported `getServerUrls()` usage | Pass | Pass | Pass | Pass | Mobile-supported flows use bound node endpoints and authorized transports. |
| Bare mobile REST/Apollo/WebSocket calls | Pass | Pass | Pass | Pass | REST/Apollo/fetch via authorized transport; WS through `websocketAuth.ts`. |
| Route-by-route auth snippets | Pass | Pass | Pass | Pass | Central route policy is authoritative. |
| Header-based local trust | Pass | Pass | Pass | Pass | Explicitly rejected; peer socket address only. |
| Core Tailscale-specific connection logic | Pass | Pass | Pass | Pass | Provider-specific core dependencies are rejected. |
| Production mobile localhost build default | Pass | Pass | Pass | Pass | Runtime pairing/same-origin default replaces static localhost for mobile. |
| Remote-accessible GraphiQL | Pass | Pass | Pass | Pass | Loopback/dev-only or disabled if framework cannot distinguish. |
| Direct loopback URL producers in mobile slice | Pass | Pass | Pass | Pass | `ClientFacingUrlResolver` and root-relative policy replace direct config-base URL returns. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-access/domain/models.ts` | Pass | Pass | Pass | Pass | Domain vocabulary includes pairing/device/settings/auth/route/failure types. |
| Server Remote Access services/stores | Pass | Pass | Pass | Pass | Pairing, settings, devices, auth, address candidates, and URL resolver are separated. |
| `src/api/security/remote-access-local-trust.ts` | Pass | Pass | N/A | Pass | Small testable peer-socket loopback primitive. |
| `src/api/security/remote-access-route-policy.ts` | Pass | Pass | Pass | Pass | Classification and HTTP/GraphQL auth decisions are centralized. |
| `src/api/security/redact-sensitive-url.ts` | Pass | Pass | N/A | Pass | One URL redaction owner for HTTP/WS logs. |
| `src/api/websocket/remote-access-websocket-auth.ts` | Pass | Pass | Pass | Pass | Owns query-token extraction, auth, and close-code mapping. |
| `src/api/static/mobile-web.ts` | Pass | Pass | N/A | Pass | Static serving only. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Pass | Pass | Pass | Pass | Desktop Phone Access orchestration only. |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | Pass | Pass | Pass | Pass | Mobile session/reconnect/binding owner. |
| `autobyteus-web/utils/remoteAccess/*` | Pass | Pass | Pass | Pass | Storage, authorized transport, WS auth, diagnostics are distinct. |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Pass | Pass | N/A | Pass | Mobile capability gating owner. |
| Packaging scripts | Pass | Pass | N/A | Pass | Build/copy concerns are isolated. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Remote Access | Pass | Pass | Pass | Pass | Domain handlers stay unaware of credential details. |
| Route policy/local trust | Pass | Pass | Pass | Pass | No route handler token parsing; no header-based local trust. |
| WebSocket auth | Pass | Pass | Pass | Pass | Query-token handling remains in helper/adapter, not components or stream handlers. |
| Frontend Mobile Web Access | Pass | Pass | Pass | Pass | Stores/components do not read raw credential directly. |
| Window Node Context | Pass | Pass | Pass | Pass | Endpoint derivation remains authoritative. |
| Client-facing URL generation | Pass | Pass | Pass | Pass | URL producers call resolver/root-relative policy, not config base directly for mobile responses. |
| Private Network Providers | Pass | Pass | Pass | Pass | Provider profiles are docs/validation inputs only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RemoteAccessAuthService` | Pass | Pass | Pass | Pass | Owns token verification, settings check, revocation, auth context. |
| `RemoteAccessRoutePolicy` | Pass | Pass | Pass | Pass | Owns route table/default protection. |
| `remote-access-local-trust.ts` | Pass | Pass | Pass | Pass | Encapsulates loopback parsing and rejects header trust. |
| `RemoteAccessSettingsService` | Pass | Pass | Pass | Pass | Persistent enable/disable state is not a UI-only flag. |
| `PairedDeviceService` | Pass | Pass | Pass | Pass | Owns per-device revoke and revoke-all. |
| `ClientFacingUrlResolver` | Pass | Pass | Pass | Pass | Prevents URL producer bypass. |
| `MobileNodeSessionStore` | Pass | Pass | Pass | Pass | Owns mobile credential/session and node binding. |
| `AuthorizedTransport` | Pass | Pass | Pass | Pass | Owns HTTP bearer auth and error mapping. |
| `websocketAuth.ts` / WS adapter | Pass | Pass | Pass | Pass | Owns WS `access_token` policy. |
| `MobileConnectionDiagnostics` | Pass | Pass | Pass | Pass | UI consumes normalized failure kinds. |
| `WindowNodeContextStore` | Pass | Pass | Pass | Pass | Endpoint authority remains intact. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Pairing session create/exchange | Pass | Pass | Pass | Low | Pass |
| Status/address candidates | Pass | Pass | Pass | Low | Pass |
| Device list/revoke/revoke-all | Pass | Pass | Pass | Low | Pass |
| Settings get/update | Pass | Pass | Pass | Low | Pass |
| HTTP `Authorization: Bearer` | Pass | Pass | Pass | Low | Pass |
| WebSocket `?access_token=` | Pass | Pass | Pass | Medium | Pass, with mandatory redaction. |
| `MobileNodeSessionStore.pairWithPayload` | Pass | Pass | Pass | Low | Pass |
| `AuthorizedTransport.buildWebSocketUrl(endpoint, credential)` | Pass | Pass | Pass | Medium | Pass |
| `ClientFacingUrlResolver.resolveRestResourceUrl` | Pass | Pass | Pass | Low | Pass |
| `mobileConnectionDiagnostics` mapper | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/` | Pass | Pass | Low | Pass | Correct new server capability area. |
| `autobyteus-server-ts/src/api/security/` | Pass | Pass | Medium | Pass | Transport/security integration belongs here. |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | Pass | Pass | Medium | Pass | WS-specific auth shape is isolated. |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | Pass | Pass | Low | Pass | Static host is correctly separate. |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Pass | Pass | Low | Pass | User-facing desktop settings surface. |
| `autobyteus-web/components/mobile` / stores / utils | Pass | Pass | Medium | Pass | Mobile UI, session, diagnostics, and transport are separated. |
| Packaging scripts | Pass | Pass | Low | Pass | Build/copy boundary remains clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Endpoint derivation | Pass | Pass | N/A | Pass | `deriveNodeEndpoints` remains authoritative. |
| Active node binding | Pass | Pass | N/A | Pass | `windowNodeContextStore` is reused. |
| Node registry | Pass | Pass | N/A | Pass | Credential is deliberately separate from `NodeProfile`. |
| Remote browser bridge pairing | Pass | Pass | Pass | Pass | Correctly not reused as app-wide mobile auth. |
| File JSON persistence | Pass | Pass | N/A | Pass | File-backed settings/devices are acceptable for MVP. |
| Server route auth | Pass | Pass | Pass | Pass | New route policy is justified. |
| Mobile static serving | Pass | Pass | Pass | Pass | New static host is justified. |
| Generated URL/base URL handling | Pass | Pass | Pass | Pass | Resolver reuses config only as local fallback and protects mobile paths. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Native Android-only protocol | No | Pass | Pass | Rejected. |
| Tailscale-specific core SDK/API | No | Pass | Pass | Rejected. |
| Per-route auth checks | No | Pass | Pass | Rejected. |
| Credential in generic NodeProfile | No | Pass | Pass | Rejected. |
| Header-based local trust | No | Pass | Pass | Rejected. |
| Mobile `getServerUrls()` | Yes today | Pass | Pass | Replaced for mobile-supported flows. |
| GraphiQL remote exposure | Yes today | Pass | Pass | Restricted/disabled for remote clients. |
| Loopback URL generation in mobile slice | Yes today | Pass | Pass | Replaced by resolver/root-relative policy. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server Remote Access domain/store/services | Pass | Pass | Pass | Pass |
| Local trust/redaction/logging primitives | Pass | Pass | Pass | Pass |
| REST/GraphQL route policy | Pass | Pass | Pass | Pass |
| WebSocket query-token adapter | Pass | Pass | Pass | Pass |
| Client-facing URL resolver and URL producer migration | Pass | Pass | Pass | Pass |
| Frontend session/authorized transports/diagnostics | Pass | Pass | Pass | Pass |
| Phone Access UI/settings/revoke-all | Pass | Pass | Pass | Pass |
| `/mobile` build/static host | Pass | Pass | Pass | Pass |
| Validation over Tailscale plus auth/security tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| VPN-agnostic payload | Yes | Pass | Pass | Pass | Good. |
| Auth propagation | Yes | Pass | Pass | Pass | Good. |
| WebSocket URL/auth | Yes | Pass | Pass | Pass | MVP mechanism selected. |
| Desktop QR creation | Yes | Pass | Pass | Pass | Loopback-only create is now precise. |
| URL resolution | Yes | Pass | Pass | Pass | Resolver interface and fallback order are concrete. |
| Route policy/local trust | Yes | Pass | Pass | Pass | Route table and spoofing tests cover the risk. |
| Disable/revoke-all | Yes | Pass | Pass | Pass | Settings/revoke-all semantics are concrete. |
| Diagnostics | Yes | Pass | N/A | Pass | Failure-kind mapper is sufficient. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | The revised use-case-to-spine matrix covers UC-MRA-001 through UC-MRA-012. | N/A | Closed for design review. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

No open blocking classifications.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Query-token WebSocket auth is acceptable for MVP only because the design requires one helper and URL redaction in HTTP/WS logs; implementation and review must verify the redaction before API/E2E validation.
- File-backed settings/device persistence is acceptable for MVP because service/store boundaries allow a later Prisma migration.
- PWA localStorage credential storage is weaker than native secure storage; this remains documented and isolated behind `mobileCredentialStorage` for future wrappers.
- `/mobile` served from the desktop server is the right first PWA approach; HTTPS/installability and native wrapper polish remain follow-up risks.
- Application asset/iframe direct rendering is explicitly out of MVP unless an authorized fetch/blob or signed URL design is added.
- Tailscale validation may not expose all company VPN/WebSocket proxy restrictions; docs and diagnostics need to avoid overfitting to Tailscale.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Ready for implementation. The implementation handoff should preserve the security-critical order: local-trust/redaction primitives and server pairing/auth before mobile UI polish, then route/WebSocket auth, URL resolver migration, Phone Access UI/settings, mobile shell/session, and validation.
