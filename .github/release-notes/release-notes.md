## What's New
- Added catalog support for Claude Fable 5 and Claude Sonnet 5, and kept Claude Opus 4.8 available with its exact Anthropic API ID.

## Improvements
- Improved Anthropic model pricing metadata with explicit cache-read and cache-write dimensions for Fable 5, Opus 4.8, and Sonnet 5.
- Clarified that Anthropic model reload uses AutoByteus's static built-in catalog rather than live model discovery.

## Fixes
- Fixed current Claude request shaping so Opus 4.8, Opus 4.7, Sonnet 5, and Fable 5 avoid unsupported manual thinking budgets and sampling overrides.
- Fixed external provider request payloads so internal AutoByteus fields such as `logicalConversationId` are not sent to Anthropic or other external providers while hosted AutoByteus conversations still receive them.
