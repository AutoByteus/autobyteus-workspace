# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready for architecture review, round 2: Phase One Android pairing with a mobile-safe Docker node. Revised after architecture review round 1 findings `AR-P1-001`, `AR-P1-002`, and `AR-P1-003`.

## Goal / Problem Statement

Enable Android/mobile Phone Access to pair with a **mobile-safe Docker AutoByteUs node** through the existing remote-node workflow, so mobile-originated work can run inside the Docker node instead of the embedded host desktop node.

The current high-priority security objective is to change the practical default path from:

```text
Android phone -> embedded host desktop AutoByteUs -> host computer runtime
```

to:

```text
Android phone -> mobile-safe Docker AutoByteUs node -> controlled container runtime
```

This ticket intentionally focuses on the first security milestone: Docker-node pairing and the mobile-safe Docker profile. Broader backend mobile authorization hardening remains important but is split into a future ticket.

## Investigation Findings

- The frontend already supports remote nodes: users can add a Docker node in Settings → Nodes and click **Open**, which opens a separate Electron window bound to that node.
- Phone Access controls are currently shown only for the embedded/server node. In a remote-node window, `NodeManager.vue` shows an unavailable Phone Setup notice instead of `PhoneAccessCard`.
- Backend Phone Access management endpoints (`/rest/remote-access/settings`, `/pairing-sessions`, `/devices`, revoke endpoints) are currently `LOCAL_ONLY`, based on loopback peer IP.
- A host Electron window calling a Docker node through a published port is not loopback from the container's point of view; the container typically sees a Docker bridge address. Therefore the current local-only model blocks normal remote Docker node Phone Access management.
- The Docker public launcher currently starts containers with broad defaults: root container, `SYS_ADMIN`, `seccomp=unconfined`, backend/VNC/noVNC/debug ports published without a `127.0.0.1` host bind, and automatic host-backed workspace/shared mounts.
- The user clarified that terminal control should be removed from mobile UI entirely. Viewing files may be useful, but terminal on phone is low-value and high-risk.
- The user clarified that automatic shared Docker mounts are over-complicated for the secure mobile path. Mobile-safe Docker nodes should not automatically mount shared host folders; companies/users can add explicit mounts when creating a container if needed.
- Architecture review round 1 approved the narrowed direction but required concrete design rework for three Phase One boundaries: node-admin claim lifecycle/custody/request shape, Android-facing Docker advertised URL verification when management ports are localhost-bound, and complete mobile terminal/Tools/VNC UI removal mapping.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + Security Hardening, Phase One.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed for remote-node Phone Access management and Docker launcher profile split.
- Evidence basis: The existing node registry/Electron window model can connect to Docker nodes, but Phone Access management is embedded-node-only in the UI and local-only in the backend. Docker node management needs an explicit owner/admin claim channel rather than broadening loopback trust.
- Requirement or scope impact: Phase One must add a node-owner/admin path for Docker node Phone Access management, expose Phone Access setup inside the opened Docker node window, and create a mobile-safe Docker launcher profile.

## Recommendations

1. Keep the user's proposed flow as the product path:
   ```text
   create mobile-safe Docker node -> add/open node -> separate Electron window bound to Docker node -> Phone Access setup for that Docker node -> Android scans QR -> mobile pairs to Docker node
   ```
2. Do not make Android pair to the embedded host by default. Present Docker mobile-safe pairing as the recommended secure path.
3. Do not weaken `LOCAL_ONLY` by treating Docker bridge/LAN addresses as local. Add a narrow Docker-node owner/admin claim for Phone Access management.
4. Add a mobile-safe Docker profile with safer runtime defaults.
5. Remove terminal from mobile UI in this ticket because it is small, high-signal, and aligned with the mobile-safe product shape.
6. Move broader backend mobile authorization hardening into a separate future ticket.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-Large.

This phase crosses Docker launcher scripts, Electron/node manager UI, backend Phone Access management authorization, Android/mobile pairing flow validation, and docs. It does not include full backend operation-level authorization hardening.

## In-Scope Use Cases

- UC-P1-001: User creates a mobile-safe Docker AutoByteUs node.
- UC-P1-002: User adds/opens that Docker node in AutoByteUs desktop, producing a separate Electron window connected to that Docker node.
- UC-P1-003: In the Docker node window, user can enable Phone Access, create a pairing QR/link, list paired phones, and revoke phones for that Docker node.
- UC-P1-004: Android scans the Docker node QR/link and pairs with the Docker node.
- UC-P1-005: Mobile-started work runs in the Docker node/container runtime, not the embedded host node.
- UC-P1-006: Mobile-safe Docker node starts without automatic shared host mounts and without privileged Docker flags by default.
- UC-P1-007: Mobile UI does not show terminal functionality.

## Out of Scope

- Full operation-level GraphQL/REST/WebSocket mobile authorization hardening.
- Mobile credential storage/token redesign.
- Short-lived access-token/refresh-token rotation.
- Audit log and advanced active-session revocation.
- Backend hard denial of every future high-risk mobile operation except the narrow changes required to enable Docker-node Phone Access management.
- A mobile terminal, including hidden advanced terminal UX.
- Automatic shared host mounts in the mobile-safe Docker profile.

