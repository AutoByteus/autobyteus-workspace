## What's New
- Added built-in pricing support for GPT-6 Astra and Claude Fable 5.1 so future token-usage summaries can show trusted estimated costs for their exact model IDs.

## Improvements
- Added Astra's long-context pricing tier and Claude Fable 5.1's cache-read, five-minute cache-write, and one-hour cache-write prices.
- Documented the supported model limits, pricing sources, Standard-only scope, and verification date.

## Fixes
- Fixed exact Astra and Fable 5.1 observations falling back to `price_missing` while preserving fail-closed behavior for unknown or misspelled model IDs.
