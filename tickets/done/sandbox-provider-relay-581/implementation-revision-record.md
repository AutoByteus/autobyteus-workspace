# Implementation Revision Record: autobyteus-581

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-004 | Code Reviewer, `code-review-report.md` Round 4, CRR-004 (failure origin of API-REV-001) | F-1, F-2 | `Local Fix` | CRR-004, API-REV-001 | Health wait before the setup exchange; run memory bound at the node's memory folder; back to Code Review |
| IR-003 | Code Reviewer, `code-review-report.md`, CRR-002 (Fail) | CR-003 | `Local Fix` | CRR-002 | Caller-header drop list removed; `isLoginTokenRuntimeKind`; back to Code Review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 (Fail) | CR-001, CR-002 | `Local Fix` | SR-008 (DEC-115), CRR-001 | Owner caller removed; DEC-115 implemented, failed live (IMP-12), Codex login token removed as not supported; back to Code Review |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 3 (Pass) | N/A (non-blocking N-3, N-4 applied) | `Initial Baseline` | SR-007, ARCH-REV-003 | Implemented steps 1–8; live API-key sandbox path passes; Codex login token (U-1) fails live, Grok (U-2) unproven; handed to Code Review |

## Revision Entries

### IR-001 — Provider relay through a paired relay node, sandbox nodes, and the public skill

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/sandbox-provider-relay-581/design-review-report.md`, round 3, Pass.
- Triggering finding IDs: N/A. Non-blocking notes applied: N-3 (the skill does not say a sandbox cannot reach the host's other runs; the stale option-A lines in the design spec are ignored, no sandbox route rule exists), N-4 (`role` carried through `PeerNode`/`toPeerNode`, the peer GraphQL type, the web store and the Nodes page row).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: see `implementation-handoff.md`.
- Related solution revision IDs: SR-007.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the approved package.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-007; REQ-001 to REQ-018.
- Implementation delta: the design's Change Sequence steps 1 to 8 (see the handoff's trace and key files).
- Changed files or areas: `autobyteus-ts/src/llm` (endpoint option); `autobyteus-server-ts/src/credential-proxy` (relays, access, settings, local route, peer forwarder, relay-node handler, activity log, login reader, relay offer); `remote-collaboration` (peer relay client, peer role, pairing with role); runtime launches (native, Claude, Codex, ACP for Grok and DeepSeek Harness); sign-in reader and strategies; secret catalog; settings; `sandboxes/` and `agent-tools/sandboxes/`; compositions; Electron release version; web Nodes page label; docs; the public skill in `AutoByteus/autobyteus-skills`.
- Local validation and result: see the handoff's Checks Run.
- Next recipient or routing: `/code_reviewer` (Large / High). U-1 (Codex login token fails live) and U-2 (not proven) are reported in the handoff for the Solution Designer's and the user's decision.
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-002 — CR-001 and DEC-115: Codex login token tried with the account ID, then marked not supported

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/sandbox-provider-relay-581/code-review-report.md`, CRR-001 (Fail, Local Fix); Solution Designer DEC-115 (SR-008).
- Triggering finding IDs: CR-001 (owner caller dead), CR-002 (U-1: finish SR-008/DEC-115 as IR-002).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 (Codex login token failed live, IMP-10).
- Current authoritative result: Codex login token not supported through a relay; everything else as IR-001.
- Related solution revision IDs: SR-008. Related architecture-review revision IDs: ARCH-REV-003. Related code-review revision IDs: CRR-001. API/E2E, delivery: N/A.
- Why recorded: the code reviewer's findings and DEC-115.
- Approved behavior or requirement IDs affected: REQ-004/005 and AC-005 (Codex login token → not supported, DEC-115 fallback, DEC-010 rule); REQ-012 (owner caller, see handoff deviation 10).
- Implementation delta:
  1. CR-001: `SandboxCaller` is the run only (`sandbox-manager.ts`), owner branch and test case removed, `sandboxes.md` updated (`32d6a7ae16`).
  2. DEC-115 as designed plus `openai_base_url` (`a72ab72b1a`, `70eb033f7c`): C1 `AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID`, the relay offer reading it, the account in the placeholder login. The WebSocket flags named in SR-008 are "removed" in Codex 0.171 (IMP-11), so none was passed; `openai_base_url` was needed because Codex sends its model calls straight to `https://chatgpt.com` otherwise.
  3. Live check IMP-12 failed (`workspace backend must use an HTTPS origin without credentials`), so `b2e7e0d3bd` removes the Codex login-token path: `codex_app_server` from the login-token runtimes (C1 refuses it), the OpenAI login-token route and `chatGptPaths`, `RelayCredentialSource.codexLogin`, `RelayCredential.accountId`, `RelayLoginTokenReader.readCodexLogin`, the account ID setting and its description, and the ChatGPT-mode Codex launch (`CODEX_HOME` is no longer touched on a relayed node). Docs and glossary say Codex runs on the API key.
- Changed files or areas: `credential-proxy/provider-relays/{provider-relay-settings,provider-relays,provider-relay-access,provider-relay-proxy-routes}.ts`, `credential-proxy/provider-relay-peer/{relay-offer,relay-login-token-reader,provider-relay-peer-handler}.ts`, `credential-proxy-host.ts`, `runtime-management/codex/client/codex-app-server-launch-config.ts`, `services/server-settings-service.ts`, `sandboxes/sandbox-manager.ts`; their tests; `credential_proxy.md`, `sandboxes.md`, `GLOSSARY.md`.
- Local validation and result: IMP-11, IMP-12 (live), IMP-13 (focused suites, typecheck) — see the handoff.
- Next recipient or routing: `/code_reviewer` (targeted delta review).
- Remaining limitations or risks: U-2 (Grok login token) and the Claude login-token live check still wait for the user (a fresh Grok login; a setup-token in the test vault). The validation image `autobyteus-server:581-local` was built from `70eb033f7c` (before the removal); the removal changes only the relayed Codex launch's login branch and `CODEX_HOME` handling, covered by unit tests, not rerun live.

