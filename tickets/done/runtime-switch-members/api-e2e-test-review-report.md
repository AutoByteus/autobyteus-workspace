# API/E2E Test Review Report — autobyteus-348 (runtime-switch-members)

## Review Meta

- Review Round: 1 (the first successful API/E2E run; the earlier API/E2E run failed and went through failure-origin review CRR-002)
- Trigger: API/E2E validation Pass (API-REV-002), commit `6339fcbdd7`, tested on `d7e63493e7`
- Requirements / Investigation / Solution Revision / Design Spec / Supplement Reviewed As Context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001), `design-spec.md`, `switch-member-record-contract.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`; Implementation Revision Record: `implementation-revision-record.md` (IR-001…003)
- Original Code Review Report: `code-review-report.md` (CRR-004 Pass); Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-005`
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001 Fail, API-REV-002 Pass)
- API/E2E Result: Pass; Final Validation Confidence: 92% (post-repository 88%)
- Prior unresolved test-review findings rechecked: None (first test-review round)
- Project testing guideline(s) applied: `TESTING.md` (test-owned data roots, private HOME and database, gated live suites using the signed-in CLIs, scripted models for the non-live runtimes). No conflict or discrepancy found.
- Supported Product Scenario Basis Confirmed: `Yes`. The triggers are the user's settings save, first message, reload and restart, and the existing activation retry after a failed attempt. Failure injections reproduce established scenarios: a folder where the segment file goes (the real archive step fails), the active file cut back to the marker (the crash window), the server restart. None of them establishes a scenario by itself.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts` (559 lines) | Added (EX-01…05) | AC-002…AC-006, AC-009 members and copies; I-7 | Built server: Org members with a failed native start and a Grok target; a copy with restart and failed start; Team copies woken in opposite orders; a Team default edit with linked members; a Team member's second save and undo | Header lists purpose, cases, gates, command |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts` (316 lines) | Added (LV-01…03) | I-3, I-5, I-7, I-8 with real runtimes | Live Claude Agent SDK ↔ Codex App Server for a Team member, both Org members and a copy | Gated `RUN_RUNTIME_SWITCH_MEMBERS_E2E`, `RUN_CLAUDE_E2E`, `RUN_CODEX_E2E` (copy also `ANTIGRAVITY_CLI_COMMAND`) |
| `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs` (755 lines) | Added (RSM-01…07) | AC-001, 002, 004 in the rendered surface; the Org undo | Real browser → Nuxt dev → built backend | Owned temp root, free ports, sanitized env |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (two waits) | a stopped copy's runtime menu is open by design | wait for the model search instead of the locked-runtime banner | |
| `autobyteus-collaboration-stream-contracts/tests/org-member-pending-runtime-switch.test.mjs` | Added, then rewritten (3 tests) | the approved wire decision (pending switch off the wire) | pins that a wire Org tree is valid without a pending switch and that the strict schema rejects a direct Agent or a mounted-Team Agent that carries it | replaced after CRR-004 |
| `autobyteus-web/package.json` | script `test:e2e:runtime-switch-members` | | entry for the probe | |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case ids EX/LV/RSM with a one-line outcome each; every file header states purpose, gates and the run command |
| Assertions prove approved requirements, not incidental details | Pass | Exact record-id equality for each archived segment (I-7), marker by key and position (I-3), one marker per switch (I-5), previous file byte-identical after a failed attempt, session and pending state in the stored tree after save, undo and retry, rendered row text, no note after Save. Expected values come from the tests' own earlier reads of the previous agent's records, not from the code under test. The contract test now pins the wire decision |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | shared helpers for gql, stream, `talk`, `findDir`, `completeSegments`, `markers`; the live `journey` helper is shared by three placements; the probe's `chooseRuntime`, `openCopyRow`, `startStoppedCopy` |
| Isolation and determinism | Pass | test-owned data root and private HOME/database, scripted models (LM Studio stand-in, scripted Antigravity, recorded Grok), condition-based waits, cleanup in `afterAll`/`finally`. The live suite necessarily uses the real HOME and the signed-in CLIs (TESTING.md) with a synthetic `ls` task; it is gated and says so |
| Large files coherent and navigable | Pass | each file is one surface; no unrelated scenarios mixed |
| No stale, duplicated, disabled-without-reason tests | Pass | skips are documented gates; the stale round-1 contract assertions were removed; the stale locked-runtime waits in the delegated probe were updated |
| Agrees with coverage investigation and execution evidence | Pass | cases and counts match the execution report; mutation checks (X-A…X-D and the reverted adoption guard for RSM-07) are logged with the restored build compared by `cmp` |
| Fixtures exercise an independently established supported scenario | Pass | see the scenario basis |
| Real trigger and real steps | Pass | settings mutation or the real browser Save, WebSocket send or composer message, `getRunProjection`, real server stop/start. Acknowledged simplifications, stated in comments: the crash window is made by cutting the active file back to the marker; the failed archive step by a folder at the segment path |

### Notes on specific changes

- **Contract test replacement (asked in CRR-004):** accepted. It asserts the opposite of round 1 and ties to the server-side boundary proof `agent-org-run-config-wire.test.ts`.
- **`delegated-launch-defaults-probe.mjs`:** the locked-runtime banner wait became "the model search is visible in the menu". The intent changed with the design (a stopped copy's runtime menu is open), and the new wait still proves the menu opened. Accepted.
- **RSM-05** asserts that a Team or Org root's own runtime stays locked in the UI. This matches the design (Assumption: a default's runtime is carried to linked members only through the server API, covered by EX-04).

## Findings

None.

Optional tidy, not a finding: the RSM-06 saved-row match accepts either `Retiring test model` or `rsw-alt-model`; use the one label the row renders when next touched.

## Follow-ups

- Follow-ups this review added: None. FU-C1 and FU-C2 stand (FU-C2 is the pre-existing stale `existing-run-model-config` probe, which still fails its four checks as at the base).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the six listed above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Production code is unchanged between `d7e63493e7` and `6339fcbdd7` (only tests, the probe and ticket documents differ). Residual risks from API/E2E: Grok, Antigravity and the native runtime are scripted (no real accounts); AC-009 rests on the implementation check; a delegated copy's undo is unit-tested only; journal and memory-search reads of a switched member beyond the chat are not shown. Delivery carries these release and docs points: the GraphQL clean cut (`updateStoppedTeamRunSelections`, `selectionPatches`, `runtimeKind` required on every Team, Org and delegated setting), the pending switch is server state and is not on the wire, the switch begins at the member's first message, a Team default's runtime edit switches every linked member at its own first input, and the old stored shapes read unchanged (no migration). Docs to verify against the final code: `GLOSSARY.md`, the server modules `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `run_history.md`, `agent_work_journal.md`, `llm_management.md`; web `settings.md`, `chat.md`, `agent_execution_architecture.md`. The live runs added sessions to the user's Claude and Codex CLI histories (cannot be removed).
