## What's New
- Added provider-neutral multimodal capability and static model metadata ownership for built-in LLM definitions.

## Improvements
- Preserved canonical conversation state while sanitizing provider-bound media requests.
- Added bounded LLM request recovery without automatic retry or fallback-model selection.
- Hardened browser screenshot and media handling against empty artifacts and payloads.

## Fixes
- Fixed Gemini media continuation and related zero-byte media failures.
