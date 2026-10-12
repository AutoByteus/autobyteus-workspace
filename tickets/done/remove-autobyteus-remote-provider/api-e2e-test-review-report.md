# API/E2E Test Review Report — remove-autobyteus-remote-provider

## Review Meta

- Review Round: 3
- Trigger: API/E2E round-3 Pass for the IR-002 delta (API-REV-003). Earlier: TR-001 fix, API/E2E round-2 Pass from `/software_engineering_team/api_e2e_engineer` (API-REV-002). Round 1 (CRR-002) was a Fail on TR-001.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002 basis); SCN-004 and AC-004 in particular
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: None are behavior-defining
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002, API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95% (94.9%)
- Prior unresolved test-review findings rechecked: TR-001. It is resolved: the reselection block, its comment and the header sentence are removed. `grep` finds no `updateStoppedAgentRunModelConfig` or "verified context" in the file. The AC-004 assertions remain (lines 228-256). Rerun 2/2 pass, clean env (`api-e2e-evidence/logs/server-e2e-saved-selection-tr001.log`, EXIT=0).
- Project testing guideline applied: worktree `TESTING.md`, as the coverage investigation records. No conflict with this skill. The uncommitted one-bullet `TESTING.md` addition ("Local model servers share limited compute") is guideline text, not durable test code, so it is not reviewed as a test. It should land as a separate `docs(testing)` commit, as the engineer noted.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-004, SCN-005, CON-001 / REQ-008, SCN-006)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/secret-management/removed-remote-provider-leftover-startup.e2e.test.ts` | Added | SCN-005; AC-005; AC-003; QR-001 | Upgrade start with an encrypted leftover vault row plus the `.env` key, across 3 built-server lifetimes | Writes the vault row with the unchanged vault crypto while the server is stopped. That faithfully reproduces data the released importer wrote, which the current version can no longer produce. |
| `autobyteus-server-ts/tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts` | Added | SCN-004; AC-004; SCN-006 / AC-007 | Native-runtime launch refused with a remote id; a stopped run's saved remote id is kept and restore is blocked | Rewrites `run_metadata.json` to the provider-era shape while stopped, a realistic upgrade state. See TR-001. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Updated (+1 case) | CON-001; REQ-008; AC-006 | Released backfill through real Prisma for `AUTOBYTEUS` rows | Covers empty, blank and populated snapshots plus a built-in control; non-provider fields are preserved |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Updated (+1 case) | SCN-004; AC-004 (media defaults) | A remote image/speech default yields `MODEL_IDENTIFIER_NOT_AVAILABLE`; no client, no file, setting kept | Follows the file's existing mocked-factory boundary |
| `autobyteus-server-ts/tests/unit/application-platform/application-current-model-selection-policy.test.ts` | Updated (+1 case) | SCN-004; AC-004 (launch profile) | A remote launch selection is blocked through the real `LLMFactory` | OBS-002 wording is accepted (requirements left per-surface wording open) |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts` | Updated (+1 case) | REQ-008; BEH-009 | Display from the snapshot; `Unknown Provider (AUTOBYTEUS)` when no snapshot exists | The no-snapshot outcome was accepted at design review |
| `autobyteus-ts/tests/unit/multimedia/gemini-runtime-resolver-gate.test.ts` | Added (round 3) | CR-001 / SR-004 delta; Gemini media generation paths (SCN-003 tool calls) | Gemini resolver gate on media `createClient` and factory `requiresGeminiRuntimeResolver`, decided by provider alone | Fills a real gap: the server media e2e mocks the factories. Uses recording client subclasses plus the shared `provider-api-key-resolver-test-helpers`. The registry-wide case checks every built-in media model. The engineer's mutation check (gate flipped to OPENAI → 2 failures) shows the assertions bite. Reviewer rerun: 7/7 pass. |

