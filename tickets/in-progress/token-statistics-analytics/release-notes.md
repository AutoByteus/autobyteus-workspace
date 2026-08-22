# Release Notes — Token Statistics Analytics

## What's New

- Token Statistics now opens to an Analytics dashboard for observed usage in the current UTC month.
- Added token and captured estimated-cost trends, prior-period pace comparison, summary cards, and ranked Runtime/Provider/Model breakdowns.
- Added combinable runtime, provider, and model filters plus This month, Last month, Last 3 months, Last 12 months, and Custom UTC ranges.
- Added a local CSV export with exact applied range, identity, token, captured cost, currency, pricing-status, and tracking-coverage evidence.

## Improvements

- New usage is recorded into a compact daily analytics projection atomically with lifetime run accounting.
- Tracking coverage clearly distinguishes pre-feature history, partial coverage, covered periods with no usage, missing prices, local/no-bill usage, and mixed currencies.
- Existing Task/Team/Run investigation remains available under Run details with its lifetime-total semantics preserved.
- Charts include exact accessible tables, desktop/mobile layouts, and honest explanations when monetary values cannot be combined safely.

## Fixes

- Sparse no-usage buckets now remain visible without breaking known-cost reconciliation.
- Concurrent analytics writes preserve exact run/facet consistency for committed operations and surface the governed SQLite timeout instead of accepting unrelated errors.
