# Codex compaction app-server notifications

Real Codex app-server (0.160.0, gpt-5.6-luna) notifications (`{method, params}`), in received order,
from the probe runs of ticket codex-interrupted-compaction-fix (probes/codex-*-raw.jsonl, investigation
C09–C11). Only server notifications are kept; strings longer than 300 characters (data-dump user text,
raw response content) are truncated, which does not affect compaction semantics.

- `codex-interrupt-auto.notifications.jsonl`: automatic compaction 01a10877-2924-… interrupted in turn 2
  (`turn/completed` status `interrupted`, no `item/completed`); turn 3 compacts normally (01a10877-3c7d-…).
- `codex-interrupt-manual.notifications.jsonl`: manual `thread/compact/start` compaction interrupted
  the same way, followed by a later turn.
- `codex-auto.notifications.jsonl`: six automatic compactions, each a started/completed pair
  (`model_auto_compact_token_limit=20000`, probe only).