## Functional Requirements

- R-P1-001: The Docker launcher must support a mobile-safe node profile/command.
- R-P1-002: The mobile-safe Docker profile must not add `SYS_ADMIN` by default.
- R-P1-003: The mobile-safe Docker profile must not set `seccomp=unconfined` by default.
- R-P1-004: The mobile-safe Docker profile must not create automatic shared host bind mounts. Host folder mounts must be explicit user-selected creation-time options if supported.
- R-P1-005: The mobile-safe Docker profile must bind backend/VNC/noVNC/debug published ports to `127.0.0.1` or disable nonessential VNC/noVNC/debug ports by default.
- R-P1-006: The launcher output must clearly identify the node as mobile-safe and show the backend URL to add/open in Settings → Nodes.
- R-P1-007: The frontend must allow Phone Access controls in a remote Docker node window when that node has a valid owner/admin claim for Phone Access management.
- R-P1-008: Remote Docker node Phone Access management must use a narrow node-owner/admin claim/token. It must not broaden loopback trust to Docker bridge, LAN, or all remote addresses.
- R-P1-008A: For mobile-safe Docker nodes, the launcher must generate a random node-admin claim secret and claim ID at container creation, pass only the claim hash/ID/scope to the container, store the raw secret only in local launcher state, and print/provide it to the local owner for desktop registration.
- R-P1-008B: The desktop/Electron app must store node-admin claims outside renderer localStorage, bind each stored claim to the remote node ID and normalized management base URL, expose only redacted claim state in normal node snapshots, and attach the raw claim only to claim-backed Phone Access management requests.
- R-P1-008C: Claim-backed requests must use explicit headers such as `X-Autobyteus-Node-Admin-Claim-Id` and `X-Autobyteus-Node-Admin-Claim`; server logs and diagnostics must redact these headers and any claim query/body fields.
- R-P1-008D: The node-admin claim scope is limited to Phone Access owner routes: settings, address/advertised-origin validation, pairing-session creation, paired-device listing, and revocation. It must not authorize GraphQL, files, terminal, runs, packages, settings outside Phone Access, or browser bridge routes.
- R-P1-008E: Phase One claim rotation is launcher-owned: rotating or recreating the mobile-safe Docker node generates a new claim hash/secret and invalidates the old desktop-stored claim; desktop UI must show missing/invalid claim state and require the owner to paste/register the new claim.
- R-P1-009: From the Docker node window, the user must be able to enable Phone Access, create a Docker-node pairing QR/link, list paired devices, and revoke devices for that Docker node.
- R-P1-010: Pairing QR/link created from the Docker node window must point Android at an Android-facing HTTPS URL for the Docker node, not the desktop management URL unless that URL is also Android-reachable and HTTPS.
- R-P1-010A: Remote Docker Phone Access UI must distinguish `managementBaseUrl` (used by desktop/Electron to manage the Docker node) from `mobileAdvertisedBaseUrl` (encoded into the QR and used by Android).
- R-P1-010B: In remote Docker node windows, automatic address candidates from inside the Docker node are diagnostic only; QR creation requires an explicit manually entered Android-facing HTTPS URL such as a Tailscale Serve/private HTTPS URL mapped to the Docker node. Loopback/container-local URLs must be rejected for QR creation.
- R-P1-010C: Before creating a QR, the UI/backend must verify that the selected Android-facing URL reaches the same Docker node as the management base URL, using a stable server instance identity returned by `/rest/remote-access/status` or an equivalent node fingerprint. If the IDs do not match or cannot be verified, QR creation must fail with guidance.
- R-P1-011: Android must be able to scan/open that QR/link and complete pairing with the Docker node using the existing mobile pairing exchange path, updated only as needed for Docker node reachability/origin.
- R-P1-012: After pairing, mobile work must bind to the Docker node base URL/session and execute against the Docker node backend.
- R-P1-013: The standard mobile UI must remove terminal and the current Tools terminal/VNC page entirely: no terminal tab, Tools tab, button, route link, terminal panel, VNC panel, or terminal/VNC feature label should be visible to mobile users in Phase One.
- R-P1-014: Documentation must explain the recommended secure flow: create mobile-safe Docker node, open the Docker node window, create Phone Access QR there, pair Android to that Docker node.
- R-P1-015: Documentation must state that this is Phase One and that deeper backend mobile authorization hardening is tracked as a future ticket.

## Acceptance Criteria

