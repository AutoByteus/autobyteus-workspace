# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass from `/software_engineering_team/api_e2e_engineer` (API-REV-001)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `probes/`; `api-e2e-evidence/live-run-6/` (`case-results.json`, `calls-summary.json`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass. Live run 6: 7/7 cases, 45 calls. The only non-200 is call 44, `control-changed-tool` → 400, which is intended.
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None. CR-001 is an implementation-owned unit-test note from CRR-001, outside this test-review scope and still non-blocking.
- Project testing guideline(s) applied: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/TESTING.md`, as the coverage investigation records. Applied:
  - Rule 2: test-owned app data and DB vault; never the user's app or data;
  - credentials through the test-owned vault helper;
  - Rule 9: base failures and pre-existing defects reported separately.
  No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. The cases map to SCN-001/002/004/005/006 and AC-001..004, 006, 011..013. APC-E2E-008 is a labeled harness-validity control, not a product scenario.

All paths above are under `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/`.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | Added (untracked, 719 lines) | SCN-001/002/004/005/006; AC-001/002/003/004/006/011/012/013a/013b; P-005 | One live native-runtime Anthropic run through the real studio server, validating caching and preserved-thinking validity end to end | Gated by `RUN_ANTHROPIC_CACHE_E2E=1` and `ANTHROPIC_API_KEY` through `describe.skip`. Follows the existing `*-live.e2e.test.ts` naming in `tests/e2e/runtime/`. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header documents the case IDs, their AC mapping, the run order and the excluded cases (DEF-A/DEF-B). Each `it` name states the asserted outcome. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Block-level append-only check: system and tools are byte-equal without `cache_control`, and the earlier `(role, block)` sequence is a prefix (AC-002). "No rewrite": T2's first read ≥ T1's last read+write, and written-or-uncached ≤ new input + previous uncached tail (AC-004). Note position plus unchanged system (AC-011). 2 × `{ephemeral,1h}` markers, 0 5m writes, hit ≥ 90%, read > 0 after the first call (AC-001/003). Meter components equal raw usage, and cost equals catalog prices (AC-006). 0 thinking blocks after restore and after the mid-round tool change, then append-only (AC-013a/b, P-005). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses the existing `startStudioE2eRuntimeServer`, `sendE2eSendMessageCommand` and live secret-vault helpers. Local helpers (`runTurn`, `assertAccepted`, `assertAppendOnly`, `blockEntries`, `waitFor`) remove the repetition within the file. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Live provider, so behavior is model-dependent by nature. Mitigations: deterministic data-only workspace files; a refusal is detected and reported as a scenario-prompt issue, not a product failure; any unexpected ≥400 fails fast with the body; a temp app-data dir and workspace (the Settings change persists only there: `ServerSettingsService.updateSetting` → `appConfigProvider.config`); run-scoped ledger cleanup; definition deleted; `fetch` restored; Stop guarded at 60 s because of DEF-A. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 719 lines for one run and one surface. Sections: harness, server/GraphQL/WebSocket, assertions, cases. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The whole suite is skipped only when its credential gate is unset, which is documented. APC-E2E-006 is omitted with a documented reason (DEF-A) rather than left disabled. |
| Added coverage agrees with the coverage investigation and execution evidence | Pass | Live run 6: `case-results.json` has all 7 cases `pass` with no errors. `calls-summary.json` has 45 calls; the only non-200 is call 44, the intended control. Every product call has `sdkVersion` 0.132.1. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The scenarios come from the approved requirements and design (SCN-005/006, P-005). The strict-mode wrapper is a validation harness that changes only the provider-check mode. APC-E2E-008 proves the harness enforces; it is not claimed as product behavior. |
| Each test enters through its scenario's real trigger and follows the real actor's steps, without a setup real use does not produce | Pass | GraphQL `createAgentDefinition` / `createAgentRun`. WebSocket send, `APPROVE_TOOL` and `INTERRUPT_GENERATION` (Stop generation). GraphQL `updateServerSetting` (Settings → Default image model). `terminateAgentRun` plus `restoreAgentRun` (Stop and reopen). Real model, real persisted snapshot. No hidden state is mutated. |

### Focus areas requested

- **Strict transport wrapper:** it intercepts only `POST https://api.anthropic.com/v1/messages` with a string body, and passes everything else through. It records the parsed production body before injecting `block_binding`. It appends the beta header without dropping the existing ones. `assertAccepted` requires `strictInjected` on every product call, so a call that bypassed strict mode would fail the case rather than pass silently. Usage is read from a cloned response, so the SDK's stream is not consumed.
- **Block-level append-only:** `blockEntries` flattens `(role, block)` with `cache_control` removed. This is the right unit, because it tolerates the API's merging of consecutive same-role messages while still catching any edit, reorder or removal.
- **Meter reconciliation:** it polls until the report count and reads catch up, then asserts every token component and the cost to 4 decimals. It runs before the restore, which is documented as the DEF-B workaround.
- **Ordering and cleanup:** the cases depend on order, by design (one costly live run). The header states the order explicitly, and Vitest runs the cases sequentially in declaration order. Cleanup is complete and tolerant of DEF-A.

## Findings

None that need action.

Non-blocking observations (no action required for delivery):
- `ANTHROPIC_CACHE_E2E_MODEL` can override the model, but APC-E2E-007 prices with the fixed `OPUS_5_5_PRICE`. With a non-default model, that case would fail falsely; it could not pass falsely. A future edit could note this, or look up the price per model.
- Because the cases depend on order, running a single case with `-t` does not work. This is acceptable and documented for a single-run live suite.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` (added)
- Unresolved finding IDs: None. CR-001 from CRR-001 remains a non-blocking implementation-owned note.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The test file is untracked. Delivery should commit it with the ticket artifacts.
  - DEF-A (Stop hangs while a tool approval is pending) and DEF-B (the meter loses usage after a restore because turn IDs restart) are pre-existing on base and recommended as separate tickets.
  - DEF-B affects the user's AC-007 Console comparison for restored runs.
  - I did not re-run the live workflow. The evidence from run 6 was sufficient.
