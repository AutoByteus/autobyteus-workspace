# Token Usage

## Scope

Tracks model token usage records and exposes aggregate usage stats.

## TS Source

- `src/token-usage`
- `src/api/graphql/types/token-usage-stats.ts`

## Notes

Persistence provider selection is lazy via proxy to reduce startup coupling.
