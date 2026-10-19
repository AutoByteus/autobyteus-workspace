# API/E2E Test Review Report — anthropic-incomplete-content-block

Latest authoritative result: **Step 2, round 4, CRR-009: Pass**. This is the re-review of the TR-001 fix to the OpenAI/Gemini additions. Round 3 (CRR-008, Fail TR-001) is kept below for history. Round 2 (CRR-006/CRR-007, Pass) covered the earlier suite contents, committed as `2b93f0fc6`/`fd8e18b1c`. Step 1 is in CRR-002.

## Round 4 (CRR-009) — TR-001 re-review

- Changed durable paths, uncommitted on top of `fd8e18b1c`:
  - `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts`: adds `responseHasVisibleText`, plus the round-3 parsers.
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts`: adds `expectedVariant`, `assertRecoveryNote` and the OLR-E2E-012/013 cases.
- **TR-001: Resolved.**
  - `assertRecoveryNote` finds the note by content: it takes the last message containing "System note:", after filtering out `system` and `reasoning` entries, and requires it to be the last message. That covers both the separate-message shape and the merged "The user's current message is:" shape (CND-102). On a merged Gemini first-call request, the conversation is the single user message, `before` is `undefined`, and the nothing-kept assertion holds. There is no out-of-range access.
  - It asserts the variant the product must choose, derived from what the cut response streamed:
    - tool call → the `write_file` note;
    - visible text → "Resume directly…" with a non-empty preceding assistant message;
    - otherwise → "before producing any visible output", with no kept assistant text before it.
  - This mirrors the product rule: discarded tool names, else kept text, else nothing.
  - The OLR-012 fixed-prefix assumption is removed. The `responseHasVisibleText` matchers exclude reasoning: DeepSeek `reasoning_content` does not match `"content"`, and Gemini thoughts are not returned by default. Any mismatch fails the test rather than passing it falsely.
- The non-blocking rename is applied: OLR-E2E-012 is now "recovered (or, after 3 attempts, exhausted)", and the header documents the one-call behavior and the earlier `olr-popular2` 100/100 recoveries.
- Remaining positional `tail[1]` uses are only in the Anthropic OLR-E2E-002/003 cases. Those were reviewed in round 2; their shapes are not merged (note after a tool result, or after kept text), and Anthropic's system prompt is outside `messages`. Unaffected.
- Evidence (`api-e2e-evidence/step2/olr-tr001/case-results.json`):

  | Case | Result | Branch exercised |
  | --- | --- | --- |
  | 012-OPENAI | pass | `tool_call` |
  | 012-GEMINI | pass | `nothing_kept` |
  | 013-OPENAI | pass | `kept_text` |
  | 013-GEMINI | pass | `kept_text` |

  The engineer correctly does not claim OLR-013's own nothing-kept branch, or a live merged first-call nothing-kept shape, in this run. The latter was observed before the fix (`olr-popular3a`).
- Reviewer check: the ungated skip of both suites gives 26 skipped.
- Result: `Pass`. Unresolved findings: None. Recommended recipient: `/software_engineering_team/delivery_engineer`. Delivery should commit the two updated paths.

---

## Round 3 (CRR-008) — OpenAI / Gemini additions

### Scope

| Durable Test Path | Change | Related Requirement | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Updated (uncommitted) | Evidence/assertion plumbing | `requestMessages()` now parses OpenAI Responses `input` and Gemini `contents`; `readResponseSignals()` captures `incomplete_details.reason`. Clean per-shape parsers; no issue |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Updated (uncommitted) | AC-011, AC-005 (OLR-E2E-012/013 × OPENAI, GEMINI) | Parametrized over `POPULAR_PROVIDERS` and gated per key |

### Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping / names | Pass | Parametrized cases with provider-suffixed IDs |
| Assertions prove approved requirements | **Fail** | TR-001: the OLR-E2E-013 reasoning-only branch asserts by message position, which the product's note-merge shape (CND-102) makes wrong for Gemini |
| Helpers reuse | Pass | Shared `noteMessages`, `nextCall`, `isOutputLimited`, harness parsers |
| Isolation / determinism | **Fail** (same root) | The documented nondeterminism tolerance (a reasoning-only cut) crashes instead of asserting. See TR-001 |
| Coherent, navigable | Pass | — |
| No stale or duplicated tests | Pass | — |
| Coverage agrees with evidence | Pass | `olr-popular1` (013 both pass with kept text), `olr-popular4` (012 both pass) |
| Independently established scenario | Pass | Real provider cuts under a configured limit; no response rewrites in these cases |
| Real trigger, realistic setup | Pass | `createAgentRun` with `llmConfig`, then WS send. The one-call instruction in OLR-012 is a coherent user request; see the note |

### Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | OLR-E2E-013 (GEMINI, and in principle any provider) "nothing kept" branch | The else branch takes `tail = recoveryMessages.slice(-2)` and asserts `tail[1]!.role === "user"` and `tail[1]!.text`. On a first-call cut that kept no text, the product merges the hidden note into the preceding user message ("The user's current message is:", CND-102). The recovery request then ends in one composed `user` message. Gemini puts its system prompt in `systemInstruction`, not `contents`, so `recoveryMessages` has a single entry and `tail[1]` is `undefined`, which throws a `TypeError` instead of asserting. The shape is observed in this run's evidence: `olr-popular3a` OLR-E2E-012-GEMINI shows the recovery request as one `user` message. The branch is reachable: Gemini thinking tokens count against `maxOutputTokens`, and OLR-012 on Gemini produced exactly such a nothing-kept cut. The live passes (`olr-popular1`) only exercised the kept-text branch. A related positional/variant assumption is in OLR-E2E-012: it requires the note to contain "System note: your previous response hit the output limit of 1200 tokens". That holds for the tool-cut and nothing-kept variants but not for the kept-text variant ("System note: output token limit hit. Resume directly…") | Find the note by content, not position. Use `noteMessages(recovery)` (the merged user message also contains "System note:") and assert the variant from the cut shape:<br>• kept visible text: the last assistant message holds the partial text and the note says "Resume directly…";<br>• nothing kept: no assistant message after the request, and the note says "before producing any visible output".<br>In OLR-012, accept the variant that matches the cut (tool → `write_file` variant; text → resume variant; nothing → nothing-kept variant). Verify with the ungated skip check plus at least one live OLR-013-GEMINI run, and do not count it as proven if only the kept-text branch occurs. Record that in the ledger | `Local Fix` → `/software_engineering_team/api_e2e_engineer` |

Non-blocking:
- OLR-E2E-012's name says "is recovered", but with the one-call instruction OpenAI consistently ends in `LLM_OUTPUT_LIMIT_EXHAUSTED`: the user's instruction conflicts with the note. That is valid AC-011 behavior (exhaustion is an approved outcome), and the assertions allow it. Consider naming it "recovered or exhausted", or noting in the header that the earlier run without the instruction recovered to 100/100.

### Round 3 Result

- Result: `Fail` (superseded by round 4: TR-001 resolved in CRR-009)
- Unresolved finding IDs: TR-001 (resolved in CRR-009)
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Earlier round-2 content stays Pass and is already committed. After the fix, return for a quick re-review of the two changed paths.

---

# Round 2 (CRR-006/CRR-007, Pass): original suite review

## Review Meta

- Review Round: `2`
- Trigger: API/E2E Pass for Step 2 (API-REV-003, after the CRR-005 Local Fix), with a proportional review of the changed durable tests requested by `api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-002..AC-007, AC-010..AC-012; REQ-002..REQ-006, REQ-009..REQ-011)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-007, SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (D-02..D-09)
- Supplemental Task Artifacts Reviewed As Context: `api-e2e-evidence/step2/` (`olr-rerun/case-results.json`, `olr-rerun.log`, `ungated-skip-rerun.log`, `run-live.sh`), as evidence only
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002, IR-003)
- Original Code Review Report: `code-review-report.md` (CRR-004 Pass; CRR-005 failure origin)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-003)
- Final Validation Confidence: 95.2% (API-REV-003 as updated in place after the user's 2026-10-10 scope decision: "We don't have to test the provider which doesn't have API key." Qwen, Kimi, Mistral and Ollama are out of scope, not residual risks; environment fidelity is 95%). No category is below 90%, and every critical AC is directly proven. Remaining residual: unedited provider-issued refusal, context-window and network-cut shapes cannot be requested on demand.
- Prior unresolved test-review findings rechecked: None open
- Project testing guideline(s) applied: `TESTING.md` rules 2/4 (test-owned vault, no live-app data), 5 (stop what you started), 6 (assertions first), 9. No conflict.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-002/003/004/007 and SR-006. The CRR-005 rejection of the Anthropic malformed-JSON premise is honored: OLR-E2E-009 is removed, and the exclusion and future trigger are documented in the suite header.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Added (uncommitted) | Shared live native-runtime plumbing | Contents: in-process server; value-safe provider-request recorder (host and path only, never headers or query); one-shot rewrite of a real provider response; run/turn/WS helpers; `getRunProjection` reload; server-setting helpers; limit assertions; evidence writer | Consolidates the plumbing previously inlined in the Step 1 suite, removing duplication. 370 lines, one responsibility |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Added (uncommitted) | AC-003/005/006 (OLR-001..004, 011), AC-010/011 (005), AC-004 (006/007), AC-007 (008), AC-012 (009b, OpenAI-compatible), AR-004 (010), D-08, CND-102 (001/002) | Live recovery and finish handling through the real server path | Gated by `RUN_NATIVE_OUTPUT_LIMIT_E2E=1` plus keys. 11 cases. Ungated: skipped (reviewer re-run, 22 skipped across both suites) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts` | Updated (uncommitted) | Step 1 AC-001/008/013 (OLM-E2E-001..010) | Unchanged cases, moved onto the shared harness | Reviewer diff: every `assertAccepted`/`assertLimit` call and expectation is preserved verbatim (now `harness.*`); only the inlined plumbing was removed (−300/+53) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs and test names map to AC/REQ IDs, and the header lists each case's purpose. Rejected-stop cases share `runRejectedStop` |
| Assertions prove approved requirements instead of incidental details | Pass | Each case checks the outcome the requirements define:<br>• discarded segment, and no `TOOL_EXECUTION_*` for discarded ids;<br>• the cut call is absent from the next request body;<br>• note text names the tool and the limit;<br>• exactly `MAX_OUTPUT_LIMIT_RECOVERIES + 1` calls, then `LLM_OUTPUT_LIMIT_EXHAUSTED`;<br>• unique `llm_call_id`s;<br>• reload hides the note and shows consecutive assistant parts;<br>• coded refusal/context-window errors with rollback, and a valid next request;<br>• the malformed retry result is accepted by the provider;<br>• compaction reports `incomplete`/`length` and blocks.<br>Policy constants are imported from production (`output-limit-recovery.ts`), so the assertions don't drift |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared harness used by both suites. `linesRequest`, `nextCall`, `noteMessages` and `assistantToolUses` helpers |
| Test isolation and determinism appropriate for the boundary | Pass | Live and gated, with per-suite temp app data, per-run workspaces and unique definition names. `stop()` terminates runs, deletes definitions, restores `fetch` and removes temp dirs. OLR-E2E-010 deletes its server settings in `finally`. Opus nondeterminism is handled deliberately:<br>• OLR-001 accepts a tool-call or adaptive-thinking first-call cut and asserts the matching note variant;<br>• OLR-011 asserts tool-cut semantics on whichever attempt is the tool cut;<br>• OLR-005 tolerates exhaustion as a valid ending.<br>These tolerances keep requirement proof intact |
| Large files remain coherent and navigable | Pass | Recovery suite (452 lines) covers one surface; harness (370) covers one plumbing concern |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | OLR-E2E-009 (rejected premise) is removed, not skipped. Skips are explicit key gates ("a skip is not a pass") |
| Coverage agrees with the coverage investigation and execution evidence | Pass | 11 cases match API-REV-003 and `olr-rerun/case-results.json`. AC-012 on Anthropic is recorded as `Not Applicable`, with the contract citation and the RSK-002 future trigger |
| Test callers exercise an independently established scenario | Pass | The one-shot rewrites (006/007 stop reason, 008 removed `message_stop`, 009b corrupted OpenAI-compatible `arguments`) only edit a real provider response to reach shapes the governing contracts document:<br>• Anthropic `refusal` and `model_context_window_exceeded` stop reasons;<br>• a network cut (SCN-004);<br>• OpenAI chat arguments that are not validated server-side.<br>Each case asserts `rewritten === true`, so a rewrite that didn't apply cannot pass silently. No rewrite establishes an unsupported scenario, now that 009 is gone |
| Each test enters through the scenario's real trigger without unrealistic setup | Pass | GraphQL `createAgentRun` with `llmConfig` as the app sends it, then a WebSocket `SEND_MESSAGE`. History is read through the app's `getRunProjection`. Compaction settings go through `updateServerSetting`, the real operator surface |

## Findings

None.

Non-blocking notes:
- The harness header's example list ("a malformed tool-call argument") is generic. Optionally qualify it as "(OpenAI-compatible)" so a future reader doesn't re-add an Anthropic malformed-JSON rewrite. The recovery-suite header already documents the exclusion.
- Delivery should commit the three test paths. Optionally add a TESTING.md row for the gated recovery suite and its `run-live.sh` usage, alongside the Step 1 suite row.

## Latest Authoritative Result

- Result: `Pass` (re-confirmed in CRR-007: the test code is unchanged; committed by delivery as `2b93f0fc6` with the reviewed contents; `fd8e18b1c` only qualifies the harness header comment, as this review suggested)
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The live run was not repeated. The reviewer ran only the ungated skip check: 22 skipped.
  - Residuals from API-REV-003:
    - providers without a usable API key (Qwen, Kimi, Mistral, Ollama) are out of scope per the user (2026-10-10);
    - unmapped stops stay `other`;
    - with a small limit, Opus adaptive thinking can consume whole attempts;
    - the RSK-002 trigger: enabling `eager_input_streaming` requires an Anthropic AC-012 path and case.
  - AC-009 is user verification after release. Do not archive the ticket.
