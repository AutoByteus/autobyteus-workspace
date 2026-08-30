# Release Notes — Token Statistics UI Redesign

## What's New

- Redesigned Settings > Token Statistics around six equal, cache-aware summary metrics: Total tokens, Uncached input, Cached input, Output, Estimated API cost, and Cache hit rate.
- Added one focused daily Tokens/Cost line with visible points, explicit axes, concise UTC labels, and exact on-page bucket evidence.
- Added a visible Detailed usage table with Runtime + model, Runtime, Provider, and Model grouping plus expandable accounting details.
- Unified Run details visually with Analytics while preserving creation-time selection and lifetime totals.

## Improvements

- Range and Runtime/Provider/Model controls are compact and coherent; filter drafts apply atomically, while metric/grouping changes stay presentation-only.
- Token, cost, percent, and date formatting follows the active locale, including responsive English and Simplified Chinese layouts.
- Loading, retry, empty, unavailable coverage, pricing quality, cache availability, keyboard focus, and narrow-screen table behavior are clearer and more consistent.
- Partial pricing stays truthful: known estimated cost remains visible, fully unpriced daily buckets remain gaps, and exact missing-price evidence remains available.

## Removed Or Simplified

- Removed prior-period comparison, Input/Output ratio, cumulative pace, and ranked contributor/driver presentation from the current interface.
- Removed CSV export and its browser file-generation path; there is no replacement download, report, or share action.
- Replaced the separate exact-breakdown and pace components with the daily disclosure and Detailed usage evidence.

## Fixes

- Corrected analytics reconciliation so a valid partial result can combine known-priced usage with an explicitly missing/null daily cost bucket without inventing `$0` or failing the query.
- Preserved strict rejection of inconsistent null quality, unsafe integer/range/order input, and mismatched known-cost sums.
