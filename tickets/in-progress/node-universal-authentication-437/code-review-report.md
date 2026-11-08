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
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001, 18 declared assumptions)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation engineer handoff, IR-001, branch `codex/node-universal-authentication-437` @ `60d0b0d859`, base `b690a5dfdb`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
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
| BEH-004 (DS-004, DS-005) | Confirmed, with defect CR-001 | invite → `PeerPairingService.acceptInvite` → exchange → `savePairedPeer` both sides; `signPeerRequest` in `PeerClient.call` and `openPeerRunObservation`; `PeerRequestSignatureVerifier.verify` (receiver, window, start time, nonce); body hash `preParsing`/`preValidation`; `PeerGateway.admit` checks `fromNodeId === caller.nodeId` | CR-001: a peer whose address carries a deployment base path is refused on every signed request |
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
| Implementation matches approved behavior-defining supplemental artifacts | Fail | CR-001 (NA-9 peers at base-path addresses), CR-002 (contract §1 / NA-7 wording vs code) | Fix CR-001, CR-002 |
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
| Naming quality; one vocabulary (Principle 15) | Fail | CR-002: the memory sync source identity is `credentialId` in code and GLOSSARY, "source ID" in the contract §1 | Fix CR-002 |
| No unjustified duplication | Pass | Old per-area hashing/compare helpers removed in favor of `credential-secret.ts` | — |
| Patch-on-patch complexity control | Pass | Late fixes (`d20340e5c3`, `d8fbe5082a`) are local and owned (parser wording, row cell, file mode) | — |
| Dead code removed in touched files | Pass | Route policy, WS auth helper, auth service, close-codes, memory-hub-auth, `addPeerNode`, address-resolution queries, node-desktop re-check, `resolveAhead`/`useAddress` removed | — |
| Test scenarios and assertions requirement-aligned | Pass | NAS-named e2e suite; architecture test checks gating, phone routes, gate imports and NAS naming | Add a base-path peer case with CR-001 |
| Test fixtures/helpers reusable, structure coherent | Pass | `node-access-test-gate.ts`, `built-server-launch-credential.ts`, `pair-nodes.ts`, `owner-credential-attachment.mjs` | — |
| No stale or compatibility-only tests retained | Pass | `route-policy.test.ts`, WS-auth tests removed with their code | — |
| API/E2E readiness | Fail | CR-001 would make the API/E2E peer validation pass while a documented address form is broken | Fix CR-001 first |

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

