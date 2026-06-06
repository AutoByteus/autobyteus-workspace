# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by user on 2026-06-06.

## Goal / Problem Statement

Restore a coherent Phone Setup/Phone Access flow where both Tailscale HTTPS and trusted Local LAN/private HTTP setup paths can be used to pair a phone, instead of making Tailscale Serve HTTPS the only QR-capable path.

The user-visible symptom is: Local LAN can still appear/select as a discovered URL candidate, but selecting it does not allow QR-code generation. Static investigation confirms this is not only a frontend rendering issue: the frontend intentionally disables QR creation for any non-HTTPS selected URL, and the backend pairing service also rejects HTTP pairing-session creation.

## Investigation Findings

- Current Phone Setup contains a Tailscale Serve guide and `PhoneAccessCard`.
- The frontend still fetches and displays discovered candidates from `/remote-access/address-candidates`, including `lan` and `tailnet_like` candidates produced by `AddressCandidateService`.
- The selected Local LAN candidate is HTTP in the normal local server configuration, e.g. `http://192.168.x.x:29695`.
- `PhoneAccessCard.vue` computes `canCreatePairingSession` with `store.selectedUrlValidation.isHttps`; therefore selecting an HTTP Local LAN candidate disables the **Create QR code** button.
- `phoneAccessStore.ts` does not auto-select HTTP candidates; it only auto-selects candidates accepted by `normalizeHttpsPhoneAccessCandidate()`.
- `phoneAccessRemoteNode.ts` returns an HTTPS-required validation message for every non-HTTPS selected URL.
- `RemoteAccessPairingService.createPairingSession()` enforces HTTPS after URL normalization via `assertHttpsServerBaseUrl()` and returns `REMOTE_ACCESS_HTTPS_REQUIRED` for HTTP.
- The current docs and localization emphasize Tailscale Serve HTTPS, label the manual field `Tailscale Serve HTTPS URL`, and call HTTP LAN/Tailscale-IP candidates diagnostic-only.
- Git history shows this behavior was introduced intentionally by commit `37ddd9a9 feat(remote-access): harden phone setup pairing flow` on 2026-05-22; before that commit the frontend selected non-loopback candidates and the backend allowed HTTP pairing URLs.
- Android code still supports private HTTP/LAN nodes with explicit acknowledgement: `network_security_config.xml` permits cleartext traffic for acknowledged private LAN/tailnet nodes, `NodeUrlNormalizer` supports `http://`, and `ConnectionDiagnosticMapper.httpNeedsAcknowledgement()` tells users HTTP is acceptable only for trusted private LAN/tailnet.
- Therefore the current desktop/web/server QR creation policy is narrower than both the user's expectation and the Android client capability model.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small and targeted
- Evidence basis: Connection-mode policy is enforced independently in frontend validation, frontend candidate selection, backend pairing creation, docs, and Android native acknowledgement policy. The product-level network model still says trusted private LAN is a supported setup profile, but the QR creation path hard-blocks it.
- Requirement or scope impact: A fix must change both frontend and backend policy. A frontend-only button change would still fail at `/remote-access/pairing-sessions`.

## Recommendations

1. Treat this as a cross-surface policy correction, not a one-line frontend button bug.
2. Preserve Tailscale Serve HTTPS as the recommended/default travel-safe setup path.
3. Restore Local LAN/private HTTP as an explicit trusted-private-network path for phone pairing, with clear warning/acknowledgement copy so users understand it is cleartext and should only be used on a trusted LAN/tailnet.
4. Keep backend enforcement as the authoritative pairing policy boundary; frontend validation should mirror backend policy for good UX but must not become the only guard.
5. Align web/server docs with the existing Android native capability: HTTPS is preferred, HTTP is allowed only for acknowledged private LAN/tailnet/local development use.
6. Do not allow loopback/container-local URLs (`localhost`, `127.*`, `::1`, `host.docker.internal`, etc.) as phone-facing QR targets for remote-node windows; the phone cannot use those to reach the intended node.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- User opens Settings -> Nodes -> Phone Setup for the embedded desktop node.
- User selects or enters a Tailscale Serve HTTPS `/mobile` URL and creates a QR code as today.
- User selects a discovered Local LAN/private HTTP candidate and can create a QR code after the UI clearly marks it as trusted-LAN/cleartext.
- User manually enters a Local LAN/private HTTP URL and can create a QR code only under the same trusted-LAN/cleartext policy.
- User opens a remote-node Phone Setup window and enters a phone-facing URL that maps to that same node; server identity verification must still run for remote-node QR creation.
- Android users who scan or paste an HTTP LAN pairing link continue through the Android-owned HTTP acknowledgement path.

## Out of Scope

- Public-internet exposure of the AutoByteus backend or public HTTP QR pairing.
- Removing Tailscale Serve HTTPS guidance.
- Automating Tailscale installation, login, Serve execution, or network inspection.
- Reworking the mobile credential protocol beyond allowing the selected server base URL schemes required by this task.
- Native Android UI changes unless later validation finds the existing acknowledgement path is broken.

## Functional Requirements

