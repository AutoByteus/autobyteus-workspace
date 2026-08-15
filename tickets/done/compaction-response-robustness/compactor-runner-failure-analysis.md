# Compactor Runner Failure Analysis

## Status And Authority

- Type: investigation supplement; evidence/context only.
- Approval applicability: N/A.
- Scope: the two user-visible failed compaction lifecycles on parent turns `turn_0004` and `turn_0005` after the Daily Assistant grew back to the 20% trigger.
- Related proposed behaviors: BEH-008–BEH-010.
- Related proposed requirements/acceptance criteria: REQ-013–REQ-015 and AC-018–AC-023.

## What Happened

1. The parent prompt reached 123,520 tokens. With input budget 615,744 and trigger ratio 0.2, the trigger was 123,148, so requesting a new compaction was correct.
2. Operation `compaction_operation_msswp70b_4` selected 208 units backed by 694 raw traces and retained five units.
3. The initial child `memory_compactor_15ea0a9f3866484aa4e35fcc42b7525c` received a 190,631-character compaction task but produced no assistant trace. Its only subsequent trace was `llm_request_recovery`: the provider or response-ingestion request failed before a usable response.
4. The child runtime converted that LLM failure into an error `CompleteResponse`. `CompactionRunOutputCollector` accepted the assistant-complete text as normal output because the mapped diagnostic error was not classified as a canonical terminal run failure. `AgentCompactionSummarizer` then sent that error prose to `CompactionResponseParser`, which reported `json_object_extraction`.
5. Because the new bounded repair cannot distinguish that runner failure from a genuine invalid model response at this boundary, it launched correction child `memory_compactor_b07b6e3d8f594050886de9cd249f4f12`. That child also failed before a usable response and before token usage.
6. Safe failure preserved the pending operation. When the user entered `continue`, parent `turn_0005` re-executed the same operation ID, same plan, and same 694 raw traces. Children `memory_compactor_9b61f992cf9f417390e839e161af1da2` and `memory_compactor_3c5445fccdaa4291afc55dedd41b69fd` failed in the same way.
7. No compactor attempt produced an assistant memory response or token-usage ledger record. The final error incorrectly attributes all four attempts to JSON extraction and does not preserve the underlying provider/ingestion error detail.

## Root-Cause Classification

- Primary: boundary/ownership issue. The child-run boundary does not return a typed success-versus-runner-failure outcome to the summarizer.
- Secondary: missing invariant. Response-contract repair must run only after a usable public assistant response exists.
- Operational consequence: an error response is treated as model-authored compaction content, the correction model is invoked unnecessarily, and the actionable provider failure is hidden.
- Re-entry consequence: preserving the pending operation causes every subsequent `continue` to block before parent dispatch and rerun the same large compaction immediately.
- Model-prompt involvement: none established. The exact prompt framing was present, but no usable model output existed to validate.

## What Is And Is Not Known

The four immediate failures and absence of token-usage events establish a provider/request/response-ingestion failure. The current event/log projection does not retain the underlying `LlmPhase` error message at the compaction runner boundary, so the exact provider cause (for example quota/rate limit, connection failure, or another API rejection) cannot be proven from retained evidence. The UI's approximately 68.81 million gross input tokens makes a provider quota/rate limit plausible, but it remains an inference and must not be reported as the confirmed cause.

## Why The Parent Input Budget Is 615,744 Tokens

The parent run metadata identifies `deepseek-v4-flash` with no per-run LLM config override. The repository model metadata declares a 1,000,000-token total context window, no separate provider input-only cap, and a 384,000-token maximum output. The runtime's active-context override is blank, and the default safety margin is 256 tokens. `resolveTokenBudget` therefore computes:

```text
context-derived input cap = 1,000,000 - 384,000 = 616,000
effective input capacity  = 616,000 (no smaller provider input cap is known)
input budget              = 616,000 - 256 = 615,744
20% compaction trigger    = floor(0.20 * 615,744) = 123,148
```

