## What's New
- Gemini single-speaker speech accepts exact prebuilt/Extended voice IDs while keeping Kore as the default and the existing featured choices. The tested additional ID `ar-001-advisor-1` is documented with its provider label.
- Gemini dialogue supports optional per-turn delivery styles, with null or blank entries inheriting the global style.

## Improvements
- Voice help distinguishes featured choices, a tested additional ID and unverified caller-supplied IDs. Additional-ID generation does not imply complete-library or Arabic-quality validation.
- Existing global-style dialogue, featured two-speaker mappings and audio file output remain supported.

## Fixes
- Gemini speech failures expose safe error categories/status rather than raw provider messages, without silently substituting a voice, model or route.

## Scope notes
- This does not add voice creation, replication, discovery UI or custom-voice lifecycle support. Availability remains dependent on the configured Gemini route and provider access.
