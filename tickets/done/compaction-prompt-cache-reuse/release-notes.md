# Release Notes — Compaction Uses the Agent's Own Model and Its Prompt Cache

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Improved
- When an agent on the AutoByteus runtime compacts its memory, it now uses its own model, so a long conversation is summarized by the same model that is working on it.
- With Anthropic (Claude) and DeepSeek models, the summary request reuses the conversation that is already cached. In validation about 96% of it was read from cache. The model summarizes the full conversation, not a shortened copy of part of it.
- Summaries have a fixed nine-section format: task, requests, decisions, unverified points, files changed, completed work, current state, next steps and references. That makes it easier for the agent to continue where it left off.
- Summary requests get enough room to write the whole summary, even when the agent's own output limit is set low.
- Compaction calls appear in the Token Meter.

## Changed
- The separate **compaction model** setting is removed. A value saved earlier is ignored and can be deleted from the server settings.
- Gemini and other models keep the existing transcript-based summary, now on the agent's own model.

## Fixes
- Gemini requests now take their system prompt from the request itself.

## Notes
- No reset or data migration is needed.
- Right after a compaction, the Token Meter's "Latest prompt" shows unknown until the next request.
