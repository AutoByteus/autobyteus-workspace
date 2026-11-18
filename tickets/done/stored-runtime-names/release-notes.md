## Changes

- Runs that were compacted by an older version stored the name of their agent runtime in a different spelling from the one used everywhere else. On the first start after updating, AutoByteus converts those entries on your computer once, during startup. New compactions store the current spelling directly. Nothing you see in the app changes.

## Notes

- Only your own agent, team and organization runs are converted. Copies imported by Memory Sync keep the spelling they arrived with until the computer they came from updates and syncs them again.
- Entries in old traces that mention the old spelling inside their text are not rewritten.
- After the update, Memory Sync uploads each converted run's archive list once, and memory search refreshes each converted run once. Both are one-time and need no action.
- Rolling back to the previous version works. Entries the older version writes after a rollback keep the older spelling, even if you update again later, because the conversion runs only once.
- If an entry cannot be read, it is left exactly as it was, and the startup log names the run and the reason; the other entries are still converted.
