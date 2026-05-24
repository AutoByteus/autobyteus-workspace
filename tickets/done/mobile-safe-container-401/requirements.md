# Requirements Doc

## Status

Design-ready - reworked after user requirement change on 2026-05-23: remove both claim and `lmn` local-management credential; preserve existing trusted LAN/tailnet remote-node behavior; keep only phone QR/mobile-token pairing for Phone Access.

## Goal / Problem Statement

Restore the pre-existing remote-node product model while adding phone QR pairing without breaking ordinary Electron remote-node usage.

Historical/product context from the user:

- The **Add Remote Node** feature exists primarily because users commonly work on trusted home/company LANs or trusted private tailnets/VPNs.
- This LAN/tailnet remote-node workflow is core usage and must continue to work naturally.
- The newer Android/phone work was intended to let a phone connect to the desktop/Docker node while travelling, using QR pairing and a mobile credential.
- Phone pairing must be additive. It must not force extra owner/auth setup on normal Electron remote-node use.

Therefore this ticket must remove both user-facing node-admin claims and the later `lmn_...` local-management credential requirement from the default product flow. Electron remote nodes should work like before on trusted LAN/tailnet/private-network deployments. Phone/mobile clients should use QR pairing and paired mobile credentials.

Target journey:

```text
Electron remote node over trusted LAN / company network / tailnet
-> Add/Open node
-> Use/configure node normally, as before

Phone over trusted LAN / company network / tailnet
-> Scan QR
-> Exchange pairing code
-> Receive mobile credential mra_...
-> Use mobile UI with mobile credential
```

The Docker `/mobile` asset packaging fix remains in scope.

## Investigation Findings

- The original screenshot `401` was not a server-start failure; `/rest/health` returned 200 while `/graphql` returned `401 REMOTE_ACCESS_AUTH_REQUIRED`.
- The claim was not used by the phone. It became an Electron owner/admin setup mechanism and made the journey confusing.
- The subsequent `lmn_...` automatic local-management credential solved same-host launcher-created Docker, but it fails the user's core remote-node use case: connecting Electron to a Docker/server node by LAN/tailnet IP or HTTPS URL when launcher state is not available on the same machine/user account.
- The user explicitly clarified that trusted LAN/company network/tailnet remote-node use is 90-99% of the product usage and must not be broken.
- The user explicitly requested removing `lmn` as well as claim-related code.
- Phone/mobile clients already use a separate mobile credential after QR pairing (`mra_...`), which can continue to identify paired phones for the mobile journey.
- The Docker `/mobile` static asset issue is still real and should remain in scope: fresh Docker images must serve `/mobile` without manual `docker cp`.

## Design Health Assessment

- Change posture: Requirement pivot / simplification plus compatibility restoration and Docker packaging bug fix.
- Root cause classification: Security-boundary overreach / design drift. Claim and `lmn` mechanisms protect against broader network exposure but break the intended trusted LAN/tailnet remote-node model.
- Refactor posture: Refactor needed now. Remove claim and `lmn` authorization gates from the active default product flow; restore trusted-network remote-node behavior; keep phone QR/mobile credential flow.
- Security posture after rework: The full backend is intended for trusted private networks only: home/company LAN, company VPN, Tailscale/Headscale/tailnet, or equivalent. AutoByteus must document not to expose the full backend directly to the public internet. QR/mobile tokens remain the phone-specific pairing/session mechanism.

## Recommendations

1. Remove user-facing node-admin claim ID/secret requirements from Docker setup and Phone Setup.
2. Remove claim-derived owner-session code and UI.
3. Remove `lmn_...` local-management credential generation, server validation, Electron lookup, and transport injection from the default flow.
4. Restore Electron remote-node access over trusted LAN/tailnet/private-network URLs so it works like before.
5. Keep phone QR pairing and `mra_...` mobile credential behavior for phone/mobile clients.
6. Keep `mobile-safe` Docker runtime hardening: no default privileged flags, no automatic shared host bind mounts, and localhost-bound management ports by default when that profile is used.
7. Keep Docker image packaging of `/mobile` assets.
8. Update docs/UI copy so users understand: remote nodes are trusted-network/private-network endpoints; Phone Access adds QR pairing for mobile clients; do not expose the full backend directly to the public internet.

## Scope Classification

Medium

## In-Scope Use Cases

- UC-001: User adds/opens an AutoByteus server/Docker node by LAN IP, company network hostname, VPN URL, or Tailscale/Headscale HTTPS URL from Electron and uses it normally.
- UC-002: User starts a standard or `mobile-safe` Docker node and opens it in Electron without claim, `lmn`, or same-host launcher-state requirements.
- UC-003: User optionally opens Phone Setup and creates a QR for a phone.
- UC-004: Phone scans QR, exchanges the pairing code, receives a mobile credential, and uses that credential for the mobile journey.
- UC-005: Fresh Docker images serve `/mobile` successfully so Android QR flows load the mobile shell.
- UC-006: Existing claim-related and `lmn`-related UI, launcher output, environment variables, server services, frontend stores/plugins, docs, and tests are removed or rewritten.

## Out of Scope

- Adding a new manual owner-auth secret to replace the claim.
- Adding a hidden local launcher credential requirement to replace `lmn`.
- Broad Phase Two operation-level mobile least-privilege hardening.
- Cloud account authentication or external identity provider flows.
- Reworking unrelated remote browser pairing (`Pair local browser`) behavior.
- Making the full backend safe as a public internet service.
- Designing a separate remote Docker owner pairing/import flow; if desired later, that should be a future optional strict-mode/security feature, not part of this ticket.

## Functional Requirements

