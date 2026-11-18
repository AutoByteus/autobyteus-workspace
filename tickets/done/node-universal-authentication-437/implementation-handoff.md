# Implementation Handoff — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-003 passed SR-006; the Architecture Reviewer sent the implementation request.
- Requirements doc: `tickets/in-progress/node-universal-authentication-437/requirements-doc.md` (REQ-001…011, AC-001…009, DEC-001…015)
- Investigation notes: `tickets/in-progress/node-universal-authentication-437/investigation-notes.md`
- Solution revision record: `tickets/in-progress/node-universal-authentication-437/solution-revision-record.md` (SR-006)
- Design spec (required on every route): `tickets/in-progress/node-universal-authentication-437/design-spec.md` (Round 2 Mechanisms M-1…M-10 authoritative)
- Supplemental task artifacts: the project contract `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, NAS-01…NAS-38; §5 updated by this implementation); probes in `tickets/in-progress/node-universal-authentication-437/probes/` and `evidence/PROBE-0*`
- Design review report: `tickets/in-progress/node-universal-authentication-437/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture review revision record: `tickets/in-progress/node-universal-authentication-437/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-003 after CRR-003 / API-REV-001; IR-002 after CRR-001)
- Implementation revision record: `tickets/in-progress/node-universal-authentication-437/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (baseline IR-001)
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`, `CRR-002` (Pass), `CRR-003`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: IR-003: `CR-003`, `CR-004`, `CR-005`, `O-1`, `O-2`; IR-002: `CR-001`, `CR-002`

Every request to a node's main port now passes one gate after the Host and Origin rules: network admission on the
client address (M-6), exactly one credential (Bearer, the browser WebSocket `access_token` on upgrades, or the peer
signature headers), and the route's permission for that client kind (deny by default). The desktop app hands its own
node a fresh launch credential (M-1) and attaches each node's owner credential in its main process; remote and Docker
nodes are connected with one-time setup codes from the node's local control socket (M-2); peers pair with one invite
and sign every request (M-7, M-9); revocations close open sockets at once (M-4); the MCP gateway always needs its
token (M-5); the Docker launcher publishes on this computer and its Tailscale address and prints setup codes (M-8).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: a new security boundary on every route, new persisted credentials (`owner-credentials.json`, `peerSecret`, `mcp-gateway/token.json`, the Electron encrypted store), a changed peer contract, launcher publishing change; about 200 files across server, web, Electron, scripts, tests and docs.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. UNK-006 (Docker Desktop publishing on the host's Tailscale address) is not measured here: it needs a test-owned container on a host with Tailscale (Docker probe, API/E2E).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / DS-001 (REQ-001, 002, 009; AC-001, 002, 009) | Credential required on every non-exempt request; route permitted by client kind; deny by default | `src/api/security/node-access-plugin.ts` (hook after Host/Origin) → `node-access-gate.ts` (`decide`) → `src/node-access/services/node-credential-resolver.ts` → verifiers → `node-route-permissions.ts`; refusals `src/node-access/domain/node-access-refusal.ts`, `request-refusal.ts`; GraphQL owner mutations `requireOwner` | Implemented. NAS-02/08/12/14/16/24/26 in `tests/e2e/node-access/node-access-model.e2e.test.ts`; AC-002 by `tests/architecture/node-access-boundaries.test.ts` and `tests/unit/node-access/node-route-permissions.test.ts` |
| BEH-002 / DS-001, DS-006, DS-007 (REQ-008, AC-008) | Network admission (this computer, Tailscale with a local Tailscale address, allowed local network, `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`, any in a container); Docker publishing | `src/node-access/services/network-admission.ts` (snapshot, 30 s refresh, refresh on refusal ≤ 1/5 s, fail closed), `src/node-access/domain/ip-network.ts`, `remote-access/services/node-network-service.ts`; launcher `container-config.sh` / `ContainerConfig.ps1` | Implemented. NAS-05/06/07/11/28 e2e + unit; NAS-27 launcher test |
| BEH-003 / DS-002, DS-003 (REQ-003, 004, 010; AC-003, 004) | Launch credential for the own node; setup code → owner credential for remote/Docker nodes; "Needs connecting" | `src/node-access/launch-credential-intake.ts` (first import of `app.ts`); `owner-credential-service.ts`, `setup-code-service.ts`, `local-control-socket.ts`, `src/node-access-cli.ts`, `api/rest/node-access.ts`; Electron `electron/nodeAccess/*`, `server/baseServerManager.ts`, `nodeUpdateClient.ts`; web `NodeAccessNotice.vue`, `NodeRow.vue`, `stores/nodeAccessStore.ts` | Implemented. NAS-01/03/04/32/33 e2e; Electron specs; built CLI check |
| BEH-004 / DS-004, DS-005 (REQ-006, AC-006) | Pair once by invite; every peer request signed (sender, receiver, time, nonce, body hash); body integrity at the gate | `remote-collaboration/settings/peer-pairing-service.ts`, `channel/peer-request-signature.ts`, `channel/peer-client.ts`, `peer-run-observation-client.ts`, `peer-gateway.ts`, `settings/peer-directory.ts`, `peer-store.ts`; gate `preParsing`/`preValidation` body check; GraphQL `createPeerInvite`/`acceptPeerInvite`; web pairing step | Implemented. NAS-20…24/36/38 e2e (single node, fabricated paired peers); NAS-19/20 two-server e2e (RC-03, RC-20) |
| BEH-005 (REQ-005, AC-005) | Phone credential required on every phone request; paired phones keep working | `remote-access/services/phone-credential-verifier.ts`, in-memory `paired-device-service.ts`; phone shell codes `mobileConnectionDiagnostics.ts` | Implemented server-side (NAS-05/08/09/10 e2e). AC-005 phone shell probe under enforcement is API/E2E's |
| BEH-006 (REQ-003, AC-003) | Iframes in the app window keep working with the desktop's credential | Electron `nodeCredentialAttacher.ts` on `session.defaultSession` `onBeforeSendHeaders` (HTTP and WebSocket) | Implemented; Electron specs. Packaged app journey (AC-003) is API/E2E's Electron probe |
| BEH-007 (REQ-007, AC-007) | MCP gateway token always (also on this computer); memory sync source `mhub_` as a gate kind | `src/mcp-gateway/mcp-gateway-token-service.ts`, `mcp-gateway-access.ts`, `api/rest/mcp-gateway-token.ts`, `McpGatewayPanel.vue`; `memory-sync/hub/memory-hub-credential-service.ts` | Implemented. NAS-25 integration; NAS-26 e2e |
| REQ-011 | Every key revocable from the desktop | owner credential revoke (`DELETE /rest/node-access/owner-credentials/:id`, Disconnect, node removal), phones (as before), peers (`removePeerNode`), memory sync credentials; `open-socket-registry.ts` closes sockets | Implemented. NAS-37 e2e (owner, peer, phone) |
| Preserved: autobyteus-290 hold-back | A peer request to a node whose identity waits for its migration answers 503 `NODE_IDENTITY_NOT_MIGRATED`; a source's credential while Memory Sync waits answers 503 `MEMORY_SYNC_NOT_MIGRATED` | `heldBackRefusal` in `node-access-refusal.ts`, used by `PeerRequestSignatureVerifier` and `MemoryHubCredentialService.verify` | Preserved; NV-02, NV-03 built-server e2e pass |
| Preserved (IR-002, CR-001): peers at a company base-path address | A peer reached at `https://gateway.example.com/autobyteus` (a gateway that strips the base path) is accepted | `peerRequestTarget` in `peer-request-signature.ts`: the URL keeps the base path, the signature covers the node route the receiver sees; used by `PeerClient.call` and `openPeerRunObservation`; the verifier unchanged | Preserved; unit cases (signer, client, observation) and the NAS-20 e2e case through a prefix-stripping gateway; both fail without the fix |
| IR-003 (CR-003): `pnpm dev` window WebSockets | The window's `/ws/*` and GraphQL subscription upgrades reach the backend with the development credential | `nuxt.config.ts` Nitro `devProxy` (`ws: true`) instead of `vite.server.proxy` | Fixed; `test:e2e:dev-proxy-websockets` (fails on the old config with 200 + `ECONNRESET`) |
| IR-003 (CR-004): preserved workspace file search | `searchFiles` returns matches through the gate | `graphql-request-context.ts`: abort = request aborted or response closed early | Fixed; unit rule tests; `search-files-through-gate.e2e` (owner and phone; `[]` before) |
| IR-003 (CR-005): preserved autobyteus-290 Memory Sync card text | Held-back settings query answers HTTP 200 with the reason | `MemorySyncNotMigratedError` without `statusCode` | Fixed; `memory-sync-held-back-graphql.e2e` (503 before); NV-03 asserts 200 |
| Preserved: AC-102 identity mismatch | A peer address that now reaches another node is reported as identity mismatch | `peer-client.ts`: a 401 is read as unpaired only when the address still answers with the peer's node ID | Preserved; unit NAS-36 case; RC-16 two-server |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server gate and permissions: `autobyteus-server-ts/src/api/security/{node-access-gate,node-access-plugin,node-route-permissions,open-socket-registry,request-refusal,node-browser-access}.ts`; `src/api/websocket/gated-websocket-route.ts` and every `/ws/*` handler; `src/api/graphql/{index,graphql-request-context}.ts`.
- Node access subsystem (new): `src/node-access/` (domain: client identity, credential secret, refusals, verification contracts, IP networks, admission facts, client address; services: owner credentials, setup codes, local control socket, network admission, credential resolver; store: owner credentials; launch credential intake); `src/node-access-cli.ts`; `src/compositions/node-access-composition.ts`.
- Phones: `src/remote-access/services/{phone-credential-verifier,paired-device-service,remote-access-settings-service,remote-access-pairing-service,node-network-service,client-facing-url-resolver}.ts`.
- Peers: `src/remote-collaboration/{channel,settings}/*`, `remote-collaboration-services.ts`, `compositions/remote-collaboration-composition.ts`, `api/rest/remote.ts`, `api/graphql/types/remote-collaboration-settings.ts`.
- MCP gateway and memory sync: `src/mcp-gateway/*`, `src/memory-sync/hub/memory-hub-credential-service.ts`, `api/rest/{mcp-gateway-token,memory-sync,node-access}.ts`.
- Removed: `api/security/remote-access-route-policy.ts`, `api/websocket/remote-access-websocket-auth.ts`, `remote-access/services/remote-access-auth-service.ts`, `remote-access/domain/remote-access-close-codes.ts`, `memory-sync/hub/memory-hub-auth.ts`, GraphQL `addPeerNode`/`AddPeerNodeInput`, `peerAddressCandidates`, `resolvePeerAddress`.
- Electron: `autobyteus-web/electron/nodeAccess/*` (store, attacher, connect service, IPC, wiring), `server/baseServerManager.ts`, `application/electronApplication.ts`, `nodeAutoUpdate/nodeUpdateClient.ts`, `preload.ts`; `autobyteus-web/shared/nodeAccessTypes.ts`.
- Web: `components/settings/nodes/*` (access notice, row, change dialog pairing step, details), `stores/{nodeAccessStore,remoteCollaborationStore,nodeChangeDialogStore,remoteCollaborationOffersStore}.ts`, `components/tools/McpGatewayPanel.vue`, phone diagnostics, localization, generated GraphQL.
- Dev and launcher: `scripts/development/development-runtime.mjs`, `autobyteus-web/nuxt.config.ts`; `scripts/public/docker/autobyteus-docker.d/{bash,powershell}/*`.
- Tests: `tests/e2e/node-access/node-access-model.e2e.test.ts` (new, 22 cases), `tests/architecture/node-access-boundaries.test.ts` (new), `tests/unit/node-access/*` (new), harnesses `tests/setup/test-launch-credential.ts`, `tests/e2e/helpers/{studio-runtime-test-server,built-server-launch-credential,pair-nodes}.ts`, `test-support/node-access/owner-credential-attachment.mjs`, `test-support/live-e2e/test-runtime-bootstrap.mjs`; updated suites (remote collaboration two-server, node vocabulary, phone, node desktop, MCP, built-server suites).
- Docs: contract §5, `docs/features/remote_access.md`, `docs/modules/mcp_gateway.md`, `docs/design/collaboration_model.md` (CM-12), `docker/README.md`, server `README.md`, `GLOSSARY.md`, `TESTING.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/tools_and_mcp.md`, `docs/future-tickets/mobile-backend-authorization-hardening.md`; ticket `release-notes.md` ("What you need to do").

## Important Assumptions

Deviations from the design's wording, each within the design's intent (reviewer: please confirm):

1. Memory sync source identity is `{ kind: "memory_sync_source", credentialId }` (design: `sourceId`): the gate knows the credential, not the source; the ingestion binds a credential to its source on the first batch, as before. **IR-002 (CR-002): the contract §1 now says so** (accepted by the Code Reviewer as within design intent; Solution Designer: please note the contract change).
2. `/rest/remote/*` is permitted to peers only and `/rest/memory-sync/*` to memory sync sources only (owners not), reading NA-7 strictly: an owner credential is not a peer or a source. **IR-002 (CR-002): NA-7 now states it** ("Owner: every endpoint except the peer routes and the memory sync hub routes"; phones: what owners reach except owner actions).
3. The local control endpoint on Windows is the named pipe `\\.\pipe\autobyteus-node-<sha256(data dir)[0:24]>` (one per data folder). On Unix the socket path length is checked (> 103 bytes refused with "Use a shorter data folder path.").
4. The peer pairing exchange answers `{ nodeId, peerSecret }`; the invite is carried as one text (`abpi_` + base64url JSON `{ nodeId, addressCandidates, inviteCode }`); `acceptPeerInvite(inviteText, name, nameOnInviter?)`. Re-pairing an existing peer row keeps its name and updates its address and secret.
5. `registerGatedWebSocketRoute` lives in `src/api/websocket/gated-websocket-route.ts` (not `websocket/index.ts`), which avoids an import cycle.
6. `autobyteus-docker new-container` prints the new node's setup code (the design said install output); `setup-code` applies the launcher configuration first (M-8a).
7. The GraphQL address-resolution queries the window no longer uses (`peerAddressCandidates`, `resolvePeerAddress`) are removed with `addPeerNode` (pairing resolves addresses itself).
8. An application backend never receives the node credential: the `authorization` header and the `access_token` query are removed before the request reaches it (NAS-18).
9. A `/ws/*` handler's own lifecycle or connect failure closes with 1011 (it closed 4401, which now means "credential").
10. The MCP gateway refusal body carries `code` (`NODE_NETWORK_REFUSED`, `MCP_GATEWAY_TOKEN_REQUIRED`).
11. `pnpm dev`: the window's node is the frontend origin and the dev server's proxy adds the development launch credential; it never reaches `runtimeConfig.public`. **IR-003 (CR-003): the proxy is Nitro `devProxy` (HTTP and WebSocket), not Vite's proxy, which never receives upgrades under Nuxt.**
12. The persisted setup-code file of the design's data section (b) does not exist: M-2 (local control socket, codes only in memory) is authoritative.
13. Phone pairing code refusals (invalid, expired, used) answer 401 instead of 400 (NAS-13; codes unchanged; the phone maps by code).
14. A credential that cannot be checked while its subsystem waits for its autobyteus-290 migration is answered 503 with that subsystem's code (`heldBackRefusal`), preserving the earlier answers; a peer client reads a 401 as "not paired" only when the address still answers with the peer's node ID, otherwise "identity mismatch" (preserves AC-102).
15. The autobyteus-436 PROBE-01 reproduction is folded into the NAS suite: P3 (no credential from an admitted network) is NAS-12. P1/P2 used a phone credential from `100.64.1.2`: refused now only because that address is not admitted on a node without a local Tailscale address; from an admitted network a phone credential still reaches GraphQL and workspace files by design (NA-7; narrowing is slice 2 with autobyteus-436). The probe was not copied verbatim.
16. NAS-31 is checked on the server by the process environment after start and a spawned child's environment (no credential name or value); the terminal journey is the Electron probe's.
17. A Memory Sync source shows the hub gate's refusals of its token in Memory Sync's words ("Memory Hub source token is invalid." / "… was revoked." / "The Memory Hub does not accept connections from this node's network."; `memory-hub-response-parser.ts`), as the hub's own route did before the gate checked the token.
18. `GET /graphql` (the former loopback-only route class, M-10d) is now an ordinary owner-and-phone route behind the credential; GraphiQL pages stay absent.

## Known Risks

- UNK-006 not measured: Docker Desktop publishing on the host's Tailscale address (`-p <tailscale-ip>:<port>:8000`); fallback documented in the design (Tailscale Serve).
- The PowerShell launcher is changed to match bash (publishing, `--allow-local-network`, `setup-code`, v10), but `pwsh` is not installed here: only the shared text-contract test ran; its runtime tests skipped.
- Every existing installation needs the one-time steps in `release-notes.md` (Docker/remote nodes: setup code; peers: Pair again; VPN phones: `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; MCP clients: the token). Old desktops against new nodes are refused (DESIGN rule 9, clean cut).
- The browser and Electron probes under `autobyteus-web/tests/e2e/*.mjs` start nodes without a credential and several pair nodes with the removed `addPeerNode`; they are not updated here (see § API / E2E … Still Required).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (security boundary)
- Reviewed root-cause classification: `Missing Invariant` with a `Boundary Or Ownership Issue` (peer identity outside the gate)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the trusted-network route classes became client-kind permissions; phone verification moved behind the one credential resolver with an in-memory registry; the peer gateway checks the body's `fromNodeId` against the gate's peer identity.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (unpaired peers and unconnected nodes are refused until their one-time step, REQ-010)
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the removal plan's items, the auth context types, the node-desktop re-check and pre-start byte guard, the address-resolution GraphQL queries)
- Dead code found elsewhere, added to `follow-ups.md`: None (FU-001, FU-002 pre-existing, out of scope)
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`ClientIdentity` is a union; verifiers are per kind)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (no file taken over `>500` or grown while already over it by this change; files already over it and not grown added to `follow-ups.md`; `>220` assessed/acted on): `Yes` — see Checks Run IMP-14
- Notes: `src/api/websocket/agent.ts` was rewritten around `registerGatedWebSocketRoute` (large delta, smaller file).

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `PeerStore` reads a row without `peerSecret` as unpaired (`paired: false`) and writes it back without one (`tests/unit/remote-collaboration/peer-store.test.ts`; e2e NAS-23, NAS-37 with such a row present); `owner-credentials.json` keeps unreadable rows with a warning and skips them (`owner-credential-service.test.ts`); `peers.json`, `owner-credentials.json` and `mcp-gateway/token.json` are written with mode 0600.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- No new dependencies. `net.BlockList` (Node built-in) matches CIDR networks.
- Built outputs used by checks (`autobyteus-server-ts/dist`, SDK `dist/`, Brief Studio package) are untracked and not committed.

## Checks Run

All checks ran on macOS (Darwin 25.5), Node 22, pnpm 10, in this worktree, one heavy run at a time; E2E with a clean
environment (`env -i PATH HOME=<temp> TMPDIR`). Each log starts with its command, commit and date. The runner is
`tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-run-checks.sh`. Commits: `0a40191eeb` and `a20632f9af` carry the same code; `4d6a3382d5` adds test-only
fixes; `d20340e5c3` adds the memory-sync wording fix; `d8fbe5082a` the two fixes from the rendered check (rerun as IMP-10, IMP-17…19).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json` | 4d6a3382d5 | shell | server production source | all | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-01-server-typecheck-build.log` | `# Exit status: 0`, no `error TS` |
| IMP-02 | `tsc --noEmit -p tsconfig.tests.json` error count | 4d6a3382d5 | shell | server tests | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-02-server-typecheck-tests.log` | `1182` (the base's count; no new test type error) |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | 0a40191eeb | shell (test isolation) | server unit, app-data-migration and architecture tests | BEH-001…007; AC-002 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-03-server-unit.log` | `Test Files  961 passed | 5 skipped (966)`; `Tests  8183 passed | 9 skipped` |
| IMP-03b | `vitest run tests/unit/memory-sync/memory-sync-hold-back.test.ts` (the one unit file changed after IMP-03) | 4d6a3382d5 | shell | Memory Sync hold-back with the gate | preserved 290 hold-back | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-03b-server-unit-hold-back-rerun.log` | `Tests  6 passed (6)` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:integration` (after `test:integration:prepare`) | 4d6a3382d5 | shell | studio HTTP contract, MCP gateway routes, Agent Tools listener, application backends | BEH-001, BEH-007; NAS-25 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-04-server-integration.log` | `Test Files  89 passed | 20 skipped (109)`; `Tests  517 passed` |
| IMP-05 | `pnpm -C autobyteus-server-ts build` | d20340e5c3 | shell | `dist/app.js`, `dist/node-access-cli.js` | M-2 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-05-server-build.log` | `Sanitized built-module/bootstrap smoke passed` |
| IMP-06 | `vitest run tests/e2e/node-access tests/e2e/remote-access tests/e2e/node-desktop tests/e2e/remote-collaboration/peer-host-refused.e2e.test.ts` | 4d6a3382d5 | clean env | the gate on the real studio server: admission, credentials, permissions, setup codes, peers, revocation, logs | NAS-01…05, 07…14, 15, 17, 20…24, 26, 28, 29, 31…33, 36…38; AC-001, AC-009 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-06-server-e2e-node-access.log` | `Test Files  5 passed (5)`; `Tests  46 passed (46)` |
| IMP-07 | `vitest run tests/e2e/app-data-migrations tests/e2e/memory-sync` + projects, run-history and runtime built-server files (spawn `dist/app.js` with a launch credential) | d20340e5c3 | clean env | built servers under the gate; pairing by invite (NV); 290 hold-back answers; memory sync through the gate | NAS-26; preserved 290 NV-01…03 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-07-built-server-e2e.log` | `Test Files  15 passed | 3 skipped (18)`; `Tests  35 passed | 16 skipped` |
| IMP-08 | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-08-built-cli-setup-code-check.sh`: a built node on a temp data folder; `node dist/node-access-cli.js setup-code`; exchange; replay; node stopped; long path | 4d6a3382d5 | shell, loopback | local control socket, CLI, setup exchange | NAS-03, NAS-13, NAS-32; M-2 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-08-built-cli-setup-code.log` | `srw-------` socket; `Setup code: <code>`; replay `NODE_SETUP_CODE_INVALID`; `code in server output or logs: 0 files`; `longer than the 103 bytes` |
| IMP-09 | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (scripted AGY CLI, two built servers behind capturing proxies, three more for RC-27) | 4d6a3382d5 | clean env | pairing, signed peer requests, gateway, peer client refusals, run observation | NAS-19, NAS-20, NAS-21, NAS-36 (RC-16); AC-006 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-09-two-server-remote-collaboration.log`, `tickets/in-progress/node-universal-authentication-437/evidence/implementation/remote-two-server/` (receipt and server logs) | `Tests  41 passed (41)` |
| IMP-10 | `pnpm -C autobyteus-web typecheck` | d8fbe5082a | shell | web, Electron, shared types | BEH-003, BEH-006 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-10-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-11 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` | d20340e5c3 | shell | Nodes page, pairing, MCP panel, phone diagnostics, stores | BEH-003…005, BEH-007; NAS-02, 13, 19, 23, 25, 30, 35 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-11-web-nuxt-tests.log` | `Test Files  722 passed (722)`; `Tests  5398 passed | 2 skipped` |
| IMP-12 | `pnpm -C autobyteus-web exec vitest run --config ./electron/vitest.config.ts` | d20340e5c3 | shell | credential store, attacher, connect service, IPC, server managers, node update client | BEH-003, BEH-006; NAS-01, 02, 03, 13, 30…33, 35 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-12-web-electron-tests.log` | `Test Files  66 passed | 1 skipped (67)`; `Tests  492 passed` |
| IMP-13 | `guard:web-boundary` and `guard:localization-boundary` | d20340e5c3 | shell | web boundaries, localization keys | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-13-web-guards.log` | `# Exit status: 0` |
| IMP-14 | `python3 -m pytest -q` the five Docker launcher test files | d20340e5c3 | shell (fake docker, fake tailscale) | bash launcher publishing, `--allow-local-network`, `setup-code`, v10; PowerShell text contract | NAS-27, NAS-32, NAS-34; M-8 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-14-launcher-tests.log` | `60 passed, 2 skipped` (the 2 skips need `pwsh`) |
| IMP-15 | `node --test scripts/development/run-dev.test.mjs` | d20340e5c3 | shell | `pnpm dev` launch credential and proxy settings | BEH-003 (dev) | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-15-dev-runtime-test.log` | `# pass 4`, `# fail 0` |
| IMP-16 | `python3 tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-16-source-size-guardrail.py` (changed source files vs the base `b690a5dfdb`) | d20340e5c3 | shell | changed source implementation files | size guardrail | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-16-source-size-guardrail.log` | `build-studio-server.ts | 493 | 500` (none over 500 or grown while over); `agent.ts` `>220-delta` is a rewrite that shrank it (181 → 115) |
| IMP-17 | `vitest run tests/architecture/node-access-boundaries.test.ts --reporter=verbose` (also inside IMP-03) | d8fbe5082a | shell | gated WebSockets, phone routes, gate imports, NAS naming | AC-002; every NAS ID named by a test | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-17-architecture-node-access-boundaries.log` | `Tests  4 passed (4)` |
| IMP-18 | `vitest run tests/unit/node-access tests/unit/memory-sync` | d8fbe5082a | shell | node access services, stores (file mode), resolver, admission, signatures; memory sync hold-back and parser | NAS-01, 03, 11, 13, 20…23, 26, 31, 32, 36 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-18-server-unit-node-access.log` | `Test Files  11 passed (11)`; `Tests  51 passed (51)` |
| IMP-19 | `cross-env NUXT_TEST=true vitest run components/settings/nodes` | d8fbe5082a | shell | Nodes page rows, access notice, pairing dialog | NAS-02, NAS-19, NAS-23 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IMP-19-web-nodes-specs.log` | `Test Files  6 passed (6)`; `Tests  68 passed (68)` |
| UI-00 | Rendered check in an isolated packaged instance (see § Frontend Rendered-Result Check) | d20340e5c3 build | isolated desktop instance, test-owned node | Electron credentials, Nodes page, MCP panel | NAS-01, 02, 03, 25, 33 | Pass (2 defects found and fixed in d8fbe5082a) | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/UI-00-rendered-check.txt`, `tickets/in-progress/node-universal-authentication-437/evidence/implementation/UI-01…06-*.png` | `POST /graphql -> 401`; the notice gone after the code; `owner-credentials.json became []` |
| IR002-01 | `tsc --noEmit -p tsconfig.build.json` | 1e02bea41e | shell | server production source after CR-001 | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR002-01-server-typecheck-build.log` | `# Exit status: 0` |
| IR002-02 | `tsc --noEmit -p tsconfig.tests.json` error count | 1e02bea41e | shell | server tests | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR002-02-server-typecheck-tests.log` | `1182` (base count) |
| IR002-03 | `vitest run tests/unit/node-access tests/unit/remote-collaboration tests/architecture/node-access-boundaries.test.ts` | 1e02bea41e | shell | signer, verifier, peer client, observation client, pairing, gateway | CR-001; NAS-20…23, 36 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR002-03-server-unit-peers.log` | `Test Files  34 passed (34)`; `Tests  206 passed (206)` |
| IR002-04 | `vitest run tests/e2e/node-access` | 1e02bea41e | clean env | the gate; the new case: PeerClient through a prefix-stripping gateway at `/autobyteus` | CR-001; NAS-20 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR002-04-server-e2e-node-access.log` | `Tests  23 passed (23)` |
| IR002-05 | `pnpm -C autobyteus-server-ts build` | 1e02bea41e | shell | `dist/` for the two-server suite | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR002-05-server-build.log` | `Sanitized built-module/bootstrap smoke passed` |
| IR002-06 | two-server remote collaboration e2e (as IMP-09) | 1e02bea41e | clean env | every signed request and run observation between two built nodes after CR-001 | NAS-19, 20, 21, 36; AC-006 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR002-06-two-server-remote-collaboration.log`, `tickets/in-progress/node-universal-authentication-437/evidence/implementation/remote-two-server-ir002/` | `Tests  41 passed (41)` |
| IR003-01 | `tsc --noEmit -p tsconfig.build.json` | 0c755805d3 | shell | server production source | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-01-server-typecheck-build.log` | `# Exit status: 0` |
| IR003-02 | tests typecheck error count | 0c755805d3 | shell | server tests | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-02-server-typecheck-tests.log` | `1182` (base count) |
| IR003-03 | `pnpm -C autobyteus-server-ts test:unit` | 0c755805d3 | shell | all server unit, incl. the abort-signal rule | CR-004 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-03-server-unit.log` | `Test Files  963 passed | 5 skipped`; `Tests  8191 passed` |
| IR003-04 | `pnpm -C autobyteus-server-ts test:integration` | 0c755805d3 | shell | GraphQL and REST through the studio server | CR-004, CR-005 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-04-server-integration.log` | `Test Files  89 passed | 20 skipped`; `Tests  517 passed` |
| IR003-05 | `vitest run tests/e2e/node-access tests/e2e/workspaces …memory-sync-held-back-graphql… …memory-sync-api… tests/e2e/remote-access tests/e2e/node-desktop` | 0c755805d3 | clean env | the gate; `searchFiles` through the gate (owner and phone); held-back settings query; phone and node desktop routes | CR-004 (MSP-08), CR-005 (NVP-05) | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-05-server-e2e-gate-search-memory.log` | `Test Files  11 passed (11)`; `Tests  75 passed (75)` |
| IR003-06 | `pnpm -C autobyteus-server-ts build` | 0c755805d3 | shell | `dist/` | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-06-server-build.log` | `# Exit status: 0` |
| IR003-07 | node vocabulary built-server e2e (NV-03 now asserts HTTP 200) | 0c755805d3 | clean env | held-back Memory Sync on a built node | CR-005 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-07-built-server-node-vocabulary.log` | `Tests  3 passed (3)` |
| IR003-08 | `pnpm -C autobyteus-web test:e2e:dev-proxy-websockets` (starts `run-dev.mjs`: this worktree's development stack, ports 8000/3000) | 0c755805d3 | clean env | `pnpm dev` proxy: real upgrades through the dev frontend | CR-003 (API-15) | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-08-dev-proxy-websockets-probe.log` | `PASS /ws/projects … "status":101`; `connection_ack`; `econnreset":0` (on the old config: `"status":200` and `ECONNRESET`) |
| IR003-09 | `node --test scripts/development/run-dev.test.mjs` | 0c755805d3 | shell | dev runtime | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-09-dev-runtime-test.log` | `# pass 4` |
| IR003-10 | `pnpm -C autobyteus-web typecheck` | 0c755805d3 | shell | web | — | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-10-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IR003-11 | `cross-env NUXT_TEST=true vitest run` (web) | 0c755805d3 | shell | web, incl. the viewer wording | O-2 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-11-web-nuxt-tests.log` | `Test Files  722 passed (722)`; `Tests  5402 passed` |
| IR003-12 | web boundary and localization guards | 0c755805d3 | shell | new localization key | O-2 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-12-web-guards.log` | `[guard:localization-boundary] Passed.` |
| IR003-13 | Docker launcher tests (5 files) | 0c755805d3 | shell | launcher text | O-1 | Pass | `tickets/in-progress/node-universal-authentication-437/evidence/implementation/IR003-13-launcher-tests.log` | `61 passed, 2 skipped` |

- Not run, and why: the browser and Electron probes under `autobyteus-web/tests/e2e/*.mjs` (need updating for credentials and pairing; API/E2E); the Docker probe with a test-owned container (NAS-02/03/27/32…34, UNK-006); the phone shell probe (AC-005); a real second-device network check (AC-008); the PowerShell launcher at runtime (`pwsh` not installed); three built-server suites that only gained the launch credential and are not in IMP-07 (`projects/delegated-copy-project-folder`, `projects/unclean-shutdown-delegated-team-restore`, `shutdown/busy-run-stop-now` with its fixture); live-gated suites (they use `startBuiltTestServer`, which attaches the credential).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the desktop app against its own node (every screen's data under enforcement); Nodes page: a remote node that needs connecting, connect with a setup code, Disconnect; the MCP Gateway panel's token; (pairing dialog and phone diagnostics by specs only).
- Approved UI/UX, interaction, requirement, or design references: design-spec DS-002, DS-003, M-5, M-8b; contract NAS-01, 02, 03, 25, 33; REQ-003, 004, 010.
- Existing design system, shared components, and adjacent product surfaces reviewed: the Nodes page row cells and tone notices (`NodeNoticeIcon`), the MCP panel's existing card layout; the new notice and token block reuse them.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md Rules 1–5: `pnpm --silent isolated-app start --build` (packaged worktree build, own data root and ports), driven with browser-automation in attach-only mode; a test-owned built node on loopback as the remote node; both stopped afterwards.
- States, layouts, viewports, and interactions inspected: app start (chat with the node's agents and models), Nodes page empty and with a remote row, needs connecting, typing a code and Connect, connected, Disconnect, MCP panel with the token masked (Show/Copy/Regenerate present; the token was not revealed). Default window size only.
- Visual or interaction issues found and corrected: (1) a needs-connecting row also showed "Not reachable." from the server version cell (an owner read the node refuses without a key) → the row hides the server cell and notice until connected (`NodeRow.vue`, NodeRow.spec NAS-02 case); (2) the node's `owner-credentials.json` was 0644 → written 0600. Both fixed in `d8fbe5082a`.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: UI-00 (`tickets/in-progress/node-universal-authentication-437/evidence/implementation/UI-00-rendered-check.txt`, `UI-01-app-start.png` … `UI-06-mcp-gateway-token.png`), IMP-19. The fix (1) is verified by the spec, not in a rebuilt app. Not rendered: the pairing dialog (two nodes), the network-refused state (needs a second device), phone screens, the "Pair again" row, dark/zoomed layouts. HTML preview and application iframes (BEH-006) were not opened.

## Downstream Coverage Hints / Suggested Scenarios

- The scenario table is the contract: every NAS ID is named by at least one test (`tests/architecture/node-access-boundaries.test.ts` checks it). Server-checkable scenarios are in `tests/e2e/node-access/node-access-model.e2e.test.ts`; peers end to end in the two-server suite (RC-01, RC-03, RC-19, RC-20, RC-27, RC-35).
- High-value probes still to run: the Electron probe (NAS-01, 16, 17, 18, 30, 35), the Docker probe with a test-owned container (NAS-02, 03, 27, 32, 33, 34; UNK-006), the phone shell probe under enforcement (NAS-05…10; AC-005), and a manual network check of admission from a real second device (AC-008).
- Edge cases worth a look: a desktop Disconnect while a node desktop stream is open; re-pairing a peer that still holds an old secret; Wi-Fi change while running (admission snapshot refresh, DS-007); `--allow-local-network` persisted across `upgrade --all`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The browser/Electron probes in `autobyteus-web/tests/e2e/*.mjs` need node credentials (TESTING.md § Browser probes: the Nuxt dev proxy with `AUTOBYTEUS_DEVELOPMENT_OWNER_CREDENTIAL`, or attach in the browser) and pairing by invite instead of `addPeerNode` (`mobile-shell-probe`, `remote-run-title-probe`, `remote-runs-in-tree-probe`, `remote-nodes-page-probe`, `model-routing-decisions-probe`, `node-vocabulary-probe`, `nodes-docker-address-probe`).
- The phone shell probe (AC-005), the Electron probe (AC-003, NAS-35), the Docker probe (AC-004, NAS-27, UNK-006) and a real-network admission check (AC-008).
- Built-server e2e suites changed only to pass the launch credential (see Checks Run for those not run here).