The input budget covers the complete parent model request—not only the latest user-authored text—including system instructions, tool definitions, retained conversation, memory projection, tool traffic, attachments after provider tokenization, and the current message. It is large because the selected model advertises a one-million-token total context window. The 384,000-token output reservation makes it substantially smaller than that total window.

The current official DeepSeek Chat Completions API explicitly states that input tokens plus generated tokens are limited by the model context length, so subtracting a reserved output allowance from the total context is the correct capacity relationship for this provider. Reserving the model's full theoretical 384,000-token maximum when the run has no smaller configured `max_tokens` is a conservative product choice, not a universal scientific constant. If a run deliberately capped output at a smaller value, the same relationship could safely reserve that smaller requested output allowance, subject to any provider input-only cap and safety margin.

The Token Meter screenshot uses the full 1,000,000-token context window as its percentage denominator, while compaction uses the 615,744-token input budget. Consequently, 123,520 tokens appears as 12.4% of the total context window but is just over 20% of the effective input budget. This arithmetic is internally consistent, although the two different denominators are not obvious in the UI.

This budget is not a guarantee that an arbitrarily large newly submitted user message will be admitted safely. The current compaction trigger is driven by observed prompt usage and pending-operation execution; `LlmPhase` passes the budget into request planning, but no evidence was found of a general pre-dispatch tokenizer/admission gate that rejects or chunks one newly arriving message before provider dispatch. A single huge message can also consume the capacity needed by system/tool/history content, incur substantial cost/latency, or encounter provider transport, service-tier, and rate constraints even while the combined token equation is satisfied.

## Required Behavioral Direction

1. The runner/collector must return or throw a typed runner failure when the child LLM request fails before a usable response; generated error prose must never be parsed as compaction output.
2. The single response-contract correction attempt must be reserved for a usable assistant response that fails compaction extraction/schema validation.
3. Final diagnostics must preserve the underlying provider/ingestion failure classification and message, plus the child run ID.
4. Any final failure must end that target-agent turn, retain the same pending operation in `awaiting_user_retry`, and schedule no same-turn, background, or provider retry. Proactive and hard-cap pressure use the same fail-closed recovery rule.
5. A newly requested pending operation keeps one automatic initial attempt. After final failure, only a distinct turn-start entry with authoritative USER origin may authorize one new attempt; the pending operation must not be executable merely because it exists.
6. Agent/system turn-start entries received while the operation awaits user retry must remain unclaimed in the existing inbox queue. They start no turn, invoke no compactor, create no repeated compaction error, and are neither dropped nor dispatched. The scheduler must still be able to select the earliest queued USER entry behind them.
7. If the user-authorized retry fails, retained non-user entries remain queued. If it succeeds, the user turn proceeds first and ordinary FIFO dispatch resumes after that turn settles. No separate deferred store or persisted queue is required.
8. Canonical memory must remain unchanged on all runner and response-validation failures.

## Evidence

- Screenshot: `evidence/compactor-provider-failure-and-repeat.png`
- Four-run trace summary: `evidence/compactor-runner-failure-evidence.json`
- Child raw traces: `/Users/normy/.autobyteus/server-data/memory/agents/<compaction-run-id>/raw_traces_active.jsonl`
- Full server log: `/Users/normy/.autobyteus/server-data/logs/server.log`, especially lines 2628631–2629290 at capture time.
- Collector boundary: `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts`
- Child LLM failure conversion: `autobyteus-ts/src/agent/loop/llm-phase.ts`
- Response repair boundary: `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts`
- Parent run metadata: `/Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_2a39c68eb96443ada6f5af9f4f81acef/run_metadata.json`
- Budget owner: `autobyteus-ts/src/agent/token-budget.ts`
- DeepSeek model metadata: `autobyteus-ts/src/llm/supported-model-definitions.ts`
- Official provider contract: `https://api-docs.deepseek.com/api/create-chat-completion/`
- Official model limits: `https://api-docs.deepseek.com/quick_start/pricing/`
