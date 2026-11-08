# Code Review Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/node-universal-authentication-437/requirements-doc.md` (SR-002 baseline; DEC-011…015)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (read where the design cites it)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006; Round 2 Mechanisms M-1…M-10 authoritative)
- Supplemental Task Artifacts Reviewed As Context: `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, NAS-01…NAS-38, §5 as updated); `autobyteus-web/docs/remote_access.md` and `autobyteus-server-ts/docs/features/remote_access.md` (deployment base paths); `follow-ups.md`
- Relevant Solution Revision IDs: SR-006
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002; IR-001 with 18 declared assumptions)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review` (round 2); round 1 was `Full Review`
- Review Scope Evidence (round >1): `git diff 60d0b0d859..b6a57ab154` touches only `peer-request-signature.ts` (+13, new `peerRequestTarget`), `peer-client.ts` and `peer-run-observation-client.ts` (call sites), the contract and CM-12 text, and four test files: exactly the files and behavior of CR-001 and CR-002. No shared interface, data shape or other spine changed.
- Trigger: round 1 implementation engineer handoff IR-001 @ `60d0b0d859`; round 2 Local Fix IR-002 @ `b6a57ab154` (fix `dfa41de41c`, docs `1e02bea41e`); base `b690a5dfdb`
- Prior Review Round Reviewed: 1 (CRR-001, Fail)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E revision record / Delivery: N/A
- Failing Scenario IDs / commands / evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. A new security boundary on every route, new persisted credentials, a changed peer contract, launcher publishing; about 130 production source files across server, web, Electron and scripts. No correction.

## Review Scope

