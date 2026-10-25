# API/E2E Test Review Report

## Review Meta

- Review Round: 2
- Trigger: API/E2E `Pass` at API-REV-002 after TR-001 fix (`16190e8c2a`); round 1 (CRR-002) failed on TR-001
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001)
- Investigation Notes Reviewed As Context: not reread (unchanged since CRR-001)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002; MP-001, BEH-002)
- Supplemental Task Artifacts Reviewed As Context: none new
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-001 (code unchanged: `git diff 6950a24e1b HEAD -- autobyteus-server-ts/src` is empty)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (`Tests 5 passed (5)`, `evidence/API-07-e2e-reload-repair-RE-01-05.log`; after the fix `evidence/API-07-r2-e2e-reload-repair-TR-001-fix.log`)
- Final Validation Confidence: 97%
- Prior unresolved test-review findings rechecked: TR-001, resolved (`git diff ebb6c8ef88 16190e8c2a`: RE-05 now selects `briefId latestRunId latestBindingStatus lastErrorMessage`)
- Project testing guideline(s) applied: `TESTING.md` (clean `env -i` environment, test-owned data and processes, "stop what you started", assertions first). No conflicts. The test kills only processes its own in-process server spawned, filtered by `ppid === process.pid`
- Supported Product Scenario Basis Confirmed: `Yes`. RE-04 covers MP-001: a worker crash, then a repair (ARCH-REV-002). RE-05 covers BEH-002/REQ-002: pending-event dispatch after reentry, triggered by a real run failure

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts` | Updated (`ebb6c8ef88` +88/−1; `16190e8c2a` 2 lines) | RE-04 → MP-001; RE-05 → BEH-002, REQ-002, AC-005; RE-03 now records `imported` | Reload/repair returning an application to service on the real server | RE-01…03 assertions unchanged |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case name states trigger and outcome. The header lists RE-01…05 and their order dependence |
| Assertions prove approved requirements instead of incidental implementation details | Pass | TR-001 resolved: RE-05's query now selects every field it reads, as the app's UI does. The assertions are strong: RE-04 checks `failed` → repair `ACTIVE` → `stopped` → usable with a new worker pid. RE-05 checks the worker turns `ready` with no application call, so only the resumed drain can start it, and the projected `FAILED` with the runtime-close message. The mutations API-08a and API-08b each fail exactly the intended case |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `status`, `appGraphql`, `childPids`/`workerPids` and `until` are local and each used more than once. `appGraphql` could also serve `expectUsable`'s inline call (cosmetic, not a finding) |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Polling with deadlines and last-value messages. Sign-in state is restored in `finally`. The order dependence is explicit and guarded (`expect(imported).not.toBeNull()`), matching the sibling import e2e. RE-04's immediate `stopped` read is deterministic, because no run or pending event exists at that point |
| Large files remain coherent and navigable | Pass | 233 lines, one surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | — |
| Coverage agrees with the investigation and execution evidence | Pass | API-07 log 5/5; API-08a/b discrimination; the FU-003 overlap is noted in the report |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Crash: real worker process killed (a system event). Repair: documented REST route. Run failure: the run's real runtime process dies |
| Each test enters through its scenario's real trigger and follows the real steps | Pass | GraphQL `reloadApplicationPackage`, REST repair, the app's own GraphQL as its UI calls it; no internal state is mutated |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `application-reload-repair.e2e.test.ts`, RE-05 `readBrief` | The query is `query($briefId: String!) { brief(briefId: $briefId) { briefId } }`, but the waits and final assertion read `latestRunId`, `latestBindingStatus` and `lastErrorMessage`. It passes only because Brief Studio's GraphQL dispatches on the root field name and returns the whole object, ignoring the selection set (`applications/brief-studio/backend-src/graphql/index.ts:11-18,65-67`). That is an incidental detail of the sample app's executor, not the contract. Brief Studio's own UI selects these fields (`frontend-src/generated/graphql-client.js:8-9,21`). The file header says it calls the app "as its UI does". If the app ever honours selection sets, RE-05 times out with a misleading message, though it can never false-pass | Select the fields the test reads: `brief(briefId: $briefId) { briefId latestRunId latestBindingStatus lastErrorMessage }`. Rerun this file | `Local Fix` / `api_e2e_engineer` |

TR-001 status: **Resolved** in round 2 (`16190e8c2a`); rerun 5/5. The optional suggestion was also applied: `childPids` now uses `ps -A -o pid=,ppid=,command=`, the repository's existing form.

## Follow-ups

- Follow-ups this review added: None. FU-006 (added by API/E2E) is outside this review.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts`
- Unresolved finding IDs: None (TR-001 resolved)
- Recommended Recipient: `delivery_engineer`
- Notes: source unchanged since CRR-001 (`git diff 6950a24e1b d41c86baf4 -- autobyteus-server-ts/src` is empty).
