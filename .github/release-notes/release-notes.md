# Release Notes — New models and Claude SDK Token Meter

## What's new and improved

- Added exact direct-API GPT-6 Sol, GPT-6 Luna and Claude Opus 5.5 model choices, limits and Standard token-price estimates; Claude Opus 5.5 supports adaptive thinking and signed active tool-turn continuation.
- Claude Agent SDK Token Meter shows selected canonical/raw identity and selected-only cumulative usage. Cost is an AutoByteus-configured Anthropic Standard API-equivalent estimate, **not** SDK dollars or a subscription charge. An unattributable cache-write duration uses the configured 1-hour rate with a visible assumption notice.
- Fixed the Claude SDK latest-prompt context meter: when the selected result supplies a valid prompt and positive context window, it shows count/capacity and percent/progress instead of “context limit unavailable.” Older records with those values but null percentage display the derived value without SQL backfill. Invalid or absent capacity remains unavailable.

## Upgrade note

- **Cumulative database migration required:** included Prisma migration adds nullable `claude_sdk_usage_state_json` before new token-usage writes. Existing records remain readable without backfill or historical repricing. The context-percent correction itself adds no further migration.
- Anthropic API and Claude Agent SDK integrations use updated pinned versions. Existing direct Messages and Codex accounting paths are preserved.

## Validation boundary

- Focused server/SQL/GraphQL/stream/web tests, a small real Claude Agent SDK selected Opus query and generic browser Token Statistics journeys passed. The selected meter has not been verified as one combined live SDK→browser journey or explicitly accepted by the user in a rebuilt current Electron app. Whole-web typecheck and I-44 command guard are not claimed. No new direct paid API call was made in the AC-015 validation; direct OpenAI live remains untested.
- Earlier real signed Opus active tool-turn replay passed; independent-turn reset/compaction was not live-tested. A generated game file received structural checks only, not gameplay/visual-quality verification.