- Overall score: `9.2/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…DS-007 are visible in code in call order with one owner each | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Gate is the sole decision point; areas own verifiers and revocations; Electron main owns credentials; architecture test enforces it | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit subject-owned REST, GraphQL and IPC boundaries | Signed-path contract is ambiguous for base-path addresses (CR-001) | State and implement the signed path as node-relative |
| 4 | Separation of Concerns and File Placement | 9.4 | One concern per file; composition split out | `build-studio-server.ts` sits at exactly 500 lines | Next wiring goes into its own composition file |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `ClientIdentity` union, `StoredPeer`/`PeerNode` split, one refusal shape | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear names; comments cite the contract rule | CR-002: "source ID" vs `credentialId` across contract and glossary; NA-7 text vs code | Align the contract text |
| 7 | API/E2E Readiness | 9.0 | Strong NAS-named suites and harnesses | CR-001 untested path would pass API/E2E | Fix and add a base-path peer test first |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Gate, admission, credentials, revocation, body integrity, hold-back answers verified in code | CR-001 breaks preserved collaboration at a documented address form | Fix CR-001 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut; no grace period, no loopback trust | — | — |
| 10 | Cleanup Completeness | 9.5 | Removal plan fully executed, plus address-resolution queries and dead UI paths | — | — |

## Findings

### CR-001 — Peer signature covers the deployment base path; peers behind a base-path address are refused (Local Fix, implementation)

- Basis: C-01, CR-P1; REQ-006, preserved BEH-004, NA-9.
- Where: `autobyteus-server-ts/src/remote-collaboration/channel/peer-client.ts:408-415` (`pathWithQuery: \`${url.pathname}${url.search}\``) and `peer-run-observation-client.ts` (the same for the upgrade); verifier `peer-request-signature.ts:139` uses the receiver's `request.url`.
- Consequence: a peer at `https://gateway.example.com/autobyteus` (documented "Company address" form, first in the node's own address candidates) is refused 401 on every request and run observation; the UI shows "Pair again", which cannot fix it.
- Required action: sign the path the receiving node sees, which is the node-relative route path with query (the `path` argument / `REMOTE_RUN_OBSERVATIONS_PATH`, plus any query), not the full URL pathname. One rule on both sides, no fallback that accepts either form. Add a unit test (signer + verifier with a base-path `peer.baseUrl`) and, if cheap, a two-server or single-node e2e case through a prefix-stripping proxy. Update NA-9 / CM-12 wording if it names "path with query" in a way that could be read as the full URL path.

### CR-002 — Contract text disagrees with the implemented identity and permission rules (Local Fix, implementation; docs)

- Basis: C-02; Principle 15; the contract is the project's authority for later designs and reviews.
- Where: `autobyteus-server-ts/docs/design/node_access_model.md:43-45` ("memory sync source (source ID)") vs code `client-identity.ts:13` and `GLOSSARY.md:55-57` (`credentialId`); `node_access_model.md:77` NA-7 "Owner: every endpoint" vs `node-route-permissions.ts:84-85` (owners refused on `/rest/remote/*` and `/rest/memory-sync/*`).
- Review position: handoff assumptions 1 and 2 are accepted as within design intent (the gate verifies a credential, not a source; no supported owner client uses those routes, and an owner credential is not a peer or a source).
- Required action: correct §1 to "memory sync source (credential ID)" and NA-7 to say peer and memory sync hub routes admit only their own kinds (owners: every other endpoint). Mention the wording change in the implementation handoff so the Solution Designer sees it.

### Other declared assumptions (handoff § Important Assumptions)

Reviewed and accepted as within the design's intent: 3 (pipe name per data folder; see Residual Risks), 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18. Confirmed in code for the late fixes: `peers.json` with an unpaired peer (`peer-store.ts` `toRow` omits a null secret), 290 hold-back 503s, Memory Sync refusal wording (`memory-hub-response-parser.ts`), `owner-credentials.json` 0600 (`owner-credential-store.ts:64`), needs-connecting row without the server cell (`NodeRow.vue`).

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Local Fix` (implementation-owned): CR-001 (source + tests), CR-002 (contract text).

## Recommended Recipient

- Implementation engineer (`Local Fix`), per `get_handoff_rules`. After the fix: source review again (targeted delta), then API/E2E.

## Residual Risks

- UNK-006 (Docker Desktop publishing on the host's Tailscale address) and Linux Docker (`host.docker.internal` arriving from a bridge address, which admission does not admit outside a container) remain for the Docker probe (RSK-002, RSK-006).
- Windows: the PowerShell launcher and the named pipe are unexecuted here (`pwsh` absent); the pipe relies on libuv's default security descriptor (C-05).
- `build-studio-server.ts` is at exactly 500 lines.
- The browser/Electron probes under `autobyteus-web/tests/e2e/*.mjs` still use the removed `addPeerNode` and no credential (handoff § Still Required): API/E2E must update them.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (CR-P1 reachable and supported)
- Score Summary: 9.2/10 average; Runtime Correctness 8.6, Naming 9.0, API/E2E Readiness 9.0 below the 9.2 bar
- Failure Origin: implementation (CR-001 local defect; CR-002 doc wording)
- Recommended Recipient: implementation engineer
- Notes: the security core (gate order, deny by default, one credential form, admission, setup codes, launch credential intake, body integrity, revocation) is sound. Two bounded fixes, then targeted delta review.
