# Implementation Revision Record — node-universal-authentication-437 (autobyteus-437)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-003 (pass) | N/A | `Initial Baseline` | SR-006, ARCH-REV-003 | Slice 1 "no key, no access" implemented; ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 (Fail, Local Fix) | CR-001, CR-002 | `Local Fix` | SR-006, ARCH-REV-003, CRR-001 | Peers at a gateway base path work again; contract text matches the code; back to code review |
| IR-003 | Code Reviewer failure-origin review, `code-review-report.md` § Round 3, CRR-003 (from API-REV-001) | CR-003, CR-004, CR-005, O-1, O-2 | `Local Fix` | SR-006, ARCH-REV-003, CRR-003, API-REV-001 | `pnpm dev` WebSockets, file search, held-back Memory Sync card fixed; two wording items; back to code review |

## Revision Entries

### IR-001 — Slice 1: every request to a node needs a credential

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/node-universal-authentication-437/design-review-report.md`, ARCH-REV-003 (Pass).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of design-spec SR-006 (Round 2 mechanisms M-1…M-10, change sequence steps 1–8) and the contract `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, NAS-01…NAS-38); handed to Code Review.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-007; REQ-001…REQ-011; AC-001…AC-009; DS-001…DS-007; NA-1…NA-15.
- Implementation delta: the server's node access gate (network admission, one credential, route permission by client kind) replacing the trusted-network route policy; launch credential intake; owner credentials and setup codes (local control socket and CLI); gated WebSockets and the open-socket registry; phone, memory sync and peer verifiers; peer pairing by invite and signed peer requests; MCP gateway token always required; Electron credential store, attacher and connect/disconnect; Nodes page, pairing and MCP panel UI; dev runtime and Vite proxy; Docker launcher publishing and `setup-code` (bash and PowerShell); test harness credentials; e2e, unit and architecture tests; docs, glossary, TESTING.md and the contract's §5.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas; commits `9765d0dad8` (server), `54d98f0152` (desktop and web), `2a8e25f052` (launcher), `a20632f9af` (node access e2e, built-server suites, fixes), `70c523cf62` (TESTING.md), `0a40191eeb` (docs), `4d6a3382d5` (integration contracts), `d20340e5c3` (Memory Sync wording), `d8fbe5082a` (rendered-check fixes).
- Local validation and result: see `implementation-handoff.md` § Checks Run.
- Next recipient or routing: Code Reviewer (Large / High route).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks and § API / E2E … Still Required.

