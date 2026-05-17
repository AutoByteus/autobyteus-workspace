## What's New
- None.

## Improvements
- OpenAI Responses native tool-call continuation now preserves the provider's captured output chain, including replayable reasoning metadata when OpenAI returns it.
- Added gated live OpenAI agent-flow validation coverage for the `gpt-5.5` native tool continuation path.

## Fixes
- Fixed OpenAI `gpt-5.5` Responses tool-call continuation so a successful tool call can continue without dropping required reasoning items and triggering the missing-`reasoning` `400` error.
- Preserved caller-supplied Responses `include` entries while requesting `reasoning.encrypted_content` for tool/reasoning continuations.
