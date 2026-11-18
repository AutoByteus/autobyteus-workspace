# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `node-universal-authentication-437`
- Request / ticket: Project Task `autobyteus-437`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Requirements owner: Solution Designer
- Date: 2026-11-08
- Approved by and reference: `User` — 2026-11-08, in the Solution Designer's conversation, the user delegated the five open decisions to the Solution Designer's recommendations: "based on your [understanding] … you can provide reasonable solution for the decisions for me". DEC-002, DEC-003, DEC-004, DEC-007, DEC-009 = the recommended options (A, A, A, require the token, the two-slice plan with autobyteus-436 after slice 1); the user was told he can change any of them.
- Exact approved requirements baseline: SR-002 of this document
- Behavior-defining supplements: `autobyteus-server-ts/docs/design/node_access_model.md` (the project's node access contract, NA-1…NA-15, NAS-01…NAS-38), written at the user's request on 2026-11-08; it restates this document's approved behavior and DEC-011…014; approved by the user with the design on 2026-11-08 ("Yes approved", SR-004)

## Problem And Desired Outcome

- Problem: a node accepts every request that reaches its port without any key (BEH-001), and nodes listen on every network the computer joins (BEH-002). Anyone on the same Wi-Fi can read files, start agents and change settings; a peer is recognized by a public node ID (BEH-004).
- Desired outcome (the user's direction): **no key, no access**, on every endpoint, for every client: this computer, the desktop's connection to remote and Docker nodes, phones and peer nodes. Each client gets its key automatically (the desktop's own node) or by pairing once.
- Observable definition of success: a request without a valid key to any non-exempt endpoint, from any address including this computer, is refused (401) before any handler runs; every supported client keeps working after its one-time step.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001…006 | No key needed (only phone keys are checked when sent) | Every non-exempt HTTP request and WebSocket upgrade needs a valid key | Host and Origin rules (403, 416), phone WebSocket route list | Route policy; PROBE-01 |
| BEH-002 | Operational | SCN-007 | Listens on all addresses | Per DEC-002 | — | `app.ts`; launcher; lsof |
| BEH-003 | User | SCN-001, SCN-002 | Desktop reaches its own and remote nodes with no key | Own node: key automatically; remote/Docker: pair once (DEC-003) | Everything the desktop does | `types/node.ts` |
| BEH-004 | System | SCN-004 | Peer = claimed node ID | Peers pair once; every request proves the key (DEC-004) | Collaboration features | Peer gateway |
| BEH-005 | User | SCN-003 | Phone key optional | Phone key required | Paired phones keep working with no step | `authorizedTransport.ts` |
| BEH-006 | User | SCN-001 | Iframes load node URLs with no key | Still work, with the desktop's key | HTML preview, applications | `HtmlPreviewer.vue`, `ApplicationIframeHost.vue` |
| BEH-007 | System | SCN-005 | MCP gateway: token for non-local only; memory sync: own keys | Both through the one gate; MCP gateway token also for local clients (DEC-007) | Memory sync sources keep their keys | `mcp-gateway-access.ts` |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| The user (owner) | Safe nodes on any network | No key, no access; one-time steps only | Decides visible behavior |
| Desktop app | Use its own and remote nodes | Works after start / one pairing | Key never exposed to page code or agents |
| Phone | Use paired nodes | Works with no new step | — |
| Peer nodes | Collaborate | Work after one pairing | — |
| Other devices on a network | — | Get nothing but the exempt endpoints | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | One gate: every endpoint needs a key, deny by default | SCN-006 |
| UC-002 | The desktop app's own node: key at start, attached to every request of the app window | SCN-001 |
| UC-003 | The desktop pairs once with a remote or Docker node (setup code) | SCN-002 |
| UC-004 | Phones: the existing key becomes required | SCN-003 |
| UC-005 | Peer nodes pair once and authenticate every request | SCN-004 |
| UC-006 | MCP gateway clients and memory sync sources use their keys through the same gate | SCN-005 |
| UC-007 | Which networks a node accepts other devices from | SCN-007 |
| UC-008 | Upgrade: existing setups get their one-time step and are told which | SCN-008 |

### Out Of Scope

- What each key may do (phone limits: settings, API keys, terminal, `createWorkspace`, folder reads per autobyteus-436; key expiry; scoped keys for installed applications): slice 2 / later Tasks (DEC-009).
- User accounts, passwords, SSO; TLS certificates on the node itself (https comes from Tailscale Serve or a proxy).
- The internal loopback listeners (agent tools MCP, credential proxy), which keep their own passes.
- The message gateway's call to a route the node no longer serves (FU-001).

### Non-Goals

- Protection against software already running as the user on the same computer.

### Preserved Behavior Boundary

- All features of the desktop app, phone, Docker and remote nodes, remote collaboration, agents, applications (BEH-003…007 "Preserved"); Host/Origin rules and `sendUserFile` (403, 416); paired phones and their revocation; memory sync source keys.

### Prerequisites

None found. Every piece this needs is owned by this change (gate, pairing, launcher, clients).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every HTTP request and WebSocket upgrade to a node's main port needs a valid key, whatever its address (this computer included). Exempt: `/rest/health`, `/rest/remote-access/status`, the `/mobile` shell's page and assets, the pairing exchanges (phone, node setup, peer invite), CORS preflight. A refusal is 401 (HTTP) or a close code (WebSocket), before any handler runs, with one log line without secrets. | BEH-001 | Must | The user's direction | Single existing gate (`remote-access-policy-plugin.ts`) | DEC-001 |
| REQ-002 | Deny by default: an endpoint added later needs a key without anyone listing it. | BEH-001 | Must | "every endpoint" | — | DEC-001 |
| REQ-003 | The desktop app creates a fresh random key each time it starts its own node, hands it to the node privately (never in a URL or log), and attaches it to every request the app window sends to that node, including iframes, images and WebSockets. The in-app browser and the agents' browser tool do not get it. | BEH-003, BEH-006 | Must | "Electron gets it when the system starts" | Electron already rewrites headers per session (UNK-001 to confirm WebSockets) | DEC-006 |
| REQ-004 | The desktop pairs once with a remote or Docker node using a one-time setup code obtained on that node's own computer (DEC-003); afterwards it attaches that node's key as in REQ-003. Keys are stored by the desktop app, not readable by pages. | BEH-003 | Must | One-time step | Reuses the phone pairing building block | DEC-003 |
| REQ-005 | A phone's existing key is required on every request it makes; paired phones keep working with no new step. | BEH-005 | Must | — | UNK-004 | — |
| REQ-006 | Peer nodes pair once (DEC-004); every peer request proves the key, and the key itself does not travel with the request. A node ID alone is refused. | BEH-004 | Must | "peer nodes get it also" | HMAC signing pattern exists (message gateway) | DEC-004 |
| REQ-007 | MCP gateway clients and memory sync sources use their own keys through the same gate; MCP gateway clients on this computer need the token too (DEC-007). | BEH-007 | Must | One gate, no loopback trust | — | DEC-007 |
| REQ-008 | Network admission per DEC-002. | BEH-002 | Must | — | UNK-003 | DEC-002 |
| REQ-009 | Owner actions (settings, pairing, devices, peers, node update) need the owner's key (the desktop's), never a phone key. | BEH-001 | Must | Today they need nothing from a non-phone | — | — |
| REQ-010 | Upgrade: the desktop's own node and paired phones need no step; each Docker/remote node and peer shows "Needs connecting" with the one-time step; no data is lost; nothing works without the step. | — | Must | Clear upgrade | — | DEC-010 |
| REQ-011 | Every key is revocable from the desktop: phones (as today), remote-node keys (removing the node), peers (removing the peer). | — | Should | — | — | — |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-006 | Isolated node; requests with no key and with a wrong key, from loopback and a non-loopback address, to GraphQL, a workspace file, `/ws/terminal`, `/graphql` WS, `/rest/remote/*`, an owner route, `/mcp/gateway` | 401 / close, handler not run, one log line, no secret | Exempt routes answer as today | Server e2e (PROBE-01 cases become refusals) |
| AC-002 | REQ-002 | SCN-006 | A route registered in a test with no listing | Needs a key | — | Architecture/unit test |
| AC-003 | REQ-003 | SCN-001 | Packaged desktop app with its own node | All screens work (runs, files, HTML preview, applications, terminal, node desktop) with no step; the key appears in no URL, log or page script | In-app browser opening the node's URL gets 401 | Electron probe |
| AC-004 | REQ-004, REQ-010 | SCN-002, SCN-008 | Test-owned Docker node | Before pairing: "Needs connecting"; after entering the setup code: everything works; node update works | Wrong/expired code refused | Electron + Docker probe |
| AC-005 | REQ-005 | SCN-003 | Phone shell probe (LAN and Tailscale-shaped) | All MSP cases pass with enforcement on | — | `test:e2e:mobile-shell` |
| AC-006 | REQ-006 | SCN-004 | Two isolated nodes | After pairing, delegation, messages, run observation work both ways; a request with the right node ID but no proof is refused; a captured request replayed later is refused | — | Server e2e (two nodes) |
| AC-007 | REQ-007 | SCN-005 | MCP client on loopback, memory sync source | Work with their tokens; without, refused | — | Server e2e |
| AC-008 | REQ-008 | SCN-007 | Per DEC-002 | Per DEC-002 | — | e2e + manual network check |
| AC-009 | REQ-009 | SCN-006 | Phone key on owner routes | Refused | — | e2e |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Owner | Use the desktop app | Start the app | Nothing new | Works | Supported Normal | REQ-003 |
| SCN-002 | User | Owner | Use a Docker/remote node | Install or upgrade a node | Get its setup code on its computer, enter it once in Nodes | Works | Supported Normal | REQ-004 |
| SCN-003 | User | Owner | Use the phone | Open the phone app | Nothing new | Works | Supported Normal | REQ-005 |
| SCN-004 | System | Two nodes | Collaborate | Pair the peers once | Invite code from one, entered on the other | Works both ways | Supported Normal | REQ-006 |
| SCN-005 | System | MCP client, memory source | Call the node | Configured token | — | Works | Supported Normal | REQ-007 |
| SCN-006 | Contract | Anyone without a key | Call any endpoint | Direct request | — | Refused | Supported Explicit Edge (security contract) | REQ-001, REQ-002, REQ-009 |
| SCN-007 | Operational | Device on a local network | Reach the node | Direct connection | — | Per DEC-002 | Supported Explicit Edge | REQ-008 |
| SCN-008 | Operational | Owner | Upgrade | New version | One step per remote node and peer | Works | Supported Normal | REQ-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, small: Nodes page "Needs connecting" state and setup-code entry; peer invite code (show / enter); the local-network switch and its warning (DEC-002); the setup code shown by the Docker launcher. Product Design not requested.

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001…007 | Security | Keys: ≥ 32 random bytes; only hashes stored on the node; compared in constant time; never in URLs (except the browser WebSocket query where unavoidable), logs or errors | Unit + log scan |
| QR-002 | REQ-001 | Performance | The gate adds no file or network I/O per request beyond an in-memory lookup | Unit |
| QR-003 | REQ-001 | Compatibility | No internal caller of the main port breaks (inventory in investigation notes) | e2e suites |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`, additive: owner/desktop-node keys, peer keys, a setting for DEC-002. Existing phone credentials, devices, peers, nodes and runs are preserved. Peers and remote nodes keep their records and only gain a key after the one-time step.

## Decisions

| ID | Question | Why it matters | Options / Evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What is exempt, and does this computer need a key? | Tailscale Serve arrives as this computer | Exempt only what a client needs before it has a key | Health, status (no secret), the phone page, the pairing exchanges, preflight. This computer needs a key too, as in Jupyter and VS Code Server. | Solution Designer (user's direction) | Decided |
| DEC-002 | Which devices may connect at all? | Keys travel in plain http on local networks; strangers can probe | (A) keys only, listen everywhere; (B) keys + by default accept other devices only from this computer and Tailscale; a switch "Allow devices on my local network", off by default, with a warning that the phone's key travels unencrypted; Docker launcher publishes on this computer only by default | The key is the lock either way. B also keeps keys off café Wi-Fi in plain text and hides the node from strangers. Cost: the phone's "Local network" way needs the switch, turned on with a warning when chosen. **Recommend B.** | User | Decided: recommendation, by the user's delegation (2026-11-08) |
| DEC-003 | How does the desktop get a key for a Docker or remote node? | One-time step for every existing node | (A) a setup code read on the node's computer (Docker launcher prints it and `autobyteus-docker setup-code <node>`; a server install prints it in its log), entered once in Nodes; (B) the first desktop that connects becomes owner | B lets whoever connects first on a network take the node. A is how Jupyter and VS Code Server work. **Recommend A.** | User | Decided: recommendation, by the user's delegation (2026-11-08) |
| DEC-004 | How do peers pair? | Replaces "add on both sides" | (A) one invite code from node A, entered on node B: both registered and keys exchanged in one step; every request signed (the key never travels); existing peers re-pair once; (B) a bearer key per peer | A is one step instead of two, and a sniffed request does not reveal the key. **Recommend A.** | User | Decided: recommendation, by the user's delegation (2026-11-08) |
| DEC-006 | How does the desktop window attach keys? | Iframes and images cannot add headers | The desktop app attaches the key to requests leaving the app window for nodes it knows; pages and agents never see it; the in-app browser gets none | The only way that covers iframes; Electron already does this for the in-app browser. | Solution Designer | Decided |
| DEC-007 | MCP gateway clients on this computer | Today they need no token; would break their config | Require the token for all, or keep loopback trust | Loopback trust lets anything through Tailscale Serve. The token is shown in the MCP gateway panel to copy once. **Recommend: require it.** | User | Decided: recommendation, by the user's delegation (2026-11-08) |
| DEC-008 | Installed applications in the app window | They get the owner's access | Same as today; scoped application keys later (slice 2) | No new reach; the cleanup belongs with key limits. | Solution Designer | Decided |
| DEC-009 | Slice plan | Size and release | Slice 1 "no key, no access": gate, desktop own node, remote/Docker pairing, phone required, peers, MCP/memory keys, network default, launcher, upgrade. Slice 2 "what each key may do": phone limits incl. autobyteus-436 folders, no arbitrary `createWorkspace`, expiry, scoped application keys | Peers must be in slice 1, or turning the gate on breaks collaboration. Slice 1 ships as one release, with a "What you need to do" note. **Recommend this plan; autobyteus-436 after slice 1.** | User | Decided: recommendation, by the user's delegation (2026-11-08) |
| DEC-010 | Upgrade experience | What the user sees | Own node and phones: nothing; each Docker/remote node and peer: "Needs connecting" with the step | Nothing silently stops working. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-006 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-006 |
| REQ-003 | UC-002 | BEH-003, BEH-006 | AC-003 | SCN-001 |
| REQ-004 | UC-003 | BEH-003 | AC-004 | SCN-002 |
| REQ-005 | UC-004 | BEH-005 | AC-005 | SCN-003 |
| REQ-006 | UC-005 | BEH-004 | AC-006 | SCN-004 |
| REQ-007 | UC-006 | BEH-007 | AC-007 | SCN-005 |
| REQ-008 | UC-007 | BEH-002 | AC-008 | SCN-007 |
| REQ-009 | UC-001 | BEH-001 | AC-009 | SCN-006 |
| REQ-010 | UC-008 | — | AC-004 | SCN-008 |
| REQ-011 | UC-003, UC-005 | — | AC-004, AC-006 | SCN-002, SCN-004 |

## Architecture Phase Input

- Verify UNK-001…005 (investigation notes).
- Constraints: one gate owner; key never in page code, URLs or logs; preserve 403/416 rules.
- Size: Large; architectural risk High (security boundary, every client, persisted keys, launcher).

## Readiness Check

- Content ready for approval: `Yes`
- Approval recorded: `Yes` (user, 2026-11-08, delegation of the five decisions)
- Approved requirements package ready for architecture design: `Yes`

## Design-Phase Refinements (SR-003, within the approved decisions; shown to the user with the design)

| ID | Refines | Decision | Reasoning | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-011 | DEC-002 | The local-network switch is the existing per-network "Allow" of Phone Setup (allowed local networks): a node accepts devices on the local network it is on only when the owner allowed that network | Home allowed, café not, with no new switch; phones paired over a home LAN already allowed it | Solution Designer | Decided |
| DEC-012 | DEC-002 | VPN and company-proxy networks are accepted only when listed in a new node setting `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (CIDR list), like `AUTOBYTEUS_ALLOWED_HOSTS` | The default is "this computer and Tailscale"; such setups already configure the node | Solution Designer | Decided |
| DEC-013 | DEC-002 | The Docker launcher publishes a node on this computer and, when present, the computer's Tailscale address; `--allow-local-network` publishes on all addresses | Inside a container the address cannot be checked (PROBE-02); phones over Tailscale keep working | Solution Designer | Decided |
| DEC-014 | DEC-004 | When the desktop owns both nodes, it creates the invite on one and submits it on the other itself (one click); a typed code only between different desktops | Same mechanism, no typing for the user's own nodes | Solution Designer | Decided |
| DEC-015 | DEC-003 | A setup code is created on demand on the node's own computer through the node's local control socket (Docker launcher `setup-code`, node-access CLI) or by an owner desktop; it is never written to a file or a log (replaces "a server install prints it in its log") | Resolves ARCH-REV-001 AR-002 and AR-010c: recovery after a lost desktop store or the only owner's Disconnect, and no secret in logs | Solution Designer | Decided (SR-005) |
