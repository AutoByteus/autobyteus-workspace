# API/E2E Test Review Report

## Review Meta

- Review Round: 3 (latest: `Not Applicable`; rounds 1–2 below remain the review of this ticket's durable tests)
- Round 3 trigger: API-REV-003, a rerun by impact on delivery's merged state (`a9d85c0e2d..16eadc93c7`). The delta is ticket documents and evidence only (`git diff --name-only`); API/E2E added, updated or removed no durable test. Reruns: API-09 web typecheck PASS (baseline 99) and API-06 full test:nuxt (703 files passed). The one test change since round 2, the architecture test in `ee6739fe7f`, is implementation-owned and was reviewed in CRR-005.
- Trigger: API-REV-002 (TR-001 fix, `6e1dc44337`); round 1 was API-REV-001, durable tests added and updated in `fddcff0f13..f19c4ad87a`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-004, AC-009, AC-010…AC-014, DEC-020, RSK-004)
- Investigation Notes Reviewed As Context: not needed for this bounded review
- Solution Revision Record Reviewed As Context: SR-004 (via the design spec)
- Design Spec Reviewed As Context: `design-spec.md` (DEC-020 refusal example, `PROVIDER_RELAY_UNAVAILABLE`)
- Supplemental Task Artifacts Reviewed As Context: None
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-002 (no product source changed after `fddcff0f13`, confirmed by `git diff --stat fddcff0f13..f19c4ad87a`)
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-002)
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: TR-001 — resolved (see Findings)
- Project testing guideline(s) applied: `TESTING.md` (clean-environment commands, test vault, Rule 9 baseline fixes, the new Fresh-start build section). No conflict with this skill.
- Supported Product Scenario Basis Confirmed: `Yes`. Note: the AC-009 "key removed later" alternate has no product surface that removes a built-in provider key today (`saveProviderApiKey` only saves; `SecretManagementService.removeForConsumer` has no GraphQL caller). The suite removes it through the vault service and says so in a comment. The AC itself approves the outcome, so this is not a test finding; it is a requirement-basis note for the Solution Designer, like AC-006.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-scripted-provider.e2e.test.ts` | Added | AC-009 (missing, changed, removed key; restore without key), AC-010/011 (compaction completed and refused), AC-012 (keep-alive and stall), RSK-004 | Real dsh and the product relay against a scripted Messages endpoint | `vi.mock` replaces only the relay origin and the idle timeout; no production test hook added |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-collaboration-live.e2e.test.ts` | Added | REQ-001 (Team, Org), AC-004 (team restore), AC-008, AC-014 (runtime switch) | Live dsh in collaboration roots and a runtime switch | Gated on the test-vault key |
| `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-standalone-host.e2e.test.ts` | Added; updated in round 2 | DEC-020 (standalone host) | Real standalone host from `dist/` | TR-001 resolved in `6e1dc44337` |
| `autobyteus-server-ts/tests/e2e/runtime/fixtures/deepseek-harness-standalone-host-fixture.mjs` | Added | DEC-020 | Full-host fixture with a recording `dsh` stand-in | `dshDataFiles` is asserted since round 2 |
| `autobyteus-web/tests/integration/voice-input-extension.integration.test.ts` | Updated | Unrelated (TESTING.md Rule 9 baseline fix) | Per-case 30 s timeout for a case with a real tar extraction and two real worker processes | Cause named in a comment; no assertion changed |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One suite per boundary (scripted provider, live collaboration, standalone host); case names state the outcome and cite AC/DEC IDs; headers give gate and command |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Round 2: the standalone case asserts the DEC-020 refusal (`/^PROVIDER_RELAY_UNAVAILABLE: DeepSeek Harness needs the AutoByteus credential proxy/`) and `dshDataFiles` empty (TR-001 resolved). Elsewhere strong: key labels seen upstream, no upstream call without a key, `KEY_MISSING_TEXT` shown, one completed boundary per answered compaction call, segment archived, summary carried into the next request, one usage record per call, `ACP_TURN_IDLE_TIMEOUT` after ≥ 6 s |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Uses the shared e2e helpers (`startStudioE2eRuntimeServer`, `sendE2eSendMessageCommand`, team helpers, live vault). The two dsh suites repeat small GraphQL/socket helpers, as the existing runtime e2e suites do; not worth extracting |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temporary data roots, clean-env commands, per-suite dsh process check in `afterAll`, scripted endpoint decides usage and pacing. Cases after AC-009 re-save key C when needed, so they do not depend on the earlier case passing |
| Large files remain coherent and navigable | Pass | 518 and 365 lines, each one boundary with clearly separated cases |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Gated suites skip with stated reasons |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Cases match API-10…API-16, API-20…API-22, API-25; logs present |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every case maps to an approved AC, DEC or RSK |
| Each test enters through its scenario's real trigger and follows the real steps | Pass | GraphQL and WebSocket entry, real dsh, real standalone host, real application backend command. The two `vi.mock` seams (relay origin, shortened idle timeout) are the AC's own stated test conditions. Key removal goes through the vault service for want of a product surface (see Review Meta note) |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `deepseek-harness-standalone-host.e2e.test.ts:37-38` (DEC-020, API-25) | The case asserts only `expect(receipt.launch.error).toBeTruthy()` and `dshStarts` empty. Any other failure before spawn (a fixture mistake in the application bundle, a binding or validation error) also gives a truthy error and no dsh start, so the case can pass without proving the DEC-020 refusal. The fixture already records `dshDataFiles`, but the test does not assert it, although the API/E2E result claims "no dsh home files". The current evidence happens to show the right error (`API-25-standalone-host.log`: `PROVIDER_RELAY_UNAVAILABLE: DeepSeek Harness needs the AutoByteus credential proxy…`), so this is about the durable test, not the result. | Assert the refusal itself: `launch.error` matches `PROVIDER_RELAY_UNAVAILABLE` (the design's DEC-020 refusal), and `dshDataFiles` is empty. Add `dshDataFiles` to the receipt type. Rerun API-25 only. | `Local Fix` / `api_e2e_engineer` — **Resolved in round 2**: `6e1dc44337` adds `dshDataFiles` to the receipt type, matches `launch.error` against the DEC-020 refusal, and asserts `dshDataFiles` empty. API-25 rerun: `API-25-standalone-host-r2.log`, 1 passed, with that error, `dshStarts: []` and `dshDataFiles: []`. The rest of the delta is ticket documents only, and no product source changed since `fddcff0f13`. |

## Follow-ups

- Follow-ups this review added: None. FU-002, added by API/E2E (prerelease suffix dropped by the shared runtime-version reader), is correctly outside this ticket.

## Latest Authoritative Result

- Result: `Not Applicable` (round 3: no durable test changed in API-REV-003); round 2 result `Pass` stands for this ticket's durable tests
- Changed durable test paths reviewed: the five above
- Unresolved finding IDs: None (TR-001 resolved)
- Recommended Recipient: `delivery_engineer`
- Notes: round 3 found no durable test change (API-REV-003). Round 2 rechecked TR-001 only; the round-1 review stands for everything else. For the Solution Designer when the ticket leaves the team: like AC-006, the AC-009 key-removed alternate has no product trigger today.