- No durable test file changed: `No`
- Removed this round: none

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each new file has a purpose/boundary/run header; case names state the requirement and cite AC/REQ IDs |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Round 2: TR-001 is resolved, and no assertion pins the OBS-001 refusal. Everything asserts the requirement: the vault row is byte-identical, the setting is custom/deletable, the custom provider's own key is used and the canary never leaks, the restore is blocked and the value kept, the backfill output matches |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Uses the shared `test-runtime-bootstrap.mjs` helpers and the existing `createLedgerRow`/`makeRunner`/`registerMediaTools`; local helpers are small and file-scoped |
| Test isolation and determinism are appropriate for the boundary | Pass | Test-owned runtime roots and DBs with suffixes; sanitized env; Ollama/LM Studio hosts pinned to closed port 9; loopback fake endpoint; servers, endpoints and roots cleaned up in `afterEach` |
| Large files remain coherent and navigable | Pass | New files hold one scenario each; updated files gain one case each in their existing surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | None added. The new cases test approved leftover behavior, not a compatibility path |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Maps to API-E2E-004A/B/C/D, 005 and 006 in the execution report |
| Test callers and fixtures exercise an independently established supported scenario | Pass | SCN-004/SCN-005 are approved upgrade scenarios. The provider-era data setup reproduces their real initiating state rather than inventing one |
| Each test enters through its scenario's real trigger without unreal setup | Pass | Entry is GraphQL on the built server, the real migration runner, or the real tool registry. Direct writes of the vault row and run metadata reproduce state that a provider-era release produced and the current build cannot |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 (Resolved in round 2, CRR-004) | `removed-remote-provider-saved-selection-graphql.e2e.test.ts`, case "keeps a stopped run … blocks its restore": the `updateStoppedAgentRunModelConfig` block | It asserts `toEqual({ success: false, outcome: 'VALIDATION_FAILED', … message: 'Both models need verified context capacities before replacement.' })` when the user re-selects a current model. This pins the pre-existing rule at `run-model-selection-service.ts:68` (not in this diff), which the engineer recorded as OBS-001. The UI says "Choose another model", but no swap is possible. Approved SCN-004 says the user "picks another model" and "work proceeds with the new model". The assertion therefore locks in behavior that contradicts an approved scenario and is unrelated to the removal. A later fix of OBS-001 would break a test that is presented as removal coverage. | Remove that reselection block, including its comment. Keep the requirement assertions AC-004 actually needs: the resume config shows the remote value, restore is refused with `MODEL_IDENTIFIER_NOT_AVAILABLE`, metadata stays byte-identical, and this holds across the restart. Keep OBS-001 in the execution report as a separate-ticket candidate for the Solution Designer. Do not change product code. Rerun only this e2e file. | `Local Fix` — `api_e2e_engineer` |

Non-blocking notes:

- The leftover-startup e2e asserts that media rows have `runtime === 'api'` and `hostUrl === null`. If the user approves folding the single-valued `MultimediaRuntime` cleanup into this ticket, that change must keep these GraphQL outputs or update this assertion. This decision is open with the user (follow-up 3 in the code review report).
- OBS-001 suggests SCN-004's "picks another model" step is not achievable for stopped native runs whose model is no longer offered. It is pre-existing, so it is not this ticket's defect. It is for the Solution Designer to decide whether it needs a separate ticket.

## Round 3 Notes

- `server-owned-media-tools.e2e.test.ts`, combined state: the committed IR-002 hunk removed all `runtime: "api"` mock fields (0 remain). The uncommitted diff is only the round-1 AC-004 case (+29 lines). It is consistent.
- Non-blocking: the final assertion `'runtime' in model === false` in the gate test is a structural check of the removal. The type system already enforces it, so it adds little, but it is cheap and clearly labeled. No action is required.

## Latest Authoritative Result

- Result: `Pass` (round 3, CRR-006)
- Changed durable test paths reviewed: the 7 paths in the scope table; round 3 added `gemini-runtime-resolver-gate.test.ts`, and the other 6 are unchanged since CRR-004 apart from the IR-002 committed mock hunk
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: The `TESTING.md` bullet stays uncommitted and should be committed separately as `docs(testing)`. OBS-001 (pre-existing stopped-run reselection conflicting with SCN-004) remains a separate-ticket candidate for the Solution Designer.
