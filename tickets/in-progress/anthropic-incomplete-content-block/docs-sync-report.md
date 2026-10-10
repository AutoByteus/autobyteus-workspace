# Docs Sync Report — anthropic-incomplete-content-block (Steps 1 and 2 of DEC-004)

Current delivery revision: `DR-003`. DR-003 changes only the `TESTING.md` recovery row: it names the OpenAI and Gemini cases, their keys and their model overrides (`f1d169674`). Step 1 docs sync (DR-001) is kept below the Step 2 section and is still accurate.

## Scope

- Ticket: `anthropic-incomplete-content-block`. Step 1 (real output limits) and Step 2 (finish contract, output-limit recovery, malformed-call admission, turn identity, D-02..D-09).
- Trigger: DR-001, the CRR-002 Step 1 package. DR-002, the CRR-006 Step 2 package (source review CRR-004 Pass, API/E2E API-REV-003 Pass, test-code review CRR-006 Pass).
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.
- Bootstrap base reference: `origin/personal` @ `d28c56d5d`.
- Integrated base reference used for docs sync: `origin/personal` @ `56530dfc6` (fetched 2026-10-10), merged into `codex/anthropic-incomplete-content-block-step2` as `547bd5b5e`.
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh (DR-002).

## Why Docs Were Updated

- Summary:
  - Step 1: requests use the model's real output limit by default.
  - Step 2: every adapter reports one provider-neutral finish. The agent loop recovers from output-limit cuts with a hidden note (at most 3 times), and refusal and context-window stops become coded errors. Malformed tool calls are rejected by `ToolPhase` with a retry error. Turn continuations and LLM call identities are turn-owned, and `ToolContinuationReadyEvent`/`isToolContinuation` are renamed.
- Why this should live in long-lived project docs: these are cross-adapter contracts that every new provider adapter must honour, and agent-loop and memory invariants that future runtime work depends on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/llm_module_design.md` | Output limits (Step 1); finish contract (Step 2) | `Updated` | Step 1: §6 and builder paragraph. Step 2: new §4.4 Response Finish Contract |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Builder summary | `Updated` (Step 1) | No Step 2 content there |
| `autobyteus-ts/docs/agent_memory_design.md` | Recovery boundary, raw traces, compaction completion status | `Updated` | New §8.1. The compaction "known incomplete output" wording is still accurate: `completionStatus` is derived from the finish |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Handler finalization, malformed arguments, continuation event | `Updated` | Malformed-call marking and `ToolPhase` admission; `finalizeOutputLimited`; event rename |
| `autobyteus-ts/docs/turn_terminology.md` | Continuation event and turn identity | `Updated` | Rename; new "Turn continuation and LLM call identity" item |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` | Continuation event in the event table | `Updated` | Rename only |
| `autobyteus-ts/docs/agent_processor_and_engine_design.md` | Mentions `CompleteResponse` | `No change` | Generic reference, still accurate |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Catalog output limits | `No change` | Unchanged values and semantics |
| `autobyteus-server-ts/docs` (run history) | Replay of the new trace type | `No change` | Replay ignores unknown trace types, as before. The hidden note is documented in the core memory doc |
| `TESTING.md` | Gated suites, command discrepancy, env isolation | `Updated` | Two gated-suite rows; core command fix (DR-001); `autobyteus-ts` has no test environment isolation |

