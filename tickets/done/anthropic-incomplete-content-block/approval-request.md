# Approval Request — anthropic-incomplete-content-block (SR-001)

- Package: `anthropic-incomplete-content-block`. Project Task `project_task_3c6c098c-2a8b-4f46-b020-1c2f30eeb5f9`.
- Status: Requirements `Ready for Approval`. Design not started (it is gated on user approval).
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block`, branch `codex/anthropic-incomplete-content-block`. Base `origin/personal` @ `d28c56d5d`; finalization target `origin/personal`.
- Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/requirements-doc.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/solution-revision-record.md`
  - Probe: `…/probes/max-tokens-tool-use-probe.cjs`, `…/probes/max-tokens-400.out.json`

## Root cause (confirmed)

1. **Output limit too low.** `AnthropicLLM` sends `max_tokens = config.maxTokens ?? 8192` (`autobyteus-ts/src/llm/api/anthropic-llm.ts` l.242), but Opus 5.5 supports 128,000 output tokens. No `max_tokens` is configured for the model, and adaptive thinking also counts toward the cap. A long `write_file` design spec runs past 8,192 tokens.
2. **A normal truncation is treated as a protocol error.** In a live probe (Opus 5.5, streaming, adaptive thinking, `max_tokens=400`), the stream ran `message_start → content_block_start #0 tool_use → message_delta stop_reason=max_tokens → message_stop`, with **no `content_block_stop`**. At `message_stop`, `AnthropicAssistantTurnAssembler.complete()` throws "Anthropic content block is incomplete." The adapter never reads `stop_reason`.
3. **Why it repeats on "continue":** the failed request is rolled back cleanly, so the model regenerates the same oversized call and hits the same cap. The user's run shows two rollbacks of about 72 s each (`turn_0005:llm:19`, `turn_0006:llm:1`), consistent with generating about 8k tokens.
4. **This is not a caching regression.** The 8192 default dates from `240d72207`. The throw came with Opus 5.5 signed-turn support (`704e2108e`). The caching commit `80845f45e` only changed an import in the assembler.
5. **History is intact.** The stuck run's working context ends with a valid tool call and its result, and no partial output was stored. The run can continue once requests succeed.

## Proposed intended behavior (summary)

- REQ-001: When `max_tokens` is unset, streaming Claude requests use the model's catalog output limit (128k for Opus 5.5). A configured value is still respected. Anthropic documents no rate-limit cost for a higher `max_tokens`.
- REQ-002/003: When a response is cut off (by `max_tokens`, `refusal`, …) mid tool call, the user gets a clear error naming the limit, the value and the tool. The call is **not executed**, and nothing truncated is stored as a native turn.
- REQ-004: A text-only answer that gets truncated is delivered as a partial answer, instead of failing (this restores the behavior from before `704e2108e`).
- REQ-005/008: The run stays recoverable with unchanged history. The stuck run continues and writes its spec (to be verified by you in the desktop app).
- REQ-006/007: Genuine stream protocol violations still fail. Non-streaming calls keep the bounded 8,192 default, because the SDK requires streaming above about 21k.
- Out of scope: other providers (same risk recorded as a separate-ticket candidate), live progress for large tool inputs (`eager_input_streaming`), automatic retry or splitting.

## Decisions needed from the user

- **DEC-001.** On a truncated tool call:
  - **A (recommended):** show a clear error to the user only. History stays exactly as it was before the request, and the user tells the agent how to proceed (e.g., "write it in parts").
  - **B:** additionally append a system note to the agent's history, so that a bare "continue" makes the agent adapt automatically. This adds a new path that writes to history.
- **DEC-002.** Text-only truncation:
  - **Deliver the partial answer (recommended)**, or
  - fail with the clear message.

Please approve the requirements baseline SR-001 (with or without changes) and choose DEC-001 and DEC-002.

## Coordination note

The fix touches `autobyteus-ts/src/llm/api/anthropic-llm.ts` (default max tokens, stream end) and probably the assembler. The caching team copy (`software_engineering_team_28d0db6ae79c427ab1ce157295fc766c`, compaction cache reuse) may also edit `anthropic-llm.ts`. Please give them a heads-up about the overlap.

## Next expected action

User approval relayed back to the Solution Designer → architecture design → classification → routing by the handoff rules.
