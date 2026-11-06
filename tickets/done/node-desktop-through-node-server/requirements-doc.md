# Requirements Document — S1: See a Docker node's desktop through its own server (desktop app)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `node-desktop-through-node-server`
- Request / ticket: Project Task `autobyteus-405` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), slice S1 of autobyteus-394; depends on S0 (autobyteus-402, delivered: merge `dc8bee36b6`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `User`, 2026-11-06, in the Solution Designer conversation of autobyteus-394 ("Yeah, I agree with your recommendation"; "Let's only publish the port that we need"; scope = Docker nodes; stream only while the view is open). The requirements below are the parent's REQ-001…008, 010, 011, 017, 020 and their ACs, with the parent's IDs kept, at the parent's SR-004. One detail decided by the Solution Designer within that direction: DEC-S1-1.
- Exact approved requirements baseline: this document at SR-001.
- Parent package (read-only reference): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/`.

## Problem And Desired Outcome

- Problem: the desktop app's VNC Viewer dials the node setting `AUTOBYTEUS_VNC_SERVER_HOSTS` (`localhost:<published 6080 port>`), so it shows a Docker node's desktop only when the app runs on the Docker host. Nodes on another machine or a cloud VM show nothing. Every viewer resizes the agent's shared desktop when it connects. View only is a client flag. After S0, 6080 is still published (host loopback) only for this viewer.
- Desired outcome: the VNC Viewer of any Docker node's window shows that node's desktop through the node's own server address, View only by default and enforced by the node, Control by a deliberate switch, never resizing the agent's desktop; nodes publish only their server port.
- Observable success: AC-001 … AC-011, AC-013, AC-014, AC-020, AC-022.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Client dials the host list | Client reaches the node desktop only through the node's server base URL | VNC Viewer tab; noVNC rendering; Connect/Disconnect/Maximize | parent BEH-001 |
| BEH-002 | User | SCN-002, SCN-003 | Remote-machine / cloud node: nothing | Same experience as a local Docker node | — | parent BEH-002 |
| BEH-005 | System | SCN-006 | Resize on every connect and in fullscreen-fit | Never; viewers scale to fit | Agent desktop keeps its resolution | parent BEH-005 (reproduced) |
| BEH-006 | System | SCN-007 | View only = client flag | Enforced by the node per viewer | View only default | parent BEH-006 |
| BEH-007 | Operational | SCN-008 | After S0: backend + `127.0.0.1:<N>:6080` published; `AUTOBYTEUS_VNC_SERVER_HOSTS` set | Backend port only; env not set | Backend port and data on recreate | S0 delivery facts |
| BEH-008 | Contract | SCN-007 | Shared `/ws/*` policy | Desktop stream uses the same policy | Policy for every other route | parent BEH-008 |
| BEH-009 | User | — | Remote run in another node's window: note | Unchanged | Yes | parent BEH-009 |
| BEH-011 | System | SCN-001 | Embedded node: "No VNC hosts configured" | "This node has no shared desktop" | No desktop for the embedded node | parent BEH-011 |
| BEH-012 | User | — | "AutoByteus VNC Hosts" settings card | Retired | — | parent DEC-006 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User, desktop app | Watch or help the agent on any Docker node | Desktop through the node's address | No ports or hosts to configure |
| Agents | Stable GUI | Size never changed by viewers | — |
| Node owner | Private desktop | Only the node's existing principals; only the server port published | Running nodes change only on his own launcher command |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | View a Docker node's live desktop from the desktop app through the node's server (local, other machine, cloud) | SCN-001, SCN-002, SCN-003 |
| UC-003 | Switch a viewer deliberately between View only and Control, enforced by the node | SCN-007 |
| UC-004 | Keep the agent desktop's size stable while viewers watch | SCN-006 |
| UC-005 (S1 part) | Docker nodes publish only the server port | SCN-008 |
| UC-006 (S1 part) | End streams cleanly on leaving the view, hiding the window, node/desktop restart and slow viewers | SCN-009 |

### Out Of Scope

- Phone and `/mobile` desktop view, stream count limits, live cut-off of revoked phones (S3: REQ-009, REQ-014–016, REQ-019).
- Base image and server image changes (S2: REQ-013).
- `Origin` checks (autobyteus-403) and phone deny rules (autobyteus-404) — this ticket's route uses the shared WebSocket policy, so it receives what those Tasks add to it.
- Remote-run panel note (BEH-009), embedded node desktop, Terminal, Browser tab.
- The user's running nodes.

### Non-Goals

- WebRTC, re-encoding, recordings or screenshots of real desktops, several desktops per node, renaming the "VNC Viewer" tab (Product, S3).

### Preserved Behavior Boundary

- BEH-009; Remote Access policy semantics for every existing route; noVNC version; node-update contracts C1–C4; backend port publishing and recreate keeping data and backend port.

### Prerequisites

None.

### Review Authority

- Every blocking finding cites a REQ, AC or preserved-behavior ID here. New behavior or policy is a `Requirement Gap` for the user. Adjacent concerns are follow-ups.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A client reaches a node's desktop only through that node's AutoByteus server address; it never needs or receives a VNC host, port or password | BEH-001, 002 | Must | Works for any node the client reaches | Measured: WS→TCP forwarding carries RFB unchanged (parent probe) | parent REQ-001 |
| REQ-002 | The node decides whether it offers a desktop; a client cannot name a host, port or URL. A node without a desktop says so | BEH-011 | Must | No SSRF surface | N/A | parent REQ-002 |
| REQ-003 | The node checks access before opening anything towards its desktop, with the same rules as its other WebSocket routes; anything else is refused with no upstream connection | BEH-008 | Must | Same boundary | N/A | parent REQ-003, DEC-002 |
| REQ-004 | The VNC Viewer of a node window shows that node's desktop through REQ-001 for local, other-machine and cloud Docker nodes | BEH-001, 002 | Must | Core | Measured forwarding | parent REQ-004 |
| REQ-005 | Every viewer starts in View only; a deliberate action switches it to Control and back | BEH-006 | Must | No accidental input | N/A | parent REQ-005 |
| REQ-006 | In View only the node delivers no keyboard, pointer or clipboard input from that viewer to the desktop, whatever the client sends; in Control it does; per viewer | BEH-006 | Must | Client flag is not a boundary | Measured: Xvnc input flags are global only | parent REQ-006 |
| REQ-007 | No viewer in any mode can change the agent desktop's size; viewers scale to fit | BEH-005 | Must | Agents and other viewers | Reproduced resize; measured refusal | parent REQ-007 |
| REQ-008 | A stream exists only while a desktop view is open and visible: it starts when the user opens the VNC Viewer tab, never in the background and never from the node on its own. Leaving the view, switching tab or node, collapsing the panel, minimizing or hiding the window, closing the window or losing the connection closes the stream and the node closes its side; becoming visible again reconnects with a fresh access check; a desktop or server restart ends open streams and the viewer shows it and can reconnect | — | Must | No orphaned sessions | N/A | parent REQ-008 |
| REQ-010 | A slow viewer cannot make the node buffer more than 8 MiB for that stream; the node slows that stream instead | — | Must | Memory bound | N/A | parent REQ-010 |
| REQ-011 | Logs and diagnostics about desktop streams carry metadata only (mode, viewer kind/device id, connect/disconnect, reason, duration, byte counts); never pixels, keystrokes, clipboard text, credentials or credential-bearing URLs | — | Must | Screen may show secrets | N/A | parent REQ-011 |
| REQ-017 | In View only, the agent's clipboard is not copied to the viewer's device | — | Should | Clipboard may carry secrets | Read: noVNC ignores server clipboard in View only | parent REQ-017 |
| REQ-020 | Docker nodes created or recreated by the launchers and the compose file publish only the backend port; the launcher no longer sets the VNC host setting | BEH-007 | Must | Only needed ports | N/A | parent REQ-020 |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 004 | SCN-001 | Desktop app, local Docker test node window, VNC Viewer | Live desktop renders; the client's desktop traffic goes only to the node's server base URL | — | Isolated desktop instance + traffic check |
| AC-002 | REQ-001, 004 | SCN-002, 003 | Test node reachable only by its backend URL | Same desktop renders | Unreachable node → clear state | Node on another address (another machine, or a container reachable only by its backend URL) |
| AC-003 | REQ-002 | SCN-001 | Client supplies any host/port/URL or an unknown path variant | Refused; no upstream connection | — | Server API test |
| AC-004 | REQ-002 | SCN-001 | Embedded node | "This node has no shared desktop" | — | UI test |
| AC-005 | REQ-003 | SCN-007 | Invalid or revoked phone credential, or Phone Access disabled | Refused before any upstream connection; reason code | — | Server E2E with upstream spy |
| AC-006 | REQ-005, 006 | SCN-007 | View only viewer sends key, pointer, clipboard (raw client) | None reaches the desktop | — | Against a real Xvnc in an isolated node |
| AC-007 | REQ-005, 006 | SCN-007 | Switch to Control, type/click; switch back | Input arrives only in Control | — | Server + UI test |
| AC-008 | REQ-007 | SCN-006 | Any viewer connects, maximizes or sends SetDesktopSize | Desktop stays at its size | — | Probe-based test against the route |
| AC-009 | REQ-007 | SCN-006 | Several viewers at once (desktop app + raw/browser client) | Same desktop; size unchanged | — | Multi-client test |
| AC-010 | REQ-008 | SCN-009 | No view open (other tab, panel collapsed, window minimized/hidden), or leaving/closing | No stream while no visible view; upstream closed ≤ 2 s after leaving; reopening reconnects | — | Server socket count + UI test |
| AC-011 | REQ-008 | SCN-009 | Xvnc restarts, or the server restarts | Viewer shows disconnected and can reconnect; no orphaned streams | — | Isolated node restart test |
| AC-013 | REQ-010 | SCN-009 | A viewer that stops reading | ≤ 8 MiB buffered for that stream; others unaffected | — | Server integration test |
| AC-014 | REQ-011 | — | All tests | No pixels, keystrokes, clipboard text, credentials or `access_token` values in logs | — | Log scan |
| AC-020 | REQ-017 | SCN-007 | Agent copies text while a View only viewer watches | Viewer's clipboard unchanged | — | UI test |
| AC-022 | REQ-020 | SCN-008 | Launcher (bash, PowerShell) / compose after S1 | `docker ps` shows only the backend port; no `AUTOBYTEUS_VNC_SERVER_HOSTS` in the container env; VNC Viewer works through the server | — | Launcher tests + isolated container |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Watch a local Docker node | Node window → VNC Viewer | Node registered | Open tab → View only stream | Live desktop | No desktop → empty state | Supported Normal | parent | REQ-001, 002, 004; AC-001, 003, 004 |
| SCN-002 | User | User | Watch a node on another machine | Same | Backend URL reachable | Same | Same | Unreachable | Supported Normal (new) | parent | AC-002 |
| SCN-003 | User | User | Watch a node on a cloud VM | Same | Tailscale Serve HTTPS to backend | Same over wss | Same | — | Supported Normal (new) | parent | AC-002 |
| SCN-006 | System | Agents + viewers | Stable desktop | Viewer connects/maximizes | — | — | Size unchanged | Resize refused | Supported Normal | reproduced | REQ-007; AC-008, 009 |
| SCN-007 | User / Contract | User; policy | Watch safely, control deliberately | Switch; any client | Stream open | View only → Control → View only | Input only in Control | Refused before upstream | Supported Normal | parent | REQ-003, 005, 006, 017; AC-005–007, 020 |
| SCN-008 | Operational | User | Only the server port published | `new-container`, `upgrade --all`, `workspace apply`, compose | — | — | Backend only | Existing nodes change only on his command | Supported Normal | S0 facts | REQ-020; AC-022 |
| SCN-009 | System | Node, viewer lifecycle | No orphaned streams | Leave/hide/close, restart, slow viewer | Stream open | — | Stream ends, viewer informed | Reconnect | Supported Normal | parent | REQ-008, 010, 011; AC-010, 011, 013, 014 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. Product design: N/A — not applicable (the existing tile is kept).
- Normative details: VNC Viewer tile keeps status, Connect/Disconnect, Maximize and the mode switch. The switch reads **View only** / **Control** (was "View Only" / "Interactive"); switching reconnects in the chosen mode. Maximize scales the picture and never resizes the desktop.
- States: loading; no shared desktop on this node; connecting; connected (mode shown); disconnected with reason; not allowed; desktop not reachable (with Reconnect).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-003, 006; AC-005, 006 | Security | Zero upstream connections for refused requests; zero input bytes forwarded in View only | Upstream spy / filter tests |
| QR-002 | REQ-010; AC-013 | Reliability | ≤ 8 MiB buffered per stream | Server test |
| QR-003 | REQ-011; AC-014 | Privacy | No desktop content or credentials in logs | Log scan |
| QR-004 | REQ-008; AC-010 | Reliability | Upstream closed ≤ 2 s after the viewer closes | Server test |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (small). Saved `AUTOBYTEUS_VNC_SERVER_HOSTS` / password keys in a node's `.env` lose their reader (acceptable; shown as deletable custom settings if saved). Launcher state `NOVNC_PORT` / `noVncPort` dropped at the next write. Node volumes and backend port preserved on recreate.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence |
| --- | --- | --- |
| TigerVNC Xvnc 1.13.1 (current base image) | RFB 3.8, security None, on `127.0.0.1:5900` inside the node | parent probes |
| noVNC 1.7.0-g7c36fab | URL WebSocket, `viewOnly`, `scaleViewport`, `resizeSession` | parent AF-06 |
| `@fastify/websocket` 11 / `ws` 8 | preClose closes clients; `pause`/`resume`, `bufferedAmount` | parent AF-04/05 |

## Supplemental Artifacts

| Path | Purpose | Status |
| --- | --- | --- |
| Parent `probes/rfb-forwarding-probe.mjs` (+ results) | Forwarding and resize reproduction | Evidence; starting point for AC-008 |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | One node desktop per Docker node | Confirmed (parent) |

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-S1-1 | Paired phones on the new stream before S3 | The approved principals include paired phones (parent DEC-002) and the live revocation cut-off was moved to S3 by the user's split; there is no phone UI in S1. A phone-only branch now would be removed again in S3. **The route uses the shared WebSocket policy unchanged.** If autobyteus-404 (deny phones on routes the mobile product does not offer) lands before S3, `/ws/node-desktop` belongs on its list until S3 opens it | Solution Designer (within the direction) | Decided |
| (parent) DEC-001, 002, 003, 004, 006, 007, 010, 011, 012 | As decided in autobyteus-394 | — | User / Solution Designer | Decided |

## Traceability

| Requirement ID | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, 002 | AC-001, 002 | SCN-001–003 |
| REQ-002 | UC-001 | BEH-011 | AC-003, 004 | SCN-001 |
| REQ-003 | UC-001, 003 | BEH-008 | AC-005 | SCN-007 |
| REQ-004 | UC-001 | BEH-001, 002 | AC-001, 002 | SCN-001–003 |
| REQ-005 | UC-003 | BEH-006 | AC-006, 007 | SCN-007 |
| REQ-006 | UC-003 | BEH-006 | AC-006, 007 | SCN-007 |
| REQ-007 | UC-004 | BEH-005 | AC-008, 009 | SCN-006 |
| REQ-008 | UC-006 | — | AC-010, 011 | SCN-009 |
| REQ-010 | UC-006 | — | AC-013 | SCN-009 |
| REQ-011 | UC-006 | — | AC-014 | SCN-009 |
| REQ-017 | UC-003 | — | AC-020 | SCN-007 |
| REQ-020 | UC-005 | BEH-007 | AC-022 | SCN-008 |

## Readiness Check

- Content ready: `Yes`. Approval recorded: `Yes` (user, parent SR-004; DEC-S1-1 within the direction). Ready for design: `Yes`.
