# Release Notes — Token Meter Unit-Price Transparency

## Summary

This release adds transparent Token Meter calculation details so users can see how estimated API cost is derived from server-accounted token components and provider unit prices.

## Highlights

- Token Meter cost details now expose the calculation basis in a collapsed `Calculation details` row.
- The backend owns and serves per-component unit-price summaries through token usage projections and GraphQL.
- The UI shows component tokens, unit price, component cost, and formula copy instead of relying on frontend provider price tables.
- Mixed, missing, partially missing, not-applicable, and local/no-API-bill price states are labelled explicitly rather than hidden behind a fake blended price.
- Reasoning/thinking token pricing is clarified as part of output tokens/cost, avoiding double-counting.
- GraphQL generated types were refreshed against the integrated schema.
- The `Calculation details` disclosure uses a leading chevron with neutral Activity-like hover/press feedback and keyboard-accessible focus indication.

## Validation

- Focused backend unit/API/E2E token-usage tests passed.
- Focused frontend Token Meter store/component tests passed.
- macOS Electron build passed for local verification.
- User verification completed before finalization.
