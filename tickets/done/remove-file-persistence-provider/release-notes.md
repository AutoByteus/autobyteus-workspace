## What's New
- The server no longer uses a global persistence mode switch. Persistence is now decided by each owning subsystem at runtime.

## Improvements
- Token usage is now stored through the database-backed SQL path only, which simplifies startup and removes the old file-backed token storage branch.
- Server build and runtime tooling now follow one standard path without separate file-profile outputs.

## Fixes
- Codex runtime token-usage persistence remains captured correctly under the simplified persistence model, with live validation covering the GraphQL statistics path.
