## Improvements
- Improved messaging gateway runtime consistency by keeping callback deduplication on the durable delivery path.
- Improved outbound delivery behavior alignment across supported providers by removing unused legacy routing paths.

## Fixes
- Fixed stale gateway runtime configuration handling so only active messaging settings are loaded.
