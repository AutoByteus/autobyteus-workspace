# API/E2E Test Review Report — remote-discovery (autobyteus-261)

## Review Meta

- Review Round: 1
- Trigger: API/E2E API-REV-001 Pass. The classification is Medium / High, so a proportional test-code review is required.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-401 … 408)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (§ Agent-Facing Texts)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 … FU-003)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- API/E2E Result: Pass. Two-server runs 2 and 3 passed 29/29. The same-node suites passed 42/43; the one failure is 191's pre-existing FU-003. Real-model runs are in API-30.
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: TESTING.md (clean environment for E2E folders, as in the suite header)
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-401 … 403)

## Changed Durable Test Scope

Commit `f09ebad342`; no source changes since `93dc932920`.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (+254) | AC-401 … 407, DEC-407, REQ-403 | Remote collaboration between real server processes | New cases RC-26 … RC-29. RC-04, RC-19 and RC-20 were updated for the new texts, `target` and the two routes |
| `tests/fixtures/agy-failure-cli.mjs` | Updated (+14) | REQ-406 opt-in, DEC-406 texts | Scripted AGY CLI | `LIST_TOOLS` returns the run's Agent Tools MCP tool list as the agent receives it |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each RC name gives its AC IDs and the outcome; the header lists the 261 cases |
| Assertions prove approved requirements | Pass | AC-402: an exact list compared by address, no `description` field on Plain Helper, the built-in, Org, team-local and app-owned definitions checked against beta's real catalog, the wire body and answer keys, and no writes on either node. AC-401: exact statuses in registration order, the listing reason equal to `delegate_task`'s, and the black-holed bound. AC-404: "turned off" with no captured request. AC-405: N+1 entries. AC-406: exact texts over MCP, `target` present and `targetName` absent |
| Fixtures/helpers reuse meaningful repetition | Pass | `TEXT_261` holds the texts in one place; `toolsOf` and `toolListsIn` follow the existing `calls` pattern; `NodeServer` was generalized to any node name for gamma, delta and epsilon. `listAgentTools` in the fixture repeats `callAgentTool`'s connect lines (small; acceptable in a fixture) |
| Isolation and determinism | Pass | RC-27 removes its extra peers and stops their servers in `finally`, restores the proxy mode in `finally`, and then checks that only beta is still registered. RC-28 restores the switch in `finally`. The 20 s case uses a generous 30 s assertion. RC-27 … RC-29 depend on `ids.scout` from RC-26, which follows the suite's existing sequential pattern. The runs started by RC-26 didn't disturb the later cases (29/29, twice) |
| Large file coherent | Pass | The file is large but covers one surface (two real nodes); the new cases are grouped by ticket |
| No stale/duplicated/compat-only tests | Pass | The old texts were replaced (RC-04, RC-19), not kept alongside the new ones |
| Coverage agrees with investigation/evidence | Pass | Receipt keys RC-26 … 29, RC-04 and RC-20 in `API-run3` match the cases. The RC-28 receipt shows a null `node` → isError with the recovery text |
| Test callers exercise an established scenario | Pass | Discovery goes through an agent's real tool calls over Agent Tools MCP; the scenarios are SCN-401 … 403 |
| Real trigger, no setup real use does not produce | Pass | Peers and switches are changed through the owner's GraphQL; Brief Studio is loaded through its package root; Plain Helper is a file-authored definition, a supported authoring path |

## Findings

None.

Non-blocking notes (no action required):
- RC-28 calls `list_available_agents {node: null}` and records the result without asserting it. The receipt shows the recovery text. The null case is the C-1 hold, not a requirement, so a recorded observation is proportionate. An `expect` would keep it from regressing silently.
- RC-27 checks epsilon's reason only with `toContain(name)`, but the strict equality with `delegate_task`'s text in the same loop already fixes the wording.

## Follow-ups

- Follow-ups this review added: None. FU-003 (claude.ai connectors on Claude-runtime agents) was added by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`, `tests/fixtures/agy-failure-cli.mjs`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The suite now needs `pnpm -C autobyteus-server-ts test:integration:prepare`. `beforeAll` stops early with that command if the package is missing; delivery should keep it in mind for reruns.
  - AC-408 is still the user's desktop ↔ Docker check.
