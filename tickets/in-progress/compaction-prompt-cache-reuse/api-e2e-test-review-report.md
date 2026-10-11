# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API-REV-005 **Pass / 94.6%** from `/software_engineering_team/api_e2e_engineer`, on `097192731` (IR-007)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-012; release bar SR-011)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-012; SR-013 pending the user)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `supplements/cached-summary-instruction.md`; `ac003-summary-quality-report.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-008)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001..IR-007)
- Original Code Review Report: `code-review-report.md` (latest implementation result CRR-011, Pass, 9.35/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-012`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (§ Round 5, authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-005)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 94.6% (no category below 90)
- Prior unresolved test-review findings rechecked:
  - **CR-001 / C-020:** OLR-E2E-010 no longer uses the removed setting; it is re-scoped to the REQ-009/SR-010 fitted limit and the REQ-002 modes. **Resolved.**
  - **CR-003:** CCR-E2E-001 checks every `COMPACTION_SUMMARY_HEADINGS` entry, not the retired heading. **Resolved.**
- Project testing guideline(s) applied: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/TESTING.md`, as recorded in the coverage investigation:
  - Rule 2: test-owned app data and vault, never `~/.autobyteus`;
  - gated live suites;
  - base failures reported separately.

  No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. The cases map to SCN-001..004 and AC-001/002/006/007/008/010/011, through the desktop app's surfaces: GraphQL runs, WebSocket sends, Settings changes. The strict preserved-thinking check is a labeled validation harness, not product behavior.

All paths above are under `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/`.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` | Added (untracked, 403 lines) | AC-001, AC-002, AC-006, AC-007, AC-008, AC-010, AC-011, REQ-002, REQ-009, F-4 | Live compaction through the studio server: cached summary on Anthropic (strict), the tools change before compaction, Gemini transcript-only, and the raised output limit | Gated by `RUN_COMPACTION_CACHE_E2E=1` plus per-case key `skipIf`. Follows the `*-live.e2e.test.ts` convention. |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Updated (OLR-E2E-010) | REQ-009, REQ-002, AC-011 (CR-001/C-020) | A small run limit no longer blocks compaction; summary requests carry the fitted limit | The removed setting is gone; settings are reset to high values in `finally` |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Updated (opt-in options; default behavior unchanged) | Shared live harness | `strictAnthropicThinking`, `writeBodies`, per-call `usage`/`strictInjected`, `summaryRequestMode` | Strict injection only on `api.anthropic.com/v1/messages` with a `thinking` object; the recorded body stays as production built it |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header lists each case ID with its AC and the trigger-placement method. Case names state the outcome. One stale local name in CCR-E2E-003 (N-T1). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | AC-001: system, tools, model, `max_tokens`, thinking and `cache_control` equal; block-level prefix; the instruction is the last message. AC-002: cache share ≥ 0.9 and accepted on attempt 1. AC-006: 0 thinking blocks plus the new tools, strict 200. AC-007: meter cache read = provider; the run summary equals the provider calls. AC-010: Gemini `systemInstruction` per request kind. AC-011 / REQ-009: the fitted limit is computed from the rule, with a room guard against the provider-reported input × 1.5; the agent's own limit is untouched. REQ-002: mode sequences (Gemini transcript only; DeepSeek cached first). F-4: `assertNoInstructionEcho`. Recall checks (`4900`, `VX-4471`) prove continuation. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared `NativeRuntimeLiveHarness`; `runToPendingCompaction`, `compactionView`, `runTurn`/`turnOk`, and the `highTrigger`/`lowTrigger` builders remove repetition. Body helpers (`blockEntries`, `withoutCacheControl`, `thinkingBlocks`) mirror the prior ticket's proven approach. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | A temporary app-data folder per suite (`mkdtemp`, removed in `stop`); temporary workspaces; the test-owned vault. Each case sets its own trigger at its start because predefined settings cannot be deleted (DEF-D). Trigger sizes come from observed usage, so the result does not depend on model length. Live-model variance is handled with model-agnostic assertions and per-case recording. N-T2 (the cleanup attempt) is cosmetic. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 403 lines on one subject (compaction with the cached summary), in clear sections. The harness additions are opt-in and documented. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | OLR-E2E-010 no longer asserts the removed setting or the non-streamed compactor (CR-001). The retired heading assertion is gone (CR-003). The live length-cut rejection is explicitly delegated to unit tests, with the reason stated in the header. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Round-5 report: CCR-E2E-001..004 4/4 (96.8% and 96.3% cache read; strict accepted; Gemini `[transcript]`, recall `4900`); OLR-E2E-010 pass (`[cached]`, 15,000 vs 96, recall); real-provider 1,024 scenario 3/3. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The scenarios come from the approved requirements. The harness strict mode and the `summaryRequestMode` classifier only observe; they do not create the paths. |
| Each test enters through its scenario's real trigger and follows the real actor's steps, without setup that real use doesn't produce | Pass | Compaction is reached by ordinary turns plus Settings → Compaction values, as a user would set them. The tools change goes through Settings → default image model. Gemini goes through `useGeminiMode(VERTEX_EXPRESS)`. Runs are created through GraphQL. No hidden state is mutated. |

### Focus checks

- **`summaryRequestMode`:** it matches the instruction marker only in the last message (`messages` or Gemini `contents`), and the prompt marker only in system positions (Anthropic `system`, Gemini `systemInstruction` or `generationConfig.systemInstruction`, `system`/`developer` messages). This avoids the round-2 false positive where a post-compaction request quotes the instruction. It throws if a marker is empty.
- **`readResponseUsage`:** the per-field regex anchors on the opening quote, so `"input_tokens"` does not match `cache_read_input_tokens`. It takes the maximum across stream events. It is provider-specific and normalized to `inputTotal` / `cacheRead`.
- **`expectStrictWhenThinking`:** it asserts strict mode if and only if a `thinking` parameter is present. With the default Opus model, strict mode is enforced on every Anthropic summary call, so AC-006's no-400 proof holds. If someone sets the configurable model to one without a `thinking` parameter (Sonnet 5), CCR-E2E-002's strict guarantee weakens to "accepted". This is documented in the helper's comment; noted for whoever runs that variant, not a defect.

## Findings

No actionable findings.

Non-blocking notes (no action required):
- **N-T1:** in CCR-E2E-003, the T6 result is stored in a variable named `t3`, and labels say "T3 agent calls", leftovers from an earlier version of the case. Purely cosmetic.
- **N-T2:** `clearSettings` in the cache-reuse suite calls `deleteServerSetting` for predefined compaction keys, which cannot be deleted (pre-existing DEF-D); `deleteServerSetting` swallows errors. It's harmless because the app-data folder is temporary and each case sets its own starting values (as the header states). A later edit could reset values instead, as OLR-E2E-010 does in `finally`.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` (added, untracked)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` (updated)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` (updated)
- Unresolved finding IDs: None. CR-001, C-020 and CR-003 are resolved.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - **Commit the durable tests:** the three test files are uncommitted (one untracked) and must be committed in delivery.
  - **Before release:**
    - the user must review and accept `ac003-summary-quality-report.md` (AC-003);
    - the user must check the Token Meter against the Console (AC-007).
  - **Residual risks:**
    - AC-010 on the Gemini API key (quota-blocked; Vertex Express proven);
    - N-3 (an unwrapped truncation on a provider with `unknown` completion; not observed);
    - load sensitivity of the server test `native-compaction-terminal-drain` (it passes with live harnesses idle).
  - **Separate tickets:** pre-existing DEF-C and DEF-D, plus the follow-up Task `project_task_9bf18aea…` (gap A on Sonnet 5 and DeepSeek; per-model strategies).
  - **Pending outside this package:** SR-013 is still waiting for the user's approval.