- REQ-001: The public Docker launcher must not generate, print, persist, rotate, or pass node-admin claim ID/secret/hash/scope values.
- REQ-002: The public Docker launcher must not generate, print, persist, or pass `lmn_...` local-management credentials or their hashes/verifiers.
- REQ-003: The backend must remove the node-admin claim validation path, claim-derived owner-session endpoint/token path, and `lmn` local-management credential validation path from the default active product flow.
- REQ-004: Electron remote-node windows must not require local launcher state, claim setup, `lmn` credential lookup, or Phone Setup before normal owner/setup APIs work.
- REQ-005: Electron remote-node protected REST, GraphQL, and relevant WebSocket flows over trusted LAN/tailnet/private-network URLs must work as they did before the claim/`lmn` work.
- REQ-006: Phone/mobile QR pairing must remain short-lived and one-time use, and the phone must receive a mobile credential (`mra_...`) for the mobile journey.
- REQ-007: Phone/mobile code must continue to store/use the mobile credential for mobile requests where the mobile runtime expects a paired session.
- REQ-008: Phone/mobile pairing payloads and stored mobile sessions must not contain claim, owner-session, or `lmn` credentials because those no longer exist in the flow.
- REQ-009: The `mobile-safe` profile must retain its runtime hardening defaults: localhost-bound published ports, no default `SYS_ADMIN`, no `seccomp=unconfined`, and no automatic shared host bind mounts.
- REQ-010: The Docker server image used by the public launcher must include built mobile web assets at the path served by `/mobile`.
- REQ-011: UI copy/docs must remove claim and `lmn` instructions and explain the simpler model: use remote nodes only on trusted private networks; phone access is QR/mobile-token based.
- REQ-012: Tests must prove claim/owner-session and `lmn` code paths are gone, trusted-network remote Electron access is restored, phone QR pairing still works, and `/mobile` packaging works.

## Acceptance Criteria

- AC-001: Given a remote AutoByteus node reachable over trusted LAN/company network/tailnet, Electron can add/open/use it without claim, `lmn`, or local launcher-state access.
- AC-002: Given a Docker node started on another machine and exposed on the user's trusted LAN/tailnet, Electron can add/open/use its Backend URL normally.
- AC-003: Given a fresh local `mobile-safe` Docker node, adding/opening it in Electron no longer redirects to Phone Setup for claim registration and no longer requires `lmn` lookup.
- AC-004: Given a fresh standard Docker node, Electron behavior remains natural and does not require claim or `lmn` setup.
- AC-005: Given phone pairing, the QR exchange returns a mobile credential and the mobile client can store/use it for the mobile journey.
- AC-006: Given phone/mobile pairing payloads and local sessions, no claim, owner-session token, or `lmn` credential is present.
- AC-007: Given a newly built Docker image, `GET /mobile` returns HTML (`200 OK`) instead of `Mobile web assets are not installed.`
- AC-008: Code search and tests show no active node-admin claim store, claim headers, owner-session endpoint, owner token prefix, `lmn` credential prefix/service/store, or launcher `admin-claim` command remains in the active product flow.
- AC-009: Documentation no longer tells users to copy/paste claim ID/secret or depend on `lmn`; documentation clearly says the full backend should be reachable only on trusted LAN/company VPN/tailnet/private networks, not the open public internet.

## Constraints / Dependencies

- Do not reintroduce manual claim, owner token, `lmn`, or equivalent owner secret under a different name.
- Do not make Phone Setup a prerequisite for Electron remote-node access.
- Keep Docker management ports localhost-bound in the `mobile-safe` launcher profile.
- Keep `/mobile` asset packaging durable in Docker images.
- Keep the phone QR/mobile-session implementation, but do not let it alter or break the existing Electron remote-node model.

## Assumptions

- Users intentionally run AutoByteus remote nodes on trusted home/company LANs, company VPNs, or trusted tailnets such as Tailscale/Headscale.
- Users do not expose the full AutoByteus backend directly to the public internet unless they understand and accept that risk or add their own external access controls.
- Phone-facing access uses the same trusted private network/tailnet reachability plus QR/mobile-session pairing for the mobile client experience.

## Risks / Open Questions

- Removing claim and `lmn` restores trusted-network behavior but does not harden the full backend as a public internet service. This is an intentional product tradeoff based on the user's stated usage model.
- If future users require arbitrary public or untrusted-network remote Docker management, that needs a separate optional strict/owner-pairing design and must not be silently grafted onto Phone Access.
- Implementation must remove `lmn` code without accidentally removing phone QR/mobile-session code or Docker `/mobile` packaging fixes.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-006
- REQ-002 -> UC-006
- REQ-003 -> UC-006
- REQ-004 -> UC-001, UC-002
- REQ-005 -> UC-001, UC-002
- REQ-006 -> UC-003, UC-004
- REQ-007 -> UC-004
- REQ-008 -> UC-004, UC-006
- REQ-009 -> UC-002
- REQ-010 -> UC-005
- REQ-011 -> UC-001, UC-003, UC-006
- REQ-012 -> UC-001, UC-004, UC-005, UC-006

## Acceptance-Criteria-To-Scenario Intent

- AC-001 through AC-004 verify restoration of the core trusted-network Electron remote-node journey.
- AC-005 and AC-006 verify phone QR/mobile-session pairing remains and does not carry removed owner credentials.
- AC-007 verifies the Docker mobile shell packaging fix remains.
- AC-008 and AC-009 verify claim/`lmn` removal and docs alignment are complete.

## Approval Status

Approved rework by user on 2026-05-23: user explicitly requested removal of both claim and `lmn` mechanisms because trusted LAN/tailnet Electron remote-node usage is core product behavior and phone QR pairing must be additive, not disruptive.
