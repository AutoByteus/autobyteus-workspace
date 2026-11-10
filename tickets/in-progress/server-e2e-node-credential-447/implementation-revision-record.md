# Implementation Revision Record — server-e2e-node-credential-447

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-SR-001.md`, initial | N/A | `Initial Baseline` | SR-001 | D1…D9 implemented; the 15 files and the full server E2E suite green; Medium/Low confirmed |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (failure origin of API/E2E API-11, API-REV-001) | CR-001, CR-002 | `Local Fix` | SR-001, API-REV-001, CRR-001 | Gated Codex native policy fixture child attaches its own launch credential; TESTING.md sentence; Medium/Low unchanged |

## Revision Entries

### IR-001 — Server E2E files present the node credential and the MCP gateway token; attachment from process start; guard and testing rules

- Triggering role, report path, and round: Solution Designer, `handoff-SR-001.md` (Architecture Design Complete, SR-001), initial round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete, `task_size=Medium`, `architectural_risk=Low` confirmed; direct API/E2E route.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation of the design.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-004 (changed); BEH-003, BEH-005 (preserved); REQ-001…REQ-008.
- Implementation delta: D1 attachment installed from the server test setup (`installOwnerCredentialAttachment` exported); D2 `startStudioE2eRuntimeServer(host, { loggingConfig })` used by the two runtime GraphQL suites; D3 owner header on `inject` in two files; D4 `connectMcpGatewayClient` used at 7 call sites in 5 files; D5 `builtServerLaunchEnvironment()` in the node-locality fixture child; D6 guard `tests/architecture/e2e-node-credential-paths.test.ts`; D7/D8 TESTING.md (own commit); D9 design case 2 note.
- Changed files or areas: `test-support/node-access/owner-credential-attachment.{mjs,d.mts}`, `autobyteus-server-ts/tests/setup/test-launch-credential.ts`, `autobyteus-server-ts/tests/e2e/helpers/{studio-runtime-test-server.ts, mcp-gateway-client.ts (new)}`, 10 e2e files, `autobyteus-server-ts/tests/architecture/e2e-node-credential-paths.test.ts` (new), `TESTING.md`, `docs/design-cases.md`. Commits `a20e7a822f`, `9721caf187`.
- Local validation and result: see `implementation-handoff.md` Checks Run (IMP-01…IMP-07).
- Next recipient or routing: per `get_handoff_rules` (Medium/Low → direct API/E2E).
- Remaining limitations or risks: a raw `inject` without a header or a spawned node without its launch credential is not detected statically (design Non-Goal; TESTING.md names both). Paid live-provider suites not run (Non-Goal).

### IR-002 — Gated Codex native policy fixture child attaches its launch credential (CRR-001 CR-001, CR-002)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, failure-origin review of API/E2E round 1 `api-e2e-execution-coverage-report.md` API-REV-001, case API-11).
- Triggering finding IDs: CR-001, CR-002
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (implementation complete; API-11 failed: 401 `NODE_CREDENTIAL_REQUIRED` at the fixture child's first `createAgentDefinition`).
- Current authoritative result: the fixture child carries the credential; API-11 rerun passes the node's gate and stops at the stand-in Codex binary, as expected (IMP-11).
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the REQ-003 census missed a fixture child that is itself the node's client; D5's parent-side attachment does not reach the child's own requests.
- Approved behavior or requirement IDs affected: REQ-003, BEH-002 (D5's shape extended to this fixture); REQ-007 (TESTING.md).
- Implementation delta: `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` adds `...builtServerLaunchEnvironment()` to the child's env. `tests/fixtures/codex-native-multi-agent-system.mjs` reads `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL` right after its static imports, before importing `dist/compositions/build-studio-server.js` (whose intake deletes it), and calls `attachOwnerCredentialToLoopback`. A missing credential fails with a message on stderr and in the receipt, never the value. TESTING.md "Node credentials" gets one sentence for fixture children that call their node (own `docs(testing)` commit).
- Changed files or areas: the two files above (commit `63dc98b054`); `TESTING.md` (commit `44ee19f3b8`).
- Local validation and result: IMP-11 (API-11 command, stand-in Codex: past "owned built Studio ready" and Team creation, stops at "Timeout: production Codex thread after user command"; 0 `NODE_CREDENTIAL_REQUIRED`; 0 `own_`), IMP-11b (missing credential → clear message, exit 1), IMP-12 (guard 4/4, server typecheck at baseline).
- Next recipient or routing: per `get_handoff_rules` (Medium/Low direct-route Local Fix → API/E2E).
- Remaining limitations or risks: the real Codex run of this suite is not run (user direction: Codex limit; paid live suite, Non-Goal). The guard does not read `tests/fixtures/` (CRR-001 C-03, rejected). The design's file mapping omits these two files (non-blocking note for the Solution Designer).
