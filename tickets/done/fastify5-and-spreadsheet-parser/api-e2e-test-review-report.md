# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E Engineer, API-REV-001 `Pass`. The proportional review covers 2 changed durable test files (`09baa03b86`, `8e5967e393`); the worktree HEAD is `e036fddae6`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (from the earlier rounds)
- Solution Revision Record Reviewed As Context: via the design spec
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `evidence/API-01-studio-http-contract-test.log`, `evidence/API-03b-phone-access-baseline-fix.log`
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002 (unchanged)
- Implementation Revision Record Reviewed As Context: IR-002 (unchanged)
- Original Code Review Report: `code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline applied: `TESTING.md` (repository root; the coverage investigation records it, and no closer `TESTING*.md` exists). Rule 9 (fix a test-caused failure in the branch rather than closing it as pre-existing) applies to the phone-access change. No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes`. The scenarios are SCN-002/SCN-003 (GraphQL, GraphiQL per DEC-001), SCN-004 (MCP gateway CORS, AC-003), and SCN-001 (trusted-network client per the remote-access policy, AC-004).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts` | Added (`8e5967e393`) | SCN-002/003/004, SCN-001; REQ-002, REQ-004; AC-003, AC-004, AC-005 | The studio server's HTTP contract that the Fastify 5 move must keep: GraphQL served and GraphiQL gone; trusted-network classification of `/graphql`; MCP gateway CORS (gate preflights, foreign-origin rejection, plugin headers) | Base run fails only the 2 GraphiQL cases. Re-adding `{ config: { cors: false } }` fails the plugin-header case. So each assertion group detects the regression it is meant to catch (API-01) |
| `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` | Updated (`09baa03b86`) | SCN-001; AC-002 (the suite must pass with no unexplained failure) | Phone Access REST routes, unchanged responsibility | It adds `configureNodeIdentityCapability(true)` in `beforeEach`. Real startup sets this flag in `src/startup/app-data-capability-readiness.ts` L24 after the app-data migrations; the test builds its own app without that step. The cause was reproduced on base (API-03b) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Four cases named by contract. The header comment states what the file protects and how to run it |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact status codes and the exact `Access-Control-*`/`Vary` header sets are the AC-003 contract ("same `Access-Control-*` headers as base"). GraphiQL is asserted as 404 and not HTML (DEC-001). `GET /graphql` from a trusted-network address asserts `REMOTE_ACCESS_ROUTE_UNSUPPORTED` (the `LOCAL_DEV_ONLY` classification). The base and mutation runs prove the assertions bite |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `startStudioE2eRuntimeServer` and the temp-app-data pattern of the existing listener test. The small local helpers (`http`, `mcpGateway`, `mcpPost`, `corsHeaders`) remove the repetition |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Its own temp app-data dir, a loopback ephemeral port, and `afterAll` closes the server. `fastify.close()` also closes the Agent Tools host (shown by the listener test L120-126). The phone-access flag is module state set per `beforeEach` |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 160 lines, one surface (the studio HTTP contract) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | No overlap with the listener test (which covers listener separation and the wildcard Host gate). Nothing skipped |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Investigation rows API-01 and API-03b; logs API-01 (base 2 failed / 2 passed; branch 4/4; mutation 1 failed) and API-03b (2/2) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each scenario comes from the requirements (SCN-001..004, DEC-001) and the remote-access policy, not from the test |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Loopback cases use real HTTP against the real studio composition. The trusted-network cases use `inject` with `remoteAddress`, which drives the same `onRequest` policy from a non-loopback socket address without needing a LAN interface. API-04 also shows the real LAN-address path live. The phone-access flag reproduces what startup does, so it removes a setup gap rather than adding a setup real use lacks |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. API/E2E's FU-008 (FSTDEP023 deprecation log) is noted. It is outside this test review; the Solution Designer decides whether to fold it in.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts`, `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: no command was rerun. The diff plus API-01/API-03b evidence settle every assertion. The source review (CRR-002) is unchanged: `09baa03b86`..`e036fddae6` touches no implementation source.
