## What's New
- Added DeepSeek thinking-mode continuation support for conversations that include tool calls.

## Improvements
- Preserved assistant reasoning internally through tool-call continuations while keeping provider-specific payload handling isolated.
- Kept non-DeepSeek OpenAI-compatible providers on conservative request payloads that do not include DeepSeek-only reasoning fields.

## Fixes
- Fixed DeepSeek continuation failures where follow-up requests after tool use could be rejected because prior assistant `reasoning_content` was not replayed.
