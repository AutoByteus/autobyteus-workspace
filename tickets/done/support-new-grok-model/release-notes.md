## What's New

- Added xAI Grok 4.5 as the sole built-in Grok model, with curated 500,000-token context metadata and cache-aware pricing.

## Improvements

- Grok 4.5 now uses always-on low/medium/high reasoning with high as the default while retaining streaming and function-tool support.
- Grok request handling now removes provider-invalid stop and presence/frequency penalty fields before sending requests.

## Fixes

- Removed obsolete Grok catalog entries and stale active model targets without aliases or redirect fallbacks.
