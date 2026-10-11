# API/E2E Revision Record — anthropic-incomplete-content-block

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, round 1 (Step 1 of DEC-004) | SR-007, SR-008; ARCH-REV-002, ARCH-REV-003; IR-001; CRR-001 | N/A | Pass / 95% |
| API-REV-002 | Code Reviewer, `code-review-report.md`, CRR-004 (Step 2 of DEC-004) | SR-007, SR-008; ARCH-REV-002, ARCH-REV-003; IR-002, IR-003; CRR-003, CRR-004 | Pass / 95% (Step 1) | Fail / 89% |
| API-REV-003 | Code Reviewer failure-origin review CRR-005 (Local Fix → API/E2E) | IR-003; CRR-004, CRR-005 | Fail / 89% | Pass / 95.2% |

## Revision Entries

### API-REV-001 — Step 1 baseline: real output limits proven on the wire through the real server

- Triggering role, report path, and round: Code Reviewer pass, `code-review-report.md`, round 1
- Triggering finding or case IDs: N/A (baseline)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-007, SR-008; ARCH-REV-002, ARCH-REV-003; IR-001; CRR-001
- Why this baseline was recorded: first API/E2E validation of Step 1 (REQ-001, REQ-007, REQ-012; AC-001, AC-008, AC-013)
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts` (gated `RUN_NATIVE_OUTPUT_LIMIT_E2E=1`).
  - Updated `test-support/live-e2e/live-e2e-harness.ts` as a TESTING Rule 9 baseline fix. It used the factory's private `createBackend`; it now uses the public `beginPreparation`.
- Cases added, changed, removed, or rechecked: added OLM-E2E-001..010 and RPE-001 (runner regression)
- Commands, environment, fixture, or broader-validation delta: Live API through the in-process real server with a pass-through fetch recorder; clean `env -i` runner `api-e2e-evidence/run-output-limit-live.sh`; real-provider runner scenarios `openai.agent-flow`, `deepseek.agent-flow`, `deepseek.compaction-agent-flow`, `anthropic.llm`, `gemini.vertex-express.llm`

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all sections), execution coverage report (all sections), test-case ledger (events 1–15)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none. OLM-E2E-008 (Qwen) is Blocked by an invalid credential; the request body was correct.
- Recommended owner: Code Reviewer, for proportional review of the added/updated test code
- Remaining risks, blocked evidence, or untested scope: Qwen provider acceptance (credential); Kimi, MiniMax, Mistral, Ollama, LM Studio and Gemini AI Studio not live-checked (no key, no model or no catalog limit; unit coverage only); non-Anthropic rate-limit accounting of higher requested maxima; Step 2 and AC-009 out of this round.

### API-REV-002 — Step 2: recovery and finish handling validated live; AC-012 fails on Anthropic

- Triggering role, report path, and round: Code Reviewer pass CRR-004 (`code-review-report.md`), Step 2 (IR-003)
- Triggering finding or case IDs: CND-102 (held for live observation)
- Related revision IDs: SR-007, SR-008; ARCH-REV-002, ARCH-REV-003; IR-002, IR-003; CRR-003, CRR-004
- Why recorded: first API/E2E validation of Step 2 (REQ-002..REQ-006, REQ-009..REQ-011; AC-002..AC-007, AC-010..AC-012), with Step 1 re-validated as preserved behavior
- Coverage decisions or durable test paths changed (Step 2 worktree, uncommitted):
  - Added `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` (OLR-E2E-001..011, 009b).
  - Added `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` (shared plumbing; one-shot real-response edit).
  - Updated `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts` (moved onto the helper; cases unchanged).
- Cases added, changed, removed, or rechecked: OLR-E2E-001..011 and 009b added; OLM-E2E-001..010 and RPE rechecked on the Step 2 tree
- Commands, environment, fixture, or broader-validation delta: `api-e2e-evidence/step2/run-live.sh`; sanitized core integration (`env -i`); compaction server settings set/deleted by OLR-E2E-010

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| OLM-E2E-008 (Qwen, round 1) | Blocked (invalid credential) | Still Blocked (same 401) | `api-e2e-evidence/step2/olm-step2/` |

- Canonical artifacts and sections updated: coverage investigation (round 2), execution coverage report (round 2), ledger (round 2 section)
- Prior result and confidence: Pass / 95% (Step 1)
- Current result and confidence: Fail / 89%
- New or remaining failure IDs: OLR-E2E-009 (AC-012 on Anthropic: `AnthropicAssistantTurnAssembler` throws on invalid tool input JSON → `LLM_PROVIDER_ERROR`, turn ends, no retry tool result)
- Recommended owner: failure-origin review by the Code Reviewer; preliminary `Design Impact` → Solution Designer
- Remaining risks, blocked evidence, or untested scope: Qwen (credential); Kimi, Mistral, Ollama live; provider-issued (unedited) refusal/context-window/malformed shapes; AC-009 user verification
- CND-102: resolved by observation, no reroute (the model continued the original request after the merged note)

### API-REV-003 — CRR-005 Local Fix: invalid Anthropic malformed-argument premise removed; Step 2 Pass

- Triggering role, report path, and round: Code Reviewer failure-origin review CRR-005 (`code-review-report.md` "Failure-Origin Review (CRR-005)", `code-review-revision-record.md`)
- Triggering finding or case IDs: OLR-E2E-009
- Related revision IDs: IR-003; CRR-004, CRR-005
- Why recorded: CRR-005 classified OLR-E2E-009 as an invalid test premise (`Local Fix` → API/E2E). Without `eager_input_streaming` the Anthropic API buffers and validates each tool parameter before streaming it (official fine-grained tool streaming docs, re-verified 2026-10-10); AutoByteus sends neither `eager_input_streaming` nor the legacy beta header (adapter grep empty). The failing state was reachable only through the harness edit.
- Coverage decisions or durable test paths changed: removed OLR-E2E-009 from `autobyteus-native-output-limit-recovery-live.e2e.test.ts`; header documents the Anthropic exclusion and the future trigger. OLR-E2E-009b (DeepSeek) remains the AC-012 proof.
- Cases added, changed, removed, or rechecked: OLR-E2E-009 removed; OLR-E2E-001..008, 009b, 010, 011 re-run; ungated skip re-run
- Commands, environment, fixture, or broader-validation delta: `run-live.sh step2/olr-rerun …` (11/11 Pass); ungated `env -i … vitest run <both suites>` (22 skipped)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| OLR-E2E-009 (API-REV-002) | Fail; preliminary Design Impact | Not confirmed by CRR-005: invalid test premise; case removed; AC-012 on Anthropic Not Applicable | CRR-005; `api-e2e-evidence/step2/olr-rerun/` |

- Canonical artifacts and sections updated: coverage investigation (scenario validity, durable coverage, reroute table), execution coverage report (result, scorecard, matrix), ledger (R2-7..R2-9)
- Prior result and confidence: Fail / 89%
- Current result and confidence: Pass / 95.2% (initially recorded as 94.8%; recomputed after the user's scope decision below; no category below 90%; every critical AC directly proven)
- User scope decision (2026-10-10): "We don't have to test the provider which doesn't have API key." Qwen (key rejected), Kimi, Mistral and Ollama are out of scope, not residual risks; OLM-E2E-008 is recorded Out Of Scope instead of Blocked. Environment-fidelity score 93% → 95%.
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (proportional test-code review of the durable test changes)
- Remaining risks, blocked evidence, or untested scope: provider-issued (unedited) refusal / context-window / network-cut shapes; AC-009 user verification (providers without a usable key: out of scope per the user)
- Future trigger: if a later ticket enables `eager_input_streaming` (RSK-002 follow-up), an Anthropic `tool_use` with invalid JSON becomes supported; the assembler must hand unparsable input to the D-07 marker with a decided native-turn and replay shape, and an Anthropic AC-012 live case must be added.
- Addendum (same round, user request 2026-10-10: "test Gemini OpenAI both as well, they are the commonly used"): added OLR-E2E-012 (tool cut) and OLR-E2E-013 (text cut) for OpenAI Responses (gpt-5.4-mini) and Gemini (gemini-3.8-flash, Vertex Express), with reasoning/thinking `low`; extended the harness request parsing to OpenAI Responses `input` and Gemini `contents`. All four pass (ledger R2-11/R2-12). Observation: Gemini streams only complete function calls, so a cut call yields `MAX_TOKENS` with nothing to discard and the "nothing kept" note; recovery then completed the file (100/100). Result and confidence unchanged (Pass / 95.2%).
- Addendum (CRR-008 TR-001, Local Fix): OLR-E2E-012/013 now find the hidden note by content (the product merges it into the preceding user message on a first-call or consecutive cut, CND-102) and assert the variant derived from the cut response (`tool_call` / `kept_text` / `nothing_kept`; the harness records `responseHasVisibleText`). OLR-E2E-012 renamed "recovered (or, after 3 attempts, exhausted)". Rerun 4/4 Pass (ledger R2-13). Exercised: 012 OpenAI `tool_call`, 012 Gemini `nothing_kept`, 013 both `kept_text`; OLR-E2E-013's `nothing_kept` branch not exercised live. Result and confidence unchanged (Pass / 95.2%).

