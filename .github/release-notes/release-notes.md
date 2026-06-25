## What's New
- Added a pricing-aware Token Meter in the workspace side panel with live input, output, total, cache, reasoning/thinking, and context usage fields where runtime providers expose them.
- Added cost estimates and model/runtime metadata to token usage views so users can connect usage totals to the provider/model that produced them.
- Expanded provider/model coverage with updated token usage normalization, reasoning-token handling, and refreshed pricing metadata for current supported models.

## Improvements
- Refined the Token tab into compact paired cards with quiet, accessible cost rows and a highlighted total usage card.
- Added a native thinking-token disclosure that explains when reasoning tokens are included in output tokens and estimated output cost.
- Hid unknown context-pressure placeholders so the meter only shows context pressure when a numeric value is available.

## Fixes
- Preserved cache, reasoning, and context token fields as first-class ledger, GraphQL, and live meter data instead of flattening them into generic totals.
- Removed stale MiniMax M2.7 exposure and aligned the provider catalog with the current model/pricing baseline.
