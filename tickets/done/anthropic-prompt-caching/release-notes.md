# Release Notes — Prompt Caching for Anthropic Models on the AutoByteus Runtime

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- Agents and teams on the AutoByteus runtime with Anthropic models (for example Claude Opus 5.5) now use Anthropic prompt caching. Before this release the cache hit was 0%, and every call paid full price for the whole conversation. In a live validation run, 94.9% of input tokens were read from cache.
- The Token Meter prices cache reads and cache writes separately, so its cost estimate matches Anthropic's charge.
- Claude Sonnet 5 uses the current official prices for new usage ($2 input, $10 output per million tokens, with matching cache prices). Earlier records keep the price they were stored with.

## Changed
- Claude's earlier reasoning stays in the conversation across new messages, instead of being removed at every new turn. The model keeps its earlier reasoning, and the cache is not restarted.
- When the tools change during a run (for example after you change the default image model in Settings), or when you reopen a stopped run, the earlier reasoning is removed once. The next request is accepted, and caching continues from there.
- After you stop a response, the note telling the model it was interrupted is added at the end of the conversation. The system prompt is not changed, so the cache stays valid.
- `@anthropic-ai/sdk` was upgraded to 0.132.1.

## Notes
- No reset or data migration is needed. Saved runs reopen normally. The first message after reopening a run rewrites the cache once.
- Compaction summary calls are not cached, because their content is never reused.
- Known issues, which also exist in earlier versions and will be fixed separately:
  - Stopping a run while a tool approval is pending may not finish.
  - After a run is stopped and reopened, the Token Meter may leave out that run's later usage.