### IR-002 — Signed path is the node route (CR-001); contract text matches the code (CR-002)

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/node-universal-authentication-437/code-review-report.md`, CRR-001 (Fail, Local Fix).
- Triggering finding IDs: CR-001, CR-002
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (HEAD `60d0b0d859`)
- Current authoritative result: CR-001 and CR-002 fixed; task_size Large and architectural_risk High unchanged.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: CRR-001 requested two bounded fixes before API/E2E.
- Approved behavior or requirement IDs affected: BEH-004, REQ-006, NA-9 (preserved: peers at a company base-path address); NA-7 and §1 wording (CR-002).
- Implementation delta: `peerRequestTarget(baseUrl, routePath)` in `peer-request-signature.ts` builds the request URL from the peer's base URL and returns the node route with its query as the signed path (the base path is never signed); `PeerClient.call` and `openPeerRunObservation` use it. One rule on both sides; the verifier is unchanged (it verifies the path it receives). Contract §1 names the memory sync source identity by its credential ID; NA-7 states that owners do not use `/rest/remote/*` and the memory sync hub routes, and phones reach what owners reach except owner actions; NA-9 and CM-12 name the node route as the signed path.
- Changed files or areas: `src/remote-collaboration/channel/{peer-request-signature,peer-client,peer-run-observation-client}.ts`; tests `tests/unit/node-access/peer-request-signature.test.ts`, `tests/unit/remote-collaboration/{peer-client,peer-run-views-client}.test.ts`, `tests/e2e/node-access/node-access-model.e2e.test.ts` (a peer behind a prefix-stripping gateway); docs `docs/design/node_access_model.md`, `docs/design/collaboration_model.md`. Commits `dfa41de41c`, `1e02bea41e`.
- Local validation and result: the new unit and e2e cases fail on the old signing (the e2e answers `PEER_NOT_PAIRED`, the reported symptom) and pass with the fix; IR002-01…06 in `implementation-handoff.md` § Checks Run.
- Next recipient or routing: Code Reviewer (targeted delta review), then API/E2E.
- Remaining limitations or risks: unchanged from IR-001 (UNK-006, Linux Docker, pwsh and the Windows pipe not run, web probes still use `addPeerNode`).

### IR-003 — dev WebSockets (CR-003), file search abort (CR-004), held-back Memory Sync 200 (CR-005), wording (O-1, O-2)

- Triggering role, report path, and round: Code Reviewer failure-origin review of API-REV-001, `tickets/in-progress/node-universal-authentication-437/code-review-report.md` § API/E2E Failure-Origin Review (Round 3), CRR-003 (Fail, Local Fix).
- Triggering finding IDs: CR-003 (API-15), CR-004 (API-03 MSP-08), CR-005 (API-08 NVP-05), O-1, O-2
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (CRR-002 Pass; API-REV-001 Fail)
- Current authoritative result: the three API/E2E failures fixed at their cause; O-1 and O-2 done; task_size Large and architectural_risk High unchanged.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: CRR-003 traced API-REV-001's failures to this change.
- Approved behavior or requirement IDs affected: BEH-003 (`pnpm dev`, design assumption 11), preserved file search (MSP-08), preserved autobyteus-290 Memory Sync hold-back text (NVP-05), launcher text (M-8), NA-11 wording on the node desktop viewer.
- Implementation delta:
  - CR-003: `autobyteus-web/nuxt.config.ts` moves the dev proxy from `vite.server.proxy` to Nitro `devProxy` (`/graphql` and `/ws` with `ws: true`, `/rest`), which Nuxt's dev server hands upgrades to; each rule targets the backend route prefix (Nitro strips the matched prefix) and adds the development credential, which stays in the dev server process (not `runtimeConfig.public`). New probe `autobyteus-web/tests/e2e/dev-proxy-websockets-probe.mjs` (`test:e2e:dev-proxy-websockets`) performs real upgrades through the dev frontend.
  - CR-004: `src/api/graphql/graphql-request-context.ts`: the abort signal is aborted at creation only when the request aborted or the response is destroyed; a request whose body stream ended (read by a body hook) is not an abort. The peer body hooks stay as they are (they return early for non-peers).
  - CR-005: `MemorySyncNotMigratedError` no longer has `statusCode`; the hub route and `heldBackRefusal` map it explicitly (no other reader of the property).
  - O-1: the launcher's "Next step" text (bash and PowerShell) names connecting with a setup code.
  - O-2: `viewerStateForClose` reads 4403 `NODE_CREDENTIAL_REVOKED` as "This desktop is not connected to this node. Connect it on the Nodes page." (en, zh-CN); other refusals keep "not allowed" (phones are revoked with their own code).
- Changed files or areas: as above; tests `tests/unit/api/graphql/graphql-request-context.test.ts`, `tests/e2e/workspaces/search-files-through-gate.e2e.test.ts`, `tests/e2e/memory-sync/memory-sync-held-back-graphql.e2e.test.ts`, NV-03 status assertion, `utils/__tests__/nodeDesktopClient.spec.ts`. Commits `75f1b6300e`, `eae14ea940`, `8914f21745`, `0c755805d3`.
- Local validation and result: each new check fails on the old code with the reported symptom (probe: `/ws/projects` 200 from Nuxt and `ECONNRESET`; search: `[]`; held-back query: 503) and passes now; IR003-01…13 in `implementation-handoff.md` § Checks Run.
- Next recipient or routing: Code Reviewer (targeted review of CR-003…005), then API/E2E reruns API-15, MSP-08, NVP-05.
- Remaining limitations or risks: unchanged (UNK-006, Linux Docker, pwsh and the Windows pipe, web probes using `addPeerNode`).
