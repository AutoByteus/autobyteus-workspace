## Release notes: empty agent runs no longer pile up in history

(For the next beta or stable release that includes this change. User-facing; keep it with the release's other notes.)

### Empty agent runs no longer pile up in history

- If an agent run fails to start, for example because its runtime is not installed or its model is unavailable, nothing is left behind. Before, each failure added an empty, offline run to the history.
- A run that was being created while AutoByteus quit, restarted or updated no longer leaves an empty entry either. Such a create either finishes or leaves nothing.
- **At each start, AutoByteus removes empty runs that never started:** runs that were prepared but never received a message, and whose folder holds nothing besides the run's own record (no conversation, no journal, no attached files). The first start after this update removes the ones already in your history. Each removal is written to the server log as "Removed empty never-started run '…' ('<title>')".
- Runs with any content are always kept. This includes older runs that hold a conversation but have no start date, runs with attached context files, and runs whose records cannot be read.
- A rare case remains: if AutoByteus is force-killed (not quit normally) in the split second while a run is starting, one empty entry can still appear.

### Rolling back

- Rolling back to an earlier version is possible. The removed runs held no content and earlier versions do not need them. They are not restored.
