# Design Review Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/requirements-doc.md` (SR-002 approved; DEC-011…015 refinements within the approved decisions)
- Upstream Investigation Notes: `…/tickets/in-progress/node-universal-authentication-437/investigation-notes.md`
- Upstream Solution Revision Record: `…/tickets/in-progress/node-universal-authentication-437/solution-revision-record.md`
- Reviewed Design Spec: `…/tickets/in-progress/node-universal-authentication-437/design-spec.md` (SR-006; "Round 2 Mechanisms" M-1…M-10 with round-3 changes to M-3/M-4)
- Supplemental Task Artifacts Reviewed: `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, NAS-01…NAS-38); `handoff-architecture-review-round3.md`; PROBE-02/PROBE-03 logs; `follow-ups.md`
- Relevant Solution Revision IDs: SR-001…SR-006
- Architecture Review Revision Record: `…/tickets/in-progress/node-universal-authentication-437/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer round-3 handoff answering ARCH-REV-002 (AR-003 residual, AR-004 residual, AR-011)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Fail)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/node-universal-authentication-437` @ `b690a5dfdb` (no source changes). Round 3 re-checked only the affected sections; the evidence for the other verdicts carries over from rounds 1–2 (revision record).

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Independent review required: `Yes`. Classification confirmed in all three rounds.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements understood: REQ-001…011 and DEC-001…015. Design and contract were approved by the user (SR-004). No approved behavior changed in SR-005 or SR-006.
- Scope guardrail: confirmed and unchanged. Out of scope: slice 2 credential limits, accounts/TLS, the internal loopback listeners, FU-001 and FU-002.
- Every blocking finding raised in any round traced to an approved ID: `Yes`.
- Statements about existing code: checked in rounds 1–2 (revision record). Round 3 adds Mercurius `subscription.context` / `onDisconnect` for `/graphql` (`api/graphql/index.ts:12`, today `subscription: true`) and the run-observation route (`api/rest/remote.ts:43`) as registration points; both exist where cited.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass (M-3 fails closed; M-4 covers every socket) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass | Pass (M-6, M-8) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (M-1, M-2, M-8b) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (M-7, M-9; narratives now match) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass (PROBE-03) | Pass | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass (M-5) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear? | Linked? | Internally Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `node_access_model.md` | Pass | Pass | Pass | Pass | Pass | — (NA-10: setup codes are memory-only hashes. §2: the refusal form for gated `/ws/*` routes and for all other upgrades. NA-11/NAS-37 match M-4) |
| Round 2/3 handoffs, PROBE-02/03, `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present; root cause (Missing Invariant plus Boundary/Ownership) explicit; "refactor now" decided and carried into the design sections | Pass | Health assessment; removal plan; M-3/M-4 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner Clear? | Naming Clear? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Gate | Pass | Pass | Pass | Pass | Pass: the hook decides, HTTP refusal by default, close code only on gated routes | Pass | Pass |
| DS-002 | Desktop own node | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Connect a node | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Peer pairing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Peer request | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Launcher | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Admission refresh | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Revocation → open sockets (M-4) | Bounded | Pass | Pass: wrapper, GraphQL subscription and run-observation sockets all register | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `NodeAccessGate` (+ wrapper, GraphQL subscription context, run-observation route as delivery/registration only) | Pass | Pass | Pass | Pass | An unwrapped route never upgrades on refusal; an architecture test enforces the wrapping |
| `NodeCredentialResolver` | Pass | Pass | Pass | Pass | Composition-root wiring |
| `PeerPairingService`, `SetupCodeService` + local control socket, `McpGatewayTokenService`, Electron `NodeConnectService` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `api/security` → `node-access/services` → capability verifiers; `node-access/domain` leaf; revocations published to the gate | Pass | Pass | Pass | Pass | — |
| Renderer → preload → Electron main | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Setup exchange / setup codes / owner credentials / local control socket | Pass | Pass | Pass | Low | Pass |
| `createPeerInvite` → `{ invite, expiresAt }`; `acceptPeerInvite(invite, name)`; peer pairing exchange | Pass | Pass | Pass | Low | Pass |
| Peer signature headers (`-From`, `-To`, timestamp, nonce, body hash) | Pass | Pass | Pass | Low | Pass |
| MCP gateway token owner routes; preload `nodeAccess.*`; refusal shape | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

Pass. The design reuses `NodeNetworkService` (extended with `cidr`), `PeerAddressResolver` on both sides, the Electron header-rewrite pattern, and the `AUTOBYTEUS_ALLOWED_*` settings family. The open-socket registry replaces node-desktop's own re-check. The IPC handover was rejected with evidence (no IPC channel on macOS or Linux).

## Subsystem / Capability-Area Allocation Verdict

Pass. Allocation: `api/security` (gate, permissions, registry); `node-access` (new: credentials, setup codes, admission, resolver, intake, local socket, CLI); `remote-access` (phone); `remote-collaboration` (pairing, signing); `memory-sync/hub`; `mcp-gateway` (token service); Electron main; launcher.

## Reusable Owned Structures Verdict

Pass. One sign/verify file, one refusal owner, and the secret primitives in the `node-access/domain` leaf.

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ClientIdentity`, owner-credential row, `peers.json` + `peerSecret`, peer invite, `mcp-gateway/token.json`, Electron store | Pass | Pass | Pass | N/A | Pass | `paired` derived, never stored |

Derived consumers listed with a decision for each: `Pass`. One vocabulary ("credential" plus kinds; `GLOSSARY.md` "Peer" update planned): `Pass`.

## File Responsibility Mapping Verdict

Pass. Every file in the Final File Responsibility Mapping has one concern under its owner. `api/rest/remote.ts` holds no security check, and `api/graphql/index.ts` gains only the subscription registration hooks.

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Trusted-network context and classes, `RemoteAccessRoutePolicy`, `authorizeMobileCredential`, `LOCAL_DEV_ONLY` | Pass | Pass | Pass | Pass | — |
| MCP loopback trust, peer body admission, `addPeerNode` | Pass | Pass | Pass | Pass | — |
| `/ws/*` skip, per-handler calls, `remote-access-websocket-auth.ts`, node-desktop re-check | Pass | Pass | Pass | Pass | — |
| Superseded design text (AR-011) | Pass | Pass | Pass | Pass | One leftover sentence in M-3 (Residual Risks) |

## Legacy / Backward-Compatibility Verdict

Pass. No grace period, no loopback trust, URL-only peers refused. Old Docker containers keep their old publishing only until the launcher's next step, and NA-1 still applies (NAS-34).

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate? | Migration Safety | Verdict |
| --- | --- | --- | --- | --- | --- |
| `peers.json` + optional `peerSecret` | Directly Usable — No Migration | Pass | Pass | N/A | Pass |
| New owner credentials, MCP token file, Electron store | Not Affected (new) | Pass | Pass | N/A | Pass |
| Existing Docker containers (runtime configuration) | Recreated on the launcher's next step (config hash) | Pass | Pass | N/A | Pass |

## Change / Refactor Safety Verdict

Pass. Steps 1–8 cover M-1…M-10 and start from failing tests (AC-001).

## Example Adequacy Verdict

Pass. The admission table has an example for each rule. The peer-signature example now includes the sender and receiver IDs. The identity, desktop attachment and refusal examples are present.

## Material Premise Validation

- P-001 (a captured peer request reflected to the other node): resolved by M-7, which checks the signed receiver (NAS-36).
- P-002 (admission by destination address): moot, because M-6 compares the client address.
- P-003 (a `/ws/*` route registered without the wrapper): resolved. M-3 refuses it with an HTTP status by default, and the architecture test enforces the wrapping.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001…AR-011 are resolved (prior-finding table in `architecture-review-revision-record.md`, ARCH-REV-003).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- Wording leftover in M-3: the second bullet ("For a refused `/ws/*` upgrade the hook records the refusal … which every `/ws/*` route registers through") predates the fail-closed bullet after it. The fail-closed bullet is authoritative: the default is an HTTP refusal, and the refusal is recorded only on routes marked `gatedWebSocket`. Implementation follows it and does not need a design revision.
- RSK-001: client paths that never sent a credential. Found by running every probe under enforcement (UNK-004).
- RSK-002: Docker Desktop publishing on the host's Tailscale address is not measured; fallback is Tailscale Serve.
- RSK-003: VPN users need `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (release note).
- RSK-004: a lost desktop store means reconnecting nodes with setup codes (M-2).
- RSK-005: a `100.64/10` local network.
- RSK-006: Linux Docker not measured.
- Unix socket path length limit (about 104 bytes on macOS) for long test data folders. Check the length and give a clear error.
- The initial environment block can be read by same-user software. Outside the model.
- The peer secret travels once over plain `http` when nodes pair across a LAN (NA-9).
- PROBE-03 ran on Electron 42.4.1; the app pins 42.11.16.
- Applications in the app window keep owner authority until slice 2 (DEC-008).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes:
  - The design is ready for implementation as ordered in its Change / Refactor Sequence.
  - Verification follows the contract: every NAS-01…NAS-38 ID appears in a test name, checked by the grep in the suite.
  - Release only on the user's word.