- Changed implementation and behavior reviewed: the node access gate and route permissions; the `node-access` subsystem (domain, owner credentials, setup codes, local control socket, CLI, network admission, credential resolver, launch-credential intake); phone verifier and in-memory device registry; peer pairing, signing, verification, peer client/gateway/run-observation, peer store/directory; memory sync source verifier; MCP gateway token and access; gated WebSocket wrapper, open-socket registry, GraphQL subscription registration; application backend credential stripping; Electron credential store, attacher, connect service, IPC, launch credential, node update client; web Nodes page, pairing connector, row status and stores; dev runtime and Vite proxy; Docker launcher (bash read in full for publishing and `setup-code`; PowerShell compared by shape).
- Files / areas reviewed: all production source in `git diff b690a5dfdb..HEAD` under `autobyteus-server-ts/src`, `autobyteus-web/{electron,stores,components,services,shared,nuxt.config.ts}`, `scripts/`; `tests/architecture/node-access-boundaries.test.ts`; the permission and resolver unit tests by name. Third-party behavior checked in source: `@fastify/cors` 11.3.1 preflight handling (`node_modules/@fastify/cors/index.js:160-215`).
- Explicit exclusions: generated GraphQL types; localization strings beyond the keys referenced; the untracked built `dist/` folders (not committed, `git status` shows them `??`); the test suites' internals beyond structure (no recorded check was rerun: none of the reviewed code changed after its check ran).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: every non-exempt request to a node's main port needs a valid credential from an admitted network, permitted by client kind, deny by default; each client gets its credential one way (launch credential, setup code, phone pairing, peer invite, `mhub_`, MCP token); revocation closes sockets; upgrades never fall back.
- Design-spec behavior map verified against the implementation: yes, DS-001…DS-007 traced in code (below).
- Design review report and round confirmed: ARCH-REV-003 Pass on SR-006.
- Behavior-basis status: `Confirmed`, except one preserved behavior contradicted by a defect (CR-001, a local implementation defect, not a basis change).
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none blocking.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-001 (DS-001) | Confirmed | `node-access-plugin.ts:50-67` origin rule → `NodeAccessGate.decide` (`node-access-gate.ts:43-76`: admission → `routeAccessFor` on the matched route pattern → `NodeCredentialResolver.identify` (exactly one form, `node-credential-resolver.ts:38-59`) → permitted kinds); refusal answered before any handler (`request-refusal.ts:34-46`); deny by default (`node-route-permissions.ts:74-91`) | — |
| BEH-002 (DS-001, DS-006, DS-007) | Confirmed | `network-admission.ts:74-92` (loopback, Tailscale client on a local Tailscale address, allowed local subnets, configured CIDRs, container); snapshot refresh 30 s / on owner change / on refusal ≤ 1/5 s, fail closed (`:94-110`); launcher `container-config.sh` `publish_addresses` | — |
| BEH-003 (DS-002, DS-003) | Confirmed | `baseServerManager.ts` creates the credential per start into the spawn env only; `launch-credential-intake.ts` first import of `app.ts` deletes it; `OwnerCredentialService.verify`; setup codes in memory (`setup-code-service.ts`), local control socket 0600 in 0700 folder; Electron `NodeConnectService.connect` → `NodeCredentialStore` (safeStorage, 0600) → `NodeCredentialAttacher` on `session.defaultSession` | — |
| BEH-004 (DS-004, DS-005) | Confirmed (CR-001 resolved in round 2: `peerRequestTarget` signs the node route) | invite → `PeerPairingService.acceptInvite` → exchange → `savePairedPeer` both sides; `signPeerRequest` in `PeerClient.call` and `openPeerRunObservation`; `PeerRequestSignatureVerifier.verify` (receiver, window, start time, nonce); body hash `preParsing`/`preValidation`; `PeerGateway.admit` checks `fromNodeId === caller.nodeId` | CR-001: a peer whose address carries a deployment base path is refused on every signed request |
| BEH-005 | Confirmed | `PhoneCredentialVerifier` over the in-memory `PairedDeviceService`; revocation and Phone Access off published to the gate | — |
| BEH-006 | Confirmed | attacher on `onBeforeSendHeaders` for HTTP and WS, by origin; other partitions untouched | — |
| BEH-007 | Confirmed | `McpGatewayAccessGate.validateRequest` (admission then token, no loopback trust); `MemoryHubCredentialService.verify` as the `mhub_` kind; routes read the gate's identity | — |
| REQ-011 | Confirmed | owner `revoke`, `PairedDeviceService.revokeDevice/All`, Phone Access off, `PeerDirectory.remove`, memory hub revoke/regenerate publish `ClientRevocation`; `OpenSocketRegistry.close` | — |
| Preserved 290 hold-back, AC-102 | Confirmed | `heldBackRefusal` 503 in peer and memory verifiers; `PeerClient.call` 401 → `answersAs` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RS-01 | SCN-006, NA-1, NA-2, NA-6 | Contract | Anyone without a credential | Reach any endpoint | Direct HTTP/WS request | Explicit Edge | DS-001 | 401/403 before any handler | requirements REQ-001/002 | Supported Explicit Edge Scenario | Use |
| RS-02 | SCN-001, NAS-01 | User | Owner | Use the desktop app on its own node | App start | Normal | DS-002 | Works with no step | REQ-003 | Supported Normal Scenario | Use |
| RS-03 | SCN-002, NAS-02/03/32/33 | User | Owner | Connect a Docker/remote node | Nodes page + setup code | Normal | DS-003 | Owner credential issued, attached | REQ-004, DEC-015 | Supported Normal Scenario | Use |
| RS-04 | SCN-004, NAS-19/20 | System | Two nodes | Collaborate after one pairing | Nodes page "Pair"; peer requests | Normal | DS-004, DS-005 | Signed requests accepted both ways | REQ-006 | Supported Normal Scenario | Use |
| RS-05 | SCN-004 + preserved BEH-004; NA-9 | System | Two nodes, one reached at a company gateway address with a deployment base path | Collaborate | Peer address from the invite's candidates (`AUTOBYTEUS_SERVER_HOST`, first candidate, `server-address-candidate-service.ts:84-91`) or Change address | Explicit Edge | `PeerClient.call` signs `url.pathname` (base path included) → gateway strips the base path → gate verifies `request.url` | Signature mismatch: 401 on every request | Deployment base paths are a documented, preserved address form (`autobyteus-web/docs/remote_access.md:78-96`; `features/remote_access.md:110`); `normalizeNodeBaseUrl` keeps them (`url-normalization.ts:18-35`) | Supported Explicit Edge Scenario | Use |
| RS-06 | SCN-005, NAS-25/26 | System | MCP client, memory sync source | Call the node with their tokens | `/mcp/gateway`, `/rest/memory-sync/*` | Normal | DS-001 | Works with token; refused without | REQ-007 | Supported Normal Scenario | Use |
| RS-07 | NA-11, NAS-37 | User | Owner | Revoke a device, peer or desktop | Phone Setup, Nodes page | Normal | revocation → registry close | Sockets close at once | REQ-011 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The peer signature covers the URL path *including the peer's deployment base path*; the receiving node verifies the path it receives (gateway-stripped) | RS-05, NA-9, preserved BEH-004 | Owner pairs a node configured with `AUTOBYTEUS_SERVER_HOST=https://gateway.example.com/autobyteus` (its first address candidate) | `peer-client.ts:408,415` and `peer-run-observation-client.ts` sign `${url.pathname}${url.search}` → node receives `/rest/remote/...` → `peer-request-signature.ts:139-140` mismatch → 401 → `answersAs` true (status route answers) → `PEER_NOT_PAIRED`; "Pair again" cannot fix it | Code read; before this change `PeerClient` posted to `${peer.baseUrl}${path}` and worked at such an address | Promote | This ticket | CR-001. Sign the node-relative path (the route path and query the receiving node sees), not the full URL pathname; add a test with a base-path peer address |
| C-02 | Contract §1 names the memory sync source identity "source ID"; code and GLOSSARY use `credentialId` (handoff assumption 1). NA-7 says "Owner: every endpoint", while `/rest/remote/*` and `/rest/memory-sync/*` refuse owners (assumption 2) | NA-7, Principle 15, contract authority | Contract readers (later designs and reviews) | Two names for one identity across the contract and glossary; a rule stating owner access the code refuses | `node_access_model.md:43-45`, `:77`; `GLOSSARY.md:55-57`; `node-route-permissions.ts:84-85` | Promote | This ticket | CR-002. Both deviations are accepted as within design intent (no supported owner client uses those routes; the gate knows the credential, not the source). Correct the contract text to match |
| C-03 | Every OPTIONS request is exempt; `/rest/applications/:id/backend/routes/*` accepts OPTIONS and forwards it to the application backend (`application-backends.ts:79`) | NA-6, REQ-001 | Unauthenticated OPTIONS to an application route | `@fastify/cors` (registered first, root hook) answers every OPTIONS: a preflight 204, a non-preflight 400 (strict preflight), a disallowed origin then refused 403 by the origin rule (`index.js:176-212`) | Code read | Reject | — | Not reachable: no handler runs for an OPTIONS request |
| C-04 | `LocalControlSocket.start` removes an existing socket file before listening | NA-5 | Two nodes started on one data folder | — | `local-control-socket.ts:64` | Reject | — | Two nodes sharing one data folder is not a supported setup |
| C-05 | Windows named pipe uses libuv's default security descriptor, not an explicit current-user ACL (design M-2) | NA-5 | Another local Windows user | Default DACL gives write only to the creator, SYSTEM and Administrators; requesting a code needs a write | `local-control-socket.ts:31-33` | Reject | — | Not a reachable weakness for another user; noted under Residual Risks for the PowerShell/Windows probe |
| C-06 | Admission admits every local subnet the classifier keeps while `allowed` is the default-route network's flag | NA-3 | Computer on an allowed and a not-allowed physical network at once | — | `node-network-service.ts` `readAdmissionFacts` | Reject | — | Not a supported product state; NA-1 still requires a credential |
| C-07 | A node entry's stored credential follows its entry if the owner points the entry to another server | NA-8 | Owner edits a node entry's address to a different server | — | `nodeConnectService.ts:80-83` | Reject | — | Contrived; the owner's own action and the other server would only see an unknown credential |
| C-08 | Refused connections trigger an admission refresh (≤ 1/5 s) | QR-002, DS-007 | Stranger probing | Bounded by the design's rate limit | `network-admission.ts:74-79` | Reject | — | Approved design behavior (DS-007) |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Handoff § Task Design Health; trusted-network classes replaced by client-kind permissions; peer identity moved into the gate | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Round 2: CR-001 fixed (signed path = node route, NA-9 states it); CR-002 fixed (contract §1, NA-7 match the code) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-007 map one-to-one onto `NodeAccessGate`, `NodeConnectService`, `PeerPairingService`, signer/verifier, `NetworkAdmission` | — |
| Ownership boundary preservation and clarity | Pass | Gate is the only decision point; areas own verifiers and publish revocations; Electron main owns credentials | — |
| Off-spine concern clarity | Pass | Refusal logging (`request-refusal.ts`), replay cache in the verifier, last-seen throttles in each verifier, open-socket registry | — |
| Existing capability/subsystem reuse | Pass | `NodeNetworkService` extended as the admission facts source; `credential-secret.ts` shared by four kinds; `PeerAddressResolver` reused by pairing | — |
| Reusable owned structures | Pass | One `ClientIdentity` union, one `NodeAccessRefusal` shape, one `CredentialVerification` contract | — |
| Shared-structure/data-model tightness | Pass | `StoredPeer` vs `PeerNode` (secret never leaves the directory; `paired` derived); identity union per kind | — |
| Repeated coordination ownership | Pass | Refusal → close code in one function (`webSocketCloseCodeFor`); every `/ws/*` through `registerGatedWebSocketRoute` | — |
| Empty indirection | Pass | `node-access-plugin.ts` owns hook registration, CORS and body integrity; `api/rest/node-access.ts` is a thin REST binding by design | — |
| Separation of concerns and file responsibility | Pass | One concern per new file; `agent.ts` shrank 181 → 115 | — |
| Ownership-driven dependency direction | Pass | `node-access/domain` is a leaf; capability areas import only it; composition root wires the resolver; architecture test enforces no handler imports the gate | — |
| Authoritative Boundary Rule | Pass | Gate depends on `NodeCredentialResolver`, not on `PairedDeviceService`/`PeerDirectory`; peer routes read only `getClientIdentity` | — |
| File placement | Pass | `node-access/{domain,services,stores}`, `api/security`, `electron/nodeAccess` match the design mapping | — |
| Flat-vs-over-split layout | Pass | Readable; no artificial layers | — |
| Interface/API boundary clarity | Pass | Setup exchange/codes/owner credentials, invite/accept/exchange, preload `nodeAccess` match the design's Interface Boundary Mapping (assumption 4 shape accepted) | — |
| Naming quality; one vocabulary (Principle 15) | Pass | Round 2: contract §1 now says credential ID, as code and GLOSSARY do | — |
| No unjustified duplication | Pass | Old per-area hashing/compare helpers removed in favor of `credential-secret.ts` | — |
| Patch-on-patch complexity control | Pass | Late fixes (`d20340e5c3`, `d8fbe5082a`) are local and owned (parser wording, row cell, file mode) | — |
| Dead code removed in touched files | Pass | Route policy, WS auth helper, auth service, close-codes, memory-hub-auth, `addPeerNode`, address-resolution queries, node-desktop re-check, `resolveAhead`/`useAddress` removed | — |
| Test scenarios and assertions requirement-aligned | Pass | NAS-named e2e suite; architecture test checks gating, phone routes, gate imports and NAS naming; round 2 adds NAS-20 base-path cases (unit signer/verifier, client POST, observation upgrade; e2e through a prefix-stripping gateway) | — |
| Test fixtures/helpers reusable, structure coherent | Pass | `node-access-test-gate.ts`, `built-server-launch-credential.ts`, `pair-nodes.ts`, `owner-credential-attachment.mjs` | — |
| No stale or compatibility-only tests retained | Pass | `route-policy.test.ts`, WS-auth tests removed with their code | — |
| API/E2E readiness | Pass | CR-001 fixed and covered; remaining probes listed in the handoff | — |

