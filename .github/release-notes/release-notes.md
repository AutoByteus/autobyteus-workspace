## What's New

- Replaced the current Gemini Flash model with Gemini 3.8 Flash (`gemini-3.8-flash`) across the built-in catalog and supported Gemini runtime modes.

## Improvements

- Updated Gemini 3.8 requests to use `low`, `medium`, or `high` thinking levels with `medium` as the default while retaining optional thought summaries.
- Added verified 1,048,576-token input/context and 65,536-token output limits.
- Added introductory pricing through 2026-12-31 and the standard pricing schedule effective 2027-01-01, selected by token-usage observation time.

## Compatibility Notes

- Removed Gemini 3.7 Flash from the current selectable catalog without an alias. Saved configurations that still select 3.7 must be explicitly updated to 3.8.
- Historical Gemini 3.7 run and token-usage records remain unchanged.