- `REQ-001`: Phone Setup must support both Tailscale/private HTTPS and trusted Local LAN/private HTTP URL candidates for QR-based phone pairing.
- `REQ-002`: Selecting a Local LAN/private HTTP candidate must not suppress or permanently disable QR-code creation solely because the scheme is `http:`.
- `REQ-003`: The UI must keep HTTPS/Tailscale as the recommended/default path and visibly warn that HTTP LAN pairing uses cleartext and should only be used on a trusted private LAN/tailnet.
- `REQ-004`: Backend pairing-session creation must accept Local LAN/private HTTP URLs that satisfy the approved private-network policy, not reject all HTTP URLs categorically.
- `REQ-005`: Backend pairing-session creation must continue to reject unsupported schemes, empty/invalid URLs, and phone-unreachable local-only hosts where applicable.
- `REQ-006`: Remote-node QR creation must continue to verify that the advertised phone-facing URL reaches the same `serverInstanceId` as the management URL before creating a QR, for both allowed HTTPS and allowed private HTTP URLs.
- `REQ-007`: Existing Tailscale Serve HTTPS QR behavior, canonical `serverBaseUrl` normalization, and `/mobile` QR URL derivation must remain intact.
- `REQ-008`: Address-candidate auto-selection and labels must make Local LAN and Tailscale HTTPS choices understandable rather than labeling all HTTP candidates diagnostic-only.
- `REQ-009`: Tests and durable docs must cover both HTTPS/Tailscale QR creation and Local LAN/private HTTP QR creation.

## Acceptance Criteria

- `AC-001`: Given Phone Access is enabled and the selected candidate is `http://192.168.x.x:29695`, the Phone Access UI exposes/enables the QR creation action after showing trusted-LAN/cleartext guidance.
- `AC-002`: Given the selected candidate is `https://desktop.tailnet.ts.net/mobile`, the current Tailscale Serve HTTPS QR creation behavior still succeeds and stores canonical `serverBaseUrl: "https://desktop.tailnet.ts.net"`.
- `AC-003`: Given the selected candidate is Local LAN HTTP, the backend creates a pairing session whose `payload.serverBaseUrl` is the canonical HTTP LAN base and whose `mobileUrl` appends `/mobile?pairing=...`.
- `AC-004`: Given a caller attempts to create a pairing session with an unsupported scheme or invalid URL, the backend rejects it with a clear 400-style error.
- `AC-005`: Given a remote-node window uses an advertised HTTP or HTTPS phone-facing URL, QR creation does not proceed until `/rest/remote-access/status` verifies the advertised URL reaches the same `serverInstanceId` as the management URL.
- `AC-006`: Given a remote-node window uses `localhost`, `127.*`, `::1`, `0.0.0.0`, `host.docker.internal`, or equivalent local-only URL as the phone-facing URL, QR creation is blocked with a clear phone-unreachable message.
- `AC-007`: Given HTTP-only candidates are available, the UI no longer describes them as “diagnostic only” with no path to QR creation; instead it identifies them as Local LAN/private HTTP choices with appropriate warnings.
- `AC-008`: Given Android scans or receives an HTTP LAN pairing link, the generated payload remains compatible with the existing Android parser/normalizer that supports `http://` and explicit HTTP acknowledgement.
- `AC-009`: Frontend unit tests cover Local LAN HTTP QR eligibility, HTTPS/Tailscale QR eligibility, and remote-node local-only rejection.
- `AC-010`: Backend unit/e2e tests cover HTTPS success, Local LAN/private HTTP success, invalid/public/local-only rejection as applicable, and remote-node identity verification behavior where covered at frontend/store level.

## Constraints / Dependencies

- Must respect the existing canonical URL model: `serverBaseUrl` is the API base without `/mobile`; `mobileUrl` is derived by appending `/mobile`.
- Must not make frontend validation the only enforcement point; backend pairing service remains authoritative.
- Must preserve mobile credential separation from trusted desktop/owner management routes.
- Local LAN support should align with Android's existing cleartext acknowledgement behavior.
- Test execution in this worktree currently requires dependency installation; targeted test command failed because `autobyteus-web/node_modules` is absent.

## Assumptions

- The user wants Local LAN HTTP pairing restored for trusted home/office LAN use, not public internet HTTP pairing.
- The existing Android acknowledgement flow is acceptable for HTTP LAN pairing and does not require native changes.
- Tailscale Serve HTTPS should stay the recommended path for travel, unstable networks, and origin stability.

## Risks / Open Questions

- Manual HTTP URLs should use deterministic private/local host admission rather than unrestricted public HTTP; advanced public-looking private-DNS cases may need a future explicit override if users require them.
- Browser/PWA users opening HTTP LAN URLs do not have the Android-native acknowledgement layer; the web UI should make the cleartext risk explicit before QR creation.
- Pairing over HTTP exposes a short-lived one-time code on the trusted LAN; this is acceptable only if the product explicitly treats the LAN/tailnet as trusted.
- If remote-node HTTP identity verification uses browser `fetch`, CORS/network behavior may need validation in the actual Electron window environment.

## Requirement-To-Use-Case Coverage

- Tailscale/private HTTPS flow: `REQ-001`, `REQ-003`, `REQ-007`
- Local LAN/private HTTP embedded flow: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-008`
- Remote-node phone-facing URL flow: `REQ-005`, `REQ-006`
- Android compatibility and docs/tests: `REQ-009`, plus `REQ-004`/`REQ-007` URL payload compatibility

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`, `AC-003`, `AC-007`: Validate the reported Local LAN QR regression.
- `AC-002`: Guards existing Tailscale Serve HTTPS behavior.
- `AC-004`, `AC-006`: Preserve safety boundaries.
- `AC-005`: Guards remote-node identity correctness.
- `AC-008`: Confirms the generated QR remains compatible with the native Android path.
- `AC-009`, `AC-010`: Ensure the behavior is durable across frontend/backend validation.

## Approval Status

Approved by user on 2026-06-06. User confirmed that AutoByteus previously supported both Tailscale HTTPS and Local LAN, and that Local LAN should remain available for trusted home/local use rather than being categorically forbidden.
