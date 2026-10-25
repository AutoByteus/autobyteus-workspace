# API/E2E Test Review Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Review Meta

- Review Round: `1` (first proportional test-code review; API/E2E round 1 failed, so its durable test code is reviewed here together with round 2's)
- Trigger: API/E2E round 2 Pass (API-REV-002, commit `cc789b7c84`), from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006)
- Investigation Notes Reviewed As Context: via the design spec
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `autobyteus-server-ts/tests/fixtures/usage-limits/` (the recorded answers the fixtures serve)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-008)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-004)
- Original Code Review Report: `code-review-report.md` (CRR-005 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001 Fail, API-REV-002 Pass)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md`.
  - Conflict, recorded per the skill: TESTING.md Rule 9 says a failure whose cause is in a test is fixed in the same branch as a labelled baseline fix. The API/E2E engineer instead recorded the Agent Runtimes settings probe's stale stub and locale reset (identical on base `a2faf424d6`) as follow-up FU-002.
  - The code-reviewer skill's Ticket Scope rule makes an unrelated pre-existing problem a follow-up. The skill is followed (CRR-003 confirmed FU-002 out of scope), and the conflict is recorded here for the user.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-006 in `code-review-report.md`)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` | Added (round 1), Updated (round 2) | SCN-001…006; AC-001…009, 011…013 | The node's report through a real studio server, real child processes and protocols, and a real Codex run's Agent Tools MCP session | AAR-01…06; round 2: LM Studio and a custom endpoint on switchable fake hosts, AAR-04 asserts AC-013 strictly, new AAR-06, custom key in AAR-05 |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | Updated (round 1) | SCN-001, SCN-004 | Scripted codex/claude/agy/grok speaking each wire protocol with the recorded answers, plus hang/fail switches and call logs | Unchanged in round 2 |
| `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs` | Added (round 1), Updated (round 2) | SCN-003, SCN-005, SCN-006; AC-010, REQ-007 UI states, REQ-008 | Real stack page probe (two nodes, Nuxt, headless Chrome): page equals the node's answer row by row, all states, zh-CN, remote node, secret scan | Round 2: custom endpoint down plus LM Studio up in MRP-02; models-unknown in `assertPageMatches`; MRP-07 allows the two model-list URLs |
| `autobyteus-web/tests/e2e/fixtures/model-routing-provider-usage.mjs` | Added (round 1) | SCN-003 | `--import` fetch stub answering outside URLs from a file the probe rewrites; records requests without headers | Unchanged in round 2 |
| `autobyteus-web/package.json` (`test:e2e:model-routing-settings`) | Updated (round 1) | — | Script entry for the probe | — |

- No durable test file changed: `No`
- Unit and component tests changed by the implementation are part of the source review (CRR-004/005), not this review.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs (AAR-01…06, MRP-01…07) with the criteria in each title; the file header lists every case and the offline setup |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact answer values from the recorded fixtures (AC-003…007); only control frames reach the Claude CLI (AC-005); one `checkedAt` and Codex read for every concurrent caller (AC-013); hung pids gone and the next read works (AC-011); page rows equal the GraphQL answer; secret scans over responses, logs, output and data files (REQ-008) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared `agent-runtimes-e2e-harness.js`, `resetCliState`, `installProviderStub`, `read`/`byRuntime`; the fake CLI serves the same recorded fixtures as the unit tests |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Clean `env -i` temp HOME, own server and data root, every outside URL refused; timing bounds follow the fixed caps (AAR-03 ≥ 13 s and < 20 s); 3 consecutive passes (API-REV-002). Cases share one server and run in order: AAR-05's scan collects every earlier response, which is why it is placed last |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | ~530 lines each, one surface each (server answer + MCP; the page) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Round-1 expectations updated to SR-006/007 behavior (O-1 rounding, service wording); nothing skipped |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Cases match the execution report's Cases table and AC proof; evidence `API-01-06-r2-server-e2e-excerpt.log`, `API-07-r2-model-routing-probe/` |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to SCN-001…006 from the requirements; fakes emulate dependencies and are listed under "Dependencies Mocked Or Emulated" |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | GraphQL over HTTP, a real Codex run with its MCP session, the Settings page by click; keys and the custom endpoint are created through the public GraphQL API. Hang/fail switches stand in for slow or failing CLIs (SCN-004, a supported explicit edge) |

Non-blocking notes (no finding; optional if the files are touched again):

- `model-routing-settings-probe.mjs`, `createNode` env: two consecutive comments say the same thing about LM Studio ("Ollama never answers; LM Studio only while the probe switches it on." / "LM Studio is answered by the provider stub only while the probe lists its URL").
- `model-routing-provider-usage.mjs` header: it still describes the stub as answering "the AutoByteus providers' usage endpoints". Since round 2 it also answers the LM Studio and custom-endpoint model lists (the mechanism is already generic).
- AAR-04: `appServersStarted <= 1` is looser than its message ("starts Codex's app-server once"). The shared read itself is proven by the single `checkedAt`, so proof is not weakened.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-002, from API/E2E, stays out of scope).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the five above
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Only the user can check: AC-010 in the user's own desktop and Docker node windows; the meaning of Grok's used percentage once Grok reports one (AC-006, UNK-001); signed-in CLI reads on a Docker node (ASM-001).
  - Residual risks: FU-003, FU-005, RSK-001.
