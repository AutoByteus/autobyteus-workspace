# Implementation Revision Record — server-e2e-node-credential-447

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-SR-001.md`, initial | N/A | `Initial Baseline` | SR-001 | D1…D9 implemented; the 15 files and the full server E2E suite green; Medium/Low confirmed |

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
