# Design Spec

## Current-State Read

The branch has gone through multiple security/UX iterations:

1. Claim-backed Electron owner sessions solved Docker `401` but forced users to paste claim ID/secret in Phone Setup before Electron itself worked.
2. Launcher-managed `lmn_...` local-management credentials removed the manual claim but only supported same-host launcher-created Docker nodes with local launcher state.
3. The user clarified that core usage is broader: Electron users commonly add remote nodes by LAN IP, company hostname/VPN URL, or Tailscale/Headscale HTTPS URL. This trusted-network remote-node flow existed before Phone Access and must not be broken.

The current authoritative product decision is therefore:

- remove claim;
- remove `lmn`;
- restore normal Electron remote-node behavior over trusted LAN/tailnet/private networks;
- keep only phone QR/mobile-token pairing for the phone/mobile journey;
- keep Docker `/mobile` asset packaging.

## Intended Change

Target journeys:

```text
Electron remote node
-> User adds Backend URL over trusted LAN/company network/tailnet
-> User opens node
-> Electron uses/configures the node normally
```

```text
Phone Access
-> User creates QR from desktop/Electron
-> Phone scans QR over trusted LAN/company network/tailnet
-> Phone exchanges one-time pairing code
-> Phone receives/stores mra_... mobile credential
-> Phone uses the mobile UI/session
```

No claim ID/secret, no owner session, no `lmn` local-management credential, and no same-host launcher-state requirement remain in the default product flow.

## Task Design Health Assessment

- Change posture: Requirement pivot / compatibility restoration plus Docker packaging bug fix.
- Current design issue found: Yes. The claim and `lmn` designs overfit to hardening remote owner access and disrupted the established trusted-network remote-node model.
- Root cause classification: Boundary/scope mismatch. Phone Access security work was allowed to alter the separate Electron remote-node boundary.
- Refactor needed now: Yes. Remove claim and `lmn` authorization gates from active code and restore pre-existing remote-node access behavior.
- Design response: Treat remote-node Electron access as trusted private-network access. Keep QR/mobile credential pairing as a mobile-session mechanism, not as a prerequisite or replacement for Electron owner access.
- Residual risk: The full backend is not designed as an unauthenticated public internet service. Documentation must direct users to trusted LAN/company VPN/tailnet/private-network exposure rather than public exposure.

## Terminology

- `Trusted private network`: user-controlled home/company LAN, company VPN, Tailscale/Headscale tailnet, or equivalent private network where the user intentionally allows trusted devices to reach the backend.
- `Mobile credential`: paired phone credential with `mra_...` prefix for the phone/mobile journey. This remains.
- `Pairing code`: short-lived one-time QR payload value exchanged for a mobile credential. This remains.
- `Node-admin claim`: removed. No claim ID/secret should remain in the active product flow.
- `Owner session/token`: removed. No claim-derived `rao_...` token should remain.
- `Local management credential`: removed. No `lmn_...` credential should remain in the active product flow.

## Design Reading Order

1. Trusted-network remote-node model.
2. Phone QR/mobile-token separation.
3. Removal/decommission inventory for claim and `lmn`.
4. Docker mobile asset packaging.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens remote node in Electron over trusted LAN/tailnet | Normal owner/setup APIs work | Remote node trusted-network boundary | Restores core existing behavior. |
| DS-002 | Primary End-to-End | User creates Phone Access QR | Phone receives mobile credential | Remote Access pairing boundary | Keeps phone journey token/session based. |
| DS-003 | Primary End-to-End | Docker image build | `/mobile` serves packaged shell | Docker packaging | Fixes Android mobile shell load failure. |
| DS-004 | Cleanup | Claim and `lmn` implementation | Code/docs/tests removed | Remote Access and Electron cleanup | Prevents Phone Access from disrupting remote-node use. |

## Primary Execution Spines

- DS-001: `Trusted private network URL -> Electron node window -> normal REST/GraphQL/WS transports -> backend route handlers -> node setup/use succeeds`
- DS-002: `Electron Phone Setup -> pairing session -> QR/mobile payload -> phone pairing exchange -> mra mobile credential -> mobile UI/session`
- DS-003: `Docker build -> mobile web build/copy -> runtime mobile-web directory -> /mobile static route`
- DS-004: `remove launcher claim/lmn generation -> remove server claim/lmn/owner services/routes -> remove Electron claim/lmn stores/bootstrap -> remove claim/lmn UI/docs/tests`

