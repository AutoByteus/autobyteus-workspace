# Release Notes — GPT-6 Sol/Luna and Claude Opus 5.5

## What's New

- Added exact direct-API model choices for GPT-6 Sol, GPT-6 Luna and Claude Opus 5.5 with current model limits and Standard token-price estimates.
- Claude Opus 5.5 supports adaptive thinking and signed tool-call continuation through the Anthropic Messages path.

## Improvements

- Updated the Anthropic API and Claude Agent SDK integrations to current pinned versions.
- Verified authenticated Codex GPT-6 Astra, Sol and Luna turns in the native Codex runtime.

## Scope

- A real Claude Opus 5.5 tool-use/continuation request passed. The model did not emit signed thinking in that live check, so live signed-thinking replay and direct OpenAI API success remain unvalidated under the approved credential/cost constraints; deterministic contract tests cover their intended behavior.
