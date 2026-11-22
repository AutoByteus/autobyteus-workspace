# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, design-spec.md D-2 | The node computes its own `contextText` for stored-run activities with the same weak rule (`path`, else `command`, else the tool name) and uses it in projection dedupe; after this ticket no web client reads it | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:101`, `providers/codex-run-view-projection-provider.ts:190`, `run-projection-dedupe.ts:238` | The phone fix is in the web; changing the node's projection and its dedupe key is a server contract change | No | Decide whether the node's projection still needs `contextText` (dedupe keys); remove it with its rule if not, else rename it to what it is (a dedupe key) | |
