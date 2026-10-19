## Fixes

- Agent and Team runs can be continued after a sudden shutdown. When a computer or server lost power, the end of a run's saved conversation could be left unfinished, and continuing a delegated Agent or Team then failed with "its saved conversation is unavailable (indeterminate); it cannot be restored." Now the unfinished end is removed when the run is opened again, everything saved before it is kept exactly, and the run continues. New messages are always saved on a clean line.
- Saved conversations are written more safely: when a whole file is rewritten (for example after memory compaction), it is flushed to disk before it replaces the old one.
- When a run really cannot be continued, the message now says which Agent or Team it is, which part of its saved conversation is damaged (for example "line 3 of raw_traces_active.jsonl is damaged"), that its files were left unchanged, and what you can do: start a new delegation, or restore the file from a backup.

## Notes

- No settings or stored data format change. Existing saved conversations are used as they are; a damaged end is removed only when that run is opened. Rolling back to an earlier build is possible.