## Trusted-Network Remote-Node Model

### Product boundary

Remote-node owner access is a trusted-network feature. If a user can reach an AutoByteus backend from Electron over a trusted home/company LAN, company VPN, Tailscale/Headscale tailnet, or equivalent private network, Electron remote-node functionality should work as it did before the claim/`lmn` changes.

The application does not attempt to prove desktop ownership with an additional AutoByteus owner credential in this default flow. Network membership and user deployment choice are the boundary for full backend access.

### Route policy implication

The server route policy must not require claim, owner-session, or `lmn` credentials for Electron remote-node access. Protected desktop/owner REST, GraphQL, and WebSocket routes should be reachable by Electron over the trusted private network as before.

Phone/mobile QR pairing remains an app-level mobile-session mechanism, not a full backend owner-auth mechanism.

### Explicit non-goals

- Do not use claim ID/secret.
- Do not use `lmn_...` hidden local launcher credentials.
- Do not require same-host launcher state for Electron remote-node use.
- Do not require Phone Setup before Electron remote-node use.
- Do not treat QR/mobile credential as an owner/admin credential.
- Do not claim the full backend is safe for direct public internet exposure.

### Documentation requirement

Docs and UI guidance must say the full backend should be exposed only on trusted private networks: home/company LAN, company VPN, Tailscale/Headscale tailnet, or equivalent. For public internet exposure, users need external access controls or a future separate security design.

## Phone QR / Mobile Credential Separation

Phone pairing remains in scope and must not alter Electron remote-node behavior.

- Desktop/Electron creates a pairing session from the node it is managing.
- The QR payload contains selected phone-facing server base URL, one-time pairing code, expiry, and display name metadata.
- Phone exchanges the code through `POST /rest/remote-access/pairing-exchanges`.
- Server creates a paired-device/mobile-session record and returns `mra_...` to the phone.
- Phone uses the mobile credential for the mobile runtime/session where current mobile code expects a paired session.
- Phone never receives claim, owner-session token, or `lmn`, because those flows are removed.

## Route Policy Target

The implementation should restore the pre-claim/pre-`lmn` remote-node behavior for Electron owner routes and protected app routes. At a design level:

| Area | Target Behavior |
| --- | --- |
| `/mobile`, mobile assets | Public static bootstrap. |
| `/rest/health`, `/rest/remote-access/status` | Public/basic status. |
| Pairing exchange | Public request with valid one-time pairing code. |
| Phone Access settings/pairing-session/devices routes | Reachable from Electron remote node over trusted private network; no claim/`lmn` gate. |
| GraphQL POST and protected app REST | Reachable from Electron remote node over trusted private network; no claim/`lmn` gate. |
| WebSocket/GraphQL-WS | Reachable from Electron remote node over trusted private network; no claim/`lmn` gate. |
| Mobile runtime session | Uses `mra_...` where the mobile client/session code expects paired phone identity. |

Implementation should remove route classes whose only purpose is claim/`lmn` owner management gating. If existing mobile credential checks are only for the mobile runtime/session and not required for Electron remote nodes, they should remain scoped to the mobile path rather than becoming a global Electron gate.

## Ownership Map

- Remote-node Electron access is owned by the existing node routing/server endpoint model and trusted private network deployment assumption.
- `RemoteAccessPairingService` owns QR pairing session creation and exchange.
- `PairedDeviceService` owns mobile credential generation, hashing, lookup, last-seen, and revocation where mobile pairing uses it.
- Phone/mobile shell owns storing and sending the mobile credential for the mobile runtime/session.
- Docker launcher owns runtime profile defaults, port binding, volumes, and image selection. It must not own claim or `lmn` credential generation.
- Phone Setup UI owns phone pairing controls, not Electron owner trust.
- Dockerfile/build scripts own packaging `/mobile` assets.

## Removal / Decommission Plan

