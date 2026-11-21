## Changes

- The Work Journal reads Antigravity's file reads like every other runtime's: a read of part of a file shows as the plain command it stands for (for example `sed -n '1,40p' <path>`), and a read that failed or has no result shows as a command with its error instead of an internal tool line.
- When Antigravity saved a long output to a file, the journal shows the first lines of the output and a short note that the full output was saved outside the record, without Antigravity's own wording or file link.
- After updating, journals are rendered again once, in the background, and memory search re-indexes the changed ones; nothing needs to be done and no data is lost: the journals are rebuilt from the raw traces, which still hold every record.
