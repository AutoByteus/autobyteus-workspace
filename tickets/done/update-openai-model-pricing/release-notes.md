## What's New
- Added exact Claude Opus 5 catalog support with adaptive-thinking requests, 1M context metadata, 128k output metadata, and standard cache-aware pricing.
- Refreshed GPT-5.6 Sol, Terra, and Luna pricing to the current source-dated standard and long-context values.

## Improvements
- Preserved provider-neutral token pricing/accounting through the existing `LLMFactory` path.
- Updated provider catalog and LLM module-design documentation with current model identities, pricing dates, cache dimensions, and policy boundaries.

## Fixes
- Corrected stale GPT-5.6 Terra/Luna pricing and added missing Anthropic Opus 5 request-policy recognition.