- AC-P1-001: A user can create/start a mobile-safe Docker node from the launcher.
- AC-P1-002: Inspecting the Docker run configuration for the mobile-safe node shows no `--cap-add SYS_ADMIN`, no `--security-opt seccomp=unconfined`, and no automatic shared host bind mounts.
- AC-P1-003: Published ports for the mobile-safe node are bound to `127.0.0.1` or nonessential ports are disabled by default.
- AC-P1-004: User can add the Docker backend URL as a remote node and click **Open** to open a separate Electron window connected to that Docker node.
- AC-P1-005: The Docker node window shows Phone Access controls for that Docker node when a valid node-owner/admin claim is available; when the claim is missing or invalid, it shows a paste/register claim state instead of silently falling back to embedded-node behavior.
- AC-P1-006: Docker node Phone Access setup does not require treating Docker bridge/LAN addresses as loopback/local, and claim-backed requests authorize only Phone Access owner routes.
- AC-P1-006A: Server-side claim validation compares only hashed configured claim secrets, rejects wrong claim ID/secret, and redacts claim headers in logs.
- AC-P1-007: QR/link generated in the Docker node window contains the validated Android-facing HTTPS Docker node URL/origin, not the desktop management base URL unless explicitly verified as Android-facing.
- AC-P1-007A: If the user enters localhost, container-local, HTTP, embedded-host, or a URL whose status fingerprint does not match the Docker node management target, QR creation fails with clear guidance.
- AC-P1-008: Android pairs successfully to the Docker node from that QR/link.
- AC-P1-009: A mobile-started test run goes to the Docker node backend and uses the Docker/container workspace, not the embedded host node.
- AC-P1-010: Mobile UI does not display terminal or the current Tools terminal/VNC page; tests no longer assert Terminal/VNC mobile rendering.
- AC-P1-011: Docs include the Phase One flow and explicitly point broader mobile backend authorization hardening to the future ticket.

## Constraints / Dependencies

- Reuse the existing node registry and node-bound Electron window model.
- Reuse existing Phone Access services where practical, but add a remote-node owner/admin management path rather than relaxing local-only trust.
- Docker launcher changes must be applied consistently to shell and PowerShell launchers if both are in scope.
- Android pairing still requires a reachable URL for the Docker node. If the backend port is loopback-bound, the recommended external reachability path should be a controlled private HTTPS/tunnel/serve path, not broad raw port exposure.

## Assumptions

- The user accepts a phased security delivery model: Phase One prioritizes Docker-node pairing and mobile-safe container defaults; Phase Two hardens backend mobile operation authorization.
- The mobile-safe Docker profile can remove automatic shared mounts without breaking the core phase-one pairing/run flow.
- Any company/user needing host mounts can add them explicitly outside the default mobile-safe profile.

## Risks / Open Questions

- The exact UI copy and command names for showing/rotating the launcher-generated node-admin claim can be finalized in implementation, but the boundary and data flow are now fixed: launcher generates raw secret, container receives hash, desktop stores raw claim locally, and server validates only Phone Access owner routes.
- If Docker backend ports are bound to `127.0.0.1`, Android reachability needs a controlled serve/tunnel path. The implementation must make this clear in UI/docs and must verify the Android-facing URL reaches the same Docker node before QR creation.
- Some current Docker workflows may expect automatic shared mounts. Mobile-safe profile should be separate from compatibility profiles to avoid breaking existing non-mobile workflows.
- Removing terminal from mobile UI is not the same as full backend denial; backend hardening for terminal/direct API bypass is future-ticket scope unless the phase-one implementation can include a small direct deny safely.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-P1-001 | R-P1-001, R-P1-002, R-P1-003, R-P1-004, R-P1-005, R-P1-006 |
| UC-P1-002 | R-P1-006, R-P1-007 |
| UC-P1-003 | R-P1-007, R-P1-008, R-P1-008A, R-P1-008B, R-P1-008C, R-P1-008D, R-P1-008E, R-P1-009 |
| UC-P1-004 | R-P1-010, R-P1-010A, R-P1-010B, R-P1-010C, R-P1-011 |
| UC-P1-005 | R-P1-012 |
| UC-P1-006 | R-P1-001, R-P1-002, R-P1-003, R-P1-004, R-P1-005 |
| UC-P1-007 | R-P1-013 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-P1-001 | Mobile-safe Docker node can be created. |
| AC-P1-002 | Privileged flags and shared mounts are absent by default. |
| AC-P1-003 | Docker node ports are localhost-only or disabled by default. |
| AC-P1-004 | Existing remote-node open-window flow remains the entry point. |
| AC-P1-005 | Phone Access management is available in the Docker node window with explicit claim state. |
| AC-P1-006 | Remote management uses explicit owner proof, not broad local trust. |
| AC-P1-006A | Node-admin claim validation is hash-based, route-limited, and redacted. |
| AC-P1-007 | QR targets the verified Android-facing Docker node URL. |
| AC-P1-007A | Invalid or mismatched advertised URLs are rejected before QR creation. |
| AC-P1-008 | Android pairs with Docker node. |
| AC-P1-009 | Mobile work runs in Docker node. |
| AC-P1-010 | Mobile terminal and current Tools terminal/VNC page are removed from UI/tests. |
| AC-P1-011 | Docs communicate phase split and future hardening. |

## Approval Status

Approved by the user for architecture review on 2026-05-23 after narrowing the ticket to Phase One and documenting Phase Two future hardening separately.