| Item To Remove | Why | Replacement / Target |
| --- | --- | --- |
| Launcher node-admin claim generation/state/env/commands | User rejected claim; phone does not use it | No replacement |
| Launcher `lmn_...` generation/state/env/hash/verifier | Breaks non-local LAN/tailnet remote-node use | No replacement |
| `RemoteNodeAdminService`, claim constants/headers | Claim removed | No replacement |
| Owner-session REST endpoints/services/types, `rao_...` | Claim-derived owner sessions removed | No replacement |
| Local management credential service/constants/auth mode, `lmn_...` | Hidden local credential removed | No replacement |
| Electron claim store/preload/IPC/types | Claim removed | No replacement |
| Electron managed Docker credential store/preload/IPC/types | `lmn` removed | No replacement |
| Frontend owner-session/local-management stores/plugins/bootstrap | Remote-node use should not need owner credential bootstrap | Normal node routing/server endpoints |
| Phone Setup claim/local-management notices | Phone Setup should be phone-only | Phone Access QR/device controls |
| Docs telling users to copy claim or rely on `lmn` | Wrong product journey | Trusted-network remote-node + QR phone docs |

## Interface Boundary Mapping

Removed interfaces and identifiers:

- `POST /rest/remote-access/owner-sessions`
- `DELETE /rest/remote-access/owner-sessions/current`
- `x-autobyteus-node-admin-claim-id`
- `x-autobyteus-node-admin-claim`
- owner token `rao_...`
- local management credential `lmn_...`
- local management credential env vars/hash/verifier
- launcher `admin-claim` commands

Retained interfaces:

| Interface | Target Responsibility |
| --- | --- |
| `GET /rest/remote-access/status` | Basic reachability/status/server identity. |
| Phone Access settings/pairing/devices routes | Desktop/Electron management over trusted private network. |
| `POST /rest/remote-access/pairing-exchanges` | Exchange one-time pairing code for mobile credential. |
| GraphQL/protected app REST/WebSockets | Existing remote-node app functionality over trusted private network. |
| `/mobile` static route | Serve mobile web shell. |

## Target File / Subsystem Mapping

