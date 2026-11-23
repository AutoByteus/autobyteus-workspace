## Changes

- The Work Journal now shows what Antigravity's tool calls actually did. A file read shows the lines that were read (for a range, as `sed -n '5,9p' <file>` with the lines), a command that failed shows its exit code as `exit N` instead of Antigravity's wrapper text, and file writes and edits show their full content and diff, also when Antigravity made several calls in one response.
- Memory search can therefore find what Antigravity read and wrote, not only that it did.
- After updating, journals are rendered again once, in the background, and memory search re-indexes the changed ones; nothing needs to be done and no data is lost. Runs that already finished keep the short size-only text that was recorded at the time: only new Antigravity work carries the content.