## Source File Size And Structure Audit

| Source File | Lines Before | Lines After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 493 | 500 | Pass (at the limit, not over) | Pass (+12/−5) | Composition root; node access wiring moved to `node-access-composition.ts` | Pass | Watch | None now; the next addition belongs in its own composition file |
| `autobyteus-server-ts/src/api/websocket/agent.ts` | 181 | 115 | Pass | Rewrite (+89/−162), shrank | Pass | Pass | Pass | — |
| `autobyteus-web/electron/application/electronApplication.ts` | 446 | 462 | Pass | Pass | Wiring only | Pass | Pass | — |
| `autobyteus-web/electron/server/baseServerManager.ts` | 436 | 455 | Pass | Pass | Launch credential at the spawn owner | Pass | Pass | — |
| `scripts/public/docker/.../bash/docker-runtime.sh`, `powershell/DockerRuntime.ps1` | 422 / 413 | 425 / 418 | Pass | Pass | Pass | Pass | Pass | — |
| New `node-access/*`, `api/security/*`, `remote-collaboration/*` files | — | ≤ 163 each | Pass | Pass | Pass | Pass | Pass | — |

Evidence: `evidence/implementation/IMP-16-source-size-guardrail.log` (the `dist/` rows in that log are untracked build outputs, not committed source).

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No grace period, no loopback trust, no URL-only peers |
| No legacy old-behavior retention | Pass | Unpaired peers and unconnected nodes refused until their step (NA-14) |
| Dead code removed in touched files | Pass | See removal list above |
| Approved persisted-data transition followed | Pass | `Directly Usable — No Migration`: `PeerStore` reads rows without `peerSecret` as unpaired; owner credential rows that cannot be read are kept and skipped |
| No version-specific dual reads/writes | Pass | Tolerant reader of one optional field only |
| Transition mechanics match the design | Pass | No migration machinery added |

