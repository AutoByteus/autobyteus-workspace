# API/E2E Test Review Report: autobyteus-581

## Review Meta

- Review Round: 1
- Trigger: `/api_e2e_engineer` API-REV-002 **Pass** (code tested `7296a698d6`; documents and evidence `7a76435f8c`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-009: DEC-116, DEC-117; DEC-118 for the AC-005 live check)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (C6 to C8, C4)
- Supplemental Task Artifacts Reviewed As Context: `history-484/sandbox-relay-data-contract.md` (V-7 reader rule)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003
- Implementation Revision Record Reviewed As Context: IR-001 to IR-004
- Original Code Review Report: `code-review-report.md` (latest CRR-005 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass
- Final Validation Confidence: 95%, with no category below 95% (reported by API/E2E)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md`, in particular Gates, Clean environment elsewhere, Node credentials, Sandbox nodes, Data and the Test vault. No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001 to SCN-004 in the requirements; R-A, the lost-record sweep, is the requirements' accepted loss case "Loss of the sandbox list is acceptable: the host-node start sweep also finds sandbox containers by label")

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/sandboxes/sandbox-live.e2e.test.ts` | Added (678 lines; SBX-04 `transcriptsKept` added in round 2) | SCN-001 to SCN-004; AC-001 to AC-004, AC-006 to AC-015; QR-001 to QR-003; R-A, R-B | The sandbox lifecycle end to end from a test-owned built host with real Docker, real tools, real pairing and real relayed provider calls | Gated on `RUN_SANDBOX_LIVE_E2E=1`, `SANDBOX_LIVE_E2E_IMAGE`, the test vault and macOS |
| `autobyteus-server-ts/tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` | Updated (one case) | QR-004, C4 body limit | The two-node relay through the real gate and signing | Mutation-checked by API/E2E |

- No durable test file changed: `No`
- The `probes/api-e2e-*.mjs` files and the API-L10 evaluator journey are temporary evidence, not durable tests, and are not reviewed here.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header maps SBX-01 to SBX-08 to their AC, QR and R IDs. Each `it` names its case and its outcome. The first four cases share one sandbox and say so, and each later case guards with `expect(record, "SBX-01 created the sandbox")`. |
| Assertions prove approved requirements, not incidental details | Pass | The C7 result keys and values, the C8 limits and network (`6 GiB / 4 CPUs / bridge`), the C11 role, C5 keys and lines per relay, `SANDBOX_NOT_YOURS`, the exact limit outcome (`ready: 4, refusals: ["SANDBOX_LIMIT_REACHED"]`), no C5 line after an unpair, removal within 60 s of expiry, and the leak scan's zero hits with lower bounds on what was scanned (`bytes > 1 MB`, `processes > 3`), so an empty scan cannot pass. The QR-004 case asserts the exact body, one C5 line, and a 413 `RELAY_BODY_TOO_LARGE` with nothing sent. One assertion pins a platform rule, the omitted empty `teams` key (line 358 cites the rule); it matches real results, and the C7 and skill text are the doc side (D-2). |
| Fixtures, setup, helpers and data builders reuse meaningful repetition | Pass | `callTool`, `turn`, `createDefinition`, `createRun`, `nativeModel`, `runtimeModel`, `scanCommand`, `scanFolder`, `records`, `activity` and `writePackage` carry every case. The built host comes from `startBuiltTestServer` (TESTING.md node credentials). The setup-code script repeats the source's private constant, which is acceptable for an observer reaching the node's own mechanism. |
| Test isolation and determinism fit the boundary | Pass | An own runtime root, database, HOME and fixtures folder; the vault from `capturedTestVaultSetting`; a failsafe `afterAll` that removes only this host's containers by its label, then its runtime. Live-provider timing (SBX-02) and Docker timing (SBX-06) use generous bounds that match QR-002 and AC-013. Repeated runs: two full runs, 18 of 18 creates. |
| Large files stay coherent and navigable | Pass | One surface (sandbox nodes), sections for secrets, host/GraphQL/tools and fixtures, then the cases in lifecycle order. |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | `describe.skipIf(!READY)` is the documented gate. Minor: the comment at line 171 says the host node ID is "read from its first sandbox's label", but `beforeAll` reads it from `/rest/remote-access/status` (line 331). This is a stale comment, not a test defect. |
| Coverage agrees with the investigation and execution evidence | Pass | The cases match the execution report's Cases and Acceptance-Criteria Proof. Round 2 reran the suite twice on an image from `7296a698d6` (run5, run6). Earlier evidence carried forward has its reason recorded in the investigation's "Round 2 Rerun Plan". |
| Test callers and fixtures exercise an established supported scenario | Pass | Every case reproduces SCN-001 to SCN-004 or a named contract (R-A, R-B, NA-9 via QR-004). None establishes a scenario by itself. |
| Each test enters through its scenario's real trigger without setup real use does not produce | Pass | Sandboxes are created, used and destroyed only through the real tools, called by a run over Agent Tools MCP (the scripted AGY sends `CALL_TOOL:`; the model's choice is not what is under test). Turns go over the agent WebSocket, unpairing through `removePeerNode`, and expiry through `lifetimeMinutes`. SBX-07 removes one record from the stopped host's own `sandboxes.json`: the requirements accept a lost sandbox list as an explicit case, and the file is the test's own data (TESTING.md "Data"). The test's own sandbox credential (`sandboxCredential`) is an observer's access for checks inside the sandbox. It is never printed, and the product path does not depend on it. |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/sandboxes/sandbox-live.e2e.test.ts`, `autobyteus-server-ts/tests/integration/credential-proxy/provider-relay-peer.integration.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `/delivery_engineer`
- Notes: optional tidy-up, the stale comment at `sandbox-live.e2e.test.ts:171`. AC-005 live (the Claude and Grok login tokens) still waits on the user (DEC-118). Doc lines for delivery's sync are listed in the hand-off and in `code-review-report.md`'s Docs-Impact Verdict and rounds 2 to 5.
