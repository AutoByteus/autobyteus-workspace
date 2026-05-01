## What's New
- Added a non-destructive Archive action for stored workspace history runs so inactive agent and team runs can be hidden from the default history list without deleting their saved memory.
- Added backend archive support for both standalone agent runs and team runs, keeping archived data available on disk for future recovery tooling.

## Improvements
- Kept Archive separate from permanent Delete so users can choose between decluttering history and actually removing stored run data.
- The default workspace history list now hides archived inactive runs while still showing active runs if they are restored or resumed.

## Fixes
- Added safeguards so active runs, draft rows, and path-unsafe IDs cannot be archived accidentally.