## Dead / Obsolete / Legacy Items Requiring Removal

None found.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the contract must state the implemented identity and permission rules (CR-002); a CR-001 fix may need one line in `collaboration_model.md` CM-12 or the contract NA-9 saying which path is signed.
- Files or areas likely affected: `autobyteus-server-ts/docs/design/node_access_model.md` §1, NA-7, NA-9 (if the signed path's wording changes).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None reclassified.

### `CR-P1` — Peers reached at a deployment base path keep working after signing

- Origin: `New`
- Related approved requirement or established contract: REQ-006; preserved BEH-004 ("Collaboration features"); NA-9; documented deployment base paths (`autobyteus-web/docs/remote_access.md:78-96`)
- Relevant behavior ID(s): BEH-004
- Coherent product goal or governing event: two of the owner's nodes collaborate, one exposed through a company gateway or Tailscale Serve path mount
- Scenario validity: `Supported Explicit Edge Scenario`
- Initiating basis kind: `Operational`
- Independent trigger: the operator sets `AUTOBYTEUS_SERVER_HOST` to a base-path URL (the "Company address" way); the node puts it first in its peer address candidates (`server-address-candidate-service.ts:84-91`), which the invite carries (`peer-pairing-service.ts:92`)
- Support evidence: docs above; `normalizeNodeBaseUrl` preserves base paths (`url-normalization.ts:9-16,33-34`)
- Forward path: `PeerClient.call` → `new URL(peer.baseUrl + path)` → signs `url.pathname` (`/autobyteus/rest/remote/messages`) → gateway forwards `/rest/remote/messages` (the node serves no `/autobyteus` routes, so a working gateway must strip it) → `PeerRequestSignatureVerifier.verify` recomputes over `request.url` → mismatch
- Lifecycle preconditions and consequence: every signed peer request and every run-observation upgrade to that peer is 401; the peer client reports `PEER_NOT_PAIRED` because the status probe still answers; pairing again cannot help. Before this change the same address worked.
- Reachability: `Reachable`
- Review consequence: CR-001, Local Fix.

## Review Scorecard (Mandatory)

- Overall score: `9.45/10` (simple average; not the decision rule). Round 2 rescored the categories CR-001/CR-002 held down; the others carry forward from round 1 (unaffected by the delta).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…DS-007 are visible in code in call order with one owner each | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Gate is the sole decision point; areas own verifiers and revocations; Electron main owns credentials; architecture test enforces it | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit subject-owned REST, GraphQL and IPC boundaries; the signed path is now one stated rule (`peerRequestTarget`, NA-9) | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | One concern per file; composition split out; the target helper sits with the signer it serves | `build-studio-server.ts` sits at exactly 500 lines | Next wiring goes into its own composition file |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `ClientIdentity` union, `StoredPeer`/`PeerNode` split, one refusal shape | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Contract, glossary and code use one name for each identity; NA-7 states the implemented permissions | — | — |
| 7 | API/E2E Readiness | 9.3 | NAS-named suites incl. the base-path cases; IR002 checks pass | Browser/Electron probes still to update (handoff) | API/E2E work |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Gate, admission, credentials, revocation, body integrity, hold-back answers verified; peers at base-path addresses sign the route the receiver sees (unit + e2e through a stripping gateway) | Docker/Windows/real-network paths unmeasured (residual risks) | API/E2E probes |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut; no grace period, no loopback trust; no dual signed-path acceptance | — | — |
| 10 | Cleanup Completeness | 9.5 | Removal plan fully executed, plus address-resolution queries and dead UI paths | — | — |

## Findings

### CR-001 — Peer signature covers the deployment base path; peers behind a base-path address are refused (Local Fix, implementation) — **Resolved (round 2)**

- Resolution: `peerRequestTarget(baseUrl, routePath)` (`peer-request-signature.ts`) returns the URL (base path kept) and the signed path (node route + query, base path removed); `PeerClient.call` and `openPeerRunObservation` both use it; the verifier is unchanged (received `request.url`); no dual acceptance. Tests: `peer-request-signature.test.ts`, `peer-client.test.ts`, `peer-run-views-client.test.ts` (NAS-20 base-path cases), e2e `node-access-model.e2e.test.ts` "NAS-20 a peer behind a gateway at a base path" through a prefix-stripping gateway. Evidence: `evidence/implementation/IR002-03…06` (206 unit, 23 NAS e2e, 41 two-server, all pass). NA-9 and CM-12 name the node route.

- Basis: C-01, CR-P1; REQ-006, preserved BEH-004, NA-9.
- Where: `autobyteus-server-ts/src/remote-collaboration/channel/peer-client.ts:408-415` (`pathWithQuery: \`${url.pathname}${url.search}\``) and `peer-run-observation-client.ts` (the same for the upgrade); verifier `peer-request-signature.ts:139` uses the receiver's `request.url`.
- Consequence: a peer at `https://gateway.example.com/autobyteus` (documented "Company address" form, first in the node's own address candidates) is refused 401 on every request and run observation; the UI shows "Pair again", which cannot fix it.
- Required action: sign the path the receiving node sees, which is the node-relative route path with query (the `path` argument / `REMOTE_RUN_OBSERVATIONS_PATH`, plus any query), not the full URL pathname. One rule on both sides, no fallback that accepts either form. Add a unit test (signer + verifier with a base-path `peer.baseUrl`) and, if cheap, a two-server or single-node e2e case through a prefix-stripping proxy. Update NA-9 / CM-12 wording if it names "path with query" in a way that could be read as the full URL path.

### CR-002 — Contract text disagrees with the implemented identity and permission rules (Local Fix, implementation; docs) — **Resolved (round 2)**

- Resolution: `node_access_model.md` §1 names the memory sync source by its credential ID; NA-7 states owners reach every endpoint except the peer and memory sync hub routes, and phones what owners reach except owner actions (`1e02bea41e`). The handoff's assumptions 1–2 point the Solution Designer to the change.

- Basis: C-02; Principle 15; the contract is the project's authority for later designs and reviews.
- Where: `autobyteus-server-ts/docs/design/node_access_model.md:43-45` ("memory sync source (source ID)") vs code `client-identity.ts:13` and `GLOSSARY.md:55-57` (`credentialId`); `node_access_model.md:77` NA-7 "Owner: every endpoint" vs `node-route-permissions.ts:84-85` (owners refused on `/rest/remote/*` and `/rest/memory-sync/*`).
- Review position: handoff assumptions 1 and 2 are accepted as within design intent (the gate verifies a credential, not a source; no supported owner client uses those routes, and an owner credential is not a peer or a source).
- Required action: correct §1 to "memory sync source (credential ID)" and NA-7 to say peer and memory sync hub routes admit only their own kinds (owners: every other endpoint). Mention the wording change in the implementation handoff so the Solution Designer sees it.

### Other declared assumptions (handoff § Important Assumptions)

Reviewed and accepted as within the design's intent: 3 (pipe name per data folder; see Residual Risks), 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18. Confirmed in code for the late fixes: `peers.json` with an unpaired peer (`peer-store.ts` `toRow` omits a null secret), 290 hold-back 503s, Memory Sync refusal wording (`memory-hub-response-parser.ts`), `owner-credentials.json` 0600 (`owner-credential-store.ts:64`), needs-connecting row without the server cell (`NodeRow.vue`).

## Follow-ups

- Follow-ups this review added: None.

## Classification

- Round 2: none (Pass). Round 1 was `Local Fix` (implementation) for CR-001 and CR-002, both resolved.

## Recommended Recipient

- API/E2E engineer (implementation review pass), per `get_handoff_rules`; informational notice to the implementation engineer.

## Residual Risks

- UNK-006 (Docker Desktop publishing on the host's Tailscale address) and Linux Docker (`host.docker.internal` arriving from a bridge address, which admission does not admit outside a container) remain for the Docker probe (RSK-002, RSK-006).
- Windows: the PowerShell launcher and the named pipe are unexecuted here (`pwsh` absent); the pipe relies on libuv's default security descriptor (C-05).
- `build-studio-server.ts` is at exactly 500 lines.
- The browser/Electron probes under `autobyteus-web/tests/e2e/*.mjs` still use the removed `addPeerNode` and no credential (handoff § Still Required): API/E2E must update them.

## API/E2E Failure-Origin Review (Round 3, CRR-003)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Trigger: API/E2E engineer, API-REV-001 (Fail), validated commit `b6a57ab154`; reports and evidence `b28e5c0864`; test-code changes `960cfc0661` (no source change since `b6a57ab154`: `git diff --stat b6a57ab154..HEAD -- autobyteus-server-ts/src autobyteus-web/nuxt.config.ts` is empty)
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (§ Failures, Observations)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`; Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: API-15 (RU-02, `pnpm dev` window WebSockets), API-03 MSP-08 (workspace file search; AC-003 "files", AC-005), API-08 NVP-05 (held-back Memory Sync card; preserved autobyteus-290 REQ-913)
- Exact Failing Commands: `node scripts/development/run-dev.mjs` + raw upgrades (`API-15-upgrade-repro.log`); `API-03-MSP-08-search-check.mjs` (branch vs base `b690a5dfdb` vs released image); node-vocabulary probe NVP-05 (`API-08-NVP-05-cause.txt`)
- Failure Evidence Paths: `evidence/api-e2e/API-15-pnpm-dev/*`, `evidence/api-e2e/API-03-MSP-08-cause.txt`, `API-03-mobile-shell/MSP-08-files-search.png`, `evidence/api-e2e/API-08-NVP-05-cause.txt`, `API-08-node-vocabulary/server-alpha.log`
- Review Scope: `N/A` (failure-origin round; no full re-audit)

### Scenario Basis

| Failure | Scenario still approved? | Independent trigger | Production path | Validity |
| --- | --- | --- | --- | --- |
| F-1 | Yes: handoff assumption 11, design § Guidance ("dev WebSockets go through the Vite proxy with the header"), QR-003 (no internal caller breaks) | Developer runs `pnpm dev` and uses the window | window WS → frontend origin `:3000` → Nuxt dev server | Supported Normal Scenario (development workflow) |
| F-2 | Yes: preserved Files search (BEH-003/005 "Preserved: everything the desktop/phone does"; AC-003, AC-005) | Owner or phone searches workspace files | GraphQL `searchFiles` → `createGraphqlRequestContext` → `createRequestAbortSignal` → `fileExplorer.searchFiles(query, signal)` | Supported Normal Scenario |
| F-3 | Yes: preserved autobyteus-290 hold-back text (REQ-913; handoff "Preserved: autobyteus-290 hold-back") | Owner opens Memory Sync settings while Memory Sync waits for its migration | settings GraphQL resolver throws `MemorySyncNotMigratedError` → Mercurius maps `originalError.statusCode` to HTTP 503 → the web client shows the transport error | Supported Explicit Edge Scenario (preserved contract) |

### Origin Findings

#### CR-003 — `pnpm dev`: WebSocket upgrades never reach the Vite proxy (Local Fix, implementation)

- Origin: implementation defect (this change). `autobyteus-web/nuxt.config.ts` points every window WebSocket at the frontend origin (`development-runtime.mjs` `BACKEND_*_WS_ENDPOINT` = frontend URL) and relies on `vite.server.proxy` `ws: true`. Under Nuxt 3.21 Vite runs in middleware mode inside Nuxt's dev server, which does not hand HTTP `upgrade` events to Vite's proxy; the upgrade is answered `200` by Nuxt (`API-15-upgrade-repro.log`), and the dev server restarts on `ECONNRESET`. Before this change the window opened WebSockets directly on the backend. HTTP through the proxy works (200).
- Confirmed: the config and the runtime evidence agree; IMP-15 checked only the generated environment, not an upgrade.
- Required action: make the development proxy carry WebSocket upgrades (`/ws/*` and `/graphql` subscriptions) with the development credential in the request headers, using a mechanism Nuxt's dev server actually routes upgrades through (for example Nitro `devProxy` with `ws`, or an `upgrade` handler on Nuxt's dev server in a dev-only hook). Keep the credential out of page code and `runtimeConfig.public` (NA-8; assumption 11). Add a check that performs a real upgrade through the dev frontend (the API-15 repro is the shape), not only a config assertion.
- Review gap: partial. The source review read this config diff; that Nuxt's dev server does not route upgrades to `vite.server.proxy` was detectable with Nuxt-specific knowledge but was not caught.

#### CR-004 — Async `preValidation` hook makes every GraphQL request's abort signal abort at creation; `searchFiles` returns nothing (Local Fix, implementation)

- Origin: implementation change (this ticket) exposing a latent defect in an unchanged helper. `node-access-plugin.ts:86-92` registers an async `preValidation` hook on every request (it returns at once for non-peers). The extra asynchronous step lets Node's `IncomingMessage` finish its normal lifecycle (body read, `autoDestroy`) before Mercurius builds the context, so `createRequestAbortSignal` (`graphql-request-context.ts`) sees `request.raw.destroyed === true` and aborts immediately. That check treats a request whose body was simply consumed as a client disconnect. `searchFiles` is the only consumer (`graphql/types/file-explorer.ts:77`), so every search returns `[]` with "Search aborted".
- Confirmed: evidence isolates it (base and released image return `["src/app.ts"]`; this branch `[]`; instrumentation `reqDestroyed=true readableEnded=true`; `preValidation` off → works, `preParsing` off → still fails).
- Required action:
  - Fix the abort-signal rule at its owner: a GraphQL request is aborted when the client goes away (`request.raw.aborted`, or the response closes before it finishes). It is not aborted because the request stream was destroyed after its body was fully read.
  - Body integrity stays as designed (M-7). Optionally scope the peer body hooks to the peer routes, so non-peer requests take no extra async step; that is not required.
  - Add a regression test: `searchFiles` through the real gate returns a match, or a context test with the plugin registered. This interaction escaped every existing check.
- Review gap: not reasonably detectable in source review. The interaction between a new no-op async hook and an unchanged `destroyed` check in another file only shows at runtime.

#### CR-005 — `statusCode = 503` on `MemorySyncNotMigratedError` turns the held-back settings answer into an HTTP 503 (Local Fix, implementation)

- Origin: implementation change (`9765d0dad8`, `memory-sync-capability.ts`: `readonly statusCode = 503`). Mercurius 16 uses a single error's `originalError.statusCode` as the HTTP status when there is no data (`lib/errors.js:70-74`). The settings query therefore answers 503, and the web client shows "Response not successful: Received status code 503" instead of the preserved text "Memory Sync is waiting for its data migration." (autobyteus-290 REQ-913). The class's own doc comment still says the settings GraphQL "fail with its text".
- Confirmed: server log `statusCode: 503` on `POST /graphql` (`API-08-NVP-05-cause.txt`). The REST hub route maps the error to 503 explicitly (`api/rest/memory-sync.ts:13-15`) and the gate maps it through `heldBackRefusal`, so neither needs the property.
- Required action: remove the `statusCode` property, or otherwise keep it from reaching Mercurius. Confirm nothing else relied on it (the REST and gate paths map the error explicitly). Add a test that the held-back settings query answers HTTP 200 with the error text.
- Review gap: partial. The one-line addition was in the reviewed diff; its effect depends on Mercurius's status mapping, which the review did not check.

### Observations From API/E2E

| ID | Decision | Reason |
| --- | --- | --- |
| O-1 Launcher prints "open that node over your trusted private network" after `new-container` (`docker-runtime.sh:254`) | This ticket; include in the same Local Fix | The change made the text wrong: a node is now published on this computer and Tailscale and needs a setup code. The launcher already prints the setup code, so this is a wording update in the same launcher (bash and PowerShell). |
| O-2 After Disconnect the node desktop viewer says "not allowed" instead of that the node needs connecting | This ticket; include in the same Local Fix | A consequence of the new revocation close (4403 `NODE_CREDENTIAL_REVOKED`). The viewer should word that code, or point to Nodes / "Needs connecting" (NA-13: a client words the codes it knows). |
| O-3 Pairing exchange numbers a taken name ("Embedded Node 2") | Accepted; no action | It follows the Nodes page naming rule that the plan already applies and shows ("gets a number"). The probe reached it only by a name taken between plan and run (NP-07, a race the probe constructs), which is not a supported workflow of its own (Principle 6). The end state is valid. |

### Classification And Routing

- Classification: `Local Fix`, owner implementation engineer (CR-003, CR-004, CR-005; with O-1, O-2).
- After the fix: targeted source review (CR-003…005), then API/E2E reruns API-15, API-03 MSP-08 and API-08 NVP-05 and its open API-16 / API-FS items, then the proportional test-code review of `960cfc0661` and later test changes.
- The test-code changes in `960cfc0661` are not reviewed in this round. They are reviewed in the post-pass proportional test review.

## Latest Authoritative Result

- Review Decision: `Fail` (failure-origin review, round 3, CRR-003). The implementation review of round 2 (CRR-002, Pass) stands for everything outside CR-003…005.
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (all three failing scenarios remain approved behavior)
- Material-Premise Gate: `Pass`
- Score Summary: not rescored (failure-origin round). Runtime Correctness and API/E2E Readiness are reopened by CR-003…005.
- Failure Origin: implementation (CR-003 dev proxy; CR-004 async hook × abort signal; CR-005 error status). Review gaps: CR-003 and CR-005 partial; CR-004 not reasonably detectable.
- Recommended Recipient: implementation engineer
- Notes: API/E2E's root-cause evidence is sound for all three.
