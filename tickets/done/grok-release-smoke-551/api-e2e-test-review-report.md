# API/E2E Test Review Report — grok-release-smoke-551

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass, API-REV-001 (SR-001…SR-003 / IR-001 / CRR-001). Branch `codex/grok-release-smoke-551` @ `e94e6187db`; test commit `83488cecb9`; product code unchanged since `5054f97a17`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-001, AC-002; DEC-004, DEC-006 / SR-003)
- Investigation Notes Reviewed As Context: N/A — no change bearing on the test
- Solution Revision Record Reviewed As Context: SR-003 (DEC-006, the AC-006 evidence decision; it does not affect the reviewed test)
- Design Spec Reviewed As Context: `design-spec.md` SR-002 (DS-001, DS-002; "do not add a production parameter only tests use")
- Supplemental Task Artifacts Reviewed As Context: None
- Architecture Review Revision Record Reviewed As Context: N/A — unchanged
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass.
  - API-01: replay file 11/11.
  - API-02: Grok compaction 3/3; DeepSeek scripted 6/6.
  - API-03: typechecks at baseline.
  - API-04: two release smokes, exit 0, 13/13; the AC-003 stale case was caught live in run 1.
  - API-05: trust-list hash unchanged.
- Final Validation Confidence: 95.5%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: root `TESTING.md` (Rule 6, assertions first; Rule 9, a failure needs its cause: the two earlier attempts are kept with their causes). No conflict.
- Supported Product Scenario Basis Confirmed: `Yes`.
  - SCN-001: a catalog read while Grok starts slowly (AC-001).
  - SCN-002: a run start while Grok starts slowly (AC-002).
  - The 35 s answer matches the worst start-up seen (34.6 s, beta.3).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` (slow-`initialize` case) | Updated (one case added) | SCN-001, SCN-002 / REQ-001, AC-001, AC-002 | The Grok runtime over GraphQL/WebSocket against the recorded ACP replay | Reuses `readFixture`, `writeFixture`, `overrideEnv`, `createGrokRun`, `openAgentSocket` and `waitFor`, plus the fake agent's existing `pause` row. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The name states the delay, both outcomes and the AC IDs. The comment explains why 35 s sits between the old and new bounds. |
| Assertions prove approved requirements instead of incidental details | Pass | AC-001: the GraphQL catalog returns `["grok-4.7"]` and takes ≥ 35 s, which proves it waited rather than reading a cache. On failure, the sources' state and message are printed. AC-002: `createAgentRun` succeeds after ≥ 35 s, a turn completes, and no ERROR appears. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | The fixture is the recorded `prompt` replay with one inserted pause row; no new helper. |
| Isolation and determinism appropriate for the boundary | Pass | Real time is required: child processes over stdio cannot use fake timers here. The ≥ 35 s lower bounds are deterministic, and the 300 s timeout leaves margin. The env is restored in `finally` (`overrideEnv`'s restore is idempotent, so the early call plus the `finally` call is safe). Grok's real log was untouched (byte count before = after). |
| Large files coherent and navigable | Pass | Same surface as the file's other cases. |
| No stale/duplicated/disabled/compat-only tests | Pass | The two failed attempts are kept as evidence logs only, not as durable tests. |
| Coverage agrees with investigation and execution evidence | Pass | API-01 passes 11/11. Negative controls with the base source: the catalog read fails at 15.45 s ("model discovery timed out", `negative-control-base-source.log`), and run creation fails at 30.2 s with `ACP_REQUEST_TIMEOUT: initialize` (`attempt2-negative-control-base-source.log`, same create path). |
| Fixtures exercise an established supported scenario | Pass | The order is the recorded Grok session; the pause stands for Grok's measured slow start-up step (P3). No production parameter was added for the test, as the design requires. |
| Enters through the real trigger and follows real steps | Pass | Real GraphQL catalog query, real `createAgentRun` mutation, real WebSocket message, and the fake Grok CLI over real ACP stdio. |

## Findings

None.

Non-actionable notes:
- The `initialize` count > 0 assertion on the run's record is weaker than its comment suggests: any run records `initialize`. The `createMs ≥ 35 s` assertion is what proves the late answer was awaited, so the requirement is still proven.
- The case adds about 70 s of wall time to the replay file. That is proportionate for a real-time start-up bound and inside the 300 s timeout.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: the case proves AC-001 and AC-002 end to end through the real API surfaces, and the base-source controls fail at the old 15 s and 30 s bounds.
