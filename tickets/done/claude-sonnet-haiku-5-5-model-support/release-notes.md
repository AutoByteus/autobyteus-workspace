# Release Notes — Claude Sonnet 5.5 and Haiku 5.5

## New

- **Claude Sonnet 5.5** (`claude-sonnet-5-5`) and **Claude Haiku 5.5** (`claude-haiku-5-5`) are available in the AutoByteus model picker (1M context, 128K output).
- Thinking is **Off** by default. Turn it **On** per run; the display defaults to **Summarized** on Sonnet 5.5 and **Omitted** on Haiku 5.5, and can be switched.
- Token Meter prices both models at Anthropic Standard rates; Haiku 5.5 uses its prompt-size tiers (≤100K / >100K tokens, cache tokens included).

## Changed

- Anthropic requests are now shaped from one exact per-model table. Existing Claude models send the same requests as before. Sonnet 5.5, like Opus 5.5, rejects a forced tool choice locally.
