# API/E2E Test Review Report — autobyteus-32 (Model Router core)

## Review Meta

- Review Round: `1` (first proportional test review; API/E2E round 1 failed, so its durable test code is reviewed here with round 2's)
- Trigger: API/E2E round 2 Pass (`API-REV-002`, commit `bf4dabf99c`; round 1 `64e5b57932`), from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-018), `launch-selection-order.md` (SR-018)
- Investigation Notes Reviewed As Context: via the design spec
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (to SR-018)
- Design Spec Reviewed As Context: `design-spec.md` (SR-018)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX specification (`ce3e417`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `code-review-report.md` (CRR-004 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001 Fail, API-REV-002 Pass)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md` (disposable HOME for E2E; real keys only from the test vault; Rule 9, every failure has its cause). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-007 of `code-review-report.md`; SCN-008 withdrawn by SR-018)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` | Added (round 1), updated (round 2) | AC-001…AC-004, AC-006, AC-008, AC-009 data, AC-011, AC-012; CR-002, CR-005 | Model Routing through the real Studio HTTP/GraphQL/WebSocket server, Agent Tools MCP, the real usability check and the node's real router run on a scripted CLI | MR-01…09; round 2: MR-09 asserts recovery after a crash, a failed turn and a router-launch round trip |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (round 1) | MR-*, MRD-*, RC-39…41 | Scripted AGY router: valid, invalid-then-valid, silent, crash, throw, delay; calls the real `submit_launch_choices` | — |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (round 1) | AC-005, REQ-009, REQ-012, QR-001 | Two real servers: peer contract and refusals | RC-39…41 added; 12 existing cases updated to the clean-cut contract (`task`, `launches`, the routing state in refusals, the 50 s start bound) |
| `autobyteus-server-ts/tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | Updated (round 1) | REQ-008, AC-008 | Internal agents hidden or shown | IA-01 names exactly which internal agents are added |
| `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-live-agents.e2e.test.ts` | Added by the 303 fold (`bd8948ef14`, `33da12b821`, `75ca9c82ff`), updated (rounds 1–2) | 303 AC-001/002/012; autobyteus-32 QR-001 (LR-3) | Live agent on each real runtime using the runtimes tool; LR-3 routed delegation within the tool-call time-outs | Gated per runtime; test-vault keys |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` + `autobyteus-web/package.json` (`test:e2e:model-routing-decisions`) | Added (round 2) | AC-009, AC-012, UXJ-008 / VIS-011 | Real-stack page probe: two disposable nodes, Nuxt, headless Chrome, real routed and remote data | MRD-01…07 |

- No durable test file changed: `No`
- Unit tests changed by implementation (`model-router-agent`, `model-router`, `model-router-tools`, the Claude client test reverted to base) were reviewed in source review (CRR-004), not here.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs with their criteria in each title; file headers list the cases, the scripted dependencies and the exact command |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact result-note wording and refusal texts (supplement §§ 5–7); one request per turn in arrival order and "busy" for a request never sent (AC-006); MR-09: the failing request's own reason, then the router's choice within 30 s (CR-005); beta's record with `fromNode` and a null run and name, none on alpha (RC-40, CR-001); the page equals the data row by row (MRD) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | One scripted AGY router reused by MR, RC and MRD; existing server and WebSocket helpers |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Disposable HOME and data roots; outside network refused; the probe removes its owned processes and temp root. MR-09 was rerun solo (three passes) after one time-out under parallel load, consistent with TESTING.md |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Each file covers one surface; the two-server file keeps its RC numbering |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The 12 updated two-server cases follow the clean-cut peer contract and are not weakened. Exact-equality checks gain `launches`; the start-path bound moves to 55 s for the 50 s start bound while the message keeps 30 s; refusals gain the § 6 suffix. Suites skip only through their documented env gates |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The execution report's Cases and AC proof name these files and lines |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case maps to SCN-001…SCN-007; only external CLIs are scripted, and the router is a real agent run |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Real `delegate_task` calls from agent runs; settings, keys and definitions through public GraphQL; the page by click; peers registered through the product's API |

Non-blocking notes (no finding):

- MR-06 uses the host's real `claude` CLI, signed out in the disposable HOME, to produce `SIGNED_OUT`. The file header states this prerequisite, and the suite is opt-in (`RUN_AGY_FAILURE_E2E`). On a host without `claude` the case would see `RUNTIME_UNAVAILABLE`. Switching to the scripted fake CLI would remove that host dependency if the file is touched again.
- The live-agents file needs the real HOME for signed-in CLIs, which is documented and gated per runtime (TESTING.md's known gap for agy history).

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-007…FU-009 (pre-existing, reproduced on base) stay out of scope.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the six above (plus the package script)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Done-when: the user's own desktop check is required and prepared in `evidence/api-e2e/API-15-desktop/API-15-user-desktop-check.md` (the packaged build is in `autobyteus-web/electron-dist`, untracked).
  - For Product: the new `SIGNED_OUT` page text (CR-002), and API/E2E's presentation observations (copies named by address; Decisions shows the model ID where Settings rows show the display name).