### IR-003 — CR-003: the caller-header drop list removed

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-002 (targeted delta, Fail).
- Triggering finding IDs: CR-003 (and its optional note).
- Classification: `Local Fix`.
- Prior authoritative result: IR-002. Current authoritative result: IR-002 without the dead drop list.
- Related solution revision IDs: SR-009. Related code-review revision IDs: CRR-002. Others: N/A.
- Why recorded: the drop list served only the removed Codex login-token route.
- Approved behavior or requirement IDs affected: none (no behavior change).
- Implementation delta (`d624f09ce6`): removed `RelayCredentialRoute.dropFromCaller` and its three `[]` values (`provider-relays.ts`), the forwarder's `dropHeaders` and the `drop` parameter of `forwardableRequestHeaders` (`credential-proxy-forwarder.ts`), and their pass-throughs (`provider-relay-peer-handler.ts`, `provider-relay-proxy-routes.ts`); kept `forwardableResponseHeaders`'s `drop` (removes `x-autobyteus-relay-reply`). Optional note applied: `isLoginTokenRuntimeKind` (`provider-relay-settings.ts`) is the one test, used by `routeFor` and the C1 parse. No test built a route with the field.
- Local validation and result: `pnpm -C autobyteus-server-ts typecheck` PASS; `vitest run tests/unit/credential-proxy tests/integration/credential-proxy tests/unit/sandboxes tests/unit/runtime-management/grok tests/unit/agent-execution/backends/deepseek-harness`: `Tests  154 passed` (IMP-14).
- Next recipient or routing: `/code_reviewer`. Outcome: CRR-003 Pass (CR-003 resolved at d624f09ce6); the reviewer routed to `/api_e2e_engineer`.
- Remaining limitations or risks: as IR-002.

### IR-004 — F-1, F-2: sandbox start race and run-memory location

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` Round 4, CRR-004 (failure-origin review of API/E2E `api-e2e-execution-coverage-report.md`, API-REV-001, Fail).
- Triggering finding IDs: F-1, F-2.
- Classification: `Local Fix` (implementation defects). Task size and risk unchanged: Large / High.
- Prior authoritative result: IR-003 (CRR-003 Pass). Current authoritative result: IR-003 plus this fix.
- Related revision IDs: SR-009; CRR-003, CRR-004; API-REV-001; ARCH-REV and DR: N/A.
- Why recorded: F-1 made about one create in four fail (`SANDBOX_START_FAILED … fetch failed`); F-2 left a sandbox's run memory in its data volume, which destroy removes, so `runMemoryFolder` stayed empty.
- Approved behavior or requirement IDs affected: AC-008, QR-001 (F-1); AC-011, REQ-009 (F-2). No change to intended behavior.
- Implementation delta (`7296a698d6`):
  - F-1: `SandboxPairing.connect` (`sandbox-pairing.ts`) asks `GET /rest/health` after the setup code until any HTTP answer comes (5 s per request, 250 ms apart, within the existing start deadline; past it `SANDBOX_START_FAILED`), then exchanges the code once. Waiting on health, not retrying the exchange, so a code is never sent twice.
  - F-2: `sandbox-folders.ts` has `DATA_IN_SANDBOX` and `MEMORY_IN_SANDBOX = <data>/memory` in place of `RUN_MEMORY_IN_SANDBOX`; `SandboxManager.start` binds `runMemoryFolder` there (nested in the data volume) and no longer sets `AUTOBYTEUS_MEMORY_DIR`; the pairing's control-socket path uses `DATA_IN_SANDBOX`.
  - Tests: new `tests/unit/sandboxes/sandbox-pairing.test.ts` (two cases); `sandbox-manager.test.ts` expects the new mount and environment.
  - Docs: `docs/modules/sandboxes.md` steps 4 and 5.
- Folder contents checked: the memory folder holds `agents/`, `episodic/`, `semantic/`, `semantic-global/` and the run-history indexes; node identity, paired devices, peers and memory-sync hub credentials are under `<data-dir>/remote-access`, `remote-collaboration` and `memory-sync`, and nothing resolves `<data-dir>/memory/persistence`.
- Local validation and result: IMP-15 (typecheck PASS; sandboxes, agent-tools and architecture tests: 487 passed); IMP-16 live, 5 fresh sandbox nodes: connect 5/5, each run's `run_metadata.json` on the host under `agents/<runId>`, no container left.
- Next recipient or routing: `/code_reviewer` (targeted: `sandbox-pairing.ts`, the mounts in `sandbox-manager.ts`, their tests); then API/E2E reruns API-L01, API-L02, API-L07, API-L10. Outcome: CRR-005 Pass (F-1, F-2 resolved at 7296a698d6); the reviewer routed to `/api_e2e_engineer`.
- Remaining limitations or risks: as IR-003. Design C8 still names `/home/autobyteus/run-memory` and `AUTOBYTEUS_MEMORY_DIR` (handoff deviation 11; for delivery, with API/E2E's D-1 and D-2).
