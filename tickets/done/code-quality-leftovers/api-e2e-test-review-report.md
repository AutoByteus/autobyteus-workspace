# API/E2E Test Review Report — code-quality-leftovers (autobyteus-357)

## Review Meta

- Review Round: 1
- Trigger: API-REV-001 `Pass` from the API/E2E engineer
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-004)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` on code `534ad1f55e`; test commits `e2c1b604d7`, `8e011a01bd`, `75f2fffe57`
- Final Validation Confidence: 95.3%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline applied: root `TESTING.md`, mainly rule 9 (fix every failure after finding its cause, label it a baseline fix, and name the test and cause) and the gates. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts` | Updated (baseline fix `e2c1b604d7`) | Org start refuses an invalid launch configuration (preserved behavior) | Scoped Org history over real HTTP | `unsupported_setting: true` stopped being refusable at `47f44c3df6` (undeclared keys are now left out). The fix uses an invalid value of a declared setting, as the sibling `stopped-org-workspace-graphql` does. |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Updated (baseline fix `8e011a01bd`) | Depends-on picker keyboard behavior (preserved) | Projects browser probe | Since `cba9eca3ef`, the first active option is the first choosable one. The probe now asserts that, rather than "Enter on a loop option adds nothing", a state that can no longer be reached. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Updated (baseline fix `75f2fffe57`) | Token usage on a real local runtime turn (API-04, the 54.1/54.2 request path) | Real-runtime token usage | The LM Studio case expects `local_no_api_bill`, the local pricing policy. Paid runtimes keep their list. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each fix adds a one-line comment with the governing commit and rule |
| Assertions prove approved requirements instead of incidental details | Pass | A refused start (`success: false`) with the tree bytes unchanged; the picker's first active option is choosable; the cost status follows the runtime's pricing policy |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | The Org fix reuses the sibling suite's invalid value |
| Isolation and determinism fit the boundary | Pass | Unchanged harnesses. The suites are gated, and LM Studio was loaded and unloaded per run (API-04). |
| Large files stay coherent and navigable | Pass | Only small edits inside coherent suites |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | Each fix removes a stale expectation. The removed Enter-on-loop check covered a state the product no longer reaches. |
| Coverage agrees with the investigation and execution evidence | Pass | API-01 268/269 with the stale case then fixed and passing alone; API-02 17/17; API-04 passes |
| Callers and fixtures exercise an established scenario | Pass | Real GraphQL start, real picker keyboard, real runtime turn |
| Each test enters through its real trigger | Pass | Unchanged triggers; only expectations corrected to current behavior |

Observation, not a finding: the token-usage case picks the local pricing expectation by `spec.id.includes("lmstudio")`. A per-spec expected-status field would read more directly, but with three inline specs the match is unambiguous.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-004, the rotted `RUN_LMSTUDIO_E2E` backend-factory suite, was recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the three listed above.
- Unresolved finding IDs: none.
- Recommended Recipient: `delivery_engineer` (`/software_engineering_team/delivery_engineer`).
- Notes: Large / High, unchanged. Source review: CRR-002 Pass.
