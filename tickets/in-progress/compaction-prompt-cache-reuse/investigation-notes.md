# Investigation Notes

## Investigation Meta

- Package identifier: `compaction-prompt-cache-reuse`
- Request / ticket: Project Task `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5` (from `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/compaction-prompt-cache-reuse`
- Resolved base remote / branch / revision: `origin` / `personal` / `46e94fdea86ad9af7d8884e690721b373d754cea` (fetched 2026-10-09). It includes the delivered `anthropic-prompt-caching` (v1.4.99-beta.9), so the dependency is met.
- Finalization target: `origin` / `personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts` succeeded.
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read: `references/requirements-engineering.md` and templates (read earlier in this conversation, 2026-10-09; per the skill not re-read); repository `AGENTS.md`, `DESIGN.md`, `TESTING.md` (read earlier, 2026-10-09).
- Investigation status: requirements and architecture investigation complete through SR-004 (architecture review ARCH-REV-001 resolved).

## Initial Request And Clarifications

- Original request: let native-runtime compaction reuse the conversation's prompt cache (Anthropic). Today the summarizer sends the whole history as a new message with its own system prompt, so it is billed at full price: about $3.20 per Opus 5.5 compaction at 80 % of a 1M window, versus about $0.16 if the cached prefix were reused.
- Constraints from the Task:
  - only possible when the compaction model equals the agent's model, with a correct fallback otherwise;
  - the user must approve the new compaction design;
  - keep Anthropic's preserved-thinking rules: append-only, no compaction mid tool round.
- Done when: the summarizer call of a compacting native Anthropic run shows a cache read of nearly the whole history; summary quality is unchanged; tests; user verification.
- Origin: the follow-up recommended in `anthropic-prompt-caching` (investigation notes § "Compaction summarizer cost").

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | Code | `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | Compaction lifecycle | Gate → baseline → `WorkingContextMessageWindowPlanner.plan` → `CompactionContentBuilder.build(compactableUnits)` → `strategy.compress(content)` → `validateCompactionSummaryBody` → `prepareCompaction(retainedMessages, summary)` → validator → commit | — |
| 2026-10-09 | Code | `working-context-message-window-planner.ts` | Keep-tail plan | Compactable prefix units + retained recent suffix (budgeted) + protected suffix (a trailing tool-protocol group). Summary replaces only the compactable prefix | Fork summary scope (DEC-002) |
| 2026-10-09 | Code | `compaction-content-builder.ts`, `compaction-conversation-history-renderer.ts` | Summarizer input | Compactable units rendered to plain text between START/END separators, each item cut to `maxItemChars` | Fork sends untruncated native history |
| 2026-10-09 | Code | `direct-llm-compression-strategy.ts`; server `agent-execution/compaction/compaction-llm-factory.ts`; `config/compaction-model-settings.ts` | Summarizer LLM | New LLM per attempt from `createAvailableLlm(settings.modelIdentifier ?? parentModelIdentifier)`. `configureCompactionLlm` sets `systemMessage = COMPACTION_SUMMARY_PROMPT`, its own `maxTokens` (default 8192, capped at the model output limit) and filtered `extraParams` (settings `llmConfig` overrides). `sendMessages([SYSTEM prompt, USER content])`, no cache scope; 3 attempts; `parseCompactionSummary` | Fork needs the parent's exact config |
| 2026-10-09 | Code | `compaction-summary-prompt.ts`, `compaction-summary-parser.ts` | Output contract | One `<compaction_summary>` block, six exact headings, bullets or `(none)` | Reused unchanged |
| 2026-10-09 | Code | `compaction-recovery.ts` `CompactionExecutionSite = 'before_parent_request' \| 'after_final_response'` | When compaction runs | Before the first request of an independent turn (not tool continuations, which are deferred) or after a final response. History then ends with a settled assistant reply, so appending a user message is append-only | Preserved-thinking compatible |
| 2026-10-09 | Code | `agent/llm-request-assembler.ts` (delivered) | Order inside `prepareRequest` | ensure system → protocol safety → compaction → prefix guard → snapshot → append input | Fork needs the guard before it (tools may have changed) |
| 2026-10-09 | Code | `grep ingestion_kind` (server + core); `compaction-execution.ts` | Metering | Compaction `CompactionExecutionMetadata.usage` is captured but no token-usage event is emitted. Ingestion kinds: `autobyteus_llm_phase`, `claude_sdk_result`, `codex_thread_token_usage`, `agy_result`, grok. **Native compaction cost is not in the Token Meter** but is billed by the provider | DEC-003 |
| 2026-10-09 | Runtime | Live probe `probes/fork-summary-probe.mjs` → `probes/fork-summary-probe-result.json` | Feasibility | See below | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Native agent's context reaches the compaction trigger (default 80 % of input budget) | Planner → rendered text of compactable prefix → separate summarizer call (own system prompt, no cache) | Whole compacted history billed at full input price; summary + retained tail + protected suffix replace the context | code; probe A | High |
| BEH-002 | System | Compaction model configured in Settings differs from the agent's model | Same, on the configured model | Uses that model | `compaction-llm-factory.ts` | High |
| BEH-003 | System | Compaction runs | No token-usage event | Compaction cost invisible in the Token Meter | grep | High |
| BEH-004 | Contract | Anthropic preserved thinking | Compaction only at settled points; keep-tail strip of thinking | Valid requests | prior ticket | High |

## Runtime, Probe, Or Reproduction Findings

Probe `probes/fork-summary-probe.mjs`:
- claude-opus-5-5, adaptive thinking, strict preserved-thinking check (`"error"`).
- 3 turns, 7 calls, tool use, text-only replies stored without thinking, exactly like the native runtime.
- Delivered caching shape (1h system breakpoint + top-level automatic 1h).

| Variant | cache read | cache write | uncached input | output | tool calls | summary markers + 6 headings |
| --- | --- | --- | --- | --- | --- | --- |
| A current separate summarizer (system = compaction prompt, user = rendered transcript) | 0 | 0 | 8,279 | 1,258 | 0 | yes |
| F1 fork: same system/tools/thinking/messages + appended user instruction, `tool_choice` unchanged | 9,423 | 1,451 | 4 | 1,288 | 0 | yes |
| F2 fork with `tool_choice: {type:'none'}` (after F1) | 10,874 | 0 | 4 | 1,122 | 0 | yes |

Findings:
1. The fork reads the whole conversation prefix from cache and writes only the last reply plus the instruction. No 400 under the strict check.
2. The model followed the instruction and called no tools, even with tools present and `tool_choice` unchanged.
3. On Opus 5.5, changing `tool_choice` to `none` did not invalidate the message cache: F2 read everything, including F1's write. This contradicts the general docs table and is model-specific, so it is not relied on.
4. Quality: all three summaries keep the goal, the user's decision, the findings, the failing test with its exact message, and the next steps. The fork summaries cover the whole conversation, while A covers only what it was given. They also restate system-prompt rules (avoidable by wording the instruction).
5. Scale: at a ~800k-token context, A ≈ 800k × $4 = $3.20 input, while the fork ≈ 800k × $0.20 + a small write ≈ $0.17 (Opus 5.5). Probe cost: under $0.20.

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Anthropic prompt caching | platform docs (2026-10-09) | Prefix match over tools → system → messages; thinking/effort changes invalidate the messages cache | prior ticket notes | Fork must reuse model, tools, system, thinking and effort exactly |
| Anthropic preserved thinking | `shared/model-migration.md` | Append-only; no compaction mid tool round; kept blocks bound to tools/system | prior ticket | Fork must run after the prefix guard |
| Delivered caching | `origin/personal` @ 46e94fdea | `promptCacheScope: 'conversation'`; prefix guard; provider-native boundary | prior ticket | Reuse, do not duplicate |

## Persisted Data And State Facts

- Affected stored subject: none new. Compaction output (summary + retained messages) keeps the same shape.
- If compaction usage is metered (DEC-003): new usage observations go through the existing token-usage pipeline and ledger; no schema change is expected (to verify in design).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Fork behavior on other providers (OpenAI, Gemini, DeepSeek, local) | Scope DEC-001 | Design + validation | Open |
| RSK-001 | Risk | Model answers the task or calls a tool instead of summarizing | Bad summary | Existing parser rejects it; retry; then fall back to the separate summarizer | Open |
| RSK-002 | Risk | Context at the trigger plus instruction plus output exceeds the window on small-window models | Request fails | Budget check before the fork; fall back | Open |
| RSK-003 | Risk | Tools changed since the last request (Settings) → fork prefix differs (cache miss) and kept thinking is invalid (400) | Failure | Run the prefix guard before the fork | Open |
| ASM-001 | Assumption | The agent's LLM instance is idle at both compaction sites | Reusing it for the fork | Verify in design | Open |

## Architecture Review Follow-Up (SR-004)

- `AutobyteusLLM` (`llm/api/autobyteus-llm.ts`) keys remote RPA sessions by `kwargs.logicalConversationId` and records them in `usedConversationIds`. It releases them only in `cleanup()` (all ids) through `AutobyteusClient.cleanup(conversationId)` (`clients/autobyteus-client.ts:300`). Per `docs/llm_module_design_nodejs.md` §9, a cached session receives only the current user message, so sending a compaction request with the agent's id would post into the agent's live session.
- Today `DirectLlmCompressionStrategy` uses an isolated LLM per attempt with id `compaction_<uuid>`, cleaned up within a 10 s bound (`direct-llm-compression-strategy.ts:76, 85–99`).
- API providers drop `logicalConversationId` (`INTERNAL_PROVIDER_REQUEST_KWARG_KEYS`), so a distinct compaction id does not affect cache reuse.
- Today's strategy passes `retryMode: 'single_attempt'`, which the Anthropic, OpenAI-compatible, OpenAI Responses and Gemini adapters map to one provider call.

## Requirement Implications

- The fork is feasible and gives the intended cost reduction without a quality loss in the probe.
- Compaction metering is missing today. The user cannot verify the cache read in the app, and the meter cannot match the Console, unless compaction usage is reported.

## Notes For Architecture Design

- Reuse the delivered conversation-request path (`promptCacheScope`, the Anthropic adapter, the prefix guard). The fork must use the agent's own model and LLM config.
- Keep the separate summarizer as the fallback (different compaction model; fork failure).
- Decide where the fork strategy lives (agent loop has the LLM instance and tools; the compaction executor owns the lifecycle) without reintroducing provider-specific code into memory/agent.
