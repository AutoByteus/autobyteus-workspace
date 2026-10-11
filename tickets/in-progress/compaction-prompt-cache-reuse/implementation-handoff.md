# Implementation Handoff — compaction-prompt-cache-reuse

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Large/High) and passed (ARCH-REV-002; SR-007 passed as ARCH-REV-003; SR-009 passed as ARCH-REV-005; SR-010 passed as ARCH-REV-006; SR-011 passed as ARCH-REV-007; SR-012 passed as ARCH-REV-008). The handoff route is decided by `get_handoff_rules` (Large/High → Code Review).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md` (SR-012; approved baseline SR-002; SR-012 accepts an explained empty section (F-9); SR-011 accepts an unwrapped valid summary and makes DeepSeek's cached mode final (F-6/F-7/F-8); SR-010 fits the summary output limit to each request's room (CR-004); SR-008/SR-009 add per-model summary mode (REQ-002), the summary output-limit rule (REQ-009, AC-011) and instruction v5; SR-005 strengthens AC-003: side-by-side summary comparison plus continuation check, user review before release; SR-006 records the IR-002 wording; SR-007 adds REQ-008, the nine-heading contract, stronger AC-003 checks and AC-010)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-revision-record.md` (SR-001..012)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-spec.md` (SR-010; § Intended Change 8–9 were IR-003, 10–12 IR-004, the SR-010 part of 11 IR-005, the SR-011 parts of 8 and 10 IR-006, the SR-012 part of 8 IR-007)
- Supplemental task artifacts:
  - behavior-defining, user-approved: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/cached-summary-instruction.md` (only its two normative blocks, instruction v5 and transcript prompt v6, are copied verbatim into code; the rest is history);
  - evidence only: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/probes/` (`fork-summary-probe.mjs` is the live-validation recipe).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md` (ARCH-REV-008, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/architecture-review-revision-record.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-handoff.md`
- Triggering rework report: `code-review-report.md` CRR-010 F-9, resolved by the reviewed solution revision SR-012 (ARCH-REV-008 Pass); IR-007 implements it. Before that: § Round 8 (F-6, F-7, F-8) → SR-011 → IR-006. Before that: § Round 6 (CRR-006, CR-004) → SR-010 → IR-005. Before that: § Round 5 (CRR-005: F-3, F-4, F-5) and `ac003-summary-quality-report.md` § Round 2 → SR-009 → IR-004.
- Local check summaries: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/implementation-evidence/`

## Current Implementation Summary

1. **Core-owned summarizer (Intended Change 1).**
   - New `memory/compaction/compaction-summarizer.ts` (`CompactionSummarizer`) produces the summary through `memory/compaction/conversation-summary-port.ts` (`ConversationSummaryPort`, `SummaryRequestIdentity`, `SummaryAttemptResult`).
   - `PendingCompactionExecutor` takes `summaryPort` (replacing `createCompressionStrategy`). It calls the summarizer with the compaction baseline messages plus today's transcript content. The plan, validator, commit, recovery and status logic are unchanged.
   - `createEnabledMemoryCompactionConfiguration(policy)` is policy-only.
   - Deleted: `DirectLlmCompressionStrategy`, `CompressionStrategy`, `CompressionStrategyFactory`, `CompactionLlmFactory`, `CompactionCompressionExecution`. Exports are updated.
2. **Cached summary first, same-model fallback (2 and 3).**
   - `summarize` sends the cached request if `fitsInputBudget(baseline, instruction)` passes. That request is the baseline conversation plus `COMPACTION_SUMMARY_INSTRUCTION`, written to the agent in second person (IR-002; text v4 since IR-003, item 9). It gets up to 2 attempts with no backoff.
   - After that comes the transcript request (summary prompt as system, rendered transcript as user): up to 3 attempts with today's 1 s and 2 s backoffs.
   - These count as failed attempts: tool calls, an `incomplete` completion, a parse failure, or a provider error.
   - Attempt numbers are unique across both modes (1..5).
3. **Port on the agent's LLM.** New `agent/loop/llm-phase-summary-port.ts` (`LlmPhaseSummaryPort`), built by `LlmPhase` with the agent id, its LLM, the exact `toolSchemas`, `requestCapacity` and the notifier.
   - **Cached request.** It uses `sanitizeMediaInputMessages`, the same sanitizer as the assembler, plus the instruction as a USER message. Its kwargs and options come from the new shared `agent/loop/conversation-request.ts` (`conversationRequestKwargs`, `conversationRequestOptions`), which `LlmPhase`'s own call now uses too. The options add `retryMode: 'single_attempt'`.
   - **Transcript request.** Kwargs are `{logicalConversationId}` only; options are `{signal, turnId, retryMode:'single_attempt'}`, with no cache scope. It runs the old input-budget check first.
   - Both requests are streamed. Content is collected; any `tool_calls` chunk sets `hasToolCalls`; usage comes from the completing chunk.
   - **Budget.** `fitsInputBudget` checks `estimateMessagesTokens(messages + instruction)` plus a tool-schema estimate (JSON length / 4) against `requestCapacity.inputBudget`. That budget already excludes the output reservation.
4. **Prefix guard before and after compaction (4).**
   - `LLMRequestAssembler.bindRequestPrefix(tools)` is public and single-sourced.
   - `prepareRequest` binds before compaction (only when compaction can run, i.e. not on a tool continuation), then again before the recovery checkpoint.
   - `LlmPhase` binds before the after-final compaction.
5. **Isolation and release (5, ARCH-001, N-1).**
   - Every attempt uses `compaction_<operationId>_<attempt>`, never the agent id.
   - New `BaseLLM.releaseConversation(id, {signal})` is a no-op by default. `AutobyteusLLM` overrides it to call `client.cleanup(id)` if the id was used, then drop it from `usedConversationIds` (it stays there on failure, so `LLM.cleanup` retries later).
   - The port releases in a `finally` block on its own `AbortController`, raced against a 10 s timer. Failures are only logged.
   - Compaction never calls the agent LLM's `cleanup`.
6. **One provider call per attempt (6):** `single_attempt` on both requests.
7. **Metering (7).** One `TOKEN_USAGE_UPDATED` event per attempt that reports usage:
   - `ingestion_kind: 'autobyteus_compaction'`, `runtime_kind: 'autobyteus'`;
   - `llm_call_id: <executionTurnId>:compaction:<operationId>:<attempt>`, `idempotency_key: <agentId>:<llm_call_id>`;
   - `latest_prompt_tokens: null`, `context_window_usage_percent: null`, `effective_context_window_tokens: <capacity>`.
8. **Compaction-model setting removed (8).**
   - Server: deleted `config/compaction-model-settings.ts` and `agent-execution/compaction/compaction-llm-factory.ts`; removed the settings-service registration and the durable-writer special case; removed `compactionLlmFactory` from `AutoByteusAgentRunBackendFactory`, `agent-provider-factory-builder.ts` and `create-process-agent-provider-factory-builder.ts`. The backend now builds `createEnabledMemoryCompactionConfiguration(new CompactionPolicy())`.
   - Web: deleted `CompactionModelSettings.vue`, `utils/compactionModelSettings.ts` and its spec; removed the model parts from `CompactionConfigCard.vue`; removed 9 model i18n keys in en and zh-CN; updated the card description.
   - `CompactionExecutionMetadata` and `CompressionAttemptObservation` gained `mode: 'cached' | 'transcript'`.
9. **Nine-heading contract and approved texts (IR-003, design § Intended Change 8).**
   - `COMPACTION_SUMMARY_HEADINGS` is now the nine headings: Task and constraints; Requests and instructions received; Decisions and findings; Unverified points and open conflicts; Files created or changed; Completed work; Current state; Open work and next steps; Essential references. Both paths use this one contract and the one parser. The parser rules are unchanged, and its heading error now states the count.
   - `COMPACTION_SUMMARY_INSTRUCTION` (v4) and `COMPACTION_SUMMARY_PROMPT` (v6) were extracted programmatically from the supplement's two fenced blocks and written into the source. Each literal was checked byte-equal to its block plus its trailing newline. SHA-256 values: instruction `9349dc8ea05e2bf95edb0ed5e908933487594e788b1c09fbca7eaff347e4ba82`, prompt `c3105f73f70ae7ceb43941cb617f25b57f809842875a33920ff23c046ab224f6`; both are pinned in `compaction-summary-prompt.test.ts`. The only non-ASCII characters are the supplement's own em dashes (two in each text).
   - **IR-006 (SR-011):** `parseCompactionSummary` also accepts a reply with neither marker. It passes the whole reply to the unchanged `validateCompactionSummaryBody`, which trims it and requires it to begin with the first heading. Exactly one wrapped block behaves as before. One marker only, two blocks, out-of-order markers, a preamble or a code fence still fail. The summarizer still rejects tool-call and `incomplete` replies before parsing.
   - **IR-007 (SR-012):** `validateCompactionSummaryBody` treats a section as empty when its first line matches `/^\(none(\)|[\s\u2013\u2014-])/i`, for example `(none)`, `(None)`, `(none) — reason`, `(none — reason)` or `(none) - reason`. Any other section still needs a bullet. Headings, order, start-with-first-heading, marker handling and both prompts are unchanged, and the body is still returned verbatim.
   - Stored six-heading summaries are never re-parsed, so no old-format reader exists (verified by ARCH-REV-003). A test pins that the retired six-heading body is rejected.
10. **Gemini system prompt from the request (IR-003, design § Intended Change 9, REQ-008).**
   - `GeminiLLM` builds `systemInstruction` from `leadingSystemMessages(messages)`: non-empty contents joined with `\n`, as `AnthropicLLM` does. This replaces the configured `this.systemMessage`, in both the 3.8 and the older config builders. Sync and stream share the builder, and the runtime (Gemini API or Vertex) does not affect it.
   - With no leading SYSTEM message, the config has no `systemInstruction` key. Later SYSTEM notes are not included (the renderer still drops them; pre-existing, accepted risk).
   - Effect: the transcript fallback's `COMPACTION_SUMMARY_PROMPT` now reaches Gemini as its system instruction. A normal agent request is unchanged in content, because its leading SYSTEM message is the same text it configures.
11. **Per-model summary mode (IR-004, design § Intended Change 10, REQ-002, CRR-005 F-5).**
   - `LLMModel.compactionSummaryMode: 'cached_conversation' | 'transcript'` (type `CompactionSummaryRequestMode`) defaults to `'transcript'`. That default covers dynamic and custom models (Ollama, LM Studio, the AutoByteus server, OpenAI-compatible endpoints) and any catalog entry without the field.
   - The eight Anthropic catalog entries set `'cached_conversation'`, and so do the two DeepSeek-provider entries (`deepseek-v4-flash`, `deepseek-v4-pro`). The DeepSeek value is final since SR-011, and its "pending rerun" comment was removed in IR-006. The Qwen-hosted `deepseek-v4-pro` entry stays on `'transcript'`; it belongs to the Qwen provider.
   - New `ConversationSummaryPort.usesCachedSummary()`, implemented by `LlmPhaseSummaryPort` from the model. `CompactionSummarizer` checks it before `fitsInputBudget`. When it returns false, the summarizer goes straight to the transcript request with the full 3-attempt budget, so attempt numbers start at 1.
   - Memory and agent code name no provider (checked by grep over the diff).
12. **Summary output-limit override (IR-004, design § Intended Change 11, REQ-009, CRR-005 F-3).**
   - `LLMInvocationOptions.maxOutputTokens?: number`. `BaseLLM.resolveMaxOutputTokens(options)` returns `options.maxOutputTokens ?? resolveRequestMaxOutputTokens(model, config)`. The parameter is required, so the compiler forces every call site to pass its options.
   - Wired into every adapter that sends a limit: Anthropic streaming plus non-streaming (`options.maxOutputTokens ?? config.maxTokens ?? 8192`), OpenAI Responses, OpenAI-compatible (so DeepSeek, GLM, Qwen, Kimi, Grok, MiniMax, LM Studio and generic endpoints), Gemini (both builders), Mistral and Ollama. `AutobyteusLLM` sends no output limit (the remote server owns it), so the override has no effect there, as before.
   - `LlmPhaseSummaryPort` owns the rule in the exported `resolveSummaryOutputTokenOverride(model, config, contextCapacity)`: `R = resolveRequestMaxOutputTokens`; null or ≥ `SUMMARY_OUTPUT_TOKEN_FLOOR` (16,384) → no override; otherwise `max(R, min(16384, model.maxOutputTokens ?? 16384, contextCapacity ? floor(contextCapacity / 4) : 16384))`. Here `contextCapacity` is `requestCapacity.effectiveContextCapacity`, which includes the active-context override. The override is computed once per port and added to both summary requests' options. The shared `conversationRequestOptions` seam is unchanged; the port spreads the override on top.
   - **Superseded by IR-005 (SR-010, CR-004):** the IR-004 "reserve L" budget (`cachedSummaryInputBudget`) is removed. Both paths accept inputs with the agent's own `requestCapacity.inputBudget`: `fitsInputBudget` returns `E ≤ inputBudget`, and the transcript check stays `E > inputBudget → input_budget_exceeded`.
   - **Fitted limit (IR-005).** Each summary request sends `L_eff = max(R, min(L, context − E − safetyMarginTokens))`. `E` is the estimate of exactly what that request sends, made with the same estimator and contents as its input check (N-2): for the cached request, the messages given, the instruction and the tool schemas (`estimateCachedRequest`, shared with `fitsInputBudget`); for the transcript request, the system prompt and the transcript messages (the same array its check uses). With an unknown context, `L_eff = L`. Without an override, no `maxOutputTokens` is sent. This lives in one private `summaryOutputLimit(estimatedInputTokens)`, used through `withOutputLimit` by both request methods. The port holds `R` (`agentOutputLimit`) and `L` (`outputLimitCeiling`). No interface, summarizer or adapter change.
13. **Instruction v5 (IR-004, design § Intended Change 12, CRR-005 F-4/F-5).** `COMPACTION_SUMMARY_INSTRUCTION` was extracted by script from the named section "Cached summary instruction v5 — normative text" and is byte-equal to it (SHA-256 `43da1ce9d9df6b1a00f76d17cc146077d7d9be9699fbef83b023457f445af666`). A diff against v4 shows exactly the five approved sentence edits. The v6 fallback was re-extracted and is byte-identical to the shipped literal. The opening sentence is unchanged, so API/E2E's `assertNoInstructionEcho` marker still matches.

- Implementation cycle: `Rework` (IR-007, reviewed solution revision SR-012 after CRR-010 F-9)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/implementation-revision-record.md`
- Current implementation revision ID: `IR-007`. It accepts an explained empty section (SR-012). IR-006 accepted an unwrapped valid summary and makes the DeepSeek cached mode final (SR-011). IR-005 fitted the summary output limit to each request's room and returns both paths to the agent's input budget (SR-010). IR-004 added the per-model summary mode, the summary output-limit override and instruction v5 (IR-003 added the nine-heading contract, prompt v6 and Gemini `systemInstruction`); see the revision record.
- Related solution revision IDs: `SR-004` (design), `SR-005` (AC-003), `SR-006` (IR-002 wording), `SR-007` (IR-003 scope), `SR-008`/`SR-009` (IR-004 scope), `SR-010` (IR-005 scope), `SR-011` (IR-006 scope), `SR-012` (IR-007 scope; SR-013 is a separate pending proposal and is not implemented)
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`, `ARCH-REV-005`, `ARCH-REV-006`, `ARCH-REV-007`, `ARCH-REV-008`
- Related code-review revision IDs: `CRR-001` (Pass, IR-001), `CRR-002` (Pass, IR-002), `CRR-004` (Pass, IR-003), `CRR-005` (failure-origin: F-3, F-4, F-5), `CRR-006` (CR-004), `CRR-007` (Pass, IR-005), Round 8 (F-6, F-7, F-8), `CRR-009` (Pass, IR-006), `CRR-010` (F-9)
- Related API/E2E revision IDs: see `api-e2e-revision-record.md` (API/E2E-owned; AC-003 runs on IR-001/IR-002)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CRR-010 `F-9` (through SR-012); Round 8 `F-6`, `F-7`, `F-8` (through SR-011); CRR-006 `CR-004` (through SR-010); before that CRR-005 `F-3`, `F-4`, `F-5` (through SR-009). N-1 is still applied. ARCH-004 is respected: no test requires the transcript fallback to cover the kept tail.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three packages plus test-support changed. The shared `EnabledMemoryCompactionConfiguration` contract and the executor options changed, `BaseLLM` gained `releaseConversation`, a persisted setting was removed, and the work interacts with Anthropic's preserved-thinking check.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None`. The escalation triggers were checked:
  - The only compaction callers are `LlmPhase` and `LLMRequestAssembler` (grep).
  - No product consumer of `createCompressionStrategy` or the setting key exists outside the designed files. The test-only consumer `test-support/live-e2e/live-e2e-harness.ts` was migrated (below). Applications and the message gateway have no references.
  - Streaming is used for both paths, so no non-streaming limit applies.
  - The server projection accepts `autobyteus_compaction` events (tested).
  - No live fork was run here, so a fork 400 has not been observed.
  - IR-004: the agreed seams are unchanged except one approved addition: `ConversationSummaryPort.usesCachedSummary()` (design § 10). `conversationRequestOptions` keeps its signature; the override is added on top by the port. `BaseLLM.resolveMaxOutputTokens` is protected and gained a required `options` parameter. It has no callers outside the adapters (grep over core, server, test-support).
  - IR-003: the agreed seams (`ConversationSummaryPort`/`SummaryAttemptResult`/`SummaryRequestIdentity`, `LlmPhaseSummaryPort`, `conversationRequestKwargs`/`conversationRequestOptions`, `LLMRequestAssembler.bindRequestPrefix(tools)`, `BaseLLM.releaseConversation(id,{signal})`) are unchanged. Only one adapter changed (Gemini). It was the only adapter reading `this.systemMessage` (grep over `src/llm`).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Cached summary request on the agent's LLM, then same-model fallback; plan, validator and commit preserved | `compaction-summarizer.ts`, `conversation-summary-port.ts`, `pending-compaction-executor.ts`, `llm-phase-summary-port.ts`, `conversation-request.ts`, `llm-phase.ts` | Done. AC-001: the port test compares real Anthropic request bodies (normal request vs. cached summary request: system, tools, thinking, max_tokens, cache_control equal; messages prefix equal; then the reply and the instruction). The runtime integration also checks the cached request against the agent's last request through the real `LlmPhase`/after-final path. AC-004: summarizer tests (tool call, invalid, incomplete, provider error, budget overflow, exhaustion) |
| BEH-001 (isolation) | Compaction never posts into the agent's provider session; sessions released | `BaseLLM.releaseConversation`, `AutobyteusLLM.releaseConversation`, port `finally` release | Done. AC-009 with a fake `AutobyteusLLM` client: ids `compaction_op_12_1/2`, cleanup for exactly those ids, the agent session untouched, `llm.cleanup` not called; abort releases with a live signal (N-1); a hanging release is bounded to 10 s |
| BEH-002 | Compaction-model setting removed | server and web removals above | Done. AC-005: the web card spec (no model control, a leftover value never written, remaining settings save); server settings unit and GraphQL e2e (leftover value inert, generic custom and deletable, startup unaffected) |
| BEH-003 | Compaction metered | port `reportUsage` | Done. AC-007 unit: port event shape; server fold test (compaction events add to totals and cost, priced with cache components) |
| BEH-001 (REQ-003, IR-003) | One nine-heading contract for both paths, approved texts | `compaction-summary-parser.ts`, `compaction-summary-prompt.ts` | Done. Hash pins for both texts; the block skeleton in both equals the nine headings; per-heading guidance present and ordered in both; the retired six-heading body is rejected |
| BEH-001 (REQ-008, AC-010) | Gemini `systemInstruction` equals the request's leading SYSTEM messages; none when absent; normal requests unchanged | `gemini-llm.ts` `systemInstructionOf`, both config builders | Done (unit). Request bodies for 3.8 and 3.1 Pro × Gemini API and Vertex × sync and stream: leading run joined, late note excluded, configured prompt ignored; no `systemInstruction` without a leading SYSTEM message; normal agent request equals the configured prompt; the transcript fallback through `LlmPhaseSummaryPort` carries `COMPACTION_SUMMARY_PROMPT` (single-attempt client, both runtimes). The installed-SDK loopback wire test checks the serialized `systemInstruction` and its absence. The live Gemini fallback run is still to do (API/E2E) |
| BEH-001 (REQ-002, IR-004) | Cached summary only for models that select it | `models.ts`, Anthropic and DeepSeek catalog entries, `conversation-summary-port.ts`, `compaction-summarizer.ts`, port `usesCachedSummary` | Done. Summarizer: transcript-only branch (no budget check, no cached call, attempts 1..n with backoff; exhaustion after 3). Catalog: every definition checked (Anthropic and DeepSeek provider cached, all others transcript); dynamic and custom default to transcript; the port reports the mode |
| BEH-001 (REQ-009, AC-011) | Summary output limit raised only for a known small agent limit | `llm-phase-summary-port.ts` `resolveSummaryOutputTokenOverride`, `withOutputLimit`, `cachedSummaryInputBudget`; `base.ts`; all adapters | Done (unit and integration). All 8 worked-example rows pass, plus bounds tests (never below R, model max cap, unknown context). On the Anthropic wire: Opus at 1,024 gives both summary requests 16,384, the agent request keeps 1,024, and system/tools/thinking/cache_control and the message prefix are equal; Opus without a limit sends 128,000 everywhere. Unknown limit: no override. Budget reservation verified. Adapter request bodies (sync and stream) show the override wins and requests without it are unchanged: Anthropic, OpenAI Responses, DeepSeek, generic OpenAI-compatible, Gemini 3.1/3.8, Mistral, Ollama. Runtime integration through the real `LlmPhase`: every summary request carries 3,000 (agent limit 200, context 12,000). The live 1,024-token scenario is still to do (API/E2E) |
| BEH-001 (REQ-009, SR-010, IR-005) | Limit fitted to each request's room; both paths accept with the agent budget | `llm-phase-summary-port.ts` `summaryOutputLimit`, `estimateCachedRequest`, `fitsInputBudget`, `requestTranscriptSummary` | Done (unit). New `llm-phase-summary-fitted-limit.test.ts` mocks only the estimator to set E exactly. Transcript rows: Ollama 8k at E 4,000 → 2,048, 6,500 → 1,436 (input + output = context − margin), 6,912 → 1,024; 7,000 → `input_budget_exceeded` with no provider call; Ollama 32k at E 26,000 → 6,512. No override: no `maxOutputTokens` on either path. Cached row: Opus at 1,024, E 990,000, accepted with budget 998,720 (inside the SR-009 window, so still cached) and sends 9,744. Also: cached accept boundary 6,912/6,913; tool schemas count in both decision and limit (N-2); unknown context gives L. The real-estimator test in `llm-phase-summary-output-limit.test.ts` checks the largest accepted input in the old window is accepted, with input + output ≤ context − margin |
| BEH-001 (REQ-003, SR-012, IR-007) | Explained empty section accepted | `compaction-summary-parser.ts` `EMPTY_SECTION` in `validateCompactionSummaryBody` | Done (unit). Accepted, wrapped and unwrapped: `(none)`, `(None)`, `(NONE)`, `(none) — x`, `(none — x)`, `(none) - x`, `(none – x)`, and `(none)` followed by a bullet. Rejected: `(nonexistent …)`, bare `none`, `none — x`, an empty section, a prose sentence, prose ending in `(none)`. Summarizer: the recorded round-4 Sonnet 5 section shapes are accepted on the first transcript attempt. One-off, uncommitted check: all 3 recorded Sonnet 5 history B replies that include their text (`api-e2e-evidence/round4/ac003-sonnet-tonly-B`) now parse; `…-run1` stores no reply text |
| BEH-001 (REQ-003, SR-011, IR-006) | Unwrapped valid summary accepted; malformed markers rejected | `compaction-summary-parser.ts` `parseCompactionSummary` | Done (unit). Accepted: unwrapped body (also with surrounding blank lines and CRLF). Rejected with `CompactionSummaryValidationError`: preamble, code fence, missing heading, reordered headings, section without bullets, opening marker only, closing marker only, markers out of order, two blocks. The earlier wrapped cases are unchanged. Summarizer: an unwrapped transcript reply is accepted on the first attempt; an `incomplete` unwrapped valid reply fails with `incomplete_summary` on all 3 attempts; tool-call replies are rejected even with a valid body |
| BEH-001 (REQ-001, IR-004) | Instruction v5 | `compaction-summary-prompt.ts` | Done. Hash pin plus the five v5 sentences asserted |
| BEH-004 | Guard before and after compaction | `llm-request-assembler.ts` `bindRequestPrefix`; `llm-phase.ts` after-final bind | Done. AC-006 unit: real `MemoryManager`; tools changed means compaction sees no thinking; order test (bind → compaction → bind → checkpoint) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- **New, core:** `src/memory/compaction/compaction-summarizer.ts`, `src/memory/compaction/conversation-summary-port.ts`, `src/agent/loop/llm-phase-summary-port.ts`, `src/agent/loop/conversation-request.ts`.
- **Changed, core:** `src/memory/compaction/{pending-compaction-executor,compaction-execution,memory-compaction-configuration,compaction-summary-prompt}.ts`, `src/memory/index.ts`, `src/agent/llm-request-assembler.ts`, `src/agent/loop/llm-phase.ts`, `src/llm/base.ts`, `src/llm/api/autobyteus-llm.ts`.
- **Deleted, core:** `src/memory/compaction/{direct-llm-compression-strategy,compression-strategy}.ts`.
- **Server:**
  - deleted `src/config/compaction-model-settings.ts` and `src/agent-execution/compaction/compaction-llm-factory.ts`;
  - changed `src/services/server-settings-service.ts`, `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `src/agent-execution/providers/agent-provider-factory-builder.ts`, `src/compositions/create-process-agent-provider-factory-builder.ts`.
- **Web:** deleted `components/settings/CompactionModelSettings.vue`, `utils/compactionModelSettings.ts`; changed `components/settings/CompactionConfigCard.vue` and `localization/messages/{en,zh-CN}/settings.ts`.
- **test-support:** `live-e2e/live-e2e-harness.ts`.
  - There is now one capture on the agent's LLM, split by conversation id.
  - `inspectSummaryRequest` (renamed from `inspectDirectSummaryRequest`) validates both cached and transcript summary requests.
  - The `directSummary*` evidence fields became `summary*`, and new fields were added: `summaryOnAgentModelVerified` and `summaryModes`.
  - New check: every summary request ran on the primary model.
- **Tests:**
  - New core: `tests/unit/memory/compaction-summarizer.test.ts`, `tests/unit/memory/compaction-summary-prompt.test.ts` (prompt hash moved here plus the instruction hash), `tests/unit/agent/loop/llm-phase-summary-port.test.ts`.
  - New server: `tests/unit/token-usage/projections/token-usage-compaction-ingestion.test.ts`.
  - Adapted: executor harness, assembler, configuration, agent-config/factory, the runtime compaction integration, the server recovery fixture, backend-factory unit and integration tests, provider builder, settings service and GraphQL e2e, the live boundary unit test, the live quality and capabilities e2e, and the web card spec.
  - Deleted (they tested only removed code): core `direct-llm-compression-strategy.test.ts`; server `config/compaction-model-settings.test.ts`, `compaction/compaction-llm-factory.test.ts`, `compaction/compaction-parent-credentials.test.ts`, `compaction/compaction-provider-requests.test.ts`; web `CompactionModelSettings.spec.ts`.
- **IR-007:** `src/memory/compaction/compaction-summary-parser.ts`; tests `tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/unit/memory/compaction-summarizer.test.ts`; docs `autobyteus-ts/docs/agent_memory_design.md`.
- **IR-006:** `src/memory/compaction/compaction-summary-parser.ts`, `src/llm/supported-model-definitions.ts`; tests `tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/unit/memory/compaction-summarizer.test.ts`; docs `autobyteus-ts/docs/agent_memory_design.md`.
- **IR-005:** `src/agent/loop/llm-phase-summary-port.ts`; tests new `tests/unit/agent/loop/llm-phase-summary-fitted-limit.test.ts`, changed `tests/unit/agent/loop/llm-phase-summary-output-limit.test.ts` (the "reserves L" test replaced); docs `autobyteus-ts/docs/agent_memory_design.md`.
- **IR-004:** `src/llm/{models,base,anthropic-supported-model-definitions,supported-model-definitions}.ts`, `src/llm/api/{anthropic,gemini,mistral,ollama,openai-compatible,openai-responses}-llm.ts`, `src/memory/compaction/{conversation-summary-port,compaction-summarizer,compaction-summary-prompt}.ts`, `src/agent/loop/llm-phase-summary-port.ts`. Tests: new `tests/unit/agent/loop/llm-phase-summary-output-limit.test.ts`; changed `tests/unit/llm/api/request-output-limit.test.ts`, `tests/unit/memory/compaction-summarizer.test.ts`, `tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/integration/agent/runtime/agent-runtime-compaction.test.ts` (its models select the cached summary, and a REQ-009 assertion was added). Docs: `autobyteus-ts/docs/{agent_memory_design,llm_module_design,llm_module_design_nodejs}.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`.
- **IR-003:** `src/memory/compaction/{compaction-summary-parser,compaction-summary-prompt}.ts`, `src/llm/api/gemini-llm.ts`; tests `tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/unit/llm/api/gemini-llm.test.ts`, `tests/integration/llm/api/gemini-llm-wire-contract.test.ts`, server `tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts` (heading check now uses `COMPACTION_SUMMARY_HEADINGS`); docs `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` (the stale strategy paragraph now describes the summarizer).
- **Docs:** `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-server-ts/docs/{ARCHITECTURE.md,modules/agent_memory.md}`; `autobyteus-web/docs/{settings.md,agent_execution_architecture.md}`.

## Important Assumptions

- **Optional summarizer seam.** `PendingCompactionExecutorOptions` keeps an optional `summarizer?: CompactionSummarizer`, following the existing optional `planner` and `outputValidator`. The executor lifecycle tests stay focused and fast (the real summarizer waits 1 s and 2 s between transcript retries); summary production has its own tests. Production always uses `new CompactionSummarizer(summaryPort)`.
- **`SummaryAttemptResult` has no separate `completion` field.** The design listed one, but it would duplicate `metadata.completionStatus`, so it was left out to keep the shared structure tight.
- **Streamed attempts report completion from the terminal chunk's `finish`** (added upstream). Unreported means `unknown`. Streaming is needed because the agent's own `maxTokens` would break non-streaming SDK calls.
- **No backoff between the 2 cached attempts.** The fallback is the recovery path. The transcript path keeps today's 1 s and 2 s backoffs.
- **The "before" bind runs only when compaction can run** (not on tool continuations). This avoids a redundant digest on every continuation. The "after" bind always runs, as before.
- **IR-004 transcript-check question: resolved by SR-010 (CR-004).** Neither path reserves L; each request's limit is fitted to its room instead (IR-005).
- **IR-005, E from the messages given, not the sanitized ones.** The cached limit uses the same estimate as `fitsInputBudget`, i.e. the baseline messages before media sanitization (N-2). The design allows the sanitized messages, which are never larger; using the unsanitized ones keeps the accept decision and the limit on the identical `E`. At most that makes the limit a little smaller, never larger.
- **IR-004, the ceiling is computed once per port.** `LlmPhase` builds a port per run with that run's LLM and capacity, the same lifetime as `requestCapacity`.
- **A user retry of a failed compaction reuses the operation id**, so conversation ids `compaction_<op>_<n>` can repeat across executions. This is harmless: each is released after its attempt, and `llm_call_id` and `idempotency_key` include the new execution turn.

## Known Risks

- **The latest-prompt reading clears after a compaction event.** The server projection treats the newest observation as authoritative for the latest-prompt and context-fill fields. A compaction event, with a null latest prompt, therefore sets them to null until the agent's next request reports again. Totals and cost are correct (REQ-007). The meter does not reject the events, so this is not the design's escalation trigger. Changing the projection is outside the designed scope. The behavior is pinned by the server fold test; Solution Designer and API/E2E can decide whether to keep it.
- **Leftover setting value.** The design says the server "neither lists nor accepts" the key, and also allows generic listing as long as it is not shown as a compaction setting. A value saved before the removal is therefore listed only as a "Custom user-defined setting" (deletable, no effect, not on the Compaction card). The project's `retiredSettingNames` mechanism would delete it at startup, which the design explicitly rejected. If it should be hidden instead, that needs a small non-deleting retirement guard; this is a designer call.
- **Gemini single-attempt:** the previously reported `compaction-single-attempt-transport` failure passes on the merged base `e50826755`, so it appears to have been fixed upstream. Compaction on Gemini agents relies on that single-attempt path.
- **Provider instruction-following** (design risk): handled by the parser plus the fallback. Validate one non-Anthropic provider live.
- **Transcript path on Gemini:** resolved in IR-003 (REQ-008). Gemini now takes the system prompt from the request, so the fallback's summary prompt is its system instruction. Accepted, pre-existing: Gemini's renderer still drops SYSTEM notes that come after the leading run.
- **DeepSeek catalog value:** final as `'cached_conversation'` since SR-011.
- **N-3 (ARCH-REV-007, accepted, non-blocking):** an unwrapped reply truncated inside its last section, on a provider that reports `completionStatus: 'unknown'` (AutoByteus), would still validate, because there is no closing marker to show the cut. `incomplete` replies are rejected before parsing (tested). API/E2E should note any `'unknown'`-status truncation it observes.
- **IR-004, API/E2E-owned live tests affected by the new behavior (not edited here):**
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` OLR-E2E-010 (uncommitted API/E2E work). It asserts that every summary call carries `max_tokens == SUMMARY_CUT_LIMIT` and that a blocked operation runs `cached, cached, transcript ×3`. Under REQ-009, a known agent limit below 16,384 is raised for summary requests. Under REQ-002, the mode sequence depends on the model's catalog value (transcript-only gives `transcript ×3`). The scenario premise needs revisiting.
  - `autobyteus-compaction-cache-reuse-live.e2e.test.ts`: `assertNoInstructionEcho` still works with v5 (same opening sentence).
- **Accepted (ARCH-REV-003):** OBS-1 (superseded for small known limits by REQ-009) (a small configured `maxTokens` can truncate the summary; it is then classified `incomplete_summary` and falls back); the cached path can cost slightly more than the transcript path (history A: $0.12 vs $0.08).
- **Small wording changes stay hash-pinned:** any change to either text must come from the approved supplement and update the pinned hash.
- **Summary overlap with the kept tail** (DEC-002): the existing `post_compaction_target_exceeded` handling applies.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change + Refactor + cost Performance
- Reviewed root-cause classification: Boundary Or Ownership Issue + Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - `memory/compaction/compaction-summarizer.ts` and `conversation-summary-port.ts` import no `agent/**` or `llm/api/**` code; the design's dependency rule holds.
  - The pre-existing `agent/**` imports in `pending-compaction-executor.ts` (error and reporter types) are unchanged.
  - The old strategy's `agent/token-budget` import is gone.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no dual path; the transcript request is only the summarizer's recovery path.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`:
  - the direct strategy, its types and factory;
  - the server factory, parser and settings entry;
  - the web component, util and i18n;
  - `getParentModelIdentifier` from `PendingCompactionExecutionInput` and `LlmRequestAssemblyIdentity` (it existed only to choose the compaction model);
  - tests of removed code;
  - the `setDurably` special case.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest changed: server backend factory 478 non-empty lines (it shrank), `llm-phase.ts` 367; new files are 20–121 lines. IR-003: `gemini-llm.ts` 375 lines total.
- Notes: the design file list omitted the test-support live harness, which imported the removed factory. It was migrated as part of the removal, and its evidence semantics are flagged for API/E2E review.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (the setting value is inert); compaction output and snapshots `Not Affected`; usage rows are new rows through the existing pipeline.
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the decision: `Yes`. No code reads the key. Startup with a saved value is tested in the GraphQL e2e (restart from `.env`).
- Direct-use evidence: server settings unit and GraphQL e2e (saved value is inert, listed as a deletable custom setting, deletion works); web card spec (never written).
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`, branch `codex/compaction-prompt-cache-reuse`. Started on `origin/personal@46e94fdea`; **merged `origin/personal@e50826755`** (43 commits, including the anthropic-incomplete-content-block fix and Step 2), per the Solution Designer.
- Merge resolution:
  - took upstream's `isTurnContinuation` (tool-result or recovery continuation) in place of `isToolContinuation`; the before-compaction bind uses it;
  - kept `getParentModelIdentifier` removed;
  - used upstream's new terminal-chunk `finish` in the port, so summary attempts now report real `completionStatus`/`completionReason` (`completionStatusOf(finish)`), and a truncated (`output_limit`) cached summary is classified `incomplete_summary`;
  - merged upstream's AR-002 call-id assertions with the compaction usage event (the agent-call filter is `:llm:`; the compaction call id is asserted separately);
  - used `getPendingCompactionGate()` (upstream removed `isCompactionAwaitingUserRetry`);
  - kept the strategy test deleted (upstream had only adapted it to `finish`).
- Commits: `cec24ca48` (implementation), `846fff306` (merge), plus a follow-up commit for post-merge test fixes and this handoff.
- `nuxt prepare`, `prisma generate` and `prepare:shared` were run for tests.
- `test:integration:prepare` creates untracked build outputs (SDK, devkit and Brief Studio `dist/`). They are never staged.
- Baseline comparisons used a temporary detached base worktree at `/tmp/ccr-base`, which is removed after use.

## Local Implementation Checks Run

**IR-007 (current code, HEAD `090353579` plus the IR-007 commit):**
- autobyteus-ts production typecheck: pass; the changed test files have no type errors.
- autobyteus-ts `vitest run tests/unit --maxWorkers=4`: 307 files, **2045 tests, all passed**. Runtime compaction integration: 6/6.
- Server: `prepare:shared` and `typecheck` pass. `vitest run tests/unit --maxWorkers=4`: 666 files passed, 4 skipped; 5232 tests passed.
- Web: not rerun; no web code changed.
- Note for delivery (ARCH-REV-008): the server test `native-compaction-terminal-drain.test.ts` is load-sensitive.

**IR-006 (HEAD `97fd9a814` plus the IR-006 commit):**
- autobyteus-ts production typecheck: pass; the changed test files have no type errors.
- autobyteus-ts `vitest run tests/unit --maxWorkers=4`: 307 files, **2030 tests, all passed**. Runtime compaction integration: 6/6.
- Server: `prepare:shared` and `typecheck` pass. `vitest run tests/unit --maxWorkers=4`: 666 files passed, 4 skipped; 5232 tests passed. `standalone-agent-run-root/*` and `agent-run-manager` integration: 4 files, 33 tests passed.
- Web: not rerun; no web code changed.

**IR-005 (HEAD `13648b147` plus the IR-005 commit):**
- autobyteus-ts production typecheck: pass. The changed and new test files have no type errors.
- autobyteus-ts `vitest run tests/unit`: 307 files, **2017 tests, all passed**. `tests/unit/agent/loop`, `tests/unit/memory` and runtime compaction integration: 53 files, 412 tests passed. The runtime integration still sees 3,000 on every summary request, because its inputs are small.
- Server: `prepare:shared` and `typecheck` pass. `vitest run tests/unit --maxWorkers=4`: 666 files passed, 4 skipped; 5232 tests passed. (A first combined run was killed with exit 137, apparently out of memory; it was rerun alone.) Compaction-related integration: 5 files, 39 tests passed.
- Web: not rerun; no web code changed.

**IR-004 (HEAD `1153984ee` plus the IR-004 commit):**
- autobyteus-ts production typecheck (`tsconfig.build.json`): pass. The new and changed test files gained no type errors. I added `canonicalName` to the three runtime-test models I edited. The remaining errors in that file (`mockImplementation` return types) and `gemini-llm.test.ts:64` are on unchanged lines and were present at HEAD.
- autobyteus-ts `vitest run tests/unit`: 306 files, **2005 tests, all passed**. Focused afterwards: `tests/unit/{agent,memory,llm}` plus runtime compaction integration, 193 files and 1332 tests passed.
- autobyteus-ts integration: `agent-runtime-compaction.test.ts` 6/6 and `gemini-llm-wire-contract.test.ts` 4/4.
- Server: `prepare:shared` passes and `typecheck` exits 0. `vitest run tests/unit`: 666 files passed, 4 skipped; 5232 tests passed. Integration: `standalone-agent-run-root/*`, `agent-run-manager` and `memory-layout-and-projection` pass (5 files, 39 tests; prerequisites check OK).
- Verbatim check: v5 and v6 byte-equal to their named supplement sections (`true true`).
- Web: not rerun; no web code changed.

**IR-003 (HEAD `8d0a98eb5` plus the IR-003 commit):**
- autobyteus-ts production typecheck (`tsconfig.build.json`): pass. In the test-config typecheck, the changed files gained no errors. The remaining errors in `tests/unit/llm/api/gemini-llm.test.ts:64` (an `it.each` signature) and the live `tests/integration/llm/api/gemini-llm.test.ts` were present at HEAD.
- autobyteus-ts `vitest run tests/unit`: 305 files, **1977 tests, all passed** (up from 1955: the prompt, parser and Gemini tests).
- autobyteus-ts integration: `agent-runtime-compaction.test.ts` 6/6 and `gemini-llm-wire-contract.test.ts` 4/4 (installed SDK over loopback HTTP).
- Server: `prepare:shared` then `typecheck`: pass. `vitest run tests/unit`: 666 files passed, 4 skipped; 5232 tests passed (includes the recovery fixture and live-boundary unit test that use `COMPACTION_SUMMARY_HEADINGS`).
- Web: not rerun. IR-003 changes no web code, and no web file contains summary heading text (grep).
- Verbatim check: both literals compared byte-for-byte with the supplement's fenced blocks (script output `true true`).

**IR-001 (and IR-002, see the revision record):** all are implementation-scoped. No API/E2E or live-provider checks were run. Results are on the **merged** code (`846fff306` plus follow-up), unless marked pre-merge.

- autobyteus-ts production typecheck: pass.
- autobyteus-ts test-config typecheck: 276 error lines against 282 on base `e50826755`; no file gained errors. The six pre-existing assembler identity errors are fixed.
- Server production typecheck: pass.
- autobyteus-ts `vitest run tests/unit`: 305 files, 1955 tests, **all passed**.
- autobyteus-ts `vitest run tests/integration`: 47 failed, 215 passed, 28 skipped. The set of failing tests is **identical to base `e50826755`** (diffed). These are live-provider tests without credentials, MCP server tests and the older suite failures recorded in the previous ticket.
- Server `test:unit`: 666 files passed, 4 skipped; 5232 tests passed (`implementation-evidence/server-test-unit.summary.log`).
- Server `test:integration:prepare` + `test:integration`: 356 passed, 2 failed, 68 skipped. The 2 failures are the documented TESTING.md known exception (`agent-status-websocket` content-cadence cases) (`implementation-evidence/server-test-integration.summary.log`).
- Web `test:nuxt`: 592 files, 4094 tests passed. Web `test:electron`: 36 files, 191 tests passed.
- Focused (pre-merge, re-covered by the suites above): summarizer 11/11, port 10/10 (including the post-merge finish test), prompt 16/16, executor and lifecycle 29/29, runtime compaction integration 6/6.
- Mutation checks (pre-merge):
  - removing the before-compaction bind fails the AC-006 and order tests;
  - releasing on the attempt's signal fails the abort and bounded-release tests.
- **Test robustness fix (server).** `agent-run-compaction-recovery.test.ts` › "finishes answered A once…" read A's command-registry state right after the turn ended. The record settles asynchronously, and the longer failed-compaction path (retries plus 3 s backoff) exposed the race in about 1 of 3 full runs.
  - The test now waits for `COMPLETED` within its `eventually`.
  - Per-test timeouts in the fixture-dependent compaction tests were raised to cover the summarizer backoff.
  - After the fix: 4 of 4 folder runs green, and the full suite green.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Server Settings → Basics → Compaction card. The model selector, model config and invalid-model message were removed; the description text changed.
- Approved UI/UX references: requirements BEH-002 and REQ-005; design DS-004. There is no UI/UX spec ("A compaction-settings UI change" is otherwise out of scope).
- Existing design system reviewed: the card keeps its existing `space-y-4` layout, inputs, save button and alerts unchanged.
- Rendered surface used: component-level DOM rendering through the project's web unit tests (happy-dom) for `CompactionConfigCard` and `ServerSettingsCompactionFailure`. They cover the absence of the model select, the remaining controls' values, save sequencing, the error state, invalid input and node-binding reset.
- Limitation: no live browser or desktop render. No existing browser probe covers settings, and a full-stack render needs an isolated app build. The change is a pure removal of one control group from an existing vertical stack. The design already plans the desktop check ("Desktop: the Settings card has no model option") for API/E2E and user verification.

## Downstream Coverage Hints / Suggested Scenarios

- Code Review focus:
  - the summarizer attempt budget and failure classification;
  - the port request construction sharing `conversation-request.ts` with `LlmPhase`;
  - the release lifecycle on its own controller;
  - guard ordering;
  - the policy-only configuration;
  - the harness migration;
  - the two known risks (latest-prompt clearing, leftover listing).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Run through the test vault, using `probes/fork-summary-probe.mjs` as the recipe.

**AC-003, strengthened in SR-005 (user review before release):**
- **Large real conversation.** Use ≥ 200k tokens on Claude Opus 5.5, for example a long native agent or team-member run. Build the compaction baseline from its working context.
- **Both summaries on the same history.** `LlmPhaseSummaryPort` (`autobyteus-ts/src/agent/loop/llm-phase-summary-port.ts`) exposes both requests publicly, so a test-only harness needs no production change:
  - construct the port on the agent's own LLM (`{ agentId, llm, tools: <the agent's tool schemas>, requestCapacity: resolveLlmRequestCapacity(llm.model, llm.config), notifier: null }`);
  - call `requestCachedSummary(baselineMessages, COMPACTION_SUMMARY_INSTRUCTION, identity, signal)`;
  - call `requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, new CompactionContentBuilder().build(plan.compactableUnits), identity, signal)`, using `WorkingContextMessageWindowPlanner.plan(...)` on the same baseline;
  - parse each with `parseCompactionSummary`;
  - use distinct `attempt` values, which gives distinct isolated conversations.
- **Side-by-side checklist.** Task and constraints; user decisions and preferences; the latest unresolved request; completed vs open work; exact paths, identifiers, commands and errors; next steps; no invented facts. SR-007 adds: gap A is flagged as unverified; gap B is kept or flagged as a conflict; every file written by a tool call in the compacted part is listed with its exact path; nothing from the system prompt is restated; all paths are complete; every request is marked open, done or cancelled; no needless repetition across sections (requirements AC-003; supplement § Validation).
- **Continuation check.** Build both compacted contexts from the same baseline and plan, using each summary:
  - via `memoryManager.prepareCompaction(baseline, { selectedNewRawTraceIds: plan.rawTraceIdsToArchive, retainedMessages: plan.retainedMessages, summary, budgetAssessment: plan.budgetAssessment })`, on two separate `MemoryManager` copies of the run (or `AcceptedCompactionBuilder` directly), then commit each;
  - give both the same next user message(s) and let each continue for a few calls;
  - evaluate: knows the current state; keeps earlier decisions and constraints; no redone work and no lost open items; correct paths and identifiers.
- **Report.** Summaries, continuation transcripts and checklist verdicts, for user review. A worse cached result on any item goes back to the Solution Designer.
- The reworked `real-e2e-compaction-quality.e2e.test.ts` currently runs the summarizer (cached first, transcript fallback) on a small scripted history. It is a starting point, not the AC-003 comparison.

- **AC-002/AC-003, Anthropic Opus 5.5.**
  - Set up a native run that reaches compaction (lower the trigger ratio). Use the strict preserved-thinking check (`thinking.block_binding.prefix_mismatch_behavior: "error"`, beta `thinking-binding-controls-2026-08-01`, validation only).
  - The summary call's `cache_read_input_tokens` must be ≥ 90 % of its input.
  - The summary passes the parser. The run continues after compaction. The meter shows the `autobyteus_compaction` call.
  - Compare quality with the transcript path on the same history (the reworked `real-e2e-compaction-quality.e2e.test.ts` reports `modes` and `attempts` per scenario).
- **AC-006, live.** Change tools (a media default model) before a compaction turn. Expect no 400.
- **AC-008.** One non-Anthropic native provider compacts, through the cached request or the fallback. The harness reports `summaryModes`.
- **Live harness review.** `test-support/live-e2e/live-e2e-harness.ts` and the `real-e2e-*` consumers were migrated without live execution here. Please validate their evidence semantics (`summary*` fields, `summaryOnAgentModelVerified`, the cached-mode source evidence).
- **Desktop.** The Settings card has no model option. The user verifies the meter (AC-007).
- **IR-007 (per SR-012):** rerun Sonnet 5 transcript-only on history B, and on A as a regression check.
- **IR-006 (per ARCH-REV-007, AC-003 SR-011 bar):** rerun the transcript-only path on Sonnet 5 and DeepSeek with histories A and B; an accepted summary within 3 attempts is required. No quality comparison is needed for those models. Also still open: CR-003, AC-010, and the remaining AC-003 release-bar items. Note any `'unknown'`-status truncation (N-3).
- **IR-005 (per ARCH-REV-006):** OLR-E2E-010 must assert the REQ-009/SR-010 limit, not `SUMMARY_CUT_LIMIT` (CR-001/C-020, API/E2E-owned). For an input near the context end, the expected limit is `max(R, min(L, context − E − margin))`.
- **IR-004 (per ARCH-REV-005 and design § Guidance For Implementation, SR-008):**
  - **AC-011 live:** the repository's real-provider DeepSeek compaction scenario with `max_tokens: 1024` succeeds; the summary request bodies carry `min(16384, model max, context ÷ 4)` (16,384 for `deepseek-v4-pro`). On Anthropic, the summary call's cache read is unchanged with the floor.
  - **AC-003 rerun with v5:** Opus 5.5, one more Anthropic model, and DeepSeek. Gemini runs must show no instruction echo (`assertNoInstructionEcho`). If DeepSeek fails, report to the Solution Designer; do not flip the catalog value.
  - **REQ-002 live:** a non-selecting model (for example Gemini) compacts through the transcript path only.
  - Revisit OLR-E2E-010 (see Known Risks).
- **IR-003 reruns (per ARCH-REV-003):**
  - **AC-003** on histories A (464,106 tokens) and B (194,548 tokens) with instruction v4 and prompt v6, using the conditions above.
  - **AC-010:** a live Gemini transcript-fallback run on both the Gemini API and Vertex. The summary must pass the nine-heading parser, and the request's `systemInstruction` must be `COMPACTION_SUMMARY_PROMPT`.
  - **API/E2E-owned test to update:** the untracked `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` (line 220) still expects `## Goal and constraints` in the next agent request. Under the nine-heading contract that must become `## Task and constraints` (or use `COMPACTION_SUMMARY_HEADINGS[0]`). I did not edit it because the file is API/E2E's uncommitted work.