| Path / Area | Required Action |
| --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` and `.ps1` | Remove claim and `lmn` generation/state/env/output/commands. Keep `mobile-safe` runtime hardening. |
| `autobyteus-server-ts/src/remote-access/services/remote-node-admin-service.ts` | Delete if no other active usage remains. |
| `autobyteus-server-ts/src/remote-access/services/remote-owner-session-service.ts` | Delete. |
| `autobyteus-server-ts/src/remote-access/services/local-management-credential-service.ts` | Delete. |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | Remove claim headers, owner-token constants, `lmn` constants, `node_admin_claim`, `node_owner`, and `local_management` auth modes if unused. Keep mobile pairing/session models. |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Remove owner-session routes and claim/local-management reads. Keep status/settings/pairing/devices routes. |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Remove claim/`lmn` route classes and restore trusted-network remote-node behavior. |
| `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Remove owner-session and `lmn` branches. Keep mobile credential service functions needed by phone/mobile. |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | Remove `lmn` handling; restore remote-node WS behavior while keeping mobile session behavior where applicable. |
| `autobyteus-web/electron/*nodeAdminClaim*` | Delete. |
| `autobyteus-web/electron/*managedDockerCredential*` | Delete. |
| `autobyteus-web/stores/remoteOwnerSessionStore.ts` | Delete. |
| `autobyteus-web/stores/localManagementCredentialStore.ts` | Delete. |
| `autobyteus-web/plugins/*ownerSession*`, `*localManagementCredential*` | Delete. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Remove claim/`lmn` dependency; keep Phone Access settings, URL verification, QR, paired-device/mobile-session management. |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Remove claim/`lmn` sections; Phone Setup becomes phone-only. |
| `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | Remove owner/`lmn` credential preference. Keep mobile-session helper behavior only where needed by mobile runtime. |
| Dockerfiles | Keep mobile-web build/copy into server image. |
| Docs/localization/tests | Remove claim/`lmn` copy/tests; add trusted-network + QR phone docs. |

## Dependency Rules And Forbidden Shortcuts

- Phone/mobile code may depend on mobile pairing/session stores.
- Electron remote-node code must not depend on Phone Setup or mobile pairing before normal node use.
- Server route handlers must not depend on removed claim/`lmn` validators.
- Docker launcher must not produce hidden owner secrets.
- Do not broaden phone `mra_...` into an owner/admin credential to compensate for removed claim/`lmn`.

## Concrete Examples

Good existing-style Electron remote-node use:

```text
Electron node URL: https://desktop-or-docker.tailnet.ts.net
Action: open Agents / Settings / Phone Setup
Expected: works normally over trusted tailnet, no claim or lmn setup
```

Good phone use:

```text
Phone opens: https://desktop-or-docker.tailnet.ts.net/mobile?pairing=...
Action: exchange pairing code
Expected: receives mra_... mobile credential for mobile session
```

Bad removed flow:

```text
Open Docker node -> forced to Phone Setup -> paste claim ID/secret
```

Bad removed flow:

```text
Open remote Docker node -> Electron searches local launcher state for lmn -> fails because node is on another machine
```

## Backward-Compatibility Rejection Log

| Candidate | Decision | Reason |
| --- | --- | --- |
| Keep claim as advanced fallback | Rejected | User requested removal; it complicates normal journey. |
| Keep `lmn` for same-host only | Rejected as default flow | Breaks/complicates core LAN/tailnet remote-node usage and creates inconsistent behavior. |
| Require Phone QR before Electron remote-node use | Rejected | Phone pairing must be additive and phone token is not owner auth. |
| Broaden `mra_...` into owner/admin token | Rejected | Conflates phone/mobile session with owner access. |
| Optional future strict owner pairing | Deferred | Could be a separate opt-in security design, not this ticket. |

## Migration / Refactor Sequence

1. Remove claim and `lmn` generation/state/env/output/commands from shell and PowerShell launchers.
2. Remove server claim, owner-session, and local-management credential services/routes/types/branches/tests.
3. Restore route policy and auth behavior so Electron remote nodes over trusted private networks work without claim/`lmn`.
4. Remove Electron claim and managed-Docker credential stores/preload/main IPC/types.
5. Remove frontend owner-session/local-management stores/plugins/bootstrap and transport credential preference.
6. Simplify Phone Access store/component/localization/docs to phone QR/mobile-session behavior only.
7. Keep/update Docker image Dockerfile(s) to build/copy mobile web assets to the server static route path.
8. Update docs to explain trusted LAN/company VPN/tailnet model and warn against public internet exposure of the full backend.
9. Validate Electron remote-node LAN/tailnet-style access, phone QR/mobile pairing, and Docker `/mobile` packaging.

## Validation Plan

Required focused tests/checks:

- Code search/static checks: no active `node-admin claim`, `owner-session`, `rao_`, or `lmn_` code paths remain outside historical ticket artifacts.
- Launcher checks: no claim or `lmn` env vars/state fields/commands/output in shell or PowerShell launchers.
- Server route tests: representative remote-node REST/GraphQL/WS requests work without claim/`lmn` under the restored trusted-network model.
- Phone pairing tests: QR pairing exchange still returns/stores `mra_...` and mobile pairing payload/session does not contain removed owner credentials.
- Frontend tests: remote Electron node no longer redirects to Phone Setup or requires credential bootstrap; Phone Setup has no claim/`lmn` fields.
- Docker smoke: fresh mobile-safe image/container serves `/mobile` with 200.

## Key Tradeoffs

- This restores the simple remote-node product and avoids breaking the 90-99% trusted LAN/tailnet use case.
- It intentionally does not solve public-internet hardening for the full backend. Users should deploy the full backend only on trusted private networks or add external access controls.
- Future optional strict security can be designed separately without changing the default trusted-network journey.

## Guidance For Implementation

- Remove claim and `lmn` cleanly; do not leave hidden compatibility branches.
- Do not add another owner secret under a different name.
- Do not make Phone Setup a gate for Electron node use.
- Preserve phone QR/mobile-session behavior.
- Preserve Docker `mobile-safe` runtime hardening and `/mobile` packaging fixes.
- Update tests and docs in the same rework so old claim/`lmn` instructions do not survive.