Not changed, by decision: `api-e2e-evidence/step2/run-live.sh` is not referenced from `TESTING.md`. It hard-codes the Step 2 worktree path and the importer source file, so the TESTING row gives the general clean `env -i` command instead.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/llm_module_design.md` | New section | §4.4: `LlmResponseFinish`, the reasons, `mapProviderFinish` (`null`/`other`), `withToolCallsFinish`, single terminal chunk with usage+finish, derived `completionStatus`/`completionReason`, per-adapter table incl. Anthropic `message_stop` rules | D-02/D-03/DS-005 |
| `autobyteus-ts/docs/agent_memory_design.md` | New section | §8.1: settlement order on `output_limit`, coded `LLM_RESPONSE_REFUSED`/`LLM_CONTEXT_WINDOW_EXCEEDED`, `MAX_OUTPUT_LIMIT_RECOVERIES = 3`, note variants, `output_limit_recovery` trace + USER message with composed-user provenance, `LLM_OUTPUT_LIMIT_EXHAUSTED` | D-04/D-05/D-06 |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Behavior correction | The old "defensive fallback to `{}`; schema validation rejects" text is replaced by the `argumentsParseError` mark and `ToolPhase` rejection. Shared abandonment path incl. `finalizeOutputLimited` with the "Discarded: …" segment error | D-07 |
| `autobyteus-ts/docs/turn_terminology.md` | Rename + addition | `TurnContinuationReadyEvent`; `beginContinuation`/`isContinuation`/`isTurnContinuation`; `nextLlmCallSequence()` call ids | D-08/D-09 |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` | Rename | `TurnContinuationReadyEvent` | D-09 |
| `TESTING.md` | New entry + clarification | "Native output-limit recovery live E2E" row; environment-isolation rule now says it is server-only, with the `env -i` command for `autobyteus-ts` integration tests | API/E2E + implementation handoff disclosure |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Comment only | Header says the malformed-argument shape is OpenAI-compatible | Review nit |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Finish contract | Provider stop strings stay inside adapters; one terminal chunk | `design-spec.md` D-02, DS-005 | `llm_module_design.md` §4.4 |
| Output-limit recovery | A truncated response is never stored as a native turn; ≤3 hidden-note continuations | `design-spec.md` D-04..D-06 | `agent_memory_design.md` §8.1 |
| Malformed calls | Only `ToolPhase` admits; the handler marks and never repairs | `design-spec.md` D-07 | `api_tool_call_streaming_design.md` |
| Anthropic malformed input | Buffered streaming validates tool input, so there is no Anthropic malformed-call path today. If `eager_input_streaming` is enabled, the assembler must hand unparsable input to the D-07 marker | `code-review-report.md` CRR-005; RSK-002 | Recorded as follow-up (handoff summary); the harness header notes it |
| Turn identity | Unique `<turnId>:llm:<n>` per attempt; continuation kinds | `design-spec.md` D-08 | `turn_terminology.md` |
| Step 1 items | See DR-001 section below | | |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `llm/api/completion-status.ts`, stored `completionStatus`/`completionReason` | `finish` + derived getters | `llm_module_design.md` §4.4 |
| `ToolContinuationReadyEvent`, `isToolContinuation` (assembler flag) | `TurnContinuationReadyEvent`, `isTurnContinuation` | `turn_terminology.md`, streaming/lifecycle docs |
| `{}` fallback for malformed arguments relying on schema validation | `argumentsParseError` + `ToolPhase` rejection | `api_tool_call_streaming_design.md` |
| Anthropic `sawToolUse`/`completedNativeTurn` stream flags | `message_stop` finish rules | `llm_module_design.md` §4.4 |
| `MemoryManager.getToolInteractions`, `isCompactionAwaitingUserRetry`, `requirePendingCompactionRequest` | Removed (no production callers) | Not in long-lived docs before; nothing to update |
| Step 1 replacements | See DR-001 section below | |

## Delivery-Owned Non-Doc Edits

- Step 1: `anthropic-llm.ts` whitespace (now also made identically in Step 2's source).
- Step 2: harness header comment.
- No behavior change.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then hold for user verification.

---

## DR-001 (Step 1) Docs Sync — retained

- `llm_module_design.md` §6 `maxTokens`: unset resolves to the model's maximum output tokens through `BaseLLM.resolveMaxOutputTokens()`, with per-adapter parameter names. Anthropic exceptions: the non-streaming default stays at 8192, and streaming fails for an unknown maximum.
- `llm_module_design.md` builder paragraph and `llm_module_design_nodejs.md`: resolved limit under `outputLimitParameter` (`max_tokens` for DeepSeek/GLM, else `max_completion_tokens`).
- `TESTING.md`: "Native output-limit live E2E" row. The core library command is now `pnpm -C autobyteus-ts exec vitest run tests/unit`.
- `agent_memory_design.md` compaction cap and `provider_model_catalogs.md`: no change. Compaction sets `maxTokens` explicitly, and catalog values are unchanged.
- Replaced: the adapters' `protected maxTokens` fields, the Anthropic streaming `?? 8192`, and the builder's `max_completion_tokens` mapping in `applyConfig`.
- Committed on the Step 1 branch as `2a395ee5f`.
